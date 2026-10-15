# Handoff: read this first
Updated 2026-10-15. Frankenstein as a paper toy theater, built on the Alice1 engine (three.js + Vite, Electron).
Plan: docs/PLAN.md. Web link (private artifact): https://claude.ai/artifact/MUCWDujUwUnkoWBPDuGFiv

## Where things stand
- Engine copied from Alice1 without any Alice art, audio or text. Sections: Letters 1-4, Chapters 1-24 (`src/book.js`).
- Letter 1 is narrated and staged: theatre seat, 5 s hold, push through the toy stage into Walton's room in
  St. Petersburgh (`src/scenes/letter1.js`, `src/theatre.js`, `src/sets/lodging.js`). All art is drawn in code
  (`src/figures.js`, `src/vignettes.js`); AI drawings replace pieces by name via `public/art/ai/index.json`.
- Narration: Cori Samuel's LibriVox solo reading (1818 text, matches Gutenberg #84). Raw mp3s live in the
  project's shared folder (/mnt/project-files/sources/audio/, frankenstein_02 = Letter 1).
- Alignment: `python3 tools/narration.py l01 RAW.mp3` (PocketSphinx transcript steered by the section's own text,
  then tools/align.py; 91.4% of words matched for Letter 1). wav2vec2 (`tools/forced_align.py`) needs huggingface.co.

## Next
1. Letters 2-4: run tools/narration.py, add to NARRATED in src/book.js, stage.
2. Stage C/D of the plan: asset breakdown and the generation queue (characters first).
