import Phaser from 'phaser';
import { playMusic } from '../music/player';
import { W, H, txt, button, COLORS, goldHud, goTo, fadeIn, panel, tiledGrass, scatterDecor, FONT, floatText , soundToggles } from '../ui';
import { sfx } from '../audio';
import {
  save, persist, UNIT_DEFS, UNIT_ORDER, UPGRADES, UpgradeId, UnitType, armySpaceUsed, campSpace, castlesBeaten, armyCount, KINGDOMS, pendingGraduation,
} from '../state';
import { makeUnitVisual, animateWalk, UnitVisual, VisualKind, iconKey } from '../units';
import { UPGRADE_ORDER, SPEAR_TIERS, type Gear } from '../gear';
import { CASTLES_PER_KINGDOM } from '../kingdoms';

/** Which soldiers show off each upgrade, and what they'd wear at upgrade level `lvl`. */
function previewFor(id: UpgradeId, lvl: number): { kind: VisualKind; gear: Gear }[] {
  const a = save.upgrades.armor, sw = save.upgrades.sword, bw = save.upgrades.bow;
  switch (id) {
    case 'armor': return [{ kind: 'knight', gear: { armor: lvl, weapon: sw } }];
    case 'sword': return [{ kind: 'knight', gear: { armor: a, weapon: lvl } }, { kind: 'spearman', gear: { armor: a, weapon: lvl } }];
    case 'bow': return [{ kind: 'archer', gear: { armor: a, weapon: lvl } }];
    case 'siege': return [{ kind: 'ram', gear: { armor: 0, weapon: lvl } }];
  }
}
function tierLabel(id: UpgradeId, lvl: number) {
  const t = UPGRADES[id].tiers[lvl].name;
  return id === 'sword' ? `${t} + ${SPEAR_TIERS[lvl]}` : t;
}

export class CampScene extends Phaser.Scene {
  private gold!: ReturnType<typeof goldHud>;
  private armyVisuals: { v: UnitVisual; phase: number }[] = [];
  private spaceText!: Phaser.GameObjects.Text;
  private shop!: Phaser.GameObjects.Container;
  private tab: 'troops' | 'upgrades' = 'troops';
  private ceremony?: { objs: Phaser.GameObjects.GameObject[]; vis: UnitVisual[]; done: () => void; revealed: boolean; closable: boolean };
  private cerPhase = 0;

  constructor() { super('Camp'); }

  init(data: { tab?: 'troops' | 'upgrades' }) {
    if (data?.tab) this.tab = data.tab;
    this.ceremony = undefined;
  }

