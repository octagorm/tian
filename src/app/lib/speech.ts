import { COUNTRIES, WORDS } from '../data/words.ts'
import { PLAYER_VOICE, SCENES } from '../data/trip.ts'
import { EXTRA_SPEECH } from '../data/extra.ts'
import { plain } from './text.ts'

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
  ) => {
    const key = speechKey(voice, text)
    if (seen.has(key)) return
    seen.add(key)
    items.push(read ? { voice, text, kind, read } : { voice, text, kind })
  }
  for (const w of WORDS) add(WORD_VOICE, w.h, 'word')
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
  return items
}
