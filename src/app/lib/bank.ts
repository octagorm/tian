import { MEET, WORDS } from '../data/words.ts'
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
// faded (practice spaced out counts for more than practice crammed), and
// by more the easier the link has proved (its difficulty `d`, which a
// miss raises and a right answer lowers); a right answer never shortens
// it. A miss cuts it down, but a link held for long keeps more than one
// just learnt, as in FSRS. Games weigh their evidence: typing a word's
// pinyin says more than picking its meaning from four, and a pick from
// fewer choices less than one from more, since it is more often a lucky
// guess (`luck`). These are FSRS's ideas fitted to games, not FSRS
// itself, which grades flashcards by hand. Each answer is logged on the
// card with the chance it was given (`log`), so that the numbers here can
// one day be checked against what was remembered.
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
  // Difficulty, 1–10 (5 middling): how slowly a right answer makes it
  // last longer. Links from before 2026-11-04 have none until next
  // answered, and it is then guessed from their misses (guessD)
  d?: number
  // Times forgotten once it held: a real miss (weight ½ or more) while
  // lasting KNOWN days or more. LEECH of them make the word one that keeps
  // slipping
  l?: number
  // Missed for real since last got right: not known, however long it
  // still lasts, so the pinyin comes back until it is got right again
  f?: 1
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
  // The last LOG answers, oldest first
  log?: Array<LogEntry>
}

// An answer about one link: when (minutes since 1970), the way asked or
// the link, the weight in tenths (negative for a miss), and the link's
// stability (days) and chance of remembering (%) just before. The chance
// beside what happened is what the numbers here can be checked against.
export type LogEntry = [
  min: number,
  how: Dir | Link,
  w: number,
  s: number,
  r: number,
]

export const LOG = 8

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
  // Words put off when they came up as new (the later icon on its card), by id: when, ms.
  // They are met last, after every other word, for LATER days (toMeet)
  later: Record<string, number | undefined>
  // Words forgotten on purpose (Reset on a lesson in the word bank), by
  // id: when, ms. In a merge a card last seen before then is dropped, so
  // another device does not bring the word back; met again, it is new.
  gone: Record<string, number | undefined>
  // When everything was last reset (Settings), ms: a bank that has not
  // seen the reset gives way to one that has (merge)
  since: number
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
  gone: {},
  since: 0,
})

const DAY = 86_400_000
const FIRST = 0.05 // about an hour
const MIN = 0.02
// What a right answer leaves a link with at the least, in days, for an
// answer of full weight: as FSRS starts a card from its first grade, not
// from nothing. A word met and got right is likely remembered the day
// after; grown from an hour, it was taken as forgotten by then, and took
// two reviews more to hold. Not for a link missed since it was last got
// right (the question that comes back in the same round).
const RIGHT = 0.5
export const KNOWN = 1.5

export type Level = 0 | 1 | 2

// The chance of remembering, now
export function recall(m: Memory, now: number): number {
  const days = Math.max(0, now - m.t) / DAY
  return 1 / (1 + days / (9 * m.s))
}

// A link known: lasting a day and a half or more, not faded much, and
// not missed since last got right
export const holds = (m: Memory, now: number) =>
  !m.f && m.s >= KNOWN && recall(m, now) >= 0.8

// A word missed this many times once it held keeps slipping (a leech, in
// FSRS's words): worth a closer look, a mnemonic, or putting off
export const LEECH = 4

// Times the word's links were forgotten once they held: the most of them
export const lapses = (card: Card | undefined) =>
  card ? Math.max(...LINKS.map((l) => card[l].l ?? 0)) : 0

export const slipping = (card: Card | undefined) => lapses(card) >= LEECH

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

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x))
const round3 = (n: number) => Math.round(n * 1000) / 1000

// How much a right answer grows a link of difficulty `d`, against a
// middling one: half as much again at 1, a little over a third at 10.
// FSRS's (11 − d), made gentler, since a game's answer says less than a
// flashcard graded by hand.
export const ease = (d: number) => (13 - d) / 8

// Difficulty after an answer, by its weight. A miss raises it a good deal
// and a right answer lowers it a little, so it settles at 5 for a link
// missed about one time in five.
export function nextD(d: number, right: boolean, weight: number): number {
  return right
    ? clamp(d - (0.6 * weight * (d - 1)) / 9, 1, 10)
    : clamp(d + (2 * weight * (10 - d)) / 9, 1, 10)
}

