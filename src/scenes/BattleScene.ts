import Phaser from 'phaser';
import { playMusic, playJingle, musicOn } from '../music/player';
import { W, H, txt, button, COLORS, goTo, fadeIn, panel, tiledGrass, scatterDecor, floatText, FONT , soundToggles } from '../ui';
import { sfx, unlockAudio } from '../audio';
import { save, persist, CASTLES, CastleDef, UNIT_ORDER, UnitType, unitStats, UNIT_DEFS } from '../state';
import { makeUnitVisual, animateWalk, UnitVisual, VisualKind, iconKey } from '../units';
import { defenderGear } from '../gear';

type BKind = 'wall' | 'tower' | 'keep' | 'storage';
const FIELD_BOTTOM = 612;
const CX = 640;
const CY = 320;
const RY = 0.7; // ellipse squash for the 3/4 view
const BATTLE_TIME = 180;

interface Ent {
  isUnit: boolean;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

interface Building extends Ent {
  isUnit: false;
  kind: BKind;
  img: Phaser.GameObjects.Image;
  hitH: number; // height above base where hits land
  fireT: number;
}

interface Unit extends Ent {
  isUnit: true;
  team: 'blue' | 'red';
  type: VisualKind;
  dmg: number;
  range: number;
  speed: number;
  cooldown: number;
  structureMult: number;
  v: UnitVisual;
  target: Ent | null;
  atkT: number;
  phase: number;
  facing: number;
  home?: { x: number; y: number };
  retargetT: number;
}

export class BattleScene extends Phaser.Scene {
  private castleIdx = 0;
  private def!: CastleDef;
  private buildings: Building[] = [];
  private units: Unit[] = [];
  private pool: Record<UnitType, number> = { knight: 0, archer: 0, spearman: 0, ram: 0, catapult: 0 };
  private selected: UnitType | null = null;
  private cards: Partial<Record<UnitType, { c: Phaser.GameObjects.Container; count: Phaser.GameObjects.Text; ring: Phaser.GameObjects.Graphics }>> = {};
  private bars!: Phaser.GameObjects.Graphics;
  private zone!: Phaser.GameObjects.Graphics;
  private zoneRX = 0;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  private chips!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private coins!: Phaser.GameObjects.Particles.ParticleEmitter;
  private splinters!: Phaser.GameObjects.Particles.ParticleEmitter;
  private timeLeft = BATTLE_TIME;
  private started = false;
  private over = false;
  private pctText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private hudStars: Phaser.GameObjects.Image[] = [];
  private starsEarned = 0;
  private hint?: Phaser.GameObjects.Container;
  private deployTimer?: Phaser.Time.TimerEvent;
  private demo = false;
  private lastCrumble = 0;
  private deployedAny = false;

  constructor() { super('Battle'); }

  init(data: { castle?: number; autodeploy?: boolean }) {
    this.castleIdx = Phaser.Math.Clamp(data.castle ?? 0, 0, CASTLES.length - 1);
    this.demo = !!data.autodeploy;
  }

  create() {
    fadeIn(this);
    playMusic('battle');
    soundToggles(this, 862, 40);
    this.def = CASTLES[this.castleIdx];
    this.buildings = []; this.units = []; this.cards = {}; this.hudStars = [];
    this.timeLeft = BATTLE_TIME; this.started = false; this.over = false; this.starsEarned = 0; this.deployedAny = false;
    this.pool = this.demo ? { knight: 10, archer: 8, spearman: 5, ram: 2, catapult: 2 } : { ...save.army };
    this.selected = UNIT_ORDER.find((t) => this.pool[t] > 0) ?? null;

    tiledGrass(this);
    const ringOuter = this.def.ring + (this.def.doubleWall ? 46 : 0);
    this.add.image(CX, CY + 10, 'dirt').setScale((ringOuter * 2 + 90) / 512, ((ringOuter * 2 + 90) * RY) / 360 * 1.05).setDepth(-9000);
    this.zoneRX = ringOuter + 50;
    const deco = new Phaser.Geom.Ellipse(CX, CY, this.zoneRX * 2 + 60, (this.zoneRX * 2 + 60) * RY);
    scatterDecor(this, 22, [new Phaser.Geom.Rectangle(0, FIELD_BOTTOM - 20, W, 200), new Phaser.Geom.Rectangle(0, 0, W, 70), new Phaser.Geom.Rectangle(CX - this.zoneRX - 40, CY - this.zoneRX * RY - 60, this.zoneRX * 2 + 80, this.zoneRX * 2 * RY + 100)] as any, 30 + this.castleIdx);
    void deco;

    this.zone = this.add.graphics().setDepth(-8000);
    this.drawZone(0xffffff, 0.35);

    this.buildCastle();
    this.makeEmitters();
    this.bars = this.add.graphics().setDepth(9800);
    this.buildHud();
    this.buildCards();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onFieldDown(p));
    this.input.on('pointerup', () => this.deployTimer?.remove());
    this.input.on('pointerupoutside', () => this.deployTimer?.remove());

