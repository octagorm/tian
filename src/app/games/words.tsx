import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { LESSONS, WORDS } from '../data/words'
import { bare, syllables } from '../lib/pinyin'
import { LINKS, level, recallOf, stage } from '../lib/bank'
import { useStore } from '../lib/store'
import {
  Btn,
  Frame,
  LEVEL_COLOR,
  LEVEL_NAME,
  LINK_NAME,
  LinkBars,
  Ruby,
  STAGE_COLOR,
  usePeek,
} from '../ui'
import { Key, useKeys } from './fx'
import type { Card, Level } from '../lib/bank'
import type { Word } from '../data/words'

// The word bank: every word, coloured by how well it is known, with how
// much of each of its links is remembered now. Search by hanzi, pinyin (tones or not) or
// English; filter by level, lesson or kind; sort by lesson or by fading.
// Words can be marked as known (for what the player knew before) or
// forgotten, a lesson at a time.

type LevelFilter = 'all' | Level
type Sort = 'lesson' | 'fading' | 'recent'

const KINDS: Array<{ id: string; label: string; tags: Array<string> }> = [
  { id: 'all', label: 'Every kind', tags: [] },
  { id: 'mw', label: 'Measure words', tags: ['mw'] },
  { id: 'food', label: 'Food and drink', tags: ['food', 'drink'] },
  { id: 'place', label: 'Places and countries', tags: ['place', 'country'] },
  { id: 'name', label: 'Names', tags: ['name'] },
  { id: 'q', label: 'Question words', tags: ['q'] },
  { id: 'part', label: 'Particles', tags: ['part'] },
  { id: 'num', label: 'Numbers', tags: ['num'] },
]

