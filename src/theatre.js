// The theatre around the toy stage: the opening shot is from a seat in the stalls, looking at
// the toy theatre's front over a row of the audience's heads; after a hold the camera rises up
// the aisle and on through the toy stage into the scene (as the Alice game opens).
// The AI drawings (ai['theatre/house'], ['theatre/seats'], and the sign cut from ['theatre/proscenium']) are used when
// all three are there; the pieces drawn in code below stand in otherwise.
import * as THREE from 'three';
import { paperFlat } from './stage.js';
import { proscenium } from './art.js';
import { canvas, texture, hatch, outline, fillPaper, grain, blob, INK, PAPER } from './ink.js';

// The toy front: 12 x 7.2 m at z = 2.2, its opening 8.4 x 4.6 m, as laid out for an 8.4 m room.
// The rooms are now 5.85 m wide (src/sets/library.js, ROOM_SX), so the whole theatre is built at
// K = 0.7 of that about the toy front's plane: its opening fits the room, nothing shows around it.
export const PROS = { w: 12, h: 7.2, z: 2.2, open: { w: 8.4, h: 4.6, cy: 2.55 } };
const K = 0.7;
const at = ([x, y, z]) => [x * K, y * K, PROS.z + (z - PROS.z) * K];
// The opening shot, from the stalls (scenes start their camera here).
export const SEAT = { pos: at([0, 2.0, 15]), look: at([0, 1.7, -3]) };
// Over the heads, up the aisle, just short of the toy front.
export const AISLE = { pos: at([0, 1.9, 11.0]), look: at([0, 1.5, -3]) };

const HOUSE = { w: 26, h: 15, y0: -3, z: 2.3 }; // the auditorium's front, around the toy front
const PXM = 100; // canvas pixels per metre