    // Intro hint
    this.hint = this.add.container(W / 2, FIELD_BOTTOM - 50).setDepth(9900);
    const hb = this.add.graphics();
    hb.fillStyle(0x2b1d14, 0.8).fillRoundedRect(-300, -28, 600, 56, 28);
    this.hint.add([hb, txt(this, 0, 0, 'Pick a troop below, then tap the grass to attack!', 24, '#ffe14d')]);
    this.tweens.add({ targets: this.hint, y: FIELD_BOTTOM - 58, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    if (this.demo) this.autoDeploy();
  }

  // ------------------------------------------------------------- setup
  private drawZone(color: number, alpha: number) {
    const g = this.zone;
    g.clear();
    const n = 90;
    for (let i = 0; i < n; i += 2) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      g.lineStyle(4, color, alpha);
      g.lineBetween(CX + Math.cos(a0) * this.zoneRX, CY + Math.sin(a0) * this.zoneRX * RY, CX + Math.cos(a1) * this.zoneRX, CY + Math.sin(a1) * this.zoneRX * RY);
    }
  }

  private addBuilding(kind: BKind, x: number, y: number, key: string, scale: number, hp: number, r: number, hitH: number): Building {
    const img = this.add.image(x, y, key).setOrigin(0.5, kind === 'wall' ? 0.9 : 0.88).setScale(scale).setDepth(y);
    const b: Building = { isUnit: false, kind, x, y, r, hp, maxHp: hp, alive: true, img, hitH, fireT: Math.random() };
    this.buildings.push(b);
    return b;
  }

