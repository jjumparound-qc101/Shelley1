// Frame report: for every chapter, the moments when Alice is on stage (her puppet is shown)
// but wholly or largely out of the picture in Watch mode, and when a thought card is open.
// Usage: npm run dev; node tools/frame_report.mjs [url] [chapters, e.g. 1,2] [step seconds]
import { chromium } from 'playwright-core';
const url = process.argv[2] ?? 'http://localhost:5173/';
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const step = Number(process.argv[4] ?? 0.5);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(url); await p.waitForTimeout(1500);
const n = await p.evaluate(() => window.__slice.chapters.filter((c) => c.narrated).length);
for (let k = 1; k <= n; k++) {
  if (only && !only.includes(k)) continue;
  await p.evaluate((k) => window.__slice.begin(window.__slice.chapters[k - 1], 0), k);
  await p.waitForFunction((k) => window.__slice?.ready && window.__slice.chapter?.n === k, k);
  const rows = await p.evaluate(async (step) => {
    const S = window.__slice, a = S.audio; a.pause();
    const end = S.chapter.cue.end, out = [];
    const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let t = 0; t < end; t += step) {
      a.currentTime = t; await wait();
      const al = S.cast.alice;
      if (!al.root.visible) continue;
      const flat = al.poses[al.pose]; if (!flat) continue;
      const [w, h] = flat.userData.size;
      // Her card's corners on screen: fraction of the card inside the picture (above the text strip).
      const THREE = flat.position.constructor;
      let inside = 0, tot = 0;
      for (let u = 0.1; u < 1; u += 0.2) for (let v = 0.05; v < 1; v += 0.15) {
        const q = flat.localToWorld(new THREE((u - 0.5) * w, v * h, 0)).project(S.camera);
        tot++; if (q.z < 1 && Math.abs(q.x) <= 1 && q.y <= 1 && q.y >= -0.4) inside++;
      }
      out.push({ t: +t.toFixed(1), frac: inside / tot });
    }
    return out;
  }, step);
  // Merge runs where less than half of her is in the picture.
  const bad = []; let run = null;
  for (const r of rows) {
    if (r.frac < 0.5) { if (!run) run = { from: r.t, to: r.t, min: r.frac }; run.to = r.t; run.min = Math.min(run.min, r.frac); }
    else if (run) { bad.push(run); run = null; }
  }
  if (run) bad.push(run);
  console.log(`Chapter ${k}: ${rows.length} samples with Alice on stage; out of the picture: ` +
    (bad.length ? bad.map((r) => `${r.from}-${r.to}s (min ${Math.round(r.min * 100)}%)`).join(', ') : 'never'));
}
await b.close();
