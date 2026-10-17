"""Finds, for every thought picture (public/art/ai/vignettes/*.webp), the largest upright oval that
lies wholly inside its engraving, so the game's thought bubble can show exactly that oval: centred
on the drawing, with no plain paper at its edge, whatever shape the drawn oval has (egg-shaped,
flattened, or cut by the picture's edge). The game used to guess it from where the ink was, which
put some pictures off centre (owner, 2026-10-17).

Writes public/art/ai/ovals.json: {"vignettes/<name>": [x, y, w, h]}, the oval's box as fractions
of the picture. Run: python3 tools/vignette_ovals.py (needs Pillow and numpy).
"""
import glob
import json
import os
from collections import deque

import numpy as np
from PIL import Image

W = 120  # working width in pixels


def paper_mask(a):
    """The plain paper round the engraving: paper-coloured pixels joined to the picture's edge."""
    H, Wd, _ = a.shape
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(edge, 0)
    near = np.abs(a - bg).sum(2) < 36
    seen = np.zeros((H, Wd), bool)
    q = deque((y, x) for y in range(H) for x in (0, Wd - 1) if near[y, x])
    q.extend((y, x) for x in range(Wd) for y in (0, H - 1) if near[y, x])
    for y, x in q:
        seen[y, x] = True
    while q:
        y, x = q.popleft()
        for v, u in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= v < H and 0 <= u < Wd and near[v, u] and not seen[v, u]:
                seen[v, u] = True
                q.append((v, u))
    return seen


def fit(path):
    im = Image.open(path).convert("RGB")
    H = max(1, round(W * im.height / im.width))
    a = np.asarray(im.resize((W, H), Image.BILINEAR)).astype(int)
    paper = paper_mask(a)
    # The picture's edge counts as paper too: the oval must lie within the picture.
    paper[0, :] = paper[-1, :] = paper[:, 0] = paper[:, -1] = True
    ys, xs = np.nonzero(~paper)
    bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    yy, xx = np.mgrid[0:H, 0:W] + 0.5
    py, px = np.nonzero(paper)
    best = None
    bcx, bcy = (bx0 + bx1) / 2, (by0 + by1) / 2
    for asp in np.linspace(0.85, 1.15, 7) * (bx1 - bx0) / (by1 - by0):
        for dx in np.arange(-6, 6.5, 1.5):
            for dy in np.arange(-6, 6.5, 1.5):
                cx, cy = bcx + dx, bcy + dy
                # The largest b (half-height) whose oval holds no paper: the nearest paper pixel.
                r = np.sqrt(((px - cx) / asp) ** 2 + (py - cy) ** 2)
                b = r.min() if len(r) else H
                b = min(b, cx / asp, (W - cx) / asp, cy, H - cy)
                area = asp * b * b
                if best is None or area > best[0]:
                    best = (area, cx, cy, asp * b, b)
    _, cx, cy, ra, rb = best
    ra *= 0.97; rb *= 0.97  # a hair inside, clear of the engraved rim
    return [round((cx - ra) / W, 4), round((cy - rb) / H, 4), round(2 * ra / W, 4), round(2 * rb / H, 4)]


if __name__ == "__main__":
    out = {}
    for f in sorted(glob.glob("public/art/ai/vignettes/*.webp")):
        out["vignettes/" + os.path.basename(f)[:-5]] = fit(f)
    json.dump(out, open("public/art/ai/ovals.json", "w"), separators=(",", ":"), sort_keys=True)
    print(len(out), "ovals -> public/art/ai/ovals.json")
