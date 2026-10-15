"""Build docs/ASSETS_MASTER.md: every art prompt for every chapter in one document.

The chapter lists are written first (docs/CHAPTER_NN_ASSETS.md for the why, and the
"Chapter … asset list" sections of docs/ART_PROMPTS.md for the prompts); this script then
gathers all the prompts, in book order, into one checklist. An asset is ticked as received
when a file with its name (any extension) is in source/ai/.

Usage: python3 tools/assets_master.py   (run after adding a chapter list or receiving art)
"""
import glob
import os
import re

PROMPTS = "docs/ART_PROMPTS.md"
OUT = "docs/ASSETS_MASTER.md"
RECEIVED_DIR = "source/ai"

# Entries made under another name, or ruled out by the owner (2026-10-14): ticked with this note.
DONE_AS = {
    "crown_cushion": "not needed: the crown on its cushion is in the Knave's drawing (knave_carry)",
    "tea_table": "done as tea_cloth (repeated along the table) with teacup, plate_bread, milk_jug and teapot on it",
    "armchair": "done as tea_armchair (the chair of Alice's alice7_chair drawing)",
    "tea_things": "done as teacup, teapot, milk_jug, plate_bread",
    "tea_tree": "not needed: the shared tree drawing shades the table",
    "table_gloves": "done as table_gloves and table_empty (the bottle stands by the looking-glass, as the book says)",
    "ladders": "done (two ladders tied end to end)",
    "pebbles_cakes": "done as pebble_1-5 and cake_1-5 (tools/wood_art.py splits pebbles.png and little_cakes.png)",
    "wood_grass": "done (tall grass, no trunks, repeated in rows)",
    "mushroom_top": "not needed: the Caterpillar sits on the side-view mushroom's cap",
    "mushroom_bits": "done as mushroom_bit_1 and _2",
    "court_wall": "done: AI court set 2026-10-15 (the canopy is in the throne's drawing; tools/court_art.py)",
    "throne": "done as court_throne (with its canopy of hearts)",
    "jury_box": "done as court_jury_box",
    "tarts_table": "done as court_table",
    "witness_box": "done as court_witness_box",
    "alice_walk_cycle": "not needed now: the owner will make the walk cycle",
    "creatures3": "done as owl3, magpie3, canary3, crabs3",
    "alice4_hunt": "not needed: the stooping pose is used (the filter refused bending poses)",
    "bill_chimney": "done as bill_climb",
    "bill_held": "done as bill_limp, guinea_hold, guinea_bottle",
    "caterpillar_first": "done as caterpillar_sit (Chapter V's drawing)",
    "stool": "not needed: hidden by the Duchess's skirts (owner)",
    "pepper_box": "not needed: in the Cook's drawing",
    "great_letter": "not needed: in the Fish-Footman's drawing",
    "cheshire_grin": "done: cut from cheshire_bough (public/art/ai/ch6/cheshire_grin)",
    "tree_bough": "not needed: the Cat's drawing has its bough",
    "door_close": "done as little_house",
    "hatter_stare": "done as hatter_sit_stare",
    "hatter_riddle": "done as hatter_sit_riddle",
    "hatter_watch": "done as hatter_sit_watch",
    "march_hare": "done as marchhare_sit",
    "march_hare_dip": "done as marchhare_dip",
    "gardeners_paint": "done as two_paint, five_paint, seven_paint",
    "gardener_flat": "done as card_back",
    "gardener_bow": "done as two/five/seven_bow, two_kneel, two/five/seven_run",
    "soldier_club": "done as body_soldier (pips placed by the game)",
    "soldier_arch": "done as card_arch",
    "courtier": "done as body_courtier",
    "royal_child": "done as body_child",
    "knave": "done as knave_carry",
    "king": "done as king_stand",
    "guests": "done as king_clubs, queen_clubs, king_diamonds, queen_diamonds, king_spades, queen_spades, knave_spades",
    "rabbit8_herald": "done as rabbit8_peep, rabbit8_tiptoe (from the Chapter I model)",
    "hedgehogs": "done as hedgehog_ball, hedgehog_crawl, hedgehog_fight",
    "duchess9_flee": "done as duchess9_tremble, duchess9_run",
    "queen9_folded": "done as queen_folded",
    "king_judge_frown": "done as king_judge_fold, king_judge_specs",
    "queen_throne": "done as queen_specs",
    "hatter_witness": "done as hatter_cup, hatter_bite",
    "hatter_leaving": "done as hatter_run",
    "herald_props": "not needed: the trumpet and scroll are in the Rabbit's herald drawings",
    "knave_chains_sad": "done as knave_chains",
    "rabbit_spectacles": "done as rabbit_specs (from the Chapter I model)",
    "gryphon_wake": "done as gryphon_wake, gryphon_chuckle",
    "jurors": "done as the twelve creatures' own drawings, seated in the jury-box by the game (src/sets/court.js)",
    "guinea_bag": "done as body_officer_bag",
    "jurors_sprawl": "done: the game tips the jurors' drawings out of the box (src/scenes/evidence.js)",
    "bill_upside_down": "done as bill_gape; head downwards is Bill's drawing turned over by the game",
    "king_judge_notebook": "done as king_judge_notebook, king_judge_paper",
    "sister_lap": "done as sister_lap, sister_dream",
    "alice12_lap": "done: the sitting Alice tilted into her sister's lap by the game (the filter refuses lying poses)",
    "rabbit_room_side": "done as rabbit_room_door, rabbit_room_fire",
    "soldier9_custody": "done as body_soldier_lead (the prisoner is the player's own card)",
}


