import { fromItems } from './chat.ts'
import type { Shown } from './chat.ts'
import type { Token } from './text.ts'

// The lines of a chat (games/chat.tsx), as what Gemini Live sends comes
// in. It does not come in order: the learner's words are often heard
// after the partner has begun to answer them (with Talk held, mostly),
// show_line may be called before the partner speaks, in a turn of its
// own, or after, and the voice and its transcript come in pieces. So a
// line is an exchange's half, not a turn: everything the partner sends
// goes on its answer until the learner speaks again, and what the
// learner says, and what show_line heard them say, on the line that
// answer is to.

export interface Line {
  who: 'learner' | 'partner'
  // What was heard, or typed
  text: string
  // The words shown, from show_line
  toks?: Array<Token>
  en?: string
  // What the learner meant, said the right way
  better?: Array<Token>
  // Nothing more is being heard of it just now
  done: boolean
  // The partner's: a turn of it spoken to the end (or spoken over), so
  // what the learner is heard to say next, after a pause, is a new line
  over?: boolean
  // The partner's voice, to hear again
  sound?: Float32Array<ArrayBuffer>
}

type Lines = Array<Line>

const last = (ls: Lines) => ls.at(-1)

const lastOf = (ls: Lines, who: Line['who']) => {
  for (let i = ls.length - 1; i >= 0; i--) if (ls[i].who === who) return i
  return -1
}

const put = (ls: Lines, i: number, l: Partial<Line>) =>
  ls.map((x, k) => (k === i ? { ...x, ...l } : x))

// The partner's answer being given: the last line, if it is the
// partner's. A turn of the partner's may end, with or without its voice,
// before the rest of the answer comes (a call of show_line between), so
// only the learner begins a new line.
function answer(ls: Lines): [Lines, number] {
  if (last(ls)?.who === 'partner') return [ls, ls.length - 1]
  return [[...ls, { who: 'partner', text: '', done: false }], ls.length]
}

// The learner begins a turn by hand (Talk): the partner is done
export const begin = (ls: Lines): Lines => [
  ...ls.map((x) => ({ ...x, done: true, over: x.who === 'partner' || x.over })),
  { who: 'learner', text: '', done: false },
]

// Something typed: a turn of its own
export const typed = (ls: Lines, text: string): Lines => [
  ...ls.map((x) => ({ ...x, done: true, over: x.who === 'partner' || x.over })),
  { who: 'learner', text, done: true },
]

// Some more of what the learner said. With turns by hand, it belongs to
// the turn begun last; else to the line the partner is answering, or a
// new one once the partner has finished.
export function heard(ls: Lines, t: string, manual: boolean): Lines {
  if (manual) {
    const i = lastOf(ls, 'learner')
    if (i >= 0) return put(ls, i, { text: ls[i].text + t })
  }
  const l = last(ls)
  if (l?.who === 'learner') return put(ls, ls.length - 1, { text: l.text + t })
  if (l?.who === 'partner' && !l.over) {
    const i = ls.length - 1
    if (ls[i - 1]?.who === 'learner')
      return put(ls, i - 1, { text: ls[i - 1].text + t })
    return [...ls.slice(0, i), { who: 'learner', text: t, done: true }, l]
  }
  return [...ls, { who: 'learner', text: t, done: false }]
}

// Some more of what the partner says
export function said(ls: Lines, t: string): Lines {
  const [out, i] = answer(ls)
  return put(out, i, { text: out[i].text + t, done: false })
}

// The partner's turn is over, with its sound, if it had any
export function turnEnd(
  ls: Lines,
  sound: Float32Array<ArrayBuffer> | null,
): Lines {
  const out = ls.map((x) => ({ ...x, done: true }))
  const l = last(out)
  if (l?.who !== 'partner' || !sound) return out
  return put(out, out.length - 1, {
    sound: l.sound ? joined(l.sound, sound) : sound,
    over: true,
  })
}

// The learner spoke over the partner
export const interrupted = (ls: Lines): Lines =>
  ls.map((x) => ({ ...x, done: true, over: x.who === 'partner' || x.over }))

function joined(a: Float32Array<ArrayBuffer>, b: Float32Array<ArrayBuffer>) {
  const out = new Float32Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

// The partner's calls are taken as they come
const words = (items: Shown['said']) => {
  const toks = fromItems(items ?? [])
  return toks.length ? toks : undefined
}
const str = (x: unknown) => (typeof x === 'string' && x ? x : undefined)

// What show_line gave: on the answer being given, and what the learner
// said on the line before it
export function show(ls: Lines, s: Shown): Lines {
  let [out, i] = answer(ls)
  out = put(out, i, {
    toks: words(s.said) ?? out[i].toks,
    en: str(s.said_en) ?? out[i].en,
  })
  const toks = words(s.heard)
  // (the partner's first line answers nothing)
  if (!toks || i === 0) return out
  if (out[i - 1].who !== 'learner') {
    out = [
      ...out.slice(0, i),
      { who: 'learner', text: '', done: true },
      ...out.slice(i),
    ]
    i++
  }
  return put(out, i - 1, {
    toks,
    en: str(s.heard_en),
    better: words(s.better),
  })
}
