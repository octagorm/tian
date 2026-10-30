import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { QUIZ, QUIZ_VOICE, TOPICS } from '../data/quiz'
import { WORD } from '../data/words'
import { plain, tokens } from '../lib/text'
import { blip } from '../lib/audio'
import { useStore } from '../lib/store'
import { RoundDone } from '../quiz'
import {
  Btn,
  Frame,
  LEVEL_COLOR,
  Mixed,
  Ruby,
  SpeakButton,
  Sprinkled,
  shuffle,
  tokenLevel,
  usePeek,
} from '../ui'
import { Pix } from '../pixel/Pix'
import { room } from '../lib/bank'
import {
  Combo,
  Key,
  PlayButton,
  Progress,
  cheer,
  reducedMotion,
  useKeys,
  useSpeaker,
} from './fx'
import type { QuizQuestion } from '../data/quiz'
import type { Level } from '../lib/bank'

// The quiz: general questions in simple Chinese, in mixed text, so a
// learner reads what they can and guesses the rest. A round is ten,
// the questions with the most words already met coming up more often.
// Each answer, right or wrong, meets one new word: the answer's, or else
// the most common one in the question, which shows in Chinese from then
// on. A right answer counts a little for every word read in the question.

const ROUND = 10
const SEEN_KEY = 'tian:quiz:seen'
// Questions asked lately are left out of the next rounds
const SEEN_MAX = 60

function loadSeen(): Array<string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as Array<string>
  } catch {
    return []
  }
}

function saveSeen(ids: Array<string>) {
  try {
    const kept = [...loadSeen().filter((id) => !ids.includes(id)), ...ids]
    localStorage.setItem(SEEN_KEY, JSON.stringify(kept.slice(-SEEN_MAX)))
  } catch {
    // private mode, or full
  }
}

const TOPIC = Object.fromEntries(TOPICS.map((t) => [t.id, t]))
const VARS = { home: '挪威' }

// The words of a line, numbers left out, with their ids
const wordsOf = (line: string) =>
  tokens(line, VARS).filter((t) => !t.punct && (t.id || t.parts?.length))

function pickRound(levelOf: (id: string) => Level): Array<QuizQuestion> {
  const seen = new Set(loadSeen())
  const scored = QUIZ.map((q) => {
    const ws = wordsOf(q.zh)
    const read = ws.filter((t) => tokenLevel(t, levelOf) > 0).length
    return {
      q,
      s: read / ws.length + Math.random() * 0.6 - (seen.has(q.id) ? 2 : 0),
    }
  })
  scored.sort((a, b) => b.s - a.s)
  return shuffle(scored.slice(0, ROUND).map((x) => x.q))
}

// The word a question teaches: the right answer's, else the question's
// from the earliest lesson, that is not met yet
function newWord(
  q: QuizQuestion,
  levelOf: (id: string) => Level,
): string | undefined {
  const unmet = (line: string) =>
    wordsOf(line).flatMap((t) => (t.id && levelOf(t.id) === 0 ? [t.id] : []))
  const answer = unmet(q.options[0])
  if (answer.length) return answer[0]
  return unmet(q.zh).sort(
    (a, b) => (WORD[a]?.lesson ?? 99) - (WORD[b]?.lesson ?? 99),
  )[0]
}

