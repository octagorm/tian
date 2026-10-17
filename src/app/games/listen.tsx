import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { SCENES } from '../data/trip'
import { WORD } from '../data/words'
import { english, plain, tokens } from '../lib/text'
import { blip } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Mixed, shuffle, tokenLevel } from '../ui'
import { Face } from '../pixel/Pix'
import { Backdrop } from '../pixel/Backdrop'
import { hasScene } from '../pixel/scenes'
import {
  Combo,
  Key,
  PlayButton,
  cheer,
  reducedMotion,
  useKeys,
  useSpeaker,
} from './fx'
import type { Look } from '../pixel/Pix'

// Listening: a line from the trip, spoken by whoever says it there; pick
// what it means from four. Lines from scenes already played come first,
// so the words are ones you have met. The scene of the trip it comes from
// is shown behind the one who says it.

interface Heard {
  zh: string
  en: string
  voice: string
  scene: string
  who: string
  look: Look
}

const HEARD: Array<Heard> = SCENES.flatMap((s) =>
  s.steps.flatMap((step) =>
    step.kind === 'line'
      ? [
          {
            zh: step.zh,
            en: step.en,
            voice: s.cast[step.by].voice,
            scene: s.id,
            who: s.cast[step.by].name,
            look: s.cast[step.by].look,
          },
        ]
      : [],
  ),
)

// Who says it: their portrait, with sound bars while they speak
function Speaker({
  q,
  speaking,
  light = false,
}: {
  q: Heard
  speaking: boolean
  light?: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Face
          look={q.look}
          size={light ? 72 : 84}
          className={`rounded-2xl border-2 border-[var(--ink)] bg-[#f3d9a4] shadow-lg transition-transform ${speaking ? 'scale-105' : ''}`}
        />
        {speaking && (
          <span
            className="absolute -top-2 -right-3 flex items-end gap-0.5"
            aria-hidden="true"
          >
            {[0, 1, 2].map((k) => (
              <span
                key={k}
                className={`fx-bump inline-block w-1 rounded-full ${light ? 'bg-[#f2c14e]' : 'bg-[var(--jade)]'}`}
                style={{
                  height: 6 + k * 4,
                  animationIterationCount: 'infinite',
                  animationDuration: '0.6s',
                  animationDelay: `${k * 0.12}s`,
                }}
              />
            ))}
          </span>
        )}
      </div>
      <span
        className={`mt-1.5 rounded-md px-1.5 text-xs font-bold ${light ? 'bg-black/45 text-white' : 'text-[var(--ink-2)]'}`}
      >
        {q.who}
      </span>
    </div>
  )
}

