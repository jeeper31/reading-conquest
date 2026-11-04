import Phaser from 'phaser';
import { W, txt, button, COLORS, goTo, fadeIn, tiledGrass, FONT } from '../ui';
import { save } from '../state';
import { UPGRADES, SPEAR_TIERS, type UpgradeId } from '../gear';
import { makeUnitVisual, animateWalk, UnitVisual, VisualKind } from '../units';
import { weaponKey, siegeKey, ARMOR_TIERS, WEAPON_TIERS, SIEGE_TIERS } from '../art-gear';

type View = 'armor' | 'weapons' | 'all';
const COL0 = 262, COLW = 166, CARD_W = 156;

/** "Armory": every gear tier side by side, so kids can see what they're saving up for. */
export class ArmoryScene extends Phaser.Scene {
  private view: View = 'armor';
  private c!: Phaser.GameObjects.Container;
  private vis: UnitVisual[] = [];
  private phase = 0;

  constructor() { super('Armory'); }

  init(data: { view?: View }) { this.view = data?.view ?? 'armor'; }

  create() {
    fadeIn(this);
    tiledGrass(this);
    this.add.rectangle(W / 2, 360, W, 720, 0x1b1430, 0.55);
    const t = txt(this, W / 2, 40, 'ARMORY', 50, '#ffe14d').setDepth(10);
    t.setStroke('#2b1d14', 10);
    button(this, 110, 40, 180, 54, '< Camp', COLORS.grey, () => goTo(this, 'Camp', { tab: 'upgrades' }), { fontSize: 24 }).setDepth(10);
    this.draw();
  }

