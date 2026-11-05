// The four kingdoms. Pure data (no Phaser) so the save migration and word mix can be unit-tested.
// Kingdom 0 is the original Green Kingdom; beating a kingdom's last castle (the boss) unlocks the next one.

export type EnemyTeam = 'red' | 'ice' | 'sand' | 'shadow';
export type BossKind = 'giant' | 'camel' | 'dragon';
export type Weather = 'none' | 'snow' | 'sand' | 'embers';

export interface BossDef {
  kind: BossKind;
  name: string;
  hp: number;
  dmg: number;
  /** melee reach or fire range (px) */
  range: number;
  cooldown: number; // ms
  speed: number;
  /** splash radius of each hit (px) */
  splash: number;
}

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
  defenderDmg: number;
  /** damage of the keep's boulder thrower (0 = none) */
  keepBoulder: number;
  huts: number;
  loot: number;
  color: number;       // banner color
  doubleWall?: boolean;
  /** enemy archers standing on the walls (fall when their wall breaks) */
  wallArchers?: number;
  wallArcherHp?: number;
  wallArcherDmg?: number;
  /** enemy catapults inside the walls */
  catapults?: number;
  catapultDmg?: number;
  boss?: BossDef;
}

export interface KingdomDef {
  id: string;
  name: string;
  short: string;
  /** What reading skill the kingdom adds (kid-readable). */
  skill: string;
  example: string;
  crown: string; // name of the crown earned for beating it
  ground: string; // tile texture key
  groundTint: number;
  dirtTint: number;
  castleTint: number; // multiplies the stone castle art (0xffffff = plain)
  decor: string[];
  enemyTeam: EnemyTeam;
  enemyName: string;
  weather: Weather;
  mapMusic: string;
  river: { outer: number; inner: number; shine: number; kind: 'water' | 'ice' | 'lava' } | null;
  plate: number; // HUD plate colour on its map
  castles: CastleDef[];
}

const k1Castles: CastleDef[] = [
  { name: 'Mossy Fort',      ring: 130, wallHp: 120, towers: 0, towerHp: 0,   towerDmg: 0,  keepHp: 500,  defenders: 1, defenderHp: 80,  defenderDmg: 9,  keepBoulder: 0,  huts: 2, loot: 60,  color: 0xd94a3a },
  { name: 'Goblin Gate',     ring: 140, wallHp: 180, towers: 2, towerHp: 260, towerDmg: 7,  keepHp: 700,  defenders: 2, defenderHp: 100, defenderDmg: 11, keepBoulder: 0,  huts: 2, loot: 100, color: 0x6b9c2a },
  { name: 'Stonewatch',      ring: 150, wallHp: 260, towers: 3, towerHp: 340, towerDmg: 9,  keepHp: 900,  defenders: 3, defenderHp: 120, defenderDmg: 13, keepBoulder: 38, huts: 3, loot: 150, color: 0x8a5ac8 },
  { name: 'Iron Keep',       ring: 160, wallHp: 360, towers: 4, towerHp: 420, towerDmg: 11, keepHp: 1200, defenders: 4, defenderHp: 150, defenderDmg: 15, keepBoulder: 44, huts: 3, loot: 220, color: 0x5a6a7a },
  { name: 'Dragon Rock',     ring: 170, wallHp: 460, towers: 4, towerHp: 520, towerDmg: 13, keepHp: 1500, defenders: 6, defenderHp: 170, defenderDmg: 17, keepBoulder: 50, huts: 4, loot: 300, color: 0xe08a1e },
  { name: 'The Royal Citadel', ring: 180, wallHp: 600, towers: 6, towerHp: 600, towerDmg: 15, keepHp: 2000, defenders: 8, defenderHp: 200, defenderDmg: 19, keepBoulder: 56, huts: 4, loot: 450, color: 0xf2c230, doubleWall: true },
];

