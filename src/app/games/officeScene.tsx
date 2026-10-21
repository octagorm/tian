import type { ReactElement } from 'react'

// The office as the player sees it from the desk, in big pixels: a cubicle
// wall for the intern, a window for the clerk, a bigger one for the
// manager, and the whole city through glass for the general manager. The
// clock on the wall keeps the day's time. Drawn in SVG, crisp.

const W = 160
const H = 60

interface Look {
  wall: string
  wallDark: string
  // The window, as x, y, w, h, or none
  window: [number, number, number, number] | null
  sky: [string, string]
  desk: string
  deskDark: string
}

const LOOKS: Array<Look> = [
  {
    wall: '#cfc6ad',
    wallDark: '#b5ab90',
    window: null,
    sky: ['#9fc9e6', '#d8ecf5'],
    desk: '#9a7650',
    deskDark: '#6f5235',
  },
  {
    wall: '#c9d4cc',
    wallDark: '#a9b8ad',
    window: [8, 6, 44, 30],
    sky: ['#7fb7e0', '#cfe8f4'],
    desk: '#8a6a48',
    deskDark: '#5e4630',
  },
  {
    wall: '#d9c7a8',
    wallDark: '#b8a17e',
    window: [6, 4, 86, 34],
    sky: ['#e8a86a', '#f6dca8'],
    desk: '#6e4a2e',
    deskDark: '#4a301c',
  },
  {
    wall: '#2b2f45',
    wallDark: '#1d2033',
    window: [0, 0, 160, 42],
    sky: ['#2c2b5a', '#e57a5a'],
    desk: '#3a2a22',
    deskDark: '#24180f',
  },
]

// A skyline that is the same every time: buildings of set heights, with
// lit windows here and there
function Skyline({
  x,
  y,
  w,
  h,
  night,
}: {
  x: number
  y: number
  w: number
  h: number
  night: boolean
}) {
  const shapes: Array<ReactElement> = []
  let bx = x - 2
  let i = 0
  while (bx < x + w) {
    const bw = 6 + ((i * 7) % 9)
    const bh = Math.round(h * (0.3 + (((i * 37) % 11) / 11) * 0.55))
    const top = y + h - bh
    const tone = night
      ? ['#191a33', '#22244a', '#16172c'][i % 3]
      : ['#6e7f99', '#8193ac', '#5d6c86'][i % 3]
    shapes.push(
      <rect key={`b${i}`} x={bx} y={top} width={bw} height={bh} fill={tone} />,
    )
    for (let wy = top + 2; wy < y + h - 2; wy += 3)
      for (let wx = bx + 1; wx < bx + bw - 1; wx += 2)
        if ((wx * 13 + wy * 7 + i) % 5 === 0)
          shapes.push(
            <rect
              key={`w${i}-${wx}-${wy}`}
              x={wx}
              y={wy}
              width={1}
              height={1}
              fill={night ? '#ffd98a' : '#c9d8e8'}
            />,
          )
    bx += bw + 1
    i++
  }
  // the TV tower of the city, for the view from the top floor
  if (w > 120)
    shapes.push(
      <g key="tower" fill={night ? '#3a2c5a' : '#7c6f9a'}>
        <rect x={x + 112} y={y + 4} width={1} height={h - 4} />
        <rect x={x + 110} y={y + h * 0.35} width={5} height={5} />
        <rect x={x + 109} y={y + h * 0.62} width={7} height={6} />
        <rect x={x + 111} y={y + h * 0.55} width={3} height={h * 0.45} />
      </g>,
    )
  return <g>{shapes}</g>
}

function Clock({ x, y, time }: { x: number; y: number; time: string }) {
  const [h, m] = time.split(':').map(Number)
  const r = 6
  const at = (turn: number, len: number) => ({
    x: x + Math.sin(turn * 2 * Math.PI) * len,
    y: y - Math.cos(turn * 2 * Math.PI) * len,
  })
  const hh = at(((h % 12) + m / 60) / 12, 3.2)
  const mm = at(m / 60, 4.8)
  return (
    <g>
      <circle cx={x} cy={y} r={r + 1} fill="#2a2420" />
      <circle cx={x} cy={y} r={r} fill="#fffaf0" />
      <line
        x1={x}
        y1={y}
        x2={hh.x}
        y2={hh.y}
        stroke="#2a2420"
        strokeWidth={1.2}
      />
      <line
        x1={x}
        y1={y}
        x2={mm.x}
        y2={mm.y}
        stroke="#c8372d"
        strokeWidth={0.8}
      />
    </g>
  )
}

