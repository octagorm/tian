import { digitsHanzi, toHanzi } from '../lib/numbers.ts'

// Numbers by ear: prices, times, phone numbers and big numbers, a fixed
// set made from a seed so each can have a voice. `say` is what is spoken
// (phone numbers with 幺, the yāo used for 1 when reading digits), `zh`
// what is shown after, `answer` what to type.

export type NumberKind = 'price' | 'time' | 'phone' | 'big'

export interface NumberItem {
  kind: NumberKind
  say: string
  zh: string
  answer: string
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

function time(h: number, m: number): string {
  const hour = h === 2 ? '两' : toHanzi(h)
  if (m === 0) return `${hour}点`
  if (m === 30) return `${hour}点半`
  if (m < 10) return `${hour}点零${toHanzi(m)}分`
  return `${hour}点${toHanzi(m)}${m % 5 === 0 && m !== 15 && m !== 45 ? '' : '分'}`
}

function make(): Array<NumberItem> {
  const r = rng(888)
  const n = (a: number, b: number) => a + Math.floor(r() * (b - a + 1))
  const out: Array<NumberItem> = []
  const seen = new Set<string>()
  const add = (it: NumberItem) => {
    if (seen.has(it.say)) return
    seen.add(it.say)
    out.push(it)
  }
  while (out.filter((x) => x.kind === 'price').length < 30) {
    const yuan = r() < 0.5 ? n(2, 20) : n(21, 199)
    const jiao = r() < 0.3 ? n(1, 9) : 0
    const zh = `${toHanzi(yuan)}块${jiao ? toHanzi(jiao) : ''}`
    add({
      kind: 'price',
      say: zh,
      zh,
      answer: jiao ? `${yuan}.${jiao}` : `${yuan}`,
    })
  }
  while (out.filter((x) => x.kind === 'time').length < 24) {
    const h = n(1, 12)
    const m = [0, 0, 30, 15, 45, 5, 10, 20, 25, 40, 50, 8][n(0, 11)]
    const zh = time(h, m)
    add({
      kind: 'time',
      say: zh,
      zh,
      answer: `${h}:${String(m).padStart(2, '0')}`,
    })
  }
  while (out.filter((x) => x.kind === 'phone').length < 10) {
    const digits = `1${[3, 5, 8][n(0, 2)]}${Array.from({ length: 9 }, () => n(0, 9)).join('')}`
    const groups = [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)]
    const zh = groups.map(digitsHanzi).join(' ')
    add({
      kind: 'phone',
      say: groups.map((g) => digitsHanzi(g).replaceAll('一', '幺')).join('，'),
      zh,
      answer: digits,
    })
  }
  while (out.filter((x) => x.kind === 'big').length < 30) {
    const v = [
      n(11, 99),
      n(100, 999),
      n(1000, 9999),
      n(1, 9) * 10000 + n(0, 9) * 1000,
      n(101, 109),
    ][n(0, 4)]
    const zh = toHanzi(v)
    add({ kind: 'big', say: zh, zh, answer: String(v) })
  }
  return out
}

export const NUMBER_ITEMS = make()
