"""Make the paper-coloured gaps inside cut-out drawings transparent: the space under a chair seat
and between its slats, inside a basket's handle, between a bed's curtains, between a horse's legs.

tools/whitecut.py only clears white that touches the picture's edge; white the drawing encloses
stays paper, which showed as white patches on stage (owner, 2026-10-17). A gap is a flat region of
paper colour, at least AREA of the picture, filling at least FILL of its bounding box (gaps are
blocky; a white dress, shirt or letter is streaked with hatching and fails both tests).

  python3 tools/hole_cut.py find            contact sheet of what would be cleared: source/ai/review/holes.png
  python3 tools/hole_cut.py cut NAME ...    clear them in public/art/ai/NAME.webp
(sets/common/bed was cleared with tools/whitecut.py --clear 493,464 on its source instead.)
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

sys.path.insert(0, "tools")
from gen_batch import opaque, save_web  # noqa: E402

# Found by `find` but really paper (a letter, milk, a sail, a hand), checked by eye on 2026-10-17.
KEEP = {"cast/elizabeth_stand", "cast/krempe_stand", "props/archangel_ship", "props/chalk_circle", "props/creature_sledge",
        "props/laudanum", "props/sailing_boat", "props/shepherd_breakfast", "props/window_milk", "sets/common/ship"}
PAPER, TOL, AREA, FILL = np.array([238, 231, 218]), 8, 0.001, 0.6


def holes(im):
    a = np.array(im.convert("RGBA")).astype(int)
    paper = (a[..., 3] > 200) & (np.abs(a[..., :3] - PAPER).max(-1) <= TOL)
    lab, k = ndi.label(paper)
    out = np.zeros(paper.shape, bool)
    for j, sl in enumerate(ndi.find_objects(lab), 1):
        m = lab[sl] == j
        n = m.sum()
        if n / paper.size >= AREA and n / m.size >= FILL:
            out[sl] |= m
    return ndi.binary_dilation(out, iterations=2) & (a[..., 3] > 0)


def names():
    return [n for n in json.load(open("public/art/ai/index.json"))
            if not opaque(n) and not n.startswith("vignettes/") and not n.endswith("_sheet") and n not in KEEP]


def find():
    items = []
    for n in names():
        im = Image.open(f"public/art/ai/{n}.webp").convert("RGBA")
        h = holes(im)
        if h.sum() / h.size > 0.002:
            items.append((n, im, h))
    th, cols = 220, 8
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * th, rows * (th + 14)), "white")
    d = ImageDraw.Draw(sheet)
    for i, (n, im, h) in enumerate(items):
        b = np.array(im)
        b[h] = [220, 40, 40, 255]
        t = Image.new("RGBA", im.size, (120, 160, 120, 255))
        t.alpha_composite(Image.fromarray(b))
        t = t.convert("RGB")
        t.thumbnail((th, th))
        x, y = (i % cols) * th, (i // cols) * (th + 14)
        sheet.paste(t, (x, y))
        d.text((x + 2, y + th), f"{i} {n[:32]}", fill="black")
    sheet.save("source/ai/review/holes.png")
    print("\n".join(f"{i} {n}" for i, (n, _, _) in enumerate(items)))


def cut(ns):
    for n in ns:
        p = f"public/art/ai/{n}.webp"
        im = Image.open(p).convert("RGBA")
        a = np.array(im)
        h = holes(im)
        a[h, 3] = 0
        save_web(Image.fromarray(a), n, p)
        print(f"{n}: cleared {100 * h.sum() / h.size:.1f}%")


if __name__ == "__main__":
    find() if sys.argv[1] == "find" else cut(sys.argv[2:])
