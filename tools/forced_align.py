"""Re-time a chapter's words against the narration itself, and mark words the reader skips.

tools/align.py borrows timings from the speech-to-text transcript; words it didn't hear are
spread evenly between their neighbours, so the highlight can drift. Here every book word is
lined up against the sound with a wav2vec2 speech model and CTC forced alignment (the model
says, frame by frame, which letter is being spoken; the book's letters are fitted to that).

A word counts as SKIPPED by the reader (the full-cast reading often drops "said Alice" and
the like) when both checks agree: the transcript didn't hear it, and the model finds almost
no evidence of its letters where it would have to be. Gutenberg's editorial note "[later
editions continued as follows" (Chapter X) is never read, so it always counts. Skipped words get "x": 1 in the words
file; the game dims them and the highlight passes over them.

Usage: python3 tools/forced_align.py N [N …]
  reads  public/audio/chNN.mp3, public/data/chNN_words.json, source/audio/chNN_whisper_words.json
  writes public/data/chNN_words.json (same format, re-timed, plus "x" on skipped words)
  model: wav2vec2-base-960h (ONNX export, huggingface.co/Xenova/wav2vec2-base-960h) in
         $W2V_DIR (default: models/w2v), files model.onnx and vocab.json
Requires NumPy, onnxruntime and ffmpeg.
"""
import difflib
import json
import os
import re
import subprocess
import sys

import numpy as np

SR = 16000
HOP = 320                 # samples per model frame (20 ms)
CHUNK, CTX = 20.0, 2.0    # seconds of audio per model run, and context kept on each side
SKIP_PROB = 0.15          # mean letter probability below which an unheard word counts as skipped
MODEL_DIR = os.environ.get("W2V_DIR", "models/w2v")


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def letters(s):
    return re.sub(r"[^A-Z']", "", s.upper().replace("’", "'"))


def load_audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32)