// The stability after a full miss, as FSRS has it: more is kept the longer
// it had lasted, and the more it had faded when missed (forgetting after
// a long while says less than forgetting soon). Never more than it had.
export function fallTo(s: number, r: number): number {
  const kept = 1.5 * (Math.pow(s + 1, 0.26) - 1) * Math.exp(1.6 * (1 - r))
  return clamp(kept, MIN, s)
}

// A link's difficulty from before difficulty was kept: from how often it
// was missed either way, or the whole word's misses, leaning on one in
// five while there are few answers
export function guessD(card: Card | undefined, link: Link): number {
  let x = 0
  let n = 0
  for (const d of DIRS)
    if (LINK_OF_DIR[d] === link && card?.d?.[d]) {
      x += card.d[d][0]
      n += card.d[d][1]
    }
  if (n < 1 && card) {
    x = card.x
    n = card.n
  }
  const rate = (x + 0.4) / (n + 2)
  return round3(clamp(5 + 12 * (rate - 0.2), 1, 10))
}

// A memory after an answer. `weight` (0–1] is how much the answer says.
// `d` is the difficulty to go by when the memory has none yet.
export function answer(
  m: Memory,
  right: boolean,
  now: number,
  weight = 1,
  d = 5,
): Memory {
  const r = recall(m, now)
  const d0 = m.d ?? d
  const keep = m.l ? { l: m.l } : {}
  if (right) {
    const gain = Math.min(8, 1.1 + 15 * (1 - r))
    const grown = m.s * (1 + (gain - 1) * weight * ease(d0))
    return {
      s: round3(m.f ? grown : Math.max(grown, RIGHT * weight)),
      t: now,
      d: round3(nextD(d0, true, weight)),
      ...keep,
    }
  }
  // A weak hint of a slip cuts it a little, a real miss down to what a
  // full miss leaves. A real miss also takes a known link back below
  // known (and a word back to pinyin) until it is got right again, and
  // counts as a lapse when the link had held.
  const real = weight >= 0.5
  const lapse = real && !m.f && m.s >= KNOWN
  const s = m.s - (m.s - fallTo(m.s, r)) * weight
  return {
    s: round3(Math.max(MIN, s)),
    t: now,
    d: round3(nextD(d0, false, weight)),
    ...(lapse ? { l: (m.l ?? 0) + 1 } : keep),
    ...(real || m.f ? { f: 1 as const } : {}),
  }
}

// How much a right pick says, by how many choices it was picked from:
// the weights the games give are for four, a pick from two says a third
// less (half of them are luck), and one from more a little more. A miss
// says as much whatever the choices. Typed answers have no choices.
export function luck(weight: number, right: boolean, choices?: number) {
  if (!right || !choices || choices < 2) return weight
  return Math.min(1, (weight * (1 - 1 / choices)) / (1 - 1 / 4))
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
  const log = [...(c.log ?? [])]
  for (const l of links) {
    const m = c[l]
    log.push([
      Math.round(now / 60_000),
      dir ?? l,
      Math.round(weight * 10) * (right ? 1 : -1),
      Math.round(m.s * 100) / 100,
      Math.round(recall(m, now) * 100),
    ])
    c[l] = answer(m, right, now, weight, guessD(card, l))
  }
  if (!right) c.x++
  if (dir) c.d = { ...c.d, [dir]: tally(c.d?.[dir], right, now, weight) }
  c.log = log.slice(-LOG)
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

// One link set by hand: known, lasting some weeks, as a word the player
// says they know; or back to learning, lasting a few hours, so that it
// comes up again soon. Never longer or shorter than it was, the other way.
export function setMemory(
  card: Card,
  link: Link,
  isKnown: boolean,
  now: number,
  random: () => number = Math.random,
): Card {
  const m = card[link]
  const s = isKnown ? Math.max(m.s, said(random)) : Math.min(m.s, 0.3)
  const keep = { ...(m.d ? { d: m.d } : {}), ...(m.l ? { l: m.l } : {}) }
  return { ...card, [link]: { s, t: now, ...keep } }
}

// How long a link said to be known lasts, in days: long enough that it is
// not asked about for some weeks, and not the same for every word, so that
// words marked together do not all fade on one day
const SAID = 20
const said = (random: () => number) => round3(SAID * (1 + random()))

// Words the player says they know already: straight to known
export function known(now: number, random: () => number = Math.random): Card {
  const c = newCard(now)
  for (const l of LINKS) c[l] = { s: said(random), t: now }
  return { ...c, n: 1 }
}

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
    ...(c.log ? { log: c.log } : {}),
  }
}

