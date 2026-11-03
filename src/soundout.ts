// "Sound it out" overlay: the word split into phonics chunks, one big colored tile per chunk.
// Tap a tile to hear its sound; "Blend it" plays the sounds slowly, then faster, then the word.
import Phaser from 'phaser';
import { W, H, txt, button, panel, COLORS, READ_FONT, FONT, Button } from './ui';
import { breakdown, chunkClip, Chunk, PHONEMES } from './data/phonics';
import { playSound, playWord, blend, stopBlend, preload } from './phonics-audio';

const TILE_COLORS = [0xff7b7b, 0xffb547, 0xffe066, 0x8ce07a, 0x6cc3ff, 0xb79cff, 0xff9ccf, 0x5fe0c8];
const COMBO_LABEL: Record<string, string> = {
  'a+ng+k': '/ank/', 'i+ng+k': '/ink/', 'i+ng': '/ing/', 'aw+l': '/all/', 'igh+n+d': '/ind/',
  'w+u+n': '/wun/', 'w+u': '/wu/',
};
const KIND_LABEL: Record<string, string> = {
  digraph: '2 letters, 1 sound', double: 'double = 1 sound', vowelTeam: 'vowel team', rVowel: 'bossy r',
  ending: 'word chunk', silent: 'silent',
};

const short = (id: string) => (PHONEMES[id]?.say ?? `/${id}/`).split(' (')[0];
export function soundLabel(c: Chunk) {
  if (!c.sounds.length) return c.kind === 'magicE' ? 'magic e' : 'silent';
  const id = chunkClip(c);
  return COMBO_LABEL[id] ?? c.sounds.map(short).join(' + ');
}

function chunksFor(word: string): Chunk[] {
  return breakdown(word) ?? [...word].map((ch) => ({ text: ch, sounds: PHONEMES[ch] ? [ch] : [], kind: 'single', heart: false, blend: -1, linkTo: -1 } as Chunk));
}

interface Tile { c: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics; w: number; chunk: Chunk; color: number; x: number }

export class SoundOut {
  readonly root: Phaser.GameObjects.Container;
  private tiles: Tile[] = [];
  private caption: Phaser.GameObjects.Text;
  private defaultCaption: string;
  private blendBtn: Button;
  private blending = false;
  private chunks: Chunk[];
  private keyHandler = () => this.close();

  constructor(private scene: Phaser.Scene, readonly word: string, private opts: { onClose?: () => void; onRead?: () => void } = {}) {
    this.chunks = chunksFor(word);
    preload(word, this.chunks.filter((c) => c.sounds.length).map(chunkClip));
    const root = (this.root = scene.add.container(0, 0).setDepth(400));
    root.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive());
    root.add(panel(scene, W / 2, 372, 1160, 600));
    root.add(txt(scene, W / 2, 112, 'Sound it out!', 44, '#ffe14d'));
    root.add(button(scene, W / 2 + 530, 106, 70, 62, 'X', COLORS.red, () => this.close(), { fontSize: 30 }));

    this.buildTiles();

    const hearts = this.chunks.filter((c) => c.heart);
    this.defaultCaption = 'Tap each tile to hear its sound!';
    const capY = 512;
    if (hearts.length) {
      const parts = hearts.map((c) => (c.sounds.length ? `"${c.text}" says ${soundLabel(c)}` : `"${c.text}" is silent`));
      this.defaultCaption = `Heart part${hearts.length > 1 ? 's' : ''}: ${parts.join(', ')} - learn it by heart!`;
    }
    this.caption = scene.add.text(W / 2, capY, this.defaultCaption, {
      fontFamily: FONT, fontSize: '28px', color: '#5a3418', align: 'center', resolution: 2, wordWrap: { width: 1000 },
    }).setOrigin(0.5);
    root.add(this.caption);
    if (hearts.length) {
      const hx = W / 2 - this.caption.width / 2 - 30;
      root.add(scene.add.image(hx, capY, 'heart').setScale(0.6));
    }

    this.blendBtn = button(scene, W / 2 - 300, 604, 260, 84, 'Blend it', COLORS.green, () => this.blend(), { icon: 'speaker', fontSize: 32 });
    root.add(this.blendBtn);
    root.add(button(scene, W / 2, 604, 250, 84, 'Hear word', COLORS.blue, () => { stopBlend(); this.wave(); playWord(word); }, { icon: 'speaker', fontSize: 30 }));
    root.add(button(scene, W / 2 + 300, 604, 260, 84, 'Read it!', COLORS.orange, () => { this.close(); this.opts.onRead?.(); }, { icon: 'mic', fontSize: 32, iconScale: 0.8 }));

