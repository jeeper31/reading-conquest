// Plays the pre-generated phonics clips (public/audio): one clip per sound chunk and a natural
// whole-word clip per word. Falls back to speechSynthesis for words without a clip.
import { audioCtx, unlockAudio } from './audio';
import { setDuck } from './music/player';

const BASE = import.meta.env.BASE_URL + 'audio/';
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let manifest: Promise<{ sounds: string[]; words: string[] } | null> | null = null;
let out: GainNode | null = null;
let playing = 0;
let gen = 0; // bumps on stop(): pending sequences bail out

function getManifest() {
  manifest ??= fetch(BASE + 'manifest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return manifest;
}

function load(path: string): Promise<AudioBuffer | null> {
  let p = buffers.get(path);
  if (!p) {
    p = fetch(BASE + path)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((ab) => { const c = audioCtx(); return c ? c.decodeAudioData(ab) : Promise.reject('no ctx'); })
      .catch(() => { buffers.delete(path); return null; });
    buffers.set(path, p);
  }
  return p;
}

const soundPath = (id: string) => `sounds/${id.replace(/\+/g, '_')}.mp3`;
const wordPath = (w: string) => `words/${w}.mp3`;

/** Start fetching/decoding every clip a word needs (call when the word appears). */
export function preload(word: string, clipIds: string[]) {
  if (!audioCtx()) return;
  clipIds.forEach((id) => load(soundPath(id)));
  getManifest().then((m) => { if (m?.words.includes(word)) load(wordPath(word)); });
}

function duckOn() { if (playing++ === 0) setDuck('speech', true); }
function duckOff() { playing = Math.max(0, playing - 1); if (playing === 0) setDuck('speech', false); }

function playBuffer(buf: AudioBuffer): Promise<void> {
  const c = audioCtx()!;
  if (!out) { out = c.createGain(); out.gain.value = 1; out.connect(c.destination); }
  return new Promise((resolve) => {
    const src = c.createBufferSource();
    src.buffer = buf; src.connect(out!);
    duckOn();
    let done = false;
    const end = () => { if (!done) { done = true; duckOff(); resolve(); } };
    src.onended = end;
    setTimeout(end, buf.duration * 1000 + 400);
    src.start();
  });
}

/** Play one sound chunk (e.g. "sh", "a+ng+k"). Resolves when it finishes. */
export async function playSound(id: string): Promise<void> {
  unlockAudio();
  const buf = await load(soundPath(id));
  if (buf) await playBuffer(buf);
}

/** Say a whole word: natural clip if we have one, otherwise the browser voice. */
export async function playWord(word: string): Promise<void> {
  unlockAudio();
  const m = await getManifest();
  const buf = m?.words.includes(word) ? await load(wordPath(word)) : null;
  if (buf) return playBuffer(buf);
  return speakFallback(word);
}

function speakFallback(word: string, rate = 0.8): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US'; u.rate = rate; u.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((v) => v.lang === 'en-US' && /Google|Samantha|Natural/i.test(v.name)) || voices.find((v) => v.lang.startsWith('en'));
    if (v) u.voice = v;
    duckOn();
    let done = false;
    const end = () => { if (!done) { done = true; duckOff(); resolve(); } };
    u.onend = end; u.onerror = end;
    setTimeout(end, 4000);
    window.speechSynthesis.speak(u);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * "Blend it": each chunk slowly (gap ~450ms), then faster (gap ~90ms), then the whole word.
 * `onStep(i)` fires as tile i starts (-1 = whole word, null = finished).
 */
export async function blend(word: string, clips: (string | null)[], onStep: (i: number | null, pass: number) => void) {
  const my = ++gen;
  for (const [pass, gap] of [[0, 450], [1, 90]] as const) {
    for (let i = 0; i < clips.length; i++) {
      const id = clips[i];
      if (!id) continue; // silent letters are skipped
      if (my !== gen) return;
      onStep(i, pass);
      await playSound(id);
      await wait(gap);
    }
    if (my !== gen) return;
    await wait(pass === 0 ? 350 : 200);
  }
  if (my !== gen) return;
  onStep(-1, 2);
  await playWord(word);
  if (my === gen) onStep(null, 2);
}

/** Cancel a running blend sequence (clips already playing finish on their own). */
export function stopBlend() { gen++; }
