import { Paint, bayer, lighting, mix, rng } from './paint'
import type { Daytime, Season } from '../data/garden'
import type { G, Light } from './paint'

// The garden in pixel art: a walled courtyard in the manner of Suzhou's
// gardens, 256 × 144. It is drawn in layers that are made once for a
// given season, hour and set of things grown: the sky, the courtyard
// behind the pond's surface, and what stands in front of it. What moves
// (koi, petals, snow, the willow, the lantern flames) is drawn on top
// each frame by garden/life.ts.
//
// From left to right: a plum tree and an armillary sphere, a scholar's
// rock and a stone lantern, the pond with its zigzag bridge before a moon
// gate in the wall, a willow, the pavilion with red lanterns, bamboo.

export const GW = 256
export const GH = 144

export interface Scene {
  season: Season
  daytime: Daytime
  // What has grown, by item id (data/garden.ts): 1 started, 2 grown
  stages: Record<string, number | undefined>
  // The moon's phase: 0 new, 0.5 full
  moon: number
}

// Where things are
export const COPING = 57
export const WALL_TOP = 64
export const WALL_BASE = 97
export const GROUND = 101
export const POND = { cx: 124, cy: 121, rx: 46, ry: 12 }
export const GATE = { cx: 120, cy: 82, r: 13 }
export const WILLOW = { x: 171, y: 104 }
export const LANTERN = { x: 66, y: 131 }
export const CRANE = { x: 172, y: 133 }

// Where each thing can be tapped: boxes of x, y, width, height
export const HITS: Record<string, Array<[number, number, number, number]>> = {
  plum: [[4, 36, 66, 76]],
  pond: [[78, 108, 92, 26]],
  rock: [[62, 77, 20, 34]],
  bamboo: [[226, 20, 30, 82]],
  bridge: [[78, 113, 92, 11]],
  lantern: [[58, 108, 16, 24]],
  gate: [[105, 67, 30, 31]],
  pavilion: [[178, 48, 68, 56]],
  lotus: [
    [133, 118, 28, 14],
    [88, 119, 16, 10],
  ],
  windows: [
    [75, 68, 15, 16],
    [145, 68, 15, 16],
  ],
  crane: [[166, 114, 17, 20]],
  willow: [[140, 26, 62, 66]],
  lanterns: [
    [186, 73, 9, 15],
    [229, 73, 9, 15],
  ],
  mums: [[224, 126, 32, 18]],
  sphere: [[3, 110, 24, 32]],
  dragon: [[2, 44, 104, 15]],
  taiji: [[30, 130, 32, 12]],
  go: [[192, 122, 30, 18]],
  cat: [[132, 50, 16, 18]],
  kite: [[48, 10, 22, 26]],
  butterflies: [
    [220, 108, 36, 24],
    [26, 88, 28, 18],
  ],
  magpies: [[90, 47, 20, 10]],
  chimes: [[177, 68, 9, 11]],
}

// The thing at a point of the picture, of those grown: the smallest box
// wins, as the more particular
export function pick(s: Scene, x: number, y: number): string | null {
  let best: string | null = null
  let area = Infinity
  for (const [id, boxes] of Object.entries(HITS)) {
    if (!has(s, id)) continue
    for (const [bx, by, bw, bh] of boxes)
      if (x >= bx && x < bx + bw && y >= by && y < by + bh && bw * bh < area) {
        best = id
        area = bw * bh
      }
  }
  return best
}

// The light of each hour, as a multiply and an add per channel
const LIGHT: Record<Daytime, Light> = {
  day: [1, 1, 1, 0, 0, 0],
  dawn: [0.95, 0.84, 0.86, 12, 4, 14],
  dusk: [1.02, 0.74, 0.6, 16, 2, 8],
  night: [0.4, 0.47, 0.68, 6, 10, 30],
}

const SKY: Record<Daytime, Array<string>> = {
  dawn: ['#34407a', '#6f63a0', '#bf86a8', '#eeb29c', '#f8d6aa'],
  day: ['#3f7cc4', '#5d97d6', '#86b6e4', '#b6d6ee', '#dceef2'],
  dusk: ['#25275c', '#563a76', '#a85878', '#e2865e', '#f6bc6a'],
  night: ['#060a20', '#0b1230', '#141d44', '#1e2a58', '#2a3866'],
}
const SKY_WINTER_DAY = ['#7896c0', '#94afd2', '#b2c8e0', '#cfdce9', '#e6edf2']

export const skyColours = (s: Scene) =>
  s.daytime === 'day' && s.season === 'winter' ? SKY_WINTER_DAY : SKY[s.daytime]

export const lightOf = (s: Scene) => lighting(LIGHT[s.daytime])

const has = (s: Scene, id: string) => s.stages[id] ?? 0

// --- The pond's outline: a wobbly ellipse. Under 1 is water.
export function pondDist(x: number, y: number) {
  const dx = (x + 0.5 - POND.cx) / POND.rx
  const dy = (y + 0.5 - POND.cy) / POND.ry
  const a = Math.atan2(dy, dx)
  const f = 1 + 0.07 * Math.sin(3 * a + 0.6) + 0.04 * Math.sin(5 * a + 2.1)
  return Math.hypot(dx, dy) / f
}

// --- The sky: its bands, the sun or the moon, the stars

export function drawSky(g: G, s: Scene) {
  const p = new Paint(g)
  const cols = skyColours(s)
  p.bands(0, 0, GW, 66, cols, true)
  // below the horizon too, for what shows through the moon gate
  p.raw(0, 66, GW, GH - 66, cols[cols.length - 1])
  // the sky's own colour at a height, to mix halos into
  const n = cols.length - 1
  const skyAt = (y: number) => {
    const t = (Math.max(0, Math.min(65, y)) / 65) * n
    const i = Math.min(n - 1, Math.floor(t))
    return mix(cols[i], cols[i + 1], t - i)
  }
  // a halo in a few steps of colour, dithered between them
  const halo = (cx: number, cy: number, r: number, c: string, max: number) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r
        if (d >= 1 || y < 0) continue
        const lv = Math.floor(max * (1 - d) ** 2 * 4 + bayer(x, y)) / 4
        if (lv > 0) p.raw(x, y, 1, 1, mix(skyAt(y), c, Math.min(1, lv)))
      }
  }
  if (s.daytime === 'day') {
    halo(214, 22, 26, '#fff6d6', 0.9)
    p.disc(214, 22, 6, 6, '#fff3cc')
    p.disc(214, 22, 5, 5, '#fffdf2')
  } else if (s.daytime === 'dawn') {
    halo(34, 58, 40, '#ffe2b0', 1)
    p.disc(34, 58, 8, 8, '#ffefc8')
  } else if (s.daytime === 'dusk') {
    halo(222, 56, 42, '#ffc488', 1)
    p.disc(222, 56, 8, 8, '#ffdca0')
  } else {
    const r = rng(77)
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * GW)
      const y = Math.floor(r() * 58)
      const c = r() < 0.18 ? '#fff4d0' : r() < 0.5 ? '#b8c6f0' : '#7f8fc4'
      p.raw(x, y, 1, 1, c)
    }
    // the Milky Way, faint
    for (let x = 0; x < GW; x++)
      for (let y = 0; y < 58; y++) {
        const band = Math.abs(y - (8 + x * 0.16)) / 9
        if (band < 1 && bayer(x, y) < 0.13 * (1 - band))
          p.raw(x, y, 1, 1, '#3a4880')
      }
    halo(206, 20, 22, '#8a98d0', 0.7)
    moon(p, 206, 20, 6, s.moon)
  }
}

