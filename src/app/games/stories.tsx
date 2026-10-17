import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Languages,
  Pause,
  Play as PlayIcon,
  RotateCcw,
  ScrollText,
  Volume2,
} from 'lucide-react'
import { GROUPS, STORIES, STORY_VOICE } from '../data/stories'
import { WORDS } from '../data/words'
import { plain, wordIds } from '../lib/text'
import { blip, say, stop } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Mixed, Stars, shuffle } from '../ui'
import { PaperCut } from '../paper/PaperCut'
import { Theatre } from '../paper/Theatre'
import { WindowFlower } from '../paper/WindowFlower'
import { beatsOf } from '../paper/stage'
import { clap } from '../paper/clapper'
import { PUPPET_KINDS } from '../paper/puppets'
import type { ReactNode } from 'react'
import type { Phase } from '../paper/Theatre'
import type { Story } from '../data/stories'

// Stories: old tales in simple Chinese, played as a shadow-puppet play
// (paper/Theatre.tsx), a sentence at a time. Each sentence is heard and
// shown below the screen in mixed text; tap the screen to go on, or let
// the play run by itself. A story brings a few of its words into Chinese,
// like a trip scene, and three questions at the end check what was
// understood.

const fromUrl = () => {
  const q = new URLSearchParams(window.location.search)
  const story = STORIES.find((s) => s.id === q.get('story'))
  const line = Number(q.get('line'))
  return story ? { story, line: Number.isFinite(line) ? line : 0 } : null
}

export default function Stories() {
  const [open, setOpen] = useState<{ story: Story; line: number } | null>(
    fromUrl,
  )
  const [run, setRun] = useState(0)
  if (new URLSearchParams(window.location.search).has('cast')) return <Cast />
  if (open)
    return (
      <Play
        key={`${open.story.id}-${run}`}
        story={open.story}
        startAt={open.line}
        onExit={() => {
          setOpen(null)
          window.scrollTo(0, 0)
        }}
        onAgain={() => {
          setOpen({ story: open.story, line: 0 })
          setRun((r) => r + 1)
          window.scrollTo(0, 0)
        }}
      />
    )
  return (
    <Playbill
      onOpen={(story) => {
        setOpen({ story, line: 0 })
        window.scrollTo(0, 0)
      }}
    />
  )
}

// Every puppet on the stage, six at a time, for checking the art:
// /?cast#stories
function Cast() {
  const rows = useMemo(() => {
    const kinds = PUPPET_KINDS
    return Array.from({ length: Math.ceil(kinds.length / 6) }, (_, r) => {
      const six = kinds.slice(r * 6, r * 6 + 6)
      const story: Story = {
        id: `cast${r}`,
        title: 'Cast',
        zh: '角色',
        blurb: '',
        group: 'myth',
        cast: Object.fromEntries(six.map((k) => [k, k])),
        lines: [
          [
            '',
            '',
            {
              set: ['hills'],
              on: Object.fromEntries(
                six.map((k, i) => [
                  k,
                  { x: 10 + i * 16, from: 'fade' as const },
                ]),
              ),
            },
          ],
        ],
        questions: [],
      }
      return story
    })
  }, [])
  return (
    <Frame title="Cast" zh="角色" wide>
      <div className="flex flex-col gap-6">
        {rows.map((story) => (
          <Theatre
            key={story.id}
            story={story}
            at={0}
            phase="play"
            speaking={false}
          />
        ))}
      </div>
    </Frame>
  )
}

// --- The list: a programme of the plays, with their paper-cut covers ---

