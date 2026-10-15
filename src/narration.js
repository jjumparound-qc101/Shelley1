// The book page: shows the passage being read, with the spoken word marked.
// Clicking any word seeks the narration there.
// Layouts: 'bottom' and 'top' strips show one phrase at a time; 'side' is a
// book page showing the paragraph so far.

const SENTENCE_END = /[.!?][”’)]*$/;
const PHRASE_END = /[,;:—][”’)]*$/;

// Split a paragraph into chunks short enough for a three-line strip:
// break at sentence ends, and at phrase ends once a chunk is long enough.
function chunk(words, soft = 22, hard = 38) {
  const out = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    const n = cur.length;
    if (SENTENCE_END.test(w.t) || (n >= soft && PHRASE_END.test(w.t)) || n >= hard) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

const norm = (t) => t.replace(/[^\p{L}-]/gu, '').toLowerCase();

export class Page {
  // tints: [[word, n, colour]]: the n-th occurrence of a word is shown in that colour once
  // spoken (COLOR.md rule 6: colour words in poems and songs).
  constructor(el, words, onSeek, tints = []) {
    const seen = {};
    const tintOf = (w) => { const k = norm(w.t); seen[k] = (seen[k] ?? 0) + 1; return tints.find(([word, n]) => word === k && n === seen[k])?.[2]; };
    el.replaceChildren(); // one page element serves every chapter
    this.chunks = [];
    words.paragraphs.forEach((para, p) => {
      chunk(para).forEach((c, k) => this.chunks.push({ words: c, first: k === 0, p }));
    });
    this.chunks.forEach((c) => {
      const div = document.createElement('p');
      div.className = 'para' + (c.first ? ' first' : '');
      div.hidden = true;
      c.spans = c.words.map((w, i) => {
        const s = document.createElement('span');
        s.textContent = w.t;
        s.className = 'w';
        if (w.x) { s.classList.add('skip'); s.title = 'Not read aloud in this recording'; } // tools/forced_align.py
        const tint = tintOf(w);
        if (tint) { s.classList.add('tint'); s.style.setProperty('--tint', tint); }
        s.addEventListener('click', () => onSeek(w.s));
        div.append(s, i < c.words.length - 1 ? ' ' : '');
        return s;
      });
      c.div = div;
      el.append(div);
    });
    this.cur = { c: -1, w: -2 };
    this.layout = 'bottom';
  }

  setLayout(layout) {
    this.layout = layout;
    this.cur = { c: -1, w: -2 }; // force a redraw
  }

  update(t) {
    let c = 0;
    for (let k = 0; k < this.chunks.length; k++) if (this.chunks[k].words[0].s <= t + 0.05) c = k;
    const words = this.chunks[c].words;
    let w = -1;
    words.forEach((x, i) => { if (x.s <= t && !x.x) w = i; }); // the mark passes over words not read aloud
    if (c === this.cur.c && w === this.cur.w) return;
    if (c !== this.cur.c) {
      const p = this.chunks[c].p;
      this.chunks.forEach((x, k) => {
        x.div.hidden = this.layout === 'side' ? x.p !== p || k > c : k !== c;
        if (k < c) x.spans.forEach((s) => { s.classList.add('said'); s.classList.remove('now'); });
      });
      if (this.layout === 'side') this.chunks[c].div.scrollIntoView({ block: 'nearest' });
    }
    this.chunks[c].spans.forEach((s, i) => {
      s.classList.toggle('said', i < w);
      s.classList.toggle('now', i === w);
    });
    this.cur = { c, w };
  }
}
