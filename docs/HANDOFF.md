# Handoff: read this first
Updated 2026-10-15. Frankenstein as a paper toy theater, built on the Alice1 engine (three.js + Vite, Electron).
Plan: docs/PLAN.md. Web link (private artifact): https://claude.ai/artifact/MUCWDujUwUnkoWBPDuGFiv

## Where things stand
- Every section (Letters 1-4, Chapters 1-24) is narrated and staged. Letter 1 is hand-staged
  (`src/scenes/letter1.js`); the rest are data in `src/scenes/data/<id>.js` (format: docs/STAGING.md),
  checked with `node tools/check_scenes.mjs`. All art is placeholder drawn in code.
- Text: the 1818 edition (Gutenberg #41445, source/text/pg41445.txt), which Cori Samuel reads. Chapters
  are numbered straight through the three volumes: Vol. I = ch01-07, II = ch08-16, III = ch17-23.
  Track map (tools/narrate_all.py): 02-05 = Letters 1-4, 06-27 = Chapters 1-22, 28+29 = Chapter 23.
  The old 1831 staging of Chapters 1-2 is kept in source/staging_1831/ for reference.
- Two readings (owner, 2026-10-17; src/book.js READINGS): the LibriVox dramatic reading by a cast
  (default; 1831 text, Gutenberg #84, frankenstein_1210_librivox) and Cori Samuel (1818). Same
  sections and one staging: game ch01 = 1831 Chapters 1-2, game chNN = 1831 Chapter NN+1. 1831 files
  live in 1831/ sub-folders. Cues stay in 1818 words; tools/edition_map.py maps them onto the 1831
  text (public/data/1831/<id>_map.json). After narrating either reading, rerun edition_map.py, then
  `node tools/check_scenes.mjs`, which checks every section in both. The reader switches with the
  Reading button (start screen and More); each reading keeps its own place. Until the cast's audio
  is narrated (`python3 tools/narrate_all.py --edition 1831`, audio in
  /mnt/project-files/sources/audio_dramatic/), the game falls back to Cori Samuel and hides the button.
- Narration: `python3 tools/narration.py ID MP3 [--edition 1831]` (PocketSphinx + tools/align.py), 32 kbps mono;
  84-93% of words matched in every section.
- Master asset list: `node tools/assets_master.mjs` -> docs/ASSETS_MASTER.md + assets/manifest.json
  (930 images). Floors, grounds, furniture and mid pieces are shared (`sets/common/`).
- Owner decisions (2026-10-15): Gothic ink engraving style (von Holst); images generated automatically
  through the OpenAI API, owner approves each batch. Needs OPENAI_API_KEY and api.openai.com allowed
  in a cloud environment (not set up yet).
- Artifact publish: build to scratch dist and publish the page with its code, audio and data. A version may hold only 511 files, so the AI pictures live in the artifact's asset store instead (Artifact publish with `asset: true`, 25 files a call). `assets/artifact_urls.json` maps each picture name to its `/_blob/<id>` address; copy it to `dist/art/ai/urls.json` when publishing (main.js loads pictures through it; locally it is absent and pictures load from public/). New pictures: upload them, add their ids to that file (check each file size against the upload result), then publish urls.json, index.json, sizes.json and the code.
- Thought pictures: `python3 tools/vignette_ovals.py` measures each vignette's oval -> public/art/ai/ovals.json (the bubbles show exactly that oval, centred). Rerun it and publish ovals.json whenever vignettes are added or redrawn.
- Dates in Letters 1-4: the reader's "seventeen blank" is muted (tools/narration.py MUTE; `--audio-only` re-cuts).


## Next
1. Images: `python3 tools/gen_batch.py next` (8 at a time, characters first), show the owner
   source/ai/review/batch_NNN.png, then `approve` / `reject`, rerun tools/assets_master.mjs, commit.
   Blocked until the cloud environment has OPENAI_API_KEY and allows api.openai.com.
