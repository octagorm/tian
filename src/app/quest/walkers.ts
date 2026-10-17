// The party as it walks the map: little figures of nine by thirteen
// pixels, two steps each, facing west (left), written as rows of letters
// and outlined in ink when drawn – the monk on his white horse, Wukong
// with the cudgel on his shoulder, the pig with his rake, and Sha Wujing
// with the luggage.

export const WALK_PAL: Record<string, string> = {
  K: '#1b1418',
  R: '#c8372d',
  r: '#8a1f18',
  Y: '#f2c14e',
  y: '#b8862a',
  N: '#9a6a3a',
  n: '#6a4424',
  S: '#f0c890',
  T: '#e0902a',
  W: '#fffaf1',
  E: '#c8c4d8',
  P: '#f0a8b0',
  D: '#2e2836',
  B: '#3d6fa8',
  G: '#7a8aa8',
  F: '#d0502a',
  O: '#e07a2a',
}

type Frames = [Array<string>, Array<string>]

export const WALKERS: Record<'wukong' | 'monk' | 'pig' | 'sand', Frames> = {
  wukong: [
    [
      '.....R...',
      '....R.R..',
      '...YYY.R.',
      '..NNNNN..',
      '.SKSNNN..',
      '.SSSNNN.Y',
      '..SSNN.R.',
      '..YYYYR..',
      '.NYYYRY..',
      '..YRRY...',
      '..TTTT...',
      '..N..N...',
      '.KK..KK..',
    ],
    [
      '.....R...',
      '....R.R..',
      '...YYY.R.',
      '..NNNNN..',
      '.SKSNNN..',
      '.SSSNNN.Y',
      '..SSNN.R.',
      '..YYYYR..',
      '.NYYYRY..',
      '..YRRY...',
      '..TTTT...',
      '...NN....',
      '..KKKK...',
    ],
  ],
  monk: [
    [
      '.....YYY...',
      '.....YRY...',
      '....SSSS...',
      '....SKSS...',
      '...RRRRY...',
      '.E.RYRRRY..',
      'EWE.RRRR...',
      'WWWWOOOOWWE',
      'KWWWWWWWWWE',
      '...WWWWWWE.',
      '...W.W.W.W.',
      '...E.W.E.W.',
      '..K..K.K..K',
    ],
    [
      '.....YYY...',
      '.....YRY...',
      '....SSSS...',
      '....SKSS...',
      '...RRRRY...',
      '.E.RYRRRY..',
      'EWE.RRRR...',
      'WWWWOOOOWWE',
      'KWWWWWWWWWE',
      '...WWWWWWE.',
      '....WW..WW.',
      '....EW..EW.',
      '...KK..KK..',
    ],
  ],
  pig: [
    [
      '..PP.PP..',
      '..DDDDD..',
      '.PDDDDD..',
      'PPKPPPP..',
      'PPPPPPP..',
      '.PPPPP..y',
      '..DDDD.y.',
      '.DPPPDy..',
      '.DPPPDy..',
      '..BBBy...',
      '..DDDD...',
      '..D..D...',
      '.KK..KK..',
    ],
    [
      '..PP.PP..',
      '..DDDDD..',
      '.PDDDDD..',
      'PPKPPPP..',
      'PPPPPPP..',
      '.PPPPP..y',
      '..DDDD.y.',
      '.DPPPDy..',
      '.DPPPDy..',
      '..BBBy...',
      '..DDDD...',
      '...DD....',
      '..KKKK...',
    ],
  ],
  sand: [
    [
      '..GGGG...',
      '.GKGGG...',
      '.GGGGG..y',
      '.FFFFG..y',
      '..FFF..yy',
      '..NNNNnyy',
      '.GNWNWNy.',
      '.GNNNNN..',
      '..NNNNN..',
      '..NNNNN..',
      '..nnnn...',
      '..G..G...',
      '.KK..KK..',
    ],
    [
      '..GGGG...',
      '.GKGGG...',
      '.GGGGG..y',
      '.FFFFG..y',
      '..FFF..yy',
      '..NNNNnyy',
      '.GNWNWNy.',
      '.GNNNNN..',
      '..NNNNN..',
      '..NNNNN..',
      '..nnnn...',
      '...GG....',
      '..KKKK...',
    ],
  ],
}

const cache = new Map<string, HTMLCanvasElement>()

// A walker's step on a canvas, with its outline (two pixels wider and
// taller than the rows)
export function walkerCanvas(
  name: keyof typeof WALKERS,
  step: 0 | 1,
): HTMLCanvasElement | null {
  const key = `${name}${step}`
  const hit = cache.get(key)
  if (hit) return hit
  if (typeof document === 'undefined') return null
  const rows = WALKERS[name][step]
  const w = rows[0].length
  const h = rows.length
  const c = document.createElement('canvas')
  c.width = w + 2
  c.height = h + 2
  const g = c.getContext('2d')
  if (!g) return null
  const filled = (x: number, y: number) =>
    y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.'
  g.fillStyle = WALK_PAL.K
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++)
      if (
        !filled(x, y) &&
        (filled(x - 1, y) ||
          filled(x + 1, y) ||
          filled(x, y - 1) ||
          filled(x, y + 1))
      )
        g.fillRect(x + 1, y + 1, 1, 1)
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      if (row[x] === '.') continue
      g.fillStyle = WALK_PAL[row[x]]
      g.fillRect(x + 1, y + 1, 1, 1)
    }
  })
  cache.set(key, c)
  return c
}
