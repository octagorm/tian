import type { Look } from './Pix'

// People standing in a scene, head to toe, 52 pixels tall, in the
// three-quarter view of the LucasArts adventures: built from a cast
// member's look (hair, hat, beard, glasses, coat) and a pose (breathing,
// blinking, talking, a gesture, a step of a walk). A figure faces right;
// the stage flips it to face left.
//
// It is drawn into a buffer of palette slots, then outlined in a darker
// shade of whatever it borders (as sprites of the time were), tinted by
// the scene's light and lit along one edge. No DOM here, so it can be
// drawn anywhere; the stage turns the pixels into a canvas.

// Traits a look may add for a full figure, beyond the portrait's
export interface CastLook extends Look {
  // What is worn over the body
  top?:
    | 'jacket'
    | 'uniform'
    | 'apron'
    | 'silk'
    | 'hoodie'
    | 'cardigan'
    | 'tee'
    | 'qipao'
    | 'vest'
  // Trousers (or skirt) and shoes
  legs?: string
  skirt?: boolean
  shoes?: string
  // A conical straw hat instead of a cap, for the `cap` style
  cone?: boolean
  // VR goggles pushed up on the forehead
  goggles?: boolean
  // Something in the hand
  hold?:
    | 'flag'
    | 'phone'
    | 'book'
    | 'notepad'
    | 'fan'
    | 'skewers'
    | 'key'
    | 'camera'
    | 'ticket'
  // A backpack, in this colour
  pack?: string
  // Colour of an apron, a flag or a waistcoat's shirt
  accent?: string
}

export type Arm = 'down' | 'chest' | 'out' | 'up' | 'wave'

export interface Pose {
  // Breathing out: shoulders and head a pixel lower
  breath?: number
  blink?: boolean
  // 0 closed, 1 open, 2 wide
  mouth?: number
  arm?: Arm
  // A step of a walk, 0 to 3; leave out to stand
  walk?: number
  // A flag in the hand flutters between two frames
  flutter?: number
}

export interface Light {
  // Colour multiplied into the figure, and how much
  tint?: string
  tintAmount?: number
  // The side the light comes from (-1 left, 1 right, in the figure's
  // own frame before any flip), its colour and strength
  side?: number
  rim?: string
  rimAmount?: number
  // A second light from the other side, as under neon
  rim2?: string
  rim2Amount?: number
}

export interface Pixels {
  w: number
  h: number
  // The point between the feet, on the ground
  ax: number
  ay: number
  data: Uint8ClampedArray
}

// The figure's own size, and its buffer: room above for hats and flags,
// and to the sides for arms
export const FIGURE_H = 52
const TOP = 14
const BW = 36
const BH = TOP + FIGURE_H + 1
const CX = 17
// The top of the skull
const Y0 = TOP

// --- Colour ---

type RGB = [number, number, number]

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
// Darker and a little cooler and richer, as painted shadows are; lighter
// and a little warmer
const shadeOf = (c: RGB, f: number): RGB =>
  mix(c, [c[0] * 0.55, c[1] * 0.55 + 4, c[2] * 0.62 + 18], 1 - f)
const lightOf = (c: RGB, f: number): RGB => mix(c, [255, 244, 214], f)

// Palette slots
const P = {
  none: 0,
  skin: 1,
  skinS: 2,
  skinD: 3,
  skinL: 4,
  hair: 5,
  hairS: 6,
  hairL: 7,
  coat: 8,
  coatS: 9,
  coatD: 10,
  coatL: 11,
  legs: 12,
  legsS: 13,
  shoe: 14,
  shoeL: 15,
  eye: 16,
  white: 17,
  lip: 18,
  mouth: 19,
  shirt: 20,
  shirtS: 21,
  hat: 22,
  hatS: 23,
  hatL: 24,
  gold: 25,
  goldS: 36,
  apron: 26,
  apronS: 27,
  frame: 28,
  item: 29,
  itemS: 30,
  itemL: 31,
  pack: 32,
  packS: 33,
  wood: 34,
  red: 35,
  count: 37,
} as const
type P = number

