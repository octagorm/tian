import { useEffect, useRef, useState } from 'react'
import {
  CircleCheck,
  CircleX,
  Headphones,
  House,
  Pause,
  Play,
  Shield,
  Users,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react'
import { ACTIONS, CAPTAIN_VOICE, VOYAGE } from '../data/bridge'
import { SPEAKERS, speakerOf } from '../data/encounters'
import { PLAYER_LOOK } from '../data/trip'
import { plain, tokens } from '../lib/text'
import { blip, stop as hush, say } from '../lib/audio'
import { useStore } from '../lib/store'
import { Frame, Mixed, tokenLevel } from '../ui'
import { Face } from '../pixel/Pix'
import { Flight, MEET_AT, PER_LEG } from './bridge/flight'
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
// the danger arrives. On each leg something happens between the orders
// (data/encounters.ts): someone hails the ship, or the crew bring a
// choice, and you answer in Chinese. Cadets see what is said (in mixed
// text); officers only hear it, for double points. The voyage goes from
// Earth to the moon, Mars, Jupiter and Saturn and home; the scene is
// low-poly 3D (games/bridge/), the rules are in bridge/flight.ts.

// Words first met here, so the first orders show in Chinese
const FIRST_WORDS = ['往', '左', '右', '上', '下', '开火']

// The player at the helm, as on the trip
const PLAYER: Look = {
  style: PLAYER_LOOK.style,
  hair: PLAYER_LOOK.hair,
  coat: PLAYER_LOOK.coat,
}

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

// The words of a line the player has met: these are the ones it tests
function shownWords(zh: string, home: string, levelOf: (id: string) => Level) {
  return tokens(zh, { home })
    .filter((t) => !t.punct && tokenLevel(t, levelOf) > 0)
    .flatMap((t) => (t.id ? [t.id] : []))
}

const orderWords = (o: Order, home: string, levelOf: (id: string) => Level) =>
  shownWords(o.zh, home, levelOf)

// Whoever is speaking: the player and the crew drawn as people, an alien
// as its face cut from its picture on the viewscreen
function SpeakerFace({
  who,
  size,
  talking,
}: {
  who: string
  size: number
  talking: boolean
}) {
  if (who === 'you') return <Face look={PLAYER} size={size} talking={talking} />
  const s = SPEAKERS[who] ?? SPEAKERS.Captain
  if (s.alien) return <AlienFace id={s.alien} size={size} />
  return <Face look={s.look ?? PLAYER} size={size} talking={talking} />
}

// The pictures (public/art/aliens/, 600 × 400) are measured here as 144 ×
// 96; a face is cut from around this point, 52 wide
const FACE_AT: Record<string, [number, number]> = {
  kid: [59, 41],
  mum: [69, 36],
  crystal: [72, 34],
  pirate: [72, 39],
  boss: [72, 34],
  robot: [70, 29],
  trader: [72, 43],
  dragon: [72, 41],
  pilot: [70, 36],
}
const FACE_W = 52

function AlienFace({ id, size }: { id: string; size: number }) {
  const [x, y] = FACE_AT[id] ?? [72, 38]
  const k = size / FACE_W
  const h = (size * 28) / 24
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{
        width: size,
        height: h,
        backgroundImage: `url(/art/aliens/${id}.webp)`,
        backgroundSize: `${144 * k}px ${96 * k}px`,
        backgroundPosition: `${size / 2 - x * k}px ${h / 2 - y * k}px`,
      }}
    />
  )
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
  // The alien on the viewscreen during an encounter: the last who spoke
  const [onScreen, setOnScreen] = useState<string | null>(null)
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

  // The alien on screen: whoever of the encounter's cast spoke last
  useEffect(() => {
    if (!hud?.encounter) {
      setOnScreen(null)
      return
    }
    if (hud.encounter.cast.includes(hud.who)) setOnScreen(hud.who)
  }, [hud?.encounter, hud?.who])

  const speak = (zh: string, voice: string = CAPTAIN_VOICE) => {
    const id = ++talkId.current
    setTalking(true)
    return say(
      plain(zh, { home: latest.current.settings.home }),
      voice,
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
    setOnScreen(null)
    s.setPaused(false)
    const f = new Flight(s, {
      officer: asOfficer,
      // ?meet=dragon#bridge begins with that encounter
      meet: new URLSearchParams(location.search).get('meet') ?? undefined,
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
      onMeet: (e) => {
        const { bank: now, meet: m } = latest.current
        m(e.words.filter((id) => !now.cards[id]))
      },
      onAnswered: ({ question, reply, right }) => {
        const { record, levelOf, settings } = latest.current
        const asked = shownWords(question, settings.home, levelOf)
        if (right) {
          const ids = new Set([
            ...asked,
            ...shownWords(reply.zh, settings.home, levelOf),
          ])
          for (const id of ids) record(id, true, asOfficer ? 0.7 : 0.5)
        } else for (const id of asked) record(id, false, 0.4)
        blip(right ? 'right' : 'wrong')
      },
      onArrived: () => latest.current.points(3),
      onOver: (h) => {
        latest.current.setBest('bridge', h.score)
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

  const choose = (k: number) => {
    if (mode !== 'play' || paused) return
    flight.current?.choose(k)
  }

  const replay = () => {
    const zh = hud?.order?.zh ?? hud?.line?.zh
    if (!zh || !hud) return
    const who = hud.order ? 'Captain' : hud.who
    const voice =
      who === 'you' ? 'Puck' : (speakerOf(who)?.voice ?? CAPTAIN_VOICE)
    void speak(zh, voice)
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

  const choosing = mode === 'play' && hud?.phase === 'choose' && !paused

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
      if (choosing) {
        const n = Number(e.key)
        if (n >= 1 && n <= hud.replies.length) {
          e.preventDefault()
          if (!e.repeat) choose(n - 1)
        } else if (e.key === ' ') {
          e.preventDefault()
          if (!e.repeat) replay()
        }
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
  const meeting = !!hud?.encounter && !hud.met
  const replying =
    mode === 'play' && !!hud?.encounter && hud.replies.length > 0 && !order
  const who = order ? 'Captain' : (hud?.who ?? 'Captain')
  const speaker = who === 'you' ? null : (SPEAKERS[who] ?? SPEAKERS.Captain)

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
              {hud?.shield && (
                <span title="A shield, given as a present: it takes the next blow">
                  <Shield size={16} className="text-[var(--sb-f)]" />
                </span>
              )}
              {(hud?.allies ?? 0) > 0 && (
                <span
                  className="flex items-center gap-1 text-xs font-bold text-[var(--sb-g)]"
                  title="Friends made on the way"
                >
                  <Users size={15} />
                  {hud?.allies}
                </span>
              )}
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
            {mode === 'play' && onScreen && !order && (
              <Hail
                who={onScreen}
                talking={talking && who === onScreen}
                wide={wide}
              />
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
            {mode === 'play' && hud?.award && (
              <div
                key={`a${hud.award.id}`}
                className="sb-award"
                style={{
                  color: hud.award.n >= 0 ? 'var(--sb-f)' : 'var(--sb-e)',
                }}
              >
                {hud.award.n >= 0 ? `+${hud.award.n}` : `−${-hud.award.n}`}
              </div>
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
                  meetAt={MEET_AT}
                  met={hud.met}
                  meeting={meeting}
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
              <SpeakerFace who={who} size={wide ? 56 : 42} talking={talking} />
            </div>
            <div className="sb-comm-body">
              <div className="sb-label text-[var(--sb-c)]">
                {speaker ? speaker.name : 'You'}{' '}
                {speaker && (
                  <span className="zh text-sm tracking-normal normal-case">
                    {plain(speaker.zh, { home: '' })}
                  </span>
                )}
                {talking && (
                  <span className="sb-talk" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
              <Said hud={hud} officer={officer} talking={talking} wide={wide} />
              {(order ?? hud.line) && (
                <button
                  type="button"
                  onClick={replay}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-[var(--sb-g)] hover:bg-white/10"
                  aria-label="Hear it again"
                  title={choosing ? 'Hear it again (space)' : 'Hear it again'}
                >
                  <Volume2 size={22} />
                </button>
              )}
            </div>
          </div>
        )}
        {mode !== 'ready' &&
          (replying ? (
            <Replies
              hud={hud}
              wide={wide}
              disabled={!choosing}
              onChoose={choose}
            />
          ) : (
            <Helm onAct={act} done={hud?.done ?? []} disabled={!live} />
          ))}
      </div>
    </Frame>
  )
}

// What is being said: the captain's order (hidden from officers until it
// is settled), or a line of the voyage or an encounter. In an encounter an
// officer hears a line before seeing it, and the question before the
// replies only once one is picked; a cadet sees the question's English
// only then.
function Said({
  hud,
  officer,
  talking,
  wide,
}: {
  hud: Hud
  officer: boolean
  talking: boolean
  wide: boolean
}) {
  // An encounter's lines are longer: smaller on a phone, so the replies fit
  const size = wide ? 'lg' : hud.encounter ? 'sm' : 'md'
  const o = hud.order
  if (o) {
    const settled = hud.phase !== 'order'
    return (
      <div className="mt-1">
        {!officer || settled ? (
          <Mixed key={o.zh} line={o.zh} size={size} />
        ) : (
          <Listen />
        )}
        {settled && (
          <div className="mt-1 text-sm text-[var(--sb-dim)]">{o.en}</div>
        )}
      </div>
    )
  }
  const line = hud.line
  if (!line) return null
  const asking = hud.question && hud.who !== 'you'
  const answered = hud.picked !== null
  const inEncounter = !!hud.encounter && hud.who !== 'you'
  const hidden = officer && inEncounter && (asking ? !answered : talking)
  const english = !asking || answered
  return (
    <div className="mt-1">
      {hidden ? <Listen /> : <Mixed key={line.zh} line={line.zh} size={size} />}
      {english && !hidden && (
        <div className="mt-1 text-sm text-[var(--sb-dim)]">{line.en}</div>
      )}
    </div>
  )
}

function Listen() {
  return (
    <span className="text-[var(--sb-dim)] italic">
      <Headphones size={15} className="mr-1 mb-0.5 inline" />
      …listen
    </span>
  )
}

// The alien hailing the ship, framed on the viewscreen: a picture of it
// where it is, a stop-motion puppet as if from the original series
function Hail({
  who,
  talking,
  wide,
}: {
  who: string
  talking: boolean
  wide: boolean
}) {
  const s = speakerOf(who)
  if (!s?.alien) return null
  const width = wide ? 300 : 168
  return (
    <div key={who} className="sb-hail" data-talking={talking ? '1' : '0'}>
      <div className="sb-hail-bar">
        <span className="sb-label">{s.name}</span>
        {talking && (
          <span className="sb-talk sb-talk-dark" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        )}
        <span className="zh ml-auto text-sm">{plain(s.zh, { home: '' })}</span>
      </div>
      <div className="sb-hail-face">
        <img
          src={`/art/aliens/${s.alien}.webp`}
          alt=""
          width={width}
          height={(width * 2) / 3}
          draggable={false}
          className="block"
        />
      </div>
    </div>
  )
}

// The replies to choose from, in Chinese: 1 to 3, or a tap
function Replies({
  hud,
  wide,
  disabled,
  onChoose,
}: {
  hud: Hud
  wide: boolean
  disabled: boolean
  onChoose: (k: number) => void
}) {
  return (
    <div
      className="sb-replies"
      role="group"
      aria-label={
        hud.who === 'Captain' || hud.who === 'Engineer'
          ? 'Your call'
          : 'Your reply'
      }
    >
      {hud.replies.map((r, k) => {
        const picked = hud.picked === k
        return (
          <button
            key={`${hud.encounter?.id}-${r.zh}`}
            type="button"
            className={`sb-reply ${hud.tried.includes(k) ? 'zh-shake' : ''}`}
            data-picked={picked ? '1' : '0'}
            disabled={
              disabled ||
              hud.tried.includes(k) ||
              (hud.picked !== null && !picked)
            }
            onClick={() => onChoose(k)}
          >
            <span className="sb-reply-num">{k + 1}</span>
            <span className="pointer-events-none min-w-0">
              <Mixed
                line={r.zh}
                size={wide && hud.replies.length < 3 ? 'md' : 'sm'}
                still
              />
            </span>
          </button>
        )
      })}
    </div>
  )
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
          do what you hear before the danger arrives. On the way, aliens hail
          the ship and the crew ask what to do: answer them in Chinese.{' '}
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
            Cadet: see what is said
          </button>
          <button
            type="button"
            onClick={() => onStart(true)}
            className="sb-pill py-2 text-base"
            style={{ background: 'var(--sb-c)' }}
          >
            Officer: only hear it
          </button>
        </div>
        <p className="mt-3 hidden text-xs text-[var(--sb-dim)] sm:block">
          Arrows steer · space fires · S shields · F faster · D slower · X stops
          · 1–3 reply · P pauses
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
  const missed = hud.missed.slice(-4)
  return (
    <div className="sb-overlay">
      <div
        className="sb-card max-h-full overflow-y-auto"
        style={{ animationDelay: hud.home ? '0.4s' : '1.6s' }}
      >
        {hud.home && (
          <p className="sb-label flex items-center justify-center gap-2 text-[var(--sb-g)]">
            <House size={14} /> Home again
          </p>
        )}
        <p className="text-5xl font-black tabular-nums">{hud.score}</p>
        <p className="mt-1 text-sm text-[var(--sb-dim)]">
          {hud.count} orders · {hud.reached}{' '}
          {hud.reached === 1 ? 'planet' : 'planets'}
          {hud.home && hud.bonus > 0 ? ` · +${hud.bonus} for the hull` : ''} ·
          best {best}
        </p>
        {hud.log.length > 0 && (
          <div className="sb-log">
            <div className="sb-label text-[var(--sb-c)]">Captain’s log</div>
            <ul className="mt-1.5 space-y-1.5">
              {hud.log.map((l) => (
                <li key={`${l.leg}-${l.title}`}>
                  <PlanetIcon id={l.leg} size={16} />
                  <span>
                    <span className="font-bold">{l.title}.</span>{' '}
                    <span className="text-[var(--sb-dim)]">{l.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