// The moon at its real phase: lit on the right as it waxes, on the left
// as it wanes
function moon(p: Paint, cx: number, cy: number, r: number, phase: number) {
  const lit = '#f6efd4'
  const shade = '#2c3560'
  const k = Math.cos(phase * 2 * Math.PI)
  const waxing = phase < 0.5
  for (let y = -r; y <= r; y++) {
    const hw = Math.sqrt(Math.max(0, r * r - y * y))
    for (let x = -Math.ceil(hw); x <= Math.ceil(hw); x++) {
      if (x * x + y * y > r * r + r * 0.6) continue
      // the terminator: an ellipse whose width follows the phase
      const edge = k * hw
      const isLit = waxing ? x > edge : x < -edge
      p.raw(cx + x, cy + y, 1, 1, isLit ? lit : shade)
    }
  }
  if (phase > 0.3 && phase < 0.7) {
    p.raw(cx - 2, cy - 1, 2, 1, '#d8ceb0')
    p.raw(cx + 1, cy + 2, 2, 1, '#d8ceb0')
    p.raw(cx - 1, cy + 1, 1, 1, '#d8ceb0')
  }
}

// --- Behind the pond's surface: hills, the wall, the ground, the pond,
// and what stands behind or in it

export function drawBack(g: G, s: Scene) {
  const p = new Paint(g, lightOf(s))
  hills(p, s)
  wall(p, s)
  if (has(s, 'gate')) gate(p, s, has(s, 'gate'))
  if (has(s, 'windows')) windows(p, has(s, 'windows'))
  if (has(s, 'dragon')) dragon(p, s, has(s, 'dragon'))
  ground(p, s)
  if (has(s, 'willow')) willowTrunk(p, s, has(s, 'willow'))
  if (has(s, 'bamboo')) bamboo(p, s, has(s, 'bamboo'))
  if (has(s, 'pavilion')) pavilion(p, s, has(s, 'pavilion'))
  if (has(s, 'lanterns')) redLanterns(p, s, has(s, 'lanterns'))
  if (has(s, 'taiji')) taiji(p, has(s, 'taiji'))
  pond(p, s, has(s, 'pond'))
  if (has(s, 'rock')) rock(p, s, has(s, 'rock'))
  if (has(s, 'plum')) plum(p, s, has(s, 'plum'))
  shafts(p, s)
}

// Low sun at the start and end of the day, falling in broad shafts across
// the wall and the ground: light added over what is there, brightest in
// the middle of each shaft and fading towards the ground
function shafts(p: Paint, s: Scene) {
  if (s.daytime !== 'dawn' && s.daytime !== 'dusk') return
  const fromLeft = s.daytime === 'dawn'
  const [r, gr, b] = fromLeft ? [255, 226, 196] : [255, 196, 128]
  const g = p.g
  const was = g.globalCompositeOperation
  g.globalCompositeOperation = 'screen'
  for (const [at, w] of [
    [24, 16],
    [86, 9],
    [140, 20],
    [206, 11],
  ]) {
    for (let y = COPING; y < GH; y++) {
      const fade = 1 - ((y - COPING) / (GH - COPING)) * 0.6
      const shift = (y - COPING) * 0.6
      const x = Math.round(fromLeft ? at + shift : GW - at - shift - w)
      g.fillStyle = `rgba(${r},${gr},${b},${(0.09 * fade).toFixed(3)})`
      g.fillRect(x, y, w, 1)
      g.fillStyle = `rgba(${r},${gr},${b},${(0.07 * fade).toFixed(3)})`
      g.fillRect(x + Math.round(w * 0.25), y, Math.round(w * 0.5), 1)
    }
  }
  g.globalCompositeOperation = was
}

// --- In front of the pond's surface: the bridge, lotus, and what stands
// in the foreground

export function drawFront(g: G, s: Scene) {
  const p = new Paint(g, lightOf(s))
  if (has(s, 'lotus')) lotus(p, s, has(s, 'lotus'))
  if (has(s, 'bridge')) bridge(p, s, has(s, 'bridge'))
  if (has(s, 'lantern')) stoneLantern(p, s, has(s, 'lantern'))
  if (has(s, 'sphere')) sphere(p, s, has(s, 'sphere'))
  if (has(s, 'go')) goTable(p, s, has(s, 'go'))
  if (has(s, 'mums')) mums(p, s, has(s, 'mums'))
}

// --- Hills beyond the wall, borrowed scenery, with a pagoda

function hills(p: Paint, s: Scene) {
  const horizon = skyColours(s).at(-1) ?? '#dceef2'
  const far = mix(s.season === 'winter' ? '#9aa8b8' : '#7d93a8', horizon, 0.45)
  const near = mix(
    s.season === 'autumn'
      ? '#7a7a5c'
      : s.season === 'winter'
        ? '#8a96a2'
        : '#5f8274',
    horizon,
    0.25,
  )
  const ridge = (
    base: number,
    amp: number,
    seed: number,
    c: string,
    snow: boolean,
  ) => {
    const r = rng(seed)
    const pts: Array<[number, number]> = [[0, WALL_TOP]]
    const a1 = r() * 6
    const a2 = r() * 6
    for (let x = 0; x <= GW; x += 2) {
      const y =
        base -
        amp * (0.55 + 0.3 * Math.sin(x / 23 + a1) + 0.15 * Math.sin(x / 9 + a2))
      pts.push([x, y])
    }
    pts.push([GW, WALL_TOP])
    p.poly(pts, c)
    if (snow)
      for (let x = 0; x <= GW; x += 1) {
        const y =
          base -
          amp *
            (0.55 + 0.3 * Math.sin(x / 23 + a1) + 0.15 * Math.sin(x / 9 + a2))
        if (y < base - amp * 0.62) p.rect(x, y, 1, 2, '#f4f7fa')
      }
  }
  ridge(52, 16, 3, far, s.season === 'winter')
  // the pagoda on the far ridge, at the right
  pagoda(p, 236, 40, mix(far, '#3a4250', 0.35))
  ridge(60, 10, 9, near, false)
  // mist along the foot of the hills
  p.dither(0, 52, GW, 12, horizon, 0.35)
}

