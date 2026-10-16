// A library of sets drawn in code, configured per scene (src/scenes/data/*.js), so every section
// of the book can be staged before its art exists. Two kinds:
//   room:    { kind: 'room', wall, floor, window, door, fire, furniture: [...], view, light }
//   outdoor: { kind: 'outdoor', ground, far, mid: [...], weather, light }
// Every piece is replaced by its AI drawing when one with the scene's art name arrives
// (ai['sets/<art>/<piece>'], e.g. 'sets/geneva_parlour/wall_back'); see tools/assets_master.mjs.
// Each set returns named marks (where people stand) and named shots.
import * as THREE from 'three';
import { paperFlat, halo, tiled } from '../stage.js';
import { canvas, texture, hatch, outline, fillPaper, grain, blob, rng, INK, PAPER } from '../ink.js';

const PXM = 100;

// ---- Drawing helpers ---------------------------------------------------------------------

function wallArt(w, h, { wall = 'plaster', window, door, fire, shelf, seed = 1, shade = 0 }) {
  const W = Math.round(w * PXM), H = Math.round(h * PXM), { c, g } = canvas(W, H);
  const X = (x) => (x + w / 2) * PXM, Y = (y) => (h - y) * PXM;
  const all = new Path2D(); all.rect(0, 0, W, H); fillPaper(g, all);
  if (wall === 'stone' || wall === 'cell') {
    const r = rng(seed);
    for (let y = 0; y < h; y += 0.4) for (let x = -w / 2 - (y * 5 % 0.6); x < w / 2; x += 0.6 + r() * 0.3) {
      const st = new Path2D(); st.rect(X(x) + 3, Y(y + 0.4) + 3, 0.55 * PXM, 0.36 * PXM);
      hatch(g, st, { angle: 0.8 + r() * 0.3, gap: wall === 'cell' ? 4 : 6, seed: seed + Math.round(x * 10 + y * 100), alpha: 0.6 }); outline(g, st, 1.5);
    }
  } else if (wall === 'rough' || wall === 'timber') {
    hatch(g, all, { angle: 1.4, gap: 6, seed, alpha: 0.55 });
    for (let x = -w / 2; x < w / 2; x += 1.4) { const b = new Path2D(); b.rect(X(x), 0, 0.22 * PXM, H); fillPaper(g, b); hatch(g, b, { angle: 1.57, gap: 4, seed: seed + x * 10 }); outline(g, b, 2.5); }
    const beam = new Path2D(); beam.rect(0, Y(h - 0.3), W, 0.25 * PXM); fillPaper(g, beam); hatch(g, beam, { angle: 0, gap: 4, seed: seed + 3 }); outline(g, beam, 2.5);
  } else if (wall === 'panel' || wall === 'court') {
    hatch(g, all, { angle: Math.PI / 2, gap: 8, seed, alpha: 0.45 });
    for (let x = -w / 2 + 0.15; x < w / 2 - 0.5; x += 1.1) for (const [y0, y1] of [[0.2, 1.1], [1.4, h - 0.4]]) { const p = new Path2D(); p.rect(X(x), Y(y1), 0.9 * PXM, (y1 - y0) * PXM); outline(g, p, 2); }
  } else {
    hatch(g, all, { angle: Math.PI / 2, gap: 9, seed, alpha: 0.4 });
    hatch(g, all, { angle: 0.9, gap: 6, width: 0.8, seed: seed + 1, alpha: 0.3 });
    const wain = new Path2D(); wain.rect(0, Y(1.0), W, 1.0 * PXM); fillPaper(g, wain); hatch(g, wain, { angle: 0, gap: 5, seed: seed + 2, alpha: 0.6 }); outline(g, wain, 3);
  }
  if (shade) hatch(g, all, { angle: -0.9, gap: 5, seed: seed + 9, alpha: shade });
  if (shelf) {
    const s = new Path2D(); s.rect(X(shelf - 0.8), Y(2.4), 1.6 * PXM, 0.08 * PXM); fillPaper(g, s); outline(g, s, 2);
    const r = rng(seed + 4);
    for (let x = shelf - 0.75; x < shelf + 0.75; x += 0.1) { const hh = 0.28 + r() * 0.14; const b = new Path2D(); b.rect(X(x), Y(2.4 + hh), 0.085 * PXM, hh * PXM); fillPaper(g, b); hatch(g, b, { angle: 1.57, gap: 3, seed: seed + Math.round(x * 100) }); outline(g, b, 1.4); }
  }
  if (fire !== undefined && fire !== null) {
    const f = new Path2D(); f.rect(X(fire - 0.8), Y(1.5), 1.6 * PXM, 1.5 * PXM); fillPaper(g, f); hatch(g, f, { angle: 0.4, gap: 6, seed: seed + 5, alpha: 0.5 }); outline(g, f, 3);
    const o = new Path2D(); o.rect(X(fire - 0.5), Y(1.0), 1.0 * PXM, 1.0 * PXM); g.save(); g.fillStyle = 'rgba(23,20,15,0.9)'; g.fill(o); g.restore();
    const fl = blob(X(fire), Y(0.25), 32, 22, seed + 6, 6, 0.4); fillPaper(g, fl); outline(g, fl, 1.5);
    const m = new Path2D(); m.rect(X(fire - 0.95), Y(1.6), 1.9 * PXM, 0.12 * PXM); fillPaper(g, m); outline(g, m, 2.5);
  }
  if (door !== undefined && door !== null) {
    const d = new Path2D(); d.rect(X(door - 0.55), Y(2.4), 1.1 * PXM, 2.4 * PXM); fillPaper(g, d); hatch(g, d, { angle: 1.57, gap: 4, seed: seed + 7, alpha: 0.8 }); outline(g, d, 3);
    for (const yy of [0.25, 1.35]) { const p = new Path2D(); p.rect(X(door - 0.4), Y(yy + 0.9), 0.8 * PXM, 0.9 * PXM); outline(g, p, 2); }
  }
  if (window) {
    const [x0, x1, y0, y1] = window;
    const fr = new Path2D(); fr.rect(X(x0 - 0.15), Y(y1 + 0.18), (x1 - x0 + 0.3) * PXM, (y1 - y0 + 0.36) * PXM); fillPaper(g, fr); outline(g, fr, 3);
    g.clearRect(X(x0), Y(y1), (x1 - x0) * PXM, (y1 - y0) * PXM);
    g.fillStyle = PAPER; const bar = 5;
    g.fillRect((X(x0) + X(x1)) / 2 - bar / 2, Y(y1), bar, (y1 - y0) * PXM);
    for (const k of [1 / 3, 2 / 3]) g.fillRect(X(x0), Y(y0 + (y1 - y0) * k) - bar / 2, (x1 - x0) * PXM, bar);
    if (wall === 'cell') for (let x = x0 + 0.12; x < x1; x += 0.16) g.fillRect(X(x) - 3, Y(y1), 6, (y1 - y0) * PXM);
    g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(X(x0), Y(y1), (x1 - x0) * PXM, (y1 - y0) * PXM);
  }
  grain(g, 0.03, seed + 8);
  return c;
}

