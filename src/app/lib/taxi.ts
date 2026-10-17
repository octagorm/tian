import {
  COUNTS,
  FARE_BLOCK,
  FARE_FREE,
  FARE_START,
  NX,
  NY,
  PLACES,
  SAY,
} from '../data/taxi.ts'
import type { Lot, Place, Turn } from '../data/taxi.ts'

// The taxi's town as geometry, and a ride through it: the way a passenger
// would take to a place, told one instruction at a time, each asking for
// a move at the next crossing or two (or the next place passed), as the
// passenger in the back would say it. Pure, so the tests can drive every
// ride; games/taxi.tsx plays it and games/taxiScene.ts draws it.

// --- The town, in its own pixels ---

// A road kerb to kerb, a lane each way; the pavement round each block;
// a lot, square; crossing to crossing
export const STREET = 16
export const WALK = 4
export const LOT = 24
export const PITCH = STREET + 2 * WALK + 2 * LOT
// The taxi keeps this far right of the middle of the road: the middle of
// its lane, between the centre line and the kerb
export const LANE = 4.5
// Where crossing (0, 0) is, with room round the grid for the town beyond
export const ORIGIN = 2 * PITCH
export const WORLD_W = 2 * ORIGIN + (NX - 1) * PITCH
export const WORLD_H = 2 * ORIGIN + (NY - 1) * PITCH

// Along a street, from the crossing it leaves: the two lots on either
// side, where the street meets the next crossing, and where it leaves the
// last one
export const LOT_NEAR = STREET / 2 + WALK + LOT / 2
export const LOT_FAR = PITCH - LOT_NEAR
export const STOP_LINE = PITCH - STREET / 2
export const EXIT = STREET / 2

// Headings: north (up), east, south, west
export type Heading = 0 | 1 | 2 | 3
export const DX = [0, 1, 0, -1] as const
export const DY = [-1, 0, 1, 0] as const

export type Step = 'straight' | 'left' | 'right'
export type Move = Step | 'stop'

export const turned = (h: Heading, m: Step): Heading =>
  (m === 'left' ? (h + 3) % 4 : m === 'right' ? (h + 1) % 4 : h) as Heading

// A street from a crossing, heading one way
export interface Edge {
  i: number
  j: number
  h: Heading
}

export const inGrid = (i: number, j: number) =>
  i >= 0 && j >= 0 && i < NX && j < NY

export const crossingXY = (i: number, j: number) => ({
  x: ORIGIN + i * PITCH,
  y: ORIGIN + j * PITCH,
})

export const ahead = (e: Edge) => ({ i: e.i + DX[e.h], j: e.j + DY[e.h] })

export const sameLot = (a: Lot, b: Lot) =>
  a.bx === b.bx && a.by === b.by && a.q === b.q

// The crossing a lot is at the corner of
export const lotCrossing = (l: Lot) => ({
  i: l.bx + (l.q & 1),
  j: l.by + (l.q >> 1),
})

// The middle of a lot
export function lotXY(l: Lot) {
  const c = crossingXY(l.bx, l.by)
  const x0 = c.x + STREET / 2 + WALK + LOT / 2
  const y0 = c.y + STREET / 2 + WALK + LOT / 2
  return { x: x0 + (l.q & 1 ? LOT : 0), y: y0 + (l.q & 2 ? LOT : 0) }
}

export const placeOn = (l: Lot): Place | undefined =>
  PLACES.find((p) => sameLot(p.lot, l))

export const placeOf = (id: string): Place => {
  const p = PLACES.find((x) => x.id === id)
  if (!p) throw new Error(`No such place: ${id}`)
  return p
}

// The places at a crossing's corners
export const placesAt = (i: number, j: number) =>
  PLACES.filter((p) => {
    const c = lotCrossing(p.lot)
    return c.i === i && c.j === j
  })