export default function QuizGame() {
  const { bank, levelOf, record, meet, points, setBest, settings } = useStore()
  const [round, setRound] = useState(() => pickRound(levelOf))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<{ opt: string; t: number } | null>(null)
  const [score, setScore] = useState({ right: 0, streak: 0 })
  const [missed, setMissed] = useState<Array<number>>([])
  const [fresh, setFresh] = useState<Array<string>>([])
  const [taught, setTaught] = useState<string | undefined>()
  const [leaving, setLeaving] = useState(false)
  const [done, setDone] = useState(false)
  const buttons = useRef(new Map<string, HTMLButtonElement | null>())
  const { speaking, play } = useSpeaker()
  const q = round[i]
  const topic = TOPIC[q.topic]
  const freshSet = useMemo(() => new Set(fresh), [fresh])
  const options = useMemo(() => shuffle(q.options), [q])
  const words = useMemo(() => wordsOf(q.zh), [q])
  const hear = () => void play(plain(q.zh, VARS), QUIZ_VOICE)

  useEffect(() => {
    if (!done && settings.autoplay) hear()
  }, [q, done])

  const answer = (opt: string) => {
    if (picked) return
    setPicked({ opt, t: Date.now() })
    const ok = opt === q.options[0]
    blip(ok ? 'right' : 'wrong')
    if (ok) {
      cheer(buttons.current.get(opt), '+1')
      points(1)
      const read = [...wordsOf(q.zh), ...wordsOf(q.options[0])].flatMap((t) =>
        t.id && levelOf(t.id) > 0 ? [t.id] : [],
      )
      for (const id of new Set(read)) record(id, true, 0.3, 'read')
    } else setMissed((m) => [...m, i])
    // a new word only while there is room for one
    const id = room(bank, Date.now()) > 0 ? newWord(q, levelOf) : undefined
    setTaught(id)
    if (id) {
      meet([id])
      setFresh((f) => [...f, id])
    }
    setScore((s) => ({
      right: s.right + (ok ? 1 : 0),
      streak: ok ? s.streak + 1 : 0,
    }))
  }

  const next = () => {
    if (!picked || leaving) return
    const go = () => {
      setLeaving(false)
      setPicked(null)
      setTaught(undefined)
      if (i + 1 >= round.length) {
        saveSeen(round.map((x) => x.id))
        setBest('quiz', score.right)
        setDone(true)
      } else setI(i + 1)
    }
    if (reducedMotion()) return go()
    setLeaving(true)
    setTimeout(go, 190)
  }

  const again = () => {
    setRound(pickRound(levelOf))
    setI(0)
    setScore({ right: 0, streak: 0 })
    setMissed([])
    setFresh([])
    setDone(false)
  }

  useKeys((key) => {
    if (done) {
      if (key !== 'Enter') return
      again()
      return true
    }
    if (key === ' ') {
      hear()
      return true
    }
    if (picked) {
      if (key !== 'Enter' || Date.now() - picked.t < 150) return
      next()
      return true
    }
    if (!/^[1-4]$/.test(key) || Number(key) > options.length) return
    answer(options[Number(key) - 1])
    return true
  })

  if (done)
    return (
      <Frame title="Quiz" zh="问答">
        <RoundDone
          right={score.right}
          total={round.length}
          sprite={score.right === round.length ? 'trophy' : 'paper-lantern'}
          actions={
            <Btn onClick={again} className="px-8 py-3 text-lg">
              Another round{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          }
        >
          {fresh.length > 0 && <NewWords ids={fresh} />}
        </RoundDone>
      </Frame>
    )

  return (
    <Frame
      title="Quiz"
      zh="问答"
      right={
        <span className="flex items-center gap-2 text-sm font-bold">
          <Combo n={score.streak} />
          <span className="tabular-nums">
            {score.right}/{i + (picked ? 1 : 0)}
          </span>
        </span>
      }
    >
      <Progress
        at={i + (picked ? 1 : 0)}
        of={round.length}
        missed={missed}
        className="mb-4"
      />
      <div
        key={i}
        className={`zh-card flex flex-col p-5 sm:p-7 max-sm:min-h-[calc(100dvh-9rem)] ${leaving ? 'fx-leave' : 'fx-enter'}`}
      >
        <div className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
          <Pix name={topic.sprite} size={28} />
          <span>{topic.title}</span>
          <span className="zh text-sm tracking-normal text-[var(--red)]">
            {topic.zh}
          </span>
        </div>
        <div className="flex items-center gap-4 py-5">
          <div className="min-w-0 flex-1">
            <Mixed line={q.zh} size="lg" fresh={freshSet} />
          </div>
          <PlayButton
            onClick={hear}
            speaking={speaking}
            size={64}
            hint={false}
          />
        </div>
        <Readable words={words.map((t) => tokenLevel(t, levelOf))} />
        <div className="flex-1" />
        <div className="mt-4 grid gap-2.5">
          {options.map((opt, k) => {
            const isRight = opt === q.options[0]
            const mine = picked?.opt === opt
            const look = !picked
              ? 'border-[var(--paper-2)] bg-[var(--paper)] shadow-[0_3px_0_var(--paper-2)] hover:-translate-y-0.5 hover:border-[var(--gold)] active:translate-y-0.5 active:shadow-none'
              : isRight
                ? `border-[var(--jade)] bg-[#e3f0ea] ${mine ? 'fx-pulse' : 'fx-beacon'}`
                : mine
                  ? 'fx-shake border-[var(--red)] bg-[#f8e1dc]'
                  : 'border-transparent bg-[var(--paper)] opacity-45'
            return (
              <button
                key={opt}
                ref={(el) => {
                  buttons.current.set(opt, el)
                }}
                type="button"
                disabled={!!picked}
                onClick={() => answer(opt)}
                className={`relative flex min-h-[3.5rem] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition duration-150 ${look}`}
              >
                <Key k={String(k + 1)} />
                <span className="flex-1">
                  <Mixed line={opt} still fresh={freshSet} />
                </span>
                {mine && !isRight && (
                  <X size={18} strokeWidth={3} className="text-[var(--red)]" />
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-4 border-t border-dashed border-[var(--paper-2)] pt-3">
          {picked ? (
            <div className="fx-rise grid gap-3">
              <p className="text-[var(--ink-2)] italic">{q.en}</p>
              {q.fact && (
                <p className="leading-relaxed">
                  <Sprinkled text={q.fact} />
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {taught && <Taught id={taught} />}
                <Btn onClick={next} className="ml-auto shrink-0 px-5 py-3">
                  {i + 1 >= round.length ? 'Finish' : 'Next'}{' '}
                  <Key
                    k="Enter"
                    className="ml-1 border-white/30 bg-white/15 text-white"
                  />
                </Btn>
              </div>
            </div>
          ) : (
            <p className="w-full text-center text-xs text-[var(--ink-2)] max-sm:hidden">
              <Key k="1" />–<Key k={String(options.length)} /> to choose,{' '}
              <Key k="Space" /> to hear it again. Tap a word to look it up.
            </p>
          )}
        </div>
      </div>
    </Frame>
  )
}

// A dot for each word of the question, coloured by how well it is known,
// and how many of them can be read
function Readable({ words }: { words: Array<Level> }) {
  const read = words.filter((lv) => lv > 0).length
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex gap-1" aria-hidden="true">
        {words.map((lv, k) => (
          <span
            key={k}
            className="h-1.5 w-4 rounded-full"
            style={{ background: LEVEL_COLOR[lv], opacity: lv ? 1 : 0.35 }}
          />
        ))}
      </span>
      <span className="text-xs text-[var(--ink-2)]">
        {read === words.length
          ? 'You can read every word'
          : `You can read ${read} of ${words.length} words`}
      </span>
    </div>
  )
}

// The word this question taught
function Taught({ id }: { id: string }) {
  const w = WORD[id]
  if (!w) return null
  return (
    <div className="zh-new flex items-center gap-2 rounded-2xl bg-[var(--paper)] py-1.5 pr-1 pl-3">
      <span className="text-[0.65rem] font-black tracking-[0.15em] text-[var(--jade)] uppercase">
        New
      </span>
      <Ruby h={w.h} p={w.p} className="text-2xl" />
      <span className="text-sm text-[var(--ink-2)]">{w.e}</span>
      <SpeakButton text={w.h} />
    </div>
  )
}

// The words met in a round, each to tap and hear again
function NewWords({ ids }: { ids: Array<string> }) {
  const peek = usePeek()
  return (
    <div className="mt-5">
      <p className="text-sm font-bold text-[var(--ink-2)]">
        {ids.length === 1 ? 'A new word' : `${ids.length} new words`}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {ids.map((id) => {
          const w = WORD[id]
          if (!w) return null
          return (
            <button
              key={id}
              type="button"
              onClick={() => peek(id)}
              className="rounded-xl bg-[var(--paper)] px-3 py-1.5 transition hover:bg-[var(--paper-2)]"
            >
              <Ruby h={w.h} p={w.p} className="text-xl" />
              <span className="ml-1.5 text-sm text-[var(--ink-2)]">{w.g}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
