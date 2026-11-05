// Headless: a partial battle must be "SO CLOSE" (no stars, no unlock), a 100% battle is VICTORY. BASE overrides URL.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:4173/reading-conquest/';
const SHOTS = process.env.SHOTS !== '0';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] });
let fail = 0; const check = (n, ok, x = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${n} ${x}`); if (!ok) fail++; };
async function battle(k, c, army, upgrades, kst, shot) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const save = { v: 2, gold: 0, army, upgrades, kstars: kst, stars: kst[0], crowns: [], kingdom: k, wordStats: {}, enabledLevels: ['cvc', 'dolch-primer', 'dolch-first'], totalRead: 50, bestStreak: 3, streak: 0, heroName: 'T' };
  await ctx.addInitScript((s) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('reading-conquest-save-v1', s); sessionStorage.setItem('x', '1'); } }, JSON.stringify(save));
  const page = await ctx.newPage();
  await page.goto(`${BASE}?scene=Battle&kingdom=${k}&castle=${c}&autodeploy=1&army=save&speed=3`);
  await page.waitForFunction(() => window.__game?.scene.getScene('Battle')?.over, null, { timeout: 200000, polling: 1000 });
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => { const s = window.__game.scene.getScene('Battle'); return { pct: s.percent(), stars: s.computeStars(), res: window.__battleResult, save: JSON.parse(localStorage.getItem('reading-conquest-save-v1')) }; });
  if (SHOTS) await page.screenshot({ path: shot });
  await ctx.close();
  return r;
}
const z = () => [0, 1, 2, 3].map(() => [0, 0, 0, 0, 0, 0]);
const ks = z(); ks[0] = [3, 3, 3, 3, 3, 0];
const p = await battle(0, 5, { knight: 7, archer: 5, spearman: 3, ram: 1, catapult: 1 }, { sword: 2, bow: 2, armor: 2, siege: 1 }, ks, 'screenshots/47-battle-so-close.png');
check('partial battle is not a win', p.pct < 100 && !p.res.win && p.res.stars === 0, JSON.stringify(p.res));
check('partial gives consolation gold', p.res.loot > 0 && p.res.loot < 450, `loot=${p.res.loot}`);
const ks2 = z(); ks2[0] = [3, 0, 0, 0, 0, 0];
const v = await battle(0, 1, { knight: 14, archer: 13, spearman: 9, ram: 2, catapult: 2 }, { sword: 3, bow: 3, armor: 3, siege: 2 }, ks2, 'screenshots/48-battle-victory-100.png');
check('100% is a win', v.pct === 100 && v.res.win && v.res.stars > 0, JSON.stringify(v.res));
await browser.close();
console.log(fail ? `${fail} FAILED` : 'all battle checks passed'); process.exit(fail ? 1 : 0);