  private buildCastle() {
    const d = this.def;
    const rings = d.doubleWall ? [d.ring, d.ring + 46] : [d.ring];
    for (const R of rings) {
      const perim = Math.PI * (3 * (R + R * RY) - Math.sqrt((3 * R + R * RY) * (R + 3 * R * RY)));
      const n = Math.round(perim / 27);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        this.addBuilding('wall', CX + Math.cos(a) * R, CY + Math.sin(a) * R * RY + 8, 'wall', 1, d.wallHp, 15, 22);
      }
    }
    const ks = Math.min(1, 0.72 + this.castleIdx * 0.06);
    this.addBuilding('keep', CX, CY + 40, 'keep', ks, d.keepHp, 62 * ks, 90 * ks);
    for (let i = 0; i < d.towers; i++) {
      const a = (i / d.towers) * Math.PI * 2 + Math.PI / 4;
      this.addBuilding('tower', CX + Math.cos(a) * d.ring * 0.66, CY + Math.sin(a) * d.ring * 0.66 * RY + 30, 'tower', 0.82, d.towerHp, 26, 70);
    }
    for (let i = 0; i < d.huts; i++) {
      const a = (i / d.huts) * Math.PI * 2 + Math.PI / 4 + Math.PI / Math.max(1, d.towers || 2);
      this.addBuilding('storage', CX + Math.cos(a) * d.ring * 0.58, CY + Math.sin(a) * d.ring * 0.58 * RY + 20, 'storage', 0.9, 180 + this.castleIdx * 40, 24, 24);
    }
    // keep flag
    const flag = this.add.image(CX + 4, CY - 120 * ks, 'flag').setOrigin(0.1, 1).setTint(d.color).setDepth(CY + 41).setScale(0.9);
    this.tweens.add({ targets: flag, scaleX: 0.7, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    flag.setData('keepFlag', true);
    (this as any).keepFlag = flag;
    // defenders
    for (let i = 0; i < d.defenders; i++) {
      const a = (i / d.defenders) * Math.PI * 2;
      const x = CX + Math.cos(a) * 75, y = CY + 70 + Math.sin(a) * 40;
      this.spawnUnit('defender', 'red', x, y, false);
    }
  }

  private makeEmitters() {
    this.dust = this.add.particles(0, 0, 'puff', { lifespan: 750, speed: { min: 30, max: 140 }, scale: { start: 0.35, end: 1.1 }, alpha: { start: 0.75, end: 0 }, tint: 0xdcc9a0, emitting: false }).setDepth(9500);
    this.smoke = this.add.particles(0, 0, 'puff', { lifespan: 1800, speedY: { min: -90, max: -40 }, speedX: { min: -20, max: 20 }, scale: { start: 0.5, end: 1.8 }, alpha: { start: 0.55, end: 0 }, tint: [0x6a6a6a, 0x8a8a8a, 0x4a4a4a], emitting: false }).setDepth(9400);
    this.chips = this.add.particles(0, 0, 'chip', { lifespan: 900, speed: { min: 140, max: 340 }, angle: { min: 200, max: 340 }, gravityY: 900, rotate: { min: 0, max: 360 }, scale: { min: 0.7, max: 1.4 }, emitting: false }).setDepth(9600);
    this.splinters = this.add.particles(0, 0, 'wood', { lifespan: 800, speed: { min: 120, max: 300 }, angle: { min: 200, max: 340 }, gravityY: 900, rotate: { min: 0, max: 360 }, emitting: false }).setDepth(9600);
    this.sparks = this.add.particles(0, 0, 'spark', { lifespan: 260, speed: { min: 60, max: 220 }, scale: { start: 0.7, end: 0 }, blendMode: 'ADD', emitting: false }).setDepth(9700);
    this.coins = this.add.particles(0, 0, 'coin', { lifespan: 1000, speed: { min: 160, max: 320 }, angle: { min: 235, max: 305 }, gravityY: 700, scale: { start: 0.9, end: 0.6 }, emitting: false }).setDepth(9700);
  }

  private buildHud() {
    const g = this.add.graphics().setDepth(9900);
    g.fillStyle(0x2b1d14, 0.75).fillRoundedRect(16, 12, 380, 56, 28);
    g.fillStyle(0x2b1d14, 0.75).fillRoundedRect(W / 2 - 150, 12, 300, 56, 28);
    txt(this, 206, 40, `${this.castleIdx + 1}. ${this.def.name}`, 28).setDepth(9901);
    this.pctText = txt(this, W / 2 - 60, 40, '0%', 30, '#ffe14d').setDepth(9901);
    for (let i = 0; i < 3; i++) this.hudStars.push(this.add.image(W / 2 + 30 + i * 40, 40, 'star_empty').setScale(0.42).setDepth(9901));
    this.timerText = txt(this, W - 270, 40, '3:00', 30).setDepth(9901);
    button(this, W - 110, 40, 170, 56, 'End Battle', COLORS.red, () => this.endBattle(), { fontSize: 22 }).setDepth(9901);
  }

  private buildCards() {
    const g = this.add.graphics().setDepth(9900);
    g.fillStyle(0x2b1d14, 1).fillRect(0, FIELD_BOTTOM + 4, W, H - FIELD_BOTTOM);
    g.fillStyle(0x6b4423, 1).fillRect(0, FIELD_BOTTOM + 10, W, H - FIELD_BOTTOM);
    g.fillStyle(0x8a5a2e, 1).fillRect(0, FIELD_BOTTOM + 10, W, 8);
    let x = 80;
    for (const t of UNIT_ORDER) {
      if (this.pool[t] <= 0) continue;
      const c = this.add.container(x, FIELD_BOTTOM + 58).setDepth(9910);
      const ring = this.add.graphics();
      const bg = this.add.graphics();
      bg.fillStyle(0x2b1d14, 1).fillRoundedRect(-52, -44, 104, 92, 14);
      bg.fillStyle(0xf5e6c4, 1).fillRoundedRect(-48, -40, 96, 84, 12);
      const big = t === 'ram' || t === 'catapult';
      const icon = this.add.image(0, big ? 18 : 22, iconKey(t, 'blue')).setOrigin(0.5, big ? 0.9 : 0.92).setScale(big ? 0.85 : 1.05);
      const count = txt(this, 30, -28, `x${this.pool[t]}`, 22, '#ffffff');
      const name = txt(this, 0, 34, UNIT_DEFS[t].name.replace('Battering ', ''), 15);
      c.add([ring, bg, icon, count, name]);
      c.setSize(104, 92).setInteractive({ useHandCursor: true });
      c.on('pointerdown', (_p: any, _x: any, _y: any, ev: any) => { ev?.stopPropagation?.(); unlockAudio(); sfx.click(); this.select(t); });
      this.cards[t] = { c, count, ring };
      x += 120;
    }
    if (!Object.keys(this.cards).length) txt(this, W / 2, FIELD_BOTTOM + 58, 'No troops! Read words to train an army.', 26).setDepth(9910);
    this.refreshCards();
  }

  private select(t: UnitType) { this.selected = t; this.refreshCards(); }

  private refreshCards() {
    for (const t of UNIT_ORDER) {
      const card = this.cards[t];
      if (!card) continue;
      card.count.setText(`x${this.pool[t]}`);
      card.ring.clear();
      const sel = this.selected === t;
      if (sel) card.ring.fillStyle(0xffe14d, 1).fillRoundedRect(-58, -50, 116, 104, 18);
      card.c.y = FIELD_BOTTOM + (sel ? 52 : 58);
      card.c.setAlpha(this.pool[t] > 0 ? 1 : 0.4);
    }
  }

  // ------------------------------------------------------------- deploying
  private insideZone(x: number, y: number) {
    const dx = (x - CX) / this.zoneRX, dy = (y - CY) / (this.zoneRX * RY);
    return dx * dx + dy * dy < 1;
  }

  private onFieldDown(p: Phaser.Input.Pointer) {
    if (this.over || p.y > FIELD_BOTTOM - 6 || p.y < 76) return;
    unlockAudio();
    if (!this.tryDeploy(p.x, p.y)) return;
    this.deployTimer?.remove();
    this.deployTimer = this.time.addEvent({ delay: 160, loop: true, callback: () => { if (p.isDown) this.tryDeploy(p.x + Phaser.Math.Between(-10, 10), p.y + Phaser.Math.Between(-8, 8)); } });
  }

  private tryDeploy(x: number, y: number): boolean {
    if (!this.selected || this.pool[this.selected] <= 0) {
      this.selected = UNIT_ORDER.find((t) => this.pool[t] > 0) ?? null;
      this.refreshCards();
      if (!this.selected) return false;
    }
    if (this.insideZone(x, y)) {
      this.drawZone(0xff3b30, 0.9);
      this.time.delayedCall(500, () => this.drawZone(0xffffff, 0.35));
      floatText(this, x, y - 20, 'Outside the line!', '#ff8a7a', 22);
      return false;
    }
    const t = this.selected;
    this.pool[t]--;
    this.spawnUnit(t, 'blue', x, Math.min(y, FIELD_BOTTOM - 10), true);
    this.refreshCards();
    if (!this.started) { this.started = true; sfx.horn(); }
    this.deployedAny = true;
    if (this.hint) { this.hint.destroy(); this.hint = undefined; }
    return true;
  }

  private spawnUnit(type: VisualKind, team: 'blue' | 'red', x: number, y: number, drop: boolean): Unit {
    const v = makeUnitVisual(this, type, team, type === 'defender' ? 1.1 : 1, type === 'defender' ? defenderGear(this.castleIdx) : undefined);
    v.root.setPosition(x, y).setDepth(y);
    let st: { hp: number; dmg: number; range: number; speed: number; cooldown: number; structureMult: number };
    if (type === 'defender') {
      st = { hp: this.def.defenderHp, dmg: 9 + this.castleIdx * 2, range: 30, speed: 58, cooldown: 1000, structureMult: 1 };
    } else {
      st = unitStats(type as UnitType);
    }
    const u: Unit = {
      isUnit: true, team, type, x, y, r: type === 'ram' || type === 'catapult' ? 24 : 12,
      hp: st.hp, maxHp: st.hp, alive: true, dmg: st.dmg, range: st.range, speed: st.speed, cooldown: st.cooldown,
      structureMult: st.structureMult, v, target: null, atkT: Math.random() * 400, phase: Math.random() * 6, facing: 1, retargetT: 0,
    };
    if (team === 'red') { u.home = { x, y }; u.facing = -1; v.rig.scaleX = -1; }
    if (drop) {
      sfx.deploy();
      v.root.y = y - 70;
      v.root.setAlpha(0);
      this.tweens.add({ targets: v.root, y, alpha: 1, duration: 260, ease: 'Bounce.easeOut', onComplete: () => this.dust.explode(6, x, y) });
      u.atkT = 300;
    }
    this.units.push(u);
    return u;
  }

  private autoDeploy() {
    const spots: [number, number][] = [];
    for (let i = 0; i < 28; i++) {
      const a = Math.PI * (0.55 + (i % 7) * 0.12);
      const r = this.zoneRX + 30 + (i % 3) * 18;
      spots.push([CX + Math.cos(a) * r, Math.min(FIELD_BOTTOM - 20, CY + Math.sin(a) * r * RY + 10)]);
    }
    let k = 0;
    this.time.addEvent({
      delay: 90, repeat: 26, callback: () => {
        const t = UNIT_ORDER.find((u) => this.pool[u] > 0);
        if (!t) return;
        this.selected = t;
        const [x, y] = spots[k++ % spots.length];
        this.tryDeploy(x, y);
      },
    });
  }

  // ------------------------------------------------------------- combat helpers
  private dist(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.hypot(a.x - b.x, a.y - b.y); }

  private nearest<T extends Ent>(from: Unit, list: T[], maxD = Infinity): T | null {
    let best: T | null = null, bd = maxD;
    for (const e of list) {
      if (!e.alive) continue;
      const d = this.dist(from, e) - e.r;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  private chooseTarget(u: Unit): Ent | null {
    const alive = this.buildings.filter((b) => b.alive);
    const nonWall = alive.filter((b) => b.kind !== 'wall');
    const reds = this.units.filter((x) => x.alive && x.team === 'red');
    const blues = this.units.filter((x) => x.alive && x.team === 'blue');
    if (u.team === 'red') {
      const home = u.home!;
      let best: Unit | null = null, bd = 240;
      for (const b of blues) { const d = this.dist(home, b); if (d < bd) { bd = d; best = b; } }
      return best;
    }
    switch (u.type) {
      case 'ram': return this.nearest(u, alive.filter((b) => b.kind === 'wall')) || this.nearest(u, nonWall);
      case 'catapult': return this.nearest(u, nonWall.filter((b) => b.kind === 'tower')) || this.nearest(u, nonWall.filter((b) => b.kind === 'keep')) || this.nearest(u, nonWall);
      case 'spearman': return this.nearest(u, reds, 300) || this.nearest(u, nonWall);
      case 'archer': return this.nearest(u, reds, u.range) || this.nearest(u, nonWall);
      default: return this.nearest(u, reds, 110) || this.nearest(u, nonWall);
    }
  }

  private blockingWall(x: number, y: number, r: number): Building | null {
    for (const b of this.buildings) {
      if (!b.alive || b.kind !== 'wall') continue;
      if (Math.hypot(b.x - x, b.y - 8 - y) < b.r + r) return b;
    }
    return null;
  }

  private flash(obj: Phaser.GameObjects.Image, restoreTint?: number) {
    obj.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { if (!obj.active) return; obj.clearTint(); if (restoreTint) obj.setTint(restoreTint); });
  }

  private damage(e: Ent, amount: number, src?: Unit) {
    if (!e.alive || this.over) return;
    amount = Math.round(amount);
    e.hp -= amount;
    if (e.isUnit) {
      const u = e as Unit;
      this.flash(u.v.body);
      floatText(this, u.x, u.y - 46, `-${amount}`, u.team === 'blue' ? '#ff9a8a' : '#ffe14d', 18);
      if (u.hp <= 0) this.killUnit(u);
    } else {
      const b = e as Building;
      const low = b.hp < b.maxHp * 0.5;
      if (b.kind === 'wall' && low && b.img.texture.key !== 'wall_cracked') b.img.setTexture('wall_cracked');
      this.flash(b.img, low && b.kind !== 'wall' ? 0xbfae9a : undefined);
      floatText(this, b.x + Phaser.Math.Between(-12, 12), b.y - b.hitH - 20, `-${amount}`, '#ffe14d', b.kind === 'wall' ? 16 : 20);
      this.tweens.add({ targets: b.img, scaleY: b.img.scaleY * 0.96, duration: 50, yoyo: true });
      if (low && b.kind !== 'wall' && Math.random() < 0.3) this.smoke.explode(1, b.x, b.y - b.hitH);
      if (b.hp <= 0) this.destroyBuilding(b);
    }
    void src;
  }

  private killUnit(u: Unit) {
    u.alive = false;
    sfx.death();
    this.dust.explode(8, u.x, u.y);
    if (u.type === 'ram' || u.type === 'catapult') { this.splinters.explode(16, u.x, u.y - 20); this.smoke.explode(4, u.x, u.y - 20); }
    this.tweens.add({ targets: u.v.root, alpha: 0, y: u.y - 26, scaleX: 0.3, scaleY: 1.4, duration: 420, ease: 'Cubic.easeIn', onComplete: () => u.v.root.destroy() });
  }

  private destroyBuilding(b: Building) {
    b.alive = false;
    b.hp = 0;
    const big = b.kind === 'keep';
    if (b.kind === 'wall') {
      this.dust.explode(10, b.x, b.y - 10);
      this.chips.explode(8, b.x, b.y - 20);
      this.cameras.main.shake(120, 0.004);
      if (this.time.now - this.lastCrumble > 120) { sfx.crumble(); this.lastCrumble = this.time.now; }
      b.img.setTexture('rubble').setScale(0.7).setOrigin(0.5, 0.7).clearTint();
      b.img.setDepth(b.y - 30);
      return;
    }
    sfx.crumble();
    if (big) sfx.boom();
    this.cameras.main.shake(big ? 450 : 260, big ? 0.016 : 0.008);
    this.dust.explode(big ? 40 : 22, b.x, b.y - b.hitH * 0.6);
    this.chips.explode(big ? 34 : 18, b.x, b.y - b.hitH);
    if (b.kind === 'storage') { this.splinters.explode(14, b.x, b.y - 20); this.coins.explode(12, b.x, b.y - 30); floatText(this, b.x, b.y - 60, '+gold!', '#ffe14d', 26); sfx.coin(); }
    if (b.kind === 'tower') this.splinters.explode(10, b.x, b.y - b.hitH);
    // smoke column for a while
    const sm = this.add.particles(b.x, b.y - 20, 'puff', { lifespan: 1600, speedY: { min: -70, max: -30 }, speedX: { min: -15, max: 15 }, scale: { start: 0.4, end: 1.4 }, alpha: { start: 0.45, end: 0 }, tint: 0x555555, frequency: 120 }).setDepth(9300);
    this.time.delayedCall(big ? 4000 : 2400, () => sm.stop());
    // crumble down
    this.tweens.add({
      targets: b.img, scaleY: b.img.scaleY * 0.15, scaleX: b.img.scaleX * 1.1, duration: 420, ease: 'Cubic.easeIn',
      onComplete: () => {
        b.img.setTexture('rubble').setScale(big ? 2.4 : 1.3).setOrigin(0.5, 0.6).clearTint().setDepth(b.y - 40);
      },
    });
    if (big) {
      const flag = (this as any).keepFlag as Phaser.GameObjects.Image;
      this.tweens.add({ targets: flag, angle: 90, y: flag.y + 80, alpha: 0, duration: 600, ease: 'Cubic.easeIn' });
      floatText(this, W / 2, 200, 'KEEP DESTROYED!', '#ffe14d', 44);
    }
    this.updateProgress();
  }

  private projectile(key: string, x0: number, y0: number, target: Ent, dur: number, arc: number, onHit: () => void, opts: { spin?: boolean; shadow?: boolean } = {}) {
    const img = this.add.image(x0, y0, key).setDepth(9200);
    const sh = opts.shadow ? this.add.image(x0, y0 + arc * 0.2, 'shadow').setScale(0.4).setDepth(9100).setAlpha(0.6) : null;
    let tx = target.x, ty = target.y - (target.isUnit ? 16 : (target as Building).hitH * 0.6);
    let px = x0, py = y0;
    this.tweens.addCounter({
      from: 0, to: 1, duration: dur,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        if (target.alive && target.isUnit) { tx = target.x; ty = target.y - 16; }
        const x = x0 + (tx - x0) * t;
        const yl = y0 + (ty - y0) * t;
        const y = yl - arc * 4 * t * (1 - t);
        if (opts.spin) img.rotation += 0.25; else img.rotation = Math.atan2(y - py, x - px) + Math.PI;
        img.setPosition(x, y);
        if (opts.spin) img.setScale(1 + Math.sin(t * Math.PI) * 0.5);
        if (sh) sh.setPosition(x, yl + 10).setScale(0.3 + t * 0.3);
        px = x; py = y;
      },
      onComplete: () => { img.destroy(); sh?.destroy(); onHit(); },
    });
  }

  // ------------------------------------------------------------- attacks
  private attack(u: Unit, t: Ent) {
    const v = u.v;
    const mult = t.isUnit ? 1 : u.structureMult;
    const dmg = u.dmg * mult * Phaser.Math.FloatBetween(0.9, 1.1);
    const hitY = t.y - (t.isUnit ? 16 : (t as Building).hitH * 0.5);
    switch (u.type) {
      case 'knight':
      case 'defender': {
        const w = v.weapon!;
        w.setData('busy', true);
        this.tweens.chain({
          targets: w,
          tweens: [
            { angle: -70, duration: 150, ease: 'Quad.easeOut' },
            { angle: 125, duration: 90, ease: 'Quad.easeIn', onComplete: () => {
              if (!u.alive) return;
              sfx.sword();
              this.sparks.explode(5, (u.x + t.x) / 2, hitY);
              this.damage(t, dmg, u);
            } },
            { angle: v.restAngle, duration: 220, ease: 'Sine.easeOut' },
          ],
          onComplete: () => w.setData('busy', false),
        });
        this.tweens.add({ targets: v.rig, x: 6 * u.facing, duration: 90, delay: 150, yoyo: true });
        break;
      }
      case 'spearman': {
        const w = v.weapon!;
        w.setData('busy', true);
        this.tweens.chain({
          targets: w,
          tweens: [
            { angle: 90, x: 0, duration: 160 },
            { x: 26, duration: 90, ease: 'Quad.easeIn', onComplete: () => { if (!u.alive) return; sfx.hit(); this.sparks.explode(4, t.x - 10 * u.facing, hitY); this.damage(t, dmg, u); } },
            { x: w.getData('x0') ?? 8, angle: v.restAngle, duration: 260 },
          ],
          onComplete: () => w.setData('busy', false),
        });
        break;
      }
      case 'archer': {
        const w = v.weapon!;
        this.tweens.add({
          targets: w, scaleX: 0.7, duration: 220, yoyo: true,
          onYoyo: () => {
            if (!u.alive) return;
            sfx.arrow();
            const d = this.dist(u, t);
            this.projectile(v.gear.weapon >= 4 ? 'arrow_glow' : 'arrow', u.x + 14 * u.facing, u.y - 24, t, 180 + d * 1.6, 18 + d * 0.12, () => { if (t.alive) { this.damage(t, dmg, u); this.sparks.explode(2, t.x, hitY); } });
          },
        });
        break;
      }
      case 'ram': {
        const log = v.part!;
        this.tweens.chain({
          targets: log,
          tweens: [
            { x: -14, duration: 380, ease: 'Sine.easeOut' },
            { x: 24, duration: 110, ease: 'Quad.easeIn', onComplete: () => {
              if (!u.alive) return;
              sfx.boom();
              this.cameras.main.shake(140, 0.006);
              this.dust.explode(10, t.x - 10 * u.facing, t.y - 10);
              this.chips.explode(8, t.x, hitY);
              this.damage(t, dmg, u);
            } },
            { x: 4, duration: 300 },
          ],
        });
        break;
      }
      case 'catapult': {
        const arm = v.part!;
        this.tweens.chain({
          targets: arm,
          tweens: [
            { angle: v.restAngle - 15, duration: 300 },
            { angle: 45, duration: 140, ease: 'Back.easeIn', onComplete: () => {
              if (!u.alive) return;
              sfx.launch();
              const d = this.dist(u, t);
              const tx = t.x, ty = t.y;
              this.projectile('boulder', u.x - 8 * u.facing, u.y - 70, t, 600 + d * 1.4, 120 + d * 0.35, () => {
                sfx.boom();
                this.cameras.main.shake(220, 0.01);
                this.dust.explode(18, tx, ty - 10);
                this.chips.explode(14, tx, ty - 30);
                this.smoke.explode(3, tx, ty - 20);
                // splash damage
                for (const b of this.buildings) if (b.alive && this.dist(b, { x: tx, y: ty }) < 60 + b.r) this.damage(b, b === t ? dmg : dmg * 0.4, u);
                for (const r of this.units) if (r.alive && r.team === 'red' && this.dist(r, { x: tx, y: ty }) < 60) this.damage(r, dmg * 0.6, u);
              }, { spin: true, shadow: true });
            } },
            { angle: v.restAngle, duration: 700, ease: 'Sine.easeInOut' },
          ],
        });
        break;
      }
    }
  }

  // ------------------------------------------------------------- loop
  update(_time: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    if (!this.over && this.started) {
      this.timeLeft -= dt;
      const s = Math.max(0, Math.ceil(this.timeLeft));
      const label = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (this.timerText.text !== label) this.timerText.setText(label);
      if (this.timeLeft <= 0) this.endBattle();
    }

    for (const u of this.units) if (u.alive) this.stepUnit(u, dt);
    if (!this.over) this.stepDefenses(dt);
    this.separate();
    this.drawBars();

    if (!this.over && this.started) {
      const bluesAlive = this.units.some((u) => u.alive && u.team === 'blue');
      const poolLeft = UNIT_ORDER.some((t) => this.pool[t] > 0);
      if (!bluesAlive && !poolLeft) this.time.delayedCall(800, () => this.endBattle());
    }
  }

  private stepUnit(u: Unit, dt: number) {
    u.retargetT -= dt;
    if (!u.target || !u.target.alive || (u.retargetT <= 0 && !(u.target as Building).kind)) {
      u.target = this.over ? null : this.chooseTarget(u);
      u.retargetT = 0.6;
    }
    // Red guards go home when there is nobody to fight
    if (u.team === 'red' && !u.target && u.home) {
      const d = this.dist(u, u.home);
      if (d > 6) this.moveToward(u, u.home.x, u.home.y, dt, false);
      else { u.phase += dt * 6; animateWalk(u.v, u.phase, false); }
      u.v.root.setPosition(u.x, u.y).setDepth(u.y);
      return;
    }
    const t = u.target;
    if (!t || this.over) {
      u.phase += dt * 6;
      animateWalk(u.v, u.phase, false);
      return;
    }
    const d = this.dist(u, t) - t.r;
    u.atkT -= dt * 1000;
    if (d > u.range) {
      this.moveToward(u, t.x, t.y, dt, u.team === 'blue');
    } else {
      u.phase += dt * 6;
      animateWalk(u.v, u.phase, false);
      this.face(u, t.x);
      if (u.atkT <= 0) {
        u.atkT = u.cooldown * Phaser.Math.FloatBetween(0.9, 1.1);
        this.attack(u, t);
      }
    }
    u.v.root.setPosition(u.x, u.y).setDepth(u.y);
  }

  private face(u: Unit, tx: number) {
    const f = tx < u.x - 2 ? -1 : tx > u.x + 2 ? 1 : u.facing;
    if (f !== u.facing) {
      u.facing = f;
      this.tweens.add({ targets: u.v.rig, scaleX: f, duration: 120 });
    }
  }

  private moveToward(u: Unit, tx: number, ty: number, dt: number, wallsBlock: boolean) {
    const a = Math.atan2(ty - u.y, tx - u.x);
    const step = u.speed * dt;
    const nx = u.x + Math.cos(a) * step, ny = u.y + Math.sin(a) * step;
    if (wallsBlock) {
      const wall = this.blockingWall(nx, ny, u.r * 0.6);
      if (wall) {
        if (u.target !== wall) { u.target = wall; u.retargetT = 99; }
        u.phase += dt * 6;
        animateWalk(u.v, u.phase, false);
        return;
      }
    }
    u.x = nx; u.y = Math.min(ny, FIELD_BOTTOM - 8);
    this.face(u, tx);
    u.phase += dt * (u.type === 'ram' || u.type === 'catapult' ? 8 : 12);
    animateWalk(u.v, u.phase, true);
    if (Math.random() < dt * 3) this.dust.explode(1, u.x - u.facing * 8, u.y);
  }

  private separate() {
    const us = this.units.filter((u) => u.alive);
    for (let i = 0; i < us.length; i++) {
      for (let j = i + 1; j < us.length; j++) {
        const a = us[i], b = us[j];
        const min = (a.r + b.r) * 0.8;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < min * min) {
          const d = Math.sqrt(d2), push = (min - d) * 0.25;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          b.x += (dx / d) * push; b.y += (dy / d) * push;
        }
      }
    }
  }