function pagoda(p: Paint, x: number, base: number, c: string) {
  for (let i = 0; i < 6; i++) {
    const w = 9 - i
    const y = base - i * 3
    p.rect(x - Math.floor(w / 2), y - 2, w, 2, c)
    p.rect(x - Math.floor(w / 2) - 1, y - 2, w + 2, 1, c)
  }
  p.rect(x, base - 21, 1, 3, c)
}

// --- The wall: whitewash under a coping of grey tiles (粉墙黛瓦)

function wall(p: Paint, s: Scene) {
  // body, with damp at the foot and streaks from the rain
  p.rect(0, WALL_TOP, GW, WALL_BASE - WALL_TOP, '#ebe5d5')
  p.dither(0, WALL_BASE - 9, GW, 9, '#d8d0bc', 0.5)
  p.dither(0, WALL_BASE - 4, GW, 4, '#c9c1ab', 0.45)
  const r = rng(5)
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * GW)
    const len = 4 + Math.floor(r() * 14)
    p.dither(x, WALL_TOP + 2, 1, len, '#dcd5c3', 0.6)
  }
  // shadow under the eaves
  p.rect(0, WALL_TOP, GW, 1, '#c6bfac')
  p.dither(0, WALL_TOP + 1, GW, 2, '#cdc6b3', 0.5)
  // the coping: a ridge, rows of rolled tiles, the eave and its drips
  p.rect(0, COPING, GW, 1, '#2f323b')
  p.rect(0, COPING + 1, GW, 1, '#5d6270')
  for (let x = 0; x < GW; x++) {
    const k = x % 4
    const c =
      k === 0
        ? '#646a78'
        : k === 1
          ? '#525764'
          : k === 2
            ? '#454955'
            : '#393c46'
    p.rect(x, COPING + 2, 1, 4, c)
  }
  p.rect(0, COPING + 6, GW, 1, '#2b2d35')
  for (let x = 1; x < GW; x += 4) p.rect(x, COPING + 7, 2, 1, '#3a3d47')
  if (s.season === 'winter') {
    const sr = rng(8)
    for (let x = 0; x < GW; x++) {
      const h = 2 + (sr() < 0.3 ? 1 : 0)
      p.rect(x, COPING - h + 1, 1, h, '#f2f6fa')
      if (x % 4 === 3) p.rect(x, COPING + 1, 1, 1, '#d6e0ea')
    }
  }
  // the plinth
  p.rect(0, WALL_BASE, GW, GROUND - WALL_BASE, '#a39e92')
  p.rect(0, WALL_BASE, GW, 1, '#bdb8ac')
  for (let x = 6; x < GW; x += 16) p.rect(x, WALL_BASE + 1, 1, 3, '#827d72')
  p.rect(0, GROUND - 1, GW, 1, '#7d786d')
}

// --- The ground: a pebble walk along the wall, then moss or snow

const GRASS: Record<Season, [string, string, string]> = {
  spring: ['#8ab662', '#73a050', '#5f8c42'],
  summer: ['#62a04a', '#4f883c', '#3f7032'],
  autumn: ['#a9a35e', '#918b4a', '#7a733c'],
  winter: ['#f0f4f8', '#dfe7ef', '#c8d4e2'],
}

function ground(p: Paint, s: Scene) {
  // the walk: pebbles set in rings, as in the gardens' paving (花街铺地)
  const winter = s.season === 'winter'
  p.rect(0, GROUND, GW, 8, winter ? '#e4eaf0' : '#b7af9d')
  if (!winter)
    for (let y = GROUND; y < GROUND + 7; y++)
      for (let x = 0; x < GW; x++) {
        const cx = (x % 10) - 4.5
        const cy = ((y - GROUND) % 7) - 3
        const d = Math.hypot(cx, cy * 1.4)
        if (d > 2.6 && d < 3.8) p.px(x, y, '#9d9584')
        else if (d < 1.2) p.px(x, y, '#c9c1ae')
      }
  p.rect(0, GROUND + 7, GW, 1, winter ? '#c4d0dc' : '#857e6e')
  // moss, or snow: lighter behind, darker in front
  const [a, b, c] = GRASS[s.season]
  p.bands(0, GROUND + 8, GW, GH - GROUND - 8, [a, b, c])
  const r = rng(21)
  for (let i = 0; i < 150; i++) {
    const x = Math.floor(r() * GW)
    const y = GROUND + 9 + Math.floor(r() * (GH - GROUND - 9))
    if (pondDist(x, y) < 1.25) continue
    const t = r()
    // tufts of grass, two pixels high
    if (!winter && t < 0.45) {
      const tuft =
        s.season === 'autumn'
          ? '#7a733c'
          : s.season === 'summer'
            ? '#3f7032'
            : '#5f8c42'
      p.px(x, y, tuft)
      p.px(x + 1, y - 1, tuft)
      continue
    }
    if (s.season === 'spring')
      p.px(x, y, t < 0.6 ? '#fff4f6' : t < 0.75 ? '#f2c14e' : '#f0a0b8')
    else if (s.season === 'summer') p.px(x, y, t < 0.7 ? '#77b45a' : '#f2e6a0')
    else if (s.season === 'autumn') p.px(x, y, t < 0.7 ? '#c8862e' : '#b05a2a')
    else p.px(x, y, t < 0.7 ? '#ffffff' : '#c8d4e2')
  }
}

// --- The pond: a hollow until it is dug and filled

function pond(p: Paint, s: Scene, stage: number) {
  const winter = s.season === 'winter'
  for (let y = POND.cy - POND.ry - 4; y <= POND.cy + POND.ry + 5; y++)
    for (let x = POND.cx - POND.rx - 6; x <= POND.cx + POND.rx + 6; x++) {
      const d = pondDist(x, y)
      const front = y > POND.cy
      const rim = front ? 1.16 : 1.1
      if (d >= rim) continue
      if (d >= 1) {
        // stones round the edge, each a little different
        const a = Math.atan2(y - POND.cy, (x - POND.cx) / 3.8)
        const k = Math.floor((a + Math.PI) * 4.4)
        const tone = ['#9a958a', '#aaa598', '#8a857a', '#a0998c'][k % 4]
        const top = d < 1.04 && !front
        p.px(x, y, top ? '#6c675d' : d > rim - 0.03 ? '#6e695f' : tone)
        if (winter && !front && d > 1.04) p.px(x, y, '#f2f6fa')
        continue
      }
      if (stage < 2) {
        // dug, and dry but for a puddle in the middle
        const puddle = d < 0.35 && stage === 1
        p.px(x, y, puddle ? '#6a96a0' : d > 0.8 ? '#7d6e55' : '#8e7e62')
        if (puddle && d < 0.12) p.px(x, y, '#a8ccd0')
        continue
      }
      // water: the wall's reflection at the back, deeper in front
      const depth = (y - (POND.cy - POND.ry)) / (POND.ry * 2)
      let c = depth < 0.18 ? '#9cc4c0' : depth < 0.32 ? '#6aa4a2' : '#4a8a8c'
      if (depth > 0.6) c = '#3a767c'
      if (d > 0.9) c = '#2f6268'
      if (winter && (d > 0.72 || (x + y * 3) % 23 < 5))
        c = d > 0.72 ? '#dce8f0' : '#b8d0dc'
      p.px(x, y, c)
    }
  if (stage === 1) {
    // the earth dug out, and the spade still in it
    p.disc(POND.cx + 52, POND.cy + 6, 6, 3, '#7a6a4e')
    p.disc(POND.cx + 51, POND.cy + 5, 4, 2, '#8e7e62')
    p.line(POND.cx + 54, POND.cy - 4, POND.cx + 52, POND.cy + 4, '#8a5a3c')
    p.rect(POND.cx + 51, POND.cy + 4, 3, 2, '#8a8a90')
    marker(p, POND.cx - 40, POND.cy - 6)
  }
  if (stage === 2 && !winter) {
    // the reflection of the wall's coping, dark, broken by ripples
    for (let x = POND.cx - 36; x < POND.cx + 36; x++)
      if (pondDist(x, POND.cy - 9) < 0.96 && bayer(x, 0) < 0.6)
        p.px(x, POND.cy - 9, '#56777c')
  }
}

