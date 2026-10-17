import { digitsHanzi, toHanzi } from '../lib/numbers.ts'

// Numbers by ear: prices, times, phone numbers and big numbers, a fixed
// set made from a seed so each can have a voice, and large enough that a
// drill seldom comes round to one again. `say` is what is spoken (phone
// numbers with 幺, the yāo used for 1 when reading digits), `zh` what is
// shown after, `answer` what to type.

export type NumberKind = 'price' | 'time' | 'phone' | 'big'

export interface NumberItem {
  kind: NumberKind
  say: string
  zh: string
  answer: string
}

// How many of each
const COUNT: Record<NumberKind, number> = {
  price: 120,
  time: 96,
  phone: 40,
  big: 120,
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

// 2 is 两 before a measure word or 点: 两块, 两毛, 两点
const counted = (n: number) => (n === 2 ? '两' : toHanzi(n))

// Minutes after 点: 零五分 below ten; 分 left off a round number but kept
// for a quarter (十五分) and when it is said in full, as at a station
function minutes(m: number, full: boolean): string {
  if (m < 10) return `零${toHanzi(m)}分`
  const round = m % 5 === 0 && m !== 15 && m !== 45
  return `${toHanzi(m)}${round && !full ? '' : '分'}`
}

function make(): Array<NumberItem> {
  const r = rng(888)
  const n = (a: number, b: number) => a + Math.floor(r() * (b - a + 1))
  const chance = (p: number) => r() < p
  const out: Array<NumberItem> = []
  const seen = new Set<string>()
  const add = (it: NumberItem) => {
    if (seen.has(it.say)) return
    seen.add(it.say)
    out.push(it)
  }
  const have = (k: NumberKind) => out.filter((x) => x.kind === k).length

  // Prices: mostly what a meal or a ride costs, some what a ticket or a
  // phone does; tenths (毛) said or left unsaid after 块
  while (have('price') < COUNT.price) {
    const yuan = [n(2, 10), n(11, 30), n(31, 99), n(100, 999), n(1000, 9999)][
      [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4][n(0, 10)]
    ]
    const jiao = yuan < 100 && chance(0.35) ? n(1, 9) : 0
    const tail = !jiao ? '' : chance(0.4) ? `${counted(jiao)}毛` : toHanzi(jiao)
    const zh = `${counted(yuan)}块${tail}`
    add({
      kind: 'price',
      say: zh,
      zh,
      answer: jiao ? `${yuan}.${jiao}` : `${yuan}`,
    })
  }

  // Times: on the hour, half past, a quarter (一刻, 三刻) and any minute;
  // some on the 24-hour clock of stations and tickets, with 分 always said
  while (have('time') < COUNT.time) {
    const m = [0, 30, 15, 45, n(1, 11) * 5, n(1, 11) * 5, n(1, 59), n(1, 59)][
      n(0, 7)
    ]
    let h: number
    let zh: string
    if (chance(0.2)) {
      h = n(13, 23)
      zh = `${toHanzi(h)}点${m ? minutes(m, true) : ''}`
    } else {
      h = n(1, 12)
      const said =
        m === 0
          ? ''
          : m === 30 && chance(0.75)
            ? '半'
            : m === 15 && chance(0.4)
              ? '一刻'
              : m === 45 && chance(0.25)
                ? '三刻'
                : minutes(m, false)
      zh = `${counted(h)}点${said}`
    }
    add({
      kind: 'time',
      say: zh,
      zh,
      answer: `${h}:${String(m).padStart(2, '0')}`,
    })
  }

  // Mobile numbers: eleven digits, read in groups of three, four and four
  while (have('phone') < COUNT.phone) {
    const digits = `1${[3, 5, 7, 8, 9][n(0, 4)]}${Array.from({ length: 9 }, () => n(0, 9)).join('')}`
    const groups = [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)]
    const zh = groups.map(digitsHanzi).join(' ')
    add({
      kind: 'phone',
      say: groups.map((g) => digitsHanzi(g).replaceAll('一', '幺')).join('，'),
      zh,
      answer: digits,
    })
  }

  // Big numbers: tens to tens of thousands, and some with a gap that 零
  // fills (三百零五, 两千零四十, 一万零八百)
  while (have('big') < COUNT.big) {
    const v = [
      n(11, 99),
      n(100, 999),
      n(100, 999),
      n(1, 9) * 100 + n(1, 9),
      n(1000, 9999),
      n(1000, 9999),
      n(1, 9) * 1000 + n(1, 99),
      n(1, 9) * 10000 + n(0, 9) * 1000,
      n(10000, 99999),
      n(1, 9) * 10000 + n(1, 999),
    ][n(0, 9)]
    const zh = toHanzi(v)
    add({ kind: 'big', say: zh, zh, answer: String(v) })
  }
  return out
}

export const NUMBER_ITEMS = make()
