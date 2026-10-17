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

The 1831 edition (--edition 1831: Gutenberg #84, read by the LibriVox dramatic reading's cast)
uses the same section ids, so both readings share one staging: the game's ch01 is 1831 Chapters
1 + 2 together, and game chNN is 1831 Chapter NN+1. Its files go under a 1831/ folder in each of
source/text, source/audio, public/audio and public/data.

Usage: python3 tools/narration.py ID LIBRIVOX.mp3 [--lead 5] [--edition 1831]
       python3 tools/narration.py ID LIBRIVOX.mp3 --audio-only  (re-cut the audio only, keeping
       public/data/<id>_words.json and its trim, e.g. after changing MUTE)
Needs ffmpeg and pocketsphinx.
"""
import argparse
import json
import os
import re
import subprocess
import sys

BOOKS = {"1818": "source/text/pg41445.txt", "1831": "source/text/pg84.txt"}
SUB = {"1818": "", "1831": "1831/"}  # sub-folder of each edition's files
# Spans of the finished audio (seconds, lead included) to silence. The Letters' dates end
# "17—.", the year left blank on purpose, and the reader voices it "seventeen blank"; it is
# meant to go unspoken, so both words are muted (owner, 2026-10-16). The text keeps "17—.".
MUTE = {"1818": {"l01": [(10.25, 11.85)], "l02": [(9.77, 11.43)], "l03": [(8.60, 10.13)], "l04": [(8.50, 10.05)]},
        "1831": {}}
HERE = os.path.dirname(__file__)


def encode(sid, mp3, t0, t1, lead, ed="1818"):
    out = f"public/audio/{SUB[ed]}{sid}.mp3"
    af = f"afade=t=out:st={t1 - t0 - 1:.2f}:d=1,adelay={int(lead * 1000)}:all=1"
    for m0, m1 in MUTE[ed].get(sid, []):
        af += f",volume=enable='between(t,{m0},{m1})':volume=0"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.2f}", "-to", f"{t1:.2f}", "-i", mp3, "-ac", "1", "-ar", "22050", "-b:a", "32k",
                    "-af", af, out], check=True)
    return out


def section_text(sid, ed="1818"):
    if ed == "1831":
        return section_text_1831(sid)
    book = open(BOOKS[ed], encoding="utf-8").read().replace("\r\n", "\n")
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


def section_text_1831(sid):
    """A game section cut from #84: "Letter 1" / "Chapter 1" headings, chapters numbered 1-24."""
    book = open(BOOKS["1831"], encoding="utf-8").read().replace("\r\n", "\n")
    book = book[book.index("*** START"):book.index("*** END")]
    heads = list(re.finditer(r"\n(Letter|Chapter) (\d+)\n", book))  # the contents list is indented
    def body(kind, n):
        k = next(i for i, m in enumerate(heads) if m.group(1) == kind and int(m.group(2)) == n)
        end = heads[k + 1].start() if k + 1 < len(heads) else len(book)
        return book[heads[k].end():end].strip()
    if sid[0] == "l":
        text, heading = body("Letter", int(sid[1:])), f"Letter {int(sid[1:])}"
    else:
        n = int(sid[2:])
        text = body("Chapter", 1) + "\n\n" + body("Chapter", 2) if n == 1 else body("Chapter", n + 1)
        heading = "Chapters 1-2" if n == 1 else f"Chapter {n + 1}"
    text = re.split(r"\n\s*THE END\.", text)[0]
    text = re.sub(r"\n[ \t]*(\*[ \t]*){5}\n", "\n", text)
    return heading + "\n\n" + text.strip() + "\n"


def roman(r):
    v = {"I": 1, "V": 5, "X": 10}
    return sum(-v[c] if i + 1 < len(r) and v[c] < v[r[i + 1]] else v[c] for i, c in enumerate(r))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sid")
    ap.add_argument("mp3")
    ap.add_argument("--lead", type=float, default=5.0)
    ap.add_argument("--audio-only", action="store_true")
    ap.add_argument("--edition", choices=BOOKS, default="1818")
    ap.add_argument("--text-only", action="store_true", help="only cut the section text")
    a = ap.parse_args()
    ed, sub = a.edition, SUB[a.edition]
    data = f"public/data/{sub}{a.sid}_words.json"
    if a.audio_only:
        old = json.load(open(data))
        encode(a.sid, a.mp3, *old["trim"], old["lead_silence"], ed)
        return
    text = section_text(a.sid, ed)
    for d in ("source/text", "source/audio", "public/audio", "public/data"):
        os.makedirs(f"{d}/{sub}", exist_ok=True)
    txt = f"source/text/{sub}{a.sid}.txt"
    open(txt, "w", encoding="utf-8").write(text)
    if a.text_only:
        return
    ps = f"source/audio/{sub}{a.sid}_ps_words.json"
    if not os.path.exists(ps):
        subprocess.run([sys.executable, "-I", f"{HERE}/ps_transcribe.py", a.mp3, txt, ps], check=True)

    # The body: everything after the heading line ("Letter 1").
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if re.search(r"[A-Za-z]", p)]
    first = paras[1].replace("_", "").split("\n")[0].strip()[:20]
    last = paras[-1].split("\n")[-1].strip()[-12:]
    raw = f"source/audio/{sub}{a.sid}_raw_words.json"
    subprocess.run([sys.executable, f"{HERE}/align.py", txt, ps, "--from", first, "--to", last, "--out", raw], check=True)
    words = json.load(open(raw))
    flat = [w for p in words["paragraphs"] for w in p]
    t0 = max(0.0, flat[0]["s"] - 0.3)
    t1 = flat[-1]["e"] + 1.0
    dur = t1 - t0
    out = encode(a.sid, a.mp3, t0, t1, a.lead, ed)
    shift = a.lead - t0
    for p in words["paragraphs"]:
        for w in p:
            w["s"] = round(w["s"] + shift, 2)
            w["e"] = round(w["e"] + shift, 2)
    words["lead_silence"] = a.lead
    words["trim"] = [round(t0, 2), round(t1, 2)]
    json.dump(words, open(data, "w"), indent=0, ensure_ascii=False)
    os.remove(raw)
    print(f"{a.sid}: {words['matched']:.1%} matched, audio {t0:.1f}-{t1:.1f} s + {a.lead} s lead -> {out}")


if __name__ == "__main__":
    main()
