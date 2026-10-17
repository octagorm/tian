import { daytimeOf, seasonOf } from '../data/garden'
import { gardenStages, growth } from '../lib/garden'
import type { Bank } from '../lib/bank'
import type { Daytime, Season } from '../data/garden'
import type { LessonGrowth } from '../lib/garden'
import type { Scene } from './draw'

// The garden as it stands for a bank, now: what has grown, the season
// and the hour on the player's clock, and the real moon

// The moon's phase, 0 new to 0.5 full, from a known new moon
export function moonPhase(now: number) {
  const NEW = Date.UTC(2000, 0, 6, 18, 14)
  const MONTH = 29.530588853 * 86_400_000
  return ((((now - NEW) % MONTH) + MONTH) % MONTH) / MONTH
}

export function sceneOf(
  bank: Bank,
  now: number,
  season?: Season,
  daytime?: Daytime,
): Scene {
  const d = new Date(now)
  return {
    season: season ?? seasonOf(d),
    daytime: daytime ?? daytimeOf(d),
    stages: gardenStages(bank, now),
    // to the hundredth, so the scene stays the same from one render to
    // the next and the canvas is not drawn afresh
    moon: Math.round(moonPhase(now) * 100) / 100,
  }
}

// The thing nearest to growing next, if any is left
export function nextToGrow(bank: Bank, now: number): LessonGrowth | null {
  let best: LessonGrowth | null = null
  for (const g of growth(bank, now)) {
    if (g.stage >= 2) continue
    // started ones first, then the nearest
    const score = g.stage + g.toward
    if (!best || score > best.stage + best.toward) best = g
  }
  return best
}
