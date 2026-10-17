import { layoutThoughts } from './thoughts.js';
import * as THREE from 'three';
import { Puppet } from './puppet.js';
import { makeCues } from './cues.js';
import { smooth } from './track.js';
import { Page } from './narration.js';
import { Explorer } from './explore.js';
import { PerfMeter } from './perf.js';
import { sentenceStarts, skip, Timeline } from './navigate.js';
import { CHAPTERS, READING, READINGS, readings, setReading } from './book.js';
import { texture } from './ink.js';
import { waltonStanding, waltonBack, waltonWriting } from './figures.js';
import { CAST } from './cast.js';
import { personArt, POSES } from './people.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = `frankenstein.place.v1${READING === 'cori' ? '' : `.${READING}`}`; // one place per reading
const SPEED_KEY = 'frankenstein.speed.v1';
const SPEEDS = [1, 1.25, 1.5, 2];

// The reader's place: the chapter, and the time reached in each chapter. Browser storage
// can be missing or blocked, so every access is guarded and the game works without it.
const place = {
  load() {
    try {
      const p = JSON.parse(localStorage.getItem(SAVE_KEY));
      return p ?? null;
    } catch { return null; }
  },
  save(chapter, t) {
    try {
      const p = this.load() ?? { times: {} };
      p.chapter = chapter;
      p.times[chapter] = t;
      p.seen = p.seen ?? {};
      p.seen[chapter] = Math.max(p.seen[chapter] ?? 0, t); // how far the reader has got, for the ticks in the contents
      p.at = Date.now(); // when, so a reload soon after puts the reader straight back (see below)
      localStorage.setItem(SAVE_KEY, JSON.stringify(p));
    } catch {}
  },
};
const play = (audio) => audio.play().catch(() => {}); // interrupted by pause(): expected
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

