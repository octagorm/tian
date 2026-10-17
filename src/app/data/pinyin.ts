import { mark } from '../lib/pinyin.ts'
import { READ_AS, SYLLABLES } from './syllables.ts'

// The pinyin chart (拼音字母表) as children in China learn it: the
// initials (声母), each called by a syllable of its own (b is "bō"), the
// finals (韵母), and the syllables read whole (整体认读音节), with how to
// say each. The tips are for an English speaker, and say only what is
// true of Mandarin as the standard teaches it. Every syllable is spoken
// in the word voice from its pinyin (data/extra.ts); SYLLABLES (made by
// scripts/syllables.py) says which tones a syllable has, with a
// common character for each.

export interface Sound {
  // As written in the chart: 'zh', 'ang', 'zhi'
  id: string
  // What is said for it: an initial's name, or the syllable a final makes
  // on its own (i is said yi), in pinyin without a tone
  say: string
  tip: string
}

export interface SoundGroup {
  id: string
  title: string
  zh: string
  pinyin: string
  note: string
  sounds: Array<Sound>
}

export const INITIALS: Array<SoundGroup> = [
  {
    id: 'lips',
    title: 'Lips',
    zh: '唇音',
    pinyin: 'chúnyīn',
    note: 'Made with the lips. b and p differ only in a puff of air.',
    sounds: [
      {
        id: 'b',
        say: 'bo',
        tip: 'Lips together, then open with no puff of air. To English ears it lies between b and p: a hand before your mouth should feel almost nothing.',
      },
      {
        id: 'p',
        say: 'po',
        tip: 'As b, with a strong puff of air, as in "pie".',
      },
      { id: 'm', say: 'mo', tip: 'As English m.' },
      {
        id: 'f',
        say: 'fo',
        tip: 'Upper teeth on the lower lip, as English f.',
      },
    ],
  },
  {
    id: 'tip',
    title: 'Tongue tip',
    zh: '舌尖中音',
    pinyin: 'shéjiān zhōngyīn',
    note: 'The tip of the tongue on the ridge behind the upper teeth. d and t differ only in a puff of air.',
    sounds: [
      {
        id: 'd',
        say: 'de',
        tip: 'Tongue tip on the ridge behind the upper teeth, released with no puff of air: between English d and t.',
      },
      {
        id: 't',
        say: 'te',
        tip: 'As d, with a strong puff of air, as in "tie".',
      },
      { id: 'n', say: 'ne', tip: 'As English n.' },
      { id: 'l', say: 'le', tip: 'As the l of "let".' },
    ],
  },
  {
    id: 'back',
    title: 'Back of the tongue',
    zh: '舌根音',
    pinyin: 'shégēnyīn',
    note: 'The back of the tongue against the soft palate. g and k differ only in a puff of air.',
    sounds: [
      {
        id: 'g',
        say: 'ge',
        tip: 'The back of the tongue against the soft palate, released with no puff of air: between English g and k.',
      },
      {
        id: 'k',
        say: 'ke',
        tip: 'As g, with a strong puff of air, as in "kite".',
      },
      {
        id: 'h',
        say: 'he',
        tip: 'Rougher than English h: the air rubs past the back of the tongue, a little like ch in Scottish "loch".',
      },
    ],
  },
  {
    id: 'flat',
    title: 'Tongue flat',
    zh: '舌面音',
    pinyin: 'shémiànyīn',
    note: 'The tip of the tongue down behind the lower teeth, the front of it raised to the hard palate, lips spread as in a smile. Only i and ü follow them.',
    sounds: [
      {
        id: 'j',
        say: 'ji',
        tip: 'Tongue tip down behind the lower teeth, the front of the tongue on the hard palate, no puff of air. Close to the j of "jeep", said with a smile.',
      },
      {
        id: 'q',
        say: 'qi',
        tip: 'As j, with a strong puff of air: close to the ch of "cheese", the tongue tip kept down.',
      },
      {
        id: 'x',
        say: 'xi',
        tip: 'As j, but the air hisses through: between s and sh, the tongue tip down and the lips spread.',
      },
    ],
  },
  {
    id: 'curled',
    title: 'Tongue curled back',
    zh: '翘舌音',
    pinyin: 'qiàoshéyīn',
    note: 'The tip of the tongue turned up and back, behind the ridge of the gums. Told apart from z, c and s by the curl alone.',
    sounds: [
      {
        id: 'zh',
        say: 'zhi',
        tip: 'Tongue tip curled up and back to the roof of the mouth, released with no puff of air. Close to the j of "jerk".',
      },
      {
        id: 'ch',
        say: 'chi',
        tip: 'As zh, with a strong puff of air: close to the ch of "church", the tongue curled back.',
      },
      {
        id: 'sh',
        say: 'shi',
        tip: 'Tongue tip curled back, the air hissing over it: close to the sh of "shirt".',
      },
      {
        id: 'r',
        say: 'ri',
        tip: 'The tongue curled back as for sh, but voiced and with little hiss: between the s of "pleasure" and an English r.',
      },
    ],
  },
  {
    id: 'teeth',
    title: 'Tongue tip at the teeth',
    zh: '平舌音',
    pinyin: 'píngshéyīn',
    note: 'The tip of the tongue flat behind the upper front teeth. Told apart from zh, ch and sh by the curl alone.',
    sounds: [
      {
        id: 'z',
        say: 'zi',
        tip: 'Tongue tip behind the upper front teeth, no puff of air: like the ds of "beds".',
      },
      {
        id: 'c',
        say: 'ci',
        tip: 'As z, with a strong puff of air: like the ts of "cats".',
      },
      { id: 's', say: 'si', tip: 'As the s of "see".' },
    ],
  },
  {
    id: 'glides',
    title: 'Glides',
    zh: '半元音',
    pinyin: 'bànyuányīn',
    note: 'Written for i, u and ü at the start of a syllable: yi, ya, yu, wu, wa.',
    sounds: [
      {
        id: 'y',
        say: 'yi',
        tip: 'As the y of "yes". It stands for i or ü at the start of a syllable: yi, ya, yu, yue.',
      },
      {
        id: 'w',
        say: 'wu',
        tip: 'As the w of "we". It stands for u at the start of a syllable: wu, wa, wo.',
      },
    ],
  },
]

