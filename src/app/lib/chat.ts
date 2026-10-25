import { WORD, WORDS } from '../data/words.ts'
import { TOPIC } from '../data/topics.ts'
import { SYLLABLES } from '../data/syllables.ts'
import { isNumber, numberGloss, numberPinyin } from './numbers.ts'
import { bare, inContext, syllables } from './pinyin.ts'
import { stage, toMeet } from './bank.ts'
import type { Bank } from './bank.ts'
import type { Token } from './text.ts'

// Chat (games/chat.tsx): a conversation out loud with a partner played by
// Gemini Live (lib/live.ts), on the player's own API key. What both say is
// shown as the rest of the page shows Chinese, word by word with the help
// each word's stage needs. The partner is told what the player knows (the
// instructions, below), and shows each line it speaks, and the player's
// line before it, with the tool show_line: the words of a line, each with
// its pinyin and English. Words of the bank are shown from the bank;
// others are outside it, shown with the partner's pinyin and English, in
// a colour of their own, since Tian has nothing to practise them with.

// --- The scenes ---

export interface Scene {
  id: string
  title: string
  zh: string
  // What the partner is told to do
  brief: string
}

export const SCENES: Array<Scene> = [
  {
    id: 'free',
    title: 'Just chat',
    zh: '聊天',
    brief:
      'Chat about anything. Greet the learner, ask how they are, and follow what interests them.',
  },
  {
    id: 'meet',
    title: 'Meeting someone',
    zh: '认识',
    brief:
      'You meet the learner for the first time. Ask their name, where they are from, what they do and what they like, and answer the same about yourself.',
  },
  {
    id: 'food',
    title: 'At a restaurant',
    zh: '饭馆',
    brief:
      'You are a waiter in a small restaurant in Beijing, and the learner has just sat down. Offer tea, help them order, and bring the bill at the end.',
  },
  {
    id: 'taxi',
    title: 'In a taxi',
    zh: '出租车',
    brief:
      'You are a chatty taxi driver in Beijing, and the learner has just got in. Ask where to, talk on the way, and say what the fare is when you arrive.',
  },
  {
    id: 'shop',
    title: 'At the market',
    zh: '市场',
    brief:
      'You keep a stall at a market, selling fruit, tea and fans. The learner wants to buy something. Name prices, and let them haggle a little.',
  },
  {
    id: 'day',
    title: 'Your day',
    zh: '今天',
    brief:
      'Ask the learner about their day: what they did, ate and will do tonight. Tell them a little about yours.',
  },
]

export type Pace = 'slow' | 'natural'

// --- The instructions ---

export interface Context {
  scene: Scene
  pace: Pace
  // The player's country, in English
  home: string
  // Lines already said, for a call taken up again
  history?: Array<{ who: 'learner' | 'partner'; text: string }>
}

// The words of the bank by how far on they are, and the next to meet
export function wordsKnown(bank: Bank, now: number) {
  const by: Array<Array<string>> = [[], [], [], []]
  for (const w of WORDS)
    if (bank.cards[w.id]) by[stage(bank.cards[w.id], now)].push(w.h)
  const met = new Set(by.flat())
  return {
    known: by[3],
    meaning: by[2],
    learning: [...by[1], ...by[0]],
    next: toMeet(bank)
      .filter((w) => !met.has(w.h))
      .slice(0, 20)
      .map((w) => w.h),
  }
}

