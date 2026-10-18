import * as THREE from 'three'
import { clamp, disposeTree, easeIn, easeInOut, easeOut, mix } from './kit'
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
const FAR = -170

export interface VisitorCtx {
  kit: Kit
  fx: Fx
  sfx: Sfx
  ship: () => THREE.Vector3
  // How fast space flows past, units a second
  flow: () => number
  reduced: boolean
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

// The pirates' ship: a dark wedge with swept wings, red lights and a black
// sail on its back
function makePirate(kit: Kit, fighter = false) {
  const group = new THREE.Group()
  const b = new Builder()
  // The hull seen from above, nose toward +z
  const top = new THREE.Shape()
  top.moveTo(0, 1.9)
  top.lineTo(0.55, 0.2)
  top.lineTo(0.7, -1.3)
  top.lineTo(-0.7, -1.3)
  top.lineTo(-0.55, 0.2)
  top.closePath()
  const hull = new THREE.ExtrudeGeometry(top, {
    depth: 0.5,
    bevelEnabled: false,
  })
  hull.translate(0, 0, -0.25)
  b.add(
    hull,
    (c) => (c.y > 0.2 ? '#6a6274' : c.y < -0.2 ? '#38323f' : '#b04a2a'),
    at(0, 0, 0, -Math.PI / 2, 0, 0),
  )
  // Wings, swept back and down, with spikes
  for (const s of [-1, 1]) {
    b.add(
      new THREE.BoxGeometry(1.9, 0.1, 0.8),
      '#5a5262',
      at(s * 1.35, -0.12, -0.5, 0, s * 0.45, s * -0.25),
    )
    b.add(
      new THREE.ConeGeometry(0.12, 0.9, 4),
      '#8a8290',
      at(s * 2.2, -0.35, 0.05, Math.PI / 2, 0, 0),
    )
  }
  // Guns at the nose
  for (const s of [-1, 1])
    b.add(
      new THREE.BoxGeometry(0.1, 0.1, 0.9),
      '#1a1820',
      at(s * 0.35, -0.15, 1.5),
    )
  if (!fighter) {
    // A mast and a black sail with a red band
    b.add(new THREE.BoxGeometry(0.08, 1.7, 0.08), '#2a2228', at(0, 1.1, -0.5))
    const sail = new THREE.Shape()
    sail.moveTo(-0.75, 0)
    sail.lineTo(0.75, 0)
    sail.lineTo(0.6, 1.3)
    sail.quadraticCurveTo(0, 1.5, -0.6, 1.3)
    sail.closePath()
    b.add(
      new THREE.ShapeGeometry(sail, 2),
      (c) => (c.y > 1.15 && c.y < 1.35 ? '#c8372d' : '#16141c'),
      at(0, 0.45, -0.45),
    )
  }
  group.add(
    new THREE.Mesh(
      b.build(),
      kit.lit('#ffffff', { vertexColors: true, side: THREE.DoubleSide }),
    ),
  )
  // Red running lights at the wing tips, a cockpit glow, engines at the back
  for (const s of [-1, 1]) {
    const l = kit.sprite('#ff3a2a', 0.9)
    l.position.set(s * 2.15, -0.3, -0.6)
    group.add(l)
  }
  const dome = kit.sprite('#ff7a4a', 1.1, { opacity: 0.6 })
  dome.position.set(0, 0.35, 0.6)
  group.add(dome)
  const under = kit.sprite('#ff5a2a', 1.6, { own: true, opacity: 0.4 })
  under.position.set(0, 0, -1.5)
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
    this.home = kind === 'pod' ? new THREE.Vector3(2, 1.8, -17) : TALK.clone()
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
  cue(c: Cue): number {
    const { fx, sfx } = this.ctx
    if (c === 'mum') return this.mum()
    if (c === 'friends') return this.friends()
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

  // Ships of the friends made on the way come to help, and fire on the
  // visitor
  private friends(): number {
    const { kit, fx, sfx } = this.ctx
    const ships = [makeJunk(kit), makeSaucer(kit).group]
    ships.forEach((g, i) => {
      const side = i === 0 ? -1 : 1
      g.scale.setScalar(i === 0 ? 2 : 1.8)
      const start = new THREE.Vector3(side * 14, 3, 18)
      const stop = new THREE.Vector3(side * 6, 3.5, -22)
      g.position.copy(start)
      this.group.add(g)
      let t = 0
      let shots = 0
      this.extras.push({
        obj: g,
        update: (dt) => {
          t += dt
          g.position.lerpVectors(start, stop, easeOut(t / 1.6))
          if (i === 0) g.rotation.y = Math.PI
          else g.rotation.y += dt * 2
          if (t > 1.4 + shots * 0.5 && shots < 3 && this.model) {
            shots++
            fx.beam(
              () => g.position.clone(),
              () => this.pos.clone(),
              i === 0 ? '#ffb04a' : '#5dff9a',
              0.4,
              0.14,
            )
            this.ctx.fx.sparks(this.pos.clone(), '#ffd27a', 14, 6, 0.4)
            sfx.laser()
          }
          if (t > 5) g.position.add(new THREE.Vector3(0, dt * 4, -dt * 25))
          return t < 9
        },
      })
    })
    sfx.warp()
    return 2.8
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
