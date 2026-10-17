// The shapes of the ornaments, as SVG path data: cloud scrolls (祥云),
// paper-cut corners (剪纸) and a brush stroke. Worked out in code rather
// than drawn, so each is exact and small.

type Pt = [number, number]

const f = (n: number) => Math.round(n * 100) / 100

// An Archimedean spiral around (cx, cy), from radius r0 at angle a0 to
// radius r1 at angle a1 (screen angles in radians, so increasing turns
// clockwise)
export function spiral(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): Array<Pt> {
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 0.12))
  const pts: Array<Pt> = []
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const a = a0 + (a1 - a0) * k
    const r = r0 + (r1 - r0) * k
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}

const line = (pts: Array<Pt>, move = true) =>
  pts
    .map(([x, y], i) => `${i === 0 && move ? 'M' : 'L'}${f(x)} ${f(y)}`)
    .join('')

const mirror = (pts: Array<Pt>): Array<Pt> => pts.map(([x, y]) => [-x, y])

const TOP = -Math.PI / 2
const TURN = Math.PI * 2

// The cloud head of a ruyi sceptre (如意云头), for the middle of a divider,
// in a box from -40 to 40 across and -14 to 14 down: two curls turning
// in, their outer lines rising to meet in a point above, cradled by a
// swell that runs out to x = ±40 at y = 0, where the divider's lines go on
export function ruyiCloud(): string {
  // The cradle under the lobes, from the far left to the far right
  const cradle =
    'M-40 0C-30 0 -24 9.6 -12 9.6C-6 9.6 -3.5 7.4 0 7.4' +
    'C3.5 7.4 6 9.6 12 9.6C24 9.6 30 0 40 0'
  // Two small curls resting on the swell, one each side
  const small = spiral(-21.5, 3.4, 0.5, 3, TOP - TURN * 1.3, TOP + Math.PI / 2)
  return ruyiHead() + cradle + line(small) + line(mirror(small))
}

// The head alone: two curls and the point above them, in a box from -15
// to 15 across and -12 to 8 down
export function ruyiHead(): string {
  // The left lobe, from the curl's centre out, counter-clockwise on the
  // screen, ending at its top heading right
  const curl = spiral(-7.5, 1.5, 0.8, 6.2, TOP - TURN * 1.55, TOP)
  const [tx, ty] = curl[curl.length - 1]
  return (
    line(curl) +
    `C${f(tx + 4.5)} ${f(ty - 0.5)} ${f(-1.6)} -8.2 0 -11.5` +
    `C1.6 -8.2 ${f(-tx - 4.5)} ${f(ty - 0.5)} ${f(-tx)} ${f(ty)}` +
    line(mirror(curl).reverse(), false)
  )
}

// A small curl for the ends of a divider, its tail running out to the
// right to x = 16 at y = 0
export function curlEnd(): string {
  const s = spiral(5, 0, 0.6, 4, TOP - TURN * 1.3, TOP + Math.PI / 2)
  return line(s) + 'C9 4 12 0 16 0'
}

// An arc of a circle around (0, 0) as a path segment
const arcTo = (r: number, a: number, sweep: 0 | 1, large: 0 | 1 = 0) =>
  `A${f(r)} ${f(r)} 0 ${large} ${sweep} ${f(r * Math.cos(a))} ${f(r * Math.sin(a))}`

const at = (r: number, a: number): Pt => [r * Math.cos(a), r * Math.sin(a)]

