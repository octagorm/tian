// Numbers in hanzi: a sentence may hold any number as one word (二十五,
// 五百一十五), and runs of digits read one by one (八零六, a room; phone
// numbers), where 一 is said yāo.

const DIGIT: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}
const UNIT: Record<string, number> = { 十: 10, 百: 100, 千: 1000, 万: 10000 }

const SOUND: Record<string, string> = {
  零: 'líng',
  一: 'yī',
  二: 'èr',
  两: 'liǎng',
  三: 'sān',
  四: 'sì',
  五: 'wǔ',
  六: 'liù',
  七: 'qī',
  八: 'bā',
  九: 'jiǔ',
  十: 'shí',
  百: 'bǎi',
  千: 'qiān',
  万: 'wàn',
}

export const isNumber = (s: string) =>
  s.length > 1 && [...s].every((c) => c in DIGIT || c in UNIT)

// Read digit by digit: no units in it
export const isDigits = (s: string) =>
  [...s].every((c) => c in DIGIT) && s.length > 1

export function value(s: string): number {
  let total = 0
  let section = 0
  let digit = 0
  for (const c of s) {
    if (c in DIGIT) digit = DIGIT[c]
    else if (c === '万') {
      total += (section + digit) * 10000
      section = 0
      digit = 0
    } else {
      section += (digit || 1) * UNIT[c]
      digit = 0
    }
  }
  return total + section + digit
}

// What a number word stands for in English: 806 for 八零六, 515 for 五百一十五
export const numberGloss = (s: string) =>
  isDigits(s)
    ? [...s].map((c) => DIGIT[c]).join('')
    : value(s).toLocaleString('en')

// One syllable per character. In digits 一 is yāo; elsewhere it takes the
// tone change of 一 before 百 and 千 (yì) and before the fourth tone of 万
// (yí): 一百一十五 is yìbǎi yīshíwǔ, 一万 is yíwàn
export function numberPinyin(s: string): Array<string> {
  const chars = [...s]
  return chars.map((c, i) => {
    if (c === '一') {
      if (isDigits(s)) return 'yāo'
      const next = chars[i + 1]
      if (next === '百' || next === '千') return 'yì'
      if (next === '万') return 'yí'
    }
    return SOUND[c]
  })
}

const CH = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

// 0 to 99,999 in hanzi, as said: 十五 (not 一十五), 一百一十, 一百零五,
// 两千, 两万三千
export function toHanzi(n: number): string {
  if (n < 10) return CH[n]
  if (n < 20) return '十' + (n % 10 ? CH[n % 10] : '')
  const parts: Array<[number, string]> = [
    [10000, '万'],
    [1000, '千'],
    [100, '百'],
    [10, '十'],
    [1, ''],
  ]
  let out = ''
  let zero = false
  let started = false
  for (const [u, name] of parts) {
    const d = Math.floor(n / u) % 10
    if (d === 0) {
      if (started) zero = true
      continue
    }
    if (zero) out += '零'
    zero = false
    const digit = d === 2 && u >= 100 && !started ? '两' : CH[d]
    out += digit + name
    started = true
  }
  return out
}

// A phone or room number, digit by digit
export const digitsHanzi = (digits: string) =>
  [...digits].map((d) => CH[Number(d)]).join('')
