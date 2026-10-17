import { drawFigure } from './figure'
import { box, dith, hash, px } from './ambient'
import { confetti, fireworks, mark, skyLanterns } from './props'
import type { Arm, CastLook, Light, Pose } from './figure'
import type { Frame, G, Layer } from './ambient'

// The stage: one canvas at the picture's own size, scaled up crisp by
// CSS. It draws the backdrop, what moves over it, the people standing in
// it (breathing, blinking, talking when it is their line) and, when a
// scene ends, fireworks. It animates only while it is on screen and the
// page is visible; under reduced motion it draws still frames.

export interface Spot {
  x: number
  // where the feet are
  y: number
  // 1 faces right, -1 left
  face?: number
  // hidden below this line: behind a counter, a table, a car door
  clip?: number
  // only seen inside this box [x0, y0, x1, y1]: a window, a screen
  window?: [number, number, number, number]
  // moves with something: the raft, the taxi
  bob?: (t: number) => number
  // what they do while others talk
  idle?: 'taichi'
  // drawn larger, as close up on a screen
  zoom?: number
  // where their speech goes, when not over their head: the point under
  // the middle of it
  talkAt?: [number, number]
  // their own light, when not the scene's
  light?: Light
}

export interface Actor extends Spot {
  key: string
  look: CastLook
}

export interface SceneArt {
  w: number
  h: number
  // the painted backdrop, or a drawing for it
  src?: string
  base?: (g: G) => void
  // over the backdrop, behind the people; and in front of them
  back?: Array<Layer>
  front?: Array<Layer>
  // where each of the cast stands; `you` is the player
  spots: Record<string, Spot | undefined>
  light?: Light
  // the middle of the action, for views narrower than the picture
  focus?: number
  // how far down the sky goes, for fireworks
  sky?: number
  night?: boolean
}

interface Mark {
  key: string
  kind: string
  until: number
}

interface Walk {
  key: string
  from: number
  start: number
  secs: number
}

const reduced = () =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

const images = new Map<string, HTMLImageElement>()
function image(src: string): HTMLImageElement {
  let img = images.get(src)
  if (!img) {
    img = new Image()
    img.decoding = 'async'
    img.src = src
    images.set(src, img)
  }
  return img
}

// Figures already drawn, by look, pose and light
const figures = new Map<string, HTMLCanvasElement>()
function figureCanvas(look: CastLook, pose: Pose, light: Light | undefined) {
  const key = `${JSON.stringify(look)}|${JSON.stringify(pose)}|${JSON.stringify(light ?? {})}`
  let c = figures.get(key)
  if (!c) {
    const f = drawFigure(look, pose, light)
    c = document.createElement('canvas')
    c.width = f.w
    c.height = f.h
    c.getContext('2d')?.putImageData(
      new ImageData(f.data as Uint8ClampedArray<ArrayBuffer>, f.w, f.h),
      0,
      0,
    )
    c.dataset.ax = String(f.ax)
    c.dataset.ay = String(f.ay)
    figures.set(key, c)
    if (figures.size > 600) figures.delete(figures.keys().next().value!)
  }
  return c
}

export class Stage {
  private g: G
  private img: HTMLImageElement | null = null
  private drawn: HTMLCanvasElement | null = null
  private actors: Array<Actor> = []
  private talking: string | null = null
  private talkSince = 0
  private marks: Array<Mark> = []
  private walks: Array<Walk> = []
  private ended: number | null = null
  private raf = 0
  private start = performance.now()
  private last = 0
  private onScreen = true
  private observer: IntersectionObserver | null = null
  private still = reduced()
  private alive = true

