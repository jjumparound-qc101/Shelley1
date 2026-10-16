// The extra props a section's staging names (`props: [[name, description], ...]` in
// src/scenes/data/*.js), set on stage from their AI drawings (public/art/ai/props/<name>).
// Each prop has a height on stage in metres and a kind of place:
//   t  on the table, desk or bench if the room has one (else on the floor)
//   f  on the floor, at the sides of the set
//   w  hung on the back wall (rooms only)
//   b  large, out of doors only: in the middle distance (ships, carriages, trees, graves)
//   h  held or worn by someone on stage (HELD below), a mark on the ground, or seen through the window
// Props stay on stage for the whole scene. Tools: tools/assets_master.mjs lists which are placed.
import * as THREE from 'three';
import { paperFlat } from './stage.js';

export const PROPS = {
  walton_letter: ['t', 0.25], archangel_ship: ['b', 6], walton_charts: ['t', 0.4], creature_sledge: ['b', 1.6],
  telescope: ['t', 0.3], rescue_sledge: ['b', 1.2], blankets: ['f', 0.5], walton_journal: ['t', 0.25],
  straw_plaiting: ['t', 0.35], clerval_sword: ['f', 0.7], agrippa_book: ['t', 0.3], alchemy_books: ['t', 0.45],
  chalk_circle: ['f', 0.45], blasted_oak: ['b', 4.5], mathematics_books: ['t', 0.4], sickroom_table: ['f', 0.9],
  chaise: ['b', 2], book_list: ['t', 0.25], lecture_apparatus: ['f', 1.3], waldman_machines: ['f', 1.4],
  chemical_instruments: ['t', 0.5], shrouded_corpse: ['t', 0.4], charnel_bones: ['f', 1], anatomy_drawings: ['t', 0.3],
  lab_apparatus: ['f', 1.5], bone_basket: ['f', 0.6], father_letters: ['t', 0.2], elizabeth_letter: ['t', 0.2],
  writing_desk: ['t', 0.4], oriental_books: ['t', 0.35], alphonse_letter: ['t', 0.2], cabriolet: ['b', 2],
  caroline_painting: ['w', 1.1], william_miniature: ['w', 0.35], caroline_miniature: ['h'], ballot_urn: ['t', 0.45],
  manacles: ['h'], prison_straw: ['f', 0.4], graves: ['b', 1], mourning_crape: ['w', 0.6], sailing_boat: ['b', 2.5],
  mule: ['b', 1.6], mule_alpine: ['b', 1.6], cloak: ['h'], berries: ['f', 0.9], beggars_fire: ['f', 0.5],
  branch_fan: ['h'], shepherd_breakfast: ['t', 0.35], cooking_pot: ['f', 0.5], stones: ['f', 0.3], window_milk: ['t', 0.3],
  milk_pail: ['h'], pig_sty: ['b', 1.3], bread_cup: ['t', 0.25], tapers: ['t', 0.3], loaf_cheese: ['t', 0.25],
  firewood: ['h'], book: ['t', 0.25], woodpile: ['b', 1.3], felix_tools: ['f', 0.9], white_flower: ['f', 0.25],
  horse: ['b', 1.7], black_veil: ['h'], volney_book: ['t', 0.3], oil_lamp: ['t', 0.35], paris_court_rail: ['f', 1.1],
  chains: ['h'], safie_letters: ['t', 0.2], jewels: ['t', 0.25], portmanteau: ['f', 0.5], three_books: ['f', 0.3],
  victor_journal: ['h'], felix_stick: ['h'], brand: ['h'], combustibles: ['f', 0.9], gun: ['h'], locket: ['h'],
  fountain: ['f', 0.9], carriage: ['b', 2.2], instrument_chest: ['f', 0.7], rhine_castle: ['b', 6],
  letters_of_introduction: ['t', 0.2], packing_case: ['f', 0.7], cows: ['b', 1.4], sheeted_slab: ['f', 0.9],
  torn_remains: ['f', 0.8], fishing_vessels: ['b', 2], packet_of_letters: ['t', 0.2], basket_of_stones: ['f', 0.6],
  oaten_cake: ['t', 0.15], chemical_apparatus: ['f', 0.7], skiff: ['b', 2.2], fishing_tackle: ['f', 0.6],
  medicines: ['t', 0.3], papers: ['t', 0.2], laudanum: ['t', 0.15], writing_things: ['t', 0.25], pistols_dagger: ['t', 0.25],
  wedding_flowers: ['t', 0.5], boat_canopy: ['b', 2], pistol: ['h'], handkerchief: ['h'], fishing_nets: ['f', 0.8],
  oars: ['f', 0.4], law_books: ['t', 0.4], family_tomb: ['b', 1.8], footprints: ['h'], tree_inscription: ['b', 2.5],
  dead_hare: ['f', 0.3], provisions: ['f', 0.6], ice_raft: ['b', 1], walton_notes: ['t', 0.25], felix_letters: ['t', 0.2],
  surgeon_draught: ['t', 0.15], lantern: ['t', 0.4], coffin_victor: ['f', 0.6],
};

