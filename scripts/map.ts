// The map behind Tian's trip, as pixel art: eastern China at 240 × 240.
// First a true map: the land coloured from NASA's Blue Marble shaded relief
// (scripts/land_shallow_topo_2048.jpg), its coast from scripts/land-110m.json,
// rivers, lakes, mountains and the Great Wall traced by hand. Then, with
// --paint, that map is given to the image tool (scripts/image.mjs)
// to repaint as an illustrated map, which keeps its shapes in place.
//
//   node scripts/map.ts [--paint]
//
// writes .cache/map-base.png (the true map),
// src/app/data/map.ts (where the cities are) and, with
// --paint, public/art/trip/map.png. Needs ImageMagick (magick).
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'

const PAINT =
  'Repaint the reference map as a beautiful illustrated map in pixel art, in the style of the travel maps of 1990s LucasArts adventure games such as Indiana Jones and the Fate of Atlantis: painterly dithered colour, warm light. Keep exactly the same framing, coastline, islands, rivers, lakes and the line of the Great Wall as the reference, in the same places. Paint the land with rich detail: green plains and rice fields in the south and east, forested hills, mountain ranges drawn as small shaded peaks with snow in the far west, the yellow loess plateau and golden desert in the north-west. The sea deep blue with gentle wave patterns and lighter shallows along the coast. No text, no labels, no letters, no cities, no roads, no compass, no border or frame.'

export const W = 240
export const H = 240
// The view: longitudes and latitudes at the edges. Longitude is shrunk by
// the cosine of the middle latitude, so shapes keep their proportions.
const LON0 = 97.5
const LON1 = 126.5
const LAT1 = 42.4
const C = Math.cos((32 * Math.PI) / 180)
const K = W / ((LON1 - LON0) * C)
const LAT0 = LAT1 - H / K

const at = (lon: number, lat: number): [number, number] => [
  (lon - LON0) * C * K,
  (LAT1 - lat) * K,
]

// --- Land, from the outline of the world's coasts ---

const topo = JSON.parse(readFileSync('scripts/land-110m.json', 'utf8'))
const land = feature(topo, topo.objects.land) as unknown as {
  features?: Array<{ geometry: { type: string; coordinates: unknown } }>
  geometry?: { type: string; coordinates: unknown }
}
const geoms = land.features
  ? land.features.map((f) => f.geometry)
  : [land.geometry!]
const rings: Array<Array<[number, number]>> = []
for (const g of geoms) {
  const polys = (
    g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  ) as Array<Array<Array<[number, number]>>>
  for (const poly of polys)
    for (const ring of poly) rings.push(ring.map(([lo, la]) => at(lo, la)))
}

// A pixel is land if its centre is inside an odd number of rings
const isLand = new Uint8Array(W * H)
for (let y = 0; y < H; y++) {
  const yy = y + 0.5
  const xs: Array<number> = []
  for (const ring of rings)
    for (let i = 0; i < ring.length; i++) {
      const [ax, ay] = ring[i]
      const [bx, by] = ring[(i + 1) % ring.length]
      if (ay === by) continue
      if (yy < Math.min(ay, by) || yy >= Math.max(ay, by)) continue
      xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax))
    }
  xs.sort((a, b) => a - b)
  for (let i = 0; i + 1 < xs.length; i += 2)
    for (
      let x = Math.max(0, Math.ceil(xs[i] - 0.5));
      x < Math.min(W, xs[i + 1] - 0.5);
      x++
    )
      isLand[y * W + x] = 1
}

// --- The colour of the land, from the shaded relief ---

const SRC_W = 2048
const SRC_H = 1024
const sx0 = ((LON0 + 180) / 360) * SRC_W
const sx1 = ((LON1 + 180) / 360) * SRC_W
const sy0 = ((90 - LAT1) / 180) * SRC_H
const sy1 = ((90 - LAT0) / 180) * SRC_H
const relief = spawnSync(
  'magick',
  [
    'scripts/land_shallow_topo_2048.jpg',
    '-crop',
    `${Math.round(sx1 - sx0)}x${Math.round(sy1 - sy0)}+${Math.round(sx0)}+${Math.round(sy0)}`,
    '+repage',
    '-filter',
    'Lanczos',
    '-resize',
    `${W}x${H}!`,
    '-depth',
    '8',
    'rgb:-',
  ],
  { maxBuffer: 1 << 24 },
).stdout

