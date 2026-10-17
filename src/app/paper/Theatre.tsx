import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Cutout } from './leather'
import { partsOf, puppetOf } from './puppets'
import { spritesOf } from './scenery'
import { Show } from './show'
import { STAGE_W, stageAt } from './stage'
import type { Sprite } from './scenery'
import type { PuppetDef } from './puppets'
import type { Story } from '../data/stories'
import './theatre.css'

// The shadow theatre (皮影戏): a paper screen lit from behind in a carved
// frame, with the story's puppets and scenery pressed against it. `at` is
// the line being played; the stage is what the cues of the lines up to it
// make it. `speaking` is true while the line is heard, so its speaker
// talks. Before the play the screen shows the title; after it, the lamp
// burns lower.

export type Phase = 'title' | 'play' | 'end'

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(m.matches)
    m.addEventListener('change', change)
    return () => m.removeEventListener('change', change)
  }, [])
  return reduced
}

export function Theatre({
  story,
  at,
  beat = 1,
  phase,
  speaking,
  onTap,
}: {
  story: Story
  at: number
  // How many of the line's later beats have come
  beat?: number
  phase: Phase
  speaking: boolean
  onTap?: () => void
}) {
  const reduced = usePrefersReducedMotion()
  const staged = useMemo(() => stageAt(story, at, beat), [story, at, beat])
  const cast = useMemo(
    () =>
      Object.entries(story.cast ?? {}).flatMap(([id, kind]) => {
        const def = puppetOf(kind)
        return def ? [{ id, def }] : []
      }),
    [story],
  )
  const show = useMemo(() => new Show(cast, reduced), [cast, reduced])
  const screen = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const [lit, setLit] = useState(reduced)

  // The stage units fill the screen at any size
  useLayoutEffect(() => {
    const el = screen.current
    if (!el) return
    const fit = () => {
      if (world.current)
        world.current.style.transform = `scale(${el.clientWidth / STAGE_W})`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The puppets move only while the screen can be seen
  useEffect(() => {
    const el = screen.current
    let seen = true
    const update = () => {
      if (seen && !document.hidden) show.start()
      else show.stop()
    }
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting
      update()
    })
    if (el) io.observe(el)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      show.stop()
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [show])

  // The lamp is lit a moment after the screen appears
  useEffect(() => {
    const t = setTimeout(() => setLit(true), 120)
    return () => clearTimeout(t)
  }, [])

  const playing = phase !== 'title'
  useLayoutEffect(() => {
    if (!playing) return
    // at the end, the people on the stage take a bow
    const placed =
      phase === 'end'
        ? Object.fromEntries(
            Object.entries(staged.cast).map(([id, p]) => {
              const def = cast.find((c) => c.id === id)?.def
              return [
                id,
                p && def?.rig === 'human' && !p.ride ? { ...p, act: 'bow' } : p,
              ]
            }),
          )
        : staged.cast
    show.stage({
      ...staged,
      cast: placed,
      by: speaking ? staged.by : undefined,
    })
  }, [show, staged, speaking, playing, phase, cast])

  const zOf = (id: string, i: number) => {
    const p = staged.cast[id]
    return 10 + i + (p?.z ?? 0) * 10 + (p?.ride ? 20 : 0)
  }

  return (
    <div className="pi-theatre">
      <div className="pi-frame">
        <Valance />
        <div className="pi-plaque zh">{story.zh}</div>
        <div className="pi-opening">
          <div
            ref={screen}
            className={`pi-screen ${lit ? '' : 'pi-unlit'} ${phase === 'end' ? 'pi-ended' : ''}`}
            style={{ containerType: 'inline-size' }}
            onClick={onTap}
            role="button"
            tabIndex={-1}
            aria-label="Go on"
          >
            <div className="pi-glow" />
            <div className="pi-flame" />
            <div className="pi-dim" />
            <div className="pi-grain" />
            <div ref={world} className="pi-world">
              <Scenery set={playing ? staged.set : []} />
              {cast.map(({ id, def }, i) => (
                <PuppetView
                  key={id}
                  id={id}
                  def={def}
                  hold={staged.cast[id]?.hold}
                  show={show}
                  z={zOf(id, i)}
                />
              ))}
            </div>
            <div className="pi-vignette" />
            <div className={`pi-title ${playing ? 'pi-away' : ''}`}>
              <span className="zh" style={{ fontSize: '9cqw', lineHeight: 1 }}>
                {story.zh}
              </span>
              <span
                style={{
                  fontSize: '2.4cqw',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  opacity: 0.75,
                }}
              >
                {story.title}
              </span>
            </div>
            <div className="pi-dark" />
          </div>
          <Brackets />
        </div>
      </div>
    </div>
  )
}

function PuppetView({
  id,
  def,
  hold,
  show,
  z,
}: {
  id: string
  def: PuppetDef
  hold?: string
  show: Show
  z: number
}) {
  const parts = useMemo(() => partsOf(def, hold), [def, hold])
  return (
    <div
      className="pi-puppet"
      ref={(el) => show.bindBox(id, el)}
      style={{ zIndex: z, visibility: 'hidden' }}
    >
      {def.rods.map((_, i) => (
        <div
          key={`rod${i}`}
          className="pi-rod"
          ref={(el) => show.bindRod(id, i, el)}
        />
      ))}
      {parts.map((p) => (
        <div
          key={p.id === 'foreN' || p.id === 'propN' ? `${p.id}-${hold}` : p.id}
          className="pi-part"
          ref={(el) => show.bindPart(id, p.id, el)}
          style={{ zIndex: p.z + 1, width: p.box[2], height: p.box[3] }}
        >
          <Cutout shapes={p.shapes} box={p.box} />
        </div>
      ))}
    </div>
  )
}

// --- Scenery: pieces come out of a blur and go back into one ---

function Scenery({ set }: { set: Array<string> }) {
  const [pieces, setPieces] = useState<
    Array<{ name: string; spec: string; away: boolean }>
  >([])
  useEffect(() => {
    const names = new Set(set.map((s) => s.split(':')[0]))
    setPieces((old) => [
      ...set.map((spec) => ({ name: spec.split(':')[0], spec, away: false })),
      ...old
        .filter((p) => !names.has(p.name))
        .map((p) => ({ ...p, away: true })),
    ])
    const t = setTimeout(
      () => setPieces((ps) => ps.filter((p) => !p.away)),
      1000,
    )
    return () => clearTimeout(t)
  }, [set])
  return (
    <>
      {pieces.map((p) => (
        <PieceView key={p.name} spec={p.spec} away={p.away} />
      ))}
    </>
  )
}

function PieceView({ spec, away }: { spec: string; away: boolean }) {
  const sprites = useMemo(() => spritesOf(spec), [spec])
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true)),
    )
    return () => cancelAnimationFrame(r)
  }, [])
  // Sprites that go now go one after another, in their order
  const wasGone = useRef<Array<boolean>>([])
  const delays = useMemo(() => {
    const going = [
      ...new Set(
        sprites
          .filter((s, i) => s.gone && wasGone.current[i] === false)
          .map((s) => s.wait ?? 0),
      ),
    ].sort((a, b) => a - b)
    return sprites.map((s) =>
      s.gone ? Math.max(0, going.indexOf(s.wait ?? 0)) * 0.45 : 0,
    )
  }, [sprites])
  useEffect(() => {
    wasGone.current = sprites.map((s) => !!s.gone)
  }, [sprites])
  const z = Math.max(1, ...sprites.map((s) => s.z ?? 1))
  return (
    <div
      className={`pi-piece ${away || !entered ? 'pi-away' : ''}`}
      style={{ zIndex: z }}
    >
      {sprites.map((s, i) => (
        <SpriteView key={i} s={s} delay={delays[i]} />
      ))}
    </div>
  )
}

