// Placeholder flats drawn in code (engraving style). Each function returns a
// canvas; stage.js turns them into paper cutouts. Swap these for the master
// drawings when they arrive; the stage layout doesn't depend on what's drawn.
import { canvas, hatch, blob, flicks, outline, fillPaper, grain, shadeEdge, PAPER, INK } from './ink.js';

export function sky() {
  const { c, g } = canvas(2048, 720);
  g.fillStyle = PAPER;
  g.fillRect(0, 0, 2048, 720);
  // Engraved sky: denser hatching toward the top.
  for (let band = 0; band < 6; band++) {
    const p = new Path2D();
    p.rect(0, 0, 2048, 260 - band * 40);
    hatch(g, p, { angle: 0, gap: 7 + band * 2, width: 0.9, seed: 10 + band, alpha: 0.35 });
  }
  // A few clouds, shaded underneath.
  [[380, 260, 210, 70], [1150, 210, 260, 80], [1700, 300, 180, 55]].forEach(([x, y, rx, ry], i) => {
    const cl = blob(x, y, rx, ry, 30 + i, 11, 0.25);
    fillPaper(g, cl);
    const under = new Path2D();
    under.rect(x - rx * 1.3, y + ry * 0.1, rx * 2.6, ry * 1.4);
    g.save(); g.clip(cl); hatch(g, under, { angle: 0.15, gap: 5, width: 0.8, seed: 40 + i, alpha: 0.6 }); g.restore();
    outline(g, cl, 1.6);
  });
  // Low hills on the horizon.
  const hills = new Path2D();
  hills.moveTo(0, 720);
  for (let x = 0; x <= 2048; x += 32) hills.lineTo(x, 600 - 40 * Math.sin(x / 260) - 22 * Math.sin(x / 97));
  hills.lineTo(2048, 720);
  hills.closePath();
  fillPaper(g, hills);
  hatch(g, hills, { angle: -0.2, gap: 6, width: 0.9, seed: 50, alpha: 0.55 });
  outline(g, hills, 1.4);
  grain(g, 0.035);
  return c;
}

export function treeLine(seed = 3) {
  const { c, g } = canvas(2048, 512);
  let x = -40;
  let i = 0;
  while (x < 2100) {
    const rx = 70 + ((i * 37) % 50), ry = 90 + ((i * 53) % 60);
    const cy = 512 - ry - 30;
    const crown = blob(x, cy, rx, ry, seed * 100 + i, 10, 0.22);
    fillPaper(g, crown);
    shadeEdge(g, crown, { size: rx, dx: -0.45, dy: -0.3, angle: 1.1, gap: 4, width: 0.9, seed: i });
    flicks(g, crown, { count: 220, len: 7, seed: i + 300, width: 0.8 });
    outline(g, crown, 1.8);
    g.fillStyle = INK;
    g.fillRect(x - 5, cy + ry * 0.8, 10, 512 - cy - ry * 0.8);
    x += rx * 1.3;
    i++;
  }
  grain(g, 0.03, seed);
  return c;
}

export function bigTree() {
  const { c, g } = canvas(1024, 1400);
  const trunk = new Path2D();
  trunk.moveTo(470, 1400); trunk.bezierCurveTo(500, 1100, 470, 900, 500, 620);
  trunk.lineTo(600, 620); trunk.bezierCurveTo(610, 900, 590, 1100, 660, 1400); trunk.closePath();
  fillPaper(g, trunk);
  hatch(g, trunk, { angle: Math.PI / 2 + 0.05, gap: 5, width: 1.2, seed: 61 });
  const dark = new Path2D(); dark.rect(560, 600, 120, 800);
  g.save(); g.clip(trunk); hatch(g, dark, { angle: 0.6, gap: 4, width: 1, seed: 62 }); g.restore();
  outline(g, trunk, 3);
  [[512, 420, 440, 380, 71], [330, 560, 240, 200, 72], [720, 560, 260, 210, 73]].forEach(([x, y, rx, ry, s]) => {
    const cr = blob(x, y, rx, ry, s, 13, 0.2);
    fillPaper(g, cr);
    shadeEdge(g, cr, { size: rx, dx: -0.3, dy: -0.25, angle: 0.9, gap: 4, width: 1, seed: s + 5 });
    flicks(g, cr, { count: 1600, len: 9, seed: s + 9, width: 0.9 });
    outline(g, cr, 2.5);
  });
  grain(g, 0.03, 8);
  return c;
}

