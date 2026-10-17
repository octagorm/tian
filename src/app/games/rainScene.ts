// Pinyin rain's town at night, painted on a small canvas a few CSS pixels
// to the pixel and scaled up unsmoothed: the picture (public/art/
// games/rain-town.png, 256 × 256), extended upward with dithered sky to
// fit any shape of screen, then rain in two layers, lit windows and their
// reflections that flicker, splashes where drops and words land, the glow
// of the lanterns in the air, and now and then lightning.

const IMG = 256
// Rows of the picture: where the sky ends behind the roofs, and where the
// street begins (rain splashes on it)
const SKY_END = 112
const STREET = 196

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

interface Blob {
  x: number
  y: number
  w: number
  h: number
  seed: number
  // reflections in the water shimmer faster than windows
  water: boolean
}

interface Drop {
  x: number
  y: number
  len: number
  speed: number
  near: boolean
  // the row where it ends, as if at some depth
  end: number
}

interface Splash {
  x: number
  y: number
  t0: number
  big: boolean
}

export interface Glow {
  // centre, as fractions of the scene
  x: number
  y: number
  strength: number
}

export interface RainScene {
  resize: (w: number, h: number) => void
  draw: (now: number, glows: Array<Glow>) => void
  // a word landing, at fractions of the scene
  splash: (x: number, y: number) => void
}

const hex = (r: number, g: number, b: number) =>
  `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`

