import { box, dith, glow, hash, puff, px } from './ambient'
import type { G, Layer } from './ambient'

// Things in a scene that are drawn, not painted, because they move: a
// panda at its bamboo, a bamboo raft, a taxi and the street going by, a
// metro train, boats, a hotpot on the boil, a video call, and the
// fireworks and sky lanterns that end a scene.

// A sprite from rows of letters ('.' is clear), as in Magnio
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
      const c = pal[row[i]]
      if (!c) continue
      g.fillStyle = c
      g.fillRect(
        Math.round(x) + (flip ? w - 1 - i : i),
        Math.round(y) + j,
        1,
        1,
      )
    }
  })
}

// --- A panda, sitting up and eating bamboo ---

const PANDA_BODY = [
  '..KK.......KK...',
  '.KKKWWWWWWWKKK..',
  '..WWWWWWWWWWW...',
  '.WWKKWWWWWKKWW..',
  '.WKKEKWWWKEKKW..',
  '.WWKKWWNWWKKWW..',
  '..WWWWWMWWWWW...',
  '...WWWWWWWWW....',
  '..KKKWWWWWKKK...',
  '.KKKKWWWWWKKKK..',
  'KKKKWWWWWWWKKKK.',
  'KKKWWWWWWWWWKKK.',
  '.KWWWWWWWWWWWK..',
  '..WWWWWWWWWWW...',
  '.KKKWWWWWWWKKK..',
  'KKKKKWWWWWKKKKK.',
  'KPPKK.....KKPPK.',
]

export function panda(o: { x: number; y: number }): Layer {
  return ({ g, t }) => {
    const cycle = t % 5.2
    // raise the bamboo, chew, lower it
    const up = cycle < 3.4
    const chew = up && Math.floor(t * 4) % 2 === 0
    const blink = t % 3.7 < 0.15
    const rows = PANDA_BODY.map((r, j) =>
      blink && j === 4
        ? r.replace(/E/g, 'K')
        : chew && j === 6
          ? r.replace('M', 'K')
          : r,
    )
    const x = Math.round(o.x)
    const y = Math.round(o.y) - rows.length
    // shadow
    for (let i = -2; i < 18; i++)
      if (dith(x + i, y + 17, 0.5)) px(g, x + i, y + 17, '#2a3a1c')
    sprite(
      g,
      rows,
      {
        K: '#1b1a20',
        W: '#eeece4',
        E: '#f4f0e8',
        N: '#1b1a20',
        M: '#5a3030',
        P: '#3a3036',
      },
      x,
      y,
    )
    // a stalk of bamboo in the paws, going up to the mouth
    const bx = x + (up ? 12 : 13)
    const by = y + (up ? 6 : 10)
    for (let j = 0; j < 12; j++) {
      const xx = bx + Math.round(j * (up ? 0.35 : 0.5))
      const yy = by + 6 - j
      px(g, xx, yy, j % 4 === 0 ? '#5a7a2a' : '#8ab84a')
    }
    // leaves at the top
    const lx = bx + (up ? 4 : 6)
    const ly = by - 6
    px(g, lx + 1, ly, '#6aa84f')
    px(g, lx + 2, ly - 1, '#6aa84f')
    px(g, lx - 1, ly + 1, '#4f8a3a')
    px(g, lx - 2, ly + 1, '#4f8a3a')
    // paws over the stalk
    box(g, x + 11, y + (up ? 9 : 11), 3, 2, '#1b1a20')
  }
}

// --- A bamboo raft on the river ---

export const raftBob = (t: number) => (Math.sin(t * 1.4) > 0.3 ? 1 : 0)

// The deck: long poles side by side, seen a little from above, far ones
// lit, near ones in shade
const POLES = ['#e6de96', '#ccc472', '#b6ae5e', '#c6be6c', '#aaa252']

