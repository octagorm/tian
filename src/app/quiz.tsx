import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { WORDS } from './data/words'
import { join, matches, syllables } from './lib/pinyin'
import { blip } from './lib/audio'
import { wordChoices } from './lib/choices'
import { useStore } from './lib/store'
import { Btn, Ruby, shuffle } from './ui'
import {
  Combo,
  CountUp,
  Key,
  PlayButton,
  Progress,
  burst,
  cheer,
  confetti,
  floatText,
  reducedMotion,
  replay,
  useKeys,
  useSpeaker,
} from './games/fx'
import { Pix } from './pixel/Pix'
import type { ReactNode } from 'react'
import type { Word } from './data/words'

// A round of questions about words, shared by Learn and Review. Each
// question asks one thing in one way, and tells the bank how much the
// answer says: typing the pinyin counts for more than picking a meaning.
// A word answered wrong comes back once at the end of the round.
//
// It plays with the keyboard (1–4 to choose, Enter for the next, Space to
// hear the word again) and with a thumb: on a phone the choices sit at the
// bottom of the screen. A right answer bursts and counts up a streak; a
// wrong one shakes and shows the answer.

export type Kind = 'meaning' | 'listen' | 'reverse' | 'type'

const WEIGHT: Record<Kind, number> = {
  meaning: 0.6,
  listen: 0.7,
  reverse: 0.7,
  type: 1,
}

export interface Question {
  w: Word
  kind: Kind
}

interface Answered {
  right: boolean
  picked?: string
  // When, so the Enter that answered does not also go on
  t: number
}

