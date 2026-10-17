import { IDLE, actOf } from './acts'
import { partsOf, puppetOf } from './puppets'
import type { PartDef, PuppetDef } from './puppets'
import type { Sway } from './acts'
import type { Staged } from './stage'

// A stage held still, for the paper cuts on the covers: every puppet in
// the pose its act holds (a keyed act at its second key, a bow drawn, an
// axe raised), placed as the script places it, with no motion and no
// shadows. The same joints as the show (show.ts), worked out once.

export type M = readonly [number, number, number, number, number, number]

export const T = (x: number, y: number): M => [1, 0, 0, 1, x, y]
export const S = (x: number, y: number): M => [x, 0, 0, y, 0, 0]
export function R(deg: number): M {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [c, s, -s, c, 0, 0]
}
export function mul(p: M, q: M): M {
  return [
    p[0] * q[0] + p[2] * q[1],
    p[1] * q[0] + p[3] * q[1],
    p[0] * q[2] + p[2] * q[3],
    p[1] * q[2] + p[3] * q[3],
    p[0] * q[4] + p[2] * q[5] + p[4],
    p[1] * q[4] + p[3] * q[5] + p[5],
  ]
}
export const chain = (...ms: Array<M>) => ms.reduce(mul)
export const point = (m: M, [x, y]: readonly [number, number]) =>
  [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]] as const
export const matrix = (m: M) =>
  `matrix(${m.map((n) => Math.round(n * 1000) / 1000).join(' ')})`

export const GROUND = 862

const base = (s: Sway | undefined) =>
  s === undefined ? undefined : typeof s === 'number' ? s : s[0]

// A joint's angle in an act, held still
function stillAngle(def: PuppetDef, act: string, joint: string, rest: number) {
  const a = actOf(def.rig, act)
  const key = a.keys ? a.keys[Math.min(1, a.keys.length - 1)] : undefined
  if (key && joint in key[1]) return key[1][joint]
  return base(a.pose?.[joint]) ?? base(IDLE[joint]) ?? rest
}

export interface StillPart {
  part: PartDef
  // its frame in stage units, and the drawing's own scale on top
  m: M
}

export interface StillPuppet {
  id: string
  def: PuppetDef
  parts: Array<StillPart>
  z: number
}

// Every puppet of a staged scene, posed and placed, in stacking order
export function stillCast(
  cast: Record<string, string>,
  staged: Staged,
): Array<StillPuppet> {
  const worlds = new Map<string, Map<string, M>>()
  const out: Array<StillPuppet> = []
  const ids = Object.keys(cast)
  // mounts before riders
  const order = [...ids].sort(
    (a, b) => (staged.cast[a]?.ride ? 1 : 0) - (staged.cast[b]?.ride ? 1 : 0),
  )
  for (const id of order) {
    const p = staged.cast[id]
    const def = puppetOf(cast[id])
    if (!p || !def) continue
    const parts = partsOf(def, p.hold)
    const root = parts[0]
    const angle = (part: PartDef) =>
      stillAngle(def, p.act, part.id, part.rest ?? 0)
    const lift = stillAngle(def, p.act, 'lift', 0)
    const lean = stillAngle(def, p.act, 'lean', 0)
    const size = p.size * (def.size ?? 1)
    let m0: M
    const mount = p.ride ? worlds.get(p.ride) : undefined
    const mountDef = p.ride ? puppetOf(cast[p.ride]) : undefined
    const mountPlace = p.ride ? staged.cast[p.ride] : undefined
    if (mount && mountDef?.saddle && mountPlace) {
      const body = mount.get(partsOf(mountDef)[0].id)
      const [sx, sy] = body ? point(body, mountDef.saddle) : [p.x, GROUND]
      m0 = chain(
        T(sx, sy - lift),
        S(size * mountPlace.face, size),
        R(lean),
        T(-root.at[0], -root.at[1]),
      )
    } else
      m0 = chain(
        T(p.x, GROUND - p.y - lift),
        S(size * p.face, size),
        T(root.at[0], root.at[1]),
        R(lean),
        T(-root.at[0], -root.at[1]),
      )
    const world = new Map<string, M>()
    const turn = new Map<string, number>()
    const placed: Array<StillPart> = []
    for (const part of parts) {
      const parent = part.parent ? world.get(part.parent) : m0
      if (!parent) continue
      const above = part.parent ? (turn.get(part.parent) ?? 0) : lean
      const own = part.upright ? -above : angle(part)
      turn.set(part.id, above + own)
      const m = chain(parent, T(part.at[0], part.at[1]), R(own))
      world.set(part.id, m)
      placed.push({
        part,
        m: part.scale ? mul(m, S(part.scale[0], part.scale[1])) : m,
      })
    }
    worlds.set(id, world)
    placed.sort((a, b) => a.part.z - b.part.z)
    out.push({
      id,
      def,
      parts: placed,
      z: ids.indexOf(id) + p.z * 10 + (p.ride ? 20 : 0),
    })
  }
  return out.sort((a, b) => a.z - b.z)
}