function palette(l: CastLook): Array<RGB> {
  const p: Array<RGB> = new Array<RGB>(P.count).fill([0, 0, 0])
  const skin = hex(l.skin ?? '#e8b98f')
  const hair = hex(l.old ? '#d8d2c6' : (l.hair ?? '#2a1d14'))
  const coat = hex(l.coat)
  const trousers = hex(l.legs ?? defaultLegs(l))
  const hat = hex(l.hat ?? '#2b3a55')
  const accent = hex(l.accent ?? '#f4efe6')
  p[P.skin] = skin
  p[P.skinS] = shadeOf(skin, 0.8)
  p[P.skinD] = shadeOf(skin, 0.62)
  p[P.skinL] = lightOf(skin, 0.3)
  p[P.hair] = hair
  p[P.hairS] = shadeOf(hair, l.old ? 0.75 : 0.62)
  p[P.hairL] = lightOf(hair, l.old ? 0.35 : 0.22)
  p[P.coat] = coat
  p[P.coatS] = shadeOf(coat, 0.74)
  p[P.coatD] = shadeOf(coat, 0.52)
  p[P.coatL] = lightOf(coat, 0.22)
  p[P.legs] = trousers
  p[P.legsS] = shadeOf(trousers, 0.7)
  const shoe = hex(l.shoes ?? '#2a211c')
  p[P.shoe] = shoe
  p[P.shoeL] = lightOf(shoe, 0.25)
  p[P.eye] = [27, 20, 24]
  p[P.white] = [244, 240, 232]
  p[P.lip] = mix(shadeOf(skin, 0.72), [170, 70, 70], 0.35)
  p[P.mouth] = [74, 26, 30]
  p[P.shirt] = accent
  p[P.shirtS] = shadeOf(accent, 0.8)
  p[P.hat] = hat
  p[P.hatS] = shadeOf(hat, 0.62)
  p[P.hatL] = lightOf(hat, 0.25)
  p[P.gold] = [242, 193, 78]
  p[P.goldS] = [176, 122, 40]
  const apron = hex(l.top === 'apron' && l.accent ? l.accent : '#f4efe6')
  p[P.apron] = apron
  p[P.apronS] = shadeOf(apron, 0.8)
  p[P.frame] = [52, 48, 62]
  p[P.item] = [40, 38, 46]
  p[P.itemS] = [24, 22, 30]
  p[P.itemL] = [150, 200, 230]
  const bag = hex(l.pack ?? '#c8372d')
  p[P.pack] = bag
  p[P.packS] = shadeOf(bag, 0.66)
  p[P.wood] = [120, 84, 50]
  p[P.red] = [214, 52, 40]
  return p
}

function defaultLegs(l: CastLook): string {
  if (l.top === 'silk') return l.coat
  if (l.top === 'uniform') return l.coat
  if (l.old) return '#4a4048'
  return '#2b3550'
}

// --- Drawing into the buffer ---

class Buf {
  px = new Uint8Array(BW * BH)
  set(x: number, y: number, c: P) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= BW || y >= BH) return
    this.px[y * BW + x] = c
  }
  get(x: number, y: number): P {
    if (x < 0 || y < 0 || x >= BW || y >= BH) return P.none
    return this.px[y * BW + x]
  }
  // A run of a row, x0 to x1 inclusive
  row(y: number, x0: number, x1: number, c: P) {
    for (let x = x0; x <= x1; x++) this.set(x, y, c)
  }
  rect(x: number, y: number, w: number, h: number, c: P) {
    for (let j = 0; j < h; j++) this.row(y + j, x, x + w - 1, c)
  }
  // Rows given as [y, x0, x1], all in one colour
  spans(list: Array<[number, number, number]>, c: P) {
    for (const [y, x0, x1] of list) this.row(y, x0, x1, c)
  }
  // A line, one pixel wide
  line(x0: number, y0: number, x1: number, y1: number, c: P) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++)
      this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c)
  }
  // A thick limb from one point to another
  limb(x0: number, y0: number, x1: number, y1: number, w: number, c: P) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      const y = y0 + ((y1 - y0) * i) / n
      this.rect(Math.round(x - (w - 1) / 2), Math.round(y), w, 1, c)
    }
  }
}

// --- The parts ---

// Offsets of the body from the top of the skull
const NECK = 10
const SHOULDER = 11
const WAIST = 28
const HIP = 30
const ANKLE = 48
const FOOT = 51

function legs(b: Buf, l: CastLook, walk: number | undefined) {
  const y = Y0
  // How far each foot is from the centre, by step of the walk
  const stride = walk === undefined ? 0 : [3, 0, -3, 0][walk % 4]
  const lift = walk === undefined ? 0 : [0, 1, 0, 1][walk % 4]
  const skirt = l.skirt || l.top === 'qipao'
  const legC = skirt ? P.skinS : P.legs
  const legS = skirt ? P.skinD : P.legsS
  // far leg first, behind
  for (let j = HIP; j <= ANKLE; j++) {
    const t = (j - HIP) / (ANKLE - HIP)
    const dx = Math.round(stride * t)
    const w = skirt ? 3 : j < HIP + 6 ? 5 : 4
    const x0 = CX + 1 + dx
    b.row(y + j, x0, x0 + w - 1, legS)
  }
  // near leg
  for (let j = HIP; j <= ANKLE + 1; j++) {
    const t = (j - HIP) / (ANKLE - HIP)
    const dx = Math.round(-stride * t)
    const w = skirt ? 3 : j < HIP + 6 ? 5 : 4
    const x0 = CX - (skirt ? 3 : 4) + dx
    b.row(y + j, x0, x0 + w - 1, legC)
    // a crease down the front
    if (!skirt && j > HIP + 3) b.set(x0 + w - 1, y + j, legS)
  }
  // trousers meet at the top
  if (!skirt) b.row(y + HIP, CX - 4, CX + 5, P.legs)
  // shoes, toes to the right
  const farX = CX + 1 + stride
  const nearX = CX - 4 - stride
  b.row(y + FOOT - 2 - lift, farX, farX + 5, P.shoe)
  b.row(y + FOOT - 1 - lift, farX, farX + 5, P.shoe)
  b.row(y + FOOT - 2, nearX, nearX + 5, P.shoe)
  b.row(y + FOOT - 1, nearX, nearX + 5, P.shoe)
  b.row(y + FOOT, nearX, nearX + 5, P.shoe)
  b.row(y + FOOT - 2, nearX + 2, nearX + 4, P.shoeL)
}

