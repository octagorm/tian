import type { Look } from '../pixel/Pix'

// Taxi: the town the taxi drives in, who rides in it and everything they
// say. A fixed set of lines, so that each passenger's voice can be
// recorded saying every one (data/extra.ts); lib/taxi.ts picks among
// them as it plans a ride, and games/taxi.tsx plays it.

// The town is a grid of crossings, NX × NY, with blocks between them.
// Each block is split into four lots, one at each corner; a lot touches
// one crossing, and two streets.
export const NX = 5
export const NY = 5

// A lot: block (bx, by), the one between crossings (bx, by) and
// (bx + 1, by + 1), and its corner: 0 north-west, 1 north-east,
// 2 south-west, 3 south-east
export interface Lot {
  bx: number
  by: number
  q: 0 | 1 | 2 | 3
}

// What a building looks like from above (games/taxiScene.ts)
export type Kind =
  | 'bank'
  | 'hotel'
  | 'station'
  | 'park'
  | 'hospital'
  | 'school'
  | 'restaurant'
  | 'supermarket'
  | 'bookshop'
  | 'cinema'

export interface Place {
  // The word in the bank
  id: string
  kind: Kind
  lot: Lot
}

// The places with a name, each once in town. They stand in pairs along a
// street where they can (the bank and the bookshop, the school and the
// hospital), so that stopping in front of one is a choice between two;
// the -店 and -院 words are near each other in sound, for the ear.
export const PLACES: Array<Place> = [
  { id: '银行', kind: 'bank', lot: { bx: 1, by: 1, q: 0 } },
  { id: '书店', kind: 'bookshop', lot: { bx: 1, by: 1, q: 1 } },
  { id: '公园', kind: 'park', lot: { bx: 0, by: 1, q: 1 } },
  { id: '电影院', kind: 'cinema', lot: { bx: 0, by: 1, q: 3 } },
  { id: '学校', kind: 'school', lot: { bx: 3, by: 1, q: 2 } },
  { id: '医院', kind: 'hospital', lot: { bx: 3, by: 1, q: 0 } },
  { id: '超市', kind: 'supermarket', lot: { bx: 2, by: 2, q: 3 } },
  { id: '饭店', kind: 'restaurant', lot: { bx: 2, by: 2, q: 2 } },
  { id: '酒店', kind: 'hotel', lot: { bx: 2, by: 3, q: 2 } },
  { id: '火车站', kind: 'station', lot: { bx: 1, by: 3, q: 3 } },
]

// Where the first passenger of a shift gets in: in front of the station
export const FIRST_STOP = '火车站'

// --- What passengers say ---

export type Turn = 'left' | 'right'
const SIDE: Record<Turn, string> = { left: '左', right: '右' }
export const COUNTS = ['第二', '第三'] as const

// Each kind of thing a passenger says, written word by word (lib/text.ts)
export const SAY = {
  // Getting in: where to
  go: (place: string) => `师傅 ， 去 ${place} 。`,
  // At the next crossing
  turn: (t: Turn) => `往 ${SIDE[t]} 拐 。`,
  ahead: (t: Turn) => `前面=ahead 路口 往 ${SIDE[t]} 拐 。`,
  straight: '一直 走=go 。',
  forward: '往 前 走=go 。',
  // At the second or third crossing
  count: (n: (typeof COUNTS)[number], t: Turn) =>
    `在 ${n} 个 路口 往 ${SIDE[t]} 拐 。`,
  // At the crossing by a place
  at: (place: string, t: Turn) => `到 ${place} 往 ${SIDE[t]} 拐 。`,
  // Where to stop
  stop: (place: string) => `在 ${place} 前面 停 。`,
  // A wrong move
  wrong: ['不 对 ！', '不 对 ， 不 对 ！', '师傅 ， 不 对 ！'],
  // Turning at a crossing before the one meant
  early: '不 是 这个=this 路口 ！',
  // Stopping in front of the wrong place
  notHere: '不 是 这儿 ！',
  // Getting out
  thanks: [
    '到 了 ！ 谢谢 师傅 ！',
    '就 是 这儿 ， 谢谢 ！',
    '好 ， 到 了 。 再见 ！',
  ],
}

// Every line a passenger can say
export const TAXI_LINES: Array<string> = [
  ...PLACES.flatMap((p) => [
    SAY.go(p.id),
    SAY.at(p.id, 'left'),
    SAY.at(p.id, 'right'),
    SAY.stop(p.id),
  ]),
  ...(['left', 'right'] as const).flatMap((t) => [
    SAY.turn(t),
    SAY.ahead(t),
    ...COUNTS.map((n) => SAY.count(n, t)),
  ]),
  SAY.straight,
  SAY.forward,
  ...SAY.wrong,
  SAY.early,
  SAY.notHere,
  ...SAY.thanks,
]

// Who rides, by the voice they speak in (data/voices.ts), and how they
// look: two of them are new to Tian, two are met on the trip
export interface Passenger {
  voice: string
  look: Look
}

export const PASSENGERS: Array<Passenger> = [
  {
    voice: 'Erinome',
    look: {
      style: 'bob',
      coat: '#3d6fa8',
      clothes: 'suit',
      earrings: '#e8b84a',
    },
  },
  {
    voice: 'Iapetus',
    look: { style: 'parted', glasses: true, coat: '#2b3140', clothes: 'suit' },
  },
  {
    voice: 'Gacrux',
    look: { style: 'bun', old: true, coat: '#8a4f9a', expression: 'smile' },
  },
  {
    voice: 'Achird',
    look: {
      style: 'short',
      headwear: 'ballcap',
      hat: '#c8372d',
      coat: '#e07a2a',
    },
  },
]

// A ride's fare, as a Beijing meter has it: thirteen kuai for the first
// stretch, then two for each block after
export const FARE_START = 13
export const FARE_BLOCK = 2
export const FARE_FREE = 2
