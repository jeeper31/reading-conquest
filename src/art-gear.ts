// Soldiers drawn per armor tier, weapons per weapon tier, siege engines per siege tier.
// Everything is canvas-drawn at boot, like the rest of the art (see art.ts).
import Phaser from 'phaser';
import { tex, rr, fillStroke, circle, ellipse, lin, rad, OUT, TEAM, type Team } from './art';
import { ARMOR_BULK } from './gear';

type Ctx = CanvasRenderingContext2D;
export type SoldierKind = 'knight' | 'archer' | 'spearman' | 'defender';

export const ARMOR_TIERS = 6;
export const WEAPON_TIERS = 6;
export const SIEGE_TIERS = 5;

// Body texture: 64x72, feet anchor at (32, 66).
export const BODY_W = 64, BODY_H = 72, BODY_AX = 32, BODY_AY = 66;
export const BODY_ORIGIN = { x: BODY_AX / BODY_W, y: BODY_AY / BODY_H };

export const bodyKey = (kind: SoldierKind, team: Team, armor: number) => `${kind}_${team}_a${armor}`;
export const weaponKey = (kind: 'knight' | 'archer' | 'spearman', tier: number) => `wpn_${kind}_${tier}`;
export const siegeKey = (part: 'ram_body' | 'ram_log' | 'cata_body' | 'cata_arm', tier: number) => `${part}_${tier}`;

/** Where the grip of each weapon texture is (as origin fractions). */
export const WEAPON_ORIGIN: Record<'knight' | 'archer' | 'spearman', { x: number; y: number }[]> = {
  knight: [{ x: 0.5, y: 31 / 36 }, { x: 0.5, y: 25 / 30 }, { x: 0.5, y: 35.5 / 40 }, { x: 0.5, y: 50 / 58 }, { x: 0.5, y: 54.5 / 66 }, { x: 0.5, y: 60 / 74 }],
  spearman: [{ x: 0.5, y: 0.74 }, { x: 0.5, y: 0.74 }, { x: 0.5, y: 0.75 }, { x: 0.5, y: 52 / 70 }, { x: 0.5, y: 58 / 78 }, { x: 0.5, y: 62 / 84 }],
  archer: [{ x: 3.5 / 14, y: 0.5 }, { x: 0.3, y: 0.5 }, { x: 5 / 22, y: 0.5 }, { x: 5 / 24, y: 0.5 }, { x: 6 / 28, y: 0.5 }, { x: 7 / 32, y: 0.5 }],
};

/** Hand position for the weapon (rig coords). Bigger armor = wider shoulders = hand further out. */
export function handPos(kind: SoldierKind, armor: number) {
  const b = ARMOR_BULK[armor] ?? 1;
  if (kind === 'archer') return { x: 12 + (b - 1) * 14, y: -22 - (b - 1) * 12 };
  if (kind === 'spearman') return { x: 8 + (b - 1) * 12, y: -18 - (b - 1) * 10 };
  return { x: 10 + (b - 1) * 14, y: -20 - (b - 1) * 10 };
}

// ------------------------------------------------------------ palettes
const STEEL = (c: Ctx, y0: number, y1: number) => lin(c, y0, y1, '#f4f7fa', '#8d99a8');
const IRON = (c: Ctx, y0: number, y1: number) => lin(c, y0, y1, '#c3cad2', '#6f7984');
const GOLD = (c: Ctx, y0: number, y1: number) => lin(c, y0, y1, '#fff3a0', '#c98a10');
const LEATHER = (c: Ctx, y0: number, y1: number) => lin(c, y0, y1, '#c58a52', '#7a4a22');
/** Dragon Scale (tier 5): dark crimson metal. */
const DRAGON = (c: Ctx, y0: number, y1: number) => lin(c, y0, y1, '#ff7a5a', '#5a0f1e');
/** Top metal: royal gold at tier 4, dragon scale at tier 5. */
const TOP = (c: Ctx, a: number, y0: number, y1: number) => (a >= 5 ? DRAGON(c, y0, y1) : GOLD(c, y0, y1));
function horns(c: Ctx, hx: number, hy: number, col = '#fff3dc', size = 1) {
  for (const s of [-1, 1]) {
    const x = hx + s * 8;
    c.beginPath(); c.moveTo(x - 2.5 * s, hy - 7);
    c.quadraticCurveTo(x + s * 9 * size, hy - 10, x + s * 7 * size, hy - 20 * size);
    c.quadraticCurveTo(x + s * 3, hy - 12, x + 2.5 * s, hy - 5);
    c.closePath(); fillStroke(c, lin(c, hy - 20 * size, hy - 5, col, '#b8a07a'), 1.6);
  }
}
function scales(c: Ctx, x0: number, y0: number, w: number, h: number) {
  c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  c.strokeStyle = 'rgba(40,0,10,0.45)'; c.lineWidth = 0.9;
  for (let y = y0 + 2; y < y0 + h + 2; y += 3) for (let x = x0 + ((y * 7) % 3); x < x0 + w + 2; x += 3.4) { c.beginPath(); c.arc(x, y, 1.7, 0, Math.PI); c.stroke(); }
  c.restore();
}
/** Little extras that make each enemy army look like its kingdom. */
function teamAccent(c: Ctx, team: Team, a: number) {
  const hx = 2, hy = -32;
  if (team === 'ice') { // icicle crown
    for (const [dx, h] of [[-6, 7], [0, 11], [6, 7]] as const) {
      c.beginPath(); c.moveTo(hx + dx - 3, hy - 10); c.lineTo(hx + dx, hy - 10 - h); c.lineTo(hx + dx + 3, hy - 10); c.closePath();
      fillStroke(c, lin(c, hy - 10 - h, hy - 10, '#ffffff', '#7fd8f5'), 1.3);
    }
  } else if (team === 'sand') { // headscarf tail blowing behind
    c.beginPath(); c.moveTo(hx - 9, hy - 6); c.quadraticCurveTo(hx - 20, hy - 4, hx - 24, hy + 4); c.quadraticCurveTo(hx - 17, hy + 2, hx - 9, hy + 3); c.closePath();
    fillStroke(c, lin(c, hy - 6, hy + 4, '#fff3d0', '#d8b070'), 1.5);
    c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.arc(hx, hy - 1, 11.5, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.strokeStyle = '#fff3d0'; c.lineWidth = 2; c.stroke();
  } else if (team === 'shadow' && a < 5) {
    horns(c, hx, hy, '#4a2a5a', 0.9);
  }
}
const HAIR: Record<SoldierKind, string> = { knight: '#7a4a22', archer: '#d8762e', spearman: '#3a2616', defender: '#3a2616' };

function eyes(c: Ctx, hx: number, hy: number) {
  c.fillStyle = OUT;
  circle(c, hx + 3, hy + 1, 1.6); c.fill();
  circle(c, hx + 7.5, hy + 1, 1.6); c.fill();
}
function smile(c: Ctx, hx: number, hy: number) {
  c.strokeStyle = OUT; c.lineWidth = 1.3;
  c.beginPath(); c.arc(hx + 5.5, hy + 4.5, 2.2, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
}
function face(c: Ctx, hx: number, hy: number) {
  circle(c, hx, hy, 10);
  fillStroke(c, rad(c, hx, hy, 11, '#ffdcb8', '#e9a87c'));
}
function hair(c: Ctx, hx: number, hy: number, col: string) {
  c.beginPath();
  c.moveTo(hx - 10.5, hy + 1);
  c.arc(hx, hy, 10.5, Math.PI, Math.PI * 1.95);
  c.lineTo(hx + 6, hy - 5);
  c.lineTo(hx + 2, hy - 3);
  c.lineTo(hx - 1, hy - 6);
  c.lineTo(hx - 4, hy - 3);
  c.lineTo(hx - 8, hy + 2);
  c.closePath();
  fillStroke(c, col, 2);
  // tufts sticking up (a bit scruffy)
  c.strokeStyle = col; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(hx - 2, hy - 10); c.lineTo(hx - 4, hy - 14); c.moveTo(hx + 2, hy - 10); c.lineTo(hx + 3, hy - 14); c.stroke();
}
function moustache(c: Ctx, hx: number, hy: number) {
  c.strokeStyle = '#6b3d1c'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(hx + 2, hy + 6); c.quadraticCurveTo(hx + 5, hy + 4, hx + 9, hy + 6); c.stroke();
}
function plume(c: Ctx, x: number, y: number, color: string, big: boolean) {
  const k = big ? 1.5 : 1;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x - 12 * k, y - 10 * k, x - 16 * k, y + 2 * k);
  c.quadraticCurveTo(x - 8 * k, y - 3 * k, x, y);
  fillStroke(c, color, 2);
  if (big) {
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - 2, y - 2); c.quadraticCurveTo(x - 10, y - 10, x - 15, y - 1); c.stroke();
  }
}
function gem(c: Ctx, x: number, y: number, r: number, col: string) {
  circle(c, x, y, r); fillStroke(c, col, 1.2);
  c.fillStyle = 'rgba(255,255,255,0.8)'; circle(c, x - r * 0.35, y - r * 0.35, r * 0.35); c.fill();
}
function rivets(c: Ctx, pts: [number, number][]) {
  c.fillStyle = 'rgba(43,29,20,0.55)';
  for (const [x, y] of pts) { circle(c, x, y, 0.9); c.fill(); }
}

