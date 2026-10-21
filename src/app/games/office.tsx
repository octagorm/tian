import { useEffect, useRef, useState } from 'react'
import {
  Briefcase,
  Eye,
  MessageCircle,
  Mic,
  Phone,
  Users,
  Volume2,
} from 'lucide-react'
import {
  CAST,
  DAY,
  HUH,
  MISSES_ALLOWED,
  NOT_THAT,
  RANKS,
  REPLY_VOICE,
  STREAK,
  askerOf,
} from '../data/office'
import { LESSONS, WORD } from '../data/words'
import { blip } from '../lib/audio'
import { clockAt, dayOf, lookOf, offers, promotion } from '../lib/office'
import { plain, wordIds } from '../lib/text'
import { useStore } from '../lib/store'
import { Btn, Frame, Mixed } from '../ui'
import { Face, Pix } from '../pixel/Pix'
import {
  COLORS,
  Combo,
  CountUp,
  Key,
  Seal,
  burst,
  confetti,
  floatText,
  replay,
  useKeys,
  useSpeaker,
} from './fx'
import { OfficeScene } from './officeScene'
import type { Kind, Said, Task } from '../data/office'
import type { Offer, Result } from '../lib/office'

// The office: a working day of ten tasks at a desk. Colleagues write, send
// voice messages and call; the player replies, or does what was asked.
// Messages to read are shown; voice messages, calls, meetings and the
// boss's orders are heard, with the words to show if need be. A day with
// at most one miss, or a long run of answers right the first time, earns a
// promotion, and each rank brings tasks of its own. The tasks are in
// data/office.ts, the rules in lib/office.ts.

// What an answer says about the words: heard, or read
const HEARD = 0.6
const READ = 0.3

// The office's own lesson, whose words are met as they come up
const OFFICE_LESSON = LESSONS.find((l) => l.zh === '办公室')?.n

// The best rank reached is kept as its number from one
const RANK_KEY = 'office-rank'

const CHANNEL: Record<Kind, { title: string; Icon: typeof Phone }> = {
  chat: { title: 'Message', Icon: MessageCircle },
  voice: { title: 'Voice message', Icon: Mic },
  call: { title: 'Phone call', Icon: Phone },
  meet: { title: 'Meeting', Icon: Users },
  pass: { title: 'From the boss', Icon: Briefcase },
}

const heardKind = (k: Kind) => k !== 'chat'

type Phase = 'ready' | 'task' | 'answered' | 'evening' | 'promoted'