const GROUNDS = {
  boards: (g) => { for (let i = 0; i < 4; i++) { const b = new Path2D(); b.rect(i * 128, 0, 128, 512); hatch(g, b, { angle: Math.PI / 2, gap: 7 + (i % 2) * 2, seed: 520 + i, alpha: 0.55 }); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); } },
  flags: (g) => { for (let y = 0; y < 512; y += 128) for (let x = (y / 128) % 2 * 64 - 64; x < 512; x += 128) { const s = new Path2D(); s.rect(x + 3, y + 3, 122, 122); hatch(g, s, { angle: 0.8, gap: 7, seed: x + y, alpha: 0.45 }); outline(g, s, 2); } },
  earth: (g) => { const a = new Path2D(); a.rect(0, 0, 512, 512); hatch(g, a, { angle: 0.3, gap: 7, seed: 541, alpha: 0.5 }); hatch(g, a, { angle: -0.4, gap: 11, seed: 542, alpha: 0.35 }); },
  straw: (g) => { const a = new Path2D(); a.rect(0, 0, 512, 512); const r = rng(543); g.strokeStyle = INK; for (let i = 0; i < 700; i++) { const x = r() * 512, y = r() * 512, t = r() * 6; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * 26, y + Math.sin(t) * 26); g.stroke(); } },
  grass: (g) => { const r = rng(544); g.strokeStyle = INK; for (let i = 0; i < 1600; i++) { const x = r() * 512, y = r() * 512; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2, y - 6, x + (r() - 0.5) * 6, y - 12); g.stroke(); } },
  snow: (g) => { const a = new Path2D(); a.rect(0, 0, 512, 512); hatch(g, a, { angle: 0.05, gap: 22, width: 0.8, seed: 545, alpha: 0.25 }); },
  ice: (g) => { const a = new Path2D(); a.rect(0, 0, 512, 512); hatch(g, a, { angle: 0.02, gap: 12, width: 0.8, seed: 546, alpha: 0.3 }); const r = rng(547); g.strokeStyle = INK; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); } },
  rock: (g) => { const r = rng(548); for (let i = 0; i < 14; i++) { const b = blob(r() * 512, r() * 512, 50 + r() * 50, 30 + r() * 30, 549 + i, 7, 0.3); fillPaper(g, b); hatch(g, b, { angle: 0.9, gap: 5, seed: 550 + i, alpha: 0.6 }); outline(g, b, 2); } },
  sand: (g) => { const r = rng(551); g.fillStyle = INK; for (let i = 0; i < 2500; i++) g.fillRect(r() * 512, r() * 512, 1.6, 1.6); },
  street: (g) => { for (let y = 0; y < 512; y += 64) for (let x = (y / 64) % 2 * 32; x < 512; x += 64) { const s = blob(x + 32, y + 32, 28, 26, x * 7 + y, 6, 0.15); hatch(g, s, { angle: 0.7, gap: 6, seed: x + y, alpha: 0.4 }); outline(g, s, 1.6); } },
  water: (g) => { for (let y = 8; y < 512; y += 16) { g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x / 40 + y) * 3); g.stroke(); } },
  deck: (g) => { for (let i = 0; i < 8; i++) { const b = new Path2D(); b.rect(0, i * 64, 512, 64); hatch(g, b, { angle: 0, gap: 8, seed: 552 + i, alpha: 0.45 }); g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); } },
};

