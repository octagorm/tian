import {
  brushStroke,
  curlEnd,
  paperCorner,
  ruyiCloud,
  ruyiHead,
} from './shapes'
import type { ReactNode } from 'react'
import './ornament.css'

// Borders and dividers in the current text colour: a line with a cloud
// head in the middle (祥云), a band of fretwork (回纹), paper-cut corners
// for a card (剪纸) and an ink brush stroke to underline a heading

const CLOUD = ruyiCloud()
const HEAD = ruyiHead()
const CURL = curlEnd()
const CORNER = paperCorner()

// A thin rule with a cloud head in the middle and curls at the ends; with
// children, they sit in the middle instead of the cloud
export function CloudDivider({
  className = '',
  children,
  ends = true,
}: {
  className?: string
  children?: ReactNode
  ends?: boolean
}) {
  const curl = (flip: boolean) => (
    <svg
      viewBox="0 -6 17 12"
      className="h-[0.9em] w-[1.3em] shrink-0"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden
    >
      <path
        d={CURL}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  )
  return (
    <div
      className={`flex items-center ${className}`}
      role={children ? undefined : 'separator'}
    >
      {ends && curl(true)}
      <div className="h-px min-w-4 flex-1 bg-current opacity-70" />
      {children ?? (
        <svg
          viewBox="-40 -14 80 28"
          className="h-[1.6em] w-[4.6em] shrink-0"
          aria-hidden
        >
          <path
            d={CLOUD}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <div className="h-px min-w-4 flex-1 bg-current opacity-70" />
      {ends && curl(false)}
    </div>
  )
}

// The cloud head alone, as a small mark
export function CloudMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="-16 -13 32 22" className={className} aria-hidden>
      <path
        d={HEAD}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// A band of fretwork, as wide as its box; `down` turns it over for the
// top edge of something
export function Fret({
  className = '',
  down = false,
}: {
  className?: string
  down?: boolean
}) {
  return (
    <span
      aria-hidden
      className={`zh-fret ${down ? 'zh-fret-down' : ''} ${className}`}
    />
  )
}

// Paper-cut fans in the corners of a card (the card must be `relative`).
// `corners` picks which: tl, tr, bl, br.
export function PaperCorners({
  size = 40,
  color = 'var(--red)',
  corners = ['tl', 'tr', 'bl', 'br'],
  inset = 0,
  className = '',
}: {
  size?: number
  color?: string
  corners?: Array<'tl' | 'tr' | 'bl' | 'br'>
  inset?: number
  className?: string
}) {
  const place = {
    tl: { left: inset, top: inset, transform: undefined },
    tr: { right: inset, top: inset, transform: 'scaleX(-1)' },
    bl: { left: inset, bottom: inset, transform: 'scaleY(-1)' },
    br: { right: inset, bottom: inset, transform: 'scale(-1, -1)' },
  }
  return (
    <>
      {corners.map((c) => (
        <svg
          key={c}
          viewBox="0 0 48 48"
          width={size}
          height={size}
          aria-hidden
          className={`pointer-events-none absolute ${className}`}
          style={place[c]}
        >
          <path d={CORNER} fill={color} fillRule="evenodd" />
        </svg>
      ))}
    </>
  )
}

// An ink stroke under a heading, drawn in once as it appears
export function BrushLine({
  className = '',
  color = 'currentColor',
  seed = 1,
  draw = true,
}: {
  className?: string
  color?: string
  seed?: number
  draw?: boolean
}) {
  return (
    <svg
      viewBox="0 0 200 18"
      preserveAspectRatio="none"
      aria-hidden
      className={`block ${draw ? 'zh-brush' : ''} ${className}`}
    >
      <path d={brushStroke(seed)} fill={color} fillRule="evenodd" />
    </svg>
  )
}
