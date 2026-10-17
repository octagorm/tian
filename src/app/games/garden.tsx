import { useMemo, useState } from 'react'
import { Check, Eye, Sprout, Volume2 } from 'lucide-react'
import { LESSONS, WORD } from '../data/words'
import {
  DAYTIMES,
  GARDEN_ITEMS,
  NIGHT_LINE,
  SEASONS,
  SEASON_LINES,
  daytimeOf,
  seasonOf,
} from '../data/garden'
import { GROWN, gardenSize, grownCount, growth } from '../lib/garden'
import { plain } from '../lib/text'
import { say } from '../lib/audio'
import { WORD_VOICE } from '../lib/speech'
import { useStore } from '../lib/store'
import { Btn, Frame, Mixed, usePeek } from '../ui'
import { GardenCanvas } from '../garden/Garden'
import { pick } from '../garden/draw'
import { sceneOf } from '../garden/scene'
import type { Daytime, GardenItem, Season } from '../data/garden'
import type { LessonGrowth } from '../lib/garden'

// The garden: a courtyard that fills as lessons are learnt (data/garden.ts,
// lib/garden.ts). It follows the real season and hour, which can be
// changed here to look; tapping a thing shows its word.

export default function Garden() {
  const { bank, settings } = useStore()
  const peek = usePeek()
  const now = Date.now()
  const [season, setSeason] = useState<Season | null>(null)
  const [daytime, setDaytime] = useState<Daytime | null>(null)
  const [picked, setPicked] = useState<LessonGrowth | null>(null)
  // The garden as it will be, everything grown, to look forward to
  const [preview, setPreview] = useState(false)
  const mine = sceneOf(bank, now, season ?? undefined, daytime ?? undefined)
  const scene = preview
    ? {
        ...mine,
        stages: Object.fromEntries(GARDEN_ITEMS.map((g) => [g.id, 2])),
      }
    : mine
  const rows = useMemo(() => growth(bank, now), [bank])
  const line =
    scene.daytime === 'night' && scene.season !== 'summer'
      ? NIGHT_LINE
      : SEASON_LINES[scene.season]

  const onPick = (x: number, y: number) => {
    const id = pick(scene, x, y)
    const row = rows.find((r) => r.item.id === id)
    if (!row) return
    setPicked(row)
    if (row.item.word && WORD[row.item.word]) peek(row.item.word)
    else void say(row.item.zh, WORD_VOICE)
  }

  return (
    <Frame title="The garden" zh="花园" wide>
      <div
        className="overflow-hidden rounded-2xl p-1.5 shadow-lg"
        style={{ background: 'linear-gradient(#5a3a28, #3e281c)' }}
      >
        <div className="overflow-hidden rounded-xl border-2 border-[#2a1a12]">
          <GardenCanvas
            scene={scene}
            onPick={onPick}
            label={`The garden, with ${grownCount(bank)} things grown`}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void say(plain(line.zh, settings), WORD_VOICE)}
            className="rounded-full p-1.5 text-[var(--jade)] hover:bg-[var(--paper-2)]"
            aria-label="Hear it"
          >
            <Volume2 size={18} />
          </button>
          <Mixed line={line.zh} size="sm" />
        </div>
        <p className="text-sm text-[var(--ink-2)] italic">{line.en}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chips
          options={SEASONS}
          value={scene.season}
          real={seasonOf(new Date(now))}
          onChange={(v) => setSeason(v)}
        />
        <Chips
          options={DAYTIMES}
          value={scene.daytime}
          real={daytimeOf(new Date(now))}
          onChange={(v) => setDaytime(v)}
        />
        {(season || daytime) && (
          <Btn
            kind="ghost"
            className="px-3 py-1 text-sm"
            onClick={() => {
              setSeason(null)
              setDaytime(null)
            }}
          >
            Now
          </Btn>
        )}
        <Btn
          kind={preview ? 'dark' : 'ghost'}
          className="px-3 py-1 text-sm sm:ml-auto"
          onClick={() => setPreview((v) => !v)}
        >
          <Eye size={15} /> {preview ? 'Back to mine' : 'See it grown'}
        </Btn>
      </div>

      {picked && <Picked row={picked} onClose={() => setPicked(null)} />}

      <section className="mt-6">
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="text-xl font-black">What grows here</h2>
          <span className="text-sm text-[var(--ink-2)]">
            {grownCount(bank)} of {gardenSize()} grown
          </span>
        </div>
        <p className="mb-3 max-w-2xl text-sm text-[var(--ink-2)]">
          Each lesson grows one thing. It starts once the lesson’s words are
          under way, and is grown when four in five of them are known. Grown
          things stay, even when words fade.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <Row key={r.lesson} row={r} onClick={() => setPicked(r)} />
          ))}
        </div>
      </section>
    </Frame>
  )
}

