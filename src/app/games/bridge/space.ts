import * as THREE from 'three'
import { Film } from './film'
import { Dust, Fx, Shield } from './fx'
import { Kit, clamp, disposeTree, easeIn, easeInOut, easeOut, mix } from './kit'
import {
  PLANET_LIGHT,
  blinkA,
  blinkB,
  makePlanet,
  makeShip,
  makeSky,
  makeStars,
  rockShapes,
} from './models'
import { LANE, Threat } from './threats'
import { Visitors } from './visitors'
import type { Ctx, Lane, Strike } from './threats'
import type { PlanetModel, ShipModel } from './models'
import type { Sfx } from './sound'
import type { Action, Leg, Order, PlanetId } from '../../data/bridge'
import type { Cue, Encounter } from '../../data/encounters'

// The starship's scene in three.js: the ship seen from behind and a little
// above, flying into the screen (−z) past dust and dangers; behind it all a
// painted starfield, a nearby sun and the planet the ship is bound for. Two
// passes, as if on film (film.ts): the far sky and planets with their own
// light and depth range, then everything near. The loop pauses while the
// page is hidden.

const CRUISE = 26
// Where the nearby star is seen (the planets are lit from PLANET_LIGHT)
const SUN = new THREE.Vector3(-0.62, 0.24, -0.75).normalize()
// The painting behind each leg (models.ts, SKIES): the voyage passes from
// one part of the sky to another and back
const SKY_OF: Record<PlanetId, number> = {
  moon: 0,
  mars: 0,
  jupiter: 1,
  saturn: 1,
  earth: 0,
}
// Where the planet ahead is
const AHEAD = new THREE.Vector3(0.42, 0.13, -1).normalize()
const PLANET_DIST = 3000
// Angular size at a leg's start and end, and docked
const SIZE = { start: 0.03, end: 0.12, docked: 0.22 }
const PLANET_SCALE: Record<PlanetId, number> = {
  moon: 0.8,
  mars: 0.85,
  jupiter: 1.3,
  saturn: 0.85,
  earth: 1,
}

const DIRS: Partial<Record<Action, Lane>> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
}

export class NoWebGL extends Error {}

export interface SpaceOptions {
  reduced: boolean
  mobile: boolean
  sfx: Sfx
}

