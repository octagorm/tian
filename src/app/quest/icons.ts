// The quest's own icons, 16 × 16, written as rows of letters (one letter a
// pixel, '.' clear) and outlined in ink when drawn: the moves, Wukong's
// arts, what he carries, and the marks of the fight.

export const ICON_PAL: Record<string, string> = {
  K: '#1b1418',
  W: '#fffaf1',
  E: '#d8d2c6',
  A: '#9a9aa8',
  Y: '#f2c14e',
  y: '#b8862a',
  O: '#e07a2a',
  R: '#c8372d',
  r: '#8a1f18',
  P: '#f6a7b8',
  p: '#e0607e',
  G: '#4f8a3a',
  g: '#2f5a26',
  L: '#7cc35a',
  C: '#8fd0f0',
  B: '#3d6fa8',
  N: '#8a5a3c',
  n: '#5a3a22',
  S: '#e8b98f',
  T: '#e9d8b0',
  V: '#6b4fa0',
}

export const ICONS: Record<string, Array<string>> = {
  cudgel: [
    '................',
    '.............YY.',
    '............YYYy',
    '...........yYYy.',
    '..........RRyy..',
    '.........RRr....',
    '........RRr.....',
    '.......RRr......',
    '......RRr.......',
    '.....RRr........',
    '....RRr.........',
    '..yyRr..........',
    '.yYYy...........',
    'YYYy............',
    '.YY.............',
    '................',
  ],
  eyes: [
    '................',
    '.....O....O.....',
    '..O..RO..RO..O..',
    '..RO.ROORRO.OR..',
    '...RORRRRRRORR..',
    '................',
    '.....EEEEEE.....',
    '...EWWYYYYWWE...',
    '..EWWYOOOOYWWE..',
    '.EWWWYOKKOYWWWE.',
    '..EWWYOOOOYWWE..',
    '...EWWYYYYWWE...',
    '.....EEEEEE.....',
    '................',
    '................',
    '................',
  ],
  cloud: [
    '................',
    '................',
    '................',
    '.......WWW......',
    '......WWWWW.....',
    '...WW.WWWWWWWW..',
    '..WWWWWWWWWWWWW.',
    '.WWWWWWWWWWWWWWW',
    '.WWWWWWWWWWWWWWW',
    '..CWWWWWWWWWWWC.',
    'Y..CCCWWWWWCCC..',
    '.YY.CCCCCCCCC...',
    '...YY...........',
    '................',
    '................',
    '................',
  ],
  peach: [
    '................',
    '........P.......',
    '.......PPp......',
    '......PPPPp.....',
    '.....WPPPPPp....',
    '....WPPPPPPPp...',
    '...PWPPPPPPPpp..',
    '...PPPPPPPpPpp..',
    '..PPPPPPPPpPppp.',
    '..PPPPPPPPpPppp.',
    '..pPPPPPPpPpppp.',
    '...pPPPPpPpppp..',
    '....ppppppppp...',
    '...LLGg..gGLL...',
    '..LLLGg..gGLLL..',
    '................',
  ],
  hairs: [
    '................',
    '..........W.....',
    '.........WYW....',
    '...Y......W.....',
    '...Y....Y.......',
    '....Y...Y...Y...',
    '....Y...Y...Y...',
    '....Y..Y....Y...',
    '...Y...Y...Y....',
    '...Y...Y...Y....',
    '...Y....Y..Y....',
    '....Y...Y...Y...',
    '....Y...Y...Y...',
    '...yyy.yyy.yyy..',
    '................',
    '................',
  ],
  pill: [
    '................',
    '................',
    '.....CC.........',
    '...CC..CC.......',
    '..C......C......',
    '......RRRR......',
    '.....RRWRRr.....',
    '....RRWRRRRr....',
    '....RRRRRRrr....',
    '....rRRRRrrr....',
    '.....rrrrrr.....',
    '......rrrr...C..',
    '.............C..',
    '.........CCCC...',
    '................',
    '................',
  ],
  gourd: [
    '................',
    '........g.......',
    '.......gG.L.....',
    '.......YY.LL....',
    '......RRRR......',
    '.....RWRRRr.....',
    '.....RRRRRr.....',
    '......RRRr......',
    '......YYYY......',
    '....RRRRRRRr....',
    '...RWRRRRRRrr...',
    '...RRRRRRRRrr...',
    '...RRRRRRRrrr...',
    '....rRRRRrrr....',
    '.....rrrrrr.....',
    '................',
  ],
  clones: [
    '................',
    '.....YYYY.......',
    '....NSSSSN......',
    '....SKSSKS......',
    '....NSSSSN......',
    '.....NSSN.......',
    '................',
    '.YYYY.....YYYY..',
    'NSSSSN...NSSSSN.',
    'SKSSKS...SKSSKS.',
    'NSSSSN...NSSSSN.',
    '.NSSN.....NSSN..',
    '................',
    '...Y...Y...Y....',
    '..Y...Y...Y.....',
    '................',
  ],
  freeze: [
    '................',
    '.C....YYYYY.....',
    '......YYYYY...C.',
    '.....CYRRRY.....',
    '......RYYYR.....',
    '......RYRYR.C...',
    '......RYYYR.....',
    '......YRRRY.....',
    '.C....YYYYY.....',
    '......YRYRY.....',
    '......YYRYY..C..',
    '......YRYRY.....',
    '......yyyyy.....',
    '..C........C....',
    '................',
    '................',
  ],
  insect: [
    '................',
    '................',
    '................',
    '....CC..CC......',
    '...CWWC.CWWC....',
    '...CWWWCCWWC....',
    '....CWWCWWC.....',
    '...YKYKYKYY.....',
    '..YKYKYKYKYYN...',
    '.YYKYKYKYKYYNN..',
    '..YKYKYKYKYYN...',
    '...YKYKYKYY.....',
    '................',
    '................',
    '................',
    '................',
  ],
  giant: [
    '....YYYYYYYY....',
    '...NNNNNNNNNN...',
    '..NSSSSNNSSSSN..',
    '..NSKKSSSSKKSN..',
    '..NSSSSSSSSSSN..',
    '...NSSSKKSSSN...',
    '....NSSSSSSN....',
    '.....NNNNNN.....',
    'WW...........WW.',
    'WWWW.WWWW..WWWWW',
    'CCCCWWWWWWWWCCCC',
    '..CCCCCCCCCCCC..',
    '......AAA.......',
    '.....AAAAA......',
    '...AAAAAAAAA....',
    '................',
  ],
  sage: [
    'R..............R',
    'R..............R',
    '.R............R.',
    '.R............R.',
    '..R..........R..',
    '..R..........R..',
    '...R........R...',
    '....R......R....',
    '.....RYYYYR.....',
    '....YYYRRYYY....',
    '...YYYYRRYYYY...',
    '...YyYYYYYYyY...',
    '...yyyyyyyyyy...',
    '...RYRYRYRYRY...',
    '................',
    '................',
  ],
  scroll: [
    '................',
    '................',
    '.nn..........nn.',
    '.nNTTTTTTTTTTNn.',
    '.nNTKKKTTKKKTNn.',
    '.nNTTTTTTTTTTNn.',
    '.nNTKKTKKKTTTNn.',
    '.nNTTTTTTTTTTNn.',
    '.nNTKKKTKKTTTNn.',
    '.nNTTTTTTTTTTNn.',
    '.nNTKKTTKKKTTNn.',
    '.nNTTTTTTTTTTNn.',
    '.nn..........nn.',
    '................',
    '................',
    '................',
  ],
  skull: [
    '................',
    '................',
    '.....EEEEE......',
    '....EWWWWWE.....',
    '...EWWWWWWWE....',
    '...WKKWWWKKW....',
    '...WKKWWWKKW....',
    '...EWWWKWWWE....',
    '....EWWWWWE.....',
    '.....WKWKW......',
    '..L..EEEEE..L...',
    '..L.........L...',
    '.LLL.......LLL..',
    '................',
    '................',
    '................',
  ],
  heart: [
    '................',
    '................',
    '...RRR...RRR....',
    '..RWRRR.RRRRr...',
    '.RWRRRRRRRRRrr..',
    '.RRRRRRRRRRRrr..',
    '.RRRRRRRRRRrrr..',
    '..RRRRRRRRrrr...',
    '...RRRRRRrrr....',
    '....RRRRrrr.....',
    '.....RRrrr......',
    '......Rrr.......',
    '.......r........',
    '................',
    '................',
    '................',
  ],
  star: [
    '................',
    '.......Y........',
    '.......Y........',
    '......YYY.......',
    '......YWY.......',
    'YYYYYYYWYYYYYYY.',
    '.YYYYWWWWWYYYY..',
    '..YYYYWWWYYYY...',
    '...YYYYYYYYY....',
    '....YYYYYYY.....',
    '....YYYyYYY.....',
    '...YYYy.yYYY....',
    '...YYy...yYY....',
    '..Yy.......yY...',
    '................',
    '................',
  ],
}

