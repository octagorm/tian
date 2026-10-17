import { useId, useMemo } from 'react'
import { STORIES } from '../data/stories'
import { CutGroup, PAPER_GOLD, PAPER_RED } from './leather'
import { spritesOf } from './scenery'
import { stageAt } from './stage'
import { matrix, point, stillCast } from './still'
import { FlowerCut } from './WindowFlower'
import type { Sprite } from './scenery'
import type { StillPuppet } from './still'

// A story's cover, cut from paper (剪纸): a moment of its own play (the line
// `cover` names), the same puppets and scenery as the shadow theatre cut
// from red paper, gold where the leather is yellow. The scene sits in a
// frame of two papers, gold under red, with crescent nicks (月牙纹), a
// sawtooth edge (锯齿纹) and a window flower (窗花) in each corner, and the
// title in a seal. Wide bands of scenery (hills, sky, water) are left out,
// as a paper cut leaves its ground empty.

const BANDS = new Set([
  'hills',
  'earth',
  'sky',
  'chaos',
  'river',
  'flood',
  'rain',
  'mountains',
  'wall',
  'milky',
  'stars',
  'hall',
])

const CREAM = '#f6ecd8'
const MEDALLION = '#edd8a6'

// The ground under the figures' feet, its top in gentle waves
function ground(y: number) {
  let d = `M-400 ${y}`
  for (let x = -400; x < 2000; x += 200)
    d += `C${x + 50} ${y - 12} ${x + 150} ${y + 12} ${x + 200} ${y}`
  return `${d}L2000 1100L-400 1100Z`
}

// The part of the stage the cover shows: round what is on it, the ground
// kept at the foot, as wide as 16 to 9 allows (never wider than the stage)
function view(sprites: Array<Sprite>, cast: Array<StillPuppet>) {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  const add = (x: number, y: number) => {
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
  }
  const corners = (b: readonly [number, number, number, number]) =>
    [
      [b[0], b[1]],
      [b[0] + b[2], b[1]],
      [b[0], b[1] + b[3]],
      [b[0] + b[2], b[1] + b[3]],
    ] as const
  for (const s of sprites) {
    const k = s.scale ?? 1
    for (const [x, y] of corners(s.box))
      add(s.at[0] + (s.flip ? -x : x) * k, s.at[1] + y * k)
  }
  for (const p of cast)
    for (const { part, m } of p.parts)
      for (const c of corners(part.box)) {
        const [x, y] = point(m, c)
        add(x, y)
      }
  if (!Number.isFinite(x0)) return { x: 0, y: 40, s: 1600 / 1671 }
  // a little room above, the paper ground below, and never more than 1.6
  // times as close
  const foot = 940
  const h = Math.min(foot, Math.max(foot / 1.6, foot - y0 + 50))
  const w = (h * 16) / 9
  const mid = (Math.max(0, x0) + Math.min(1600, x1)) / 2
  const x =
    w >= 1600 ? mid - w / 2 : Math.min(1600 - w, Math.max(0, mid - w / 2))
  return { x, y: foot - h, s: 1600 / w }
}

// The frame: a gold sheet with a sawtooth edge, and a red band over it
function frame() {
  const W = 1600
  const H = 900
  let teeth = ''
  const edge = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const t0 = i / n
      const t1 = (i + 0.5) / n
      const t2 = (i + 1) / n
      const at = (t: number) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
      const [ax, ay] = at(t0)
      const [bx, by] = at(t1)
      const [cx, cy] = at(t2)
      // the tooth points outward: to the left of the direction of travel
      const nx = (y1 - y0) / Math.hypot(x1 - x0, y1 - y0)
      const ny = -(x1 - x0) / Math.hypot(x1 - x0, y1 - y0)
      teeth += `${i === 0 ? 'M' : 'L'}${ax} ${ay}L${bx + nx * 16} ${by + ny * 16}L${cx} ${cy}`
    }
  }
  edge(-58, -58, W + 58, -58, 44)
  edge(W + 58, -58, W + 58, H + 58, 26)
  edge(W + 58, H + 58, -58, H + 58, 44)
  edge(-58, H + 58, -58, -58, 26)
  const gold = `${teeth}Z`
  const red = `M-48 -48H${W + 48}V${H + 48}H-48Z M8 44Q8 8 44 8H${W - 44}Q${W - 8} 8 ${W - 8} 44V${H - 44}Q${W - 8} ${H - 8} ${W - 44} ${H - 8}H44Q8 ${H - 8} 8 ${H - 44}Z`
  // crescents along the red band, each turned to face out
  const nicks: Array<{ x: number; y: number; rot: number }> = []
  for (let x = 130; x < W - 110; x += 52)
    nicks.push({ x, y: -20, rot: 0 }, { x, y: H + 20, rot: 180 })
  for (let y = 130; y < H - 110; y += 52)
    nicks.push({ x: -20, y, rot: 90 }, { x: W + 20, y, rot: 270 })
  return { gold, red, nicks }
}