// Held and worn props: [height m, who holds it (the first of them on stage in the scene), where].
// Where: hand (held out in front), wrists (across both hands), head (on top), veil (over head and
// shoulders), shoulder (carried on the back), face (laid over the face, as on a body lying down).
export const HELD = {
  caroline_miniature: [0.18, ['judge', 'victor'], 'hand'], manacles: [0.3, ['justine'], 'wrists'],
  cloak: [0.9, ['creature'], 'hand'], branch_fan: [0.6, ['creature'], 'hand'], milk_pail: [0.35, ['agatha'], 'head'],
  firewood: [0.6, ['felix'], 'shoulder'], black_veil: [0.75, ['safie'], 'veil'], chains: [0.5, ['turk', 'victor'], 'wrists'],
  victor_journal: [0.25, ['creature'], 'hand'], felix_stick: [1.1, ['felix'], 'hand'], brand: [0.9, ['creature'], 'hand'],
  gun: [1.2, ['peasant'], 'hand'], locket: [0.15, ['creature'], 'hand'], pistol: [0.35, ['victor'], 'hand'],
  handkerchief: [0.35, ['elizabeth'], 'face'],
};
// Laid flat on the ground in front of the stage, and seen through a room's window.
const GROUND = { footprints: 1.2 };
const WINDOW = { fishing_vessels: 0.7 };

// Whether a prop is set on stage in a set of this kind ('room' or 'outdoor').
export const propPlaced = (name, kind) => {
  const k = PROPS[name]?.[0];
  if (WINDOW[name]) return kind === 'room';
  if (k === 'h') return !!HELD[name] || !!GROUND[name];
  return !!k && !(k === 'w' && kind !== 'room') && !(k === 'b' && kind === 'room');
};

// Where a table-top prop sits on each piece of furniture: the height of its top, as a share of the piece's height.
const TOP = { desk: 0.78, table: 0.8, bench: 0.72, slab: 0.83, lab: 0.8 };
// Floor places keep to the back and sides, clear of the camera's usual mid and close shots.
const ROOM_FLOOR = [[-3.4, -3.3], [3.4, -3.2], [-1.2, -3.8], [1.2, -3.8], [-3.6, -2.4], [3.6, -2.3]];
const OUT_FLOOR = [[-3.6, -4.2], [3.6, -4.0], [-2.4, -5.5], [2.6, -5.6], [-4.8, -2.2], [4.8, -2.0]];
const OUT_FAR = [[-5.5, -8.5], [5.8, -9], [-8, -12], [8, -12.5]];

