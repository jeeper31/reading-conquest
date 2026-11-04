// Balance check: auto-deploys a given army against every castle (at 3x speed) and prints stars.
// Usage: node scripts/balance-sim.mjs  (preview server must be running)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE_URL || 'http://localhost:4173/reading-conquest/';
const PROFILE = process.env.PROFILE || 'max';
const ONLY = process.env.KINGDOMS ? process.env.KINGDOMS.split(',').map(Number) : [1, 2, 3];
const upgrades = PROFILE === 'max' ? { sword: 5, bow: 5, armor: 5, siege: 4 } : PROFILE === 'mid' ? { sword: 3, bow: 3, armor: 3, siege: 2 } : { sword: 4, bow: 4, armor: 4, siege: 3 };
// Camp space he will have when he arrives in kingdom k (all earlier castles beaten), filled like a kid would.
const armyFor = (k) => {
  const space = 20 + 30 + 18 * (k - 1);
  const siege = { ram: 2 + (k > 2 ? 1 : 0), catapult: 2 + (k > 1 ? 1 : 0) };
  let left = space - siege.ram * 3 - siege.catapult * 4;
  const knight = Math.round(left * 0.4), archer = Math.round(left * 0.35);
  return { knight, archer, spearman: left - knight - archer, ...siege };
};
const kstars = (k) => [0, 1, 2, 3].map((j) => (j < k ? [3, 3, 3, 3, 3, 3] : [0, 0, 0, 0, 0, 0]));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] });
const jobs = [];
const ONLY_C = process.env.CASTLES ? process.env.CASTLES.split(',').map(Number) : [0, 1, 2, 3, 4, 5];
for (const k of ONLY) for (const c of ONLY_C) jobs.push([k, c]);
const results = [];
async function run(k, c) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const save = { v: 2, gold: 0, army: armyFor(k), upgrades, kstars: kstars(k), stars: [3, 3, 3, 3, 3, 3], crowns: [0, 1, 2].filter((j) => j < k), kingdom: k, wordStats: {}, enabledLevels: ['cvc', 'dolch-primer', 'dolch-first'], totalRead: 500, bestStreak: 20, streak: 0, heroName: 'Sim' };
  await ctx.addInitScript((s) => localStorage.setItem('reading-conquest-save-v1', s), JSON.stringify(save));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}?scene=Battle&kingdom=${k}&castle=${c}&autodeploy=1&army=save&speed=3`);
  const t0 = Date.now();
  let r = null;
  while (Date.now() - t0 < 150000) {
    await page.waitForTimeout(2000);
    r = await page.evaluate(() => {
      const s = window.__game?.scene.getScene('Battle');
      if (!s || !s.def) return null;
      const blues = s.units.filter((u) => u.alive && u.team === 'blue').length;
      return { over: s.over, stars: s.computeStars(), pct: s.percent(), boss: s.bossUnit ? Math.round(s.bossUnit.hp) : null, blues, time: Math.round(s.timeLeft) };
    });
    if (r?.over) break;
  }
  results.push({ k, c, ...r, errs: errs.slice(0, 2) });
  console.log(`K${k + 1} C${c + 1}: stars=${r?.stars} pct=${r?.pct}% boss=${r?.boss} survivors=${r?.blues} timeLeft=${r?.time}s ${errs.length ? 'ERR ' + errs[0] : ''}`);
  await ctx.close();
}
const N = 3;
await Promise.all(Array.from({ length: N }, async () => { while (jobs.length) { const [k, c] = jobs.shift(); await run(k, c); } }));
console.log(PROFILE, JSON.stringify(Object.fromEntries([1, 2, 3].map((k) => [k, armyFor(k)]))));
await browser.close();