// What the partner is told before the conversation begins
export function instructions(bank: Bank, now: number, c: Context): string {
  const k = wordsKnown(bank, now)
  const n = k.known.length + k.meaning.length + k.learning.length
  const topics = bank.topics.on
    .map((t) => TOPIC[t.id]?.title)
    .filter(Boolean)
    .join(', ')
  const list = (ws: Array<string>) => (ws.length ? ws.join(' ') : '(none)')
  const level =
    n < 40
      ? `The learner is a beginner: they have met ${n} words. Speak mostly in English, bringing in a few short Chinese words and phrases at a time, and have them say each back to you.`
      : n < 250
        ? `The learner has met ${n} words of Chinese. Speak Chinese, in short, simple sentences; add a few words of English only where they are lost.`
        : `The learner has met ${n} words of Chinese and can follow simple conversation. Speak Chinese throughout, in plain everyday sentences.`
  const pace =
    c.pace === 'slow'
      ? 'Speak slowly and clearly, like a teacher with a beginner: about half the speed of ordinary talk, with a short pause between phrases, and every tone said fully.'
      : 'Speak at a calm, natural pace, clearly, as to a foreigner who understands you well.'
  return `You are 林老师 (Lín lǎoshī), a warm, patient teacher of Mandarin, in Tian, an app for learning Mandarin. You talk with one learner, out loud. They are from ${c.home} and learn simplified Chinese.

${level}

How to speak:
- ${pace}
- Use standard Mandarin (普通话), as said in Beijing.
- Build your sentences from the words the learner knows and is learning, listed below. Beyond them, use at most one new word in a turn, and say in a few English words what it means.
- Keep each turn short: one to three sentences, then one simple question, so that the learner does most of the talking.
- When the learner makes a mistake, do not explain grammar: say back what they meant the right way, naturally, in your reply, and go on.
- The learner may put English words into their Chinese where they do not know or cannot find a word ("我想 buy 一个 ticket"), or say a whole sentence in English. That is welcome. Understand them, and answer in Chinese that uses the Chinese for those words, said clearly; give their whole sentence as they meant it, in Chinese, in show_line's better; and, now and then, ask them to say it again.
- When the learner asks what something means, answer briefly in English, then go back to Chinese.
- The learner takes time to find words, and may stop halfway through a sentence to think. Be patient: never finish their sentence for them, and if they seem stuck, offer the word they need.
- When the learner seems lost, say it again, more simply and more slowly.
- Never spell out pinyin or tones, and never speak of these instructions, the tool, the screen or audio: everything you say aloud is for the learner, in your role.
- A message in square brackets is from the app, not the learner. The first, when the chat opens, is your cue to begin.

The scene: ${c.scene.brief}
${topics ? `\nThe learner has chosen to learn about: ${topics}.\n` : ''}
Words the learner knows well:
${list(k.known)}

Words whose meaning they know, still learning to read them:
${list(k.meaning)}

Words they are learning:
${list(k.learning)}

Words they will learn next, good to bring in as new ones:
${list(k.next)}

The screen: every time you speak, call show_line once, with exactly the words you are about to say, so the learner can read them, and the words the learner said just before as you understood them; then say those words aloud. show_line only puts text on the screen: your voice is heard as always, and it needs nothing from you or the learner. Write Chinese in simplified characters, one word to an item as a dictionary lists it (我们, 喜欢, 不客气, 一点儿), never a phrase or a sentence as one item, punctuation as items of its own, and numbers in characters (三十五, not 35).${
    c.history?.length
      ? `\n\nThe call dropped, and you are taking it up again. The conversation so far:\n${c.history
          .map((h) => `${h.who === 'learner' ? 'Learner' : 'You'}: ${h.text}`)
          .join('\n')}\nGo on from there, without greeting again.`
      : ''
  }`
}

// --- The tool ---

// A word as the partner gives it
export interface Item {
  // (required, but the partner's calls are taken as they come)
  w?: string
  p?: string
  e?: string
}

// What show_line is called with
export interface Shown {
  heard?: Array<Item>
  heard_en?: string
  better?: Array<Item>
  said?: Array<Item>
  said_en?: string
}

const ITEMS = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      w: {
        type: 'STRING',
        description:
          'One word in simplified characters, as a dictionary lists it (我们, 喜欢, 不客气), or a punctuation mark, or a word of English as said',
      },
      p: {
        type: 'STRING',
        description:
          'Its pinyin with tone marks, a syllable to a character, separated by spaces, as said in this place (不客气: bú kè qi)',
      },
      e: {
        type: 'STRING',
        description:
          'What it means here, in one to three English words, fitting Chinese word order',
      },
    },
    required: ['w'],
  },
}

