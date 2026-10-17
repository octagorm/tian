import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { WORDS } from '../data/words'
import { join, matches, syllables } from '../lib/pinyin'
import { say } from '../lib/audio'
import { useStore } from '../lib/store'
import { Ruby, shuffle } from '../ui'
import { distractors } from '../quiz'
import type { Word } from '../data/words'

// One question of the fight: what a word means, which word was said, or
// its pinyin typed (from the character, or from the sound alone). Keys:
// 1–4 pick an answer, the arrows and Enter too, Enter strikes a typed
// answer, and Space plays the sound again.

export type AskKind = 'meaning' | 'listen' | 'type' | 'dictation'

export interface Question {
  title: string
  w: Word
  kind: AskKind
  seconds: number | null
  // The wind: no pinyin over the character
  noHints?: boolean
  // The fan: the answers blow about once
  fan?: boolean
  // The false Monkey King: wrong answers that share characters
  mirror?: boolean
  danger?: boolean
}

// Wrong answers that look like the right one: words that share a
// character with it, then words as long
function lookalikes(w: Word): Array<Word> {
  const chars = new Set(w.h)
  const sharing = WORDS.filter(
    (x) => x.id !== w.id && x.g !== w.g && [...x.h].some((c) => chars.has(c)),
  )
  const same = WORDS.filter(
    (x) => x.id !== w.id && x.h.length === w.h.length && !sharing.includes(x),
  )
  return shuffle([w, ...[...shuffle(sharing), ...shuffle(same)].slice(0, 3)])
}