// --- Plum: a crooked old tree, in flower in late winter

function plum(p: Paint, s: Scene, stage: number) {
  const bark = '#4a3426'
  const barkLit = '#6e4f3a'
  const r = rng(stage === 2 ? 11 : 12)
  const tips: Array<[number, number]> = []
  const twigs: Array<[number, number]> = []
  const branch = (
    x: number,
    y: number,
    ang: number,
    len: number,
    w: number,
    depth: number,
  ) => {
    let cx = x
    let cy = y
    let a = ang
    for (let i = 0; i < len; i++) {
      // plum wood bends in sharp turns
      if (r() < 0.18) a += (r() - 0.5) * 0.9
      cx += Math.cos(a)
      cy += Math.sin(a)
      p.rect(cx - w / 2, cy - w / 2, w, w, bark)
      if (w > 1) p.px(cx - w / 2, cy - w / 2, barkLit)
      if (s.season === 'winter' && w > 1 && Math.abs(Math.cos(a)) > 0.5)
        p.px(cx, cy - w / 2 - 1, '#f2f6fa')
      if (depth <= 1) twigs.push([cx, cy])
    }
    if (depth <= 0 || w < 1) {
      tips.push([cx, cy])
      return
    }
    const n = depth > 2 ? 2 : 2 + (r() < 0.4 ? 1 : 0)
    for (let k = 0; k < n; k++)
      branch(
        cx,
        cy,
        a + (k - (n - 1) / 2) * (0.7 + r() * 0.4) + (r() - 0.5) * 0.3,
        len * (0.62 + r() * 0.2),
        Math.max(1, w - 1),
        depth - 1,
      )
  }
  if (stage === 1) {
    // a young tree, staked
    p.rect(29, 96, 2, 15, bark)
    p.px(29, 96, barkLit)
    branch(30, 98, -Math.PI / 2 - 0.5, 8, 1, 1)
    branch(30, 101, -0.6, 7, 1, 1)
    branch(30, 95, -Math.PI / 2 + 0.2, 6, 1, 1)
    p.rect(33, 100, 1, 11, '#a0784e')
    p.px(31, 102, '#c8b088')
    marker(p, 24, 111)
  } else {
    // the trunk leans and twists before it splits
    p.rect(26, 104, 7, 7, bark)
    p.rect(25, 109, 9, 2, '#3a281e')
    branch(29, 106, -Math.PI / 2 - 0.25, 14, 4, 4)
    branch(30, 98, -0.35, 12, 2, 3)
    branch(28, 94, -Math.PI + 0.45, 11, 2, 3)
  }
  const blossom = (x: number, y: number) => {
    const t = r()
    if (s.season === 'winter') {
      p.px(x, y, t < 0.45 ? '#f6b6c8' : t < 0.8 ? '#ffe8ee' : '#e07a96')
      if (t < 0.3) p.px(x + 1, y, '#f9cdd8')
    } else if (s.season === 'spring') {
      p.px(x, y, t < 0.35 ? '#a8d878' : t < 0.6 ? '#f6c6d4' : '#8cc060')
    } else if (s.season === 'summer') {
      p.rect(x, y, 2, 1, t < 0.5 ? '#4f8a3a' : '#6aaa48')
      if (t < 0.06) p.px(x, y + 1, '#b8c84a')
    } else if (t < 0.6) {
      p.px(x, y, t < 0.3 ? '#d8a03a' : '#c0702a')
    }
  }
  for (const [x, y] of twigs)
    if (r() < (stage === 2 ? 0.55 : 0.5))
      blossom(Math.round(x + (r() - 0.5) * 3), Math.round(y + (r() - 0.5) * 3))
  for (const [x, y] of tips) {
    blossom(Math.round(x), Math.round(y))
    blossom(Math.round(x + 1), Math.round(y - 1))
  }
}

// --- A scholar's rock, worn into holes by water (太湖石)

function rock(p: Paint, s: Scene, stage: number) {
  if (stage === 1) {
    // a stone come for the garden, waiting to be set up
    p.disc(72, 106, 6, 4, '#8f8c86')
    p.disc(71, 105, 4, 2, '#a9a69e')
    p.px(70, 104, '#c4c1b8')
    p.disc(75, 107, 1, 1, '#5d5b56')
    p.rect(65, 110, 14, 1, '#6c6a64')
    marker(p, 80, 110)
    return
  }
  // thin, wrinkled, holed and open to the light: a stone worn by water,
  // heavier at the top than at its waist
  const outline: Array<[number, number]> = [
    [64, 110],
    [63, 104],
    [65, 99],
    [63, 94],
    [61, 89],
    [62, 84],
    [64, 80],
    [67, 77],
    [71, 75],
    [74, 77],
    [77, 76],
    [80, 78],
    [82, 82],
    [81, 86],
    [78, 90],
    [79, 94],
    [81, 98],
    [80, 103],
    [82, 107],
    [80, 110],
  ]
  const inside = (x: number, y: number) => {
    let c = false
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const [xi, yi] = outline[i]
      const [xj, yj] = outline[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        c = !c
    }
    return c
  }
  for (let y = 74; y <= 110; y++) {
    let x0 = Infinity
    let x1 = -Infinity
    for (let x = 58; x < 86; x++)
      if (inside(x + 0.5, y + 0.5)) {
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
      }
    if (x0 > x1) continue
    for (let x = x0; x <= x1; x++) {
      if (!inside(x + 0.5, y + 0.5)) continue
      const u = (x - x0) / Math.max(1, x1 - x0)
      let c =
        u < 0.25
          ? '#c2bfb7'
          : u < 0.55
            ? '#a4a199'
            : u < 0.8
              ? '#8a8781'
              : '#72706a'
      // wrinkles, running down and across
      if ((x * 3 + y * 2) % 11 === 0 && u > 0.15 && u < 0.85) c = '#7c7a74'
      const edge =
        !inside(x - 0.5, y + 0.5) ||
        !inside(x + 1.5, y + 0.5) ||
        !inside(x + 0.5, y - 0.5)
      p.px(x, y, edge ? '#56544f' : c)
    }
  }
  // holes, each with a lit lower lip; one goes right through to the wall
  for (const [x, y, w, h, through] of [
    [69, 81, 3, 3, true],
    [74, 86, 2, 2, false],
    [66, 92, 2, 2, false],
    [72, 97, 3, 2, true],
    [76, 103, 1, 2, false],
    [68, 105, 2, 1, false],
  ] as const) {
    p.rect(x, y, w, h, through ? '#e2dccb' : '#3f3d3a')
    p.rect(x - 1, y, 1, h, '#4a4844')
    p.rect(x, y + h, w, 1, '#cfccc3')
  }
  if (s.season === 'winter') {
    p.rect(66, 77, 5, 1, '#f2f6fa')
    p.rect(72, 75, 2, 1, '#f2f6fa')
    p.rect(76, 77, 4, 1, '#f2f6fa')
  }
  p.rect(62, 110, 21, 1, '#5a574f')
}

