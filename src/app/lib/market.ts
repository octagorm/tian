import { BACK, COUNTER, DOWN, LOWEST, REPLY } from '../data/market.ts'
import type { Haggle, Stall } from '../data/market.ts'

// How a keeper at the market answers each move (games/market.tsx). They
// stand somewhere on their ladder of prices and come down it: a step when
// asked nicely, two when told a price far over a fair one is too dear,
// part of the way to an offer that is low but not silly. Each push costs
// some of their patience; pushed once more with none left, they wave the
// player off. An offer at or over what they ask, or close enough above
// the lowest they will take, is a deal. Walking away may bring them
// running after with their lowest price, or may not.

export interface HaggleState {
  // Where on the ladder they are
  i: number
  // Pushes they will still take
  left: number
  // They have called the player back once already
  back: boolean
}

export type Move =
  | { k: 'dear' }
  | { k: 'cheaper' }
  | { k: 'offer'; n: number }
  | { k: 'buy' }
  | { k: 'leave' }

export interface Reply {
  // What the keeper says
  zh: string
  state: HaggleState
  // Sold, for this much
  paid?: number
  // Gone without a deal: let go, or waved off
  gone?: 'bye' | 'enough'
  // How it went down with them
  mood?: 'good' | 'cross'
}

export const startState = (s: Stall): HaggleState => ({
  i: 0,
  left: s.patience,
  back: false,
})

// An offer under this share of the lowest price is an insult
const SILLY = 0.7
// The chance of being called back on walking away: low before any
// haggling, better once the price has come down
const CALL_BACK = [0.25, 0.6]

export function respond(
  s: Stall,
  h: Haggle,
  st: HaggleState,
  move: Move,
  random: () => number = Math.random,
): Reply {
  const L = h.ladder
  const last = L.length - 1
  const price = L[st.i]
  const low = L[last]
  const at = (j: number) => (j === last ? LOWEST(L[j]) : DOWN(L[j]))

  // A push: it costs patience, and with none left they have had enough
  const push = (cost: number, i: number, zh: string, cross = false): Reply =>
    st.left <= 0
      ? { zh: REPLY.enough, state: st, gone: 'enough', mood: 'cross' }
      : {
          zh,
          state: { ...st, i, left: Math.max(0, st.left - cost) },
          ...(cross ? { mood: 'cross' as const } : {}),
        }
  const deal = (paid: number, zh: string): Reply => ({
    zh,
    state: st,
    paid,
    mood: 'good',
  })

  switch (move.k) {
    case 'buy':
      return deal(price, REPLY.thanks)
    case 'cheaper':
      return st.i === last
        ? push(1, st.i, REPLY.noLower)
        : push(1, st.i + 1, at(st.i + 1))
    case 'dear': {
      if (price <= s.fair) return push(2, st.i, REPLY.notDear, true)
      const j = Math.min(last, st.i + (price > s.fair * 1.5 ? 2 : 1))
      return push(1, j, at(j))
    }
    case 'offer': {
      const n = move.n
      if (n >= price) return deal(n, REPLY.deal)
      if (n >= low && n >= L[Math.min(last, st.i + 1)])
        return deal(n, REPLY.deal)
      if (n < low * SILLY) return push(2, st.i, REPLY.insult, true)
      if (st.i === last) return push(1, st.i, REPLY.noLower)
      // part of the way down to the offer: the lowest step still above
      // halfway, and at least one
      const half = (price + n) / 2
      let j = st.i + 1
      while (j < last && L[j + 1] >= half) j++
      const zh = j === last ? LOWEST(L[j]) : COUNTER(L[j])
      return push(1, j, zh)
    }
    case 'leave': {
      const chance = CALL_BACK[st.i > 0 ? 1 : 0]
      if (!st.back && st.i < last && st.left > 0 && random() < chance)
        return { zh: BACK(low), state: { ...st, i: last, back: true } }
      return { zh: REPLY.bye, state: st, gone: 'bye' }
    }
  }
}

// Three stars for the lowest they would go, two for a fair price, one
// for paying over it
export const stars = (s: Stall, h: Haggle, paid: number) =>
  paid <= h.ladder.at(-1)! ? 3 : paid <= s.fair ? 2 : 1
