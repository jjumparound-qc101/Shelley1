// Smoke test: load the slice in headless Chromium, step through key story
// moments and Explore mode, save screenshots, and fail on any console error.
// Usage: npm run dev   (in another shell)
//        node tools/smoke.mjs [url] [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'smoke-shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(url);
await page.waitForFunction(() => window.__slice, null, { timeout: 120000 }); // the shared art and cast are ready
await page.screenshot({ path: `${out}/00-intro.png` });
// The first frames after load can keep the page busy for a while in software rendering.
await page.click('#begin', { timeout: 120000 });
await page.waitForFunction(() => window.__slice?.ready, null, { timeout: 120000 });

// Seek to moments across every scene, pause, let a few frames render.
const moments = await page.evaluate(() => {
  const [rb, sh, pa, ha] = window.__slice.scenes.map((s) => s.T);
  return [
    ['01-wide', 1], ['02-alice-and-sister', rb.alice + 7], ['03-rabbit-watch', rb.watch + 2.5], ['04-pop', rb.pop + 0.2],
    ['05-fall', sh.dipped + 6], ['06-jar', sh.jar + 1], ['07-landing', pa.jumped - 1], ['08-passage', pa.passage + 4],
    ['09-hall', ha.hall + 1], ['10-table-key', ha.key + 1], ['11-curtain-door', ha.fits + 2], ['12-garden', ha.knelt + 4],
    ['13-drink-me', ha.bottle + 2], ['14-poker', ha.poker], ['15-shrunk', ha.telescope + 6], ['16-key-through-glass', ha.forgotten + 9],
    ['17-crying', ha.sat + 2], ['18-eat-me', ha.box + 4], ['19-end', window.__slice.cue.end + 2],
    // Notes 1.0: the hop into the hole, the Rabbit far down the passage, the dark turn into
    // the hall, the key in her hand, and the thought vignettes.
    ['30-rabbit-hop', rb.pop + 0.1], ['31-alice-hop', rb.downWent + 1.1], ['32-passage-rabbit-far', pa.thump + 3],
    ['33-dark-turn', ha.hall - 1.2], ['34-lamps-lighting', ha.hall], ['35-key-in-hand', ha.tryKey + 1],
    ['36-dinah', sh.dinah + 2], ['37-cats-bats', sh.cats + 4], ['38-knife', ha.finger + 1], ['39-poison', ha.poison + 1],
    ['40-candle', ha.candle + 1], ['41-rabbit-idle', rb.hurried + 6], ['42-hall-walk', ha.doors + 2], ['43-run', rb.ranAcross + 2], ['44-hall-walk-b', ha.doors + 2.5], ['45-alice-takeoff', rb.downWent + 0.95],
  ];
});
for (const [name, t] of moments) {
  await page.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
}

// Explore mode: enter, walk forward, turn as far right as allowed, inspect the book.
await page.evaluate(() => { window.__slice.audio.currentTime = window.__slice.scenes[0].T.alice + 7; });
await page.waitForTimeout(300);
await page.keyboard.press('Tab');
await page.keyboard.down('KeyW'); await page.waitForTimeout(600); await page.keyboard.up('KeyW');
await page.screenshot({ path: `${out}/20-explore.png` });
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(2500); await page.keyboard.up('ArrowRight');
await page.keyboard.down('KeyD'); await page.waitForTimeout(4000); await page.keyboard.up('KeyD');
await page.screenshot({ path: `${out}/21-explore-arc-limit.png` });
const cam = await page.evaluate(() => {
  const c = window.__slice.camera;
  return { x: c.position.x, z: c.position.z, yawDeg: (c.rotation.y * 180) / Math.PI };
});

// Chapter II: open it from the contents' code path and check a few moments.
await page.keyboard.press('Tab');
await page.evaluate(() => window.__slice.begin(window.__slice.chapters[1], 0));
await page.waitForFunction(() => window.__slice.ready && window.__slice.chapter?.n === 2);
const ch2 = await page.evaluate(() => {
  const T = window.__slice.scenes[0].T;
  return [['50-ch2-growing', T.telescope + 1], ['51-ch2-crying', T.cry + 6], ['52-ch2-rabbit', T.please + 0.5],
    ['53-ch2-fan', T.fanning + 3], ['54-ch2-shrunk', T.droppedFan + 2], ['55-ch2-swim', T.swam + 3], ['56-ch2-mouse', T.nearer + 8]];
});
for (const [name, t] of ch2) {
  await page.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
}

