// Jerk report: steps through a chapter in Watch mode and lists the moments when the camera
// jerks (its turning or travelling speed changes suddenly, or it swings very fast) and when
// Alice's position jumps. Scene cuts (a new scene starts) are listed separately, not as jerks.
// Usage: npm run dev; node tools/jerk_report.mjs [url] chapter [step seconds = 0.1] [from] [to]
import { chromium } from 'playwright-core';
const url = process.argv[2] ?? 'http://localhost:5173/';
const k = Number(process.argv[3] ?? 1), step = Number(process.argv[4] ?? 0.1);
const from = Number(process.argv[5] ?? 0), to = process.argv[6] ? Number(process.argv[6]) : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(url); await p.waitForTimeout(1500);
await p.evaluate((k) => window.__slice.begin(window.__slice.chapters[k - 1], 0), k);
await p.waitForFunction((k) => window.__slice?.ready && window.__slice.chapter?.n === k, k);
const rows = await p.evaluate(async ({ step, from, to }) => {
  const S = window.__slice, a = S.audio; a.pause();
  const end = to ?? S.chapter.cue.end, out = [];
  const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  for (let t = from; t < end; t += step) {
    a.currentTime = t; await wait();
    const c = S.camera, q = c.quaternion, al = S.cast.alice.root;
    out.push({ t: +t.toFixed(2), p: c.position.toArray(), q: [q.x, q.y, q.z, q.w], a: al.visible ? al.position.toArray() : null, s: S.scene?.() ?? null });
  }
  return out;
}, { step, from, to });
const ang = (q1, q2) => { const d = Math.abs(q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3]); return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; };
const dist = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]);
const issues = [];
for (let i = 2; i < rows.length; i++) {
  const [r0, r1, r2] = [rows[i - 2], rows[i - 1], rows[i]];
  if (r2.s !== r1.s) { issues.push(`${r2.t}s  cut to "${r2.s}"`); continue; }
  const w1 = ang(r0.q, r1.q) / step, w2 = ang(r1.q, r2.q) / step;           // degrees per second
  const v1 = dist(r0.p, r1.p) / step, v2 = dist(r1.p, r2.p) / step;          // metres per second
  if (Math.abs(w2 - w1) > 40 || w2 > 90) issues.push(`${r2.t}s  camera turn jerk: ${w1.toFixed(0)} -> ${w2.toFixed(0)} deg/s`);
  if (Math.abs(v2 - v1) > 1.5 && v2 > 0.3) issues.push(`${r2.t}s  camera move jerk: ${v1.toFixed(2)} -> ${v2.toFixed(2)} m/s`);
  if (r2.a && r1.a && dist(r1.a, r2.a) / step > 3) issues.push(`${r2.t}s  Alice jumps ${dist(r1.a, r2.a).toFixed(2)} m`);
}
console.log(`Chapter ${k}, ${rows.length} samples every ${step}s: ${issues.filter((s) => !s.includes('cut to')).length} jerks`);
for (const s of issues) console.log('  ' + s);
await b.close();
