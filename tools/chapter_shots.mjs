// Screenshots of one chapter: node tools/chapter_shots.mjs URL OUTDIR CHAPTER [t1,t2,...] (default: 30 even steps).
import { chromium } from 'playwright-core';
const [url, out, chArg, tsArg] = process.argv.slice(2);
const n = Number(chArg);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
await p.goto(url); await p.waitForTimeout(1500);
await p.evaluate((n) => window.__slice.begin(window.__slice.chapters[n - 1], 0), n);
await p.waitForFunction((n) => window.__slice?.ready && window.__slice.chapter?.n === n, n);
const ts = tsArg ? tsArg.split(',').map(Number) : await p.evaluate(() => { const c = window.__slice.chapter; const end = c.cue.end; return Array.from({ length: 30 }, (_, i) => +(i * end / 30 + 2).toFixed(1)); });
let i = 0;
for (const t of ts) {
  await p.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await p.waitForTimeout(450); await p.screenshot({ path: `${out}/s${String(i++).padStart(2, '0')}_${t}.png` });
}
console.log(JSON.stringify(errs)); await b.close();
