import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { blip } from '../lib/audio'
import { wordChoices } from '../lib/choices'
import { join, syllables } from '../lib/pinyin'
import { useStore } from '../lib/store'
import { Btn, Frame, Ruby } from '../ui'
import { questionsFor } from '../quiz'
import {
  Combo,
  Key,
  burst,
  confetti,
  floatText,
  useKeys,
  useSpeaker,
} from './fx'
import { fadedFirst, practiceWords, short } from './play/pool'
import { DemoNote } from './play/DemoNote'
import type { Kind, Question } from '../quiz'
import type { Dir } from '../lib/bank'
import type { Word } from '../data/words'
import './play/play.css'

// Dragon boats (龙舟, demo): Review's questions as a race. Each right
// answer is a stroke of the paddles; a wrong one splashes and stalls the
// boat while the rival keeps rowing. The questions are Review's own
// (questionsFor: each word about its weakest link, in the way it is
// missed most), except that pinyin is not typed in a race: those become
// the character heard. A race won makes the next rival faster.

const STROKES = 12
const WEIGHT: Record<Kind, number> = {
  meaning: 0.6,
  reverse: 0.7,
  listen: 0.7,
  type: 0.7,
  hear: 0.6,
  say: 0.7,
}
const DIR_OF: Record<Kind, Dir> = {
  meaning: 'h>m',
  reverse: 'm>h',
  listen: 's>h',
  type: 's>h',
  hear: 's>m',
  say: 'm>s',
}
const heard = (k: Kind) => k === 'listen' || k === 'hear'

type Phase = 'ready' | 'count' | 'race' | 'won' | 'lost'

