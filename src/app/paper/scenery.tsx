import type { Cut, Dye, Shape } from './leather'

// Scenery for the shadow theatre (景片): hills, gates, the moon, suns and
// clouds, cut from leather like the puppets and pinned to the screen. A
// piece is one or more sprites, each drawn round its own origin and placed
// in stage units (1600 × 900, the ground at 862). Some move by themselves
// (clouds drift, the sun's flames turn, rain falls); a piece's state
// ('suns:3', 'egg:open') can send some of its sprites away, falling or
// fading, or glide them somewhere else.

export interface Sprite {
  at: readonly [number, number]
  box: readonly [number, number, number, number]
  shapes: Array<Shape>
  scale?: number
  flip?: boolean
  // In front of the puppets (above 50) or behind them
  z?: number
  // A motion of its own (a class in theatre.css), and when it starts
  anim?: string
  delay?: number
  // Gone in this state: it falls away to `to`, turning by `spin`, or fades
  gone?: boolean
  fade?: boolean
  to?: readonly [number, number]
  spin?: number
  // Its place in the order things go in
  wait?: number
  // Seconds it takes to glide to a new place
  glide?: number
  // A shadow away from the screen: this much blur
  soft?: number
}

export type Piece = (state: string) => Array<Sprite>

const C = (
  d: string,
  dye?: Dye,
  cut?: Cut,
  cs?: number,
  alpha?: number,
): Shape => ({ d, dye, cut, cs, alpha })
const L = (d: string, line = 2): Shape => ({ d, line })
const O = (d: string): Shape => ({ d, open: true })
const f = (n: number) => Math.round(n * 10) / 10
const circle = (x: number, y: number, r: number) =>
  `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0z`
// A ring: the inner circle runs the other way, so it is a hole
const ring = (x: number, y: number, r: number, r2: number) =>
  `${circle(x, y, r)}M${f(x - r2)} ${f(y)}a${r2} ${r2} 0 1 1 ${f(2 * r2)} 0a${r2} ${r2} 0 1 1 ${f(-2 * r2)} 0z`
const dot = (x: number, y: number, r: number, dye: Dye = 'black'): Shape => ({
  d: circle(x, y, r),
  dye,
  join: true,
})
const star = (r: number, points = 4) => {
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2
    const rr = i % 2 ? r * 0.28 : r
    d += `${i ? 'L' : 'M'}${f(Math.cos(a) * rr)} ${f(Math.sin(a) * rr)}`
  }
  return `${d}Z`
}

// Seeded randomness, so a piece is the same every time it is cut
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// An auspicious cloud (祥云): three curls and a trailing tail, about 250
// wide, from its lower left
const CLOUD = (dye: Dye, alpha?: number): Array<Shape> => [
  C(
    'M20 90C0 90-4 66 14 58C10 36 34 24 52 36C56 14 84 4 104 18C116 0 150 0 160 20C178 12 202 22 202 42C222 42 236 60 228 76C240 84 236 100 220 100L60 100C40 100 30 96 20 90Z',
    dye,
    'curls',
    0.8,
    alpha,
  ),
  L(
    'M30 76C22 70 26 58 36 60C44 62 42 72 36 72M70 44C64 36 74 26 84 32C92 38 86 48 78 46M128 30C122 20 134 12 144 18C152 24 146 34 138 32M186 52C180 44 190 36 200 42C206 48 200 56 194 54',
    2.6,
  ),
  L('M220 100C252 102 266 84 254 68C246 58 232 62 234 72', 3),
]

const cloud = (
  x: number,
  y: number,
  scale: number,
  dye: Dye,
  anim = 'pi-drift',
  delay = 0,
  flip = false,
): Sprite => ({
  at: [x, y],
  box: [-10, -10, 290, 130],
  shapes: CLOUD(dye),
  scale,
  flip,
  anim,
  delay,
})

// A swirl of the dark before the world: a spiral arm, about 260 across
const SWIRL =
  'M-120 0C-120-70-60-112 0-112C72-112 122-62 112 0C102 52 52 74 10 62C-22 54-32 20-10 6C10-8 36 4 30 26C52 4 40-42 0-46C-52-50-86-10-78 32C-70 84-10 114 52 102C-30 132-120 84-120 0Z'
const swirl = (
  x: number,
  y: number,
  scale: number,
  dye: Dye,
  anim: string,
  delay = 0,
  flip = false,
): Sprite => ({
  at: [x, y],
  box: [-130, -125, 260, 250],
  shapes: [C(SWIRL, dye, 'curls', 1.2, 0.7)],
  scale,
  flip,
  anim,
  delay,
})

// Crenellations along a wall's top
function battlements(x0: number, x1: number, y: number, w = 30, h = 24) {
  let d = `M${x0} ${y}`
  for (let x = x0; x < x1; x += w * 2)
    d += `L${x} ${y - h}L${Math.min(x1, x + w)} ${y - h}L${Math.min(x1, x + w)} ${y}L${Math.min(x1, x + 2 * w)} ${y}`
  return `${d}L${x1} ${y}Z`
}

// A hall's roof with upturned eaves, from x0 to x1 at the eave line y
function roof(x0: number, x1: number, y: number, h: number) {
  const w = x1 - x0
  const r0 = x0 + w * 0.3
  const r1 = x1 - w * 0.3
  return `M${x0 + 8} ${y - 2}C${x0 + w * 0.14} ${y - 6} ${x0 + w * 0.22} ${y - h * 0.4} ${r0} ${y - h}L${r1} ${y - h}C${x1 - w * 0.22} ${y - h * 0.4} ${x1 - w * 0.14} ${y - 6} ${x1 - 8} ${y - 2}C${x1 + 4} ${y - 2} ${x1 + 6} ${y + 8} ${x1 - 2} ${y + 10}C${x1 - w * 0.2} ${y + 6} ${x1 - w * 0.3} ${y + 12} ${x1 - w * 0.32} ${y + 14}L${x0 + w * 0.32} ${y + 14}C${x0 + w * 0.3} ${y + 12} ${x0 + w * 0.2} ${y + 6} ${x0 + 2} ${y + 10}C${x0 - 6} ${y + 8} ${x0 - 4} ${y - 2} ${x0 + 8} ${y - 2}Z`
}

// A wavy band, `period` long, between y (its crest line) and the bottom
function waves(
  x0: number,
  x1: number,
  y: number,
  amp: number,
  period: number,
  bottom: number,
) {
  let d = `M${x0} ${y}`
  for (let x = x0; x < x1; x += period)
    d += `C${x + period * 0.25} ${y - amp} ${x + period * 0.25} ${y + amp} ${x + period * 0.5} ${y}C${x + period * 0.75} ${y - amp} ${x + period * 0.75} ${y + amp} ${x + period} ${y}`
  return `${d}L${x1} ${bottom}L${x0} ${bottom}Z`
}

