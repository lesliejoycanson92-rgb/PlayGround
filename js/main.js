import {
  DEFAULT_CONFIG, DEFAULT_UPGRADES, STARTER_GADGETS, GADGETS, GADGET_MAP,
  MATERIALS, PATTERNS, TEXTURES, EYES, MOUTHS, VOICES, MOODS, CORES,
  FORGE_UPGRADES, COLOR_SWATCHES, PACKS,
} from './data.js';
import { computeBuild, buildLayouts, randomBuild, clamp } from './build.js';
import { drawBlob, drawPortrait, alpha, mix } from './blob.js';
import { audio } from './audio.js';
import { ArenaGame } from './game.js';

const SAVE_KEY = 'blobsmith_save_v1';

const NAMES = ['PIP', 'BONK', 'MISO', 'GLOOP', 'TANGO', 'SPROCKET', 'NOODLE', 'MOCHI', 'BRISKET', 'ZIGGY', 'PLOP', 'WUMBO', 'CINDER', 'PUDDING', 'ORBIT', 'CRUMB', 'FIZZ', 'GNASH', 'TATER', 'VELVET'];

const GLYPHS = {
  spike: '✦', drill: '▽', arm: '⊂', leg: '⋔', wing: '⌁', tentacle: '〰', spring: '⫘',
  tread: '▤', hammer: '⊤', saw: '✸', tail: '⌒', cannon: '◉', eye: '◉', fang: '⋀',
  rocket: '⇞', hook: '⌐', bubble: '◯', magnet: '⊃', hat: '△', orb: '●', blade: '⌓',
  claw: '⋘', antenna: '⌇',
};

const MODE_META = {
  sumo: {
    num: '01', title: 'SUMO RING', eyebrow: 'PHYSICS BRAWL',
    desc: 'One round. One shrinking circle. Shove the rival clean off the rim — or be the ball that falls.',
    diff: 1, color: '#ffb545', tag: '90⚙ · 1◆', sub: 'MASS · GRIP · NERVE',
    objective: 'SHOVE THE RIVAL OUT',
  },
  race: {
    num: '02', title: 'OBSTACLE RACE', eyebrow: 'TWO-LAP SPRINT',
    desc: 'A tight oval track, pillared corners, and a rival who does not believe in brakes. Grip is king.',
    diff: 2, color: '#a7f36b', tag: '110⚙ · 1◆', sub: 'SPEED · CONTROL · GRIP',
    objective: 'FINISH TWO LAPS FIRST',
  },
  boss: {
    num: '03', title: 'BOSS BATTLE', eyebrow: 'WARDEN OF THE FOUNDRY',
    desc: 'A three-tonne prototype is loose. Dash into its housing, dodge the shockwaves, break the core.',
    diff: 3, color: '#ff5d5d', tag: '180⚙ · 3◆', sub: 'DAMAGE · DASH · GUTS',
    objective: 'BREAK THE WARDEN',
  },
  showcase: {
    num: '04', title: 'SHOWCASE', eyebrow: 'LIVE STYLE LOBBY',
    desc: 'Four smiths, one stage, and a crowd with strong opinions. Let the lobby judge your build.',
    diff: 1, color: '#ff9ed2', tag: '70⚙ · STYLE', sub: 'CREATIVITY · MENACE · CHARM',
    objective: 'WIN THE CROWD',
  },
};

/* ── state ─────────────────────────────────────────────────── */
function defaultSave() {
  return {
    version: 1,
    config: structuredClone(DEFAULT_CONFIG),
    upgrades: { ...DEFAULT_UPGRADES },
    scrap: 140,
    cores: 2,
    unlocked: [...STARTER_GADGETS],
    seenIntro: false,
    sound: true,
    stats: {
      plays: 0, wins: 0,
      best: { sumo: 0, race: 0, boss: 0, showcase: 0 },
      lastMode: 'sumo',
    },
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const base = defaultSave();
    const merged = {
      ...base, ...parsed,
      config: { ...base.config, ...(parsed.config || {}), gadgets: (parsed.config?.gadgets || base.config.gadgets).filter((id) => GADGET_MAP[id]) },
      upgrades: { ...base.upgrades, ...(parsed.upgrades || {}) },
      stats: { ...base.stats, ...(parsed.stats || {}), best: { ...base.stats.best, ...(parsed.stats?.best || {}) } },
      unlocked: Array.from(new Set([...(parsed.unlocked || []), ...STARTER_GADGETS])),
    };
    if (!merged.config.name) merged.config.name = 'PIP';
    return merged;
  } catch {
    return defaultSave();
  }
}

let save = loadSave();
let build = computeBuild(save.config, save.upgrades);
let layouts = buildLayouts(save.config);
let activeTab = 'body';
let packFilter = 'all';
let previewState = { poke: 0, expression: null, drag: null, pointer: null, spinVel: 0 };
let previewCanvas;
let previewCtx;
let previewSize = { w: 0, h: 0 };
let game = null;
let saveTimer = null;
let lastTime = performance.now();
let timeAcc = 0;

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function persist(immediate = false) {
  clearTimeout(saveTimer);
  const doSave = () => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
  };
  if (immediate) doSave();
  else saveTimer = setTimeout(doSave, 240);
}

