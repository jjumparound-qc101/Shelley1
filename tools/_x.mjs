import { chromium } from 'playwright-core';
const [url, out, n] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(url); await p.addStyleTag({ content: 'img{max-width:100%;height:auto}' }); await p.waitForTimeout(1500);
await p.evaluate((n) => window.__slice.begin(window.__slice.chapters[n - 1], 0), +n);
await p.waitForFunction((n) => window.__slice?.ready && window.__slice.chapter?.n === n, +n, { timeout: 60000 });
const starts = await p.evaluate(() => window.__slice.chapter.starts);
console.log(starts);
for (let i = 0; i < starts.length; i++) {
  await p.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, starts[i] + 6);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: `${out}/n${n}_s${i}.png` });
}
await b.close();