// What a search can match: the hanzi, the pinyin with and without tones,
// the gloss and the meaning
function matcher(query: string): ((w: Word) => boolean) | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const flat = q.replace(/[\s'’]/g, '')
  const letters = flat.replace(/[1-5]/g, '').replaceAll('ü', 'v')
  return (w) => {
    if (w.h.includes(q)) return true
    const sylls = syllables(w.p)
    const marked = sylls.join('').toLowerCase()
    const plain = sylls.map(bare).join('').toLowerCase().replaceAll('ü', 'v')
    if (flat && (marked.includes(flat) || (letters && plain.includes(letters))))
      return true
    return w.g.toLowerCase().includes(q) || w.e.toLowerCase().includes(q)
  }
}

export default function Words() {
  const { bank, know, forget } = useStore()
  const peek = usePeek()
  const [query, setQuery] = useState('')
  const [lv, setLv] = useState<LevelFilter>('all')
  const [kind, setKind] = useState('all')
  const [lesson, setLesson] = useState(0)
  const [sort, setSort] = useState<Sort>('lesson')
  const search = useRef<HTMLInputElement>(null)
  const now = Date.now()

  const counts = [0, 0, 0]
  const stages = [0, 0, 0, 0]
  for (const w of WORDS) {
    counts[level(bank.cards[w.id], now)]++
    stages[stage(bank.cards[w.id], now)]++
  }

  const match = useMemo(() => matcher(query), [query])
  const tags = KINDS.find((k) => k.id === kind)?.tags ?? []
  const shown = WORDS.filter(
    (w) =>
      (lv === 'all' || level(bank.cards[w.id], now) === lv) &&
      (!lesson || w.lesson === lesson) &&
      (!tags.length || w.tags.some((t) => tags.includes(t))) &&
      (!match || match(w)),
  )
  const filtered =
    query.trim() !== '' || lv !== 'all' || kind !== 'all' || lesson !== 0

  // "/" to search, as on many sites
  useKeys((key) => {
    if (key !== '/') return
    search.current?.focus()
    return true
  })

  const clear = () => {
    setQuery('')
    setLv('all')
    setKind('all')
    setLesson(0)
  }

  return (
    <Frame title="Word bank" zh="词库" wide>
      <Summary stages={stages} />

      <div className="sticky top-0 z-20 -mx-4 mt-4 mb-5 bg-[var(--paper)]/92 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 basis-60">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ink-2)]"
            />
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setQuery('')
                  e.currentTarget.blur()
                }
              }}
              type="text"
              inputMode="search"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Search hanzi, pinyin or English"
              aria-label="Search words"
              className="w-full rounded-xl border-2 border-[var(--paper-2)] bg-white py-2 pr-10 pl-10 outline-none focus:border-[var(--jade)]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear the search"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
              >
                <X size={16} />
              </button>
            ) : (
              <Key
                k="/"
                className="absolute top-1/2 right-3 -translate-y-1/2"
              />
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 0, 1, 2] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLv(f)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition ${lv === f ? 'bg-[var(--ink)] text-[var(--paper)] shadow' : 'bg-[var(--paper-2)] hover:brightness-95'}`}
              >
                {f !== 'all' && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: LEVEL_COLOR[f] }}
                  />
                )}
                {f === 'all' ? 'All' : LEVEL_NAME[f]}
                <span className="font-normal opacity-70 tabular-nums">
                  {f === 'all' ? WORDS.length : counts[f]}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Select
            value={String(lesson)}
            onChange={(v) => setLesson(Number(v))}
            label="Lesson"
            options={[
              ['0', 'Every lesson'],
              ...LESSONS.map((l): [string, string] => [
                String(l.n),
                `${l.n}. ${l.title}`,
              ]),
            ]}
          />
          <Select
            value={kind}
            onChange={setKind}
            label="Kind"
            options={KINDS.map((k): [string, string] => [k.id, k.label])}
          />
          <Select
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            label="Order"
            options={[
              ['lesson', 'By lesson'],
              ['fading', 'Most faded first'],
              ['recent', 'Seen last first'],
            ]}
          />
          <span className="ml-auto text-[var(--ink-2)]">
            {filtered
              ? `${shown.length} of ${WORDS.length}`
              : 'Tap a word to hear it'}
            {filtered && (
              <button
                type="button"
                onClick={clear}
                className="ml-2 font-bold text-[var(--red)] hover:underline"
              >
                Clear
              </button>
            )}
          </span>
        </div>
      </div>

      {!shown.length && (
        <div className="zh-card fx-rise p-8 text-center text-[var(--ink-2)]">
          No words match.{' '}
          <button
            type="button"
            onClick={clear}
            className="font-bold text-[var(--red)] hover:underline"
          >
            Show them all
          </button>
        </div>
      )}

      {sort === 'lesson' ? (
        LESSONS.map((l) => {
          const ws = shown.filter((w) => w.lesson === l.n)
          if (!ws.length) return null
          const ids = WORDS.filter((w) => w.lesson === l.n).map((w) => w.id)
          const met = ids.filter((id) => bank.cards[id]).length
          const k = ids.filter((id) => level(bank.cards[id], now) === 2).length
          return (
            <section key={l.n} className="mb-7">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="zh text-2xl text-[var(--red)]">{l.zh}</span>
                <h2 className="text-lg font-black">
                  {l.n}. {l.title}
                </h2>
                <span className="text-xs text-[var(--ink-2)] tabular-nums">
                  {k} known · {met - k} learning · {ids.length - met} new
                </span>
                <span className="ml-auto flex gap-1">
                  <Btn
                    kind="ghost"
                    className="px-2 py-0.5 text-xs"
                    onClick={() => know(ids)}
                  >
                    I know these
                  </Btn>
                  <Btn
                    kind="ghost"
                    className="px-2 py-0.5 text-xs"
                    onClick={() => forget(ids)}
                  >
                    Reset
                  </Btn>
                </span>
              </div>
              <Grid words={ws} now={now} onPeek={peek} />
            </section>
          )
        })
      ) : (
        <Grid
          words={sorted(shown, sort, bank.cards, now)}
          now={now}
          onPeek={peek}
        />
      )}
    </Frame>
  )
}

function sorted(
  ws: Array<Word>,
  sort: Sort,
  cards: Record<string, Card | undefined>,
  now: number,
): Array<Word> {
  const key = (w: Word) => {
    const c = cards[w.id]
    if (!c) return Infinity
    return sort === 'fading' ? recallOf(c, now) : -c.t
  }
  return [...ws].sort((a, b) => key(a) - key(b))
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  options: Array<[string, string]>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="max-w-[12rem] cursor-pointer rounded-lg border-2 border-[var(--paper-2)] bg-white px-2 py-1.5 font-bold outline-none focus:border-[var(--jade)]"
    >
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  )
}

function Grid({
  words,
  now,
  onPeek,
}: {
  words: Array<Word>
  now: number
  onPeek: (id: string) => void
}) {
  const { bank } = useStore()
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {words.map((w) => {
        const c = bank.cards[w.id]
        const lv = level(c, now)
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => onPeek(w.id)}
            className="zh-card group relative flex flex-col items-center gap-1 overflow-hidden px-2 pt-3 pb-2.5 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: LEVEL_COLOR[lv] }}
            />
            <Ruby h={w.h} p={w.p} className="text-2xl" />
            <span className="line-clamp-1 text-xs text-[var(--ink-2)]">
              {w.g}
            </span>
            {c ? (
              <span className="mt-0.5 w-full px-1">
                <LinkBars card={c} now={now} />
              </span>
            ) : (
              <span className="mt-0.5 text-[10px] text-[var(--ink-2)]/70">
                not met
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Known, learning (with its English, or its pinyin alone) and new as one
// bar that grows in, with the counts
function Summary({ stages }: { stages: Array<number> }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const total = stages.reduce((a, b) => a + b, 0)
  const parts = [
    { n: stages[3], color: LEVEL_COLOR[2], label: 'known', sub: 'hanzi alone' },
    {
      n: stages[2],
      color: STAGE_COLOR[2],
      label: 'meaning learnt',
      sub: 'hanzi and pinyin',
    },
    {
      n: stages[1],
      color: STAGE_COLOR[1],
      label: 'learning',
      sub: 'with English',
    },
    { n: stages[0], color: '#d8cdb8', label: 'to meet', sub: 'not met yet' },
  ]
  return (
    <div className="zh-card fx-rise p-5">
      <div className="flex h-4 overflow-hidden rounded-full bg-[var(--paper-2)]">
        {parts.map((p, i) => (
          <div
            key={p.label}
            className="h-full transition-[width] duration-1000 ease-out"
            style={{
              width: shown ? `${(p.n / total) * 100}%` : '0%',
              background: p.color,
              transitionDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {parts.map((p) => (
          <div key={p.label} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              <span className="text-2xl font-black tabular-nums">{p.n}</span>
            </div>
            <div className="text-sm leading-tight font-bold">{p.label}</div>
            <div className="text-xs leading-tight text-[var(--ink-2)]">
              {p.sub}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-dashed border-[var(--paper-2)] pt-3 text-xs leading-relaxed text-[var(--ink-2)]">
        Each word has three links, remembered apart:{' '}
        {LINKS.map((l, i) => (
          <span key={l}>
            {i > 0 && ' · '}
            <span className="zh text-sm text-[var(--ink)]">
              {LINK_NAME[l].zh}
            </span>{' '}
            {LINK_NAME[l].en}
          </span>
        ))}
        . A word is known once its character brings back both its sound and its
        meaning.
      </p>
    </div>
  )
}
