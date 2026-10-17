import { LESSONS, WORDS } from '../data/words.ts'
import { CITIES, SCENES } from '../data/trip.ts'
import { QUEST } from '../data/quest.ts'
import { SEALS } from '../data/seals.ts'
import { dayKey, level, streak } from './bank.ts'
import { gardenSize, newGrowth } from './garden.ts'
import type { Bank } from './bank.ts'

// What earns each seal (data/seals.ts), read from the bank alone, so a
// seal is earned in whichever game does it, on any device. The store
// calls `award` after every change (lib/store.tsx) and keeps what it
// returns; the album shows `progress` towards the rest.

export interface Progress {
  have: number
  need: number
  // Said instead of "have of need", where that reads badly
  text?: string
}

interface Facts {
  bank: Bank
  now: number
  met: number
  known: number
  // Points today, and the hour on the player's clock
  today: number
  hour: number
  best: (...games: Array<string>) => number
  scenesDone: (ids: Array<string>) => number
}

const facts = (bank: Bank, now: number): Facts => {
  let met = 0
  let known = 0
  for (const w of WORDS) {
    const lv = level(bank.cards[w.id], now)
    if (lv > 0) met++
    if (lv === 2) known++
  }
  const d = new Date(now)
  return {
    bank,
    now,
    met,
    known,
    today: bank.days[dayKey(now)] ?? 0,
    hour: d.getHours(),
    best: (...games) => Math.max(0, ...games.map((g) => bank.best[g] ?? 0)),
    scenesDone: (ids) => ids.filter((id) => bank.scenes[id]).length,
  }
}

const count = (have: number, need: number): Progress => ({
  have: Math.min(have, need),
  need,
})
const once = (done: boolean, text?: string): Progress => ({
  have: done ? 1 : 0,
  need: 1,
  text,
})
const prefixed = (b: Bank, p: string) =>
  Object.keys(b.scenes).filter((k) => k.startsWith(p) && b.scenes[k]).length

// The seals that count for the collector's seals: all but those
const COLLECTOR = ['seals20', 'seals40']
const others = (b: Bank) =>
  Object.keys(b.seals).filter((id) => !COLLECTOR.includes(id) && b.seals[id])
    .length

const city = (id: string) => (f: Facts) => {
  const c = CITIES.find((x) => x.id === id)
  if (!c) return once(false)
  return count(f.scenesDone(c.scenes.map((s) => s.id)), c.scenes.length)
}

