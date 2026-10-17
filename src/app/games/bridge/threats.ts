import * as THREE from 'three'
import { STEER } from '../../data/bridge'
import { clamp, disposeTree, easeIn, easeInOut, easeOut } from './kit'
import {
  makeBarrier,
  makeComet,
  makeJunk,
  makeMine,
  makeMissile,
  makeSaucer,
  makeStation,
} from './models'
import type { Fx } from './fx'
import type { Kit } from './kit'
import type { SaucerModel } from './models'
import type { Action, Order } from '../../data/bridge'

// What comes at the ship for each order. The danger appears far ahead and
// closes in as the order's time runs out (`p`, 0 to 1), so that it arrives
// just as time is up. Doing the right thing plays out its answer (the field
// rushes past the gap the ship steered into, the saucer blows up, the
// torpedoes burst on the shield); doing the wrong thing, or nothing, lets it
// strike.
//
// The danger does not give the answer away: an asteroid field has its gap
// where the captain says, but it shows only when close. Two-step orders
// steer first, then meet a second danger where they have steered to.

export const LANE = { x: 3.4, y: 2.4 }
// How far ahead a danger appears
export const FAR = 110
// Past this the camera has left it behind
const BEHIND = 16

export interface Lane {
  x: number
  y: number
}

const DIR: Record<string, Lane> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
}

export type Strike = 'rock' | 'beam' | 'blast' | 'zap' | 'ice'

// What the threats can ask of the scene
export interface Ctx {
  kit: Kit
  fx: Fx
  rocks: Array<THREE.BufferGeometry>
  // The ship's position, and the lane it is in
  ship: () => THREE.Vector3
  lane: () => Lane
  nacelle: (side: number) => THREE.Vector3
  // Strikes the ship there
  hit: (at: THREE.Vector3, kind: Strike) => void
  shieldHit: (at: THREE.Vector3) => void
  // The engines' heat, 0–1
  heat: (h: number) => void
  // How fast space flows past, units a second
  speed: () => number
  time: () => number
}

// Where the ship's lasers go, and what happens when they arrive
export interface Target {
  at: () => THREE.Vector3
  hit: () => void
}

interface Part {
  // The step of the order this part answers to
  step: number
  object: THREE.Object3D
  // p while the order runs; after: seconds since it was settled
  update: (dt: number, p: number, after: number | null) => void
  act?: (a: Action) => void
  aim?: (lane: Lane) => Target | null
  // Where the danger is, for the bracket that marks it while it comes
  focus?: () => THREE.Vector3 | null
  win: () => void
  lose: (strike: boolean) => void
}

const lanePos = (l: Lane, z = 0) =>
  new THREE.Vector3(l.x * LANE.x, l.y * LANE.y, z)

const sameLane = (a: Lane, b: Lane) =>
  Math.round(a.x) === b.x && Math.round(a.y) === b.y

// --- The asteroid field (and its kin: mines, rockets) ---

interface Rock {
  obj: THREE.Object3D
  base: THREE.Vector3
  spin: THREE.Vector3
  cell: Lane | null
  alive: boolean
  blink?: THREE.Sprite
}

class Field implements Part {
  step = 0
  object = new THREE.Group()
  private rocks: Array<Rock> = []
  private z = -FAR
  private mode: 'wait' | 'pass' | 'crash' = 'wait'
  private rush = 0
  private struck = false

  constructor(
    private ctx: Ctx,
    gap: Lane,
    private kind: 'rocks' | 'mines' | 'missiles',
  ) {
    for (let cx = -1; cx <= 1; cx++)
      for (let cy = -1; cy <= 1; cy++) {
        if (cx === gap.x && cy === gap.y) continue
        const jitter = kind === 'missiles' ? 0.15 : 0.35
        this.addRock(
          new THREE.Vector3(
            cx * LANE.x + (Math.random() - 0.5) * jitter,
            cy * LANE.y + (Math.random() - 0.5) * jitter,
            (Math.random() - 0.5) * (kind === 'missiles' ? 6 : 4),
          ),
          { x: cx, y: cy },
          kind === 'missiles' ? 1 : 0.95 + Math.random() * 0.35,
        )
      }
    // More around the edges, so the field has no clear outline
    if (kind !== 'missiles') {
      const n = kind === 'mines' ? 8 : 14
      for (let i = 0; i < n; i++) {
        const side = Math.random() < 0.5 ? -1 : 1
        const pos =
          Math.random() < 0.6
            ? new THREE.Vector3(
                side * (6.5 + Math.random() * 9),
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 24,
              )
            : new THREE.Vector3(
                (Math.random() - 0.5) * 22,
                side * (4.8 + Math.random() * 5),
                (Math.random() - 0.5) * 24,
              )
        this.addRock(pos, null, 0.6 + Math.random() * 1.4)
      }
    }
  }

