// The book: Letters 1-4 and Chapters 1-24 (Project Gutenberg #84, the 1818 text), each with
// its narration (Cori Samuel's LibriVox reading) and text timings, and its staged scenes.
// A section is readable once its narration is aligned (`narrated`: public/audio/<id>.mp3 and
// public/data/<id>_words.json, from tools/narration.py). Until its scenes are built, a
// section plays on a placeholder title page.
import { placeholder } from './scenes/placeholder.js';
import { letter1 } from './scenes/letter1.js';

const SECTIONS = [
  ...[1, 2, 3, 4].map((n) => ({ id: `l${String(n).padStart(2, '0')}`, label: `Letter ${n}` })),
  ...Array.from({ length: 24 }, (_, i) => ({ id: `ch${String(i + 1).padStart(2, '0')}`, label: `Chapter ${i + 1}` })),
];
const NARRATED = new Set(['l01']);
const STAGED = { l01: [letter1] };

export const CHAPTERS = SECTIONS.map((s, i) => {
  const ch = { n: i + 1, ...s, title: s.label, narrated: NARRATED.has(s.id), audio: `audio/${s.id}.mp3`, words: `data/${s.id}_words.json` };
  ch.scenes = STAGED[s.id] ?? [placeholder(ch)];
  ch.tints = [];
  ch.tailpiece = null;
  return ch;
});