  private stepDefenses(dt: number) {
    const blues = this.units.filter((u) => u.alive && u.team === 'blue');
    if (!blues.length) return;
    for (const b of this.buildings) {
      if (!b.alive || (b.kind !== 'tower' && !(b.kind === 'keep' && this.castleIdx >= 2))) continue;
      b.fireT -= dt;
      if (b.fireT > 0) continue;
      const range = b.kind === 'tower' ? 250 : 280;
      let tgt: Unit | null = null, bd = range;
      for (const u of blues) { const d = this.dist(b, u); if (d < bd) { bd = d; tgt = u; } }
      if (!tgt) { b.fireT = 0.3; continue; }
      const target = tgt;
      if (b.kind === 'tower') {
        b.fireT = 1.1;
        sfx.arrow();
        const sy = b.y - 92 * b.img.scaleY;
        this.projectile('arrow', b.x, sy, target, 200 + bd * 1.5, 20 + bd * 0.1, () => target.alive && this.damage(target, this.def.towerDmg));
      } else {
        b.fireT = 3.2;
        sfx.launch();
        const tx = target.x, ty = target.y;
        this.projectile('boulder', b.x, b.y - 140 * b.img.scaleY, target, 700 + bd, 140, () => {
          sfx.boom();
          this.cameras.main.shake(160, 0.006);
          this.dust.explode(14, tx, ty);
          for (const u of this.units) if (u.alive && u.team === 'blue' && this.dist(u, { x: tx, y: ty }) < 50) this.damage(u, 26 + this.castleIdx * 6);
        }, { spin: true, shadow: true });
      }
    }
  }