export function PaperCut({
  id,
  className = '',
}: {
  id: string
  className?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const story = STORIES.find((s) => s.id === id)
  const scene = useMemo(() => {
    if (!story) return null
    const staged = stageAt(story, story.cover ?? 0)
    const specs = staged.set.filter((spec) => !BANDS.has(spec.split(':')[0]))
    const live = (spec: string) => spritesOf(spec).filter((s) => !s.gone)
    const sprites = specs.flatMap(live)
    const cast = stillCast(story.cast ?? {}, staged)
    // clouds may drift off the edge: the view is framed without them
    const framed = specs.filter((spec) => spec !== 'clouds').flatMap(live)
    return { sprites, cast, view: view(framed, cast) }
  }, [story])
  const f = useMemo(frame, [])
  if (!story || !scene) return null
  const seed = [...story.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)
  // The title in a seal: two columns, read from the right, top to bottom
  const chars = [...story.zh]
  const cols = [chars.slice(0, 2), chars.slice(2, 4)]
  return (
    <svg
      viewBox="-72 -72 1744 1044"
      className={className}
      style={{ aspectRatio: '1744 / 1044', height: 'auto' }}
      role="img"
      aria-label={`Paper cut: ${story.title}`}
    >
      <defs>
        <filter id={`${uid}lift`} x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow
            dx="4"
            dy="6"
            stdDeviation="4"
            floodColor="#5a1a10"
            floodOpacity="0.35"
          />
        </filter>
        <filter id={`${uid}grain`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.6"
            numOctaves="2"
            seed="3"
          />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0 0.2  0 0 0 0.09 0" />
        </filter>
        <clipPath id={`${uid}clip`}>
          <rect x="8" y="8" width="1584" height="884" rx="36" />
        </clipPath>
        <mask
          id={`${uid}nicks`}
          maskUnits="userSpaceOnUse"
          x="-72"
          y="-72"
          width="1744"
          height="1044"
        >
          <rect x="-72" y="-72" width="1744" height="1044" fill="#fff" />
          {f.nicks.map(({ x, y, rot }, i) => (
            <path
              key={i}
              d={`M${x - 14} ${y - 4}a14 14 0 0 0 28 0a14 9 0 0 1 -28 0z`}
              fill="#000"
              transform={`rotate(${rot} ${x} ${y})`}
            />
          ))}
        </mask>
      </defs>
      <rect x="-72" y="-72" width="1744" height="1044" fill={CREAM} />
      <rect
        x="-72"
        y="-72"
        width="1744"
        height="1044"
        filter={`url(#${uid}grain)`}
      />
      <g filter={`url(#${uid}lift)`}>
        <g clipPath={`url(#${uid}clip)`}>
          <FlowerCut
            seed={seed + 3}
            folds={12}
            x={800}
            y={430}
            r={400}
            gold={false}
            color={MEDALLION}
          />
          <g
            transform={`scale(${scene.view.s}) translate(${-scene.view.x} ${-scene.view.y})`}
          >
            {scene.sprites.map((s, i) => {
              const k = s.scale ?? 1
              return (
                <CutGroup
                  key={`s${i}`}
                  shapes={s.shapes}
                  box={s.box}
                  material="paper"
                  transform={`translate(${s.at[0]} ${s.at[1]}) scale(${s.flip ? -k : k} ${k})`}
                />
              )
            })}
            {scene.cast.flatMap((p) =>
              p.parts.map(({ part, m }) => (
                <CutGroup
                  key={`${p.id}-${part.id}`}
                  shapes={part.shapes}
                  box={part.box}
                  material="paper"
                  transform={matrix(m)}
                />
              )),
            )}
            <CutGroup
              shapes={[{ d: ground(858), dye: 'red', cut: 'scales', cs: 1.5 }]}
              box={[-400, 820, 2400, 300]}
              material="paper"
            />
          </g>
        </g>
        <path d={f.gold} fill={PAPER_GOLD} fillRule="evenodd" />
        <path
          d={f.red}
          fill={PAPER_RED}
          fillRule="evenodd"
          mask={`url(#${uid}nicks)`}
        />
        {[
          [0, 0],
          [1600, 0],
          [0, 900],
          [1600, 900],
        ].map(([x, y]) => (
          <FlowerCut key={`${x}${y}`} seed={seed} x={x} y={y} r={118} />
        ))}
        <g transform="translate(1388 694)">
          <rect width="150" height="150" rx="12" fill={PAPER_RED} />
          <rect
            x="9"
            y="9"
            width="132"
            height="132"
            rx="8"
            fill="none"
            stroke={CREAM}
            strokeWidth="4"
          />
          {cols.map((col, c) =>
            col.map((ch, r) => (
              <text
                key={`${c}${r}`}
                x={c === 0 ? 109 : 41}
                y={66 + r * 58}
                textAnchor="middle"
                fontSize="54"
                fill={CREAM}
                className="zh"
              >
                {ch}
              </text>
            )),
          )}
        </g>
      </g>
    </svg>
  )
}