// Hedge with the rabbit-hole. holeX is where the hole sits, as a fraction of width.
export function hedge(holeX = 0.45) {
  const W = 1800, H = 560;
  const { c, g } = canvas(W, H);
  const body = new Path2D();
  body.moveTo(0, H);
  for (let x = 0; x <= W; x += 30) body.lineTo(x, 150 + 40 * Math.sin(x / 70) + 25 * Math.sin(x / 23));
  body.lineTo(W, H); body.closePath();
  fillPaper(g, body);
  hatch(g, body, { angle: 0.7, gap: 5, width: 1, seed: 81, alpha: 0.8 });
  flicks(g, body, { count: 2600, len: 10, seed: 82, width: 1 });
  outline(g, body, 2.5);
  // The hole: a dark arch at the base, cross-hatched.
  const hx = W * holeX;
  const hole = new Path2D();
  hole.moveTo(hx - 120, H); hole.bezierCurveTo(hx - 120, H - 230, hx + 120, H - 230, hx + 120, H); hole.closePath();
  g.fillStyle = INK; g.fill(hole);
  const rim = new Path2D(); rim.ellipse(hx, H - 4, 160, 40, 0, Math.PI, 0); rim.lineTo(hx + 160, H); rim.lineTo(hx - 160, H);
  hatch(g, rim, { angle: 0.1, gap: 4, width: 1.2, seed: 83 });
  grain(g, 0.03, 9);
  return c;
}

export function grassStrip(seed = 5) {
  const { c, g } = canvas(2048, 256);
  const p = new Path2D(); p.rect(0, 0, 2048, 256);
  for (let i = 0; i < 1400; i++) {
    const r = Math.sin(i * 12.9898 + seed) * 43758.5453; const f = r - Math.floor(r);
    const r2 = Math.sin(i * 78.233 + seed) * 12345.678; const f2 = r2 - Math.floor(r2);
    const x = f * 2048, h = 60 + f2 * 170;
    g.strokeStyle = INK; g.lineWidth = 1.2 + f2;
    g.beginPath(); g.moveTo(x, 256); g.quadraticCurveTo(x + (f2 - 0.5) * 30, 256 - h * 0.6, x + (f - 0.5) * 50, 256 - h); g.stroke();
  }
  return c;
}

export function groundTile() {
  const { c, g } = canvas(512, 512);
  g.fillStyle = PAPER; g.fillRect(0, 0, 512, 512);
  const p = new Path2D(); p.rect(-20, -20, 552, 552);
  hatch(g, p, { angle: 0.05, gap: 9, width: 0.8, seed: 91, alpha: 0.3 });
  flicks(g, p, { count: 900, len: 9, seed: 92, up: true, width: 1 });
  grain(g, 0.04, 10);
  return c;
}

// Toy-theater proscenium. The opening is transparent.
export function proscenium(W, H, open, { title = '', sub = '' } = {}) {
  const { c, g } = canvas(W, H);
  const frame = new Path2D(); frame.rect(0, 0, W, H);
  const hole = new Path2D();
  const { x, y, w, h } = open;
  hole.moveTo(x, y + h); hole.lineTo(x, y + 90);
  hole.quadraticCurveTo(x + w / 2, y - 70, x + w, y + 90); hole.lineTo(x + w, y + h); hole.closePath();
  const ring = new Path2D(); ring.addPath(frame); ring.addPath(hole);
  g.save(); g.fillStyle = PAPER; g.fill(ring, 'evenodd'); g.restore();
  g.save(); g.clip(ring, 'evenodd');
  hatch(g, frame, { angle: Math.PI / 2, gap: 6, width: 1, seed: 101, alpha: 0.5 });
  // Curtain swags along the top and down the sides.
  for (let i = 0; i < 7; i++) {
    const sx = x + (w / 7) * i;
    const sw = new Path2D(); sw.moveTo(sx, y - 40); sw.quadraticCurveTo(sx + w / 14, y + 70, sx + w / 7, y - 40); sw.lineTo(sx, y - 40);
    fillPaper(g, sw); hatch(g, sw, { angle: Math.PI / 2, gap: 5, width: 1, seed: 110 + i }); outline(g, sw, 2);
  }
  g.restore();
  g.lineWidth = 6; g.strokeStyle = INK; g.stroke(hole);
  g.lineWidth = 2; g.strokeRect(16, 16, W - 32, H - 32); g.strokeRect(28, 28, W - 56, H - 56);
  g.fillStyle = INK; g.textAlign = 'center';
  g.font = '600 72px "IM Fell English", Georgia, serif';
  g.fillText(title, W / 2, 122);
  g.font = 'italic 40px "IM Fell English", Georgia, serif';
  g.fillText(sub, W / 2, 178);
  grain(g, 0.03, 11);
  return c;
}
