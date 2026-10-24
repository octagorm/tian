import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { LESSONS, WORDS } from '../data/words'
import { SCENES } from '../data/trip'
import { wordIds } from '../lib/text'
import { level, unmet as toLearn } from '../lib/bank'
import { TOPIC } from '../data/topics'
import { useStore } from '../lib/store'
import { Btn, Frame, Mixed, Ruby, shuffle } from '../ui'
import { Quiz, RoundDone } from '../quiz'
import { Pix } from '../pixel/Pix'
import {
  Card3D,
  Key,
  PlayButton,
  reducedMotion,
  useKeys,
  useSpeaker,
} from './fx'
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react'
import type { Word } from '../data/words'

// Learn: new words five at a time, from the next lesson or one picked.
// Each comes as a flashcard: the word and its sound on the front, its
// meaning and a line from the trip it is used in on the back. Turn it, and
// send it off (a swipe will do); then a short quiz on the five.

const BATCH = 5

// A line from the trip with the word in it, as an example
function example(w: Word, home: string): string | null {
  for (const s of SCENES)
    for (const step of s.steps) {
      const lines =
        step.kind === 'line'
          ? [step.zh]
          : step.options.filter((o) => o.right).map((o) => o.zh)
      for (const l of lines) if (wordIds(l, { home }).includes(w.id)) return l
    }
  return null
}