export function rainScene(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  still: boolean,
): RainScene {
  const g = canvas.getContext('2d')!
  const base = document.createElement('canvas')
  const bg = base.getContext('2d')!
  const lights = document.createElement('canvas')
  const blobs: Array<Blob> = []
  let ps = 2
  let aw = IMG
  let ah = IMG
  let ix = 0
  let iy = 0
  let drops: Array<Drop> = []
  const splashes: Array<Splash> = []
  let nextBolt = performance.now() + 6000 + Math.random() * 6000
  let bolt: { t0: number; path: Array<[number, number]> } | null = null

  // The lit pixels of the picture, in a layer of their own, and the blobs
  // they make (each window, lantern and reflection), to flicker one by one
  {
    const c = document.createElement('canvas')
    c.width = IMG
    c.height = IMG
    const cg = c.getContext('2d', { willReadFrequently: true })!
    cg.drawImage(img, 0, 0)
    const src = cg.getImageData(0, 0, IMG, IMG)
    const lit = new Uint8Array(IMG * IMG)
    const out = cg.createImageData(IMG, IMG)
    for (let i = 0; i < IMG * IMG; i++) {
      const r = src.data[i * 4]
      const gg = src.data[i * 4 + 1]
      const b = src.data[i * 4 + 2]
      const warm = r > 170 && gg > 80 && b < 120 && r - b > 90
      if (!warm) continue
      lit[i] = 1
      out.data[i * 4] = Math.min(255, r * 1.15)
      out.data[i * 4 + 1] = Math.min(255, gg * 1.1)
      out.data[i * 4 + 2] = b
      out.data[i * 4 + 3] = 255
    }
    lights.width = IMG
    lights.height = IMG
    lights.getContext('2d')!.putImageData(out, 0, 0)
    // flood fill into blobs
    const seen = new Uint8Array(IMG * IMG)
    for (let i = 0; i < IMG * IMG; i++) {
      if (!lit[i] || seen[i]) continue
      let x0 = IMG
      let y0 = IMG
      let x1 = 0
      let y1 = 0
      let n = 0
      const stack = [i]
      seen[i] = 1
      while (stack.length) {
        const j = stack.pop()!
        const x = j % IMG
        const y = (j - x) / IMG
        n++
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
        for (const k of [j - 1, j + 1, j - IMG, j + IMG]) {
          if (k < 0 || k >= IMG * IMG || seen[k] || !lit[k]) continue
          if (Math.abs((k % IMG) - x) > 1) continue
          seen[k] = 1
          stack.push(k)
        }
      }
      if (n < 2) continue
      blobs.push({
        x: x0,
        y: y0,
        w: x1 - x0 + 1,
        h: y1 - y0 + 1,
        seed: Math.random() * 1000,
        water: y0 > 150,
      })
    }
  }

  // The top row's average colour, for the sky above the picture to meet
  const topColour = (() => {
    const c = document.createElement('canvas')
    c.width = IMG
    c.height = 4
    const cg = c.getContext('2d', { willReadFrequently: true })!
    cg.drawImage(img, 0, 0, IMG, 4, 0, 0, IMG, 4)
    const d = cg.getImageData(0, 0, IMG, 4).data
    let r = 0
    let gg = 0
    let b = 0
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]
      gg += d[i + 1]
      b += d[i + 2]
    }
    const n = d.length / 4
    return [r / n, gg / n, b / n] as const
  })()

  const makeDrops = () => {
    const n = Math.round((aw * ah) / 260)
    drops = Array.from({ length: n }, () => {
      const near = Math.random() < 0.35
      return {
        x: Math.random() * (aw + 40),
        y: Math.random() * ah,
        len: near ? 5 + Math.random() * 3 : 2 + Math.random() * 3,
        speed: near ? 260 + Math.random() * 80 : 150 + Math.random() * 60,
        near,
        end: iy + SKY_END + Math.random() * (ah - iy - SKY_END),
      }
    })
  }

  const resize = (w: number, h: number) => {
    ps = Math.max(2, w / IMG)
    aw = Math.max(16, Math.ceil(w / ps))
    ah = Math.max(16, Math.ceil(h / ps))
    canvas.width = aw
    canvas.height = ah
    base.width = aw
    base.height = ah
    ix = Math.floor((aw - IMG) / 2)
    iy = ah - IMG
    // the sky above the picture: darker upward, in bands dithered one
    // into the next, as VGA skies were, down into the picture's top row
    if (iy > 0) {
      const top = [6, 8, 24]
      const stops = [0, 0.5, 1].map((f) =>
        hex(
          ...([0, 1, 2].map((k) =>
            Math.round(top[k] + (topColour[k] - top[k]) * f),
          ) as [number, number, number]),
        ),
      )
      for (let y = 0; y < iy; y++) {
        const t = (y / iy) * (stops.length - 1)
        const i = Math.min(stops.length - 2, Math.floor(t))
        const f = t - i
        for (let x = 0; x < aw; x++) {
          const threshold = (BAYER[y % 4][x % 4] + 0.5) / 16
          bg.fillStyle = f > threshold ? stops[i + 1] : stops[i]
          bg.fillRect(x, y, 1, 1)
        }
      }
    }
    bg.imageSmoothingEnabled = false
    bg.drawImage(img, ix, iy)
    makeDrops()
    if (still) paintStill()
  }

  const px = (x: number, y: number, c: string) => {
    g.fillStyle = c
    g.fillRect(Math.round(x), Math.round(y), 1, 1)
  }

  const rain = (dt: number) => {
    for (const d of drops) {
      if (dt) {
        d.y += d.speed * dt
        d.x -= d.speed * dt * 0.18
      }
      if (d.y > d.end) {
        if (d.end > iy + STREET && Math.random() < 0.5)
          splashes.push({ x: d.x, y: d.end, t0: performance.now(), big: false })
        d.y = -d.len - Math.random() * 30
        d.x = Math.random() * (aw + 40)
        d.end = iy + SKY_END + Math.random() * (ah - iy - SKY_END)
      }
      g.fillStyle = d.near
        ? 'rgba(200, 214, 255, 0.55)'
        : 'rgba(150, 168, 225, 0.38)'
      for (let k = 0; k < d.len; k++)
        g.fillRect(Math.round(d.x + k * 0.18), Math.round(d.y - k), 1, 1)
    }
  }

  const paintStill = () => {
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.drawImage(base, 0, 0)
    rain(0)
  }

  const flicker = (now: number) => {
    g.globalCompositeOperation = 'lighter'
    for (const b of blobs) {
      const t = now / 1000 + b.seed
      const v = b.water
        ? 0.14 + 0.16 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1)
        : 0.08 + 0.07 * Math.sin(t * 1.7) + 0.05 * Math.sin(t * 5.3 + b.seed)
      if (v <= 0.02) continue
      g.globalAlpha = Math.min(0.4, v)
      g.drawImage(lights, b.x, b.y, b.w, b.h, ix + b.x, iy + b.y, b.w, b.h)
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
  }

  const glowAt = (glows: Array<Glow>) => {
    g.globalCompositeOperation = 'lighter'
    for (const l of glows) {
      const x = l.x * aw
      const y = l.y * ah
      const r = 26
      const grad = g.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, `rgba(255, 140, 60, ${0.32 * l.strength})`)
      grad.addColorStop(1, 'rgba(255, 120, 40, 0)')
      g.fillStyle = grad
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
    g.globalCompositeOperation = 'source-over'
  }

  const drawSplashes = (now: number) => {
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i]
      const age = (now - s.t0) / (s.big ? 700 : 160)
      if (age >= 1) {
        splashes.splice(i, 1)
        continue
      }
      if (!s.big) {
        const c = 'rgba(210, 222, 255, 0.7)'
        px(s.x - 1, s.y - 1, c)
        px(s.x + 1, s.y - 1, c)
        if (age < 0.5) px(s.x, s.y - 2, c)
        continue
      }
      // rings spreading on the wet stone, and drops thrown up
      const rx = 3 + age * 16
      const ry = rx * 0.3
      g.globalAlpha = 1 - age
      for (let a = 0; a < Math.PI * 2; a += 0.22)
        px(s.x + Math.cos(a) * rx, s.y + Math.sin(a) * ry, '#cfe0ff')
      if (age < 0.6)
        for (let k = 0; k < 6; k++) {
          const vx = (k - 2.5) * 5
          const tt = age * 1.3
          px(s.x + vx * tt, s.y - 20 * tt + 30 * tt * tt, '#e8f0ff')
        }
      g.globalAlpha = 1
    }
  }

  const lightning = (now: number) => {
    if (!bolt && now > nextBolt) {
      const path: Array<[number, number]> = []
      let x = aw * (0.38 + Math.random() * 0.4)
      for (let y = 0; y < iy + SKY_END - 10; y += 2) {
        x += (Math.random() - 0.5) * 4
        path.push([x, y])
      }
      bolt = { t0: now, path }
      nextBolt = now + 9000 + Math.random() * 12000
    }
    if (!bolt) return
    const t = now - bolt.t0
    // two flashes, the second weaker, then gone
    const a =
      t < 50
        ? t / 50
        : t < 140
          ? 1 - ((t - 50) / 90) * 0.85
          : t < 200
            ? 0.15 + ((t - 140) / 60) * 0.6
            : Math.max(0, 0.75 * (1 - (t - 200) / 450))
    if (t > 650) {
      bolt = null
      return
    }
    g.globalCompositeOperation = 'lighter'
    // the sky lights up, less and less down to the roofs
    const sky = g.createLinearGradient(0, 0, 0, iy + SKY_END)
    sky.addColorStop(0, `rgba(184, 198, 255, ${0.24 * a})`)
    sky.addColorStop(0.7, `rgba(184, 198, 255, ${0.12 * a})`)
    sky.addColorStop(1, 'rgba(184, 198, 255, 0)')
    g.fillStyle = sky
    g.fillRect(0, 0, aw, iy + SKY_END)
    g.globalAlpha = a * 0.14
    g.drawImage(base, 0, 0)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    if (a > 0.3)
      for (const [bx, by] of bolt.path) {
        px(bx, by, '#f4f6ff')
        px(bx + 1, by, 'rgba(160, 180, 255, 0.6)')
        px(bx, by + 1, '#f4f6ff')
      }
  }

  let last = performance.now()
  const draw = (now: number, glows: Array<Glow>) => {
    if (still) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.drawImage(base, 0, 0)
    flicker(now)
    glowAt(glows)
    lightning(now)
    rain(dt)
    drawSplashes(now)
  }

  const splash = (x: number, y: number) => {
    if (still) return
    splashes.push({ x: x * aw, y: y * ah, t0: performance.now(), big: true })
  }

  return { resize, draw, splash }
}
