"""The toy theatre for Letter 1's opening shot (after Alice1's tools/proscenium.py).

theatre/proscenium and theatre/house: paper-tinted; the stage opening (flood-filled from its
centre) made transparent, everything else opaque. The title is lettered on the proscenium's blank
banner here (AI lettering is unreliable), in the game's font. Prints each opening in pixels, for
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


BANNER = (540, 122, 1000, 178)  # the banner's flat middle, source pixels (it is lightly hatched, not blank)


def cut(name, seed, title=None):
    src = Image.open(f"source/ai/theatre/{name}.png").convert("L")
    g = np.asarray(src, np.float32)
    hole, box = region(g, seed)
    print(f"{name}: opening x {box[0]}-{box[2]}, y {box[1]}-{box[3]} of {src.size}")
    alpha = Image.fromarray(((~hole) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgb = Image.fromarray((g[..., None] / 255 * PAPER).astype(np.uint8), "RGB")
    if title:
        x0, y0, x1, y1 = BANNER
        d = ImageDraw.Draw(rgb)
        size = 44
        font = ImageFont.truetype("public/fonts/IMFeENrm28P.ttf", size)
        while d.textlength(title, font=font) > (x1 - x0) * 0.8 and size > 12:
            size -= 1; font = ImageFont.truetype("public/fonts/IMFeENrm28P.ttf", size)
        # A paper halo keeps the letters clear of the hatching.
        d.text(((x0 + x1) / 2, (y0 + y1) / 2), title, font=font, fill=INK, anchor="mm", stroke_width=4, stroke_fill=tuple(int(v) for v in PAPER))
    out = rgb.convert("RGBA"); out.putalpha(alpha)
    out.save(f"public/art/ai/theatre/{name}.webp", quality=90, method=6)


if __name__ == "__main__":
    cut("proscenium", (768, 480), title="FRANKENSTEIN")
    cut("house", (768, 600))