export function raft(o: { x0: number; x1: number; y: number }): Layer {
  return ({ g, t }) => {
    const y = o.y + raftBob(t)
    const len = o.x1 - o.x0
    // its shadow in the water, and the wake going back from the stern
    g.globalAlpha = 0.32
    box(g, o.x0 - 2, y + 5, len + 4, 3, '#0c2626')
    g.globalAlpha = 0.18
    box(g, o.x0 + 4, y + 8, len - 8, 3, '#0c2626')
    g.globalAlpha = 1
    for (let i = 0; i < 7; i++) {
      const a = (t * 0.45 + i / 7) % 1
      box(
        g,
        o.x0 - 6 - a * 40,
        y + 4 + (i % 3),
        3 + a * 9,
        1,
        a < 0.5 ? '#dcf2ea' : '#9ccac2',
      )
    }
    for (let k = 0; k < len; k++) {
      const x = o.x0 + k
      // the bow (on the right) sweeps up, the stern a little
      const bow =
        k > len - 24 ? Math.round(((k - (len - 24)) / 24) ** 2 * 8) : 0
      const stern = k < 8 ? Math.round(((8 - k) / 8) ** 2 * 2) : 0
      const top = y - 3 - bow - stern
      for (let j = 0; j < POLES.length; j++)
        px(g, x, top + j, (k + j * 7) % 19 === 0 ? '#7e7a3a' : POLES[j])
      // the pole ends and side in shadow, foam where it meets the water
      px(g, x, top + 5, '#6a6a2c')
      px(g, x, top + 6, '#46461e')
      if ((k + Math.floor(t * 5)) % 9 < 2 && !bow) px(g, x, top + 7, '#e4f6ee')
    }
    // lashings across the deck
    for (let k = 16; k < len - 26; k += 30) {
      box(g, o.x0 + k, y - 3, 2, 7, '#5a3a1a')
      px(g, o.x0 + k, y - 3, '#8a5a2a')
    }
    // a bamboo chair for passengers, near the bow
    const cx = o.x1 - 34
    box(g, cx, y - 15, 2, 14, '#a87a30')
    box(g, cx, y - 15, 3, 1, '#e0b05a')
    box(g, cx + 1, y - 7, 10, 2, '#c8983a')
    box(g, cx + 1, y - 7, 10, 1, '#e8bc5e')
    box(g, cx + 10, y - 5, 1, 4, '#8a6420')
    box(g, cx + 2, y - 5, 1, 4, '#8a6420')
  }
}

// The raftsman's pole, held across the body and down into the river, with
// a slow push
export function pole(o: { x: number; y: number }): Layer {
  return ({ g, t }) => {
    const dy = raftBob(t)
    const push = Math.sin(t * 0.7) * 3
    const x0 = o.x - 12 + push
    const y0 = o.y - 66 + dy
    const x1 = o.x + 20 + push
    const y1 = o.y + 14 + dy
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      const yy = y0 + ((y1 - y0) * i) / n
      // under the water it is only a darker shape
      if (yy > o.y + 4 + dy) {
        if (i % 2) px(g, x, yy, 'rgba(20,50,50,0.5)')
        continue
      }
      px(g, x, yy, i % 13 === 0 ? '#6a6a2a' : '#d8c870')
      px(g, x + 1, yy, i % 13 === 0 ? '#4a4a1a' : '#9a8a40')
    }
    // ripples where it goes in
    const wx = x0 + ((x1 - x0) * (o.y + 4 + dy - y0)) / (y1 - y0)
    const r = 2 + (Math.floor(t * 3) % 3)
    box(g, wx - r, o.y + 5 + dy, r * 2 + 2, 1, '#d8f0e8')
  }
}

// --- A taxi going down a Beijing avenue, the street sliding by ---

export const carBob = (t: number) => (hash(Math.floor(t * 3)) < 0.18 ? 1 : 0)

// The road and what passes behind the taxi
export function road(o: { y: number; speed?: number }): Layer {
  return ({ g, t, w }) => {
    const v = o.speed ?? 60
    // lane marks rushing by
    for (let k = 0; k < 8; k++) {
      const x = w - ((t * v + k * 52) % (w + 52))
      box(g, x, o.y + 10, 20, 1, '#d8d0b8')
    }
    // a car the other way, now and then
    const c = (t * 1.3) % 6
    if (c < 1.2) {
      const x = -60 + (c / 1.2) * (w + 120)
      box(g, x, o.y - 4, 34, 6, '#4a3a5a')
      box(g, x + 6, o.y - 8, 18, 4, '#3a2e48')
      box(g, x + 32, o.y - 3, 2, 2, '#ffe9a0')
      box(g, x, o.y - 3, 1, 2, '#c8302a')
    }
  }
}

