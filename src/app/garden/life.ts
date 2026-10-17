import {
  CRANE,
  GW,
  LANTERN,
  POND,
  WILLOW,
  lanternSpots,
  lightOf,
  pondDist,
} from './draw'
import { Paint, bayer, mix, rng } from './paint'
import type { Scene } from './draw'
import type { G } from './paint'

// What moves in the garden, drawn over its still layers each frame. Every
// moving thing is a function of time alone (a koi's place at t, a
// snowflake's fall), so there is nothing to keep between frames, and a
// still frame for reduced motion is simply t = 0.

const has = (s: Scene, id: string) => s.stages[id] ?? 0

// --- Seeded parameters, made once per scene

interface Koi {
  ax: number
  ay: number
  w1: number
  w2: number
  p1: number
  p2: number
  colours: [string, string, string]
}

interface Mote {
  x: number
  y: number
  vx: number
  vy: number
  sway: number
  w: number
  ph: number
  c: string
  big: boolean
}

interface Strand {
  x: number
  y: number
  len: number
  ph: number
  c: string
  leaf: string
}

const KOI_COLOURS: Array<[string, string, string]> = [
  ['#f6f2ea', '#e0402a', '#f6f2ea'], // kohaku
  ['#f2b030', '#f6c850', '#e89a2a'], // ogon
  ['#1b1418', '#e0402a', '#f6f2ea'], // showa
  ['#e0702a', '#f6f2ea', '#e0702a'],
  ['#8a9aa8', '#e0803a', '#8a9aa8'], // asagi
]

export class Life {
  private koi: Array<Koi> = []
  private motes: Array<Mote> = []
  private strands: Array<Strand> = []
  private clouds: Array<{
    x: number
    y: number
    w: number
    v: number
    img: HTMLCanvasElement | null
  }> = []
  private twinkles: Array<{ x: number; y: number; ph: number }> = []
  private lit: (c: string) => string

  constructor(private s: Scene) {
    this.lit = lightOf(s)
    const r = rng(101)
    if (has(s, 'pond') === 2) {
      const n = s.season === 'winter' ? 2 : 5
      for (let i = 0; i < n; i++)
        this.koi.push({
          ax: 18 + r() * 14,
          ay: 4 + r() * 4,
          w1: (0.09 + r() * 0.08) * (s.season === 'winter' ? 0.5 : 1),
          w2: 0,
          p1: r() * 6.28,
          p2: r() * 6.28,
          colours: KOI_COLOURS[i % KOI_COLOURS.length],
        })
      for (const k of this.koi) k.w2 = k.w1 * (1.4 + r() * 0.5)
    }
    this.makeMotes(r)
    this.makeWillow(r)
    if (s.daytime !== 'night') {
      const tint =
        s.daytime === 'dawn'
          ? '#f8dcd4'
          : s.daytime === 'dusk'
            ? '#f8cca4'
            : '#fbfdff'
      const shade =
        s.daytime === 'dawn'
          ? '#c8a2bc'
          : s.daytime === 'dusk'
            ? '#c88c84'
            : '#d2e0ee'
      for (let i = 0; i < 3; i++) {
        const w = 20 + Math.floor(r() * 22)
        this.clouds.push({
          x: r() * GW,
          y: 6 + r() * 24,
          w,
          v: 0.5 + r() * 0.7,
          img: cloud(w, r, tint, shade),
        })
      }
    } else
      for (let i = 0; i < 14; i++)
        this.twinkles.push({
          x: Math.floor(r() * GW),
          y: Math.floor(r() * 54),
          ph: r() * 6.28,
        })
  }

