import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { SEAL } from '../data/seals'
import { onSeals } from '../lib/store'
import { Seal } from './Seal'
import type { SealDef } from '../data/seals'
import './daily.css'

// The seals just earned, stamped onto a slip of paper at the top of the
// screen with a thud. Mount it once, inside the BankProvider; seals
// earned at once share one slip, stamped one after another.

const SHOW_MS = 5600
const STAGGER_MS = 420
// When the stamp meets the paper, in its drop (daily.css)
const IMPACT_MS = 300

// Only one toaster shows at a time, should two be mounted
let owner: symbol | null = null

// The page's colours (tian.css sets them on .zh-page), for a toaster
// mounted outside it
const PALETTE = {
  '--paper': '#f7f0e3',
  '--paper-2': '#efe4cf',
  '--ink': '#221c18',
  '--ink-2': '#5b4f45',
  '--red': '#c8372d',
  '--jade': '#2f7d6d',
  '--gold': '#d9a441',
} as React.CSSProperties

export function SealToaster() {
  const [me] = useState(() => Symbol('toaster'))
  const [mine, setMine] = useState(false)
  const [queue, setQueue] = useState<Array<Array<SealDef>>>([])
  const [leaving, setLeaving] = useState(false)
  const shown = useRef(new Set<string>())

  useEffect(() => {
    if (owner) return
    owner = me
    setMine(true)
    return () => {
      if (owner === me) owner = null
    }
  }, [me])

  useEffect(() => {
    if (!mine) return
    return onSeals((ids) => {
      // A seal is celebrated once a visit, even if it comes round again
      // (as when an account's copy is merged in)
      const fresh = ids.filter((id) => !shown.current.has(id))
      fresh.forEach((id) => shown.current.add(id))
      const seals = fresh.flatMap((id) => SEAL[id] ?? [])
      if (seals.length) setQueue((q) => [...q, seals])
    })
  }, [mine])

  const slip = queue.at(0)

  // Each slip stays a while, then leaves for the next
  useEffect(() => {
    if (!slip) return
    const stay = SHOW_MS + (Math.min(slip.length, 4) - 1) * STAGGER_MS
    const t = setTimeout(() => setLeaving(true), stay)
    return () => clearTimeout(t)
  }, [slip])

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => {
      setQueue((q) => q.slice(1))
      setLeaving(false)
    }, 280)
    return () => clearTimeout(t)
  }, [leaving])

  if (!mine || !slip) return null
  return (
    <Slip
      key={slip.map((s) => s.id).join()}
      seals={slip}
      leaving={leaving}
      onClose={() => setLeaving(true)}
    />
  )
}

