import {
  CAPTAIN_VOICE,
  HOME,
  ORDERS,
  POOLS,
  SET_OFF,
  VOYAGE,
  WELL_DONE,
  WRECKED,
} from '../../data/bridge'
import {
  ENCOUNTERS,
  PUZZLED,
  REPLY_VOICE,
  speakerOf,
} from '../../data/encounters'
import type { Action, Leg, Line, Order, PlanetId } from '../../data/bridge'
import type {
  Cue,
  Effect,
  Encounter,
  Part,
  Reply,
  Said,
} from '../../data/encounters'

// The rules of the starship and the course of a game, apart from how it is
// drawn: the voyage leg by leg (set off, warp, a few orders, an encounter,
// a few more, stop at the planet) and home, each order's time, what counts
// as done, the encounters' scripts and choices, the score and the hull.
// Time is the game's own clock, advanced by the scene each frame, so it
// stands still while the page is hidden or paused.

export const HULL = 100
export const PER_LEG = 5
// The encounter comes after this many of the leg's orders
export const MEET_AT = 3
// What a mistake costs, what a planet repairs
const DAMAGE = 20
const REPAIR = 20
// Points for a right reply in an encounter
const REPLY_GAIN = 10

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
  // An encounter's ship comes on screen, does what it is told, and goes;
  // each returns how long it takes
  meet: (e: Encounter) => number
  // The friends made on the way come with 'friends': the encounters they
  // were made in
  cue: (c: Cue, allies: Array<string>) => number
  part: () => void
  // The shield given as a present takes a blow
  save: () => void
  // The crystal beings' song; returns how long it lasts
  music: () => number
}

export interface LogEntry {
  leg: PlanetId
  title: string
  text: string
}

export interface Hud {
  phase: 'intro' | 'order' | 'result' | 'meet' | 'choose' | 'arrived' | 'over'
  hull: number
  score: number
  // Orders given, and planets reached
  count: number
  reached: number
  leg: Leg
  // Orders given on this leg, not counting an encounter's
  step: number
  order: Order | null
  done: Array<Action>
  result: 'right' | 'wrong' | null
  gain: number
  // What is being said, besides orders, and who says it ('you' for the
  // player's reply); whether it is a question the replies answer
  line: Line | null
  who: string
  question: boolean
  bonus: number
  // Points won or paid in an encounter, shown as they come (id counts them)
  award: { n: number; id: number } | null
  missed: Array<Order>
  // The encounter under way, or done on this leg
  encounter: Encounter | null
  met: boolean
  // The replies on offer, in the order shown; those tried and found wrong,
  // and the one picked
  replies: Array<Reply>
  tried: Array<number>
  picked: number | null
  // A shield given as a present, waiting for a blow
  shield: boolean
  // The encounters where friends were made
  allies: Array<string>
  log: Array<LogEntry>
  // Home at the end of the voyage
  home: boolean
}

export interface Settled {
  order: Order
  ok: boolean
  gain: number
}

// A reply to a question: right or wrong (choices are neither, and are not
// told)
export interface Answered {
  question: string
  reply: Reply
  right: boolean
}

export interface FlightOptions {
  officer: boolean
  speak: (zh: string, voice: string) => Promise<void>
  onHud: (h: Hud) => void
  onSettled: (s: Settled) => void
  onAnswered?: (a: Answered) => void
  // An encounter begins: its words are met
  onMeet?: (e: Encounter) => void
  onArrived?: (h: Hud) => void
  onOver: (h: Hud) => void
  // The share of the order's time left, every frame
  onTick?: (left: number) => void
  random?: () => number
  // An encounter to begin with, straight after the first warp (?meet=)
  meet?: string
}

const STOP = Symbol('stop')
// The hull at an end
class Over extends Error {}

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