export default function Office() {
  const store = useStore()
  const { bank, settings } = store
  const top = Math.max(
    0,
    Math.min(RANKS.length - 1, (bank.best[RANK_KEY] ?? 1) - 1),
  )
  const [rank, setRank] = useState(top)
  const [phase, setPhase] = useState<Phase>('ready')
  const [day, setDay] = useState<Array<Task>>([])
  const [at, setAt] = useState(0)
  const [offered, setOffered] = useState<Array<Offer>>([])
  const [tried, setTried] = useState<Array<number>>([])
  const [chosen, setChosen] = useState<number | null>(null)
  const [shown, setShown] = useState(false)
  const [heard, setHeard] = useState(0)
  const [ringing, setRinging] = useState(false)
  const [complaint, setComplaint] = useState<Said | null>(null)
  const [results, setResults] = useState<Array<Result>>([])
  const [streak, setStreak] = useState(0)
  const [combo, setCombo] = useState(0)
  const [pay, setPay] = useState(0)
  const [talker, setTalker] = useState<string | null>(null)
  const { speaking, play } = useSpeaker()

  const box = useRef<HTMLDivElement>(null)
  const recent = useRef<Array<string>>([])
  const missed = useRef(new Set<string>())
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const talkTurn = useRef(0)
  const latest = useRef({ store, rank, day, at, streak })
  latest.current = { store, rank, day, at, streak }

  const later = (f: () => void, ms: number) =>
    timers.current.push(setTimeout(f, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const vars = { home: settings.home }
  const idsOf = (zh: string) => wordIds(zh, vars)

  // Lines said one after another, each in its speaker's voice; saying
  // something new cuts off what was being said. `onLine` hears of each as
  // it starts.
  const talk = async (
    lines: Array<{ by: string; zh: string }>,
    onLine?: (k: number) => void,
  ) => {
    const me = ++talkTurn.current
    for (const [k, line] of lines.entries()) {
      if (talkTurn.current !== me) return false
      onLine?.(k)
      setTalker(line.by)
      const voice = line.by === 'you' ? REPLY_VOICE : CAST[line.by].voice
      await play(plain(line.zh, vars), voice)
      if (talkTurn.current !== me) return false
      await new Promise((r) => setTimeout(r, 220))
    }
    if (talkTurn.current === me) setTalker(null)
    return talkTurn.current === me
  }

  // --- A day ---

  const begin = (tasks: Array<Task>, k: number) => {
    const t = tasks[k]
    const { bank: b, meet } = latest.current.store
    // the words to choose between, and the office's own words, met now
    const choices = t.pick.flatMap(idsOf)
    const own = [...t.lines, ...t.after, ...t.replies]
      .flatMap((l) => idsOf(l.zh))
      .filter((id) => WORD[id]?.lesson === OFFICE_LESSON)
    meet([...new Set([...choices, ...own])].filter((id) => !b.cards[id]))
    missed.current = new Set()
    setAt(k)
    setOffered(offers(t))
    setTried([])
    setChosen(null)
    setShown(!heardKind(t.kind))
    setComplaint(null)
    setPhase('task')
    if (t.kind === 'chat') {
      setHeard(t.lines.length)
      later(() => void talk(t.lines), 350)
      return
    }
    setHeard(0)
    if (t.kind === 'call') {
      setRinging(true)
      blip('chime')
      later(() => blip('chime'), 450)
      later(() => {
        setRinging(false)
        void talk(t.lines, (n) => setHeard(n + 1))
      }, 1200)
      return
    }
    later(() => void talk(t.lines, (n) => setHeard(n + 1)), 450)
  }

  const startDay = (r: number) => {
    const tasks = dayOf(r, Math.random, recent.current)
    recent.current = tasks.map((t) => t.id)
    setRank(r)
    setDay(tasks)
    setResults([])
    setPay(0)
    setCombo(0)
    begin(tasks, 0)
  }

  const evening = (rs: Array<Result>, earned: number) => {
    const { rank: r, streak: run, store: s } = latest.current
    const hits = rs.filter((x) => x.hit).length
    s.setBest('office', earned)
    s.points(Math.floor(hits / 2))
    if (promotion(r, rs, run)) {
      s.setBest(RANK_KEY, r + 2)
      setPhase('promoted')
      blip('gong')
      later(() => confetti(), 500)
      const line = RANKS[r + 1].promoted
      if (line) later(() => void talk([line]), 700)
      return
    }
    setPhase('evening')
    if (hits === DAY) confetti()
  }

  const next = () => {
    const { day: tasks, at: k } = latest.current
    talkTurn.current++
    if (k + 1 < tasks.length) begin(tasks, k + 1)
    else evening(results, pay)
  }

  const promote = () => {
    setStreak(0)
    startDay(Math.min(RANKS.length - 1, rank + 1))
  }

  // --- Answering ---

  const choose = (k: number, from?: Element | null) => {
    const t = day[at] as Task | undefined
    if (phase !== 'task' || !t || tried.includes(k)) return
    const o = offered[k]
    const { record, levelOf } = latest.current.store
    const right = offered.find((x) => x.right)!
    if (!o.right) {
      setTried((ts) => [...ts, k])
      setCombo(0)
      blip('wrong')
      replay(box.current, 'fx-shake')
      // the words of the right answer that the wrong one lacks
      const chose = new Set(idsOf(o.zh))
      for (const id of idsOf(right.zh))
        if (!chose.has(id) && !missed.current.has(id)) {
          missed.current.add(id)
          if (levelOf(id) > 0) record(id, false, HEARD)
        }
      const asker = askerOf(t)
      const line = { by: asker, ...(t.replies.length ? HUH : NOT_THAT) }
      setComplaint(line)
      const said = t.replies.length ? [{ by: 'you', zh: o.zh }, line] : [line]
      void talk(said)
      return
    }
    const peeked = heardKind(t.kind) && shown
    const hit = tried.length === 0 && !peeked
    if (tried.length === 0)
      for (const id of new Set([
        ...t.lines.flatMap((l) => idsOf(l.zh)),
        ...idsOf(o.zh),
      ]))
        if (levelOf(id) > 0) record(id, true, shown ? READ : HEARD)
    const rs = [...results, { id: t.id, hit }]
    const earned = pay + (hit ? RANKS[rank].pay : 0)
    setResults(rs)
    setPay(earned)
    setStreak((s) => (hit ? s + 1 : 0))
    setCombo((c) => (hit ? c + 1 : 0))
    setChosen(k)
    setComplaint(null)
    setShown(true)
    setHeard(t.lines.length)
    setPhase('answered')
    blip('right')
    if (from) {
      burst(from, { colors: [COLORS.jade, COLORS.gold, COLORS.paper], n: 12 })
      if (hit)
        floatText(from, `+¥${RANKS[rank].pay}`, {
          color: '#b8862a',
          size: 22,
        })
    }
    const said = [
      ...(t.replies.length ? [{ by: 'you', zh: o.zh }] : []),
      ...t.after,
    ]
    if (said.length) void talk(said)
  }

  const hear = () => {
    const t = day[at] as Task | undefined
    if (phase === 'promoted') {
      const line = RANKS[rank + 1]?.promoted
      if (line) void talk([line])
      return
    }
    if (!t || (phase !== 'task' && phase !== 'answered')) return
    if (phase === 'answered' && t.after.length) void talk(t.after)
    else void talk(t.lines, (n) => setHeard((h) => Math.max(h, n + 1)))
  }

  useKeys((key) => {
    if (phase === 'ready' || phase === 'evening') {
      if (key !== 'Enter') return
      startDay(rank)
      return true
    }
    if (phase === 'promoted') {
      if (key !== 'Enter') return
      promote()
      return true
    }
    if (key === ' ') {
      hear()
      return true
    }
    if (phase === 'answered') {
      if (key !== 'Enter') return
      next()
      return true
    }
    const n = Number(key)
    if (n >= 1 && n <= offered.length) {
      choose(n - 1, document.querySelector(`[data-offer="${n - 1}"]`))
      return true
    }
  })

  const task = day[at] as Task | undefined
  const misses = results.filter((r) => !r.hit).length
  const hits = results.length - misses

  return (
    <Frame
      title="The office"
      zh="办公室"
      right={
        phase !== 'ready' ? (
          <span className="flex items-center gap-2">
            <Combo n={combo} className="max-sm:hidden" />
            <span
              key={pay}
              className="fx-bump inline-block font-black tabular-nums"
            >
              ¥{pay}
            </span>
          </span>
        ) : null
      }
    >
      <div
        ref={box}
        className="relative overflow-hidden rounded-3xl shadow-[0_18px_40px_-18px_rgba(60,30,10,0.7)]"
      >
        <OfficeScene
          rank={rank}
          time={clockAt(phase === 'evening' || phase === 'promoted' ? DAY : at)}
          className="block aspect-[8/3] w-full"
        />
        <div className="absolute top-2 left-2 flex items-center gap-2 rounded-xl bg-[#fffaf1]/90 py-1 pr-2.5 pl-1 text-[var(--ink)] shadow">
          <Seal text={RANKS[rank].seal} size={30} />
          <span className="leading-tight">
            <Mixed line={RANKS[rank].zh} size="sm" still />
          </span>
        </div>
        {phase !== 'ready' && (
          <div
            className="absolute right-3 bottom-3 flex gap-1"
            aria-label={`Task ${Math.min(at + 1, DAY)} of ${DAY}`}
          >
            {Array.from({ length: DAY }, (_, i) => {
              const r = results[i] as Result | undefined
              return (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full border border-black/30 ${r ? (r.hit ? 'bg-[var(--gold)]' : 'bg-[var(--red)]') : i === at ? 'bg-white' : 'bg-white/30'}`}
                />
              )
            })}
          </div>
        )}
      </div>

      {(phase === 'task' || phase === 'answered') && task && (
        <TaskView
          task={task}
          offered={offered}
          tried={tried}
          chosen={chosen}
          shown={shown}
          heard={heard}
          ringing={ringing}
          complaint={complaint}
          talker={speaking ? talker : null}
          speaking={speaking}
          onShow={() => setShown(true)}
          onHear={hear}
          onChoose={choose}
        />
      )}

      {phase === 'answered' && (
        <div className="mt-3 flex items-center justify-end gap-3">
          <span className="text-sm text-[var(--ink-2)]">
            {streak > 0 && rank < RANKS.length - 1
              ? `${streak} right in a row`
              : ''}
          </span>
          <Btn onClick={next} className="px-6 py-3">
            {at + 1 < DAY ? 'Next task' : 'End the day'}{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </div>
      )}

      {phase === 'ready' && (
        <Ready
          top={top}
          rank={rank}
          best={bank.best.office}
          onPick={setRank}
          onStart={() => startDay(rank)}
        />
      )}

      {phase === 'evening' && (
        <div className="zh-card fx-pop mt-4 p-6 text-center sm:p-8">
          <Pix name="briefcase" size={56} />
          <p className="mt-2 text-xs font-black tracking-[0.2em] text-[var(--ink-2)] uppercase">
            The day is over
          </p>
          <p className="text-5xl font-black">
            ¥<CountUp to={pay} />
          </p>
          <p className="mt-1 text-[var(--ink-2)]">
            {hits} of {DAY} right the first time
          </p>
          {rank < RANKS.length - 1 ? (
            <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--ink-2)]">
              {misses <= MISSES_ALLOWED + 1 ? 'Close: ' : 'To be promoted: '}a
              day with at most one miss, or {STREAK} right in a row
              {streak > 0 ? ` (you have ${streak})` : ''}.
            </p>
          ) : (
            <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--ink-2)]">
              You run the company.
            </p>
          )}
          <Btn
            onClick={() => startDay(rank)}
            className="mt-5 px-8 py-3 text-lg"
          >
            Another day{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </div>
      )}

      {phase === 'promoted' && RANKS[rank + 1] && (
        <div className="zh-card fx-pop mt-4 p-6 text-center sm:p-8">
          <p className="text-xs font-black tracking-[0.2em] text-[var(--ink-2)] uppercase">
            Promoted
          </p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <span className="overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-[#e8dcc4]">
              <Face look={CAST.wang.look} size={64} talking={speaking} />
            </span>
            <Seal text={RANKS[rank + 1].seal} size={72} stamp delay={400} />
          </div>
          <p className="mt-4">
            <Mixed line={RANKS[rank + 1].promoted?.zh ?? ''} size="sm" />
          </p>
          <p className="mt-3 text-[var(--ink-2)]">
            From tomorrow you are{' '}
            <strong className="text-[var(--ink)]">
              {RANKS[rank + 1].title.toLowerCase()}
            </strong>
            , with tasks of a new kind. ¥{pay} earned today.
          </p>
          <Btn onClick={promote} className="mt-5 px-8 py-3 text-lg">
            Start tomorrow{' '}
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

// --- The task: who it is from, what they said, and the answers ---

function TaskView({
  task,
  offered,
  tried,
  chosen,
  shown,
  heard,
  ringing,
  complaint,
  talker,
  speaking,
  onShow,
  onHear,
  onChoose,
}: {
  task: Task
  offered: Array<Offer>
  tried: Array<number>
  chosen: number | null
  shown: boolean
  heard: number
  ringing: boolean
  complaint: Said | null
  talker: string | null
  speaking: boolean
  onShow: () => void
  onHear: () => void
  onChoose: (k: number, from?: Element | null) => void
}) {
  const { title, Icon } = CHANNEL[task.kind]
  const people = [...new Set(task.lines.map((l) => l.by))]
  const answered = chosen !== null
  const reply = answered && task.replies.length ? offered[chosen] : null
  const prompt =
    task.prompt ??
    (task.kind === 'pass' && task.after[0]
      ? `Pass it on to ${CAST[task.after[0].by].name}`
      : 'Your reply')
  return (
    <>
      <div className="zh-card fx-rise mt-3 overflow-hidden" key={task.id}>
        <div className="flex items-center gap-2 border-b border-[var(--ink)]/10 bg-[var(--paper-2)] px-3 py-2">
          <Icon
            size={18}
            className={`shrink-0 text-[var(--jade)] ${ringing ? 'fx-shake' : ''}`}
          />
          <span className="text-xs font-black tracking-[0.15em] text-[var(--ink-2)] uppercase">
            {ringing ? 'Ringing…' : title}
          </span>
          <span className="ml-auto truncate text-sm font-bold">
            {people.map((p) => CAST[p].name).join(', ')}
          </span>
          <button
            type="button"
            onClick={onHear}
            aria-label="Hear it again"
            title="Hear it again (Space)"
            className={`shrink-0 rounded-full p-1.5 text-[var(--jade)] hover:bg-[var(--card)] ${speaking ? 'fx-bump' : ''}`}
          >
            <Volume2 size={20} />
          </button>
        </div>
        <div className="space-y-2.5 p-3">
          {ringing && (
            <div className="flex items-center gap-3 py-2">
              <span className="overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-[#e8dcc4]">
                <Face look={CAST[people[0]].look} size={44} />
              </span>
              <span className="fx-pulse inline-flex items-center gap-2 rounded-full bg-[var(--jade)] px-3 py-1.5 text-sm font-bold text-white">
                <Phone size={16} /> {CAST[people[0]].name}
              </span>
            </div>
          )}
          {!ringing &&
            task.lines
              .slice(0, Math.max(heard, 1))
              .map((l, k) => (
                <Bubble
                  key={k}
                  by={l.by}
                  zh={l.zh}
                  shown={shown}
                  talking={talker === l.by}
                  dim={heard === 0}
                />
              ))}
          {!ringing && !shown && (
            <p className="pl-14 text-sm text-[var(--ink-2)]">
              Listen.{' '}
              <button
                type="button"
                onClick={onShow}
                className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-[var(--jade)] hover:bg-[var(--paper-2)]"
              >
                <Eye size={14} /> Show the words
              </button>
            </p>
          )}
          {complaint && !answered && (
            <Bubble
              by={complaint.by}
              zh={complaint.zh}
              shown
              talking={talker === complaint.by}
              warn
            />
          )}
          {reply && <Bubble by="you" zh={reply.zh} shown talking={false} />}
          {answered &&
            task.after.map((l, k) => (
              <Bubble
                key={`a${k}`}
                by={l.by}
                zh={l.zh}
                shown
                talking={talker === l.by}
              />
            ))}
        </div>
      </div>

      {!answered && (
        <p className="mt-4 mb-2 text-sm font-bold text-[var(--ink-2)]">
          {prompt}
        </p>
      )}
      {!answered &&
        (task.replies.length ? (
          <div className="grid gap-2">
            {offered.map((o, k) => (
              <button
                key={o.zh}
                type="button"
                data-offer={k}
                disabled={tried.includes(k) || ringing}
                onClick={(e) => onChoose(k, e.currentTarget)}
                className={`zh-card flex items-center gap-3 px-3 py-2.5 text-left transition active:scale-[0.99] disabled:opacity-40 ${tried.includes(k) ? 'zh-shake' : ''}`}
              >
                <Key k={String(k + 1)} />
                <span className="pointer-events-none min-w-0">
                  <Mixed line={o.zh} size="sm" still />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-2 ${offered.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}
          >
            {offered.map((o, k) => (
              <button
                key={o.zh}
                type="button"
                data-offer={k}
                disabled={tried.includes(k) || ringing}
                onClick={(e) => onChoose(k, e.currentTarget)}
                className={`zh-card relative flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 px-2 pt-5 pb-3 transition active:scale-95 disabled:opacity-40 ${tried.includes(k) ? 'zh-shake' : ''}`}
              >
                <Key k={String(k + 1)} className="absolute top-1.5 left-1.5" />
                <PickFace zh={o.zh} />
              </button>
            ))}
          </div>
        ))}
    </>
  )
}

// A line said: the speaker's face, and the words, or a voice message's
// bars until the words are shown
function Bubble({
  by,
  zh,
  shown,
  talking,
  dim = false,
  warn = false,
}: {
  by: string
  zh: string
  shown: boolean
  talking: boolean
  dim?: boolean
  warn?: boolean
}) {
  const mine = by === 'you'
  const person = mine ? null : CAST[by]
  return (
    <div
      className={`fx-pop flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''} ${dim ? 'opacity-60' : ''}`}
    >
      {person ? (
        <span className="shrink-0 overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-[#e8dcc4]">
          <Face look={person.look} size={40} talking={talking} />
        </span>
      ) : (
        <span className="w-2 shrink-0" />
      )}
      <div
        className={`max-w-[85%] rounded-2xl border-2 px-3 py-2 ${mine ? 'rounded-br-sm border-[var(--jade)] bg-[var(--jade)]/10' : 'rounded-bl-sm border-[var(--ink)] bg-[var(--card)]'} ${warn ? 'border-[var(--red)] text-[var(--red)]' : ''}`}
      >
        {shown ? (
          <Mixed line={zh} size="sm" />
        ) : (
          <VoiceBars
            n={[...plain(zh, { home: '挪威' })].length}
            talking={talking}
          />
        )}
      </div>
    </div>
  )
}

// A voice message, as bars as long as what is said
function VoiceBars({ n, talking }: { n: number; talking: boolean }) {
  const bars = Math.max(6, Math.min(26, Math.round(n * 1.4)))
  return (
    <span
      className="flex h-7 items-center gap-[3px] text-[var(--jade)]"
      aria-label="A voice message"
    >
      <Mic size={14} className="mr-1 shrink-0" />
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-current ${talking ? 'fx-pulse' : ''}`}
          style={{
            height: `${30 + ((i * 47) % 70)}%`,
            animationDelay: `${(i % 5) * 90}ms`,
          }}
        />
      ))}
    </span>
  )
}

// A thing to pick: a face, a picture, a clock, a number, or the words
function PickFace({ zh }: { zh: string }) {
  const look = lookOf(zh)
  switch (look.kind) {
    case 'person':
      return (
        <>
          <span className="overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-[#e8dcc4]">
            <Face look={CAST[look.who].look} size={48} blink={false} />
          </span>
          <Mixed line={zh} size="sm" still />
        </>
      )
    case 'thing':
      return (
        <>
          <Pix name={look.sprite} size={52} />
          <Mixed line={zh} size="sm" still />
        </>
      )
    case 'time':
      return (
        <>
          {look.day && <Mixed line={look.day} size="sm" still />}
          <span className="rounded-lg bg-[#241a1e] px-2.5 py-1 font-mono text-2xl font-bold text-[#ff6a4a] tabular-nums">
            {look.clock}
          </span>
        </>
      )
    case 'number':
      return (
        <>
          <span className="text-3xl font-black tabular-nums">{look.n}</span>
          {look.rest && <Mixed line={look.rest} size="sm" still />}
        </>
      )
    default:
      return <Mixed line={zh} size="md" still />
  }
}

// --- Before the first day: the ranks, and where to start ---

function Ready({
  top,
  rank,
  best,
  onPick,
  onStart,
}: {
  top: number
  rank: number
  best?: number
  onPick: (r: number) => void
  onStart: () => void
}) {
  return (
    <div className="zh-card fx-rise mt-4 p-5 sm:p-6">
      <p className="mx-auto max-w-md text-center">
        A day at the office: messages, voice messages and calls in Chinese, ten
        tasks from nine to six. Reply, or do what is asked.
      </p>
      <p className="mx-auto mt-2 max-w-md text-center text-sm text-[var(--ink-2)]">
        A day with at most one miss, or {STREAK} right in a row, gets you
        promoted, and each rank brings harder tasks. A miss is a wrong first
        answer, or showing the words of something you were to hear.
      </p>
      <ol className="mx-auto mt-5 grid max-w-md gap-2">
        {RANKS.map((r, i) => {
          const open = i <= top
          return (
            <li key={r.seal}>
              <button
                type="button"
                disabled={!open}
                onClick={() => onPick(i)}
                aria-pressed={i === rank}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-2 text-left transition disabled:opacity-40 ${i === rank ? 'border-[var(--red)] bg-[var(--paper-2)]' : 'border-transparent hover:bg-[var(--paper-2)]'}`}
              >
                <span className={open ? '' : 'grayscale'}>
                  <Seal text={r.seal} size={36} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block">
                    <Mixed line={r.zh} size="sm" still />
                  </span>
                  <span className="text-sm text-[var(--ink-2)]">
                    {r.title} · ¥{r.pay} a task
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-5 text-center">
        <Btn onClick={onStart} className="px-8 py-3 text-lg">
          Start the day{' '}
          <Key
            k="Enter"
            className="ml-1 border-white/30 bg-white/15 text-white"
          />
        </Btn>
        {best ? (
          <p className="mt-3 text-sm text-[var(--ink-2)]">Best day: ¥{best}</p>
        ) : null}
      </div>
    </div>
  )
}
