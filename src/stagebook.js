// Scenes from data. Each section's staging is written as plain data in src/scenes/data/<id>.js
// (format: docs/STAGING.md), and turned into scenes here: a set from the library and its props, the cast's
// moves and poses, camera shots and thought vignettes, all keyed to words of the text.
import { buildSet } from './sets/library.js';
import { cameraTrack, smooth, lerp } from './track.js';
import { thoughts } from './thoughts.js';
import { vignette } from './vignettes.js';
import { CAST } from './cast.js';
import { placeProps, heldProps, PROPS } from './props.js';

// A room's AI wall drawings are already furnished, so a cut-out of ordinary furniture standing in
// front of them only doubles what is drawn. It stays only where the staging uses it: someone sits,
// lies or stands at it, or the scene's table-top props are set on it. Story pieces (bars, dock,
// slab, coffin, lab bench, guitar) always stay. (Owner, 2026-10-16.)
const COMMON = new Set(['desk', 'table', 'chair', 'bench', 'bed', 'shelf']);
const TOPS = ['desk', 'table', 'bench', 'slab', 'lab'];
function inUse(d) {
  const used = new Set();
  for (const c of Object.values(d.cast ?? {})) if (typeof c.at === 'string') used.add(c.at);
  for (const b of d.beats ?? []) if (typeof b.to === 'string') used.add(b.to);
  const all = d.set.furniture ?? [], name = (f) => (Array.isArray(f) ? f[0] : f);
  if ((d.props ?? []).some(([p]) => PROPS[p]?.[0] === 't')) used.add(TOPS.find((t) => all.some((f) => name(f) === t)));
  return all.filter((f) => !COMMON.has(name(f)) || used.has(name(f)));
}
import { hatch, blob, fillPaper, outline } from './ink.js';

// A cue: "word", "word#2" (2nd), "word+1.5" / "word#2-0.8" (seconds after or before),
// "^Paragraph start" (start of the paragraph beginning so), or a number (seconds).
// Words are counted from `after` (the scene's start) on.
// A thought's picture: its `art` name, or else its words made into a file name, the same rule
// as tools/assets_master.mjs, which names the vignettes to make.
const thoughtName = (b) => b.art ?? b.think.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);

export function resolveCue(cue, spec, after = 0) {
  if (typeof spec === 'number') return spec;
  let m = /^(.*?)([+-]\d+(?:\.\d+)?)?$/.exec(spec.trim());
  let body = m[1], plus = Number(m[2] ?? 0);
  if (body.startsWith('^')) return cue.para(body.slice(1)) + plus;
  const k = /^(.*)#(\d+)$/.exec(body);
  return cue.at(k ? k[1] : body, k ? Number(k[2]) : 1, after) + plus;
}

// A thought picture for a caption: a simple engraved scene, until the AI vignette arrives.
function placeholderThought(caption, seed) {
  return vignette(caption, (g) => {
    const sky = new Path2D(); sky.rect(0, 0, 512, 360); hatch(g, sky, { angle: 0.1, gap: 9, seed, alpha: 0.35 });
    const shape = blob(256, 230, 150, 80, seed + 1, 8, 0.3); fillPaper(g, shape); hatch(g, shape, { angle: 0.9, gap: 5, seed: seed + 2, alpha: 0.6 }); outline(g, shape, 3);
    g.font = 'italic 26px "IM Fell English", Georgia, serif'; g.textAlign = 'center'; g.fillText('(picture to come)', 256, 240);
  });
}

const FACE = (a, b) => (b.x >= a.x ? 1 : -1);

