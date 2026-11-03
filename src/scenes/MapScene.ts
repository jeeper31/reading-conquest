import Phaser from 'phaser';
import { W, H, txt, button, COLORS, goldHud, goTo, fadeIn, panel, tiledGrass, scatterDecor, FONT } from '../ui';
import { sfx } from '../audio';
import { save, CASTLES, armyCount, UNIT_ORDER, UNIT_DEFS } from '../state';

const NODES = [
  [170, 560], [380, 470], [330, 270], [620, 210], [860, 330], [1080, 190],
];

export class MapScene extends Phaser.Scene {
  private popup?: Phaser.GameObjects.Container;
  constructor() { super('Map'); }

  create() {
    fadeIn(this);
    this.popup = undefined;
    tiledGrass(this);
    // River
    const river = this.add.graphics().setDepth(-9500);
    const pts: Phaser.Math.Vector2[] = [];
    const curve = new Phaser.Curves.Spline([[W + 40, 470], [1000, 520], [820, 600], [700, 690], [640, H + 60]].map(([x, y]) => new Phaser.Math.Vector2(x, y)));
    curve.getPoints(40).forEach((p) => pts.push(p));
    river.lineStyle(70, 0x2b6fa8, 1).strokePoints(pts);
    river.lineStyle(56, 0x3fa9e8, 1).strokePoints(pts);
    river.lineStyle(10, 0x9ad8ff, 0.5).strokePoints(pts.map((p) => new Phaser.Math.Vector2(p.x - 10, p.y - 6)));

    // Path between castles (dotted)
    const path = new Phaser.Curves.Spline(NODES.map(([x, y]) => new Phaser.Math.Vector2(x, y + 20)));
    const pg = this.add.graphics().setDepth(-9000);
    const dots = path.getSpacedPoints(70);
    dots.forEach((p, i) => {
      const reached = (i / dots.length) * (NODES.length - 1) < this.unlockedCount() - 1;
      pg.fillStyle(0x2b1d14, 0.4).fillEllipse(p.x, p.y + 3, 18, 10);
      pg.fillStyle(reached ? 0xffe9a8 : 0xd8c49a, 1).fillEllipse(p.x, p.y, 16, 9);
    });

    const avoid = NODES.map(([x, y]) => new Phaser.Geom.Rectangle(x - 120, y - 130, 240, 250));
    avoid.push(new Phaser.Geom.Rectangle(0, 0, W, 90), new Phaser.Geom.Rectangle(600, 440, 700, 300));
    scatterDecor(this, 50, avoid, 12);

    const hg = this.add.graphics().setDepth(9500);
    hg.fillStyle(0x2b1d14, 0.75).fillRoundedRect(W / 2 - 230, 14, 460, 60, 30);
    txt(this, W / 2, 44, 'Choose a Castle to Attack!', 30).setDepth(9501);
    button(this, 90, 44, 150, 58, 'Camp', COLORS.blue, () => goTo(this, 'Camp'), { fontSize: 26 }).setDepth(9600);
    goldHud(this).group.forEach((o) => (o as any).setDepth(9500));
    txt(this, 160, 112, `Army: ${armyCount()} troops`, 22).setDepth(9501);

    NODES.forEach(([x, y], i) => this.castleNode(x, y, i));
  }

  private unlockedCount() {
    let n = 1;
    for (let i = 0; i < CASTLES.length - 1; i++) if (save.stars[i] > 0) n = i + 2;
    return Math.min(n, CASTLES.length);
  }