export const FINALS: Array<SoundGroup> = [
  {
    id: 'single',
    title: 'Single',
    zh: '单韵母',
    pinyin: 'dānyùnmǔ',
    note: 'One vowel each, held steady from start to end.',
    sounds: [
      { id: 'a', say: 'a', tip: 'Wide open, as the a of "father".' },
      {
        id: 'o',
        say: 'o',
        tip: 'Lips rounded, as "or" without the r. After b, p, m and f it slides in from u: bo is close to "bwo".',
      },
      {
        id: 'e',
        say: 'e',
        tip: 'Not the e of "bed": lips spread and the tongue pulled back, like "uh" said far back in the mouth.',
      },
      {
        id: 'i',
        say: 'yi',
        tip: 'As the ee of "see". Written yi on its own. After z, c, s, zh, ch, sh and r it is another sound: see the syllables read whole.',
      },
      {
        id: 'u',
        say: 'wu',
        tip: 'As the oo of "food", lips well rounded. Written wu on its own.',
      },
      {
        id: 'ü',
        say: 'yu',
        tip: 'Say "ee", then round your lips as for "oo" without moving your tongue, as German ü. Written yu on its own, and u after j, q and x: ju, qu, xu.',
      },
    ],
  },
  {
    id: 'compound',
    title: 'Compound',
    zh: '复韵母',
    pinyin: 'fùyùnmǔ',
    note: 'Two or three vowels run together, the mouth moving from one to the next.',
    sounds: [
      { id: 'ai', say: 'ai', tip: 'As "eye".' },
      { id: 'ei', say: 'ei', tip: 'As the ay of "day".' },
      {
        id: 'ui',
        say: 'wei',
        tip: 'Short for uei: close to "way". Written wei on its own; gui is close to "gway".',
      },
      { id: 'ao', say: 'ao', tip: 'As the ow of "cow".' },
      { id: 'ou', say: 'ou', tip: 'As the o of "go".' },
      {
        id: 'iu',
        say: 'you',
        tip: 'Short for iou: close to "yo". Written you on its own; liu is close to "lyo".',
      },
      {
        id: 'ie',
        say: 'ye',
        tip: 'Close to "yeh", the ye of "yes". Written ye on its own.',
      },
      {
        id: 'üe',
        say: 'yue',
        tip: 'ü, then a short "eh". Written yue on its own, and ue after j, q and x: jue, que, xue.',
      },
      {
        id: 'er',
        say: 'er',
        tip: 'Close to "ar" with the tongue curled back, as American "are". Never after an initial: 儿 ér, 耳 ěr, 二 èr.',
      },
    ],
  },
  {
    id: 'front',
    title: 'Front nasal',
    zh: '前鼻韵母',
    pinyin: 'qiánbí yùnmǔ',
    note: 'Ending in n, the tongue tip on the ridge behind the upper teeth.',
    sounds: [
      {
        id: 'an',
        say: 'an',
        tip: 'The a of "father", then n: close to "ahn".',
      },
      {
        id: 'en',
        say: 'en',
        tip: 'Close to the un of "under", ending in n.',
      },
      {
        id: 'in',
        say: 'yin',
        tip: 'As the een of "seen". Written yin on its own.',
      },
      {
        id: 'un',
        say: 'wen',
        tip: 'Short for uen: close to "wun". Written wen on its own; after j, q and x it is ün: jun, qun, xun.',
      },
      {
        id: 'ün',
        say: 'yun',
        tip: 'ü, then n. Written yun on its own, and un after j, q and x.',
      },
    ],
  },
  {
    id: 'back',
    title: 'Back nasal',
    zh: '后鼻韵母',
    pinyin: 'hòubí yùnmǔ',
    note: 'Ending in ng, as in "sing", the back of the tongue raised: no g is heard.',
    sounds: [
      {
        id: 'ang',
        say: 'ang',
        tip: 'The a of "father", then the ng of "sing".',
      },
      { id: 'eng', say: 'eng', tip: 'Close to the ung of "lung".' },
      {
        id: 'ing',
        say: 'ying',
        tip: 'As the ing of "sing". Written ying on its own.',
      },
      {
        id: 'ong',
        say: 'ong',
        tip: 'oo, then ng, the lips rounded: close to "oong". Only after an initial; on its own it is weng.',
      },
    ],
  },
]

