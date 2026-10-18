import * as THREE from 'three'
import { ENCOUNTERS } from '../../data/encounters'
import {
  clamp,
  disposeTree,
  easeIn,
  easeInOut,
  easeOut,
  lumpy,
  mix,
  noise3,
  paint,
  rng,
  shared,
} from './kit'
import {
  Builder,
  at,
  blinkA,
  lathe,
  makeJunk,
  makeSaucer,
  panels,
} from './models'
import type { Fx } from './fx'
import type { Kit } from './kit'
import type { SaucerModel } from './models'
import type { Sfx } from './sound'
import type { Cue, Visitor } from '../../data/encounters'

// The ships met on the way (data/encounters.ts): each comes up out of the
// distance and waits ahead of the starship while they talk, steps aside
// for a fight, and leaves as its script says. Their models are here too,
// flat-shaded and low-poly like the rest (models.ts): a young alien's
// pod, beings of living crystal, a pirate ship and its fighters, the
// robots' gate, a Chinese dragon, a crippled ship and the trader's junk.

// Where a visitor waits while it talks, and while the ship fights
// (a little right of the middle, clear of the hail on the left)
const TALK = new THREE.Vector3(2.6, 2.3, -24)
const ASIDE = new THREE.Vector3(5.5, 6.5, -58)
// Where some wait instead: the small pod nearer, the vast ones further off
const HOME: Partial<Record<Visitor, THREE.Vector3>> = {
  pod: new THREE.Vector3(2, 1.8, -17),
  box: new THREE.Vector3(3.2, 2.6, -36),
  stone: new THREE.Vector3(3.2, 2.4, -34),
  jelly: new THREE.Vector3(2.8, 4.4, -30),
  swarm: new THREE.Vector3(2.6, 2.4, -27),
}
const FAR = -170

export interface VisitorCtx {
  kit: Kit
  fx: Fx
  sfx: Sfx
  ship: () => THREE.Vector3
  // How fast space flows past, units a second
  flow: () => number
  reduced: boolean
  // A narrow screen, where the hail panel covers more of the view
  narrow: boolean
}

// --- Models ---

// The young alien's pod: a round shell with a band, a window and an aerial
function makePod(kit: Kit) {
  const group = new THREE.Group()
  const b = new Builder()
  b.add(
    lathe(
      [
        [0.001, 0.62],
        [0.36, 0.52],
        [0.58, 0.22],
        [0.62, -0.06],
        [0.5, -0.36],
        [0.22, -0.55],
        [0.001, -0.58],
      ],
      10,
    ),
    panels('#d9f2c4', '#bfe0a8', 10),
  )
  b.add(
    new THREE.TorusGeometry(0.66, 0.1, 4, 14),
    '#5aa04a',
    at(0, -0.05, 0, Math.PI / 2),
  )
  b.add(
    new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4),
    '#7a8a70',
    at(0, 0.82, 0),
  )
  const body = new THREE.Mesh(
    b.build(),
    kit.lit('#ffffff', { vertexColors: true }),
  )
  group.add(body)
  const window = new THREE.Mesh(
    kit.memo('pod-window', () => {
      const g = new THREE.SphereGeometry(
        0.3,
        8,
        5,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      )
      g.userData.shared = true
      return kit.keep(g)
    }),
    kit.bright('#9ff4ff'),
  )
  window.position.set(0, 0.12, 0.42)
  window.rotation.x = Math.PI / 2.4
  group.add(window)
  const light = new THREE.Mesh(
    kit.memo('pod-light', () => {
      const g = new THREE.BoxGeometry(0.12, 0.12, 0.12)
      g.userData.shared = true
      return kit.keep(g)
    }),
    blinkA(kit),
  )
  light.position.y = 1.1
  group.add(light)
  const glow = kit.sprite('#b8ff7a', 0.9, { opacity: 0.7 })
  glow.position.y = 1.1
  group.add(glow)
  return group
}

// Beings of living crystal: a cluster of glowing shards round a heart
function makeCrystal(kit: Kit) {
  const group = new THREE.Group()
  const b = new Builder()
  const tint = (c: THREE.Vector3) =>
    new THREE.Color().setHSL(
      0.5 + clamp(c.y * 0.08, -0.12, 0.2),
      0.75,
      0.62 + c.y * 0.04,
    )
  b.add(
    new THREE.OctahedronGeometry(1.0, 0),
    tint,
    at(0, 0, 0, 0, 0.4, 0, 0.8, 1.6, 0.8),
  )
  const shards: Array<[number, number, number, number]> = [
    [1.0, 0.3, 0.1, 0.55],
    [-0.95, -0.2, 0.2, 0.6],
    [0.3, 1.1, -0.2, 0.45],
    [-0.4, -1.1, 0.1, 0.5],
    [0.7, -0.8, -0.3, 0.4],
    [-0.7, 0.9, 0.3, 0.42],
  ]
  for (const [x, y, z, s] of shards)
    b.add(
      new THREE.OctahedronGeometry(1, 0),
      tint,
      at(
        x,
        y,
        z,
        Math.atan2(y, x),
        0,
        Math.atan2(x, y),
        s * 0.6,
        s * 1.5,
        s * 0.6,
      ),
    )
  group.add(
    new THREE.Mesh(
      b.build(),
      kit.lit('#ffffff', { vertexColors: true, emissive: '#1d3a5a' }),
    ),
  )
  const glows: Array<THREE.Sprite> = []
  for (const [x, y, z, c] of [
    [0, 0, 0, '#9ff4ff'],
    [0.9, 0.3, 0.2, '#c8a0ff'],
    [-0.9, -0.2, 0.2, '#a0ffd8'],
  ] as const) {
    const s = kit.sprite(c, 2.6, { own: true, opacity: 0.55 })
    s.position.set(x, y, z)
    group.add(s)
    glows.push(s)
  }
  group.userData.own = glows.map((g) => g.material)
  return { group, glows }
}

