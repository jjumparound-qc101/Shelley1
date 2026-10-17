"""Split each four-step walk strip into its frames, lined up by the feet.

The art thread draws a walker as one picture holding four steps side by side (contact,
passing, contact, passing), so the frames share size and style (owner, 2026-10-17).
Each strip source/ai/cast/<who>_walk4.png is cut from its white (tools/whitecut.py) and
split at the empty columns between the figures. Every frame is then pasted onto one
canvas so that all four stand on the same baseline (the lowest foot) and keep the same
head-and-shoulders centre across the frames, so the figure doesn't slide or jump as the
frames change. Out: public/art/ai/cast/<who>_walk_1..4.webp, added to index.json.

Usage: python3 tools/walk_split.py [who ...]   (default: every strip)
Requires Pillow, NumPy and SciPy.
"""
import glob
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = "public/art/ai/index.json"
PAD = 8  # transparent margin at the sides, in pixels (none above or below: the feet sit on the bottom edge)


def columns(alpha):
    """The figures' column spans: runs of columns with ink, ignoring specks."""
    ink = alpha > 40
    col = ink.sum(0)
    runs, s = [], None
    for x, c in enumerate(col > 0):
        if c and s is None:
            s = x
        if not c and s is not None:
            runs.append((s, x))
            s = None
    if s is not None:
        runs.append((s, len(col)))
    mass = [col[a:b].sum() for a, b in runs]
    big = max(mass)
    return [r for r, m in zip(runs, mass) if m > big * 0.05]


def split(who):
    src = f"source/ai/cast/{who}_walk4.png"
    png = f"source/ai/review/{who}_walk4_cut.png"
    os.makedirs(os.path.dirname(png), exist_ok=True)
    subprocess.run([sys.executable, f"{HERE}/whitecut.py", src, png], check=True)
    im = Image.open(png).convert("RGBA")
    os.remove(png)
    a = np.asarray(im)[:, :, 3]
    runs = columns(a)
    if len(runs) != 4:
        print(f"{who}: found {len(runs)} figures, not 4; skipped")
        return None
    frames = []
    for x0, x1 in runs:
        rows = np.nonzero((a[:, x0:x1] > 40).any(1))[0]
        top, base = rows[0], rows[-1] + 1
        head = a[top:top + (base - top) * 2 // 5, x0:x1].astype(np.float64)
        cx = x0 + (head.sum(0) * np.arange(x1 - x0)).sum() / head.sum()
        frames.append(dict(box=(x0, top, x1, base), cx=cx))
    L = max(f["cx"] - f["box"][0] for f in frames)
    R = max(f["box"][2] - f["cx"] for f in frames)
    L = R = max(L, R)  # the head-and-shoulders centre in the middle, where the puppet stands
    H = max(f["box"][3] - f["box"][1] for f in frames)
    W, Ht = int(np.ceil(L + R)) + 2 * PAD, int(H)
    out = []
    for i, f in enumerate(frames, 1):
        x0, top, x1, base = f["box"]
        canvas = Image.new("RGBA", (W, Ht), (0, 0, 0, 0))
        canvas.paste(im.crop(f["box"]), (int(round(PAD + L - (f["cx"] - x0))), int(H) - (base - top)))
        if max(canvas.size) > 1600:
            canvas.thumbnail((1600, 1600))
        name = f"cast/{who}_walk_{i}"
        canvas.save(f"public/art/ai/{name}.webp", "WEBP", quality=75)
        out.append(name)
    print(f"{who}: {W}x{Ht}, heights {[f['box'][3] - f['box'][1] for f in frames]}")
    return out


def main():
    who = sys.argv[1:] or sorted(os.path.basename(f)[:-len("_walk4.png")] for f in glob.glob("source/ai/cast/*_walk4.png"))
    index = json.load(open(INDEX))
    for w in who:
        for n in split(w) or []:
            if n not in index:
                index.append(n)
    json.dump(sorted(index), open(INDEX, "w"), indent=1)
    subprocess.run([sys.executable, f"{HERE}/art_sizes.py"], check=True)


if __name__ == "__main__":
    main()