// Read whole, never spelt out from their parts
export const WHOLE: SoundGroup = {
  id: 'whole',
  title: 'Read whole',
  zh: '整体认读音节',
  pinyin: 'zhěngtǐ rèndú yīnjié',
  note: 'These are learnt as they are, not put together from an initial and a final.',
  sounds: [
    ...['zhi', 'chi', 'shi', 'ri'].map((id) => ({
      id,
      say: id,
      tip: 'The i here is not "ee": the consonant is held on, the tongue curled back where it was, and voiced.',
    })),
    ...['zi', 'ci', 'si'].map((id) => ({
      id,
      say: id,
      tip: 'The i here is not "ee": the consonant is held on, the tongue at the teeth where it was, and voiced.',
    })),
    { id: 'yi', say: 'yi', tip: 'i on its own: the ee of "see".' },
    { id: 'wu', say: 'wu', tip: 'u on its own: the oo of "food".' },
    { id: 'yu', say: 'yu', tip: 'ü on its own.' },
    { id: 'ye', say: 'ye', tip: 'ie on its own: close to "yeh".' },
    { id: 'yue', say: 'yue', tip: 'üe on its own.' },
    {
      id: 'yuan',
      say: 'yuan',
      tip: 'üan on its own: the a is closer to "e", so it is close to "ywen".',
    },
    { id: 'yin', say: 'yin', tip: 'in on its own.' },
    { id: 'yun', say: 'yun', tip: 'ün on its own.' },
    { id: 'ying', say: 'ying', tip: 'ing on its own.' },
  ],
}

// --- The table of every syllable: an initial and a final

export const TABLE_INITIALS = [
  '',
  'b',
  'p',
  'm',
  'f',
  'd',
  't',
  'n',
  'l',
  'g',
  'k',
  'h',
  'j',
  'q',
  'x',
  'zh',
  'ch',
  'sh',
  'r',
  'z',
  'c',
  's',
]

// Finals in the order of the table; -i is the i of zhi and zi
export const TABLE_FINALS = [
  'a',
  'o',
  'e',
  '-i',
  'er',
  'ai',
  'ei',
  'ao',
  'ou',
  'an',
  'en',
  'ang',
  'eng',
  'ong',
  'i',
  'ia',
  'ie',
  'iao',
  'iu',
  'ian',
  'in',
  'iang',
  'ing',
  'iong',
  'u',
  'ua',
  'uo',
  'uai',
  'ui',
  'uan',
  'un',
  'uang',
  'ueng',
  'ü',
  'üe',
  'üan',
  'ün',
]