// The pirates' ship: a raider like a bird of prey, its command pod out in
// front on a long neck, wings swept down to gun pods, green-grey with red
// markings and red lights; a fighter is the same, short in the neck
function makePirate(kit: Kit, fighter = false) {
  const group = new THREE.Group()
  const b = new Builder()
  const hull = (c: THREE.Vector3) =>
    c.y > 0.12 ? '#6c7c66' : c.y < -0.1 ? '#3a4438' : '#56654f'
  const head = fighter ? 0.75 : 1.65
  // The command pod, its axis along z
  b.add(
    lathe(
      [
        [0.001, 0.55],
        [0.34, 0.48],
        [0.52, 0.18],
        [0.5, -0.22],
        [0.26, -0.5],
        [0.001, -0.56],
      ],
      10,
    ),
    hull,
    at(0, 0, head, Math.PI / 2, 0, 0, 1, 1, 0.8),
  )
  if (!fighter)
    b.add(
      new THREE.CylinderGeometry(0.12, 0.17, 1.3, 12),
      '#4c5a48',
      at(0, 0.02, 0.85, Math.PI / 2),
    )
  // The body, broad and flat
  b.add(
    lathe(
      [
        [0.001, 0.6],
        [0.5, 0.45],
        [0.76, 0.02],
        [0.6, -0.5],
        [0.001, -0.62],
      ],
      10,
    ),
    hull,
    at(0, 0, -0.3, Math.PI / 2, 0, 0, 1.45, 1.2, 0.55),
  )
  // Wings swept down, red at the leading edge, gun pods at the tips
  for (const s of [-1, 1]) {
    b.add(
      new THREE.BoxGeometry(2.3, 0.08, 0.95),
      (c) => (c.z > 0.3 ? '#9a2a1e' : c.y > 0 ? '#617058' : '#3e483b'),
      at(s * 1.42, -0.24, -0.35, 0, s * -0.18, s * -0.34),
    )
    b.add(
      new THREE.CylinderGeometry(0.11, 0.11, 1.0, 12),
      '#4a5646',
      at(s * 2.52, -0.66, -0.2, Math.PI / 2),
    )
  }
  group.add(
    new THREE.Mesh(b.build(), kit.lit('#ffffff', { vertexColors: true })),
  )
  // A band of red windows across the pod
  const windows = new THREE.Mesh(
    kit.memo('raider-windows', () =>
      shared(new THREE.BoxGeometry(0.62, 0.07, 0.04), kit),
    ),
    kit.bright('#ff5a3a'),
  )
  windows.position.set(0, 0.12, head + 0.42)
  group.add(windows)
  // Red lights at the gun pods, a glow in the pod, engines at the back
  for (const s of [-1, 1]) {
    const l = kit.sprite('#ff3a2a', 0.8)
    l.position.set(s * 2.52, -0.66, 0.32)
    group.add(l)
  }
  const dome = kit.sprite('#ff7a4a', 1.1, { opacity: 0.55 })
  dome.position.set(0, 0.1, head + 0.3)
  group.add(dome)
  const under = kit.sprite('#ff5a2a', 1.8, { own: true, opacity: 0.45 })
  under.position.set(0, 0, -0.95)
  group.add(under)
  group.userData.own = [under.material]
  return { group, under, dome }
}

// A pirate fighter, for the fights: shaped like the saucers' models
export function makeFighter(kit: Kit): SaucerModel {
  return makePirate(kit, true)
}

// The robots' gate: a square frame hung with lights, and the robot that
// keeps it, a cube with one eye, floating in the middle
function makeGate(kit: Kit) {
  const group = new THREE.Group()
  const b = new Builder()
  const steel = (c: THREE.Vector3) =>
    Math.floor((c.x + c.y) * 1.3) & 1 ? '#8e929c' : '#7a7e88'
  const W = 5.2
  const H = 4.0
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(1.0, H * 2 + 1, 1.2), steel, at(s * W, 0, 0))
    b.add(new THREE.BoxGeometry(W * 2 + 1, 1.0, 1.2), steel, at(0, s * H, 0))
  }
  // Greebles along the frame
  for (let i = 0; i < 14; i++) {
    const side = i % 4
    const k = ((i * 37) % 11) / 11 - 0.5
    const [x, y] =
      side === 0
        ? [W + 0.6, k * H * 1.8]
        : side === 1
          ? [-W - 0.6, k * H * 1.8]
          : side === 2
            ? [k * W * 1.8, H + 0.6]
            : [k * W * 1.8, -H - 0.6]
    b.add(new THREE.BoxGeometry(0.4, 0.4, 0.7), '#5a5e68', at(x, y, 0.1))
  }
  group.add(
    new THREE.Mesh(b.build(), kit.lit('#ffffff', { vertexColors: true })),
  )
  // Lights in the corners, red while shut and green once open
  const lights: Array<THREE.Sprite> = []
  for (const [x, y] of [
    [W, H],
    [-W, H],
    [W, -H],
    [-W, -H],
  ]) {
    const s = kit.sprite('#ff3a2a', 2.2, { own: true })
    s.position.set(x, y, 0.8)
    group.add(s)
    lights.push(s)
  }
  // The keeper: a cube with one eye
  const keeper = new THREE.Group()
  const kb = new Builder()
  kb.add(new THREE.BoxGeometry(1.8, 1.8, 1.8), panels('#b8bcc4', '#a4a8b0', 4))
  kb.add(new THREE.BoxGeometry(1.1, 0.5, 0.2), '#2a2e38', at(0, 0, 0.92))
  kb.add(
    new THREE.CylinderGeometry(0.05, 0.05, 0.8, 4),
    '#5a5e68',
    at(0, 1.3, 0),
  )
  keeper.add(
    new THREE.Mesh(kb.build(), kit.lit('#ffffff', { vertexColors: true })),
  )
  const eye = kit.sprite('#ff3a2a', 1.4, { own: true })
  eye.position.set(0, 0, 1.05)
  keeper.add(eye)
  const tip = kit.sprite('#ff3a2a', 0.6, { own: true })
  tip.position.set(0, 1.75, 0)
  keeper.add(tip)
  group.add(keeper)
  group.userData.own = [...lights, eye, tip].map((s) => s.material)
  return { group, keeper, lights: [...lights, eye, tip] }
}

