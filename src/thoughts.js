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

// An AI vignette is engraved inside its own oval on plain paper, and the ovals differ in shape.
// So the card is cut to that drawn oval: find where the ink is, then show just that part, a
// little inside its engraved rim, so the game's frame takes the rim's place (owner, 2026-10-16).
function inkBox(art) {
  const img = art?.isTexture ? art.image : null;
  if (!img || !img.width || img instanceof HTMLCanvasElement) return null;
  const W = 160, H = Math.max(1, Math.round(160 * img.height / img.width));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  const ink = (x, y) => { const i = (y * W + x) * 4; return d[i] + d[i + 1] + d[i + 2] < 3 * 150; };
  const rowInk = (y) => { let n = 0; for (let x = 0; x < W; x++) n += ink(x, y); return n; };
  const colInk = (x) => { let n = 0; for (let y = 0; y < H; y++) n += ink(x, y); return n; };
  let x0 = 0, x1 = W - 1, y0 = 0, y1 = H - 1;
  while (x0 < x1 && colInk(x0) < 2) x0++;
  while (x1 > x0 && colInk(x1) < 2) x1--;
  while (y0 < y1 && rowInk(y0) < 2) y0++;
  while (y1 > y0 && rowInk(y1) < 2) y1--;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w < W * 0.3 || h < H * 0.3) return null;
  const inset = 0.035;
  return { x: (x0 + w * inset) / W, y: (y0 + h * inset) / H, w: w * (1 - 2 * inset) / W, h: h * (1 - 2 * inset) / H, aspect: (w * img.width / W) / (h * img.height / H) };
}

// list: [{ t0, t1, art (a canvas from props.js, or an AI drawing's texture) }].
// Returns update(t): scenes call it every frame (extra arguments from older scenes are ignored).
export function thoughts(group, list) {
  ensureLayer();
  const cards = list.map(({ t0, t1, art }) => {
    const el = document.createElement('div');
    el.className = 'thought';
    const img = document.createElement('img'); img.alt = ''; el.appendChild(img);
    const trail = [0, 1, 2].map(() => { const b = document.createElement('div'); b.className = 'thought-dot'; layer.appendChild(b); return b; });
    layer.appendChild(el);
    const card = { el, img, art, trail, open: 0, place: null, group, dots: [], aspect: 1024 / 720, ready: false };
    ALL.add(card);
    return { t0, t1, card };
  });
  return (t) => {
    for (const { t0, t1, card } of cards) {
      card.open = smooth((t - t0) / 0.35) * (1 - smooth((t - t1 + 0.35) / 0.35));
      if (!card.ready) fill(card); // as soon as its drawing arrives, so it is decoded before it opens
    }
  };
}

// The picture goes into its card once its drawing has loaded: the AI drawings load per section,
// each into a 1x1 placeholder first, so a card filled at build time showed an empty oval, and its
// picture, never cut to its drawn oval, sat off centre (owner, 2026-10-16). Until then the card stays hidden.
function fill(card) {
  const { art, img } = card, im = art?.isTexture ? art.image : art;
  if (!im || (im.width ?? 0) <= 1) return;
  img.src = source(art);
  const box = inkBox(art);
  if (box) Object.assign(img.style, { width: `${100 / box.w}%`, height: `${100 / box.h}%`, left: `${-100 * box.x / box.w}%`, top: `${-100 * box.y / box.h}%`, objectFit: 'fill' });
  card.aspect = box?.aspect ?? im.width / im.height;
  card.ready = true; card.place = null;
}
const shown = (c) => c.ready && c.img.complete && c.img.naturalWidth > 0;

const overlap = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;

// Called once a frame after the scene is posed. view: the free picture area in CSS pixels
// ({x, y, w, h}: the screen less the text strip and controls); alice: her box on screen, or null.
export function layoutThoughts(view, alice) {
  if (!layer) return;
  const open = [...ALL].filter((c) => c.open > 0.01 && c.group.visible !== false && isShown(c.group));
  for (const c of ALL) if (!open.includes(c)) { c.el.style.display = 'none'; c.trail.forEach((d) => (d.style.display = 'none')); c.place = null; c.lastAlice = null; }
  const taken = alice ? [alice] : [];
  for (const c of open) {
    // Placed once when it opens and then held still: no gliding or bouncing (owner, 2026-10-14 and
    // 2026-10-16: no rubber-banding). It is placed afresh only at a cut, when Alice jumps on screen
    // from one frame to the next and would otherwise be covered, and then in one step, as the cut is.
    const cut = c.lastAlice && alice && Math.hypot(alice.x - c.lastAlice.x, alice.y - c.lastAlice.y) > view.w * 0.12;
    c.lastAlice = alice;
    // Also when the text box has come over it (the text appears a moment after a jump in the story).
    const outside = c.place && (c.place.y + c.place.h > view.y + view.h + 2 || c.place.y < view.y - 2 || c.place.x < view.x - 2 || c.place.x + c.place.w > view.x + view.w + 2);
    if (!c.place || outside || (cut && overlap(c.place, alice, 4))) {
      const narrow = view.w < 600;
      // Sized to the picture: a little over a third of its width, kept clear of the text, and
      // about the same area whatever the oval's shape.
      let w = Math.min(view.w * (narrow ? 0.6 : 0.36), 400, view.h * (narrow ? 0.7 : 0.62) * c.aspect);
      w *= Math.min(1, Math.sqrt(c.aspect / (1024 / 720)));
      let spot = null;
      for (let tries = 0; tries < 4 && !spot; tries++, w *= 0.85) spot = findSpot(view, w, w / c.aspect, taken, alice);
      if (!spot) { w = Math.min(view.w * 0.3, 260); spot = { x: view.x + 8, y: view.y + 8, w, h: w / c.aspect }; }
      c.place = spot;
    }
    const p = c.place, k = c.open;
    taken.push(p);
    // Opening and closing: a plain fade, no growing or shrinking.
    Object.assign(c.el.style, { display: shown(c) ? 'block' : 'none', left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, height: `${p.h}px`, transform: 'none', opacity: k });
    // The trail of small bubbles, from the oval's edge toward her head as it is now.
    const head = alice ? { x: alice.x + alice.w / 2, y: alice.y + alice.h * 0.12 } : null;
    const from = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    c.trail.forEach((d, i) => {
      if (!head || !shown(c)) { d.style.display = 'none'; return; }
      const dx = head.x - from.x, dy = head.y - from.y, L = Math.hypot(dx, dy) || 1;
      // Where the line toward her leaves the oval.
      const ux = dx / L, uy = dy / L, edge = 1 / Math.hypot(ux / (p.w / 2), uy / (p.h / 2));
      const gap = L - edge - 14, r = [14, 10, 6][i];
      if (gap < 30) { d.style.display = 'none'; return; } // her head is right by the oval
      const f = edge + gap * (0.15 + i * 0.25);
      Object.assign(d.style, { display: 'block', left: `${from.x + ux * f - r}px`, top: `${from.y + uy * f - r}px`, width: `${2 * r}px`, height: `${2 * r}px`, opacity: k });
    });
  }
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
