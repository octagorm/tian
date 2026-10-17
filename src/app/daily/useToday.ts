import { useEffect, useMemo } from 'react'
import { useStore } from '../lib/store'
import { finished, settle, todays } from '../lib/today'
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
