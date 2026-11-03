// Tiny chiptune notation. All durations are in 16th-note steps.
//   melody:  "A4/4 C5/2 ./2"  -> note/len, '.' is a rest
//   drums:   "k.h.s.h." one char per step: k kick, s snare, h hat, o open hat, '.' rest

export type Channel = 'p1' | 'p2' | 'tri' | 'noise';
export type Drum = 'k' | 's' | 'h' | 'o';
export interface NoteEv { step: number; len: number; midi: number; vol: number }
export interface DrumEv { step: number; kind: Drum; vol: number }

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
export const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Parse a melody string into note events; returns events and the total length in steps. */
export function mel(src: string, vol = 1, offset = 0): { ev: NoteEv[]; len: number } {
  const ev: NoteEv[] = [];
  let step = offset;
  for (const tok of src.trim().split(/\s+/)) {
    if (tok === '|') continue;
    const [n, l] = tok.split('/');
    const len = Number(l ?? 2);
    if (n !== '.') ev.push({ step, len, midi: midi(n), vol });
    step += len;
  }
  return { ev, len: step - offset };
}

export function drums(src: string, vol = 1, offset = 0): { ev: DrumEv[]; len: number } {
  const ev: DrumEv[] = [];
  const s = src.replace(/[\s|]/g, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === 'k' || c === 's' || c === 'h' || c === 'o') ev.push({ step: offset + i, kind: c, vol: vol });
    else if (c === 'K' || c === 'S' || c === 'H') ev.push({ step: offset + i, kind: c.toLowerCase() as Drum, vol: vol * 1.35 });
  }
  return { ev, len: s.length };
}

// Chord helpers -------------------------------------------------------------
const CHORDS: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], sus: [0, 5, 7] };
/** "Am" -> [root midi, ...tones] in the given octave. */
export function chord(name: string, octave: number): number[] {
  const m = /^([A-G][#b]?)(m|7|sus)?$/.exec(name)!;
  const root = midi(`${m[1]}${octave}`);
  return CHORDS[m[2] ?? ''].map((iv) => root + iv);
}

/** Arpeggio over a chord progression: one bar (16 steps) per chord. */
export function arp(prog: string[], octave: number, rate: number, pattern: number[], vol = 1): { ev: NoteEv[]; len: number } {
  const ev: NoteEv[] = [];
  prog.forEach((c, bar) => {
    const tones = chord(c, octave);
    for (let i = 0; i < 16 / rate; i++) {
      const idx = pattern[i % pattern.length];
      const m = tones[idx % tones.length] + 12 * Math.floor(idx / tones.length);
      ev.push({ step: bar * 16 + i * rate, len: rate, midi: m, vol });
    }
  });
  return { ev, len: prog.length * 16 };
}

/** Bass line: a per-bar rhythm of [offset-in-semitones-from-root, len] pairs. */
export function bass(prog: string[], octave: number, figure: [number, number][], vol = 1): { ev: NoteEv[]; len: number } {
  const ev: NoteEv[] = [];
  prog.forEach((c, bar) => {
    const root = chord(c, octave)[0];
    let s = 0;
    for (const [iv, len] of figure) { if (iv !== null && !Number.isNaN(iv)) ev.push({ step: bar * 16 + s, len, midi: root + iv, vol }); s += len; }
  });
  return { ev, len: prog.length * 16 };
}

export function cat(...parts: { ev: any[]; len: number }[]) {
  const ev: any[] = []; let len = 0;
  for (const p of parts) { p.ev.forEach((e) => ev.push({ ...e, step: e.step + len })); len += p.len; }
  return { ev, len };
}
export function rep<T extends { ev: any[]; len: number }>(p: T, n: number) { return cat(...Array.from({ length: n }, () => p)); }
