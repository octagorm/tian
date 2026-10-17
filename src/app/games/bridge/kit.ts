import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// The small things every part of the starship's scene shares: seeded
// randomness and noise, flat-shaded geometry with a colour per face, glow
// textures, and a kit that makes materials once and disposes of everything
// it made when the game is left.

// --- Randomness and noise ---

// A seeded random number generator (mulberry32), so a model or a sky
// comes out the same every time
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash3(x: number, y: number, z: number, seed: number) {
  let h =
    Math.imul(x, 374761393) ^
    Math.imul(y, 668265263) ^
    Math.imul(z, 1274126177) ^
    Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const smooth = (t: number) => t * t * (3 - 2 * t)

// Value noise in three dimensions, 0–1
export function noise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const w = smooth(z - zi)
  const c = (dx: number, dy: number, dz: number) =>
    hash3(xi + dx, yi + dy, zi + dz, seed)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}

// Noise at several scales, summed: clouds, continents, bands. About 0–1
export function fbm(
  x: number,
  y: number,
  z: number,
  octaves = 4,
  seed = 0,
): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * freq, y * freq, z * freq, seed + i * 17)
    norm += amp
    amp *= 0.5
    freq *= 2.03
  }
  return sum / norm
}

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))
export const mix = (a: number, b: number, t: number) => a + (b - a) * t
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
export const easeIn = (t: number) => Math.pow(clamp(t, 0, 1), 2)
export const easeInOut = (t: number) => {
  const x = clamp(t, 0, 1)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

// A colour along a list of stops, t from 0 to 1
export function ramp(
  stops: Array<THREE.Color>,
  t: number,
  out = new THREE.Color(),
): THREE.Color {
  const x = clamp(t, 0, 0.9999) * (stops.length - 1)
  const i = Math.floor(x)
  return out.copy(stops[i]).lerp(stops[i + 1], x - i)
}

export const colors = (...hex: Array<string>) =>
  hex.map((h) => new THREE.Color(h))

// --- Geometry ---

// Gives each face of a geometry without an index one colour, chosen from
// its centre (and its index), as vertex colours. Flat shading does the rest.
export function paint(
  geo: THREE.BufferGeometry,
  pick: (centre: THREE.Vector3, face: number) => THREE.Color | string,
): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo
  const pos = g.getAttribute('position')
  const out = new Float32Array(pos.count * 3)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const col = new THREE.Color()
  for (let i = 0; i + 2 < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i)
    b.fromBufferAttribute(pos, i + 1)
    c.fromBufferAttribute(pos, i + 2)
    a.add(b).add(c).divideScalar(3)
    col.set(pick(a, i / 3))
    for (let k = 0; k < 3; k++) {
      out[(i + k) * 3] = col.r
      out[(i + k) * 3 + 1] = col.g
      out[(i + k) * 3 + 2] = col.b
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3))
  return g
}