def received():
    names = set()
    for f in glob.glob(f"{RECEIVED_DIR}/*"):
        stem = os.path.splitext(os.path.basename(f))[0]
        names.add(stem)
        names.add(re.sub(r"_screenshot$", "", stem))  # an interim screenshot counts, flagged below
    return names


def main():
    text = open(PROMPTS, encoding="utf-8").read()
    style = re.search(r"## 0\. Style block.*?```(.*?)```", text, re.S).group(1).strip()
    # Chapter sections: from "## Chapter I asset list v2" on, each up to the next "## " heading.
    parts = re.split(r"\n(?=## )", text)
    chapters = [p for p in parts if re.match(r"## Chapter [IVXL]+ asset list", p)]
    have = received()
    screenshots = {re.sub(r"_screenshot$", "", os.path.splitext(os.path.basename(f))[0]) for f in glob.glob(f"{RECEIVED_DIR}/*_screenshot.*")}

    total = done = left = 0
    body = []
    for sec in chapters:
        lines = sec.strip().split("\n")
        title = re.sub(r"^## ", "", lines[0])
        title = re.sub(r" \(2026-\d\d-\d\d\)", "", title).replace(" v2", "").replace(": everything still needed", "")
        out = [f"## {title}"]
        skip = False  # sections headed "Not needed" are left out of the checklist
        for ln in lines[1:]:
            if ln.startswith("### "):
                skip = ln.startswith("### Not needed")
            if skip:
                continue
            if ln.strip() == "---":
                continue
            # A prompt line: "12. `file.png` …" or "- `file.png` …" (several files may be named).
            m = re.match(r"^(\d+\.|-)\s+(`[^`]+\.png`.*)$", ln)
            if m:
                files = re.findall(r"`([^`]+)\.png`", m.group(2))
                got = [f for f in files if f in have or f in DONE_AS]
                total += len(files)
                done += len(got)
                box = "[x]" if files and len(got) == len(files) else "[ ]"
                left += box == "[ ]"
                note = " *(received as a screenshot: send the original)*" if any(f in screenshots for f in files) else ""
                note += "".join(f" *({DONE_AS[f]})*" for f in files if f in DONE_AS and f not in have)
                num = m.group(1) if m.group(1) != "-" else "·"
                out.append(f"- {box} **{num}** {m.group(2)}{note}")
            else:
                out.append(ln)
        body.append("\n".join(out).strip())

    head = f"""# Master Asset List
Generated by `tools/assets_master.py` from the chapter lists. **Don't edit by hand**: change the chapter list in `docs/ART_PROMPTS.md` (and the reasons in `docs/CHAPTER_NN_ASSETS.md`), then run the script.

**Progress:** {done} of {total} images done; **{left} entries still to make**. A box is ticked when a file with that name is in `source/ai/`, or when the entry was made under another name or ruled out (the note says which; `DONE_AS` in the script).

## How to use this document
1. Use **one ChatGPT conversation** for everything, so the style and the characters stay the same.
2. Paste the **style block** below first, with the Tenniel references attached.
3. **Every Alice prompt:** attach the Alice model sheet (`source/ai/alice_turnaround.webp`) and add: "Match this model sheet exactly: same face, hair, collar, puffed sleeves, pinafore with pocket, sash bow, stockings and strap shoes, same proportions."
4. **Every White Rabbit prompt:** attach the Chapter I model sheet (`source/ai/rabbit_sheet.webp`; owner, 2026-10-14: that Rabbit is the standard in every scene).
5. Attach the plate a prompt names (each chapter lists its reference links at the top).
6. Ask for the largest size; reject anything with grey wash, colour, a border or a signature. The game adds the colours the text names.
7. Upload with the **file name given**, as a normal message (not mid-task). Download originals; screenshots are lower quality.
8. Priority: each chapter ends with its "priority if time is short" order.
9. **Prompts that name a Tenniel plate:** generate them now, attaching the plate as the reference (owner, 2026-10-11). Cutting figures straight from high-resolution scans is an optional upgrade later.
10. **Card people** (owner, 2026-10-14): cards with parts in the story are drawn whole, hearts red; the crowds are blank-faced bodies per class, and the game prints engraved suit signs on them (`src/cards.js`).

## Style block (paste first)
```
{style}
```
"""
    open(OUT, "w", encoding="utf-8").write(head + "\n" + "\n\n---\n\n".join(body) + "\n")
    print(f"{OUT}: {len(chapters)} chapters, {done}/{total} done, {left} entries left")


if __name__ == "__main__":
    main()
