import { useEffect, useMemo, useRef, useState } from 'react'
import { CITY_AT, MAP_H, MAP_SRC, MAP_W } from '../data/map'
import { CITIES } from '../data/trip'
import { useStore } from '../lib/store'
import { box, dith, glints, glow, hash, px } from './ambient'
import { sprite } from './props'
import { Stage } from './stage'
import type { Frame, G, Layer } from './ambient'
import type { SceneArt } from './stage'

// The trip on an illustrated map of eastern China (made by
// scripts/map.ts): the route so far, a landmark for each city, a
// junk at sea, clouds going over, and the traveller standing where the
// next scene is. Between cities the traveller goes by train or plane.

interface MapState {
  // cities with every scene done, and with some done
  done: Set<string>
  begun: Set<string>
  // where the traveller is
  here: string
  travel: { from: string; to: string; start: number } | null
}

const ORDER = CITIES.map((c) => c.id)
const LEG_SECS = 3.2

// Each leg bends a little, as routes on old maps do
function legPoint(
  a: [number, number],
  b: [number, number],
  p: number,
): [number, number] {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const cx = mx - dy * 0.18
  const cy = my + dx * 0.18
  const u = 1 - p
  return [
    u * u * a[0] + 2 * u * p * cx + p * p * b[0],
    u * u * a[1] + 2 * u * p * cy + p * p * b[1],
  ]
}

const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2)

// --- Landmarks, one per city, as rows of letters ---

const LANDMARKS: Record<
  string,
  { rows: Array<string>; pal: Record<string, string> } | undefined
> = {
  // the Gate of Heavenly Peace
  beijing: {
    rows: [
      '.....YY.....',
      '..YYYYYYYY..',
      '.Y.RRRRRR.Y.',
      '..YYYYYYYY..',
      'YYYYYYYYYYYY',
      '..RRRRRRRR..',
      '.RRRRRRRRRR.',
      '.RRKRRKRRKR.',
      '.RRKRRKRRKR.',
    ],
    pal: { Y: '#f2c14e', R: '#c8372d', K: '#3a1a14' },
  },
  // a hall of the temple of Confucius under its cypresses
  qufu: {
    rows: [
      'G....YY.....',
      'GG.YYYYYY...',
      'GGYYYYYYYY..',
      'GG.RWRWRW...',
      'TG.RWRWRW...',
      '.T.SSSSSSS..',
    ],
    pal: {
      Y: '#f2c14e',
      R: '#a8261c',
      W: '#e8dcc0',
      G: '#2f6a3a',
      T: '#5a3a22',
      S: '#d8d0c0',
    },
  },
  // the Big Wild Goose Pagoda
  xian: {
    rows: [
      '...B...',
      '..BBB..',
      '..LBD..',
      '.BBBBB.',
      '.LBKBD.',
      '.BBBBB.',
      '.LBKBD.',
      'BBBBBBB',
      'LBBKBBD',
      'SSSSSSS',
    ],
    pal: {
      B: '#c8a070',
      L: '#e8c890',
      D: '#8a6a40',
      K: '#3a2a1a',
      S: '#8a7a6a',
    },
  },
  // a panda
  chengdu: {
    rows: [
      'K.....K.',
      'KWWWWWWK',
      'WKKWWKKW',
      'WKEWWEKW',
      'WWWKKWWW',
      '.WWWWWW.',
      'KKWWWWKK',
      'KKWWWWKK',
    ],
    pal: { K: '#1b1a20', W: '#f4f0e8', E: '#ffffff' },
  },
  // karst peaks over the Li
  guilin: {
    rows: [
      '..G.........',
      '.GGG....G...',
      '.GLG...GGG..',
      'GGLGG..GLGG.',
      'GGLGG.GGLGG.',
      'GLLGGGGLLGGG',
      'BBBBBBBBBBBB',
    ],
    pal: { G: '#2f7a3a', L: '#5aa84a', B: '#6ac0d8' },
  },
  // the Oriental Pearl Tower and its neighbours
  shanghai: {
    rows: [
      '...P........',
      '...P........',
      '..PPP.....B.',
      '..PPP....BB.',
      '...P.....BB.',
      '...P..B..BB.',
      '..PPP.BB.BB.',
      '.PPPPPBBBBB.',
      '..PPP.BBBBB.',
      '.SSSSSSSSSSS',
    ],
    pal: { P: '#ff6ab8', B: '#6a8ad8', S: '#4a5a8a' },
  },
}

