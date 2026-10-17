import { useEffect, useRef, useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from 'convex/react'
import { Cloud, CloudOff, LogIn, LogOut } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { useStore } from './lib/store'
import { Fret } from './ornament/Borders'

// A sign-in under way. Safari lost the cookies Convex set as a sign-in
// began whenever Google showed a page in between (see convex/auth.ts), and
// the sign-in landed signed out; a second try, Google remembering, went
// through. Should a landing still fail in the installed app, the page
// marks it failed before the app starts (src/pages/index.astro), and the
// app tries once more by itself.
const PENDING = 'tian:signin'
const pending = (): { at: number; tries: number; failed?: boolean } | null => {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING) ?? 'null') as {
      at: number
      tries: number
      failed?: boolean
    } | null
    return p && Date.now() - p.at < 5 * 60_000 ? p : null
  } catch {
    return null
  }
}
const installed = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true

// Top right of the home screen: signing in with Google. The word bank
// follows a member's account; others can ask for access (the admin
// answers in /admin) and keep their progress in the browser meanwhile.
// `glass` is for over the scene.
export function Account({ glass = false }: { glass?: boolean }) {
  const { account } = useStore()
  const { signIn, signOut } = useAuthActions()
  const request = useMutation(api.access.request)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const box = useRef<HTMLDivElement>(null)
  // Closed by a click elsewhere or Escape
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  const act = async (f: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await f()
    } catch {
      setError('That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }
  const { me, loading } = account
  const google = (tries: number) => {
    try {
      localStorage.setItem(PENDING, JSON.stringify({ at: Date.now(), tries }))
    } catch {
      // without storage there is no second try
    }
    void act(() => signIn('google', { redirectTo: '/' }))
  }
  useEffect(() => {
    if (!me) return
    try {
      localStorage.removeItem(PENDING)
    } catch {
      // nothing to clear
    }
  }, [me])
  // Sent back by the home page after a sign-in that failed: once more
  useEffect(() => {
    if (loading || me || !installed()) return
    const again = () => {
      const p = pending()
      if (document.hidden || !p?.failed || p.tries > 0) return
      if (new URLSearchParams(location.search).has('code')) return
      google(p.tries + 1)
    }
    again()
    document.addEventListener('visibilitychange', again)
    return () => document.removeEventListener('visibilitychange', again)
  }, [loading, me])
  const chip = `flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-bold transition disabled:opacity-50 ${
    glass
      ? 'zh-glass'
      : 'bg-[var(--card)] text-[var(--ink)] shadow-sm hover:bg-white'
  }`
  if (loading)
    return (
      <div className={`${chip} w-10 justify-center opacity-70`} aria-hidden>
        …
      </div>
    )
  if (!me)
    return (
      <button
        type="button"
        disabled={busy}
        title="Sign in to keep your progress on your account"
        onClick={() => google(0)}
        className={`${chip} max-sm:w-10 max-sm:justify-center max-sm:px-0`}
      >
        <LogIn size={16} />
        <span className="max-sm:sr-only">Sign in</span>
      </button>
    )
  const name = me.name ?? me.email
  const status = me.member
    ? account.synced
      ? 'Your word bank is kept on your account, and follows you to any device you sign in on.'
      : 'Fetching your word bank…'
    : me.request === 'pending'
      ? 'You have asked for access. Until then, progress stays in this browser.'
      : me.request === 'denied'
        ? 'This account was not given access. Progress stays in this browser.'
        : 'This account has no access yet. Ask for it, or use an invitation link.'
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={`${chip} pl-1`}
      >
        <span className="zh-seal zh-head flex h-8 w-8 items-center justify-center rounded-full text-base shadow-inner">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-32 truncate max-sm:hidden">{name}</span>
        {!me.member && (
          <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Account"
          className="zh-card zh-rise absolute top-full right-0 z-30 mt-2 w-[min(19rem,calc(100vw-2rem))] overflow-hidden text-sm text-[var(--ink)]"
        >
          <Fret className="h-[6px] text-[var(--red)] opacity-60" />
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="zh-seal zh-head flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl">
                {name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold">{name}</span>
                <span className="block truncate text-xs text-[var(--ink-2)]">
                  {me.email}
                </span>
              </span>
            </div>
            <p className="flex gap-2 leading-snug text-[var(--ink-2)]">
              {me.member ? (
                <Cloud
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--jade)]"
                />
              ) : (
                <CloudOff
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--gold-2)]"
                />
              )}
              {status}
            </p>
            {!me.member && !me.request && (
              <>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  placeholder="Who are you? (optional)"
                  className="rounded-xl border-2 border-[var(--paper-2)] bg-white px-3 py-2"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(() => request({ message }))}
                  className="zh-btn self-start rounded-xl bg-[var(--gold)] px-3 py-1.5 font-bold text-[var(--ink)] [--edge:#a87a22] disabled:opacity-50"
                >
                  Ask for access
                </button>
              </>
            )}
            {error && <p className="text-[var(--red)]">{error}</p>}
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => signOut())}
              className="inline-flex items-center gap-1.5 self-start rounded-xl px-2 py-1.5 font-bold text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
