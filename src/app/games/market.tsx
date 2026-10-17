import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Eye, Volume2, Wallet } from 'lucide-react'
import {
  ASK,
  HAGGLES,
  MARKET_PLAYER,
  MOVES,
  OFFER,
  OPEN,
  STALLS,
  offers,
} from '../data/market'
import { WORD } from '../data/words'
import { MARKET_ART } from '../pixel/art'
import { StageView } from '../pixel/StageView'
import { Face, Pix } from '../pixel/Pix'
import { respond, stars, startState } from '../lib/market'
import { toHanzi } from '../lib/numbers'
import { plain, tokens, wordIds } from '../lib/text'
import { blip } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Mixed, Stars, shuffle } from '../ui'
import {
  COLORS,
  CountUp,
  Key,
  burst,
  confetti,
  floatText,
  replay,
  useKeys,
  useSpeaker,
} from './fx'
import type { Haggle, Stall } from '../data/market'
import type { HaggleState, Move, Reply } from '../lib/market'
import type { Stage } from '../pixel/stage'

// The market (讨价还价): a street of stalls and a shopping list. At each,
// ask the price with the right measure word; the keeper names it out
// loud, and the player haggles, by ear: too dear, a little cheaper, an
// offer, buy, or walk away. What the keeper said is written out only once
// it has been answered (or looked at), in mixed text, numbers and all. A
// deal at the lowest they would go is three stars, at a fair price two.

const DAY = 4
// The moves, in the order of their keys; an offer opens its prices
const OFFERING = '我 给 你 … 块 。'
const MOVE_KEYS: Array<{ k: Move['k']; zh: string }> = [
  { k: 'dear', zh: MOVES.dear },
  { k: 'cheaper', zh: MOVES.cheaper },
  { k: 'offer', zh: OFFERING },
  { k: 'buy', zh: MOVES.buy },
  { k: 'leave', zh: MOVES.leave },
]
// The words a market day is played in, met when it starts
const FIRST = ['贵', '便宜', '太', '块', '买']

interface Visit {
  stall: Stall
  haggle: Haggle
}

interface Result {
  stall: Stall
  haggle: Haggle
  paid: number | null
  stars: number
  // what was asked when the player offered more
  over?: number
  gone?: 'bye' | 'enough'
}

export default function Market() {
  const { bank, meet, setBest, points } = useStore()
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [day, setDay] = useState<Array<Visit>>([])
  const [at, setAt] = useState(0)
  const [purse, setPurse] = useState(0)
  const [results, setResults] = useState<Array<Result>>([])

  const start = () => {
    meet(FIRST.filter((id) => !bank.cards[id]))
    // ?stall=fan&mood=1#market starts the day at that stall, in that mood
    const q = new URLSearchParams(location.search)
    const first = STALLS.find((s) => s.id === q.get('stall'))
    const stalls = shuffle(STALLS.filter((s) => s !== first))
    const visits = (first ? [first, ...stalls] : stalls)
      .slice(0, DAY)
      .map((stall, i) => {
        const moods = HAGGLES.filter((h) => h.stall === stall.id)
        const mood = i === 0 ? Number(q.get('mood') ?? NaN) : NaN
        return {
          stall,
          haggle: moods.find((h) => h.mood === mood) ?? shuffle(moods)[0],
        }
      })
    setDay(visits)
    setAt(0)
    setResults([])
    // enough for everything at a fair price, and a little over
    setPurse(visits.reduce((s, v) => s + v.stall.fair, 0) + 20)
    setPhase('play')
  }

  const done = (r: Result) => {
    setResults((rs) => [...rs, r])
    if (r.paid !== null) setPurse((p) => p - r.paid!)
  }

  const next = () => {
    if (at + 1 < day.length) {
      setAt(at + 1)
      return
    }
    const total = results.reduce((s, r) => s + r.stars, 0)
    setBest('market', total)
    points(results.filter((r) => r.paid !== null).length)
    if (total >= DAY * 3 - 2) confetti()
    setPhase('over')
  }

  useKeys((key) => {
    if (phase === 'play' || key !== 'Enter') return
    start()
    return true
  })

  return (
    <Frame
      title="The market"
      zh="讨价还价"
      right={
        phase === 'play' ? (
          <span
            key={purse}
            className="fx-bump inline-flex items-center gap-1 font-black tabular-nums"
            title="Your purse"
          >
            <Wallet size={16} className="text-[var(--ink-2)]" />¥{purse}
          </span>
        ) : null
      }
    >
      {phase === 'ready' && <Ready best={bank.best.market} onStart={start} />}
      {phase === 'play' && day[at] && (
        <>
          <List day={day} at={at} results={results} />
          <StallView
            key={at}
            visit={day[at]}
            purse={purse}
            last={at + 1 === day.length}
            onDone={done}
            onNext={next}
          />
        </>
      )}
      {phase === 'over' && (
        <Summary
          results={results}
          best={bank.best.market ?? 0}
          onAgain={start}
        />
      )}
    </Frame>
  )
}

