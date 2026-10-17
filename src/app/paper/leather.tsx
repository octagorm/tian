import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'

// Cut figures, drawn once and shown two ways. A figure is made of shapes:
// pieces of dyed leather, lines of leather left standing, and holes. On the
// lit screen of the shadow theatre (皮影) the leather is translucent and
// glows in its dye, holes let the lamp through and the lines stay dark.
// Cut from paper (剪纸), for the covers, the same shapes are red or gold
// paper, a face is paper too, and the lines are cut out of it.

export type Dye =
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'black'
  | 'hide'
  | 'pale'
  | 'purple'
  | 'orange'

// Patterns of holes, as cut into the leather of robes, rocks and clouds
export type Cut =
  | 'dots'
  | 'scales'
  | 'lattice'
  | 'coins'
  | 'flowers'
  | 'curls'
  | 'stripes'
  | 'waves'
  | 'teeth'
  | 'hex'

export interface Shape {
  d: string
  // A piece of leather in this dye (undyed hide if none)
  dye?: Dye
  // Holes cut into it in a pattern, `cs` times the usual size
  cut?: Cut
  cs?: number
  // Cut away, with its outline left: a hero's face, a window
  open?: boolean
  // A line of leather this wide, not a filled piece
  line?: number
  // No seam cut round it on paper
  join?: boolean
  // How much light the leather lets through: its dye's strength, 0–1
  alpha?: number
  // No dark rim round it
  bare?: boolean
}

export type Material = 'leather' | 'paper'

// Translucent leather lit from behind: the dyes glow, the hide is amber
export const DYE: Record<Dye, string> = {
  red: '#c4311c',
  green: '#2e7a4a',
  yellow: '#e8a92e',
  blue: '#24607f',
  black: '#22150d',
  hide: '#d99b52',
  pale: '#f2d9a2',
  purple: '#74345f',
  orange: '#dd6a1e',
}
export const RIM = '#1c0f08'
export const PAPER_RED = '#c8241a'
export const PAPER_GOLD = '#d9a73e'
const paperOf = (dye?: Dye) =>
  dye === 'yellow' || dye === 'pale' || dye === 'orange'
    ? PAPER_GOLD
    : PAPER_RED

// One tile of each pattern, 18 units square: holes in black, and in white
// what is left standing inside a hole (the square of a coin)
const TILE = 18
const PATTERN: Record<Cut, ReactNode> = {
  dots: (
    <>
      <circle cx="4.5" cy="4.5" r="2.4" />
      <circle cx="13.5" cy="13.5" r="2.4" />
    </>
  ),
  scales: (
    <>
      <path d="M2 5a7 7 0 0 0 14 0a7 4.6 0 0 1-14 0z" />
      <path d="M-7 14a7 7 0 0 0 14 0a7 4.6 0 0 1-14 0zM11 14a7 7 0 0 0 14 0a7 4.6 0 0 1-14 0z" />
    </>
  ),
  lattice: <path d="M9 2.5L15.5 9L9 15.5L2.5 9z" />,
  coins: (
    <>
      <circle cx="9" cy="9" r="6.4" />
      <rect x="7" y="7" width="4" height="4" fill="#fff" />
    </>
  ),
  flowers: (
    <>
      <ellipse cx="9" cy="4.6" rx="2.2" ry="3.4" />
      <ellipse cx="9" cy="13.4" rx="2.2" ry="3.4" />
      <ellipse cx="4.6" cy="9" rx="3.4" ry="2.2" />
      <ellipse cx="13.4" cy="9" rx="3.4" ry="2.2" />
      <circle cx="9" cy="9" r="1.6" fill="#fff" />
    </>
  ),
  curls: (
    <>
      <circle cx="9" cy="9" r="5.8" />
      <circle cx="10.2" cy="8" r="3.3" fill="#fff" />
      <circle cx="10.2" cy="8" r="1.3" />
    </>
  ),
  stripes: (
    <path d="M-2 6L6 -2L8 0L0 8zM4 18L18 4L20 6L6 20zM14 22L22 14L24 16L16 24z" />
  ),
  waves: (
    <path d="M0 6c3-4 6-4 9 0s6 4 9 0v2.6c-3 4-6 4-9 0s-6-4-9 0zM0 15c3-4 6-4 9 0s6 4 9 0v2.4c-3 4-6 4-9 0s-6-4-9 0z" />
  ),
  teeth: <path d="M1 12L5 4L9 12zM10 16L14 8L18 16z" />,
  hex: (
    <path
      d="M9 1.5L15.5 5.2V12.8L9 16.5L2.5 12.8V5.2z"
      transform="scale(.82) translate(2 2)"
    />
  ),
}

const cutKey = (s: Shape) => `${s.cut}${s.cs ?? 1}`