// The body from the shoulders to the hips, and what is worn over it
function torso(b: Buf, l: CastLook, dy: number) {
  const y = Y0 + dy
  const top = l.top ?? 'jacket'
  // shoulders, chest, waist, as [row, left, right] from the centre
  const shape: Array<[number, number, number]> = []
  for (let j = SHOULDER; j <= HIP; j++) {
    const left = j === SHOULDER ? -4 : j < WAIST - 4 ? -6 : -5
    const right = j === SHOULDER ? 4 : j < 14 ? 5 : j < WAIST - 4 ? 6 : 5
    shape.push([y + j, CX + left, CX + right])
  }
  b.spans(shape, P.coat)
  // light on the near shoulder, shade down the far side
  b.row(y + SHOULDER, CX - 3, CX - 1, P.coatL)
  b.row(y + SHOULDER + 1, CX - 5, CX - 3, P.coatL)
  for (const [yy, , x1] of shape) {
    b.set(x1, yy, P.coatD)
    b.set(x1 - 1, yy, P.coatS)
  }
  // a fold under the chest, and the hem
  b.row(y + WAIST - 6, CX - 1, CX + 3, P.coatS)
  b.row(y + HIP, CX - 5, CX + 5, P.coatD)

  // the neck
  b.rect(CX - 1, y + NECK, 3, 2, P.skin)
  b.set(CX - 1, y + NECK, P.skinS)
  b.set(CX - 1, y + NECK + 1, P.skinS)

  switch (top) {
    case 'jacket': {
      // a V of shirt at the neck, lapels, buttons
      b.row(y + SHOULDER, CX - 1, CX + 2, P.shirt)
      b.row(y + SHOULDER + 1, CX, CX + 2, P.shirt)
      b.row(y + SHOULDER + 2, CX, CX + 1, P.shirtS)
      b.set(CX + 1, y + SHOULDER + 3, P.shirtS)
      b.set(CX - 1, y + SHOULDER + 1, P.coatL)
      b.set(CX - 1, y + SHOULDER + 2, P.coatL)
      b.set(CX + 3, y + SHOULDER + 2, P.coatS)
      for (let j = SHOULDER + 5; j < WAIST; j += 4)
        b.set(CX + 2, y + j, P.coatD)
      break
    }
    case 'uniform': {
      // epaulettes, a shirt and tie, gold buttons, a belt
      b.row(y + SHOULDER + 1, CX - 6, CX - 4, P.coatD)
      b.row(y + SHOULDER + 1, CX + 3, CX + 5, P.coatD)
      b.set(CX - 5, y + SHOULDER + 1, P.gold)
      b.set(CX + 4, y + SHOULDER + 1, P.gold)
      b.row(y + SHOULDER, CX - 1, CX + 2, P.shirt)
      b.row(y + SHOULDER + 1, CX, CX + 2, P.shirt)
      b.set(CX + 1, y + SHOULDER + 1, P.coatD)
      b.set(CX + 1, y + SHOULDER + 2, P.coatD)
      b.set(CX + 1, y + SHOULDER + 3, P.coatD)
      for (let j = SHOULDER + 5; j < WAIST; j += 4) b.set(CX + 2, y + j, P.gold)
      b.row(y + WAIST - 1, CX - 5, CX + 5, P.coatD)
      b.set(CX + 2, y + WAIST - 1, P.gold)
      break
    }
    case 'silk': {
      // a Tang jacket: standing collar, a row of knotted buttons
      b.row(y + NECK + 1, CX - 1, CX + 2, P.coatS)
      b.row(y + SHOULDER, CX - 1, CX + 2, P.coatL)
      for (let j = SHOULDER + 2; j < WAIST; j += 3) {
        b.set(CX + 1, y + j, P.coatD)
        b.set(CX + 2, y + j, P.coatD)
      }
      b.line(CX + 1, y + SHOULDER + 1, CX + 1, y + HIP, P.coatS)
      break
    }
    case 'qipao': {
      // standing collar, a fastening across to the far arm, gold trim
      b.row(y + NECK + 1, CX - 1, CX + 2, P.coat)
      b.row(y + NECK + 1, CX - 1, CX + 2, P.coatL)
      b.line(CX, y + SHOULDER + 1, CX + 5, y + SHOULDER + 5, P.gold)
      b.row(y + WAIST - 1, CX - 5, CX + 5, P.coatS)
      break
    }
    case 'apron': {
      // a collarless jacket under a long apron with a bib
      b.row(y + SHOULDER, CX - 1, CX + 2, P.skinS)
      b.rect(CX - 2, y + SHOULDER + 3, 6, 6, P.apron)
      for (let j = SHOULDER + 9; j <= HIP + 10; j++) {
        const w = j < WAIST ? 0 : Math.min(2, Math.floor((j - WAIST) / 4))
        b.row(y + j, CX - 4 - w, CX + 5 + w, P.apron)
        b.set(CX + 5 + w, y + j, P.apronS)
      }
      b.line(CX - 2, y + SHOULDER + 3, CX - 4, y + SHOULDER, P.apronS)
      b.line(CX + 3, y + SHOULDER + 3, CX + 4, y + SHOULDER, P.apronS)
      b.row(y + SHOULDER + 9, CX - 4, CX + 5, P.apronS)
      b.row(y + HIP + 10, CX - 6, CX + 7, P.apronS)
      break
    }
    case 'hoodie': {
      // the hood bunched behind the neck, strings, a front pocket
      b.rect(CX - 5, y + NECK - 1, 4, 3, P.coatS)
      b.row(y + NECK - 1, CX - 4, CX - 2, P.coatL)
      b.row(y + SHOULDER, CX - 1, CX + 2, P.coatD)
      b.line(CX, y + SHOULDER + 1, CX, y + SHOULDER + 4, P.shirt)
      b.line(CX + 2, y + SHOULDER + 1, CX + 2, y + SHOULDER + 4, P.shirt)
      b.row(y + WAIST - 6, CX - 3, CX + 4, P.coatD)
      b.row(y + WAIST - 1, CX - 3, CX + 4, P.coatD)
      b.line(CX - 3, y + WAIST - 6, CX - 4, y + WAIST - 1, P.coatD)
      b.line(CX + 4, y + WAIST - 6, CX + 5, y + WAIST - 1, P.coatD)
      break
    }
    case 'cardigan': {
      // open over a light blouse
      for (let j = SHOULDER; j < HIP; j++) b.row(y + j, CX, CX + 2, P.shirt)
      b.line(CX + 2, y + SHOULDER, CX + 2, y + HIP - 1, P.shirtS)
      b.line(CX - 1, y + SHOULDER, CX - 1, y + HIP, P.coatD)
      b.line(CX + 3, y + SHOULDER + 1, CX + 3, y + HIP, P.coatD)
      break
    }
    case 'tee': {
      // a round neck
      b.row(y + SHOULDER, CX - 1, CX + 2, P.skin)
      b.row(y + SHOULDER + 1, CX, CX + 1, P.coatS)
      break
    }
    case 'vest': {
      // a waistcoat over a white shirt, a red bow tie
      b.row(y + SHOULDER, CX - 2, CX + 3, P.shirt)
      for (let j = SHOULDER + 1; j < SHOULDER + 8; j++)
        b.row(
          y + j,
          CX - 1 + Math.floor((j - SHOULDER) / 3),
          CX + 2 - Math.floor((j - SHOULDER) / 3),
          P.shirt,
        )
      b.row(y + SHOULDER + 1, CX - 1, CX + 2, P.red)
      b.set(CX, y + SHOULDER + 1, P.mouth)
      for (let j = SHOULDER + 9; j < WAIST; j += 3) b.set(CX + 1, y + j, P.gold)
      break
    }
  }
}

