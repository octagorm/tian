import { ORDERS, SET_OFF, VOYAGE, WELL_DONE, WRECKED } from '../../data/bridge'
import type { Action, Leg, Line, Order } from '../../data/bridge'

// The rules of the starship and the course of a game, apart from how it is
// drawn: the voyage leg by leg (set off, warp, a few orders, stop at the
// planet), each order's time, what counts as done, the score and the hull.
// Time is the game's own clock, advanced by the scene each frame, so it
// stands still while the page is hidden or paused.

export const HULL = 100
export const PER_LEG = 6
// What a mistake costs, what a planet repairs
const DAMAGE = 20
const REPAIR = 20

// What the flight needs from the scene (games/bridge/space.ts)
export interface Stage {
  setOff: (leg: Leg, first: boolean) => void
  // Returns how long the warp takes
  warp: (leg: Leg) => number
  course: (leg: Leg, s: number) => void
  order: (o: Order) => void
  // The order's danger, from 0 when given to 1 when it arrives
  progress: (p: number) => void
  act: (a: Action, right: boolean) => void
  // Returns how long its ending takes to play
  resolve: (ok: boolean) => number
  arrive: (leg: Leg) => void
  setHull: (h: number) => void
  wreck: () => void
}

export interface Hud {
  phase: 'intro' | 'order' | 'result' | 'arrived' | 'over'
  hull: number
  score: number
  // Orders given, and planets reached
  count: number
  reached: number
  leg: Leg
  // Orders given on this leg
  step: number
  order: Order | null
  done: Array<Action>
  result: 'right' | 'wrong' | null
  gain: number
  // What the captain is saying, besides orders
  line: Line | null
  bonus: number
  missed: Array<Order>
}

export interface Settled {
  order: Order
  ok: boolean
  gain: number
}

export interface FlightOptions {
  officer: boolean
  speak: (zh: string) => Promise<void>
  onHud: (h: Hud) => void
  onSettled: (s: Settled) => void
  onOver: (h: Hud) => void
  // The share of the order's time left, every frame
  onTick?: (left: number) => void
  random?: () => number
}

const STOP = Symbol('stop')

// How long an order gives, from how many have been given
export function span(o: Order, count: number): number {
  return (
    Math.max(2.6, 6 - count * 0.12) *
    (o.do.length > 1 ? 1.4 : 1) *
    (o.not ? 1.1 : 1)
  )
}

// The points an order earns: more for an officer, more the quicker
export function gain(o: Order, ok: boolean, left: number, officer: boolean) {
  if (!ok) return 0
  const mult = officer ? 2 : 1
  return mult * (o.not ? 15 : 10 + Math.round(left * 10))
}

export class Flight {
  private now = 0
  private waits: Array<{ at: number; resolve: () => void }> = []
  private current: {
    order: Order
    done: Array<Action>
    t0: number
    span: number
    settle: (ok: boolean) => void
  } | null = null
  private stopped = false
  private last: Order | null = null
  private random: () => number
  hud: Hud

  constructor(
    private stage: Stage,
    private opts: FlightOptions,
  ) {
    this.random = opts.random ?? Math.random
    this.hud = {
      phase: 'intro',
      hull: HULL,
      score: 0,
      count: 0,
      reached: 0,
      leg: VOYAGE[0],
      step: 0,
      order: null,
      done: [],
      result: null,
      gain: 0,
      line: null,
      bonus: 0,
      missed: [],
    }
  }

  // Advances the clock: waits, and the order's time
  update(dt: number) {
    if (this.stopped) return
    this.now += dt
    if (this.waits.length) {
      const due = this.waits.filter((w) => w.at <= this.now)
      this.waits = this.waits.filter((w) => w.at > this.now)
      for (const w of due) w.resolve()
    }
    const c = this.current
    if (c) {
      const left = Math.min(1, 1 - (this.now - c.t0) / c.span)
      this.stage.progress(Math.max(0, 1 - left))
      this.opts.onTick?.(Math.max(0, left))
      // A "don't" order is kept by waiting it out
      if (left <= 0) this.settle(!!c.order.not)
    }
  }

  // The helm: a button or a key
  act(a: Action) {
    const c = this.current
    if (!c || this.stopped) return
    const o = c.order
    if (o.not) {
      const right = a !== o.not
      this.stage.act(a, right)
      if (!right) this.settle(false)
      return
    }
    const right = a === o.do[c.done.length]
    this.stage.act(a, right)
    if (!right) {
      this.settle(false)
      return
    }
    c.done.push(a)
    this.emit({ done: [...c.done] })
    if (c.done.length === o.do.length) this.settle(true)
  }

