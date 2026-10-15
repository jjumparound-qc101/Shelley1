// Placeholder figures drawn in code, until the AI drawings arrive (docs/PLAN.md, Stage D).
// Deliberately plain: they mark who is where, their size and pose. Each returns a canvas;
// main.js turns them into puppet poses. Every figure is drawn facing left unless noted.
import { canvas, hatch, outline, fillPaper, grain, INK } from './ink.js';

function label(g, W, H, text = 'placeholder') {
  g.save(); g.fillStyle = 'rgba(23,20,15,0.55)'; g.font = '18px Georgia, serif'; g.textAlign = 'center';
  g.fillText(text, W / 2, H - 6); g.restore();
}

const part = (g, p, opts = {}) => { fillPaper(g, p); if (opts.gap) hatch(g, p, { width: 1, ...opts }); outline(g, p, 2.5); };

// Robert Walton, 1790s: dark tailcoat, high collar and cravat, breeches, boots, hair tied back.
function head(g, cx, cy, r, { back = false, bow = 0 } = {}) {
  g.save(); g.translate(cx, cy); g.rotate(bow);
  const hair = new Path2D(); hair.ellipse(0, -r * 0.15, r * 1.02, r * 0.95, 0, Math.PI * 1.05, Math.PI * 1.95 + (back ? Math.PI : 0));
  const face = new Path2D(); face.ellipse(0, 0, r * 0.85, r, 0, 0, Math.PI * 2);
  part(g, face, back ? { angle: 0.6, gap: 4, seed: 3 } : {});
  if (!back) {
    // A profile hint: nose to the left, an eye, the mouth.
    g.save(); g.strokeStyle = INK; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(-r * 0.78, -r * 0.05); g.lineTo(-r * 1.0, r * 0.22); g.lineTo(-r * 0.8, r * 0.3); g.stroke();
    g.beginPath(); g.arc(-r * 0.4, -r * 0.12, r * 0.07, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
    g.beginPath(); g.moveTo(-r * 0.7, r * 0.55); g.lineTo(-r * 0.45, r * 0.55); g.stroke();
    g.restore();
  }
  const cap = new Path2D(); cap.ellipse(r * 0.1, -r * 0.35, r * 0.9, r * 0.7, 0, Math.PI, Math.PI * 2); cap.lineTo(r * 1.0, r * 0.2); cap.closePath();
  part(g, back ? face : cap, { angle: 1.4, gap: 3, seed: 4 });
  const queue = new Path2D(); queue.moveTo(r * 0.75, r * 0.2); queue.quadraticCurveTo(r * 1.1, r * 0.9, r * 0.9, r * 1.4); queue.lineTo(r * 0.75, r * 1.35); queue.closePath();
  part(g, queue, { angle: 1.3, gap: 3, seed: 5 });
  g.restore();
}

function coat(g, x, y, w, h, seed, { tails = true } = {}) {
  const p = new Path2D();
  p.moveTo(x - w * 0.5, y); p.lineTo(x + w * 0.5, y); p.lineTo(x + w * 0.55, y + h * 0.75);
  if (tails) { p.lineTo(x + w * 0.4, y + h); p.lineTo(x + w * 0.15, y + h * 0.78); }
  p.lineTo(x - w * 0.5, y + h * 0.7); p.closePath();
  part(g, p, { angle: 1.15, gap: 4, seed });
  hatch(g, p, { angle: -0.4, gap: 7, seed: seed + 1, alpha: 0.5 });
  // Collar and cravat.
  const cr = new Path2D(); cr.moveTo(x - w * 0.22, y - 4); cr.quadraticCurveTo(x - w * 0.05, y + h * 0.16, x + w * 0.1, y - 4); cr.closePath();
  part(g, cr);
}

export function waltonStanding() {
  const W = 260, H = 720, { c, g } = canvas(W, H);
  const cx = 130;
  // Boots and breeches.
  for (const dx of [-28, 22]) {
    const leg = new Path2D(); leg.rect(cx + dx - 18, 400, 36, 160); part(g, leg, { angle: 0.3, gap: 7, seed: 11 + dx });
    const boot = new Path2D(); boot.moveTo(cx + dx - 20, 540); boot.lineTo(cx + dx + 20, 540); boot.lineTo(cx + dx + 22, 690); boot.lineTo(cx + dx - 42, 700); boot.lineTo(cx + dx - 40, 680); boot.lineTo(cx + dx - 20, 676); boot.closePath();
    part(g, boot, { angle: 1.2, gap: 2.5, seed: 13 + dx });
  }
  coat(g, cx, 150, 150, 300, 21);
  // Arms down at the sides.
  for (const dx of [-80, 70]) { const a = new Path2D(); a.rect(cx + dx, 165, 30, 210); part(g, a, { angle: 1.2, gap: 4, seed: 31 + dx }); const h = new Path2D(); h.ellipse(cx + dx + 15, 390, 15, 20, 0, 0, 7); part(g, h); }
  head(g, cx, 100, 48);
  grain(g, 0.03, 9); label(g, W, H, 'Walton');
  return c;
}

// From behind, at the window: hands clasped behind his back.
export function waltonBack() {
  const W = 260, H = 720, { c, g } = canvas(W, H);
  const cx = 130;
  for (const dx of [-26, 26]) {
    const leg = new Path2D(); leg.rect(cx + dx - 18, 400, 36, 160); part(g, leg, { angle: 0.3, gap: 7, seed: 41 + dx });
    const boot = new Path2D(); boot.rect(cx + dx - 21, 540, 42, 155); part(g, boot, { angle: 1.2, gap: 2.5, seed: 43 + dx });
  }
  coat(g, cx, 150, 160, 300, 51);
  for (const dx of [-82, 52]) { const a = new Path2D(); a.moveTo(cx + dx, 165); a.lineTo(cx + dx + 30, 165); a.lineTo(cx + dx + 15 + (dx < 0 ? 50 : -20), 330); a.lineTo(cx + dx + (dx < 0 ? 40 : -10), 340); a.closePath(); part(g, a, { angle: 1.0, gap: 4, seed: 61 + dx }); }
  head(g, cx, 100, 48, { back: true });
  grain(g, 0.03, 9); label(g, W, H, 'Walton');
  return c;
}

// Seated, bent over his letter, quill in hand: seen from in front, across the desk (the desk
// hides him below the chest, so only the upper body and the chair's back are drawn in full).
export function waltonWriting() {
  const W = 300, H = 560, { c, g } = canvas(W, H);
  const cx = 150;
  const chair = new Path2D(); chair.rect(cx - 95, 60, 190, 300); part(g, chair, { angle: 1.57, gap: 5, seed: 71 });
  const legs = new Path2D(); legs.rect(cx - 70, 360, 140, 190); part(g, legs, { angle: 0.3, gap: 6, seed: 72 });
  coat(g, cx, 170, 170, 230, 73, { tails: false });
  // Forearms forward onto the desk; the quill in the right hand.
  for (const dx of [-90, 60]) { const a = new Path2D(); a.moveTo(cx + dx, 185); a.lineTo(cx + dx + 30, 185); a.lineTo(cx + dx + 40, 330); a.lineTo(cx + dx + 5, 335); a.closePath(); part(g, a, { angle: 1.2, gap: 4, seed: 81 + dx }); }
  g.save(); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + 105, 330); g.quadraticCurveTo(cx + 130, 250, cx + 150, 215); g.stroke(); g.restore();
  head(g, cx, 125, 46, { bow: -0.35 });
  grain(g, 0.03, 9); label(g, W, H, 'Walton');
  return c;
}
