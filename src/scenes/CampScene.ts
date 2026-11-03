import Phaser from 'phaser';
import { W, H, txt, button, COLORS, goldHud, goTo, fadeIn, panel, tiledGrass, scatterDecor, FONT, floatText } from '../ui';
import { sfx } from '../audio';
import {
  save, persist, UNIT_DEFS, UNIT_ORDER, UPGRADES, UpgradeId, UnitType, armySpaceUsed, campSpace, castlesBeaten, armyCount, CASTLES,
} from '../state';
import { makeUnitVisual, animateWalk, UnitVisual } from '../units';

export class CampScene extends Phaser.Scene {
  private gold!: ReturnType<typeof goldHud>;
  private armyVisuals: { v: UnitVisual; phase: number }[] = [];
  private spaceText!: Phaser.GameObjects.Text;
  private shop!: Phaser.GameObjects.Container;
  private tab: 'troops' | 'upgrades' = 'troops';

  constructor() { super('Camp'); }

  create() {
    fadeIn(this);
    this.armyVisuals = [];
    tiledGrass(this);
    this.add.image(370, 420, 'dirt').setScale(1.25, 1.05).setDepth(-9000);
    scatterDecor(this, 26, [new Phaser.Geom.Rectangle(40, 110, 700, 520), new Phaser.Geom.Rectangle(740, 80, 560, 640)], 7);

    // Camp buildings
    this.add.image(120, 215, 'tent').setOrigin(0.5, 0.9).setDepth(215);
    this.add.image(250, 175, 'tent').setOrigin(0.5, 0.9).setScale(0.85).setDepth(175);
    const forge = this.add.image(590, 220, 'forge').setOrigin(0.5, 0.9).setDepth(220);
    txt(this, forge.x, forge.y + 18, 'Forge', 20).setDepth(9000);
    const flag = this.add.image(420, 200, 'flag').setOrigin(0.1, 1).setDepth(200).setTint(0x3d7be0);
    this.tweens.add({ targets: flag, scaleX: 0.85, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Forge smoke + campfire
    this.add.particles(632, 112, 'puff', { lifespan: 2200, speedY: { min: -40, max: -25 }, speedX: { min: -6, max: 12 }, scale: { start: 0.25, end: 0.9 }, alpha: { start: 0.5, end: 0 }, tint: 0xbbbbbb, frequency: 260 }).setDepth(9001);
    const fire = this.add.particles(360, 300, 'puff', { lifespan: 600, speedY: { min: -70, max: -40 }, speedX: { min: -12, max: 12 }, scale: { start: 0.35, end: 0.05 }, alpha: { start: 1, end: 0 }, tint: [0xffe14d, 0xff8a1a, 0xff4d1a], blendMode: 'ADD', frequency: 40 });
    fire.setDepth(301);
    this.add.image(360, 306, 'wood').setScale(3, 2).setAngle(20).setDepth(300);
    this.add.image(360, 306, 'wood').setScale(3, 2).setAngle(-20).setDepth(300);

    // Header
    const hg = this.add.graphics().setDepth(9500);
    hg.fillStyle(0x2b1d14, 0.75).fillRoundedRect(20, 14, 520, 60, 30);
    txt(this, 180, 44, `${save.heroName}'s Camp`, 30).setDepth(9501);
    this.spaceText = txt(this, 430, 44, '', 24, '#bfe3ff').setDepth(9501);
    this.gold = goldHud(this);
    this.gold.group.forEach((o) => (o as any).setDepth(9500));
    txt(this, 380, 112, `Words read: ${save.totalRead}   Castles won: ${castlesBeaten()}/${CASTLES.length}`, 20).setDepth(9501);

    // Main actions
    button(this, 205, 655, 330, 92, 'READ WORDS', COLORS.green, () => goTo(this, 'Read'), { fontSize: 38 }).setDepth(9600);
    button(this, 545, 655, 290, 92, 'ATTACK!', COLORS.orange, () => goTo(this, 'Map'), { fontSize: 40 }).setDepth(9600);

    this.buildArmy();
    this.buildShop();
  }

  private buildArmy() {
    this.armyVisuals.forEach((a) => a.v.root.destroy());
    this.armyVisuals = [];
    const list: UnitType[] = [];
    for (const t of UNIT_ORDER) for (let i = 0; i < save.army[t]; i++) list.push(t);
    const shown = list.slice(0, 36);
    let x = 120, y = 360, row = 0;
    for (const t of shown) {
      const big = t === 'ram' || t === 'catapult';
      const v = makeUnitVisual(this, t, 'blue', big ? 0.85 : 1.05);
      const w = big ? 74 : 46;
      if (x + w > 660) { row++; x = 120 + (row % 2) * 20; y += big ? 64 : 56; }
      v.root.setPosition(x + w / 2, y);
      v.root.setDepth(y);
      x += w;
      this.armyVisuals.push({ v, phase: Math.random() * 6 });
    }
    if (!list.length) {
      txt(this, 380, 420, 'No troops yet!\nRead words to earn gold,\nthen train knights here.', 26).setDepth(9000);
    } else if (list.length > shown.length) {
      txt(this, 380, 600, `+${list.length - shown.length} more`, 22).setDepth(9000);
    }
    this.spaceText.setText(`Army ${armySpaceUsed()}/${campSpace()}`);
  }

  private buildShop() {
    this.shop?.destroy();
    const c = this.add.container(0, 0).setDepth(9700);
    this.shop = c;
    const px = 1010, py = 405;
    c.add(panel(this, px, py, 500, 610));
    const tabT = button(this, px - 110, py - 262, 200, 56, 'Troops', this.tab === 'troops' ? COLORS.blue : COLORS.grey, () => { this.tab = 'troops'; this.buildShop(); }, { fontSize: 26 });
    const tabU = button(this, px + 110, py - 262, 200, 56, 'Upgrades', this.tab === 'upgrades' ? COLORS.purple : COLORS.grey, () => { this.tab = 'upgrades'; this.buildShop(); }, { fontSize: 26 });
    c.add([tabT, tabU]);
    if (this.tab === 'troops') this.troopRows(c, px, py); else this.upgradeRows(c, px, py);
  }

  private rowBg(c: Phaser.GameObjects.Container, x: number, y: number) {
    const g = this.add.graphics();
    g.fillStyle(0xe8d4a8, 1).fillRoundedRect(x - 225, y - 40, 450, 80, 14);
    g.lineStyle(2, 0xb08850, 1).strokeRoundedRect(x - 225, y - 40, 450, 80, 14);
    c.add(g);
  }

  private label(x: number, y: number, s: string, size: number, color = '#2b1d14', origin = 0) {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, resolution: 2 }).setOrigin(origin, 0.5);
  }

