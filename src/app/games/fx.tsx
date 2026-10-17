import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { Volume2 } from 'lucide-react'
import { say } from '../lib/audio'
import { WORD_VOICE } from '../lib/speech'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import './fx.css'

// Feedback for the learning games, so an answer feels like something: a
// burst of pixels and a floating +1 for a right one, a shake for a wrong
// one, a combo that grows with a streak, keys for everything (1–4 to
// choose, Enter to go on, Space to hear it again), and a play button that
// ripples while the voice speaks. The bursts and points are plain DOM in a
// layer of their own, moved by the Web Animations API, so they cost React
// nothing. With prefers-reduced-motion they are left out or kept still.

export const COLORS = {
  paper: '#fffaf1',
  ink: '#221c18',
  red: '#c8372d',
  jade: '#2f7d6d',
  gold: '#d9a441',
  yellow: '#f2c14e',
} as const

export function reducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(reducedMotion)
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduce(m.matches)
    m.addEventListener('change', change)
    return () => m.removeEventListener('change', change)
  }, [])
  return reduce
}

// --- The layer over everything, for bursts and floating points ---

let layer: HTMLDivElement | null = null
function fxLayer(): HTMLDivElement {
  if (layer?.isConnected) return layer
  layer = document.createElement('div')
  layer.className = 'fx-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)
  return layer
}

// Where an effect starts: an element's middle, or a point on screen
export type At = Element | { x: number; y: number } | null | undefined

