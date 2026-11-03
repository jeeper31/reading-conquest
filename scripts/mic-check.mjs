// Headless check of push-to-listen behaviour with a fake SpeechRecognition.
// Usage: node scripts/mic-check.mjs   (BASE overrides the URL, SHOTS=0 skips screenshots)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:4173/reading-conquest/';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.addInitScript(() => {
  window.__srStarts = 0; window.__srLog = [];
  class FakeSR {
    constructor() { window.__sr = this; }
    start() { window.__srStarts++; window.__srLog.push(`start c=${this.continuous} max=${this.maxAlternatives} interim=${this.interimResults}`); this.live = true; }
    stop() { window.__srLog.push('stop'); if (this.live) { this.live = false; setTimeout(() => this.onend?.(), 50); } }
    abort() { this.live = false; }
    emit(alts, isFinal = false) {
      const res = alts.map((t) => ({ transcript: t, confidence: 0.5 })); res.isFinal = isFinal;
      this.onresult?.({ results: [res], resultIndex: 0 });
    }
    end() { this.live = false; this.onend?.(); }
  }
  window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
});
await page.goto(BASE + '?scene=Read'); await page.waitForTimeout(1800);
const box = await page.locator('canvas').boundingBox();
const s = box.width / 1280, at = (x, y) => page.mouse.click(box.x + x * s, box.y + y * s);
const R = (fn) => page.evaluate(fn);
const st = () => R(() => { const r = window.__game.scene.getScene('Read'); return { word: r.word, tries: r.tries, listening: r.listening, busy: r.busy, hint: r.hintText.text, heard: r.heardText.text, starts: window.__srStarts, total: JSON.parse(localStorage.getItem('reading-conquest-save-v1') || '{}').totalRead }; });
let fail = 0; const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); if (!ok) fail++; };

// 1. Mic is off until tapped
await page.waitForTimeout(1000);
check('no listening before a tap', (await st()).starts === 0);
// 2. Tap -> listening ring; interim result containing the word is accepted immediately
await at(640, 545); await page.waitForTimeout(600);
let a = await st();
check('tap starts listening once', a.listening && a.starts === 1, JSON.stringify(a));
if (process.env.SHOTS !== '0') await page.screenshot({ path: 'screenshots/14-listening.png' });
check('settings: continuous off, 10 alternatives, interim on', (await R(() => window.__srLog[0])) === 'start c=false max=10 interim=true', await R(() => window.__srLog[0]));
await R(() => window.__sr.emit([`the word is ${window.__game.scene.getScene('Read').word}`]));
await page.waitForTimeout(200);
a = await st();
check('interim match accepted at once', a.busy && !a.listening, JSON.stringify(a));
await page.waitForFunction(() => !window.__game.scene.getScene('Read').busy, null, { timeout: 8000 }); await page.waitForTimeout(500);
// 3. Silence -> auto-stops at ~4 s, "didn't hear you", not a miss, no restart
const w2 = (await st()).word;
await at(640, 545); const t0 = Date.now();
await page.waitForFunction(() => !window.__game.scene.getScene('Read').listening, null, { timeout: 8000 });
const dt = Date.now() - t0; a = await st();
check('auto-stops after about 4 s', dt > 3500 && dt < 5500, `${dt} ms`);
check('silence is not a miss', a.tries === 0 && /didn't hear you/i.test(a.hint), JSON.stringify(a));
await page.waitForTimeout(3000);
check('never restarts by itself', (await st()).starts === 2, `starts=${(await st()).starts}`);
// 4. Just "um" -> not a miss
await at(640, 545); await page.waitForTimeout(300);
await R(() => { window.__sr.emit(['um'], true); window.__sr.end(); }); await page.waitForTimeout(300);
a = await st(); check('"um" is not a miss', a.tries === 0 && a.word === w2, JSON.stringify(a));
// 5. A clearly different word -> a miss, and it shows what it heard
await at(640, 545); await page.waitForTimeout(300);
await R(() => { window.__sr.emit(['zebra', 'zebras'], true); window.__sr.end(); }); await page.waitForTimeout(400);
a = await st(); check('different word counts as a miss and shows it', a.tries === 1 && a.heard.includes('zebra'), JSON.stringify(a));
// 6. Tapping again while listening stops it
await page.waitForTimeout(400);
await at(640, 545); await page.waitForTimeout(300); await at(640, 545); await page.waitForTimeout(300);
a = await st(); check('second tap stops listening (no miss)', !a.listening && a.tries === 1, JSON.stringify(a));
// 7. A match in a later alternative
await at(640, 545); await page.waitForTimeout(300);
await R(() => { const w = window.__game.scene.getScene('Read').word; window.__sr.emit(['zebra', 'the zebra', `uh ${w}`], true); }); await page.waitForTimeout(300);
a = await st(); check('match in 3rd alternative accepted', a.busy, JSON.stringify(a));
await page.waitForFunction(() => !window.__game.scene.getScene('Read').busy, null, { timeout: 8000 }); await page.waitForTimeout(500);
// 8. Grown-up gear -> Strict / Normal / Forgiving, saved
check('default is Forgiving', (await R(() => localStorage.getItem('reading-conquest-mic-v1'))) === null);
await at(1280 - 38, 92); await page.waitForTimeout(500);
if (process.env.SHOTS !== '0') await page.screenshot({ path: 'screenshots/15-mic-settings.png' });
await at(640 - 230, 360 - 80 + 88); await page.waitForTimeout(300); // Normal
check('Normal saved', (await R(() => localStorage.getItem('reading-conquest-mic-v1'))) === '{"strictness":"normal"}');
await at(640 - 230, 360 - 80); await page.waitForTimeout(300); // back to Forgiving
check('Forgiving saved', (await R(() => localStorage.getItem('reading-conquest-mic-v1'))) === '{"strictness":"forgiving"}');
await at(640, 360 + 205); await page.waitForTimeout(300);
check('settings closed', !(await R(() => !!window.__game.scene.getScene('Read').micSettings)));
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
await browser.close();
process.exit(errs.length || fail ? 1 : 0);
