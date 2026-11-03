import Phaser from 'phaser';
import { W, H, txt, button, COLORS, goldHud, goTo, fadeIn, panel, READ_FONT, FONT, Button } from '../ui';
import { sfx, unlockAudio } from '../audio';
import { save, persist, pickWord, recordWord, GOLD_PER_WORD } from '../state';
import { Listener, MicState, queryMicPermission, speakWord, speechSupported, secureContextOk } from '../speech';
import { WORD_LEVELS } from '../data/words';

const MIC_LABELS: Record<MicState, [string, number]> = {
  unknown: ['Mic: tap the mic to start', 0x6b7a8a],
  prompt: ['Mic: will ask permission', 0xd9922a],
  granted: ['Mic: ON (allowed)', 0x2f9e44],
  denied: ['Mic: BLOCKED - allow it in the address bar', 0xc0392b],
  unsupported: ['No speech recognition in this browser - use the grown-up button', 0xc0392b],
  insecure: ['Mic needs https:// or localhost', 0xc0392b],
};

export class ReadScene extends Phaser.Scene {
  private word = '';
  private wordText!: Phaser.GameObjects.Text;
  private heardText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private card!: Phaser.GameObjects.Container;
  private micBtn!: Phaser.GameObjects.Container;
  private micRings: Phaser.GameObjects.Arc[] = [];
  private micState: MicState = 'unknown';
  private micChip!: Phaser.GameObjects.Container;
  private listener = new Listener();
  private busy = false;
  private listening = false;
  private tries = 0;
  private streak = 0;
  private streakText!: Phaser.GameObjects.Text;
  private sessionText!: Phaser.GameObjects.Text;
  private sessionCount = 0;
  private gold!: ReturnType<typeof goldHud>;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hearBtn!: Button;
  private settings?: Phaser.GameObjects.Container;

  constructor() { super('Read'); }

