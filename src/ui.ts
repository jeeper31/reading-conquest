import Phaser from 'phaser';
import { sfx, unlockAudio } from './audio';
import { save } from './state';

export const W = 1280;
export const H = 720;
export const FONT = '"Lilita One", "Arial Black", "Arial Rounded MT Bold", "Helvetica Neue", system-ui, sans-serif';
export const READ_FONT = '"Andika", "Century Gothic", "Avenir Next", "Verdana", "Arial", sans-serif';

export const COLORS = {
  green: 0x5cc33a,
  blue: 0x3d8be0,
  orange: 0xf29a1e,
  red: 0xe0483a,
  purple: 0x9a5ae0,
  grey: 0x8a8f96,
  gold: 0xf2c230,
};

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 28, color = '#ffffff', extra: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    stroke: '#2b1d14',
    strokeThickness: Math.max(3, Math.round(size / 6)),
    align: 'center',
    resolution: 2,
    ...extra,
  });
  t.setShadow(0, Math.max(2, size / 12), 'rgba(0,0,0,0.35)', 0, true, false);
  t.setOrigin(0.5);
  return t;
}

function shade(color: number, f: number) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return Phaser.Display.Color.GetColor(k(c.red), k(c.green), k(c.blue));
}

export interface Button extends Phaser.GameObjects.Container {
  setEnabled(on: boolean): Button;
  setLabel(s: string): Button;
  label: Phaser.GameObjects.Text;
  enabled: boolean;
}

export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, color: number,
  onClick: () => void, opts: { fontSize?: number; icon?: string; iconScale?: number; sound?: boolean } = {},
): Button {
  const c = scene.add.container(x, y) as Button;
  const g = scene.add.graphics();
  const draw = (col: number) => {
    g.clear();
    const r = Math.min(18, h / 2.6);
    g.fillStyle(0x2b1d14, 1).fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 12, r + 3);
    g.fillStyle(shade(col, -0.35), 1).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
    g.fillStyle(col, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(shade(col, 0.35), 1).fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h * 0.38, r * 0.7);
  };
  draw(color);
  c.add(g);
  const fs = opts.fontSize ?? Math.round(h * 0.42);
  let lx = 0;
  if (opts.icon) {
    const icon = scene.add.image(label ? -w / 2 + h * 0.55 : 0, 0, opts.icon).setScale(opts.iconScale ?? (h * 0.6) / 48);
    c.add(icon);
    if (label) lx = h * 0.3;
  }
  const t = txt(scene, lx, -1, label, fs);
  c.add(t);
  c.label = t;
  c.enabled = true;
  c.setSize(w, h + 6);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => {
    if (!c.enabled) return;
    unlockAudio();
    scene.tweens.add({ targets: c, scale: 0.93, duration: 60, yoyo: true });
    if (opts.sound !== false) sfx.click();
    onClick();
  });
  c.on('pointerover', () => c.enabled && scene.tweens.add({ targets: c, scale: 1.04, duration: 90 }));
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 90 }));
  c.setEnabled = (on: boolean) => { c.enabled = on; draw(on ? color : COLORS.grey); c.setAlpha(on ? 1 : 0.75); return c; };
  c.setLabel = (s: string) => { t.setText(s); return c; };
  return c;
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color = 0xf5e6c4, border = 0x8a5a2e) {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 6, -h / 2 + 10, w, h, 24);
  g.fillStyle(0x2b1d14, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 26);
  g.fillStyle(border, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 22);
  g.fillStyle(color, 1).fillRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 16);
  g.fillStyle(0xffffff, 0.35).fillRoundedRect(-w / 2 + 16, -h / 2 + 14, w - 32, 10, 5);
  return g;
}

/** Gold counter pill (top right). Returns an updater. */
export function goldHud(scene: Phaser.Scene, x = W - 130, y = 40) {
  const g = scene.add.graphics();
  g.fillStyle(0x2b1d14, 0.85).fillRoundedRect(x - 100, y - 24, 200, 48, 24);
  const coin = scene.add.image(x - 78, y, 'coin').setScale(1.4);
  const t = txt(scene, x + 14, y, String(save.gold), 30, '#ffe14d');
  let shown = save.gold;
  const update = () => {
    if (shown === save.gold) return;
    const from = shown;
    shown = save.gold;
    scene.tweens.addCounter({ from, to: save.gold, duration: 500, onUpdate: (tw) => t.setText(String(Math.round(tw.getValue() ?? 0))) });
    scene.tweens.add({ targets: coin, scale: 1.9, duration: 120, yoyo: true });
  };
  return { update, coin, text: t, group: [g, coin, t] };
}

export function goTo(scene: Phaser.Scene, key: string, data?: object) {
  scene.input.enabled = false;
  scene.cameras.main.fadeOut(220, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

export function fadeIn(scene: Phaser.Scene) {
  scene.cameras.main.fadeIn(260, 0, 0, 0);
}

/** Floating text that rises and fades. */
export function floatText(scene: Phaser.Scene, x: number, y: number, s: string, color = '#ffffff', size = 22) {
  const t = txt(scene, x, y, s, size, color).setDepth(100000);
  scene.tweens.add({ targets: t, y: y - 50, alpha: { from: 1, to: 0 }, scale: { from: 1.3, to: 1 }, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  return t;
}

export function tiledGrass(scene: Phaser.Scene, tint?: number) {
  const ts = scene.add.tileSprite(W / 2, H / 2, W, H, 'grass').setDepth(-10000);
  if (tint) ts.setTint(tint);
  return ts;
}

/** Scatter decorative trees/rocks avoiding a rectangle list. */
export function scatterDecor(scene: Phaser.Scene, count: number, avoid: Phaser.Geom.Rectangle[], seed = 1) {
  const rnd = new Phaser.Math.RandomDataGenerator([String(seed)]);
  const keys = ['tree', 'pine', 'bush', 'rock', 'flowers', 'tree', 'bush', 'flowers'];
  let placed = 0, tries = 0;
  while (placed < count && tries++ < count * 20) {
    const x = rnd.between(20, W - 20), y = rnd.between(30, H - 10);
    const k = rnd.pick(keys);
    const tall = k === 'tree' || k === 'pine';
    // check the base and (for trees) the canopy so nothing pokes over UI or castles
    const probes = tall ? [[x, y], [x, y - 70], [x - 30, y - 40], [x + 30, y - 40]] : [[x, y], [x, y - 20]];
    if (probes.some(([px, py]) => py < 80 || avoid.some((r) => r.contains(px, py)))) continue;
    const img = scene.add.image(x, y, k).setOrigin(0.5, 0.92).setDepth(y);
    const s = rnd.realInRange(0.8, 1.15);
    img.setScale(s);
    if (k === 'tree' || k === 'pine') scene.tweens.add({ targets: img, scaleX: s * 1.03, duration: 1800 + rnd.between(0, 900), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    placed++;
  }
}