// --- Bamboo against the wall at the right

function bamboo(p: Paint, s: Scene, stage: number) {
  const r = rng(31)
  if (stage === 1) {
    // shoots through the ground, and one young stem
    for (const [x, h] of [
      [236, 7],
      [243, 9],
      [250, 6],
    ]) {
      p.poly(
        [
          [x, GROUND + 1],
          [x + 5, GROUND + 1],
          [x + 2.5, GROUND - h],
        ],
        '#8a7a3a',
      )
      p.px(x + 2, GROUND - h + 2, '#c8b060')
      p.px(x + 1, GROUND - 2, '#6a5a2a')
    }
    for (let y = GROUND - 24; y < GROUND; y++) p.rect(247, y, 1, 1, '#6faa48')
    p.line(248, GROUND - 22, 252, GROUND - 20, '#5a9a3a')
    p.line(246, GROUND - 17, 242, GROUND - 15, '#86c05a')
    marker(p, 231, GROUND + 1)
    return
  }
  const culms = [230, 235, 239, 243, 247, 251, 254]
  for (const x of culms) {
    const top = 22 + Math.floor(r() * 18)
    const bend = (r() - 0.5) * 3
    for (let y = top; y < GROUND + 1; y++) {
      const t = (GROUND - y) / (GROUND - top)
      const cx = Math.round(x + bend * t * t)
      p.rect(cx, y, 2, 1, (y - top) % 9 === 0 ? '#3d6a28' : '#5f9a3a')
      p.px(cx, y, '#7fb84f')
    }
    // leaves, in sprays from the nodes of the upper half
    for (let y = top; y < top + (GROUND - top) * 0.6; y += 5) {
      const side = r() < 0.5 ? -1 : 1
      const ox = Math.round(x + bend * ((GROUND - y) / (GROUND - top)) ** 2)
      for (let k = 0; k < 3; k++) {
        const lx = ox + side * (2 + k * 2)
        const ly = y + k + Math.floor(r() * 2)
        const c = k === 0 ? '#3f7a2a' : k === 1 ? '#5a9a3a' : '#86c05a'
        p.line(lx, ly, lx + side * 4, ly + 2, c)
        if (s.season === 'winter' && k === 1) p.px(lx + side, ly - 1, '#f2f6fa')
      }
    }
  }
}

// --- The moon gate: a round doorway into the next courtyard

function gate(p: Paint, s: Scene, stage: number) {
  const { cx, cy, r } = GATE
  if (stage === 1) {
    // marked out on the wall, not yet cut
    for (let a = 0; a < 64; a++) {
      if (a % 3 === 2) continue
      const t = (a / 64) * Math.PI * 2
      p.px(
        cx + Math.round(Math.cos(t) * r),
        cy + Math.round(Math.sin(t) * r),
        '#9c9484',
      )
    }
    marker(p, cx + r + 3, WALL_BASE + 3)
    return
  }
  const winter = s.season === 'winter'
  const green = winter
    ? '#e8eef2'
    : s.season === 'autumn'
      ? '#b89a48'
      : '#5f9a46'
  const greenDark = winter
    ? '#c8d4e0'
    : s.season === 'autumn'
      ? '#8a6a30'
      : '#3f7a36'
  for (let y = cy - r - 2; y <= cy + r + 2; y++)
    for (let x = cx - r - 2; x <= cx + r + 2; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (y > WALL_BASE) continue
      if (d < r) {
        // beyond: the sky, a further wall with a doorway, a path between
        // paving stones, and a shrub
        let c: string
        if (y < cy - 8 && d < r - 1.5) {
          // the sky itself shows through
          p.g.clearRect(x, y, 1, 1)
          continue
        }
        if (y < cy - 6) c = '#4f535e'
        else if (y < cy + 3) c = '#efe9dc'
        else c = (x + (y >> 1)) % 4 === 0 ? '#b8af98' : '#cfc6b0'
        // the path, narrowing into the distance
        const half = 1 + (y - (cy + 3)) * 0.45
        if (y >= cy + 3 && Math.abs(x + 0.5 - cx) < half) c = '#e2dbc9'
        // the far doorway, dark, with light beyond
        if (y >= cy - 4 && y < cy + 3 && Math.abs(x + 0.5 - cx) < 2.5)
          c = y < cy - 2 ? '#5a5c62' : '#d8d0bc'
        // a round shrub to the right, a rock to the left
        if (Math.hypot(x + 0.5 - (cx + 7), (y + 0.5 - (cy + 1)) * 1.2) < 4.2)
          c = bayer(x, y) < 0.5 ? green : greenDark
        if (Math.hypot(x + 0.5 - (cx - 7), (y + 0.5 - (cy + 4)) * 1.4) < 2.6)
          c = '#9a978e'
        // the inner edge of the opening, in shadow at the top
        if (d > r - 1.5 && y < cy) c = '#a9a291'
        p.px(x, y, c)
      } else if (d < r + 2) {
        p.px(x, y, d < r + 1 ? '#a8a294' : '#8f897b')
      }
    }
  // the threshold
  p.rect(cx - 9, WALL_BASE, 18, 1, '#8f897b')
}

// --- Lattice windows (漏窗): the garden beyond, through plaster lace

const LATTICE = [
  'WWWWWWWWWWWWW',
  'W...W...W...W',
  'W..W.W.W.W..W',
  'W.W...W...W.W',
  'WW...W.W...WW',
  'W...W...W...W',
  'W..W..W..W..W',
  'W...W...W...W',
  'WW...W.W...WW',
  'W.W...W...W.W',
  'W..W.W.W.W..W',
  'W...W...W...W',
  'WWWWWWWWWWWWW',
]

