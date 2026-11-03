import Phaser from 'phaser';
import { W, H, txt, button, COLORS, tiledGrass, scatterDecor, goTo, fadeIn } from '../ui';
import { sfx, unlockAudio } from '../audio';
import { save, castlesBeaten } from '../state';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    fadeIn(this);
    tiledGrass(this);
    scatterDecor(this, 34, [new Phaser.Geom.Rectangle(300, 120, 680, 520)], 4);
    const keep = this.add.image(W / 2, 330, 'keep').setScale(1.35).setOrigin(0.5, 0.85).setDepth(330);
    this.tweens.add({ targets: keep, y: 322, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const k1 = this.add.image(W / 2 - 170, 470, 'knight_blue').setScale(2).setDepth(470);
    const k2 = this.add.image(W / 2 + 170, 470, 'archer_blue').setScale(2).setFlipX(true).setDepth(470);
    [k1, k2].forEach((k, i) => this.tweens.add({ targets: k, y: 460, duration: 500, yoyo: true, repeat: -1, delay: i * 250, ease: 'Sine.easeInOut' }));

    const t = txt(this, W / 2, 95, 'READING CONQUEST', 84, '#ffe14d').setDepth(9000);
    t.setStroke('#2b1d14', 14);
    this.tweens.add({ targets: t, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    txt(this, W / 2, 165, 'Read words. Build an army. Conquer castles!', 30).setDepth(9000);

    const first = save.totalRead === 0 && castlesBeaten() === 0;
    button(this, W / 2, 600, 360, 92, first ? 'START!' : 'PLAY!', COLORS.green, () => {
      unlockAudio();
      sfx.horn();
      goTo(this, first ? 'Read' : 'Camp');
    }, { fontSize: 50 }).setDepth(9000);

    this.input.keyboard?.once('keydown-SPACE', () => { unlockAudio(); goTo(this, first ? 'Read' : 'Camp'); });
  }
}
