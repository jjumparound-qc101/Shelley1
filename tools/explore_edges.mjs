// Explore look-arc check: for every scene that can be explored, stand at the edges of its
// walkable area and look as far left, right, up and down as Explore allows; screenshot each.
// Usage: node tools/explore_edges.mjs URL OUTDIR [chapters, e.g. 1,8]
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/', out = 'explore-shots', only] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(url); await p.waitForFunction(() => window.__slice, null, { timeout: 120000 });
const chapters = only ? only.split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const deg = Math.PI / 180;
for (const n of chapters) {
  await p.evaluate((n) => window.__slice.begin(window.__slice.chapters[n - 1], 0), n);
  await p.waitForFunction((n) => window.__slice.ready && window.__slice.chapter?.n === n, n, { timeout: 120000 });
  const scenes = await p.evaluate(() => window.__slice.chapter.built.scenes.map((s, i) => ({ i, id: s.def.id, start: s.start, b: s.bounds })));
  for (const s of scenes.filter((s) => s.b)) {
    const { minX, maxX, minZ, maxZ } = s.b, mx = (minX + maxX) / 2;
    const views = [
      ['left-edge-look-left', minX, maxZ, 75, 0], ['right-edge-look-right', maxX, maxZ, -75, 0],
      ['back-look-left', mx, minZ, 75, 0], ['back-look-right', mx, minZ, -75, 0],
      ['front-look-up', mx, maxZ, 0, 25], ['front-look-down', mx, maxZ, 0, -25],
    ];
    await p.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, s.start + 3);
    await p.waitForTimeout(400);
    // Explore opens once that scene is the active one (a frame or two after the seek).
    for (let k = 0; k < 20 && await p.evaluate(() => document.body.dataset.mode) !== 'explore'; k++) { await p.screenshot({ timeout: 120000 }); await p.evaluate(() => window.__slice.setMode('explore')); await p.waitForTimeout(250); } // a screenshot makes the page draw a frame
    for (const [name, x, z, yaw, pitch] of views) {
      await p.evaluate(([x, z, yaw, pitch]) => { const e = window.__slice.explorer; window.__slice.camera.position.x = x; window.__slice.camera.position.z = z; e.yaw = yaw; e.pitch = pitch; }, [x, z, yaw * deg, pitch * deg]);
      await p.waitForTimeout(250);
      await p.screenshot({ path: `${out}/ch${String(n).padStart(2, '0')}-${s.id}-${name}.png`, timeout: 120000 });
    }
    await p.evaluate(() => window.__slice.setMode('watch'));
  }
}
console.log(JSON.stringify(errs)); await b.close();