export function Ask({
  q,
  onAnswer,
  onGust,
}: {
  q: Question
  onAnswer: (right: boolean, ms: number) => void
  onGust?: () => void
}) {
  const { levelOf, settings, bank } = useStore()
  const { w, kind } = q
  const typed = kind === 'type' || kind === 'dictation'
  const heard = kind === 'listen' || kind === 'dictation'
  const pool = useMemo(() => {
    const met = WORDS.filter((x) => bank.cards[x.id])
    return met.length >= 8 ? met : WORDS.slice(0, 40)
    // the pool for wrong answers, once
  }, [])
  const [choices, setChoices] = useState(() =>
    q.mirror ? lookalikes(w) : distractors(w, pool),
  )
  const [answered, setAnswered] = useState<string | null>(null)
  const [left, setLeft] = useState(q.seconds ?? 0)
  const [text, setText] = useState('')
  const [focus, setFocus] = useState(-1)
  const t0 = useRef(performance.now())
  // Answered already (a ref, for the timer that outlives the first render)
  const done = useRef(false)
  const showPinyin = !q.noHints && levelOf(w.id) < 2

  const finish = (right: boolean, picked = '') => {
    if (done.current) return
    done.current = true
    setAnswered(picked || (right ? w.id : '×'))
    const ms = performance.now() - t0.current
    if (!heard || !right) void say(w.h)
    onAnswer(right, ms)
  }

  useEffect(() => {
    if (heard) void say(w.h)
  }, [])

  useEffect(() => {
    if (!q.seconds) return
    const seconds = q.seconds
    const id = setInterval(() => {
      if (done.current) return clearInterval(id)
      const l = seconds - (performance.now() - t0.current) / 1000
      setLeft(l)
      if (l <= 0) {
        clearInterval(id)
        finish(false)
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  // The fan blows the answers about, once
  useEffect(() => {
    if (!q.fan || typed) return
    const id = setTimeout(() => {
      setChoices((c) => shuffle(c))
      setFocus(-1)
      onGust?.()
    }, 1300)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (answered !== null || e.metaKey || e.ctrlKey || e.altKey) return
      const inField = e.target instanceof HTMLInputElement
      if (e.key === ' ' && heard && !inField) {
        e.preventDefault()
        void say(w.h)
        return
      }
      if (typed || inField) return
      const n = Number(e.key)
      if (n >= 1 && n <= choices.length) {
        e.preventDefault()
        finish(choices[n - 1].id === w.id, choices[n - 1].id)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocus((f) => (f + 1) % choices.length)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocus((f) => (f <= 0 ? choices.length - 1 : f - 1))
      } else if (e.key === 'Enter' && focus >= 0) {
        e.preventDefault()
        finish(choices[focus].id === w.id, choices[focus].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const fire = q.danger && q.seconds !== null && q.seconds <= 4
  return (
    <div className="zh-rise">
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-sm font-black tracking-wide uppercase ${q.danger ? 'text-[#ff8a7a]' : 'text-[var(--gold)]'}`}
        >
          {q.title}
        </p>
        {q.seconds !== null && answered === null && (
          <div className="quest-bar w-28 shrink-0">
            <div
              style={{
                width: `${Math.max(0, left / q.seconds) * 100}%`,
                background: fire
                  ? 'linear-gradient(90deg,#ff4a20,#ffb040)'
                  : '#d8463a',
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex min-h-20 items-center justify-center text-center">
        {heard && answered === null ? (
          <button
            type="button"
            onClick={() => void say(w.h)}
            className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#2f7d6d] text-white shadow-[0_0_0_4px_rgba(98,196,171,0.25)] transition hover:scale-105"
            aria-label="Hear it again"
          >
            <Volume2 size={30} />
          </button>
        ) : heard ? (
          <Ruby h={w.h} p={w.p} className="text-6xl" />
        ) : showPinyin && kind === 'meaning' ? (
          <Ruby h={w.h} p={w.p} className="text-6xl" />
        ) : (
          <span className="zh text-6xl">{w.h}</span>
        )}
      </div>
      {heard && answered === null && (
        <p className="mt-1 text-center text-xs text-[var(--ink-2)]">
          <span className="quest-key">Space to hear it again</span>
        </p>
      )}

      {typed ? (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) finish(matches(text, w.p, settings.tones))
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={answered !== null}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              settings.tones ? 'pinyin, with tones (ni3hao3)' : 'pinyin'
            }
            aria-label="Pinyin"
            className="min-w-0 flex-1 rounded-xl border-2 border-[#3d3044] bg-[#0f0b12] px-4 py-3 text-xl text-[var(--ink)] outline-none placeholder:text-[#6e6070] focus:border-[var(--gold)]"
          />
          <button
            type="submit"
            disabled={answered !== null}
            className="rounded-xl bg-[var(--gold)] px-4 font-black text-[#1b1418] transition hover:brightness-110 disabled:opacity-40"
          >
            Strike
            <span className="quest-key ml-1.5 rounded border border-[#1b1418]/40 px-1 text-[10px] font-bold">
              Enter
            </span>
          </button>
        </form>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {choices.map((c, i) => {
            const state =
              answered === null
                ? ''
                : c.id === w.id
                  ? '!border-[var(--jade)] !bg-[#62c4ab]/15'
                  : answered === c.id
                    ? '!border-[#e05a4a]'
                    : 'opacity-35'
            return (
              <button
                key={c.id}
                type="button"
                disabled={answered !== null}
                onClick={() => finish(c.id === w.id, c.id)}
                className={`quest-slot relative flex min-h-14 items-center justify-center rounded-xl px-3 py-2.5 ${focus === i ? 'quest-focus' : ''} ${state}`}
              >
                <span className="quest-key absolute top-1 left-1.5 text-[10px] font-black text-[var(--gold)] opacity-70">
                  {i + 1}
                </span>
                {kind === 'meaning' ? (
                  <span className="leading-snug">{c.e}</span>
                ) : (
                  <span className="zh text-3xl">{c.h}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {answered !== null && (
        <p className="mt-3 text-center text-sm">
          <span className="zh text-xl">{w.h}</span>{' '}
          <span className="text-[var(--jade)]">{join(syllables(w.p))}</span> –{' '}
          {w.e}
        </p>
      )}
    </div>
  )
}
