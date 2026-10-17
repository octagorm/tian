// Portraits for Tian: a head and shoulders, 24 × 28, drawn from a few
// traits (a Look). Each part is a small grid of letters, as the sprites are,
// stamped in order (hair behind, head and neck, clothes, face, beard,
// glasses, hair, hat); the letters are roles (skin, hair, coat…) that the
// Look's colours fill. The face also gives frames for blinking and talking.

export interface Look {
  // Hair colour; grey when old
  hair?: string
  // Hair style, or a hat with short hair under it (cap, chef, kufi)
  style?:
    | 'short'
    | 'long'
    | 'bun'
    | 'bald'
    | 'pony'
    | 'cap'
    | 'chef'
    | 'kufi'
    | 'spiky'
    | 'buns'
    | 'braids'
    | 'bob'
    | 'parted'
    | 'curly'
    | 'topknot'
    | 'buzz'
    | 'shaved'
  // Colour of the coat, shirt or dress
  coat: string
  skin?: string
  // A beard; old men's, and 'long' ones, reach the chest
  beard?: boolean | 'long'
  glasses?: boolean
  old?: boolean
  // Colour of a cap or hat, for the styles and headwear that have one
  hat?: string
  // A hat over any hair style
  headwear?:
    | 'cap'
    | 'straw'
    | 'beret'
    | 'scarf'
    | 'beanie'
    | 'ballcap'
    | 'official'
    | 'headband'
    | 'flower'
    | 'crown'
    | 'helmet'
    | 'veil'
  // What is worn: a jacket over a shirt unless said (or a chef's whites
  // with style chef, a uniform with style cap)
  clothes?:
    | 'jacket'
    | 'mandarin'
    | 'suit'
    | 'apron'
    | 'uniform'
    | 'tunic'
    | 'qipao'
    | 'hoodie'
    | 'tee'
    | 'robe'
    | 'chef'
    | 'armor'
    | 'kasaya'
  // A child, a grown-up (the default) or old (as old: true)
  age?: 'child' | 'adult' | 'old'
  expression?: 'neutral' | 'smile' | 'grin' | 'surprised' | 'stern' | 'sad'
  // A moustache alone (a beard has one)
  moustache?: boolean
  // Rosy cheeks
  blush?: boolean
  // Lashes and a lower lip; on unless false for long hair, buns, braids,
  // a bob or a ponytail
  lashes?: boolean
  // Colour of a tie, scarf, sash or trim
  accent?: string
  // Colour of the eyes; dark brown unless said
  eyes?: string
  // Earrings in this colour
  earrings?: string
}

export const PORTRAIT_W = 24
export const PORTRAIT_H = 28
const W = PORTRAIT_W
const H = PORTRAIT_H

// --- colour

function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60
  return [h, s, l]
}