  constructor(
    canvas: HTMLCanvasElement,
    private art: SceneArt,
    private animate = true,
  ) {
    const g = canvas.getContext('2d')
    if (!g) throw new Error('no 2d context')
    this.g = g
    canvas.width = art.w
    canvas.height = art.h
    g.imageSmoothingEnabled = false
    if (art.src) {
      const img = image(art.src)
      this.img = img
      if (!img.complete)
        img.addEventListener('load', () => this.kick(), { once: true })
    } else if (art.base) {
      // a drawn backdrop is drawn once, then used as a picture
      const off = document.createElement('canvas')
      off.width = art.w
      off.height = art.h
      const og = off.getContext('2d')
      if (og) art.base(og)
      this.drawn = off
    }
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver((es) => {
        this.onScreen = es.some((e) => e.isIntersecting)
        this.kick()
      })
      this.observer.observe(canvas)
    }
    document.addEventListener('visibilitychange', this.kick)
    this.kick()
  }

  // Seconds since the stage began
  now() {
    return (performance.now() - this.start) / 1000
  }

  setActors(list: Array<Actor>) {
    this.actors = list
    this.kick()
  }

  setTalking(key: string | null) {
    if (key !== this.talking) this.talkSince = this.now()
    this.talking = key
    this.kick()
  }

  mark(key: string, kind: string, secs = 1.6) {
    this.marks = [
      ...this.marks.filter((m) => m.key !== key),
      { key, kind, until: this.now() + secs },
    ]
    this.kick()
  }

  // Someone walks in from x = from to their spot
  walkIn(key: string, from: number, secs = 1.4) {
    if (this.still) return
    this.walks = [
      ...this.walks.filter((w) => w.key !== key),
      { key, from, start: this.now(), secs },
    ]
    this.kick()
  }

  end(on: boolean) {
    this.ended = on ? this.now() : null
    this.kick()
  }

  destroy() {
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.observer?.disconnect()
    document.removeEventListener('visibilitychange', this.kick)
  }

  // Draw now, and go on drawing while there is motion to show
  private kick = () => {
    if (!this.alive) return
    cancelAnimationFrame(this.raf)
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (ms: number) => {
    if (!this.alive) return
    const moving =
      this.animate && !this.still && this.onScreen && !document.hidden
    // at most about 24 frames a second: pixel art needs no more
    if (!moving || ms - this.last > 40) {
      this.last = ms
      this.draw(moving ? this.now() : 0)
    }
    if (moving) this.raf = requestAnimationFrame(this.tick)
  }

  private draw(t: number) {
    const { g, art } = this
    const w = art.w
    const h = art.h
    const img: CanvasImageSource | null =
      this.img?.complete && this.img.naturalWidth ? this.img : this.drawn
    g.imageSmoothingEnabled = false
    g.clearRect(0, 0, w, h)
    if (img) g.drawImage(img, 0, 0, w, h)
    else {
      // still loading
      box(g, 0, 0, w, h, art.night ? '#141026' : '#2a2430')
      return
    }
    const frame: Frame = { g, t, img, w, h }
    for (const layer of art.back ?? []) layer(frame)
    const sorted = [...this.actors].sort((a, b) => a.y - b.y)
    for (const a of sorted) this.drawActor(a, t)
    for (const layer of art.front ?? []) layer(frame)
    for (const m of this.marks) {
      const a = this.actors.find((x) => x.key === m.key)
      if (!a || (t > m.until && !this.still)) continue
      // beside the face, clear of the speech above the head
      const [x, y] = this.place(a, t)
      const z = a.window ? 1 : (a.zoom ?? 1)
      const top = a.window ? a.window[1] + 12 : y - 42 * z
      mark(g, m.kind, x + (a.face ?? 1) * 13 * z, top, t)
    }
    // the end of the scene: fireworks and sky lanterns by night, paper
    // confetti by day
    if (this.ended !== null) {
      const e = this.still ? 2.4 : t - this.ended
      if (art.night) {
        fireworks(g, e, w, h, art.sky ?? h * 0.55)
        skyLanterns(g, e, w, h)
      } else confetti(g, e, w, h)
    }
  }

  // Where an actor's feet are now, walking in or bobbing
  private place(a: Actor, t: number): [number, number] {
    let x = a.x
    const walk = this.walks.find((w) => w.key === a.key)
    if (walk) {
      const p = Math.min(1, (t - walk.start) / walk.secs)
      x = walk.from + (a.x - walk.from) * p
    }
    return [Math.round(x), Math.round(a.y + (a.bob?.(t) ?? 0))]
  }

  private drawActor(a: Actor, t: number) {
    const { g } = this
    const i = hash(a.key.length * 31 + a.key.charCodeAt(0))
    const walk = this.walks.find((w) => w.key === a.key && t - w.start < w.secs)
    const talking = this.talking === a.key
    const [x, y] = this.place(a, t)
    let face = a.face ?? 1
    const pose: Pose = {}
    if (walk) {
      pose.walk = Math.floor(t * 8) % 4
      face = walk.from > a.x ? -1 : 1
    } else if (this.still) {
      pose.arm = talking ? 'chest' : 'down'
      pose.mouth = talking ? 1 : 0
    } else {
      // breathing, and a blink every few seconds
      pose.breath = (t + i * 3) % 2.6 < 1.3 ? 0 : 1
      const period = 3 + i * 2.5
      pose.blink = (t + i * 7) % period < 0.13
      if (talking) {
        const since = t - this.talkSince
        const beat = Math.floor(since * 7.5)
        pose.mouth =
          hash(beat * 3 + i) < 0.62 ? 1 + (hash(beat + 9) < 0.3 ? 1 : 0) : 0
        const gestures: Array<Arm> = [
          'chest',
          'down',
          'out',
          'chest',
          'up',
          'down',
        ]
        pose.arm =
          since < 0.25
            ? 'down'
            : gestures[
                Math.floor(
                  hash(Math.floor(since / 0.9) + i * 17) * gestures.length,
                )
              ]
      } else if (a.idle === 'taichi') {
        // slow forms: the hands rise, push and sink
        const forms: Array<Arm> = ['down', 'chest', 'out', 'up', 'out', 'chest']
        pose.arm = forms[Math.floor(t / 1.3) % forms.length]
        pose.breath = Math.floor(t / 1.3) % 2
      }
      if (a.look.hold === 'flag') pose.flutter = Math.floor(t * 3) % 2
    }
    const c = figureCanvas(a.look, pose, a.light ?? this.art.light)
    const ax = Number(c.dataset.ax)
    const ay = Number(c.dataset.ay)
    g.save()
    if (a.window) {
      const [x0, y0, x1, y1] = a.window
      const dy = Math.round(a.bob?.(t) ?? 0)
      g.beginPath()
      g.rect(x0, y0 + dy, x1 - x0, y1 - y0)
      g.clip()
    } else if (a.clip !== undefined) {
      g.beginPath()
      g.rect(0, 0, this.art.w, a.clip + (a.bob?.(t) ?? 0))
      g.clip()
    }
    // a shadow on the ground
    if (a.clip === undefined && !a.window)
      for (let k = -9; k <= 9; k++)
        for (let j = -1; j <= 1; j++)
          if (Math.abs(k) < 9 - Math.abs(j) * 4 && dith(x + k, y + j, 0.55))
            px(g, x + k, y + j, 'rgba(10,6,14,0.55)')
    const z = a.zoom ?? 1
    if (face < 0) {
      g.translate(x * 2 + z, 0)
      g.scale(-1, 1)
    }
    g.drawImage(c, x - ax * z, y - ay * z, c.width * z, c.height * z)
    g.restore()
  }

  // The top of an actor's head on the canvas, for placing their speech
  head(key: string): [number, number] | null {
    const a = this.actors.find((x) => x.key === key)
    if (!a) return null
    return [a.x, a.window ? a.window[1] : a.y - 54]
  }
}
