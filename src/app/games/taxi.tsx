import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  OctagonX,
  Volume2,
} from 'lucide-react'
import { FIRST_STOP, PASSENGERS, PLACES, SAY } from '../data/taxi'
import { WORD } from '../data/words'
import { join, syllables } from '../lib/pinyin'
import { plain } from '../lib/text'
import { blip } from '../lib/audio'
import { useStore } from '../lib/store'
import {
  ahead,
  crossingXY,
  endOf,
  fare,
  judge,
  lotXY,
  pathOf,
  plan,
  spotAt,
} from '../lib/taxi'
import { Btn, Frame, Mixed, sample, usePeek } from '../ui'
import { Face, Pix } from '../pixel/Pix'
import {
  COLORS,
  Combo,
  CountUp,
  Key,
  burst,
  confetti,
  floatText,
  reducedMotion,
  replay,
  useKeys,
  useSpeaker,
} from './fx'
import { ANCHOR, taxiScene } from './taxiScene'
import type { Move, Path, Point, Ride, Spot } from '../lib/taxi'
import type { TaxiScene, TaxiView } from './taxiScene'
import type { Level } from '../lib/bank'

// Taxi: a passenger gets in and says where to, then how to get there, one
// instruction at a time and by ear: turn left, at the second crossing
// turn right, at the bank turn left, stop in front of the cinema. Steer
// with the arrows, one move for each crossing (or each place passed while
// looking for where to stop). A wrong move gets a complaint and the
// instruction again. A shift is five rides; each passenger gives up to
// five stars, one fewer for each wrong move and one fewer if the words
// were read rather than heard. The town and its drawing are
// lib/taxi.ts and taxiScene.ts.

const SHIFT = 5
// The taxi waits this far short of a crossing, behind the zebra
const HOLD = 10
// Speeds in the town's pixels a second, and how fast they change
const CRUISE = 34
const TURNING = 20
const ACCEL = 45
const DECEL = 70
// What an answer says about a word: heard, or read
const HEARD = 0.6
const READ = 0.3

// Met as the first shift starts, so the signs and the buttons show them
const FIRST_WORDS = ['左', '右', '一直', '停', ...PLACES.map((p) => p.id)]

const CONTROLS: Array<{
  move: Move
  key: string
  digit: string
  word: string
  Icon: typeof ArrowLeft
}> = [
  { move: 'left', key: 'ArrowLeft', digit: '1', word: '左', Icon: ArrowLeft },
  { move: 'straight', key: 'ArrowUp', digit: '2', word: '一直', Icon: ArrowUp },
  {
    move: 'right',
    key: 'ArrowRight',
    digit: '3',
    word: '右',
    Icon: ArrowRight,
  },
  { move: 'stop', key: 'ArrowDown', digit: '4', word: '停', Icon: OctagonX },
]

const ARROW_KEYS: Record<string, string> = {
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowRight: '→',
  ArrowDown: '↓',
}

// A point of a ride, with where it is along the path and whose it is
interface Flat extends Point {
  s: number
  // the instruction it belongs to, and its place in it
  ii: number
  pi: number
}

interface RideState {
  ride: Ride | null
  path: Path
  flat: Array<Flat>
  s: number
  v: number
  // points answered right, in order
  cleared: number
  // the instruction being told; -1 while the passenger says where to
  at: number
  mistakes: number
  // the words shown, this instruction and this ride
  shown: boolean
  read: boolean
  // words missed in this instruction, recorded once
  missed: Set<string>
  quietUntil: number
  arrived: boolean
  spot: Spot
  recent: Array<string>
  meter: number
  rider: TaxiView['rider']
}

const flatten = (ride: Ride, path: Path): Array<Flat> =>
  ride.instructions.flatMap((ins, ii) =>
    ins.points.map((p, pi) => ({ ...p, s: path.sOf(p), ii, pi })),
  )

// The passenger walking between the taxi's side and the pavement
function walk(path: Path, s: number, out: boolean, coat: string) {
  const p = path.at(s)
  const at = (d: number) => ({
    x: p.x + Math.cos(p.a) * d,
    y: p.y + Math.sin(p.a) * d,
  })
  return {
    from: at(out ? 4 : 12),
    to: at(out ? 14 : 4),
    t0: performance.now(),
    ms: out ? 900 : 650,
    coat,
  }
}

