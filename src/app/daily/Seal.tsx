import { useId } from 'react'
import type { SealDef } from '../data/seals'

// A seal stamp (印章) in SVG: a square, round or tall seal with its
// characters either cut into the red (白文, white on red) or left
// standing in red (朱文). A filter wobbles the edges and leaves specks
// where the paste did not take, as a real stamp on paper does. A seal not
// yet earned is a faint blind impression.

export const SEAL_RED = '#c23b2e'
const PAPER = '#fbf3e4'

// A seed for the filter's noise, so each seal has its own wear
const seedOf = (id: string) =>
  [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7)

export function Seal({
  seal,
  size = 72,
  faint = false,
  className = '',
  tilt = true,
}: {
  seal: Pick<SealDef, 'id' | 'zh' | 'shape' | 'style'>
  size?: number
  faint?: boolean
  className?: string
  // A slight turn, as a seal is never pressed quite straight
  tilt?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const seed = seedOf(seal.id)
  const shape = seal.shape ?? (seal.zh.length > 1 ? 'tall' : 'square')
  const white = (seal.style ?? 'white') === 'white'
  const ink = faint ? '#b8a796' : SEAL_RED
  const turn = tilt ? ((seed % 9) - 4) * 0.9 : 0
  const glyphs = [...seal.zh]

  const outline =
    shape === 'round' ? (
      <circle cx="50" cy="50" r="43" />
    ) : shape === 'tall' ? (
      <rect x="21" y="5" width="58" height="90" rx="5" />
    ) : (
      <rect x="8" y="8" width="84" height="84" rx="6" />
    )

  const font =
    glyphs.length > 1
      ? { size: 38, ys: [31, 71] }
      : { size: shape === 'round' ? 56 : 62, ys: [52] }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={seal.zh}
      style={{ transform: `rotate(${turn}deg)` }}
    >
      <defs>
        <filter
          id={`w${uid}`}
          x="-8%"
          y="-8%"
          width="116%"
          height="116%"
          colorInterpolationFilters="sRGB"
        >
          {/* The edge, pressed unevenly */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves="2"
            seed={seed}
            result="warp"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale={faint ? 2 : 2.6}
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          {/* Specks where the paste did not take */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.55"
            numOctaves="2"
            seed={seed + 3}
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 12 -3.4"
            result="specks"
          />
          <feComposite in="rough" in2="specks" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#w${uid})`} opacity={faint ? 0.55 : 0.94}>
        {white ? (
          <g
            fill={faint ? 'none' : ink}
            stroke={ink}
            strokeWidth={faint ? 2.5 : 0}
          >
            {outline}
          </g>
        ) : (
          <g fill="none" stroke={ink} strokeWidth={faint ? 2.5 : 5.5}>
            {outline}
          </g>
        )}
        {glyphs.map((g, i) => (
          <text
            key={i}
            x="50"
            y={font.ys[i]}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={font.size}
            fontWeight={700}
            fill={white && !faint ? PAPER : ink}
            className="zh"
          >
            {g}
          </text>
        ))}
      </g>
    </svg>
  )
}
