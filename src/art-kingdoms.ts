// Textures for Kingdoms 2-4: ground tiles, themed scenery, bosses, crowns, weather.
// Everything is drawn on canvases at boot, like the rest of the art.
import Phaser from 'phaser';
import { tex, rr, fillStroke, circle, ellipse, lin, rad, rng, OUT } from './art';

type Ctx = CanvasRenderingContext2D;

/** Draw a blob on a seamless 256px tile (wraps across the edges). */
function wrapEllipse(c: Ctx, x: number, y: number, rx: number, ry: number) {
  for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { ellipse(c, x + dx, y + dy, rx, ry); c.fill(); }
}

function grounds(scene: Phaser.Scene) {
  tex(scene, 'ground_snow', 256, 256, (c) => {
    const R = rng(21);
    c.fillStyle = '#e8f2fb'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = R() > 0.5 ? 'rgba(255,255,255,0.7)' : 'rgba(180,210,238,0.35)';
      wrapEllipse(c, R() * 256, R() * 256, 12 + R() * 30, 8 + R() * 18);
    }
    for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(150,190,225,0.55)'; circle(c, R() * 252 + 2, R() * 252 + 2, 0.8 + R()); c.fill(); }
  });
  tex(scene, 'ground_sand', 256, 256, (c) => {
    const R = rng(22);
    c.fillStyle = '#e9c27a'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 30; i++) {
      c.fillStyle = R() > 0.5 ? 'rgba(250,220,150,0.45)' : 'rgba(200,150,80,0.25)';
      wrapEllipse(c, R() * 256, R() * 256, 14 + R() * 32, 8 + R() * 14);
    }
    // wind ripples
    c.strokeStyle = 'rgba(170,115,55,0.35)'; c.lineWidth = 1.8;
    for (let i = 0; i < 26; i++) {
      const x = R() * 220, y = R() * 250 + 3, w = 18 + R() * 26;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 2, y - 4, x + w, y); c.stroke();
    }
  });
  tex(scene, 'ground_ash', 256, 256, (c) => {
    const R = rng(23);
    c.fillStyle = '#5a4c58'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = R() > 0.5 ? 'rgba(120,100,120,0.35)' : 'rgba(40,28,40,0.35)';
      wrapEllipse(c, R() * 256, R() * 256, 10 + R() * 30, 8 + R() * 20);
    }
    // glowing cracks
    for (let i = 0; i < 7; i++) {
      let x = 20 + R() * 216, y = 20 + R() * 216;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 30; y += (R() - 0.5) * 22; c.lineTo(x, y); }
      c.strokeStyle = 'rgba(40,20,20,0.8)'; c.lineWidth = 4; c.stroke();
      c.strokeStyle = 'rgba(255,130,40,0.75)'; c.lineWidth = 1.6; c.stroke();
    }
    for (let i = 0; i < 25; i++) { c.fillStyle = 'rgba(255,170,60,0.6)'; circle(c, R() * 250 + 3, R() * 250 + 3, 0.8 + R() * 0.8); c.fill(); }
  });
}

function shadow(c: Ctx, x: number, y: number, rx: number) { c.fillStyle = 'rgba(0,0,0,0.2)'; ellipse(c, x, y, rx, rx * 0.3); c.fill(); }