  stop() {
    this.stopped = true
    this.waits = []
    this.current = null
  }

  async run() {
    try {
      for (let i = 0; ; i++) {
        const leg = VOYAGE[i % VOYAGE.length]
        const first = i === 0
        this.stage.setOff(leg, first)
        this.emit({
          phase: 'intro',
          leg,
          step: 0,
          order: null,
          result: null,
          line: null,
          bonus: 0,
        })
        if (first) await this.wait(0.8)
        await this.say({ zh: leg.zh, en: leg.en })
        await this.say(SET_OFF, 0.1)
        await this.wait(this.stage.warp(leg))
        for (let k = 0; k < PER_LEG; k++) {
          this.stage.course(leg, k / PER_LEG)
          await this.give(this.pick(i))
          if (this.hud.hull <= 0) return await this.end()
        }
        this.stage.course(leg, 1)
        const ok = await this.give(leg.arrive)
        if (this.hud.hull <= 0) return await this.end()
        const bonus = ok ? (this.opts.officer ? 2 : 1) * 25 : 0
        const hull = ok ? Math.min(HULL, this.hud.hull + REPAIR) : this.hud.hull
        this.stage.arrive(leg)
        this.stage.setHull(hull)
        this.emit({
          phase: 'arrived',
          reached: this.hud.reached + 1,
          score: this.hud.score + bonus,
          hull,
          bonus,
          order: null,
        })
        if (ok) await this.say(WELL_DONE)
        await this.say(leg.about, 0.8)
      }
    } catch (e) {
      if (e !== STOP) throw e
    }
  }

  // --- Within a game ---

  private emit(patch: Partial<Hud>) {
    this.hud = { ...this.hud, ...patch }
    this.opts.onHud(this.hud)
  }

  private check() {
    if (this.stopped) throw STOP
  }

  private wait(seconds: number): Promise<void> {
    return new Promise<void>((resolve) =>
      this.waits.push({ at: this.now + seconds, resolve }),
    ).then(() => this.check())
  }

  private async say(line: Line, pause = 0.35) {
    this.emit({ line })
    await this.opts.speak(line.zh)
    this.check()
    await this.wait(pause)
  }

  // A random order, not the last one again. The first leg keeps to single
  // orders; two-step orders and "don't" orders come after.
  private pick(leg: number): Order {
    const pool = ORDERS.filter(
      (o) =>
        !o.arrival &&
        o !== this.last &&
        (leg > 0 || (o.do.length === 1 && !o.not)),
    )
    return pool[Math.floor(this.random() * pool.length)]
  }

  private async give(o: Order): Promise<boolean> {
    this.last = o
    const time = span(o, this.hud.count) * (o.arrival ? 1.15 : 1)
    const t0 = this.now + 0.4
    this.stage.order(o)
    const settled = new Promise<boolean>((resolve) => {
      this.current = { order: o, done: [], t0, span: time, settle: resolve }
    })
    this.emit({
      phase: 'order',
      order: o,
      done: [],
      result: null,
      gain: 0,
      line: null,
    })
    void this.opts.speak(o.zh)
    const ok = await settled
    this.check()
    const left = Math.max(0, Math.min(1, 1 - (this.now - t0) / time))
    const g = gain(o, ok, left, this.opts.officer)
    const hull = ok ? this.hud.hull : this.hud.hull - DAMAGE
    this.opts.onSettled({ order: o, ok, gain: g })
    const length = this.stage.resolve(ok)
    this.stage.setHull(hull)
    this.emit({
      phase: 'result',
      result: ok ? 'right' : 'wrong',
      gain: g,
      score: this.hud.score + g,
      hull,
      count: this.hud.count + 1,
      step: this.hud.step + (o.arrival ? 0 : 1),
      missed:
        ok || this.hud.missed.includes(o)
          ? this.hud.missed
          : [...this.hud.missed, o],
    })
    await this.wait(Math.max(ok ? 1.0 : 1.6, length * 0.9))
    return ok
  }

  private settle(ok: boolean) {
    const c = this.current
    if (!c) return
    this.current = null
    c.settle(ok)
  }

  private async end() {
    this.stage.wreck()
    this.emit({ phase: 'over', order: null })
    this.opts.onOver(this.hud)
    await this.say(WRECKED)
  }
}
