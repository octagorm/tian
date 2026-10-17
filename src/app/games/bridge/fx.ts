import * as THREE from 'three'
import { clamp, easeOut, honeycomb, shared } from './kit'
import type { Kit } from './kit'

// Effects that come and go: flashes, explosions with low-poly debris,
// sparks, laser bolts and beams, smoke. Each lives a moment, drifts back
// with the flow of space past the ship (unless it rides on the ship) and
// disposes of what it made.

interface Effect {
  // Advances it; false when it is over
  update: (dt: number, flow: number) => boolean
  dispose: () => void
}

const UP = new THREE.Vector3(0, 1, 0)

export class Fx {
  readonly group = new THREE.Group()
  private list: Array<Effect> = []
  private shards: Array<THREE.BufferGeometry>
  private ring: THREE.BufferGeometry
  private rod: THREE.BufferGeometry

  constructor(
    private kit: Kit,
    private camera: THREE.Camera,
    private reduced: boolean,
  ) {
    this.shards = [
      new THREE.TetrahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(0.8, 0),
      new THREE.IcosahedronGeometry(0.7, 0),
    ].map((g) => shared(g, kit))
    this.ring = shared(new THREE.RingGeometry(0.82, 1, 40, 1), kit)
    // A rod one unit long along +y, from 0 to 1
    const rod = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true)
    rod.translate(0, 0.5, 0)
    this.rod = shared(rod, kit)
  }

  update(dt: number, flow: number) {
    // Effects may start others as they run (a bolt's hit, an explosion):
    // those go to a fresh list and join after
    const running = this.list
    this.list = []
    const keep: Array<Effect> = []
    for (const e of running) {
      if (e.update(dt, flow)) keep.push(e)
      else e.dispose()
    }
    this.list = keep.concat(this.list)
  }

  private add(e: Effect) {
    this.list.push(e)
  }

  private own(color: string, opacity = 1, map?: THREE.Texture) {
    return this.kit.keep(
      new THREE.SpriteMaterial({
        map: map ?? this.kit.glow,
        color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity,
        fog: false,
      }),
    )
  }

  // A glow that swells and fades
  flash(
    at: THREE.Vector3,
    color: string,
    size: number,
    life = 0.35,
    opts: { parent?: THREE.Object3D; grow?: number; opacity?: number } = {},
  ) {
    const mat = this.own(color, (opts.opacity ?? 1) * (this.reduced ? 0.55 : 1))
    const s = new THREE.Sprite(mat)
    s.position.copy(at)
    const parent = opts.parent ?? this.group
    parent.add(s)
    const grow = opts.grow ?? 1.6
    const peak = mat.opacity
    let t = 0
    this.add({
      update: (dt, flow) => {
        t += dt
        const k = t / life
        if (!opts.parent) s.position.z += flow * dt
        s.scale.setScalar(size * (0.35 + easeOut(k * 2.5) * grow))
        mat.opacity = peak * (1 - clamp(k, 0, 1)) ** 1.5
        return t < life
      },
      dispose: () => {
        s.removeFromParent()
        this.kit.drop(mat)
      },
    })
  }

  // A ring of light spreading out, facing the camera
  shockwave(at: THREE.Vector3, color: string, size: number, life = 0.6) {
    const mat = this.kit.keep(
      new THREE.MeshBasicMaterial({
        color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        opacity: this.reduced ? 0.35 : 0.7,
      }),
    )
    const m = new THREE.Mesh(this.ring, mat)
    m.position.copy(at)
    m.quaternion.copy(this.camera.quaternion)
    this.group.add(m)
    const peak = mat.opacity
    let t = 0
    this.add({
      update: (dt, flow) => {
        t += dt
        const k = t / life
        m.position.z += flow * dt
        m.scale.setScalar(size * (0.4 + easeOut(k) * 4.2))
        mat.opacity = peak * (1 - k)
        return t < life
      },
      dispose: () => {
        m.removeFromParent()
        this.kit.drop(mat)
      },
    })
  }

  // Low-poly shards flying apart, turning, shrinking away
  debris(
    at: THREE.Vector3,
    palette: Array<string>,
    n: number,
    size: number,
    speed = 7,
    drift = new THREE.Vector3(),
  ) {
    const bits = Array.from({ length: n }, (_, i) => {
      const geo = this.shards[i % this.shards.length]
      const m = new THREE.Mesh(geo, this.kit.lit(palette[i % palette.length]))
      m.position.copy(at)
      const s = size * (0.12 + Math.random() * 0.22)
      m.scale.setScalar(s)
      m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
      this.group.add(m)
      const v = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      )
        .normalize()
        .multiplyScalar(speed * (0.4 + Math.random() * 0.8) * Math.sqrt(size))
        .add(drift)
      const spin = new THREE.Vector3(
        Math.random() * 8 - 4,
        Math.random() * 8 - 4,
        Math.random() * 8 - 4,
      )
      return { m, v, spin, s, life: 1.1 + Math.random() * 0.9 }
    })
    let t = 0
    this.add({
      update: (dt, flow) => {
        t += dt
        for (const b of bits) {
          b.m.position.addScaledVector(b.v, dt)
          b.m.position.z += flow * dt
          b.v.multiplyScalar(1 - dt * 0.6)
          b.m.rotation.x += b.spin.x * dt
          b.m.rotation.y += b.spin.y * dt
          b.m.rotation.z += b.spin.z * dt
          const k = clamp(t / b.life, 0, 1)
          b.m.scale.setScalar(b.s * (1 - k * k))
          b.m.visible = k < 1
        }
        return t < 2.1
      },
      dispose: () => {
        for (const b of bits) b.m.removeFromParent()
      },
    })
  }

  // Bright points thrown out, falling off
  sparks(
    at: THREE.Vector3,
    color: string,
    n: number,
    speed: number,
    life = 0.6,
    parent?: THREE.Object3D,
  ) {
    const pos = new Float32Array(n * 3)
    const vel = Array.from({ length: n }, () =>
      new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      )
        .normalize()
        .multiplyScalar(speed * (0.3 + Math.random())),
    )
    for (let i = 0; i < n; i++) {
      pos[i * 3] = at.x
      pos[i * 3 + 1] = at.y
      pos[i * 3 + 2] = at.z
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = this.kit.keep(
      new THREE.PointsMaterial({
        color,
        size: 0.22,
        map: this.kit.glow,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    )
    const pts = new THREE.Points(geo, mat)
    ;(parent ?? this.group).add(pts)
    let t = 0
    this.add({
      update: (dt, flow) => {
        t += dt
        const attr = geo.getAttribute('position') as THREE.BufferAttribute
        for (let i = 0; i < n; i++) {
          const v = vel[i]
          attr.setXYZ(
            i,
            attr.getX(i) + v.x * dt,
            attr.getY(i) + v.y * dt,
            attr.getZ(i) + (v.z + (parent ? 0 : flow)) * dt,
          )
          v.multiplyScalar(1 - dt * 1.5)
        }
        attr.needsUpdate = true
        mat.opacity = 1 - clamp(t / life, 0, 1)
        return t < life
      },
      dispose: () => {
        pts.removeFromParent()
        geo.dispose()
        this.kit.drop(mat)
      },
    })
  }

  // A soft puff of smoke or steam that swells and fades
  puff(
    at: THREE.Vector3,
    color: string,
    size: number,
    life = 0.9,
    additive = false,
  ) {
    const mat = this.kit.keep(
      new THREE.SpriteMaterial({
        map: this.kit.soft,
        color,
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        opacity: 0.8,
      }),
    )
    const s = new THREE.Sprite(mat)
    s.position.copy(at)
    this.group.add(s)
    let t = 0
    this.add({
      update: (dt, flow) => {
        t += dt
        const k = t / life
        s.position.z += flow * dt * 0.9
        s.position.y += dt * 0.4
        s.scale.setScalar(size * (0.5 + k * 1.8))
        mat.opacity = 0.8 * (1 - k)
        return t < life
      },
      dispose: () => {
        s.removeFromParent()
        this.kit.drop(mat)
      },
    })
  }

  // An explosion: a flash, a fireball, a ring, debris and sparks
  explode(
    at: THREE.Vector3,
    opts: {
      size?: number
      debris?: Array<string>
      fire?: Array<string>
      n?: number
      drift?: THREE.Vector3
    } = {},
  ) {
    const size = opts.size ?? 1
    const fire = opts.fire ?? ['#fff2c4', '#ffb347', '#ff5a2a']
    this.flash(at, fire[0], size * 5, 0.32, { grow: 1.2 })
    for (let i = 0; i < 3; i++) {
      const p = at
        .clone()
        .add(
          new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5,
          ).multiplyScalar(size * 0.9),
        )
      this.flash(
        p,
        fire[1 + (i % 2)],
        size * (2.6 + i * 0.8),
        0.55 + i * 0.12,
        { grow: 1.4, opacity: 0.85 },
      )
    }
    this.shockwave(at, fire[1], size, 0.6)
    if (opts.debris)
      this.debris(at, opts.debris, opts.n ?? 12, size, 7, opts.drift)
    this.sparks(at, fire[1], 26, 9 * Math.sqrt(size), 0.7)
  }

  // A bolt of light from one point to a target that may move; calls
  // `onHit` where it arrives
  bolt(
    from: THREE.Vector3,
    to: () => THREE.Vector3,
    color: string,
    onHit: (at: THREE.Vector3) => void,
    speed = 170,
  ) {
    const mat = this.kit.keep(
      new THREE.MeshBasicMaterial({
        color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    )
    const rod = new THREE.Mesh(this.rod, mat)
    const glowMat = this.own(color)
    const head = new THREE.Sprite(glowMat)
    head.scale.setScalar(1.1)
    this.group.add(rod, head)
    const p = from.clone()
    const dir = new THREE.Vector3()
    let t = 0
    let done = false
    this.flash(from, '#ffd2a0', 0.9, 0.12)
    this.add({
      update: (dt) => {
        if (done) return false
        t += dt
        const target = to()
        dir.subVectors(target, p)
        const dist = dir.length()
        const step = speed * dt
        if (dist <= step || t > 2) {
          done = true
          onHit(target.clone())
          return false
        }
        dir.divideScalar(dist)
        p.addScaledVector(dir, step)
        head.position.copy(p)
        rod.position.copy(p)
        rod.quaternion.setFromUnitVectors(UP, dir.clone().negate())
        rod.scale.set(0.06, Math.min(3, t * speed), 0.06)
        return true
      },
      dispose: () => {
        rod.removeFromParent()
        head.removeFromParent()
        this.kit.drop(mat)
        this.kit.drop(glowMat)
      },
    })
  }

  // A beam between two points that may move, flickering for a while
  beam(
    from: () => THREE.Vector3,
    to: () => THREE.Vector3,
    color: string,
    life: number,
    width = 0.12,
  ) {
    const mat = this.kit.keep(
      new THREE.MeshBasicMaterial({
        color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    )
    const core = new THREE.Mesh(this.rod, mat)
    const a = new THREE.Sprite(this.own(color))
    const b = new THREE.Sprite(this.own(color))
    this.group.add(core, a, b)
    const dir = new THREE.Vector3()
    let t = 0
    this.add({
      update: (dt) => {
        t += dt
        const p = from()
        const q = to()
        dir.subVectors(q, p)
        const len = dir.length()
        core.position.copy(p)
        core.quaternion.setFromUnitVectors(UP, dir.normalize())
        const flicker = 0.75 + Math.random() * 0.5
        core.scale.set(width * flicker, len, width * flicker)
        a.position.copy(p)
        b.position.copy(q)
        a.scale.setScalar(1.2 * flicker)
        b.scale.setScalar(2.2 * flicker)
        mat.opacity = 1 - clamp((t - life * 0.7) / (life * 0.3), 0, 1)
        return t < life
      },
      dispose: () => {
        core.removeFromParent()
        a.removeFromParent()
        b.removeFromParent()
        this.kit.drop(mat)
        this.kit.drop(a.material)
        this.kit.drop(b.material)
      },
    })
  }

  clear() {
    for (const e of this.list) e.dispose()
    this.list = []
  }
}

// --- The shield: a honeycomb bubble round the ship, rippling where hit ---

const SHIELD_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vL;
  void main() {
    vL = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`

const SHIELD_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uBase;
  uniform vec4 uHits[4];
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vL;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
    float a = uBase + rim;
    for (int i = 0; i < 4; i++) {
      float age = uHits[i].w;
      if (age < 1.0) {
        float d = acos(clamp(dot(normalize(vL), normalize(uHits[i].xyz)), -1.0, 1.0));
        float ring = 1.0 - smoothstep(0.0, 0.25, abs(d - age * 2.6));
        a += ring * (1.0 - age) * 2.2 + (1.0 - smoothstep(0.0, 0.6, d)) * (1.0 - age) * 1.6;
      }
    }
    gl_FragColor = vec4(uColor * a * uAlpha, 1.0);
  }`

export class Shield {
  readonly group = new THREE.Group()
  private mats: Array<THREE.ShaderMaterial>
  private hits = Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 1, 2))
  private next = 0
  // 0 when down, 1 when up
  level = 0
  private target = 0
  private hold = 0
  private pop = 1

  constructor(kit: Kit, detail: number) {
    const make = (base: number) =>
      kit.keep(
        new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: new THREE.Color('#6fd8ff') },
            uAlpha: { value: 0 },
            uBase: { value: base },
            uHits: { value: this.hits },
          },
          vertexShader: SHIELD_VERT,
          fragmentShader: SHIELD_FRAG,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      )
    const lineMat = make(0.35)
    const shellMat = make(0.02)
    this.mats = [lineMat, shellMat]
    const lines = new THREE.LineSegments(
      shared(honeycomb(detail), kit),
      lineMat,
    )
    const shell = new THREE.Mesh(
      shared(new THREE.IcosahedronGeometry(1, 6), kit),
      shellMat,
    )
    shellMat.uniforms.uColor.value = new THREE.Color('#2a7fd8')
    this.group.add(shell, lines)
    this.group.scale.set(1.95, 1.15, 2.6)
    this.group.position.set(0, 0.2, -0.3)
    this.group.visible = false
  }

  // Down soon, or at once
  cap(seconds: number) {
    this.hold = Math.min(this.hold, seconds)
  }

  raise(seconds: number) {
    if (this.target === 0) this.pop = 0
    this.target = 1
    this.hold = Math.max(this.hold, seconds)
  }

  // A hit at a point in world space: a ripple spreads from it
  hit(world: THREE.Vector3) {
    const local = this.group.worldToLocal(world.clone()).normalize()
    const h = this.hits[this.next]
    h.set(local.x, local.y, local.z, 0)
    this.next = (this.next + 1) % this.hits.length
  }

  update(dt: number) {
    this.hold -= dt
    if (this.hold <= 0) this.target = 0
    this.level +=
      (this.target - this.level) * Math.min(1, dt * (this.target ? 14 : 3))
    this.pop = Math.min(1, this.pop + dt * 4)
    // A little overshoot as it springs up
    const s =
      0.7 + 0.3 * easeOut(this.pop) + Math.sin(this.pop * Math.PI) * 0.08
    this.group.scale.set(1.95 * s, 1.15 * s, 2.6 * s)
    for (const h of this.hits) if (h.w < 1) h.w = Math.min(2, h.w + dt * 1.4)
    const flicker = 0.92 + Math.random() * 0.08
    for (const m of this.mats) m.uniforms.uAlpha.value = this.level * flicker
    this.group.visible = this.level > 0.01
  }
}

// --- Dust: streaks of light rushing past, long at speed ---

export class Dust {
  readonly lines: THREE.LineSegments
  private p: Float32Array
  private n: number

  constructor(kit: Kit, n: number) {
    this.n = n
    this.p = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) this.place(i, -150 + Math.random() * 162)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(n * 6), 3),
    )
    const col = new Float32Array(n * 6)
    for (let i = 0; i < n; i++) {
      const k = 0.6 + Math.random() * 0.4
      const warm = Math.random() < 0.25
      col[i * 6] = (warm ? 1 : 0.75) * k
      col[i * 6 + 1] = (warm ? 0.85 : 0.88) * k
      col[i * 6 + 2] = (warm ? 0.7 : 1) * k
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const mat = kit.keep(
      new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    )
    this.lines = new THREE.LineSegments(geo, mat)
    this.lines.frustumCulled = false
  }

  private place(i: number, z: number) {
    let x = 0
    let y = 0
    do {
      x = (Math.random() * 2 - 1) * 26
      y = (Math.random() * 2 - 1) * 16
    } while (Math.abs(x) < 2.2 && Math.abs(y) < 1.4)
    this.p[i * 3] = x
    this.p[i * 3 + 1] = y
    this.p[i * 3 + 2] = z
  }

  // speed in units a second; brightness 0–1
  update(dt: number, speed: number, brightness: number) {
    const pos = this.lines.geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const len = clamp(speed * 0.05, 0.3, 46)
    for (let i = 0; i < this.n; i++) {
      let z = this.p[i * 3 + 2] + speed * dt
      if (z > 12) {
        this.place(i, z - 165)
        z = this.p[i * 3 + 2]
      }
      this.p[i * 3 + 2] = z
      const x = this.p[i * 3]
      const y = this.p[i * 3 + 1]
      arr[i * 6] = x
      arr[i * 6 + 1] = y
      arr[i * 6 + 2] = z
      arr[i * 6 + 3] = x
      arr[i * 6 + 4] = y
      arr[i * 6 + 5] = z - len
    }
    pos.needsUpdate = true
    ;(this.lines.material as THREE.LineBasicMaterial).opacity = brightness
  }
}
