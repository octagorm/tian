import { useEffect, useMemo } from 'react'
import { useStore } from '../lib/store'
import { finished, pageOf, settle, todays } from '../lib/today'
import { dayKey } from '../lib/bank'
import { want } from '../lib/course'
import type { Path } from '../lib/bank'

// Today's plan as it stands, for whatever shows it (the page, the card,
// the dock): steps played on their own pages are marked done, and a
// finished day is counted, with five points for it, once.

export const DAY_BONUS = 5

export function useToday(): Path | null {
  const { bank, setPath, finishDay } = useStore()
  const now = Date.now()
  const saved = todays(bank, now)
  const path = useMemo(
    () => (saved ? settle(saved, bank, now) : null),
    [saved, bank],
  )
  useEffect(() => {
    if (path && saved && path !== saved) setPath(() => path)
  }, [path, saved, setPath])
  const over = !!path && finished(path)
  useEffect(() => {
    if (path && over && !bank.daily[path.d]) finishDay(path.d, DAY_BONUS)
  }, [over, path, bank.daily, finishDay])
  return path
}

// Opens a step played on its own page (a part of the course, a scene of
// the trip, a game), noting the day's points, by which a scene or a game
// is found played on the way back. A plan only shown so far is kept as
// today's.
export function usePlay() {
  const { bank, setPath } = useStore()
  return (p: Path, i: number) => {
    const step = p.steps[i]
    const page = pageOf(step)
    if (!page) return
    const pts = bank.days[dayKey(Date.now())] ?? 0
    setPath((saved) => {
      const base = saved && saved.d === p.d ? saved : p
      return {
        ...base,
        steps: base.steps.map((s, j) => (j === i ? { ...s, pts } : s)),
      }
    })
    if (step.k === 'course') want(step.arg ?? null)
    window.location.hash = page
  }
}
