// Screenshots of the four-kingdom update (29+). Usage: node scripts/kingdom-screens.mjs  (preview server must be running)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE_URL || 'http://localhost:4173/reading-conquest/';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
// His save before the update: v1, all six Green Kingdom castles beaten.
const v1 = {
  gold: 1234, army: { knight: 14, archer: 12, spearman: 8, ram: 2, catapult: 2 }, upgrades: { sword: 4, bow: 4, armor: 4, siege: 3 },
  stars: [3, 3, 3, 2, 3, 3], wordStats: {}, enabledLevels: ['cvc', 'dolch-primer', 'dolch-first'], totalRead: 512, bestStreak: 41, streak: 7, heroName: 'Sir Reader',
};
const v2 = (k, extra = {}) => ({
  v: 2, gold: 900, army: { knight: 16, archer: 14, spearman: 10, ram: 2, catapult: 3 }, upgrades: { sword: 5, bow: 5, armor: 5, siege: 4 },
  kstars: [0, 1, 2, 3].map((j) => (j < k ? [3, 3, 3, 2, 3, 3] : j === k ? [3, 2, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0])),
  stars: [3, 3, 3, 2, 3, 3], crowns: [0, 1, 2].filter((j) => j < k), kingdom: k, wordStats: {}, enabledLevels: ['cvc', 'dolch-primer', 'dolch-first'],
  totalRead: 800, bestStreak: 41, streak: 3, heroName: 'Sir Reader', ...extra,
});
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-fake-ui-for-media-stream', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] });
const errors = [];
async function shot(name, save, q, wait, until) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript((s) => localStorage.setItem('reading-conquest-save-v1', s), JSON.stringify(save));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  for (let tries = 0; tries < 15; tries++) {
    await page.goto(BASE + q);
    await page.waitForTimeout(wait);
    if (!until || (await page.evaluate(until))) break;
  }
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log('saved', `screenshots/${name}.png`);
  await ctx.close();
}
await shot('29-crown-ceremony', v1, '?scene=Map', 2600);
await shot('30-new-kingdom-unlocked', v1, '?scene=Map', 7000);
await shot('31-kingdom-select', v2(1), '?scene=Kingdoms', 1800);
await shot('32-kingdom-select-late', v2(3), '?scene=Kingdoms', 1800);
await shot('33-map-frost-realm', v2(1), '?scene=Map&kingdom=1', 1800);
await shot('34-map-desert-sands', v2(2), '?scene=Map&kingdom=2', 1800);
await shot('35-map-shadow-fortress', v2(3), '?scene=Map&kingdom=3', 1800);
await shot('36-battle-frost-realm', v2(1), '?scene=Battle&kingdom=1&castle=2&autodeploy=1&army=save', 9000);
await shot('37-battle-desert-sands', v2(2), '?scene=Battle&kingdom=2&castle=2&autodeploy=1&army=save', 9000);
await shot('38-battle-shadow-fortress', v2(3), '?scene=Battle&kingdom=3&castle=3&autodeploy=1&army=save', 9000);
await shot('39-boss-frost-giant', v2(1), '?scene=Battle&kingdom=1&castle=5', 1600);
await shot('40-boss-camel-king-fight', v2(2), '?scene=Battle&kingdom=2&castle=5&autodeploy=1&army=save&speed=2', 14000);
await shot('41-boss-dragon-fight', v2(3), '?scene=Battle&kingdom=3&castle=5&autodeploy=1&army=save&speed=2', 14000);
await shot('42-read-new-word', v2(1), '?scene=Read', 1500, () => !!window.__game?.scene.getScene('Read')?.newTag?.visible);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
