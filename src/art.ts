// Procedural, canvas-drawn art. Everything is generated at boot — no image files needed.
import Phaser from 'phaser';

type Ctx = CanvasRenderingContext2D;
const OUT = '#2b1d14';

export const TEAM = {
  blue: { main: '#3d7be0', dark: '#24509e', light: '#7fb0ff' },
  red: { main: '#d8443a', dark: '#8f2220', light: '#ff8a7a' },
};
export type Team = keyof typeof TEAM;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h)!;
  const c = t.context;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  draw(c);
  t.refresh();
}

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function fillStroke(c: Ctx, fill: string | CanvasGradient, lw = 2.5, stroke = OUT) {
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = lw;
  c.strokeStyle = stroke;
  c.stroke();
}

function circle(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
}

function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function lin(c: Ctx, y0: number, y1: number, a: string, b: string) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

function rad(c: Ctx, x: number, y: number, r: number, a: string, b: string) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

// Seeded RNG so textures look the same every run
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------- characters
function drawHead(c: Ctx, x: number, y: number, kind: string, team: Team) {
  const T = TEAM[team];
  // face
  circle(c, x, y, 10);
  fillStroke(c, rad(c, x, y, 11, '#ffdcb8', '#e9a87c'));
  if (kind === 'knight' || kind === 'defender') {
    // steel helmet covering top + visor
    c.beginPath();
    c.arc(x, y, 11, Math.PI * 0.95, Math.PI * 2.05);
    c.lineTo(x + 11, y + 3);
    c.lineTo(x - 11, y + 3);
    c.closePath();
    fillStroke(c, lin(c, y - 11, y + 3, '#eef2f7', '#8d99a8'));
    c.fillStyle = OUT;
    rr(c, x - 1, y - 2, 11, 3, 1.5);
    c.fill();
    // plume
    c.beginPath();
    c.moveTo(x - 2, y - 11);
    c.quadraticCurveTo(x - 14, y - 20, x - 16, y - 8);
    c.quadraticCurveTo(x - 8, y - 12, x - 2, y - 11);
    fillStroke(c, T.main, 2);
  } else if (kind === 'archer') {
    // hood
    c.beginPath();
    c.arc(x, y - 1, 12, Math.PI * 0.85, Math.PI * 2.15);
    c.quadraticCurveTo(x + 12, y + 6, x + 6, y + 4);
    c.lineTo(x - 6, y + 4);
    c.quadraticCurveTo(x - 12, y + 6, x - 11, y + 4);
    c.closePath();
    fillStroke(c, lin(c, y - 13, y + 5, '#5fb04a', '#2f6b25'));
    c.fillStyle = '#ffdcb8';
    ellipse(c, x + 3, y + 1, 6, 4.5);
    c.fill();
    // eyes
    c.fillStyle = OUT;
    circle(c, x + 2, y, 1.6); c.fill();
    circle(c, x + 6.5, y, 1.6); c.fill();
  } else if (kind === 'spearman') {
    // leather cap with team band
    c.beginPath();
    c.arc(x, y, 11, Math.PI, Math.PI * 2);
    c.closePath();
    fillStroke(c, lin(c, y - 11, y, '#c58a52', '#8a5a2e'));
    c.fillStyle = T.main;
    c.fillRect(x - 10.5, y - 3, 21, 3);
    c.fillStyle = OUT;
    circle(c, x + 3, y + 3, 1.6); c.fill();
    circle(c, x + 7, y + 3, 1.6); c.fill();
    // little moustache
    c.strokeStyle = '#6b3d1c'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + 2, y + 7); c.quadraticCurveTo(x + 5, y + 5, x + 9, y + 7); c.stroke();
  }
}

function drawBody(c: Ctx, cx: number, cy: number, team: Team, kind: string) {
  const T = TEAM[team];
  // torso
  rr(c, cx - 11, cy - 9, 22, 21, 8);
  fillStroke(c, lin(c, cy - 9, cy + 12, T.light, T.dark));
  if (kind === 'knight' || kind === 'defender') {
    // chest plate
    rr(c, cx - 7, cy - 6, 14, 12, 5);
    fillStroke(c, lin(c, cy - 6, cy + 6, '#f2f5f8', '#97a3b1'), 1.5);
  }
  // belt
  c.fillStyle = '#5a3418';
  c.fillRect(cx - 10, cy + 5, 20, 3.5);
  c.fillStyle = '#f2c230';
  c.fillRect(cx - 2, cy + 4.5, 4, 4.5);
}

