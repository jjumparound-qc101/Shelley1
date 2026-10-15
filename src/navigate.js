// Ways through the chapter: the timeline scrubber, sentence and scene skips.

const SENTENCE_END = /[.!?][”’)]*$/;
const CAPITAL = /^[“‘(]*\p{Lu}/u; // "thump! thump! down she came" is one sentence

// Start times of every sentence (each paragraph also starts a new one).
export function sentenceStarts(words) {
  const out = [];
  for (const para of words.paragraphs) {
    para.forEach((w, i) => { if (i === 0 || (SENTENCE_END.test(para[i - 1].t) && CAPITAL.test(w.t))) out.push(w.s); });
  }
  return out;
}

// The start to skip to from t: back (dir -1) goes to the start of the current item,
// or to the one before if we are within `grace` seconds of its start; on (dir +1) goes to the next.
export function skip(starts, t, dir, grace = 1.5) {
  if (dir > 0) return starts.find((s) => s > t + 0.05) ?? null;
  const before = starts.filter((s) => s <= t + 0.05);
  if (!before.length) return 0;
  const cur = before[before.length - 1];
  return t - cur > grace || before.length === 1 ? cur : before[before.length - 2];
}

// The bar at the bottom: shows progress, marks each scene, seeks on click or drag.
// One bar serves every chapter: set() gives it a chapter's length and scene marks.
export class Timeline {
  constructor(el, onSeek) {
    this.el = el;
    this.duration = 1;
    this.marks = [];
    this.fill = el.querySelector('.fill');
    this.track = el.querySelector('.track');
    // One label that follows the pointer: the scene and time there.
    const tip = document.createElement('span');
    tip.className = 'tip';
    el.append(tip);
    const at = (e) => {
      const r = this.track.getBoundingClientRect();
      return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * this.duration;
    };
    el.addEventListener('pointermove', (e) => {
      const t = at(e), r = el.getBoundingClientRect();
      const scene = this.marks.reduce((cur, m) => (t >= m.t ? m : cur), this.marks[0]);
      tip.textContent = `${scene?.title ?? ''} · ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
      const half = tip.offsetWidth / 2;
      tip.style.left = `${Math.min(r.width - half, Math.max(half, e.clientX - r.left))}px`;
      if (el.classList.contains('drag')) onSeek(t, false);
    });
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      el.classList.add('drag');
      onSeek(at(e), false);
    });
    const end = (e) => { if (el.classList.contains('drag')) { el.classList.remove('drag'); onSeek(at(e), true); } };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  set(duration, marks) {
    this.duration = duration;
    this.marks = marks;
    this.track.querySelectorAll('.mark').forEach((m) => m.remove());
    for (const { t } of marks) {
      const m = document.createElement('div');
      m.className = 'mark';
      m.style.left = `${(t / duration) * 100}%`;
      this.track.append(m);
    }
  }

  update(t) {
    this.fill.style.width = `${Math.min(100, (t / this.duration) * 100)}%`;
  }
}
