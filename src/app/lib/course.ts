import { COURSE, COURSE_VOICE, OWN_LINES, PARTS } from '../data/course.ts'
import { PLAYER_VOICE, SCENES } from '../data/trip.ts'
import { COUNTRIES, WORDS } from '../data/words.ts'
import { READ_AS } from '../data/syllables.ts'
import { plain } from './text.ts'
import { dayKey } from './bank.ts'
import type { Bank } from './bank.ts'
import type { Day, Part, Show } from '../data/course.ts'

// The way through First steps (data/course.ts), kept in the bank with the
// trip's scenes and the stories, so it follows the player to any device:
// "start:1a" is when a part was last done, in ms (store.setScene keeps
// the later). Whether the course is shown on the home screen is kept
// there too, as the time it was last hidden and last shown again: the
// later of the two wins, on any device.

export const partKey = (id: string) => `start:${id}`
const HIDDEN = 'start-hidden'
const SHOWN = 'start-shown'

export const doneAt = (bank: Bank, id: string) => bank.scenes[partKey(id)]

export const isDone = (bank: Bank, id: string) => !!doneAt(bank, id)

export const dayOf = (part: Part): Day =>
  COURSE.find((d) => d.parts.includes(part)) as Day

export const dayDone = (bank: Bank, day: Day) =>
  day.parts.every((p) => isDone(bank, p.id))

// The next part to take, in order; none once all are done
export const nextPart = (bank: Bank): Part | null =>
  PARTS.find((p) => !isDone(bank, p.id)) ?? null

export const partsDone = (bank: Bank) =>
  PARTS.filter((p) => isDone(bank, p.id)).length

export const finished = (bank: Bank) => partsDone(bank) === PARTS.length

export const started = (bank: Bank) => partsDone(bank) > 0

// A day is meant for one sitting: once one is done, the next is for
// tomorrow. It can still be taken today.
export function restToday(bank: Bank, now: number): Day | null {
  const next = nextPart(bank)
  if (!next) return null
  const day = dayOf(next)
  if (day.parts[0] !== next || day.n === 1) return null
  const before = COURSE[day.n - 2]
  const last = Math.max(...before.parts.map((p) => doneAt(bank, p.id) ?? 0))
  return dayKey(last) === dayKey(now) ? day : null
}

// The parts Today's session carries (lib/today.ts): what is left of the
// day the course is on, while it is offered and not resting until
// tomorrow
export function partsToday(bank: Bank, now: number): Array<Part> {
  const next = offered(bank) && !restToday(bank, now) ? nextPart(bank) : null
  return next ? dayOf(next).parts.filter((p) => !isDone(bank, p.id)) : []
}

export const partOf = (id: string | undefined) => PARTS.find((p) => p.id === id)

// The words a part meets
export const wordsOf = (part: Part) =>
  part.screens.flatMap((s) => (s.k === 'meet' ? s.ids : []))

// The key to set to now (store.setScene) to hide the course from the home
// screen, or to show it there again
export const hideKey = (hide: boolean) => (hide ? HIDDEN : SHOWN)

// Past this many words met, a player who has not started the course is
// taken to know the basics, and is not offered it unless they ask
const BEGINNER = 40

// Whether the home screen leads with the course: until it is done, or
// hidden, for a beginner or anyone who has started it or asked for it
export function offered(bank: Bank): boolean {
  if (finished(bank)) return false
  const hid = bank.scenes[HIDDEN] ?? 0
  const shown = bank.scenes[SHOWN] ?? 0
  if (hid > shown) return false
  if (shown || started(bank)) return true
  return WORDS.filter((w) => bank.cards[w.id]).length < BEGINNER
}

// A part asked for from elsewhere (the home screen's card), opened when
// the course's page comes up
let wanted: string | null = null
export const want = (id: string | null) => {
  wanted = id
}
export const takeWanted = () => {
  const id = wanted
  wanted = null
  return id
}

// A line the course plays, with who says it and what it means: a line of
// the trip, in its speaker's voice (a reply in the player's), or one of
// the course's own, in the teacher's
export interface Heard {
  zh: string
  en: string
  voice: string
}

const LINES = new Map<string, Heard>()
for (const s of SCENES)
  for (const step of s.steps) {
    const said =
      step.kind === 'line'
        ? [{ zh: step.zh, en: step.en, voice: s.cast[step.by].voice }]
        : step.options
            .filter((o) => o.right)
            .map((o) => ({ zh: o.zh, en: o.en, voice: PLAYER_VOICE }))
    for (const l of said) if (!LINES.has(l.zh)) LINES.set(l.zh, l)
  }

for (const [zh, en] of Object.entries(OWN_LINES))
  if (!LINES.has(zh)) LINES.set(zh, { zh, en, voice: COURSE_VOICE })

export const lineOf = (zh: string): Heard | undefined => LINES.get(zh)

// The voice words are read in (lib/speech.ts, which this is listed for)
const WORD_VOICE = 'Kore'

// Everything the course plays, for lib/speech.ts (by way of
// data/extra.ts): the words and characters it shows, the syllables, the
// numbers heard, and its lines in their voices, once for each home
// country where one is named. Tone drills, character parts and words met
// are recorded for their own games.
export function courseSpeech(): Array<{
  voice: string
  text: string
  kind: 'word' | 'line' | 'syllable'
  read?: string
}> {
  const out: ReturnType<typeof courseSpeech> = []
  const line = (zh: string) => {
    const l = lineOf(zh)
    if (!l) throw new Error(`Not a line of the trip or the course: ${zh}`)
    const homes = zh.includes('{home}') ? COUNTRIES : [COUNTRIES[0]]
    for (const h of homes)
      out.push({
        voice: l.voice,
        text: plain(zh, { home: h.id }),
        kind: 'line',
      })
  }
  const show = (sh: Show | undefined) => {
    if (!sh) return
    if (sh.k === 'glyphs' || sh.k === 'sum')
      for (const g of sh.k === 'sum' ? sh.parts : sh.items)
        out.push({ voice: WORD_VOICE, text: g.say, kind: 'word' })
    if (sh.k === 'sum')
      out.push({ voice: WORD_VOICE, text: sh.whole, kind: 'word' })
    if (sh.k === 'forms')
      for (const p of sh.pairs)
        out.push({ voice: WORD_VOICE, text: p.s, kind: 'word' })
    if (sh.k === 'sounds')
      for (const s of sh.rows.flat())
        out.push({
          voice: WORD_VOICE,
          text: s,
          kind: 'syllable',
          ...(READ_AS[s] ? { read: READ_AS[s] } : {}),
        })
    if (sh.k === 'lines') sh.zh.forEach(line)
    if (sh.k === 'levels') line(sh.zh)
  }
  for (const p of PARTS)
    for (const s of p.screens) {
      if (s.k === 'read' || s.k === 'ask') show(s.show)
      if (s.k === 'build') s.lines.forEach(line)
      if (s.k === 'ear')
        for (const n of s.numbers ?? [])
          out.push({ voice: WORD_VOICE, text: n, kind: 'word' })
    }
  return out
}
