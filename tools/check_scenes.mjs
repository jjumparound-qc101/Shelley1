// Check staged sections (src/scenes/data/<id>.js) without a browser: every cue word exists,
// scenes start in order, people, poses, marks, shots, furniture and set pieces are known.
// Uses the aligned words when they exist, otherwise the section text with made-up times.
// Usage: node tools/check_scenes.mjs [id ...]   (default: every data file)
import fs from 'node:fs';
import { makeCues } from '../src/cues.js';
import { resolveCue } from '../src/stagebook.js';
import { CAST } from '../src/cast.js';

const POSES = new Set(['stand', 'back', 'sit', 'kneel', 'lie', 'point', 'grieve', 'walk']);
const SHOTS = new Set(['wide', 'mid', 'close', 'low', 'over', 'high']);
const FURN = new Set(['desk', 'table', 'chair', 'bed', 'bench', 'shelf', 'lab', 'slab', 'dock', 'bars', 'coffin', 'guitar']);
const MID = new Set(['trees', 'cottage', 'hovel', 'church', 'rocks', 'boat', 'ship', 'glacier', 'wall', 'gate']);
const ROOM_MARKS = ['C', 'L', 'R', 'BL', 'BR', 'BC', 'FL', 'FR', 'FC', 'door', 'window', 'off'];
const OUT_MARKS = ['C', 'L', 'R', 'FL', 'FR', 'FC', 'BL', 'BR', 'BC', 'farL', 'farR', 'offL', 'offR', 'off'];

function words(id) {
  const f = `public/data/${id}_words.json`;
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const text = fs.readFileSync(`source/text/${id}.txt`, 'utf8').replace(/_/g, '');
  const paras = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => /[A-Za-z]/.test(p)).slice(1);
  let t = 5;
  return { paragraphs: paras.map((p) => p.split(' ').map((w) => ({ t: w, s: (t += 0.38), e: t + 0.3 }))) };
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync('src/scenes/data').filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
let bad = 0;
for (const id of ids) {
  const errs = [];
  const err = (m) => errs.push(m);
  let scenes;
  try { scenes = (await import(`../src/scenes/data/${id}.js?${Date.now()}`)).default; } catch (e) { console.log(`${id}: cannot load: ${e.message}`); bad++; continue; }
  const cue = makeCues(words(id));
  let prev = -1;
  scenes.forEach((d, k) => {
    const where = `${id}/${d.id ?? k}`;
    let t0 = 0;
    try { t0 = k === 0 && d.start === undefined ? 0 : resolveCue(cue, d.start ?? 0); } catch (e) { err(`${where} start: ${e.message}`); }
    if (t0 <= prev) err(`${where} starts at ${t0.toFixed(1)} s, not after the scene before (${prev.toFixed(1)} s)`);
    prev = t0;
    if (!d.set?.kind) err(`${where}: set.kind missing`);
    const room = d.set?.kind === 'room';
    const marks = new Set([...(room ? ROOM_MARKS : OUT_MARKS), ...((room ? d.set.furniture : []) ?? []).map((f) => (Array.isArray(f) ? f[0] : f))]);
    for (const f of (room ? d.set.furniture : d.set?.mid) ?? []) { const n = Array.isArray(f) ? f[0] : f; if (!(room ? FURN : MID).has(n)) err(`${where}: unknown ${room ? 'furniture' : 'mid piece'} "${n}"`); }
    const markOk = (m) => m === undefined || m === true || typeof m === 'object' || marks.has(m);
    if (d.hero && !CAST[d.hero]) err(`${where}: unknown hero "${d.hero}"`);
    for (const [who, s] of Object.entries(d.cast ?? {})) { if (!CAST[who]) err(`${where}: unknown person "${who}"`); if (!markOk(s.at)) err(`${where}: unknown mark "${s.at}"`); if (s.pose && !POSES.has(s.pose)) err(`${where}: unknown pose "${s.pose}"`); }
    let last = t0 - 1;
    for (const b of d.beats ?? []) {
      let t;
      try { t = resolveCue(cue, b.at, t0); } catch (e) { err(`${where} beat ${JSON.stringify(b.at)}: ${e.message}`); continue; }
      if (t < t0 - 0.01) err(`${where}: beat "${b.at}" (${t.toFixed(1)} s) is before the scene starts`);
      const next = scenes[k + 1];
      if (next) { try { const tn = resolveCue(cue, next.start); if (t >= tn) err(`${where}: beat "${b.at}" falls after the next scene starts`); } catch {} }
      last = Math.max(last, t);
      if (b.who && !CAST[b.who]) err(`${where}: unknown person "${b.who}"`);
      for (const m of [b.to, b.enter, b.exit, b.show]) if (!markOk(m)) err(`${where}: unknown mark "${m}"`);
      if (b.pose && !POSES.has(b.pose)) err(`${where}: unknown pose "${b.pose}"`);
      if (b.shot && !SHOTS.has(b.shot)) err(`${where}: unknown shot "${b.shot}"`);
      for (const w of [b.on ?? []].flat()) if (!CAST[w]) err(`${where}: shot on unknown person "${w}"`);
      if (b.who && !b.to && !b.enter && !b.exit && !b.show && !b.hide && !b.pose && !b.face) err(`${where}: beat for ${b.who} does nothing`);
    }
  });
  if (prev > cue.end) err(`${id}: last scene starts after the section ends`);
  if (errs.length) { bad++; console.log(`${id}: ${errs.length} problem(s)\n  ` + errs.join('\n  ')); }
  else console.log(`${id}: ok (${scenes.length} scenes, ${scenes.reduce((n, d) => n + (d.beats?.length ?? 0), 0)} beats)`);
}
process.exit(bad ? 1 : 0);
