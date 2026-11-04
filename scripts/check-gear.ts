// Unit checks for gear tiers / upgrade data. Run: node --experimental-strip-types scripts/check-gear.ts
import { UPGRADES, UPGRADE_ORDER, SPEAR_TIERS, sanitizeUpgrades, defenderGear, ARMOR_BULK, maxLevel } from '../src/gear.ts';

let fail = 0;
const check = (name: string, ok: boolean, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); if (!ok) fail++; };

for (const id of UPGRADE_ORDER) {
  const u = UPGRADES[id];
  check(`${id}: one tier name per level (incl. starter)`, u.tiers.length === u.costs.length + 1);
  check(`${id}: costs go up`, u.costs.every((c, i) => i === 0 || c > u.costs[i - 1]), u.costs.join(','));
  check(`${id}: first upgrade within ~10 words (<=150 gold)`, u.costs[0] <= 150, String(u.costs[0]));
}
check('armor/weapons/bows have 5 looks', ['armor', 'sword', 'bow'].every((id) => UPGRADES[id as 'armor'].tiers.length === 5));
check('spear tiers match weapon tiers', SPEAR_TIERS.length === UPGRADES.sword.tiers.length);
check('armor bulk grows each tier', ARMOR_BULK.length === 5 && ARMOR_BULK.every((b, i) => i === 0 || b > ARMOR_BULK[i - 1]));

// Save migration
const full = (x: Record<string, number>) => UPGRADE_ORDER.map((id) => x[id]).join(',');
check('missing upgrades -> all 0', full(sanitizeUpgrades(undefined)) === '0,0,0,0');
check('old save levels kept', full(sanitizeUpgrades({ sword: 2, bow: 1, armor: 3 })) === '3,2,1,0');
check('junk / negative / too high clamped', full(sanitizeUpgrades({ sword: 'x', bow: -3, armor: 99, siege: 2.7 })) === `${maxLevel('armor')},0,0,2`);
check('non-object -> zeros', full(sanitizeUpgrades('nope')) === '0,0,0,0');

// Enemy gear
const dg = [0, 1, 2, 3, 4, 5].map((i) => defenderGear(i).armor);
check('defenders look tougher at later castles', dg.every((t, i) => i === 0 || t >= dg[i - 1]) && dg[5] === 4, dg.join(','));
check('defenderGear survives bad index', defenderGear(NaN).armor === 1 && defenderGear(99).armor === 4);

if (fail) { console.log(`${fail} gear check(s) failed`); process.exit(1); }
console.log('all gear checks passed');