export function sceneFromData(d, index, sectionId) {
  const art = d.art ?? `${sectionId}_${d.id}`;
  return {
    id: d.id,
    title: d.title,
    hero: d.hero ?? 'victor',
    turn: d.turn,
    art,
    // For loading its drawings (main.js artFor): who is on stage, and its named thought pictures.
    people: [...new Set([d.hero ?? 'victor', ...Object.keys(d.cast ?? {}), ...(d.beats ?? []).map((b) => b.who).filter(Boolean)])],
    thoughtArt: (d.beats ?? []).filter((b) => b.think).map(thoughtName),
    propArt: (d.props ?? []).map(([n]) => n),
    start: (cue) => (index === 0 && d.start === undefined ? 0 : resolveCue(cue, d.start ?? 0)),
    parts: (cue) => (d.parts ?? []).map(([title, at]) => ({ title, t: resolveCue(cue, at, resolveCue(cue, d.start ?? 0)) })),

    build({ group, ai, cue }) {
      const t0 = index === 0 && d.start === undefined ? 0 : resolveCue(cue, d.start ?? 0);
      const T = (spec) => resolveCue(cue, spec, t0);
      const set = buildSet(group, ai, d.set?.kind === 'room' && ai[`sets/${art}/wall_back`] ? { ...d.set, furniture: inUse(d) } : d.set, art);
      placeProps(group, ai, set, d.set?.kind, (d.props ?? []).map(([n]) => n));
      const M = (name) => (typeof name === 'object' ? { ...name, x: name.x * (set.sx ?? 1) } : set.marks[name] ?? set.marks.C); // a room draws spots in (ROOM_SX)

      // ---- The cast: a list of timed events per person.
      const tracks = {};
      const ensure = (who) => (tracks[who] ??= { events: [] });
      for (const [who, s] of Object.entries(d.cast ?? {})) ensure(who).events.push({ t: t0 - 1, at: M(s.at ?? 'C'), pose: s.pose ?? 'stand', dir: s.dir, show: true, face: s.face });
      for (const b of d.beats ?? []) {
        if (!b.who) continue;
        const t = T(b.at);
        const ev = { t, dur: b.dur ?? 3.5, pose: b.pose, dir: b.dir, face: b.face };
        if (b.enter) Object.assign(ev, { from: M(b.enter), at: M(b.to ?? 'C'), show: true });
        else if (b.exit) Object.assign(ev, { at: M(b.exit === true ? 'off' : b.exit), hideAfter: true });
        else if (b.to) ev.at = M(b.to);
        else if (b.hide) ev.hide = true;
        else if (b.show) Object.assign(ev, { show: true, at: b.show === true ? undefined : M(b.show) });
        ensure(b.who).events.push(ev);
      }
      for (const tr of Object.values(tracks)) tr.events.sort((a, b) => a.t - b.t);

      function stateOf(who, t) {
        const tr = tracks[who]; if (!tr) return null;
        let s = { visible: false, pos: M('C'), pose: 'stand', dir: -1 };
        for (const e of tr.events) {
          if (t < e.t) break;
          if (e.hide) { s.visible = false; continue; }
          if (e.show && !e.from) s.visible = true;
          const from = e.from ?? s.pos;
          if (e.from) s.visible = true;
          if (e.at && (e.at.x !== from.x || e.at.z !== from.z)) {
            const k = smooth((t - e.t) / e.dur);
            const moving = t < e.t + e.dur;
            s.pos = { x: lerp(from.x, e.at.x, k), z: lerp(from.z, e.at.z, k), y: lerp(from.y ?? 0, e.at.y ?? 0, k) };
            s.moving = moving; s.dir = FACE(from, e.at); s.dist = Math.hypot(e.at.x - from.x, e.at.z - from.z) * k;
            s.pose = moving ? 'walk' : e.pose ?? (e.hideAfter ? s.pose : 'stand');
            if (!moving && e.hideAfter) s.visible = false;
            if (!moving) { s.endPos = e.at; s.pos = e.at; }
          } else {
            if (e.at) s.pos = e.at;
            s.moving = false;
            if (e.pose) s.pose = e.pose;
          }
          if (e.dir) s.dir = e.dir;
          if (e.face) s.faceWho = e.face;
        }
        return s;
      }
      const posAt = (who, t) => stateOf(who, t)?.pos ?? M('C');
      function actors(t) {
        const out = {};
        for (const who of Object.keys(tracks)) {
          const s = stateOf(who, t);
          if (!s || !s.visible) continue;
          let dir = s.dir;
          if (!s.moving && s.faceWho) dir = FACE(s.pos, posAt(s.faceWho, t));
          const pose = s.pose === 'walk' ? 'stand' : s.pose;
          out[who] = { pose: s.moving ? 'stand' : pose, x: s.pos.x, z: s.pos.z, y: s.pos.y ?? 0, dir, moving: s.moving, dist: s.dist, phase: t * 2, idle: s.moving ? undefined : t + (CAST[who]?.h ?? 1) };
        }
        return out;
      }

      // ---- Shots: worked out from where people will be when the move ends.
      const clampCam = (p) => [Math.max(set.cam.minX, Math.min(set.cam.maxX, p[0])), Math.min(set.cam.maxY, p[1]), Math.max(set.cam.minZ, Math.min(set.cam.maxZ, p[2]))];
      function shot(b, t) {
        const end = t + (b.dur ?? 3);
        const on = [b.on ?? d.hero ?? 'victor'].flat();
        const ps = on.map((w) => ({ ...posAt(w, end), h: CAST[w]?.h ?? 1.75 }));
        const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cz = ps.reduce((a, p) => a + p.z, 0) / ps.length;
        const hh = Math.max(...ps.map((p) => p.h));
        const span = Math.max(0, ...ps.map((p) => Math.abs(p.x - cx))) * 2;
        const side = b.side ?? (cx > 0.5 ? -1 : cx < -0.5 ? 1 : 0);
        const kinds = {
          wide: () => set.shots.wide,
          high: () => set.shots.high,
          mid: () => ({ pos: [cx + side * 0.8, hh * 0.9, cz + 3.4 + span * 0.6], look: [cx, hh * 0.62, cz] }),
          close: () => ({ pos: [cx + side * 0.45, hh * 0.86, cz + 1.9], look: [cx, hh * 0.8, cz] }),
          low: () => ({ pos: [cx + side * 0.6, 0.7, cz + 2.8 + span * 0.5], look: [cx, hh * 0.75, cz] }),
          over: () => {
            const a = ps[0], o = ps[1] ?? { ...a, z: a.z - 2 }; const dx = o.x - a.x, dz = o.z - a.z, L = Math.hypot(dx, dz) || 1;
            // Two people side by side would put the camera looking along the stage, past the edge of the
            // scenery and at cut-outs edge on: then it stands in front of the near one and looks across.
            if (Math.abs(dx) / L > 0.7) return { pos: [a.x - Math.sign(dx) * 0.6, a.h * 0.95, Math.max(a.z, o.z) + 2.2], look: [o.x, o.h * 0.75, o.z] };
            return { pos: [a.x - dx / L * 1.3 + 0.35, a.h * 0.95, a.z - dz / L * 1.3 + 0.6], look: [o.x, o.h * 0.75, o.z] };
          },
        };
        const k = (kinds[b.shot] ?? kinds.mid)();
        return { t, dur: b.dur ?? 3, pos: b.pos ?? clampCam(k.pos), look: b.look ?? k.look };
      }
      const firstShot = (d.beats ?? []).find((b) => b.shot && T(b.at) <= t0 + 0.5);
      const openKey = firstShot ? shot(firstShot, t0) : { ...set.shots.wide };
      // The scene opens on its first shot, a little further back, and settles in.
      const keys = [{ t: t0, dur: 0, pos: [openKey.pos[0], openKey.pos[1] + 0.15, openKey.pos[2] + 0.8], look: openKey.look }, { t: t0 + 0.2, dur: 4, pos: openKey.pos, look: openKey.look }];
      for (const b of d.beats ?? []) if (b.shot && b !== firstShot) keys.push(shot(b, T(b.at)));
      keys.sort((a, b) => a.t - b.t);
      const camera = cameraTrack(keys);

      // ---- Thoughts.
      const think = thoughts(group, (d.beats ?? []).filter((b) => b.think).map((b, i) => ({
        t0: T(b.at), t1: T(b.at) + (b.dur ?? 9),
        art: ai[`vignettes/${thoughtName(b)}`]?.tex ?? placeholderThought(b.think, 900 + i * 7 + index * 31),
      })));

      // ---- Props in someone's hands, moving with them.
      const held = heldProps(group, ai, (d.props ?? []).map(([n]) => n), Object.keys(tracks));

      return {
        T: {}, bg: set.bg, fog: set.fog, bounds: set.bounds, hotspots: [],
        camera, actors, update(t, cast) { set.update(t); think(t); held(cast); },
      };
    },
  };
}
