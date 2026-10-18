import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  clamp,
  colors,
  fbm,
  lumpy,
  noise3,
  paint,
  ramp,
  rng,
  shared,
} from './kit'
import type { Kit } from './kit'
import type { PlanetId } from '../../data/bridge'

// The starship's models: flat-shaded, low-poly, each part painted one
// colour per face and merged into as few meshes as it can be. The player's
// ship faces −z, as everything that comes at it faces +z.

type Painter =
  string | ((centre: THREE.Vector3, face: number) => THREE.Color | string)

export function at(
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = sx,
  sz = sx,
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  )
}

// Collects painted parts and merges them into one geometry
export class Builder {
  private parts: Array<THREE.BufferGeometry> = []

  add(geo: THREE.BufferGeometry, color: Painter, m?: THREE.Matrix4) {
    const g = paint(geo, typeof color === 'string' ? () => color : color)
    if (g !== geo) geo.dispose()
    if (m) g.applyMatrix4(m)
    if (g.hasAttribute('uv')) g.deleteAttribute('uv')
    if (!g.hasAttribute('normal')) g.computeVertexNormals()
    this.parts.push(g)
    return this
  }

  build(): THREE.BufferGeometry {
    const g = mergeGeometries(this.parts) as THREE.BufferGeometry | null
    for (const p of this.parts) p.dispose()
    this.parts = []
    return g ?? new THREE.BufferGeometry()
  }
}

// Turned round the y axis; with twice the segments asked for, so it is
// round when smoothly shaded
export const lathe = (pts: Array<[number, number]>, segments: number) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    segments * 2,
  )

// Panels: alternate faces a shade apart by their angle round the y axis
export function panels(a: string, b: string, n: number) {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  return (c: THREE.Vector3) => {
    const ang = Math.atan2(c.z, c.x) + Math.PI
    return Math.floor((ang / (Math.PI * 2)) * n) % 2 ? ca : cb
  }
}

// --- The player's ship ---

export interface ShipModel {
  group: THREE.Group
  paint: THREE.MeshPhongMaterial
  // Engine glows at the back, scaled by the speed
  engines: Array<THREE.Sprite>
  impulse: THREE.Sprite
  // The glowing strips along the nacelles, red when the engines overheat
  strips: THREE.MeshBasicMaterial
  bussards: Array<THREE.Sprite>
  // Where the lasers leave from, and the retro thrusters fire
  guns: Array<THREE.Vector3>
  nose: THREE.Vector3
}

