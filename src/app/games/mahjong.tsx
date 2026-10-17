import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Lightbulb, RotateCcw, Shuffle } from 'lucide-react'
import { pick } from '../lib/bank'
import { join, syllables } from '../lib/pinyin'
import { blip, say } from '../lib/audio'
import { useStore } from '../lib/store'
import { LAYOUTS, deal, freePairs, isFree } from '../lib/mahjong'
import { narrow } from '../lib/device'
import { Btn, Frame } from '../ui'
import { Seal } from '../daily/Seal'
import { thud } from '../daily/SealToaster'
import '../daily/daily.css'
import type { LayoutId } from '../lib/mahjong'
import type { Word } from '../data/words'
import './mahjong.css'

// Mahjong solitaire with words: each pair is a word in hanzi and its
// meaning (or its pinyin), on pixel-art tiles stacked in layers. Only
// free tiles can be taken: nothing on them, and a side open. The words
// are those met, the faded first, with new ones when there are too few;
// each pair found counts for its word, a wrong pair against it.

type Mode = 'meaning' | 'pinyin'

interface Board {
  layout: LayoutId
  mode: Mode
  words: Array<Word>
  // For each slot: its pair (the word's index) and its face
  pairOf: Array<number>
  hanzi: Array<boolean>
  present: Array<boolean>
  fresh: Set<string>
  started: number
}

interface Tally {
  pairs: number
  misses: number
  hints: number
  shuffles: number
}

const NO_TALLY: Tally = { pairs: 0, misses: 0, hints: 0, shuffles: 0 }

// A meaning short enough for a tile: no asides in brackets, and only
// the first sense when there are several
const short = (w: Word) => {
  // a measure word as mixed text shows it: (item), cup
  if (w.tags.includes('mw')) return w.g
  let e = w.e
    .replace(/\s*\([^)]*\)/g, '')
    .split(';')[0]
    .trim()
  if (e.length > 18) e = e.split(',')[0].trim()
  return e || w.g
}

const keyOf = (w: Word, mode: Mode) =>
  mode === 'meaning'
    ? short(w).toLowerCase()
    : w.p.replace(/ /g, '').toLowerCase()

// Faces for each pair: one tile in hanzi, the other not, at random
function faces(pairOf: Array<number>, random = Math.random): Array<boolean> {
  const first = new Map<number, boolean>()
  return pairOf.map((p) => {
    if (p < 0) return false
    const seen = first.get(p)
    if (seen === undefined) {
      const h = random() < 0.5
      first.set(p, h)
      return h
    }
    return !seen
  })
}