export default function Learn() {
  const { bank, meet, know, settings, points } = useStore()
  const [words, setWords] = useState<Array<Word> | null>(null)
  const [phase, setPhase] = useState<'cards' | 'quiz' | 'done'>('cards')
  const [card, setCard] = useState(0)
  const [result, setResult] = useState<[number, number]>([0, 0])
  const now = Date.now()

  const start = (lesson?: number) => {
    const pool = toLearn(bank).filter(
      (w) => lesson === undefined || w.lesson === lesson,
    )
    const next = pool.slice(0, BATCH)
    if (!next.length) return
    setWords(next)
    setCard(0)
    setPhase('cards')
  }

  if (words && phase === 'cards')
    return (
      <Frame title="Learn" zh="学">
        <Deck left={words.length - card - 1}>
          <FlashCard
            key={card}
            w={words[card]}
            n={card}
            of={words.length}
            home={settings.home}
            onNext={(knew) => {
              if (knew) know([words[card].id])
              else meet([words[card].id])
              if (card + 1 < words.length) setCard(card + 1)
              else setPhase('quiz')
            }}
          />
        </Deck>
      </Frame>
    )

  if (words && phase === 'quiz')
    return (
      <Frame title="Learn" zh="学">
        <Quiz
          questions={shuffle(
            words.flatMap((w) => [
              { w, kind: 'meaning' as const },
              { w, kind: 'listen' as const },
            ]),
          )}
          onDone={(r, t) => {
            setResult([r, t])
            points(5)
            setPhase('done')
          }}
        />
      </Frame>
    )

  if (words && phase === 'done')
    return (
      <Frame title="Learn" zh="学">
        <StartKey onStart={() => start()} on />
        <RoundDone
          right={result[0]}
          total={result[1]}
          sprite="sprout"
          actions={
            <>
              <Btn kind="ghost" onClick={() => setWords(null)}>
                Lessons
              </Btn>
              <Btn onClick={() => start()}>
                Five more{' '}
                <Key
                  k="Enter"
                  className="ml-1 border-white/30 bg-white/15 text-white"
                />
              </Btn>
              <a href="#trip">
                <Btn kind="jade">To the trip</Btn>
              </a>
            </>
          }
        >
          <p className="mx-auto mt-1 max-w-sm text-[var(--ink-2)]">
            These words now show in Chinese across every game. Review brings
            them back when they fade.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {words.map((w, i) => (
              <div
                key={w.id}
                className="fx-pop rounded-xl border border-[var(--paper-2)] bg-[var(--paper)] px-3 py-2 shadow-sm"
                style={{ animationDelay: `${600 + i * 110}ms` }}
              >
                <Ruby h={w.h} p={w.p} className="text-3xl" />
                <div className="text-xs text-[var(--ink-2)]">{w.g}</div>
              </div>
            ))}
          </div>
        </RoundDone>
      </Frame>
    )

  const unmet = toLearn(bank)
  const upcoming = unmet.slice(0, BATCH)
  const topics = bank.topics.on.flatMap((x) => TOPIC[x.id]?.title ?? [])
  return (
    <Frame title="Learn" zh="学">
      <div className="zh-card relative mb-6 overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative h-28 w-40 shrink-0" aria-hidden="true">
            {upcoming.map((w, i) => {
              const k = i - (upcoming.length - 1) / 2
              return (
                <div
                  key={w.id}
                  className="absolute top-2 left-[2.75rem]"
                  style={{
                    transform: `rotate(${k * 7}deg) translateX(${k * 6}px)`,
                    transformOrigin: '50% 150%',
                  }}
                >
                  <div
                    className="fx-pop flex h-24 w-[4.5rem] items-center justify-center rounded-xl border-2 border-[#e9d9bd] bg-[#fffaf1] shadow-md"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {i === upcoming.length - 1 ? (
                      <span className="zh text-2xl text-[var(--ink)]/85">
                        {w.h}
                      </span>
                    ) : (
                      <span className="zh text-2xl text-[var(--red)]/25">
                        学
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            {!upcoming.length && <Pix name="sprout" size={96} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black">
              {upcoming.length
                ? `Meet the next ${upcoming.length} words`
                : 'Every word met'}
            </p>
            <p className="text-sm text-[var(--ink-2)]">
              {unmet.length
                ? `${unmet.length} words still to meet, ${topics.length ? `those of your topics first (${topics.join(', ')})` : 'in the order the trip uses them'}. Each is a card: its sound, then what it means.`
                : 'Review keeps them fresh, and the word bank shows how each is doing.'}{' '}
              {unmet.length > 0 && (
                <a
                  href="#topics"
                  className="font-bold whitespace-nowrap text-[var(--red)] underline underline-offset-2"
                >
                  {topics.length ? 'Change topics' : 'Choose topics'}
                </a>
              )}
            </p>
          </div>
          <Btn
            onClick={() => start()}
            disabled={!unmet.length}
            className="px-7 py-3 text-lg max-sm:w-full"
          >
            Start{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </div>
      </div>
      <StartKey onStart={() => start()} on={unmet.length > 0} />
      <h2 className="mb-2 font-black">Or pick a lesson</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {LESSONS.map((l, li) => {
          const ws = WORDS.filter((w) => w.lesson === l.n)
          const met = ws.filter((w) => bank.cards[w.id]).length
          const k = ws.filter((w) => level(bank.cards[w.id], now) === 2).length
          const done = met === ws.length
          return (
            <div
              key={l.n}
              className="zh-card fx-rise flex items-center gap-3 p-3"
              style={{ animationDelay: `${Math.min(li, 12) * 30}ms` }}
            >
              <span
                className={`zh flex h-12 min-w-14 shrink-0 items-center justify-center rounded-xl px-2 whitespace-nowrap ${[...l.zh].length > 3 ? 'text-base' : [...l.zh].length > 2 ? 'text-lg' : 'text-xl'} ${done ? 'bg-[var(--red)] text-[#fff6ea]' : 'bg-[var(--paper-2)] text-[var(--red)]'}`}
              >
                {l.zh}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">
                  {l.n}. {l.title}
                </div>
                <LessonBar known={k} met={met} of={ws.length} />
                <div className="mt-0.5 text-xs text-[var(--ink-2)]">
                  {met}/{ws.length} met · {k} known
                </div>
              </div>
              {!done ? (
                <Btn
                  kind="ghost"
                  onClick={() => start(l.n)}
                  className="px-3 py-1.5 text-sm"
                >
                  Learn
                </Btn>
              ) : (
                <Check size={22} className="mr-2 text-[var(--jade)]" />
              )}
            </div>
          )
        })}
      </div>
    </Frame>
  )
}

function StartKey({ onStart, on }: { onStart: () => void; on: boolean }) {
  useKeys((key) => {
    if (key !== 'Enter') return
    onStart()
    return true
  }, on)
  return null
}

// Known in red, learning in jade, growing in from nothing
function LessonBar({
  known,
  met,
  of,
}: {
  known: number
  met: number
  of: number
}) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const k = shown ? (known / of) * 100 : 0
  const m = shown ? ((met - known) / of) * 100 : 0
  return (
    <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-[var(--paper-2)]">
      <div
        className="bg-[var(--red)] transition-[width] duration-700 ease-out"
        style={{ width: `${k}%` }}
      />
      <div
        className="bg-[var(--jade)] transition-[width] duration-700 ease-out"
        style={{ width: `${m}%`, transitionDelay: '120ms' }}
      />
    </div>
  )
}

// The cards still to come, stacked under the one in play
function Deck({ left, children }: { left: number; children: ReactNode }) {
  return (
    <div className="relative isolate mx-auto h-[28rem] w-full max-w-md sm:h-[29rem]">
      {Array.from({ length: Math.min(3, left) }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-0 rounded-[1.4rem] border-2 border-[#e9d9bd] bg-[#fbf3e3] shadow-md transition-transform duration-300"
          style={{
            transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.04})`,
            zIndex: 3 - i,
          }}
        />
      ))}
      <div className="absolute inset-0 z-10">{children}</div>
    </div>
  )
}

type Fly = 'left' | 'right' | 'up' | null

function FlashCard({
  w,
  n,
  of,
  home,
  onNext,
}: {
  w: Word
  n: number
  of: number
  home: string
  onNext: (knew: boolean) => void
}) {
  const ex = useMemo(() => example(w, home), [w, home])
  const { speaking, play } = useSpeaker()
  const [turned, setTurned] = useState(false)
  const [fly, setFly] = useState<Fly>(null)
  const [drag, setDrag] = useState(0)
  const start = useRef<{ x: number; id: number } | null>(null)
  const moved = useRef(false)

  useEffect(() => {
    void play(w.h)
  }, [w])

  const go = (knew: boolean, dir: Fly) => {
    if (fly) return
    if (reducedMotion()) {
      onNext(knew)
      return
    }
    setFly(dir)
    setTimeout(() => onNext(knew), 330)
  }

  useKeys((key) => {
    if (fly) return
    if (key === ' ') {
      void play(w.h)
      return true
    }
    if (key === 'Enter') {
      if (turned) go(false, 'right')
      else setTurned(true)
      return true
    }
    if (key === 'k' || key === 'K') {
      go(true, 'up')
      return true
    }
    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      if (!turned) setTurned(true)
      else go(false, key === 'ArrowRight' ? 'right' : 'left')
      return true
    }
  })

  // A drag sends the card off either way, as "got it"; a tap turns it
  const down = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return
    start.current = { x: e.clientX, id: e.pointerId }
    moved.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: ReactPointerEvent) => {
    if (start.current?.id !== e.pointerId) return
    const dx = e.clientX - start.current.x
    if (Math.abs(dx) > 6) moved.current = true
    if (moved.current) setDrag(dx)
  }
  const up = (e: ReactPointerEvent) => {
    if (start.current?.id !== e.pointerId) return
    start.current = null
    if (!moved.current) {
      setTurned((t) => !t)
      return
    }
    if (Math.abs(drag) > 90) go(false, drag > 0 ? 'right' : 'left')
    setDrag(0)
  }

  const flyStyle =
    fly === 'right'
      ? 'translateX(130%) rotate(18deg)'
      : fly === 'left'
        ? 'translateX(-130%) rotate(-18deg)'
        : fly === 'up'
          ? 'translateY(-120%) rotate(-6deg) scale(0.9)'
          : `translateX(${drag}px) rotate(${drag / 18}deg)`

  return (
    <div
      className="fx-rise absolute inset-0 touch-pan-y select-none"
      style={{
        transform: flyStyle,
        opacity: fly ? 0 : 1,
        transition:
          drag && !fly
            ? 'none'
            : 'transform 0.33s ease-in, opacity 0.33s ease-in',
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        start.current = null
        setDrag(0)
      }}
    >
      <Card3D
        turned={turned}
        className="h-full w-full cursor-pointer"
        faceClassName="rounded-[1.4rem] border-2 border-[#e9d9bd] shadow-[0_18px_40px_-18px_rgba(34,28,24,0.45)]"
        front={
          <div className="flex h-full flex-col items-center rounded-[1.3rem] bg-[#fffaf1] p-6 text-center">
            <CardHead n={n} of={of} />
            <div className="flex flex-1 flex-col items-center justify-center gap-7">
              <Ruby h={w.h} p={w.p} className="text-8xl" />
              <PlayButton
                onClick={() => void play(w.h)}
                speaking={speaking}
                size={56}
                hint={false}
              />
            </div>
            <p className="text-sm text-[var(--ink-2)]">
              Tap to turn it over <Key k="Enter" />
            </p>
          </div>
        }
        back={
          <div className="flex h-full flex-col overflow-y-auto rounded-[1.3rem] bg-[#fdf5e6] p-6 text-center">
            <CardHead n={n} of={of} />
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="flex items-center gap-3">
                <Ruby h={w.h} p={w.p} className="text-5xl" />
                <button
                  type="button"
                  onClick={() => void play(w.h)}
                  className="rounded-full p-2 text-[var(--jade)] hover:bg-[var(--paper-2)]"
                  aria-label="Hear it"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
              <p className="mt-3 text-2xl leading-tight font-black">{w.e}</p>
              {w.tags.includes('mw') && (
                <p className="mt-2 text-sm text-[var(--ink-2)]">
                  A measure word: it goes between a number and a thing (一张票,
                  one ticket).
                </p>
              )}
              {w.tags.includes('part') && (
                <p className="mt-2 text-sm text-[var(--ink-2)]">
                  A particle: a little word that colours a sentence. In mixed
                  text it shows as {w.g}.
                </p>
              )}
              {ex && (
                <div className="mt-4 w-full rounded-xl bg-[var(--paper)] p-3">
                  <p className="mb-2 text-[10px] font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
                    On the trip
                  </p>
                  <Mixed line={ex} fresh={new Set([w.id])} />
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Btn kind="ghost" onClick={() => go(true, 'up')}>
                I knew it <Key k="K" />
              </Btn>
              <Btn onClick={() => go(false, 'right')} className="px-7">
                Got it{' '}
                <Key
                  k="Enter"
                  className="ml-1 border-white/30 bg-white/15 text-white"
                />
              </Btn>
            </div>
          </div>
        }
      />
    </div>
  )
}

function CardHead({ n, of }: { n: number; of: number }) {
  return (
    <div className="flex w-full items-center justify-between">
      <span className="text-[10px] font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
        New word
      </span>
      <span className="flex gap-1">
        {Array.from({ length: of }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full ${i < n ? 'bg-[var(--jade)]' : i === n ? 'bg-[var(--red)]' : 'bg-[var(--paper-2)]'}`}
          />
        ))}
      </span>
    </div>
  )
}
