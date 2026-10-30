import { WORD, WORDS } from '../data/words.ts'
import { SCENES } from '../data/trip.ts'
import {
  LINKS,
  dayKey,
  due,
  level,
  recallOf,
  room,
  streak,
  unmet,
} from './bank.ts'
import { isDone, offered, partOf, partsToday, wordsOf } from './course.ts'
import type { Bank, Link, Path, PathStep, StepKind } from './bank.ts'

// Today: a session of about ten minutes, made once a day from the bank
// and kept in it (bank.path), so it can be taken up again where it was
// left, on any device, even halfway through a step. In order: the words
// that are fading, a few new ones, the next scene of the trip or a second
// round of the words slipping most, and a little listening; then a
// summary. For a
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
  shore: { title: 'Shore up', zh: '巩固', minutes: 3, glyph: '固' },
  game: { title: 'A game', zh: '游戏', minutes: 3, glyph: '玩' },
  listen: { title: 'Listening', zh: '听力', minutes: 1, glyph: '听' },
}

// Words to review: those fading, the most faded first
const REVIEW = 8
// Words to shore up, after those reviewed: the next most faded, each
// asked about its weakest link; fewer than SHORE_MIN and there is no step
const SHORE = 8
const SHORE_MIN = 4
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

// The step shoring up words: the most faded by their weakest link, after
// those the review has, whether fading yet or not (then it is 'warm');
// none if too few are met
export function shoreUp(
  bank: Bank,
  now: number,
  reviewed: Array<string>,
): PathStep | null {
  const skip = new Set(reviewed)
  const list = due(bank, now)
    .filter((d) => !skip.has(d.w.id))
    .slice(0, SHORE)
  if (list.length < SHORE_MIN) return null
  return {
    k: 'shore',
    ids: list.map((d) => d.w.id),
    ...(list[0].r < FADING ? {} : { arg: 'warm' }),
  }
}