// Set the scene's props on stage.
export function placeProps(group, ai, set, kind, names) {
  const used = { t: 0, f: 0, w: 0, b: 0 };
  const furn = Object.entries(set.spots ?? {}).filter(([n]) => TOP[n]).sort((a, b) => Object.keys(TOP).indexOf(a[0]) - Object.keys(TOP).indexOf(b[0]))[0];
  const tops = names.filter((n) => PROPS[n]?.[0] === 't').length;
  const clear = (x, z) => Object.values(set.spots ?? {}).every((s) => Math.hypot(s.x - x, s.z - z) > 1.3);
  const sx = set.sx ?? 1, floorSlots = (kind === 'room' ? ROOM_FLOOR : OUT_FLOOR).map(([x, z]) => [x * sx, z]).filter(([x, z]) => clear(x, z));
  for (const name of names) {
    const art = ai[`props/${name}`], tex = art?.tex;
    if (!tex || !propPlaced(name, kind) || HELD[name]) continue;
    let [k, h] = PROPS[name];
    if (GROUND[name]) { // flat on the ground, a little in front of centre stage
      const g = paperFlat(tex, GROUND[name] * (art.aspect ?? 1), GROUND[name], { anchor: 'center', edge: false });
      g.rotation.x = -Math.PI / 2; g.position.set(0.8, 0.02, kind === 'room' ? -1.2 : -1.8); group.add(g); continue;
    }
    if (WINDOW[name]) { // just in front of the view, so it shows through the window
      const v = paperFlat(tex, WINDOW[name] * (art.aspect ?? 1), WINDOW[name], { edge: false });
      v.position.set(2.0 * sx, 1.1, (set.back ?? -4.2) - 2.9); group.add(v); continue;
    }
    if (k === 't' && !furn) k = 'f';
    const w = h * (art.aspect ?? 1);
    const flat = paperFlat(tex, w, h);
    if (k === 't') {
      const [fn, s] = furn, i = used.t++;
      flat.position.set(s.x + (i - (tops - 1) / 2) * 0.3, set.topH?.[fn] ?? (set.furnH?.[fn] ?? 1) * TOP[fn], s.z + 0.04);
    } else if (k === 'w') {
      const i = used.w++;
      flat.position.set((-1.6 + i * 1.2) * sx, 1.5, (set.back ?? -4.2) + 0.03);
    } else if (k === 'b') {
      const i = used.b++, [x, z] = h >= 4 ? [i % 2 ? 7 : -7, -15] : OUT_FAR[i % OUT_FAR.length];
      flat.position.set(x, 0, z);
    } else {
      const i = used.f++, slots = floorSlots.length ? floorSlots : (kind === 'room' ? ROOM_FLOOR : OUT_FLOOR).map(([x, z]) => [x * sx, z]), [x, z] = slots[i % slots.length];
      flat.position.set(x + Math.floor(i / slots.length) * 0.5, 0, z);
    }
    group.add(flat);
  }
}

// Held props: made once per scene, then moved with whoever holds them, at a point of the drawing
// in its current pose (src/puppet.js), so they follow mirroring and the turn toward the camera.
// Hidden while the holder is off stage.
// The front hand in each pose of the AI drawings (figures drawn facing left), read off the
// drawings on a 10% grid: at the side standing, swung forward walking, at the end of the
// arm pointing, on the knee sitting.
const HAND = { stand: [0.12, 0.5], walk: [0.08, 0.5], point: [0.03, 0.14], sit: [0.33, 0.5] };
const POINT = { hand: [0.12, 0.5], wrists: [0.5, 0.55], head: [0.5, 0.03], veil: [0.5, 0.0], shoulder: [0.5, 0.32], face: [0.5, 0.12] };
const pt = new THREE.Vector3();
export function heldProps(group, ai, names, people) {
  const list = [];
  for (const name of names) {
    const art = ai[`props/${name}`], H = HELD[name];
    if (!art?.tex || !H) continue;
    const who = H[1].find((w) => people.includes(w));
    if (!who) continue;
    const flat = paperFlat(art.tex, H[0] * (art.aspect ?? 1), H[0], { anchor: 'center', edge: false });
    flat.visible = false; group.add(flat);
    list.push({ flat, who, at: H[2], h: H[0] });
  }
  return (cast) => {
    for (const p of list) {
      const puppet = cast?.[p.who];
      p.flat.visible = !!puppet?.root.visible;
      if (!p.flat.visible) continue;
      // Lying down, a face cloth sits at the head end (drawn at the left of a lying figure).
      // A drawn pose may mark its hand; the AI drawings don't, so the front hand (left of a figure drawn facing left).
      if (p.at === 'hand' && puppet.poses[puppet.pose]?.userData.hand) puppet.handPoint(pt);
      else puppet.point(...(p.at === 'face' && puppet.pose === 'lie' ? [0.12, 0.35] : p.at === 'hand' ? HAND[puppet.pose] ?? POINT.hand : POINT[p.at]), pt);
      const lift = p.at === 'head' ? p.h * 0.45 : p.at === 'veil' ? -p.h * 0.45 : 0;
      pt.y += lift; group.worldToLocal(pt); // the scene's group may sit anywhere in the world
      p.flat.position.set(pt.x, pt.y, pt.z + 0.02);
      p.flat.rotation.set(0, puppet.root.rotation.y, 0);
    }
  };
}
