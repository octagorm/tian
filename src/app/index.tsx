import { Suspense, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { BankProvider } from './lib/store'
import { Frame, PeekProvider } from './ui'
import Home from './home'
import { GAMES } from './registry'
import { SealToaster, TodayDock } from './daily'
import type { GameId } from './registry'
import { WithConvexAuth } from '~/lib/convex'
import './tian.css'

// Tian: games for learning Mandarin, around one word bank. The game is
// kept in the URL's hash (/#tones); no hash is the home screen
// (home.tsx). Every game reads and writes the same bank (lib/bank.ts,
// lib/store.tsx), so a word practised in one is known in all. The games are
// listed in registry.tsx.

const fromHash = (): GameId | null => {
  const h = window.location.hash.slice(1)
  return GAMES.find((g) => g.id === h)?.id ?? null
}

export default function Chinese() {
  return (
    <WithConvexAuth>
      <BankProvider>
        <PeekProvider>
          <Router />
          {/* A seal earned anywhere is stamped here, and a step of Today
              played on its own page has a way back */}
          <SealToaster />
          <TodayDock />
        </PeekProvider>
      </BankProvider>
    </WithConvexAuth>
  )
}

// The element on the home screen that names a game, which the page's
// title grows out of as the game opens (home.tsx marks them): the one in
// the link just followed, else the first
let followed: HTMLElement | null = null
const tileTitle = (id: string | null) => {
  if (!id) return null
  if (followed?.dataset.zhTitle === id && followed.isConnected) return followed
  return document.querySelector<HTMLElement>(
    `[data-zh-title="${CSS.escape(id)}"]`,
  )
}
const onFollow = (e: MouseEvent) => {
  const a = (e.target as Element | null)?.closest('a[href^="#"]')
  followed = a?.querySelector<HTMLElement>('[data-zh-title]') ?? null
}

function Router() {
  const [game, setGame] = useState<GameId | null>(fromHash)
  const shown = useRef(game)
  // Where the home screen was scrolled to, to come back to it there
  const homeScroll = useRef(0)
  useEffect(() => {
    const change = () => {
      const next = fromHash()
      const prev = shown.current
      if (next === prev) return
      if (!prev) homeScroll.current = window.scrollY
      shown.current = next
      const update = () => {
        flushSync(() => setGame(next))
        window.scrollTo(0, next ? 0 : homeScroll.current)
      }
      // Where the browser can, the change is a view transition
      const still = window.matchMedia('(prefers-reduced-motion: reduce)')
      if (!('startViewTransition' in document) || still.matches) {
        update()
        return
      }
      const from = tileTitle(next)
      if (from) from.style.viewTransitionName = 'zh-title'
      let to: HTMLElement | null = null
      const t = document.startViewTransition(() => {
        if (from) from.style.viewTransitionName = ''
        update()
        to = next ? null : tileTitle(prev)
        if (to) to.style.viewTransitionName = 'zh-title'
      })
      void t.finished.finally(() => {
        if (to) to.style.viewTransitionName = ''
      })
    }
    window.addEventListener('hashchange', change)
    document.addEventListener('click', onFollow, true)
    return () => {
      window.removeEventListener('hashchange', change)
      document.removeEventListener('click', onFollow, true)
    }
  }, [])
  const found = GAMES.find((g) => g.id === game)
  return (
    <div className="zh-page">
      {found ? (
        <Suspense
          fallback={
            // The game's frame while its code comes, so its name is there
            // at once
            <Frame title={found.title} zh={found.zh}>
              <div className="p-8 text-center text-[var(--ink-2)]">…</div>
            </Frame>
          }
        >
          <found.Page key={found.id} />
        </Suspense>
      ) : (
        <Home />
      )}
    </div>
  )
}