async function main() {
  const renderer = new THREE.WebGLRenderer({ canvas: $('stage'), antialias: true });
  // Touch screens (phones, tablets) render at a lower resolution, to stay smooth and cool.
  const coarse = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#efe9da', 9, 34);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.02, 80);

  // AI drawings, listed in public/art/ai/index.json as paths without the extension (e.g.
  // "cast/victor_stand"); every set falls back to its code-drawn placeholder for any that are missing.
  // There are hundreds, so they load per section (artFor/loadArt below): each texture exists from the
  // start with its size (public/art/ai/sizes.json), and its picture is fetched when a section that
  // uses it opens, and dropped again when the reader moves on. Model sheets are only references for
  // drawing the poses, so the game skips them.
  const AI_ART = (await fetch('art/ai/index.json').then((r) => (r.ok ? r.json() : [])).catch(() => [])).filter((n) => !n.endsWith('_sheet'));
  const SIZES = await fetch('art/ai/sizes.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  // The published page keeps its pictures in the artifact's asset store (a version may hold only
  // 511 files): art/ai/urls.json maps each name to its stored copy. Locally there is none.
  const URLS = await fetch('art/ai/urls.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  // Each thought picture's oval (tools/vignette_ovals.py): the largest oval inside its engraving.
  const OVALS = await fetch('art/ai/ovals.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const narrated = CHAPTERS.filter((c) => c.narrated);
  const wordsList = await Promise.all(narrated.map((c) => fetch(c.words).then((r) => r.json())));
  const mapList = await Promise.all(narrated.map((c) => (c.map ? fetch(c.map).then((r) => r.json()) : null)));
  const ai = {};
  const BLANK = document.createElement('canvas'); BLANK.width = BLANK.height = 1;
  for (const n of AI_ART) {
    if (!SIZES[n]) continue;
    const tex = new THREE.Texture(BLANK);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (OVALS[n]) tex.userData.oval = OVALS[n];
    ai[n] = { tex, aspect: SIZES[n][0] / SIZES[n][1] };
  }
  const artLoads = new Map(); // name -> promise of its picture
  function loadArt(names) {
    return Promise.all(names.filter((n) => ai[n]).map((n) => {
      if (!artLoads.has(n)) artLoads.set(n, new THREE.ImageLoader().loadAsync(URLS[n] ?? `art/ai/${n}.webp`)
        .then((img) => { ai[n].tex.image = img; ai[n].tex.needsUpdate = true; })
        .catch(() => artLoads.delete(n)));
      return artLoads.get(n);
    }));
  }
  function dropArt(keep) {
    for (const n of [...artLoads.keys()]) {
      if (keep.has(n)) continue;
      ai[n].tex.dispose(); ai[n].tex.image = BLANK; ai[n].tex.needsUpdate = true;
      artLoads.delete(n);
    }
  }
  // The drawings a section uses: its sets, its people, its thought pictures and the shared pieces.
  function artFor(c) {
    const sets = new Set(c.scenes.flatMap((d) => d.arts ?? [d.art]).filter(Boolean));
    const people = new Set(c.scenes.flatMap((d) => d.people ?? [d.hero]).filter(Boolean));
    const thoughts = new Set(c.scenes.flatMap((d) => d.thoughtArt ?? []));
    const props = new Set(c.scenes.flatMap((d) => d.propArt ?? []));
    return Object.keys(ai).filter((n) => {
      const [kind, a, b] = n.split('/');
      if (kind === 'cast') return people.has(a.replace(/_[a-z]+(_\d)?$/, '')) && !a.endsWith('_walk4') && !(a.endsWith('_walk') && ai[`cast/${a}_1`]);
      if (kind === 'sets') return a === 'common' || sets.has(a);
      if (kind === 'vignettes') return thoughts.has(a);
      if (kind === 'props') return props.has(a);
      return true; // anything else (e.g. l01/...) is small: always
    });
  }
  // Lettering on the proscenium, props and title pages is drawn to canvas, so the fonts must be loaded first.
  if (document.fonts) await Promise.all([document.fonts.load('600 64px "IM Fell English"'), document.fonts.load('italic 40px "IM Fell English"')]);

  // Each narrated chapter's text timings and scene start times are known up front (for the
  // contents); its sets are built the first time it is opened.
  narrated.forEach((c, i) => {
    c.wordsData = wordsList[i];
    c.cue = makeCues(c.wordsData, mapList[i]);
    c.starts = c.scenes.map((def) => def.start(c.cue));
    // Marks: each scene, and the named parts within it (for the contents, the timeline and Shift+arrows).
    c.marks = c.scenes.flatMap((def, i) => [{ title: def.title, t: c.starts[i] }, ...(def.parts?.(c.cue) ?? [])]);
  });
  function build(c) {
    if (c.built) return c.built;
    const scenes = c.scenes.map((def, i) => {
      const group = new THREE.Group();
      group.visible = false;
      scene.add(group);
      return { def, group, start: c.starts[i], ...def.build({ group, ai, cue: c.cue }) };
    });
    const words = c.wordsData;
    const flat = words.paragraphs.flat();
    const sentences = sentenceStarts(words);
    const lastSentence = flat.filter((w) => w.s >= sentences[sentences.length - 1]).map((w) => w.t).join(' ');
    c.built = { scenes, cue: c.cue, words, sentences, sceneStarts: c.marks.map((m) => m.t), lastSentence };
    return c.built;
  }

  // A pose drawn in code: { tex, aspect, height, facesLeft }.
  const drawn = (c, height) => ({ tex: texture(c), aspect: c.width / c.height, height, facesLeft: true });
  // A pose from an AI drawing in `ai`.
  const art = (name, height, facesLeft = true) => ({ ...ai[name], height, facesLeft });
  // Watch mode: if the hero is partly in the shot but cut by its edge (or hidden under the text
  // strip), turn the camera just enough to take her in. Shots that leave her out altogether
  // (close-ups, her point of view, other characters) are left alone. (Owner, 2026-10-13.)
  const corner = new THREE.Vector3();
  // The hero's box on screen (CSS pixels), from points on the card; null if not shown or
  // behind the camera. Also the box in view coordinates (-1..1), for keepHeroInFrame.
  // The figure the shots follow: the scene's `hero` (Walton in the Letters).
  function heroOnScreen() {
    const al = cast[active?.def.hero ?? 'walton'], flat = al?.poses[al.pose];
    if (!al) return null;
    if (!al.root.visible || !flat) return null;
    camera.updateMatrixWorld();
    const [w, h] = flat.userData.size;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, inside = 0, n = 0;
    for (const u of [0.15, 0.5, 0.85]) for (const v of [0.05, 0.5, 0.95]) {
      flat.localToWorld(corner.set((u - 0.5) * w, v * h, 0)).project(camera);
      if (corner.z > 1) return null;
      n++; if (Math.abs(corner.x) <= 1 && corner.y <= 1 && corner.y >= -0.4) inside++;
      x0 = Math.min(x0, corner.x); x1 = Math.max(x1, corner.x); y0 = Math.min(y0, corner.y); y1 = Math.max(y1, corner.y);
    }
    const r = renderer.domElement.getBoundingClientRect(), W = r.width, H = r.height; // the picture on screen (a band on portrait phones)
    return { ndc: { x0, x1, y0, y1 }, inside, n, px: { x: r.left + (x0 + 1) / 2 * W, y: r.top + (1 - y1) / 2 * H, w: (x1 - x0) / 2 * W, h: (y1 - y0) / 2 * H } };
  }
  // Watch mode: if the hero is partly in the shot but cut by its edge (or hidden under the text strip),
  // turn the camera just enough to take her in. The turn is eased in and out over about half a
  // second (owner, 2026-10-14: it used to snap on and off, which made the camera jerk).
  const nudge = { yaw: 0, pitch: 0, last: 0 };
  function keepHeroInFrame(dt, seeked) {
    // Measured against the shot as directed (before this frame's turn), so the target is absolute.
    const a = heroOnScreen();
    let yaw = 0, pitch = 0;
    if (a && a.inside > 0 && a.inside < a.n) {
      const { x0, x1, y0, y1 } = a.ndc, M = 0.92, BOTTOM = -0.38;
      let dx = 0, dy = 0;
      if (x1 - x0 < 2 * M) dx = x1 > M ? x1 - M : x0 < -M ? x0 + M : 0;
      if (y1 - y0 < M - BOTTOM) dy = y0 < BOTTOM ? y0 - BOTTOM : y1 > M ? y1 - M : 0;
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), cap = 0.3;
      yaw = -THREE.MathUtils.clamp(Math.atan(dx * tanV * camera.aspect), -cap, cap);
      pitch = THREE.MathUtils.clamp(Math.atan(dy * tanV), -cap, cap);
    }
    const k = seeked ? 1 : 1 - Math.exp(-dt / 0.6);
    nudge.yaw += (yaw - nudge.yaw) * k;
    nudge.pitch += (pitch - nudge.pitch) * k;
    camera.rotateY(nudge.yaw);
    camera.rotateX(nudge.pitch);
  }
  // The picture free of the text strip and the controls, for the thought bubbles.
  // The picture less the text and controls. The text box grows and shrinks with each sentence, so
  // the space kept for it is its full height (22% of the screen at most, style.css), and a thought
  // placed beside it stays clear of it whatever is said next.
  function freeView() {
    const pic = renderer.domElement.getBoundingClientRect();
    let top = pic.top, bottom = pic.bottom, left = pic.left, right = pic.right;
    const full = innerHeight * 0.22;
    for (const id of ['page', 'controls', 'timeline']) {
      const el = document.getElementById(id); if (!el || getComputedStyle(el).display === 'none') continue; // (offsetParent is always null for these fixed boxes)
      const r = el.getBoundingClientRect(); if (r.height === 0 || r.width < innerWidth * 0.3) continue;
      if (r.top >= pic.bottom || r.bottom <= pic.top) continue; // not over the picture
      if (r.height > pic.height * 0.5) { if (r.left > pic.left + pic.width / 2) right = Math.min(right, r.left - 6); else left = Math.max(left, r.right + 6); continue; } // text at the side
      const h = id === 'page' ? Math.max(r.height, full) : r.height;
      if (r.top > pic.top + pic.height * 0.45) bottom = Math.min(bottom, r.bottom - h - 6); else if (r.bottom < pic.top + pic.height * 0.55) top = Math.max(top, r.top + h + 6);
    }
    return { x: left, y: top, w: right - left, h: Math.max(80, bottom - top) };
  }

  // The cast. Placeholder figures drawn in code (figures.js) until the AI drawings arrive;
  // an AI drawing named like the pose (e.g. ai['cast/walton_stand']) replaces it.
  const pose = (name, draw, height, facesLeft = true) => ai[`cast/${name}`] ? art(`cast/${name}`, height, facesLeft) : drawn(draw(), height);
  // Everyone else (src/cast.js): the generic placeholder person in each pose (people.js). The step
  // drawing is the puppet's `walk_a`, so walking alternates it with standing.
  const lazyPose = (who, p, h) => {
    const name = `cast/${who}_${p}`;
    if (ai[name]) return art(name, p === 'lie' ? h * 0.35 : h * (p === 'sit' ? 0.74 : p === 'kneel' ? 0.68 : 1));
    const c = personArt({ ...CAST[who].look, label: CAST[who].name }, p);
    return drawn(c, p === 'lie' ? h * 0.34 : h * c.height / 760);
  };
  // A drawn four-step walk (tools/walk_split.py: walk_1..walk_4, lined up by the feet) replaces
  // the single step drawing.
  const walkPoses = (who, h) => (ai[`cast/${who}_walk_1`]
    ? Object.fromEntries([1, 2, 3, 4].map((i) => [`walk_${i}`, art(`cast/${who}_walk_${i}`, h)]))
    : { walk_a: lazyPose(who, 'walk', h) });
  const cast = {
    walton: new Puppet({
      stand: pose('walton_stand', waltonStanding, 1.8),
      back: pose('walton_back', waltonBack, 1.8),
      write: pose('walton_write', waltonWriting, 1.42),
      ...walkPoses('walton', 1.8),
      ...Object.fromEntries(['sit', 'kneel', 'lie', 'point', 'grieve'].map((p) => [p, lazyPose('walton', p, 1.8)])),
    }, 1.8),
    ...Object.fromEntries(Object.entries(CAST).filter(([who]) => who !== 'walton').map(([who, c]) =>
      [who, new Puppet({ ...Object.fromEntries(POSES.filter((p) => p !== 'walk').map((p) => [p, lazyPose(who, p, c.h)])), ...walkPoses(who, c.h) }, c.h)])),
  };
  Object.values(cast).forEach((p) => scene.add(p.root));

  const audio = $('narration');
  const explorer = new Explorer(camera, renderer.domElement, null);

  // The open chapter. Everything that differs between chapters hangs off `ch`.
  let chapter = null, ch = null, page = null;
  const sceneAt = (t) => ch.scenes.reduce((cur, s) => (t >= s.start ? s : cur), ch.scenes[0]);

  let mode = 'watch';
  let active = null;
  const LAYOUTS = ['bottom', 'top', 'side'];
  let layout = 'bottom';
  // On a phone held upright the text always sits below the picture, as a page of running text.
  const shownLayout = () => (document.body.dataset.form === 'portrait' ? 'side' : layout);
  function setLayout(l) {
    layout = l;
    document.body.dataset.text = shownLayout();
    page?.setLayout(shownLayout());
    $('layoutBtn').textContent = `Text: ${l[0].toUpperCase()}${l.slice(1)}`;
    resize();
  }
  let shown = null;
  // The chapter's end: the narration fades, then the end card offers what to do next.
  const atEnd = () => audio.ended || audio.currentTime >= ch.cue.end + 0.8;
  let endDismissed = false;

  // Open a chapter: build its sets if needed, point the narration, text, timeline and
  // end card at it, and wait until its audio can be positioned.
  let switching = false; // while a chapter's narration loads, don't save its time
  async function openChapter(c) {
    if (chapter === c) return;
    if (chapter) place.save(chapter.n, audio.currentTime);
    switching = true;
    audio.pause();
    // Free the pictures held on the graphics card (owner, 2026-10-14: the tab ran out of memory late in
    // the book and the browser reloaded the page). Textures upload again by themselves when next shown.
    if (chapter) freeTextures();
    chapter = c;
    const need = artFor(c);
    dropArt(new Set(need));
    await loadArt(need);
    ch = build(c);
    if (active) { active.group.visible = false; active = null; }
    page = new Page($('page'), ch.words, (t) => { audio.currentTime = t; if (mode === 'watch') play(audio); }, c.tints);
    page.setLayout(shownLayout());
    timeline.set(ch.cue.end + 0.9, c.marks);
    const next = CHAPTERS[c.n];
    $('endQuote').textContent = `“${ch.lastSentence.replace(/^[“"]|[”"]$/g, '')}”`;
    $('endTail').hidden = !c.tailpiece; if (c.tailpiece) $('endTail').src = c.tailpiece; // under the chapter's last line
    $('endTitle').textContent = `${c.label} complete`;
    $('endSub').textContent = 'Frankenstein';
    const last = ch.scenes[ch.scenes.length - 1];
    $('endExplore').hidden = !last.bounds;
    $('endExplore').textContent = `Explore ${last.def.title.replace(/^The /, 'the ')}`;
    $('endNext').disabled = !next?.narrated;
    $('endNext').textContent = next ? `Continue to ${next.label}` : 'The end';
    $('endNext').title = next && !next.narrated ? `${next.label} is not ready yet` : '';
    endDismissed = false;
    audio.src = c.audio;
    audio.defaultPlaybackRate = audio.playbackRate = speed;
    await new Promise((ok) => audio.addEventListener('loadedmetadata', ok, { once: true }));
    switching = false;
  }

  function setMode(m) {
    if (m === 'explore' && !active?.bounds) return; // e.g. mid-fall: nowhere to stand
    mode = m;
    document.body.dataset.mode = m;
    $('modeBtn').textContent = m === 'watch' ? 'Explore' : 'Back to the story';
    $('playBtn').textContent = m === 'explore' && document.body.dataset.form !== 'wide' ? 'Back to the story' : audio.paused ? 'Play' : 'Pause';
    if (m === 'explore') { audio.pause(); explorer.bounds = active.bounds; explorer.enter(); }
    else { explorer.exit(); closeCard(); if (atEnd()) endDismissed = false; else play(audio); }
    resize();
  }

  function openCard(h) {
    shown = h;
    $('cardTitle').textContent = h.title;
    $('cardText').textContent = h.text;
    $('card').hidden = false;
  }
  function closeCard() { shown = null; $('card').hidden = true; }

  function freeTextures() {
    const seen = new Set();
    scene.traverse((o) => {
      for (const m of [o.material].flat()) {
        if (!m) continue;
        for (const v of Object.values(m)) if (v?.isTexture && !seen.has(v)) { seen.add(v); v.dispose(); }
      }
    });
  }
  // If the graphics card resets (a phone under memory pressure), keep the page and redraw.
  renderer.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());

  // Start reading chapter c at time t.
  async function begin(c, t) {
    $('intro').hidden = true;
    closeMenu(false);
    if (mode !== 'watch') setMode('watch');
    await openChapter(c);
    audio.currentTime = t;
    play(audio);
    started = true;
    wake(); // show the controls at first, even on a phone
  }
  let started = false; // a chapter is open and positioned (for automated checks)
  // Moving through the chapter: scrubber, skip keys, reading speed and the contents.
  // `resume` plays after the seek; otherwise the narration keeps its playing/paused state.
  function seek(t, resume = !audio.paused) {
    audio.currentTime = Math.max(0, Math.min(t, ch.cue.end + 0.9));
    if (mode === 'watch' && resume && t < ch.cue.end) play(audio);
  }
  const timeline = new Timeline($('timeline'), (() => {
    let was = false, dragging = false; // hold the narration while dragging
    return (t, done) => {
      if (!ch) return;
      if (!dragging) { was = !audio.paused; dragging = true; audio.pause(); }
      endDismissed = false;
      seek(t, false);
      if (done) { dragging = false; if (was) seek(t, true); }
    };
  })());

  let speed = 1;
  function setSpeed(r) {
    speed = r;
    audio.defaultPlaybackRate = audio.playbackRate = r;
    audio.preservesPitch = true; // faster, not higher
    $('speedBtn').textContent = `${r}×`;
    try { localStorage.setItem(SPEED_KEY, String(r)); } catch {}
  }
  let savedSpeed = 1;
  try { savedSpeed = Number(localStorage.getItem(SPEED_KEY)) || 1; } catch {}
  setSpeed(SPEEDS.includes(savedSpeed) ? savedSpeed : 1);
  $('speedBtn').addEventListener('click', () => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]));

  // The contents, as an old theatre playbill (owner, 2026-10-17): each Letter or Chapter is an act
  // with a small engraving from its first set, its scenes listed beneath with their times, and a
  // tick on each scene already reached (place.seen). From the controls (pausing the reading) and on
  // the start screen. The pictures load when their act scrolls into view.
  const ROMAN = (n) => [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((r, [v, l]) => { while (n >= v) { r += l; n -= v; } return r; }, '');
  const actName = (label) => label.replace(/\d+/g, (d) => ROMAN(Number(d)));
  const picFor = (c) => {
    for (const d of c.scenes ?? []) for (const piece of ['far', 'wall_back', 'view']) {
      const n = `sets/${d.art ?? d.arts?.[0]}/${piece}`;
      if (ai[n]) return URLS[n] ?? `art/ai/${n}.webp`;
    }
    return null;
  };
  const lazyPics = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.style.backgroundImage = `url("${e.target.dataset.pic}")`;
    lazyPics.unobserve(e.target);
  }), { root: $('sceneMenu') });
  const sceneButtons = [];
  for (const c of CHAPTERS) {
    const act = document.createElement('section');
    act.className = 'act';
    const pic = document.createElement('div');
    pic.className = 'pic';
    const url = picFor(c);
    if (url) { pic.dataset.pic = url; lazyPics.observe(pic); }
    const body = document.createElement('div');
    const h = document.createElement('h3');
    const hb = document.createElement('button');
    hb.innerHTML = '<span class="name"></span>';
    hb.children[0].textContent = actName(c.label);
    hb.disabled = !c.narrated;
    hb.addEventListener('click', () => begin(c, 0));
    h.append(hb);
    if (!c.narrated) h.insertAdjacentHTML('beforeend', ' <span class="later">(in rehearsal)</span>');
    body.append(h);
    if (c.narrated && c.marks && c.marks.length >= 2) {
      const ol = document.createElement('ol');
      c.marks.forEach((m) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.innerHTML = '<span class="tick"></span><span></span><span class="dots"></span><span></span>';
        b.children[1].textContent = m.title;
        b.children[3].textContent = clock(m.t);
        b.addEventListener('click', () => begin(c, m.t));
        sceneButtons.push({ b, c, m });
        li.append(b);
        ol.append(li);
      });
      body.append(ol);
    }
    act.append(pic, body);
    $('contents').append(act);
  }
  let menuResume = false;
  function openMenu() {
    menuResume = !audio.paused;
    audio.pause();
    const t = audio.currentTime;
    const here = chapter?.marks.reduce((cur, m) => (t >= m.t ? m : cur), chapter.marks[0]);
    const seen = place.load()?.seen ?? {};
    sceneButtons.forEach(({ b, c, m }) => { b.classList.toggle('here', m === here); b.classList.toggle('seen', (seen[c.n] ?? -1) >= m.t + 1); });
    $('sceneMenu').hidden = false;
    if (here) sceneButtons.find((x) => x.m === here)?.b.scrollIntoView({ block: 'center' });
  }
  function closeMenu(resume = menuResume) {
    $('sceneMenu').hidden = true;
    if (resume && ch && mode === 'watch' && $('intro').hidden && !atEnd()) play(audio);
  }
  $('scenesBtn').addEventListener('click', () => ($('sceneMenu').hidden ? openMenu() : closeMenu()));
  $('contentsIntro').addEventListener('click', openMenu);
  $('sceneClose').addEventListener('click', () => closeMenu());

  // Start screen: continue where the reader left off, or begin at Chapter I.
  const saved = place.load();
  const savedCh = CHAPTERS.find((c) => c.n === saved?.chapter && c.narrated);
  const savedT = savedCh ? saved.times?.[savedCh.n] ?? 0 : 0;
  if (savedCh && (savedT > 5 || savedCh.n > 1) && savedT < savedCh.cue.end - 2) {
    const sceneTitle = savedCh.marks.reduce((cur, m) => (savedT >= m.t ? m : cur), savedCh.marks[0]).title;
    $('continue').hidden = false;
    $('continue').textContent = `Continue (${savedCh.label}: ${sceneTitle}, ${clock(savedT)})`;
    $('continue').addEventListener('click', () => begin(savedCh, savedT));
  }
  $('begin').addEventListener('click', () => begin(CHAPTERS[0], 0));
  // The reading (book.js READINGS): switching saves the place and reloads in the other recording,
  // which keeps its own place.
  $('readingNote').textContent = READINGS[READING].note;
  const others = readings().filter((r) => r !== READING);
  for (const id of ['readingIntro', 'readingBtn']) {
    $(id).hidden = !others.length;
    // The in-game button stays one line, so the row of buttons stays below the text box.
    $(id).textContent = `Reading: ${id === 'readingBtn' ? READINGS[READING].short : READINGS[READING].name}`;
    $(id).addEventListener('click', () => { savePlace(); setReading(others[0]); });
  }
  // A reload within 15 minutes of reading (the page updated, or the browser reloaded it) goes straight
  // back to the place, paused, instead of the start screen (owner, 2026-10-14). Browsers allow sound
  // only after a tap, so the reader presses Play.
  if (savedCh && saved.at && Date.now() - saved.at < 15 * 60e3 && savedT < savedCh.cue.end - 2) {
    $('intro').hidden = true;
    openChapter(savedCh).then(() => { audio.currentTime = savedT; started = true; wake(); });
  }
  $('modeBtn').addEventListener('click', () => setMode(mode === 'watch' ? 'explore' : 'watch'));
  // In Explore the play button reads "Back to the story" (on phones the Explore button is in the More panel).
  const phoneForm = () => document.body.dataset.form !== 'wide';
  $('playBtn').addEventListener('click', () => (mode === 'explore' && phoneForm() ? setMode('watch') : audio.paused ? play(audio) : audio.pause()));
  $('restartBtn').addEventListener('click', () => { endDismissed = false; audio.currentTime = 0; if (mode === 'watch') play(audio); });
  $('cardClose').addEventListener('click', closeCard);
  $('endExplore').addEventListener('click', () => { endDismissed = true; setMode('explore'); });
  $('endReplay').addEventListener('click', () => { endDismissed = false; audio.currentTime = 0; play(audio); });
  $('endNext').addEventListener('click', () => { const next = CHAPTERS[chapter.n]; if (next?.narrated) begin(next, 0); });
  $('layoutBtn').addEventListener('click', () => setLayout(LAYOUTS[(LAYOUTS.indexOf(layout) + 1) % LAYOUTS.length]));
  audio.addEventListener('play', () => { if (mode === 'watch') $('playBtn').textContent = 'Pause'; });
  const savePlace = () => { if (chapter && !switching) place.save(chapter.n, audio.currentTime); };
  audio.addEventListener('pause', () => { if (mode === 'watch') $('playBtn').textContent = 'Play'; savePlace(); });
  addEventListener('pagehide', savePlace);
  setInterval(() => { if (!audio.paused) savePlace(); }, 3000);
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !$('sceneMenu').hidden) { closeMenu(); return; }
    if (!$('intro').hidden || !ch) return;
    if (e.code === 'Tab') { e.preventDefault(); setMode(mode === 'watch' ? 'explore' : 'watch'); }
    if (e.code === 'KeyE' && mode === 'explore') { const h = explorer.facing(active.hotspots); h ? openCard(h) : closeCard(); }
    if (e.code === 'Escape') closeCard();
    if (e.code === 'KeyM') $('scenesBtn').click();
    if (e.code === 'KeyS' && mode === 'watch') $('speedBtn').click();
    if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && mode === 'watch' && $('sceneMenu').hidden) {
      e.preventDefault();
      const to = skip(e.shiftKey ? ch.sceneStarts : ch.sentences, audio.currentTime, e.code === 'ArrowLeft' ? -1 : 1, e.shiftKey ? 3 : 1.5);
      if (to !== null) { endDismissed = false; seek(to); }
    }
    if (e.code === 'KeyL') $('layoutBtn').click();
    if (e.code === 'Space' && mode === 'watch' && $('endCard').hidden) { e.preventDefault(); $('playBtn').click(); }
  });

  // --- Touch and small screens --------------------------------------------------------------
  // "More": on phones the secondary buttons fold into a panel.
  $('moreBtn').addEventListener('click', () => {
    const open = document.body.classList.toggle('more-open');
    $('moreBtn').setAttribute('aria-expanded', String(open));
  });
  $('more').addEventListener('click', (e) => { if (e.target.closest('button') && e.target.id !== 'speedBtn') document.body.classList.remove('more-open'); });
  // The walking stick (Explore, touch): the knob's offset from the centre steers.
  {
    const stick = $('stick'), knob = stick.querySelector('.knob'), R = 44;
    let id = null;
    const move = (e) => {
      const r = stick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const dead = (v) => (Math.abs(v) < 0.15 ? 0 : v);
      explorer.stick = { x: dead(dx / R), y: dead(-dy / R) };
    };
    const end = () => { id = null; knob.style.transform = ''; explorer.stick = { x: 0, y: 0 }; };
    stick.addEventListener('pointerdown', (e) => { e.stopPropagation(); id = e.pointerId; try { stick.setPointerCapture(id); } catch {} move(e); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
  }
  // Inspect a hotspot by tapping its label (the E key on a keyboard).
  $('prompt').addEventListener('click', () => { const h = mode === 'explore' && explorer.facing(active.hotspots); if (h) openCard(h); });
  // Landscape phones: the controls and timeline fade away while the story plays, and come back
  // on any touch (the first tap only brings them back).
  let lastTouch = performance.now();
  const chromeShown = () => !document.body.classList.contains('chrome-hidden');
  function wake() { lastTouch = performance.now(); document.body.classList.remove('chrome-hidden'); }
  setInterval(() => {
    const hide = document.body.dataset.form === 'landscape' && mode === 'watch' && ch && !audio.paused && $('sceneMenu').hidden
      && !document.body.classList.contains('more-open') && performance.now() - lastTouch > 4000;
    if (hide) document.body.classList.add('chrome-hidden');
  }, 500);
  addEventListener('keydown', wake);
  // In the story: a tap on the picture shows the controls (or, when they're showing on a touch
  // screen, plays or pauses); a swipe across the picture or the text moves a sentence on or back.
  let swipe = null, swiped = false;
  const startSwipe = (e) => { swipe = { x: e.clientX, y: e.clientY, t: performance.now(), shown: chromeShown() }; swiped = false; };
  function endSwipe(e, onPicture) {
    if (!swipe || !ch || mode !== 'watch') { swipe = null; return; }
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y, quick = performance.now() - swipe.t < 600, wasShown = swipe.shown;
    swipe = null;
    if (quick && Math.abs(dx) > 50 && Math.abs(dy) < 40) {
      swiped = true;
      const to = skip(ch.sentences, audio.currentTime, dx < 0 ? 1 : -1, 1.5);
      if (to !== null) { endDismissed = false; seek(to); }
      return;
    }
    if (onPicture && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      wake();
      if (document.body.classList.contains('more-open')) { document.body.classList.remove('more-open'); return; }
      if (coarse && wasShown && $('endCard').hidden) $('playBtn').click();
    }
  }
  renderer.domElement.addEventListener('pointerdown', (e) => { if (mode === 'watch') startSwipe(e); wake(); });
  renderer.domElement.addEventListener('pointerup', (e) => endSwipe(e, true));
  $('page').addEventListener('pointerdown', (e) => { startSwipe(e); wake(); });
  $('page').addEventListener('pointerup', (e) => endSwipe(e, false));
  $('page').addEventListener('click', (e) => { if (swiped) { e.stopPropagation(); swiped = false; } }, true); // a swipe isn't a tap on a word
  addEventListener('pointerdown', (e) => { if (!e.target.closest('#controls')) wake(); });

  // Shift the picture away from the text so shots stay framed whatever the layout.
  // The window's form: 'portrait' (a phone held upright: the picture in a band at the top, the
  // text below), 'landscape' (a short screen: picture first, a two-line strip, controls folded
  // away), or 'wide' (computers, tablets). See style.css.
  const HFOV = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(22.5)) * 16 / 9); // a 45° shot on a 16:9 screen
  function resize() {
    const W = innerWidth, H = innerHeight;
    const form = H > W && W < 900 ? 'portrait' : H < 520 ? 'landscape' : 'wide';
    if (document.body.dataset.form !== form) {
      document.body.dataset.form = form;
      document.body.dataset.text = shownLayout();
      page?.setLayout(shownLayout());
      $('layoutBtn').hidden = form === 'portrait';
      document.body.classList.remove('more-open');
    }
    // Portrait: the picture is a 4:3-ish band, never more than 58% of the screen.
    const w = W, h = form === 'portrait' ? Math.round(Math.min(W * 0.8, H * 0.58)) : H;
    document.body.style.setProperty('--pic-h', `${h}px`);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep at least the width of view the shots were framed for (45° on 16:9), so a narrow or
    // tall picture shows more above and below instead of cutting off the sides.
    const minV = 2 * Math.atan(Math.tan(HFOV / 2) / camera.aspect);
    camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(minV), 45, 72);
    const l = shownLayout();
    if (mode === 'watch' && form === 'landscape' && l === 'bottom') camera.setViewOffset(w, h, 0, 0.14 * h, w, h); // lift the picture above the strip
    else if (mode === 'watch' && form !== 'portrait' && l === 'top') camera.setViewOffset(w, h, 0, -0.2 * h, w, h);
    else if (mode === 'watch' && form === 'wide' && l === 'side' && w > 700) camera.setViewOffset(w, h, 0.17 * w, 0.1 * h, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  setLayout('bottom');

  // Scene changes. 'paper' (the default) turns like a page: a quick fade through paper.
  // 'dark' fades to black, changes scene while black, then fades up slowly, as if lamps were lit.
  const TURNS = {
    paper: { out: 0.6, in: 0.7, el: 'turn' },
    dark: { out: 0.8, in: 2.0, light: 3.5, el: 'dark' },
  };
  function turnsAt(t) {
    const o = { turn: 0, dark: 0 };
    for (const s of ch.scenes.slice(1)) {
      const k = TURNS[s.def.turn ?? 'paper'];
      const v = t < s.start ? smooth((t - (s.start - k.out)) / k.out) : 1 - smooth((t - s.start) / k.in);
      o[k.el] = Math.max(o[k.el], v);
    }
    return o;
  }
  // After a 'dark' turn the set's own colours come up from black.
  const lit = new THREE.Color();
  function lightUp(t) {
    const k = TURNS[active.def.turn ?? 'paper'];
    if (!k.light) return;
    const e = smooth((t - active.start) / k.light);
    lit.set('#000').lerp(new THREE.Color(active.bg), e);
    scene.background.copy(lit);
    scene.fog.color.copy(lit);
    scene.fog.near = active.fog[0] * e;
    scene.fog.far = 1.5 + (active.fog[1] - 1.5) * e;
  }

  function show(s) {
    if (active === s) return;
    if (active) active.group.visible = false;
    active = s;
    s.group.visible = true;
    scene.background = new THREE.Color(s.bg);
    scene.fog.color.set(s.bg);
    [scene.fog.near, scene.fog.far] = s.fog;
    $('modeBtn').disabled = !s.bounds;
    if (mode === 'explore' && !s.bounds) setMode('watch');
  }

  const look = new THREE.Vector3();
  let last = performance.now(), smoothT = 0;
  const perf = new PerfMeter(renderer);
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!ch) { renderer.clear(); return; }
    // A steady clock (owner, 2026-10-14: jerky motion): some browsers report the narration's time in
    // uneven steps; the picture follows a clock that runs smoothly with the frames and is gently
    // pulled to the narration (snapping to it after a seek or a pause).
    const at = audio.currentTime;
    if (audio.paused || Math.abs(at - smoothT) > 0.3) smoothT = at;
    else smoothT += dt * audio.playbackRate + (at - smoothT) * 0.08;
    const t = smoothT;
    show(sceneAt(t));

    if (mode === 'watch') {
      const c = active.camera(t);
      camera.position.set(...c.pos);
      camera.lookAt(look.set(...c.look));
    } else {
      explorer.update(dt);
      const h = explorer.facing(active.hotspots);
      $('prompt').hidden = !h || shown === h;
      if (h) $('prompt').textContent = `${coarse ? 'Tap' : 'E'}: ${h.title}`;
    }

    const actors = active.actors(t);
    for (const [name, puppet] of Object.entries(cast)) puppet.apply(actors[name] ?? { visible: false }, camera);
    active.update?.(t, cast, camera); // after the cast, so props can follow a puppet's hand
    // A jump in narration time (a seek, a new chapter) resets the eased camera turn at once.
    const seeked = Math.abs(t - nudge.last) > 0.5; nudge.last = t;
    if (mode === 'watch') keepHeroInFrame(dt, seeked);
    const al = heroOnScreen();
    layoutThoughts(freeView(), al && al.inside > 0 ? al.px : null);

    lightUp(t);
    page.update(t);
    timeline.update(t);
    const turns = turnsAt(t);
    $('turn').style.opacity = turns.turn;
    $('dark').style.opacity = turns.dark;
    if (t < ch.cue.end) endDismissed = false;
    audio.volume = 1 - smooth((t - ch.cue.end) / 0.8);
    const f = mode !== 'watch' || endDismissed ? 0 : atEnd() ? 1 : smooth((t - ch.cue.end + 0.1) / 0.8);
    $('fade').style.opacity = f;
    $('endCard').hidden = f < 0.99;
    renderer.render(scene, camera);
    perf.tick(now);
  });

  // Exposed for automated checks (tools/smoke.mjs). The first section's sets are built up front
  // so checks can read its scenes before Begin is pressed.
  build(CHAPTERS[0]);
  window.__slice = {
    audio, setMode, setLayout, camera, perf, chapters: CHAPTERS, begin, explorer, cast, ai, artFor, // ai and artFor: tools/full_check.mjs
    get chapter() { return chapter; },
    get scenes() { return (ch ?? CHAPTERS[0].built).scenes; },
    get cue() { return (ch ?? CHAPTERS[0].built).cue; },
    get ready() { return started && !switching; },
    scene: () => active?.def?.id, // for tools/jerk_report.mjs
  };
}

main().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre class="error">${e.message}</pre>`);
});