// The taxi's dark inside, seen through its windows, and its shadow
export function cabin(o: { x: number; y: number }): Layer {
  return ({ g, t }) => {
    const y = o.y + carBob(t)
    g.globalAlpha = 0.45
    box(g, o.x + 2, o.y + 41, 126, 3, '#0a0810')
    box(g, o.x + 8, o.y + 44, 114, 1, '#0a0810')
    g.globalAlpha = 1
    box(g, o.x + 22, y, 82, 17, '#241c22')
    // seat backs and headrests
    box(g, o.x + 30, y + 9, 26, 8, '#3a2c30')
    box(g, o.x + 70, y + 9, 26, 8, '#3a2c30')
    box(g, o.x + 74, y + 5, 6, 4, '#3a2c30')
  }
}

// The taxi's body, over the people in it: two-tone, in a Beijing
// company's yellow over green, the street lights sliding over its paint
export function taxi(o: { x: number; y: number }): Layer {
  return ({ g, t }) => {
    const x = o.x
    const y = o.y + carBob(t)
    const yel = '#f2b632'
    const yelL = '#ffd870'
    const yelD = '#c8861a'
    const grn = '#1f6a52'
    const dark = '#141018'
    // roof, with its light on top
    box(g, x + 30, y - 3, 64, 3, yel)
    box(g, x + 32, y - 4, 60, 1, yelL)
    box(g, x + 30, y - 1, 64, 1, yelD)
    box(g, x + 55, y - 9, 14, 5, '#f4efe0')
    box(g, x + 55, y - 9, 14, 1, '#ffffff')
    box(g, x + 56, y - 5, 12, 1, '#e08a2a')
    glow(g, x + 62, y - 7, 9, '#ffd890', 0.22)
    // the pillars around the windows, slanting at front and back
    for (let j = 0; j < 17; j++) {
      const back = x + 20 + Math.round(j * 0.55)
      const front = x + 105 - Math.round(j * 0.62)
      box(g, back, y + 16 - j, 4, 1, yel)
      px(g, back + 4, y + 16 - j, dark)
      box(g, front - 1, y + 16 - j, 4, 1, yelD)
      px(g, front - 2, y + 16 - j, dark)
    }
    box(g, x + 62, y, 3, 17, yelD)
    box(g, x + 30, y, 64, 1, dark)
    // the body: yellow above a chrome line, green below
    box(g, x + 3, y + 17, 123, 9, yel)
    box(g, x + 3, y + 17, 123, 1, yelL)
    box(g, x + 3, y + 18, 123, 1, '#ffe8a8')
    box(g, x + 3, y + 25, 123, 1, yelD)
    box(g, x + 3, y + 26, 123, 1, '#e8e4dc')
    box(g, x + 3, y + 27, 123, 8, grn)
    box(g, x + 3, y + 27, 123, 1, '#3a8a6a')
    box(g, x + 3, y + 34, 123, 1, '#0e3a2a')
    // boot, bonnet, bumpers
    box(g, x + 1, y + 15, 22, 3, yel)
    box(g, x + 1, y + 15, 22, 1, yelL)
    box(g, x + 104, y + 15, 23, 3, yel)
    box(g, x + 106, y + 14, 18, 1, yelL)
    box(g, x - 1, y + 23, 4, 9, '#3a3a42')
    box(g, x - 1, y + 24, 4, 1, '#c8c8d0')
    box(g, x + 126, y + 23, 4, 9, '#3a3a42')
    box(g, x + 126, y + 24, 4, 1, '#c8c8d0')
    // door seams, handles, a mirror
    for (const sx of [28, 63, 101]) {
      box(g, x + sx, y + 17, 1, 9, '#a8721a')
      box(g, x + sx, y + 27, 1, 8, '#0e3a2a')
    }
    box(g, x + 54, y + 20, 4, 1, '#7a5418')
    box(g, x + 90, y + 20, 4, 1, '#7a5418')
    box(g, x + 101, y + 12, 4, 3, dark)
    box(g, x + 102, y + 12, 2, 1, yel)
    // lights
    box(g, x + 124, y + 18, 3, 3, '#fff6c8')
    glow(g, x + 132, y + 20, 12, '#ffe9a0', 0.35)
    box(g, x + 1, y + 18, 3, 3, '#e0302a')
    glow(g, x, y + 19, 5, '#ff4a2a', 0.3)
    // street lights sliding back over the paint
    g.globalAlpha = 0.55
    for (let k = 0; k < 2; k++) {
      const sx = x + 128 - ((t * 70 + k * 70) % 140)
      if (sx > x + 3 && sx < x + 124) box(g, sx, y + 18, 3, 7, '#fff2c0')
    }
    // and a sheen across the glass
    g.globalAlpha = 0.16
    for (let k = 0; k < 2; k++) {
      const sx = x + 104 - ((t * 60 + k * 45) % 84)
      for (let j = 0; j < 15; j++)
        box(g, sx + j * 0.6, y + 1 + j, 2, 1, '#e8f4ff')
    }
    g.globalAlpha = 1
    // wheel arches, and the wheels turning in them
    for (const wx of [x + 26, x + 102]) {
      for (let yy = y + 27; yy <= y + 35; yy++) {
        const d = o.y + 36 - yy
        const hw = Math.round(Math.sqrt(Math.max(0, 81 - d * d)))
        box(g, wx - hw, yy, hw * 2 + 1, 1, dark)
      }
      wheel(g, wx, o.y + 36, t)
    }
  }
}