  private troopRows(c: Phaser.GameObjects.Container, px: number, py: number) {
    UNIT_ORDER.forEach((t, i) => {
      const d = UNIT_DEFS[t];
      const y = py - 180 + i * 92;
      this.rowBg(c, px, y);
      const locked = castlesBeaten() < d.unlockCastle;
      const big = t === 'ram' || t === 'catapult';
      const icon = this.add.image(px - 185, y + (big ? 14 : 18), big ? (t === 'ram' ? 'ram_body' : 'cata_body') : `${t}_blue`).setOrigin(0.5, 0.9).setScale(big ? 0.75 : 1.15);
      c.add(icon);
      c.add(this.label(px - 140, y - 14, d.name, 24));
      c.add(this.label(px - 140, y + 14, locked ? `Win castle ${d.unlockCastle} to unlock` : `${d.blurb}  (space ${d.space})`, 16, '#5a3418'));
      c.add(this.label(px + 90, y - 18, `x${save.army[t]}`, 22, '#24509e', 0.5));
      if (locked) {
        icon.setTint(0x555555);
        c.add(this.add.image(px + 175, y, 'lock').setScale(0.8));
        return;
      }
      const afford = save.gold >= d.cost && armySpaceUsed() + d.space <= campSpace();
      const b = button(this, px + 165, y, 110, 58, `${d.cost}`, COLORS.green, () => this.train(t), { icon: 'coin', iconScale: 0.9, fontSize: 24 });
      if (!afford) b.setEnabled(false);
      c.add(b);
    });
    c.add(this.label(px, py + 280, 'Troops that survive a battle come back home!', 18, '#5a3418', 0.5));
  }

  private upgradeRows(c: Phaser.GameObjects.Container, px: number, py: number) {
    (Object.keys(UPGRADES) as UpgradeId[]).forEach((id, i) => {
      const u = UPGRADES[id];
      const y = py - 170 + i * 104;
      this.rowBg(c, px, y);
      const lvl = save.upgrades[id];
      const icon = { sword: 'sword', bow: 'bow', armor: 'knight_blue', siege: 'boulder' }[id];
      c.add(this.add.image(px - 190, y, icon).setScale(id === 'siege' ? 1.6 : 1.1).setAngle(id === 'sword' ? 30 : 0));
      c.add(this.label(px - 150, y - 16, u.name, 24));
      c.add(this.label(px - 150, y + 12, u.blurb, 16, '#5a3418'));
      for (let k = 0; k < u.costs.length; k++) {
        const g = this.add.graphics();
        g.fillStyle(k < lvl ? 0xf2c230 : 0x9a8a70, 1).fillCircle(px - 140 + k * 20, y + 32, 6);
        c.add(g);
      }
      if (lvl >= u.costs.length) {
        c.add(this.label(px + 165, y, 'MAX', 26, '#1f8a2e', 0.5));
        return;
      }
      const cost = u.costs[lvl];
      const b = button(this, px + 165, y, 110, 58, `${cost}`, COLORS.purple, () => this.upgrade(id), { icon: 'coin', iconScale: 0.9, fontSize: 24 });
      if (save.gold < cost) b.setEnabled(false);
      c.add(b);
    });
  }

  private train(t: UnitType) {
    const d = UNIT_DEFS[t];
    if (save.gold < d.cost) return;
    if (armySpaceUsed() + d.space > campSpace()) { floatText(this, 380, 420, 'Camp is full!', '#ff8a7a', 30); return; }
    save.gold -= d.cost;
    save.army[t]++;
    persist();
    sfx.train();
    this.gold.update();
    this.buildArmy();
    // pop the newest unit
    const v = this.armyVisuals.filter((a) => a.v.kind === t).pop();
    if (v) {
      this.tweens.add({ targets: v.v.root, scale: { from: 0, to: v.v.root.scale }, duration: 350, ease: 'Back.easeOut' });
      floatText(this, v.v.root.x, v.v.root.y - 50, `+1 ${d.name}`, '#bfffb0', 22);
    }
    this.buildShop();
  }

  private upgrade(id: UpgradeId) {
    const u = UPGRADES[id];
    const cost = u.costs[save.upgrades[id]];
    if (cost === undefined || save.gold < cost) return;
    save.gold -= cost;
    save.upgrades[id]++;
    persist();
    sfx.sword();
    sfx.coin();
    this.gold.update();
    floatText(this, 590, 140, `${u.name} Lv ${save.upgrades[id]}!`, '#ffe14d', 28);
    this.cameras.main.flash(200, 255, 230, 120);
    this.buildShop();
  }

  update(_t: number, dt: number) {
    for (const a of this.armyVisuals) {
      a.phase += dt * 0.004;
      animateWalk(a.v, a.phase, false);
    }
  }
}

export { armyCount };
