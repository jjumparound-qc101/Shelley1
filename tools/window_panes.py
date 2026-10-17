"""Finds the blank (plain paper) window panes in the indoor wall drawings, so they can be cut out
and the view outside shown through them (owner, 2026-10-17: every window shows its view).

A pane is a flat, light, nearly featureless patch, fairly rectangular, between 0.1% and 6% of the
picture. Panes already engraved with a view are left alone (they are not flat).

  python3 tools/window_panes.py find   -> source/ai/review/panes_*.png (magenta = would be cut)
  python3 tools/window_panes.py cut SET/WALL ...  -> cuts those walls' panes (alpha) in public/art/ai
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = "public/art/ai/sets"


def panes(path):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(float)
    g = a[..., :3].mean(2)
    # Flat and light: bright, and little local variation (blank paper, not plaster or hatching).
    loc = ndimage.uniform_filter(g, 7)
    var = ndimage.uniform_filter((g - loc) ** 2, 7)
    flat = (g > 175) & (var < 60) & (a[..., 3] > 0)
    flat = ndimage.binary_opening(flat, iterations=2)
    lab, n = ndimage.label(flat)
    H, W = g.shape
    keep = np.zeros_like(flat)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        comp = lab[sl] == i
        area = comp.sum()
        h, w = comp.shape
        if not (0.0003 * H * W < area < 0.06 * H * W):
            continue
        if area / (h * w) < 0.72 or h < 10 or w < 8:
            continue
        if sl[0].start < 0.02 * H or sl[0].stop > 0.98 * H or sl[1].start < 0.005 * W or sl[1].stop > 0.995 * W:
            continue  # not the paper strips at the picture's edges
        keep[sl] |= comp
    # Grow a little into the anti-aliased edge of the glazing bars.
    keep = ndimage.binary_dilation(keep, iterations=3) & (g > 135)
    return im, keep


def walls():
    for s in sorted(os.listdir(ROOT)):
        for w in ("wall_left", "wall_back", "wall_right"):
            p = f"{ROOT}/{s}/{w}.webp"
            if os.path.exists(p):
                yield s, w, p


def cmd_find():
    os.makedirs("source/ai/review", exist_ok=True)
    rows = list(walls())
    for k in range(0, len(rows), 24):
        part = rows[k:k + 24]
        T = Image.new("RGB", (4 * 330, ((len(part) + 3) // 4) * 240), "white")
        d = ImageDraw.Draw(T)
        for i, (s, w, p) in enumerate(part):
            im, m = panes(p)
            rgb = np.asarray(im.convert("RGB")).copy()
            rgb[m] = (255, 0, 255)
            t = Image.fromarray(rgb)
            t.thumbnail((320, 214))
            x, y = (i % 4) * 330, (i // 4) * 240
            T.paste(t, (x, y + 20))
            d.text((x + 2, y + 4), f"{s}/{w}  {m.mean():.1%}", fill=(200, 0, 0))
        T.save(f"source/ai/review/panes_{k // 24}.png")
    print(len(rows), "walls")


def cmd_cut(names):
    for n in names:
        p = f"{ROOT}/{n}.webp"
        im, m = panes(p)
        a = np.asarray(im).copy()
        a[m, 3] = 0
        Image.fromarray(a).save(p, quality=90, method=6)
        print(n, f"{m.mean():.1%} cut")


if __name__ == "__main__":
    {"find": lambda: cmd_find(), "cut": lambda: cmd_cut(sys.argv[2:])}[sys.argv[1]]()
