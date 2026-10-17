import { useEffect, useId, useMemo, useState } from 'react'
import { PAPER_GOLD, PAPER_RED } from './leather'
import './theatre.css'

// A window flower (窗花): red paper folded into a fan, cut, and opened out,
// so every cut is repeated round the circle and mirrored at every fold. One
// fold's cuts are made from a seed (petals, crescents, slits, coins); the
// sheet is red over gold, the gold showing through the holes. It can open
// out as it appears, a fold at a time.

// A cut: a shape drawn round the origin, pointing along +x, put at radius
// r and angle a (radians), turned to point outward. `keep` is paper left
// standing inside a hole.
interface Cut {
  d: string
  r: number
  a: number
  k: number
  keep?: boolean
}

const deg = (rad: number) => (rad * 180) / Math.PI

function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const PETAL = 'M-8 0C-4 -6 6 -7 10 0C6 7 -4 6 -8 0Z'
const DROP = 'M-6 0C-2 -5 6 -5 9 0C6 5 -2 5 -6 0Z'
const CRESCENT = 'M-4 -7A8 8 0 0 1 -4 7A6 6 0 0 0 -4 -7Z'
const DIAMOND = 'M-6 0L0 -4L6 0L0 4Z'
const SLIT = 'M-10 -1.1L10 -1.1L10 1.1L-10 1.1Z'
const DOT = 'M-3 0A3 3 0 1 0 3 0A3 3 0 1 0 -3 0Z'
const CURL =
  'M-6 2C-8 -6 4 -9 6 -2C7 3 1 5 -1 2C-2 0 0 -2 2 -1L1 -3C-4 -4 -5 2 -1 4C4 6 9 1 7 -4C4 -11 -10 -8 -6 2Z'

interface Design {
  folds: number
  // the outline of one fold's sector, and the holes cut in it
  sector: string
  holes: Array<Cut>
}

function design(seed: number, folds: number): Design {
  const r = rng(seed * 7919 + 13)
  const pick = <T,>(xs: Array<T>) => xs[Math.floor(r() * xs.length)]
  const half = Math.PI / folds
  // the rim: scallops, one or two to each half-fold
  const bumps = pick([1, 2])
  const R = 100
  const pt = (rad: number, a: number) =>
    `${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)}`
  let rim = `M0 0L${pt(R - 6, -half - 0.004)}`
  const n = bumps * 2
  for (let i = 0; i < n; i++) {
    const a0 = -half + (i * 2 * half) / n
    const a1 = -half + ((i + 1) * 2 * half) / n
    rim += `Q${pt(R + 5, (a0 + a1) / 2)} ${pt(R - 6, a1 + (i === n - 1 ? 0.004 : 0))}`
  }
  const sector = `${rim}Z`

  const holes: Array<Cut> = []
  // Each cut is made in one half of the fold, and mirrored into the other
  const both = (d: string, rad: number, a: number, k = 1) => {
    holes.push({ d, r: rad, a, k })
    if (a > 0.001) holes.push({ d, r: rad, a: -a, k })
  }
  const mid = half / 2
  // a ring of crescents or drops near the rim
  const outer = pick([CRESCENT, DROP, DIAMOND])
  both(outer, 86, mid, 0.9)
  if (bumps === 2) {
    both(DOT, 92, half * 0.25, 0.7)
    both(DOT, 92, half * 0.75, 0.7)
  }
  // petals pointing out
  const petal = pick([PETAL, DROP, CURL])
  both(petal, 68, mid, pick([1.2, 1.4]))
  both(DOT, 74, 0, 1)
  // slits along the fold, as a knife cuts through the folded paper
  if (r() > 0.4) both(SLIT, 52, 0, 0.8)
  else both(DIAMOND, 52, 0, 1.2)
  both(pick([DOT, DIAMOND, CRESCENT]), 50, half * 0.85, 0.8)
  // an inner ring of small petals, and the coin in the middle
  both(pick([PETAL, DROP]), 32, mid, 0.85)
  both(DOT, 20, 0, 0.8)
  holes.push(
    { d: 'M-10 0A10 10 0 1 0 10 0A10 10 0 1 0 -10 0Z', r: 0, a: 0, k: 1 },
    { d: 'M-3.6 -3.6H3.6V3.6H-3.6Z', r: 0, a: 0, k: 1, keep: true },
  )
  return { folds, sector, holes }
}

// The flower as a group inside a larger svg, `r` across from its middle at
// (x, y); `open` false shows it still folded
export function FlowerCut({
  seed,
  folds = 8,
  x = 0,
  y = 0,
  r = 100,
  open = true,
  gold = true,
  color = PAPER_RED,
}: {
  seed: number
  folds?: number
  x?: number
  y?: number
  r?: number
  open?: boolean
  // A gold sheet under it, and the colour of the cut paper
  gold?: boolean
  color?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const d = useMemo(() => design(seed, folds), [seed, folds])
  const step = 360 / folds
  return (
    <g transform={`translate(${x} ${y}) scale(${r / 100})`}>
      <defs>
        <mask
          id={`${uid}m`}
          maskUnits="userSpaceOnUse"
          x="-120"
          y="-120"
          width="240"
          height="240"
        >
          <rect x="-120" y="-120" width="240" height="240" fill="#fff" />
          {d.holes.map((c, i) => (
            <path
              key={i}
              d={c.d}
              fill={c.keep ? '#fff' : '#000'}
              transform={`rotate(${deg(c.a).toFixed(2)}) translate(${c.r} 0) scale(${c.k})`}
            />
          ))}
        </mask>
      </defs>
      {gold && (
        <circle
          r="96"
          cx="2"
          cy="2.5"
          fill={PAPER_GOLD}
          style={{
            opacity: open ? 1 : 0,
            transition: 'opacity 0.8s ease 0.9s',
          }}
        />
      )}
      {Array.from({ length: folds }, (_, k) => (
        <g
          key={k}
          className="pi-fold"
          style={{
            transform: `rotate(${open ? k * step : 0}deg)`,
            transitionDelay: `${k * 0.07}s`,
          }}
        >
          <path d={d.sector} fill={color} mask={`url(#${uid}m)`} />
        </g>
      ))}
    </g>
  )
}

// A window flower on its own, opening out as it appears (at once with
// reduced motion)
export function WindowFlower({
  seed,
  folds = 8,
  className = '',
  unfold = true,
}: {
  seed: number
  folds?: number
  className?: string
  unfold?: boolean
}) {
  const [open, setOpen] = useState(!unfold)
  useEffect(() => {
    if (!unfold) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpen(true)
      return
    }
    const t = setTimeout(() => setOpen(true), 350)
    return () => clearTimeout(t)
  }, [unfold])
  return (
    <svg
      viewBox="-112 -112 224 224"
      className={className}
      role="img"
      aria-label="Window flower, cut from red paper"
    >
      <FlowerCut seed={seed} folds={folds} open={open} />
    </svg>
  )
}