// A Chinese dragon: a long red body with a gold belly and spines, swimming
// in waves behind a horned, whiskered head
const SEGMENTS = 26

function makeDragon(kit: Kit) {
  const group = new THREE.Group()
  const head = new THREE.Group()
  const hb = new Builder()
  // Snout toward +z, a heavy brow, a jaw, horns swept back
  hb.add(new THREE.BoxGeometry(0.9, 0.5, 1.3), '#c8372d', at(0, 0, 0.45))
  hb.add(new THREE.BoxGeometry(1.15, 0.75, 0.9), '#b02e26', at(0, 0.1, -0.35))
  hb.add(
    new THREE.BoxGeometry(0.8, 0.22, 1.1),
    '#e8b84a',
    at(0, -0.33, 0.4, 0.12),
  )
  hb.add(new THREE.BoxGeometry(1.25, 0.18, 0.3), '#e8b84a', at(0, 0.45, 0.0))
  for (const s of [-1, 1]) {
    hb.add(
      new THREE.ConeGeometry(0.1, 1.3, 4),
      '#f2e0b0',
      at(s * 0.35, 0.75, -0.75, -1.0, 0, s * -0.35),
    )
    // Whiskers, long and gold
    hb.add(
      new THREE.BoxGeometry(0.04, 0.04, 1.6),
      '#e8b84a',
      at(s * 0.65, -0.05, 0.75, 0.2, s * 0.7, 0),
    )
    // A green mane at the sides
    hb.add(
      new THREE.ConeGeometry(0.22, 0.8, 4),
      '#3f9a6a',
      at(s * 0.6, 0.1, -0.7, 0, 0, s * 1.3),
    )
  }
  // Teeth
  for (const s of [-1, 1])
    hb.add(
      new THREE.ConeGeometry(0.06, 0.2, 3),
      '#ffffff',
      at(s * 0.3, -0.25, 1.0, Math.PI),
    )
  head.add(
    new THREE.Mesh(hb.build(), kit.lit('#ffffff', { vertexColors: true })),
  )
  for (const s of [-1, 1]) {
    const eye = kit.sprite('#ffe066', 0.55)
    eye.position.set(s * 0.42, 0.25, 0.5)
    head.add(eye)
  }
  // The pearl it holds under its chin
  const pearl = new THREE.Group()
  const pearlCore = new THREE.Mesh(
    kit.memo('pearl', () => {
      const g = new THREE.IcosahedronGeometry(0.22, 1)
      g.userData.shared = true
      return kit.keep(g)
    }),
    kit.bright('#fff6e0'),
  )
  pearl.add(pearlCore, kit.sprite('#fff2c4', 1.4, { opacity: 0.8 }))
  pearl.position.set(0, -0.7, 1.0)
  head.add(pearl)
  group.add(head)
  // The body: one shape, scaled down toward the tail
  const segGeo = kit.memo('dragon-seg', () => {
    const b = new Builder()
    b.add(
      new THREE.CylinderGeometry(0.5, 0.5, 1.0, 6),
      (c) => (c.y < -0.15 || (c.x < -0.3 && c.z < 0) ? '#e8b84a' : '#c8372d'),
      at(0, 0, 0, Math.PI / 2),
    )
    b.add(new THREE.ConeGeometry(0.14, 0.5, 4), '#e8b84a', at(0, 0.55, 0))
    const g = b.build()
    g.userData.shared = true
    return kit.keep(g)
  })
  const mat = kit.lit('#ffffff', { vertexColors: true })
  const segs: Array<THREE.Mesh> = []
  for (let i = 0; i < SEGMENTS; i++) {
    const m = new THREE.Mesh(segGeo, mat)
    const taper = mix(1.05, 0.25, i / (SEGMENTS - 1))
    m.scale.set(taper, taper, 1)
    group.add(m)
    segs.push(m)
  }
  return { group, head, segs, pearl }
}

// The pilot's crippled ship: an orange capsule with one wing whole and the
// other broken off
function makeWreck(kit: Kit) {
  const group = new THREE.Group()
  const b = new Builder()
  b.add(
    lathe(
      [
        [0.001, 1.3],
        [0.3, 1.0],
        [0.45, 0.3],
        [0.45, -0.7],
        [0.32, -1.1],
        [0.001, -1.15],
      ],
      8,
    ),
    panels('#d9762b', '#c4651f', 8),
    at(0, 0, 0, Math.PI / 2),
  )
  b.add(
    new THREE.BoxGeometry(1.6, 0.08, 0.7),
    '#e6e1d8',
    at(-1.0, 0, -0.2, 0, 0, 0.1),
  )
  b.add(
    new THREE.BoxGeometry(0.5, 0.08, 0.6),
    '#4a3a30',
    at(0.65, 0, -0.2, 0, 0, -0.5),
  )
  b.add(new THREE.BoxGeometry(0.5, 0.3, 0.25), '#2a2228', at(0, 0.25, 0.6))
  group.add(
    new THREE.Mesh(b.build(), kit.lit('#ffffff', { vertexColors: true })),
  )
  const engine = kit.sprite('#7adfff', 1.2, { own: true, opacity: 0.15 })
  engine.position.set(0, 0, -1.25)
  group.add(engine)
  group.userData.own = [engine.material]
  return { group, engine }
}