// A pine on a ridge, from the foot of its trunk
const PINE: Array<Shape> = [
  C('M-5 0L-3 -90L3 -90L6 0Z', 'black'),
  C(
    'M-46 -60L0 -96L44 -62L20 -64L36 -84L0 -126L-34 -86L-18 -66Z',
    'green',
    'dots',
    0.5,
  ),
  C('M-30 -104L0 -140L28 -106Z', 'green', 'dots', 0.5),
]

// A sun with its crow inside (金乌), and the ring of flames that turns
function sun(x: number, y: number, r: number): Array<Sprite> {
  const flames = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6
    const b = a + Math.PI / 12
    const c = a - Math.PI / 12
    const p = (ang: number, rr: number) =>
      `${f(Math.cos(ang) * rr)} ${f(Math.sin(ang) * rr)}`
    return `M${p(c, r * 1.08)}Q${p(a - 0.05, r * 1.5)} ${p(a, r * 1.75)}Q${p(a + 0.12, r * 1.4)} ${p(b, r * 1.08)}Z`
  }).join('')
  return [
    {
      at: [x, y],
      box: [-r * 1.8, -r * 1.8, r * 3.6, r * 3.6],
      shapes: [C(flames, 'yellow', 'dots', 0.5)],
      anim: 'pi-spin-fast',
    },
    {
      at: [x, y],
      box: [-r - 4, -r - 4, 2 * r + 8, 2 * r + 8],
      shapes: [
        C(circle(0, 0, r), 'orange', 'curls', r / 60),
        dot(0, 0, r * 0.62, 'red'),
        C(
          `M${f(-r * 0.42)} ${f(r * 0.1)}C${f(-r * 0.3)} ${f(-r * 0.14)} 0 ${f(-r * 0.26)} ${f(r * 0.28)} ${f(-r * 0.16)}L${f(r * 0.5)} ${f(-r * 0.24)}L${f(r * 0.36)} ${f(-r * 0.04)}C${f(r * 0.28)} ${f(r * 0.16)} 0 ${f(r * 0.28)} ${f(-r * 0.24)} ${f(r * 0.24)}L${f(-r * 0.5)} ${f(r * 0.32)}Z`,
          'black',
        ),
        L(
          `M${f(-r * 0.06)} ${f(r * 0.24)}L${f(-r * 0.1)} ${f(r * 0.44)}M${f(r * 0.06)} ${f(r * 0.24)}L${f(r * 0.04)} ${f(r * 0.44)}M0 ${f(r * 0.24)}L${f(-r * 0.03)} ${f(r * 0.46)}`,
          1.6,
        ),
      ],
    },
  ]
}

// Bamboo slips, tied into a book
function slips(n: number): Array<Shape> {
  const r = rng(11)
  const shapes: Array<Shape> = []
  for (let i = 0; i < n; i++) {
    const x = i * 24
    shapes.push(C(`M${x} 0L${x + 20} 0L${x + 20} 210L${x} 210Z`, 'hide'))
    let d = ''
    for (let y = 14; y < 196; y += 22 + Math.round(r() * 6)) {
      const w = 6 + Math.round(r() * 6)
      d += `M${x + 10 - w / 2} ${y}L${x + 10 + w / 2} ${y + 2}M${x + 10} ${y - 4}L${x + 10} ${y + 8}`
    }
    shapes.push(L(d, 2))
  }
  shapes.push(L(`M-6 46L${n * 24 + 4} 46M-6 166L${n * 24 + 4} 166`, 3))
  return shapes
}

// A magpie with its wings up, as they hold the bridge
const MAGPIE: Array<Shape> = [
  C(
    'M-40 -10C-20 -40 0 -54 10 -40C2 -30 -10 -18 -14 -6ZM40 -10C20 -40 0 -54 -10 -40C-2 -30 10 -18 14 -6Z',
    'blue',
    'stripes',
    0.4,
  ),
  C(
    'M-30 4C-24 -6 -10 -10 4 -8C12 -14 22 -14 28 -8L36 -6L28 -2C24 8 14 14 0 14C-12 14 -22 10 -30 4Z',
    'black',
  ),
  C('M-8 6C2 12 14 10 20 2L16 -2C6 4 -2 4 -8 6Z', 'pale'),
  C('M-28 2L-62 -4L-62 4L-28 8Z', 'blue', 'stripes', 0.4),
  dot(22, -8, 1.6, 'pale'),
]

// A painted or carved dragon: a sinuous band with fins along its back, a
// horned head at the right and a pointed tail, `w` wide round (cx, cy)
function dragonGlyph(w: number, h: number, cx = 0, cy = 0) {
  const n = 36
  const top: Array<[number, number]> = []
  const bottom: Array<[number, number]> = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const x = cx - w / 2 + u * w
    const y = cy + h * 0.3 * Math.sin(Math.PI * 2.5 * u)
    const t = h * (0.04 + 0.12 * u)
    top.push([x, y - t])
    bottom.push([x, y + t])
  }
  let d = `M${f(top[0][0] - h * 0.12)} ${f(top[0][1] + h * 0.04)}`
  top.forEach(([x, y], i) => {
    d += `L${f(x)} ${f(y)}`
    // a fin every few steps
    if (i % 4 === 2 && i < n - 2)
      d += `L${f(x + h * 0.03)} ${f(y - h * 0.1)}L${f(x + h * 0.06)} ${f(y)}`
  })
  for (let i = n; i >= 0; i--) d += `L${f(bottom[i][0])} ${f(bottom[i][1])}`
  d += 'Z'
  // the head: brow, snout, open jaws, horns, and an eye cut through
  const ex = top[n][0]
  const ey = (top[n][1] + bottom[n][1]) / 2
  const k = h * 0.5
  const p = (dx: number, dy: number) => `${f(ex + dx * k)} ${f(ey + dy * k)}`
  d += `M${p(-0.04, -0.2)}L${p(0.22, -0.3)}L${p(0.46, -0.2)}L${p(0.6, -0.12)}L${p(0.62, -0.04)}L${p(0.4, -0.02)}L${p(0.58, 0.08)}L${p(0.5, 0.16)}L${p(0.2, 0.16)}L${p(-0.04, 0.2)}Z`
  d += `M${p(0.14, -0.27)}L${p(0.02, -0.56)}L${p(0.12, -0.5)}L${p(0.12, -0.62)}L${p(0.22, -0.46)}L${p(0.28, -0.29)}Z`
  d += `M${p(0.3, -0.12)}a${f(k * 0.05)} ${f(k * 0.05)} 0 1 1 ${f(k * 0.1)} 0a${f(k * 0.05)} ${f(k * 0.05)} 0 1 1 ${f(-k * 0.1)} 0z`
  // claws under the body
  for (const u of [0.32, 0.72]) {
    const i = Math.round(u * n)
    const [x, y] = bottom[i]
    d += `M${f(x - k * 0.05)} ${f(y - 2)}L${f(x - k * 0.1)} ${f(y + k * 0.2)}L${f(x - k * 0.02)} ${f(y + k * 0.16)}L${f(x + k * 0.04)} ${f(y + k * 0.22)}L${f(x + k * 0.06)} ${f(y - 2)}Z`
  }
  return d
}

