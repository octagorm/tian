import { useEffect, useRef } from 'react'
import { GH, GW, drawBack, drawFront, drawSky } from './draw'
import { Life } from './life'
import type { Scene } from './draw'

// The garden on a canvas: its still layers drawn once for the scene, and
// what moves drawn over them, a frame at a time while it is on screen.
// The page is never re-rendered for it. With reduced motion it is one
// still frame.

const layer = (draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas')
  c.width = GW
  c.height = GH
  const g = c.getContext('2d')
  if (g) draw(g)
  return c
}

export function GardenCanvas({
  scene,
  fps = 30,
  className = '',
  onPick,
  label = 'The garden',
}: {
  scene: Scene
  fps?: number
  className?: string
  // A tap, in the picture's own pixels
  onPick?: (x: number, y: number) => void
  label?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(scene)

  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return
    const sc = JSON.parse(key) as Scene
    const sky = layer((x) => drawSky(x, sc))
    const back = layer((x) => drawBack(x, sc))
    const front = layer((x) => drawFront(x, sc))
    const life = new Life(sc)
    const frame = (t: number) => {
      g.clearRect(0, 0, GW, GH)
      g.drawImage(sky, 0, 0)
      life.sky(g, t)
      g.drawImage(back, 0, 0)
      life.water(g, t)
      life.willow(g, t)
      g.drawImage(front, 0, 0)
      life.top(g, t)
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // a moment into the day, so a still frame is not every koi at rest
    const t0 = performance.now() / 1000 - 40
    frame(still ? 40 : performance.now() / 1000 - t0)
    if (still) return

    let raf = 0
    let last = 0
    let seen = true
    const step = (ms: number) => {
      raf = 0
      if (!seen || document.hidden) return
      if (ms - last >= 1000 / fps - 2) {
        last = ms
        frame(ms / 1000 - t0)
      }
      raf = requestAnimationFrame(step)
    }
    const go = () => {
      if (!raf && seen && !document.hidden) raf = requestAnimationFrame(step)
    }
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting
      go()
    })
    io.observe(canvas)
    document.addEventListener('visibilitychange', go)
    go()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', go)
    }
  }, [key, fps])

  return (
    <canvas
      ref={ref}
      width={GW}
      height={GH}
      role="img"
      aria-label={label}
      className={`block w-full ${onPick ? 'cursor-pointer' : ''} ${className}`}
      style={{ imageRendering: 'pixelated', aspectRatio: `${GW} / ${GH}` }}
      onClick={
        onPick
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect()
              onPick(
                ((e.clientX - r.left) / r.width) * GW,
                ((e.clientY - r.top) / r.height) * GH,
              )
            }
          : undefined
      }
    />
  )
}
