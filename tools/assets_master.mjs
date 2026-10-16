// Build the master asset list for image generation from the staged sections:
//   docs/ASSETS_MASTER.md  (for people: every prompt, in the order to make them)
//   assets/manifest.json   (for the generation queue: one entry per image)
// Order (owner, 2026-10-15): characters first, those with no drawing yet first; then buildings and
// places; then props and thought vignettes. An image counts as done once approved into
// public/art/ai/index.json. Never edit the outputs by hand; rerun after staging or new art.
// Usage: node tools/assets_master.mjs
import fs from 'node:fs';
import path from 'node:path';
import { CAST } from '../src/cast.js';
import { setPieces } from '../src/sets/library.js';
import { propPlaced } from '../src/props.js';

const ORDER = ['l01', 'l02', 'l03', 'l04', ...Array.from({ length: 23 }, (_, i) => `ch${String(i + 1).padStart(2, '0')}`)];
const LABEL = (id) => (id.startsWith('l') ? `Letter ${+id.slice(1)}` : `Chapter ${+id.slice(2)}`);
const slug = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
// Done = approved into the game (tools/gen_batch.py approve adds it to public/art/ai/index.json).
const have = new Set(fs.existsSync('public/art/ai/index.json') ? JSON.parse(fs.readFileSync('public/art/ai/index.json', 'utf8')) : []);

// Letter 1 is hand-staged: its needs are listed here.
const LETTER1 = [{
  id: 'lodging', art: 'walton_petersburgh', hero: 'walton',
  set: { kind: 'room', wall: 'plaster', floor: 'boards', window: true, view: 'town', weather: 'snow', furniture: ['desk', 'chair', 'shelf'] },
  setNote: 'Walton\'s lodging in St. Petersburgh in December: a plain room with a tall window on a snowy street with onion-domed churches; a writing desk with a candle; a chart of the northern seas on the wall.',
  cast: { walton: { pose: 'stand' } }, beats: [{ who: 'walton', pose: 'back' }, { who: 'walton', pose: 'write' }],
  props: [['sledge', 'a Russian sledge with its horse and a driver wrapped in furs, flying over the snow']],
  thoughts: ['the sun is for ever visible, its broad disk just skirting the horizon', 'the wondrous power which attracts the needle', 'the whale-fishers on an expedition to the North Sea'],
}];

const sections = [];
for (const id of ORDER) {
  const f = `src/scenes/data/${id}.js`;
  if (id === 'l01') sections.push({ id, scenes: LETTER1 });
  else if (fs.existsSync(f)) sections.push({ id, scenes: (await import(`../${f}`)).default });
}

// ---- Collect.
const people = {}; // who -> { poses: Set, sections: Set }
const places = {}; // art -> { spec, note, sections: Set, scenes: [] }
const props = {};  // name -> { desc, sections: Set }
const thoughts = []; // { caption, section }
for (const { id, scenes } of sections) for (const d of scenes) {
  const use = (who, pose) => { if (!CAST[who]) return; const p = (people[who] ??= { poses: new Set(['stand']), sections: new Set() }); p.sections.add(id); if (pose) p.poses.add(pose === 'walk' ? 'walk' : pose); };
  for (const [who, s] of Object.entries(d.cast ?? {})) use(who, s.pose);
  for (const b of d.beats ?? []) { if (b.who) { use(b.who, b.pose); if (b.to || b.enter || b.exit) use(b.who, 'walk'); } for (const w of [b.on ?? []].flat()) use(w); if (b.think) thoughts.push({ caption: b.think, section: id, art: b.art }); }
  for (const c of d.thoughts ?? []) thoughts.push({ caption: c, section: id });
  const art = d.art ?? `${id}_${d.id}`;
  const pl = (places[art] ??= { spec: d.set, note: d.setNote, sections: new Set(), titles: [] });
  pl.sections.add(id); pl.titles.push(`${LABEL(id)}: ${d.title ?? d.id}`); if (!pl.note && d.setNote) pl.note = d.setNote;
  for (const [n, desc] of d.props ?? []) { const p = (props[slug(n)] ??= { desc, sections: new Set(), kinds: new Set() }); p.sections.add(id); p.kinds.add(d.set?.kind); }
}

