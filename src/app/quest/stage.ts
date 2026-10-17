import { PALETTE, SPRITES } from '../pixel/sprites'
import { canvas, ctx2d, loadPic, tinted } from './art'
import { drawText } from './font'
import { iconCanvas } from './icons'
import { sfx } from './sfx'
import type { Pic } from './art'
import type { Twist } from '../data/quest'

// The battle stage: the chapter's battlefield on a small canvas (320 × 160,
// or 240 × 160 on a narrow screen, so the fighters stay large), scaled up
// without smoothing, and everything on it that moves – breathing,
// lunges, squash and stretch, flashes, sparks, damage numbers, shake, the
// weather of each place and each demon's twist. Battle.tsx says what
// happens and waits on each action; the stage only draws. It runs on
// requestAnimationFrame while on screen, and keeps time without drawing
// while off it, so a fight never stalls.

export const STAGE_H = 160
const GROUND = 148
const BACK = GROUND - 7

export type Strike = 'cudgel' | 'eyes' | 'cloud'

export interface Cast {
  field: string
  // The demon's picture (and, for the White Bone Demon, her disguises)
  demon: string
  twist: Twist
  party: Array<'pig' | 'sand'>
  // Wukong arrives later, with a leap (he is under the mountain at first)
  late?: boolean
}

// --- Easing and tweens

type Ease = (x: number) => number
const linear: Ease = (x) => x
const inQuad: Ease = (x) => x * x
const outQuad: Ease = (x) => 1 - (1 - x) * (1 - x)
const inOut: Ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
const outBack: Ease = (x) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2

interface Tween {
  o: Record<string, number>
  k: string
  a: number
  b: number
  t: number
  d: number
  e: Ease
  done: Array<() => void>
}

// --- Actors

class Actor {
  pics: Record<string, Pic | null | undefined> = {}
  pose = 'idle'
  x = 0
  y = GROUND
  // Drawn mirrored (pictures face the way they were made: Wukong and the
  // monk right, demons left)
  flip = false
  ox = 0
  oy = 0
  sx = 1
  sy = 1
  // Turned about the feet, in radians (a fallen Wukong)
  rot = 0
  alpha = 1
  // Timers in ms
  flash = 0
  hurt = 0
  wobble = 0
  trail = 0
  // Breathing: how much, and how fast
  bob = 1
  rate = 1
  phase = Math.random() * 6
  visible = true
  frozen = false
  // Darker: the back row, or Wukong inside the cymbals
  shade = 0
  // A red glow before a demon strikes
  menace = 0
  ghosts: Array<{ x: number; y: number; a: number; pose: string }> = []
  get pic(): Pic | null {
    return this.pics[this.pose] ?? this.pics.idle ?? null
  }
  get h() {
    return this.pic?.h ?? 80
  }
  get w() {
    return this.pic?.w ?? 60
  }
}

// --- Particles and effects

type Kind =
  | 'dot'
  | 'streak'
  | 'rain'
  | 'petal'
  | 'blob'
  | 'bubble'
  | 'fly'
  | 'spark'
  | 'feather'
  | 'img'

interface Particle {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  ax: number
  ay: number
  life: number
  max: number
  c: string
  s: number
  front: boolean
  drag?: number
  sway?: number
  img?: CanvasImageSource
  fade?: boolean
  // How opaque at most
  o?: number
  seed: number
}

interface Fx {
  t: number
  d: number
  front: boolean
  draw: (g: CanvasRenderingContext2D, k: number) => void
}

interface Num {
  x: number
  y: number
  text: string
  c: string
  scale: number
  t: number
  d: number
  rise: number
}

// --- Each place: a light washed over the fighters, and its weather

type Weather =
  | 'motes'
  | 'embers'
  | 'sand'
  | 'rain'
  | 'petals'
  | 'fireflies'
  | 'mist'
  | 'smoke'
  | 'leaves'
  | 'sparkle'
  | 'feathers'

interface Place {
  light?: [string, number]
  weather: Array<[Weather, number, Array<string>]>
}

const PLACES: Record<string, Place | undefined> = {
  q1: {
    light: ['#ffb070', 0.1],
    weather: [['motes', 3, ['#fff1c0', '#ffd890']]],
  },
  q10: {
    light: ['#1c2350', 0.3],
    weather: [['fireflies', 1.5, ['#e8ff8a', '#c8f070']]],
  },
  q3: {
    light: ['#c89040', 0.18],
    weather: [
      ['sand', 45, ['#e8c878', '#d0a050', '#f4e0a0']],
      ['mist', 0.5, ['#d8b070']],
    ],
  },
  q11: {
    light: ['#3a4a66', 0.2],
    weather: [['rain', 55, ['#b8c8e0', '#8898b8']]],
  },
  q2: {
    light: ['#4a3a7a', 0.2],
    weather: [
      ['mist', 0.7, ['#c8c0e0']],
      ['motes', 1.5, ['#e8e8ff']],
    ],
  },
  q12: {
    light: ['#4a6a8a', 0.14],
    weather: [
      ['mist', 0.5, ['#d0e0f0']],
      ['leaves', 0.8, ['#6a8a4a', '#8aa05a']],
    ],
  },
  q4: {
    light: ['#ff5a20', 0.18],
    weather: [
      ['embers', 12, ['#ffb040', '#ff6a20', '#ffe080']],
      ['smoke', 0.5, ['#3a2020']],
    ],
  },
  q7: {
    light: ['#ff9ab0', 0.1],
    weather: [['petals', 5, ['#ffc8d8', '#ff9ab8', '#fff0f4']]],
  },
  q8: {
    light: ['#fff0b0', 0.06],
    weather: [
      ['sparkle', 2.5, ['#ffffff', '#c8f0ff']],
      ['leaves', 1, ['#7cc35a', '#e8a0b0']],
    ],
  },
  q6: {
    light: ['#ff4a10', 0.22],
    weather: [
      ['embers', 18, ['#ffb040', '#ff6a20', '#ffe080']],
      ['smoke', 0.7, ['#2a1010']],
    ],
  },
  q9: {
    light: ['#ffb040', 0.12],
    weather: [['sparkle', 2.5, ['#ffe080']]],
  },
  q5: {
    light: ['#2a7a7a', 0.2],
    weather: [
      ['motes', 3, ['#c0ffe8', '#ffffff']],
      ['mist', 0.5, ['#a0d0c0']],
    ],
  },
  q13: {
    light: ['#a01010', 0.18],
    weather: [
      ['embers', 6, ['#ff4020', '#ffa040']],
      ['feathers', 0.7, ['#f2c14e', '#4a3030']],
    ],
  },
}

// How each demon strikes
type Style =
  | 'lunge'
  | 'throw'
  | 'breath'
  | 'gust'
  | 'web'
  | 'charge'
  | 'swoop'
  | 'suck'
  | 'claw'
const STYLES: Record<string, Style | undefined> = {
  spirit: 'throw',
  bone: 'claw',
  marten: 'gust',
  redboy: 'breath',
  spider: 'web',
  bull: 'charge',
  roc: 'swoop',
  horn: 'suck',
}

// The White Bone Demon's three disguises, worn down a blow at a time
const DISGUISES = ['bone-girl', 'bone-granny', 'bone-grandpa']

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

// A soft round blob, dithered, for mist, smoke, glows and shadows
const blobs = new Map<string, HTMLCanvasElement>()
function blob(rx: number, ry: number, color: string, a: number) {
  const key = `${rx}|${ry}|${color}|${a}`
  const hit = blobs.get(key)
  if (hit) return hit
  const c = canvas(rx * 2 + 1, ry * 2 + 1)
  const g = ctx2d(c)
  g.fillStyle = color
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) {
      const d = Math.sqrt((x * x) / (rx * rx || 1) + (y * y) / (ry * ry || 1))
      if (d > 1) continue
      const amount = a * (1 - d * d)
      const cell = BAYER[(y + 64) % 4][(x + 64) % 4]
      if ((cell + 0.5) / 16 < amount) g.fillRect(x + rx, y + ry, 1, 1)
    }
  blobs.set(key, c)
  return c
}

// A filled ellipse with a crisp edge, for metal and cloud
const solids = new Map<string, HTMLCanvasElement>()
function solid(rx: number, ry: number, color: string) {
  const key = `${rx}|${ry}|${color}`
  const hit = solids.get(key)
  if (hit) return hit
  const c = canvas(rx * 2 + 1, ry * 2 + 1)
  const g = ctx2d(c)
  g.fillStyle = color
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(
      rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry || 1))) + 0.5,
    )
    g.fillRect(rx - half, y + ry, half * 2 + 1, 1)
  }
  solids.set(key, c)
  return c
}

// A soft cloud of mist or smoke: a few filled ellipses, one inside the
// other, each a little opaque, so the middle is thickest and the edge
// stays crisp
const softs = new Map<string, HTMLCanvasElement>()
function soft(rx: number, ry: number, color: string) {
  const key = `${rx}|${ry}|${color}`
  const hit = softs.get(key)
  if (hit) return hit
  const c = canvas(rx * 2 + 1, ry * 2 + 1)
  const g = ctx2d(c)
  g.globalAlpha = 0.34
  for (const f of [1, 0.72, 0.45])
    g.drawImage(
      solid(
        Math.max(1, Math.round(rx * f)),
        Math.max(1, Math.round(ry * f)),
        color,
      ),
      Math.round(rx - rx * f),
      Math.round(ry - ry * f),
    )
  softs.set(key, c)
  return c
}

// A 12 × 12 sprite of the shared set, on a canvas, for food and such
const minis = new Map<string, HTMLCanvasElement | null>()
function mini(name: string): HTMLCanvasElement | null {
  if (minis.has(name)) return minis.get(name) ?? null
  const sp = SPRITES[name]
  if (!sp) {
    minis.set(name, null)
    return null
  }
  const c = canvas(sp.rows[0].length, sp.rows.length)
  const g = ctx2d(c)
  sp.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = sp.pal?.[row[x]] ?? PALETTE[row[x]]
      if (row[x] === '.' || !col) continue
      g.fillStyle = col
      g.fillRect(x, y, 1, 1)
    }
  })
  minis.set(name, c)
  return c
}