  private drawBars() {
    const g = this.bars;
    g.clear();
    const draw = (x: number, y: number, w: number, f: number, col: number) => {
      g.fillStyle(0x2b1d14, 0.9).fillRoundedRect(x - w / 2 - 2, y - 2, w + 4, 9, 4);
      g.fillStyle(col, 1).fillRoundedRect(x - w / 2, y, Math.max(1, w * f), 5, 2);
    };
    for (const b of this.buildings) if (b.alive && b.hp < b.maxHp) draw(b.x, b.y - b.hitH - (b.kind === 'wall' ? 18 : 40) * b.img.scaleY - 6, b.kind === 'wall' ? 26 : 56, b.hp / b.maxHp, 0xe0483a);
    for (const u of this.units) if (u.alive && u.hp < u.maxHp) draw(u.x, u.y - (u.r > 20 ? 66 : 54), 30, u.hp / u.maxHp, u.team === 'blue' ? 0x5cc33a : 0xe0483a);
  }

  // ------------------------------------------------------------- scoring
  private percent() {
    const nw = this.buildings.filter((b) => b.kind !== 'wall');
    return Math.round((nw.filter((b) => !b.alive).length / nw.length) * 100);
  }

  private computeStars() {
    const p = this.percent();
    const keep = this.buildings.find((b) => b.kind === 'keep')!;
    return (p >= 50 ? 1 : 0) + (!keep.alive ? 1 : 0) + (p >= 100 ? 1 : 0);
  }