def emissions(audio, sess):
    """Log-probabilities per 20 ms frame for the whole chapter, run in overlapping chunks."""
    n = len(audio)
    frames = int(np.ceil(n / HOP))
    out = None
    step = int(CHUNK * SR)
    ctx = int(CTX * SR)
    for a in range(0, n, step):
        lo, hi = max(0, a - ctx), min(n, a + step + ctx)
        x = audio[lo:hi]
        x = (x - x.mean()) / (x.std() + 1e-7)
        logits = sess.run(None, {sess.get_inputs()[0].name: x[None, :].astype(np.float32)})[0][0]
        lp = logits - logits.max(1, keepdims=True)
        lp = lp - np.log(np.exp(lp).sum(1, keepdims=True))
        if out is None:
            out = np.full((frames, lp.shape[1]), -1e4, np.float32)
        f0 = (a - lo) // HOP
        keep = min(step // HOP, frames - a // HOP, lp.shape[0] - f0)
        out[a // HOP:a // HOP + keep] = lp[f0:f0 + keep]
    return out


def force_align(lp, tokens, blank=0):
    """CTC Viterbi: the frame span of each token (start, end inclusive) and its mean probability."""
    T, L = lp.shape[0], len(tokens)
    S = 2 * L + 1
    lab = np.full(S, blank)
    lab[1::2] = tokens
    # Transitions: stay, from s-1, or skip a blank from s-2 when the labels differ.
    can_skip = np.zeros(S, bool)
    can_skip[3::2] = np.array(tokens[1:]) != np.array(tokens[:-1])
    NEG = -1e9
    score = np.full(S, NEG)
    score[0] = lp[0, blank]
    if S > 1:
        score[1] = lp[0, lab[1]]
    back = np.zeros((T, S), np.int8)
    for t in range(1, T):
        stay = score
        prev1 = np.concatenate([[NEG], score[:-1]])
        prev2 = np.where(can_skip, np.concatenate([[NEG, NEG], score[:-2]]), NEG)
        stack = np.stack([stay, prev1, prev2])
        arg = stack.argmax(0)
        score = stack[arg, np.arange(S)] + lp[t, lab]
        back[t] = arg
    s = S - 1 if S < 2 or score[S - 1] >= score[S - 2] else S - 2
    path = np.empty(T, np.int64)
    for t in range(T - 1, -1, -1):
        path[t] = s
        s -= int(back[t, s])
    spans = [None] * L
    probs = [[] for _ in range(L)]
    for t, st in enumerate(path):
        if st % 2:
            k = st // 2
            spans[k] = (spans[k][0], t) if spans[k] else (t, t)
            probs[k].append(np.exp(lp[t, tokens[k]]))
    return spans, [float(np.mean(p)) if p else 0.0 for p in probs]


def heard_flags(words, whisper_path):
    """Which book words the speech-to-text transcript heard (same matching as align.py)."""
    subs, owner = [], []
    for i, w in enumerate(words):
        for part in re.split(r"[-—]+", w["t"]):
            if norm(part):
                subs.append(norm(part))
                owner.append(i)
    heard = [norm(p) for seg in json.load(open(whisper_path)) for w in seg["words"]
             for p in re.split(r"[-—]+", w["w"]) if norm(p)]
    flags = [False] * len(words)
    sm = difflib.SequenceMatcher(None, subs, heard, autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            flags[owner[blk.a + k]] = True
    return flags


def chapter(n, sess, vocab):
    nn = f"{n:02d}"
    path = f"public/data/ch{nn}_words.json"
    data = json.load(open(path))
    words = [w for p in data["paragraphs"] for w in p]
    heard = heard_flags(words, f"source/audio/ch{nn}_whisper_words.json")
    audio = load_audio(f"public/audio/ch{nn}.mp3")
    lp = emissions(audio, sess)
    total = lp.shape[0]
    sep = vocab["|"]

    # Gutenberg's editorial note (the verses it introduces are Carroll's, and are read).
    NOTE = ["[later", "editions", "continued", "as", "follows"]
    bracket = [False] * len(words)
    for k in range(len(words) - len(NOTE) + 1):
        if [w["t"] for w in words[k:k + len(NOTE)]] == NOTE:
            for j in range(k, k + len(NOTE)):
                bracket[j] = True
    stats = {"words": 0, "skipped": 0, "moved": []}
    # Each paragraph is aligned inside its own window; neighbouring windows meet in the
    # silence between paragraphs (by the current timings), so a paragraph can't borrow the
    # next speaker's words. Margins are at most 1.5 s.
    spans_p, base = [], 0
    for para in data["paragraphs"]:
        idx = list(range(base, base + len(para)))
        base += len(para)
        spoken = [i for i in idx if letters(words[i]["t"])]
        spans_p.append(spoken)
    firsts = [words[sp[0]]["s"] if sp else None for sp in spans_p]
    lasts = [words[sp[-1]]["e"] if sp else None for sp in spans_p]
    for pi, spoken in enumerate(spans_p):
        if not spoken:
            continue
        prev_e = next((lasts[q] for q in range(pi - 1, -1, -1) if lasts[q] is not None), None)
        next_s = next((firsts[q] for q in range(pi + 1, len(spans_p)) if firsts[q] is not None), None)
        lo = firsts[pi] - 1.5 if prev_e is None else max(firsts[pi] - 1.5, (prev_e + firsts[pi]) / 2)
        hi = lasts[pi] + 1.5 if next_s is None else min(lasts[pi] + 1.5, (lasts[pi] + next_s) / 2)
        f0 = max(0, int(lo * SR / HOP))
        f1 = min(total, int(hi * SR / HOP))
        tokens, owner = [], []
        for j, i in enumerate(spoken):
            if j:
                tokens.append(sep); owner.append(None)
            for ch in letters(words[i]["t"]):
                tokens.append(vocab[ch]); owner.append(i)
        if f1 - f0 < len(tokens) * 2:
            continue  # window too short to fit; keep the current timings
        spans, probs = force_align(lp[f0:f1], tokens)
        per = {}
        for k, i in enumerate(owner):
            if i is None or spans[k] is None:
                continue
            a, b = spans[k]
            s, e, p = per.get(i, (a, b, []))
            per[i] = (min(s, a), max(e, b), p + [probs[k]])
        for i in spoken:
            if i not in per:
                continue
            a, b, p = per[i]
            s, e = round((f0 + a) * HOP / SR, 2), round((f0 + b + 1) * HOP / SR, 2)
            if heard[i]:
                stats["moved"].append(abs(s - words[i]["s"]))
            words[i]["s"], words[i]["e"] = s, e
            words[i].pop("x", None)
            if bracket[i] or (not heard[i] and float(np.mean(p)) < SKIP_PROB):
                words[i]["x"] = 1
                stats["skipped"] += 1
            stats["words"] += 1
    # Punctuation-only tokens sit at the previous word's end.
    for k, w in enumerate(words):
        if not letters(w["t"]) and k:
            w["s"] = w["e"] = words[k - 1]["e"]
    data["source"]["timing"] = "wav2vec2-base-960h forced alignment (tools/forced_align.py)"
    json.dump(data, open(path, "w"), indent=0, ensure_ascii=False)
    m = np.array(stats["moved"]) if stats["moved"] else np.zeros(1)
    print(f"Chapter {n}: {stats['words']} words re-timed, {stats['skipped']} marked skipped; "
          f"heard words moved median {np.median(m):.2f}s, 95th pct {np.percentile(m, 95):.2f}s")


def main():
    import onnxruntime as ort
    sess = ort.InferenceSession(f"{MODEL_DIR}/model.onnx", providers=["CPUExecutionProvider"])
    vocab = json.load(open(f"{MODEL_DIR}/vocab.json"))
    for n in map(int, sys.argv[1:]):
        chapter(n, sess, vocab)


if __name__ == "__main__":
    main()
