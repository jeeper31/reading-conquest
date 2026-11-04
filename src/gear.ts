// Gear tiers: what each upgrade level is called and how it looks. Pure data (no Phaser), so it can be unit-tested.
// Upgrade levels live in save.upgrades (sword / bow / armor / siege). Level 0 = what new recruits start with.

export type UpgradeId = 'sword' | 'bow' | 'armor' | 'siege';

export interface TierInfo { name: string; short: string }

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  blurb: string; // the gameplay effect of each level, kid-readable
  costs: number[]; // cost to go from level i to level i+1
  tiers: TierInfo[]; // tiers.length === costs.length + 1 (tier 0 = starter gear)
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  armor: {
    id: 'armor', name: 'Armor', blurb: '+20% health for all troops', costs: [80, 180, 320, 500, 850],
    tiers: [
      { name: 'Cloth Tunic', short: 'Cloth' },
      { name: 'Leather Armor', short: 'Leather' },
      { name: 'Chainmail', short: 'Chainmail' },
      { name: 'Steel Plate', short: 'Steel' },
      { name: 'Royal Gold Armor', short: 'Royal Gold' },
      { name: 'Dragon Scale Armor', short: 'Dragon Scale' },
    ],
  },
  sword: {
    id: 'sword', name: 'Weapons', blurb: '+25% knight & spear damage', costs: [80, 180, 320, 500, 850],
    tiers: [
      { name: 'Wooden Club', short: 'Club' },
      { name: 'Dagger', short: 'Dagger' },
      { name: 'Iron Sword', short: 'Iron' },
      { name: 'Steel Longsword', short: 'Longsword' },
      { name: 'Legend Sword', short: 'Legend' },
      { name: 'Dragonfire Blade', short: 'Dragonfire' },
    ],
  },
  bow: {
    id: 'bow', name: 'Bows', blurb: '+25% archer damage, +8% range', costs: [80, 180, 320, 500, 850],
    tiers: [
      { name: 'Twig Bow', short: 'Twig' },
      { name: 'Hunting Bow', short: 'Hunting' },
      { name: 'Recurve Bow', short: 'Recurve' },
      { name: 'Steel Longbow', short: 'Steel' },
      { name: 'Golden Star Bow', short: 'Star' },
      { name: 'Phoenix Bow', short: 'Phoenix' },
    ],
  },
  siege: {
    id: 'siege', name: 'Siege Works', blurb: '+30% ram & catapult damage', costs: [150, 300, 500, 800],
    tiers: [
      { name: 'Rough Wood', short: 'Wood' },
      { name: 'Iron Bands', short: 'Iron' },
      { name: 'Steel Plates', short: 'Steel' },
      { name: 'Royal Gold Trim', short: 'Gold' },
      { name: 'Dragon Iron', short: 'Dragon Iron' },
    ],
  },
};

/** Spearmen use the Weapons track too; their spears get their own names. */
export const SPEAR_TIERS = ['Pointy Stick', 'Bronze Spear', 'Iron Spear', 'Steel Halberd', 'Dragon Lance', 'Phoenix Spear'];

export const UPGRADE_ORDER: UpgradeId[] = ['armor', 'sword', 'bow', 'siege'];

export const maxLevel = (id: UpgradeId) => UPGRADES[id].costs.length;

/** Turn whatever is in an old save into valid levels: missing -> 0, junk -> 0, too high -> max. */
export function sanitizeUpgrades(raw: unknown): Record<UpgradeId, number> {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_ORDER) {
    const n = Math.floor(Number(src[id]));
    out[id] = Number.isFinite(n) ? Math.max(0, Math.min(maxLevel(id), n)) : 0;
  }
  return out;
}

/** Gear a unit wears. armor 0-5, weapon 0-5 (siege uses weapon 0-4 for its trim). */
export interface Gear { armor: number; weapon: number }

/** Gear the enemy guards wear at each castle of each kingdom (they get tougher-looking as you go). */
export const GUARD_GEAR = [
  [1, 1, 2, 2, 3, 4], // Green Kingdom
  [2, 2, 3, 3, 4, 4], // Frost Realm
  [3, 3, 4, 4, 4, 5], // Desert Sands
  [4, 4, 5, 5, 5, 5], // Shadow Fortress
];
/** Enemy guards get tougher-looking gear at harder castles (castle index 0-5, kingdom 0-3). */
export function defenderGear(castleIdx: number, kingdom = 0): Gear {
  const row = GUARD_GEAR[Math.max(0, Math.min(GUARD_GEAR.length - 1, Math.floor(kingdom) || 0))];
  const t = row[Math.max(0, Math.min(5, Math.floor(castleIdx) || 0))];
  return { armor: t, weapon: t };
}

/** How much bigger the body is drawn at each armor tier (silhouette grows with the armor). */
export const ARMOR_BULK = [1, 1.05, 1.1, 1.17, 1.24, 1.3];
