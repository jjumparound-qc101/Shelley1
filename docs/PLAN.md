# Frankenstein Paper Theater: Project Plan

Written 2026-10-15. Repo: jjumparound-qc101/Shelley1 (empty today).
Framework source: jjumparound-qc101/Alice1 (read for this plan; nothing copied yet).

## 1. Goal

Mary Shelley's *Frankenstein* as an interactive novel in the same style as the
Alice game: the book's text on screen, a public-domain audiobook reading it, and a
2.5D paper toy theater whose figures and camera move in time with the words.
Same engine and tools as Alice. No Alice art, audio or text is reused.

## 2. What we reuse from Alice1 (the framework)

What Alice1 actually is (checked in the repo):
- Engine: three.js + Vite, wrapped in Electron for Windows/Linux/Steam.
  GitHub Actions builds the Windows app on every push (`.github/workflows/desktop.yml`).
- Book engine (`src/main.js`, `chapters.js`, `narration.js`, `navigate.js`): loads a
  chapter, plays the narration, highlights the current word, picks the active scene
  by narration time, saves the reader's place, contents menu, text layouts, phones.
- Staging (`puppet.js`, `track.js`, `cues.js`, `thoughts.js`, `explore.js`):
  paper-cutout puppets with named poses, camera tracks, cues keyed to WORDS
  (`at('word', n)`), thought vignettes, Explore mode (walk and look).
- Text and audio pipeline (`tools/`): `narration.py` (cut chapter text from the
  Gutenberg file, trim the LibriVox mp3), `transcribe.py` (faster-whisper),
  `align.py`, `forced_align.py` (wav2vec2 re-timing; marks words the reader skips).
  Output per chapter: `public/audio/chNN.mp3` + `public/data/chNN_words.json`.
  This is what makes the reading follow the movement: every cue is a word, and
  every word has a time.
- Art pipeline (`tools/`): `gen_image.py` (OpenAI image API, style block in front,
  reference images attached), `whitecut.py` (cut a drawing out of its white
  background, tint to paper), `assets_master.py` (one checklist of every prompt,
  ticked when the file lands in `source/ai/`), plus `PROVENANCE.md` logging.
- Checks: `smoke.mjs`, `chapter_shots.mjs`, `frame_report.mjs`, `jerk_report.mjs`,
  `shot_check.mjs`, `mobile_shots.mjs`, `explore_edges.mjs`.

What we leave behind: everything Alice-specific. `src/scenes/*`, `src/sets/*`,
`src/props*.js`, `cards.js`, `crowd.js` card logic, all of `public/art`,
`public/audio`, `public/data`, `source/`, the per-chapter `*_art.py` tools, the
Godot folder, and Alice names hard-coded in the engine (e.g. `keepAliceInFrame`,
the 12-chapter `ROMAN` list, `pg11_full.txt`).

## 3. Sources

| What | Source | Note |
|---|---|---|
| Text | Project Gutenberg ebook 84 | Letters 1-4, Chapters 1-24. About 75,000 words, ~2.8x Alice. |
| Audio | A LibriVox recording of Frankenstein (via archive.org) | Pick one whose edition matches the Gutenberg text. See decision D2. |
| Style reference | Theodor von Holst's 1831 frontispiece and title-page engravings | Public domain. The only period illustrations of the book. |

Edition check (important): the 1818 and 1831 texts differ (the 1831 revision
changes Elizabeth's backstory in Chapter 1 and adds Shelley's introduction). The
reading must match the text we show. The alignment step reports the percentage of
words matched per chapter (Alice got 95-99%); anything well below that means the
recording and text differ, and we either switch recordings or edit the shown text.

Network: from this thread's old environment, gutenberg.org, librivox.org and
archive.org were blocked (proxy 403); PyPI and npm worked. You have since moved to
an environment where they are open, so the work sessions must run there. Image
generation by API also needs api.openai.com allowed and OPENAI_API_KEY set in that
environment (not present here). Alice's sessions also needed huggingface.co
(wav2vec2 model) and victorianweb.org.

## 4. Scale

| | Alice | Frankenstein (estimate) |
|---|---|---|
| Sections | 12 chapters | 28 (4 letters + 24 chapters) |
| Words | ~27,000 | ~75,000 |
| Audio | ~2.5 h | ~8-9 h (to be confirmed from the recording) |
| Images | 371 | ~450-650 (fewer whimsical one-offs, more places and poses) |

Audio size: at Alice's 96 kbps mono, 8.5 h is about 370 MB. Recommend 64 kbps
mono for a solo reader (~245 MB). Affects the phone build later, not the start.

## 5. The pipeline, automated

Each stage is a script run by Claude; you only make the calls marked YOU.

**Stage A: Port the framework (once)**
1. Copy the Alice1 engine and generic tools into Shelley1; delete Alice-specific code.
2. Make the engine book-agnostic: one `book.json` (sections, titles, cast, protagonist
   per scene) replaces hard-coded chapter lists and Alice names.
3. Code-drawn placeholder silhouettes for every character and set, so every chapter
   can be staged and played before any art exists.
4. Smoke test, web link, Windows build from Actions. Result: an empty theater that runs.

**Stage B: Text and audio, the whole book at once (automated)**
1. Download PG 84, split into 28 sections (`source/text/l01.txt`...`ch24.txt`).
2. Download the chosen LibriVox files; transcribe (faster-whisper), align, trim, then
   forced-align (wav2vec2). One command per section, run as one batch.
3. Report: match rate per section, skipped words. Result: the whole book readable
   and narrated, word-synced, before any staging.

