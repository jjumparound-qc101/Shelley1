"""Cut a figure out of a Tenniel engraving scan into a transparent PNG.

Engravings are black ink on white paper, and a figure's interior is often white
too, so plain "white = transparent" would punch holes in it. Instead:
  1. drop light page show-through (text printed on the other side of the leaf),
  2. close small gaps in the ink outline,
  3. fill the closed outline to get the figure's silhouette,
  4. keep the largest silhouette,
  5. feather the edge.
With --poly, the hand-traced polygon is the silhouette and steps 2–4 are skipped.

Usage:
  python3 tools/cutout.py IN.jpg OUT.png [--scale 3] [--close 4] [--poly POLY.json]
POLY.json is a hand-traced keep-polygon, [[x, y], ...] in the input image's pixels.
Use it where the figure touches scenery (grass, furniture) that the fill would swallow.
--spot SPOT.json adds spot color where the text names one (docs/COLOR.md):
  [{"ellipse": [cx, cy, rx, ry], "color": "#d9849a", "why": "pink eyes"}, ...] in input pixels.
  The color multiplies the engraving, so ink lines stay dark and the paper takes the color.
  Add "over": 0..1 to let the color sit on top of the ink instead: lines keep that fraction of
  the color's brightness (e.g. 0.4), so the spot reads richer while the line work still shows.
Requires Pillow, NumPy and SciPy.
"""
import argparse

import json

import numpy as np

from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--scale", type=float, default=3.0, help="upscale factor before processing")
    ap.add_argument("--ink", type=int, default=120, help="gray level below which a pixel is ink")
    ap.add_argument("--paper", type=int, default=175, help="gray level above which a pixel is paper")
    ap.add_argument("--close", type=int, default=4, help="gap-closing radius, in input pixels")
    ap.add_argument("--poly", default=None, help="JSON keep-polygon in input pixels")
    ap.add_argument("--spot", default=None, help="JSON list of spot-color ellipses in input pixels")
    a = ap.parse_args()

    img = Image.open(a.src).convert("L")
    w, h = img.size
    big = img.resize((round(w * a.scale), round(h * a.scale)), Image.LANCZOS)
    g = np.asarray(big).astype(np.float32)

    # 1. Push show-through to white; keep the engraving's line weights.
    clean = np.clip((g - 20) / (a.paper - 20), 0, 1) * 255

    if a.poly:
        pts = [(x * a.scale, y * a.scale) for x, y in json.load(open(a.poly))]
        m = Image.new("L", big.size, 0)
        ImageDraw.Draw(m).polygon(pts, fill=255)
        sil = np.asarray(m) > 0
    else:
        # 2–3. Close the outline and fill it.
        ink = g < a.ink
        r = max(1, int(a.close * a.scale))
        disk = np.hypot(*np.mgrid[-r:r + 1, -r:r + 1]) <= r
        small = disk[::2, ::2] if r > 2 else disk
        closed = ndi.binary_closing(ink, structure=disk, iterations=1, border_value=0)
        filled = ndi.binary_fill_holes(ndi.binary_dilation(closed, structure=small))

        # 4. Largest component only.
        lab, n = ndi.label(filled)
        if n == 0:
            raise SystemExit("no figure found; try a higher --ink or --close")
        sizes = ndi.sum(filled, lab, range(1, n + 1))
        sil = ndi.binary_erosion(lab == (1 + int(np.argmax(sizes))), structure=small)

    # 5. Feather.
    alpha = Image.fromarray((sil * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(a.scale * 0.6))

    rgb = np.stack([clean] * 3, axis=-1)
    if a.spot:
        for spot in json.load(open(a.spot)):
            cx, cy, rx, ry = (v * a.scale for v in spot["ellipse"])
            m = Image.new("L", big.size, 0)
            ImageDraw.Draw(m).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
            k = np.asarray(m.filter(ImageFilter.GaussianBlur(a.scale)), dtype=np.float32)[..., None] / 255
            tint = np.array([int(spot["color"][i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)
            over = spot.get("over")
            colored = rgb * tint / 255 if over is None else tint * (over + (1 - over) * rgb / 255)
            rgb = rgb * (1 - k) + colored * k

    ys, xs = np.nonzero(sil)
    box = (max(0, xs.min() - 4), max(0, ys.min() - 4), min(sil.shape[1], xs.max() + 5), min(sil.shape[0], ys.max() + 5))
    rgba = Image.merge("RGBA", [Image.fromarray(rgb[..., i].astype(np.uint8)) for i in range(3)] + [alpha]).crop(box)
    rgba.save(a.dst, optimize=True)
    print(f"{a.dst}: {rgba.size[0]}x{rgba.size[1]}, figure covers {sil.mean():.1%} of the frame")


if __name__ == "__main__":
    main()