function wheel(g: G, cx: number, cy: number, t: number) {
  const r = 7
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y)
      if (d > r + 0.3) continue
      px(
        g,
        cx + x,
        cy + y,
        d > r - 2
          ? '#1a1418'
          : d > r - 2.6
            ? '#4a4a52'
            : d > 2
              ? '#9a9aa2'
              : '#d8d8e0',
      )
    }
  // spokes turning
  const a = t * 18
  for (let k = 0; k < 5; k++) {
    const ang = a + (k * Math.PI * 2) / 5
    px(
      g,
      cx + Math.round(Math.cos(ang) * 3.4),
      cy + Math.round(Math.sin(ang) * 3.4),
      '#5a5a62',
    )
  }
  px(g, cx - 3, cy - 4, '#e8e8f0')
}

// Lamp posts and trees rushing past in front
export function roadside(o: { y: number; speed?: number }): Layer {
  return ({ g, t, w }) => {
    const v = o.speed ?? 140
    const span = w + 160
    const x = w + 40 - ((t * v) % span)
    // a lamp post
    box(g, x, o.y - 120, 3, 124, '#1a1418')
    box(g, x - 10, o.y - 120, 14, 2, '#1a1418')
    box(g, x - 12, o.y - 118, 5, 2, '#fff2c0')
    glow(g, x - 10, o.y - 114, 12, '#ffd890', 0.3)
    // a willow, further along
    const tx = x + 90
    box(g, tx, o.y - 40, 4, 44, '#1a1610')
    for (let i = 0; i < 9; i++) {
      const sx = tx - 18 + i * 5
      const len = 20 + (i % 3) * 8
      for (let j = 0; j < len; j++)
        if ((j + i) % 2 === 0)
          px(
            g,
            sx + Math.sin(j * 0.3 + t * 2) * 1,
            o.y - 70 + j,
            i % 2 ? '#1e2a1a' : '#2a3a20',
          )
    }
    puff(g, tx + 2, o.y - 66, 16, '#1e2a1a', 0.8)
  }
}

// --- A metro train that comes in, waits and goes ---

