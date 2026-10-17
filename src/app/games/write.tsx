import { useEffect, useMemo, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import { Eye, EyeOff, Play } from 'lucide-react'
import { WORD, WORDS } from '../data/words'
import { syllables } from '../lib/pinyin'
import { blip } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Ruby } from '../ui'
import {
  Key,
  PlayButton,
  Seal,
  burst,
  floatText,
  replay,
  useKeys,
  useSpeaker,
} from './fx'

// Brush: write the characters of the words you have met, stroke by
// stroke, in the right order and direction. Hanzi Writer checks each
// stroke (its stroke data, from Make Me a Hanzi, loads from a CDN). The
// sheet is rice paper with a red writing grid; the ink bleeds a little
// into it; a character written well gets the teacher's red seal.

interface Char {
  c: string
  p: string
  word: string
}

function charsOf(ids: Array<string>): Array<Char> {
  const seen = new Set<string>()
  const out: Array<Char> = []
  for (const id of ids) {
    const w = WORD[id]
    if (!w) continue
    const s = syllables(w.p)
    ;[...w.h].forEach((c, i) => {
      if (seen.has(c) || c === '儿') return
      seen.add(c)
      out.push({ c, p: s[i] ?? '', word: w.id })
    })
  }
  return out
}

const INK = '#1d1712'

// Rice paper: a warm ground, a fine grain and long fibres
const PAPER = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.22  0 0 0 0.10 0'/></filter><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.32' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.62  0 0 0 0 0.52  0 0 0 0 0.36  0 0 0 0.16 -0.02'/></filter><rect width='100%' height='100%' filter='url(%23g)'/><rect width='100%' height='100%' filter='url(%23f)'/></svg>`
  return `url("data:image/svg+xml,${svg.replaceAll('#', '%23').replaceAll('"', "'")}")`
})()

