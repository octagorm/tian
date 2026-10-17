import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { sceneArt } from './scenes'
import { Stage } from './stage'
import type { Actor } from './stage'
import type { ReactNode, RefObject } from 'react'

// A scene on the page: the stage's canvas, cut to a narrower view on a
// phone (centred on where the people stand), with whatever is laid over
// it placed in the picture's own coordinates.

export interface View {
  // Where a point of the picture is on the view, as CSS percentages
  at: (x: number, y: number) => { left: number; top: number }
  // The part of the picture shown: its left edge and width
  x0: number
  w: number
  h: number
  // CSS pixels per picture pixel
  scale: number
  narrow: boolean
}

export function StageView({
  id,
  actors,
  talking = null,
  ended = false,
  stageRef,
  className = '',
  label,
  onClick,
  children,
}: {
  id: string
  actors: Array<Actor>
  talking?: string | null
  ended?: boolean
  stageRef?: RefObject<Stage | null>
  className?: string
  // what the picture shows, for screen readers
  label?: string
  onClick?: () => void
  children?: (view: View) => ReactNode
}) {
  const art = sceneArt(id)
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    setWidth(el.clientWidth)
    const o = new ResizeObserver(() => setWidth(el.clientWidth))
    o.observe(el)
    return () => o.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    if (!c || !art) return
    const s = new Stage(c, art, true)
    stage.current = s
    if (stageRef) stageRef.current = s
    return () => {
      s.destroy()
      stage.current = null
      if (stageRef) stageRef.current = null
    }
  }, [id])

  useEffect(() => stage.current?.setActors(actors), [actors, id])
  useEffect(() => stage.current?.setTalking(talking), [talking, id])
  useEffect(() => stage.current?.end(ended), [ended, id])

  if (!art) return null
  // a phone shows four thirds of the height across, around the focus
  const narrow = width > 0 && width < 560
  const vw = narrow ? Math.round((art.h * 4) / 3) : art.w
  const focus = art.focus ?? art.w / 2
  const x0 = Math.max(0, Math.min(art.w - vw, Math.round(focus - vw / 2)))
  const view: View = {
    at: (x, y) => ({ left: ((x - x0) / vw) * 100, top: (y / art.h) * 100 }),
    x0,
    w: vw,
    h: art.h,
    scale: width / vw,
    narrow,
  }
  return (
    <div
      ref={box}
      className={`relative overflow-hidden select-none ${className}`}
      style={{
        aspectRatio: `${vw} / ${art.h}`,
        background: art.night ? '#141026' : '#2a2430',
      }}
      onClick={onClick}
    >
      <canvas
        ref={canvas}
        width={art.w}
        height={art.h}
        role="img"
        aria-label={label}
        className="absolute top-0 block h-full"
        style={{
          imageRendering: 'pixelated',
          width: `${(art.w / vw) * 100}%`,
          left: `${(-x0 / vw) * 100}%`,
        }}
      />
      {width > 0 && children?.(view)}
    </div>
  )
}
