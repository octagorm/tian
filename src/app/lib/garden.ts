import { LESSONS, WORDS } from '../data/words.ts'
import { GARDEN_ITEMS, itemOf } from '../data/garden.ts'
import { level } from './bank.ts'
import type { Bank } from './bank.ts'
import type { GardenItem } from '../data/garden.ts'

// How the garden grows: each lesson's thing starts (stage 1) once its
// words are under way, a third of the way to known, and is grown
// (stage 2) when four in five of them are known. What has grown is kept
// in the bank (bank.garden) and never shrinks, so a word that fades
// does not take a tree away.

export const START = 0.3
export const GROWN = 0.8

export interface LessonGrowth {
  lesson: number
  item: GardenItem
  // Words in the lesson, met and known now
  size: number
  met: number
  known: number
  // Towards the next stage, 0–1
  toward: number
  // As grown now, and as kept (never less than before)
  now: number
  stage: number
}

export function growth(bank: Bank, now: number): Array<LessonGrowth> {
  const out: Array<LessonGrowth> = []
  for (const l of LESSONS) {
    const item = itemOf(l.n)
    if (!item) continue
    const ws = WORDS.filter((w) => w.lesson === l.n)
    let met = 0
    let known = 0
    for (const w of ws) {
      const lv = level(bank.cards[w.id], now)
      if (lv > 0) met++
      if (lv === 2) known++
    }
    const size = ws.length || 1
    const started = (known + 0.5 * (met - known)) / size
    const grownBy = known / size
    const stageNow = grownBy >= GROWN ? 2 : started >= START ? 1 : 0
    const stage = Math.max(stageNow, bank.garden[String(l.n)] ?? 0)
    const toward =
      stage >= 2
        ? 1
        : stage === 1
          ? Math.min(1, grownBy / GROWN)
          : Math.min(1, started / START)
    out.push({
      lesson: l.n,
      item,
      size,
      met,
      known,
      toward,
      now: stageNow,
      stage,
    })
  }
  return out
}

// The stages to show, by item id
export function gardenStages(bank: Bank, now: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const g of growth(bank, now)) if (g.stage) out[g.item.id] = g.stage
  return out
}

// Lessons whose thing has grown further than the bank has kept: what to
// add to bank.garden
export function newGrowth(bank: Bank, now: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const g of growth(bank, now))
    if (g.now > (bank.garden[String(g.lesson)] ?? 0))
      out[String(g.lesson)] = g.now
  return out
}

export const grownCount = (bank: Bank) =>
  Object.values(bank.garden).filter((s) => s === 2).length

// Everything there is to grow, given the lessons there are
export const gardenSize = () => Math.min(LESSONS.length, GARDEN_ITEMS.length)
