import { DEFAULT_ENABLED_LEVELS, WORD_LEVELS } from './data/words';
import { sanitizeUpgrades, type UpgradeId, type Gear } from './gear';

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

export interface CastleDef {
  name: string;
  ring: number;        // wall ring radius
  wallHp: number;
  towers: number;
  towerHp: number;
  towerDmg: number;
  keepHp: number;
  defenders: number;
  defenderHp: number;
  huts: number;
  loot: number;
  color: number;       // banner color
  doubleWall?: boolean;
}

export const CASTLES: CastleDef[] = [
  { name: 'Mossy Fort',      ring: 130, wallHp: 120, towers: 0, towerHp: 0,   towerDmg: 0,  keepHp: 500,  defenders: 1, defenderHp: 80,  huts: 2, loot: 60,  color: 0xd94a3a },
  { name: 'Goblin Gate',     ring: 140, wallHp: 180, towers: 2, towerHp: 260, towerDmg: 7,  keepHp: 700,  defenders: 2, defenderHp: 100, huts: 2, loot: 100, color: 0x6b9c2a },
  { name: 'Stonewatch',      ring: 150, wallHp: 260, towers: 3, towerHp: 340, towerDmg: 9,  keepHp: 900,  defenders: 3, defenderHp: 120, huts: 3, loot: 150, color: 0x8a5ac8 },
  { name: 'Iron Keep',       ring: 160, wallHp: 360, towers: 4, towerHp: 420, towerDmg: 11, keepHp: 1200, defenders: 4, defenderHp: 150, huts: 3, loot: 220, color: 0x5a6a7a },
  { name: 'Dragon Rock',     ring: 170, wallHp: 460, towers: 4, towerHp: 520, towerDmg: 13, keepHp: 1500, defenders: 6, defenderHp: 170, huts: 4, loot: 300, color: 0xe08a1e },
  { name: 'The Royal Citadel', ring: 180, wallHp: 600, towers: 6, towerHp: 600, towerDmg: 15, keepHp: 2000, defenders: 8, defenderHp: 200, huts: 4, loot: 450, color: 0xf2c230, doubleWall: true },
];

export interface WordStat { seen: number; right: number; miss: number }

export interface SaveData {
  v: 1;
  gold: number;
  army: Record<UnitType, number>;
  upgrades: Record<UpgradeId, number>;
  stars: number[]; // best stars per castle (0 = not beaten)
  wordStats: Record<string, WordStat>;
  enabledLevels: string[];
  totalRead: number;
  bestStreak: number;
  streak: number; // current reading streak (kept between visits; ends when a word is failed)
  heroName: string;
}

const KEY = 'reading-conquest-save-v1';
export const GOLD_PER_WORD = 10;
export const BASE_CAMP_SPACE = 20;

function fresh(): SaveData {
  return {
    v: 1,
    gold: 60,
    army: { knight: 2, archer: 0, spearman: 0, ram: 0, catapult: 0 },
    upgrades: { sword: 0, bow: 0, armor: 0, siege: 0 },
    stars: CASTLES.map(() => 0),
    wordStats: {},
    enabledLevels: [...DEFAULT_ENABLED_LEVELS],
    totalRead: 0,
    bestStreak: 0,
    streak: 0,
    heroName: 'Sir Reader',
  };
}

export let save: SaveData = load();

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const d = { ...fresh(), ...JSON.parse(raw) } as SaveData;
    d.army = { ...fresh().army, ...d.army };
    d.upgrades = sanitizeUpgrades(d.upgrades); // old saves: keep their levels, fill gaps with 0
    while (d.stars.length < CASTLES.length) d.stars.push(0);
    d.enabledLevels = d.enabledLevels.filter((id) => WORD_LEVELS.some((l) => l.id === id));
    if (!d.enabledLevels.length) d.enabledLevels = [...DEFAULT_ENABLED_LEVELS];
    return d;
  } catch {
    return fresh();
  }
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full / private mode */ }
}

export function resetSave() {
  save = fresh();
  persist();
}

export function castlesBeaten(): number {
  return save.stars.filter((s) => s > 0).length;
}

export function campSpace(): number {
  return BASE_CAMP_SPACE + castlesBeaten() * 5;
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

/** Pick the next word, favouring words he has missed or not seen much. */
export function pickWord(prev?: string): string {
  const pool = WORD_LEVELS.filter((l) => save.enabledLevels.includes(l.id)).flatMap((l) => l.words);
  const words = pool.length ? pool : WORD_LEVELS[0].words;
  const weights = words.map((w) => {
    if (w === prev) return 0;
    const s = save.wordStats[w];
    if (!s) return 3;
    const mastery = s.right - s.miss * 2;
    return Math.max(0.4, 3 - mastery * 0.6) + s.miss * 1.5;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < words.length; i++) {
    r -= weights[i];
    if (r <= 0) return words[i];
  }
  return words[0];
}

export function recordWord(word: string, right: boolean) {
  const s = (save.wordStats[word] ||= { seen: 0, right: 0, miss: 0 });
  s.seen++;
  if (right) s.right++; else s.miss++;
  persist();
}