// Chapter III.
await page.evaluate(() => window.__slice.begin(window.__slice.chapters[2], 0));
await page.waitForFunction(() => window.__slice.ready && window.__slice.chapter?.n === 3);
const ch3 = await page.evaluate(() => {
  const T = window.__slice.scenes[0].T;
  return [['60-ch3-bank', 5], ['61-ch3-ring', T.ahem + 3], ['62-ch3-race', T.running + 4], ['63-ch3-thimble', T.presented],
    ['64-ch3-tale', T.tale + 6], ['65-ch3-alone', T.cry + 3]];
});
for (const [name, t] of ch3) {
  await page.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
}

// Chapter IV.
await page.evaluate(() => window.__slice.begin(window.__slice.chapters[3], 0));
await page.waitForFunction(() => window.__slice.ready && window.__slice.chapter?.n === 4);
const ch4 = await page.evaluate(() => {
  const [, H, W] = window.__slice.chapter.built.scenes.map((s) => s.T);
  return [['70-ch4-lane', 45], ['71-ch4-plate', H.house + 3], ['72-ch4-giant', H.effect + 4], ['73-ch4-frame', H.shriek + 1],
    ['74-ch4-bill', H.kick + 1], ['75-ch4-puppy', W.puppy + 3], ['76-ch4-caterpillar', W.caterpillar + 2]];
});
for (const [name, t] of ch4) {
  await page.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
}

// Chapter V.
await page.evaluate(() => window.__slice.begin(window.__slice.chapters[4], 0));
await page.waitForFunction(() => window.__slice.ready && window.__slice.chapter?.n === 5);
const ch5 = await page.evaluate(() => {
  const [M, N] = window.__slice.chapter.built.scenes.map((s) => s.T);
  return [['80-ch5-caterpillar', 20], ['81-ch5-father-william', M.v2 + 3], ['82-ch5-squashed', M.blow + 2], ['83-ch5-neck', N.free + 4],
    ['84-ch5-pigeon', N.hiss + 2], ['85-ch5-house', window.__slice.chapter.cue.end - 3]];
});
for (const [name, t] of ch5) {
  await page.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
}

// Chapter VI.
await page.evaluate(() => window.__slice.begin(window.__slice.chapters[5], 0));
await page.waitForFunction(() => window.__slice.ready && window.__slice.chapter?.n === 6);
const ch6 = await page.evaluate(() => {
  const [D, K, W] = window.__slice.chapter.built.scenes.map((s) => s.T);
  return [['90-ch6-footmen', D.bowed + 1], ['91-ch6-kitchen', K.irons + 3], ['92-ch6-lullaby', K.verse2 + 3], ['93-ch6-pig', W.pig + 2],
    ['94-ch6-cat', W.paw1 + 1], ['95-ch6-grin', W.slowly + 4.5]];
});
for (const [name, t] of ch6) {
  await page.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
}

// Chapter VII.
await page.evaluate(() => window.__slice.begin(window.__slice.chapters[6], 0));
await page.waitForFunction(() => window.__slice.ready && window.__slice.chapter?.n === 7);
const ch7 = await page.evaluate(() => {
  const [P, H] = window.__slice.chapter.built.scenes.map((s) => s.T);
  return [['A0-ch7-table', P.room + 1], ['A1-ch7-watch', P.dipped + 1], ['A2-ch7-move', P.move + 3], ['A3-ch7-teapot', P.teapot],
    ['A4-ch7-hall', H.unlock + 1], ['A5-ch7-garden', window.__slice.chapter.cue.end - 1]];
});
for (const [name, t] of ch7) {
  await page.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
}