  private addRock(base: THREE.Vector3, cell: Lane | null, size: number) {
    let obj: THREE.Object3D
    let blink: THREE.Sprite | undefined
    if (this.kind === 'mines') {
      const m = makeMine(this.ctx.kit)
      obj = m.group
      blink = m.light
      obj.scale.setScalar(size * 1.15)
    } else if (this.kind === 'missiles') {
      obj = makeMissile(this.ctx.kit)
      obj.scale.setScalar(1.7)
    } else {
      const geo =
        this.ctx.rocks[Math.floor(Math.random() * this.ctx.rocks.length)]
      obj = new THREE.Mesh(
        geo,
        this.ctx.kit.lit('#ffffff', { vertexColors: true }),
      )
      obj.scale.set(size * 1.05, size * 0.8, size * 0.95)
    }
    obj.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
    if (this.kind === 'missiles') obj.rotation.set(0, 0, Math.random() * 6)
    this.object.add(obj)
    this.rocks.push({
      obj,
      base,
      cell,
      alive: true,
      blink,
      spin:
        this.kind === 'missiles'
          ? new THREE.Vector3(0, 0, 2 + Math.random() * 2)
          : new THREE.Vector3(
              Math.random() - 0.5,
              Math.random() - 0.5,
              Math.random() - 0.5,
            ).multiplyScalar(1.2),
    })
  }

  update(dt: number, p: number) {
    if (this.mode === 'wait') this.z = -FAR * (1 - p)
    else this.z += this.rush * dt
    if (this.mode === 'crash' && !this.struck && this.z >= -1.8) {
      this.struck = true
      const lane = this.ctx.lane()
      const rock = this.rocks.find(
        (r) => r.alive && r.cell && sameLane(lane, r.cell),
      )
      const at = this.ctx.ship().add(new THREE.Vector3(0, 0.3, -2.2))
      if (rock) {
        rock.alive = false
        rock.obj.visible = false
        this.ctx.fx.debris(
          at,
          this.kind === 'mines'
            ? ['#3a3f4a', '#9aa0ab']
            : this.kind === 'missiles'
              ? ['#e8e6e0', '#c8372d']
              : ['#7d6e64', '#5f5b66', '#8a6a4e'],
          10,
          1.4,
        )
      }
      this.ctx.hit(at, this.kind === 'rocks' ? 'rock' : 'blast')
      this.rush = Math.max(this.ctx.speed(), 30)
    }
    const t = this.ctx.time()
    for (const r of this.rocks) {
      if (!r.alive) continue
      r.obj.position.set(r.base.x, r.base.y, this.z + r.base.z)
      r.obj.rotation.x += r.spin.x * dt
      r.obj.rotation.y += r.spin.y * dt
      r.obj.rotation.z += r.spin.z * dt
      if (r.blink) r.blink.visible = Math.sin(t * 9 + r.base.x) > 0
    }
  }

  focus() {
    return this.mode === 'wait' ? new THREE.Vector3(0, 0, this.z) : null
  }

  aim(lane: Lane): Target | null {
    const rock = this.rocks.find(
      (r) => r.alive && r.cell && sameLane(lane, r.cell),
    )
    if (!rock) return null
    return {
      at: () => rock.obj.position.clone(),
      // Lasers only chip the rocks: they are too big to shoot away
      hit: () =>
        this.ctx.fx.sparks(rock.obj.position.clone(), '#ffb070', 14, 6, 0.4),
    }
  }

  win() {
    this.mode = 'pass'
    this.rush = Math.max(this.ctx.speed(), (BEHIND + 6 - this.z) / 1.1)
  }

  lose(strike: boolean) {
    this.mode = strike ? 'crash' : 'pass'
    this.rush = strike
      ? Math.max(this.ctx.speed(), -this.z / 0.55)
      : Math.max(this.ctx.speed(), (BEHIND + 6 - this.z) / 1.1)
  }
}

// --- An alien saucer, charging its weapon ---

class Saucer implements Part {
  object: THREE.Object3D
  private model: SaucerModel
  private doomed = false
  private gone = false
  private mode: 'wait' | 'lunge' | 'attack' | 'leave' = 'wait'
  private t = 0
  private pos = new THREE.Vector3()
  private from = new THREE.Vector3()

  constructor(
    private ctx: Ctx,
    public step: number,
    private lane: Lane,
    private behind: number,
  ) {
    this.model = makeSaucer(ctx.kit)
    this.object = this.model.group
    this.object.scale.setScalar(1.15)
  }

