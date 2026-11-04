import Phaser from 'phaser';
import { makeUnitVisual } from '../units';
import { playMusic } from '../music/player';
import { W, H, txt, button, COLORS, tiledGrass, scatterDecor, goTo, fadeIn , soundToggles } from '../ui';
import { sfx, unlockAudio } from '../audio';
import { save, castlesBeaten, pendingGraduation, KINGDOMS } from '../state';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    fadeIn(this);
    playMusic('camp');
    soundToggles(this, 1150, 44);
    tiledGrass(this);
    scatterDecor(this, 34, [new Phaser.Geom.Rectangle(300, 120, 680, 520)], 4);
    const keep = this.add.image(W / 2, 330, 'keep').setScale(1.35).setOrigin(0.5, 0.85).setDepth(330);
    this.tweens.add({ targets: keep, y: 322, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const k1 = makeUnitVisual(this, 'knight', 'blue', 2).root.setPosition(W / 2 - 170, 525).setDepth(470);
    const a2 = makeUnitVisual(this, 'archer', 'blue', 2);
    a2.rig.scaleX = -1;
    const k2 = a2.root.setPosition(W / 2 + 170, 525).setDepth(470);
    [k1, k2].forEach((k, i) => this.tweens.add({ targets: k, y: 515, duration: 500, yoyo: true, repeat: -1, delay: i * 250, ease: 'Sine.easeInOut' }));

    const t = txt(this, W / 2, 95, 'READING CONQUEST', 84, '#ffe14d').setDepth(9000);
    t.setStroke('#2b1d14', 14);
    this.tweens.add({ targets: t, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    txt(this, W / 2, 165, 'Read words. Build an army. Conquer castles!', 30).setDepth(9000);

    // crowns he has won so far
    save.crowns.slice().sort().forEach((k, i, a) => {
      const cr = this.add.image(W / 2 + (i - (a.length - 1) / 2) * 90, 228, `crown_${k}`).setScale(0.7).setDepth(9000);
      this.tweens.add({ targets: cr, y: 220, duration: 900, yoyo: true, repeat: -1, delay: i * 200, ease: 'Sine.easeInOut' });
    });
    txt(this, W / 2, 680, `Now exploring: ${KINGDOMS[save.kingdom].name}`, 22).setDepth(9000);
    const first = save.totalRead === 0 && castlesBeaten() === 0;
    const grad = pendingGraduation();
    const dest = () => (grad !== null ? 'Crown' : first ? 'Read' : 'Camp');
    const data = grad !== null ? { kingdom: grad } : undefined;
    button(this, W / 2, 600, 360, 92, first ? 'START!' : 'PLAY!', COLORS.green, () => {
      unlockAudio();
      sfx.horn();
      goTo(this, dest(), data);
    }, { fontSize: 50 }).setDepth(9000);

    this.input.keyboard?.once('keydown-SPACE', () => { unlockAudio(); goTo(this, dest(), data); });
  }
}
