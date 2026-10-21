import {
  CAST,
  DAY,
  MISSES_ALLOWED,
  RANKS,
  STREAK,
  TASKS,
} from '../data/office.ts'
import { isNumber, value } from './numbers.ts'
import type { Task } from '../data/office.ts'

// The office's rules, pure so the tests can run them: a day's tasks, the
// answers offered, what a pick looks like, and when the player is promoted.
// games/office.tsx plays it.

function shuffle<T>(xs: Array<T>, random: () => number): Array<T> {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// A day at a rank: its tasks in a random order, those not done lately
// first, and no two of the same kind running more than twice
export function dayOf(
  rank: number,
  random: () => number = Math.random,
  recent: Array<string> = [],
): Array<Task> {
  const pool = TASKS.filter((t) => t.rank === rank)
  const fresh = shuffle(
    pool.filter((t) => !recent.includes(t.id)),
    random,
  )
  const stale = shuffle(
    pool.filter((t) => recent.includes(t.id)),
    random,
  )
  const picked = [...fresh, ...stale].slice(0, DAY)
  // spread the kinds out: a run of three alike swaps with a later one
  for (let i = 2; i < picked.length; i++) {
    const k = picked[i].kind
    if (picked[i - 1].kind !== k || picked[i - 2].kind !== k) continue
    const j = picked.findIndex((t, n) => n > i && t.kind !== k)
    if (j > 0) [picked[i], picked[j]] = [picked[j], picked[i]]
  }
  return picked
}

// What is offered for a task, shuffled: replies, or things to pick
export interface Offer {
  zh: string
  right: boolean
}

export function offers(t: Task, random: () => number = Math.random) {
  const all: Array<Offer> = t.replies.length
    ? t.replies.map((r) => ({ zh: r.zh, right: r.right }))
    : t.pick.map((zh, i) => ({ zh, right: i === 0 }))
  return shuffle(all, random)
}

// A line's syllables: its Han characters, numbers as they are said
export const syllables = (zh: string) =>
  zh.match(/\p{Script=Han}/gu)?.length ?? 0

// --- What a thing to pick looks like ---

// The things with a picture, by word (pixel/sprites.ts)
export const THING_SPRITES: Record<string, string> = {
  咖啡: 'coffee',
  牛奶: 'milk',
  可乐: 'cola',
  豆浆: 'soy-milk',
  蛋糕: 'cake',
  电脑: 'computer',
  快递: 'parcel',
  手机: 'phone',
  饺子: 'dumplings',
  包子: 'bun',
  面条: 'noodles',
  米饭: 'rice-bowl',
  上海: 'pearl-tower',
  北京: 'temple-of-heaven',
  成都: 'panda',
  西安: 'terracotta',
}

export type Look =
  | { kind: 'person'; who: string }
  | { kind: 'thing'; sprite: string }
  | { kind: 'time'; day: string; clock: string }
  | { kind: 'number'; n: string; rest: string }
  | { kind: 'text' }

const HOURS: Record<string, number> = {
  一: 1,
  两: 2,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  十一: 11,
  十二: 12,
}

// A time of day said in words, as a clock shows it: 下午 四 点 半 is 16:30
export function clockOf(words: Array<string>): string | null {
  const at = words.indexOf('点')
  if (at < 1) return null
  let h = HOURS[words[at - 1]]
  if (!h) return null
  const part = words.slice(0, at - 1)
  if ((part.includes('下午') || part.includes('晚上')) && h < 12) h += 12
  const m = words[at + 1] === '半' ? '30' : '00'
  return `${String(h).padStart(2, '0')}:${m}`
}

const PARTS_OF_DAY = new Set(['上午', '下午', '晚上', '早上'])

// How a thing to pick is shown: a colleague's face, a picture, a clock
// (with the day, if one is said), a number in figures, or the words alone
export function lookOf(zh: string): Look {
  const words = zh.split(' ').map((t) => t.split('=')[0])
  const who = Object.entries(CAST).find(([, p]) => p.zh === zh)
  if (who) return { kind: 'person', who: who[0] }
  if (words.length === 1 && THING_SPRITES[words[0]])
    return { kind: 'thing', sprite: THING_SPRITES[words[0]] }
  const clock = clockOf(words)
  if (!clock && words.includes('星期')) return { kind: 'text' }
  if (clock) {
    const first = words.findIndex((w) => PARTS_OF_DAY.has(w))
    const day = words.slice(0, first < 0 ? words.indexOf('点') - 1 : first)
    return { kind: 'time', day: day.join(' '), clock }
  }
  const n = words.findIndex((w) => isNumber(w) || w in HOURS)
  if (n >= 0) {
    const w = words[n]
    const digits = [...w].every((c) => '零一二三四五六七八九'.includes(c))
    const figure =
      digits && w.length > 2
        ? [...w].map((c) => '零一二三四五六七八九'.indexOf(c)).join('')
        : (isNumber(w) ? value(w) : HOURS[w]).toLocaleString('en')
    return {
      kind: 'number',
      n: figure,
      rest: words.filter((_, i) => i !== n).join(' '),
    }
  }
  return { kind: 'text' }
}

// --- Promotion ---

// A task done: right the first time, and by ear where it was to be heard
export interface Result {
  id: string
  hit: boolean
}

// Whether a day earns a promotion, from the day's results and the run of
// hits at the rank, and whether there is a rank above
export function promotion(
  rank: number,
  day: Array<Result>,
  streak: number,
): boolean {
  if (rank >= RANKS.length - 1) return false
  const misses = day.filter((r) => !r.hit).length
  return (day.length >= DAY && misses <= MISSES_ALLOWED) || streak >= STREAK
}

// The clock on the wall: nine in the morning to six, a step a task
export function clockAt(task: number): string {
  const minutes = 9 * 60 + Math.round((task * 9 * 60) / DAY)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}