function drawShield(c: Ctx, x: number, y: number, team: Team) {
  const T = TEAM[team];
  c.beginPath();
  c.moveTo(x - 8, y - 9);
  c.lineTo(x + 8, y - 9);
  c.quadraticCurveTo(x + 8, y + 6, x, y + 11);
  c.quadraticCurveTo(x - 8, y + 6, x - 8, y - 9);
  c.closePath();
  fillStroke(c, lin(c, y - 9, y + 11, T.light, T.dark));
  c.strokeStyle = '#f2c230'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x, y + 8); c.moveTo(x - 6, y - 3); c.lineTo(x + 6, y - 3); c.stroke();
}

function makeCharacter(scene: Phaser.Scene, kind: string, team: Team) {
  tex(scene, `${kind}_${team}`, 48, 56, (c) => {
    drawBody(c, 22, 38, team, kind);
    drawHead(c, 24, 20, kind, team);
    if (kind === 'knight' || kind === 'defender') drawShield(c, 11, 38, team);
    if (kind === 'archer') {
      // quiver on back
      rr(c, 6, 24, 7, 18, 3);
      fillStroke(c, '#8a5a2e', 2);
      c.strokeStyle = '#f5f0e0'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(8, 24); c.lineTo(6, 18); c.moveTo(11, 24); c.lineTo(11, 17); c.stroke();
    }
  });
}

// ---------------------------------------------------------------- weapons
function makeWeapons(scene: Phaser.Scene) {
  tex(scene, 'sword', 12, 40, (c) => {
    // pointing up; handle at bottom
    c.beginPath();
    c.moveTo(6, 1); c.lineTo(10, 7); c.lineTo(10, 28); c.lineTo(2, 28); c.lineTo(2, 7); c.closePath();
    fillStroke(c, lin(c, 0, 28, '#ffffff', '#a9b6c4'), 2);
    c.fillStyle = '#f2c230'; rr(c, 0, 27, 12, 4, 2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#6b3d1c'; c.fillRect(4.5, 31, 3, 8);
  });
  tex(scene, 'spear', 10, 64, (c) => {
    c.fillStyle = '#8a5a2e'; c.fillRect(3.5, 12, 3, 52);
    c.strokeStyle = OUT; c.lineWidth = 1; c.strokeRect(3.5, 12, 3, 52);
    c.beginPath(); c.moveTo(5, 0); c.lineTo(9, 13); c.lineTo(1, 13); c.closePath();
    fillStroke(c, lin(c, 0, 13, '#ffffff', '#a9b6c4'), 1.5);
  });
  tex(scene, 'bow', 18, 44, (c) => {
    c.strokeStyle = OUT; c.lineWidth = 5;
    c.beginPath(); c.moveTo(4, 2); c.quadraticCurveTo(22, 22, 4, 42); c.stroke();
    c.strokeStyle = '#a8662e'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(4, 2); c.quadraticCurveTo(22, 22, 4, 42); c.stroke();
    c.strokeStyle = '#f5f0e0'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(4, 2); c.lineTo(4, 42); c.stroke();
  });
  tex(scene, 'arrow', 30, 6, (c) => {
    c.fillStyle = '#7a4a22'; c.fillRect(4, 2, 22, 2);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, 0); c.lineTo(6, 3); c.lineTo(0, 6); c.closePath(); c.fill();
    c.fillStyle = '#c9d2dc'; c.beginPath(); c.moveTo(30, 3); c.lineTo(24, 0); c.lineTo(24, 6); c.closePath(); c.fill();
  });
  tex(scene, 'boulder', 22, 22, (c) => {
    circle(c, 11, 11, 9);
    fillStroke(c, rad(c, 11, 11, 10, '#c7c0b2', '#6d655a'), 2);
    c.fillStyle = 'rgba(0,0,0,0.18)'; circle(c, 14, 13, 2.5); c.fill(); circle(c, 8, 14, 1.8); c.fill();
  });
}