export function makeShip(kit: Kit): ShipModel {
  const group = new THREE.Group()
  const b = new Builder()
  const hull = '#e4e1da'
  const hull2 = '#d3d0c9'
  const dark = '#8e929c'

  // The saucer, with a red band, a light bridge module and a darker rim
  const red = new THREE.Color('#c8372d')
  const gold = new THREE.Color('#d9a441')
  const top = panels(hull, hull2, 22)
  b.add(
    lathe(
      [
        [0.001, 0.3],
        [0.3, 0.29],
        [0.56, 0.22],
        [0.82, 0.155],
        [0.98, 0.11],
        [1.25, 0.03],
        [1.27, -0.02],
        [1.15, -0.09],
        [0.7, -0.17],
        [0.3, -0.2],
        [0.001, -0.2],
      ],
      22,
    ),
    (c) => {
      const r = Math.hypot(c.x, c.z)
      if (c.y > 0.06) {
        if (r > 0.83 && r < 0.97) return red
        if (r < 0.32) return '#c9ccd4'
        return top(c)
      }
      if (c.y > -0.05) return r > 1.22 ? gold : '#b9bcc4'
      return r > 0.6 ? '#c4c1ba' : dark
    },
    at(0, 0.32, -1.05),
  )
  // Bridge
  b.add(
    new THREE.CylinderGeometry(0.2, 0.27, 0.1, 24),
    '#cfd2d9',
    at(0, 0.67, -1.12),
  )
  b.add(
    new THREE.IcosahedronGeometry(0.16, 0),
    '#eceae4',
    at(0, 0.72, -1.12, 0, 0, 0, 1, 0.5, 1),
  )
  // Impulse deck at the saucer's back
  b.add(new THREE.BoxGeometry(0.72, 0.13, 0.22), hull2, at(0, 0.42, 0.06))
  // The neck, down and back to the engineering hull
  b.add(new THREE.BoxGeometry(0.26, 0.62, 0.7), hull2, at(0, 0.02, 0.05, -0.55))
  // Engineering hull, with a dark shuttle bay at the back
  b.add(
    new THREE.CylinderGeometry(0.24, 0.31, 2.1, 24),
    panels(hull, hull2, 10),
    at(0, -0.26, 0.75, Math.PI / 2),
  )
  b.add(new THREE.BoxGeometry(0.3, 0.2, 0.06), '#3b3f4a', at(0, -0.24, 1.81))
  // Pylons up and out to the nacelles
  for (const s of [-1, 1]) {
    b.add(
      new THREE.BoxGeometry(0.08, 0.95, 0.42),
      hull2,
      at(s * 0.5, 0.17, 1.12, 0, 0, s * -0.98),
    )
    // Nacelle body, a gold collar at the front
    b.add(
      new THREE.CylinderGeometry(0.15, 0.17, 2.3, 20),
      (c) =>
        c.y > 0.95 ? gold : c.y < -1.05 ? '#5d616b' : panels(hull, hull2, 8)(c),
      at(s * 1.0, 0.6, 0.85, -Math.PI / 2),
    )
  }
  // Its own material, to flash red when hit
  const paintMat = kit.keep(
    new THREE.MeshPhongMaterial({
      color: '#ffffff',
      vertexColors: true,
      shininess: 34,
      specular: '#4a4a4a',
    }),
  )
  group.add(new THREE.Mesh(b.build(), paintMat))

  // Lights: the window band round the saucer, the impulse engines, the
  // nacelles' strips and collectors, the deflector dish
  const windows = new THREE.Mesh(
    shared(new THREE.TorusGeometry(1.262, 0.016, 4, 88), kit),
    kit.bright('#ffe6a8'),
  )
  windows.rotation.x = Math.PI / 2
  windows.position.set(0, 0.32, -1.05)
  group.add(windows)

  const impulseFace = new THREE.Mesh(
    shared(new THREE.PlaneGeometry(0.62, 0.08), kit),
    kit.bright('#ff6a3a'),
  )
  impulseFace.position.set(0, 0.42, 0.175)
  group.add(impulseFace)
  const impulse = kit.sprite('#ff7a45', 1.1, { own: true })
  impulse.position.set(0, 0.42, 0.3)
  group.add(impulse)

  const strips = kit.keep(new THREE.MeshBasicMaterial({ color: '#6fe8ff' }))
  const stripGeo = shared(new THREE.BoxGeometry(0.035, 0.1, 1.75), kit)
  const topGeo = shared(new THREE.BoxGeometry(0.1, 0.03, 1.75), kit)
  const collector = shared(new THREE.IcosahedronGeometry(0.16, 1), kit)
  const rearGeo = shared(new THREE.CircleGeometry(0.12, 8), kit)
  const engines: Array<THREE.Sprite> = []
  const bussards: Array<THREE.Sprite> = []
  for (const s of [-1, 1]) {
    const inner = new THREE.Mesh(stripGeo, strips)
    inner.position.set(s * 0.86, 0.6, 0.95)
    const above = new THREE.Mesh(topGeo, strips)
    above.position.set(s * 1.0, 0.765, 0.95)
    const front = new THREE.Mesh(collector, kit.bright('#ff5a2a'))
    front.position.set(s * 1.0, 0.6, -0.3)
    const rear = new THREE.Mesh(rearGeo, kit.bright('#9ff4ff'))
    rear.position.set(s * 1.0, 0.6, 2.005)
    const glow = kit.sprite('#59d8ff', 1.3, { own: true })
    glow.position.set(s * 1.0, 0.6, 2.15)
    const bus = kit.sprite('#ff6a30', 0.85, { own: true })
    bus.position.set(s * 1.0, 0.6, -0.36)
    group.add(inner, above, front, rear, glow, bus)
    engines.push(glow)
    bussards.push(bus)
  }
  const dish = new THREE.Mesh(
    shared(new THREE.CircleGeometry(0.22, 10), kit),
    kit.bright('#ffb35a'),
  )
  dish.position.set(0, -0.26, -0.305)
  dish.rotation.y = Math.PI
  const dishGlow = kit.sprite('#ff9a40', 0.9)
  dishGlow.position.set(0, -0.26, -0.42)
  group.add(dish, dishGlow)

  return {
    group,
    paint: paintMat,
    engines,
    impulse,
    strips,
    bussards,
    guns: [
      new THREE.Vector3(-0.55, 0.28, -2.1),
      new THREE.Vector3(0.55, 0.28, -2.1),
    ],
    nose: new THREE.Vector3(0, 0.32, -2.35),
  }
}

// --- Alien saucers ---

export interface SaucerModel {
  group: THREE.Group
  // The glow under it, which brightens as it charges its weapon
  under: THREE.Sprite
  dome: THREE.Sprite
}