function groundTex(kind, rep) {
  const { c, g } = canvas(512, 512); g.fillStyle = PAPER; g.fillRect(0, 0, 512, 512);
  (GROUNDS[kind] ?? GROUNDS.earth)(g); grain(g, 0.03, 559);
  return texture(c, { repeat: rep });
}

// Far scenery on one long strip (sky included unless `noSky`).
function farArt(kind, weather, { noSky = false } = {}) {
  const W = 3000, H = 1200, { c, g } = canvas(W, H);
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const sky = new Path2D(); sky.rect(0, 0, W, 760);
  const darkSky = weather === 'night' || weather === 'storm' || weather === 'moon';
  if (!noSky) {
    hatch(g, sky, { angle: 0, gap: darkSky ? 3.5 : 9, seed: 601, alpha: darkSky ? 0.85 : 0.35 });
    if (darkSky) hatch(g, sky, { angle: 0.05, gap: 5, seed: 602, alpha: 0.6 });
    if (weather === 'moon') { const m = new Path2D(); m.arc(2300, 200, 70, 0, 7); g.save(); g.fillStyle = PAPER; g.fill(m); g.restore(); outline(g, m, 2); }
    if (weather === 'storm' || weather === 'clouds') for (let i = 0; i < 6; i++) { const cl = blob(250 + i * 520, 180 + (i % 2) * 120, 260, 90, 603 + i, 10, 0.3); fillPaper(g, cl); hatch(g, cl, { angle: 0.15, gap: darkSky ? 4 : 6, seed: 610 + i, alpha: 0.7 }); outline(g, cl, 1.6); }
  }
  const r = rng(620);
  const land = new Path2D();
  if (kind === 'alps' || kind === 'glacier') {
    land.moveTo(0, H);
    for (let x = 0; x <= W; x += 150) land.lineTo(x, 760 - (x % 600 < 300 ? 400 : 220) * (0.6 + r() * 0.6));
    land.lineTo(W, H); land.closePath(); fillPaper(g, land);
    hatch(g, land, { angle: 1.1, gap: 6, seed: 621, alpha: 0.55 });
    for (let x = 0; x <= W; x += 150) { const sn = new Path2D(); sn.moveTo(x - 60, 760 - 200); sn.lineTo(x, 760 - 420); sn.lineTo(x + 60, 760 - 200); sn.closePath(); fillPaper(g, sn); }
    outline(g, land, 2.5);
  } else if (kind === 'sea' || kind === 'ice' || kind === 'lake') {
    land.rect(0, 760, W, H - 760); fillPaper(g, land);
    hatch(g, land, { angle: 0, gap: kind === 'ice' ? 14 : 6, seed: 622, alpha: 0.6 });
    if (kind === 'ice') for (let i = 0; i < 14; i++) { const fl = new Path2D(); const x = r() * W, y = 780 + r() * 300, w = 80 + r() * 200; fl.moveTo(x, y); fl.lineTo(x + w * 0.2, y - 50 - r() * 80); fl.lineTo(x + w * 0.7, y - 30); fl.lineTo(x + w, y); fl.closePath(); fillPaper(g, fl); outline(g, fl, 2); }
    if (kind === 'lake') { const mt = new Path2D(); mt.moveTo(0, 760); for (let x = 0; x <= W; x += 100) mt.lineTo(x, 760 - 180 - 120 * Math.abs(Math.sin(x / 400))); mt.lineTo(W, 760); mt.closePath(); fillPaper(g, mt); hatch(g, mt, { angle: 1, gap: 6, seed: 623, alpha: 0.6 }); outline(g, mt, 2.5); }
  } else if (kind === 'town') {
    for (let x = -40; x < W;) { const w = 150 + r() * 200, h = 200 + r() * 300; const hs = new Path2D(); hs.rect(x, 760 - h, w, h + 440); fillPaper(g, hs); hatch(g, hs, { angle: 1.1, gap: 5, seed: Math.round(x), alpha: 0.6 }); outline(g, hs, 2.5); const roof = new Path2D(); roof.moveTo(x - 8, 760 - h); roof.lineTo(x + w / 2, 760 - h - 80); roof.lineTo(x + w + 8, 760 - h); roof.closePath(); fillPaper(g, roof); outline(g, roof, 2.5); if (r() < 0.12) { const sp = new Path2D(); sp.moveTo(x + w / 2 - 30, 760 - h - 60); sp.lineTo(x + w / 2, 760 - h - 300); sp.lineTo(x + w / 2 + 30, 760 - h - 60); sp.closePath(); fillPaper(g, sp); outline(g, sp, 2.5); } x += w + 6; }
  } else if (kind === 'forest') {
    for (let i = 0; i < 40; i++) { const x = r() * W, h = 300 + r() * 250; const t = blob(x, 760 - h * 0.6, 120, h * 0.55, 630 + i, 9, 0.3); fillPaper(g, t); hatch(g, t, { angle: 0.8 + r() * 0.3, gap: 4, seed: 640 + i, alpha: 0.7 }); outline(g, t, 2); }
    land.rect(0, 740, W, H - 740); fillPaper(g, land); hatch(g, land, { angle: 0.2, gap: 7, seed: 624, alpha: 0.4 });
  } else { // hills
    land.moveTo(0, H); for (let x = 0; x <= W; x += 40) land.lineTo(x, 680 - 60 * Math.sin(x / 300) - 30 * Math.sin(x / 110)); land.lineTo(W, H); land.closePath();
    fillPaper(g, land); hatch(g, land, { angle: -0.2, gap: 6, seed: 625, alpha: 0.5 }); outline(g, land, 2);
  }
  grain(g, 0.035, 629);
  return c;
}