// ---------------------------------------------------------------- siege
function makeSiege(scene: Phaser.Scene) {
  const wheel = (c: Ctx, x: number, y: number, r: number) => {
    circle(c, x, y, r); fillStroke(c, '#6b3d1c', 2.5);
    circle(c, x, y, r * 0.55); fillStroke(c, '#a8662e', 1.5);
    c.fillStyle = '#9aa4ae'; circle(c, x, y, r * 0.22); c.fill();
  };
  tex(scene, 'ram_body', 84, 60, (c) => {
    // roof (sloped hut on wheels)
    c.beginPath();
    c.moveTo(10, 40); c.lineTo(20, 10); c.lineTo(64, 10); c.lineTo(74, 40); c.closePath();
    fillStroke(c, lin(c, 10, 40, '#c4733a', '#7c3d18'));
    c.strokeStyle = 'rgba(43,29,20,0.45)'; c.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(16 + i * 2, 16 + i * 5); c.lineTo(68 - i * 2, 16 + i * 5); c.stroke(); }
    // team strip
    c.fillStyle = TEAM.blue.main; rr(c, 22, 6, 40, 7, 3); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    wheel(c, 20, 46, 10); wheel(c, 64, 46, 10);
  });
  tex(scene, 'ram_log', 64, 18, (c) => {
    rr(c, 2, 3, 52, 12, 6); fillStroke(c, lin(c, 3, 15, '#b9814a', '#6b3d1c'));
    rr(c, 48, 0, 15, 18, 5); fillStroke(c, lin(c, 0, 18, '#e0e6ec', '#7a8796'));
  });
  tex(scene, 'cata_body', 76, 56, (c) => {
    rr(c, 6, 22, 64, 16, 5); fillStroke(c, lin(c, 22, 38, '#b9814a', '#6b3d1c'));
    // A-frame
    c.beginPath(); c.moveTo(26, 30); c.lineTo(38, 6); c.lineTo(50, 30);
    c.strokeStyle = OUT; c.lineWidth = 7; c.stroke();
    c.strokeStyle = '#9a6234'; c.lineWidth = 4; c.stroke();
    c.fillStyle = TEAM.blue.main; rr(c, 10, 25, 12, 8, 2); c.fill();
    wheel(c, 16, 42, 10); wheel(c, 60, 42, 10);
  });
  tex(scene, 'cata_arm', 16, 58, (c) => {
    // pivot at bottom center; bucket at top
    rr(c, 5, 10, 6, 46, 3); fillStroke(c, '#9a6234', 2);
    c.beginPath(); c.arc(8, 9, 8, 0, Math.PI); c.closePath();
    fillStroke(c, '#6b3d1c', 2);
  });
}

// ---------------------------------------------------------------- castle
function stoneBlock(c: Ctx, x: number, y: number, w: number, h: number, top: number, seed: number, tint = 0) {
  const R = rng(seed);
  // front face
  rr(c, x, y + top * 0.6, w, h - top * 0.6, 4);
  fillStroke(c, lin(c, y, y + h, tint ? '#a59a8c' : '#9c9486', tint ? '#6a5f52' : '#615a50'));
  // bricks
  c.strokeStyle = 'rgba(43,29,20,0.35)'; c.lineWidth = 1.2;
  const rows = Math.floor((h - top) / 9);
  for (let r = 0; r < rows; r++) {
    const yy = y + top + 2 + r * 9;
    c.beginPath(); c.moveTo(x + 2, yy); c.lineTo(x + w - 2, yy); c.stroke();
    const off = (r % 2) * 7 + R() * 3;
    for (let bx = x + 6 + off; bx < x + w - 3; bx += 14) { c.beginPath(); c.moveTo(bx, yy); c.lineTo(bx, yy + 9); c.stroke(); }
  }
  // top face
  rr(c, x, y, w, top + 2, 4);
  fillStroke(c, lin(c, y, y + top, '#e9e3d4', '#c9c0ac'));
}