export class Stage {
  W = 320
  private g: CanvasRenderingContext2D
  private field: Pic | null = null
  private cast: Cast | null = null
  private place: Place = { weather: [] }
  hero = new Actor()
  foe = new Actor()
  monk = new Actor()
  private mates: Array<{ id: 'pig' | 'sand'; a: Actor }> = []
  private parts: Array<Particle> = []
  private fxs: Array<Fx> = []
  private nums: Array<Num> = []
  private tweens: Array<Tween> = []
  private emit: Array<number> = []
  private t = 0
  private last = 0
  private raf = 0
  private timer = 0
  private running = false
  private visible = true
  private dead = false
  private shakeT = 0
  private shakeMag = 0
  private flashT = 0
  private flashD = 1
  private flashC = '#ffffff'
  private reduced: boolean
  twist: Twist = 'none'
  // Wukong rides the cloud
  private onCloud = false
  // Wukong under the cymbals, and how shut they are (0–1)
  private shut = 0
  private cymbalsGone = false
  poison = 0
  private tension = 0
  // The twist the Roc has borrowed this turn
  private rocTwist: Twist = 'none'
  private calmed = 0
  private giant = 0
  private talisman = 0
  private sparkSeed = 1
  // Hair clones, while they leap
  private extra: Array<Actor> = []

  constructor(c: HTMLCanvasElement, reduced: boolean) {
    this.g = ctx2d(c)
    this.reduced = reduced
  }

  // --- Setting up

  async setCast(cast: Cast) {
    this.cast = cast
    this.twist = cast.twist
    this.place = PLACES[cast.field] ?? { weather: [] }
    this.emit = this.place.weather.map(() => 0)
    const names = [
      cast.field,
      'wukong',
      'wukong-strike',
      'wukong-win',
      'monk-back',
      cast.demon,
      ...cast.party.map((p) => `${p}-back`),
      ...(cast.twist === 'disguise' ? DISGUISES : []),
      ...(cast.twist === 'swarm' ? ['spider-small'] : []),
    ]
    const [field, hero, strike, win, monk, foe, ...rest] = await Promise.all(
      names.map(loadPic),
    )
    if (this.dead) return
    this.field = field
    this.hero.pics = { idle: hero, strike, win }
    this.monk.pics = { idle: monk }
    this.foe.pics = { idle: foe, true: foe }
    this.mates = cast.party.map((id, i) => {
      const a = new Actor()
      a.pics = { idle: rest[i] }
      a.flip = true
      a.shade = 0.12
      a.bob = 0.8
      a.rate = 0.8
      return { id, a }
    })
    const more = rest.slice(cast.party.length)
    if (cast.twist === 'disguise')
      DISGUISES.forEach((d, i) => (this.foe.pics[d] = more[i]))
    if (cast.twist === 'swarm') this.foe.pics.small = more[0]
    this.monk.shade = 0.1
    this.monk.bob = 0.7
    this.monk.rate = 0.7
    this.foe.rate = 1.2
    if (cast.twist === 'disguise') this.foe.pose = DISGUISES[0]
    if (cast.twist === 'trap') this.shut = 0
    this.layout()
  }

  resize(W: number) {
    this.W = W
    // a canvas resized forgets its settings
    this.g.imageSmoothingEnabled = false
    this.layout()
    this.draw()
  }

  private layout() {
    const W = this.W
    this.hero.x = Math.round(W * 0.33)
    this.foe.x = Math.round(W * 0.74)
    this.monk.x = Math.round(W * 0.12)
    this.monk.y = BACK
    // the disciples stand further back, one each side of the monk
    const spots = [0.045, 0.215]
    this.mates.forEach(({ a }, i) => {
      a.x = Math.round(W * spots[i])
      a.y = BACK - 8
    })
  }

  start() {
    if (this.running || this.dead) return
    this.running = true
    this.last = 0
    this.loop()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    clearTimeout(this.timer)
  }

  setVisible(v: boolean) {
    if (v === this.visible) return
    this.visible = v
    if (this.running) {
      cancelAnimationFrame(this.raf)
      clearTimeout(this.timer)
      this.loop()
    }
  }

  destroy() {
    this.dead = true
    this.stop()
    for (const tw of this.tweens) tw.done.forEach((f) => f())
    this.tweens = []
  }

  private loop = () => {
    if (!this.running) return
    const now = performance.now()
    const dt = Math.min(this.visible ? 50 : 120, now - (this.last || now))
    this.last = now
    this.step(dt)
    if (this.visible) {
      this.draw()
      this.raf = requestAnimationFrame(this.loop)
    } else this.timer = window.setTimeout(this.loop, 100)
  }

  // --- Time