export default function Write() {
  const { bank, record, points, setBest } = useStore()
  const { speaking, play } = useSpeaker()
  const chars = useMemo(() => {
    const met = WORDS.filter((w) => bank.cards[w.id]).map((w) => w.id)
    return charsOf(met.length >= 3 ? met : WORDS.slice(0, 10).map((w) => w.id))
  }, [])
  const [i, setI] = useState(0)
  const [outline, setOutline] = useState(true)
  const [result, setResult] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [done, setDone] = useState<Array<{ c: string; good: boolean }>>([])
  const box = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const writer = useRef<HanziWriter | null>(null)
  const [size] = useState(() =>
    typeof matchMedia !== 'undefined' &&
    matchMedia('(max-width: 400px)').matches
      ? 240
      : 280,
  )
  const ch = chars[i % chars.length]
  const w = WORD[ch.word]!

  useEffect(() => {
    if (!box.current) return
    box.current.innerHTML = ''
    setResult(null)
    const hw = HanziWriter.create(box.current, ch.c, {
      width: size,
      height: size,
      padding: 18,
      showOutline: outline,
      showCharacter: false,
      strokeColor: INK,
      outlineColor: '#e2d3b8',
      drawingColor: INK,
      drawingWidth: 24,
      highlightColor: '#c8372d',
      radicalColor: INK,
      highlightOnComplete: false,
    })
    writer.current = hw
    void hw.quiz({
      showHintAfterMisses: 2,
      onCorrectStroke: () => blip('tick'),
      onComplete: ({ totalMistakes }) => {
        setResult(totalMistakes)
        const good = totalMistakes <= 2
        blip(good ? 'right' : 'wrong')
        void play(ch.c)
        if (WORD[ch.c]) record(ch.c, good, 0.5)
        if (good) {
          points(2)
          burst(box.current, {
            colors: ['#c8372d', '#1d1712', '#d9a441'],
            n: 14,
            spread: 120,
          })
          floatText(box.current, '+2', { color: '#c8372d' })
        } else replay(sheet.current, 'fx-shake')
        setDone((d) => [...d, { c: ch.c, good }])
        setCount((n) => {
          setBest('write', n + 1)
          return n + 1
        })
      },
    })
    return () => {
      writer.current = null
    }
  }, [i, outline])

  const next = () => setI((x) => x + 1)
  const show = () => void writer.current?.animateCharacter()

  useKeys((key) => {
    if (key === 'Enter') {
      next()
      return true
    }
    if (key === ' ') {
      void play(ch.c)
      return true
    }
    if (key === 'h' || key === 'H') {
      show()
      return true
    }
    if (key === 'o' || key === 'O') {
      setOutline((o) => !o)
      return true
    }
  })

  const good = result !== null && result <= 2

  return (
    <Frame
      title="Brush"
      zh="写字"
      wide
      right={<span className="font-bold">{count} written</span>}
    >
      {/* the ink: rough-edged strokes over a faint bleed */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="brush-ink" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.09"
            numOctaves="2"
            seed="5"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3.5"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          <feGaussianBlur in="rough" stdDeviation="2" result="soft" />
          <feColorMatrix
            in="soft"
            type="matrix"
            values="0 0 0 0 0.11  0 0 0 0 0.09  0 0 0 0 0.07  0 0 0 0.42 0"
            result="bleed"
          />
          <feMerge>
            <feMergeNode in="bleed" />
            <feMergeNode in="rough" />
          </feMerge>
        </filter>
      </svg>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div
          ref={sheet}
          className="relative flex shrink-0 gap-2 rounded-lg p-3 shadow-[0_18px_40px_-20px_rgba(60,40,10,0.55),0_1px_0_rgba(0,0,0,0.05)]"
          style={{ background: `${PAPER}, #f6eedb` }}
        >
          <div className="relative" style={{ width: size, height: size }}>
            <Grid size={size} />
            <div
              ref={box}
              className="fx-ink relative touch-none"
              style={{ width: size, height: size }}
            />
          </div>
          {/* the margin: the word, written small down it, and the seal */}
          <div className="flex w-10 flex-col items-center justify-between py-1">
            <span className="zh text-xl leading-tight text-[#3a2f26] [writing-mode:vertical-rl]">
              {w.h}
            </span>
            <span className="flex h-12 w-10 items-end justify-center">
              {good && (
                <Seal
                  key={`${i}-${result}`}
                  text={result === 0 ? '很好' : '好'}
                  size={40}
                  stamp
                />
              )}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
            Write
          </p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-4xl font-bold text-[var(--jade)]">
              {ch.p}
            </span>
            <PlayButton
              onClick={() => void play(ch.c)}
              speaking={speaking}
              size={46}
              hint={false}
            />
          </div>
          <p className="mt-2">
            in <Ruby h={w.h} p={w.p} className="text-3xl" /> – {w.e}
          </p>
          {result !== null && (
            <p
              className={`fx-pop mt-3 text-lg font-black ${good ? 'text-[var(--jade)]' : 'text-[var(--red)]'}`}
            >
              {result === 0
                ? 'Not a stroke wrong – 很好 hěn hǎo, very good.'
                : result <= 2
                  ? `Good – ${result} slip${result > 1 ? 's' : ''}. 好 hǎo.`
                  : `${result} slips. Try it again?`}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn kind="ghost" onClick={show}>
              <Play size={15} /> Show me <Key k="H" />
            </Btn>
            <Btn kind="ghost" onClick={() => setOutline((o) => !o)}>
              {outline ? <EyeOff size={15} /> : <Eye size={15} />}
              {outline ? 'Hide outline' : 'Show outline'} <Key k="O" />
            </Btn>
            <Btn onClick={next}>
              Next{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          </div>
          <p className="mt-4 text-sm text-[var(--ink-2)]">
            Draw each stroke in order, from where it starts. After two misses
            the next stroke is shown. Strokes go mostly left to right and top to
            bottom; across before down.
          </p>
          {done.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {done.map((d, k) => (
                <span
                  key={k}
                  className="fx-pop zh flex h-9 w-9 items-center justify-center rounded-md bg-[#f6eedb] text-xl"
                  style={{
                    color: d.good ? INK : 'var(--red)',
                    boxShadow: d.good
                      ? 'inset 0 0 0 1.5px rgba(200,55,45,0.5)'
                      : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                  }}
                  title={d.good ? 'written well' : 'try again'}
                >
                  {d.c}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-1">
            {chars.map((x, k) => (
              <button
                key={x.c}
                type="button"
                onClick={() => setI(k)}
                title={`${x.c} ${x.p}`}
                className={`zh rounded-md px-1.5 text-2xl transition ${k === i % chars.length ? 'bg-[var(--ink)] text-white' : 'hover:bg-[var(--paper-2)]'}`}
              >
                {x.c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  )
}

// The writing grid (米字格): a red frame, and a cross and diagonals dashed
function Grid({ size }: { size: number }) {
  const s = size
  const line = (x1: number, y1: number, x2: number, y2: number) => (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="#c8372d"
      strokeOpacity="0.32"
      strokeWidth="1"
      strokeDasharray="5 5"
    />
  )
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      aria-hidden="true"
    >
      {line(0, 0, s, s)}
      {line(s, 0, 0, s)}
      {line(s / 2, 0, s / 2, s)}
      {line(0, s / 2, s, s / 2)}
      <rect
        x="1"
        y="1"
        width={s - 2}
        height={s - 2}
        fill="none"
        stroke="#c8372d"
        strokeOpacity="0.7"
        strokeWidth="2"
      />
    </svg>
  )
}