type RGB = [number, number, number]
const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const dith = (x: number, y: number, d: number) =>
  (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < d

const out = new Uint8Array(W * H * 3)
const put = (x: number, y: number, c: RGB) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 3
  out[i] = Math.max(0, Math.min(255, Math.round(c[0])))
  out[i + 1] = Math.max(0, Math.min(255, Math.round(c[1])))
  out[i + 2] = Math.max(0, Math.min(255, Math.round(c[2])))
}
const get = (x: number, y: number): RGB => {
  const i = (y * W + x) * 3
  return [out[i], out[i + 1], out[i + 2]]
}

// Land in the colours of a painted map: greens warmed towards olive, dry
// land towards ochre, everything a little richer
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    if (!isLand[y * W + x]) continue
    const i = (y * W + x) * 3
    let c: RGB = [relief[i], relief[i + 1], relief[i + 2]]
    const lum = (c[0] + c[1] + c[2]) / 3
    // satellite water on land (lakes, coasts out of step) reads as green
    if (c[2] > c[1] && c[2] > c[0]) c = [70, 96, 52]
    const dry = c[0] > c[1] ? 1 : 0
    c = mix(c, dry ? [214, 176, 118] : [118, 142, 66], 0.35)
    c = mix(c, [lum * 1.15, lum * 1.05, lum * 0.8], 0.15)
    put(x, y, [c[0] * 1.08, c[1] * 1.04, c[2] * 0.92])
  }

// --- The sea: deeper away from the coast ---

const dist = new Float32Array(W * H).fill(1e9)
const queue: Array<number> = []
for (let i = 0; i < W * H; i++)
  if (isLand[i]) {
    dist[i] = 0
    queue.push(i)
  }
// (the queue grows as it goes; for-of sees what is added)
for (const i of queue) {
  const x = i % W
  const y = Math.floor(i / W)
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
    const j = ny * W + nx
    if (dist[j] > dist[i] + 1) {
      dist[j] = dist[i] + 1
      queue.push(j)
    }
  }
}
const SEA = [
  '#7cc0c8',
  '#4f9cb4',
  '#3a7ea6',
  '#2e6696',
  '#26517f',
  '#1f416c',
].map(hex)
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (isLand[i]) continue
    const d = dist[i]
    const t = Math.min(SEA.length - 1.001, Math.sqrt(Math.max(0, d - 1)) * 1.05)
    const k = Math.floor(t)
    put(x, y, dith(x, y, t - k) ? SEA[k + 1] : SEA[k])
  }
// foam along the coast, and a dark edge to the land
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (!isLand[i] && dist[i] === 1) put(x, y, [214, 236, 230])
    else if (isLand[i]) {
      const coast = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => {
        const nx = x + dx
        const ny = y + dy
        return nx >= 0 && ny >= 0 && nx < W && ny < H && !isLand[ny * W + nx]
      })
      if (coast) put(x, y, mix(get(x, y), [90, 70, 40], 0.45))
    }
  }

// --- Lines on the land ---

function line(
  pts: Array<[number, number]>,
  draw: (x: number, y: number, k: number) => void,
) {
  let k = 0
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = at(...pts[s])
    const [bx, by] = at(...pts[s + 1])
    const n = Math.max(
      1,
      Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 1.5),
    )
    let last = ''
    for (let i = 0; i <= n; i++) {
      const x = Math.floor(ax + ((bx - ax) * i) / n)
      const y = Math.floor(ay + ((by - ay) * i) / n)
      if (`${x},${y}` === last) continue
      last = `${x},${y}`
      draw(x, y, k++)
    }
  }
}

