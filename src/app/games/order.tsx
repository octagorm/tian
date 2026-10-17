import { useEffect, useMemo, useRef, useState } from 'react'
import { PLAYER_VOICE, SCENES } from '../data/trip'
import { WORD } from '../data/words'
import { english, plain, tokens } from '../lib/text'
import { join } from '../lib/pinyin'
import { blip, say } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Mixed, shuffle, tokenLevel } from '../ui'
import {
  Combo,
  Key,
  cheer,
  reducedMotion,
  replay,
  useFlip,
  useKeys,
} from './fx'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Token } from '../lib/text'

// Word order: the English of a line from the trip, and its words in a
// heap. Put them in Chinese order: time and place before the verb,
// questions without moving words, measure words between number and thing.
// Tiles can be dragged into place (or tapped, or picked with 1–9); they
// glide where they go, and a wrong line sorts itself out before your eyes.

interface Line {
  zh: string
  en: string
}

const LINES: Array<Line> = (() => {
  const out: Array<Line> = []
  const seen = new Set<string>()
  for (const s of SCENES)
    for (const step of s.steps) {
      const lines =
        step.kind === 'line' ? [step] : step.options.filter((o) => o.right)
      for (const l of lines) {
        const words = l.zh.split(' ').filter((t) => !/^[，。！？]$/.test(t))
        const inner = l.zh
          .split(' ')
          .slice(0, -1)
          .some((t) => /^[，。！？]$/.test(t))
        if (words.length < 3 || words.length > 9 || inner || seen.has(l.zh))
          continue
        seen.add(l.zh)
        out.push({ zh: l.zh, en: l.en })
      }
    }
  return out
})()

type From = 'heap' | 'row'

interface Drag {
  key: number
  from: From
  // where the tile was grabbed, within it, and where the pointer started
  dx: number
  dy: number
  x0: number
  y0: number
  w: number
  h: number
}

interface Press {
  key: number
  from: From
  x: number
  y: number
  id: number
  el: HTMLElement
  started: boolean
  // where it was grabbed, within the tile
  dx: number
  dy: number
}