function Slip({
  seals,
  leaving,
  onClose,
}: {
  seals: Array<SealDef>
  leaving: boolean
  onClose: () => void
}) {
  const stamped = seals.slice(0, 4)
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timers = stamped.map((_, i) =>
      setTimeout(
        () => {
          thud(i)
          // the slip gives a little under the blow
          if (!still)
            card.current?.animate(
              [
                { transform: 'translateY(0)' },
                { transform: 'translateY(3px)' },
                { transform: 'translateY(0)' },
              ],
              { duration: 180, easing: 'ease-out' },
            )
        },
        i * STAGGER_MS + (still ? 0 : IMPACT_MS),
      ),
    )
    return () => timers.forEach(clearTimeout)
    // once, when the slip arrives
  }, [])

  const one = seals.length === 1 ? seals[0] : null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center p-3"
      style={PALETTE}
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto w-full max-w-md ${leaving ? 'zh-toast-out' : 'zh-toast'}`}
      >
        <div
          ref={card}
          className="zh-card relative flex items-center gap-4 overflow-hidden border border-[#e6d6bb] p-4 pr-10 text-[var(--ink)]"
          style={{
            background:
              'radial-gradient(circle at 20% 30%, #fffdf6 0%, #fbf3e4 60%, #f3e6cd 100%)',
          }}
        >
          <div className="flex shrink-0 -space-x-3">
            {stamped.map((s, i) => (
              <div
                key={s.id}
                className="relative"
                style={{ zIndex: stamped.length - i }}
              >
                <div
                  className="zh-stamp-ring absolute inset-1 rounded-full"
                  style={{
                    animationDelay: `${i * STAGGER_MS + IMPACT_MS}ms`,
                    background:
                      'radial-gradient(circle, rgba(194,59,46,0.28) 40%, rgba(194,59,46,0) 70%)',
                  }}
                />
                <div
                  className="zh-stamp"
                  style={{ animationDelay: `${i * STAGGER_MS}ms` }}
                >
                  <Seal seal={s} size={one ? 76 : 60} />
                </div>
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-wide text-[var(--red)] uppercase">
              {one ? 'New seal' : `${seals.length} new seals`}
            </p>
            {one ? (
              <>
                <p className="text-lg leading-tight font-black">{one.title}</p>
                <p className="mt-0.5 text-sm text-[var(--ink-2)]">
                  <span className="zh text-base text-[var(--ink)]">
                    {one.zh}
                  </span>{' '}
                  {one.py} · {one.means}
                </p>
              </>
            ) : (
              <p className="text-sm leading-snug font-bold">
                {seals
                  .slice(0, 4)
                  .map((s) => s.title)
                  .join(' · ')}
                {seals.length > 4 && (
                  <span className="font-normal text-[var(--ink-2)]">
                    {' '}
                    and {seals.length - 4} more
                  </span>
                )}
              </p>
            )}
            <a
              href="#seals"
              onClick={onClose}
              className="mt-1 inline-block text-sm font-bold text-[var(--jade)] hover:underline"
            >
              See the album →
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 rounded-full p-1 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// The sound of a seal pressed on paper: a soft thud of wood on a table,
// the tap of its edge, and after it a small bright chime. Made on the
// spot; nothing when sound is not allowed yet.
let ctx: AudioContext | null = null

export function thud(n = 0) {
  try {
    // no sound before the player has touched the page: the browser would
    // refuse it anyway
    const active = (
      navigator as { userActivation?: { hasBeenActive: boolean } }
    ).userActivation?.hasBeenActive
    if (active === false && !ctx) return
    ctx ??= new AudioContext()
    const a = ctx
    if (a.state === 'suspended') void a.resume()
    const t = a.currentTime + 0.01
    // the body: a falling low tone
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(52, t + 0.16)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    o.connect(g).connect(a.destination)
    o.start(t)
    o.stop(t + 0.32)
    // the tap: a short burst of noise, through a band
    const len = Math.floor(a.sampleRate * 0.05)
    const buf = a.createBuffer(1, len, a.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
    const noise = a.createBufferSource()
    noise.buffer = buf
    const band = a.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 900
    band.Q.value = 0.8
    const ng = a.createGain()
    ng.gain.value = 0.5
    noise.connect(band).connect(ng).connect(a.destination)
    noise.start(t)
    // the chime, a step up the pentatonic scale for each seal in a row
    const notes = [1046.5, 1174.7, 1318.5, 1568, 1760]
    const f = notes[n % notes.length]
    for (const [k, mul] of [
      [0, 1],
      [1, 1.5],
    ] as const) {
      const c = a.createOscillator()
      const cg = a.createGain()
      c.type = 'triangle'
      c.frequency.value = f * mul
      const s = t + 0.12 + k * 0.07
      cg.gain.setValueAtTime(0.0001, s)
      cg.gain.exponentialRampToValueAtTime(0.07, s + 0.01)
      cg.gain.exponentialRampToValueAtTime(0.0001, s + 0.6)
      c.connect(cg).connect(a.destination)
      c.start(s)
      c.stop(s + 0.62)
    }
  } catch {
    // no sound
  }
}
