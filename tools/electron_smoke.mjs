// Launch the packaged desktop app, play through key moments, and fail on errors.
// Usage (Linux, needs a display; in CI use xvfb-run):
//   npm run package:linux
//   node tools/electron_smoke.mjs release/Alice-linux-x64/Alice [outDir]
// On machines without a GPU (CI, containers) set SOFTWARE_GL=1.
import { _electron as electron } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const exe = process.argv[2] ?? 'release/Alice-linux-x64/Alice';
const out = process.argv[3] ?? 'smoke-shots/electron';
mkdirSync(out, { recursive: true });

const app = await electron.launch({ executablePath: exe, args: ['--no-sandbox', ...(process.env.SOFTWARE_GL ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])] });
const win = await app.firstWindow();
const errors = [];
win.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
win.on('pageerror', (e) => errors.push(String(e)));
await win.setViewportSize({ width: 1280, height: 720 });
await win.waitForSelector('#begin');
await win.click('#begin');
await win.waitForFunction(() => window.__slice?.ready);

// Let it play for real for a few seconds: checks audio clock and frame pacing.
await win.evaluate(() => { location.hash = 'fps'; });
await win.waitForTimeout(5000);
const live = await win.evaluate(() => ({ t: window.__slice.audio.currentTime, paused: window.__slice.audio.paused, perf: window.__slice.perf.stats }));

const T = await win.evaluate(() => window.__slice.scenes[0].T);
for (const [name, t] of [['wide', 1], ['watch', T.watch + 2.5], ['pop', T.pop + 0.2]]) {
  await win.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await win.waitForTimeout(400);
  await win.screenshot({ path: `${out}/${name}.png` });
}
console.log(JSON.stringify({ live, errors }, null, 1));
await app.close();
if (errors.length || live.t < 3) process.exit(1);