export default function Order() {
  const { settings, levelOf, record, points, setBest, bank } = useStore()
  const vars = { home: settings.home }
  const homeName = WORD[settings.home]?.g ?? settings.home

  // Lines whose words are best known come first
  const pool = useMemo(() => {
    const known = (l: Line) => {
      const t = tokens(l.zh, vars).filter((x) => !x.punct)
      return t.filter((x) => tokenLevel(x, levelOf) > 0).length / t.length
    }
    return shuffle(LINES).sort((a, b) => known(b) - known(a))
  }, [])
  const [i, setI] = useState(0)
  const line = pool[i % pool.length]
  const all = useMemo(() => tokens(line.zh, vars), [line, vars.home])
  const words = all.filter((t) => !t.punct)
  const end = all.at(-1)?.punct ? all.at(-1)!.h : ''
  const heap0 = useMemo(() => {
    let h = shuffle(words.map((t, k) => ({ t, k })))
    // never start in the right order
    if (h.every((x, j) => x.t.h === words[j].h)) h = [...h.slice(1), h[0]]
    return h
  }, [line])
  const [placed, setPlaced] = useState<Array<number>>([])
  const [result, setResult] = useState<{
    ok: boolean
    t: number
    mine: Array<number>
  } | null>(null)
  const [fixed, setFixed] = useState(false)
  const [score, setScore] = useState({ right: 0, n: 0, streak: 0 })
  const [drag, setDrag] = useState<Drag | null>(null)
  const [gap, setGap] = useState<number | null>(null)
  const [leaving, setLeaving] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const ghost = useRef<HTMLDivElement>(null)
  const press = useRef<Press | null>(null)
  const dragged = useRef(false)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  useFlip(root)

  const later = (f: () => void, ms: number) =>
    timers.current.push(setTimeout(f, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const tokenOf = (k: number) => heap0.find((h) => h.k === k)!.t
  const heap = heap0.filter((x) => !placed.includes(x.k))

  // Where in the row a tile let go at (x, y) would go, or null if not over
  // the row. Tiles are in reading order, so the first one the point is
  // above, or left of the middle of on its line, is the one to go before.
  const indexAt = (x: number, y: number): number | null => {
    const el = row.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const pad = 28
    if (
      x < r.left - pad ||
      x > r.right + pad ||
      y < r.top - pad ||
      y > r.bottom + pad
    )
      return null
    const tiles = [...el.querySelectorAll<HTMLElement>('[data-tile]')]
    for (let j = 0; j < tiles.length; j++) {
      const t = tiles[j].getBoundingClientRect()
      if (y < t.top) return j
      if (y <= t.bottom && x < t.left + t.width / 2) return j
    }
    return tiles.length
  }

  const drop = (key: number, from: From, at: number | null) => {
    if (at === null) {
      if (from === 'row') setPlaced((p) => p.filter((k) => k !== key))
      return
    }
    setPlaced((p) => {
      const rest = p.filter((k) => k !== key)
      rest.splice(at, 0, key)
      return rest
    })
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = press.current
      if (!p || e.pointerId !== p.id) return
      if (!p.started) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return
        p.started = true
        dragged.current = true
        const r = p.el.getBoundingClientRect()
        p.dx = p.x - r.left
        p.dy = p.y - r.top
        setDrag({
          key: p.key,
          from: p.from,
          dx: p.dx,
          dy: p.dy,
          x0: e.clientX,
          y0: e.clientY,
          w: r.width,
          h: r.height,
        })
      }
      const g = ghost.current
      if (g)
        g.style.transform = `translate(${e.clientX - p.dx}px, ${e.clientY - p.dy}px)`
      setGap(indexAt(e.clientX, e.clientY))
    }
    const up = (e: PointerEvent) => {
      const p = press.current
      if (!p || e.pointerId !== p.id) return
      press.current = null
      if (!p.started) return
      if (e.type === 'pointerup')
        drop(p.key, p.from, indexAt(e.clientX, e.clientY))
      setDrag(null)
      setGap(null)
      // the click that ends a drag is not a tap
      setTimeout(() => (dragged.current = false), 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [heap0])

  const grab = (e: ReactPointerEvent<HTMLElement>, key: number, from: From) => {
    if (result || e.button !== 0) return
    press.current = {
      key,
      from,
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
      el: e.currentTarget,
      started: false,
      dx: 0,
      dy: 0,
    }
  }

  const tap = (key: number, from: From) => {
    if (dragged.current || result) return
    if (from === 'heap') setPlaced((p) => [...p, key])
    else setPlaced((p) => p.filter((y) => y !== key))
  }

  const check = () => {
    if (result || placed.length !== words.length) return
    const built = placed.map((k) => tokenOf(k).h).join('')
    const ok = built === words.map((t) => t.h).join('')
    setResult({ ok, t: Date.now(), mine: placed })
    blip(ok ? 'right' : 'wrong')
    void say(plain(line.zh, vars), PLAYER_VOICE)
    setScore((s) => {
      const n = {
        right: s.right + (ok ? 1 : 0),
        n: s.n + 1,
        streak: ok ? s.streak + 1 : 0,
      }
      setBest('order', n.right)
      return n
    })
    const tiles = [
      ...(row.current?.querySelectorAll<HTMLElement>('[data-tile]') ?? []),
    ]
    if (ok) {
      points(2)
      for (const t of words)
        if (t.id && tokenLevel(t, levelOf) > 0) record(t.id, true, 0.3)
      tiles.forEach((el, j) => later(() => replay(el, 'fx-pulse'), j * 90))
      later(() => cheer(row.current, '+2'), tiles.length * 90)
    } else {
      replay(row.current, 'fx-shake')
      // then the tiles go where they belong
      later(() => {
        setFixed(true)
        setPlaced(words.map((_, k) => k))
      }, 750)
    }
  }

  const next = () => {
    if (!result || leaving) return
    const go = () => {
      setLeaving(false)
      setPlaced([])
      setResult(null)
      setFixed(false)
      setI((x) => x + 1)
    }
    if (reducedMotion()) return go()
    setLeaving(true)
    later(go, 190)
  }

  useKeys((key) => {
    if (result) {
      if (key !== 'Enter' || Date.now() - result.t < 150) return
      next()
      return true
    }
    if (key === 'Enter') {
      check()
      return true
    }
    if (key === 'Backspace') {
      setPlaced((p) => p.slice(0, -1))
      return true
    }
    if (key === 'Escape') {
      setPlaced([])
      return true
    }
    if (/^[1-9]$/.test(key)) {
      const h = heap[Number(key) - 1] as (typeof heap)[number] | undefined
      if (!h) return
      setPlaced((p) => [...p, h.k])
      return true
    }
  })

  const face = (t: Token) => {
    const lv = tokenLevel(t, levelOf)
    return lv === 0 ? (
      <span className="text-base italic">{t.gloss}</span>
    ) : lv === 1 ? (
      <ruby className="zh text-2xl">
        {t.h}
        <rt>{join(t.pinyin)}</rt>
      </ruby>
    ) : (
      <span className="zh text-2xl">{t.h}</span>
    )
  }

  // The row as shown: without the tile being dragged out of it, with a gap
  // where the one being dragged would go
  const shownRow: Array<number | 'gap'> =
    drag?.from === 'row' ? placed.filter((k) => k !== drag.key) : [...placed]
  if (drag && gap !== null) shownRow.splice(gap, 0, 'gap')

  const tileLook = (k: number, at: number) => {
    if (!result) return 'border-[#eadcc2] bg-white'
    if (result.ok) return 'border-[var(--jade)] bg-[#e3f0ea]'
    if (!fixed) return 'border-[var(--red)] bg-[#f8e1dc]'
    const mineAt = result.mine[at] as number | undefined
    return mineAt !== undefined && tokenOf(mineAt).h === tokenOf(k).h
      ? 'border-[var(--jade)] bg-[#e3f0ea]'
      : 'border-[var(--gold)] bg-[#fbefd5]'
  }

  return (
    <Frame
      title="Word order"
      zh="语序"
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
        ref={root}
        className={`zh-card relative p-5 sm:p-6 ${leaving ? 'fx-leave' : 'fx-enter'}`}
      >
        <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
          Say it in Chinese order
        </p>
        <p className="mt-1 text-2xl leading-tight font-black">
          {english(line.en, homeName)}
        </p>

        <div
          ref={row}
          aria-label="Your line"
          className={`mt-5 flex min-h-[4.75rem] flex-wrap items-end gap-2 rounded-2xl border-2 border-dashed p-3 transition-colors ${result === null ? (drag && gap !== null ? 'border-[var(--gold)] bg-[#fdf3dc]' : 'border-[var(--paper-2)] bg-[var(--paper)]/60') : result.ok ? 'border-[var(--jade)] bg-[var(--jade)]/5' : 'border-[var(--red)] bg-[var(--red)]/5'}`}
        >
          {shownRow.map((k, at) =>
            k === 'gap' ? (
              <span
                key="gap"
                data-flip="gap"
                className="h-12 rounded-xl border-2 border-dashed border-[var(--gold)] bg-[var(--gold)]/10"
                style={{ width: drag?.w ?? 48 }}
              />
            ) : (
              <button
                key={k}
                data-flip={k}
                data-tile=""
                type="button"
                disabled={result !== null}
                onPointerDown={(e) => grab(e, k, 'row')}
                onClick={() => tap(k, 'row')}
                className={`touch-none rounded-xl border px-3 py-2 shadow-[0_3px_0_#e3d4b8] transition-colors select-none ${tileLook(k, at)} ${drag?.key === k ? 'opacity-30' : ''}`}
              >
                {face(tokenOf(k))}
              </button>
            ),
          )}
          {placed.length === words.length && !drag && (
            <span className="zh pb-2 text-2xl">{end}</span>
          )}
          {!placed.length && !drag && (
            <span className="pointer-events-none self-center text-sm text-[var(--ink-2)]">
              Tap or drag the words here, in order
            </span>
          )}
        </div>

        <div
          aria-label="Words to use"
          className={`flex flex-wrap gap-2 ${result === null ? 'mt-4 min-h-[3.5rem]' : ''}`}
        >
          {heap.map((x, n) => (
            <button
              key={x.k}
              data-flip={x.k}
              type="button"
              disabled={result !== null}
              onPointerDown={(e) => grab(e, x.k, 'heap')}
              onClick={() => tap(x.k, 'heap')}
              className={`relative touch-none rounded-xl border border-transparent bg-[var(--paper-2)]/70 px-3 py-2 shadow-[0_3px_0_#e3d4b8] transition select-none hover:-translate-y-0.5 hover:bg-[var(--paper-2)] ${drag?.key === x.k ? 'opacity-30' : ''}`}
            >
              {n < 9 && (
                <Key
                  k={String(n + 1)}
                  className="absolute -top-2 -left-2 scale-90"
                />
              )}
              {face(x.t)}
            </button>
          ))}
        </div>

        {result === null ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Btn onClick={check} disabled={placed.length !== words.length}>
              Check{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
            <Btn kind="ghost" onClick={() => setPlaced([])}>
              Clear <Key k="Esc" />
            </Btn>
            <Btn kind="ghost" onClick={next} className="ml-auto">
              Skip
            </Btn>
          </div>
        ) : (
          <div className="fx-rise mt-5">
            <p
              className={`font-black ${result.ok ? 'text-[var(--jade)]' : 'text-[var(--red)]'}`}
            >
              {result.ok ? 'Right' : 'The trip says it like this:'}
            </p>
            <div className="mt-2">
              <Mixed line={line.zh} all={1} />
            </div>
            <Btn onClick={next} className="mt-4">
              Next{' '}
              <Key
                k="Enter"
                className="ml-1 border-white/30 bg-white/15 text-white"
              />
            </Btn>
          </div>
        )}
      </div>
      {drag && (
        <div
          ref={ghost}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 z-[60]"
          style={{
            width: drag.w,
            height: drag.h,
            transform: `translate(${drag.x0 - drag.dx}px, ${drag.y0 - drag.dy}px)`,
          }}
        >
          <div className="flex h-full w-full rotate-[-3deg] items-center justify-center rounded-xl border border-[var(--gold)] bg-white px-3 py-2 shadow-[0_14px_30px_-10px_rgba(34,28,24,0.45)]">
            {face(tokenOf(drag.key))}
          </div>
        </div>
      )}
      {!bank.cards['我'] && (
        <p className="mt-3 text-sm text-[var(--ink-2)]">
          Words you have not met show in English. Learn some, and the tiles turn
          Chinese.
        </p>
      )}
      <p className="mt-3 text-xs text-[var(--ink-2)] max-sm:hidden">
        <Key k="1" />–<Key k="9" /> to place a word, <Key k="Backspace" /> to
        take the last back
      </p>
    </Frame>
  )
}
