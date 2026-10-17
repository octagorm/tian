import { useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import { QUEST, TWISTS } from '../data/quest'
import { useStore } from '../lib/store'
import { Btn, Frame, Sprinkled, Stars } from '../ui'
import { heroOf, isOpen } from './hero'
import { Art, Icon } from './Icon'
import { MAP_H, WorldMap } from './map'
import './quest.css'

// The quest's home: the map of the road west with the party on it, the
// chapter chosen, and the way to Wukong's own page. Keys: the arrows choose
// a stop, Enter sets out, W opens Wukong's page.
export function MapScreen({
  selected,
  from,
  onSelect,
  onStart,
  onHero,
}: {
  selected: number
  // The stop the party walks from, after a fight
  from: number | null
  onSelect: (i: number) => void
  onStart: (i: number) => void
  onHero: () => void
}) {
  const { bank } = useStore()
  const hero = heroOf(bank)
  const box = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLCanvasElement>(null)
  const map = useRef<WorldMap | null>(null)
  const open = QUEST.map((_, i) => isOpen(bank, i))
  const won = QUEST.map((c) => hero.won(c.id))
  // The red line runs to the last stop won (or the one just fought)
  const lastWon = Math.max(0, won.lastIndexOf(true))

  useEffect(() => {
    const c = ref.current
    const b = box.current
    if (!c || !b) return
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const m = new WorldMap(c, reduced)
    map.current = m
    const fit = () => {
      const W = b.clientWidth < 520 ? 240 : 320
      if (c.width === W) return
      c.width = W
      c.height = MAP_H
      c.style.aspectRatio = `${W} / ${MAP_H}`
      m.resize(W)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(b)
    let onScreen = true
    const show = () => m.setVisible(onScreen && !document.hidden)
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
      show()
    })
    io.observe(c)
    document.addEventListener('visibilitychange', show)
    m.start()
    return () => {
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', show)
      m.destroy()
      map.current = null
    }
  }, [])

  useEffect(() => {
    map.current?.set({
      ids: QUEST.map((c) => c.id),
      won,
      open,
      stars: QUEST.map((c) => bank.scenes[c.id] ?? 0),
      selected,
      reached: from ?? lastWon,
      party: hero.party,
      done: won.every(Boolean),
    })
  }, [bank, selected])

  const step = (dir: 1 | -1) => {
    for (let i = selected + dir; i >= 0 && i < QUEST.length; i += dir)
      if (open[i]) return onSelect(i)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        step(1)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        step(-1)
      } else if (e.key === 'Enter' && open[selected]) {
        e.preventDefault()
        onStart(selected)
      } else if (e.key === 'w' || e.key === 'W') onHero()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const c = QUEST[selected]
  const stars = bank.scenes[c.id] ?? 0
  return (
    <Frame
      title="Journey to the West"
      zh="西游记"
      right={
        <button
          type="button"
          onClick={onHero}
          aria-label={`Wukong, level ${hero.level}`}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--paper-2)] py-1 pr-2.5 pl-1 font-bold hover:brightness-95"
        >
          <Art name="portrait" height={32} className="rounded-lg" />
          <span className="text-sm whitespace-nowrap">
            <span className="hidden sm:inline">Wukong · </span>Lv {hero.level}
          </span>
          <span className="quest-key rounded border border-[var(--ink)]/25 px-1 text-[10px]">
            W
          </span>
        </button>
      }
    >
      <div className="overflow-hidden rounded-2xl ring-4 ring-[var(--ink)]">
        <div ref={box} className="relative bg-[#2a2030]">
          <canvas
            ref={ref}
            width={320}
            height={MAP_H}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const i =
                map.current?.hit(
                  (e.clientX - r.left) / r.width,
                  (e.clientY - r.top) / r.height,
                ) ?? -1
              if (i >= 0 && open[i]) onSelect(i)
            }}
            className="block w-full cursor-pointer"
            style={{
              imageRendering: 'pixelated',
              aspectRatio: `320 / ${MAP_H}`,
            }}
            aria-label="The map of the road west"
          />
          <span className="quest-dark absolute top-2 left-2 rounded-md !bg-[#1b1418]/70 px-1.5 py-0.5 text-xs">
            ← <Sprinkled text="{西}" />
          </span>
          <span className="quest-dark absolute top-2 right-2 rounded-md !bg-[#1b1418]/70 px-1.5 py-0.5 text-xs">
            <Sprinkled text="{东}" /> →
          </span>
        </div>
        <div className="quest-dark flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:px-5">
          <div className="flex h-24 w-16 shrink-0 items-end justify-center sm:w-20">
            {open[selected] ? (
              <Art
                name={c.demon.art}
                height={Math.min(96, 72 + Math.round(c.demon.hp / 10))}
              />
            ) : (
              <Lock size={28} className="mb-8 text-[var(--ink-2)]" />
            )}
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <p className="text-xs font-bold tracking-widest text-[var(--gold)] uppercase">
              Chapter {selected + 1} · {c.place}
            </p>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="zh text-2xl text-[#ff8a7a]">{c.zh}</span>
              <span className="text-lg font-black">{c.title}</span>
            </p>
            {open[selected] ? (
              <p className="mt-0.5 text-sm text-[var(--ink-2)]">
                {TWISTS[c.demon.twist]}
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-[var(--ink-2)]">
                Win the chapter before it to come this far.
              </p>
            )}
            {stars > 0 && (
              <div className="mt-1">
                <Stars n={stars} />
              </div>
            )}
          </div>
          {open[selected] && (
            <Btn
              onClick={() => onStart(selected)}
              className="w-full shrink-0 self-end sm:w-auto"
            >
              {stars ? 'Again' : 'Set out'}
              <span className="quest-key ml-1 rounded border border-white/30 px-1 text-[10px]">
                Enter
              </span>
            </Btn>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {QUEST.map((ch, i) => (
          <button
            key={ch.id}
            type="button"
            disabled={!open[i]}
            onClick={() => onSelect(i)}
            className={`zh-card flex items-center gap-3 px-3 py-2 text-left transition enabled:hover:-translate-y-0.5 disabled:opacity-45 ${i === selected ? 'ring-2 ring-[var(--gold)]' : ''}`}
          >
            <span className="w-5 shrink-0 text-right text-xs font-bold text-[var(--ink-2)] tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-1.5">
                <span className="zh shrink-0 whitespace-nowrap text-[var(--red)]">
                  {ch.zh}
                </span>
                <span className="truncate text-sm font-bold">{ch.title}</span>
              </span>
            </span>
            {won[i] ? (
              <Stars n={bank.scenes[ch.id] ?? 0} />
            ) : open[i] ? (
              <Icon name="star" size={18} className="opacity-30 grayscale" />
            ) : (
              <Lock size={14} className="text-[var(--ink-2)]" />
            )}
          </button>
        ))}
      </div>
      <p className="mt-5 text-sm text-[var(--ink-2)]">
        Walk west with the monk Tang Sanzang and the Monkey King, Sun Wukong,
        through the demons of the 16th-century novel. Your blows are words: the
        better you know them, the harder you hit. Every ten words you meet is a
        level, and as words become known, Wukong remembers his old arts.
      </p>
    </Frame>
  )
}
