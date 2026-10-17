"""Prepare every section whose LibriVox file has arrived and isn't done yet, several at a time.
The reading and the text are the 1818 edition (Gutenberg #41445): track 02-05 = Letters 1-4,
tracks 06-27 = Chapters 1-22 (numbered straight through the three volumes), tracks 28 + 29 =
Chapter 23 (29 starts at "Walton, in continuation").
Checked by transcribing the start of every track (2026-10-15).
--edition 1831: the LibriVox dramatic reading (Gutenberg #84; frankenstein_1210_librivox), whose
tracks are 01 = Letters 1-3, 02 = Letter 4, 03 + 04 = the game's Chapter 1 (1831 Chapters 1-2),
05-26 = the game's Chapters 2-23 (1831 Chapters 3-24). Then run tools/edition_map.py.
Usage: python3 tools/narrate_all.py [AUDIO_DIR] [--jobs 6] [--edition 1831]"""
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
edition = "1818"
if "--edition" in args:
    k = args.index("--edition")
    edition = args[k + 1]
    del args[k:k + 2]
sub = "" if edition == "1818" else "1831/"
src = args[0] if args else "/mnt/project-files/sources/audio" + ("" if edition == "1818" else "_dramatic")


def tracks(sid):
    """Track numbers holding a section."""
    if edition == "1831":
        if sid.startswith("l"):
            return [1] if sid != "l04" else [2]
        n = int(sid[2:])
        return [3, 4] if n == 1 else [n + 3]
    if sid.startswith("l"):
        return [int(sid[1:]) + 1]
    n = int(sid[2:])
    return [28, 29] if n == 23 else [n + 5]


def audio(sid):
    """The section's audio file; Chapter 23 joins its two tracks (cached in source/audio)."""
    fs = [f"{src}/frankenstein_{t:02d}_shelley{'_64kb' if edition == '1831' and not os.path.exists(f'{src}/frankenstein_{t:02d}_shelley.mp3') else ''}.mp3" for t in tracks(sid)]
    if not all(os.path.exists(f) for f in fs):
        return None
    if len(fs) == 1:
        return fs[0]
    out = f"source/audio/{sub}{sid}_joined.mp3"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if not os.path.exists(out):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"concat:{'|'.join(fs)}", "-c", "copy", out], check=True)
    return out


SECTIONS = [f"l{k:02d}" for k in range(1, 5)] + [f"ch{k:02d}" for k in range(1, 24)]
todo = [(s, audio(s)) for s in SECTIONS if audio(s) and not os.path.exists(f"public/data/{sub}{s}_words.json")]


def run(job):
    s, f = job
    r = subprocess.run([sys.executable, "tools/narration.py", s, f, "--edition", edition], capture_output=True, text=True)
    return (r.stdout.strip().splitlines() or [""])[-1] if r.returncode == 0 else f"FAILED {s}: {r.stderr[-400:]}"


with ThreadPoolExecutor(jobs) as ex:
    for line in ex.map(run, todo):
        print(line, flush=True)