const CHECKS: Record<string, ((f: Facts) => Progress) | undefined> = {
  first: (f) => count(f.met, 1),
  known10: (f) => count(f.known, 10),
  known50: (f) => count(f.known, 50),
  known100: (f) => count(f.known, 100),
  known200: (f) => count(f.known, 200),
  known300: (f) => count(f.known, 300),
  lesson: (f) => {
    // The lesson nearest to being known in full
    let best: Progress = { have: 0, need: 1 }
    for (const l of LESSONS) {
      const ws = WORDS.filter((w) => w.lesson === l.n)
      const k = ws.filter((w) => level(f.bank.cards[w.id], f.now) === 2).length
      if (ws.length && k / ws.length > best.have / best.need)
        best = {
          have: k,
          need: ws.length,
          text: `${k} of ${ws.length} in “${l.title}”`,
        }
    }
    return best
  },
  allmet: (f) => count(f.met, WORDS.length),

  streak3: (f) => count(streak(f.bank, f.now), 3),
  streak7: (f) => count(streak(f.bank, f.now), 7),
  streak10: (f) => count(streak(f.bank, f.now), 10),
  streak30: (f) => count(streak(f.bank, f.now), 30),
  days100: (f) =>
    count(Object.values(f.bank.days).filter((p) => p).length, 100),
  goal: (f) =>
    count(Math.max(0, ...Object.values(f.bank.days).map((p) => p ?? 0)), 30),
  big: (f) =>
    count(Math.max(0, ...Object.values(f.bank.days).map((p) => p ?? 0)), 100),
  early: (f) => once(f.today > 0 && f.hour >= 5 && f.hour < 8),
  night: (f) => once(f.today > 0 && (f.hour >= 23 || f.hour < 4)),
  today: (f) => count(Object.values(f.bank.daily).filter((d) => d).length, 1),
  today7: (f) => count(Object.values(f.bank.daily).filter((d) => d).length, 7),

  trip1: (f) => count(f.scenesDone(SCENES.map((s) => s.id)), 1),
  'city:beijing': city('beijing'),
  'city:qufu': city('qufu'),
  'city:xian': city('xian'),
  'city:chengdu': city('chengdu'),
  'city:guilin': city('guilin'),
  'city:shanghai': city('shanghai'),
  trip: (f) => count(f.scenesDone(SCENES.map((s) => s.id)), SCENES.length),
  stars: (f) =>
    count(SCENES.filter((s) => (f.bank.scenes[s.id] ?? 0) >= 3).length, 10),

  quest1: (f) => once(QUEST.length > 0 && !!f.bank.scenes[QUEST[0].id]),
  quest: (f) => count(f.scenesDone(QUEST.map((c) => c.id)), QUEST.length),
  quest3: (f) =>
    count(
      QUEST.filter((c) => (f.bank.scenes[c.id] ?? 0) >= 3).length,
      QUEST.length,
    ),

  tones: (f) => count(f.best('tones', 'tones-four'), 10),
  tonepairs: (f) =>
    count(
      Object.entries(f.bank.tones).filter(
        ([k, v]) => k.length === 2 && (v?.[0] ?? 0) > 0,
      ).length,
      12,
    ),
  say: (f) => count(f.best('say'), 85),
  listen: (f) => count(f.best('listen'), 8),

  rain: (f) => count(f.best('rain'), 100),
  shop: (f) => count(f.best('shop'), 100),
  bridge: (f) => count(f.best('bridge'), 100),
  pairs: (f) => {
    // Pairs keeps 100 − turns as its best
    const b = f.best('match', 'match-ears')
    return once(b >= 92, b ? `Best so far: ${100 - b} turns` : undefined)
  },
  write: (f) => count(f.best('write'), 10),
  numbers: (f) =>
    count(
      f.best(
        ...Object.keys(f.bank.best).filter((k) => k.startsWith('numbers-')),
      ),
      10,
    ),
  parts: (f) => count(f.best('parts', 'parts-pictures'), 10),
  order: (f) => count(f.best('order'), 10),
  sayings: (f) => count(prefixed(f.bank, 'say:'), 5),
  stories: (f) => count(prefixed(f.bank, 'story:'), 3),
  mahjong: (f) => count(f.best('mahjong-boards'), 1),

  plum: (f) => once(f.bank.garden['1'] === 2),
  garden5: (f) =>
    count(Object.values(f.bank.garden).filter((s) => s === 2).length, 5),
  crane: (f) =>
    count(
      Object.values(f.bank.garden).filter((s) => s === 2).length,
      gardenSize(),
    ),
  seals20: (f) => count(others(f.bank), 20),
  seals40: (f) => count(others(f.bank), 40),
}

// How far along each seal is
export function progress(bank: Bank, id: string, now: number): Progress {
  const check = CHECKS[id]
  return check ? check(facts(bank, now)) : once(false)
}

export interface Award {
  // Seals newly earned, in the album's order
  seals: Array<string>
  // Lessons whose thing in the garden has grown, and to what stage
  garden: Record<string, number>
}

// What the bank has earned that it does not have yet. Seals that count
// other seals or the garden see what this same call adds.
export function award(bank: Bank, now: number): Award {
  const garden = newGrowth(bank, now)
  const grown = { ...bank, garden: { ...bank.garden, ...garden } }
  const f = facts(grown, now)
  const seals: Array<string> = []
  const has = { ...grown.seals }
  for (const s of SEALS) {
    if (has[s.id] || COLLECTOR.includes(s.id)) continue
    const check = CHECKS[s.id]
    if (!check) continue
    const p = check(f)
    if (p.have >= p.need) {
      seals.push(s.id)
      has[s.id] = now
    }
  }
  // The collector's seals count the ones just earned too
  for (const id of COLLECTOR) {
    if (has[id]) continue
    const p = CHECKS[id]?.({ ...f, bank: { ...grown, seals: has } })
    if (p && p.have >= p.need) seals.push(id)
  }
  return { seals, garden }
}

// Every seal has its check, and every check its seal
export const checked = () =>
  SEALS.every((s) => !!CHECKS[s.id]) &&
  Object.keys(CHECKS).every((id) => SEALS.some((s) => s.id === id))
