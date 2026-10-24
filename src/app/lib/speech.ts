import { COUNTRIES, WORDS } from '../data/words.ts'
import { PLAYER_VOICE, SCENES } from '../data/trip.ts'
import { EXTRA_LINES, EXTRA_SPEECH } from '../data/extra.ts'
import { plain, tokens } from './text.ts'

// Everything Tian can play, as voice and text: each word in the word
// voice, and each line of the trip in its speaker's voice, once for every
// home country where it names one. scripts/audio.py makes the
// sound files with Gemini TTS; the page plays them by `speechKey`, and
// falls back on the browser's own Chinese voice where there is none.

export const WORD_VOICE = 'Kore'

export interface SpeechItem {
  voice: string
  text: string
  // What kind of reading, for the style asked of the TTS: a word, a line,
  // or a syllable written in pinyin (the pinyin chart)
  kind: 'word' | 'line' | 'syllable'
  // What the voice reads, where not the text: a syllable's character
  read?: string
  // A bank word's pinyin, so that the voice says the reading meant: a
  // character on its own may otherwise come out in another reading, or
  // with an r (哪 as nǎr)
  pinyin?: string
}

export const speechKey = (voice: string, text: string) => `${voice}|${text}`

export function speechItems(): Array<SpeechItem> {
  const items: Array<SpeechItem> = []
  const seen = new Set<string>()
  const add = (
    voice: string,
    text: string,
    kind: SpeechItem['kind'],
    read?: string,
    pinyin?: string,
  ) => {
    const key = speechKey(voice, text)
    if (seen.has(key)) return
    seen.add(key)
    items.push({
      voice,
      text,
      kind,
      ...(read ? { read } : {}),
      ...(pinyin ? { pinyin } : {}),
    })
  }
  for (const w of WORDS) add(WORD_VOICE, w.h, 'word', undefined, w.p)
  for (const s of SCENES)
    for (const step of s.steps) {
      const said =
        step.kind === 'line'
          ? [{ zh: step.zh, voice: s.cast[step.by].voice }]
          : step.options
              .filter((o) => o.right)
              .map((o) => ({ zh: o.zh, voice: PLAYER_VOICE }))
      for (const { zh, voice } of said) {
        const homes = zh.includes('{home}') ? COUNTRIES : [COUNTRIES[0]]
        for (const home of homes)
          add(voice, plain(zh, { home: home.id }), 'line')
      }
    }
  for (const e of EXTRA_SPEECH) add(e.voice, e.text, e.kind, e.read)
  // A number is one word in a line but not in the bank: tapped, it is
  // heard on its own, as a word
  const lines = [
    ...SCENES.flatMap((s) =>
      s.steps.flatMap((step) =>
        step.kind === 'line' ? [step.zh] : step.options.map((o) => o.zh),
      ),
    ),
    ...EXTRA_LINES,
  ]
  for (const zh of lines)
    for (const home of COUNTRIES)
      for (const t of tokens(zh, { home: home.id }))
        if (t.parts) add(WORD_VOICE, t.h, 'word')
  return items
}