// Frost Realm: ice knights + archers on the walls. Starts a bit below the Royal Citadel, ends above it.
const k2Castles: CastleDef[] = [
  { name: 'Snowdrift Fort', ring: 140, wallHp: 300, towers: 2, towerHp: 400, towerDmg: 11, keepHp: 1300, defenders: 4, defenderHp: 170, defenderDmg: 16, keepBoulder: 0,  huts: 2, loot: 200, color: 0x7fd0ff, wallArchers: 2, wallArcherHp: 90,  wallArcherDmg: 9 },
  { name: 'Icicle Gate',    ring: 150, wallHp: 380, towers: 3, towerHp: 450, towerDmg: 12, keepHp: 1500, defenders: 5, defenderHp: 185, defenderDmg: 17, keepBoulder: 0,  huts: 3, loot: 240, color: 0xb0f0ff, wallArchers: 3, wallArcherHp: 95,  wallArcherDmg: 10 },
  { name: 'Frozen Falls',   ring: 155, wallHp: 450, towers: 4, towerHp: 500, towerDmg: 12, keepHp: 1700, defenders: 5, defenderHp: 200, defenderDmg: 18, keepBoulder: 50, huts: 3, loot: 280, color: 0x5ab0e0, wallArchers: 4, wallArcherHp: 100, wallArcherDmg: 10 },
  { name: 'Glacier Hold',   ring: 165, wallHp: 520, towers: 4, towerHp: 560, towerDmg: 13, keepHp: 1900, defenders: 6, defenderHp: 210, defenderDmg: 19, keepBoulder: 54, huts: 4, loot: 320, color: 0x9ad8ff, wallArchers: 4, wallArcherHp: 105, wallArcherDmg: 11 },
  { name: 'Crystal Spire',  ring: 175, wallHp: 600, towers: 5, towerHp: 460, towerDmg: 14, keepHp: 1650, defenders: 6, defenderHp: 160, defenderDmg: 20, keepBoulder: 58, huts: 4, loot: 380, color: 0xd8f6ff, wallArchers: 5, wallArcherHp: 110, wallArcherDmg: 11 },
  { name: "Frost Giant's Citadel", ring: 182, wallHp: 650, towers: 6, towerHp: 480, towerDmg: 15, keepHp: 1800, defenders: 5, defenderHp: 170, defenderDmg: 21, keepBoulder: 60, huts: 4, loot: 520, color: 0xffffff, doubleWall: true, wallArchers: 6, wallArcherHp: 110, wallArcherDmg: 12,
    boss: { kind: 'giant', name: 'the Frost Giant', hp: 2600, dmg: 46, range: 42, cooldown: 1500, speed: 46, splash: 56 } },
];

// Desert Sands: sand forts with enemy catapults; the boss is a camel rider.
const k3Castles: CastleDef[] = [
  { name: 'Dune Fort',       ring: 150, wallHp: 460, towers: 3, towerHp: 520, towerDmg: 13, keepHp: 1900, defenders: 5, defenderHp: 210, defenderDmg: 19, keepBoulder: 0,  huts: 3, loot: 320, color: 0xf2b84a, wallArchers: 2, wallArcherHp: 105, wallArcherDmg: 11, catapults: 1, catapultDmg: 34 },
  { name: 'Oasis Gate',      ring: 158, wallHp: 530, towers: 4, towerHp: 570, towerDmg: 14, keepHp: 2100, defenders: 5, defenderHp: 225, defenderDmg: 20, keepBoulder: 0,  huts: 3, loot: 360, color: 0x3fc0a0, wallArchers: 3, wallArcherHp: 110, wallArcherDmg: 12, catapults: 1, catapultDmg: 36 },
  { name: 'Scorpion Walls',  ring: 165, wallHp: 600, towers: 4, towerHp: 620, towerDmg: 15, keepHp: 2300, defenders: 6, defenderHp: 235, defenderDmg: 21, keepBoulder: 58, huts: 4, loot: 400, color: 0xc0502a, wallArchers: 3, wallArcherHp: 115, wallArcherDmg: 12, catapults: 2, catapultDmg: 36 },
  { name: 'Sandstone Keep',  ring: 172, wallHp: 680, towers: 5, towerHp: 670, towerDmg: 15, keepHp: 2500, defenders: 6, defenderHp: 245, defenderDmg: 22, keepBoulder: 62, huts: 4, loot: 440, color: 0xe0a060, wallArchers: 4, wallArcherHp: 120, wallArcherDmg: 13, catapults: 2, catapultDmg: 38 },
  { name: 'Mirage Towers',   ring: 180, wallHp: 750, towers: 6, towerHp: 530, towerDmg: 16, keepHp: 2100, defenders: 7, defenderHp: 190, defenderDmg: 23, keepBoulder: 64, huts: 4, loot: 490, color: 0xffe08a, wallArchers: 4, wallArcherHp: 125, wallArcherDmg: 13, catapults: 2, catapultDmg: 40 },
  { name: "Camel King's Palace", ring: 186, wallHp: 780, towers: 6, towerHp: 560, towerDmg: 17, keepHp: 2250, defenders: 6, defenderHp: 200, defenderDmg: 24, keepBoulder: 66, huts: 4, loot: 680, color: 0xffc23a, doubleWall: true, wallArchers: 5, wallArcherHp: 125, wallArcherDmg: 14, catapults: 3, catapultDmg: 40,
    boss: { kind: 'camel', name: 'the Camel King', hp: 3800, dmg: 58, range: 46, cooldown: 1300, speed: 70, splash: 60 } },
];

