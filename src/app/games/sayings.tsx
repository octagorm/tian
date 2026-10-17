import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Volume2 } from 'lucide-react'
import { SAYINGS, sayer } from '../data/sayings'
import { blip } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, shuffle } from '../ui'
import {
  Key,
  Seal,
  cheer,
  reducedMotion,
  replay,
  useKeys,
  useReducedMotion,
  useSpeaker,
} from './fx'
import type { Saying } from '../data/sayings'
import './sayings.css'

// Sayings: read a line from the classics character by character, with
// pinyin and a gloss for each, then test yourself on a missing character.
// Each opens as a hanging scroll over an ink-wash landscape, written in
// columns from the right as scrolls are; a saying tested without a slip
// gets your seal on its scroll.

const PUNCT = /[，。？！、]/

type Cell = { c: string; punct: true } | { c: string; p: string; g: string }

function chars(s: Saying): Array<Cell> {
  const cs = [...s.zh]
  const py = s.py.split(' ')
  const gl = s.gloss.split('|')
  let k = 0
  return cs.map((c) =>
    PUNCT.test(c) ? { c, punct: true as const } : { c, p: py[k], g: gl[k++] },
  )
}

// The saying's clauses, each with the punctuation after it, every cell
// with its place in the saying
function clauses(cs: Array<Cell>) {
  const out: Array<Array<[Cell, number]>> = [[]]
  cs.forEach((x, i) => {
    out[out.length - 1].push([x, i])
    if ('punct' in x) out.push([])
  })
  return out.filter((c) => c.length)
}

// The saying as columns, a clause to each, without the punctuation (old
// scrolls had none); each character with its place in the saying
function columns(cs: Array<Cell>) {
  const cols: Array<Array<{ c: string; p: string; i: number }>> = [[]]
  cs.forEach((x, i) => {
    if ('punct' in x) {
      if (cols[cols.length - 1].length) cols.push([])
    } else cols[cols.length - 1].push({ c: x.c, p: x.p, i })
  })
  return cols.filter((c) => c.length)
}

// Three birds, far off: a few strokes each
function Birds() {
  return (
    <svg
      className="say-birds"
      width="90"
      height="30"
      viewBox="0 0 90 30"
      aria-hidden="true"
    >
      {[
        [8, 14, 1],
        [30, 8, 0.8],
        [52, 18, 0.9],
      ].map(([x, y, s], i) => (
        <path
          key={i}
          d={`M${x} ${y} q${4 * s} ${-4 * s} ${8 * s} 0 q${4 * s} ${-4 * s} ${8 * s} 0`}
          fill="none"
          stroke="#3b3a36"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
      ))}
    </svg>
  )
}

// The landscape, with its mist moving and birds crossing it
function Landscape({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <div className="say-landscape absolute inset-0" />
      <div className="say-mist" />
      <div className="say-mist say-mist-2" />
      <Birds />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[var(--paper)] to-transparent" />
    </div>
  )
}

