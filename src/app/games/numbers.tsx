import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { NUMBER_ITEMS } from '../data/numbers'
import { WORD } from '../data/words'
import { numberPinyin, value } from '../lib/numbers'
import { join, sandhi, toneOf } from '../lib/pinyin'
import { blip } from '../lib/audio'
import { WORD_VOICE } from '../lib/speech'
import { useStore } from '../lib/store'
import { Btn, Frame, shuffle } from '../ui'
import { Pix } from '../pixel/Pix'
import {
  Combo,
  Key,
  PlayButton,
  cheer,
  reducedMotion,
  replay,
  useKeys,
  useSpeaker,
} from './fx'
import type { NumberItem, NumberKind } from '../data/numbers'

// Numbers by ear: hear a price, a time, a phone number or a big number,
// and type it in digits. The answer is then taken apart: each number with
// its pinyin and what it adds up to, a clock for a time. They are dealt
// like a shuffled deck, so none comes again until all have been heard.

const KINDS: Array<{
  id: NumberKind
  title: string
  sprite: string
  hint: string
  example: string
}> = [
  {
    id: 'price',
    title: 'Prices',
    sprite: 'coin',
    hint: 'Type the price: 12 or 12.5. 十二块五 and 十二块五毛 are both 12.5: 毛 is a tenth of a kuai, often left unsaid.',
    example: '十二块五',
  },
  {
    id: 'time',
    title: 'Times',
    sprite: 'clock',
    hint: 'Type the time: 3:30, or just 330 – the colon puts itself in. 点 is o’clock, 半 half past, 一刻 a quarter, 分 minutes. Stations use the 24-hour clock: 十四点 is 14:00.',
    example: '三点半',
  },
  {
    id: 'phone',
    title: 'Phone numbers',
    sprite: 'phone',
    hint: 'Type all eleven digits. In numbers read out, 1 is yāo, not yī.',
    example: '幺三八',
  },
  {
    id: 'big',
    title: 'Big numbers',
    sprite: 'abacus',
    hint: 'Type the number. 百 hundred, 千 thousand, 万 ten thousand; 零 fills a gap.',
    example: '两万三千',
  },
]

// A comma before one or two last digits is a decimal comma, as on a
// Norwegian keypad (22,1 is 22.1); other commas group thousands
const clean = (s: string) =>
  s
    .replace(/\s/g, '')
    .replace(/[,，](\d{1,2})$/, '.$1')
    .replace(/[,，]/g, '')
    .replace('：', ':')
    .replace(/^(\d{1,2})[.](\d{2})$/, '$1:$2')

// A time as it is typed, for a phone's keypad, which has no colon: its
// comma or point is one, and digits alone take one before the last two
// (330 is 3:30, and a fourth digit moves it: 1230 is 12:30)
const asTime = (typed: string) => {
  const s = typed.replace(/[.,，：]/g, ':')
  const m = s.match(/^(\d*):?(\d*)$/)
  if (!m || (s.includes(':') && m[2].length <= 2)) return s
  const digits = m[1] + m[2]
  return digits.length >= 3
    ? `${digits.slice(0, -2)}:${digits.slice(-2)}`
    : digits
}

const NUMERAL = /^[零一二两三四五六七八九十百千万]+$/