  private makeMotes(r: () => number) {
    const s = this.s
    const add = (n: number, f: () => Omit<Mote, 'ph'>) => {
      for (let i = 0; i < n; i++) this.motes.push({ ...f(), ph: r() * 6.28 })
    }
    if (s.season === 'winter')
      add(80, () => {
        const near = r() < 0.2
        return {
          x: r() * GW,
          y: r() * 144,
          vx: 1.5,
          vy: near ? 11 + r() * 5 : 5 + r() * 5,
          sway: 1 + r() * 2,
          w: 0.6 + r(),
          c: near ? '#ffffff' : '#e4ecf6',
          big: near,
        }
      })
    else if (s.season === 'spring' && has(s, 'plum'))
      add(has(s, 'plum') === 2 ? 22 : 5, () => ({
        x: 6 + r() * 64,
        y: 40 + r() * 50,
        vx: 3 + r() * 3,
        vy: 4 + r() * 3,
        sway: 2,
        w: 1 + r(),
        c: r() < 0.5 ? '#f6c0d0' : '#fff0f4',
        big: r() < 0.3,
      }))
    else if (s.season === 'autumn')
      add(4 + (has(s, 'willow') ? 8 : 0) + (has(s, 'plum') ? 6 : 0), () => {
        const fromWillow = has(s, 'willow') && r() < 0.5
        return {
          x: fromWillow ? WILLOW.x - 24 + r() * 48 : r() * GW,
          y: fromWillow ? 34 + r() * 30 : 20 + r() * 40,
          vx: 2 + r() * 4,
          vy: 5 + r() * 4,
          sway: 3,
          w: 1.2 + r(),
          c: ['#d88a2a', '#c0502a', '#e8c050', '#b8702a'][Math.floor(r() * 4)],
          big: true,
        }
      })
    else if (s.season === 'summer' && s.daytime === 'night')
      add(16, () => ({
        x: 10 + r() * 236,
        y: 92 + r() * 44,
        vx: 0,
        vy: 0,
        sway: 6 + r() * 8,
        w: 0.3 + r() * 0.4,
        c: '#d8f070',
        big: false,
      }))
  }

