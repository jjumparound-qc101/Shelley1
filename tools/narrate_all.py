"""Prepare every section whose LibriVox file has arrived and isn't done yet, several at a time.
The reading and the text are the 1818 edition (Gutenberg #41445): track 02-05 = Letters 1-4,
tracks 06-27 = Chapters 1-22 (numbered straight through the three volumes), tracks 28 + 29 =
Chapter 23 (29 starts at "Walton, in continuation").
Checked by transcribing the start of every track (2026-10-15).
Usage: python3 tools/narrate_all.py [AUDIO_DIR] [--jobs 6]"""
import glob
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

args = sys.argv[1:]
jobs = 6
if "--jobs" in args:
    k = args.index("--jobs")
    jobs = int(args[k + 1])
    del args[k:k + 2]
src = args[0] if args else "/mnt/project-files/sources/audio"


def tracks(sid):
    """Track numbers holding a section."""
    if sid.startswith("l"):
        return [int(sid[1:]) + 1]
    n = int(sid[2:])
    return [28, 29] if n == 23 else [n + 5]


def audio(sid):
    """The section's audio file; Chapter 23 joins its two tracks (cached in source/audio)."""
    fs = [f"{src}/frankenstein_{t:02d}_shelley.mp3" for t in tracks(sid)]
    if not all(os.path.exists(f) for f in fs):
        return None
    if len(fs) == 1:
        return fs[0]
    out = f"source/audio/{sid}_joined.mp3"
    if not os.path.exists(out):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"concat:{'|'.join(fs)}", "-c", "copy", out], check=True)
    return out


SECTIONS = [f"l{k:02d}" for k in range(1, 5)] + [f"ch{k:02d}" for k in range(1, 24)]
todo = [(s, audio(s)) for s in SECTIONS if audio(s) and not os.path.exists(f"public/data/{s}_words.json")]


def run(job):
    s, f = job
    r = subprocess.run([sys.executable, "tools/narration.py", s, f], capture_output=True, text=True)
    return (r.stdout.strip().splitlines() or [""])[-1] if r.returncode == 0 else f"FAILED {s}: {r.stderr[-400:]}"


with ThreadPoolExecutor(jobs) as ex:
    for line in ex.map(run, todo):
        print(line, flush=True)