export function makeSaucer(kit: Kit): SaucerModel {
  const group = new THREE.Group()
  const geo = kit.memo('saucer', () => {
    const b = new Builder()
    const p1 = panels('#6c4bb0', '#583c98', 16)
    b.add(
      lathe(
        [
          [0.001, 0.17],
          [0.36, 0.16],
          [0.78, 0.08],
          [1.05, 0.015],
          [1.08, -0.02],
          [0.96, -0.07],
          [0.52, -0.13],
          [0.001, -0.15],
        ],
        16,
      ),
      (c) => (c.y > 0.02 ? p1(c) : c.y > -0.05 ? '#3a2a66' : '#2b2148'),
    )
    return shared(b.build(), kit)
  })
  const body = new THREE.Mesh(geo, kit.lit('#ffffff', { vertexColors: true }))
  group.add(body)
  const domeGeo = kit.memo('saucer-dome', () =>
    shared(
      new THREE.SphereGeometry(0.38, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      kit,
    ),
  )
  const domeMesh = new THREE.Mesh(domeGeo, kit.bright('#7dffc0'))
  domeMesh.position.y = 0.15
  group.add(domeMesh)
  const dome = kit.sprite('#7dffc0', 1.4, { opacity: 0.45 })
  dome.position.y = 0.3
  group.add(dome)
  // A ring of lights round the rim, two sets that blink in turn
  const lightGeo = kit.memo('saucer-light', () =>
    shared(new THREE.BoxGeometry(0.09, 0.07, 0.09), kit),
  )
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const l = new THREE.Mesh(lightGeo, i % 2 ? blinkA(kit) : blinkB(kit))
    l.position.set(Math.cos(a) * 1.03, 0.0, Math.sin(a) * 1.03)
    group.add(l)
  }
  const under = kit.sprite('#5dff9a', 1.6, { own: true, opacity: 0.3 })
  under.position.y = -0.3
  group.add(under)
  group.userData.own = [under.material]
  return { group, under, dome }
}

// Shared blinking lights: their colours change every frame (Space.update)
export const blinkA = (kit: Kit) => kit.bright('#ffe066')
export const blinkB = (kit: Kit) => kit.bright('#ff4fd8')

// --- A friendly ship: a space junk with red battened sails ---

export function makeJunk(kit: Kit): THREE.Group {
  const group = new THREE.Group()
  const b = new Builder()
  // The hull's side, extruded across: a raised stern, a low bow (toward +z)
  const side = new THREE.Shape()
  side.moveTo(-1.5, 0.35)
  side.lineTo(-1.2, -0.3)
  side.lineTo(1.0, -0.32)
  side.lineTo(1.55, 0.2)
  side.lineTo(1.1, 0.15)
  side.lineTo(-1.0, 0.18)
  side.closePath()
  const hullGeo = new THREE.ExtrudeGeometry(side, {
    depth: 0.9,
    bevelEnabled: false,
  })
  hullGeo.translate(0, 0, -0.45)
  b.add(
    hullGeo,
    (c) => (c.y > 0.1 ? '#d9a441' : c.y > -0.12 ? '#8a3a22' : '#5e2616'),
    at(0, 0, 0, 0, -Math.PI / 2, 0),
  )
  // Sails facing forward, each with battens
  const sail = new THREE.Shape()
  sail.moveTo(-0.62, 0)
  sail.lineTo(0.62, 0)
  sail.lineTo(0.9, 1.3)
  sail.quadraticCurveTo(0, 1.75, -0.9, 1.3)
  sail.closePath()
  for (const [z, s] of [
    [-0.75, 0.8],
    [0.05, 1.0],
    [0.8, 0.75],
  ] as const) {
    b.add(
      new THREE.ShapeGeometry(sail, 3),
      '#c8372d',
      at(0, 0.18, z, 0, 0, 0, s),
    )
    for (let k = 1; k <= 4; k++)
      b.add(
        new THREE.BoxGeometry(1.5 + k * 0.12, 0.04, 0.05),
        '#7a1f18',
        at(0, 0.18 + k * 0.3 * s, z + 0.02, 0, 0, 0, s),
      )
    b.add(
      new THREE.BoxGeometry(0.06, 1.8 * s, 0.06),
      '#4a2a1a',
      at(0, 0.18 + 0.85 * s, z - 0.03),
    )
  }
  const mat = kit.lit('#ffffff', { vertexColors: true, side: THREE.DoubleSide })
  group.add(new THREE.Mesh(b.build(), mat))
  // Lanterns at bow and stern
  for (const z of [1.35, -1.35]) {
    const l = kit.sprite('#ffb04a', 1.1)
    l.position.set(0, 0.45, z)
    const box = new THREE.Mesh(
      kit.memo('lantern', () =>
        shared(new THREE.BoxGeometry(0.16, 0.2, 0.16), kit),
      ),
      kit.bright('#ff5a3a'),
    )
    box.position.set(0, 0.45, z)
    group.add(l, box)
  }
  return group
}

// --- Rocks, mines, missiles ---

const ROCK_COLORS = [
  '#7d6e64',
  '#6a6060',
  '#8a6a4e',
  '#5f5b66',
  '#7a7468',
  '#86745a',
]