// Without an initial, the finals of the i, u and ü rows are spelt with y
// and w
const ZERO: Record<string, string> = {
  yi: 'i',
  ya: 'ia',
  yo: 'io',
  ye: 'ie',
  yao: 'iao',
  you: 'iu',
  yan: 'ian',
  yin: 'in',
  yang: 'iang',
  ying: 'ing',
  yong: 'iong',
  wu: 'u',
  wa: 'ua',
  wo: 'uo',
  wai: 'uai',
  wei: 'ui',
  wan: 'uan',
  wen: 'un',
  wang: 'uang',
  weng: 'ueng',
  yu: 'ü',
  yue: 'üe',
  yuan: 'üan',
  yun: 'ün',
}

const ALL_INITIALS = [...TABLE_INITIALS.filter(Boolean), 'y', 'w'].sort(
  (a, b) => b.length - a.length,
)

// A syllable (without its tone) as an initial and a final, as the table
// has them: 'zhuang' → zh + uang, 'ju' → j + ü, 'you' → '' + iu
export function parts(syllable: string): { initial: string; final: string } {
  if (ZERO[syllable]) return { initial: '', final: ZERO[syllable] }
  const initial = ALL_INITIALS.find((i) => syllable.startsWith(i)) ?? ''
  let final = syllable.slice(initial.length)
  if (/^(z|c|s|zh|ch|sh|r)$/.test(initial) && final === 'i') final = '-i'
  if (/^[jqx]$/.test(initial) && final.startsWith('u'))
    final = 'ü' + final.slice(1)
  return { initial, final }
}

// The syllables of the table, by initial and final
export const GRID: Record<
  string,
  Record<string, string | undefined> | undefined
> = {}
for (const s of Object.keys(SYLLABLES)) {
  const { initial, final } = parts(s)
  ;(GRID[final] ??= {})[initial] = s
}

// The tones a syllable is said in, with a common character for each
export function tonesOf(
  syllable: string,
): Array<{ tone: number; char: string | null }> {
  const chars = [...(SYLLABLES[syllable] ?? '····')]
  return [1, 2, 3, 4].map((tone) => ({
    tone,
    char: chars[tone - 1] === '·' ? null : chars[tone - 1],
  }))
}

// --- Telling sounds apart

export interface Contrast {
  id: string
  // What differs: the initial, the final, or the tone
  kind: 'initial' | 'final' | 'tone'
  sounds: Array<string>
  title: string
  tip: string
}

export const CONTRASTS: Array<Contrast> = [
  {
    id: 'zh-z-j',
    kind: 'initial',
    sounds: ['zh', 'z', 'j'],
    title: 'zh · z · j',
    tip: 'zh: tongue curled back. z: tip behind the upper teeth. j: tip down, lips spread.',
  },
  {
    id: 'ch-c-q',
    kind: 'initial',
    sounds: ['ch', 'c', 'q'],
    title: 'ch · c · q',
    tip: 'ch: tongue curled back. c: tip behind the upper teeth, like "ts". q: tip down, lips spread.',
  },
  {
    id: 'sh-s-x',
    kind: 'initial',
    sounds: ['sh', 's', 'x'],
    title: 'sh · s · x',
    tip: 'sh: tongue curled back. s: as in "see". x: tip down, lips spread, between s and sh.',
  },
  {
    id: 'b-p',
    kind: 'initial',
    sounds: ['b', 'p'],
    title: 'b · p',
    tip: 'p has a strong puff of air; b none.',
  },
  {
    id: 'd-t',
    kind: 'initial',
    sounds: ['d', 't'],
    title: 'd · t',
    tip: 't has a strong puff of air; d none.',
  },
  {
    id: 'g-k',
    kind: 'initial',
    sounds: ['g', 'k'],
    title: 'g · k',
    tip: 'k has a strong puff of air; g none.',
  },
  {
    id: 'n-l',
    kind: 'initial',
    sounds: ['n', 'l'],
    title: 'n · l',
    tip: 'n goes through the nose; l lets the air out at the sides of the tongue.',
  },
  {
    id: 'r-l',
    kind: 'initial',
    sounds: ['r', 'l'],
    title: 'r · l',
    tip: 'r: tongue curled back, a soft buzz. l: tongue tip on the ridge, as in "let".',
  },
  {
    id: 'f-h',
    kind: 'initial',
    sounds: ['f', 'h'],
    title: 'f · h',
    tip: 'f: teeth on the lip. h: air rubbing at the back of the mouth.',
  },
  {
    id: 'an-ang',
    kind: 'final',
    sounds: ['an', 'ang'],
    title: 'an · ang',
    tip: 'an ends with the tongue tip up (n); ang with the back of the tongue raised (ng), and the a sounds further back.',
  },
  {
    id: 'en-eng',
    kind: 'final',
    sounds: ['en', 'eng'],
    title: 'en · eng',
    tip: 'en ends in n, the tongue tip up; eng in ng, as in "lung".',
  },
  {
    id: 'in-ing',
    kind: 'final',
    sounds: ['in', 'ing'],
    title: 'in · ing',
    tip: 'in ends in n, as "seen"; ing in ng, as "sing".',
  },
  {
    id: 'ian-iang',
    kind: 'final',
    sounds: ['ian', 'iang'],
    title: 'ian · iang',
    tip: 'ian is close to "yen"; iang is "yahng", the a open.',
  },
  {
    id: 'uan-uang',
    kind: 'final',
    sounds: ['uan', 'uang'],
    title: 'uan · uang',
    tip: 'uan ends in n; uang in ng, the a further back.',
  },
  {
    id: 'u-ü',
    kind: 'final',
    sounds: ['u', 'ü'],
    title: 'u · ü',
    tip: 'u: tongue back, as "oo". ü: tongue forward, as "ee", lips rounded.',
  },
  {
    id: 'ie-üe',
    kind: 'final',
    sounds: ['ie', 'üe'],
    title: 'ie · üe',
    tip: 'ie starts with the lips spread; üe with them rounded.',
  },
  {
    id: 'ou-uo',
    kind: 'final',
    sounds: ['ou', 'uo'],
    title: 'ou · uo',
    tip: 'ou is "oh"; uo is "wo", starting from oo.',
  },
  {
    id: 'ai-ei',
    kind: 'final',
    sounds: ['ai', 'ei'],
    title: 'ai · ei',
    tip: 'ai is "eye"; ei is the ay of "day".',
  },
  {
    id: 'tones',
    kind: 'tone',
    sounds: ['1', '2', '3', '4'],
    title: 'ˉ ˊ ˇ ˋ tones',
    tip: '1 high and level, 2 rising, 3 low and dipping, 4 falling.',
  },
]

