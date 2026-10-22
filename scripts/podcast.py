# /// script
# requires-python = ">=3.11"
# dependencies = ["google-genai>=2.25"]
# ///
"""A podcast episode for a learner, read with Gemini TTS. A prototype.

    uv run scripts/podcast.py EPISODE.json OUT.mp3

The episode is a JSON file: the cast, and the lines in order.

    {
      "designed": {"Mei": "A description of the voice to design"},
      "cast": {"Mei": {"voice": "Mei", "style": "how she speaks"},
               "Orus": {"voice": "Orus", "style": "a gruff taxi driver"}},
      "lines": [
        {"who": "Mei", "text": "Hi! 你好！"},
        {"pause": 1.5},
        {"chime": true}
      ]
    }

A voice is a Gemini prebuilt voice, one of the game's designed voices
(scripts/voices.json), or one of `designed`, made once and kept there
beside them. TTS takes at most two speakers to a request, so the lines go in
runs of two voices at most and about a minute of speech, each run a
request, joined with short pauses. A pause or a chime ends a run. The
raw sound of each run is kept in .cache/podcast/, by a hash of what it
reads, so a run made once is not asked for again.

Needs GEMINI_API_KEY (as scripts/audio.py finds it) and ffmpeg.
"""

import argparse
import base64
import hashlib
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from audio import MODEL, designed_ids, ffmpeg, load_env

CACHE = ROOT / ".cache" / "podcast"
# Characters of text in one request, about a minute of speech
RUN = 700
RATE = 24000


def runs(lines):
    """The lines in requests: up to two voices and RUN characters each,
    broken at every pause and chime"""
    out, run = [], []
    for line in lines:
        if "who" not in line:
            if run:
                out.append(run)
                run = []
            out.append(line)
            continue
        voices = {x["who"] for x in run} | {line["who"]}
        size = sum(len(x["text"]) for x in run) + len(line["text"])
        if run and (len(voices) > 2 or size > RUN):
            out.append(run)
            run = []
        run.append(line)
    if run:
        out.append(run)
    return out


def speak(client, run, cast, ids) -> bytes:
    """One run as WAV, each line in its speaker's voice and manner"""
    names = list(dict.fromkeys(x["who"] for x in run))
    speakers = {n: "AB"[i] for i, n in enumerate(names)}

    def voice(name):
        v = cast[name]["voice"]
        return ids.get(v, v)

    configured = [{"speaker": speakers[n], "voice": voice(n)} for n in names]
    if len(configured) == 1:
        configured.append({"speaker": "B", "voice": "Kore" if voice(names[0]) != "Kore" else "Puck"})
    for attempt in range(5):
        try:
            interaction = client.interactions.create(
                model=MODEL,
                input=[{
                    "type": "user_input",
                    "content": [
                        {
                            "type": "text",
                            "text": x["text"],
                            "annotations": [{
                                "type": "speech_metadata",
                                "speaker": speakers[x["who"]],
                                "style": x.get("style") or cast[x["who"]]["style"],
                            }],
                        }
                        for x in run
                    ],
                }],
                response_format={"type": "audio"},
                generation_config={"speech_config": {"mode": "conversational", "speakers": configured}},
            )
            return base64.b64decode(interaction.output_audio.data)
        except Exception as error:
            if attempt == 4:
                raise
            print(f"  failed ({str(error)[:80]}…); trying again", flush=True)
            time.sleep(15 * (attempt + 1))
    raise RuntimeError("unreachable")


def silence(path: Path, seconds: float):
    ffmpeg("-f", "lavfi", "-i", f"anullsrc=r={RATE}:cl=mono", "-t", seconds, path)


def chime(path: Path):
    """A soft two-note bell, a fifth apart, as between the parts"""
    ffmpeg(
        "-f", "lavfi", "-i", f"sine=f=659:r={RATE}:d=2.2",
        "-f", "lavfi", "-i", f"sine=f=988:r={RATE}:d=2.2",
        "-filter_complex",
        "[0]volume=0.18,afade=t=out:st=0.05:d=2.1[a];"
        "[1]adelay=280,volume=0.12,afade=t=out:st=0.35:d=1.85[b];"
        "[a][b]amix=inputs=2:duration=longest,atrim=0:2.4,aformat=sample_rates=24000:channel_layouts=mono",
        path,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("episode", type=Path)
    parser.add_argument("out", type=Path)
    args = parser.parse_args()

    episode = json.loads(args.episode.read_text())
    cast = episode["cast"]
    load_env()
    from google import genai

    client = genai.Client()
    # The game's designed voices can be cast too
    ids = designed_ids(client, episode.get("designed", {}))

    CACHE.mkdir(parents=True, exist_ok=True)
    work = CACHE / args.episode.stem
    work.mkdir(exist_ok=True)
    gap = work / "gap.wav"
    silence(gap, 0.45)
    parts = []
    todo = runs(episode["lines"])
    for i, run in enumerate(todo):
        if isinstance(run, dict):
            piece = work / f"{i:03d}-{'chime' if run.get('chime') else 'pause'}.wav"
            if run.get("chime"):
                chime(piece)
            else:
                silence(piece, run["pause"])
            parts.append(piece)
            continue
        key = hashlib.sha1(json.dumps([run, {n: cast[n] for n in {x["who"] for x in run}}], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]
        raw = CACHE / f"{key}.wav"
        if not raw.exists():
            print(f"  run {i + 1}/{len(todo)}: {', '.join(dict.fromkeys(x['who'] for x in run))}, {sum(len(x['text']) for x in run)} chars", flush=True)
            raw.write_bytes(speak(client, run, cast, ids))
        # Same rate and layout for every piece, so they join cleanly
        piece = work / f"{i:03d}.wav"
        ffmpeg("-i", raw, "-ar", RATE, "-ac", 1, piece)
        parts.append(piece)
        parts.append(gap)

    listing = work / "list.txt"
    listing.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
    ffmpeg(
        "-f", "concat", "-safe", 0, "-i", listing,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", 44100, "-ac", 1, "-b:a", "96k", args.out,
    )
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