  private castleNode(x: number, y: number, i: number) {
    const def = CASTLES[i];
    const unlocked = i < this.unlockedCount();
    const c = this.add.container(x, y).setDepth(y);
    const base = this.add.graphics();
    base.fillStyle(0x000000, 0.25).fillEllipse(0, 22, 170, 56);
    base.fillStyle(0xd6b478, 1).fillEllipse(0, 16, 160, 50);
    c.add(base);
    // mini wall ring
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const w = this.add.image(Math.cos(a) * 66, 6 + Math.sin(a) * 22, 'wall').setScale(0.55).setOrigin(0.5, 0.9);
      if (Math.sin(a) < 0) c.addAt(w, 1); else c.add(w);
    }
    const scale = 0.48 + i * 0.04;
    const keep = this.add.image(0, 14, 'keep').setScale(scale).setOrigin(0.5, 0.92);
    c.addAt(keep, 1 + 7);
    const flag = this.add.image(18, -60 - i * 6, 'flag').setOrigin(0.1, 1).setScale(0.8).setTint(def.color);
    c.add(flag);
    this.tweens.add({ targets: flag, scaleX: 0.65, duration: 500 + i * 40, yoyo: true, repeat: -1 });
    if (!unlocked) {
      c.list.forEach((o) => (o as any).setTint?.(0x777777));
      c.add(this.add.image(0, -10, 'lock'));
    }
    // name plate
    const plate = this.add.graphics();
    const nm = this.add.text(0, 58, `${i + 1}. ${def.name}`, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#2b1d14', strokeThickness: 5, resolution: 2 }).setOrigin(0.5);
    plate.fillStyle(0x2b1d14, 0.7).fillRoundedRect(-nm.width / 2 - 12, 44, nm.width + 24, 30, 15);
    c.add([plate, nm]);
    for (let s = 0; s < 3; s++) {
      c.add(this.add.image(-28 + s * 28, 90, s < save.stars[i] ? 'star' : 'star_empty').setScale(0.32));
    }
    const next = unlocked && save.stars[i] === 0;
    if (next) {
      const arrow = this.add.graphics();
      arrow.fillStyle(0x2b1d14, 1).fillTriangle(-17, -12, 17, -12, 0, 14);
      arrow.fillStyle(0xffe14d, 1).fillTriangle(-12, -9, 12, -9, 0, 8);
      arrow.y = -130 - i * 6;
      c.add(arrow);
      this.tweens.add({ targets: arrow, y: arrow.y + 14, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    c.setSize(180, 200).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { sfx.click(); unlocked ? this.openPopup(i) : this.lockedNote(c); });
  }

  private lockedNote(c: Phaser.GameObjects.Container) {
    this.tweens.add({ targets: c, x: c.x + 8, duration: 60, yoyo: true, repeat: 3 });
    const t = txt(this, c.x, c.y - 90, 'Beat the castle before\nthis one first!', 22).setDepth(9999);
    this.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 300, onComplete: () => t.destroy() });
  }

  private openPopup(i: number) {
    this.popup?.destroy();
    const d = CASTLES[i];
    const c = this.add.container(0, 0).setDepth(20000);
    this.popup = c;
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5).setInteractive().on('pointerdown', () => { c.destroy(); this.popup = undefined; }));
    c.add(panel(this, W / 2, H / 2, 600, 470));
    c.add(txt(this, W / 2, H / 2 - 185, d.name, 44));
    const lines = [
      `Walls: ${d.doubleWall ? 'double ring' : 'one ring'} (${d.wallHp} HP each)`,
      `Archer towers: ${d.towers}`,
      `Castle guards: ${d.defenders}`,
      `Keep: ${d.keepHp} HP${i >= 2 ? ' + boulder thrower' : ''}`,
      `Loot: up to ${d.loot} gold`,
    ];
    lines.forEach((s, k) => c.add(this.add.text(W / 2 - 240, H / 2 - 120 + k * 36, s, { fontFamily: FONT, fontSize: '24px', color: '#2b1d14', resolution: 2 }).setOrigin(0, 0.5)));
    const army = UNIT_ORDER.filter((t) => save.army[t] > 0).map((t) => `${save.army[t]} ${UNIT_DEFS[t].name}${save.army[t] > 1 ? 's' : ''}`).join(', ');
    c.add(this.add.text(W / 2, H / 2 + 80, army ? `Your army: ${army}` : 'You have no troops! Read words to train some.', { fontFamily: FONT, fontSize: '20px', color: '#24509e', align: 'center', wordWrap: { width: 520 }, resolution: 2 }).setOrigin(0.5));
    for (let s = 0; s < 3; s++) c.add(this.add.image(W / 2 + 160 + s * 40, H / 2 - 120, s < save.stars[i] ? 'star' : 'star_empty').setScale(0.45));
    const go = button(this, W / 2 + 120, H / 2 + 170, 240, 76, 'ATTACK!', COLORS.orange, () => { sfx.horn(); goTo(this, 'Battle', { castle: i }); }, { fontSize: 34 });
    if (armyCount() === 0) go.setEnabled(false);
    c.add(go);
    c.add(button(this, W / 2 - 140, H / 2 + 170, 200, 76, armyCount() ? 'Back' : 'Read', armyCount() ? COLORS.grey : COLORS.green, () => {
      if (armyCount()) { c.destroy(); this.popup = undefined; } else goTo(this, 'Read');
    }, { fontSize: 30 }));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
  }
}
