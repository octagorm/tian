import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Play, Square, Volume2, X } from 'lucide-react'
import { WORDS } from '../data/words'
import {
  CONTRASTS,
  FINALS,
  GRID,
  INITIALS,
  TABLE_FINALS,
  TABLE_INITIALS,
  WHOLE,
  frames,
  nameOf,
  parts,
  tonesOf,
} from '../data/pinyin'
import { bare, mark, syllables } from '../lib/pinyin'
import { blip } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Ruby, shuffle } from '../ui'
import { RoundDone } from '../quiz'
import {
  Combo,
  Key,
  PlayButton,
  cheer,
  reducedMotion,
  useKeys,
  useSpeaker,
} from './fx'
import { ToneGlyph } from './tones'
import type { Contrast, Sound, SoundGroup } from '../data/pinyin'
import type { Word } from '../data/words'

// Pinyin: the chart children in China learn first (拼音字母表): every
// initial, final and syllable read whole, to hear one by one, with how to
// say it and a way to hear yourself beside it; the table of every
// syllable in its four tones; and ear training on the sounds that are
// easy to confuse.

type Tab = 'chart' | 'table' | 'ears'

const TABS: Array<{ id: Tab; title: string; zh: string }> = [
  { id: 'chart', title: 'Chart', zh: '字母表' },
  { id: 'table', title: 'All syllables', zh: '音节表' },
  { id: 'ears', title: 'Ear training', zh: '练耳' },
]

