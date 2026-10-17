import { WORD, WORDS } from '../data/words.ts'
import { SCENES } from '../data/trip.ts'
import { dayKey, due, level, recall, streak, unmet } from './bank.ts'
import { isDone, offered, partOf, partsToday, wordsOf } from './course.ts'
import type { Bank, Path, PathStep, StepKind } from './bank.ts'

// Today: a session of about ten minutes, made once a day from the bank
// and kept in it (bank.path), so it can be taken up again where it was
// left, on any device, even halfway through a step. In order: the words
// that are fading, a few new ones, the next scene of the trip or a game
// picked for variety, and a little listening; then a summary. For a
// beginner taking First steps (lib/course.ts), the parts of the course's
// day stand in for all but the review, so the course is the session.

export const STEP: Record<
  StepKind,
  { title: string; zh: string; minutes: number; glyph: string }
> = {
  review: { title: 'Review', zh: '复习', minutes: 3, glyph: '复' },
  new: { title: 'New words', zh: '新词', minutes: 2, glyph: '新' },
  // A part's own minutes are in data/course.ts
  course: { title: 'First steps', zh: '入门', minutes: 4, glyph: '入' },
  trip: { title: 'The trip', zh: '旅行', minutes: 4, glyph: '旅' },
  game: { title: 'A game', zh: '游戏', minutes: 3, glyph: '玩' },
  listen: { title: 'Listening', zh: '听力', minutes: 1, glyph: '听' },
}

// Games the session picks from, one a day in turn; the page leaves out any
// that are not in the registry
export const DAILY_GAMES = [
  'mahjong',
  'rain',
  'shop',
  'tones',
  'numbers',
  'order',
  'parts',
  'stories',
  'quest',
  'bridge',
  'sayings',
  'write',
]

// Words to review: those fading, the most faded first
const REVIEW = 8
// Below this chance of remembering, a word is fading
export const FADING = 0.85
// A scene or a game counts as played after this many points from it
const PLAYED_TRIP = 6
const PLAYED_GAME = 3

const DAY = 86_400_000

// Days since 1970 on the player's clock, to take turns by
const dayNumber = (now: number) => {
  const d = new Date(now)
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY)
}

// The day's plan, made from the bank as it is now
export function plan(
  bank: Bank,
  now: number,
  games: Array<string> = DAILY_GAMES,
): Path {
  const list = due(bank, now)
  const fading = list.filter((d) => d.r < FADING)
  // At least a few words to warm up with, even when none are fading
  const review = (fading.length >= 4 ? fading : list.slice(0, 4))
    .slice(0, REVIEW)
    .map((d) => d.w)
  const newCount =
    list.length === 0
      ? 5
      : fading.length >= 20
        ? 2
        : fading.length >= 10
          ? 3
          : 4
  const fresh = unmet(bank).slice(0, newCount)
  // While the course is offered, what is left of its day takes the place
  // of new words, the trip or a game, and listening: its parts meet words
  // of their own, and play them. Once a day of it is done, the next is for
  // tomorrow, and a session made later that day is the usual one.
  const course = partsToday(bank, now)
  const n = dayNumber(now)
  const next = SCENES.find((s) => !bank.scenes[s.id])
  // The trip two days in three while it lasts, and every day while fewer
  // than thirty words are met, as it is where words are met in use
  const trip = next && (list.length < 30 || n % 3 !== 2)
  const game = games.length ? games[n % games.length] : undefined

  const steps: Array<PathStep> = []
  if (review.length)
    steps.push({
      k: 'review',
      ids: review.map((w) => w.id),
      // none fading: a warm-up with the words seen longest ago
      ...(fading.length >= 4 ? {} : { arg: 'warm' }),
    })
  if (course.length)
    for (const part of course) steps.push({ k: 'course', arg: part.id })
  else {
    if (fresh.length) steps.push({ k: 'new', ids: fresh.map((w) => w.id) })
    if (trip) steps.push({ k: 'trip', arg: next.id })
    else if (game) steps.push({ k: 'game', arg: game })
    steps.push({ k: 'listen' })
  }

  // How long the words reviewed, and those the course meets that are met
  // already, lasted before
  const s0: Record<string, number> = {}
  for (const w of review) s0[w.id] = bank.cards[w.id]?.s ?? 0
  for (const id of course.flatMap(wordsOf)) {
    const c = bank.cards[id]
    if (c) s0[id] = c.s
  }
  const { met, known } = counts(bank, now)
  return { d: dayKey(now), t: now, steps, met, known, s0 }
}

// Words met and known
export function counts(bank: Bank, now: number) {
  let met = 0
  let known = 0
  for (const w of WORDS) {
    const lv = level(bank.cards[w.id], now)
    if (lv > 0) met++
    if (lv === 2) known++
  }
  return { met, known }
}

// The day's plan if one has been made today
export const todays = (bank: Bank, now: number): Path | null =>
  bank.path && bank.path.d === dayKey(now) ? bank.path : null

// The step to do next, or -1 when all are done
export const current = (p: Path) => p.steps.findIndex((s) => !s.done)

export const finished = (p: Path) => p.steps.every((s) => s.done)

