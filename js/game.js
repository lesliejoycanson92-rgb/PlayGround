/* BLOBSMITH — arena engine core: input, physics, effects, HUD. */

import { RIVALS, CORES, MOODS, MATERIALS } from './data.js';
import { computeBuild, buildLayouts } from './build.js';
import { drawBlob, alpha, lighten, darken } from './blob.js';
import { audio } from './audio.js';
import {
  W, H, CX, CY, TAU, dist, norm, rand, choose, clamp, fmtClock, ellipseTheta,
} from './constants.js';
import { modeMethods } from './modes.js';

const DASH_CD = 1.65;
const CORE_CD = 6.8;

function rivalFor(wins) {
  const poolSize = Math.min(RIVALS.length, 2 + Math.floor(wins / 2));
  return choose(RIVALS.slice(0, poolSize));
}

function diffFor(wins, mode) {
  const base = 0.9 + Math.min(0.24, wins * 0.022);
  return base + (mode === 'race' ? 0.04 : 0);
}

export class ArenaGame {
  constructor({ mode, canvas, build, save, onEnd, onQuit }) {
    this.mode = mode;
    window.__blobGame = this;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.build = build;
    this.save = save;
    this.onEnd = onEnd;
    this.onQuit = onQuit;

    this.dead = false;
    this.paused = false;
    this.started = false;
    this.ending = false;
    this.finished = false;
    this.finishTimer = 0;
    this.payload = null;
    this.countdown = 3.4;
    this.countDisplay = null;
    this.elapsed = 0;
    this.timeLeft = 0;
    this.timeLimit = 0;
    this.shake = 0;
    this.flash = 0;
    this.flashColor = '255,255,255';
    this.noticeTimer = 0;
    this.hudAcc = 0;
    this.sfxCd = 0;
    this.coreFlash = 0;

    this.keys = new Set();
    this.input = { x: 0, y: 0 };
    this.touchInput = { x: 0, y: 0 };
    this.aim = { x: CX, y: CY, active: false, t: -99 };

    this.balls = [];
    this.player = null;
    this.rival = null;
    this.bossBall = null;
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];
    this.shockwaves = [];
    this.zaps = [];
    this.coreBursts = [];
    this.telegraph = null;
    this.ringR = 300;
    this.score = 0;
    this.impact = 0;
    this.progress = 0;
    this.arenaT = 0;

    this.abort = new AbortController();
    this.boundFrame = this.frame.bind(this);

    this.hud = {
      mode: document.getElementById('hudMode'),
      objective: document.getElementById('hudObjective'),
      timer: document.getElementById('hudTimer'),
      sub: document.getElementById('hudSub'),
      notice: document.getElementById('hudNotice'),
      bossWrap: document.getElementById('bossBarWrap'),
      bossBar: document.getElementById('bossHpBar'),
      bossText: document.getElementById('bossHpText'),
      pilotHp: document.getElementById('pilotHp'),
      pilotStatus: document.getElementById('pilotStatus'),
      pilotName: document.getElementById('pilotName'),
      coreGlyph: document.getElementById('coreGlyph'),
      dashRing: document.getElementById('dashRing'),
      coreRing: document.getElementById('coreRing'),
      dashAbility: document.getElementById('dashAbility'),
      coreAbility: document.getElementById('coreAbility'),
      countdown: document.getElementById('countdownOverlay'),
      pauseOverlay: document.getElementById('pauseOverlay'),
      pauseBtn: document.getElementById('pauseBtn'),
      resumeBtn: document.getElementById('resumeBtn'),
      quitBtn: document.getElementById('quitBtn'),
      mobile: document.getElementById('mobileControls'),
      joystick: document.getElementById('joystick'),
      stick: document.getElementById('stick'),
      dashBtn: document.getElementById('dashBtn'),
      coreBtn: document.getElementById('coreBtn'),
    };

    this.hud.bossWrap.classList.add('hidden');
    this.hud.mobile.style.display = mode === 'showcase' ? 'none' : '';
    this.hud.notice.classList.remove('show');
    this.hud.notice.textContent = '';
    this.resize();
    this.bindInput();
    this.initMode();