// The two lots on the right of a street, in the order they are passed
export function rightLots(e: Edge): Array<{ lot: Lot; d: number }> {
  const b = ahead(e)
  const r = (e.h + 1) % 4
  const bx = Math.min(e.i, b.i, e.i + DX[r])
  const by = Math.min(e.j, b.j, e.j + DY[r])
  const q = (i: number, j: number) => (i - bx + 2 * (j - by)) as Lot['q']
  return [
    { lot: { bx, by, q: q(e.i, e.j) }, d: LOT_NEAR },
    { lot: { bx, by, q: q(b.i, b.j) }, d: LOT_FAR },
  ]
}

// Every street in town, both ways
export const EDGES: Array<Edge> = []
for (let i = 0; i < NX; i++)
  for (let j = 0; j < NY; j++)
    for (const h of [0, 1, 2, 3] as const)
      if (inGrid(i + DX[h], j + DY[h])) EDGES.push({ i, j, h })

// Where a taxi stops for a place: on either street at its corner, with
// the place on the right
export function stopsFor(l: Lot): Array<{ edge: Edge; d: number }> {
  return EDGES.flatMap((edge) =>
    rightLots(edge)
      .filter((r) => sameLot(r.lot, l))
      .map((r) => ({ edge, d: r.d })),
  )
}

// --- A route ---

// Where the taxi is: on a street, so far along it
export interface Spot {
  edge: Edge
  d: number
}

export interface Route {
  // The streets driven, the first from where the taxi stands
  edges: Array<Edge>
  // The move at the end of each street but the last
  moves: Array<Step>
  // Where it starts on the first street, and stops on the last
  d0: number
  dEnd: number
}

const key = (i: number, j: number, h: number) => `${i},${j},${h}`

// The shortest ways from a spot to a place on the right, by the number
// of crossings, with no turning back
export function routes(from: Spot, to: Lot, most = 8): Array<Route> {
  const targets = stopsFor(to)
  const isTarget = (e: Edge) =>
    targets.find(
      (t) => t.edge.i === e.i && t.edge.j === e.j && t.edge.h === e.h,
    )
  for (let depth = 1; depth <= most; depth++) {
    const found: Array<Route> = []
    const walk = (
      edges: Array<Edge>,
      moves: Array<Step>,
      seen: Set<string>,
    ) => {
      const last = edges[edges.length - 1]
      const at = ahead(last)
      for (const m of ['straight', 'left', 'right'] as const) {
        const h = turned(last.h, m)
        if (!inGrid(at.i + DX[h], at.j + DY[h])) continue
        const k = key(at.i, at.j, h)
        if (seen.has(k)) continue
        const e = { i: at.i, j: at.j, h }
        const nextMoves = [...moves, m]
        if (nextMoves.length === depth) {
          const t = isTarget(e)
          if (t)
            found.push({
              edges: [...edges, e],
              moves: nextMoves,
              d0: from.d,
              dEnd: t.d,
            })
          continue
        }
        walk([...edges, e], nextMoves, new Set([...seen, k]))
      }
    }
    walk([from.edge], [], new Set([key(from.edge.i, from.edge.j, from.edge.h)]))
    if (found.length) return found
  }
  return []
}

export const turnsIn = (r: Route) =>
  r.moves.filter((m) => m !== 'straight').length

// Three turns the same way in a row go round a block: the way a driver
// takes to turn back, not one a passenger asks for
export const loops = (r: Route) =>
  /(left){3}|(right){3}/.test(r.moves.filter((m) => m !== 'straight').join(''))

// The fare on the meter for a ride along so many streets
export const fare = (streets: number) =>
  FARE_START + FARE_BLOCK * Math.max(0, streets - FARE_FREE)

// --- What the passenger says ---

export type Kind =
  'turn' | 'ahead' | 'straight' | 'forward' | 'count' | 'at' | 'stop'