// Rivers, from source towards the sea, as [longitude, latitude]
const RIVERS: Array<Array<[number, number]>> = [
  // the Yellow River, round the Ordos loop
  [
    [98.2, 34.9],
    [100.2, 35.6],
    [101.8, 36.1],
    [103.8, 36.1],
    [104.6, 37.0],
    [105.2, 37.5],
    [106.2, 38.5],
    [106.8, 39.7],
    [107.6, 40.6],
    [109.8, 40.6],
    [111.2, 40.3],
    [111.0, 39.2],
    [110.6, 37.8],
    [110.4, 36.2],
    [110.3, 34.6],
    [112.4, 34.8],
    [113.7, 34.9],
    [115.0, 35.4],
    [116.0, 36.1],
    [117.0, 36.7],
    [118.2, 37.5],
    [119.1, 37.8],
  ],
  // the Wei, past Xi'an into the Yellow River
  [
    [104.6, 34.9],
    [105.7, 34.6],
    [107.1, 34.4],
    [108.9, 34.4],
    [109.6, 34.5],
    [110.3, 34.6],
  ],
  // the Yangtze: the Jinsha down from Tibet, the Three Gorges, Shanghai
  [
    [98.6, 31.2],
    [99.2, 29.0],
    [99.8, 27.4],
    [100.2, 26.8],
    [101.2, 26.5],
    [102.5, 26.4],
    [103.4, 27.1],
    [104.0, 28.0],
    [104.6, 28.8],
    [105.4, 28.9],
    [106.5, 29.6],
    [107.6, 30.2],
    [108.4, 30.8],
    [109.6, 31.0],
    [111.3, 30.7],
    [112.2, 30.3],
    [113.1, 29.4],
    [114.3, 30.6],
    [115.4, 29.9],
    [116.0, 29.7],
    [117.0, 30.5],
    [118.4, 31.3],
    [118.8, 32.1],
    [119.4, 32.2],
    [120.5, 31.9],
    [121.3, 31.7],
    [121.9, 31.3],
  ],
  // the Min, through Chengdu's plain to the Yangtze
  [
    [103.4, 31.6],
    [103.6, 31.0],
    [104.0, 30.3],
    [104.2, 29.6],
    [104.6, 28.8],
  ],
  // the Han, down to Wuhan
  [
    [106.8, 33.1],
    [108.5, 32.7],
    [110.8, 32.6],
    [111.6, 32.1],
    [112.2, 31.2],
    [113.5, 30.7],
    [114.3, 30.6],
  ],
  // the Li past Guilin and Yangshuo, into the Xi and the Pearl
  [
    [110.3, 25.6],
    [110.29, 25.27],
    [110.49, 24.78],
    [110.64, 24.4],
    [111.3, 23.5],
    [112.4, 23.1],
    [113.3, 23.0],
    [113.6, 22.6],
  ],
  // the Huai
  [
    [113.2, 32.4],
    [114.6, 32.4],
    [116.2, 32.6],
    [117.6, 33.0],
    [118.8, 33.4],
    [119.4, 33.9],
  ],
  // the Xiang, north to Dongting lake
  [
    [110.9, 25.7],
    [111.6, 26.4],
    [112.6, 26.9],
    [112.9, 27.9],
    [112.9, 28.6],
    [112.9, 29.1],
  ],
  // the Gan, north to Poyang lake
  [
    [115.0, 25.9],
    [115.0, 27.1],
    [115.6, 28.0],
    [115.9, 28.7],
    [116.1, 29.2],
  ],
]
const RIVER: RGB = [70, 140, 190]
const RIVER_L: RGB = [140, 196, 220]
for (const r of RIVERS)
  line(r, (x, y, k) => {
    if (x >= 0 && y >= 0 && x < W && y < H && isLand[y * W + x])
      put(x, y, k % 5 === 0 ? RIVER_L : RIVER)
  })

// Lakes, as [longitude, latitude, radius in pixels]
const LAKES: Array<[number, number, number]> = [
  [100.2, 36.9, 2.6],
  [113.0, 29.2, 2.2],
  [116.3, 29.1, 2.4],
  [120.2, 31.2, 1.8],
  [118.4, 33.3, 1.4],
]
for (const [lo, la, r] of LAKES) {
  const [cx, cy] = at(lo, la)
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r * 1.3); x <= cx + r * 1.3; x++) {
      const d = ((x - cx) / (r * 1.3)) ** 2 + ((y - cy) / r) ** 2
      if (d <= 1) put(x, y, d > 0.55 ? RIVER : [90, 160, 200])
    }
}

