// Headless check: music unlocks after a gesture, toggle persists, and renders WAV samples.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4173/reading-conquest/';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await page.goto(BASE); await page.waitForTimeout(2000);
console.log('before gesture', await page.evaluate(() => window.__audioDebug()));
await page.mouse.click(300, 600); await page.waitForTimeout(800);
console.log('after gesture', await page.evaluate(() => window.__audioDebug()));
// click the music toggle (title: logical 1150,44 → canvas scale)
const box = await page.locator('canvas').boundingBox();
const s = box.width / 1280;
await page.mouse.click(box.x + 1150 * s, box.y + 44 * s); await page.waitForTimeout(300);
console.log('after toggle', await page.evaluate(() => [window.__audioDebug(), localStorage.getItem('reading-conquest-settings-v1')]));
await page.reload(); await page.waitForTimeout(1500);
console.log('after reload', await page.evaluate(() => window.__audioDebug().settings));
await page.mouse.click(box.x + 1150 * s, box.y + 44 * s); await page.waitForTimeout(300);
console.log('re-enabled', await page.evaluate(() => window.__audioDebug().settings));
if (process.env.RENDER) {
  fs.mkdirSync('music-samples', { recursive: true });
  for (const [name, sec] of [['camp', 22], ['battle', 22], ['map', 20], ['read', 16], ['victory', 4], ['defeat', 4]]) {
    const b64 = await page.evaluate(([n, t]) => window.__renderTrackWav(n, t), [name, sec]);
    const buf = Buffer.from(b64, 'base64');
    let peak = 0; for (let i = 44; i < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
    fs.writeFileSync(`music-samples/${name}.wav`, buf);
    console.log('rendered', name, (buf.length / 1024 / 1024).toFixed(1) + 'MB', 'peak', (peak / 32767).toFixed(2));
  }
}
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
await browser.close();
