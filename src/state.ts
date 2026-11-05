import { DEFAULT_ENABLED_LEVELS, WORD_LEVELS, BASE_LEVELS, kingdomWords } from './data/words';
import { sanitizeUpgrades, type UpgradeId, type Gear } from './gear';
import { KINGDOMS, CASTLES_PER_KINGDOM, clampKingdom, type CastleDef } from './kingdoms';

export type UnitType = 'knight' | 'archer' | 'spearman' | 'ram' | 'catapult';

export interface UnitDef {
  type: UnitType;
  name: string;
  cost: number;
  space: number; // army camp space it uses
  hp: number;
  dmg: number;
  range: number; // px
  speed: number; // px / sec
  cooldown: number; // ms between attacks
  structureMult: number; // damage multiplier vs buildings/walls
  prefers: 'any' | 'walls' | 'defenses' | 'defenders';
  blurb: string;
  unlockCastle: number; // castles beaten needed to unlock
}

export const UNIT_DEFS: Record<UnitType, UnitDef> = {
  knight:   { type: 'knight',   name: 'Knight',   cost: 30,  space: 1, hp: 140, dmg: 16, range: 30,  speed: 62, cooldown: 900,  structureMult: 1,   prefers: 'any',       blurb: 'Tough sword fighter', unlockCastle: 0 },
  archer:   { type: 'archer',   name: 'Archer',   cost: 40,  space: 1, hp: 60,  dmg: 11, range: 170, speed: 70, cooldown: 1000, structureMult: 1,   prefers: 'any',       blurb: 'Shoots over walls', unlockCastle: 0 },
  spearman: { type: 'spearman', name: 'Spearman', cost: 35,  space: 1, hp: 110, dmg: 20, range: 44,  speed: 72, cooldown: 1000, structureMult: 0.8, prefers: 'defenders', blurb: 'Hunts castle guards', unlockCastle: 1 },
  ram:      { type: 'ram',      name: 'Battering Ram', cost: 80, space: 3, hp: 380, dmg: 70, range: 36, speed: 40, cooldown: 1500, structureMult: 2.5, prefers: 'walls', blurb: 'Smashes walls and gates', unlockCastle: 1 },
  catapult: { type: 'catapult', name: 'Catapult', cost: 120, space: 4, hp: 220, dmg: 60, range: 300, speed: 30, cooldown: 2600, structureMult: 1.6, prefers: 'defenses', blurb: 'Flings boulders at towers', unlockCastle: 2 },
};

export const UNIT_ORDER: UnitType[] = ['knight', 'archer', 'spearman', 'ram', 'catapult'];

export { UPGRADES, UPGRADE_ORDER } from './gear';
export type { UpgradeId } from './gear';

export type { CastleDef, KingdomDef, BossDef } from './kingdoms';
export { KINGDOMS } from './kingdoms';

/** Castles of the Green Kingdom (kingdom 0); kept for older code paths. */
export const CASTLES: CastleDef[] = KINGDOMS[0].castles;

export interface WordStat { seen: number; right: number; miss: number }

export interface SaveData {
  v: 2;
  gold: number;
  army: Record<UnitType, number>;
  upgrades: Record<UpgradeId, number>;
  /** best stars per castle, per kingdom: kstars[kingdom][castle] (0 = not beaten) */
  kstars: number[][];
  /** Green Kingdom stars (mirror of kstars[0], kept so the v1 field stays meaningful) */
  stars: number[];
  /** kingdom currently being played (drives the map, battles and the new words in the reading mix) */
  kingdom: number;
  /** kingdoms whose crown ceremony has been shown */
  crowns: number[];
  wordStats: Record<string, WordStat>;
  enabledLevels: string[];
  totalRead: number;
  bestStreak: number;
  streak: number; // current reading streak (kept between visits; ends when a word is failed)
  bonusLeft?: number; // seconds of 2x bonus time left (only meaningful while streak >= 3)
  heroName: string;
}

const KEY = 'reading-conquest-save-v1';
export const GOLD_PER_WORD = 10;
export const BASE_CAMP_SPACE = 20;

const emptyStars = () => KINGDOMS.map(() => Array(CASTLES_PER_KINGDOM).fill(0) as number[]);