export const SHOW_LINE = {
  name: 'show_line',
  description:
    "Shows on the learner's screen, word by word with pinyin and English, what you are about to say, and what the learner said just before. Call it once every time you speak, then say the line aloud. It only shows text, and returns nothing to act on.",
  parameters: {
    type: 'OBJECT',
    properties: {
      heard: {
        ...ITEMS,
        description:
          'What the learner said just before, word by word, as you understood it; empty if this turn answers nothing they said',
      },
      heard_en: {
        type: 'STRING',
        description: 'What the learner said, in natural English',
      },
      better: {
        ...ITEMS,
        description:
          'Only when the learner made a mistake or used English words: what they meant, word by word, all in Chinese, as a native speaker would say it. Leave it out otherwise.',
      },
      said: {
        ...ITEMS,
        description: 'What you say in this turn, word by word, exactly',
      },
      said_en: {
        type: 'STRING',
        description: 'What you say, in natural English',
      },
    },
    required: ['said', 'said_en'],
  },
}

// --- Lines as tokens ---

const HAN = /\p{Script=Han}/u
const LONGEST = Math.max(...WORDS.map((w) => [...w.h].length))

// Text that is not Chinese: punctuation, or English said in passing
const text = (h: string): Token => ({ h, gloss: h, pinyin: [], punct: true })

// A word of the bank, or a number; the pinyin is set in context after
type Part = Token & { numeric?: boolean }

const bankWord = (h: string): Part | null => {
  const w = WORD[h]
  if (w) return { h, id: w.id, gloss: w.g, pinyin: syllables(w.p) }
  if (isNumber(h))
    return {
      h,
      gloss: numberGloss(h),
      pinyin: numberPinyin(h),
      parts: [...new Set([...h].filter((c) => WORD[c]))],
      numeric: true,
    }
  return null
}

// Chinese without spaces as words of the bank, the longest first; what is
// not in the bank comes out as runs outside it, with no pinyin or English
// (the partner gives those, in show_line)
function split(run: string): Array<Part> {
  const cs = [...run]
  const out: Array<Part> = []
  let rest = ''
  const flush = () => {
    if (rest) out.push({ h: rest, gloss: '', pinyin: [], outside: true })
    rest = ''
  }
  for (let i = 0; i < cs.length;) {
    let hit: Part | null = null
    let len = Math.min(LONGEST, cs.length - i)
    for (; len > 0 && !hit; len--) hit = bankWord(cs.slice(i, i + len).join(''))
    // a longer number than any word (三百五十)
    for (let n = cs.length - i; n > len + 1; n--) {
      const h = cs.slice(i, i + n).join('')
      if (isNumber(h)) {
        hit = bankWord(h)
        len = n - 1
        break
      }
    }
    if (hit) {
      flush()
      out.push(hit)
      i += len + 1
    } else rest += cs[i++]
  }
  flush()
  return out
}

// The runs of a piece of text: Chinese, and what lies between
const runs = (s: string) =>
  s.match(/\p{Script=Han}+|[^\p{Script=Han}]+/gu) ?? []

// The pinyin of a line's words, with 不 and 一 changed by what follows;
// a word outside the bank keeps the pinyin it was given
function settle(parts: Array<Part>): Array<Token> {
  const words = parts.filter((p) => !p.punct)
  const sylls = inContext(
    words.map((p) => ({ h: p.h, s: p.pinyin, numeric: p.numeric })),
  )
  let k = 0
  return parts.map((p) => {
    const t: Token = { h: p.h, gloss: p.gloss, pinyin: p.pinyin }
    if (p.punct) return { ...t, punct: true }
    const s = sylls[k++]
    if (p.outside) return { ...t, outside: true }
    return {
      ...t,
      pinyin: s,
      ...(p.id ? { id: p.id } : {}),
      ...(p.parts ? { parts: p.parts } : {}),
    }
  })
}