// A day turns at three in the night, not at midnight (the user's choice,
// as in Hola), so that a session late in the evening is not cut in two, and
// one finished at half past twelve counts for the day it was begun
export const TURN = 3 * 3_600_000

// The day an instant belongs to, as a date on the player's clock at noon
export const dayDate = (now: number) => {
  const d = new Date(now - TURN)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
}

const keyOf = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const dayKey = (now: number) => keyOf(dayDate(now))

// Days in a row with points, up to today (or yesterday, if today has none
// yet). Counted by the calendar, so that a change to or from summer time
// neither skips a day nor counts one twice.
export function streak(bank: Bank, now: number): number {
  const d = dayDate(now)
  const back = () => d.setDate(d.getDate() - 1)
  let n = 0
  if (!bank.days[keyOf(d)]) back()
  while (bank.days[keyOf(d)]) {
    n++
    back()
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

// A word learnt: both links to its character have lasted KNOWN days or
// more, and neither was missed since. It stays learnt while it fades, so
// that words known and left alone for a while, such as those marked known
// together, do not take the place of new ones: they are reviewed, not
// learnt again.
export const learnt = (c: Card) =>
  !c.hs.f && !c.hm.f && c.hs.s >= KNOWN && c.hm.s >= KNOWN

// Words met and not yet learnt
export function inWork(bank: Bank): number {
  let n = 0
  for (const c of Object.values(bank.cards)) if (c && !learnt(c)) n++
  return n
}

// Below this chance of remembering, a word is fading
export const FADING = 0.85

// Words fading: what there is to review
export function fading(bank: Bank, now: number): number {
  let n = 0
  for (const c of Object.values(bank.cards))
    if (c && recallOf(c, now) < FADING) n++
  return n
}

// With more words fading than this, about two days of Today's review, no
// new ones are brought: more words than can be reviewed are all half
// remembered
export const BEHIND = 40

// How many new words may be met now
export const room = (bank: Bank, now: number, of = cap) =>
  fading(bank, now) > BEHIND ? 0 : Math.max(0, of - inWork(bank))

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
    ? [...first, ...MEET.filter((w) => !seen.has(w.id))]
    : MEET
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
export function merge(one: Partial<Bank>, other: Partial<Bank>): Bank {
  const out = emptyBank()
  out.since = Math.max(one.since ?? 0, other.since ?? 0)
  const a = after(one, out.since)
  const b = after(other, out.since)
  for (const id of keysOf(a.gone, b.gone))
    out.gone[id] = Math.max(a.gone?.[id] ?? 0, b.gone?.[id] ?? 0)
  for (const id of keysOf(a.cards, b.cards)) {
    const x = a.cards?.[id] && upgrade(a.cards[id])
    const y = b.cards?.[id] && upgrade(b.cards[id])
    const c = !x ? y : !y ? x : both(x, y)
    // a word put off or forgotten, on either device, since it was last seen
    const put = Math.max(
      a.later?.[id] ?? 0,
      b.later?.[id] ?? 0,
      out.gone[id] ?? 0,
    )
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

// A bank that has not seen the last reset is from before it: of it, only
// the words seen since are kept
function after(bank: Partial<Bank>, since: number): Partial<Bank> {
  if ((bank.since ?? 0) >= since) return bank
  const cards: Bank['cards'] = {}
  for (const [id, c] of Object.entries(bank.cards ?? {}))
    if (c && c.t > since) cards[id] = c
  return { cards }
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

// The answers logged on either device, each once, the last LOG of them
function bothLogs(x: Card, y: Card): Card['log'] {
  if (!x.log || !y.log) return x.log ?? y.log
  const seen = new Map<string, LogEntry>()
  for (const e of [...x.log, ...y.log]) seen.set(`${e[0]} ${e[1]}`, e)
  return [...seen.values()].sort((a, b) => a[0] - b[0]).slice(-LOG)
}

function both(x: Card, y: Card): Card {
  const last = x.t >= y.t ? x : y
  const d = laterWays(x, y)
  const log = bothLogs(x, y)
  return {
    ...last,
    hs: later(x.hs, y.hs),
    hm: later(x.hm, y.hm),
    sm: later(x.sm, y.sm),
    i: Math.min(x.i, y.i),
    ...(d ? { d } : {}),
    ...(log ? { log } : {}),
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
