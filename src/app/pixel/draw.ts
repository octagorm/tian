// A small kit for pixel art in the manner of the old LucasArts adventures:
// a low-resolution canvas, skies in dithered bands, crisp shapes, and
// sprites written as rows of letters, one letter a pixel (as in Magnio).
// Everything is drawn once and scaled up with image-rendering: pixelated.

export type G = CanvasRenderingContext2D

export const W = 192
export const H = 96

// A seeded random, so a scene looks the same every time
export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function rect(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  c: string,
) {
  g.fillStyle = c
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

export const px = (g: G, x: number, y: number, c: string) =>
  rect(g, x, y, 1, 1, c)

// A filled ellipse, a scanline at a time, so the edge stays sharp
export function disc(
  g: G,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  c: string,
) {
  g.fillStyle = c
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry || 1)
    const hw = Math.floor(rx * Math.sqrt(Math.max(0, t)) + 0.5)
    g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1)
  }
}

// A filled polygon, by scanlines
export function poly(g: G, pts: Array<[number, number]>, c: string) {
  g.fillStyle = c
  const ys = pts.map((p) => p[1])
  const y0 = Math.floor(Math.min(...ys))
  const y1 = Math.ceil(Math.max(...ys))
  for (let y = y0; y <= y1; y++) {
    const xs: Array<number> = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      if (ay === by) continue
      const yy = y + 0.5
      if (yy < Math.min(ay, by) || yy >= Math.max(ay, by)) continue
      xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2)
      g.fillRect(
        Math.round(xs[i]),
        y,
        Math.round(xs[i + 1]) - Math.round(xs[i]),
        1,
      )
  }
}

// The pattern's cell for a pixel, for negative coordinates too
const cell = (x: number, y: number) =>
  BAYER[((Math.floor(y) % 4) + 4) % 4][((Math.floor(x) % 4) + 4) % 4]

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

// A vertical run of colours from top to bottom, each step dithered into the
// next with the ordered (Bayer) pattern of VGA-era skies
export function bands(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  colours: Array<string>,
) {
  const n = colours.length - 1
  for (let j = 0; j < h; j++) {
    const t = (j / Math.max(1, h - 1)) * n
    const i = Math.min(n - 1, Math.floor(t))
    const f = t - i
    for (let k = 0; k < w; k++) {
      const threshold = (cell(x + k, y + j) + 0.5) / 16
      g.fillStyle = f > threshold ? colours[i + 1] : colours[i]
      g.fillRect(x + k, y + j, 1, 1)
    }
  }
}

// A dithered blend of two colours over a rectangle, for mist and glow
export function haze(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  c: string,
  amount: number,
) {
  g.fillStyle = c
  for (let j = 0; j < h; j++)
    for (let k = 0; k < w; k++)
      if ((cell(x + k, y + j) + 0.5) / 16 < amount)
        g.fillRect(x + k, y + j, 1, 1)
}

// A sprite from rows of letters; '.' is clear
export function sprite(
  g: G,
  rows: Array<string>,
  pal: Record<string, string>,
  x: number,
  y: number,
  flip = false,
) {
  const w = rows[0].length
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === '.' || !pal[ch]) continue
      g.fillStyle = pal[ch]
      g.fillRect(
        Math.round(x + (flip ? w - 1 - i : i)),
        Math.round(y + j),
        1,
        1,
      )
    }
  })
}

export function stars(g: G, n: number, maxY: number, seed: number) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W)
    const y = Math.floor(r() * maxY)
    px(g, x, y, r() < 0.2 ? '#fff6c8' : '#9fb3e8')
  }
}

// A ridge of mountains: a jagged line, filled to the bottom
export function ridge(
  g: G,
  base: number,
  height: number,
  c: string,
  seed: number,
  rough = 6,
) {
  const r = rng(seed)
  const pts: Array<[number, number]> = [[0, H]]
  let y = base - r() * height
  for (let x = 0; x <= W; x += rough) {
    y = Math.max(base - height, Math.min(base, y + (r() - 0.5) * height * 0.7))
    pts.push([x, y])
  }
  pts.push([W, H])
  poly(g, pts, c)
}

// Karst towers, as at Guilin: steep peaks with rounded tops, wider at
// the foot, shaded on one side, a little ragged
export function karst(
  g: G,
  base: number,
  c: string,
  seed: number,
  n = 7,
  tall = 40,
) {
  const r = rng(seed)
  const shade = darken(c, 0.78)
  for (let i = 0; i < n; i++) {
    const x = r() * W
    const w = 12 + r() * 18
    const h = tall * (0.5 + r() * 0.6)
    const lean = (r() - 0.5) * 4
    for (let j = 0; j < h; j++) {
      const t = j / h
      // a dome on top, then sides that widen towards the foot
      const half =
        t < 0.12
          ? w * 0.3 * Math.sqrt(t / 0.12)
          : w * (0.3 + 0.2 * (t - 0.12) ** 0.7)
      const jag = Math.round((r() - 0.5) * 1.5)
      const cx = x + lean * (1 - t)
      const y = Math.round(base - h + j)
      rect(g, cx - half + jag, y, half * 2, 1, c)
      rect(g, cx + half * 0.35, y, half * 0.65 + jag, 1, shade)
    }
  }
}

