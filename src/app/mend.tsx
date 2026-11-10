import { Component } from 'react'
import { Btn } from './ui'
import type { ErrorInfo, ReactNode } from 'react'

// What the page shows when something in it breaks, instead of nothing.
// Without this, an error anywhere unmounted the whole game and left only the
// page's background.
//
// The usual cause is a new version: the installed app stays open for days,
// and a game's code is loaded when it is first opened (registry.tsx), from a
// file named by its hash. After a deploy that file is gone, and the import
// fails. Then the page reloads itself, once, to get the new version.
//
// The other cause is no network: a game not kept yet (public/sw.js keeps
// them all, once it has had the time) cannot be fetched. Reloading then
// would swap the page for the browser's own error page, so it says so
// instead, and loads again when the network is back.

const KEY = 'tian:reloaded'

const offline = () =>
  typeof navigator !== 'undefined' && navigator.onLine === false

// A failed import, as each browser words it (Chrome, Safari, Firefox), or a
// file that came back as the 404 page
const STALE =
  /dynamically imported module|Importing a module script failed|module script|MIME type|ChunkLoadError|Loading chunk/i

export const isStale = (e: unknown) =>
  e instanceof Error && STALE.test(`${e.name} ${e.message}`)

// Reloads unless the page has just done so, so a file that is really
// missing cannot loop. True if it is reloading.
export function reloadOnce(): boolean {
  if (offline()) return false
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last < 30_000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    // no storage: no way to know it has tried, so it does not
    return false
  }
  window.location.reload()
  return true
}

// Vite's own warning that a file it preloads did not come
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadOnce()) e.preventDefault()
  })
}

type Props = {
  children: ReactNode
  // What to show in its place; the whole screen when not given
  fallback?: (reload: () => void) => ReactNode
}

export class Mend extends Component<Props, { error: unknown }> {
  state: { error: unknown } = { error: null }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isStale(error) && reloadOnce()) return
    // without a network: again by itself once it is back
    if (isStale(error) && offline())
      window.addEventListener('online', this.back, { once: true })
    console.error(error, info.componentStack)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.back)
  }

  back = () => window.location.reload()

  render() {
    if (!this.state.error) return this.props.children
    const reload = () => {
      try {
        sessionStorage.removeItem(KEY)
      } catch {
        // reloads all the same
      }
      window.location.reload()
    }
    if (isStale(this.state.error) && offline()) return <Offline />
    if (this.props.fallback) return this.props.fallback(reload)
    return <Broken reload={reload} />
  }
}

export function Broken({ reload }: { reload: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="zh-display text-5xl text-[var(--red)]">哎呀</div>
      <p className="text-[var(--ink-2)]">
        Something went wrong. Loading the page again usually mends it.
      </p>
      <div className="flex gap-2">
        <Btn onClick={reload}>Load again</Btn>
        {window.location.hash && (
          <Btn
            kind="ghost"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            Home
          </Btn>
        )}
      </div>
    </div>
  )
}

// A part of the page that could not be fetched without a network
function Offline() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="zh-display text-5xl text-[var(--red)]">没有网络</div>
      <p className="text-[var(--ink-2)]">
        No network, and this part of Tian is not on this device yet. It opens by
        itself when the network is back.
      </p>
      <Btn
        kind="ghost"
        onClick={() => {
          window.location.hash = ''
        }}
      >
        Home
      </Btn>
    </div>
  )
}