export default function Numbers() {
  const [kind, setKind] = useState<NumberKind | null>(null)
  const { bank } = useStore()
  if (kind) return <Drill kind={kind} onExit={() => setKind(null)} />
  return (
    <Frame title="Numbers" zh="数字">
      <p className="mb-5 text-[var(--ink-2)]">
        Chinese numbers are logical: 十一 is ten-one, 二十 two-ten, 三百
        three-hundred. Hearing them at speed is the hard part.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.map((k, i) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className="zh-card fx-rise group flex items-center gap-4 p-5 text-left transition hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Pix
              name={k.sprite}
              size={56}
              className="transition group-hover:scale-110 group-hover:-rotate-6"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-black">{k.title}</span>
              <span className="zh block text-xl text-[var(--red)]">
                {k.example}
              </span>
              {bank.best[`numbers-${k.id}`] ? (
                <span className="text-xs font-bold text-[var(--gold)]">
                  Best streak {bank.best[`numbers-${k.id}`]}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </Frame>
  )
}

function Drill({ kind, onExit }: { kind: NumberKind; onExit: () => void }) {
  const { record, levelOf, points, setBest } = useStore()
  const items = NUMBER_ITEMS.filter((x) => x.kind === kind)
  const deck = useRef<Array<NumberItem>>([])
  const deal = (last?: NumberItem) => {
    if (!deck.current.length)
      deck.current = shuffle(items.filter((x) => x !== last))
    return deck.current.pop()!
  }
  const [q, setQ] = useState<NumberItem>(() => deal())
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ ok: boolean; t: number } | null>(null)
  const [streak, setStreak] = useState(0)
  const [total, setTotal] = useState({ right: 0, n: 0 })
  const [leaving, setLeaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const { speaking, play } = useSpeaker()
  const info = KINDS.find((k) => k.id === kind)!
  const hear = () => void play(q.say, WORD_VOICE)

  useEffect(() => {
    hear()
    input.current?.focus()
  }, [q])

  const check = () => {
    if (result !== null || !text.trim()) return
    const ok = clean(text) === clean(q.answer)
    setResult({ ok, t: Date.now() })
    blip(ok ? 'right' : 'wrong')
    if (ok) cheer(box.current, '+1')
    else replay(box.current, 'fx-shake')
    setTotal((t) => ({ right: t.right + (ok ? 1 : 0), n: t.n + 1 }))
    const s = ok ? streak + 1 : 0
    setStreak(s)
    setBest(`numbers-${kind}`, s)
    if (ok) points(1)
    // the number words in it that have been met
    for (const c of new Set([...q.zh]))
      if (WORD[c] && levelOf(c) > 0) record(c, ok, 0.3, 'sm')
  }

  const next = () => {
    if (result === null || leaving) return
    const go = () => {
      setLeaving(false)
      setText('')
      setResult(null)
      setQ(deal(q))
    }
    if (reducedMotion()) return go()
    setLeaving(true)
    setTimeout(go, 190)
  }

  useKeys((key) => {
    if (key === ' ') {
      hear()
      return true
    }
    if (key === 'Enter' && result && Date.now() - result.t > 150) {
      next()
      return true
    }
    if (key === 'Escape') {
      onExit()
      return true
    }
  })

  return (
    <Frame
      title={info.title}
      zh="数字"
      right={
        <span className="flex items-center gap-2 text-sm font-bold">
          <Combo n={streak} />
          <span className="tabular-nums">
            {total.right}/{total.n}
          </span>
        </span>
      }
    >
      <div
        key={q.say}
        className={`zh-card p-6 text-center ${leaving ? 'fx-leave' : 'fx-enter'}`}
      >
        <PlayButton onClick={hear} speaking={speaking} />
        <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--ink-2)]">
          {info.hint}
        </p>
        <form
          className="mx-auto mt-5 flex max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            check()
          }}
        >
          <div
            ref={box}
            className={`relative min-w-0 flex-1 rounded-2xl border-2 bg-white transition ${result === null ? 'border-[var(--paper-2)] focus-within:border-[var(--jade)]' : result.ok ? 'border-[var(--jade)] bg-[#e3f0ea]' : 'border-[var(--red)] bg-[#f8e1dc]'}`}
          >
            {kind === 'price' && (
              <span className="absolute top-1/2 left-4 -translate-y-1/2 text-2xl font-bold text-[var(--ink-2)]">
                ¥
              </span>
            )}
            <input
              ref={input}
              value={text}
              onChange={(e) =>
                setText(
                  kind === 'time' ? asTime(e.target.value) : e.target.value,
                )
              }
              onKeyDown={(e) => {
                // Space hears it again, even while typing
                if (e.key === ' ') {
                  e.preventDefault()
                  hear()
                }
              }}
              disabled={result !== null}
              inputMode={
                kind === 'time' || kind === 'price' ? 'decimal' : 'numeric'
              }
              autoComplete="off"
              enterKeyHint="done"
              aria-label="Your answer"
              placeholder={
                {
                  price: '12.5',
                  time: '3:30',
                  phone: '13800138000',
                  big: '23000',
                }[kind]
              }
              className={`w-full rounded-2xl bg-transparent px-4 py-3 text-center text-3xl font-bold tabular-nums outline-none placeholder:text-[var(--paper-2)] ${kind === 'phone' ? 'tracking-wider' : ''}`}
            />
          </div>
          <Btn
            type="submit"
            kind="jade"
            disabled={result !== null}
            className="px-5"
          >
            Check
          </Btn>
        </form>
        {result === null && (
          <p className="mt-2 text-xs text-[var(--ink-2)] max-sm:hidden">
            <Key k="Enter" /> to check, <Key k="Space" /> to hear it again
          </p>
        )}
        {result !== null && (
          <div className="fx-rise mt-5">
            <p
              className={`text-2xl font-black ${result.ok ? 'text-[var(--jade)]' : 'text-[var(--red)]'}`}
            >
              {result.ok ? 'Right' : `It was ${q.answer}`}
            </p>
            <Breakdown q={q} />
            <Btn onClick={next} className="mt-5 px-6 py-3">
              Next{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          </div>
        )}
      </div>
      <Btn kind="ghost" onClick={onExit} className="mt-4">
        <ArrowLeft size={16} /> Numbers
      </Btn>
    </Frame>
  )
}

