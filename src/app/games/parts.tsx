import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Volume2 } from 'lucide-react'
import { BUILT, PART_MEANING, PICTURES, RADICALS, family } from '../data/parts'
import { blip } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, sample, shuffle } from '../ui'
import { Pix } from '../pixel/Pix'
import {
  Combo,
  Key,
  cheer,
  reducedMotion,
  replay,
  useKeys,
  useSpeaker,
} from './fx'
import type { Built, Picture } from '../data/parts'

// Character parts: pictures first (山 is a mountain), then building
// characters from a part for the meaning and a part for the sound. A
// picture fades back as its character is inked over it; two parts slide
// together into the character they make.

type Mode = 'menu' | 'pictures' | 'build'

const radical = (p: string) => RADICALS.find((r) => r.part === p)
const partMeaning = (p: string) => radical(p)?.meaning ?? PART_MEANING[p] ?? ''

export default function Parts() {
  const [mode, setMode] = useState<Mode>('menu')
  if (mode === 'pictures') return <Pictures onExit={() => setMode('menu')} />
  if (mode === 'build') return <Build onExit={() => setMode('menu')} />
  return (
    <Frame title="Character parts" zh="部首">
      <p className="mb-5 text-[var(--ink-2)]">
        Hanzi are not random. The oldest are pictures. Most of the rest put a
        part that hints at the meaning beside a part that hints at the sound: 妈
        mā, mum, is 女 woman with 马 mǎ, horse – for the sound.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode('pictures')}
          className="zh-card fx-rise group p-5 text-left transition hover:-translate-y-0.5"
        >
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="fx-loop-pic absolute">
              <Pix name="mountain" size={56} />
            </span>
            <span className="fx-loop-char zh absolute text-5xl text-[var(--ink)]">
              山
            </span>
          </div>
          <div className="mt-2 text-lg font-black">Pictures</div>
          <p className="text-sm text-[var(--ink-2)]">
            Characters that began as drawings. Match them to what they show.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode('build')}
          className="zh-card fx-rise group p-5 text-left transition hover:-translate-y-0.5"
          style={{ animationDelay: '70ms' }}
        >
          <div className="relative flex h-16 w-28 items-center justify-center">
            <span
              className="fx-loop-a zh absolute text-4xl"
              style={{ transform: 'translateX(-1.6rem)' }}
            >
              女
            </span>
            <span
              className="fx-loop-b zh absolute text-4xl text-[var(--jade)]"
              style={{ transform: 'translateX(1.6rem)' }}
            >
              马
            </span>
            <span className="fx-loop-ab zh absolute text-5xl text-[var(--red)]">
              妈
            </span>
          </div>
          <div className="mt-2 text-lg font-black">Build</div>
          <p className="text-sm text-[var(--ink-2)]">
            Make a character from its meaning and its sound.
          </p>
        </button>
      </div>
      <h2 className="mt-8 mb-2 font-black">The radicals in these games</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {RADICALS.map((r, i) => (
          <div
            key={r.part}
            className="zh-card fx-pop p-2 text-center"
            style={{ animationDelay: `${120 + i * 25}ms` }}
          >
            <div className="zh text-3xl">{r.part}</div>
            <div className="text-xs text-[var(--ink-2)]">
              {r.meaning}
              {r.from && <span className="zh"> ({r.from})</span>}
            </div>
          </div>
        ))}
      </div>
    </Frame>
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
    <span className="flex items-center gap-2 text-sm font-bold">
      <Combo n={streak} />
      <span className="tabular-nums">
        {right}/{total}
      </span>
    </span>
  )
}

