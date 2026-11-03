// All sound effects are synthesized with WebAudio — no external audio files.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
export let muted = false;

function ac(): AudioContext | null {
  if (!ctx) {
    const C = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx!.createGain();
    master.gain.value = 0.55;
    master.connect(ctx!.destination);
    noiseBuf = ctx!.createBuffer(1, ctx!.sampleRate, ctx!.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { ac(); }
export function setMuted(m: boolean) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; }

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0, slideTo?: number) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master!);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur: number, vol = 0.3, filterFreq = 1200, type: BiquadFilterType = 'lowpass', delay = 0, q = 1) {
  const c = ac(); if (!c || muted || !noiseBuf) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.value = filterFreq; f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master!);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

export const sfx = {
  click() { tone(660, 0.07, 'triangle', 0.18); },
  coin() { tone(988, 0.08, 'square', 0.12); tone(1319, 0.25, 'square', 0.12, 0.07); },
  cheer() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, i * 0.09));
    tone(1319, 0.5, 'sine', 0.18, 0.36);
    noise(0.9, 0.12, 2500, 'bandpass', 0.2, 0.7); // crowd-ish "yay"
  },
  tryAgain() { tone(440, 0.18, 'sine', 0.2); tone(392, 0.3, 'sine', 0.2, 0.16); },
  listen() { tone(880, 0.08, 'sine', 0.15); tone(1175, 0.1, 'sine', 0.15, 0.08); },
  train() { tone(330, 0.08, 'square', 0.12); tone(494, 0.12, 'square', 0.12, 0.06); noise(0.1, 0.1, 3000, 'highpass'); },
  deploy() { tone(220, 0.08, 'triangle', 0.18, 0, 330); noise(0.12, 0.12, 900); },
  sword() { noise(0.08, 0.25, 4000, 'highpass'); tone(1800 + Math.random() * 600, 0.12, 'triangle', 0.06); },
  hit() { noise(0.1, 0.25, 600); tone(120, 0.08, 'sine', 0.2, 0, 60); },
  arrow() { noise(0.18, 0.12, 2200, 'bandpass', 0, 3); },
  launch() { tone(140, 0.25, 'sawtooth', 0.12, 0, 60); noise(0.25, 0.15, 500); },
  boom() { noise(0.6, 0.5, 400); tone(80, 0.5, 'sine', 0.4, 0, 30); },
  crumble() { noise(0.9, 0.45, 300); noise(0.5, 0.2, 1200, 'bandpass', 0.15); tone(60, 0.6, 'sine', 0.3, 0, 30); },
  death() { tone(300, 0.25, 'triangle', 0.12, 0, 120); },
  victory() {
    const notes = [523, 523, 523, 659, 784, 659, 784, 1047];
    const times = [0, 0.12, 0.24, 0.36, 0.6, 0.84, 0.96, 1.2];
    notes.forEach((f, i) => { tone(f, 0.35, 'square', 0.1, times[i]); tone(f / 2, 0.35, 'triangle', 0.12, times[i]); });
    noise(1.6, 0.1, 2500, 'bandpass', 1.2, 0.6);
  },
  defeat() { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.4, 'triangle', 0.16, i * 0.25)); },
  star(i: number) { tone(784 + i * 196, 0.35, 'square', 0.12); tone(1568 + i * 392, 0.4, 'sine', 0.1, 0.05); },
  horn() { tone(196, 0.9, 'sawtooth', 0.1, 0, 220); tone(294, 0.9, 'sawtooth', 0.08, 0.05, 330); },
};