// A few rock shapes made once; each rock picks one and is turned and
// scaled on its own
export function rockShapes(kit: Kit, n = 6): Array<THREE.BufferGeometry> {
  return Array.from({ length: n }, (_, i) => {
    const r = rng(101 + i * 31)
    const base = new THREE.Color(ROCK_COLORS[i % ROCK_COLORS.length])
    // Smooth lumps from noise, so a rock looks sculpted, not cut
    const geo = new THREE.IcosahedronGeometry(1, 3)
    const pos = geo.getAttribute('position')
    const v = new THREE.Vector3()
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k)
      const f =
        0.78 +
        noise3(v.x * 1.3 + i * 3, v.y * 1.3, v.z * 1.3, 7 + i) * 0.38 +
        noise3(v.x * 3.1, v.y * 3.1, v.z * 3.1 + i, 11) * 0.12
      pos.setXYZ(k, v.x * f, v.y * f, v.z * f)
    }
    const painted = paint(geo, (c) => {
      const crater = noise3(c.x * 2.3, c.y * 2.3, c.z * 2.3, i) > 0.62
      const k = 0.86 + r() * 0.12 - (crater ? 0.2 : 0)
      return base.clone().multiplyScalar(k)
    })
    return shared(painted, kit)
  })
}

export function makeMine(kit: Kit): {
  group: THREE.Group
  light: THREE.Sprite
} {
  const group = new THREE.Group()
  const geo = kit.memo('mine', () => {
    const b = new Builder()
    b.add(
      new THREE.IcosahedronGeometry(0.55, 0),
      panels('#3a3f4a', '#2c3039', 6),
    )
    // A spike at each corner
    const ico = new THREE.IcosahedronGeometry(0.55, 0)
    const pos = ico.getAttribute('position')
    const seen = new Set<string>()
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const key = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`
      if (seen.has(key)) continue
      seen.add(key)
      const dir = v.clone().normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir,
      )
      const m = new THREE.Matrix4().compose(
        dir.clone().multiplyScalar(0.62),
        q,
        new THREE.Vector3(1, 1, 1),
      )
      b.add(new THREE.ConeGeometry(0.08, 0.42, 4), '#9aa0ab', m)
    }
    ico.dispose()
    return shared(b.build(), kit)
  })
  group.add(new THREE.Mesh(geo, kit.lit('#ffffff', { vertexColors: true })))
  const light = kit.sprite('#ff3030', 1.2)
  group.add(light)
  return { group, light }
}

export function makeMissile(kit: Kit): THREE.Group {
  const group = new THREE.Group()
  const geo = kit.memo('missile', () => {
    const b = new Builder()
    b.add(
      new THREE.CylinderGeometry(0.14, 0.14, 1.3, 16),
      '#e8e6e0',
      at(0, 0, 0, Math.PI / 2),
    )
    b.add(
      new THREE.ConeGeometry(0.14, 0.42, 16),
      '#c8372d',
      at(0, 0, 0.86, Math.PI / 2),
    )
    for (let k = 0; k < 4; k++)
      b.add(
        new THREE.BoxGeometry(0.03, 0.36, 0.34),
        '#c8372d',
        at(0, 0, -0.52, 0, 0, (k * Math.PI) / 2).multiply(at(0, 0.2, 0)),
      )
    return shared(b.build(), kit)
  })
  group.add(new THREE.Mesh(geo, kit.lit('#ffffff', { vertexColors: true })))
  const flame = kit.sprite('#ffb040', 1.5)
  flame.position.z = -0.85
  const core = kit.sprite('#fff2c0', 0.6)
  core.position.z = -0.75
  group.add(flame, core)
  return group
}

// --- The comet ---

export function makeComet(kit: Kit): THREE.Group {
  const group = new THREE.Group()
  const r = rng(7)
  const nucleus = paint(
    lumpy(new THREE.IcosahedronGeometry(1.1, 1), 0.25, r),
    () => {
      const pick = ['#d6e8f4', '#a8c6dc', '#eef7ff', '#8fb0c8']
      return pick[Math.floor(r() * pick.length)]
    },
  )
  group.add(new THREE.Mesh(nucleus, kit.lit('#ffffff', { vertexColors: true })))
  const coma = kit.sprite('#9fe6ff', 6.5, { opacity: 0.75 })
  group.add(coma)
  // The tail: open cones along −x, their points at the head, widening and
  // fading away behind; layered, so it is brightest along the middle
  const tailMat = kit.keep(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }),
  )
  const layers: Array<[number, number, [number, number, number]]> = [
    [0.8, 15, [0.38, 0.5, 0.56]],
    [2.0, 22, [0.12, 0.3, 0.46]],
    [3.6, 30, [0.05, 0.12, 0.28]],
  ]
  for (const [radius, length, [cr, cg, cb]] of layers) {
    const tail = new THREE.ConeGeometry(radius, length, 14, 6, true)
    tail.rotateZ(-Math.PI / 2)
    tail.translate(-length / 2 + 0.4, 0, 0)
    const pos = tail.getAttribute('position')
    const col = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const k = Math.pow(clamp(1 + pos.getX(i) / length, 0, 1), 1.8)
      col[i * 3] = cr * k
      col[i * 3 + 1] = cg * k
      col[i * 3 + 2] = cb * k
    }
    tail.setAttribute('color', new THREE.BufferAttribute(col, 3))
    group.add(new THREE.Mesh(tail, tailMat))
  }
  group.userData.own = [tailMat]
  return group
}

// --- The barrier: two pylons and a curtain of energy between them ---

export interface BarrierModel {
  group: THREE.Group
  curtain: THREE.ShaderMaterial
}

export function makeBarrier(
  kit: Kit,
  width: number,
  height: number,
): BarrierModel {
  const group = new THREE.Group()
  const b = new Builder()
  for (const s of [-1, 1]) {
    b.add(
      new THREE.CylinderGeometry(0.5, 0.65, height + 1.4, 6),
      panels('#2f3442', '#252935', 6),
      at((s * width) / 2 + s * 0.4, 0, 0),
    )
    for (const y of [-1, 1])
      b.add(
        new THREE.CylinderGeometry(0.75, 0.75, 0.3, 6),
        '#454c5e',
        at((s * width) / 2 + s * 0.4, (y * (height + 1.4)) / 2, 0),
      )
  }
  group.add(
    new THREE.Mesh(b.build(), kit.lit('#ffffff', { vertexColors: true })),
  )
  for (const s of [-1, 1])
    for (const y of [-1, 1]) {
      const g = kit.sprite('#ff3d6e', 2.2)
      g.position.set((s * width) / 2 + s * 0.4, (y * (height + 2)) / 2, 0)
      group.add(g)
    }
  const curtain = kit.keep(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAlpha: { value: 1 },
        uColor: { value: new THREE.Color('#ff3d6e') },
        uSize: { value: new THREE.Vector2(width, height) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uAlpha;
        uniform vec3 uColor;
        uniform vec2 uSize;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * uSize;
          // A grid of cells, lines brightest at their edges
          vec2 cell = abs(fract(p / 1.1) - 0.5);
          float grid = smoothstep(0.42, 0.5, max(cell.x, cell.y));
          float scan = 0.5 + 0.5 * sin(p.y * 3.0 - uTime * 7.0);
          float edge = smoothstep(0.35, 0.5, abs(vUv.x - 0.5)) + smoothstep(0.38, 0.5, abs(vUv.y - 0.5));
          float a = (0.10 + grid * 0.55 + scan * 0.10 + edge * 0.6) * uAlpha;
          gl_FragColor = vec4(uColor * a, 1.0);
        }`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, height), curtain)
  group.add(sheet)
  group.userData.own = [curtain]
  return { group, curtain }
}

