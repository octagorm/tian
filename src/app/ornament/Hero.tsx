import { useEffect, useRef } from 'react'
import { runScene } from './scene'
import type { SceneOptions } from './scene'

// The living scene (scene.ts), filling its box: give the box a size,
// `relative` and `overflow-hidden`. The picture is cropped to fit,
// keeping (focusX, focusY) in view; `clear` gives the boxes of anything
// laid over it, which the moon keeps out of.
export function LivingScene({
  className = '',
  focusX,
  focusY,
  clock,
  clear,
}: SceneOptions & { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const latest = useRef(clear)
  useEffect(() => {
    latest.current = clear
  })
  useEffect(() => {
    const c = ref.current
    if (!c) return
    return runScene(c, {
      focusX,
      focusY,
      clock,
      clear: () => latest.current?.() ?? [],
    })
  }, [focusX, focusY, clock])
  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`absolute ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

// For trying the scene at another time: /?time=21:30 or
// ?date=2027-02-06&time=20:00. Without either, the real clock.
export function clockFromUrl(): (() => Date) | undefined {
  const q = new URLSearchParams(window.location.search)
  const time = q.get('time')
  const date = q.get('date')
  if (!time && !date) return undefined
  return () => {
    const d = date ? new Date(`${date}T12:00:00`) : new Date()
    if (Number.isNaN(d.getTime())) return new Date()
    if (time) {
      const [h, m] = time.split(':').map(Number)
      d.setHours(h || 0, m || 0, 0, 0)
    }
    return d
  }
}