// A move asked for: at a crossing, or at a place passed on the right
// while the passenger is looking out for where to stop
export interface Point {
  edge: number
  d: number
  expect: Move
  lot?: Lot
}

export interface Instruction {
  kind: Kind
  line: string
  // The words it turns on: the side, the count, the place
  words: Array<string>
  points: Array<Point>
}

export interface Ride {
  from: Spot
  to: Place
  route: Route
  opener: string
  instructions: Array<Instruction>
  fare: number
}

const SIDE: Record<Turn, string> = { left: '左', right: '右' }

const pick = <T>(xs: Array<[T, number]>, rand: () => number): T => {
  const total = xs.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [x, w] of xs) {
    r -= w
    if (r < 0) return x
  }
  return xs[xs.length - 1][0]
}

// The instructions for a route: turns told one at a time, counted ("at
// the second crossing") or by a place on the corner ("at the bank"), a
// stretch straight on now and then, and at the end where to stop, which
// asks to go on past any other place on the right until it comes
export function instruct(
  route: Route,
  to: Place,
  rand: () => number = Math.random,
): Array<Instruction> {
  const { edges, moves } = route
  const out: Array<Instruction> = []
  const cross = (k: number): Point => ({
    edge: k,
    d: STOP_LINE,
    expect: moves[k],
  })
  const last = lastTurn(route)
  let k = 0
  while (k <= last) {
    let t = k
    while (moves[t] === 'straight') t++
    const side = moves[t] as Turn
    const s = t - k
    const at = ahead(edges[t])
    const corner = placesAt(at.i, at.j).filter((p) => p.id !== to.id)
    const place = corner.length
      ? corner[Math.floor(rand() * corner.length)]
      : undefined
    type Choice = 'turn' | 'ahead' | 'count' | 'at' | 'split'
    const options: Array<[Choice, number]> = []
    if (place) options.push(['at', 3])
    if (s === 0) options.push(['turn', 2], ['ahead', 2])
    else if (s <= 2) options.push(['count', 3], ['split', 2])
    else options.push(['split', place ? 1 : 3])
    const choice = pick(options, rand)
    if (choice === 'split') {
      const forward = rand() < 0.3
      out.push({
        kind: forward ? 'forward' : 'straight',
        line: forward ? SAY.forward : SAY.straight,
        words: [forward ? '前' : '一直'],
        points: [cross(k)],
      })
      k++
      continue
    }
    const points = moves.slice(k, t + 1).map((_, n) => cross(k + n))
    if (choice === 'at' && place)
      out.push({
        kind: 'at',
        line: SAY.at(place.id, side),
        words: [place.id, SIDE[side]],
        points,
      })
    else if (choice === 'count') {
      const n = COUNTS[s - 1]
      out.push({
        kind: 'count',
        line: SAY.count(n, side),
        words: [n, SIDE[side]],
        points,
      })
    } else
      out.push({
        kind: choice === 'ahead' ? 'ahead' : 'turn',
        line: choice === 'ahead' ? SAY.ahead(side) : SAY.turn(side),
        words: [SIDE[side]],
        points,
      })
    k = t + 1
  }

  out.push(lastStretch(route, to, last))
  return out
}

// The last stretch, from the last turn: straight on, past the places on
// the right, to stop in front of the one asked for
function lastStretch(route: Route, to: Place, last: number): Instruction {
  const { edges } = route
  const points: Array<Point> = []
  const cross = (k: number): Point => ({
    edge: k,
    d: STOP_LINE,
    expect: route.moves[k],
  })
  for (let e = last + 1; e < edges.length; e++) {
    const final = e === edges.length - 1
    for (const r of rightLots(edges[e])) {
      if (e === 0 && r.d <= route.d0) continue
      if (final && sameLot(r.lot, to.lot)) {
        points.push({ edge: e, d: r.d, expect: 'stop', lot: r.lot })
        break
      }
      if (placeOn(r.lot))
        points.push({ edge: e, d: r.d, expect: 'straight', lot: r.lot })
    }
    if (!final) points.push(cross(e))
  }
  return {
    kind: 'stop',
    line: SAY.stop(to.id),
    words: [to.id, '停'],
    points,
  }
}