function houseArt() {
  const W = HOUSE.w * PXM, H = HOUSE.h * PXM, { c, g } = canvas(W, H);
  const X = (x) => (x + HOUSE.w / 2) * PXM, Y = (y) => (HOUSE.y0 + HOUSE.h - y) * PXM;
  const all = new Path2D(); all.rect(0, 0, W, H);
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  // A dim house: close cross-hatching everywhere, lighter toward the stage.
  hatch(g, all, { angle: 0.75, gap: 5, width: 1, seed: 301, alpha: 0.75 });
  hatch(g, all, { angle: -0.75, gap: 6, width: 1, seed: 302, alpha: 0.55 });
  // The theatre's own arch, framing the toy front.
  const arch = new Path2D();
  arch.moveTo(X(-7.6), Y(-1)); arch.lineTo(X(-7.6), Y(8.2)); arch.quadraticCurveTo(X(0), Y(11.2), X(7.6), Y(8.2)); arch.lineTo(X(7.6), Y(-1)); arch.closePath();
  fillPaper(g, arch);
  hatch(g, arch, { angle: Math.PI / 2, gap: 7, width: 1, seed: 303, alpha: 0.55 });
  outline(g, arch, 5);
  // Heavy curtains drawn back at either side, and a valance of swags across the top.
  for (const s of [-1, 1]) {
    const d = new Path2D();
    const xo = s * 7.5, xi = s * 6.05;
    d.moveTo(X(xo), Y(8.5)); d.lineTo(X(xi), Y(8.5));
    d.quadraticCurveTo(X(xi + s * 0.1), Y(4), X(xi + s * 0.55), Y(2.2));
    d.quadraticCurveTo(X(xi + s * 0.2), Y(1), X(xi + s * 0.35), Y(-0.9)); d.lineTo(X(xo), Y(-0.9)); d.closePath();
    fillPaper(g, d);
    for (let k = 0; k < 6; k++) {
      const f = new Path2D(); const fx = xo - s * (k + 0.5) * Math.abs(xo - xi) / 6;
      f.moveTo(X(fx), Y(8.5)); f.quadraticCurveTo(X(fx + s * 0.25), Y(3.5), X(fx + s * 0.1), Y(-0.9));
      g.save(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(f); g.restore();
    }
    hatch(g, d, { angle: Math.PI / 2 + s * 0.08, gap: 4, width: 1, seed: 310 + s, alpha: 0.7 });
    outline(g, d, 3);
  }
  for (let i = 0; i < 6; i++) {
    const x0 = -6.2 + i * 12.4 / 6, x1 = x0 + 12.4 / 6;
    const sw = new Path2D(); sw.moveTo(X(x0), Y(8.4)); sw.quadraticCurveTo(X((x0 + x1) / 2), Y(6.9), X(x1), Y(8.4)); sw.lineTo(X(x1), Y(8.9)); sw.lineTo(X(x0), Y(8.9)); sw.closePath();
    fillPaper(g, sw); hatch(g, sw, { angle: 0.1, gap: 5, seed: 320 + i, alpha: 0.6 }); outline(g, sw, 2.5);
  }
  // Two tiers of boxes on each side, with dark heads in them.
  for (const s of [-1, 1]) for (let tier = 0; tier < 2; tier++) for (let b = 0; b < 2; b++) {
    const x0 = s < 0 ? -12.6 + b * 2.4 : 8.2 + b * 2.4, y0 = 1.4 + tier * 4.2;
    const box = new Path2D(); box.rect(X(x0), Y(y0 + 3.4), 2.0 * PXM, 3.4 * PXM);
    g.save(); g.fillStyle = 'rgba(23,20,15,0.85)'; g.fill(box); g.restore();
    const rail = new Path2D(); rail.rect(X(x0 - 0.1), Y(y0 + 0.9), 2.2 * PXM, 0.9 * PXM);
    fillPaper(g, rail); hatch(g, rail, { angle: 0, gap: 6, seed: 330 + tier * 4 + b, alpha: 0.6 });
    for (let k = 0; k < 4; k++) { const bx = x0 + 0.25 + k * 0.5; const bal = new Path2D(); bal.ellipse(X(bx), Y(y0 + 0.45), 7, 26, 0, 0, 7); outline(g, bal, 2); }
    outline(g, rail, 3);
    for (let k = 0; k < 2; k++) { const hd = new Path2D(); hd.arc(X(x0 + 0.6 + k * 0.8), Y(y0 + 1.25), 22, Math.PI, 0); g.save(); g.fillStyle = INK; g.fill(hd); g.restore(); }
    const ar = new Path2D(); ar.moveTo(X(x0), Y(y0 + 3.4)); ar.quadraticCurveTo(X(x0 + 1), Y(y0 + 4.0), X(x0 + 2), Y(y0 + 3.4));
    g.save(); g.strokeStyle = PAPER; g.lineWidth = 6; g.stroke(ar); g.restore();
  }
  // The stage's front edge and the footlights.
  const apron = new Path2D(); apron.rect(X(-7.4), Y(0), 14.8 * PXM, 1.0 * PXM);
  fillPaper(g, apron); hatch(g, apron, { angle: 0, gap: 5, seed: 340, alpha: 0.7 }); outline(g, apron, 3);
  for (let k = 0; k < 15; k++) {
    const lx = -6.6 + k * 13.2 / 14;
    const glow = blob(X(lx), Y(0.15), 26, 18, 350 + k, 7, 0.1);
    fillPaper(g, glow); outline(g, glow, 1.5);
    const hood = new Path2D(); hood.rect(X(lx) - 22, Y(0.05), 44, 12); g.save(); g.fillStyle = INK; g.fill(hood); g.restore();
  }
  // The toy front shows through.
  g.clearRect(X(-PROS.w / 2), Y(PROS.h), PROS.w * PXM, PROS.h * PXM);
  grain(g, 0.03, 309);
  return c;
}

// The row in front of our seat: the backs of heads and shoulders, 1810s hats and bonnets.
function seatsArt() {
  const W = 3200, H = 800, { c, g } = canvas(W, H);
  const people = [
    [260, 'top'], [640, 'bonnet'], [1010, 'bare'], [1600, 'child'], [2010, 'top'], [2400, 'bonnet'], [2800, 'bicorne'], [3130, 'bare'],
  ];
  const seat = new Path2D(); seat.rect(0, 470, W, 330);
  fillPaper(g, seat); hatch(g, seat, { angle: 1.57, gap: 9, seed: 401, alpha: 0.7 }); hatch(g, seat, { angle: 0, gap: 7, seed: 402, alpha: 0.5 }); outline(g, seat, 3);
  for (const [x, kind] of people) {
    const k = kind === 'child' ? 0.7 : 1, top = kind === 'child' ? 300 : 150;
    const sh = new Path2D(); sh.ellipse(x, top + 330 * k + 150, 190 * k, 180 * k, 0, Math.PI, 0); sh.lineTo(x + 190 * k, H); sh.lineTo(x - 190 * k, H); sh.closePath();
    fillPaper(g, sh); hatch(g, sh, { angle: 1.2, gap: 4, seed: x, alpha: 0.85 }); outline(g, sh, 3);
    const hd = new Path2D(); hd.ellipse(x, top + 160 * k, 75 * k, 92 * k, 0, 0, 7);
    fillPaper(g, hd); hatch(g, hd, { angle: 1.45, gap: 3.5, seed: x + 1, alpha: 0.9 }); outline(g, hd, 3);
    const hat = new Path2D();
    if (kind === 'top') { hat.rect(x - 62, top - 40, 124, 120); hat.rect(x - 95, top + 70, 190, 18); }
    if (kind === 'bicorne') { hat.moveTo(x - 140, top + 90); hat.quadraticCurveTo(x, top - 40, x + 140, top + 90); hat.closePath(); }
    if (kind === 'bonnet') { hat.ellipse(x, top + 120, 105, 115, 0, Math.PI * 0.9, Math.PI * 2.1); hat.closePath(); }
    if (kind !== 'bare' && kind !== 'child') { fillPaper(g, hat); hatch(g, hat, { angle: 0.2, gap: 3, seed: x + 2 }); outline(g, hat, 3); }
  }
  grain(g, 0.03, 409);
  return c;
}

// The AI theatre (tools/theatre_art.py): the openings cut out of each drawing, in its pixels.
const FRONT_OPEN = { x0: 399, x1: 1137, y0: 274, y1: 775 }; // theatre/proscenium, 1536 x 1024
const HOUSE_OPEN = { x0: 492, x1: 1043, y0: 417, y1: 796 }; // theatre/house: its stage opening

// Builds the theatre into a scene's group. title/sub: lettered on the toy front (the drawn one;
// the AI front has the title lettered on its banner by tools/theatre_art.py).
export function buildTheatre(scene, ai = {}, { title = 'FRANKENSTEIN', sub = '' } = {}) {
  const group = new THREE.Group(); group.scale.setScalar(K); group.position.z = PROS.z * (1 - K); scene.add(group);
  const overSet = (o, r) => o.traverse((m) => { if (m.material) { m.material.depthTest = false; m.material.transparent = true; m.material.fog = false; m.renderOrder = r; } });
  if (ai['theatre/proscenium'] && ai['theatre/house'] && ai['theatre/seats']) {
    // One arch and one set of curtains, as in the Alice game (owner, 2026-10-16): the hall's own
    // stage arch frames the room, its opening as high as the room (3.4 m), its stage floor at the
    // stage floor; the toy front's title sign (cut from theatre/proscenium) hangs from the hall's
    // pelmet. No inner curtains.
    const k2 = 3.4 / K / (HOUSE_OPEN.y1 - HOUSE_OPEN.y0); // metres per pixel of theatre/house (before K)
    const house = paperFlat(ai['theatre/house'].tex, 1536 * k2, 1024 * k2, { edge: false });
    house.position.set((768 - (HOUSE_OPEN.x0 + HOUSE_OPEN.x1) / 2) * k2, -(1024 - HOUSE_OPEN.y1) * k2, PROS.z + 0.1);
    group.add(house);
    const SIGN = { x0: 466, x1: 1074, y0: 96, y1: 230 }; // the sign on theatre/proscenium
    const tex = ai['theatre/proscenium'].tex.clone();
    tex.repeat.set((SIGN.x1 - SIGN.x0) / 1536, (SIGN.y1 - SIGN.y0) / 1024);
    tex.offset.set(SIGN.x0 / 1536, (1024 - SIGN.y1) / 1024); tex.needsUpdate = true;
    const signW = (HOUSE_OPEN.x1 - HOUSE_OPEN.x0) * k2 * 0.62, signH = signW * (SIGN.y1 - SIGN.y0) / (SIGN.x1 - SIGN.x0);
    const pros = paperFlat(tex, signW, signH, { edge: false });
    pros.position.set(0, (HOUSE_OPEN.y1 - 352) * k2 - signH / 2, PROS.z + 0.15); // on the middle of the pelmet's swags
    group.add(pros);
    // One row of the audience (not repeated), drawn wide enough to fill the view from the seat,
    // their heads over the hall's stage front.
    const sa = ai['theatre/seats'].aspect ?? 1500 / 769, seatsW = 7.2, seatsH = seatsW / sa;
    const seats = paperFlat(ai['theatre/seats'].tex, seatsW, seatsH, { edge: false });
    seats.position.set(0, 2.25 - seatsH, 10.5);
    // Dark stalls behind the chair backs, so no paper shows between their legs or past the row's ends.
    const stalls = new THREE.Mesh(new THREE.PlaneGeometry(seatsW * 3, seatsH * 0.45), new THREE.MeshBasicMaterial({ color: '#2b2723' }));
    stalls.position.set(0, seats.position.y + seatsH * 0.225, 10.55); group.add(stalls);
    // All drawn over the set, in this order (only ever seen from the audience's side).
    overSet(house, 50); overSet(pros, 52); overSet(stalls, 55); overSet(seats, 60);
    group.add(seats);
    return { pros, house, seats };
  }
  const { w: PW, h: PH, open } = PROS;
  const CW = 2048, CH = Math.round((CW * PH) / PW);
  const px = (m) => (m / PW) * CW, py = (m) => (m / PH) * CH;
  const frontTex = texture(proscenium(CW, CH, {
    x: px((PW - open.w) / 2), y: py(PH - open.cy - open.h / 2), w: px(open.w), h: py(open.h),
  }, { title, sub }));
  const pros = paperFlat(frontTex, PW, PH, { edge: false });
  pros.position.set(0, 0, PROS.z);
  group.add(pros);

  const house = paperFlat(texture(houseArt()), HOUSE.w, HOUSE.h, { edge: false });
  house.position.set(0, HOUSE.y0, HOUSE.z);
  const seats = paperFlat(texture(seatsArt()), 8, 2, { edge: false });
  seats.position.set(0, -0.1, 14.2); // hat-tops at about the lower third of the opening shot
  // Drawn over the set (and only ever seen from the audience's side), like Alice's house.
  overSet(house, 50); overSet(stalls, 55); overSet(seats, 60);
  group.add(house, seats);
  return { pros, house, seats };
}

// The push from the seat into the scene: hold, then up the aisle and through the toy front,
// eased as one move ending on `end` (a camera key { pos, look }) at time t1.
export function openingKeys(t0, t1, end) {
  const d = t1 - t0;
  return [
    { t: 0, dur: 0, ...SEAT },
    { t: t0, dur: d * 0.55, ...AISLE, exact: true },
    { t: t0 + d * 0.35, dur: d * 0.65, ...end, exact: true },
  ];
}