// ------------------------------------------------------------ heads
function drawHead(c: Ctx, kind: SoldierKind, team: Team, a: number) {
  const T = TEAM[team];
  const hx = 2, hy = -32;
  if (a === 0) {
    face(c, hx, hy); hair(c, hx, hy, HAIR[kind]); eyes(c, hx, hy); smile(c, hx, hy);
    if (kind === 'spearman') moustache(c, hx, hy);
    return;
  }
  if (kind === 'archer') {
    face(c, hx, hy);
    const hood = a >= 5 ? DRAGON(c, hy - 13, hy + 5) : a >= 4 ? lin(c, hy - 13, hy + 5, T.light, T.dark) : lin(c, hy - 13, hy + 5, '#5fb04a', '#2f6b25');
    c.beginPath();
    c.arc(hx, hy - 1, 12, Math.PI * 0.85, Math.PI * 2.15);
    c.quadraticCurveTo(hx + 12, hy + 6, hx + 6, hy + 4);
    c.lineTo(hx - 6, hy + 4);
    c.quadraticCurveTo(hx - 12, hy + 6, hx - 11, hy + 4);
    c.closePath();
    fillStroke(c, hood);
    if (a === 2) { // chain coif ring around the face
      ellipse(c, hx + 3, hy + 1, 7.5, 6); fillStroke(c, IRON(c, hy - 6, hy + 7), 1.5);
    }
    c.fillStyle = '#ffdcb8'; ellipse(c, hx + 3, hy + 1, 6, 4.5); c.fill();
    eyes(c, hx - 1, hy);
    if (a === 3) { // steel cap on top of the hood
      c.beginPath(); c.arc(hx, hy - 3, 11, Math.PI * 1.02, Math.PI * 1.98); c.closePath();
      fillStroke(c, STEEL(c, hy - 14, hy - 3), 2);
      c.strokeStyle = 'rgba(43,29,20,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx, hy - 14); c.lineTo(hx, hy - 3); c.stroke();
    }
    if (a >= 4) { // gold circlet + feather
      c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.arc(hx, hy - 1, 12, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      c.strokeStyle = '#ffd84a'; c.lineWidth = 2.4; c.beginPath(); c.arc(hx, hy - 1, 12, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      gem(c, hx + 5, hy - 12, 2.2, '#5ff0ff');
      c.beginPath(); c.moveTo(hx - 8, hy - 9); c.quadraticCurveTo(hx - 20, hy - 22, hx - 6, hy - 25); c.quadraticCurveTo(hx - 10, hy - 16, hx - 8, hy - 9);
      fillStroke(c, a >= 5 ? lin(c, hy - 25, hy - 9, '#fff2a0', '#ff4a1a') : lin(c, hy - 25, hy - 9, '#ffffff', '#ffd84a'), 1.5);
      if (a >= 5) horns(c, hx, hy, '#fff3dc', 0.75);
    }
    return;
  }
  if (kind === 'spearman') {
    face(c, hx, hy); eyes(c, hx, hy + 2); moustache(c, hx, hy);
    if (a === 1) {
      c.beginPath(); c.arc(hx, hy, 11, Math.PI, Math.PI * 2); c.closePath();
      fillStroke(c, LEATHER(c, hy - 11, hy));
      c.fillStyle = T.main; c.fillRect(hx - 10.5, hy - 3, 21, 3);
    } else if (a === 2) { // kettle hat: wide brim
      c.beginPath(); c.arc(hx, hy - 1, 10, Math.PI, Math.PI * 2); c.closePath(); fillStroke(c, IRON(c, hy - 11, hy), 2);
      ellipse(c, hx, hy - 1, 15, 3.2); fillStroke(c, IRON(c, hy - 4, hy + 2), 2);
    } else { // a=3 steel sallet w/ cheek guard, a=4 gold winged helm
      const f = a >= 4 ? TOP(c, a, hy - 12, hy + 6) : STEEL(c, hy - 12, hy + 6);
      c.beginPath(); c.moveTo(hx - 12, hy + 3); c.arc(hx, hy - 1, 11.5, Math.PI * 0.98, Math.PI * 2.02); c.lineTo(hx + 12, hy - 1);
      c.lineTo(hx + 3, hy - 1); c.lineTo(hx + 1, hy + 7); c.lineTo(hx - 6, hy + 8); c.closePath();
      fillStroke(c, f, 2.2);
      c.strokeStyle = 'rgba(43,29,20,0.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx - 10, hy - 2); c.lineTo(hx + 11, hy - 2); c.stroke();
      if (a === 3) plume(c, hx - 2, hy - 12, T.main, false);
      else if (a >= 5) { horns(c, hx, hy); gem(c, hx, hy - 8, 2.4, '#ffb03a'); }
      else {
        for (const s of [-1, 1]) { // little wings
          c.beginPath(); const wx = hx + s * 9;
          c.moveTo(wx, hy - 5); c.quadraticCurveTo(wx + s * 10, hy - 18, wx + s * 4, hy - 20); c.quadraticCurveTo(wx + s * 2, hy - 12, wx, hy - 5);
          fillStroke(c, lin(c, hy - 20, hy - 5, '#ffffff', '#d6e2ee'), 1.6);
        }
        gem(c, hx, hy - 8, 2.4, T.main);
      }
    }
    return;
  }
  // knight / defender
  face(c, hx, hy);
  if (a === 1) { // leather cap
    hair(c, hx, hy, HAIR[kind]); eyes(c, hx, hy); smile(c, hx, hy);
    c.beginPath(); c.arc(hx, hy - 1, 11, Math.PI * 1.02, Math.PI * 1.98); c.closePath();
    fillStroke(c, LEATHER(c, hy - 12, hy - 1), 2);
    c.strokeStyle = 'rgba(255,240,200,0.6)'; c.lineWidth = 1; c.setLineDash([2, 2]);
    c.beginPath(); c.arc(hx, hy - 1, 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.setLineDash([]);
  } else if (a === 2) { // open steel helmet with nose guard
    eyes(c, hx, hy + 1); smile(c, hx, hy + 1);
    c.beginPath(); c.arc(hx, hy, 11, Math.PI * 0.98, Math.PI * 2.02); c.lineTo(hx + 11, hy - 1); c.lineTo(hx - 11, hy - 1); c.closePath();
    fillStroke(c, STEEL(c, hy - 11, hy), 2.2);
    c.fillStyle = IRON(c, hy - 3, hy + 6) as any; rr(c, hx + 4, hy - 3, 3, 8, 1.5); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
    c.strokeStyle = 'rgba(43,29,20,0.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx, hy - 11); c.lineTo(hx, hy - 1); c.stroke();
  } else { // 3 = great helm (steel), 4 = royal gold helm with crown crest + big plume
    const g = a >= 4 ? TOP(c, a, hy - 12, hy + 10) : STEEL(c, hy - 12, hy + 10);
    if (a === 4) plume(c, hx - 1, hy - 12, T.main, true);
    if (a >= 5) { plume(c, hx - 1, hy - 12, '#ff8a2a', true); horns(c, hx, hy - 1); }
    rr(c, hx - 11.5, hy - 12, 23, 23, 8); fillStroke(c, g, 2.4);
    c.fillStyle = OUT; rr(c, hx - 1, hy - 2, 12.5, 3.2, 1.5); c.fill(); // visor slit
    rivets(c, [[hx + 5, hy + 4], [hx + 8, hy + 4], [hx + 5, hy + 7], [hx + 8, hy + 7]]);
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx - 7, hy - 8); c.lineTo(hx - 7, hy + 4); c.stroke();
    if (a === 3) plume(c, hx - 2, hy - 12, T.main, false);
    if (a >= 5) { c.fillStyle = '#ffb03a'; rr(c, hx - 1, hy - 2, 12.5, 3.2, 1.5); c.fill(); } // glowing visor
    if (a === 4) {
      c.beginPath(); c.moveTo(hx - 8, hy - 11); c.lineTo(hx - 7, hy - 18); c.lineTo(hx - 3, hy - 13); c.lineTo(hx + 1, hy - 20); c.lineTo(hx + 4, hy - 13);
      c.lineTo(hx + 8, hy - 18); c.lineTo(hx + 9, hy - 11); c.closePath();
      fillStroke(c, GOLD(c, hy - 20, hy - 11), 1.8);
      gem(c, hx + 1, hy - 14, 1.8, '#ff3b6b');
    }
  }
}

// ------------------------------------------------------------ torso
const HALF_W = [8.5, 10, 11, 12, 13, 13.6];

function drawCape(c: Ctx, team: Team, a = 4) {
  const T = TEAM[team];
  c.beginPath();
  c.moveTo(-9, -23); c.lineTo(9, -23);
  c.quadraticCurveTo(14, -10, 12, 1);
  c.quadraticCurveTo(6, -1, 2, 2); c.quadraticCurveTo(-4, -1, -9, 2); c.quadraticCurveTo(-13, -1, -17, 2);
  c.quadraticCurveTo(-16, -12, -9, -23);
  c.closePath();
  fillStroke(c, lin(c, -23, 2, T.main, T.dark), 2.2);
  c.strokeStyle = a >= 5 ? '#ff7a2a' : '#ffd84a'; c.lineWidth = a >= 5 ? 2.2 : 1.4;
  c.beginPath(); c.moveTo(12, 0); c.quadraticCurveTo(6, -2, 2, 1); c.quadraticCurveTo(-4, -2, -9, 1); c.quadraticCurveTo(-13, -2, -16, 1); c.stroke();
}

function drawQuiver(c: Ctx, a: number) {
  const n = [2, 3, 4, 5, 5, 6][a];
  const fill = a === 0 ? lin(c, -32, -8, '#d9c7a0', '#a8946a') : a >= 4 ? TOP(c, a, -32, -8) : LEATHER(c, -32, -8);
  // arrows sticking out
  for (let i = 0; i < n; i++) {
    const x = -13 + i * 1.8, top = -38 - (i % 2) * 2;
    c.strokeStyle = OUT; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, -28); c.lineTo(x - 1, top); c.stroke();
    c.fillStyle = a >= 5 ? '#ff9a3a' : a >= 4 ? '#7ff3ff' : '#f5f0e0';
    c.beginPath(); c.moveTo(x - 1, top); c.lineTo(x - 3, top - 4); c.lineTo(x + 1, top - 4); c.closePath(); c.fill();
  }
  rr(c, -16, -31, 8, 21, 3); fillStroke(c, fill, 2);
  if (a === 3) { c.fillStyle = '#9aa4ae'; c.fillRect(-16, -27, 8, 2); c.fillRect(-16, -16, 8, 2); }
}

function drawTorso(c: Ctx, kind: SoldierKind, team: Team, a: number) {
  const T = TEAM[team];
  const hw = HALF_W[a];
  const top = -23, h = 21;
  const knightish = kind === 'knight' || kind === 'defender';
  // base tunic (team colour, so you can always tell sides apart)
  rr(c, -hw, top, hw * 2, h, 8);
  fillStroke(c, lin(c, top, top + h, T.light, T.dark));
  if (a === 0) {
    // patched cloth tunic + rope belt
    c.fillStyle = 'rgba(255,255,255,0.25)'; rr(c, -5, -18, 5, 5, 1); c.fill();
    c.strokeStyle = 'rgba(43,29,20,0.45)'; c.lineWidth = 0.9; c.setLineDash([1.5, 1.5]); rr(c, -5, -18, 5, 5, 1); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#c9a56a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-hw + 1, -7); c.lineTo(hw - 1, -7); c.stroke();
    c.beginPath(); c.moveTo(1, -7); c.lineTo(-1, -2); c.moveTo(1, -7); c.lineTo(3, -2.5); c.stroke();
    return;
  }
  if (a === 1) {
    // leather vest over the tunic, laced front
    rr(c, -hw + 0.5, top + 1, hw * 2 - 1, h - 4, 7); fillStroke(c, LEATHER(c, top, top + h), 1.8);
    c.fillStyle = T.main; c.fillRect(-1.5, top + 2, 3, h - 7);
    c.strokeStyle = '#f5e6c4'; c.lineWidth = 0.9;
    for (let y = top + 4; y < top + h - 6; y += 3) { c.beginPath(); c.moveTo(-2.5, y); c.lineTo(2.5, y + 1.5); c.stroke(); }
  } else if (a === 2) {
    // chainmail with a team tabard
    rr(c, -hw, top, hw * 2, h, 8); fillStroke(c, IRON(c, top, top + h));
    c.save(); rr(c, -hw, top, hw * 2, h, 8); c.clip();
    c.strokeStyle = 'rgba(43,29,20,0.35)'; c.lineWidth = 0.8;
    for (let y = top + 2; y < top + h; y += 2.6) for (let x = -hw + ((y * 10) % 2); x < hw; x += 2.6) { c.beginPath(); c.arc(x, y, 1.1, 0, Math.PI); c.stroke(); }
    c.restore();
    rr(c, -5, top + 2, 10, h - 3, 3); fillStroke(c, lin(c, top, top + h, T.main, T.dark), 1.5);
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, top + 5); c.lineTo(0, top + 14); c.moveTo(-3, top + 8); c.lineTo(3, top + 8); c.stroke();
  } else {
    // 3 steel plate / 4 royal gold plate, with skirt plates (tassets)
    const metal = a >= 4 ? TOP(c, a, top, top + h) : STEEL(c, top, top + h);
    for (let i = 0; i < 3; i++) { rr(c, -hw + 1 + i * (hw * 2 - 2) / 3, top + h - 6, (hw * 2 - 2) / 3, 8, 2); fillStroke(c, metal, 1.5); }
    rr(c, -hw, top, hw * 2, h - 4, 8); fillStroke(c, metal, 2.4);
    c.strokeStyle = 'rgba(43,29,20,0.4)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, top + 3); c.lineTo(0, top + h - 6); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-hw + 4, top + 4); c.quadraticCurveTo(-hw + 3, top + 9, -hw + 4, top + 13); c.stroke();
    rivets(c, [[-hw + 2.5, top + 4], [hw - 2.5, top + 4], [-hw + 2.5, top + 13], [hw - 2.5, top + 13]]);
    if (a >= 5) {
      scales(c, -hw + 1, top + 1, hw * 2 - 2, h - 6);
      c.shadowColor = '#ff8a2a'; c.shadowBlur = 6; gem(c, 0, top + 8, 3.2, '#ffb03a'); c.shadowColor = 'transparent'; c.shadowBlur = 0;
    } else if (a >= 4) {
      c.strokeStyle = 'rgba(140,80,0,0.55)'; c.lineWidth = 1;
      c.beginPath(); c.arc(-4, top + 10, 3, 0.2, 2.6); c.arc(4, top + 10, 3, 0.5, 2.9); c.stroke();
      gem(c, 0, top + 8, 3, T.main);
    } else {
      c.fillStyle = T.main; rr(c, -3, top + 4, 6, 9, 2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    }
  }
  // belt + buckle
  c.fillStyle = a >= 5 ? '#2a0a10' : a >= 4 ? '#7a2a12' : '#5a3418';
  c.fillRect(-hw + 1, -7.5, hw * 2 - 2, 3.5);
  c.fillStyle = a >= 5 ? '#ffb03a' : a >= 4 ? '#fff3a0' : a >= 2 ? '#d6dde5' : '#f2c230';
  c.fillRect(-2, -8, 4, 4.5);
  // pauldrons (shoulder plates) make the silhouette broader
  if (a >= 2) {
    const r = [0, 0, 4.5, 6.5, 8, 9][a];
    const fill = a >= 4 ? TOP(c, a, top - r, top + r) : a === 3 ? STEEL(c, top - r, top + r) : IRON(c, top - r, top + r);
    for (const s of [-1, 1]) {
      const x = s * (hw - 1), y = top + 3;
      c.beginPath(); c.ellipse(x, y, r * 1.05, r * 0.8, 0, Math.PI, 0); c.quadraticCurveTo(x + r, y + r * 0.6, x, y + r * 0.5); c.quadraticCurveTo(x - r, y + r * 0.6, x - r * 1.05, y);
      c.closePath(); fillStroke(c, fill, 2);
      if (a >= 3) { c.strokeStyle = 'rgba(43,29,20,0.4)'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y + 1, r * 0.75, r * 0.45, 0, Math.PI, 0); c.stroke(); }
      if (a >= 5) { c.beginPath(); c.moveTo(x - 3, y - r * 0.6); c.lineTo(x + s * 2, y - r * 1.5); c.lineTo(x + 3, y - r * 0.6); c.closePath(); fillStroke(c, '#fff3dc', 1.2); }
      else if (a >= 4) gem(c, x, y - 1, 1.6, TEAM[team].main);
    }
  } else if (knightish && a === 1) {
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * (hw - 1), top + 3, 4, 3, 0, Math.PI, 0); c.closePath(); fillStroke(c, LEATHER(c, top, top + 4), 1.5); }
  }
}

