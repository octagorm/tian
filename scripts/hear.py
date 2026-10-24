# /// script
# requires-python = ">=3.11"
# dependencies = ["google-genai>=2.25"]
# ///
"""Listens to the words' recordings with Gemini and names those that do
not sound like their pinyin: another syllable (只 as zhī), an r of erhua
where there is none (哪 as nǎr), or another tone.

    node scripts/speech.ts > .cache/speech.json
    uv run scripts/hear.py .cache/speech.json             # single characters
    uv run scripts/hear.py .cache/speech.json --all       # every word
    uv run scripts/hear.py .cache/speech.json --only 哪,那

The model hears each recording without being told what it is, and writes
the pinyin it hears. A recording that sounds off is heard a second time,
and named only when both hearings find it off. The model's ear for tones
is not perfect, so what it names is for listening to, not a verdict; make
one again with `audio.py --remake <word>`. Answers are kept in
.cache/heard.json by the recording's content, so a run picks up where it
stopped and a recording made again is heard again.

Needs GEMINI_API_KEY, found as audio.py finds it.
"""

import argparse
import concurrent.futures
import hashlib
import json
import sys
import threading
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audio import OUT, file_id, load_env, load_list  # noqa: E402

HEARD = Path(__file__).resolve().parent.parent / ".cache" / "heard.json"
PROMPT = (
    "This is a recording of one Mandarin Chinese word, one or more syllables, "
    "read by a teacher. Write exactly what is said, in pinyin with tone marks, "
    "one syllable to a space-separated piece, with no mark for a neutral tone. "
    "If a syllable is rhotacized (erhua), end it with r. Write what you hear, "
    "not what the word is likely to be."
)


def toneless(pinyin: str) -> str:
    plain = unicodedata.normalize("NFD", pinyin.lower().replace("ü", "v"))
    return "".join(c for c in plain if not unicodedata.combining(c)).replace(" ", "")


def judge(meant: str, heard: str) -> str:
    """'' when they match, else what differs"""
    if toneless(meant) != toneless(heard):
        return "syllable"
    if unicodedata.normalize("NFC", meant.lower().replace(" ", "")) != unicodedata.normalize("NFC", heard.lower().replace(" ", "")):
        return "tone"
    return ""


def hear(client, model: str, audio: bytes) -> str:
    from google.genai import types

    r = client.models.generate_content(
        model=model,
        contents=[types.Part.from_bytes(data=audio, mime_type="audio/mpeg"), PROMPT],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema={"type": "object", "properties": {"pinyin": {"type": "string"}}, "required": ["pinyin"]},
        ),
    )
    return json.loads(r.text)["pinyin"].strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("list", type=Path)
    parser.add_argument("--all", action="store_true", help="every word, not only single characters")
    parser.add_argument("--only", default="", help="these words, comma-separated")
    parser.add_argument("--model", default="gemini-flash-latest")
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()
    load_env()
    from google import genai

    client = genai.Client()
    items, _, _ = load_list(args.list)
    only = set(filter(None, args.only.split(",")))
    words = [
        it for it in items
        if it["kind"] == "word" and it.get("pinyin")
        and (it["text"] in only if only else args.all or len(it["text"]) == 1)
    ]
    heard = json.loads(HEARD.read_text()) if HEARD.exists() else {}
    lock = threading.Lock()

    def keep():
        with lock:
            HEARD.write_text(json.dumps(heard, ensure_ascii=False, indent=1))

    def one(it):
        f = OUT / f"{file_id(it['voice'], it['text'])}.mp3"
        if not f.exists():
            return it, None
        audio = f.read_bytes()
        key = f"{args.model}|{hashlib.sha1(audio).hexdigest()[:16]}"
        if key not in heard:
            first = hear(client, args.model, audio)
            second = hear(client, args.model, audio) if judge(it["pinyin"], first) else first
            with lock:
                heard[key] = [first, second]
        return it, heard[key]

    off = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        for n, (it, got) in enumerate(pool.map(one, words), 1):
            if got and all(judge(it["pinyin"], g) for g in got):
                off.append((it, got))
            if n % 25 == 0:
                keep()
                print(f"  {n} of {len(words)} heard", flush=True)
    keep()

    for kind in ["syllable", "tone"]:
        found = [(it, got) for it, got in off if any(judge(it["pinyin"], g) == kind for g in got)]
        if found:
            print(f"\nAnother {kind} heard ({len(found)}):")
            for it, got in found:
                print(f"  {it['text']}  {it['pinyin']}  heard {' / '.join(got)}  {file_id(it['voice'], it['text'])}.mp3")
    print(f"\n{len(words)} heard, {len(off)} sound off")


if __name__ == "__main__":
    main()
