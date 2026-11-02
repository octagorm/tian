import { WORDS } from '../../data/words'
import { due } from '../../lib/bank'
import type { Bank } from '../../lib/bank'
import type { Word } from '../../data/words'

// The words the practice games play with: those met, the most faded
// first, so that playing does the work of Review. With too few met, the
// first lessons fill in, but only words met are recorded in the bank, so
// a game never brings new words by itself (lib/bank.ts, `room`).

export function practiceWords(bank: Bank, now = Date.now()): Array<Word> {
  const met = due(bank, now).map((d) => d.w)
  if (met.length >= 12) return met
  const more = WORDS.filter((w) => !met.includes(w)).slice(0, 40 - met.length)
  return [...met, ...more]
}

// The most faded `n`, with a little shuffling among those close in line,
// so two games in a row are not the same
export function fadedFirst(words: Array<Word>, n: number): Array<Word> {
  const head = words.slice(0, Math.max(n, Math.round(n * 1.6)))
  return head
    .map((w, i) => ({ w, k: i + Math.random() * n * 0.6 }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.w)
}

// A meaning short enough for a lantern or a tile: the gloss where the
// meaning leans on an aside in brackets (you (plural) is "you all"),
// else the first sense
export const short = (w: Word) => {
  if (/\(/.test(w.e) && !w.g.startsWith('(')) return w.g
  let e = w.e
    .replace(/\s*\([^)]*\)/g, '')
    .split(';')[0]
    .trim()
  if (e.length > 22) e = e.split(',')[0].trim()
  return e || w.g
}

export const hanCount = (w: Word) => [...w.h].length
