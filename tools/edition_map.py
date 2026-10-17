"""Map the 1818 text onto the 1831 text, word by word, so one staging plays both readings.

The staging (src/scenes/data/<id>.js, Letter 1 in src/scenes/letter1.js) is keyed to words of
the 1818 text. For each section this writes public/data/1831/<id>_map.json:
  ref: the 1818 section's words, as paragraphs (what the cues are matched against)
  n:   how many words the 1831 section has (cues.js refuses a map made for other words)
  to:  for every 1818 word, the index of the matching word in the 1831 section's word list
       (public/data/1831/<id>_words.json, flattened). The words of a passage the 1831 text
       rewrote are spread evenly over the 1831 passage that replaced it, so cues there keep
       their order and stay inside their scene.
src/cues.js uses it to resolve each cue in the 1831 reading. Rerun after re-narrating either
edition. Words come from the aligned <id>_words.json when it exists, else from the section text.
Usage: python3 tools/edition_map.py [ID ...]   (default: every section)
"""
import difflib
import json
import os
import re
import sys

SECTIONS = [f"l{k:02d}" for k in range(1, 5)] + [f"ch{k:02d}" for k in range(1, 24)]


def paragraphs(sub, sid):
    """A section's words as paragraphs, the same split as tools/align.py and the words files."""
    f = f"public/data/{sub}{sid}_words.json"
    if os.path.exists(f):
        return [[w["t"] for w in p] for p in json.load(open(f, encoding="utf-8"))["paragraphs"]]
    text = open(f"source/text/{sub}{sid}.txt", encoding="utf-8").read().replace("_", "")
    paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", text)]
    return [p.split(" ") for p in paras if re.search(r"[A-Za-z]", p)][1:]  # [1:]: the heading


def norm(t):
    return re.sub(r"[^\w-]", "", t.lower().replace("_", ""))


def build(sid):
    ref = paragraphs("", sid)
    a = [norm(t) for p in ref for t in p]
    b = [norm(t) for p in paragraphs("1831/", sid) for t in p]
    to = [-1] * len(a)
    blocks = difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks()
    for i, j, n in blocks:
        for k in range(n):
            to[i + k] = j + k
    i = 0
    while i < len(a):  # spread each unmatched run over the gap between its matched neighbours
        if to[i] >= 0:
            i += 1
            continue
        j = i
        while j < len(a) and to[j] < 0:
            j += 1
        lo = to[i - 1] + 1 if i else 0
        hi = to[j] - 1 if j < len(a) else len(b) - 1
        for k in range(i, j):
            to[k] = min(len(b) - 1, max(0, round(lo + (hi - lo) * (k - i + 0.5) / (j - i)) if hi >= lo else lo))
        i = j
    matched = sum(n for _, _, n in blocks) / max(1, len(a))
    os.makedirs("public/data/1831", exist_ok=True)
    json.dump({"n": len(b), "ref": ref, "to": to}, open(f"public/data/1831/{sid}_map.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return matched


if __name__ == "__main__":
    for sid in sys.argv[1:] or SECTIONS:
        print(f"{sid}: {build(sid):.1%} of the 1818 words found in the 1831 text")
