// Headless screenshots of each screen. Usage: npm run screenshots  (preview server must be running)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE_URL || 'http://localhost:4173/reading-conquest/';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
const save = {
  v: 1, gold: 340, army: { knight: 8, archer: 6, spearman: 4, ram: 1, catapult: 1 },
  upgrades: { sword: 1, bow: 1, armor: 0, siege: 0 }, stars: [3, 2, 0, 0, 0, 0], wordStats: {},
  enabledLevels: ['cvc', 'dolch-primer', 'dolch-first'], totalRead: 57, bestStreak: 9, heroName: 'Sir Reader',
};
const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  args: ['--use-fake-ui-for-media-stream', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
await ctx.addInitScript((s) => { if (!localStorage.getItem('reading-conquest-save-v1')) localStorage.setItem('reading-conquest-save-v1', s); }, JSON.stringify(save));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shots = [
  ['01-title', '', 1500],
  ['02-reading', '?scene=Read', 1500],
  ['03-camp', '?scene=Camp', 1500],
  ['04-castle-map', '?scene=Map', 1500],
  ['05-battle-start', '?scene=Battle&castle=2', 1200],
  ['06-battle-midfight', '?scene=Battle&castle=2&autodeploy=1', Number(process.env.FIGHT_MS || 9000)],
  ['07-battle-later', '?scene=Battle&castle=1&autodeploy=1', Number(process.env.LATE_MS || 26000)],
];
for (const [name, q, wait] of shots) {
  await page.goto(BASE + q);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log('saved', `${OUT}${name}.png`);
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
