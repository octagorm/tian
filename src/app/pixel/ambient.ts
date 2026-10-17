// Things that move over a backdrop, drawn every frame in its own pixels:
// water that shimmers, lanterns that sway and glow, steam, smoke, mist,
// clouds, birds, people passing, flags, stars. Each is a function of time
// alone (with seeded randomness), so any moment can be drawn without
// keeping state, and a still frame is simply the moment t = 0.

export type G = CanvasRenderingContext2D

export interface Frame {
  g: G
  // seconds
  t: number
  // the backdrop picture, for effects that move its own pixels
  img: CanvasImageSource | null
  w: number
  h: number
}

export type Layer = (f: Frame) => void

// --- Small tools ---

// A number from 0 to 1 for any integer, the same every time
export function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
// Whether a pixel is on in an ordered dither of this density (0 to 1)
export const dith = (x: number, y: number, d: number) =>
  (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < d

export function px(g: G, x: number, y: number, c: string) {
  g.fillStyle = c
  g.fillRect(Math.round(x), Math.round(y), 1, 1)
}

export function box(
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

// A soft disc of see-through pixels, thickest in the middle: a puff of
// steam or smoke. The see-through comes in a few steps, as in pixel art.
export function puff(
  g: G,
  cx: number,
  cy: number,
  r: number,
  c: string,
  density: number,
) {
  g.fillStyle = c
  const x0 = Math.round(cx)
  const y0 = Math.round(cy)
  const R = Math.ceil(r)
  for (let y = -R; y <= R; y++)
    for (let x = -R; x <= R; x++) {
      const d = Math.sqrt(x * x + y * y) / Math.max(r, 0.5)
      if (d > 1) continue
      const a = Math.round(density * (1 - d * d) * 6) / 6
      if (a <= 0) continue
      g.globalAlpha = Math.min(1, a)
      g.fillRect(x0 + x, y0 + y, 1, 1)
    }
  g.globalAlpha = 1
}

// Light added to what is there, falling off from the middle in steps
export function glow(
  g: G,
  cx: number,
  cy: number,
  r: number,
  c: string,
  strength: number,
) {
  const prev = g.globalCompositeOperation
  g.globalCompositeOperation = 'lighter'
  g.fillStyle = c
  const x0 = Math.round(cx)
  const y0 = Math.round(cy)
  const R = Math.ceil(r)
  for (let y = -R; y <= R; y++)
    for (let x = -R; x <= R; x++) {
      const d = Math.sqrt(x * x + y * y) / Math.max(r, 0.5)
      if (d > 1) continue
      const a = Math.round(strength * (1 - d) ** 1.6 * 8) / 8
      if (a <= 0) continue
      g.globalAlpha = Math.min(1, a)
      g.fillRect(x0 + x, y0 + y, 1, 1)
    }
  g.globalAlpha = 1
  g.globalCompositeOperation = prev
}

const wave = (t: number, speed: number, phase: number) =>
  Math.sin(t * speed + phase)

// --- Water and wind on the picture's own pixels ---

// Rows of the picture slide from side to side, more towards the bottom:
// reflections that shimmer
export function shimmer(o: {
  y0: number
  y1: number
  x0?: number
  x1?: number
  amp?: number
  speed?: number
}): Layer {
  return ({ g, t, img, w }) => {
    if (!img) return
    const x0 = o.x0 ?? 0
    const x1 = o.x1 ?? w
    const amp = o.amp ?? 1.5
    for (let y = o.y0; y < o.y1; y++) {
      const depth = (y - o.y0) / Math.max(1, o.y1 - o.y0)
      const dx = Math.round(
        wave(t, o.speed ?? 1.6, y * 0.9) * amp * (0.35 + depth),
      )
      if (dx) g.drawImage(img, x0, y, x1 - x0, 1, x0 + dx, y, x1 - x0, 1)
    }
  }
}

// Columns slide up and down in a travelling wave: a flag in the wind
export function ripple(o: {
  x0: number
  y0: number
  x1: number
  y1: number
  amp?: number
  speed?: number
  // the flag is fixed at its left edge (pole on the left)
  from?: 'left' | 'right'
}): Layer {
  return ({ g, t, img }) => {
    if (!img) return
    const h = o.y1 - o.y0
    for (let x = o.x0; x < o.x1; x++) {
      const along =
        o.from === 'right'
          ? (o.x1 - x) / (o.x1 - o.x0)
          : (x - o.x0) / (o.x1 - o.x0)
      const dy = Math.round(
        wave(t, o.speed ?? 5, -x * 0.8) * (o.amp ?? 1) * along,
      )
      if (dy) g.drawImage(img, x, o.y0, 1, h, x, o.y0 + dy, 1, h)
    }
  }
}

// Specks of light that come and go on water
export function glints(o: {
  x0: number
  y0: number
  x1: number
  y1: number
  n?: number
  colour?: string
  seed?: number
}): Layer {
  return ({ g, t }) => {
    const n = o.n ?? 20
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 1) * 1000 + i
      const period = 1.4 + hash(s) * 2.2
      const phase = (t / period + hash(s + 7)) % 1
      if (phase > 0.35) continue
      const x = o.x0 + hash(s + 1) * (o.x1 - o.x0)
      const y = o.y0 + hash(s + 2) * (o.y1 - o.y0)
      const len =
        phase < 0.12 || phase > 0.25 ? 1 : 2 + Math.round(hash(s + 3) * 2)
      box(g, x, y, len, 1, o.colour ?? '#fff6d8')
    }
  }
}

