import { WORDS } from '../data/words.ts'
import type { Word } from '../data/words.ts'

// The word bank: what the player knows, shared by every game. A word is
// three things to remember, learnt apart: the links between its
// character, its sound (pinyin and tones) and its meaning. A word can be
// read at sight and still have a tone that slips, or be understood when
// heard and not yet when seen. Writing is not one of them.
//
// Each link of a word met has a memory, in the manner of FSRS: the
// stability `s` is how many days until the chance of remembering it falls
// to 90 %. A right answer makes it last longer, by more the more it had
// faded (practice spaced out counts for more than practice crammed); a
// wrong one cuts it down. Games weigh their evidence: typing a word's
// pinyin says more than picking its meaning from four.
//
// How a word is shown follows from its links to the character: not met
// yet, in English; met, in hanzi with pinyin; known (both lasting a day
// and a half or more, and not faded much), in hanzi alone.

export type Link = 'hs' | 'hm' | 'sm'

export const LINKS: Array<Link> = ['hs', 'hm', 'sm']

export interface Memory {
  // Stability, in days
  s: number
  // Last answered, ms
  t: number
}

export interface Card {
  // Hanzi and sound: saying the character, knowing it by ear
  hs: Memory
  // Hanzi and meaning: reading it
  hm: Memory
  // Sound and meaning: understanding it said, or written in pinyin
  sm: Memory
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
  // How far each text in the reader (data/reader.ts) is read, by id
  place: Record<string, Place | undefined>
}

export interface Place {
  // The paragraph read up to, from 0
  p: number
  // The word in it, from 0
  w?: number
  // When, ms
  t: number
  // Read to the end, ms: once
  done?: number
}

// One day's session: made on the day's first visit to Today, kept so it
// can be taken up again where it was left
export interface Path {
  // The day, "2026-10-16"
  d: string
  // Started, ms
  t: number
  steps: Array<PathStep>
  // Words met and known when it started, and the stability of each link
  // of the words it reviews ("你好 hs"), for the summary
  met: number
  known: number
  s0: Record<string, number | undefined>
}

// 'game' is no longer planned, but is kept for sessions saved before
export type StepKind =
  'review' | 'new' | 'course' | 'trip' | 'shore' | 'game' | 'listen'

export interface PathStep {
  k: StepKind
  // The words it is about (review, new, shore)
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
  place: {},
})

const DAY = 86_400_000
const FIRST = 0.05 // about an hour
const MIN = 0.02
export const KNOWN = 1.5

export type Level = 0 | 1 | 2

// The chance of remembering, now
export function recall(m: Memory, now: number): number {
  const days = Math.max(0, now - m.t) / DAY
  return 1 / (1 + days / (9 * m.s))
}

// A link known: lasting a day and a half or more, and not faded much
export const holds = (m: Memory, now: number) =>
  m.s >= KNOWN && recall(m, now) >= 0.8

// Hanzi alone once the character brings back both the sound and the
// meaning
export function level(card: Card | undefined, now: number): Level {
  if (!card) return 0
  return holds(card.hs, now) && holds(card.hm, now) ? 2 : 1
}

// A memory after an answer. `weight` (0–1] is how much the answer says.
export function answer(
  m: Memory,
  right: boolean,
  now: number,
  weight = 1,
): Memory {
  const r = recall(m, now)
  if (right) {
    const gain = Math.min(8, 1.1 + 15 * (1 - r))
    return { s: m.s * (1 + (gain - 1) * weight), t: now }
  }
  // A real slip (not a weak hint of one) also takes a known link back
  // below known (and a word back to pinyin), until it has been got right
  // again
  const cut = m.s * (1 - 0.7 * weight)
  return {
    s: Math.max(MIN, weight >= 0.5 ? Math.min(cut, KNOWN * 0.6) : cut),
    t: now,
  }
}

export const newCard = (now: number, s = FIRST): Card => ({
  hs: { s, t: now },
  hm: { s, t: now },
  sm: { s, t: now },
  t: now,
  n: 0,
  x: 0,
  i: now,
})

// A card after an answer about some of its links
export function answerCard(
  card: Card | undefined,
  links: Array<Link>,
  right: boolean,
  now: number,
  weight = 1,
): Card {
  const c = { ...(card ?? newCard(now)), t: now, n: (card?.n ?? 0) + 1 }
  if (!right) c.x++
  for (const l of links) c[l] = answer(c[l], right, now, weight)
  return c
}

