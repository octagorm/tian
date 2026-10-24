import { WORD } from '../data/words.ts'
import { isNumber, numberGloss, numberPinyin } from './numbers.ts'
import { inContext, syllables } from './pinyin.ts'

// A line of Chinese as written in the data, word by word with spaces
// ("请 给 我=me 你 的 护照 。"), made into tokens: each word with its id in
// the word bank, its pinyin in context and the English that stands in for
// it. Punctuation is a token of its own.

export interface Token {
  h: string
  // The word in data/words.ts; a number has none, but `parts`
  id?: string
  // The characters of a number that are words of their own (一, 十, 百)
  parts?: Array<string>
  gloss: string
  pinyin: Array<string>
  punct?: boolean
  // A note on the word where it stands, by the key after # in the line
  // (the reader's texts, data/reader.ts), or once looked up, its text
  note?: string
}

const PUNCT = new Set([...'，。！？、：；…“”《》'])

export interface Vars {
  // The player's country, a word id (挪威)
  home: string
}

export function tokens(line: string, vars: Vars): Array<Token> {
  const raw = line.replaceAll('{home}', vars.home).split(' ').filter(Boolean)
  const base = raw.map((t) => {
    const [body, note] = t.split('#') as [string, string | undefined]
    const [h, override] = body.split('=') as [string, string | undefined]
    if (PUNCT.has(h))
      return { h, gloss: h, s: [] as Array<string>, punct: true }
    if (isNumber(h))
      return {
        h,
        gloss: override ?? numberGloss(h),
        s: numberPinyin(h),
        numeric: true,
        parts: [...new Set([...h].filter((c) => WORD[c]))],
      }
    const w = WORD[h]
    if (!w) throw new Error(`Not in the word bank: ${h} (in "${line}")`)
    return {
      h,
      id: w.id,
      gloss: override ?? w.g,
      s: syllables(w.p),
      ...(note ? { note } : {}),
    }
  })
  const words = base.filter((b) => !('punct' in b && b.punct))
  const sylls = inContext(words)
  let k = 0
  return base.map((b) => {
    if ('punct' in b && b.punct)
      return { h: b.h, gloss: b.h, pinyin: [], punct: true }
    const pinyin = sylls[k++]
    return 'parts' in b
      ? { h: b.h, gloss: b.gloss, pinyin, parts: b.parts }
      : {
          h: b.h,
          id: (b as { id: string }).id,
          gloss: b.gloss,
          pinyin,
          ...('note' in b && b.note ? { note: b.note } : {}),
        }
  })
}

// The line as Chinese is written: no spaces, no glosses
export const plain = (line: string, vars: Vars) =>
  line
    .replaceAll('{home}', vars.home)
    .split(' ')
    .filter(Boolean)
    .map((t) => t.split('#')[0].split('=')[0])
    .join('')

// The word ids in a line, numbers by their parts
export function wordIds(line: string, vars: Vars): Array<string> {
  const ids = new Set<string>()
  for (const t of tokens(line, vars)) {
    if (t.id) ids.add(t.id)
    t.parts?.forEach((p) => ids.add(p))
  }
  return [...ids]
}

// English with {home} filled in
export const english = (en: string, homeName: string) =>
  en.replaceAll('{home}', homeName)
