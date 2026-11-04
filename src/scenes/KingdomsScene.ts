import Phaser from 'phaser';
import { playMusic } from '../music/player';
import { W, H, txt, button, COLORS, goTo, fadeIn, FONT, soundToggles, goldHud } from '../ui';
import { sfx } from '../audio';
import { save, persist, KINGDOMS, kingdomUnlocked, beatenIn, starsIn, pendingGraduation, castleDef } from '../state';
import { CASTLES_PER_KINGDOM } from '../kingdoms';
import { bodyKey } from '../art-gear';

const CARD_W = 290, CARD_H = 480, CY = 400;
const cardX = (k: number) => W / 2 + (k - 1.5) * 310;

/** World map: pick a kingdom. Locked ones show what beats them open. */
export class KingdomsScene extends Phaser.Scene {
  constructor() { super('Kingdoms'); }

  create() {
    const g = pendingGraduation();
    if (g !== null) { this.scene.start('Crown', { kingdom: g }); return; }
    fadeIn(this);
    playMusic('map');
    soundToggles(this, 930, 40);
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x223a6a, 0x223a6a, 0x0f1a30, 0x0f1a30, 1).fillRect(0, 0, W, H);
    const rnd = new Phaser.Math.RandomDataGenerator(['stars']);
    for (let i = 0; i < 90; i++) bg.fillStyle(0xffffff, rnd.realInRange(0.2, 0.8)).fillCircle(rnd.between(0, W), rnd.between(0, H), rnd.realInRange(0.8, 2.2));
    const t = txt(this, W / 2, 50, 'THE KINGDOMS', 56, '#ffe14d');
    t.setStroke('#2b1d14', 12);
    txt(this, W / 2, 104, 'Beat the boss at the end of a kingdom to open the next one!', 24);
    button(this, 90, 44, 150, 58, 'Camp', COLORS.blue, () => goTo(this, 'Camp'), { fontSize: 26 }).setDepth(9600);
    goldHud(this);

    // road between the kingdoms
    const road = this.add.graphics();
    for (let k = 0; k < KINGDOMS.length - 1; k++) {
      const open = kingdomUnlocked(k + 1);
      for (let x = cardX(k) + CARD_W / 2 - 4; x < cardX(k + 1) - CARD_W / 2 + 6; x += 9) road.fillStyle(open ? 0xffe9a8 : 0x6a6a7a, 1).fillCircle(x, CY, 3.5);
    }
    KINGDOMS.forEach((_, k) => this.card(k));
  }

  private card(k: number) {
    const kd = KINGDOMS[k];
    const open = kingdomUnlocked(k);
    const here = save.kingdom === k;
    const x = cardX(k);
    const c = this.add.container(x, CY);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 10, CARD_W, CARD_H, 26);
    g.fillStyle(kd.plate, 1).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 26);
    g.lineStyle(here ? 7 : 4, here ? 0xffe14d : 0xd8c49a, 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 26);
    c.add(g);
    // a window onto the kingdom's ground with a castle and its boss
    const ground = this.add.tileSprite(0, -110, CARD_W - 28, 190, kd.ground).setTileScale(0.5);
    if (kd.groundTint !== 0xffffff) ground.setTint(kd.groundTint);
    const mask = this.make.graphics({}, false);
    mask.fillStyle(0xffffff).fillRoundedRect(x - (CARD_W - 28) / 2, CY - 205, CARD_W - 28, 190, 18);
    ground.setMask(mask.createGeometryMask());
    c.add(ground);
    c.add(this.add.image(-92, -80, kd.decor[0]).setScale(0.55).setOrigin(0.5, 1));
    c.add(this.add.image(98, -70, kd.decor[2]).setScale(0.5).setOrigin(0.5, 1));
    c.add(this.add.image(-6, -60, 'keep').setScale(0.55).setOrigin(0.5, 0.92).setTint(kd.castleTint));
    const boss = castleDef(k, CASTLES_PER_KINGDOM - 1).boss;
    if (boss) {
      const key = boss.kind === 'camel' ? 'boss_camel' : boss.kind === 'dragon' ? 'dragon_body' : bodyKey('defender', 'ice', 4);
      const b = this.add.image(70, -36, key).setOrigin(0.5, 0.95).setScale(boss.kind === 'giant' ? 1.25 : 0.55);
      b.scaleX *= -1;
      c.add(b);
    } else {
      c.add(this.add.image(78, -40, bodyKey('defender', 'red', 2)).setOrigin(0.5, 0.95).setScale(-0.9, 0.9));
    }
    const label = (y: number, s: string, size: number, color = '#ffffff', wrap = CARD_W - 30) =>
      this.add.text(0, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', stroke: '#1a0f08', strokeThickness: 5, wordWrap: { width: wrap }, resolution: 2 }).setOrigin(0.5);
    c.add(label(-210 + 0, `Kingdom ${k + 1}`, 18, '#ffe14d').setY(-226));
    c.add(label(22, kd.name.replace(/^The /, 'The\n'), 28));
    c.add(label(86, kd.skill, 19, '#bfe3ff'));
    c.add(label(128, kd.example, 22, '#ffffff'));
    // progress
    const beaten = beatenIn(k);
    c.add(label(168, `${beaten}/${CASTLES_PER_KINGDOM} castles   ${starsIn(k)}/${CASTLES_PER_KINGDOM * 3}`, 19));
    c.add(this.add.image(84, 168, 'star').setScale(0.26));
    if (save.crowns.includes(k)) {
      const cr = this.add.image(CARD_W / 2 - 34, -CARD_H / 2 + 14, `crown_${k}`).setScale(0.62).setAngle(14);
      c.add(cr);
      this.tweens.add({ targets: cr, angle: 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (!open) {
      const shade = this.add.graphics();
      shade.fillStyle(0x000000, 0.55).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 26);
      c.add(shade);
      c.add(this.add.image(0, -105, 'lock').setScale(1.5));
      const prevBoss = castleDef(k - 1, CASTLES_PER_KINGDOM - 1).boss;
      c.add(label(200, `Beat ${prevBoss?.name ?? 'the last castle'} to open!`, 18, '#ffd0a0'));
    } else {
      const b = button(this, 0, 208, 200, 56, here ? 'Go!' : 'Travel!', here ? COLORS.orange : COLORS.green, () => this.pick(k), { fontSize: 26 });
      c.add(b);
      if (beaten === 0 && k > 0) {
        const nb = label(-CARD_H / 2 - 22, 'NEW!', 26, '#ffe14d');
        c.add(nb);
        this.tweens.add({ targets: nb, scale: 1.2, duration: 450, yoyo: true, repeat: -1 });
      }
    }
    c.setSize(CARD_W, CARD_H).setInteractive({ useHandCursor: open });
    c.on('pointerdown', () => {
      if (open) this.pick(k);
      else { sfx.click(); this.tweens.add({ targets: c, x: x + 8, duration: 60, yoyo: true, repeat: 3 }); }
    });
  }

  private pick(k: number) {
    sfx.horn();
    save.kingdom = k;
    persist();
    goTo(this, 'Map', { kingdom: k });
  }
}
