import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarClock,
  Check,
  Flame,
  Gamepad2,
  Layers,
  Play,
  SkipForward,
  X,
} from 'lucide-react'
import { SCENES } from '../data/trip'
import { WORD, WORDS } from '../data/words'
import { SEALS } from '../data/seals'
import { english, plain, tokens, wordIds } from '../lib/text'
import { toHanzi } from '../lib/numbers'
import { lineChoices } from '../lib/choices'
import { blip, say } from '../lib/audio'
import { LINKS, dayKey, due, streak } from '../lib/bank'
import { useStore } from '../lib/store'
import {
  LISTEN,
  allAnswered,
  current,
  finished,
  gain,
  lasts,
  markDone,
  partKey,
  plan,
  playedHere,
  share,
  shoreInstead,
  summary,
} from '../lib/today'
import {
  Btn,
  Frame,
  LINK_NAME,
  Mixed,
  Ruby,
  SpeakButton,
  shuffle,
  tokenLevel,
} from '../ui'
import { EnterToContinue, Quiz, questionsFor } from '../quiz'
import { Backdrop } from '../pixel/Backdrop'
import { Pix } from '../pixel/Pix'
import { Ring } from '../daily/Ring'
import { Seal } from '../daily/Seal'
import { thud } from '../daily/SealToaster'
import { GardenBand, GardenMini } from '../daily/GardenMini'
import { describe, gameOf } from '../daily/steps'
import { usePlay, useToday } from '../daily/useToday'
import { Key, PlayButton, useKeys, useSpeaker } from './fx'
import type { ArcState } from '../daily/Ring'
import type { Path, PathStep, StepKind } from '../lib/bank'
import type { Word } from '../data/words'
import '../daily/daily.css'

// Today: the day's session, about ten minutes in a few steps, around a
// ring that fills as they are done. Review, new words, shoring up and
// listening are played here; the parts of First steps and the trip on
// their own pages, and are found done on the way back. The plan is kept
// in the bank, with each answer as it is given, so the session can be
// left at any point, even halfway through a step, and taken up again the
// same day, on any device.

// Points for finishing a step played here
const BONUS: Partial<Record<StepKind, number>> = {
  review: 3,
  shore: 3,
  new: 5,
  listen: 2,
}

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']

const zhDate = (d: Date) =>
  `${toHanzi(d.getMonth() + 1)}月${toHanzi(d.getDate())}日 · 星期${WEEKDAY[d.getDay()]}`

export default function Today() {
  const { bank, setPath, points } = useStore()
  // The plan, with steps played elsewhere done, and the day counted when
  // all are
  const path = useToday()
  const [active, setActive] = useState<number | null>(null)
  // The step just done, to stamp on the way back
  const [justDone, setJustDone] = useState<number | null>(null)
  const over = !!path && finished(path)
  const play = usePlay()

  const start = () => {
    const p = plan(bank, Date.now())
    setPath(() => p)
    open(p, 0)
  }

  // Steps played here open in the page, and a part of the course on its
  // own; the trip waits on its card, to be put off
  const open = (p: Path, i: number) => {
    if (playedHere(p.steps[i])) setActive(i)
    else if (p.steps[i].k === 'course') return play(p, i)
    window.scrollTo(0, 0)
  }

  const complete = (i: number, skip = false) => {
    setPath((p) => (p ? markDone(p, i, Date.now(), skip) : p))
    setActive(null)
    setJustDone(i)
    window.scrollTo(0, 0)
  }

  // A step played here is done with its last answer, and earns its
  // points then, whether it is gone on from or left
  const finish = (i: number) => {
    if (!path || path.steps[i].done) return
    const bonus = BONUS[path.steps[i].k]
    if (bonus) points(bonus)
    setPath((p) => (p ? markDone(p, i, Date.now()) : p))
  }

  // Back to the overview, stamping the step if it was finished
  const back = (i: number, stamp: boolean) => {
    setActive(null)
    setJustDone(stamp ? i : null)
    window.scrollTo(0, 0)
  }

  if (path && active !== null)
    return (
      <StepPlayer
        path={path}
        i={active}
        onFinish={() => finish(active)}
        onDone={() => {
          finish(active)
          back(active, true)
        }}
        onLeave={() => back(active, !!path.steps[active].done)}
      />
    )

  if (path && over) return <Done path={path} />

  return (
    <Frame title="Today" zh="今天">
      <Overview
        path={path}
        justDone={justDone}
        onStart={start}
        onOpen={(i) => path && open(path, i)}
        onDone={complete}
      />
    </Frame>
  )
}

