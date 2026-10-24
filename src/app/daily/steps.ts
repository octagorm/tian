import { SCENES } from '../data/trip'
import { STEP, partKey, progressOf } from '../lib/today'
import { dayOf, partOf } from '../lib/course'
import { GAMES } from '../registry'
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

export function describe(step: PathStep): StepText {
  const base = STEP[step.k]
  const part = step.k === 'course' ? partOf(step.arg) : undefined
  const day = part && dayOf(part)
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
      : step.k === 'shore'
        ? started
          ? `${of - done} of ${words} left`
          : step.arg === 'warm'
            ? `${words} more, each by its weakest link`
            : `${words} slipping, each by its weakest link`
        : step.k === 'new'
          ? !started
            ? `${words} to meet`
            : done === met
              ? `Met ${met} of ${n}, then a short quiz`
              : `A short quiz on them: ${of - done} of ${2 * n} left`
          : step.k === 'course'
            ? part && day
              ? `First steps, day ${day.n} · part ${day.parts.indexOf(part) + 1} of ${day.parts.length}`
              : 'The next part'
            : step.k === 'trip'
              ? (SCENES.find((s) => s.id === step.arg)?.title ??
                'The next scene')
              : step.k === 'game'
                ? (gameOf(step.arg)?.title ?? 'A game')
                : started
                  ? `${of - done} of ${of} still to hear`
                  : 'Hear it, and pick what it means'
  // A part of the course goes by its own title
  return {
    ...base,
    ...(part ? { title: part.title, minutes: part.minutes } : {}),
    detail,
  }
}
