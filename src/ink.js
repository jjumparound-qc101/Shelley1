// Procedural placeholder art in black-and-white engraving style.
// Everything here is a stand-in until the commissioned master drawings arrive
// (see docs/AMENDMENTS.md). It is drawn at runtime, so there are no binary files.
import * as THREE from 'three';

export const PAPER = '#efe9da';
export const INK = '#17140f';

// Small seeded RNG so the placeholder art is the same on every load.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';
  return { c, g };
}

export function texture(c, { repeat } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Parallel hatching clipped to the current path.
export function hatch(g, path, { angle = 0.8, gap = 6, width = 1, jitter = 1.2, seed = 1, alpha = 1 } = {}) {
  const r = rng(seed);
  g.save();
  g.clip(path);
  g.strokeStyle = INK;
  g.globalAlpha = alpha;
  g.lineWidth = width;
  const W = g.canvas.width, H = g.canvas.height;
  const L = Math.hypot(W, H);
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  for (let d = -L; d < L; d += gap) {
    const cx = W / 2 + nx * d, cy = H / 2 + ny * d;
    g.beginPath();
    g.moveTo(cx - dx * L + (r() - 0.5) * jitter, cy - dy * L + (r() - 0.5) * jitter);
    g.lineTo(cx + dx * L + (r() - 0.5) * jitter, cy + dy * L + (r() - 0.5) * jitter);
    g.stroke();
  }
  g.restore();
}

// A wobbly closed blob, like a tree crown or bush outline.
export function blob(cx, cy, rx, ry, seed, lobes = 9, wob = 0.18) {
  const r = rng(seed);
  const p = new Path2D();
  const n = lobes * 6;
  const amp = Array.from({ length: lobes }, () => 1 + (r() - 0.5) * wob * 2);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const lobe = Math.abs(Math.sin((a * lobes) / 2));
    const k = amp[Math.floor((i / n) * lobes) % lobes] * (0.9 + 0.1 * lobe);
    const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
    i ? p.lineTo(x, y) : p.moveTo(x, y);
  }
  p.closePath();
  return p;
}

// Short leaf/grass flicks scattered inside a path.
export function flicks(g, path, { count = 400, len = 8, seed = 2, up = false, width = 1 } = {}) {
  const r = rng(seed);
  g.save();
  g.clip(path);
  g.strokeStyle = INK;
  g.lineWidth = width;
  const W = g.canvas.width, H = g.canvas.height;
  for (let i = 0; i < count; i++) {
    const x = r() * W, y = r() * H;
    const a = up ? -Math.PI / 2 + (r() - 0.5) * 0.6 : r() * Math.PI * 2;
    const l = len * (0.5 + r());
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.restore();
}

export function outline(g, path, width = 2.5) {
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = width;
  g.stroke(path);
  g.restore();
}

export function fillPaper(g, path) {
  g.save();
  g.fillStyle = PAPER;
  g.fill(path);
  g.restore();
}

// Grain so flat paper doesn't look digital.
export function grain(g, amount = 0.05, seed = 7) {
  const r = rng(seed);
  const { width: W, height: H } = g.canvas;
  g.save();
  for (let i = 0; i < (W * H) / 90; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${amount})` : `rgba(255,255,255,${amount})`;
    g.fillRect(r() * W, r() * H, 1.5, 1.5);
  }
  g.restore();
}

// Hatch only the shadow side of a shape: the part not covered by the same
// shape shifted toward the light. Gives a crescent of shade like an engraving.
export function shadeEdge(g, shape, { dx = -0.25, dy = -0.2, size = 100, ...opts } = {}) {
  const W = g.canvas.width, H = g.canvas.height;
  const notLit = new Path2D();
  notLit.rect(0, 0, W, H);
  notLit.addPath(shape, new DOMMatrix().translate(dx * size, dy * size));
  const all = new Path2D();
  all.rect(0, 0, W, H);
  g.save();
  g.clip(shape);
  g.clip(notLit, 'evenodd');
  hatch(g, all, opts);
  g.restore();
}