// The encounter for a leg: one not met yet on this voyage that can happen
// there, at random
export function pickEncounter(
  leg: number,
  last: boolean,
  hull: number,
  met: Set<string>,
  random: () => number,
): Encounter | null {
  const ok = (e: Encounter) =>
    !met.has(e.id) &&
    !!e.last === last &&
    (e.from ?? 0) <= leg &&
    (!e.damaged || hull < HULL)
  const pool = ENCOUNTERS.filter(ok)
  return pool.length ? pool[Math.floor(random() * pool.length)] : null
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
  private choosing: ((k: number) => void) | null = null
  private stopped = false
  private last: Order | null = null
  private met = new Set<string>()
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
      who: 'Captain',
      question: false,
      bonus: 0,
      award: null,
      missed: [],
      encounter: null,
      met: false,
      replies: [],
      tried: [],
      picked: null,
      shield: false,
      allies: [],
      log: [],
      home: false,
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

  // A reply picked, by its place among those shown
  choose(k: number) {
    const pick = this.choosing
    if (!pick || this.stopped || this.hud.tried.includes(k)) return
    if (k < 0 || k >= this.hud.replies.length) return
    this.choosing = null
    pick(k)
  }

  stop() {
    this.stopped = true
    this.waits = []
    this.current = null
    this.choosing = null
  }

  async run() {
    try {
      for (let i = 0; i < VOYAGE.length; i++) {
        const leg = VOYAGE[i]
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
          encounter: null,
          met: false,
        })
        if (first) await this.wait(0.8)
        await this.say({ zh: leg.zh, en: leg.en })
        await this.say(SET_OFF, 0.1)
        await this.wait(this.stage.warp(leg))
        const chosen = first
          ? ENCOUNTERS.find((e) => e.id === this.opts.meet)
          : undefined
        for (let k = 0; k < PER_LEG; k++) {
          if (chosen && k === 0) await this.encounter(chosen)
          else if (k === MEET_AT && !chosen) {
            const e = pickEncounter(
              i,
              i === VOYAGE.length - 1,
              this.hud.hull,
              this.met,
              this.random,
            )
            if (e) await this.encounter(e)
          }
          this.stage.course(leg, k / PER_LEG)
          await this.give(this.pick(i), true)
        }
        this.stage.course(leg, 1)
        const ok = await this.give(leg.arrive, true)
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
        this.opts.onArrived?.(this.hud)
        if (ok) await this.say(WELL_DONE)
        await this.say(leg.about, 0.8)
      }
      await this.end(true)
    } catch (e) {
      if (e === STOP) return
      if (e instanceof Over) return await this.end(false)
      throw e
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

  private async say(
    line: Line,
    pause = 0.35,
    who = 'Captain',
    question = false,
  ) {
    this.emit({ line, who, question })
    await this.opts.speak(line.zh, this.voiceOf(who))
    this.check()
    await this.wait(pause)
  }

  private voiceOf(who: string) {
    return who === 'you'
      ? REPLY_VOICE
      : (speakerOf(who)?.voice ?? CAPTAIN_VOICE)
  }

  // A random order on the way, not the last one again. The first leg keeps
  // to single orders; two-step orders and "don't" orders come after.
  private pick(leg: number): Order {
    return this.pickFrom(
      ORDERS.filter(
        (o) =>
          !o.arrival && !o.foe && (leg > 0 || (o.do.length === 1 && !o.not)),
      ),
    )
  }

  private pickFrom(orders: Array<Order>): Order {
    const pool = orders.filter((o) => o !== this.last)
    return pool[Math.floor(this.random() * pool.length)]
  }

  // An order, timed; on the way it counts toward the leg's course
  private async give(o: Order, onCourse = false, quick = 1): Promise<boolean> {
    this.last = o
    const time = span(o, this.hud.count) * (o.arrival ? 1.15 : 1) * quick
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
      who: 'Captain',
    })
    void this.opts.speak(o.zh, CAPTAIN_VOICE)
    const ok = await settled
    this.check()
    const left = Math.max(0, Math.min(1, 1 - (this.now - t0) / time))
    const g = gain(o, ok, left, this.opts.officer)
    // A present of a shield takes the first blow
    const saved = !ok && this.hud.shield
    const hull = ok || saved ? this.hud.hull : this.hud.hull - DAMAGE
    this.opts.onSettled({ order: o, ok, gain: g })
    const length = this.stage.resolve(ok)
    if (saved) this.stage.save()
    this.stage.setHull(hull)
    this.emit({
      phase: 'result',
      result: ok ? 'right' : 'wrong',
      gain: g,
      score: this.hud.score + g,
      hull,
      shield: this.hud.shield && !saved,
      count: this.hud.count + 1,
      step: this.hud.step + (onCourse && !o.arrival ? 1 : 0),
      missed:
        ok || this.hud.missed.includes(o)
          ? this.hud.missed
          : [...this.hud.missed, o],
    })
    await this.wait(Math.max(ok ? 1.0 : 1.6, length * 0.9))
    if (hull <= 0) throw new Over()
    return ok
  }

  // --- Encounters ---

  private async encounter(e: Encounter) {
    this.met.add(e.id)
    this.opts.onMeet?.(e)
    this.emit({
      phase: 'meet',
      encounter: e,
      order: null,
      result: null,
      line: null,
    })
    await this.wait(this.stage.meet(e))
    let part: Part | undefined = e.parts[e.start]
    let log = ''
    let cued = false
    while (part) {
      let next: string | undefined = part.next
      let jumped = false
      const asked = [...part.steps].reverse().find((s) => s.kind === 'line')
      for (const s of part.steps) {
        if (s.kind === 'line') {
          this.emit({ phase: 'meet', order: null, result: null })
          const question = s === asked && part.replies.length > 0
          await this.say({ zh: s.zh, en: s.en }, 0.45, s.by, question)
        } else if (s.kind === 'if') {
          const yes = s.ally
            ? this.hud.allies.length > 0
            : !!s.met && this.met.has(s.met)
          if (yes) {
            next = s.next
            jumped = true
            break
          }
        } else {
          if (s.effect.kind === 'ship') cued = true
          await this.effect(e, s.effect)
        }
      }
      if (part.log) log = part.log
      if (!jumped && part.replies.length) {
        const r = await this.ask(part)
        next = r.next
      }
      part = next ? e.parts[next] : undefined
    }
    if (!cued) await this.wait(this.stage.cue('stay', this.hud.allies))
    this.stage.part()
    this.emit({
      phase: 'meet',
      met: true,
      line: null,
      replies: [],
      tried: [],
      picked: null,
      log: [
        ...this.hud.log,
        { leg: this.hud.leg.id, title: e.title, text: log },
      ],
    })
    await this.wait(0.6)
    this.emit({ encounter: null })
  }

  // The replies to what was just said, until one is taken: a wrong one
  // with nowhere to go puzzles the one who asked, and is struck off
  private async ask(part: Part): Promise<Reply> {
    const question =
      [...part.steps].reverse().find((s): s is Said => s.kind === 'line') ??
      null
    const shown = shuffle(part.replies, this.random)
    const tried: Array<number> = []
    let first = true
    for (;;) {
      this.emit({
        phase: 'choose',
        replies: shown,
        tried: [...tried],
        picked: null,
        line: question ? { zh: question.zh, en: question.en } : null,
        who: question?.by ?? 'Captain',
        question: !!question,
      })
      const k = await new Promise<number>((resolve) => {
        this.choosing = resolve
      })
      this.check()
      const r = shown[k]
      this.emit({ picked: k })
      if (r.right !== undefined) {
        this.opts.onAnswered?.({
          question: question?.zh ?? '',
          reply: r,
          right: r.right,
        })
        // Points for a right reply the first time
        if (r.right && first)
          this.award(REPLY_GAIN * (this.opts.officer ? 2 : 1))
      }
      first = false
      await this.say({ zh: r.zh, en: r.en }, 0.35, 'you')
      if (r.right === false && !r.next && question) {
        tried.push(k)
        await this.say(PUZZLED, 0.3, question.by)
        continue
      }
      this.emit({ replies: [], tried: [], picked: null })
      return r
    }
  }

  private async effect(e: Encounter, f: Effect) {
    const mult = this.opts.officer ? 2 : 1
    switch (f.kind) {
      case 'fly':
        for (let j = 0; j < f.n; j++) await this.give(this.pick(1))
        break
      case 'fight':
        for (let j = 0; j < f.n; j++)
          await this.give(this.pickFrom(POOLS[e.foe ?? 'pirate']))
        break
      case 'run':
        for (let j = 0; j < f.n; j++) await this.give(this.pickFrom(POOLS.run))
        break
      case 'rocks':
        for (let j = 0; j < f.n; j++)
          await this.give(this.pickFrom(POOLS.rocks), false, 0.85)
        break
      case 'hull': {
        const hull = Math.max(0, Math.min(HULL, this.hud.hull + f.n))
        this.stage.setHull(hull)
        this.emit({ hull })
        if (hull <= 0) throw new Over()
        break
      }
      case 'score':
        this.award(f.n > 0 ? f.n * mult : f.n)
        break
      case 'shield':
        this.emit({ shield: true })
        break
      case 'ally':
        this.emit({ allies: [...this.hud.allies, e.id] })
        break
      case 'music':
        this.emit({ line: null })
        await this.wait(this.stage.music())
        break
      case 'ship':
        await this.wait(this.stage.cue(f.cue, this.hud.allies))
        break
    }
    this.emit({ phase: 'meet', order: null, result: null })
  }

  private award(n: number) {
    this.emit({
      award: { n, id: (this.hud.award?.id ?? 0) + 1 },
      score: Math.max(0, this.hud.score + n),
    })
  }

  private settle(ok: boolean) {
    const c = this.current
    if (!c) return
    this.current = null
    c.settle(ok)
  }

  private async end(home: boolean) {
    if (home) {
      // What is left of the hull counts too
      const bonus = this.hud.hull * (this.opts.officer ? 2 : 1)
      this.emit({
        phase: 'over',
        home: true,
        order: null,
        bonus,
        score: this.hud.score + bonus,
      })
      this.opts.onOver(this.hud)
      await this.say(HOME)
      return
    }
    this.stage.wreck()
    this.emit({ phase: 'over', order: null, encounter: null })
    this.opts.onOver(this.hud)
    await this.say(WRECKED)
  }
}

function shuffle<T>(list: Array<T>, random: () => number): Array<T> {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