function Pictures({ onExit }: { onExit: () => void }) {
  const { points, setBest } = useStore()
  const { play } = useSpeaker()
  const [q, setQ] = useState<Picture>(() => sample(PICTURES))
  const [reverse, setReverse] = useState(false)
  const [picked, setPicked] = useState<{ c: string; t: number } | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 })
  const [leaving, setLeaving] = useState(false)
  const buttons = useRef(new Map<string, HTMLButtonElement | null>())
  const choices = useMemo(
    () => shuffle([q, ...shuffle(PICTURES.filter((p) => p !== q)).slice(0, 3)]),
    [q],
  )
  const answer = (p: Picture) => {
    if (picked) return
    setPicked({ c: p.c, t: Date.now() })
    const right = p === q
    blip(right ? 'right' : 'wrong')
    if (right) cheer(buttons.current.get(p.c), '+1')
    void play(q.c)
    setScore((s) => {
      const n = {
        right: s.right + (right ? 1 : 0),
        total: s.total + 1,
        streak: right ? s.streak + 1 : 0,
      }
      setBest('parts-pictures', n.right)
      return n
    })
    if (right) points(1)
  }
  const next = () => {
    if (!picked || leaving) return
    const go = () => {
      setLeaving(false)
      setPicked(null)
      setReverse(Math.random() < 0.5)
      setQ(sample(PICTURES.filter((p) => p !== q)))
    }
    if (reducedMotion()) return go()
    setLeaving(true)
    setTimeout(go, 190)
  }
  useKeys((key) => {
    if (key === 'Escape') {
      onExit()
      return true
    }
    if (picked) {
      if (key === ' ') {
        void play(q.c)
        return true
      }
      if (key !== 'Enter' || Date.now() - picked.t < 150) return
      next()
      return true
    }
    if (!/^[1-4]$/.test(key)) return
    answer(choices[Number(key) - 1])
    return true
  })
  return (
    <Frame title="Pictures" zh="象形" right={<Score {...score} />}>
      <div
        key={q.c + String(reverse)}
        className={`zh-card flex flex-col p-6 text-center max-sm:min-h-[calc(100dvh-10.5rem)] ${leaving ? 'fx-leave' : 'fx-enter'}`}
      >
        <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
          {reverse ? 'Which picture is it?' : 'Which character is it?'}
        </p>
        <div className="relative mx-auto mt-4 flex h-32 w-32 items-center justify-center rounded-3xl bg-[var(--paper)] shadow-[inset_0_2px_6px_rgba(34,28,24,0.08)]">
          {reverse ? (
            picked ? (
              <>
                <span className="zh fx-fade-back absolute text-8xl">{q.c}</span>
                <span className="fx-ink-in absolute">
                  <Pix name={q.sprite} size={104} />
                </span>
              </>
            ) : (
              <span className="zh text-8xl">{q.c}</span>
            )
          ) : (
            <>
              <span className={`absolute ${picked ? 'fx-fade-back' : ''}`}>
                <Pix name={q.sprite} size={112} />
              </span>
              {picked && (
                <span className="zh fx-ink-in absolute text-8xl text-[var(--ink)]">
                  {q.c}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex-1" />
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {choices.map((c, i) => {
            const mine = picked?.c === c.c
            const look = !picked
              ? 'border-[var(--paper-2)] bg-[var(--paper)] shadow-[0_3px_0_var(--paper-2)] hover:-translate-y-0.5 hover:border-[var(--gold)]'
              : c === q
                ? `border-[var(--jade)] bg-[#e3f0ea] ${mine ? 'fx-pulse' : 'fx-beacon'}`
                : mine
                  ? 'fx-shake border-[var(--red)] bg-[#f8e1dc]'
                  : 'border-transparent bg-[var(--paper)] opacity-50'
            return (
              <button
                key={c.c}
                ref={(el) => {
                  buttons.current.set(c.c, el)
                }}
                type="button"
                disabled={!!picked}
                onClick={() => answer(c)}
                className={`relative flex min-h-[5.5rem] items-center justify-center rounded-2xl border-2 p-3 transition duration-150 ${look}`}
              >
                <Key k={String(i + 1)} className="absolute top-1.5 left-1.5" />
                {reverse ? (
                  <Pix name={c.sprite} size={56} />
                ) : (
                  <span className="zh text-5xl">{c.c}</span>
                )}
              </button>
            )
          })}
        </div>
        {picked && (
          <div className="fx-rise mt-5">
            <p className="text-lg">
              <span className="zh text-3xl">{q.c}</span> {q.p} – {q.m}
            </p>
            <Btn onClick={next} className="mt-3">
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
        <ArrowLeft size={16} /> Parts
      </Btn>
    </Frame>
  )
}

function Build({ onExit }: { onExit: () => void }) {
  const { points, setBest } = useStore()
  const { speaking, play } = useSpeaker()
  const [q, setQ] = useState<Built>(() => sample(BUILT))
  const [a, setA] = useState<string | null>(null)
  const [b, setB] = useState<string | null>(null)
  const [done, setDone] = useState<null | { ok: boolean; t: number }>(null)
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 })
  const [leaving, setLeaving] = useState(false)
  const result = useRef<HTMLDivElement>(null)

  const left = useMemo(
    () =>
      shuffle([
        q.parts[0],
        ...shuffle(
          [
            ...new Set([
              ...RADICALS.map((r) => r.part),
              ...BUILT.map((x) => x.parts[0]),
            ]),
          ].filter((p) => p !== q.parts[0]),
        ).slice(0, 3),
      ]),
    [q],
  )
  const right = useMemo(
    () =>
      shuffle([
        q.parts[1],
        ...shuffle(
          [...new Set(BUILT.map((x) => x.parts[1]))].filter(
            (p) => p !== q.parts[1],
          ),
        ).slice(0, 3),
      ]),
    [q],
  )

  useEffect(() => {
    void play(q.c)
  }, [q])

  useEffect(() => {
    if (!a || !b || done !== null) return
    const ok = a === q.parts[0] && b === q.parts[1]
    setDone({ ok, t: Date.now() })
    blip(ok ? 'right' : 'wrong')
    setScore((s) => {
      const n = {
        right: s.right + (ok ? 1 : 0),
        total: s.total + 1,
        streak: ok ? s.streak + 1 : 0,
      }
      setBest('parts', n.right)
      return n
    })
    if (ok) points(2)
  }, [a, b, q, done, points, setBest])

  // once the parts have come together
  useEffect(() => {
    if (!done) return
    const id = setTimeout(
      () => {
        if (done.ok) cheer(result.current, '+2')
        else replay(result.current, 'fx-shake')
      },
      reducedMotion() ? 0 : 520,
    )
    return () => clearTimeout(id)
  }, [done])

  const next = () => {
    if (!done || leaving) return
    const go = () => {
      setLeaving(false)
      setA(null)
      setB(null)
      setDone(null)
      setQ(sample(BUILT.filter((x) => x !== q)))
    }
    if (reducedMotion()) return go()
    setLeaving(true)
    setTimeout(go, 190)
  }

  useKeys((key) => {
    if (key === ' ') {
      void play(q.c)
      return true
    }
    if (key === 'Escape') {
      onExit()
      return true
    }
    if (done) {
      if (key !== 'Enter' || Date.now() - done.t < 150) return
      next()
      return true
    }
    const n = Number(key)
    if (n >= 1 && n <= 4) {
      setA(left[n - 1])
      return true
    }
    if (n >= 5 && n <= 8) {
      setB(right[n - 5])
      return true
    }
  })

  const fam = q.sound ? family(q.parts[1]).filter((x) => x !== q) : []

  return (
    <Frame title="Build" zh="造字" right={<Score {...score} />}>
      <div
        key={q.c}
        className={`zh-card p-6 text-center ${leaving ? 'fx-leave' : 'fx-enter'}`}
      >
        <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
          Build the character for
        </p>
        <p className="mt-1 text-3xl font-black">
          {q.m}{' '}
          <button
            type="button"
            onClick={() => void play(q.c)}
            aria-label="Hear it"
            className={`inline-flex rounded-full p-1 align-middle text-[var(--jade)] hover:bg-[var(--paper-2)] ${speaking ? 'fx-bump' : ''}`}
          >
            <Volume2 size={22} />
          </button>
        </p>
        <p className="text-xl text-[var(--jade)]">{q.p}</p>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          {q.idea
            ? 'Two parts, two meanings that make the whole.'
            : 'A part for the meaning, a part for the sound.'}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <PartPicker
            label={q.idea ? 'First part' : 'Meaning'}
            parts={left}
            value={a}
            onPick={setA}
            locked={done !== null}
            want={done === null ? null : q.parts[0]}
            keys="1234"
          />
          <PartPicker
            label={q.idea ? 'Second part' : 'Sound'}
            parts={right}
            value={b}
            onPick={setB}
            locked={done !== null}
            want={done === null ? null : q.parts[1]}
            showSound
            keys="5678"
          />
        </div>

        {done !== null && a && b && (
          <div className="mt-6">
            <div
              ref={result}
              className="relative mx-auto flex h-28 w-40 items-center justify-center"
            >
              <span className="fx-join-a zh absolute text-6xl">{a}</span>
              <span className="fx-join-b zh absolute text-6xl text-[var(--jade)]">
                {b}
              </span>
              <span
                className="fx-pop zh absolute text-8xl"
                style={{
                  color: done.ok ? 'var(--jade)' : 'var(--ink)',
                  animationDelay: reducedMotion() ? '0ms' : '420ms',
                }}
              >
                {q.c}
              </span>
            </div>
            <div className="fx-rise" style={{ animationDelay: '500ms' }}>
              <p className="mt-2">
                <span className="zh text-2xl">{q.parts[0]}</span>{' '}
                {partMeaning(q.parts[0])} +{' '}
                <span className="zh text-2xl">{q.parts[1]}</span>{' '}
                {q.sound ? (
                  <>
                    {q.sound} ({PART_MEANING[q.parts[1]] ?? '…'}, for the sound)
                  </>
                ) : (
                  partMeaning(q.parts[1])
                )}
                {q.idea && (
                  <span className="block text-[var(--ink-2)]">– {q.idea}</span>
                )}
              </p>
              {fam.length > 0 && (
                <p className="mt-2 text-sm text-[var(--ink-2)]">
                  Same sound part:{' '}
                  {fam.map((f) => (
                    <span key={f.c} className="mx-1 whitespace-nowrap">
                      <span className="zh text-xl text-[var(--ink)]">
                        {f.c}
                      </span>{' '}
                      {f.p} {f.m}
                    </span>
                  ))}
                </p>
              )}
              <Btn onClick={next} className="mt-4">
                Next{' '}
                <Key
                  k="Enter"
                  className="ml-1 border-white/30 bg-white/15 text-white"
                />
              </Btn>
            </div>
          </div>
        )}
      </div>
      <Btn kind="ghost" onClick={onExit} className="mt-4">
        <ArrowLeft size={16} /> Parts
      </Btn>
    </Frame>
  )
}

function PartPicker({
  label,
  parts,
  value,
  onPick,
  locked,
  want,
  showSound,
  keys,
}: {
  label: string
  parts: Array<string>
  value: string | null
  onPick: (p: string) => void
  locked: boolean
  want: string | null
  showSound?: boolean
  keys: string
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-[var(--ink-2)] uppercase">
        {label}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {parts.map((p, i) => {
          const sound = showSound
            ? BUILT.find((x) => x.parts[1] === p)?.sound
            : undefined
          const state = want
            ? p === want
              ? 'border-[var(--jade)] bg-[#e3f0ea]'
              : p === value
                ? 'border-[var(--red)] bg-[#f8e1dc]'
                : 'border-transparent opacity-40'
            : p === value
              ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
              : 'border-[var(--paper-2)] hover:border-[var(--gold)]'
          return (
            <button
              key={p}
              type="button"
              disabled={locked}
              onClick={() => onPick(p)}
              className={`relative rounded-xl border-2 bg-[var(--paper)] px-2 pt-3.5 pb-2 transition ${state}`}
            >
              <Key k={keys[i]} className="absolute top-1 left-1 scale-90" />
              <div className="zh text-3xl">{p}</div>
              <div className="text-[10px] leading-tight opacity-80">
                {sound ?? partMeaning(p)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
