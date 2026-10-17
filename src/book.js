// The book: Letters 1-4 and Chapters 1-23 (Project Gutenberg #41445, the 1818 text,
// with the chapters numbered straight through its three volumes), each with
// its narration and text timings, and its staged scenes.
// Two readings (READINGS): the LibriVox dramatic reading by a cast, of the 1831 text
// (Gutenberg #84), and Cori Samuel's LibriVox reading of the 1818 text. Both play the same
// sections and the same staging: the 1831 Chapters 1 and 2 are one section (the 1818 Chapter 1),
// so 1818 Chapter N is 1831 Chapter N+1 after that. The staging's cue words are the 1818 text's;
// the 1831 reading finds them through a word map (public/data/1831/<id>_map.json, cues.js).
// A section is readable once its narration is aligned (`narrated`: public/audio/<id>.mp3 and
// public/data/<id>_words.json, from tools/narration.py). Its scenes are written as data in
// src/scenes/data/<id>.js (docs/STAGING.md); Letter 1 is hand-staged. Until a section has
// scenes it plays on a placeholder title page.
import { placeholder } from './scenes/placeholder.js';
import { letter1 } from './scenes/letter1.js';
import { sceneFromData } from './stagebook.js';

const DATA = import.meta.glob('./scenes/data/*.js', { eager: true, import: 'default' });
const WORDS = import.meta.glob(['../public/data/*_words.json', '../public/data/1831/*_words.json']);

export const READINGS = {
  cast: { name: 'The LibriVox cast', short: 'Cast', text: '1831', sub: '1831/', note: 'The 1831 text, read by a LibriVox cast, with a voice for each character.' },
  cori: { name: 'Cori Samuel', short: 'Cori Samuel', text: '1818', sub: '', note: 'The 1818 text, read by Cori Samuel for LibriVox.' },
};
const READING_KEY = 'frankenstein.reading.v1';
const hasWords = (r) => Object.keys(WORDS).some((f) => f.startsWith(`../public/data/${READINGS[r].sub}`) && !f.slice(`../public/data/${READINGS[r].sub}`.length).includes('/'));
// The reading: ?reading=cast|cori, else the reader's last choice, else the cast; a reading
// with no narration yet falls back to the other.
function chooseReading() {
  let r = new URLSearchParams(location.search).get('reading');
  if (!READINGS[r]) { try { r = localStorage.getItem(READING_KEY); } catch { r = null; } }
  if (!READINGS[r]) r = 'cast';
  return hasWords(r) ? r : Object.keys(READINGS).find(hasWords) ?? r;
}
export const READING = chooseReading();
export const readings = () => Object.keys(READINGS).filter(hasWords);
export function setReading(r) {
  try { localStorage.setItem(READING_KEY, r); } catch {}
  const u = new URL(location.href);
  u.searchParams.delete('reading');
  location.replace(u);
}
const { sub: SUB, text: TEXT } = READINGS[READING];
const label1831 = (id) => (id === 'ch01' ? 'Chapters 1-2' : id[0] === 'c' ? `Chapter ${Number(id.slice(2)) + 1}` : null);

const SECTIONS = [
  ...[1, 2, 3, 4].map((n) => ({ id: `l${String(n).padStart(2, '0')}`, label: `Letter ${n}` })),
  ...Array.from({ length: 23 }, (_, i) => ({ id: `ch${String(i + 1).padStart(2, '0')}`, label: `Chapter ${i + 1}` })),
];

export const CHAPTERS = SECTIONS.map((s, i) => {
  if (TEXT === '1831') s = { ...s, label: label1831(s.id) ?? s.label };
  const ch = { n: i + 1, ...s, title: s.label, narrated: !!WORDS[`../public/data/${SUB}${s.id}_words.json`], audio: `audio/${SUB}${s.id}.mp3`, words: `data/${SUB}${s.id}_words.json` };
  ch.map = TEXT === '1831' ? `data/1831/${s.id}_map.json` : null; // the 1818 cue words in the 1831 text
  const data = DATA[`./scenes/data/${s.id}.js`];
  ch.scenes = s.id === 'l01' ? [letter1] : data ? data.map((d, k) => sceneFromData(d, k, s.id)) : [placeholder(ch)];
  ch.tints = [];
  ch.tailpiece = null;
  return ch;
});
