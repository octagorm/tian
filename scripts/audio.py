# /// script
# requires-python = ">=3.11"
# dependencies = ["google-genai>=2.25"]
# ///
"""Make the sound files for Tian with Gemini TTS.

    node scripts/speech.ts > .cache/speech.json
    uv run scripts/audio.py .cache/speech.json --job

The list holds every word and line the page can play, with its voice,
and the cast (src/app/data/voices.ts): the Gemini
voice behind each name, and how it speaks. Voices designed from a
description are made once; their ids are kept in
scripts/voices.json (delete one to design it again).

With --job, what is missing goes to Gemini's batch mode, at half the
price and outside the daily cap on requests, answered within a day and
often within minutes: a line to a request, and words and syllables in
lists (--batch of them, a long pause after each), as a teacher reads a
word list. A character read on its own, as a request of its own, comes
out in a less exact tone. A list that does not cut cleanly is asked for
again in halves. The jobs are noted in .cache, so a run cut short picks
them up again. --remake <names> makes those
voices' lines again, or every line with `lines`, as after a change in
the cast, or words and lines named by their text (哪,只). A word of the
bank is asked for in its pinyin, so a character with more than one
reading comes out in the one meant; scripts/hear.py listens for those
that did not.

Without --job, each request reads many lines, as requests are few (a
handful a day on the free tier; on the paid tier this model stopped
answering after 100 in a day): up to two voices (TTS's two speakers),
each line followed by a long pause. The sound that comes back is cut at
its longest silences, one piece per line, and the cut is only kept when
it is clean: as many pieces as lines, clear gaps between them and no
piece too short or too long for its text. A batch that does not cut
cleanly is asked for again in two halves.

Each piece becomes public/audio/<id>.mp3, with <id> from a hash
of voice and text, and src/app/data/audio.json maps
"voice|text" to it; files the list no longer names are removed. Only
lines without a file are asked for, so a run cut short picks up where it
stopped. The raw sound of each request is kept in .cache/tts/.

Needs GEMINI_API_KEY (from the environment, .env.local here or the
macOS Keychain: see load_env), and ffmpeg.
"""

import argparse
import base64
import concurrent.futures
import hashlib
import json
import os
import re
import statistics
import subprocess
import sys
import tempfile
import time
import wave
import io
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
MANIFEST = ROOT / "src" / "app" / "data" / "audio.json"
CACHE = ROOT / ".cache" / "tts"
VOICE_IDS = ROOT / "scripts" / "voices.json"
JOBS = ROOT / ".cache" / "jobs.json"
MODEL = "gemini-3.8-flash-tts"
# Lines in one request without --job, and in one job with it
BATCH = 8
PER_JOB = 50
# How a word is read, and a line when its voice has no style of its own
WORD_STYLE = "a patient teacher reading a word to a beginner: clear and a little slow, every tone exact"
LINE_STYLE = "natural and friendly, at a calm pace a learner can follow, every word as written, every tone clear"
TONE_SAID = {1: "first tone, high and level", 2: "second tone, rising", 3: "third tone, low and dipping", 4: "fourth tone, falling"}


def tone_of(syllable: str) -> str:
    return next((TONE_SAID[n] for n, marks in enumerate(["āēīōūǖ", "áéíóúǘ", "ǎěǐǒǔǚ", "àèìòùǜ"], 1) if any(m in syllable for m in marks)), "")


def reading(it) -> str:
    """For a word of the bank, the reading meant, spelt out. A character
    with more than one reading can come out in the other (只 as zhī), and
    one often said with an r gets it where it has none (哪 as nǎr, as in
    哪儿); a word with the r of erhua is asked to keep it."""
    pinyin = it.get("pinyin")
    if not pinyin:
        return ""
    syllables = pinyin.split()
    tone = (", " + (tone_of(pinyin) or "neutral tone, light and short")) if len(syllables) == 1 else ""
    erhua = any(s.endswith("r") and s[:-1].lower() not in "eēéěè" for s in syllables)
    r = (
        ", with the r of erhua at the end" if erhua
        else "" if any(s.endswith("r") for s in syllables)
        else ", with no r sound added at the end"
    )
    return f" Say {it['text']} as {pinyin}{tone}, exactly so{r}."