function decor(scene: Phaser.Scene) {
  // ---- Frost ----
  tex(scene, 'pine_snow', 64, 100, (c) => {
    shadow(c, 34, 92, 22);
    rr(c, 28, 74, 9, 18, 3); fillStroke(c, '#6a4428', 2);
    for (const [y, w] of [[78, 30], [56, 25], [34, 19]] as const) {
      c.beginPath(); c.moveTo(32 - w, y); c.lineTo(32, y - 32); c.lineTo(32 + w, y); c.closePath(); fillStroke(c, lin(c, y - 32, y, '#3f8a5a', '#174a34'));
      // snow cap on each layer
      c.beginPath(); c.moveTo(32 - w * 0.55, y - 14); c.lineTo(32, y - 32); c.lineTo(32 + w * 0.55, y - 14);
      c.quadraticCurveTo(32 + w * 0.2, y - 10, 32, y - 15); c.quadraticCurveTo(32 - w * 0.2, y - 10, 32 - w * 0.55, y - 14); c.closePath();
      c.fillStyle = '#f4fbff'; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)'; ellipse(c, 32 - w * 0.6, y - 2, 6, 2.5); c.fill(); ellipse(c, 32 + w * 0.5, y - 1, 5, 2); c.fill();
    }
  });
  tex(scene, 'ice_rock', 48, 40, (c) => {
    shadow(c, 24, 34, 20);
    c.beginPath(); c.moveTo(6, 34); c.lineTo(12, 14); c.lineTo(22, 4); c.lineTo(30, 12); c.lineTo(40, 8); c.lineTo(44, 34); c.closePath();
    fillStroke(c, lin(c, 4, 34, '#e6f9ff', '#6fb4d8'), 2.2, '#2f6a8a');
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(14, 16); c.lineTo(22, 7); c.moveTo(31, 14); c.lineTo(38, 11); c.stroke();
  });
  tex(scene, 'snow_bush', 48, 34, (c) => {
    for (const [x, y, r] of [[14, 20, 11], [34, 20, 11], [24, 14, 12]] as const) { circle(c, x, y, r); fillStroke(c, rad(c, x, y, r, '#5fa070', '#24603a'), 2); }
    c.fillStyle = '#f4fbff';
    for (const [x, y, r] of [[14, 13, 7], [34, 13, 7], [24, 7, 8]] as const) { ellipse(c, x, y, r, r * 0.55); c.fill(); }
  });
  tex(scene, 'snowman', 44, 64, (c) => {
    shadow(c, 22, 58, 16);
    circle(c, 22, 44, 14); fillStroke(c, rad(c, 22, 44, 14, '#ffffff', '#c8def0'), 2.2);
    circle(c, 22, 22, 10); fillStroke(c, rad(c, 22, 22, 10, '#ffffff', '#c8def0'), 2.2);
    c.fillStyle = OUT; circle(c, 18, 20, 1.6); c.fill(); circle(c, 26, 20, 1.6); c.fill();
    c.beginPath(); c.moveTo(22, 24); c.lineTo(32, 26); c.lineTo(22, 27); c.closePath(); c.fillStyle = '#f08a2a'; c.fill();
    rr(c, 14, 6, 16, 6, 2); fillStroke(c, '#2b2b3a', 1.6); rr(c, 17, 0, 10, 8, 2); fillStroke(c, '#2b2b3a', 1.6);
    c.fillStyle = '#d8443a'; rr(c, 13, 30, 18, 4, 2); c.fill();
    c.fillStyle = OUT; circle(c, 22, 40, 1.5); c.fill(); circle(c, 22, 47, 1.5); c.fill();
  });
  // ---- Desert ----
  tex(scene, 'cactus', 44, 70, (c) => {
    shadow(c, 22, 64, 16);
    const g = '#4f9a3a';
    rr(c, 16, 8, 12, 58, 6); fillStroke(c, lin(c, 8, 66, '#6cc04e', '#2f6e26'), 2.2);
    rr(c, 4, 24, 9, 20, 4.5); fillStroke(c, g, 2); rr(c, 4, 40, 16, 8, 4); fillStroke(c, g, 2);
    rr(c, 31, 16, 9, 22, 4.5); fillStroke(c, g, 2); rr(c, 24, 34, 16, 8, 4); fillStroke(c, g, 2);
    c.strokeStyle = 'rgba(30,70,20,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(22, 12); c.lineTo(22, 62); c.stroke();
    c.fillStyle = '#ff6fa0'; circle(c, 22, 8, 3.5); c.fill();
  });
  tex(scene, 'palm', 84, 112, (c) => {
    shadow(c, 44, 104, 24);
    c.beginPath(); c.moveTo(38, 104); c.quadraticCurveTo(34, 70, 44, 34); c.lineTo(50, 34); c.quadraticCurveTo(42, 70, 48, 104); c.closePath();
    fillStroke(c, '#a0703a', 2.2);
    c.strokeStyle = 'rgba(80,50,20,0.6)'; c.lineWidth = 1.4;
    for (let y = 44; y < 100; y += 8) { c.beginPath(); c.moveTo(38 + (104 - y) * 0.05, y); c.lineTo(48 - (y - 34) * 0.02, y + 2); c.stroke(); }
    for (const [ang, len] of [[-2.7, 38], [-2.2, 34], [-1.6, 30], [-1.0, 34], [-0.45, 38], [0.15, 30], [2.9, 30]] as const) {
      const x0 = 47, y0 = 34, x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len * 0.75 + 14;
      c.beginPath(); c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2, y0 + Math.sin(ang) * len * 0.75 - 8, x1, y1);
      c.quadraticCurveTo((x0 + x1) / 2, y0 + Math.sin(ang) * len * 0.75 + 4, x0, y0 + 4); c.closePath();
      fillStroke(c, '#4fae3e', 2, '#1f5a22');
    }
    c.fillStyle = '#6a4020'; circle(c, 43, 38, 4); c.fill(); circle(c, 51, 39, 4); c.fill();
  });
  tex(scene, 'dune_rock', 52, 36, (c) => {
    shadow(c, 26, 31, 22);
    c.beginPath(); c.moveTo(4, 30); c.quadraticCurveTo(8, 10, 22, 8); c.quadraticCurveTo(40, 6, 48, 30); c.closePath();
    fillStroke(c, lin(c, 6, 30, '#e8a868', '#a0583a'), 2.2);
    c.strokeStyle = 'rgba(120,60,30,0.45)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(10, 22); c.lineTo(42, 22); c.moveTo(14, 15); c.lineTo(36, 15); c.stroke();
  });
  tex(scene, 'skull', 34, 22, (c) => {
    ellipse(c, 17, 13, 9, 7); fillStroke(c, '#f2ead8', 1.8);
    c.beginPath(); c.moveTo(9, 9); c.quadraticCurveTo(2, 8, 2, 2); c.moveTo(25, 9); c.quadraticCurveTo(32, 8, 32, 2);
    c.strokeStyle = OUT; c.lineWidth = 4; c.stroke(); c.strokeStyle = '#f2ead8'; c.lineWidth = 2.2; c.stroke();
    c.fillStyle = OUT; circle(c, 13.5, 12, 2); c.fill(); circle(c, 20.5, 12, 2); c.fill();
  });
  // ---- Shadow ----
  tex(scene, 'dead_tree', 72, 98, (c) => {
    shadow(c, 36, 92, 20);
    c.strokeStyle = OUT; c.lineCap = 'round';
    const branch = (w: number, col: string) => {
      c.lineWidth = w; c.strokeStyle = col;
      c.beginPath(); c.moveTo(36, 92); c.lineTo(36, 40); c.lineTo(20, 18); c.moveTo(36, 54); c.lineTo(58, 30); c.lineTo(64, 14);
      c.moveTo(28, 30); c.lineTo(12, 30); c.moveTo(50, 40); c.lineTo(44, 22); c.moveTo(36, 40); c.lineTo(40, 10); c.stroke();
    };
    branch(11, OUT); branch(7, '#4a3a44');
  });
  tex(scene, 'lava_rock', 48, 34, (c) => {
    shadow(c, 24, 30, 20);
    c.beginPath(); c.moveTo(4, 30); c.lineTo(10, 12); c.lineTo(24, 5); c.lineTo(38, 10); c.lineTo(44, 30); c.closePath();
    fillStroke(c, lin(c, 5, 30, '#4a3a48', '#1e1520'), 2.2, '#100810');
    c.strokeStyle = '#ff8a2a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(12, 24); c.lineTo(20, 16); c.lineTo(26, 20); c.lineTo(34, 12); c.moveTo(22, 28); c.lineTo(26, 20); c.stroke();
  });
  tex(scene, 'crystal', 40, 60, (c) => {
    shadow(c, 20, 55, 16);
    for (const [x, h, w, col] of [[11, 30, 8, '#a060e0'], [29, 34, 8, '#a060e0'], [20, 50, 10, '#c890ff']] as const) {
      c.beginPath(); c.moveTo(x - w, 54); c.lineTo(x - w, 54 - h + w); c.lineTo(x, 54 - h); c.lineTo(x + w, 54 - h + w); c.lineTo(x + w, 54); c.closePath();
      fillStroke(c, lin(c, 54 - h, 54, col, '#4a1a80'), 2, '#2a0c4a');
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x - w * 0.5, 54 - h + w, w * 0.35, h - w - 4);
    }
  });
  tex(scene, 'ember_vent', 44, 24, (c) => {
    c.fillStyle = 'rgba(255,120,30,0.35)'; ellipse(c, 22, 13, 20, 9); c.fill();
    ellipse(c, 22, 13, 15, 6); fillStroke(c, '#2a1a20', 2, '#100810');
    c.fillStyle = rad(c, 22, 13, 10, '#ffe08a', '#ff5a1a'); ellipse(c, 22, 13, 10, 3.5); c.fill();
  });
  // weather particles
  tex(scene, 'snowflake', 10, 10, (c) => { c.fillStyle = '#ffffff'; circle(c, 5, 5, 3.5); c.fill(); });
  tex(scene, 'sandmote', 8, 4, (c) => { c.fillStyle = 'rgba(240,200,130,0.9)'; ellipse(c, 4, 2, 3.5, 1.5); c.fill(); });
  tex(scene, 'ember', 8, 8, (c) => { c.fillStyle = rad(c, 4, 4, 4, '#fff0a0', '#ff6a1a'); circle(c, 4, 4, 3.2); c.fill(); });
}

