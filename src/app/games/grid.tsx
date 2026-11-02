import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Lightbulb, Shuffle } from 'lucide-react'
import { WORDS } from '../data/words'
import { blip, say } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Ruby, shuffle } from '../ui'
import { burst, confetti, floatText } from './fx'
import { hanCount, practiceWords, short } from './play/pool'
import { DemoNote } from './play/DemoNote'
import type { Word } from '../data/words'
import './play/play.css'

// Character grid (字阵, demo): a board of characters with words of yours
// hidden in it, each a path of neighbouring squares (across, down or
// diagonal, turning as it likes). The meanings are the clues; draw a line
// through the characters of each. Finding one asks the character for a
// meaning (m>h); a hint or giving up counts less, or against it. Any other
// word of yours found on the way is a bonus.

const SIZE = 4
const N = SIZE * SIZE

interface Board {
  cells: Array<string>
  words: Array<Word>
  // Where each word's first character was laid, for a hint
  starts: Record<string, number>
}

const neighbours = (i: number) => {
  const r = Math.floor(i / SIZE)
  const c = i % SIZE
  const out: Array<number> = []
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const rr = r + dr
      const cc = c + dc
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) out.push(rr * SIZE + cc)
    }
  return out
}
const adjacent = (a: number, b: number) => neighbours(a).includes(b)

// Lay a word's characters along a path of free (or same) squares
function lay(
  cells: Array<string>,
  chars: Array<string>,
): { cells: Array<string>; start: number } | null {
  let start = 0
  const walk = (
    at: number,
    k: number,
    used: Set<number>,
    g: Array<string>,
  ): Array<string> | null => {
    if (g[at] && g[at] !== chars[k]) return null
    const next = [...g]
    next[at] = chars[k]
    if (k === chars.length - 1) return next
    const u = new Set(used).add(at)
    for (const n of shuffle(neighbours(at).filter((x) => !u.has(x)))) {
      const done = walk(n, k + 1, u, next)
      if (done) return done
    }
    return null
  }
  for (const s of shuffle([...Array(N).keys()])) {
    start = s
    const done = walk(s, 0, new Set(), cells)
    if (done) return { cells: done, start }
  }
  return null
}