  update(dt: number, p: number) {
    this.t += dt
    const time = this.ctx.time()
    if (this.gone) return
    if (this.mode === 'wait') {
      this.pos.set(
        this.lane.x * LANE.x + Math.sin(time * 1.3) * 0.35,
        this.lane.y * LANE.y + 0.3 + Math.sin(time * 2.1) * 0.15,
        -FAR * (1 - p) - this.behind,
      )
      // Charging: the glow beneath brightens
      this.model.under.material.opacity = 0.15 + p * 0.85
      this.model.under.scale.setScalar(
        1.4 + p * 1.6 + Math.sin(time * 20) * 0.15 * p,
      )
    } else if (this.mode === 'lunge') {
      // Closer, quickly, to be shot where it can be seen
      const k = easeOut(this.t / 0.35)
      this.pos.lerpVectors(
        this.from,
        new THREE.Vector3(this.from.x, this.from.y, Math.max(this.from.z, -26)),
        k,
      )
      if (this.t > 0.9) this.explode()
    } else if (this.mode === 'attack') {
      this.model.under.material.opacity = 1
      this.model.under.scale.setScalar(3.4 + Math.sin(time * 30) * 0.4)
      const k = easeOut(this.t / 0.3)
      this.pos.lerpVectors(
        this.from,
        new THREE.Vector3(this.from.x, this.from.y, Math.max(this.from.z, -9)),
        k,
      )
      if (this.t > 0.3 && this.t - dt <= 0.3) {
        this.ctx.fx.beam(
          () => this.object.position.clone().add(new THREE.Vector3(0, -0.3, 0)),
          () => this.ctx.ship().add(new THREE.Vector3(0, 0.3, -1)),
          '#5dff9a',
          0.45,
          0.16,
        )
      }
      if (this.t > 0.42 && this.t - dt <= 0.42)
        this.ctx.hit(this.ctx.ship().add(new THREE.Vector3(0, 0.4, -1)), 'beam')
      if (this.t > 0.8) {
        this.mode = 'leave'
        this.t = 0
        this.from.copy(this.pos)
      }
    } else {
      // Off up and over, out of sight
      this.pos.set(
        this.from.x,
        this.from.y + easeIn(this.t / 1.2) * 14,
        this.from.z + this.t * 30,
      )
      this.model.under.material.opacity *= 1 - dt * 3
    }
    this.object.position.copy(this.pos)
    this.object.rotation.y += dt * 2.4
    this.object.rotation.z = Math.sin(time * 1.7) * 0.12
  }

  act(a: Action) {
    if (a === 'fire') this.doomed = true
  }

  focus() {
    return this.mode === 'wait' && !this.gone ? this.pos : null
  }

  aim(lane: Lane): Target | null {
    if (this.gone || !sameLane(lane, this.lane)) return null
    return {
      at: () => this.object.position.clone(),
      hit: () => {
        if (this.doomed) this.explode()
        else
          this.ctx.fx.sparks(
            this.object.position.clone(),
            '#7dffc0',
            12,
            5,
            0.4,
          )
      },
    }
  }

  private explode() {
    if (this.gone) return
    this.gone = true
    this.object.visible = false
    this.ctx.fx.explode(this.object.position.clone(), {
      size: 1.3,
      debris: ['#6c4bb0', '#3a2a66', '#7dffc0', '#ffe066'],
      n: 16,
      fire: ['#e8fff0', '#7dffc0', '#3fbf7a'],
    })
    this.ctx.fx.explode(this.object.position.clone(), { size: 0.9 })
  }

  win() {
    if (this.gone) return
    if (this.doomed) {
      this.mode = 'lunge'
      this.t = 0
      this.from.copy(this.pos)
    } else this.lose(false)
  }

  lose(strike: boolean) {
    if (this.gone) return
    this.mode = strike ? 'attack' : 'leave'
    this.t = 0
    this.from.copy(this.pos)
  }
}

// --- Plasma torpedoes, homing in from all sides ---

interface Torpedo {
  start: THREE.Vector3
  bend: THREE.Vector3
  obj: THREE.Group
  core: THREE.Sprite
  trail: Array<THREE.Sprite>
  alive: boolean
  pos: THREE.Vector3
}

class Torpedoes implements Part {
  object = new THREE.Group()
  private list: Array<Torpedo> = []
  private mode: 'wait' | 'burst' | 'strike' | 'fizzle' = 'wait'
  private t = 0
  private speeds: Array<number> = []
  private struck = false