// Arms: the near one (on the left, in front) and the far one (on the right,
// mostly behind the body). `sleeve` is what covers the upper arm.
function farArm(b: Buf, l: CastLook, arm: Arm, dy: number, swing: number) {
  const y = Y0 + dy
  const shirtSleeves = l.top === 'vest'
  const sleeve = shirtSleeves ? P.shirtS : P.coatS
  const sleeveD = shirtSleeves ? P.shirtS : P.coatD
  const short = l.top === 'tee'
  const sx = CX + 5
  const sy = y + SHOULDER + 1
  if (arm === 'out' || arm === 'up' || arm === 'wave') {
    // the hand raised towards whoever they talk to
    const [ex, ey, hx, hy] =
      arm === 'out'
        ? [sx + 4, sy + 6, sx + 8, sy + 6]
        : arm === 'up'
          ? [sx + 4, sy + 6, sx + 6, sy - 1]
          : [sx + 4, sy + 1, sx + 5, sy - 9]
    b.limb(sx, sy, ex, ey, 3, sleeve)
    b.limb(ex, ey, hx, hy + 1, 3, short ? P.skinS : sleeve)
    b.limb(ex, ey, hx, hy + 1, 1, short ? P.skin : sleeveD)
    // the hand, open
    b.rect(hx - 1, hy - 1, 3, 3, P.skin)
    b.set(hx + 1, hy - 1, P.skinS)
    if (arm !== 'out') b.set(hx, hy - 2, P.skin)
    return
  }
  // hanging, a little behind the body
  const x = sx + 1 + Math.round(-swing / 2)
  b.limb(sx + 1, sy, x, y + WAIST - 2, 3, sleeve)
  if (short) b.limb(x, y + SHOULDER + 7, x, y + WAIST - 2, 3, P.skinS)
  b.rect(x - 1, y + WAIST - 1, 3, 3, P.skinS)
}