// --- Things that move on the map ---

// A few clouds drifting over, their shadows on the land below them. Each
// is drawn once into a small canvas of its own, and its shadow too.
const PUFFS: Array<[number, number, number]> = [
  [7, 10, 4],
  [13, 8, 6],
  [20, 7, 7],
  [27, 9, 5],
  [32, 11, 3],
]
let cloudArt: { cloud: HTMLCanvasElement; shadow: HTMLCanvasElement } | null =
  null
function cloudImages() {
  if (cloudArt) return cloudArt
  const make = (draw: (g: G) => void) => {
    const c = document.createElement('canvas')
    c.width = 42
    c.height = 22
    const g = c.getContext('2d')
    if (g) draw(g)
    return c
  }
  cloudArt = {
    shadow: make((g) => {
      for (const [x, y, r] of PUFFS) disc(g, x, y, r, '#0e1a12')
    }),
    cloud: make((g) => {
      for (const [x, y, r] of PUFFS) disc(g, x, y + 1, r, '#b8bccc')
      for (const [x, y, r] of PUFFS) disc(g, x, y, r - 1, '#fbf8f2')
      for (const [x, y, r] of PUFFS)
        disc(g, x - 1, y - 2, Math.max(1, r - 3), '#ffffff')
    }),
  }
  return cloudArt
}

function clouds(): Layer {
  return ({ g, t, w, h }) => {
    const art = cloudImages()
    for (let i = 0; i < 3; i++) {
      const span = w + 90
      const x = Math.round(
        ((hash(i * 7) * span + t * (1.6 + i * 0.6)) % span) - 45,
      )
      const y = Math.round(36 + hash(i * 5 + 1) * (h - 100))
      g.globalAlpha = 0.22
      g.drawImage(art.shadow, x + 8, y + 12)
      g.globalAlpha = 0.92
      g.drawImage(art.cloud, x, y)
      g.globalAlpha = 1
    }
  }
}

function disc(g: G, cx: number, cy: number, r: number, c: string) {
  g.fillStyle = c
  for (let y = -r; y <= r; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - y * y)))
    g.fillRect(cx - half, cy + y, half * 2 + 1, 1)
  }
}

// A junk under red sails, tacking up the coast
function junk(): Layer {
  return ({ g, t }) => {
    const p = (t / 70) % 1
    const going = p < 0.5
    const q = going ? p * 2 : (1 - p) * 2
    const x = 214 + Math.sin(q * Math.PI * 2) * 4
    const y = 200 - q * 120
    const bob = Math.floor(t * 2) % 2
    sprite(
      g,
      [
        '..R.R..',
        '.RR.RR.',
        '.RR.RR.',
        'RRR.RRR',
        '.BBBBB.',
        'BBBBBBB',
        '.BBBBB.',
      ],
      { R: '#d8402a', B: '#5a3a22' },
      x - 3,
      y - 7 + bob,
      !going,
    )
    // its wake
    for (let k = 1; k < 5; k++)
      if (dith(x, y + k * 2, 0.6))
        px(g, x + (k % 2 ? 1 : -1), y + 1 + k * 2 * (going ? 1 : -1), '#cfe8f0')
  }
}

function route(state: { current: MapState }): Layer {
  return ({ g, t }) => {
    const s = state.current
    for (let i = 0; i + 1 < ORDER.length; i++) {
      const a = CITY_AT[ORDER[i]]
      const b = CITY_AT[ORDER[i + 1]]
      if (!a || !b) continue
      const travelled = s.begun.has(ORDER[i + 1]) || s.done.has(ORDER[i + 1])
      const onLeg = s.travel && s.travel.to === ORDER[i + 1]
      const upTo =
        onLeg && s.travel
          ? ease(Math.min(1, Math.max(0, (t - s.travel.start) / LEG_SECS)))
          : 1
      const n = 60
      for (let k = 0; k <= n; k++) {
        const p = k / n
        const [x, y] = legPoint(a, b, p)
        if (travelled || (onLeg && p <= upTo)) {
          // red dashes with a dark edge, creeping along
          if ((k + Math.floor(t * 4)) % 4 < 2) {
            px(g, x + 1, y + 1, '#3a1410')
            px(g, x, y, '#e0402a')
          }
        } else if (k % 4 === 0) px(g, x, y, '#fff6e0')
      }
    }
  }
}