// The cars are white with a green stripe, as on Shanghai's line 2. It runs
// in from the right and stops, opens its doors, closes them and goes.
export function train(o: { y: number; floor: number }): Layer {
  return ({ g, t, w }) => {
    const period = 24
    const c = (t + 6) % period
    const car = 108
    const cars = 4
    const len = car * cars
    let x: number
    if (c < 4.5) x = -24 + (1 - c / 4.5) ** 2 * (w + 60)
    else if (c < 13) x = -24
    else if (c < 17.5) x = -24 - ((c - 13) / 4.5) ** 2 * (len + 40)
    else return
    // doors open in the middle of the stop
    const open =
      c > 6 && c < 11.5 ? Math.min(1, (c - 6) * 2, (11.5 - c) * 2) : 0
    const y = o.y
    g.save()
    g.beginPath()
    g.rect(0, 0, w, o.floor)
    g.clip()
    for (let n = 0; n < cars; n++) {
      const cx = Math.round(x + n * car)
      if (cx > w || cx + car < 0) continue
      // body, top to bottom
      const bands: Array<[number, number, string]> = [
        [0, 1, '#b8bec8'],
        [1, 2, '#eef1f5'],
        [3, 2, '#dde1e8'],
        [5, 1, '#a8aeb8'],
        [6, 7, '#f2f4f7'],
        [13, 22, '#2a3446'],
        [35, 3, '#f2f4f7'],
        [38, 1, '#5ad08a'],
        [39, 3, '#2a9a5a'],
        [42, 1, '#1a6a40'],
        [43, 14, '#e6e9ee'],
        [57, 1, '#b8bcc6'],
        [58, 12, '#d4d8e0'],
        [70, 10, '#4a4e58'],
      ]
      for (const [dy, h, col] of bands) box(g, cx + 2, y + dy, car - 4, h, col)
      // the gangway between cars
      box(g, cx, y + 8, 2, 70, '#1a1c22')
      box(g, cx + car - 2, y + 8, 2, 70, '#1a1c22')
      // windows: lit inside, with people in some
      for (let k = 0; k < 3; k++) {
        const wx = cx + 8 + k * 34
        box(g, wx, y + 15, 20, 18, '#f0e6c8')
        box(g, wx, y + 15, 20, 2, '#c8bea0')
        for (let p = 0; p < 2; p++) {
          if (hash(n * 13 + k * 5 + p) < 0.45) continue
          const px0 = wx + 4 + p * 9
          box(g, px0, y + 22, 3, 3, '#3a3448')
          box(g, px0 - 1, y + 25, 5, 8, '#4a4458')
        }
        // reflections on the glass
        g.globalAlpha = 0.25
        for (let j = 0; j < 18; j++)
          box(g, wx + 4 + j * 0.5, y + 15 + j, 2, 1, '#ffffff')
        g.globalAlpha = 1
      }
      // doors between the windows, sliding open at the stop
      for (let k = 0; k < 2; k++) {
        const dx = cx + 30 + k * 34
        const gap = Math.round(open * 4)
        box(g, dx - 1, y + 9, 12, 60, '#fff4d8')
        box(g, dx - gap, y + 9, 5, 60, '#d6dae2')
        box(g, dx + 5 + gap, y + 9, 5, 60, '#d6dae2')
        box(g, dx - gap + 1, y + 14, 3, 20, '#2a3446')
        box(g, dx + 6 + gap, y + 14, 3, 20, '#2a3446')
        box(g, dx + 4 + gap, y + 9, 1, 60, '#8a8e98')
      }
    }
    // the cab at the front, with its lamps and dark glass
    const nx = Math.round(x)
    for (let j = 0; j < 70; j++) {
      const slope = j < 30 ? Math.round((30 - j) * 0.25) : 0
      box(
        g,
        nx - 8 + slope,
        y + 6 + j,
        10 - slope,
        1,
        j < 30 ? '#1e2838' : '#e2e6ec',
      )
    }
    box(g, nx - 7, y + 38, 9, 4, '#2a9a5a')
    box(g, nx - 7, y + 52, 3, 2, '#fff6c8')
    glow(g, nx - 9, y + 53, 6, '#fff6c8', 0.35)
    g.restore()
  }
}