function drawShield(c: Ctx, team: Team, a: number) {
  const T = TEAM[team];
  if (a === 0) return; // starters have no shield
  if (a === 1) { // small wooden buckler
    const x = -11, y = -13;
    circle(c, x, y, 7); fillStroke(c, rad(c, x, y, 8, '#c58a52', '#7a4a22'), 2.2);
    c.strokeStyle = 'rgba(43,29,20,0.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 6, y - 2); c.lineTo(x + 6, y - 2); c.moveTo(x - 6, y + 2.5); c.lineTo(x + 6, y + 2.5); c.stroke();
    circle(c, x, y, 2.4); fillStroke(c, IRON(c, y - 2, y + 2), 1.2);
    return;
  }
  const k = [0, 0, 1, 1.2, 1.38, 1.48][a];
  const x = -11 - (a - 2) * 1.6, y = -13;
  const shape = () => {
    c.beginPath();
    c.moveTo(x - 8 * k, y - 9 * k); c.lineTo(x + 8 * k, y - 9 * k);
    c.quadraticCurveTo(x + 8 * k, y + 6 * k, x, y + 11 * k);
    c.quadraticCurveTo(x - 8 * k, y + 6 * k, x - 8 * k, y - 9 * k);
    c.closePath();
  };
  if (a >= 3) { // metal rim
    shape(); fillStroke(c, a >= 4 ? TOP(c, a, y - 10 * k, y + 11 * k) : STEEL(c, y - 10 * k, y + 11 * k), 2.4);
    c.save(); c.translate(x, y); c.scale(0.8, 0.8); c.translate(-x, -y + 0.5); shape(); c.restore();
    c.fillStyle = lin(c, y - 9 * k, y + 11 * k, T.light, T.dark); c.fill();
  } else {
    shape(); fillStroke(c, lin(c, y - 9, y + 11, T.light, T.dark));
  }
  if (a >= 5) { // flame emblem
    c.beginPath(); c.moveTo(x, y - 8);
    c.quadraticCurveTo(x + 7, y - 1, x + 4, y + 5); c.quadraticCurveTo(x, y + 8, x - 4, y + 5); c.quadraticCurveTo(x - 7, y - 1, x, y - 8); c.closePath();
    fillStroke(c, lin(c, y - 8, y + 7, '#fff2a0', '#ff4a1a'), 1.2);
  } else if (a >= 4) { // gold star emblem
    c.beginPath();
    for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 2.6 : 6; c.lineTo(x + Math.cos(ang) * r, y - 0.5 + Math.sin(ang) * r); }
    c.closePath(); fillStroke(c, '#ffd84a', 1.2);
  } else {
    c.strokeStyle = a === 3 ? '#ffffff' : '#f2c230'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y - 7 * k); c.lineTo(x, y + 8 * k); c.moveTo(x - 6 * k, y - 3 * k); c.lineTo(x + 6 * k, y - 3 * k); c.stroke();
  }
}

