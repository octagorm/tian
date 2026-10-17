import { blip } from '../lib/audio'

// A celebration over the whole page, for a goal reached or a chapter won:
// pixel fireworks bursting over red paper confetti, with a gong. Call
// celebrate() from anywhere; a call while one is showing adds to it. It
// draws on a canvas of big pixels laid over the page (clicks go through)
// and removes itself when done. With reduced motion it is one still
// frame, faded in and out.

interface Spark {
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  // Gold willow sparks fall more and last longer
  heavy: boolean
  // Ends in a few white pops
  crackle: boolean
}

interface Rocket {
  x: number
  y: number
  from: number
  to: number
  at: number
  t: number
  burst: Burst
}

interface Paper {
  x: number
  y: number
  vy: number
  sway: number
  swayRate: number
  phase: number
  flip: number
  flipRate: number
  w: number
  h: number
  front: string
  back: string
  blossom: boolean
}

type Burst = 'peony' | 'ring' | 'willow'

interface Show {
  canvas: HTMLCanvasElement
  g: CanvasRenderingContext2D
  w: number
  h: number
  sparks: Array<Spark>
  rockets: Array<Rocket>
  papers: Array<Paper>
  t: number
  last: number
  raf: number
  still: boolean
}

const PALETTES: Array<[string, string]> = [
  ['#ffd65a', '#ff8a3c'],
  ['#ff4a3a', '#ffd65a'],
  ['#ff7aa8', '#fff3d6'],
  ['#5fe0b0', '#ffd65a'],
  ['#fff3d6', '#9fd8ff'],
]

const PAPERS: Array<[string, string]> = [
  ['#d8392b', '#8f1f16'],
  ['#d8392b', '#8f1f16'],
  ['#e0473a', '#a3281d'],
  ['#e8b34a', '#a77a1f'],
]

// A blossom cut from red paper, 3 × 3
const BLOSSOM = ['.R.', 'RWR', '.R.']

let show: Show | null = null

export interface Celebration {
  // Fireworks, 0 for none (default 5)
  bursts?: number
  // Pieces of confetti (default 90)
  confetti?: number
  sound?: boolean
}

export function celebrate({
  bursts = 5,
  confetti = 90,
  sound = true,
}: Celebration = {}) {
  if (typeof window === 'undefined') return
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const s = show ?? open(still)
  if (!s) return
  if (sound) blip(bursts ? 'gong' : 'win')
  for (let i = 0; i < bursts; i++)
    launch(s, s.t + 0.15 + i * 0.38 + Math.random() * 0.2)
  for (let i = 0; i < confetti; i++) drop(s, i / confetti)
  if (s.still) {
    // One frame: the bursts at their fullest, the paper in mid-air
    for (const r of s.rockets) explode(s, r.x, r.to, r.burst, 0.5)
    s.rockets = []
    for (const p of s.papers) p.y = Math.random() * s.h * 0.75
    draw(s, false)
    setTimeout(() => close(s), 1600)
  }
}

