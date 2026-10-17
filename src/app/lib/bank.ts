import { WORDS } from '../data/words.ts'
import type { Word } from '../data/words.ts'

// The word bank: what the player knows, shared by every game. Each word
// they have met has a card with a memory of it, in the manner of FSRS: the
// stability `s` is how many days until the chance of remembering it falls
// to 90 %. A right answer makes it last longer, by more the more it had
// faded (practice spaced out counts for more than practice crammed); a
// wrong one cuts it down. Games weigh their evidence: typing a word's
// pinyin says more than picking its meaning from four.
//
// How a word is shown follows from its card: not met yet, in English;
// met, in hanzi with pinyin; known (lasting a day and a half or more, and
// not faded much), in hanzi alone.

export interface Card {
  // Stability, in days
  s: number
  // Last seen, ms
  t: number
  // Times answered, and of those wrong
  n: number
  x: number
  // Met, ms
  i: number
}

export interface Bank {
  cards: Record<string, Card | undefined>
  // Tone pairs heard in Tones, "13" → [right, tries]
  tones: Record<string, [number, number] | undefined>
  // Sounds told apart in the pinyin chart's ear training, by contrast
  // (data/pinyin.ts), "zh-z-j" → [right, tries]
  sounds: Record<string, [number, number] | undefined>
  // Points by day, "2026-10-15" → points
  days: Record<string, number | undefined>
  // Scenes of the trip done, with the best stars
  scenes: Record<string, number | undefined>
  // Scores in the arcade games, by game
  best: Record<string, number | undefined>
  // Seals earned (data/seals.ts), by id: when, ms
  seals: Record<string, number | undefined>
  // Today's session (lib/today.ts): the plan for one day, and how far
  // it has got
  path: Path | null
  // Days whose session in Today was finished, "2026-10-16" → 1
  daily: Record<string, number | undefined>
  // What has grown in the garden (data/garden.ts), by lesson: 1 a
  // sapling or a start, 2 grown. It never shrinks back.
  garden: Record<string, number | undefined>
}

// One day's session: made on the day's first visit to Today, kept so it
// can be taken up again where it was left
export interface Path {
  // The day, "2026-10-16"
  d: string
  // Started, ms
  t: number
  steps: Array<PathStep>
  // Words met and known when it started, and the stability of the words
  // it reviews, for the summary
  met: number
  known: number
  s0: Record<string, number | undefined>
}

export type StepKind = 'review' | 'new' | 'course' | 'trip' | 'game' | 'listen'

export interface PathStep {
  k: StepKind
  // The words it is about (review, new)
  ids?: Array<string>
  // A part of First steps, a scene of the trip, or a game, by id
  arg?: string
  // The day's points when it was opened on its own page, to tell when a
  // scene or a game has been played there
  pts?: number
  // What a step played in Today itself has had answered so far, so it
  // can be left at any point and taken up again (lib/today.ts)
  got?: Array<string>
  // Done or skipped, ms
  done?: number
  skip?: boolean
}

export const emptyBank = (): Bank => ({
  cards: {},
  tones: {},
  sounds: {},
  days: {},
  scenes: {},
  best: {},
  seals: {},
  path: null,
  daily: {},
  garden: {},
})

const DAY = 86_400_000
const FIRST = 0.05 // about an hour
const MIN = 0.02
export const KNOWN = 1.5

export type Level = 0 | 1 | 2

// The chance of remembering, now
export function recall(card: Card, now: number): number {
  const days = Math.max(0, now - card.t) / DAY
  return 1 / (1 + days / (9 * card.s))
}

export function level(card: Card | undefined, now: number): Level {
  if (!card) return 0
  return card.s >= KNOWN && recall(card, now) >= 0.8 ? 2 : 1
}

export const newCard = (now: number, s = FIRST): Card => ({
  s,
  t: now,
  n: 0,
  x: 0,
  i: now,
})

// A card after an answer. `weight` (0–1] is how much the answer says.
export function answer(
  card: Card | undefined,
  right: boolean,
  now: number,
  weight = 1,
): Card {
  const c = card ?? newCard(now)
  const r = recall(c, now)
  if (right) {
    const gain = Math.min(8, 1.1 + 15 * (1 - r))
    return { ...c, s: c.s * (1 + (gain - 1) * weight), t: now, n: c.n + 1 }
  }
  // A real slip (not a weak hint of one) also brings a known word back
  // to pinyin, until it has been got right again
  const cut = c.s * (1 - 0.7 * weight)
  return {
    ...c,
    s: Math.max(MIN, weight >= 0.5 ? Math.min(cut, KNOWN * 0.6) : cut),
    t: now,
    n: c.n + 1,
    x: c.x + 1,
  }
}

