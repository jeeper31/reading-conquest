// Save migration (v1 -> v2), kingdom unlocking and the new-word / review mix.
import { migrate, pendingGraduation, kingdomUnlockedIn, topKingdom, wordPools, newWordShare, kingdomNewWords, pickWord, campSpace } from '../src/state.ts';
import { KINGDOMS, CASTLES_PER_KINGDOM, TUNING } from '../src/kingdoms.ts';
import { kingdomWords, BASE_LEVELS } from '../src/data/words.ts';
import { BREAKDOWNS } from '../src/data/phonics.ts';

let fails = 0, n = 0;
const ok = (name: string, cond: boolean, extra = '') => { n++; if (!cond) fails++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };

// His real save shape: v1, all six Green Kingdom castles beaten.
const v1 = {
  gold: 1234, army: { knight: 12, archer: 8, spearman: 6, ram: 2, catapult: 2 }, upgrades: { sword: 4, bow: 4, armor: 4, siege: 3 },
  stars: [3, 3, 3, 2, 3, 3], wordStats: { cat: { seen: 9, right: 8, miss: 1 } }, enabledLevels: ['cvc-a', 'sight-1'],
  totalRead: 512, bestStreak: 41, streak: 7, heroName: 'Sir Max',
};
const m = migrate(JSON.parse(JSON.stringify(v1)));
ok('v1 -> v2', m.v === 2);
ok('gold kept', m.gold === 1234);
ok('army kept', JSON.stringify(m.army) === JSON.stringify(v1.army));
ok('upgrades kept', (Object.keys(v1.upgrades) as (keyof typeof v1.upgrades)[]).every((k) => m.upgrades[k] === v1.upgrades[k]), JSON.stringify(m.upgrades));
ok('streak + best kept', m.streak === 7 && m.bestStreak === 41);
ok('hero + stats kept', m.heroName === 'Sir Max' && m.wordStats.cat.right === 8 && m.totalRead === 512);
ok('green stars moved into kstars[0]', JSON.stringify(m.kstars[0]) === '[3,3,3,2,3,3]');
ok('later kingdoms empty', m.kstars.slice(1).every((r) => r.length === CASTLES_PER_KINGDOM && r.every((s) => s === 0)));
ok('Frost Realm unlocked', kingdomUnlockedIn(m, 1));
ok('Desert still locked', !kingdomUnlockedIn(m, 2));
ok('top kingdom = Frost', topKingdom(m) === 1);
ok('graduation pending for green', pendingGraduation(m) === 0);
ok('starts in green until he travels', m.kingdom === 0);
const again = migrate(JSON.parse(JSON.stringify({ ...m, crowns: [0], kingdom: 1 })));
ok('migrate is idempotent on v2', JSON.stringify(again.kstars) === JSON.stringify(m.kstars) && again.kingdom === 1);
ok('crown shown -> no pending', pendingGraduation(again) === null);
ok('locked kingdom falls back to 0', migrate({ ...v1, kingdom: 3 }).kingdom === 0);
ok('junk kingdom clamped', migrate({ ...v1, kingdom: 'x' }).kingdom === 0);
ok('fresh save -> green, nothing pending', migrate(null).kingdom === 0 && pendingGraduation(migrate(null)) === null);
ok('camp space keeps growing', campSpace(m) === 50 && campSpace({ ...m, kstars: m.kstars.map((r) => r.map(() => 3)) }) === 104);

// Words
for (let k = 1; k < KINGDOMS.length; k++) {
  const w = kingdomWords(k);
  ok(`kingdom ${k} has ~20 new words`, w.length >= 18 && w.length <= 22, String(w.length));
  ok(`kingdom ${k} words all have breakdowns`, w.every((x) => !!BREAKDOWNS[x]));
  const base = new Set(BASE_LEVELS.flatMap((l) => l.words));
  ok(`kingdom ${k} words are really new`, w.every((x) => !base.has(x)), w.filter((x) => base.has(x)).join(','));
  const d = { ...again, kingdom: k, kstars: again.kstars.map((r, j) => (j < k ? r.map(() => 3) : r)) };
  ok(`kingdom ${k} starts with 8 new words`, kingdomNewWords(k, d).length === 8);
  const { review, fresh } = wordPools(k, d);
  ok(`kingdom ${k} review pool is big`, review.length >= 30, String(review.length));
  ok(`kingdom ${k} share 30-40%`, newWordShare(k, d) >= 0.3 && newWordShare(k, d) <= 0.4);
  // simulate 2000 picks
  let s = 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let nNew = 0, prev: string | undefined;
  for (let i = 0; i < 2000; i++) { prev = pickWord(prev, rnd, d); if (fresh.includes(prev)) nNew++; }
  const pct = nNew / 2000;
  ok(`kingdom ${k} review is 60-70%+ of reading`, pct >= 0.25 && pct <= 0.4, `${Math.round((1 - pct) * 100)}% review`);
  const maxed = { ...d, kstars: d.kstars.map((r, j) => (j <= k ? r.map(() => 3) : r)) };
  ok(`kingdom ${k} all words after boss`, kingdomNewWords(k, maxed).length === w.length);
}
ok('green kingdom has no "new words" mode', newWordShare(0, m) === 0);

// Difficulty tuning: Green Kingdom untouched, later kingdoms are whole numbers and each ends on a boss.
ok('green kingdom not scaled', Object.values(TUNING[0]).every((v) => v === 1) && KINGDOMS[0].castles[5].wallHp === 600 && KINGDOMS[0].castles[0].keepHp === 500);
for (let k = 1; k < KINGDOMS.length; k++) {
  const cs = KINGDOMS[k].castles;
  ok(`kingdom ${k + 1} stats are whole numbers`, cs.every((c) => [c.wallHp, c.towerHp, c.keepHp, c.defenderHp, c.defenderDmg, c.towerDmg].every((v) => Number.isInteger(v) && v >= 0)));
  ok(`kingdom ${k + 1} ends on a boss`, !!cs[5].boss && cs.slice(0, 5).every((c) => !c.boss));
  ok(`kingdom ${k + 1} first castle tougher than the Royal Citadel's walls`, cs[0].wallHp > KINGDOMS[0].castles[5].wallHp);
}
console.log(fails ? `kingdoms: ${fails}/${n} FAILED` : `kingdoms: all ${n} checks passed`);
if (fails) process.exit(1);
