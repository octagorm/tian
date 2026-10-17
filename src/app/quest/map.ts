import { canvas, ctx2d, loadPic } from './art'
import { walkerCanvas } from './walkers'
import type { Pic } from './art'

// The road west as a map: a painted 500 × 200 map of the lands from China
// to India, seen through a window as wide as the screen allows, with the
// route drawn on it in red as far as the party has come (as on the travel
// maps of the old Indiana Jones games) and dotted beyond. The chapters are
// stops on it; the party walks from one to the next, and the window
// follows them.

export const MAP_H = 200
const MAP_W = 500

// Each chapter's place on the map, from the east (right) to the west
export const STOPS: Record<string, [number, number] | undefined> = {
  q1: [455, 166],
  q10: [466, 102],
  q3: [424, 62],
  q11: [400, 116],
  q2: [352, 158],
  q12: [334, 82],
  q4: [250, 128],
  q7: [193, 100],
  q8: [160, 62],
  q6: [236, 40],
  q9: [182, 24],
  q5: [114, 82],
  q13: [96, 150],
}
// Vulture Peak, where the scriptures are
const GOAL: [number, number] = [48, 38]

export interface MapState {
  ids: Array<string>
  won: Array<boolean>
  open: Array<boolean>
  stars: Array<number>
  selected: number
  // The party has come this far (the red line)
  reached: number
  party: Array<'monk' | 'pig' | 'sand'>
  done: boolean
}

// A Catmull-Rom curve through the stops, as a dense line with the
// distance along it at each point
function route(pts: Array<[number, number]>) {
  const line: Array<{ x: number; y: number; s: number }> = []
  const at: Array<number> = []
  let s = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    at.push(s)
    for (let k = 0; k < 32; k++) {
      const t = k / 32
      const t2 = t * t
      const t3 = t2 * t
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      const prev = line.at(-1)
      if (prev) s += Math.hypot(x - prev.x, y - prev.y)
      line.push({ x, y, s })
    }
  }
  const last = pts[pts.length - 1]
  const prev = line.at(-1)
  if (prev) s += Math.hypot(last[0] - prev.x, last[1] - prev.y)
  line.push({ x: last[0], y: last[1], s })
  at.push(s)
  return { line, at, length: s }
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

export class WorldMap {
  W = 320
  private g: CanvasRenderingContext2D
  private map: Pic | null = null
  private state: MapState | null = null
  private path = route([[0, 0]])
  // Where the party is, as a distance along the route, and where it goes
  private pos = -1
  private target = 0
  private speed = 60
  private facing = -1
  private camera = -1
  private t = 0
  private last = 0
  private raf = 0
  private running = false
  private visible = true
  private dead = false
  private reduced: boolean
  onArrive: ((i: number) => void) | null = null
  // A few birds crossing the map, west to east and back
  private birds = Array.from({ length: 3 }, (_, i) => ({
    x: Math.random() * MAP_W,
    y: 20 + i * 45 + Math.random() * 20,
    v: (i % 2 ? -1 : 1) * (7 + Math.random() * 5),
    phase: Math.random() * 6,
  }))

  constructor(c: HTMLCanvasElement, reduced: boolean) {
    this.g = ctx2d(c)
    this.reduced = reduced
    void loadPic('map').then((p) => {
      this.map = p
      this.draw()
    })
  }

  set(state: MapState) {
    const first = !this.state
    this.state = state
    const pts = state.ids.map((id) => STOPS[id] ?? GOAL)
    this.path = route([...pts, GOAL])
    const i = Math.max(0, state.selected)
    this.target = this.path.at[i]
    if (first || this.pos < 0) {
      this.pos = this.path.at[Math.max(0, state.reached)]
      this.camera = -1
    }
    const dist = Math.abs(this.target - this.pos)
    this.speed = Math.max(50, dist / 2.2)
    if (this.reduced) this.pos = this.target
    this.draw()
  }

  // Walk from a stop, as after a fight, to the one selected
  from(i: number) {
    this.pos = this.path.at[Math.max(0, Math.min(i, this.path.at.length - 1))]
    this.camera = -1
    if (this.state) this.set(this.state)
  }

  resize(W: number) {
    this.W = W
    this.g.imageSmoothingEnabled = false
    this.camera = -1
    this.draw()
  }