// --- Light ---

// Lights that flicker, as lanterns and candles do
export function lights(o: {
  at: Array<[number, number]>
  r?: number
  colour?: string
  strength?: number
}): Layer {
  return ({ g, t }) => {
    o.at.forEach(([x, y], i) => {
      const f =
        0.75 + 0.15 * wave(t, 7.3, i * 2.1) + 0.1 * wave(t, 13.1, i * 5.7)
      glow(
        g,
        x,
        y,
        (o.r ?? 7) * (0.92 + f * 0.1),
        o.colour ?? '#ff9a4a',
        (o.strength ?? 0.28) * f,
      )
    })
  }
}

// Red lanterns hanging into the picture from above, swaying
export function lanterns(o: {
  at: Array<[number, number, number]>
  colour?: string
  size?: number
}): Layer {
  return ({ g, t }) => {
    o.at.forEach(([x, top, len], i) => {
      const s = o.size ?? 1
      const sway = wave(t, 1.3 + hash(i) * 0.5, i * 1.7) * 1.6
      const bx = x + sway
      const by = top + len
      // the cord
      for (let j = 0; j < len; j++)
        px(g, x + (sway * j) / len, top + j, '#2a1810')
      lantern(g, bx, by, s, o.colour ?? '#d8322a')
      glow(g, bx, by + 5 * s, 9 * s, '#ff8a3a', 0.22 + 0.05 * wave(t, 9, i))
    })
  }
}

export function lantern(g: G, x: number, y: number, s: number, c: string) {
  const w = Math.round(5 * s)
  const h = Math.round(7 * s)
  const cx = Math.round(x)
  const top = Math.round(y)
  box(g, cx - Math.floor(w / 2) + 1, top, w - 2, 1, '#e8b440')
  for (let j = 1; j < h - 1; j++) {
    const half = Math.round(
      (w / 2) * Math.sqrt(1 - ((j - h / 2) / (h / 2)) ** 2 * 0.6),
    )
    box(g, cx - half, top + j, half * 2 + 1, 1, c)
    px(g, cx + half, top + j, '#8a1a14')
    if (j > 1 && j < h - 2) px(g, cx - half + 1, top + j, '#ff8a6a')
  }
  box(g, cx - Math.floor(w / 2) + 1, top + h - 1, w - 2, 1, '#e8b440')
  box(g, cx, top + h, 1, 2 * s, '#e8b440')
}

// --- Air ---

// Puffs that rise and spread and thin out: steam, smoke, incense
export function rising(o: {
  x: number
  y: number
  colour?: string
  // puffs alive at once
  n?: number
  // seconds a puff lives
  life?: number
  // pixels it rises in a lifetime
  rise?: number
  spread?: number
  size?: number
  drift?: number
  density?: number
  seed?: number
}): Layer {
  return ({ g, t }) => {
    const n = o.n ?? 6
    const life = o.life ?? 3
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 3) * 100 + i
      const a = (t / life + i / n + hash(s) * 0.1) % 1
      const x =
        o.x +
        (hash(s + 1) - 0.5) * (o.spread ?? 4) +
        Math.sin(a * 5 + i) * 2 * a +
        (o.drift ?? 0) * a
      const y = o.y - a * (o.rise ?? 24)
      const r = (o.size ?? 2) * (0.6 + a * 1.6)
      puff(g, x, y, r, o.colour ?? '#f4efe6', (o.density ?? 0.55) * (1 - a))
    }
  }
}