export function Quiz({
  questions,
  onDone,
  onSettle,
  before = 0,
  fill = true,
}: {
  questions: Array<Question>
  onDone: (right: number, total: number) => void
  // A question answered for good: right, or wrong a second time, so it
  // will not come back this round
  onSettle?: (q: Question) => void
  // Questions answered in an earlier sitting, for the progress bar
  before?: number
  // On a phone, fill the screen's height so the choices sit at the bottom,
  // in reach of a thumb; false where the quiz is one part of a page
  fill?: boolean
}) {
  const { record, bank } = useStore()
  const [queue, setQueue] = useState(questions)
  const [at, setAt] = useState(0)
  const [answered, setAnswered] = useState<Answered | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  // Where in the progress bar an answer was wrong
  const [missed, setMissed] = useState<Array<number>>([])
  const [leaving, setLeaving] = useState(false)
  const retried = useRef(new Set<string>())
  const buttons = useRef(new Map<string, HTMLButtonElement | null>())
  const prompt = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { speaking, play } = useSpeaker()
  const q = queue[at] as Question | undefined
  const pool = useMemo(() => {
    const met = WORDS.filter((w) => bank.cards[w.id])
    return met.length >= 8 ? met : WORDS.slice(0, 40)
    // the pool for distractors, once
  }, [])
  const choices = useMemo(
    () => (q && q.kind !== 'type' ? wordChoices(q.w, pool, q.kind) : []),
    [q, pool],
  )

  useEffect(() => {
    if (!q) onDone(score, questions.length)
  }, [at, queue.length])

  // a word to listen to is said as its question comes up
  useEffect(() => {
    if (q?.kind === 'listen') void play(q.w.h)
  }, [at])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const settle = (right: boolean, picked?: string, from?: Element | null) => {
    if (answered || !q) return
    setAnswered({ right, picked, t: Date.now() })
    blip(right ? 'right' : 'wrong')
    const firstTime = !retried.current.has(q.w.id)
    record(q.w.id, right, firstTime ? WEIGHT[q.kind] : WEIGHT[q.kind] / 2)
    if (right) {
      if (firstTime) {
        setScore((s) => s + 1)
        cheer(from, '+1')
      } else burst(from)
      replay(prompt.current, 'fx-glow-text')
      const n = streak + 1
      setStreak(n)
      if (n % 5 === 0)
        floatText(prompt.current, `加油 ×${n}`, {
          color: '#c8372d',
          size: 30,
        })
    } else {
      setStreak(0)
      setMissed((m) => [...m, before + at])
      if (firstTime) {
        retried.current.add(q.w.id)
        setQueue((qs) => [
          ...qs,
          { w: q.w, kind: q.kind === 'type' ? 'meaning' : q.kind },
        ])
      }
    }
    if (right || !firstTime) onSettle?.(q)
    if (q.kind !== 'listen' || !right) void play(q.w.h)
  }

  const next = () => {
    if (!answered || leaving) return
    if (reducedMotion()) {
      setAnswered(null)
      setAt((a) => a + 1)
      return
    }
    setLeaving(true)
    timer.current = setTimeout(() => {
      setLeaving(false)
      setAnswered(null)
      setAt((a) => a + 1)
    }, 190)
  }

  useKeys((key) => {
    if (!q) return
    if (key === ' ') {
      if (q.kind !== 'listen' && !answered) return
      void play(q.w.h)
      return true
    }
    if (answered) {
      if (key !== 'Enter' || Date.now() - answered.t < 150) return
      next()
      return true
    }
    if (q.kind === 'type' || !/^[1-4]$/.test(key)) return
    const c = choices[Number(key) - 1] as Word | undefined
    if (!c) return
    settle(c.id === q.w.id, c.id, buttons.current.get(c.id))
    return true
  })

  if (!q) return null

  return (
    <div
      className={`flex flex-col ${fill ? 'max-sm:min-h-[calc(100dvh-8.5rem)]' : ''}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <Progress
          at={before + at + (answered ? 1 : 0)}
          of={before + queue.length}
          missed={missed}
          className="flex-1"
        />
        <Combo n={streak} />
      </div>
      <div
        key={at}
        className={`zh-card flex flex-1 flex-col p-5 sm:p-7 ${leaving ? 'fx-leave' : 'fx-enter'}`}
      >
        <div
          ref={prompt}
          className="flex flex-1 flex-col items-center justify-center py-2"
        >
          <Prompt
            q={q}
            reveal={!!answered}
            speaking={speaking}
            onPlay={() => void play(q.w.h)}
          />
        </div>
        {q.kind === 'type' ? (
          <TypeAnswer
            q={q}
            answered={answered}
            onAnswer={(r, el) => settle(r, undefined, el)}
          />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
            {choices.map((c, i) => (
              <Choice
                key={c.id}
                ref={(el) => {
                  buttons.current.set(c.id, el)
                }}
                n={i + 1}
                c={c}
                kind={q.kind}
                answered={answered}
                isRight={c.id === q.w.id}
                onPick={(el) => settle(c.id === q.w.id, c.id, el)}
              />
            ))}
          </div>
        )}
        <Verdict q={q} answered={answered} onNext={next} />
      </div>
    </div>
  )
}

function Choice({
  ref,
  n,
  c,
  kind,
  answered,
  isRight,
  onPick,
}: {
  ref: (el: HTMLButtonElement | null) => void
  n: number
  c: Word
  kind: Kind
  answered: Answered | null
  isRight: boolean
  onPick: (el: HTMLButtonElement) => void
}) {
  const picked = answered?.picked === c.id
  const look = !answered
    ? 'border-[var(--paper-2)] bg-[var(--paper)] shadow-[0_3px_0_var(--paper-2)] hover:-translate-y-0.5 hover:border-[var(--gold)] active:translate-y-0.5 active:shadow-none'
    : isRight
      ? `border-[var(--jade)] bg-[#e3f0ea] ${picked ? 'fx-pulse' : 'fx-beacon'}`
      : picked
        ? 'fx-shake border-[var(--red)] bg-[#f8e1dc]'
        : 'border-transparent bg-[var(--paper)] opacity-45'
  return (
    <button
      ref={ref}
      type="button"
      disabled={!!answered}
      onClick={(e) => onPick(e.currentTarget)}
      className={`relative flex min-h-[4.75rem] flex-col items-center justify-center rounded-2xl border-2 px-3 py-2.5 text-center transition duration-150 ${look}`}
    >
      <Key k={String(n)} className="absolute top-1.5 left-1.5" />
      {picked && !isRight && (
        <X
          size={18}
          strokeWidth={3}
          className="absolute top-1.5 right-1.5 text-[var(--red)]"
        />
      )}
      {kind === 'meaning' ? (
        <>
          <span className="text-base leading-snug font-semibold sm:text-lg">
            {c.e}
          </span>
          {answered && (isRight || picked) && (
            <span className="fx-rise zh mt-0.5 text-lg text-[var(--ink-2)]">
              {c.h}
            </span>
          )}
        </>
      ) : (
        <>
          {answered && (isRight || picked) ? (
            <Ruby h={c.h} p={c.p} className="text-3xl sm:text-4xl" />
          ) : (
            <span className="zh text-3xl sm:text-4xl">{c.h}</span>
          )}
          {answered && (isRight || picked) && (
            <span className="fx-rise mt-0.5 line-clamp-1 text-xs text-[var(--ink-2)]">
              {c.e}
            </span>
          )}
        </>
      )}
    </button>
  )
}

function Verdict({
  q,
  answered,
  onNext,
}: {
  q: Question
  answered: Answered | null
  onNext: () => void
}) {
  return (
    <div className="mt-4 flex min-h-[4.5rem] items-center gap-3 border-t border-dashed border-[var(--paper-2)] pt-3">
      {answered ? (
        <>
          {/* The verdict and the word on one row, the meaning under them in
              at most two lines: short enough for a phone */}
          <div className="fx-rise min-w-0 flex-1">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <span
                className={`flex items-baseline gap-1 text-sm font-black ${answered.right ? 'text-[var(--jade)]' : 'text-[var(--red)]'}`}
              >
                {answered.right ? (
                  <>
                    <Ruby h="对" p="duì" className="text-xl" /> right
                  </>
                ) : (
                  <>
                    <Ruby h="不对" p="bù duì" className="text-xl" /> it is
                  </>
                )}
              </span>
              <span className={answered.right ? '' : 'fx-pop'}>
                <Ruby h={q.w.h} p={q.w.p} className="text-2xl sm:text-3xl" />
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[var(--ink-2)] sm:text-base">
              {q.w.e}
            </p>
          </div>
          <Btn onClick={onNext} className="shrink-0 px-5 py-2.5 sm:py-3">
            Next{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </>
      ) : (
        <p className="w-full text-center text-xs text-[var(--ink-2)]">
          {q.kind === 'type' ? (
            <>
              Type it and press <Key k="Enter" />
            </>
          ) : (
            <span className="max-sm:hidden">
              <Key k="1" />–<Key k="4" /> to choose
              {q.kind === 'listen' && (
                <>
                  , <Key k="Space" /> to hear it again
                </>
              )}
            </span>
          )}
        </p>
      )}
    </div>
  )
}

function Prompt({
  q,
  reveal,
  speaking,
  onPlay,
}: {
  q: Question
  reveal: boolean
  speaking: boolean
  onPlay: () => void
}) {
  const { levelOf } = useStore()
  const learning = levelOf(q.w.id) < 2
  const label = (text: string) => (
    <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
      {text}
    </p>
  )
  if (q.kind === 'listen')
    return (
      <div className="text-center">
        {label('Which word do you hear?')}
        <PlayButton
          onClick={onPlay}
          speaking={speaking}
          className="mt-4"
          hint={!reveal}
        />
        {reveal && (
          <div className="fx-rise mt-3">
            <Ruby h={q.w.h} p={q.w.p} className="text-5xl" />
          </div>
        )}
      </div>
    )
  if (q.kind === 'reverse')
    return (
      <div className="text-center">
        {label('Which is…')}
        <p className="mt-3 text-3xl leading-tight font-black sm:text-4xl">
          {q.w.e}
        </p>
      </div>
    )
  return (
    <div className="text-center">
      {label(q.kind === 'type' ? 'Type the pinyin' : 'What does it mean?')}
      <div className="mt-3">
        {(learning && q.kind === 'meaning') || reveal ? (
          <Ruby h={q.w.h} p={q.w.p} className="text-7xl sm:text-8xl" />
        ) : (
          <span className="zh text-7xl sm:text-8xl">{q.w.h}</span>
        )}
      </div>
    </div>
  )
}

function TypeAnswer({
  q,
  answered,
  onAnswer,
}: {
  q: Question
  answered: Answered | null
  onAnswer: (right: boolean, el: Element | null) => void
}) {
  const { settings } = useStore()
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  const state = !answered
    ? 'border-[var(--paper-2)] focus:border-[var(--jade)]'
    : answered.right
      ? 'fx-pulse border-[var(--jade)] bg-[#e3f0ea]'
      : 'fx-shake border-[var(--red)] bg-[#f8e1dc] line-through decoration-[var(--red)]/60'
  return (
    <form
      className="mt-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!answered && text.trim())
          onAnswer(matches(text, q.w.p, settings.tones), input.current)
      }}
    >
      <div className="flex gap-2">
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!!answered}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label="Pinyin"
          placeholder={settings.tones ? 'e.g. ni3hao3' : 'e.g. nihao'}
          className={`min-w-0 flex-1 rounded-2xl border-2 bg-white px-4 py-3 text-center text-2xl outline-none transition ${state}`}
        />
        <Btn type="submit" disabled={!!answered} kind="jade" className="px-5">
          Check
        </Btn>
      </div>
      {answered && !answered.right && (
        <p className="fx-rise mt-2 text-center text-[var(--ink-2)]">
          It is{' '}
          <span className="text-2xl font-bold text-[var(--jade)]">
            {join(syllables(q.w.p))}
          </span>
        </p>
      )}
    </form>
  )
}

export function EnterToContinue({ onEnter }: { onEnter: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onEnter()
      }
    }
    // after the keypress that answered
    const t = setTimeout(() => window.addEventListener('keydown', key), 150)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', key)
    }
  }, [onEnter])
  return null
}

