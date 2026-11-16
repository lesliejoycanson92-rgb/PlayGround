import {
  GADGET_MAP, MATERIALS, MOODS, CORES, BUILD_TAGS, DEFAULT_UPGRADES,
} from './data.js';

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const MASS_BASE = 120;
export const ENERGY_BASE = 80;

const VISUAL_SIZE = {
  spike: 0.55, arm: 0.95, leg: 0.9, wing: 1.2, tentacle: 1.05, spring: 0.55,
  tread: 0.6, hammer: 0.78, saw: 0.5, tail: 0.95, cannon: 0.78, eye: 0.26,
  fang: 0.4, rocket: 0.82, hook: 0.72, bubble: 1.2, magnet: 0.55, hat: 0.72,
  orb: 0.52, blade: 0.7, claw: 0.52, drill: 0.62, antenna: 0.68,
};

const BEHIND = new Set(['wing', 'rocket', 'tread', 'tentacle', 'tail', 'spring', 'bubble', 'magnet']);

export function gadgetCost(gadget, config) {
  const mirror = config.mirror ? 1.3 : 1;
  const resize = Math.pow(config.resize || 1, 1.55);
  return {
    mass: Math.round(gadget.mass * mirror * resize),
    energy: Math.round(gadget.energy * mirror * resize),
  };
}

export function computeBuild(config, upgrades = DEFAULT_UPGRADES, options = {}) {
  const mat = MATERIALS[config.material] || MATERIALS.rubber;
  const core = CORES[config.core] || CORES.fire;
  const mood = MOODS[config.mood] || MOODS.bold;
  const up = { ...DEFAULT_UPGRADES, ...upgrades };

  const bodyMass = Math.round(34 + config.size * config.size * config.weight * mat.mass * 24);
  const bodyEnergy = 6 + core.energy;
  const bodyMassFinal = Math.round(bodyMass * (mood.mass || 1) * 0.94 + (core.mass || 1) * 4);

  const gadgets = (config.gadgets || []).map((id) => GADGET_MAP[id]).filter(Boolean);
  const resizeStat = 0.55 + (config.resize || 1) * 0.45;
  const mirrorStat = config.mirror ? 1.15 : 1;
  const statFactor = resizeStat * mirrorStat;

  const totals = { dmg: 0, speed: 0, grip: 0, def: 0, bounce: 0, control: 0, luck: 0, dash: 0 };
  let massCost = 0;
  let energyCost = bodyEnergy;
  const partCosts = [];
  const tags = new Set();

  for (const gadget of gadgets) {
    const cost = gadgetCost(gadget, config);
    massCost += cost.mass;
    energyCost += cost.energy;
    partCosts.push({ gadget, cost });
    for (const key of Object.keys(totals)) {
      totals[key] += (gadget.stats[key] || 0) * statFactor;
    }
    for (const tag of gadget.tags || []) tags.add(tag);
  }

  const totalMass = bodyMassFinal + massCost;
  const maxMass = MASS_BASE + (up.mass || 0) * 15;
  const maxEnergy = ENERGY_BASE + (up.energy || 0) * 10;

  const phys = {};
  phys.radius = 30 * config.size;
  phys.massUnits = totalMass / 10 + 4;
  phys.maxSpeed = clamp(
    (206 + (config.grip - 5) * 5.5 + (config.bounce - 5) * 2.5
      + totals.speed * 6 + mat.grip * 3 + mat.control * 3
      + (up.motor || 0) * 7 - totalMass * 0.2)
    * mood.speed * core.speed,
    92,
    360,
  );
  phys.accel = clamp(400 + config.grip * 18 + totals.grip * 10 + mat.grip * 12 - totalMass * 1.05, 260, 900) * mood.speed;
  phys.dash = clamp(
    (310 + config.bounce * 8.5 + totals.dash * 20 + (up.motor || 0) * 9 - totalMass * 0.8)
      * (mood.dash || 1) * (core.speed || 1),
    190,
    760,
  );
  phys.damage = (8 + totals.dmg * 1.7 + mat.def * 0.5 + (config.mood === 'angry' ? 2 : 0))
    * mood.dmg * core.dmg;
  phys.defense = clamp((1 + mat.def * 0.9 + totals.def * 0.4 + (up.armor || 0) * 0.12)
    * mood.def * core.def, 0.7, 4.5);
  phys.bounce = clamp(0.3 + config.bounce * 0.045 + mat.bounce * 0.02 + totals.bounce * 0.012, 0.18, 1.02);
  phys.grip = clamp(5 + config.grip * 0.7 + mat.grip + totals.grip * 0.55, 2, 24);
  phys.control = clamp(
    (0.82 + phys.grip * 0.018 + totals.control * 0.016 + mat.control * 0.022) * mood.control * core.control,
    0.45,
    1.7,
  );
  phys.luck = (1 + totals.luck * 0.075 + (up.luck || 0) * 0.12) * mood.luck;
  phys.mass = totalMass / 9.5 * (mood.mass || 1) * (core.mass || 1);
  phys.bodyMass = bodyMassFinal;
  phys.bodyEnergy = bodyEnergy;
  phys.maxMass = maxMass;
  phys.maxEnergy = maxEnergy;
  phys.massCost = totalMass;
  phys.energyCost = energyCost;
  phys.overMass = totalMass > maxMass;
  phys.overEnergy = energyCost > maxEnergy;
  phys.overBudget = phys.overMass || phys.overEnergy;
  phys.gadgetTags = tags;
  phys.gadgetCount = gadgets.length;
  phys.efficiency = clamp(1 - ((totalMass / maxMass) * 0.5 + (energyCost / maxEnergy) * 0.5), 0, 1);

  const scales = {
    speed: clamp((phys.maxSpeed - 120) / 260, 0, 1),
    power: clamp(phys.damage / 34, 0, 1),
    armor: clamp((phys.defense - 0.7) / 3.8, 0, 1),
    grip: clamp((phys.grip - 2) / 20, 0, 1),
    bounce: clamp((phys.bounce - 0.15) / 0.9, 0, 1),
    control: clamp((phys.control - 0.45) / 1.25, 0, 1),
    luck: clamp((phys.luck - 1) / 1.8, 0, 1),
    mass: clamp((totalMass - 50) / 150, 0, 1),
  };

  const build = {
    config, phys, scales, totals, partCosts, massCost: totalMass, energyCost,
    budget: { mass: totalMass, maxMass, energy: energyCost, maxEnergy },
    overBudget: phys.overBudget,
    tags: BUILD_TAGS.filter((tag) => tag.test({ phys })).slice(0, 3),
    core, mood, mat,
  };
  if (options.ignoreBudget) {
    build.overBudget = false;
  }
  return build;
}