function nearArm(b: Buf, l: CastLook, arm: Arm, dy: number, swing: number) {
  const y = Y0 + dy
  const shirtSleeves = l.top === 'vest'
  const sleeve = shirtSleeves ? P.shirt : P.coat
  const sleeveS = shirtSleeves ? P.shirtS : P.coatS
  const sleeveL = shirtSleeves ? P.shirt : P.coatL
  const short = l.top === 'tee'
  const wide = l.top === 'silk'
  const sx = CX - 6
  const sy = y + SHOULDER + 1
  if (arm === 'chest') {
    // forearm across the chest, hand open in front
    const ex = sx - 1
    const ey = sy + 8
    b.limb(sx, sy, ex, ey, 3, sleeve)
    b.limb(sx - 1, sy, ex - 1, ey, 1, sleeveL)
    b.limb(ex, ey, CX + 3, ey - 2, 3, short ? P.skin : sleeve)
    b.limb(ex, ey + 1, CX + 3, ey - 1, 1, short ? P.skinS : sleeveS)
    b.rect(CX + 3, ey - 4, 3, 3, P.skin)
    b.set(CX + 5, ey - 4, P.skinS)
    b.set(CX + 3, ey - 2, P.skinS)
    return
  }
  // hanging at the side, swinging when walking
  const hx = sx - 1 + Math.round(swing / 2)
  const hy = y + WAIST - 1
  b.limb(sx, sy, hx, hy - 2, wide ? 4 : 3, sleeve)
  b.limb(sx - 1, sy + 1, hx - 1, hy - 3, 1, sleeveL)
  b.limb(sx + 1, sy + 2, hx + 1, hy - 3, 1, sleeveS)
  if (short) {
    b.limb(sx + (hx - sx) * 0.4, sy + 7, hx, hy - 2, 3, P.skin)
    b.limb(sx + 1 + (hx - sx) * 0.4, sy + 7, hx + 1, hy - 2, 1, P.skinS)
  } else b.row(hy - 2, hx - 1, hx + 1, wide ? P.coatD : sleeveS)
  b.rect(hx - 1, hy - 1, 3, 3, P.skin)
  b.set(hx + 1, hy + 1, P.skinS)
}

// Where the near hand is, for what it holds
function nearHand(arm: Arm, dy: number, swing: number): [number, number] {
  if (arm === 'chest') return [CX + 4, Y0 + dy + SHOULDER + 6]
  return [CX - 7 + Math.round(swing / 2), Y0 + dy + WAIST]
}

function farHand(arm: Arm, dy: number): [number, number] | null {
  const sx = CX + 5
  const sy = Y0 + dy + SHOULDER + 1
  if (arm === 'out') return [sx + 8, sy + 6]
  if (arm === 'up') return [sx + 6, sy - 1]
  if (arm === 'wave') return [sx + 5, sy - 9]
  return null
}

function pack(b: Buf, dy: number) {
  const y = Y0 + dy
  b.rect(CX - 10, y + SHOULDER + 2, 5, 14, P.pack)
  b.rect(CX - 10, y + SHOULDER + 2, 1, 14, P.packS)
  b.row(y + SHOULDER + 2, CX - 9, CX - 6, P.packS)
  b.rect(CX - 10, y + SHOULDER + 10, 4, 4, P.packS)
  b.row(y + SHOULDER + 15, CX - 10, CX - 6, P.packS)
}

function packStraps(b: Buf, dy: number) {
  const y = Y0 + dy
  b.line(CX - 3, y + SHOULDER, CX - 2, y + SHOULDER + 9, P.packS)
}

// --- The head ---

// The skull, row by row, as [row, from, to] relative to its left edge;
// the head faces right, so the face is on the right and the nose sticks
// out past it
const SKULL: Array<[number, number, number]> = [
  [0, 3, 7],
  [1, 2, 8],
  [2, 1, 9],
  [3, 1, 9],
  [4, 1, 9],
  [5, 1, 9],
  [6, 1, 10],
  [7, 1, 9],
  [8, 2, 9],
  [9, 3, 8],
  [10, 4, 7],
]

