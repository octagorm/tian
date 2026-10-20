import { PALETTE, SPRITES } from '../pixel/sprites'

// The dumpling stall, seen from behind the counter at dusk: the picture
// (public/art/games/stall.png, 320 × 180) on a canvas of its own
// size, scaled up unsmoothed, with steam rising from the bamboo steamers
// and the pot, coals glowing under the wok, the lanterns breathing, the
// customer at the counter (public/art/games/customers.png, eight
// busts in cells of 77 × 90) and the tray filling on the counter.

export const W = 320
export const H = 180
const CELL_W = 77
const CELL_H = 90
// the counter's top edge, and the stretch of it the customer stands behind
const COUNTER = 144
const OPEN_X0 = 88
const OPEN_X1 = 244
// where the customer stands, the middle of them
const STAND_X = 168
const STAND_BOTTOM = 161
// the tray on the counter, its top edge
const TRAY_Y = 155

export type Mood = 'away' | 'enter' | 'wait' | 'happy' | 'cross' | 'leave'

export interface ShopView {
  // which bust, 0–7
  who: number
  mood: Mood
  // when the mood began (performance.now())
  since: number
  // which side they come from, -1 left or 1 right
  side: number
  // sprites on the tray, in the order put there, with when
  tray: Array<{ sprite: string; at: number }>
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

interface Puff {
  x: number
  y: number
  vx: number
  born: number
  life: number
  size: number
}

const EMITTERS: Array<[number, number, number]> = [
  // x, y, how thick
  [20, 89, 1],
  [58, 104, 0.8],
  [66, 125, 1],
  [255, 128, 0.5],
  [286, 113, 0.7],
]

const sprites = new Map<string, HTMLCanvasElement>()
function spriteCanvas(name: string): HTMLCanvasElement | null {
  const hit = sprites.get(name)
  if (hit) return hit
  const sp = SPRITES[name]
  if (!sp) return null
  const c = document.createElement('canvas')
  c.width = sp.rows[0].length
  c.height = sp.rows.length
  const g = c.getContext('2d')!
  sp.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = sp.pal?.[row[x]] ?? PALETTE[row[x]]
      if (row[x] === '.' || !col) continue
      g.fillStyle = col
      g.fillRect(x, y, 1, 1)
    }
  })
  sprites.set(name, c)
  return c
}