  private updateProgress() {
    const p = this.percent();
    this.pctText.setText(`${p}%`);
    const s = this.computeStars();
    while (this.starsEarned < s) {
      const img = this.hudStars[this.starsEarned];
      img.setTexture('star');
      this.tweens.add({ targets: img, scale: { from: 1.2, to: 0.42 }, duration: 500, ease: 'Back.easeOut' });
      sfx.star(this.starsEarned);
      this.starsEarned++;
    }
    if (p >= 100) this.time.delayedCall(1200, () => this.endBattle());
  }

  private endBattle() {
    if (this.over) return;
    this.over = true;
    this.deployTimer?.remove();
    const stars = this.computeStars();
    const pct = this.percent();
    const win = stars > 0;
    const loot = Math.round(this.def.loot * (pct / 100)) + (win ? 20 : 0);
    // survivors + undeployed troops return to camp
    const back: Record<UnitType, number> = { ...this.pool };
    for (const u of this.units) if (u.alive && u.team === 'blue') back[u.type as UnitType]++;
    const returned = UNIT_ORDER.reduce((s, t) => s + back[t], 0);
    const prevStars = save.stars[this.castleIdx];
    const newlyUnlocked = win && prevStars === 0 && this.castleIdx < CASTLES.length - 1;
    if (!this.demo) {
      save.army = back;
      save.gold += loot;
      save.stars[this.castleIdx] = Math.max(prevStars, stars);
      persist();
    }
    this.time.delayedCall(700, () => this.showResult(win, stars, pct, loot, returned, newlyUnlocked));
  }

