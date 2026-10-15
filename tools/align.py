"""Align the book text to the narration so every word gets a start/end time.

Speech-to-text drops or mishears words, so we use the book (Project Gutenberg #11)
as the source of truth and borrow timings from the transcript wherever the words
match. Unmatched book words are interpolated between their matched neighbours.

Usage:
  python3 tools/align.py source/text/ch01.txt source/audio/ch01_whisper_words.json \
      --from "Alice was beginning" --to "get out again." --offset 14.0 \
      --out public/data/ch01_slice_words.json
"""
import argparse
import difflib
import json
import re


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def clean_book(text):
    text = text.replace("_", "")  # Gutenberg italics markers
    return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("book")
    ap.add_argument("whisper")
    ap.add_argument("--from", dest="start", required=True)
    ap.add_argument("--to", dest="end", required=True)
    ap.add_argument("--offset", type=float, default=0.0, help="seconds trimmed from the audio start")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    book = clean_book(open(a.book, encoding="utf-8").read())
    i = book.index(a.start)
    j = book.index(a.end, i) + len(a.end)
    paragraphs = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", book[i:j]) if p.strip()]
    paragraphs = [p for p in paragraphs if norm(p)]  # drop "* * *" section-break lines

    # Display words, each split into alignment sub-tokens (hyphens and dashes split words).
    display = []  # (paragraph index, text, [subtoken indices])
    subs = []
    for pi, p in enumerate(paragraphs):
        for w in p.split(" "):
            idx = []
            for part in re.split(r"[-—]+", w):
                if norm(part):
                    idx.append(len(subs))
                    subs.append(norm(part))
            display.append((pi, w, idx))

    heard = []
    for seg in json.load(open(a.whisper)):
        for w in seg["words"]:
            for part in re.split(r"[-—]+", w["w"]):
                if norm(part):
                    heard.append((norm(part), w["s"], w["e"]))

    sm = difflib.SequenceMatcher(None, subs, [h[0] for h in heard], autojunk=False)
    times = [None] * len(subs)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            _, s, e = heard[blk.b + k]
            times[blk.a + k] = (s, e)

    matched = sum(t is not None for t in times)
    # Interpolate gaps linearly between matched neighbours.
    k = 0
    while k < len(times):
        if times[k] is not None:
            k += 1
            continue
        g = k
        while g < len(times) and times[g] is None:
            g += 1
        left = times[k - 1][1] if k > 0 else (times[g][0] if g < len(times) else 0.0)
        right = times[g][0] if g < len(times) else left + 0.3 * (g - k)
        step = (right - left) / (g - k)
        for n in range(k, g):
            times[n] = (left + step * (n - k), left + step * (n - k + 1))
        k = g

    out = {"source": {"book": a.book, "transcript": a.whisper}, "matched": round(matched / len(subs), 3),
           "paragraphs": [[] for _ in paragraphs]}
    for pi, w, idx in display:
        if idx:
            s, e = times[idx[0]][0], times[idx[-1]][1]
        else:  # pure punctuation token; attach to previous word's end
            prev = out["paragraphs"][pi][-1] if out["paragraphs"][pi] else None
            s = e = prev["e"] if prev else 0.0
        out["paragraphs"][pi].append({"t": w, "s": round(s - a.offset, 2), "e": round(e - a.offset, 2)})

    json.dump(out, open(a.out, "w"), indent=0, ensure_ascii=False)
    print(f"{len(display)} words, {out['matched']:.1%} matched directly, {len(paragraphs)} paragraphs -> {a.out}")


if __name__ == "__main__":
    main()