// Sparks flying up from coals
export function sparks(o: {
  x0: number
  x1: number
  y: number
  n?: number
}): Layer {
  return ({ g, t }) => {
    const n = o.n ?? 8
    for (let i = 0; i < n; i++) {
      const life = 0.8 + hash(i * 3) * 0.9
      const a = (t / life + hash(i)) % 1
      const x = o.x0 + hash(i + 50) * (o.x1 - o.x0) + Math.sin(a * 9 + i) * 2
      const y = o.y - a * (14 + hash(i + 9) * 12)
      px(g, x, y, a < 0.4 ? '#ffe680' : a < 0.75 ? '#ff9a3a' : '#c84a2a')
    }
  }
}

// Wisps of mist drifting sideways, as dithered bands
export function mist(o: {
  y0: number
  y1: number
  colour?: string
  speed?: number
  density?: number
  n?: number
  seed?: number
}): Layer {
  return ({ g, t, w }) => {
    const n = o.n ?? 5
    g.fillStyle = o.colour ?? '#e8f0f0'
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 9) * 50 + i
      const len = Math.round(40 + hash(s) * 70)
      const thick = Math.round(2 + hash(s + 1) * 4)
      const y = Math.round(o.y0 + hash(s + 2) * (o.y1 - o.y0))
      const span = w + len
      const x = Math.round(
        ((hash(s + 3) * span + t * (o.speed ?? 3) * (0.6 + hash(s + 4))) %
          span) -
          len,
      )
      // thickest along the middle of the wisp, in a few steps of see-through
      for (let j = 0; j < thick; j++)
        for (let k = 0; k < len; k += 2) {
          const e = Math.min(k, len - k) / (len / 2)
          const v = Math.min(j + 1, thick - j) / (thick / 2)
          const a =
            Math.round((o.density ?? 0.35) * Math.min(1, e * 1.6) * v * 6) / 6
          if (a <= 0 || x + k < -1 || x + k >= w) continue
          g.globalAlpha = a
          g.fillRect(x + k, y + j, 2, 1)
        }
    }
    g.globalAlpha = 1
  }
}

// Little clouds crossing the sky
export function clouds(o: {
  y0: number
  y1: number
  n?: number
  colour?: string
  shade?: string
  speed?: number
  seed?: number
}): Layer {
  return ({ g, t, w }) => {
    const n = o.n ?? 3
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 5) * 40 + i
      const cw = 14 + hash(s) * 18
      const span = w + cw * 2
      const x =
        ((hash(s + 1) * span +
          t * (o.speed ?? 1.2) * (0.7 + hash(s + 2) * 0.6)) %
          span) -
        cw
      const y = o.y0 + hash(s + 3) * (o.y1 - o.y0)
      for (let k = 0; k < 4; k++) {
        const bx = x + (k / 3) * cw
        const r = 2 + Math.sin((k / 3) * Math.PI) * (2 + hash(s + 4) * 3)
        puff(g, bx, y, r, o.colour ?? '#fbf3e4', 0.9)
      }
      if (o.shade)
        for (let k = 0; k < cw; k++)
          if (dith(k, 0, 0.5)) px(g, x + k, y + 3, o.shade)
    }
  }
}

// Birds, two frames of wing, crossing slowly
export function birds(o: {
  y0: number
  y1: number
  n?: number
  colour?: string
  speed?: number
  seed?: number
}): Layer {
  return ({ g, t, w }) => {
    const n = o.n ?? 3
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 11) * 30 + i
      const span = w + 60
      const v = (o.speed ?? 9) * (0.7 + hash(s) * 0.6)
      const x = ((hash(s + 1) * span + t * v) % span) - 30
      const y = o.y0 + hash(s + 2) * (o.y1 - o.y0) + Math.sin(t * 0.8 + i) * 2
      const up = Math.floor(t * 5 + i) % 2 === 0
      const c = o.colour ?? '#2a2430'
      px(g, x, y, c)
      if (up) {
        px(g, x - 1, y - 1, c)
        px(g, x + 1, y - 1, c)
        px(g, x - 2, y - 2, c)
        px(g, x + 2, y - 2, c)
      } else {
        px(g, x - 1, y, c)
        px(g, x + 1, y, c)
        px(g, x - 2, y + 1, c)
        px(g, x + 2, y + 1, c)
      }
    }
  }
}

