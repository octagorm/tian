import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  FastForward,
  Hand,
  Shield,
  Snail,
} from 'lucide-react'
import { ACTIONS } from '../../data/bridge'
import type { Action, PlanetId } from '../../data/bridge'
import type { LucideIcon } from 'lucide-react'

// The bridge's panels: the hull meter, the course to the next planet, the
// helm's buttons (pictures only, never words) and small planet pictures.

export const ICON: Record<Action, LucideIcon> = {
  left: ArrowLeft,
  right: ArrowRight,
  up: ArrowUp,
  down: ArrowDown,
  fire: Crosshair,
  shield: Shield,
  fast: FastForward,
  slow: Snail,
  stop: Hand,
}

const TONE: Record<Action, string> = {
  left: 'var(--sb-d)',
  right: 'var(--sb-d)',
  up: 'var(--sb-d)',
  down: 'var(--sb-d)',
  fire: 'var(--sb-e)',
  shield: 'var(--sb-g)',
  fast: 'var(--sb-a)',
  slow: 'var(--sb-b)',
  stop: 'var(--sb-c)',
}

const KEY_LABEL: Record<string, string> = Object.fromEntries(
  ACTIONS.map((a) => [a.id, a.label]),
)

// The hull in ten segments, green to red as it goes
export function Hull({ hull }: { hull: number }) {
  const n = Math.max(0, Math.ceil(hull / 10))
  const color =
    hull > 50 ? 'var(--sb-g)' : hull > 25 ? 'var(--sb-f)' : 'var(--sb-e)'
  return (
    <div
      className="sb-hull"
      role="meter"
      aria-label="Hull"
      aria-valuenow={hull}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ background: i < n ? color : '#2a2638' }} />
      ))}
    </div>
  )
}

// Orders on this leg so far, and the planet at the end
export function Course({ step, of }: { step: number; of: number }) {
  return (
    <div className="sb-dots" aria-hidden>
      {Array.from({ length: of }, (_, i) => (
        <i
          key={i}
          data-on={i < step ? '1' : '0'}
          data-now={i === step ? '1' : '0'}
        />
      ))}
      <i
        className="goal"
        data-on={step > of ? '1' : '0'}
        data-now={step === of ? '1' : '0'}
      />
    </div>
  )
}

function Key({
  a,
  onAct,
  done,
  disabled,
  className = '',
  size = 26,
}: {
  a: Action
  onAct: (a: Action) => void
  done: boolean
  disabled: boolean
  className?: string
  size?: number
}) {
  const Icon = ICON[a]
  return (
    <button
      type="button"
      aria-label={a}
      disabled={disabled}
      data-done={done ? '1' : '0'}
      className={`sb-key ${a} ${className}`}
      style={{ background: TONE[a] }}
      // Acts on the press, not the release: this is a reflex game
      onPointerDown={(e) => {
        e.preventDefault()
        if (!disabled) onAct(a)
      }}
      onClick={(e) => {
        // A click from the keyboard (Enter on a focused button)
        if (e.detail === 0 && !disabled) onAct(a)
      }}
    >
      <Icon size={size} strokeWidth={2.6} />
      <small>{KEY_LABEL[a]}</small>
    </button>
  )
}

export function Helm({
  onAct,
  done,
  disabled,
}: {
  onAct: (a: Action) => void
  done: Array<Action>
  disabled: boolean
}) {
  const k = (a: Action, className = '', size = 26) => (
    <Key
      a={a}
      onAct={onAct}
      done={done.includes(a)}
      disabled={disabled}
      className={className}
      size={size}
    />
  )
  return (
    <div className="sb-helm">
      <div className="sb-pad">
        {k('left', 'l')}
        {k('up')}
        {k('down')}
        {k('right', 'r')}
      </div>
      <div className="sb-arms">
        {k('fire', 'big', 30)}
        {k('shield', 'big', 30)}
      </div>
      <div className="sb-drive">
        {k('fast', 'l')}
        {k('slow')}
        {k('stop', 'r')}
      </div>
    </div>
  )
}

// A planet as a small picture, lit from the left
const LOOK: Record<PlanetId, { a: string; b: string; band?: string }> = {
  moon: { a: '#d8d4cc', b: '#7c7a76' },
  mars: { a: '#e08a52', b: '#7a2f1a' },
  jupiter: { a: '#f0dcb8', b: '#a8683f', band: '#b97b4c' },
  saturn: { a: '#f2e3b4', b: '#b89a62', band: '#d9c08a' },
  earth: { a: '#5fa8ff', b: '#1b3f8a', band: '#4c9a3c' },
}

export function PlanetIcon({ id, size = 22 }: { id: PlanetId; size?: number }) {
  const l = LOOK[id]
  const gid = `sb-planet-${id}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <radialGradient id={gid} cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor={l.a} />
          <stop offset="100%" stopColor={l.b} />
        </radialGradient>
        <clipPath id={`${gid}-c`}>
          <circle r="7.5" />
        </clipPath>
      </defs>
      {id === 'saturn' && (
        <ellipse
          rx="11.5"
          ry="3.2"
          fill="none"
          stroke="#d9c08a"
          strokeWidth="1.6"
          transform="rotate(-18)"
        />
      )}
      <circle r="7.5" fill={`url(#${gid})`} />
      {l.band && (
        <g clipPath={`url(#${gid}-c)`} opacity="0.75">
          {id === 'earth' ? (
            <path
              d="M-6 -2 q3 -4 6 -1 q2 3 -1 5 q-3 1 -5 -4z M2 2 q3 -1 4 2 q-2 3 -4 1z"
              fill={l.band}
            />
          ) : (
            <>
              <rect x="-8" y="-3.2" width="16" height="1.6" fill={l.band} />
              <rect x="-8" y="1.6" width="16" height="1.3" fill={l.band} />
            </>
          )}
        </g>
      )}
      {id === 'saturn' && (
        <g transform="rotate(-18)">
          <path
            d="M -11.5 0 A 11.5 3.2 0 0 0 11.5 0"
            fill="none"
            stroke="#d9c08a"
            strokeWidth="1.6"
          />
        </g>
      )}
    </svg>
  )
}
