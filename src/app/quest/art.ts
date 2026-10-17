// The quest's pictures (public/art/quest/), loaded once and kept
// as canvases, with what the stage derives from them: a white silhouette
// for flashes, tinted copies for the light of each place, and a sample of
// opaque pixels for a demon to crumble into.

export const ART = '/art/quest/'

export interface Pic {
  c: HTMLCanvasElement
  w: number
  h: number
  white: HTMLCanvasElement
  // Every other opaque pixel, with its colour, for dissolving
  dots: Array<[number, number, string]>
}

const pics = new Map<string, Promise<Pic | null>>()
const ready = new Map<string, Pic | null>()

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

export const ctx2d = (c: HTMLCanvasElement) => {
  const g = c.getContext('2d')
  if (!g) throw new Error('no 2d canvas')
  g.imageSmoothingEnabled = false
  return g
}

function toPic(img: HTMLImageElement): Pic {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const c = canvas(w, h)
  const g = ctx2d(c)
  g.drawImage(img, 0, 0)
  const white = canvas(w, h)
  const gw = ctx2d(white)
  gw.drawImage(img, 0, 0)
  gw.globalCompositeOperation = 'source-in'
  gw.fillStyle = '#fff'
  gw.fillRect(0, 0, w, h)
  const dots: Pic['dots'] = []
  try {
    const d = g.getImageData(0, 0, w, h).data
    for (let y = 0; y < h; y += 2)
      for (let x = (y / 2) % 2; x < w; x += 2) {
        const i = (y * w + x) * 4
        if (d[i + 3] > 128)
          dots.push([x, y, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`])
      }
  } catch {
    // a tainted canvas: no dissolve, only a fade
  }
  return { c, w, h, white, dots }
}

// A picture by name, loading it if need be
export function loadPic(name: string): Promise<Pic | null> {
  let p = pics.get(name)
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const pic = toPic(img)
        ready.set(name, pic)
        resolve(pic)
      }
      img.onerror = () => {
        ready.set(name, null)
        resolve(null)
      }
      img.src = `${ART}${name}.png`
    })
    pics.set(name, p)
  }
  return p
}

// A picture if it has loaded already
export const pic = (name: string) => ready.get(name) ?? null

// A copy of a picture washed with a colour, for the light of a place
const tints = new WeakMap<Pic, Map<string, HTMLCanvasElement>>()
export function tinted(p: Pic, color: string, a: number): HTMLCanvasElement {
  let m = tints.get(p)
  if (!m) {
    m = new Map()
    tints.set(p, m)
  }
  const key = `${color}|${a.toFixed(2)}`
  const hit = m.get(key)
  if (hit) return hit
  const c = canvas(p.w, p.h)
  const g = ctx2d(c)
  g.drawImage(p.c, 0, 0)
  g.globalCompositeOperation = 'source-atop'
  g.globalAlpha = a
  g.fillStyle = color
  g.fillRect(0, 0, p.w, p.h)
  m.set(key, c)
  return c
}
