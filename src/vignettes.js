// Thought vignettes drawn in code: what the narrator pictures as he writes, shown in an oval
// beside him while the reading speaks of it (thoughts.js). Placeholders for the AI vignettes.
import { canvas, hatch, outline, fillPaper, blob, INK } from './ink.js';

const FONT = (px, italic) => `${italic ? 'italic ' : ''}${px}px "IM Fell English", Georgia, serif`;

// An oval frame with a line of the text along its top; draw(g) inks the picture (512 x 360).
export function vignette(caption, draw) {
  const { c, g } = canvas(512, 360);
  const v = new Path2D(); v.ellipse(256, 180, 246, 170, 0, 0, Math.PI * 2);
  fillPaper(g, v); outline(g, v, 4);
  g.save(); g.clip(v);
  g.strokeStyle = INK; g.fillStyle = INK;
  draw(g);
  g.restore();
  g.fillStyle = INK; g.font = FONT(22, true); g.textAlign = 'center'; g.fillText(caption, 256, 40);
  return c;
}

const sea = (g, y, seed) => { const s = new Path2D(); s.rect(0, y, 512, 360 - y); hatch(g, s, { angle: 0, gap: 6, seed, alpha: 0.8 }); };

// "the sun is for ever visible, its broad disk just skirting the horizon"
export const poleSun = () => vignette('the sun is for ever visible', (g) => {
  const sky = new Path2D(); sky.rect(0, 0, 512, 230); hatch(g, sky, { angle: 0, gap: 9, seed: 701, alpha: 0.4 });
  const sun = new Path2D(); sun.arc(256, 225, 70, Math.PI, 0); fillPaper(g, sun); outline(g, sun, 3);
  for (let a = 0; a < 13; a++) { const t = Math.PI + a / 12 * Math.PI; g.lineWidth = 2; g.beginPath(); g.moveTo(256 + Math.cos(t) * 85, 225 + Math.sin(t) * 85); g.lineTo(256 + Math.cos(t) * 120, 225 + Math.sin(t) * 120); g.stroke(); }
  sea(g, 230, 702);
  for (const [x, w] of [[90, 90], [380, 120], [250, 60]]) { const ice = new Path2D(); ice.moveTo(x - w / 2, 290); ice.lineTo(x - w / 4, 250); ice.lineTo(x + w / 5, 262); ice.lineTo(x + w / 2, 290); ice.closePath(); fillPaper(g, ice); outline(g, ice, 2.5); }
});

// "the wondrous power which attracts the needle"
export const needle = () => vignette('the power which attracts the needle', (g) => {
  const rim = new Path2D(); rim.arc(256, 200, 120, 0, 7); fillPaper(g, rim); hatch(g, rim, { angle: 0.8, gap: 5, seed: 711, alpha: 0.4 }); outline(g, rim, 4);
  const face = new Path2D(); face.arc(256, 200, 100, 0, 7); fillPaper(g, face); outline(g, face, 2);
  g.font = FONT(26); g.textAlign = 'center';
  [['N', 0, -78], ['S', 0, 92], ['E', 84, 8], ['W', -84, 8]].forEach(([l, x, y]) => g.fillText(l, 256 + x, 200 + y));
  const n = new Path2D(); n.moveTo(256, 120); n.lineTo(270, 200); n.lineTo(256, 280); n.lineTo(242, 200); n.closePath(); fillPaper(g, n); outline(g, n, 2.5);
  const up = new Path2D(); up.moveTo(256, 120); up.lineTo(270, 200); up.lineTo(242, 200); up.closePath(); g.fill(up);
});

// "I accompanied the whale-fishers on several expeditions to the North Sea"
export const whalers = () => vignette('the whale-fishers', (g) => {
  const sky = new Path2D(); sky.rect(0, 0, 512, 250); hatch(g, sky, { angle: 0.1, gap: 8, seed: 721, alpha: 0.35 });
  sea(g, 250, 722);
  const hull = new Path2D(); hull.moveTo(150, 245); hull.lineTo(370, 245); hull.lineTo(340, 285); hull.lineTo(175, 285); hull.closePath();
  fillPaper(g, hull); hatch(g, hull, { angle: 0.2, gap: 3, seed: 723 }); outline(g, hull, 3);
  for (const [x, h] of [[210, 170], [300, 150]]) {
    g.lineWidth = 3; g.beginPath(); g.moveTo(x, 245); g.lineTo(x, 245 - h); g.stroke();
    for (const k of [0.25, 0.6]) { const s = new Path2D(); s.moveTo(x - 40, 245 - h * (1 - k) - 30); s.quadraticCurveTo(x, 245 - h * (1 - k) - 10, x + 40, 245 - h * (1 - k) - 30); s.lineTo(x + 36, 245 - h * (1 - k) + 18); s.lineTo(x - 36, 245 - h * (1 - k) + 18); s.closePath(); fillPaper(g, s); outline(g, s, 2); }
  }
  const whale = blob(420, 300, 60, 16, 724, 6, 0.1); fillPaper(g, whale); hatch(g, whale, { angle: 0.3, gap: 3, seed: 725 }); outline(g, whale, 2.5);
  g.lineWidth = 2; g.beginPath(); g.moveTo(420, 284); g.quadraticCurveTo(410, 250, 395, 240); g.moveTo(420, 284); g.quadraticCurveTo(430, 250, 445, 238); g.stroke();
});