// Shadow Fortress: lava and dark towers; a dragon guards the final castle.
const k4Castles: CastleDef[] = [
  { name: 'Ember Gate',      ring: 158, wallHp: 640, towers: 4, towerHp: 650, towerDmg: 15, keepHp: 2600, defenders: 6, defenderHp: 250, defenderDmg: 22, keepBoulder: 60, huts: 3, loot: 470, color: 0xff6a2a, wallArchers: 3, wallArcherHp: 120, wallArcherDmg: 13, catapults: 1, catapultDmg: 40 },
  { name: 'Ashen Walls',     ring: 165, wallHp: 710, towers: 5, towerHp: 700, towerDmg: 16, keepHp: 2900, defenders: 6, defenderHp: 265, defenderDmg: 23, keepBoulder: 64, huts: 4, loot: 520, color: 0x8a8a9a, wallArchers: 4, wallArcherHp: 125, wallArcherDmg: 14, catapults: 1, catapultDmg: 42 },
  { name: 'Lava Moat',       ring: 172, wallHp: 780, towers: 5, towerHp: 750, towerDmg: 17, keepHp: 3200, defenders: 7, defenderHp: 280, defenderDmg: 24, keepBoulder: 66, huts: 4, loot: 570, color: 0xff3a1a, wallArchers: 4, wallArcherHp: 130, wallArcherDmg: 14, catapults: 2, catapultDmg: 44 },
  { name: 'Obsidian Keep',   ring: 180, wallHp: 850, towers: 6, towerHp: 800, towerDmg: 18, keepHp: 3500, defenders: 7, defenderHp: 290, defenderDmg: 25, keepBoulder: 70, huts: 4, loot: 620, color: 0x5a3a8a, wallArchers: 5, wallArcherHp: 135, wallArcherDmg: 15, catapults: 2, catapultDmg: 46 },
  { name: 'The Dark Towers', ring: 186, wallHp: 920, towers: 7, towerHp: 630, towerDmg: 19, keepHp: 2850, defenders: 8, defenderHp: 220, defenderDmg: 26, keepBoulder: 72, huts: 4, loot: 700, color: 0x9a4ad8, wallArchers: 5, wallArcherHp: 140, wallArcherDmg: 15, catapults: 2, catapultDmg: 48 },
  { name: "The Dragon's Lair", ring: 190, wallHp: 950, towers: 6, towerHp: 640, towerDmg: 19, keepHp: 3000, defenders: 6, defenderHp: 220, defenderDmg: 26, keepBoulder: 72, huts: 4, loot: 950, color: 0xff2a2a, doubleWall: true, wallArchers: 6, wallArcherHp: 140, wallArcherDmg: 15, catapults: 2, catapultDmg: 48,
    boss: { kind: 'dragon', name: 'the Dragon', hp: 5200, dmg: 52, range: 250, cooldown: 2300, speed: 40, splash: 72 } },
];

/**
 * Difficulty knobs for the later kingdoms (tuned with scripts/balance-sim.mjs). The tables above give the
 * shape of each kingdom (which castle has what); these scale them so a big, fully-geared army is still pushed.
 */