// Mid-ground pieces for outdoor sets: name -> [draw(), width m, height m].
const MID = {
  trees: () => [(() => { const { c, g } = canvas(700, 900); const tr = new Path2D(); tr.rect(320, 450, 60, 450); fillPaper(g, tr); hatch(g, tr, { angle: 1.57, gap: 4, seed: 701 }); outline(g, tr, 3); const cr = blob(350, 300, 320, 280, 702, 11, 0.25); fillPaper(g, cr); hatch(g, cr, { angle: 0.8, gap: 4, seed: 703, alpha: 0.75 }); outline(g, cr, 3); grain(g, 0.03, 704); return c; })(), 4.6, 5.9],
  cottage: () => [(() => { const { c, g } = canvas(1000, 760); const wl = new Path2D(); wl.rect(100, 320, 800, 440); fillPaper(g, wl); hatch(g, wl, { angle: 1.4, gap: 6, seed: 711, alpha: 0.5 }); outline(g, wl, 3); const rf = new Path2D(); rf.moveTo(40, 340); rf.lineTo(500, 40); rf.lineTo(960, 340); rf.closePath(); fillPaper(g, rf); hatch(g, rf, { angle: 0.5, gap: 4, seed: 712, alpha: 0.7 }); outline(g, rf, 3); for (const [x, y, w, h] of [[220, 450, 120, 120], [660, 450, 120, 120], [440, 520, 120, 240]]) { const o = new Path2D(); o.rect(x, y, w, h); g.save(); g.fillStyle = 'rgba(23,20,15,0.85)'; g.fill(o); g.restore(); } grain(g, 0.03, 713); return c; })(), 6, 4.6],
  hovel: () => [(() => { const { c, g } = canvas(600, 420); const h = new Path2D(); h.moveTo(0, 420); h.lineTo(40, 140); h.lineTo(560, 220); h.lineTo(600, 420); h.closePath(); fillPaper(g, h); hatch(g, h, { angle: 0.4, gap: 4, seed: 721, alpha: 0.7 }); outline(g, h, 3); grain(g, 0.03, 722); return c; })(), 3.4, 2.4],
  church: () => [(() => { const { c, g } = canvas(700, 1100); const b = new Path2D(); b.rect(150, 450, 400, 650); b.moveTo(250, 450); b.lineTo(350, 60); b.lineTo(450, 450); fillPaper(g, b); hatch(g, b, { angle: 1.57, gap: 5, seed: 731, alpha: 0.55 }); outline(g, b, 3); grain(g, 0.03, 732); return c; })(), 3.5, 5.5],
  rocks: () => [(() => { const { c, g } = canvas(900, 500); for (let i = 0; i < 5; i++) { const b = blob(120 + i * 170, 330, 140, 150 - i * 10, 741 + i, 8, 0.35); fillPaper(g, b); hatch(g, b, { angle: 0.9, gap: 5, seed: 745 + i, alpha: 0.7 }); outline(g, b, 3); } grain(g, 0.03, 749); return c; })(), 6, 3.3],
  boat: () => [(() => { const { c, g } = canvas(900, 400); const h = new Path2D(); h.moveTo(20, 200); h.lineTo(880, 200); h.lineTo(780, 360); h.lineTo(120, 360); h.closePath(); fillPaper(g, h); hatch(g, h, { angle: 0.15, gap: 4, seed: 751 }); outline(g, h, 3); g.lineWidth = 6; g.strokeStyle = INK; g.beginPath(); g.moveTo(450, 200); g.lineTo(450, 0); g.stroke(); grain(g, 0.03, 752); return c; })(), 4.5, 2],
  ship: () => [(() => { const { c, g } = canvas(1400, 1200); const h = new Path2D(); h.moveTo(40, 900); h.lineTo(1360, 900); h.lineTo(1250, 1150); h.lineTo(150, 1150); h.closePath(); fillPaper(g, h); hatch(g, h, { angle: 0.1, gap: 4, seed: 761 }); outline(g, h, 3); for (const x of [450, 950]) { g.lineWidth = 9; g.beginPath(); g.moveTo(x, 900); g.lineTo(x, 60); g.stroke(); for (const y of [220, 480]) { g.lineWidth = 5; g.beginPath(); g.moveTo(x - 200, y); g.lineTo(x + 200, y); g.stroke(); } } g.lineWidth = 1.5; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(450 + (k - 4) * 25, 900); g.lineTo(450, 80); g.stroke(); } grain(g, 0.03, 762); return c; })(), 9, 7.7],
  glacier: () => [(() => { const { c, g } = canvas(1600, 500); const ic = new Path2D(); ic.moveTo(0, 500); for (let x = 0; x <= 1600; x += 80) ic.lineTo(x, 200 + 80 * Math.sin(x / 130) + (x % 160 ? 40 : 0)); ic.lineTo(1600, 500); ic.closePath(); fillPaper(g, ic); hatch(g, ic, { angle: 0.05, gap: 12, seed: 771, alpha: 0.4 }); outline(g, ic, 3); grain(g, 0.03, 772); return c; })(), 12, 3.8],
  wall: () => [(() => { const { c, g } = canvas(1200, 400); const w = new Path2D(); w.rect(0, 60, 1200, 340); fillPaper(g, w); hatch(g, w, { angle: 0.8, gap: 6, seed: 781, alpha: 0.6 }); outline(g, w, 3); grain(g, 0.03, 782); return c; })(), 8, 2.6],
  gate: () => [(() => { const { c, g } = canvas(800, 900); const a = new Path2D(); a.rect(0, 0, 800, 900); a.moveTo(200, 900); a.lineTo(200, 400); a.quadraticCurveTo(400, 150, 600, 400); a.lineTo(600, 900); g.save(); g.fillStyle = PAPER; g.fill(a, 'evenodd'); g.restore(); hatch(g, a, { angle: 0.8, gap: 6, seed: 791 }); outline(g, a, 3); grain(g, 0.03, 792); return c; })(), 5, 5.6],
};