  create() {
    const grad = pendingGraduation();
    if (grad !== null) { this.scene.start('Crown', { kingdom: grad }); return; }
    fadeIn(this);
    playMusic('camp');
    soundToggles(this, 930, 40);
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
    txt(this, 380, 112, `Words read: ${save.totalRead}   Castles won: ${castlesBeaten()}/${KINGDOMS.length * CASTLES_PER_KINGDOM}   Crowns: ${save.crowns.length}`, 20).setDepth(9501);

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
      const icon = this.add.image(px - 185, y + (big ? 14 : 24), iconKey(t, 'blue')).setOrigin(0.5, big ? 0.9 : 0.92).setScale(big ? 0.75 : 0.95);
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
    UPGRADE_ORDER.forEach((id, i) => {
      const u = UPGRADES[id];
      const y = py - 170 + i * 108;
      const g0 = this.add.graphics();
      g0.fillStyle(0xe8d4a8, 1).fillRoundedRect(px - 232, y - 50, 464, 100, 14);
      g0.lineStyle(2, 0xb08850, 1).strokeRoundedRect(px - 232, y - 50, 464, 100, 14);
      g0.fillStyle(0xf6e7c4, 1).fillRoundedRect(px - 226, y - 44, 124, 88, 10);
      c.add(g0);
      const lvl = save.upgrades[id];
      const max = lvl >= u.costs.length;
      // Before -> after preview, wearing the real gear.
      const big = id === 'siege';
      const sc = big ? 0.42 : 0.78;
      const feetY = y + (big ? 34 : 38);
      const now = previewFor(id, lvl)[0];
      if (max) {
        const v = makeUnitVisual(this, now.kind, 'blue', sc * 1.1, now.gear);
        v.root.setPosition(px - 164, feetY);
        c.add(v.root);
        c.add(this.add.image(px - 128, y - 30, 'star').setScale(0.5));
      } else {
        const next = previewFor(id, lvl + 1)[0];
        const v0 = makeUnitVisual(this, now.kind, 'blue', sc, now.gear);
        v0.root.setPosition(px - 196, feetY).setAlpha(0.85);
        const v1 = makeUnitVisual(this, next.kind, 'blue', sc * 1.08, next.gear);
        v1.root.setPosition(px - 128, feetY);
        const arrow = this.label(px - 162, y - 4, '>', 26, '#1f8a2e', 0.5).setStroke('#ffffff', 4);
        c.add([v0.root, arrow, v1.root]);
        this.tweens.add({ targets: v1.root, scale: v1.root.scale * 1.07, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: arrow, x: arrow.x + 4, duration: 450, yoyo: true, repeat: -1 });
      }
      c.add(this.label(px - 92, y - 28, u.name, 24));
      c.add(this.label(px - 92, y - 2, max ? `${tierLabel(id, lvl)} - the best!` : `Next: ${tierLabel(id, lvl + 1)}`, 16, max ? '#1f8a2e' : '#24509e'));
      c.add(this.label(px - 92, y + 20, u.blurb, 14, '#5a3418'));
      for (let k = 0; k < u.costs.length; k++) {
        const g = this.add.graphics();
        g.fillStyle(k < lvl ? 0xf2c230 : 0x9a8a70, 1).fillCircle(px - 84 + k * 18, y + 39, 6);
        g.lineStyle(1.5, 0x5a3418, 1).strokeCircle(px - 84 + k * 18, y + 39, 6);
        c.add(g);
      }
      if (max) {
        c.add(this.label(px + 172, y, 'MAX', 28, '#1f8a2e', 0.5));
        return;
      }
      const cost = u.costs[lvl];
      const b = button(this, px + 172, y, 104, 58, `${cost}`, COLORS.purple, () => this.upgrade(id), { icon: 'coin', iconScale: 0.9, fontSize: 24 });
      if (save.gold < cost) b.setEnabled(false);
      c.add(b);
    });
    c.add(this.label(px, py + 228, 'Upgrades make troops stronger AND look cooler!', 17, '#5a3418', 0.5));
    c.add(button(this, px, py + 268, 260, 50, 'See all the gear', COLORS.blue, () => goTo(this, 'Armory'), { fontSize: 22 }));
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
    if (this.ceremony) return;
    const u = UPGRADES[id];
    const from = save.upgrades[id];
    const cost = u.costs[from];
    if (cost === undefined || save.gold < cost) return;
    save.gold -= cost;
    save.upgrades[id]++;
    persist();
    sfx.coin();
    this.gold.update();
    this.forgeCeremony(id, from, from + 1);
  }

  /** Full-screen "forging" moment: old gear, three hammer clangs, flash, new gear pops in. */
  private forgeCeremony(id: UpgradeId, from: number, to: number) {
    const D = 20000;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const vis: UnitVisual[] = [];
    const cx = W / 2, feetY = 500;
    const dim = this.add.rectangle(cx, H / 2, W, H, 0x0b0a1a, 0.9).setDepth(D).setInteractive();
    if (!this.textures.exists('forge_rays')) {
      const g = this.make.graphics({}, false);
      for (let i = 0; i < 14; i++) {
        const a0 = (i / 14) * Math.PI * 2, a1 = a0 + Math.PI / 14;
        g.fillStyle(i % 2 ? 0xffe14d : 0xffb12a, 0.35);
        g.beginPath(); g.moveTo(400, 400); g.lineTo(400 + Math.cos(a0) * 400, 400 + Math.sin(a0) * 400); g.lineTo(400 + Math.cos(a1) * 400, 400 + Math.sin(a1) * 400); g.closePath(); g.fillPath();
      }
      g.generateTexture('forge_rays', 800, 800);
      g.destroy();
    }
    if (!this.textures.exists('forge_hammer')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0x2b1d14).fillRoundedRect(25, 22, 14, 70, 5);
      g.fillStyle(0x9a6234).fillRoundedRect(28, 25, 8, 64, 3);
      g.fillStyle(0x2b1d14).fillRoundedRect(2, 2, 60, 30, 8);
      g.fillStyle(0x9aa6b4).fillRoundedRect(6, 6, 52, 22, 6);
      g.fillStyle(0xdfe6ee).fillRect(10, 9, 44, 5);
      g.generateTexture('forge_hammer', 64, 96);
      g.destroy();
    }
    const hammer = this.add.image(cx + 120, feetY - 150, 'forge_hammer').setOrigin(0.5, 0.95).setScale(1.6).setAngle(40).setDepth(D + 7);
    objs.push(hammer);
    const rays = this.add.image(cx, feetY - 120, 'forge_rays').setScale(1.4).setDepth(D + 1).setAlpha(0);
    const glow = this.add.image(cx, feetY - 110, 'puff').setDepth(D + 2).setScale(5).setTint(0xffe9a0).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const pedestal = this.add.ellipse(cx, feetY + 6, 320, 60, 0x5a3418).setStrokeStyle(4, 0x2b1d14).setDepth(D + 2);
    const title = txt(this, cx, 90, 'Forging...', 56, '#ffe14d').setDepth(D + 10).setStroke('#2b1d14', 10);
    const sub = txt(this, cx, 160, `${UPGRADES[id].name}: ${tierLabel(id, from)}`, 28, '#ffffff').setDepth(D + 10);
    objs.push(dim, rays, glow, pedestal, title, sub);

