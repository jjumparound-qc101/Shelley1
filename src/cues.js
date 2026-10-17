// Cue words: staging is keyed to words in the text, not to seconds, so re-cutting
// or re-aligning the narration moves the staging with it.
// The cues are written against the 1818 text. For the 1831 reading, `map`
// (public/data/1831/<id>_map.json, from tools/edition_map.py) holds the 1818 words (`ref`)
// and, for each, the matching word of the 1831 text (`to`), so the same cues play there too.

const norm = (t) => t.replace(/[^\p{L}-]/gu, '').toLowerCase();

export function makeCues(words, map = null) {
  const flat = words.paragraphs.flat();
  const end = flat[flat.length - 1].e;
  if (!map) {
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
    return { at, para, end };
  }
  // Mapped: find the word in the 1818 text, then take the time of its 1831 match.
  if (map.n !== undefined && map.n !== flat.length) throw new Error(`the word map is for ${map.n} words, the text has ${flat.length}: rerun tools/edition_map.py`);
  const ref = map.ref.flat();
  const refNorm = ref.map(norm);
  const time = (i, edge = 's') => flat[Math.min(map.to[i], flat.length - 1)][edge];
  // The first 1818 word whose 1831 match is spoken at or after `after` seconds.
  function from(after) {
    let i = 0;
    while (i < ref.length && time(i) < after) i++;
    return i;
  }
  function at(token, n = 1, after = 0, edge = 's') {
    const want = token.toLowerCase();
    let k = 0;
    for (let i = after > 0 ? from(after) : 0; i < ref.length; i++) {
      if (refNorm[i] !== want) continue;
      if (++k === n) return time(i, edge);
    }
    throw new Error(`cue word not found: "${token}" #${n} after ${after}s`);
  }
  function para(text) {
    let i = 0;
    for (const q of map.ref) {
      if (q.join(' ').startsWith(text)) return time(i);
      i += q.length;
    }
    throw new Error(`cue paragraph not found: "${text}"`);
  }
  return { at, para, end };
}