/* Attachments laid out around the ball. Mirror + rotation + resize are real. */
export function buildLayouts(config) {
  const gadgets = (config.gadgets || []).map((id) => GADGET_MAP[id]).filter(Boolean);
  const groups = {};
  for (const gadget of gadgets) (groups[gadget.pack] ||= []).push(gadget);
  const baseRot = ((config.rotation || 0) * Math.PI) / 180;
  const layouts = [];

  const presets = {
    limbs: [24, 156, 208, 336, 72, 108, 252, 288],
    movement: [48, 132, 228, 312, 90, 270],
    weird: [-72, 12, 96, 180, 264, 300],
    face: [-126, -54, -160, -20, -100, -80],
  };

  for (const [pack, list] of Object.entries(groups)) {
    list.forEach((gadget, i) => {
      let deg;
      let dist;
      let size;
      if (pack === 'weapons') {
        deg = -90 + (360 / Math.max(list.length, 1)) * i;
        dist = 0.9;
        size = 1;
      } else if (pack === 'face') {
        deg = presets.face[i % presets.face.length];
        dist = 0.6;
        size = 0.9;
      } else if (pack === 'weird') {
        deg = presets.weird[i % presets.weird.length];
        dist = 1.04;
        size = 0.95;
      } else {
        const p = presets[pack] || [0, 90, 180, 270];
        deg = p[i % p.length];
        dist = 0.88;
        size = 1;
      }
      const angle = baseRot + (deg * Math.PI) / 180;
      const entry = {
        gadget,
        angle,
        dist,
        size: (VISUAL_SIZE[gadget.visual] || 0.6) * (config.resize || 1) * size,
        behind: BEHIND.has(gadget.visual),
        mirror: false,
        mirrorIndex: -1,
      };
      layouts.push(entry);
      if (config.mirror) {
        layouts.push({
          ...entry,
          angle: baseRot + Math.PI - (deg * Math.PI) / 180,
          mirror: true,
          flip: true,
        });
      }
    });
  }
  return layouts;
}

export function randomBuild(config, unlocked, keepLook = false) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const next = { ...config };
  if (!keepLook) {
    next.size = +rnd(0.82, 1.24).toFixed(2);
    next.weight = +rnd(0.72, 1.3).toFixed(2);
    next.bounce = Math.round(rnd(3, 9));
    next.grip = Math.round(rnd(3, 9));
    next.material = pick(['rubber', 'metal', 'jelly', 'stone']);
    next.mood = pick(['angry', 'calm', 'scared', 'bold', 'giddy']);
    next.core = pick(['fire', 'ice', 'electric', 'gravity']);
    next.color = pick(['#ffb545', '#ff6b3d', '#ff5d5d', '#ff9ed2', '#c084fc', '#63b3ff', '#67e8f9', '#5ce1c6', '#a7f36b', '#f7d154']);
    next.accent = pick(['#ffb545', '#ff6b3d', '#67e8f9', '#a7f36b', '#c084fc', '#f5efe4']);
    next.pattern = pick(['solid', 'split', 'dots', 'stripes', 'swirl', 'checker', 'stars', 'hazard']);
    next.texture = pick(['gloss', 'matte', 'pearl', 'grit']);
    next.eyes = pick(['round', 'wide', 'sleepy', 'visor', 'star', 'grumpy']);
    next.mouth = pick(['smile', 'grin', 'fangs', 'ooo', 'flat', 'zigzag']);
    next.glow = +rnd(0.05, 0.85).toFixed(2);
    next.squash = +rnd(0.1, 0.6).toFixed(2);
  }
  next.gadgets = [];
  const pool = [...unlocked];
  next.gadgets.push(pick(pool));
  if (Math.random() > 0.3) next.gadgets.push(pick(pool));
  if (Math.random() > 0.55) next.gadgets.push(pick(pool));
  next.mirror = Math.random() > 0.6;
  next.rotation = Math.round(rnd(-40, 40));
  next.resize = +rnd(0.85, 1.25).toFixed(2);
  return next;
}

export const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