function head(b: Buf, l: CastLook, pose: Pose, dy: number, lean: number) {
  const hx = CX - 4 + lean
  const y = Y0 + dy + lean
  const at = (x: number, r: number, c: P) => b.set(hx + x, y + r, c)
  const style = l.style ?? 'short'

  // long hair falls behind the head
  if (style === 'long') {
    for (let r = 2; r <= 17; r++) {
      const w = r < 12 ? 4 : 3 - Math.floor((r - 12) / 3)
      for (let x = 0; x < w; x++) at(-1 + x, r, x === 0 ? P.hairS : P.hair)
    }
  }
  if (style === 'pony') {
    const sway = pose.breath ? 1 : 0
    for (let r = 2; r <= 11; r++) {
      const x = -2 - Math.floor(r / 5) + (r > 6 ? sway : 0)
      at(x, r, P.hair)
      at(x + 1, r, r % 3 ? P.hair : P.hairS)
    }
  }

  // skin
  for (const [r, x0, x1] of SKULL)
    for (let x = x0; x <= x1; x++) at(x, r, P.skin)
  // shading: the back of the head, under the jaw, the cheek
  at(1, 4, P.skinS)
  at(1, 5, P.skinS)
  at(1, 6, P.skinS)
  at(2, 8, P.skinS)
  at(3, 9, P.skinS)
  at(4, 10, P.skinS)
  at(5, 10, P.skinS)
  at(7, 9, P.skinS)
  // the ear
  at(3, 5, P.skin)
  at(3, 6, P.skinS)
  at(3, 7, P.skinS)
  // the nose, and a light on its bridge
  at(10, 6, P.skin)
  at(10, 7, P.skinS)
  at(8, 4, P.skinL)
  // eyes, brows, mouth
  const blink = pose.blink
  at(6, 5, blink ? P.skinS : P.eye)
  at(9, 5, blink ? P.skinS : P.eye)
  if (!blink) at(5, 5, P.white)
  const brow = l.old ? P.hairS : P.hairS
  at(5, 4, brow)
  at(6, 4, brow)
  at(9, 4, brow)
  const mouth = pose.mouth ?? 0
  if (mouth === 0) {
    at(7, 8, P.lip)
    at(8, 8, P.lip)
  } else if (mouth === 1) {
    at(7, 8, P.mouth)
    at(8, 8, P.mouth)
    at(8, 9, P.lip)
  } else {
    at(7, 8, P.mouth)
    at(8, 8, P.mouth)
    at(7, 9, P.mouth)
    at(8, 9, P.lip)
  }
  if (l.old) {
    at(5, 6, P.skinS)
    at(7, 6, P.skinS)
    at(4, 8, P.skinS)
  }

  if (l.glasses) {
    at(5, 5, P.frame)
    at(7, 5, P.frame)
    at(8, 5, P.frame)
    at(10, 5, P.frame)
    at(4, 5, P.frame)
    at(6, 4, P.frame)
    at(9, 4, P.frame)
  }

  if (l.beard) {
    const long = l.old
    for (const [r, x0, x1] of [
      [7, 2, 4],
      [8, 3, 9],
      [9, 3, 9],
      [10, 4, 8],
    ] as Array<[number, number, number]>)
      for (let x = x0; x <= x1; x++) at(x, r, x === x0 ? P.hairS : P.hair)
    if (long)
      for (let r = 11; r <= 15; r++) {
        const x0 = 5 + Math.floor((r - 11) / 2)
        for (let x = x0; x <= 8 - Math.floor((r - 10) / 3); x++)
          at(x, r, x === x0 ? P.hairS : P.hair)
      }
    // moustache, and the mouth inside it
    at(7, 7, P.hair)
    at(8, 7, P.hair)
    at(9, 7, P.hair)
    at(7, 8, mouth ? P.mouth : P.lip)
    at(8, 8, mouth ? P.mouth : P.lip)
  }

  // hair and hats
  switch (style) {
    case 'short':
    case 'spiky':
    case 'long': {
      for (const [r, x0, x1] of [
        [-1, 3, 7],
        [0, 1, 8],
        [1, 0, 9],
        [2, 0, 9],
        [3, 0, 3],
        [4, 0, 2],
        [5, 0, 2],
        [6, 0, 1],
      ] as Array<[number, number, number]>)
        for (let x = x0; x <= x1; x++) at(x, r, P.hair)
      // fringe, and sideburn before the ear
      at(8, 3, P.hair)
      at(9, 3, P.hairS)
      at(4, 3, P.hairS)
      at(4, 4, P.hairS)
      // shade low at the back, light on top
      at(0, 3, P.hairS)
      at(0, 4, P.hairS)
      at(0, 5, P.hairS)
      at(1, 6, P.hairS)
      at(4, -1, P.hairL)
      at(5, -1, P.hairL)
      at(3, 0, P.hairL)
      at(6, 0, P.hairL)
      if (style === 'spiky') {
        for (const x of [1, 3, 5, 7, 9]) at(x, -2, P.hair)
        for (const x of [2, 6]) at(x, -3, P.hair)
        at(4, -2, P.hairL)
        at(10, 0, P.hair)
        at(10, 1, P.hairS)
      }
      if (style === 'long') {
        at(9, 3, P.hair)
        at(9, 4, P.hairS)
      }
      break
    }
    case 'bun':
    case 'pony': {
      for (const [r, x0, x1] of [
        [-1, 3, 7],
        [0, 1, 8],
        [1, 0, 9],
        [2, 0, 9],
        [3, 0, 3],
        [4, 0, 2],
        [5, 0, 1],
      ] as Array<[number, number, number]>)
        for (let x = x0; x <= x1; x++) at(x, r, P.hair)
      at(4, 0, P.hairL)
      at(5, 0, P.hairL)
      at(6, 1, P.hairL)
      at(0, 3, P.hairS)
      at(0, 4, P.hairS)
      if (style === 'bun') {
        for (const [r, x0, x1] of [
          [-2, 0, 2],
          [-1, -1, 3],
          [0, -1, 3],
          [1, -1, 2],
        ] as Array<[number, number, number]>)
          for (let x = x0; x <= x1; x++) at(x, r, P.hair)
        at(1, -2, P.hairL)
        at(0, -1, P.hairL)
        at(-1, 1, P.hairS)
      } else {
        at(-1, 1, P.hair)
        at(-1, 2, P.hairS)
      }
      break
    }
    case 'bald': {
      for (const [r, x0, x1] of [
        [3, 0, 2],
        [4, 0, 2],
        [5, 0, 1],
        [6, 0, 1],
      ] as Array<[number, number, number]>)
        for (let x = x0; x <= x1; x++) at(x, r, P.hair)
      at(4, 4, P.hair)
      at(5, 1, P.skinL)
      at(6, 1, P.skinL)
      at(4, 2, P.skinL)
      break
    }
    case 'cap': {
      if (l.cone) {
        // a conical straw hat, wide and shading the brow
        for (let r = -5; r <= 2; r++) {
          const half = Math.round(((r + 6) / 8) * 8)
          for (let x = 5 - half; x <= 5 + half; x++)
            at(x, r, r === 2 ? P.hatS : (x + r) % 3 ? P.hat : P.hatL)
        }
        at(5, -6, P.hatS)
        for (let x = -3; x <= 13; x++) at(x, 3, x < 2 ? P.hatS : P.none)
        at(0, 4, P.hair)
        at(0, 5, P.hairS)
        at(1, 4, P.hair)
        // the brow in the hat's shadow
        for (let x = 2; x <= 9; x++) at(x, 3, P.skinS)
        break
      }
      // a peaked cap with a badge and a black peak
      for (const [r, x0, x1] of [
        [-3, 1, 8],
        [-2, 0, 9],
        [-1, 0, 9],
        [0, 0, 9],
        [1, 0, 9],
      ] as Array<[number, number, number]>)
        for (let x = x0; x <= x1; x++) at(x, r, P.hat)
      for (let x = 1; x <= 8; x++) at(x, -3, P.hatL)
      for (let x = 0; x <= 9; x++) at(x, 1, P.hatS)
      for (let x = 5; x <= 11; x++) at(x, 2, P.item)
      at(11, 2, P.itemS)
      at(6, -1, P.gold)
      at(7, -1, P.gold)
      at(6, 0, P.gold)
      at(7, 0, P.goldS)
      at(0, 2, P.hair)
      at(0, 3, P.hair)
      at(1, 2, P.hair)
      at(0, 4, P.hairS)
      break
    }
    case 'chef': {
      // a tall white toque
      for (const [r, x0, x1] of [
        [-8, 2, 7],
        [-7, 0, 9],
        [-6, -1, 10],
        [-5, -1, 10],
        [-4, 0, 9],
        [-3, 1, 8],
        [-2, 1, 8],
        [-1, 1, 8],
        [0, 1, 8],
        [1, 1, 8],
      ] as Array<[number, number, number]>)
        for (let x = x0; x <= x1; x++) at(x, r, P.white)
      at(3, -7, P.shirtS)
      at(6, -6, P.shirtS)
      at(2, -5, P.shirtS)
      at(-1, -5, P.shirtS)
      for (let x = 1; x <= 8; x++) at(x, 1, P.shirtS)
      for (let x = 2; x <= 7; x += 2) at(x, -2, P.shirtS)
      at(0, 2, P.hair)
      at(0, 3, P.hair)
      at(0, 4, P.hairS)
      break
    }
    case 'kufi': {
      for (const [r, x0, x1] of [
        [-2, 2, 7],
        [-1, 1, 8],
        [0, 1, 8],
        [1, 1, 8],
      ] as Array<[number, number, number]>)
        for (let x = x0; x <= x1; x++) at(x, r, P.white)
      for (let x = 2; x <= 7; x += 2) at(x, 0, P.shirtS)
      for (let x = 1; x <= 8; x++) at(x, 1, P.shirtS)
      at(0, 2, P.hair)
      at(0, 3, P.hair)
      at(1, 2, P.hairS)
      break
    }
  }

  if (l.goggles) {
    for (let x = 1; x <= 9; x++) at(x, 1, P.item)
    for (let x = 2; x <= 8; x++) at(x, 0, P.item)
    at(7, 1, P.itemL)
    at(8, 1, P.itemL)
    at(4, 1, P.itemS)
  }
}