// ---- Prompts.
const STYLE = `I'm making art for a game based on Mary Shelley's Frankenstein (1818), staged as a Regency-era paper toy theatre. Everything must look like an early 19th-century steel or wood engraving, in the manner of Theodor von Holst's 1831 frontispiece for the novel.

Style rules for every image in this conversation:
- Black ink on pure white paper. Shading ONLY with engraved lines: parallel hatching, cross-hatching, stipple and short flicks. No grey wash, no gradients, no colour.
- Gothic and Romantic in mood: deep night shadows built from dense cross-hatching, strong light from candles, moon or lightning.
- Period accuracy: the 1790s (Geneva, Ingolstadt, the Alps, Scotland, Ireland, the Arctic). High-waisted gowns, tailcoats, cravats, breeches and boots.
- One subject per image, whole and uncropped, with clear white space around it so it can be cut out (unless I ask for a full-frame background).
- No text, no signature, no frame or border.

Reply "ready" and wait for my first request.`;

const POSE_TEXT = {
  stand: 'standing, full figure, facing three-quarters left, arms at the sides',
  walk: 'walking to the left in mid-stride, full figure (one step; the game alternates it with standing)',
  back: 'seen from behind, full figure, standing still and looking away into the scene',
  sit: 'seated on a plain wooden chair, full figure including the chair, facing three-quarters left',
  kneel: 'kneeling on both knees, full figure, facing three-quarters left',
  lie: 'lying flat on his or her back, full figure seen from the side, head to the left',
  point: 'standing, one arm raised and pointing ahead to the left, full figure',
  grieve: 'standing bowed with the face buried in both hands, full figure',
  write: 'seated at a writing desk, writing with a quill, seen from in front across the desk',
};
const entries = [];
// In the game = the game has a place that shows it (owner, 2026-10-16: the list should say both
// whether a picture is made and whether it is in the game). Model sheets are only for drawing the
// poses. Letter 1's room (src/sets/lodging.js) uses the shared boards floor, not a floor of its own.
// An extra prop is on stage where src/props.js places it for that kind of set; Letter 1's sledge always.
const NOT_PLACED = new Set(['sets/walton_petersburgh/floor']);
const propOnStage = (name) => name === 'sledge' || [...(props[name]?.kinds ?? [])].some((k) => propPlaced(name, k));
const placed = (e) => (e.file.endsWith('_sheet') ? null : e.group === 'Extra props (later)' ? propOnStage(e.file.slice(6)) : !NOT_PLACED.has(e.file));
// Online = uploaded to the published page's picture store (assets/artifact_urls.json).
const online = new Set(Object.keys(fs.existsSync('assets/artifact_urls.json') ? JSON.parse(fs.readFileSync('assets/artifact_urls.json', 'utf8')) : {}));
const add = (e) => entries.push({ ...e, done: have.has(e.file), game: placed(e), online: online.has(e.file) });

// 1. Characters: no drawing yet first, then by how many sections they appear in.
const anyDrawn = (who) => [...have].some((f) => f.startsWith(`cast/${who}_`));
const order = Object.keys(people).sort((a, b) => (anyDrawn(a) - anyDrawn(b)) || (people[b].sections.size - people[a].sections.size));
for (const who of order) {
  const c = CAST[who], p = people[who];
  add({ group: 'Characters', who, file: `cast/${who}_sheet`, size: '1536x1024', title: `${c.name}: model sheet`,
    prompt: `Character model sheet for ${c.name}. ${c.desc} Height about ${c.h.toFixed(2)} m${who === 'creature' ? ' (eight feet, towering over everyone)' : ''}. Show FOUR full-body views side by side, the same height: front, three-quarter left, profile left, back. Neutral standing pose, arms relaxed. Clear white space between the figures. No ground, no background.`,
    note: `Appears in ${[...p.sections].map(LABEL).join(', ')}.` });
  for (const pose of ['stand', 'walk', 'back', 'sit', 'kneel', 'lie', 'point', 'grieve', 'write'].filter((q) => p.poses.has(q))) {
    add({ group: 'Characters', who, file: `cast/${who}_${pose}`, size: pose === 'lie' ? '1536x1024' : '1024x1536', title: `${c.name}: ${pose}`,
      prompt: `${c.name}, ${POSE_TEXT[pose]}. Match the attached model sheet exactly (same face, hair, costume and proportions). White background, no ground, no shadow.`, ref: `cast/${who}_sheet` });
  }
}

