import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Settings } from 'lucide-react'
import { useStore } from './lib/store'
import { touchOnly } from './lib/device'
import { blip } from './lib/audio'
import { WORDS } from './data/words'
import { CITIES, SCENES } from './data/trip'
import { QUEST } from './data/quest'
import { STORIES } from './data/stories'
import { dayKey, level, recall, streak, unmet } from './lib/bank'
import { Pix } from './pixel/Pix'
import { Account } from './account'
import { GAMES } from './registry'
import { CourseStrip, GardenMini, SealStrip } from './daily'
import { Ring } from './daily/Ring'
import { DAILY_GAMES_HERE, describe } from './daily/steps'
import { usePlay, useToday } from './daily/useToday'
import { current, finished, plan, share } from './lib/today'
import { dayOf, partOf, partsDone } from './lib/course'
import { Mixed, MusicToggle } from './ui'
import {
  BrushLine,
  CloudDivider,
  Fret,
  Lantern,
  LivingScene,
  PaperCorners,
  Seal,
  celebrate,
  clockFromUrl,
  festival,
  greeting,
  periods,
} from './ornament'
import type { ArcState } from './daily/Ring'
import type { Bank } from './lib/bank'
import type { Period } from './ornament'
import type { ReactNode } from 'react'

// The home screen: the living scene, the one thing to do next today (for
// someone new, the day of the beginner's course), the day's goal and the
// week, then every game by kind

// Points a day that keep the streak worth having
const GOAL = 30
const ART = '/art/shell/'

type Game = (typeof GAMES)[number]

// The games by kind, in this order. A game may also name its group in
// registry.tsx (`group: 'skills'`); one in neither is shown under More.
const GROUPS = [
  {
    id: 'adventures',
    title: 'Adventures',
    zh: '冒险',
    pinyin: 'màoxiǎn',
    ids: ['trip', 'quest', 'stories', 'bridge'],
  },
  {
    id: 'practice',
    title: 'Practice',
    zh: '练习',
    pinyin: 'liànxí',
    ids: ['learn', 'review', 'listen', 'order', 'quiz'],
  },
  {
    id: 'skills',
    title: 'Skills',
    zh: '功夫',
    pinyin: 'gōngfu – skill, from time and effort',
    ids: ['start', 'pinyin', 'tones', 'parts', 'write', 'numbers', 'sayings'],
  },
  {
    id: 'arcade',
    title: 'Arcade',
    zh: '游戏',
    pinyin: 'yóuxì – games',
    ids: ['rain', 'shop', 'market', 'taxi', 'mahjong'],
  },
] as const

// Reached from elsewhere on the page, not as tiles: Today, the garden and
// the seals have cards of their own under the day's next step
const UNLISTED = new Set(['settings', 'words', 'today', 'garden', 'seals'])

// On a phone, the games that need a keyboard are left out
const PHONE = touchOnly()
const forKeyboard = GAMES.filter((g) => 'keyboard' in g)

function groupOf(g: Game): string | null {
  if (UNLISTED.has(g.id) || 'hidden' in g) return null
  if (PHONE && 'keyboard' in g) return null
  const named = (g as { group?: string }).group
  if (named) return named
  return (
    GROUPS.find((gr) => (gr.ids as ReadonlyArray<string>).includes(g.id))?.id ??
    'more'
  )
}