  constructor(
    private ctx: Ctx,
    public step: number,
    private lane: Lane,
    n: number,
  ) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6
      const r = 9 + Math.random() * 5
      const start = new THREE.Vector3(
        Math.cos(a) * r + lane.x * LANE.x,
        Math.sin(a) * r * 0.6 + lane.y * LANE.y,
        -FAR - Math.random() * 10,
      )
      const bend = new THREE.Vector3(
        -Math.sin(a),
        Math.cos(a),
        0,
      ).multiplyScalar(4 + Math.random() * 4)
      const obj = new THREE.Group()
      const core = ctx.kit.sprite('#ffd6f6', 1.3)
      const halo = ctx.kit.sprite('#ff4fd8', 4, { opacity: 0.85 })
      obj.add(halo, core)
      const trail = [0.7, 0.45, 0.25].map((o) => {
        const s = ctx.kit.sprite('#ff4fd8', 2.4, { opacity: o })
        this.object.add(s)
        return s
      })
      this.object.add(obj)
      this.list.push({
        start,
        bend,
        obj,
        core,
        trail,
        alive: true,
        pos: start.clone(),
      })
    }
  }

  private target(i: number) {
    return lanePos(this.lane, -0.3).add(
      new THREE.Vector3(
        Math.cos(i * 2.1) * 0.5,
        Math.sin(i * 2.1) * 0.35 + 0.2,
        0,
      ),
    )
  }

  update(dt: number, p: number) {
    this.t += dt
    const time = this.ctx.time()
    this.list.forEach((tp, i) => {
      if (!tp.alive) return
      const prev = tp.pos.clone()
      if (this.mode === 'wait') {
        const k = easeIn(p) * 0.65 + p * 0.35
        tp.pos
          .lerpVectors(tp.start, this.target(i), k)
          .addScaledVector(tp.bend, Math.sin(Math.PI * k))
      } else if (this.mode === 'fizzle') {
        tp.obj.scale.setScalar(Math.max(0, 1 - this.t / 0.4))
        tp.pos.z += this.ctx.speed() * dt
        if (this.t > 0.4) tp.alive = false
      } else {
        // Straight for the ship
        const ship = this.ctx.ship().add(new THREE.Vector3(0, 0.2, -0.3))
        const d = ship.clone().sub(tp.pos)
        const dist = d.length()
        tp.pos.addScaledVector(
          d.normalize(),
          Math.min(dist, this.speeds[i] * dt),
        )
        const reach = this.mode === 'burst' ? 2.3 : 0.9
        if (dist < reach) {
          tp.alive = false
          if (this.mode === 'burst') {
            this.ctx.shieldHit(tp.pos.clone())
            this.ctx.fx.flash(tp.pos.clone(), '#ff8af0', 3, 0.35)
            this.ctx.fx.sparks(tp.pos.clone(), '#ffb0f0', 10, 5, 0.35)
          } else if (!this.struck) {
            this.struck = true
            this.ctx.hit(tp.pos.clone(), 'blast')
          } else this.ctx.fx.flash(tp.pos.clone(), '#ff8af0', 3, 0.35)
        }
      }
      tp.obj.position.copy(tp.pos)
      tp.core.scale.setScalar(1.2 + Math.sin(time * 25 + i) * 0.3)
      // The trail follows a little behind
      tp.trail.forEach((s, j) => {
        s.position.lerpVectors(tp.pos, prev, (j + 1) * 1.6).z -= (j + 1) * 0.7
      })
      tp.trail.forEach((s) => (s.visible = tp.alive))
      tp.obj.visible = tp.alive
    })
  }

  private rushIn() {
    const ship = this.ctx.ship()
    this.speeds = this.list.map((tp) =>
      Math.max(40, tp.pos.distanceTo(ship) / 0.45),
    )
  }

  focus() {
    if (this.mode !== 'wait') return null
    const c = new THREE.Vector3()
    for (const tp of this.list) c.add(tp.pos)
    return c.divideScalar(this.list.length)
  }

  win() {
    this.mode = 'burst'
    this.rushIn()
  }

  lose(strike: boolean) {
    this.t = 0
    this.mode = strike ? 'strike' : 'fizzle'
    if (strike) this.rushIn()
  }
}

// --- A swarm of saucers closing in from the sides ---

class Swarm implements Part {
  object = new THREE.Group()
  private ships: Array<{
    m: SaucerModel
    start: THREE.Vector3
    pos: THREE.Vector3
  }> = []
  private mode: 'wait' | 'flee' | 'attack' = 'wait'
  private t = 0
  private from: Array<THREE.Vector3> = []

