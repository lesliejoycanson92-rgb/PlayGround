/* Shared world constants & helpers for the arena engine. */

export const W = 1200;
export const H = 780;
export const CX = 600;
export const CY = 390;
export const TAU = Math.PI * 2;

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const distXY = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
export const norm = (x, y) => {
  const d = Math.hypot(x, y);
  return d > 0.0001 ? { x: x / d, y: y / d, d } : { x: 0, y: 0, d: 0 };
};
export const rand = (a, b) => a + Math.random() * (b - a);
export const choose = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export const RACE = {
  outerA: 512, outerB: 318,
  innerA: 368, innerB: 184,
  midA: 440, midB: 251,
};

export const CROWD = Array.from({ length: 120 }, (_, i) => ({
  angle: (i / 120) * TAU + Math.random() * 0.04,
  r: 0.5 + Math.random() * 1.1,
  size: 1 + Math.random() * 2.8,
  color: choose(['#ffb545', '#67e8f9', '#ff9ed2', '#a7f36b', '#c084fc', '#f7f2e8']),
  phase: Math.random() * TAU,
}));

export const CHAT = [
  ['GLOWPOP', 'that pattern is CRIMINAL. love it.'],
  ['BONK', '10/10 would get shoved by this ball'],
  ['MOTH', 'the hat is carrying the whole build'],
  ['NEEDLE', 'budget wizard. disgusting.'],
  ['TINY', 'core says fire. face says trust issues.'],
  ['RUSTY', 'i have fought worse. not today, though.'],
  ['PIP', 'one more roll. i can fix it.'],
];

export const ellipsePoint = (a, b, theta) => ({
  x: CX + Math.cos(theta) * a,
  y: CY + Math.sin(theta) * b,
});

export const ellipseTheta = (x, y, a = RACE.midA, b = RACE.midB) => Math.atan2((y - CY) / b, (x - CX) / a);

export function circleText(ctx, text, x, y, size, color, align = 'center') {
  ctx.save();
  ctx.font = `700 ${size}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}