function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  const to = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`
}

// Turn a hue toward another by up to `by` degrees, the short way round
function toward(h: number, target: number, by: number) {
  const d = ((target - h + 540) % 360) - 180
  return (h + Math.sign(d) * Math.min(Math.abs(d), by) + 360) % 360
}

// A colour's lit, shaded and deep tones: lighter toward yellow, darker
// toward violet, as a painter would
export function ramp(hex: string) {
  const [h, s, l] = toHsl(hex)
  const grey = s < 0.08
  return {
    light: fromHsl(
      grey ? h : toward(h, 50, 14),
      s,
      Math.min(0.96, l + 0.12 + (l < 0.25 ? 0.08 : 0)),
    ),
    base: hex,
    shade: fromHsl(
      grey ? 250 : toward(h, 255, 12),
      grey ? 0.1 : Math.min(1, s * 1.05),
      l * 0.74,
    ),
    deep: fromHsl(
      grey ? 255 : toward(h, 260, 22),
      grey ? 0.14 : Math.min(1, s * 1.1),
      l * 0.5,
    ),
  }
}

// --- stamping

type Grid = Array<Array<string>>

function blank(): Grid {
  return Array.from({ length: H }, () => Array<string>(W).fill('.'))
}

// Lay rows of letters on the grid from row y; '.' leaves what is there and
// '_' clears it
function stamp(g: Grid, rows: Array<string> | undefined, y = 0) {
  rows?.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === '.') continue
      const gy = y + j
      if (gy < 0 || gy >= H || i >= W) continue
      g[gy][i] = ch === '_' ? '.' : ch
    }
  })
}

const rowsOf = (g: Grid) => g.map((r) => r.join(''))

// --- the parts. Letters are roles:
//   K outline           k the face's outline
//   h S s F             skin, lit to deep shade
//   E eyes  w whites  W a glint   M mouth  m lips and tongue  b cheeks
//   I H J               hair: lit, base, shade (J is also the brows)
//   L C c D             coat: lit, base, shade, deep
//   U u                 shirt, collar or apron, and its shade
//   V v                 a uniform's shirt, and its shade
//   N                   black cloth
//   T t                 trim: buttons, frogs, badges, a hairpin
//   Y y                 earrings
//   R r                 accent: a tie, scarf, sash or ribbon
//   Q P p q             hat: lit, base, shade, deep
//   G g                 glasses, and a glint on them
// Each part is whole rows, 24 wide, from the top unless said; '.' leaves
// what is under it and '_' clears it.

// The head, from the crown to the chin, and the neck under it
const HEAD = [
  '........................',
  '........................',
  '........................',
  '.........kkkkkk.........',
  '.......kkhhSSSSkk.......',
  '......khhSSSSSSSsk......',
  '.....khSSSSSSSSSSsk.....',
  '.....kSSSSSSSSSSSsk.....',
  '.....kSSSSSSSSSSSsk.....',
  '.....kSSSSSSSSSSSsk.....',
  '....kkSSSSSSSSSSSskk....',
  '...khsSSSSSSSSSSSsssk...',
  '...kSsSSSSSSSSSSSsssk...',
  '...kSsShSSSSSSSSSsssk...',
  '....kkSSSSSSSSSSSskk....',
  '.....kSSSSSSSSSSSsk.....',
  '.....kSSSSSSSSSSssk.....',
  '......kSSSSSSSSSsk......',
  '......kSSSSSSSSssk......',
  '.......kSSSSSSssk.......',
  '........kkSSSskk........',
  '........KskkkkFK........',
  '........KFssssFK........',
  '........KSSSSssK........',
]

// Brows, eyes, nose and mouth, from row 8, for each expression
const FACE: Record<string, Array<string>> = {
  neutral: [
    '........................',
    '.......JJJ....JJJ.......',
    '........................',
    '........EE....EE........',
    '.......wEE....EEw.......',
    '........................',
    '............s...........',
    '...........ss...........',
    '........................',
    '..........sMMs..........',
  ],
  smile: [
    '........................',
    '.......JJJ....JJJ.......',
    '........................',
    '........EE....EE........',
    '.......wEE....EEw.......',
    '........................',
    '............s...........',
    '...........ss...........',
    '.........s....s.........',
    '..........MMMM..........',
  ],
  grin: [
    '........................',
    '.......JJJ....JJJ.......',
    '........................',
    '........EE....EE........',
    '.......sEE....EEs.......',
    '........................',
    '............s...........',
    '...........ss...........',
    '.........kMMMMk.........',
    '..........MwwM..........',
    '...........MM...........',
  ],
  surprised: [
    '.......JJJ....JJJ.......',
    '........................',
    '........................',
    '.......wEE....EEw.......',
    '.......wEE....EEw.......',
    '........................',
    '............s...........',
    '...........ss...........',
    '........................',
    '...........MM...........',
    '...........MM...........',
  ],
  stern: [
    '........................',
    '.......JJ......JJ.......',
    '.........J....J.........',
    '........EE....EE........',
    '.......wEE....EEw.......',
    '........................',
    '............s...........',
    '...........ss...........',
    '........................',
    '..........kMMk..........',
  ],
  sad: [
    '........................',
    '.........J....J.........',
    '.......JJ......JJ.......',
    '........EE....EE........',
    '.......wEE....EEw.......',
    '........................',
    '............s...........',
    '...........ss...........',
    '........................',
    '...........MM...........',
    '..........s..s..........',
  ],
}

// A child's eyes, with a glint, and round cheeks (from row 11)
const CHILD = [
  '........WE....WE........',
  '.......kEE....EEk.......',
  '........................',
  '......bb..........bb....',
]

// Lines of age (from row 12)
const AGED = [
  '......s..........s......',
  '.......ss......ss.......',
  '........................',
  '.........s....s.........',
  '.........s....s.........',
]

// Rosy cheeks (row 14)
const BLUSH = ['.......bb......bb.......']

// Lashes at the eyes' outer corners (row 11), and a lower lip (row 18)
const LASHES = ['.......E........E.......']
const LIP = ['...........mm...........']
const LASHED = new Set(['long', 'bun', 'pony', 'buns', 'braids', 'bob'])

// Eyes shut, for blinking (rows 11 and 12)
const SHUT = ['.......SSS....SSS.......', '.......kEE....EEk.......']

// The mouth while talking (rows 15 to 18): a few shapes, the first held
// still when motion is reduced
const TALK = [
  [
    '........................',
    '........................',
    '..........MMMM..........',
    '..........MmmM..........',
  ],
  [
    '........................',
    '........................',
    '..........sMMs..........',
    '...........mm...........',
  ],
  [
    '........................',
    '...........MM...........',
    '..........MmmM..........',
    '...........MM...........',
  ],
]

// Hair over the head; what is behind it (long hair) is drawn first
interface Hair {
  front: Array<string>
  behind?: Array<string>
}

const SHORT = [
  '........................',
  '........................',
  '.........KKKKKK.........',
  '.......KKHIIIHHKK.......',
  '......KHIIHHHHHHJK......',
  '.....KHIHHHHHHHHHJK.....',
  '....KHIHHHHHHHHHHJJK....',
  '....KHHHHHHHHHHHHHJK....',
  '....KHHHsHHssHHHsJJK....',
  '....KHHs.......s.JJK....',
  '....KH............JK....',
]

const HAIR: Record<string, Hair> = {
  short: { front: SHORT },
  spiky: {
    front: [
      '........K....K..........',
      '.......KHK..KHK..K......',
      '......KHIHKKHIHKKHK.....',
      '.....KHIIHHHIIHHHHJK....',
      '.....KHIHHHHHHHHHHJK....',
      '....KHIHHHHHHHHHHHJJK...',
      '...KHHIHHHHHHHHHHHHJJK..',
      '....KHHHJHHHHHJHHHHJK...',
      '....KHHJsHHsJHHsJHJJK...',
      '....KHHs.......s..JJK...',
      '....KH............JK....',
    ],
  },
  long: {
    front: [
      '........................',
      '........................',
      '.........KKKKKK.........',
      '.......KKHHIJHHKK.......',
      '......KHIIHHJHHHJK......',
      '.....KHIIHHJ.JHHHJK.....',
      '....KHIIHHJ..JHHHJJK....',
      '....KHIHHJ....JHHHJK....',
      '...KHIHHJ......JHHJJK...',
      '...KHIHJ........JHHJK...',
      '...KHIHJ........JHHJK...',
      '..KHIHJ..........JHJJK..',
      '..KHIHJ..........JHJJK..',
      '..KHIHJ..........JHJJK..',
      '..KHIHJ..........JHJJK..',
      '..KHIHK..........KHJJK..',
      '..KHIHK..........KHJJK..',
      '..KHHHK..........KJJJK..',
      '..KHHHK..........KJJJK..',
      '..KHHHK..........KJJJK..',
      '..KHHHK..........KJJJK..',
      '..KHHHHK........KHJJJK..',
      '..KHHHHK........KHJJJK..',
      '..KHHHHK........KJJJJK..',
      '...KHHHK........KJJJK...',
      '....KKK..........KKK....',
    ],
    behind: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
      '...JJJJJJJJJJJJJJJJJJ...',
    ],
  },
  bun: {
    front: [
      '..........KKKK..........',
      '.........KHIIHK.........',
      '.........KIHHJK.........',
      '.......KKKHJJJKKK.......',
      '......KHIIHHHHHHJK......',
      '.....KHIHHHHHHHHHJK.....',
      '....KHIHHHHHHHHHHJJK....',
      '....KHHs........sHJK....',
      '....KHs..........JJK....',
      '....KJ............JK....',
    ],
  },
  pony: {
    front: [
      '........................',
      '........................',
      '.........KKKKKK.........',
      '.......KKHIIIHHKKK......',
      '......KHIIHHHHHHJKRK....',
      '.....KHIHHHHHHHHHJKHK...',
      '....KHIHHHHHHHHHHJJKHK..',
      '....KHHHHHHHJJs..JK.KHK.',
      '....KHHHHJJs.....JK.KHK.',
      '....KHHJs.........K.KJK.',
      '....KH............K.KJK.',
      '....................KJK.',
      '....................KJK.',
      '.....................K..',
    ],
  },
  bald: {
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '....KK............KK....',
      '....KHK..........KJK....',
      '....KHH..........JJK....',
      '....KHH..........JJK....',
      '....KH............JK....',
    ],
  },
  buns: {
    front: [
      '....KKKK........KKKK....',
      '...KHIIHK......KHIHJK...',
      '...KIHHHJK....KHHHJJK...',
      '...KHHHJRKKKKKKRHHJJK...',
      '....KJRKHIIIHHHKRJJK....',
      '.....KHIHHHHHHHHHJK.....',
      '....KHIHHHHHHHHHHJJK....',
      '....KHHHHHHHHHHHHHJK....',
      '....KHHHHHHHHHHHHHJK....',
      '....KHHs..........JK....',
      '....KH............JK....',
    ],
  },
  braids: {
    front: [
      '........................',
      '........................',
      '.........KKKKKK.........',
      '.......KKHIIJHHKK.......',
      '......KHIIHHJHHHJK......',
      '.....KHIHHHHJHHHHJK.....',
      '....KHIHHHHHJHHHHJJK....',
      '....KHHHHHHHHHHHHHJK....',
      '....KHHHHHHHHHHHHHJK....',
      '....KHHs..........JK....',
      '...KHHK..........KJJK...',
      '...KHIK..........KJHK...',
      '...KIHK..........KHJK...',
      '...KHIK..........KJHK...',
      '...KIHK..........KHJK...',
      '...KHIK..........KJHK...',
      '...KIHK..........KHJK...',
      '...KHIK..........KJHK...',
      '...KIHK..........KHJK...',
      '...KHIK..........KJHK...',
      '...KIHK..........KHJK...',
      '...KHIK..........KJHK...',
      '...KRRK..........KRrK...',
      '...KHHK..........KJJK...',
      '....KK............KK....',
    ],
  },
  bob: {
    front: [
      '........................',
      '........................',
      '.........KKKKKK.........',
      '.......KKHIIIHHKK.......',
      '......KHIIHHHHHHJK......',
      '.....KHIHHHHHHHHHJK.....',
      '....KHIHHHHHHHHHHJJK....',
      '...KHIHHHHHHHHHHHHJJK...',
      '...KHIHHHHHHHHHHHHJJK...',
      '...KHIHs........sHJJK...',
      '...KHIH..........HJJK...',
      '...KHIH..........HJJK...',
      '...KHIH..........HJJK...',
      '...KHIH..........HJJK...',
      '...KHIH..........HJJK...',
      '...KHHH..........HJJK...',
      '...KHHHK........KHJJK...',
      '...KHHHK........KJJJK...',
      '....KKKK........KKKK....',
    ],
    behind: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '...JJJJJJJJJJJJJJJJJ....',
      '...JJJJJJJJJJJJJJJJJ....',
      '...JJJJJJJJJJJJJJJJJ....',
      '...JJJJJJJJJJJJJJJJJ....',
      '...JJJJJJJJJJJJJJJJJ....',
      '...JJJJJJJJJJJJJJJJJ....',
      '...JJJJJJJJJJJJJJJJJ....',
      '...JJJJJJJJJJJJJJJJJ....',
      '...JJJJJJJJJJJJJJJJJ....',
      '....JJJJJJJJJJJJJJJ.....',
    ],
  },
  parted: {
    front: [
      '........................',
      '........................',
      '.........KKKKKK.........',
      '.......KKHHIIIHKK.......',
      '......KHHJHIIIHHHK......',
      '.....KHHJIIHHHHHHJK.....',
      '....KHHJHIHHHHHHHHJK....',
      '....KHJ.HHHHHHHHHJJK....',
      '....KH...sHHHHHHsJJK....',
      '....KH........ss.JJK....',
      '....KH............JK....',
    ],
  },
  curly: {
    front: [
      '........................',
      '........KK.KK.KK........',
      '......KKHIKIHKHHKK......',
      '.....KHIHIHHIHHJHJK.....',
      '....KHIHIHHHHIHHHJJK....',
      '...KHIHHHIHHHHHJHHJJK...',
      '...KHHIHHHHIHHHHHJHJK...',
      '...KIHHHIHHHHHJHHHJJK...',
      '...KHHJHHJHHJHHJHJJJK...',
      '...KHJs.........sJHJK...',
      '...KHJ...........JJK....',
      '....KK...........KK.....',
    ],
  },
  topknot: {
    front: [
      '...........KK...........',
      '..........KIHK..........',
      '.......TTTTHJTTTt.......',
      '..........KHJK..........',
      '.......KKKKHJJKKK.......',
      '.....KHIIHHHHHHHJK......',
      '....KHIHHHHHHHHHHJK.....',
      '....KHHs........sJJK....',
      '....KHs..........JJK....',
      '....KJ............JK....',
    ],
  },
  buzz: {
    front: [
      '........................',
      '........................',
      '........................',
      '.........KKKKKK.........',
      '.......KKJHJHJHKK.......',
      '......KHJHHJHJHJJK......',
      '.....KHJHJHHJHJHJJK.....',
      '.....KJs.........sJK....',
      '.....K............K.....',
    ],
  },
  // A monk's shaved head: the crown shines
  shaved: {
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '.........hh.............',
    ],
  },
}

// Hats. Those that come with a hair style (cap, chef, kufi) cover short
// hair; the rest go over any style.
const HATS: Record<string, Array<string>> = {
  cap: [
    '.......KKKKKKKKKK.......',
    '.....KKQQPPPPPPPpKK.....',
    '....KQQPPPPTTPPPPppK....',
    '....KQPPPPPTtPPPPppK....',
    '....KqqqqqqqqqqqqqqK....',
    '...KKKKKKKKKKKKKKKKKK...',
    '....KqqqqqqqqqqqqqqK....',
    '.....KKKKKKKKKKKKKK.....',
    '......ssssssssssss......',
  ],
  chef: [
    '.......KKKK..KKKK.......',
    '.....KKUUUUKKUUUUKK.....',
    '....KUUUUUUUUUUUUuuK....',
    '....KUUUUUUUUUUUUuuK....',
    '.....KUuUUuUUuUUuuK.....',
    '.....KUuUUuUUuUUuuK.....',
    '.....KUUUUUUUUUUUuK.....',
    '.....KuuuuuuuuuuuuK.....',
  ],
  kufi: [
    '........................',
    '........................',
    '........KKKKKKKK........',
    '......KKUUUUUUUuKK......',
    '.....KUUuUUuUUuUuuK.....',
    '.....KUUUUUUUUUUuuK.....',
    '....KuuuuuuuuuuuuuuK....',
  ],
  straw: [
    '...........KK...........',
    '.........KKQPKK.........',
    '.......KKQQPpPpKK.......',
    '.....KKQQPPpPPpPpKK.....',
    '...KKQQPpPPPpPPPpppKK...',
    '.KKQQPPPpPPPPpPPPppppKK.',
    'KQQPPPpPPPPPpPPPPpppqqqK',
    'KKKKKKKKKKKKKKKKKKKKKKKK',
    '.....ssssssssssssss.....',
  ],
  beret: [
    '...........K............',
    '.......KKKKPKKKK........',
    '.....KKQQPPPPPPPKK......',
    '....KQPPPPPPPPPPPpK.....',
    '....KPPPPPPPPPPPppqK....',
    '.....KKppppppppqqKK.....',
  ],
  scarf: [
    '........................',
    '........................',
    '........KKKKKKKK........',
    '......KKQQPPPPPPKK......',
    '.....KQQPPPPPPPPPpK.....',
    '....KQPPPPPPPPPPPppK....',
    '....KPPPPPPPPPPPPppK....',
    '...KQPPpppppppppPppK....',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '....KPPK........KppK....',
    '.....KK..........KK.....',
  ],
  beanie: [
    '........................',
    '.........KKKKKK.........',
    '.......KKQPPPPPKK.......',
    '......KQPPPPPPPPpK......',
    '.....KQPPPPPPPPPPpK.....',
    '....KQPPPPPPPPPPPppK....',
    '....KQqQqQqQqQqQqqpK....',
    '....KqQqQqQqQqQqQqqK....',
    '.....KKKKKKKKKKKKKK.....',
  ],
  ballcap: [
    '........................',
    '........................',
    '.........KKKKKK.........',
    '.......KKQPPPPPKK.......',
    '......KQPPPPTPPPpK......',
    '.....KQPPPPPPPPPppK.....',
    '....KKKKKKKKKKKKKKKK....',
    '...KqqqqqqqqqqqqqqqqK...',
    '....KKKKKKKKKKKKKKKK....',
  ],
  official: [
    '........KKKKKKKK........',
    '.......KQPPPPPPpK.......',
    '.......KPPPPPPPpK.......',
    '......KKKKKKKKKKKK......',
    'KKKK.KQPPPPPPPPPpK.KKKKK',
    'KQPpKKPPPPPPPPPPpKKPppqK',
    'KKKK.KqqqqqqqqqqqK.KKKKK',
    '......KKKKKKKKKKKK......',
  ],
  headband: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '....KRRRRRRRRRRRRRRK....',
    '....KrrrrrrrrrrrrrrrRK..',
    '...................KRK..',
  ],
  flower: [
    '........................',
    '........................',
    '........................',
    '.................KK.....',
    '................KRRK....',
    '...............KRTRrK...',
    '................KrrK....',
    '.................KK.....',
  ],
  // An emperor's crown (mian): a board with strings of beads at its ends
  crown: [
    '........................',
    '..KKKKKKKKKKKKKKKKKKKK..',
    '..KTQPPPPPPPPPPPPPPpTK..',
    '..KKKKKKKKKKKKKKKKKKKK..',
    '..T.T.KKPPPPPPPPKK.T.T..',
    '..R.R.KPPTPPPPTPPK.R.R..',
    '..T.T.KPPPPPPPPPPK.T.T..',
    '..R.R..KKKKKKKKKK..R.R..',
    '..T.T..............T.T..',
  ],
  // A warrior's helmet, a red plume on top and guards at the cheeks
  helmet: [
    '..........KRRK..........',
    '.........KRQRrK.........',
    '..........KRrK..........',
    '..........KTtK..........',
    '........KKQPPpKK........',
    '......KKQPPPPPPpKK......',
    '.....KQPPPPPPPPPPpK.....',
    '....KKTTTTTTTTTTTTKK....',
    '....KPK..........KPK....',
    '....KPK..........KPK....',
    '....KPK..........KPK....',
    '.....K............K.....',
  ],
  // A hood to the shoulders, a jewel at the brow, as Guanyin wears
  veil: [
    '........................',
    '........................',
    '........KKKKKKKK........',
    '......KKQQPPPPPPKK......',
    '.....KQQPPPPPPPPPpK.....',
    '....KQPPPPPPPPPPPppK....',
    '....KPPPPPPTTPPPPppK....',
    '...KQPPpppppppppPppK....',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '...KPPK..........KppK...',
    '..KPPK............KppK..',
    '..KPPK............KppK..',
    '.KPPK..............KppK.',
    '.KPPK..............KppK.',
    'KPPPK..............KpppK',
    'KPPPK..............KpppK',
  ],
}

// Clothes, from row 21 (the shoulders)
const CLOTHES: Record<string, Array<string>> = {
  jacket: [
    '........................',
    '......KKKUFssFUKKK......',
    '...KKLLCLUUssUUDCCcKK...',
    '.KKLLCCCLUUUUUUDCCCccKK.',
    'KLLCCCCCCLUUUUDCCCCCcccK',
    'KLCCCCCCCLUUUUDCCCCCCccK',
    'KCCCCCCCCCLUUDCCCCCCcccK',
  ],
  mandarin: [
    '........................',
    '......KKKLLCCCcKKK......',
    '...KKLLCKKKKKKKKCCcKK...',
    '.KKLLCCCCCCTTCCCCCCccKK.',
    'KLLCCCCCCCtCCtCCCCCccccK',
    'KLCCCCCCCCCTTCCCCCCCcccK',
    'KCCCCCCCCCtCCtCCCCCccccK',
  ],
  suit: [
    '........................',
    '......KKKUFssFUKKK......',
    '...KKLLCLUURRUUDCCcKK...',
    '.KKLLCCCLUURRUUDCCCccKK.',
    'KLLCCCCCCLURRUDCCCCCcccK',
    'KLCCCCCCCLURrUDCCCCCCccK',
    'KCCCCCCCCCLrrDCCCCCCcccK',
  ],
  apron: [
    '........................',
    '......KKKCFssFCKKK......',
    '...KKLLCUCssssCUCcKK....',
    '.KKLLCCCUUUUUUUUCCccKKK.',
    'KLLCCCCCUUUUUUUUCCcccccK',
    'KLCCCCCCUUUUUUuUCCCccccK',
    'KCCCCCCCUUUUUUuUCCcccccK',
  ],
  uniform: [
    '........................',
    '......KKKVFssFVKKK......',
    '...KTTTCLVVNNVVDCCTTK...',
    '.KKLLCCCLVVNNVVDCCCccKK.',
    'KLLCCCCCCLVNNVDCCTTCcccK',
    'KLCCCCCCCLVNNVDCCttCCccK',
    'KCCCCCCCCCLNNDCCCCCCcccK',
  ],
  tunic: [
    '........................',
    '......KKKNNNNNNKKK......',
    '...KKNNNNNNNNNNNNNNKK...',
    '.KKNNNNNNNNNNNNNNNNNNKK.',
    'KLLCCCCCCCCCCCCTTCCCcccK',
    'KLCCCCCCCCCCCCCtTCCCCccK',
    'KCCCCCCCCCCCCCCCCCCCcccK',
  ],
  qipao: [
    '........................',
    '......KKKLLCCCcKKK......',
    '...KKLLCRRRRRRRCCcKK....',
    '.KKLLCCCCCCCCRTCCCccKKK.',
    'KLLCCCCCCCCCCCRRCCCccccK',
    'KLCCCCCCCCCCCCCRTCCCcccK',
    'KCCCCCCCCCCCCCCCRCCccccK',
  ],
  hoodie: [
    '.....KKKK......KKKK.....',
    '....KCCCK......KCCcK....',
    '..KKLCCCCKKFFKKCCCccKK..',
    '.KLLCCCCCCKUUKCCCCCcccK.',
    'KLLCCCCCCCCUUCCCCCCccccK',
    'KLCCCCCCCCCUUCCCCCCCcccK',
    'KCCCCCCCCCCCCCCCCCCccccK',
  ],
  tee: [
    '........................',
    '......KKKKSssSKKKK......',
    '...KKLLCKCCCCCCKCCcKK...',
    '.KKLLCCCCCCCCCCCCCCccKK.',
    'KLLCCCCCCCCCCCCCCCCccccK',
    'KLCCCCCCCCCCCCCCCCCCcccK',
    'KCCCCCCCCCCCCCCCCCCccccK',
  ],
  robe: [
    '........................',
    '......KKKUUssUUKKK......',
    '...KKLLCCUUsUUCCCcKK....',
    '.KKLLCCCCCUUUCCCCCccKKK.',
    'KLLCCCCCCUUUCCCCCCcccccK',
    'KLCCCCCCUUUCCCCCCCCccccK',
    'KCCCCCCUUUCCCCCCCCcccccK',
  ],
  chef: [
    '........................',
    '......KKKURRRRUKKK......',
    '...KKUUUKRRRRKUUuKK.....',
    '.KKUUUUUUKRrKUUUUuuKK...',
    'KUUUUTUUUUKKUUUTUUuuuuuK',
    'KUUUUUUUUUUUUUUUUUuuuuuK',
    'KUUUUTUUUUUUUUUTUUuuuuuK',
  ],
}

// Armour of plates, gold at the collar and belt (rows 21 to 27)
CLOTHES.armor = [
  '........................',
  '..KKKKK.KTFssFTK.KKKKK..',
  '.KLLCcKKKTTTTTTKKKLCccK.',
  'KLLCccKCcCcCcCcCcKLCcccK',
  'KLCccKcCcCcCcCcCcCKCcccK',
  'KRRrKTTTTTTTTTTTTTTKRrrK',
  'KRRrKCcCcCcCcCcCcCcKRrrK',
]
// A monk's kasaya: patched cloth over one shoulder, the robe beneath
CLOTHES.kasaya = [
  '........................',
  '......KKKUFssFRRKKK.....',
  '...KKUUUUFsRRTRRRRrKK...',
  '.KKUUUUUUTRRRTRRRTRrrKK.',
  'KUUUUUUTRRRRTRRRTRRRrrrK',
  'KUUUUUTTTTTTTTTTTTTTTrrK',
  'KUUUUTRRRTRRRRTRRRTRRrrK',
]

// Glasses over the eyes (rows 10 to 13)
const GLASSES = [
  '......GGGGG..GGGGG......',
  '......Gg..GGGGg..G......',
  '......G...G..G...G......',
  '......GGGGG..GGGGG......',
]

// A beard round the jaw, with a moustache (rows 14 to 21); old men's are
// long. A moustache alone is the first rows.
const BEARD = [
  '.....H............J.....',
  '.....HH..........JJ.....',
  '.....HHH.IHHHHJ.JJJ.....',
  '......HHH......JJJ......',
  '......HHHHHHHHHJJJ......',
  '.......HHHHHHHHJJ.......',
  '........HHHHHJJJ........',
  '.........HHHJJ..........',
]
const LONG_BEARD = [
  '..........HHJJ..........',
  '..........HHJJ..........',
  '...........HJ...........',
]
const MOUSTACHE = ['.........IHHHHJ.........']

// Earrings (rows 14 and 15)
const EARRINGS = ['....Y............Y......', '....y............y......']

// --- palette and assembly

const INK = '#1c1424'

// Hats' own colours, unless the look gives one
const HAT_COLOUR: Record<string, string | undefined> = {
  cap: '#2b3a55',
  chef: '#f4eee6',
  kufi: '#f4eee6',
  straw: '#d8b45e',
  beret: '#3a3346',
  scarf: '#3d6fa8',
  beanie: '#c8372d',
  ballcap: '#3d6fa8',
  official: '#2a2530',
  crown: '#2a2530',
  helmet: '#9a8a6a',
  veil: '#f4eee6',
}

function palette(look: Look, hat: string | undefined): Record<string, string> {
  const skinBase = look.skin ?? '#e8b98f'
  const skin = ramp(skinBase)
  const [sh, ss, sl] = toHsl(skinBase)
  const old = look.old || look.age === 'old'
  const hair = ramp(old ? '#d8d2c6' : (look.hair ?? '#2a1d14'))
  const coat = ramp(look.coat)
  // a chef's and a kufi's white are their own; other hats take the look's
  const cap = ramp(
    (hat === 'chef' || hat === 'kufi' ? undefined : look.hat) ??
      HAT_COLOUR[hat ?? 'cap'] ??
      '#2b3a55',
  )
  const accent = ramp(look.accent ?? '#c8372d')
  const shirt = ramp('#a9c3dc')
  return {
    K: INK,
    k: fromHsl(toward(sh, 345, 22), ss * 0.6, sl * 0.4),
    h: skin.light,
    S: skinBase,
    s: fromHsl(toward(sh, 0, 10), ss * 0.8, sl * 0.84),
    F: fromHsl(toward(sh, 345, 18), ss * 0.7, sl * 0.66),
    E: look.eyes ?? '#2a1a1c',
    w: '#f4eee6',
    W: '#ffffff',
    M: '#8a3a36',
    m: '#d0786c',
    b: '#f0a08a',
    I: hair.light,
    H: hair.base,
    J: hair.shade,
    L: coat.light,
    C: coat.base,
    c: coat.shade,
    D: coat.deep,
    U: '#f4eee6',
    u: '#c9c0b8',
    V: shirt.base,
    v: shirt.shade,
    N: '#26222e',
    T: '#e8b84a',
    t: '#a8762a',
    R: accent.base,
    r: accent.shade,
    Q: cap.light,
    P: cap.base,
    p: cap.shade,
    q: cap.deep,
    G: '#2e2838',
    g: '#e8f4ff',
  }
}

export interface Portrait {
  // The face at rest
  rows: Array<string>
  pal: Record<string, string>
  // The eyes shut, clear elsewhere
  blink: Array<string>
  // Mouth shapes for talking, clear elsewhere
  talk: Array<Array<string>>
}

export function portrait(look: Look): Portrait {
  const style = look.style ?? 'short'
  // The old styles that are hats wear them over short hair
  const styleHat =
    style === 'cap' || style === 'chef' || style === 'kufi' ? style : undefined
  const hat = look.headwear ?? styleHat
  const hair = HAIR[styleHat ? 'short' : style] ?? HAIR.short
  const age = look.age ?? (look.old ? 'old' : 'adult')
  const clothes =
    look.clothes ??
    (style === 'chef' ? 'chef' : style === 'cap' ? 'uniform' : 'jacket')
  const g = blank()
  stamp(g, hair.behind)
  stamp(g, HEAD)
  stamp(g, CLOTHES[clothes] ?? CLOTHES.jacket, 21)
  stamp(g, FACE[look.expression ?? 'neutral'] ?? FACE.neutral, 8)
  if (age === 'child') stamp(g, CHILD, 11)
  if (age === 'old') stamp(g, AGED, 12)
  if (look.blush) stamp(g, BLUSH, 14)
  if (look.lashes ?? LASHED.has(style)) {
    if (age !== 'child') stamp(g, LASHES, 11)
    const ex = look.expression ?? 'neutral'
    if (ex === 'neutral' || ex === 'smile' || ex === 'stern') stamp(g, LIP, 18)
  }
  if (look.earrings) stamp(g, EARRINGS, 14)
  if (look.beard) {
    stamp(g, BEARD, 14)
    if (age === 'old' || look.beard === 'long') stamp(g, LONG_BEARD, 22)
  } else if (look.moustache) stamp(g, MOUSTACHE, 16)
  if (look.glasses) stamp(g, GLASSES, 10)
  stamp(g, hair.front)
  if (hat) stamp(g, HATS[hat])
  const pal = palette(look, hat)
  if (look.earrings) {
    pal.Y = look.earrings
    pal.y = ramp(look.earrings).shade
  }
  return {
    rows: rowsOf(g),
    pal,
    blink: overlay(g, SHUT, 11),
    talk: TALK.map((t) => overlay(g, t, 15, MOUTH)),
  }
}

// Shut eyes and talking mouths go only over skin and the face's own
// features, never over hair, a beard or glasses
const SOFT = new Set([...'hSsFkEwWMmb'])
const MOUTH = new Set([...'Mmw'])

// Rows laid over the face from row y, on soft letters only; letters in
// `erase` under the rows' clear parts become skin (the mouth at rest)
function overlay(
  face: Grid,
  rows: Array<string>,
  y: number,
  erase?: Set<string>,
): Array<string> {
  const o = blank()
  rows.forEach((row, j) => {
    for (let i = 0; i < W; i++) {
      const under = face[y + j][i]
      if (!SOFT.has(under)) continue
      const ch = row[i] ?? '.'
      if (ch !== '.') o[y + j][i] = ch
      else if (erase?.has(under)) o[y + j][i] = 'S'
    }
  })
  return rowsOf(o)
}

// Figures from the classics and the legends, ready to use
export const FIGURES: Record<string, Look & { name: string; zh: string }> = {
  laozi: {
    name: 'Laozi',
    zh: '老子',
    style: 'bald',
    old: true,
    beard: true,
    blush: true,
    clothes: 'robe',
    coat: '#5b7f6e',
    expression: 'smile',
  },
  confucius: {
    name: 'Confucius',
    zh: '孔子',
    style: 'topknot',
    old: true,
    beard: true,
    clothes: 'robe',
    coat: '#7a4a3a',
  },
  zhuangzi: {
    name: 'Zhuangzi',
    zh: '庄子',
    style: 'topknot',
    beard: true,
    hair: '#3a2a22',
    clothes: 'robe',
    coat: '#8a8a5a',
    expression: 'grin',
  },
  change: {
    name: 'Chang’e',
    zh: '嫦娥',
    style: 'buns',
    hair: '#1c1418',
    clothes: 'robe',
    coat: '#e8d8f0',
    skin: '#f6d6bc',
    blush: true,
    earrings: '#e8b84a',
    accent: '#d0308a',
  },
  libai: {
    name: 'Li Bai',
    zh: '李白',
    style: 'topknot',
    moustache: true,
    clothes: 'robe',
    coat: '#e8e2d0',
    expression: 'smile',
    blush: true,
  },
  mulan: {
    name: 'Hua Mulan',
    zh: '花木兰',
    style: 'pony',
    headwear: 'helmet',
    clothes: 'armor',
    coat: '#8a7a5a',
    accent: '#c8372d',
    expression: 'stern',
  },
  guanyu: {
    name: 'Guan Yu',
    zh: '关羽',
    style: 'short',
    headwear: 'helmet',
    hat: '#2f6b4a',
    beard: 'long',
    skin: '#b8553e',
    clothes: 'armor',
    coat: '#2f6b4a',
    accent: '#c8372d',
    expression: 'stern',
  },
  jade: {
    name: 'the Jade Emperor',
    zh: '玉皇大帝',
    style: 'topknot',
    headwear: 'crown',
    beard: 'long',
    clothes: 'robe',
    coat: '#e0b040',
    accent: '#c8372d',
  },
  guanyin: {
    name: 'Guanyin',
    zh: '观音',
    style: 'bun',
    headwear: 'veil',
    clothes: 'robe',
    coat: '#f4eee6',
    skin: '#f6d6bc',
    expression: 'smile',
    earrings: '#e8b84a',
  },
  tangseng: {
    name: 'Tang Sanzang',
    zh: '唐僧',
    style: 'shaved',
    clothes: 'kasaya',
    coat: '#c8372d',
    expression: 'smile',
  },
  baogong: {
    name: 'Judge Bao',
    zh: '包公',
    style: 'short',
    headwear: 'official',
    beard: true,
    skin: '#5a4038',
    clothes: 'robe',
    coat: '#2a2530',
    expression: 'stern',
  },
}

// Every part, for the tests
export const PARTS = {
  HEAD,
  FACE,
  CHILD,
  AGED,
  BLUSH,
  SHUT,
  TALK,
  HAIR,
  HATS,
  CLOTHES,
  GLASSES,
  BEARD,
  LONG_BEARD,
  MOUSTACHE,
  EARRINGS,
}
