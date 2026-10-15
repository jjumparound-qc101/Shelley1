// Placeholder people drawn in code, one generic figure per kind of person, varied by costume.
// They mark who is where, their height and their pose until the AI drawings arrive.
// Poses: stand, walk (a step), back (from behind), sit, kneel, lie, point, grieve (head in hands).
// Every pose is drawn facing left.
import { canvas, hatch, outline, fillPaper, grain, blob, INK } from './ink.js';

export const POSES = ['stand', 'walk', 'back', 'sit', 'kneel', 'lie', 'point', 'grieve'];

const part = (g, p, h) => { fillPaper(g, p); if (h) hatch(g, p, { width: 1, ...h }); outline(g, p, 2.5); };

function tag(g, W, H, text) {
  g.save(); g.fillStyle = 'rgba(23,20,15,0.6)'; g.font = '20px Georgia, serif'; g.textAlign = 'center';
  g.fillText(text, W / 2, H - 6); g.restore();
}

// One figure, standing frame 300 x 760 px (the creature is drawn the same and scaled up).
// look: { skirt, coat (hatch gap: smaller = darker), hat, hair: 'short'|'long'|'queue'|'cap'|'wild', beard, stoop, label }
function body(g, look, pose) {
  const cx = 150, back = pose === 'back';
  const dark = { angle: 1.15, gap: look.coat ?? 5, seed: look.seed ?? 1 };
  const stoop = look.stoop ?? 0;
  g.save();
  if (pose === 'grieve' || stoop) { g.translate(cx, 420); g.rotate(-(stoop || 0.12)); g.translate(-cx, -420); }
  // Legs or skirt.
  if (look.skirt) {
    const sk = new Path2D(); sk.moveTo(cx - 55, 300); sk.lineTo(cx + 55, 300); sk.lineTo(cx + 105, 730); sk.lineTo(cx - 105, 730); sk.closePath();
    part(g, sk, { angle: 1.4, gap: look.skirtGap ?? 9, seed: 21 });
  } else {
    const step = pose === 'walk' ? 30 : 0;
    for (const [dx, k] of [[-30, -1], [26, 1]]) {
      const leg = new Path2D(); leg.moveTo(cx + dx - 18, 400); leg.lineTo(cx + dx + 18, 400); leg.lineTo(cx + dx + 18 + k * step, 700); leg.lineTo(cx + dx - 18 + k * step, 700); leg.closePath();
      part(g, leg, { angle: 0.3, gap: look.legs ?? 7, seed: 11 + dx });
      const foot = new Path2D(); foot.ellipse(cx + dx - 12 + k * step, 712, 30, 14, 0, 0, 7); part(g, foot, { angle: 1, gap: 2.5, seed: 13 });
    }
  }
  // Torso (coat, bodice or rags).
  const torso = new Path2D();
  const sw = look.skirt ? 62 : 78;
  torso.moveTo(cx - sw, 165); torso.lineTo(cx + sw, 165); torso.lineTo(cx + sw - 8, look.skirt ? 310 : 420);
  if (!look.skirt && look.tails) { torso.lineTo(cx + 40, 520); torso.lineTo(cx + 10, 420); }
  torso.lineTo(cx - sw + 8, look.skirt ? 310 : 420); torso.closePath();
  part(g, torso, dark);
  if (look.rags) { for (let k = 0; k < 7; k++) { const r = new Path2D(); r.moveTo(cx - 70 + k * 22, 415); r.lineTo(cx - 60 + k * 22, 460 + (k % 3) * 18); r.lineTo(cx - 50 + k * 22, 415); part(g, r, dark); } }
  // Arms.
  const arm = (x, ang, len = 220) => { g.save(); g.translate(x, 175); g.rotate(ang); const a = new Path2D(); a.rect(-15, 0, 30, len); part(g, a, dark); const h = new Path2D(); h.ellipse(0, len + 14, 15, 19, 0, 0, 7); part(g, h); g.restore(); };
  if (pose === 'point') { arm(cx + sw - 12, 0.08); arm(cx - sw + 12, 1.45); }
  else if (pose === 'grieve') { arm(cx - sw + 14, 2.6, 170); arm(cx + sw - 14, -2.6, 170); }
  else if (pose === 'walk') { arm(cx - sw + 12, 0.25); arm(cx + sw - 12, -0.2); }
  else if (back) { arm(cx - sw + 12, -0.35, 180); arm(cx + sw - 12, 0.35, 180); }
  else { arm(cx - sw + 12, 0.06); arm(cx + sw - 12, -0.06); }
  // Head, hair, hat.
  const hy = 110, r = look.head ?? 44;
  const face = new Path2D(); face.ellipse(cx, hy, r * 0.85, r, 0, 0, 7);
  part(g, face, back ? { angle: 0.6, gap: 4, seed: 3 } : null);
  if (!back && pose !== 'grieve') {
    g.save(); g.strokeStyle = INK; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(cx - r * 0.78, hy - r * 0.05); g.lineTo(cx - r * 1.0, hy + r * 0.22); g.lineTo(cx - r * 0.8, hy + r * 0.3); g.stroke();
    g.beginPath(); g.arc(cx - r * 0.4, hy - r * 0.12, r * 0.07, 0, 7); g.fillStyle = INK; g.fill();
    g.restore();
  }
  const hair = new Path2D();
  if (look.hair === 'long' || look.hair === 'wild') {
    hair.moveTo(cx - r * 0.9, hy - r * 0.3); hair.quadraticCurveTo(cx, hy - r * 1.5, cx + r * 0.9, hy - r * 0.3);
    hair.lineTo(cx + r * (look.hair === 'wild' ? 1.3 : 1.0), hy + r * 2.4); hair.lineTo(cx + r * 0.3, hy + r * 2.2); hair.lineTo(cx + r * 0.6, hy + r * 0.2); hair.closePath();
  } else if (look.hair === 'cap') {
    hair.ellipse(cx, hy - r * 0.45, r * 1.0, r * 0.7, 0, Math.PI, Math.PI * 2); hair.closePath();
  } else {
    hair.ellipse(cx + r * 0.1, hy - r * 0.35, r * 0.9, r * 0.7, 0, Math.PI, Math.PI * 2); hair.lineTo(cx + r * 1.0, hy + r * 0.2); hair.closePath();
    if (look.hair === 'queue') { hair.moveTo(cx + r * 0.75, hy + r * 0.2); hair.quadraticCurveTo(cx + r * 1.1, hy + r * 0.9, cx + r * 0.9, hy + r * 1.4); hair.lineTo(cx + r * 0.75, hy + r * 1.35); hair.closePath(); }
  }
  part(g, hair, { angle: 1.4, gap: look.hairGap ?? 3, seed: 5 });
  if (look.beard) { const b = blob(cx - r * 0.2, hy + r * 0.7, r * 0.6, r * 0.45, 7, 7, 0.2); part(g, b, { angle: 1.5, gap: 3, seed: 8 }); }
  const hat = new Path2D();
  if (look.hat === 'top') { hat.rect(cx - r * 0.75, hy - r * 2.1, r * 1.5, r * 1.3); hat.rect(cx - r * 1.15, hy - r * 0.85, r * 2.3, r * 0.22); }
  if (look.hat === 'bonnet') { hat.ellipse(cx + r * 0.25, hy - r * 0.2, r * 1.15, r * 1.2, 0, Math.PI * 0.75, Math.PI * 2.15); hat.closePath(); }
  if (look.hat === 'cap') { hat.ellipse(cx, hy - r * 0.75, r * 0.95, r * 0.5, 0, Math.PI, Math.PI * 2); hat.closePath(); }
  if (look.hat === 'wig') { hat.ellipse(cx, hy - r * 0.2, r * 1.2, r * 1.15, 0, Math.PI * 0.9, Math.PI * 2.1); hat.closePath(); }
  if (look.hat) part(g, hat, { angle: 0.2, gap: 3, seed: 9 });
  if (look.collar) { const c = new Path2D(); c.moveTo(cx - 30, 160); c.quadraticCurveTo(cx, 200, cx + 30, 160); c.closePath(); part(g, c); }
  g.restore();
}

