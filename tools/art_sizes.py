"""Write public/art/ai/sizes.json: the pixel size of every drawing in public/art/ai/index.json.
The game needs each drawing's shape before it loads the picture (it loads them per section).
tools/gen_batch.py approve runs this; run it by hand after adding or replacing art.
Usage: python3 tools/art_sizes.py"""
import json
import os

from PIL import Image

index = json.load(open("public/art/ai/index.json"))
sizes = {}
for n in index:
    f = f"public/art/ai/{n}.webp"
    if os.path.exists(f):
        sizes[n] = list(Image.open(f).size)
json.dump(sizes, open("public/art/ai/sizes.json", "w"), separators=(",", ":"), sort_keys=True)
print(f"{len(sizes)} sizes")
