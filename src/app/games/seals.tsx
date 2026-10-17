import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { SEALS, SEAL_GROUPS } from '../data/seals'
import { progress } from '../lib/achievements'
import { useStore } from '../lib/store'
import { Frame, SpeakButton } from '../ui'
import { Seal } from '../daily/Seal'
import { thud } from '../daily/SealToaster'
import type { SealDef } from '../data/seals'
import '../daily/daily.css'

// Seals: the album of achievements, laid out as a book of seal
// impressions (印谱). Seals earned are stamped in red; the rest are
// faint, with how far along they are. Each one opens to its character.

const date = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function Seals() {
  const { bank } = useStore()
  const [open, setOpen] = useState<SealDef | null>(null)
  const now = Date.now()
  const earned = SEALS.filter((s) => bank.seals[s.id])
  const latest = useMemo(
    () =>
      [...earned]
        .sort((a, b) => (bank.seals[b.id] ?? 0) - (bank.seals[a.id] ?? 0))
        .slice(0, 5),
    [bank.seals],
  )

  return (
    <Frame title="Seals" zh="印章" wide>
      <div
        className="zh-card mb-6 flex flex-wrap items-center gap-5 overflow-hidden p-5"
        style={{ background: '#fbf3e4' }}
      >
        <div className="min-w-[14rem] flex-1">
          <p className="text-3xl font-black tabular-nums">
            {earned.length}
            <span className="text-lg font-bold text-[var(--ink-2)]">
              {' '}
              of {SEALS.length} seals
            </span>
          </p>
          <div className="mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-[var(--paper-2)]">
            <div
              className="h-full rounded-full bg-[var(--red)] transition-all"
              style={{ width: `${(earned.length / SEALS.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 max-w-md text-sm text-[var(--ink-2)]">
            Every seal has a character carved on it. Earn them across the games;
            tap one to see what its character means.
          </p>
        </div>
        {latest.length > 0 && (
          <div className="flex -space-x-2">
            {latest.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpen(s)}
                className="transition hover:-translate-y-1"
                aria-label={s.title}
              >
                <Seal seal={s} size={58} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {SEAL_GROUPS.map((g) => {
          const seals = SEALS.filter((s) => s.group === g.id)
          const got = seals.filter((s) => bank.seals[s.id]).length
          return (
            <section
              key={g.id}
              className="rounded-2xl p-1.5"
              style={{
                background: '#fbf3e4',
                boxShadow: '0 8px 24px -14px rgba(34,28,24,0.35)',
              }}
            >
              <div className="rounded-xl border border-[var(--red)]/35 p-1">
                <div className="rounded-lg border-2 border-[var(--red)]/30 px-3 pt-3 pb-4 sm:px-5">
                  <h2 className="mb-3 flex items-baseline gap-2">
                    <span className="zh text-xl text-[var(--red)]">{g.zh}</span>
                    <span className="font-black">{g.title}</span>
                    <span className="ml-auto text-xs font-bold text-[var(--ink-2)] tabular-nums">
                      {got} / {seals.length}
                    </span>
                  </h2>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-5 lg:grid-cols-6">
                    {seals.map((s) => {
                      const at = bank.seals[s.id]
                      const p = at ? null : progress(bank, s.id, now)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setOpen(s)}
                          className="group flex flex-col items-center rounded-xl px-1 py-2 text-center transition hover:bg-[var(--paper-2)]/70"
                        >
                          <span className="transition group-hover:scale-105">
                            <Seal seal={s} size={70} faint={!at} />
                          </span>
                          <span
                            className={`mt-1.5 text-xs leading-tight font-bold ${at ? '' : 'text-[var(--ink-2)]'}`}
                          >
                            {s.title}
                          </span>
                          {at ? (
                            <span className="text-[11px] text-[var(--red)]">
                              {date(at)}
                            </span>
                          ) : p && p.need > 1 ? (
                            <span className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-[var(--paper-2)]">
                              <span
                                className="block h-full rounded-full bg-[var(--gold)]"
                                style={{ width: `${(p.have / p.need) * 100}%` }}
                              />
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
      {open && <SealSheet seal={open} onClose={() => setOpen(null)} />}
    </Frame>
  )
}

function SealSheet({ seal, onClose }: { seal: SealDef; onClose: () => void }) {
  const { bank } = useStore()
  const at = bank.seals[seal.id]
  const p = at ? null : progress(bank, seal.id, Date.now())
  const [stamp, setStamp] = useState(0)
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="zh-card zh-rise w-full max-w-sm p-5"
        style={{ background: '#fbf3e4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            disabled={!at}
            onClick={() => {
              setStamp((n) => n + 1)
              setTimeout(() => thud(stamp), 300)
            }}
            aria-label="Stamp it again"
            className="relative"
          >
            <span key={stamp} className={`block ${stamp ? 'zh-stamp' : ''}`}>
              <Seal seal={seal} size={148} faint={!at} />
            </span>
          </button>
          <div className="mt-4 flex items-center gap-1">
            <span className="zh text-4xl">{seal.zh}</span>
            <SpeakButton text={seal.zh} />
          </div>
          <p className="text-lg text-[var(--jade)]">{seal.py}</p>
          <p className="text-[var(--ink-2)]">{seal.means}</p>
          <p className="mt-4 text-xl font-black">{seal.title}</p>
          <p className="mt-1 text-sm">{seal.how}</p>
          {seal.note && (
            <p className="mt-3 rounded-xl bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink-2)]">
              {seal.note}
            </p>
          )}
          {at ? (
            <p className="mt-4 text-sm font-bold text-[var(--red)]">
              Earned{' '}
              {new Date(at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          ) : p ? (
            <div className="mt-4 w-full max-w-[14rem]">
              {p.need > 1 && (
                <div className="h-2 overflow-hidden rounded-full bg-[var(--paper-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--gold)]"
                    style={{ width: `${(p.have / p.need) * 100}%` }}
                  />
                </div>
              )}
              <p className="mt-1 text-xs text-[var(--ink-2)]">
                {p.text ?? (p.need > 1 ? `${p.have} of ${p.need}` : 'Not yet')}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