// --- The overview: the ring, and the steps

function Overview({
  path,
  justDone,
  onStart,
  onOpen,
  onDone,
}: {
  path: Path | null
  justDone: number | null
  onStart: () => void
  onOpen: (i: number) => void
  onDone: (i: number, skip?: boolean) => void
}) {
  const { bank, setPath } = useStore()
  const play = usePlay()
  const now = Date.now()
  const preview = useMemo(() => path ?? plan(bank, now), [path, bank])
  const at = current(preview)
  const days = streak(bank, now)
  const arcs: Array<ArcState> = preview.steps.map((s, i) =>
    s.done ? 'done' : path && i === at ? 'now' : 'todo',
  )
  // The arc of the step just done starts empty, and fills
  const [shown, setShown] = useState<Array<ArcState>>(() =>
    arcs.map((a, i) => (i === justDone ? 'todo' : a)),
  )
  const key = arcs.join()
  useEffect(() => {
    const t = setTimeout(() => setShown(key.split(',') as Array<ArcState>), 120)
    return () => clearTimeout(t)
  }, [key])
  const doneN = preview.steps.filter((s) => s.done).length
  const minutes = preview.steps
    .filter((s) => !s.done)
    .reduce((m, s) => m + describe(s).minutes, 0)
  const playedToday = (bank.days[dayKey(now)] ?? 0) > 0

  return (
    <>
      <div className="zh-card overflow-hidden">
        <GardenBand height={156} className="sm:!h-[184px]" />
        <div className="relative flex flex-col items-center gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:gap-5">
          <div className="-mt-16 shrink-0 rounded-full bg-[#fffaf1] p-1.5 shadow-lg">
            <Ring
              steps={shown}
              part={path && at >= 0 ? share(preview.steps[at]) : 0}
              size={124}
              width={9}
            >
              <div className="text-center leading-none">
                <div className="zh text-5xl">
                  {path && at >= 0 ? describe(preview.steps[at]).glyph : '今'}
                </div>
                <div className="mt-1 text-xs font-bold text-[var(--ink-2)] tabular-nums">
                  {doneN} / {preview.steps.length}
                </div>
              </div>
            </Ring>
          </div>
          <div className="min-w-0 flex-1 text-center sm:pb-1 sm:text-left">
            <p className="zh-sans text-sm text-[var(--ink-2)]">
              {zhDate(new Date(now))}
            </p>
            <p className="text-2xl leading-tight font-black">
              {new Date(now).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-[var(--red)]">
              <Flame size={16} />
              {days > 0
                ? `${days} ${days === 1 ? 'day' : 'days'} in a row${playedToday ? '' : ' – keep it going today'}`
                : 'Start a streak today'}
            </p>
          </div>
          {!path && (
            <Btn onClick={onStart} className="shrink-0 px-6 py-3 text-lg">
              <Play size={18} /> Start · {minutes} min
            </Btn>
          )}
        </div>
      </div>

      <ol className="relative mt-6 flex flex-col gap-3 pl-14 sm:pl-16">
        <span
          aria-hidden
          className="absolute top-7 bottom-7 left-[1.45rem] border-l-2 border-dashed border-[var(--red)]/30 sm:left-[1.7rem]"
        />
        {preview.steps.map((s, i) => (
          <StepRow
            key={`${i}-${s.k}-${s.arg ?? ''}`}
            step={s}
            n={i}
            now={!!path && i === at}
            stamped={i === justDone}
            onOpen={() => onOpen(i)}
            onPlay={() => path && play(path, i)}
            onDone={(skip) => onDone(i, skip)}
            onShore={
              path &&
              s.k === 'trip' &&
              shoreInstead(path, i, bank, now) !== path
                ? () =>
                    setPath((p) =>
                      p ? shoreInstead(p, i, bank, Date.now()) : p,
                    )
                : undefined
            }
          />
        ))}
      </ol>

      <p className="mt-5 text-center text-sm text-[var(--ink-2)]">
        {!path && 'The session is made from your word bank, once a day. '}
        Stop whenever you like, even halfway through a step: it keeps your place
        until the day is over.
      </p>
    </>
  )
}

function StepRow({
  step,
  n,
  now,
  stamped,
  onOpen,
  onPlay,
  onDone,
  onShore,
}: {
  step: PathStep
  n: number
  now: boolean
  // Done a moment ago: stamped as it comes into view
  stamped: boolean
  onOpen: () => void
  // Off to its own page
  onPlay: () => void
  onDone: (skip?: boolean) => void
  // Words to shore up instead of the trip, if enough are met
  onShore?: () => void
}) {
  const t = describe(step)
  // The trip waits on a card of its own, to be played, put off or
  // skipped, and so does a game from a session planned before games gave
  // way to shoring up; the rest open with a button
  const elsewhere = step.k === 'trip' || step.k === 'game'
  // Left partway: how far it got
  const part = step.done ? 0 : share(step)
  const scene = step.k === 'trip' ? SCENES.find((s) => s.id === step.arg) : null
  const game = step.k === 'game' ? gameOf(step.arg) : null

  useEffect(() => {
    if (!stamped || !step.done) return
    const tm = setTimeout(() => thud(n), 300)
    return () => clearTimeout(tm)
    // once, as it is shown
  }, [])

  return (
    <li className="relative">
      <span className="absolute top-2 -left-14 flex h-12 w-12 items-center justify-center sm:-left-16 sm:h-14 sm:w-14">
        {step.done ? (
          <span className={stamped ? 'zh-stamp' : ''}>
            <Seal
              seal={{
                id: `step-${n}`,
                zh: t.glyph,
                shape: n % 2 ? 'round' : 'square',
              }}
              size={48}
              faint={!!step.skip}
            />
          </span>
        ) : (
          <span
            className={`zh flex h-11 w-11 items-center justify-center rounded-full text-2xl sm:h-12 sm:w-12 ${
              now
                ? 'bg-[var(--gold)] text-[var(--ink)] shadow-md'
                : 'border-2 border-[var(--paper-2)] bg-[var(--paper)] text-[var(--ink-2)]'
            }`}
          >
            {t.glyph}
          </span>
        )}
      </span>
      <div
        className={`zh-card overflow-hidden transition ${now ? 'ring-2 ring-[var(--gold)]' : ''} ${step.done ? 'opacity-75' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="zh text-[var(--red)]">{t.zh}</span>
              <span className="font-black">{t.title}</span>
              <span className="ml-auto shrink-0 text-xs text-[var(--ink-2)]">
                {step.done
                  ? step.skip
                    ? 'skipped'
                    : 'done'
                  : `${t.minutes} min`}
              </span>
            </div>
            <p className="truncate text-sm text-[var(--ink-2)]">{t.detail}</p>
            {part > 0 && (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--paper-2)]">
                <div
                  className="h-full rounded-full bg-[var(--jade)] transition-[width] duration-700"
                  style={{ width: `${part * 100}%` }}
                />
              </div>
            )}
          </div>
          {now && !elsewhere && (
            <Btn onClick={onOpen} className="shrink-0 max-sm:w-full">
              {part > 0 ? 'Continue' : n === 0 ? 'Start' : 'Go'}{' '}
              <ArrowRight size={16} />
            </Btn>
          )}
        </div>
        {now && elsewhere && (
          <div className="border-t border-[var(--paper-2)] p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-3">
              {scene ? (
                <Backdrop
                  id={scene.id}
                  className="w-40 shrink-0 rounded-lg border-2 border-[var(--ink)]"
                />
              ) : game ? (
                <Pix name={game.sprite} size={56} />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {scene ? `Next stop: ${scene.title}` : game?.title}
                </p>
                <p className="text-sm text-[var(--ink-2)]">
                  {scene
                    ? 'Play the next scene of the trip, then come back here.'
                    : `${game?.blurb ?? ''} Play a round, then come back here.`}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={onPlay}>
                <Play size={16} /> Play
              </Btn>
              {step.pts !== undefined && (
                <Btn kind="jade" onClick={() => onDone()}>
                  <Check size={16} /> I played it
                </Btn>
              )}
              {onShore && (
                <Btn kind="ghost" onClick={onShore}>
                  <Layers size={16} /> Words instead
                </Btn>
              )}
              <Btn kind="ghost" onClick={() => onDone(true)}>
                <SkipForward size={16} /> Skip
              </Btn>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

// --- A step played in the page

function StepPlayer({
  path,
  i,
  onFinish,
  onDone,
  onLeave,
}: {
  path: Path
  i: number
  // Its last part answered
  onFinish: () => void
  // Gone on from
  onDone: () => void
  onLeave: () => void
}) {
  const { setPath } = useStore()
  const step = path.steps[i]
  const t = describe(step)
  const arcs: Array<ArcState> = path.steps.map((s, j) =>
    s.done ? 'done' : j === i ? 'now' : 'todo',
  )
  const words = (step.ids ?? []).flatMap((id) => WORD[id] ?? [])
  // Each answer is kept as it is given; the last finishes the step
  const got = (key: string) => {
    const next = gain(path, i, key)
    if (next === path) return
    setPath((p) => (p ? gain(p, i, key) : p))
    if (allAnswered(next.steps[i])) onFinish()
  }
  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-16">
      <header className="mb-5 flex items-center gap-3">
        <Ring steps={arcs} part={share(step)} size={46} width={12}>
          <span className="zh text-lg">{t.glyph}</span>
        </Ring>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--ink-2)] uppercase">
            Today · step {i + 1} of {path.steps.length}
          </p>
          <h1 className="flex items-baseline gap-2 text-xl font-black">
            <span className="zh font-normal text-[var(--red)]">{t.zh}</span>
            {t.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="ml-auto rounded-full p-2 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
          aria-label="Back to Today"
          title="Stop for now – your place is kept"
        >
          <X size={22} />
        </button>
      </header>
      {step.k === 'review' || step.k === 'shore' ? (
        <ReviewStep step={step} words={words} onGot={got} onDone={onDone} />
      ) : step.k === 'new' ? (
        <NewStep step={step} words={words} onGot={got} onDone={onDone} />
      ) : (
        <ListenStep step={step} onGot={got} onDone={onDone} />
      )}
    </div>
  )
}

interface StepProps {
  step: PathStep
  // Something answered, to keep in the step
  onGot: (key: string) => void
  onDone: () => void
}

// The words to review, a question each, but for those answered in an
// earlier sitting
function ReviewStep({
  step,
  words,
  onGot,
  onDone,
}: StepProps & { words: Array<Word> }) {
  const { bank } = useStore()
  const [questions] = useState(() =>
    questionsFor(
      words.filter((w) => !step.got?.includes(w.id)),
      bank.cards,
      Date.now(),
    ),
  )
  if (!questions.length) return <Empty onDone={onDone} />
  return (
    <Quiz
      questions={questions}
      before={words.length - questions.length}
      onSettle={(q) => onGot(q.w.id)}
      onDone={onDone}
    />
  )
}

function Empty({ onDone }: { onDone: () => void }) {
  return (
    <div className="zh-card p-8 text-center">
      <p className="text-[var(--ink-2)]">Nothing to do here today.</p>
      <Btn onClick={onDone} className="mt-4">
        On to the next
      </Btn>
    </div>
  )
}

// New words: each met on a card, then a short quiz on them all, on its
// meaning and by ear. Taken up again, it goes on from the card or the
// questions it was left at.
function NewStep({
  step,
  words,
  onGot,
  onDone,
}: StepProps & { words: Array<Word> }) {
  const { meet, know, putOff } = useStore()
  // Words put off on their card, left out of the questions
  const [put, setPut] = useState<Array<string>>([])
  const [todo] = useState(() =>
    words.filter((w) => !step.got?.includes(partKey(w.id, 'met'))),
  )
  const [questions] = useState(() =>
    shuffle(
      words.flatMap((w) =>
        (['meaning', 'listen'] as const)
          .filter((kind) => !step.got?.includes(partKey(w.id, kind)))
          .map((kind) => ({ w, kind })),
      ),
    ),
  )
  const [card, setCard] = useState(0)
  if (!todo.length && !questions.length) return <Empty onDone={onDone} />
  if (card >= todo.length) {
    const asked = questions.filter((q) => !put.includes(q.w.id))
    if (!asked.length) return <Empty onDone={onDone} />
    return (
      <Quiz
        questions={asked}
        before={(words.length - put.length) * 2 - asked.length}
        onSettle={(q) => onGot(partKey(q.w.id, q.kind))}
        onDone={onDone}
      />
    )
  }
  const w = todo[card]
  return (
    <MeetCard
      key={w.id}
      w={w}
      n={words.length - todo.length + card}
      of={words.length}
      onNext={(knew) => {
        if (knew) know([w.id])
        else meet([w.id])
        onGot(partKey(w.id, 'met'))
        setCard(card + 1)
      }}
      onLater={() => {
        putOff(w.id)
        setPut((p) => [...p, w.id])
        for (const part of ['met', 'meaning', 'listen'])
          onGot(partKey(w.id, part))
        setCard(card + 1)
      }}
    />
  )
}

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

// Also the course's way to meet a word (games/course.tsx)
export function MeetCard({
  w,
  n,
  of,
  onNext,
  onLater,
}: {
  w: Word
  n: number
  of: number
  onNext: (knew: boolean) => void
  // Put off, to be met another time
  onLater?: () => void
}) {
  const { settings } = useStore()
  const ex = useMemo(() => example(w, settings.home), [w, settings.home])
  // Asked first whether to put it off, as the icon is easy to press by chance
  const [asking, setAsking] = useState(false)
  useEffect(() => {
    void say(w.h)
  }, [w])
  return (
    <div className="zh-card zh-rise relative p-7 text-center">
      {onLater && (
        <button
          type="button"
          onClick={() => setAsking(true)}
          aria-label="Practise this word later"
          title="Practise this word later"
          className="absolute top-4 right-4 rounded-full p-2 text-[var(--ink-2)] opacity-60 hover:bg-[var(--paper)] hover:opacity-100"
        >
          <CalendarClock size={20} />
        </button>
      )}
      <p className="text-xs font-bold text-[var(--ink-2)] uppercase">
        New word {n + 1} of {of}
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Ruby h={w.h} p={w.p} className="text-7xl sm:text-8xl" />
        <SpeakButton text={w.h} size={26} />
      </div>
      <p className="mt-4 text-2xl font-bold">{w.e}</p>
      {w.tags.includes('mw') && (
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          A measure word: it goes between a number and a thing.
        </p>
      )}
      {ex && (
        <div className="mt-6 rounded-xl bg-[var(--paper)] p-4">
          <p className="mb-2 text-xs font-bold text-[var(--ink-2)] uppercase">
            On the trip
          </p>
          <Mixed line={ex} fresh={new Set([w.id])} />
        </div>
      )}
      {asking && onLater ? (
        <div className="mt-6 rounded-xl bg-[var(--paper)] p-4">
          <p className="font-bold">Practise this word later?</p>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            It goes to the back of the line, and comes up again once the other
            new words have been met.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <Btn kind="ghost" onClick={() => setAsking(false)}>
              Keep it
            </Btn>
            <Btn onClick={onLater}>Later</Btn>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex justify-center gap-2">
          <Btn kind="ghost" onClick={() => onNext(true)}>
            I knew it
          </Btn>
          <Btn onClick={() => onNext(false)} className="px-8">
            Got it
          </Btn>
        </div>
      )}
      {!asking && <EnterToContinue onEnter={() => onNext(false)} />}
    </div>
  )
}

// --- Listening: lines of the trip from scenes played, or words when
// there are too few

interface Heard {
  zh: string
  en: string
  voice: string
  scene: string
}

const HEARD: Array<Heard> = SCENES.flatMap((s) =>
  s.steps.flatMap((step) =>
    step.kind === 'line'
      ? [
          {
            zh: step.zh,
            en: step.en,
            voice: s.cast[step.by].voice,
            scene: s.id,
          },
        ]
      : [],
  ),
)

// Four lines or words, but for those heard in an earlier sitting: lines of
// the trip once enough scenes are played, or else words whose sound and
// meaning have faded most, each heard and its meaning picked
function ListenStep({ step, onGot, onDone }: StepProps) {
  const { bank } = useStore()
  const [heard] = useState(() => new Set(step.got))
  const want = Math.max(0, LISTEN - heard.size)
  const [lines] = useState(() => {
    const played = HEARD.filter((h) => bank.scenes[h.scene])
    return played.length >= LISTEN
      ? shuffle(played.filter((h) => !heard.has(h.zh))).slice(0, want)
      : []
  })
  const [words] = useState(() =>
    shuffle(
      due(bank, Date.now(), WORDS, 'sm')
        .map((d) => d.w)
        .filter((w) => !w.tags.includes('part') && !heard.has(w.id))
        .slice(0, want),
    ),
  )
  if (lines.length)
    return (
      <ListenLines
        lines={lines}
        before={heard.size}
        onHeard={(h) => onGot(h.zh)}
        onDone={onDone}
      />
    )
  if (words.length >= (heard.size ? 1 : 2))
    return (
      <Quiz
        questions={words.map((w) => ({ w, kind: 'hear' as const }))}
        before={heard.size}
        onSettle={(q) => onGot(q.w.id)}
        onDone={onDone}
      />
    )
  return <Empty onDone={onDone} />
}

function ListenLines({
  lines,
  before,
  onHeard,
  onDone,
}: {
  lines: Array<Heard>
  // Heard in an earlier sitting, for the progress bar
  before: number
  onHeard: (h: Heard) => void
  onDone: () => void
}) {
  const { settings, levelOf, record, points } = useStore()
  const { speaking, play } = useSpeaker()
  const vars = { home: settings.home }
  const homeName = WORD[settings.home]?.g ?? settings.home
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<{ en: string; at: number } | null>(null)
  const q = lines[i] as Heard | undefined
  const choices = useMemo(() => (q ? lineChoices(q, HEARD) : []), [q])
  const hear = () => {
    if (q) void play(plain(q.zh, vars), q.voice)
  }

  useEffect(() => {
    if (q) hear()
    else onDone()
  }, [i])

  const answer = (en: string) => {
    if (!q || picked) return
    setPicked({ en, at: Date.now() })
    const ok = en === q.en
    blip(ok ? 'right' : 'wrong')
    for (const t of tokens(q.zh, vars))
      if (t.id && !t.punct && tokenLevel(t, levelOf) > 0)
        record(t.id, ok, 0.3, 'sm')
    if (ok) points(1)
    onHeard(q)
  }
  const next = () => {
    setPicked(null)
    setI((x) => x + 1)
  }

  // The keys of the other games: 1–4 to choose, Space to hear it again,
  // Enter to go on
  useKeys((key) => {
    if (!q) return
    if (key === ' ') {
      hear()
      return true
    }
    if (picked) {
      if (key !== 'Enter' || Date.now() - picked.at < 150) return
      next()
      return true
    }
    const n = Number(key)
    if (n >= 1 && n <= choices.length) {
      answer(choices[n - 1])
      return true
    }
  })

  if (!q) return null

  return (
    <div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--paper-2)]">
        <div
          className="h-full rounded-full bg-[var(--jade)] transition-all"
          style={{
            width: `${((before + i) / (before + lines.length)) * 100}%`,
          }}
        />
      </div>
      <div key={i} className="zh-card zh-rise p-6 text-center">
        <p className="text-sm font-bold text-[var(--ink-2)] uppercase">
          What do they say?
        </p>
        <PlayButton
          onClick={hear}
          speaking={speaking}
          size={80}
          className="mt-3"
        />
        <div className="mt-6 grid gap-2">
          {choices.map((c, n) => {
            const state = !picked
              ? ''
              : c === q.en
                ? 'ring-2 ring-[var(--jade)] bg-[var(--jade)]/10'
                : picked.en === c
                  ? 'ring-2 ring-[var(--red)] zh-shake'
                  : 'opacity-40'
            return (
              <button
                key={c}
                type="button"
                onClick={() => answer(c)}
                className={`flex items-center gap-3 rounded-xl bg-[var(--paper)] px-4 py-3 text-left transition hover:bg-[var(--paper-2)] ${state}`}
              >
                <Key k={String(n + 1)} className="shrink-0" />
                {english(c, homeName)}
              </button>
            )
          })}
        </div>
        {picked ? (
          <div className="zh-rise mt-5">
            <Mixed line={q.zh} />
            <div className="mt-4">
              <Btn onClick={next}>
                Next{' '}
                <Key
                  k="Enter"
                  className="ml-1 border-white/30 bg-white/15 text-white"
                />
              </Btn>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[var(--ink-2)] max-sm:hidden">
            <Key k="1" />–<Key k={String(choices.length)} /> to choose,{' '}
            <Key k="Space" /> to hear it again
          </p>
        )}
      </div>
    </div>
  )
}

// --- The end of the session

const DONE_SEAL = { id: 'today-done', zh: '完', shape: 'round' as const }

function Done({ path }: { path: Path }) {
  const { bank } = useStore()
  const now = Date.now()
  const s = useMemo(() => summary(path, bank, now), [path, bank])
  const seals = SEALS.filter((x) => (bank.seals[x.id] ?? 0) >= path.t)
  const stronger = s.words
    .filter((w) => w.before === null || w.after > w.before)
    .sort((a, b) => b.after - a.after)
  const [stamp, setStamp] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => thud(), 320)
    return () => clearTimeout(t)
  }, [])

  return (
    <Frame title="Today" zh="今天">
      <div className="zh-card relative overflow-hidden text-center">
        <GardenBand height={132} className="sm:!h-[160px]" />
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={() => {
              setStamp((n) => n + 1)
              setTimeout(() => thud(stamp + 1), 300)
            }}
            className="mx-auto -mt-14 block rounded-full bg-[#fffaf1] p-2 shadow-lg"
            aria-label="Stamp it again"
          >
            <span key={stamp} className="zh-stamp block">
              <Seal seal={DONE_SEAL} size={104} />
            </span>
          </button>
          <p className="mt-3 text-2xl font-black">Done for today</p>
          <p className="text-[var(--ink-2)]">
            完 wán: finished.{' '}
            {s.streak > 1
              ? `${s.streak} days in a row.`
              : 'The first day of a streak.'}
          </p>
          <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2">
            <Stat value={s.points} label="points today" color="var(--gold)" />
            <Stat
              value={s.known}
              label={s.knownGain ? `known, +${s.knownGain}` : 'known'}
              color="var(--red)"
            />
            <Stat
              value={s.met}
              label={s.metGain ? `met, +${s.metGain}` : 'met'}
              color="var(--jade)"
            />
          </div>
        </div>
      </div>

      {stronger.length > 0 && (
        <section className="zh-card mt-4 p-5">
          <h2 className="mb-3 font-black">Stronger now</h2>
          <ul className="flex flex-col gap-2">
            {stronger.slice(0, 10).map((w) => {
              const word = WORD[w.id]
              if (!word) return null
              const width = Math.min(
                100,
                (Math.log2(1 + w.after * 4) / 6) * 100,
              )
              return (
                <li key={w.id} className="flex items-center gap-3">
                  <Ruby
                    h={word.h}
                    p={word.p}
                    className="w-20 shrink-0 text-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{word.e}</p>
                    <div
                      className="mt-1 flex items-center gap-1.5"
                      title={LINK_NAME[w.link].en}
                    >
                      <span className="zh shrink-0 text-xs leading-none text-[var(--ink-2)]">
                        {LINK_NAME[w.link].zh}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--paper-2)]">
                        <div
                          className="h-full rounded-full bg-[var(--jade)] transition-all duration-1000"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-right text-xs text-[var(--ink-2)] tabular-nums">
                    {w.before === null ? 'new' : lasts(w.before)} →{' '}
                    <b className="text-[var(--ink)]">{lasts(w.after)}</b>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-[var(--ink-2)]">
            How long each will last before it starts to fade, by the link that
            grew most:{' '}
            {LINKS.map((l, i) => (
              <span key={l}>
                {i > 0 && ', '}
                <span className="zh">{LINK_NAME[l].zh}</span> {LINK_NAME[l].en}
              </span>
            ))}
            .
          </p>
        </section>
      )}

      {seals.length > 0 && (
        <section className="zh-card mt-4 p-5">
          <h2 className="mb-3 font-black">Seals today</h2>
          <div className="flex flex-wrap gap-3">
            {seals.map((x) => (
              <a
                key={x.id}
                href="#seals"
                className="flex flex-col items-center gap-1"
              >
                <Seal seal={x} size={64} />
                <span className="text-xs font-bold">{x.title}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <a
          href="#garden"
          className="zh-card block overflow-hidden transition hover:-translate-y-0.5"
        >
          <GardenMini />
        </a>
        <div className="zh-card flex flex-col justify-center p-5">
          <p className="text-sm text-[var(--ink-2)]">Tomorrow</p>
          <p className="text-lg font-bold">
            {s.tomorrow
              ? `${s.tomorrow} ${s.tomorrow === 1 ? 'word' : 'words'} will need reviewing.`
              : 'New words, and the next stop.'}
          </p>
          <div className="mt-3 flex items-center gap-1">
            <SpeakButton text="明天见！" size={16} className="-ml-2" />
            <Mixed line="明天 见 ！" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="#">
              <Btn kind="ghost">Home</Btn>
            </a>
            <a href="#mahjong">
              <Btn>
                <Gamepad2 size={16} /> Keep playing
              </Btn>
            </a>
          </div>
        </div>
      </section>
    </Frame>
  )
}

function Stat({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  return (
    <div className="rounded-xl bg-[var(--paper)] px-2 py-3">
      <div className="text-2xl font-black tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-[var(--ink-2)]">{label}</div>
    </div>
  )
}