// Shapes as SVG content, for an svg of their own or a group inside a
// larger one. `uid` keeps the ids of their masks apart; `box` is a region
// that holds them all (x, y, width, height). They are drawn in order, and
// on leather a hole cuts through what was drawn before it, not after (the
// eye and beard go on the face once it is cut open).
export function Shapes({
  shapes,
  material,
  uid,
  box,
}: {
  shapes: Array<Shape>
  material: Material
  uid: string
  box: readonly [number, number, number, number]
}) {
  const [bx, by, bw, bh] = box
  const region = { x: bx - 20, y: by - 20, width: bw + 40, height: bh + 40 }
  const paper = material === 'paper'
  const patterns = new Map(
    shapes.flatMap((s) => (s.cut ? [[cutKey(s), s] as const] : [])),
  )
  const cutMask = (s: Shape, i: number) =>
    s.cut ? `url(#${uid}m${i})` : undefined
  const defs = (
    <>
      {[...patterns].map(([key, s]) => {
        const k = (s.cs ?? 1) * (paper ? 1.15 : 1)
        return (
          <pattern
            key={key}
            id={`${uid}p${key}`}
            width={TILE * k}
            height={TILE * k}
            patternUnits="userSpaceOnUse"
          >
            <g transform={`scale(${k})`} fill="#000">
              {PATTERN[s.cut!]}
            </g>
          </pattern>
        )
      })}
      {shapes.map((s, i) =>
        s.cut ? (
          <mask
            key={i}
            id={`${uid}m${i}`}
            maskUnits="userSpaceOnUse"
            {...region}
          >
            <rect {...region} fill="#fff" />
            <rect {...region} fill={`url(#${uid}p${cutKey(s)})`} />
            <path
              d={s.d}
              fill="none"
              stroke="#fff"
              strokeWidth={paper ? 7 : 9}
            />
          </mask>
        ) : null,
      )}
    </>
  )

  if (paper) {
    // One sheet: every shape is paper, and lines and seams are cut out
    const fills = shapes.filter((s) => !s.line)
    const cuts = [
      ...shapes.flatMap((s, i) =>
        s.line
          ? [
              <path
                key={`l${i}`}
                d={s.d}
                fill="none"
                stroke="#000"
                strokeWidth={Math.max(1.4, s.line * 0.9)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />,
            ]
          : [],
      ),
      ...fills
        .slice(1)
        .flatMap((s, i) =>
          s.join
            ? []
            : [
                <path
                  key={`s${i}`}
                  d={s.d}
                  fill="none"
                  stroke="#000"
                  strokeWidth="1.6"
                />,
              ],
        ),
    ]
    return (
      <>
        <defs>
          {defs}
          {cuts.length > 0 && (
            <mask id={`${uid}h`} maskUnits="userSpaceOnUse" {...region}>
              <rect {...region} fill="#fff" />
              {cuts}
            </mask>
          )}
        </defs>
        <g mask={cuts.length ? `url(#${uid}h)` : undefined}>
          {shapes.map((s, i) =>
            s.line ? null : (
              <path
                key={i}
                d={s.d}
                fill={paperOf(s.dye)}
                mask={cutMask(s, i)}
              />
            ),
          )}
        </g>
      </>
    )
  }

  // Leather: in order, each hole wrapping what came before it
  let drawn: Array<ReactNode> = []
  const holes: Array<ReactNode> = []
  shapes.forEach((s, i) => {
    if (s.open) {
      holes.push(
        <mask key={i} id={`${uid}o${i}`} maskUnits="userSpaceOnUse" {...region}>
          <rect {...region} fill="#fff" />
          <path d={s.d} fill="#000" />
        </mask>,
      )
      drawn = [
        <g key={`g${i}`} mask={`url(#${uid}o${i})`}>
          {drawn}
        </g>,
        <path
          key={i}
          d={s.d}
          fill="none"
          stroke={RIM}
          strokeWidth="3"
          strokeLinejoin="round"
        />,
      ]
    } else if (s.line)
      drawn.push(
        <path
          key={i}
          d={s.d}
          fill="none"
          stroke={RIM}
          strokeWidth={s.line}
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      )
    else
      drawn.push(
        <g key={i}>
          <path
            d={s.d}
            fill={DYE[s.dye ?? 'hide']}
            fillOpacity={s.alpha ?? 0.9}
            mask={cutMask(s, i)}
          />
          {!s.bare && (
            <path
              d={s.d}
              fill="none"
              stroke={RIM}
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
          )}
        </g>,
      )
  })
  return (
    <>
      <defs>
        {defs}
        {holes}
      </defs>
      {drawn}
    </>
  )
}

// Shapes in an svg of their own, the size of their box
export function Cutout({
  shapes,
  box,
  material = 'leather',
  className,
  style,
}: {
  shapes: Array<Shape>
  box: readonly [number, number, number, number]
  material?: Material
  className?: string
  style?: CSSProperties
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg
      viewBox={box.join(' ')}
      width={box[2]}
      height={box[3]}
      className={className}
      style={{ overflow: 'visible', ...style }}
      aria-hidden
    >
      <Shapes shapes={shapes} material={material} uid={uid} box={box} />
    </svg>
  )
}

// Shapes in a group of a larger svg, moved into place
export function CutGroup({
  shapes,
  box,
  material,
  transform,
}: {
  shapes: Array<Shape>
  box: readonly [number, number, number, number]
  material: Material
  transform?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <g transform={transform}>
      <Shapes shapes={shapes} material={material} uid={uid} box={box} />
    </g>
  )
}
