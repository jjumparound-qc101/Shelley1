"""Ask a vision model a yes/no question about many drawings, to find ones that need redoing.

  python3 tools/check_art.py creature [--group "Thought vignettes"]   which pictures show the Creature
  python3 tools/check_art.py people   [--walls]                       which set walls have people drawn in

Prints one name per line for each "yes" and writes the list to source/ai/review/check_<question>.txt.
Uses the OpenAI API (key supplied by the environment's proxy or OPENAI_API_KEY).
"""
import argparse
import base64
import io
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

QUESTIONS = {
    "creature": "This is an engraving for Frankenstein. Does it show Frankenstein's Creature himself (a huge, "
                "monstrous or scarred man, unnaturally gaunt, or with stitches), even small or in shadow? "
                "Answer only yes or no.",
    "people": "This is meant to be an empty stage backdrop (a wall, room or view). Are any people or human "
              "figures drawn in it? Portraits, statues and figures in paintings on the wall do not count. "
              "Answer only yes or no.",
}


def ask(file, question, model):
    im = Image.open(f"source/ai/{file}.png").convert("RGB")
    im.thumbnail((512, 512))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=80)
    url = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    body = {"model": model, "max_tokens": 3, "messages": [{"role": "user", "content": [
        {"type": "text", "text": QUESTIONS[question]},
        {"type": "image_url", "image_url": {"url": url, "detail": "low"}}]}]}
    for _ in range(4):
        out = subprocess.run(["curl", "-sS", "https://api.openai.com/v1/chat/completions",
                              "-H", f"Authorization: Bearer {os.environ.get('OPENAI_API_KEY', '')}",
                              "-H", "Content-Type: application/json", "-d", "@-"],
                             input=json.dumps(body), capture_output=True, text=True)
        try:
            return json.loads(out.stdout)["choices"][0]["message"]["content"].strip().lower().startswith("yes")
        except (KeyError, ValueError, IndexError):
            continue
    print(f"{file}: no answer", file=sys.stderr)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("question", choices=QUESTIONS)
    ap.add_argument("--group", default=None)
    ap.add_argument("--walls", action="store_true", help="only set walls (wall_back, wall_left, wall_right)")
    ap.add_argument("--model", default="gpt-4.1-mini")
    a = ap.parse_args()
    m = json.load(open("assets/manifest.json"))
    files = [e["file"] for e in m["entries"]
             if (not a.group or e["group"] == a.group) and (not a.walls or e["file"].split("/")[-1].startswith("wall_"))
             and os.path.exists(f"source/ai/{e['file']}.png")]
    with ThreadPoolExecutor(8) as ex:
        yes = [f for f, y in zip(files, ex.map(lambda f: ask(f, a.question, a.model), files)) if y]
    os.makedirs("source/ai/review", exist_ok=True)
    open(f"source/ai/review/check_{a.question}.txt", "w").write("\n".join(yes) + "\n")
    print("\n".join(yes))
    print(f"{len(yes)} of {len(files)}", file=sys.stderr)


if __name__ == "__main__":
    main()
