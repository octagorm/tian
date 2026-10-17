import { useEffect, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { current } from '../lib/today'
import { Ring } from './Ring'
import { pageOf } from './steps'
import { useToday } from './useToday'
import type { ArcState } from './Ring'

// A small way back to Today, while one of its steps is played on its own
// page (a part of the course, the trip, or a game): it shows on that page
// only, and turns gold once the step counts as played. Mount it once,
// beside the SealToaster.

const hashNow = () =>
  typeof window === 'undefined' ? '' : window.location.hash.slice(1)

export function TodayDock() {
  const [hash, setHash] = useState(hashNow)
  useEffect(() => {
    const change = () => setHash(hashNow())
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])

  const path = useToday()
  if (!path) return null
  const now = Date.now()
  // The step opened from Today for this page: still to play, or else
  // played in the last half hour (the course has a step for each part)
  const opened = path.steps.map(
    (s) => s.pts !== undefined && !s.skip && pageOf(s) === hash,
  )
  const toPlay = path.steps.findIndex((s, i) => opened[i] && !s.done)
  const lately = path.steps.flatMap((s, i) =>
    opened[i] && s.done && now - s.done < 30 * 60_000 ? [i] : [],
  )
  const at = toPlay >= 0 ? toPlay : (lately.at(-1) ?? -1)
  if (at < 0) return null
  const played = !!path.steps[at].done
  const next = current(path)
  const arcs: Array<ArcState> = path.steps.map((s, i) =>
    s.done ? 'done' : i === next ? 'now' : 'todo',
  )
  return (
    <a
      href="#today"
      className={`zh-rise fixed bottom-3 left-3 z-40 flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-bold shadow-lg transition hover:-translate-y-0.5 ${
        played
          ? 'bg-[#d9a441] text-[#221c18]'
          : 'bg-[#fffaf1]/95 text-[#221c18] ring-1 ring-[#efe4cf]'
      }`}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Ring steps={arcs} size={34} width={14}>
        {played ? (
          <Check size={14} />
        ) : (
          <span className="zh text-sm leading-none">今</span>
        )}
      </Ring>
      {played ? (
        'Played – back to Today'
      ) : (
        <>
          <ArrowLeft size={15} /> Today · {at + 1} of {path.steps.length}
        </>
      )}
    </a>
  )
}