function fresh(): SaveData {
  return {
    v: 2,
    gold: 60,
    army: { knight: 2, archer: 0, spearman: 0, ram: 0, catapult: 0 },
    upgrades: { sword: 0, bow: 0, armor: 0, siege: 0 },
    kstars: emptyStars(),
    stars: CASTLES.map(() => 0),
    kingdom: 0,
    crowns: [],
    wordStats: {},
    enabledLevels: [...DEFAULT_ENABLED_LEVELS],
    totalRead: 0,
    bestStreak: 0,
    streak: 0,
    bonusLeft: 0,
    heroName: 'Sir Reader',
  };
}


const starVal = (x: unknown) => Math.max(0, Math.min(3, Math.floor(Number(x)) || 0));

/** Turn whatever is in storage (v1 or v2, possibly partial) into a clean v2 save. Exported for tests. */
export function migrate(raw: any): SaveData {
  const f = fresh();
  const d = { ...f, ...(raw && typeof raw === 'object' ? raw : {}) } as SaveData;
  d.army = { ...f.army, ...d.army };
  d.upgrades = sanitizeUpgrades(d.upgrades); // old saves: keep their levels, fill gaps with 0
  const ks = emptyStars();
  const rawK: unknown = raw?.kstars;
  if (Array.isArray(rawK)) rawK.forEach((row, k) => { if (k < ks.length && Array.isArray(row)) row.forEach((v, i) => { if (i < CASTLES_PER_KINGDOM) ks[k][i] = starVal(v); }); });
  // v1 saves only had the Green Kingdom's stars
  if (Array.isArray(raw?.stars)) raw.stars.forEach((v: unknown, i: number) => { if (i < CASTLES_PER_KINGDOM) ks[0][i] = Math.max(ks[0][i], starVal(v)); });
  d.kstars = ks;
  d.stars = ks[0];
  d.crowns = Array.isArray(raw?.crowns) ? [...new Set((raw.crowns as unknown[]).map(clampKingdom))] : [];
  d.v = 2;
  d.kingdom = clampKingdom(d.kingdom);
  if (!kingdomUnlockedIn(d, d.kingdom)) d.kingdom = 0;
  d.enabledLevels = (d.enabledLevels || []).filter((id) => BASE_LEVELS.some((l) => l.id === id));
  if (!d.enabledLevels.length) d.enabledLevels = [...DEFAULT_ENABLED_LEVELS];
  return d;
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return migrate(JSON.parse(raw));
  } catch {
    return fresh();
  }
}

// ---------------------------------------------------------------- kingdoms
export const kingdom = () => KINGDOMS[save.kingdom];
export const castleDef = (k: number, i: number): CastleDef => KINGDOMS[k].castles[i];
export const bossBeatenIn = (d: SaveData, k: number) => (d.kstars[k]?.[CASTLES_PER_KINGDOM - 1] ?? 0) > 0;
export const kingdomUnlockedIn = (d: SaveData, k: number) => k === 0 || bossBeatenIn(d, k - 1);
export const kingdomUnlocked = (k: number) => kingdomUnlockedIn(save, k);
export const bossBeaten = (k: number) => bossBeatenIn(save, k);
export const beatenIn = (k: number, d: SaveData = save) => d.kstars[k].filter((s) => s > 0).length;
export const starsIn = (k: number) => save.kstars[k].reduce((a, b) => a + b, 0);
/** First kingdom whose boss is beaten but whose crown ceremony has not played yet. */
export function pendingGraduation(d: SaveData = save): number | null {
  for (let k = 0; k < KINGDOMS.length; k++) if (bossBeatenIn(d, k) && !d.crowns.includes(k)) return k;
  return null;
}
/** Highest unlocked kingdom. */
export function topKingdom(d: SaveData = save) {
  let k = 0;
  while (k + 1 < KINGDOMS.length && kingdomUnlockedIn(d, k + 1)) k++;
  return k;
}

// Loaded after the helpers above exist (they are consts).
export let save: SaveData = load();

