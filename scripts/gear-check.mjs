// Headless check of armor / weapon tiers: save migration, Camp upgrade ceremony, battle visuals, Armory lineup.
// Usage: node scripts/gear-check.mjs   (BASE overrides the URL, SHOTS=0 skips screenshots)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:4173/reading-conquest/';
const SHOTS = process.env.SHOTS !== '0';
const KEY = 'reading-conquest-save-v1';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let fail = 0; const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`); if (!ok) fail++; };
const errs = [];
const base = { v: 1, gold: 1000, army: { knight: 4, archer: 3, spearman: 3, ram: 1, catapult: 1 }, stars: [3, 3, 2, 0, 0, 0], wordStats: {},
  enabledLevels: ['cvc'], totalRead: 120, bestStreak: 9, heroName: 'Sir Reader' };

async function open(saveObj, q, wait = 1800) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(([k, s]) => { if (!sessionStorage.getItem('gear-seeded')) { localStorage.setItem(k, s); sessionStorage.setItem('gear-seeded', '1'); } }, [KEY, JSON.stringify(saveObj)]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(BASE + q); await page.waitForTimeout(wait);
  const box = await page.locator('canvas').boundingBox();
  const s = box.width / 1280;
  page.at = (x, y) => page.mouse.click(box.x + x * s, box.y + y * s);
  page.R = (fn, a) => page.evaluate(fn, a);
  page.sv = () => page.R((k) => JSON.parse(localStorage.getItem(k)), KEY);
  page.ctx = ctx;
  return page;
}
const shot = (p, n) => SHOTS && p.screenshot({ path: `screenshots/${n}.png` });
const campKeys = (p) => p.R(() => window.__game.scene.getScene('Camp').armyVisuals.map((a) => [a.v.kind, a.v.body.texture.key, a.v.weapon?.texture.key ?? a.v.part?.texture.key]));

// 1. Old save (pre-gear): odd / missing upgrade values must load cleanly, wearing what was bought.
{
  const p = await open({ ...base, upgrades: { sword: 2, bow: '3', armor: 9 } }, '?scene=Camp');
  const keys = await campKeys(p);
  const k = keys.find((x) => x[0] === 'knight'), a = keys.find((x) => x[0] === 'archer'), r = keys.find((x) => x[0] === 'ram');
  check('old save: knight wears armor 4 (clamped) + weapon 2', k?.[1] === 'knight_blue_a4' && k?.[2] === 'wpn_knight_2', JSON.stringify(k));
  check('old save: archer bow 3 ("3" string accepted)', a?.[2] === 'wpn_archer_3', JSON.stringify(a));
  check('old save: missing siege -> tier 0', r?.[1] === 'ram_body_0', JSON.stringify(r));
  await p.ctx.close();
}

// 2. Armory lineup.
for (const [view, n] of [['armor', '20-gear-armor-tiers'], ['weapons', '21-gear-weapon-tiers'], ['all', '22-gear-full-progression']]) {
  const p = await open({ ...base, upgrades: { sword: 1, bow: 1, armor: 1, siege: 0 } }, `?scene=Armory&view=${view}`);
  const n2 = await p.R(() => window.__game.scene.getScene('Armory').vis.length);
  check(`armory ${view} draws`, view === 'weapons' ? n2 === 0 : n2 === 15, `${n2} soldiers`);
  await shot(p, n);
  await p.ctx.close();
}

// 3. Camp: buy armor, watch the forge ceremony, everyone changes look.
{
  const p = await open({ ...base, gold: 1000, upgrades: { sword: 0, bow: 0, armor: 0, siege: 0 } }, '?scene=Camp&tab=upgrades');
  let keys = await campKeys(p);
  check('new recruits: cloth tunic + club', keys.filter((x) => x[0] === 'knight').every((x) => x[1] === 'knight_blue_a0' && x[2] === 'wpn_knight_0'));
  await shot(p, '23-camp-upgrades-tab');
  const cer = (k) => p.waitForFunction((k) => window.__game.scene.getScene('Camp').ceremony?.[k], k, { timeout: 15000 });
  const closed = () => p.waitForFunction(() => !window.__game.scene.getScene('Camp').ceremony, null, { timeout: 15000 }).then(() => p.waitForTimeout(400));
  await p.at(1182, 235); // Armor buy button
  await p.waitForTimeout(700);
  check('ceremony open', await p.R(() => !!window.__game.scene.getScene('Camp').ceremony));
  await shot(p, '24-upgrade-forging');
  await cer('revealed'); await p.waitForTimeout(900);
  await shot(p, '25-upgrade-reveal');
  let sv = await p.sv();
  check('armor bought: level 1, 80 gold spent', sv.upgrades.armor === 1 && sv.gold === 920, JSON.stringify({ u: sv.upgrades, g: sv.gold }));
  const big = await p.R(() => window.__game.scene.getScene('Camp').ceremony.vis.map((v) => v.body.texture.key));
  check('ceremony shows the new armor', big.includes('knight_blue_a1'), big.join(','));
  await cer('closable'); await p.at(640, 400); await p.waitForTimeout(500);
  check('tap closes ceremony', await p.R(() => !window.__game.scene.getScene('Camp').ceremony));
  keys = await campKeys(p);
  check('whole camp army now wears leather', keys.filter((x) => !['ram', 'catapult'].includes(x[0])).every((x) => x[1].endsWith('_a1')), JSON.stringify(keys.slice(0, 3)));
  // Weapons + bows; ceremony also auto-closes.
  await p.at(1182, 343); await cer('revealed'); await closed();
  check('ceremony auto-closes', true);
  await p.at(1182, 451); await cer('closable'); await p.at(640, 400); await closed();
  // A double tap on buy mid-ceremony must not double-charge.
  await p.at(1182, 235); await p.waitForTimeout(200); await p.at(1182, 235); await cer('closable'); await p.at(640, 400); await closed();
  sv = await p.sv();
  check('weapons/bows/armor 2 bought once each', sv.upgrades.sword === 1 && sv.upgrades.bow === 1 && sv.upgrades.armor === 2 && sv.gold === 1000 - 80 * 3 - 180, JSON.stringify({ u: sv.upgrades, g: sv.gold }));
  keys = await campKeys(p);
  check('knight: chainmail + dagger, archer: hunting bow', keys.some((x) => x[1] === 'knight_blue_a2' && x[2] === 'wpn_knight_1') && keys.some((x) => x[2] === 'wpn_archer_1'));
  await shot(p, '26-camp-after-upgrades');
  await p.ctx.close();
}

// 4. Battles: maxed-out army vs. starter army.
for (const [up, n, castle] of [[{ sword: 4, bow: 4, armor: 4, siege: 3 }, '27-battle-legendary-gear', 3], [{ sword: 0, bow: 0, armor: 0, siege: 0 }, '28-battle-starter-gear', 1]]) {
  const p = await open({ ...base, army: { knight: 8, archer: 6, spearman: 5, ram: 1, catapult: 1 }, upgrades: up }, `?scene=Battle&castle=${castle}&autodeploy=1`, 8500);
  const u = await p.R(() => window.__game.scene.getScene('Battle').units.map((x) => [x.team, x.type, x.v.body.texture.key, x.v.weapon?.texture.key]));
  const blue = u.filter((x) => x[0] === 'blue' && ['knight', 'archer', 'spearman'].includes(x[1]));
  const t = up.armor;
  check(`battle (armor ${t}): blue troops in tier-${t} gear`, blue.length > 0 && blue.every((x) => x[2].endsWith(`_a${t}`) && x[3].endsWith(`_${up.sword}`)), `${blue.length} blue, e.g. ${JSON.stringify(blue[0])}`);
  const red = u.filter((x) => x[0] === 'red');
  check(`castle ${castle} defenders geared`, red.length === 0 || red.every((x) => x[2].startsWith('defender_red_a')), JSON.stringify(red[0] ?? 'none'));
  await shot(p, n);
  await p.ctx.close();
}

check('no page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
await browser.close();
if (fail) { console.log(`${fail} check(s) failed`); process.exit(1); }
console.log('all gear checks passed');