// Furniture and fittings for rooms: name -> [draw(), width m, height m, default spot {x, z}].
function furniturePiece(name) {
  const box = (W, H, draw) => { const { c, g } = canvas(W, H); draw(g, W, H); grain(g, 0.03, W + H); return c; };
  const solid = (g, p, s, gap = 5) => { fillPaper(g, p); hatch(g, p, { angle: 1.57, gap, seed: s, alpha: 0.6 }); outline(g, p, 3); };
  const table = (g, W, H, s) => { const t = new Path2D(); t.rect(10, H * 0.2, W - 20, H * 0.1); solid(g, t, s, 4); for (const x of [40, W - 70]) { const l = new Path2D(); l.rect(x, H * 0.3, 30, H * 0.7); solid(g, l, s + 1); } };
  const P = {
    desk: [box(1000, 560, (g, W, H) => { table(g, W, H, 801); const f = new Path2D(); f.rect(60, H * 0.3, W - 120, H * 0.4); solid(g, f, 802); const p = new Path2D(); p.rect(400, H * 0.13, 220, H * 0.07); fillPaper(g, p); outline(g, p, 2); }), 1.75, 0.98, { x: -1.9, z: -2.75 }],
    table: [box(1100, 440, (g, W, H) => table(g, W, H, 811)), 2.0, 0.8, { x: 0, z: -2.2 }],
    chair: [box(360, 700, (g) => { const b = new Path2D(); b.rect(40, 20, 280, 380); b.rect(70, 50, 220, 320); g.save(); g.fillStyle = PAPER; g.fill(b, 'evenodd'); g.restore(); outline(g, b, 3); const s = new Path2D(); s.rect(30, 400, 300, 40); solid(g, s, 821); for (const x of [40, 290]) { const l = new Path2D(); l.rect(x, 440, 26, 260); solid(g, l, 822); } }), 0.6, 1.15, { x: 1.2, z: -2.4 }],
    bed: [box(1200, 600, (g, W, H) => { const f = new Path2D(); f.rect(20, 240, W - 40, 220); solid(g, f, 831); const hb = new Path2D(); hb.rect(0, 40, 120, 560); solid(g, hb, 832, 4); const sh = new Path2D(); sh.moveTo(120, 240); sh.quadraticCurveTo(600, 170, W - 20, 240); sh.closePath(); fillPaper(g, sh); outline(g, sh, 2); }), 2.1, 1.05, { x: 1.6, z: -3.0 }],
    bench: [box(1100, 300, (g, W, H) => table(g, W, H * 1.4, 841)), 2.2, 0.55, { x: 0, z: -1.6 }],
    shelf: [box(900, 1500, (g, W, H) => { const f = new Path2D(); f.rect(20, 20, W - 40, H - 40); solid(g, f, 851, 6); const r = rng(852); for (let y = 140; y < H - 60; y += 260) for (let x = 50; x < W - 70; x += 46) { const hh = 160 + r() * 70; const b = new Path2D(); b.rect(x, y + 230 - hh, 40, hh); fillPaper(g, b); hatch(g, b, { angle: 1.57, gap: 3, seed: x + y }); outline(g, b, 1.4); } }), 1.5, 2.4, { x: -3.2, z: -3.7 }],
    lab: [box(1400, 900, (g, W, H) => { table(g, W, H, 861); const r = rng(862); for (let i = 0; i < 9; i++) { const x = 80 + i * 140, hh = 100 + r() * 180; const fl = new Path2D(); fl.ellipse(x, H * 0.2 - 40, 40, 40, 0, 0, 7); fl.rect(x - 12, H * 0.2 - 40 - hh, 24, hh); fillPaper(g, fl); outline(g, fl, 2.2); } g.lineWidth = 3; g.strokeStyle = INK; g.beginPath(); g.moveTo(100, 30); g.quadraticCurveTo(700, -40, 1300, 60); g.stroke(); }), 2.6, 1.65, { x: 0.6, z: -3.1 }],
    slab: [box(1200, 360, (g, W, H) => { const s = new Path2D(); s.rect(10, 60, W - 20, 90); solid(g, s, 871, 4); for (const x of [60, W - 120]) { const l = new Path2D(); l.rect(x, 150, 60, 210); solid(g, l, 872); } const sheet = new Path2D(); sheet.moveTo(80, 60); sheet.quadraticCurveTo(600, -10, W - 80, 60); sheet.closePath(); fillPaper(g, sheet); outline(g, sheet, 2); }), 2.3, 0.75, { x: -0.6, z: -2.4 }],
    dock: [box(900, 520, (g, W, H) => { const d = new Path2D(); d.rect(10, 60, W - 20, H - 60); solid(g, d, 881, 4); }), 1.6, 1.0, { x: 2.0, z: -1.8 }],
    bars: [box(1000, 1200, (g, W, H) => { g.strokeStyle = INK; g.lineWidth = 12; for (let x = 40; x < W; x += 90) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (const y of [40, H / 2, H - 40]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }), 2.6, 3.1, { x: 0, z: -1.2 }],
    coffin: [box(1100, 300, (g, W, H) => { const c = new Path2D(); c.moveTo(20, 100); c.lineTo(260, 20); c.lineTo(W - 20, 60); c.lineTo(W - 20, 240); c.lineTo(260, H - 10); c.lineTo(20, 200); c.closePath(); solid(g, c, 891, 4); }), 2.0, 0.55, { x: 0, z: -2.2 }],
    guitar: [box(260, 700, (g) => { const b = blob(130, 520, 110, 150, 901, 6, 0.1); fillPaper(g, b); outline(g, b, 3); const n = new Path2D(); n.rect(118, 40, 24, 360); fillPaper(g, n); outline(g, n, 2); }), 0.35, 0.95, { x: 0.8, z: -2.2 }],
  };
  return P[name];
}

// ---- Sets ----------------------------------------------------------------------------------

function snowfall(group, { x0 = -8, x1 = 8, z0 = -10, z1 = 2, n = 500 } = {}) {
  const pos = new Float32Array(n * 3), r = rng(911);
  for (let i = 0; i < n; i++) { pos[i * 3] = x0 + r() * (x1 - x0); pos[i * 3 + 1] = r() * 6; pos[i * 3 + 2] = z0 + r() * (z1 - z0); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  group.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fbf8f0', size: 0.035, fog: false })));
  const base = pos.slice();
  return (t) => { for (let i = 0; i < n; i++) { pos[i * 3 + 1] = ((base[i * 3 + 1] - t * (0.35 + (i % 5) * 0.05)) % 6 + 6) % 6; pos[i * 3] = base[i * 3] + Math.sin(t * 0.7 + i) * 0.08; } geo.attributes.position.needsUpdate = true; };
}

// A storm: the sky flashes white now and then (lightning), drawn as a sheet over the far scenery.
function lightning(group, w, z) {
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, 14), new THREE.MeshBasicMaterial({ color: '#fffdf4', transparent: true, opacity: 0, fog: false, depthWrite: false }));
  sheet.position.set(0, 6, z + 0.3); group.add(sheet);
  return (t) => { const k = (t * 0.37) % 7; sheet.material.opacity = k < 0.12 || (k > 0.25 && k < 0.33) ? 0.8 : 0; };
}

