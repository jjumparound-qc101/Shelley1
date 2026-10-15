// The book: Letters 1-4 and Chapters 1-24 (Project Gutenberg #84, the 1818 text), each with
// its narration (Cori Samuel's LibriVox reading) and text timings, and its staged scenes.
// A section is readable once its narration is aligned (`narrated`: public/audio/<id>.mp3 and
// public/data/<id>_words.json, from tools/narration.py). Its scenes are written as data in
// src/scenes/data/<id>.js (docs/STAGING.md); Letter 1 is hand-staged. Until a section has
// scenes it plays on a placeholder title page.
import { placeholder } from './scenes/placeholder.js';
import { letter1 } from './scenes/letter1.js';
import { sceneFromData } from './stagebook.js';

const DATA = import.meta.glob('./scenes/data/*.js', { eager: true, import: 'default' });
const WORDS = import.meta.glob('../public/data/*_words.json');

const SECTIONS = [
  ...[1, 2, 3, 4].map((n) => ({ id: `l${String(n).padStart(2, '0')}`, label: `Letter ${n}` })),
  ...Array.from({ length: 24 }, (_, i) => ({ id: `ch${String(i + 1).padStart(2, '0')}`, label: `Chapter ${i + 1}` })),
];

export const CHAPTERS = SECTIONS.map((s, i) => {
  const ch = { n: i + 1, ...s, title: s.label, narrated: !!WORDS[`../public/data/${s.id}_words.json`], audio: `audio/${s.id}.mp3`, words: `data/${s.id}_words.json` };
  const data = DATA[`./scenes/data/${s.id}.js`];
  ch.scenes = s.id === 'l01' ? [letter1] : data ? data.map((d, k) => sceneFromData(d, k, s.id)) : [placeholder(ch)];
  ch.tints = [];
  ch.tailpiece = null;
  return ch;
});