  constructor(
    private ctx: Ctx,
    public step: number,
    private lane: Lane,
    n: number,
  ) {
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1
      const m = makeSaucer(ctx.kit)
      m.group.scale.setScalar(0.95)
      const start = new THREE.Vector3(
        side * (10 + Math.random() * 7),
        (Math.random() - 0.3) * 9,
        -FAR * 0.8 - Math.random() * 25,
      )
      this.object.add(m.group)
      this.ships.push({ m, start, pos: start.clone() })
    }
  }

  update(dt: number, p: number) {
    this.t += dt
    const time = this.ctx.time()
    const goal = lanePos(this.lane, -1.5)
    this.ships.forEach((s, i) => {
      if (this.mode === 'wait') {
        const k = Math.pow(p, 1.25)
        const ring = new THREE.Vector3(
          Math.cos(i * 2.4),
          Math.sin(i * 2.4) * 0.7,
          0,
        ).multiplyScalar(2.6 * (1 - k) + 1.2)
        s.pos.lerpVectors(s.start, goal.clone().add(ring), k)
        s.pos.y += Math.sin(time * 2 + i) * 0.3
        s.m.under.material.opacity = 0.2 + p * 0.6
      } else if (this.mode === 'flee') {
        // Left behind: they shoot past on either side
        const from = this.from[i]
        const out = new THREE.Vector3(
          from.x + Math.sign(from.x - goal.x || 1) * 6,
          from.y + 2.5,
          BEHIND + 14,
        )
        s.pos.lerpVectors(from, out, easeIn(this.t / 1.0))
      } else {
        s.m.under.material.opacity = 1
        const k = easeOut(this.t / 0.3)
        const near = goal
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(i * 2.4) * 5,
              Math.sin(i * 2.4) * 3 + 1,
              -4,
            ),
          )
        s.pos.lerpVectors(this.from[i], near, k)
        if (this.t > 0.3 && this.t - dt <= 0.3)
          this.ctx.fx.beam(
            () => s.m.group.position.clone(),
            () => this.ctx.ship().add(new THREE.Vector3(0, 0.3, -0.8)),
            '#5dff9a',
            0.4,
            0.12,
          )
        if (i === 0 && this.t > 0.4 && this.t - dt <= 0.4)
          this.ctx.hit(
            this.ctx.ship().add(new THREE.Vector3(0, 0.4, -0.8)),
            'beam',
          )
        if (this.t > 0.8) {
          s.pos.z += 30 * dt
          s.pos.y += 8 * dt
        }
      }
      s.m.group.position.copy(s.pos)
      s.m.group.rotation.y += dt * 2.6
      s.m.group.rotation.z =
        Math.sin(time * 1.5 + i) * 0.2 + (s.pos.x - goal.x) * -0.02
    })
  }

  focus() {
    if (this.mode !== 'wait') return null
    const c = new THREE.Vector3()
    for (const s of this.ships) c.add(s.pos)
    return c.divideScalar(this.ships.length)
  }

  win() {
    this.mode = 'flee'
    this.t = 0
    this.from = this.ships.map((s) => s.pos.clone())
  }

  lose(strike: boolean) {
    this.mode = strike ? 'attack' : 'flee'
    this.t = 0
    this.from = this.ships.map((s) => s.pos.clone())
  }
}

// --- A comet, crossing the ship's path ---

class Comet implements Part {
  object: THREE.Object3D
  private mode: 'wait' | 'cross' | 'strike' = 'wait'
  private t = 0
  private from = new THREE.Vector3()
  private pos = new THREE.Vector3()
  private struck = false

  constructor(
    private ctx: Ctx,
    public step: number,
  ) {
    this.object = makeComet(ctx.kit)
    // Its tail streams out behind it, along −x, as it crosses
    this.object.rotation.z = -0.08
  }

  update(dt: number, p: number) {
    this.t += dt
    if (this.mode === 'wait') {
      // Crossing from the left toward the point the ship is making for
      const q = 1 - p
      this.pos.set(-58 * q, 6 * q + 0.4, -46 * q - 1)
    } else if (this.mode === 'cross') {
      // Slowed down, the ship lets it go by in front
      const k = this.t / 1.7
      this.pos.set(
        this.from.x + (52 - this.from.x) * easeInOut(k),
        this.from.y + (-1.5 - this.from.y) * k,
        this.from.z + (-17 - this.from.z) * easeOut(k),
      )
    } else {
      const k = easeIn(this.t / 0.4)
      this.pos.lerpVectors(
        this.from,
        this.ctx.ship().add(new THREE.Vector3(0, 0.3, -1.5)),
        Math.min(1, k),
      )
      if (k >= 1 && !this.struck) {
        this.struck = true
        this.object.visible = false
        const at = this.pos.clone()
        this.ctx.fx.explode(at, {
          size: 1.6,
          debris: ['#d6e8f4', '#a8c6dc', '#eef7ff'],
          n: 14,
          fire: ['#ffffff', '#9fe6ff', '#4fb8ff'],
        })
        this.ctx.hit(at, 'ice')
      }
    }
    this.object.position.copy(this.pos)
    this.object.children[0].rotation.y += dt * 0.8
  }

