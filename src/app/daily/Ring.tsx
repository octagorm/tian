import type { ReactNode } from 'react'

// A ring cut into one arc per step of the day's session: red when done,
// gold for the one to do now, pale for the rest. Arcs fill as steps are
// done, and the one being done fills red as far as it has got (`part`);
// whatever is inside goes in the middle.

export type ArcState = 'done' | 'now' | 'todo'

const COLOR = {
  done: '#c23b2e',
  now: '#d9a441',
  todo: '#e6d9c0',
}

export function Ring({
  steps,
  part = 0,
  size = 120,
  width = 9,
  children,
  className = '',
}: {
  steps: Array<ArcState>
  // How much of the step to do now is done, 0–1
  part?: number
  size?: number
  width?: number
  children?: ReactNode
  className?: string
}) {
  const r = 50 - width / 2 - 1
  const c = 2 * Math.PI * r
  const n = Math.max(1, steps.length)
  const gap = n > 1 ? Math.min(14, c / n / 4) : 0
  const arc = c / n - gap
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        {steps.map((s, i) => {
          const turn = -90 + (i * 360) / n + (gap / c) * 180
          return (
            <g key={i} transform={`rotate(${turn} 50 50)`}>
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={COLOR.todo}
                strokeWidth={width}
                strokeLinecap="round"
                strokeDasharray={`${arc} ${c}`}
              />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={s === 'todo' ? COLOR.todo : COLOR[s]}
                strokeWidth={width}
                strokeLinecap="round"
                strokeDasharray={`${s === 'todo' ? 0 : arc} ${c}`}
                className={s === 'now' ? 'zh-ring-now' : ''}
                style={{ transition: 'stroke-dasharray 0.9s ease-out' }}
              />
              {s === 'now' && part > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={COLOR.done}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeDasharray={`${arc * Math.min(1, part)} ${c}`}
                  style={{ transition: 'stroke-dasharray 0.9s ease-out' }}
                />
              )}
            </g>
          )
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