def syllable_style(it) -> str:
    """How a syllable of the pinyin chart is said, its pinyin and tone
    spelt out (the character read, if any, has no other reading)"""
    tone = tone_of(it["text"])
    return (
        f"a patient Mandarin teacher saying {it['text']}, {tone}, exactly so: p, t, k, q, ch and c "
        "with a strong puff of air, b, d, g, j, zh and z with none; clear and a little slow"
    )
STYLE = {
    "word": (
        "Standard Mandarin Chinese (Putonghua), as a patient teacher reads a "
        "word list to a beginner: clear and a little slow, every tone exact. "
        "Each line is one item. Read it once, then stay silent for two full "
        "seconds before the next."
    ),
    "line": (
        "Standard Mandarin Chinese (Putonghua), natural and friendly, at a "
        "calm pace a learner can follow, every tone clear. Each line is a "
        "separate thing said. Read it once, then stay silent for two full "
        "seconds before the next."
    ),
}


def load_env():
    """GEMINI_API_KEY from the environment, else .env.local here, else the
    macOS Keychain, where the one key for every project is kept:
    security add-generic-password -a "$USER" -s GEMINI_API_KEY -w"""
    if os.environ.get("GEMINI_API_KEY"):
        return
    env = ROOT / ".env.local"
    for line in env.read_text().splitlines() if env.exists() else []:
        if line.startswith("GEMINI_API_KEY="):
            os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip().strip('"')
            return
    found = subprocess.run(
        ["security", "find-generic-password", "-a", os.environ.get("USER", ""), "-s", "GEMINI_API_KEY", "-w"],
        capture_output=True, text=True,
    )
    if found.returncode or not found.stdout.strip():
        sys.exit("No GEMINI_API_KEY: set it, or keep it in the Keychain (see load_env)")
    os.environ["GEMINI_API_KEY"] = found.stdout.strip()


def file_id(voice: str, text: str) -> str:
    return hashlib.sha1(f"{voice}|{text}".encode()).hexdigest()[:12]


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, args)], check=True)


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout
    return float(out)


def said(it) -> str:
    """What is read for an item in a list: its text (or its character),
    with a full stop after a bare word, to keep it from running into the
    next one"""
    text = it.get("read") or it["text"]
    return text if re.search(r"[。！？…]$", text) else text + "。"


def list_style(it, style_of) -> str:
    """How an item is asked for among others: said once, then a long
    silence"""
    if it["kind"] == "word":
        return STYLE["word"] + reading(it)
    if it["kind"] == "syllable":
        return (
            f"Standard Mandarin Chinese, {syllable_style(it)}. Read it once, "
            "then stay silent for two full seconds before the next."
        )
    return (
        f"Standard Mandarin Chinese (Putonghua), {style_of(it)}. Each line is "
        "a separate thing said. Read it once, then stay silent for two "
        "full seconds before the next."
    )


def speak(client, items, voices, voice_of, style_of) -> bytes:
    """One request: items read in order, each by its voice, as WAV."""
    speakers = {v: "AB"[i] for i, v in enumerate(voices)}
    tts = {it["voice"]: voice_of(it) for it in items}
    other = "Puck" if tts[voices[0]] != "Puck" else "Kore"
    configured = [{"speaker": speakers[v], "voice": tts[v]} for v in voices]
    if len(configured) == 1:
        configured.append({"speaker": "B", "voice": other})

    interaction = client.interactions.create(
        model=MODEL,
        input=[{
            "type": "user_input",
            "content": [
                {
                    "type": "text",
                    # A full stop after a bare word keeps it from running
                    # into the next one
                    "text": said(it),
                    "annotations": [{"type": "speech_metadata", "speaker": speakers[it["voice"]], "style": list_style(it, style_of)}],
                }
                for it in items
            ],
        }],
        response_format={"type": "audio"},
        generation_config={"speech_config": {"mode": "conversational", "speakers": configured}},
    )
    return base64.b64decode(interaction.output_audio.data)