// Questions for a set of words: the ways to ask each depend on how well it
// is known
export function questionsFor(
  words: Array<Word>,
  levelOf: (id: string) => number,
): Array<Question> {
  const out: Array<Question> = []
  for (const w of words) {
    const lv = levelOf(w.id)
    const kinds: Array<Kind> =
      lv <= 1
        ? ['meaning', 'listen', 'reverse']
        : ['listen', 'reverse', 'type', 'type']
    out.push({ w, kind: kinds[Math.floor(Math.random() * kinds.length)] })
  }
  return shuffle(out)
}

// Stars for a share of right answers: all but a slip, most, some
export const starsFor = (right: number, total: number) => {
  const r = total ? right / total : 0
  return r >= 0.95 ? 3 : r >= 0.7 ? 2 : r >= 0.4 ? 1 : 0
}

// The end of a round: stars that pop in one by one, the score counting
// up, and paper confetti for a round with every answer right
export function RoundDone({
  right,
  total,
  sprite = 'star',
  children,
  actions,
}: {
  right: number
  total: number
  sprite?: string
  children?: ReactNode
  actions?: ReactNode
}) {
  const stars = starsFor(right, total)
  useEffect(() => {
    if (stars < 3) return
    blip('win')
    confetti()
  }, [])
  return (
    <div className="zh-card fx-pop relative overflow-hidden px-6 py-8 text-center sm:px-10">
      <div className="flex items-end justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="fx-pop inline-block"
            style={{ animationDelay: `${250 + i * 180}ms` }}
          >
            <Pix
              name="star"
              size={i === 1 ? 56 : 44}
              className={i < stars ? '' : 'opacity-20 grayscale'}
            />
          </span>
        ))}
      </div>
      <div className="mt-3">
        <Pix name={sprite} size={64} />
      </div>
      <p className="mt-2 text-3xl font-black">
        <CountUp to={right} /> of {total} right
      </p>
      {children}
      {actions && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