  private makeWillow(r: () => number) {
    const stage = has(this.s, 'willow')
    if (!stage) return
    const s = this.s
    const leaf =
      s.season === 'spring'
        ? ['#b8d86a', '#9cc858']
        : s.season === 'summer'
          ? ['#6fa046', '#4f8a36']
          : s.season === 'autumn'
            ? ['#c8b24a', '#a8923a']
            : ['#a8987a', '#8e7e62']
    const n = stage === 2 ? (s.season === 'winter' ? 22 : 64) : 7
    const span = stage === 2 ? 30 : 8
    const top = stage === 2 ? 74 : 26
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1
      const x = WILLOW.x + u * span + (r() - 0.5) * 3
      // anchors along the crown's arch
      const y =
        WILLOW.y - top + Math.abs(u) ** 1.6 * (stage === 2 ? 14 : 4) + r() * 4
      this.strands.push({
        x,
        y,
        len:
          (stage === 2 ? 14 : 6) +
          r() * (stage === 2 ? 22 : 6) * (1 - Math.abs(u) * 0.3),
        ph: r() * 6.28,
        c: leaf[i % 2],
        leaf: leaf[(i + 1) % 2],
      })
    }
  }

  // Before the courtyard: clouds, and stars that twinkle
  sky(g: G, t: number) {
    const p = new Paint(g)
    for (const c of this.clouds) {
      if (!c.img) continue
      const x = ((c.x + c.v * t) % (GW + c.w * 2)) - c.w
      g.drawImage(c.img, Math.round(x), Math.round(c.y))
    }
    for (const s of this.twinkles) {
      const b = Math.sin(t * 1.3 + s.ph)
      if (b > 0.6) p.raw(s.x, s.y, 1, 1, '#fff6d8')
      else if (b > 0.1) p.raw(s.x, s.y, 1, 1, '#8a9ad0')
    }
  }

  // On the water: koi under the surface, and glints on it
  water(g: G, t: number) {
    const p = new Paint(g, this.lit)
    for (const k of this.koi) {
      const at = (dt: number) => [
        POND.cx + k.ax * Math.sin(k.w1 * (t - dt) + k.p1),
        POND.cy + 1 + k.ay * Math.sin(k.w2 * (t - dt) + k.p2),
      ]
      const pts = [0, 0.32, 0.64, 0.96, 1.3].map(at)
      const [hx, hy] = pts[0]
      const [tx, ty] = pts[4]
      // the tail fin, across the line of the body
      const dx = pts[3][0] - tx
      const dy = pts[3][1] - ty
      const len = Math.hypot(dx, dy) || 1
      const nx = Math.round(-dy / len)
      const ny = Math.round(dx / len)
      p.px(Math.round(tx + nx), Math.round(ty + ny), k.colours[2])
      p.px(Math.round(tx - nx), Math.round(ty - ny), k.colours[2])
      for (let i = 3; i >= 1; i--)
        p.px(
          Math.round(pts[i][0]),
          Math.round(pts[i][1]),
          i === 2 ? k.colours[1] : k.colours[0],
        )
      p.px(Math.round(hx), Math.round(hy), k.colours[0])
      if (this.s.season === 'winter') continue
      // a ripple now and then where one rises
      const rise = Math.sin(t * 0.4 + k.p1 * 3)
      if (rise > 0.97) {
        p.px(Math.round(hx) - 2, Math.round(hy) - 1, '#c8e0dc')
        p.px(Math.round(hx) + 2, Math.round(hy) - 1, '#c8e0dc')
      }
    }
    // mist on the water in the early morning
    if (this.s.daytime === 'dawn' && has(this.s, 'pond') === 2)
      for (let i = 0; i < 4; i++) {
        const cx = Math.round(POND.cx - 44 + ((i * 29 + t * 1.2) % 92))
        const cy = POND.cy - 5 + (i % 2) * 6
        for (let y = -2; y <= 2; y++)
          for (let x = -11; x <= 11; x++) {
            const d = (x * x) / 121 + (y * y) / 5
            if (
              d < 1 &&
              pondDist(cx + x, cy + y) < 1.05 &&
              bayer(cx + x, cy + y) < 0.26 * (1 - d)
            )
              p.raw(cx + x, cy + y, 1, 1, '#dfe8e6')
          }
      }
    if (has(this.s, 'pond') === 2 && this.s.season !== 'winter') {
      const r = rng(7)
      for (let i = 0; i < 14; i++) {
        const x = Math.round(
          POND.cx - 40 + r() * 80 + Math.sin(t * 0.3 + i) * 2,
        )
        const y = Math.round(POND.cy - 6 + r() * 14)
        if (pondDist(x, y) > 0.88) continue
        const b = Math.sin(t * (1.1 + r()) + i * 1.7)
        if (b > 0.75)
          p.rect(x, y, 2, 1, this.s.daytime === 'night' ? '#6a7aa8' : '#d8f0ec')
      }
    }
  }

  // The willow's hanging boughs, swaying
  willow(g: G, t: number) {
    if (!this.strands.length) return
    const p = new Paint(g, this.lit)
    const gust = Math.sin(t * 0.23) * 0.8
    for (const st of this.strands) {
      const sway = Math.sin(t * 0.7 + st.ph) * 1.4 + gust
      for (let k = 0; k < st.len; k++) {
        const u = k / st.len
        const x = Math.round(
          st.x + sway * u * u + Math.sin(u * 3 + st.ph) * 0.6,
        )
        const y = Math.round(st.y + k)
        p.px(x, y, st.c)
        if (this.s.season !== 'winter' && k % 2 === 1)
          p.px(x + (k % 4 === 1 ? 1 : -1), y, st.leaf)
      }
    }
  }

  // In front of everything: creatures, falling things, and lights
  top(g: G, t: number) {
    const p = new Paint(g, this.lit)
    const s = this.s
    if (has(s, 'crane')) crane(p, t, has(s, 'crane'))
    if (has(s, 'cat')) cat(p, s, t, has(s, 'cat'))
    if (has(s, 'magpies')) magpies(p, t)
    if (has(s, 'chimes') && has(s, 'pavilion') === 2) chimes(p, t)
    if (has(s, 'kite') && s.daytime !== 'night') kite(p, t, has(s, 'kite'))
    if (has(s, 'butterflies') && s.daytime !== 'night' && s.season !== 'winter')
      butterflies(p, t)
    if (s.season === 'summer' && s.daytime !== 'night' && has(s, 'pond') === 2)
      dragonflies(p, t)
    if (s.daytime === 'dawn' || s.daytime === 'dusk') birds(p, t)
    this.fall(p, t)
    this.lights(p, t)
  }

  private fall(p: Paint, t: number) {
    for (const m of this.motes) {
      if (m.c === '#d8f070') {
        // a firefly: wandering, and blinking
        const x = m.x + Math.sin(t * m.w + m.ph) * m.sway
        const y = m.y + Math.sin(t * m.w * 1.3 + m.ph * 2) * m.sway * 0.4
        const b = Math.sin(t * 1.6 + m.ph * 3)
        if (b > 0.2) {
          p.raw(
            Math.round(x),
            Math.round(y),
            1,
            1,
            b > 0.7 ? '#f4ffa0' : '#a8c050',
          )
          if (b > 0.7) p.light(x, y, 4, [216, 240, 112], b - 0.4)
        }
        continue
      }
      const span = 150
      const y = ((m.y + m.vy * t) % span) - 6
      const x =
        ((((m.x + m.vx * t + Math.sin(t * m.w + m.ph) * m.sway) % (GW + 8)) +
          GW +
          8) %
          (GW + 8)) -
        4
      const c = this.s.daytime === 'night' ? mix(m.c, '#2a3866', 0.55) : m.c
      p.raw(Math.round(x), Math.round(y), 1, 1, c)
      if (m.big) {
        const flip = Math.sin(t * 3 + m.ph) > 0
        p.raw(
          Math.round(x) + (flip ? 1 : 0),
          Math.round(y) + (flip ? 0 : 1),
          1,
          1,
          c,
        )
      }
    }
  }

  private lights(p: Paint, t: number) {
    const s = this.s
    const night = s.daytime === 'night'
    const dusk = s.daytime === 'dusk'
    if (!night && !dusk) return
    const flicker = 0.08 * Math.sin(t * 11) + 0.05 * Math.sin(t * 6.7 + 1)
    const k = night ? 1 : 0.55
    if (has(s, 'lantern') === 2) {
      p.light(
        LANTERN.x,
        LANTERN.y - 14,
        16,
        [255, 184, 96],
        (0.9 + flicker) * k,
      )
      p.raw(
        LANTERN.x - 1,
        LANTERN.y - 15,
        3,
        3,
        flicker > 0.05 ? '#fff0b0' : '#ffd27a',
      )
    }
    if (has(s, 'lanterns'))
      for (const [x, y] of lanternSpots(s).slice(
        0,
        has(s, 'lanterns') === 2 ? 2 : 1,
      )) {
        p.light(x, y + 7, 13, [255, 112, 80], (0.85 + flicker) * k)
        p.raw(x - 1, y + 6, 2, 2, '#ffb090')
      }
    if (night && has(s, 'gate') === 2)
      p.light(120, 84, 12, [255, 207, 138], 0.5 + flicker)
  }
}

