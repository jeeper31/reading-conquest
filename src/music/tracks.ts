// Original chiptune tracks for Reading Conquest (NES-style: 2 pulse, 1 triangle, 1 noise channel).
import { mel, drums, arp, bass, cat, rep, NoteEv, DrumEv } from './notation';

export type Duty = 0.125 | 0.25 | 0.5;
export interface Track {
  name: string;
  bpm: number;
  loop: boolean;
  /** overall level multiplier for this track */
  volume: number;
  len: number; // in 16th steps
  p1: NoteEv[]; p2: NoteEv[]; tri: NoteEv[]; noise: DrumEv[];
  duty1: Duty; duty2: Duty;
  /** fraction of each note that sounds (staccato < 1) */
  gate: { p1: number; p2: number; tri: number };
}

function track(t: Omit<Track, 'len' | 'p1' | 'p2' | 'tri' | 'noise'> & Record<'p1' | 'p2' | 'tri' | 'noise', { ev: any[]; len: number }>): Track {
  const lens = { p1: t.p1.len, p2: t.p2.len, tri: t.tri.len, noise: t.noise.len };
  const len = Math.max(...Object.values(lens));
  for (const [k, v] of Object.entries(lens)) if (v !== len && v !== 0) console.warn(`[music] ${t.name}.${k} is ${v} steps, expected ${len}`);
  return { ...t, len, p1: t.p1.ev, p2: t.p2.ev, tri: t.tri.ev, noise: t.noise.ev };
}
const none = { ev: [], len: 0 };