// A pose as a canvas. Sitting, kneeling and lying are re-cut from the standing drawing.
export function personArt(look, pose = 'stand') {
  const W = 300, H = 760;
  const base = canvas(W, H);
  body(base.g, look, pose === 'sit' || pose === 'kneel' || pose === 'lie' ? 'stand' : pose);
  let out = base;
  if (pose === 'sit' || pose === 'kneel') {
    // Upper body over bent legs, on a short stool for sitting.
    const H2 = pose === 'sit' ? 560 : 520, o = canvas(W, H2);
    o.g.drawImage(base.c, 0, 0, W, 430, 0, 0, W, 430);
    const thigh = new Path2D(); thigh.rect(80, 400, pose === 'sit' ? 140 : 70, 60);
    part(o.g, thigh, { angle: 0.3, gap: look.legs ?? 7, seed: 31 });
    const shin = new Path2D(); shin.rect(pose === 'sit' ? 60 : 150, pose === 'sit' ? 450 : 450, 40, pose === 'sit' ? 95 : 55);
    part(o.g, shin, { angle: 0.3, gap: look.legs ?? 7, seed: 32 });
    if (pose === 'sit') { const st = new Path2D(); st.rect(110, 460, 130, 20); st.rect(120, 480, 14, 75); st.rect(216, 480, 14, 75); part(o.g, st, { angle: 1.57, gap: 4, seed: 33 }); }
    out = o;
  } else if (pose === 'lie') {
    const o = canvas(H, 260);
    o.g.translate(0, 260); o.g.rotate(-Math.PI / 2); o.g.drawImage(base.c, 0, 0, 260, H * 260 / W);
    out = o;
  }
  tag(out.g, out.c.width, out.c.height, look.label ?? '');
  grain(out.g, 0.03, 9);
  return out.c;
}
