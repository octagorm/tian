// Pinyin: tones, tone marks and numbers, the tone changes of 不 and 一,
// and loose matching of what a player types.

const MARKS: Record<string, string> = {
  a: 'āáǎà',
  e: 'ēéěè',
  i: 'īíǐì',
  o: 'ōóǒò',
  u: 'ūúǔù',
  ü: 'ǖǘǚǜ',
}

const UNMARK: Record<string, [string, number] | undefined> = {}
for (const [v, marked] of Object.entries(MARKS))
  [...marked].forEach((m, i) => (UNMARK[m] = [v, i + 1]))

// 1–4, or 5 for the neutral tone
export function toneOf(syllable: string): number {
  for (const ch of syllable) {
    const u = UNMARK[ch]
    if (u) return u[1]
  }
  return 5
}

// "nǚ" → "nü"
export function bare(syllable: string): string {
  return [...syllable].map((ch) => UNMARK[ch]?.[0] ?? ch).join('')
}

// The tone mark goes on a or e; on the o of ou; else on the last vowel
export function mark(base: string, tone: number): string {
  if (tone < 1 || tone > 4) return base
  const lower = base.toLowerCase()
  let at = lower.search(/[ae]/)
  if (at < 0) at = lower.indexOf('ou')
  if (at < 0) {
    for (let i = lower.length - 1; i >= 0; i--)
      if ('iouü'.includes(lower[i])) {
        at = i
        break
      }
  }
  if (at < 0) return base
  const v = lower[at]
  let m = MARKS[v][tone - 1]
  if (base[at] !== v) m = m.toUpperCase()
  return base.slice(0, at) + m + base.slice(at + 1)
}

export const withTone = (syllable: string, tone: number) =>
  mark(bare(syllable), tone)

// "nǐ" → "ni3", "ma" → "ma", ü written v
export function numbered(syllable: string): string {
  const t = toneOf(syllable)
  const b = bare(syllable).replaceAll('ü', 'v')
  return t === 5 ? b : b + t
}

// The syllables of a word's pinyin, as stored ("nǐ hǎo")
export const syllables = (p: string) => p.split(' ').filter(Boolean)

// A word as it is written: syllables joined, with an apostrophe before a
// syllable that starts with a vowel (Xī'ān), and a space before one with a
// capital, which begins a name of its own (Xiǎo Lǐ, Sūn Wùkōng)
export function join(sylls: Array<string>): string {
  return sylls
    .map((s, i) =>
      i === 0
        ? s
        : /^\p{Lu}/u.test(s)
          ? ` ${s}`
          : /^[aeoāáǎàēéěèōóǒò]/i.test(s)
            ? `'${s}`
            : s,
    )
    .join('')
}

// 不 and 一 change tone before another syllable: 不 is bú before a fourth
// tone; 一 is yí before a fourth tone and yì before the others. 一 keeps
// yī at the end, in ordinals (第一) and in numbers read out (十一, 一零一).
// `next` is the tone of the syllable that follows, if any.
export function sandhi(
  ch: string,
  syllable: string,
  next: number | undefined,
  numeric = false,
): string {
  if (next === undefined || next === 5) return syllable
  if (ch === '不' && toneOf(syllable) === 4)
    return next === 4 ? withTone(syllable, 2) : syllable
  if (ch === '一' && !numeric && toneOf(syllable) === 1)
    return withTone(syllable, next === 4 ? 2 : 4)
  return syllable
}

// The syllables of a run of words, with 不 and 一 changed by what follows.
// Each word is [hanzi, syllables]; `numeric` marks number words, where 一
// is read yī (but 一百 is yìbǎi, which the number reader handles).
export function inContext(
  words: Array<{ h: string; s: Array<string>; numeric?: boolean }>,
): Array<Array<string>> {
  const flat: Array<{ ch: string; s: string; w: number; numeric: boolean }> = []
  words.forEach((w, wi) => {
    const chars = [...w.h].filter((c) => c !== '儿')
    w.s.forEach((s, i) =>
      flat.push({ ch: chars[i] ?? '', s, w: wi, numeric: !!w.numeric }),
    )
  })
  const out = words.map(() => [] as Array<string>)
  flat.forEach((f, i) => {
    const next = flat[i + 1] as (typeof flat)[number] | undefined
    // 第一 and numbers keep yī
    const ordinal = f.ch === '一' && i > 0 && flat[i - 1].ch === '第'
    out[f.w].push(
      ordinal
        ? f.s
        : sandhi(f.ch, f.s, next ? toneOf(next.s) : undefined, f.numeric),
    )
  })
  return out
}

// What a player types, made comparable: "letters#tones", lower case, no
// spaces or apostrophes, ü as v, and the tones in order, from tone marks
// or numbers (5, the neutral tone, is left out). With `tones` false, the
// letters alone.
export function normalize(input: string, tones = true): string {
  let s = input
    .toLowerCase()
    .replace(/[\s'’·-]/g, '')
    .replaceAll('u:', 'v')
  const marks: Array<number> = []
  s = [...s]
    .map((ch) => {
      const u = UNMARK[ch]
      if (!u) return ch
      marks.push(u[1])
      return u[0]
    })
    .join('')
    .replaceAll('ü', 'v')
  if (!tones) return s.replace(/[1-5]/g, '')
  if (marks.length) return `${s.replace(/[1-5]/g, '')}#${marks.join('')}`
  const t = [...s.matchAll(/[1-4]/g)].map((m) => m[0]).join('')
  return `${s.replace(/[1-5]/g, '')}#${t}`
}

// The forms of a word's pinyin that count as typing it right: with tone
// marks or numbers (the neutral tone may be left out), or, with `tones`
// false, without tones.
export function matches(input: string, p: string, tones = true): boolean {
  const sylls = syllables(p)
  const letters = sylls.map((s) => bare(s).replaceAll('ü', 'v')).join('')
  const typed = normalize(input, tones)
  if (!tones) return typed === letters
  const want = sylls
    .map(toneOf)
    .filter((t) => t !== 5)
    .join('')
  return typed === `${letters}#${want}`
}

// Tones written as the contour of each: ˉ ˊ ˇ ˋ and · for the neutral
export const TONE_SIGN = ['', 'ˉ', 'ˊ', 'ˇ', 'ˋ', '·']
export const TONE_NAME = ['', 'high', 'rising', 'dipping', 'falling', 'neutral']
