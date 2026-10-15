"""Make the next batch of images from the master asset list, for the owner to approve.

Owner decisions (2026-10-15): Gothic ink engraving style (the style block in assets/manifest.json);
images made automatically through the OpenAI image API, approved batch by batch.

  python3 tools/gen_batch.py next [--n 8] [--group Characters] [--sheets] [--jobs 4]
                                                                  make the next N images not done yet
Owner plan (2026-10-15): wave 1 = the character model sheets (`next --sheets --n 27`), approved by
the owner; wave 2 = everything else in parallel, posed figures drawn with their approved sheet.
  python3 tools/gen_batch.py approve [FILE ...]                   put the batch into the game (all, or these)
  python3 tools/gen_batch.py reject FILE [FILE ...]               throw these away; `next` makes them again

`next` follows the list's order (characters first; a pose waits until its model sheet is approved,
and is drawn with the sheet attached). Each image is saved as source/ai/<file>.png, and the batch
gets a contact sheet, source/ai/review/batch_NNN.png, listed in source/ai/review/pending.json.
`approve` cuts the white away (tools/whitecut.py; walls, views, floors and vignettes stay opaque),
writes public/art/ai/<file>.webp and adds it to public/art/ai/index.json, so the game uses it.
Then rerun `node tools/assets_master.mjs` to tick it off the list.
Needs OPENAI_API_KEY and api.openai.com reachable; tools/gen_image.py does the API call.
"""
import argparse
import json
import os
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REVIEW = "source/ai/review"
PENDING = f"{REVIEW}/pending.json"
INDEX = "public/art/ai/index.json"
REF_PER_MIN = 18  # the API allows 20 reference images a minute (owner, 2026-10-15: stay inside it); 2 spare


class Pace:
    """Lets at most `per_min` reference images start in any 60 seconds, across all the parallel jobs."""
    def __init__(self, per_min):
        self.per_min, self.starts, self.lock = per_min, [], threading.Lock()

    def wait(self, n):
        while True:
            with self.lock:
                now = time.time()
                self.starts = [t for t in self.starts if now - t < 60]
                if len(self.starts) + n <= self.per_min:
                    self.starts += [now] * n
                    return
                pause = 60 - (now - self.starts[0]) + 0.1
            time.sleep(pause)


def load(p, default):
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


def approved():
    return set(load(INDEX, []))


def opaque(file):
    """Full-frame pictures keep their paper; cut-outs lose the white around them."""
    name = file.split("/")[-1]
    return file.startswith("vignettes/") or name in ("wall_back", "wall_left", "wall_right", "view", "far") or name.startswith(("floor_", "ground_")) or name == "floor" or name == "ground"


def save_web(im, f, dst):
    """The game's copy: full-frame pictures at most 1280 px wide, quality 70; cut-outs at most
    1600 px, quality 75. Engraved hatching compresses poorly, and the whole book's art has to
    fit the web build (2026-10-15)."""
    if opaque(f):
        if im.width > 1280:
            im = im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=70)
    else:
        if max(im.size) > 1600:
            im.thumbnail((1600, 1600))
        im.save(dst, "WEBP", quality=75)


