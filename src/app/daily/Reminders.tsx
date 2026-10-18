import { useEffect, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/bank'
import {
  endpoint,
  parts,
  subscribe,
  support,
  worker,
  zone,
} from '../lib/reminder'

// The daily reminder kept up to date on the server (convex/reminders.ts),
// whatever page is open: its time and time zone, the account it belongs
// to, and the day Today's session was done, so that no reminder comes
// that day. Also opens Today when a reminder is tapped while the page is
// open (public/sw.js). Settings turns the reminder on and off.

export function Reminders() {
  const { bank, settings, setSettings, account } = useStore()
  const on = settings.remind && support() === 'yes'
  const key = useQuery(api.reminders.key, on ? {} : 'skip')
  const set = useMutation(api.reminders.set)
  const remove = useMutation(api.reminders.remove)
  const done = useMutation(api.reminders.done)
  const today = dayKey(Date.now())
  const doneToday = !!bank.daily[today]
  const doneRef = useRef(doneToday)
  useEffect(() => {
    doneRef.current = doneToday
  })
  const who = account.me?.email ?? null

  useEffect(() => {
    if (support() !== 'yes') return
    void worker().catch(() => {})
    const open = (e: MessageEvent<{ open?: string } | null>) => {
      if (e.data?.open) window.location.hash = e.data.open
    }
    navigator.serviceWorker.addEventListener('message', open)
    return () => navigator.serviceWorker.removeEventListener('message', open)
  }, [])

  // On each visit, when the time changes and on signing in or out; a moment
  // later, so that a time being typed is sent once
  useEffect(() => {
    if (!on || !key) return
    if (Notification.permission !== 'granted') {
      // Taken back in the phone's settings: off here too
      setSettings({ remind: false })
      void endpoint()
        .then((e) => e && remove({ endpoint: e }))
        .catch(() => {})
      return
    }
    const t = setTimeout(() => {
      void subscribe(key)
        .then((sub) =>
          set({
            ...parts(sub),
            time: settings.remindAt,
            zone: zone(),
            done: doneRef.current ? today : undefined,
          }),
        )
        .catch(() => {})
    }, 1000)
    return () => clearTimeout(t)
  }, [on, key, settings.remindAt, who, today, set, remove, setSettings])

  // The day done, from this browser, and for whoever is signed in from any
  // of theirs
  const told = useRef<string | null>(null)
  useEffect(() => {
    if (!doneToday || told.current === today || (!on && !who)) return
    told.current = today
    void (on ? endpoint() : Promise.resolve(null))
      .then((e) => done({ day: today, endpoint: e ?? undefined }))
      .catch(() => {
        told.current = null
      })
  }, [doneToday, today, on, who, done])

  return null
}