// --- Things held ---

function held(b: Buf, l: CastLook, pose: Pose, dy: number, swing: number) {
  const arm = pose.arm ?? 'down'
  const [nx, ny] = nearHand(arm, dy, swing)
  const far = farHand(arm, dy)
  const flutter = pose.flutter ?? 0
  switch (l.hold) {
    case 'flag': {
      // a guide's flag on a short pole, held up
      const [x, y] = far ?? [nx, ny]
      // the pennant always flies above the head
      const topY = y - (far ? 22 : arm === 'chest' ? 25 : 36)
      b.line(x, y + 2, x, topY, P.wood)
      b.set(x, topY - 1, P.gold)
      const rows = flutter
        ? [
            [0, 6],
            [1, 6],
            [2, 5],
            [3, 4],
            [4, 2],
          ]
        : [
            [0, 5],
            [1, 6],
            [2, 6],
            [3, 4],
            [4, 3],
          ]
      for (const [r, len] of rows)
        for (let i = 1; i <= len; i++)
          b.set(
            x + i,
            topY + r + (flutter && i > 3 ? 1 : 0),
            i === len ? P.coatD : P.red,
          )
      b.set(x + 2, topY + 1, P.gold)
      b.set(x + 3, topY + 2, P.gold)
      break
    }
    case 'phone': {
      const [x, y] = far ?? [nx, ny]
      b.rect(x - 1, y - 3, 3, 5, P.item)
      b.rect(x, y - 2, 1, 3, P.itemL)
      break
    }
    case 'book': {
      const [x, y] = arm === 'chest' ? [nx, ny] : (far ?? [nx, ny])
      b.rect(x - 2, y - 4, 5, 6, P.item)
      b.set(x, y - 2, P.itemL)
      b.set(x + 1, y - 2, P.itemL)
      b.set(x, y - 1, P.itemL)
      b.row(y + 1, x - 2, x + 2, P.white)
      break
    }
    case 'notepad': {
      const [x, y] = arm === 'chest' ? [nx, ny] : [nx, ny]
      b.rect(x - 2, y - 3, 4, 5, P.white)
      b.row(y - 2, x - 1, x, P.shirtS)
      b.row(y, x - 1, x, P.shirtS)
      break
    }
    case 'fan': {
      const [x, y] = far ?? [nx, ny]
      for (let r = 0; r < 4; r++)
        b.row(y - 4 + r, x - 3 + r, x + 3 - r, r % 2 ? P.red : P.gold)
      b.set(x, y, P.wood)
      break
    }
    case 'skewers': {
      const [x, y] = far ?? [nx, ny]
      for (let i = 0; i < 3; i++) {
        b.line(x + i - 1, y, x + 2 + i * 2, y - 9, P.wood)
        b.set(x + 1 + i * 2, y - 6, P.hairS)
        b.set(x + 2 + i * 2, y - 8, P.hairS)
      }
      break
    }
    case 'key': {
      const [x, y] = far ?? [nx, ny]
      b.rect(x, y - 3, 2, 2, P.gold)
      b.line(x + 1, y - 1, x + 3, y + 1, P.gold)
      break
    }
    case 'ticket': {
      const [x, y] = far ?? [nx, ny]
      b.rect(x - 1, y - 3, 5, 3, P.red)
      b.row(y - 2, x, x + 2, P.white)
      break
    }
    case 'camera': {
      const y = Y0 + dy + SHOULDER + 7
      b.line(CX - 3, Y0 + dy + SHOULDER, CX - 1, y, P.item)
      b.line(CX + 4, Y0 + dy + SHOULDER, CX + 3, y, P.item)
      b.rect(CX - 1, y, 5, 3, P.item)
      b.set(CX + 1, y + 1, P.itemL)
      break
    }
  }
}