function toast(message, kind = '') {
  const wrap = $('toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  wrap.appendChild(el);
  while (wrap.children.length > 3) wrap.firstChild.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function refreshBuild() {
  build = computeBuild(save.config, save.upgrades);
  layouts = buildLayouts(save.config);
  updateAll();
  persist();
}

/* ── shared refresh ────────────────────────────────────────── */
function updateAll() {
  $('scrapVal').textContent = save.scrap;
  $('coresVal').textContent = save.cores;
  $('blobName').value = save.config.name;
  $('stageName').textContent = save.config.name;
  $('pilotName').textContent = save.config.name;

  const mat = MATERIALS[save.config.material];
  const core = CORES[save.config.core];
  const mood = MOODS[save.config.mood];
  $('stageSub').textContent = `${mat.name.toUpperCase()} · ${core.name.toUpperCase()} CORE`;
  $('moodChip').textContent = `${mood.icon} ${mood.name.toUpperCase()}`;
  $('moodChip').style.color = mood.color;
  $('moodChip').style.borderColor = alpha(mood.color, 0.3);
  $('moodChip').style.background = alpha(mood.color, 0.08);
  $('stageBadge').textContent = `${save.config.gadgets.length} PART${save.config.gadgets.length === 1 ? '' : 'S'}`;
  $('partSummary').textContent = `${save.config.gadgets.length} PART${save.config.gadgets.length === 1 ? '' : 'S'} EQUIPPED`;
  $('buildCost').textContent = `${build.massCost} MASS`;
  $('arenaBudget').textContent = `${build.massCost} / ${build.budget.maxMass}`;

  // budget bars
  const massPct = Math.min(100, (build.massCost / build.budget.maxMass) * 100);
  const energyPct = Math.min(100, (build.energyCost / build.budget.maxEnergy) * 100);
  $('massNow').textContent = build.massCost;
  $('massMax').textContent = `/ ${build.budget.maxMass}`;
  $('energyNow').textContent = build.energyCost;
  $('energyMax').textContent = `/ ${build.budget.maxEnergy}`;
  $('massBar').style.width = `${massPct}%`;
  $('energyBar').style.width = `${energyPct}%`;
  $('massBudget').classList.toggle('over', build.phys.overMass);
  $('energyBudget').classList.toggle('over', build.phys.overEnergy);

  // tags
  const tagWrap = $('buildTags');
  if (build.tags.length) {
    tagWrap.innerHTML = build.tags.map((tag) => `<span class="build-tag" style="color:${tag.color}">${tag.label}</span>`).join('');
  } else {
    tagWrap.innerHTML = '<span class="build-tag empty">UNCLASSIFIED</span>';
  }

  // stats
  const statRows = [
    ['SPEED', build.scales.speed, Math.round(build.phys.maxSpeed)],
    ['POWER', build.scales.power, Math.round(build.phys.damage)],
    ['ARMOR', build.scales.armor, build.phys.defense.toFixed(1)],
    ['GRIP', build.scales.grip, Math.round(build.phys.grip)],
    ['BOUNCE', build.scales.bounce, Math.round(build.phys.bounce * 100)],
    ['CONTROL', build.scales.control, Math.round(build.phys.control * 100)],
    ['LUCK', build.scales.luck, `×${build.phys.luck.toFixed(1)}`],
  ];
  $('statList').innerHTML = statRows.map(([label, scale, value]) => `
    <div class="stat-row">
      <span class="label">${label}</span>
      <span class="bar"><i style="width:${Math.round(clamp(scale, 0.02, 1) * 100)}%"></i></span>
      <span class="val">${value}</span>
    </div>`).join('');

  // load hint
  const hint = $('loadHint');
  if (build.overBudget) {
    hint.classList.add('warn');
    hint.querySelector('.load-icon').textContent = '!';
    const over = [];
    if (build.phys.overMass) over.push(`${build.massCost - build.budget.maxMass} mass`);
    if (build.phys.overEnergy) over.push(`${build.energyCost - build.budget.maxEnergy} energy`);
    hint.querySelector('p').innerHTML = `<b>Over budget by ${over.join(' and ')}.</b> Shed a part, shrink the chassis, or buy a bigger bay in FORGE.`;
  } else {
    hint.classList.remove('warn');
    hint.querySelector('.load-icon').textContent = '◈';
    const remaining = build.budget.maxMass - build.massCost;
    hint.querySelector('p').innerHTML = `Every gram is a trade. <b>${remaining} mass</b> spare — heavy spikes hit harder, but you turn like a fridge.`;
  }

  $('enterArena').classList.toggle('over', build.overBudget);
  $('stageTip').textContent = build.overBudget ? 'OVER BUDGET · ADJUST IN BODY / PARTS' : 'DRAG TO SPIN · CLICK TO POKE';

  if (activeTab === 'parts') updatePartsLive();
  if (activeTab === 'forge') updateForgeWallet();
}

/* ── workshop tab rendering ────────────────────────────────── */
function inputRow({ label, value, min, max, step, format, onInput, hintLeft, hintRight }) {
  const pct = ((value - min) / (max - min)) * 100;
  return `
    <div class="slider-row">
      <div class="slider-top"><label>${label}</label><output>${format(value)}</output></div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" style="--fill:${pct}%"
        data-slider-label="${label}" />
      ${hintLeft || hintRight ? `<div class="slider-hint"><span>${hintLeft || ''}</span><span>${hintRight || ''}</span></div>` : ''}
    </div>`;
}

function bindSliders(root, handlers) {
  $$('input[type=range]', root).forEach((input) => {
    const key = input.dataset.sliderLabel;
    const handler = handlers[key];
    if (!handler) return;
    const paint = () => {
      const min = +input.min;
      const max = +input.max;
      input.style.setProperty('--fill', `${((+input.value - min) / (max - min)) * 100}%`);
    };
    paint();
    input.addEventListener('input', () => {
      paint();
      handler(+input.value);
    });
  });
}

function renderTab() {
  const root = $('tabContent');
  root.innerHTML = '';
  if (activeTab === 'body') renderBodyTab(root);
  else if (activeTab === 'look') renderLookTab(root);
  else if (activeTab === 'soul') renderSoulTab(root);
  else if (activeTab === 'parts') renderPartsTab(root);
  else if (activeTab === 'forge') renderForgeTab(root);
  root.scrollTop = 0;
}

function renderBodyTab(root) {
  const c = save.config;
  root.innerHTML = `
    <div class="section">
      <div class="section-head"><h3>CHASSIS</h3><span>${build.massCost} MASS</span></div>
      <div class="section-desc">The frame sets your centre of gravity. Bigger balls hit harder and fit more; small balls are quick and cheap.</div>
      ${inputRow({ label: 'Size', value: c.size, min: 0.72, max: 1.42, step: 0.01, format: (v) => `${v.toFixed(2)}×`, hintLeft: 'COMPACT', hintRight: 'COLOSSAL' })}
      ${inputRow({ label: 'Weight', value: c.weight, min: 0.6, max: 1.5, step: 0.01, format: (v) => `${v.toFixed(2)}×`, hintLeft: 'DOWNHILL', hintRight: 'ANVIL' })}
    </div>
    <div class="section">
      <div class="section-head"><h3>MATERIAL</h3><span>${MATERIALS[c.material].name.toUpperCase()}</span></div>
      <div class="option-grid two">
        ${Object.entries(MATERIALS).map(([id, m]) => `
          <button class="option-card mat-card ${c.material === id ? 'active' : ''}" data-material="${id}">
            <span class="swatch" style="background:radial-gradient(circle at 35% 30%, ${m.color}, #1a2027)"></span>
            <span class="oc-name">${m.name}</span>
            <span class="desc">${m.desc}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="section">
      <div class="section-head"><h3>SKIN DYNAMICS</h3><span>FEEL</span></div>
      ${inputRow({ label: 'Squash / Stretch', value: c.squash, min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, hintLeft: 'RIGID', hintRight: 'WOBBLE' })}
      ${inputRow({ label: 'Bounciness', value: c.bounce, min: 0, max: 10, step: 1, format: (v) => `${v}/10`, hintLeft: 'THUD', hintRight: 'BOING' })}
      ${inputRow({ label: 'Grip', value: c.grip, min: 0, max: 10, step: 1, format: (v) => `${v}/10`, hintLeft: 'SLICK', hintRight: 'GLUED' })}
    </div>
    <div class="section">
      <div class="section-head"><h3>POWER CORE</h3><span>${CORES[c.core].energy} ENERGY</span></div>
      <div class="section-desc">One core. One active ability (SHIFT). It also tints your aura and changes the physics.</div>
      <div class="option-grid two">
        ${Object.entries(CORES).map(([id, core]) => `
          <button class="option-card ${c.core === id ? 'active' : ''}" data-core="${id}">
            <span class="oc-icon" style="color:${core.color}">${core.icon}</span>
            <span class="oc-name">${core.name}</span>
            <span class="oc-sub">${core.abilityName.toUpperCase()}</span>
          </button>`).join('')}
      </div>
      <p class="section-desc" style="margin-top:9px;margin-bottom:0">${CORES[c.core].abilityDesc}</p>
    </div>`;

  bindSliders(root, {
    Size: (v) => { save.config.size = v; refreshBuild(); root.querySelector('output') && null; updateSliderOutputs(root); },
    Weight: (v) => { save.config.weight = v; refreshBuild(); updateSliderOutputs(root); },
    'Squash / Stretch': (v) => { save.config.squash = v; refreshBuild(); },
    Bounciness: (v) => { save.config.bounce = v; refreshBuild(); },
    Grip: (v) => { save.config.grip = v; refreshBuild(); },
  });
  updateSliderOutputs(root);
  $$('[data-material]', root).forEach((btn) => btn.addEventListener('click', () => {
    save.config.material = btn.dataset.material;
    audio.click();
    refreshBuild();
    renderTab();
  }));
  $$('[data-core]', root).forEach((btn) => btn.addEventListener('click', () => {
    save.config.core = btn.dataset.core;
    audio.click();
    audio.tone({ freq: 160, dur: 0.25, type: 'sine', gain: 0.08, slide: 90 });
    refreshBuild();
    renderTab();
  }));
}

function updateSliderOutputs(root) {
  const rows = $$('.slider-row', root);
  rows.forEach((row) => {
    const input = row.querySelector('input');
    const out = row.querySelector('output');
    if (!input || !out) return;
    const key = input.dataset.sliderLabel;
    let val = +input.value;
    if (key === 'Size' || key === 'Weight') out.textContent = `${val.toFixed(2)}×`;
    else if (key === 'Squash / Stretch') out.textContent = `${Math.round(val * 100)}%`;
    else if (key === 'Bounciness' || key === 'Grip') out.textContent = `${val}/10`;
  });
  const massSpan = root.querySelector('.section-head span');
  if (massSpan) massSpan.textContent = `${build.massCost} MASS`;
}

function swatchRow(current, key, options) {
  return `<div class="swatch-grid">${options.map((color) => `
    <button class="swatch-btn ${current.toLowerCase() === color.toLowerCase() ? 'active' : ''}"
      style="background:${color}" data-${key}="${color}" aria-label="${color}"></button>`).join('')}
    <label class="swatch-btn custom" style="background:conic-gradient(#ff5d5d,#f7d154,#a7f36b,#67e8f9,#c084fc,#ff5d5d)" title="Custom colour">
      <span>+</span><input type="color" value="${current}" data-${key}-custom />
    </label>
  </div>`;
}

function renderLookTab(root) {
  const c = save.config;
  root.innerHTML = `
    <div class="section">
      <div class="section-head"><h3>BODY COLOUR</h3><span>${c.color.toUpperCase()}</span></div>
      ${swatchRow(c.color, 'color', COLOR_SWATCHES)}
    </div>
    <div class="section">
      <div class="section-head"><h3>PAINT / ACCENT</h3><span>${c.accent.toUpperCase()}</span></div>
      ${swatchRow(c.accent, 'accent', COLOR_SWATCHES)}
      <div class="section-desc" style="margin-top:9px;margin-bottom:0">Patterns, trims, and the paint tool all use this colour.</div>
    </div>
    <div class="section">
      <div class="section-head"><h3>PATTERN</h3><span>${PATTERNS.find((p) => p.id === c.pattern)?.name.toUpperCase()}</span></div>
      <div class="pattern-grid">
        ${PATTERNS.map((p) => `
          <button class="pattern-btn ${c.pattern === p.id ? 'active' : ''}" data-pattern="${p.id}" data-p="${p.id}"
            style="--p-color:${c.color};--p-accent:${c.accent}">
            <span class="p-preview"></span><span class="p-label">${p.name.toUpperCase()}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="section">
      <div class="section-head"><h3>GLOW</h3><span>${Math.round(c.glow * 100)}%</span></div>
      ${inputRow({ label: 'Luminosity', value: c.glow, min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, hintLeft: 'MATTE', hintRight: 'RADIOACTIVE' })}
    </div>
    <div class="section">
      <div class="section-head"><h3>TEXTURE</h3><span>${TEXTURES.find((t) => t.id === c.texture)?.name.toUpperCase()}</span></div>
      <div class="option-grid two">
        ${TEXTURES.map((t) => `
          <button class="option-card ${c.texture === t.id ? 'active' : ''}" data-texture="${t.id}">
            <span class="oc-name">${t.name}</span>
            <span class="oc-sub">${t.desc.toUpperCase()}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="section">
      <div class="section-head"><h3>EYES</h3><span>SOUL WINDOWS</span></div>
      <div class="option-grid two">
        ${EYES.map((e) => `
          <button class="option-card ${c.eyes === e.id ? 'active' : ''}" data-eyes="${e.id}">
            <span class="oc-name">${e.name}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="section">
      <div class="section-head"><h3>MOUTH</h3><span>EXPRESSION</span></div>
      <div class="option-grid two">
        ${MOUTHS.map((m) => `
          <button class="option-card ${c.mouth === m.id ? 'active' : ''}" data-mouth="${m.id}">
            <span class="oc-name">${m.name}</span>
          </button>`).join('')}
      </div>
    </div>`;

  bindSliders(root, { Luminosity: (v) => { save.config.glow = v; refreshBuild(); } });

  const bindColor = (selector, key) => {
    $$(selector, root).forEach((btn) => btn.addEventListener('click', () => {
      save.config[key] = btn.dataset[key];
      audio.click();
      refreshBuild();
      renderTab();
    }));
  };
  bindColor('[data-color]', 'color');
  bindColor('[data-accent]', 'accent');
  $$('[data-color-custom]', root).forEach((input) => input.addEventListener('input', () => {
    save.config.color = input.value;
    refreshBuild();
  }));
  $$('[data-accent-custom]', root).forEach((input) => input.addEventListener('input', () => {
    save.config.accent = input.value;
    refreshBuild();
  }));
  $$('[data-pattern]', root).forEach((btn) => btn.addEventListener('click', () => {
    save.config.pattern = btn.dataset.pattern;
    audio.click();
    refreshBuild();
    renderTab();
  }));
  $$('[data-texture]', root).forEach((btn) => btn.addEventListener('click', () => {
    save.config.texture = btn.dataset.texture;
    audio.click();
    refreshBuild();
    renderTab();
  }));
  $$('[data-eyes]', root).forEach((btn) => btn.addEventListener('click', () => {
    save.config.eyes = btn.dataset.eyes;
    audio.click();
    refreshBuild();
    renderTab();
  }));
  $$('[data-mouth]', root).forEach((btn) => btn.addEventListener('click', () => {
    save.config.mouth = btn.dataset.mouth;
    audio.click();
    refreshBuild();
    renderTab();
  }));
}

function renderSoulTab(root) {
  const c = save.config;
  root.innerHTML = `
    <div class="section">
      <div class="section-head"><h3>MOOD DIAL</h3><span>${MOODS[c.mood].name.toUpperCase()}</span></div>
      <p class="section-desc">Mood is a real physics modifier. Your face sells it; your stats pay for it.</p>
      <div class="mood-grid">
        ${Object.entries(MOODS).map(([id, mood]) => `
          <button class="mood-btn ${c.mood === id ? 'active' : ''}" data-mood="${id}" style="--mo-color:${mood.color}">
            <span class="mo-icon">${mood.icon}</span><span class="mo-name">${mood.name.toUpperCase()}</span>
          </button>`).join('')}
      </div>
      <div class="load-hint" style="margin-top:12px">
        <span class="load-icon" style="color:${MOODS[c.mood].color}">${MOODS[c.mood].icon}</span>
        <p><b style="color:${MOODS[c.mood].color}">${MOODS[c.mood].name}</b> — ${MOODS[c.mood].desc}. Mood also drives your voice, eyes, and battle taunts.</p>
      </div>
    </div>
    <div class="section">
      <div class="section-head"><h3>VOICE</h3><span>TAP TO HEAR</span></div>
      <div class="voice-list">
        ${VOICES.map((v) => `
          <button class="voice-row ${c.voice === v.id ? 'active' : ''}" data-voice="${v.id}">
            <span class="vr-icon">▶</span>
            <span class="vr-name">${v.name}</span>
            <span class="vr-desc">${v.id === 'squeak' ? 'HIGH / CHAOTIC' : v.id === 'baritone' ? 'LOW / SOLID' : v.id === 'glitch' ? 'BROKEN / FUN' : 'SOFT / HAUNTED'}</span>
            <span class="eq" aria-hidden="true"><i style="animation-delay:${Math.random() * 0.5}s"></i><i style="animation-delay:${Math.random() * 0.5}s"></i><i style="animation-delay:${Math.random() * 0.5}s"></i></span>
          </button>`).join('')}
      </div>
    </div>
    <div class="section">
      <div class="section-head"><h3>IDENTITY</h3><span>THE SMALL PRINT</span></div>
      <div class="load-hint" style="margin-top:0">
        <span class="load-icon">✎</span>
        <p>Rename your ball in the subject file, top left. Callsigns are stamped on the scoreboard and heavily discussed in the lobby.</p>
      </div>
    </div>`;

  $$('[data-mood]', root).forEach((btn) => btn.addEventListener('click', () => {
    save.config.mood = btn.dataset.mood;
    audio.voice(save.config.mood, save.config.voice);
    previewState.expression = 'happy';
    previewState.poke = 1;
    refreshBuild();
    renderTab();
  }));
  $$('[data-voice]', root).forEach((btn) => btn.addEventListener('click', () => {
    save.config.voice = btn.dataset.voice;
    audio.voice(save.config.mood, save.config.voice);
    previewState.expression = 'happy';
    previewState.poke = 1;
    refreshBuild();
    renderTab();
  }));
}

function gadgetCard(gadget, equipped) {
  const locked = !save.unlocked.includes(gadget.id);
  const unlockCost = gadget.rarity;
  const canUnlock = save.cores >= unlockCost;
  const glyph = GLYPHS[gadget.visual] || '●';
  const pack = PACKS[gadget.pack];
  return `
    <button class="gadget-card ${equipped ? 'equipped' : ''} ${locked ? 'locked' : ''}"
      style="--gb-color:${gadget.color}" data-gadget="${gadget.id}" ${locked ? 'aria-disabled="true"' : ''}>
      <span class="gc-head">
        <span class="gc-icon" style="--gb-color:${gadget.color}">${glyph}</span>
        <span style="min-width:0">
          <span class="gc-name">${gadget.name}</span>
          <span class="gc-pack">${pack.name.toUpperCase()} · T${gadget.rarity}</span>
        </span>
      </span>
      <span class="gc-cost"><b>${gadget.mass} M</b><b class="en">${gadget.energy} E</b></span>
      <span class="gc-blurb">${gadget.blurb}</span>
      ${equipped ? '<span class="gc-check">✓</span>' : ''}
      ${locked ? `<span class="gc-lock">◆ ${unlockCost}</span>` : ''}
      ${locked ? `<span class="gc-unlock" data-unlock="${gadget.id}" ${canUnlock ? '' : 'disabled'}>UNLOCK · ${unlockCost} CORE${unlockCost > 1 ? 'S' : ''}</span>` : ''}
    </button>`;
}

function renderPartsTab(root) {
  const c = save.config;
  const remaining = build.budget.maxMass - build.massCost;
  const energyLeft = build.budget.maxEnergy - build.energyCost;
  const list = packFilter === 'all' ? GADGETS : GADGETS.filter((g) => g.pack === packFilter);
  const equipped = new Set(c.gadgets);

  root.innerHTML = `
    <div class="section">
      <div class="section-head">
        <h3>GADGET CRATE</h3>
        <span style="color:${build.overBudget ? 'var(--red)' : 'var(--muted-2)'}">
          ${remaining} M · ${energyLeft} E LEFT
        </span>
      </div>
      <div class="pack-filter" id="packFilter">
        <button data-pack="all" class="${packFilter === 'all' ? 'active' : ''}">ALL 100</button>
        ${Object.entries(PACKS).map(([id, p]) => `<button data-pack="${id}" class="${packFilter === id ? 'active' : ''}">${p.name.toUpperCase()}</button>`).join('')}
      </div>
      <div class="gadget-grid" id="gadgetGrid">
        ${list.map((g) => gadgetCard(g, equipped.has(g.id))).join('')}
      </div>
      <p class="locked-note">SEALED PARTS OPEN WITH ◆ CORES OR ARENA DROPS.</p>
    </div>

    <div class="section">
      <div class="section-head"><h3>LOADOUT · ${c.gadgets.length}</h3><span>${build.massCost} MASS</span></div>
      <div class="loadout-list" id="loadoutList">
        ${c.gadgets.length ? c.gadgets.map((id) => {
          const g = GADGET_MAP[id];
          if (!g) return '';
          return `<div class="loadout-row" data-remove-row="${id}" style="--lr-color:${g.color}">
            <span class="lo-dot"></span><span class="lo-name">${g.name}</span>
            <span class="lo-cost">${g.mass}M / ${g.energy}E</span>
            <button class="lo-remove" data-remove="${id}" aria-label="Remove ${g.name}">✕</button>
          </div>`;
        }).join('') : '<p class="muted small" style="padding:4px 2px">Nothing attached. A smooth ball is a valid build. A boring one, but valid.</p>'}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h3>BUILDING TOOLS</h3><span>ATTACH / MIRROR / ROTATE</span></div>
      <button class="toggle-row ${c.mirror ? 'active' : ''}" id="mirrorToggle">
        <span><span class="tr-label">Mirror parts</span><span class="tr-sub">SYMMETRY · +30% MASS/ENERGY · +15% PART STATS</span></span>
        <span class="toggle-switch"><i></i></span>
      </button>
      ${inputRow({ label: 'Rotate parts', value: c.rotation, min: -45, max: 45, step: 1, format: (v) => `${v}°`, hintLeft: 'BACK-SWEPT', hintRight: 'FRONT-SWEPT' })}
      ${inputRow({ label: 'Resize parts', value: c.resize, min: 0.7, max: 1.4, step: 0.01, format: (v) => `${v.toFixed(2)}×`, hintLeft: 'TINY', hintRight: 'CHUNKY' })}
      <div class="section-head" style="margin-top:14px"><h3>PAINT PARTS</h3><span>TRIM</span></div>
      <div class="swatch-grid" id="partPaint">
        ${COLOR_SWATCHES.map((color) => `<button class="swatch-btn ${c.paint.toLowerCase() === color ? 'active' : ''}" style="background:${color}" data-paint="${color}" aria-label="Paint ${color}"></button>`).join('')}
      </div>
      <p class="section-desc" style="margin-top:8px;margin-bottom:0">Paint sets the trim accent for attached parts. Resize boosts both their stats and their cost.</p>
    </div>`;

  // pack filters
  $$('#packFilter button', root).forEach((btn) => btn.addEventListener('click', () => {
    packFilter = btn.dataset.pack;
    audio.click();
    renderTab();
  }));

  // gadget cards
  $$('.gadget-card', root).forEach((card) => {
    const id = card.dataset.gadget;
    const gadget = GADGET_MAP[id];
    const locked = !save.unlocked.includes(id);
    card.addEventListener('click', (event) => {
      if (event.target.closest('[data-unlock]')) return;
      if (locked) {
        audio.denied();
        toast(`SEALED — unlock ${gadget.name} with ${gadget.rarity} core${gadget.rarity > 1 ? 's' : ''}, or win it in an arena.`);
        return;
      }
      toggleGadget(id);
    });
  });

  // unlock buttons
  $$('[data-unlock]', root).forEach((btn) => btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const id = btn.dataset.unlock;
    const gadget = GADGET_MAP[id];
    const cost = gadget.rarity;
    if (save.unlocked.includes(id)) return;
    if (save.cores < cost) {
      audio.denied();
      toast(`Not enough cores. ${gadget.name} needs ◆${cost}.`);
      return;
    }
    save.cores -= cost;
    save.unlocked.push(id);
    audio.unlock();
    updateAll();
    persist(true);
    toast(`UNSEALED: ${gadget.name}`, 'good');
    renderTab();
  }));

  // remove rows
  $$('[data-remove]', root).forEach((btn) => btn.addEventListener('click', (event) => {
    event.stopPropagation();
    removeGadget(btn.dataset.remove);
  }));

  // mirror
  $('mirrorToggle', root).addEventListener('click', () => {
    save.config.mirror = !save.config.mirror;
    audio.click();
    refreshBuild();
    renderTab();
  });

  bindSliders(root, {
    'Rotate parts': (v) => { save.config.rotation = v; refreshBuild(); },
    'Resize parts': (v) => { save.config.resize = v; refreshBuild(); },
  });

  $$('[data-paint]', root).forEach((btn) => btn.addEventListener('click', () => {
    save.config.paint = btn.dataset.paint;
    audio.click();
    $$('[data-paint]', root).forEach((b) => b.classList.toggle('active', b === btn));
    persist();
  }));
}

function updatePartsLive() {
  // update budget/loadout text without re-rendering whole crate during slider drags
  const rows = $('loadoutList');
  if (!rows) return;
  const head = $('tabContent').querySelector('.section-head span');
  if (head) {
    const remaining = build.budget.maxMass - build.massCost;
    const energyLeft = build.budget.maxEnergy - build.energyCost;
    head.textContent = `${remaining} M · ${energyLeft} E LEFT`;
    head.style.color = build.overBudget ? 'var(--red)' : 'var(--muted-2)';
  }
}

function toggleGadget(id) {
  const gadgets = save.config.gadgets;
  if (gadgets.includes(id)) {
    removeGadget(id);
    return;
  }
  if (gadgets.length >= 12) {
    audio.denied();
    toast('Twelve parts is already a very loud ball. Remove something first.');
    return;
  }
  gadgets.push(id);
  audio.equip();
  const g = GADGET_MAP[id];
  previewState.expression = 'happy';
  previewState.poke = 1;
  const test = computeBuild(save.config, save.upgrades);
  if (test.overBudget) {
    toast(`${g.name} attached — but you are now over budget. Shed weight or forge a bigger bay.`, 'bad');
  } else {
    toast(`${g.name} attached.`);
  }
  refreshBuild();
  renderTab();
}

function removeGadget(id) {
  save.config.gadgets = save.config.gadgets.filter((x) => x !== id);
  audio.unequip();
  previewState.expression = null;
  refreshBuild();
  if (activeTab === 'parts') renderTab();
}

function renderForgeTab(root) {
  root.innerHTML = `
    <div class="forge-head">
      <div class="forge-wallet"><span>SCRAP</span><b id="forgeScrap">${save.scrap}</b></div>
      <div class="forge-wallet core"><span>POWER CORES</span><b id="forgeCores">${save.cores}</b></div>
    </div>
    <div class="section-head"><h3>FOUNDRY UPGRADES</h3><span>PERMANENT</span></div>
    <div class="forge-list">
      ${Object.entries(FORGE_UPGRADES).map(([id, up]) => {
        const lvl = save.upgrades[id] || 0;
        const cost = up.cost(lvl);
        const maxed = lvl >= up.max;
        return `<div class="forge-row" style="--fr-color:${up.color}">
          <div class="fr-top">
            <span class="fr-icon">${up.icon}</span>
            <span class="fr-name">${up.name}</span>
            <span class="fr-level">LV ${lvl} / ${up.max}</span>
          </div>
          <p class="fr-desc">${up.desc} <b style="color:${up.color}">${up.detail(lvl)}</b></p>
          <div class="fr-bottom">
            <span class="pips">${Array.from({ length: up.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span>
            <button class="forge-buy" data-forge="${id}" ${maxed || save.scrap < cost ? 'disabled' : ''}>
              ${maxed ? 'MAXED' : `⚙ ${cost}`}
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>
    <p class="forge-note">
      Scrap comes from every arena run. Cores come from wins — spend them on sealed gadget cards in PARTS.<br /><br />
      <button class="mini-btn" id="resetSave" style="color:#ff8f86;border-color:rgba(255,93,93,0.3)">RESET ALL PROGRESS</button>
    </p>`;

  $$('[data-forge]', root).forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.dataset.forge;
    const up = FORGE_UPGRADES[id];
    const lvl = save.upgrades[id] || 0;
    if (lvl >= up.max) return;
    const cost = up.cost(lvl);
    if (save.scrap < cost) {
      audio.denied();
      toast('Not enough scrap. The foundry does not do credit.');
      return;
    }
    save.scrap -= cost;
    save.upgrades[id] = lvl + 1;
    audio.coin();
    audio.tone({ freq: 220, dur: 0.3, type: 'triangle', gain: 0.08, slide: 160 });
    previewState.expression = 'happy';
    previewState.poke = 1;
    refreshBuild();
    updateAll();
    renderTab();
    toast(`${up.name} upgraded to LV ${lvl + 1}.`, 'good');
  }));

  $('resetSave', root).addEventListener('click', () => {
    if (!window.confirm('Scrap your entire save? Every gadget, upgrade, and win will be deleted.')) return;
    localStorage.removeItem(SAVE_KEY);
    save = defaultSave();
    save.seenIntro = true;
    build = computeBuild(save.config, save.upgrades);
    layouts = buildLayouts(save.config);
    persist(true);
    updateAll();
    renderTab();
    toast('Fresh ball. Fresh start.');
  });
}

function updateForgeWallet() {
  const s = $('forgeScrap');
  const c = $('forgeCores');
  if (s) s.textContent = save.scrap;
  if (c) c.textContent = save.cores;
}

/* ── navigation / overlays ─────────────────────────────────── */
function setNav(target) {
  $$('.mainnav button').forEach((b) => b.classList.toggle('active', b.dataset.nav === target));
}

function showScreen(name) {
  const ids = { workshop: 'workshopScreen', arenas: 'arenasScreen', play: 'playScreen' };
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $(ids[name]).classList.add('active');
  document.body.classList.toggle('playing', name === 'play');
  if (name === 'workshop') { setNav('workshop'); document.body.style.overflow = ''; }
  if (name === 'arenas') {
    setNav('arenas');
    renderArenas();
    audio.startMusic('workshop');
    document.body.style.overflow = '';
  }
}

function openHelp(intro = false) {
  audio.ensure();
  const overlay = $('helpOverlay');
  $('helpEyebrow').textContent = intro ? 'WELCOME, SMITH · BAY 07' : 'FIELD MANUAL';
  $('helpTitle').textContent = intro ? 'MAKE A BALL. BREAK A RING.' : 'SMITH. ROLL. LOOT. REPEAT.';
  $('helpStart').textContent = intro ? 'START SMITHING' : 'BACK TO THE BENCH';
  overlay.classList.remove('hidden');
  overlay.dataset.intro = intro ? '1' : '';
}

function closeHelp() {
  $('helpOverlay').classList.add('hidden');
  if (save.seenIntro !== true) {
    save.seenIntro = true;
    persist(true);
  }
  audio.click();
}

/* ── arena cards ───────────────────────────────────────────── */
function arenaArt(mode, color) {
  const common = `stroke="${color}" fill="none" stroke-width="2"`;
  if (mode === 'sumo') {
    return `<svg viewBox="0 0 180 180" aria-hidden="true">
      <defs><radialGradient id="sa" cx="40%" cy="35%"><stop offset="0" stop-color="#ffe09a"/><stop offset=".6" stop-color="${color}"/><stop offset="1" stop-color="#a6501e"/></radialGradient></defs>
      <ellipse cx="90" cy="118" rx="66" ry="21" ${common} opacity=".4"/>
      <ellipse cx="90" cy="112" rx="52" ry="16" fill="${color}" opacity=".08"/>
      <circle cx="90" cy="76" r="27" fill="url(#sa)"/>
      <circle cx="81" cy="69" r="4.5" fill="#12161c"/><circle cx="99" cy="69" r="4.5" fill="#12161c"/>
      <path d="M81 84q9 7 18 0" stroke="#12161c" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M52 60l-14-8M128 60l14-8" ${common} opacity=".5"/>
      <circle cx="134" cy="104" r="13" fill="none" stroke="${color}" stroke-width="1.5" opacity=".45" stroke-dasharray="3 5"/>
      <path d="M36 128q54 17 108 0" ${common} opacity=".25"/>
      <circle cx="90" cy="76" r="35" fill="none" stroke="${color}" stroke-width="1" opacity=".3" stroke-dasharray="2 6"/>
    </svg>`;
  }
  if (mode === 'race') {
    return `<svg viewBox="0 0 180 180" aria-hidden="true">
      <ellipse cx="90" cy="92" rx="66" ry="44" fill="none" stroke="${color}" stroke-width="14" opacity=".16"/>
      <ellipse cx="90" cy="92" rx="66" ry="44" fill="none" stroke="${color}" stroke-width="1.5" opacity=".5" stroke-dasharray="6 6"/>
      <ellipse cx="90" cy="92" rx="36" ry="20" fill="none" stroke="${color}" stroke-width="1" opacity=".3"/>
      <circle cx="90" cy="48" r="8" fill="${color}"/>
      <circle cx="81" cy="45" r="2.5" fill="#12161c"/><circle cx="88" cy="44" r="2.5" fill="#12161c"/>
      <path d="M148 80l12 4-10 8z" fill="${color}" opacity=".7"/>
      <path d="M32 104l-12-4 10-8z" fill="${color}" opacity=".7"/>
      <g opacity=".35" stroke="${color}" stroke-width="2"><path d="M48 60l8 8M140 124l-8-8"/></g>
      <path d="M126 44l14 14-20 4z" fill="${color}" opacity=".25"/>
    </svg>`;
  }
  if (mode === 'boss') {
    return `<svg viewBox="0 0 180 180" aria-hidden="true">
      <defs><radialGradient id="ba" cx="38%" cy="30%"><stop offset="0" stop-color="#ff9b8e"/><stop offset=".55" stop-color="#a33030"/><stop offset="1" stop-color="#3a1014"/></radialGradient></defs>
      <circle cx="102" cy="80" r="46" fill="url(#ba)"/>
      ${Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const x1 = 102 + Math.cos(a) * 45;
        const y1 = 80 + Math.sin(a) * 45;
        const x2 = 102 + Math.cos(a) * 61;
        const y2 = 80 + Math.sin(a) * 61;
        return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
      }).join('')}
      <circle cx="87" cy="73" r="4" fill="#190d10"/><circle cx="114" cy="73" r="4" fill="#190d10"/>
      <path d="M88 94q13 8 26 0" stroke="#190d10" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="102" cy="80" r="14" fill="none" stroke="${color}" stroke-width="2" opacity=".6"/>
      <circle cx="52" cy="126" r="12" fill="${color}" opacity=".85"/>
      <circle cx="49" cy="123" r="1.8" fill="#12161c"/><circle cx="56" cy="123" r="1.8" fill="#12161c"/>
      <path d="M46 131q6 4 12 0" stroke="#12161c" stroke-width="2" fill="none"/>
      <circle cx="102" cy="80" r="72" fill="none" stroke="${color}" stroke-width="1" opacity=".2" stroke-dasharray="4 8"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 180 180" aria-hidden="true">
    <path d="M30 30L80 150H-20z" fill="${color}" opacity=".08"/>
    <path d="M150 30L100 150h100z" fill="${color}" opacity=".08"/>
    <rect x="38" y="126" width="104" height="10" rx="4" fill="${color}" opacity=".25"/>
    <circle cx="62" cy="102" r="23" fill="#ff6b5b"/>
    <circle cx="56" cy="97" r="3.4" fill="#17100f"/><circle cx="68" cy="97" r="3.4" fill="#17100f"/>
    <path d="M55 108q7 6 14 0" stroke="#17100f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="110" cy="100" r="28" fill="#67e8f9"/>
    <circle cx="102" cy="94" r="4" fill="#0f1518"/><circle cx="118" cy="94" r="4" fill="#0f1518"/>
    <path d="M101 110q9 8 18 0" stroke="#0f1518" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="136" cy="112" r="16" fill="#a7f36b"/>
    <circle cx="131" cy="108" r="2.6" fill="#10150f"/><circle cx="141" cy="108" r="2.6" fill="#10150f"/>
    <path d="M130 117q6 5 12 0" stroke="#10150f" stroke-width="2" fill="none" stroke-linecap="round"/>
    <g fill="${color}"><path d="M38 54l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" opacity=".7"/><path d="M142 42l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity=".5"/></g>
    <circle cx="90" cy="62" r="2" fill="${color}" opacity=".5"/>
  </svg>`;
}

function renderArenas() {
  const c = save.config;
  const mat = MATERIALS[c.material];
  $('arenaBudget').textContent = `${build.massCost} / ${build.budget.maxMass}`;
  $('arenaBuild').innerHTML = `
    <canvas id="arenaMini"></canvas>
    <div><div class="bm-name">${c.name}</div><div class="bm-sub">${mat.name.toUpperCase()} · ${CORES[c.core].name.toUpperCase()} · ${build.massCost}M</div></div>`;
  const mini = $('arenaMini');
  requestAnimationFrame(() => drawPortrait(mini, c, layouts, 54));

  const grid = $('arenaGrid');
  grid.innerHTML = Object.entries(MODE_META).map(([mode, meta]) => {
    const best = save.stats.best[mode];
    const bestLabel = best ? `<span class="ac-pill">BEST ${best}</span>` : '';
    return `<button class="arena-card" data-mode="${mode}" style="--ac:${alpha(meta.color, 0.18)}">
      <div class="arena-art">${arenaArt(mode, meta.color)}</div>
      <div class="ac-copy">
        <span class="ac-num">ARENA ${meta.num} · ${meta.eyebrow}</span>
        <h3 class="ac-title">${meta.title}</h3>
        <p class="ac-desc">${meta.desc}</p>
      </div>
      <div class="ac-diff">${Array.from({ length: 3 }, (_, i) => `<i class="${i < meta.diff ? 'on' : ''}"></i>`).join('')}</div>
      <div class="ac-foot">
        <div class="ac-meta">
          <span class="ac-pill">${meta.sub}</span>
          <span class="ac-pill reward">${meta.tag}</span>
          ${bestLabel}
        </div>
        <span class="ac-go">→</span>
      </div>
    </button>`;
  }).join('');

  $$('.arena-card', grid).forEach((card) => card.addEventListener('click', () => {
    startArena(card.dataset.mode);
  }));
}

function startArena(mode) {
  audio.ensure();
  if (build.overBudget) {
    audio.denied();
    const over = [];
    if (build.phys.overMass) over.push(`${build.massCost - build.budget.maxMass} mass`);
    if (build.phys.overEnergy) over.push(`${build.energyCost - build.budget.maxEnergy} energy`);
    toast(`Over budget by ${over.join(' and ')}. The arena gate is not a suggestion.`, 'bad');
    showScreen('workshop');
    activeTab = 'parts';
    $$('#buildTabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'parts'));
    renderTab();
    return;
  }
  save.stats.lastMode = mode;
  save.stats.plays += 1;
  persist(true);

  showScreen('play');
  $('resultOverlay').classList.add('hidden');
  $('pauseOverlay').classList.add('hidden');
  $('countdownOverlay').classList.add('hidden');

  // pilot HUD
  $('pilotName').textContent = save.config.name;
  $('pilotMood').textContent = MOODS[save.config.mood].name.toUpperCase();
  $('pilotMood').style.color = MOODS[save.config.mood].color;
  $('coreGlyph').textContent = CORES[save.config.core].icon;
  const portrait = $('pilotPortrait');
  requestAnimationFrame(() => drawPortrait(portrait, save.config, layouts, 46));

  if (game) game.destroy();
  game = new ArenaGame({
    mode,
    canvas: $('gameCanvas'),
    build,
    save,
    onEnd: handleArenaEnd,
    onQuit: exitArena,
  });
  game.start();
  audio.startMusic(mode === 'boss' ? 'boss' : 'arena');
}

function exitArena() {
  if (game) { game.destroy(); game = null; }
  $('resultOverlay').classList.add('hidden');
  $('pauseOverlay').classList.add('hidden');
  showScreen('arenas');
}

function handleArenaEnd(result) {
  if (!result) return;
  const mode = result.mode;
  const luck = build.phys.luck;
  const meta = MODE_META[mode];
  const won = result.win;
  const showcaseRank = result.rank || 3;
  const showcaseWin = mode === 'showcase' && showcaseRank <= 2;

  let scrap = 0;
  let cores = 0;
  if (mode === 'showcase') {
    scrap = Math.round((55 + result.score * 1.25) * (0.8 + luck * 0.25));
    cores = showcaseRank === 1 ? 2 : showcaseRank === 2 ? 1 : 0;
  } else if (won) {
    const base = { sumo: 95, race: 115, boss: 180 }[mode] || 90;
    const perf = result.time ? Math.max(0, 40 - Math.floor(result.time)) : 0;
    scrap = Math.round((base + perf) * (0.85 + Math.random() * 0.3) * (0.75 + luck * 0.3));
    cores = { sumo: 1, race: 1, boss: 3 }[mode] || 1;
  } else {
    const base = { sumo: 32, race: 38, boss: 60 }[mode] || 30;
    scrap = Math.max(10, Math.round(base * (0.7 + luck * 0.3)) + Math.round(result.progressBonus || 0));
    cores = 0;
  }

  save.scrap += scrap;
  save.cores += cores;
  if (won) save.stats.wins += 1;
  save.stats.best[mode] = Math.max(save.stats.best[mode] || 0, result.bestScore || result.score || 0);

  // unlock drop
  let unlockedGadget = null;
  const locked = GADGETS.filter((g) => !save.unlocked.includes(g.id));
  const dropChance = (won || showcaseWin ? 0.55 : 0.18) * Math.min(1.7, luck);
  if (locked.length && Math.random() < dropChance) {
    const pool = locked.filter((g) => g.rarity <= (won ? 3 : 2));
    const source = pool.length ? pool : locked;
    const totalWeight = source.reduce((sum, g) => sum + (4 - g.rarity), 0);
    let roll = Math.random() * totalWeight;
    let picked = source[source.length - 1];
    for (const g of source) {
      roll -= 4 - g.rarity;
      if (roll <= 0) { picked = g; break; }
    }
    save.unlocked.push(picked.id);
    unlockedGadget = picked;
  } else if (won && locked.length === 0) {
    save.scrap += 60;
  }

  persist(true);
  updateAll();
  audio.stopMusic();
  if (won || showcaseWin) audio.win();
  else audio.lose();
  if (unlockedGadget) setTimeout(() => audio.unlock(), 650);

  renderResult({ ...result, scrap, cores, unlockedGadget, mode, meta, showcaseWin });
}

function renderResult(result) {
  const overlay = $('resultOverlay');
  const {
    mode, meta, win, showcaseWin, score, time, rank, rivalScores,
    scrap, cores, unlockedGadget, detail, playerHp, bossHp, progress,
  } = result;
  const success = win || showcaseWin;
  const victory = mode === 'showcase' ? rank === 1 : win;
  let title = 'VICTORY';
  if (mode === 'sumo') title = win ? 'RING OUT!' : 'YOU FELL';
  else if (mode === 'race') title = win ? 'FIRST PLACE' : 'SECOND PLACE';
  else if (mode === 'boss') title = win ? 'WARDEN DOWN' : 'SYSTEM FAILURE';
  else title = rank === 1 ? 'CROWD FAVOURITE' : rank === 2 ? 'RUNNER-UP' : 'NICE BALL';
  if (mode === 'sumo' && !win) title = 'RING OUT';
  if (!success && mode !== 'race' && mode !== 'showcase') title = 'DEFEAT';
  if (mode === 'race' && !win) title = 'PIPPED AT THE LINE';

  const summary = {
    sumo: win ? 'The rim claimed your rival. The crowd is still chanting.' : 'Gravity won. Rebuild, get heavier, or get cleverer.',
    race: win ? 'Two laps, no brakes, one very smug ball.' : 'Second is just first with better excuses. Try more grip.',
    boss: win ? 'The prototype is scrap. The foundry is very quietly impressed.' : 'The warden is still standing. It would like a rematch.',
    showcase: rank === 1 ? 'The lobby lost its mind. Your ball is, officially, the moment.' : `Rank #${rank}. The crowd liked you. The crowd liked someone else more.`,
  }[mode];

  const statRows = [];
  if (mode === 'sumo') {
    statRows.push(['ROUND TIME', `${(time || 0).toFixed(1)}s`], ['IMPACT POWER', Math.round(score || 0)], ['HP LEFT', playerHp != null ? `${Math.round(playerHp)}` : '—']);
  } else if (mode === 'race') {
    statRows.push(['RACE TIME', `${(time || 0).toFixed(1)}s`], ['TOP SPEED', `${Math.round(score || 0)}`], ['LAPS', `${Math.min(2, progress || 0)} / 2`]);
  } else if (mode === 'boss') {
    statRows.push(['TIME', `${(time || 0).toFixed(1)}s`], ['DAMAGE DEALT', Math.round(score || 0)], ['HP LEFT', `${Math.round(playerHp || 0)}`]);
  } else {
    statRows.push(['CROWD SCORE', Math.round(score || 0)], ['RANK', `#${rank || 3} / 5`], ['LUCK', `×${build.phys.luck.toFixed(1)}`]);
  }

  const unlockHtml = unlockedGadget ? `
    <div class="unlock-card">
      <canvas id="unlockPortrait"></canvas>
      <div class="uc-copy">
        <span class="uc-kicker">NEW PART UNSEALED · ${PACKS[unlockedGadget.pack].name.toUpperCase()}</span>
        <div class="uc-name">${unlockedGadget.name}</div>
        <div class="uc-sub">${unlockedGadget.blurb} · ${unlockedGadget.mass}M / ${unlockedGadget.energy}E</div>
      </div>
      <span style="color:var(--violet);font-family:var(--mono);font-size:16px">◆</span>
    </div>` : '';

  const showcaseBreakdown = mode === 'showcase' && result.breakdown ? `
    <div class="result-stats" style="margin-bottom:14px">
      ${Object.entries(result.breakdown).map(([label, value]) => `<div class="result-stat"><span>${label.toUpperCase()}</span><b>${Math.round(value)}</b></div>`).join('')}
    </div>` : '';

  overlay.innerHTML = `
    <div class="modal result-modal">
      <div class="result-banner ${success ? '' : 'lose'}">
        <span class="eyebrow">${meta.eyebrow} · RESULT</span>
        <h2>${title}</h2>
        <p>${summary}</p>
        <canvas class="rb-ball" id="resultBall"></canvas>
      </div>
      <div class="result-body">
        <div class="result-stats">${statRows.map(([label, value]) => `<div class="result-stat"><span>${label}</span><b>${value}</b></div>`).join('')}</div>
        ${showcaseBreakdown}
        ${unlockHtml}
        <div class="reward-row">
          <span class="reward-chip"><i>⚙</i><b>+${scrap}</b><small>SCRAP</small></span>
          ${cores ? `<span class="reward-chip core"><i>◆</i><b>+${cores}</b><small>CORES</small></span>` : ''}
          ${unlockedGadget ? `<span class="reward-chip"><i>◈</i><b>1</b><small>NEW PART</small></span>` : ''}
          ${mode === 'showcase' && rivalScores ? `<span class="reward-chip"><i>♛</i><b>#${rank}</b><small>OF ${rivalScores.length + 1}</small></span>` : ''}
        </div>
        <p class="result-note">BUDGET ${build.massCost}/${build.budget.maxMass} MASS · ${build.energyCost}/${build.budget.maxEnergy} ENERGY · LUCK ×${build.phys.luck.toFixed(1)}${unlockedGadget ? ' · NEW PART IS READY IN PARTS' : ''}</p>
        <div class="result-actions">
          <button class="btn primary" data-result="rematch">REMATCH</button>
          <button class="btn ghost" data-result="workshop">BACK TO WORKSHOP</button>
          <button class="btn ghost" data-result="arenas">ALL ARENAS</button>
        </div>
      </div>
    </div>`;
  overlay.classList.remove('hidden');

  requestAnimationFrame(() => {
    const ball = $('resultBall');
    if (ball) {
      const w = ball.clientWidth || 190;
      ball.width = w * 2;
      ball.height = w * 2;
      const ctx = ball.getContext('2d');
      ctx.scale(2, 2);
      drawBlob(ctx, {
        x: w / 2, y: w * 0.54, r: w * 0.27, config: save.config, t: 2.2,
        layouts, expression: success ? 'happy' : 'ko', glow: 0.2,
      });
    }
    if (unlockedGadget) {
      const up = $('unlockPortrait');
      if (up) {
        const gLayouts = buildLayouts({ ...save.config, gadgets: [...save.config.gadgets, unlockedGadget.id] });
        drawPortrait(up, save.config, gLayouts, 44);
      }
    }
  });

  $$('[data-result]', overlay).forEach((btn) => btn.addEventListener('click', () => {
    const action = btn.dataset.result;
    audio.click();
    overlay.classList.add('hidden');
    const modeNow = mode;
    if (action === 'rematch') {
      startArena(modeNow);
    } else if (action === 'workshop') {
      if (game) { game.destroy(); game = null; }
      showScreen('workshop');
      refreshBuild();
    } else {
      exitArena();
    }
  }));
}

/* ── preview canvas ────────────────────────────────────────── */
function resizePreview() {
  if (!previewCanvas) return;
  const rect = previewCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  previewSize.w = rect.width;
  previewSize.h = rect.height;
  previewCanvas.width = Math.max(1, Math.round(rect.width * dpr));
  previewCanvas.height = Math.max(1, Math.round(rect.height * dpr));
  previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const dust = Array.from({ length: 26 }, (_, i) => ({
  x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.6, sp: 0.005 + Math.random() * 0.02,
  phase: Math.random() * Math.PI * 2, depth: 0.3 + Math.random() * 0.7,
}));

function drawPreview(now) {
  if (!previewCtx) return;
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!document.getElementById('workshopScreen').classList.contains('active')) return;

  const { w, h } = previewSize;
  if (w < 2 || h < 2) return;
  const ctx = previewCtx;
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.44;
  const r = Math.max(46, Math.min(w * 0.17, h * 0.205, 118));
  const t = now / 1000;

  // background glow
  const bg = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r * 3.2);
  bg.addColorStop(0, alpha(save.config.color, 0.1));
  bg.addColorStop(0.5, 'rgba(255,181,69,0.02)');
  bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // floor rings
  ctx.save();
  ctx.translate(cx, cy + r * 1.34);
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (1.3 + i * 0.55), r * (0.26 + i * 0.1), 0, 0, Math.PI * 2);
    ctx.strokeStyle = i === 0 ? 'rgba(255,181,69,0.22)' : `rgba(247,242,232,${0.055 - i * 0.01})`;
    ctx.lineWidth = i === 0 ? 1.5 : 1;
    ctx.stroke();
  }
  // sweeping radar arc
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.1, r * 0.55, 0, t * 0.4, t * 0.4 + 1.1);
  ctx.strokeStyle = 'rgba(255,181,69,0.13)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // dust
  for (const d of dust) {
    const dx = ((d.x * w + Math.sin(t * d.sp * 8 + d.phase) * 20 + w) % w);
    const dy = ((d.y * h - t * 7 * d.depth + Math.sin(t * 0.4 + d.phase) * 12 + h) % h);
    ctx.fillStyle = `rgba(255,205,140,${0.06 + d.depth * 0.12})`;
    ctx.beginPath();
    ctx.arc(dx, dy, d.s, 0, Math.PI * 2);
    ctx.fill();
  }

  // giant outline number
  ctx.save();
  ctx.font = `800 ${Math.min(260, h * 0.44)}px 'Bricolage Grotesque', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(247,242,232,0.018)';
  ctx.fillText('01', cx, cy + r * 0.15);
  ctx.restore();

  // spin inertia
  if (!previewState.drag) {
    previewState.spinVel *= 0.94;
    save.config.rotation = clamp(save.config.rotation + previewState.spinVel * dt, -45, 45);
  }

  // poke animation
  if (previewState.poke > 0) previewState.poke = Math.max(0, previewState.poke - dt * 2.2);
  const poke = Math.sin(previewState.poke * Math.PI) * 0.06;
  const bob = Math.sin(t * 1.7) * r * 0.025;
  let face = previewState.pointer;
  if (!face) face = { x: Math.sin(t * 0.6) * 0.3, y: Math.cos(t * 0.45) * 0.2 };

  // glow puddle
  ctx.save();
  const puddle = ctx.createRadialGradient(cx, cy + r * 1.18, 0, cx, cy + r * 1.18, r * 1.3);
  puddle.addColorStop(0, alpha(save.config.color, 0.3));
  puddle.addColorStop(1, alpha(save.config.color, 0));
  ctx.fillStyle = puddle;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.18, r * 1.1, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // orbit sparks
  ctx.save();
  for (let i = 0; i < 3; i += 1) {
    const a = t * 0.5 + (i / 3) * Math.PI * 2;
    const ox = cx + Math.cos(a) * r * 1.42;
    const oy = cy + Math.sin(a) * r * 0.55 + bob;
    ctx.fillStyle = alpha(save.config.accent, 0.3 + 0.3 * Math.sin(t * 2 + i));
    ctx.beginPath();
    ctx.arc(ox, oy, 1.8 + Math.sin(t * 3 + i) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(0, bob);
  ctx.scale(1 + poke, 1 - poke);
  if (build.overBudget) {
    ctx.shadowColor = 'rgba(255,93,93,0.6)';
    ctx.shadowBlur = 30;
  }

  drawBlob(ctx, {
    x: cx, y: cy, r, config: save.config, t, face,
    expression: previewState.expression,
    layouts, glow: build.overBudget ? 0.25 : 0,
  });
  ctx.restore();

  // little base
  ctx.save();
  ctx.translate(cx, cy + r * 1.2);
  ctx.fillStyle = 'rgba(247,242,232,0.24)';
  ctx.font = `600 7px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText(`MASS ${build.massCost} · ${save.config.name}`, 0, 0);
  ctx.restore();

  if (previewState.expression === 'happy' && previewState.poke < 0.05) previewState.expression = null;
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!document.getElementById('workshopScreen').classList.contains('active')) { lastTime = now; return; }
  drawPreview(now);
}

function setupPreview() {
  previewCanvas = $('previewCanvas');
  previewCtx = previewCanvas.getContext('2d');
  new ResizeObserver(resizePreview).observe(previewCanvas);
  resizePreview();

  let down = null;
  previewCanvas.addEventListener('pointermove', (event) => {
    const rect = previewCanvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height * 0.44;
    previewState.pointer = { x: clamp((px - cx) / (rect.width * 0.4), -1, 1), y: clamp((py - cy) / (rect.height * 0.4), -1, 1) };
    if (down) {
      const delta = (event.clientX - down.x) * 0.45;
      save.config.rotation = clamp(save.config.rotation + delta, -45, 45);
      previewState.spinVel = delta;
      down.x = event.clientX;
      down.moved = true;
      persist();
    }
  });
  previewCanvas.addEventListener('pointerleave', () => { previewState.pointer = null; });
  previewCanvas.addEventListener('pointerdown', (event) => {
    previewCanvas.setPointerCapture(event.pointerId);
    down = { x: event.clientX, moved: false };
    previewCanvas.style.cursor = 'grabbing';
  });
  previewCanvas.addEventListener('pointerup', (event) => {
    previewCanvas.style.cursor = '';
    if (down && !down.moved) {
      previewState.poke = 1;
      previewState.expression = 'happy';
      audio.voice(save.config.mood, save.config.voice);
    }
    down = null;
    try { previewCanvas.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
  });
  previewCanvas.addEventListener('pointercancel', () => { down = null; previewCanvas.style.cursor = ''; });

  requestAnimationFrame(loop);
}

/* ── wiring ────────────────────────────────────────────────── */
function wireUI() {
  $$('[data-nav]').forEach((btn) => btn.addEventListener('click', () => {
    audio.ensure();
    audio.click();
    if (btn.dataset.nav === 'arenas') showScreen('arenas');
    else {
      if (game) { game.destroy(); game = null; }
      showScreen('workshop');
      refreshBuild();
    }
  }));

  $$('#buildTabs button').forEach((btn) => btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    $$('#buildTabs button').forEach((b) => b.classList.toggle('active', b === btn));
    audio.click();
    if (activeTab === 'forge') { updateForgeWallet(); }
    renderTab();
  }));

  $('blobName').addEventListener('input', (event) => {
    const clean = event.target.value.toUpperCase().replace(/[^A-Z0-9 _-]/g, '').slice(0, 10);
    save.config.name = clean || 'PIP';
    event.target.value = save.config.name;
    $('stageName').textContent = save.config.name;
    $('pilotName').textContent = save.config.name;
    persist();
  });
  $('blobName').addEventListener('blur', (event) => {
    if (!event.target.value.trim()) {
      save.config.name = 'PIP';
      event.target.value = 'PIP';
      updateAll();
      persist();
    }
  });

  $('diceBtn').addEventListener('click', () => {
    audio.voice(save.config.mood, save.config.voice);
    previewState.expression = 'happy';
    previewState.poke = 1;
    let name = save.config.name;
    while (name === save.config.name) name = NAMES[Math.floor(Math.random() * NAMES.length)];
    save.config.name = name;
    persist();
    updateAll();
  });

  $('randomBtn').addEventListener('click', () => {
    audio.equip();
    save.config = randomBuild(save.config, save.unlocked);
    refreshBuild();
    renderTab();
    toast('Rerolled. The foundry has opinions, but it keeps them to itself.');
  });

  $('enterArena').addEventListener('click', () => {
    audio.ensure();
    audio.click();
    if (build.overBudget) {
      audio.denied();
      const over = [];
      if (build.phys.overMass) over.push(`${build.massCost - build.budget.maxMass} mass`);
      if (build.phys.overEnergy) over.push(`${build.energyCost - build.budget.maxEnergy} energy`);
      toast(`Over budget by ${over.join(' and ')}. Trim a part, or buy a bigger bay in FORGE.`, 'bad');
      $('loadHint').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 240 });
      return;
    }
    showScreen('arenas');
  });

  $('soundBtn').addEventListener('click', () => {
    audio.ensure();
    save.sound = !save.sound;
    audio.setMuted(!save.sound);
    $('soundBtn').classList.toggle('off', !save.sound);
    $('soundBtn').textContent = save.sound ? '♪' : '♪';
    persist();
    if (save.sound) audio.click();
  });

  $('helpBtn').addEventListener('click', () => { audio.click(); openHelp(false); });
  $('helpClose').addEventListener('click', closeHelp);
  $('helpStart').addEventListener('click', closeHelp);
  $('helpOverlay').addEventListener('click', (event) => {
    if (event.target === $('helpOverlay')) closeHelp();
  });

  document.addEventListener('pointerdown', function unlockAudio() {
    audio.ensure();
    audio.startMusic('workshop');
    document.removeEventListener('pointerdown', unlockAudio);
  }, { once: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!$('helpOverlay').classList.contains('hidden')) { closeHelp(); return; }
      if (game && document.getElementById('playScreen').classList.contains('active')) game.togglePause();
    }
    if (event.target.tagName === 'INPUT') return;
  });

  window.addEventListener('beforeunload', () => persist(true));
}

function boot() {
  // restore sound
  audio.setMuted(!save.sound);
  $('soundBtn').classList.toggle('off', !save.sound);

  wireUI();
  setupPreview();
  updateAll();
  renderTab();
  showScreen('workshop');

  if (!save.seenIntro) {
    setTimeout(() => openHelp(true), 350);
  }
}

boot();