const cache = new Map<string, HTMLCanvasElement>()

// An icon on its own little canvas, 18 × 18 with its outline
export function iconCanvas(name: string): HTMLCanvasElement | null {
  const hit = cache.get(name)
  if (hit) return hit
  const rows = ICONS[name] as Array<string> | undefined
  if (!rows || typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 18
  c.height = 18
  const g = c.getContext('2d')
  if (!g) return null
  const filled = (x: number, y: number) =>
    y >= 0 && y < 16 && x >= 0 && x < 16 && rows[y][x] !== '.'
  g.fillStyle = ICON_PAL.K
  for (let y = -1; y <= 16; y++)
    for (let x = -1; x <= 16; x++)
      if (
        !filled(x, y) &&
        (filled(x - 1, y) ||
          filled(x + 1, y) ||
          filled(x, y - 1) ||
          filled(x, y + 1))
      )
        g.fillRect(x + 1, y + 1, 1, 1)
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row[x]
      if (ch === '.') continue
      g.fillStyle = ICON_PAL[ch]
      g.fillRect(x + 1, y + 1, 1, 1)
    }
  })
  cache.set(name, c)
  return c
}

const urls = new Map<string, string>()
export function iconUrl(name: string): string {
  const hit = urls.get(name)
  if (hit) return hit
  const c = iconCanvas(name)
  if (!c) return ''
  const url = c.toDataURL()
  urls.set(name, url)
  return url
}