  private showResult(win: boolean, stars: number, pct: number, loot: number, returned: number, unlocked: boolean) {
    if (musicOn()) playJingle(win ? 'victory' : 'defeat'); else win ? sfx.victory() : sfx.defeat();
    const c = this.add.container(0, 0).setDepth(20000);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive());
    // rays
    if (win) {
      const rays = this.add.graphics({ x: W / 2, y: 220 });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        rays.fillStyle(0xfff3a0, 0.13).fillTriangle(0, 0, Math.cos(a) * 700, Math.sin(a) * 700, Math.cos(a + 0.18) * 700, Math.sin(a + 0.18) * 700);
      }
      this.tweens.add({ targets: rays, angle: 360, duration: 30000, repeat: -1 });
      c.add(rays);
    }
    c.add(panel(this, W / 2, 430, 640, 400));
    // ribbon
    const rb = this.add.graphics();
    const col = win ? 0xe0483a : 0x6b7a8a;
    rb.fillStyle(0x2b1d14, 1).fillRoundedRect(W / 2 - 284, 194, 568, 92, 20);
    rb.fillStyle(col, 1).fillRoundedRect(W / 2 - 280, 198, 560, 84, 18);
    rb.fillStyle(0xffffff, 0.25).fillRoundedRect(W / 2 - 270, 204, 540, 22, 10);
    c.add(rb);
    c.add(txt(this, W / 2, 240, win ? 'VICTORY!' : 'RETREAT!', 60, '#ffe14d'));
    for (let i = 0; i < 3; i++) {
      const sx = W / 2 - 110 + i * 110, sy = 120 - (i === 1 ? 20 : 0);
      const empty = this.add.image(sx, sy, 'star_empty').setScale(i === 1 ? 1.3 : 1.05);
      c.add(empty);
      if (i < stars) {
        const st = this.add.image(sx, sy, 'star').setScale(0).setAngle(-90);
        c.add(st);
        this.tweens.add({ targets: st, scale: i === 1 ? 1.3 : 1.05, angle: 0, duration: 450, delay: 400 + i * 450, ease: 'Back.easeOut', onStart: () => sfx.star(i) });
      }
    }
    c.add(txt(this, W / 2, 330, `${pct}% destroyed`, 34, '#ffffff'));
    const lootRow = this.add.container(W / 2, 390);
    lootRow.add(this.add.image(-90, 0, 'coin').setScale(1.8));
    const lootTxt = txt(this, 20, 0, '+0', 44, '#ffe14d');
    lootRow.add(lootTxt);
    c.add(lootRow);
    this.tweens.addCounter({ from: 0, to: loot, duration: 900, delay: 600, onUpdate: (tw) => lootTxt.setText(`+${Math.round(tw.getValue() ?? 0)}`), onComplete: () => sfx.coin() });
    const msg = this.demo ? 'Demo battle (progress not saved)'
      : unlocked ? `New castle unlocked: ${CASTLES[this.castleIdx + 1].name}!`
      : win ? 'Great attack, commander!' : 'Read more words to train a bigger army!';
    c.add(txt(this, W / 2, 450, `${returned} troop${returned === 1 ? '' : 's'} marched home`, 24, '#bfe3ff'));
    c.add(txt(this, W / 2, 492, msg, 26, unlocked ? '#bfffb0' : '#ffffff'));
    c.add(button(this, W / 2 - 200, 570, 180, 70, 'Map', COLORS.blue, () => goTo(this, 'Map'), { fontSize: 30 }));
    c.add(button(this, W / 2, 570, 180, 70, 'Camp', COLORS.purple, () => goTo(this, 'Camp'), { fontSize: 30 }));
    c.add(button(this, W / 2 + 200, 570, 180, 70, 'Read', COLORS.green, () => goTo(this, 'Read'), { fontSize: 30 }));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300 });
    if (win) {
      const conf = this.add.particles(0, 0, 'puff', { lifespan: 2400, speedY: { min: 80, max: 200 }, speedX: { min: -60, max: 60 }, x: { min: 0, max: W }, y: -20, scale: { start: 0.22, end: 0.12 }, tint: [0xff5b6e, 0xffe14d, 0x5cc33a, 0x3d8be0, 0xb36bff], frequency: 30, quantity: 2 }).setDepth(20001);
      this.time.delayedCall(2500, () => conf.stop());
    }
  }
}

export { FONT };
