import { toHanzi } from '../lib/numbers.ts'
import type { CastLook } from '../pixel/figure'

// The market (讨价还价): stalls whose keepers name their prices out loud
// and come down as you haggle. Each stall asks one of three first prices
// and steps down a ladder of its own to the lowest it will go, so every
// line a keeper can say is made here, from the ladders, and has a voice
// (data/extra.ts). Lines are written word by word, as in the trip.

export interface Stall {
  // Its picture: public/art/market/<id>.png
  id: string
  // What it sells, a word of the bank, and the measure word for it
  ware: string
  mw: string
  // Measure words that do not go with it, offered beside the right one
  wrong: [string, string]
  // Why the measure word is that one
  why: string
  sprite: string
  // A fair price, as written on the shopping list
  fair: number
  // The keeper: a voice in data/voices.ts, a look (drawn whole in the
  // stall, pixel/figure.ts, and as a face beside what they say), and how
  // many pushes they take before waving you off
  voice: string
  look: CastLook
  patience: number
}

export const STALLS: Array<Stall> = [
  {
    id: 'lantern',
    ware: '灯笼',
    mw: '个',
    wrong: ['条', '双'],
    why: '个 is the everyday measure word, for most things.',
    sprite: 'paper-lantern',
    fair: 40,
    voice: 'Lantern seller',
    look: { style: 'bun', coat: '#c8372d', top: 'apron', accent: '#e8c27a' },
    patience: 3,
  },
  {
    id: 'kite',
    ware: '风筝',
    mw: '个',
    wrong: ['双', '把'],
    why: '个 is the everyday measure word, for most things.',
    sprite: 'kite',
    fair: 50,
    voice: 'Kite seller',
    look: { style: 'cap', hat: '#3d6fa8', coat: '#e07a2a', top: 'tee' },
    patience: 4,
  },
  {
    id: 'chopsticks',
    ware: '筷子',
    mw: '双',
    wrong: ['条', '个'],
    why: '双 is a pair: chopsticks, shoes, hands.',
    sprite: 'chopsticks',
    fair: 30,
    voice: 'Chopsticks seller',
    look: { style: 'bun', old: true, coat: '#6b4fa0', top: 'cardigan' },
    patience: 5,
  },
  {
    id: 'fan',
    ware: '扇子',
    mw: '把',
    wrong: ['条', '双'],
    why: '把 is for things held by a handle: a fan, an umbrella, a knife.',
    sprite: 'fan',
    fair: 60,
    voice: 'Fan seller',
    look: {
      style: 'short',
      hair: '#1f1a17',
      coat: '#2b3a55',
      top: 'silk',
      accent: '#d9a441',
    },
    patience: 4,
  },
  {
    id: 'seal',
    ware: '印章',
    mw: '个',
    wrong: ['条', '双'],
    why: '个 is the everyday measure word, for most things.',
    sprite: 'seal',
    fair: 80,
    voice: 'Seal carver',
    look: {
      style: 'short',
      old: true,
      glasses: true,
      beard: true,
      coat: '#5a4636',
      top: 'vest',
    },
    patience: 3,
  },
  {
    id: 'scarf',
    ware: '丝巾',
    mw: '条',
    wrong: ['双', '把'],
    why: '条 is for long, narrow things: a scarf, a road, a fish.',
    sprite: 'scarf',
    fair: 120,
    voice: 'Scarf seller',
    look: { style: 'long', coat: '#2f7d6d', top: 'silk', accent: '#e8c27a' },
    patience: 4,
  },
  {
    id: 'teapot',
    ware: '茶壶',
    mw: '把',
    wrong: ['条', '双'],
    why: '把 is for things held by a handle, as a teapot is.',
    sprite: 'teapot',
    fair: 150,
    voice: 'Tea merchant',
    look: { style: 'bald', old: true, coat: '#8a5a3c', top: 'jacket' },
    patience: 3,
  },
  {
    id: 'knot',
    ware: '中国结',
    mw: '个',
    wrong: ['双', '把'],
    why: '个 is the everyday measure word, for most things.',
    sprite: 'knot',
    fair: 20,
    voice: 'Knot seller',
    look: { style: 'pony', coat: '#d0308a', top: 'jacket' },
    patience: 5,
  },
]

export const STALL: Record<string, Stall | undefined> = Object.fromEntries(
  STALLS.map((s) => [s.id, s]),
)

// The player's lines, in the player's voice (data/trip.ts)
export const MARKET_PLAYER = 'Puck'

