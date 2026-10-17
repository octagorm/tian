# /// script
# requires-python = ">=3.11"
# dependencies = ["pypinyin>=0.51", "wordfreq>=3.1", "jieba>=0.42", "zhconv>=1.4"]
# ///
"""Writes the syllable table of Tian's pinyin chart:
src/app/data/syllables.ts.

    uv run scripts/syllables.py

Every Mandarin syllable that a common character is read as, with a common
character for each tone it is said in: the readings from pypinyin (a
character's usual reading first), how common a character is from
wordfreq, simplified characters only (zhconv). A character whose usual
reading it is stands for a syllable where there is one; another reading
fills in where there is not. Interjections without a vowel (嗯 n, 呣 m)
are left out.
"""

import re
import unicodedata
from pathlib import Path

from pypinyin import phrases_dict, pinyin_dict
from wordfreq import zipf_frequency
from zhconv import convert

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "app" / "data" / "syllables.ts"
# How common a character must be (wordfreq's Zipf scale: 3 is about once
# in a million words), and how much more for a reading not its usual one
COMMON = 3.0
COMMON_OTHER = 3.0
# How common a word must be to vouch for a reading: 撇嘴 piězuǐ, about once
# in six million words, is enough
WORD = 2.0

# Characters whose usual reading pypinyin does not list first, and readings
# too obscure to stand for a syllable
USUAL = {"肋": "lèi", "佛": "fó"}
OBSCURE = {("肋", "lē"), ("棱", "lēng")}


def plain(char: str) -> bool:
    """A character of the standard simplified set (GB2312): not a
    traditional or Japanese form (発), nor a rare one (皝)"""
    try:
        char.encode("gb2312")
        return True
    except UnicodeEncodeError:
        return False

MARKS = {"̄": 1, "́": 2, "̌": 3, "̀": 4}


def split(reading: str) -> tuple[str, int]:
    """'lǜ' → ('lü', 4); a reading without a mark is the neutral tone, 5"""
    tone = 5
    base = ""
    for ch in unicodedata.normalize("NFD", reading):
        if ch in MARKS:
            tone = MARKS[ch]
        else:
            base += ch
    return unicodedata.normalize("NFC", base), tone


# Readings heard in common words: a character's other readings count
# only when a common word has them (便 is pián in 便宜, 谁 shéi in 谁的),
# for pypinyin also lists old and rare ones (超 chào, 握 òu)
heard: set[tuple[str, str]] = set()
# How often each character is read each way, in common words, weighted by
# how common the word is
weight: dict[str, dict[str, float]] = {}
for phrase, readings in phrases_dict.phrases_dict.items():
    if len(phrase) != len(readings):
        continue
    z = zipf_frequency(phrase, "zh")
    if z < WORD:
        continue
    for char, (reading, *_) in zip(phrase, readings):
        heard.add((char, reading))
        w = weight.setdefault(char, {})
        w[reading] = w.get(reading, 0.0) + 10**z


def share(char: str, reading: str) -> float:
    """How much of a character's use in common words is this reading (a
    character in no common word: all of it, if it has one reading)"""
    w = weight.get(char)
    if not w:
        return 1.0 if len(pinyin_dict.pinyin_dict.get(ord(char), "").split(",")) == 1 else 0.0
    return w.get(reading, 0.0) / sum(w.values())

# For each syllable and tone, the most common character whose usual
# reading it is, or failing that one that is also read so (便 is usually
# biàn, but pián in 便宜; 佛 is listed fú before fó)
best: dict[tuple[str, int], tuple[int, float, str]] = {}
for code, readings in pinyin_dict.pinyin_dict.items():
    char = chr(code)
    if convert(char, "zh-cn") != char or not plain(char):
        continue
    f = zipf_frequency(char, "zh")
    if f < COMMON:
        continue
    listed = readings.split(",")
    if char in USUAL:
        listed = [USUAL[char]] + [r for r in listed if r != USUAL[char]]
    for rank, reading in enumerate(listed):
        base, tone = split(reading)
        if tone == 5 or not re.fullmatch(r"[a-zü]*[aeiouü][a-zü]*", base):
            continue
        other = 0 if rank == 0 else 1
        if other and (f < COMMON_OTHER or (char, reading) not in heard):
            continue
        if (char, reading) in OBSCURE:
            continue
        held = best.get((base, tone))
        if held is None or (other, -f) < (held[0], -held[1]):
            best[(base, tone)] = (other, f, char)

INITIALS = ["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x",
            "zh", "ch", "sh", "r", "z", "c", "s", "y", "w", ""]


def initial(base: str) -> str:
    for i in INITIALS:
        if i and base.startswith(i):
            return i
    return ""


bases = sorted({b for b, _ in best}, key=lambda b: (INITIALS.index(initial(b)), b))
lines = []
for b in bases:
    chars = "".join(best[(b, t)][2] if (b, t) in best else "·" for t in (1, 2, 3, 4))
    lines.append(f"  {b}: '{chars}',")

MARK_OF = {1: "\u0304", 2: "\u0301", 3: "\u030c", 4: "\u0300"}


def marked(base: str, tone: int) -> str:
    """'lü', 4 → 'lǜ': on a or e, the o of ou, else the last vowel"""
    at = base.find("a")
    if at < 0:
        at = base.find("e")
    if at < 0:
        at = base.find("ou")
    if at < 0:
        at = max(base.rfind(v) for v in "iouü")
    return unicodedata.normalize("NFC", base[: at + 1] + MARK_OF[tone] + base[at + 1 :])


# The character to read a syllable from: the most common one with no
# other reading at all, for the voice reads a character alone as it likes
# best (撇, piē in 撇开, comes out piě, the name of the stroke 丿), and
# reads p, t and k without their puff of air from bare pinyin. Where no
# such character is, the pinyin is read.
READ_MIN = 2.0
read_as: dict[tuple[str, int], tuple[float, str]] = {}
for code, readings in pinyin_dict.pinyin_dict.items():
    char = chr(code)
    if "," in readings or convert(char, "zh-cn") != char or not plain(char):
        continue
    f = zipf_frequency(char, "zh")
    base, tone = split(readings)
    if f < READ_MIN or tone == 5:
        continue
    if (base, tone) not in read_as or f > read_as[(base, tone)][0]:
        read_as[(base, tone)] = (f, char)
# Where the voice was heard to miss, a character picked by hand, whose
# other readings are rare or out of use: 熘, itself rare, comes out liú,
# like the 留 in it, and bare duī comes out duì
READ_INSTEAD = {"liū": "溜", "duī": "堆"}
read = [
    f"  '{marked(b, t)}': '{READ_INSTEAD.get(marked(b, t)) or read_as[(b, t)][1]}',"
    for b in bases
    for t in (1, 2, 3, 4)
    if (b, t) in best and ((b, t) in read_as or marked(b, t) in READ_INSTEAD)
]
OUT.write_text(
    "// Generated by scripts/syllables.py: every Mandarin syllable a\n"
    "// common character is read as, with a common character for each of its\n"
    "// four tones, or · where it has none.\n\n"
    "export const SYLLABLES: Record<string, string | undefined> = {\n" + "\n".join(lines) + "\n}\n\n"
    "// The character to say a syllable from: one with no other reading. From\n"
    "// bare pinyin the voice drops the puff of air of p, t, k, q, ch and c\n"
    "// unless told.\n"
    "export const READ_AS: Record<string, string | undefined> = {\n" + "\n".join(read) + "\n}\n"
)
print(f"{len(bases)} syllables, {len(best)} with a tone → {OUT.relative_to(ROOT)}")