  focus() {
    return this.mode === 'wait' ? this.pos : null
  }

  win() {
    this.mode = 'cross'
    this.t = 0
    this.from.copy(this.pos)
  }

  lose(strike: boolean) {
    this.t = 0
    this.from.copy(this.pos)
    this.mode = strike ? 'strike' : 'cross'
  }
}

// --- The engines overheating ---

class Overheat implements Part {
  object = new THREE.Group()
  private mode: 'wait' | 'cool' | 'blow' = 'wait'
  private t = 0
  private heat = 0
  private from = 0
  private puff = 0

  constructor(
    private ctx: Ctx,
    public step: number,
  ) {}

  update(dt: number, p: number) {
    this.t += dt
    this.puff -= dt
    if (this.mode === 'wait') {
      this.heat = Math.pow(p, 0.85)
      if (this.heat > 0.22 && this.puff <= 0) {
        this.puff = 0.3 - this.heat * 0.22
        const side = Math.random() < 0.5 ? -1 : 1
        this.ctx.fx.sparks(this.ctx.nacelle(side), '#ffb040', 8, 3.5, 0.4)
        if (this.heat > 0.45)
          this.ctx.fx.puff(this.ctx.nacelle(side), '#3a3434', 1.3, 0.9)
      }
    } else if (this.mode === 'cool') {
      this.heat = this.from * (1 - easeOut(this.t / 0.9))
      if (this.puff <= 0 && this.t < 0.8) {
        this.puff = 0.12
        const side = Math.random() < 0.5 ? -1 : 1
        this.ctx.fx.puff(this.ctx.nacelle(side), '#e8f4ff', 1.3, 0.9, true)
      }
    } else this.heat = this.from * (1 - easeOut(this.t / 0.6))
    this.ctx.heat(this.heat)
  }

  win() {
    this.mode = 'cool'
    this.t = 0
    this.from = this.heat
  }

  lose(strike: boolean) {
    this.t = 0
    this.from = this.heat
    this.mode = 'blow'
    if (strike) {
      const at = this.ctx.nacelle(Math.random() < 0.5 ? -1 : 1)
      this.ctx.fx.explode(at, {
        size: 0.8,
        debris: ['#e4e1da', '#8e929c'],
        n: 8,
      })
      this.ctx.hit(at, 'blast')
    }
  }
}

// --- A barrier of energy across the way, or a space station to stop at ---

class Barrier implements Part {
  object: THREE.Object3D
  private curtain: THREE.ShaderMaterial
  private mode: 'wait' | 'brake' | 'crash' = 'wait'
  private t = 0
  private z = -FAR
  private from = 0
  private struck = false

  constructor(
    private ctx: Ctx,
    public step: number,
  ) {
    const b = makeBarrier(ctx.kit, 19, 10.5)
    this.object = b.group
    this.curtain = b.curtain
  }

  update(dt: number, p: number) {
    this.t += dt
    this.curtain.uniforms.uTime.value = this.ctx.time()
    let alpha = 1
    if (this.mode === 'wait') this.z = -FAR * (1 - p) - 1
    else if (this.mode === 'brake') {
      // The ship brakes to a halt before it; it powers down; the ship goes on
      if (this.t < 0.9)
        this.z = this.from + (-12 - this.from) * easeOut(this.t / 0.9)
      else if (this.t < 1.8) {
        const k = (this.t - 1.3) / 0.5
        alpha = k < 0 ? 1 : Math.max(0, 1 - k) * (Math.random() < 0.3 ? 0.2 : 1)
      } else {
        alpha = 0
        this.z += Math.max(this.ctx.speed(), 14) * dt
      }
    } else {
      const k = easeIn(this.t / 0.45)
      this.z = this.from + (-2.2 - this.from) * Math.min(1, k)
      if (k >= 1 && !this.struck) {
        this.struck = true
        const at = this.ctx.ship().add(new THREE.Vector3(0, 0.3, -2.2))
        this.ctx.fx.sparks(at, '#9ff0ff', 40, 9, 0.6)
        this.ctx.hit(at, 'zap')
      }
      if (this.t > 0.6) {
        alpha =
          Math.max(0, 1 - (this.t - 0.6) / 0.4) *
          (Math.random() < 0.4 ? 0.2 : 1)
        this.z += Math.max(this.ctx.speed(), 14) * dt
      }
    }
    this.curtain.uniforms.uAlpha.value = alpha
    this.object.position.set(0, 0, this.z)
  }

  focus() {
    return this.mode === 'wait' ? new THREE.Vector3(0, 0, this.z) : null
  }

  win() {
    this.mode = 'brake'
    this.t = 0
    this.from = this.z
  }

