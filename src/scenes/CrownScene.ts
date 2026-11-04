import Phaser from 'phaser';
import { playJingle, playMusic, musicOn } from '../music/player';
import { W, H, txt, button, COLORS, goTo, fadeIn, FONT } from '../ui';
import { sfx } from '../audio';
import { save, persist, KINGDOMS } from '../state';
import { clampKingdom } from '../kingdoms';
import { CROWN_STYLE } from '../art-kingdoms';

/** Graduation ceremony: a crown lands on his banner and the next kingdom opens. */
export class CrownScene extends Phaser.Scene {
  private k = 0;
  constructor() { super('Crown'); }
  init(data: { kingdom?: number }) { this.k = clampKingdom(data?.kingdom ?? 0); }

  create() {
    const k = this.k;
    const kd = KINGDOMS[k];
    const next = KINGDOMS[k + 1];
    if (!save.crowns.includes(k)) save.crowns.push(k);
    if (next && save.kingdom === k) save.kingdom = k + 1; // head on to the new kingdom
    persist();
    fadeIn(this);
    if (musicOn()) playJingle('crown', next ? (next.mapMusic as any) : 'camp'); else sfx.victory();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x3a1f6a, 0x3a1f6a, 0x120a24, 0x120a24, 1).fillRect(0, 0, W, H);
    // spinning light rays
    const rays = this.add.graphics({ x: W / 2, y: 300 }).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      rays.fillStyle(i % 2 ? 0xffe14d : 0xffffff, 0.12).fillTriangle(0, 0, Math.cos(a - 0.1) * 900, Math.sin(a - 0.1) * 900, Math.cos(a + 0.1) * 900, Math.sin(a + 0.1) * 900);
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 30000, repeat: -1 });

    const t = txt(this, W / 2, 56, 'CROWN CEREMONY', 54, '#ffe14d');
    t.setStroke('#2b1d14', 12);
    txt(this, W / 2, 110, `You conquered ${kd.name}!`, 30);

    // His banner on a pole
    const pole = this.add.graphics();
    pole.fillStyle(0x6b3d1c, 1).fillRoundedRect(W / 2 - 8, 170, 16, 400, 6);
    pole.fillStyle(0xffd34d, 1).fillCircle(W / 2, 168, 14);
    const banner = this.add.graphics();
    banner.fillStyle(0x2b1d14, 1).fillRoundedRect(W / 2 - 112, 196, 224, 284, 16);
    banner.fillStyle(0x3d8be0, 1).fillRoundedRect(W / 2 - 106, 200, 212, 270, 14);
    banner.fillStyle(0x24509e, 1).fillTriangle(W / 2 - 106, 470, W / 2 + 106, 470, W / 2, 520);
    banner.fillStyle(0x3d8be0, 1).fillTriangle(W / 2 - 100, 466, W / 2 + 100, 466, W / 2, 510);
    txt(this, W / 2, 438, save.heroName, 22);
    // crowns from earlier kingdoms already on the banner, small, along the bottom
    const earlier = save.crowns.filter((c) => c !== k).sort();
    earlier.forEach((c, i) => this.add.image(W / 2 + (i - (earlier.length - 1) / 2) * 56, 392, `crown_${c}`).setScale(0.42));

    const crown = this.add.image(W / 2, -120, `crown_${k}`).setScale(2.4).setAngle(-30);
    const sparks = this.add.particles(0, 0, 'spark', { speed: { min: 120, max: 420 }, lifespan: 900, scale: { start: 0.9, end: 0 }, blendMode: 'ADD', emitting: false }).setDepth(50);
    const confetti = this.add.particles(0, 0, 'puff', {
      lifespan: 2200, speed: { min: 250, max: 700 }, angle: { min: 200, max: 340 }, gravityY: 600,
      scale: { start: 0.3, end: 0.12 }, tint: [0xff5b6e, 0xffe14d, 0x5cc33a, 0x3d8be0, 0xb36bff], emitting: false,
    }).setDepth(60);
    this.tweens.add({
      targets: crown, y: 300, angle: 0, scale: 1.7, duration: 1300, delay: 500, ease: 'Bounce.easeOut',
      onComplete: () => {
        sfx.star(2);
        sparks.explode(40, W / 2, 300);
        confetti.explode(60, W / 2 - 300, 700); confetti.explode(60, W / 2 + 300, 700);
        this.cameras.main.flash(300, 255, 240, 180);
        this.tweens.add({ targets: crown, y: 292, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        const name = txt(this, W / 2, 560, `The ${CROWN_STYLE[k].name} is yours!`, 38, '#ffe14d');
        name.setScale(0);
        this.tweens.add({ targets: name, scale: 1, duration: 400, ease: 'Back.easeOut' });
        this.time.delayedCall(1400, () => this.unlock());
      },
    });
  }

  private unlock() {
    const next = KINGDOMS[this.k + 1];
    const c = this.add.container(W / 2, 640).setAlpha(0);
    if (next) {
      const g = this.add.graphics();
      g.fillStyle(next.plate, 0.95).fillRoundedRect(-560, -50, 1120, 100, 30);
      g.lineStyle(4, 0xffe14d, 1).strokeRoundedRect(-560, -50, 1120, 100, 30);
      c.add(g);
      c.add(this.add.text(-530, -20, 'New kingdom unlocked!', { fontFamily: FONT, fontSize: '30px', color: '#ffe14d', stroke: '#1a0f08', strokeThickness: 6, resolution: 2 }).setOrigin(0, 0.5));
      c.add(this.add.text(-530, 20, `${next.name}: ${next.skill.toLowerCase()} (${next.example})`, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#1a0f08', strokeThickness: 4, resolution: 2 }).setOrigin(0, 0.5));
      c.add(button(this, 300, 0, 230, 70, `Go!`, COLORS.orange, () => { sfx.horn(); save.kingdom = this.k + 1; persist(); goTo(this, 'Map', { kingdom: this.k + 1 }); }, { fontSize: 32 }));
      c.add(button(this, 470, 0, 130, 60, 'Camp', COLORS.blue, () => goTo(this, 'Camp'), { fontSize: 24 }));
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x2b1d14, 0.95).fillRoundedRect(-560, -50, 1120, 100, 30);
      g.lineStyle(4, 0xffe14d, 1).strokeRoundedRect(-560, -50, 1120, 100, 30);
      c.add(g);
      c.add(this.add.text(-530, 0, 'ALL FOUR KINGDOMS CONQUERED!\nYou are the Grand Champion Reader!', { fontFamily: FONT, fontSize: '24px', color: '#ffe14d', stroke: '#1a0f08', strokeThickness: 5, resolution: 2 }).setOrigin(0, 0.5));
      c.add(button(this, 330, 0, 220, 70, 'Kingdoms', COLORS.purple, () => goTo(this, 'Kingdoms'), { fontSize: 28 }));
      c.add(button(this, 490, 0, 120, 60, 'Camp', COLORS.blue, () => goTo(this, 'Camp'), { fontSize: 24 }));
      if (!musicOn()) return;
      this.time.delayedCall(4000, () => playMusic('camp'));
    }
    this.tweens.add({ targets: c, alpha: 1, y: 650, duration: 400 });
  }
}
