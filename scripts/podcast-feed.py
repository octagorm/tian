# /// script
# requires-python = ">=3.11"
# ///
"""Put Tian's podcast, 天天, on R2: tag each episode, write the feed, upload.

    uv run scripts/podcast-feed.py            # build and upload
    uv run scripts/podcast-feed.py --dry-run  # build in .cache/podcast/out only

The episodes are listed in podcast/episodes.json, each with its MP3 (made
apart, and kept out of git). The cover is podcast/cover.jpg (node
scripts/icons.mjs --podcast). Everything goes to the R2 bucket tian-podcast,
which the site's Worker serves at tian.ymse.land/podcast/ (worker/index.ts),
so the feed is https://tian.ymse.land/podcast/feed.xml.

When an episode's sound or the cover changes, it gets a new ID and new file
names, and the old version leaves the feed and the bucket: podcast apps keep
what they have for an ID they know. The date each ID first went out is kept
in podcast/published.json, written only after a successful upload; a
corrected episode is dated when it went out, so apps show it as new.

Uploads with Wrangler on the Mac's Cloudflare login (npx wrangler login),
and needs ffmpeg and ffprobe.
"""

import argparse
import datetime as dt
import hashlib
import json
import subprocess
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
PODCAST = ROOT / "podcast"
PUBLISHED = PODCAST / "published.json"
OUT = ROOT / ".cache" / "podcast" / "out"
BUCKET = "tian-podcast"
BASE = "https://tian.ymse.land/podcast"
OSLO = ZoneInfo("Europe/Oslo")
SHOW = "天天: Mandarin with Tian"
ABOUT = (
    "Two hosts and a few friends, in English and simple Mandarin: a learner "
    "and a teacher go through what Tian's games have met, with taxi rides, "
    "breakfasts, old stories and sayings, each word said slowly and then "
    "again for you to say after them. From Tian, games for learning Mandarin "
    "at tian.ymse.land."
)
# The feed and cover are fetched again within minutes; an episode's files
# never change under their name
SHORT = "public, max-age=300"
LONG = "public, max-age=31536000, immutable"


def run(*args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)


def duration(mp3: Path) -> int:
    out = run(
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", mp3,
        capture_output=True, text=True,
    ).stdout  # fmt: skip
    return round(float(out))


def build(now: dt.datetime) -> tuple[dict[str, str], dict[Path, str], list[str]]:
    """The feed and the files it uses, in OUT. Returns the publication dates,
    the files with their Cache-Control, and old files to remove."""
    episodes = json.loads((PODCAST / "episodes.json").read_text())
    published = json.loads(PUBLISHED.read_text()) if PUBLISHED.exists() else {}
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.iterdir():
        old.unlink()
    cover = OUT / "cover.jpg"
    cover.write_bytes((PODCAST / "cover.jpg").read_bytes())
    files = {cover: SHORT}
    gone: list[str] = []

    items = []
    for ep in episodes:
        n = ep["n"]
        series = f"tiantian-{n:02d}"
        title = f"Episode {n}: {ep['title']}"
        source = ROOT / ep["audio"]
        # Each version of the sound and cover is an episode of its own
        version = hashlib.sha1(source.read_bytes() + cover.read_bytes()).hexdigest()[:8]
        guid = f"{series}-{version}"
        mp3 = OUT / f"{guid}.mp3"
        # Tagged with its title and the cover, for players that read the file
        run(
            "ffmpeg", "-y", "-loglevel", "error", "-i", source, "-i", cover,
            "-map", "0", "-map", "1", "-c", "copy", "-id3v2_version", "3",
            "-metadata", f"title={title}", "-metadata", "artist=Tian",
            "-metadata", f"album={SHOW}", "-metadata", f"track={n}",
            "-metadata:s:v", "comment=Cover (front)", mp3,
        )  # fmt: skip
        files[mp3] = LONG
        older = [g for g in published if g.startswith(f"{series}-") and g != guid]
        if guid in published:
            date = dt.datetime.fromisoformat(published[guid])
        else:
            # New, or a correction: dated now, so apps put it on top
            date = now
            gone += [f"{g}.mp3" for g in older]
        published.setdefault(guid, date.isoformat())
        items.append((date, f"""    <item>
      <title>{escape(title)}</title>
      <description>{escape(ep["description"])}</description>
      <guid isPermaLink="false">{guid}</guid>
      <pubDate>{format_datetime(date)}</pubDate>
      <enclosure url="{BASE}/{mp3.name}" length="{mp3.stat().st_size}" type="audio/mpeg"/>
      <itunes:duration>{duration(mp3)}</itunes:duration>
      <itunes:episode>{n}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
    </item>"""))  # fmt: skip

    items.sort(key=lambda item: item[0], reverse=True)
    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>{escape(SHOW)}</title>
    <description>{escape(ABOUT)}</description>
    <language>en</language>
    <link>https://tian.ymse.land/#podcast</link>
    <itunes:author>Tian</itunes:author>
    <itunes:image href={quoteattr(f"{BASE}/cover.jpg")}/>
    <itunes:category text="Education">
      <itunes:category text="Language Learning"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <itunes:block>Yes</itunes:block>
    <podcast:block>yes</podcast:block>
{chr(10).join(xml for _, xml in items)}
  </channel>
</rss>
"""
    (OUT / "feed.xml").write_text(feed)
    files[OUT / "feed.xml"] = SHORT
    return published, files, gone


def wrangler(*args):
    run("npx", "wrangler", "r2", "object", *args, "--remote", cwd=ROOT)


def upload(files: dict[Path, str], gone: list[str]):
    types = {
        ".mp3": "audio/mpeg",
        ".jpg": "image/jpeg",
        ".xml": "application/rss+xml; charset=utf-8",
    }
    # The episodes first and the feed last, so the feed never names a file
    # that is not there yet
    for file, cache in sorted(files.items(), key=lambda f: f[0].name == "feed.xml"):
        wrangler(
            "put", f"{BUCKET}/{file.name}", "--file", file,
            "--content-type", types[file.suffix], "--cache-control", cache,
        )  # fmt: skip
    for name in gone:
        wrangler("delete", f"{BUCKET}/{name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--dry-run", action="store_true", help="build, but do not upload")
    args = parser.parse_args()

    now = dt.datetime.now(OSLO).replace(microsecond=0)
    published, files, gone = build(now)
    print(f"{len(files) - 2} episode(s) in {OUT.relative_to(ROOT)}")
    if args.dry_run:
        return
    upload(files, gone)
    PUBLISHED.write_text(json.dumps(published, indent=2) + "\n")
    print(f"Feed: {BASE}/feed.xml")


if __name__ == "__main__":
    main()
