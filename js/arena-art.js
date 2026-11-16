/* Arena floor / scenery painting — all procedural canvas. */

import { alpha, lighten, darken, drawBlob } from './blob.js';
import { CX, CY, TAU, CROWD, RACE, ellipsePoint, ellipseTheta } from './constants.js';

function crowd(ctx, cx, cy, rx, ry, t, opacity = 0.6, scale = 1) {
  for (let i = 0; i < CROWD.length; i += 1) {
    const c = CROWD[i];
    const bob = Math.sin(t * 1.4 + c.phase) * 2.5;
    const x = cx + Math.cos(c.angle) * (rx + c.r * 150 * scale);
    const y = cy + Math.sin(c.angle) * (ry + c.r * 110 * scale) + bob;
    ctx.globalAlpha = opacity * (0.35 + c.r * 0.4);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(x, y, c.size * scale, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function lamp(ctx, x, y, color, t, size = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, 52 * size);
  g.addColorStop(0, alpha(color, 0.34));
  g.addColorStop(0.4, alpha(color, 0.1));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 52 * size, 0, TAU);
  ctx.fill();
  ctx.fillStyle = alpha(color, 0.9);
  ctx.beginPath();
  ctx.arc(x, y, 3.3 * size + Math.sin(t * 4 + x) * 0.6, 0, TAU);
  ctx.fill();
}

function dashEllipse(ctx, a, b, color, width = 1, dash = [6, 9]) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.ellipse(CX, CY, a, b, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/* ══ SUMO ═══════════════════════════════════════════════════ */
export function drawSumoArena(game, t) {
  const ctx = game.ctx;
  const R = game.ringR;

  // abyss light
  const halo = ctx.createRadialGradient(CX, CY, R * 0.6, CX, CY, R * 2.2);
  halo.addColorStop(0, 'rgba(255,181,69,0.07)');
  halo.addColorStop(0.5, 'rgba(40,30,20,0.16)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(CX - 650, CY - 650, 1300, 1300);

  crowd(ctx, CX, CY, R + 66, R + 40, t, 0.42, 0.9);

  // supports and lanterns
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * TAU + 0.24;
    const x = CX + Math.cos(a) * (R + 105);
    const y = CY + Math.sin(a) * (R + 105);
    lamp(ctx, x, y, i % 2 ? '#ff8a4c' : '#ffd071', t, 0.85 + (i % 3) * 0.12);
  }

  // outer platform edge shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 45;
  ctx.fillStyle = '#0c1015';
  ctx.beginPath();
  ctx.arc(CX, CY + 9, R + 15, 0, TAU);
  ctx.fill();
  ctx.restore();

  // rim rings
  ctx.strokeStyle = 'rgba(255,181,69,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CX, CY, R + 10, 0, TAU);
  ctx.stroke();

  // floor
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, TAU);
  ctx.clip();
  const floor = ctx.createRadialGradient(CX - R * 0.2, CY - R * 0.25, R * 0.06, CX, CY, R * 1.08);
  floor.addColorStop(0, '#343c47');
  floor.addColorStop(0.42, '#252c35');
  floor.addColorStop(0.8, '#171d25');
  floor.addColorStop(1, '#0e1319');
  ctx.fillStyle = floor;
  ctx.fillRect(CX - R, CY - R, R * 2, R * 2);

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.032)';
  ctx.lineWidth = 1;
  const grid = 42;
  for (let x = CX - R; x < CX + R; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, CY - R);
    ctx.lineTo(x, CY + R);
    ctx.stroke();
  }
  for (let y = CY - R; y < CY + R; y += grid) {
    ctx.beginPath();
    ctx.moveTo(CX - R, y);
    ctx.lineTo(CX + R, y);
    ctx.stroke();
  }

  // painted rings
  const rings = [0.32, 0.56, 0.8, 0.93];
  rings.forEach((k, i) => {
    ctx.strokeStyle = i === 3 ? 'rgba(255,181,69,0.25)' : `rgba(247,242,232,${0.06 - i * 0.008})`;
    ctx.lineWidth = i === 3 ? 3 : 1.4;
    ctx.setLineDash(i === 1 ? [10, 14] : []);
    ctx.beginPath();
    ctx.arc(CX, CY, R * k, 0, TAU);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // swept arc (animated live, omitted from the cached layer)
  if (!game._cachePass) {
    ctx.strokeStyle = 'rgba(255,181,69,0.14)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(CX, CY, R * 0.705, t * 0.28, t * 0.28 + 0.5);
    ctx.stroke();
  }

  // centre emblem
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = 'rgba(255,181,69,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CX, CY, 36, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, CY, 27, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,181,69,0.85)';
  ctx.font = "800 20px 'Bricolage Grotesque', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('07', CX, CY + 1);
  ctx.font = "700 5px 'JetBrains Mono', monospace";
  ctx.fillStyle = 'rgba(247,242,232,0.4)';
  ctx.fillText('RING', CX, CY + 17);
  ctx.restore();

  // scuffs
  ctx.strokeStyle = 'rgba(0,0,0,0.24)';
  for (let i = 0; i < 7; i += 1) {
    const a = i * 1.7 + 0.4;
    const r1 = R * (0.3 + (i % 4) * 0.14);
    ctx.beginPath();
    ctx.arc(CX + Math.cos(a) * 20, CY + Math.sin(a) * 20, r1, a, a + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // hazard rim
  const segments = 44;
  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * TAU;
    const a1 = ((i + 1) / segments) * TAU;
    ctx.strokeStyle = i % 2 === 0 ? '#ffb545' : '#2b3038';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(CX, CY, R + 3, a0 + 0.008, a1 - 0.008);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,181,69,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CX, CY, R + 10.5, 0, TAU);
  ctx.stroke();

  // energy pulses on rim when tight (animated live)
  if (R < 290 && !game._cachePass) {
    ctx.strokeStyle = `rgba(255,93,93,${0.25 + Math.sin(t * 6) * 0.12})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, R - 6, 0, TAU);
    ctx.stroke();
  }

  // ring-out pit glow outside
  const pit = ctx.createRadialGradient(CX, CY, R + 12, CX, CY, R + 90);
  pit.addColorStop(0, 'rgba(255,93,93,0.07)');
  pit.addColorStop(1, 'rgba(255,93,93,0)');
  ctx.fillStyle = pit;
  ctx.beginPath();
  ctx.arc(CX, CY, R + 90, 0, TAU);
  ctx.fill();

  // corner labels
  ctx.save();
  ctx.font = "700 8px 'JetBrains Mono', monospace";
  ctx.fillStyle = 'rgba(247,242,232,0.22)';
  ctx.textAlign = 'left';
  ctx.fillText('SUMO // RING 07', CX - R + 6, CY + R + 34);
  ctx.textAlign = 'right';
  ctx.fillText('NO WALLS · NO MERCY', CX + R - 6, CY + R + 34);
  ctx.restore();
}

/* ══ RACE ═══════════════════════════════════════════════════ */
function ellipticalArc(ctx, a, b, from, to) {
  ctx.beginPath();
  const steps = Math.max(5, Math.ceil(Math.abs(to - from) * 40));
  for (let i = 0; i <= steps; i += 1) {
    const th = from + ((to - from) * i) / steps;
    const x = CX + Math.cos(th) * a;
    const y = CY + Math.sin(th) * b;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

export function drawRaceArena(game, t) {
  const ctx = game.ctx;
  crowd(ctx, CX, CY, RACE.outerA + 58, RACE.outerB + 45, t, 0.34, 0.8);

  // floodlights
  lamp(ctx, CX - RACE.outerA - 60, CY - 180, '#ffb545', t, 1.1);
  lamp(ctx, CX + RACE.outerA + 60, CY - 180, '#67e8f9', t, 1.1);
  lamp(ctx, CX - RACE.outerA - 60, CY + 190, '#ff9ed2', t, 1.1);
  lamp(ctx, CX + RACE.outerA + 60, CY + 190, '#a7f36b', t, 1.1);

  // track base
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 50;
  ctx.fillStyle = '#12161d';
  ctx.beginPath();
  ctx.ellipse(CX, CY, RACE.outerA + 16, RACE.outerB + 16, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  const outer = ctx.createRadialGradient(CX, CY, RACE.innerB * 0.5, CX, CY, RACE.outerA);
  outer.addColorStop(0, '#262d37');
  outer.addColorStop(0.55, '#1d242d');
  outer.addColorStop(1, '#151b22');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.ellipse(CX, CY, RACE.outerA, RACE.outerB, 0, 0, TAU);
  ctx.fill();

  // asphalt grain
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(CX, CY, RACE.outerA, RACE.outerB, 0, 0, TAU);
  ctx.ellipse(CX, CY, RACE.innerA, RACE.innerB, 0, 0, TAU);
  ctx.clip('evenodd');
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < 90; i += 1) {
    const a = (i * 2.399) % TAU;
    const rr = 0.3 + ((i * 37) % 70) / 100;
    const x = CX + Math.cos(a) * RACE.outerA * rr;
    const y = CY + Math.sin(a) * RACE.outerB * rr;
    ctx.fillRect(x, y, 2.4, 1.2);
  }
  ctx.restore();

  // outer & inner tunnel walls
  ctx.strokeStyle = '#39424d';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(CX, CY, RACE.outerA + 4, RACE.outerB + 4, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(CX, CY, RACE.outerA + 9, RACE.outerB + 9, 0, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = '#2b323c';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(CX, CY, RACE.innerA - 3, RACE.innerB - 3, 0, 0, TAU);
  ctx.stroke();

  // kerbs
  const kerbCount = 64;
  for (let i = 0; i < kerbCount; i += 1) {
    const color = i % 2 === 0 ? '#f7f2e8' : '#ff5d5d';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 5;
    const a0 = (i / kerbCount) * TAU + 0.006;
    const a1 = ((i + 1) / kerbCount) * TAU - 0.006;
    ellipticalArc(ctx, RACE.outerA - 3, RACE.outerB - 3, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = i % 2 === 0 ? '#ffb545' : '#242a32';
    ellipticalArc(ctx, RACE.innerA + 4, RACE.innerB + 4, a0, a1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // lane markings
  dashEllipse(ctx, RACE.midA, RACE.midB, 'rgba(247,242,232,0.18)', 1.5, [14, 18]);
  dashEllipse(ctx, RACE.midA - 44, RACE.midB - 25, 'rgba(247,242,232,0.035)', 1, [8, 12]);
  dashEllipse(ctx, RACE.midA + 44, RACE.midB + 25, 'rgba(247,242,232,0.035)', 1, [8, 12]);

  // direction chevrons
  for (let i = 0; i < 8; i += 1) {
    const th = (i / 8) * TAU + 0.16;
    const p = ellipsePoint(RACE.midA, RACE.midB, th);
    const tangent = Math.atan2(Math.cos(th) * RACE.midB, -Math.sin(th) * RACE.midA);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(tangent);
    ctx.strokeStyle = 'rgba(255,181,69,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(0, 0);
    ctx.lineTo(-7, 6);
    ctx.stroke();
    ctx.restore();
  }

  // gates
  const gates = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
  gates.slice(0, 3).forEach((th, i) => {
    const inner = ellipsePoint(RACE.innerA, RACE.innerB, th);
    const outerP = ellipsePoint(RACE.outerA, RACE.outerB, th);
    const color = ['#5ce1c6', '#67e8f9', '#c084fc'][i];
    ctx.save();
    ctx.strokeStyle = alpha(color, 0.35);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outerP.x, outerP.y);
    ctx.stroke();
    ctx.restore();
  });

  // start/finish line at the top
  ctx.save();
  const yTop = CY - RACE.outerB;
  const yBot = CY - RACE.innerB;
  const cols = 2;
  const rows = 10;
  const w = 26;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f7f2e8' : '#1a1f26';
      ctx.fillRect(CX - w / 2 + (c * w) / cols, yTop + (r * (yBot - yTop)) / rows, w / cols, (yBot - yTop) / rows);
    }
  }
  ctx.restore();

  // inner island
  const island = ctx.createRadialGradient(CX, CY, 20, CX, CY, RACE.innerA);
  island.addColorStop(0, '#1b222b');
  island.addColorStop(1, '#0b0f14');
  ctx.fillStyle = island;
  ctx.beginPath();
  ctx.ellipse(CX, CY, RACE.innerA - 14, RACE.innerB - 14, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(247,242,232,0.2)';
  ctx.font = "800 34px 'Bricolage Grotesque', sans-serif";
  ctx.fillText('OVAL', CX, CY - 2);
  ctx.font = "700 8px 'JetBrains Mono', monospace";
  ctx.fillStyle = 'rgba(255,181,69,0.4)';
  ctx.fillText('TWO LAPS · NO BRAKES', CX, CY + 18);
  ctx.restore();

  // obstacles
  for (const ob of game.obstacles || []) {
    ctx.save();
    ctx.translate(ob.x, ob.y);
    ctx.rotate(ob.angle + t * 0.05);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(4, 7, ob.r * 1.1, ob.r * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c98a5b';
    ctx.strokeStyle = '#6d452b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-ob.r, -ob.r, ob.r * 2, ob.r * 2, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(20,24,28,0.7)';
    ctx.fillRect(-ob.r, -ob.r * 0.34, ob.r * 2, ob.r * 0.68);
    ctx.strokeStyle = '#ffb545';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(-ob.r + 4, -ob.r + 4, ob.r * 2 - 8, ob.r * 2 - 8);
    ctx.restore();
  }

  // boost pads
  for (const pad of game.boostPads || []) {
    ctx.save();
    ctx.translate(pad.x, pad.y);
    ctx.rotate(Math.atan2(Math.cos(pad.angle) * RACE.midB, -Math.sin(pad.angle) * RACE.midA));
    ctx.globalAlpha = game._cachePass ? 0.62 : 0.55 + Math.sin(t * 4 + pad.angle) * 0.15;
    ctx.fillStyle = 'rgba(92,225,198,0.15)';
    ctx.strokeStyle = '#5ce1c6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-24, -17, 48, 34, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5ce1c6';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 12 - 5, -10);
      ctx.lineTo(i * 12 + 4, 0);
      ctx.lineTo(i * 12 - 5, 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ambient dust (animated live)
  ctx.fillStyle = 'rgba(255,240,210,0.2)';
  for (let i = 0; i < 18 && !game._cachePass; i += 1) {
    const a = i * 1.7 + t * 0.04;
    const p = ellipsePoint(RACE.midA + Math.sin(i) * 30, RACE.midB + Math.cos(i) * 30, a);
    ctx.globalAlpha = 0.08 + (i % 5) * 0.03;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5 + (i % 3), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ══ BOSS ═══════════════════════════════════════════════════ */
export function drawBossArena(game, t) {
  const ctx = game.ctx;
  const R = game.ringR;

  // heat glow
  const halo = ctx.createRadialGradient(CX, CY, R * 0.5, CX, CY, R * 1.9);
  halo.addColorStop(0, 'rgba(255,93,93,0.06)');
  halo.addColorStop(0.55, 'rgba(90,25,20,0.14)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(CX - 650, CY - 650, 1300, 1300);

  crowd(ctx, CX, CY, R + 54, R + 36, t, 0.22, 0.85);

  // lava fissures outside
  ctx.save();
  for (let i = 0; i < 7; i += 1) {
    const a = i * 0.93 + 0.2;
    ctx.strokeStyle = `rgba(255,90,45,${0.12 + Math.sin(t * 2 + i) * 0.05})`;
    ctx.lineWidth = 3 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * (R + 24), CY + Math.sin(a) * (R + 24));
    for (let k = 0; k < 4; k += 1) {
      const r = R + 24 + k * 32;
      const aa = a + Math.sin(k * 1.7 + i) * 0.16;
      ctx.lineTo(CX + Math.cos(aa) * r, CY + Math.sin(aa) * r);
    }
    ctx.stroke();
  }
  ctx.restore();

  // platform shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = '#0a0c10';
  ctx.beginPath();
  ctx.arc(CX, CY + 10, R + 18, 0, TAU);
  ctx.fill();
  ctx.restore();

  // platform
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, TAU);
  ctx.clip();
  const floor = ctx.createRadialGradient(CX - 80, CY - 90, 20, CX, CY, R * 1.1);
  floor.addColorStop(0, '#332528');
  floor.addColorStop(0.4, '#241a1d');
  floor.addColorStop(0.8, '#151013');
  floor.addColorStop(1, '#0b080a');
  ctx.fillStyle = floor;
  ctx.fillRect(CX - R, CY - R, R * 2, R * 2);

  // hex / tile pattern
  ctx.strokeStyle = 'rgba(255,120,90,0.07)';
  ctx.lineWidth = 1.2;
  const sz = 58;
  for (let x = CX - R; x < CX + R; x += sz) {
    for (let y = CY - R; y < CY + R; y += sz) {
      ctx.beginPath();
      ctx.moveTo(x + sz / 2, y);
      ctx.lineTo(x + sz, y + sz / 4);
      ctx.lineTo(x + sz, y + (sz * 3) / 4);
      ctx.lineTo(x + sz / 2, y + sz);
      ctx.lineTo(x, y + (sz * 3) / 4);
      ctx.lineTo(x, y + sz / 4);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // cracks
  if (!game._bossCracks) {
    game._bossCracks = Array.from({ length: 9 }, (_, i) => {
      const a = i * 1.4 + Math.random();
      const pts = [{ x: CX + Math.cos(a) * 20, y: CY + Math.sin(a) * 20 }];
      for (let k = 1; k < 5; k += 1) {
        const r = (k / 5) * R * 0.95;
        const aa = a + (Math.random() - 0.5) * 0.3;
        pts.push({ x: CX + Math.cos(aa) * r, y: CY + Math.sin(aa) * r });
      }
      return pts;
    });
  }
  ctx.strokeStyle = `rgba(255,110,60,${0.12 + Math.sin(t * 3) * 0.04})`;
  ctx.lineWidth = 2;
  for (const pts of game._bossCracks) {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }

  // centre warning circle
  ctx.strokeStyle = 'rgba(255,93,93,0.14)';
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 20]);
  ctx.beginPath();
  ctx.arc(CX, CY, 170, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // emblem
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ff6b3d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CX, CY, 62, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX - 44, CY);
  ctx.lineTo(CX + 44, CY);
  ctx.moveTo(CX, CY - 44);
  ctx.lineTo(CX, CY + 44);
  ctx.stroke();
  ctx.font = "800 13px 'Bricolage Grotesque', sans-serif";
  ctx.fillStyle = 'rgba(255,120,90,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('CORE', CX, CY + 4);
  ctx.globalAlpha = 1;
  ctx.restore();

  // rim
  for (let i = 0; i < 36; i += 1) {
    const a0 = (i / 36) * TAU;
    const a1 = ((i + 1) / 36) * TAU;
    ctx.strokeStyle = i % 3 === 0 ? '#ff6b3d' : '#2a1a1c';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(CX, CY, R + 4, a0 + 0.006, a1 - 0.006);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(255,93,93,${0.2 + Math.sin(t * 4) * 0.08})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CX, CY, R + 11, 0, TAU);
  ctx.stroke();

  // corner labels
  ctx.save();
  ctx.font = "700 8px 'JetBrains Mono', monospace";
  ctx.fillStyle = 'rgba(255,140,120,0.3)';
  ctx.fillText('WARDEN CONTAINMENT // BAY 03', CX - R + 6, CY + R + 36);
  ctx.textAlign = 'right';
  ctx.fillText('DO NOT FEED', CX + R - 6, CY + R + 36);
  ctx.restore();
}

/* ══ SHOWCASE ═══════════════════════════════════════════════ */
export function drawShowcaseArena(game, t) {
  const ctx = game.ctx;

  // ballroom darkness
  ctx.fillStyle = '#07090d';
  ctx.fillRect(CX - 900, CY - 700, 1800, 1400);

  // audience
  crowd(ctx, CX, CY + 20, 330, 270, t, 0.34, 0.9);

  // spotlights
  const beams = [
    { x: CX - 330, color: 'rgba(255,181,69,0.07)' },
    { x: CX + 330, color: 'rgba(103,232,249,0.055)' },
    { x: CX, color: 'rgba(255,158,210,0.05)' },
  ];
  for (const b of beams) {
    const g = ctx.createLinearGradient(b.x, -260, CX, CY + 120);
    g.addColorStop(0, b.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(b.x - 26, -260);
    ctx.lineTo(b.x + 26, -260);
    ctx.lineTo(CX + 130, CY + 110);
    ctx.lineTo(CX - 130, CY + 110);
    ctx.closePath();
    ctx.fill();
  }

  // stage shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = '#0b0e13';
  ctx.beginPath();
  ctx.ellipse(CX, CY + 60, 380, 300, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // stage disc
  const stage = ctx.createRadialGradient(CX, CY + 20, 30, CX, CY + 40, 430);
  stage.addColorStop(0, '#242c36');
  stage.addColorStop(0.55, '#161c24');
  stage.addColorStop(1, '#0a0d12');
  ctx.fillStyle = stage;
  ctx.beginPath();
  ctx.ellipse(CX, CY + 50, 375, 295, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,181,69,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(CX, CY + 50, 375, 295, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(247,242,232,0.05)';
  ctx.setLineDash([10, 16]);
  ctx.beginPath();
  ctx.ellipse(CX, CY + 50, 330, 250, 0, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // stage grid
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(CX, CY + 50, 375, 295, 0, 0, TAU);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.022)';
  for (let x = CX - 380; x < CX + 380; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, CY - 250);
    ctx.lineTo(x, CY + 350);
    ctx.stroke();
  }
  for (let y = CY - 250; y < CY + 350; y += 46) {
    ctx.beginPath();
    ctx.moveTo(CX - 380, y);
    ctx.lineTo(CX + 380, y);
    ctx.stroke();
  }
  ctx.restore();

  // banner
  ctx.save();
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.65;
  ctx.font = "800 46px 'Bricolage Grotesque', sans-serif";
  ctx.fillStyle = 'rgba(255,181,69,0.12)';
  ctx.fillText('LIVE', CX, CY - 250);
  ctx.font = "700 9px 'JetBrains Mono', monospace";
  ctx.fillStyle = 'rgba(255,181,69,0.45)';
  ctx.fillText('SMITH SHOWCASE · LOWER FOUNDRY', CX, CY - 225);
  ctx.restore();

  // pedestals for rivals
  for (const r of game.showcaseRivals || []) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y + 44, 46, 14, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b222b';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y + 40, 40, 12, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,181,69,0.35)';
    ctx.fillRect(r.x - 30, r.y + 38, 60, 2);
    ctx.restore();
  }

  // player pedestal
  ctx.save();
  const pg = ctx.createRadialGradient(CX, CY + 210, 10, CX, CY + 210, 170);
  pg.addColorStop(0, 'rgba(255,181,69,0.13)');
  pg.addColorStop(1, 'rgba(255,181,69,0)');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(CX, CY + 210, 170, 58, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,181,69,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(CX, CY + 208, 102, 34, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,181,69,0.55)';
  ctx.font = "700 7px 'JetBrains Mono', monospace";
  ctx.textAlign = 'center';
  ctx.fillText('YOUR BALL · LIVE', CX, CY + 254);
  ctx.restore();

  // confetti / stars (animated live)
  for (let i = 0; i < 26 && !game._cachePass; i += 1) {
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
}
