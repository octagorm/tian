import { useEffect, useRef, useState } from 'react'
import {
  CircleCheck,
  CircleX,
  Headphones,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react'
import { ACTIONS, CAPTAIN_VOICE, VOYAGE } from '../data/bridge'
import { plain, tokens } from '../lib/text'
import { blip, stop as hush, say } from '../lib/audio'
import { useStore } from '../lib/store'
import { Frame, Mixed, tokenLevel } from '../ui'
import { Face } from '../pixel/Pix'
import { Flight, PER_LEG } from './bridge/flight'
import { Course, Helm, Hull, PlanetIcon } from './bridge/hud'
import { NoWebGL, Space } from './bridge/space'
import { Sfx } from './bridge/sound'
import './bridge/bridge.css'
import type { Hud } from './bridge/flight'
import type { Action, Order } from '../data/bridge'
import type { Look } from '../pixel/Pix'
import type { Level } from '../lib/bank'

// Starship: you are at the helm, the captain (船长) gives orders in
// Chinese, and the controls are pictures only. Do what you are told before
// the danger arrives. Cadets see the order written (in mixed text);
// officers only hear it, for double points. The voyage goes from Earth to
// the moon, Mars, Jupiter and Saturn and home, a few orders a planet; the
// scene is low-poly 3D (games/bridge/), the rules are in bridge/flight.ts.

// The captain, in a red tunic
const CAPTAIN: Look = { style: 'bun', coat: '#c8372d' }

// Words first met here, so the first orders show in Chinese
const FIRST_WORDS = ['往', '左', '右', '上', '下', '开火']

const RAIL = [
  'var(--sb-c)',
  'var(--sb-a)',
  'var(--sb-b)',
  'var(--sb-d)',
  'var(--sb-c)',
]

function useWide() {
  const [wide, setWide] = useState(
    () => matchMedia('(min-width: 640px)').matches,
  )
  useEffect(() => {
    const m = matchMedia('(min-width: 640px)')
    const change = () => setWide(m.matches)
    m.addEventListener('change', change)
    return () => m.removeEventListener('change', change)
  }, [])
  return wide
}

// The words of an order the player has met: these are the ones it tests
function orderWords(o: Order, home: string, levelOf: (id: string) => Level) {
  return tokens(o.zh, { home })
    .filter((t) => !t.punct && tokenLevel(t, levelOf) > 0)
    .flatMap((t) => (t.id ? [t.id] : []))
}

export default function Bridge() {
  const store = useStore()
  const latest = useRef(store)
  latest.current = store
  const { bank } = store
  const host = useRef<HTMLDivElement>(null)
  const timer = useRef<HTMLSpanElement>(null)
  const space = useRef<Space | null>(null)
  const flight = useRef<Flight | null>(null)
  const sfx = useRef<Sfx | null>(null)
  const talkId = useRef(0)
  const [gl, setGl] = useState<'ok' | 'none' | 'lost'>('ok')
  const [mode, setMode] = useState<'ready' | 'play' | 'over'>('ready')
  const [officer, setOfficer] = useState(false)
  const [hud, setHud] = useState<Hud | null>(null)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const [talking, setTalking] = useState(false)
  const [hits, setHits] = useState(0)
  const [flashes, setFlashes] = useState(0)
  const wide = useWide()

  useEffect(() => {
    const el = host.current
    if (!el) return
    const fx = new Sfx()
    sfx.current = fx
    setMuted(fx.muted)
    let s: Space
    try {
      s = new Space(el, {
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        mobile:
          matchMedia('(pointer: coarse)').matches || window.innerWidth < 640,
        sfx: fx,
      })
    } catch (e) {
      if (!(e instanceof NoWebGL)) console.error(e)
      setGl('none')
      return () => fx.dispose()
    }
    space.current = s
    s.onHit = () => setHits((h) => h + 1)
    s.onFlash = () => setFlashes((f) => f + 1)
    s.onLost = () => setGl('lost')
    return () => {
      flight.current?.stop()
      flight.current = null
      s.destroy()
      space.current = null
      fx.dispose()
      hush()
    }
  }, [])

  const speak = (zh: string) => {
    const id = ++talkId.current
    setTalking(true)
    return say(
      plain(zh, { home: latest.current.settings.home }),
      CAPTAIN_VOICE,
    ).finally(() => {
      if (talkId.current === id) setTalking(false)
    })
  }

  const start = (asOfficer: boolean) => {
    const s = space.current
    if (!s) return
    sfx.current?.start()
    flight.current?.stop()
    const { bank: b, meet } = latest.current
    meet(FIRST_WORDS.filter((id) => !b.cards[id]))
    setOfficer(asOfficer)
    setMode('play')
    setPaused(false)
    s.setPaused(false)
    const f = new Flight(s, {
      officer: asOfficer,
      speak,
      onHud: setHud,
      onTick: (left) => {
        const el = timer.current
        if (!el) return
        el.style.transform = `scaleX(${left})`
        el.style.backgroundColor =
          left < 0.3
            ? 'var(--sb-e)'
            : left < 0.6
              ? 'var(--sb-f)'
              : 'var(--sb-c)'
      },
      onSettled: ({ order, ok }) => {
        const { record, levelOf, settings } = latest.current
        for (const id of orderWords(order, settings.home, levelOf))
          record(id, ok, ok ? (asOfficer ? 0.7 : 0.4) : 0.4)
        blip(ok ? 'right' : 'wrong')
      },
      onOver: (h) => {
        const { setBest, points } = latest.current
        setBest('bridge', h.score)
        points(Math.floor(h.count / 2))
        setMode('over')
      },
    })
    flight.current = f
    s.onFrame = (dt) => f.update(dt)
    void f.run()
  }

  const act = (a: Action) => {
    if (mode !== 'play' || paused) return
    flight.current?.act(a)
  }

  const togglePause = () => {
    const next = !paused
    setPaused(next)
    space.current?.setPaused(next)
    if (next) hush()
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    sfx.current?.setMuted(next)
  }

  useEffect(() => {
    if (mode !== 'play') return
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'p' || k === 'escape') {
        e.preventDefault()
        togglePause()
        return
      }
      if (k === 'm') {
        toggleMute()
        return
      }
      const a = ACTIONS.find((x) => x.key === e.key || x.key === k)
      if (!a) return
      e.preventDefault()
      if (!e.repeat) act(a.id)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const leg = hud?.leg ?? VOYAGE[0]
  const order = hud?.order ?? null
  const live = mode === 'play' && hud?.phase === 'order' && !paused
  const best = Math.max(bank.best.bridge ?? 0, hud?.score ?? 0)

  return (
    <Frame
      title="Starship"
      zh="飞船"
      wide
      right={
        mode !== 'ready' && hud ? (
          <span className="text-xl font-black tabular-nums">{hud.score}</span>
        ) : null
      }
    >
      <div className="sb">
        <div className="sb-frame">
          <div className="sb-elbow sb-elbow-t" />
          <div className="sb-top">
            <div className="sb-bar">
              <span style={{ flex: 5, background: 'var(--sb-a)' }} />
              <span style={{ flex: 1.2, background: 'var(--sb-b)' }} />
              <span style={{ flex: 2, background: 'var(--sb-d)' }} />
              <span style={{ flex: 0.6, background: 'var(--sb-e)' }} />
            </div>
            <div className="flex min-h-0 flex-1 items-center gap-3 pl-3 pr-1">
              <span className="sb-label hidden text-[var(--sb-dim)] sm:inline">
                Hull
              </span>
              <Hull hull={hud?.hull ?? 100} />
              <span className="ml-auto flex min-w-0 items-center gap-2">
                <PlanetIcon id={leg.id} size={wide ? 22 : 18} />
                <Mixed line={leg.name} size="sm" still className="truncate" />
              </span>
            </div>
          </div>
          <div className="sb-rail">
            {RAIL.map((c, i) => (
              <span
                key={i}
                style={{ background: c, flex: [3, 1, 2, 1, 4][i] }}
              />
            ))}
          </div>
          <div className="sb-screen">
            <div ref={host} className="absolute inset-0" />
            {hits > 0 && <div key={`hit${hits}`} className="sb-hitflash" />}
            {flashes > 0 && (
              <div key={`warp${flashes}`} className="sb-warpflash" />
            )}
            {mode === 'play' && hud?.phase === 'result' && (
              <>
                <div key={`v${hud.count}`} className="sb-verdict">
                  {hud.result === 'right' ? (
                    <CircleCheck size={44} strokeWidth={2.6} color="#6fd6b8" />
                  ) : (
                    <CircleX size={44} strokeWidth={2.6} color="#e4604c" />
                  )}
                </div>
                {hud.gain > 0 && (
                  <div key={`g${hud.count}`} className="sb-gain">
                    +{hud.gain}
                  </div>
                )}
              </>
            )}
            {mode === 'play' && hud?.phase === 'arrived' && (
              <Arrived hud={hud} wide={wide} />
            )}
            {mode === 'ready' && gl === 'ok' && (
              <Ready best={bank.best.bridge} onStart={start} />
            )}
            {mode === 'over' && hud && (
              <Over hud={hud} best={best} onStart={start} wide={wide} />
            )}
            {paused && mode === 'play' && (
              <div className="sb-overlay">
                <button
                  type="button"
                  onClick={togglePause}
                  className="sb-card flex items-center gap-3 text-lg font-black"
                >
                  <Play size={22} /> Paused
                </button>
              </div>
            )}
            {gl !== 'ok' && (
              <div className="sb-overlay">
                <div className="sb-card">
                  <p className="text-lg font-bold">
                    {gl === 'none'
                      ? 'The starship is drawn in 3D with WebGL, which this browser does not offer.'
                      : 'The 3D view stopped working.'}
                  </p>
                  <p className="mt-2 text-sm text-[var(--sb-dim)]">
                    {gl === 'none'
                      ? 'Try another browser, or turn on hardware acceleration in this one.'
                      : 'Reload the page to fly on.'}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="sb-elbow sb-elbow-b" />
          <div className="sb-bottom">
            <div className="sb-timer" aria-hidden>
              <span
                ref={timer}
                style={{ transform: `scaleX(${live ? 1 : 0})` }}
              />
            </div>
            <div className="flex min-h-0 flex-1 items-center gap-2 pl-3 pr-1">
              {mode === 'play' && hud && (
                <Course
                  step={hud.phase === 'arrived' ? PER_LEG + 1 : hud.step}
                  of={PER_LEG}
                />
              )}
              <span className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="sb-icon-btn"
                  style={{ background: 'var(--sb-b)' }}
                  aria-label={muted ? 'Sound on' : 'Sound off'}
                  title="Sound (M)"
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                {mode === 'play' && (
                  <button
                    type="button"
                    onClick={togglePause}
                    className="sb-icon-btn"
                    style={{ background: 'var(--sb-d)' }}
                    aria-label={paused ? 'Resume' : 'Pause'}
                    title="Pause (P)"
                  >
                    {paused ? <Play size={14} /> : <Pause size={14} />}
                  </button>
                )}
              </span>
            </div>
          </div>
        </div>

        {mode !== 'ready' && hud && (
          <div className="sb-comm">
            <div className="sb-comm-face">
              <Face look={CAPTAIN} size={wide ? 56 : 42} />
            </div>
            <div className="sb-comm-body">
              <div className="sb-label text-[var(--sb-c)]">
                Captain{' '}
                <span className="zh text-sm tracking-normal normal-case">
                  船长
                </span>
                {talking && (
                  <span className="sb-talk" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
              <Said hud={hud} officer={officer} wide={wide} />
              {(order ?? hud.line) && (
                <button
                  type="button"
                  onClick={() => {
                    const zh = order?.zh ?? hud.line?.zh
                    if (zh) void speak(zh)
                  }}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-[var(--sb-g)] hover:bg-white/10"
                  aria-label="Hear it again"
                >
                  <Volume2 size={22} />
                </button>
              )}
            </div>
          </div>
        )}
        {mode !== 'ready' && (
          <Helm onAct={act} done={hud?.done ?? []} disabled={!live} />
        )}
      </div>
    </Frame>
  )
}

// What the captain is saying: the order (hidden from officers until it is
// settled), or a line about the voyage
function Said({
  hud,
  officer,
  wide,
}: {
  hud: Hud
  officer: boolean
  wide: boolean
}) {
  const size = wide ? 'lg' : 'md'
  const o = hud.order
  if (o) {
    const settled = hud.phase !== 'order'
    return (
      <div className="mt-1">
        {!officer || settled ? (
          <Mixed key={o.zh} line={o.zh} size={size} />
        ) : (
          <span className="text-[var(--sb-dim)] italic">
            <Headphones size={15} className="mr-1 mb-0.5 inline" />
            …listen
          </span>
        )}
        {settled && (
          <div className="mt-1 text-sm text-[var(--sb-dim)]">{o.en}</div>
        )}
      </div>
    )
  }
  if (hud.line)
    return (
      <div className="mt-1">
        <Mixed key={hud.line.zh} line={hud.line.zh} size={size} />
        <div className="mt-1 text-sm text-[var(--sb-dim)]">{hud.line.en}</div>
      </div>
    )
  return null
}

function Ready({
  best,
  onStart,
}: {
  best: number | undefined
  onStart: (officer: boolean) => void
}) {
  return (
    <div className="sb-overlay sb-overlay-low">
      <div className="sb-card">
        <div className="flex items-baseline justify-center gap-3">
          <span className="zh text-4xl text-[var(--sb-a)] sm:text-5xl">
            飞船
          </span>
          <span className="text-xl font-black sm:text-2xl">Starship</span>
        </div>
        <p className="mt-2 text-sm leading-snug text-[var(--sb-ink)] sm:mt-3 sm:text-[15px]">
          The captain gives orders in Chinese, and the controls have no words:
          do what you hear before the danger arrives.{' '}
          <span className="hidden sm:inline">
            Fly from Earth to the moon, Mars, Jupiter and Saturn, and home.
          </span>
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => onStart(false)}
            className="sb-pill py-2 text-base"
            style={{ background: 'var(--sb-a)' }}
          >
            Cadet: see the orders
          </button>
          <button
            type="button"
            onClick={() => onStart(true)}
            className="sb-pill py-2 text-base"
            style={{ background: 'var(--sb-c)' }}
          >
            Officer: only hear them
          </button>
        </div>
        <p className="mt-3 hidden text-xs text-[var(--sb-dim)] sm:block">
          Arrows steer · space fires · S shields · F faster · D slower · X stops
          · P pauses
        </p>
        {best ? (
          <p className="mt-2 text-sm font-bold text-[var(--sb-f)]">
            Best: {best}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Arrived({ hud, wide }: { hud: Hud; wide: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[2] flex justify-center px-3">
      <div className="sb-card flex items-center gap-3 py-2.5">
        <PlanetIcon id={hud.leg.id} size={wide ? 40 : 30} />
        <Mixed line={hud.leg.name} size={wide ? 'lg' : 'md'} still />
        {hud.bonus > 0 && (
          <span className="flex items-center gap-2 text-sm font-bold">
            <span className="text-lg text-[var(--sb-f)]">+{hud.bonus}</span>
            <Wrench size={16} className="text-[var(--sb-g)]" />
          </span>
        )}
      </div>
    </div>
  )
}

function Over({
  hud,
  best,
  onStart,
  wide,
}: {
  hud: Hud
  best: number
  onStart: (officer: boolean) => void
  wide: boolean
}) {
  const missed = hud.missed.slice(-5)
  return (
    <div className="sb-overlay">
      <div
        className="sb-card max-h-full overflow-y-auto"
        style={{ animationDelay: '1.6s' }}
      >
        <p className="text-5xl font-black tabular-nums">{hud.score}</p>
        <p className="mt-1 text-sm text-[var(--sb-dim)]">
          {hud.count} orders · {hud.reached}{' '}
          {hud.reached === 1 ? 'planet' : 'planets'} · best {best}
        </p>
        {missed.length > 0 && (
          <div className="mt-3 text-left">
            <div className="sb-label text-[var(--sb-c)]">Missed</div>
            <ul className="mt-1 space-y-1.5">
              {missed.map((o) => (
                <li
                  key={o.zh}
                  className="flex flex-wrap items-baseline gap-x-2"
                >
                  <Mixed line={o.zh} size={wide ? 'md' : 'sm'} />
                  <span className="text-sm text-[var(--sb-dim)]">{o.en}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => onStart(false)}
            className="sb-pill py-2 text-base"
            style={{ background: 'var(--sb-a)' }}
          >
            Fly again
          </button>
          <button
            type="button"
            onClick={() => onStart(true)}
            className="sb-pill py-2 text-base"
            style={{ background: 'var(--sb-c)' }}
          >
            As an officer
          </button>
        </div>
      </div>
    </div>
  )
}
