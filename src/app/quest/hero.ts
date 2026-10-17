import { QUEST, SKILLS } from '../data/quest'
import { WORDS } from '../data/words'
import { level } from '../lib/bank'
import type { Chapter, Skill } from '../data/quest'
import type { Bank } from '../lib/bank'

// Wukong grows with the word bank: a level for every ten words met, blows
// that grow harder with each level (by less and less, up to two and a half
// times), and health for each word known. His arts come back to him as
// words become known (SKILLS); what he carries, and who walks with him,
// comes from the chapters won. Nothing here is stored: it all follows from
// the bank.

export interface Hero {
  met: number
  known: number
  level: number
  // Words met towards the next level, of ten
  xp: number
  hp: number
  power: number
  skills: Array<Skill>
  // The next art to come back, if any
  next?: Skill
  won: (id: string) => boolean
  peaches: number
  // Three life-saving hairs: rise again once a fight
  hairs: boolean
  // A wind-fixing pill: still the twist for three turns, once a fight
  pill: boolean
  // A gourd of elixir: heal fully, once a fight
  gourd: boolean
  party: Array<'monk' | 'pig' | 'sand'>
  stars: number
}

export const powerAt = (lv: number) => 1 + 1.5 * (1 - Math.exp(-(lv - 1) / 10))

export function heroOf(bank: Bank, now = Date.now()): Hero {
  const met = WORDS.filter((w) => bank.cards[w.id])
  const known = met.filter((w) => level(bank.cards[w.id], now) === 2).length
  const lv = 1 + Math.floor(met.length / 10)
  const won = (id: string) => (bank.scenes[id] ?? 0) > 0
  const pig = won('q10')
  const sand = won('q11')
  return {
    met: met.length,
    known,
    level: lv,
    xp: met.length % 10,
    hp: 100 + Math.min(150, known * 2) + (pig ? 20 : 0),
    power: powerAt(lv),
    skills: SKILLS.filter((s) => known >= s.known),
    next: SKILLS.find((s) => known < s.known),
    won,
    peaches: 1 + (sand ? 1 : 0) + (won('q8') ? 2 : 0),
    hairs: won('q1'),
    pill: won('q3'),
    gourd: won('q12'),
    party: [
      'monk',
      ...(pig ? (['pig'] as const) : []),
      ...(sand ? (['sand'] as const) : []),
    ],
    stars: QUEST.reduce((n, c) => n + (bank.scenes[c.id] ?? 0), 0),
  }
}

// A chapter is open once the one before it is won. Chapters added to the
// road later stay open to a player who has already won those after them.
export function isOpen(bank: Bank, i: number): boolean {
  const won = (c: Chapter) => (bank.scenes[c.id] ?? 0) > 0
  return (
    i === 0 ||
    won(QUEST[i]) ||
    won(QUEST[i - 1]) ||
    QUEST.slice(i + 1).some(won)
  )
}

// Where the party stands: the first open chapter not yet won, or the last
export function reached(bank: Bank): number {
  const i = QUEST.findIndex(
    (c, k) => !(bank.scenes[c.id] ?? 0) && isOpen(bank, k),
  )
  return i === -1 ? QUEST.length - 1 : i
}