// 2. Buildings and places: each place's own walls, window view or far scenery; then the shared
// pieces drawn once and used everywhere (floors, grounds, mid-ground pieces, furniture).
const common = {}; // name -> { what, sections: Set, places: Set }
const share = (name, what, pl, art) => { const c = (common[name] ??= { what, sections: new Set(), places: new Set() }); for (const s of pl.sections) c.sections.add(s); c.places.add(art); };
for (const [art, pl] of Object.entries(places)) {
  const spec = pl.spec ?? { kind: 'room' };
  for (const [piece, kind, what] of setPieces(spec)) {
    if (kind === 'floor') { const t = spec.kind === 'room' ? `floor_${spec.floor ?? 'boards'}` : `ground_${spec.ground ?? 'grass'}`; share(t, what.replace(/,? seamless/, ''), pl, art); continue; }
    if (kind === 'prop' || kind === 'structure') { share(piece, kind === 'prop' ? 'furniture' : 'scenery', pl, art); continue; }
    const full = kind === 'background' || kind === 'wall';
    add({ group: 'Buildings and places', art, file: `sets/${art}/${piece}`, size: '1536x1024', title: `${art}: ${piece.replace('_', ' ')}`,
      prompt: `${pl.note ?? art.replace(/_/g, ' ')} Draw the ${what}${full ? ', filling the whole image edge to edge' : ', on white'}.${kind === 'wall' ? ' Flat, straight-on, as a theatre backdrop; leave any window panes plain white (the game cuts them out).' : ''}`,
      note: pl.titles.join('; ') });
  }
  if (spec.kind !== 'room') { const wing = spec.wings ?? (['ice', 'snow', 'water', 'deck'].includes(spec.ground) ? null : 'trees'); if (wing) share(wing, 'scenery', pl, art); }
}
const COMMON_TEXT = {
  trees: 'a tall clump of old trees with full foliage, as a cut-out stage flat', rocks: 'a group of rugged rocks and boulders, as a cut-out stage flat',
  cottage: 'a small, low, thatched country cottage seen from the front', hovel: 'a low lean-to hovel of wood against a cottage wall, with a tiny door',
  church: 'a small stone church with a steeple', boat: 'a small sailing boat on the shore', ship: 'a three-masted sailing ship of the 1790s, side view',
  glacier: 'a jagged mass of glacier ice with crevasses', wall: 'a length of old stone wall', gate: 'a stone gateway with an iron gate',
  desk: 'a writing desk with a candle, papers and a quill', table: 'a plain wooden table', chair: 'a plain wooden chair', bed: 'a curtained bed of the 1790s, side view',
  bench: 'a long wooden bench', shelf: 'a bookcase full of old books', lab: 'a workbench crowded with chemical apparatus, retorts and galvanic instruments',
  slab: 'a long wooden dissecting table', dock: 'the prisoner\'s dock of a courtroom, a wooden rail enclosure', bars: 'a barred prison window set in stone',
  coffin: 'a plain wooden coffin on trestles, lid off', guitar: 'a guitar leaning against a stool',
};
const tiles = Object.keys(common).filter((n) => /^(floor|ground)_/.test(n)).sort();
for (const n of tiles) add({ group: 'Buildings and places', art: 'shared floors and grounds', file: `sets/common/${n}`, size: '1024x1024', title: n.replace('_', ': '),
  prompt: `A ${common[n].what} for a stage floor: ${n.split('_')[1]}, seen from straight above. A seamless tile, so copies join without a seam. Filling the whole image.`, note: `${common[n].places.size} places` });
const used = (n) => [...common[n].sections].length;
for (const n of Object.keys(common).filter((n) => !tiles.includes(n)).sort((a, b) => used(b) - used(a)))
  add({ group: 'Props', file: `sets/common/${n}`, size: common[n].what === 'scenery' ? '1536x1024' : '1024x1024', title: `${n} (${common[n].what})`,
    prompt: `${(COMMON_TEXT[n] ?? n)[0].toUpperCase()}${(COMMON_TEXT[n] ?? n).slice(1)}. One piece, whole, on white, as a cut-out for a toy theatre.`, note: `used in ${common[n].places.size} places` });