function open(still: boolean): Show | null {
  const canvas = document.createElement('canvas')
  const g = canvas.getContext('2d')
  if (!g) return null
  const px = window.innerWidth >= 900 ? 4 : 3
  const w = Math.ceil(window.innerWidth / px)
  const h = Math.ceil(window.innerHeight / px)
  canvas.width = w
  canvas.height = h
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${w * px}px`,
    height: `${h * px}px`,
    pointerEvents: 'none',
    zIndex: '80',
    imageRendering: 'pixelated',
    transition: 'opacity 0.6s ease',
    opacity: still ? '0' : '1',
  })
  document.body.appendChild(canvas)
  const s: Show = {
    canvas,
    g,
    w,
    h,
    sparks: [],
    rockets: [],
    papers: [],
    t: 0,
    last: performance.now(),
    raf: 0,
    still,
  }
  show = s
  if (still) requestAnimationFrame(() => (canvas.style.opacity = '1'))
  else s.raf = requestAnimationFrame((now) => frame(s, now))
  return s
}

function close(s: Show) {
  cancelAnimationFrame(s.raf)
  s.canvas.style.opacity = '0'
  if (show === s) show = null
  setTimeout(() => s.canvas.remove(), 700)
}

const pick = <T>(xs: Array<T>): T => xs[Math.floor(Math.random() * xs.length)]

function launch(s: Show, at: number) {
  const x = s.w * (0.15 + Math.random() * 0.7)
  s.rockets.push({
    x,
    y: s.h + 2,
    from: s.h + 2,
    to: s.h * (0.14 + Math.random() * 0.3),
    at,
    t: 0.75 + Math.random() * 0.25,
    burst: pick<Burst>(['peony', 'peony', 'ring', 'willow']),
  })
}

function explode(s: Show, x: number, y: number, kind: Burst, age = 0) {
  const [a, b] =
    kind === 'willow' ? (['#ffd65a', '#ffb347'] as const) : pick(PALETTES)
  const n = kind === 'ring' ? 36 : 54
  const speed = Math.min(s.w, s.h) * (kind === 'willow' ? 0.32 : 0.42)
  for (let i = 0; i < n; i++) {
    const angle =
      kind === 'ring' ? (i / n) * Math.PI * 2 : Math.random() * Math.PI * 2
    const v =
      speed *
      (kind === 'ring'
        ? 0.92 + Math.random() * 0.08
        : 0.35 + Math.random() * 0.65)
    const max =
      kind === 'willow' ? 1.9 + Math.random() * 0.5 : 1.1 + Math.random() * 0.6
    const sp: Spark = {
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: max,
      max,
      color: i % 3 === 0 ? b : a,
      heavy: kind === 'willow',
      crackle: kind === 'peony' && Math.random() < 0.25,
    }
    if (age) {
      // Placed where it would be partway through its flight
      const k = 1 - Math.exp(-1.7 * age)
      sp.x += (sp.vx / 1.7) * k
      sp.y += (sp.vy / 1.7) * k + 9 * age * age
      sp.px = sp.x
      sp.py = sp.y
      sp.life = max * (1 - age * 0.6)
    }
    s.sparks.push(sp)
  }
}

function drop(s: Show, k: number) {
  const [front, back] = pick(PAPERS)
  const blossom = Math.random() < 0.1
  s.papers.push({
    x: Math.random() * s.w,
    // Staggered above the top, so they arrive over a second or two
    y: -4 - k * s.h * 0.45 - Math.random() * 10,
    vy: s.h * (0.16 + Math.random() * 0.1),
    sway: 2 + Math.random() * 5,
    swayRate: 1.2 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
    flip: Math.random() * Math.PI * 2,
    flipRate: 4 + Math.random() * 7,
    w: blossom ? 3 : 2 + Math.floor(Math.random() * 2),
    h: blossom ? 3 : 2 + Math.floor(Math.random() * 2),
    front,
    back,
    blossom,
  })
}

function frame(s: Show, now: number) {
  const dt = Math.min(0.05, (now - s.last) / 1000)
  s.last = now
  s.t += dt
  step(s, dt)
  draw(s, true)
  const busy =
    s.rockets.length || s.sparks.length || s.papers.some((p) => p.y < s.h + 6)
  if (busy && s.t < 12) s.raf = requestAnimationFrame((n) => frame(s, n))
  else close(s)
}

function step(s: Show, dt: number) {
  for (const r of s.rockets) {
    if (s.t < r.at) continue
    const k = Math.min(1, (s.t - r.at) / r.t)
    // Slowing as it climbs
    r.y = r.from + (r.to - r.from) * (1 - (1 - k) ** 2.2)
    if (k >= 1) {
      explode(s, r.x, r.y, r.burst)
      if (s.sparks.length < 600) blip('pop')
      r.at = -1
    } else if (Math.random() < 0.8) {
      s.sparks.push({
        x: r.x + (Math.random() - 0.5),
        y: r.y + 2,
        px: r.x,
        py: r.y + 2,
        vx: 0,
        vy: 6,
        life: 0.35,
        max: 0.35,
        color: '#ffcf7a',
        heavy: false,
        crackle: false,
      })
    }
  }
  s.rockets = s.rockets.filter((r) => r.at >= 0)
  const born: Array<Spark> = []
  for (const p of s.sparks) {
    p.px = p.x
    p.py = p.y
    const drag = Math.exp(-(p.heavy ? 2.2 : 1.7) * dt)
    p.vx *= drag
    p.vy = p.vy * drag + (p.heavy ? 26 : 16) * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
    if (p.life <= 0 && p.crackle)
      for (let i = 0; i < 2; i++)
        born.push({
          x: p.x + (Math.random() - 0.5) * 4,
          y: p.y + (Math.random() - 0.5) * 4,
          px: p.x,
          py: p.y,
          vx: 0,
          vy: 0,
          life: 0.12 + Math.random() * 0.1,
          max: 0.2,
          color: '#fffbea',
          heavy: false,
          crackle: false,
        })
  }
  s.sparks = s.sparks.filter((p) => p.life > 0).concat(born)
  for (const p of s.papers) {
    if (p.y > s.h + 6) continue
    p.y += p.vy * dt
    p.phase += p.swayRate * dt
    p.flip += p.flipRate * dt
  }
}

function draw(s: Show, moving: boolean) {
  const { g } = s
  g.clearRect(0, 0, s.w, s.h)
  for (const p of s.papers) {
    if (p.y > s.h + 6 || p.y < -8) continue
    const x = Math.round(p.x + Math.sin(p.phase) * p.sway)
    const y = Math.round(p.y)
    const c = Math.cos(p.flip)
    if (p.blossom) {
      // Squashed as it turns over
      const rows = Math.max(1, Math.round(3 * Math.abs(c)))
      for (let r = 0; r < rows; r++) {
        const src = BLOSSOM[Math.floor((r / rows) * 3)]
        for (let i = 0; i < 3; i++) {
          if (src[i] === '.') continue
          g.fillStyle = src[i] === 'W' ? '#fff2dc' : c > 0 ? p.front : p.back
          g.fillRect(x + i, y + r, 1, 1)
        }
      }
      continue
    }
    g.fillStyle = c > 0 ? p.front : p.back
    g.fillRect(x, y, Math.max(1, Math.round(p.w * Math.abs(c))), p.h)
  }
  for (const r of s.rockets) {
    if (s.t < r.at) continue
    g.fillStyle = '#fff3d6'
    g.fillRect(Math.round(r.x), Math.round(r.y), 1, 2)
  }
  for (const p of s.sparks) {
    const k = p.life / p.max
    // Flickering out at the end
    if (moving && k < 0.25 && Math.random() < 0.4) continue
    g.globalAlpha = Math.min(1, 0.25 + k)
    g.fillStyle = p.color
    g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
    if (moving && k > 0.3) {
      g.globalAlpha = 0.35 * k
      g.fillRect(Math.round(p.px), Math.round(p.py), 1, 1)
    }
  }
  g.globalAlpha = 1
}
