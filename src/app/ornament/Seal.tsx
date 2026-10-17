import { useId } from 'react'
import './ornament.css'

// A red seal (印章), as stamped on a painting or a letter: one to four
// characters, cut white into the red (白文) or standing red on the paper
// (朱文), the edges worn and the ink a little uneven, as a real stamp's
// are. `stamp` presses it down as it appears; `faded` is a seal not yet
// earned, a pale ghost of one.

const FONT = "'Ma Shan Zheng', 'Kaiti SC', 'STKaiti', 'KaiTi', serif"
export const SEAL_RED = '#c23a2c'
const PAPER = '#fbf3e4'

// Where the characters go: one large; two or three in a column; four in
// two columns, read right to left
function layout(n: number): {
  w: number
  size: number
  at: Array<[number, number]>
} {
  if (n <= 1) return { w: 100, size: 70, at: [[50, 51]] }
  if (n === 2)
    return {
      w: 62,
      size: 40,
      at: [
        [31, 29],
        [31, 72],
      ],
    }
  if (n === 3)
    return {
      w: 46,
      size: 29,
      at: [
        [23, 20],
        [23, 50],
        [23, 80],
      ],
    }
  return {
    w: 100,
    size: 39,
    at: [
      [72, 29],
      [72, 72],
      [28, 29],
      [28, 72],
    ],
  }
}

const hash = (s: string) =>
  [...s].reduce((h, c) => (h * 31 + (c.codePointAt(0) ?? 0)) % 9973, 7)

export function Seal({
  text,
  size = 48,
  kind = 'white',
  round = false,
  tilt = 0,
  stamp = false,
  faded = false,
  color = SEAL_RED,
  className = '',
  title,
}: {
  // One to four characters
  text: string
  // Height in pixels
  size?: number
  // White characters cut into red, or red characters on the paper
  kind?: 'white' | 'red'
  round?: boolean
  // Degrees, as a hand would set it down
  tilt?: number
  stamp?: boolean
  faded?: boolean
  color?: string
  className?: string
  // Said to screen readers and shown on hover; without it, the seal is
  // decoration
  title?: string
}) {
  const id = `seal${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const chars = [...text].slice(0, 4)
  const { w, size: fs, at } = layout(round ? 1 : chars.length)
  const seed = hash(text) % 97
  const ink = faded ? '#9a8f84' : color
  const white = kind === 'white' && !faded
  const shape = round ? (
    <circle
      cx={50}
      cy={50}
      r={white ? 47 : 44}
      fill={white ? ink : 'none'}
      stroke={white ? 'none' : ink}
      strokeWidth={6}
    />
  ) : (
    <rect
      x={white ? 2 : 5}
      y={white ? 2 : 5}
      width={w - (white ? 4 : 10)}
      height={white ? 96 : 90}
      rx={white ? 7 : 5}
      fill={white ? ink : 'none'}
      stroke={white ? 'none' : ink}
      strokeWidth={6}
    />
  )
  return (
    <svg
      viewBox={`0 0 ${w} 100`}
      width={(size * w) / 100}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`inline-block shrink-0 ${stamp ? 'zh-seal-stamp' : ''} ${className}`}
      style={{
        transform: stamp ? undefined : `rotate(${tilt}deg)`,
        ['--tilt' as string]: `${tilt}deg`,
        opacity: faded ? 0.42 : 1,
      }}
    >
      {title && <title>{title}</title>}
      <defs>
        <filter
          id={id}
          x="-8%"
          y="-8%"
          width="116%"
          height="116%"
          colorInterpolationFilters="sRGB"
        >
          {/* Rough edges: everything nudged by a slow noise */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.12"
            numOctaves={2}
            seed={seed}
            result="slow"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="slow"
            scale={2.6}
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          {/* Blotches where the paste was thin, and a few where it did
              not take at all */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.22"
            numOctaves={3}
            seed={seed + 11}
            result="fine"
          />
          <feColorMatrix
            in="fine"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -10.5 0 0 0 7.9"
            result="worn"
          />
          <feComposite in="rough" in2="worn" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>
        {shape}
        {chars.map((ch, i) =>
          i < at.length ? (
            <text
              key={i}
              x={at[i][0]}
              y={at[i][1]}
              fontSize={fs}
              fontFamily={FONT}
              textAnchor="middle"
              dominantBaseline="central"
              fill={white ? PAPER : ink}
            >
              {ch}
            </text>
          ) : null,
        )}
      </g>
    </svg>
  )
}