// A cloud: a few puffs on a flat base, shaded underneath, its edge soft
function cloud(
  w: number,
  r: () => number,
  tint: string,
  shade: string,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const h = Math.ceil(w * 0.32)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (!g) return null
  const p = new Paint(g)
  // puffs sitting on a flat base, the biggest near the middle
  const n = 3 + Math.floor(r() * 3)
  const puffs = Array.from({ length: n }, (_, i) => {
    const u = n > 1 ? i / (n - 1) : 0.5
    const rad = h * (0.3 + 0.38 * Math.sin(u * Math.PI) + r() * 0.14)
    return { x: rad + u * (w - 2 * rad), y: h - 1 - rad, r: rad }
  })
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let d = Infinity
      for (const q of puffs)
        d = Math.min(d, Math.hypot(x + 0.5 - q.x, (y + 0.5 - q.y) * 1.1) - q.r)
      // the flat underside
      if (y >= h - 1) d = Math.max(d, -0.5)
      if (d > 0) continue
      if (d > -1 && bayer(x, y) < 0.5) continue
      const under = y >= h - 3
      p.raw(x, y, 1, 1, under ? shade : d > -2 ? mix(tint, shade, 0.2) : tint)
    }
  return c
}

// --- Creatures

const CRANE_STAND = [
  '...rr.........',
  '..wkkw........',
  'yykkkw........',
  '....kk........',
  '....kk........',
  '....kw........',
  '.....ww.......',
  '.....wwwww....',
  '....wwwwwwwk..',
  '....wwwwwwkkk.',
  '.....wwwwwkkk.',
  '......wwwwkk..',
  '.......g.g....',
  '.......g.g....',
  '.......g.g....',
  '.......g.g....',
  '.......g.g....',
  '......gg.gg...',
]