export default function Sayings() {
  const { bank } = useStore()
  const [open, setOpen] = useState<Saying | null>(null)
  if (open)
    return (
      <Read
        key={open.id}
        s={open}
        onExit={() => setOpen(null)}
        onNext={setOpen}
      />
    )
  const themes = [...new Set(SAYINGS.map((s) => s.theme))]
  return (
    <Frame title="Sayings" zh="名言" wide>
      <div className="relative -mx-4 h-56 sm:mx-0 sm:h-72">
        <Landscape className="absolute inset-0 sm:rounded-3xl" />
        {/* an inscription in the empty sky, as on a painting, with a seal */}
        <div className="absolute top-[12%] left-[38%] flex flex-col items-center gap-2 sm:left-[40%]">
          <span className="zh text-4xl leading-[1.1] text-[#2b2620]/85 [writing-mode:vertical-rl] sm:text-5xl">
            名言
          </span>
          <Seal text="名言" size={30} />
        </div>
      </div>
      <p className="mt-4 mb-6 max-w-2xl text-[var(--ink-2)]">
        Lines everyone in China knows: Confucius and Laozi, Zhuangzi's dreams,
        Li Bai's moon, and the slogans of the revolution. Most are in classical
        Chinese, terse and old – even so, words you know turn up.
      </p>
      {themes.map((t) => (
        <section key={t} className="mb-6">
          <h2 className="mb-2 font-black">{t}</h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {SAYINGS.filter((s) => s.theme === t).map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpen(s)}
                className="zh-card fx-rise group relative p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="zh pr-8 text-2xl leading-snug transition group-hover:text-[var(--red-2)]">
                  {s.zh}
                </div>
                <div className="mt-1 text-sm text-[var(--ink-2)]">{s.en}</div>
                {bank.scenes[`say:${s.id}`] ? (
                  <Seal
                    text="学"
                    size={28}
                    className="absolute top-3 right-3"
                  />
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ))}
    </Frame>
  )
}

function Read({
  s,
  onExit,
  onNext,
}: {
  s: Saying
  onExit: () => void
  onNext: (s: Saying) => void
}) {
  const { bank, setScene, points, settings } = useStore()
  const { speaking, play } = useSpeaker()
  const [pinyin, setPinyin] = useState(true)
  const [tapped, setTapped] = useState<number | null>(null)
  const [test, setTest] = useState(false)
  const [stamped, setStamped] = useState(false)
  const cs = useMemo(() => chars(s), [s])
  const idx = SAYINGS.indexOf(s)
  const next = SAYINGS[(idx + 1) % SAYINGS.length]
  const sealed = !!bank.scenes[`say:${s.id}`] || stamped
  const hear = () => void play(s.zh, sayer(s))

  // read it out once the scroll is open and written
  useEffect(() => {
    if (!settings.autoplay) return
    const id = setTimeout(hear, reducedMotion() ? 300 : 1700)
    return () => clearTimeout(id)
  }, [])

  useKeys((key) => {
    if (key === ' ') {
      hear()
      return true
    }
    if (key === 'p' || key === 'P') {
      setPinyin((p) => !p)
      return true
    }
    if (key === 't' || key === 'T') {
      setTest(true)
      return true
    }
    if (key === 'ArrowRight') {
      onNext(next)
      return true
    }
    if (key === 'Escape') {
      onExit()
      return true
    }
  })

  return (
    <Frame title="Sayings" zh="名言" wide>
      <div className="relative">
        <Landscape className="absolute -inset-x-4 -top-4 h-[24rem] sm:inset-x-0 sm:top-0 sm:h-[30rem] sm:rounded-3xl" />
        <div className="relative grid items-start gap-6 pt-2 lg:grid-cols-[auto_1fr] lg:pt-6 lg:pl-6">
          <Scroll
            cs={cs}
            pinyin={pinyin}
            tapped={tapped}
            onTap={(i) => setTapped(tapped === i ? null : i)}
            sealed={sealed}
            stamp={stamped}
          />
          <div className="min-w-0 lg:pt-10">
            <div
              className="zh-card p-5 backdrop-blur-[2px] sm:p-6"
              style={{ background: 'rgba(255, 250, 241, 0.86)' }}
            >
              {/* A clause and its punctuation keep together, so a poem breaks
                  between its lines and not within one */}
              <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-3">
                {clauses(cs).map((clause) => (
                  <div
                    key={clause[0][1]}
                    className="flex max-w-full flex-wrap items-end justify-center gap-x-1 gap-y-3"
                  >
                    {clause.map(([x, i]) =>
                      'punct' in x ? (
                        <span
                          key={i}
                          className="zh text-3xl text-[var(--ink-2)]"
                        >
                          {x.c}
                        </span>
                      ) : (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setTapped(tapped === i ? null : i)}
                          className={`flex flex-col items-center rounded-lg px-1 transition ${tapped === i ? 'bg-[var(--gold)]/30' : 'hover:bg-[var(--paper-2)]'}`}
                        >
                          <span
                            className={`text-xs text-[var(--jade)] ${pinyin ? '' : 'invisible'}`}
                          >
                            {x.p}
                          </span>
                          <span className="zh text-4xl leading-tight">
                            {x.c}
                          </span>
                          <span className="max-w-16 text-[10px] leading-tight text-[var(--ink-2)]">
                            {tapped === i || !pinyin ? '' : x.g}
                          </span>
                          {tapped === i && (
                            <span className="text-xs font-bold">{x.g}</span>
                          )}
                        </button>
                      ),
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Btn kind="ghost" onClick={hear}>
                  <Volume2 size={16} className={speaking ? 'fx-bump' : ''} />{' '}
                  Hear it <Key k="Space" />
                </Btn>
                <Btn kind="ghost" onClick={() => setPinyin((p) => !p)}>
                  {pinyin ? 'Hide' : 'Show'} pinyin and glosses <Key k="P" />
                </Btn>
              </div>
              <p className="mt-5 text-center text-xl leading-snug font-bold">
                {s.en}
              </p>
              <p className="mt-1 text-center text-sm text-[var(--ink-2)]">
                {s.source}
              </p>
              <p className="mx-auto mt-4 max-w-lg text-[var(--ink-2)]">
                {s.note}
              </p>
            </div>
            {test ? (
              <Gap
                s={s}
                onDone={(ok) => {
                  if (ok) {
                    setScene(`say:${s.id}`, 1)
                    points(2)
                    if (!bank.scenes[`say:${s.id}`]) setStamped(true)
                  }
                }}
              />
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn onClick={() => setTest(true)}>
                  Test yourself{' '}
                  <Key
                    k="T"
                    className="ml-1 border-white/30 bg-white/15 text-white"
                  />
                </Btn>
                <Btn kind="ghost" onClick={() => onNext(next)}>
                  Next saying <ArrowRight size={16} />
                </Btn>
                <Btn kind="ghost" onClick={onExit} className="ml-auto">
                  <ArrowLeft size={16} /> All sayings
                </Btn>
              </div>
            )}
          </div>
        </div>
      </div>
    </Frame>
  )
}

// The hanging scroll: it unrolls, then the characters are inked one by
// one, down each column from the right
function Scroll({
  cs,
  pinyin,
  tapped,
  onTap,
  sealed,
  stamp,
}: {
  cs: Array<Cell>
  pinyin: boolean
  tapped: number | null
  onTap: (i: number) => void
  sealed: boolean
  stamp: boolean
}) {
  const [open, setOpen] = useState(false)
  const still = useReducedMotion()
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const cols = useMemo(() => columns(cs), [cs])
  let order = 0
  return (
    <div className="mx-auto w-fit pt-1 drop-shadow-[0_22px_22px_rgba(40,30,20,0.35)]">
      <div className="say-cord" />
      <div className="say-rod" />
      <div className={`say-unroll ${open ? 'say-open' : ''}`}>
        <div>
          <div className="say-silk px-4 pt-14 pb-7 sm:px-5">
            <span className="say-strip left-[30%]" />
            <span className="say-strip right-[30%]" />
            <div className="say-paper flex min-h-[16rem] flex-row-reverse justify-center gap-2 px-4 pt-5 pb-14 sm:gap-3 sm:px-6">
              {cols.map((col, ci) => (
                <div key={ci} className="flex flex-col items-center">
                  {col.map(({ c, p, i }) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onTap(i)}
                      className={`say-char flex flex-col items-center leading-none ${tapped === i ? 'say-on' : ''}`}
                    >
                      {pinyin && (
                        <span className="mt-1 text-[10px] text-[var(--jade)]">
                          {p}
                        </span>
                      )}
                      <span
                        className="fx-ink-in zh inline-block text-[2.6rem] leading-[1.12] sm:text-5xl"
                        style={{
                          animationDelay: `${still ? 0 : 1000 + order++ * 85}ms`,
                        }}
                      >
                        {c}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              {sealed && (
                <span className="absolute bottom-3 left-3">
                  <Seal text="学" size={36} stamp={stamp} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="say-rod say-rod-bottom" />
    </div>
  )
}

// The saying with characters missing, to fill in one at a time
function Gap({ s, onDone }: { s: Saying; onDone: (ok: boolean) => void }) {
  const { play } = useSpeaker()
  const cs = useMemo(() => chars(s), [s])
  const slots = useMemo(() => {
    const idx = cs.map((x, i) => ('punct' in x ? -1 : i)).filter((i) => i >= 0)
    return shuffle(idx)
      .slice(0, Math.min(3, Math.ceil(idx.length / 4)))
      .sort((a, b) => a - b)
  }, [cs])
  const [filled, setFilled] = useState<Array<number>>([])
  const [miss, setMiss] = useState(0)
  const buttons = useRef(new Map<string, HTMLButtonElement | null>())
  const card = useRef<HTMLDivElement>(null)
  const current = slots[filled.length] as number | undefined
  const pool = useMemo(() => {
    const all = [
      ...new Set(
        SAYINGS.flatMap((x) => [...x.zh].filter((c) => !PUNCT.test(c))),
      ),
    ]
    if (current === undefined) return []
    const want = cs[current].c
    return shuffle([
      want,
      ...shuffle(all.filter((c) => c !== want)).slice(0, 3),
    ])
  }, [current])
  const done = current === undefined

  const choose = (c: string) => {
    if (current === undefined) return
    if (c === cs[current].c) {
      blip('right')
      const f = [...filled, current]
      setFilled(f)
      if (f.length === slots.length) {
        blip('win')
        void play(s.zh, sayer(s))
        if (miss === 0) cheer(card.current, '+2')
        onDone(miss === 0)
      }
    } else {
      blip('wrong')
      setMiss((m) => m + 1)
      replay(buttons.current.get(c), 'fx-shake')
    }
  }

  useKeys((key) => {
    if (done || !/^[1-4]$/.test(key)) return
    const c = pool[Number(key) - 1] as string | undefined
    if (c) choose(c)
    return true
  }, !done)

  return (
    <div ref={card} className="zh-card fx-rise mt-4 p-6 text-center">
      <div className="flex flex-wrap justify-center gap-1">
        {cs.map((x, i) => {
          const hidden = slots.includes(i) && !filled.includes(i)
          return (
            <span
              key={i}
              className={`zh text-4xl ${hidden ? (i === current ? 'rounded-md bg-[var(--gold)]/40 px-2 text-transparent' : 'rounded-md bg-[var(--paper-2)] px-2 text-transparent') : slots.includes(i) ? 'fx-ink-in text-[var(--jade)]' : ''}`}
            >
              {x.c}
            </span>
          )
        })}
      </div>
      {!done ? (
        <div className="mt-5 flex justify-center gap-2">
          {pool.map((c, k) => (
            <button
              key={c}
              ref={(el) => {
                buttons.current.set(c, el)
              }}
              type="button"
              onClick={() => choose(c)}
              className="zh relative rounded-xl border-2 border-[var(--paper-2)] bg-[var(--paper)] px-4 py-2 text-4xl shadow-[0_3px_0_var(--paper-2)] transition hover:-translate-y-0.5 hover:border-[var(--gold)]"
            >
              <Key
                k={String(k + 1)}
                className="absolute top-1 left-1 scale-90"
              />
              {c}
            </button>
          ))}
        </div>
      ) : (
        <p className="fx-pop mt-4 text-lg font-black text-[var(--jade)]">
          {miss === 0
            ? 'Flawless – your seal is on the scroll.'
            : `Done, with ${miss} slip${miss > 1 ? 's' : ''}.`}
        </p>
      )}
    </div>
  )
}
