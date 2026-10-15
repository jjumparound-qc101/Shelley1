"""Prepare one section's narration for the game: text, word timings and trimmed audio.

  1. Cut the section's text out of Project Gutenberg #41445, the 1818 edition that Cori Samuel
     reads -> source/text/<id>.txt (ids: l01-l04 for the Letters; ch01-ch23 for the Chapters,
     numbered straight through the three volumes: Vol. I = ch01-07, II = ch08-16, III = ch17-23)
  2. Transcribe the LibriVox file with word times (tools/ps_transcribe.py, PocketSphinx)
     -> source/audio/<id>_ps_words.json (skipped if it exists)
  3. Align the book text to it (tools/align.py)
  4. Trim the audio from just before the section's first word (dropping the LibriVox
     intro and the spoken section title) to just after its last, with a 1 s fade-out,
     and put LEAD seconds of quiet in front (the hold in the theatre seat); mono 32 kbps
     -> public/audio/<id>.mp3, and re-time the words to it -> public/data/<id>_words.json

Usage: python3 tools/narration.py ID LIBRIVOX.mp3 [--lead 5]
Needs ffmpeg and pocketsphinx.
"""
import argparse
import json
import os
import re
import subprocess
import sys

BOOK = "source/text/pg41445.txt"
HERE = os.path.dirname(__file__)


def section_text(sid):
    book = open(BOOK, encoding="utf-8").read().replace("\r\n", "\n")
    book = book[book.index("*** START"):book.index("*** END")]
    heads = list(re.finditer(r"\n(LETTER|CHAPTER) ([IVX]+)\.\n", book))
    ids, ch = [], 0
    for m in heads:
        if m.group(1) == "LETTER":
            ids.append(f"l{roman(m.group(2)):02d}")
        else:
            ch += 1
            ids.append(f"ch{ch:02d}")
    k = ids.index(sid)
    end = heads[k + 1].start() if k + 1 < len(heads) else len(book)
    text = book[heads[k].start():end]
    text = re.split(r"\n\s*END OF VOL\.|\n\s*FRANKENSTEIN;\n|\n\s*THE END\.", text)[0]  # title pages, the end
    text = re.sub(r"\n[ \t]*(\*[ \t]*){5}\n", "\n", text)  # the row of stars between letters
    heading = f"{'Letter' if sid[0] == 'l' else 'Chapter'} {int(sid[-2:])}"
    return heading + "\n\n" + text.strip().split("\n", 1)[1].strip() + "\n"


def roman(r):
    v = {"I": 1, "V": 5, "X": 10}
    return sum(-v[c] if i + 1 < len(r) and v[c] < v[r[i + 1]] else v[c] for i, c in enumerate(r))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sid")
    ap.add_argument("mp3")
    ap.add_argument("--lead", type=float, default=5.0)
    a = ap.parse_args()
    text = section_text(a.sid)
    txt = f"source/text/{a.sid}.txt"
    open(txt, "w", encoding="utf-8").write(text)
    ps = f"source/audio/{a.sid}_ps_words.json"
    if not os.path.exists(ps):
        subprocess.run([sys.executable, "-I", f"{HERE}/ps_transcribe.py", a.mp3, txt, ps], check=True)

    # The body: everything after the heading line ("Letter 1").
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if re.search(r"[A-Za-z]", p)]
    first = paras[1].replace("_", "").split("\n")[0].strip()[:20]
    last = paras[-1].split("\n")[-1].strip()[-12:]
    raw = f"source/audio/{a.sid}_raw_words.json"
    subprocess.run([sys.executable, f"{HERE}/align.py", txt, ps, "--from", first, "--to", last, "--out", raw], check=True)
    words = json.load(open(raw))
    flat = [w for p in words["paragraphs"] for w in p]
    t0 = max(0.0, flat[0]["s"] - 0.3)
    t1 = flat[-1]["e"] + 1.0
    dur = t1 - t0
    os.makedirs("public/audio", exist_ok=True)
    os.makedirs("public/data", exist_ok=True)
    out = f"public/audio/{a.sid}.mp3"
    lead_ms = int(a.lead * 1000)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.2f}", "-to", f"{t1:.2f}", "-i", a.mp3, "-ac", "1", "-ar", "22050", "-b:a", "32k",
                    "-af", f"afade=t=out:st={dur - 1:.2f}:d=1,adelay={lead_ms}:all=1", out], check=True)
    shift = a.lead - t0
    for p in words["paragraphs"]:
        for w in p:
            w["s"] = round(w["s"] + shift, 2)
            w["e"] = round(w["e"] + shift, 2)
    words["lead_silence"] = a.lead
    words["trim"] = [round(t0, 2), round(t1, 2)]
    json.dump(words, open(f"public/data/{a.sid}_words.json", "w"), indent=0, ensure_ascii=False)
    os.remove(raw)
    print(f"{a.sid}: {words['matched']:.1%} matched, audio {t0:.1f}-{t1:.1f} s + {a.lead} s lead -> {out}")


if __name__ == "__main__":
    main()