// ---------------------------------------------------------------------------
// Bosses. Textures face right, like the soldiers.
function bosses(scene: Phaser.Scene) {
  // Camel rider (Kingdom 3 boss): a camel carrying a turbaned sand-captain.
  tex(scene, 'boss_camel', 140, 130, (c) => {
    shadow(c, 70, 124, 50);
    const fur = lin(c, 40, 120, '#e0b070', '#a06a34');
    // back legs + front legs
    for (const x of [34, 46, 88, 100]) { rr(c, x, 82, 9, 40, 4); fillStroke(c, '#b47a40', 2.2); rr(c, x - 1, 116, 11, 6, 3); fillStroke(c, '#6a4020', 1.8); }
    // tail
    c.beginPath(); c.moveTo(24, 76); c.quadraticCurveTo(14, 84, 16, 98); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#a06a34'; c.lineWidth = 3; c.stroke();
    // body + hump
    ellipse(c, 68, 78, 46, 20); fillStroke(c, fur, 2.5);
    c.beginPath(); c.moveTo(42, 70); c.quadraticCurveTo(58, 34, 76, 66); c.closePath(); fillStroke(c, fur, 2.5);
    // neck + head
    c.beginPath(); c.moveTo(100, 74); c.quadraticCurveTo(122, 66, 112, 40); c.lineTo(124, 34); c.quadraticCurveTo(132, 64, 112, 86); c.closePath(); fillStroke(c, fur, 2.5);
    ellipse(c, 124, 34, 13, 8); fillStroke(c, fur, 2.5);
    c.fillStyle = OUT; circle(c, 124, 30, 2); c.fill();
    c.beginPath(); c.moveTo(114, 26); c.lineTo(112, 20); c.lineTo(118, 24); c.closePath(); fillStroke(c, '#b47a40', 1.8);
    // saddle blanket (sand team colours)
    c.beginPath(); c.moveTo(56, 64); c.lineTo(96, 62); c.lineTo(100, 86); c.lineTo(58, 88); c.closePath(); fillStroke(c, '#c8341e', 2.2);
    c.fillStyle = '#ffd34d'; c.fillRect(58, 82, 41, 4);
    for (let x = 62; x < 98; x += 8) { c.fillStyle = '#ffd34d'; circle(c, x, 90, 2.2); c.fill(); }
    // rider
    rr(c, 70, 38, 20, 28, 7); fillStroke(c, lin(c, 38, 66, '#ffe0a0', '#e0a030'), 2.2);
    c.fillStyle = '#9a5a14'; c.fillRect(70, 52, 20, 4);
    circle(c, 80, 30, 9); fillStroke(c, '#d8a070', 2.2);
    // turban + veil
    c.beginPath(); c.arc(80, 27, 10, Math.PI, 0); c.closePath(); fillStroke(c, '#f4ead0', 2.2);
    c.fillStyle = '#d8443a'; circle(c, 80, 19, 3); c.fill();
    c.fillStyle = '#9a5a14'; rr(c, 72, 31, 16, 6, 3); c.fill();
    c.fillStyle = OUT; circle(c, 83, 28, 1.6); c.fill();
  });
  // Scimitar for the camel rider (held up; origin near the grip)
  tex(scene, 'wpn_scimitar', 30, 60, (c) => {
    c.beginPath(); c.moveTo(12, 44); c.quadraticCurveTo(4, 22, 18, 2); c.quadraticCurveTo(14, 24, 20, 44); c.closePath();
    fillStroke(c, lin(c, 2, 44, '#ffffff', '#b8c4d0'), 2.2);
    rr(c, 6, 43, 18, 5, 2); fillStroke(c, '#ffd34d', 1.8);
    rr(c, 12, 47, 6, 11, 2); fillStroke(c, '#6a4020', 1.8);
  });
  // Dragon (Kingdom 4 boss)
  tex(scene, 'dragon_body', 190, 130, (c) => {
    shadow(c, 92, 124, 60);
    const scale = lin(c, 40, 120, '#b03a3a', '#4a1020');
    const belly = '#f0b060';
    // tail
    c.beginPath(); c.moveTo(56, 82); c.quadraticCurveTo(20, 96, 8, 70); c.quadraticCurveTo(26, 88, 54, 70); c.closePath(); fillStroke(c, scale, 2.5);
    c.beginPath(); c.moveTo(8, 70); c.lineTo(2, 58); c.lineTo(16, 66); c.closePath(); fillStroke(c, '#341250', 2);
    // legs
    for (const x of [64, 110]) { rr(c, x, 88, 16, 30, 6); fillStroke(c, '#7a2030', 2.2); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + 2 + k * 6, 118); c.lineTo(x + 5 + k * 6, 124); c.lineTo(x + 8 + k * 6, 118); c.fillStyle = '#f4ead0'; c.fill(); } }
    // body
    ellipse(c, 92, 80, 46, 26); fillStroke(c, scale, 2.5);
    c.beginPath(); c.ellipse(96, 92, 34, 11, 0, 0, Math.PI); c.fillStyle = belly; c.fill();
    c.strokeStyle = 'rgba(120,60,20,0.5)'; c.lineWidth = 1.4;
    for (let x = 72; x < 124; x += 8) { c.beginPath(); c.moveTo(x, 92); c.lineTo(x + 2, 101); c.stroke(); }
    // back spikes
    for (let k = 0; k < 6; k++) { const x = 56 + k * 12, y = 58 - Math.sin((k / 5) * Math.PI) * 4; c.beginPath(); c.moveTo(x - 5, y + 4); c.lineTo(x, y - 9); c.lineTo(x + 5, y + 4); c.closePath(); fillStroke(c, '#341250', 1.8); }
    // neck
    c.beginPath(); c.moveTo(118, 70); c.quadraticCurveTo(140, 56, 142, 30); c.lineTo(160, 32); c.quadraticCurveTo(156, 70, 130, 92); c.closePath(); fillStroke(c, scale, 2.5);
    // head
    c.beginPath(); c.moveTo(140, 20); c.lineTo(178, 28); c.quadraticCurveTo(188, 34, 178, 42); c.lineTo(146, 46); c.quadraticCurveTo(134, 34, 140, 20); c.closePath(); fillStroke(c, scale, 2.5);
    c.beginPath(); c.moveTo(150, 42); c.lineTo(178, 40); c.stroke();
    c.fillStyle = '#f4ead0'; for (const x of [156, 164, 172]) { c.beginPath(); c.moveTo(x, 41); c.lineTo(x + 2, 46); c.lineTo(x + 4, 41); c.fill(); }
    // horns
    for (const [x, y] of [[144, 22], [152, 20]] as const) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 12, y - 10, x - 16, y - 20); c.quadraticCurveTo(x - 4, y - 12, x + 6, y); c.closePath(); fillStroke(c, '#f4ead0', 2); }
    // glowing eye + nostril
    c.fillStyle = 'rgba(255,220,80,0.5)'; circle(c, 160, 28, 6); c.fill();
    c.fillStyle = '#ffe14d'; ellipse(c, 160, 28, 4, 3); c.fill(); c.fillStyle = OUT; c.fillRect(159, 25.5, 2, 5);
    c.fillStyle = OUT; circle(c, 178, 32, 1.6); c.fill();
  });
  tex(scene, 'dragon_wing', 120, 90, (c) => {
    // root at (16, 82); membrane fans up and back
    c.beginPath(); c.moveTo(16, 82); c.lineTo(40, 6); c.lineTo(116, 20);
    c.quadraticCurveTo(100, 40, 98, 60); c.quadraticCurveTo(84, 54, 74, 70); c.quadraticCurveTo(60, 62, 48, 80); c.closePath();
    fillStroke(c, lin(c, 6, 82, '#d0506a', '#5a1838'), 2.5);
    c.strokeStyle = '#341250'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(16, 82); c.lineTo(40, 6); c.lineTo(116, 20); c.moveTo(40, 6); c.lineTo(98, 60); c.moveTo(40, 6); c.lineTo(74, 70); c.moveTo(40, 6); c.lineTo(48, 80); c.stroke();
    c.fillStyle = '#f4ead0'; c.beginPath(); c.moveTo(38, 8); c.lineTo(36, -2 + 8); c.lineTo(44, 6); c.fill();
  });
  tex(scene, 'fireball', 40, 40, (c) => {
    c.fillStyle = 'rgba(255,120,30,0.35)'; circle(c, 20, 20, 19); c.fill();
    c.fillStyle = rad(c, 20, 20, 14, '#fff6b0', '#ff5a1a'); circle(c, 20, 20, 13); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)'; circle(c, 16, 16, 4); c.fill();
  });
}

