import Phaser from 'phaser';
import { iconKey } from '../units';
import { playMusic, setDuck } from '../music/player';
import { W, H, txt, button, COLORS, goldHud, goTo, fadeIn, panel, READ_FONT, FONT, Button, soundToggles, floatText } from '../ui';
import { sfx, unlockAudio } from '../audio';
import { save, persist, pickWord, recordWord, GOLD_PER_WORD, isNewWord, KINGDOMS } from '../state';
import { Listener, MicState, queryMicPermission, speakWord, speechSupported, secureContextOk, getStrictness, setStrictness, LISTEN_MS, Strictness } from '../speech';
import { WORD_LEVELS } from '../data/words';
import { SoundOut } from '../soundout';
import { breakdown, chunkClip } from '../data/phonics';
import { preload } from '../phonics-audio';
import { onCorrect, onMiss, onSkip, onHearIt, tickBonus, loadBonusLeft, BONUS_SECONDS, BONUS_WARN_SECONDS, streakActive, STREAK_TO_START, STREAK_MULT } from '../streak';

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
  private newTag!: Phaser.GameObjects.Container;
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
  private bonusLeft = 0; // seconds of 2x left
  private bonusRing?: Phaser.GameObjects.Graphics;
  private bonusSecs?: Phaser.GameObjects.Text;
  private bonusSaveAt = 0;
  private failedWord = false; // this word got 3 wrong tries (streak already ended)
  private streakHud!: Phaser.GameObjects.Container;
  private streakFlame?: Phaser.GameObjects.Image;
  private sessionText!: Phaser.GameObjects.Text;
  private sessionCount = 0;
  private gold!: ReturnType<typeof goldHud>;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hearBtn!: Button;
  private settings?: Phaser.GameObjects.Container;
  private soundBtn!: Button;
  private soundOut?: SoundOut;
  private countdown!: Phaser.GameObjects.Graphics;
  private listenUntil = 0;
  private micSettings?: Phaser.GameObjects.Container;

  constructor() { super('Read'); }

  create() {
    fadeIn(this);
    playMusic('read');
    soundToggles(this, 372, 42);
    this.busy = false; this.listening = false; this.streak = save.streak || 0; this.bonusLeft = loadBonusLeft(this.streak, save.bonusLeft); this.sessionCount = 0; this.tries = 0;
    // Sky + hills backdrop
    const g = this.add.graphics();
    g.fillGradientStyle(0x6ec6ff, 0x6ec6ff, 0xbfe8ff, 0xbfe8ff, 1).fillRect(0, 0, W, H);
    const [h1, h2] = [[0x8fd45a, 0x7cc243], [0xeaf6ff, 0xcfe6f8], [0xf0cf86, 0xe0b45e], [0x5a4a5e, 0x40324a]][save.kingdom] ?? [0x8fd45a, 0x7cc243];
    g.fillStyle(h1, 1).fillEllipse(250, H + 80, 900, 420);
    g.fillStyle(h2, 1).fillEllipse(1050, H + 60, 1000, 380);
    g.fillStyle(0xffffff, 0.8);
    for (const [x, y, s] of [[160, 110, 1], [1080, 150, 1.3], [700, 70, 0.8]]) {
      g.fillEllipse(x, y, 140 * s, 50 * s); g.fillEllipse(x + 40 * s, y - 20 * s, 90 * s, 60 * s); g.fillEllipse(x - 40 * s, y - 10 * s, 80 * s, 45 * s);
    }
    // little camp on the hill
    this.add.image(120, 640, 'tent').setScale(0.9);
    this.add.image(1170, 600, 'keep').setScale(0.55).setAlpha(0.95).setTint(KINGDOMS[save.kingdom].castleTint);
    this.add.image(230, 680, iconKey('knight', 'blue')).setScale(1.3);

    // Top bar
    button(this, 90, 42, 150, 58, 'Camp', COLORS.blue, () => { this.listener.stop(); goTo(this, 'Camp'); }, { fontSize: 26 });
    button(this, 248, 42, 140, 58, 'Words', COLORS.purple, () => this.openSettings(), { fontSize: 24 });
    this.gold = goldHud(this);
    this.streakHud = this.add.container(W / 2 + 40, 40).setDepth(40);
    this.updateStreakHud();
    this.sessionText = txt(this, W - 165, 92, 'Read today: 0', 20);
    this.micChip = this.add.container(W / 2, 92);
    this.updateMicChip();

    // Word card
    this.card = this.add.container(W / 2, 262);
    this.card.add(panel(this, 0, 0, 720, 260));
    this.wordText = this.add.text(0, -6, '', {
      fontFamily: READ_FONT, fontSize: '150px', color: '#2b1d14', fontStyle: 'bold', resolution: 2,
    }).setOrigin(0.5);
    this.card.add(this.wordText);
    // "New word!" ribbon for this kingdom's fresh words
    this.newTag = this.add.container(-300, -112);
    const tg = this.add.graphics();
    tg.fillStyle(0x2b1d14, 1).fillRoundedRect(-82, -20, 164, 44, 20);
    tg.fillStyle(0xff8a3a, 1).fillRoundedRect(-80, -22, 160, 40, 18);
    this.newTag.add([tg, this.add.image(-58, -2, 'star').setScale(0.24), txt(this, 12, -2, 'New word!', 22, '#ffffff')]);
    this.newTag.setAngle(-8);
    this.card.add(this.newTag);
    this.tweens.add({ targets: this.newTag, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.heardText = txt(this, W / 2, 452, '', 26, '#ffffff');
    // Tap the word itself, or the tab under it, to sound it out
    this.wordText.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openSoundOut());
    this.soundBtn = button(this, W / 2, 398, 290, 62, 'Sound it out', COLORS.purple, () => this.openSoundOut(), { fontSize: 28 });
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
    this.countdown = this.add.graphics();
    this.micBtn.add(this.countdown);
    this.micBtn.setSize(150, 150).setInteractive({ useHandCursor: true });
    this.micBtn.on('pointerdown', () => (this.listening ? this.stopListening() : this.startListening()));
    this.tweens.add({ targets: this.micBtn, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.hearBtn = button(this, W / 2 - 300, 545, 210, 76, 'Hear it', COLORS.blue, () => { unlockAudio(); this.hearIt(); }, { icon: 'speaker', fontSize: 28 });
    button(this, W / 2 + 300, 545, 210, 76, 'Skip', COLORS.orange, () => this.skip(), { fontSize: 30 });
    // Grown-up override (always available; prominent if speech recognition is unavailable)
    const noSpeech = !speechSupported || !secureContextOk();
    button(this, W - 140, H - 50, 250, 64, noSpeech ? 'He read it!' : 'Grown-up: correct', COLORS.green, () => this.correct('(grown-up)'), { fontSize: noSpeech ? 30 : 20 });
    this.gearButton(W - 38, 92);

    this.confetti = this.add.particles(0, 0, 'puff', {
      lifespan: 1300, speed: { min: 250, max: 650 }, angle: { min: 200, max: 340 }, gravityY: 700,
      scale: { start: 0.28, end: 0.12 }, tint: [0xff5b6e, 0xffe14d, 0x5cc33a, 0x3d8be0, 0xb36bff], rotate: { min: 0, max: 360 }, emitting: false,
    }).setDepth(50);

    queryMicPermission((s) => { this.micState = s; this.updateMicChip(); }).then((s) => { this.micState = s; this.updateMicChip(); });

    this.input.keyboard?.on('keydown-SPACE', () => { if (this.soundOut || this.micSettings) return; if (this.listening) this.stopListening(); else this.startListening(); });
    this.input.keyboard?.on('keydown-S', () => this.openSoundOut());
    this.input.keyboard?.on('keydown-Y', () => this.correct('(grown-up)'));
    this.input.keyboard?.on('keydown-H', () => this.hearIt());
    this.events.once('shutdown', () => { this.soundOut?.close(); this.listener.stop(); setDuck('mic', false); this.input.keyboard?.removeAllListeners(); });

    (window as any).__setBonusLeft = (s: number) => { this.bonusLeft = s; };
    (window as any).__soundOut = (w?: string) => this.openSoundOut(w);
    (window as any).__streakBanner = () => this.showStreakBanner();
    this.nextWord();
  }

  /** Open the "Sound it out" tiles for the current word (or a given word, for the debug hook). */
  openSoundOut(word = this.word, autoBlend = false) {
    unlockAudio();
    if (this.soundOut || this.settings || this.busy) return;
    if (this.listening) { this.listener.stop(); this.setListening(false); }
    this.tweens.killTweensOf(this.soundBtn); this.soundBtn.setScale(1);
    this.soundOut = new SoundOut(this, word, {
      onClose: () => { this.soundOut = undefined; },
      onHearWord: () => this.hearIt(false),
      onRead: () => this.time.delayedCall(150, () => this.startListening()),
    });
    if (autoBlend) this.time.delayedCall(700, () => this.soundOut?.blend());
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
    this.failedWord = false;
    this.busy = false;
    this.wordText.setText(this.word);
    this.newTag.setVisible(isNewWord(this.word));
    const fit = Math.min(1, 640 / Math.max(1, this.wordText.width));
    this.card.setScale(0.6).setAlpha(0);
    this.wordText.setScale(fit);
    this.tweens.add({ targets: this.card, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
    this.heardText.setText('');
    const ch = breakdown(this.word);
    if (ch) preload(this.word, ch.filter((c) => c.sounds.length).map(chunkClip));
    this.hintText.setText(speechSupported ? 'Tap the red button (or press Space) and read the word!' : 'Read the word out loud to a grown-up!');
  }

  update(_t: number, delta: number) {
    this.tickBonusClock(delta);
    // "Listening..." countdown ring: a yellow arc that runs down over the listening window
    this.countdown.clear();
    if (!this.listening) return;
    const left = Math.max(0, this.listenUntil - this.time.now);
    const frac = left / LISTEN_MS;
    this.countdown.lineStyle(12, 0xffe14d, 1).beginPath()
      .arc(0, 0, 86, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false).strokePath();
    const secs = Math.ceil(left / 1000);
    this.hintText.setText(secs > 0 ? `Listening... read the word!  ${secs}` : 'Listening...');
  }

  private stopListening() {
    this.listener.stop();
    this.setListening(false);
    this.hintText.setText('Tap the red button (or press Space) and read the word!');
  }

  private setListening(on: boolean) {
    this.listening = on;
    this.listenUntil = on ? this.time.now + LISTEN_MS : 0;
    if (!on) this.countdown?.clear();
    setDuck('mic', on); // silence music while the mic listens so recognition only hears the reader
    this.micRings.forEach((r, i) => {
      this.tweens.killTweensOf(r);
      r.setVisible(on).setScale(1).setAlpha(1);
      if (on) this.tweens.add({ targets: r, scale: 1.9, alpha: 0, duration: 1200, delay: i * 400, repeat: -1 });
    });
  }

  private async startListening() {
    unlockAudio();
    if (this.busy || this.listening || this.soundOut) return;
    if (!speechSupported || !secureContextOk()) {
      this.hintText.setText('Speech recognition is not available here - use "He read it!"');
      return;
    }
    sfx.listen();
    this.setListening(true);
    this.hintText.setText('Listening... read the word!');
    this.heardText.setText('');
    const res = await this.listener.listen(this.word, { onInterim: (heard) => this.heardText.setText(`I hear: "${heard}"`), mode: getStrictness() });
    if (!this.scene.isActive() || res.error === 'cancelled') return;
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
    if (res.error === 'audio-capture') {
      this.hintText.setText("I can't find a microphone. Check it's plugged in, or use the grown-up button.");
      return;
    }
    if (res.nothing || res.error) {
      // Silence, just "um", or a long chat in the background: not a miss, just try again.
      this.heardText.setText(res.heard ? `I heard: "${res.heard}"` : '');
      this.hintText.setText("I didn't hear you. Tap and try again!");
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
    const r = onCorrect(this.streak, GOLD_PER_WORD, this.failedWord);
    this.streak = r.streak;
    if (r.started) this.bonusLeft = BONUS_SECONDS;
    save.bonusLeft = this.bonusLeft;
    const earned = r.earned;
    this.sessionCount++;
    save.totalRead++;
    save.streak = this.streak;
    save.bestStreak = Math.max(save.bestStreak, this.streak);
    save.gold += earned;
    persist();
    sfx.cheer();
    this.updateStreakHud(true);
    if (r.started) this.time.delayedCall(450, () => this.showStreakBanner());
    this.heardText.setText(heard.startsWith('(') ? '' : `I heard: "${heard}"`);
    const praise = Phaser.Utils.Array.GetRandom(['Great reading!', 'You got it!', 'Awesome!', 'Super job!', 'Well done, knight!']);
    this.hintText.setText(r.milestone ? `AMAZING! ${this.streak} in a row - bonus gold!`
      : r.started ? `${STREAK_TO_START} in a row! Now every word pays ${STREAK_MULT}x coins!`
      : r.mult > 1 ? `${praise} ${STREAK_MULT}x coins!` : praise);
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
        onComplete: () => { c.destroy(); if (r.mult > 1) sfx.coin2x(); else sfx.coin(); if (i === n - 1) this.gold.update(); },
      });
    }
    // "+20" with a "2x" badge next to it while the streak is on
    const plus = this.add.container(W / 2, 140).setDepth(80).setScale(0);
    const pt = txt(this, 0, 0, `+${earned}`, 48, '#ffe14d');
    plus.add(pt);
    if (r.mult > 1) {
      pt.setX(-38);
      const badge = this.multBadge(pt.width / 2 + 8, 0, 0.9);
      plus.add(badge);
      this.tweens.add({ targets: badge, angle: { from: -14, to: 10 }, duration: 260, yoyo: true, repeat: 2 });
    }
    (window as any).__lastPayout = { earned, mult: r.mult, streak: this.streak };
    this.tweens.add({ targets: plus, scale: 1, y: 120, duration: 400, ease: 'Back.easeOut', onComplete: () => this.tweens.add({ targets: plus, alpha: 0, delay: r.mult > 1 ? 800 : 500, duration: 300, onComplete: () => plus.destroy() }) });
    this.time.delayedCall(r.started ? 2900 : 1700, () => {
      check.destroy();
      this.wordText.setColor('#2b1d14');
      this.nextWord();
    });
  }

  private wrong(heard: string) {
    if (this.tries === 0) recordWord(this.word, false);
    this.tries++;
    const m = onMiss(this.streak, this.tries);
    if (m.failed) this.failedWord = true;
    if (m.broke) this.endStreak();
    sfx.tryAgain();
    this.heardText.setText(`I heard: "${heard}"`);
    this.tweens.add({ targets: this.card, x: { from: W / 2 - 14, to: W / 2 }, duration: 320, ease: 'Elastic.easeOut' });
    if (this.tries >= 2) {
      // Second miss: open the sound-it-out tiles and blend the word for him
      this.hintText.setText(m.broke ? "New streak next word! Let's sound this one out." : "Let's sound it out together!");
      this.time.delayedCall(700, () => this.openSoundOut(this.word, true));
    } else {
      // First miss: offer help
      this.hintText.setText('Almost! Try again - or tap "Sound it out".');
      this.tweens.add({ targets: this.soundBtn, scale: 1.12, duration: 260, yoyo: true, repeat: 5 });
    }
  }

  private skip() {
    if (this.busy) return;
    this.listener.stop();
    this.setListening(false);
    if (onSkip(this.streak).broke) this.endStreak();
    this.nextWord();
  }

  /** "Hear it" reads the whole word (the answer), so it ends the streak; Sound it out does not. */
  private hearIt(speak = true) {
    if (speak) speakWord(this.word);
    const h = onHearIt(this.streak);
    this.failedWord = true; // this word won't count toward a new streak (pays normal coins)
    if (h.broke) {
      this.endStreak('Hearing it is great practice! New streak next word.');
      this.hintText.setText('Hearing it is great practice! New streak next word.');
    }
  }

  /** 2x bonus clock. Ticks only while this Read screen runs (Phaser stops calling update() in Camp/Map/battle
   *  and when the tab is hidden), and pauses while the Sound it out panel, settings, or a reward animation is up. */
  private tickBonusClock(deltaMs: number) {
    if (!streakActive(this.streak)) return;
    const paused = !!this.soundOut || !!this.settings || this.busy || document.hidden;
    if (!paused) {
      const t = tickBonus(this.streak, this.bonusLeft, Math.min(deltaMs, 250) / 1000);
      this.bonusLeft = t.left;
      if (t.expired) return this.bonusOver();
      if (this.time.now > this.bonusSaveAt) { this.bonusSaveAt = this.time.now + 2000; save.bonusLeft = this.bonusLeft; persist(); }
    }
    this.drawBonusRing();
  }

  private drawBonusRing() {
    const g = this.bonusRing, fx = this.streakFlame;
    if (!g || !fx || !g.active) return;
    const frac = this.bonusLeft / BONUS_SECONDS;
    const warn = this.bonusLeft <= BONUS_WARN_SECONDS;
    const blink = warn && Math.floor(this.time.now / 250) % 2 === 0;
    const col = warn ? (blink ? 0xff3b30 : 0xffffff) : 0xffe14d;
    g.clear();
    g.lineStyle(7, 0x000000, 0.45).strokeCircle(fx.x, 0, 24);
    g.lineStyle(7, col, 1).beginPath().arc(fx.x, 0, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false).strokePath();
    const s = Math.ceil(this.bonusLeft);
    this.bonusSecs?.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`).setColor(warn ? (blink ? '#ff5a4f' : '#ffffff') : '#ffe14d');
    if (warn) this.bonusSecs?.setScale(blink ? 1.15 : 1);
  }

  /** Bonus time ran out: gentle, not a punishment. Coins stay; build a new streak from the next word. */
  private bonusOver() {
    this.endStreak('Bonus time is over! Build a new streak!');
    this.failedWord = false; // the current word can start the new streak
    this.hintText.setText('Bonus time is over! Build a new streak!');
    (window as any).__bonusOverAt = Date.now();
  }

  /** Gentle reset: the flame puffs out, a soft tune, and an encouraging word. No buzzer, no lost coins. */
  private endStreak(msg?: string) {
    const was = this.streak;
    this.streak = 0;
    save.streak = 0;
    this.bonusLeft = 0; save.bonusLeft = 0;
    persist();
    this.time.delayedCall(350, () => sfx.streakEnd());
    const fx = this.streakFlame;
    if (fx) {
      const puff = this.add.image(this.streakHud.x + fx.x, this.streakHud.y + fx.y, 'puff').setDepth(45).setScale(0.4).setTint(0xcfd5db);
      this.tweens.add({ targets: puff, y: puff.y - 34, scale: 0.9, alpha: 0, duration: 700, onComplete: () => puff.destroy() });
    }
    this.updateStreakHud();
    if (msg) floatText(this, this.streakHud.x, this.streakHud.y + 70, msg, '#ffffff', 20);
    else if (was >= 2) floatText(this, this.streakHud.x, this.streakHud.y + 70, `Streak over (${was}) - start a new one!`, '#ffffff', 20);
  }

  /** Red-and-gold "2x" medal. */
  private multBadge(x: number, y: number, s = 1) {
    const c = this.add.container(x, y).setScale(s);
    const g = this.add.graphics();
    g.fillStyle(0x2b1d14, 1).fillCircle(0, 3, 33);
    g.fillStyle(0xf2c230, 1).fillCircle(0, 0, 31);
    g.fillStyle(0xe0301e, 1).fillCircle(0, 0, 25);
    g.fillStyle(0xffffff, 0.35).fillEllipse(0, -12, 34, 14);
    c.add(g);
    c.add(txt(this, 0, 1, `${STREAK_MULT}x`, 28, '#ffffff'));
    return c;
  }

  /** Flame + number, pips toward the 2x, then a pulsing "2x COINS" medal once the streak is on. */
  private updateStreakHud(pop = false) {
    const c = this.streakHud;
    c.each((o: Phaser.GameObjects.GameObject) => this.tweens.killTweensOf(o));
    c.removeAll(true);
    const on = streakActive(this.streak);
    const w = on ? 350 : 270, h = 54;
    const g = this.add.graphics();
    g.fillStyle(0x2b1d14, 0.85).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    if (on) g.lineStyle(4, 0xffc93a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    c.add(g);
    const lit = this.streak > 0;
    const flame = this.add.image(-w / 2 + 30, -4, lit ? 'flame' : 'flame_off').setScale(on ? 0.78 : 0.66);
    this.streakFlame = flame;
    c.add(flame);
    if (lit) this.tweens.add({ targets: flame, scaleY: flame.scaleY * 1.12, scaleX: flame.scaleX * 0.94, duration: on ? 220 : 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const num = txt(this, -w / 2 + 72, 0, String(this.streak), 34, lit ? '#ffe14d' : '#b8bfc7');
    c.add(num);
    if (on) {
      const badge = this.add.container(45, 0);
      const bg = this.add.graphics();
      bg.fillStyle(0xe0301e, 1).fillRoundedRect(-68, -19, 136, 38, 19);
      bg.fillStyle(0xffffff, 0.25).fillRoundedRect(-60, -16, 120, 12, 6);
      badge.add([bg, txt(this, 0, 0, `${STREAK_MULT}x COINS`, 24, '#ffffff')]);
      c.add(badge);
      badge.x = 20;
      this.bonusRing = this.add.graphics(); c.add(this.bonusRing);
      this.bonusSecs = txt(this, w / 2 - 44, 0, '', 26, '#ffe14d'); c.add(this.bonusSecs);
      this.drawBonusRing();
      this.tweens.add({ targets: badge, scale: 1.08, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.bonusRing = undefined; this.bonusSecs = undefined;
      // three pips: how many more words until the 2x
      for (let i = 0; i < STREAK_TO_START; i++) {
        const done = i < this.streak;
        const pip = this.add.graphics({ x: -8 + i * 34, y: 0 });
        pip.fillStyle(0x000000, 0.4).fillCircle(0, 2, 12);
        pip.fillStyle(done ? 0xff8a1e : 0x5a4a3c, 1).fillCircle(0, 0, 11);
        if (done) pip.fillStyle(0xffe14d, 1).fillCircle(0, 0, 5);
        c.add(pip);
      }
      c.add(txt(this, 102, 0, `${STREAK_MULT}x`, 24, '#8a7a6a'));
    }
    if (pop) this.tweens.add({ targets: c, scale: { from: 1.25, to: 1 }, duration: 300, ease: 'Back.easeOut' });
  }

  /** Big "STREAK! 2x COINS" ribbon when the streak switches on. */
  private showStreakBanner() {
    sfx.streak();
    const c = this.add.container(W / 2, 250).setDepth(300).setScale(0);
    const g = this.add.graphics();
    const rw = 680, rh = 150;
    // ribbon tails
    for (const sx of [-1, 1]) {
      g.fillStyle(0x2b1d14, 1).fillPoints([
        { x: sx * (rw / 2 - 40), y: -rh / 2 + 34 }, { x: sx * (rw / 2 + 70), y: -rh / 2 + 34 }, { x: sx * (rw / 2 + 36), y: 18 },
        { x: sx * (rw / 2 + 70), y: rh / 2 + 4 }, { x: sx * (rw / 2 - 40), y: rh / 2 + 4 },
      ].map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
      g.fillStyle(0xa82a22, 1).fillPoints([
        { x: sx * (rw / 2 - 40), y: -rh / 2 + 40 }, { x: sx * (rw / 2 + 60), y: -rh / 2 + 40 }, { x: sx * (rw / 2 + 28), y: 18 },
        { x: sx * (rw / 2 + 60), y: rh / 2 - 2 }, { x: sx * (rw / 2 - 40), y: rh / 2 - 2 },
      ].map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
    }
    g.fillStyle(0x2b1d14, 1).fillRoundedRect(-rw / 2 - 5, -rh / 2 - 5, rw + 10, rh + 14, 30);
    g.fillStyle(0xf2c230, 1).fillRoundedRect(-rw / 2, -rh / 2, rw, rh, 26);
    g.fillStyle(0xe0301e, 1).fillRoundedRect(-rw / 2 + 10, -rh / 2 + 10, rw - 20, rh - 20, 20);
    g.fillStyle(0xffffff, 0.22).fillRoundedRect(-rw / 2 + 20, -rh / 2 + 16, rw - 40, 22, 11);
    c.add(g);
    const fl = this.add.image(-rw / 2 + 62, -6, 'flame').setScale(1.25);
    const fr = this.add.image(rw / 2 - 62, -6, 'flame').setScale(1.25).setFlipX(true);
    c.add([fl, fr]);
    for (const f of [fl, fr]) this.tweens.add({ targets: f, scaleY: 1.42, scaleX: 1.15, duration: 180, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(txt(this, 0, -26, 'STREAK!', 72, '#ffe14d'));
    const sub = this.add.container(0, 40);
    const sc = this.add.image(-112, 0, 'coin').setScale(1.4);
    const st = txt(this, 14, 0, `${STREAK_MULT}x COINS!`, 40, '#ffffff');
    sub.add([sc, st]);
    c.add(sub);
    this.tweens.add({ targets: c, scale: 1, angle: { from: -8, to: 0 }, duration: 520, ease: 'Back.easeOut' });
    this.tweens.add({ targets: sub, scale: 1.1, duration: 300, yoyo: true, repeat: 3, delay: 500 });
    this.confetti.explode(50, W / 2 - 300, 250);
    this.confetti.explode(50, W / 2 + 300, 250);
    const sparks = this.add.particles(W / 2, 250, 'spark', {
      lifespan: 900, speed: { min: 180, max: 420 }, scale: { start: 1.3, end: 0 }, rotate: { min: 0, max: 360 }, emitting: false,
    }).setDepth(301);
    sparks.explode(36);
    this.time.delayedCall(2100, () => {
      this.tweens.add({ targets: c, y: 190, alpha: 0, scale: 0.85, duration: 350, ease: 'Cubic.easeIn', onComplete: () => { c.destroy(); sparks.destroy(); } });
    });
  }

  /** Small gear (grown-ups): how picky the microphone is. */
  private gearButton(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(100);
    const g = this.add.graphics();
    g.fillStyle(0x2b1d14, 0.85).fillCircle(0, 0, 28);
    g.fillStyle(0xe8e0d0, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillCircle(Math.cos(a) * 15, Math.sin(a) * 15, 5);
    }
    g.fillCircle(0, 0, 14);
    g.fillStyle(0x2b1d14, 1).fillCircle(0, 0, 6);
    c.add(g);
    c.setSize(60, 60).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openMicSettings());
    return c;
  }

  private openMicSettings() {
    if (this.micSettings || this.settings || this.soundOut) return;
    if (this.listening) this.stopListening();
    const c = this.add.container(0, 0).setDepth(500);
    this.micSettings = c;
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive());
    c.add(panel(this, W / 2, H / 2, 720, 470));
    c.add(txt(this, W / 2, H / 2 - 190, 'Microphone', 40));
    c.add(txt(this, W / 2, H / 2 - 150, 'How picky should it be? (grown-ups)', 20, '#5a3418', { stroke: '#00000000', strokeThickness: 0 }));
    const opts: [Strictness, string, string][] = [
      ['forgiving', 'Forgiving', 'Close is good enough: "pig" for big, "and" for in'],
      ['normal', 'Normal', 'Small slips only: "kat" for cat, "hey" for he'],
      ['strict', 'Strict', 'Must hear the exact word (or one that sounds the same)'],
    ];
    const cur = getStrictness();
    opts.forEach(([id, name, desc], i) => {
      const y = H / 2 - 80 + i * 88;
      c.add(button(this, W / 2 - 230, y, 180, 62, name, id === cur ? COLORS.green : COLORS.grey, () => {
        setStrictness(id);
        c.destroy(); this.micSettings = undefined; this.openMicSettings();
      }, { fontSize: 24 }));
      c.add(this.add.text(W / 2 - 120, y, desc, { fontFamily: FONT, fontSize: '20px', color: '#2b1d14', resolution: 2, wordWrap: { width: 440 } }).setOrigin(0, 0.5));
    });
    c.add(txt(this, W / 2, H / 2 + 165, `Each tap listens for ${LISTEN_MS / 1000} seconds, then stops.`, 18, '#5a3418', { stroke: '#00000000', strokeThickness: 0 }));
    c.add(button(this, W / 2, H / 2 + 205, 200, 56, 'Done', COLORS.blue, () => { c.destroy(); this.micSettings = undefined; }, { fontSize: 26 }));
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
