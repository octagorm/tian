// A painter for the garden's pixel art: a small canvas, flat colours,
// and ordered (Bayer) dithering for gradients and shade, as in the VGA
// adventures. Every colour goes through the light of the hour (`lit`):
// the same garden drawn at dusk is warmer, at night dark blue, so one
// drawing serves all times of day. Lights themselves are drawn `raw`.

export type G = CanvasRenderingContext2D

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

// The threshold of the pattern at a pixel, in (0, 1)
export const bayer = (x: number, y: number) =>
  (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16

// A seeded random, so the garden looks the same every time
export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export const hex = (r: number, g: number, b: number) =>
  `#${((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1)}`

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

export const rgbOf = (c: string): [number, number, number] => {
  const n = parseInt(c.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

// Two colours mixed, `t` of the second
export function mix(a: string, b: string, t: number) {
  const x = rgbOf(a)
  const y = rgbOf(b)
  return hex(
    x[0] + (y[0] - x[0]) * t,
    x[1] + (y[1] - x[1]) * t,
    x[2] + (y[2] - x[2]) * t,
  )
}

// Light as a multiply and an add per channel
export type Light = [number, number, number, number, number, number]

export function lighting(light: Light) {
  const [mr, mg, mb, ar, ag, ab] = light
  const cache = new Map<string, string>()
  return (c: string) => {
    let out = cache.get(c)
    if (!out) {
      const [r, g, b] = rgbOf(c)
      out = hex(r * mr + ar, g * mg + ag, b * mb + ab)
      cache.set(c, out)
    }
    return out
  }
}

export class Paint {
  constructor(
    public g: G,
    public lit: (c: string) => string = (c) => c,
  ) {}

  rect(x: number, y: number, w: number, h: number, c: string) {
    this.g.fillStyle = this.lit(c)
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  // Not lit: lights, and the sky, which is the light
  raw(x: number, y: number, w: number, h: number, c: string) {
    this.g.fillStyle = c
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }

  px(x: number, y: number, c: string) {
    this.rect(x, y, 1, 1, c)
  }

  // A filled ellipse, a row at a time, so the edge stays crisp
  disc(cx: number, cy: number, rx: number, ry: number, c: string) {
    this.g.fillStyle = this.lit(c)
    for (let y = -ry; y <= ry; y++) {
      const t = 1 - (y * y) / (ry * ry || 1)
      const hw = Math.floor(rx * Math.sqrt(Math.max(0, t)) + 0.5)
      this.g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1)
    }
  }

  // A filled polygon, by rows
  poly(pts: Array<[number, number]>, c: string) {
    this.g.fillStyle = this.lit(c)
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
        this.g.fillRect(
          Math.round(xs[i]),
          y,
          Math.round(xs[i + 1]) - Math.round(xs[i]),
          1,
        )
    }
  }

  // A line a pixel (or `w` pixels) wide
  line(x0: number, y0: number, x1: number, y1: number, c: string, w = 1) {
    this.g.fillStyle = this.lit(c)
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    const off = Math.floor((w - 1) / 2)
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n) - off
      const y = Math.round(y0 + ((y1 - y0) * i) / n) - off
      this.g.fillRect(x, y, w, w)
    }
  }

  // A colour laid over a rectangle through the dither pattern: `amount`
  // of the pixels, 0–1
  dither(
    x: number,
    y: number,
    w: number,
    h: number,
    c: string,
    amount: number,
  ) {
    if (amount <= 0) return
    this.g.fillStyle = this.lit(c)
    const x0 = Math.round(x)
    const y0 = Math.round(y)
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++)
        if (bayer(x0 + i, y0 + j) < amount)
          this.g.fillRect(x0 + i, y0 + j, 1, 1)
  }

  // Colours from top to bottom, each dithered into the next
  bands(
    x: number,
    y: number,
    w: number,
    h: number,
    colours: Array<string>,
    raw = false,
  ) {
    const n = colours.length - 1
    const cs = raw ? colours : colours.map(this.lit)
    for (let j = 0; j < h; j++) {
      const t = (j / Math.max(1, h - 1)) * n
      const i = Math.min(n - 1, Math.floor(t))
      const f = t - i
      for (let k = 0; k < w; k++) {
        this.g.fillStyle = f > bayer(x + k, y + j) ? cs[i + 1] : cs[i]
        this.g.fillRect(x + k, y + j, 1, 1)
      }
    }
  }

  // A soft round glow, dithered thinner towards its edge (not lit)
  glow(cx: number, cy: number, r: number, c: string, strength = 0.6) {
    this.g.fillStyle = c
    const x0 = Math.floor(cx - r)
    const y0 = Math.floor(cy - r)
    for (let y = y0; y <= cy + r; y++)
      for (let x = x0; x <= cx + r; x++) {
        const d = Math.hypot(x - cx, (y - cy) * 1.15) / r
        if (d >= 1) continue
        if (bayer(x, y) < strength * (1 - d) ** 1.6) this.g.fillRect(x, y, 1, 1)
      }
  }

  // Light added to what is there, in a few steps that fall off from the
  // middle, dithered between them (not lit: it is light)
  light(
    cx: number,
    cy: number,
    r: number,
    rgb: [number, number, number],
    strength = 1,
  ) {
    if (strength <= 0) return
    const g = this.g
    const was = g.globalCompositeOperation
    g.globalCompositeOperation = 'lighter'
    const [cr, cg, cb] = rgb
    // one colour for each step of light, made once
    const steps = [1, 2, 3, 4].map((k) => {
      const a = (k / 4) * 0.42
      return `rgb(${Math.round(cr * a)},${Math.round(cg * a)},${Math.round(cb * a)})`
    })
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.1) / r
        if (d >= 1) continue
        const lv = Math.floor(strength * (1 - d) ** 2 * 4 + bayer(x, y))
        if (lv <= 0) continue
        g.fillStyle = steps[Math.min(4, lv) - 1]
        g.fillRect(x, y, 1, 1)
      }
    g.globalCompositeOperation = was
  }

  // A sprite from rows of letters; '.' is clear
  sprite(
    rows: Array<string>,
    pal: Record<string, string>,
    x: number,
    y: number,
    flip = false,
  ) {
    const w = rows[0].length
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = pal[row[i]] as string | undefined
        if (row[i] === '.' || !c) continue
        this.g.fillStyle = this.lit(c)
        this.g.fillRect(
          Math.round(x + (flip ? w - 1 - i : i)),
          Math.round(y + j),
          1,
          1,
        )
      }
    })
  }
}