function landmarks(state: { current: MapState }): Layer {
  return ({ g, t }) => {
    const s = state.current
    for (const id of ORDER) {
      const at = CITY_AT[id]
      const lm = LANDMARKS[id]
      if (!at || !lm) continue
      const w = lm.rows[0].length
      sprite(
        g,
        lm.rows,
        lm.pal,
        at[0] - Math.floor(w / 2),
        at[1] - lm.rows.length - 3,
      )
      // the city's mark: a red seal when done, a ring that breathes for
      // the next stop, a plain dot otherwise
      const [x, y] = at
      if (s.done.has(id)) {
        box(g, x - 2, y - 2, 5, 5, '#3a1410')
        box(g, x - 1, y - 1, 3, 3, '#e0402a')
        px(g, x, y, '#ffd0a0')
      } else if (s.here === id && !s.travel) {
        const r = 3 + (Math.floor(t * 2.5) % 2)
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2
          px(
            g,
            x + Math.round(Math.cos(a) * r),
            y + Math.round(Math.sin(a) * r),
            '#ffe680',
          )
        }
        box(g, x - 1, y - 1, 3, 3, '#3a1410')
        px(g, x, y, '#ffe680')
      } else {
        box(g, x - 1, y - 1, 3, 3, '#3a1410')
        px(g, x, y, '#fff6e0')
      }
    }
  }
}

// The traveller: a little figure with a red pack; on the way, a train or
// a plane
const WALKER = ['.HH.', '.SS.', 'PCCC', 'PCCC', '.CC.', '.LL.', '.L.L']
// a high-speed train, nose to the right, and a plane seen from above
const TRAIN = [
  'WWWWWWWWWWW...',
  'WBBWBBWBBWBWW.',
  'WWWWWWWWWWWWWW',
  'RRRRRRRRRRRRRR',
  '.GG.......GG..',
]
const PLANE = [
  '....W.......',
  '....WW......',
  'W...WWW.....',
  'WWWWWWWWWWW.',
  'W...WWW.....',
  '....WW......',
  '....W.......',
]

function traveller(state: { current: MapState }): Layer {
  return (f: Frame) => {
    const { g, t } = f
    const s = state.current
    if (s.travel) {
      const a = CITY_AT[s.travel.from]
      const b = CITY_AT[s.travel.to]
      if (!a || !b) return
      const p = ease(Math.min(1, Math.max(0, (t - s.travel.start) / LEG_SECS)))
      const [x, y] = legPoint(a, b, p)
      const fly = ORDER.indexOf(s.travel.to) >= ORDER.indexOf('guilin')
      const left = b[0] < a[0]
      if (fly) {
        const lift = Math.round(Math.sin(p * Math.PI) * 12)
        // a shadow on the ground, the plane above it
        g.globalAlpha = 0.35
        sprite(g, PLANE, { W: '#14201a' }, x - 6, y - 3, left)
        g.globalAlpha = 1
        sprite(g, PLANE, { W: '#f4f4f8' }, x - 6, y - 3 - lift, left)
        px(g, x + (left ? 5 : -6), y - 3 - lift, '#e0402a')
      } else {
        sprite(
          g,
          TRAIN,
          { W: '#f4f4f8', B: '#3a5a98', R: '#d8402a', G: '#3a3a40' },
          x - 7,
          y - 4,
          left,
        )
        glow(g, x + (left ? -8 : 8), y - 1, 5, '#fff6c8', 0.35)
      }
      return
    }
    const at = CITY_AT[s.here]
    if (!at) return
    const bob = Math.floor(t * 2) % 2
    sprite(
      g,
      WALKER,
      { H: '#6b4a2e', S: '#e8b98f', C: '#2f7d6d', P: '#c8372d', L: '#2b3550' },
      at[0] + 4,
      at[1] - 6 - bob,
    )
  }
}

