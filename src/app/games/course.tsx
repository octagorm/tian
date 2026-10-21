import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react'
import { COURSE, PARTS } from '../data/course'
import { TONE_SETS, TONE_SET_PINYIN } from '../data/tones'
import { BUILT, RADICALS } from '../data/parts'
import { CONTRASTS, frames } from '../data/pinyin'
import { WORD } from '../data/words'
import { blip, say } from '../lib/audio'
import { answer, newCard, recall } from '../lib/bank'
import { WORD_VOICE } from '../lib/speech'
import { useStore } from '../lib/store'
import { english, plain, tokens } from '../lib/text'
import { numberPinyin, value } from '../lib/numbers'
import { numberChoices } from '../lib/choices'
import { TONE_NAME, join } from '../lib/pinyin'
import {
  dayDone,
  dayOf,
  doneToday,
  finished,
  hideKey,
  isDone,
  lineOf,
  nextPart,
  offered,
  partKey,
  partsDone,
  restToday,
  setOpenPart,
  takeWanted,
} from '../lib/course'
import { todays } from '../lib/today'
import { Btn, Frame, LEVEL_COLOR, Mixed, Ruby, shuffle, usePeek } from '../ui'
import { EnterToContinue, Quiz } from '../quiz'
import { Seal } from '../ornament'
import { MeetCard } from './today'
import { ToneGlyph } from './tones'
import {
  Combo,
  Key,
  PlayButton,
  Progress,
  cheer,
  useKeys,
  useSpeaker,
} from './fx'
import type { ReactNode } from 'react'
import type { Day, Glyph, Part, Screen, Show } from '../data/course'
import type { Question } from '../quiz'
import type { Level } from '../lib/bank'

// First steps (入门): the beginner's course of data/course.ts. The page
// lists the seven days and their parts; a part plays its screens one at
// a time, and is marked done in the bank at its end (lib/course.ts). A
// part left halfway starts again next time: none is longer than a few
// minutes.

const DAY_ZH = ['一', '二', '三', '四', '五', '六', '七']

// Points for a part finished, on top of a point for each right answer
const BONUS = 2

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ?part=2b&screen=3#start opens a part at a screen, to look at it
const fromUrl = () => {
  const q = new URLSearchParams(window.location.search)
  const part = q.get('part')
  return part && PARTS.some((p) => p.id === part)
    ? { part, screen: Number(q.get('screen') ?? 1) - 1 }
    : null
}

export default function Course() {
  const [open, setOpen] = useState<{ part: string; screen: number } | null>(
    () => {
      const wanted = takeWanted()
      return wanted ? { part: wanted, screen: 0 } : fromUrl()
    },
  )
  const part = open && PARTS.find((p) => p.id === open.part)
  // The part open, for the way back to Today; none once the page is left
  useEffect(() => setOpenPart(part ? part.id : null), [part])
  useEffect(() => () => setOpenPart(null), [])
  const show = (id: string | null) => {
    setOpen(id ? { part: id, screen: 0 } : null)
    window.scrollTo(0, 0)
  }
  if (part)
    return (
      <Player
        key={part.id}
        part={part}
        first={open.screen}
        onOpen={show}
        onClose={() => show(null)}
      />
    )
  return <Overview onOpen={show} />
}

// --- The course: the seven days, and the next part

function Overview({ onOpen }: { onOpen: (id: string) => void }) {
  const { bank } = useStore()
  const now = Date.now()
  const next = nextPart(bank)
  const rest = restToday(bank, now)
  const doneDay = rest && doneToday(bank, now)
  const done = partsDone(bank)
  return (
    <Frame title="First steps" zh="入门">
      <section className="zh-card relative overflow-hidden p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <Seal
            text="入门"
            size={64}
            tilt={-3}
            title="入门 rùmén, in at the gate: to get started"
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="leading-snug text-[var(--ink-2)]">
              New to Chinese? Seven days of three short parts, about ten minutes
              a day. How Chinese is written and said, how its sentences are
              built, and your first words. Take them in order, or start with any
              part.
            </p>
            <div className="mt-3">
              <Progress at={done} of={PARTS.length} />
            </div>
          </div>
        </div>
        {next ? (
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--paper-2)] pt-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--ink-2)] uppercase">
                {doneDay
                  ? `Day ${doneDay.n} done`
                  : done
                    ? 'Next'
                    : 'Start here'}
              </p>
              <p className="font-bold">
                {rest
                  ? `Day ${rest.n}, ${rest.title.toLowerCase()}, is for tomorrow`
                  : `Day ${dayOf(next).n}: ${next.title}`}
              </p>
              <p className="text-sm text-[var(--ink-2)]">
                {rest
                  ? 'Sleeping on what you learnt helps it stay.'
                  : `About ${next.minutes} minutes`}
              </p>
            </div>
            <Btn
              kind={rest ? 'ghost' : 'red'}
              onClick={() => onOpen(next.id)}
              className="px-5"
            >
              {rest ? 'Start it now' : done ? 'Continue' : 'Begin'}
              <ArrowRight size={18} />
            </Btn>
          </div>
        ) : (
          <p className="mt-5 border-t border-[var(--paper-2)] pt-4 font-bold">
            All seven days done. Every part can be taken again.
          </p>
        )}
      </section>
      <ol className="mt-6 space-y-4">
        {COURSE.map((day) => (
          <DayCard key={day.n} day={day} next={next} onOpen={onOpen} />
        ))}
      </ol>
      <HideToggle />
    </Frame>
  )
}