export const SCENERY: Record<string, Piece> = {
  // Rolling hills along the foot of the screen
  hills: () => [
    {
      at: [0, 650],
      box: [0, 0, 1600, 250],
      shapes: [
        C(
          'M0 120C120 60 240 40 360 80C460 112 540 70 660 50C780 30 880 90 980 100C1100 112 1180 50 1300 40C1420 30 1520 80 1600 90L1600 250L0 250Z',
          'green',
          'lattice',
          1.5,
        ),
        C(
          'M0 190C160 150 300 140 440 170C560 195 680 160 800 150C940 138 1060 180 1200 180C1320 180 1440 140 1600 160L1600 250L0 250Z',
          'hide',
          'scales',
          1.3,
        ),
        L(
          'M220 190L226 172L231 190M236 190L246 166L250 190M980 176L986 158L990 176M1000 176L1010 152L1014 176M1400 162L1406 144L1410 162',
          2,
        ),
      ],
    },
  ],
  clouds: () => [
    cloud(120, 80, 0.9, 'blue', 'pi-drift', -4),
    cloud(1180, 60, 0.75, 'pale', 'pi-drift-2', 0, true),
    cloud(640, 170, 0.55, 'blue', 'pi-drift', -12),
  ],
  // The dark before the world: swirls in a murky haze
  chaos: () => [
    {
      at: [0, 0],
      box: [0, 0, 1600, 900],
      shapes: [
        { d: 'M0 0H1600V900H0Z', dye: 'purple', alpha: 0.32, bare: true },
      ],
    },
    swirl(250, 250, 1.3, 'black', 'pi-drift', -3),
    swirl(1250, 220, 1.1, 'blue', 'pi-drift-2', 0, true),
    swirl(1080, 760, 1.2, 'purple', 'pi-drift', -8),
    swirl(170, 700, 0.9, 'blue', 'pi-drift-2', -5, true),
    swirl(1430, 690, 1.05, 'black', 'pi-drift', -11),
  ],
  // The universe as an egg; it breaks into the sky and the earth
  egg: (state) => {
    const open = state === 'open'
    const crack =
      'L970 448L920 414L870 452L820 412L770 454L720 416L670 452L620 410Z'
    return [
      {
        at: [0, 0],
        box: [560, 130, 480, 330],
        shapes: [
          C(
            `M570 430A230 290 0 0 1 1030 430${crack}`,
            'pale',
            'scales',
            2.2,
            0.55,
          ),
          L('M600 300C640 240 700 200 760 186', 4),
        ],
        z: 60,
        gone: open,
        to: [-40, -760],
        spin: -10,
        wait: 0,
      },
      {
        at: [0, 0],
        box: [560, 400, 480, 330],
        shapes: [
          C(
            'M570 430A230 290 0 0 0 1030 430L970 448L920 414L870 452L820 412L770 454L720 416L670 452L620 410Z',
            'pale',
            'scales',
            2.2,
            0.55,
          ),
        ],
        z: 60,
        gone: open,
        to: [30, 760],
        spin: 8,
        wait: 0,
      },
    ]
  },
  stars: () => {
    const r = rng(5)
    return Array.from({ length: 18 }, (_, i) => {
      const k = 0.5 + r() * 0.9
      return {
        at: [40 + r() * 1520, 30 + r() * 480] as const,
        box: [-16, -16, 32, 32] as const,
        shapes: [C(star(14), 'yellow')],
        scale: k,
        anim: 'pi-twinkle',
        delay: -r() * 3 - i * 0.1,
      }
    })
  },
  // A band of cloud across the top: the sky, rising as Pangu pushes
  sky: (state) => [
    {
      at: [0, state === 'high' ? -60 : 40],
      glide: 6,
      box: [0, -120, 1600, 300],
      shapes: [
        C(
          'M0 -120H1600V120C1500 160 1400 120 1300 150C1200 180 1100 130 1000 160C900 190 800 140 700 170C600 200 500 150 400 175C300 200 200 150 100 170C60 178 20 168 0 160Z',
          'blue',
          'curls',
          1.3,
          0.8,
        ),
        L(
          'M120 150C110 130 134 118 146 132M420 160C410 140 434 128 446 142M760 150C750 130 774 118 786 132M1060 146C1050 126 1074 114 1086 128M1360 142C1350 122 1374 110 1386 124',
          3,
        ),
      ],
    },
  ],
  // Rocky ground along the foot of the screen
  earth: () => [
    {
      at: [0, 0],
      box: [0, 760, 1600, 140],
      shapes: [
        C(
          'M0 900V800C80 780 160 790 240 770C320 750 380 780 460 770C560 758 640 790 760 776C880 762 960 790 1080 772C1180 758 1280 786 1380 770C1460 760 1540 780 1600 772V900Z',
          'hide',
          'hex',
          1.4,
        ),
        C(
          'M120 900L150 820L210 812L250 900ZM900 900L940 830L1010 826L1040 900ZM1380 900L1420 836L1480 840L1500 900Z',
          'black',
          'dots',
          0.6,
        ),
      ],
    },
  ],
  // A range of peaks, with pines
  mountains: () => [
    {
      at: [0, 0],
      box: [0, 260, 1600, 640],
      shapes: [
        C(
          'M-20 900L120 560L190 600L300 400L380 470L460 380L600 900Z',
          'blue',
          'lattice',
          1.6,
        ),
        C(
          'M440 900L620 520L700 560L820 300L900 380L980 330L1160 900Z',
          'green',
          'scales',
          1.6,
        ),
        C(
          'M1040 900L1180 560L1260 600L1380 420L1460 500L1520 450L1640 900Z',
          'blue',
          'lattice',
          1.6,
        ),
        L(
          'M300 400L320 520L300 640M820 300L840 440L810 580M1380 420L1400 560',
          2.4,
        ),
      ],
    },
    {
      at: [380, 600],
      box: [-50, -145, 100, 150],
      shapes: PINE,
      anim: 'pi-sway',
      delay: -1,
    },
    {
      at: [980, 520],
      box: [-50, -145, 100, 150],
      shapes: PINE,
      anim: 'pi-sway',
      delay: -3,
    },
  ],
  // A river along the foot of the screen, flowing; dry, a cracked bed
  river: (state) => {
    const dry = state === 'dry'
    return [
      {
        at: [0, 0],
        box: [0, 780, 1800, 120],
        shapes: [
          C(waves(0, 1800, 820, 12, 160, 900), 'blue', 'waves', 1.3, 0.8),
        ],
        anim: 'pi-flow',
        gone: dry,
        fade: true,
        z: 55,
      },
      {
        at: [0, 0],
        box: [0, 810, 1600, 90],
        shapes: [
          C(
            'M0 838C300 826 600 846 900 834C1200 822 1400 840 1600 832V900H0Z',
            'hide',
            'teeth',
            1.4,
          ),
          L(
            'M120 860L160 846L200 862L250 850M600 870L650 852L690 866M1100 860L1150 848L1190 864L1240 852',
            2,
          ),
        ],
        gone: !dry,
        fade: true,
        z: 55,
      },
    ]
  },
  // A hole torn in the sky; mended, a patch of five-coloured stones
  hole: (state) => {
    const mended = state === 'mended'
    return [
      {
        at: [0, 0],
        box: [520, 30, 560, 280],
        shapes: [
          C(
            'M560 150L620 110L640 60L700 90L760 40L800 80L860 36L900 90L960 70L990 120L1050 140L1000 180L1020 230L950 220L900 270L840 230L780 280L730 230L660 250L640 200L570 200Z',
            'black',
            undefined,
            undefined,
            0.95,
          ),
          C(
            'M690 150L740 112L800 136L862 112L920 156L866 194L792 182L726 200Z',
            'red',
            'curls',
            0.9,
            0.85,
          ),
          C(
            'M760 150L800 136L846 150L800 166Z',
            'orange',
            undefined,
            undefined,
            0.9,
          ),
          L(
            'M560 150L510 160M640 60L620 20M760 40L770 0M900 90L940 40M1050 140L1100 130M1020 230L1070 270M900 270L910 320M730 230L700 290M570 200L530 240',
            3,
          ),
        ],
        anim: 'pi-pulse',
        gone: mended,
        fade: true,
      },
      {
        at: [0, 0],
        box: [600, 60, 400, 200],
        shapes: [
          C(
            'M640 150L700 100L770 110L800 160L740 200L660 196Z',
            'red',
            'dots',
            0.6,
          ),
          C('M770 110L840 80L900 110L880 170L800 160Z', 'yellow', 'dots', 0.6),
          C(
            'M800 160L880 170L920 210L860 240L760 230L740 200Z',
            'blue',
            'dots',
            0.6,
          ),
          C('M880 170L900 110L960 130L980 190L920 210Z', 'pale', 'dots', 0.6),
          C('M660 196L740 200L760 230L700 250L650 230Z', 'black', 'dots', 0.6),
        ],
        gone: !mended,
        fade: true,
      },
    ]
  },
  // Rain, falling for ever
  rain: () => {
    const r = rng(3)
    let d = ''
    for (let i = 0; i < 70; i++) {
      const x = r() * 1700
      const y = r() * 120
      for (let row = 0; row < 9; row++)
        d += `M${f(x)} ${f(y + row * 120)}l-12 44`
    }
    return [
      {
        at: [0, 0],
        box: [-20, -10, 1740, 1100],
        shapes: [L(d, 2.6)],
        anim: 'pi-rain',
      },
    ]
  },
  // Water over the land, in front of the people's feet
  flood: () => [
    {
      at: [0, 0],
      box: [-200, 700, 2000, 200],
      shapes: [
        C(waves(-200, 1800, 738, 14, 120, 900), 'blue', 'waves', 1.2, 0.55),
      ],
      anim: 'pi-flow',
      delay: -2,
    },
    {
      at: [0, 0],
      box: [-200, 760, 2000, 140],
      shapes: [
        C(waves(-200, 1800, 790, 16, 160, 900), 'blue', 'waves', 1.5, 0.75),
      ],
      anim: 'pi-bob',
      z: 60,
    },
  ],
  // Five stones, of five colours, to mend the sky with
  stones: (state) => {
    const used = state === 'used'
    const STONES: Array<[Dye, number, number]> = [
      ['red', 470, 380],
      ['yellow', 560, 320],
      ['blue', 660, 300],
      ['pale', 760, 320],
      ['black', 850, 380],
    ]
    return STONES.map(([dye, x, y], i) => ({
      at: [x, y] as const,
      box: [-40, -40, 80, 80] as const,
      shapes: [
        C(
          'M-30 -4L-16 -26L14 -28L32 -6L22 24L-14 28L-32 12Z',
          dye,
          'dots',
          0.6,
        ),
        L('M-16 -26L-4 -2L22 24M-4 -2L32 -6', 1.6),
      ],
      anim: 'pi-bob',
      delay: -i * 0.7,
      gone: used,
      to: [740 + i * 30, 150] as const,
      spin: 200,
      wait: i,
    }))
  },
  // A rainbow: Nüwa's stones, shining after the rain
  rainbow: () => {
    const BANDS: Array<Dye> = ['red', 'orange', 'yellow', 'green', 'blue']
    return [
      {
        at: [800, 920],
        box: [-760, -760, 1520, 780],
        shapes: BANDS.map((dye, i) => {
          const r1 = 720 - i * 40
          const r2 = r1 - 40
          return {
            d: `M${-r1} 0A${r1} ${r1} 0 0 1 ${r1} 0L${r2} 0A${r2} ${r2} 0 0 0 ${-r2} 0Z`,
            dye,
            alpha: 0.5,
            bare: true,
          }
        }),
      },
      cloud(40, 760, 0.9, 'pale', 'pi-bob', -1),
      cloud(1340, 760, 0.9, 'pale', 'pi-bob', -2, true),
    ]
  },
  // China's lander, flying to the moon
  probe: () => [
    {
      at: [1470, 110],
      box: [-60, -80, 120, 170],
      shapes: [
        C('M-10 50L0 82L10 50Z', 'orange', 'dots', 0.4),
        C('M-16 40L-30 54L-16 30ZM16 40L30 54L16 30Z', 'red'),
        C(
          'M-16 44L-16 -30C-16 -56 16 -56 16 -30L16 44Z',
          'pale',
          'lattice',
          0.5,
        ),
        dot(0, -18, 8, 'blue'),
        C('M-16 6L16 6L16 14L-16 14Z', 'red'),
      ],
      scale: 0.9,
      anim: 'pi-launch',
    },
  ],
  // The pass in the west (函谷关): a wall with a gate and a tower
  gate: () => [
    {
      at: [36, 862],
      box: [-14, -630, 470, 640],
      shapes: [
        C('M0 0L0 -330L440 -330L440 0Z', 'hide', 'hex', 1.3),
        O('M165 0L165 -120C165 -178 275 -178 275 -120L275 0Z'),
        C(battlements(0, 440, -330), 'hide'),
        C('M40 -354L400 -354L410 -330L30 -330Z', 'black', 'teeth', 0.6),
        C('M72 -354L368 -354L368 -446L72 -446Z', 'red', 'dots', 0.6),
        C('M96 -366L148 -366L148 -432L96 -432Z', 'pale', 'lattice', 0.7),
        C('M196 -366L244 -366L244 -432L196 -432Z', 'pale', 'lattice', 0.7),
        C('M292 -366L344 -366L344 -432L292 -432Z', 'pale', 'lattice', 0.7),
        C(roof(14, 426, -446, 40), 'green', 'scales', 0.8),
        C('M124 -476L316 -476L316 -526L124 -526Z', 'red', 'dots', 0.6),
        C(
          'M150 -484L210 -484L210 -518L150 -518ZM230 -484L290 -484L290 -518L230 -518Z',
          'pale',
          'lattice',
          0.6,
        ),
        C(roof(70, 370, -526, 34), 'green', 'scales', 0.8),
        C('M150 -560L136 -580L160 -566ZM290 -560L304 -580L280 -566Z', 'black'),
        L('M220 -560L220 -626', 3),
        C('M220 -626L268 -614L254 -602L270 -590L220 -588Z', 'red', 'dots', 0.4),
      ],
    },
  ],
  // The Way: the great ultimate (太极) and the eight trigrams round it
  taiji: () => {
    const shapes: Array<Shape> = [
      C(circle(0, 0, 92), 'pale'),
      C('M0 -92A92 92 0 0 1 0 92A46 46 0 0 1 0 0A46 46 0 0 0 0 -92Z', 'black'),
      dot(0, -46, 14, 'black'),
      dot(0, 46, 14, 'pale'),
    ]
    // Fu Xi's order, from the top: 乾 兑 离 震 坤 艮 坎 巽 (1 is unbroken)
    const TRIGRAMS = ['111', '011', '101', '001', '000', '100', '010', '110']
    let d = ''
    TRIGRAMS.forEach((lines, k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 4
      ;[...lines].forEach((yang, j) => {
        const r = 118 + j * 16
        const half = 0.24
        const p = (t: number) =>
          `${f(Math.cos(a + t) * r)} ${f(Math.sin(a + t) * r)}`
        d +=
          yang === '1'
            ? `M${p(-half)}L${p(half)}`
            : `M${p(-half)}L${p(-0.05)}M${p(0.05)}L${p(half)}`
      })
    })
    shapes.push(L(d, 8))
    return [
      {
        at: [800, 300],
        box: [-170, -170, 340, 340],
        shapes,
        anim: 'pi-spin',
      },
    ]
  },
  // The book of the Way, on bamboo slips
  slips: () => [
    {
      at: [640, 110],
      box: [-10, -10, 320, 236],
      shapes: slips(13),
      anim: 'pi-bob',
    },
  ],
  // Ten suns: 'home' when only one comes out, or how many are left
  suns: (state) => {
    const home = state === 'home'
    const left = home ? 10 : state ? Number(state) : 10
    // the order they fall in; the one in the middle stays
    const FALL = [0, 9, 1, 8, 2, 7, 3, 6, 5]
    const gone = new Set(home ? FALL : FALL.slice(0, 10 - left))
    return Array.from({ length: 10 }, (_, i) => {
      const x = 130 + i * 149
      const y = i % 2 ? 230 : 140
      return sun(x, y, 50).map((s): Sprite =>
        home
          ? { ...s, gone: gone.has(i), fade: true }
          : {
              ...s,
              gone: gone.has(i),
              to: [x + (i < 5 ? -120 : 120), y + 1000],
              spin: i < 5 ? -70 : 70,
              wait: FALL.indexOf(i),
            },
      )
    }).flat()
  },
  // One sun, high in the sky
  sun: () => sun(470, 175, 64),
  // The full moon in a ring of cut leather, with the cassia tree on it
  moon: () => [
    {
      at: [1250, 230],
      box: [-190, -190, 380, 380],
      shapes: [
        C(ring(0, 0, 176, 142), 'yellow', 'scales', 1),
        C(
          'M40 120C30 80 40 40 70 20C60 50 60 70 72 90C90 60 110 50 130 50C110 70 96 96 92 126Z',
          'black',
          'dots',
          0.5,
        ),
        C('M-110 70C-80 40 -40 50 -20 70C-40 64 -70 66 -96 86Z', 'blue'),
      ],
      anim: 'pi-pulse',
    },
  ],
  // A weeping willow, to the right
  willow: () => {
    let strands = ''
    for (let i = 0; i < 11; i++) {
      const x = -120 + i * 24
      const len = 160 + ((i * 37) % 70)
      strands += `M${x} ${-330 + Math.abs(i - 5) * 10}C${x - 6} ${-260} ${x + 8} ${-220} ${x - 4} ${-330 + len}`
    }
    return [
      {
        at: [1510, 862],
        box: [-160, -400, 300, 410],
        shapes: [
          C(
            'M-12 0C-8 -100 -16 -200 -4 -300L10 -300C16 -200 14 -100 20 0Z',
            'black',
            'stripes',
            0.5,
          ),
          C(
            'M-140 -300C-120 -380 120 -390 140 -300C80 -320 -80 -320 -140 -300Z',
            'green',
            'flowers',
            0.6,
          ),
          L(strands, 3),
        ],
        anim: 'pi-sway',
        delay: -2,
      },
    ]
  },
  // A cottage with a tiled roof and a fence, to the left
  house: () => [
    {
      at: [40, 862],
      box: [-20, -330, 400, 340],
      shapes: [
        C('M20 0L20 -170L330 -170L330 0Z', 'hide', 'hex', 1.1),
        O('M140 0L140 -110L210 -110L210 0Z'),
        C('M250 -140L310 -140L310 -80L250 -80Z', 'pale', 'lattice', 0.7),
        C('M40 -140L100 -140L100 -80L40 -80Z', 'pale', 'lattice', 0.7),
        C(roof(-10, 360, -170, 90), 'black', 'scales', 0.9),
        C('M170 -258L180 -300L190 -258Z', 'red'),
        L(
          'M-10 0L-10 -70M-10 -50L20 -50M-10 -24L20 -24M350 0L350 -70M330 -50L370 -50M330 -24L370 -24',
          3,
        ),
      ],
    },
  ],
  // The river of stars across the sky
  milky: () => {
    const r = rng(17)
    let d = ''
    for (let i = 0; i < 110; i++) {
      const t = r()
      const x = 690 + t * 190 + (r() - 0.5) * 170
      const y = -20 + t * 940
      d += circle(x, y, 2 + r() * 4)
    }
    return [
      {
        at: [0, 0],
        box: [560, -40, 480, 980],
        shapes: [
          {
            d: 'M640 -40C700 200 620 500 700 940L1000 940C930 500 1010 200 940 -40Z',
            dye: 'pale',
            cut: 'waves',
            cs: 2.4,
            alpha: 0.75,
            bare: true,
          },
          {
            d: 'M700 -40C750 200 690 500 760 940L940 940C880 500 950 200 880 -40Z',
            dye: 'blue',
            cut: 'waves',
            cs: 1.6,
            alpha: 0.3,
            bare: true,
          },
          { d, dye: 'yellow', alpha: 0.9, bare: true },
        ],
      },
      {
        at: [0, 0],
        box: [560, -40, 480, 980],
        shapes: [
          C(
            circle(760, 220, 8) + circle(860, 520, 7) + circle(800, 760, 9),
            'yellow',
          ),
        ],
        anim: 'pi-twinkle',
      },
    ]
  },
  // Magpies, flying in from both sides to make a bridge
  bridge: () =>
    Array.from({ length: 9 }, (_, i) => {
      const t = i / 8
      const x = 470 + 660 * t
      const y = 560 - 380 * t * (1 - t)
      return {
        at: [x, y] as const,
        box: [-66, -58, 106, 76] as const,
        shapes: MAGPIE,
        flip: t > 0.5,
        scale: 1.05,
        anim: 'pi-fly-in',
        delay: Math.abs(i - 4) * 0.25,
      }
    }),
  // Altair and Vega, either side of the Milky Way
  lovers: () =>
    [
      [430, 280],
      [1170, 320],
    ].map(([x, y], i) => ({
      at: [x, y] as const,
      box: [-60, -60, 120, 120] as const,
      shapes: [
        { d: circle(0, 0, 44), dye: 'yellow' as const, alpha: 0.3, bare: true },
        C(star(46, 8), 'yellow', 'dots', 0.4),
      ],
      anim: 'pi-pulse',
      delay: -i * 1.1,
    })),
  // A spreading old tree, to sleep under
  tree: () => [
    {
      at: [250, 862],
      box: [-240, -560, 480, 570],
      shapes: [
        C(
          'M-30 0C-20 -80 -40 -160 -10 -240C-30 -290 -80 -320 -120 -330L-110 -344C-70 -330 -30 -310 0 -270C20 -320 60 -360 110 -370L116 -356C70 -340 40 -300 26 -240C40 -160 30 -80 44 0Z',
          'black',
          'stripes',
          0.6,
        ),
        C(
          'M-230 -330C-250 -390 -190 -440 -130 -420C-110 -480 -30 -500 10 -460C50 -520 150 -510 170 -450C230 -460 260 -390 220 -350C240 -300 180 -270 130 -296C100 -260 30 -270 10 -300C-20 -270 -90 -270 -110 -300C-160 -270 -230 -290 -230 -330Z',
          'green',
          'flowers',
          1.1,
        ),
        L(
          'M-160 -380C-150 -400 -126 -396 -128 -380M-40 -440C-30 -460 -6 -456 -8 -440M80 -420C90 -440 114 -436 112 -420M170 -380C180 -400 204 -396 202 -380',
          3,
        ),
      ],
      anim: 'pi-sway',
      delay: -1.5,
    },
  ],
  // Flowers swaying along the ground
  flowers: () =>
    (
      [
        [900, 'red', 0.9],
        [1050, 'yellow', 0.75],
        [1230, 'orange', 1],
        [1420, 'red', 0.8],
      ] as const
    ).map(([x, dye, k], i) => ({
      at: [x, 862] as const,
      box: [-60, -170, 120, 175] as const,
      shapes: [
        L('M0 0C-4 -40 6 -80 0 -120', 3),
        C(
          'M0 -40C-30 -50 -46 -30 -50 -14C-30 -20 -12 -26 0 -40ZM0 -70C24 -84 44 -70 50 -56C30 -58 12 -60 0 -70Z',
          'green',
          'stripes',
          0.4,
        ),
        C(
          'M0 -120C-16 -126 -34 -140 -30 -158C-20 -150 -12 -152 -8 -166C0 -150 4 -150 10 -166C14 -152 22 -150 30 -158C34 -140 16 -126 0 -120Z',
          dye,
          'dots',
          0.45,
        ),
        dot(0, -136, 6, 'yellow'),
      ],
      scale: k,
      anim: 'pi-sway',
      delay: -i * 1.3,
    })),
  // A dream, floating up from the sleeper
  dream: () => [
    {
      at: [470, 190],
      box: [-10, -10, 290, 130],
      shapes: CLOUD('purple', 0.55),
      scale: 1.5,
      anim: 'pi-bob',
    },
    {
      at: [0, 0],
      box: [380, 330, 120, 160],
      shapes: [
        { d: circle(400, 470, 8), dye: 'purple', alpha: 0.6 },
        { d: circle(430, 420, 13), dye: 'purple', alpha: 0.6 },
        { d: circle(470, 360, 19), dye: 'purple', alpha: 0.6 },
      ],
      anim: 'pi-pulse',
    },
  ],
  // The Great Wall along the far hills: the frontier (塞)
  wall: () => [
    {
      at: [0, 0],
      box: [0, 420, 1600, 480],
      shapes: [
        C(
          'M0 640C160 580 300 520 460 540C620 560 760 470 940 480C1100 490 1260 560 1600 520V900H0Z',
          'green',
          'lattice',
          1.4,
        ),
        C(
          'M0 620C160 560 300 500 460 520C620 540 760 450 940 460C1100 470 1260 540 1600 500L1600 524C1260 564 1100 494 940 484C760 474 620 564 460 544C300 524 160 584 0 644Z',
          'hide',
          'hex',
          0.8,
        ),
        C('M380 520L380 440L460 440L460 528Z', 'hide', 'hex', 0.8),
        C(
          'M372 444L376 424L388 432L396 420L404 432L416 420L424 432L436 420L444 432L456 420L464 444Z',
          'hide',
        ),
        C('M1180 520L1180 420L1270 420L1270 528Z', 'hide', 'hex', 0.8),
        C(roof(1170, 1280, -0 + 420, 34), 'black', 'scales', 0.6),
        L('M1225 386L1225 340M1225 340C1240 320 1230 300 1244 286', 3),
      ],
    },
  ],
  // War banners, flying
  flags: () =>
    (
      [
        [1240, 'red'],
        [1370, 'black'],
        [1490, 'yellow'],
      ] as const
    ).map(([x, dye], i) => ({
      at: [x, 862] as const,
      box: [-20, -600, 180, 610] as const,
      shapes: [
        C('M-4 0L-3 -560L3 -560L4 0Z', 'hide'),
        C('M0 -560L-8 -580L8 -580Z', 'yellow'),
        C(
          'M3 -550L140 -520L118 -500L140 -480L118 -460L140 -440L3 -420Z',
          dye,
          'curls',
          0.7,
        ),
      ],
      anim: 'pi-sway',
      delay: -i * 0.9,
    })),
  // Yugong's two mountains; the gods carry them away
  peaks: (state) => {
    const gone = state === 'gone'
    return [
      {
        at: [0, 0],
        box: [520, 100, 640, 800],
        shapes: [
          C(
            'M520 900L700 420L760 460L860 120L960 360L1020 320L1160 900Z',
            'green',
            'scales',
            1.8,
          ),
          L('M860 120L880 300L850 480L880 700M760 460L780 600', 2.6),
        ],
        gone,
        to: [-60, -1200],
        spin: -6,
        wait: 0,
      },
      {
        at: [700, 430],
        box: [-50, -145, 100, 150],
        shapes: PINE,
        gone,
        to: [640, -770],
        spin: -6,
        wait: 0,
      },
      {
        at: [0, 0],
        box: [980, 180, 640, 720],
        shapes: [
          C(
            'M980 900L1140 480L1200 520L1300 200L1400 420L1460 380L1640 900Z',
            'blue',
            'lattice',
            1.8,
          ),
          L('M1300 200L1320 380L1290 560L1320 760', 2.6),
        ],
        gone,
        to: [60, -1200],
        spin: 6,
        wait: 1,
      },
      {
        at: [1460, 400],
        box: [-50, -145, 100, 150],
        shapes: PINE,
        gone,
        to: [1520, -800],
        spin: 6,
        wait: 1,
      },
    ]
  },
  // Stones taken from the mountain, piled up
  rubble: () => [
    {
      at: [0, 0],
      box: [560, 780, 260, 90],
      shapes: [
        C('M580 862L600 826L640 820L660 862Z', 'hide', 'dots', 0.5),
        C('M640 862L670 812L720 806L740 862Z', 'pale', 'dots', 0.5),
        C('M700 862L720 830L770 826L800 862Z', 'hide', 'dots', 0.5),
        C('M620 822L650 790L690 796L700 818Z', 'pale', 'dots', 0.5),
      ],
    },
  ],
  // The mountain of flowers and fruit, with its waterfall
  mountain: () => [
    {
      at: [0, 0],
      box: [-20, 100, 720, 800],
      shapes: [
        C(
          'M-20 900L-20 300L80 160L160 220L240 120L340 260L420 220L520 380L560 520L700 900Z',
          'green',
          'scales',
          1.6,
        ),
        C('M300 900L340 600L420 560L470 640L520 900Z', 'blue', 'lattice', 1.2),
        L('M240 120L260 300L220 480M80 160L100 320', 2.6),
      ],
    },
    {
      at: [0, 0],
      box: [360, 200, 90, 700],
      shapes: [
        {
          d: 'M380 260L430 260L440 900L372 900Z',
          dye: 'pale',
          cut: 'stripes',
          cs: 0.8,
          alpha: 0.7,
        },
      ],
    },
    {
      at: [160, 220],
      box: [-50, -145, 100, 150],
      shapes: PINE,
      anim: 'pi-sway',
    },
    {
      at: [520, 380],
      box: [-50, -145, 100, 150],
      shapes: PINE,
      anim: 'pi-sway',
      delay: -2,
    },
  ],
  // The stone the monkey is born from; it splits in two
  stone: (state) => {
    const open = state === 'open'
    return [
      {
        at: [0, 0],
        box: [700, 760, 380, 140],
        shapes: [
          C(
            'M720 900L760 790L860 770L960 776L1040 800L1080 900Z',
            'black',
            'hex',
            1,
          ),
        ],
      },
      {
        at: [0, 0],
        box: [770, 500, 120, 290],
        shapes: [
          C(
            'M890 510C840 506 790 560 778 640C770 720 810 780 890 786L874 720L896 660L870 600L894 540Z',
            'pale',
            'hex',
            1.2,
          ),
          L('M800 600C810 580 830 570 840 580', 2),
        ],
        z: 60,
        gone: open,
        to: [-300, 160],
        spin: -40,
        wait: 0,
      },
      {
        at: [0, 0],
        box: [866, 500, 130, 290],
        shapes: [
          C(
            'M890 510C950 512 996 570 998 650C1000 730 960 784 890 786L874 720L896 660L870 600L894 540Z',
            'pale',
            'hex',
            1.2,
          ),
          L('M960 620C970 640 966 664 952 676', 2),
        ],
        z: 60,
        gone: open,
        to: [300, 160],
        spin: 40,
        wait: 0,
      },
      {
        at: [890, 640],
        box: [-260, -260, 520, 520],
        shapes: [
          {
            d: Array.from({ length: 16 }, (_, i) => {
              const a = (i * Math.PI) / 8
              const p = (r: number, da: number) =>
                `${f(Math.cos(a + da) * r)} ${f(Math.sin(a + da) * r)}`
              return `M${p(60, -0.08)}L${p(250, 0)}L${p(60, 0.08)}Z`
            }).join(''),
            dye: 'yellow',
            alpha: 0.5,
            bare: true,
          },
        ],
        anim: 'pi-spin',
        gone: !open,
        fade: true,
      },
    ]
  },
  // Puffs of smoke, for the seventy-two changes
  puff: () =>
    (
      [
        [760, 420, 0.8],
        [980, 380, 0.65],
        [820, 600, 0.7],
        [1000, 560, 0.55],
      ] as const
    ).map(([x, y, k], i) => ({
      at: [x, y] as const,
      box: [-10, -10, 290, 130] as const,
      shapes: CLOUD('pale', 0.7),
      scale: k,
      flip: i % 2 === 1,
      anim: 'pi-pulse',
      delay: -i * 0.6,
    })),
  // Clouds rushing past: a somersault of a hundred and eight thousand li
  cloudway: () =>
    (
      [
        [180, 0.8],
        [420, 0.6],
        [640, 1],
        [300, 0.5],
        [760, 0.7],
      ] as const
    ).map(([y, k], i) => ({
      at: [1700, y] as const,
      box: [-10, -10, 290, 130] as const,
      shapes: CLOUD(i % 2 ? 'pale' : 'blue'),
      scale: k,
      anim: 'pi-race',
      delay: -i * 0.55,
    })),
  // The palace of heaven, on clouds
  palace: () => [
    cloud(820, 620, 1.3, 'pale', 'pi-bob'),
    cloud(1180, 640, 1.2, 'blue', 'pi-bob', -1.5, true),
    {
      at: [0, 0],
      box: [880, 200, 640, 520],
      shapes: [
        C('M900 680L1500 680L1480 650L920 650Z', 'pale', 'teeth', 0.6),
        C('M940 650L1460 650L1460 470L940 470Z', 'red', 'dots', 0.6),
        C(
          'M980 640L1040 640L1040 500L980 500ZM1100 640L1170 640L1170 500L1100 500ZM1230 640L1300 640L1300 500L1230 500ZM1360 640L1420 640L1420 500L1360 500Z',
          'yellow',
          'lattice',
          0.7,
        ),
        C(roof(900, 1500, 470, 60), 'yellow', 'scales', 0.9),
        C('M1040 400L1360 400L1360 350L1040 350Z', 'red', 'dots', 0.5),
        C(roof(990, 1410, 350, 70), 'yellow', 'scales', 0.9),
        C('M1100 282L1084 254L1112 270ZM1300 282L1316 254L1288 270Z', 'black'),
        dot(1200, 290, 10, 'red'),
      ],
    },
  ],
  // The Buddha's hand, vast and soft, coming down
  buddha: () => [
    {
      at: [800, 470],
      box: [-330, -440, 660, 880],
      shapes: [
        { d: ring(0, -40, 330, 300), dye: 'yellow', alpha: 0.45, bare: true },
        C(
          'M-150 380C-190 240 -200 120 -190 40C-210 -40 -230 -120 -200 -150C-176 -170 -150 -150 -140 -100L-120 -10L-120 -300C-120 -340 -70 -340 -64 -300L-50 -60L-40 -360C-36 -400 20 -400 22 -360L26 -60L50 -320C56 -360 108 -356 106 -316L96 -40L130 -230C138 -266 186 -262 182 -222L170 40C168 140 150 260 110 380Z',
          'yellow',
          'lattice',
          2.2,
          0.7,
        ),
        dot(-10, 120, 22, 'red'),
      ],
      soft: 7,
    },
  ],
  // Lord Ye's hall: a beam and columns, a round window, a door, and
  // dragons carved on the beam and the door
  hall: () => [
    {
      at: [0, 0],
      box: [0, 0, 1600, 900],
      shapes: [
        C('M0 0H1600V64H0Z', 'red', 'coins', 1),
        C('M0 64H1600V80H0Z', 'yellow', 'teeth', 0.6),
        C('M70 80H126V862H70ZM1474 80H1530V862H1474Z', 'red', 'dots', 0.6),
        C(
          'M56 80H140L130 108H66ZM1460 80H1544L1534 108H1470ZM52 838H144L150 862H46ZM1456 838H1548L1554 862H1450Z',
          'yellow',
        ),
        C(ring(430, 340, 150, 126), 'black', 'dots', 0.6),
        {
          d: circle(430, 340, 126),
          dye: 'hide',
          cut: 'lattice',
          cs: 1.6,
          alpha: 0.75,
        },
        L('M304 340H556M430 214V466', 3),
        C('M1160 380H1360V862H1160Z', 'red', 'lattice', 1.2),
        C('M1176 640H1250V840H1176ZM1270 640H1344V840H1270Z', 'red'),
        L('M1260 380V862', 4),
        C('M0 846H1600V900H0Z', 'hide', 'hex', 1.2),
      ],
    },
    {
      at: [800, 34],
      box: [-240, -40, 480, 80],
      shapes: [{ d: dragonGlyph(380, 52), dye: 'yellow', join: true }],
    },
    {
      at: [1213, 740],
      box: [-40, -70, 80, 140],
      shapes: [{ d: dragonGlyph(110, 70), dye: 'yellow', join: true }],
      scale: 0.6,
    },
    {
      at: [1307, 740],
      box: [-40, -70, 80, 140],
      shapes: [{ d: dragonGlyph(110, 70), dye: 'yellow', join: true }],
      scale: 0.6,
      flip: true,
    },
  ],
  // Paintings of dragons on the walls, hanging from their nails
  scrolls: () =>
    (
      [
        [720, 120, 1],
        [960, 140, -1],
      ] as const
    ).map(([x, y, dir], i) => ({
      at: [x, y] as const,
      box: [-90, -40, 180, 420] as const,
      shapes: [
        L('M0 -30L-60 10M0 -30L60 10', 2),
        dot(0, -30, 4, 'black'),
        C('M-70 6H70V20H-70Z', 'black'),
        C('M-62 20H62V350H-62Z', 'pale', 'dots', 0.4),
        {
          d: dragonGlyph(100, 150, 0, 185),
          dye: 'black' as const,
          alpha: 0.85,
          join: true,
        },
        C('M-70 350H70V364H-70Z', 'black'),
      ],
      anim: 'pi-sway',
      delay: -i * 1.7,
      flip: dir < 0,
    })),
  // The Five Elements Mountain, over the monkey, with a gap for his head
  fivepeaks: () => [
    {
      at: [0, 0],
      box: [250, 360, 1000, 540],
      shapes: [
        C(
          'M260 900L310 560C330 480 410 470 430 560L450 480C480 400 560 410 570 500L600 450C630 380 690 390 700 470L710 650L790 650L800 460C810 380 890 380 910 460L940 420C970 360 1050 370 1060 450L1070 520C1090 450 1150 450 1160 520L1240 900Z',
          'hide',
          'scales',
          1.6,
        ),
        C('M930 380L960 376L966 450L936 452Z', 'yellow', 'stripes', 0.3),
      ],
      z: 60,
    },
  ],
}

// Every piece's name, for checking the stories
export const PIECE_NAMES = new Set(Object.keys(SCENERY))

// The sprites of a piece in a state ('suns:3'), or none
export function spritesOf(spec: string): Array<Sprite> {
  const [name, state = ''] = spec.split(':')
  const piece = SCENERY[name] as Piece | undefined
  return piece ? piece(state) : []
}