function makeSoldier(scene: Phaser.Scene, kind: SoldierKind, team: Team, a: number) {
  tex(scene, bodyKey(kind, team, a), BODY_W, BODY_H, (c) => {
    c.translate(BODY_AX, BODY_AY);
    const b = ARMOR_BULK[a];
    c.scale(b, b);
    if (a >= 4) drawCape(c, team, a);
    if (kind === 'archer') drawQuiver(c, a);
    drawTorso(c, kind, team, a);
    drawHead(c, kind, team, a);
    teamAccent(c, team, a);
    if (kind === 'knight' || kind === 'defender') drawShield(c, team, a);
  });
}

// ------------------------------------------------------------ weapons
function glow(c: Ctx, color: string, blur: number) { c.shadowColor = color; c.shadowBlur = blur; }
function noGlow(c: Ctx) { c.shadowColor = 'transparent'; c.shadowBlur = 0; }

function makeKnightWeapons(scene: Phaser.Scene) {
  tex(scene, weaponKey('knight', 0), 14, 36, (c) => { // wooden club
    c.fillStyle = '#5a3418'; rr(c, 5.5, 26, 3, 9, 1.5); c.fill();
    c.beginPath(); c.moveTo(5.2, 28); c.lineTo(2, 8); c.arc(7, 7.5, 5.2, Math.PI, 0); c.lineTo(8.8, 28); c.closePath();
    fillStroke(c, lin(c, 2, 28, '#c08a52', '#7a4a22'), 2);
    c.fillStyle = 'rgba(43,29,20,0.45)'; circle(c, 6, 12, 1.2); c.fill(); circle(c, 8.5, 18, 1); c.fill();
  });
  tex(scene, weaponKey('knight', 1), 12, 30, (c) => { // dagger
    c.beginPath(); c.moveTo(6, 2); c.lineTo(9, 8); c.lineTo(8.5, 19); c.lineTo(3.5, 19); c.lineTo(3, 8); c.closePath();
    fillStroke(c, lin(c, 2, 19, '#e6eaee', '#9aa4ae'), 1.6);
    c.fillStyle = '#a8662e'; rr(c, 1, 19, 10, 3, 1.5); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#5a3418'; c.fillRect(4.5, 22, 3, 5.5);
    circle(c, 6, 28, 1.8); fillStroke(c, '#a8662e', 1);
  });
  tex(scene, weaponKey('knight', 2), 12, 40, (c) => { // iron sword
    c.beginPath(); c.moveTo(6, 1); c.lineTo(10, 7); c.lineTo(10, 28); c.lineTo(2, 28); c.lineTo(2, 7); c.closePath();
    fillStroke(c, lin(c, 0, 28, '#eef1f4', '#8f9aa6'), 2);
    c.fillStyle = '#7d8793'; rr(c, 0, 27, 12, 4, 2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#6b3d1c'; c.fillRect(4.5, 31, 3, 8);
  });
  tex(scene, weaponKey('knight', 3), 18, 58, (c) => { // steel longsword
    c.beginPath(); c.moveTo(9, 1); c.lineTo(13.5, 8); c.lineTo(13, 42); c.lineTo(5, 42); c.lineTo(4.5, 8); c.closePath();
    fillStroke(c, lin(c, 0, 42, '#ffffff', '#b4c2d0'), 2);
    c.strokeStyle = 'rgba(90,110,130,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(9, 9); c.lineTo(9, 40); c.stroke();
    c.beginPath(); c.moveTo(0.5, 43); c.quadraticCurveTo(9, 40, 17.5, 43); c.lineTo(17.5, 46); c.quadraticCurveTo(9, 43.5, 0.5, 46); c.closePath();
    fillStroke(c, lin(c, 40, 47, '#c9d2dc', '#5d6875'), 1.6);
    c.fillStyle = '#3a2616'; c.fillRect(7, 46, 4, 8.5);
    c.strokeStyle = '#8a5a2e'; c.lineWidth = 1; for (let y = 47.5; y < 54; y += 2.2) { c.beginPath(); c.moveTo(7, y); c.lineTo(11, y + 1); c.stroke(); }
    circle(c, 9, 55.5, 2.4); fillStroke(c, STEEL(c, 53, 58), 1.3);
  });
  tex(scene, weaponKey('knight', 4), 26, 66, (c) => { // glowing legend sword
    glow(c, '#7ff3ff', 9);
    c.beginPath(); c.moveTo(13, 3); c.lineTo(18, 10); c.lineTo(17, 46); c.lineTo(9, 46); c.lineTo(8, 10); c.closePath();
    const g = c.createLinearGradient(0, 3, 0, 46); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#9ff4ff'); g.addColorStop(1, '#3aa8ff');
    c.fillStyle = g; c.fill(); c.fill();
    noGlow(c); c.lineWidth = 2; c.strokeStyle = '#1d3f6e'; c.stroke();
    c.fillStyle = '#fff6b0'; for (let y = 14; y < 42; y += 7) { c.beginPath(); c.moveTo(13, y - 2); c.lineTo(14.5, y); c.lineTo(13, y + 2); c.lineTo(11.5, y); c.closePath(); c.fill(); }
    c.beginPath(); c.moveTo(1.5, 44); c.quadraticCurveTo(13, 50, 24.5, 44); c.lineTo(24, 48.5); c.quadraticCurveTo(13, 54, 2, 48.5); c.closePath();
    fillStroke(c, GOLD(c, 43, 52), 1.8);
    gem(c, 13, 49, 2.6, '#ff3b6b');
    c.fillStyle = '#6b2a7a'; c.fillRect(11.2, 51.5, 3.6, 8);
    c.strokeStyle = '#ffd84a'; c.lineWidth = 1; for (let y = 53; y < 59; y += 2.2) { c.beginPath(); c.moveTo(11.2, y); c.lineTo(14.8, y + 1); c.stroke(); }
    circle(c, 13, 61.5, 3); fillStroke(c, GOLD(c, 58, 65), 1.5);
  });
  tex(scene, weaponKey('knight', 5), 30, 74, (c) => { // dragonfire blade: wavy flame blade
    glow(c, '#ff7a1a', 11);
    c.beginPath(); c.moveTo(15, 2);
    c.quadraticCurveTo(22, 10, 19.5, 16); c.quadraticCurveTo(23, 24, 20, 30); c.quadraticCurveTo(23.5, 39, 20, 52);
    c.lineTo(10, 52); c.quadraticCurveTo(6.5, 39, 10, 30); c.quadraticCurveTo(7, 24, 10.5, 16); c.quadraticCurveTo(8, 10, 15, 2); c.closePath();
    const g = c.createLinearGradient(0, 2, 0, 52); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ffb03a'); g.addColorStop(1, '#d8261a');
    c.fillStyle = g; c.fill(); c.fill();
    noGlow(c); c.lineWidth = 2; c.strokeStyle = '#4a0a0a'; c.stroke();
    c.strokeStyle = 'rgba(255,255,220,0.85)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(15, 8); c.quadraticCurveTo(13, 28, 15, 48); c.stroke();
    // dragon-wing crossguard
    c.beginPath(); c.moveTo(15, 51); c.quadraticCurveTo(6, 47, 1, 50); c.quadraticCurveTo(6, 52, 4, 56); c.quadraticCurveTo(10, 55, 15, 57);
    c.quadraticCurveTo(20, 55, 26, 56); c.quadraticCurveTo(24, 52, 29, 50); c.quadraticCurveTo(24, 47, 15, 51); c.closePath();
    fillStroke(c, DRAGON(c, 47, 57), 1.6);
    glow(c, '#ff8a2a', 6); gem(c, 15, 54, 2.6, '#ffb03a'); noGlow(c);
    c.fillStyle = '#2a0a10'; c.fillRect(13.2, 57, 3.6, 10);
    c.strokeStyle = '#ff7a2a'; c.lineWidth = 1; for (let y = 58.5; y < 66; y += 2.2) { c.beginPath(); c.moveTo(13.2, y); c.lineTo(16.8, y + 1); c.stroke(); }
    c.beginPath(); c.moveTo(15, 66); c.lineTo(18.5, 70); c.lineTo(15, 73.5); c.lineTo(11.5, 70); c.closePath(); fillStroke(c, DRAGON(c, 66, 74), 1.4);
  });
}

function makeSpears(scene: Phaser.Scene) {
  tex(scene, weaponKey('spearman', 0), 8, 50, (c) => { // pointy stick
    c.beginPath(); c.moveTo(3, 49); c.lineTo(2.8, 30); c.lineTo(3.6, 18); c.lineTo(3.2, 8); c.lineTo(4.8, 8); c.lineTo(5.4, 18); c.lineTo(5, 30); c.lineTo(5.2, 49); c.closePath();
    fillStroke(c, '#9a6a3a', 1);
    c.beginPath(); c.moveTo(4, 0.5); c.lineTo(5.2, 9); c.lineTo(2.8, 9); c.closePath(); fillStroke(c, '#e0c08a', 1);
    c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.moveTo(5, 24); c.lineTo(7, 21); c.stroke();
  });
  tex(scene, weaponKey('spearman', 1), 10, 58, (c) => { // bronze spear
    c.fillStyle = '#8a5a2e'; c.fillRect(3.5, 11, 3, 47); c.strokeStyle = OUT; c.lineWidth = 1; c.strokeRect(3.5, 11, 3, 47);
    c.beginPath(); c.moveTo(5, 0.5); c.quadraticCurveTo(10, 7, 5, 13); c.quadraticCurveTo(0, 7, 5, 0.5); c.closePath();
    fillStroke(c, lin(c, 0, 13, '#ffd08a', '#b0702a'), 1.4);
  });
  tex(scene, weaponKey('spearman', 2), 10, 64, (c) => { // iron spear
    c.fillStyle = '#8a5a2e'; c.fillRect(3.5, 12, 3, 52); c.strokeStyle = OUT; c.lineWidth = 1; c.strokeRect(3.5, 12, 3, 52);
    c.beginPath(); c.moveTo(5, 0); c.lineTo(9, 13); c.lineTo(1, 13); c.closePath();
    fillStroke(c, lin(c, 0, 13, '#ffffff', '#a9b6c4'), 1.5);
  });
  tex(scene, weaponKey('spearman', 3), 24, 70, (c) => { // steel halberd
    c.fillStyle = '#6b3d1c'; c.fillRect(10.5, 8, 3, 62); c.strokeStyle = OUT; c.lineWidth = 1; c.strokeRect(10.5, 8, 3, 62);
    c.fillStyle = '#9aa4ae'; c.fillRect(10, 30, 4, 2.5); c.fillRect(10, 46, 4, 2.5);
    c.beginPath(); c.moveTo(12, 0); c.lineTo(15, 11); c.lineTo(9, 11); c.closePath(); fillStroke(c, STEEL(c, 0, 11), 1.5);
    c.beginPath(); c.moveTo(13.5, 11); c.quadraticCurveTo(24, 12, 23, 27); c.quadraticCurveTo(18, 23, 13.5, 25); c.closePath(); fillStroke(c, STEEL(c, 11, 27), 1.6);
    c.beginPath(); c.moveTo(10.5, 14); c.lineTo(2, 18); c.lineTo(10.5, 22); c.closePath(); fillStroke(c, STEEL(c, 14, 22), 1.4);
  });
  tex(scene, weaponKey('spearman', 4), 26, 78, (c) => { // golden dragon lance
    c.fillStyle = '#7a2a2a'; c.fillRect(11.5, 20, 3, 58); c.strokeStyle = OUT; c.lineWidth = 1; c.strokeRect(11.5, 20, 3, 58);
    c.fillStyle = '#ffd84a'; for (const y of [34, 50, 66]) c.fillRect(11, y, 4, 2.5);
    c.strokeStyle = '#e0304a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(12, 22); c.quadraticCurveTo(6, 28, 8, 34); c.moveTo(14, 22); c.quadraticCurveTo(19, 28, 17, 35); c.stroke();
    glow(c, '#ffd84a', 8);
    c.beginPath(); c.moveTo(13, 1); c.quadraticCurveTo(21, 10, 16.5, 20); c.lineTo(9.5, 20); c.quadraticCurveTo(5, 10, 13, 1); c.closePath();
    c.fillStyle = lin(c, 1, 20, '#fffbd0', '#f0a818'); c.fill(); c.fill();
    noGlow(c); c.strokeStyle = OUT; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(160,90,0,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(13, 5); c.lineTo(13, 18); c.stroke();
    c.beginPath(); c.moveTo(4, 20); c.quadraticCurveTo(13, 17, 22, 20); c.lineTo(20, 23); c.quadraticCurveTo(13, 21, 6, 23); c.closePath();
    fillStroke(c, GOLD(c, 17, 23), 1.4);
    gem(c, 13, 21, 1.8, '#ff3b6b');
  });
  tex(scene, weaponKey('spearman', 5), 28, 84, (c) => { // phoenix spear: flame-feather head
    c.fillStyle = '#3a0a14'; c.fillRect(12.5, 24, 3, 60); c.strokeStyle = OUT; c.lineWidth = 1; c.strokeRect(12.5, 24, 3, 60);
    c.fillStyle = '#ff7a2a'; for (const y of [40, 56, 72]) c.fillRect(12, y, 4, 2.5);
    // feathers trailing from the head
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(14, 24); c.quadraticCurveTo(14 + s * 13, 28, 14 + s * 11, 40); c.quadraticCurveTo(14 + s * 6, 32, 14, 28); c.closePath();
      fillStroke(c, lin(c, 24, 40, '#ffd04a', '#e0301e'), 1.3);
    }
    glow(c, '#ff7a1a', 10);
    c.beginPath(); c.moveTo(14, 0); c.quadraticCurveTo(24, 10, 18, 24); c.lineTo(10, 24); c.quadraticCurveTo(4, 10, 14, 0); c.closePath();
    c.fillStyle = lin(c, 0, 24, '#fff6c0', '#ff5a1a'); c.fill(); c.fill();
    noGlow(c); c.strokeStyle = '#4a0a0a'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(255,255,220,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(14, 4); c.lineTo(14, 20); c.stroke();
    glow(c, '#ff8a2a', 5); gem(c, 14, 25, 2, '#ffb03a'); noGlow(c);
  });
}

function makeBows(scene: Phaser.Scene) {
  const limb = (c: Ctx, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, outer: number, inner: number, col: string | CanvasGradient) => {
    c.strokeStyle = OUT; c.lineWidth = outer; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke();
    c.strokeStyle = col; c.lineWidth = inner; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke();
  };
  tex(scene, weaponKey('archer', 0), 14, 34, (c) => { // twig bow
    limb(c, 3.5, 2, 15, 17, 3.5, 32, 3.4, 1.8, '#9a7a4a');
    c.strokeStyle = '#e8e0c8'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(3.5, 2); c.lineTo(3.5, 32); c.stroke();
    c.fillStyle = '#5fb04a'; ellipse(c, 7.5, 6, 2.2, 1.2); c.fill();
  });
  tex(scene, weaponKey('archer', 1), 18, 44, (c) => { // hunting bow
    limb(c, 4, 2, 22, 22, 4, 42, 5, 3, '#a8662e');
    c.strokeStyle = '#f5f0e0'; c.lineWidth = 1; c.beginPath(); c.moveTo(4, 2); c.lineTo(4, 42); c.stroke();
  });
  tex(scene, weaponKey('archer', 2), 22, 50, (c) => { // recurve
    limb(c, 5, 6, 26, 25, 5, 44, 5.5, 3.5, '#6b3d1c');
    limb(c, 5, 6, 4, 3, 8.5, 1.5, 4.5, 2.6, '#6b3d1c');
    limb(c, 5, 44, 4, 47, 8.5, 48.5, 4.5, 2.6, '#6b3d1c');
    c.fillStyle = '#c9a56a'; rr(c, 12.5, 21, 4, 8, 1.5); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#f5f0e0'; c.lineWidth = 1; c.beginPath(); c.moveTo(5, 6); c.lineTo(5, 44); c.stroke();
  });
  tex(scene, weaponKey('archer', 3), 24, 58, (c) => { // steel longbow
    limb(c, 5, 3, 29, 29, 5, 55, 6, 4, lin(c, 3, 55, '#eef2f6', '#8d99a8'));
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(6, 6); c.quadraticCurveTo(27, 29, 6, 52); c.stroke();
    c.fillStyle = '#3a2616'; rr(c, 14.5, 25, 4.5, 8, 1.5); c.fill();
    rivets(c, [[11, 12], [11, 46], [16, 20], [16, 38]]);
    c.strokeStyle = '#f5f0e0'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(5, 3); c.lineTo(5, 55); c.stroke();
  });
  tex(scene, weaponKey('archer', 4), 28, 62, (c) => { // golden star bow
    glow(c, '#ffd84a', 7);
    limb(c, 6, 5, 33, 31, 6, 57, 6, 4.2, lin(c, 5, 57, '#fffbd0', '#f0a818'));
    noGlow(c);
    glow(c, '#9ff4ff', 5);
    c.strokeStyle = '#dffcff'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(6, 5); c.lineTo(6, 57); c.stroke();
    noGlow(c);
    for (const [x, y] of [[6, 5], [6, 57]] as const) {
      c.beginPath();
      for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 1.6 : 4; c.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r); }
      c.closePath(); fillStroke(c, '#fff6b0', 1);
    }
    gem(c, 19.5, 31, 2.6, '#5ff0ff');
  });
  tex(scene, weaponKey('archer', 5), 32, 66, (c) => { // phoenix bow: crimson limbs, fire string
    glow(c, '#ff7a1a', 8);
    limb(c, 7, 4, 38, 33, 7, 62, 6.5, 4.4, lin(c, 4, 62, '#ff8a5a', '#7a0f1e'));
    noGlow(c);
    for (const [y, s] of [[6, -1], [60, 1]] as const) { // wing-tip curls
      c.beginPath(); c.moveTo(7, y); c.quadraticCurveTo(2, y + s * 4, 6, y + s * 9); c.quadraticCurveTo(10, y + s * 4, 7, y); c.closePath();
      fillStroke(c, lin(c, y - 9, y + 9, '#ffd04a', '#e0301e'), 1.2);
    }
    glow(c, '#ffb03a', 6);
    c.strokeStyle = '#ffe08a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(7, 4); c.lineTo(7, 62); c.stroke();
    noGlow(c);
    c.fillStyle = '#2a0a10'; rr(c, 19, 28, 5, 10, 2); c.fill();
    glow(c, '#ff8a2a', 6); gem(c, 21.5, 33, 2.8, '#ffb03a'); noGlow(c);
  });
  tex(scene, 'arrow_fire', 36, 12, (c) => {
    glow(c, '#ff7a1a', 6);
    c.fillStyle = '#ffb03a'; c.fillRect(6, 5, 22, 2);
    c.fillStyle = '#ff4a1a'; c.beginPath(); c.moveTo(1, 1.5); c.lineTo(8, 6); c.lineTo(1, 10.5); c.closePath(); c.fill();
    c.fillStyle = '#fff2a0'; c.beginPath(); c.moveTo(35, 6); c.lineTo(27, 2); c.lineTo(27, 10); c.closePath(); c.fill();
    noGlow(c);
  });
  tex(scene, 'arrow_glow', 34, 10, (c) => {
    glow(c, '#9ff4ff', 5);
    c.fillStyle = '#ffd84a'; c.fillRect(5, 4, 22, 2);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(1, 1); c.lineTo(7, 5); c.lineTo(1, 9); c.closePath(); c.fill();
    c.fillStyle = '#9ff4ff'; c.beginPath(); c.moveTo(33, 5); c.lineTo(26, 1.5); c.lineTo(26, 8.5); c.closePath(); c.fill();
    noGlow(c);
  });
}

