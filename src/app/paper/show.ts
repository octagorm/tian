import { IDLE, TALK, TALK_HAND, actOf } from './acts'
import { partsOf } from './puppets'
import { STAGE_H } from './stage'
import { GROUND, R, S, T, chain, mul, point } from './still'
import type { Act, Sway } from './acts'
import type { PartDef, PuppetDef } from './puppets'
import type { Placing, Staged } from './stage'
import type { M } from './still'

// The show: puppets moved by hand, sixty times a second. Each part of a
// puppet is a layer of its own, turned on its joint with a CSS transform,
// so moving them costs the browser no drawing. The script (stage.ts) says
// where each puppet should be and what it does; the show walks it there,
// turns it round, sways it, makes it talk while its line is heard, and
// pulls it away from the screen (a larger, softer shadow) as it comes and
// goes. With reduced motion everything is put in place at once.

const css = (m: M) =>
  `matrix(${m.map((n) => Math.round(n * 1000) / 1000).join(',')})`

// How far off the screen the puppets wait
const OFF_L = -260
const OFF_R = 1860

const SPEED = { human: 290, beast: 250, flyer: 430, hopper: 300, dragon: 380 }
const STRIDE = { human: 150, beast: 190, flyer: 400, hopper: 200, dragon: 400 }

const smooth = (now: number, to: number, dt: number, tau: number) =>
  tau <= 0 ? to : now + (to - now) * (1 - Math.exp(-dt / tau))
const ease = (u: number) => u * u * (3 - 2 * u)

function swayOf(s: Sway | undefined): [number, number, number, number] {
  if (s === undefined) return [0, 0, 0, 0]
  if (typeof s === 'number') return [s, 0, 0, 0]
  return [s[0], s[1], s[2], s[3] ?? 0]
}

// A joint's angle in a keyed act at `s` seconds, if the keys move it
function keyed(act: Act, joint: string, s: number): number | undefined {
  const keys = act.keys?.filter(([, k]) => joint in k)
  if (!keys?.length) return undefined
  const time = act.loop ? s % act.loop : s
  if (time <= keys[0][0]) return keys[0][1][joint]
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i]
    const [t1, b] = keys[i + 1]
    if (time < t1) {
      const u = (time - t0) / (t1 - t0)
      const e = act.loop && keys.length === 2 ? u : ease(u)
      return a[joint] + (b[joint] - a[joint]) * e
    }
  }
  return keys[keys.length - 1][1][joint]
}

interface Live {
  id: string
  def: PuppetDef
  parts: Array<PartDef>
  box: HTMLElement | null
  els: Map<string, HTMLElement>
  rods: Array<HTMLElement | null>
  target: Placing | null
  leaving: string | null
  shown: boolean
  x: number
  y: number
  // its width as it turns, from 1 (facing right) to -1
  face: number
  facing: 1 | -1
  turning: number
  far: number
  size: number
  alpha: number
  act: string
  actAt: number
  was: string
  wasAt: number
  angles: Map<string, number>
  phase: number
  moving: number
  speaking: boolean
  filter: string
  world: Map<string, M>
  // the mount it sits on, and where its seat is now (it hops on)
  riding?: string
  seat: [number, number] | null
}

export class Show {
  private live = new Map<string, Live>()
  private raf = 0
  private last = 0
  private t = 0
  private running = false

  constructor(
    cast: Array<{ id: string; def: PuppetDef }>,
    private reduced: boolean,
  ) {
    for (const { id, def } of cast)
      this.live.set(id, {
        id,
        def,
        parts: partsOf(def),
        box: null,
        els: new Map(),
        rods: [],
        target: null,
        leaving: null,
        shown: false,
        x: OFF_L,
        y: 0,
        face: 1,
        facing: 1,
        turning: 0,
        far: 0,
        size: 1,
        alpha: 1,
        act: 'stand',
        actAt: 0,
        was: 'stand',
        wasAt: 0,
        angles: new Map(),
        phase: 0,
        moving: 0,
        speaking: false,
        filter: '',
        world: new Map(),
        seat: null,
      })
  }

  // --- The DOM: the layers React made for each puppet ---

