import { SCENES } from '../data/trip'
import { DAILY_GAMES, STEP, partKey, progressOf } from '../lib/today'
import { GAMES } from '../registry'
import { touchOnly } from '../lib/device'
import type { PathStep } from '../lib/bank'

// A step of the day's session in words, for the ring, the card and the
// page

export interface StepText {
  title: string
  zh: string
  glyph: string
  detail: string
  minutes: number
}

export const gameOf = (id: string | undefined) => GAMES.find((g) => g.id === id)

// The games the session takes turns with, of those this page has, but
// not one that needs a keyboard on a phone
export const DAILY_GAMES_HERE = DAILY_GAMES.filter((id) => {
  const g = gameOf(id)
  return g && !(touchOnly() && 'keyboard' in g)
})

export function describe(step: PathStep): StepText {
  const base = STEP[step.k]
  const ids = step.ids ?? []
  const n = ids.length
  const words = `${n} ${n === 1 ? 'word' : 'words'}`
  // Left partway, to be taken up where it was
  const { done, of } = progressOf(step)
  const started = !step.done && done > 0
  const got = new Set(step.got)
  const met = ids.filter((id) => got.has(partKey(id, 'met'))).length
  const detail =
    step.k === 'review'
      ? started
        ? `${of - done} of ${words} left`
        : step.arg === 'warm'
          ? `${words} to warm up with`
          : `${words} that are fading`
      : step.k === 'new'
        ? !started
          ? `${words} to meet`
          : done === met
            ? `Met ${met} of ${n}, then a short quiz`
            : `A short quiz on them: ${of - done} of ${2 * n} left`
        : step.k === 'trip'
          ? (SCENES.find((s) => s.id === step.arg)?.title ?? 'The next scene')
          : step.k === 'game'
            ? (gameOf(step.arg)?.title ?? 'A game')
            : started
              ? `${of - done} of ${of} still to hear`
              : 'Hear it, and pick what it means'
  return { ...base, detail }
}