// ------------------------------------------------------------ siege (wood -> iron bands -> steel plates -> royal gold)
const TRIM = (t: number) => (t >= 4 ? '#ff6a2a' : t >= 3 ? '#ffd84a' : '#9aa4ae');
const DARKIRON = (c: Ctx, y0: number, y1: number) => lin(c, y0, y1, '#8a7a90', '#2e2434');
function wheel(c: Ctx, x: number, y: number, r: number, t: number) {
  circle(c, x, y, r); fillStroke(c, t >= 4 ? '#3a2a30' : '#6b3d1c', 2.5);
  if (t >= 1) { c.strokeStyle = TRIM(t); c.lineWidth = 2.2; circle(c, x, y, r - 1.3); c.stroke(); }
  circle(c, x, y, r * 0.55); fillStroke(c, '#a8662e', 1.5);
  c.fillStyle = TRIM(t); circle(c, x, y, r * (t >= 2 ? 0.3 : 0.22)); c.fill();
}

function makeSiegeTiers(scene: Phaser.Scene) {
  for (let t = 0; t < SIEGE_TIERS; t++) {
    tex(scene, siegeKey('ram_body', t), 84, 60, (c) => {
      c.beginPath(); c.moveTo(10, 40); c.lineTo(20, 10); c.lineTo(64, 10); c.lineTo(74, 40); c.closePath();
      fillStroke(c, t >= 4 ? DARKIRON(c, 10, 40) : t >= 2 ? STEEL(c, 10, 40) : lin(c, 10, 40, '#c4733a', '#7c3d18'));
      if (t >= 4) scales(c, 14, 12, 56, 26);
      c.strokeStyle = 'rgba(43,29,20,0.45)'; c.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(16 + i * 2, 16 + i * 5); c.lineTo(68 - i * 2, 16 + i * 5); c.stroke(); }
      if (t >= 2) rivets(c, [[24, 18], [42, 18], [60, 18], [22, 28], [42, 28], [62, 28], [20, 37], [42, 37], [64, 37]]);
      if (t >= 1) { // iron straps
        c.fillStyle = t >= 4 ? '#c8401a' : t >= 3 ? '#e0a21a' : '#5d6875';
        for (const x of [30, 54]) { c.beginPath(); c.moveTo(x - 2, 10); c.lineTo(x + 2, 10); c.lineTo(x + 3 + (x > 42 ? 2 : -2), 40); c.lineTo(x - 3 + (x > 42 ? 2 : -2), 40); c.closePath(); c.fill(); }
      }
      if (t >= 3) { c.strokeStyle = TRIM(t); c.lineWidth = 2.5; c.beginPath(); c.moveTo(10, 40); c.lineTo(20, 10); c.lineTo(64, 10); c.lineTo(74, 40); c.stroke(); }
      c.fillStyle = TEAM.blue.main; rr(c, 22, 6, 40, 7, 3); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
      if (t >= 3) { // pennant
        c.beginPath(); c.moveTo(42, 7); c.lineTo(42, 1); c.lineTo(52, 3.5); c.lineTo(42, 6); c.closePath(); fillStroke(c, TRIM(t), 1.5);
      }
      if (t >= 4) { // dragon skull on the prow
        c.beginPath(); c.moveTo(70, 22); c.lineTo(82, 26); c.lineTo(74, 30); c.lineTo(78, 34); c.lineTo(68, 34); c.closePath(); fillStroke(c, '#efe4cc', 1.5);
        c.fillStyle = '#ff6a2a'; circle(c, 73, 27, 1.6); c.fill();
      }
      wheel(c, 20, 46, 10, t); wheel(c, 64, 46, 10, t);
    });
    tex(scene, siegeKey('ram_log', t), 64, 18, (c) => {
      rr(c, 2, 3, 52, 12, 6); fillStroke(c, lin(c, 3, 15, '#b9814a', '#6b3d1c'));
      if (t >= 1) { c.fillStyle = '#5d6875'; c.fillRect(16, 3, 3, 12); c.fillRect(32, 3, 3, 12); }
      const head = t >= 4 ? DRAGON(c, 0, 18) : t >= 3 ? GOLD(c, 0, 18) : t >= 2 ? STEEL(c, 0, 18) : t >= 1 ? IRON(c, 0, 18) : lin(c, 0, 18, '#e0e6ec', '#7a8796');
      if (t >= 2) { c.beginPath(); c.moveTo(46, 0); c.lineTo(58, 0); c.quadraticCurveTo(64, 9, 58, 18); c.lineTo(46, 18); c.closePath(); fillStroke(c, head); }
      else { rr(c, 48, 0, 15, 18, 5); fillStroke(c, head); }
      if (t >= 2) rivets(c, [[50, 4], [50, 14]]);
    });
    for (const team of (t === 2 ? ['blue', 'ice', 'sand', 'shadow'] : ['blue']) as Team[]) tex(scene, team === 'blue' ? siegeKey('cata_body', t) : `cata_body_${team}`, 76, 56, (c) => {
      rr(c, 6, 22, 64, 16, 5); fillStroke(c, t >= 4 ? DARKIRON(c, 22, 38) : t >= 2 ? STEEL(c, 22, 38) : lin(c, 22, 38, '#b9814a', '#6b3d1c'));
      if (t >= 2) rivets(c, [[12, 26], [28, 26], [48, 26], [64, 26], [12, 34], [64, 34]]);
      c.beginPath(); c.moveTo(26, 30); c.lineTo(38, 6); c.lineTo(50, 30);
      c.strokeStyle = OUT; c.lineWidth = 7; c.stroke();
      c.strokeStyle = t >= 4 ? '#c8401a' : t >= 3 ? '#e0a21a' : '#9a6234'; c.lineWidth = 4; c.stroke();
      if (t >= 1) { c.fillStyle = t >= 3 ? TRIM(t) : '#5d6875'; rr(c, 34, 4, 8, 6, 2); c.fill(); c.fillRect(30, 22, 3, 16); c.fillRect(44, 22, 3, 16); }
      if (t >= 3) { c.strokeStyle = TRIM(t); c.lineWidth = 2; rr(c, 6, 22, 64, 16, 5); c.stroke(); }
      c.fillStyle = TEAM[team].main; rr(c, 10, 25, 12, 8, 2); c.fill();
      wheel(c, 16, 42, 10, t); wheel(c, 60, 42, 10, t);
    });
    tex(scene, siegeKey('cata_arm', t), 16, 58, (c) => {
      rr(c, 5, 10, 6, 46, 3); fillStroke(c, '#9a6234', 2);
      if (t >= 1) { c.fillStyle = t >= 3 ? TRIM(t) : '#5d6875'; c.fillRect(5, 24, 6, 2.5); c.fillRect(5, 40, 6, 2.5); }
      c.beginPath(); c.arc(8, 9, 8, 0, Math.PI); c.closePath();
      fillStroke(c, t >= 4 ? DRAGON(c, 9, 17) : t >= 3 ? GOLD(c, 9, 17) : t >= 2 ? STEEL(c, 9, 17) : '#6b3d1c', 2);
    });
  }
}

export function generateGearArt(scene: Phaser.Scene) {
  for (let a = 0; a < ARMOR_TIERS; a++) {
    for (const team of ['blue', 'red'] as Team[]) for (const k of ['knight', 'archer', 'spearman'] as SoldierKind[]) makeSoldier(scene, k, team, a);
    for (const team of ['red', 'ice', 'sand', 'shadow'] as Team[]) makeSoldier(scene, 'defender', team, a);
    for (const team of ['ice', 'sand', 'shadow'] as Team[]) makeSoldier(scene, 'archer', team, a); // wall archers
  }
  makeKnightWeapons(scene);
  makeSpears(scene);
  makeBows(scene);
  makeSiegeTiers(scene);
}