**Stage C: Breakdown (automated, Claude reads the book)**
For each section Claude writes `docs/SECTION_NN_ASSETS.md` (places, characters,
poses, props, colours named in the text) and the prompts. New here versus Alice:
a machine-readable `assets/manifest.json` with, for each asset: id, type
(character / building / set / prop / vignette), sections used, first cue word,
reference image(s), status (none / generated / approved / in game).
`assets_master.py` builds the checklist from the manifest.

**Stage D: Asset generation (automated queue, in your priority order)**
`tools/gen_queue.py` (new) walks the manifest and generates in this order:
1. **Characters first, those with no asset yet first.** Within that, by importance
   (number of sections they appear in). For each character: a model sheet
   (turnaround) first; YOU approve it; then every pose is generated with the
   approved sheet attached, so the character stays consistent.
2. **Buildings** (exteriors, then interiors: walls, floor, ceiling as separate pieces).
3. **Everything else**: landscapes and skies, props, thought vignettes.
For each image the queue then runs `whitecut.py`, saves to `source/ai/` and
`public/art/ai/`, logs `PROVENANCE.md`, ticks the master list, and builds a
contact sheet. Retries automatically when the safety filter refuses (reworded).
Batches are sized to a budget you set. Each batch ends with one contact sheet
for you to approve or reject per image; rejects go back in the queue with your note.

**Stage E: Staging (Claude, section by section)**
Replace placeholders with the art, key every movement to cue words, hand-direct the
camera, then run the checks (frame_report, jerk_report, smoke). Publish the web
link after each section. You send patch notes, Claude fixes them.

**Stage F: Release**: same as Alice (Electron, Steam test app, phones later).

## 6. Asset priority list (first pass, from the book)

Characters (all have no asset yet; order = importance):
1. The Creature (book look: 8 ft, yellow skin, watery eyes, black lips, long black
   hair, white teeth. NOT the 1931 film look: no flat head, no neck bolts; that
   makeup design is Universal's).
2. Victor Frankenstein (student; later worn and haunted; on the ice).
3. Robert Walton. 4. Elizabeth Lavenza. 5. Henry Clerval. 6. Alphonse Frankenstein.
7. William Frankenstein (child). 8. Justine Moritz. 9. Caroline Beaufort.
10. M. Waldman. 11. M. Krempe. 12. De Lacey (blind old man). 13. Felix.
14. Agatha. 15. Safie. 16. Mr. Kirwin. 17. Ernest Frankenstein.
18. Minor: Beaufort, Safie's father, Walton's sailors, the Orkney/Irish townspeople,
the rustic and the girl he saves, the Geneva magistrate, the female creature (unfinished).

Buildings and sets: Walton's ship in the ice and its cabin; the Frankenstein house in
Geneva and Belrive; Ingolstadt (university, lecture room, Victor's garret laboratory,
the inn and streets); Plainpalais; the Geneva court and prison; Chamounix,
Montanvert and the Mer de Glace; the forest and the De Lacey cottage with the hovel;
the Orkney hut and laboratory; the Irish town, court and prison; the inn at Evian
and Lake Geneva; the graveyard; the Arctic chase (sledges, ice floes).

Other: skies, mountains, lake and sea, storms and lightning, the lab apparatus,
the lantern, letters and journals, Felix's books, the locket with Caroline's
portrait, the sledges and dogs, thought/memory vignettes.

## 7. Decisions for you (each with my recommendation)

- **D1. Art style.** Recommend: black ink engraving in the manner of von Holst's 1831
  plates (darker, Gothic, more night hatching than Tenniel), with Alice's colour rule
  (colour only where the text names it, e.g. the Creature's yellow skin, black lips).
- **D2. Audiobook.** Recommend: a solo LibriVox reading that matches the Gutenberg
  text (a full-cast dramatic reading only if one exists for the same edition). I will
  list the candidates with lengths and match rates in the new environment.
- **D3. Who makes the images.** Recommend: by API from the queue (`gen_image.py`),
  with you approving each model sheet and each batch's contact sheet. Needs
  OPENAI_API_KEY and api.openai.com in the environment. The alternative is Alice's
  ChatGPT route (Claude writes prompts, you upload images), which is slower.
- **D4. Frame story.** The book is nested (Walton writes letters; Victor tells his
  story; inside it the Creature tells his). Recommend: Walton's cabin in the ice as
  the frame scene we return to between the layers, as the theater "house" opening.
- **D5. First slice.** Recommend: Letters 1-4 and Chapter 1 (the opening, small cast,
  proves the frame and the pipeline), then Chapter 5 (the creation) as the showcase.
- **D6. Repo.** Recommend: a fresh engine copy in Shelley1 (not a fork), working
  branch `claude/project-thread-c8eoh0`.

## 8. Order of work

1. You: answer D1-D6, and confirm the environment allows Gutenberg, LibriVox,
   archive.org, huggingface.co, PyPI, npm and (for D3) api.openai.com.
2. Stage A (port) and Stage B (whole-book text and audio) in parallel.
3. Stage C breakdown for the whole book; manifest and master list.
4. Stage D characters: model sheets for 1-17, your approval, then poses.
5. Stage E staging of the first slice, web link, your notes.
6. Stage D buildings, then the rest, section by section with Stage E.

## 9. Risks

- Edition mismatch between text and recording (caught by match rate, Stage B).
- Character drift across hundreds of images: always attach the approved model sheet.
- Safety-filter refusals on violent scenes (William's death, the murders, the
  dismembered female creature): stage them off-page or as aftermath, as the
  book mostly does.
- Memory: Alice's art was ~650 MB on the graphics card; the engine frees textures
  per chapter, which matters more with 28 sections.
- Image API cost: Alice logged ~1,500 tokens per high-quality picture on
  gpt-image-2.5-sunburst; ~600 images is the order of magnitude to budget for.