// The taxi standing at a spot, as a path no longer than that
const standing = (spot: Spot) =>
  pathOf({ edges: [spot.edge], moves: [], d0: spot.d, dEnd: spot.d })

// One word as the player knows it, small, for a sign or a button: in
// English if not met, hanzi with pinyin while learning, hanzi once known
function Word({
  id,
  className = '',
  big = false,
}: {
  id: string
  className?: string
  big?: boolean
}) {
  const { levelOf } = useStore()
  const w = WORD[id]
  if (!w) return null
  const lv: Level = levelOf(id)
  const font = big ? 'text-xl' : 'text-[15px]'
  return lv === 0 ? (
    <span className={`text-sm leading-none italic ${className}`}>{w.g}</span>
  ) : lv === 1 ? (
    <ruby className={`zh leading-none ${font} ${className}`}>
      {w.h}
      <rt className="text-[10px]">{join(syllables(w.p))}</rt>
    </ruby>
  ) : (
    <span className={`zh leading-none ${font} ${className}`}>{w.h}</span>
  )
}

export default function Taxi() {
  const store = useStore()
  const { settings, bank } = store
  const peek = usePeek()
  const [phase, setPhase] = useState<'ready' | 'ride' | 'paid' | 'over'>(
    'ready',
  )
  const [ride, setRide] = useState<Ride | null>(null)
  const [rideNo, setRideNo] = useState(0)
  const [who, setWho] = useState(0)
  const [at, setAt] = useState(-1)
  const [shown, setShown] = useState(false)
  const [complaint, setComplaint] = useState<string | null>(null)
  const [thanks, setThanks] = useState<string | null>(null)
  const [results, setResults] = useState<
    Array<{ place: string; fare: number; stars: number }>
  >([])
  const [combo, setCombo] = useState(0)
  const { speaking, play } = useSpeaker()

  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const meterEl = useRef<HTMLSpanElement>(null)
  const signs = useRef<Record<string, HTMLDivElement | null>>({})
  const scene = useRef<TaxiScene | null>(null)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const talkTurn = useRef(0)
  const first = spotAt(FIRST_STOP)
  const st = useRef<RideState>({
    ride: null,
    path: standing(first),
    flat: [],
    s: 0,
    v: 0,
    cleared: 0,
    at: -1,
    mistakes: 0,
    shown: false,
    read: false,
    missed: new Set(),
    quietUntil: 0,
    arrived: false,
    spot: first,
    recent: [],
    meter: 0,
    rider: null,
  })
  // The latest of everything the loop and the timers call back into
  const latest = useRef({ store, phase, who, rideNo, results })
  latest.current = { store, phase, who, rideNo, results }

  const later = (f: () => void, ms: number) =>
    timers.current.push(setTimeout(f, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // The passenger says lines one after another; saying something new
  // cuts off what was being said
  const talk = async (lines: Array<string>) => {
    const me = ++talkTurn.current
    const voice = PASSENGERS[latest.current.who].voice
    for (const line of lines) {
      if (talkTurn.current !== me) return false
      await play(plain(line, { home: settings.home }), voice)
      if (talkTurn.current !== me) return false
      await new Promise((r) => setTimeout(r, 180))
    }
    return talkTurn.current === me
  }

  // Where the taxi is on the page, for bursts and floating fares
  const taxiOnPage = () => {
    const r = box.current?.getBoundingClientRect()
    return r
      ? { x: r.left + ANCHOR.x * r.width, y: r.top + ANCHOR.y * r.height }
      : null
  }

  // --- A ride ---

  const nextInstruction = () => {
    const s = st.current
    if (!s.ride) return
    s.at++
    s.missed = new Set()
    s.shown = false
    const ins = s.ride.instructions[s.at]
    const { bank: b, meet } = latest.current.store
    meet(ins.words.filter((id) => !b.cards[id]))
    setAt(s.at)
    setShown(false)
    setComplaint(null)
    void talk([ins.line])
  }

  const begin = (no: number) => {
    const s = st.current
    const r = plan(s.spot, Math.random, s.recent)
    s.recent = [...s.recent, r.to.id].slice(-3)
    s.ride = r
    s.path = pathOf(r.route)
    s.flat = flatten(r, s.path)
    s.s = 0
    s.v = 0
    s.cleared = 0
    s.at = -1
    s.mistakes = 0
    s.shown = false
    s.read = false
    s.missed = new Set()
    s.arrived = false
    s.meter = 0
    // a different passenger from the last
    const next =
      (latest.current.who + 1 + Math.floor(Math.random() * 3)) %
      PASSENGERS.length
    latest.current.who = next
    s.rider = walk(s.path, 0, false, PASSENGERS[next].look.coat)
    setWho(next)
    setRide(r)
    setRideNo(no)
    setAt(-1)
    setShown(false)
    setComplaint(null)
    setThanks(null)
    setPhase('ride')
    later(() => open(r), 450)
  }

  // They get in and say where to; then the first instruction, and off
  const open = (r: Ride) =>
    talk([r.opener]).then((done) => {
      if (done && st.current.ride === r && st.current.at === -1)
        nextInstruction()
    })

  const startShift = () => {
    const { bank: b, meet } = latest.current.store
    meet(FIRST_WORDS.filter((id) => !b.cards[id]))
    setResults([])
    latest.current.results = []
    setCombo(0)
    begin(0)
  }

  const arrive = () => {
    const s = st.current
    const r = s.ride
    if (!r) return
    const stars = Math.max(1, 5 - s.mistakes - (s.read ? 1 : 0))
    s.spot = endOf(r)
    s.rider = walk(
      s.path,
      s.path.len,
      true,
      PASSENGERS[latest.current.who].look.coat,
    )
    const line = sample(SAY.thanks)
    setThanks(line)
    setComplaint(null)
    setResults((rs) => [...rs, { place: r.to.id, fare: r.fare, stars }])
    setPhase('paid')
    blip('win')
    const p = taxiOnPage()
    floatText(p, `+¥${r.fare}`, { color: '#b8862a', size: 28 })
    if (stars === 5)
      burst(p, { colors: [COLORS.gold, COLORS.yellow, '#fff3c4'], n: 22 })
    void talk([line])
  }

  const onward = () => {
    const { rideNo: no, results: rs, store: s } = latest.current
    if (no + 1 < SHIFT) {
      begin(no + 1)
      return
    }
    const stars = rs.reduce((t, x) => t + x.stars, 0)
    s.setBest('taxi', stars)
    s.points(rs.filter((x) => x.stars >= 4).length)
    setPhase('over')
    if (stars === SHIFT * 5) confetti()
  }

  // A move, from a button or a key
  const steer = (m: Move, from?: Element | null) => {
    const s = st.current
    if (latest.current.phase !== 'ride' || !s.ride || s.at < 0) return
    if (performance.now() < s.quietUntil) return
    const p = s.flat[s.cleared] as Flat | undefined
    // nothing asked for yet: the next instruction is still to come
    if (!p || p.ii !== s.at) {
      blip('tap')
      return
    }
    const ins = s.ride.instructions[s.at]
    const verdict = judge(ins, p.pi, m)
    const { record, levelOf } = latest.current.store
    if (verdict.ok) {
      s.cleared++
      setCombo((c) => c + 1)
      setComplaint(null)
      blip('right')
      if (from)
        burst(from, {
          colors: [COLORS.jade, COLORS.gold, COLORS.paper],
          n: 10,
          spread: 46,
        })
      // the instruction followed: the words it turned on, remembered
      if (p.pi === ins.points.length - 1 && !s.missed.size)
        for (const id of ins.words)
          if (levelOf(id) > 0) record(id, true, s.shown ? READ : HEARD)
      return
    }
    s.mistakes++
    s.quietUntil = performance.now() + 700
    setCombo(0)
    blip('wrong')
    replay(box.current, 'fx-shake')
    for (const id of verdict.missed)
      if (!s.missed.has(id)) {
        s.missed.add(id)
        if (levelOf(id) > 0) record(id, false, HEARD)
      }
    const line =
      verdict.complaint === 'early'
        ? SAY.early
        : verdict.complaint === 'notHere'
          ? SAY.notHere
          : sample(SAY.wrong)
    setComplaint(line)
    void talk([line, ins.line])
  }

  const hear = () => {
    const s = st.current
    if (!s.ride) return
    if (phase === 'paid' && thanks) void talk([thanks])
    else if (s.at < 0) void open(s.ride)
    else void talk([s.ride.instructions[s.at].line])
  }

  const show = () => {
    st.current.shown = true
    st.current.read = true
    setShown(true)
  }

  // --- The loop: the taxi moves, the town is drawn, the signs follow ---

  const stepTaxi = (dt: number) => {
    const s = st.current
    if (!s.ride || s.at < 0 || latest.current.phase !== 'ride') return
    const next = s.flat[s.cleared] as Flat | undefined
    const target = next ? next.s - (next.lot ? 0 : HOLD) : s.path.len
    // slower through a turn, from a little before it to a little after
    const turning = s.flat.some(
      (p, k) =>
        k < s.cleared &&
        !p.lot &&
        p.expect !== 'straight' &&
        p.s - s.s < 14 &&
        s.s - p.s < 18,
    )
    const vmax = turning ? TURNING : CRUISE
    const dist = target - s.s
    if (dist <= 0.01) s.v = 0
    else {
      s.v = Math.min(vmax, Math.sqrt(2 * DECEL * dist), s.v + ACCEL * dt)
      s.s = Math.min(target, s.s + s.v * dt)
    }
    // the instruction behind: on to the next
    const ins = s.ride.instructions
    if (s.at < ins.length - 1) {
      const mine = s.flat.filter((p) => p.ii === s.at)
      const last = mine[mine.length - 1]
      const done = s.flat.indexOf(last) < s.cleared
      if (done && s.s >= last.s + 6) nextInstruction()
    }
    if (!next && s.s >= s.path.len - 0.01 && !s.arrived) {
      s.arrived = true
      arrive()
    }
  }

  const viewOf = (): TaxiView => {
    const s = st.current
    const pose = s.path.at(s.s)
    const ph = latest.current.phase
    const next = s.flat[s.cleared] as Flat | undefined
    // the next turn already answered, coming up
    const coming = s.flat.find(
      (p, k) => k < s.cleared && p.s + 4 > s.s && !p.lot,
    )
    const blink =
      coming && coming.expect !== 'straight' && coming.s - s.s < 60
        ? (coming.expect as 'left' | 'right')
        : null
    let mark: TaxiView['mark'] = null
    if (ph === 'ride' && s.ride && next && next.ii === s.at) {
      if (next.lot) {
        const p = s.path.at(next.s)
        mark = { x: p.x + Math.cos(p.a) * 4, y: p.y + Math.sin(p.a) * 4 }
      } else {
        const c = ahead(s.ride.route.edges[next.edge])
        mark = crossingXY(c.i, c.j)
      }
    }
    const waiting = ph === 'ride' && s.at >= 0 && s.v < 1 && !!next
    return {
      pose,
      blink: ph === 'ride' ? blink : null,
      brake:
        waiting || (ph === 'ride' && s.v > 0 && !!next && next.s - s.s < 20),
      hazard: ph !== 'ride' || s.at < 0,
      mark,
      rider: s.rider,
    }
  }

  useEffect(() => {
    const c = canvas.current
    const b = box.current
    if (!c || !b) return
    const sc = taxiScene(c, reducedMotion())
    scene.current = sc
    const size = { w: b.clientWidth, h: b.clientHeight }
    const measure = () => {
      size.w = b.clientWidth
      size.h = b.clientHeight
      sc.resize(size.w, size.h)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(b)
    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(b)
    const lots = PLACES.map((p) => ({ id: p.id, ...lotXY(p.lot) }))
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (now - last < 15) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible || document.hidden) return
      stepTaxi(dt)
      // the meter, a street at a time
      const s = st.current
      if (s.ride) {
        const streets = s.path.starts.filter((x) => x <= s.s + 0.01).length
        if (streets !== s.meter) {
          if (streets > 1 && s.meter) blip('tick')
          s.meter = streets
          if (meterEl.current) meterEl.current.textContent = `¥${fare(streets)}`
        }
      }
      sc.draw(now, viewOf())
      for (const l of lots) {
        const el = signs.current[l.id]
        if (!el) continue
        const f = sc.project(l.x, l.y)
        const inside = f.x > -0.08 && f.x < 1.08 && f.y > -0.08 && f.y < 1.08
        el.style.visibility = inside ? 'visible' : 'hidden'
        if (inside)
          el.style.transform = `translate(${Math.round(f.x * size.w)}px, ${Math.round(f.y * size.h)}px) translate(-50%, -50%)`
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
    // the loop reads everything through refs
  }, [])

  useKeys((key) => {
    if (phase === 'ready' || phase === 'over') {
      if (key !== 'Enter') return
      startShift()
      return true
    }
    if (key === ' ') {
      hear()
      return true
    }
    if (phase === 'paid') {
      if (key !== 'Enter') return
      onward()
      return true
    }
    const c = CONTROLS.find((x) => x.key === key || x.digit === key)
    if (!c) return
    steer(c.move, document.querySelector(`[data-move="${c.move}"]`))
    return true
  })

  const passenger = PASSENGERS[who]
  const ins = ride && at >= 0 ? ride.instructions[at] : null
  const line =
    phase === 'paid' || phase === 'over'
      ? thanks
      : ins
        ? ins.line
        : ride?.opener
  const lineShown = phase !== 'ride' || at < 0 || shown
  const total = results.reduce((t, x) => t + x.fare, 0)
  const stars = results.reduce((t, x) => t + x.stars, 0)
  const lastResult = results[results.length - 1] as
    (typeof results)[number] | undefined

  return (
    <Frame
      title="Taxi"
      zh="出租车"
      right={
        phase !== 'ready' ? (
          <span className="flex items-center gap-2">
            <Combo n={combo} className="max-sm:hidden" />
            <span
              key={total}
              className="fx-bump inline-block font-black tabular-nums"
            >
              ¥{total}
            </span>
          </span>
        ) : null
      }
    >
      <div
        ref={box}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-[#b5aa95] shadow-[0_18px_40px_-18px_rgba(60,30,10,0.7)] sm:aspect-[16/10]"
      >
        <canvas
          ref={canvas}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: 'pixelated' }}
          aria-hidden="true"
        />
        {/* the places' signs, moved by the loop */}
        <div className="pointer-events-none absolute inset-0">
          {PLACES.map((p) => (
            <div
              key={p.id}
              ref={(el) => {
                signs.current[p.id] = el
              }}
              className="absolute top-0 left-0"
              style={{ visibility: 'hidden' }}
            >
              <button
                type="button"
                onClick={() => peek(p.id)}
                className="pointer-events-auto rounded-md border border-[var(--ink)]/50 bg-[#fffaf1]/90 px-1 pt-0.5 pb-1 text-[var(--ink)] shadow-[0_2px_0_rgba(34,28,24,0.35)]"
              >
                <Word id={p.id} />
              </button>
            </div>
          ))}
        </div>
        {phase !== 'ready' && (
          <div
            className="absolute top-2.5 left-3 flex gap-1"
            aria-label={`Passenger ${Math.min(rideNo + 1, SHIFT)} of ${SHIFT}`}
          >
            {Array.from({ length: SHIFT }, (_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full border border-black/30 ${i < results.length ? 'bg-[var(--gold)]' : i === rideNo ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        )}
        <div
          className={`absolute top-2 right-2 rounded-md border-2 border-[#141018] bg-[#241a1e] px-2 py-0.5 font-mono text-sm font-bold text-[#ff6a4a] tabular-nums shadow ${phase === 'ride' || phase === 'paid' ? '' : 'hidden'}`}
          aria-label="The meter"
        >
          <span ref={meterEl} />
        </div>
      </div>

      {phase !== 'ready' && phase !== 'over' && ride && (
        <div className="mt-3 flex items-start gap-3">
          <span className="mt-1 shrink-0 overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-[#e8dcc4]">
            <Face look={passenger.look} size={52} talking={speaking} />
          </span>
          <div className="fx-pop relative min-h-[4.5rem] flex-1 rounded-2xl border-2 border-[var(--ink)] bg-[#fffaf1] px-3 pt-2 pb-2.5 shadow-[0_5px_0_rgba(34,28,24,0.2)]">
            <span className="absolute top-5 -left-[9px] h-4 w-4 rotate-45 border-b-2 border-l-2 border-[var(--ink)] bg-[#fffaf1]" />
            <div className="relative flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {complaint && phase === 'ride' && (
                  <p className="fx-pop mb-1 text-[var(--red)]">
                    <Mixed line={complaint} size="sm" />
                  </p>
                )}
                {line && lineShown ? (
                  <Mixed line={line} size="sm" />
                ) : (
                  <p className="pt-1 text-sm text-[var(--ink-2)]">
                    Listen, and steer.{' '}
                    <button
                      type="button"
                      onClick={show}
                      className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-[var(--jade)] hover:bg-[var(--paper-2)]"
                    >
                      <Eye size={14} /> Show the words
                    </button>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={hear}
                aria-label="Hear it again"
                title="Hear it again (Space)"
                className={`shrink-0 rounded-full p-1.5 text-[var(--jade)] hover:bg-[var(--paper-2)] ${speaking ? 'fx-bump' : ''}`}
              >
                <Volume2 size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'ride' && (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {CONTROLS.map((c) => (
              <button
                key={c.move}
                type="button"
                data-move={c.move}
                disabled={at < 0}
                onPointerDown={(e) => {
                  // at once on a touch, without waiting for the click
                  e.preventDefault()
                  steer(c.move, e.currentTarget)
                  replay(e.currentTarget, 'fx-bump')
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  // the button's, not the page's Space (hear it again)
                  e.preventDefault()
                  e.stopPropagation()
                  steer(c.move, e.currentTarget)
                }}
                className={`zh-card relative flex touch-manipulation flex-col items-center gap-1 px-1 pt-2 pb-2.5 transition select-none active:scale-95 disabled:opacity-50 ${c.move === 'stop' ? 'text-[var(--red)]' : 'text-[var(--ink)]'}`}
              >
                <Key
                  k={ARROW_KEYS[c.key]}
                  className="absolute top-1.5 left-1.5"
                />
                <c.Icon size={26} strokeWidth={2.6} />
                <span className="pointer-events-none flex min-h-7 items-end text-[var(--ink)]">
                  <Word id={c.word} big />
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--ink-2)] max-sm:hidden">
            <Key k="←" /> <Key k="↑" /> <Key k="→" /> to turn or go on at the
            next crossing, <Key k="↓" /> to stop, <Key k="Space" /> to hear it
            again. The ring on the road shows where your next move is for.
          </p>
        </>
      )}

      {phase === 'paid' && lastResult && (
        <div className="zh-card fx-pop mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-[var(--ink-2)] uppercase">
              Fare
            </p>
            <p className="text-3xl font-black tabular-nums">
              ¥{lastResult.fare}
            </p>
          </div>
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-[var(--ink-2)] uppercase">
              Rating
            </p>
            <Stars n={lastResult.stars} />
          </div>
          <Btn onClick={onward} className="ml-auto px-6 py-3">
            {rideNo + 1 < SHIFT ? 'Next passenger' : 'End the shift'}{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </div>
      )}

      {phase === 'ready' && (
        <div className="zh-card fx-rise mt-4 p-6 text-center">
          <p className="mx-auto max-w-md">
            You drive a taxi. Each passenger tells you the way in Chinese, one
            step at a time: listen, and steer at each crossing with the arrows.
            At the end, stop in front of the place they asked for.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-2)]">
            Five passengers to a shift, and up to five stars from each: one
            fewer for every wrong move, and one fewer if you read the words
            instead of hearing them.
          </p>
          <div className="mt-5">
            <Btn onClick={startShift} className="px-8 py-3 text-lg">
              Start the shift{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          </div>
          {bank.best.taxi ? (
            <p className="mt-3 text-sm text-[var(--ink-2)]">
              Best shift: {bank.best.taxi} of {SHIFT * 5} stars
            </p>
          ) : null}
        </div>
      )}

      {phase === 'over' && (
        <div className="zh-card fx-pop mt-4 p-8 text-center">
          <Pix name="taxi" size={64} />
          <p className="mt-2 text-xs font-black tracking-[0.2em] text-[var(--ink-2)] uppercase">
            The shift is over
          </p>
          <p className="text-5xl font-black">
            ¥<CountUp to={total} />
          </p>
          <p className="mt-1 text-[var(--ink-2)]">
            {stars} of {SHIFT * 5} stars · best{' '}
            {Math.max(bank.best.taxi ?? 0, stars)}
          </p>
          <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left text-sm">
            {results.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <Mixed line={r.place} size="sm" />
                </span>
                <span className="tabular-nums">¥{r.fare}</span>
                <Stars n={r.stars} small />
              </li>
            ))}
          </ul>
          <Btn onClick={startShift} className="mt-5 px-8 py-3 text-lg">
            Another shift{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </div>
      )}
    </Frame>
  )
}

function Stars({ n, small = false }: { n: number; small?: boolean }) {
  return (
    <span className="inline-flex" aria-label={`${n} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Pix
          key={i}
          name="star"
          size={small ? 14 : 22}
          className={i < n ? '' : 'opacity-25 grayscale'}
        />
      ))}
    </span>
  )
}