// Stars that twinkle
export function twinkle(o: {
  x0: number
  y0: number
  x1: number
  y1: number
  n?: number
  seed?: number
}): Layer {
  return ({ g, t }) => {
    const n = o.n ?? 16
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 13) * 70 + i
      const x = o.x0 + hash(s) * (o.x1 - o.x0)
      const y = o.y0 + hash(s + 1) * (o.y1 - o.y0)
      const b = Math.sin(t * (1 + hash(s + 2) * 2) + i * 3)
      if (b < -0.2) continue
      px(g, x, y, b > 0.7 ? '#fffbe8' : '#a8b4e8')
      if (b > 0.9) {
        px(g, x - 1, y, '#5a64a8')
        px(g, x + 1, y, '#5a64a8')
        px(g, x, y - 1, '#5a64a8')
        px(g, x, y + 1, '#5a64a8')
      }
    }
  }
}

// Motes drifting in a beam of light
export function motes(o: {
  x0: number
  y0: number
  x1: number
  y1: number
  n?: number
  colour?: string
  seed?: number
}): Layer {
  return ({ g, t }) => {
    const n = o.n ?? 14
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 17) * 60 + i
      const x =
        o.x0 +
        ((hash(s) * (o.x1 - o.x0) + Math.sin(t * 0.3 + i) * 6 + t * 1.5) %
          (o.x1 - o.x0))
      const y =
        o.y0 +
        ((hash(s + 1) * (o.y1 - o.y0) + t * (0.8 + hash(s + 2))) %
          (o.y1 - o.y0))
      if (Math.sin(t * 2 + i * 1.3) > -0.3) px(g, x, y, o.colour ?? '#fff0c0')
    }
  }
}

// Flickering light over a part of the picture: neon, a screen
export function flicker(o: {
  x: number
  y: number
  w: number
  h: number
  colour: string
  strength?: number
  seed?: number
}): Layer {
  return ({ g, t }) => {
    const s = o.seed ?? 1
    const k = Math.floor(t * 12)
    const off = hash(s * 997 + k) < 0.04
    const pulse = 0.7 + 0.3 * Math.sin(t * 3 + s)
    if (off) return
    const prev = g.globalCompositeOperation
    g.globalCompositeOperation = 'lighter'
    g.globalAlpha = (o.strength ?? 0.25) * pulse
    g.fillStyle = o.colour
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++)
        if (dith(o.x + x, o.y + y, 0.5)) g.fillRect(o.x + x, o.y + y, 1, 1)
    g.globalAlpha = 1
    g.globalCompositeOperation = prev
  }
}

// A field of stars rushing past, on a screen
export function warp(o: {
  x: number
  y: number
  w: number
  h: number
  seed?: number
}): Layer {
  return ({ g, t }) => {
    const cx = o.x + o.w / 2
    const cy = o.y + o.h / 2
    for (let i = 0; i < 18; i++) {
      const s = (o.seed ?? 3) * 20 + i
      const a = hash(s) * Math.PI * 2
      const d = ((t * (0.5 + hash(s + 1)) + hash(s + 2)) % 1) ** 2
      const x = cx + Math.cos(a) * d * o.w * 0.6
      const y = cy + Math.sin(a) * d * o.h * 0.6
      if (x < o.x || x >= o.x + o.w || y < o.y || y >= o.y + o.h) continue
      px(g, x, y, d > 0.4 ? '#ffffff' : '#7ad8ff')
    }
  }
}