  bindBox(id: string, el: HTMLElement | null) {
    const l = this.live.get(id)
    if (l) l.box = el
  }
  bindPart(id: string, part: string, el: HTMLElement | null) {
    const l = this.live.get(id)
    if (!l) return
    if (el) l.els.set(part, el)
    else l.els.delete(part)
  }
  bindRod(id: string, i: number, el: HTMLElement | null) {
    const l = this.live.get(id)
    if (l) l.rods[i] = el
  }

  // --- The script ---

  stage(staged: Staged) {
    const instant = this.reduced
    for (const l of this.live.values()) {
      const p = staged.cast[l.id]
      l.speaking = staged.by === l.id
      if (p) {
        const enter = !l.target && (!l.shown || !!l.leaving)
        l.target = p
        l.leaving = null
        l.parts = partsOf(l.def, p.hold)
        if (p.ride !== l.riding) {
          l.riding = p.ride
          l.seat = null
        }
        if (p.act !== l.act) {
          l.was = l.act
          l.wasAt = l.actAt
          l.act = p.act
          l.actAt = this.t
          // a somersault ends where it began
          for (const j of ['lean', 'propN']) {
            const a = l.angles.get(j)
            if (a !== undefined)
              l.angles.set(j, ((((a + 180) % 360) + 360) % 360) - 180)
          }
        }
        if (enter) this.enter(l, p, instant)
        if (instant) this.settle(l)
      } else if (l.target) {
        l.target = null
        l.leaving = staged.exits[l.id] || 'walk'
        if (instant) l.shown = false
      }
    }
    this.frame(0)
  }

  private enter(l: Live, p: Placing, instant: boolean) {
    l.shown = true
    l.alpha = 1
    l.far = p.far
    l.size = p.size * (l.def.size ?? 1)
    l.y = p.y
    l.x = p.x
    l.turning = 0
    if (!instant && !p.ride) {
      const from = p.from ?? (p.face > 0 ? 'l' : 'r')
      if (from === 'fade') {
        l.far = 1
        l.alpha = 0
      } else if (from === 'up') l.y = p.y + 1100
      else if (from === 'down') l.y = p.y - 700
      else l.x = from === 'l' ? OFF_L : OFF_R
    }
    const dir = Math.sign(p.x - l.x)
    l.facing = dir ? (dir > 0 ? 1 : -1) : p.face
    l.face = l.facing
  }

  // Everything where the script puts it, at once
  private settle(l: Live) {
    const p = l.target
    if (!p) return
    l.x = p.x
    l.y = p.y
    l.far = p.far
    l.size = p.size * (l.def.size ?? 1)
    l.alpha = 1
    l.facing = p.face
    l.face = p.face
    l.turning = 0
    l.shown = true
  }

  // --- Running ---