function Playbill({ onOpen }: { onOpen: (s: Story) => void }) {
  const { bank } = useStore()
  return (
    <Frame title="Stories" zh="故事" wide>
      <div className="mb-8 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <WindowFlower
          seed={7}
          className="w-36 shrink-0 drop-shadow-[0_3px_4px_rgba(90,20,10,0.35)] sm:w-44"
        />
        <p className="max-w-xl text-[var(--ink-2)]">
          Old tales, played with shadow puppets and told in Chinese word order.
          The words you know are in Chinese; the rest are in English until you
          learn them – so each story reads a little more Chinese every time. Tap
          the screen to go on, or let the play run by itself.
        </p>
      </div>
      {GROUPS.map((g) => {
        const stories = STORIES.filter((s) => s.group === g.id)
        if (!stories.length) return null
        return (
          <section key={g.id} className="mb-8">
            <h2 className="mb-3 flex items-baseline gap-2 border-b border-[var(--red)]/20 pb-1">
              <span className="zh text-2xl text-[var(--red)]">{g.zh}</span>
              <span className="text-sm font-bold tracking-wide text-[var(--ink-2)] uppercase">
                {g.title}
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((s) => {
                const stars = bank.scenes[`story:${s.id}`]
                const ids = new Set(
                  s.lines.flatMap(([zh]) => wordIds(zh, { home: '挪威' })),
                )
                const fresh = [...ids].filter((id) => !bank.cards[id]).length
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpen(s)}
                    className="zh-card group flex flex-col overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <PaperCut
                      id={s.id}
                      className="w-full transition duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="flex flex-1 flex-col p-4 pt-3">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="zh text-2xl text-[var(--red)]">
                          {s.zh}
                        </span>
                        {stars ? <Stars n={stars} /> : null}
                      </span>
                      <span className="block font-black">{s.title}</span>
                      <span className="mt-0.5 block text-sm text-[var(--ink-2)]">
                        {s.blurb}
                      </span>
                      <span className="mt-auto pt-2 text-xs font-bold text-[var(--gold)]">
                        {fresh
                          ? `${fresh} new ${fresh === 1 ? 'word' : 'words'}`
                          : 'Every word met'}
                        {' · '}
                        {s.lines.length} lines
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </Frame>
  )
}

// --- The play ---

function Play({
  story,
  startAt,
  onExit,
  onAgain,
}: {
  story: Story
  startAt: number
  onExit: () => void
  onAgain: () => void
}) {
  const { bank, settings, meet, setScene, points } = useStore()
  const vars = { home: settings.home }
  const last = story.lines.length - 1
  const [phase, setPhase] = useState<Phase>(startAt > 0 ? 'play' : 'title')
  const [at, setAt] = useState(Math.min(startAt, last))
  // The beats that have come in a line, kept with the line they belong to
  const [beats, setBeats] = useState({ at: 0, n: 0 })
  const beat = beats.at === at ? beats.n : 0
  const [speaking, setSpeaking] = useState(false)
  const [auto, setAuto] = useState(false)
  const [english, setEnglish] = useState(false)
  const [script, setScript] = useState(false)
  const [quiz, setQuiz] = useState(false)
  // Each line heard gets a ticket; an old line's end is not this one's
  const ticket = useRef(0)

  // A few of the story's words met now, in lesson order
  const fresh = useMemo(() => {
    const ids = new Set(story.lines.flatMap(([zh]) => wordIds(zh, vars)))
    const order = new Map(WORDS.map((w, i) => [w.id, i]))
    return [...ids]
      .filter((id) => !bank.cards[id])
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
      .slice(0, settings.perScene)
  }, [])
  useEffect(() => meet(fresh), [fresh, meet])
  const freshSet = useMemo(() => new Set(fresh), [fresh])

  // The title stands on the screen a moment, then the play begins
  useEffect(() => {
    if (phase !== 'title') return
    const t = setTimeout(() => setPhase('play'), 2600)
    return () => clearTimeout(t)
  }, [phase])

  const next = useCallback(() => {
    if (phase === 'title') return setPhase('play')
    if (phase === 'end') return
    if (at >= last) setPhase('end')
    else setAt((n) => n + 1)
  }, [phase, at, last])
  const back = () => {
    if (phase === 'end') setPhase('play')
    else if (at > 0) setAt((n) => n - 1)
  }

  // The beats of a line, one after another
  useEffect(() => {
    if (phase !== 'play') return
    const waits = beatsOf(story.lines[at][2])
    const timers: Array<ReturnType<typeof setTimeout>> = []
    let t = 0
    waits.forEach((w, i) => {
      t += w * 1000
      timers.push(setTimeout(() => setBeats({ at, n: i + 1 }), t))
    })
    return () => timers.forEach(clearTimeout)
  }, [at, phase])

  // Each line heard as it comes; playing on by itself, the next follows
  const hear = useCallback(
    (i: number, thenNext: boolean) => {
      const mine = ++ticket.current
      setSpeaking(true)
      const started = Date.now()
      void say(plain(story.lines[i][0], vars), STORY_VOICE).then(() => {
        if (mine !== ticket.current) return
        setSpeaking(false)
        if (!thenNext) return
        // leave time for the puppets to finish what the line asks
        const waits = beatsOf(story.lines[i][2]).reduce((a, b) => a + b, 0)
        const rest = Math.max(
          1300,
          waits * 1000 + 1200 - (Date.now() - started),
        )
        setTimeout(() => {
          if (mine === ticket.current) next()
        }, rest)
      })
    },
    [story, next],
  )
  useEffect(() => {
    if (phase !== 'play') return
    if (settings.autoplay || auto) hear(at, auto)
    else {
      ticket.current++
      setSpeaking(false)
    }
  }, [at, phase, auto])
  useEffect(() => () => stop(), [])
  // the clapper as the play begins and ends
  const was = useRef(phase)
  useEffect(() => {
    if (was.current === 'title' && phase === 'play') clap('open')
    if (was.current === 'play' && phase === 'end') clap('close')
    was.current = phase
  }, [phase])
  useEffect(() => {
    if (phase === 'end') setAuto(false)
  }, [phase])

  // Keys: arrows and space
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const on = e.target as HTMLElement
      if (quiz || on.closest('input, textarea')) return
      // a space on a button presses that button, and nothing else
      if (e.key === ' ' && on.closest('button, a')) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const [zh, en] = story.lines[at]
  const ended = phase === 'end'
  return (
    <Frame title={story.title} zh={story.zh} wide>
      <Theatre
        story={story}
        at={at}
        beat={beat}
        phase={phase}
        speaking={speaking}
        onTap={next}
      />

      <div className="zh-card relative mx-auto mt-4 max-w-4xl overflow-hidden p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className="zh-seal mt-1 flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-sm font-black tabular-nums shadow-sm"
            aria-label={`Line ${at + 1} of ${last + 1}`}
          >
            {phase === 'title' ? '序' : at + 1}
          </span>
          <div className="min-h-[3.2rem] min-w-0 flex-1">
            {phase === 'title' ? (
              <p className="pt-1.5 text-[var(--ink-2)]">
                The lamp is lit. The play begins…
              </p>
            ) : (
              <>
                <Mixed
                  key={at}
                  line={zh}
                  fresh={freshSet}
                  size="lg"
                  className="zh-rise"
                />
                {english && <p className="mt-2 text-[var(--ink-2)]">{en}</p>}
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <IconBtn
            label="Back"
            onClick={back}
            disabled={at === 0 && phase !== 'end'}
          >
            <ChevronLeft size={20} />
          </IconBtn>
          <IconBtn
            label={auto ? 'Pause' : 'Play'}
            onClick={() => {
              if (phase === 'title') setPhase('play')
              setAuto((a) => !a)
            }}
            active={auto}
            disabled={ended}
          >
            {auto ? <Pause size={18} /> : <PlayIcon size={18} />}
          </IconBtn>
          <IconBtn
            label="Hear it"
            onClick={() => hear(at, auto)}
            disabled={phase === 'title'}
          >
            <Volume2 size={18} />
          </IconBtn>
          <IconBtn
            label="English"
            onClick={() => setEnglish((e) => !e)}
            active={english}
          >
            <Languages size={18} />
          </IconBtn>
          <IconBtn
            label="Script"
            onClick={() => setScript((s) => !s)}
            active={script}
          >
            <ScrollText size={18} />
          </IconBtn>
          <Progress
            n={last + 1}
            at={phase === 'title' ? -1 : at}
            ended={ended}
          />
          {!ended ? (
            <Btn onClick={next} className="ml-auto">
              Go on <ChevronRight size={18} />
            </Btn>
          ) : null}
        </div>
      </div>

      {script && (
        <ol className="mx-auto mt-3 flex max-w-4xl flex-col gap-2">
          {story.lines.slice(0, at + 1).map(([lzh, len], i) => (
            <li key={i} className="zh-card zh-rise flex gap-3 p-3">
              <span className="w-5 shrink-0 pt-1 text-right text-xs font-bold text-[var(--ink-2)] tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0">
                <Mixed line={lzh} fresh={freshSet} size="sm" />
                <p className="mt-1 text-sm text-[var(--ink-2)]">{len}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {ended && (
        <div className="mx-auto mt-4 max-w-4xl">
          {quiz ? (
            <Quiz
              story={story}
              onDone={(stars) => {
                setScene(`story:${story.id}`, stars)
                points(3 + stars)
              }}
              onExit={onExit}
              onAgain={onAgain}
            />
          ) : (
            <div className="zh-card zh-rise flex flex-wrap items-center gap-3 p-5">
              <span className="zh text-3xl text-[var(--red)]">完</span>
              <p className="mr-auto text-[var(--ink-2)]">
                The end. Three questions on what you saw?
              </p>
              <Btn onClick={() => setQuiz(true)}>Three questions</Btn>
              <Btn kind="ghost" onClick={onAgain}>
                <RotateCcw size={16} /> Again
              </Btn>
            </div>
          )}
        </div>
      )}
    </Frame>
  )
}

function IconBtn({
  label,
  onClick,
  children,
  active,
  disabled,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition disabled:opacity-30 ${
        active
          ? 'bg-[var(--ink)] text-[var(--paper)]'
          : 'bg-[var(--paper-2)] text-[var(--ink)] hover:brightness-95'
      }`}
    >
      {children}
    </button>
  )
}

// The lines as a string of lanterns: past, present and to come
function Progress({ n, at, ended }: { n: number; at: number; ended: boolean }) {
  return (
    <span className="mx-1 hidden items-center gap-1 sm:flex" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full transition ${
            ended || i < at
              ? 'bg-[var(--red)]/45'
              : i === at
                ? 'scale-125 bg-[var(--red)] shadow-[0_0_6px_rgba(200,55,45,0.7)]'
                : 'bg-[var(--ink)]/12'
          }`}
        />
      ))}
    </span>
  )
}

function Quiz({
  story,
  onDone,
  onExit,
  onAgain,
}: {
  story: Story
  onDone: (stars: number) => void
  onExit: () => void
  onAgain: () => void
}) {
  const [at, setAt] = useState(0)
  const [right, setRight] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const q = story.questions[at] as Story['questions'][number] | undefined
  const options = useMemo(() => (q ? shuffle(q.options) : []), [q])
  if (!q)
    return (
      <div className="zh-card zh-pop flex flex-col items-center p-6 text-center">
        <Stars n={Math.max(1, right)} />
        <p className="mt-2 font-bold">
          {right} of {story.questions.length} right
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Btn onClick={onExit}>All stories</Btn>
          <Btn kind="ghost" onClick={onAgain}>
            <RotateCcw size={16} /> Watch again
          </Btn>
        </div>
      </div>
    )
  return (
    <div className="zh-card zh-rise p-5">
      <p className="text-xs font-bold tracking-wide text-[var(--ink-2)] uppercase">
        Question {at + 1} of {story.questions.length}
      </p>
      <p className="mt-1 text-lg font-black">{q.q}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const state = !picked
            ? ''
            : o === q.options[0]
              ? 'ring-2 ring-[var(--jade)] bg-[var(--jade)]/10'
              : o === picked
                ? 'ring-2 ring-[var(--red)]'
                : 'opacity-40'
          return (
            <button
              key={o}
              type="button"
              disabled={!!picked}
              onClick={() => {
                setPicked(o)
                const ok = o === q.options[0]
                blip(ok ? 'right' : 'wrong')
                const r = right + (ok ? 1 : 0)
                setRight(r)
                setTimeout(() => {
                  setPicked(null)
                  if (at + 1 >= story.questions.length) onDone(Math.max(1, r))
                  setAt((x) => x + 1)
                }, 900)
              }}
              className={`rounded-xl bg-[var(--paper)] px-4 py-3 text-left transition hover:bg-[var(--paper-2)] ${state}`}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}