// Words the player says they know already: straight to known
export const known = (now: number): Card => ({ ...newCard(now, 4), n: 1 })

export const dayKey = (now: number) => {
  const d = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Days in a row with points, up to today (or yesterday, if today has none
// yet)
export function streak(bank: Bank, now: number): number {
  let n = 0
  let t = now
  if (!bank.days[dayKey(t)]) t -= DAY
  while (bank.days[dayKey(t)]) {
    n++
    t -= DAY
  }
  return n
}

// The words met, by how much they need practice: the faded first, and
// those not seen for a while before those just seen
export function due(bank: Bank, now: number, words: Array<Word> = WORDS) {
  return words
    .filter((w) => bank.cards[w.id])
    .map((w) => {
      const c = bank.cards[w.id] as Card
      return { w, r: recall(c, now), c }
    })
    .sort((a, b) => a.r - b.r)
}

// The next words to meet, in lesson order
export const unmet = (bank: Bank, words: Array<Word> = WORDS) =>
  words.filter((w) => !bank.cards[w.id])

// Words for a round of a game: up to `n` of them, weighted towards those
// that need practice, among the words met that `fit`; if there are too
// few, at most `fresh` new ones in lesson order are added (and should be
// met, and shown as new). Words seen in the last minute are left to last.
export function pick(
  bank: Bank,
  n: number,
  now: number,
  fit: (w: Word) => boolean = () => true,
  random: () => number = Math.random,
  newest = 5,
): { words: Array<Word>; fresh: Array<Word> } {
  const met = due(bank, now).filter(({ w }) => fit(w))
  const scored = met
    .map(({ w, r, c }) => ({
      w,
      score: 1 - r + random() * 0.35 - (now - c.t < 60_000 ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
  const words = scored.slice(0, n).map((s) => s.w)
  const fresh = unmet(bank)
    .filter(fit)
    .slice(0, Math.min(newest, Math.max(0, n - words.length)))
  return { words: [...words, ...fresh], fresh }
}

// The keys of records that may be missing, as in a bank saved before
// they were added
const keysOf = (...rs: Array<object | undefined>) =>
  new Set(rs.flatMap((r) => (r ? Object.keys(r) : [])))

// Two banks made one, for a player with an account on two devices: for
// each card the one seen last, for days and scores the larger, seals
// from both (each at the earlier date), and of two days' sessions the
// later day's, or of the same day's the one further on. A bank saved
// before a field existed (from an older page, or the account's copy)
// is read as having it empty.
export function merge(a: Partial<Bank>, b: Partial<Bank>): Bank {
  const out = emptyBank()
  for (const id of keysOf(a.cards, b.cards)) {
    const x = a.cards?.[id]
    const y = b.cards?.[id]
    out.cards[id] = !x ? y : !y ? x : x.t >= y.t ? x : y
  }
  for (const k of ['days', 'scenes', 'best', 'daily', 'garden'] as const) {
    for (const id of keysOf(a[k], b[k]))
      out[k][id] = Math.max(a[k]?.[id] ?? 0, b[k]?.[id] ?? 0)
  }
  for (const k of ['tones', 'sounds'] as const) {
    for (const id of keysOf(a[k], b[k])) {
      const x = a[k]?.[id] ?? [0, 0]
      const y = b[k]?.[id] ?? [0, 0]
      out[k][id] = x[1] >= y[1] ? x : y
    }
  }
  for (const id of keysOf(a.seals, b.seals)) {
    const x = a.seals?.[id]
    const y = b.seals?.[id]
    out.seals[id] = x === undefined ? y : y === undefined ? x : Math.min(x, y)
  }
  out.path = laterPath(a.path ?? null, b.path ?? null)
  return out
}

// How far a session has got: its steps done, then the answers in the rest
const progress = (p: Path) =>
  p.steps.reduce((n, s) => n + (s.done ? 1000 : (s.got?.length ?? 0)), 0)

function laterPath(a: Path | null, b: Path | null): Path | null {
  if (!a || !b) return a ?? b
  if (a.d !== b.d) return a.d > b.d ? a : b
  return progress(b) > progress(a) ? b : a
}