// A paper-cut corner for a card, a folding fan opened over the corner, in
// a 48 × 48 box with the corner at 0, 0: ribs cut as slits, a scalloped
// edge with a crescent nick in each scallop, a ring cut round the rivet
// (draw with fill-rule evenodd)
export function paperCorner(): string {
  const parts: Array<string> = []
  const R = 34
  const n = 6
  const step = Math.PI / 2 / n
  // The outline: along the top edge, round the scallops, back up the side
  let d = `M0 0L${R} 0`
  for (let i = 0; i < n; i++) {
    const [x, y] = at(R, step * (i + 1))
    const chord = 2 * R * Math.sin(step / 2)
    d += `A${f(chord * 0.58)} ${f(chord * 0.58)} 0 0 1 ${f(x)} ${f(y)}`
  }
  parts.push(d + 'Z')
  // Slits along the ribs between the folds
  for (let i = 1; i < n; i++) {
    const a = step * i
    const [x0, y0] = at(11, a)
    const [x1, y1] = at(28.5, a - 0.035)
    const [x2, y2] = at(28.5, a + 0.035)
    parts.push(`M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}Z`)
  }
  // A crescent nick in each scallop, horns towards the corner
  for (let i = 0; i < n; i++) {
    const a = step * (i + 0.5)
    const [ax, ay] = at(31.5, a - step * 0.27)
    const [bx, by] = at(31.5, a + step * 0.27)
    parts.push(
      `M${f(ax)} ${f(ay)}A4.4 4.4 0 0 0 ${f(bx)} ${f(by)}A6.2 6.2 0 0 1 ${f(ax)} ${f(ay)}Z`,
    )
  }
  // A ring cut round the rivet, stopping short of the edges
  const a0 = 0.16
  const a1 = Math.PI / 2 - 0.16
  const [ix, iy] = at(6.2, a0)
  parts.push(
    `M${f(ix)} ${f(iy)}${arcTo(6.2, a1, 1)}L${f(at(8, a1)[0])} ${f(at(8, a1)[1])}${arcTo(8, a0, 0)}Z`,
  )
  // The rivet itself, a small round hole
  parts.push('M1.6 2.9a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0Z')
  return parts.join('')
}

// A brush stroke in a 200 × 18 box: pressed down at the start, thinning
// as the brush lifts, with streaks of paper showing in its dry end (飞白).
// `seed` varies it. Draw with fill-rule evenodd.
export function brushStroke(seed = 1): string {
  const rand = (i: number) => {
    const x = Math.sin(seed * 9301 + i * 49297) * 233280
    return x - Math.floor(x)
  }
  const top: Array<Pt> = []
  const bottom: Array<Pt> = []
  const n = 28
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const x = 7 + k * 186
    // Heavy where the brush is pressed, thinner as it lifts
    const w = 9.5 * (1 - 0.62 * k ** 1.3) * (k < 0.05 ? 0.82 + k * 3.6 : 1)
    const mid = 9.6 - Math.sin(k * Math.PI) * 1.2 - k * 0.8
    const j = (rand(i) - 0.5) * 0.7
    top.push([x, mid - w / 2 + j])
    bottom.push([x, mid + w / 2 + j * 0.5 + (k > 0.8 ? (k - 0.8) * 3 : 0)])
  }
  const [sx, sy] = top[0]
  const [bx, by] = bottom[0]
  let d = `M${f(sx)} ${f(sy)}`
  d += top
    .slice(1)
    .map(([x, y]) => `L${f(x)} ${f(y)}`)
    .join('')
  // The lifted end
  d += 'Q197 7.4 199.5 6.2Q196 9.6 192 11.4'
  d += bottom
    .slice(0, -1)
    .reverse()
    .map(([x, y]) => `L${f(x)} ${f(y)}`)
    .join('')
  // The round press at the start
  d += `C${f(bx - 6)} ${f(by + 1)} ${f(sx - 7)} ${f(sy - 0.5)} ${f(sx)} ${f(sy)}Z`
  // Dry streaks in the second half
  const streaks: Array<[number, number, number]> = [
    [0.38, 1.0, 0.36],
    [0.55, 0.98, 0.68],
    [0.7, 0.96, 0.5],
  ]
  for (const [k0, k1, v] of streaks) {
    const i0 = Math.round(k0 * n)
    const i1 = Math.round(k1 * n)
    const upper: Array<Pt> = []
    const lower: Array<Pt> = []
    for (let i = i0; i <= i1; i++) {
      const k = (i - i0) / (i1 - i0)
      const [x, t] = top[i]
      const b = bottom[i][1]
      const y = t + (b - t) * v
      const h = Math.sin(k * Math.PI) * 0.55 * (b - t) * 0.16
      upper.push([x, y - h])
      lower.push([x, y + h])
    }
    d += line(upper) + line(lower.reverse(), false) + 'Z'
  }
  return d
}