// A vast box drifting in space: a cube of dull grey-green plates with one
// seam of white light across its face
function makeBox(kit: Kit) {
  const group = new THREE.Group()
  const geo = kit.memo('box', () => {
    const r = rng(7)
    const g = paint(new THREE.BoxGeometry(7, 7, 7, 5, 5, 5), (c) => {
      const plate =
        (Math.floor(c.x * 0.7 + 9) + Math.floor(c.y * 0.7 + 9) * 3) % 4
      return new THREE.Color(
        ['#5c6a5e', '#4f5c52', '#56645a', '#606e62'][plate],
      ).multiplyScalar(0.9 + r() * 0.15)
    })
    return shared(g, kit)
  })
  group.add(new THREE.Mesh(geo, kit.lit('#ffffff', { vertexColors: true })))
  const seamMat = kit.keep(new THREE.MeshBasicMaterial({ color: '#eef8ff' }))
  const seam = new THREE.Mesh(
    kit.memo('box-seam', () =>
      shared(new THREE.BoxGeometry(7.1, 0.12, 0.1), kit),
    ),
    seamMat,
  )
  seam.position.set(0, 0.6, 3.52)
  group.add(seam)
  const glows: Array<THREE.Sprite> = []
  for (let i = -3; i <= 3; i++) {
    const g = kit.sprite('#cfe8ff', 1.6, { own: true, opacity: 0.5 })
    g.position.set(i, 0.6, 3.7)
    group.add(g)
    glows.push(g)
  }
  group.userData.own = [seamMat, ...glows.map((g) => g.material)]
  return { group, seamMat, glows }
}

// A space creature as large as the ship: a glowing, translucent bell with
// tendrils of light trailing beneath it
const TENDRILS = 10
const KNOTS = 9

