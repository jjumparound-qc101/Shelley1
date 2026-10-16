// Walton's lodging in St. Petersburgh, December (Letter 1): a plain room with a tall window on
// the snowy street, a writing desk and a candle. Placeholder drawings in code; each piece is
// replaced by its AI drawing by name when it arrives (ai['l01/<name>']).
import * as THREE from 'three';
import { paperFlat, halo } from '../stage.js';
import { canvas, texture, hatch, outline, fillPaper, grain, blob, rng, INK, PAPER } from '../ink.js';

// Sized to the AI wall drawings, as the library's rooms are (src/sets/library.js, buildRoom): a
// 3.4 m wall, the 3:2 picture hung 3.9 m high and sunk 0.5 m so its drawn floor meets the stage floor.
export const ROOM = { w: 5.85, d: 6.4, h: 3.4, back: -4.2 };
const DRAWN_H = 3.9, SINK = 0.5;
export const WINDOW = { x0: -0.53, x1: 0.55, y0: 0.67, y1: 3.0 }; // in the back wall, metres: the drawn window's panes (cut out by tools/window_cut.py)
export const DESK = { x: -1.35, z: -2.75 };

const PXM = 120;
// The master drawings use the asset list's names (sets/walton_petersburgh/..., the shared furniture).
const AI_NAME = { wall_back: 'sets/walton_petersburgh/wall_back', wall_left: 'sets/walton_petersburgh/wall_left', wall_right: 'sets/walton_petersburgh/wall_right', street: 'sets/walton_petersburgh/view', desk: 'sets/common/desk', chair: 'sets/common/chair', sledge: 'props/sledge' };
const pick = (ai, name, draw) => ai[`l01/${name}`]?.tex ?? ai[AI_NAME[name]]?.tex ?? texture(draw());

function backWall() {
  const W = ROOM.w * PXM, H = ROOM.h * PXM, { c, g } = canvas(W, H);
  const X = (x) => (x + ROOM.w / 2) * PXM, Y = (y) => (ROOM.h - y) * PXM;
  const all = new Path2D(); all.rect(0, 0, W, H);
  fillPaper(g, all);
  hatch(g, all, { angle: Math.PI / 2, gap: 9, width: 1, seed: 501, alpha: 0.45 }); // striped paper
  hatch(g, all, { angle: 0.9, gap: 6, width: 0.8, seed: 502, alpha: 0.35 });
  // Wainscot and skirting.
  const wain = new Path2D(); wain.rect(0, Y(1.0), W, 1.0 * PXM);
  fillPaper(g, wain); hatch(g, wain, { angle: 0, gap: 5, seed: 503, alpha: 0.6 }); outline(g, wain, 3);
  for (let x = -4; x < 4.2; x += 1.05) { const pnl = new Path2D(); pnl.rect(X(x + 0.12), Y(0.85), 0.8 * PXM, 0.65 * PXM); outline(g, pnl, 2); }
  // A chart of the northern seas, pinned up; and a shelf of books.
  const chart = new Path2D(); chart.rect(X(-3.4), Y(3.4), 1.7 * PXM, 1.2 * PXM);
  fillPaper(g, chart); outline(g, chart, 3);
  g.save(); g.clip(chart); g.strokeStyle = INK; g.lineWidth = 1.5;
  for (let k = 1; k < 5; k++) { g.beginPath(); g.arc(X(-2.55), Y(2.8), k * 22, 0, 7); g.stroke(); }
  for (let a = 0; a < 12; a++) { g.beginPath(); g.moveTo(X(-2.55), Y(2.8)); g.lineTo(X(-2.55) + Math.cos(a / 12 * 7) * 120, Y(2.8) + Math.sin(a / 12 * 7) * 120); g.stroke(); }
  g.restore();
  const shelf = new Path2D(); shelf.rect(X(-1.3), Y(2.6), 1.5 * PXM, 0.1 * PXM); fillPaper(g, shelf); outline(g, shelf, 2.5);
  const r = rng(505);
  for (let x = -1.25; x < 0.15; x += 0.11) {
    const h = 0.32 + r() * 0.14; const b = new Path2D(); b.rect(X(x), Y(2.5 + h), 0.09 * PXM, h * PXM);
    fillPaper(g, b); hatch(g, b, { angle: 1.57, gap: 3, seed: Math.round(x * 100) + 600, alpha: 0.8 }); outline(g, b, 1.5);
  }
  // The window: its frame and glazing bars (the panes are cut out, to show the street).
  const { x0, x1, y0, y1 } = WINDOW;
  const frame = new Path2D(); frame.rect(X(x0 - 0.18), Y(y1 + 0.22), (x1 - x0 + 0.36) * PXM, (y1 - y0 + 0.44) * PXM);
  fillPaper(g, frame); hatch(g, frame, { angle: 0.2, gap: 6, seed: 507, alpha: 0.4 }); outline(g, frame, 3);
  g.clearRect(X(x0), Y(y1), (x1 - x0) * PXM, (y1 - y0) * PXM);
  g.fillStyle = PAPER;
  const bar = 0.05 * PXM;
  for (const fx of [1 / 2]) g.fillRect(X(x0 + (x1 - x0) * fx) - bar / 2, Y(y1), bar, (y1 - y0) * PXM);
  for (const fy of [1 / 3, 2 / 3]) g.fillRect(X(x0), Y(y0 + (y1 - y0) * fy) - bar / 2, (x1 - x0) * PXM, bar);
  g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(X(x0), Y(y1), (x1 - x0) * PXM, (y1 - y0) * PXM);
  const sill = new Path2D(); sill.rect(X(x0 - 0.3), Y(y0), (x1 - x0 + 0.6) * PXM, 0.12 * PXM); fillPaper(g, sill); hatch(g, sill, { angle: 0, gap: 4, seed: 508 }); outline(g, sill, 2.5);
  grain(g, 0.03, 509);
  return c;
}