export default function Boat() {
  const { bank, record } = useStore()
  const words = useMemo(() => practiceWords(bank), [])
  const pool = useMemo(() => {
    const met = words.filter((w) => bank.cards[w.id])
    return met.length >= 8 ? met : words
  }, [words])
  const [phase, setPhase] = useState<Phase>('ready')
  const [race, setRace] = useState(1)
  const [count, setCount] = useState(3)
  const [me, setMe] = useState(0)
  const [rival, setRival] = useState(0)
  const [queue, setQueue] = useState<Array<Question>>([])
  const [at, setAt] = useState(0)
  const [answer, setAnswer] = useState<{
    picked: string
    right: boolean
  } | null>(null)
  const [streak, setStreak] = useState(0)
  const [stroke, setStroke] = useState(0)
  const [tally, setTally] = useState({ right: 0, wrong: 0 })
  const started = useRef(0)
  const stalled = useRef(0)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const myBoat = useRef<HTMLDivElement>(null)
  const prompt = useRef<HTMLDivElement>(null)
  const { speaking, play } = useSpeaker()
  // Seconds the rival takes for the whole course
  const rivalTime = Math.max(26, 64 - (race - 1) * 8)

  const later = (f: () => void, ms: number) =>
    timers.current.push(setTimeout(f, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const q = queue[at] as Question | undefined
  const choices = useMemo(
    () =>
      q
        ? wordChoices(q.w, pool, q.kind === 'type' ? 'listen' : q.kind).slice(
            0,
            4,
          )
        : [],
    [q, pool],
  )

  const begin = () => {
    const ws = fadedFirst(words, 24)
    setQueue(
      questionsFor(ws, bank.cards, Date.now()).map((x) =>
        x.kind === 'type' ? { ...x, kind: 'listen' as const } : x,
      ),
    )
    setAt(0)
    setMe(0)
    setRival(0)
    setStreak(0)
    setAnswer(null)
    setTally({ right: 0, wrong: 0 })
    setPhase('count')
    setCount(3)
    blip('tap')
    later(() => (setCount(2), blip('tap')), 700)
    later(() => (setCount(1), blip('tap')), 1400)
    later(() => {
      setPhase('race')
      blip('gong')
      started.current = performance.now()
    }, 2100)
  }

  // the rival rows on, whatever happens
  useEffect(() => {
    if (phase !== 'race') return
    let raf = 0
    const tick = (t: number) => {
      const x = Math.min(1, (t - started.current) / 1000 / rivalTime)
      setRival(x)
      if (x >= 1) {
        setPhase('lost')
        blip('wrong')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, rivalTime])

  // a question by ear is said as it comes up
  useEffect(() => {
    if (phase === 'race' && q && heard(q.kind)) void play(q.w.h)
  }, [phase, at])

  const pick = (c: Word) => {
    if (!q || answer || phase !== 'race' || performance.now() < stalled.current)
      return
    const right = c.id === q.w.id
    setAnswer({ picked: c.id, right })
    if (bank.cards[q.w.id])
      record(q.w.id, right, WEIGHT[q.kind], DIR_OF[q.kind])
    if (right) {
      blip('right')
      const s = streak + 1
      setStreak(s)
      setStroke((x) => x + 1)
      setTally((t) => ({ ...t, right: t.right + 1 }))
      // a streak of three or more pulls a little harder
      const pull = (s >= 3 ? 1.25 : 1) / STROKES
      const next = Math.min(1, me + pull)
      setMe(next)
      burst(myBoat.current, {
        colors: ['#ffffff', '#bfe3ee', '#7fc4d8'],
        n: 12,
        spread: 50,
      })
      if (s >= 3)
        floatText(myBoat.current, `加油 ×${s}`, { color: '#c8372d', size: 20 })
      if (next >= 1) {
        later(() => {
          setPhase('won')
          blip('win')
          confetti()
        }, 500)
        return
      }
      later(() => {
        setAnswer(null)
        setAt((a) => (a + 1) % Math.max(1, queue.length))
      }, 450)
    } else {
      blip('wrong')
      setStreak(0)
      setTally((t) => ({ ...t, wrong: t.wrong + 1 }))
      stalled.current = performance.now() + 1600
      if (!heard(q.kind)) void play(q.w.h)
      // the word comes round again later in the race
      setQueue((qs) => [...qs, q])
      later(() => {
        setAnswer(null)
        setAt((a) => a + 1)
      }, 1600)
    }
  }

  useKeys((key) => {
    if (
      (phase === 'ready' || phase === 'won' || phase === 'lost') &&
      key === 'Enter'
    ) {
      if (phase === 'won') setRace((r) => r + 1)
      begin()
      return true
    }
    if (phase !== 'race' || !q) return
    if (key === ' ' && heard(q.kind)) {
      void play(q.w.h)
      return true
    }
    if (/^[1-4]$/.test(key)) {
      const c = choices[Number(key) - 1] as Word | undefined
      if (c) pick(c)
      return true
    }
  })

  return (
    <Frame title="Dragon boats" zh="龙舟" right={<Combo n={streak} />}>
      <DemoNote>
        Review&apos;s questions as a race: each right answer is a stroke of the
        paddles. A wrong one stalls you while the rival rows on.
      </DemoNote>

      <div className="bt-river relative mb-4 overflow-hidden rounded-3xl">
        <div className="bt-waves" aria-hidden />
        <div className="bt-finish" aria-hidden />
        <Lane x={rival} color="#3d6fa8" label="对手" stroke={0} rival />
        <Lane
          x={me}
          color="#c8372d"
          label="你"
          stroke={stroke}
          stall={!!answer && !answer.right}
          boatRef={myBoat}
        />
        {phase === 'count' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <span
              key={count}
              className="fx-pop text-7xl font-black text-white drop-shadow-lg"
            >
              {count}
            </span>
          </div>
        )}
      </div>

      {phase === 'race' && q && (
        <div className="zh-card p-5 sm:p-6">
          <div
            ref={prompt}
            className="flex min-h-[6.5rem] flex-col items-center justify-center"
          >
            {heard(q.kind) ? (
              <button
                type="button"
                onClick={() => void play(q.w.h)}
                className={`flex h-16 w-16 items-center justify-center rounded-full bg-[var(--jade)] text-white ${speaking ? 'fx-bump' : ''}`}
                aria-label="Hear it again"
              >
                <Volume2 size={30} />
              </button>
            ) : q.kind === 'meaning' ? (
              <span className="zh text-6xl">{q.w.h}</span>
            ) : (
              <span className="text-center text-2xl font-bold">{q.w.e}</span>
            )}
            <span className="mt-2 text-xs tracking-wide text-[var(--ink-2)] uppercase">
              {
                {
                  meaning: 'What does it mean?',
                  reverse: 'Which character?',
                  listen: 'Which did you hear?',
                  type: 'Which did you hear?',
                  hear: 'What did you hear?',
                  say: 'How do you say it?',
                }[q.kind]
              }
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {choices.map((c, i) => {
              const isRight = c.id === q.w.id
              const look = !answer
                ? 'border-[var(--paper-2)] bg-[var(--paper)] hover:border-[var(--gold)]'
                : isRight
                  ? 'border-[var(--jade)] bg-[#e3f0ea]'
                  : answer.picked === c.id
                    ? 'fx-shake border-[var(--red)] bg-[#f8e1dc]'
                    : 'border-transparent bg-[var(--paper)] opacity-45'
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c)}
                  className={`relative flex min-h-[4.25rem] items-center justify-center rounded-2xl border-2 px-3 py-2 text-center transition ${look}`}
                >
                  <Key
                    k={String(i + 1)}
                    className="absolute top-1.5 left-1.5"
                  />
                  {q.kind === 'say' ? (
                    <span className="text-xl font-semibold">
                      {join(syllables(c.p))}
                    </span>
                  ) : q.kind === 'meaning' || q.kind === 'hear' ? (
                    <span className="font-semibold">{short(c)}</span>
                  ) : answer && isRight ? (
                    <Ruby h={c.h} p={c.p} className="text-3xl" />
                  ) : (
                    <span className="zh text-3xl">{c.h}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {phase !== 'race' && phase !== 'count' && (
        <div className="zh-card fx-rise p-6 text-center">
          {phase === 'ready' ? (
            <>
              <p className="text-2xl font-black">Race {race}</p>
              <p className="mt-1 mb-5 text-[var(--ink-2)]">
                {STROKES} right answers reach the finish. The rival takes{' '}
                {rivalTime} seconds.
              </p>
            </>
          ) : (
            <>
              <p className="zh-display text-5xl text-[var(--red)]">
                {phase === 'won' ? '赢了' : '输了'}
              </p>
              <p className="mt-1 text-2xl font-black">
                {phase === 'won'
                  ? 'You won the race'
                  : 'The rival got there first'}
              </p>
              <p className="mt-1 mb-5 text-[var(--ink-2)]">
                {tally.right} right, {tally.wrong} wrong
                {phase === 'won' ? ' – the next rival is faster.' : '.'}
              </p>
            </>
          )}
          <Btn
            onClick={() => {
              if (phase === 'won') setRace((r) => r + 1)
              begin()
            }}
            className="px-8 py-3 text-lg"
          >
            {phase === 'ready'
              ? 'Row'
              : phase === 'won'
                ? 'Next race'
                : 'Again'}{' '}
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

function Lane({
  x,
  color,
  label,
  stroke,
  stall,
  rival,
  boatRef,
}: {
  x: number
  color: string
  label: string
  stroke: number
  stall?: boolean
  rival?: boolean
  boatRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div className="bt-lane relative h-[72px]">
      <div
        ref={boatRef}
        className={`bt-boat absolute top-1/2 ${rival ? 'bt-rival' : ''} ${stall ? 'bt-stall' : ''}`}
        style={{ left: `calc(${x} * (100% - 150px) + 6px)` }}
      >
        <svg
          key={stroke}
          viewBox="0 0 140 44"
          width="140"
          height="44"
          className={rival ? 'bt-rowing' : stroke ? 'bt-pull' : ''}
          aria-hidden
        >
          {/* paddles */}
          {[30, 48, 66, 84, 102].map((px) => (
            <line
              key={px}
              className="bt-paddle"
              x1={px}
              y1="20"
              x2={px - 8}
              y2="40"
              stroke="#5b3a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ transformOrigin: `${px}px 20px` }}
            />
          ))}
          {/* hull, tail at the left and the dragon's head at the right */}
          <path
            d={`M4 18 Q10 30 24 32 L112 32 Q124 30 128 22 L136 14 Q132 22 126 20 L120 24 L22 24 Q12 24 4 18 Z`}
            fill={color}
          />
          <path d="M22 28 L114 28" stroke="#d9a441" strokeWidth="2" />
          <circle cx="129" cy="17" r="1.6" fill="#fff" />
          {/* rowers */}
          {[34, 52, 70, 88, 106].map((px) => (
            <circle key={px} cx={px} cy="17" r="4.2" fill="#221c18" />
          ))}
          {/* the drummer at the head */}
          <circle cx="116" cy="15" r="4" fill="#d9a441" />
        </svg>
        <span className="bt-label">{label}</span>
      </div>
    </div>
  )
}