// Small people walking across the far side of a place
export function passers(o: {
  y: number
  x0?: number
  x1?: number
  n?: number
  speed?: number
  colours?: Array<string>
  seed?: number
  dim?: number
}): Layer {
  return ({ g, t, w }) => {
    const n = o.n ?? 3
    const x0 = o.x0 ?? 0
    const x1 = o.x1 ?? w
    const cols = o.colours ?? [
      '#3d6fa8',
      '#c8372d',
      '#2f7d6d',
      '#d9a441',
      '#6b4fa0',
      '#4a4048',
    ]
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 19) * 40 + i
      const dir = hash(s) < 0.5 ? 1 : -1
      const v = (o.speed ?? 6) * (0.7 + hash(s + 1) * 0.6)
      const span = x1 - x0 + 20
      const p = (hash(s + 2) * span + t * v) % span
      const x = dir > 0 ? x0 - 10 + p : x1 + 10 - p
      if (x < x0 - 6 || x > x1 + 6) continue
      const y = o.y + Math.round(hash(s + 3) * 3)
      const step = Math.floor(t * v * 0.45 + i) % 2
      walker(
        g,
        x,
        y,
        cols[Math.floor(hash(s + 4) * cols.length)],
        step,
        o.dim ?? 0,
      )
    }
  }
}

// A far-off person, 5 wide and 13 tall, in two steps of a walk
function walker(
  g: G,
  x: number,
  y: number,
  coat: string,
  step: number,
  dim: number,
) {
  // far away, colours sink into the shade of the place
  const d = (c: string) => toward(c, '#141024', Math.min(0.7, dim))
  const hair = d('#2a2026')
  const skin = d('#d8a880')
  const legs = d('#2b3550')
  box(g, x + 1, y - 13, 3, 1, hair)
  box(g, x + 1, y - 12, 3, 2, skin)
  box(g, x, y - 10, 5, 5, d(coat))
  px(g, x, y - 6, skin)
  px(g, x + 4, y - 6, skin)
  box(g, x + 1, y - 5, 3, 1, legs)
  if (step) {
    box(g, x + 1, y - 4, 1, 4, legs)
    box(g, x + 3, y - 4, 1, 4, legs)
  } else {
    box(g, x + 2, y - 4, 1, 4, legs)
    px(g, x + 1, y - 1, legs)
    px(g, x + 3, y - 1, legs)
  }
}

// One colour part of the way to another
export function toward(a: string, b: string, t: number): string {
  const p = parseInt(a.slice(1), 16)
  const q = parseInt(b.slice(1), 16)
  const ch = (s: number) =>
    Math.round(((p >> s) & 255) + (((q >> s) & 255) - ((p >> s) & 255)) * t)
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

// Petals or leaves drifting down and across, all the time
export function petals(o: {
  n?: number
  colours?: Array<string>
  speed?: number
  seed?: number
}): Layer {
  return ({ g, t, w, h }) => {
    const n = o.n ?? 14
    const cols = o.colours ?? ['#ffb8d0', '#ff8ab0', '#fff0f4']
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 3) * 50 + i
      const fall = (o.speed ?? 9) * (0.6 + hash(s) * 0.8)
      const y = ((hash(s + 1) * (h + 10) + t * fall) % (h + 10)) - 5
      const x =
        ((hash(s + 2) * (w + 40) + t * 5 + Math.sin(t * 1.4 + i) * 8) %
          (w + 40)) -
        20
      const c = cols[i % cols.length]
      const turn = Math.floor(t * 4 + i) % 3
      if (turn === 0) box(g, x, y, 2, 1, c)
      else if (turn === 1) px(g, x, y, c)
      else box(g, x, y, 1, 2, c)
    }
  }
}

// Lightning now and then: two quick flashes over everything, and a bolt
export function lightning(o: {
  x0: number
  x1: number
  y1: number
  period?: number
}): Layer {
  return ({ g, t, w, h }) => {
    const p = o.period ?? 7
    // offset, so the still frame at t = 0 has no flash
    const k = Math.floor((t + p / 2) / p)
    const a = t + p / 2 - k * p
    if (!(a < 0.08 || (a > 0.18 && a < 0.26))) return
    g.globalAlpha = 0.22
    box(g, 0, 0, w, h, '#e8eaff')
    g.globalAlpha = 1
    let x = o.x0 + hash(k) * (o.x1 - o.x0)
    let y = 0
    while (y < o.y1) {
      const nx = x + (hash(k * 31 + y) - 0.5) * 9
      const ny = y + 4 + hash(k * 17 + y) * 6
      const n = Math.ceil(Math.max(Math.abs(nx - x), ny - y))
      for (let i = 0; i <= n; i++)
        px(g, x + ((nx - x) * i) / n, y + ((ny - y) * i) / n, '#ffffff')
      x = nx
      y = ny
    }
  }
}