function Chips<T extends string>({
  options,
  value,
  real,
  onChange,
}: {
  options: Array<{ id: T; name: string; zh: string }>
  value: T
  real: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-xl bg-[var(--paper-2)] p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-[0.6rem] px-2.5 py-1 text-sm font-bold transition ${
            o.id === value
              ? 'bg-[#fffaf1] text-[var(--ink)] shadow-sm'
              : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
          }`}
          title={o.id === real ? `${o.name} – now` : o.name}
        >
          <span className="zh mr-1 font-normal text-[var(--red)]">{o.zh}</span>
          <span className="hidden sm:inline">{o.name}</span>
          {o.id === real && (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--jade)] align-middle" />
          )}
        </button>
      ))}
    </div>
  )
}

function status(r: LessonGrowth) {
  if (r.stage >= 2) return 'Grown'
  if (r.stage === 1)
    return `Growing: ${r.known} of ${r.size} words known, grown at ${Math.ceil(r.size * GROWN)}`
  return `${r.met} of ${r.size} words met`
}

function Row({ row, onClick }: { row: LessonGrowth; onClick: () => void }) {
  const lesson = LESSONS.find((l) => l.n === row.lesson)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`zh-card flex w-full min-w-0 items-center gap-3 p-3 text-left transition hover:-translate-y-0.5 ${row.stage ? '' : 'opacity-75'}`}
    >
      <span
        className={`zh flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
          row.stage >= 2
            ? 'bg-[var(--jade)] text-white'
            : row.stage === 1
              ? 'bg-[var(--jade)]/15 text-[var(--jade)]'
              : 'bg-[var(--paper-2)] text-[var(--ink-2)]'
        }`}
      >
        {row.item.zh.length > 2 ? row.item.zh.slice(0, 2) : row.item.zh}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="font-bold">{row.item.name}</span>
          {row.stage >= 2 && <Check size={15} className="text-[var(--jade)]" />}
          {row.stage === 1 && (
            <Sprout size={15} className="text-[var(--jade)]" />
          )}
        </span>
        <span className="block truncate text-xs text-[var(--ink-2)]">
          Lesson {row.lesson}
          {lesson ? `, ${lesson.title}` : ''} · {status(row)}
        </span>
        {row.stage < 2 && (
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--paper-2)]">
            <span
              className="block h-full rounded-full bg-[var(--jade)]"
              style={{ width: `${Math.round(row.toward * 100)}%` }}
            />
          </span>
        )}
      </span>
    </button>
  )
}

function Picked({ row, onClose }: { row: LessonGrowth; onClose: () => void }) {
  const item: GardenItem = row.item
  const lesson = LESSONS.find((l) => l.n === row.lesson)
  return (
    <div className="zh-card zh-rise mt-4 flex flex-wrap items-center gap-4 p-4">
      <div className="text-center">
        <div className="zh text-4xl">{item.zh}</div>
        <div className="text-sm text-[var(--jade)]">{item.py}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black">{item.name}</p>
        <p className="text-sm text-[var(--ink-2)]">
          From lesson {row.lesson}
          {lesson ? `, ${lesson.title} (${lesson.zh})` : ''}. {status(row)}.
        </p>
      </div>
      <div className="flex gap-2">
        <Btn kind="ghost" onClick={() => void say(item.zh, WORD_VOICE)}>
          <Volume2 size={16} /> Hear it
        </Btn>
        {row.stage < 2 && (
          <a href="#learn">
            <Btn>Learn</Btn>
          </a>
        )}
        <Btn kind="ghost" onClick={onClose}>
          Close
        </Btn>
      </div>
    </div>
  )
}
