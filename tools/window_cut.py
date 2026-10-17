"""Cuts the window panes out of Letter 1's back wall drawing (sets/walton_petersburgh/wall_back),
so the street (sets/walton_petersburgh/view) shows through them and Walton can look out.
Run: python3 tools/window_cut.py (reads source/ai/..., writes public/art/ai/...)."""
from PIL import Image, ImageDraw, ImageFilter, ImageMath

# The game's copies of the drawings are tinted to the paper colour (white -> warm paper); the
# source PNGs are not, so the same tint is applied here (measured from the game's other walls).
TINT = (0.9246, 0.9078, 0.8761)


def tint(im):
    return Image.merge("RGB", [ch.point(lambda v, k=k: round(v * k)) for ch, k in zip(im.split(), TINT)])


src = tint(Image.open("source/ai/sets/walton_petersburgh/wall_back.png").convert("RGB"))
W, H = src.size
grey = src.convert("L")
# The panes: light paper inside the window, each flood-filled from a point inside it.
mask = Image.new("L", (W, H), 0)
x0, x1, y0, y1 = int(W * 316 / 768), int(W * 455 / 768), int(H * 45 / 512), int(H * 360 / 512)
for y in range(y0, y1):
    for x in range(x0, x1):
        if grey.getpixel((x, y)) > 185:
            mask.putpixel((x, y), 255)
mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # drop specks
alpha = Image.eval(mask, lambda v: 255 - v)
out = src.convert("RGBA"); out.putalpha(alpha)
out = out.resize((1280, 853), Image.LANCZOS)
out.save("public/art/ai/sets/walton_petersburgh/wall_back.webp", quality=90, method=6)
bb = mask.getbbox(); print("panes px", bb, "of", (W, H))

# The street drawing came with its own window frame, curtains and sill; keep only the view
# between the curtains and above the sill (its two glazing bars stay, behind the wall's own).
v = tint(Image.open("source/ai/sets/walton_petersburgh/view.png").convert("RGB"))
vw, vh = v.size
v = v.crop((int(vw * 0.085), 0, int(vw * 0.915), int(vh * 0.885))).resize((1062, 755), Image.LANCZOS)
v.save("public/art/ai/sets/walton_petersburgh/view.webp", quality=90, method=6)
print("view", v.size)
