import { useMemo, useRef, useState } from 'react'
import { Shuffle, Volume2 } from 'lucide-react'
import { blip, say } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Ruby, shuffle } from '../ui'
import { Card3D, burst, confetti } from './fx'
import { fadedFirst, practiceWords, short } from './play/pool'
import { DemoNote } from './play/DemoNote'
import type { Word } from '../data/words'
import './play/play.css'

// Sound pairs (听对, demo): pelmanism with ears. Half the cards face down
// are characters, half are sounds: turned over, a sound card says its
// word and shows only a speaker. Pair each character with its sound.
// A pair found counts for the character heard (s>h); turning a character
// against the wrong sound when its own had already been heard counts
// against it.

const PAIRS = 6

interface Tile {
  key: string
  w: Word
  sound: boolean
}

export default function Pairs() {
  const { bank, record } = useStore()
  const words = useMemo(() => practiceWords(bank), [])
  const [deal, setDeal] = useState(() => dealOf(words))
  const [open, setOpen] = useState<Array<number>>([])
  const [gone, setGone] = useState<Set<string>>(new Set())
  const [moves, setMoves] = useState(0)
  const [busy, setBusy] = useState(false)
  // Tiles turned over at least once, and words slipped on
  const seen = useRef(new Set<string>())
  const slipped = useRef(new Set<string>())
  const els = useRef<Array<HTMLButtonElement | null>>([])
  const done = gone.size === PAIRS

  const turn = (i: number) => {
    const t = deal[i]
    if (busy || open.includes(i) || gone.has(t.w.id)) return
    if (t.sound) void say(t.w.h)
    else blip('tap')
    const now = [...open, i]
    if (now.length < 2) {
      setOpen(now)
      seen.current.add(t.key)
      return
    }
    setOpen(now)
    setMoves((m) => m + 1)
    const [a, b] = now.map((x) => deal[x])
    const wasSeen = (x: Tile) => seen.current.has(x.key)
    seen.current.add(t.key)
    if (a.w.id === b.w.id && a.sound !== b.sound) {
      const w = a.w
      if (bank.cards[w.id])
        record(w.id, true, slipped.current.has(w.id) ? 0.25 : 0.5, 's>h')
      setBusy(true)
      setTimeout(() => {
        blip('right')
        burst(els.current[i])
        void say(w.h)
        const g = new Set(gone).add(w.id)
        setGone(g)
        setOpen([])
        setBusy(false)
        if (g.size === PAIRS) {
          blip('win')
          confetti(50)
        }
      }, 450)
    } else {
      // a character against the wrong sound, when its own sound had been
      // heard already
      const ch = [a, b].find((x) => !x.sound)
      const sd = [a, b].find((x) => x.sound)
      if (ch && sd && wasSeen({ ...ch, key: `${ch.w.id}:s`, sound: true })) {
        slipped.current.add(ch.w.id)
        if (bank.cards[ch.w.id]) record(ch.w.id, false, 0.3, 's>h')
      }
      setBusy(true)
      setTimeout(() => {
        blip('wrong')
        setOpen([])
        setBusy(false)
      }, 1300)
    }
  }

  const again = () => {
    setDeal(dealOf(words))
    setOpen([])
    setGone(new Set())
    setMoves(0)
    seen.current = new Set()
    slipped.current = new Set()
  }

  return (
    <Frame
      title="Sound pairs"
      zh="听对"
      right={
        <span className="text-sm font-bold text-[var(--ink-2)] tabular-nums">
          {moves} {moves === 1 ? 'turn' : 'turns'}
        </span>
      }
    >
      <DemoNote>
        Memory with your ears: match each character to the card that says it.
        Sound cards only speak; they never show the word.
      </DemoNote>
      <div className="pr-board">
        {deal.map((t, i) => {
          const up = open.includes(i) || gone.has(t.w.id)
          return (
            <button
              key={t.key}
              ref={(el) => {
                els.current[i] = el
              }}
              type="button"
              onClick={() => turn(i)}
              className={`pr-tile ${gone.has(t.w.id) ? 'pr-gone' : ''}`}
              aria-label={up ? (t.sound ? 'Sound' : t.w.h) : 'Card face down'}
            >
              <Card3D
                turned={up}
                className="h-full w-full"
                faceClassName="pr-face"
                front={<span className="pr-back zh">天</span>}
                back={
                  t.sound ? (
                    <span className="pr-sound">
                      <Volume2 size={34} />
                      {gone.has(t.w.id) && (
                        <span className="mt-1 text-xs">{short(t.w)}</span>
                      )}
                    </span>
                  ) : gone.has(t.w.id) ? (
                    <Ruby h={t.w.h} p={t.w.p} className="pr-han" />
                  ) : (
                    <span className="pr-han zh">{t.w.h}</span>
                  )
                }
              />
            </button>
          )
        })}
      </div>
      {done && (
        <div className="zh-card fx-pop mt-5 p-6 text-center">
          <p className="text-2xl font-black">All pairs in {moves} turns</p>
          <p className="mt-1 mb-4 text-[var(--ink-2)]">
            {moves <= PAIRS + 2
              ? 'Sharp ears and a sharp memory.'
              : `A perfect game takes ${PAIRS}.`}
          </p>
          <Btn onClick={again}>
            <Shuffle size={16} className="mr-1 inline" /> New cards
          </Btn>
        </div>
      )}
    </Frame>
  )
}

// Six words, the most faded first, each as a character and as a sound;
// no two words that sound alike, so a sound card has one partner
function dealOf(words: Array<Word>): Array<Tile> {
  const picked: Array<Word> = []
  for (const w of fadedFirst(words, 20)) {
    if (picked.length >= PAIRS) break
    if (picked.some((p) => p.p === w.p || p.h === w.h)) continue
    picked.push(w)
  }
  return shuffle(
    picked.flatMap((w) => [
      { key: `${w.id}:h`, w, sound: false },
      { key: `${w.id}:s`, w, sound: true },
    ]),
  )
}