export default function Home() {
  const { bank } = useStore()
  const now = Date.now()
  const met = WORDS.filter((w) => bank.cards[w.id])
  const knownN = met.filter((w) => level(bank.cards[w.id], now) === 2).length
  const fading = met.filter((w) => recall(bank.cards[w.id]!, now) < 0.85).length
  const today = bank.days[dayKey(now)] ?? 0
  const reached = today >= GOAL

  // Once a day, the first time the home screen sees the goal reached
  useEffect(() => {
    if (!reached) return
    const key = 'tian:goal:v1'
    const day = dayKey(Date.now())
    try {
      if (localStorage.getItem(key) === day) return
      localStorage.setItem(key, day)
    } catch {
      return
    }
    const t = setTimeout(() => celebrate(), 700)
    return () => clearTimeout(t)
  }, [reached])

  const groups = [
    ...GROUPS.map((gr) => ({ ...gr, games: [] as Array<Game> })),
    {
      id: 'more',
      title: 'More',
      zh: '更多',
      pinyin: 'gèng duō – more',
      ids: [],
      games: [] as Array<Game>,
    },
  ]
  for (const g of GAMES) {
    const id = groupOf(g)
    if (!id) continue
    const group = groups.find((gr) => gr.id === id) ?? groups[groups.length - 1]
    group.games.push(g)
  }

  return (
    <div className="pb-16">
      <Hero />
      <main className="relative z-10 mx-auto -mt-20 max-w-5xl px-4 sm:-mt-28">
        <Today
          bank={bank}
          fading={fading}
          today={today}
          known={knownN}
          learning={met.length - knownN}
        />
        {/* The garden and the seals */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <a
            href="#garden"
            className="zh-card zh-lift block overflow-hidden"
            aria-label="The garden"
          >
            <GardenMini />
          </a>
          <SealStrip />
        </div>
        {groups.map((gr) =>
          gr.games.length ? (
            <Section
              key={gr.id}
              id={gr.id}
              zh={gr.zh}
              pinyin={gr.pinyin}
              title={gr.title}
            >
              {gr.id === 'adventures' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {gr.games.map((g) => (
                    <Adventure key={g.id} game={g} bank={bank} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {gr.games.map((g) => (
                    <Tile key={g.id} game={g} best={bank.best[g.id]} />
                  ))}
                </div>
              )}
            </Section>
          ) : null,
        )}
        <footer className="mt-16 text-center text-sm text-[var(--ink-2)]">
          <Fret className="mx-auto mb-6 h-2 w-48 text-[var(--gold)] opacity-60" />
          <nav className="mb-3 flex items-center justify-center gap-5 font-bold text-[var(--ink)]">
            <a
              href="#words"
              className="inline-flex items-center gap-1.5 hover:text-[var(--red)]"
            >
              <BookOpen size={16} /> Word bank
            </a>
            <a
              href="#settings"
              className="inline-flex items-center gap-1.5 hover:text-[var(--red)]"
            >
              <Settings size={16} /> Settings
            </a>
          </nav>
          {PHONE && forKeyboard.length > 0 && (
            <p className="mb-2">
              Left out on a phone, as they are typed against the clock:{' '}
              {forKeyboard.map((g) => g.title).join(', ')}.
            </p>
          )}
          <p>
            Voices by Gemini TTS. Progress is kept in this browser{' '}
            <span className="whitespace-nowrap">
              – sign in to keep it on your account.
            </span>
          </p>
          <p className="mt-2">
            <a href="/about" className="underline underline-offset-4">
              About
            </a>
            {' · '}
            <a href="/privacy" className="underline underline-offset-4">
              Privacy
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}

// --- The scene and the title over it ---

// The top of the sky in each picture, for the browser's bar
const SKY_TOP: Record<Period, string> = {
  dawn: '#5d5fae',
  day: '#5f93e0',
  dusk: '#3b2f6e',
  night: '#0c1a47',
}

function Hero() {
  const clock = useMemo(() => clockFromUrl(), [])
  const now = clock ? clock() : new Date()
  const fest = festival(now)
  const top = periods(now).sort((a, b) => b[1] - a[1])[0][0]
  const title = useRef<HTMLDivElement>(null)
  const tools = useRef<HTMLDivElement>(null)
  // The browser's bar the colour of the sky, while here
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const before = meta.getAttribute('content') ?? '#f7f0e3'
    meta.setAttribute('content', SKY_TOP[top])
    return () => meta.setAttribute('content', before)
  }, [top])
  return (
    <section className="relative mx-auto h-[360px] max-w-[1920px] sm:h-[clamp(380px,36vw,600px)]">
      <div className="absolute inset-0 overflow-hidden">
        <LivingScene
          clock={clock}
          clear={() =>
            [title.current, tools.current].flatMap((el) =>
              el ? [el.getBoundingClientRect()] : [],
            )
          }
        />
        <div className="zh-hero-shade pointer-events-none absolute inset-0" />
      </div>
      {/* Lanterns hung in front of the scene, on wide screens, in the
          margins; lit from dusk to dawn, with characters at festivals */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto hidden max-w-[1200px] justify-between px-3 xl:flex">
        <Lantern
          size={80}
          delay={0.4}
          lit={top !== 'day'}
          char={fest ? (fest.id === 'mid-autumn' ? '中' : '福') : undefined}
        />
        <Lantern
          size={66}
          delay={1.7}
          lit={top !== 'day'}
          char={fest ? (fest.id === 'mid-autumn' ? '秋' : '春') : undefined}
          className="mr-6"
        />
      </div>
      <header
        className="relative z-20 mx-auto flex max-w-5xl items-start gap-3 px-4 pt-4 sm:gap-4 sm:pt-6"
        style={
          {
            // Mixed text, light on the sky
            '--ink': '#fff8ec',
            '--ink-2': '#f3e7d3',
            '--jade': '#b4ecd6',
            '--paper-2': 'rgba(255,250,241,0.18)',
          } as React.CSSProperties
        }
      >
        <div className="flex min-w-0 items-start gap-3 sm:gap-4" ref={title}>
          <Seal
            text="天"
            size={52}
            title="天 tiān, day; sky"
            className="mt-0.5 drop-shadow-md max-sm:h-11 max-sm:w-11"
          />
          <div className="zh-on-sky min-w-0">
            <h1 className="zh-head text-[1.8rem] whitespace-nowrap sm:text-[2.6rem]">
              Tian
            </h1>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="zh-display text-xl tracking-widest text-[#ffe6b0]"
                title="天天向上 tiān tiān xiàng shàng, a little further every day"
              >
                天天向上
              </span>
              <Mixed line={greeting(now.getHours())} size="sm" />
            </div>
            {fest && (
              <p className="mt-2 inline-flex items-baseline gap-2 rounded-full bg-black/25 px-3 py-1 text-sm">
                <span className="zh-display text-lg text-[#ffd98a]">
                  {fest.zh}
                </span>
                <span>
                  {fest.pinyin}, {fest.en}
                </span>
              </p>
            )}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2" ref={tools}>
          <MusicToggle glass />
          <a
            href="#settings"
            aria-label="Settings"
            title="Settings"
            className="zh-glass inline-flex h-10 w-10 items-center justify-center rounded-full transition max-sm:hidden"
          >
            <Settings size={18} />
          </a>
          <Account glass />
        </div>
      </header>
    </section>
  )
}

// --- Today: the next thing to do, the goal, the week ---

interface Step {
  href: string
  zh: string
  pinyin: string
  title: string
  text: ReactNode
  go: string
  art: ReactNode
  // Instead of following the link
  onGo?: () => void
}

function Today({
  bank,
  fading,
  today,
  known,
  learning,
}: {
  bank: Bank
  fading: number
  today: number
  known: number
  learning: number
}) {
  const next = SCENES.find((sc) => !bank.scenes[sc.id])
  const city = next && CITIES.find((c) => c.scenes.includes(next))
  const started = SCENES.some((sc) => bank.scenes[sc.id])
  const toMeet = unmet(bank).length
  const reached = today >= GOAL

  const review: Step = {
    href: '#review',
    zh: '复习',
    pinyin: 'fùxí',
    title: `Review ${fading} fading ${fading === 1 ? 'word' : 'words'}`,
    text: 'They are slipping. A few minutes now keeps them for days.',
    go: 'Review',
    art: <SpriteArt name="review" />,
  }
  const trip: Step | null = next
    ? {
        href: '#trip',
        zh: '旅行',
        pinyin: 'lǚxíng',
        title: started ? 'Continue the trip' : 'Start the trip',
        text: (
          <>
            <span className="font-bold text-[var(--ink)]">
              Next stop: {next.title}
              {city && (
                <>
                  {', '}
                  <span className="zh font-normal">{city.h}</span> {city.name}
                </>
              )}
            </span>
            <span className="block">{next.intro}</span>
          </>
        ),
        go: started ? 'Go on' : 'Begin',
        art: (
          <img
            src={`${ART}adventure-trip.png`}
            alt=""
            className="h-full w-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
        ),
      }
    : null
  const learn: Step = {
    href: '#learn',
    zh: '学',
    pinyin: 'xué',
    title: 'Learn five new words',
    text: `${toMeet} words still to meet, in the order the trip uses them.`,
    go: 'Start',
    art: <SpriteArt name="sprout" />,
  }
  const free: Step = {
    href: '#mahjong',
    zh: '玩',
    pinyin: 'wán',
    title: 'Play anything',
    text: 'Every word met, and none fading. Pick any game below.',
    go: 'Mahjong',
    art: <SpriteArt name="mahjong" />,
  }
  // Today's guided ten minutes (games/today.tsx) come first until they are
  // done; then the one thing most worth doing next
  const path = useToday()
  const preview = useMemo(
    () => path ?? plan(bank, Date.now(), DAILY_GAMES_HERE),
    [path, bank],
  )
  const at = current(preview)
  const sessionDone = finished(preview)
  const arcs: Array<ArcState> = preview.steps.map((s, i) =>
    s.done ? 'done' : path && i === at ? 'now' : 'todo',
  )
  const now = at >= 0 ? describe(preview.steps[at]) : null
  const minutes = preview.steps
    .filter((s) => !s.done)
    .reduce((m, s) => m + describe(s).minutes, 0)
  const ring = (glyph: string) => (
    <span className="flex h-full w-full items-center justify-center">
      <Ring
        steps={arcs}
        part={path && at >= 0 ? share(preview.steps[at]) : 0}
        size={92}
        width={10}
      >
        <span className="zh text-3xl text-[var(--ink)]">
          {path && now ? now.glyph : glyph}
        </span>
      </Ring>
    </span>
  )
  // For a beginner, the session carries the day of First steps
  // (lib/today.ts), and leads as that day, the course beneath it
  // (CourseStrip). A part to do now opens on the course's page at once.
  const play = usePlay()
  const parts = preview.steps.filter((s) => s.k === 'course')
  const part = partOf((parts.find((s) => !s.done) ?? parts.at(0))?.arg)
  const leading = !sessionDone && !!part
  const begun = partsDone(bank) > 0
  const first = Math.max(0, at)
  const opensPart = preview.steps[first].k === 'course'
  const courseDay: Step | null = leading
    ? {
        href: opensPart ? '#start' : '#today',
        zh: '入门',
        pinyin: 'rùmén – in at the gate: to get started',
        title: begun
          ? `Day ${dayOf(part).n}: ${dayOf(part).title}`
          : 'Start here',
        text:
          path && now ? (
            <>
              Step {at + 1} of {preview.steps.length}:{' '}
              <span className="font-bold text-[var(--ink)]">{now.title}</span> –{' '}
              {opensPart ? `about ${now.minutes} minutes` : now.detail}
            </>
          ) : !begun ? (
            `New to Chinese? Seven short days on how it works: characters, tones, pinyin and your first sentences. About ${minutes} minutes today.`
          ) : (
            `About ${minutes} minutes: ${preview.steps[0].k === 'review' ? 'a review, then ' : ''}${
              parts.length === 3
                ? 'the three parts'
                : parts.length === 2
                  ? 'the last two parts'
                  : 'the last part'
            } of day ${dayOf(part).n}.`
          ),
        go: path ? 'Continue' : begun ? 'Start' : 'Begin',
        art: ring('入'),
        ...(opensPart ? { onGo: () => play(path ?? preview, first) } : {}),
      }
    : null
  const session: Step | null = sessionDone
    ? null
    : (courseDay ?? {
        href: '#today',
        zh: '每天',
        pinyin: 'měitiān – every day',
        title: path ? 'Today’s ten minutes' : 'Ten minutes a day',
        text:
          path && now ? (
            <>
              Step {at + 1} of {preview.steps.length}:{' '}
              <span className="font-bold text-[var(--ink)]">{now.title}</span> –{' '}
              {now.detail}
            </>
          ) : (
            `About ${minutes} minutes, guided: ${preview.steps
              .map((s) => describe(s).title.toLowerCase())
              .join(', ')}.`
          ),
        go: path ? 'Continue' : 'Start',
        art: ring('今'),
      })
  const usual =
    fading >= 6 && !reached
      ? review
      : (trip ?? (toMeet ? learn : fading ? review : free))
  const step = session ?? usual
  // Nothing beside the course's day, for someone new
  const others = leading
    ? []
    : [
        fading && step !== review ? review : null,
        trip && step !== trip ? trip : null,
        toMeet && step !== learn ? learn : null,
      ].filter((s): s is Step => !!s)

  return (
    <section
      aria-label="Today"
      className="zh-card relative overflow-hidden px-5 pt-5 pb-5 sm:px-7 sm:pt-6"
    >
      <PaperCorners size={46} corners={['tr']} className="opacity-90" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="mb-4 inline-block">
            <h2 className="flex items-baseline gap-2.5">
              <span
                className="zh-display text-3xl text-[var(--red)]"
                title="jīntiān, today"
              >
                今天
              </span>
              <span className="zh-head text-2xl">Today</span>
            </h2>
            <BrushLine
              color="var(--red)"
              className="-mt-0.5 h-2.5 w-full opacity-80"
            />
          </div>
          <a
            href={step.href}
            onClick={(e) => {
              if (!step.onGo) return
              e.preventDefault()
              step.onGo()
            }}
            className="group flex flex-col gap-4 rounded-2xl sm:flex-row sm:items-center"
          >
            <span className="relative block h-28 shrink-0 overflow-hidden rounded-xl bg-[var(--paper-2)] shadow-[inset_0_0_0_1px_rgba(34,28,24,0.08)] sm:h-28 sm:w-44">
              {step.art}
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span
                  className="zh-display shrink-0 text-2xl text-[var(--red)]"
                  title={step.pinyin}
                  data-zh-title={step.href.slice(1)}
                >
                  {step.zh}
                </span>
                <span className="zh-head text-[1.7rem]">{step.title}</span>
              </span>
              <span className="mt-1 block leading-snug text-[var(--ink-2)]">
                {step.text}
              </span>
              <span className="zh-btn zh-btn-follow mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--red)] px-5 py-2.5 font-bold text-[#fff6ea] [--edge:#8e2219]">
                {step.go}
                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-0.5"
                />
              </span>
            </span>
          </a>
          <CourseStrip
            leading={leading}
            className="mt-4 border-t border-[var(--paper-2)] pt-3"
          />
          {others.length > 0 && (
            <p className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-[var(--ink-2)]">
              <span className="mr-1">Or:</span>
              {others.map((o) => (
                <a
                  key={o.href}
                  href={o.href}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--paper-2)] px-3 py-1 font-bold text-[var(--ink)] transition hover:bg-[var(--paper-3)]"
                >
                  <span className="zh font-normal text-[var(--red)]">
                    {o.zh}
                  </span>
                  {o.title}
                </a>
              ))}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5 border-t border-[var(--paper-2)] pt-5 lg:flex-col lg:items-stretch lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
          <GoalRing points={today} />
          <Week bank={bank} />
        </div>
      </div>
      <Words known={known} learning={learning} fading={fading} />
    </section>
  )
}

function SpriteArt({ name }: { name: string }) {
  return (
    <span className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_60%,#fffaf1,var(--paper-2))]">
      <Pix name={name} size={72} className="zh-bob" />
    </span>
  )
}

// Today's points on the way round to the goal; at the goal, a seal
function GoalRing({ points }: { points: number }) {
  const r = 40
  const len = 2 * Math.PI * r
  const k = Math.min(1, points / GOAL)
  const reached = points >= GOAL
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-24 w-24 shrink-0"
        role="img"
        aria-label={`${points} of ${GOAL} points today${reached ? ', goal reached' : ''}`}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="zh-goal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d9a441" />
              <stop offset="1" stopColor="#c8372d" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--paper-2)"
            strokeWidth="9"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="url(#zh-goal)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${len * k} ${len}`}
            className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {reached ? (
            <Seal text="好" size={44} stamp tilt={-6} title="好 hǎo, good" />
          ) : (
            <>
              <span className="text-2xl leading-none font-black tabular-nums">
                {points}
              </span>
              <span className="text-xs text-[var(--ink-2)]">of {GOAL}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-sm leading-snug">
        <div className="font-bold">
          {reached ? `${points} points – the day’s goal` : 'Today’s goal'}
        </div>
        <div className="text-[var(--ink-2)]">
          {reached
            ? 'Reached. Anything more is a bonus.'
            : `${GOAL - points} more ${GOAL - points === 1 ? 'point' : 'points'}: a point a right answer.`}
        </div>
      </div>
    </div>
  )
}

// The days of the week in Chinese: 星期一 is Monday, and Sunday is 日
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']
const WEEKDAY_PY = ['rì', 'yī', 'èr', 'sān', 'sì', 'wǔ', 'liù']
const WEEKDAY_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// This week, Monday to Sunday, as seals: stamped on a day with points, the
// days still to come paler. The first time the home screen sees today
// stamped, it is pressed down with a thud.
function Week({ bank }: { bank: Bank }) {
  const now = new Date()
  const days = streak(bank, now.getTime())
  // getDay() counts from Sunday
  const sinceMonday = (now.getDay() + 6) % 7
  const week = Array.from({ length: 7 }, (_, i) => {
    // Noon on each day, so a change of the clocks never skips one
    const t = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - sinceMonday + i,
      12,
    ).getTime()
    const d = new Date(t).getDay()
    return {
      t,
      d,
      points: bank.days[dayKey(t)] ?? 0,
      today: i === sinceMonday,
      later: i > sinceMonday,
    }
  })
  const todayStamped = week[sinceMonday].points > 0
  const [fresh, setFresh] = useState(false)
  useEffect(() => {
    if (!todayStamped) return
    const key = 'tian:stamped:v1'
    const day = dayKey(Date.now())
    try {
      if (localStorage.getItem(key) === day) return
      localStorage.setItem(key, day)
    } catch {
      return
    }
    setFresh(true)
    const t = setTimeout(() => blip('stamp'), 350)
    return () => clearTimeout(t)
  }, [todayStamped])
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-bold">This week</span>
        <span className="text-[var(--ink-2)]">
          {days
            ? `${days} ${days === 1 ? 'day' : 'days'} in a row`
            : 'A day with points starts a streak'}
        </span>
      </div>
      <ol className="flex gap-1.5">
        {week.map(({ t, d, points, today, later }) => (
          <li
            key={t}
            className={`flex flex-col items-center gap-1 rounded-lg px-0.5 pt-1 pb-0.5 ${today ? 'bg-[var(--paper-2)]' : ''} ${later ? 'opacity-55' : ''}`}
          >
            <Seal
              text={WEEKDAY[d]}
              size={30}
              faded={!points}
              stamp={today && fresh}
              tilt={(d % 3) - 1}
              title={`星期${WEEKDAY[d]} xīngqī${WEEKDAY_PY[d]}, ${WEEKDAY_EN[d]}${later ? '' : `: ${points} ${points === 1 ? 'point' : 'points'}`}`}
            />
            <span className="text-[10px] leading-none text-[var(--ink-2)]">
              {today ? 'today' : WEEKDAY_EN[d].slice(0, 2)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// How many words are known, learning and still to meet
function Words({
  known,
  learning,
  fading,
}: {
  known: number
  learning: number
  fading: number
}) {
  const all = WORDS.length
  const rest = all - known - learning
  return (
    <div className="mt-6 border-t border-[var(--paper-2)] pt-4">
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-[var(--paper-2)]"
        aria-hidden
      >
        <div
          className="bg-[var(--red)]"
          style={{ width: `${(known / all) * 100}%` }}
        />
        <div
          className="bg-[var(--jade)]"
          style={{ width: `${(learning / all) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <span>
          <b className="text-[var(--red)] tabular-nums">{known}</b> known
        </span>
        <span>
          <b className="text-[var(--jade)] tabular-nums">{learning}</b> learning
          {fading > 0 && (
            <span className="text-[var(--gold-2)]"> · {fading} fading</span>
          )}
        </span>
        <span>
          <b className="tabular-nums">{rest}</b> to meet, of {all}
        </span>
        <a
          href="#words"
          className="ml-auto inline-flex items-center gap-1 font-bold text-[var(--ink-2)] hover:text-[var(--red)]"
        >
          Word bank <ArrowRight size={14} />
        </a>
      </div>
    </div>
  )
}

// --- The games ---

function Section({
  id,
  zh,
  pinyin,
  title,
  children,
}: {
  id: string
  zh: string
  pinyin: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-12" aria-labelledby={`zh-group-${id}`}>
      <CloudDivider className="mb-5 text-[var(--gold-2)]">
        <h2 id={`zh-group-${id}`} className="flex items-baseline gap-2.5 px-3">
          <span
            className="zh-display text-[1.7rem] text-[var(--red)]"
            title={pinyin}
          >
            {zh}
          </span>
          <span className="zh-head text-[1.6rem] text-[var(--ink)]">
            {title}
          </span>
        </h2>
      </CloudDivider>
      {children}
    </section>
  )
}

// What each adventure has to show of the player's way through it
function progress(
  id: string,
  bank: Bank,
): { done: number; of: number; next?: string } | null {
  if (id === 'trip') {
    const next = SCENES.find((s) => !bank.scenes[s.id])
    return {
      done: SCENES.filter((s) => bank.scenes[s.id]).length,
      of: SCENES.length,
      next: next?.title,
    }
  }
  if (id === 'quest') {
    const next = QUEST.find((c) => !bank.scenes[c.id])
    return {
      done: QUEST.filter((c) => bank.scenes[c.id]).length,
      of: QUEST.length,
      next: next?.title,
    }
  }
  if (id === 'stories') {
    const next = STORIES.find((s) => !bank.scenes[`story:${s.id}`])
    return {
      done: STORIES.filter((s) => bank.scenes[`story:${s.id}`]).length,
      of: STORIES.length,
      next: next?.title,
    }
  }
  return null
}

const UNITS: Record<string, string> = {
  trip: 'scenes',
  quest: 'chapters',
  stories: 'stories',
}

function Adventure({ game, bank }: { game: Game; bank: Bank }) {
  const p = progress(game.id, bank)
  const art = ['trip', 'quest', 'stories', 'bridge'].includes(game.id)
    ? `${ART}adventure-${game.id}.png`
    : null
  return (
    <a
      href={`#${game.id}`}
      className="zh-card zh-lift group relative flex flex-col overflow-hidden"
    >
      <span className="relative block h-36 overflow-hidden bg-[var(--night)] sm:h-40">
        {art ? (
          <img
            src={art}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:brightness-110"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <Pix name={game.sprite} size={72} className="zh-bob" />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/35 to-transparent" />
      </span>
      <span className="flex flex-1 flex-col p-4 pt-3">
        <span className="flex items-baseline gap-2.5">
          <span
            className="zh-display text-2xl text-[var(--red)]"
            data-zh-title={game.id}
          >
            {game.zh}
          </span>
          <span className="zh-head text-[1.45rem]">{game.title}</span>
        </span>
        <span className="mt-0.5 text-sm leading-snug text-[var(--ink-2)]">
          {game.blurb}
        </span>
        {p && (
          <span className="mt-auto pt-3 text-xs text-[var(--ink-2)]">
            <span className="mb-1.5 flex h-1.5 overflow-hidden rounded-full bg-[var(--paper-2)]">
              <span
                className="bg-[var(--gold)]"
                style={{ width: `${(p.done / p.of) * 100}%` }}
              />
            </span>
            <span className="flex justify-between gap-3">
              <span>
                {p.done} of {p.of} {UNITS[game.id]}
              </span>
              {p.next && (
                <span className="truncate font-bold text-[var(--ink)]">
                  Next: {p.next}
                </span>
              )}
            </span>
          </span>
        )}
        {!p && bank.best[game.id] ? (
          <span className="mt-auto pt-3 text-xs font-bold text-[var(--gold-2)]">
            Best: {bank.best[game.id]}
          </span>
        ) : null}
      </span>
    </a>
  )
}

function Tile({ game, best }: { game: Game; best?: number }) {
  return (
    <a
      href={`#${game.id}`}
      className="zh-card zh-lift group flex items-start gap-3.5 p-4"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--paper-2)] shadow-[inset_0_0_0_1px_rgba(34,28,24,0.06)]">
        <Pix name={game.sprite} size={40} className="zh-bob" />
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span
            className="zh text-lg text-[var(--red)]"
            data-zh-title={game.id}
          >
            {game.zh}
          </span>
          <span className="font-bold">{game.title}</span>
        </span>
        <span className="block text-sm leading-snug text-[var(--ink-2)]">
          {game.blurb}
        </span>
        {best ? (
          <span className="mt-1 block text-xs font-bold text-[var(--gold-2)]">
            Best: {best}
          </span>
        ) : null}
      </span>
    </a>
  )
}