  // The stop under a point of the canvas (0–1 across and down), if any
  hit(fx: number, fy: number): number {
    const x = this.cam() + fx * this.W
    const y = fy * MAP_H
    let best = -1
    let bestD = 16
    this.state?.ids.forEach((id, i) => {
      const p = STOPS[id]
      if (!p) return
      const d = Math.hypot(p[0] - x, p[1] - y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }

  start() {
    if (this.running || this.dead) return
    this.running = true
    this.last = 0
    this.raf = requestAnimationFrame(this.loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  setVisible(v: boolean) {
    this.visible = v
    if (v && this.running) {
      cancelAnimationFrame(this.raf)
      this.last = 0
      this.raf = requestAnimationFrame(this.loop)
    }
  }

  destroy() {
    this.dead = true
    this.stop()
  }

  private loop = (now: number) => {
    if (!this.running || !this.visible) return
    const dt = Math.min(50, now - (this.last || now))
    this.last = now
    this.step(dt)
    this.draw()
    this.raf = requestAnimationFrame(this.loop)
  }

  private step(dt: number) {
    this.t += dt
    for (const b of this.birds) {
      b.x += (b.v * dt) / 1000
      if (b.x > MAP_W + 20) b.x = -20
      if (b.x < -20) b.x = MAP_W + 20
    }
    const d = this.target - this.pos
    if (Math.abs(d) > 0.5) {
      const move =
        Math.sign(d) * Math.min(Math.abs(d), (this.speed * dt) / 1000)
      this.pos += move
      const a = this.point(this.pos)
      const b = this.point(this.pos + Math.sign(d) * 2)
      if (Math.abs(b.x - a.x) > 0.3) this.facing = b.x < a.x ? -1 : 1
      if (Math.abs(this.target - this.pos) <= 0.5) {
        this.pos = this.target
        if (this.state) this.onArrive?.(this.state.selected)
      }
    }
  }

  private walking() {
    return Math.abs(this.target - this.pos) > 0.5
  }

  private point(s: number) {
    const line = this.path.line
    const k = Math.max(0, Math.min(this.path.length, s))
    let lo = 0
    let hi = line.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (line[mid].s < k) lo = mid
      else hi = mid
    }
    const a = line[lo]
    const b = line[hi]
    const f = b.s > a.s ? (k - a.s) / (b.s - a.s) : 0
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
  }

  private cam() {
    const p = this.point(this.walking() ? this.pos : this.target)
    const want = Math.max(0, Math.min(MAP_W - this.W, p.x - this.W / 2))
    if (this.camera < 0 || this.reduced) this.camera = want
    else this.camera += (want - this.camera) * 0.08
    return Math.round(this.camera)
  }

  draw() {
    const g = this.g
    const W = this.W
    const cx = this.cam()
    g.save()
    g.clearRect(0, 0, W, MAP_H)
    if (this.map) g.drawImage(this.map.c, -cx, 0)
    else {
      g.fillStyle = '#c8b48a'
      g.fillRect(0, 0, W, MAP_H)
    }
    g.translate(-cx, 0)
    if (!this.reduced) this.drawBirds()
    const st = this.state
    if (st) {
      this.drawRoute(st)
      this.drawGoal(st)
      st.ids.forEach((_, i) => this.drawStop(st, i))
      this.drawParty(st)
    }
    g.restore()
  }

  private drawBirds() {
    const g = this.g
    g.fillStyle = '#2a2026'
    for (const b of this.birds) {
      const x = Math.round(b.x)
      const y = Math.round(b.y + Math.sin(this.t / 900 + b.phase) * 3)
      const up = Math.sin(this.t / 140 + b.phase) > 0
      g.fillRect(x, y, 1, 1)
      g.fillRect(x - 1, y - (up ? 1 : 0), 1, 1)
      g.fillRect(x + 1, y - (up ? 1 : 0), 1, 1)
      g.fillRect(x - 2, y - (up ? 2 : 0), 1, 1)
      g.fillRect(x + 2, y - (up ? 2 : 0), 1, 1)
    }
  }

  private drawRoute(st: MapState) {
    const g = this.g
    const done = Math.max(this.path.at[Math.max(0, st.reached)], this.pos)
    for (const p of this.path.line) {
      const x = Math.round(p.x)
      const y = Math.round(p.y)
      const dash = Math.floor(p.s / 3) % 2 === 0
      if (p.s <= done + 0.5) {
        if (!dash) continue
        g.fillStyle = '#3a0c08'
        g.fillRect(x, y + 1, 2, 2)
        g.fillStyle = '#d8402e'
        g.fillRect(x, y, 2, 2)
      } else if (Math.floor(p.s / 2) % 3 === 0) {
        g.fillStyle = 'rgba(27, 20, 24, 0.55)'
        g.fillRect(x, y + 1, 1, 1)
        g.fillStyle = '#fff2d0'
        g.fillRect(x, y, 1, 1)
      }
    }
  }

  private drawGoal(st: MapState) {
    const g = this.g
    const [x, y] = GOAL
    const pulse = 0.6 + 0.4 * Math.sin(this.t / 500)
    g.globalAlpha = st.done ? 0.9 : 0.45 * pulse
    g.drawImage(blobCanvas(12, 12, '#fff2b0', 0.8), x - 12, y - 12)
    g.globalAlpha = 1
    if (st.done) star(g, x, y - 10, '#ffe070')
  }

  private drawStop(st: MapState, i: number) {
    const g = this.g
    const p = STOPS[st.ids[i]]
    if (!p) return
    const [x, y] = p
    const sel = i === st.selected
    if (st.won[i]) {
      // a red seal with the stars won above it
      g.fillStyle = '#1b1418'
      g.fillRect(x - 3, y - 3, 7, 7)
      g.fillStyle = '#c8372d'
      g.fillRect(x - 2, y - 2, 5, 5)
      g.fillStyle = '#ff8a6a'
      g.fillRect(x - 1, y - 1, 1, 1)
      for (let k = 0; k < st.stars[i]; k++) {
        g.fillStyle = '#1b1418'
        g.fillRect(x - 4 + k * 3, y - 7, 3, 3)
        g.fillStyle = '#ffe070'
        g.fillRect(x - 3 + k * 3, y - 6, 1, 1)
      }
    } else if (st.open[i]) {
      // the next stop: a flag that waves
      const wave = Math.floor(this.t / 220) % 2
      g.fillStyle = '#1b1418'
      g.fillRect(x - 1, y - 11, 3, 13)
      g.fillStyle = '#e8d8b0'
      g.fillRect(x, y - 10, 1, 11)
      g.fillStyle = '#1b1418'
      g.fillRect(x + 1, y - 11, 8, 6)
      g.fillStyle = '#e0332a'
      g.fillRect(x + 1, y - 10, 6 + wave, 4)
      g.fillStyle = '#f2c14e'
      g.fillRect(x + 2, y - 9, 2, 2)
    } else {
      g.fillStyle = '#1b1418'
      g.fillRect(x - 2, y - 2, 5, 5)
      g.fillStyle = '#8a8296'
      g.fillRect(x - 1, y - 1, 3, 3)
    }
    if (sel) {
      const bob = this.reduced ? 0 : Math.round(Math.sin(this.t / 200) * 1.5)
      const ty = y - (st.won[i] ? 12 : st.open[i] ? 17 : 8) + bob
      g.fillStyle = '#1b1418'
      g.fillRect(x - 4, ty - 4, 9, 3)
      g.fillRect(x - 3, ty - 1, 7, 2)
      g.fillRect(x - 2, ty + 1, 5, 1)
      g.fillStyle = '#ffe070'
      g.fillRect(x - 3, ty - 3, 7, 1)
      g.fillRect(x - 2, ty - 2, 5, 1)
      g.fillRect(x - 1, ty - 1, 3, 1)
      g.fillRect(x, ty, 1, 1)
      // a ring on the ground
      g.globalAlpha = 0.7
      g.strokeStyle = '#fff2b0'
      g.beginPath()
      g.ellipse(x + 0.5, y + 1.5, 7, 3, 0, 0, Math.PI * 2)
      g.stroke()
      g.globalAlpha = 1
    }
  }

  private drawParty(st: MapState) {
    const g = this.g
    const walking = this.walking()
    const step = walking && Math.floor(this.t / 160) % 2 ? 1 : 0
    const order: Array<'wukong' | 'monk' | 'pig' | 'sand'> = [
      'wukong',
      'monk',
      ...st.party.filter((p): p is 'pig' | 'sand' => p !== 'monk'),
    ]
    // the last walks first, so the leader is drawn on top
    const dir = this.target >= this.pos ? 1 : -1
    for (let k = order.length - 1; k >= 0; k--) {
      const s = this.pos - dir * k * 11
      const p = this.point(s)
      const c = walkerCanvas(order[k], (step + k) % 2 === 0 ? 0 : 1)
      if (!c) continue
      const hop = walking && !this.reduced && (step + k) % 2 ? 1 : 0
      const x = Math.round(p.x - c.width / 2)
      const y = Math.round(p.y - c.height + 2 - hop)
      g.globalAlpha = 0.35
      g.fillStyle = '#1b1418'
      g.fillRect(Math.round(p.x) - 4, Math.round(p.y) + 1, 9, 2)
      g.globalAlpha = 1
      if (this.facing > 0) {
        g.save()
        g.translate(x + c.width, y)
        g.scale(-1, 1)
        g.drawImage(c, 0, 0)
        g.restore()
      } else g.drawImage(c, x, y)
    }
  }
}

function star(g: CanvasRenderingContext2D, x: number, y: number, c: string) {
  g.fillStyle = '#1b1418'
  g.fillRect(x - 3, y - 1, 7, 3)
  g.fillRect(x - 1, y - 3, 3, 7)
  g.fillStyle = c
  g.fillRect(x - 2, y, 5, 1)
  g.fillRect(x, y - 2, 1, 5)
}

const blobs = new Map<string, HTMLCanvasElement>()
function blobCanvas(rx: number, ry: number, color: string, a: number) {
  const key = `${rx}|${ry}|${color}|${a}`
  const hit = blobs.get(key)
  if (hit) return hit
  const c = canvas(rx * 2 + 1, ry * 2 + 1)
  const g = ctx2d(c)
  g.fillStyle = color
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) {
      const d = Math.sqrt((x * x) / (rx * rx) + (y * y) / (ry * ry))
      if (d > 1) continue
      const amount = a * (1 - d * d)
      if ((BAYER[(y + 64) % 4][(x + 64) % 4] + 0.5) / 16 < amount)
        g.fillRect(x + rx, y + ry, 1, 1)
    }
  blobs.set(key, c)
  return c
}