// ---------------------------------------------------------------------------
// One crown per kingdom, used for the banner and the graduation ceremony.
export const CROWN_STYLE = [
  { gold: '#ffd34d', dark: '#b07a10', gem: '#3ac060', name: 'Emerald Crown' },
  { gold: '#e6f9ff', dark: '#5aa8d0', gem: '#3fa9e8', name: 'Ice Crown' },
  { gold: '#ffc23a', dark: '#c0601a', gem: '#ff5a2a', name: 'Sun Crown' },
  { gold: '#3a2a3a', dark: '#140810', gem: '#ff3a3a', name: 'Dragon Crown' },
];
function crowns(scene: Phaser.Scene) {
  CROWN_STYLE.forEach((st, i) => {
    tex(scene, `crown_${i}`, 100, 84, (c) => {
      if (i === 2) { // sun rays behind
        c.fillStyle = 'rgba(255,190,60,0.5)';
        for (let k = 0; k < 10; k++) { const a = Math.PI + (k / 9) * Math.PI; c.beginPath(); c.moveTo(50, 50); c.lineTo(50 + Math.cos(a - 0.08) * 48, 50 + Math.sin(a - 0.08) * 48); c.lineTo(50 + Math.cos(a + 0.08) * 48, 50 + Math.sin(a + 0.08) * 48); c.fill(); }
      }
      if (i === 3) { // horns
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50 + s * 30, 44); c.quadraticCurveTo(50 + s * 50, 30, 50 + s * 46, 6); c.quadraticCurveTo(50 + s * 40, 30, 50 + s * 22, 40); c.closePath(); fillStroke(c, '#f4ead0', 2.4); }
      }
      c.beginPath();
      const pts = i === 1
        ? [[12, 70], [12, 34], [24, 50], [32, 14], [42, 44], [50, 4], [58, 44], [68, 14], [76, 50], [88, 34], [88, 70]]
        : [[12, 70], [8, 26], [30, 46], [50, 12], [70, 46], [92, 26], [88, 70]];
      pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
      fillStroke(c, lin(c, 4, 70, st.gold, st.dark), 3);
      rr(c, 10, 62, 80, 14, 5); fillStroke(c, lin(c, 62, 76, st.gold, st.dark), 3);
      for (const x of [26, 50, 74]) { circle(c, x, 69, 4.5); fillStroke(c, st.gem, 1.6); }
      if (i !== 1) for (const [x, y] of pts.slice(1, -1).filter((_, k) => k % 2 === 0)) { circle(c, x, y, 4.5); fillStroke(c, i === 3 ? '#ff3a3a' : '#ffffff', 1.6); }
      circle(c, 50, 46, 7); fillStroke(c, st.gem, 2);
      c.fillStyle = 'rgba(255,255,255,0.55)'; circle(c, 48, 44, 2.4); c.fill();
    });
  });
}

export function generateKingdomArt(scene: Phaser.Scene) {
  grounds(scene);
  decor(scene);
  bosses(scene);
  crowns(scene);
}