function point(at: At): { x: number; y: number } | null {
  if (!at) return null
  if ('getBoundingClientRect' in at) {
    const r = at.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  return at
}

const pickOf = <T,>(xs: ReadonlyArray<T>) =>
  xs[Math.floor(Math.random() * xs.length)]

// Square bits of colour flung out from a point, falling a little as they
// fade: the pixel-art spark of a right answer
export function burst(
  at: At,
  {
    colors = [COLORS.gold, COLORS.yellow, COLORS.jade, COLORS.paper],
    n = 16,
    spread = 70,
  }: { colors?: ReadonlyArray<string>; n?: number; spread?: number } = {},
) {
  const p = point(at)
  if (!p || reducedMotion()) return
  const root = fxLayer()
  for (let i = 0; i < n; i++) {
    const bit = document.createElement('i')
    bit.className = 'fx-bit'
    const size = 4 + Math.round(Math.random() * 4)
    bit.style.cssText = `left:${p.x}px;top:${p.y}px;width:${size}px;height:${size}px;background:${pickOf(colors)}`
    root.appendChild(bit)
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6
    const r = spread * (0.45 + Math.random() * 0.75)
    const dx = Math.cos(a) * r
    const dy = Math.sin(a) * r
    const anim = bit.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx * 0.8}px), calc(-50% + ${dy * 0.8}px)) scale(1)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 26}px)) scale(0.3)`,
          opacity: 0,
        },
      ],
      {
        duration: 650 + Math.random() * 350,
        easing: 'cubic-bezier(0.15, 0.7, 0.3, 1)',
      },
    )
    anim.onfinish = () => bit.remove()
  }
}

// A ring that spreads from a point and fades, under a burst
export function ring(at: At, color: string = COLORS.jade, size = 120) {
  const p = point(at)
  if (!p || reducedMotion()) return
  const el = document.createElement('i')
  el.className = 'fx-bit'
  el.style.cssText = `left:${p.x}px;top:${p.y}px;width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${color}`
  fxLayer().appendChild(el)
  el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.15)', opacity: 0.9 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
    ],
    { duration: 520, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  ).onfinish = () => el.remove()
}

// Words that rise from a point and fade: +1, ¥18, ×2
export function floatText(
  at: At,
  text: string,
  {
    color = COLORS.jade,
    size = 26,
    outline = COLORS.paper,
  }: { color?: string; size?: number; outline?: string } = {},
) {
  const p = point(at)
  if (!p) return
  const el = document.createElement('div')
  el.className = 'fx-float'
  el.textContent = text
  el.style.cssText = `left:${p.x}px;top:${p.y}px;color:${color};font-size:${size}px;--fx-outline:${outline}`
  fxLayer().appendChild(el)
  const still = reducedMotion()
  el.animate(
    still
      ? [
          { transform: 'translate(-50%, -50%)', opacity: 1 },
          { transform: 'translate(-50%, -50%)', opacity: 0 },
        ]
      : [
          { transform: 'translate(-50%, -40%) scale(0.5)', opacity: 0 },
          {
            transform: 'translate(-50%, -110%) scale(1.15)',
            opacity: 1,
            offset: 0.18,
          },
          {
            transform: 'translate(-50%, -150%) scale(1)',
            opacity: 1,
            offset: 0.55,
          },
          { transform: 'translate(-50%, -260%) scale(0.95)', opacity: 0 },
        ],
    { duration: still ? 900 : 1100, easing: 'ease-out' },
  ).onfinish = () => el.remove()
}

// Everything a right answer does at once
export function cheer(at: At, text = '+1') {
  burst(at)
  ring(at)
  floatText(at, text)
}

// Paper confetti from the top, for a round well done
export function confetti(n = 70) {
  if (reducedMotion()) return
  const root = fxLayer()
  const w = window.innerWidth
  const h = window.innerHeight
  const colors = [COLORS.red, COLORS.gold, COLORS.yellow, COLORS.jade, '#fff']
  for (let i = 0; i < n; i++) {
    const bit = document.createElement('i')
    bit.className = 'fx-bit'
    const long = Math.random() < 0.6
    const x = Math.random() * w
    bit.style.cssText = `left:${x}px;top:-16px;width:${long ? 6 : 8}px;height:${long ? 12 : 8}px;background:${pickOf(colors)}`
    root.appendChild(bit)
    const drift = (Math.random() - 0.5) * 160
    const spin = (Math.random() - 0.5) * 900
    const delay = Math.random() * 450
    bit.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${drift * 0.6}px, ${h * 0.55}px) rotate(${spin * 0.6}deg)`,
          opacity: 1,
          offset: 0.6,
        },
        {
          transform: `translate(${drift}px, ${h + 40}px) rotate(${spin}deg)`,
          opacity: 0.6,
        },
      ],
      {
        duration: 1700 + Math.random() * 1300,
        delay,
        easing: 'cubic-bezier(0.25, 0.4, 0.5, 1)',
        fill: 'backwards',
      },
    ).onfinish = () => bit.remove()
  }
}

// Things that move to a new place glide there instead of jumping: after
// each render, every element under `root` with a data-flip id that has
// moved since the last one is played back from where it was (FLIP). Places
// are measured from the root, so scrolling the page moves nothing.
export function useFlip(root: RefObject<HTMLElement | null>) {
  const last = useRef(new Map<string, { x: number; y: number }>())
  const lastRoot = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const base = el.getBoundingClientRect()
    const next = new Map<string, { x: number; y: number }>()
    // a new root (a new round) starts afresh
    const still = reducedMotion() || el !== lastRoot.current
    lastRoot.current = el
    el.querySelectorAll<HTMLElement>('[data-flip]').forEach((item) => {
      const id = item.dataset.flip ?? ''
      const r = item.getBoundingClientRect()
      const at = { x: r.left - base.left, y: r.top - base.top }
      next.set(id, at)
      const was = last.current.get(id)
      if (!was || still) return
      const dx = was.x - at.x
      const dy = was.y - at.y
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      item.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      )
    })
    last.current = next
  })
}

// Plays an animation class on an element once, even if it is already on
export function replay(el: Element | null | undefined, cls: string) {
  if (!el) return
  el.classList.remove(cls)
  void (el as HTMLElement).offsetWidth
  el.classList.add(cls)
}

// --- Keys ---

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