// A part of the course, a scene or a game is played on its own page. A
// part counts as done once the course has it done, wherever it was opened
// from; a scene once it has stars, and a scene or a game once the day's
// points have grown enough since it was opened from here.
export function playedYet(step: PathStep, bank: Bank, now: number): boolean {
  if (step.done) return false
  if (step.k === 'course') return !!step.arg && isDone(bank, step.arg)
  if (step.pts === undefined) return false
  if (step.k === 'trip' && step.arg && bank.scenes[step.arg]) return true
  const gained = (bank.days[dayKey(now)] ?? 0) - step.pts
  if (step.k === 'trip') return gained >= PLAYED_TRIP
  if (step.k === 'game') return gained >= PLAYED_GAME
  return false
}

// A part of the course still to do once the course is hidden is skipped
const dropped = (step: PathStep, bank: Bank) =>
  step.k === 'course' &&
  !step.done &&
  !isDone(bank, step.arg ?? '') &&
  !offered(bank)

// The plan with the steps played elsewhere marked done; the same object
// when nothing changed
export function settle(p: Path, bank: Bank, now: number): Path {
  if (!p.steps.some((s) => playedYet(s, bank, now) || dropped(s, bank)))
    return p
  return {
    ...p,
    steps: p.steps.map((s) =>
      playedYet(s, bank, now)
        ? { ...s, done: now }
        : dropped(s, bank)
          ? { ...s, done: now, skip: true }
          : s,
    ),
  }
}

export const markDone = (
  p: Path,
  i: number,
  now: number,
  skip = false,
): Path => ({
  ...p,
  steps: p.steps.map((s, j) =>
    j === i ? { ...s, done: s.done ?? now, ...(skip ? { skip } : {}) } : s,
  ),
})

// A step changed for another (a game instead of the trip), not done
export const swap = (p: Path, i: number, step: PathStep): Path => ({
  ...p,
  steps: p.steps.map((s, j) => (j === i ? step : s)),
})

// The steps played in Today itself keep what has been answered in `got`,
// so they can be left at any point and taken up again, a few words at a
// time. Review keeps each word answered; new words each word met and its
// two questions ("你好 met", "你好 meaning", "你好 listen"); listening each
// line or word heard.

export const playedHere = (s: PathStep) =>
  s.k === 'review' || s.k === 'new' || s.k === 'listen'

// Lines or words to hear in the listening step
export const LISTEN = 4

export const partKey = (id: string, part: string) => `${id} ${part}`

const NEW_PARTS = ['met', 'meaning', 'listen'] as const

// A step's parts answered, of how many (of the words still in the bank)
export function progressOf(s: PathStep): { done: number; of: number } {
  const got = new Set(s.got)
  if (s.k === 'listen') return { done: Math.min(got.size, LISTEN), of: LISTEN }
  const ids = (s.ids ?? []).filter((id) => WORD[id])
  const keys =
    s.k === 'review'
      ? ids
      : s.k === 'new'
        ? ids.flatMap((id) => NEW_PARTS.map((p) => partKey(id, p)))
        : []
  return { done: keys.filter((k) => got.has(k)).length, of: keys.length }
}

// How much of a step is done, 0–1
export function share(s: PathStep): number {
  if (s.done) return 1
  const { done, of } = progressOf(s)
  return of ? done / of : 0
}

// Every part of a step answered: it is done, even if left before going on
export function allAnswered(s: PathStep): boolean {
  const { done, of } = progressOf(s)
  return of > 0 && done >= of
}

// The plan with one more thing answered in a step
export function gain(p: Path, i: number, key: string): Path {
  const s = p.steps[i]
  if (s.got?.includes(key)) return p
  return swap(p, i, { ...s, got: [...(s.got ?? []), key] })
}

export interface Summary {
  // The words of the session, by how long they will now last, in days:
  // before (null for a word met today) and after
  words: Array<{ id: string; before: number | null; after: number }>
  met: number
  known: number
  metGain: number
  knownGain: number
  streak: number
  points: number
  // Words that will be fading by this time tomorrow
  tomorrow: number
}

export function summary(p: Path, bank: Bank, now: number): Summary {
  const ids = new Set([
    ...(p.steps.find((s) => s.k === 'review')?.ids ?? []),
    ...(p.steps.find((s) => s.k === 'new')?.ids ?? []),
    ...p.steps.flatMap((s) => {
      const part = s.k === 'course' && !s.skip ? partOf(s.arg) : undefined
      return part ? wordsOf(part) : []
    }),
  ])
  const words = [...ids].flatMap((id) => {
    const c = bank.cards[id]
    if (!c) return []
    const before = id in p.s0 ? (p.s0[id] ?? null) : null
    return [{ id, before, after: c.s }]
  })
  const { met, known } = counts(bank, now)
  const tomorrow = WORDS.filter((w) => {
    const c = bank.cards[w.id]
    return c && recall(c, now + DAY) < FADING
  }).length
  return {
    words,
    met,
    known,
    metGain: Math.max(0, met - p.met),
    knownGain: Math.max(0, known - p.known),
    streak: streak(bank, now),
    points: bank.days[dayKey(now)] ?? 0,
    tomorrow,
  }
}

// How long a word's memory lasts, said shortly: the time until it starts
// to fade
export function lasts(s: number): string {
  // Recall falls to FADING after 9s(1/FADING − 1) days
  const days = 9 * s * (1 / FADING - 1)
  if (days < 1 / 24) return 'minutes'
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} h`
  if (days < 60) return `${Math.round(days)} d`
  return `${Math.round(days / 30)} mo`
}
