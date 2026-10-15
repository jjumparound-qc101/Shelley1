import { chromium } from 'playwright-core';
const out = process.argv[3];
const ts = process.argv[4].split(',').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(process.argv[2]); await p.click('#begin'); await p.waitForFunction(() => window.__slice?.ready);
let i = 0;
for (const t of ts) {
  await p.evaluate((t) => { const a = window.__slice.audio; a.pause(); a.currentTime = t; }, t);
  await p.waitForTimeout(350); await p.screenshot({ path: `${out}/f${String(i++).padStart(2, '0')}.png` });
}
await b.close();
