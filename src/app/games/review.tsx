import { useState } from 'react'
import { WORDS } from '../data/words'
import { due } from '../lib/bank'
import { useStore } from '../lib/store'
import { Btn, Frame, usePeek } from '../ui'
import { Quiz, RoundDone, questionsFor } from '../quiz'
import { Pix } from '../pixel/Pix'
import { Key, useKeys } from './fx'
import type { Word } from '../data/words'

// Review: the words that have faded most, a dozen at a time, each asked
// about its link that has faded most, in a way that suits how well that
// is known. Before a round, every word met is
// written out in ink as strong as the memory of it: the faded ones are
// pale.

const ROUND = 12

export default function Review() {
  const { bank, points } = useStore()
  const peek = usePeek()
  const [round, setRound] = useState<Array<Word> | null>(null)
  const [result, setResult] = useState<[number, number] | null>(null)
  const [n, setN] = useState(0)
  const now = Date.now()
  const list = due(bank, now)
  const fading = list.filter((d) => d.r < 0.85).length
  const playing = !!round && !result

  const start = () => {
    const words = list.slice(0, ROUND).map((d) => d.w)
    setRound(words)
    setResult(null)
    setN((x) => x + 1)
  }

  useKeys((key) => {
    if (key !== 'Enter' || !list.length) return
    start()
    return true
  }, !playing)

  if (!list.length)
    return (
      <Frame title="Review" zh="复习">
        <div className="zh-card fx-rise p-8 text-center">
          <Pix name="sprout" size={72} />
          <p className="mt-3 text-lg">No words in your bank yet.</p>
          <div className="mt-4 flex justify-center gap-2">
            <a href="#learn">
              <Btn>Learn some</Btn>
            </a>
            <a href="#words">
              <Btn kind="ghost">Mark words you know</Btn>
            </a>
          </div>
        </div>
      </Frame>
    )

  if (playing)
    return (
      <Frame title="Review" zh="复习">
        <Quiz
          key={n}
          questions={questionsFor(round, bank.cards, now)}
          onDone={(r, t) => {
            setResult([r, t])
            points(3)
          }}
        />
      </Frame>
    )

  const shown = list.slice(0, 60)
  return (
    <Frame title="Review" zh="复习">
      {result ? (
        <RoundDone
          right={result[0]}
          total={result[1]}
          sprite={result[0] === result[1] ? 'trophy' : 'review'}
          actions={
            <Btn onClick={start} className="px-8 py-3 text-lg">
              Another round{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          }
        >
          <p className="mt-1 text-[var(--ink-2)]">
            {fading
              ? `${fading} of your ${list.length} words are still fading.`
              : `All ${list.length} words are fresh.`}
          </p>
        </RoundDone>
      ) : (
        <div className="zh-card fx-rise flex flex-wrap items-center gap-5 p-6">
          <Pix name="review" size={64} />
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black">
              {fading
                ? `${fading} ${fading === 1 ? 'word is' : 'words are'} fading`
                : 'Everything is fresh'}
            </p>
            <p className="text-sm text-[var(--ink-2)]">
              {fading
                ? `A round asks the ${Math.min(ROUND, list.length)} that have faded most, in the way that suits each.`
                : 'Reviewing now helps less than waiting – but it never hurts.'}
            </p>
          </div>
          <Btn onClick={start} className="px-8 py-3 text-lg max-sm:w-full">
            Start{' '}
            <Key
              k="Enter"
              className="ml-1 border-white/30 bg-white/15 text-white"
            />
          </Btn>
        </div>
      )}

      <section className="zh-card mt-5 overflow-hidden p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-black">Your words, in ink</h2>
          <span className="text-xs text-[var(--ink-2)]">
            Paler is more faded · tap one to see it
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {shown.map(({ w, r }, i) => (
            <button
              key={w.id}
              type="button"
              onClick={() => peek(w.id)}
              title={`${w.e} – ${Math.round(r * 100)} %`}
              className="fx-pop group relative flex h-14 min-w-[3.4rem] flex-col items-center justify-center rounded-lg px-1.5 whitespace-nowrap transition hover:bg-[var(--paper-2)]"
              style={{ animationDelay: `${Math.min(i, 40) * 18}ms` }}
            >
              <span
                className="zh text-2xl leading-none"
                style={{
                  color: r < 0.85 ? '#7a2a20' : 'var(--ink)',
                  opacity: 0.18 + 0.82 * r ** 2,
                }}
              >
                {w.h}
              </span>
              <span
                className="mt-1 h-1 w-8 overflow-hidden rounded-full bg-[var(--paper-2)]"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${r * 100}%`,
                    background: r < 0.85 ? 'var(--red)' : 'var(--jade)',
                  }}
                />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--ink-2)]">
          {list.length > shown.length
            ? `The ${shown.length} most faded of ${list.length} met. `
            : ''}
          {WORDS.length - list.length} words not met yet.
        </p>
      </section>
    </Frame>
  )
}
