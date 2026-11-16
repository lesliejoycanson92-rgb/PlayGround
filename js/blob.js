/* Organic ball renderer — used by the workshop preview and all arenas. */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function mix(hexA, hexB, amount) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const c = (x, y) => Math.round(x + (y - x) * amount);
  return `rgb(${c(a.r, b.r)},${c(a.g, b.g)},${c(a.b, b.b)})`;
}

export const lighten = (hex, amt) => mix(hex, '#ffffff', amt);
export const darken = (hex, amt) => mix(hex, '#05070a', amt);
export function alpha(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function blobPath(ctx, r, t, wobble = 1, points = 44) {
  ctx.beginPath();
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const wob = 1 + (Math.sin(a * 3 + t * 1.3) * 0.016 + Math.sin(a * 5 - t * 1.9) * 0.011) * wobble;
    const x = Math.cos(a) * r * wob;
    const y = Math.sin(a) * r * wob;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawPattern(ctx, config, r, accent) {
  const pat = config.pattern;
  if (!pat || pat === 'solid') return;
  ctx.save();
  blobPath(ctx, r * 0.995, 0, 0);
  ctx.clip();
  if (pat === 'split') {
    ctx.fillStyle = alpha(accent, 0.88);
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, -r * 0.1);
    ctx.quadraticCurveTo(0, -r * 0.35, r * 1.2, r * 0.05);
    ctx.lineTo(r * 1.2, r * 1.2);
    ctx.lineTo(-r * 1.2, r * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = alpha('#ffffff', 0.22);
    ctx.lineWidth = Math.max(1.4, r * 0.025);
    ctx.stroke();
  } else if (pat === 'dots') {
    ctx.fillStyle = alpha(accent, 0.55);
    for (let yy = -r; yy < r * 1.1; yy += r * 0.33) {
      for (let xx = -r; xx < r * 1.1; xx += r * 0.33) {
        const off = (Math.round(yy / (r * 0.33)) % 2) * r * 0.16;
        ctx.beginPath();
        ctx.arc(xx + off, yy, r * 0.075, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pat === 'stripes') {
    ctx.strokeStyle = alpha(accent, 0.6);
    ctx.lineWidth = r * 0.17;
    for (let i = -6; i < 8; i += 1) {
      ctx.beginPath();
      const x = i * r * 0.36;
      ctx.moveTo(x - r, -r * 1.3);
      ctx.lineTo(x + r * 0.9, r * 1.3);
      ctx.stroke();
    }
  } else if (pat === 'swirl') {
    ctx.strokeStyle = alpha(accent, 0.6);
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k += 1) {
      ctx.beginPath();
      for (let i = 0; i < 42; i += 1) {
        const a = i * 0.2 + k * 2.1;
        const rad = (i / 42) * r * 0.98;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (pat === 'checker') {
    ctx.fillStyle = alpha(accent, 0.48);
    const s = r * 0.3;
    for (let yy = -5; yy < 5; yy += 1) {
      for (let xx = -5; xx < 5; xx += 1) {
        if ((xx + yy) % 2 === 0) ctx.fillRect(xx * s, yy * s, s, s);
      }
    }
  } else if (pat === 'stars') {
    ctx.fillStyle = alpha(accent, 0.62);
    const rnd = rng(hashString(config.name + config.pattern + config.accent));
    for (let i = 0; i < 16; i += 1) {
      const x = (rnd() * 2 - 1) * r;
      const y = (rnd() * 2 - 1) * r;
      const s = r * (0.045 + rnd() * 0.05);
      ctx.beginPath();
      for (let k = 0; k < 8; k += 1) {
        const a = (k / 8) * Math.PI * 2;
        const rad = k % 2 === 0 ? s : s * 0.4;
        if (k === 0) ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
        else ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else if (pat === 'hazard') {
    ctx.fillStyle = alpha(accent, 0.5);
    for (let i = -8; i < 10; i += 2) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.24, -r * 1.2);
      ctx.lineTo(i * r * 0.24 + r * 0.12, -r * 1.2);
      ctx.lineTo(i * r * 0.24 + r * 1.2, r * 1.2);
      ctx.lineTo(i * r * 0.24 + r * 1.08, r * 1.2);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTexture(ctx, config, r, color) {
  const tex = config.texture;
  ctx.save();
  blobPath(ctx, r * 0.99, 0, 0);
  ctx.clip();
  if (tex === 'pearl') {
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,0.24)');
    g.addColorStop(0.4, 'rgba(120,220,255,0.08)');
    g.addColorStop(0.7, 'rgba(255,150,220,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
  } else if (tex === 'grit') {
    const rnd = rng(hashString(config.name + 'grit'));
    ctx.fillStyle = alpha('#1b2027', 0.28);
    for (let i = 0; i < 42; i += 1) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * r;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.008 + rnd() * 0.016), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tex === 'matte') {
    ctx.fillStyle = 'rgba(10,12,16,0.12)';
    ctx.fillRect(-r, -r, r * 2, r * 2);
  }
  ctx.restore();

  if (tex === 'gloss' || tex === 'pearl') {
    const hi = ctx.createRadialGradient(-r * 0.36, -r * 0.44, 0, -r * 0.36, -r * 0.44, r * 0.8);
    hi.addColorStop(0, `rgba(255,255,255,${tex === 'gloss' ? 0.55 : 0.38})`);
    hi.addColorStop(0.5, 'rgba(255,255,255,0.09)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.ellipse(-r * 0.33, -r * 0.4, r * 0.52, r * 0.31, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.47, r * 0.14, r * 0.065, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (tex === 'gloss') {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = Math.max(1.5, r * 0.035);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.86, r * 0.86, 0, Math.PI * 0.15, Math.PI * 0.62);
    ctx.stroke();
  }
  if (tex === 'grit') {
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = Math.max(1, r * 0.02);
    ctx.beginPath();
    ctx.ellipse(r * 0.2, r * 0.25, r * 0.5, r * 0.34, 0.7, 0, Math.PI * 0.5);
    ctx.stroke();
  }
}

function starPath(ctx, x, y, outer, inner, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? outer : inner;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    else ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}

function drawEyes(ctx, config, r, t, look, blink, expression) {
  const mood = config.mood;
  const eyeY = -r * 0.16;
  const ex = r * 0.31;
  const iris = config.accent;
  const blinkNow = blink || (Math.sin(t * 0.9 + 1.4) > 0.995) || (Math.sin(t * 1.7 + 4.2) > 0.998);
  const lid = Math.max(0.12, Math.abs(blinkNow ? 0.06 : 1));
  const lx = look ? look.x : Math.sin(t * 0.5) * 0.4;
  const ly = look ? look.y : Math.cos(t * 0.7) * 0.3;
  const gaze = { x: lx * r * 0.075, y: ly * r * 0.06 };

  ctx.save();
  ctx.lineCap = 'round';
  const style = config.eyes;

  if (style === 'visor') {
    ctx.fillStyle = 'rgba(8,12,16,0.88)';
    ctx.beginPath();
    ctx.roundRect(-r * 0.58, eyeY - r * 0.18, r * 1.16, r * 0.36, r * 0.16);
    ctx.fill();
    ctx.strokeStyle = alpha(config.glow > 0.2 ? config.accent : '#67e8f9', 0.85);
    ctx.lineWidth = Math.max(1.5, r * 0.03);
    ctx.stroke();
    const glow = config.glow > 0.2 ? config.accent : '#67e8f9';
    ctx.fillStyle = glow;
    ctx.shadowColor = glow;
    ctx.shadowBlur = r * 0.25;
    ctx.beginPath();
    ctx.roundRect(-r * 0.38 + gaze.x, eyeY - r * 0.06, r * 0.22, r * 0.12, r * 0.06);
    ctx.roundRect(r * 0.16 + gaze.x, eyeY - r * 0.06, r * 0.22, r * 0.12, r * 0.06);
    ctx.fill();
    ctx.restore();
    return;
  }

  for (const side of [-1, 1]) {
    const cx = side * ex;
    const w = style === 'wide' ? r * 0.24 : style === 'sleepy' ? r * 0.22 : r * 0.2;
    const h = style === 'wide' ? r * 0.3 : r * 0.24;
    const sy = lid;
    ctx.save();
    ctx.translate(cx, eyeY);
    if (style === 'grumpy' || mood === 'angry') {
      ctx.rotate(side * -0.14);
    }
    ctx.fillStyle = '#f7f2e8';
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10141a';
    if (style === 'star' && !blinkNow) {
      ctx.shadowColor = config.accent;
      ctx.shadowBlur = r * 0.2;
      starPath(ctx, gaze.x, gaze.y, w * 0.8, w * 0.34, 5);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.beginPath();
      ctx.ellipse(gaze.x, gaze.y + h * 0.06, w * 0.48, Math.min(h * 0.62, w * 0.56) * sy, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!blinkNow) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(gaze.x - w * 0.18, gaze.y - h * 0.12, Math.max(1.2, w * 0.13), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (style === 'sleepy') {
      ctx.fillStyle = alpha(config.color, 1);
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.38, w * 1.06, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10141a';
      ctx.lineWidth = Math.max(1.4, r * 0.025);
      ctx.beginPath();
      ctx.arc(0, -h * 0.15, w * 0.9, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
    ctx.restore();

    // brows for mood
    if (style !== 'sleepy') {
      ctx.strokeStyle = 'rgba(15,19,24,0.7)';
      ctx.lineWidth = Math.max(1.5, r * 0.032);
      ctx.beginPath();
      if (mood === 'angry') {
        ctx.moveTo(cx - side * w * 0.8, eyeY - h * 1.15);
        ctx.lineTo(cx + side * w * 0.45, eyeY - h * 0.72);
      } else if (mood === 'scared') {
        ctx.moveTo(cx - side * w * 0.7, eyeY - h * 1.3);
        ctx.lineTo(cx + side * w * 0.55, eyeY - h * 1.22);
      } else if (mood === 'giddy') {
        ctx.moveTo(cx - side * w * 0.65, eyeY - h * 1.22);
        ctx.quadraticCurveTo(cx, eyeY - h * 1.5, cx + side * w * 0.6, eyeY - h * 1.15);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawMouth(ctx, config, r, t, expression) {
  const mood = config.mood;
  let style = config.mouth;
  if (expression === 'hit') style = 'ooo';
  if (expression === 'happy') style = 'grin';
  if (expression === 'ko') style = 'flat';
  const y = r * 0.26;
  const w = r * 0.17;
  const dark = 'rgba(22,15,18,0.82)';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1.8, r * 0.038);
  if (style === 'smile' || style === 'grin' || style === 'fangs') {
    const grin = style !== 'smile';
    ctx.beginPath();
    ctx.arc(0, y - r * 0.03, w * (grin ? 1.45 : 1.25), 0.18 * Math.PI, 0.82 * Math.PI);
    if (grin) {
      ctx.quadraticCurveTo(0, y + r * 0.13, -w * 1.38, y + r * 0.06);
      ctx.closePath();
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.strokeStyle = alpha('#ffffff', 0.22);
      ctx.lineWidth = 1;
      ctx.stroke();
      if (style === 'fangs') {
        ctx.fillStyle = '#f7f2e8';
        ctx.beginPath();
        ctx.moveTo(-w * 0.95, y + r * 0.01);
        ctx.lineTo(-w * 0.6, y + r * 0.13);
        ctx.lineTo(-w * 0.32, y + r * 0.01);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(w * 0.24, y + r * 0.01);
        ctx.lineTo(w * 0.52, y + r * 0.13);
        ctx.lineTo(w * 0.8, y + r * 0.01);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w, y + r * 0.02);
        ctx.lineTo(w, y + r * 0.02);
        ctx.stroke();
      }
    } else {
      ctx.stroke();
    }
  } else if (style === 'ooo') {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(0, y + r * 0.02, w * 0.6, w * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,120,130,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, y + r * 0.06, w * 0.32, w * 0.33, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'flat') {
    ctx.beginPath();
    if (mood === 'scared') {
      ctx.moveTo(-w, y + r * 0.01);
      for (let i = 1; i <= 6; i += 1) {
        ctx.lineTo(-w + (i * w * 2) / 6, y + (i % 2 ? -1 : 1) * r * 0.035);
      }
    } else {
      ctx.moveTo(-w, y);
      ctx.quadraticCurveTo(0, y + r * 0.01, w, y);
    }
    ctx.stroke();
  } else if (style === 'zigzag') {
    ctx.beginPath();
    ctx.moveTo(-w, y);
    for (let i = 1; i <= 5; i += 1) {
      ctx.lineTo(-w + (i * w * 2) / 5, y + (i % 2 ? -1 : 1) * r * 0.055);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoreBadge(ctx, config, r, t) {
  const colors = { fire: '#ff6b3d', ice: '#67e8f9', electric: '#c084fc', gravity: '#8b5cf6' };
  const c = colors[config.core] || '#ffb545';
  const x = -r * 0.62;
  const y = r * 0.6;
  const s = r * 0.16;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = c;
  ctx.shadowBlur = r * 0.25;
  ctx.fillStyle = 'rgba(8,11,16,0.7)';
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alpha(c, 0.9);
  ctx.lineWidth = Math.max(1.2, r * 0.025);
  ctx.stroke();
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(1.3, r * 0.025);
  if (config.core === 'fire') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.quadraticCurveTo(s * 0.55, -s * 0.05, 0, s * 0.58);
    ctx.quadraticCurveTo(-s * 0.55, -s * 0.05, 0, -s * 0.6);
    ctx.fill();
  } else if (config.core === 'ice') {
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * s * 0.55, -Math.sin(a) * s * 0.55);
      ctx.lineTo(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55);
      ctx.stroke();
    }
  } else if (config.core === 'electric') {
    ctx.beginPath();
    ctx.moveTo(s * 0.18, -s * 0.62);
    ctx.lineTo(-s * 0.26, s * 0.06);
    ctx.lineTo(s * 0.06, s * 0.06);
    ctx.lineTo(-s * 0.14, s * 0.66);
    ctx.lineTo(s * 0.42, -s * 0.08);
    ctx.lineTo(s * 0.04, -s * 0.08);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.6, s * 0.26, t * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ── Gadget attachment drawing ─────────────────────────────────────────── */

function partColor(gadget) {
  return gadget.color || '#b9c6d6';
}

export function drawPart(ctx, kind, s, gadget, t, config) {
  const col = partColor(gadget);
  const dark = darken(col, 0.34);
  const light = lighten(col, 0.38);
  const line = Math.max(1.5, s * 0.09);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (kind) {
    case 'spike': {
      const grad = ctx.createLinearGradient(0, 0, s * 1.25, 0);
      grad.addColorStop(0, dark);
      grad.addColorStop(0.55, light);
      grad.addColorStop(1, '#f7f2e8');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.34);
      ctx.lineTo(s * 1.25, 0);
      ctx.lineTo(0, s * 0.34);
      ctx.quadraticCurveTo(-s * 0.1, 0, 0, -s * 0.34);
      ctx.fill();
      ctx.strokeStyle = 'rgba(8,11,16,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case 'drill': {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.32);
      ctx.lineTo(s * 1.15, 0);
      ctx.lineTo(0, s * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = light;
      ctx.lineWidth = line * 0.6;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(s * (0.25 + i * 0.25), -s * 0.22 + i * s * 0.12);
        ctx.lineTo(s * (0.1 + i * 0.25), s * 0.2 - i * s * 0.1);
        ctx.stroke();
      }
      break;
    }
    case 'arm': {
      ctx.strokeStyle = col;
      ctx.lineWidth = s * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.45, -s * 0.28, s * 0.95, 0);
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.strokeStyle = dark;
      ctx.lineWidth = line * 0.5;
      ctx.beginPath();
      ctx.arc(s * 1.02, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'leg': {
      const wob = Math.sin(t * 3 + s) * s * 0.04;
      ctx.strokeStyle = col;
      ctx.lineWidth = s * 0.26;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.72, wob);
      ctx.stroke();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(s * 0.9, wob + s * 0.05, s * 0.35, s * 0.19, 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'wing': {
      const flap = Math.sin(t * 5 + 1) * 0.12;
      ctx.save();
      ctx.rotate(flap);
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = alpha(col, 0.62 - i * 0.12);
        ctx.strokeStyle = alpha(light, 0.7);
        ctx.lineWidth = line * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * (0.5 + i * 0.16), -s * (0.42 + i * 0.12), s * (1.1 + i * 0.05), -s * (0.2 + i * 0.2));
        ctx.quadraticCurveTo(s * (0.62 + i * 0.1), s * (0.06 + i * 0.04), 0, 0);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'tentacle': {
      ctx.strokeStyle = col;
      ctx.lineWidth = s * 0.22;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const seg = 4;
      for (let i = 1; i <= seg; i += 1) {
        const p = i / seg;
        ctx.quadraticCurveTo(
          s * p * 0.9,
          Math.sin(t * 2 + i * 1.2) * s * 0.22 * p,
          s * p * 1.0,
          Math.sin(t * 2 + i * 1.6) * s * 0.3,
        );
      }
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(s, Math.sin(t * 2 + 4) * s * 0.12, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'spring': {
      ctx.strokeStyle = col;
      ctx.lineWidth = line;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const coils = 4;
      for (let i = 0; i < coils * 2; i += 1) {
        const x = s * 0.15 + (i / (coils * 2)) * s * 0.7;
        ctx.lineTo(x, (i % 2 ? 1 : -1) * s * 0.25);
      }
      ctx.lineTo(s * 0.96, 0);
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(s * 1.04, 0, s * 0.17, s * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tread': {
      ctx.save();
      ctx.translate(s * 0.36, 0);
      ctx.fillStyle = 'rgba(10,14,19,0.85)';
      ctx.beginPath();
      ctx.roundRect(-s * 0.5, -s * 0.32, s * 1.0, s * 0.64, s * 0.24);
      ctx.fill();
      ctx.strokeStyle = alpha(col, 0.85);
      ctx.lineWidth = line * 0.5;
      ctx.stroke();
      ctx.fillStyle = col;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.arc(i * s * 0.3, 0, s * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'hammer': {
      ctx.strokeStyle = dark;
      ctx.lineWidth = line;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.8, 0);
      ctx.stroke();
      ctx.save();
      ctx.translate(s * 0.88, 0);
      ctx.rotate(-0.28);
      ctx.fillStyle = col;
      ctx.strokeStyle = dark;
      ctx.lineWidth = line * 0.45;
      ctx.beginPath();
      ctx.roundRect(-s * 0.13, -s * 0.42, s * 0.44, s * 0.84, s * 0.08);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.fillRect(-s * 0.05, -s * 0.35, s * 0.08, s * 0.7);
      ctx.restore();
      break;
    }
    case 'saw': {
      ctx.save();
      ctx.translate(s * 0.55, 0);
      ctx.rotate(t * 7);
      ctx.fillStyle = col;
      ctx.beginPath();
      const teeth = 9;
      for (let i = 0; i < teeth * 2; i += 1) {
        const a = (i / (teeth * 2)) * Math.PI * 2;
        const rad = i % 2 === 0 ? s * 0.5 : s * 0.35;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(10,14,19,0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'tail': {
      ctx.strokeStyle = col;
      ctx.lineWidth = s * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.6, -s * 0.1, s * 0.9, s * 0.35);
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath();
      const tx = s * 0.95;
      const ty = s * 0.38;
      ctx.moveTo(tx, ty - s * 0.2);
      ctx.lineTo(tx + s * 0.3, ty + s * 0.05);
      ctx.lineTo(tx - s * 0.02, ty + s * 0.18);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'cannon': {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.roundRect(0, -s * 0.22, s * 0.95, s * 0.44, s * 0.1);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(s * 0.82, -s * 0.28, s * 0.22, s * 0.56, s * 0.06);
      ctx.fill();
      ctx.fillStyle = alpha(col, 0.5);
      ctx.beginPath();
      ctx.arc(s * 0.95, 0, s * (0.1 + Math.sin(t * 5) * 0.03), 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'eye': {
      ctx.fillStyle = '#f7f2e8';
      ctx.beginPath();
      ctx.ellipse(s * 0.45, 0, s * 0.48, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(s * 0.55, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10141a';
      ctx.beginPath();
      ctx.arc(s * 0.58, 0, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'fang': {
      ctx.fillStyle = '#f7f2e8';
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.28);
      ctx.lineTo(s * 0.72, -s * 0.06);
      ctx.lineTo(s * 0.2, s * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.22, s * 0.18);
      ctx.lineTo(s * 0.78, s * 0.24);
      ctx.lineTo(s * 0.24, s * 0.42);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'rocket': {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(0, -s * 0.18, s * 0.72, s * 0.36, s * 0.16);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(s * 0.42, -s * 0.18);
      ctx.lineTo(s * 0.64, -s * 0.36);
      ctx.lineTo(s * 0.72, -s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.42, s * 0.18);
      ctx.lineTo(s * 0.64, s * 0.36);
      ctx.lineTo(s * 0.72, s * 0.18);
      ctx.closePath();
      ctx.fill();
      const flame = s * (0.28 + Math.sin(t * 20) * 0.08);
      const fg = ctx.createLinearGradient(0, 0, -flame, 0);
      fg.addColorStop(0, 'rgba(255,220,120,0.95)');
      fg.addColorStop(0.5, 'rgba(255,120,50,0.7)');
      fg.addColorStop(1, 'rgba(255,80,50,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.16);
      ctx.lineTo(-flame, 0);
      ctx.lineTo(0, s * 0.16);
      ctx.fill();
      break;
    }
    case 'hook': {
      ctx.strokeStyle = col;
      ctx.lineWidth = line;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.5, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.62, s * 0.12, s * 0.28, Math.PI * 0.9, Math.PI * 2.15);
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(s * 0.9, s * 0.06, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bubble': {
      const r = s * 0.9;
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      g.addColorStop(0, 'rgba(255,255,255,0.22)');
      g.addColorStop(0.7, alpha(col, 0.1));
      g.addColorStop(1, alpha(col, 0.28));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s * 0.5, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = alpha(col, 0.55);
      ctx.lineWidth = line * 0.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(s * 0.5, 0, r * 0.8, Math.PI * 1.05, Math.PI * 1.6);
      ctx.stroke();
      break;
    }
    case 'magnet': {
      ctx.strokeStyle = col;
      ctx.lineWidth = s * 0.22;
      ctx.beginPath();
      ctx.arc(s * 0.5, 0, s * 0.34, Math.PI * 0.15, Math.PI * 1.1);
      ctx.stroke();
      ctx.strokeStyle = '#ff5d5d';
      ctx.beginPath();
      ctx.moveTo(s * 0.5 + Math.cos(Math.PI * 0.15) * s * 0.34, Math.sin(Math.PI * 0.15) * s * 0.34);
      ctx.lineTo(s * 0.5 + Math.cos(Math.PI * 0.15) * s * 0.34 + s * 0.2, Math.sin(Math.PI * 0.15) * s * 0.34);
      ctx.stroke();
      break;
    }
    case 'hat': {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.lineTo(s * 0.82, 0);
      ctx.lineTo(0, s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(s * 0.84, 0, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'orb': {
      ctx.shadowColor = col;
      ctx.shadowBlur = s * 0.5;
      const og = ctx.createRadialGradient(s * 0.4, -s * 0.2, 0, s * 0.5, 0, s * 0.48);
      og.addColorStop(0, light);
      og.addColorStop(0.6, col);
      og.addColorStop(1, dark);
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(s * 0.55, 0, s * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = alpha('#ffffff', 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s * 0.55, 0, s * 0.34, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();
      break;
    }
    case 'blade': {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.2);
      ctx.quadraticCurveTo(s * 0.8, -s * 0.55, s * 1.22, 0);
      ctx.quadraticCurveTo(s * 0.6, s * 0.06, 0, s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = alpha('#ffffff', 0.55);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(s * 0.18, -s * 0.08);
      ctx.quadraticCurveTo(s * 0.7, -s * 0.26, s * 1.02, -s * 0.02);
      ctx.stroke();
      break;
    }
    case 'claw': {
      ctx.strokeStyle = col;
      ctx.lineWidth = s * 0.18;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(s * 0.1, i * s * 0.16);
        ctx.quadraticCurveTo(s * 0.65, i * s * 0.36 - s * 0.1, s * 0.9, i * s * 0.34 + s * 0.18);
        ctx.stroke();
      }
      break;
    }
    case 'antenna': {
      ctx.strokeStyle = col;
      ctx.lineWidth = line * 0.65;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.4, -s * 0.18, s * 0.84, -s * 0.08);
      ctx.stroke();
      ctx.shadowColor = gadget.color;
      ctx.shadowBlur = s * 0.4;
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(s * 0.88, -s * 0.09, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    default: {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(s * 0.5, 0, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParts(ctx, layouts, r, t, config, behind, alphaMul = 1) {
  for (const part of layouts) {
    if (part.behind !== behind) continue;
    ctx.save();
    ctx.globalAlpha = alphaMul;
    ctx.rotate(part.angle);
    ctx.translate(r * part.dist, 0);
    if (part.flip) ctx.scale(1, -1);
    drawPart(ctx, part.gadget.visual, r * part.size, part.gadget, t, config);
    ctx.restore();
  }
}

/* Main blob draw */
export function drawBlob(ctx, opts) {
  const {
    x, y, r, config, t = 0, face = null, expression = null, alpha: opacity = 1,
    glow = 0, squashDir = null, speedRatio = 0, noShadow = false, blink = false,
    layouts = [], showParts = true,
  } = opts;

  const color = config.color || '#ffb545';
  const accent = config.accent || '#ff6b3d';
  const glowColor = { fire: '#ff6b3d', ice: '#67e8f9', electric: '#c084fc', gravity: '#8b5cf6' }[config.core] || color;
  const squash = config.squash ?? 0.3;

  ctx.save();
  ctx.globalAlpha = opacity;

  if (!noShadow) {
    const sh = ctx.createRadialGradient(x, y + r * 0.96, 0, x, y + r * 0.96, r * 1.1);
    sh.addColorStop(0, 'rgba(0,0,0,0.38)');
    sh.addColorStop(0.6, 'rgba(0,0,0,0.13)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.97, r * 0.92, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (config.glow > 0 || glow > 0) {
    const strength = (config.glow || 0) * 0.65 + glow;
    const g = ctx.createRadialGradient(x, y, r * 0.35, x, y, r * (1.5 + strength * 0.5));
    g.addColorStop(0, alpha(glowColor, 0.26 * Math.min(1, strength)));
    g.addColorStop(0.6, alpha(glowColor, 0.09 * Math.min(1, strength)));
    g.addColorStop(1, alpha(glowColor, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * (1.55 + strength * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  // aura ring when dashing / powered
  if (glow > 0.05) {
    ctx.strokeStyle = alpha(glowColor, Math.min(0.7, glow * 0.7));
    ctx.lineWidth = Math.max(1.4, r * 0.035);
    ctx.beginPath();
    ctx.arc(x, y, r * (1.18 + Math.sin(t * 3) * 0.03), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (showParts) {
    ctx.save();
    ctx.translate(x, y);
    if (squashDir !== null) {
      ctx.rotate(squashDir);
      ctx.scale(1 + speedRatio * 0.1, 1 - speedRatio * 0.07);
      ctx.rotate(-squashDir);
    } else {
      ctx.scale(1 + squash * 0.08, 1 - squash * 0.07);
    }
    drawParts(ctx, layouts, r, t, config, true);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y);
  if (squashDir !== null) {
    ctx.rotate(squashDir);
    ctx.scale(1 + speedRatio * 0.13, 1 - speedRatio * 0.1);
    ctx.rotate(-squashDir);
  } else {
    ctx.scale(1 + squash * 0.12, 1 - squash * 0.1);
  }

  const grad = ctx.createRadialGradient(-r * 0.34, -r * 0.42, r * 0.06, 0, 0, r * 1.16);
  grad.addColorStop(0, mix(color, '#ffffff', 0.48));
  grad.addColorStop(0.35, mix(color, '#ffffff', 0.16));
  grad.addColorStop(0.72, color);
  grad.addColorStop(1, darken(color, 0.4));
  ctx.fillStyle = grad;
  blobPath(ctx, r, t, 1);
  ctx.fill();

  if (config.material === 'metal') {
    const sheen = ctx.createLinearGradient(-r, -r, r, r);
    sheen.addColorStop(0, 'rgba(255,255,255,0.34)');
    sheen.addColorStop(0.28, 'rgba(255,255,255,0.04)');
    sheen.addColorStop(0.52, 'rgba(0,0,0,0.18)');
    sheen.addColorStop(0.7, 'rgba(255,255,255,0.1)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = sheen;
    blobPath(ctx, r, t, 1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1.2, r * 0.024);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.72, r * 0.72, -0.5, Math.PI * 1.15, Math.PI * 1.52);
    ctx.stroke();
  } else if (config.material === 'jelly') {
    ctx.globalAlpha = opacity * 0.35;
    ctx.fillStyle = lighten(color, 0.55);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.12, r * 0.72, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = Math.max(1.4, r * 0.03);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.9, r * 0.9, 0, Math.PI * 0.1, Math.PI * 0.5);
    ctx.stroke();
  } else if (config.material === 'stone') {
    const rnd = rng(hashString(config.name + 'stone'));
    ctx.fillStyle = 'rgba(20,24,28,0.24)';
    for (let i = 0; i < 26; i += 1) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * r * 0.86;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * (0.012 + rnd() * 0.03), r * (0.008 + rnd() * 0.018), rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPattern(ctx, config, r, accent);
  drawTexture(ctx, config, r, color);

  ctx.strokeStyle = 'rgba(8,11,15,0.28)';
  ctx.lineWidth = Math.max(1.5, r * 0.03);
  blobPath(ctx, r * 0.985, t, 1);
  ctx.stroke();

  if ((config.glow || 0) > 0.12) {
    ctx.strokeStyle = alpha(glowColor, Math.min(0.7, config.glow * 0.55));
    ctx.lineWidth = Math.max(1, r * 0.02);
    blobPath(ctx, r * 0.93, t, 1);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.38, -r * 0.45, r * 0.22, r * 0.1, -0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  drawEyes(ctx, config, r, t, face, blink, expression);
  drawMouth(ctx, config, r, t, expression);
  drawCoreBadge(ctx, config, r, t);

  if (showParts) {
    ctx.save();
    ctx.translate(x, y);
    if (squashDir !== null) {
      ctx.rotate(squashDir);
      ctx.scale(1 + speedRatio * 0.13, 1 - speedRatio * 0.1);
      ctx.rotate(-squashDir);
    } else {
      ctx.scale(1 + squash * 0.12, 1 - squash * 0.1);
    }
    drawParts(ctx, layouts, r, t, config, false);
    ctx.restore();
  }

  ctx.restore();
}

/* Small portrait used by cards / results */
export function drawPortrait(canvas, config, layouts, size = 96) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);
  drawBlob(ctx, {
    x: size / 2, y: size * 0.53, r: size * 0.32, config,
    t: 1.1, layouts, squashDir: null, showParts: true,
  });
}