def contact_sheet(files, out):
    th = 360
    ims = [Image.open(f"source/ai/{f}.png").convert("RGB") for f in files]
    ims = [im.resize((max(1, im.width * th // im.height), th)) for im in ims]
    cols = 4
    rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
    W = max(sum(im.width for im in r) + 20 * (len(r) + 1) for r in rows)
    sheet = Image.new("RGB", (W, len(rows) * (th + 50) + 20), "#e8e2d2")
    d = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for ri, r in enumerate(rows):
        x = 20
        for ci, im in enumerate(r):
            y = 20 + ri * (th + 50)
            sheet.paste(im, (x, y))
            d.text((x, y + th + 6), f"{ri * cols + ci + 1}. {files[ri * cols + ci]}", fill="black", font=font)
            x += im.width + 20
    sheet.save(out)


def cmd_next(a):
    m = load("assets/manifest.json", None) or sys.exit("run node tools/assets_master.mjs first")
    done = approved()
    pending = load(PENDING, {"batch": 0, "files": []})
    if pending["files"]:
        sys.exit(f"batch {pending['batch']} is waiting for approval: {REVIEW}/batch_{pending['batch']:03d}.png")
    todo = []
    for e in m["entries"]:
        if e["file"] in done or (a.group and e["group"] != a.group) or (a.sheets and not e["file"].endswith("_sheet")):
            continue
        if e.get("ref") and e["ref"] not in done:
            continue  # the model sheet must be approved first
        todo.append(e)
        if len(todo) == a.n:
            break
    if not todo:
        sys.exit("nothing to make: every image in that part of the list is done (or waits on a model sheet)")
    pace = Pace(a.ref_per_min)
    style = m["style"].replace('Reply "ready" and wait for my first request.', "").strip()
    def make(e):
        out = f"source/ai/{e['file']}.png"
        os.makedirs(os.path.dirname(out), exist_ok=True)
        refs = [f"source/ai/{e['ref']}.png"] if e.get("ref") else []
        cmd = [sys.executable, f"{HERE}/gen_image.py", out, e["prompt"], "--size", e["size"], "--style", style]
        for r in refs:
            cmd += ["--ref", r]
        if refs:
            pace.wait(len(refs))
        if a.model:
            cmd += ["--model", a.model]
        r = subprocess.run(cmd, capture_output=True, text=True)
        print(f"{e['file']}: {'failed ' + (r.stderr or r.stdout)[-300:] if r.returncode else 'made'}", flush=True)
        return None if r.returncode else e["file"]

    # Several requests at once: the API's rate limit is the real limit (wave 2 uses --jobs 8 or more).
    with ThreadPoolExecutor(a.jobs) as ex:
        made = [f for f in ex.map(make, todo) if f]
    if not made:
        sys.exit("no images were made")
    os.makedirs(REVIEW, exist_ok=True)
    n = pending["batch"] + 1
    contact_sheet(made, f"{REVIEW}/batch_{n:03d}.png")
    json.dump({"batch": n, "files": made}, open(PENDING, "w"), indent=1)
    print(f"batch {n}: {len(made)} images, sheet {REVIEW}/batch_{n:03d}.png")


def cmd_approve(a):
    pending = load(PENDING, {"batch": 0, "files": []})
    files = a.files or pending["files"]
    index = load(INDEX, [])
    for f in files:
        src = f"source/ai/{f}.png"
        if not os.path.exists(src):
            print(f"missing {src}")
            continue
        os.makedirs(REVIEW, exist_ok=True)
        png = f"{REVIEW}/cut.png"
        subprocess.run([sys.executable, f"{HERE}/whitecut.py", src, png, *(["--opaque"] if opaque(f) else [])], check=True)
        dst = f"public/art/ai/{f}.webp"
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        im = Image.open(png)
        save_web(im, f, dst)
        os.remove(png)
        if f not in index:
            index.append(f)
        print(f"approved {f}")
    json.dump(sorted(index), open(INDEX, "w"), indent=1)
    subprocess.run([sys.executable, f"{HERE}/art_sizes.py"], check=True)
    pending["files"] = [f for f in pending["files"] if f not in files]
    json.dump(pending, open(PENDING, "w"), indent=1)


def cmd_reject(a):
    pending = load(PENDING, {"batch": 0, "files": []})
    for f in a.files:
        p = f"source/ai/{f}.png"
        if os.path.exists(p):
            os.remove(p)
        print(f"rejected {f}")
    pending["files"] = [f for f in pending["files"] if f not in a.files]
    json.dump(pending, open(PENDING, "w"), indent=1)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    n = sub.add_parser("next")
    n.add_argument("--n", type=int, default=8)
    n.add_argument("--group", default=None)
    n.add_argument("--model", default=None)
    n.add_argument("--jobs", type=int, default=4)
    n.add_argument("--ref-per-min", type=int, default=REF_PER_MIN)
    n.add_argument("--sheets", action="store_true", help="wave 1: only the character model sheets")
    sub.add_parser("approve").add_argument("files", nargs="*")
    sub.add_parser("reject").add_argument("files", nargs="+")
    a = ap.parse_args()
    {"next": cmd_next, "approve": cmd_approve, "reject": cmd_reject}[a.cmd](a)


if __name__ == "__main__":
    main()
