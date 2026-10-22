import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Mic, Square, Volume2 } from 'lucide-react'
import { WORDS } from '../data/words'
import { TONE_SETS, TONE_SET_PINYIN } from '../data/tones'
import { bare, join, syllables, toneOf } from '../lib/pinyin'
import { blip, soundUrl } from '../lib/audio'
import { WORD_VOICE } from '../lib/speech'
import { useStore } from '../lib/store'
import {
  clean,
  decode,
  ideal,
  likeness,
  rmsOf,
  shape,
  track,
  yin,
} from '../lib/pitch'
import { Btn, Frame, Ruby, sample, shuffle } from '../ui'
import { Pix } from '../pixel/Pix'
import {
  Combo,
  CountUp,
  Key,
  PlayButton,
  cheer,
  reducedMotion,
  replay,
  useKeys,
  useSpeaker,
} from './fx'
import type { RefObject } from 'react'
import type { Frame as PitchFrame } from '../lib/pitch'
import type { Word } from '../data/words'

// Tones: hearing them (one syllable of four, then the tones of whole
// words) and saying them (your pitch drawn over the recording's).

type Mode = 'menu' | 'four' | 'pairs' | 'say'

const TONE_LABEL = [
  '',
  '1 ˉ high',
  '2 ˊ rising',
  '3 ˇ dipping',
  '4 ˋ falling',
  '· neutral',
]

// Words whose tones are their own: not 不 and 一, which change, and with
// pinyin for every character
const toneWords = WORDS.filter(
  (w) =>
    !/[不一]/.test(w.h) &&
    !w.tags.includes('part') &&
    syllables(w.p).length <= 3,
)