function makeCastle(scene: Phaser.Scene) {
  tex(scene, 'wall', 36, 46, (c) => stoneBlock(c, 2, 4, 32, 40, 14, 7));
  tex(scene, 'wall_cracked', 36, 46, (c) => {
    stoneBlock(c, 2, 4, 32, 40, 14, 7);
    c.strokeStyle = OUT; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(10, 20); c.lineTo(15, 28); c.lineTo(12, 34); c.lineTo(18, 42); c.stroke();
    c.beginPath(); c.moveTo(26, 8); c.lineTo(22, 14); c.lineTo(27, 18); c.stroke();
  });
  tex(scene, 'rubble', 56, 30, (c) => {
    const R = rng(3);
    c.fillStyle = 'rgba(60,45,30,0.35)'; ellipse(c, 28, 18, 26, 11); c.fill();
    for (let i = 0; i < 9; i++) {
      const x = 8 + R() * 40, y = 8 + R() * 14, s = 4 + R() * 6;
      rr(c, x - s / 2, y - s / 2, s, s * 0.8, 2);
      fillStroke(c, R() > 0.5 ? '#b5ac9c' : '#8a8274', 1.5);
    }
  });
  // archer tower
  tex(scene, 'tower', 84, 130, (c) => {
    // base cylinder
    c.beginPath(); c.moveTo(14, 46); c.lineTo(14, 112); c.ellipse(42, 112, 28, 12, 0, Math.PI, 0, true); c.lineTo(70, 46); c.closePath();
    fillStroke(c, (() => { const g = c.createLinearGradient(14, 0, 70, 0); g.addColorStop(0, '#7a7266'); g.addColorStop(0.35, '#c4bba9'); g.addColorStop(1, '#5d564c'); return g; })());
    c.strokeStyle = 'rgba(43,29,20,0.3)'; c.lineWidth = 1.2;
    for (let r = 0; r < 6; r++) { const y = 56 + r * 10; c.beginPath(); c.moveTo(15, y); c.lineTo(69, y); c.stroke(); }
    // door slit
    rr(c, 36, 78, 12, 22, 5); fillStroke(c, '#3a2616', 2);
    // platform with crenellations
    ellipse(c, 42, 46, 34, 14); fillStroke(c, lin(c, 32, 60, '#e9e3d4', '#b3aa96'));
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.05 + i * 0.15);
      const x = 42 + Math.cos(a) * 30, y = 46 + Math.sin(a) * 12;
      rr(c, x - 5, y - 12, 10, 12, 2); fillStroke(c, lin(c, y - 12, y, '#ddd6c6', '#9c9486'), 1.8);
    }
    // roof
    c.beginPath(); c.moveTo(6, 36); c.lineTo(42, 2); c.lineTo(78, 36); c.quadraticCurveTo(42, 48, 6, 36); c.closePath();
    fillStroke(c, lin(c, 2, 46, '#ff6a50', '#9e2a1f'));
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(42, 6); c.lineTo(24, 36); c.stroke();
  });
  // Keep (main building)
  tex(scene, 'keep', 190, 190, (c) => {
    // body
    rr(c, 25, 80, 140, 92, 8); fillStroke(c, lin(c, 80, 172, '#b8af9e', '#6a6256'));
    c.strokeStyle = 'rgba(43,29,20,0.3)'; c.lineWidth = 1.3;
    for (let r = 0; r < 8; r++) {
      const y = 90 + r * 10; c.beginPath(); c.moveTo(27, y); c.lineTo(163, y); c.stroke();
      for (let x = 32 + (r % 2) * 8; x < 160; x += 16) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 10); c.stroke(); }
    }
    // door
    c.beginPath(); c.moveTo(80, 172); c.lineTo(80, 140); c.arc(95, 140, 15, Math.PI, 0); c.lineTo(110, 172); c.closePath();
    fillStroke(c, lin(c, 125, 172, '#8a5a2e', '#4a2a12'));
    c.strokeStyle = '#2b1d14'; c.lineWidth = 1.5; for (let x = 86; x < 108; x += 6) { c.beginPath(); c.moveTo(x, 132); c.lineTo(x, 172); c.stroke(); }
    // windows
    for (const wx of [45, 135]) { rr(c, wx, 110, 12, 18, 6); fillStroke(c, '#2b1d14', 2); c.fillStyle = '#ffd36b'; rr(c, wx + 3, 116, 6, 10, 3); c.fill(); }
    // corner turrets
    for (const tx of [30, 160]) {
      rr(c, tx - 18, 60, 36, 112, 10); fillStroke(c, lin(c, 60, 172, '#cfc6b3', '#6d655a'));
      c.beginPath(); c.moveTo(tx - 22, 64); c.lineTo(tx, 28); c.lineTo(tx + 22, 64); c.closePath();
      fillStroke(c, lin(c, 28, 64, '#5f8de6', '#26458f'));
    }
    // main roof
    c.beginPath(); c.moveTo(40, 86); c.lineTo(95, 22); c.lineTo(150, 86); c.closePath();
    fillStroke(c, lin(c, 22, 86, '#ff7a52', '#a02c1c'));
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(95, 28); c.lineTo(66, 80); c.stroke();
    // flag pole
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(95, 24); c.lineTo(95, 2); c.stroke();
    c.beginPath(); c.moveTo(96, 3); c.lineTo(122, 9); c.lineTo(96, 16); c.closePath(); fillStroke(c, '#f2c230', 2);
  });
  // Gold storage
  tex(scene, 'storage', 70, 64, (c) => {
    rr(c, 8, 26, 54, 34, 6); fillStroke(c, lin(c, 26, 60, '#c4733a', '#6b3d1c'));
    c.strokeStyle = '#3a2616'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(8, 38); c.lineTo(62, 38); c.moveTo(8, 50); c.lineTo(62, 50); c.stroke();
    c.fillStyle = '#9aa4ae'; c.fillRect(30, 26, 10, 34);
    // gold pile
    for (let i = 0; i < 12; i++) {
      const x = 16 + (i % 6) * 8 + (i > 5 ? 4 : 0), y = 24 - (i > 5 ? 6 : 0);
      ellipse(c, x, y, 6, 4); fillStroke(c, rad(c, x, y, 6, '#fff3a0', '#e0a21a'), 1.5);
    }
    ellipse(c, 35, 12, 6, 4); fillStroke(c, rad(c, 35, 12, 6, '#fff3a0', '#e0a21a'), 1.5);
  });
  // Tent (camp)
  tex(scene, 'tent', 110, 90, (c) => {
    c.beginPath(); c.moveTo(8, 80); c.lineTo(55, 12); c.lineTo(102, 80); c.closePath();
    fillStroke(c, lin(c, 12, 80, '#f5ecd5', '#cbbd98'));
    c.beginPath(); c.moveTo(55, 12); c.lineTo(42, 80); c.lineTo(68, 80); c.closePath();
    fillStroke(c, '#3d7be0', 2);
    c.beginPath(); c.moveTo(55, 40); c.lineTo(48, 80); c.lineTo(62, 80); c.closePath(); c.fillStyle = '#2b1d14'; c.fill();
    c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(55, 12); c.lineTo(55, 0); c.stroke();
    c.beginPath(); c.moveTo(56, 1); c.lineTo(74, 5); c.lineTo(56, 10); c.closePath(); fillStroke(c, '#3d7be0', 1.5);
  });
  tex(scene, 'forge', 130, 110, (c) => {
    rr(c, 12, 46, 106, 58, 8); fillStroke(c, lin(c, 46, 104, '#b8af9e', '#6a6256'));
    c.beginPath(); c.moveTo(4, 52); c.lineTo(30, 14); c.lineTo(100, 14); c.lineTo(126, 52); c.closePath();
    fillStroke(c, lin(c, 14, 52, '#8a5a2e', '#4a2a12'));
    rr(c, 92, 0, 18, 30, 3); fillStroke(c, '#7a7266', 2);
    rr(c, 30, 64, 30, 40, 4); fillStroke(c, '#2b1d14', 2);
    c.fillStyle = rad(c, 45, 90, 16, '#ffe680', '#ff6a1a'); circle(c, 45, 90, 12); c.fill();
    // anvil
    c.beginPath(); c.moveTo(72, 80); c.lineTo(106, 80); c.lineTo(100, 88); c.lineTo(92, 88); c.lineTo(94, 100); c.lineTo(82, 100); c.lineTo(84, 88); c.lineTo(76, 88); c.closePath();
    fillStroke(c, lin(c, 80, 100, '#9aa4ae', '#4a525c'), 2);
  });
  tex(scene, 'flag', 30, 60, (c) => {
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(4, 58); c.lineTo(4, 2); c.stroke();
    c.beginPath(); c.moveTo(5, 4); c.quadraticCurveTo(18, 0, 28, 8); c.quadraticCurveTo(18, 14, 5, 20); c.closePath();
    fillStroke(c, '#ffffff', 2);
  });
}

