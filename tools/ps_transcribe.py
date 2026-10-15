"""Speech-to-text with word times, using PocketSphinx (its English model ships inside the pip
package, so nothing is downloaded from model hosts). Writes the same JSON as tools/transcribe.py
(faster-whisper), so tools/align.py and tools/narration.py work unchanged.

The recogniser is steered with a language model built from the section's own text
(tools/book_lm.py), so it mostly hears the book's words; book words missing from the
pronouncing dictionary are added (US spellings, prefixes and suffixes, or the nearest word).

Usage: python3 tools/ps_transcribe.py AUDIO.mp3 SECTION.txt OUT.json
Needs: pip install pocketsphinx; ffmpeg.
"""
import io
import json
import os
import re
import subprocess
import sys
import tempfile

import pocketsphinx
from pocketsphinx import Decoder, Segmenter

sys.path.insert(0, os.path.dirname(__file__))
from book_lm import arpa  # noqa: E402

MODEL = os.path.join(os.path.dirname(pocketsphinx.__file__), "model", "en-us")
SR = 16000


def load_dict():
    d = {}
    for line in open(os.path.join(MODEL, "cmudict-en-us.dict"), encoding="utf-8"):
        w, *ph = line.split()
        d.setdefault(w, " ".join(ph))
    return d


def guess(w, d):
    """Phones for a word the dictionary lacks."""
    for a, b in [("our", "or"), ("ise", "ize"), ("isation", "ization"), ("ll", "l"), ("gh", "g"), ("re", "er"), ("ogue", "og")]:
        if a in w and w.replace(a, b) in d:
            return d[w.replace(a, b)]
    for suf, ph in [("s", "Z"), ("es", "IH Z"), ("ed", "D"), ("d", "D"), ("ing", "IH NG"), ("ly", "L IY"), ("ness", "N AH S")]:
        if w.endswith(suf):
            base = w[: -len(suf)]
            for b in (base, base + "e"):
                if b in d:
                    return d[b] + " " + ph
                if len(b) > 3 and b not in d:
                    g = guess_compound(b, d)
                    if g:
                        return g + " " + ph
    g = guess_compound(w, d)
    if g:
        return g
    import difflib
    near = difflib.get_close_matches(w, [k for k in d if k[0] == w[0]], 1, 0.6)
    return d[near[0]] if near else None


def guess_compound(w, d):
    for i in range(2, len(w) - 1):
        a, b = w[:i], w[i:]
        if a in d and b in d and len(a) > 1 and len(b) > 2:
            return d[a] + " " + d[b]
    return None


def main():
    audio, text_file, out = sys.argv[1:4]
    text = open(text_file, encoding="utf-8").read()
    words = [w.lower() for w in re.findall(r"[A-Za-z']+", text.replace("_", ""))]
    words = [w.strip("'") for w in words if w.strip("'")]
    d = load_dict()
    tmp = tempfile.mkdtemp()
    # Every word in the language model must be in the dictionary.
    extra = {}
    for w in sorted(set(words)):
        if w not in d:
            ph = guess(w, d)
            if ph:
                extra[w] = ph
    vocab = set(w for w in words if w in d or w in extra)
    dic = os.path.join(tmp, "book.dict")
    with open(dic, "w") as f:
        for w in sorted(vocab):
            f.write(f"{w} {d.get(w) or extra[w]}\n")
    lm = os.path.join(tmp, "book.lm")
    open(lm, "w").write(arpa([[w for w in s if w in vocab] for s in sentences(text)]))
    print(f"{len(vocab)} words ({len(extra)} guessed)", file=sys.stderr)

    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    dec = Decoder(hmm=os.path.join(MODEL, "en-us"), lm=lm, dict=dic, loglevel="FATAL")
    segs = []
    for speech in Segmenter(sample_rate=SR).segment(io.BytesIO(pcm)):
        dec.start_utt()
        dec.process_raw(speech.pcm, full_utt=True)
        dec.end_utt()
        ws = []
        for s in dec.seg():
            if s.word.startswith("<") or s.word.startswith("[") or s.word == "<sil>":
                continue
            w = re.sub(r"\(\d+\)$", "", s.word)
            ws.append({"w": w, "s": round(speech.start_time + s.start_frame / 100, 2), "e": round(speech.start_time + (s.end_frame + 1) / 100, 2)})
        if ws:
            segs.append({"start": ws[0]["s"], "end": ws[-1]["e"], "text": " ".join(w["w"] for w in ws), "words": ws})
        print(f"\r{speech.end_time:7.1f} s", end="", file=sys.stderr)
    print(file=sys.stderr)
    json.dump(segs, open(out, "w"), indent=0)


def sentences(text):
    text = text.replace("_", "")
    for s in re.split(r"(?<=[.!?;:])\s+|\n\s*\n", text):
        ws = [w.lower().strip("'") for w in re.findall(r"[A-Za-z']+", s)]
        ws = [w for w in ws if w]
        if ws:
            yield ws


if __name__ == "__main__":
    main()