// The day's plan, made from the bank as it is now
export function plan(bank: Bank, now: number): Path {
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
  // none once as many words are being learnt as the player wants at a time
  const fresh = unmet(bank).slice(0, Math.min(newCount, room(bank, now)))
  // While the course is offered, what is left of its day takes the place
  // of new words, the trip or a game, and listening: its parts meet words
  // of their own, and play them. Once a day of it is done, the next is for
  // tomorrow, and a session made later that day is the usual one.
  const course = partsToday(bank, now)
  const n = dayNumber(now)
  const next = SCENES.find((s) => !bank.scenes[s.id])
  // The trip two days in three while it lasts, and every day while fewer
  // than thirty words are met, as it is where words are met in use. On
  // the other days, a second round of the words that are slipping, played
  // here, in place of a game: a game played on its own page has no end
  // to lead back from, and the listening after it was easily missed.
  const trip = next && (list.length < 30 || n % 3 !== 2)
  const shore = trip
    ? null
    : shoreUp(
        bank,
        now,
        review.map((w) => w.id),
      )

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
    else if (shore) steps.push(shore)
    steps.push({ k: 'listen' })
  }

  // How long each link of the words reviewed, and of those the course
  // meets that are met already, lasted before
  const s0: Record<string, number> = {}
  for (const id of [
    ...review.map((w) => w.id),
    ...(shore?.ids ?? []),
    ...course.flatMap(wordsOf),
  ]) {
    const c = bank.cards[id]
    if (c) for (const l of LINKS) s0[partKey(id, l)] = c[l].s
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

// The day's plan with its new words taken again, in the order the topics
// chosen now give, if none of them has been begun on
export function retopic(p: Path, bank: Bank): Path {
  const i = p.steps.findIndex((s) => s.k === 'new')
  if (i < 0) return p
  const s = p.steps[i]
  if (s.done || s.got?.length) return p
  const ids = unmet(bank)
    .slice(0, s.ids?.length ?? 0)
    .map((w) => w.id)
  return { ...p, steps: p.steps.map((x, j) => (j === i ? { ...x, ids } : x)) }
}

// The day's plan if one has been made today
export const todays = (bank: Bank, now: number): Path | null =>
  bank.path && bank.path.d === dayKey(now) ? bank.path : null

// The step to do next, or -1 when all are done
export const current = (p: Path) => p.steps.findIndex((s) => !s.done)

// The page a step played elsewhere is on, by its hash
export const pageOf = (step: PathStep): string | undefined =>
  step.k === 'course'
    ? 'start'
    : step.k === 'trip'
      ? 'trip'
      : step.k === 'game'
        ? step.arg
        : undefined

// The step of the session that the page open is for, as the way back to
// Today shows it (daily/TodayDock.tsx): one still to play, or else one
// played in the last half hour; -1 for none. Every part of the course is
// on one page, so with a part open only its own step is: that step
// whether it was opened from Today or not, and no other part done
// before it.
export function dockStep(
  p: Path,
  page: string,
  part: string | null,
  now: number,
): number {
  const here = p.steps.map(
    (s) =>
      !s.skip &&
      pageOf(s) === page &&
      (s.k === 'course' && part ? s.arg === part : s.pts !== undefined),
  )
  const toPlay = p.steps.findIndex((s, i) => here[i] && !s.done)
  if (toPlay >= 0) return toPlay
  const lately = p.steps.flatMap((s, i) =>
    here[i] && s.done && now - s.done < 30 * 60_000 ? [i] : [],
  )
  return lately.at(-1) ?? -1
}

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

// A step changed for another (words to shore up instead of the trip),
// not done
export const swap = (p: Path, i: number, step: PathStep): Path => ({
  ...p,
  steps: p.steps.map((s, j) => (j === i ? step : s)),
})

// The trip put off for a round of the words slipping most, with how long
// each link of them lasted before, for the summary; the same plan when
// there are too few
export function shoreInstead(
  p: Path,
  i: number,
  bank: Bank,
  now: number,
): Path {
  const reviewed = p.steps.flatMap((s) =>
    s.k === 'review' ? (s.ids ?? []) : [],
  )
  const step = shoreUp(bank, now, reviewed)
  if (!step) return p
  const s0 = { ...p.s0 }
  for (const id of step.ids ?? []) {
    const c = bank.cards[id]
    if (c) for (const l of LINKS) s0[partKey(id, l)] ??= c[l].s
  }
  return { ...swap(p, i, step), s0 }
}

// The steps played in Today itself keep what has been answered in `got`,
// so they can be left at any point and taken up again, a few words at a
// time. Review and shoring up keep each word answered; new words each
// word met and its
// two questions ("你好 met", "你好 meaning", "你好 listen"); listening each
// line or word heard.

export const playedHere = (s: PathStep) =>
  s.k === 'review' || s.k === 'shore' || s.k === 'new' || s.k === 'listen'

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
    s.k === 'review' || s.k === 'shore'
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
  // The words of the session, each by its link that grew most, and how
  // long that will now last, in days: before (null for a word met today)
  // and after
  words: Array<{
    id: string
    link: Link
    before: number | null
    after: number
  }>
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
    ...(p.steps.find((s) => s.k === 'shore' && !s.skip)?.ids ?? []),
    ...(p.steps.find((s) => s.k === 'new')?.ids ?? []),
    ...p.steps.flatMap((s) => {
      const part = s.k === 'course' && !s.skip ? partOf(s.arg) : undefined
      return part ? wordsOf(part) : []
    }),
  ])
  const words = [...ids].flatMap((id) => {
    const c = bank.cards[id]
    if (!c) return []
    // (a session planned before the links kept one memory for a word)
    const was = (l: Link) => p.s0[partKey(id, l)] ?? p.s0[id] ?? null
    const grew = (w: { before: number | null; after: number }) =>
      w.before === null ? w.after : w.after / w.before
    const each = LINKS.map((link) => ({
      id,
      link,
      before: was(link),
      after: c[link].s,
    }))
    return [each.reduce((a, b) => (grew(b) > grew(a) ? b : a))]
  })
  const { met, known } = counts(bank, now)
  const tomorrow = WORDS.filter((w) => {
    const c = bank.cards[w.id]
    return c && recallOf(c, now + DAY) < FADING
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
