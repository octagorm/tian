import { useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { pick } from '../lib/bank'
import { blip, say } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Ruby, shuffle } from '../ui'
import {
  COLORS,
  Card3D,
  CountUp,
  Key,
  burst,
  confetti,
  ring,
  useKeys,
} from './fx'
import type { Word } from '../data/words'

// Pairs: cards face down, each word twice – once in hanzi, once as its
// meaning (or its sound, in Ears mode). Turn two at a time to find the
// pairs, in as few turns as you can.

const PAIRS = 6

interface Card {
  key: number
  w: Word
  face: 'hanzi' | 'meaning' | 'sound'
}

export default function Match() {
  const { bank, meet, record, points, setBest, levelOf } = useStore()
  const [ears, setEars] = useState(false)
  const [cards, setCards] = useState<Array<Card>>([])
  const [open, setOpen] = useState<Array<number>>([])
  const [found, setFound] = useState<Set<string>>(new Set())
  const [miss, setMiss] = useState<Array<number>>([])
  const [turns, setTurns] = useState(0)
  const [busy, setBusy] = useState(false)
  const [round, setRound] = useState(0)
  const els = useRef(new Map<number, HTMLElement | null>())
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const later = (f: () => void, ms: number) =>
    timers.current.push(setTimeout(f, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const deal = (withEars = ears) => {
    const chosen = pick(
      bank,
      PAIRS,
      Date.now(),
      (w) => !w.tags.includes('part'),
    )
    meet(chosen.fresh.map((w) => w.id))
    setCards(
      shuffle(
        chosen.words.flatMap((w, i) => [
          { key: i * 2, w, face: 'hanzi' as const },
          {
            key: i * 2 + 1,
            w,
            face: withEars ? ('sound' as const) : ('meaning' as const),
          },
        ]),
      ),
    )
    setOpen([])
    setMiss([])
    setFound(new Set())
    setTurns(0)
    setBusy(false)
    setRound((r) => r + 1)
  }

  useEffect(() => deal(), [])

  const flip = (c: Card) => {
    if (busy || open.includes(c.key) || found.has(c.w.id)) return
    if (c.face !== 'meaning') void say(c.w.h)
    const now = [...open, c.key]
    setOpen(now)
    if (now.length < 2) return
    setTurns((t) => t + 1)
    const [a, b] = now.map((k) => cards.find((x) => x.key === k)!)
    if (a.w.id === b.w.id) {
      setBusy(true)
      // let the second card finish turning before it celebrates
      later(() => {
        blip('right')
        for (const k of now) {
          burst(els.current.get(k), { n: 12, spread: 55 })
          ring(els.current.get(k), COLORS.jade, 110)
        }
        record(a.w.id, true, 0.3)
        const f = new Set(found).add(a.w.id)
        setFound(f)
        setOpen([])
        setBusy(false)
        if (f.size === cards.length / 2) {
          later(() => {
            blip('win')
            confetti()
          }, 350)
          points(3)
          // fewer turns is better; the best is kept as the score 100 - turns
          setBest(ears ? 'match-ears' : 'match', 100 - (turns + 1))
        }
      }, 380)
    } else {
      setBusy(true)
      later(() => {
        blip('wrong')
        setMiss(now)
      }, 480)
      later(() => {
        setMiss([])
        setOpen([])
        setBusy(false)
      }, 1250)
    }
  }

  const done = cards.length > 0 && found.size === cards.length / 2
  const best = bank.best[ears ? 'match-ears' : 'match']

  useKeys((key) => {
    if (!done || key !== 'Enter') return
    deal()
    return true
  }, done)

  return (
    <Frame
      title="Pairs"
      zh="配对"
      right={
        <span className="font-bold tabular-nums">
          {turns} {turns === 1 ? 'turn' : 'turns'}
        </span>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl bg-[var(--paper-2)] p-1">
          {[false, true].map((e) => (
            <button
              key={String(e)}
              type="button"
              onClick={() => {
                setEars(e)
                deal(e)
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${ears === e ? 'bg-[var(--ink)] text-[var(--paper)] shadow' : 'text-[var(--ink-2)] hover:text-[var(--ink)]'}`}
            >
              {e ? 'Hanzi + sound' : 'Hanzi + meaning'}
            </button>
          ))}
        </div>
        {best ? (
          <span className="ml-auto text-sm text-[var(--ink-2)]">
            Best: {100 - best} turns
          </span>
        ) : null}
      </div>
      <div
        key={round}
        className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3"
      >
        {cards.map((c, i) => {
          const isFound = found.has(c.w.id)
          const shown = open.includes(c.key) || isFound
          return (
            <button
              key={c.key}
              ref={(el) => {
                els.current.set(c.key, el)
              }}
              type="button"
              onClick={() => flip(c)}
              aria-label={shown ? undefined : 'A card, face down'}
              className="fx-pop block aspect-[3/4] w-full rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <Card3D
                turned={shown}
                className={`h-full w-full ${miss.includes(c.key) ? 'fx-shake' : ''}`}
                faceClassName="rounded-2xl"
                front={<CardBack />}
                back={
                  <div
                    className={`relative flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 p-2 text-center shadow-md transition-colors duration-300 ${isFound ? 'border-[var(--jade)] bg-[#e7f2ec]' : miss.includes(c.key) ? 'border-[var(--red)] bg-[#fbeee9]' : 'border-[#e9d9bd] bg-[#fffaf1]'}`}
                  >
                    {c.face === 'hanzi' ? (
                      levelOf(c.w.id) < 2 && isFound ? (
                        <Ruby
                          h={c.w.h}
                          p={c.w.p}
                          className="text-3xl sm:text-4xl"
                        />
                      ) : (
                        <span className="zh text-4xl sm:text-5xl">{c.w.h}</span>
                      )
                    ) : c.face === 'sound' ? (
                      <span className="flex flex-col items-center gap-1 text-[var(--jade)]">
                        <Volume2 size={34} />
                        {isFound && (
                          <span className="text-xs text-[var(--ink-2)]">
                            {c.w.g}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-sm leading-tight font-bold sm:text-base">
                        {c.w.e}
                      </span>
                    )}
                    {isFound && <Seal />}
                  </div>
                }
              />
            </button>
          )
        })}
      </div>
      {done && (
        <div className="zh-card fx-pop mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 p-5 text-center">
          <p className="text-2xl font-black">
            All pairs in <CountUp to={turns} /> turns
          </p>
          <Btn onClick={() => deal()}>
            Deal again{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </div>
      )}
    </Frame>
  )
}

// A little red seal, 对 (right), stamped on a pair found
function Seal() {
  return (
    <span
      className="fx-pop absolute right-1.5 bottom-1.5 flex h-6 w-6 rotate-[-8deg] items-center justify-center rounded-[5px] border-2 border-[var(--red)] text-[var(--red)]"
      style={{ animationDelay: '120ms' }}
      aria-hidden="true"
    >
      <span className="zh text-sm leading-none font-bold">对</span>
    </span>
  )
}

// The back of a card: red lacquer, a gold border with turned-in corners,
// a lattice like a paper window, and a round medallion of clouds
function CardBack() {
  return (
    <svg
      viewBox="0 0 60 80"
      className="h-full w-full rounded-2xl shadow-md"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="pairs-lattice"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <path
            d="M0 4h8M4 0v8"
            stroke="#e8b74a"
            strokeWidth="0.5"
            opacity="0.35"
          />
        </pattern>
        <radialGradient id="pairs-sheen" cx="35%" cy="25%" r="80%">
          <stop offset="0" stopColor="#d9473b" />
          <stop offset="1" stopColor="#9c241c" />
        </radialGradient>
      </defs>
      <rect width="60" height="80" rx="7" fill="url(#pairs-sheen)" />
      <rect
        x="5"
        y="5"
        width="50"
        height="70"
        rx="3"
        fill="url(#pairs-lattice)"
      />
      <rect
        x="4.5"
        y="4.5"
        width="51"
        height="71"
        rx="3"
        fill="none"
        stroke="#e8b74a"
        strokeWidth="1"
      />
      {[
        [8, 8, 0],
        [52, 8, 90],
        [52, 72, 180],
        [8, 72, 270],
      ].map(([x, y, r]) => (
        <path
          key={r}
          d="M0 6 L0 0 L6 0 M2.5 6 Q2.5 2.5 6 2.5"
          transform={`translate(${x} ${y}) rotate(${r})`}
          fill="none"
          stroke="#f2c14e"
          strokeWidth="1"
          strokeLinecap="round"
        />
      ))}
      <circle
        cx="30"
        cy="40"
        r="13"
        fill="#a8261c"
        stroke="#e8b74a"
        strokeWidth="1.2"
      />
      <circle
        cx="30"
        cy="40"
        r="10.5"
        fill="none"
        stroke="#e8b74a"
        strokeWidth="0.5"
        strokeDasharray="1.5 1.5"
      />
      {/* a plum blossom: five round petals, stamens, a gold heart */}
      <g transform="translate(30 40)">
        {[0, 72, 144, 216, 288].map((a) => (
          <circle
            key={a}
            cx="0"
            cy="-4.6"
            r="3.6"
            transform={`rotate(${a})`}
            fill="#f2c14e"
            stroke="#a8261c"
            strokeWidth="0.6"
          />
        ))}
        {[36, 108, 180, 252, 324].map((a) => (
          <path
            key={a}
            d="M0 0 L0 -3.4"
            transform={`rotate(${a})`}
            stroke="#a8261c"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
        ))}
        <circle r="1.7" fill="#a8261c" />
        <circle r="0.8" fill="#fff3c4" />
      </g>
    </svg>
  )
}
