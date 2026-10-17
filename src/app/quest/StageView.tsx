import { useEffect, useRef } from 'react'
import { STAGE_H, Stage } from './stage'
import type { Cast } from './stage'

// The stage on the page: a canvas as wide as its box, with 320 pixels of
// art across (240 on a narrow screen, so the fighters stay large), scaled
// up crisp. It is made once per fight; the fight gets it through onReady.
export function StageView({
  cast,
  onReady,
  label,
}: {
  cast: Cast
  onReady: (s: Stage | null) => void
  label: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const b = box.current
    if (!c || !b) return
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const s = new Stage(c, reduced)
    const fit = () => {
      const W = b.clientWidth < 520 ? 240 : 320
      if (c.width === W && c.height === STAGE_H) return
      c.width = W
      c.height = STAGE_H
      c.style.aspectRatio = `${W} / ${STAGE_H}`
      s.resize(W)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(b)
    let onScreen = true
    const show = () => s.setVisible(onScreen && !document.hidden)
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
      show()
    })
    io.observe(c)
    document.addEventListener('visibilitychange', show)
    let live = true
    void s.setCast(cast).then(() => {
      if (!live) return
      s.start()
      onReady(s)
    })
    return () => {
      live = false
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', show)
      s.destroy()
      onReady(null)
    }
    // one stage for the fight's life (the fight is keyed by chapter)
  }, [])
  return (
    <div ref={box} className="relative bg-[#120c14]">
      <canvas
        ref={ref}
        width={320}
        height={STAGE_H}
        className="block w-full"
        style={{ imageRendering: 'pixelated', aspectRatio: `320 / ${STAGE_H}` }}
        role="img"
        aria-label={label}
      />
    </div>
  )
}