export default function Listen() {
  const { bank, settings, levelOf, record, points, setBest } = useStore()
  const vars = { home: settings.home }
  const homeName = WORD[settings.home]?.g ?? settings.home
  const pool = useMemo(() => {
    const played = HEARD.filter((h) => bank.scenes[h.scene])
    return shuffle(played.length >= 8 ? played : HEARD.slice(0, 30))
    // the pool for this sitting
  }, [])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<{ en: string; t: number } | null>(null)
  const [score, setScore] = useState({ right: 0, n: 0, streak: 0 })
  const [leaving, setLeaving] = useState(false)
  const buttons = useRef(new Map<string, HTMLButtonElement | null>())
  const { speaking, play } = useSpeaker()
  const q = pool[i % pool.length]
  const choices = useMemo(
    () =>
      shuffle([
        q.en,
        ...shuffle(
          [...new Set(HEARD.map((h) => h.en))].filter((en) => en !== q.en),
        ).slice(0, 3),
      ]),
    [q],
  )
  const hear = () => void play(plain(q.zh, vars), q.voice)

  useEffect(() => {
    hear()
  }, [q])

  const answer = (en: string) => {
    if (picked) return
    setPicked({ en, t: Date.now() })
    const ok = en === q.en
    blip(ok ? 'right' : 'wrong')
    if (ok) cheer(buttons.current.get(en), '+1')
    const ids = tokens(q.zh, vars)
      .filter((t) => !t.punct && tokenLevel(t, levelOf) > 0)
      .flatMap((t) => (t.id ? [t.id] : []))
    for (const id of ids) record(id, ok, 0.3)
    if (ok) points(1)
    setScore((s) => {
      const n = {
        right: s.right + (ok ? 1 : 0),
        n: s.n + 1,
        streak: ok ? s.streak + 1 : 0,
      }
      setBest('listen', n.streak)
      return n
    })
  }
  const next = () => {
    if (!picked || leaving) return
    const go = () => {
      setLeaving(false)
      setPicked(null)
      setI((x) => x + 1)
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
    if (picked) {
      if (key !== 'Enter' || Date.now() - picked.t < 150) return
      next()
      return true
    }
    if (!/^[1-4]$/.test(key)) return
    answer(choices[Number(key) - 1])
    return true
  })

  return (
    <Frame
      title="Listening"
      zh="听"
      right={
        <span className="flex items-center gap-2 text-sm font-bold">
          <Combo n={score.streak} />
          <span className="tabular-nums">
            {score.right}/{score.n}
          </span>
        </span>
      }
    >
      <div
        key={i}
        className={`zh-card flex flex-col p-5 sm:p-7 max-sm:min-h-[calc(100dvh-7.5rem)] ${leaving ? 'fx-leave' : 'fx-enter'}`}
      >
        {hasScene(q.scene) ? (
          // where it is said: the scene of the trip, the speaker in front
          <Backdrop
            id={q.scene}
            crop={176}
            className="-mx-5 -mt-5 mb-5 rounded-t-[1.25rem] sm:-mx-7 sm:-mt-7"
          >
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/45 via-transparent to-black/25 p-4">
              <p className="absolute top-3 left-4 text-xs font-black tracking-[0.18em] text-white/90 uppercase [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">
                What do they say?
              </p>
              <Speaker q={q} speaking={speaking} light />
              <PlayButton onClick={hear} speaking={speaking} hint={false} />
            </div>
          </Backdrop>
        ) : (
          <>
            <p className="text-center text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
              What do they say?
            </p>
            <div className="flex flex-1 items-center justify-center gap-5 py-5">
              <Speaker q={q} speaking={speaking} />
              <PlayButton onClick={hear} speaking={speaking} />
            </div>
          </>
        )}
        <div className="flex-1" />
        <div className="grid gap-2.5">
          {choices.map((c, k) => {
            const isRight = c === q.en
            const mine = picked?.en === c
            const look = !picked
              ? 'border-[var(--paper-2)] bg-[var(--paper)] shadow-[0_3px_0_var(--paper-2)] hover:-translate-y-0.5 hover:border-[var(--gold)] active:translate-y-0.5 active:shadow-none'
              : isRight
                ? `border-[var(--jade)] bg-[#e3f0ea] ${mine ? 'fx-pulse' : 'fx-beacon'}`
                : mine
                  ? 'fx-shake border-[var(--red)] bg-[#f8e1dc]'
                  : 'border-transparent bg-[var(--paper)] opacity-45'
            return (
              <button
                key={c}
                ref={(el) => {
                  buttons.current.set(c, el)
                }}
                type="button"
                disabled={!!picked}
                onClick={() => answer(c)}
                className={`relative flex min-h-[3.5rem] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition duration-150 ${look}`}
              >
                <Key k={String(k + 1)} />
                <span className="flex-1 font-semibold">
                  {english(c, homeName)}
                </span>
                {mine && !isRight && (
                  <X size={18} strokeWidth={3} className="text-[var(--red)]" />
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex min-h-[4.5rem] items-center gap-3 border-t border-dashed border-[var(--paper-2)] pt-3">
          {picked ? (
            <>
              <div className="fx-rise min-w-0 flex-1">
                <Mixed line={q.zh} />
              </div>
              <Btn onClick={next} className="shrink-0 px-5 py-3">
                Next{' '}
                <Key
                  k="Enter"
                  className="ml-1 border-white/30 bg-white/15 text-white"
                />
              </Btn>
            </>
          ) : (
            <p className="w-full text-center text-xs text-[var(--ink-2)] max-sm:hidden">
              <Key k="1" />–<Key k="4" /> to choose, <Key k="Space" /> to hear
              it again
            </p>
          )}
        </div>
      </div>
    </Frame>
  )
}
