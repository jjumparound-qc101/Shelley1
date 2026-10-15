// Phone and tablet screenshots: node tools/mobile_shots.mjs URL OUTDIR [chapter:time,...]
// Each moment is shot at a small phone, a large phone (both orientations) and a tablet.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:5173/', out = 'mobile-shots', list = '1:40,1:400,8:150,11:258,12:640'] = process.argv.slice(2);
const DEVICES = { 'phone-s': [360, 640], 'phone-l': [430, 932], 'tablet': [820, 1180] };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const errs = [];
for (const [dev, [w, h]] of Object.entries(DEVICES)) for (const orient of ['portrait', 'landscape']) {
  if (dev === 'tablet' && orient === 'landscape') continue;
  const vp = orient === 'portrait' ? { width: w, height: h } : { width: h, height: w };
  const p = await b.newPage({ viewport: vp, isMobile: true, hasTouch: true });
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(url); await p.waitForFunction(() => window.__slice, null, { timeout: 120000 });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${out}/${dev}-${orient}-intro.png`, timeout: 120000 });
  for (const item of list.split(',')) {
    const [n, t] = item.split(':').map(Number);
    await p.evaluate((n) => window.__slice.begin(window.__slice.chapters[n - 1], 0), n);
    await p.waitForFunction((n) => window.__slice.ready && window.__slice.chapter?.n === n, n, { timeout: 120000 });
    await p.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${out}/${dev}-${orient}-ch${n}-${t}.png`, timeout: 120000 });
  }
  await p.close();
}
console.log(JSON.stringify(errs)); await b.close();
if (errs.length) process.exit(1);