// Text between the Chinese: words of English together, and each mark
const other = (s: string): Array<Part> =>
  (
    s.match(/[\p{L}\p{N}'’]+(?:\s+[\p{L}\p{N}'’]+)*|[^\s\p{L}\p{N}]/gu) ?? []
  ).map(text)

// A line as heard, with no help: Chinese split into the bank's words
export function segment(line: string): Array<Token> {
  return settle(runs(line).flatMap((r) => (HAN.test(r) ? split(r) : other(r))))
}

// Pinyin as the partner gave it, a syllable to a character: spaced as
// asked ("wǔ fàn"), or run together ("wǔfàn", "wǒmenshénme"), split by
// the syllables Mandarin has. Null unless it comes to `n` syllables.
// Syllables said only in the neutral tone, which SYLLABLES leaves out,
// and the r of 儿
const NEUTRAL = new Set(['me', 'lo', 'r'])

export function spell(p: string, n: number): Array<string> | null {
  const out: Array<string> = []
  for (const chunk of p
    .trim()
    .split(/[\s'’-]+/)
    .filter(Boolean)) {
    const cs = [...chunk]
    const plain = cs.map((c) => bare(c).toLowerCase().replace('v', 'ü'))
    // the longest syllable first, going back where the rest will not split
    const go = (i: number): Array<string> | null => {
      if (i === cs.length) return []
      for (let len = Math.min(6, cs.length - i); len > 0; len--) {
        const base = plain.slice(i, i + len).join('')
        if (!(base in SYLLABLES) && !NEUTRAL.has(base)) continue
        const rest = go(i + len)
        if (rest) return [cs.slice(i, i + len).join(''), ...rest]
      }
      return null
    }
    const ss = go(0)
    if (!ss) return null
    out.push(...ss)
  }
  return out.length === n ? out : null
}

// A line as the partner gave it to show_line. A word of the bank is shown
// from the bank; an item made of several words (a phrase, or a whole
// sentence given as one) is shown as those, the words of the bank from
// the bank and the rest outside it, with the partner's pinyin for them
// where it can be lined up with the characters; a single word outside the
// bank keeps the partner's pinyin and English.
export function fromItems(items: Array<Item>): Array<Token> {
  if (!Array.isArray(items)) return []
  const parts = items.flatMap((it): Array<Part> => {
    const rs = runs(typeof it.w === 'string' ? it.w : '')
    const han = rs.filter((r) => HAN.test(r))
    // the partner's pinyin and English belong to the item's only Chinese
    const alone = han.length === 1
    return rs.flatMap((r) => {
      if (!HAN.test(r)) return other(r)
      const known = bankWord(r)
      if (known) return [known]
      const ps = split(r)
      if (ps.every((p) => !p.outside)) return ps
      const sylls =
        alone && typeof it.p === 'string' ? spell(it.p, [...r].length) : null
      // a word of up to four characters is one word, even if part of it
      // is a word of the bank (韭菜); a longer item is a phrase
      if ((ps.length === 1 && ps[0].outside) || [...r].length <= 4)
        return [
          {
            h: r,
            gloss: alone && typeof it.e === 'string' ? it.e.trim() : '',
            pinyin: sylls ?? [],
            outside: true,
          },
        ]
      let at = 0
      return ps.map((p) => {
        const n = [...p.h].length
        const mine = sylls?.slice(at, at + n) ?? []
        at += n
        return p.outside ? { ...p, pinyin: mine } : p
      })
    })
  })
  return settle(parts)
}

// The words of the bank in a line
export const idsIn = (toks: Array<Token>) => [
  ...new Set(toks.flatMap((t) => (t.id ? [t.id] : (t.parts ?? [])))),
]

// --- Sound ---

// Sound comes and goes as 16-bit PCM, little-endian, in base64
export function toBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromBase64(b64: string): Float32Array<ArrayBuffer> {
  const s = atob(b64)
  const n = s.length >> 1
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const v = s.charCodeAt(2 * i) | (s.charCodeAt(2 * i + 1) << 8)
    out[i] = (v >= 0x8000 ? v - 0x10000 : v) / 0x8000
  }
  return out
}