// Sets of syllables that differ only as a contrast says, all said in the
// same tone: each set is one question. Initials are set against each
// other before the same spelling (zhi, zi, ji), finals after the same
// initial (ban, bang).
export function frames(c: Contrast): Array<Array<string>> {
  const out: Array<Array<string>> = []
  const add = (built: Array<string>) => {
    for (let tone = 1; tone <= 4; tone++) {
      const said = built.filter((s) => tonesOf(s)[tone - 1].char)
      if (said.length >= 2) out.push(said.map((s) => mark(s, tone)))
    }
  }
  if (c.kind === 'tone') {
    for (const s of Object.keys(SYLLABLES)) {
      const tones = tonesOf(s).filter((t) => t.char)
      if (tones.length >= 3) out.push(tones.map((t) => mark(s, t.tone)))
    }
  } else if (c.kind === 'initial') {
    const rests = new Set(
      Object.keys(SYLLABLES).map((s) => s.slice(parts(s).initial.length)),
    )
    for (const rest of rests)
      add(c.sounds.map((i) => i + rest).filter((s) => SYLLABLES[s]))
  } else {
    for (const initial of TABLE_INITIALS)
      add(c.sounds.flatMap((f) => GRID[f]?.[initial] ?? []))
  }
  return out
}

// The syllable an initial is called by: in the first tone, but ri in the
// fourth
export const nameOf = (s: Sound) => mark(s.say, s.say === 'ri' ? 4 : 1)

// Everything the chart and the ear training say: each initial's name,
// each final and syllable read whole in all four tones (the chart's
// drill), and each syllable of the table in the tones it is said in. A
// syllable in a tone no word has is left out: the voice drifts to one
// that has. Each is said from a character usually read so, where there is
// one (`read`), else from its pinyin.
export function pinyinSpeech(): Array<{ text: string; read?: string }> {
  const out = new Set<string>()
  for (const g of INITIALS) for (const s of g.sounds) out.add(nameOf(s))
  for (const g of [...FINALS, WHOLE])
    for (const s of g.sounds)
      for (let tone = 1; tone <= 4; tone++) out.add(mark(s.say, tone))
  for (const s of Object.keys(SYLLABLES))
    for (const { tone, char } of tonesOf(s)) if (char) out.add(mark(s, tone))
  return [...out].map((text) =>
    READ_AS[text] ? { text, read: READ_AS[text] } : { text },
  )
}