function makeJelly(kit: Kit) {
  const group = new THREE.Group()
  const bellMat = kit.keep(
    new THREE.MeshBasicMaterial({
      color: '#d9a8ff',
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  const bell = new THREE.Mesh(
    kit.memo('jelly-bell', () =>
      shared(
        lathe(
          [
            [0.001, 1.5],
            [0.8, 1.38],
            [1.5, 1.0],
            [2.0, 0.45],
            [2.25, -0.05],
            [2.0, -0.12],
          ],
          14,
        ),
        kit,
      ),
    ),
    bellMat,
  )
  group.add(bell)
  const inner = kit.sprite('#ffb8f0', 3.6, { own: true, opacity: 0.6 })
  inner.position.y = 0.6
  group.add(inner)
  // Lights round the rim
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const l = kit.sprite('#ffe9a8', 0.5)
    l.position.set(Math.cos(a) * 2.15, -0.05, Math.sin(a) * 2.15)
    group.add(l)
  }
  const tendrils: Array<Array<THREE.Sprite>> = []
  for (let j = 0; j < TENDRILS; j++) {
    const knots: Array<THREE.Sprite> = []
    for (let k = 0; k < KNOTS; k++) {
      const s = kit.sprite(k % 3 ? '#e8b0ff' : '#ffe9a8', 0.55 - k * 0.03, {
        opacity: 0.85,
      })
      group.add(s)
      knots.push(s)
    }
    tendrils.push(knots)
  }
  group.userData.own = [bellMat, inner.material]
  return {
    group,
    animate: (_dt: number, t: number) => {
      const pulse = Math.sin(t * 1.6)
      bell.scale.set(1 - pulse * 0.06, 1 + pulse * 0.1, 1 - pulse * 0.06)
      inner.material.opacity = 0.5 + pulse * 0.15
      tendrils.forEach((knots, j) => {
        const a = (j / TENDRILS) * Math.PI * 2
        knots.forEach((s, k) => {
          const sway = Math.sin(t * 1.3 - k * 0.5 + j) * k * 0.1
          const r = 1.6 - k * 0.06
          s.position.set(
            Math.cos(a) * r + sway,
            -0.3 - k * 0.6,
            Math.sin(a) * r + Math.cos(t * 1.1 - k * 0.4 + j) * k * 0.08,
          )
        })
      })
    },
  }
}

// A hive mind: dozens of small glowing shapes hovering in formation, each
// pulsing in turn
function makeSwarm(kit: Kit) {
  const group = new THREE.Group()
  const r = rng(23)
  const geos = kit.memo('swarm-shapes', () => [
    shared(new THREE.TetrahedronGeometry(0.45), kit),
    shared(new THREE.BoxGeometry(0.55, 0.55, 0.55), kit),
    shared(new THREE.OctahedronGeometry(0.42), kit),
    shared(new THREE.IcosahedronGeometry(0.36, 0), kit),
  ])
  const colours = ['#ff4fd8', '#7dffc0', '#ffd27a', '#8cb6f5']
  const shapes: Array<{
    mesh: THREE.Mesh
    glow: THREE.Sprite
    base: THREE.Vector3
    spin: number
    phase: number
  }> = []
  for (let i = 0; i < 34; i++) {
    const c = colours[i % colours.length]
    const mesh = new THREE.Mesh(geos[i % geos.length], kit.bright(c))
    const glow = kit.sprite(c, 1.3, { opacity: 0.55 })
    // An ellipsoid of shapes, thicker in the middle
    const a = r() * Math.PI * 2
    const b = Math.acos(r() * 2 - 1)
    const d = Math.cbrt(r())
    const base = new THREE.Vector3(
      Math.sin(b) * Math.cos(a) * 4.2 * d,
      Math.cos(b) * 2.4 * d,
      Math.sin(b) * Math.sin(a) * 2.6 * d,
    )
    group.add(mesh, glow)
    shapes.push({ mesh, glow, base, spin: 0.6 + r() * 1.5, phase: r() * 6 })
  }
  return {
    group,
    animate: (_dt: number, t: number) => {
      group.rotation.y = t * 0.15
      for (const s of shapes) {
        s.mesh.position
          .copy(s.base)
          .add(new THREE.Vector3(0, Math.sin(t * 1.4 + s.phase) * 0.18, 0))
        s.mesh.rotation.set(t * s.spin, t * s.spin * 0.7, 0)
        s.glow.position.copy(s.mesh.position)
        // A wave of light passes through the hive
        const wave = Math.sin(t * 3 - s.base.x * 0.9 + s.phase * 0.2)
        s.glow.scale.setScalar(1.0 + Math.max(0, wave) * 1.2)
      }
    },
  }
}

// The ship of a being with an enormous mind: a pale, smooth sphere with a
// band of blue light round it
function makeMind(kit: Kit) {
  const group = new THREE.Group()
  const b = new Builder()
  b.add(new THREE.IcosahedronGeometry(1.6, 2), (c) =>
    c.y > 0.9 ? '#f2f4f8' : c.y < -0.9 ? '#c8ccd6' : '#e2e6ee',
  )
  b.add(
    new THREE.CylinderGeometry(0.5, 0.9, 0.5, 10),
    '#b8bcc8',
    at(0, -1.7, 0),
  )
  group.add(
    new THREE.Mesh(b.build(), kit.lit('#ffffff', { vertexColors: true })),
  )
  const band = new THREE.Mesh(
    kit.memo('mind-band', () =>
      shared(new THREE.TorusGeometry(1.75, 0.08, 4, 32), kit),
    ),
    kit.bright('#8cd8ff'),
  )
  band.rotation.x = Math.PI / 2
  group.add(band)
  const halo = kit.sprite('#a8e4ff', 6, { own: true, opacity: 0.35 })
  group.add(halo)
  group.userData.own = [halo.material]
  return {
    group,
    animate: (_dt: number, t: number) => {
      band.rotation.z = t * 0.6
      halo.material.opacity = 0.3 + Math.sin(t * 1.2) * 0.08
    },
  }
}

// An ancient being: a vast face carved in a drifting asteroid, its eyes
// glowing gold, small rocks floating round it
function makeStone(kit: Kit) {
  const group = new THREE.Group()
  const geo = kit.memo('stone-face', () => {
    const r = rng(41)
    const g = paint(
      lumpy(new THREE.IcosahedronGeometry(1, 2), 0.18, r),
      (c) => {
        const k = 0.8 + noise3(c.x * 3, c.y * 3, c.z * 3, 5) * 0.3
        return new THREE.Color('#7a6a58').multiplyScalar(k)
      },
    )
    return shared(g, kit)
  })
  const rock = new THREE.Mesh(geo, kit.lit('#ffffff', { vertexColors: true }))
  rock.scale.set(3.6, 4.2, 3.2)
  group.add(rock)
  // The face, carved into the side toward the ship
  const f = new Builder()
  for (const s of [-1, 1]) {
    f.add(
      new THREE.BoxGeometry(1.5, 0.45, 0.8),
      '#6a5a4a',
      at(s * 0.95, 0.85, 2.85, 0, 0, s * -0.18),
    )
    f.add(
      new THREE.SphereGeometry(0.42, 6, 4),
      '#2a2018',
      at(s * 0.95, 0.35, 2.75),
    )
  }
  f.add(
    new THREE.ConeGeometry(0.45, 1.3, 4),
    '#74644f',
    at(0, -0.25, 3.0, -0.25),
  )
  f.add(new THREE.BoxGeometry(1.5, 0.18, 0.5), '#2a2018', at(0, -1.25, 2.75))
  group.add(
    new THREE.Mesh(f.build(), kit.lit('#ffffff', { vertexColors: true })),
  )
  const eyes: Array<THREE.Sprite> = []
  for (const s of [-1, 1]) {
    const e = kit.sprite('#ffd27a', 1.6, { own: true, opacity: 0.9 })
    e.position.set(s * 0.95, 0.38, 3.25)
    group.add(e)
    eyes.push(e)
  }
  // Pebbles in orbit
  const shapes = kit.memo('stone-pebbles', () =>
    [0, 1, 2].map((i) =>
      shared(
        paint(
          lumpy(new THREE.IcosahedronGeometry(1, 0), 0.25, rng(60 + i)),
          () => '#6e5f4e',
        ),
        kit,
      ),
    ),
  )
  const pebbles: Array<{ mesh: THREE.Mesh; a: number; r: number; y: number }> =
    []
  for (let i = 0; i < 7; i++) {
    const mesh = new THREE.Mesh(
      shapes[i % 3],
      kit.lit('#ffffff', { vertexColors: true }),
    )
    mesh.scale.setScalar(0.25 + (i % 3) * 0.15)
    group.add(mesh)
    pebbles.push({ mesh, a: i * 0.9, r: 5 + (i % 3), y: (i % 4) - 1.5 })
  }
  group.userData.own = eyes.map((e) => e.material)
  return {
    group,
    animate: (_dt: number, t: number) => {
      group.rotation.y = Math.sin(t * 0.2) * 0.15
      // Heavy-lidded: the eyes glow slowly, as if half asleep
      for (const e of eyes) e.material.opacity = 0.55 + Math.sin(t * 0.9) * 0.3
      for (const p of pebbles) {
        const a = p.a + t * 0.25
        p.mesh.position.set(Math.cos(a) * p.r, p.y, Math.sin(a) * p.r * 0.6)
        p.mesh.rotation.set(t * 0.7, t * 0.5, 0)
      }
    },
  }
}

// --- A visitor and what it does ---

type Mode =
  'arrive' | 'talk' | 'aside' | 'leave' | 'flee' | 'open' | 'gone' | 'stay'

interface Model {
  group: THREE.Group
  // Moves its own parts: the dragon's body, lights
  animate?: (dt: number, time: number) => void
}

export class Visitors {
  readonly group = new THREE.Group()
  private kind: Visitor = 'none'
  private model: Model | null = null
  private extras: Array<{
    obj: THREE.Object3D
    update: (dt: number) => boolean
  }> = []
  private mode: Mode = 'talk'
  private t = 0
  private time = 0
  private pos = new THREE.Vector3()
  private from = new THREE.Vector3()
  private home = TALK.clone()
  private smoke = 0
  private broken = false
  private song = 0

  constructor(private ctx: VisitorCtx) {}

  // A visitor comes out of the distance; returns how long it takes
  meet(kind: Visitor): number {
    this.clear()
    this.kind = kind
    if (kind === 'none') return 0.4
    this.model = this.build(kind)
    this.group.add(this.model.group)
    this.home = (HOME[kind] ?? TALK).clone()
    if (this.ctx.narrow) this.home.add(new THREE.Vector3(1.8, -0.9, 0))
    this.pos.set(this.home.x, this.home.y + 3, FAR)
    this.from.copy(this.pos)
    this.broken = kind === 'wreck'
    this.set('arrive')
    return 2.4
  }

  private build(kind: Visitor): Model {
    const { kit } = this.ctx
    if (kind === 'pod') {
      const g = makePod(kit)
      g.scale.setScalar(1.3)
      return {
        group: g,
        animate: (_dt, t) => {
          g.rotation.z = Math.sin(t * 2.3) * 0.18
          g.rotation.y = Math.sin(t * 0.9) * 0.4
        },
      }
    }
    if (kind === 'crystal') {
      const m = makeCrystal(kit)
      m.group.scale.setScalar(2.2)
      return {
        group: m.group,
        animate: (_dt, t) => {
          m.group.rotation.y = t * 0.35
          m.group.rotation.z = Math.sin(t * 0.6) * 0.15
          const beat = this.song > 0 ? Math.abs(Math.sin(t * 9)) : 0
          m.glows.forEach((g, i) => {
            g.material.opacity =
              0.45 + Math.sin(t * 2 + i * 2) * 0.12 + beat * 0.45
            g.scale.setScalar(2.6 + beat * 1.6)
          })
        },
      }
    }
    if (kind === 'pirate') {
      const m = makePirate(kit)
      m.group.scale.setScalar(2.4)
      return {
        group: m.group,
        animate: (_dt, t) => {
          m.group.rotation.z = Math.sin(t * 1.2) * 0.08
          m.under.material.opacity = 0.35 + Math.sin(t * 14) * 0.1
        },
      }
    }
    if (kind === 'cube') {
      const m = makeGate(kit)
      return {
        group: m.group,
        animate: (_dt, t) => {
          m.keeper.rotation.y = Math.sin(t * 0.7) * 0.25
          m.keeper.position.y =
            Math.sin(t * 1.3) * 0.15 +
            (this.mode === 'open' ? easeInOut(this.t / 1) * 6 : 0)
          const open = this.mode === 'open' || this.mode === 'stay'
          for (const l of m.lights) {
            l.material.color.set(open ? '#40ff70' : '#ff3a2a')
            l.material.opacity = 0.7 + Math.sin(t * 6) * 0.3
          }
        },
      }
    }
    if (kind === 'dragon') {
      const m = makeDragon(kit)
      m.group.scale.setScalar(3.0)
      const p = new THREE.Vector3()
      const prev = new THREE.Vector3()
      const dir = new THREE.Vector3()
      const ahead = new THREE.Vector3(0, 0, 1)
      this.giftAt = () => m.pearl.getWorldPosition(new THREE.Vector3())
      return {
        group: m.group,
        animate: (_dt, t) => {
          m.head.position.set(
            Math.sin(t * 0.9) * 0.4,
            Math.sin(t * 1.3) * 0.25,
            0,
          )
          m.head.rotation.set(
            Math.sin(t * 1.1) * 0.08,
            Math.sin(t * 0.9) * 0.15,
            0,
          )
          prev.copy(m.head.position).add(new THREE.Vector3(0, 0, -0.8))
          // Each segment follows a wave travelling down the body
          m.segs.forEach((s, i) => {
            const k = i + 1
            // The body winds out to the side and back, in waves
            p.set(
              Math.sin(t * 1.2 - k * 0.3) * (0.6 + k * 0.16) + k * 0.12,
              Math.cos(t * 0.9 - k * 0.26) * (0.4 + k * 0.06) - k * 0.04,
              -0.7 - k * 0.5,
            )
            s.position.copy(p)
            s.quaternion.setFromUnitVectors(
              ahead,
              dir.subVectors(prev, p).normalize(),
            )
            prev.copy(p)
          })
          m.pearl.visible = !this.gave
        },
      }
    }
    if (kind === 'wreck') {
      const m = makeWreck(kit)
      m.group.scale.setScalar(1.8)
      return {
        group: m.group,
        animate: (_dt, t) => {
          m.group.rotation.z = this.broken ? Math.sin(t * 0.7) * 0.5 + 0.3 : 0
          m.group.rotation.x = this.broken ? Math.sin(t * 0.5) * 0.2 : 0
          m.engine.material.opacity = this.broken
            ? Math.random() < 0.1
              ? 0.6
              : 0.1
            : 0.9
        },
      }
    }
    if (kind === 'box') {
      const m = makeBox(kit)
      return {
        group: m.group,
        animate: (_dt, t) => {
          m.group.rotation.y = Math.sin(t * 0.12) * 0.5 - 0.35
          m.group.rotation.x = Math.sin(t * 0.09) * 0.12
          const glow = 0.55 + Math.sin(t * 2.2) * 0.3
          m.seamMat.color.setScalar(0.75 + glow * 0.25)
          for (const g of m.glows) g.material.opacity = glow * 0.6
        },
      }
    }
    if (kind === 'jelly') {
      const m = makeJelly(kit)
      m.group.scale.setScalar(1.8)
      return m
    }
    if (kind === 'swarm') {
      const m = makeSwarm(kit)
      m.group.scale.setScalar(1.5)
      return m
    }
    if (kind === 'brain') return makeMind(kit)
    if (kind === 'stone') {
      const m = makeStone(kit)
      m.group.scale.setScalar(1.3)
      return m
    }
    const g = makeJunk(kit)
    g.scale.setScalar(2.6)
    return {
      group: g,
      animate: (_dt, t) => {
        g.rotation.z = Math.sin(t * 1.1) * 0.06
        g.rotation.y = Math.PI + Math.sin(t * 0.5) * 0.15
      },
    }
  }

  private gave = false
  // Where a gift leaves from, when not the visitor itself
  private giftAt: (() => THREE.Vector3) | null = null

  private set(mode: Mode) {
    this.mode = mode
    this.t = 0
    this.from.copy(this.pos)
  }

  // Out of the way of a fight, and back to talk
  aside() {
    if (this.model && (this.mode === 'talk' || this.mode === 'arrive'))
      this.set('aside')
  }

  back() {
    if (this.model && this.mode === 'aside') this.set('talk')
  }

  // What its script tells it to do; returns how long it takes
  cue(c: Cue, allies: Array<string> = []): number {
    const { fx, sfx } = this.ctx
    if (c === 'mum') return this.mum()
    if (c === 'friends') return this.friends(allies)
    if (c === 'gift') {
      if (!this.model) return 0
      // A glowing gift flies to the ship
      const from = this.giftFrom()
      this.gave = true
      fx.bolt(
        from,
        () => this.ctx.ship().add(new THREE.Vector3(0, 0.4, 0)),
        '#ffe9a8',
        () => {
          fx.flash(
            this.ctx.ship().add(new THREE.Vector3(0, 0.4, 0)),
            '#ffe9a8',
            6,
            0.6,
          )
          fx.sparks(this.ctx.ship(), '#fff2c4', 24, 5, 0.6)
        },
      )
      sfx.win()
      return 1.4
    }
    if (!this.model) return 0
    if (c === 'leave') {
      this.broken = false
      this.set('leave')
      sfx.whoosh()
      return 1.6
    }
    if (c === 'flee') {
      this.set('flee')
      fx.explode(this.pos.clone(), { size: 0.9 })
      sfx.boom(0.8)
      return 1.4
    }
    if (c === 'open') {
      this.set('open')
      sfx.shield()
      return 2.6
    }
    if (c === 'gone') {
      this.set('gone')
      return 1.0
    }
    this.set('stay')
    return 0.6
  }

  // Where a gift leaves from: the dragon's pearl, the mother ship
  private giftFrom() {
    if (this.giftAt) return this.giftAt()
    const extra = this.extras.at(0)?.obj
    if (extra) return extra.position.clone()
    return this.pos.clone().add(new THREE.Vector3(0, -0.6, 1.5))
  }

  // The young alien's mother: a great saucer comes down and lifts the pod
  // up into it
  private mum(): number {
    const { kit, fx, sfx } = this.ctx
    const m = makeSaucer(kit)
    m.group.scale.setScalar(3.4)
    const start = new THREE.Vector3(0, 16, -55)
    const stop = this.pos.clone().add(new THREE.Vector3(0, 4.2, -6))
    m.group.position.copy(start)
    this.group.add(m.group)
    let t = 0
    let beamed = false
    sfx.warp()
    this.extras.push({
      obj: m.group,
      update: (dt) => {
        t += dt
        m.group.rotation.y += dt * 0.8
        if (this.mode !== 'leave')
          m.group.position.lerpVectors(start, stop, easeOut(t / 2))
        else m.group.position.add(new THREE.Vector3(0, dt * 9, -dt * 30))
        if (t > 2 && !beamed) {
          beamed = true
          fx.beam(
            () => m.group.position.clone().add(new THREE.Vector3(0, -0.5, 0)),
            () => this.pos.clone(),
            '#7dffc0',
            1.2,
            0.5,
          )
        }
        // The pod rises into it
        if (t > 2.1 && this.mode !== 'leave' && this.model) {
          this.pos.lerp(
            m.group.position.clone().add(new THREE.Vector3(0, -0.4, 0)),
            dt * 1.6,
          )
          this.model.group.scale.setScalar(
            Math.max(0.01, this.model.group.scale.x - dt * 0.5),
          )
        }
        return m.group.position.z > -400
      },
    })
    return 3.4
  }

  // The friends made on the way come to help, each in its own ship (the
  // young alien's mother in her saucer, the crystal beings, the pilot, the
  // creature, the swarm), and fire on the visitor
  private friends(allies: Array<string>): number {
    const { kit, fx, sfx } = this.ctx
    const ships = allies.slice(-3).map((id): Model => {
      if (id === 'lost') {
        const m = makeSaucer(kit)
        m.group.scale.setScalar(3)
        return {
          group: m.group,
          animate: (dt) => (m.group.rotation.y += dt * 1.5),
        }
      }
      const kind = ENCOUNTERS.find((e) => e.id === id)?.visitor
      return kind && kind !== 'none'
        ? this.build(kind)
        : { group: makeJunk(kit) }
    })
    if (!ships.length) ships.push({ group: makeJunk(kit) })
    const spots = [
      new THREE.Vector3(-7, 3.5, -22),
      new THREE.Vector3(9, 4.5, -30),
      new THREE.Vector3(-2, 8.5, -34),
    ]
    ships.forEach((m, i) => {
      const g = m.group
      const stop = spots[i]
      const start = stop.clone().add(new THREE.Vector3(stop.x * 1.5, 4, 40))
      g.position.copy(start)
      this.group.add(g)
      let t = 0
      let shots = 0
      this.extras.push({
        obj: g,
        update: (dt) => {
          t += dt
          m.animate?.(dt, this.time)
          g.position.lerpVectors(start, stop, easeOut((t - i * 0.4) / 1.6))
          if (t > 1.6 + i * 0.3 + shots * 0.5 && shots < 3 && this.model) {
            shots++
            fx.beam(
              () => g.position.clone(),
              () => this.pos.clone(),
              ['#ffb04a', '#5dff9a', '#c8a0ff'][i],
              0.4,
              0.14,
            )
            fx.sparks(this.pos.clone(), '#ffd27a', 14, 6, 0.4)
            sfx.laser()
          }
          if (t > 5) g.position.add(new THREE.Vector3(0, dt * 4, -dt * 25))
          return t < 9
        },
      })
    })
    sfx.warp()
    return 3
  }

  // The crystal beings sing; returns how long
  music(): number {
    this.song = 3.4
    this.ctx.sfx.song()
    return 3.6
  }

  // The encounter is over: what is still here is left behind
  part() {
    if (
      this.model &&
      (this.mode === 'talk' || this.mode === 'aside' || this.mode === 'arrive')
    )
      this.set('stay')
  }

  update(dt: number) {
    this.time += dt
    this.song = Math.max(0, this.song - dt)
    for (const e of [...this.extras])
      if (!e.update(dt)) {
        e.obj.removeFromParent()
        disposeTree(e.obj, this.ctx.kit)
        this.extras.splice(this.extras.indexOf(e), 1)
      }
    const m = this.model
    if (!m) return
    this.t += dt
    const t = this.t
    const bob = new THREE.Vector3(
      Math.sin(this.time * 0.8) * 0.3,
      Math.sin(this.time * 1.4) * 0.25,
      0,
    )
    let done = false
    switch (this.mode) {
      case 'arrive':
        this.pos.lerpVectors(this.from, this.home, easeOut(t / 2.3))
        if (t > 2.3) this.set('talk')
        break
      case 'talk':
        this.pos.lerp(this.home.clone().add(bob), Math.min(1, dt * 2))
        break
      case 'aside':
        this.pos.lerp(ASIDE.clone().add(bob), Math.min(1, dt * 2.2))
        break
      case 'leave':
        this.pos.set(
          this.from.x + easeIn(t / 1.4) * 4,
          this.from.y + easeIn(t / 1.4) * 10,
          this.from.z - easeIn(t / 1.6) * 160,
        )
        done = t > 1.8
        break
      case 'flee': {
        this.pos.set(
          this.from.x - t * 6,
          this.from.y + t * 3,
          this.from.z - easeIn(t / 1.2) * 120,
        )
        m.group.rotation.z += dt * 6
        this.smoke -= dt
        if (this.smoke <= 0) {
          this.smoke = 0.06
          this.ctx.fx.puff(this.pos.clone(), '#2c2828', 1.6, 0.8)
        }
        done = t > 1.6
        break
      }
      case 'open':
        // The gate opens and the ship flies through it
        if (t > 1.0) {
          const k = easeIn((t - 1.0) / 1.8)
          this.pos.set(
            this.from.x,
            mix(this.from.y, 0, Math.min(1, (t - 1) * 1.5)),
            this.from.z + k * 50,
          )
        }
        done = t > 3.0
        break
      case 'gone':
        this.pos.z -= dt * 120
        done = t > 1.2
        break
      case 'stay':
        // Left behind as the ship flies on
        this.pos.z += Math.max(this.ctx.flow(), 10) * dt
        this.pos.x += dt * (this.pos.x >= 0 ? 3 : -3)
        done = this.pos.z > 30
        break
    }
    m.group.position.copy(this.pos)
    m.animate?.(dt, this.time)
    // Smoke from a crippled ship
    if (this.broken) {
      this.smoke -= dt
      if (this.smoke <= 0) {
        this.smoke = 0.18
        this.ctx.fx.puff(
          this.pos.clone().add(new THREE.Vector3(0.9, 0, -0.2)),
          '#3a3434',
          1.2,
          1.0,
        )
        if (Math.random() < 0.25)
          this.ctx.fx.sparks(
            this.pos.clone().add(new THREE.Vector3(0.9, 0, 0)),
            '#ffb040',
            6,
            3,
            0.3,
          )
      }
    }
    if (done) this.drop()
  }

  private drop() {
    if (!this.model) return
    this.model.group.removeFromParent()
    disposeTree(this.model.group, this.ctx.kit)
    this.model = null
    this.broken = false
    this.gave = false
    this.giftAt = null
  }

  clear() {
    this.drop()
    for (const e of this.extras) {
      e.obj.removeFromParent()
      disposeTree(e.obj, this.ctx.kit)
    }
    this.extras = []
    this.song = 0
    this.kind = 'none'
  }

  get present() {
    return this.model !== null && this.kind !== 'none'
  }
}