function DayCard({
  day,
  next,
  onOpen,
}: {
  day: Day
  next: Part | null
  onOpen: (id: string) => void
}) {
  const { bank } = useStore()
  const done = dayDone(bank, day)
  const here = !!next && day.parts.includes(next)
  return (
    <li
      className={`zh-card overflow-hidden ${here ? 'ring-2 ring-[var(--gold)]' : ''}`}
    >
      <div className="flex items-start gap-3.5 p-4 pb-2 sm:p-5 sm:pb-2">
        <Seal
          text={DAY_ZH[day.n - 1]}
          size={40}
          faded={!done}
          tilt={(day.n % 3) - 1}
          title={done ? `Day ${day.n} done` : `Day ${day.n}`}
        />
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--ink-2)] uppercase">
            Day {day.n}
          </p>
          <h2 className="flex flex-wrap items-baseline gap-x-2">
            <span className="zh-head text-xl">{day.title}</span>
            <span className="zh text-lg text-[var(--red)]" title={day.py}>
              {day.zh}
            </span>
          </h2>
          <p className="text-sm text-[var(--ink-2)]">{day.blurb}</p>
        </div>
      </div>
      <ul className="px-2 pb-2 sm:px-3 sm:pb-3">
        {day.parts.map((p, i) => {
          const ok = isDone(bank, p.id)
          const now = next === p
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-[var(--paper-2)] ${now ? 'bg-[var(--paper)]' : ''}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${ok ? 'bg-[var(--jade)] text-white' : now ? 'bg-[var(--red)] text-white' : 'bg-[var(--paper-2)] text-[var(--ink-2)]'}`}
                >
                  {ok ? <Check size={16} strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{p.title}</span>
                  <span className="block text-xs text-[var(--ink-2)]">
                    {ok ? 'Done · take it again' : `About ${p.minutes} minutes`}
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  className={now ? 'text-[var(--red)]' : 'text-[var(--ink-2)]'}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </li>
  )
}

// For those who know the basics: off the home screen, still here
function HideToggle() {
  const { bank, setScene } = useStore()
  if (finished(bank)) return null
  const on = offered(bank)
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-sm text-[var(--ink-2)]">
      <span>
        {on
          ? 'Know the basics already?'
          : 'First steps is not on the home screen. It is here, and under Skills.'}
      </span>
      <Btn
        kind="ghost"
        className="px-3 py-1.5 text-sm"
        onClick={() => setScene(hideKey(on), Date.now())}
      >
        {on ? <EyeOff size={16} /> : <Eye size={16} />}
        {on ? 'Hide it from the home screen' : 'Show it on the home screen'}
      </Btn>
    </div>
  )
}

// --- A part, a screen at a time

function Player({
  part,
  first,
  onOpen,
  onClose,
}: {
  part: Part
  first: number
  onOpen: (id: string | null) => void
  onClose: () => void
}) {
  const { setScene, points } = useStore()
  const day = dayOf(part)
  const last = part.screens.length
  const [at, setAt] = useState(() => Math.max(0, Math.min(first, last - 1)))
  const closed = useRef(false)

  // Each screen goes on from itself, so a second call does nothing
  const next = (from: number) => () => {
    if (from + 1 >= last && !closed.current) {
      closed.current = true
      setScene(partKey(part.id), Date.now())
      points(BONUS)
    }
    setAt((a) => Math.max(a, from + 1))
    window.scrollTo(0, 0)
  }
  const s = at < last ? part.screens[at] : null
  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-16">
      <header className="mb-4 flex items-center gap-3">
        <Seal text={DAY_ZH[day.n - 1]} size={38} tilt={-2} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[var(--ink-2)] uppercase">
            First steps · day {day.n}
          </p>
          <h1 className="truncate text-xl font-black">{part.title}</h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
          aria-label="Back to First steps"
          title="Stop for now"
        >
          <X size={22} />
        </button>
      </header>
      {!s ? (
        <PartDone part={part} onOpen={onOpen} onClose={onClose} />
      ) : (
        <>
          {/* Screens with a progress bar of their own keep to it */}
          {!['quiz', 'ear'].includes(s.k) && (
            <Progress at={at} of={last} className="mb-4" />
          )}
          <ScreenView key={at} s={s} onNext={next(at)} />
        </>
      )}
    </div>
  )
}

function ScreenView({ s, onNext }: { s: Screen; onNext: () => void }) {
  if (s.k === 'read') return <Read s={s} onNext={onNext} />
  if (s.k === 'meet') return <Meet ids={s.ids} onNext={onNext} />
  if (s.k === 'quiz') return <WordQuiz ids={s.ids} onNext={onNext} />
  if (s.k === 'ask') return <Ask s={s} onNext={onNext} />
  if (s.k === 'ear') return <Ear s={s} onNext={onNext} />
  return <Build lines={s.lines} onNext={onNext} />
}

function PartDone({
  part,
  onOpen,
  onClose,
}: {
  part: Part
  onOpen: (id: string | null) => void
  onClose: () => void
}) {
  const { bank } = useStore()
  const day = dayOf(part)
  const whole = dayDone(bank, day)
  const next = nextPart(bank)
  const rest = restToday(bank, Date.now())
  const all = finished(bank)
  // A step of today's session: back to it, to go on from there
  const inToday = !!todays(bank, Date.now())?.steps.some(
    (s) => s.k === 'course' && s.arg === part.id,
  )
  const toToday = () => {
    window.location.hash = 'today'
  }
  const [stamped, setStamped] = useState(false)
  useEffect(() => {
    if (!whole) return
    const t = setTimeout(() => {
      setStamped(true)
      blip('stamp')
    }, 300)
    return () => clearTimeout(t)
  }, [whole])
  return (
    <div className="zh-card zh-rise px-6 py-8 text-center sm:px-10">
      <div className="flex justify-center">
        {all ? (
          <Seal
            text="门"
            size={84}
            stamp={stamped}
            tilt={-4}
            title="门 mén, gate"
          />
        ) : whole ? (
          <Seal
            text={DAY_ZH[day.n - 1]}
            size={72}
            stamp={stamped}
            tilt={-4}
            title={`Day ${day.n} done`}
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--jade)] text-white">
            <Check size={34} strokeWidth={3} />
          </span>
        )}
      </div>
      <h2 className="zh-head mt-4 text-2xl">
        {all
          ? 'Through the gate'
          : whole
            ? `Day ${day.n} done`
            : `${part.title}: done`}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[var(--ink-2)]">
        {all
          ? '入门, rùmén, is to come in at the gate: to make a start. You have. Your first scene is passport control at Beijing Capital Airport.'
          : rest
            ? `Day ${rest.n}, ${rest.title.toLowerCase()}, is for tomorrow. What you met today will have settled by then.`
            : whole
              ? 'On to the next day whenever you like.'
              : next
                ? `Next: ${next.title}, about ${next.minutes} minutes.`
                : null}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {all ? (
          <>
            <a
              href="#trip"
              className="zh-btn inline-flex items-center gap-1.5 rounded-xl bg-[var(--red)] px-5 py-2 font-bold text-[#fff6ea] [--edge:#8e2219]"
            >
              Start the trip <ArrowRight size={18} />
            </a>
            <a
              href="#today"
              className="zh-btn inline-flex items-center gap-1.5 rounded-xl bg-[var(--paper-2)] px-5 py-2 font-bold [--edge:#d4c19c]"
            >
              Today
            </a>
          </>
        ) : (
          <>
            {inToday && (
              <Btn onClick={toToday} className="px-5">
                Back to Today <ArrowRight size={18} />
              </Btn>
            )}
            {next && (
              <Btn
                kind={rest || inToday ? 'ghost' : 'red'}
                onClick={() => onOpen(next.id)}
                className="px-5"
              >
                {rest ? `Day ${rest.n} now` : 'Next part'}
                {!inToday && <ArrowRight size={18} />}
              </Btn>
            )}
            {!inToday && (
              <Btn kind={rest ? 'red' : 'ghost'} onClick={onClose}>
                All days
              </Btn>
            )}
          </>
        )}
      </div>
      {part.more && !all && (
        <p className="mt-5 text-sm">
          <a
            href={part.more.href}
            className="inline-flex items-center gap-1 font-bold text-[var(--ink-2)] hover:text-[var(--red)]"
          >
            {part.more.label} <ArrowRight size={14} />
          </a>
        </p>
      )}
      {inToday ? (
        <EnterToContinue onEnter={toToday} />
      ) : (
        !rest && next && <EnterToContinue onEnter={() => onOpen(next.id)} />
      )}
    </div>
  )
}

// --- Reading

function Read({
  s,
  onNext,
}: {
  s: Extract<Screen, { k: 'read' }>
  onNext: () => void
}) {
  return (
    <div className="zh-card zh-rise p-5 sm:p-7">
      <h2 className="zh-head text-2xl">{s.title}</h2>
      <Prose text={s.text} className="mt-2.5 text-[1.05rem]" />
      {s.show && (
        <div className="mt-5">
          <ShowView show={s.show} />
        </div>
      )}
      <div className="mt-6 flex items-center justify-end gap-3">
        <Key k="Enter" />
        <Btn onClick={onNext} className="px-6">
          Next <ArrowRight size={18} />
        </Btn>
      </div>
      <EnterToContinue onEnter={onNext} />
    </div>
  )
}

// Hanzi, in the text, with full-width marks such as the gap ＿
const HAN = /([\u3000-\u303f\u3400-\u9fff\uff00-\uffef]+)/

// Plain English with hanzi in it: a run of hanzi that is a word can be
// tapped, to hear it and see it. _x_ is pinyin, **x** bold; a blank line
// starts a paragraph, and lines that start "- " are a list.
function Prose({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`space-y-2.5 leading-relaxed ${className}`}>
      {text.split('\n\n').map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => l.startsWith('- ')))
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden className="text-[var(--red)]">
                    ·
                  </span>
                  <span>
                    <Inline text={l.slice(2)} />
                  </span>
                </li>
              ))}
            </ul>
          )
        return (
          <p key={i}>
            <Inline text={block} />
          </p>
        )
      })}
    </div>
  )
}

function Inline({ text }: { text: string }) {
  const peek = usePeek()
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|_[^_\s][^_]*_)/).map((part, i) => {
        if (/^\*\*.+\*\*$/.test(part)) return <b key={i}>{part.slice(2, -2)}</b>
        if (/^_.+_$/.test(part))
          return (
            <span key={i} className="font-bold text-[var(--jade)]">
              {part.slice(1, -1)}
            </span>
          )
        // A mark right after hanzi stays on their line
        const runs = part.split(HAN)
        return runs.map((run, j) => {
          const key = `${i}.${j}`
          if (!HAN.test(run)) {
            const rest = j > 0 ? run.replace(/^[,.;:!?)]+/, '') : run
            return rest ? <Fragment key={key}>{rest}</Fragment> : null
          }
          const mark = /^[,.;:!?)]+/.exec(runs[j + 1] ?? '')?.[0] ?? ''
          const han = WORD[run] ? (
            <button
              type="button"
              onClick={() => peek(run)}
              className="zh rounded px-0.5 text-[1.2em] leading-none underline decoration-[var(--gold)] decoration-dotted underline-offset-4 hover:bg-[var(--paper-2)]"
            >
              {run}
            </button>
          ) : (
            <span className="zh px-0.5 text-[1.2em] leading-none">{run}</span>
          )
          return (
            <span key={key} className="whitespace-nowrap">
              {han}
              {mark}
            </span>
          )
        })
      })}
    </>
  )
}

// --- Things to see and hear

function ShowView({ show }: { show: Show }) {
  if (show.k === 'glyphs')
    return <Glyphs items={show.items} small={show.small} />
  if (show.k === 'tones') return <Tones base={show.base} />
  if (show.k === 'sounds') return <Sounds rows={show.rows} />
  if (show.k === 'lines') return <Lines zh={show.zh} />
  if (show.k === 'levels') return <Levels zh={show.zh} />
  if (show.k === 'built') return <Built c={show.c} />
  if (show.k === 'sum') return <Sum parts={show.parts} whole={show.whole} />
  if (show.k === 'forms') return <Forms pairs={show.pairs} />
  return <Memory />
}

// Simplified and traditional side by side: the same word, said the same
function Forms({ pairs }: { pairs: Extract<Show, { k: 'forms' }>['pairs'] }) {
  const { speaking, play } = useSpeaker()
  const [on, setOn] = useState<string | null>(null)
  return (
    <div>
      <p className="mb-2 flex justify-center gap-6 text-xs font-bold text-[var(--ink-2)] uppercase">
        <span>Simplified</span>
        <span aria-hidden>·</span>
        <span>Traditional</span>
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {pairs.map(({ s, t, strokes }) => {
          const w = WORD[s]
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setOn(s)
                void play(s)
              }}
              aria-label={`${s}, traditional ${t}: ${w?.p ?? ''}, ${w?.g ?? ''}`}
              className={`flex flex-col items-center rounded-2xl border-2 px-2 pt-2 pb-2 transition hover:-translate-y-0.5 hover:border-[var(--gold)] ${on === s && speaking ? 'border-[var(--jade)] bg-[#e3f0ea]' : 'border-transparent bg-[var(--paper)]'}`}
            >
              <span className="text-sm text-[var(--jade)]">{w?.p}</span>
              <span className="flex items-end gap-3">
                {[s, t].map((c, i) => (
                  <span key={c} className="flex flex-col items-center">
                    <span
                      className={`zh text-4xl ${i ? 'text-[var(--ink-2)]' : ''}`}
                    >
                      {c}
                    </span>
                    <span className="text-[11px] text-[var(--ink-2)] tabular-nums">
                      {strokes[i]}
                    </span>
                  </span>
                ))}
              </span>
              <span className="mt-0.5 text-sm font-bold">{w?.g}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-xs text-[var(--ink-2)]">
        The numbers are the strokes in each.
      </p>
    </div>
  )
}

// A word taken apart: its characters, each with its meaning, joined by +,
// and the word itself, its meaning a question mark
function Sum({ parts, whole }: { parts: Array<Glyph>; whole: string }) {
  const { speaking, play } = useSpeaker()
  const [on, setOn] = useState<string | null>(null)
  const w = WORD[whole]
  const card = (key: string, onClick: () => void, children: ReactNode) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={`flex min-w-20 flex-col items-center rounded-2xl border-2 px-3 pt-2.5 pb-2 transition hover:-translate-y-0.5 hover:border-[var(--gold)] ${on === key && speaking ? 'border-[var(--jade)] bg-[#e3f0ea]' : 'border-transparent bg-[var(--paper)]'}`}
    >
      {children}
    </button>
  )
  const hear = (key: string, text: string) => () => {
    setOn(key)
    void play(text)
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
      {parts.map((g, i) => (
        <Fragment key={g.h}>
          {i > 0 && (
            <span className="text-2xl font-bold text-[var(--ink-2)]">+</span>
          )}
          {card(
            g.h,
            hear(g.h, g.say),
            <>
              {g.p ? (
                <Ruby h={g.h} p={g.p} className="text-4xl" />
              ) : (
                <span className="zh text-4xl">{g.h}</span>
              )}
              <span className="mt-1 text-sm font-bold">{g.m}</span>
            </>,
          )}
        </Fragment>
      ))}
      <span className="text-2xl font-bold text-[var(--ink-2)]">=</span>
      {card(
        whole,
        hear(whole, whole),
        <>
          {w ? (
            <Ruby h={whole} p={w.p} className="text-4xl" />
          ) : (
            <span className="zh text-4xl">{whole}</span>
          )}
          <span className="mt-1 text-sm font-black text-[var(--red)]">?</span>
        </>,
      )}
    </div>
  )
}

function Glyphs({ items, small }: { items: Array<Glyph>; small?: boolean }) {
  const { speaking, play } = useSpeaker()
  const [on, setOn] = useState<string | null>(null)
  // Rows that come out even, on a phone and wider
  const cols = small
    ? items.length > 6
      ? 'grid-cols-5'
      : items.length === 6
        ? 'grid-cols-3 sm:grid-cols-6'
        : items.length === 4
          ? 'grid-cols-2 sm:grid-cols-4'
          : 'grid-cols-3 sm:grid-cols-5'
    : items.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : items.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-2 sm:grid-cols-3'
  return (
    <div className={`grid gap-2 sm:gap-2.5 ${cols}`}>
      {items.map((g) => {
        const long = [...g.h].length > 2
        const big = small
          ? long
            ? 'text-2xl sm:text-3xl'
            : 'text-3xl sm:text-4xl'
          : long
            ? 'text-4xl'
            : 'text-5xl'
        const face = (
          <>
            {g.art && (
              <img
                src={g.art}
                alt=""
                className={`mb-1 object-contain ${small ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-24 w-24'}`}
              />
            )}
            {g.p ? (
              <Ruby h={g.h} p={g.p} className={big} />
            ) : (
              <span className={`zh ${big}`}>{g.h}</span>
            )}
            <span
              className={`mt-1.5 block leading-tight font-bold ${small ? 'text-xs sm:text-sm' : 'text-sm'}`}
            >
              {g.m}
            </span>
            {g.note && (
              <span className="mt-0.5 block text-xs leading-tight text-[var(--ink-2)]">
                {g.note}
              </span>
            )}
          </>
        )
        return (
          <button
            key={g.h}
            type="button"
            onClick={() => {
              setOn(g.h)
              void play(g.say)
            }}
            className={`relative flex flex-col items-center justify-start rounded-2xl border-2 px-1.5 pt-3 pb-2.5 text-center transition hover:-translate-y-0.5 hover:border-[var(--gold)] ${on === g.h && speaking ? 'border-[var(--jade)] bg-[#e3f0ea]' : 'border-transparent bg-[var(--paper)]'}`}
          >
            {face}
            {!small && (
              <Volume2
                size={14}
                className="absolute top-2 right-2 text-[var(--jade)] opacity-60"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

function Tones({ base }: { base: string }) {
  const set = TONE_SETS.find((s) => s.base === base)
  const py = TONE_SET_PINYIN[base]
  const [played, setPlayed] = useState<Array<number | undefined>>([])
  const [busy, setBusy] = useState(false)
  if (!set) return null
  const hear = (i: number) => {
    setPlayed((p) => {
      const n = [...p]
      n[i] = (n[i] ?? 0) + 1
      return n
    })
    return say(set.chars[i], WORD_VOICE)
  }
  const all = async () => {
    setBusy(true)
    for (let i = 0; i < 4; i++) {
      await hear(i)
      await wait(250)
    }
    setBusy(false)
  }
  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {set.chars.map((c, i) => (
          <button
            key={c}
            type="button"
            onClick={() => void hear(i)}
            className="flex flex-col items-center rounded-2xl bg-[var(--paper)] px-1 pt-2 pb-3 transition hover:-translate-y-0.5"
          >
            <ToneGlyph tone={i + 1} size={44} play={played[i]} staff />
            <span className="mt-1 text-xl font-black text-[var(--jade)] sm:text-2xl">
              {py[i]}
            </span>
            <span className="zh text-3xl sm:text-4xl">{c}</span>
            <span className="mt-1 text-xs leading-tight font-bold sm:text-sm">
              {set.means[i]}
            </span>
            <span className="text-[11px] text-[var(--ink-2)]">
              {i + 1} {TONE_NAME[i + 1]}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <Btn kind="jade" onClick={() => void all()} disabled={busy}>
          <Play size={16} /> All four
        </Btn>
      </div>
    </div>
  )
}

function Sounds({ rows }: { rows: Array<Array<string>> }) {
  const [on, setOn] = useState<string | null>(null)
  const hear = async (s: string) => {
    setOn(s)
    await say(s, WORD_VOICE)
    setOn((o) => (o === s ? null : o))
  }
  const row = async (r: Array<string>) => {
    for (const s of r) {
      await hear(s)
      await wait(300)
    }
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.join()}
          className="flex items-center gap-2 rounded-2xl bg-[var(--paper)] p-2"
        >
          <div
            className="grid flex-1 gap-2"
            style={{
              gridTemplateColumns: `repeat(${r.length}, minmax(0, 1fr))`,
            }}
          >
            {r.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void hear(s)}
                className={`rounded-xl border-2 py-2.5 text-2xl font-black transition sm:text-3xl ${on === s ? 'border-[var(--jade)] bg-[#e3f0ea]' : 'border-transparent bg-[var(--card)] hover:border-[var(--gold)]'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void row(r)}
            aria-label={`Hear ${r.join(', ')}`}
            title="Hear them in turn"
            className="rounded-full p-2 text-[var(--jade)] hover:bg-[var(--paper-2)]"
          >
            <Play size={18} />
          </button>
        </div>
      ))}
    </div>
  )
}

const useHome = () => {
  const { settings } = useStore()
  return {
    home: settings.home,
    name: WORD[settings.home]?.g ?? settings.home,
    autoplay: settings.autoplay,
  }
}

function Lines({ zh }: { zh: Array<string> }) {
  const { home, name, autoplay } = useHome()
  const { speaking, play } = useSpeaker()
  const [on, setOn] = useState<number | null>(null)
  const hear = (i: number) => {
    const l = lineOf(zh[i])
    if (!l) return Promise.resolve()
    setOn(i)
    return play(plain(zh[i], { home }), l.voice)
  }
  useEffect(() => {
    if (autoplay) void hear(0)
  }, [])
  return (
    <div className="space-y-2">
      {zh.map((line, i) => {
        const l = lineOf(line)
        return (
          <div
            key={line}
            className="flex items-start gap-2 rounded-2xl bg-[var(--paper)] p-3"
          >
            <button
              type="button"
              onClick={() => void hear(i)}
              aria-label="Hear it"
              className={`mt-1 shrink-0 rounded-full p-2 transition ${on === i && speaking ? 'bg-[var(--jade)] text-white' : 'text-[var(--jade)] hover:bg-[var(--paper-2)]'}`}
            >
              <Volume2 size={20} />
            </button>
            <div className="min-w-0">
              <Mixed line={line} />
              {l && (
                <p className="mt-1.5 text-sm text-[var(--ink-2)]">
                  {english(l.en, name)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const LEVEL_LABEL = ['Not met yet', 'Learning', 'Known']

function Levels({ zh }: { zh: string }) {
  const { home, name } = useHome()
  const l = lineOf(zh)
  return (
    <div className="rounded-2xl bg-[var(--paper)] p-3 sm:p-4">
      <div className="space-y-3">
        {([0, 1, 2] as Array<Level>).map((lv) => (
          <div key={lv} className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <span
              className="mb-1 w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-bold tracking-wide text-white uppercase"
              style={{ background: LEVEL_COLOR[lv] }}
            >
              {LEVEL_LABEL[lv]}
            </span>
            <Mixed line={zh} all={lv} />
          </div>
        ))}
      </div>
      {l && (
        <p className="mt-3 flex items-center gap-1 border-t border-[var(--paper-2)] pt-2 text-sm text-[var(--ink-2)]">
          <button
            type="button"
            aria-label="Hear it"
            onClick={() => void say(plain(zh, { home }), l.voice)}
            className="rounded-full p-1.5 text-[var(--jade)] hover:bg-[var(--paper-2)]"
          >
            <Volume2 size={16} />
          </button>
          {english(l.en, name)}
        </p>
      )}
    </div>
  )
}

function Built({ c }: { c: Array<string> }) {
  const { speaking, play } = useSpeaker()
  const [on, setOn] = useState<string | null>(null)
  return (
    <div className="space-y-2">
      {c.map((ch) => {
        const b = BUILT.find((x) => x.c === ch)
        if (!b) return null
        const meaning = RADICALS.find((r) => r.part === b.parts[0])?.meaning
        const part = (p: string, label: string, sub?: string) => (
          <span className="flex min-w-16 flex-col items-center rounded-xl bg-[var(--card)] px-2 py-2">
            <span className="zh text-4xl">{p}</span>
            <span className="text-xs font-bold">{label}</span>
            {sub && (
              <span className="text-[11px] text-[var(--ink-2)]">{sub}</span>
            )}
          </span>
        )
        return (
          <div
            key={ch}
            className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-[var(--paper)] p-3 sm:gap-3"
          >
            <button
              type="button"
              onClick={() => {
                setOn(ch)
                void play(ch)
              }}
              className={`flex flex-col items-center rounded-xl border-2 px-3 py-1.5 transition ${on === ch && speaking ? 'border-[var(--jade)] bg-[#e3f0ea]' : 'border-transparent hover:border-[var(--gold)]'}`}
            >
              <Ruby h={b.c} p={b.p} className="text-5xl" />
              <span className="text-sm font-bold">{b.m}</span>
            </button>
            <span className="text-2xl text-[var(--ink-2)]">=</span>
            {part(b.parts[0], meaning ?? '', 'the meaning')}
            <span className="text-2xl text-[var(--ink-2)]">+</span>
            {part(b.parts[1], b.sound ?? '', 'the sound')}
          </div>
        )
      })}
    </div>
  )
}

// A word's chance of being remembered over four weeks: met, then got right
// each time it begins to fade, against one never seen again. Drawn from
// the bank's own sums (lib/bank.ts).
const DAY_MS = 86_400_000
const SPAN = 28
const FADE = 0.85

function memoryCurves() {
  const t0 = 0
  let card = newCard(t0)
  const reviews: Array<number> = []
  const kept: Array<[number, number]> = []
  const alone = newCard(t0)
  const lost: Array<[number, number]> = []
  for (let i = 0; i <= SPAN * 96; i++) {
    const t = (i / 96) * DAY_MS
    if (recall(card, t) < FADE) {
      kept.push([t, recall(card, t)])
      card = answer(card, true, t, 0.7)
      reviews.push(t)
    }
    kept.push([t, recall(card, t)])
    lost.push([t, recall(alone, t)])
  }
  return { kept, lost, reviews }
}

function Memory() {
  const { kept, lost, reviews } = useMemo(memoryCurves, [])
  const W = 320
  const H = 150
  const pad = { l: 30, r: 16, t: 10, b: 24 }
  const x = (t: number) => pad.l + (t / (SPAN * DAY_MS)) * (W - pad.l - pad.r)
  const y = (r: number) => pad.t + (1 - r) * (H - pad.t - pad.b)
  const path = (pts: Array<[number, number]>) =>
    pts
      .map(
        ([t, r], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)} ${y(r).toFixed(1)}`,
      )
      .join('')
  return (
    <figure className="rounded-2xl bg-[var(--paper)] p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="A word reviewed as it fades is still remembered after four weeks; one never seen again is mostly forgotten within days"
      >
        {[0, 0.5, 1].map((r) => (
          <g key={r}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(r)}
              y2={y(r)}
              stroke="var(--paper-2)"
              strokeWidth="1"
            />
            <text
              x={pad.l - 5}
              y={y(r) + 3}
              textAnchor="end"
              fontSize="9"
              fill="var(--ink-2)"
            >
              {r * 100}%
            </text>
          </g>
        ))}
        {[0, 7, 14, 21, 28].map((d) => (
          <text
            key={d}
            x={x(d * DAY_MS)}
            y={H - 8}
            textAnchor="middle"
            fontSize="9"
            fill="var(--ink-2)"
          >
            {d ? `${d} d` : 'met'}
          </text>
        ))}
        <path
          d={path(lost)}
          fill="none"
          stroke="#9a8f84"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <path
          d={path(kept)}
          fill="none"
          stroke="var(--jade)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {reviews.map((t) => (
          <circle key={t} cx={x(t)} cy={y(FADE)} r="3.2" fill="var(--red)" />
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[var(--ink-2)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-[var(--jade)]" /> reviewed as it fades
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--red)]" /> a review
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 border-t-2 border-dashed border-[#9a8f84]" />{' '}
          never seen again
        </span>
      </figcaption>
    </figure>
  )
}

// --- Words to meet, and a quiz on them

function Meet({ ids, onNext }: { ids: Array<string>; onNext: () => void }) {
  const { bank, meet, know } = useStore()
  // Words met already, in another game or an earlier part, are passed
  const [todo] = useState(() =>
    ids.flatMap((id) => (WORD[id] && !bank.cards[id] ? [WORD[id]] : [])),
  )
  const [i, setI] = useState(0)
  useEffect(() => {
    if (i >= todo.length) onNext()
  }, [i])
  if (i >= todo.length) return null
  const w = todo[i]
  return (
    <MeetCard
      key={w.id}
      w={w}
      n={i}
      of={todo.length}
      onNext={(knew) => {
        if (knew) know([w.id])
        else meet([w.id])
        setI(i + 1)
      }}
    />
  )
}

// Each word by its meaning and by ear; a long list once each
function WordQuiz({ ids, onNext }: { ids: Array<string>; onNext: () => void }) {
  const [questions] = useState<Array<Question>>(() => {
    const words = ids.flatMap((id) => WORD[id] ?? [])
    return shuffle(
      words.flatMap((w, i): Array<Question> =>
        words.length <= 5
          ? [
              { w, kind: 'meaning' },
              { w, kind: 'listen' },
            ]
          : [{ w, kind: i % 2 ? 'listen' : 'meaning' }],
      ),
    )
  })
  return <Quiz questions={questions} onDone={onNext} />
}

// --- A question of four

function Ask({
  s,
  onNext,
}: {
  s: Extract<Screen, { k: 'ask' }>
  onNext: () => void
}) {
  const { points } = useStore()
  const [options] = useState(() =>
    shuffle(s.options.map((o, i) => ({ o, right: i === 0 }))),
  )
  const [picked, setPicked] = useState<{ i: number; t: number } | null>(null)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const pick = (i: number) => {
    if (picked) return
    setPicked({ i, t: Date.now() })
    const ok = options[i].right
    blip(ok ? 'right' : 'wrong')
    if (ok) {
      points(1)
      cheer(buttons.current[i], '+1')
    }
  }
  useKeys((key) => {
    if (picked) {
      if (key !== 'Enter' || Date.now() - picked.t < 150) return
      onNext()
      return true
    }
    const n = Number(key)
    if (n >= 1 && n <= options.length) {
      pick(n - 1)
      return true
    }
  })
  const ok = picked && options[picked.i].right
  const allHan = options.every(({ o }) => /^[㐀-鿿]+$/.test(o))
  return (
    <div className="zh-card zh-rise p-5 sm:p-7">
      <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
        A question
      </p>
      <div className="mt-1 text-xl leading-snug font-bold">
        <Prose text={s.q} />
      </div>
      {s.show && (
        <div className="mt-4">
          <ShowView show={s.show} />
        </div>
      )}
      <div
        className={`mt-5 grid gap-2.5 ${allHan ? 'grid-cols-4' : 'sm:grid-cols-2'}`}
      >
        {options.map(({ o, right }, i) => {
          const look = !picked
            ? 'border-[var(--paper-2)] bg-[var(--paper)] shadow-[0_3px_0_var(--paper-2)] hover:-translate-y-0.5 hover:border-[var(--gold)]'
            : right
              ? `border-[var(--jade)] bg-[#e3f0ea] ${picked.i === i ? 'fx-pulse' : 'fx-beacon'}`
              : picked.i === i
                ? 'fx-shake border-[var(--red)] bg-[#f8e1dc]'
                : 'border-transparent bg-[var(--paper)] opacity-45'
          return (
            <button
              key={o}
              ref={(el) => {
                buttons.current[i] = el
              }}
              type="button"
              disabled={!!picked}
              onClick={() => pick(i)}
              className={`relative flex min-h-14 items-center justify-center rounded-2xl border-2 px-4 py-3 text-center font-bold transition ${look}`}
            >
              <Key k={String(i + 1)} className="absolute top-1.5 left-1.5" />
              {s.zh ? (
                <Mixed line={o} still size="sm" className="justify-center" />
              ) : allHan ? (
                <span className="zh text-4xl font-normal">{o}</span>
              ) : /[㐀-鿿]/.test(o) ? (
                <span className="zh text-2xl font-normal">{o}</span>
              ) : (
                <span className="text-lg">{o}</span>
              )}
            </button>
          )
        })}
      </div>
      {picked && (
        <div className="fx-rise mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-[var(--paper-2)] pt-3">
          <div className="min-w-0 flex-1">
            <p
              className={`font-black ${ok ? 'text-[var(--jade)]' : 'text-[var(--red)]'}`}
            >
              {ok ? (
                <>
                  <Ruby h="对" p="duì" className="text-xl" /> Right
                </>
              ) : (
                <>
                  <Ruby h="不对" p="bù duì" className="text-xl" /> Not quite
                </>
              )}
            </p>
            <Prose text={s.note} className="text-sm text-[var(--ink-2)]" />
          </div>
          <Btn onClick={onNext} className="shrink-0">
            Next{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </div>
      )}
    </div>
  )
}

// --- A round by ear

interface EarQuestion {
  say: string
  answer: string
  options: Array<string>
  tip: string
  // An option as heard, to compare with after a wrong answer
  sayOf?: (option: string) => string
  record?: (right: boolean) => void
}

function earQuestions(
  s: Extract<Screen, { k: 'ear' }>,
  store: ReturnType<typeof useStore>,
): Array<EarQuestion> {
  const out: Array<EarQuestion> = []
  if (s.tones) {
    const sets = s.tones.sets.flatMap(
      (b) => TONE_SETS.find((t) => t.base === b) ?? [],
    )
    const tones = s.tones.only ?? [1, 2, 3, 4]
    let order = shuffle(sets)
    let last = 0
    for (let i = 0; i < s.n; i++) {
      if (i && i % order.length === 0) order = shuffle(sets)
      const set = order[i % order.length]
      const choice = tones.filter((t) => t !== last)
      const tone = choice[Math.floor(Math.random() * choice.length)]
      last = tone
      const py = TONE_SET_PINYIN[set.base]
      out.push({
        say: set.chars[tone - 1],
        answer: String(tone),
        options: tones.map(String),
        tip: `${set.chars[tone - 1]} ${py[tone - 1]}, ${set.means[tone - 1]}`,
        sayOf: (o) => set.chars[Number(o) - 1],
        record: (ok) => store.tone(String(tone), ok),
      })
    }
  }
  if (s.contrasts) {
    const cs = s.contrasts.flatMap(
      (id) => CONTRASTS.find((c) => c.id === id) ?? [],
    )
    for (let i = 0; i < s.n; i++) {
      const c = cs[i % cs.length]
      const fs = frames(c)
      const f = fs[Math.floor(Math.random() * fs.length)]
      const said = f[Math.floor(Math.random() * f.length)]
      out.push({
        say: said,
        answer: said,
        options: shuffle(f),
        tip: c.tip,
        sayOf: (o) => o,
        record: (ok) => store.sound(c.id, ok),
      })
    }
  }
  if (s.numbers) {
    for (const h of shuffle(s.numbers).slice(0, s.n)) {
      const n = value(h)
      out.push({
        say: h,
        answer: String(n),
        options: numberChoices(n).map(String),
        tip: `${h}, ${join(numberPinyin(h))}`,
      })
    }
  }
  return shuffle(out)
}

function Ear({
  s,
  onNext,
}: {
  s: Extract<Screen, { k: 'ear' }>
  onNext: () => void
}) {
  const store = useStore()
  const { points } = store
  const { speaking, play } = useSpeaker()
  const [questions] = useState(() => earQuestions(s, store))
  const [at, setAt] = useState(0)
  const [picked, setPicked] = useState<{ o: string; t: number } | null>(null)
  const [right, setRight] = useState(0)
  const [streak, setStreak] = useState(0)
  const buttons = useRef(new Map<string, HTMLButtonElement | null>())
  const q = questions[at] as EarQuestion | undefined
  useEffect(() => {
    if (q) void play(q.say)
  }, [at])

  const pick = (o: string) => {
    if (!q || picked) return
    setPicked({ o, t: Date.now() })
    const ok = o === q.answer
    blip(ok ? 'right' : 'wrong')
    q.record?.(ok)
    if (ok) {
      setRight((r) => r + 1)
      setStreak((n) => n + 1)
      points(1)
      cheer(buttons.current.get(o), '+1')
    } else {
      setStreak(0)
      const sayOf = q.sayOf
      if (sayOf)
        void (async () => {
          await wait(250)
          await play(sayOf(o))
          await wait(300)
          await play(q.say)
        })()
    }
  }
  const next = () => {
    if (!picked) return
    if (at + 1 >= questions.length) {
      onNext()
      return
    }
    setPicked(null)
    setAt((a) => a + 1)
  }
  useKeys((key) => {
    if (!q) return
    if (key === ' ') {
      void play(q.say)
      return true
    }
    if (picked) {
      if (key !== 'Enter' || Date.now() - picked.t < 150) return
      next()
      return true
    }
    const n = Number(key)
    if (n >= 1 && n <= q.options.length) {
      pick(q.options[n - 1])
      return true
    }
  })
  if (!q) return null
  const tones = !!s.tones
  const face = (o: string) =>
    tones ? (
      <span className="flex flex-col items-center">
        <ToneGlyph tone={Number(o)} size={40} staff />
        <span className="text-sm font-bold">
          {o} {TONE_NAME[Number(o)]}
        </span>
      </span>
    ) : (
      o
    )
  return (
    <div className="flex flex-col max-sm:min-h-[calc(100dvh-9rem)]">
      <div className="mb-3 flex items-center gap-3">
        <Progress
          at={at + (picked ? 1 : 0)}
          of={questions.length}
          className="flex-1"
        />
        <Combo n={streak} />
      </div>
      <div
        key={at}
        className="zh-card fx-enter flex flex-1 flex-col p-5 text-center sm:p-7"
      >
        <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
          {s.title}
        </p>
        <PlayButton
          onClick={() => void play(q.say)}
          speaking={speaking}
          className="mx-auto mt-4"
        />
        {picked && tones && <p className="fx-rise zh mt-2 text-4xl">{q.say}</p>}
        <div className="flex-1" />
        <div
          className={`mt-6 grid gap-2.5 ${q.options.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          {q.options.map((o, i) => {
            const look = !picked
              ? 'border-[var(--paper-2)] bg-[var(--paper)] shadow-[0_3px_0_var(--paper-2)] hover:-translate-y-0.5 hover:border-[var(--gold)]'
              : o === q.answer
                ? `border-[var(--jade)] bg-[#e3f0ea] ${picked.o === o ? 'fx-pulse' : 'fx-beacon'}`
                : picked.o === o
                  ? 'fx-shake border-[var(--red)] bg-[#f8e1dc]'
                  : 'border-transparent bg-[var(--paper)] opacity-45'
            return (
              <button
                key={o}
                ref={(el) => {
                  buttons.current.set(o, el)
                }}
                type="button"
                disabled={!!picked}
                onClick={() => pick(o)}
                className={`relative rounded-2xl border-2 px-2 py-3 text-3xl font-black transition ${look}`}
              >
                <Key k={String(i + 1)} className="absolute top-1.5 left-1.5" />
                {face(o)}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex min-h-[4.5rem] items-center gap-3 border-t border-dashed border-[var(--paper-2)] pt-3 text-left">
          {picked ? (
            <>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-black ${picked.o === q.answer ? 'text-[var(--jade)]' : 'text-[var(--red)]'}`}
                >
                  {picked.o === q.answer ? (
                    <Ruby h="对" p="duì" className="text-xl" />
                  ) : (
                    <>
                      <Ruby h="不对" p="bù duì" className="text-xl" /> it was{' '}
                      {tones ? `tone ${q.answer}` : q.answer}
                    </>
                  )}
                </p>
                <p className="text-sm text-[var(--ink-2)]">{q.tip}</p>
              </div>
              <Btn onClick={next} className="shrink-0">
                Next{' '}
                <Key
                  k="Enter"
                  className="ml-1 border-white/30 bg-white/15 text-white"
                />
              </Btn>
            </>
          ) : (
            <p className="w-full text-center text-xs text-[var(--ink-2)] max-sm:hidden">
              <Key k="1" />–<Key k={String(q.options.length)} /> to choose,{' '}
              <Key k="Space" /> to hear it again · {right} right so far
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Lines to put in order

function Build({
  lines,
  onNext,
}: {
  lines: Array<string>
  onNext: () => void
}) {
  const [i, setI] = useState(0)
  return (
    <BuildLine
      key={i}
      zh={lines[i]}
      n={i}
      of={lines.length}
      onDone={() => (i + 1 < lines.length ? setI(i + 1) : onNext())}
    />
  )
}

function BuildLine({
  zh,
  n,
  of,
  onDone,
}: {
  zh: string
  n: number
  of: number
  onDone: () => void
}) {
  const { points } = useStore()
  const { home, name } = useHome()
  const heard = lineOf(zh)
  const all = useMemo(() => tokens(zh, { home }), [zh, home])
  const words = all.filter((t) => !t.punct)
  const end = all.at(-1)?.punct ? all.at(-1)?.h : ''
  // The words in a shuffled heap, never already in order
  const [heap] = useState(() => {
    const ks = words.map((_, k) => k)
    let s = shuffle(ks)
    for (let tries = 0; tries < 5 && s.every((k, j) => k === j); tries++)
      s = shuffle(ks)
    return s
  })
  const [placed, setPlaced] = useState<Array<number>>([])
  const [result, setResult] = useState<{ ok: boolean; t: number } | null>(null)
  const row = useRef<HTMLDivElement>(null)

  const check = () => {
    if (result || placed.length < words.length) return
    const ok =
      placed.map((k) => words[k].h).join() === words.map((t) => t.h).join()
    setResult({ ok, t: Date.now() })
    blip(ok ? 'right' : 'wrong')
    if (ok) {
      points(1)
      cheer(row.current, '+1')
    }
    if (heard) void say(plain(zh, { home }), heard.voice)
  }
  const again = () => {
    setPlaced([])
    setResult(null)
  }
  useEffect(() => {
    if (placed.length === words.length && !result) check()
  }, [placed])
  useKeys((key) => {
    if (result) {
      if (key !== 'Enter' || Date.now() - result.t < 150) return
      onDone()
      return true
    }
    if (key === 'Backspace') {
      setPlaced((p) => p.slice(0, -1))
      return true
    }
  })

  const tile = (k: number, onClick: () => void, look: string) => {
    const t = words[k]
    return (
      <button
        key={k}
        type="button"
        aria-label={`${t.h}, ${t.gloss}`}
        disabled={!!result}
        onClick={onClick}
        className={`flex flex-col items-center rounded-xl border px-2.5 py-1.5 shadow-[0_3px_0_#e3d4b8] transition select-none ${look}`}
      >
        <ruby className="zh text-2xl">
          {t.h}
          <rt>{join(t.pinyin)}</rt>
        </ruby>
        <span className="text-xs text-[var(--ink-2)] italic">{t.gloss}</span>
      </button>
    )
  }

  return (
    <div className="zh-card zh-rise p-5 sm:p-7">
      <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
        Put it in Chinese order{of > 1 ? ` · ${n + 1} of ${of}` : ''}
      </p>
      <p className="mt-1 text-2xl leading-tight font-black">
        {heard ? english(heard.en, name) : ''}
      </p>
      <div
        ref={row}
        aria-label="Your line"
        className={`mt-5 flex min-h-[5.5rem] flex-wrap items-end gap-2 rounded-2xl border-2 border-dashed p-3 transition-colors ${!result ? 'border-[var(--paper-2)] bg-[var(--paper)]/60' : result.ok ? 'border-[var(--jade)] bg-[var(--jade)]/5' : 'border-[var(--red)] bg-[var(--red)]/5'}`}
      >
        {placed.map((k, j) =>
          tile(
            k,
            () => setPlaced((p) => p.filter((_, x) => x !== j)),
            !result
              ? 'border-[#eadcc2] bg-white'
              : result.ok
                ? 'border-[var(--jade)] bg-[#e3f0ea]'
                : 'border-[var(--red)] bg-[#f8e1dc]',
          ),
        )}
        {placed.length === words.length && (
          <span className="zh pb-3 text-2xl">{end}</span>
        )}
        {!placed.length && (
          <span className="pointer-events-none self-center text-sm text-[var(--ink-2)]">
            Tap the words in the order they go
          </span>
        )}
      </div>
      <div className="mt-4 flex min-h-[4.5rem] flex-wrap gap-2">
        {heap
          .filter((k) => !placed.includes(k))
          .map((k) =>
            tile(
              k,
              () => setPlaced((p) => [...p, k]),
              'border-[#eadcc2] bg-white hover:-translate-y-0.5 hover:border-[var(--gold)]',
            ),
          )}
      </div>
      {result && (
        <div className="fx-rise mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-[var(--paper-2)] pt-3">
          <div className="min-w-0 flex-1">
            <p
              className={`font-black ${result.ok ? 'text-[var(--jade)]' : 'text-[var(--red)]'}`}
            >
              {result.ok ? (
                <>
                  <Ruby h="对" p="duì" className="text-xl" /> Right
                </>
              ) : (
                <>
                  <Ruby h="不对" p="bù duì" className="text-xl" /> It goes
                </>
              )}
            </p>
            {!result.ok && (
              <Mixed line={zh} all={1} size="sm" className="mt-1" />
            )}
          </div>
          {!result.ok && (
            <Btn kind="ghost" onClick={again}>
              <RotateCcw size={16} /> Again
            </Btn>
          )}
          <Btn onClick={onDone} className="shrink-0">
            Next{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </div>
      )}
    </div>
  )
}