export default function Tones() {
  const [mode, setMode] = useState<Mode>('menu')
  const { bank } = useStore()
  if (mode === 'four') return <Four onExit={() => setMode('menu')} />
  if (mode === 'pairs') return <Pairs onExit={() => setMode('menu')} />
  if (mode === 'say') return <Say onExit={() => setMode('menu')} />
  const cell = (a: number, b: number) => bank.tones[`${a}${b}`]
  return (
    <Frame title="Tones" zh="声调">
      <p className="mb-5 text-[var(--ink-2)]">
        Mandarin has four tones and a light neutral one. The same syllable in
        another tone is another word: mā mum, má hemp, mǎ horse, mà scold.
      </p>
      <ToneStrip />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ModeCard
          sprite="horse"
          title="Four tones"
          text="Hear one syllable, pick its tone. The place to start."
          onClick={() => setMode('four')}
          n={0}
        />
        <ModeCard
          sprite="ear"
          title="Tone pairs"
          text="Hear a word, tap the tone of each syllable."
          onClick={() => setMode('pairs')}
          n={1}
        />
        <ModeCard
          sprite="mic"
          title="Say it"
          text="Say a word into the mic and see your pitch over the voice's."
          onClick={() => setMode('say')}
          n={2}
        />
      </div>
      <h2 className="mt-8 mb-2 font-black">Your ear, by pair of tones</h2>
      <div className="inline-grid grid-cols-[auto_repeat(5,2.75rem)] gap-1 text-center text-xs">
        <span />
        {[1, 2, 3, 4, 5].map((b) => (
          <span
            key={b}
            className="flex flex-col items-center font-bold text-[var(--ink-2)]"
          >
            <ToneGlyph tone={b} size={22} />
            {b === 5 ? '·' : b}
          </span>
        ))}
        {[1, 2, 3, 4].map((a) => (
          <Row key={a} a={a} cell={cell} />
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--ink-2)]">
        First tone down, second across. Green is good, red needs work.
      </p>
    </Frame>
  )
}

// The four tones of ma, each drawn on as it is said: tap one to hear it
function ToneStrip() {
  const { speaking, play } = useSpeaker()
  const [on, setOn] = useState<number | null>(null)
  const [n, setN] = useState(0)
  const set = TONE_SETS[0]
  return (
    <div className="zh-card grid grid-cols-4 gap-1 p-3">
      {set.chars.map((c, t) => (
        <button
          key={c}
          type="button"
          onClick={() => {
            setOn(t)
            setN((x) => x + 1)
            void play(c)
          }}
          className={`flex flex-col items-center rounded-xl py-2 transition hover:bg-[var(--paper-2)] ${on === t && speaking ? 'bg-[var(--paper-2)]' : ''}`}
        >
          <ToneGlyph
            tone={t + 1}
            size={48}
            play={on === t ? n : undefined}
            staff
          />
          <span className="text-lg font-bold">{TONE_SET_PINYIN.ma[t]}</span>
          <span className="zh text-2xl leading-tight">{c}</span>
          <span className="text-xs text-[var(--ink-2)]">{set.means[t]}</span>
        </button>
      ))}
    </div>
  )
}

function Row({
  a,
  cell,
}: {
  a: number
  cell: (a: number, b: number) => [number, number] | undefined
}) {
  return (
    <>
      <span className="flex items-center gap-1 pr-1 font-bold text-[var(--ink-2)]">
        {a}
        <ToneGlyph tone={a} size={22} />
      </span>
      {[1, 2, 3, 4, 5].map((b) => {
        const c = cell(a, b)
        const r = c ? c[0] / c[1] : null
        return (
          <span
            key={b}
            title={c ? `${c[0]} of ${c[1]}` : 'not heard yet'}
            className="flex h-11 items-center justify-center rounded-lg font-bold transition hover:scale-105"
            style={{
              background:
                r === null
                  ? 'var(--paper-2)'
                  : `color-mix(in srgb, var(--jade) ${r * 100}%, var(--red))`,
              color: r === null ? 'var(--ink-2)' : 'white',
            }}
          >
            {c ? `${Math.round((r ?? 0) * 100)}` : '–'}
          </span>
        )
      })}
    </>
  )
}

function ModeCard({
  sprite,
  title,
  text,
  onClick,
  n,
}: {
  sprite: string
  title: string
  text: string
  onClick: () => void
  n: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="zh-card fx-rise group p-5 text-left transition hover:-translate-y-0.5"
      style={{ animationDelay: `${n * 70}ms` }}
    >
      <Pix
        name={sprite}
        size={48}
        className="transition group-hover:scale-110 group-hover:-rotate-6"
      />
      <div className="mt-2 font-black">{title}</div>
      <p className="text-sm text-[var(--ink-2)]">{text}</p>
    </button>
  )
}

function Score({
  right,
  total,
  streak,
}: {
  right: number
  total: number
  streak: number
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold">
      <Combo n={streak} />
      <span className="tabular-nums">
        {right}/{total}
      </span>
    </div>
  )
}

// --- Four tones: one syllable ---

function Four({ onExit }: { onExit: () => void }) {
  const { points, setBest } = useStore()
  const { speaking, play } = useSpeaker()
  const make = () => ({
    set: sample(TONE_SETS),
    t: Math.floor(Math.random() * 4),
    id: Math.random(),
  })
  const [q, setQ] = useState(make)
  const [picked, setPicked] = useState<{ t: number; at: number } | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 })
  const [leaving, setLeaving] = useState(false)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const ch = q.set.chars[q.t]
  useEffect(() => {
    void play(ch)
  }, [q])
  const pick = (t: number) => {
    if (picked !== null) return
    setPicked({ t, at: Date.now() })
    const right = t === q.t
    blip(right ? 'right' : 'wrong')
    if (right) cheer(buttons.current[t], '+1')
    setScore((s) => {
      const n = {
        right: s.right + (right ? 1 : 0),
        total: s.total + 1,
        streak: right ? s.streak + 1 : 0,
      }
      setBest('tones-four', n.streak)
      return n
    })
    if (right) points(1)
  }
  const go = () => {
    if (picked === null || leaving) return
    const fresh = () => {
      setLeaving(false)
      setPicked(null)
      setQ(make())
    }
    if (reducedMotion()) return fresh()
    setLeaving(true)
    setTimeout(fresh, 190)
  }
  useKeys((key) => {
    if (key === ' ') {
      void play(ch)
      return true
    }
    if (key === 'Escape') {
      onExit()
      return true
    }
    if (picked) {
      if (key !== 'Enter' || Date.now() - picked.at < 150) return
      go()
      return true
    }
    if (!/^[1-4]$/.test(key)) return
    pick(Number(key) - 1)
    return true
  })
  return (
    <Frame title="Four tones" zh="四声" right={<Score {...score} />}>
      <div
        key={q.id}
        className={`zh-card flex flex-col p-6 text-center max-sm:min-h-[calc(100dvh-10.5rem)] ${leaving ? 'fx-leave' : 'fx-enter'}`}
      >
        <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
          Which tone is {q.set.base}?
        </p>
        <PlayButton
          onClick={() => void play(ch)}
          speaking={speaking}
          className="mx-auto mt-4"
        />
        {/* on a phone the choices sit low, in reach of a thumb */}
        <div className="flex-1" />
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[0, 1, 2, 3].map((t) => {
            const p = TONE_SET_PINYIN[q.set.base][t]
            const look =
              picked === null
                ? 'border-[var(--paper-2)] bg-[var(--paper)] shadow-[0_3px_0_var(--paper-2)] hover:-translate-y-0.5 hover:border-[var(--gold)]'
                : t === q.t
                  ? `border-[var(--jade)] bg-[#e3f0ea] ${picked.t === t ? 'fx-pulse' : 'fx-beacon'}`
                  : picked.t === t
                    ? 'fx-shake border-[var(--red)] bg-[#f8e1dc]'
                    : 'border-transparent bg-[var(--paper)] opacity-50'
            return (
              <button
                key={t}
                ref={(el) => {
                  buttons.current[t] = el
                }}
                type="button"
                disabled={picked !== null}
                onClick={() => pick(t)}
                className={`relative rounded-2xl border-2 p-3 transition duration-150 ${look}`}
              >
                <Key k={String(t + 1)} className="absolute top-1.5 left-1.5" />
                <ToneGlyph
                  tone={t + 1}
                  size={52}
                  play={q.id}
                  delay={t * 110}
                  staff
                />
                <div className="text-2xl font-bold">{p}</div>
                {picked !== null && (
                  <div className="fx-rise text-sm text-[var(--ink-2)]">
                    <span className="zh text-xl text-[var(--ink)]">
                      {q.set.chars[t]}
                    </span>{' '}
                    {q.set.means[t]}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {picked !== null ? (
          <div className="fx-rise mt-5 flex justify-center gap-2">
            {picked.t !== q.t && (
              <Btn
                kind="ghost"
                onClick={() => void play(q.set.chars[picked.t])}
              >
                <Volume2 size={16} /> Hear{' '}
                {TONE_SET_PINYIN[q.set.base][picked.t]}
              </Btn>
            )}
            <Btn onClick={go}>
              Next{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[var(--ink-2)] max-sm:hidden">
            <Key k="1" />–<Key k="4" /> to choose, <Key k="Space" /> to hear it
            again
          </p>
        )}
      </div>
      <Btn kind="ghost" onClick={onExit} className="mt-4">
        <ArrowLeft size={16} /> Tones
      </Btn>
    </Frame>
  )
}

// Contours on Chao's five-level scale, in a 40 × 40 box: high level,
// rising, dipping and rising, falling, and the short neutral
const CONTOUR: Record<number, string | undefined> = {
  1: 'M6 9 L34 9',
  2: 'M6 23 L34 9',
  3: 'M6 19 Q15 37 22 31 T34 12',
  4: 'M6 9 L34 33',
  5: 'M16 21 L24 21',
}

// The shape of a tone, drawn. With `play` it draws itself on, a bead
// riding along it, each time `play` changes; `staff` adds the five pitch
// levels faintly behind it.
export function ToneGlyph({
  tone,
  size = 40,
  play,
  delay = 0,
  staff = false,
  color = 'var(--red)',
}: {
  tone: number
  size?: number
  play?: number
  delay?: number
  staff?: boolean
  color?: string
}) {
  const path = useRef<SVGPathElement>(null)
  const bead = useRef<SVGCircleElement>(null)
  const d = CONTOUR[tone] ?? CONTOUR[5]!
  useEffect(() => {
    const p = path.current
    const b = bead.current
    if (play === undefined || !p || !b || reducedMotion()) return
    const len = p.getTotalLength()
    const frames = Array.from({ length: 16 }, (_, i) => {
      const pt = p.getPointAtLength((len * i) / 15)
      return { transform: `translate(${pt.x}px, ${pt.y}px)`, opacity: 1 }
    })
    frames[0] = { ...frames[0], opacity: 0 }
    frames[frames.length - 1] = { ...frames[frames.length - 1], opacity: 0 }
    const a = b.animate(frames, {
      duration: 700,
      delay,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both',
    })
    return () => a.cancel()
  }, [play, delay])
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="mx-auto overflow-visible"
      aria-hidden="true"
    >
      {staff &&
        [9, 15, 21, 27, 33].map((y) => (
          <line
            key={y}
            x1="3"
            x2="37"
            y1={y}
            y2={y}
            stroke="#e9dcc4"
            strokeWidth="0.8"
          />
        ))}
      <path
        key={play}
        ref={path}
        d={d}
        pathLength={1}
        className={play === undefined ? '' : 'fx-draw'}
        style={
          play === undefined ? undefined : { animationDelay: `${delay}ms` }
        }
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle ref={bead} r="3.2" fill="var(--gold)" opacity="0" />
    </svg>
  )
}

// --- Tone pairs: whole words ---

function Pairs({ onExit }: { onExit: () => void }) {
  const { bank, tone, record, points, setBest } = useStore()
  const { speaking, play } = useSpeaker()
  // Words met first, weighted to the pairs heard worst
  const pool = useMemo(() => {
    const met = toneWords.filter((w) => bank.cards[w.id])
    return met.length >= 12
      ? met
      : toneWords.filter((w) => w.lesson <= 6 || bank.cards[w.id])
  }, [])
  const choose = useCallback((): Word => {
    const weighted = shuffle(pool).slice(0, 8)
    const score = (w: Word) => {
      const ts = syllables(w.p).map(toneOf)
      const k = `${ts[0]}${ts[1] ?? ''}`
      const c = bank.tones[k]
      return c ? c[0] / c[1] : 0
    }
    return weighted.sort((a, b) => score(a) - score(b))[0]
  }, [pool, bank.tones])
  const [w, setW] = useState<Word>(choose)
  const sylls = syllables(w.p)
  const want = sylls.map(toneOf)
  // The tones as said: a third tone before another third is said as a
  // second (nǐhǎo sounds like níhǎo)
  const said = want.map((t, i) => (t === 3 && want[i + 1] === 3 ? 2 : t))
  // Right as written, or as said: hearing the tone that is said is no
  // error, though the written one is the one to learn (yellow, not red)
  const fits = (g: number | null, i: number) => g === want[i] || g === said[i]
  const [guess, setGuess] = useState<Array<number | null>>(() =>
    sylls.map(() => null),
  )
  const [checked, setChecked] = useState<number | null>(null)
  const [hint, setHint] = useState(true)
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 })
  const [leaving, setLeaving] = useState(false)
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void play(w.h)
  }, [w])

  const check = () => {
    if (checked !== null || guess.some((g) => g === null)) return
    setChecked(Date.now())
    const exact = guess.every((g, i) => g === want[i])
    const right = guess.every(fits)
    blip(right ? 'right' : 'wrong')
    if (exact) cheer(card.current, '+1')
    if (want.length >= 2) tone(`${want[0]}${want[1]}`, right)
    else tone(`${want[0]}`, right)
    record(w.id, right, 0.4, 'hs')
    if (right) points(1)
    setScore((s) => {
      const n = {
        right: s.right + (right ? 1 : 0),
        total: s.total + 1,
        streak: right ? s.streak + 1 : 0,
      }
      setBest('tones', n.streak)
      return n
    })
  }
  useEffect(() => {
    if (checked === null && guess.every((g) => g !== null)) check()
  }, [guess])

  const go = () => {
    if (checked === null || leaving) return
    const fresh = () => {
      const n = choose()
      setLeaving(false)
      setW(n)
      setGuess(syllables(n.p).map(() => null))
      setChecked(null)
    }
    if (reducedMotion()) return fresh()
    setLeaving(true)
    setTimeout(fresh, 190)
  }

  useKeys((key) => {
    if (key === ' ') {
      void play(w.h)
      return true
    }
    if (key === 'Escape') {
      onExit()
      return true
    }
    if (checked !== null) {
      if (key !== 'Enter' || Date.now() - checked < 150) return
      go()
      return true
    }
    if (key === 'Backspace') {
      setGuess((g) => {
        const last = g.map((x) => x !== null).lastIndexOf(true)
        return last < 0 ? g : g.map((x, j) => (j === last ? null : x))
      })
      return true
    }
    if (!/^[1-5]$/.test(key)) return
    setGuess((g) => {
      const at = g.indexOf(null)
      return at < 0 ? g : g.map((x, j) => (j === at ? Number(key) : x))
    })
    return true
  })

  const sandhi =
    want.length >= 2 && want.some((t, i) => t === 3 && want[i + 1] === 3)

  return (
    <Frame title="Tone pairs" zh="声调" right={<Score {...score} />}>
      <div
        key={w.id}
        ref={card}
        className={`zh-card p-6 text-center ${leaving ? 'fx-leave' : 'fx-enter'} ${checked !== null && !guess.every(fits) ? 'fx-shake' : ''}`}
      >
        <PlayButton onClick={() => void play(w.h)} speaking={speaking} />
        <div className="mt-6 flex flex-wrap justify-center gap-6">
          {sylls.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="text-3xl font-bold">
                {checked !== null ? s : hint ? bare(s) : '?'}
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((t) => {
                  const on = guess[i] === t
                  const state =
                    checked === null
                      ? on
                        ? 'bg-[var(--ink)] text-white ring-2 ring-[var(--ink)]'
                        : 'bg-[var(--paper)] hover:bg-[var(--paper-2)]'
                      : t === want[i]
                        ? 'bg-[var(--jade)] text-white'
                        : on && t === said[i]
                          ? 'bg-[var(--gold)] text-[var(--ink)]'
                          : on
                            ? 'bg-[var(--red)] text-white'
                            : 'bg-[var(--paper)] opacity-40'
                  return (
                    <button
                      key={t}
                      type="button"
                      title={TONE_LABEL[t]}
                      disabled={checked !== null}
                      onClick={() =>
                        setGuess((g) => g.map((x, j) => (j === i ? t : x)))
                      }
                      className={`flex h-14 w-12 flex-col items-center justify-center rounded-lg text-sm font-black transition ${state}`}
                    >
                      <ToneGlyph
                        tone={t}
                        size={24}
                        color={
                          checked !== null &&
                          on &&
                          t !== want[i] &&
                          t === said[i]
                            ? 'var(--ink)'
                            : (checked === null && on) ||
                                (checked !== null && (t === want[i] || on))
                              ? '#fff'
                              : 'var(--red)'
                        }
                      />
                      {t === 5 ? '·' : t}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {checked !== null ? (
          <div className="fx-rise mt-6">
            <Ruby h={w.h} p={w.p} className="text-5xl" />
            <p className="mt-1 text-[var(--ink-2)]">{w.e}</p>
            {sandhi && (
              <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--jade)]">
                {guess.some((g, i) => g !== want[i] && g === said[i]) &&
                  'You heard it as it is said. '}
                Two third tones in a row: the first is said as a second tone (
                {join(sylls)} sounds like{' '}
                {join(
                  sylls.map((s, i) =>
                    want[i] === 3 && want[i + 1] === 3
                      ? s.replace(
                          /[ǎěǐǒǔǚ]/,
                          (m) =>
                            ({
                              ǎ: 'á',
                              ě: 'é',
                              ǐ: 'í',
                              ǒ: 'ó',
                              ǔ: 'ú',
                              ǚ: 'ǘ',
                            })[m] ?? m,
                        )
                      : s,
                  ),
                )}
                ), but written as two thirds.
              </p>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <Btn onClick={go}>
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
            <Key k="1" />–<Key k="5" /> for each syllable in turn,{' '}
            <Key k="Space" /> to hear it again
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Btn kind="ghost" onClick={onExit}>
          <ArrowLeft size={16} /> Tones
        </Btn>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hint}
            onChange={(e) => setHint(e.target.checked)}
            className="accent-[var(--red)]"
          />
          Show the syllables
        </label>
      </div>
    </Frame>
  )
}

// --- Say it: your pitch over the voice's ---

function Say({ onExit }: { onExit: () => void }) {
  const { bank, record, points, setBest } = useStore()
  const { speaking, play } = useSpeaker()
  const pool = useMemo(() => {
    const met = toneWords.filter(
      (w) => bank.cards[w.id] && syllables(w.p).length <= 2,
    )
    return met.length >= 6
      ? met
      : toneWords.filter((w) => w.lesson <= 3 && syllables(w.p).length <= 2)
  }, [])
  const [w, setW] = useState<Word>(() => sample(pool))
  const [ref_, setRef] = useState<Array<number> | null>(null)
  const [mine, setMine] = useState<Array<number> | null>(null)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  // the mic's frames as they come, read by the plot as it draws
  const live = useRef<Array<PitchFrame>>([])
  const tones = syllables(w.p).map(toneOf)

  // The reference: the recording's own contour, or the textbook shape
  useEffect(() => {
    let gone = false
    setRef(null)
    setMine(null)
    setScore(null)
    live.current = []
    void play(w.h)
    const url = soundUrl(WORD_VOICE, w.h)
    if (url)
      void decode(url).then((d) => {
        if (gone) return
        const s = d ? shape(track(d.samples, d.rate)) : null
        setRef(s ?? ideal(tones))
      })
    else setRef(ideal(tones))
    return () => {
      gone = true
    }
  }, [w])

  useEffect(() => () => stopRef.current?.(), [])

  const start = async () => {
    setError('')
    setMine(null)
    setScore(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch {
      setError(
        'The mic is not available. Allow it in the browser to use Say it.',
      )
      return
    }
    const ctx = new AudioContext()
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    src.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const frames: Array<PitchFrame> = []
    live.current = frames
    const t0 = performance.now()
    let voicedAt = 0
    let raf = 0
    let ended = false
    setRecording(true)
    const finish = () => {
      if (ended) return
      ended = true
      cancelAnimationFrame(raf)
      stream.getTracks().forEach((t) => t.stop())
      void ctx.close()
      setRecording(false)
      stopRef.current = null
      const cleaned = clean(frames)
      live.current = cleaned
      const s = shape(cleaned)
      setMine(s)
      if (s && ref_) {
        const sc = likeness(s, ref_)
        setScore(sc)
        blip(sc >= 70 ? 'right' : 'wrong')
        record(w.id, sc >= 70, 0.3, 'hs')
        if (sc >= 70) points(2)
        setBest('say', sc)
      } else if (!s) setError('No voice heard. Try again, a bit louder.')
    }
    stopRef.current = finish
    const loop = () => {
      analyser.getFloatTimeDomainData(buf)
      const t = (performance.now() - t0) / 1000
      const rms = rmsOf(buf)
      const f0 = rms > 0.012 ? yin(buf, ctx.sampleRate) : null
      frames.push({ t, f0, rms })
      if (f0) voicedAt = t
      // stop after a pause once something was said, or after 4 s
      if ((voicedAt && t - voicedAt > 0.6) || t > 4) return finish()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
  }

  const next = () => setW(sample(pool.filter((x) => x.id !== w.id)))

  useKeys((key) => {
    if (key === ' ') {
      void play(w.h)
      return true
    }
    if (key === 'Enter') {
      if (recording) stopRef.current?.()
      else void start()
      return true
    }
    if (key === 'ArrowRight') {
      next()
      return true
    }
    if (key === 'Escape') {
      onExit()
      return true
    }
  })

  return (
    <Frame title="Say it" zh="说">
      <div className="zh-card p-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <Ruby h={w.h} p={w.p} className="text-7xl" />
          <PlayButton
            onClick={() => void play(w.h)}
            speaking={speaking}
            size={52}
            hint={false}
          />
        </div>
        <p className="mt-1 flex items-center justify-center gap-1 text-[var(--ink-2)]">
          {w.e} ·
          {tones.map((t, i) => (
            <span key={i} className="inline-flex items-center">
              <ToneGlyph tone={t} size={22} />
              <span className="text-sm">
                {TONE_LABEL[t].split(' ').slice(2).join(' ') || 'neutral'}
              </span>
            </span>
          ))}
        </p>
        <Plot reference={ref_} mine={mine} live={live} recording={recording} />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {recording ? (
            <Btn
              kind="dark"
              onClick={() => stopRef.current?.()}
              className="px-6 py-3 text-lg"
            >
              <Square size={16} /> Stop
            </Btn>
          ) : (
            <Btn onClick={() => void start()} className="px-6 py-3 text-lg">
              <Mic size={18} /> {mine ? 'Again' : 'Say it'}{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          )}
          <Btn kind="ghost" onClick={next}>
            Next word <Key k="→" />
          </Btn>
        </div>
        {score !== null && <Gauge score={score} />}
        {error && <p className="mt-3 text-sm text-[var(--red)]">{error}</p>}
        <p className="mt-4 text-xs text-[var(--ink-2)]">
          The green band is the voice's pitch, yours is red, both about their
          own middle, so any voice can match. Nothing is recorded or sent
          anywhere.
        </p>
      </div>
      <Btn kind="ghost" onClick={onExit} className="mt-4">
        <ArrowLeft size={16} /> Tones
      </Btn>
    </Frame>
  )
}

// The score as a dial that fills, with a word for it
function Gauge({ score }: { score: number }) {
  const [shown, setShown] = useState(false)
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    if (score >= 70) cheer(el.current, '+2')
    else replay(el.current, 'fx-shake')
    return () => cancelAnimationFrame(id)
  }, [score])
  const color =
    score >= 70 ? 'var(--jade)' : score >= 45 ? 'var(--gold)' : 'var(--red)'
  const word =
    score >= 85
      ? 'excellent'
      : score >= 70
        ? 'good'
        : score >= 45
          ? 'close'
          : 'listen again'
  return (
    <div ref={el} className="fx-pop mx-auto mt-4 flex w-fit items-center gap-3">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="var(--paper-2)"
          strokeWidth="7"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${shown ? score : 0} 100`}
          style={{
            transition: 'stroke-dasharray 0.9s cubic-bezier(0.3, 1, 0.5, 1)',
          }}
        />
      </svg>
      <span className="text-left">
        <CountUp
          to={score}
          className="block text-3xl leading-none font-black"
        />
        <span className="font-bold" style={{ color }}>
          {word}
        </span>
      </span>
    </div>
  )
}

// The pitch, drawn on a canvas: five faint levels, the voice's contour as
// a soft green band, your contour in red – while you speak, a line that
// grows with a glowing head; after, your whole shape drawn over the band
function Plot({
  reference,
  mine,
  live,
  recording,
}: {
  reference: Array<number> | null
  mine: Array<number> | null
  live: RefObject<Array<PitchFrame>>
  recording: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ro = new ResizeObserver(() =>
      setSize({ w: c.clientWidth, h: c.clientHeight }),
    )
    ro.observe(c)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    const g = c?.getContext('2d')
    if (!c || !g || !size.w) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(size.w * dpr)
    c.height = Math.round(size.h * dpr)
    const W = size.w
    const H = size.h
    const pad = 14
    const unit = H / 26
    const y = (v: number) => Math.max(5, Math.min(H - 5, H / 2 - v * unit))
    const x = (f: number) => pad + f * (W - pad * 2)
    const still = reducedMotion()
    const shownAt = performance.now()
    let raf = 0

    const line = (pts: Array<[number, number]>) => {
      g.beginPath()
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)))
    }

    const draw = (now: number) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)
      // five levels, high to low
      for (let k = 0; k < 5; k++) {
        const ly = pad + ((H - pad * 2) * k) / 4
        g.strokeStyle = k === 2 ? '#e2d3b6' : '#efe4cf'
        g.lineWidth = 1
        g.setLineDash(k === 2 ? [] : [4, 5])
        g.beginPath()
        g.moveTo(pad, ly)
        g.lineTo(W - pad, ly)
        g.stroke()
      }
      g.setLineDash([])
      g.fillStyle = '#b5a68a'
      g.font = '600 10px ui-sans-serif, system-ui, sans-serif'
      g.fillText('high', pad + 2, pad - 3)
      g.fillText('low', pad + 2, H - 3)
      g.lineCap = 'round'
      g.lineJoin = 'round'
      if (reference) {
        const pts = reference.map((v, i): [number, number] => [
          x(i / (reference.length - 1)),
          y(v),
        ])
        line(pts)
        g.strokeStyle = 'rgba(47, 125, 109, 0.16)'
        g.lineWidth = 18
        g.stroke()
        line(pts)
        g.strokeStyle = 'rgba(47, 125, 109, 0.55)'
        g.lineWidth = 3
        g.stroke()
      }
      let more = false
      if (recording) {
        more = true
        const frames = live.current
        const voiced = frames.filter((f) => f.f0)
        const tNow = frames.at(-1)?.t ?? 0
        const tMax = Math.max(1.5, tNow)
        // the sweep: where now is
        g.strokeStyle = 'rgba(200, 55, 45, 0.18)'
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(x(tNow / tMax), pad / 2)
        g.lineTo(x(tNow / tMax), H - pad / 2)
        g.stroke()
        if (voiced.length) {
          const st = voiced.map((f) => 12 * Math.log2(f.f0! / 100))
          const mean = st.reduce((a, b) => a + b, 0) / st.length
          const pts = voiced.map((f, i): [number, number] => [
            x(f.t / tMax),
            y(st[i] - mean),
          ])
          line(pts)
          g.shadowColor = 'rgba(200, 55, 45, 0.6)'
          g.shadowBlur = 8
          g.strokeStyle = '#c8372d'
          g.lineWidth = 3.5
          g.stroke()
          g.shadowBlur = 0
          const [hx, hy] = pts[pts.length - 1]
          const pulse = 4 + Math.sin(now / 90) * 1.5
          g.fillStyle = 'rgba(242, 193, 78, 0.45)'
          g.beginPath()
          g.arc(hx, hy, pulse + 4, 0, Math.PI * 2)
          g.fill()
          g.fillStyle = '#c8372d'
          g.beginPath()
          g.arc(hx, hy, 4, 0, Math.PI * 2)
          g.fill()
        }
      } else if (mine) {
        // drawn on from left to right
        const k = still ? 1 : Math.min(1, (now - shownAt) / 650)
        if (k < 1) more = true
        const n = Math.max(2, Math.round(mine.length * k))
        const pts = mine
          .slice(0, n)
          .map((v, i): [number, number] => [x(i / (mine.length - 1)), y(v)])
        line(pts)
        g.shadowColor = 'rgba(200, 55, 45, 0.45)'
        g.shadowBlur = 6
        g.strokeStyle = '#c8372d'
        g.lineWidth = 3.5
        g.stroke()
        g.shadowBlur = 0
      }
      if (more) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [reference, mine, recording, size, live])

  return (
    <canvas
      ref={canvas}
      className="mx-auto mt-4 block h-36 w-full max-w-md rounded-xl bg-[var(--paper)] sm:h-40"
      aria-label="Pitch: the voice's, and yours"
    />
  )
}