// Each unit as a word of its own: shí'èr kuài wǔ
const UNIT: Record<string, { p: string; m: string } | undefined> = {
  点: { p: 'diǎn', m: 'o’clock' },
  半: { p: 'bàn', m: 'half past' },
  刻: { p: 'kè', m: 'quarter hour' },
  分: { p: 'fēn', m: 'minutes' },
  块: { p: 'kuài', m: 'yuan' },
  毛: { p: 'máo', m: 'tenths' },
}
// The units a number counts, as 一 does in 一刻 and 一毛 (not 一点, one
// o'clock, read yī)
const COUNTED = new Set(['刻', '块', '毛'])

// A big number's terms: 两万三千 → 两万, 三千
function terms(run: string): Array<string> {
  const out: Array<string> = []
  let cur = ''
  for (const c of run) {
    cur += c
    if ('十百千万零'.includes(c)) {
      out.push(cur)
      cur = ''
    }
  }
  if (cur) out.push(cur)
  return out
}

function Breakdown({ q }: { q: NumberItem }) {
  const runs = q.zh
    .split(' ')
    .flatMap((part) => part.match(/[零一二两三四五六七八九十百千万]+|./g) ?? [])
  const chips: Array<{ h: string; p: string; m: string }> = []
  runs.forEach((run, i) => {
    if (!NUMERAL.test(run)) {
      const u = UNIT[run]
      chips.push({ h: run, p: u?.p ?? WORD[run]?.p ?? '', m: u?.m ?? '' })
      return
    }
    if (q.kind === 'phone') {
      chips.push({
        h: run,
        p: join(numberPinyin(run)),
        m: [...run].map((c) => value(c)).join(''),
      })
      return
    }
    const parts = q.kind === 'big' ? terms(run) : [run]
    for (const part of parts) {
      const v = value(part)
      // a price's jiao, after 块: five tenths
      const jiao = q.kind === 'price' && runs[i - 1] === '块'
      chips.push({
        h: part,
        // 一 counting a measure word changes its tone: yí kè, yì máo
        p:
          part === '一' && COUNTED.has(runs[i + 1])
            ? sandhi('一', 'yī', toneOf(UNIT[runs[i + 1]]!.p))
            : join(numberPinyin(part)),
        m: part === '零' ? 'a gap' : jiao ? `0.${v}` : v.toLocaleString('en'),
      })
    }
  })
  return (
    <div className="mt-3">
      {q.kind === 'time' && <Clock answer={q.answer} />}
      <div className="mt-2 flex flex-wrap items-stretch justify-center gap-1.5">
        {chips.map((c, i) => (
          <div
            key={i}
            className="fx-pop flex min-w-[3.5rem] flex-col items-center rounded-xl bg-[var(--paper)] px-2.5 py-1.5"
            style={{ animationDelay: `${120 + i * 70}ms` }}
          >
            <span className="text-xs text-[var(--jade)]">{c.p}</span>
            <span className="zh text-3xl leading-tight">{c.h}</span>
            <span className="text-xs font-bold text-[var(--ink-2)]">{c.m}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// A clock whose hands sweep round from twelve to the time
function Clock({ answer }: { answer: string }) {
  const [h, m] = answer.split(':').map(Number)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const hour = shown ? ((h % 12) + m / 60) * 30 : 0
  const minute = shown ? m * 6 + (h % 12) * 360 : 0
  const hand = 'transform 1.1s cubic-bezier(0.3, 1.2, 0.5, 1)'
  return (
    <svg
      viewBox="-50 -50 100 100"
      className="mx-auto h-28 w-28 drop-shadow-sm"
      role="img"
      aria-label={`A clock at ${answer}`}
    >
      <circle r="47" fill="#fffaf1" stroke="var(--ink)" strokeWidth="3" />
      <circle r="42" fill="none" stroke="var(--paper-2)" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="0"
          y1={i % 3 ? -38 : -35}
          x2="0"
          y2="-42"
          stroke={i % 3 ? 'var(--ink-2)' : 'var(--red)'}
          strokeWidth={i % 3 ? 1.5 : 3}
          strokeLinecap="round"
          transform={`rotate(${i * 30})`}
        />
      ))}
      <line
        x1="0"
        y1="5"
        x2="0"
        y2="-22"
        stroke="var(--ink)"
        strokeWidth="4.5"
        strokeLinecap="round"
        style={{ transform: `rotate(${hour}deg)`, transition: hand }}
      />
      <line
        x1="0"
        y1="7"
        x2="0"
        y2="-34"
        stroke="var(--red)"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ transform: `rotate(${minute}deg)`, transition: hand }}
      />
      <circle r="3.5" fill="var(--ink)" />
    </svg>
  )
}