// A drawing for this place, else the shared one (floors, grounds, furniture and mid pieces are
// drawn once in sets/common/ and used everywhere unless a place has its own).
// A floor or ground picture is a seamless tile: it repeats across the stage, a tile about every
// `size` metres, instead of one picture stretched over the whole floor (owner, 2026-10-16).
function tiledPlane(w, d, size, tex) {
  const geo = new THREE.PlaneGeometry(w, d);
  if (tex) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.needsUpdate = true;
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / size, uv.getY(i) * d / size);
  }
  return geo;
}
const aiArt = (ai, art, piece, common) => ai[`sets/${art}/${piece}`]?.tex ?? (common ? ai[`sets/common/${common}`]?.tex : undefined);

export function buildRoom(group, ai, spec, art) {
  const w = spec.w ?? 8.4, d = spec.d ?? 6.4, h = spec.h ?? 4.6, back = -4.2, s0 = spec.seed ?? 1;
  const pick = (piece, draw) => ai[`sets/${art}/${piece}`]?.tex ?? texture(draw());
  const win = spec.window === false ? null : [0.8, 2.6, 0.95, 3.45];
  const floorAi = aiArt(ai, art, 'floor', `floor_${spec.floor ?? 'boards'}`);
  const floor = new THREE.Mesh(tiledPlane(w, d, 2.4, floorAi), new THREE.MeshBasicMaterial({ map: floorAi ?? groundTex(spec.floor ?? 'boards', [w / 1.6, d / 1.6]) }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, back + d / 2); group.add(floor);
  const ceilT = (() => { const { c, g } = canvas(1024, 800); const a = new Path2D(); a.rect(0, 0, 1024, 800); fillPaper(g, a); hatch(g, a, { angle: 0, gap: 4, seed: s0 + 30, alpha: 0.7 }); for (let x = 60; x < 1024; x += 180) { const b = new Path2D(); b.rect(x, 0, 50, 800); fillPaper(g, b); hatch(g, b, { angle: 1.57, gap: 5, seed: x }); outline(g, b, 2.5); } return texture(c); })();
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: ceilT })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, h, back + d / 2); group.add(ceil);
  const bw = paperFlat(pick('wall_back', () => wallArt(w, h, { wall: spec.wall, window: win, fire: spec.fire === 'back' ? -1.2 : null, door: spec.door === 'back' ? -2.6 : null, shelf: spec.shelf ? -1.2 : null, seed: s0 })), w, h, { edge: false });
  bw.position.set(0, 0, back); group.add(bw);
  for (const side of [-1, 1]) {
    const hasDoor = spec.door === (side < 0 ? 'left' : 'right') || (!spec.door && side > 0);
    const hasFire = spec.fire === (side < 0 ? 'left' : 'right');
    const sw = paperFlat(pick(side < 0 ? 'wall_left' : 'wall_right', () => wallArt(d, h, { wall: spec.wall, door: hasDoor ? d / 2 - 2.0 : null, fire: hasFire ? -0.5 : null, seed: s0 + 10 + side, shade: 0.35 })), d, h, { edge: false });
    sw.rotation.y = -side * Math.PI / 2; sw.position.set(side * w / 2, 0, back + d / 2); group.add(sw);
  }
  let update = () => {};
  if (win) {
    const view = spec.view ?? 'town';
    const st = paperFlat(pick('view', () => farArt(view, spec.weather)), 12, 4.8, { edge: false, opaque: true });
    st.position.set(1.7, 0.4, back - 3.0); group.add(st);
    if (spec.weather === 'snow') update = snowfall(group, { x0: -1, x1: 4.5, z0: back - 2.8, z1: back - 0.3, n: 220 });
    if (spec.weather === 'storm') { const l = lightning(group, 12, back - 3.0); update = l; }
  }
  const spots = {}, furnH = {};
  for (const f of spec.furniture ?? []) {
    const [name, at] = Array.isArray(f) ? f : [f, null];
    const P = furniturePiece(name); if (!P) continue;
    const [cv, fw, fh, def] = P;
    const spot = { ...def, ...(at ?? {}) };
    const flat = paperFlat(aiArt(ai, art, name, name) ?? texture(cv), fw, fh);
    flat.position.set(spot.x, 0, spot.z); group.add(flat);
    spots[name] = spot; furnH[name] = fh;
    if (name === 'desk' || name === 'table') { const g2 = halo('#fff6dd', 0.8, spec.light === 'candle' || spec.light === 'night' ? 0.5 : 0); g2.position.set(spot.x - 0.5, fh + 0.2, spot.z - 0.05); group.add(g2); }
  }
  const marks = {
    C: { x: 0, z: -2.2 }, L: { x: -2.0, z: -2.1 }, R: { x: 2.0, z: -2.1 }, BL: { x: -2.4, z: -3.4 }, BR: { x: 2.4, z: -3.4 }, BC: { x: 0, z: -3.5 },
    FL: { x: -1.5, z: -0.7 }, FR: { x: 1.5, z: -0.7 }, FC: { x: 0, z: -0.6 },
    door: spec.door === 'left' ? { x: -w / 2 + 0.4, z: back + d / 2 - 2.0 } : spec.door === 'back' ? { x: -2.6, z: back + 0.4 } : { x: w / 2 - 0.4, z: back + d / 2 - 2.0 },
    window: { x: 2.25, z: back + 0.5 },
    off: spec.door === 'left' ? { x: -w / 2 - 1.5, z: back + d / 2 - 2.0 } : spec.door === 'back' ? { x: -2.6, z: back - 1.5 } : { x: w / 2 + 1.5, z: back + d / 2 - 2.0 },
  };
  for (const [name, s] of Object.entries(spots)) marks[name] = name === 'bed' || name === 'slab' || name === 'coffin' ? { x: s.x, z: s.z, y: 0.55 } : { x: s.x + 0.9, z: s.z - 0.2 };
  return {
    marks, spots, furnH, back, update, w, depth: d,
    bounds: { minX: -w / 2 + 0.6, maxX: w / 2 - 0.6, minZ: back + 0.6, maxZ: 1.6 },
    cam: { minX: -w / 2 + 0.4, maxX: w / 2 - 0.4, minZ: back + 0.6, maxZ: 1.8, maxY: h - 0.3 },
    shots: { wide: { pos: [0, 1.85, 1.2], look: [0, 1.3, -4] }, high: { pos: [0, 3.2, 1.0], look: [0, 0.6, -3] } },
    bg: PAPER, fog: [12, 40],
  };
}