def speak_content(client, items, voices, model) -> bytes:
    """The same with generate_content, for the older TTS models: the lines
    as a script, one per row, by speaker A or B. Comes back as raw PCM."""
    from google.genai import types

    # The model wants a transcript with speakers, or it tries to answer
    # in text instead of reading
    speakers = {v: ("Teacher" if len(voices) == 1 else "AB"[i]) for i, v in enumerate(voices)}
    how = (
        "in a clear, slow teacher's voice, every tone exact"
        if items[0]["kind"] == "word"
        else "naturally and in a friendly way, at a calm pace a learner can follow"
    )
    def line(it):
        text = it["text"] if re.search(r"[。！？…]$", it["text"]) else it["text"] + "。"
        return f"{speakers[it['voice']]}: {text}"
    prompt = (
        f"Read aloud in standard Mandarin Chinese, {how}, with a long pause after each line:\n\n"
        + "\n".join(line(it) for it in items)
    )
    if len(voices) > 1:
        speech = types.SpeechConfig(multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
            speaker_voice_configs=[
                types.SpeakerVoiceConfig(speaker=speakers[v], voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=v)))
                for v in voices
            ]))
    else:
        speech = types.SpeechConfig(voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voices[0])))
    r = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=speech),
    )
    c = r.candidates[0]
    if not c.content or not c.content.parts:
        raise RuntimeError(f"no audio: {c.finish_reason}")
    pcm = c.content.parts[0].inline_data.data
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(pcm)
    return out.getvalue()


def gaps(wav: Path, noise: int = -38, least: float = 0.25):
    """The silences in the sound: quieter than `noise` dB for `least` s"""
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", wav, "-af", f"silencedetect=noise={noise}dB:d={least}", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    return list(zip(starts, ends))


def cut(wav: Path, items) -> list[tuple[float, float]] | None:
    """Where each item is in the sound, or None if it does not cut cleanly.
    The boundaries are the longest pauses, one fewer than the items: long
    ones, clear of every pause left inside a line. The model does not
    always wait as long as asked (often once in eight), so a shorter one
    will do when the pauses left over are much shorter still and each
    piece is about as long as its text, at the pace of the others."""
    total = duration(wav)
    every = gaps(wav)
    inner = [(s, e) for s, e in every if s > 0.05 and e < total - 0.05]
    n = len(items)
    if len(inner) < n - 1:
        return None
    by_length = sorted(inner, key=lambda g: g[1] - g[0], reverse=True)
    chosen = sorted(by_length[: n - 1])
    rest = by_length[n - 1 :]
    shortest = min((e - s for s, e in chosen), default=9)
    longest_rest = max((e - s for s, e in rest), default=0)
    clear = shortest >= 0.6 and longest_rest <= 0.8 * shortest
    if not clear and (shortest < 0.3 or longest_rest > 0.6 * shortest):
        return None
    lead = next((e for s, e in every if s <= 0.05), 0.0)
    tail = next((s for s, e in every if e >= total - 0.05), total)
    bounds = [lead, *[x for g in chosen for x in g], tail]
    pieces = [(bounds[2 * i], bounds[2 * i + 1]) for i in range(n)]
    pace = []
    for (a, b), it in zip(pieces, items):
        chars = 1 if it["kind"] == "syllable" else max(1, len(re.sub(r"[，。！？、：；…\s]", "", it["text"])))
        per = (b - a) / chars
        if b - a < 0.2 or per > 1.6 or (chars > 3 and per < 0.1):
            return None
        # A word said twice, or begun and said again in another tone (纸
        # as zhí, then zhǐ), leaves a pause inside its piece that the pace
        # lets through. Pauses inside a number (三百 … 二十) are shorter.
        inside = max((e - s for s, e in rest if a < s and e < b), default=0)
        if inside >= (0.3 if chars == 1 else 0.55):
            return None
        pace.append((b - a) / (0.25 + 0.28 * chars))
    if not clear:
        mid = statistics.median(pace)
        if any(p < 0.4 * mid or p > 2.5 * mid for p in pace):
            return None
    return pieces


