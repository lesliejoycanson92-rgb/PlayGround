/* Tiny procedural audio engine — no external assets. */

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicMode = 'workshop';
    this.step = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  tone({ freq = 440, dur = 0.12, type = 'sine', gain = 0.16, slide = 0, delay = 0, detune = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    if (detune) osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  noise(dur = 0.12, gain = 0.12, freq = 900, type = 'lowpass') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  click() {
    this.ensure();
    this.tone({ freq: 620, dur: 0.055, type: 'triangle', gain: 0.08, slide: 120 });
  }

  hover() {
    this.tone({ freq: 880, dur: 0.03, type: 'sine', gain: 0.025 });
  }

  equip() {
    this.ensure();
    this.tone({ freq: 330, dur: 0.09, type: 'square', gain: 0.05 });
    this.tone({ freq: 494, dur: 0.12, type: 'triangle', gain: 0.07, delay: 0.06 });
  }

  unequip() {
    this.tone({ freq: 420, dur: 0.07, type: 'square', gain: 0.04, slide: -120 });
  }

  denied() {
    this.tone({ freq: 170, dur: 0.11, type: 'sawtooth', gain: 0.05 });
    this.tone({ freq: 150, dur: 0.14, type: 'sawtooth', gain: 0.04, delay: 0.08 });
  }

  coin() {
    this.ensure();
    this.tone({ freq: NOTE(84), dur: 0.08, type: 'triangle', gain: 0.08 });
    this.tone({ freq: NOTE(91), dur: 0.15, type: 'triangle', gain: 0.06, delay: 0.06 });
  }

  bump(power = 1) {
    const p = Math.min(2, power);
    this.noise(0.09 + p * 0.04, 0.06 + p * 0.05, 420 + p * 300);
    this.tone({ freq: 100 + p * 55, dur: 0.13, type: 'sine', gain: 0.1 * p, slide: -40 });
  }

  dash() {
    this.noise(0.18, 0.06, 1400, 'bandpass');
    this.tone({ freq: 180, dur: 0.16, type: 'sawtooth', gain: 0.05, slide: 300 });
  }

  core(kind) {
    this.ensure();
    const base = { fire: 220, ice: 660, electric: 330, gravity: 110 }[kind] || 220;
    this.noise(0.3, 0.06, 600);
    for (let i = 0; i < 4; i += 1) {
      this.tone({
        freq: base * (1 + i * 0.5), dur: 0.25, type: i % 2 ? 'triangle' : 'sine',
        gain: 0.09, delay: i * 0.035, slide: 80,
      });
    }
  }

  hit(power = 1) {
    this.bump(Math.max(0.6, power * 0.7));
    this.tone({ freq: 900, dur: 0.05, type: 'square', gain: 0.03, slide: -300 });
  }

  ringout() {
    this.ensure();
    this.tone({ freq: 300, dur: 0.5, type: 'sawtooth', gain: 0.08, slide: -220 });
    this.noise(0.5, 0.09, 500);
  }

  win() {
    this.ensure();
    const seq = [60, 64, 67, 72, 76];
    seq.forEach((n, i) => {
      this.tone({ freq: NOTE(n), dur: 0.22, type: 'triangle', gain: 0.12, delay: i * 0.12 });
      this.tone({ freq: NOTE(n + 12), dur: 0.2, type: 'sine', gain: 0.05, delay: i * 0.12 + 0.02 });
    });
  }

  lose() {
    this.ensure();
    const seq = [60, 57, 53, 48];
    seq.forEach((n, i) => {
      this.tone({ freq: NOTE(n), dur: 0.28, type: 'sawtooth', gain: 0.08, delay: i * 0.15 });
    });
  }

  unlock() {
    this.ensure();
    this.tone({ freq: 440, dur: 0.1, type: 'triangle', gain: 0.1 });
    this.tone({ freq: 660, dur: 0.12, type: 'triangle', gain: 0.09, delay: 0.08 });
    this.tone({ freq: 880, dur: 0.26, type: 'sine', gain: 0.1, delay: 0.17 });
  }

  voice(mood = 'bold', voiceId = 'squeak') {
    this.ensure();
    const pitch = { squeak: 1.7, baritone: 0.6, glitch: 1.05, choir: 0.95 }[voiceId] || 1;
    const base = { angry: 130, calm: 240, scared: 330, bold: 190, giddy: 300 }[mood] || 200;
    const type = { squeak: 'triangle', baritone: 'sine', glitch: 'square', choir: 'sine' }[voiceId] || 'triangle';
    this.tone({ freq: base * pitch, dur: 0.11, type, gain: 0.07, slide: 70 * pitch });
    this.tone({ freq: base * pitch * 0.82, dur: 0.14, type, gain: 0.05, delay: 0.1, slide: -30 });
  }

  startMusic(mode = 'workshop') {
    this.ensure();
    if (!this.ctx) return;
    if (this.musicMode === mode && this.musicTimer) return;
    this.musicMode = mode;
    if (this.musicTimer) clearInterval(this.musicTimer);
    const sequences = {
      workshop: [48, 55, 53, 51],
      arena: [45, 48, 45, 43, 50, 48, 45, 41],
      boss: [40, 40, 43, 40, 38, 40, 46, 43],
    };
    const seq = sequences[mode] || sequences.workshop;
    const tempo = mode === 'workshop' ? 1400 : 560;
    this.step = 0;
    const play = () => {
      if (!this.ctx || this.muted) return;
      const n = seq[this.step % seq.length];
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = mode === 'boss' ? 380 : 620;
      osc.type = mode === 'workshop' ? 'sine' : 'triangle';
      osc.frequency.value = NOTE(n);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(mode === 'workshop' ? 0.018 : 0.035, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + tempo / 1000 * 0.9);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + tempo / 1000);
      if (mode !== 'workshop' && this.step % 2 === 0) {
        const hat = this.ctx.createBufferSource();
        const len = Math.floor(this.ctx.sampleRate * 0.04);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        hat.buffer = buf;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6000;
        const hg = this.ctx.createGain();
        hg.gain.value = 0.018;
        hat.connect(hp); hp.connect(hg); hg.connect(this.master);
        hat.start(t);
      }
      this.step += 1;
    };
    play();
    this.musicTimer = setInterval(play, tempo);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicMode = null;
  }
}

export const audio = new AudioEngine();