const CRANE_PECK = [
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '.......wwww...',
  '.....wwwwwwwk.',
  '...kwwwwwwkkk.',
  '..kk.wwwwwkkk.',
  '.kk...wwwwkk..',
  'rkk....g.g....',
  'ykw....g.g....',
  'y......g.g....',
  '.......g.g....',
  '.......g.g....',
  '......gg.gg...',
]

function crane(p: Paint, t: number, stage: number) {
  // it bends to the water for a while every so often
  const cycle = t % 11
  const rows = cycle > 8.4 && cycle < 10.4 ? CRANE_PECK : CRANE_STAND
  const pal =
    stage === 2
      ? { r: '#d8202a', w: '#f6f4ee', k: '#1e1c22', y: '#c8a050', g: '#3a3a40' }
      : { r: '#a87a4a', w: '#c8bcae', k: '#7a6a5a', y: '#a88a50', g: '#4a4a50' }
  const y = CRANE.y - rows.length
  p.sprite(rows, pal, CRANE.x - 4, y)
  // its reflection, broken, in the water at its feet
  p.dither(CRANE.x - 2, CRANE.y, 8, 2, '#3a767c', 0.3)
}

function cat(p: Paint, s: Scene, t: number, stage: number) {
  const x = 134
  const y = 57
  const fur = '#d88a3a'
  const stripe = '#a8602a'
  if (stage === 1) {
    // only its ears and eyes, peering over the coping
    p.rect(x, y - 2, 6, 2, fur)
    p.px(x, y - 3, fur)
    p.px(x + 5, y - 3, fur)
    p.px(x + 1, y - 1, '#2a2a20')
    p.px(x + 4, y - 1, '#2a2a20')
    return
  }
  // asleep in a loaf on the coping, its tail hanging down the wall
  p.sprite(
    [
      '.f..f.......',
      '.ffff.......',
      'fffffsffsff.',
      'fwwffffffffs',
      '.wwfsffsfff.',
    ],
    { f: fur, s: stripe, w: '#f2ede0' },
    x,
    y - 5,
  )
  const night = s.daytime === 'night'
  if (night) {
    p.raw(x + 1, y - 3, 1, 1, '#c8f070')
    p.raw(x + 3, y - 3, 1, 1, '#c8f070')
  } else {
    p.px(x + 1, y - 3, '#6a4a2a')
    p.px(x + 3, y - 3, '#6a4a2a')
  }
  for (let k = 0; k < 9; k++) {
    const sw = Math.sin(t * 1.1 - k * 0.35) * (k / 9) * 2.4
    p.px(Math.round(x + 11 + sw), y + k, k % 3 === 2 ? stripe : fur)
  }
}

function magpies(p: Paint, t: number) {
  for (const [x, ph] of [
    [92, 0],
    [101, 2.3],
  ]) {
    const hop = (t + ph) % 5 < 0.25 ? 1 : 0
    p.sprite(
      ['..kk...', '.kkkk..', 'kkwwbbb', '..ww...', '..k.k..'],
      { k: '#1b1820', w: '#f2f2f0', b: '#3d6fa8' },
      x,
      50 - hop,
    )
  }
}

