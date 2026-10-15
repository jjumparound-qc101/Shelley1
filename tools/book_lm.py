"""A small trigram language model (ARPA text) built from the book's own sentences, so the
speech recogniser (tools/ps_transcribe.py) expects the words actually read.
Absolute discounting with back-off; good enough to steer recognition, not a general model."""
import math
from collections import Counter, defaultdict

D = 0.5


def arpa(sentences):
    grams = [Counter(), Counter(), Counter()]
    for s in sentences:
        toks = ["<s>"] + s + ["</s>"]
        for n in range(3):
            for i in range(len(toks) - n):
                grams[n][tuple(toks[i:i + n + 1])] += 1
    total = sum(c for g, c in grams[0].items() if g != ("<s>",))
    lp = lambda p: round(math.log10(max(p, 1e-9)), 4)
    # Unigrams: plain relative frequency, mixed with a little uniform mass.
    V = len(grams[0])
    p1 = {g: 0.9 * c / total + 0.1 / V for g, c in grams[0].items()}
    p1[("<s>",)] = 1e-9
    # Higher orders: absolute discounting; back-off weight = left-over mass.
    def higher(n):
        ctx_tot, ctx_types = Counter(), Counter()
        for g, c in grams[n].items():
            ctx_tot[g[:-1]] += c
            ctx_types[g[:-1]] += 1
        p = {g: (c - D) / ctx_tot[g[:-1]] for g, c in grams[n].items()}
        bo = {ctx: D * ctx_types[ctx] / ctx_tot[ctx] for ctx in ctx_tot}
        return p, bo
    p2, bo1 = higher(1)
    p3, bo2 = higher(2)
    out = ["\\data\\", f"ngram 1={len(p1)}", f"ngram 2={len(p2)}", f"ngram 3={len(p3)}", "", "\\1-grams:"]
    for g, p in sorted(p1.items()):
        out.append(f"{lp(p)} {g[0]} {lp(bo1.get(g, 1))}")
    out += ["", "\\2-grams:"]
    for g, p in sorted(p2.items()):
        out.append(f"{lp(p)} {' '.join(g)} {lp(bo2.get(g, 1))}")
    out += ["", "\\3-grams:"]
    for g, p in sorted(p3.items()):
        out.append(f"{lp(p)} {' '.join(g)}")
    out += ["", "\\end\\", ""]
    return "\n".join(out)
