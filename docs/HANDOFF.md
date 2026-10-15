# Handoff: read this first
Updated 2026-10-15. Frankenstein as a paper toy theater, built on the Alice1 engine (three.js + Vite, Electron).
Plan: docs/PLAN.md. Web link (private artifact): https://claude.ai/artifact/MUCWDujUwUnkoWBPDuGFiv

## Where things stand
- Every section (Letters 1-4, Chapters 1-24) is narrated and staged. Letter 1 is hand-staged
  (`src/scenes/letter1.js`); the rest are data in `src/scenes/data/<id>.js` (format: docs/STAGING.md),
  checked with `node tools/check_scenes.mjs`. All art is placeholder drawn in code.
- Text vs audio: the screen text is Gutenberg #84, which is the **1831** edition. Cori Samuel reads the
  **1818** edition. Track mapping (tools/narrate_all.py): 02-05 = Letters 1-4, 06 = Chapters 1+2,
  07-27 = Chapters 3-23, 28+29 = Chapter 24. Passages added in 1831 (e.g. Elizabeth's Como origin in
  Ch 1) are not read, so those words flash past. Fix: the 1818 text (Gutenberg #41445, blocked from
  this container) and restage Chapters 1-2.
- Narration: `python3 tools/narration.py ID MP3` (PocketSphinx + tools/align.py), 32 kbps mono.
  Matched 64-91% for Ch 3-24, about 30% for Ch 1-2. Chapter 1 timings were squeezed by hand to fit.
- Master asset list: `node tools/assets_master.mjs` -> docs/ASSETS_MASTER.md + assets/manifest.json
  (930 images). Floors, grounds, furniture and mid pieces are shared (`sets/common/`).
- Owner decisions (2026-10-15): Gothic ink engraving style (von Holst); images generated automatically
  through the OpenAI API, owner approves each batch. Needs OPENAI_API_KEY and api.openai.com allowed
  in a cloud environment (not set up yet).
- Artifact publish: build to scratch dist, 3 publishes (64 MB limit per publish).

## Next
1. Image generation script reading assets/manifest.json, characters first, batches for approval.
2. If the environment allows gutenberg.org: switch to the 1818 text and restage Chapters 1-2.