// Keys for a game, while `on`. The handler sees every key not typed into a
// field and not held with a modifier, and returns true if it used it.
export function useKeys(
  handler: (key: string, e: KeyboardEvent) => boolean | undefined | void,
  on = true,
) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!on) return
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      // what is typed into a field is the field's, but Escape
      if (typing(e.target) && e.key !== 'Escape') return
      if (ref.current(e.key, e)) e.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [on])
}

// A keycap, shown only where there is a keyboard and a mouse
export function Key({ k, className = '' }: { k: string; className?: string }) {
  return (
    <kbd className={`fx-key ${className}`} aria-hidden="true">
      {k}
    </kbd>
  )
}

// --- Speaking ---

// say(), with whether it is speaking now, for a button that ripples
export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false)
  const turn = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const play = useCallback((text: string, voice: string = WORD_VOICE) => {
    const me = ++turn.current
    setSpeaking(true)
    return say(text, voice).then(() => {
      if (alive.current && me === turn.current) setSpeaking(false)
    })
  }, [])
  return { speaking, play }
}

// The big round button that says it again, rippling while it speaks
export function PlayButton({
  onClick,
  speaking,
  size = 88,
  label = 'Hear it again',
  hint = true,
  className = '',
}: {
  onClick: () => void
  speaking: boolean
  size?: number
  label?: string
  // Show the Space keycap under it
  hint?: boolean
  className?: string
}) {
  return (
    <span className={`relative inline-flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="relative inline-flex items-center justify-center rounded-full bg-[var(--jade)] text-white shadow-[0_6px_0_#1f5a4e,0_10px_24px_-8px_rgba(31,90,78,0.7)] transition active:translate-y-1 active:shadow-[0_2px_0_#1f5a4e]"
        style={{ width: size, height: size }}
      >
        {speaking && (
          <>
            <span className="fx-ripple absolute inset-0 rounded-full border-2 border-[var(--jade)]" />
            <span
              className="fx-ripple absolute inset-0 rounded-full border-2 border-[var(--jade)]"
              style={{ animationDelay: '0.45s' }}
            />
          </>
        )}
        <Volume2 size={size * 0.42} className={speaking ? 'fx-bump' : ''} />
      </button>
      {hint && <Key k="Space" className="mt-2" />}
    </span>
  )
}

// --- Progress and the combo ---

// A bar for questions done, with a tick for each, that eases forward
export function Progress({
  at,
  of,
  missed = [],
  className = '',
}: {
  at: number
  of: number
  // The segments answered wrong, counted from 0, shown red
  missed?: Array<number>
  className?: string
}) {
  const f = of ? Math.min(1, at / of) : 0
  const last = Math.min(at, of) - 1
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--paper-2)] shadow-[inset_0_1px_2px_rgba(34,28,24,0.15)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={of}
        aria-valuenow={at}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(180deg,#3f9a87,#2f7d6d)] transition-[width] duration-500 ease-[cubic-bezier(0.3,1.3,0.5,1)]"
          style={{ width: `${f * 100}%` }}
        >
          <span className="absolute inset-x-1 top-0.5 h-1 rounded-full bg-white/30" />
        </div>
        {missed
          .filter((i) => i <= last)
          .map((i) => (
            <span
              key={i}
              className={`absolute inset-y-0 bg-[linear-gradient(180deg,#d65645,#b3342a)] ${i === last ? 'rounded-r-full' : ''}`}
              style={{ left: `${(i / of) * 100}%`, width: `${100 / of}%` }}
            >
              <span className="absolute inset-x-0 top-0.5 h-1 bg-white/25" />
            </span>
          ))}
        {of <= 30 &&
          Array.from({ length: of - 1 }, (_, i) => (
            <span
              key={i}
              className="absolute inset-y-0 w-px bg-[var(--paper)]/70"
              style={{ left: `${((i + 1) / of) * 100}%` }}
            />
          ))}
      </div>
      <span className="text-xs font-bold text-[var(--ink-2)] tabular-nums">
        {Math.min(at, of)}/{of}
      </span>
    </div>
  )
}

