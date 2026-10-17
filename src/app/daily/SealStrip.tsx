import { useEffect, useState } from 'react'
import { SEALS } from '../data/seals'
import { useStore } from '../lib/store'
import { Seal } from './Seal'
import type { SealDef } from '../data/seals'
import type { Progress } from '../lib/achievements'

// The seals for the home screen: how many, the latest stamped, and the
// one nearest to being earned. A link to the album.

export function SealStrip({ className = '' }: { className?: string }) {
  const { bank } = useStore()
  const earned = SEALS.filter((s) => bank.seals[s.id]).sort(
    (a, b) => (bank.seals[b.id] ?? 0) - (bank.seals[a.id] ?? 0),
  )
  const [next, setNext] = useState<{ seal: SealDef; p: Progress } | null>(null)
  // the checks load apart from the home screen's code
  useEffect(() => {
    let live = true
    void import('../lib/achievements').then(({ progress }) => {
      if (!live) return
      const now = Date.now()
      let best: { seal: SealDef; p: Progress } | null = null
      for (const seal of SEALS) {
        if (bank.seals[seal.id]) continue
        const p = progress(bank, seal.id, now)
        if (p.need < 2 || p.have === 0) continue
        if (!best || p.have / p.need > best.p.have / best.p.need)
          best = { seal, p }
      }
      setNext(best)
    })
    return () => {
      live = false
    }
  }, [bank])

  return (
    <a
      href="#seals"
      className={`zh-card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 ${className}`}
    >
      <div className="flex items-baseline gap-2">
        <span className="zh text-lg text-[var(--red)]">印章</span>
        <span className="font-black">Seals</span>
        <span className="ml-auto text-xs font-bold text-[var(--ink-2)] tabular-nums">
          {earned.length} of {SEALS.length}
        </span>
      </div>
      <div className="flex min-h-[44px] items-center -space-x-1.5">
        {earned.length ? (
          earned.slice(0, 6).map((s) => <Seal key={s.id} seal={s} size={44} />)
        ) : (
          <>
            {SEALS.slice(0, 3).map((s) => (
              <Seal key={s.id} seal={s} size={44} faint />
            ))}
            <span className="pl-4 text-sm text-[var(--ink-2)]">
              Earned in every game
            </span>
          </>
        )}
      </div>
      {next && (
        <div className="text-sm text-[var(--ink-2)]">
          <span className="flex items-baseline gap-1.5">
            Next:
            <span className="zh text-base text-[var(--ink)]">
              {next.seal.zh}
            </span>
            <span className="truncate font-bold text-[var(--ink)]">
              {next.seal.title}
            </span>
            <span className="ml-auto shrink-0 text-xs tabular-nums">
              {next.p.have}/{next.p.need}
            </span>
          </span>
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--paper-2)]">
            <span
              className="block h-full rounded-full bg-[var(--red)]"
              style={{ width: `${(next.p.have / next.p.need) * 100}%` }}
            />
          </span>
        </div>
      )}
    </a>
  )
}