function chimes(p: Paint, t: number) {
  const x = 181
  const sw = Math.sin(t * 1.7) * 1.2
  p.px(x, 69, '#3b2a1a')
  p.px(x, 70, '#3b2a1a')
  for (let i = 0; i < 3; i++) {
    const cx = Math.round(x - 2 + i * 2 + sw * (0.6 + i * 0.2))
    p.rect(cx, 72, 1, 3 + i, '#c8a050')
  }
}

function kite(p: Paint, t: number, stage: number) {
  const x = Math.round(58 + Math.sin(t * 0.55) * 3)
  const y = Math.round((stage === 2 ? 16 : 30) + Math.sin(t * 0.83) * 2)
  // the string, down beyond the wall
  for (let i = 0; i < 40; i++) {
    const u = i / 40
    const sx = x + 2 + (118 - x) * u
    const sy = y + 6 + (57 - y - 6) * u + Math.sin(u * Math.PI) * 4
    if (i % 2 === 0) p.px(Math.round(sx), Math.round(sy), '#5a4a3a')
  }
  // a swallow kite (沙燕), red and gold
  p.sprite(
    [
      'k.........k',
      'rk.......kr',
      'rrk.....krr',
      '.rrkkkkkrr.',
      '..ryyRyyr..',
      '...yRRRy...',
      '....kRk....',
      '....k.k....',
      '...k...k...',
    ],
    { k: '#1b1418', r: '#c8322a', R: '#e0402a', y: '#f2c14e' },
    x - 5,
    y - 2,
  )
  // tail ribbons
  for (let k = 0; k < 6; k++) {
    const sw = Math.sin(t * 3 - k * 0.6) * 1.2
    p.px(Math.round(x - 2 + sw), y + 7 + k, '#e0402a')
    p.px(Math.round(x + 2 - sw), y + 7 + k, '#f2c14e')
  }
}

function butterflies(p: Paint, t: number) {
  for (const [cx, cy, ph, c] of [
    [236, 120, 0, '#f2c14e'],
    [40, 96, 2, '#f6f2ea'],
  ] as const) {
    const x = Math.round(
      cx + Math.sin(t * 0.7 + ph) * 12 + Math.sin(t * 2.3 + ph) * 2,
    )
    const y = Math.round(cy + Math.sin(t * 1.1 + ph) * 5)
    const open = Math.sin(t * 14 + ph) > 0
    p.px(x, y, '#3a2a1a')
    if (open) {
      p.px(x - 1, y - 1, c)
      p.px(x + 1, y - 1, c)
      p.px(x - 1, y, c)
      p.px(x + 1, y, c)
    } else {
      p.px(x, y - 1, c)
    }
  }
}

// A skein of birds crossing the sky in a V, once in a while
function birds(p: Paint, t: number) {
  const cycle = 64
  const u = (t % cycle) / cycle
  const x0 = -30 + u * (GW + 70)
  const y0 = 14 + Math.sin(t * 0.25) * 3
  for (let i = 0; i < 5; i++) {
    const k = Math.ceil(i / 2)
    const x = Math.round(x0 - k * 6)
    const y = Math.round(y0 + (i % 2 ? 1 : -1) * k * 3)
    const up = Math.sin(t * 5 + i * 1.3) > 0
    p.px(x, y, '#2a2630')
    p.px(x - 1, y + (up ? -1 : 0), '#2a2630')
    p.px(x + 1, y + (up ? -1 : 0), '#2a2630')
  }
}

function dragonflies(p: Paint, t: number) {
  for (const ph of [0, 2.7]) {
    // darts, then hovers
    const seg = Math.floor((t + ph * 3) / 2.2)
    const r = rng(seg * 13 + Math.round(ph * 10))
    const x = Math.round(POND.cx - 30 + r() * 60 + Math.sin(t * 5 + ph) * 0.6)
    const y = Math.round(POND.cy - 14 + r() * 10)
    p.rect(x, y, 3, 1, '#3d6fa8')
    if (Math.sin(t * 40 + ph) > 0) {
      p.px(x + 1, y - 1, '#c8e0f0')
      p.px(x + 1, y + 1, '#c8e0f0')
    }
  }
}
