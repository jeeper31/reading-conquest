// Headless check + screenshots of the "Sound it out" view. Usage: node scripts/soundout-check.mjs
// (preview server must be running; BASE overrides the URL). SHOTS=0 skips writing screenshots.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:4173/reading-conquest/';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errs = [], audio = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('response', (r) => { if (r.url().includes('/audio/')) audio.push(`${r.status()} ${r.url().split('/audio/')[1]}`); });
await page.goto(BASE + '?scene=Read'); await page.waitForTimeout(1800);
await page.screenshot({ path: 'screenshots/02-reading.png' });
const box = await page.locator('canvas').boundingBox();
const s = box.width / 1280, at = (x, y) => page.mouse.click(box.x + x * s, box.y + y * s);
await at(640, 398); // the "Sound it out" button
await page.waitForTimeout(900);
console.log('opened via button:', await page.evaluate(() => !!window.__game.scene.getScene('Read').soundOut));
await at(640 - 300, 604); // Blend it
let duckedSeen = false;
for (let i = 0; i < 60; i++) { await page.waitForTimeout(100); if ((await page.evaluate(() => window.__audioDebug())).ducked) duckedSeen = true; }
console.log('music ducked during blend:', duckedSeen, await page.evaluate(() => window.__audioDebug().state));
await page.waitForTimeout(1500);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
for (const [w, f] of [['ship', '08-soundout-ship'], ['make', '09-soundout-make'], ['said', '10-soundout-said'], ['cake', '11-soundout-cake'], ['black', '12-soundout-black'], ['going', '13-soundout-going']]) {
  await page.evaluate((w) => { const r = window.__game.scene.getScene('Read'); r.soundOut?.close(); window.__soundOut(w); }, w);
  await page.waitForTimeout(1500);
  if (process.env.SHOTS !== '0') await page.screenshot({ path: `screenshots/${f}.png` });
  // tap the first tile
  await at(400, 300); await page.waitForTimeout(500);
}
const bad = audio.filter((a) => !a.startsWith('200') && !a.startsWith('304'));
console.log('audio requests:', audio.length, bad.length ? 'BAD: ' + bad.join(', ') : 'all ok');
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
await browser.close();
process.exit(errs.length || bad.length ? 1 : 0);