function windows(p: Paint, stage: number) {
  for (const x of [76, 146]) {
    const y = 69
    if (stage === 1) {
      p.rect(x, y, 13, 1, '#a49d8e')
      p.rect(x, y + 12, 13, 1, '#a49d8e')
      p.rect(x, y, 1, 13, '#a49d8e')
      p.rect(x + 12, y, 1, 13, '#a49d8e')
      continue
    }
    p.rect(x - 1, y - 1, 15, 15, '#9a9384')
    p.bands(x, y, 13, 13, ['#7fa070', '#5a7a52', '#4a6446'])
    p.sprite(LATTICE, { W: '#e8e2d2' }, x, y)
    p.rect(x - 1, y + 14, 15, 1, '#c5bead')
  }
}

// --- A dragon along the coping, as on the walls of the Yu Garden

function dragon(p: Paint, s: Scene, stage: number) {
  const dark = '#30333d'
  const body = '#545a69'
  const lit = '#7d8494'
  const belly = '#a7a08a'
  const head = 15
  const end = stage === 2 ? 106 : head + 12
  // the body, rising and falling along the ridge, tapering to the tail
  for (let x = head + 9; x < end; x++) {
    const y = Math.round(COPING - 3 + 2 * Math.sin((x - head) / 8))
    const left = end - x
    const thick = left < 14 ? Math.max(1, Math.round(left / 4)) : 4
    p.rect(x, y - thick + 1, 1, thick, body)
    p.px(x, y - thick + 1, (x >> 1) % 2 ? lit : body)
    if (thick > 2) p.px(x, y, belly)
    p.px(x, y + 1, dark)
    // spines along its back, and its feet
    if (x % 4 === 0 && thick > 2) p.px(x, y - thick, dark)
    if ((x - head) % 22 === 11 && thick > 2) {
      p.rect(x, y + 1, 1, 2, body)
      p.rect(x - 1, y + 3, 3, 1, dark)
    }
    if (s.season === 'winter' && x % 2 === 0) p.px(x, y - thick, '#f2f6fa')
  }
  // the head, raised, jaws open towards the pearl it chases
  p.sprite(
    [
      '...h...h....',
      '....h.h.....',
      '...bbbbbbl..',
      '..bbebbbbbb.',
      '.bbbbbbbbbbb',
      'wbbbbbbbbbbb',
      '.w.....bbbbb',
      'rrr...bbbbbb',
      '.w....bbbbb.',
      'wbbbbbbbbbb.',
      '.bbbbbbbbb..',
    ],
    { b: body, l: lit, h: '#b8a878', e: '#f2c14e', w: '#f2ede0', r: '#c8372d' },
    head,
    COPING - 14,
  )
  // whiskers, and the pearl
  p.line(head, COPING - 9, head - 3, COPING - 12, '#b8a878')
  p.px(head - 4, COPING - 12, '#b8a878')
  if (stage === 2) {
    p.disc(head - 7, COPING - 6, 2, 2, '#f2c14e')
    p.px(head - 8, COPING - 7, '#fff2b0')
    p.px(head - 10, COPING - 6, '#e0402a')
    p.px(head - 7, COPING - 9, '#e0402a')
    p.px(head - 5, COPING - 9, '#e07a2a')
  }
}

// --- The pavilion: red columns under a sweeping roof

function pavilion(p: Paint, s: Scene, stage: number) {
  const cx = 212
  // platform, two steps
  p.rect(cx - 22, 98, 44, 3, '#b3ad9f')
  p.rect(cx - 22, 98, 44, 1, '#cbc5b7')
  p.rect(cx - 24, 101, 48, 3, '#9c9688')
  p.rect(cx - 24, 101, 48, 1, '#b3ad9f')
  const cols = [cx - 18, cx - 7, cx + 5, cx + 16]
  const top = stage === 2 ? 77 : 82
  for (const x of cols) {
    p.rect(x, top, 2, 98 - top, '#a8261c')
    p.px(x, top, '#c8372d')
    p.rect(x + 1, top, 1, 98 - top, '#7c1a12')
  }
  if (stage === 1) {
    // the frame stands; timber and tiles wait beside it
    p.rect(cx - 18, top, 36, 1, '#8a5a3c')
    p.rect(cx + 23, 95, 9, 2, '#8a5a3c')
    p.rect(cx + 24, 93, 7, 2, '#a0704a')
    p.rect(cx + 25, 91, 5, 2, '#4b4f5c')
    return
  }
  // the bench between the columns, in lattice
  p.rect(cx - 18, 90, 36, 1, '#7c1a12')
  for (let x = cx - 17; x < cx + 17; x += 3) p.rect(x, 91, 1, 4, '#8a2a1c')
  p.rect(cx - 18, 94, 36, 1, '#7c1a12')
  // the beam, painted in the Suzhou manner
  p.rect(cx - 20, 74, 40, 3, '#a8261c')
  for (let x = cx - 19; x < cx + 19; x += 4) {
    p.px(x, 75, '#2f7d6d')
    p.px(x + 1, 75, '#3d6fa8')
    p.px(x + 2, 75, '#d9a441')
  }
  p.rect(cx - 20, 77, 40, 1, '#2a1a14')
  // the roof: a concave sweep from the ridge to eaves that turn up
  const eave = 73
  const ridge = 56
  const half = (y: number) => {
    // wide at the eaves, narrowing faster near the top
    const t = (eave - y) / (eave - ridge)
    return 31 - 27 * Math.pow(t, 0.62)
  }
  for (let y = ridge; y <= eave; y++) {
    const hw = Math.round(half(y))
    for (let x = cx - hw; x <= cx + hw; x++) {
      const k = (x - cx + 64) % 3
      p.px(x, y, k === 0 ? '#3b3e49' : k === 1 ? '#4f5462' : '#5d6270')
    }
    p.px(cx - hw, y, '#6e7482')
    p.px(cx + hw, y, '#2f323b')
  }
  // the eaves' line and the upturned corners
  p.rect(cx - 31, eave + 1, 62, 1, '#2b2d35')
  for (let i = 0; i < 5; i++) {
    p.px(cx - 31 - i, eave - i, '#3b3e49')
    p.px(cx - 32 - i, eave - i, '#5d6270')
    p.px(cx + 31 + i, eave - i, '#3b3e49')
    p.px(cx + 32 + i, eave - i, '#2f323b')
  }
  if (s.season === 'winter')
    for (let y = ridge; y <= eave; y += 1) {
      const hw = Math.round(half(y))
      if (y % 2 === 0) p.rect(cx - hw + 1, y, hw * 2 - 1, 1, '#eef3f8')
    }
  // the finial, a gilded gourd
  p.rect(cx - 1, ridge - 3, 3, 3, '#d9a441')
  p.px(cx, ridge - 5, '#d9a441')
  p.px(cx, ridge - 4, '#f2c14e')
}