  lose(strike: boolean) {
    this.t = 0
    this.from = this.z
    if (strike) this.mode = 'crash'
    else this.win()
  }
}

class Station implements Part {
  object: THREE.Object3D
  private ring: THREE.Object3D
  private port: THREE.MeshBasicMaterial
  private mode: 'wait' | 'dock' | 'crash' = 'wait'
  private t = 0
  private z = -FAR
  private y = 0
  private from = 0
  private struck = false

  constructor(
    private ctx: Ctx,
    public step: number,
    // At a planet the ship stays docked until it warps away
    private stay: boolean,
  ) {
    const s = makeStation(ctx.kit)
    this.object = s.group
    this.ring = s.ring
    this.port = s.port
    this.object.rotation.z = Math.random() * 0.4 - 0.2
  }

  update(dt: number, p: number) {
    this.t += dt
    this.ring.rotation.z += dt * 0.25
    if (this.mode === 'wait') this.z = -FAR * (1 - p) - 6
    else if (this.mode === 'dock') {
      if (this.t < 1.0)
        this.z = this.from + (-16 - this.from) * easeOut(this.t / 1.0)
      if (this.t > 0.7) this.port.color.set('#40ff70')
      if (!this.stay && this.t > 1.6) {
        // On it goes, passing under the station
        const k = this.t - 1.6
        this.y = easeIn(k / 1.4) * 15
        this.z += Math.max(this.ctx.speed(), 16) * dt
      }
    } else {
      if (!this.struck) {
        const k = easeIn(this.t / 0.45)
        this.z = this.from + (-4.3 - this.from) * Math.min(1, k)
        if (k >= 1) {
          this.struck = true
          this.t = 0
          this.from = this.z
          const at = this.ctx.ship().add(new THREE.Vector3(0, 0.3, -2.3))
          this.ctx.fx.explode(at, {
            size: 1,
            debris: ['#c9c6bf', '#8a8880'],
            n: 8,
          })
          this.ctx.hit(at, 'blast')
        }
      } else {
        // Knocked back, and then as after docking
        this.z = this.from + (-16 - this.from) * easeOut(this.t / 1.2)
        if (!this.stay && this.t > 1.2) {
          const k = this.t - 1.2
          this.y = easeIn(k / 1.4) * 15
          this.z += Math.max(this.ctx.speed(), 16) * dt * k
        }
      }
    }
    this.object.position.set(0, this.y, this.z)
  }

  focus() {
    return this.mode === 'wait' ? new THREE.Vector3(0, 0, this.z + 2) : null
  }

  win() {
    this.mode = 'dock'
    this.t = 0
    this.from = this.z
  }

  lose(strike: boolean) {
    this.t = 0
    this.from = this.z
    if (strike) this.mode = 'crash'
    else this.win()
  }
}

// --- A friendly ship, passing: not to be fired upon ---

class Friend implements Part {
  object: THREE.Object3D
  step = -1
  private mode: 'wait' | 'pass' | 'warn' = 'wait'
  private t = 0
  private z = -FAR
  private side: number
  private shot = false

  constructor(private ctx: Ctx) {
    this.object = makeJunk(ctx.kit)
    this.side = Math.random() < 0.5 ? -1 : 1
    this.object.scale.setScalar(1.8)
  }

  update(dt: number, p: number) {
    this.t += dt
    const time = this.ctx.time()
    if (this.mode === 'wait') this.z = -FAR * (1 - p) + 1
    else this.z += Math.max(this.ctx.speed(), 18) * dt
    if (this.mode === 'warn' && this.t > 0.25 && this.t - dt <= 0.25) {
      this.ctx.fx.beam(
        () => this.object.position.clone().add(new THREE.Vector3(0, 0.6, 1.4)),
        () => this.ctx.ship().add(new THREE.Vector3(0, 0.3, -0.5)),
        '#ffb04a',
        0.35,
        0.12,
      )
    }
    if (this.mode === 'warn' && this.t > 0.35 && this.t - dt <= 0.35)
      this.ctx.hit(this.ctx.ship().add(new THREE.Vector3(0, 0.4, -0.6)), 'beam')
    this.object.position.set(
      this.side * LANE.x * 1.75,
      0.4 + Math.sin(time * 1.4) * 0.2,
      this.z,
    )
    this.object.rotation.z = Math.sin(time * 1.1) * 0.08 - this.side * 0.12
  }

  focus() {
    return this.mode === 'wait' ? this.object.position : null
  }

