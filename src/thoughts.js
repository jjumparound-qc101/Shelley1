// Thought vignettes: oval pictures of what Alice is imagining, shown while the narration speaks
// of them. (Owner, 2026-10-14) They are drawn flat over the picture, not inside the 3D scene, so:
// every bubble is the same oval shape, its picture fills the oval evenly and is never cut off by
// the edge of the screen, it is large enough to read, and it never covers Alice (it is placed in
// the free space beside her, with a trail of small bubbles toward her head).
import { smooth } from './track.js';

const ALL = new Set(); // every thought card: { el, trail, open, place }
let layer = null;

function ensureLayer() {
  if (layer) return layer;
  layer = document.createElement('div');
  layer.id = 'thoughts';
  document.body.appendChild(layer);
  return layer;
}

// The picture as an image URL: an AI drawing's texture (its <img>), or a canvas drawn in code.
function source(art) {
  const img = art.isTexture ? art.image : art;
  if (img instanceof HTMLCanvasElement) return img.toDataURL();
  if (img?.src) return img.src;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0); return c.toDataURL();
}

// list: [{ t0, t1, art (a canvas from props.js, or an AI drawing's texture) }].
// Returns update(t): scenes call it every frame (extra arguments from older scenes are ignored).
export function thoughts(group, list) {
  ensureLayer();
  const cards = list.map(({ t0, t1, art }) => {
    const el = document.createElement('div');
    el.className = 'thought';
    const img = document.createElement('img'); img.src = source(art); img.alt = ''; el.appendChild(img);
    const trail = [0, 1, 2].map(() => { const b = document.createElement('div'); b.className = 'thought-dot'; layer.appendChild(b); return b; });
    layer.appendChild(el);
    const card = { el, trail, open: 0, place: null, group, dots: [] };
    ALL.add(card);
    return { t0, t1, card };
  });
  return (t) => {
    for (const { t0, t1, card } of cards) card.open = smooth((t - t0) / 0.35) * (1 - smooth((t - t1 + 0.35) / 0.35));
  };
}

const overlap = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;

// Called once a frame after the scene is posed. view: the free picture area in CSS pixels
// ({x, y, w, h}: the screen less the text strip and controls); alice: her box on screen, or null.
export function layoutThoughts(view, alice) {
  if (!layer) return;
  const open = [...ALL].filter((c) => c.open > 0.01 && c.group.visible !== false && isShown(c.group));
  for (const c of ALL) if (!open.includes(c)) { c.el.style.display = 'none'; c.trail.forEach((d) => (d.style.display = 'none')); c.place = null; c.from = null; }
  const taken = alice ? [alice] : [];
  const now = performance.now();
  for (const c of open) {
    // Placed once when it opens and then held still (owner, 2026-10-14: no bouncing). It moves only
    // if Alice comes to stand under it for half a second, and then glides once, smoothly, to a new place.
    if (c.place && alice && overlap(c.place, alice, 4)) c.covering = c.covering ?? now; else c.covering = null;
    const replace = !c.place || (c.covering && now - c.covering > 500);
    if (replace) {
      const narrow = view.w < 600;
      let w = Math.min(view.w * (narrow ? 0.62 : 0.4), 420, view.h * (narrow ? 0.72 : 0.5) * (1024 / 720));
      let spot = null;
      for (let tries = 0; tries < 4 && !spot; tries++, w *= 0.85) spot = findSpot(view, w, w * 720 / 1024, taken, alice);
      if (!spot) { w = Math.min(view.w * 0.3, 260); spot = { x: view.x + 8, y: view.y + 8, w, h: w * 720 / 1024 }; }
      c.from = c.place ? { ...shown(c, now) } : null;
      c.place = spot; c.movedAt = now; c.covering = null;
      // The trail: from the oval toward where her head is now, fixed with the bubble.
      const head = alice ? { x: alice.x + alice.w / 2, y: alice.y + alice.h * 0.12 } : null;
      c.dots = head ? [0, 1, 2].map((i) => {
        const from = { x: spot.x + spot.w / 2, y: spot.y + spot.h / 2 };
        const dx = head.x - from.x, dy = head.y - from.y, L = Math.hypot(dx, dy) || 1;
        const edge = Math.min(spot.w, spot.h) * 0.5, gap = Math.max(0, L - edge - 14);
        const f = (edge + gap * (0.2 + i * 0.25)) / L, r = [14, 10, 6][i];
        return { x: from.x + dx * f - r, y: from.y + dy * f - r, r };
      }) : [];
    }
    const p = shown(c, now), k = c.open;
    taken.push(c.place);
    // Opening and closing: a plain fade, no growing or shrinking.
    Object.assign(c.el.style, { display: 'block', left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, height: `${p.h}px`, transform: 'none', opacity: k });
    const gliding = c.from && now - c.movedAt < 600;
    c.trail.forEach((d, i) => {
      const q = c.dots[i];
      if (!q || gliding) { d.style.display = 'none'; return; }
      Object.assign(d.style, { display: 'block', left: `${q.x}px`, top: `${q.y}px`, width: `${2 * q.r}px`, height: `${2 * q.r}px`, opacity: k });
    });
  }
}

// Where a bubble is drawn now: its place, or part-way there while gliding (0.6 s, eased).
function shown(c, now) {
  if (!c.from) return c.place;
  const e = smooth((now - c.movedAt) / 600), a = c.from, b = c.place;
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e };
}

const isShown = (g) => { for (let o = g; o; o = o.parent) if (!o.visible) return false; return true; };

// Candidate places beside Alice: either side of her head, then above, then the picture's top
// corners. The first that fits in the picture and covers neither her nor another thought wins.
function findSpot(view, w, h, taken, alice) {
  const m = 10, cands = [];
  if (alice) {
    const cy = alice.y + alice.h * 0.15 - h * 0.6;
    const prefer = alice.x + alice.w / 2 > view.x + view.w / 2 ? -1 : 1; // the side with more room first
    for (const s of [prefer, -prefer]) cands.push({ x: s > 0 ? alice.x + alice.w + 24 : alice.x - 24 - w, y: cy });
    cands.push({ x: alice.x + alice.w / 2 - w / 2, y: alice.y - h - 30 });
    for (const s of [prefer, -prefer]) cands.push({ x: s > 0 ? alice.x + alice.w + 24 : alice.x - 24 - w, y: alice.y + alice.h * 0.5 - h / 2 });
  }
  cands.push({ x: view.x + view.w - w - m, y: view.y + m }, { x: view.x + m, y: view.y + m });
  for (const c0 of cands) {
    const c = { x: Math.min(Math.max(c0.x, view.x + m), view.x + view.w - w - m), y: Math.min(Math.max(c0.y, view.y + m), view.y + view.h - h - m), w, h };
    if (c.x < view.x || c.y < view.y || c.x + w > view.x + view.w || c.y + h > view.y + view.h) continue;
    if (taken.some((b) => overlap(c, b, 12))) continue;
    return c;
  }
  return null;
}