function sideWall(seed, door) {
  const W = ROOM.d * PXM, H = ROOM.h * PXM, { c, g } = canvas(W, H);
  const all = new Path2D(); all.rect(0, 0, W, H);
  fillPaper(g, all);
  hatch(g, all, { angle: Math.PI / 2, gap: 9, width: 1, seed, alpha: 0.5 });
  hatch(g, all, { angle: -0.9, gap: 5, width: 0.8, seed: seed + 1, alpha: 0.55 }); // in shadow, darker than the back
  const wain = new Path2D(); wain.rect(0, H - 1.0 * PXM, W, 1.0 * PXM); fillPaper(g, wain); hatch(g, wain, { angle: 0, gap: 5, seed: seed + 2, alpha: 0.7 }); outline(g, wain, 3);
  if (door) {
    const d = new Path2D(); d.rect(W * 0.55, H - 2.5 * PXM, 1.1 * PXM, 2.5 * PXM);
    fillPaper(g, d); hatch(g, d, { angle: 1.57, gap: 4, seed: seed + 3, alpha: 0.8 }); outline(g, d, 3);
    for (const yy of [0.3, 1.4]) { const p = new Path2D(); p.rect(W * 0.55 + 18, H - (2.5 - yy) * PXM, 1.1 * PXM - 36, 0.9 * PXM); outline(g, p, 2); }
  }
  grain(g, 0.03, seed + 4);
  return c;
}

function floorTile() {
  const { c, g } = canvas(512, 512);
  g.fillStyle = PAPER; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) {
    const b = new Path2D(); b.rect(i * 128, 0, 128, 512);
    hatch(g, b, { angle: Math.PI / 2, gap: 7 + (i % 2) * 2, width: 0.9, seed: 520 + i, alpha: 0.55 });
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke();
    g.beginPath(); g.moveTo(i * 128, (i * 197) % 512); g.lineTo(i * 128 + 128, (i * 197) % 512); g.stroke();
  }
  grain(g, 0.03, 529);
  return c;
}

function ceiling() {
  const { c, g } = canvas(1024, 800);
  const all = new Path2D(); all.rect(0, 0, 1024, 800);
  fillPaper(g, all); hatch(g, all, { angle: 0, gap: 4, seed: 531, alpha: 0.7 }); hatch(g, all, { angle: 1.2, gap: 6, seed: 532, alpha: 0.5 });
  for (let x = 60; x < 1024; x += 180) { const b = new Path2D(); b.rect(x, 0, 50, 800); fillPaper(g, b); hatch(g, b, { angle: 1.57, gap: 5, seed: 533 + x }); outline(g, b, 2.5); }
  return c;
}

