// Headless check of the reading streak with a fake SpeechRecognition.
// Usage: node scripts/streak-check.mjs   (BASE overrides the URL, SHOTS=0 skips screenshots)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:4173/reading-conquest/';
const SHOTS = process.env.SHOTS !== '0';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.addInitScript(() => {
  if (!sessionStorage.getItem('streak-check')) { localStorage.clear(); sessionStorage.setItem('streak-check', '1'); }
  class FakeSR {
    constructor() { window.__sr = this; }
    start() { this.live = true; }
    stop() { if (this.live) { this.live = false; setTimeout(() => this.onend?.(), 50); } }
    abort() { this.live = false; }
    emit(alts) { const res = alts.map((t) => ({ transcript: t, confidence: 0.5 })); res.isFinal = true; this.onresult?.({ results: [res], resultIndex: 0 }); }
    end() { this.live = false; this.onend?.(); }
  }
  window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
});
await page.goto(BASE + '?scene=Read'); await page.waitForTimeout(2200);
const box = await page.locator('canvas').boundingBox();
const s = box.width / 1280, at = (x, y) => page.mouse.click(box.x + x * s, box.y + y * s);
const R = (fn, a) => page.evaluate(fn, a);
const sv = () => R(() => JSON.parse(localStorage.getItem('reading-conquest-save-v1') || '{}'));
const scene = () => R(() => { const r = window.__game.scene.getScene('Read'); return { streak: r.streak, tries: r.tries, busy: r.busy, word: r.word, hint: r.hintText.text }; });
let fail = 0; const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); if (!ok) fail++; };
const idle = () => page.waitForFunction(() => !window.__game.scene.getScene('Read').busy, null, { timeout: 9000 }).then(() => page.waitForTimeout(500));
const closeSoundOut = async () => {
  await page.waitForFunction(() => !!window.__game.scene.getScene('Read').soundOut, null, { timeout: 5000 });
  await page.waitForTimeout(300);
  await R(() => window.__game.scene.getScene('Read').soundOut?.close());
  await page.waitForFunction(() => !window.__game.scene.getScene('Read').soundOut, null, { timeout: 5000 }); await page.waitForTimeout(300);
};
const say = async (what) => {
  await at(640, 545);
  await page.waitForFunction(() => window.__game.scene.getScene('Read').listening, null, { timeout: 5000 }); await page.waitForTimeout(150); await R((w) => { const r = window.__game.scene.getScene('Read'); window.__sr.emit([w === '@word' ? r.word : w]); window.__sr.end(); }, what); await page.waitForTimeout(400); };
const readIt = async () => { await say('@word'); await idle(); };

const gold0 = (await sv()).gold ?? 60;
await readIt(); await readIt();
let a = await scene();
check('2 correct -> streak 2', a.streak === 2, JSON.stringify(a));
if (SHOTS) await page.screenshot({ path: 'screenshots/16-streak-counter.png' });
// 3rd word: miss twice and use Sound it out, then read it -> streak still counts
await say('zebra'); await say('zebra');
a = await scene(); check('2 misses keep the streak', a.streak === 2 && a.tries === 2, JSON.stringify(a));
await closeSoundOut();
await say('@word');
await page.waitForTimeout(1100);
if (SHOTS) await page.screenshot({ path: 'screenshots/17-streak-2x-banner.png' });
await idle();
a = await scene(); check('3rd correct (after helpers) -> streak 3, 2x on', a.streak === 3, JSON.stringify(a));
let g = (await sv()).gold; check('first 3 words pay 10 each', g - gold0 === 30, `+${g - gold0}`);
await say('@word'); await page.waitForTimeout(350);
if (SHOTS) await page.screenshot({ path: 'screenshots/18-streak-2x-payout.png' });
await idle();
let p = await R(() => window.__lastPayout); check('4th word pays 2x (20)', p.earned === 20 && p.mult === 2, JSON.stringify(p));
await readIt(); p = await R(() => window.__lastPayout); check('5th word: (10 + 20 bonus) x2 = 60', p.earned === 60, JSON.stringify(p));
g = (await sv()).gold; check('gold total after 5', g - gold0 === 110, `+${g - gold0}`);
check('streak saved', (await sv()).streak === 5);
// persists across a reload
await page.reload(); await page.waitForTimeout(2200);
a = await scene(); check('streak survives a reload', a.streak === 5, JSON.stringify(a));
// 3rd miss on one word ends it (gently)
await say('zebra'); await say('zebra'); await closeSoundOut();
await say('zebra');
a = await scene(); check('3rd miss ends the streak', a.streak === 0 && (await sv()).streak === 0, JSON.stringify(a));
if (SHOTS) await page.screenshot({ path: 'screenshots/19-streak-ended.png' });
await closeSoundOut();
await readIt(); p = await R(() => window.__lastPayout); a = await scene();
check('failed word still pays 10, new streak starts next word', p.earned === 10 && a.streak === 0, JSON.stringify(p));
await readIt(); a = await scene(); check('next word starts a new streak', a.streak === 1, JSON.stringify(a));
// Hear it: does nothing at streak 1? (no reset effect), ends a running streak
await readIt(); await readIt(); a = await scene(); check('streak 3 (2x on) before Hear it', a.streak === 3, JSON.stringify(a));
await at(640 - 300, 545); await page.waitForTimeout(900);
a = await scene(); check('Hear it ends the streak', a.streak === 0 && (await sv()).streak === 0 && /great practice/.test(a.hint), JSON.stringify(a));
if (SHOTS) await page.screenshot({ path: 'screenshots/43-hear-it-streak-reset.png' });
await readIt(); p = await R(() => window.__lastPayout); a = await scene();
check('heard word pays 10, does not count', p.earned === 10 && a.streak === 0, JSON.stringify(p));
await at(640 - 300, 545); await page.waitForTimeout(600);
a = await scene(); check('Hear it at streak 0: no reset message', a.streak === 0 && !/great practice/.test(a.hint), JSON.stringify(a));
await readIt(); a = await scene(); check('heard word (at 0) does not start a streak', a.streak === 0, JSON.stringify(a));
await readIt(); a = await scene(); check('next word starts a new streak', a.streak === 1, JSON.stringify(a));
// Sound it out's Hear word / Blend keep the streak
await R(() => { const r = window.__game.scene.getScene('Read'); r.openSoundOut(); r.soundOut.blend(); });
await page.waitForTimeout(1500); await closeSoundOut(); await readIt();
a = await scene(); check('Sound it out + Blend keeps the streak', a.streak === 2, JSON.stringify(a));
// Skip ends it
await at(640 + 300, 545); await page.waitForTimeout(500);
a = await scene(); check('Skip ends the streak', a.streak === 0, JSON.stringify(a));
check('no page errors', errs.length === 0, errs.join(' | '));
await browser.close();
console.log(fail ? `${fail} FAILED` : 'all streak checks passed');
process.exit(fail ? 1 : 0);