// The Great Wall: the Ming wall from the sea at Shanhaiguan to Jiayuguan
// in the west, with its towers
const WALL: Array<[number, number]> = [
  [119.8, 40.0],
  [119.0, 40.2],
  [118.2, 40.4],
  [117.3, 40.6],
  [116.6, 40.45],
  [116.0, 40.35],
  [115.3, 40.55],
  [114.4, 40.8],
  [113.6, 40.6],
  [112.8, 40.2],
  [112.0, 39.9],
  [111.4, 39.5],
  [110.6, 38.9],
  [109.7, 38.3],
  [108.6, 37.9],
  [107.6, 37.6],
  [106.6, 37.9],
  [106.1, 38.6],
  [105.6, 38.0],
  [104.4, 37.5],
  [103.2, 37.6],
  [102.6, 37.9],
  [101.4, 38.4],
  [100.4, 38.9],
  [99.4, 39.4],
  [98.2, 39.8],
]
line(WALL, (x, y, k) => {
  put(x, y, [92, 62, 44])
  if (k % 3 === 0) put(x, y - 1, [200, 176, 140])
})

// Mountains, as little peaks: [longitude, latitude]
const PEAKS: Array<[number, number]> = [
  [100.6, 30.4],
  [101.6, 31.6],
  [99.8, 32.6],
  [101.2, 33.6],
  [102.2, 29.4],
  [99.6, 28.4],
  [103.3, 29.5],
  [107.4, 33.8],
  [109.0, 33.7],
  [110.2, 34.0],
  [113.5, 37.4],
  [113.0, 35.9],
  [112.4, 38.6],
  [117.1, 36.25],
  [118.2, 30.1],
  [117.6, 27.6],
  [114.0, 25.3],
  [112.0, 25.0],
  [109.0, 28.0],
  [106.6, 35.6],
  [102.8, 35.4],
  [115.8, 41.2],
  [118.2, 41.0],
  [111.2, 31.4],
  [108.6, 31.9],
]
for (const [lo, la] of PEAKS) {
  const [cx, cy] = at(lo, la)
  const x = Math.round(cx)
  const y = Math.round(cy)
  // a peak lit from the left, with snow on the high ones in the west
  const snow = lo < 104
  const rows = snow
    ? ['...W...', '..WWD..', '.LLLDD.', 'LLLDDDD']
    : ['...L...', '..LLD..', '.LLLDD.', 'LLLDDDD']
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === '.') continue
      const px = x - 3 + i
      const py = y - 3 + j
      if (px < 0 || py < 0 || px >= W || py >= H || !isLand[py * W + px])
        continue
      const base = get(px, py)
      put(
        px,
        py,
        ch === 'W'
          ? [246, 244, 236]
          : ch === 'L'
            ? mix(base, [236, 214, 170], 0.5)
            : mix(base, [58, 42, 34], 0.5),
      )
    }
  })
}

// --- Out: the picture, and where things are on it ---

mkdirSync('.cache', { recursive: true })
spawnSync(
  'magick',
  [
    '-size',
    `${W}x${H}`,
    '-depth',
    '8',
    'rgb:-',
    '+dither',
    '-colors',
    '56',
    '-strip',
    '.cache/map-base.png',
  ],
  { input: Buffer.from(out) },
)
if (process.argv.includes('--paint')) {
  // the image tool wants a larger picture to work from
  spawnSync('magick', [
    '.cache/map-base.png',
    '-filter',
    'Lanczos',
    '-resize',
    '960x960',
    '.cache/map-ref.png',
  ])
  spawnSync(
    'node',
    [
      'scripts/image.mjs',
      '--out',
      'public/art/trip/map.png',
      '--shape',
      'square',
      '--pixel',
      `${W}x${H}`,
      '--colors',
      '64',
      '--ref',
      '.cache/map-ref.png',
      PAINT,
    ],
    { stdio: 'inherit' },
  )
}

const CITIES: Record<string, [number, number]> = {
  beijing: [116.4, 39.9],
  qufu: [116.99, 35.6],
  xian: [108.94, 34.34],
  chengdu: [104.07, 30.67],
  guilin: [110.29, 25.27],
  shanghai: [121.47, 31.23],
}
const points = Object.fromEntries(
  Object.entries(CITIES).map(([id, [lo, la]]) => [
    id,
    at(lo, la).map((v) => Math.round(v)),
  ]),
)
writeFileSync(
  'src/app/data/map.ts',
  `// Made by scripts/map.ts; do not edit. The trip's map is
// public/art/trip/map.png, ${W} × ${H}; cities are in its pixels.
export const MAP_W = ${W}
export const MAP_H = ${H}
export const MAP_SRC = '/art/trip/map.png'
export const CITY_AT: Record<string, [number, number] | undefined> = ${JSON.stringify(points)}
`,
)
console.log('map', W, H, points)
