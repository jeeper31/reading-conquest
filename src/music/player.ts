// Background-music player: lookahead scheduler, crossfades, mic ducking, on/off toggle.
import { onAudioReady, audioCtx, settings, saveSettings } from '../audio';
import { TRACKS, TrackName, Track } from './tracks';
import { indexTrack, playStep, stepDuration } from './synth';

const MUSIC_LEVEL = 0.5;      // music bus level (kept under the SFX)
const LOOKAHEAD = 0.25;       // seconds scheduled ahead
const FADE = 0.9;             // crossfade time

interface Voice { name: TrackName; tr: Track; idx: ReturnType<typeof indexTrack>; gain: GainNode; t0: number; next: number; dead?: number }

let bus: GainNode | null = null;   // on/off toggle
let duck: GainNode | null = null;  // mic ducking
let voices: Voice[] = [];
let wanted: TrackName | null = null;
let after: TrackName | null = null; // what to play when a jingle ends
let timer: number | null = null;
const listeners = new Set<() => void>();

function ensureGraph(ctx: AudioContext) {
  if (bus) return;
  duck = ctx.createGain();
  bus = ctx.createGain();
  bus.gain.value = settings.music ? MUSIC_LEVEL : 0;
  duck.connect(bus); bus.connect(ctx.destination);
  if (ducks.size) applyDuck();
  timer = window.setInterval(tick, 40);
  document.addEventListener('visibilitychange', () => {
    const c = audioCtx(); if (!c) return;
    if (document.hidden) c.suspend().catch(() => {}); else c.resume().catch(() => {});
  });
}

function start(ctx: AudioContext, name: TrackName) {
  const tr = TRACKS[name];
  const now = ctx.currentTime;
  // fade out whatever is playing
  for (const v of voices) if (!v.dead) {
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + FADE);
    v.dead = now + FADE + 0.1;
  }
  const gain = ctx.createGain();
  const fadeIn = tr.loop ? FADE : 0.02;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(tr.volume, now + fadeIn);
  gain.connect(duck!);
  voices.push({ name, tr, idx: indexTrack(tr), gain, t0: now + 0.08, next: 0 });
  tick();
}

function tick() {
  const ctx = audioCtx(); if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  for (const v of voices) {
    if (v.dead && now > v.dead) continue;
    const sd = stepDuration(v.tr);
    // if the tab stalled, skip ahead instead of bursting notes
    if (v.t0 + v.next * sd < now - 0.1) v.next = Math.ceil((now - v.t0) / sd);
    while (v.t0 + v.next * sd < now + LOOKAHEAD) {
      if (!v.tr.loop && v.next >= v.tr.len) break;
      const t = v.t0 + v.next * sd;
      if ((!v.dead || t < v.dead) && settings.music) playStep(ctx, v.gain, v.tr, v.idx[v.next % v.tr.len], t, sd);
      v.next++;
    }
    if (!v.tr.loop && !v.dead && v.next >= v.tr.len && now > v.t0 + v.tr.len * sd + 1.2) {
      v.dead = now;
      if (after && wanted === v.name) { const a = after; after = null; wanted = a; start(ctx, a); }
    }
  }
  voices = voices.filter((v) => { const gone = v.dead !== undefined && now > v.dead; if (gone) v.gain.disconnect(); return !gone; });
}

/** Ask for a track; it starts (crossfading) once audio is unlocked by a user gesture. Same track = no restart. */
export function playMusic(name: TrackName) {
  after = null;
  if (wanted === name && voices.some((v) => v.name === name && !v.dead)) return;
  wanted = name;
  onAudioReady((ctx) => {
    ensureGraph(ctx);
    if (wanted !== name) return;
    if (voices.some((v) => v.name === name && !v.dead)) return;
    start(ctx, name);
  });
}

/** Play a one-shot jingle (victory/defeat), then optionally continue with `then`. */
export function playJingle(name: 'victory' | 'defeat', then?: TrackName) {
  wanted = name; after = then ?? null;
  onAudioReady((ctx) => { ensureGraph(ctx); if (wanted === name) start(ctx, name); });
}

/** Duck music for a reason ('mic' = silent while listening, 'speech' = quiet while a word is spoken). */
const ducks = new Map<string, number>();
const DUCK_LEVEL: Record<string, number> = { mic: 0, speech: 0.2 };
export function setDuck(reason: 'mic' | 'speech', on: boolean) {
  if (on) ducks.set(reason, DUCK_LEVEL[reason]); else ducks.delete(reason);
  applyDuck();
}
function applyDuck() {
  const c = audioCtx(); if (!c || !duck) return;
  const level = ducks.size ? Math.min(...ducks.values()) : 1;
  const g = duck.gain, now = c.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  if (level < 1) g.linearRampToValueAtTime(level, now + 0.1);
  else g.setTargetAtTime(1, now + 0.3, 0.35);
}
export const isDucked = () => ducks.size > 0;

export function musicOn() { return settings.music; }
export function setMusicOn(on: boolean) {
  settings.music = on; saveSettings();
  const c = audioCtx();
  if (c && bus) { const now = c.currentTime; bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(bus.gain.value, now); bus.gain.linearRampToValueAtTime(on ? MUSIC_LEVEL : 0, now + 0.3); }
  listeners.forEach((l) => l());
}
export function onSettingsChange(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
export function notifySettings() { listeners.forEach((l) => l()); }

export function stopMusicForTests() { if (timer) clearInterval(timer); }