function redLanterns(p: Paint, s: Scene, stage: number) {
  const spots = lanternSpots(s).slice(0, stage === 2 ? 2 : 1)
  for (const [x, y] of spots) {
    p.rect(x, y, 1, 4, '#3b2a1a')
    p.rect(x - 1, y + 4, 3, 1, '#d9a441')
    p.disc(x, y + 7, 2, 2, s.daytime === 'night' ? '#e04a30' : '#c8322a')
    p.px(x - 1, y + 6, '#ea6a4a')
    p.rect(x - 1, y + 10, 3, 1, '#d9a441')
    p.rect(x, y + 11, 1, 2, '#c8322a')
  }
}

// --- The willow's trunk; its hanging boughs sway (garden/life.ts)

function willowTrunk(p: Paint, s: Scene, stage: number) {
  const { x, y } = WILLOW
  const h = stage === 2 ? 52 : 22
  for (let i = 0; i < h; i++) {
    const cx = Math.round(x + Math.sin(i / 9) * 2 - i * 0.06)
    const w = stage === 2 ? (i < 8 ? 4 : i < 30 ? 3 : 2) : 1
    p.rect(cx, y - i, w, 1, '#5a4636')
    if (w > 1) p.px(cx, y - i, '#7a6048')
  }
  if (stage === 2) {
    // the crown's main limbs
    p.line(x + 1, y - 40, x - 14, y - 66, '#5a4636', 2)
    p.line(x + 1, y - 44, x + 16, y - 70, '#5a4636', 2)
    p.line(x, y - 50, x + 2, y - 74, '#5a4636', 1)
  }
  if (s.season === 'winter' && stage === 2)
    p.rect(x - 13, y - 66, 3, 1, '#f2f6fa')
}

// --- Taiji, laid in dark and light pebbles in the ground

function taiji(p: Paint, stage: number) {
  const cx = 46
  const cy = 136
  const rx = 14
  const ry = 5
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      const d = Math.hypot(dx, dy)
      if (d > 1) continue
      if (stage === 1) {
        if (d > 0.86) p.px(x, y, '#e8e2d0')
        continue
      }
      if (d > 0.88) {
        p.px(x, y, '#8d8676')
        continue
      }
      // the two halves, with their eyes
      const upper = Math.hypot(dx, dy + 0.5) < 0.5
      const lower = Math.hypot(dx, dy - 0.5) < 0.5
      let dark = dx < 0
      if (upper) dark = false
      if (lower) dark = true
      if (Math.hypot(dx, dy + 0.5) < 0.16) dark = true
      if (Math.hypot(dx, dy - 0.5) < 0.16) dark = false
      const base = dark ? '#4a4744' : '#ded8c8'
      p.px(x, y, bayer(x, y) < 0.2 ? (dark ? '#5e5a55' : '#c8c1ae') : base)
    }
}

// --- The zigzag bridge (九曲桥), low over the water

const BRIDGE: Array<[number, number]> = [
  [79, 118],
  [96, 118],
  [104, 122],
  [126, 122],
  [133, 117],
  [152, 117],
  [160, 121],
  [170, 121],
]

function bridge(p: Paint, s: Scene, stage: number) {
  if (stage === 1) {
    // the piers are in; planks wait on the bank
    for (let i = 0; i + 1 < BRIDGE.length; i++) {
      const [x0, y0] = BRIDGE[i]
      const [x1, y1] = BRIDGE[i + 1]
      for (let x = x0; x <= x1; x++)
        if (x % 12 === 3) {
          const y = Math.round(
            y0 + ((y1 - y0) * (x - x0)) / Math.max(1, x1 - x0),
          )
          p.rect(x, y, 2, 4, '#7f786a')
          p.px(x, y, '#a59c8c')
        }
    }
    p.rect(POND.cx + 49, POND.cy - 9, 10, 1, '#b08a5a')
    p.rect(POND.cx + 48, POND.cy - 8, 12, 1, '#8a6a42')
    p.rect(POND.cx + 49, POND.cy - 10, 9, 1, '#c8a070')
    return
  }
  for (let i = 0; i + 1 < BRIDGE.length; i++) {
    const [x0, y0] = BRIDGE[i]
    const [x1, y1] = BRIDGE[i + 1]
    const n = Math.max(1, x1 - x0)
    for (let k = 0; k <= n; k++) {
      const x = x0 + k
      const y = Math.round(y0 + ((y1 - y0) * k) / n)
      // piers into the water, the deck, its edge, the low railing
      if (x % 12 === 3) p.rect(x, y + 3, 2, 2, '#6f685c')
      p.rect(x, y, 1, 2, '#c4bba9')
      p.rect(x, y + 2, 1, 1, '#8e8676')
      p.px(x, y - 3, '#d2c9b6')
      if (x % 4 === 0) p.rect(x, y - 2, 1, 2, '#a59c8c')
      if (s.season === 'winter') p.px(x, y - 4, '#f2f6fa')
    }
  }
}

// --- Lotus leaves on the water, and flowers in summer

const LOTUS: Array<[number, number, number]> = [
  [143, 127, 4],
  [151, 124, 3],
  [156, 129, 4],
  [136, 130, 3],
  [99, 126, 3],
  [92, 123, 2],
  [112, 112, 3],
  [145, 113, 2],
]

function lotus(p: Paint, s: Scene, stage: number) {
  const leaves = stage === 2 ? LOTUS : LOTUS.slice(0, 2)
  const r = rng(41)
  for (const [x, y, size] of leaves) {
    if (pondDist(x, y) > 0.92) continue
    const w = stage === 2 ? size : 2
    if (s.season === 'winter') {
      // broken stalks standing in the ice
      p.line(x, y, x + 1, y - 4, '#7a6a4a')
      p.px(x + 2, y - 4, '#7a6a4a')
      continue
    }
    const leaf = s.season === 'autumn' ? '#9a8a3a' : '#4f8a3a'
    const lit =
      s.season === 'autumn'
        ? '#b8a04a'
        : s.season === 'spring'
          ? '#8ac860'
          : '#6faa4a'
    p.disc(x, y, w, Math.max(1, Math.floor(w / 2)), leaf)
    p.rect(x - w + 1, y - Math.floor(w / 2), w * 2 - 1, 1, lit)
    p.px(x + 1, y, '#3a6a2e')
    if (s.season === 'summer' && stage === 2 && r() < 0.6) {
      // a stem and a flower above the leaf
      p.rect(x - 1, y - 4, 1, 3, '#4f8a3a')
      p.rect(x - 2, y - 6, 3, 2, '#f39ab8')
      p.px(x - 3, y - 7, '#f6c0d4')
      p.px(x + 1, y - 7, '#f6c0d4')
      p.px(x - 1, y - 7, '#fff0f4')
      p.px(x - 1, y - 5, '#f2c14e')
    }
    if (s.season === 'autumn' && r() < 0.4) {
      p.rect(x, y - 5, 1, 4, '#6a5a2a')
      p.rect(x - 1, y - 6, 3, 1, '#8a7a3a')
    }
  }
}

// --- A stone lantern by the water