    root.setAlpha(0);
    scene.tweens.add({ targets: root, alpha: 1, duration: 180 });
    this.tiles.forEach((t, i) => {
      t.c.setScale(0.3);
      scene.tweens.add({ targets: t.c, scale: 1, duration: 340, delay: 80 + i * 70, ease: 'Back.easeOut' });
      if (t.chunk.heart) scene.tweens.add({ targets: t.c, angle: { from: -3, to: 3 }, duration: 260, yoyo: true, repeat: 3, delay: 600 });
    });
    scene.input.keyboard?.on('keydown-ESC', this.keyHandler);
  }

  private buildTiles() {
    const s = this.scene;
    const row = s.add.container(W / 2, 300);
    this.root.add(row);
    const TH = 180, GAP = 26, BLEND_GAP = 8;
    // measure
    const texts = this.chunks.map((ch) => s.add.text(0, 0, ch.text, { fontFamily: READ_FONT, fontSize: '120px', color: '#2b1d14', fontStyle: 'bold', resolution: 2 }).setOrigin(0.5, 0.55));
    const widths = texts.map((t) => Math.max(120, t.width + 50));
    const xs: number[] = []; let x = 0;
    this.chunks.forEach((ch, i) => {
      if (i > 0) x += ch.blend >= 0 && ch.blend === this.chunks[i - 1].blend ? BLEND_GAP : GAP;
      xs.push(x + widths[i] / 2); x += widths[i];
    });
    const total = x;
    const fit = Math.min(1, 1060 / total);
    row.setScale(fit);
    const ox = -total / 2;
    const over = s.add.graphics(); // arcs + blend brackets drawn under the tiles
    row.add(over);
    let colorIdx = 0;
    this.chunks.forEach((ch, i) => {
      const w = widths[i], cx = ox + xs[i];
      const silent = !ch.sounds.length;
      const color = silent ? 0xd9d4cc : TILE_COLORS[colorIdx++ % TILE_COLORS.length];
      const c = s.add.container(cx, 0);
      const bg = s.add.graphics();
      this.drawTile(bg, w, TH, color, false, ch.heart);
      c.add(bg);
      const t = texts[i];
      if (silent) t.setColor('#9a8f84');
      c.add(t);
      if (ch.heart) c.add(s.add.image(w / 2 - 14, -TH / 2 + 8, 'heart').setScale(0.75));
      if (ch.kind === 'magicE' && silent) c.add(s.add.image(w / 2 - 14, -TH / 2 + 8, 'star').setScale(0.42));
      c.setSize(w, TH).setInteractive({ useHandCursor: true });
      c.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev?: Phaser.Types.Input.EventData) => { ev?.stopPropagation(); this.tapTile(i); });
      row.add(c);
      // label under the tile
      const lab = txt(s, cx, TH / 2 + 34, soundLabel(ch), 26);
      row.add(lab);
      const kind = ch.heart ? 'heart part' : ch.blend >= 0 ? '' : ch.kind === 'magicE' ? (silent ? 'makes the vowel long' : 'says its name') : KIND_LABEL[ch.kind] ?? '';
      if (kind) row.add(s.add.text(cx, TH / 2 + 70, kind, { fontFamily: FONT, fontSize: '20px', color: '#8a5a2e', resolution: 2 }).setOrigin(0.5));
      this.tiles.push({ c, bg, w, chunk: ch, color, x: cx });
    });
    // blend brackets: one bar under each group of blended tiles
    const groups = new Map<number, number[]>();
    this.chunks.forEach((ch, i) => { if (ch.blend >= 0) groups.set(ch.blend, [...(groups.get(ch.blend) ?? []), i]); });
    for (const idx of groups.values()) {
      const a = this.tiles[idx[0]], b = this.tiles[idx[idx.length - 1]];
      const x0 = a.x - a.w / 2 + 10, x1 = b.x + b.w / 2 - 10, y = TH / 2 + 58;
      over.lineStyle(6, 0x2f9e44, 1).beginPath().moveTo(x0, y - 10).lineTo(x0, y).lineTo(x1, y).lineTo(x1, y - 10).strokePath();
      row.add(s.add.text((x0 + x1) / 2, y + 17, 'blend', { fontFamily: FONT, fontSize: '22px', color: '#2f9e44', resolution: 2 }).setOrigin(0.5));
    }
    // magic-e arcs from the vowel to the final e
    this.chunks.forEach((ch, i) => {
      if (ch.linkTo < 0) return;
      const a = this.tiles[i], b = this.tiles[ch.linkTo];
      const y0 = -TH / 2 - 6, ctrl = -TH / 2 - 80;
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a.x, y0), new Phaser.Math.Vector2((a.x + b.x) / 2, ctrl), new Phaser.Math.Vector2(b.x, y0));
      over.lineStyle(8, 0x2b1d14, 1); curve.draw(over, 48);
      over.lineStyle(5, 0xb36bff, 1); curve.draw(over, 48);
      over.fillStyle(0xb36bff, 1).fillTriangle(a.x - 12, y0 - 14, a.x + 12, y0 - 14, a.x, y0 + 2);
      const star = s.add.image((a.x + b.x) / 2, (y0 + ctrl) / 2, 'star').setScale(0.45);
      row.add(star);
      s.tweens.add({ targets: star, angle: 360, duration: 4000, repeat: -1 });
    });
  }

  private drawTile(g: Phaser.GameObjects.Graphics, w: number, h: number, color: number, lit: boolean, heart: boolean) {
    g.clear();
    const r = 26;
    if (lit) g.fillStyle(0xffffff, 0.9).fillRoundedRect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 30, r + 10);
    g.fillStyle(0x2b1d14, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 16, r + 4);
    g.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(25).color, 1).fillRoundedRect(-w / 2, -h / 2 + 8, w, h, r);
    g.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(-w / 2 + 10, -h / 2 + 8, w - 20, 26, 12);
    if (heart) g.lineStyle(6, 0xe0304a, 1).strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, r - 6);
  }

  private light(i: number, on: boolean) {
    const t = this.tiles[i];
    this.drawTile(t.bg, t.w, 180, t.color, on, t.chunk.heart);
    this.scene.tweens.killTweensOf(t.c);
    this.scene.tweens.add({ targets: t.c, scale: on ? 1.14 : 1, y: on ? -10 : 0, duration: on ? 120 : 160, ease: 'Back.easeOut' });
  }

  private tapTile(i: number) {
    if (this.blending) return;
    const t = this.tiles[i], ch = t.chunk;
    if (!ch.sounds.length) {
      this.scene.tweens.add({ targets: t.c, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => t.c.setAngle(0) });
      const vowel = this.chunks.find((c) => c.linkTo === i);
      this.say(vowel ? `Magic e is quiet, but it makes "${vowel.text}" say its name: ${soundLabel(vowel)}!` : `"${ch.text}" is silent here - we don't say it.`);
      return;
    }
    this.light(i, true);
    this.scene.time.delayedCall(260, () => this.light(i, false));
    if (ch.heart) this.say(`Heart part! Here "${ch.text}" says ${soundLabel(ch)}.`);
    else if (ch.linkTo >= 0) this.say(`The magic e makes "${ch.text}" say its name: ${soundLabel(ch)}.`);
    else this.say(`"${ch.text}" says ${soundLabel(ch)}`);
    playSound(chunkClip(ch));
  }

  private say(s: string) { this.caption.setText(s); }

  private wave() {
    this.tiles.forEach((t, i) => this.scene.tweens.add({ targets: t.c, y: -22, duration: 140, delay: i * 60, yoyo: true, ease: 'Sine.easeOut' }));
  }

  async blend() {
    if (this.blending) return;
    this.blending = true;
    this.blendBtn.setEnabled(false);
    let last = -1;
    await blend(this.word, this.chunks.map((c) => (c.sounds.length ? chunkClip(c) : null)), (i, pass) => {
      if (!this.root.active) return;
      if (last >= 0) this.light(last, false);
      last = i ?? -1;
      if (i === null) return;
      if (i === -1) { this.say(`${this.word}!`); this.wave(); last = -1; return; }
      this.say(pass === 0 ? 'Slowly...' : 'Faster!');
      this.light(i, true);
    });
    if (!this.root.active) return;
    if (last >= 0) this.light(last, false);
    this.blending = false;
    this.blendBtn.setEnabled(true);
    this.scene.time.delayedCall(1200, () => this.root.active && !this.blending && this.say(this.defaultCaption));
  }

  close() {
    if (!this.root.active) return;
    stopBlend();
    this.scene.input.keyboard?.off('keydown-ESC', this.keyHandler);
    this.root.destroy();
    this.opts.onClose?.();
  }
}
