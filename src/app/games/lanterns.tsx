import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Lock } from 'lucide-react'
import { blip } from '../lib/audio'
import { wordChoices } from '../lib/choices'
import { useStore } from '../lib/store'
import { Btn, Frame, Ruby, usePeek } from '../ui'
import { fadedFirst, practiceWords, short } from '../lib/practice'
import {
  Combo,
  Key,
  PlayButton,
  burst,
  floatText,
  useKeys,
  useSpeaker,
} from './fx'
import type { Word } from '../data/words'
import './lanterns.css'

// Lanterns (灯笼): a word is said, and lanterns rise into the night
// sky with characters on them. Tap the one you heard before it drifts
// away. Three lives; each wave rises a little faster. It asks the
// character for a sound (s>h), the way Review's listening does, with
// lanterns that share the word's length and some of its syllables, so the
// look of them gives nothing away.

const LIVES = 3
// Words met before the game opens (its `needs` in registry.tsx)
export const NEEDS = 15
const COLUMNS = [11, 36, 61, 86]

interface Wave {
  n: number
  w: Word
  choices: Array<Word>
  // Seconds each lantern takes to rise, and when each sets off
  rise: number
  delays: Array<number>
}

type Outcome = { right: boolean; picked?: string } | null

export default function Lanterns() {
  const { bank, record, setBest } = useStore()
  const met = Object.keys(bank.cards).length
  const peek = usePeek()
  const words = useMemo(() => practiceWords(bank), [])
  const pool = useMemo(
    () => words.filter((w) => bank.cards[w.id]).slice(0, 200),
    [words],
  )
  const [playing, setPlaying] = useState(false)
  const [wave, setWave] = useState<Wave | null>(null)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [lives, setLives] = useState(LIVES)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [missed, setMissed] = useState<Array<Word>>([])
  const [over, setOver] = useState(false)
  const order = useRef<Array<Word>>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lanterns = useRef(new Map<string, HTMLButtonElement | null>())
  const { speaking, play } = useSpeaker()

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const nextWave = (n: number) => {
    if (!order.current.length) order.current = fadedFirst(words, 30)
    const w = order.current.shift() as Word
    const choices = wordChoices(
      w,
      pool.length >= 8 ? pool : words,
      'listen',
    ).slice(0, 4)
    const rise = Math.max(4.6, 9.5 - n * 0.35)
    setWave({
      n,
      w,
      choices,
      rise,
      delays: choices.map(() => Math.random() * 1.1),
    })
    setOutcome(null)
    void play(w.h)
  }

  const start = () => {
    setLives(LIVES)
    setScore(0)
    setStreak(0)
    setMissed([])
    setOver(false)
    setPlaying(true)
    order.current = []
    nextWave(0)
  }

  const settle = (right: boolean, picked?: string) => {
    if (!wave || outcome) return
    setOutcome({ right, picked })
    if (bank.cards[wave.w.id]) record(wave.w.id, right, 0.6, 's>h')
    const el = lanterns.current.get(wave.w.id)
    if (right) {
      blip('right')
      burst(el, {
        colors: ['#ffd76a', '#ff9b4a', '#ffe9b0', '#c8372d'],
        n: 26,
        spread: 90,
      })
      const s = streak + 1
      setStreak(s)
      setScore((x) => x + (s >= 3 ? 2 : 1))
      floatText(el, s >= 3 ? '+2' : '+1', { color: '#ffd76a' })
    } else {
      blip('wrong')
      setStreak(0)
      setMissed((m) => (m.includes(wave.w) ? m : [...m, wave.w]))
      void play(wave.w.h)
    }
    const left = right ? lives : lives - 1
    if (!right) setLives(left)
    timer.current = setTimeout(
      () => {
        if (left <= 0) {
          setOver(true)
          setBest('lanterns', score)
          setPlaying(false)
          blip('gong')
        } else nextWave(wave.n + 1)
      },
      right ? 800 : 2000,
    )
  }

  useKeys((key) => {
    if (!playing && key === 'Enter' && met >= NEEDS) {
      start()
      return true
    }
    if (!wave || !playing) return
    if (key === ' ') {
      void play(wave.w.h)
      return true
    }
    if (/^[1-4]$/.test(key) && !outcome) {
      const c = wave.choices[Number(key) - 1] as Word | undefined
      if (c) settle(c.id === wave.w.id, c.id)
      return true
    }
  })

  if (met < NEEDS)
    return (
      <Frame title="Lanterns" zh="灯笼">
        <div className="zh-card fx-rise p-8 text-center">
          <Lock size={40} className="mx-auto text-[var(--ink-2)]" />
          <p className="mt-3 text-lg font-bold">
            Lanterns open once you are practising {NEEDS} words
          </p>
          <p className="mt-1 text-[var(--ink-2)]">
            {NEEDS - met} more to go. The lanterns carry words you have met.
          </p>
          <a href="#today" className="mt-4 inline-block">
            <Btn>Go to Today</Btn>
          </a>
        </div>
      </Frame>
    )

  return (
    <Frame
      title="Lanterns"
      zh="灯笼"
      right={
        playing && (
          <span className="flex items-center gap-0.5" aria-label="Lives">
            {Array.from({ length: LIVES }, (_, i) => (
              <Heart
                key={i}
                size={20}
                className={
                  i < lives
                    ? 'fill-[var(--red)] text-[var(--red)]'
                    : 'text-[var(--paper-3)]'
                }
              />
            ))}
          </span>
        )
      }
    >
      <div className="ln-sky relative overflow-hidden rounded-3xl">
        <div className="ln-stars" aria-hidden />
        <div className="ln-moon" aria-hidden />
        <div className="ln-roofs" aria-hidden />
        {playing && wave && (
          <>
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
              <PlayButton
                size={52}
                hint={false}
                speaking={speaking}
                onClick={() => void play(wave.w.h)}
              />
              <Combo n={streak} />
            </div>
            <div className="absolute top-4 right-4 z-20 text-right text-[#ffe9b0]">
              <div className="text-3xl font-black tabular-nums">{score}</div>
              <div className="text-xs opacity-70">wave {wave.n + 1}</div>
            </div>
            <div key={wave.n} className="absolute inset-0">
              {wave.choices.map((c, i) => {
                const right = c.id === wave.w.id
                const state = !outcome
                  ? ''
                  : right
                    ? outcome.right
                      ? 'ln-popped'
                      : 'ln-glow'
                    : outcome.picked === c.id
                      ? 'ln-out'
                      : 'ln-fade'
                return (
                  <button
                    key={c.id}
                    ref={(el) => {
                      lanterns.current.set(c.id, el)
                    }}
                    type="button"
                    disabled={!!outcome}
                    onClick={() => settle(right, c.id)}
                    onAnimationEnd={(e) => {
                      if (e.animationName === 'ln-rise' && right && !outcome)
                        settle(false)
                    }}
                    className={`ln-lantern ${state}`}
                    style={{
                      left: `${COLUMNS[i]}%`,
                      animationDuration: `${wave.rise}s, 2.6s`,
                      animationDelay: `${wave.delays[i]}s, ${wave.delays[i]}s`,
                      animationPlayState: outcome ? 'paused' : 'running',
                    }}
                  >
                    <span className="ln-cap" />
                    <span className="ln-body">
                      <Key k={String(i + 1)} className="ln-key" />
                      <span
                        className="zh ln-han"
                        style={{
                          fontSize: `${[0, 2.1, 1.75, 1.35, 1.1][Math.min([...c.h].length, 4)]}rem`,
                        }}
                      >
                        {c.h}
                      </span>
                      {outcome && (right || outcome.picked === c.id) && (
                        <span className="ln-gloss">{short(c)}</span>
                      )}
                    </span>
                    <span className="ln-cap ln-cap-b" />
                    <span className="ln-tassel" />
                  </button>
                )
              })}
            </div>
          </>
        )}
        {!playing && (
          <div className="relative z-20 flex h-full flex-col items-center justify-center p-6 text-center text-[#ffe9b0]">
            {over ? (
              <>
                <p className="text-sm tracking-widest uppercase opacity-70">
                  The lanterns are out
                </p>
                <p className="mt-1 text-6xl font-black">{score}</p>
                <p className="mb-5 opacity-80">
                  {wave ? `${wave.n + 1} waves` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="zh-display text-5xl text-[#ffd76a]">灯笼</p>
                <p className="mt-2 mb-6 max-w-xs opacity-80">
                  Listen. Tap the lantern with the word you heard.
                </p>
              </>
            )}
            <Btn onClick={start} className="px-8 py-3 text-lg">
              {over ? 'Again' : 'Light them'}{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          </div>
        )}
      </div>
      {over && missed.length > 0 && (
        <section className="zh-card mt-4 p-5">
          <h2 className="mb-2 font-black">Missed</h2>
          <div className="flex flex-wrap gap-3">
            {missed.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => peek(w.id)}
                className="flex flex-col items-center rounded-xl bg-[var(--paper)] px-3 py-2 hover:bg-[var(--paper-2)]"
              >
                <Ruby h={w.h} p={w.p} className="text-2xl" />
                <span className="text-xs text-[var(--ink-2)]">{short(w)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </Frame>
  )
}