def batches(items, size=BATCH):
    """Up to two voices and BATCH lines per request, one kind of reading."""
    groups: dict[tuple[str, str], list] = {}
    for it in items:
        groups.setdefault((it["kind"], it["voice"]), []).append(it)
    out = []
    for kind in ["word", "syllable", "line"]:
        chunks = []
        for (k, _), group in sorted(groups.items(), key=lambda g: -len(g[1])):
            if k != kind:
                continue
            for i in range(0, len(group), size):
                chunks.append(group[i : i + size])
        # pair up small chunks of different voices
        chunks.sort(key=len)
        while chunks:
            a = chunks.pop()
            partner = next(
                (j for j in range(len(chunks)) if len(chunks[j]) + len(a) <= size),
                None,
            )
            if partner is not None:
                b = chunks.pop(partner)
                mixed = [x for pair in zip(a, b) for x in pair]
                mixed += a[len(b):] + b[len(a):]
                out.append(mixed)
            else:
                out.append(a)
    return out


def load_list(path: Path):
    """The items, the cast and the voices to design (an older list is the
    items alone)"""
    data = json.loads(path.read_text())
    if isinstance(data, list):
        return data, {}, {}
    return data["items"], data.get("voices", {}), data.get("designed", {})


def designed_ids(client, designed: dict[str, str]) -> dict[str, str]:
    """The ids of the designed voices, designing those not made yet"""
    ids = json.loads(VOICE_IDS.read_text()) if VOICE_IDS.exists() else {}
    for name, description in designed.items():
        if name in ids:
            continue
        # The design service fails now and then (500); it does on a retry
        for attempt in range(4):
            try:
                v = client.voices.create(
                    voice={"type": "prompted", "display_name": name, "prompted": {"input": description}},
                    store=True,
                )
                break
            except Exception as error:
                if attempt == 3 or "500" not in str(error):
                    raise
                print(f"  designing {name} failed ({str(error)[:60]}…); trying again", flush=True)
                time.sleep(20 * (attempt + 1))
        ids[name] = v.id
        VOICE_IDS.write_text(json.dumps(ids, ensure_ascii=False, indent=1) + "\n")
        print(f"  designed a voice for {name}: {v.id}", flush=True)
    return ids


def casting(cast, designed, ids):
    """For an item, the voice that reads it and how"""

    def voice_of(it):
        base = cast[it["voice"]]["base"] if it["voice"] in cast else it["voice"]
        return ids[base] if base in designed else base

    def style_of(it):
        if it["kind"] == "word":
            return WORD_STYLE + "." + reading(it)
        if it["kind"] == "syllable":
            return syllable_style(it)
        # Without "every word as written" a voice in character now and
        # then adds a word of its own (行, 呢) or makes 你 polite
        if it["voice"] in cast:
            return f"{cast[it['voice']]['style']}, every word as written, every tone clear"
        return LINE_STYLE

    return voice_of, style_of


def key_of(it) -> str:
    return f"{it['voice']}|{it['text']}"


def widen(even: Path, pieces):
    """Each stretch widened to the quiet edges of its sound, which the loud
    threshold the cut uses counts as silence: the puff of air of p, t, k,
    q, ch and c, and the hiss of s, sh, x and f. Cut without them, tà
    sounds like dà. A stretch never reaches into its neighbours."""
    total = duration(even)
    quiet = gaps(even, -55, 0.04)
    out = []
    for i, (a, b) in enumerate(pieces):
        before = pieces[i - 1][1] if i else 0.0
        after = pieces[i + 1][0] if i + 1 < len(pieces) else total
        ends = [e for s, e in quiet if before <= e <= a]
        starts = [s for s, e in quiet if b <= s <= after]
        start = max(ends) if ends else max(before, a - 0.15)
        end = min(starts) if starts else min(after, b + 0.15)
        out.append((start, end))
    return out


