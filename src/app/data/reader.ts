import { BEIJING } from './texts/beijing.ts'
import { XIAN } from './texts/xian.ts'
import { STUMP } from './texts/stump.ts'
import { SNAKE } from './texts/snake.ts'

// The reader's texts (games/read.tsx): short pieces to read in hanzi, each
// word with its pinyin over it and its English under it until its links to
// the character are known. The first two are written for a learner who has
// taken the trip from Beijing to Xi'an, mostly in its words; the fables
// after them are old ones told simply.
//
// A text's lines are written as everywhere in Tian (lib/text.ts), word by
// word with spaces, `word=gloss` for a better gloss in that place, and
// `word#key` for a note on the word there, from the text's `notes`. Every
// word must be in the bank; the words a text needs beyond the rest are the
// last lesson of data/words.ts, Reading.

export interface Text {
  // Its page: /#read/beijing
  id: string
  zh: string
  pinyin: string
  en: string
  // Who wrote it, or where it is from
  by: string
  // Above the text: what it is, in a few plain lines
  about: string
  // Paragraphs, each a list of sentences
  text: Array<Array<string>>
  // Notes on a word where it stands, by the key after # in a line
  notes: Record<string, string>
}

export const TEXTS: Array<Text> = [BEIJING, XIAN, STUMP, SNAKE]

export const TEXT: Record<string, Text | undefined> = Object.fromEntries(
  TEXTS.map((t) => [t.id, t]),
)

// Every sentence of a text, in order
export const sentencesOf = (t: Text) => t.text.flat()
