import Phaser from 'phaser';
import { playMusic } from '../music/player';
import { W, H, txt, button, COLORS, goldHud, goTo, fadeIn, panel, tiledGrass, scatterDecor, FONT , soundToggles } from '../ui';
import { bodyKey } from '../art-gear';
import { sfx } from '../audio';
import { save, armyCount, UNIT_ORDER, UNIT_DEFS, KINGDOMS, castleDef, pendingGraduation, persist } from '../state';
import { CASTLES_PER_KINGDOM, clampKingdom } from '../kingdoms';

const NODES = [
  [170, 560], [380, 470], [330, 270], [620, 210], [860, 330], [1080, 190],
];

export class MapScene extends Phaser.Scene {
  private popup?: Phaser.GameObjects.Container;
  private k = 0;
  constructor() { super('Map'); }

  init(data: { kingdom?: number }) {
    if (data?.kingdom !== undefined) { save.kingdom = clampKingdom(data.kingdom); persist(); }
    this.k = save.kingdom;
  }

  create() {
    const g = pendingGraduation();
    if (g !== null) { this.scene.start('Crown', { kingdom: g }); return; }
    const kd = KINGDOMS[this.k];
    fadeIn(this);
    playMusic(kd.mapMusic);
    soundToggles(this, 930, 40);
    this.popup = undefined;
    tiledGrass(this, kd.groundTint === 0xffffff ? undefined : kd.groundTint, kd.ground);
    // River (water, frozen, or lava). The desert has dunes instead.
    if (kd.river) {
      const r = kd.river;
      const river = this.add.graphics().setDepth(-9500);
      const pts: Phaser.Math.Vector2[] = [];
      const curve = new Phaser.Curves.Spline([[W + 40, 470], [1000, 520], [820, 600], [700, 690], [640, H + 60]].map(([x, y]) => new Phaser.Math.Vector2(x, y)));
      curve.getPoints(40).forEach((p) => pts.push(p));
      river.lineStyle(70, r.outer, 1).strokePoints(pts);
      river.lineStyle(56, r.inner, 1).strokePoints(pts);
      river.lineStyle(10, r.shine, 0.5).strokePoints(pts.map((p) => new Phaser.Math.Vector2(p.x - 10, p.y - 6)));
      if (r.kind === 'ice') { // cracks in the ice
        const cg = this.add.graphics().setDepth(-9490);
        cg.lineStyle(2, 0xffffff, 0.8);
        for (let i = 4; i < pts.length - 4; i += 5) { const p = pts[i]; cg.lineBetween(p.x - 14, p.y - 8, p.x + 6, p.y + 4); cg.lineBetween(p.x + 6, p.y + 4, p.x + 18, p.y - 2); }
      }
      if (r.kind === 'lava') {
        const glow = this.add.graphics().setDepth(-9495).setBlendMode(Phaser.BlendModes.ADD);
        glow.lineStyle(110, 0xff4a0a, 0.25).strokePoints(pts);
        this.tweens.add({ targets: glow, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.add.particles(0, 0, 'ember', { emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(700, 470, 580, 250) as any }, lifespan: 2600, speedY: { min: -60, max: -25 }, scale: { start: 0.9, end: 0.2 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD', frequency: 90 }).setDepth(9400);
      }
    } else {
      const dunes = this.add.graphics().setDepth(-9500);
      for (const [x, y, w] of [[960, 600, 420], [1180, 520, 300], [760, 680, 360]]) {
        dunes.fillStyle(0xc89448, 0.55).fillEllipse(x, y + 10, w, w * 0.28);
        dunes.fillStyle(0xf0cf86, 0.8).fillEllipse(x - 20, y, w * 0.9, w * 0.22);
      }
    }
    if (kd.weather === 'snow') this.add.particles(0, 0, 'snowflake', { x: { min: -40, max: W + 40 }, y: -10, lifespan: 8000, speedY: { min: 35, max: 70 }, speedX: { min: -15, max: 20 }, scale: { min: 0.4, max: 1 }, alpha: 0.85, frequency: 90 }).setDepth(9400);
    if (kd.weather === 'sand') this.add.particles(0, 0, 'sandmote', { x: -10, y: { min: 100, max: H }, lifespan: 5000, speedX: { min: 180, max: 300 }, scale: { min: 0.6, max: 1.2 }, alpha: { start: 0.7, end: 0 }, frequency: 70 }).setDepth(9400);

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
    scatterDecor(this, 50, avoid, 12 + this.k * 7, kd.decor);

    const hg = this.add.graphics().setDepth(9500);
    hg.fillStyle(kd.plate, 0.8).fillRoundedRect(W / 2 - 250, 10, 500, 72, 30);
    txt(this, W / 2, 34, kd.name, 28, '#ffe14d').setDepth(9501);
    txt(this, W / 2, 64, 'Choose a castle to attack!', 20).setDepth(9501);
    button(this, 90, 44, 150, 58, 'Camp', COLORS.blue, () => goTo(this, 'Camp'), { fontSize: 26 }).setDepth(9600);
    button(this, 260, 44, 160, 58, 'World', COLORS.purple, () => goTo(this, 'Kingdoms'), { fontSize: 26 }).setDepth(9600);
    goldHud(this).group.forEach((o) => (o as any).setDepth(9500));
    txt(this, 160, 112, `Army: ${armyCount()} troops`, 22).setDepth(9501);

    NODES.forEach(([x, y], i) => this.castleNode(x, y, i));
  }

  private get stars() { return save.kstars[this.k]; }

  private unlockedCount() {
    let n = 1;
    for (let i = 0; i < CASTLES_PER_KINGDOM - 1; i++) if (this.stars[i] > 0) n = i + 2;
    return Math.min(n, CASTLES_PER_KINGDOM);
  }

  private castleNode(x: number, y: number, i: number) {
    const def = castleDef(this.k, i);
    const tint = KINGDOMS[this.k].castleTint;
    const unlocked = i < this.unlockedCount();
    const c = this.add.container(x, y).setDepth(y);
    const base = this.add.graphics();
    base.fillStyle(0x000000, 0.25).fillEllipse(0, 22, 170, 56);
    base.fillStyle(0xd6b478, 1).fillEllipse(0, 16, 160, 50);
    c.add(base);
    // mini wall ring
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const w = this.add.image(Math.cos(a) * 66, 6 + Math.sin(a) * 22, 'wall').setScale(0.55).setOrigin(0.5, 0.9).setTint(tint);
      if (Math.sin(a) < 0) c.addAt(w, 1); else c.add(w);
    }
    const scale = 0.48 + i * 0.04;
    const keep = this.add.image(0, 14, 'keep').setScale(scale).setOrigin(0.5, 0.92).setTint(tint);
    c.addAt(keep, 1 + 7);
    if (def.boss) { // the boss waits by its castle
      const key = def.boss.kind === 'camel' ? 'boss_camel' : def.boss.kind === 'dragon' ? 'dragon_body' : bodyKey('defender', 'ice', 4);
      const bimg = this.add.image(62, 30, key).setOrigin(0.5, 0.95).setScale(def.boss.kind === 'giant' ? 1.2 : 0.55);
      bimg.scaleX *= -1;
      c.add(bimg);
      this.tweens.add({ targets: bimg, y: 26, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
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
      c.add(this.add.image(-28 + s * 28, 90, s < this.stars[i] ? 'star' : 'star_empty').setScale(0.32));
    }
    const next = unlocked && this.stars[i] === 0;
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
    const d = castleDef(this.k, i);
    const c = this.add.container(0, 0).setDepth(20000);
    this.popup = c;
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5).setInteractive().on('pointerdown', () => { c.destroy(); this.popup = undefined; }));
    c.add(panel(this, W / 2, H / 2, 600, 470));
    c.add(txt(this, W / 2, H / 2 - 185, d.name, 44));
    const lines = [
      `Walls: ${d.doubleWall ? 'double ring' : 'one ring'} (${d.wallHp} HP each)`,
      `Archer towers: ${d.towers}${d.wallArchers ? `  +  ${d.wallArchers} archers on the walls` : ''}`,
      `Guards: ${d.defenders} ${KINGDOMS[this.k].enemyName}${d.catapults ? `  +  ${d.catapults} catapult${d.catapults > 1 ? 's' : ''}` : ''}`,
      d.boss ? `BOSS: ${d.boss.name} (${d.boss.hp} HP)!` : `Keep: ${d.keepHp} HP${d.keepBoulder ? ' + boulder thrower' : ''}`,
      `Loot: up to ${d.loot} gold`,
    ];
    lines.forEach((s, k) => c.add(this.add.text(W / 2 - 240, H / 2 - 120 + k * 36, s, { fontFamily: FONT, fontSize: '24px', color: '#2b1d14', resolution: 2 }).setOrigin(0, 0.5)));
    const army = UNIT_ORDER.filter((t) => save.army[t] > 0).map((t) => `${save.army[t]} ${UNIT_DEFS[t].name}${save.army[t] > 1 ? 's' : ''}`).join(', ');
    c.add(this.add.text(W / 2, H / 2 + 80, army ? `Your army: ${army}` : 'You have no troops! Read words to train some.', { fontFamily: FONT, fontSize: '20px', color: '#24509e', align: 'center', wordWrap: { width: 520 }, resolution: 2 }).setOrigin(0.5));
    for (let s = 0; s < 3; s++) c.add(this.add.image(W / 2 + 160 + s * 40, H / 2 - 120, s < this.stars[i] ? 'star' : 'star_empty').setScale(0.45));
    const go = button(this, W / 2 + 120, H / 2 + 170, 240, 76, 'ATTACK!', COLORS.orange, () => { sfx.horn(); goTo(this, 'Battle', { castle: i, kingdom: this.k }); }, { fontSize: 34 });
    if (armyCount() === 0) go.setEnabled(false);
    c.add(go);
    c.add(button(this, W / 2 - 140, H / 2 + 170, 200, 76, armyCount() ? 'Back' : 'Read', armyCount() ? COLORS.grey : COLORS.green, () => {
      if (armyCount()) { c.destroy(); this.popup = undefined; } else goTo(this, 'Read');
    }, { fontSize: 30 }));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
  }
}