export function MapView({
  travel,
  onArrive,
  onCity,
}: {
  // going from one city to the next, then onArrive
  travel?: { from: string; to: string }
  onArrive?: () => void
  onCity?: (id: string) => void
}) {
  const { bank } = useStore()
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const [, setTick] = useState(0)

  const cityState = useMemo(() => {
    const done = new Set<string>()
    const begun = new Set<string>()
    for (const c of CITIES) {
      const n = c.scenes.filter((s) => bank.scenes[s.id]).length
      if (n === c.scenes.length) done.add(c.id)
      if (n > 0) begun.add(c.id)
    }
    const next = CITIES.find((c) => c.scenes.some((s) => !bank.scenes[s.id]))
    return { done, begun, here: next?.id ?? ORDER[ORDER.length - 1] }
  }, [bank.scenes])

  const state = useRef<MapState>({ ...cityState, travel: null })
  state.current = { ...state.current, ...cityState }

  const art = useMemo<SceneArt>(
    () => ({
      w: MAP_W,
      h: MAP_H,
      src: MAP_SRC,
      spots: {},
      back: [
        glints({
          x0: 205,
          y0: 50,
          x1: 238,
          y1: 150,
          n: 12,
          colour: '#e8f8ff',
          seed: 1,
        }),
        glints({
          x0: 130,
          y0: 206,
          x1: 238,
          y1: 238,
          n: 14,
          colour: '#e8f8ff',
          seed: 2,
        }),
        glints({
          x0: 66,
          y0: 214,
          x1: 86,
          y1: 238,
          n: 3,
          colour: '#e8f8ff',
          seed: 3,
        }),
        junk(),
        route(state),
        landmarks(state),
        traveller(state),
        clouds(),
      ],
    }),
    [],
  )

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const s = new Stage(c, art, true)
    stage.current = s
    return () => s.destroy()
  }, [art])

  // Set off when travelling, and arrive a moment after the leg is done
  useEffect(() => {
    if (!travel) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const now = stage.current?.now() ?? 0
    state.current.travel = {
      ...travel,
      // under reduced motion the still frame shows the leg already done
      start: reduced ? -LEG_SECS : now + 0.4,
    }
    setTick((n) => n + 1)
    const id = setTimeout(
      () => onArrive?.(),
      reduced ? 1500 : (LEG_SECS + 1.1) * 1000,
    )
    return () => clearTimeout(id)
  }, [travel?.from, travel?.to])

  return (
    <div className="trip-screen relative mx-auto w-full max-w-xl overflow-hidden rounded-xl">
      <canvas
        ref={canvas}
        width={MAP_W}
        height={MAP_H}
        role="img"
        aria-label="Map of the trip, from Beijing to Shanghai"
        className="block w-full"
        style={{
          imageRendering: 'pixelated',
          aspectRatio: `${MAP_W} / ${MAP_H}`,
          background: '#26517f',
        }}
      />
      {CITIES.map((c) => {
        const at = CITY_AT[c.id]
        if (!at) return null
        const left = (at[0] / MAP_W) * 100
        const top = (at[1] / MAP_H) * 100
        // labels sit to the side with the most room
        const right = at[0] > MAP_W * 0.62
        return (
          <button
            key={c.id}
            type="button"
            disabled={!onCity}
            onClick={() => onCity?.(c.id)}
            aria-label={c.name}
            className="group absolute flex items-center gap-1"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: right
                ? 'translate(calc(-100% - 10px), -50%)'
                : 'translate(10px, -50%)',
              flexDirection: right ? 'row-reverse' : 'row',
            }}
          >
            <span className="rounded bg-[#f7f0e3]/90 px-1.5 py-0.5 text-left leading-none shadow-sm ring-1 ring-[#5a3a22]/40 transition group-enabled:group-hover:bg-white">
              <span className="zh block text-sm text-[var(--red)] sm:text-base">
                {c.h}
              </span>
              <span className="block text-[9px] font-bold tracking-wide text-[var(--ink-2)] uppercase sm:text-[10px]">
                {c.name}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