    const models = (lvl: number) => {
      const list = previewFor(id, lvl);
      const sc = id === 'siege' ? 2.2 : 3.4;
      const gap = list.length > 1 ? 200 : 0;
      return list.map((m, i) => {
        const v = makeUnitVisual(this, m.kind, 'blue', sc, m.gear);
        v.root.setPosition(cx + (i - (list.length - 1) / 2) * gap, feetY).setDepth(D + 5);
        vis.push(v);
        return v;
      });
    };
    let cur = models(from);
    const sparks = this.add.particles(0, 0, 'spark', {
      lifespan: 600, speed: { min: 160, max: 420 }, scale: { start: 0.9, end: 0 }, gravityY: 500,
      tint: [0xffe14d, 0xff8a1a, 0xffffff], blendMode: 'ADD', emitting: false,
    }).setDepth(D + 8);
    objs.push(sparks);

    const hits = 3;
    for (let i = 0; i < hits; i++) {
      this.time.delayedCall(380 + i * 380, () => {
        this.tweens.add({ targets: hammer, angle: { from: 40, to: -25 }, duration: 90, yoyo: true, ease: 'Quad.easeIn' });
        sfx.anvil(i);
        this.cameras.main.shake(110, 0.006);
        sparks.explode(18, cx + Phaser.Math.Between(-40, 40), feetY - 110 + Phaser.Math.Between(-40, 40));
        cur.forEach((v) => this.tweens.add({ targets: v.root, scaleY: v.root.scaleY * 0.9, scaleX: v.root.scaleX * 1.05, duration: 70, yoyo: true }));
      });
    }
    const revealAt = 380 + hits * 380 + 120;
    const close = () => {
      if (!this.ceremony?.closable) return;
      this.ceremony = undefined;
      objs.forEach((o) => o.destroy());
      vis.forEach((v) => v.root.destroy());
      this.buildArmy();
      // Everyone in camp just got the new gear: little hop.
      this.armyVisuals.forEach((a, i) => this.tweens.add({ targets: a.v.root, y: a.v.root.y - 14, duration: 160, yoyo: true, delay: i * 25, ease: 'Quad.easeOut' }));
      this.buildShop();
    };
    const cer = { objs, vis, done: close, revealed: false, closable: false };
    this.ceremony = cer;
    this.time.delayedCall(revealAt, () => {
      cer.revealed = true;
      this.tweens.add({ targets: hammer, alpha: 0, x: hammer.x + 80, duration: 250 });
      this.cameras.main.flash(260, 255, 250, 220);
      cur.forEach((v) => { v.root.destroy(); vis.splice(vis.indexOf(v), 1); });
      cur = models(to);
      cur.forEach((v) => {
        const s0 = v.root.scale;
        v.root.setScale(0);
        this.tweens.add({ targets: v.root, scale: s0, duration: 520, ease: 'Back.easeOut' });
      });
      sparks.explode(60, cx, feetY - 120);
      this.tweens.add({ targets: rays, alpha: 0.6, duration: 300 });
      this.tweens.add({ targets: rays, angle: 360, duration: 14000, repeat: -1 });
      this.tweens.add({ targets: glow, alpha: 0.55, duration: 300 });
      sfx.upgrade(to);
      title.setText(`${tierLabel(id, to)}!`).setScale(0.3);
      this.tweens.add({ targets: title, scale: 1, duration: 420, ease: 'Back.easeOut' });
      sub.setText(`${UPGRADES[id].name} level ${to}:  ${UPGRADES[id].blurb}`).setColor('#bfffb0');
      const hint = txt(this, cx, 640, 'Tap to continue', 26, '#ffffff').setDepth(D + 10).setAlpha(0);
      objs.push(hint);
      this.time.delayedCall(700, () => {
        cer.closable = true;
        this.tweens.add({ targets: hint, alpha: 1, duration: 300, yoyo: true, hold: 600, repeat: -1 });
      });
      this.time.delayedCall(4200, close);
    });
    dim.on('pointerdown', close);
  }

  update(_t: number, dt: number) {
    for (const a of this.armyVisuals) {
      a.phase += dt * 0.004;
      animateWalk(a.v, a.phase, false);
    }
    if (this.ceremony) {
      this.cerPhase += dt * 0.004;
      for (const v of this.ceremony.vis) animateWalk(v, this.cerPhase, false);
    }
  }
}

export { armyCount };