// ---------------------------------------------------------------------------
// CAMP / TITLE — "Banner of the Realm": calm, heroic, D major, 96 bpm.
const campProg = ['D', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D', 'G', 'D', 'Em', 'A', 'G', 'D', 'A', 'D'];
const camp = track({
  name: 'camp', bpm: 96, loop: true, volume: 0.9, duty1: 0.25, duty2: 0.125,
  gate: { p1: 0.92, p2: 0.6, tri: 0.9 },
  p1: mel(`
    A4/4 D5/4 F#5/6 E5/2 | D5/3 E5/1 D5/4 B4/8 | A4/4 D5/4 F#5/4 A5/4 | G5/6 F#5/2 E5/8
    F#5/4 D5/4 B4/6 C#5/2 | D5/4 B4/4 G4/4 B4/4 | A4/4 C#5/4 E5/4 G5/4 | F#5/6 E5/2 D5/8
    B5/4 A5/4 G5/4 B5/4 | A5/6 F#5/2 D5/8 | G5/4 F#5/4 E5/4 B4/4 | C#5/4 E5/4 A5/8
    B5/4 A5/2 G5/2 F#5/4 G5/4 | A5/4 F#5/4 D5/8 | E5/4 F#5/2 G5/2 A5/4 C#5/4 | D5/12 ./4`),
  p2: arp(campProg, 4, 2, [0, 1, 2, 1], 0.8),
  tri: bass(campProg, 2, [[0, 4], [12, 4], [7, 4], [12, 4]]),
  noise: rep(drums('k.......s.......', 0.6), 16),
});

// ---------------------------------------------------------------------------
// READING — "Quiet Library": gentle lullaby, F major, 76 bpm, no drums.
const readProg = ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C'];
const read = track({
  name: 'read', bpm: 76, loop: true, volume: 0.45, duty1: 0.5, duty2: 0.125,
  gate: { p1: 0.95, p2: 0.5, tri: 0.95 },
  p1: mel(`
    C5/8 A4/4 F4/4 | D5/8 A4/8 | D5/4 C5/4 Bb4/4 A4/4 | G4/8 E4/8
    A4/4 C5/4 F5/8 | E5/8 C5/8 | D5/6 C5/2 Bb4/8 | E4/4 G4/4 C5/8`, 0.8),
  p2: arp(readProg, 4, 4, [0, 1, 2, 1], 0.6),
  tri: bass(readProg, 2, [[0, 8], [7, 8]], 0.9),
  noise: none,
});

// ---------------------------------------------------------------------------
// WORLD MAP — "Onward March": marching adventure, G mixolydian, 116 bpm.
const mapProg = ['G', 'F', 'G', 'D', 'G', 'F', 'C', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'D'];
const marchBar = 'k...s.ssk...s.s.';
const map = track({
  name: 'map', bpm: 116, loop: true, volume: 0.85, duty1: 0.25, duty2: 0.5,
  gate: { p1: 0.8, p2: 0.45, tri: 0.7 },
  p1: mel(`
    G4/2 G4/2 G4/2 B4/2 D5/6 B4/2 | C5/2 C5/2 C5/2 A4/2 F4/6 A4/2 | B4/2 D5/2 G5/4 F5/2 D5/2 B4/4 | A4/2 B4/2 C5/2 B4/2 A4/8
    G4/2 G4/2 G4/2 B4/2 D5/6 B4/2 | C5/2 D5/2 C5/2 A4/2 F5/6 D5/2 | E5/4 D5/2 C5/2 G4/4 C5/4 | D5/2 C5/2 B4/2 A4/2 F#4/4 D4/4
    E5/6 D5/2 B4/4 G4/4 | C5/4 E5/4 G5/8 | D5/6 B4/2 G4/4 B4/4 | A4/4 F#4/4 D4/4 F#4/4
    E5/2 E5/2 G5/4 E5/2 D5/2 B4/4 | C5/2 D5/2 E5/4 G5/8 | F#5/4 E5/4 D5/4 C5/4 | A4/2 B4/2 C5/2 D5/2 E5/2 F#5/2 G5/4`),
  p2: arp(mapProg, 3, 4, [1, 2, 1, 2], 0.5),
  tri: bass(mapProg, 2, [[0, 4], [7, 4], [0, 4], [7, 4]]),
  noise: cat(rep(drums(marchBar, 0.8), 7), drums('s.s.ssssK.SsSsSs', 0.8), rep(drums(marchBar, 0.8), 7), drums('s.s.ssssK.SsSsSs', 0.8)),
});

// ---------------------------------------------------------------------------
// BATTLE — "Siege!": fast, driving, A minor, 150 bpm, 16th arps + pumping bass.
const battleProg = ['Am', 'F', 'G', 'E', 'Am', 'F', 'Dm', 'E', 'F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E'];
const beat = 'k.h.s.h.k.k.s.h.';
const fill = 'k.h.s.h.s.ssSSSS';
const battle = track({
  name: 'battle', bpm: 150, loop: true, volume: 0.85, duty1: 0.25, duty2: 0.125,
  gate: { p1: 0.88, p2: 0.55, tri: 0.6 },
  p1: mel(`
    A4/2 C5/2 E5/4 A5/4 G5/2 E5/2 | F5/4 E5/2 D5/2 C5/4 A4/4 | B4/2 D5/2 G5/4 F5/2 E5/2 D5/4 | E5/4 G#4/4 B4/4 E5/4
    A5/4 G5/2 A5/2 E5/4 C5/4 | F5/2 E5/2 F5/2 A5/2 C6/8 | D6/4 C6/2 A5/2 F5/4 D5/4 | E5/2 F5/2 E5/2 D5/2 C5/2 B4/2 G#4/4
    C5/8 F5/8 | D5/8 G5/8 | E5/6 A5/2 C6/8 | B5/2 A5/2 G5/2 E5/2 A5/8
    F5/4 A5/4 C6/4 A5/4 | G5/4 B5/4 D6/4 B5/4 | G#5/4 B5/4 E6/8 | D6/2 C6/2 B5/2 A5/2 G#5/4 E5/4`),
  p2: arp(battleProg, 4, 1, [0, 1, 2, 3, 2, 1], 0.55),
  tri: bass(battleProg, 2, [[0, 2], [12, 2], [0, 2], [12, 2], [0, 2], [12, 2], [7, 2], [12, 2]]),
  noise: cat(rep(drums(beat), 7), drums(fill), rep(drums(beat), 7), drums(fill)),
});

// ---------------------------------------------------------------------------
// VICTORY jingle — bright C major fanfare (~3.5 s, plays once).
const victory = track({
  name: 'victory', bpm: 132, loop: false, volume: 1, duty1: 0.25, duty2: 0.5,
  gate: { p1: 0.9, p2: 0.85, tri: 0.9 },
  p1: mel('G4/2 C5/2 E5/2 G5/6 E5/2 G5/2 | A5/4 F5/2 A5/2 B5/4 D6/4 | C6/16'),
  p2: mel('E4/2 G4/2 C5/2 E5/6 C5/2 E5/2 | F5/4 C5/2 F5/2 G5/4 B5/4 | G5/16', 0.6),
  tri: mel('C3/8 C3/8 | F2/8 G2/8 | C2/16'),
  noise: drums('k...s...k.s.ssss k...s...k.s.SSSS K...............'),
});

// DEFEAT jingle — slow minor descent (~3.5 s, plays once).
const defeat = track({
  name: 'defeat', bpm: 84, loop: false, volume: 0.9, duty1: 0.5, duty2: 0.125,
  gate: { p1: 0.95, p2: 0.95, tri: 0.95 },
  p1: mel('E5/4 D5/4 C5/4 B4/4 | C5/4 B4/4 A4/4 G#4/4 | A4/16', 0.8),
  p2: mel('C5/16 | A4/8 E4/8 | C4/16', 0.5),
  tri: mel('A2/16 | E2/16 | A2/16'),
  noise: drums('................ ................ k...............', 0.6),
});

// ---------------------------------------------------------------------------
// FROST REALM map — "Ice Halls": sparkly, E minor, 108 bpm.
const frostProg = ['Em', 'C', 'Am', 'G', 'Em', 'C', 'B7', 'Em'];
const frost = track({
  name: 'frost', bpm: 108, loop: true, volume: 0.8, duty1: 0.125, duty2: 0.125,
  gate: { p1: 0.85, p2: 0.4, tri: 0.9 },
  p1: mel(`
    B4/4 E5/4 G5/4 F#5/4 | E5/6 D5/2 B4/8 | C5/4 E5/4 G5/4 A5/4 | G5/8 E5/8
    B5/4 A5/4 G5/4 F#5/4 | E5/4 G5/4 C6/8 | B5/6 A5/2 F#5/4 D#5/4 | E5/16`),
  p2: arp(frostProg, 5, 2, [0, 1, 2, 3, 2, 1], 0.45),
  tri: bass(frostProg, 2, [[0, 8], [7, 8]], 0.9),
  noise: rep(drums('h...h...h...h.h.', 0.4), 8),
});

// DESERT SANDS map — "Shifting Sands": D minor with a desert C#, 120 bpm.
const desertProg = ['Dm', 'Dm', 'Gm', 'A', 'Dm', 'Bb', 'A', 'Dm'];
const desert = track({
  name: 'desert', bpm: 120, loop: true, volume: 0.8, duty1: 0.25, duty2: 0.5,
  gate: { p1: 0.85, p2: 0.45, tri: 0.7 },
  p1: mel(`
    D5/2 E5/2 F5/4 E5/2 D5/2 C#5/4 | D5/4 A4/4 D5/8 | G5/2 F5/2 E5/4 D5/4 Bb4/4 | A4/2 Bb4/2 C#5/4 E5/8
    F5/2 G5/2 A5/4 G5/2 F5/2 E5/4 | D5/4 F5/4 Bb5/8 | A5/2 G5/2 F5/2 E5/2 C#5/4 E5/4 | D5/16`),
  p2: arp(desertProg, 4, 4, [0, 2, 1, 2], 0.5),
  tri: bass(desertProg, 2, [[0, 3], [0, 3], [7, 2], [0, 4], [7, 4]]),
  noise: rep(drums('k..k..s.k.k.s...', 0.7), 8),
});

// SHADOW FORTRESS map — "Dark Fortress": brave but spooky, C minor, 132 bpm.
const shadowProg = ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Ab', 'Fm', 'G'];
const shadow = track({
  name: 'shadow', bpm: 132, loop: true, volume: 0.8, duty1: 0.25, duty2: 0.125,
  gate: { p1: 0.85, p2: 0.5, tri: 0.6 },
  p1: mel(`
    C5/4 Eb5/4 G5/6 F5/2 | Eb5/4 C5/4 Ab4/8 | Bb4/4 D5/4 F5/4 Bb5/4 | G5/8 B4/8
    C5/2 C5/2 G5/4 Eb5/2 F5/2 G5/4 | Ab5/4 G5/4 Eb5/8 | F5/4 Ab5/4 C6/4 Ab5/4 | G5/8 D5/4 B4/4`),
  p2: arp(shadowProg, 4, 2, [0, 1, 2, 1], 0.5),
  tri: bass(shadowProg, 2, [[0, 2], [0, 2], [12, 2], [0, 2], [0, 2], [0, 2], [12, 2], [7, 2]]),
  noise: rep(drums('k...s..kk...s...', 0.75), 8),
});

// BOSS battle — "Boss Battle!": fast and intense, E minor, 160 bpm.
const bossProg = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B'];
const boss = track({
  name: 'boss', bpm: 160, loop: true, volume: 0.85, duty1: 0.25, duty2: 0.125,
  gate: { p1: 0.85, p2: 0.5, tri: 0.55 },
  p1: mel(`
    E5/2 E5/2 G5/2 E5/2 B5/4 A5/4 | G5/2 F#5/2 E5/2 D5/2 E5/8 | C5/2 E5/2 G5/2 C6/2 B5/4 G5/4 | A5/2 F#5/2 D5/4 F#5/4 A5/4
    E6/4 D6/2 B5/2 G5/4 E5/4 | B5/2 A5/2 G5/2 F#5/2 G5/4 B5/4 | C6/4 B5/4 A5/4 G5/4 | F#5/4 A5/4 D#5/8`),
  p2: arp(bossProg, 4, 1, [0, 1, 2, 3, 2, 1], 0.5),
  tri: bass(bossProg, 2, [[0, 2], [12, 2], [0, 2], [12, 2], [0, 2], [12, 2], [7, 2], [12, 2]]),
  noise: cat(rep(drums('k.h.s.h.k.k.s.h.'), 7), drums('k.h.s.h.s.ssSSSS')),
});

// CROWN jingle — grand coronation fanfare (~5 s, plays once).
const crown = track({
  name: 'crown', bpm: 120, loop: false, volume: 1, duty1: 0.25, duty2: 0.5,
  gate: { p1: 0.9, p2: 0.85, tri: 0.9 },
  p1: mel('C5/2 E5/2 G5/2 C6/6 G5/2 C6/2 | D6/4 B5/2 D6/2 E6/4 G6/4 | C6/4 G5/4 E6/8 | C6/16'),
  p2: mel('E4/2 G4/2 C5/2 E5/6 E5/2 G5/2 | G5/4 G5/2 B5/2 C6/4 D6/4 | G5/4 E5/4 G5/8 | E5/16', 0.6),
  tri: mel('C3/8 C3/8 | G2/8 G2/8 | F2/8 G2/8 | C2/16'),
  noise: drums('k...s...k.s.ssss k...s...k.s.SSSS k.k.s.k.k.s.SSSS K...............'),
});

export const TRACKS: Record<string, Track> = { camp, read, map, battle, victory, defeat, frost, desert, shadow, boss, crown };
export type TrackName = keyof typeof TRACKS;
