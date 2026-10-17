import { festival, moon, periods, season, weightOf } from './sky'
import type { Festival, Period, Season } from './sky'

// The living scene at the top of the home screen: a pavilion on a peak
// above a sea of clouds, painted for dawn, day, dusk and night (pixel art,
// 320 × 180, in public/art/shell/), shown as the player's own
// clock says and crossfaded around sunrise and sunset. On it, drawn in
// the same big pixels: mist drifting over the clouds, birds crossing, the
// lanterns' light breathing, stars, the moon in its real phase, and the
// season's falling leaves, petals or snow; fireworks or sky lanterns at
// festivals.
//
// It draws at the picture's own resolution and lets the browser scale the
// canvas up unsmoothed, a whole number of screen pixels to a pixel. It
// stops when off screen or hidden, and with reduced motion draws a still
// frame every half minute.

const W = 320
const H = 180
const ART = '/art/shell/hero-'

// Where the lanterns hang under the eaves, and the warm floor between
const LANTERNS: Array<[number, number]> = [
  [186.5, 72.5],
  [234.5, 72.5],
]
const FLOOR: [number, number] = [211, 88]

// Mist bands: top row, speed (pixels a second), strength, and how far
// across the picture they reach, fading out before the near cliff on the
// right (0: all the way)
const BANDS: Array<[number, number, number, number]> = [
  [80, 2.2, 0.55, 170],
  [106, -1.5, 0.6, 155],
  [140, 1.1, 0.4, 0],
]

// The rows of the picture where there is sky, for stars and the moon
const SKY_ROWS = 72

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16,
)
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)]

export interface SceneOptions {
  // The point to keep in view when the picture is cropped, 0–1 of its
  // width and height
  focusX?: number
  focusY?: number
  // The clock to draw by, for trying other times (see clockFromUrl)
  clock?: () => Date
  // Boxes on the page the moon should not hide behind, such as a title
  // laid over the scene
  clear?: () => Array<DOMRect>
}

interface Bird {
  x: number
  y: number
  vx: number
  flap: number
  rate: number
}

interface Mote {
  x: number
  y: number
  vx: number
  vy: number
  phase: number
  rate: number
  amp: number
  c: number
  size: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
}

interface SkyLantern {
  x: number
  y: number
  vy: number
  phase: number
}

// Value noise, for the mist
function makeNoise(seed: number) {
  const N = 64
  const grid = new Float32Array(N * N)
  let s = seed
  for (let i = 0; i < grid.length; i++) {
    s = (s * 16807) % 2147483647
    grid[i] = s / 2147483647
  }
  const at = (x: number, y: number) => grid[(y & (N - 1)) * N + (x & (N - 1))]
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const one = (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const tx = smooth(x - xi)
    const ty = smooth(y - yi)
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * tx
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * tx
    return a + (b - a) * ty
  }
  return (x: number, y: number) =>
    one(x, y) * 0.55 +
    one(x * 2.1, y * 2.1) * 0.3 +
    one(x * 4.3, y * 4.3) * 0.15
}

