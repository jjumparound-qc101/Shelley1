"""Prepare every section whose LibriVox file has arrived and isn't done yet, several at a time.
LibriVox track NN (frankenstein_NN_shelley.mp3) is section NN-1: 02-05 = Letters 1-4, 06-29 = Chapters 1-24.
Usage: python3 tools/narrate_all.py [AUDIO_DIR] [--jobs 6]"""
import glob
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

src = next((a for a in sys.argv[1:] if not a.startswith("--")), "/mnt/project-files/sources/audio")
jobs = int(sys.argv[sys.argv.index("--jobs") + 1]) if "--jobs" in sys.argv else 6


def sid(nn):
    k = nn - 1
    return f"l{k:02d}" if k <= 4 else f"ch{k - 4:02d}"


todo = []
for f in sorted(glob.glob(f"{src}/frankenstein_*_shelley.mp3")):
    nn = int(re.search(r"_(\d+)_shelley", f).group(1))
    if nn >= 2 and not os.path.exists(f"public/data/{sid(nn)}_words.json"):
        todo.append((sid(nn), f))


def run(job):
    s, f = job
    r = subprocess.run([sys.executable, "tools/narration.py", s, f], capture_output=True, text=True)
    return (r.stdout.strip().splitlines() or [""])[-1] if r.returncode == 0 else f"FAILED {s}: {r.stderr[-400:]}"


with ThreadPoolExecutor(jobs) as ex:
    for line in ex.map(run, todo):
        print(line, flush=True)