// --- Composing and finishing ---

export function drawFigure(
  look: CastLook,
  pose: Pose = {},
  light: Light = {},
): Pixels {
  const b = new Buf()
  const walk = pose.walk
  const dy =
    (pose.breath ?? 0) + (walk === undefined ? 0 : [0, -1, 0, -1][walk % 4])
  const swing = walk === undefined ? 0 : [4, 0, -4, 0][walk % 4]
  const arm = walk === undefined ? (pose.arm ?? 'down') : 'down'
  const lean = look.old ? 1 : 0
  const p = { ...pose, arm }

  if (look.pack) pack(b, dy)
  farArm(b, look, arm, dy, -swing)
  legs(b, look, walk)
  torso(b, look, dy)
  if (look.pack) packStraps(b, dy)
  head(b, look, p, dy, lean)
  nearArm(b, look, arm, dy, swing)
  if (look.hold) held(b, look, p, dy, swing)
  if (look.hold === 'flag' || look.hold === 'phone')
    if (arm === 'down') {
      // redraw the hand over the pole
      const [x, y] = nearHand(arm, dy, swing)
      b.rect(x - 1, y - 1, 3, 2, P.skin)
    }

  return finish(b, palette(look), light)
}

function finish(b: Buf, pal: Array<RGB>, light: Light): Pixels {
  const tint = light.tint ? hex(light.tint) : null
  const tAmt = light.tintAmount ?? 0
  const rim = light.rim ? hex(light.rim) : null
  const rAmt = light.rimAmount ?? 0
  const side = light.side ?? -1
  const colour = (c: RGB): RGB =>
    tint
      ? mix(
          c,
          [
            (c[0] * tint[0]) / 255,
            (c[1] * tint[1]) / 255,
            (c[2] * tint[2]) / 255,
          ],
          tAmt,
        )
      : c
  const data = new Uint8ClampedArray(BW * BH * 4)
  const put = (x: number, y: number, c: RGB, a = 255) => {
    const i = (y * BW + x) * 4
    data[i] = clamp(c[0])
    data[i + 1] = clamp(c[1])
    data[i + 2] = clamp(c[2])
    data[i + 3] = a
  }
  const dark: RGB = [20, 12, 20]
  for (let y = 0; y < BH; y++)
    for (let x = 0; x < BW; x++) {
      const v = b.get(x, y)
      if (v) {
        put(x, y, colour(pal[v]))
        continue
      }
      // an outline: a dark shade of the neighbour
      const n =
        b.get(x - 1, y) || b.get(x + 1, y) || b.get(x, y - 1) || b.get(x, y + 1)
      if (n) put(x, y, colour(mix(pal[n], dark, 0.72)))
    }
  // light along the lit edges: the first pixels in from each side
  const edge = (from: number, c: RGB, amt: number) => {
    for (let y = 0; y < BH; y++) {
      let seen = 0
      for (
        let x = from < 0 ? 0 : BW - 1;
        x >= 0 && x < BW && seen < 3;
        x += from < 0 ? 1 : -1
      ) {
        const i = (y * BW + x) * 4
        if (!data[i + 3]) continue
        seen++
        if (seen === 1) continue
        const was: RGB = [data[i], data[i + 1], data[i + 2]]
        const k = seen === 2 ? amt : amt * 0.4
        put(
          x,
          y,
          mix(
            was,
            [
              (was[0] + c[0]) / 2 + 30,
              (was[1] + c[1]) / 2 + 30,
              (was[2] + c[2]) / 2 + 30,
            ],
            k,
          ),
        )
      }
    }
  }
  if (rim && rAmt > 0) edge(side, rim, rAmt)
  if (light.rim2 && light.rim2Amount)
    edge(-side, hex(light.rim2), light.rim2Amount)
  return { w: BW, h: BH, ax: CX, ay: Y0 + FOOT + 1, data }
}

// The height above the feet of the top of the head, for placing speech
export const HEAD_TOP = FIGURE_H + 2