// --- A boat on the river at night, its windows lit ---

export function boat(o: { y: number; period?: number }): Layer {
  return ({ g, t, w }) => {
    const p = o.period ?? 50
    const x = w + 30 - ((t % p) / p) * (w + 80)
    const y = o.y
    box(g, x, y, 30, 3, '#1a1830')
    box(g, x + 2, y - 3, 24, 3, '#2a2848')
    box(g, x + 6, y - 6, 14, 3, '#2a2848')
    for (let k = 0; k < 6; k++)
      px(g, x + 4 + k * 4, y - 2, k % 2 ? '#ffd890' : '#ff8ad0')
    for (let k = 0; k < 3; k++) px(g, x + 8 + k * 4, y - 5, '#bfe4ff')
    // light on the water
    for (let k = 0; k < 4; k++)
      if (Math.sin(t * 4 + k) > 0)
        box(g, x + 4 + k * 6, y + 4 + (k % 2), 3, 1, '#ffb070')
  }
}

// --- A hotpot on the boil ---

export function bubbles(o: {
  x: number
  y: number
  rx: number
  ry: number
  colour: string
  n?: number
  seed?: number
}): Layer {
  return ({ g, t }) => {
    const n = o.n ?? 7
    for (let i = 0; i < n; i++) {
      const s = (o.seed ?? 1) * 31 + i
      const life = 0.6 + hash(s) * 0.7
      const a = (t / life + hash(s + 1)) % 1
      const ang =
        hash(s + 2 + Math.floor(t / life + hash(s + 1)) * 7) * Math.PI * 2
      const d = Math.sqrt(hash(s + 3 + Math.floor(t / life)))
      const x = o.x + Math.cos(ang) * o.rx * d
      const y = o.y + Math.sin(ang) * o.ry * d
      if (a < 0.7) {
        const r = a < 0.3 ? 0 : 1
        px(g, x, y - r, o.colour)
        if (r) {
          px(g, x - 1, y, o.colour)
          px(g, x + 1, y, o.colour)
          px(g, x, y + 1, '#3a0a08')
        }
      } else if (a < 0.8) {
        px(g, x - 1, y - 1, '#fff0d0')
        px(g, x + 1, y - 1, '#fff0d0')
      }
    }
  }
}

// --- A video call: a phone's screen in the air, with a room behind ---

export function callScreen(o: {
  x: number
  y: number
  w: number
  h: number
}): Layer {
  return ({ g, t }) => {
    const { x, y, w, h } = o
    // the phone
    box(g, x - 3, y - 6, w + 6, h + 12, '#14121c')
    box(g, x - 2, y - 5, w + 4, 1, '#3a3848')
    box(g, x + w / 2 - 3, y - 4, 6, 1, '#2a2838')
    // a warm room in Chengdu, a window with the night outside
    for (let j = 0; j < h; j++)
      box(g, x, y + j, w, 1, j < h * 0.55 ? '#e8a868' : '#a86a48')
    box(g, x + 4, y + 6, 14, 12, '#2a2a5a')
    box(g, x + 4, y + 6, 14, 1, '#6a4a3a')
    box(g, x + 10, y + 6, 1, 12, '#6a4a3a')
    px(g, x + 7, y + 9, '#fff6c8')
    px(g, x + 15, y + 13, '#fff6c8')
    // a little panda on a shelf
    box(g, x + w - 12, y + 14, 8, 1, '#5a3a22')
    box(g, x + w - 10, y + 10, 4, 4, '#f4f0e8')
    px(g, x + w - 10, y + 10, '#1b1a20')
    px(g, x + w - 7, y + 10, '#1b1a20')
    px(g, x + w - 9, y + 11, '#1b1a20')
    px(g, x + w - 8, y + 11, '#1b1a20')
    // a light breathing on the screen's edge: the call is live
    const on = Math.floor(t * 2) % 2 === 0
    px(g, x + w - 3, y + 2, on ? '#5ad87a' : '#2a8a4a')
  }
}