function SpriteView({ s, delay }: { s: Sprite; delay: number }) {
  const k = s.scale ?? 1
  const [x, y] = s.gone && s.to ? s.to : s.at
  const turn = s.gone && s.spin ? ` rotate(${s.spin}deg)` : ''
  return (
    <div
      className={`pi-sprite ${s.gone ? 'pi-gone' : ''} ${s.fade ? 'pi-fade' : ''}`}
      style={{
        transform: `translate(${x}px,${y}px)${turn} scale(${s.flip ? -k : k},${k})`,
        transitionDelay: s.gone ? `${delay}s` : '0s',
        opacity: s.gone ? 0 : 1,
        ...(s.glide && !s.gone
          ? { transition: `transform ${s.glide}s ease-in-out` }
          : null),
        ...(s.soft ? { filter: `blur(${s.soft}px)` } : null),
      }}
    >
      <div
        className={s.anim ? `pi-move ${s.anim}` : undefined}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          animationDelay: s.delay ? `${s.delay}s` : undefined,
        }}
      >
        <Cutout
          shapes={s.shapes}
          box={s.box}
          style={{ position: 'absolute', left: s.box[0], top: s.box[1] }}
        />
      </div>
    </div>
  )
}

// --- The frame's ornaments ---

// A red valance along the top of the screen: swags edged in gold, with a
// tassel between each two
function Valance() {
  const swags = Array.from({ length: 16 }, (_, i) => i * 100)
  return (
    <svg
      viewBox="0 0 1600 72"
      className="pointer-events-none absolute z-10"
      style={{
        left: 'clamp(8px, 2.6vw, 26px)',
        right: 'clamp(8px, 2.6vw, 26px)',
        top: 'clamp(30px, 6.5vw, 58px)',
        width: 'calc(100% - 2 * clamp(8px, 2.6vw, 26px))',
        filter: 'drop-shadow(0 3px 3px rgba(40,10,0,0.45))',
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id="pi-cloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a1610" />
          <stop offset="1" stopColor="#b5281c" />
        </linearGradient>
      </defs>
      <path
        d={`M0 0H1600V22${swags
          .map((x) => `Q${1600 - x - 50} 60 ${1600 - x - 100} 22`)
          .join('')}Z`}
        fill="url(#pi-cloth)"
      />
      <path
        d={`M0 22${swags.map((x) => `Q${x + 50} 60 ${x + 100} 22`).join('')}`}
        fill="none"
        stroke="#e2b04f"
        strokeWidth="4"
      />
      <path d="M0 8H1600" stroke="#e2b04f" strokeWidth="2.5" />
      {swags.slice(1).map((x) => (
        <g key={x} transform={`translate(${x} 22)`}>
          <path d="M0 0V18" stroke="#e2b04f" strokeWidth="2.5" />
          <circle cy="20" r="5" fill="#e2b04f" />
          <path d="M-5 24L5 24L7 46L-7 46Z" fill="#c8241a" />
          <path d="M-6 26H6" stroke="#e2b04f" strokeWidth="2" />
        </g>
      ))}
      {swags.map((x) => (
        <circle key={x} cx={x + 50} cy="30" r="4.5" fill="#e2b04f" />
      ))}
    </svg>
  )
}

// Carved brackets in the screen's upper corners (雀替)
function Brackets() {
  const bracket = (
    <path d="M0 0H120C110 6 96 8 84 8C70 8 62 16 62 26C62 38 50 44 40 40C30 36 28 46 30 54C32 66 22 74 12 72C6 70 2 76 4 84C6 92 2 100 0 104Z M18 18C30 18 38 26 34 34C30 40 22 38 22 32" />
  )
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      aria-hidden
    >
      <g
        fill="#2b150b"
        stroke="#d9a441"
        strokeWidth="3"
        transform="translate(6 6) scale(1.3)"
      >
        {bracket}
      </g>
      <g
        fill="#2b150b"
        stroke="#d9a441"
        strokeWidth="3"
        transform="translate(1594 6) scale(-1.3 1.3)"
      >
        {bracket}
      </g>
    </svg>
  )
}