const hex = (c: string): [number, number, number] => {
  const n = parseInt(c.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
const toHex = (c: Array<number>) =>
  `#${c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
const mix = (a: string, b: string, k: number) => {
  const y = hex(b)
  return toHex(hex(a).map((v, i) => v + (y[i] - v) * k))
}
const dim = (c: string, k: number) => toHex(hex(c).map((v) => v * k))

// The mist's colour at each time of day
const MIST: Record<Period, string> = {
  day: '#f6f8fd',
  dawn: '#fde3e6',
  dusk: '#f8c6b8',
  night: '#aebbe2',
}
// How brightly things in the scene are lit
const LIGHT: Record<Period, number> = {
  day: 1,
  dawn: 0.85,
  dusk: 0.72,
  night: 0.5,
}
const BIRD: Record<Period, string> = {
  day: '#3a4660',
  dawn: '#4a3550',
  dusk: '#2a1a28',
  night: '#141a30',
}

const SEASON_COLOURS: Record<Season, Array<string>> = {
  autumn: ['#d8572a', '#e8902f', '#c23a2c', '#e7b54a', '#b8452a'],
  spring: ['#f6b9cb', '#ffd9e4', '#fff1f5', '#f29bb5'],
  winter: ['#ffffff', '#eef4fb', '#dfe9f6'],
  summer: ['#fff6c8', '#f4f9dc'],
}

export function runScene(
  canvas: HTMLCanvasElement,
  {
    focusX = 0.62,
    focusY = 0.41,
    clock = () => new Date(),
    clear,
  }: SceneOptions = {},
): () => void {
  const context = canvas.getContext('2d')
  if (!context) return () => {}
  const g = context
  const box = canvas.parentElement ?? canvas
  const still = window.matchMedia('(prefers-reduced-motion: reduce)')
  const images: Partial<Record<Period, HTMLImageElement>> = {}
  const loading = new Set<Period>()
  let cw = W
  let ch = H
  let ox = 0
  let oy = 0
  let visible = true
  let raf = 0
  let last = 0
  let t = 0
  let weights: Array<[Period, number]> = periods(clock())
  let light = 1
  let mistColour = ''
  let birdColour = BIRD.day
  let night = 0
  let lit = 0
  let moonPhase = -1
  let moonLit: HTMLCanvasElement | null = null
  let moonDark: HTMLCanvasElement | null = null
  let moonAt: [number, number] | null = null
  let skyMask: Uint8Array | null = null
  let stars: Array<[number, number, number, number]> = []
  let mist: HTMLCanvasElement | null = null
  // Where each band of mist is drawn before its edge is faded
  const layer = document.createElement('canvas')
  const lg = layer.getContext('2d')
  const birds: Array<Bird> = []
  let nextFlock = 4
  let motes: Array<Mote> = []
  let shooting: {
    x: number
    y: number
    vx: number
    vy: number
    life: number
  } | null = null
  let nextShooting = 8
  const sparks: Array<Spark> = []
  let nextFirework = 2
  const skyLanterns: Array<SkyLantern> = []
  let fest: Festival | null = null
  let seas: Season = season(clock())
  const noise = makeNoise(7)
  let gone = false

  // --- Pictures ---

  function want(p: Period) {
    if (images[p] || loading.has(p)) return
    loading.add(p)
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      images[p] = img
      loading.delete(p)
      if (gone) return
      findStars()
      draw()
    }
    img.onerror = () => loading.delete(p)
    img.src = `${ART}${p}.png`
  }

  const read = (img: HTMLImageElement) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = SKY_ROWS
    const cg = c.getContext('2d', { willReadFrequently: true })
    if (!cg) return null
    cg.drawImage(img, 0, 0)
    return cg.getImageData(0, 0, W, SKY_ROWS).data
  }

  // Where the sky is open, from the day picture: clear blue
  function findSky() {
    if (skyMask || !images.day) return
    const a = read(images.day)
    if (!a) return
    const mask = new Uint8Array(W * SKY_ROWS)
    for (let i = 0; i < mask.length; i++)
      mask[i] = a[i * 4 + 2] > 195 && a[i * 4 + 2] - a[i * 4] > 70 ? 1 : 0
    skyMask = mask
    placeMoon()
  }

  // Stars where the sky is open and dark at night, and so all round
  function findStars() {
    findSky()
    const mask = skyMask
    if (!mask || !images.night || stars.length) return
    const b = read(images.night)
    if (!b) return
    const sky = (x: number, y: number) => {
      const i = y * W + x
      return mask[i] === 1 && (b[i * 4] + b[i * 4 + 1] + b[i * 4 + 2]) / 3 < 66
    }
    const found: Array<[number, number, number, number]> = []
    let s = 11
    for (let tries = 0; tries < 1500 && found.length < 70; tries++) {
      s = (s * 16807) % 2147483647
      const x = 1 + (s % (W - 2))
      s = (s * 16807) % 2147483647
      const y = 1 + (s % 66)
      if (
        sky(x, y) &&
        sky(x - 1, y) &&
        sky(x + 1, y) &&
        sky(x, y - 1) &&
        sky(x, y + 1) &&
        sky(x, y + 4)
      )
        found.push([x, y, (s % 1000) / 1000, 0.6 + ((s >> 3) % 100) / 70])
    }
    stars = found
  }

  // A place for the moon: open sky all round it, high up, and clear of
  // the page's own things laid over the scene
  function placeMoon() {
    const mask = skyMask
    moonAt = null
    if (!mask) return
    const rect = canvas.getBoundingClientRect()
    const k = rect.width / cw || 1
    const avoid = (clear?.() ?? []).map((r) => ({
      x0: (r.left - rect.left) / k - 4,
      x1: (r.right - rect.left) / k + 4,
      y0: (r.top - rect.top) / k - 4,
      y1: (r.bottom - rect.top) / k + 4,
    }))
    const R = 9
    let best = Infinity
    for (let y = 8; y <= Math.min(46, ch - 12); y += 2)
      for (let x = 10; x <= cw - 10; x += 3) {
        if (
          avoid.some(
            (a) => x + R > a.x0 && x - R < a.x1 && y + R > a.y0 && y - R < a.y1,
          )
        )
          continue
        // Sky at the centre and nearly all round (a wisp of cloud is
        // fine; a peak is not)
        let n = 0
        let sky = 0
        let inside = true
        for (let dy = -R; dy <= R && inside; dy += 3)
          for (let dx = -R; dx <= R && inside; dx += 3) {
            if (dx * dx + dy * dy > R * R) continue
            const sx = x + ox + dx
            const sy = y + oy + dy
            if (sx < 0 || sx >= W || sy < 0 || sy >= SKY_ROWS) inside = false
            else {
              n++
              sky += mask[sy * W + sx]
            }
          }
        if (!inside || !mask[(y + oy) * W + x + ox] || sky < n * 0.8) continue
        // High up, and not far from the middle of the open sky
        const score = y + Math.abs(x - cw * 0.45) * 0.12
        if (score < best) {
          best = score
          moonAt = [x, y]
        }
      }
  }

  // --- Things made once ---

  // A band of mist, twice the picture's width so it can scroll round:
  // soft noise, in a few steps of thickness, as a painter would dither it
  function makeMist() {
    const mw = W * 2
    const mh = 48
    const c = document.createElement('canvas')
    c.width = mw
    c.height = mh
    const cg = c.getContext('2d')
    if (!cg) return null
    const img = cg.createImageData(mw, mh)
    const [r, gg, b] = hex(mistColour)
    for (let y = 0; y < mh; y++) {
      // Thickest in the middle of the band
      const fall = Math.sin((y / (mh - 1)) * Math.PI) ** 1.5
      for (let x = 0; x < mw; x++) {
        // Seamless across the wrap: the two ends blended
        const u = x / mw
        const n =
          noise(x / 30, y / 8) * (1 - u) + noise((x - mw) / 30, y / 8) * u
        const density = Math.max(0, (n - 0.36) * 2.2 * fall)
        // Four steps, with a dither between them
        const level = Math.min(3, Math.floor(density * 4 + bayer(x, y)))
        if (level <= 0) continue
        const i = (y * mw + x) * 4
        img.data[i] = r
        img.data[i + 1] = gg
        img.data[i + 2] = b
        img.data[i + 3] = [0, 70, 125, 175][level]
      }
    }
    cg.putImageData(img, 0, 0)
    return c
  }

  // The moon in its phase: the lit face, and apart from it the dark
  // face, which shows faintly at night
  function makeMoon() {
    const r = 7
    const size = r * 2 + 1
    const make = () => {
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      return c
    }
    const a = make()
    const b = make()
    const ag = a.getContext('2d')
    const bg = b.getContext('2d')
    if (!ag || !bg) return
    const waxing = moonPhase < 0.5
    const edge = Math.cos(2 * Math.PI * (waxing ? moonPhase : moonPhase - 0.5))
    const maria = new Set([
      '-2,-2',
      '-1,-2',
      '-2,-1',
      '2,1',
      '3,1',
      '2,2',
      '-1,3',
      '0,3',
    ])
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        if (Math.hypot(x, y) > r + 0.3) continue
        const half = Math.sqrt(Math.max(0, r * r - y * y)) || 1
        const xn = x / half
        const on = waxing ? xn > edge : xn < edge
        const cg = on ? ag : bg
        cg.fillStyle = on
          ? maria.has(`${x},${y}`)
            ? '#d9cfae'
            : '#f6efd6'
          : '#4a5680'
        cg.fillRect(r + x, r + y, 1, 1)
      }
    moonLit = a
    moonDark = b
  }

  // --- The clock ---

  function tick() {
    const now = clock()
    weights = periods(now)
    const ws = weights
    light = ws.reduce((s, [p, w]) => s + LIGHT[p] * w, 0)
    const blend = (table: Record<Period, string>) =>
      ws.length > 1
        ? mix(table[ws[0][0]], table[ws[1][0]], ws[1][1])
        : table[ws[0][0]]
    const oldMist = mistColour
    mistColour = blend(MIST)
    birdColour = blend(BIRD)
    night =
      weightOf(ws, 'night') +
      weightOf(ws, 'dusk') * 0.35 +
      weightOf(ws, 'dawn') * 0.2
    const m = moon(now)
    if (Math.abs(m.phase - moonPhase) > 0.004) {
      moonPhase = m.phase
      lit = m.lit
      makeMoon()
    }
    const s = season(now)
    if (s !== seas || !motes.length) {
      seas = s
      motes = []
      seedMotes()
    }
    fest = festival(now)
    for (const [p] of ws) want(p)
    // The day picture tells where the open sky is, for the stars
    if (night > 0.05) want('day')
    if (!mist || mistColour !== oldMist) mist = makeMist()
  }

  // --- The season's particles ---

  function seedMotes() {
    const n = seas === 'winter' ? 46 : seas === 'summer' ? 12 : 18
    for (let i = 0; i < n; i++) motes.push(newMote(true))
  }

  function newMote(anywhere: boolean): Mote {
    const colours = SEASON_COLOURS[seas]
    const snow = seas === 'winter'
    const fire = seas === 'summer'
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -3,
      vx: snow ? -1.5 + Math.random() : fire ? 0 : -6 - Math.random() * 7,
      vy: snow ? 5 + Math.random() * 7 : fire ? 0 : 7 + Math.random() * 6,
      phase: Math.random() * 6.28,
      rate: 0.8 + Math.random() * 1.6,
      amp: snow ? 3 : fire ? 6 : 8 + Math.random() * 6,
      c: Math.floor(Math.random() * colours.length),
      size: snow && Math.random() < 0.25 ? 2 : 1,
    }
  }

  // --- Each frame ---

  function step(dt: number) {
    t += dt
    // A flock now and then, by day and at either end of it
    if (t > nextFlock) {
      nextFlock = t + 22 + Math.random() * 40
      if (weightOf(weights, 'night') < 0.5) {
        const n = 3 + Math.floor(Math.random() * 4)
        const fromLeft = Math.random() < 0.6
        const y0 = oy + 8 + Math.random() * Math.min(26, ch * 0.3)
        for (let i = 0; i < n; i++)
          birds.push({
            x: fromLeft ? ox - 8 - i * 7 : ox + cw + 8 + i * 7,
            y: y0 + Math.abs(i - n / 2) * 2.5 + Math.random() * 2,
            vx: (fromLeft ? 1 : -1) * (11 + Math.random() * 2),
            flap: Math.random() * 6,
            rate: 6 + Math.random() * 3,
          })
      }
    }
    for (const b of birds) {
      b.x += b.vx * dt
      b.flap += b.rate * dt
      b.y += Math.sin(b.flap * 0.3) * 0.04
    }
    for (let i = birds.length - 1; i >= 0; i--)
      if (birds[i].x < ox - 60 || birds[i].x > ox + cw + 60) birds.splice(i, 1)
    for (const m of motes) {
      m.phase += m.rate * dt
      if (seas === 'summer') {
        // Fireflies wander; by day, seeds drift on the air
        m.x += Math.cos(m.phase * 0.7) * 3 * dt + (night > 0.5 ? 0 : 2 * dt)
        m.y += Math.sin(m.phase * 0.9) * 2 * dt
        if (m.x > W + 2) m.x = -2
        if (m.y < 30 || m.y > H - 4) m.y = 60 + Math.random() * 90
        continue
      }
      m.x += m.vx * dt
      m.y += m.vy * dt
      if (m.y > H + 3 || m.x < -10 || m.x > W + 10)
        Object.assign(m, newMote(false))
    }
    if (night > 0.6) {
      if (!shooting && t > nextShooting) {
        nextShooting = t + 20 + Math.random() * 40
        shooting = {
          x: ox + Math.random() * cw * 0.7,
          y: oy + 3 + Math.random() * 16,
          vx: 70 + Math.random() * 40,
          vy: 18 + Math.random() * 10,
          life: 0.55,
        }
      }
      if (shooting) {
        shooting.x += shooting.vx * dt
        shooting.y += shooting.vy * dt
        shooting.life -= dt
        if (shooting.life <= 0) shooting = null
      }
    }
    // Fireworks at the Spring Festival, sky lanterns at the Lantern and
    // Mid-Autumn festivals, after dark
    if (fest && night > 0.5) {
      if (fest.id === 'spring' && t > nextFirework) {
        nextFirework = t + 1.5 + Math.random() * 3
        burst(
          ox + cw * (0.2 + Math.random() * 0.6),
          oy + 8 + Math.random() * 24,
        )
      }
      if (
        fest.id !== 'spring' &&
        skyLanterns.length < 9 &&
        Math.random() < dt * 0.5
      )
        skyLanterns.push({
          x: 20 + Math.random() * (W - 40),
          y: H + 4,
          vy: 3 + Math.random() * 3,
          phase: Math.random() * 6,
        })
    }
    for (const p of sparks) {
      p.vx *= Math.exp(-1.8 * dt)
      p.vy = p.vy * Math.exp(-1.8 * dt) + 10 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    for (let i = sparks.length - 1; i >= 0; i--)
      if (sparks[i].life <= 0) sparks.splice(i, 1)
    for (const l of skyLanterns) {
      l.y -= l.vy * dt
      l.phase += dt
      l.x += Math.sin(l.phase * 0.6) * 1.2 * dt
    }
    for (let i = skyLanterns.length - 1; i >= 0; i--)
      if (skyLanterns[i].y < -6) skyLanterns.splice(i, 1)
  }

  function burst(x: number, y: number) {
    const colours = [
      ['#ffd65a', '#ff8a3c'],
      ['#ff5a4a', '#ffd65a'],
      ['#ff8ab0', '#fff3d6'],
    ][Math.floor(Math.random() * 3)]
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 10 + Math.random() * 16
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1 + Math.random() * 0.6,
        max: 1.6,
        color: colours[i % 2],
      })
    }
  }

  function draw() {
    g.imageSmoothingEnabled = false
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    // The pictures, crossfading
    let drawn = false
    for (const [p, w] of weights) {
      const img = images[p]
      if (!img || w <= 0.002) continue
      g.globalAlpha = drawn ? w : 1
      g.drawImage(img, ox, oy, cw, ch, 0, 0, cw, ch)
      drawn = true
    }
    g.globalAlpha = 1
    if (!drawn) {
      // Until the picture has come: the sky's colours
      const grad = g.createLinearGradient(0, 0, 0, ch)
      grad.addColorStop(0, night > 0.5 ? '#0c1a47' : '#6f9be0')
      grad.addColorStop(1, night > 0.5 ? '#6f7fb5' : '#e9eef8')
      g.fillStyle = grad
      g.fillRect(0, 0, cw, ch)
      return
    }
    const X = (x: number) => Math.round(x - ox)
    const Y = (y: number) => Math.round(y - oy)
    const dark = weightOf(weights, 'night')
    // Stars
    if (night > 0.05) {
      for (const [x, y, ph, br] of stars) {
        const tw = still.matches
          ? 0.75
          : 0.55 + 0.45 * Math.sin(t * (1.2 + ph * 2.4) + ph * 40)
        const a = night * tw * Math.min(1, br)
        if (a < 0.08) continue
        g.globalAlpha = a
        g.fillStyle = ph > 0.8 ? '#cfe0ff' : '#fff6e0'
        g.fillRect(X(x), Y(y), 1, 1)
        if (br > 1.25 && tw > 0.9) {
          g.globalAlpha = a * 0.45
          g.fillRect(X(x) - 1, Y(y), 1, 1)
          g.fillRect(X(x) + 1, Y(y), 1, 1)
          g.fillRect(X(x), Y(y) - 1, 1, 1)
          g.fillRect(X(x), Y(y) + 1, 1, 1)
        }
      }
      g.globalAlpha = 1
    }
    // The moon, where placeMoon found open sky for it
    const moonAlpha =
      dark + weightOf(weights, 'dusk') * 0.5 + weightOf(weights, 'dawn') * 0.3
    if (moonLit && moonDark && moonAt && lit > 0.03 && moonAlpha > 0.05) {
      const c = moonLit.width / 2
      const mx = Math.round(moonAt[0] - c)
      const my = Math.round(moonAt[1] - c)
      if (dark > 0.05) {
        g.globalCompositeOperation = 'lighter'
        glow(
          mx + c - 0.5,
          my + c - 0.5,
          16,
          `rgba(120,140,210,${0.22 * dark * (0.3 + lit)})`,
        )
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = dark * 0.45
        g.drawImage(moonDark, mx, my)
      }
      g.globalAlpha = moonAlpha
      g.drawImage(moonLit, mx, my)
      g.globalAlpha = 1
    }
    if (shooting) {
      const s = shooting
      for (let i = 0; i < 7; i++) {
        g.globalAlpha = (1 - i / 7) * Math.min(1, s.life * 3)
        g.fillStyle = '#fffbe8'
        g.fillRect(X(s.x - s.vx * i * 0.012), Y(s.y - s.vy * i * 0.012), 1, 1)
      }
      g.globalAlpha = 1
    }
    // Fireworks and sky lanterns
    for (const p of sparks) {
      g.globalAlpha = Math.min(1, p.life / p.max + 0.2)
      g.fillStyle = p.color
      g.fillRect(X(p.x), Y(p.y), 1, 1)
    }
    g.globalAlpha = 1
    for (const l of skyLanterns) {
      const x = X(l.x)
      const y = Y(l.y)
      glow(x + 1, y + 1, 5, 'rgba(255,170,80,0.35)')
      g.fillStyle = '#ffb35c'
      g.fillRect(x, y, 2, 3)
      g.fillStyle = '#ffe2a0'
      g.fillRect(x, y + 2, 2, 1)
    }
    // Birds
    g.fillStyle = birdColour
    for (const b of birds) {
      const x = X(b.x)
      const y = Y(b.y)
      const up = Math.sin(b.flap) > 0
      g.fillRect(x, y, 1, 1)
      const wy = up ? -1 : 0
      g.fillRect(x - 1, y + wy, 1, 1)
      g.fillRect(x + 1, y + wy, 1, 1)
      g.fillRect(x - 2, y + wy * 2 + (up ? 0 : 1), 1, 1)
      g.fillRect(x + 2, y + wy * 2 + (up ? 0 : 1), 1, 1)
    }
    // Mist drifting over the sea of clouds, each band faded out towards
    // its right-hand reach so it never covers the near cliff
    if (mist && lg) {
      const m = mist
      if (layer.width !== cw) layer.width = cw
      if (layer.height !== m.height) layer.height = m.height
      for (const [top, speed, alpha, reach] of BANDS) {
        lg.globalCompositeOperation = 'source-over'
        lg.clearRect(0, 0, cw, m.height)
        const shift = (((t * speed) % m.width) + m.width) % m.width
        const x = Math.round(-shift - ox)
        lg.drawImage(m, x, 0)
        lg.drawImage(m, x + m.width, 0)
        if (reach > 0) {
          lg.globalCompositeOperation = 'destination-in'
          const fade = lg.createLinearGradient(
            reach - 45 - ox,
            0,
            reach - ox,
            0,
          )
          fade.addColorStop(0, 'rgba(0,0,0,1)')
          fade.addColorStop(1, 'rgba(0,0,0,0)')
          lg.fillStyle = fade
          lg.fillRect(0, 0, cw, m.height)
        }
        g.globalAlpha = alpha
        g.drawImage(layer, 0, top - oy)
      }
      g.globalAlpha = 1
    }
    // The lanterns' light, breathing, from dusk to dawn
    const warm =
      dark + weightOf(weights, 'dusk') * 0.9 + weightOf(weights, 'dawn') * 0.4
    if (warm > 0.05) {
      g.globalCompositeOperation = 'lighter'
      LANTERNS.forEach(([x, y], i) => {
        const f = still.matches
          ? 0.85
          : 0.78 +
            0.14 * Math.sin(t * 2.3 + i * 2) +
            0.08 * Math.sin(t * 7.1 + i)
        glow(X(x), Y(y), 9, `rgba(255,150,60,${0.32 * warm * f})`)
        glow(X(x), Y(y), 3, `rgba(255,214,140,${0.45 * warm * f})`)
      })
      glow(X(FLOOR[0]), Y(FLOOR[1]), 14, `rgba(255,150,70,${0.1 * warm})`)
      g.globalCompositeOperation = 'source-over'
    }
    // The season, falling
    const colours = SEASON_COLOURS[seas]
    for (const m of motes) {
      if (seas === 'summer') {
        if (night > 0.5) {
          // Fireflies, blinking
          if (!still.matches && Math.sin(m.phase * 1.7) < 0.2) continue
          g.globalCompositeOperation = 'lighter'
          glow(X(m.x), Y(m.y), 3, 'rgba(200,255,120,0.35)')
          g.globalCompositeOperation = 'source-over'
          g.fillStyle = '#e4ff9a'
        } else {
          g.globalAlpha = 0.7
          g.fillStyle = colours[m.c]
        }
        g.fillRect(X(m.x), Y(m.y), 1, 1)
        g.globalAlpha = 1
        continue
      }
      const x = X(m.x + Math.sin(m.phase) * m.amp)
      const y = Y(m.y)
      g.fillStyle = dim(colours[m.c], Math.max(0.45, light))
      if (seas === 'winter') g.fillRect(x, y, m.size, m.size)
      else {
        // A leaf or petal turning: flat, then edge on
        const wide = Math.cos(m.phase * 2.2) > -0.2
        g.fillRect(x, y, wide ? 2 : 1, 1)
      }
    }
  }

  function glow(x: number, y: number, r: number, colour: string) {
    const grad = g.createRadialGradient(
      x + 0.5,
      y + 0.5,
      0,
      x + 0.5,
      y + 0.5,
      r,
    )
    grad.addColorStop(0, colour)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2 + 1, r * 2 + 1)
  }

  // --- Size ---

  function resize() {
    const rect = box.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    // A whole number of screen pixels to a picture pixel, covering the box,
    // unless that would crop much more of the picture than an uneven one
    const exact = Math.max(rect.width / W, rect.height / H)
    const whole = Math.max(1, Math.ceil(exact - 0.02))
    const scale = whole / exact > 1.2 ? exact : whole
    cw = Math.min(W, Math.ceil(rect.width / scale))
    ch = Math.min(H, Math.ceil(rect.height / scale))
    ox = Math.round(Math.max(0, Math.min(W - cw, focusX * W - cw / 2)))
    oy = Math.round(Math.max(0, Math.min(H - ch, focusY * H - ch / 2)))
    canvas.width = cw
    canvas.height = ch
    canvas.style.width = `${cw * scale}px`
    canvas.style.height = `${ch * scale}px`
    canvas.style.left = `${Math.round((rect.width - cw * scale) / 2)}px`
    canvas.style.top = `${Math.round((rect.height - ch * scale) / 2)}px`
    placeMoon()
    draw()
  }

  // --- Running ---

  function frame(now: number) {
    raf = 0
    if (!visible || document.hidden || still.matches) return
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
    // About thirty frames a second is plenty for pixels this big
    if (last && dt < 0.03) {
      raf = requestAnimationFrame(frame)
      return
    }
    last = now
    step(dt)
    draw()
    raf = requestAnimationFrame(frame)
  }

  function play() {
    if (raf || still.matches) return
    last = 0
    raf = requestAnimationFrame(frame)
  }

  tick()
  resize()
  const ticker = setInterval(() => {
    tick()
    placeMoon()
    if (still.matches) draw()
  }, 30_000)
  // The title over the scene changes size as its fonts come
  void document.fonts.ready.then(() => {
    if (gone) return
    placeMoon()
    draw()
  })
  const later = setTimeout(() => {
    for (const p of ['dawn', 'day', 'dusk', 'night'] as const) want(p)
  }, 2500)
  const ro = new ResizeObserver(resize)
  ro.observe(box)
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) play()
  })
  io.observe(canvas)
  const onVisibility = () => {
    if (!document.hidden) {
      tick()
      play()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)
  const onMotion = () => (still.matches ? draw() : play())
  still.addEventListener('change', onMotion)
  play()

  return () => {
    gone = true
    cancelAnimationFrame(raf)
    clearInterval(ticker)
    clearTimeout(later)
    ro.disconnect()
    io.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    still.removeEventListener('change', onMotion)
  }
}