// One link set by hand: known, lasting four days, as a word the player says
// they know; or back to learning, lasting a few hours, so that it comes up
// again soon. Never longer or shorter than it was, the other way.
export function setMemory(
  card: Card,
  link: Link,
  isKnown: boolean,
  now: number,
): Card {
  const m = card[link]
  const s = isKnown ? Math.max(m.s, 4) : Math.min(m.s, 0.3)
  return { ...card, [link]: { s, t: now } }
}

// Words the player says they know already: straight to known
export const known = (now: number): Card => ({ ...newCard(now, 4), n: 1 })

// The chance of remembering a word's weakest link, now
export const recallOf = (card: Card, now: number) =>
  Math.min(...LINKS.map((l) => recall(card[l], now)))

// The link of a word that most needs practice: the most faded, or of
// links about as faded, any of them
export function weakest(
  card: Card,
  now: number,
  random: () => number = Math.random,
): Link {
  const by = LINKS.map((l) => ({ l, r: recall(card[l], now) + random() * 0.1 }))
  return by.reduce((a, b) => (b.r < a.r ? b : a)).l
}

// A card as a page from before the links saved it, with one memory for
// the whole word: each link starts from that memory
type Saved = Partial<Card> & { s?: number; t: number }

function upgrade(c: Saved): Card {
  const was: Memory = { s: c.s ?? FIRST, t: c.t }
  return {
    hs: c.hs ?? was,
    hm: c.hm ?? was,
    sm: c.sm ?? was,
    t: c.t,
    n: c.n ?? 0,
    x: c.x ?? 0,
    i: c.i ?? c.t,
  }
}

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
// those not seen for a while before those just seen. By how faded one of
// their links is, or else the weakest.
export function due(
  bank: Bank,
  now: number,
  words: Array<Word> = WORDS,
  link?: Link,
) {
  return words
    .filter((w) => bank.cards[w.id])
    .map((w) => {
      const c = bank.cards[w.id] as Card
      return { w, r: link ? recall(c[link], now) : recallOf(c, now), c }
    })
    .sort((a, b) => a.r - b.r)
}

// The next words to meet, in lesson order
export const unmet = (bank: Bank, words: Array<Word> = WORDS) =>
  words.filter((w) => !bank.cards[w.id])

// Words for a round of a game: up to `n` of them, weighted towards those
// that need practice (in the `link` the game asks about, if it asks about
// one), among the words met that `fit`; if there are too few, at most
// `newest` new ones in lesson order are added (and should be met, and
// shown as new). Words seen in the last minute are left to last.
export function pick(
  bank: Bank,
  n: number,
  now: number,
  {
    fit = () => true,
    link,
    random = Math.random,
    newest = 5,
  }: {
    fit?: (w: Word) => boolean
    link?: Link
    random?: () => number
    newest?: number
  } = {},
): { words: Array<Word>; fresh: Array<Word> } {
  const met = due(bank, now, WORDS, link).filter(({ w }) => fit(w))
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
// each link of a word the memory answered last, for days and scores the
// larger, seals from both (each at the earlier date), and of two days'
// sessions the later day's, or of the same day's the one further on; of
// two places in a text the later, and a text once read to the end stays
// so. A
// bank saved before a field existed (from an older page, or the
// account's copy) is read as having it empty, and a card saved before
// the links as having its one memory in each.
export function merge(a: Partial<Bank>, b: Partial<Bank>): Bank {
  const out = emptyBank()
  for (const id of keysOf(a.cards, b.cards)) {
    const x = a.cards?.[id] && upgrade(a.cards[id])
    const y = b.cards?.[id] && upgrade(b.cards[id])
    out.cards[id] = !x ? y : !y ? x : both(x, y)
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
  for (const id of keysOf(a.place, b.place)) {
    const x = a.place?.[id]
    const y = b.place?.[id]
    const last = !x ? y : !y ? x : y.t > x.t ? y : x
    const done = Math.max(x?.done ?? 0, y?.done ?? 0)
    if (last) out.place[id] = done ? { ...last, done } : last
  }
  return out
}

const later = (a: Memory, b: Memory) => (a.t >= b.t ? a : b)

function both(x: Card, y: Card): Card {
  const last = x.t >= y.t ? x : y
  return {
    ...last,
    hs: later(x.hs, y.hs),
    hm: later(x.hm, y.hm),
    sm: later(x.sm, y.sm),
    i: Math.min(x.i, y.i),
  }
}

// How far a session has got: its steps done, then the answers in the rest
const progress = (p: Path) =>
  p.steps.reduce((n, s) => n + (s.done ? 1000 : (s.got?.length ?? 0)), 0)

function laterPath(a: Path | null, b: Path | null): Path | null {
  if (!a || !b) return a ?? b
  if (a.d !== b.d) return a.d > b.d ? a : b
  return progress(b) > progress(a) ? b : a
}