function stoneLantern(p: Paint, s: Scene, stage: number) {
  const { x, y } = LANTERN
  const c = '#a19c90'
  const dark = '#79746a'
  p.rect(x - 4, y - 3, 9, 3, c)
  p.rect(x - 4, y - 1, 9, 1, dark)
  p.rect(x - 1, y - 10, 3, 7, c)
  p.rect(x + 1, y - 10, 1, 7, dark)
  if (stage === 1) {
    // the rest of it, cut and waiting on the grass
    p.rect(x + 6, y - 2, 6, 3, c)
    p.rect(x + 6, y, 6, 1, dark)
    p.rect(x + 7, y - 4, 4, 2, '#8f8a80')
    marker(p, x - 7, y)
    return
  }
  // the firebox, its window, the cap and the jewel on top
  p.rect(x - 3, y - 16, 7, 6, c)
  p.rect(x - 1, y - 15, 3, 3, s.daytime === 'night' ? '#ffd27a' : '#2a2620')
  p.rect(x + 2, y - 16, 2, 6, dark)
  p.rect(x - 5, y - 18, 11, 2, c)
  p.rect(x - 6, y - 17, 13, 1, dark)
  p.rect(x - 3, y - 19, 7, 1, c)
  p.rect(x - 1, y - 21, 3, 2, c)
  p.px(x, y - 22, c)
  if (s.season === 'winter') {
    p.rect(x - 5, y - 19, 11, 1, '#f2f6fa')
    p.rect(x - 2, y - 22, 4, 1, '#f2f6fa')
  }
}

// --- An armillary sphere of bronze, as in Beijing's old observatory

function sphere(p: Paint, s: Scene, stage: number) {
  const cx = 15
  const cy = 120
  const bronze = '#4f7a62'
  const lit = '#9cc8a8'
  const deep = '#2f4a3c'
  // the stone base and the stand
  p.rect(cx - 8, 138, 17, 3, '#8f8a80')
  p.rect(cx - 8, 138, 17, 1, '#aaa59a')
  p.rect(cx - 6, 136, 13, 2, '#7d786e')
  if (stage === 1) {
    p.rect(cx - 1, 128, 3, 8, bronze)
    p.px(cx - 1, 128, lit)
    marker(p, cx + 10, 141)
    return
  }
  // dragon-like legs curling up to the rings
  p.line(cx - 6, 136, cx - 4, 129, bronze)
  p.line(cx + 6, 136, cx + 4, 129, bronze)
  p.px(cx - 7, 136, deep)
  p.px(cx + 7, 136, deep)
  p.rect(cx - 1, 129, 3, 7, bronze)
  p.px(cx - 1, 129, lit)
  // the rings: the meridian, the equator and the ecliptic, and the axis
  const ring = (
    rx: number,
    ry: number,
    tilt: number,
    c1: string,
    c2: string,
  ) => {
    for (let t = 0; t < 72; t++) {
      const a = (t / 72) * Math.PI * 2
      const ex = Math.cos(a) * rx
      const ey = Math.sin(a) * ry
      const x = Math.round(cx + ex * Math.cos(tilt) - ey * Math.sin(tilt))
      const y = Math.round(cy + ex * Math.sin(tilt) + ey * Math.cos(tilt))
      // the far half darker
      p.px(x, y, Math.sin(a) < 0 ? c2 : c1)
    }
  }
  ring(9, 9, 0, lit, bronze)
  ring(9, 3, 0.35, bronze, deep)
  ring(8, 3, -0.5, lit, deep)
  p.line(cx - 5, cy + 7, cx + 5, cy - 7, deep)
  p.px(cx, cy, '#f2c14e')
  if (s.season === 'winter') p.rect(cx - 3, cy - 9, 7, 1, '#f2f6fa')
}

// --- A stone table set for Go

function goTable(p: Paint, s: Scene, stage: number) {
  const cx = 207
  const stool = (x: number) => {
    p.disc(x, 135, 3, 1, '#a8a296')
    p.rect(x - 2, 135, 5, 3, '#8f897d')
    p.rect(x - 3, 138, 7, 1, '#6f6a60')
  }
  stool(cx - 12)
  stool(cx + 12)
  if (stage === 1) return
  p.rect(cx - 2, 129, 5, 9, '#8f897d')
  p.rect(cx - 4, 137, 9, 2, '#7a7468')
  p.disc(cx, 128, 9, 2, '#a8a296')
  p.rect(cx - 9, 128, 19, 1, '#8f897d')
  // the board, and stones in play
  p.rect(cx - 5, 126, 11, 3, '#d8b878')
  for (let x = cx - 4; x <= cx + 4; x += 2) p.rect(x, 126, 1, 3, '#a8884e')
  p.rect(cx - 5, 127, 11, 1, '#a8884e')
  p.px(cx - 2, 126, '#1b1418')
  p.px(cx + 2, 127, '#1b1418')
  p.px(cx, 128, '#f6f2ea')
  p.px(cx + 4, 126, '#f6f2ea')
  if (s.season === 'winter') p.rect(cx - 8, 127, 3, 1, '#f2f6fa')
}

// --- Chrysanthemums in pots, at their best in autumn

function mums(p: Paint, s: Scene, stage: number) {
  const r = rng(61)
  const pots = stage === 2 ? [231, 241, 251] : [241]
  for (const x of pots) {
    const y = 141
    // a blue and white pot
    p.rect(x - 3, y - 4, 7, 5, '#e8eef2')
    p.rect(x - 3, y - 2, 7, 1, '#3d6fa8')
    p.rect(x + 2, y - 4, 2, 5, '#c4ccd4')
    p.rect(x - 4, y - 5, 9, 1, '#d4dce4')
    // leaves, and flowers by the season
    const leaf = s.season === 'winter' ? '#7a6a4a' : '#4a7a36'
    p.disc(x, y - 8, 4, 3, leaf)
    p.dither(x - 4, y - 11, 9, 6, '#6aa048', s.season === 'winter' ? 0 : 0.35)
    const n = s.season === 'autumn' ? 6 : s.season === 'summer' ? 2 : 0
    for (let i = 0; i < n; i++) {
      const fx = x - 3 + Math.floor(r() * 7)
      const fy = y - 12 + Math.floor(r() * 4)
      const c = r() < 0.5 ? '#f2c14e' : r() < 0.5 ? '#e8902a' : '#f6e08a'
      p.rect(fx, fy, 2, 2, c)
      p.px(fx, fy, '#fff2b0')
    }
  }
}

function marker(p: Paint, x: number, y: number) {
  p.rect(x, y - 6, 1, 6, '#8a5a3c')
  p.rect(x + 1, y - 6, 2, 1, '#c8372d')
  p.px(x + 2, y - 5, '#a62a22')
  p.px(x, y, '#5a3a22')
}

export function lanternSpots(s: Scene): Array<[number, number]> {
  return (s.stages.pavilion ?? 0) === 2
    ? [
        [190, 74],
        [233, 74],
      ]
    : [
        [101, 64],
        [139, 64],
      ]
}