  create() {
    fadeIn(this);
    this.busy = false; this.listening = false; this.streak = 0; this.sessionCount = 0; this.tries = 0;
    // Sky + hills backdrop
    const g = this.add.graphics();
    g.fillGradientStyle(0x6ec6ff, 0x6ec6ff, 0xbfe8ff, 0xbfe8ff, 1).fillRect(0, 0, W, H);
    g.fillStyle(0x8fd45a, 1).fillEllipse(250, H + 80, 900, 420);
    g.fillStyle(0x7cc243, 1).fillEllipse(1050, H + 60, 1000, 380);
    g.fillStyle(0xffffff, 0.8);
    for (const [x, y, s] of [[160, 110, 1], [1080, 150, 1.3], [700, 70, 0.8]]) {
      g.fillEllipse(x, y, 140 * s, 50 * s); g.fillEllipse(x + 40 * s, y - 20 * s, 90 * s, 60 * s); g.fillEllipse(x - 40 * s, y - 10 * s, 80 * s, 45 * s);
    }
    // little camp on the hill
    this.add.image(120, 640, 'tent').setScale(0.9);
    this.add.image(1170, 600, 'keep').setScale(0.55).setAlpha(0.95);
    this.add.image(230, 680, 'knight_blue').setScale(1.4);

    // Top bar
    button(this, 90, 42, 150, 58, 'Camp', COLORS.blue, () => { this.listener.stop(); goTo(this, 'Camp'); }, { fontSize: 26 });
    button(this, 248, 42, 140, 58, 'Words', COLORS.purple, () => this.openSettings(), { fontSize: 24 });
    this.gold = goldHud(this);
    this.streakText = txt(this, W / 2, 40, '', 30, '#ffe14d');
    this.sessionText = txt(this, W - 130, 92, 'Read today: 0', 20);
    this.micChip = this.add.container(W / 2, 92);
    this.updateMicChip();

    // Word card
    this.card = this.add.container(W / 2, 262);
    this.card.add(panel(this, 0, 0, 720, 260));
    this.wordText = this.add.text(0, -6, '', {
      fontFamily: READ_FONT, fontSize: '150px', color: '#2b1d14', fontStyle: 'bold', resolution: 2,
    }).setOrigin(0.5);
    this.card.add(this.wordText);
    this.heardText = txt(this, W / 2, 422, '', 26, '#ffffff');
    this.hintText = txt(this, W / 2, 655, '', 30, '#ffffff');

    // Mic button
    this.micBtn = this.add.container(W / 2, 545);
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(0, 0, 70, 0xffffff, 0).setStrokeStyle(6, 0xffffff, 0.8).setVisible(false);
      this.micRings.push(ring);
      this.micBtn.add(ring);
    }
    const mg = this.add.graphics();
    mg.fillStyle(0x2b1d14, 1).fillCircle(0, 6, 74);
    mg.fillStyle(0xa82a22, 1).fillCircle(0, 6, 68);
    mg.fillStyle(0xe0483a, 1).fillCircle(0, 0, 68);
    mg.fillStyle(0xff8a7a, 0.6).fillEllipse(0, -34, 90, 34);
    this.micBtn.add(mg);
    this.micBtn.add(this.add.image(0, 0, 'mic').setScale(1.4));
    this.micBtn.setSize(150, 150).setInteractive({ useHandCursor: true });
    this.micBtn.on('pointerdown', () => this.startListening());
    this.tweens.add({ targets: this.micBtn, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.hearBtn = button(this, W / 2 - 300, 545, 210, 76, 'Hear it', COLORS.blue, () => { unlockAudio(); speakWord(this.word); }, { icon: 'speaker', fontSize: 28 });
    button(this, W / 2 + 300, 545, 210, 76, 'Skip', COLORS.orange, () => this.skip(), { fontSize: 30 });
    // Grown-up override (always available; prominent if speech recognition is unavailable)
    const noSpeech = !speechSupported || !secureContextOk();
    button(this, W - 140, H - 50, 250, 64, noSpeech ? 'He read it!' : 'Grown-up: correct', COLORS.green, () => this.correct('(grown-up)'), { fontSize: noSpeech ? 30 : 20 });

    this.confetti = this.add.particles(0, 0, 'puff', {
      lifespan: 1300, speed: { min: 250, max: 650 }, angle: { min: 200, max: 340 }, gravityY: 700,
      scale: { start: 0.28, end: 0.12 }, tint: [0xff5b6e, 0xffe14d, 0x5cc33a, 0x3d8be0, 0xb36bff], rotate: { min: 0, max: 360 }, emitting: false,
    }).setDepth(50);

    queryMicPermission((s) => { this.micState = s; this.updateMicChip(); }).then((s) => { this.micState = s; this.updateMicChip(); });

    this.input.keyboard?.on('keydown-SPACE', () => this.startListening());
    this.input.keyboard?.on('keydown-Y', () => this.correct('(grown-up)'));
    this.input.keyboard?.on('keydown-H', () => speakWord(this.word));
    this.events.once('shutdown', () => { this.listener.stop(); this.input.keyboard?.removeAllListeners(); });

    this.nextWord();
  }

  private updateMicChip() {
    const [label, color] = MIC_LABELS[this.micState];
    this.micChip.removeAll(true);
    const t = txt(this, 14, 0, label, 18);
    const w = t.width + 50;
    const g = this.add.graphics();
    g.fillStyle(0x2b1d14, 0.85).fillRoundedRect(-w / 2, -18, w, 36, 18);
    g.fillStyle(color, 1).fillCircle(-w / 2 + 20, 0, 8);
    this.micChip.add([g, t]);
  }

  private nextWord() {
    this.word = pickWord(this.word);
    this.tries = 0;
    this.busy = false;
    this.wordText.setText(this.word);
    const fit = Math.min(1, 640 / Math.max(1, this.wordText.width));
    this.card.setScale(0.6).setAlpha(0);
    this.wordText.setScale(fit);
    this.tweens.add({ targets: this.card, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
    this.heardText.setText('');
    this.hintText.setText(speechSupported ? 'Tap the red button (or press Space) and read the word!' : 'Read the word out loud to a grown-up!');
    this.streakText.setText(this.streak >= 2 ? `${this.streak} in a row!` : '');
  }

  private setListening(on: boolean) {
    this.listening = on;
    this.micRings.forEach((r, i) => {
      this.tweens.killTweensOf(r);
      r.setVisible(on).setScale(1).setAlpha(1);
      if (on) this.tweens.add({ targets: r, scale: 1.9, alpha: 0, duration: 1200, delay: i * 400, repeat: -1 });
    });
  }

  private async startListening() {
    unlockAudio();
    if (this.busy || this.listening) return;
    if (!speechSupported || !secureContextOk()) {
      this.hintText.setText('Speech recognition is not available here - use "He read it!"');
      return;
    }
    sfx.listen();
    this.setListening(true);
    this.hintText.setText('Listening... read the word!');
    this.heardText.setText('');
    const res = await this.listener.listen(this.word, (heard) => this.heardText.setText(`I hear: "${heard}"`));
    if (!this.scene.isActive()) return;
    this.setListening(false);
    if (this.micState !== 'granted' && !res.error) { this.micState = 'granted'; this.updateMicChip(); }
    if (res.matched) return this.correct(res.heard);
    if (res.error === 'not-allowed' || res.error === 'service-not-allowed') {
      this.micState = 'denied'; this.updateMicChip();
      this.hintText.setText('The microphone is blocked. Click the mic icon in the address bar to allow it.');
      return;
    }
    if (res.error === 'network') {
      this.hintText.setText('Speech needs the internet. Check Wi-Fi, or use the grown-up button.');
      return;
    }
    if (!res.heard) {
      this.hintText.setText("I didn't hear anything. Tap the button and try again!");
      return;
    }
    this.wrong(res.heard);
  }

  private correct(heard: string) {
    if (this.busy) return;
    this.busy = true;
    this.listener.stop();
    this.setListening(false);
    if (this.tries === 0) recordWord(this.word, true);
    this.streak++;
    this.sessionCount++;
    save.totalRead++;
    save.bestStreak = Math.max(save.bestStreak, this.streak);
    let earned = GOLD_PER_WORD;
    const bonus = this.streak % 5 === 0;
    if (bonus) earned += 20;
    save.gold += earned;
    persist();
    sfx.cheer();
    this.heardText.setText(heard.startsWith('(') ? '' : `I heard: "${heard}"`);
    this.hintText.setText(bonus ? `AMAZING! ${this.streak} in a row - bonus gold!` : Phaser.Utils.Array.GetRandom(['Great reading!', 'You got it!', 'Awesome!', 'Super job!', 'Well done, knight!']));
    this.sessionText.setText(`Read today: ${this.sessionCount}`);
    this.wordText.setColor('#1f8a2e');
    const check = this.add.image(W / 2 + 330, 170, 'check').setScale(0).setDepth(60);
    this.tweens.add({ targets: check, scale: 0.9, angle: { from: -40, to: 0 }, duration: 400, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.card, scale: 1.08, duration: 160, yoyo: true });
    this.confetti.explode(40, W / 2 - 200, 300);
    this.confetti.explode(40, W / 2 + 200, 300);
    // coins fly to the gold counter
    const n = Math.min(8, Math.round(earned / 5));
    for (let i = 0; i < n; i++) {
      const c = this.add.image(W / 2 + Phaser.Math.Between(-120, 120), 300 + Phaser.Math.Between(-40, 40), 'coin').setDepth(70).setScale(1.3);
      this.tweens.add({
        targets: c, x: this.gold.coin.x, y: this.gold.coin.y, scale: 0.8, duration: 650, delay: 150 + i * 70, ease: 'Cubic.easeIn',
        onComplete: () => { c.destroy(); sfx.coin(); if (i === n - 1) this.gold.update(); },
      });
    }
    const plus = txt(this, W / 2, 140, `+${earned}`, 48, '#ffe14d').setDepth(80).setScale(0);
    this.tweens.add({ targets: plus, scale: 1, y: 120, duration: 400, ease: 'Back.easeOut', onComplete: () => this.tweens.add({ targets: plus, alpha: 0, delay: 500, duration: 300, onComplete: () => plus.destroy() }) });
    this.time.delayedCall(1700, () => {
      check.destroy();
      this.wordText.setColor('#2b1d14');
      this.nextWord();
    });
  }

  private wrong(heard: string) {
    if (this.tries === 0) recordWord(this.word, false);
    this.tries++;
    this.streak = 0;
    this.streakText.setText('');
    sfx.tryAgain();
    this.heardText.setText(`I heard: "${heard}"`);
    this.tweens.add({ targets: this.card, x: { from: W / 2 - 14, to: W / 2 }, duration: 320, ease: 'Elastic.easeOut' });
    if (this.tries >= 2) {
      this.hintText.setText('Listen, then try again!');
      speakWord(this.word);
    } else {
      this.hintText.setText('Almost! Try again - or tap "Hear it".');
    }
    this.tweens.add({ targets: this.hearBtn, scale: 1.12, duration: 200, yoyo: true, repeat: 2 });
  }

  private skip() {
    if (this.busy) return;
    this.listener.stop();
    this.setListening(false);
    this.streak = 0;
    this.nextWord();
  }

  private openSettings() {
    if (this.settings) return;
    const c = this.add.container(0, 0).setDepth(500);
    this.settings = c;
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    c.add(dim);
    c.add(panel(this, W / 2, H / 2, 700, 520));
    c.add(txt(this, W / 2, H / 2 - 210, 'Word Lists', 40));
    c.add(txt(this, W / 2, H / 2 - 170, 'Pick which words to practice (grown-ups)', 20, '#5a3418', { stroke: '#00000000', strokeThickness: 0 }));
    WORD_LEVELS.forEach((lvl, i) => {
      const y = H / 2 - 110 + i * 78;
      const on = () => save.enabledLevels.includes(lvl.id);
      const b = button(this, W / 2 - 230, y, 90, 56, on() ? 'ON' : 'OFF', on() ? COLORS.green : COLORS.grey, () => {
        if (on()) { if (save.enabledLevels.length > 1) save.enabledLevels = save.enabledLevels.filter((x) => x !== lvl.id); }
        else save.enabledLevels.push(lvl.id);
        persist();
        c.destroy(); this.settings = undefined; this.openSettings();
      }, { fontSize: 22 });
      c.add(b);
      const t1 = this.add.text(W / 2 - 160, y - 14, lvl.name, { fontFamily: FONT, fontSize: '26px', color: '#2b1d14', resolution: 2 }).setOrigin(0, 0.5);
      const t2 = this.add.text(W / 2 - 160, y + 14, `${lvl.words.length} words - ${lvl.words.slice(0, 6).join(', ')}...`, { fontFamily: READ_FONT, fontSize: '18px', color: '#5a3418', resolution: 2 }).setOrigin(0, 0.5);
      c.add([t1, t2]);
    });
    c.add(button(this, W / 2, H / 2 + 210, 200, 64, 'Done', COLORS.blue, () => { c.destroy(); this.settings = undefined; }));
  }
}