const lastTurn = (r: Route) =>
  r.moves.reduce((t, m, k) => (m === 'straight' ? t : k), -1)

// The next ride from where the taxi stands: a place that is neither here
// nor just visited, two to six crossings away with a turn on the way, by
// the shortest way, with no more turns than it needs and one more, and
// not round a block. Places
// where the end is a choice, with another place to drive past first, come
// up more often.
export function plan(
  from: Spot,
  rand: () => number = Math.random,
  avoid: Array<string> = [],
): Ride {
  const here = rightLots(from.edge)
    .filter((r) => Math.abs(r.d - from.d) < 1)
    .map((r) => placeOn(r.lot)?.id)
  const candidates = PLACES.filter((p) => !here.includes(p.id)).map((p) => ({
    place: p,
    found: routes(from, p.lot),
  }))
  const fits = (c: (typeof candidates)[number], fresh: boolean) =>
    c.found.length > 0 &&
    c.found[0].moves.length >= 2 &&
    c.found[0].moves.length <= 6 &&
    c.found.some((r) => turnsIn(r) > 0 && !loops(r)) &&
    (!fresh || !avoid.includes(c.place.id))
  const pool =
    [
      candidates.filter((c) => fits(c, true)),
      candidates.filter((c) => fits(c, false)),
      candidates.filter((c) => c.found.length > 0),
    ].find((xs) => xs.length) ?? []
  const options = pool.map((c) => {
    const turning = c.found.filter((r) => turnsIn(r) > 0 && !loops(r))
    const ways = turning.length ? turning : c.found
    const fewest = Math.min(...ways.map(turnsIn))
    const fine = ways.filter((r) => turnsIn(r) <= fewest + 1)
    const route = fine[Math.floor(rand() * fine.length)]
    const end = lastStretch(route, c.place, lastTurn(route))
    const choice = end.points.some((p) => p.lot && p.expect !== 'stop')
    return [{ place: c.place, route }, choice ? 3 : 1] as [
      { place: Place; route: Route },
      number,
    ]
  })
  const { place, route } = pick(options, rand)
  return {
    from,
    to: place,
    route,
    opener: SAY.go(place.id),
    instructions: instruct(route, place, rand),
    fare: fare(route.edges.length),
  }
}

// Where the taxi waits for its first passenger: in front of a place
export function spotAt(id: string): Spot {
  const [first] = stopsFor(placeOf(id).lot)
  return { edge: first.edge, d: first.d }
}

// Where a ride ends, for the next to start from
export const endOf = (r: Ride): Spot => ({
  edge: r.route.edges[r.route.edges.length - 1],
  d: r.route.dEnd,
})

// --- Judging a move ---

export type Complaint = 'wrong' | 'early' | 'notHere'

// Whether a move is the one asked for at a point of an instruction, and
// if not, which word was missed and what the passenger says about it
export function judge(
  ins: Instruction,
  at: number,
  move: Move,
): { ok: boolean; missed: Array<string>; complaint: Complaint } {
  const p = ins.points[at]
  if (move === p.expect) return { ok: true, missed: [], complaint: 'wrong' }
  const lastPoint = at === ins.points.length - 1
  const turn = move === 'left' || move === 'right'
  switch (ins.kind) {
    case 'stop':
      return {
        ok: false,
        missed: [ins.words[0]],
        complaint: p.lot && move === 'stop' ? 'notHere' : 'wrong',
      }
    case 'count':
    case 'at':
      if (!lastPoint && turn)
        return { ok: false, missed: [ins.words[0]], complaint: 'early' }
      if (lastPoint && turn)
        return { ok: false, missed: [ins.words[1]], complaint: 'wrong' }
      return { ok: false, missed: [ins.words[0]], complaint: 'wrong' }
    default:
      return { ok: false, missed: ins.words, complaint: 'wrong' }
  }
}