// The street seen through the window: snow on the roofs, a church's onion domes, a winter sky.
function street() {
  const W = 2400, H = 1400, { c, g } = canvas(W, H);
  const all = new Path2D(); all.rect(0, 0, W, H);
  fillPaper(g, all);
  const sky = new Path2D(); sky.rect(0, 0, W, 900);
  hatch(g, sky, { angle: 0, gap: 4, width: 1, seed: 541, alpha: 0.75 }); // a dark winter afternoon
  hatch(g, sky, { angle: 0.05, gap: 7, width: 1, seed: 542, alpha: 0.5 });
  // Domes and a bell tower.
  const ch = new Path2D();
  ch.rect(1080, 480, 380, 520);
  for (const [x, w, y] of [[1270, 150, 300], [1130, 80, 420], [1410, 80, 420]]) {
    ch.moveTo(x - w / 2, y + w * 0.9); ch.bezierCurveTo(x - w * 0.75, y + w * 0.2, x - 4, y + w * 0.1, x, y - w * 0.4);
    ch.bezierCurveTo(x + 4, y + w * 0.1, x + w * 0.75, y + w * 0.2, x + w / 2, y + w * 0.9); ch.closePath();
    ch.rect(x - w * 0.4, y + w * 0.9, w * 0.8, 200);
  }
  fillPaper(g, ch); hatch(g, ch, { angle: 1.57, gap: 5, seed: 543, alpha: 0.6 }); outline(g, ch, 3);
  for (const [x, y] of [[1270, 255], [1130, 385], [1410, 385]]) { g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 60); g.moveTo(x - 18, y - 40); g.lineTo(x + 18, y - 40); g.stroke(); }
  // Houses along the far side of the street, snow on their roofs.
  const r = rng(545);
  for (let x = -40; x < W; ) {
    const w = 220 + r() * 160, h = 380 + r() * 240;
    if (x + w > 1060 && x < 1480) { x = 1480; continue; }
    const hs = new Path2D(); hs.rect(x, 1000 - h, w, h);
    fillPaper(g, hs); hatch(g, hs, { angle: 1.1, gap: 5, seed: Math.round(x) + 546, alpha: 0.7 }); outline(g, hs, 3);
    const roof = new Path2D(); roof.moveTo(x - 10, 1000 - h); roof.lineTo(x + w / 2, 1000 - h - 90); roof.lineTo(x + w + 10, 1000 - h); roof.closePath();
    fillPaper(g, roof); outline(g, roof, 2.5);
    for (let wy = 1000 - h + 60; wy < 900; wy += 120) for (let wx = x + 30; wx < x + w - 50; wx += 80) { const wn = new Path2D(); wn.rect(wx, wy, 34, 56); g.save(); g.fillStyle = INK; g.globalAlpha = 0.85; g.fill(wn); g.restore(); }
    x += w + 10;
  }
  // The snowy street.
  const road = new Path2D(); road.rect(0, 1000, W, 400); fillPaper(g, road);
  hatch(g, road, { angle: 0.02, gap: 14, width: 0.8, seed: 547, alpha: 0.35 });
  outline(g, road, 2);
  grain(g, 0.04, 549);
  return c;
}