function Ready({
  best,
  onStart,
}: {
  best: number | undefined
  onStart: () => void
}) {
  return (
    <div className="zh-card fx-rise overflow-hidden">
      <div className="relative aspect-[16/7] overflow-hidden">
        <img
          src="/art/market/lantern.png"
          alt="A lantern stall at a night market"
          className="absolute inset-0 h-full w-full object-cover object-[50%_35%]"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <div className="p-6 text-center">
        <p className="mx-auto max-w-md">
          A street of stalls and a list of things to buy. Ask what each costs,
          and listen: the keeper names a price out loud. Haggle it down, but not
          too hard, or they will wave you off.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-2)]">
          The lowest price they will take is three stars; a fair one, two. What
          they said is written out once you have answered.
        </p>
        <Btn onClick={onStart} className="mt-5 px-8 py-3 text-lg">
          Go to the market{' '}
          <Key
            k="Enter"
            className="ml-1 border-white/30 bg-white/15 text-white"
          />
        </Btn>
        {best ? (
          <p className="mt-3 text-sm text-[var(--ink-2)]">
            Best day: {best} of {DAY * 3} stars
          </p>
        ) : null}
      </div>
    </div>
  )
}

// The shopping list: each thing, its fair price, and how it went
function List({
  day,
  at,
  results,
}: {
  day: Array<Visit>
  at: number
  results: Array<Result>
}) {
  return (
    <ol className="mb-3 grid grid-cols-4 gap-1.5" aria-label="Shopping list">
      {day.map((v, i) => {
        const r = results[i] as Result | undefined
        return (
          <li
            key={v.stall.id}
            className={`flex flex-col items-center justify-center gap-x-1.5 rounded-xl border-2 px-1 py-1 transition sm:flex-row ${i === at ? 'border-[var(--red)] bg-[var(--card)] shadow-sm' : 'border-transparent bg-[var(--paper-2)]/60'} ${r && r.paid === null ? 'opacity-50' : ''}`}
            title={`${WORD[v.stall.ware]?.g ?? ''}: a fair price is ¥${v.stall.fair}`}
          >
            <Pix name={v.stall.sprite} size={24} />
            <span className="flex flex-col items-center leading-tight sm:items-start">
              <span className="text-xs font-bold whitespace-nowrap tabular-nums">
                fair ¥{v.stall.fair}
              </span>
              <span className="flex h-3.5 items-center text-[0.65rem] text-[var(--ink-2)]">
                {r &&
                  (r.paid === null
                    ? 'no deal'
                    : [0, 1, 2].map((k) => (
                        <Pix
                          key={k}
                          name="star"
                          size={12}
                          className={k < r.stars ? '' : 'opacity-25 grayscale'}
                        />
                      )))}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

interface Said {
  who: 'them' | 'you'
  zh: string
  // written out: answered, or looked at
  open: boolean
}

function StallView({
  visit,
  purse,
  last,
  onDone,
  onNext,
}: {
  visit: Visit
  purse: number
  last: boolean
  onDone: (r: Result) => void
  onNext: () => void
}) {
  const { stall, haggle } = visit
  const { settings, levelOf, record, meet, bank } = useStore()
  const vars = { home: settings.home }
  const [step, setStep] = useState<'ask' | 'haggle' | 'end'>('ask')
  const [st, setSt] = useState<HaggleState>(() => startState(stall))
  const [log, setLog] = useState<Array<Said>>([])
  const [busy, setBusy] = useState(false)
  const [talking, setTalking] = useState<string | null>(null)
  const [offering, setOffering] = useState(false)
  const [wrong, setWrong] = useState<Set<string>>(new Set())
  const [note, setNote] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const stage = useRef<Stage | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const chat = useRef<HTMLDivElement>(null)
  const moves = useRef<HTMLDivElement>(null)
  const turn = useRef(0)
  const { play } = useSpeaker()
  const spot = MARKET_ART[`market-${stall.id}`]!.spots.keeper!
  const chips = useMemo(() => offers(stall), [stall])
  // The measure words to ask with, in an order of their own
  const asks = useMemo(() => shuffle([stall.mw, ...stall.wrong]), [stall])
  // The ware is met at its stall, and the measure words asked with, all
  // of them, so that none stands out
  const [fresh] = useState(
    () => new Set([stall.ware].filter((id) => !bank.cards[id])),
  )
  useEffect(() => {
    meet([stall.ware, ...asks].filter((id) => !bank.cards[id]))
    return () => {
      turn.current++
    }
  }, [])

  const price = haggle.ladder[st.i]
  const heard = [...log].reverse().find((s) => s.who === 'them')

  // Keep the newest line in view
  useEffect(() => {
    const el = chat.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [log.length, step])

  const hear = () => {
    if (heard) void say(heard.zh, 'them')
  }
  const say = async (zh: string, who: 'them' | 'you') => {
    const voice = who === 'them' ? stall.voice : MARKET_PLAYER
    if (who === 'them') setTalking('keeper')
    await play(plain(zh, vars), voice)
    if (who === 'them') setTalking(null)
  }

  // The player says their line; then, once it is said, the keeper answers
  const exchange = async (you: string, reply: Reply | { zh: string }) => {
    const me = ++turn.current
    setBusy(true)
    setNote(null)
    setOffering(false)
    setLog((l) => [
      ...l.map((s) => ({ ...s, open: true })),
      { who: 'you', zh: you, open: true },
    ])
    await say(you, 'you')
    if (turn.current !== me) return
    const end = 'paid' in reply && reply.paid !== undefined
    const gone = 'gone' in reply ? reply.gone : undefined
    setLog((l) => [...l, { who: 'them', zh: reply.zh, open: end || !!gone }])
    if ('mood' in reply && reply.mood)
      stage.current?.mark('keeper', reply.mood === 'good' ? 'good' : 'what', 2)
    if ('state' in reply) setSt(reply.state)
    await say(reply.zh, 'them')
    if (turn.current !== me) return
    setBusy(false)
    if ('state' in reply && (end || gone)) finish(reply)
    else if (step === 'ask') setStep('haggle')
  }

  const finish = (reply: Reply) => {
    const paid = reply.paid ?? null
    const r: Result = {
      stall,
      haggle,
      paid,
      stars: paid === null ? 0 : stars(stall, haggle, paid),
      ...(reply.gone ? { gone: reply.gone } : {}),
      ...(paid !== null && paid > price ? { over: price } : {}),
    }
    setResult(r)
    setStep('end')
    onDone(r)
    requestAnimationFrame(() =>
      moves.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    )
    const at = moves.current
    if (paid !== null) {
      blip('right')
      burst(at, {
        colors: [COLORS.gold, COLORS.yellow, '#fff3c4'],
        n: 14 + r.stars * 8,
        spread: 90,
      })
      floatText(box.current, `¥${paid}`, { color: '#b8862a', size: 30 })
    } else {
      blip('wrong')
      replay(box.current, 'fx-shake')
    }
  }

  // A decision on a price just heard: the words of the line the price
  // was in, right, or its numbers wrong. Looked at first, it counts less.
  const judge = (right: boolean) => {
    if (!heard) return
    const toks = tokens(heard.zh, vars)
    const nums = toks.flatMap((t) => t.parts ?? [])
    if (!nums.length) return
    const ids = right ? wordIds(heard.zh, vars) : nums
    const weight = heard.open ? 0.3 : 0.6
    for (const id of ids) if (levelOf(id) > 0) record(id, right, weight)
  }

  const ask = (mw: string) => {
    if (busy || step !== 'ask' || wrong.has(mw)) return
    if (mw !== stall.mw) {
      setWrong((w) => new Set([...w, mw]))
      setNote(stall.why)
      blip('wrong')
      replay(moves.current, 'fx-shake')
      if (levelOf(stall.mw) > 0) record(stall.mw, false, 0.6)
      return
    }
    blip('right')
    if (wrong.size === 0) record(stall.mw, true, 0.6)
    void exchange(ASK(stall), {
      zh: OPEN(stall, haggle.mood, haggle.ladder[0]),
    })
  }

  const move = (m: Move) => {
    if (busy || step !== 'haggle') return
    if (m.k === 'offer' && m.n > purse) return
    if (m.k === 'buy' && price > purse) {
      // what they ask is more than the purse holds: no line is said
      setNote(`Your purse holds only ¥${purse}.`)
      replay(moves.current, 'fx-shake')
      blip('wrong')
      return
    }
    if (m.k === 'dear') judge(price > stall.fair)
    if (m.k === 'offer') judge(m.n < price)
    if (m.k === 'buy') judge(price <= stall.fair)
    const reply = respond(stall, haggle, st, m)
    const you = m.k === 'offer' ? OFFER(m.n) : MOVES[m.k]
    void exchange(you, reply)
  }

  // Look at what was said, before answering
  const peek = () =>
    setLog((l) =>
      l.map((s, i) => (i === l.length - 1 ? { ...s, open: true } : s)),
    )

  useKeys((key) => {
    if (key === ' ') {
      if (!busy) hear()
      return true
    }
    if (step === 'end') {
      if (key !== 'Enter') return
      onNext()
      return true
    }
    const n = Number(key) - 1
    if (step === 'ask') {
      if (n >= 0 && n < asks.length) ask(asks[n])
      return n >= 0 && n < asks.length
    }
    if (offering) {
      if (key === 'Escape' || key === 'Backspace') {
        setOffering(false)
        return true
      }
      if (n >= 0 && n < chips.length) move({ k: 'offer', n: chips[n] })
      return n >= 0 && n < chips.length
    }
    if (n < 0 || n >= MOVE_KEYS.length) return
    const k = MOVE_KEYS[n].k
    if (k === 'offer') setOffering(true)
    else move({ k })
    return true
  })

  const actors = useMemo(
    () => [{ key: 'keeper', look: stall.look, ...spot }],
    [stall],
  )

  return (
    <div>
      <div
        ref={box}
        className="overflow-hidden rounded-2xl shadow-[0_18px_40px_-18px_rgba(60,30,10,0.7)]"
      >
        <StageView
          id={`market-${stall.id}`}
          actors={actors}
          talking={talking}
          stageRef={stage}
          label={`A ${WORD[stall.ware]?.g ?? ''} stall at a night market`}
          crop={30}
        >
          {(view) => {
            const p = view.at(222, (spot.clip ?? 125) + 3)
            const size = Math.round(26 * view.scale)
            return (
              <>
                <span
                  className="absolute -translate-x-1/2 -translate-y-full"
                  style={{ left: `${p.left}%`, top: `${p.top}%` }}
                >
                  <Pix name={stall.sprite} size={size} />
                </span>
                {step !== 'ask' && step !== 'end' && (
                  <Patience left={st.left} of={stall.patience} />
                )}
              </>
            )
          }}
        </StageView>
      </div>

      <div
        ref={chat}
        className="zh-card mt-3 max-h-[min(16rem,34vh)] space-y-2 overflow-y-auto p-3"
        aria-live="polite"
      >
        {log.length === 0 && (
          <p className="text-sm text-[var(--ink-2)]">
            Ask the {WORD[stall.ware]?.g ?? 'thing'}’s price, with the right
            measure word.
          </p>
        )}
        {log.map((s, i) => (
          <Line
            key={i}
            said={s}
            stall={stall}
            fresh={fresh}
            talking={talking !== null && i === log.length - 1}
            onHear={() => void say(s.zh, s.who)}
            onPeek={peek}
          />
        ))}
      </div>

      <div ref={moves} className="mt-3">
        {note && (
          <p className="fx-pop mb-2 rounded-xl bg-[#f8e1dc] px-3 py-2 text-sm font-bold text-[var(--red)]">
            {note}
          </p>
        )}
        {step === 'ask' && (
          <Options
            lines={asks.map((mw) => ASK(stall, mw))}
            disabled={(i) => busy || wrong.has(asks[i])}
            fresh={fresh}
            onPick={(i) => ask(asks[i])}
          />
        )}
        {step === 'haggle' && !offering && (
          <Options
            lines={MOVE_KEYS.map((m) => m.zh)}
            disabled={() => busy}
            fresh={fresh}
            onPick={(i) => {
              const k = MOVE_KEYS[i].k
              if (k === 'offer') setOffering(true)
              else move({ k })
            }}
          />
        )}
        {step === 'haggle' && offering && (
          <div className="zh-card fx-pop p-3">
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffering(false)}
                aria-label="Back"
                className="rounded-full p-1.5 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="pointer-events-none">
                <Mixed line={OFFERING} size="sm" still />
              </span>
              <Key k="Esc" className="ml-auto max-sm:hidden" />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {chips.map((n, i) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy || n > purse}
                  onClick={() => move({ k: 'offer', n })}
                  className="relative flex min-h-14 items-end justify-center rounded-xl bg-[var(--paper)] px-1 pt-4 pb-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-white active:scale-95 disabled:opacity-35"
                >
                  <Key k={String(i + 1)} className="absolute top-1 left-1" />
                  <span className="pointer-events-none">
                    <Mixed line={toHanzi(n)} size="sm" still />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 'end' && result && (
          <Outcome result={result} last={last} onNext={onNext} />
        )}
        {step !== 'end' && (
          <p className="mt-2 text-xs text-[var(--ink-2)] max-sm:hidden">
            <Key k="1" />–
            <Key
              k={String(
                step === 'ask'
                  ? asks.length
                  : offering
                    ? chips.length
                    : MOVE_KEYS.length,
              )}
            />{' '}
            to answer, <Key k="Space" /> to hear it again
          </p>
        )}
      </div>
    </div>
  )
}

// How many more pushes the keeper will take
function Patience({ left, of }: { left: number; of: number }) {
  return (
    <div
      className="zh-glass absolute top-2 left-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white"
      role="meter"
      aria-label="Patience"
      aria-valuemin={0}
      aria-valuemax={of}
      aria-valuenow={left}
    >
      Patience
      <span className="flex gap-0.5">
        {Array.from({ length: of }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full border border-black/40 transition ${i < left ? (left <= 1 ? 'bg-[var(--red)]' : 'bg-[#f2c14e]') : 'bg-white/20'}`}
          />
        ))}
      </span>
    </div>
  )
}

// A line of the haggling: the keeper's on the left, written out once
// answered (or looked at); the player's on the right
function Line({
  said,
  stall,
  fresh,
  talking,
  onHear,
  onPeek,
}: {
  said: Said
  stall: Stall
  fresh: Set<string>
  talking: boolean
  onHear: () => void
  onPeek: () => void
}) {
  const them = said.who === 'them'
  return (
    <div
      className={`fx-pop flex items-end gap-2 ${them ? '' : 'flex-row-reverse'}`}
    >
      {them && (
        <Face
          look={stall.look}
          size={34}
          talking={talking}
          className="shrink-0 rounded-lg bg-[#2a2430]"
        />
      )}
      <div
        className={`flex max-w-[85%] items-center gap-1 rounded-2xl px-3 py-2 ${them ? 'rounded-bl-sm bg-[var(--paper)]' : 'rounded-br-sm bg-[#e3f0ea]'}`}
      >
        {said.open ? (
          <Mixed line={said.zh} size="sm" fresh={fresh} />
        ) : (
          <span className="flex items-center gap-2 text-sm font-bold text-[var(--jade)]">
            Listen…
            <button
              type="button"
              onClick={onPeek}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--paper-2)] px-2 py-0.5 text-xs text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              <Eye size={13} /> Read it
            </button>
          </span>
        )}
        <button
          type="button"
          onClick={onHear}
          aria-label="Hear it again"
          className={`inline-flex shrink-0 rounded-full p-1 text-[var(--jade)] hover:bg-[var(--paper-2)] ${talking ? 'fx-bump' : ''}`}
        >
          <Volume2 size={16} />
        </button>
      </div>
    </div>
  )
}

// What the player can say, each with its key
function Options({
  lines,
  disabled,
  fresh,
  onPick,
}: {
  lines: Array<string>
  disabled: (i: number) => boolean
  fresh: Set<string>
  onPick: (i: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((zh, i) => (
        <button
          key={zh}
          type="button"
          disabled={disabled(i)}
          onClick={() => onPick(i)}
          className="zh-card flex items-center gap-3 px-3 py-2 text-left transition hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-40"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--paper-2)] text-xs font-bold text-[var(--ink-2)]">
            {i + 1}
          </span>
          <span className="pointer-events-none min-w-0">
            <Mixed line={zh} size="sm" fresh={fresh} still />
          </span>
        </button>
      ))}
    </div>
  )
}

// How a stall went, and what could have been
function Outcome({
  result,
  last,
  onNext,
}: {
  result: Result
  last: boolean
  onNext: () => void
}) {
  const { stall, haggle, paid } = result
  const low = haggle.ladder.at(-1)!
  const name = WORD[stall.ware]?.g ?? stall.ware
  return (
    <div className="zh-card fx-pop p-5 text-center">
      {paid !== null ? (
        <>
          <div className="text-3xl">
            <Stars n={result.stars} />
          </div>
          <p className="mt-2 text-lg font-black">
            The {name} for ¥{paid}
          </p>
          <p className="text-sm text-[var(--ink-2)]">
            {result.over !== undefined
              ? `They were asking ¥${result.over}, and you offered more.`
              : result.stars === 3
                ? 'As low as they would go.'
                : result.stars === 2
                  ? `A fair price. They would have gone down to ¥${low}.`
                  : `Over a fair price of ¥${stall.fair}. They would have gone down to ¥${low}.`}
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-black">No deal</p>
          <p className="text-sm text-[var(--ink-2)]">
            {result.gone === 'enough'
              ? 'Pushed too hard: they waved you off.'
              : `You walked away. They would have gone down to ¥${low}.`}
          </p>
        </>
      )}
      <Btn onClick={onNext} className="mt-4 px-6 py-2.5">
        {last ? 'End of the day' : 'Next stall'}{' '}
        <Key
          k="Enter"
          className="ml-1 border-white/30 bg-white/15 text-white"
        />
      </Btn>
    </div>
  )
}

function Summary({
  results,
  best,
  onAgain,
}: {
  results: Array<Result>
  best: number
  onAgain: () => void
}) {
  const total = results.reduce((s, r) => s + r.stars, 0)
  const deals = results.filter((r) => r.paid !== null)
  const saved = deals.reduce((s, r) => s + r.stall.fair - r.paid!, 0)
  return (
    <div className="zh-card fx-pop p-8 text-center">
      <Pix name="paper-lantern" size={64} />
      <p className="mt-2 text-xs font-black tracking-[0.2em] text-[var(--ink-2)] uppercase">
        The market closes
      </p>
      <p className="text-5xl font-black">
        <CountUp to={total} />
        <span className="text-2xl text-[var(--ink-2)]"> / {DAY * 3}</span>
      </p>
      <p className="mt-1 text-[var(--ink-2)]">
        {deals.length} of {results.length} bought ·{' '}
        {saved >= 0
          ? `¥${saved} under fair prices`
          : `¥${-saved} over fair prices`}{' '}
        · best day {Math.max(best, total)}
      </p>
      <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left text-sm">
        {results.map((r) => (
          <li key={r.stall.id} className="flex items-center gap-2">
            <Pix name={r.stall.sprite} size={24} />
            <span className="pointer-events-none">
              <Mixed line={r.stall.ware} size="sm" still />
            </span>
            <span className="ml-auto font-bold tabular-nums">
              {r.paid === null ? '–' : `¥${r.paid}`}
            </span>
            <span className="w-14 text-right text-xs">
              <Stars n={r.stars} />
            </span>
          </li>
        ))}
      </ul>
      <Btn onClick={onAgain} className="mt-6 px-8 py-3 text-lg">
        Another day{' '}
        <Key
          k="Enter"
          className="ml-1 border-white/30 bg-white/15 text-white"
        />
      </Btn>
    </div>
  )
}
