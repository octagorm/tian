import { TONE_SETS } from './tones.ts'
import { CAPTAIN_LINES, CAPTAIN_VOICE, MISSIONS, ORDERS } from './bridge.ts'
import { SHOP_ORDERS } from './shop.ts'
import { NUMBER_ITEMS } from './numbers.ts'
import { SAYINGS, sayer } from './sayings.ts'
import { BUILT, PICTURES } from './parts.ts'
import { STORIES, STORY_VOICE } from './stories.ts'
import { SEALS } from './seals.ts'
import { GARDEN_ITEMS, NIGHT_LINE, SEASON_LINES } from './garden.ts'
import { QUEST_SPEECH } from './quest.ts'
import { pinyinSpeech } from './pinyin.ts'

// Speech for the games beyond the word bank and the trip, gathered for
// lib/speech.ts. Lines are written word by word as in the trip; here
// they are joined, as they are spoken.

export interface ExtraSpeech {
  voice: string
  text: string
  kind: 'word' | 'line' | 'syllable'
  read?: string
}

const WORD_VOICE = 'Kore'

const joined = (zh: string) =>
  zh
    .split(' ')
    .filter(Boolean)
    .map((t) => t.split('=')[0])
    .join('')

export const EXTRA_SPEECH: Array<ExtraSpeech> = [
  ...TONE_SETS.flatMap((s) =>
    s.chars.map((text) => ({ voice: WORD_VOICE, text, kind: 'word' as const })),
  ),
  ...[...BUILT.map((b) => b.c), ...PICTURES.map((p) => p.c)].map((text) => ({
    voice: WORD_VOICE,
    text,
    kind: 'word' as const,
  })),
  ...[...ORDERS, ...MISSIONS].map((o) => ({
    voice: CAPTAIN_VOICE,
    text: joined(o.zh),
    kind: 'line' as const,
  })),
  ...SHOP_ORDERS.map((o) => ({
    voice: o.voice,
    text: joined(o.zh),
    kind: 'line' as const,
  })),
  ...NUMBER_ITEMS.map((n) => ({
    voice: WORD_VOICE,
    text: n.say,
    kind: 'line' as const,
  })),
  ...STORIES.flatMap((s) =>
    s.lines.map(([zh]) => ({
      voice: STORY_VOICE,
      text: joined(zh),
      kind: 'line' as const,
    })),
  ),
  ...SAYINGS.map((s) => ({
    voice: sayer(s),
    text: s.zh,
    kind: 'line' as const,
  })),
  ...CAPTAIN_LINES.map((o) => ({
    voice: CAPTAIN_VOICE,
    text: joined(o.zh),
    kind: 'line' as const,
  })),
  // The characters on the seals, the garden's things, the garden's lines
  // for each season and the night, and Today's goodbye
  ...[...SEALS.map((s) => s.zh), ...GARDEN_ITEMS.map((g) => g.zh)].map(
    (text) => ({ voice: WORD_VOICE, text, kind: 'word' as const }),
  ),
  ...[...Object.values(SEASON_LINES), NIGHT_LINE, { zh: '明天 见 ！' }].map(
    (l) => ({ voice: WORD_VOICE, text: joined(l.zh), kind: 'line' as const }),
  ),
  ...QUEST_SPEECH,
  // The pinyin chart, every sound read from its pinyin
  ...pinyinSpeech().map((s) => ({
    voice: WORD_VOICE,
    kind: 'syllable' as const,
    ...s,
  })),
]