// --- A space station: a turning ring round a hub, with solar panels ---

export interface StationModel {
  group: THREE.Group
  ring: THREE.Object3D
  port: THREE.MeshBasicMaterial
}

export function makeStation(kit: Kit): StationModel {
  const group = new THREE.Group()
  const ringB = new Builder()
  ringB.add(new THREE.TorusGeometry(5.2, 0.6, 12, 44), (c) => {
    const ang = Math.atan2(c.y, c.x) + Math.PI
    const seg = Math.floor((ang / (Math.PI * 2)) * 22)
    const outer = Math.hypot(c.x, c.y) > 5.2
    if (!outer && Math.abs(c.z) < 0.25) return seg % 2 ? '#ffd88a' : '#d8d4cc'
    return seg % 2 ? '#c9c6bf' : '#b4b1aa'
  })
  for (let k = 0; k < 4; k++)
    ringB.add(
      new THREE.BoxGeometry(0.25, 4.2, 0.25),
      '#9a9890',
      at(0, 0, 0, 0, 0, (k * Math.PI) / 2).multiply(at(0, 3.0, 0)),
    )
  const ring = new THREE.Mesh(
    ringB.build(),
    kit.lit('#ffffff', { vertexColors: true }),
  )
  group.add(ring)
  const hubB = new Builder()
  hubB.add(
    new THREE.CylinderGeometry(1.15, 1.15, 2.6, 30),
    panels('#d6d3cc', '#c2bfb8', 10),
    at(0, 0, 0, Math.PI / 2),
  )
  hubB.add(
    new THREE.CylinderGeometry(0.75, 1.15, 0.6, 30),
    '#a9a69f',
    at(0, 0, 1.6, Math.PI / 2),
  )
  // Solar panels on arms, left and right, blue cells in a gold frame
  for (const s of [-1, 1]) {
    hubB.add(
      new THREE.BoxGeometry(3.4, 0.18, 0.18),
      '#8a8880',
      at(s * 7.2, 0, 0),
    )
    const panel = new THREE.PlaneGeometry(4.6, 2.2, 8, 3)
    hubB.add(
      panel,
      (c) => {
        const i = Math.floor((c.x + 2.3) / 0.575)
        const j = Math.floor((c.y + 1.1) / 0.733)
        return (i + j) % 2 ? '#24467e' : '#2f5aa0'
      },
      at(s * 10.8, 0, 0),
    )
    hubB.add(
      new THREE.BoxGeometry(4.8, 0.08, 0.06),
      '#d9a441',
      at(s * 10.8, 1.12, 0),
    )
    hubB.add(
      new THREE.BoxGeometry(4.8, 0.08, 0.06),
      '#d9a441',
      at(s * 10.8, -1.12, 0),
    )
  }
  group.add(
    new THREE.Mesh(
      hubB.build(),
      kit.lit('#ffffff', { vertexColors: true, side: THREE.DoubleSide }),
    ),
  )
  const port = kit.keep(new THREE.MeshBasicMaterial({ color: '#ff5a3a' }))
  const portRing = new THREE.Mesh(
    kit.memo('port', () =>
      shared(new THREE.TorusGeometry(0.72, 0.09, 8, 32), kit),
    ),
    port,
  )
  portRing.position.z = 1.92
  group.add(portRing)
  for (const [x, y, c] of [
    [5.2, 0, '#ff4040'],
    [-5.2, 0, '#40ff70'],
    [0, 5.2, '#ffffff'],
    [0, -5.2, '#ffffff'],
  ] as const) {
    const s = kit.sprite(c, 1.6)
    s.position.set(x, y, 0.7)
    ring.add(s)
  }
  group.userData.own = [port]
  return { group, ring, port }
}