    this.updateHud(true);
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame(this.boundFrame);
  }

  /* Large procedural backgrounds are expensive to rasterise every frame.
   * Render them once into offscreen layers and blit those instead. */
  makeBackdrop() {
    const { cw, ch, dpr } = this;
    if (!cw || !ch) return;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cw * dpr));
    canvas.height = Math.max(1, Math.round(ch * dpr));
    const bctx = canvas.getContext('2d');
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = bctx.createRadialGradient(cw / 2, ch * 0.44, 20, cw / 2, ch * 0.5, Math.max(cw, ch) * 0.8);
    bg.addColorStop(0, '#121821');
    bg.addColorStop(0.6, '#080b10');
    bg.addColorStop(1, '#05070a');
    bctx.fillStyle = bg;
    bctx.fillRect(0, 0, cw, ch);
    this.backdrop = canvas;
  }

  ensureArenaCache(t) {
    const { cw, ch, dpr, scale, ox, oy } = this;
    if (!cw || !ch) return;
    const key = `${this.mode}:${this.mode === 'sumo' ? Math.round(this.ringR / 6) : 'static'}:${cw}x${ch}@${dpr}`;
    if (this.arenaCanvas && this.arenaKey === key) return;
    if (!this.backdrop) this.makeBackdrop();
    const w = Math.max(1, Math.round(cw * dpr));
    const h = Math.max(1, Math.round(ch * dpr));
    if (!this.arenaCanvas || this.arenaCanvas.width !== w || this.arenaCanvas.height !== h) {
      this.arenaCanvas = document.createElement('canvas');
      this.arenaCanvas.width = w;
      this.arenaCanvas.height = h;
    }
    const actx = this.arenaCanvas.getContext('2d');
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.clearRect(0, 0, w, h);
    if (this.backdrop) actx.drawImage(this.backdrop, 0, 0, w, h);
    actx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    const proxy = Object.create(this);
    proxy.ctx = actx;
    proxy._cachePass = true;
    actx.save();
    proxy.drawArena(t);
    actx.restore();
    this.arenaKey = key;
  }

  /* ── lifecycle ─────────────────────────────────────────── */
  start() {
    this.showCountdown('3');
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.abort.abort();
    if (this.hud) {
      this.hud.mobile.style.display = '';
      this.hud.countdown.classList.add('hidden');
      this.hud.countdown.innerHTML = '<span></span>';
      this.hud.notice.classList.remove('show');
      this.hud.pauseOverlay.classList.add('hidden');
      this.hud.bossWrap.classList.add('hidden');
    }
    clearTimeout(this.noticeTimer);
  }

  resize() {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    // Software rasterisers choke on a full-resolution arena. Render at a
    // reduced internal resolution and let the browser upscale the stylised art.
    const dpr = 0.8;
    this.cw = cw;
    this.ch = ch;
    this.dpr = dpr;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    this.backdrop = null;
    const viewW = this.viewW || 960;
    const viewH = this.viewH || 780;
    this.scale = Math.min(cw / viewW, ch / viewH);
    this.ox = cw / 2 - CX * this.scale;
    this.oy = ch / 2 - CY * this.scale;
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.ox) / this.scale,
      y: (clientY - rect.top - this.oy) / this.scale,
    };
  }

  /* ── input ─────────────────────────────────────────────── */
  bindInput() {
    const signal = this.abort.signal;

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize, { signal });
    window.addEventListener('orientationchange', this.onResize, { signal });

    window.addEventListener('keydown', (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault();
      }
      this.keys.add(event.code);
      if (this.paused || !this.started || this.ending) return;
      if (event.repeat) return;
      if (event.code === 'Space') this.tryDash(this.player, this.getDashDir());
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.useCore(this.player);
    }, { signal });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    }, { signal });

    this.canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const p = this.screenToWorld(event.clientX, event.clientY);
      this.aim.x = p.x;
      this.aim.y = p.y;
      this.aim.active = true;
      this.aim.t = this.elapsed;
    }, { signal });

    this.hud.pauseBtn.addEventListener('click', () => this.togglePause(), { signal });
    this.hud.resumeBtn.addEventListener('click', () => this.togglePause(false), { signal });
    this.hud.quitBtn.addEventListener('click', () => { audio.click(); this.onQuit(); }, { signal });

    // touch joystick
    const joy = this.hud.joystick;
    const stick = this.hud.stick;
    let joyId = null;
    const moveJoy = (event) => {
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = event.clientX - cx;
      let dy = event.clientY - cy;
      const max = rect.width * 0.34;
      const d = Math.hypot(dx, dy);
      if (d > max) {
        dx = (dx / d) * max;
        dy = (dy / d) * max;
      }
      this.touchInput.x = dx / max;
      this.touchInput.y = dy / max;
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    joy.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      joyId = event.pointerId;
      joy.setPointerCapture(event.pointerId);
      moveJoy(event);
    }, { signal });
    joy.addEventListener('pointermove', (event) => {
      if (joyId === event.pointerId) moveJoy(event);
    }, { signal });
    const endJoy = (event) => {
      if (joyId !== event.pointerId) return;
      joyId = null;
      this.touchInput.x = 0;
      this.touchInput.y = 0;
      stick.style.transform = 'translate(0px, 0px)';
    };
    joy.addEventListener('pointerup', endJoy, { signal });
    joy.addEventListener('pointercancel', endJoy, { signal });

    this.hud.dashBtn.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (this.started && !this.ending) this.tryDash(this.player, this.getDashDir());
    }, { signal });
    this.hud.coreBtn.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (this.started && !this.ending) this.useCore(this.player);
    }, { signal });

    // hide touch controls if mouse is used on a hybrid device
    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && this.hud.mobile) this.hud.mobile.style.opacity = '0.55';
    }, { signal });
  }

  readInput() {
    if (this.ending || this.paused) { this.input.x = 0; this.input.y = 0; return; }
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (Math.abs(this.touchInput.x) > 0.08 || Math.abs(this.touchInput.y) > 0.08) {
      x = this.touchInput.x;
      y = this.touchInput.y;
    }
    const n = norm(x, y);
    this.input.x = n.x * Math.min(1, n.d);
    this.input.y = n.y * Math.min(1, n.d);
    this.input.mag = Math.min(1, n.d);
    this.player?.setInput?.(this.input.x, this.input.y);
  }

  getDashDir() {
    const p = this.player;
    if (!p) return { x: 1, y: 0 };
    const mouseRecent = this.aim.active && this.elapsed - this.aim.t < 3.5;
    if (mouseRecent) {
      const n = norm(this.aim.x - p.x, this.aim.y - p.y);
      if (n.d > 12) return { x: n.x, y: n.y };
    }
    if (this.input.mag > 0.15) {
      const n = norm(this.input.x, this.input.y);
      return { x: n.x, y: n.y };
    }
    return { x: Math.cos(p.facing || 0), y: Math.sin(p.facing || 0) };
  }

  /* ── ball factory ──────────────────────────────────────── */
  makeBall(config, build, { x, y, isPlayer = false, name, radius, hp = 100, boss = false } = {}) {
    const stats = build.phys;
    return {
      config,
      build,
      stats,
      layouts: buildLayouts(config),
      x, y,
      vx: 0, vy: 0,
      r: radius || stats.radius,
      mass: boss ? 30 : stats.mass,
      facing: 0,
      isPlayer,
      isBoss: boss,
      name: name || config.name,
      hp,
      maxHp: hp,
      stun: 0,
      slow: 0,
      burn: 0,
      hitFlash: 0,
      invuln: 0,
      dashCd: 0,
      dashTimer: 0,
      dashDir: { x: 1, y: 0 },
      grapple: 0,
      coreCd: 0,
      autoCd: rand(0.5, 1.6),
      trail: [],
      falling: false,
      fallT: 0,
      ai: {},
      inputX: 0,
      inputY: 0,
      hitCd: 0,
      boostCd: 0,
      progressAngle: 0,
      prevTheta: null,
      topSpeed: 0,
      damageDealt: 0,
    };
  }

  makeRivalBuild(config) {
    const b = computeBuild(config, { mass: 2, energy: 2, motor: 2, armor: 1, luck: 0 }, { ignoreBudget: true });
    const d = diffFor(this.save.stats.wins, this.mode);
    const stats = { ...b.phys };
    const playerPower = this.build?.phys?.damage || 20;
    stats.maxSpeed *= d;
    stats.accel *= d;
    // Keep rivals in the same damage band as the player; wins raise the ceiling.
    stats.damage = playerPower * (0.78 + Math.min(0.42, this.save.stats.wins * 0.028));
    stats.defense *= 1.02;
    return { ...b, phys: stats };
  }

  spawnRival() {
    const rival = rivalFor(this.save.stats.wins);
    const build = this.makeRivalBuild(rival.config);
    const ball = this.makeBall(rival.config, build, { x: CX + 150, y: CY, name: rival.name });
    ball.title = rival.title;
    return ball;
  }

  /* ── physics ───────────────────────────────────────────── */
  applyInput(ball, ix, iy, dt) {
    if (ball.falling) return;
    const stats = ball.stats;
    const controlled = ball.stun <= 0;
    const slowMul = ball.slow > 0 ? 0.52 : 1;
    if (controlled && (Math.abs(ix) > 0.01 || Math.abs(iy) > 0.01)) {
      const n = norm(ix, iy);
      const gripFactor = 0.82 + stats.control * 0.18;
      ball.vx += n.x * stats.accel * gripFactor * slowMul * dt;
      ball.vy += n.y * stats.accel * gripFactor * slowMul * dt;
      if (Math.hypot(ball.vx, ball.vy) > 10) ball.facing = Math.atan2(ball.vy, ball.vx);
    }
    if (ball.grapple > 0 && ball.dashDir) {
      ball.vx += ball.dashDir.x * stats.accel * 1.45 * dt;
      ball.vy += ball.dashDir.y * stats.accel * 1.45 * dt;
    }
    let drag = 1.9 - Math.min(0.7, stats.grip * 0.024);
    if (stats.gadgetTags?.has('hover')) drag *= 0.74;
    if (!controlled) drag = 0.35;
    const damp = Math.exp(-drag * dt);
    ball.vx *= damp;
    ball.vy *= damp;

    const maxS = stats.maxSpeed * slowMul * (ball.dashTimer > 0 ? 1.75 : 1) * (ball.stun > 0 ? 0.4 : 1);
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > maxS) {
      ball.vx = (ball.vx / speed) * maxS;
      ball.vy = (ball.vy / speed) * maxS;
    }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.topSpeed = Math.max(ball.topSpeed || 0, speed);

    if (speed > 30) {
      ball.trail.push({ x: ball.x, y: ball.y, life: 0.24, size: ball.r * 0.5 });
      if (ball.trail.length > 16) ball.trail.shift();
    }
  }

  stepBallTimers(ball, dt) {
    ball.stun = Math.max(0, ball.stun - dt);
    ball.slow = Math.max(0, ball.slow - dt);
    ball.burn = Math.max(0, ball.burn - dt);
    ball.hitFlash = Math.max(0, ball.hitFlash - dt);
    ball.invuln = Math.max(0, ball.invuln - dt);
    ball.dashCd = Math.max(0, ball.dashCd - dt);
    ball.dashTimer = Math.max(0, ball.dashTimer - dt);
    ball.grapple = Math.max(0, ball.grapple - dt);
    ball.coreCd = Math.max(0, ball.coreCd - dt);
    ball.autoCd = Math.max(0, ball.autoCd - dt);
    ball.hitCd = Math.max(0, ball.hitCd - dt);
    ball.boostCd = Math.max(0, ball.boostCd - dt);
    ball.trail.forEach((p) => { p.life -= dt; });
    ball.trail = ball.trail.filter((p) => p.life > 0);
  }

  stepBalls(dt) {
    for (const ball of this.balls) {
      if (ball.falling) {
        ball.fallT += dt;
        continue;
      }
      const ix = ball.isPlayer ? this.input.x : ball.inputX || 0;
      const iy = ball.isPlayer ? this.input.y : ball.inputY || 0;
      this.applyInput(ball, ix, iy, dt);
      this.constrainBall(ball, dt);
      this.stepBallTimers(ball, dt);
    }
  }

  /* ── actions ───────────────────────────────────────────── */
  tryDash(ball, dir) {
    if (!ball || ball.dashCd > 0 || ball.stun > 0 || ball.falling || this.ending || !this.started) return false;
    const n = norm(dir?.x || 0, dir?.y || 0);
    if (n.d === 0) return false;
    ball.dashDir = { x: n.x, y: n.y };
    ball.vx += n.x * ball.stats.dash * 1.28;
    ball.vy += n.y * ball.stats.dash * 1.28;
    ball.dashCd = DASH_CD;
    ball.dashTimer = 0.34;
    ball.invuln = Math.max(ball.invuln, 0.14);
    ball.facing = Math.atan2(n.y, n.x);
    if (ball.stats.gadgetTags?.has('grapple')) ball.grapple = 0.32;
    this.spawnBurst(ball.x - n.x * ball.r * 0.6, ball.y - n.y * ball.r * 0.6, ball.config.accent, 11, 160);
    this.spawnBurst(ball.x, ball.y, ball.config.color, 5, 90);
    if (ball.isPlayer) audio.dash();
    return true;
  }

  useCore(ball) {
    if (!ball || ball.coreCd > 0 || ball.stun > 0 || ball.falling || this.ending || !this.started) return;
    ball.coreCd = CORE_CD;
    const core = ball.config.core;
    const color = CORES[core]?.color || '#ffb545';
    audio.core(core);
    this.coreFlash = 0.45;
    this.coreBursts.push({ x: ball.x, y: ball.y, r: 20, max: 260, color, life: 0.6, maxLife: 0.6 });
    this.spawnBurst(ball.x, ball.y, color, 30, 260);
    this.shake = Math.max(this.shake, 7);

    const targets = this.coreTargets(ball);
    for (const target of targets) {
      const d = dist(ball, target);
      if (core === 'fire') {
        if (d < 250) {
          this.knockback(target, ball.x, ball.y, 310 / target.stats.defense);
          target.burn = 2.4;
          this.damageTarget(target, 10, ball, color);
          this.spawnBurst(target.x, target.y, '#ff8a4c', 18, 200);
        }
      } else if (core === 'ice') {
        if (d < 280) {
          target.slow = 3.2;
          target.stun = Math.max(target.stun, 0.12);
          this.damageTarget(target, 4, ball, color);
          this.spawnBurst(target.x, target.y, '#9be7ff', 22, 130);
        }
      } else if (core === 'zap') {
        if (d < 480) {
          this.zaps.push({ x1: ball.x, y1: ball.y, x2: target.x, y2: target.y, life: 0.35, color });
          target.stun = Math.max(target.stun, 0.55);
          this.knockback(target, ball.x, ball.y, 180 / target.stats.defense);
          this.damageTarget(target, 13, ball, color);
          this.addDamage(target.x, target.y - target.r, 'ZAP', color, 13);
        }
      } else if (core === 'gravity') {
        if (d < 460) {
          this.pullTowards(target, ball.x, ball.y, 420);
          this.damageTarget(target, 6, ball, color);
          this.spawnBurst(target.x, target.y, '#8b5cf6', 15, 80);
        }
      }
    }

    if (core === 'gravity') {
      this.coreBursts.push({ x: ball.x, y: ball.y, r: 30, max: 430, color, life: 0.8, maxLife: 0.8, reverse: true });
      this.shockwaves.push({ x: ball.x, y: ball.y, r: 20, max: 420, speed: 620, hit: true, color, thin: true });
    }
    if (ball.isPlayer) this.showNotice(CORES[core].abilityName.toUpperCase(), color, 750);
    else if (this.mode === 'sumo') this.showNotice(`${ball.name} USED ${CORES[core].abilityName.toUpperCase()}`, color, 750);
  }

  coreTargets(source) {
    const list = [];
    for (const b of this.balls) {
      if (b !== source && !b.falling) list.push(b);
    }
    if (this.bossBall && !this.bossBall.dead && source !== this.bossBall) list.push(this.bossBall);
    return list;
  }

  damageTarget(target, amount, source, color = '#ffb545') {
    if (!target) return;
    if (target.isBoss) {
      const dealt = amount;
      target.hp = Math.max(0, target.hp - dealt);
      target.hitFlash = 0.18;
      this.addDamage(target.x + rand(-20, 20), target.y - target.r * 0.4, Math.round(dealt), color, 14);
      if (this.player) this.player.damageDealt = (this.player.damageDealt || 0) + dealt;
      return;
    }
    if (target.invuln > 0) return;
    if (this.mode === 'race') {
      target.slow = Math.max(target.slow, 0.4);
      return;
    }
    target.hp = Math.max(0, target.hp - amount / Math.max(0.6, target.stats.defense));
    target.hitFlash = 0.18;
    this.addDamage(target.x, target.y - target.r, `-${Math.round(amount)}`, color, 12);
  }

  knockback(ball, fromX, fromY, force) {
    const n = norm(ball.x - fromX, ball.y - fromY);
    ball.vx += n.x * force;
    ball.vy += n.y * force;
  }

  pullTowards(ball, x, y, force) {
    const n = norm(x - ball.x, y - ball.y);
    ball.vx += n.x * force;
    ball.vy += n.y * force;
  }

  /* ── collisions ────────────────────────────────────────── */
  collideBalls(a, b) {
    if (!a || !b || a.falling || b.falling) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const minD = a.r + b.r;
    if (d >= minD || d < 0.001) return;
    const nx = dx / d;
    const ny = dy / d;
    const overlap = minD - d;
    const total = a.mass + b.mass;
    a.x -= nx * overlap * (b.mass / total);
    a.y -= ny * overlap * (b.mass / total);
    b.x += nx * overlap * (a.mass / total);
    b.y += ny * overlap * (a.mass / total);

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const velN = rvx * nx + rvy * ny;
    if (velN < 0) {
      const e = clamp((a.stats.bounce + b.stats.bounce) * 0.6, 0.12, 0.95);
      const j = (-(1 + e) * velN) / (1 / a.mass + 1 / b.mass);
      a.vx -= (j * nx) / a.mass;
      a.vy -= (j * ny) / a.mass;
      b.vx += (j * nx) / b.mass;
      b.vy += (j * ny) / b.mass;
    }
    const impact = -velN;
    if (impact > 55) {
      const scale = this.mode === 'race' ? 0.3 : 1;
      const shove = (attacker, defender) => (
        (attacker.stats.damage * 0.9 + attacker.mass * 0.6)
        * (0.55 + impact / 300)
        * (attacker.dashTimer > 0 ? 1.45 : 1)
        * (10 / Math.max(5, defender.mass))
        * 1.8 * scale
      );
      const pushB = shove(a, b);
      const pushA = shove(b, a);
      b.vx += nx * pushB;
      b.vy += ny * pushB;
      a.vx -= nx * pushA;
      a.vy -= ny * pushA;
      if (a.stats.gadgetTags?.has('thorns')) this.knockback(b, a.x, a.y, pushB * 0.22);
      if (b.stats.gadgetTags?.has('thorns')) this.knockback(a, b.x, b.y, pushA * 0.22);
      a.stun = Math.max(a.stun, 0.08);
      b.stun = Math.max(b.stun, 0.08);
      a.hitFlash = 0.13;
      b.hitFlash = 0.13;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      this.spawnBurst(mx, my, '#fff0cf', 10 + Math.min(14, impact / 40), 140 + impact * 0.4);
      this.shake = Math.max(this.shake, Math.min(12, impact / 35));
      if (this.mode === 'sumo') {
        this.impact += impact;
        this.score += impact / 10;
        if (impact > 160) this.addDamage(mx, my - 20, impact > 320 ? 'KRAK!' : 'WHAM', '#ffd38a', 15);
      }
      if (this.sfxCd <= 0) {
        audio.bump(clamp(impact / 220, 0.4, 1.8));
        this.sfxCd = 0.09;
      }
    }
  }

  /* ── projectiles ───────────────────────────────────────── */
  fireProjectile(owner, target, { damage, color, speed = 420, radius = 7, boss = false } = {}) {
    if (!target) return;
    const n = norm(target.x - owner.x, target.y - owner.y);
    if (n.d === 0) return;
    this.projectiles.push({
      x: owner.x + n.x * owner.r,
      y: owner.y + n.y * owner.r,
      vx: n.x * speed,
      vy: n.y * speed,
      r: radius,
      life: 2.6,
      color: color || owner.config.accent,
      owner,
      damage: damage ?? owner.stats.damage * 0.55,
      boss,
      trail: [],
    });
    this.spawnBurst(owner.x + n.x * owner.r, owner.y + n.y * owner.r, color || owner.config.accent, 6, 70);
    if (owner.isPlayer) audio.tone({ freq: 680, dur: 0.08, type: 'square', gain: 0.03, slide: -220 });
  }

  autoFire(ball, target) {
    if (!ball || !target || target.dead || ball.falling) return;
    if (!ball.stats.gadgetTags?.has('projectile')) return;
    if (ball.autoCd > 0) return;
    ball.autoCd = 1.82 - Math.min(0.4, ball.stats.control * 0.08);
    this.fireProjectile(ball, target, { damage: ball.stats.damage * 0.7 });
  }

  updateProjectiles(dt) {
    const alive = [];
    for (const p of this.projectiles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.trail.push({ x: p.x, y: p.y, life: 0.18 });
      if (p.trail.length > 8) p.trail.shift();
      p.trail.forEach((t) => { t.life -= dt; });

      let hit = false;
      if (p.boss) {
        if (this.player && !this.player.falling && dist(p, this.player) < p.r + this.player.r) {
          if (this.player.invuln <= 0) {
            this.player.hp = Math.max(0, this.player.hp - p.damage / Math.max(0.7, this.player.stats.defense));
            this.player.hitFlash = 0.2;
            this.player.invuln = 0.3;
            this.addDamage(this.player.x, this.player.y - this.player.r, `-${Math.round(p.damage)}`, '#ff8f86', 13);
            this.spawnBurst(p.x, p.y, p.color, 16, 200);
            this.shake = Math.max(this.shake, 5);
            audio.hit(1);
          }
          hit = true;
        }
      } else {
        for (const b of this.balls) {
          if (!b || b === p.owner || b.falling) continue;
          if (dist(p, b) < p.r + b.r) {
            this.applyProjectileHit(p, b);
            hit = true;
            break;
          }
        }
        if (!hit && this.bossBall && !this.bossBall.dead && dist(p, this.bossBall) < p.r + this.bossBall.r) {
          this.applyProjectileHit(p, this.bossBall);
          hit = true;
        }
      }
      if (!hit && (p.x < -100 || p.x > W + 100 || p.y < -100 || p.y > H + 100)) hit = true;
      if (p.life > 0 && !hit) alive.push(p);
    }
    this.projectiles = alive;
  }

  applyProjectileHit(p, target) {
    if (target.isBoss) {
      this.damageTarget(target, p.damage, p.owner, p.color);
      this.spawnBurst(p.x, p.y, p.color, 12, 160);
      this.addDamage(p.x, p.y - 14, `${Math.round(p.damage)}`, p.color, 12);
      audio.hit(0.6);
      return;
    }
    if (this.mode === 'sumo') {
      const n = norm(p.vx, p.vy);
      target.vx += n.x * (110 + p.owner.stats.damage * 4);
      target.vy += n.y * (110 + p.owner.stats.damage * 4);
      this.impact += 50;
      this.score += 5;
      if (this.mode === 'race') target.slow = 0.6;
    } else {
      target.slow = Math.max(target.slow, 0.6);
      this.knockback(target, p.x, p.y, 90 / target.stats.defense);
    }
    target.hitFlash = 0.16;
    this.spawnBurst(p.x, p.y, p.color, 14, 170);
    this.addDamage(p.x, p.y - 12, 'PLINK', p.color, 10);
    audio.hit(0.45);
  }

  /* ── effects ───────────────────────────────────────────── */
  spawnBurst(x, y, color, count = 12, power = 180) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * TAU;
      const s = rand(0.25, 1) * power;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.28, 0.8),
        maxLife: 0.8,
        size: rand(1.6, 4.8),
        color,
        drag: 2.4,
        kind: Math.random() > 0.7 ? 'spark' : 'dot',
      });
    }
    if (this.particles.length > 700) this.particles.splice(0, this.particles.length - 700);
  }

  addDamage(x, y, text, color = '#f7f2e8', size = 12) {
    this.damageNumbers.push({ x, y, text, color, size, life: 0.85, maxLife: 0.85, vy: -55 });
    if (this.damageNumbers.length > 20) this.damageNumbers.shift();
  }

  updateEffects(dt) {
    this.coreFlash = Math.max(0, this.coreFlash - dt);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.shake *= 0.9;
    this.sfxCd = Math.max(0, this.sfxCd - dt);

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-p.drag * dt);
      p.vy *= Math.exp(-p.drag * dt);
      if (p.kind === 'spark') p.size *= 0.98;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const d of this.damageNumbers) {
      d.life -= dt;
      d.y += d.vy * dt;
      d.vy *= 0.96;
    }
    this.damageNumbers = this.damageNumbers.filter((d) => d.life > 0);

    for (const w of this.shockwaves) {
      w.r += w.speed * dt;
      w.life -= dt;
    }
    this.shockwaves = this.shockwaves.filter((w) => w.r < w.max && w.life > 0);

    for (const z of this.zaps) z.life -= dt;
    this.zaps = this.zaps.filter((z) => z.life > 0);

    for (const b of this.coreBursts) {
      b.life -= dt;
      b.r += ((b.reverse ? b.max - b.r : b.r) * 3 + 160) * dt;
    }
    this.coreBursts = this.coreBursts.filter((b) => b.life > 0);
  }

  /* ── outcome ───────────────────────────────────────────── */
  queueFinish(payload, delay = 0) {
    if (this.ending) return;
    this.ending = true;
    this.payload = payload;
    this.finishTimer = delay;
    if (delay <= 0) {
      this.finished = true;
      this.ending = false;
      this.onEnd?.(payload);
    }
  }

  showNotice(text, color = '#f7f2e8', duration = 1200) {
    const el = this.hud.notice;
    if (!el) return;
    clearTimeout(this.noticeTimer);
    el.textContent = text;
    el.style.color = color;
    el.classList.remove('show', 'pop');
    void el.offsetWidth;
    el.classList.add('show', 'pop');
    this.noticeTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  showCountdown(text) {
    const overlay = this.hud.countdown;
    overlay.innerHTML = `<span>${text}</span>`;
    overlay.classList.remove('hidden');
  }

  togglePause(force) {
    if (this.ending || this.finished || !this.started) return;
    const next = force === undefined ? !this.paused : force;
    if (next === this.paused) return;
    this.paused = next;
    if (!this.paused) { this.acc = 0; this.last = performance.now(); }
    this.hud.pauseOverlay.classList.toggle('hidden', !this.paused);
    audio.click();
    if (this.paused) audio.tone({ freq: 300, dur: 0.15, type: 'sine', gain: 0.06, slide: -100 });
  }

  /* ── HUD ───────────────────────────────────────────────── */
  updateHud(force = false) {
    this.hudAcc += 0.016;
    if (!force && this.hudAcc < 0.07) return;
    this.hudAcc = 0;

    const h = this.hud;
    if (this.mode === 'showcase') {
      h.timer.textContent = '★';
    } else {
      h.timer.textContent = String(Math.ceil(this.timeLeft));
    }

    if (this.player) {
      const dashPct = this.player.dashCd <= 0 ? 0 : this.player.dashCd / DASH_CD;
      const corePct = this.player.coreCd <= 0 ? 0 : this.player.coreCd / CORE_CD;
      if (h.dashRing) h.dashRing.style.strokeDashoffset = String(113 * dashPct);
      if (h.coreRing) h.coreRing.style.strokeDashoffset = String(113 * corePct);
      h.dashAbility.classList.toggle('ready', this.player.dashCd <= 0);
      h.coreAbility.classList.toggle('ready', this.player.coreCd <= 0);
      const hpRatio = this.player.maxHp ? this.player.hp / this.player.maxHp : 1;
      h.pilotHp.style.width = `${clamp(hpRatio * 100, 0, 100)}%`;
      h.pilotHp.style.background = hpRatio < 0.35
        ? 'linear-gradient(90deg,#ff5d5d,#ff9d7a)'
        : 'linear-gradient(90deg,var(--teal),#a7f3e0)';
      if (this.player.hp <= 0 || (this.mode === 'sumo' && this.player.falling)) h.pilotStatus.textContent = 'BALL LOST';
      else if (this.player.hp < this.player.maxHp * 0.35 && this.mode === 'boss') h.pilotStatus.textContent = 'CRITICAL · KEEP MOVING';
      else if (this.player.coreCd <= 0) h.pilotStatus.textContent = `${CORES[this.player.config.core].abilityName.toUpperCase()} READY`;
      else if (this.player.dashCd <= 0) h.pilotStatus.textContent = 'DASH READY';
      else h.pilotStatus.textContent = 'RECOVERING';
      h.coreGlyph.textContent = CORES[this.player.config.core].icon;
    }

    if (this.mode === 'boss' && this.bossBall) {
      const ratio = this.bossBall.hp / this.bossBall.maxHp;
      h.bossWrap.classList.remove('hidden');
      h.bossBar.style.width = `${ratio * 100}%`;
      h.bossText.textContent = `${Math.ceil(ratio * 100)}%`;
    } else {
      h.bossWrap.classList.add('hidden');
    }

    if (this.mode === 'sumo') {
      h.sub.textContent = `RING ${Math.round(this.ringR)} · IMPACT ${Math.round(this.score)} · LUCK ×${this.player.stats.luck.toFixed(1)}`;
    } else if (this.mode === 'race') {
      const lap = Math.min(2, Math.floor(this.player.progressAngle / TAU) + 1);
      const pos = this.player.progressAngle >= (this.rival?.progressAngle || 0) ? '1ST' : '2ND';
      h.sub.textContent = `LAP ${lap}/2 · ${pos} · ${fmtClock(this.elapsed)}`;
    } else if (this.mode === 'boss') {
      h.sub.textContent = `PHASE ${this.bossBall && this.bossBall.hp < this.bossBall.maxHp * 0.5 ? '2' : '1'} · WARDEN CORE EXPOSED`;
    } else {
      h.sub.textContent = `LIVE LOBBY · 5 SMITHS · CROWD VOTE IN PROGRESS`;
    }
  }

  /* ── main loop ─────────────────────────────────────────── */
  frame(now) {
    if (this.dead) return;
    const raw = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    this.arenaT += raw;
    if (!this.paused) {
      // Fixed-step simulation keeps the match real-time even when the
      // software renderer is running at a low frame rate.
      const STEP = 1 / 60;
      this.acc = Math.min(0.35, this.acc + raw);
      let steps = Math.min(21, Math.floor(this.acc / STEP));
      while (steps > 0) {
        this.update(STEP);
        this.acc -= STEP;
        steps -= 1;
      }
    } else {
      this.updateEffects(raw * 0.15);
    }
    this.render(now / 1000);
    this.raf = requestAnimationFrame(this.boundFrame);
  }

  update(dt) {
    // countdown
    if (!this.started) {
      this.countdown -= dt;
      if (this.countdown > 0) {
        const n = Math.ceil(this.countdown);
        if (n !== this.countDisplay) {
          this.countDisplay = n;
          this.showCountdown(String(n));
        }
        this.updateEffects(dt);
        return;
      }
      this.started = true;
      this.hud.countdown.classList.add('hidden');
      this.showNotice('ROLL!', '#ffb545', 700);
      audio.tone({ freq: 520, dur: 0.18, type: 'triangle', gain: 0.1, slide: 220 });
      this.updateHud(true);
    }

    if (this.finished) {
      this.updateEffects(dt);
      return;
    }

    if (this.ending) {
      this.finishTimer -= dt;
      this.updateEffects(dt);
      if (this.finishTimer <= 0 && !this.finished) {
        this.finished = true;
        this.ending = false;
        this.onEnd?.(this.payload);
      }
      return;
    }

    this.elapsed += dt;
    if (this.timeLimit > 0) this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.readInput();

    if (this.mode === 'sumo') this.updateSumo(dt);
    else if (this.mode === 'race') this.updateRace(dt);
    else if (this.mode === 'boss') this.updateBoss(dt);
    else if (this.mode === 'showcase') this.updateShowcase(dt);

    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.updateHud();
  }

  /* ── rendering ─────────────────────────────────────────── */
  render(t) {
    const ctx = this.ctx;
    const { cw, ch, dpr } = this;
    if (!cw) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ensureArenaCache(t);
    if (this.arenaCanvas) ctx.drawImage(this.arenaCanvas, 0, 0, cw, ch);
    else { ctx.fillStyle = '#080b10'; ctx.fillRect(0, 0, cw, ch); }

    const sx = this.shake > 0.1 ? rand(-this.shake, this.shake) : 0;
    const sy = this.shake > 0.1 ? rand(-this.shake, this.shake) : 0;
    ctx.save();
    ctx.translate(this.ox + sx, this.oy + sy);
    ctx.scale(this.scale, this.scale);

    this.drawArenaLive(t);
    if (this.drawUnder) this.drawUnder(t);

    const entities = [...this.balls];
    if (this.bossBall && !this.bossBall.dead) entities.push(this.bossBall);
    entities.sort((a, b) => a.y - b.y);
    for (const ball of entities) this.drawBallEntity(ball, t);

    this.drawProjectiles(t);
    this.drawShockwaves(t);
    this.drawZaps(t);
    this.drawParticles();
    this.drawDamageNumbers();
    if (this.drawOver) this.drawOver(t);

    ctx.restore();

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(${this.flashColor},${Math.min(0.5, this.flash * 0.4)})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  drawBallEntity(ball, t) {
    if (!ball) return;
    const ctx = this.ctx;
    const fall = ball.falling ? Math.min(1, ball.fallT / 0.75) : 0;
    const opacity = ball.isBoss ? 1 : 1 - fall * 0.85;
    const speed = Math.hypot(ball.vx, ball.vy);
    const look = norm(ball.vx || Math.cos(ball.facing), ball.vy || Math.sin(ball.facing));
    const face = speed > 20 ? { x: look.x, y: look.y } : { x: Math.cos(ball.facing || 0) * 0.35, y: Math.sin(ball.facing || 0) * 0.35 };
    const dashes = ball.dashTimer > 0;

    // trail
    for (const p of ball.trail) {
      ctx.fillStyle = alpha(ball.config.color, (p.life / 0.24) * 0.12);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / 0.24), 0, TAU);
      ctx.fill();
    }

    if (ball.slow > 0) {
      ctx.strokeStyle = 'rgba(155,231,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r * 1.17, t * 2, t * 2 + 4.2);
      ctx.stroke();
    }
    if (ball.burn > 0) {
      ctx.strokeStyle = 'rgba(255,138,76,0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r * 1.13, -t * 2.5, -t * 2.5 + 3.4);
      ctx.stroke();
    }
    if (ball.stats.gadgetTags?.has('shield')) {
      ctx.strokeStyle = 'rgba(103,232,249,0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r * 1.28, 0, TAU);
      ctx.stroke();
    }

    ctx.save();
    if (fall > 0) {
      ctx.translate(0, fall * 30);
      const sc = 1 - fall * 0.55;
      ctx.translate(ball.x, ball.y);
      ctx.scale(sc, sc);
      ctx.translate(-ball.x, -ball.y);
    }

    drawBlob(ctx, {
      x: ball.x,
      y: ball.y,
      r: ball.r,
      config: ball.config,
      t,
      face,
      layouts: ball.layouts,
      expression: ball.hitFlash > 0.03 ? 'hit' : null,
      glow: dashes ? 0.55 : 0,
      squashDir: speed > 40 ? Math.atan2(ball.vy, ball.vx) : null,
      speedRatio: clamp(speed / Math.max(60, ball.stats.maxSpeed), 0, 1),
      alpha: ball.isBoss ? 1 : Math.max(0, opacity),
    });

    if (ball.hitFlash > 0.03) {
      ctx.globalAlpha = ball.hitFlash * 3;
      ctx.fillStyle = '#fff6e4';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // labels
    if (!ball.falling) {
      const label = ball.isBoss ? 'WARDEN MK-IV' : ball.isPlayer ? 'YOU' : ball.name;
      const col = ball.isBoss ? '#ff8f86' : ball.isPlayer ? '#ffb545' : 'rgba(247,242,232,0.66)';
      ctx.save();
      ctx.font = `700 ${ball.isBoss ? 11 : 9}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = col;
      ctx.fillText(label, ball.x, ball.y - ball.r - 14);
      if (ball.isPlayer) {
        const bob = Math.sin(t * 4) * 2;
        ctx.fillStyle = '#ffb545';
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y - ball.r - 30 + bob);
        ctx.lineTo(ball.x - 5, ball.y - ball.r - 38 + bob);
        ctx.lineTo(ball.x + 5, ball.y - ball.r - 38 + bob);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (fall > 0.05) {
      ctx.strokeStyle = `rgba(255,93,93,${fall * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r * (1 + fall), 0, TAU);
      ctx.stroke();
    }
  }

  drawProjectiles(t) {
    const ctx = this.ctx;
    for (const p of this.projectiles) {
      for (const tr of p.trail) {
        ctx.fillStyle = alpha(p.color.startsWith('#') ? p.color : '#f7f2e8', (tr.life / 0.18) * 0.22);
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, p.r * 0.8, 0, TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.35, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawShockwaves(t) {
    const ctx = this.ctx;
    for (const w of this.shockwaves) {
      const k = 1 - w.r / w.max;
      ctx.strokeStyle = alpha(w.color || '#ff8a4c', Math.max(0, k) * 0.6);
      ctx.lineWidth = w.thin ? 2 : 6 * k + 1;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, TAU);
      ctx.stroke();
    }
    for (const b of this.coreBursts) {
      const k = b.life / b.maxLife;
      ctx.strokeStyle = alpha(b.color, k * 0.55);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.stroke();
    }
  }

  drawZaps(t) {
    const ctx = this.ctx;
    for (const z of this.zaps) {
      ctx.strokeStyle = alpha(z.color, (z.life / 0.35) * 0.9);
      ctx.lineWidth = 2.5;
      ctx.shadowColor = z.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      const steps = 7;
      for (let i = 0; i <= steps; i += 1) {
        const p = i / steps;
        const jitter = i === 0 || i === steps ? 0 : rand(-16, 16);
        const x = z.x1 + (z.x2 - z.x1) * p + jitter;
        const y = z.y1 + (z.y2 - z.y1) * p + rand(-16, 16);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const k = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = alpha(p.color.startsWith('#') ? p.color : '#f7f2e8', k);
      if (p.kind === 'spark') {
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size * 2, p.size * 0.8);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k, 0, TAU);
        ctx.fill();
      }
    }
  }

  drawDamageNumbers() {
    const ctx = this.ctx;
    for (const d of this.damageNumbers) {
      const k = d.life / d.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.font = `800 ${d.size}px 'Bricolage Grotesque', sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(8,11,16,0.75)';
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    }
  }
}

Object.assign(ArenaGame.prototype, modeMethods);