const score = (t: Tally) =>
  Math.max(0, t.pairs * 10 - t.misses * 3 - t.hints * 5 - t.shuffles * 8)

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Mahjong() {
  const { bank, meet, record, points, setBest, levelOf } = useStore()
  const metCount = Object.keys(bank.cards).length
  // On a phone the small board, whose tiles are large enough to read
  const [layout, setLayout] = useState<LayoutId>(
    metCount >= 24 && !narrow() ? 'medium' : 'small',
  )
  const [mode, setMode] = useState<Mode>('meaning')
  const [board, setBoard] = useState<Board | null>(null)
  const [tally, setTally] = useState<Tally>(NO_TALLY)
  const [picked, setPicked] = useState<number | null>(null)
  const [going, setGoing] = useState<Array<number>>([])
  const [shaking, setShaking] = useState<Array<number>>([])
  const [hint, showPair] = useState<Array<number>>([])
  // A hint fades after a while; a newer one, or a pair taken, ends it
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setHint = (pair: Array<number>, ms = 0) => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
    hintTimer.current = ms ? setTimeout(() => showPair([]), ms) : null
    showPair(pair)
  }
  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current)
    },
    [],
  )
  const [now, setNow] = useState(Date.now())
  const [won, setWon] = useState<{ ms: number; score: number } | null>(null)
  // the board as it is now, for what happens after a tile has gone
  const latest = useRef(board)
  latest.current = board

  const newBoard = (l = layout, m = mode) => {
    const { slots, pairs } = LAYOUTS[l]
    const chosen = pick(
      bank,
      pairs * 2,
      Date.now(),
      (w) => !w.tags.includes('part'),
      Math.random,
      pairs * 2,
    )
    // no two words that would look alike on their tiles
    const seen = new Set<string>()
    const words = chosen.words
      .filter((w) => {
        const k = keyOf(w, m)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .slice(0, pairs)
    if (words.length < pairs) return
    const pairOf = deal(
      slots,
      words.map((_, i) => i),
    )
    if (!pairOf) return
    const fresh = words.filter((w) => !bank.cards[w.id]).map((w) => w.id)
    meet(fresh)
    setBoard({
      layout: l,
      mode: m,
      words,
      pairOf,
      hanzi: faces(pairOf),
      present: slots.map(() => true),
      fresh: new Set(fresh),
      started: Date.now(),
    })
    setTally(NO_TALLY)
    setPicked(null)
    setGoing([])
    setHint([])
    setWon(null)
  }

  useEffect(() => newBoard(), [])

  // the clock, while a board is in play
  useEffect(() => {
    if (!board || won) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [board, won])

  const slots = board ? LAYOUTS[board.layout].slots : []
  const free = useMemo(
    () =>
      board
        ? slots.map(
            (_, i) => board.present[i] && isFree(i, slots, board.present),
          )
        : [],
    [board],
  )
  const moves = useMemo(
    () => (board ? freePairs(slots, board.present, board.pairOf) : []),
    [board],
  )
  const left = board ? board.present.filter(Boolean).length / 2 : 0

  const take = (a: number, b: number) => {
    if (!board) return
    const w = board.words[board.pairOf[a]]
    blip('right')
    void say(w.h)
    record(w.id, true, 0.4)
    const t = { ...tally, pairs: tally.pairs + 1 }
    setTally(t)
    setPicked(null)
    setHint([])
    setGoing([a, b])
    setTimeout(() => {
      const bd = latest.current
      setGoing([])
      if (!bd) return
      const present = [...bd.present]
      present[a] = false
      present[b] = false
      setBoard({ ...bd, present })
      if (!present.some(Boolean)) {
        const sc = score(t)
        setWon({ ms: Date.now() - bd.started, score: sc })
        blip('win')
        points(2 + Math.round(bd.words.length / 3))
        setBest('mahjong', sc)
        setBest('mahjong-boards', (bank.best['mahjong-boards'] ?? 0) + 1)
        // every pair right, and none shown
        if (!t.misses && !t.hints)
          setBest('mahjong-clean', (bank.best['mahjong-clean'] ?? 0) + 1)
      }
    }, 330)
  }

  const click = (i: number) => {
    if (!board || !board.present[i] || going.length) return
    if (!free[i]) {
      setShaking([i])
      setTimeout(() => setShaking([]), 360)
      return
    }
    const w = board.words[board.pairOf[i]]
    if (picked === null || picked === i) {
      setPicked(picked === i ? null : i)
      if (picked !== i && board.hanzi[i]) void say(w.h)
      return
    }
    const a = picked
    if (board.pairOf[a] === board.pairOf[i]) return take(a, i)
    if (board.hanzi[a] === board.hanzi[i]) {
      // two of a kind: the newer is picked instead
      setPicked(i)
      if (board.hanzi[i]) void say(w.h)
      return
    }
    // a word and a meaning that do not belong together
    blip('wrong')
    const h = board.hanzi[a] ? a : i
    const hw = board.words[board.pairOf[h]]
    if (!board.fresh.has(hw.id)) record(hw.id, false, 0.2)
    setTally((t) => ({ ...t, misses: t.misses + 1 }))
    setShaking([a, i])
    setPicked(null)
    setTimeout(() => setShaking([]), 360)
  }

  const showHint = () => {
    if (!moves.length) return
    const [a, b] = moves[Math.floor(Math.random() * moves.length)]
    setHint([a, b], 2200)
    setTally((t) => ({ ...t, hints: t.hints + 1 }))
  }

  const reshuffle = () => {
    if (!board) return
    const pairs = [
      ...new Set(board.pairOf.filter((p, i) => p >= 0 && board.present[i])),
    ]
    const dealt = deal(slots, pairs, Math.random, board.present)
    if (!dealt) return
    setBoard({ ...board, pairOf: dealt, hanzi: faces(dealt) })
    setPicked(null)
    setHint([])
    setTally((t) => ({ ...t, shuffles: t.shuffles + 1 }))
  }

  return (
    <Frame
      title="Mahjong"
      zh="麻将"
      wide
      right={
        board && (
          <span className="text-sm font-bold tabular-nums text-[var(--ink-2)]">
            {left} {left === 1 ? 'pair' : 'pairs'} ·{' '}
            {clock((won ? board.started + won.ms : now) - board.started)}
          </span>
        )
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Toggle
          options={[
            ['meaning', 'Hanzi + meaning'],
            ['pinyin', 'Hanzi + pinyin'],
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m)
            newBoard(layout, m)
          }}
        />
        <Toggle
          options={(Object.keys(LAYOUTS) as Array<LayoutId>).map((id) => [
            id,
            `${LAYOUTS[id].name} · ${LAYOUTS[id].pairs}`,
          ])}
          value={layout}
          onChange={(l) => {
            setLayout(l)
            newBoard(l, mode)
          }}
        />
        <div className="ml-auto flex gap-2">
          <Btn
            kind="ghost"
            onClick={showHint}
            disabled={!moves.length || !!won}
          >
            <Lightbulb size={16} /> Hint
          </Btn>
          <Btn kind="ghost" onClick={reshuffle} disabled={!board || !!won}>
            <Shuffle size={16} /> Shuffle
          </Btn>
        </div>
      </div>

      {board && (
        <Table>
          {won ? (
            <div className="flex justify-center">
              <Cleared
                board={board}
                won={won}
                tally={tally}
                best={bank.best.mahjong}
                onAgain={() => newBoard()}
              />
            </div>
          ) : (
            <Tiles
              board={board}
              free={free}
              picked={picked}
              going={going}
              shaking={shaking}
              hint={hint}
              levelOf={levelOf}
              onClick={click}
            />
          )}
          {!won && !moves.length && left > 0 && !going.length && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center">
              <div className="zh-card zh-rise flex items-center gap-3 px-4 py-2">
                <span className="text-sm font-bold">No pairs are free.</span>
                <Btn onClick={reshuffle} className="px-3 py-1 text-sm">
                  <Shuffle size={14} /> Shuffle
                </Btn>
              </div>
            </div>
          )}
        </Table>
      )}

      <p className="mt-4 text-sm text-[var(--ink-2)]">
        Pair each word in hanzi with its{' '}
        {mode === 'meaning' ? 'meaning' : 'pinyin'}. A tile can be taken when
        nothing lies on it and its left or right side is open. Free tiles are
        brighter.
      </p>
    </Frame>
  )
}

// The board cleared: 和 hú, the call that wins a hand of mahjong,
// stamped, and the words of the board
const HU = { id: 'mahjong-hu', zh: '和', shape: 'round' as const }

function Cleared({
  board,
  won,
  tally,
  best,
  onAgain,
}: {
  board: Board
  won: { ms: number; score: number }
  tally: Tally
  best: number | undefined
  onAgain: () => void
}) {
  useEffect(() => {
    const t = setTimeout(() => thud(), 300)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="zh-card zh-pop w-full max-w-md p-5 text-center">
      <div className="zh-stamp mx-auto w-fit">
        <Seal seal={HU} size={76} />
      </div>
      <p className="mt-2 text-sm text-[var(--ink-2)]">
        <span className="zh text-base text-[var(--ink)]">和</span> hú: the call
        that wins a hand
      </p>
      <p className="mt-1 text-2xl font-black">Cleared in {clock(won.ms)}</p>
      <p className="text-sm text-[var(--ink-2)]">
        {board.words.length} pairs
        {tally.misses ? `, ${tally.misses} wrong` : ', none wrong'}
        {tally.hints
          ? `, ${tally.hints} ${tally.hints === 1 ? 'hint' : 'hints'}`
          : ''}
        {' · '}score {won.score}
        {best && best > won.score ? ` (best ${best})` : ''}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {board.words.map((w) => (
          <span
            key={w.id}
            className="zh rounded-md bg-[var(--paper)] px-1.5 text-xl"
          >
            {w.h}
          </span>
        ))}
      </div>
      <Btn onClick={onAgain} className="mt-4">
        <RotateCcw size={16} /> Deal again
      </Btn>
    </div>
  )
}

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<[T, string]>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl bg-[var(--paper-2)] p-0.5">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-[0.6rem] px-2.5 py-1 text-sm font-bold transition ${
            id === value
              ? 'bg-[#fffaf1] text-[var(--ink)] shadow-sm'
              : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// --- The table: green felt in a wooden rim

let felt = ''
function feltUrl() {
  if (felt) return felt
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 8
  const g = c.getContext('2d')
  if (!g) return ''
  const B = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ]
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const t = (B[y % 4][x % 4] + 0.5) / 16
      g.fillStyle = t < 0.3 ? '#2c6a52' : t < 0.85 ? '#327a5e' : '#3a8668'
      g.fillRect(x, y, 1, 1)
    }
  felt = c.toDataURL()
  return felt
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-2 shadow-lg"
      style={{ background: 'linear-gradient(#6a4430, #4a2e20)' }}
    >
      <div
        className="relative overflow-hidden rounded-xl px-2 py-4 sm:px-4 sm:py-6"
        style={{
          backgroundColor: '#327a5e',
          backgroundImage: `url(${feltUrl()})`,
          backgroundSize: '16px 16px',
          imageRendering: 'pixelated',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.35)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// --- Tiles, drawn as pixel art: an ivory face over a jade back

// The tile picture is 24 × 31: the face 22 × 28, then its thickness
const TW = 24
const TH = 31
const FACE_W = 22
const FACE_H = 28

const tileCache = new Map<string, string>()
function tileUrl(state: 'plain' | 'picked'): string {
  const hit = tileCache.get(state)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = TW
  c.height = TH
  const g = c.getContext('2d')
  if (!g) return ''
  const r = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col
    g.fillRect(x, y, w, h)
  }
  const picked = state === 'picked'
  const outline = picked ? '#8a5a12' : '#4a3b30'
  // the thickness: ivory, then the jade back, seen at the right and below
  r(2, 2, TW - 2, TH - 2, outline)
  r(3, FACE_H, TW - 4, 1, '#d8cab0')
  r(3, FACE_H + 1, TW - 4, 1, '#3f8f7a')
  r(FACE_W, 3, 1, TH - 5, '#d8cab0')
  r(FACE_W + 1, 3, 1, TH - 5, '#2f7d6d')
  r(3, FACE_H + 2, TW - 5, 1, '#245f52')
  // the face
  r(0, 0, FACE_W, FACE_H, outline)
  r(1, 1, FACE_W - 2, FACE_H - 2, picked ? '#f8e3a2' : '#f4ecd9')
  r(1, 1, FACE_W - 2, 1, picked ? '#fff2c8' : '#fffaf0')
  r(1, 1, 1, FACE_H - 2, picked ? '#fff2c8' : '#fffaf0')
  // a little shade to the lower right, dithered
  for (let y = 14; y < FACE_H - 1; y++)
    for (let x = 1; x < FACE_W - 1; x++)
      if ((x + y) % 2 === 0 && x + y > 32)
        r(x, y, 1, 1, picked ? '#ecd28a' : '#e6dac0')
  r(1, FACE_H - 2, FACE_W - 2, 1, picked ? '#e2c472' : '#ddd0b2')
  r(FACE_W - 2, 1, 1, FACE_H - 2, picked ? '#e2c472' : '#ddd0b2')
  const url = c.toDataURL()
  tileCache.set(state, url)
  return url
}

function Tiles({
  board,
  free,
  picked,
  going,
  shaking,
  hint,
  levelOf,
  onClick,
}: {
  board: Board
  free: Array<boolean>
  picked: number | null
  going: Array<number>
  shaking: Array<number>
  hint: Array<number>
  levelOf: (id: string) => number
  onClick: (i: number) => void
}) {
  const slots = LAYOUTS[board.layout].slots
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const minX = Math.min(...slots.map((s) => s.x))
  const maxX = Math.max(...slots.map((s) => s.x)) + 2
  const minY = Math.min(...slots.map((s) => s.y))
  const maxY = Math.max(...slots.map((s) => s.y)) + 2
  const maxZ = Math.max(...slots.map((s) => s.z))
  const cols = (maxX - minX) / 2
  const rows = (maxY - minY) / 2
  // tiles as large as fit, within reason
  const tw = Math.max(
    30,
    Math.min(84, Math.floor((width - 12) / (cols * (FACE_W / TW) + 0.4))),
  )
  const th = Math.round((tw * TH) / TW)
  const stepX = (tw * FACE_W) / TW
  const stepY = (th * FACE_H) / TH
  const shiftX = Math.round(stepX * 0.1)
  const shiftY = Math.round(stepY * 0.1)
  const w = maxZ * shiftX + cols * stepX + (tw - stepX)
  const h = maxZ * shiftY + rows * stepY + (th - stepY)
  const plain = tileUrl('plain')
  const pickedUrl = tileUrl('picked')

  return (
    <div ref={box} className="w-full">
      <div className="relative mx-auto" style={{ width: w, height: h }}>
        {slots.map((s, i) => {
          if (!board.present[i]) return null
          const word = board.words[board.pairOf[i]]
          const isPicked = picked === i
          const fw = (tw * FACE_W) / TW
          const fh = (th * FACE_H) / TH
          return (
            <button
              key={i}
              type="button"
              onClick={() => onClick(i)}
              data-free={free[i]}
              data-picked={isPicked}
              aria-label={
                board.hanzi[i]
                  ? word.h
                  : board.mode === 'meaning'
                    ? short(word)
                    : word.p
              }
              className={`zh-tile absolute ${going.includes(i) ? 'zh-tile-go' : ''} ${shaking.includes(i) ? 'zh-shake' : ''}`}
              style={{
                left: maxZ * shiftX + ((s.x - minX) / 2) * stepX - s.z * shiftX,
                top: maxZ * shiftY + ((s.y - minY) / 2) * stepY - s.z * shiftY,
                width: tw,
                height: th,
                zIndex: 10 + s.z * 1000 + s.y * 20 + s.x + 4,
                backgroundImage: `url(${isPicked ? pickedUrl : plain})`,
                backgroundSize: '100% 100%',
                imageRendering: 'pixelated',
                // tiles higher up cast a shadow on those below
                boxShadow: s.z
                  ? `${s.z + 1}px ${s.z + 2}px ${s.z * 2 + 2}px rgba(20,40,30,0.35)`
                  : undefined,
              }}
            >
              <span
                className={`absolute top-0 left-0 flex flex-col items-center justify-center overflow-hidden px-0.5 text-center leading-tight ${hint.includes(i) ? 'zh-tile-hint' : ''}`}
                style={{ width: fw, height: fh, imageRendering: 'auto' }}
              >
                <Face
                  word={word}
                  hanzi={board.hanzi[i]}
                  mode={board.mode}
                  tw={tw}
                  learning={levelOf(word.id) < 2 || board.fresh.has(word.id)}
                />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// What is written on a tile: hanzi (with pinyin over it while the word
// is being learnt, in meaning mode), its meaning, or its pinyin. Hanzi
// tiles carry a small red mark, as mahjong's character tiles do; the
// others a jade one.
function Face({
  word,
  hanzi,
  mode,
  tw,
  learning,
}: {
  word: Word
  hanzi: boolean
  mode: Mode
  tw: number
  learning: boolean
}) {
  if (hanzi) {
    const n = [...word.h].length
    const size = tw * (n === 1 ? 0.6 : n === 2 ? 0.4 : n === 3 ? 0.27 : 0.3)
    return (
      <>
        {learning && mode === 'meaning' && (
          <span
            className="font-sans whitespace-nowrap text-[var(--jade)]"
            style={{
              fontSize: Math.max(
                7,
                Math.min(
                  tw * 0.15,
                  (tw * 1.45) / join(syllables(word.p)).length,
                ),
              ),
            }}
          >
            {join(syllables(word.p))}
          </span>
        )}
        <span
          className="zh text-[#1b1418]"
          style={{
            fontSize: size,
            lineHeight: 1.05,
            whiteSpace: n === 4 ? 'pre-line' : 'nowrap',
          }}
        >
          {n === 4 ? `${word.h.slice(0, 2)}\n${word.h.slice(2)}` : word.h}
        </span>
        <span
          className="absolute right-1 bottom-1 rounded-[1px] bg-[#c8372d]"
          style={{
            width: Math.max(3, tw * 0.08),
            height: Math.max(3, tw * 0.08),
          }}
        />
      </>
    )
  }
  const text = mode === 'meaning' ? short(word) : join(syllables(word.p))
  const long = text.length > 12
  return (
    <>
      <span
        className={`font-bold ${mode === 'pinyin' ? 'text-[var(--jade)]' : 'text-[#2a221c]'}`}
        style={{
          fontSize: Math.max(
            8,
            tw * (mode === 'pinyin' ? 0.2 : long ? 0.15 : 0.18),
          ),
          hyphens: 'auto',
          overflowWrap: 'anywhere',
        }}
      >
        {text}
      </span>
      <span
        className="absolute top-1 left-1 rounded-full bg-[#2f7d6d]"
        style={{
          width: Math.max(3, tw * 0.08),
          height: Math.max(3, tw * 0.08),
        }}
      />
    </>
  )
}
