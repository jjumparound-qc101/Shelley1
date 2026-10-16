// A run through every section of the game: for each one, opens it and reports
//   - pictures it needs that are missing (named by the staging but not made), or failed to load
//   - its narration: the audio's length against the last timed word (a gap or overrun means the
//     timings and the recording don't match), and the first word's time
//   - scenes in story order, each starting within the audio
//   - page errors and failed requests
// Usage: node tools/full_check.mjs [URL] > report.json   (default http://localhost:5173/)
import { chromium } from 'playwright-core';
const url = process.argv[2] ?? 'http://localhost:5173/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
let errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
// Leaving a section cancels its audio download (ERR_ABORTED): not a fault.
p.on('requestfailed', (r) => r.failure()?.errorText !== 'net::ERR_ABORTED' && errs.push(`failed: ${r.url()}`));
p.on('response', (r) => r.status() >= 400 && errs.push(`${r.status()}: ${r.url()}`));
await p.goto(url); await p.waitForTimeout(1500);
const count = await p.evaluate(() => window.__slice.chapters.length);
const out = [];
for (let i = 0; i < count; i++) {
  errs = [];
  await p.evaluate((i) => window.__slice.begin(window.__slice.chapters[i], 0), i);
  await p.waitForFunction((i) => window.__slice?.ready && window.__slice.chapter === window.__slice.chapters[i], i, { timeout: 60000 });
  // Wait for its pictures (each loads into a 1x1 placeholder texture until it arrives).
  const art = async () => p.evaluate(() => {
    const s = window.__slice, c = s.chapter, names = s.artFor(c);
    return { names: names.length, pending: names.filter((n) => (s.ai[n].tex.image?.width ?? 1) <= 1) };
  });
  let a = await art();
  for (let k = 0; k < 40 && a.pending.length; k++) { await p.waitForTimeout(500); a = await art(); }
  const r = await p.evaluate(() => {
    const s = window.__slice, c = s.chapter, cue = c.cue, aud = s.audio;
    const words = c.wordsData.paragraphs.flat();
    // Pictures the staging names that have no drawing at all (the game draws a placeholder).
    const want = new Set();
    for (const d of c.scenes) {
      for (const n of d.thoughtArt ?? []) want.add(`vignettes/${n}`);
      for (const n of d.propArt ?? []) want.add(`props/${n}`);
    }
    const missing = [...want].filter((n) => !s.ai[n] && !s.ai[`sets/common/${n.split('/')[1]}`]); // shared furniture counts
    return {
      id: c.id, title: c.title, scenes: c.scenes.length,
      audio: Math.round(aud.duration * 10) / 10, firstWord: words[0]?.t, lastWordEnd: Math.round(cue.end * 10) / 10,
      starts: c.starts.map((t) => Math.round(t)), missing,
    };
  });
  const problems = [];
  if (!(r.audio > 0)) problems.push('audio did not load');
  else {
    if (r.lastWordEnd > r.audio + 0.5) problems.push(`timed words run past the audio (${r.lastWordEnd}s > ${r.audio}s)`);
    if (r.audio - r.lastWordEnd > 30) problems.push(`audio runs ${Math.round(r.audio - r.lastWordEnd)}s past the last timed word`);
  }
  if (r.starts.some((t, j) => j && t < r.starts[j - 1])) problems.push('scenes out of order');
  if (r.starts.some((t) => !(t >= 0) || t > r.audio)) problems.push('a scene starts outside the audio');
  if (r.missing.length) problems.push(`${r.missing.length} pictures not made: ${r.missing.join(', ')}`);
  if (a.pending.length) problems.push(`${a.pending.length} pictures did not load: ${a.pending.slice(0, 8).join(', ')}`);
  if (errs.length) problems.push(...[...new Set(errs)].slice(0, 6).map((e) => `error: ${e}`));
  out.push({ ...r, pictures: a.names, problems });
  console.error(`${r.id}: ${problems.length ? problems.join('; ') : 'ok'}`);
}
console.log(JSON.stringify(out, null, 1));
await b.close();