// A flame of 8 × 10 pixels in two frames, for the combo
const FLAME = [
  [
    '...R....',
    '...RR...',
    '..RRO...',
    '..ROOR..',
    '.RROYOR.',
    '.ROYYOR.',
    'RROYWYOR',
    'ROYWWYOR',
    '.ROYYOR.',
    '..RRRR..',
  ],
  [
    '....R...',
    '...RR...',
    '...ROR..',
    '..ROOR..',
    '.RROYOR.',
    '.ROYYORR',
    'RROYWYOR',
    'ROYWWYOR',
    '.ROYYOR.',
    '..RRRR..',
  ],
]
const FLAME_PAL: Record<string, string> = {
  R: '#c8372d',
  O: '#e07a2a',
  Y: '#f2c14e',
  W: '#fff3c4',
}

// Frames of a sprite, written as rows of letters, side by side in one
// image (a sheet for the fx-frames animation)
const sheets = new Map<string, string>()
export function sheetUrl(
  key: string,
  frames: Array<Array<string>>,
  pal: Record<string, string>,
): string {
  const hit = sheets.get(key)
  if (hit !== undefined) return hit
  const w = frames[0][0].length
  const h = frames[0].length
  const c = document.createElement('canvas')
  c.width = w * frames.length
  c.height = h
  const g = c.getContext('2d')
  if (!g) return ''
  frames.forEach((rows, f) =>
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]] as string | undefined
        if (!col) continue
        g.fillStyle = col
        g.fillRect(f * w + x, y, 1, 1)
      }
    }),
  )
  const url = c.toDataURL()
  sheets.set(key, url)
  return url
}

