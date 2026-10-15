// Cue words: staging is keyed to words in the text, not to seconds, so re-cutting
// or re-aligning the narration moves the staging with it.

const norm = (t) => t.replace(/[^\p{L}-]/gu, '').toLowerCase();

export function makeCues(words) {
  const flat = words.paragraphs.flat();
  // Time of the n-th (1-based) occurrence of `token` starting at or after `after` seconds.
  function at(token, n = 1, after = 0, edge = 's') {
    const want = token.toLowerCase();
    let k = 0;
    for (const w of flat) {
      if (w.s < after || norm(w.t) !== want) continue;
      if (++k === n) return w[edge];
    }
    throw new Error(`cue word not found: "${token}" #${n} after ${after}s`);
  }
  // Start of the paragraph that begins with `text` (e.g. "The rabbit-hole went").
  function para(text) {
    const p = words.paragraphs.find((q) => q.map((w) => w.t).join(' ').startsWith(text));
    if (!p) throw new Error(`cue paragraph not found: "${text}"`);
    return p[0].s;
  }
  return { at, para, end: flat[flat.length - 1].e };
}