  private to(
    o: object,
    props: Record<string, number>,
    d: number,
    e: Ease = outQuad,
  ): Promise<void> {
    const obj = o as Record<string, number>
    const keys = Object.keys(props)
    if (this.dead || d <= 0) {
      for (const k of keys) obj[k] = props[k]
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      let left = keys.length
      const one = () => {
        if (--left <= 0) resolve()
      }
      for (const k of keys) {
        const old = this.tweens.find((tw) => tw.o === obj && tw.k === k)
        if (old) {
          this.tweens = this.tweens.filter((tw) => tw !== old)
          old.done.forEach((f) => f())
        }
        this.tweens.push({
          o: obj,
          k,
          a: obj[k],
          b: props[k],
          t: 0,
          d,
          e,
          done: [one],
        })
      }
      if (!keys.length) resolve()
    })
  }

  wait(ms: number): Promise<void> {
    return this.to({ v: 0 }, { v: 1 }, ms, linear)
  }

  private step(dt: number) {
    this.t += dt
    const finished: Array<Tween> = []
    for (const tw of this.tweens) {
      tw.t += dt
      const k = Math.min(1, tw.t / tw.d)
      tw.o[tw.k] = tw.a + (tw.b - tw.a) * tw.e(k)
      if (k >= 1) finished.push(tw)
    }
    if (finished.length) {
      this.tweens = this.tweens.filter((tw) => !finished.includes(tw))
      finished.forEach((tw) => tw.done.forEach((f) => f()))
    }
    for (const a of this.actors()) {
      a.flash = Math.max(0, a.flash - dt)
      a.hurt = Math.max(0, a.hurt - dt)
      a.wobble = Math.max(0, a.wobble - dt)
      a.trail = Math.max(0, a.trail - dt)
      if (a.trail > 0 && !this.reduced) {
        a.ghosts.unshift({ x: a.x + a.ox, y: a.y + a.oy, a: 0.5, pose: a.pose })
        if (a.ghosts.length > 5) a.ghosts.pop()
      } else a.ghosts = a.ghosts.slice(0, Math.max(0, a.ghosts.length - 1))
      for (const gh of a.ghosts) gh.a *= 0.8
    }
    this.shakeT = Math.max(0, this.shakeT - dt)
    this.flashT = Math.max(0, this.flashT - dt)
    // weather
    const sec = dt / 1000
    const still = this.calmed > 0
    this.place.weather.forEach(([kind, rate, colors], i) => {
      const r = this.reduced ? rate * 0.4 : rate
      const scale = still && (kind === 'sand' || kind === 'embers') ? 0.2 : 1
      this.emit[i] += r * scale * sec
      while (this.emit[i] >= 1) {
        this.emit[i] -= 1
        this.weather(kind, colors)
      }
    })
    // twists that keep making things
    if (this.poison > 0 && Math.random() < sec * this.poison * 3) this.bubble()
    if (this.now('wind') && !still && Math.random() < sec * 30)
      this.weather('sand', ['#e8c878', '#f4e0a0'])
    if (this.twist === 'roc' && Math.random() < sec * 0.8)
      this.weather('feathers', ['#f2c14e', '#ffe9a0'])
    for (const p of this.parts) {
      p.vx += p.ax * sec
      p.vy += p.ay * sec
      if (p.drag) {
        p.vx *= 1 - p.drag * sec
        p.vy *= 1 - p.drag * sec
      }
      p.x +=
        (p.vx + (p.sway ? Math.sin(this.t / 400 + p.seed) * p.sway : 0)) * sec
      p.y += p.vy * sec
      p.life -= dt
    }
    this.parts = this.parts.filter(
      (p) => p.life > 0 && p.x > -60 && p.x < this.W + 60 && p.y < STAGE_H + 30,
    )
    for (const f of this.fxs) f.t += dt
    this.fxs = this.fxs.filter((f) => f.t < f.d)
    for (const n of this.nums) n.t += dt
    this.nums = this.nums.filter((n) => n.t < n.d)
  }

  private actors(): Array<Actor> {
    return [
      this.monk,
      ...this.mates.map((m) => m.a),
      this.hero,
      this.foe,
      ...this.extra,
    ]
  }

  // --- Drawing

  draw() {
    const g = this.g
    const W = this.W
    g.save()
    g.clearRect(0, 0, W, STAGE_H)
    if (this.shakeT > 0 && !this.reduced) {
      const m = this.shakeMag * (this.shakeT / 300 + 0.3)
      g.translate(
        Math.round((Math.random() - 0.5) * 2 * m),
        Math.round((Math.random() - 0.5) * 2 * m),
      )
    }
    this.drawField()
    this.drawParticles(false)
    this.drawFx(false)
    // the back row, then the fighters, nearest last
    for (const a of [...this.mates.map((m) => m.a), this.monk])
      this.drawActor(a)
    if (this.twist === 'swarm') this.drawSpiders(false)
    if (this.now('mirror')) this.drawMirrors()
    this.drawActor(this.foe)
    if (this.twist === 'swarm') this.drawSpiders(true)
    this.drawActor(this.hero)
    for (const a of this.extra) this.drawActor(a)
    if (this.onCloud) this.drawCloud(this.hero)
    if (this.shut > 0 && !this.cymbalsGone) this.drawCymbals()
    if (this.talisman > 0) this.drawTalisman()
    this.drawTwist()
    this.drawFx(true)
    this.drawParticles(true)
    this.drawNums()
    if (this.flashT > 0 && !this.reduced) {
      g.globalAlpha = (this.flashT / this.flashD) * 0.35
      g.fillStyle = this.flashC
      g.fillRect(-10, -10, W + 20, STAGE_H + 20)
      g.globalAlpha = 1
    }
    g.restore()
  }

  private drawField() {
    const g = this.g
    if (this.field) {
      const crop = Math.round((this.field.w - this.W) / 2)
      g.drawImage(this.field.c, -crop, 0)
    } else {
      const grad = g.createLinearGradient(0, 0, 0, STAGE_H)
      grad.addColorStop(0, '#2a2440')
      grad.addColorStop(0.7, '#8a6a5a')
      grad.addColorStop(1, '#4a3a2a')
      g.fillStyle = grad
      g.fillRect(0, 0, this.W, STAGE_H)
    }
  }

  private drawActor(a: Actor) {
    const p = a.pic
    if (!a.visible || !p || a.alpha <= 0.01) return
    const g = this.g
    const breathe = a.frozen ? 0 : Math.sin((this.t / 700) * a.rate + a.phase)
    const sy = a.sy * (1 + breathe * 0.012 * a.bob)
    const sx =
      a.sx *
      (1 - breathe * 0.006 * a.bob) *
      (a === this.hero ? 1 + this.giant * 0.5 : 1)
    const syy = sy * (a === this.hero ? 1 + this.giant * 0.5 : 1)
    const w = Math.round(p.w * sx)
    const h = Math.round(p.h * syy)
    let x = a.x + a.ox
    const y = a.y + a.oy
    if (a.wobble > 0) x += Math.round(Math.sin(this.t / 16) * 2)
    // shadow, smaller in the air
    const lift = Math.max(0, -a.oy)
    const rx = Math.max(
      4,
      Math.round(p.w * 0.28 * Math.max(0.4, 1 - lift / 120)),
    )
    g.globalAlpha = a.alpha * 0.32
    g.drawImage(solid(rx, 2, '#120a10'), Math.round(x - rx), a.y - 2)
    g.globalAlpha = a.alpha * 0.25
    g.drawImage(
      solid(Math.round(rx * 0.6), 1, '#120a10'),
      Math.round(x - rx * 0.6),
      a.y - 1,
    )
    // afterimages
    for (const gh of a.ghosts) {
      const gp = a.pics[gh.pose] ?? p
      g.globalAlpha = gh.a * a.alpha * 0.6
      this.blit(
        tinted(gp, '#ffd860', 0.8),
        gh.x,
        gh.y,
        Math.round(gp.w * a.sx),
        Math.round(gp.h * a.sy),
        a.flip,
      )
    }
    g.globalAlpha = a.alpha
    const light = this.place.light
    const img =
      a.shade > 0
        ? tinted(p, '#1a1020', a.shade + (light ? light[1] * 0.5 : 0))
        : light
          ? tinted(p, light[0], light[1])
          : p.c
    if (a.menace > 0) {
      g.globalAlpha = a.alpha * a.menace * (0.6 + 0.4 * Math.sin(this.t / 60))
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ])
        this.blit(tinted(p, '#ff3020', 1), x + dx, y + dy, w, h, a.flip, a.rot)
      g.globalAlpha = a.alpha
    }
    this.blit(img, x, y, w, h, a.flip, a.rot)
    if (a.frozen) {
      g.globalAlpha = a.alpha * 0.45
      this.blit(tinted(p, '#8fd0f0', 1), x, y, w, h, a.flip, a.rot)
    }
    if (a.hurt > 0) {
      g.globalAlpha = a.alpha * Math.min(0.42, a.hurt / 400)
      this.blit(tinted(p, '#ff2010', 1), x, y, w, h, a.flip, a.rot)
    }
    if (a.flash > 0) {
      g.globalAlpha =
        a.alpha * (this.reduced ? 0.35 : Math.min(1, a.flash / 70))
      this.blit(p.white, x, y, w, h, a.flip, a.rot)
    }
    g.globalAlpha = 1
  }

  // A picture with its feet at (x, y), mirrored if need be
  private blit(
    img: CanvasImageSource,
    x: number,
    y: number,
    w: number,
    h: number,
    flip: boolean,
    rot = 0,
  ) {
    const g = this.g
    if (!flip && !rot) {
      g.drawImage(img, Math.round(x - w / 2), Math.round(y - h), w, h)
      return
    }
    // turned about the feet, and mirrored
    g.save()
    g.translate(Math.round(x), Math.round(y))
    if (rot) g.rotate(rot)
    if (flip) g.scale(-1, 1)
    g.drawImage(img, -Math.round(w / 2), -h, w, h)
    g.restore()
  }

  private drawParticles(front: boolean) {
    const g = this.g
    for (const p of this.parts) {
      if (p.front !== front) continue
      const k = p.life / p.max
      const a =
        p.fade === false
          ? 1
          : p.kind === 'blob'
            ? Math.min(1, k * 3, (1 - k) * 4)
            : Math.min(1, k * 2)
      g.globalAlpha = a * (p.o ?? 1)
      g.fillStyle = p.c
      const x = Math.round(p.x)
      const y = Math.round(p.y)
      switch (p.kind) {
        case 'dot':
        case 'spark':
          g.fillRect(x, y, p.s, p.s)
          break
        case 'streak':
          g.fillRect(x, y, p.s, 1)
          break
        case 'rain':
          for (let i = 0; i < p.s; i++)
            g.fillRect(x - Math.round(i / 3), y - i, 1, 1)
          break
        case 'petal':
          if (Math.sin(this.t / 150 + p.seed) > 0) g.fillRect(x, y, 2, 1)
          else g.fillRect(x, y, 1, 2)
          break
        case 'feather':
          g.fillRect(x, y, 3, 1)
          g.fillRect(
            x + (Math.sin(this.t / 200 + p.seed) > 0 ? 1 : 0),
            y + 1,
            2,
            1,
          )
          break
        case 'blob':
          if (p.img) {
            const c = p.img as HTMLCanvasElement
            g.drawImage(
              c,
              Math.round(x - c.width / 2),
              Math.round(y - c.height / 2),
            )
          }
          break
        case 'bubble':
          g.fillRect(x, y - 1, p.s, 1)
          g.fillRect(x, y + p.s, p.s, 1)
          g.fillRect(x - 1, y, 1, p.s)
          g.fillRect(x + p.s, y, 1, p.s)
          break
        case 'fly': {
          const on = Math.sin(this.t / 180 + p.seed) > 0
          g.globalAlpha = a * (on ? 1 : 0.25)
          g.fillRect(x, y, 1, 1)
          if (on) {
            g.globalAlpha = a * 0.35
            g.fillRect(x - 1, y, 3, 1)
            g.fillRect(x, y - 1, 1, 3)
          }
          break
        }
        case 'img':
          if (p.img) g.drawImage(p.img, x - 6, y - 6)
          break
      }
    }
    g.globalAlpha = 1
  }

  private drawFx(front: boolean) {
    for (const f of this.fxs)
      if (f.front === front) f.draw(this.g, Math.min(1, f.t / f.d))
    this.g.globalAlpha = 1
    this.g.globalCompositeOperation = 'source-over'
  }

  private drawNums() {
    const g = this.g
    for (const n of this.nums) {
      const k = n.t / n.d
      const y = n.y - n.rise * outQuad(Math.min(1, k * 1.6))
      g.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1
      const pop = k < 0.08 && n.scale > 1 ? n.scale + 1 : n.scale
      drawText(g, n.text, n.x, y - pop * 3, n.c, { scale: pop })
    }
    g.globalAlpha = 1
  }

  private drawCloud(a: Actor) {
    const g = this.g
    const x = Math.round(a.x + a.ox)
    const y = Math.round(a.y + a.oy)
    for (const [dx, dy, r] of [
      [-14, 2, 6],
      [-4, -1, 8],
      [8, 0, 7],
      [16, 3, 5],
    ] as const) {
      g.drawImage(
        solid(r + 1, r - 1, '#b8862a'),
        x + dx - r - 1,
        y + dy - r + 2,
      )
      g.drawImage(solid(r, r - 2, '#fff6e0'), x + dx - r, y + dy - r + 3)
      g.drawImage(solid(r - 2, 1, '#e8d2a8'), x + dx - r + 2, y + dy + 1)
    }
    // the swirl of its tail
    g.fillStyle = '#f2c14e'
    for (let i = 0; i < 10; i++) {
      const ang = i * 0.7 + this.t / 120
      g.fillRect(
        Math.round(x - 22 - i * 1.5 + Math.cos(ang) * 2),
        Math.round(y + 2 + Math.sin(ang) * 2),
        1,
        1,
      )
    }
  }

  // Yellow Brows' golden cymbals, shut round Wukong
  private drawCymbals() {
    const g = this.g
    const cx = Math.round(this.hero.x)
    const cy = GROUND - 46
    const k = this.shut
    const rx = 34
    const ry = 50
    const gap = Math.round((1 - k) * 24)
    const top = Math.round(-(1 - k) * 110)
    for (const side of [-1, 1]) {
      const x = cx + side * gap
      g.save()
      g.beginPath()
      if (side < 0) g.rect(x - rx - 2, -20, rx + 2, STAGE_H + 40)
      else g.rect(x, -20, rx + 2, STAGE_H + 40)
      g.clip()
      g.drawImage(solid(rx, ry, '#5a3a08'), x - rx, cy - ry + top)
      g.drawImage(
        solid(rx - 2, ry - 2, '#c99a2e'),
        x - rx + 2,
        cy - ry + 2 + top,
      )
      g.drawImage(
        solid(rx - 9, ry - 12, '#e8b84a'),
        x - rx + 9 + side * 3,
        cy - ry + 12 + top,
      )
      g.drawImage(
        solid(rx - 20, ry - 26, '#f2c14e'),
        x - rx + 20 + side * 6,
        cy - ry + 26 + top,
      )
      g.drawImage(solid(4, 8, '#fff2b0'), x + side * 15 - 4, cy - 26 + top)
      g.restore()
    }
    // the hammered rings of the bronze
    g.globalAlpha = 0.35
    g.strokeStyle = '#7a5212'
    for (const r of [0.45, 0.7, 0.88]) {
      g.beginPath()
      g.ellipse(cx + 0.5, cy + top + 0.5, rx * r, ry * r, 0, 0, Math.PI * 2)
      g.stroke()
    }
    g.globalAlpha = 1
    if (k >= 1) {
      g.fillStyle = '#5a3a08'
      g.fillRect(cx, cy - ry + 3, 1, ry * 2 - 6)
      g.drawImage(solid(3, 3, '#7a5212'), cx - rx - 2, cy - 3)
      g.drawImage(solid(3, 3, '#7a5212'), cx + rx - 4, cy - 3)
    }
  }

  private drawTalisman() {
    const ic = iconCanvas('freeze')
    if (!ic) return
    const f = this.foe
    this.g.globalAlpha = this.talisman
    this.g.drawImage(
      ic,
      Math.round(f.x + f.ox - 9),
      Math.round(f.y - f.h * 0.62),
    )
    this.g.globalAlpha = 1
  }

  private drawMirrors() {
    const f = this.foe
    const p = f.pic
    if (!p || !f.visible) return
    const g = this.g
    const swing = Math.sin(this.t / 900)
    for (const side of [-1, 1]) {
      g.globalAlpha = 0.28 * f.alpha
      this.blit(
        tinted(p, '#6070c0', 0.45),
        f.x + f.ox + side * (26 + swing * 6),
        f.y + f.oy,
        p.w,
        p.h,
        f.flip,
      )
    }
    g.globalAlpha = 1
  }

  // The spider spirit's six sisters: hanging on threads, and on the ground
  private drawSpiders(front: boolean) {
    const f = this.foe
    const sp = f.pics.small
    if (!sp || !f.visible) return
    const g = this.g
    const spots = front
      ? [
          [-34, 0],
          [30, 4],
        ]
      : [
          [-58, -70],
          [-20, -96],
          [26, -84],
          [56, -60],
        ]
    spots.forEach(([dx, dy], i) => {
      const hang = dy < 0
      const swing = Math.sin(this.t / 500 + i * 1.7)
      const x = Math.round(f.x + dx + (hang ? swing * 2 : f.ox * 0.6))
      const y = Math.round(f.y + dy + (hang ? swing * 3 : 0))
      g.globalAlpha = f.alpha * (front ? 1 : 0.9)
      if (hang) {
        g.fillStyle = '#e8e8f0'
        g.fillRect(x, 0, 1, y - sp.h + 2)
      }
      this.blit(sp.c, x, y, sp.w, sp.h, false)
    })
    g.globalAlpha = 1
  }

  private drawTwist() {
    const g = this.g
    const W = this.W
    const still = this.calmed > 0 ? 0.25 : 1
    const twist = this.twist
    if (this.now('fire')) {
      const heat = (0.45 + this.tension * 0.7) * still
      for (let x = 0; x < W; x++) {
        const n =
          Math.sin(x * 0.31 + this.t / 120) +
          Math.sin(x * 0.13 - this.t / 210) +
          Math.sin(x * 0.07 + this.t / 330)
        const h = Math.max(0, (n + 2.2) * 3.2 * heat)
        g.fillStyle = '#c8301a'
        g.fillRect(x, STAGE_H - h, 1, h)
        g.fillStyle = '#ff8a2a'
        g.fillRect(x, STAGE_H - h * 0.6, 1, h * 0.6)
        g.fillStyle = '#ffe070'
        g.fillRect(x, STAGE_H - h * 0.25, 1, h * 0.25)
      }
    }
    if (twist === 'hungry') this.drawFood()
    if (twist === 'numbers') this.drawSkulls()
    if (twist === 'gourd') this.drawSwirl(this.gourdAt(), 0.6, 5)
    if (this.twist === 'trap' && this.shut >= 1) {
      g.globalAlpha = 0.18
      g.fillStyle = '#000'
      g.fillRect(0, 0, W, STAGE_H)
      g.globalAlpha = 1
    }
  }

  private gourdAt() {
    const f = this.foe
    return { x: f.x + f.ox - f.w * 0.18, y: f.y + f.oy - f.h * 0.86 }
  }

  private drawSwirl(at: { x: number; y: number }, a: number, r: number) {
    const g = this.g
    g.globalAlpha = a
    g.fillStyle = '#ffe080'
    for (let i = 0; i < 14; i++) {
      const ang = this.t / 160 + i * 0.9
      const rr = (i / 14) * r + 1
      g.fillRect(
        Math.round(at.x + Math.cos(ang) * rr),
        Math.round(at.y + Math.sin(ang) * rr),
        1,
        1,
      )
    }
    g.globalAlpha = 1
  }

  // Food circling the pig's head
  private drawFood() {
    const f = this.foe
    if (!f.visible) return
    const names = ['bun', 'dumplings', 'noodles', 'egg', 'youtiao']
    names.forEach((n, i) => {
      const c = mini(n)
      if (!c) return
      const ang = this.t / 1400 + (i / names.length) * Math.PI * 2
      const x = f.x + f.ox + Math.cos(ang) * 34
      const y = f.y - f.h - 4 + Math.sin(ang) * 6
      this.g.globalAlpha = (Math.sin(ang) + 1.4) / 2.4
      this.g.drawImage(c, Math.round(x - 6), Math.round(y - 6))
    })
    this.g.globalAlpha = 1
  }

  // Sha Wujing's nine skulls, turning over his head
  private drawSkulls() {
    const f = this.foe
    if (!f.visible) return
    const g = this.g
    for (let i = 0; i < 9; i++) {
      const ang = this.t / 2000 + (i / 9) * Math.PI * 2
      const x = Math.round(f.x + f.ox + Math.cos(ang) * 30)
      const y = Math.round(f.y - f.h - 6 + Math.sin(ang) * 5)
      const back = Math.sin(ang) < 0
      g.globalAlpha = back ? 0.5 : 0.95
      g.fillStyle = '#1b1418'
      g.fillRect(x - 3, y - 3, 6, 6)
      g.fillStyle = '#e8e0d0'
      g.fillRect(x - 2, y - 2, 4, 3)
      g.fillRect(x - 1, y + 1, 2, 1)
      g.fillStyle = '#1b1418'
      g.fillRect(x - 1, y - 1, 1, 1)
      g.fillRect(x + 1, y - 1, 1, 1)
    }
    g.globalAlpha = 1
  }

  // --- Weather

  private weather(kind: Weather, colors: Array<string>) {
    const W = this.W
    const c = colors[Math.floor(Math.random() * colors.length)]
    const r = Math.random
    const base = {
      ax: 0,
      ay: 0,
      c,
      front: r() < 0.5,
      seed: r() * 100,
    }
    switch (kind) {
      case 'motes':
        this.parts.push({
          ...base,
          kind: 'dot',
          x: r() * W,
          y: 20 + r() * 120,
          vx: (r() - 0.5) * 6,
          vy: (r() - 0.6) * 4,
          life: 3000 + r() * 3000,
          max: 6000,
          s: 1,
          sway: 3,
        })
        break
      case 'fireflies':
        this.parts.push({
          ...base,
          kind: 'fly',
          x: r() * W,
          y: 70 + r() * 80,
          vx: (r() - 0.5) * 8,
          vy: (r() - 0.5) * 5,
          life: 5000 + r() * 4000,
          max: 9000,
          s: 1,
          sway: 6,
        })
        break
      case 'sand':
        this.parts.push({
          ...base,
          kind: 'streak',
          x: -10,
          y: 20 + r() * 140,
          vx: 140 + r() * 120,
          vy: (r() - 0.5) * 16,
          life: 3000,
          max: 3000,
          s: 3 + Math.floor(r() * 6),
          fade: false,
        })
        break
      case 'rain':
        this.parts.push({
          ...base,
          kind: 'rain',
          x: r() * (W + 40),
          y: -6,
          vx: -40,
          vy: 240 + r() * 60,
          life: 900,
          max: 900,
          s: 4 + Math.floor(r() * 3),
          fade: false,
        })
        break
      case 'petals':
        this.parts.push({
          ...base,
          kind: 'petal',
          x: r() * W - 30,
          y: -4,
          vx: 8 + r() * 14,
          vy: 10 + r() * 10,
          life: 14000,
          max: 14000,
          s: 2,
          sway: 10,
          fade: false,
        })
        break
      case 'leaves':
        this.parts.push({
          ...base,
          kind: 'petal',
          x: r() * W,
          y: -4,
          vx: 4 + r() * 8,
          vy: 12 + r() * 8,
          life: 14000,
          max: 14000,
          s: 2,
          sway: 14,
          fade: false,
        })
        break
      case 'feathers':
        this.parts.push({
          ...base,
          kind: 'feather',
          x: r() * W,
          y: -4,
          vx: (r() - 0.5) * 6,
          vy: 8 + r() * 8,
          life: 16000,
          max: 16000,
          s: 3,
          sway: 12,
          fade: false,
        })
        break
      case 'embers':
        this.parts.push({
          ...base,
          kind: 'dot',
          x: r() * W,
          y: STAGE_H - r() * 20,
          vx: (r() - 0.5) * 8,
          vy: -18 - r() * 30,
          life: 2000 + r() * 2500,
          max: 4500,
          s: r() < 0.2 ? 2 : 1,
          sway: 8,
        })
        break
      case 'mist': {
        // a long thin band of fog, drifting
        const rx = 36 + Math.floor(r() * 30)
        const ry = 3 + Math.floor(r() * 3)
        this.parts.push({
          ...base,
          kind: 'blob',
          front: false,
          x: r() * W,
          y: 104 + r() * 46,
          vx: 3 + r() * 4,
          vy: 0,
          life: 16000,
          max: 16000,
          s: rx,
          o: 0.4,
          img: soft(rx, ry, c),
        })
        break
      }
      case 'smoke': {
        const rx = 7 + Math.floor(r() * 8)
        this.parts.push({
          ...base,
          kind: 'blob',
          front: false,
          x: r() * W,
          y: STAGE_H + rx * 0.6,
          vx: (r() - 0.5) * 4,
          vy: -6 - r() * 5,
          life: 9000,
          max: 9000,
          s: rx,
          o: 0.7,
          img: soft(rx, Math.round(rx * 0.8), c),
        })
        break
      }
      case 'sparkle': {
        const x = r() * W
        const y = 10 + r() * 130
        this.fxs.push({
          t: 0,
          d: 700,
          front: r() < 0.5,
          draw: (g, k) => {
            const s = Math.round(Math.sin(k * Math.PI) * 3)
            g.fillStyle = c
            g.globalAlpha = 0.9
            g.fillRect(Math.round(x), Math.round(y) - s, 1, s * 2 + 1)
            g.fillRect(Math.round(x) - s, Math.round(y), s * 2 + 1, 1)
            g.globalAlpha = 1
          },
        })
        break
      }
    }
  }

  private bubble() {
    const h = this.hero
    this.parts.push({
      kind: 'bubble',
      x: h.x + h.ox + (Math.random() - 0.5) * 30,
      y: h.y - Math.random() * h.h * 0.7,
      vx: (Math.random() - 0.5) * 4,
      vy: -10 - Math.random() * 10,
      ax: 0,
      ay: 0,
      life: 1400,
      max: 1400,
      c: Math.random() < 0.5 ? '#7cff6a' : '#3fc04a',
      s: Math.random() < 0.5 ? 2 : 1,
      front: true,
      seed: Math.random() * 100,
      sway: 4,
    })
  }

  // --- Small effects

  private shake(mag: number, ms: number) {
    if (this.reduced) return
    this.shakeMag = Math.max(mag, this.shakeT > 0 ? this.shakeMag : 0)
    this.shakeT = Math.max(this.shakeT, ms)
  }

  private flashScreen(c: string, ms: number) {
    if (this.reduced) return
    this.flashC = c
    this.flashT = ms
    this.flashD = ms
  }

  private chest(a: Actor) {
    return { x: a.x + a.ox, y: a.y + a.oy - a.h * 0.55 }
  }

  private number(a: Actor, text: string, c: string, big = false) {
    const stack = this.nums.filter((n) => n.t < 400).length
    this.nums.push({
      x: a.x + a.ox,
      y: a.y + a.oy - a.h - 2 - stack * 9,
      text,
      c,
      scale: big ? 2 : 1,
      t: 0,
      d: 1100,
      rise: 12,
    })
  }

  // A word called out over a fighter
  call(a: Actor, text: string, c: string) {
    this.nums.push({
      x: a.x + a.ox,
      y: a.y + a.oy - a.h * 0.55,
      text,
      c,
      scale: 1,
      t: 0,
      d: 900,
      rise: 6,
    })
  }

  private sparks(
    x: number,
    y: number,
    n: number,
    colors: Array<string>,
    speed = 90,
  ) {
    const count = this.reduced ? Math.ceil(n / 3) : n
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2
      const v = speed * (0.4 + Math.random())
      this.parts.push({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v - 30,
        ax: 0,
        ay: 160,
        life: 300 + Math.random() * 400,
        max: 700,
        c: colors[i % colors.length],
        s: Math.random() < 0.3 ? 2 : 1,
        front: true,
        drag: 2,
        seed: this.sparkSeed++,
      })
    }
  }

  // A star of light where a blow lands
  private burst(x: number, y: number, big: boolean) {
    const R = big ? 14 : 10
    this.fxs.push({
      t: 0,
      d: 160,
      front: true,
      draw: (g, k) => {
        const r = Math.round(R * (0.5 + k))
        g.globalAlpha = 1 - k
        g.fillStyle = '#ffffff'
        g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5)
        g.fillStyle = '#fff2a0'
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + 0.3
          const len = i % 2 ? r * 0.6 : r
          for (let s = 3; s < len; s++)
            g.fillRect(
              Math.round(x + Math.cos(ang) * s),
              Math.round(y + Math.sin(ang) * s),
              1,
              1,
            )
        }
        g.globalAlpha = 1
      },
    })
  }

  // The cudgel's arc
  private slash(target: Actor, down = false) {
    const c = this.chest(target)
    const R = Math.max(22, target.h * 0.42)
    this.fxs.push({
      t: 0,
      d: 200,
      front: true,
      draw: (g, k) => {
        const a0 = down ? -2.4 : -2.2
        const a1 = a0 + (down ? 2.6 : 2.9) * Math.min(1, k * 2.2)
        g.globalAlpha = 1 - k
        for (const [dr, col] of [
          [0, '#ffffff'],
          [1, '#fff2a0'],
          [2, '#f2c14e'],
          [3, '#c8372d'],
        ] as const) {
          g.fillStyle = col
          for (let a = a0 + 0.2 * (dr / 3); a < a1; a += 0.02)
            g.fillRect(
              Math.round(c.x - 10 + Math.cos(a) * (R - dr)),
              Math.round(c.y + Math.sin(a) * (R - dr)),
              1,
              1,
            )
        }
        g.globalAlpha = 1
      },
    })
  }

  // Two golden beams from Wukong's eyes
  private beam(
    from: { x: number; y: number },
    to: { x: number; y: number },
    ms: number,
  ) {
    this.fxs.push({
      t: 0,
      d: ms,
      front: true,
      draw: (g, k) => {
        const grow = Math.min(1, k * 4)
        const fade = k > 0.7 ? (1 - k) / 0.3 : 1
        const ex = from.x + (to.x - from.x) * grow
        const ey = from.y + (to.y - from.y) * grow
        g.globalCompositeOperation = 'lighter'
        for (const [off, col, a] of [
          [-2, '#ff9a20', 0.5],
          [0, '#ffe070', 0.9],
          [1, '#ffffff', 1],
          [3, '#ff9a20', 0.5],
        ] as const) {
          g.globalAlpha = a * fade
          g.strokeStyle = col
          g.lineWidth = 1
          g.beginPath()
          g.moveTo(Math.round(from.x) + 0.5, Math.round(from.y + off) + 0.5)
          g.lineTo(Math.round(ex) + 0.5, Math.round(ey + off) + 0.5)
          g.stroke()
        }
        g.globalAlpha = fade
        g.drawImage(
          blob(6, 6, '#fff2a0', 0.9),
          Math.round(ex) - 6,
          Math.round(ey) - 6,
        )
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      },
    })
  }

  // A blow that lands: flash, knock back, squash, sparks, number, shake
  private impact(
    target: Actor,
    dmg: number,
    crit: boolean,
    colors = ['#ffffff', '#ffe070', '#f2c14e', '#ff9a40'],
  ) {
    const c = this.chest(target)
    const dir = target === this.hero ? -1 : 1
    target.flash = 130
    target.wobble = 220
    if (target === this.hero) target.hurt = 320
    void this.to(target, { sx: 1.1, sy: 0.9 }, 60).then(() =>
      this.to(target, { sx: 1, sy: 1 }, 260, outBack),
    )
    const back = target.ox
    void this.to(target, { ox: back + dir * (crit ? 10 : 6) }, 70).then(() =>
      this.to(target, { ox: back }, 260),
    )
    this.burst(c.x - dir * 6, c.y, crit)
    this.sparks(c.x - dir * 6, c.y, crit ? 26 : 14, colors)
    this.number(
      target,
      String(dmg),
      target === this.hero ? '#ff6a5a' : crit ? '#ffe066' : '#ffffff',
      crit,
    )
    if (crit) this.call(target, 'CRITICAL!', '#ffe066')
    this.shake(crit ? 4 : 2, crit ? 280 : 170)
    if (crit) this.flashScreen('#fff6d0', 90)
    if (target === this.hero) {
      sfx.hurt()
      this.monk.wobble = 400
      for (const m of this.mates) m.a.wobble = 300
    } else sfx.hit(crit)
  }

  private sidestep(target: Actor) {
    const dir = target === this.hero ? -1 : 1
    target.trail = 260
    void this.to(target, { ox: dir * 16, oy: -10 }, 120).then(() =>
      this.to(target, { ox: 0, oy: 0 }, 240, outQuad),
    )
    this.call(
      target,
      target === this.hero ? 'DODGE' : 'MISS',
      target === this.hero ? '#8fe0ff' : '#e8e0d0',
    )
    if (target === this.hero) sfx.dodge()
    else sfx.miss()
  }

  // --- The story

  async enter() {
    const party = [this.monk, ...this.mates.map((m) => m.a)]
    const walkers = this.cast?.late ? party : [this.hero, ...party]
    if (this.cast?.late) this.hero.visible = false
    this.foe.visible = false
    for (const a of walkers) a.ox = -(a.x + 70)
    await Promise.all(
      walkers.map(async (a, i) => {
        await this.wait(i * 160)
        a.rate = 3
        a.bob = 3
        await this.to(a, { ox: 0 }, 1500 - i * 80, linear)
        a.rate = a === this.hero ? 1 : 0.8
        a.bob = 1
      }),
    )
  }

  async reveal() {
    const f = this.foe
    if (f.visible) return
    this.puff(f, '#d8d0e0')
    sfx.gust()
    f.visible = true
    f.alpha = 0
    f.sy = 0.6
    f.sx = 1.2
    await this.to(f, { alpha: 1, sy: 1.08, sx: 0.95 }, 260, outQuad)
    await this.to(f, { sy: 1, sx: 1 }, 220, outBack)
    if (this.cast?.late && !this.hero.visible) await this.leapIn()
  }

  // Wukong somersaults in from the sky
  private async leapIn() {
    const h = this.hero
    h.visible = true
    h.oy = -STAGE_H
    h.ox = -20
    h.trail = 600
    sfx.jump()
    await this.to(h, { oy: 0, ox: 0 }, 420, inQuad)
    this.sparks(h.x, GROUND - 2, 12, ['#d8c8a0', '#a89070'], 50)
    this.shake(2, 160)
    await this.to(h, { sy: 0.85, sx: 1.12 }, 70)
    await this.to(h, { sy: 1, sx: 1 }, 200, outBack)
  }

  async fight() {
    this.foe.visible = true
    this.hero.visible = true
    if (this.twist === 'trap' && this.shut < 1) {
      sfx.clang()
      await this.to(this, { shut: 1 }, 500, inQuad)
      this.shake(3, 200)
      this.hero.shade = 0.55
    }
  }

  // The White Bone Demon puts on her next disguise
  async form(i: number) {
    const f = this.foe
    const pose = DISGUISES[Math.min(i, DISGUISES.length - 1)]
    if (this.twist !== 'disguise' || f.pose === pose || !f.pics[pose]) return
    this.puff(f, '#e8e8f8')
    sfx.gust()
    await this.to(f, { sx: 1.2, sy: 0.7, alpha: 0.3 }, 160)
    f.pose = pose
    await this.to(f, { sx: 1, sy: 1, alpha: 1 }, 240, outBack)
  }

  // The Roc takes another demon's power for a turn
  setRoc(t: Twist) {
    if (this.twist !== 'roc' || t === this.rocTwist) return
    this.rocTwist = t
    this.foe.flash = 160
    this.sparks(
      this.foe.x,
      this.foe.y - this.foe.h * 0.7,
      14,
      ['#f2c14e', '#ffffff'],
      60,
    )
  }

  // A question against the clock: the fire leaps up
  setTension(on: boolean) {
    void this.to(this, { tension: on ? 1 : 0 }, 400)
  }

  setPoison(n: number) {
    this.poison = n
  }

  // The twist at work now: the demon's own, or the one the Roc borrows
  private now(t: Twist) {
    return this.twist === t || (this.twist === 'roc' && this.rocTwist === t)
  }

  private puff(a: Actor, color: string) {
    const c = this.chest(a)
    for (let i = 0; i < (this.reduced ? 5 : 14); i++) {
      const rx = 5 + Math.floor(Math.random() * 7)
      this.parts.push({
        kind: 'blob',
        x: c.x + (Math.random() - 0.5) * a.w * 0.6,
        y: a.y - Math.random() * a.h * 0.8,
        vx: (Math.random() - 0.5) * 30,
        vy: -6 - Math.random() * 10,
        ax: 0,
        ay: 0,
        life: 800 + Math.random() * 500,
        max: 1300,
        c: color,
        s: rx,
        front: true,
        drag: 2,
        seed: 0,
        img: soft(rx, rx, color),
      })
    }
  }

  // --- Wukong's moves

  async attack(kind: Strike, dmg: number, crit: boolean, hit = true) {
    if (this.twist === 'trap' && !this.cymbalsGone)
      return this.trapped(dmg, crit, hit)
    if (kind === 'cudgel') return this.cudgel(dmg, crit, hit)
    if (kind === 'eyes') return this.eyes(dmg, crit, hit)
    return this.cloud(dmg, crit, hit)
  }

  private reach(extra = 0) {
    return this.foe.x - this.hero.x - (this.foe.w * 0.22 + 26) - extra
  }

  private async cudgel(dmg: number, crit: boolean, hit: boolean) {
    const h = this.hero
    await this.to(h, { ox: -6, sx: 1.06, sy: 0.94 }, 110)
    h.trail = 420
    sfx.swing()
    await this.to(h, { ox: this.reach(), sx: 0.96, sy: 1.04 }, 150, inQuad)
    h.pose = 'strike'
    this.slash(this.foe)
    if (hit) this.impact(this.foe, dmg, crit)
    else this.sidestep(this.foe)
    await this.wait(260)
    h.pose = 'idle'
    await this.to(h, { ox: 0, sx: 1, sy: 1 }, 300)
  }

  private eyePoint() {
    const h = this.hero
    return { x: h.x + h.ox + h.w * 0.1, y: h.y + h.oy - h.h * 0.72 }
  }

  private async eyes(dmg: number, crit: boolean, hit: boolean) {
    const h = this.hero
    await this.to(h, { sy: 1.05, sx: 0.97 }, 140)
    const from = this.eyePoint()
    const c = this.chest(this.foe)
    const to = hit ? c : { x: c.x + 40, y: c.y - 30 }
    this.fxs.push({
      t: 0,
      d: 260,
      front: true,
      draw: (g, k) => {
        g.globalAlpha = Math.sin(k * Math.PI)
        g.drawImage(
          blob(5, 5, '#ffe070', 1),
          Math.round(from.x) - 5,
          Math.round(from.y) - 5,
        )
        g.globalAlpha = 1
      },
    })
    await this.wait(160)
    sfx.zap()
    this.beam(from, to, 520)
    await this.wait(130)
    if (hit) {
      this.impact(this.foe, dmg, crit, [
        '#ffffff',
        '#ffe070',
        '#ff9a20',
        '#ff5a20',
      ])
      for (let i = 0; i < 10; i++)
        this.weather('embers', ['#ffb040', '#ffe080'])
    } else this.sidestep(this.foe)
    await this.wait(420)
    await this.to(h, { sx: 1, sy: 1 }, 160)
  }

  private async cloud(dmg: number, crit: boolean, hit: boolean) {
    const h = this.hero
    sfx.jump()
    await this.to(h, { sy: 0.88, sx: 1.08 }, 80)
    this.onCloud = true
    await this.to(h, { oy: -40, sy: 1.06, sx: 0.95 }, 220)
    h.trail = 900
    const reach = this.reach(-8)
    await this.to(h, { ox: reach * 0.65, oy: -66, sy: 1, sx: 1 }, 260, inOut)
    h.pose = 'strike'
    sfx.swing()
    await this.to(h, { ox: reach, oy: -10 }, 120, inQuad)
    this.slash(this.foe, true)
    if (hit) this.impact(this.foe, dmg, crit)
    else this.sidestep(this.foe)
    await this.wait(220)
    h.pose = 'idle'
    await this.to(h, { ox: reach * 0.4, oy: -52 }, 250)
    await this.to(h, { ox: 0, oy: 0 }, 250, inQuad)
    this.onCloud = false
    await this.to(h, { sy: 0.9, sx: 1.08 }, 60)
    await this.to(h, { sy: 1, sx: 1 }, 180, outBack)
  }

  // Inside the cymbals: Wukong batters at them, and the light gets out
  private async trapped(dmg: number, crit: boolean, hit: boolean) {
    sfx.clang()
    this.shake(3, 240)
    const cx = this.hero.x
    this.fxs.push({
      t: 0,
      d: 420,
      front: true,
      draw: (g, k) => {
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = 1 - k
        g.drawImage(
          blob(10, 30, '#fff2a0', 0.9),
          Math.round(cx) - 10,
          GROUND - 74,
        )
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      },
    })
    await this.wait(160)
    const from = { x: cx + 30, y: GROUND - 50 }
    if (hit) {
      sfx.zap()
      this.beam(from, this.chest(this.foe), 420)
      await this.wait(120)
      this.impact(this.foe, dmg, crit)
    } else this.call(this.hero, 'CLANG', '#f2c14e')
    await this.wait(420)
  }

  // Hairs become monkeys, each leaping at the demon
  async clones(blows: Array<number | null>) {
    const h = this.hero
    const p = h.pic
    if (!p) return
    sfx.magic()
    for (let i = 0; i < 3; i++)
      this.sparks(h.x + h.ox, h.y - h.h * 0.8, 4, ['#f2c14e', '#fff2a0'], 40)
    await this.wait(200)
    for (const [i, dmg] of blows.entries()) {
      const clone = new Actor()
      clone.pics = { idle: p }
      clone.x = h.x + 10 + i * 8
      clone.y = GROUND
      clone.sx = 0.5
      clone.sy = 0.5
      clone.alpha = 0.85
      clone.trail = 600
      this.extra.push(clone)
      sfx.jump()
      const reach = this.foe.x - clone.x - 24
      await this.to(clone, { ox: reach * 0.5, oy: -40 }, 180, outQuad)
      await this.to(clone, { ox: reach, oy: -6 }, 140, inQuad)
      if (dmg !== null) this.impact(this.foe, dmg, false)
      else this.sidestep(this.foe)
      await this.to(clone, { alpha: 0, oy: -30 }, 200)
      this.extra = this.extra.filter((x) => x !== clone)
    }
  }

  // Wukong shrinks to an insect and flies inside the demon
  async insect(dmg: number, hit: boolean) {
    const h = this.hero
    sfx.magic()
    await this.to(h, { sx: 0.1, sy: 0.1, alpha: 0 }, 260, inQuad)
    const bee = iconCanvas('insect')
    const start = { x: h.x, y: h.y - 30 }
    const end = this.chest(this.foe)
    await new Promise<void>((resolve) => {
      this.fxs.push({
        t: 0,
        d: 700,
        front: true,
        draw: (g, k) => {
          if (!bee) return
          const x = start.x + (end.x - start.x) * k + Math.sin(k * 20) * 6
          const y = start.y + (end.y - start.y) * k + Math.cos(k * 17) * 8
          g.drawImage(bee, Math.round(x) - 9, Math.round(y) - 9)
        },
      })
      void this.wait(700).then(resolve)
    })
    if (hit) {
      this.foe.wobble = 900
      sfx.hit(true)
      await this.wait(260)
      this.impact(this.foe, dmg, true)
      await this.wait(400)
    } else {
      this.call(this.foe, 'MISS', '#e8e0d0')
      await this.wait(300)
    }
    h.alpha = 1
    await this.to(h, { sx: 1, sy: 1 }, 260, outBack)
  }

  // As tall as heaven
  async grow() {
    sfx.magic()
    this.sparks(this.hero.x, GROUND - 40, 20, ['#f2c14e', '#ffffff'], 70)
    await this.to(this, { giant: 1 }, 600, outBack)
  }

  async shrink() {
    await this.to(this, { giant: 0 }, 400)
  }

  // The freezing spell: a talisman on the demon
  async freeze() {
    sfx.magic()
    await this.to(this, { talisman: 1 }, 250)
    this.foe.frozen = true
    this.sparks(
      this.foe.x,
      this.foe.y - this.foe.h * 0.6,
      16,
      ['#8fd0f0', '#ffffff'],
      60,
    )
    await this.wait(400)
  }

  async thaw() {
    this.foe.frozen = false
    for (let i = 0; i < 8; i++) this.weather('embers', ['#ffb040', '#ffe080'])
    await this.to(this, { talisman: 0 }, 300)
  }

  // --- The demon's turn

  // A red glow while the question to dodge it is asked
  menace(on: boolean) {
    void this.to(this.foe, { menace: on ? 1 : 0 }, 200)
  }

  async foeTurn(hit: boolean, dmgs: Array<number>) {
    const style = STYLES[this.cast?.demon ?? ''] ?? 'lunge'
    this.foe.menace = 0
    for (const dmg of dmgs) await this.strike(style, hit, dmg)
  }

  private async strike(style: Style, hit: boolean, dmg: number) {
    const f = this.foe
    const h = this.hero
    await this.to(f, { ox: 6, sx: 0.94, sy: 1.06 }, 180)
    const land = () => {
      if (hit) this.impact(h, dmg, false, ['#ffffff', '#ff8a6a', '#ff3a2a'])
      else this.sidestep(h)
    }
    const reach = -(f.x - h.x - (h.w * 0.22 + f.w * 0.2 + 10))
    switch (style) {
      case 'throw':
      case 'web': {
        await this.to(f, { ox: -4, sx: 1.05, sy: 0.96 }, 90)
        const from = { x: f.x - f.w * 0.3, y: f.y - f.h * 0.7 }
        const to = this.chest(h)
        if (!hit) to.y -= 40
        const rock = style === 'throw'
        sfx.swing()
        await new Promise<void>((resolve) => {
          this.fxs.push({
            t: 0,
            d: 380,
            front: true,
            draw: (g, k) => {
              const x = from.x + (to.x - from.x) * k
              const y =
                from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 30
              if (rock) {
                g.drawImage(
                  blob(5, 4, '#3a3028', 1),
                  Math.round(x) - 5,
                  Math.round(y) - 4,
                )
                g.drawImage(
                  blob(4, 3, '#8a7a62', 1),
                  Math.round(x) - 4,
                  Math.round(y) - 4,
                )
              } else {
                g.drawImage(
                  blob(5, 5, '#f0f0ff', 0.9),
                  Math.round(x) - 5,
                  Math.round(y) - 5,
                )
                g.strokeStyle = '#e8e8f0'
                g.globalAlpha = 0.6
                g.beginPath()
                g.moveTo(Math.round(from.x) + 0.5, Math.round(from.y) + 0.5)
                g.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5)
                g.stroke()
                g.globalAlpha = 1
              }
            },
          })
          void this.wait(380).then(resolve)
        })
        land()
        if (hit && !rock) this.webbed()
        break
      }
      case 'breath':
      case 'gust': {
        const fire = style === 'breath'
        sfx[fire ? 'fire' : 'gust']()
        const from = { x: f.x - f.w * 0.25, y: f.y - f.h * 0.7 }
        const to = this.chest(h)
        for (let i = 0; i < (this.reduced ? 14 : 40); i++)
          setTimeout(() => {
            if (this.dead) return
            const k = 0.8 + Math.random() * 0.4
            this.parts.push({
              kind: fire ? 'dot' : 'streak',
              x: from.x,
              y: from.y + (Math.random() - 0.5) * 6,
              vx: ((to.x - from.x) / 0.45) * k,
              vy: ((to.y - from.y) / 0.45) * k + (Math.random() - 0.5) * 40,
              ax: 0,
              ay: 0,
              life: 480,
              max: 480,
              c: fire
                ? ['#ffe070', '#ff9a20', '#ff4a20'][i % 3]
                : ['#e8c878', '#f4e0a0', '#c8a050'][i % 3],
              s: fire ? 2 : 6,
              front: true,
              seed: i,
            })
          }, i * 9)
        await this.wait(420)
        land()
        break
      }
      case 'swoop': {
        f.trail = 900
        sfx.jump()
        await this.to(f, { oy: -90, ox: -20 }, 260, outQuad)
        await this.to(f, { ox: reach, oy: -10 }, 200, inQuad)
        land()
        await this.wait(160)
        await this.to(f, { oy: -70, ox: reach * 0.5 }, 200)
        await this.to(f, { oy: 0, ox: 0 }, 260, inQuad)
        break
      }
      case 'suck': {
        sfx.gust()
        const at = this.gourdAt()
        this.fxs.push({
          t: 0,
          d: 700,
          front: true,
          draw: (g, k) => {
            const c = this.chest(h)
            g.globalAlpha = 0.8 * Math.sin(k * Math.PI)
            g.fillStyle = '#ffe080'
            for (let i = 0; i < 18; i++) {
              const q = (i / 18 + k * 2) % 1
              const x = c.x + (at.x - c.x) * q
              const y = c.y + (at.y - c.y) * q + Math.sin(q * 12 + k * 10) * 5
              g.fillRect(Math.round(x), Math.round(y), 1, 1)
            }
            g.globalAlpha = 1
          },
        })
        await this.to(h, { ox: 14, sx: 1.12, sy: 0.92 }, 400, inQuad)
        if (hit) {
          await this.to(
            h,
            {
              sx: 0.05,
              sy: 0.05,
              alpha: 0,
              ox: at.x - h.x,
              oy: at.y - h.y + 4,
            },
            260,
            inQuad,
          )
          f.wobble = 600
          await this.wait(500)
          h.ox = 0
          h.oy = 0
          h.alpha = 1
          await this.to(h, { sx: 1, sy: 1 }, 260, outBack)
          this.impact(h, dmg, false, ['#ffffff', '#ffe070', '#ff9a40'])
        } else {
          await this.to(h, { ox: -12, sx: 1, sy: 1 }, 160)
          this.sidestep(h)
          await this.to(h, { ox: 0 }, 200)
        }
        break
      }
      default: {
        f.trail = style === 'charge' ? 600 : 360
        sfx.swing()
        await this.to(
          f,
          { ox: reach, sx: 1.04, sy: 0.96 },
          style === 'charge' ? 220 : 170,
          inQuad,
        )
        if (style === 'claw') this.claws(h)
        if (style === 'charge') this.shake(3, 200)
        land()
        await this.wait(220)
        await this.to(f, { ox: 0, sx: 1, sy: 1 }, 300)
      }
    }
    await this.to(f, { ox: 0, sx: 1, sy: 1 }, 160)
  }

  private claws(target: Actor) {
    const c = this.chest(target)
    this.fxs.push({
      t: 0,
      d: 260,
      front: true,
      draw: (g, k) => {
        g.globalAlpha = 1 - k
        g.fillStyle = '#e8f0ff'
        for (let i = 0; i < 3; i++)
          for (let s = 0; s < 18 * Math.min(1, k * 3); s++)
            g.fillRect(
              Math.round(c.x + 8 - s * 0.8 + i * 5),
              Math.round(c.y - 10 + s),
              1,
              1,
            )
        g.globalAlpha = 1
      },
    })
  }

  private webbed() {
    const c = this.chest(this.hero)
    this.fxs.push({
      t: 0,
      d: 900,
      front: true,
      draw: (g, k) => {
        g.globalAlpha = 0.8 * (1 - k)
        g.strokeStyle = '#f0f0ff'
        g.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          g.moveTo(Math.round(c.x) + 0.5, Math.round(c.y) + 0.5)
          g.lineTo(
            Math.round(c.x + Math.cos(a) * 18) + 0.5,
            Math.round(c.y + Math.sin(a) * 22) + 0.5,
          )
        }
        g.stroke()
        g.globalAlpha = 1
      },
    })
  }

  async poisonTick(n: number) {
    for (let i = 0; i < 10; i++) this.bubble()
    this.hero.hurt = 200
    this.number(this.hero, String(n), '#7cff6a')
    sfx.hurt()
    await this.wait(500)
  }

  // The Fan's gust: the answers blow about
  gust() {
    sfx.gust()
    for (let i = 0; i < (this.reduced ? 10 : 30); i++)
      this.parts.push({
        kind: 'streak',
        x: this.W + 10,
        y: 20 + Math.random() * 130,
        vx: -260 - Math.random() * 140,
        vy: (Math.random() - 0.5) * 30,
        ax: 0,
        ay: 0,
        life: 1600,
        max: 1600,
        c: ['#fff6e0', '#ffd890', '#ff9a40'][i % 3],
        s: 4 + Math.floor(Math.random() * 8),
        front: true,
        seed: i,
        fade: false,
      })
  }

  // --- Items

  async heal(n: number, item: 'peach' | 'gourd') {
    const h = this.hero
    const ic = iconCanvas(item)
    const top = h.y - h.h - 14
    sfx.heal()
    await new Promise<void>((resolve) => {
      this.fxs.push({
        t: 0,
        d: 700,
        front: true,
        draw: (g, k) => {
          if (!ic) return
          const y =
            top -
            Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * 8 +
            Math.max(0, k - 0.6) * 60
          g.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1
          g.drawImage(ic, Math.round(h.x + h.ox) - 9, Math.round(y))
          g.globalAlpha = 1
        },
      })
      void this.wait(700).then(resolve)
    })
    for (let i = 0; i < 18; i++)
      this.parts.push({
        kind: 'spark',
        x: h.x + (Math.random() - 0.5) * 40,
        y: h.y - Math.random() * h.h,
        vx: 0,
        vy: -20 - Math.random() * 20,
        ax: 0,
        ay: 0,
        life: 900,
        max: 900,
        c: i % 2 ? '#9cff8a' : '#ffffff',
        s: 1,
        front: true,
        seed: i,
      })
    this.number(h, `+${n}`, '#9cff8a')
    await this.wait(400)
  }

  // The pig eats one of your peaches
  async eatPeach() {
    const ic = iconCanvas('peach')
    const from = this.chest(this.hero)
    const f = this.foe
    const to = { x: f.x + f.ox - f.w * 0.15, y: f.y - f.h * 0.75 }
    await new Promise<void>((resolve) => {
      this.fxs.push({
        t: 0,
        d: 600,
        front: true,
        draw: (g, k) => {
          if (!ic) return
          const x = from.x + (to.x - from.x) * k
          const y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 24
          g.drawImage(ic, Math.round(x) - 9, Math.round(y) - 9)
        },
      })
      void this.wait(600).then(resolve)
    })
    this.call(f, 'YUM', '#f6a7b8')
    f.wobble = 300
    await this.to(f, { sy: 1.06, sx: 1.06 }, 120)
    await this.to(f, { sy: 1, sx: 1 }, 200, outBack)
  }

  calm(on: boolean) {
    this.calmed = on ? 1 : 0
    if (on) {
      sfx.magic()
      const c = this.chest(this.hero)
      this.fxs.push({
        t: 0,
        d: 700,
        front: true,
        draw: (g, k) => {
          g.globalAlpha = 1 - k
          g.strokeStyle = '#8fd0f0'
          g.beginPath()
          g.ellipse(
            Math.round(c.x) + 0.5,
            Math.round(c.y) + 0.5,
            10 + k * 80,
            6 + k * 40,
            0,
            0,
            Math.PI * 2,
          )
          g.stroke()
          g.globalAlpha = 1
        },
      })
    }
  }

  // The life-saving hairs: Wukong rises again
  async revive(n: number) {
    const h = this.hero
    sfx.magic()
    this.fxs.push({
      t: 0,
      d: 1200,
      front: true,
      draw: (g, k) => {
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = Math.sin(k * Math.PI) * 0.9
        g.drawImage(
          blob(14, 70, '#fff2a0', 0.8),
          Math.round(h.x) - 14,
          GROUND - 130,
        )
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      },
    })
    h.sy = 0.55
    h.rot = 0
    await this.to(h, { sy: 1, alpha: 1, shade: 0 }, 600, outBack)
    this.number(h, `+${n}`, '#ffe066', true)
    await this.wait(500)
  }

  // --- Endings

  async victory() {
    const f = this.foe
    this.menace(false)
    if (this.twist === 'trap' && !this.cymbalsGone) await this.breakOut()
    if (this.twist === 'disguise' && f.pics.true) {
      // the true shape, for a moment
      f.flash = 200
      f.pose = 'true'
      sfx.zap()
      await this.wait(600)
    }
    for (let i = 0; i < 3; i++) {
      f.flash = 90
      await this.wait(140)
    }
    this.talisman = 0
    this.giant = 0
    f.frozen = false
    const demon = this.cast?.demon
    if (demon === 'pig' || demon === 'sand') await this.joins(f)
    else if (demon === 'horn') await this.intoGourd(f)
    else if (demon === 'spirit') await this.sinks(f)
    else {
      this.dissolve(f, this.twist === 'disguise')
      sfx.gong()
      f.visible = false
    }
    await this.wait(300)
    const h = this.hero
    h.pose = 'strike'
    await this.to(h, { oy: -24, sy: 1.08, sx: 0.94 }, 200)
    await this.to(h, { oy: 0, sy: 1, sx: 1 }, 220, inQuad)
    // the cudgel across his shoulders, as he likes to stand
    h.pose = 'win'
    void this.to(this.monk, { oy: -6 }, 150).then(() =>
      this.to(this.monk, { oy: 0 }, 200, inQuad),
    )
    for (const m of this.mates)
      void this.to(m.a, { oy: -5 }, 170).then(() =>
        this.to(m.a, { oy: 0 }, 200, inQuad),
      )
    await this.wait(500)
  }

  // The pig and Sha Wujing are not killed: they kneel, and come over to
  // the master
  private async joins(f: Actor) {
    sfx.gong()
    await this.to(f, { sy: 0.82, sx: 1.08 }, 220)
    await this.wait(500)
    await this.to(f, { sy: 1, sx: 1 }, 200, outBack)
    f.rate = 3
    f.bob = 3
    const to = Math.max(12, this.monk.x - 24) - f.x
    await this.to(f, { ox: to, oy: -6 }, 1500, linear)
    f.flip = true
    f.rate = 0.8
    f.bob = 0.8
    f.shade = 0.1
  }

  // Silver Horn answers to his name, and the gourd draws him in
  private async intoGourd(f: Actor) {
    const h = this.hero
    const at = { x: h.x + 14, y: GROUND - h.h - 18 }
    const ic = iconCanvas('gourd')
    this.fxs.push({
      t: 0,
      d: 1600,
      front: true,
      draw: (g, k) => {
        if (!ic) return
        g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : Math.min(1, k * 5)
        g.drawImage(ic, Math.round(at.x) - 9, Math.round(at.y) - 9)
        g.globalAlpha = 1
      },
    })
    sfx.gust()
    await this.wait(250)
    this.fxs.push({
      t: 0,
      d: 800,
      front: true,
      draw: (g, k) => {
        const c = this.chest(f)
        g.globalAlpha = 0.9 * Math.sin(k * Math.PI)
        g.fillStyle = '#ffe080'
        for (let i = 0; i < 24; i++) {
          const q = (i / 24 + k * 2) % 1
          g.fillRect(
            Math.round(c.x + (at.x - c.x) * q),
            Math.round(c.y + (at.y - c.y) * q + Math.sin(q * 14 + k * 9) * 6),
            1,
            1,
          )
        }
        g.globalAlpha = 1
      },
    })
    await this.to(
      f,
      { sx: 0.04, sy: 0.04, alpha: 0.2, ox: at.x - f.x, oy: at.y - f.y + 6 },
      750,
      inQuad,
    )
    f.visible = false
    sfx.gong()
    this.sparks(at.x, at.y, 18, ['#ffe070', '#ffffff', '#c8372d'], 60)
  }

  // The mountain spirit sinks back into the stone
  private async sinks(f: Actor) {
    sfx.gong()
    for (let i = 0; i < (this.reduced ? 6 : 18); i++)
      this.parts.push({
        kind: 'blob',
        x: f.x + (Math.random() - 0.5) * f.w,
        y: GROUND - Math.random() * 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -4 - Math.random() * 8,
        ax: 0,
        ay: 0,
        life: 1600,
        max: 1600,
        c: '#b8a07a',
        s: 6,
        front: true,
        drag: 1,
        seed: i,
        img: soft(6 + (i % 4), 4, '#b8a07a'),
      })
    this.shake(2, 900)
    await this.to(f, { sy: 0.02, alpha: 0.5 }, 1100, inQuad)
    f.visible = false
  }

  private async breakOut() {
    // a horn through the cymbals, and Wukong out through its tip
    const cx = this.hero.x
    await new Promise<void>((resolve) => {
      this.fxs.push({
        t: 0,
        d: 600,
        front: true,
        draw: (g, k) => {
          const len = Math.round(60 * Math.min(1, k * 1.6))
          g.fillStyle = '#e8d8b0'
          for (let i = 0; i < len; i++) {
            const w = Math.max(1, Math.round(4 - (i / 60) * 3))
            g.fillRect(cx + 2 - w, GROUND - 120 + i, w * 2, 1)
          }
        },
      })
      void this.wait(600).then(resolve)
    })
    sfx.clang()
    this.cymbalsGone = true
    this.hero.shade = 0
    this.sparks(cx, GROUND - 50, 30, ['#f2c14e', '#fff2a0', '#c99a2e'], 120)
    this.shake(4, 300)
    this.hero.oy = -40
    await this.to(this.hero, { oy: 0 }, 300, inQuad)
  }

  // A demon crumbles into its pixels
  private dissolve(a: Actor, fall: boolean) {
    const p = a.pic
    if (!p) return
    const left = a.x + a.ox - p.w / 2
    const top = a.y + a.oy - p.h
    const dots = this.reduced ? p.dots.filter((_, i) => i % 3 === 0) : p.dots
    for (const [x, y, c] of dots) {
      const px = a.flip ? left + (p.w - 1 - x) : left + x
      this.parts.push({
        kind: 'dot',
        x: px,
        y: top + y,
        vx: (Math.random() - 0.5) * 30,
        vy: fall
          ? 10 + Math.random() * 30
          : -10 - Math.random() * 40 * (1 - y / p.h),
        ax: 0,
        ay: fall ? 260 : -20,
        life: 500 + Math.random() * 900 + (fall ? 0 : (p.h - y) * 4),
        max: 1600,
        c: fall && Math.random() < 0.5 ? '#f0ece0' : c,
        s: 2,
        front: true,
        seed: x + y,
      })
    }
  }

  // What the chapter's first win brings, rising where the demon stood
  async treasure(icon: string) {
    const ic = iconCanvas(icon)
    if (!ic) return
    const x = this.foe.x
    sfx.magic()
    this.fxs.push({
      t: 0,
      d: 2600,
      front: true,
      draw: (g, k) => {
        const rise = outQuad(Math.min(1, k * 2.5))
        const y = GROUND - 12 - rise * 46 + Math.sin(k * 14) * 1.5
        g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1
        g.globalCompositeOperation = 'lighter'
        g.drawImage(
          blob(14, 14, '#fff2a0', 0.7),
          Math.round(x) - 14,
          Math.round(y) - 14,
        )
        g.globalCompositeOperation = 'source-over'
        g.drawImage(ic, Math.round(x) - 9, Math.round(y) - 9)
        g.globalAlpha = 1
      },
    })
    for (let i = 0; i < 16; i++)
      this.parts.push({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * 20,
        y: GROUND - 10,
        vx: (Math.random() - 0.5) * 30,
        vy: -30 - Math.random() * 50,
        ax: 0,
        ay: 20,
        life: 1200,
        max: 1200,
        c: i % 2 ? '#ffe070' : '#ffffff',
        s: 1,
        front: true,
        seed: i,
      })
    await this.wait(900)
  }

  async defeat() {
    const h = this.hero
    const f = this.foe
    sfx.fall()
    h.hurt = 600
    h.bob = 0
    // he topples over backwards, and lies still
    await this.to(h, { rot: -Math.PI / 2, shade: 0.35 }, 420, inQuad)
    this.sparks(h.x - h.h * 0.6, GROUND - 4, 10, ['#d8c8a0', '#a89070'], 40)
    this.shake(2, 160)
    f.rate = 4
    f.bob = 3
    await this.wait(400)
    // the demon carries the monk off
    const m = this.monk
    await this.to(m, { ox: f.x - m.x - 20, oy: -10 }, 600, inOut)
    await Promise.all([
      this.to(f, { ox: this.W }, 900, inQuad),
      this.to(m, { ox: f.x - m.x - 20 + this.W }, 900, inQuad),
    ])
  }
}