// A sprite sheet, stepped through its frames
export function Frames({
  name,
  frames,
  pal,
  scale = 3,
  fps = 4,
  className = '',
  still = false,
}: {
  name: string
  frames: Array<Array<string>>
  pal: Record<string, string>
  scale?: number
  fps?: number
  className?: string
  still?: boolean
}) {
  const w = frames[0][0].length * scale
  const h = frames[0].length * scale
  const style = {
    width: w,
    height: h,
    backgroundImage: `url(${sheetUrl(name, frames, pal)})`,
    backgroundSize: `${w * frames.length}px ${h}px`,
    '--fx-w': `${w}px`,
    '--fx-n': frames.length,
    '--fx-t': `${frames.length / fps}s`,
  } as CSSProperties
  return (
    <span
      className={`inline-block shrink-0 ${still ? '' : 'fx-frames'} ${className}`}
      style={{
        ...style,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
      aria-hidden="true"
    />
  )
}

export function Flame({
  scale = 2,
  still,
}: {
  scale?: number
  still?: boolean
}) {
  return (
    <Frames
      name="flame"
      frames={FLAME}
      pal={FLAME_PAL}
      scale={scale}
      fps={6}
      still={still}
    />
  )
}

// The streak of right answers, as a flame that grows: it shows from two in
// a row, warms at five and burns at ten; a slip breaks it
export function Combo({
  n,
  className = '',
}: {
  n: number
  className?: string
}) {
  // The streak just lost, shown breaking for a moment
  const [prev, setPrev] = useState(n)
  const [broke, setBroke] = useState<number | null>(null)
  if (n !== prev) {
    setPrev(n)
    setBroke(n === 0 && prev >= 3 ? prev : null)
  }
  useEffect(() => {
    if (broke === null) return
    const t = setTimeout(() => setBroke(null), 650)
    return () => clearTimeout(t)
  }, [broke])
  const shown = n >= 2 ? n : broke
  if (shown === null || shown < 2)
    return <span className={`inline-block h-8 w-16 ${className}`} />
  const hot = shown >= 10
  const warm = shown >= 5
  return (
    <span
      className={`fx-combo inline-flex h-8 items-center gap-1 rounded-full pr-3 pl-2 font-black tabular-nums ${broke !== null && n === 0 ? 'fx-break' : ''} ${hot ? 'fx-combo-hot bg-[var(--red)] text-[#fff6ea]' : warm ? 'bg-[#e07a2a] text-[#fff6ea]' : 'bg-[var(--gold)]/25 text-[var(--ink)]'} ${className}`}
      title={`${shown} right in a row`}
    >
      <Flame scale={hot ? 2.4 : 2} still={broke !== null && n === 0} />
      <span key={shown} className="fx-bump inline-block text-lg leading-none">
        ×{shown}
      </span>
    </span>
  )
}

// --- Numbers that count up ---

export function CountUp({
  to,
  ms = 900,
  className = '',
  format = (v: number) => String(v),
}: {
  to: number
  ms?: number
  className?: string
  format?: (v: number) => string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const fmt = useRef(format)
  fmt.current = format
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion() || to === 0) {
      el.textContent = fmt.current(to)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const e = 1 - (1 - k) ** 3
      el.textContent = fmt.current(Math.round(to * e))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {format(0)}
    </span>
  )
}

// --- A red seal ---

// A seal's impression in red with its characters left white, worn at the
// edges as a stone seal prints: one character large, two in a column, four
// in two columns read from the right. `stamp` brings it down with a jolt.
export function Seal({
  text,
  size = 64,
  stamp = false,
  className = '',
  delay = 0,
}: {
  text: string
  size?: number
  stamp?: boolean
  className?: string
  delay?: number
}) {
  const chars = [...text]
  const cells: Array<[string, number, number, number]> =
    chars.length === 1
      ? [[chars[0], 30, 31, 36]]
      : chars.length === 2
        ? [
            [chars[0], 30, 19.5, 22],
            [chars[1], 30, 42, 22],
          ]
        : [
            [chars[0], 41, 19.5, 21],
            [chars[1], 41, 42, 21],
            [chars[2], 19, 19.5, 21],
            [chars[3], 19, 42, 21],
          ]
  return (
    <svg
      viewBox="0 0 60 60"
      width={size}
      height={size}
      className={`${stamp ? 'fx-stamp' : ''} ${className}`}
      style={{ animationDelay: `${delay}ms`, transform: 'rotate(-6deg)' }}
      role="img"
      aria-label={`A seal: ${text}`}
    >
      <defs>
        <filter id="fx-seal-worn" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed="7"
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -7 4.9"
            result="holes"
          />
          <feComposite
            in="SourceGraphic"
            in2="holes"
            operator="in"
            result="worn"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06"
            numOctaves="2"
            seed="3"
            result="warp"
          />
          <feDisplacementMap in="worn" in2="warp" scale="2.4" />
        </filter>
      </defs>
      <g filter="url(#fx-seal-worn)">
        <rect x="4" y="4" width="52" height="52" rx="4" fill="#c8372d" />
        {cells.map(([c, x, y, s], i) => (
          <text
            key={i}
            x={x}
            y={y}
            fontSize={s}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff3ea"
            fontFamily="'Kaiti SC', 'STKaiti', 'KaiTi', 'BiauKai', 'Noto Serif SC', serif"
            fontWeight="700"
          >
            {c}
          </text>
        ))}
      </g>
    </svg>
  )
}

// --- A card that turns over in 3D ---

// The two faces share the card's size: give it one with className (or let
// the front, which is in the flow, set it)
export function Card3D({
  turned,
  front,
  back,
  className = '',
  faceClassName = '',
  style,
}: {
  turned: boolean
  front: ReactNode
  back: ReactNode
  className?: string
  faceClassName?: string
  style?: CSSProperties
}) {
  return (
    <div className={`fx-scene ${className}`} style={style}>
      <div className={`fx-card3d h-full w-full ${turned ? 'fx-turned' : ''}`}>
        <div className={`fx-face ${faceClassName}`} aria-hidden={turned}>
          {front}
        </div>
        <div
          className={`fx-face fx-face-back ${faceClassName}`}
          aria-hidden={!turned}
        >
          {back}
        </div>
      </div>
    </div>
  )
}