// Moves each corner of a mesh in or out from its centre by up to `amount`,
// the same for every face that shares it: a rock from a ball
export function lumpy(
  geo: THREE.BufferGeometry,
  amount: number,
  random: () => number,
): THREE.BufferGeometry {
  const pos = geo.getAttribute('position')
  const moved = new Map<string, number>()
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`
    let f = moved.get(key)
    if (f === undefined) {
      f = 1 + (random() * 2 - 1) * amount
      moved.set(key, f)
    }
    v.multiplyScalar(f)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

// The lines of a geodesic sphere's dual: hexagons (and twelve pentagons)
// on a ball of radius 1, as line segments – the shield's honeycomb
export function honeycomb(detail: number): THREE.BufferGeometry {
  const ico = new THREE.IcosahedronGeometry(1, detail)
  ico.deleteAttribute('normal')
  ico.deleteAttribute('uv')
  const geo = mergeVertices(ico, 1e-4)
  ico.dispose()
  const index = geo.index
  const pos = geo.getAttribute('position')
  if (!index) return new THREE.BufferGeometry()
  const centres: Array<THREE.Vector3> = []
  const edges = new Map<string, Array<number>>()
  for (let f = 0; f < index.count / 3; f++) {
    const ids = [
      index.getX(f * 3),
      index.getX(f * 3 + 1),
      index.getX(f * 3 + 2),
    ]
    const c = new THREE.Vector3()
    for (const id of ids)
      c.add(new THREE.Vector3().fromBufferAttribute(pos, id))
    centres.push(c.normalize())
    for (let k = 0; k < 3; k++) {
      const a = ids[k]
      const b = ids[(k + 1) % 3]
      const key = a < b ? `${a},${b}` : `${b},${a}`
      const list = edges.get(key)
      if (list) list.push(f)
      else edges.set(key, [f])
    }
  }
  geo.dispose()
  const out: Array<number> = []
  for (const faces of edges.values()) {
    if (faces.length !== 2) continue
    const [p, q] = faces.map((f) => centres[f])
    out.push(p.x, p.y, p.z, q.x, q.y, q.z)
  }
  const lines = new THREE.BufferGeometry()
  const arr = new Float32Array(out)
  lines.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  // On a unit ball the normal is the position
  lines.setAttribute('normal', new THREE.BufferAttribute(arr.slice(), 3))
  return lines
}

// --- Textures ---

// A soft round glow, white, for sprites tinted by their material
function glowCanvas(size: number, stops: Array<[number, number]>) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  if (g) {
    const r = size / 2
    const grd = g.createRadialGradient(r, r, 0, r, r, r)
    for (const [at, alpha] of stops)
      grd.addColorStop(at, `rgba(255,255,255,${alpha})`)
    g.fillStyle = grd
    g.fillRect(0, 0, size, size)
  }
  return c
}

// A star with four spikes, for the brightest stars and lens glints
function sparkleCanvas(size: number) {
  const c = glowCanvas(size, [
    [0, 1],
    [0.08, 0.8],
    [0.25, 0.12],
    [1, 0],
  ])
  const g = c.getContext('2d')
  if (g) {
    const r = size / 2
    g.globalCompositeOperation = 'lighter'
    for (const [w, h] of [
      [size, size * 0.035],
      [size * 0.035, size],
    ]) {
      const grd =
        w > h
          ? g.createLinearGradient(0, 0, size, 0)
          : g.createLinearGradient(0, 0, 0, size)
      grd.addColorStop(0, 'rgba(255,255,255,0)')
      grd.addColorStop(0.5, 'rgba(255,255,255,0.9)')
      grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd
      g.fillRect(r - w / 2, r - h / 2, w, h)
    }
  }
  return c
}

// Four corners of a square, to bracket a target
function bracketCanvas(size: number) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  if (g) {
    const m = size * 0.08
    const l = size * 0.26
    g.strokeStyle = '#ffffff'
    g.lineWidth = size * 0.06
    g.lineCap = 'round'
    for (const [x, y, dx, dy] of [
      [m, m, 1, 1],
      [size - m, m, -1, 1],
      [m, size - m, 1, -1],
      [size - m, size - m, -1, -1],
    ]) {
      g.beginPath()
      g.moveTo(x, y + dy * l)
      g.lineTo(x, y)
      g.lineTo(x + dx * l, y)
      g.stroke()
    }
  }
  return c
}

// --- The kit ---

type Disposable = { dispose: () => void }

// Makes shared materials and textures once, and keeps everything it was
// given to dispose of with the scene
export class Kit {
  private bin = new Set<Disposable>()
  private mats = new Map<string, THREE.Material>()
  readonly glow: THREE.Texture
  readonly soft: THREE.Texture
  readonly sparkle: THREE.Texture
  readonly bracket: THREE.Texture

  constructor() {
    this.glow = this.keep(
      this.texture(
        glowCanvas(128, [
          [0, 1],
          [0.18, 0.7],
          [0.45, 0.2],
          [1, 0],
        ]),
      ),
    )
    this.soft = this.keep(
      this.texture(
        glowCanvas(64, [
          [0, 0.55],
          [0.5, 0.18],
          [1, 0],
        ]),
      ),
    )
    this.sparkle = this.keep(this.texture(sparkleCanvas(128)))
    this.bracket = this.keep(this.texture(bracketCanvas(128)))
  }

  // A bracket that keeps its size on screen and shows through everything
  bracketMaterial(): THREE.SpriteMaterial {
    return this.keep(
      new THREE.SpriteMaterial({
        map: this.bracket,
        color: '#f2a24c',
        transparent: true,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: false,
        fog: false,
      }),
    )
  }

  private texture(c: HTMLCanvasElement) {
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  keep<T extends Disposable>(thing: T): T {
    this.bin.add(thing)
    return thing
  }

  // Makes something once per kit: a model's geometry, rock shapes
  private memos = new Map<string, unknown>()
  memo<T>(key: string, make: () => T): T {
    if (this.memos.has(key)) return this.memos.get(key) as T
    const v = make()
    this.memos.set(key, v)
    return v
  }

  drop(thing: Disposable) {
    if (this.bin.delete(thing)) thing.dispose()
  }

  // A flat-shaded surface lit by the scene; `vertexColors` takes the colour
  // per face from paint()
  lit(
    color: string,
    opts: { emissive?: string; vertexColors?: boolean; side?: THREE.Side } = {},
  ): THREE.MeshLambertMaterial {
    const key = `lit|${color}|${opts.emissive ?? ''}|${opts.vertexColors ?? false}|${opts.side ?? 0}`
    const hit = this.mats.get(key)
    if (hit) return hit as THREE.MeshLambertMaterial
    const m = new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      vertexColors: opts.vertexColors ?? false,
      emissive: opts.emissive ?? '#000000',
      side: opts.side ?? THREE.FrontSide,
    })
    this.mats.set(key, m)
    return this.keep(m)
  }

  // Unlit colour: lights, windows, glowing parts
  bright(color: string, additive = false): THREE.MeshBasicMaterial {
    const key = `bright|${color}|${additive}`
    const hit = this.mats.get(key)
    if (hit) return hit as THREE.MeshBasicMaterial
    const m = new THREE.MeshBasicMaterial({
      color,
      ...(additive
        ? {
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
          }
        : {}),
    })
    this.mats.set(key, m)
    return this.keep(m)
  }

  // A glow sprite. Shared material unless it is to fade on its own.
  sprite(
    color: string,
    size: number,
    opts: { own?: boolean; opacity?: number; map?: THREE.Texture } = {},
  ): THREE.Sprite {
    const map = opts.map ?? this.glow
    const make = () =>
      new THREE.SpriteMaterial({
        map,
        color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: opts.opacity ?? 1,
        fog: false,
      })
    let mat: THREE.SpriteMaterial
    if (opts.own) mat = this.keep(make())
    else {
      const key = `sprite|${color}|${opts.opacity ?? 1}|${map.uuid}`
      const hit = this.mats.get(key) as THREE.SpriteMaterial | undefined
      mat = hit ?? this.keep(make())
      if (!hit) this.mats.set(key, mat)
    }
    const s = new THREE.Sprite(mat)
    s.scale.setScalar(size)
    return s
  }

  dispose() {
    for (const thing of this.bin) thing.dispose()
    this.bin.clear()
    this.mats.clear()
    this.memos.clear()
  }
}

// Disposes of the geometry of everything under an object (materials are
// the kit's), and of materials the object owns itself (userData.own)
export function disposeTree(root: THREE.Object3D, kit: Kit) {
  root.traverse((o) => {
    if (
      o instanceof THREE.Mesh ||
      o instanceof THREE.LineSegments ||
      o instanceof THREE.Points
    ) {
      const geo = o.geometry as THREE.BufferGeometry
      if (!geo.userData.shared) geo.dispose()
    }
    const own = o.userData.own as Array<Disposable> | undefined
    if (own) for (const d of own) kit.drop(d)
  })
}

// Marks a geometry as shared, so disposeTree leaves it to the kit
export function shared<T extends THREE.BufferGeometry>(geo: T, kit: Kit): T {
  geo.userData.shared = true
  return kit.keep(geo)
}