def write_piece(even: Path, a: float, b: float, it):
    """The stretch a–b of the sound (widened) as the item's file, with a
    moment of lead and a short fade out"""
    start = max(0, a - 0.03)
    ffmpeg(
        "-ss", f"{start:.3f}", "-to", f"{b + 0.06:.3f}", "-i", even,
        "-af", "afade=t=out:st=%.3f:d=0.06" % max(0, b - start),
        "-ac", "1", "-ar", "24000", "-b:a", "40k", OUT / f"{file_id(it['voice'], it['text'])}.mp3",
    )


def trim(raw: Path, it):
    """One item's own recording, its silence trimmed, as its file"""
    with tempfile.TemporaryDirectory() as tmp:
        even = Path(tmp) / "even.wav"
        ffmpeg("-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "24000", "-ac", "1", even)
        total = duration(even)
        every = gaps(even)
        lead = next((e for s, e in every if s <= 0.05), 0.0)
        tail = next((s for s, e in every if e >= total - 0.05), total)
        (a, b), = widen(even, [(lead, tail)])
        write_piece(even, a, b, it)


def save(manifest):
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=False, indent=0) + "\n")


def ask(lst, n: int, voice_of, style_of):
    """One request of a batch job: an item on its own, or a list of them,
    each said once with a long pause after"""
    if len(lst) == 1:
        it = lst[0]
        parts = [{"text": it.get("read") or it["text"], "speech_metadata": {"style": style_of(it)}}]
    else:
        parts = [
            {
                "text": said(it) + (" <long pause>" if i < len(lst) - 1 else ""),
                "speech_metadata": {"style": list_style(it, style_of)},
            }
            for i, it in enumerate(lst)
        ]
    return {
        "contents": [{"role": "user", "parts": parts}],
        "config": {
            "response_modalities": ["AUDIO"],
            "speech_config": {"voice_config": {"voice": voice_of(lst[0])}},
        },
        "metadata": {"key": str(n)},
    }


def lists_of(items, size: int):
    """Items in lists of `size`, one kind and one voice to a list"""
    groups: dict[tuple[str, str], list] = {}
    for it in items:
        groups.setdefault((it["kind"], it["voice"]), []).append(it)
    return [g[i : i + size] for g in groups.values() for i in range(0, len(g), size)]