// --- Planets, for the backdrop: one colour per face, lit by the sun, of
// radius 1 (the scene sizes them) ---

export interface PlanetModel {
  group: THREE.Group
  // Turns slowly on its own axis
  body: THREE.Object3D
  // Moons, each turning round the planet
  moons: Array<{ pivot: THREE.Object3D; speed: number }>
}

// Where the planets are lit from (games/bridge/space.ts lights them so)
export const PLANET_LIGHT = new THREE.Vector3(-0.7, 0.55, 0.45).normalize()

// A glow round the edge of a planet; a higher power keeps it to the rim
function atmosphere(
  kit: Kit,
  color: string,
  strength: number,
  power = 2.6,
): THREE.ShaderMaterial {
  return kit.keep(
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uStrength: { value: strength },
        uPower: { value: power },
        uLight: { value: PLANET_LIGHT },
      },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vV;
        varying vec3 vW;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vW = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uStrength;
        uniform float uPower;
        uniform vec3 uLight;
        varying vec3 vN;
        varying vec3 vV;
        varying vec3 vW;
        void main() {
          float rim = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), uPower);
          float lit = 0.15 + 0.85 * smoothstep(-0.3, 0.6, dot(normalize(vW), uLight));
          gl_FragColor = vec4(uColor * rim * lit * uStrength, 1.0);
        }`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
}

// A smooth ball of radius 1, coloured vertex by vertex so that its colours
// blend like paint: `segments` round the equator; `alpha` makes it partly
// clear (clouds)
function colourBall(
  segments: number,
  pick: (c: THREE.Vector3) => THREE.Color | string,
  alpha?: (c: THREE.Vector3) => number,
): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, segments, Math.round(segments / 2))
  g.deleteAttribute('uv')
  const pos = g.getAttribute('position')
  const n = alpha ? 4 : 3
  const out = new Float32Array(pos.count * n)
  const v = new THREE.Vector3()
  const col = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    col.set(pick(v))
    out[i * n] = col.r
    out[i * n + 1] = col.g
    out[i * n + 2] = col.b
    if (alpha) out[i * n + 3] = alpha(v)
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, n))
  return g
}

function smallMoon(kit: Kit, radius: number, color: string, seed: number) {
  const r = rng(seed)
  const base = new THREE.Color(color)
  const geo = paint(
    lumpy(new THREE.IcosahedronGeometry(radius, 2), 0.14, r),
    () => base.clone().multiplyScalar(0.8 + r() * 0.35),
  )
  return new THREE.Mesh(geo, kit.lit('#ffffff', { vertexColors: true }))
}

// `haze` thins the atmosphere, for the Earth seen from close in orbit
export function makePlanet(
  kit: Kit,
  id: PlanetId,
  detail: number,
  haze = 1,
): PlanetModel {
  const group = new THREE.Group()
  const body = new THREE.Group()
  group.add(body)
  const moons: PlanetModel['moons'] = []
  // Segments round the equator, from the detail asked for
  const seg = detail * 6
  const lit = kit.lit('#ffffff', { vertexColors: true, shine: 0 })
  const addMoon = (
    mesh: THREE.Mesh,
    dist: number,
    tilt: number,
    speed: number,
    phase: number,
  ) => {
    const pivot = new THREE.Object3D()
    pivot.rotation.set(tilt, phase, 0)
    mesh.position.set(dist, 0, 0)
    pivot.add(mesh)
    group.add(pivot)
    moons.push({ pivot, speed })
  }

  if (id === 'earth') {
    const deep = new THREE.Color('#1b4f9e')
    const shallow = new THREE.Color('#2f7fcf')
    const land = colors('#4c9a3c', '#6f9a44', '#8a8a52', '#7a6a50')
    const sand = new THREE.Color('#cdb172')
    const ice = new THREE.Color('#f2f6fb')
    const out = new THREE.Color()
    body.add(
      new THREE.Mesh(
        colourBall(seg, (c) => {
          const n = fbm(c.x * 1.7 + 4, c.y * 1.7, c.z * 1.7, 5, 11)
          const lat = Math.abs(c.y)
          if (lat > 0.84 + (n - 0.5) * 0.2) return ice
          if (n > 0.52) {
            const dry = fbm(c.x * 3 + 9, c.y * 3, c.z * 3, 3, 5)
            if (lat < 0.42 && dry > 0.56) return sand
            return ramp(land, clamp((n - 0.52) * 4, 0, 1), out)
          }
          return n > 0.46 ? shallow : deep
        }),
        lit,
      ),
    )
    const clouds = colourBall(
      seg,
      () => '#ffffff',
      (c) =>
        clamp(
          (fbm(c.x * 2.6, c.y * 2.6 + 3, c.z * 2.6, 4, 23) - 0.55) * 7,
          0,
          0.9,
        ),
    )
    const cloudMat = kit.keep(
      new THREE.MeshLambertMaterial({
        color: '#ffffff',
        vertexColors: true,
        transparent: true,
        depthWrite: false,
      }),
    )
    const cloudMesh = new THREE.Mesh(clouds, cloudMat)
    cloudMesh.scale.setScalar(1.012)
    body.add(cloudMesh)
    group.add(
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.035, 12),
        atmosphere(kit, '#6ab8ff', 1.5 * haze, haze < 1 ? 5 : 2.6),
      ),
    )
    group.userData.own = [cloudMat]
  } else if (id === 'moon') {
    const r = rng(5)
    const craters = Array.from({ length: 22 }, () => ({
      c: new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize(),
      size: 0.06 + r() * 0.16,
    }))
    const greys = colors('#7c7a76', '#9b9893', '#b4b1ab', '#c9c6c0')
    const out = new THREE.Color()
    body.add(
      new THREE.Mesh(
        colourBall(seg, (c) => {
          const n = fbm(c.x * 2, c.y * 2, c.z * 2, 4, 3)
          let t = n > 0.56 ? 0.1 : 0.45 + (n - 0.5) * 1.5
          for (const k of craters) {
            const d = c.angleTo(k.c)
            if (d < k.size * 0.75) t = Math.min(t, 0.15)
            else if (d < k.size) t = Math.max(t, 0.95)
          }
          return ramp(greys, t, out)
        }),
        lit,
      ),
    )
    group.add(
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.04, 10),
        atmosphere(kit, '#ffffff', 0.35),
      ),
    )
  } else if (id === 'mars') {
    const rust = colors('#6e2e1a', '#a4432a', '#c65a30', '#dc8452')
    const out = new THREE.Color()
    const canyon = new THREE.Vector3(0.2, -0.15, 1).normalize()
    body.add(
      new THREE.Mesh(
        colourBall(seg, (c) => {
          const n = fbm(c.x * 1.9 + 2, c.y * 1.9, c.z * 1.9, 5, 7)
          if (Math.abs(c.y) > 0.88 + (n - 0.5) * 0.15) return '#f4eee8'
          // A great canyon along the equator on one side
          if (Math.abs(c.y + 0.12) < 0.035 + n * 0.02 && c.dot(canyon) > 0.3)
            return '#4e2214'
          return ramp(rust, clamp(n * 1.6 - 0.25, 0, 1), out)
        }),
        lit,
      ),
    )
    group.add(
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.05, 10),
        atmosphere(kit, '#ff9a6a', 0.7),
      ),
    )
    addMoon(smallMoon(kit, 0.07, '#8a7a6a', 41), 1.7, 0.2, 0.25, 0.4)
    addMoon(smallMoon(kit, 0.05, '#9a8c7c', 42), 2.4, -0.15, 0.15, 2.2)
  } else if (id === 'jupiter') {
    const bands = colors(
      '#f0e2c8',
      '#c99a66',
      '#e9d4ae',
      '#a8683f',
      '#dfc49a',
      '#b97b4c',
      '#f2e8d6',
    )
    const out = new THREE.Color()
    body.add(
      new THREE.Mesh(
        colourBall(seg, (c) => {
          const warp = fbm(c.x * 3, c.y * 3, c.z * 3, 3, 13) - 0.5
          const lat = c.y + warp * 0.12
          // The great red spot, an oval south of the equator
          let lon = Math.atan2(c.z, c.x) - 0.6
          if (lon > Math.PI) lon -= Math.PI * 2
          if (lon < -Math.PI) lon += Math.PI * 2
          const oval = Math.hypot(lon / 0.26, (c.y + 0.36) / 0.085)
          if (oval < 1) return oval < 0.65 ? '#c0462e' : '#e0906a'
          const t =
            (Math.sin(lat * 13) * 0.5 + 0.5) * 0.85 + Math.abs(lat) * 0.15
          return ramp(bands, t, out)
        }),
        lit,
      ),
    )
    group.add(
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.03, 10),
        atmosphere(kit, '#ffd9a0', 0.6),
      ),
    )
    addMoon(smallMoon(kit, 0.05, '#e6c75a', 51), 1.6, 0.05, 0.3, 1.0)
    addMoon(smallMoon(kit, 0.045, '#d8cbb0', 52), 2.0, -0.08, 0.22, 3.0)
    addMoon(smallMoon(kit, 0.06, '#9a948a', 53), 2.6, 0.1, 0.14, 5.0)
  } else {
    // Saturn, pale bands and its rings
    const bands = colors('#f2e3b4', '#dcc188', '#efdcae', '#c9a96e', '#e8d39e')
    const out = new THREE.Color()
    body.add(
      new THREE.Mesh(
        colourBall(seg, (c) => {
          const warp = fbm(c.x * 3, c.y * 3, c.z * 3, 3, 17) - 0.5
          const t = Math.sin((c.y + warp * 0.06) * 11) * 0.5 + 0.5
          return ramp(bands, t * 0.9 + Math.abs(c.y) * 0.1, out)
        }),
        lit,
      ),
    )
    // The rings, band by band, each its own shade
    const ringGroup = new THREE.Group()
    const ringBands: Array<[number, number, string, number]> = [
      [1.28, 1.52, '#8a7a5a', 0.55],
      [1.52, 1.92, '#e6d3a4', 0.95],
      [1.92, 2.0, '#3a3428', 0.2],
      [2.0, 2.22, '#cdb98c', 0.85],
      [2.25, 2.3, '#a8987a', 0.5],
    ]
    const own: Array<THREE.Material> = []
    for (const [a, b, c, o] of ringBands) {
      const m = kit.keep(
        new THREE.MeshLambertMaterial({
          color: c,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: o,
          depthWrite: false,
        }),
      )
      own.push(m)
      ringGroup.add(new THREE.Mesh(new THREE.RingGeometry(a, b, 72, 1), m))
    }
    ringGroup.rotation.x = -Math.PI / 2
    group.add(ringGroup)
    // Tipped, so the rings show
    group.rotation.set(0.42, 0, 0.3)
    group.add(
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.04, 10),
        atmosphere(kit, '#ffe6a0', 0.5),
      ),
    )
    addMoon(smallMoon(kit, 0.07, '#d9a45a', 61), 3.1, 0.3, 0.1, 0.8)
    group.userData.own = own
  }
  return { group, body, moons }
}

// --- The sky: a painted starfield on the inside of a far ball ---

// The paintings (public/art/space/), 2:1 and wrapping round seamlessly: a
// band of nebula like a galaxy, and nebulae apart in dark space
export const SKIES = ['/art/space/sky-1.webp', '/art/space/sky-2.webp']

export function makeSky(kit: Kit): {
  mesh: THREE.Mesh
  show: (n: number) => void
} {
  const mat = kit.keep(
    new THREE.MeshBasicMaterial({
      color: '#000000',
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  )
  const mesh = new THREE.Mesh(
    shared(new THREE.SphereGeometry(1, 64, 32), kit),
    mat,
  )
  mesh.scale.setScalar(4000)
  // The band across the sky at a slant
  mesh.rotation.set(0.12, 0, 0.32)
  mesh.renderOrder = -10
  const loader = new THREE.TextureLoader()
  const maps: Array<THREE.Texture | null> = SKIES.map(() => null)
  const loading = SKIES.map(() => false)
  let want = 0
  // Shows painting n, loading it first if need be (black until then)
  const show = (n: number) => {
    want = n % SKIES.length
    const map = maps[want]
    if (map) {
      mat.map = map
      mat.color.set('#ffffff')
      mat.needsUpdate = true
      return
    }
    if (loading[want]) return
    loading[want] = true
    const i = want
    loader.load(SKIES[i], (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      maps[i] = kit.keep(t)
      if (want === i) show(i)
    })
  }
  return { mesh, show }
}

// Stars on a far ball, more of them along the band of the galaxy
export function makeStars(kit: Kit, count: number, seed: number): THREE.Points {
  const r = rng(seed)
  const band = new THREE.Vector3(0.25, 1, 0.35).normalize()
  const pos: Array<number> = []
  const col: Array<number> = []
  const c = new THREE.Color()
  const tints = ['#ffffff', '#cfe0ff', '#fff1d6', '#ffd6c8', '#d6f4ff']
  const v = new THREE.Vector3()
  while (pos.length < count * 3) {
    v.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1)
    if (v.lengthSq() > 1 || v.lengthSq() < 0.01) continue
    v.normalize()
    const across = Math.abs(v.dot(band))
    if (r() > 0.35 + Math.exp(-(across * across) / 0.03) * 0.65) continue
    pos.push(v.x * 3600, v.y * 3600, v.z * 3600)
    c.set(tints[Math.floor(r() * tints.length)]).multiplyScalar(
      0.55 + r() * 0.45,
    )
    col.push(c.r, c.g, c.b)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  const m = kit.keep(
    new THREE.PointsMaterial({
      size: seed % 3 === 0 ? 3.2 : 1.8,
      sizeAttenuation: false,
      vertexColors: true,
      map: kit.soft,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  )
  const p = new THREE.Points(g, m)
  p.renderOrder = -9
  return p
}