// ---------------------------------------------------------------- nature
function makeNature(scene: Phaser.Scene) {
  tex(scene, 'grass', 256, 256, (c) => {
    const R = rng(11);
    c.fillStyle = '#7cc243'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
      const x = R() * 256, y = R() * 256, r = 10 + R() * 30;
      c.fillStyle = R() > 0.5 ? 'rgba(150,215,90,0.35)' : 'rgba(90,160,50,0.3)';
      for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { ellipse(c, x + dx, y + dy, r, r * 0.7); c.fill(); }
    }
    c.strokeStyle = 'rgba(60,130,35,0.7)'; c.lineWidth = 1.6;
    for (let i = 0; i < 90; i++) {
      const x = R() * 250 + 3, y = R() * 250 + 3;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 5); c.moveTo(x + 2, y); c.lineTo(x + 3, y - 6); c.stroke();
    }
  });
  tex(scene, 'dirt', 512, 360, (c) => {
    const g = c.createRadialGradient(256, 180, 60, 256, 180, 250);
    g.addColorStop(0, 'rgba(214,180,120,1)'); g.addColorStop(0.75, 'rgba(196,160,100,0.95)'); g.addColorStop(1, 'rgba(196,160,100,0)');
    c.fillStyle = g; ellipse(c, 256, 180, 254, 178); c.fill();
    const R = rng(5);
    for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(120,90,50,0.25)'; ellipse(c, 70 + R() * 370, 50 + R() * 260, 2 + R() * 3, 1.5 + R() * 2); c.fill(); }
  });
  tex(scene, 'tree', 80, 96, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.2)'; ellipse(c, 42, 88, 26, 8); c.fill();
    rr(c, 34, 56, 12, 32, 4); fillStroke(c, '#7a4a22', 2.5);
    for (const [x, y, r] of [[40, 38, 26], [24, 48, 18], [56, 48, 18], [40, 22, 20]] as const) { circle(c, x, y, r); fillStroke(c, rad(c, x, y, r, '#7fd650', '#2f7a28')); }
    c.fillStyle = 'rgba(255,255,255,0.25)'; circle(c, 32, 16, 6); c.fill();
  });
  tex(scene, 'pine', 64, 100, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.2)'; ellipse(c, 34, 92, 22, 7); c.fill();
    rr(c, 28, 74, 9, 18, 3); fillStroke(c, '#7a4a22', 2);
    for (const [y, w] of [[78, 30], [56, 25], [34, 19]] as const) {
      c.beginPath(); c.moveTo(32 - w, y); c.lineTo(32, y - 32); c.lineTo(32 + w, y); c.closePath(); fillStroke(c, lin(c, y - 32, y, '#57b048', '#1f5e2a'));
    }
  });
  tex(scene, 'bush', 48, 34, (c) => {
    for (const [x, y, r] of [[14, 20, 11], [34, 20, 11], [24, 14, 12]] as const) { circle(c, x, y, r); fillStroke(c, rad(c, x, y, r, '#8fe060', '#3a8a2a'), 2); }
    c.fillStyle = '#ff5b6e'; circle(c, 18, 14, 2.5); c.fill(); circle(c, 31, 18, 2.5); c.fill();
  });
  tex(scene, 'rock', 46, 32, (c) => {
    c.beginPath(); c.moveTo(4, 28); c.lineTo(8, 12); c.lineTo(20, 4); c.lineTo(36, 8); c.lineTo(43, 26); c.closePath();
    fillStroke(c, lin(c, 4, 28, '#d2ccc0', '#7e776c'));
  });
  tex(scene, 'flowers', 30, 20, (c) => {
    const cols = ['#ffffff', '#ffe14d', '#ff8ad0'];
    for (let i = 0; i < 4; i++) { c.fillStyle = cols[i % 3]; circle(c, 5 + i * 7, 8 + (i % 2) * 6, 3); c.fill(); }
  });
  tex(scene, 'water', 128, 128, (c) => {
    c.fillStyle = '#3fa9e8'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
    const R = rng(9);
    for (let i = 0; i < 12; i++) { const x = R() * 110, y = R() * 120; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y - 4, x + 12, y); c.stroke(); }
  });
}