  private label(x: number, y: number, s: string, size: number, color = '#ffffff') {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, resolution: 2, align: 'center', stroke: '#2b1d14', strokeThickness: 4 }).setOrigin(0.5);
  }

  private draw() {
    this.c?.destroy();
    this.vis = [];
    const c = this.add.container(0, 0);
    this.c = c;
    (['armor', 'weapons', 'all'] as View[]).forEach((v, i) => {
      const names = { armor: 'Armor', weapons: 'Weapons', all: 'All gear' };
      c.add(button(this, W / 2 - 220 + i * 220, 100, 200, 50, names[v], this.view === v ? COLORS.purple : COLORS.grey, () => { this.view = v; this.draw(); }, { fontSize: 24 }));
    });
    if (this.view === 'armor') this.drawArmor();
    else if (this.view === 'weapons') this.drawWeapons();
    else this.drawAll();
  }

  /** Card behind one tier: gold-ish if owned, with NOW / NEXT tags. */
  private card(x: number, y: number, w: number, h: number, tier: number, owned: number) {
    const g = this.add.graphics();
    const have = tier <= owned;
    g.fillStyle(have ? 0x3e6b3a : 0x3a3352, 0.9).fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    g.lineStyle(3, tier === owned ? 0xffe14d : have ? 0x8fd17a : 0x6b6390, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    this.c.add(g);
    if (tier === owned) this.c.add(this.label(x + w / 2 - 30, y - h / 2 + 14, 'NOW', 15, '#ffe14d'));
    else if (tier === owned + 1) this.c.add(this.label(x + w / 2 - 30, y - h / 2 + 14, 'NEXT', 15, '#bfe3ff'));
  }

  private soldier(kind: VisualKind, x: number, y: number, scale: number, armor: number, weapon: number) {
    const v = makeUnitVisual(this, kind, 'blue', scale, { armor, weapon });
    v.root.setPosition(x, y);
    this.c.add(v.root);
    this.vis.push(v);
  }

  private rowName(y: number, s: string) { this.c.add(this.label(95, y, s, 22, '#ffe14d')); }

  private drawArmor() {
    const own = save.upgrades.armor;
    for (let a = 0; a < ARMOR_TIERS; a++) {
      const x = COL0 + a * COLW;
      this.card(x, 425, CARD_W, 540, a, own);
      this.c.add(this.label(x, 192, `${a + 1}. ${UPGRADES.armor.tiers[a].name}`.replace(/ (Armor|Mail|Plate)$/, '\n$1'), 17));
      (['knight', 'archer', 'spearman'] as VisualKind[]).forEach((k, r) => this.soldier(k, x, 350 + r * 158, 1.45, a, 0));
    }
    ['Knight', 'Archer', 'Spearman'].forEach((n, r) => this.rowName(295 + r * 162, n));
    this.c.add(this.label(W / 2, 700, 'Every Armor upgrade: +20% health for all troops', 18, '#bfffb0'));
  }

  private drawWeapons() {
    const rows: { id: UpgradeId; label: string; key: (t: number) => string; names: string[]; n: number; scale: number }[] = [
      { id: 'sword', label: 'Knights', key: (t) => weaponKey('knight', t), names: UPGRADES.sword.tiers.map((t) => t.name), n: WEAPON_TIERS, scale: 1.9 },
      { id: 'sword', label: 'Spears', key: (t) => weaponKey('spearman', t), names: SPEAR_TIERS, n: WEAPON_TIERS, scale: 1.35 },
      { id: 'bow', label: 'Archers', key: (t) => weaponKey('archer', t), names: UPGRADES.bow.tiers.map((t) => t.name), n: WEAPON_TIERS, scale: 1.5 },
      { id: 'siege', label: 'Siege', key: (t) => siegeKey('ram_body', t), names: UPGRADES.siege.tiers.map((t) => t.name), n: SIEGE_TIERS, scale: 0.62 },
    ];
    rows.forEach((r, ri) => {
      const y = 205 + ri * 128;
      this.rowName(y, r.label);
      for (let t = 0; t < r.n; t++) {
        const x = COL0 + t * COLW;
        this.card(x, y, CARD_W, 118, t, save.upgrades[r.id]);
        if (r.id === 'siege') {
          this.c.add(this.add.image(x - 30, y - 10, siegeKey('ram_log', t)).setOrigin(0.15, 0.5).setScale(r.scale));
          this.c.add(this.add.image(x - 34, y + 30, r.key(t)).setOrigin(0.5, 0.9).setScale(r.scale));
          this.c.add(this.add.image(x + 52, y + 30, siegeKey('cata_body', t)).setOrigin(0.5, 0.9).setScale(0.46));
        } else {
          // Lay weapons flat (point to the right) so they line up in a row.
          const img = this.add.image(x, y - 10, r.key(t)).setAngle(r.label === 'Archers' ? 0 : 90).setScale(r.scale);
          this.c.add(img);
          if (t >= 4) this.tweens.add({ targets: img, alpha: 0.75, duration: 500, yoyo: true, repeat: -1 });
        }
        this.c.add(this.label(x, y + 44, r.names[t], 14));
      }
    });
    this.c.add(this.label(W / 2, 705, 'Weapons: +25% knight & spear damage   Bows: +25% archer damage   Siege: +30% ram & catapult', 16, '#bfffb0'));
  }

  private drawAll() {
    for (let t = 0; t < ARMOR_TIERS; t++) {
      const x = COL0 + t * COLW;
      this.card(x, 425, CARD_W, 540, t, Math.min(save.upgrades.armor, save.upgrades.sword, save.upgrades.bow));
      this.c.add(this.label(x, 192, t === 0 ? 'Brand new' : t === 4 ? 'LEGENDARY' : t === 5 ? 'DRAGON' : `Level ${t}`, 20, t === 5 ? '#ff8a3a' : t === 4 ? '#ffe14d' : '#ffffff'));
      (['knight', 'archer', 'spearman'] as VisualKind[]).forEach((k, r) => this.soldier(k, x, 350 + r * 158, 1.45, t, t));
    }
    ['Knight', 'Archer', 'Spearman'].forEach((n, r) => this.rowName(295 + r * 162, n));
    this.c.add(this.label(W / 2, 700, 'Read words, earn gold, upgrade at the Forge!', 18, '#bfffb0'));
  }

  update(_t: number, dt: number) {
    this.phase += dt * 0.004;
    this.vis.forEach((v, i) => animateWalk(v, this.phase + i * 0.7, false));
  }
}