export function callButtons(o: {
  x: number
  y: number
  w: number
  h: number
}): Layer {
  return ({ g }) => {
    const { x, y, w, h } = o
    const by = y + h - 6
    for (const [bx, c] of [
      [x + w / 2 - 9, '#5a5a6a'],
      [x + w / 2, '#e0402a'],
      [x + w / 2 + 9, '#5a5a6a'],
    ] as Array<[number, string]>) {
      for (let j = -2; j <= 2; j++)
        box(
          g,
          bx - (Math.abs(j) === 2 ? 1 : 2),
          by + j,
          Math.abs(j) === 2 ? 3 : 5,
          1,
          c,
        )
    }
    box(g, x + w / 2 - 1, by, 3, 1, '#ffffff')
  }
}

// --- The end of a scene: fireworks and sky lanterns ---

const SPARK = [
  ['#ffe680', '#ff9a3a', '#c8372d'],
  ['#ffffff', '#8ad8ff', '#3a6ad8'],
  ['#c8ffd8', '#3ac88a', '#1a6a4a'],
  ['#ffd0f0', '#ff6ab8', '#a82a78'],
  ['#fff6c8', '#f2c14e', '#a86a1a'],
]

// Shells go up, burst into rings of sparks that fall and fade. `t` is
// seconds since the scene ended. The first few come quickly, then one now
// and then, for as long as the scene is shown.
export function fireworks(g: G, t: number, w: number, h: number, sky: number) {
  const at = (k: number) =>
    (k < 8 ? k * 0.45 : 3.6 + (k - 8) * 1.6) + hash(k) * 0.3
  let shells = 0
  while (at(shells) <= t && shells < 400) shells++
  for (let k = Math.max(0, shells - 7); k < shells; k++) {
    const a = t - at(k)
    const x0 = w * (0.12 + hash(k + 1) * 0.76)
    const top = sky * (0.2 + hash(k + 2) * 0.5)
    const rise = 0.75
    const pal = SPARK[k % SPARK.length]
    if (a < rise) {
      // the shell climbing, with its sparking trail
      const p = a / rise
      const y = h - (h - top) * (1 - (1 - p) ** 2)
      px(g, x0, y, '#fff6d8')
      px(g, x0, y + 1, '#ffd890')
      px(g, x0 + (Math.floor(a * 30) % 2 ? 1 : -1), y + 3, '#ff9a4a')
      px(g, x0, y + 5, '#a85a2a')
      continue
    }
    const b = a - rise
    if (b > 2.2) continue
    if (b < 0.18) glow(g, x0, top, 22, pal[0], 0.7 - b * 3)
    const n = 34
    const size = 30 + hash(k + 9) * 18
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + hash(k * 7 + i) * 0.15
      const sp = size * (0.8 + hash(k * 13 + i) * 0.25)
      const spread = 1 - Math.exp(-b * 2.6)
      const fall = b * b * 7
      const pos = (s: number) => [
        x0 + Math.cos(ang) * sp * s,
        top + Math.sin(ang) * sp * s * 0.9 + fall,
      ]
      // fading sparks twinkle out
      if (b > 1.4 && hash(i * 3 + Math.floor(b * 14)) < (b - 1.4) * 1.2)
        continue
      const c = b < 0.5 ? pal[0] : b < 1.2 ? pal[1] : pal[2]
      const [x, y] = pos(spread)
      px(g, x, y, c)
      if (b < 1.1) {
        const [tx, ty] = pos(Math.max(0, spread - 0.08))
        px(g, tx, ty, pal[1])
        const [ux, uy] = pos(Math.max(0, spread - 0.16))
        px(g, ux, uy, pal[2])
      }
    }
  }
}

// Paper in red and gold, fluttering down over a scene by day
export function confetti(g: G, t: number, w: number, h: number) {
  const cols = ['#e0402a', '#f2c14e', '#ff8a6a', '#ffe680', '#c8372d']
  for (let i = 0; i < 46; i++) {
    const start = hash(i) * 2.5
    const a = t - start
    if (a < 0) continue
    const fall = 16 + hash(i + 1) * 14
    const y = -6 + a * fall
    if (y > h + 4) continue
    const x = w * hash(i + 2) + Math.sin(a * (2 + hash(i + 3) * 2) + i) * 6
    const flip = Math.floor(a * 6 + i) % 3
    const c = cols[i % cols.length]
    if (flip === 0) box(g, x, y, 2, 1, c)
    else if (flip === 1) box(g, x, y, 1, 2, c)
    else px(g, x, y, c)
  }
}