// ---------------------------------------------------------------- fx & ui
function makeFx(scene: Phaser.Scene) {
  tex(scene, 'shadow', 48, 20, (c) => {
    const g = c.createRadialGradient(24, 10, 2, 24, 10, 22);
    g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; ellipse(c, 24, 10, 23, 9); c.fill();
  });
  tex(scene, 'foot', 10, 7, (c) => { ellipse(c, 5, 3.5, 4, 3); fillStroke(c, '#4a2a12', 1.5); });
  tex(scene, 'puff', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; circle(c, 32, 32, 30); c.fill();
  });
  tex(scene, 'spark', 24, 24, (c) => {
    c.fillStyle = '#fff6b0';
    c.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 4 : 12; c.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r); }
    c.closePath(); c.fill();
  });
  tex(scene, 'chip', 10, 10, (c) => { rr(c, 1, 1, 8, 7, 2); fillStroke(c, '#a59a8c', 1.5); });
  tex(scene, 'wood', 12, 6, (c) => { rr(c, 1, 1, 10, 4, 2); fillStroke(c, '#9a6234', 1.2); });
  const star = (c: Ctx, cx: number, cy: number, R: number, fill: string | CanvasGradient, lw = 3) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? R * 0.48 : R; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    c.closePath(); fillStroke(c, fill, lw);
  };
  tex(scene, 'star', 84, 84, (c) => star(c, 42, 44, 38, rad(c, 42, 44, 40, '#fff7a8', '#f0a818'), 4));
  tex(scene, 'heart', 64, 60, (c) => {
    c.beginPath(); c.moveTo(32, 54);
    c.bezierCurveTo(4, 36, 2, 18, 12, 10); c.bezierCurveTo(22, 2, 32, 10, 32, 18);
    c.bezierCurveTo(32, 10, 42, 2, 52, 10); c.bezierCurveTo(62, 18, 60, 36, 32, 54); c.closePath();
    fillStroke(c, rad(c, 26, 22, 34, '#ff9aa8', '#e0304a'), 4);
    c.fillStyle = 'rgba(255,255,255,0.75)'; ellipse(c, 19, 18, 5, 3.5); c.fill();
  });
  tex(scene, 'star_empty', 84, 84, (c) => star(c, 42, 44, 38, '#6b5a48', 4));
  tex(scene, 'coin', 32, 32, (c) => {
    circle(c, 16, 16, 13); fillStroke(c, rad(c, 16, 16, 14, '#fff3a0', '#e0a21a'), 2.5);
    circle(c, 16, 16, 8); c.strokeStyle = '#b57a10'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; ellipse(c, 11, 10, 3, 2); c.fill();
  });
  tex(scene, 'mic', 64, 64, (c) => {
    rr(c, 22, 6, 20, 32, 10); fillStroke(c, lin(c, 6, 38, '#ffffff', '#c9d2dc'), 3);
    c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.arc(32, 28, 16, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
    c.beginPath(); c.moveTo(32, 44); c.lineTo(32, 54); c.moveTo(22, 56); c.lineTo(42, 56); c.stroke();
  });
  tex(scene, 'speaker', 56, 56, (c) => {
    c.beginPath(); c.moveTo(8, 21); c.lineTo(18, 21); c.lineTo(30, 10); c.lineTo(30, 46); c.lineTo(18, 35); c.lineTo(8, 35); c.closePath();
    fillStroke(c, '#ffffff', 3);
    c.strokeStyle = '#ffffff'; c.lineWidth = 4;
    c.beginPath(); c.arc(30, 28, 10, -0.9, 0.9); c.stroke();
    c.beginPath(); c.arc(30, 28, 18, -0.9, 0.9); c.stroke();
  });
  tex(scene, 'check', 140, 140, (c) => {
    circle(c, 70, 70, 64); fillStroke(c, rad(c, 70, 70, 66, '#7cf06a', '#22a03a'), 6);
    c.strokeStyle = '#ffffff'; c.lineWidth = 16;
    c.beginPath(); c.moveTo(38, 72); c.lineTo(60, 96); c.lineTo(104, 46); c.stroke();
  });
  tex(scene, 'lock', 48, 56, (c) => {
    c.strokeStyle = OUT; c.lineWidth = 9; c.beginPath(); c.arc(24, 22, 12, Math.PI, 0); c.stroke();
    c.strokeStyle = '#c9d2dc'; c.lineWidth = 5; c.beginPath(); c.arc(24, 22, 12, Math.PI, 0); c.stroke();
    rr(c, 6, 22, 36, 30, 6); fillStroke(c, lin(c, 22, 52, '#ffd25a', '#c98a10'), 3);
    c.fillStyle = OUT; circle(c, 24, 34, 4); c.fill(); c.fillRect(22, 34, 4, 9);
  });
  // Streak flame (lit) and a cold grey one for "no streak yet"
  const flame = (c: Ctx, outer: [string, string], inner: [string, string]) => {
    c.beginPath(); c.moveTo(32, 4);
    c.bezierCurveTo(40, 18, 56, 26, 54, 46); c.bezierCurveTo(53, 60, 42, 66, 32, 66);
    c.bezierCurveTo(22, 66, 10, 60, 10, 46); c.bezierCurveTo(10, 34, 18, 30, 20, 20);
    c.bezierCurveTo(24, 26, 26, 30, 27, 34); c.bezierCurveTo(28, 22, 30, 14, 32, 4); c.closePath();
    fillStroke(c, lin(c, 4, 66, outer[0], outer[1]), 3.5);
    c.beginPath(); c.moveTo(32, 30);
    c.bezierCurveTo(38, 38, 44, 44, 43, 52); c.bezierCurveTo(42, 60, 36, 62, 32, 62);
    c.bezierCurveTo(27, 62, 21, 59, 21, 52); c.bezierCurveTo(21, 44, 28, 40, 32, 30); c.closePath();
    c.fillStyle = lin(c, 30, 62, inner[0], inner[1]); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)'; ellipse(c, 26, 50, 3, 5); c.fill();
  };
  tex(scene, 'flame', 64, 70, (c) => flame(c, ['#ffb43a', '#e0301e'], ['#fff6b0', '#ffc93a']));
  tex(scene, 'flame_off', 64, 70, (c) => flame(c, ['#a6adb5', '#6b737c'], ['#dfe3e8', '#b8bfc7']));
  tex(scene, 'crown', 48, 40, (c) => {
    c.beginPath(); c.moveTo(4, 34); c.lineTo(4, 10); c.lineTo(14, 20); c.lineTo(24, 4); c.lineTo(34, 20); c.lineTo(44, 10); c.lineTo(44, 34); c.closePath();
    fillStroke(c, lin(c, 4, 34, '#fff3a0', '#e0a21a'), 3);
  });
}

export function generateArt(scene: Phaser.Scene) {
  for (const team of ['blue', 'red'] as Team[]) {
    makeCharacter(scene, 'knight', team);
    makeCharacter(scene, 'archer', team);
    makeCharacter(scene, 'spearman', team);
  }
  makeCharacter(scene, 'defender', 'red');
  makeWeapons(scene);
  makeSiege(scene);
  makeCastle(scene);
  makeNature(scene);
  makeFx(scene);
}