export function shopScene(
  canvas: HTMLCanvasElement,
  stall: HTMLImageElement,
  people: HTMLImageElement,
  still: boolean,
) {
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  g.imageSmoothingEnabled = false
  const puffs: Array<Puff> = []
  let lastSpawn = 0

  const dot = (x: number, y: number, c: string) => {
    g.fillStyle = c
    g.fillRect(Math.round(x), Math.round(y), 1, 1)
  }

  // A disc of steam, a scanline at a time so its edge stays a pixel edge,
  // faint enough that many make a cloud; its rim is dithered away
  const puff = (cx: number, cy: number, r: number, a: number) => {
    if (a <= 0) return
    g.fillStyle = '#fbf3e6'
    g.globalAlpha = Math.min(1, a)
    const rr = Math.ceil(r)
    for (let y = -rr; y <= rr; y++) {
      const hw = Math.sqrt(Math.max(0, r * r - y * y))
      const py = Math.round(cy + y)
      const x0 = Math.round(cx - hw)
      const x1 = Math.round(cx + hw)
      if (x1 - x0 > 2) g.fillRect(x0 + 1, py, x1 - x0 - 1, 1)
      // the two ends of the line, dithered
      for (const x of [x0, x1]) {
        const t = (BAYER[((py % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16
        if (t < 0.5) g.fillRect(x, py, 1, 1)
      }
    }
    g.globalAlpha = 1
  }

  const steam = (now: number) => {
    if (now - lastSpawn > 110) {
      lastSpawn = now
      for (const [x, y, k] of EMITTERS)
        if (Math.random() < 0.7 * k)
          puffs.push({
            x: x + (Math.random() - 0.5) * 10,
            y,
            vx: (Math.random() - 0.5) * 3,
            born: now,
            life: 1900 + Math.random() * 1500,
            size: 2 + Math.random() * 2,
          })
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]
      const age = (now - p.born) / p.life
      if (age >= 1) {
        puffs.splice(i, 1)
        continue
      }
      const t = (now - p.born) / 1000
      const x = p.x + p.vx * t + Math.sin(t * 2 + p.born) * 2.5
      const y = p.y - t * 10
      // thickens as it leaves the steamer, then thins away
      const a = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85
      puff(x, y, p.size + age * 6, 0.22 * a)
    }
  }

  const coals = (now: number) => {
    const n = 14
    for (let i = 0; i < n; i++) {
      const x = 281 + Math.random() * 17
      const y = 141 + Math.random() * 8
      dot(
        x,
        y,
        Math.random() < 0.5
          ? '#ffcf5a'
          : Math.random() < 0.5
            ? '#ff8a2a'
            : '#ffefb0',
      )
    }
    // the glow on the wok's underside
    const a = 0.16 + 0.06 * Math.sin(now / 90) + 0.04 * Math.sin(now / 37)
    glow(289, 141, 18, `rgba(255, 140, 40, ${a})`)
  }

  const glow = (x: number, y: number, r: number, c: string) => {
    g.globalCompositeOperation = 'lighter'
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, c)
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
    g.globalCompositeOperation = 'source-over'
  }

  const lanterns = (now: number) => {
    const a = 0.13 + 0.05 * Math.sin(now / 700)
    glow(32, 23, 26, `rgba(255, 120, 60, ${a})`)
    glow(290, 23, 26, `rgba(255, 120, 60, ${a * 0.9})`)
  }

  // Where the customer is and how they move: sliding in from a side as
  // they come up, a hop when pleased, a shake when not, off the other way
  const customer = (now: number, v: ShopView) => {
    if (v.mood === 'away') return
    const t = (now - v.since) / 1000
    let dx = 0
    let dy = 0
    let alpha = 1
    const walk = (k: number) => Math.sin(k * Math.PI * 6) * 1.2
    if (v.mood === 'enter' && t < 0.75 && !still) {
      const k = t / 0.75
      const e = 1 - (1 - k) ** 3
      dx = v.side * 38 * (1 - e)
      dy = -Math.abs(walk(k)) * (1 - k)
      alpha = Math.min(1, k * 2.2)
    } else if (v.mood === 'wait' || v.mood === 'enter') {
      dy = still ? 0 : Math.round(Math.sin(t * 2.2) * 0.6)
    } else if (v.mood === 'happy') {
      const hop = Math.max(0, Math.sin(Math.min(1, t / 0.5) * Math.PI * 2))
      dy = still ? 0 : -hop * 4
    } else if (v.mood === 'cross') {
      dx = still ? 0 : Math.sin(t * 40) * 2 * Math.max(0, 1 - t / 0.45)
    } else {
      const k = still ? 1 : Math.min(1, t / 0.7)
      dx = -v.side * 40 * k * k
      dy = -Math.abs(walk(k))
      alpha = Math.max(0, 1 - k * 1.6)
    }
    if (alpha <= 0) return
    g.globalAlpha = alpha
    g.drawImage(
      people,
      v.who * CELL_W,
      0,
      CELL_W,
      CELL_H,
      Math.round(STAND_X - CELL_W / 2 + dx),
      Math.round(STAND_BOTTOM - CELL_H + dy),
      CELL_W,
      CELL_H,
    )
    g.globalAlpha = 1
    // a sparkle when pleased, a puff of temper when not
    if (v.mood === 'happy' && t < 1.2 && !still)
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + i * 2.1
        const sx = STAND_X + Math.cos(a) * 26
        const sy = STAND_BOTTOM - CELL_H + 6 - t * 8 + Math.sin(a) * 6
        dot(sx, sy, '#fff3a0')
        dot(sx + 1, sy, '#f2c14e')
        dot(sx - 1, sy, '#f2c14e')
        dot(sx, sy + 1, '#f2c14e')
        dot(sx, sy - 1, '#f2c14e')
      }
    if (v.mood === 'cross' && t < 1.4 && !still)
      for (let i = 0; i < 3; i++)
        puff(
          STAND_X + 20 + i * 4,
          STAND_BOTTOM - CELL_H + 6 - t * 7 - i * 3,
          2 + t * 2 + i,
          0.5 * (1 - t / 1.4),
        )
  }

  // The tray in the middle of the counter, the dishes on it in rows
  const tray = (now: number, v: ShopView) => {
    if (v.mood === 'away' && !v.tray.length) return
    const n = v.tray.length
    const perRow = 7
    const rows = Math.max(1, Math.ceil(n / perRow))
    const w = Math.min(n, perRow) * 13 + 10
    const tw = Math.max(46, w)
    const tx = Math.round(STAND_X - tw / 2)
    const ty = TRAY_Y
    // the tray: dark wood with a lighter rim
    g.fillStyle = '#3a2214'
    g.fillRect(tx, ty, tw, 9)
    g.fillStyle = '#6e4326'
    g.fillRect(tx + 1, ty, tw - 2, 1)
    g.fillStyle = '#24140b'
    g.fillRect(tx, ty + 9, tw, 1)
    v.tray.forEach((it, i) => {
      const c = spriteCanvas(it.sprite)
      if (!c) return
      const row = Math.floor(i / perRow)
      const col = i % perRow
      const k = still ? 1 : Math.min(1, (now - it.at) / 260)
      // drops in, with a little bounce
      const fall = (1 - k) * -14 + (k < 1 ? Math.sin(k * Math.PI) * -2 : 0)
      const x = tx + 5 + col * 13
      const y = ty - 8 - (rows - 1 - row) * 7 + fall
      g.drawImage(c, Math.round(x), Math.round(y))
    })
  }

  const draw = (now: number, v: ShopView) => {
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.drawImage(stall, 0, 0)
    if (!still) {
      lanterns(now)
      coals(now)
    }
    customer(now, v)
    // the counter in front of them
    g.drawImage(
      stall,
      OPEN_X0,
      COUNTER,
      OPEN_X1 - OPEN_X0,
      H - COUNTER,
      OPEN_X0,
      COUNTER,
      OPEN_X1 - OPEN_X0,
      H - COUNTER,
    )
    tray(now, v)
    if (!still) steam(now)
  }

  return { draw }
}

// Where the customer's head is, as fractions of the scene, for the speech
// bubble and the coins
export const HEAD = { x: STAND_X / W, y: (STAND_BOTTOM - CELL_H + 18) / H }
export const TRAY = { x: STAND_X / W, y: TRAY_Y / H }