// A colour a little darker (f < 1) or lighter (f > 1)
export function darken(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  const rr = ch(n >> 16)
  const gg = ch((n >> 8) & 255)
  const bb = ch(n & 255)
  return `#${((rr << 16) | (gg << 8) | bb).toString(16).padStart(6, '0')}`
}

// A Chinese roof: eaves that turn up at the corners, tiles in rows
export function roof(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  c: string,
  edge: string,
) {
  for (let j = 0; j < h; j++) {
    const inset = Math.round(((h - j) / h) * (w * 0.18))
    rect(g, x + inset, y + j, w - inset * 2, 1, j % 2 ? c : edge)
  }
  // upturned corners
  rect(g, x - 2, y + h - 2, 3, 1, edge)
  rect(g, x - 3, y + h - 3, 2, 1, edge)
  rect(g, x + w - 1, y + h - 2, 3, 1, edge)
  rect(g, x + w + 1, y + h - 3, 2, 1, edge)
  rect(g, x + Math.round(w * 0.2), y - 1, Math.round(w * 0.6), 1, edge)
}

// A hall of red walls and pillars under a roof
export function hall(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  roofC = '#c99a2e',
  roofEdge = '#7a5212',
) {
  rect(g, x, y, w, h, '#a8261c')
  for (let i = 2; i < w - 1; i += 5) rect(g, x + i, y, 1, h, '#7c1a12')
  rect(g, x - 2, y + h, w + 4, 2, '#d9cfbf')
  roof(g, x - 3, y - 7, w + 6, 7, roofC, roofEdge)
}

export function lantern(g: G, x: number, y: number) {
  haze(g, x - 4, y - 3, 9, 10, '#ffb070', 0.25)
  rect(g, x, y - 2, 1, 2, '#3b2a1a')
  disc(g, x, y + 2, 2, 3, '#e0332a')
  rect(g, x - 1, y - 1, 3, 1, '#f2c14e')
  rect(g, x - 1, y + 5, 3, 1, '#f2c14e')
  px(g, x - 1, y + 1, '#ff7a5c')
}

// Little people, 5 wide and 11 tall, in a few colours of coat
const PERSON = [
  '.HHH.',
  '.SSS.',
  '.SSS.',
  'CCCCC',
  'CCCCC',
  'SCCCS',
  '.CCC.',
  '.PPP.',
  '.P.P.',
  '.P.P.',
  '.B.B.',
]

export function person(
  g: G,
  x: number,
  y: number,
  coat: string,
  hair = '#2a1d14',
  trousers = '#2b3a55',
) {
  sprite(
    g,
    PERSON,
    { H: hair, S: '#e8b98f', C: coat, P: trousers, B: '#1a1410' },
    x,
    y,
  )
}

export function panda(g: G, x: number, y: number) {
  sprite(
    g,
    [
      '.K....K.',
      'KWWWWWWK',
      'WKKWWKKW',
      'WWWKKWWW',
      '.WWWWWW.',
      'KKWWWWKK',
      'KKWWWWKK',
      'KK....KK',
    ],
    { K: '#1b1b22', W: '#f2f0ea' },
    x,
    y,
  )
}

// A bamboo stand
export function bamboo(g: G, x: number, base: number, h: number, seed: number) {
  const r = rng(seed)
  for (let i = 0; i < 5; i++) {
    const bx = x + i * 3 + Math.floor(r() * 2)
    const bh = h * (0.7 + r() * 0.3)
    rect(g, bx, base - bh, 1, bh, i % 2 ? '#4f8a3a' : '#6aa84f')
    for (let j = base - bh; j < base; j += 6) px(g, bx, j, '#2f5a26')
    for (let k = 0; k < 3; k++) {
      const ly = base - bh + r() * bh * 0.6
      rect(g, bx + 1, ly, 3, 1, '#7cc35a')
    }
  }
}

// Windows lit at random in a block
export function windows(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  on: string,
  off: string,
  seed: number,
) {
  const r = rng(seed)
  for (let j = 1; j < h - 1; j += 3)
    for (let i = 1; i < w - 1; i += 3)
      px(g, x + i, y + j, r() < 0.55 ? on : off)
}

// Water with flecks of light
export function water(
  g: G,
  y: number,
  top: string,
  bottom: string,
  glint: string,
  seed: number,
) {
  bands(g, 0, y, W, H - y, [top, bottom])
  const r = rng(seed)
  for (let i = 0; i < 40; i++)
    rect(g, r() * W, y + 1 + r() * (H - y - 1), 2 + r() * 4, 1, glint)
}

// Steam curling up
export function steam(g: G, x: number, y: number, seed: number) {
  const r = rng(seed)
  for (let i = 0; i < 12; i++)
    haze(
      g,
      x + Math.round(Math.sin(i / 2) * 2 + r() * 2),
      y - i * 2,
      3,
      2,
      '#f4efe6',
      0.5,
    )
}

// Darker towards the edges, dithered, for depth and to draw the eye in
export function vignette(g: G, c = '#140c1c', strength = 1) {
  g.fillStyle = c
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2)
      const dy = (y - H / 2) / (H / 2)
      const d = Math.sqrt(dx * dx * 0.8 + dy * dy * 1.2)
      const amount = Math.max(0, d - 0.92) * 1.1 * strength
      if (amount > 0 && (cell(x, y) + 0.5) / 16 < amount) g.fillRect(x, y, 1, 1)
    }
}