// A sledge and its horse, passing in the street ("They fly quickly over the snow in their sledges").
export function sledgeArt() {
  const W = 900, H = 420, { c, g } = canvas(W, H);
  const horse = new Path2D();
  horse.moveTo(40, 230); horse.quadraticCurveTo(60, 120, 150, 110); horse.lineTo(190, 60); horse.lineTo(215, 85); horse.lineTo(200, 140);
  horse.quadraticCurveTo(330, 150, 380, 200); horse.lineTo(385, 330); horse.lineTo(360, 330); horse.lineTo(350, 250); horse.lineTo(230, 250); horse.lineTo(220, 330); horse.lineTo(195, 330); horse.lineTo(190, 240); horse.closePath();
  fillPaper(g, horse); hatch(g, horse, { angle: 0.9, gap: 4, seed: 561, alpha: 0.85 }); outline(g, horse, 3);
  const arc = new Path2D(); arc.moveTo(170, 140); arc.quadraticCurveTo(210, 20, 260, 140); g.save(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke(arc); g.restore();
  const body = new Path2D(); body.moveTo(470, 180); body.lineTo(800, 160); body.quadraticCurveTo(860, 170, 850, 300); body.lineTo(480, 300); body.closePath();
  fillPaper(g, body); hatch(g, body, { angle: 0.2, gap: 4, seed: 562, alpha: 0.7 }); outline(g, body, 3);
  const runner = new Path2D(); runner.moveTo(440, 340); runner.lineTo(860, 340); runner.quadraticCurveTo(900, 330, 880, 290);
  g.save(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke(runner); g.beginPath(); g.moveTo(380, 230); g.lineTo(480, 240); g.stroke(); g.restore();
  // The driver, wrapped in furs.
  const man = blob(700, 130, 70, 85, 563, 8, 0.15); fillPaper(g, man); hatch(g, man, { angle: 1.3, gap: 3, seed: 564 }); outline(g, man, 3);
  const cap = blob(705, 40, 40, 30, 565, 7, 0.2); fillPaper(g, cap); hatch(g, cap, { angle: 0.4, gap: 3, seed: 566 }); outline(g, cap, 2.5);
  grain(g, 0.03, 569);
  return c;
}

function desk() {
  const W = 1000, H = 560, { c, g } = canvas(W, H);
  const top = new Path2D(); top.rect(20, 120, 960, 60); fillPaper(g, top); hatch(g, top, { angle: 0, gap: 5, seed: 571, alpha: 0.6 }); outline(g, top, 3);
  const front = new Path2D(); front.rect(60, 180, 880, 220); fillPaper(g, front); hatch(g, front, { angle: 1.57, gap: 6, seed: 572, alpha: 0.6 }); outline(g, front, 3);
  for (const x of [120, 560]) { const dr = new Path2D(); dr.rect(x, 210, 320, 70); outline(g, dr, 2); g.beginPath(); g.arc(x + 160, 245, 8, 0, 7); g.fillStyle = INK; g.fill(); }
  for (const x of [80, 880]) { const lg = new Path2D(); lg.rect(x, 400, 40, 160); fillPaper(g, lg); hatch(g, lg, { angle: 1.57, gap: 4, seed: x + 573 }); outline(g, lg, 2.5); }
  // The letter, an inkstand and a quill.
  const paper = new Path2D(); paper.moveTo(380, 120); paper.lineTo(640, 120); paper.lineTo(620, 92); paper.lineTo(400, 92); paper.closePath(); fillPaper(g, paper); outline(g, paper, 2);
  const ink = new Path2D(); ink.rect(720, 70, 70, 52); fillPaper(g, ink); hatch(g, ink, { angle: 0.8, gap: 3, seed: 575 }); outline(g, ink, 2.5);
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(755, 72); g.quadraticCurveTo(790, 10, 830, 0); g.stroke();
  grain(g, 0.03, 579);
  return c;
}

function candle() {
  const W = 120, H = 360, { c, g } = canvas(W, H);
  const stick = new Path2D(); stick.ellipse(60, 340, 50, 14, 0, 0, 7); stick.rect(48, 230, 24, 110); fillPaper(g, stick); hatch(g, stick, { angle: 1.4, gap: 3, seed: 581 }); outline(g, stick, 2.5);
  const wax = new Path2D(); wax.rect(46, 110, 28, 120); fillPaper(g, wax); outline(g, wax, 2.5);
  const flame = new Path2D(); flame.moveTo(60, 20); flame.quadraticCurveTo(84, 80, 60, 104); flame.quadraticCurveTo(36, 80, 60, 20); fillPaper(g, flame); outline(g, flame, 2);
  return c;
}

function chair() {
  const W = 360, H = 700, { c, g } = canvas(W, H);
  const back = new Path2D(); back.rect(40, 20, 280, 380); back.rect(70, 50, 220, 320);
  g.save(); g.fillStyle = PAPER; g.fill(back, 'evenodd'); g.restore(); hatch(g, back, { angle: 1.57, gap: 4, seed: 591 }); outline(g, back, 3);
  return c;
}

// Snow falling outside the window, between the glass and the street.
function snow(group) {
  const N = 260, pos = new Float32Array(N * 3), r = rng(601);
  for (let i = 0; i < N; i++) { pos[i * 3] = WINDOW.x0 - 1.5 + r() * (WINDOW.x1 - WINDOW.x0 + 3); pos[i * 3 + 1] = r() * 5; pos[i * 3 + 2] = ROOM.back - 0.4 - r() * 2.4; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fbf8f0', size: 0.035, fog: false }));
  group.add(pts);
  const base = pos.slice();
  return (t) => {
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 1] = ((base[i * 3 + 1] - t * (0.35 + (i % 5) * 0.05)) % 5 + 5) % 5;
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.7 + i) * 0.08;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

export function buildLodging(group, ai = {}) {
  const { w, d, h, back } = ROOM;
  // The shared boards floor, repeated every 2.4 m (as in the library's rooms), else the drawn tile.
  const boards = ai['l01/floor']?.tex ?? ai['sets/common/floor_boards']?.tex;
  const geo = new THREE.PlaneGeometry(w, d);
  if (boards) { boards.wrapS = boards.wrapT = THREE.RepeatWrapping; const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2.4, uv.getY(i) * d / 2.4); }
  const floor = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: boards ?? texture(floorTile(), { repeat: [w / 1.6, d / 1.6] }) }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, back + d / 2); group.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: pick(ai, 'ceiling', ceiling) }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, h, back + d / 2); group.add(ceil);
  const drawn = (name) => !!(ai[`l01/${name}`] ?? ai[AI_NAME[name]]);
  const bw = paperFlat(pick(ai, 'wall_back', backWall), w, drawn('wall_back') ? DRAWN_H : h, { edge: false });
  bw.position.set(0, drawn('wall_back') ? -SINK : 0, back); group.add(bw);
  for (const s of [-1, 1]) {
    const n = s < 0 ? 'wall_left' : 'wall_right';
    const sw = paperFlat(pick(ai, n, () => sideWall(510 + s * 7, s > 0)), d, drawn(n) ? DRAWN_H : h, { edge: false });
    sw.rotation.y = -s * Math.PI / 2; sw.position.set(s * w / 2, drawn(n) ? -SINK : 0, back + d / 2); group.add(sw);
  }
  const st = paperFlat(pick(ai, 'street', street), 9, 9 * 755 / 1062, { edge: false, opaque: true }); // the AI view, cropped to 1062 x 755 (tools/window_cut.py)
  st.position.set((WINDOW.x0 + WINDOW.x1) / 2, -0.6, back - 3.0); group.add(st); // the road just below the sill line
  const sledge = paperFlat(pick(ai, 'sledge', sledgeArt), 1.9, 1.9 * 420 / 900, { edge: false });
  sledge.position.set(-6, 0.5, back - 2.4); sledge.visible = false; group.add(sledge);
  // The AI desk and chair keep their drawn shape: the desk 1.15 m high to the top of its candle,
  // its writing top at 0.76 m (it was squashed into the code desk's box, its top too low to write at).
  const aiDesk = !!(ai['l01/desk'] ?? ai[AI_NAME.desk]), deskA = (ai['l01/desk'] ?? ai[AI_NAME.desk])?.aspect ?? 1;
  const chairA = (ai['l01/chair'] ?? ai[AI_NAME.chair])?.aspect ?? 0.57;
  const chairFlat = aiDesk ? paperFlat(pick(ai, 'chair', chair), 1.0 * chairA, 1.0) : paperFlat(pick(ai, 'chair', chair), 0.62, 1.2);
  chairFlat.position.set(DESK.x, 0, DESK.z - 0.55); group.add(chairFlat);
  const deskFlat = aiDesk ? paperFlat(pick(ai, 'desk', desk), 1.15 * deskA, 1.15) : paperFlat(pick(ai, 'desk', desk), 1.75, 0.98);
  deskFlat.position.set(DESK.x, 0, DESK.z); group.add(deskFlat);
  // The drawn desk has its own candle (at its right); the code candle stands in only without it.
  const flame = aiDesk ? [DESK.x + 0.3 * 1.15 * deskA, 1.06] : [DESK.x - 0.55, 1.12];
  if (!aiDesk) { const candleFlat = paperFlat(pick(ai, 'candle', candle), 0.1, 0.3, { edge: false }); candleFlat.position.set(DESK.x - 0.55, 0.87, DESK.z - 0.05); group.add(candleFlat); }
  const glow = halo('#fff6dd', 0.9, 0.55); glow.position.set(flame[0], flame[1], DESK.z - 0.08); group.add(glow);
  const fall = snow(group);
  return {
    sledge, glow, desk: deskFlat, chair: chairFlat,
    update(t) { fall(t); glow.material.opacity = 0.5 + 0.06 * Math.sin(t * 7.3) * Math.sin(t * 3.1); },
    bounds: { minX: -3.6, maxX: 3.6, minZ: -3.6, maxZ: 1.6 },
    hotspots: [
      { id: 'letter', pos: new THREE.Vector3(DESK.x, 0.8, DESK.z), title: 'The letter',
        text: '“You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.”' },
      { id: 'window', pos: new THREE.Vector3((WINDOW.x0 + WINDOW.x1) / 2, 1.8, back + 0.1), title: 'The window',
        text: '“I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight.”' },
      { id: 'chart', pos: new THREE.Vector3(-2.55, 2.8, back + 0.1), title: 'A chart of the northern seas',
        text: '“I have read with ardour the accounts of the various voyages which have been made in the prospect of arriving at the North Pacific Ocean through the seas which surround the pole.”' },
    ],
  };
}