// 3. Thought vignettes, in story order, then the extra props the staging mentions (not on stage yet).
const seen = new Set();
for (const t of thoughts) {
  const name = t.art ?? slug(t.caption);
  if (seen.has(name)) continue; seen.add(name);
  add({ group: 'Thought vignettes', file: `vignettes/${name}`, size: '1536x1024', title: t.caption, prompt: `A small engraved vignette picture filling an oval: ${t.caption}. Drawn large and close so it reads at a small size.`, note: LABEL(t.section) });
}
for (const [name, p] of Object.entries(props)) if (!common[name]) add({ group: 'Extra props (later)', file: `props/${name}`, size: '1024x1024', title: name.replace(/_/g, ' '), prompt: `${p.desc[0].toUpperCase()}${p.desc.slice(1)}. One object, whole, on white.`, note: [...p.sections].map(LABEL).join(', ') });

// ---- Write.
fs.mkdirSync('assets', { recursive: true });
fs.writeFileSync('assets/manifest.json', JSON.stringify({ style: STYLE, entries }, null, 1));
const done = entries.filter((e) => e.done).length;
const slots = entries.filter((e) => e.game !== null).length;
const inGame = entries.filter((e) => e.done && e.game).length;
const live = entries.filter((e) => e.done && e.game && e.online).length;
const notPlaced = entries.filter((e) => e.game === false);
const sheets = entries.length - slots;
const mark = (v) => (v === null ? '-' : v ? 'yes' : 'no');
const status = `**Made:** ${done} of ${entries.length} images. **In the game:** ${inGame} of ${slots} (the ${sheets} model sheets are only for drawing the poses). **On the published page:** ${live} of ${slots}.\n\nEach line says **made** (approved into \`public/art/ai/\`), **in game** (the game shows it) and **online** (uploaded to the published page). A dash means it does not apply.\n\n## Not in the game yet (${notPlaced.length})\nMade but with no place in the game yet (src/props.js says where each extra prop goes: on a table or the floor, on the wall, in the distance, or in someone's hands).\n${notPlaced.map((e) => `- \`${e.file}\` (${e.done ? 'made' : 'not made'})`).join('\n')}\n`;
const groups = ['Characters', 'Buildings and places', 'Props', 'Thought vignettes', 'Extra props (later)'];
let md = `# Master Asset List\nGenerated by \`tools/assets_master.mjs\` from the staged sections (\`src/scenes/data/\`, Letter 1 in the script). **Don't edit by hand**: change the staging, then rerun.\n\n${groups.map((g) => `${g}: ${entries.filter((e) => e.group === g).length}`).join(' · ')}.\n\n${status}\nImages are made in batches with \`python3 tools/gen_batch.py next\` and ticked here once approved (\`gen_batch.py approve\`).\n\n## How to use this list\n1. Make the images in this order: characters first (each character's **model sheet** first, then its poses with the sheet attached), then buildings and places, then shared props and scenery, then thought vignettes. The game draws a simple placeholder for anything not made yet, so any order works. \"Extra props\" are objects the staging mentions; src/props.js sets them on stage.\n2. Paste the **style block** first in a new image conversation (or the generator puts it in front of every prompt).\n3. Save each image under its file name (the path in \`source/ai/\`). Characters drawn facing left; the game mirrors them.\n4. Reject anything with grey wash, colour, text, a border or a cropped figure.\n\n## Style block\n\`\`\`\n${STYLE}\n\`\`\`\n`;
for (const g of groups) {
  const list = entries.filter((e) => e.group === g);
  md += `\n## ${g} (${list.filter((e) => e.done).length} of ${list.length} made, ${list.filter((e) => e.done && e.game).length} in the game)\n`;
  let head = null;
  for (const e of list) {
    const h = e.who ? CAST[e.who].name : e.art ?? null;
    if (h && h !== head) { md += `\n### ${h}\n`; head = h; }
    md += `- [${e.done ? 'x' : ' '}] \`${e.file}.png\` made: ${mark(e.done)} · in game: ${mark(e.game === null ? null : e.done && e.game)} · online: ${mark(e.game === null ? null : e.done && e.game && e.online)}. (${e.size}) ${e.title}${e.note ? `. _${e.note}_` : ''}\n  > ${e.prompt}${e.ref ? ` Attach: \`${e.ref}\`.` : ''}\n`;
  }
}
fs.writeFileSync('docs/ASSETS_MASTER.md', md);
console.log(`${entries.length} images (${done} done): ${groups.map((g) => `${g} ${entries.filter((e) => e.group === g).length}`).join(', ')}`);
