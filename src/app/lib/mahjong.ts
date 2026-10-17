// Mahjong solitaire's rules, apart from how it looks (games/mahjong.tsx).
// Tiles lie in stacked layouts; a tile is free when nothing lies on it
// and its left or right side is open. Free tiles that match are taken
// away in pairs. Deals are made by playing a game forwards, two free tiles
// at a time, so every deal can be cleared.

// A place for a tile, in half-tile steps: a tile covers x to x + 2 and
// y to y + 2, on layer z
export interface Slot {
  x: number
  y: number
  z: number
}

export type LayoutId = 'small' | 'medium' | 'large'

const grid = (
  x0: number,
  y0: number,
  cols: number,
  rows: number,
  z: number,
): Array<Slot> =>
  Array.from({ length: cols * rows }, (_, i) => ({
    x: x0 + (i % cols) * 2,
    y: y0 + Math.floor(i / cols) * 2,
    z,
  }))

export const LAYOUTS: Record<
  LayoutId,
  { name: string; pairs: number; slots: Array<Slot> }
> = {
  // A block of three rows with a smaller block on it, half a tile in
  small: {
    name: 'Small',
    pairs: 12,
    slots: [...grid(0, 0, 6, 3, 0), ...grid(3, 1, 3, 2, 1)],
  },
  // A pyramid of three layers, and a tile at each end of the middle
  medium: {
    name: 'Medium',
    pairs: 18,
    slots: [
      ...grid(0, 0, 6, 4, 0),
      { x: -2, y: 3, z: 0 },
      { x: 12, y: 3, z: 0 },
      ...grid(2, 2, 4, 2, 1),
      ...grid(4, 3, 2, 1, 2),
    ],
  },
  // A wider pyramid of four layers
  large: {
    name: 'Large',
    pairs: 24,
    slots: [
      ...grid(0, 0, 8, 4, 0),
      ...grid(2, 2, 6, 2, 1),
      ...grid(5, 3, 3, 1, 2),
      { x: 7, y: 3, z: 3 },
    ],
  },
}

// Whether the tile in slot i can be taken, given the tiles still there
export function isFree(
  i: number,
  slots: Array<Slot>,
  present: Array<boolean>,
): boolean {
  const s = slots[i]
  let left = false
  let right = false
  for (let j = 0; j < slots.length; j++) {
    if (j === i || !present[j]) continue
    const t = slots[j]
    const overlapY = Math.abs(t.y - s.y) < 2
    if (t.z > s.z && overlapY && Math.abs(t.x - s.x) < 2) return false
    if (t.z === s.z && overlapY) {
      if (t.x === s.x - 2) left = true
      if (t.x === s.x + 2) right = true
    }
  }
  return !(left && right)
}

export const freeSlots = (slots: Array<Slot>, present: Array<boolean>) =>
  slots.flatMap((_, i) => (present[i] && isFree(i, slots, present) ? [i] : []))

// Pairs of free tiles that match, as slot indices
export function freePairs(
  slots: Array<Slot>,
  present: Array<boolean>,
  pairOf: Array<number>,
): Array<[number, number]> {
  const free = freeSlots(slots, present)
  const out: Array<[number, number]> = []
  for (let a = 0; a < free.length; a++)
    for (let b = a + 1; b < free.length; b++)
      if (pairOf[free[a]] === pairOf[free[b]]) out.push([free[a], free[b]])
  return out
}

// A random pick, weighted towards the higher layers, which keeps a deal
// from stranding tiles under a stack
function pickWeighted(
  free: Array<number>,
  slots: Array<Slot>,
  random: () => number,
  not = -1,
): number {
  const options = free.filter((i) => i !== not)
  const weights = options.map((i) => 1 + slots[i].z * 2)
  let r = random() * weights.reduce((a, b) => a + b, 0)
  for (let k = 0; k < options.length; k++) {
    r -= weights[k]
    if (r <= 0) return options[k]
  }
  return options[options.length - 1]
}

function shuffled<T>(xs: Array<T>, random: () => number): Array<T> {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Deals pairs into the slots that are `present` (all, for a new board),
// so that the board can be cleared: returns the pair for each slot (-1
// for slots not dealt), or null if no deal was found
export function deal(
  slots: Array<Slot>,
  pairs: Array<number>,
  random: () => number = Math.random,
  present: Array<boolean> = slots.map(() => true),
): Array<number> | null {
  const n = present.filter(Boolean).length
  if (n !== pairs.length * 2) return null
  for (let attempt = 0; attempt < 400; attempt++) {
    const left = [...present]
    const out = slots.map(() => -1)
    const order = shuffled(pairs, random)
    let ok = true
    for (const pair of order) {
      const free = freeSlots(slots, left)
      if (free.length < 2) {
        ok = false
        break
      }
      const a = pickWeighted(free, slots, random)
      const b = pickWeighted(free, slots, random, a)
      out[a] = pair
      out[b] = pair
      left[a] = false
      left[b] = false
    }
    if (ok) return out
  }
  return null
}

// Whether a board can be cleared from here, by trying (for tests and
// small boards; a deal is clearable by how it is made)
export function solvable(
  slots: Array<Slot>,
  present: Array<boolean>,
  pairOf: Array<number>,
  budget = { steps: 20000 },
): boolean {
  if (!present.some(Boolean)) return true
  if (--budget.steps < 0) return false
  for (const [a, b] of freePairs(slots, present, pairOf)) {
    const next = [...present]
    next[a] = false
    next[b] = false
    if (solvable(slots, next, pairOf, budget)) return true
  }
  return false
}