export function buildOutdoor(group, ai, spec, art) {
  const W = 40, D = 26, s0 = spec.seed ?? 1;
  const pick = (piece, draw) => ai[`sets/${art}/${piece}`]?.tex ?? texture(draw());
  const groundAi = aiArt(ai, art, 'ground', `ground_${spec.ground ?? 'grass'}`);
  const ground = new THREE.Mesh(tiledPlane(W, D, 4, groundAi), new THREE.MeshBasicMaterial({ map: groundAi ?? groundTex(spec.ground ?? 'grass', [W / 2, D / 2]) }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -D / 2 + 4); group.add(ground);
  const far = paperFlat(tiled(pick('far', () => farArt(spec.far ?? 'hills', spec.weather)), 1.6), 44, 17.6, { edge: false, opaque: true });
  far.position.set(0, -1.5, -20); group.add(far);
  // The same scenery carried round both sides, so a shot looking along the stage still sees it.
  for (const sx of [-1, 1]) {
    const side = paperFlat(far.children[0].material.map, 26, 17.6, { edge: false, opaque: true });
    side.rotation.y = -sx * Math.PI / 2; side.position.set(sx * 22, -1.5, -7); group.add(side);
  }
  const r = rng(s0 + 50);
  for (const [i, m] of (spec.mid ?? []).entries()) {
    const [name, at] = Array.isArray(m) ? m : [m, null];
    const P = MID[name]; if (!P) continue;
    const [cv, mw, mh] = P();
    const flat = paperFlat(aiArt(ai, art, name, name) ?? texture(cv), mw, mh);
    const spot = at ?? { x: (i % 2 ? 1 : -1) * (4 + r() * 3), z: -7 - r() * 4 };
    flat.position.set(spot.x, spot.y ?? 0, spot.z); if (spot.flip) flat.scale.x = -1; group.add(flat);
  }
  // Wings: trees or rocks at the sides hide the edges of the set.
  const wing = spec.wings ?? (spec.ground === 'ice' || spec.ground === 'snow' || spec.ground === 'water' || spec.ground === 'deck' ? null : 'trees');
  if (wing && MID[wing]) for (const [x, z, s] of [[-8.5, -1, 1], [8.5, -2, -1], [-11, -8, 1], [11, -9, -1]]) { const [cv, mw, mh] = MID[wing](); const f = paperFlat(aiArt(ai, art, wing, wing) ?? texture(cv), mw, mh); f.position.set(x, 0, z); f.scale.x = s; f.rotation.y = s * 0.8; group.add(f); } // turned in, never seen edge on
  let fx = () => {};
  if (spec.weather === 'snow') fx = snowfall(group);
  if (spec.weather === 'storm') fx = lightning(group, 44, -20);
  const night = spec.weather === 'night' || spec.weather === 'moon' || spec.weather === 'storm' || spec.light === 'night';
  return {
    marks: {
      C: { x: 0, z: -3 }, L: { x: -3, z: -3 }, R: { x: 3, z: -3 }, FL: { x: -2, z: -1 }, FR: { x: 2, z: -1 }, FC: { x: 0, z: -1 },
      BL: { x: -4.5, z: -6 }, BR: { x: 4.5, z: -6 }, BC: { x: 0, z: -7 }, farL: { x: -7, z: -10 }, farR: { x: 7, z: -10 },
      offL: { x: -10, z: -3 }, offR: { x: 10, z: -3 }, off: { x: 10, z: -3 },
    },
    update: fx, w: 16, depth: 10,
    bounds: { minX: -6, maxX: 6, minZ: -8, maxZ: 2 },
    cam: { minX: -9, maxX: 9, minZ: -12, maxZ: 6, maxY: 8 },
    shots: { wide: { pos: [0, 2.2, 4.5], look: [0, 1.4, -5] }, high: { pos: [0, 5, 5], look: [0, 0.5, -4] } },
    bg: night ? '#cfc8b6' : PAPER, fog: night ? [8, 30] : [14, 46],
  };
}

export function buildSet(group, ai, spec, art) {
  return spec.kind === 'room' ? buildRoom(group, ai, spec, art) : buildOutdoor(group, ai, spec, art);
}

// Every piece a set spec uses, for the master asset list: [piece, kind, description].
export function setPieces(spec) {
  if (spec.kind === 'room') {
    return [
      ['wall_back', 'wall', `back wall (${spec.wall ?? 'plaster'}${spec.window === false ? '' : ', with a window'}${spec.fire === 'back' ? ', fireplace' : ''})`],
      ['wall_left', 'wall', `left wall${spec.door === 'left' ? ' with the door' : ''}${spec.fire === 'left' ? ', fireplace' : ''}`],
      ['wall_right', 'wall', `right wall${!spec.door || spec.door === 'right' ? ' with the door' : ''}${spec.fire === 'right' ? ', fireplace' : ''}`],
      ['floor', 'floor', `floor tile (${spec.floor ?? 'boards'}), seamless`],
      ...(spec.window === false ? [] : [['view', 'background', `view through the window: ${spec.view ?? 'town'}${spec.weather ? ', ' + spec.weather : ''}`]]),
      ...(spec.furniture ?? []).map((f) => [Array.isArray(f) ? f[0] : f, 'prop', 'furniture']),
    ];
  }
  return [
    ['far', 'background', `far scenery strip: ${spec.far ?? 'hills'}${spec.weather ? ', ' + spec.weather : ''}, sky included`],
    ['ground', 'floor', `ground tile (${spec.ground ?? 'grass'}), seamless`],
    ...(spec.mid ?? []).map((m) => [Array.isArray(m) ? m[0] : m, 'structure', 'mid-ground piece']),
  ];
}
