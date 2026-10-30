import { WORDS } from '../data/words.ts'
import { TOPIC, topicWords } from '../data/topics.ts'
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
// How a word is shown follows from its links (stage, below): always in
// hanzi, with pinyin and English while it is learnt, and alone once known
// (both links to the character lasting a day and a half or more, and not
// faded much).

export type Link = 'hs' | 'hm' | 'sm'

export const LINKS: Array<Link> = ['hs', 'hm', 'sm']

// Each link is asked about one way or the other: from what is shown to
// what is asked for. The character to its sound (h>s, its pinyin typed)
// and back (s>h, the character heard picked), the character to its
// meaning (h>m) and back (m>h), and the sound to its meaning (s>m) and
// back (m>s, the pinyin for a meaning picked). One memory per link is
// kept, but how often each way is missed is counted too, so that a link
// is asked the way that is missed more (questionsFor in quiz.tsx).
export type Dir = 'h>s' | 's>h' | 'h>m' | 'm>h' | 's>m' | 'm>s'

export const LINK_OF_DIR: Record<Dir, Link> = {
  'h>s': 'hs',
  's>h': 'hs',
  'h>m': 'hm',
  'm>h': 'hm',
  's>m': 'sm',
  'm>s': 'sm',
}

export const DIRS = Object.keys(LINK_OF_DIR) as Array<Dir>

export const isDir = (how: string): how is Dir => how in LINK_OF_DIR

// Misses and answers one way, each weighed as its answer is and fading by
// a quarter with each answer after it, so the last few count; and when
// last answered, ms
export type Tally = [x: number, n: number, t: number]

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
  // How often each way of a link was missed, for the ways asked about
  d?: Partial<Record<Dir, Tally>>
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
  // The topics chosen (data/topics.ts), in the order chosen, each with its
  // priority (1–3), and when the choice was last changed: their words are
  // met first
  topics: { on: Array<TopicChoice>; t: number }
  // Words put off when they came up as new («Not yet»), by id: when, ms.
  // They are met last, after every other word, for LATER days (toMeet)
  later: Record<string, number | undefined>
}

