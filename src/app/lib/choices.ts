// The wrong answers offered beside the right one. They should not give the
// answer away by their shape: a word heard as two syllables should not be
// the only one of two among the choices, nor a short line the only short
// one. So wrong answers are as long as the right one where the pool has
// enough of them, and by ear they sound alike: they share syllables or
// tones with the word, so the choice is made by listening.

import { WORDS } from '../data/words'
import { bare, inContext, syllables, toneOf } from './pinyin'
import { toHanzi } from './numbers'
import type { Word } from '../data/words'

function shuffle<T>(xs: Array<T>, random: () => number): Array<T> {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Meanings for a character, characters for a meaning, characters for a
// word heard, and meanings for a word heard
export type ChoiceKind = 'meaning' | 'reverse' | 'listen' | 'hear'

// A word as it is said, the tone changes of 不 and 一 applied
const spoken = (w: Word) => inContext([{ h: w.h, s: syllables(w.p) }])[0]

// Two words a listener could not tell apart: the same syllables, with
// tones that differ, if at all, only where one is neutral (东西 dōngxī,
// "east and west", and dōngxi, "thing"), or the same sound (他 and 她)
export function soundsSame(a: Word, b: Word): boolean {
  const sa = spoken(a)
  const sb = spoken(b)
  return (
    sa.length === sb.length &&
    sa.every((s, i) => {
      const t = sb[i]
      if (bare(s).toLowerCase() !== bare(t).toLowerCase()) return false
      const ta = toneOf(s)
      const tb = toneOf(t)
      return ta === tb || ta === 5 || tb === 5
    })
  )
}

const length = (w: Word) => syllables(w.p).length

// How much a wrong answer is like the word, so hard to tell from it: by
// ear, syllables in common (more in the same place) and the same tones;
// by sight, characters in common; and for all, a word of the same kind or
// from a lesson near it
function likeness(w: Word, x: Word, kind: ChoiceKind): number {
  const alike =
    x.tags.some((t) => w.tags.includes(t)) || Math.abs(x.lesson - w.lesson) <= 1
  let score = alike ? (kind === 'meaning' || kind === 'hear' ? 2 : 0.5) : 0
  if (kind === 'listen' || kind === 'hear') {
    const sw = spoken(w)
    const sx = spoken(x)
    const bw = sw.map((s) => bare(s).toLowerCase())
    sx.forEach((s, i) => {
      const b = bare(s).toLowerCase()
      if (bw[i] === b) score += 2
      else if (bw.includes(b)) score += 1
    })
    if (sw.map(toneOf).join() === sx.map(toneOf).join()) score += 1
  }
  if (kind === 'reverse')
    for (const c of new Set(x.h)) if (w.h.includes(c)) score += 1.5
  return score
}

// Four choices: the word and three others, shuffled. `pool` is the words
// to draw from first (those met); for listening and picking the
// character, words of the same length come from the whole vocabulary when
// the pool has too few, and only then words a syllable longer or shorter.
export function wordChoices(
  w: Word,
  pool: Array<Word>,
  kind: ChoiceKind,
  random = Math.random,
): Array<Word> {
  const fair = (x: Word) =>
    x.id !== w.id && x.g !== w.g && x.h !== w.h && !soundsSame(x, w)
  const others = pool.filter(fair)
  const ranked = (xs: Array<Word>) =>
    xs
      .map((x) => ({ x, s: likeness(w, x, kind) + random() * 1.5 }))
      .sort((a, b) => b.s - a.s)
      .map((r) => r.x)
  let picked: Array<Word>
  // meanings in English do not show how long the word is
  if (kind === 'meaning' || kind === 'hear') picked = ranked(others).slice(0, 3)
  else {
    const n = length(w)
    const tiers = [
      others.filter((x) => length(x) === n),
      WORDS.filter((x) => length(x) === n && fair(x) && !pool.includes(x)),
      others.filter((x) => Math.abs(length(x) - n) === 1),
      others.filter((x) => Math.abs(length(x) - n) > 1),
    ]
    picked = tiers.flatMap(ranked).slice(0, 3)
  }
  return shuffle([w, ...picked], random)
}

// Han characters in a line, about its syllables; {home} is a country
const syllableCount = (zh: string) =>
  (zh.match(/\p{Script=Han}/gu)?.length ?? 0) +
  2 * (zh.match(/\{home\}/g)?.length ?? 0)

const wordCount = (en: string) => en.split(/\s+/).filter(Boolean).length

// Four meanings for a line heard: its own and those of three lines about
// as long, in Chinese and in English, so neither the sound nor the look of
// the choices tells which it is
export function lineChoices(
  q: { zh: string; en: string },
  all: Array<{ zh: string; en: string }>,
  random = Math.random,
): Array<string> {
  const n = syllableCount(q.zh)
  const e = wordCount(q.en)
  const seen = new Set([q.en])
  const near = all
    .map((h) => ({
      h,
      d:
        Math.abs(syllableCount(h.zh) - n) +
        Math.abs(wordCount(h.en) - e) +
        random() * 2,
    }))
    .sort((a, b) => a.d - b.d)
  const wrong: Array<string> = []
  for (const { h } of near) {
    if (wrong.length === 3) break
    if (seen.has(h.en)) continue
    seen.add(h.en)
    wrong.push(h.en)
  }
  return shuffle([q.en, ...wrong], random)
}

// Four numbers for one heard: it and three near it (digits swapped, ten
// or a few more or less), said in as many syllables where they can be
export function numberChoices(n: number, random = Math.random): Array<number> {
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const near = [
    ones * 10 + tens,
    n + 10,
    n - 10,
    n + 1,
    n - 1,
    n + 2,
    n - 2,
    n + 3,
    n - 3,
    n + 20,
    n - 20,
    n + 11,
    n - 11,
    tens * 100 + ones,
  ]
  const said = (x: number) => [...toHanzi(x)].length
  const s = said(n)
  const wrong = shuffle(
    [...new Set(near)].filter((x) => x > 0 && x < 1000 && x !== n),
    random,
  )
    .map((x) => ({ x, d: Math.abs(said(x) - s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((r) => r.x)
  return shuffle([n, ...wrong], random)
}
