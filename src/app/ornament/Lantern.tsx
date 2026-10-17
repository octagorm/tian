import { useId } from 'react'
import './ornament.css'

// A red paper lantern (灯笼) on a string, swaying a little in the air,
// its light breathing; the tassel follows a moment late. Hang it from the
// top of something: the string's end is the top centre of the box.
export function Lantern({
  size = 72,
  char,
  delay = 0,
  swing = 3,
  lit = true,
  className = '',
}: {
  // Height in pixels, string and tassel included
  size?: number
  // A character on the lantern, such as 福 or 春
  char?: string
  // Seconds into the sway, so lanterns side by side move apart
  delay?: number
  // Degrees each way
  swing?: number
  lit?: boolean
  className?: string
}) {
  const id = `lan${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg
      viewBox="0 0 40 76"
      width={(size * 40) / 76}
      height={size}
      aria-hidden
      className={`zh-sway pointer-events-none inline-block overflow-visible ${className}`}
      style={{
        ['--sway' as string]: `${swing}deg`,
        ['--sway-time' as string]: `${4.6 + (delay % 1.3)}s`,
        animationDelay: `${-delay}s`,
      }}
    >
      <defs>
        <radialGradient id={`${id}b`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor={lit ? '#ffb070' : '#e2604a'} />
          <stop offset="0.45" stopColor={lit ? '#ee4a30' : '#c8372d'} />
          <stop offset="1" stopColor="#8e1d14" />
        </radialGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor="#ffb45a" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ff8a3c" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ff8a3c" stopOpacity="0" />
        </radialGradient>
      </defs>
      {lit && (
        <circle
          className="zh-flicker"
          cx="20"
          cy="33"
          r="30"
          fill={`url(#${id}g)`}
          style={{ animationDelay: `${-delay * 1.7}s` }}
        />
      )}
      <line x1="20" y1="-40" x2="20" y2="11" stroke="#5a3a22" strokeWidth="1" />
      <path d="M13 11h14l1.6 4H11.4z" fill="#d9a441" />
      <path d="M11.4 15h17.2" stroke="#9a6a1c" strokeWidth="0.8" />
      <ellipse cx="20" cy="33" rx="17" ry="18.4" fill={`url(#${id}b)`} />
      <g fill="none" stroke="#7e1a12" strokeOpacity="0.55" strokeWidth="0.8">
        <ellipse cx="20" cy="33" rx="11.5" ry="18.4" />
        <ellipse cx="20" cy="33" rx="5.5" ry="18.4" />
        <path d="M20 14.6v36.8" />
      </g>
      <ellipse
        cx="12.5"
        cy="26"
        rx="2.6"
        ry="6.5"
        fill="#fff"
        fillOpacity="0.16"
      />
      {char && (
        <text
          x="20"
          y="34"
          fontSize="15"
          fontFamily="'Ma Shan Zheng', 'Kaiti SC', 'STKaiti', serif"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#f6c453"
        >
          {char}
        </text>
      )}
      <path d="M11.4 51h17.2l-1.6 4H13z" fill="#d9a441" />
      <g
        className="zh-sway"
        style={{
          transformOrigin: '20px 55px',
          ['--sway' as string]: `${swing * 1.6}deg`,
          ['--sway-time' as string]: `${4.6 + (delay % 1.3)}s`,
          animationDelay: `${-delay - 0.5}s`,
        }}
      >
        <circle cx="20" cy="57.5" r="1.7" fill="#d9a441" />
        <rect x="18" y="59" width="4" height="3" fill="#d9a441" />
        <g stroke="#c8372d" strokeWidth="1.1" strokeLinecap="round">
          <path d="M18.6 62l-1.4 12" />
          <path d="M19.6 62l-0.5 13" />
          <path d="M20.4 62l0.5 13" />
          <path d="M21.4 62l1.4 12" />
        </g>
      </g>
    </svg>
  )
}