const TAB_KEY = 'tian:pinyin-tab'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function Pinyin() {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const t = localStorage.getItem(TAB_KEY)
      return t === 'table' || t === 'ears' ? t : 'chart'
    } catch {
      return 'chart'
    }
  })
  const choose = (t: Tab) => {
    setTab(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      // private mode
    }
  }
  // Ear training on some sounds, from a sound's card
  const [focus, setFocus] = useState<Array<string> | null>(null)
  return (
    <Frame title="Pinyin" zh="拼音" wide={tab === 'table'}>
      <div
        role="tablist"
        className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-[var(--paper-2)] p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => choose(t.id)}
            className={`rounded-xl px-2 py-2 text-sm font-bold transition sm:text-base ${
              tab === t.id
                ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm'
                : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            <span className="zh mr-1.5 font-normal text-[var(--red)]">
              {t.zh}
            </span>
            {t.title}
          </button>
        ))}
      </div>
      {tab === 'chart' ? (
        <Chart
          onTrain={(ids) => {
            setFocus(ids)
            choose('ears')
          }}
        />
      ) : tab === 'table' ? (
        <Table />
      ) : (
        <Ears focus={focus} />
      )}
    </Frame>
  )
}

// --- The chart: initials, finals, syllables read whole

function Chart({ onTrain }: { onTrain: (contrasts: Array<string>) => void }) {
  const [open, setOpen] = useState<{ kind: Kind; id: string } | null>(null)
  const { play } = useSpeaker()
  const section = (
    kind: Kind,
    title: string,
    zh: string,
    pinyin: string,
    groups: Array<SoundGroup>,
  ) => (
    <section className="mb-8">
      <h2 className="mb-3 flex items-baseline gap-2">
        <span className="zh text-2xl text-[var(--red)]">{zh}</span>
        <span className="text-xl font-black">{title}</span>
        <span className="text-sm text-[var(--ink-2)]">{pinyin}</span>
      </h2>
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.id}>
            <p className="mb-1.5 text-sm">
              <span className="font-bold">{g.title}</span>{' '}
              <span className="zh text-[var(--ink-2)]">{g.zh}</span>
              <span className="text-[var(--ink-2)]"> – {g.note}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {g.sounds.map((s) => {
                const on = open?.kind === kind && open.id === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setOpen(on ? null : { kind, id: s.id })
                      void play(kind === 'initial' ? nameOf(s) : mark(s.say, 1))
                    }}
                    aria-expanded={on}
                    className={`flex min-w-[4.25rem] flex-col items-center rounded-2xl border-2 px-3 py-2 transition hover:-translate-y-0.5 ${
                      on
                        ? 'border-[var(--red)] bg-[var(--card)] shadow-md'
                        : 'border-[var(--paper-2)] bg-[var(--paper)] shadow-[0_3px_0_var(--paper-2)] hover:border-[var(--gold)]'
                    }`}
                  >
                    <span className="text-2xl leading-tight font-black">
                      {s.id}
                    </span>
                    <span className="text-xs text-[var(--ink-2)]">
                      {kind === 'initial' ? nameOf(s) : s.say}
                    </span>
                  </button>
                )
              })}
            </div>
            {open && g.sounds.some((s) => s.id === open.id) && (
              <SoundCard
                key={`${open.kind}-${open.id}`}
                kind={open.kind}
                sound={g.sounds.find((s) => s.id === open.id) as Sound}
                group={g}
                onTrain={onTrain}
                onClose={() => setOpen(null)}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  )
  return (
    <>
      <p className="mb-6 text-[var(--ink-2)]">
        Pinyin spells a syllable as an initial and a final, with a tone over it.
        This is the chart children in China learn first: tap a sound to hear it,
        and open it for how to say it.
      </p>
      {section('initial', 'Initials', '声母', 'shēngmǔ', INITIALS)}
      {section('final', 'Finals', '韵母', 'yùnmǔ', FINALS)}
      {section('whole', 'Read whole', '整体认读音节', 'zhěngtǐ rèndú yīnjié', [
        WHOLE,
      ])}
    </>
  )
}

type Kind = 'initial' | 'final' | 'whole'

// The contrasts a sound is part of
const contrastsOf = (id: string) =>
  CONTRASTS.filter((c) => c.kind !== 'tone' && c.sounds.includes(id))

function SoundCard({
  kind,
  sound,
  group,
  onTrain,
  onClose,
}: {
  kind: Kind
  sound: Sound
  group: SoundGroup
  onTrain: (contrasts: Array<string>) => void
  onClose: () => void
}) {
  const { play } = useSpeaker()
  const card = useRef<HTMLDivElement>(null)
  useEffect(() => {
    card.current?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion() ? 'auto' : 'smooth',
    })
  }, [])
  // A syllable read whole trains with its initial: zhi with zh
  const contrasts = contrastsOf(
    kind === 'whole' ? parts(sound.id).initial || sound.id : sound.id,
  )
  const examples = useExamples(kind, sound.id)
  // Syllables made with an initial, to hear it in use
  const made =
    kind === 'initial'
      ? TABLE_FINALS.flatMap((f) => GRID[f]?.[sound.id] ?? [])
          .filter((s) => s !== sound.say)
          .slice(0, 10)
      : []
  return (
    <div
      ref={card}
      className="zh-card fx-rise relative mt-3 p-4 sm:p-5"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 rounded-full p-2 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
        aria-label="Close"
      >
        <X size={18} />
      </button>
      <div className="flex items-baseline gap-3 pr-8">
        <span className="text-5xl font-black">{sound.id}</span>
        <span className="text-[var(--ink-2)]">
          {kind === 'initial' ? (
            <>
              called <b className="text-[var(--ink)]">{nameOf(sound)}</b>
            </>
          ) : sound.say !== sound.id ? (
            <>
              on its own <b className="text-[var(--ink)]">{sound.say}</b>
            </>
          ) : (
            group.title.toLowerCase()
          )}
        </span>
      </div>
      <p className="mt-2 leading-relaxed">{sound.tip}</p>
      {kind === 'initial' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Btn onClick={() => void play(nameOf(sound))}>
            <Volume2 size={16} /> {nameOf(sound)}
          </Btn>
          {made.map((s) => {
            const t = tonesOf(s).find((x) => x.char)
            const said = mark(s, t?.tone ?? 1)
            return (
              <button
                key={s}
                type="button"
                onClick={() => void play(said)}
                className="rounded-xl bg-[var(--paper)] px-3 py-1.5 font-bold transition hover:bg-[var(--paper-2)]"
              >
                {said}
              </button>
            )
          })}
        </div>
      ) : (
        <ToneRow syllable={sound.say} all className="mt-4" />
      )}
      <Echo
        model={kind === 'initial' ? nameOf(sound) : mark(sound.say, 1)}
        className="mt-4"
      />
      {examples.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-bold text-[var(--ink-2)] uppercase">
            In your words
          </p>
          <div className="flex flex-wrap gap-2">
            {examples.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => void play(w.h)}
                className="flex flex-col items-center rounded-xl bg-[var(--paper)] px-3 py-1.5 transition hover:bg-[var(--paper-2)]"
              >
                <Ruby h={w.h} p={w.p} className="text-2xl" />
                <span className="text-xs text-[var(--ink-2)]">{w.e}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {contrasts.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-[var(--paper-2)] pt-3">
          <span className="text-sm text-[var(--ink-2)]">Easy to confuse:</span>
          {contrasts.map((c) => (
            <span key={c.id} className="text-sm font-bold">
              {c.title}
            </span>
          ))}
          <Btn
            kind="ghost"
            onClick={() => onTrain(contrasts.map((c) => c.id))}
            className="ml-auto"
          >
            Train your ear
          </Btn>
        </div>
      )}
    </div>
  )
}

// Up to four words with the sound in them, the ones met first
function useExamples(kind: Kind, id: string): Array<Word> {
  const { bank } = useStore()
  return useMemo(() => {
    const has = (w: Word) =>
      syllables(w.p).some((s) => {
        const b = bare(s.toLowerCase())
        if (kind === 'whole') return b === id
        const p = parts(b)
        if (kind === 'initial')
          return id === 'y' || id === 'w' ? b.startsWith(id) : p.initial === id
        return p.final === id
      })
    const found = WORDS.filter(
      (w) => !w.tags.includes('part') && [...w.h].length <= 3 && has(w),
    )
    const met = found.filter((w) => bank.cards[w.id])
    return [...met, ...found.filter((w) => !bank.cards[w.id])].slice(0, 4)
  }, [kind, id])
}

// A syllable in its four tones, each with a character it is, where one
// is common, and all four in turn
function ToneRow({
  syllable,
  all = false,
  className = '',
}: {
  syllable: string
  // All four tones, as the chart's drill; else only those a word has
  all?: boolean
  className?: string
}) {
  const { play } = useSpeaker()
  const [on, setOn] = useState<{ tone: number; n: number } | null>(null)
  const tones = tonesOf(syllable)
  const hear = (tone: number) => {
    setOn((o) => ({ tone, n: (o?.n ?? 0) + 1 }))
    return play(mark(syllable, tone))
  }
  const said = tones.filter((t) => all || t.char).map((t) => t.tone)
  const inTurn = async () => {
    for (const t of said) {
      await hear(t)
      await wait(250)
    }
  }
  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-1.5">
        {tones.map(({ tone, char }) => (
          <button
            key={tone}
            type="button"
            disabled={!said.includes(tone)}
            title={said.includes(tone) ? undefined : 'No word is said so'}
            onClick={() => void hear(tone)}
            className={`flex flex-col items-center rounded-xl py-2 transition hover:bg-[var(--paper-2)] disabled:opacity-30 disabled:hover:bg-[var(--paper)] ${
              on?.tone === tone ? 'bg-[var(--paper-2)]' : 'bg-[var(--paper)]'
            }`}
          >
            <ToneGlyph
              tone={tone}
              size={34}
              play={on?.tone === tone ? on.n : undefined}
              staff
            />
            <span className="text-lg font-bold">{mark(syllable, tone)}</span>
            <span className="zh h-6 text-xl leading-6 text-[var(--ink-2)]">
              {char ?? ''}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-center">
        <Btn kind="ghost" onClick={() => void inTurn()}>
          <Play size={15} /> {said.length === 4 ? 'All four' : 'In turn'}
        </Btn>
      </div>
    </div>
  )
}

// Hear yourself beside the model: record a few seconds, then hear the
// model and yourself in turn
function Echo({
  model,
  className = '',
}: {
  model: string
  className?: string
}) {
  const { play } = useSpeaker()
  const [state, setState] = useState<'idle' | 'recording' | 'ready' | 'error'>(
    'idle',
  )
  const rec = useRef<MediaRecorder | null>(null)
  const url = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (rec.current?.state === 'recording') rec.current.stop()
      if (url.current) URL.revokeObjectURL(url.current)
    },
    [],
  )
  const mine = () =>
    new Promise<void>((done) => {
      if (!url.current) return done()
      const a = new Audio(url.current)
      a.onended = () => done()
      a.onerror = () => done()
      void a.play().catch(() => done())
    })
  const compare = async () => {
    await play(model)
    await wait(350)
    await mine()
  }
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      const chunks: Array<Blob> = []
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (url.current) URL.revokeObjectURL(url.current)
        url.current = URL.createObjectURL(
          new Blob(chunks, { type: r.mimeType }),
        )
        setState('ready')
        void compare()
      }
      rec.current = r
      r.start()
      setState('recording')
      setTimeout(() => {
        if (r.state === 'recording') r.stop()
      }, 2500)
    } catch {
      setState('error')
    }
  }
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl bg-[var(--paper)] p-2 ${className}`}
    >
      {state === 'recording' ? (
        <Btn kind="red" onClick={() => rec.current?.stop()}>
          <Square size={15} /> Stop
        </Btn>
      ) : (
        <Btn kind="jade" onClick={() => void start()}>
          <Mic size={15} /> {state === 'ready' ? 'Again' : 'Say it'}
        </Btn>
      )}
      {state === 'ready' && (
        <>
          <Btn kind="ghost" onClick={() => void compare()}>
            <Play size={15} /> Model, then you
          </Btn>
          <Btn kind="ghost" onClick={() => void mine()}>
            You
          </Btn>
        </>
      )}
      <span className="text-sm text-[var(--ink-2)]">
        {state === 'recording'
          ? 'Listening…'
          : state === 'error'
            ? 'No microphone to record with.'
            : state === 'ready'
              ? ''
              : 'Record yourself, and hear it beside the model.'}
      </span>
    </div>
  )
}