// --- Driving: the path as a line to move along ---

export interface Pose {
  x: number
  y: number
  // Heading in radians, clockwise from north
  a: number
}

interface Piece {
  len: number
  at: (u: number) => Pose
}

const laneXY = (e: Edge, d: number) => {
  const c = crossingXY(e.i, e.j)
  const r = (e.h + 1) % 4
  return {
    x: c.x + DX[e.h] * d + DX[r] * LANE,
    y: c.y + DY[e.h] * d + DY[r] * LANE,
  }
}

const angleOf = (dx: number, dy: number) => Math.atan2(dx, -dy)

function straight(e: Edge, d0: number, d1: number): Piece {
  const a = angleOf(DX[e.h], DY[e.h])
  return {
    len: Math.max(0, d1 - d0),
    at: (u) => ({ ...laneXY(e, d0 + u), a }),
  }
}

// Through a crossing from one street to the next, on a curve whose
// corner is where the two lanes meet
function bend(from: Edge, to: Edge): Piece {
  const p0 = laneXY(from, STOP_LINE)
  const p2 = laneXY(to, EXIT)
  const c = crossingXY(to.i, to.j)
  const r0 = (from.h + 1) % 4
  const r2 = (to.h + 1) % 4
  // where the two lanes cross, each a lane's width right of its street's
  // middle (going straight, the curve is a line)
  const p1 =
    from.h === to.h
      ? { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 }
      : {
          x: c.x + (DX[r0] + DX[r2]) * LANE,
          y: c.y + (DY[r0] + DY[r2]) * LANE,
        }
  const q = (t: number) => ({
    x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
    y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
  })
  const tan = (t: number) => ({
    x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  })
  // its length, and a table from length to t, by sampling
  const N = 24
  const lens = [0]
  for (let n = 1; n <= N; n++) {
    const a = q((n - 1) / N)
    const b = q(n / N)
    lens.push(lens[n - 1] + Math.hypot(b.x - a.x, b.y - a.y))
  }
  const len = lens[N]
  return {
    len,
    at: (u) => {
      const target = Math.max(0, Math.min(len, u))
      let n = 1
      while (n < N && lens[n] < target) n++
      const f = (target - lens[n - 1]) / (lens[n] - lens[n - 1] || 1)
      const t = (n - 1 + f) / N
      const p = q(t)
      const d = tan(t)
      return { ...p, a: angleOf(d.x, d.y) }
    },
  }
}

export interface Path {
  len: number
  at: (s: number) => Pose
  // How far along the path a point of an instruction is
  sOf: (p: { edge: number; d: number }) => number
  // How far along each street starts, for the meter
  starts: Array<number>
}

export function pathOf(route: Route): Path {
  const { edges } = route
  const pieces: Array<Piece> = []
  const starts: Array<number> = []
  let total = 0
  edges.forEach((e, k) => {
    const d0 = k === 0 ? route.d0 : EXIT
    const d1 = k === edges.length - 1 ? route.dEnd : STOP_LINE
    starts.push(total)
    const s = straight(e, d0, d1)
    pieces.push(s)
    total += s.len
    if (k < edges.length - 1) {
      const b = bend(e, edges[k + 1])
      pieces.push(b)
      total += b.len
    }
  })
  return {
    len: total,
    starts,
    at: (s) => {
      let u = Math.max(0, Math.min(total, s))
      for (const p of pieces) {
        if (u <= p.len) return p.at(u)
        u -= p.len
      }
      const last = pieces[pieces.length - 1]
      return last.at(last.len)
    },
    sOf: ({ edge, d }) => starts[edge] + d - (edge === 0 ? route.d0 : EXIT),
  }
}