// A price as it is said and written: a round number, by tens above a
// hundred, by fives above twenty
export function nice(x: number): number {
  if (x >= 100) return Math.round(x / 10) * 10
  if (x >= 20) return Math.round(x / 5) * 5
  return Math.round(x)
}

const say = (n: number) => toHanzi(n)

// How a keeper may start: asking a little, more, or a lot over a fair
// price, and going down further the more they asked
const MOODS = [
  { ask: 1.8, low: 0.9 },
  { ask: 2.4, low: 0.8 },
  { ask: 3, low: 0.7 },
]

export interface Haggle {
  stall: string
  mood: number
  // What they ask first, then each step down to the lowest they will go
  ladder: Array<number>
}

function ladder(fair: number, mood: (typeof MOODS)[number]): Array<number> {
  const first = nice(fair * mood.ask)
  const low = Math.min(nice(fair * mood.low), fair - 1)
  const out = [first]
  for (let j = 1; j <= 4; j++) {
    const p = j === 4 ? low : nice(first * (low / first) ** (j / 4))
    if (p < out.at(-1)!) out.push(p)
  }
  return out
}

export const HAGGLES: Array<Haggle> = STALLS.flatMap((s) =>
  MOODS.map((m, mood) => ({ stall: s.id, mood, ladder: ladder(s.fair, m) })),
)

// What the player can offer at a stall: from half a fair price to half
// as much again
export const offers = (s: Stall): Array<number> => [
  ...new Set(
    [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.5].map((m) => nice(s.fair * m)),
  ),
]

// --- What is said

// The player
export const ASK = (s: Stall, mw = s.mw) =>
  `老板 ， 这 ${mw} ${s.ware} 多少 钱 ？`
export const MOVES = {
  dear: '太 贵 了 ！',
  cheaper: '便宜 一点 吧 。',
  buy: '好 ， 我 买 了 。',
  leave: '算了 ， 谢谢 。',
}
export const OFFER = (n: number) => `我 给 你 ${say(n)} 块 。`

// The keepers: the first price, in three ways, one for each mood
export const OPEN = (s: Stall, mood: number, n: number) =>
  [
    `这 ${s.mw} ${s.ware} ${say(n)} 块 。`,
    `${say(n)} 块 ！ 很 漂亮 吧 ？`,
    `${say(n)} 块 。 这 是 最 好 的 ！`,
  ][mood]
// Coming down, when asked to
export const DOWN = (n: number) => `好 吧 ， ${say(n)} 块 。`
// Coming down a little, against an offer too low
export const COUNTER = (n: number) => `不 行 ， ${say(n)} 块 。`
// The lowest, and saying so
export const LOWEST = (n: number) => `${say(n)} 块 ， 不 能 再 便宜 了 。`
// Calling the player back as they walk away
export const BACK = (n: number) => `等 一下 ！ ${say(n)} 块 ， 卖 给=to 你 ！`
// And what needs no price
export const REPLY = {
  deal: '好 ， 成交 ！',
  thanks: '谢谢 ！ 欢迎 再 来 ！',
  insult: '什么 ？ 太 少 了 ！',
  notDear: '不 贵 ！ 不 贵 ！',
  noLower: '不 行 ， 不 能 再 便宜 了 ！',
  bye: '好 ， 再见 ！',
  enough: '不 卖 了 ！ 你 走 吧 ！',
}

// Everything the market can say, each line in its speaker's voice
export function marketLines(): Array<{ voice: string; zh: string }> {
  const out: Array<{ voice: string; zh: string }> = []
  const seen = new Set<string>()
  const add = (voice: string, zh: string) => {
    if (seen.has(`${voice}|${zh}`)) return
    seen.add(`${voice}|${zh}`)
    out.push({ voice, zh })
  }
  for (const s of STALLS) add(MARKET_PLAYER, ASK(s))
  for (const zh of Object.values(MOVES)) add(MARKET_PLAYER, zh)
  for (const n of STALLS.flatMap(offers).sort((a, b) => a - b))
    add(MARKET_PLAYER, OFFER(n))
  for (const s of STALLS) {
    for (const h of HAGGLES.filter((x) => x.stall === s.id)) {
      const low = h.ladder.at(-1)!
      add(s.voice, OPEN(s, h.mood, h.ladder[0]))
      for (const n of h.ladder.slice(1, -1)) {
        add(s.voice, DOWN(n))
        add(s.voice, COUNTER(n))
      }
      add(s.voice, LOWEST(low))
      add(s.voice, BACK(low))
    }
    for (const zh of Object.values(REPLY)) add(s.voice, zh)
  }
  return out
}
