/* Arena modes: setup, AI, rules, and mode-specific physics. */

import { RIVALS, GADGET_MAP, MOODS } from './data.js';
import { computeBuild, buildLayouts } from './build.js';
import { alpha, drawBlob } from './blob.js';
import { audio } from './audio.js';
import {
  CX, CY, TAU, dist, norm, rand, choose, clamp, fmtClock,
  RACE, ellipseTheta, ellipsePoint, CHAT, CROWD,
} from './constants.js';
import { drawSumoArena, drawRaceArena, drawBossArena, drawShowcaseArena } from './arena-art.js';

const T_PI = Math.PI;
const TWO_LAPS = TAU * 2 * 2;

export const modeMethods = {
  initMode() {
    this.balls = [];
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];
    this.shockwaves = [];
    this.zaps = [];
    this.coreBursts = [];
    this.ringR = 300;
    this.arenaT = 0;

    if (this.mode === 'sumo') this.initSumo();
    else if (this.mode === 'race') this.initRace();
    else if (this.mode === 'boss') this.initBoss();
    else this.initShowcase();
  },

  /* ══ SUMO ══════════════════════════════════════════════════ */
  initSumo() {
    this.viewW = 840;
    this.viewH = 790;
    this.resize();
    this.timeLimit = 75;
    this.timeLeft = 75;
    this.ringR = 320;
    this.hud.mode.textContent = 'SUMO RING · ARENA 01';

    this.player = this.makeBall(this.save.config, this.build, {
      x: CX - 165, y: CY, isPlayer: true, name: this.save.config.name,
    });
    this.player.hp = this.player.maxHp = 100;
    this.rival = this.spawnRival();
    this.rival.x = CX + 165;
    this.rival.y = CY;
    this.rival.facing = Math.PI;
    this.rival.stats = { ...this.rival.stats };
    this.rival.mass *= 1;
    this.bossBall = null;
    this.balls = [this.player, this.rival];
    this.aim.x = CX + 400;
    this.aim.y = CY;
    this.hud.objective.textContent = `SHOVE ${this.rival.name} OUT`;
  },

  updateSumo(dt) {
    // ring slowly tightens after 35 seconds
    this.ringR = 320 - Math.max(0, this.elapsed - 35) * 0.6;
    this.ringR = Math.max(275, this.ringR);

    this.aiSumo(dt);
    this.stepBalls(dt);
    this.collideBalls(this.player, this.rival);
    this.autoFire(this.player, this.rival);
    this.autoFire(this.rival, this.player);

    if (this.ending) return;

    const pd = Math.hypot(this.player.x - CX, this.player.y - CY);
    const rd = Math.hypot(this.rival.x - CX, this.rival.y - CY);
    const pOut = pd > this.ringR + this.player.r * 0.35;
    const rOut = rd > this.ringR + this.rival.r * 0.35;

    if (pOut || rOut) {
      const win = !pOut && rOut ? true : pOut && !rOut ? false : rd < pd;
      const fallen = [];
      if (pOut) { this.player.falling = true; fallen.push(this.player); }
      if (rOut) { this.rival.falling = true; fallen.push(this.rival); }
      this.launchFall(fallen);
      audio.ringout();
      this.shake = 16;
      this.showNotice(win ? 'RING OUT!' : 'YOU FELL', win ? '#ffb545' : '#ff8f86', 1400);
      this.queueFinish({
        mode: 'sumo',
        win,
        score: Math.round(this.impact),
        time: this.elapsed,
        playerHp: 100,
        bestScore: Math.round(this.impact),
      }, 1.15);
      return;
    }

    if (this.timeLeft <= 0) {
      const win = pd < rd;
      this.showNotice(win ? 'TIME! CLOSER TO CENTRE' : 'TIME! PUSHED OUT', win ? '#ffb545' : '#ff8f86', 1500);
      this.queueFinish({
        mode: 'sumo', win, score: Math.round(this.impact), time: this.elapsed, playerHp: 100,
        bestScore: Math.round(this.impact),
      }, 1.0);
    }
  },

  launchFall(balls) {
    for (const ball of balls) {
      this.spawnBurst(ball.x, ball.y, ball.config.color, 34, 320);
      this.spawnBurst(ball.x, ball.y, '#ffb545', 12, 380);
    }
  },

  aiSumo(dt) {
    const r = this.rival;
    const p = this.player;
    if (!r || !p || r.falling) {
      if (r) { r.inputX = 0; r.inputY = 0; }
      return;
    }
    if (r.stun > 0) { r.inputX = 0; r.inputY = 0; return; }

    const d = dist(r, p);
    const rd = Math.hypot(r.x - CX, r.y - CY);
    const outward = norm(p.x - CX, p.y - CY);
    const flank = {
      x: p.x - outward.x * (p.r + r.r + 46),
      y: p.y - outward.y * (p.r + r.r + 46),
    };
    let targetX = flank.x;
    let targetY = flank.y;

    if (rd > this.ringR - 72) { targetX = CX; targetY = CY; }
    else if (d < r.r + p.r + 34) { targetX = p.x; targetY = p.y; }

    // veterans read incoming dashes; rookies eat them
    if (this.save.stats.wins >= 2 && p.dashTimer > 0.05 && d < 240) {
      const perp = { x: -(p.y - r.y), y: p.x - r.x };
      const n = norm(perp.x, perp.y);
      const side = (r.x - CX) * n.x + (r.y - CY) * n.y > 0 ? -1 : 1;
      targetX = r.x + n.x * side * 180;
      targetY = r.y + n.y * side * 180;
    }

    // a little crowd-pleasing jitter
    r.ai.wander = (r.ai.wander || 0) - dt;
    if (r.ai.wander <= 0) {
      r.ai.wander = rand(0.7, 1.6);
      r.ai.offX = rand(-30, 30);
      r.ai.offY = rand(-30, 30);
    }
    targetX += r.ai.offX || 0;
    targetY += r.ai.offY || 0;

    const dx = targetX - r.x;
    const dy = targetY - r.y;
    const n = norm(dx, dy);
    // steer away from rim
    let edgeX = 0;
    let edgeY = 0;
    if (rd > this.ringR - 100) {
      const e = norm(CX - r.x, CY - r.y);
      edgeX = e.x * 1.4;
      edgeY = e.y * 1.4;
    }
    const steer = norm(n.x + edgeX, n.y + edgeY);
    r.inputX = steer.x;
    r.inputY = steer.y;

    const aligned = norm(p.x - r.x, p.y - r.y);
    const rimward = (p.x - CX) * aligned.x + (p.y - CY) * aligned.y;
    if (this.elapsed > 1.5 && r.dashCd <= 0 && d < 220 && rimward > -20 && Math.random() < dt * (0.38 + this.save.stats.wins * 0.035)) {
      this.tryDash(r, aligned);
    }
    if (r.coreCd <= 0 && d < 200 && Math.random() < dt * 0.4) this.useCore(r);
  },

  /* ══ RACE ══════════════════════════════════════════════════ */
  initRace() {
    this.viewW = 1130;
    this.viewH = 790;
    this.resize();
    this.timeLimit = 100;
    this.timeLeft = 100;
    this.hud.mode.textContent = 'OBSTACLE RACE · ARENA 02';

    this.player = this.makeBall(this.save.config, this.build, {
      x: CX - 46, y: CY - RACE.midB + 10, isPlayer: true, name: this.save.config.name,
    });
    this.player.hp = this.player.maxHp = 100;
    this.rival = this.spawnRival();
    this.rival.x = CX + 46;
    this.rival.y = CY - RACE.midB + 10;
    this.rival.stats.maxSpeed *= 1.02;
    this.bossBall = null;
    this.balls = [this.player, this.rival];

    this.obstacles = [45, 135, 225, 315].map((deg, i) => {
      const p = ellipsePoint(RACE.midA, RACE.midB, (deg * Math.PI) / 180);
      return { x: p.x, y: p.y, r: 23, angle: (i * 1.7) };
    });
    this.boostPads = [22, 112, 202, 292].map((deg) => ({
      ...ellipsePoint(RACE.midA, RACE.midB, (deg * Math.PI) / 180),
      angle: (deg * Math.PI) / 180,
    }));
    for (const ball of this.balls) {
      ball.prevTheta = ellipseTheta(ball.x, ball.y);
      ball.progressAngle = 0;
    }
    this.aim.x = CX + 300;
    this.aim.y = CY - RACE.midB;
    this.hud.objective.textContent = 'FINISH TWO LAPS FIRST';
    this.racePlace = 1;
  },

  updateRace(dt) {
    this.aiRace(dt);
    this.stepBalls(dt);
    this.collideBalls(this.player, this.rival);
    if (this.rival.coreCd <= 0 && dist(this.player, this.rival) < 200 && Math.random() < dt * 0.3) {
      this.useCore(this.rival);
    }
    for (const ball of this.balls) this.trackRaceProgress(ball);
    this.progress = Math.min(2, this.player.progressAngle / TAU);
    this.score = Math.max(this.score, Math.round(this.player.topSpeed || 0));

    if (this.ending) return;

    const playerDone = this.player.progressAngle >= TWO_LAPS;
    const rivalDone = this.rival.progressAngle >= TWO_LAPS;
    if (playerDone || rivalDone) {
      const win = playerDone && (!rivalDone || this.player.progressAngle >= this.rival.progressAngle);
      this.showNotice(win ? 'FINISH! FIRST PLACE' : 'FINISH! SECOND PLACE', win ? '#ffe08a' : '#ffb0a0', 1600);
      if (win && this.player) this.spawnBurst(this.player.x, this.player.y, '#ffe08a', 46, 340);
      this.queueFinish({
        mode: 'race',
        win,
        score: Math.round(this.player.topSpeed),
        time: this.elapsed,
        progress: 2,
        playerHp: 100,
        bestScore: Math.round(this.player.topSpeed),
      }, 1.15);
      return;
    }
    if (this.timeLeft <= 0) {
      const win = this.player.progressAngle >= this.rival.progressAngle;
      this.showNotice('TIME UP', win ? '#ffe08a' : '#ffb0a0', 1400);
      this.queueFinish({
        mode: 'race', win, score: Math.round(this.player.topSpeed), time: this.elapsed,
        progress: Math.min(2, this.player.progressAngle / TAU), playerHp: 100,
        bestScore: Math.round(this.player.topSpeed),
      }, 1.0);
    }
  },

  trackRaceProgress(ball) {
    const theta = ellipseTheta(ball.x, ball.y);
    if (ball.prevTheta == null) ball.prevTheta = theta;
    let d = theta - ball.prevTheta;
    while (d > T_PI) d -= TAU;
    while (d < -T_PI) d += TAU;
    ball.progressAngle = Math.max(0, ball.progressAngle + d);
    ball.prevTheta = theta;
  },

  aiRace(dt) {
    const r = this.rival;
    if (!r || r.falling) return;
    if (r.stun > 0) { r.inputX = 0; r.inputY = 0; return; }

    const theta = ellipseTheta(r.x, r.y);
    const look = 0.44 + clamp(r.stats.control * 0.03, 0, 0.12);
    let tx = CX + Math.cos(theta + look) * RACE.midA;
    let ty = CY + Math.sin(theta + look) * RACE.midB;

    // obstacle avoidance
    for (const ob of this.obstacles) {
      const d = Math.hypot(tx - ob.x, ty - ob.y);
      if (d < 115) {
        const away = norm(tx - ob.x, ty - ob.y);
        tx += away.x * (115 - d) * 1.4;
        ty += away.y * (115 - d) * 1.4;
      }
    }
    // edge avoidance
    const innerF = ((r.x - CX) / RACE.innerA) ** 2 + ((r.y - CY) / RACE.innerB) ** 2;
    const outerF = ((r.x - CX) / RACE.outerA) ** 2 + ((r.y - CY) / RACE.outerB) ** 2;
    if (innerF < 1.22) {
      const out = norm(r.x - CX, r.y - CY);
      tx += out.x * 90;
      ty += out.y * 90;
    }
    if (outerF > 0.9) {
      const inn = norm(CX - r.x, CY - r.y);
      tx += inn.x * 90;
      ty += inn.y * 90;
    }

    const n = norm(tx - r.x, ty - r.y);
    r.inputX = n.x;
    r.inputY = n.y;

    const tangent = norm(-Math.sin(theta) * RACE.midA, Math.cos(theta) * RACE.midB);
    if (r.dashCd <= 0 && r.boostCd < 0.2 && Math.random() < dt * 0.7) {
      this.tryDash(r, tangent);
    }
  },

  constrainBall(ball, dt) {
    if (this.mode === 'race') return this.constrainRace(ball, dt);
    if (this.mode === 'boss') return this.constrainBoss(ball);
    return undefined;
  },

  constrainRace(ball, dt) {
    const e = ball.stats.bounce;

    // obstacles
    for (const ob of this.obstacles) {
      const dx = ball.x - ob.x;
      const dy = ball.y - ob.y;
      const d = Math.hypot(dx, dy);
      const min = ob.r + ball.r;
      if (d < min && d > 0.001) {
        const nx = dx / d;
        const ny = dy / d;
        ball.x = ob.x + nx * min;
        ball.y = ob.y + ny * min;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= (1 + e) * vn * nx;
          ball.vy -= (1 + e) * vn * ny;
        }
        if (Math.hypot(ball.vx, ball.vy) > 120) {
          this.spawnBurst(ob.x + nx * ob.r, ob.y + ny * ob.r, '#ffb545', 7, 110);
        }
      }
    }

    // boost pads
    if (ball.boostCd <= 0) {
      for (const pad of this.boostPads) {
        if (Math.hypot(ball.x - pad.x, ball.y - pad.y) < 46) {
          const tangent = norm(-Math.sin(pad.angle) * RACE.midA, Math.cos(pad.angle) * RACE.midB);
          ball.vx += tangent.x * 250;
          ball.vy += tangent.y * 250;
          ball.boostCd = 1.5;
          this.spawnBurst(pad.x, pad.y, '#5ce1c6', 14, 190);
          if (ball.isPlayer) {
            audio.tone({ freq: 420, dur: 0.14, type: 'triangle', gain: 0.05, slide: 220 });
            this.addDamage(ball.x, ball.y - ball.r, 'BOOST', '#5ce1c6', 11);
          }
          break;
        }
      }
    }

    // outer wall
    const aO = RACE.outerA - ball.r * 0.92;
    const bO = RACE.outerB - ball.r * 0.92;
    let nx = (ball.x - CX) / aO;
    let ny = (ball.y - CY) / bO;
    let f = nx * nx + ny * ny;
    if (f > 1) {
      const k = 1 / Math.sqrt(f);
      ball.x = CX + (ball.x - CX) * k;
      ball.y = CY + (ball.y - CY) * k;
      const gn = norm((ball.x - CX) / (aO * aO), (ball.y - CY) / (bO * bO));
      const vn = ball.vx * gn.x + ball.vy * gn.y;
      if (vn > 0) {
        ball.vx -= (1 + e) * vn * gn.x;
        ball.vy -= (1 + e) * vn * gn.y;
      }
    }

    // inner wall
    const aI = RACE.innerA + ball.r * 0.92;
    const bI = RACE.innerB + ball.r * 0.92;
    nx = (ball.x - CX) / aI;
    ny = (ball.y - CY) / bI;
    f = nx * nx + ny * ny;
    if (f < 1) {
      if (f < 0.0001) {
        ball.x = CX + aI;
        ball.y = CY;
      } else {
        const k = 1 / Math.sqrt(f);
        ball.x = CX + (ball.x - CX) * k;
        ball.y = CY + (ball.y - CY) * k;
      }
      const gn = norm((ball.x - CX) / (aI * aI), (ball.y - CY) / (bI * bI));
      const vn = ball.vx * gn.x + ball.vy * gn.y;
      if (vn < 0) {
        ball.vx -= (1 + e) * vn * gn.x;
        ball.vy -= (1 + e) * vn * gn.y;
      }
    }
  },

  /* ══ BOSS ══════════════════════════════════════════════════ */
  initBoss() {
    this.viewW = 870;
    this.viewH = 790;
    this.resize();
    this.timeLimit = 120;
    this.timeLeft = 120;
    this.hud.mode.textContent = 'BOSS BATTLE · ARENA 03';

    this.player = this.makeBall(this.save.config, this.build, {
      x: CX, y: CY + 240, isPlayer: true, name: this.save.config.name,
    });
    const maxHp = Math.round(100 + this.build.phys.defense * 5);
    this.player.hp = this.player.maxHp = maxHp;

    const bossConfig = {
      ...RIVALS[4].config,
      name: 'WARDEN',
      color: '#4a1d22',
      accent: '#ff5d5d',
      pattern: 'hazard',
      glow: 0.85,
      eyes: 'grumpy',
      mouth: 'fangs',
      mood: 'angry',
      core: 'gravity',
      material: 'stone',
      gadgets: ['weapons_spike_ring', 'weapons_doom_drill', 'weapons_morning_star', 'weird_event_horizon'],
      rotation: 18,
      mirror: true,
    };
    const bossBuild = computeBuild(bossConfig, { mass: 3, energy: 3, motor: 1, armor: 2 }, { ignoreBudget: true });
    const bossHp = 560 + Math.min(280, this.save.stats.wins * 26);
    this.bossBall = this.makeBall(bossConfig, bossBuild, {
      x: CX, y: CY - 60, boss: true, radius: 92, hp: bossHp, name: 'WARDEN',
    });
    this.bossBall.stats = { ...bossBuild.phys, maxSpeed: 48, damage: 26, defense: 1.2, mass: 40 };
    this.bossBall.attack = null;
    this.bossBall.attackTimer = 2.6;
    this.bossBall.hitCd = 0;
    this.balls = [this.player];
    this.ringR = 340;
    this.aim.x = CX;
    this.aim.y = CY - 250;
    this.hud.objective.textContent = 'BREAK THE WARDEN';
  },

  updateBoss(dt) {
    const boss = this.bossBall;
    const player = this.player;
    if (!boss || boss.dead) return;

    this.stepBalls(dt);
    this.updateBossMovement(dt);
    this.autoFire(player, boss);
    this.updateBossContact(dt);
    this.checkBossShockwaves();
    this.playerBurnAura(dt);

    if (this.ending) return;

    if (boss.hp <= 0) {
      boss.dead = true;
      this.spawnBurst(boss.x, boss.y, '#ffb545', 70, 440);
      this.spawnBurst(boss.x, boss.y, '#ff5d5d', 50, 310);
      this.shake = 24;
      this.flash = 0.8;
      this.flashColor = '255,160,90';
      audio.ringout();
      this.showNotice('WARDEN DOWN', '#ffd38a', 1700);
      this.queueFinish({
        mode: 'boss', win: true, score: Math.round(player.damageDealt || 0),
        time: this.elapsed, playerHp: Math.max(0, player.hp),
        bestScore: Math.round(player.damageDealt || 0), bossHp: 0,
      }, 1.5);
      return;
    }
    if (player.hp <= 0) {
      player.falling = true;
      this.spawnBurst(player.x, player.y, '#ff8f86', 34, 280);
      audio.lose();
      this.showNotice('BALL LOST', '#ff8f86', 1600);
      this.queueFinish({
        mode: 'boss', win: false, score: Math.round(player.damageDealt || 0),
        time: this.elapsed, playerHp: 0, bestScore: Math.round(player.damageDealt || 0),
      }, 1.1);
      return;
    }
    if (this.timeLeft <= 0) {
      this.showNotice('TIME UP', '#ffb0a0', 1400);
      this.queueFinish({
        mode: 'boss', win: false, score: Math.round(player.damageDealt || 0),
        time: this.elapsed, playerHp: Math.max(0, player.hp),
        bestScore: Math.round(player.damageDealt || 0),
      }, 1.0);
    }
  },

  constrainBoss(ball) {
    const R = this.ringR - ball.r * 0.92;
    const dx = ball.x - CX;
    const dy = ball.y - CY;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      const nx = dx / d;
      const ny = dy / d;
      ball.x = CX + nx * R;
      ball.y = CY + ny * R;
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn > 0) {
        ball.vx -= (1 + ball.stats.bounce) * vn * nx;
        ball.vy -= (1 + ball.stats.bounce) * vn * ny;
      }
    }
  },

  updateBossMovement(dt) {
    const boss = this.bossBall;
    const player = this.player;
    const phase2 = boss.hp < boss.maxHp * 0.5;
    boss.hitFlash = Math.max(0, (boss.hitFlash || 0) - dt);
    boss.hitCd = Math.max(0, (boss.hitCd || 0) - dt);
    if (!boss.attack) {
      boss.attackTimer -= dt * (phase2 ? 1.35 : 1);
      const d = dist(boss, player);
      if (d > 230 && this.elapsed > 1) {
        const n = norm(player.x - boss.x, player.y - boss.y);
        boss.vx += n.x * 22;
        boss.vy += n.y * 22;
      }
      boss.vx *= Math.exp(-2.6 * dt);
      boss.vy *= Math.exp(-2.6 * dt);
      boss.x += boss.vx * dt;
      boss.y += boss.vy * dt;
      if (boss.attackTimer <= 0) this.beginBossAttack(phase2);
    } else {
      const atk = boss.attack;
      atk.t -= dt;
      if (atk.type === 'slam') {
        boss.vx *= Math.exp(-4 * dt);
        boss.vy *= Math.exp(-4 * dt);
        boss.x += boss.vx * dt;
        boss.y += boss.vy * dt;
        if (atk.t <= 0) this.executeSlam(atk, phase2);
      } else if (atk.type === 'volley') {
        boss.vx *= Math.exp(-4 * dt);
        boss.vy *= Math.exp(-4 * dt);
        if (atk.t <= 0) this.executeVolley(phase2);
      } else if (atk.type === 'chargeWind') {
        if (atk.t <= 0) {
          const n = norm(player.x - boss.x, player.y - boss.y);
          boss.vx = n.x * (phase2 ? 640 : 540);
          boss.vy = n.y * (phase2 ? 640 : 540);
          boss.attack = { type: 'charge', t: 0.62 };
          audio.dash();
          this.shake = 6;
        }
      } else if (atk.type === 'charge') {
        boss.x += boss.vx * dt;
        boss.y += boss.vy * dt;
        boss.vx *= Math.exp(-2.4 * dt);
        boss.vy *= Math.exp(-2.4 * dt);
        if (Math.random() < 0.5) this.particles.push({
          x: boss.x - rand(-40, 40), y: boss.y - rand(-40, 40),
          vx: rand(-40, 40), vy: rand(-40, 40), life: 0.4, maxLife: 0.5,
          size: rand(5, 12), color: '#ff6b3d', drag: 2, kind: 'dot',
        });
        if (atk.t <= 0) {
          boss.attack = null;
          boss.attackTimer = phase2 ? 1.1 : 1.8;
        }
      }
    }
    this.constrainBoss(boss);
  },

  beginBossAttack(phase2) {
    const boss = this.bossBall;
    const player = this.player;
    const roll = Math.random();
    if (roll < 0.4) {
      boss.attack = { type: 'slam', t: phase2 ? 0.76 : 0.96 };
      this.telegraph = { x: player.x, y: player.y, r: 172, t: phase2 ? 0.76 : 0.96, max: phase2 ? 0.76 : 0.96, type: 'slam' };
      audio.tone({ freq: 120, dur: 0.4, type: 'sawtooth', gain: 0.05, slide: 40 });
    } else if (roll < 0.74) {
      boss.attack = { type: 'volley', t: phase2 ? 0.5 : 0.7 };
      audio.tone({ freq: 300, dur: 0.3, type: 'square', gain: 0.04, slide: 200 });
    } else {
      boss.attack = { type: 'chargeWind', t: phase2 ? 0.46 : 0.66 };
      this.telegraph = { x: player.x, y: player.y, r: 70, t: phase2 ? 0.46 : 0.66, max: phase2 ? 0.46 : 0.66, type: 'charge' };
    }
  },

  executeSlam(atk, phase2) {
    const boss = this.bossBall;
    this.telegraph = null;
    boss.attack = null;
    boss.attackTimer = phase2 ? 1.25 : 1.9;
    this.shockwaves.push({
      x: atk.x, y: atk.y, r: 24, max: 285, speed: 620, hit: false, color: '#ff8a4c', life: 0.8,
    });
    this.spawnBurst(atk.x, atk.y, '#ff8a4c', 30, 300);
    this.shake = 12;
    audio.bump(1.4);
    if (dist(this.player, atk) < 165) this.damagePlayer(18, '#ff8a4c');
  },

  executeVolley(phase2) {
    const boss = this.bossBall;
    boss.attack = null;
    boss.attackTimer = phase2 ? 1.3 : 2.0;
    const count = phase2 ? 14 : 10;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU + this.elapsed * 0.6;
      this.projectiles.push({
        x: boss.x + Math.cos(a) * (boss.r + 10),
        y: boss.y + Math.sin(a) * (boss.r + 10),
        vx: Math.cos(a) * 250,
        vy: Math.sin(a) * 250,
        r: 8,
        life: 3.4,
        color: '#ff6b4f',
        owner: boss,
        damage: 10,
        boss: true,
        trail: [],
      });
    }
    this.spawnBurst(boss.x, boss.y, '#ff8a4c', 24, 220);
    audio.tone({ freq: 220, dur: 0.3, type: 'square', gain: 0.05, slide: 120 });
  },

  checkBossShockwaves() {
    const player = this.player;
    for (const w of this.shockwaves) {
      if (w.hit) continue;
      if (w.thin) continue;
      const d = Math.hypot(player.x - w.x, player.y - w.y);
      if (Math.abs(d - w.r) < player.r + 12) {
        w.hit = true;
        this.damagePlayer(15, '#ff8a4c');
        this.knockback(player, w.x, w.y, 230);
      }
    }
  },

  updateBossContact(dt) {
    const boss = this.bossBall;
    const player = this.player;
    if (!boss || boss.dead || player.falling) return;
    const d = dist(player, boss);
    const min = player.r + boss.r;
    if (d >= min || d < 0.001) return;
    const nx = (player.x - boss.x) / d;
    const ny = (player.y - boss.y) / d;
    player.x = boss.x + nx * min;
    player.y = boss.y + ny * min;

    if (player.dashTimer > 0 && boss.hitCd <= 0) {
      const dmg = (player.stats.damage * 2.5 + Math.hypot(player.vx, player.vy) * 0.07) * (boss.dead ? 0 : 1);
      this.damageTarget(boss, dmg, player, '#ffd38a');
      boss.hitCd = 0.34;
      boss.hitFlash = 0.25;
      this.spawnBurst(player.x - nx * 20, player.y - ny * 20, '#ffd38a', 18, 250);
      this.shake = 9;
      audio.hit(1.2);
      this.knockback(player, boss.x, boss.y, 140);
    } else if (player.hitCd <= 0) {
      this.damagePlayer(5, '#ff8f86');
      this.knockback(player, boss.x, boss.y, 260);
      player.hitCd = 0.75;
    }
  },

  damagePlayer(amount, color = '#ff8f86') {
    const player = this.player;
    if (!player || player.falling || player.invuln > 0) return;
    const dmg = amount / Math.max(0.7, player.stats.defense);
    player.hp = Math.max(0, player.hp - dmg);
    player.hitFlash = 0.2;
    player.invuln = 0.32;
    this.addDamage(player.x, player.y - player.r, `-${Math.round(dmg)}`, color, 14);
    this.spawnBurst(player.x, player.y, color, 12, 170);
    this.shake = Math.max(this.shake, 6);
    this.flash = Math.max(this.flash, 0.22);
    this.flashColor = '255,80,80';
    audio.hit(1);
  },

  playerBurnAura(dt) {
    const p = this.player;
    if (p.burn > 0 && this.bossBall && dist(p, this.bossBall) < p.r + this.bossBall.r + 40) {
      p.auraCd = (p.auraCd || 0) - dt;
      if (p.auraCd <= 0) {
        p.auraCd = 0.8;
        this.damageTarget(this.bossBall, 4, p, '#ff8a4c');
        this.spawnBurst(this.bossBall.x, this.bossBall.y, '#ff8a4c', 8, 100);
      }
    }
  },

  /* ══ SHOWCASE ══════════════════════════════════════════════ */
  initShowcase() {
    this.viewW = 920;
    this.viewH = 790;
    this.resize();
    this.countdown = 2.1;
    this.timeLimit = 0;
    this.hud.mode.textContent = 'SHOWCASE · LIVE LOBBY';
    this.hud.objective.textContent = 'WIN OVER THE CROWD';

    this.player = this.makeBall(this.save.config, this.build, {
      x: CX, y: CY + 150, isPlayer: true, name: this.save.config.name, radius: 58,
    });
    this.player.hp = this.player.maxHp = 100;
    this.balls = [this.player];
    this.bossBall = null;

    const picks = [RIVALS[1], RIVALS[3], RIVALS[0], RIVALS[2]];
    this.showcaseRivals = picks.map((rival, i) => {
      const angle = -Math.PI * 0.88 + (i / (picks.length - 1)) * Math.PI * 0.76;
      return {
        config: rival.config,
        name: rival.name,
        x: CX + Math.cos(angle) * 285,
        y: CY - 20 + Math.sin(angle) * 150,
        r: 30 + (i % 3) * 5,
        layouts: buildLayouts(rival.config),
        score: Math.round(rand(62, 92) + Math.min(14, this.save.stats.wins * 1.2)),
        phase: rand(0, TAU),
      };
    });

    this.showcase = this.scoreShowcase();
    const all = [...this.showcaseRivals.map((r) => ({ name: r.name, score: r.score })), { name: this.player.name, score: this.showcase.score }];
    all.sort((a, b) => b.score - a.score);
    this.showcase.rank = all.findIndex((x) => x.name === this.player.name) + 1;
    this.showcase.rivalScores = this.showcaseRivals.map((r) => r.score);
    this.showcase.rankList = all;
    this.showcase.t = 0;
    this.showcase.chat = 0;
    this.showcase.chatTimer = 0;
    this.aim.x = CX;
    this.aim.y = CY - 200;
  },

  scoreShowcase() {
    const c = this.save.config;
    const phys = this.build.phys;
    const packs = new Set(c.gadgets.map((id) => GADGET_MAP[id]?.pack).filter(Boolean));
    const tags = phys.gadgetTags || new Set();
    const glow = c.glow || 0;
    const creativity = clamp(
      27 + (c.pattern !== 'solid' ? 12 : 0) + (c.texture !== 'matte' ? 8 : 0) + glow * 18
      + c.gadgets.length * 3.1 + packs.size * 5 + (c.mirror ? 6 : 0) + (c.rotation ? 4 : 0)
      + (c.accent !== c.color ? 4 : 0),
      10, 100,
    );
    const menace = clamp(
      8 + phys.damage * 2.1 + (tags.has('contact') ? 13 : 0) + (tags.has('projectile') ? 9 : 0)
      + (c.mood === 'angry' ? 10 : 0) + (phys.maxMass ? 0 : 0),
      5, 100,
    );
    const charm = clamp(
      30 + glow * 22 + (['star', 'wide', 'sleepy'].includes(c.eyes) ? 7 : 0)
      + (['grin', 'smile', 'ooo'].includes(c.mouth) ? 8 : 0)
      + (['giddy', 'calm'].includes(c.mood) ? 12 : 0)
      + (c.gadgets.includes('weird_party_hat') ? 15 : 0)
      + (c.name.length <= 5 ? 4 : 0),
      5, 100,
    );
    const leftover = 1 - (phys.massCost / phys.maxMass) * 0.7;
    const synergy = clamp(
      22 + leftover * 42 + packs.size * 6 + (tags.has('luck') ? 6 : 0)
      + (['fire', 'electric'].includes(c.core) ? 6 : 0) + (c.mirror ? 5 : 0),
      5, 100,
    );
    const base = creativity * 0.28 + menace * 0.24 + charm * 0.24 + synergy * 0.24;
    const score = Math.round(clamp(base + rand(-2, 4) + (phys.luck - 1) * 6, 15, 99));
    return {
      breakdown: {
        creativity: Math.round(creativity),
        menace: Math.round(menace),
        charm: Math.round(charm),
        synergy: Math.round(synergy),
      },
      score,
      t: 0,
      chat: 0,
      chatTimer: 0,
    };
  },

  updateShowcase(dt) {
    const sc = this.showcase;
    sc.t += dt;
    sc.chatTimer -= dt;
    if (sc.chatTimer <= 0) {
      sc.chatTimer = 1.55;
      sc.chat = (sc.chat + 1) % CHAT.length;
    }
    this.player.x = CX;
    this.player.y = CY + 150 + Math.sin(sc.t * 2.2) * 9;
    this.player.facing = Math.sin(sc.t * 0.8) * 0.3;
    for (const r of this.showcaseRivals) {
      r.y += Math.sin(sc.t * 1.7 + r.phase) * 0.22;
      r.x += Math.cos(sc.t * 1.2 + r.phase) * 0.12;
    }
    if (sc.t > 1.6 && !this.showcaseCategoryShown) {
      this.showcaseCategoryShown = true;
      this.showNotice('CREATIVITY · MENACE · CHARM · SYNERGY', '#ffb545', 1400);
    }
    if (sc.t > 4.9 && !this.ending) {
      const rank = sc.rank;
      this.showNotice(rank === 1 ? 'CROWD FAVOURITE!' : `RANK #${rank} OF 5`, rank === 1 ? '#ffe08a' : '#ff9ed2', 1300);
      this.queueFinish({
        mode: 'showcase',
        win: rank <= 2,
        rank,
        score: sc.score,
        breakdown: sc.breakdown,
        rivalScores: sc.rivalScores,
        progress: 0,
        playerHp: 100,
        bestScore: sc.score,
      }, 1.2);
    }
  },

  /* ══ drawing dispatch ══════════════════════════════════════ */
  /* Cheap animated touches drawn over the cached arena layer. */
  drawArenaLive(t) {
    const ctx = this.ctx;
    if (this.mode === 'sumo') {
      const R = this.ringR;
      ctx.strokeStyle = 'rgba(255,181,69,0.14)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(CX, CY, R * 0.705, t * 0.28, t * 0.28 + 0.5);
      ctx.stroke();
      if (R < 290) {
        ctx.strokeStyle = `rgba(255,93,93,${0.25 + Math.sin(t * 6) * 0.12})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CX, CY, R - 6, 0, TAU);
        ctx.stroke();
      }
      return;
    }
    if (this.mode === 'race') {
      for (const pad of this.boostPads || []) {
        ctx.strokeStyle = `rgba(92,225,198,${0.18 + Math.sin(t * 4 + pad.angle) * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, 30 + Math.sin(t * 3 + pad.angle) * 4, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,240,210,0.2)';
      for (let i = 0; i < 10; i += 1) {
        const a = i * 1.7 + t * 0.04;
        const p = ellipsePoint(RACE.midA + Math.sin(i) * 30, RACE.midB + Math.cos(i) * 30, a);
        ctx.globalAlpha = 0.08 + (i % 5) * 0.03;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 + (i % 3), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    if (this.mode === 'boss') {
      const R = this.ringR;
      ctx.strokeStyle = `rgba(255,93,93,${0.2 + Math.sin(t * 4) * 0.08})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(CX, CY, R + 11, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,120,60,${0.08 + Math.sin(t * 2) * 0.04})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(CX, CY, R * 0.88, t * 0.18, t * 0.18 + 0.9);
      ctx.stroke();
      return;
    }
    // showcase confetti
    for (let i = 0; i < 26; i += 1) {
      const a = i * 2.1 + t * 0.12;
      const rad = 300 + Math.sin(i * 3.7) * 120;
      const x = CX + Math.cos(a) * rad;
      const y = CY - 120 + Math.sin(a * 0.7) * 220;
      ctx.globalAlpha = 0.12 + Math.sin(t * 2 + i) * 0.08;
      ctx.fillStyle = CROWD[i % CROWD.length].color;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + (i % 3), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  drawArena(t) {
    if (this.mode === 'sumo') drawSumoArena(this, t);
    else if (this.mode === 'race') drawRaceArena(this, t);
    else if (this.mode === 'boss') drawBossArena(this, t);
    else drawShowcaseArena(this, t);
  },

  drawUnder(t) {
    const ctx = this.ctx;
    if (this.mode === 'boss') {
      if (this.telegraph) {
        const k = 1 - this.telegraph.t / this.telegraph.max;
        ctx.save();
        ctx.translate(this.telegraph.x, this.telegraph.y);
        ctx.fillStyle = 'rgba(255,80,60,0.12)';
        ctx.strokeStyle = 'rgba(255,93,93,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.telegraph.r, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,200,150,0.9)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, this.telegraph.r * 0.92, -Math.PI / 2, -Math.PI / 2 + TAU * k);
        ctx.stroke();
        ctx.setLineDash([9, 12]);
        ctx.strokeStyle = 'rgba(255,93,93,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.telegraph.r * 1.16, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      if (this.bossBall && !this.bossBall.dead && this.bossBall.attack?.type === 'chargeWind') {
        const b = this.bossBall;
        const n = norm(this.player.x - b.x, this.player.y - b.y);
        ctx.strokeStyle = 'rgba(255,93,93,0.4)';
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 14]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + n.x * 560, b.y + n.y * 560);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (this.mode === 'race') {
      // next-gate arrow above the player
      const p = this.player;
      const theta = ellipseTheta(p.x, p.y);
      const ahead = ellipsePoint(RACE.midA, RACE.midB, theta + 0.7);
      const n = norm(ahead.x - p.x, ahead.y - p.y);
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#5ce1c6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.moveTo(p.x + n.x * p.r, p.y + n.y * p.r);
      ctx.lineTo(p.x + n.x * (p.r + 38), p.y + n.y * (p.r + 38));
      ctx.stroke();
      ctx.restore();
    }
  },

  drawOver(t) {
    if (this.mode === 'showcase') {
      this.drawShowcaseRivals(t);
      this.drawShowcaseUI(t);
      return;
    }

    const ctx = this.ctx;
    const p = this.player;
    if (!p || p.falling) return;

    // dash target reticle
    if (this.aim.active && this.elapsed - this.aim.t < 4) {
      const n = norm(this.aim.x - p.x, this.aim.y - p.y);
      if (n.d > 30) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = p.config.accent;
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 11]);
        ctx.beginPath();
        ctx.moveTo(p.x + n.x * (p.r + 14), p.y + n.y * (p.r + 14));
        ctx.lineTo(p.x + n.x * 120, p.y + n.y * 120);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(p.x + n.x * 126, p.y + n.y * 126, 5, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }

    // sumo danger ring
    if (this.mode === 'sumo') {
      const d = Math.hypot(p.x - CX, p.y - CY);
      if (d > this.ringR - 70) {
        const n = norm(CX - p.x, CY - p.y);
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.3;
        ctx.fillStyle = '#ff5d5d';
        ctx.beginPath();
        ctx.arc(p.x + n.x * (p.r + 30), p.y + n.y * (p.r + 30), 6, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  },

  drawShowcaseRivals(t) {
    const ctx = this.ctx;
    for (const r of this.showcaseRivals || []) {
      drawBlob(ctx, {
        x: r.x,
        y: r.y,
        r: r.r,
        config: r.config,
        t: t + r.phase,
        layouts: r.layouts,
        face: { x: Math.sin(t * 0.6 + r.phase) * 0.25, y: 0.1 },
        glow: 0.1,
      });
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = "700 8px 'JetBrains Mono', monospace";
      ctx.fillStyle = alpha(r.config.accent || '#ffb545', 0.9);
      ctx.fillText(r.name, r.x, r.y + 66);
      ctx.font = "800 13px 'Bricolage Grotesque', sans-serif";
      ctx.fillStyle = 'rgba(247,242,232,0.85)';
      ctx.fillText(String(r.score), r.x, r.y + 81);
      ctx.restore();
    }
  },

  drawShowcaseUI(t) {
    const ctx = this.ctx;
    const sc = this.showcase;
    if (!sc) return;
    const labels = [
      ['CREATIVITY', sc.breakdown.creativity, '#ffb545'],
      ['MENACE', sc.breakdown.menace, '#ff6b5b'],
      ['CHARM', sc.breakdown.charm, '#ff9ed2'],
      ['SYNERGY', sc.breakdown.synergy, '#67e8f9'],
    ];
    const reveal = clamp((sc.t - 1.4) / 2.4, 0, 1);

    // category bars top-left (anchor to the visible viewport, not the world origin)
    const leftEdge = (0 - this.ox) / this.scale;
    const rightEdge = (this.cw - this.ox) / this.scale;
    const bottomEdge = (this.ch - this.oy) / this.scale;
    ctx.save();
    ctx.translate(leftEdge + 24, 84);
    ctx.fillStyle = 'rgba(8,11,16,0.55)';
    ctx.strokeStyle = 'rgba(247,242,232,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 148, 12);
    ctx.fill();
    ctx.stroke();
    ctx.font = "700 8px 'JetBrains Mono', monospace";
    ctx.fillStyle = 'rgba(247,242,232,0.45)';
    ctx.fillText('CROWD JUDGEMENT', 14, 20);
    labels.forEach(([label, value, color], i) => {
      const y = 42 + i * 25;
      ctx.fillStyle = 'rgba(247,242,232,0.55)';
      ctx.font = "700 8px 'JetBrains Mono', monospace";
      ctx.fillText(label, 14, y + 3);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(94, y - 3, 112, 5);
      ctx.fillStyle = color;
      ctx.fillRect(94, y - 3, 112 * (value / 100) * reveal, 5);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f7f2e8';
      ctx.fillText(String(Math.round(value * reveal)), 242, y + 3);
      ctx.textAlign = 'left';
    });
    ctx.restore();

    // big score top-right
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = "800 54px 'Bricolage Grotesque', sans-serif";
    ctx.fillStyle = `rgba(255,181,69,${0.25 + reveal * 0.75})`;
    ctx.fillText(String(Math.round(sc.score * reveal)), rightEdge - 30, 128);
    ctx.font = "700 8px 'JetBrains Mono', monospace";
    ctx.fillStyle = 'rgba(247,242,232,0.45)';
    ctx.fillText('CROWD SCORE', rightEdge - 30, 146);
    ctx.restore();

    // chat bubbles
    if (sc.t > 0.6) {
      const [name, text] = CHAT[sc.chat];
      ctx.save();
      ctx.globalAlpha = clamp((sc.t - 0.6) * 3, 0, 1);
      const x = leftEdge + 24;
      const y = bottomEdge - 118;
      ctx.font = "500 11px 'Space Grotesk', sans-serif";
      const w = Math.min(360, ctx.measureText(text).width + 40);
      ctx.fillStyle = 'rgba(8,11,16,0.7)';
      ctx.strokeStyle = 'rgba(247,242,232,0.11)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, 48, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffb545';
      ctx.font = "700 8px 'JetBrains Mono', monospace";
      ctx.fillText(name, x + 14, y + 18);
      ctx.fillStyle = 'rgba(247,242,232,0.8)';
      ctx.font = "500 11px 'Space Grotesk', sans-serif";
      ctx.fillText(text, x + 14, y + 34);
      ctx.restore();
    }
  },
};
