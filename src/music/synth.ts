// NES-flavoured voices on any BaseAudioContext (live AudioContext or OfflineAudioContext).
import { hz, NoteEv, DrumEv } from './notation';
import type { Track, Duty } from './tracks';

const waves = new WeakMap<BaseAudioContext, Map<Duty, PeriodicWave>>();
const noises = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Band-limited pulse wave with the given duty cycle (12.5% / 25% / 50% like the NES APU). */
function pulse(ctx: BaseAudioContext, duty: Duty): PeriodicWave {
  let m = waves.get(ctx);
  if (!m) { m = new Map(); waves.set(ctx, m); }
  let w = m.get(duty);
  if (!w) {
    const N = 40, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    w = ctx.createPeriodicWave(re, im, { disableNormalization: false });
    m.set(duty, w);
  }
  return w;
}

function noiseBuf(ctx: BaseAudioContext): AudioBuffer {
  let b = noises.get(ctx);
  if (!b) {
    // 15-bit LFSR like the NES noise channel, resampled into a 1 s buffer
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    let r = 1, v = 1;
    const hold = Math.max(1, Math.round(ctx.sampleRate / 30000));
    for (let i = 0; i < d.length; i++) {
      if (i % hold === 0) { const bit = (r ^ (r >> 1)) & 1; r = (r >> 1) | (bit << 14); v = (r & 1) ? 1 : -1; }
      d[i] = v;
    }
    noises.set(ctx, b);
  }
  return b;
}

const LEVEL = { p1: 0.11, p2: 0.05, tri: 0.2, noise: 0.07 };

function envNote(ctx: BaseAudioContext, out: AudioNode, osc: OscillatorNode, t: number, dur: number, vol: number, decayTo = 0.7) {
  const g = ctx.createGain();
  const a = 0.005, d = Math.min(0.12, dur * 0.4), r = Math.min(0.04, dur * 0.3);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.linearRampToValueAtTime(vol * decayTo, t + a + d);
  g.gain.setValueAtTime(vol * decayTo, Math.max(t + a + d, t + dur - r));
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(g); g.connect(out);
  osc.start(t); osc.stop(t + dur + 0.02);
}

export function playNote(ctx: BaseAudioContext, out: AudioNode, ch: 'p1' | 'p2' | 'tri', tr: Track, e: NoteEv, t: number, stepDur: number) {
  const dur = Math.max(0.03, e.len * stepDur * tr.gate[ch]);
  const o = ctx.createOscillator();
  const f = hz(e.midi);
  if (ch === 'tri') o.type = 'triangle';
  else o.setPeriodicWave(pulse(ctx, ch === 'p1' ? tr.duty1 : tr.duty2));
  o.frequency.setValueAtTime(f, t);
  // gentle delayed vibrato on long lead notes
  if (ch === 'p1' && dur > 0.35) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.007, t + 0.3);
    lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t); lfo.stop(t + dur + 0.02);
  }
  envNote(ctx, out, o, t, dur, LEVEL[ch] * e.vol, ch === 'tri' ? 1 : 0.7);
}

export function playDrum(ctx: BaseAudioContext, out: AudioNode, e: DrumEv, t: number) {
  const v = LEVEL.noise * e.vol;
  if (e.kind === 'k') {
    // kick: pitch-dropping triangle thump + a tick of noise
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(v * 3.2, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.16);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.18);
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf(ctx);
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  const dur = e.kind === 's' ? 0.13 : e.kind === 'o' ? 0.22 : e.kind === 'h' ? 0.035 : 0.03;
  const vol = e.kind === 's' ? v * 1.4 : e.kind === 'k' ? v * 0.6 : v * 0.6;
  f.type = e.kind === 'k' ? 'lowpass' : e.kind === 's' ? 'bandpass' : 'highpass';
  f.frequency.value = e.kind === 'k' ? 800 : e.kind === 's' ? 2200 : 7000;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(t, (t * 7.31) % 0.8); s.stop(t + dur + 0.02);
}

/** Bucket a track's events by step for fast scheduling. */
export function indexTrack(tr: Track) {
  const by: { ch: 'p1' | 'p2' | 'tri' | 'noise'; e: any }[][] = Array.from({ length: tr.len }, () => []);
  (['p1', 'p2', 'tri', 'noise'] as const).forEach((ch) => tr[ch].forEach((e: any) => by[e.step % tr.len]?.push({ ch, e })));
  return by;
}

export function playStep(ctx: BaseAudioContext, out: AudioNode, tr: Track, bucket: { ch: any; e: any }[], t: number, stepDur: number) {
  for (const { ch, e } of bucket) {
    if (ch === 'noise') playDrum(ctx, out, e, t); else playNote(ctx, out, ch, tr, e, t, stepDur);
  }
}

export const stepDuration = (tr: Track) => 60 / tr.bpm / 4;