export interface Tuning { hp: number; guardHp: number; dmg: number; boss: number; bossDmg: number; /** extra scale on the boss castle's walls and guards (the boss is the real fight there) */ bossCastle: number }
export const TUNING: Tuning[] = [
  { hp: 1, guardHp: 1, dmg: 1, boss: 1, bossDmg: 1, bossCastle: 1 },
  { hp: 2.4, guardHp: 2.4, dmg: 2.3, boss: 1.0, bossDmg: 1.1, bossCastle: 0.85 },
  { hp: 2.2, guardHp: 2.2, dmg: 2.1, boss: 1.1, bossDmg: 1.1, bossCastle: 0.85 },
  { hp: 2.0, guardHp: 2.0, dmg: 1.9, boss: 1.4, bossDmg: 1.15, bossCastle: 0.9 },
];
const r = (n: number | undefined, m: number) => (n === undefined ? undefined : Math.round(n * m));
export function tuneCastle(c: CastleDef, k: Tuning): CastleDef {
  const f = c.boss ? k.bossCastle : 1;
  const t = { ...k, hp: k.hp * f, guardHp: k.guardHp * f, dmg: k.dmg * f };
  return {
    ...c,
    wallHp: r(c.wallHp, t.hp)!, towerHp: r(c.towerHp, t.hp)!, keepHp: r(c.keepHp, t.hp)!,
    towerDmg: r(c.towerDmg, t.dmg)!, keepBoulder: r(c.keepBoulder, t.dmg)!,
    defenderHp: r(c.defenderHp, t.guardHp)!, defenderDmg: r(c.defenderDmg, t.dmg)!,
    wallArcherHp: r(c.wallArcherHp, t.guardHp), wallArcherDmg: r(c.wallArcherDmg, t.dmg), catapultDmg: r(c.catapultDmg, t.dmg),
    boss: c.boss && { ...c.boss, hp: r(c.boss.hp, k.boss)!, dmg: r(c.boss.dmg, k.bossDmg)! },
  };
}
const tuned = (cs: CastleDef[], k: number) => cs.map((c) => tuneCastle(c, TUNING[k]));

export const KINGDOMS: KingdomDef[] = [
  {
    id: 'green', name: 'The Green Kingdom', short: 'Green Kingdom', skill: 'Short-vowel words & sight words', example: 'cat, the, said',
    crown: 'Emerald Crown', ground: 'grass', groundTint: 0xffffff, dirtTint: 0xffffff, castleTint: 0xffffff,
    decor: ['tree', 'pine', 'bush', 'rock', 'flowers', 'tree', 'bush', 'flowers'],
    enemyTeam: 'red', enemyName: 'castle guards', weather: 'none', mapMusic: 'map',
    river: { outer: 0x2b6fa8, inner: 0x3fa9e8, shine: 0x9ad8ff, kind: 'water' }, plate: 0x2b1d14, castles: k1Castles,
  },
  {
    id: 'frost', name: 'The Frost Realm', short: 'Frost Realm', skill: 'Blends & digraphs', example: 'ship, frog, chest',
    crown: 'Ice Crown', ground: 'ground_snow', groundTint: 0xffffff, dirtTint: 0xdcecff, castleTint: 0xd4ecff,
    decor: ['pine_snow', 'pine_snow', 'ice_rock', 'snow_bush', 'snowman', 'pine_snow', 'ice_rock', 'snow_bush'],
    enemyTeam: 'ice', enemyName: 'ice knights', weather: 'snow', mapMusic: 'frost',
    river: { outer: 0x7aa8cc, inner: 0xbfe4f8, shine: 0xffffff, kind: 'ice' }, plate: 0x1d3550, castles: tuned(k2Castles, 1),
  },
  {
    id: 'desert', name: 'The Desert Sands', short: 'Desert Sands', skill: 'Magic e & vowel teams', example: 'cake, rain, boat',
    crown: 'Sun Crown', ground: 'ground_sand', groundTint: 0xffffff, dirtTint: 0xffe2a8, castleTint: 0xffd890,
    decor: ['cactus', 'palm', 'dune_rock', 'cactus', 'skull', 'dune_rock', 'palm', 'cactus'],
    enemyTeam: 'sand', enemyName: 'desert raiders', weather: 'sand', mapMusic: 'desert',
    river: null, plate: 0x5a3010, castles: tuned(k3Castles, 2),
  },
  {
    id: 'shadow', name: 'The Shadow Fortress', short: 'Shadow Fortress', skill: 'Two-syllable words & 2nd-grade sight words', example: 'sunset, rabbit, very',
    crown: 'Dragon Crown', ground: 'ground_ash', groundTint: 0xffffff, dirtTint: 0x7a6a72, castleTint: 0x8a7c9c,
    decor: ['dead_tree', 'lava_rock', 'crystal', 'dead_tree', 'ember_vent', 'lava_rock', 'crystal', 'dead_tree'],
    enemyTeam: 'shadow', enemyName: 'shadow knights', weather: 'embers', mapMusic: 'shadow',
    river: { outer: 0x7a1a0a, inner: 0xff5a1a, shine: 0xffd04a, kind: 'lava' }, plate: 0x1a0f22, castles: tuned(k4Castles, 3),
  },
];

export const CASTLES_PER_KINGDOM = 6;
export const clampKingdom = (k: unknown) => Math.max(0, Math.min(KINGDOMS.length - 1, Math.floor(Number(k)) || 0));
