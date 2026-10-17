import { useEffect, useRef, useState } from 'react'
import { sceneArt } from './scenes'
import { Stage } from './stage'
import type { Actor } from './stage'

// A scene's pixel-art backdrop: the trip's painted pictures (320 × 180)
// and the quest's drawn ones (192 × 96), scaled up without smoothing. It
// is a still picture unless `animate` is set; then what moves in it moves
// (only while it is on screen). It loads when it comes near the screen.
export function Backdrop({
  id,
  className = '',
  crop,
  children,
  animate = false,
  actors,
}: {
  id: string
  className?: string
  // Show a band across the middle of the picture, this many CSS pixels high
  crop?: number
  children?: React.ReactNode
  animate?: boolean
  // People standing in it
  actors?: Array<Actor>
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const [near, setNear] = useState(false)
  const art = sceneArt(id)

  // Start only when it comes near the screen, so a long list of scenes
  // does not load every picture at once
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const o = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setNear(true)
          o.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    o.observe(c)
    return () => o.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    if (!near || !c || !art) return
    const s = new Stage(c, art, animate)
    stage.current = s
    return () => {
      s.destroy()
      stage.current = null
    }
  }, [near, id, animate])

  useEffect(() => {
    stage.current?.setActors(actors ?? [])
  }, [actors, near, id])

  if (!art) return null
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={crop ? { height: crop } : undefined}
    >
      <canvas
        ref={canvas}
        width={art.w}
        height={art.h}
        aria-hidden="true"
        className={
          crop
            ? 'absolute top-1/2 left-0 block w-full -translate-y-1/2'
            : 'block w-full'
        }
        style={{
          imageRendering: 'pixelated',
          aspectRatio: `${art.w} / ${art.h}`,
          background: art.night ? '#141026' : '#2a2430',
        }}
      />
      {children}
    </div>
  )
}
