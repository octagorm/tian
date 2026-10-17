import { useEffect, useState } from 'react'
import { PALETTE, SPRITES } from './sprites'
import { PORTRAIT_H, PORTRAIT_W, portrait } from './portraits'
import type { Sprite } from './sprites'
import type { Look } from './portraits'
import './pix.css'

export type { Look } from './portraits'

// Sprites and portraits drawn once into data URLs, shown as images scaled
// up without smoothing. An animation is drawn as a strip of its steps side
// by side, and CSS slides the strip a step at a time (pix.css), so playing
// it costs nothing per frame. Animations pause while off screen.

const cache = new Map<string, string>()

function toUrl(
  key: string,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void,
): string {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (!g) return ''
  draw(g)
  const url = c.toDataURL()
  cache.set(key, url)
  return url
}

// One frame of letters at x offset ox
function paint(
  g: CanvasRenderingContext2D,
  rows: Array<string>,
  pal: Record<string, string> | undefined,
  ox: number,
) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') continue
      const c = pal?.[ch] ?? PALETTE[ch]
      if (!c) continue
      g.fillStyle = c
      g.fillRect(ox + x, y, 1, 1)
    }
  })
}

// The steps of a sprite's animation, as indices into its frames
export function steps(sp: Sprite): Array<number> {
  const n = 1 + (sp.frames?.length ?? 0)
  return sp.seq ?? Array.from({ length: n }, (_, i) => i)
}

// The sprite's palette, with the outline in another ink if asked
const inked = (pal: Record<string, string> | undefined, ink?: string) =>
  ink ? { ...pal, K: ink } : pal

function stillUrl(name: string, sp: Sprite, ink?: string) {
  const w = sp.rows[0].length
  return toUrl(`s:${name}:${ink ?? ''}`, w, sp.rows.length, (g) =>
    paint(g, sp.rows, inked(sp.pal, ink), 0),
  )
}

function stripUrl(
  name: string,
  sp: Sprite,
  order: Array<number>,
  ink?: string,
) {
  const frames = [sp.rows, ...(sp.frames ?? [])]
  const w = sp.rows[0].length
  const pal = inked(sp.pal, ink)
  return toUrl(
    `a:${name}:${ink ?? ''}`,
    w * order.length,
    sp.rows.length,
    (g) => order.forEach((f, i) => paint(g, frames[f], pal, i * w)),
  )
}

// Whether an element is on screen, from one observer shared by all
const watched = new Map<Element, (on: boolean) => void>()
let observer: IntersectionObserver | undefined

// A callback ref for the element, and whether it is on screen
function useOnScreen<T extends Element>() {
  const [el, setEl] = useState<T | null>(null)
  const [on, setOn] = useState(true)
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    observer ??= new IntersectionObserver(
      (entries) => {
        for (const e of entries) watched.get(e.target)?.(e.isIntersecting)
      },
      { rootMargin: '64px' },
    )
    watched.set(el, setOn)
    observer.observe(el)
    return () => {
      watched.delete(el)
      observer?.unobserve(el)
    }
  }, [el])
  return [setEl, on] as const
}