  start() {
    if (this.running || this.reduced) return
    this.running = true
    this.last = performance.now()
    const tick = (now: number) => {
      if (!this.running) return
      const dt = Math.min(0.05, (now - this.last) / 1000)
      this.last = now
      this.frame(dt)
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private frame(dt: number) {
    this.t += dt
    for (const l of this.live.values()) if (l.shown) this.move(l, dt)
    // mounts before their riders
    const order = [...this.live.values()].sort(
      (a, b) => (a.target?.ride ? 1 : 0) - (b.target?.ride ? 1 : 0),
    )
    for (const l of order) this.draw(l, dt)
  }

  private move(l: Live, dt: number) {
    const p = l.target
    const rig = l.def.rig
    let tx = p?.x ?? l.x
    let ty = p?.y ?? l.y
    let tfar = p?.far ?? l.far
    let talpha = 1
    const how = l.leaving ?? ''
    if (!p) {
      if (how === 'fade') {
        tfar = 1
        talpha = 0
      } else if (how === 'up') ty = l.y + 1400
      else if (how === 'down') ty = -900
      else
        tx = how.endsWith('l')
          ? OFF_L
          : how.endsWith('r')
            ? OFF_R
            : l.facing > 0
              ? OFF_R
              : OFF_L
    }
    // turning round: the puppet is flipped over, narrowing to nothing
    if (l.turning > 0) {
      l.turning = Math.min(1, l.turning + dt / 0.4)
      const from = -l.facing
      l.face = from * Math.cos(Math.PI * l.turning)
      if (l.turning >= 1) {
        l.turning = 0
        l.face = l.facing
      }
    }
    const turn = (to: 1 | -1) => {
      if (l.turning || l.facing === to) return
      l.facing = to
      l.turning = 0.0001
      if (this.reduced) {
        l.turning = 0
        l.face = to
      }
    }
    if (l.riding) {
      const mount = this.live.get(l.riding)
      if (!p && !mount?.shown) {
        l.shown = false
        l.leaving = null
      }
      return
    }
    // walking: it turns to face the way it goes, and slows as it arrives
    const dx = tx - l.x
    if (Math.abs(dx) > 1.5) {
      const dir = dx > 0 ? 1 : -1
      turn(dir)
      if (!l.turning) {
        const speed = SPEED[rig] * (!p && how.startsWith('run') ? 2.2 : 1)
        const step = Math.min(
          Math.abs(dx),
          speed * dt * Math.min(1, 0.3 + Math.abs(dx) / 140),
        )
        l.x += dir * step
        l.phase += (step / STRIDE[rig]) * Math.PI * 2
        l.moving = Math.min(1, l.moving + dt * 5)
      }
    } else {
      l.x = tx
      l.moving = Math.max(0, l.moving - dt * 3)
      if (p) turn(p.face)
    }
    l.y = smooth(l.y, ty, dt, this.reduced ? 0 : 0.75)
    l.far = smooth(l.far, tfar, dt, this.reduced ? 0 : 0.5)
    l.size = smooth(
      l.size,
      p ? p.size * (l.def.size ?? 1) : l.size,
      dt,
      this.reduced ? 0 : 1.8,
    )
    l.alpha = smooth(l.alpha, talpha, dt, this.reduced ? 0 : 0.35)
    if (!p) {
      const gone =
        l.x <= OFF_L + 1 ||
        l.x >= OFF_R - 1 ||
        l.alpha < 0.02 ||
        l.y > 1300 ||
        l.y < -850
      if (gone || this.reduced) {
        l.shown = false
        l.leaving = null
      }
    }
  }

  // The angle of every joint this frame
  private pose(l: Live, dt: number) {
    const rig = l.def.rig
    const act = actOf(rig, l.act)
    const was = actOf(rig, l.was)
    const since = this.t - l.actAt
    const fade = this.reduced ? 1 : Math.min(1, since / 0.5)
    const talking = l.speaking && !this.reduced
    // a puppet that is only standing talks with its hand as well
    const free = talking && l.act === 'stand'
    const out = new Map<string, number>()
    const joints = [
      ...l.parts.map((p) => [p.id, p.rest ?? 0] as const),
      ['lift', 0] as const,
      ['lean', 0] as const,
    ]
    for (const [j, rest] of joints) {
      const key = keyed(act, j, since)
      const pose = free && j in TALK_HAND ? TALK_HAND[j] : act.pose?.[j]
      const [base, amp, hz, ph] = swayOf(pose ?? IDLE[j])
      const target = key ?? (pose !== undefined || j in IDLE ? base : rest)
      const linear = act.loop && act.keys?.length === 2 && key !== undefined
      const now = l.angles.get(j) ?? target
      const angle = smooth(
        now,
        target,
        dt,
        this.reduced || linear ? 0 : key !== undefined ? 0.05 : 0.22,
      )
      l.angles.set(j, angle)
      let value = angle
      if (!this.reduced) {
        const osc = (a: number, f: number, p: number) =>
          a * Math.sin(2 * Math.PI * f * this.t + p)
        value += osc(amp, hz, ph) * fade
        const [, a0, f0, p0] = swayOf(was.pose?.[j] ?? IDLE[j])
        value += osc(a0, f0, p0) * (1 - fade)
        if (talking && j in TALK) {
          const [b1, a1, f1, p1] = swayOf(TALK[j])
          value += b1 + osc(a1, f1, p1)
        }
      }
      out.set(j, value)
    }
    // walking legs, and a bob
    if (!act.still && l.moving > 0 && !this.reduced) {
      const s = Math.sin(l.phase) * l.moving
      const add = (j: string, v: number) => {
        const a = out.get(j)
        if (a !== undefined) out.set(j, a + v)
      }
      if (rig === 'human') {
        add('legN', 24 * s)
        add('legF', -24 * s)
        add('lift', 5 * Math.abs(Math.cos(l.phase)) * l.moving)
        add('sash', 10 * Math.sin(l.phase + 1) * l.moving)
        if (l.act === 'stand') {
          add('armN', -10 * s)
          add('armF', 10 * s)
        }
      } else if (rig === 'beast') {
        add('legFN', 22 * s)
        add('legBF', 22 * s)
        add('legFF', -22 * s)
        add('legBN', -22 * s)
        add('head', 3 * Math.sin(l.phase * 2) * l.moving)
        add('lift', 4 * Math.abs(Math.cos(l.phase)) * l.moving)
      } else if (rig === 'hopper') {
        add('lift', 30 * Math.abs(Math.sin(l.phase)) * l.moving)
      }
    }
    return out
  }

  private draw(l: Live, dt: number) {
    const box = l.box
    if (!box) return
    if (!l.shown) {
      if (box.style.visibility !== 'hidden') box.style.visibility = 'hidden'
      return
    }
    box.style.visibility = ''
    const a = this.pose(l, dt)
    const root = l.parts[0]
    const lift = a.get('lift') ?? 0
    const lean = a.get('lean') ?? 0
    const mount = l.riding ? this.live.get(l.riding) : undefined
    let base: M
    let far = l.far
    if (mount?.shown && mount.def.saddle) {
      const body = mount.world.get(mount.parts[0].id)
      const to = body ? point(body, mount.def.saddle) : ([l.x, GROUND] as const)
      // a hop from where it stood onto the saddle
      if (!l.seat) l.seat = [l.x + root.at[0], GROUND - l.y + root.at[1]]
      l.seat = [
        smooth(l.seat[0], to[0], dt, this.reduced ? 0 : 0.12),
        smooth(l.seat[1], to[1], dt, this.reduced ? 0 : 0.12),
      ]
      const [sx, sy] = l.seat
      l.x = sx
      l.y = GROUND - sy - root.at[1]
      far = mount.far
      l.far = far
      l.facing = mount.facing
      l.face = mount.face
      const k = 1 + 0.4 * far
      base = chain(
        T(sx, sy - lift),
        S(l.size * l.face * k, l.size * k),
        R(lean),
        T(-root.at[0], -root.at[1]),
      )
    } else {
      const h = (l.def.height * l.size) / 2
      const k = 1 + 0.4 * far
      base = chain(
        T(l.x, GROUND - l.y - lift),
        T(0, -h),
        S(k, k),
        T(0, h),
        S(l.size * l.face, l.size),
        T(root.at[0], root.at[1]),
        R(lean),
        T(-root.at[0], -root.at[1]),
      )
    }
    l.world.clear()
    // the turn of each part on the screen, so held staffs can stay upright
    const turn = new Map<string, number>()
    for (const part of l.parts) {
      const parent = part.parent ? l.world.get(part.parent) : base
      if (!parent) continue
      const above = part.parent ? (turn.get(part.parent) ?? 0) : lean
      const own = part.upright ? -above : (a.get(part.id) ?? 0)
      turn.set(part.id, above + own)
      const m = chain(parent, T(part.at[0], part.at[1]), R(own))
      l.world.set(part.id, m)
      const el = l.els.get(part.id)
      if (el)
        el.style.transform = css(
          part.scale
            ? chain(
                m,
                S(part.scale[0], part.scale[1]),
                T(part.box[0], part.box[1]),
              )
            : mul(m, T(part.box[0], part.box[1])),
        )
    }
    // the rods, from where they hold the puppet down past the screen
    l.def.rods.forEach((rod, i) => {
      const el = l.rods[i]
      const m = l.world.get(rod.part)
      if (!el || !m) return
      const [px, py] = point(m, rod.at)
      const ex = px - l.facing * (36 + 30 * i)
      const ey = STAGE_H + 80
      const len = Math.hypot(ex - px, ey - py)
      const deg = (Math.atan2(-(ex - px), ey - py) * 180) / Math.PI
      el.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(${deg.toFixed(2)}deg) scaleY(${(len / 1000).toFixed(4)})`
    })
    // away from the screen the shadow grows soft, grey and faint
    const f =
      far > 0.01
        ? `blur(${(far * 16).toFixed(1)}px) saturate(${(1 - far * 0.9).toFixed(2)}) brightness(${(1 - far * 0.35).toFixed(2)})`
        : 'none'
    if (f !== l.filter) {
      box.style.filter = f
      l.filter = f
    }
    box.style.opacity = (l.alpha * (1 - 0.3 * far)).toFixed(3)
  }
}