export interface TopicChoice {
  id: string
  p: 1 | 2 | 3
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
  topics: { on: [], t: 0 },
  later: {},
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

// How much help a word is shown with, as one number. It is always in
// hanzi: not met (0) and learning (1), with its pinyin over it and its
// English under it; its meaning held, from the character or from the
// sound (2), with the pinyin alone; and known, once the character brings
// back both its meaning and its sound (3), in hanzi alone. A word whose
// character brings back its sound before its meaning keeps all three
// until its meaning holds.
export type Stage = 0 | 1 | 2 | 3

export function stage(card: Card | undefined, now: number): Stage {
  if (!card) return 0
  if (level(card, now) === 2) return 3
  return holds(card.hm, now) || holds(card.sm, now) ? 2 : 1
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

const FADE = 0.75
const round2 = (n: number) => Math.round(n * 100) / 100

// A tally after an answer one way
export function tally(
  was: Tally | undefined,
  right: boolean,
  now: number,
  weight = 1,
): Tally {
  const [x, n] = was ?? [0, 0]
  return [
    round2(x * FADE + (right ? 0 : weight)),
    round2(n * FADE + weight),
    now,
  ]
}

// A card after an answer about some of its links, and the way it was
// asked, when the question had one
export function answerCard(
  card: Card | undefined,
  links: Array<Link>,
  right: boolean,
  now: number,
  weight = 1,
  dir?: Dir,
): Card {
  const c = { ...(card ?? newCard(now)), t: now, n: (card?.n ?? 0) + 1 }
  if (!right) c.x++
  for (const l of links) c[l] = answer(c[l], right, now, weight)
  if (dir) c.d = { ...c.d, [dir]: tally(c.d?.[dir], right, now, weight) }
  return c
}

// How often the player misses each way, over all the words: what a word
// answered seldom one way is taken to be like. Near a fifth until there
// are answers to go by.
export function missRates(cards: Bank['cards']): Record<Dir, number> {
  const sum = Object.fromEntries(DIRS.map((d) => [d, [0.4, 2]])) as Record<
    Dir,
    [number, number]
  >
  for (const c of Object.values(cards))
    for (const d of DIRS) {
      const t = c?.d?.[d]
      if (!t) continue
      sum[d][0] += t[0]
      sum[d][1] += t[1]
    }
  return Object.fromEntries(
    DIRS.map((d) => [d, sum[d][0] / sum[d][1]]),
  ) as Record<Dir, number>
}

// How often a word is missed one way: its own answers, leaning on the
// player's rate that way while it has few
export function missRate(
  card: Card | undefined,
  dir: Dir,
  rates: Record<Dir, number>,
): number {
  const [x, n] = card?.d?.[dir] ?? [0, 0]
  return (x + 2 * rates[dir]) / (n + 2)
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
    ...(c.d ? { d: c.d } : {}),
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

// How many words are learnt at a time: once this many met are not yet
// known, Tian brings no new ones by itself (Today's new words, the trip's
// and the stories', the games' and the quiz's), until some of them hold.
// What the player picks to learn (Learn, a word's «Learn it») is let
// through, and so are the few words a game of its own cannot be played
// without. The player sets it in Settings (`cap`); the store passes it on
// here, so that every game asks the same.
export const CAPS = [30, 50, 80]
let cap = 50
export const setCap = (n: number) => {
  cap = n
}

// Words met and not yet known
export function inWork(bank: Bank, now: number): number {
  let n = 0
  for (const c of Object.values(bank.cards)) if (c && level(c, now) < 2) n++
  return n
}

// How many new words may be met now
export const room = (bank: Bank, now: number, of = cap) =>
  Math.max(0, of - inWork(bank, now))

// Words put off come back to their place after this many days
const LATER = 30

// The words in the order they are met: those of the topics chosen first,
// in rounds of as many from each as its priority, in the order chosen,
// then the rest in lesson order, and those put off lately last
export function toMeet(bank: Bank, now = Date.now()): Array<Word> {
  const put = (w: Word) => now - (bank.later[w.id] ?? -Infinity) < LATER * DAY
  const order = byTopic(bank)
  return [...order.filter((w) => !put(w)), ...order.filter(put)]
}

function byTopic(bank: Bank): Array<Word> {
  const lists = bank.topics.on
    .filter((x) => TOPIC[x.id])
    .map((x) => ({
      p: x.p,
      ws: topicWords(TOPIC[x.id]!).filter((w) => !bank.cards[w.id]),
      at: 0,
    }))
  const first: Array<Word> = []
  const seen = new Set<string>()
  while (lists.some((l) => l.at < l.ws.length))
    for (const l of lists)
      for (let n = 0; n < l.p && l.at < l.ws.length;) {
        const w = l.ws[l.at++]
        if (seen.has(w.id)) continue
        seen.add(w.id)
        first.push(w)
        n++
      }
  return first.length
    ? [...first, ...WORDS.filter((w) => !seen.has(w.id))]
    : WORDS
}

// The next words to meet, in the order they are met
export const unmet = (bank: Bank, words: Array<Word> = toMeet(bank)) =>
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
    .slice(0, Math.min(newest, room(bank, now), Math.max(0, n - words.length)))
  return { words: [...words, ...fresh], fresh }
}

// The keys of records that may be missing, as in a bank saved before
// they were added
const keysOf = (...rs: Array<object | undefined>) =>
  new Set(rs.flatMap((r) => (r ? Object.keys(r) : [])))

// Two banks made one, for a player with an account on two devices: for
// each link of a word the memory answered last (and of each way it was
// asked, the tally answered last), for days and scores the
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
    const c = !x ? y : !y ? x : both(x, y)
    // a word put off, on either device, since it was last seen
    const put = Math.max(a.later?.[id] ?? 0, b.later?.[id] ?? 0)
    if (c && (!put || put < c.t)) out.cards[id] = c
  }
  for (const id of keysOf(a.later, b.later))
    out.later[id] = Math.max(a.later?.[id] ?? 0, b.later?.[id] ?? 0)
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
  const ta = a.topics?.on ? a.topics : out.topics
  const tb = b.topics?.on ? b.topics : out.topics
  out.topics = tb.t > ta.t ? tb : ta
  return out
}

const later = (a: Memory, b: Memory) => (a.t >= b.t ? a : b)

// Of two tallies one way, the one answered last
function laterWays(x: Card, y: Card): Card['d'] {
  if (!x.d || !y.d) return x.d ?? y.d
  const d: Card['d'] = {}
  for (const k of DIRS) {
    const a = x.d[k]
    const b = y.d[k]
    const last = !a ? b : !b ? a : b[2] > a[2] ? b : a
    if (last) d[k] = last
  }
  return d
}

function both(x: Card, y: Card): Card {
  const last = x.t >= y.t ? x : y
  const d = laterWays(x, y)
  return {
    ...last,
    hs: later(x.hs, y.hs),
    hm: later(x.hm, y.hm),
    sm: later(x.sm, y.sm),
    i: Math.min(x.i, y.i),
    ...(d ? { d } : {}),
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