  aim(): Target {
    return {
      at: () => this.object.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
      // Its shield takes the shots
      hit: () => {
        this.shot = true
        const at = this.object.position
          .clone()
          .add(new THREE.Vector3(0, 0.6, 1.2))
        this.ctx.fx.flash(at, '#ffd27a', 5, 0.4)
        this.ctx.fx.sparks(at, '#ffd27a', 14, 6, 0.4)
      },
    }
  }

  win() {
    this.mode = 'pass'
    this.t = 0
    // A greeting as it goes by
    for (let i = 0; i < 3; i++)
      this.ctx.fx.flash(
        this.object.position.clone().add(new THREE.Vector3(0, 0.45, 1.35)),
        '#ffd27a',
        2.2 + i,
        0.5 + i * 0.25,
      )
  }

  lose(strike: boolean) {
    this.t = 0
    this.mode = strike || this.shot ? 'warn' : 'pass'
  }
}

// --- An order's danger, made of a part for each step ---

function partFor(
  ctx: Ctx,
  a: Action,
  step: number,
  lane: Lane,
  order: Order,
  behind: number,
): Part {
  const many = order.zh.includes('很 多')
  if (a === 'fire') return new Saucer(ctx, step, lane, behind)
  if (a === 'shield') return new Torpedoes(ctx, step, lane, 4)
  if (a === 'fast') return new Swarm(ctx, step, lane, many ? 5 : 3)
  if (a === 'slow')
    return order.zh.includes('引擎')
      ? new Overheat(ctx, step)
      : new Comet(ctx, step)
  if (a === 'stop')
    return order.arrival || order.zh.includes('到')
      ? new Station(ctx, step, !!order.arrival)
      : new Barrier(ctx, step)
  // A steer on its own
  return new Field(ctx, DIR[a], 'rocks')
}

export class Threat {
  readonly group = new THREE.Group()
  private parts: Array<Part> = []
  // A bracket on each danger while it comes, as on a targeting screen
  private marks: Array<{ part: Part; sprite: THREE.Sprite }> = []
  private done = 0
  private after: number | null = null

  constructor(
    private ctx: Ctx,
    readonly order: Order,
  ) {
    const first = order.do[0]
    if (order.not || order.do.length === 0) this.parts.push(new Friend(ctx))
    else if (STEER.includes(first)) {
      const kind = order.zh.includes('火箭')
        ? 'missiles'
        : order.zh.includes('危险')
          ? 'mines'
          : 'rocks'
      this.parts.push(new Field(ctx, DIR[first], kind))
      if (order.do.length > 1)
        this.parts.push(partFor(ctx, order.do[1], 1, DIR[first], order, 3))
    } else this.parts.push(partFor(ctx, first, 0, { x: 0, y: 0 }, order, 0))
    for (const p of this.parts) {
      this.group.add(p.object)
      if (!p.focus) continue
      const sprite = new THREE.Sprite(ctx.kit.bracketMaterial())
      sprite.visible = false
      sprite.renderOrder = 10
      this.group.add(sprite)
      this.marks.push({ part: p, sprite })
    }
    this.group.userData.own = this.marks.map((m) => m.sprite.material)
  }

  update(dt: number, p: number) {
    if (this.after !== null) this.after += dt
    const q = clamp(p, 0, 1)
    for (const part of this.parts) part.update(dt, q, this.after)
    const t = this.ctx.time()
    for (const m of this.marks) {
      const at = this.after === null ? m.part.focus?.() : null
      // Faint at first, gone once the danger is close enough to see
      const alpha = at ? clamp(q * 8, 0, 1) * clamp((0.82 - q) * 6, 0, 1) : 0
      m.sprite.visible = alpha > 0.01
      if (!at || !m.sprite.visible) continue
      m.sprite.position.copy(at)
      m.sprite.scale.setScalar(0.11 + q * 0.05 + Math.sin(t * 6) * 0.004)
      m.sprite.material.opacity = alpha * (0.75 + Math.sin(t * 10) * 0.25)
    }
  }

  // The helm did this, rightly or not
  act(a: Action, right: boolean) {
    if (!right) return
    const part = this.parts.find((pt) => pt.step === this.done)
    this.done++
    part?.act?.(a)
  }

  // What the lasers should fire at, from the ship's lane
  aim(lane: Lane): Target | null {
    for (const p of this.parts) {
      const t = p.aim?.(lane)
      if (t) return t
    }
    return null
  }

  // Plays out the order's end; returns how long it takes
  resolve(ok: boolean): number {
    this.after = 0
    if (ok) {
      for (const p of this.parts) p.win()
      return 1.4
    }
    const striker = this.parts.find((p) => p.step >= this.done) ?? this.parts[0]
    for (const p of this.parts) p.lose(p === striker)
    return 1.5
  }

  dispose() {
    this.group.removeFromParent()
    disposeTree(this.group, this.ctx.kit)
  }
}