export function OfficeScene({
  rank,
  time,
  className = '',
}: {
  rank: number
  time: string
  className?: string
}) {
  const look = LOOKS[Math.min(rank, LOOKS.length - 1)]
  const win = look.window
  const night = rank === 3
  const deskY = 44
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      shapeRendering="crispEdges"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`office-sky-${rank}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.sky[0]} />
          <stop offset="1" stopColor={look.sky[1]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={look.wall} />
      {rank === 0 && (
        // the cubicle: felt panels, a pinboard with notes
        <g>
          {[0, 40, 80, 120].map((x) => (
            <rect
              key={x}
              x={x}
              y={0}
              width={1}
              height={deskY}
              fill={look.wallDark}
            />
          ))}
          <rect x={12} y={8} width={34} height={22} fill="#b98a5a" />
          <rect x={13} y={9} width={32} height={20} fill="#c99d6c" />
          <rect x={15} y={11} width={8} height={7} fill="#fff2a6" />
          <rect x={25} y={13} width={8} height={8} fill="#b4e8f8" />
          <rect x={35} y={10} width={8} height={7} fill="#ffd3df" />
          <rect x={18} y={20} width={9} height={6} fill="#fffaf0" />
          <rect x={30} y={22} width={7} height={5} fill="#dcf28e" />
        </g>
      )}
      {win && (
        <g>
          <rect
            x={win[0] - 1}
            y={win[1] - 1}
            width={win[2] + 2}
            height={win[3] + 2}
            fill={look.wallDark}
          />
          <rect
            x={win[0]}
            y={win[1]}
            width={win[2]}
            height={win[3]}
            fill={`url(#office-sky-${rank})`}
          />
          <Skyline
            x={win[0]}
            y={win[1] + win[3] * (rank === 3 ? 0.25 : 0.4)}
            w={win[2]}
            h={win[3] * (rank === 3 ? 0.75 : 0.6)}
            night={night}
          />
          {/* the panes */}
          {Array.from({ length: Math.floor(win[2] / 22) }, (_, k) => (
            <rect
              key={k}
              x={win[0] + (k + 1) * 22}
              y={win[1]}
              width={1}
              height={win[3]}
              fill={look.wallDark}
            />
          ))}
        </g>
      )}
      {rank >= 2 && (
        // a plant in the corner
        <g>
          <rect x={140} y={34} width={10} height={10} fill="#8c5434" />
          <rect x={138} y={24} width={5} height={10} fill="#2b653d" />
          <rect x={142} y={20} width={5} height={14} fill="#4f9a3c" />
          <rect x={146} y={25} width={5} height={9} fill="#2b653d" />
        </g>
      )}
      <Clock x={rank === 3 ? 148 : 118} y={rank === 3 ? 50 : 14} time={time} />
      {/* the desk, with a screen, a phone and a cup */}
      <rect x={0} y={deskY} width={W} height={H - deskY} fill={look.desk} />
      <rect x={0} y={deskY} width={W} height={1} fill={look.deskDark} />
      <rect x={58} y={28} width={30} height={18} fill="#1c1424" />
      <rect x={60} y={30} width={26} height={13} fill="#2a4288" />
      <rect x={62} y={32} width={10} height={2} fill="#b4e8f8" />
      <rect x={62} y={36} width={16} height={1} fill="#62b0e6" />
      <rect x={62} y={39} width={12} height={1} fill="#62b0e6" />
      <rect x={71} y={46} width={4} height={2} fill="#1c1424" />
      <rect x={96} y={42} width={10} height={5} fill="#3b3348" />
      <rect x={97} y={41} width={8} height={2} fill="#1c1424" />
      <rect x={42} y={40} width={5} height={6} fill="#fffaf0" />
      <rect x={42} y={40} width={5} height={1} fill="#8c5434" />
      {rank === 3 && (
        <g>
          <rect x={20} y={46} width={22} height={6} fill="#d9a531" />
          <rect x={21} y={47} width={20} height={4} fill="#f4c24c" />
        </g>
      )}
    </svg>
  )
}
