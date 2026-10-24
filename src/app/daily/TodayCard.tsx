import { useMemo } from 'react'
import { ArrowRight, Flame } from 'lucide-react'
import { useStore } from '../lib/store'
import { current, finished, plan, share, summary } from '../lib/today'
import { streak } from '../lib/bank'
import { Ring } from './Ring'
import { describe } from './steps'
import { useToday } from './useToday'
import type { ArcState } from './Ring'
import './daily.css'

// The home screen's call to action: today's session, as a ring of its
// steps and a button. Before it starts it shows what today holds; during
// the day, the next step; after, the streak and what tomorrow brings.

export function TodayCard({ className = '' }: { className?: string }) {
  const { bank } = useStore()
  const now = Date.now()
  const path = useToday()

  const preview = useMemo(() => path ?? plan(bank, now), [path, bank])
  const at = current(preview)
  const done = finished(preview)
  const days = streak(bank, now)
  const arcs: Array<ArcState> = preview.steps.map((s, i) =>
    s.done ? 'done' : path && i === at ? 'now' : 'todo',
  )
  const step = at >= 0 ? describe(preview.steps[at]) : null
  const minutes = preview.steps
    .filter((s) => !s.done)
    .reduce((m, s) => m + describe(s).minutes, 0)
  const tomorrow = done && path ? summary(path, bank, now).tomorrow : 0

  return (
    <a
      href="#today"
      className={`zh-card group relative flex items-center gap-4 overflow-hidden p-4 transition hover:-translate-y-0.5 sm:gap-5 sm:p-5 ${className}`}
    >
      <Ring
        steps={arcs}
        part={path && at >= 0 ? share(preview.steps[at]) : 0}
        size={84}
        width={10}
      >
        <span
          className={`zh text-3xl ${done ? 'text-[var(--red)]' : 'text-[var(--ink)]'}`}
        >
          {done ? '完' : path && step ? step.glyph : '今'}
        </span>
      </Ring>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="zh text-xl text-[var(--red)]">今天</span>
          <span className="text-xl font-black">
            {done ? 'Done for today' : 'Today'}
          </span>
          {days > 0 && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-sm font-bold text-[var(--red)]">
              <Flame size={15} /> {days}
            </span>
          )}
        </div>
        {done ? (
          <p className="text-sm text-[var(--ink-2)]">
            {days > 1 ? `${days} days in a row. ` : ''}
            {tomorrow
              ? `Tomorrow ${tomorrow} ${tomorrow === 1 ? 'word' : 'words'} will need you.`
              : 'Come back tomorrow for the next.'}
          </p>
        ) : path && step ? (
          <p className="text-sm text-[var(--ink-2)]">
            Step {at + 1} of {preview.steps.length}:{' '}
            <span className="font-bold text-[var(--ink)]">{step.title}</span> –{' '}
            {step.detail}
          </p>
        ) : (
          <p className="text-sm text-[var(--ink-2)]">
            About {minutes} minutes:{' '}
            {preview.steps
              .map((s) => describe(s).title.toLowerCase())
              .join(', ')}
            .
          </p>
        )}
      </div>
      <span
        className={`hidden shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 font-bold transition sm:inline-flex ${
          done
            ? 'bg-[var(--paper-2)] text-[var(--ink)]'
            : 'bg-[var(--red)] text-[#fff6ea] group-hover:bg-[var(--red-2)]'
        }`}
      >
        {done ? 'See today' : path ? 'Continue' : 'Start'}
        <ArrowRight size={16} />
      </span>
      <ArrowRight
        size={20}
        className="shrink-0 text-[var(--red)] sm:hidden"
        aria-hidden
      />
    </a>
  )
}