export function skyLanterns(g: G, t: number, w: number, h: number) {
  for (let i = 0; i < 9; i++) {
    const start = i * 0.9
    const a = t - start
    if (a < 0) continue
    const y = h + 6 - a * (7 + hash(i) * 5)
    if (y < -10) continue
    const x = w * (0.08 + hash(i + 20) * 0.84) + Math.sin(a * 0.8 + i) * 4
    glow(g, x, y + 2, 7, '#ff9a3a', 0.35)
    box(g, x - 1, y - 2, 4, 1, '#ffd890')
    box(g, x - 2, y - 1, 6, 5, '#ffb050')
    box(g, x - 1, y, 4, 3, '#fff0b0')
    box(g, x - 2, y + 4, 6, 1, '#c86a2a')
    px(g, x, y + 5, '#ffe680')
  }
}

// --- Small things ---

// Parts of the picture drawn again over what moves behind them: the bars
// of a window in front of a plane, say. Each is [x, y, w, h].
export function repaint(rects: Array<[number, number, number, number]>): Layer {
  return ({ g, img }) => {
    if (!img) return
    for (const [x, y, w, h] of rects) g.drawImage(img, x, y, w, h, x, y, w, h)
  }
}

// An airliner climbing away in the distance, now and then
export function plane(o: {
  x0: number
  x1: number
  y0: number
  y1: number
  period?: number
}): Layer {
  return ({ g, t }) => {
    const p = o.period ?? 30
    const a = (t % p) / 9
    if (a > 1) return
    const x = o.x0 + (o.x1 - o.x0) * a
    const y = o.y0 + (o.y1 - o.y0) * a * a
    const c = '#3a3050'
    box(g, x, y, 9, 2, c)
    box(g, x + 2, y - 1, 3, 1, c)
    box(g, x - 1, y - 2, 2, 2, c)
    box(g, x + 4, y + 2, 3, 1, c)
    if (Math.floor(t * 2) % 2) px(g, x + 9, y, '#ff5a4a')
  }
}

// A waterfall: its own pixels sliding down
export function waterfall(o: {
  x: number
  y: number
  w: number
  h: number
}): Layer {
  return ({ g, t, img }) => {
    if (!img) return
    const off = Math.floor(t * 18) % o.h
    if (!off) return
    g.drawImage(img, o.x, o.y, o.w, o.h - off, o.x, o.y + off, o.w, o.h - off)
    g.drawImage(img, o.x, o.y + o.h - off, o.w, off, o.x, o.y, o.w, off)
  }
}

// --- Marks over a head: a question, a delight ---

const MARKS: Record<string, Array<string>> = {
  what: [
    '.KKKK.',
    'KWWWWK',
    'KWKKWK',
    '.KKWWK',
    '..KWK.',
    '..KWK.',
    '..KK..',
    '..KWK.',
    '..KK..',
  ],
  good: [
    '..K...K..',
    '.KRK.KRK.',
    'KRRRKRRRK',
    'KRRRRRRRK',
    '.KRRRRRK.',
    '..KRRRK..',
    '...KRK...',
    '....K....',
  ],
  oops: ['..K..', '.KBK.', 'KBBBK', 'KBWBK', '.KKK.'],
}

export function mark(g: G, kind: string, x: number, y: number, t: number) {
  const rows = MARKS[kind] ?? MARKS.what
  const bounce = Math.round(Math.abs(Math.sin(t * 6)) * 2)
  sprite(
    g,
    rows,
    { K: '#1a1418', W: '#fff6d8', R: '#e0402a', B: '#7ac8ff' },
    x - Math.floor(rows[0].length / 2),
    y - rows.length - bounce,
  )
}