// --- The table: every syllable, by initial and final

function Table() {
  const { play } = useSpeaker()
  const [open, setOpen] = useState<string | null>(null)
  const at = open ? parts(open) : null
  const hear = (s: string) => {
    const t = tonesOf(s).find((x) => x.char)
    void play(mark(s, t?.tone ?? 1))
  }
  return (
    <>
      <p className="mb-4 text-[var(--ink-2)]">
        Every syllable of Mandarin: initials across, finals down. Tap one to
        hear it, and for its four tones.
      </p>
      <div className="zh-card max-h-[70dvh] overflow-auto">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-[var(--card)] p-1" />
              {TABLE_INITIALS.map((i) => (
                <th
                  key={i || '0'}
                  scope="col"
                  className={`sticky top-0 z-10 bg-[var(--card)] px-1 py-1.5 font-black ${
                    at && at.initial === i ? 'text-[var(--red)]' : ''
                  }`}
                >
                  {i || '–'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_FINALS.map((f) => (
              <tr key={f}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 bg-[var(--card)] px-2 py-0.5 text-left font-black ${
                    at && at.final === f ? 'text-[var(--red)]' : ''
                  }`}
                >
                  {f}
                </th>
                {TABLE_INITIALS.map((i) => {
                  const s = GRID[f]?.[i]
                  return (
                    <td key={i || '0'} className="p-0.5">
                      {s && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(s)
                            hear(s)
                          }}
                          className={`w-full rounded-md px-1 py-1 font-semibold whitespace-nowrap transition ${
                            open === s
                              ? 'bg-[var(--red)] text-white'
                              : 'bg-[var(--paper)] hover:bg-[var(--gold)]/40'
                          }`}
                        >
                          {s}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6">
          <div
            className="zh-card fx-rise relative mx-auto max-w-xl p-4 shadow-2xl"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="absolute top-2 right-2 rounded-full p-2 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <p className="pr-8 text-sm text-[var(--ink-2)]">
              <b className="text-2xl text-[var(--ink)]">{open}</b>
              {at && (
                <>
                  {'  '}
                  {at.initial ? `${at.initial} + ` : ''}
                  {at.final === '-i' ? 'i (held on)' : at.final}
                </>
              )}
            </p>
            <ToneRow key={open} syllable={open} className="mt-2" />
            <Echo
              key={`e-${open}`}
              model={mark(open, tonesOf(open).find((x) => x.char)?.tone ?? 1)}
              className="mt-2"
            />
          </div>
        </div>
      )}
    </>
  )
}

// --- Ear training: hear a syllable, tell it from those like it

const ROUND = 10

interface Question {
  contrast: Contrast
  options: Array<string>
  answer: string
}

function Ears({ focus }: { focus: Array<string> | null }) {
  const { bank } = useStore()
  const [chosen, setChosen] = useState<Array<string>>(
    () => focus ?? ['zh-z-j', 'ch-c-q', 'sh-s-x'],
  )
  const [playing, setPlaying] = useState(!!focus)
  const score = (id: string) => bank.sounds[id]
  // The contrasts missed most, and those not tried yet
  const weakest = () =>
    [...CONTRASTS]
      .map((c) => {
        const s = score(c.id)
        return { id: c.id, r: s ? (s[0] + 1) / (s[1] + 2) : 0.4 }
      })
      .sort((a, b) => a.r - b.r)
      .slice(0, 3)
      .map((x) => x.id)
  if (playing)
    return (
      <Round
        contrasts={CONTRASTS.filter((c) => chosen.includes(c.id))}
        onExit={() => setPlaying(false)}
      />
    )
  const chip = (c: Contrast) => {
    const s = score(c.id)
    const on = chosen.includes(c.id)
    const r = s ? s[0] / s[1] : null
    return (
      <button
        key={c.id}
        type="button"
        aria-pressed={on}
        onClick={() =>
          setChosen((x) => (on ? x.filter((id) => id !== c.id) : [...x, c.id]))
        }
        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 font-bold transition ${
          on
            ? 'border-[var(--red)] bg-[var(--card)]'
            : 'border-[var(--paper-2)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--gold)]'
        }`}
      >
        {c.title}
        {r !== null && (
          <span
            className="rounded-md px-1.5 text-xs text-white tabular-nums"
            style={{
              background: `color-mix(in srgb, var(--jade) ${r * 100}%, var(--red))`,
            }}
            title={`${s?.[0]} of ${s?.[1]} right`}
          >
            {Math.round(r * 100)}
          </span>
        )}
      </button>
    )
  }
  return (
    <>
      <p className="mb-5 text-[var(--ink-2)]">
        Hear a syllable, and pick it from others that differ in one sound.
        Choose the sounds to train: the hardest for most learners are the three
        rows of zh, z and j.
      </p>
      {(['initial', 'final', 'tone'] as const).map((kind) => (
        <section key={kind} className="mb-5">
          <h2 className="mb-2 font-black">
            {kind === 'initial'
              ? 'Initials'
              : kind === 'final'
                ? 'Finals'
                : 'Tones'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {CONTRASTS.filter((c) => c.kind === kind).map(chip)}
          </div>
        </section>
      ))}
      <div className="flex flex-wrap gap-2">
        <Btn
          onClick={() => setPlaying(true)}
          disabled={!chosen.length}
          className="px-6 py-3 text-lg"
        >
          <Play size={18} /> Start · {ROUND} sounds
        </Btn>
        <Btn
          kind="ghost"
          onClick={() => {
            setChosen(weakest())
            setPlaying(true)
          }}
        >
          What I miss most
        </Btn>
      </div>
    </>
  )
}

// The questions each contrast can ask, worked out once
const FRAMES = new Map<string, Array<Array<string>>>()
const framesOf = (c: Contrast) => {
  if (!FRAMES.has(c.id)) FRAMES.set(c.id, frames(c))
  return FRAMES.get(c.id) as Array<Array<string>>
}

function makeQuestions(
  contrasts: Array<Contrast>,
  tried: (id: string) => [number, number] | undefined,
): Array<Question> {
  // Contrasts missed more often come up more often
  const weight = (c: Contrast) => {
    const s = tried(c.id)
    return 1.5 - (s ? (s[0] + 1) / (s[1] + 2) : 0.5)
  }
  const pool = contrasts.flatMap((c) =>
    framesOf(c).length ? [{ c, w: weight(c), f: framesOf(c) }] : [],
  )
  const total = pool.reduce((n, p) => n + p.w, 0)
  return Array.from({ length: ROUND }, () => {
    let x = Math.random() * total
    const p = pool.find((q) => (x -= q.w) <= 0) ?? pool[pool.length - 1]
    const f = p.f[Math.floor(Math.random() * p.f.length)]
    return {
      contrast: p.c,
      options: shuffle(f),
      answer: f[Math.floor(Math.random() * f.length)],
    }
  })
}

function Round({
  contrasts,
  onExit,
}: {
  contrasts: Array<Contrast>
  onExit: () => void
}) {
  const { bank, points, sound, setBest } = useStore()
  const { speaking, play } = useSpeaker()
  const [questions, setQuestions] = useState(() =>
    makeQuestions(contrasts, (id) => bank.sounds[id]),
  )
  const [at, setAt] = useState(0)
  const [picked, setPicked] = useState<{ s: string; t: number } | null>(null)
  const [right, setRight] = useState(0)
  const [streak, setStreak] = useState(0)
  const buttons = useRef(new Map<string, HTMLButtonElement | null>())
  const q = questions[at] as Question | undefined
  useEffect(() => {
    if (q) void play(q.answer)
  }, [at, questions])
  useEffect(() => {
    if (!q) setBest('pinyin-ears', right)
  }, [q])

  const pick = (s: string) => {
    if (!q || picked) return
    setPicked({ s, t: Date.now() })
    const ok = s === q.answer
    blip(ok ? 'right' : 'wrong')
    sound(q.contrast.id, ok)
    if (ok) {
      setRight((r) => r + 1)
      setStreak((n) => n + 1)
      points(1)
      cheer(buttons.current.get(s), '+1')
    } else {
      setStreak(0)
      // the one picked, then the one said
      void (async () => {
        await wait(250)
        await play(s)
        await wait(300)
        await play(q.answer)
      })()
    }
  }
  const next = () => {
    if (!picked) return
    setPicked(null)
    setAt((a) => a + 1)
  }
  useKeys((key) => {
    if (!q) return
    if (key === ' ') {
      void play(q.answer)
      return true
    }
    if (key === 'Escape') {
      onExit()
      return true
    }
    if (picked) {
      if (key !== 'Enter' || Date.now() - picked.t < 150) return
      next()
      return true
    }
    const n = Number(key)
    if (n >= 1 && n <= q.options.length) {
      pick(q.options[n - 1])
      return true
    }
  })

  if (!q)
    return (
      <RoundDone
        right={right}
        total={questions.length}
        sprite="bell"
        actions={
          <>
            <Btn
              onClick={() => {
                setQuestions(makeQuestions(contrasts, (id) => bank.sounds[id]))
                setAt(0)
                setRight(0)
                setStreak(0)
              }}
            >
              Again
            </Btn>
            <Btn kind="ghost" onClick={onExit}>
              Other sounds
            </Btn>
          </>
        }
      >
        <p className="mt-2 text-[var(--ink-2)]">
          {contrasts.map((c) => c.title).join(', ')}
        </p>
      </RoundDone>
    )

  return (
    <div className="flex flex-col max-sm:min-h-[calc(100dvh-12rem)]">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--paper-2)]">
          <div
            className="h-full rounded-full bg-[var(--jade)] transition-[width] duration-500"
            style={{
              width: `${((at + (picked ? 1 : 0)) / questions.length) * 100}%`,
            }}
          />
        </div>
        <Combo n={streak} />
        <span className="text-sm font-bold tabular-nums">
          {right}/{at + (picked ? 1 : 0)}
        </span>
      </div>
      <div
        key={at}
        className="zh-card fx-enter flex flex-1 flex-col p-5 text-center sm:p-7"
      >
        <p className="text-xs font-black tracking-[0.18em] text-[var(--ink-2)] uppercase">
          {q.contrast.kind === 'tone' ? 'Which tone?' : 'Which do you hear?'}
        </p>
        <PlayButton
          onClick={() => void play(q.answer)}
          speaking={speaking}
          className="mx-auto mt-4"
        />
        <div className="flex-1" />
        <div
          className={`mt-6 grid gap-2.5 ${q.options.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}
        >
          {q.options.map((s, i) => {
            const look = !picked
              ? 'border-[var(--paper-2)] bg-[var(--paper)] shadow-[0_3px_0_var(--paper-2)] hover:-translate-y-0.5 hover:border-[var(--gold)]'
              : s === q.answer
                ? `border-[var(--jade)] bg-[#e3f0ea] ${picked.s === s ? 'fx-pulse' : 'fx-beacon'}`
                : picked.s === s
                  ? 'fx-shake border-[var(--red)] bg-[#f8e1dc]'
                  : 'border-transparent bg-[var(--paper)] opacity-45'
            return (
              <button
                key={s}
                ref={(el) => {
                  buttons.current.set(s, el)
                }}
                type="button"
                disabled={!!picked}
                onClick={() => pick(s)}
                className={`relative rounded-2xl border-2 px-3 py-4 text-3xl font-black transition ${look}`}
              >
                <Key k={String(i + 1)} className="absolute top-1.5 left-1.5" />
                {s}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex min-h-[4.5rem] items-center gap-3 border-t border-dashed border-[var(--paper-2)] pt-3 text-left">
          {picked ? (
            <>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-black ${picked.s === q.answer ? 'text-[var(--jade)]' : 'text-[var(--red)]'}`}
                >
                  {picked.s === q.answer ? (
                    <>
                      <Ruby h="对" p="duì" className="text-xl" /> {q.answer}
                    </>
                  ) : (
                    <>
                      <Ruby h="不对" p="bù duì" className="text-xl" /> it was{' '}
                      {q.answer}
                    </>
                  )}
                </p>
                <p className="text-sm text-[var(--ink-2)]">{q.contrast.tip}</p>
              </div>
              <Btn onClick={next} className="shrink-0">
                Next{' '}
                <Key
                  k="Enter"
                  className="ml-1 border-white/30 bg-white/15 text-white"
                />
              </Btn>
            </>
          ) : (
            <p className="w-full text-center text-xs text-[var(--ink-2)] max-sm:hidden">
              <Key k="1" />–<Key k={String(q.options.length)} /> to choose,{' '}
              <Key k="Space" /> to hear it again
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