def collect(job, lists, by_key, manifest):
    """A finished job's sound: an item on its own trimmed of the silence
    around it, a list cut apart. Returns how many were made, and the lists
    that did not cut cleanly."""
    responses = job.dest.inlined_responses or []
    made, failed = 0, []
    for i, r in enumerate(responses):
        n = int((r.metadata or {}).get("key", i))
        lst = [by_key[k] for k in lists[n] if k in by_key] if n < len(lists) else []
        if not lst:
            continue
        content = r.response.candidates[0].content if r.response and r.response.candidates else None
        part = content.parts[0] if content and content.parts else None
        if r.error or not part or not part.inline_data:
            print(f"  no sound for {key_of(lst[0])}{' …' if len(lst) > 1 else ''}: {r.error or 'no audio'}", flush=True)
            if len(lst) > 1:
                failed.append(lst)
            continue
        data = part.inline_data.data
        if isinstance(data, str):
            data = base64.b64decode(data)
        name = file_id(lst[0]["voice"], lst[0]["text"]) if len(lst) == 1 else "list"
        raw = CACHE / f"{name}-{hashlib.sha1(data).hexdigest()[:6]}.wav"
        if data[:4] == b"RIFF":
            raw.write_bytes(data)
        else:
            with wave.open(str(raw), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(24000)
                w.writeframes(data)
        if len(lst) == 1:
            trim(raw, lst[0])
            manifest[key_of(lst[0])] = file_id(lst[0]["voice"], lst[0]["text"])
            made += 1
            continue
        with tempfile.TemporaryDirectory() as tmp:
            even = Path(tmp) / "even.wav"
            ffmpeg("-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "24000", "-ac", "1", even)
            pieces = cut(even, lst)
            if pieces is None:
                failed.append(lst)
                continue
            for (a, b), it in zip(widen(even, pieces), lst):
                write_piece(even, a, b, it)
                manifest[key_of(it)] = file_id(it["voice"], it["text"])
                made += 1
    return made, failed


def run_jobs(client, todo, items, voice_of, style_of, manifest, size: int):
    """Asks for what is missing in batch jobs, and waits for them: lines
    one to a request, words and syllables in lists, a list that does not
    cut cleanly asked for again in halves. Jobs asked for before and not
    yet in are waited for too."""
    jobs = json.loads(JOBS.read_text()) if JOBS.exists() else []
    for j in jobs:
        # noted before lists: a key to a request
        if "lists" not in j:
            j["lists"] = [[k] for k in j["keys"]]
    asked = {k for j in jobs for lst in j["lists"] for k in lst}
    new = [it for it in todo if key_of(it) not in asked]
    pending = [[it] for it in new if it["kind"] == "line"]
    pending += lists_of([it for it in new if it["kind"] != "line"], size)
    by_key = {key_of(it): it for it in items}
    start = time.time()
    while jobs or pending:
        for i in range(0, len(pending), PER_JOB):
            chunk = pending[i : i + PER_JOB]
            job = client.batches.create(
                model=MODEL,
                src=[ask(lst, n, voice_of, style_of) for n, lst in enumerate(chunk)],
                config={"display_name": "tian-voices"},
            )
            jobs.append({"name": job.name, "lists": [[key_of(it) for it in lst] for lst in chunk]})
            JOBS.write_text(json.dumps(jobs, ensure_ascii=False, indent=1))
            print(f"  asked for {sum(len(lst) for lst in chunk)} in {len(chunk)} requests, {job.name}", flush=True)
        pending = []
        told = time.time()
        while jobs:
            for j in list(jobs):
                job = client.batches.get(name=j["name"])
                state = job.state.name
                if state == "JOB_STATE_SUCCEEDED":
                    made, failed = collect(job, j["lists"], by_key, manifest)
                    for lst in failed:
                        half = len(lst) // 2
                        pending += [lst[:half], lst[half:]]
                    print(
                        f"  {j['name']}: {made} made"
                        + (f", {len(failed)} list(s) to ask again in halves" if failed else ""),
                        flush=True,
                    )
                elif state in ("JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED"):
                    print(f"  {j['name']}: {state.removeprefix('JOB_STATE_').lower()} – {job.error}", flush=True)
                else:
                    continue
                jobs.remove(j)
                JOBS.write_text(json.dumps(jobs, ensure_ascii=False, indent=1))
                save(manifest)
            if jobs:
                if time.time() - told > 300:
                    told = time.time()
                    print(f"  waiting for {len(jobs)} job(s), {int(time.time() - start) // 60} min so far", flush=True)
                time.sleep(30)


def tidy(manifest):
    """Removes the files no line uses any more (as when a line changes
    voice)"""
    used = set(manifest.values())
    gone = [f for f in OUT.glob("*.mp3") if f.stem not in used]
    for f in gone:
        f.unlink()
    if gone:
        print(f"removed {len(gone)} file(s) no longer used", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("list", type=Path)
    parser.add_argument("--max", type=int, default=999, help="most requests in this run")
    parser.add_argument("--wait", type=int, default=240, help="seconds to wait for one request")
    parser.add_argument("--model", default=MODEL, help="the TTS model (gemini-2.5-flash-preview-tts when the newer one's quota is spent)")
    parser.add_argument("--batch", type=int, default=BATCH, help="most lines in one request")
    parser.add_argument("--pause", type=float, default=0, help="seconds between requests, for per-minute limits")
    parser.add_argument("--job", action="store_true", help="ask in batch jobs, a request per line")
    parser.add_argument("--remake", default="", help="voices to make again, by name, comma-separated, or `words`, `lines` or `syllables` for every one of them, or words and lines by their text (哪,只)")
    parser.add_argument("--retrim", action="store_true", help="trim again every item made in batch mode, from its recording")
    args = parser.parse_args()
    load_env()
    from google import genai

    client = genai.Client()
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    items, cast, designed = load_list(args.list)
    voice_of, style_of = casting(cast, designed, designed_ids(client, designed) if designed else {})
    remake = set(filter(None, args.remake.split(",")))
    wanted = {key_of(it) for it in items}
    has = lambda it: (OUT / f"{file_id(it['voice'], it['text'])}.mp3").exists()
    todo = [
        it for it in items
        if not has(it) or it["voice"] in remake or f"{it['kind']}s" in remake or it["text"] in remake
    ]
    for key in list(manifest):
        if key not in wanted:
            del manifest[key]
    for it in items:
        if has(it):
            manifest[key_of(it)] = file_id(it["voice"], it["text"])
    print(f"{len(items)} lines, {len(todo)} to make", flush=True)

    if args.retrim:
        # an item made in batch mode keeps its recording as <id>-<hash>.wav
        done = 0
        for it in items:
            raws = sorted(CACHE.glob(f"{file_id(it['voice'], it['text'])}-*.wav"), key=lambda f: f.stat().st_mtime)
            if raws and has(it):
                trim(raws[-1], it)
                done += 1
        print(f"trimmed {done} again", flush=True)
        todo = []
    if args.job:
        run_jobs(client, todo, items, voice_of, style_of, manifest, args.batch)
        todo = []
    queue = batches(todo, args.batch)
    requests = 0
    while queue and requests < args.max:
        batch = queue.pop(0)
        voices = list(dict.fromkeys(it["voice"] for it in batch))
        asked = [[voice_of(it), style_of(it), it["text"]] for it in batch]
        key = hashlib.sha1(json.dumps([args.model, STYLE, asked], ensure_ascii=False).encode()).hexdigest()[:16]
        raw = CACHE / f"{key}.wav"
        if not raw.exists():
            # A request that hangs (as the free tier does when its quota is
            # spent) is given up after a while
            pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            try:
                if args.model.startswith("gemini-2"):
                    job = pool.submit(speak_content, client, batch, voices, args.model)
                else:
                    job = pool.submit(speak, client, batch, voices, voice_of, style_of)
                raw.write_bytes(job.result(timeout=args.wait))
            except concurrent.futures.TimeoutError:
                print(f"No answer in {args.wait} s after {requests} request(s); try again later.", flush=True)
                pool.shutdown(wait=False, cancel_futures=True)
                break
            except Exception as error:
                if "429" in str(error) or "RESOURCE_EXHAUSTED" in str(error):
                    print(f"Quota used up after {requests} request(s); run again later.", flush=True)
                    break
                if "no audio" not in str(error) and "generate text" not in str(error):
                    raise
                # The older model sometimes gives up on a list: try again
                # in halves, and drop a single line it will not read
                requests += 1
                if len(batch) > 1:
                    print(f"  no audio for {len(batch)} lines; asking again in halves", flush=True)
                    queue[:0] = [batch[: len(batch) // 2], batch[len(batch) // 2 :]]
                else:
                    print(f"  no audio for: {batch[0]['text']}", flush=True)
                continue
            requests += 1
            if args.pause:
                time.sleep(args.pause)
        with tempfile.TemporaryDirectory() as tmp:
            even = Path(tmp) / "even.wav"
            ffmpeg("-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "24000", "-ac", "1", even)
            pieces = cut(even, batch)
            if pieces is None:
                if len(batch) == 1:
                    print(f"  could not cut a single line, kept whole: {batch[0]['text']}")
                    pieces = [(0.0, duration(even))]
                else:
                    half = len(batch) // 2
                    print(f"  batch of {len(batch)} did not cut cleanly; asking again in halves", flush=True)
                    queue[:0] = [batch[:half], batch[half:]]
                    continue
            for (a, b), it in zip(widen(even, pieces), batch):
                write_piece(even, a, b, it)
                manifest[key_of(it)] = file_id(it["voice"], it["text"])
        save(manifest)
        print(f"  {len(batch)} lines ({', '.join(voices)}), {len(queue)} batches left", flush=True)
    save(manifest)
    tidy(manifest)
    missing = sum(key_of(it) not in manifest for it in items)
    print(f"done: {len(items) - missing} of {len(items)} have sound, {requests} request(s)")
    sys.stdout.flush()
    # a request given up on may still hold a thread
    os._exit(0)


if __name__ == "__main__":
    main()
