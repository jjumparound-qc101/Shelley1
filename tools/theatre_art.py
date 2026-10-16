"""The toy theatre for Letter 1's opening shot (after Alice1's tools/proscenium.py).

theatre/proscenium and theatre/house: paper-tinted; the stage opening (flood-filled from its
centre) made transparent, everything else opaque. The title is lettered on the proscenium's blank
blank sign here (AI lettering is unreliable), in the game's font. Prints each opening in pixels, for
src/theatre.js. theatre/seats is cut out from white by the normal approve path already.

Usage: python3 tools/theatre_art.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

PAPER = np.array([0xEF, 0xE9, 0xDA], np.float32)
INK = (0x17, 0x14, 0x0F)


def region(g, seed):
    ink = Image.fromarray(((g < 225) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    ImageDraw.floodfill(ink, seed, 128)
    hole = np.asarray(ink) == 128
    ys, xs = np.nonzero(hole)
    return hole, (xs.min(), ys.min(), xs.max(), ys.max())


def cut(name, seed, title=None, sign_seed=None, corners=()):
    src = Image.open(f"source/ai/theatre/{name}.png").convert("L")
    g = np.asarray(src, np.float32)
    hole, box = region(g, seed)
    print(f"{name}: opening x {box[0]}-{box[2]}, y {box[1]}-{box[3]} of {src.size}")
    for c in corners:  # plain paper outside the drawing (the toy front's top corners), cut away too
        if g[c[1], c[0]] > 225: hole = hole | region(g, c)[0]
    alpha = Image.fromarray(((~hole) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgb = Image.fromarray((g[..., None] / 255 * PAPER).astype(np.uint8), "RGB")
    if title:
        # The blank cartouche (flood-filled from its centre): the title spaced out on one line,
        # the subtitle in italic beneath, both centred in it.
        _, (x0, y0, x1, y1) = region(g, sign_seed)
        print(f"{name}: sign x {x0}-{x1}, y {y0}-{y1}")
        d = ImageDraw.Draw(rgb)
        main, sub = title
        def spaced(text, font, track):
            return sum(d.textlength(c, font=font) for c in text) + track * (len(text) - 1)
        size = 64
        while True:
            font = ImageFont.truetype("public/fonts/IMFeENrm28P.ttf", size); track = size * 0.18
            if spaced(main, font, track) <= (x1 - x0) * 0.86 and size * 1.85 <= (y1 - y0) or size < 14: break
            size -= 1
        cy = y0 + (y1 - y0) * 0.42
        x = (x0 + x1) / 2 - spaced(main, font, track) / 2
        for c in main:
            d.text((x, cy), c, font=font, fill=INK, anchor="lm"); x += d.textlength(c, font=font) + track
        it = ImageFont.truetype("public/fonts/IMFeENit28P.ttf", round(size * 0.45))
        d.text(((x0 + x1) / 2, y0 + (y1 - y0) * 0.78), sub, font=it, fill=INK, anchor="mm")
    out = rgb.convert("RGBA"); out.putalpha(alpha)
    out.save(f"public/art/ai/theatre/{name}.webp", quality=90, method=6)


if __name__ == "__main__":
    cut("proscenium", (768, 480), title=("FRANKENSTEIN", "or, The Modern Prometheus"), sign_seed=(768, 160), corners=((4, 4), (1531, 4), (180, 40), (1356, 40), (300, 60), (1236, 60)))
    cut("house", (768, 535))