// Chapters VIII onward: open chapter n, pick moments from its scenes' cue times, screenshot each.
async function chapterShots(n, pick) {
  await page.evaluate((n) => window.__slice.begin(window.__slice.chapters[n - 1], 0), n);
  await page.waitForFunction((n) => window.__slice.ready && window.__slice.chapter?.n === n, n);
  const list = await page.evaluate(pick);
  for (const [name, t] of list) {
    await page.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 }); // a chapter's first frame uploads all its textures
  }
}
await chapterShots(8, () => {
  const [R, C] = window.__slice.chapter.built.scenes.map((s) => s.T);
  return [['B0-ch8-painting', R.tulip], ['B1-ch8-procession', R.soldiers + 12], ['B2-ch8-crimson', R.crimson + 2], ['B3-ch8-pot', R.pot + 1],
    ['B4-ch8-flamingo', C.twist + 1], ['B5-ch8-cat', C.whole + 3], ['B6-ch8-tree', C.tree + 1], ['B7-ch8-fading', C.fading + 2]];
});
await chapterShots(9, () => {
  const [D, G, M] = window.__slice.chapter.built.scenes.map((s) => s.T);
  return [['C0-ch9-duchess', D.chin1 + 1], ['C1-ch9-queen', D.queen + 2], ['C2-ch9-custody', D.quarrel + 10], ['C3-ch9-gryphon', G.lazy + 1],
    ['C4-ch9-turtle', M.tears + 1], ['C5-ch9-school', M.school + 2], ['C6-ch9-paws', M.paws + 1], ['C7-ch9-faces', M.faces + 1]];
});
await chapterShots(10, () => {
  const [Q] = window.__slice.chapter.built.scenes.map((s) => s.T);
  return [['D0-ch10-thump', Q.shaking + 1], ['D1-ch10-caper', Q.bound + 0.4], ['D2-ch10-dance', Q.solemnly + 20], ['D3-ch10-lobster', Q.lobster + 2],
    ['D4-ch10-soup', Q.soup + 5], ['D5-ch10-run', Q.hand + 3]];
});
await chapterShots(11, () => {
  const [C] = window.__slice.chapter.built.scenes.map((s) => s.T);
  return [['E0-ch11-judge', C.judge + 1], ['E1-ch11-jury', C.juryBox + 2], ['E2-ch11-herald', C.unrolled + 2], ['E3-ch11-hatter-pale', C.pale + 1],
    ['E4-ch11-grow', C.larger + 15], ['E5-ch11-bag', C.bag + 3], ['E6-ch11-cook', C.cook + 6], ['E7-ch11-alice', C.alice + 0.5]];
});
await chapterShots(12, () => {
  const [E, W] = window.__slice.chapter.built.scenes.map((s) => s.T);
  return [['F0-ch12-tipped', E.tipped + 1.5], ['F1-ch12-bill', E.downwards + 1], ['F2-ch12-pale', E.pale + 1], ['F3-ch12-purple', E.purple + 1],
    ['F4-ch12-pack', E.scream], ['F5-ch12-lap', W.lap + 1], ['F6-ch12-dream', W.turtle + 2], ['F7-ch12-end', window.__slice.chapter.cue.end - 1]];
});

// Phones: a portrait and a landscape page, a moment from the first and last chapters each
// (tools/mobile_shots.mjs covers more devices and moments).
for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  const m = await browser.newPage({ viewport: vp, isMobile: true, hasTouch: true });
  m.on('console', (x) => x.type() === 'error' && errors.push(x.text()));
  m.on('pageerror', (e) => errors.push(String(e)));
  await m.goto(url);
  await m.waitForFunction(() => window.__slice, null, { timeout: 120000 });
  for (const [n, t] of [[1, 40], [12, 640]]) {
    await m.evaluate((n) => window.__slice.begin(window.__slice.chapters[n - 1], 0), n);
    await m.waitForFunction((n) => window.__slice.ready && window.__slice.chapter?.n === n, n, { timeout: 120000 });
    await m.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
    await m.waitForTimeout(600);
    await m.screenshot({ path: `${out}/M-${name}-ch${n}.png`, timeout: 120000 });
  }
  await m.close();
}

console.log(JSON.stringify({ cam, errors }, null, 1));
await browser.close();
if (errors.length) process.exit(1);
