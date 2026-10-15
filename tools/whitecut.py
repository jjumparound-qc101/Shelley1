"""Cut art drawn on a plain white background into a transparent PNG, tinted to our paper.

For the AI master drawings, which come on clean white (unlike the Tenniel scans,
which need tools/cutout.py). White that is connected to the image border becomes
transparent; white enclosed by ink lines (faces, aprons, leaf highlights) stays
as paper. Small gaps in the outline are sealed first so the fill can't leak in.

Usage:
  python3 tools/whitecut.py IN OUT.png [--crop x0,y0,x1,y1] [--seal 2] [--opaque] [--clear x,y;x,y]
--clear also makes the enclosed white regions at these points (source pixels) transparent,
e.g. the gaps between a lamp's chains.
--opaque keeps the whole image (no transparency) and only tints it, e.g. for the sky.
Requires Pillow, NumPy and SciPy.
"""
import argparse

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

PAPER = np.array([0xEF, 0xE9, 0xDA], dtype=np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--crop", default=None, help="x0,y0,x1,y1 in source pixels")
    ap.add_argument("--white", type=int, default=225, help="gray level above which a pixel counts as background")
    ap.add_argument("--seal", type=int, default=2, help="radius in pixels used to close gaps in outlines")
    ap.add_argument("--opaque", action="store_true")
    ap.add_argument("--clear", default=None, help="x,y;x,y points inside enclosed gaps to make transparent")
    a = ap.parse_args()

    img = Image.open(a.src).convert("L")
    if a.crop:
        img = img.crop(tuple(int(v) for v in a.crop.split(",")))
    g = np.asarray(img).astype(np.float32)

    # Paper tint: white becomes our paper colour, ink stays ink.
    rgb = (g[..., None] / 255.0) * PAPER

    if a.opaque:
        Image.fromarray(rgb.astype(np.uint8), "RGB").save(a.dst, optimize=True)
        print(f"{a.dst}: {img.size[0]}x{img.size[1]} (opaque)")
        return

    ink = g < a.white
    if a.seal > 0:
        r = a.seal
        disk = np.hypot(*np.mgrid[-r:r + 1, -r:r + 1]) <= r
        ink = ndi.binary_closing(ink, structure=disk, border_value=0)
    # Background = non-ink pixels connected to the border.
    lab, _ = ndi.label(~ink)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    clear = []
    if a.clear:
        x0, y0 = (int(v) for v in a.crop.split(",")[:2]) if a.crop else (0, 0)
        for pt in a.clear.split(";"):
            x, y = (int(v) for v in pt.split(","))
            clear.append(lab[y - y0, x - x0])
    keep = [v for v in list(border) + clear if v > 0]
    bg = np.isin(lab, keep)
    fg = ~bg
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))

    ys, xs = np.nonzero(fg)
    box = (max(0, xs.min() - 2), max(0, ys.min() - 2), min(fg.shape[1], xs.max() + 3), min(fg.shape[0], ys.max() + 3))
    out = Image.merge("RGBA", [Image.fromarray(rgb[..., i].astype(np.uint8)) for i in range(3)] + [alpha]).crop(box)
    out.save(a.dst, optimize=True)
    print(f"{a.dst}: {out.size[0]}x{out.size[1]}, figure covers {fg.mean():.1%}")


if __name__ == "__main__":
    main()