// ---------------------------------------------------------------- word mix
/** New words of kingdom k that are unlocked right now: 8 to start, +3 per castle beaten there, all once the boss falls. */
export function kingdomNewWords(k: number, d: SaveData = save): string[] {
  const all = kingdomWords(k);
  if (!all.length) return [];
  if (bossBeatenIn(d, k)) return all;
  return all.slice(0, Math.min(all.length, 8 + 3 * beatenIn(k, d)));
}
/** Share of words drawn from the kingdom's new list (the rest is review). */
export const newWordShare = (k: number, d: SaveData = save) => (kingdomWords(k).length ? Math.min(0.4, 0.3 + 0.02 * beatenIn(k, d)) : 0);
/** Review = the grown-up's chosen lists + the new words of every earlier kingdom; fresh = this kingdom's unlocked new words. */
export function wordPools(k: number = save.kingdom, d: SaveData = save) {
  const base = BASE_LEVELS.filter((l) => d.enabledLevels.includes(l.id)).flatMap((l) => l.words);
  const earlier: string[] = [];
  for (let j = 1; j < k; j++) earlier.push(...kingdomWords(j));
  const review = [...new Set([...(base.length ? base : WORD_LEVELS[0].words), ...earlier])];
  const fresh = kingdomNewWords(k, d).filter((w) => !review.includes(w));
  return { review, fresh };
}
/** A word from the current kingdom's list that he has not read right a couple of times yet. */
export function isNewWord(w: string, d: SaveData = save) {
  return kingdomWords(d.kingdom).includes(w) && (d.wordStats[w]?.right ?? 0) < 2;
}

export function persist() {
  save.stars = save.kstars[0];
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full / private mode */ }
}

export function resetSave() {
  save = fresh();
  persist();
}

/** Castles beaten across every kingdom. */
export function castlesBeaten(): number {
  return save.kstars.reduce((n, row) => n + row.filter((s) => s > 0).length, 0);
}

/** +5 space per Green Kingdom castle, +3 per castle in the later kingdoms. */
export function campSpace(d: SaveData = save): number {
  let n = BASE_CAMP_SPACE;
  d.kstars.forEach((row, k) => { n += row.filter((s) => s > 0).length * (k === 0 ? 5 : 3); });
  return n;
}

export function armySpaceUsed(): number {
  return UNIT_ORDER.reduce((sum, t) => sum + save.army[t] * UNIT_DEFS[t].space, 0);
}

export function armyCount(): number {
  return UNIT_ORDER.reduce((sum, t) => sum + save.army[t], 0);
}

/** The gear our own troops are wearing right now (drives how they look). */
export function playerGear(t: UnitType): Gear {
  const u = save.upgrades;
  const weapon = t === 'archer' ? u.bow : t === 'ram' || t === 'catapult' ? u.siege : u.sword;
  return { armor: u.armor, weapon };
}

/** Unit stats with upgrades applied. */
export function unitStats(t: UnitType) {
  const d = UNIT_DEFS[t];
  const u = save.upgrades;
  let dmg = d.dmg;
  let range = d.range;
  if (t === 'knight' || t === 'spearman') dmg *= 1 + 0.25 * u.sword;
  if (t === 'archer') { dmg *= 1 + 0.25 * u.bow; range *= 1 + 0.08 * u.bow; }
  if (t === 'ram' || t === 'catapult') dmg *= 1 + 0.3 * u.siege;
  const hp = d.hp * (1 + 0.2 * u.armor);
  return { ...d, dmg, range, hp };
}

function weightedPick(words: string[], prev: string | undefined, rnd: () => number, d: SaveData): string {
  const weights = words.map((w) => {
    if (w === prev) return 0;
    const s = d.wordStats[w];
    if (!s) return 3;
    const mastery = s.right - s.miss * 2;
    return Math.max(0.4, 3 - mastery * 0.6) + s.miss * 1.5;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < words.length; i++) {
    r -= weights[i];
    if (r <= 0) return words[i];
  }
  return words.find((w) => w !== prev) ?? words[0];
}

/** Pick the next word: mostly review (favouring missed / rarely seen words), sometimes one of the kingdom's new words. */
export function pickWord(prev?: string, rnd: () => number = Math.random, d: SaveData = save): string {
  const { review, fresh } = wordPools(d.kingdom, d);
  const useFresh = fresh.length > 0 && rnd() < newWordShare(d.kingdom, d);
  return weightedPick(useFresh ? fresh : review, prev, rnd, d);
}

export function recordWord(word: string, right: boolean) {
  const s = (save.wordStats[word] ||= { seen: 0, right: 0, miss: 0 });
  s.seen++;
  if (right) s.right++; else s.miss++;
  persist();
}
