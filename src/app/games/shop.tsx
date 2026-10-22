import { useEffect, useMemo, useRef, useState } from 'react'
import { Headphones, Volume2 } from 'lucide-react'
import { CUSTOMER_VOICES, MENU, SHOP_ORDERS } from '../data/shop'
import { WORD } from '../data/words'
import { plain, tokens } from '../lib/text'
import { blip } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Mixed, shuffle, tokenLevel } from '../ui'
import { Pix } from '../pixel/Pix'
import {
  COLORS,
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
import { HEAD, TRAY, shopScene } from './shopScene'
import type { ShopView } from './shopScene'
import type { ShopOrder } from '../data/shop'

// The dumpling stall: customers come up to the counter and say what they
// want; put it on the tray and serve before they lose patience. A day is
// eight customers. Serving without reading the order (ears only) doubles
// the tip. The stall is a canvas (shopScene.ts): steam off the steamers,
// the customer at the counter, the dishes landing on the tray.

const DAY = 8
// the menu's keys, in order
const KEYS = '1234567890-='
// the customers' voices that are men's; the busts 0–3 are men, 4–7 women
const MEN = new Set([CUSTOMER_VOICES[0], CUSTOMER_VOICES[2]])

export default function Shop() {
  const { settings, levelOf, record, setBest, points, bank, meet } = useStore()
  const vars = { home: settings.home }
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [queue, setQueue] = useState<Array<ShopOrder>>([])
  const [at, setAt] = useState(0)
  const [tray, setTray] = useState<Record<string, number>>({})
  const [cash, setCash] = useState(0)
  const [served, setServed] = useState(0)
  const [ears, setEars] = useState(false)
  const [shown, setShown] = useState(false)
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(
    null,
  )
  const patience = useRef(1)
  const bars = useRef(new Set<HTMLDivElement>())
  const t0 = useRef(0)
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const { speaking, play } = useSpeaker()
  const order = queue[at] as ShopOrder | undefined
  const span = Math.max(14, 28 - at * 1.5)
  // who comes up for each order: a man for a man's voice, a woman for a
  // woman's, in a shuffled order each day
  const faces = useMemo(
    () => ({ men: shuffle([0, 1, 2, 3]), women: shuffle([4, 5, 6, 7]) }),
    [queue],
  )
  const view = useRef<ShopView>({
    who: 0,
    mood: 'away',
    since: 0,
    side: 1,
    tray: [],
  })

  const later = (f: () => void, ms: number) =>
    timers.current.push(setTimeout(f, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // The stall, drawn every frame while it is on screen
  useEffect(() => {
    const c = canvas.current
    const b = box.current
    if (!c || !b) return
    const still = reducedMotion()
    let scene: ReturnType<typeof shopScene> | null = null
    const stall = new Image()
    const people = new Image()
    let loaded = 0
    const ready = () => {
      if (++loaded === 2) scene = shopScene(c, stall, people, still)
    }
    stall.onload = ready
    people.onload = ready
    stall.src = '/art/games/stall.png'
    people.src = '/art/games/customers.png'
    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(b)
    let raf = 0
    let last = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // thirty frames a second is plenty for steam and a pixel scene
      if (now - last < 31) return
      last = now
      if (!visible || document.hidden || !scene) return
      scene.draw(now, view.current)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])

  const hear = () => {
    if (order) void play(plain(order.zh, vars), order.voice)
  }

  const start = () => {
    meet(
      ['要', '个', '碗', '杯', '饺子', '包子', '茶'].filter(
        (id) => !bank.cards[id],
      ),
    )
    setQueue(shuffle(SHOP_ORDERS).slice(0, DAY))
    setAt(0)
    setCash(0)
    setServed(0)
    setPhase('play')
  }

  // A new customer comes up and, once at the counter, orders
  useEffect(() => {
    if (phase !== 'play' || !order) return
    setTray({})
    setVerdict(null)
    setShown(false)
    const men = MEN.has(order.voice)
    // the next man, or the next woman, of the day
    const before = queue
      .slice(0, at)
      .filter((o) => MEN.has(o.voice) === men).length
    view.current = {
      who: (men ? faces.men : faces.women)[before % 4],
      mood: 'enter',
      since: performance.now(),
      side: at % 2 ? -1 : 1,
      tray: [],
    }
    t0.current = performance.now() + 700
    patience.current = 1
    showPatience(1)
    const id = setTimeout(hear, 650)
    return () => clearTimeout(id)
  }, [phase, at])

  // Patience runs down; the bar under the order is set directly, so the
  // stall is not drawn again ten times a second
  const showPatience = (p: number) => {
    for (const el of bars.current) {
      el.style.width = `${Math.max(0, p) * 100}%`
      el.style.background =
        p > 0.5 ? 'var(--jade)' : p > 0.25 ? 'var(--gold)' : 'var(--red)'
    }
  }
  useEffect(() => {
    if (phase !== 'play' || verdict) return
    const id = setInterval(() => {
      const p = Math.min(1, 1 - (performance.now() - t0.current) / 1000 / span)
      patience.current = p
      showPatience(p)
      if (p <= 0) serve(true)
    }, 100)
    return () => clearInterval(id)
  })

  const ids = (o: ShopOrder) =>
    tokens(o.zh, vars)
      .filter((t) => !t.punct && tokenLevel(t, levelOf) > 0)
      .flatMap((t) => (t.id ? [t.id] : []))

  const scenePoint = (f: { x: number; y: number }) => {
    const r = box.current?.getBoundingClientRect()
    return r ? { x: r.left + f.x * r.width, y: r.top + f.y * r.height } : null
  }

  const serve = (timeout = false) => {
    if (!order || verdict) return
    const want = order.want
    const keys = new Set([...Object.keys(want), ...Object.keys(tray)])
    const ok =
      !timeout && [...keys].every((k) => (want[k] ?? 0) === (tray[k] ?? 0))
    const what = Object.entries(want)
      .map(([id, n]) => `${n} ${WORD[id]?.g ?? id}`)
      .join(', ')
    let gained = 0
    const now = performance.now()
    if (ok) {
      const bill = Object.entries(want).reduce(
        (s, [id, n]) => s + n * MENU.find((m) => m.id === id)!.price,
        0,
      )
      const tip = Math.round(patience.current * 10) * (ears && !shown ? 2 : 1)
      gained = bill + tip
      setCash((c) => c + gained)
      setServed((s) => s + 1)
      blip('right')
      for (const id of ids(order))
        record(
          id,
          true,
          ears && !shown ? 0.8 : 0.5,
          ears && !shown ? 'sm' : 'read',
        )
      setVerdict({ ok: true, text: `谢谢！ ${bill} kuai, and ${tip} tip.` })
      view.current = { ...view.current, mood: 'happy', since: now }
      const head = scenePoint(HEAD)
      burst(scenePoint(TRAY), {
        colors: [COLORS.gold, COLORS.yellow, '#fff3c4'],
        n: 20,
        spread: 90,
      })
      floatText(head, `+¥${gained}`, { color: '#b8862a', size: 30 })
      later(() => {
        view.current = {
          ...view.current,
          mood: 'leave',
          since: performance.now(),
        }
      }, 850)
    } else {
      blip('wrong')
      const wrongItems = [...keys].filter(
        (k) => (want[k] ?? 0) !== (tray[k] ?? 0),
      )
      for (const id of wrongItems)
        if (want[id] && levelOf(id) > 0)
          record(id, false, 0.5, ears && !shown ? 'sm' : 'read')
      setVerdict({
        ok: false,
        text: `${timeout ? 'Too slow! ' : '不对！ '}They wanted ${what}.`,
      })
      view.current = { ...view.current, mood: 'cross', since: now }
      replay(box.current, 'fx-shake')
      later(() => {
        view.current = {
          ...view.current,
          mood: 'leave',
          since: performance.now(),
        }
      }, 2300)
    }
    setShown(true)
    later(
      () => {
        if (at + 1 >= queue.length) {
          setPhase('over')
          setBest('shop', cash + gained)
          points(served + (ok ? 1 : 0))
          view.current = { ...view.current, mood: 'away', tray: [] }
          if (served + (ok ? 1 : 0) === queue.length) confetti()
        } else setAt((a) => a + 1)
      },
      ok ? 1400 : 3200,
    )
  }

  const add = (id: string, d: number) => {
    if (verdict || phase !== 'play') return
    const sprite = MENU.find((m) => m.id === id)!.sprite
    if (d > 0) {
      view.current = {
        ...view.current,
        tray: [...view.current.tray, { sprite, at: performance.now() }],
      }
    } else {
      const list = [...view.current.tray]
      const last = list.map((x) => x.sprite).lastIndexOf(sprite)
      if (last >= 0) list.splice(last, 1)
      view.current = { ...view.current, tray: list }
    }
    setTray((t) => {
      const n = Math.max(0, (t[id] ?? 0) + d)
      const next = { ...t, [id]: n }
      if (!n) delete next[id]
      return next
    })
  }

  useKeys((key) => {
    if (phase !== 'play') {
      if (key !== 'Enter') return
      start()
      return true
    }
    if (key === ' ') {
      hear()
      return true
    }
    if (key === 'Enter') {
      if (Object.keys(tray).length) serve()
      return true
    }
    if (key === 'Backspace') {
      const last = view.current.tray.at(-1)
      const m = last && MENU.find((x) => x.sprite === last.sprite)
      if (m) add(m.id, -1)
      return true
    }
    const k = KEYS.indexOf(key)
    if (k < 0 || k >= MENU.length) return
    add(MENU[k].id, 1)
    return true
  })

  const bubble = order && phase === 'play' && (
    <div className="fx-pop relative rounded-2xl border-2 border-[var(--ink)] bg-[#fffaf1] px-3 pt-2.5 pb-3 shadow-[0_6px_0_rgba(34,28,24,0.25)] max-sm:mt-3 sm:absolute sm:top-[6%] sm:left-[63%] sm:w-[35%]">
      {/* the tail: up to the customer on a phone, left to them otherwise */}
      <span className="absolute -top-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-t-2 border-l-2 border-[var(--ink)] bg-[#fffaf1] sm:hidden" />
      <span className="absolute top-[45%] -left-[9px] hidden h-4 w-4 rotate-45 border-b-2 border-l-2 border-[var(--ink)] bg-[#fffaf1] sm:block" />
      <div className="relative">
        {ears && !shown ? (
          <button
            type="button"
            onClick={() => setShown(true)}
            className="text-sm font-bold text-[var(--jade)]"
          >
            <Headphones size={14} className="mb-0.5 inline" /> Listen… (tap to
            read)
          </button>
        ) : (
          <Mixed line={order.zh} size="sm" />
        )}
        <button
          type="button"
          onClick={hear}
          aria-label="Hear it again"
          className={`ml-1 inline-flex rounded-full p-1 align-middle text-[var(--jade)] hover:bg-[var(--paper-2)] ${speaking ? 'fx-bump' : ''}`}
        >
          <Volume2 size={18} />
        </button>
        {verdict && (
          <p
            className={`fx-pop mt-1.5 text-sm font-bold ${verdict.ok ? 'text-[var(--jade)]' : 'text-[var(--red)]'}`}
          >
            {verdict.text}
          </p>
        )}
      </div>
      <div className="absolute inset-x-3 bottom-1 h-1 overflow-hidden rounded-full bg-[var(--paper-2)]">
        <div
          ref={(el) => {
            if (el) bars.current.add(el)
            return () => {
              if (el) bars.current.delete(el)
            }
          }}
          className="h-full rounded-full bg-[var(--jade)] transition-[width] duration-100"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )

  return (
    <Frame
      title="Dumpling stall"
      zh="饺子馆"
      right={
        phase === 'play' ? (
          <span
            key={cash}
            className="fx-bump inline-block font-black tabular-nums"
          >
            ¥{cash}
          </span>
        ) : null
      }
    >
      <div
        ref={box}
        className="relative aspect-[16/9] w-full overflow-visible rounded-3xl"
      >
        <canvas
          ref={canvas}
          className="absolute inset-0 h-full w-full rounded-3xl shadow-[0_18px_40px_-18px_rgba(60,30,10,0.7)]"
          style={{ imageRendering: 'pixelated' }}
          aria-hidden="true"
        />
        {phase === 'play' && (
          <div
            className="absolute top-2 left-3 flex gap-1"
            aria-label={`Customer ${at + 1} of ${queue.length}`}
          >
            {queue.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full border border-black/30 ${i < at ? 'bg-[var(--gold)]' : i === at ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        )}
        <div className="max-sm:hidden">{bubble}</div>
      </div>
      <div className="sm:hidden">{bubble}</div>

      {phase === 'ready' && (
        <div className="zh-card fx-rise mt-4 p-6 text-center">
          <p className="mx-auto max-w-md">
            You run a little stall. Customers say what they want – a number, a
            measure word, a thing. Put it on the tray and serve it before they
            lose patience.
          </p>
          <label className="mt-4 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ears}
              onChange={(e) => setEars(e.target.checked)}
              className="accent-[var(--red)]"
            />
            Ears only: orders are not written (tap to read, but the tip is
            double if you don't)
          </label>
          <div className="mt-5">
            <Btn onClick={start} className="px-8 py-3 text-lg">
              Open the stall{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          </div>
          {bank.best.shop ? (
            <p className="mt-3 text-sm text-[var(--ink-2)]">
              Best day: ¥{bank.best.shop}
            </p>
          ) : null}
        </div>
      )}

      {phase === 'play' && order && (
        <>
          <div className="mt-3 flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--gold)] bg-[#fff6e3] p-2.5">
            <span className="px-1 text-sm font-bold text-[var(--ink-2)]">
              Tray
            </span>
            {Object.entries(tray).map(([id, n]) => (
              <button
                key={id}
                type="button"
                onClick={() => add(id, -1)}
                title="Take one off"
                className="fx-pop flex items-center rounded-xl bg-white px-2 py-1 shadow-sm transition hover:bg-[#fdeee8]"
              >
                <Pix name={MENU.find((m) => m.id === id)!.sprite} size={32} />
                <span key={n} className="fx-bump ml-1 inline-block font-black">
                  ×{n}
                </span>
              </button>
            ))}
            {!Object.keys(tray).length && (
              <span className="text-sm text-[var(--ink-2)]">
                empty – tap the food below
              </span>
            )}
            <Btn
              onClick={() => serve()}
              disabled={!!verdict || !Object.keys(tray).length}
              className="ml-auto px-5 py-2.5"
            >
              Serve{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {MENU.map((m, i) => (
              <button
                key={m.id}
                type="button"
                disabled={!!verdict}
                onClick={(e) => {
                  add(m.id, 1)
                  replay(e.currentTarget, 'fx-bump')
                }}
                className="zh-card relative flex flex-col items-center gap-1 p-2 transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
              >
                <Key k={KEYS[i]} className="absolute top-1.5 left-1.5" />
                <Pix name={m.sprite} size={48} />
                <span className="pointer-events-none">
                  <Mixed line={m.id} size="sm" still />
                </span>
                <span className="text-xs text-[var(--ink-2)]">¥{m.price}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--ink-2)] max-sm:hidden">
            <Key k="1" />–<Key k="=" /> to put food on the tray,{' '}
            <Key k="Backspace" /> to take it off, <Key k="Space" /> to hear the
            order again
          </p>
        </>
      )}

      {phase === 'over' && (
        <div className="zh-card fx-pop mt-4 p-8 text-center">
          <Pix name="lantern" size={64} />
          <p className="mt-2 text-xs font-black tracking-[0.2em] text-[var(--ink-2)] uppercase">
            The day is done
          </p>
          <p className="text-5xl font-black">
            ¥<CountUp to={cash} />
          </p>
          <p className="mt-1 text-[var(--ink-2)]">
            {served} of {DAY} served right · best day ¥
            {Math.max(bank.best.shop ?? 0, cash)}
          </p>
          <Btn onClick={start} className="mt-5 px-8 py-3 text-lg">
            Another day{' '}
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