function makeBoard(words: Array<Word>): Board {
  // words of two to four characters, the faded first, a little shuffled
  const fit = words.filter((w) => hanCount(w) >= 2 && hanCount(w) <= 4)
  const head = fit
    .slice(0, 30)
    .map((w, i) => ({ w, k: i + Math.random() * 12 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.w)
  for (let attempt = 0; attempt < 30; attempt++) {
    let cells: Array<string> = Array(N).fill('')
    const placed: Array<Word> = []
    const starts: Record<string, number> = {}
    for (const w of shuffle(head).slice(0, 12)) {
      if (placed.length >= 5) break
      if (placed.some((p) => p.h === w.h)) continue
      const next = lay(cells, [...w.h])
      if (next) {
        cells = next.cells
        starts[w.id] = next.start
        placed.push(w)
      }
    }
    if (placed.length >= 4 || attempt === 29) {
      // the empty squares get characters from other words met
      const filler = shuffle(words.flatMap((w) => [...w.h]))
      let f = 0
      cells = cells.map((c) => c || filler[f++ % filler.length] || '的')
      return { cells, words: placed, starts }
    }
  }
  return { cells: Array(N).fill('的'), words: [], starts: {} }
}

export default function Grid() {
  const { bank, record } = useStore()
  const words = useMemo(() => practiceWords(bank), [])
  const metByHanzi = useMemo(() => {
    const m = new Map<string, Word>()
    for (const w of WORDS) if (bank.cards[w.id] && !m.has(w.h)) m.set(w.h, w)
    return m
  }, [])
  const [board, setBoard] = useState(() => makeBoard(words))
  const [found, setFound] = useState<Set<string>>(new Set())
  const [hinted, setHinted] = useState<Set<string>>(new Set())
  const [shown, setShown] = useState(false)
  const [bonus, setBonus] = useState<Array<Word>>([])
  const [path, setPath] = useState<Array<number>>([])
  const [flash, setFlash] = useState<{
    cells: Array<number>
    good: boolean
  } | null>(null)
  const [hintCell, setHintCell] = useState<number | null>(null)
  const dragging = useRef(false)
  const grid = useRef<HTMLDivElement>(null)
  const cellEls = useRef<Array<HTMLButtonElement | null>>([])
  const done =
    board.words.length > 0 && board.words.every((w) => found.has(w.id))

  useEffect(() => {
    if (done && !shown) {
      blip('win')
      confetti(50)
    }
  }, [done])

  const text = (p: Array<number>) => p.map((i) => board.cells[i]).join('')

  const check = (p: Array<number>, final: boolean) => {
    const t = text(p)
    const w = board.words.find((x) => x.h === t && !found.has(x.id))
    if (w) {
      setFound((f) => new Set(f).add(w.id))
      if (bank.cards[w.id] && !shown)
        record(w.id, true, hinted.has(w.id) ? 0.3 : 0.6, 'm>h')
      blip('right')
      void say(w.h)
      const el = cellEls.current[p[p.length - 1]]
      burst(el)
      floatText(el, short(w), { size: 18 })
      setFlash({ cells: p, good: true })
      setTimeout(() => setFlash(null), 700)
      setPath([])
      return true
    }
    if (final && p.length >= 2) {
      const b = metByHanzi.get(t)
      if (b && !board.words.includes(b) && !bonus.includes(b)) {
        setBonus((x) => [...x, b])
        blip('chime')
        floatText(cellEls.current[p[p.length - 1]], `bonus: ${short(b)}`, {
          size: 16,
          color: '#b8862a',
        })
        setPath([])
        return true
      }
    }
    return false
  }

  const cellAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const i = el?.closest<HTMLElement>('[data-cell]')?.dataset.cell
    return i === undefined ? null : Number(i)
  }

  const down = (i: number, e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = true
    // a tap next to the end of a line goes on with it
    if (
      path.length &&
      adjacent(path[path.length - 1], i) &&
      !path.includes(i)
    ) {
      const p = [...path, i]
      setPath(p)
      check(p, false)
    } else setPath([i])
    blip('tap')
  }

  const move = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const i = cellAt(e.clientX, e.clientY)
    if (i === null) return
    setPath((p) => {
      if (p.includes(i)) {
        // back along the line
        return p[p.length - 2] === i ? p.slice(0, -1) : p
      }
      if (!p.length || !adjacent(p[p.length - 1], i)) return p
      blip('tap')
      return [...p, i]
    })
  }

  const up = () => {
    if (!dragging.current) return
    dragging.current = false
    if (path.length < 2) return
    if (!check(path, true)) {
      setFlash({ cells: path, good: false })
      blip('wrong')
      setTimeout(() => setFlash(null), 450)
      setPath([])
    }
  }

  const hint = () => {
    const w = board.words.find((x) => !found.has(x.id))
    if (!w) return
    setHinted((h) => new Set(h).add(w.id))
    // the square its first character was laid on
    setHintCell(board.starts[w.id] ?? null)
    setTimeout(() => setHintCell(null), 1500)
  }

  const giveUp = () => {
    for (const w of board.words)
      if (!found.has(w.id) && bank.cards[w.id]) record(w.id, false, 0.4, 'm>h')
    setShown(true)
  }

  const fresh = () => {
    setBoard(makeBoard(words))
    setFound(new Set())
    setHinted(new Set())
    setShown(false)
    setBonus([])
    setPath([])
  }

  const lit = new Set(path)
  const flashed = new Set(flash?.cells ?? [])

  return (
    <Frame title="Character grid" zh="字阵">
      <DemoNote>
        Your words are hidden in the grid as paths of neighbouring characters.
        Draw a line through each one from its meaning.
      </DemoNote>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_15rem]">
        <div>
          <div
            ref={grid}
            className="gr-board"
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
            onPointerCancel={up}
          >
            <svg
              className="gr-line"
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              aria-hidden
            >
              <polyline
                points={path
                  .map(
                    (i) => `${(i % SIZE) + 0.5},${Math.floor(i / SIZE) + 0.5}`,
                  )
                  .join(' ')}
              />
            </svg>
            {board.cells.map((c, i) => (
              <button
                key={i}
                ref={(el) => {
                  cellEls.current[i] = el
                }}
                type="button"
                data-cell={i}
                onPointerDown={(e) => down(i, e)}
                className={`gr-cell zh ${lit.has(i) ? 'gr-lit' : ''} ${
                  flashed.has(i)
                    ? flash?.good
                      ? 'gr-good'
                      : 'fx-shake gr-bad'
                    : ''
                } ${hintCell === i ? 'gr-hint' : ''}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-2 h-8 text-center">
            <span className="zh text-2xl text-[var(--red)]">{text(path)}</span>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-black tracking-wide text-[var(--ink-2)] uppercase">
            Find {board.words.length}
          </h2>
          <ul className="space-y-1.5">
            {board.words.map((w) => {
              const got = found.has(w.id)
              return (
                <li
                  key={w.id}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                    got
                      ? 'bg-[#e3f0ea]'
                      : shown
                        ? 'bg-[#f8e1dc]'
                        : 'bg-[var(--card)]'
                  }`}
                >
                  <span
                    className={`font-semibold ${got ? 'text-[var(--ink-2)]' : ''}`}
                  >
                    {short(w)}
                  </span>
                  <span className="text-xs text-[var(--ink-2)]">
                    {got || shown ? (
                      <Ruby h={w.h} p={w.p} className="text-lg" />
                    ) : (
                      `${hanCount(w)} characters`
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          {bonus.length > 0 && (
            <p className="mt-3 text-sm text-[var(--gold-2)]">
              Bonus: {bonus.map((b) => `${b.h} ${short(b)}`).join(' · ')}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {done || shown ? (
              <Btn onClick={fresh}>
                <Shuffle size={16} className="mr-1 inline" /> New grid
              </Btn>
            ) : (
              <>
                <Btn kind="ghost" onClick={hint}>
                  <Lightbulb size={16} className="mr-1 inline" /> Hint
                </Btn>
                <Btn kind="ghost" onClick={giveUp}>
                  <Eye size={16} className="mr-1 inline" /> Show them
                </Btn>
              </>
            )}
          </div>
        </div>
      </div>
    </Frame>
  )
}