export class Space {
  private renderer: THREE.WebGLRenderer
  private film: Film
  private sky: ReturnType<typeof makeSky>
  private kit = new Kit()
  private fg = new THREE.Scene()
  private bg = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 420)
  private bgCamera = new THREE.PerspectiveCamera(60, 1, 1, 12000)
  private observer: ResizeObserver
  private raf = 0
  private last = 0
  private running = false
  private paused = false
  private hidden = false
  private baseFov = 60
  time = 0

  private ship: ShipModel
  private lane: Lane = { x: 0, y: 0 }
  private pos = new THREE.Vector2()
  private vel = new THREE.Vector2()
  private roll = 0
  private wobble = 0
  private glow = 0
  private speed = 0.4
  private speedTarget = 0.4
  private speedHold = 0
  private shake = 0
  private heat = 0
  private hull = 100
  private smoke = 0
  private shield: Shield
  private dust: Dust
  private fx: Fx
  private threat: Threat | null = null
  private p = 0
  private ctx: Ctx
  private visitors: Visitors
  // Orders given, so a visitor steps back only after the last of a fight
  private orders = 0
  private meeting = false

  private planet: { model: PlanetModel; id: PlanetId } | null = null
  private planetSize = SIZE.start
  private planetTarget = SIZE.start
  private orbitScene: Array<PlanetModel> = []

  private camMode: 'orbit' | 'chase' | 'wreck' = 'orbit'
  private camBlend = 1
  private camBlendTime = 1
  private camFrom = { pos: new THREE.Vector3(), look: new THREE.Vector3() }
  private camPos = new THREE.Vector3(6, 3, 6)
  private camLook = new THREE.Vector3()

  private warpT = -1
  private warpLeg: Leg | null = null
  private warpFactor = 1
  private warpFov = 0
  private jumped = false
  private parked = true
  private wrecked = false
  private later: Array<{ at: number; fn: () => void }> = []

  onFrame: ((dt: number) => void) | null = null
  onHit: (() => void) | null = null
  onFlash: (() => void) | null = null
  onLost: (() => void) | null = null

  constructor(
    private host: HTMLElement,
    private opts: SpaceOptions,
  ) {
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch {
      throw new NoWebGL()
    }
    this.renderer = renderer
    renderer.autoClear = false
    this.film = new Film(
      renderer,
      { scene: this.bg, camera: this.bgCamera },
      { scene: this.fg, camera: this.camera },
      { glow: !opts.mobile },
    )
    renderer.setClearColor('#04030a')
    const canvas = renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.addEventListener('webglcontextlost', this.lost)
    host.appendChild(canvas)

    const { kit } = this
    const mobile = opts.mobile

    // The far scene: the painted sky, a few sharp stars over it, the sun,
    // and planets in their own light
    this.sky = makeSky(kit)
    this.sky.show(0)
    this.bg.add(this.sky.mesh)
    this.bg.add(makeStars(kit, mobile ? 260 : 520, 1))
    this.bg.add(makeStars(kit, mobile ? 60 : 120, 3))
    const sun = kit.sprite('#fff3d6', 520, { map: kit.sparkle })
    sun.position.copy(SUN).multiplyScalar(3400)
    const halo = kit.sprite('#ff9a5a', 2600, { opacity: 0.35 })
    halo.position.copy(sun.position)
    this.bg.add(halo, sun)
    const planetLight = new THREE.DirectionalLight('#fff2e0', 2.8)
    planetLight.position.copy(PLANET_LIGHT)
    this.bg.add(
      planetLight,
      new THREE.HemisphereLight('#4a4a8a', '#0a0a14', 0.5),
    )

    // The near scene: a key light from above and behind, the star's warm
    // light from the left, violet and teal from the nebula
    this.fg.add(new THREE.HemisphereLight('#a596f0', '#0f4048', 1.15))
    const key = new THREE.DirectionalLight('#fff4e6', 2.0)
    key.position.set(0.5, 1, 0.9)
    const warm = new THREE.DirectionalLight('#ffb57a', 1.6)
    warm.position.copy(SUN).multiplyScalar(10)
    this.fg.add(key, warm)
    this.fg.fog = new THREE.Fog('#0d0a24', 48, 135)

    this.ship = makeShip(kit)
    this.shield = new Shield(kit, mobile ? 3 : 4)
    this.ship.group.add(this.shield.group)
    this.fg.add(this.ship.group)
    this.dust = new Dust(kit, mobile ? 220 : 380)
    this.fg.add(this.dust.lines)
    this.fx = new Fx(kit, this.camera, opts.reduced)
    this.fg.add(this.fx.group)
    this.visitors = new Visitors({
      kit,
      fx: this.fx,
      sfx: opts.sfx,
      ship: () => this.ship.group.position.clone(),
      flow: () => this.flow(),
      reduced: opts.reduced,
      narrow: opts.mobile,
    })
    this.fg.add(this.visitors.group)

    this.ctx = {
      kit,
      fx: this.fx,
      rocks: rockShapes(kit),
      ship: () => this.ship.group.position.clone(),
      lane: () => ({
        x: Math.round(this.pos.x / LANE.x),
        y: Math.round(this.pos.y / LANE.y),
      }),
      nacelle: (side) =>
        this.ship.group.localToWorld(new THREE.Vector3(side, 0.6, 1.5)),
      hit: (at, kind) => this.struck(at, kind),
      shieldHit: (at) => this.shield.hit(at),
      heat: (h) => {
        this.heat = h
      },
      speed: () => this.flow(),
      time: () => this.time,
    }

    this.orbit()
    // Placed before the first picture, which is drawn before the loop runs
    this.stepCamera(0)
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(host)
    this.resize()
    document.addEventListener('visibilitychange', this.visibility)
    this.hidden = document.hidden
    this.run()
  }

  // --- The loop ---

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.step(dt)
    this.render()
  }

  private run() {
    if (this.running || this.paused || this.hidden) return
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  private halt() {
    cancelAnimationFrame(this.raf)
    this.running = false
  }

  setPaused(p: boolean) {
    this.paused = p
    if (p) this.halt()
    else this.run()
  }

  private visibility = () => {
    this.hidden = document.hidden
    if (this.hidden) this.halt()
    else this.run()
  }

  private lost = (e: Event) => {
    e.preventDefault()
    this.halt()
    this.onLost?.()
  }

  private resize() {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    if (!w || !h) return
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2,
      Math.sqrt(2_400_000 / (w * h)),
    )
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h)
    this.film.setSize(w, h, dpr)
    const aspect = w / h
    this.camera.aspect = aspect
    this.bgCamera.aspect = aspect
    // Wide enough on a tall screen to see the lanes either side
    this.baseFov = Math.max(
      58,
      (2 * Math.atan(Math.tan((31 * Math.PI) / 180) / aspect) * 180) / Math.PI,
    )
    if (!this.running) this.render()
  }

  private flow() {
    return CRUISE * this.speed * this.warpFactor
  }

  private step(dt: number) {
    this.time += dt
    this.onFrame?.(dt)
    if (this.later.length) {
      const due = this.later.filter((l) => l.at <= this.time)
      this.later = this.later.filter((l) => l.at > this.time)
      for (const l of due) l.fn()
    }
    if (this.warpT >= 0) this.stepWarp(dt)

    if (this.speedHold > 0) {
      this.speedHold -= dt
      if (this.speedHold <= 0) this.speedTarget = this.parked ? 0 : 1
    }
    const rate = this.speedTarget > this.speed ? 5 : 3
    this.speed += (this.speedTarget - this.speed) * Math.min(1, dt * rate)
    const flow = this.flow()

    this.stepShip(dt)
    this.threat?.update(dt, this.p)
    this.visitors.update(dt)
    this.fx.update(dt, flow)
    this.dust.update(dt, flow, clamp(0.3 + flow / 300, 0.3, 1))
    this.shield.update(dt)

    const on = Math.sin(this.time * 9) > 0
    blinkA(this.kit).color.set(on ? '#ffe066' : '#4a3a10')
    blinkB(this.kit).color.set(on ? '#3a1030' : '#ff4fd8')

    if (this.planet) {
      this.planetSize +=
        (this.planetTarget - this.planetSize) * Math.min(1, dt * 0.7)
      const m = this.planet.model
      m.group.scale.setScalar(
        PLANET_DIST * this.planetSize * PLANET_SCALE[this.planet.id],
      )
      m.body.rotation.y += dt * 0.025
      for (const moon of m.moons) moon.pivot.rotation.y += moon.speed * dt
    }
    for (const m of this.orbitScene) {
      m.body.rotation.y += dt * 0.004
      for (const moon of m.moons) moon.pivot.rotation.y += moon.speed * dt
    }
    this.stepCamera(dt)
    this.opts.sfx.engine(this.wrecked ? 0 : this.speed * this.warpFactor)
  }

  private stepShip(dt: number) {
    const g = this.ship.group
    if (this.wrecked) return
    // A critically damped spring to the lane
    const w = 8.5
    const tx = this.lane.x * LANE.x
    const ty = this.lane.y * LANE.y
    this.vel.x += (w * w * (tx - this.pos.x) - 2 * w * this.vel.x) * dt
    this.vel.y += (w * w * (ty - this.pos.y) - 2 * w * this.vel.y) * dt
    this.pos.x += this.vel.x * dt
    this.pos.y += this.vel.y * dt
    this.wobble = Math.max(0, this.wobble - dt * 1.4)
    const t = this.time
    const bob = Math.sin(t * 1.6) * 0.06
    const targetRoll = clamp(-this.vel.x * 0.075, -0.75, 0.75)
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 10)
    g.position.set(this.pos.x, this.pos.y + bob, 0)
    g.rotation.set(
      clamp(this.vel.y * 0.05, -0.4, 0.4) +
        Math.sin(t * 23) * this.wobble * 0.08,
      clamp(-this.vel.x * 0.025, -0.25, 0.25),
      this.roll +
        Math.sin(t * 1.1) * 0.025 +
        Math.sin(t * 17) * this.wobble * 0.35,
      'YXZ',
    )
    // Engines: brighter with speed, hot red when overheating
    const s = Math.min(this.speed * this.warpFactor, 8)
    const flare = 0.45 + 0.55 * Math.pow(s, 0.55)
    // Warm early, so a rising heat shows
    const h = Math.sqrt(this.heat)
    for (const e of this.ship.engines) {
      e.scale.setScalar(
        1.25 * flare * (0.95 + Math.random() * 0.1) * (1 + h * 0.5),
      )
      e.material.opacity = clamp(0.35 + s * 0.4, 0.35, 1)
      e.material.color.setRGB(
        mix(0.35, 1, h),
        mix(0.85, 0.42, h),
        mix(1, 0.12, h),
        THREE.SRGBColorSpace,
      )
    }
    this.ship.impulse.scale.setScalar(0.9 * flare)
    this.ship.strips.color.setRGB(
      mix(0.44, 1.0, h),
      mix(0.91, 0.32, h),
      mix(1.0, 0.1, h),
      THREE.SRGBColorSpace,
    )
    for (const b of this.ship.bussards)
      b.scale.setScalar(0.8 + this.heat * 0.9 + Math.sin(t * 6) * 0.05)
    this.glow = Math.max(0, this.glow - dt * 2.5)
    this.ship.paint.emissive.setRGB(
      this.glow * 0.7,
      this.glow * 0.12,
      this.glow * 0.05,
    )
    // Smoke from a damaged hull
    if (this.hull <= 40) {
      this.smoke -= dt
      if (this.smoke <= 0) {
        this.smoke = this.hull <= 20 ? 0.07 : 0.15
        const side = Math.random() < 0.5 ? -1 : 1
        this.fx.puff(this.ctx.nacelle(side), '#2c2828', 1.1, 0.9)
        if (this.hull <= 20 && Math.random() < 0.3)
          this.fx.sparks(this.ctx.nacelle(side), '#ffb040', 5, 3, 0.3)
      }
    }
  }

  private stepCamera(dt: number) {
    const ship = this.ship.group.position
    const pos = new THREE.Vector3()
    const look = new THREE.Vector3()
    if (this.camMode === 'orbit') {
      const a = this.time * 0.11 + 0.8
      pos.set(
        ship.x + Math.sin(a) * 8.2,
        ship.y + 2.4 + Math.sin(this.time * 0.23) * 0.8,
        Math.cos(a) * 8.2 - 0.6,
      )
      look.set(ship.x, ship.y + 0.1, -0.6)
    } else if (this.camMode === 'chase') {
      const back = (this.speed - 1) * (this.opts.reduced ? 0.1 : 0.4)
      pos.set(this.pos.x * 0.55, 2.85 + this.pos.y * 0.5, 7.4 + back)
      look.set(this.pos.x * 0.8, this.pos.y * 0.7 + 0.1, -10)
    } else {
      pos.set(
        Math.sin(this.time * 0.1) * 3,
        3.5,
        15 + Math.min(this.time, 60) * 0,
      )
      look.set(0, 0, -4)
    }
    if (this.camBlend < 1) {
      this.camBlend = Math.min(1, this.camBlend + dt / this.camBlendTime)
      const k = easeInOut(this.camBlend)
      pos.lerpVectors(this.camFrom.pos, pos, k)
      look.lerpVectors(this.camFrom.look, look, k)
    }
    this.camPos.copy(pos)
    this.camLook.copy(look)
    this.camera.position.copy(pos)
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.8)
      const s = this.shake * this.shake
      this.camera.position.x += (Math.random() - 0.5) * s
      this.camera.position.y += (Math.random() - 0.5) * s
    }
    const r = this.camMode === 'chase' ? this.roll * 0.18 : 0
    this.camera.up.set(Math.sin(r), Math.cos(r), 0)
    this.camera.lookAt(look)
    const speedFov =
      clamp((this.speed - 1) * 5.5, -6, 13) * (this.opts.reduced ? 0.3 : 1)
    this.camera.fov = this.baseFov + speedFov + this.warpFov
    this.camera.updateProjectionMatrix()
    this.bgCamera.position.copy(this.camera.position)
    this.bgCamera.quaternion.copy(this.camera.quaternion)
    this.bgCamera.fov = this.camera.fov
    this.bgCamera.updateProjectionMatrix()
  }

  private setCam(mode: Space['camMode'], seconds: number) {
    this.camFrom.pos.copy(this.camPos)
    this.camFrom.look.copy(this.camLook)
    this.camBlend = 0
    this.camBlendTime = seconds
    this.camMode = mode
  }

  private render() {
    this.film.render(this.time, this.opts.reduced)
  }

  private after(seconds: number, fn: () => void) {
    this.later.push({ at: this.time + seconds, fn })
  }

  // --- Places ---

  // In orbit over the Earth, the moon beyond: where every voyage starts
  orbit() {
    this.clearOrbit()
    this.sky.show(0)
    const mobile = this.opts.mobile
    const earth = makePlanet(this.kit, 'earth', mobile ? 22 : 34, 0.3)
    // Below and ahead: its rim curves across the lower part of the view
    earth.group.position.set(0, -1250, -950)
    earth.group.scale.setScalar(1000)
    // Turned so the tropics face the ship, not the polar ice
    earth.body.rotation.set(Math.PI / 2 - 0.25, 0, 2.6)
    const moon = makePlanet(this.kit, 'moon', 10)
    moon.group.position.set(-1900, 640, -3300)
    moon.group.scale.setScalar(110)
    this.bg.add(earth.group, moon.group)
    this.orbitScene = [earth, moon]
    this.setPlanet(null)
    this.parked = true
    this.speedTarget = 0.35
    this.speed = 0.35
  }

  private clearOrbit() {
    for (const m of this.orbitScene) {
      m.group.removeFromParent()
      disposeTree(m.group, this.kit)
    }
    this.orbitScene = []
  }

  private setPlanet(id: PlanetId | null) {
    if (this.planet) {
      this.planet.model.group.removeFromParent()
      disposeTree(this.planet.model.group, this.kit)
      this.planet = null
    }
    if (!id) return
    const model = makePlanet(this.kit, id, this.opts.mobile ? 10 : 16)
    model.group.position.copy(AHEAD).multiplyScalar(PLANET_DIST)
    this.bg.add(model.group)
    this.planet = { model, id }
    this.planetSize = SIZE.start * 0.6
    this.planetTarget = SIZE.start
  }

  // The attract view before a game: the camera circles the ship in orbit
  idle() {
    this.reset()
    this.orbit()
    this.setCam('orbit', 0.001)
  }

  private reset() {
    this.clearThreat()
    this.visitors.clear()
    this.meeting = false
    this.fx.clear()
    this.wrecked = false
    this.ship.group.visible = true
    this.hull = 100
    this.heat = 0
    this.lane = { x: 0, y: 0 }
    this.pos.set(0, 0)
    this.vel.set(0, 0)
    this.warpT = -1
    this.warpFactor = 1
    this.warpFov = 0
    this.later = []
  }

  // --- What the flight asks of the scene ---

  setOff(_leg: Leg, first: boolean) {
    if (first) {
      this.reset()
      if (!this.orbitScene.length) this.orbit()
      // Swing round behind the ship
      this.setCam('chase', 3.2)
    }
    this.parked = true
    this.speedTarget = first ? 0.35 : 0
  }

  // Into warp and out again at the next planet; returns how long it takes
  warp(leg: Leg): number {
    this.warpT = 0
    this.warpLeg = leg
    this.jumped = false
    this.parked = false
    this.speedTarget = 1
    this.speedHold = 0
    this.opts.sfx.warp()
    return 3.3
  }

  private stepWarp(dt: number) {
    const t = (this.warpT += dt)
    const reduced = this.opts.reduced
    if (t < 0.9) {
      this.warpFactor = 1 + easeIn(t / 0.9) * 5
      this.warpFov = (t / 0.9) * (reduced ? 3 : 8)
    } else if (t < 2.4) {
      if (!this.jumped) {
        this.jumped = true
        this.clearThreat()
        this.clearOrbit()
        if (this.warpLeg) {
          this.setPlanet(this.warpLeg.id)
          this.sky.show(SKY_OF[this.warpLeg.id])
        }
        this.fx.flash(
          this.ship.group.position.clone().add(new THREE.Vector3(0, 0.3, -3)),
          '#dff6ff',
          reduced ? 8 : 26,
          0.6,
        )
        if (!reduced) this.onFlash?.()
      }
      this.warpFactor = 55
      this.warpFov = reduced ? 6 : 24
      if (!reduced) this.shake = Math.max(this.shake, 0.25)
    } else {
      const k = clamp((t - 2.4) / 0.9, 0, 1)
      this.warpFactor = mix(55, 1, easeOut(k))
      this.warpFov = (reduced ? 6 : 24) * (1 - easeOut(k))
      if (k >= 1) {
        this.warpT = -1
        this.warpFactor = 1
        this.warpFov = 0
      }
    }
  }

  // How near the planet is, over a leg (0–1)
  course(_leg: Leg, s: number) {
    this.planetTarget = mix(SIZE.start, SIZE.end, s)
  }

  order(o: Order) {
    this.clearThreat()
    this.shield.cap(0)
    this.lane = { x: 0, y: 0 }
    this.p = 0
    this.orders++
    this.threat = new Threat(this.ctx, o)
    this.fg.add(this.threat.group)
    this.opts.sfx.chirp()
    // In a fight the ship flies on; the one met waits out of the way
    if (this.meeting) {
      this.visitors.aside()
      this.speedTarget = 1
    }
  }

  progress(p: number) {
    this.p = p
  }

  act(a: Action, right: boolean) {
    const sfx = this.opts.sfx
    const g = this.ship.group
    const d = DIRS[a]
    if (d) {
      this.lane = {
        x: clamp(this.lane.x + d.x, -1, 1),
        y: clamp(this.lane.y + d.y, -1, 1),
      }
      sfx.whoosh()
      // Thrusters on the far side push it over
      const side = new THREE.Vector3(-d.x * 1.3, 0.3 - d.y * 0.4, -1)
      this.fx.flash(g.localToWorld(side), '#cfeeff', 1.4, 0.3)
    } else if (a === 'fire') {
      const target = this.threat?.aim(this.lane) ?? null
      sfx.laser()
      const shoot = (delay: number) =>
        this.after(delay, () => {
          for (const gun of this.ship.guns) {
            const from = g.localToWorld(gun.clone())
            const ahead = from.clone().add(new THREE.Vector3(0, 0, -90))
            this.fx.bolt(
              from,
              target ? target.at : () => ahead,
              '#ff6a3a',
              () => target?.hit(),
            )
          }
        })
      shoot(0)
      shoot(0.09)
    } else if (a === 'shield') {
      this.shield.raise(2.6)
      sfx.shield()
    } else if (a === 'fast') {
      this.speedTarget = 3.3
      this.speedHold = 1.5
      sfx.dash()
      for (const e of this.ship.engines)
        this.fx.flash(
          e.getWorldPosition(new THREE.Vector3()),
          '#9ff4ff',
          3.5,
          0.4,
        )
    } else {
      // Slower, or stopped: retro thrusters fire at the front
      this.speedTarget = a === 'stop' ? 0 : 0.3
      this.speedHold = 2.0
      sfx.brake()
      for (let i = 0; i < 4; i++)
        this.after(i * 0.12, () => {
          for (const s of [-1, 1])
            this.fx.flash(
              g.localToWorld(new THREE.Vector3(s * 0.7, 0.32, -2.3)),
              '#ffd8a0',
              a === 'stop' ? 1.8 : 1.2,
              0.25,
            )
        })
    }
    this.threat?.act(a, right)
  }

  resolve(ok: boolean): number {
    this.shield.cap(1.1)
    const length = this.threat?.resolve(ok) ?? 1
    // Back to talking, unless another order comes first
    if (this.meeting) {
      const n = this.orders
      this.after(length + 0.3, () => {
        if (this.orders !== n || !this.meeting) return
        this.visitors.back()
        this.lane = { x: 0, y: 0 }
        this.speedTarget = 0.3
      })
    }
    return length
  }

  // --- Encounters ---

  // The ship slows to meet whoever it is; returns how long they take to come
  meet(e: Encounter): number {
    this.meeting = true
    this.lane = { x: 0, y: 0 }
    this.speedTarget = 0.3
    this.speedHold = 0
    if (e.visitor !== 'none') this.opts.sfx.hail()
    return this.visitors.meet(e.visitor)
  }

  cue(c: Cue, allies: Array<string> = []): number {
    this.clearThreat()
    this.lane = { x: 0, y: 0 }
    if (c === 'gift') this.after(1.0, () => this.save())
    if (c === 'open' || c === 'gone' || c === 'leave') this.speedTarget = 1
    return this.visitors.cue(c, allies)
  }

  part() {
    this.meeting = false
    this.visitors.part()
    this.speedTarget = 1
    this.speedHold = 0
  }

  // The gift of a shield, glowing gold for a moment
  save() {
    this.shield.raise(1.4)
    this.fx.flash(
      this.ship.group.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
      '#ffe9a8',
      7,
      0.7,
    )
    this.opts.sfx.shield()
  }

  music(): number {
    return this.visitors.music()
  }

  arrive(_leg: Leg) {
    this.opts.sfx.win()
    this.planetTarget = SIZE.docked
    this.parked = true
    this.speedTarget = 0
    this.speedHold = 0
  }

  setHull(h: number) {
    this.hull = h
  }

  // The end: the ship breaks up
  wreck() {
    if (this.wrecked) return
    this.wrecked = true
    const at = this.ship.group.position.clone()
    this.fx.explode(at, {
      size: 2.4,
      debris: ['#e4e1da', '#d3d0c9', '#8e929c', '#c8372d', '#6fe8ff'],
      n: 34,
    })
    this.after(0.25, () =>
      this.fx.explode(at.clone().add(new THREE.Vector3(1, 0.5, 1)), {
        size: 1.4,
      }),
    )
    this.ship.group.visible = false
    this.opts.sfx.boom(2)
    this.opts.sfx.quiet()
    this.speedTarget = 0.3
    this.parked = true
    this.setCam('wreck', 2.5)
  }

  private struck(at: THREE.Vector3, kind: Strike) {
    const big = kind !== 'beam'
    this.fx.explode(at, {
      size: big ? 1.1 : 0.75,
      debris: ['#e4e1da', '#8e929c', '#c8372d'],
      n: 8,
    })
    if (kind === 'zap' || kind === 'beam')
      this.fx.sparks(at, '#bff6ff', 30, 8, 0.5)
    if (this.shield.level > 0.1) this.shield.hit(at)
    this.wobble = 1
    this.glow = 1
    if (!this.opts.reduced) this.shake = 0.75
    this.opts.sfx.hit()
    if (kind === 'zap') this.opts.sfx.zap()
    this.onHit?.()
  }

  private clearThreat() {
    this.threat?.dispose()
    this.threat = null
    this.heat = 0
  }

  destroy() {
    this.halt()
    this.observer.disconnect()
    document.removeEventListener('visibilitychange', this.visibility)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.lost)
    this.clearThreat()
    this.fx.clear()
    disposeTree(this.fg, this.kit)
    disposeTree(this.bg, this.kit)
    this.kit.dispose()
    this.film.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
    this.onFrame = null
    this.onHit = null
    this.onFlash = null
    this.onLost = null
  }
}