export function Pix({
  name,
  size = 48,
  className = '',
  title,
  animate = false,
  ink,
}: {
  name: string
  size?: number
  className?: string
  title?: string
  // Play the sprite's frames, if it has any
  animate?: boolean
  // A colour for the outline in place of the near-black ink, to lift a
  // sprite off a dark backdrop
  ink?: string
}) {
  // Where in its round each animated sprite starts, so a row of them does
  // not move in step
  const [phase] = useState(Math.random)
  const [ref, onScreen] = useOnScreen<HTMLSpanElement>()
  const sp = SPRITES[name]
  if (!sp) return null
  const height = (size * sp.rows.length) / sp.rows[0].length
  if (animate && sp.frames?.length) {
    const order = steps(sp)
    const round = order.length * (sp.ms ?? 150)
    return (
      <span
        ref={ref}
        role={title ? 'img' : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        title={title}
        className={`relative inline-block shrink-0 overflow-hidden ${className}`}
        style={{ width: size, height }}
      >
        <img
          src={stripUrl(name, sp, order, ink)}
          alt=""
          draggable={false}
          className="zh-pix-run"
          style={{
            width: size * order.length,
            height,
            animationDuration: `${round}ms`,
            animationTimingFunction: `steps(${order.length})`,
            animationDelay: `${-Math.round(phase * round)}ms`,
            animationPlayState: onScreen ? 'running' : 'paused',
          }}
        />
      </span>
    )
  }
  return (
    <img
      src={stillUrl(name, sp, ink)}
      alt={title ?? ''}
      title={title}
      width={size}
      height={height}
      className={`inline-block shrink-0 ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

// --- Portraits: a head and shoulders, 24 × 28, from a few traits (Look,
// in portraits.ts). They blink now and then; while `talking` the mouth moves.

// Mouth shapes while talking, in order, and how long each is held
const TALK_ORDER = [0, 2, 1, 0, 1, 2, 0, 1, 1, 2]
const TALK_MS = 110

interface FaceUrls {
  rest: string
  blink: string
  talk: string
}

const faces = new Map<string, FaceUrls>()

function faceUrls(look: Look, ink?: string): FaceUrls {
  const key = `${JSON.stringify(look)}:${ink ?? ''}`
  const hit = faces.get(key)
  if (hit) return hit
  const p = portrait(look)
  const pal = inked(p.pal, ink) ?? p.pal
  const w = PORTRAIT_W
  const h = PORTRAIT_H
  const urls = {
    rest: toUrl(`f:${key}`, w, h, (g) => paint(g, p.rows, pal, 0)),
    blink: toUrl(`fb:${key}`, w, h, (g) => paint(g, p.blink, pal, 0)),
    talk: toUrl(`ft:${key}`, w * TALK_ORDER.length, h, (g) =>
      TALK_ORDER.forEach((f, i) => paint(g, p.talk[f], pal, i * w)),
    ),
  }
  faces.set(key, urls)
  return urls
}

const between = (a: number, b: number) =>
  Math.round(a + Math.random() * (b - a))

export function Face({
  look,
  size = 40,
  className = '',
  talking = false,
  blink = true,
  ink,
}: {
  look: Look
  size?: number
  className?: string
  // The mouth moves while true
  talking?: boolean
  // Blink now and then (on unless false)
  blink?: boolean
  // A colour for the outline, as for Pix
  ink?: string
}) {
  // Each face blinks to its own uneven rhythm: two rounds of different
  // lengths, each ending in a blink, started at random points
  const [t] = useState(() => ({
    a: between(3700, 5300),
    b: between(6100, 8900),
    da: between(0, 5000),
    db: between(0, 9000),
    dt: between(0, TALK_ORDER.length * TALK_MS),
  }))
  const [ref, onScreen] = useOnScreen<HTMLSpanElement>()
  const urls = faceUrls(look, ink)
  const height = (size * PORTRAIT_H) / PORTRAIT_W
  const play = onScreen ? 'running' : 'paused'
  return (
    <span
      ref={ref}
      aria-hidden
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height }}
    >
      <img src={urls.rest} alt="" draggable={false} className="zh-face-layer" />
      {blink && (
        <>
          <img
            src={urls.blink}
            alt=""
            draggable={false}
            className="zh-face-layer zh-face-blink"
            style={{
              animationDuration: `${t.a}ms`,
              animationDelay: `-${t.da}ms`,
              animationPlayState: play,
            }}
          />
          <img
            src={urls.blink}
            alt=""
            draggable={false}
            className="zh-face-layer zh-face-blink zh-face-blink-2"
            style={{
              animationDuration: `${t.b}ms`,
              animationDelay: `-${t.db}ms`,
              animationPlayState: play,
            }}
          />
        </>
      )}
      {talking && (
        <span className="zh-face-layer overflow-hidden">
          <img
            src={urls.talk}
            alt=""
            draggable={false}
            className="zh-pix-run"
            style={{
              width: `${TALK_ORDER.length * 100}%`,
              height: '100%',
              animationDuration: `${TALK_ORDER.length * TALK_MS}ms`,
              animationTimingFunction: `steps(${TALK_ORDER.length})`,
              animationDelay: `-${t.dt}ms`,
              animationPlayState: play,
            }}
          />
        </span>
      )}
    </span>
  )
}
