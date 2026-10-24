import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import { ArrowLeft, Music, Volume2, X } from 'lucide-react'
import { WORD } from './data/words'
import { inContext, join, syllables } from './lib/pinyin'
import { tokens } from './lib/text'
import { say } from './lib/audio'
import { WORD_VOICE } from './lib/speech'
import { useStore } from './lib/store'
import { toggleMusic, useSound } from './lib/music'
import { Fret } from './ornament/Borders'
import { Pix } from './pixel/Pix'
import { LINKS, recall } from './lib/bank'
import type { ReactNode } from 'react'
import type { Card, Level, Link } from './lib/bank'
import type { Token } from './lib/text'

// The pieces every game shares: mixed text, the sheet a tapped word
// opens, buttons and the page frame.

export const LEVEL_NAME = ['New', 'Learning', 'Known'] as const
export const LEVEL_COLOR = ['#9a8f84', '#2f7d6d', '#c8372d'] as const

// The three links of a word (lib/bank.ts), named by their ends: 字 the
// character, 音 its sound, 义 its meaning
export const LINK_NAME: Record<Link, { zh: string; en: string }> = {
  hs: { zh: '字音', en: 'hanzi and sound' },
  hm: { zh: '字义', en: 'hanzi and meaning' },
  sm: { zh: '音义', en: 'sound and meaning' },
}

// How long a memory lasts, in hours or days
const howLong = (s: number) =>
  s < 1 ? `${Math.round(s * 24)} h` : `${s.toFixed(1)} d`

// A word's links as bars, each as full as the chance of remembering it
// now, red once it fades, with how long it lasts
export function LinkBars({
  card,
  now,
  wide = false,
}: {
  card: Card
  now: number
  // with the links' names in English
  wide?: boolean
}) {
  return (
    <span
      className={`flex w-full flex-col ${wide ? 'gap-1.5 text-xs' : 'gap-0.5 text-[10px]'} text-[var(--ink-2)] tabular-nums`}
    >
      {LINKS.map((l) => {
        const m = card[l]
        const r = recall(m, now)
        return (
          <span
            key={l}
            className="flex items-center gap-1.5"
            title={`${LINK_NAME[l].en}: lasts ${howLong(m.s)}`}
          >
            <span className="zh shrink-0 leading-none">{LINK_NAME[l].zh}</span>
            {wide && <span className="w-32 shrink-0">{LINK_NAME[l].en}</span>}
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--paper-2)]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${r * 100}%`,
                  background: r < 0.85 ? 'var(--red)' : 'var(--jade)',
                }}
              />
            </span>
            <span className="w-9 shrink-0 text-right">{howLong(m.s)}</span>
          </span>
        )
      })}
    </span>
  )
}

// --- Mixed text ---

const EN_PUNCT: Record<string, string> = {
  '，': ',',
  '。': '.',
  '！': '!',
  '？': '?',
  '、': ',',
  '：': ':',
}

export function tokenLevel(t: Token, levelOf: (id: string) => Level): Level {
  if (t.id) return levelOf(t.id)
  if (t.parts?.length)
    return Math.min(...t.parts.map((p) => levelOf(p))) as Level
  return 2
}

// A line in Chinese order, each word as the player knows it: in English
// if not met, in hanzi with pinyin if learning, in hanzi alone if known.
// A tap opens the word. `fresh` words glow, as just met.
export function Mixed({
  line,
  className = '',
  fresh,
  size = 'md',
  all,
  still,
}: {
  line: string
  className?: string
  fresh?: Set<string>
  size?: 'sm' | 'md' | 'lg'
  // Force every word to one level, as for the answer shown in full
  all?: Level
  // Words that cannot be tapped, inside something that is itself a button
  still?: boolean
}) {
  const { settings, levelOf } = useStore()
  const peek = usePeek()
  const toks = tokens(line, { home: settings.home })
  const font = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }[size]
  let prevEnglish = false
  return (
    <span
      className={`inline-flex flex-wrap items-end gap-x-1.5 gap-y-1 leading-none ${className}`}
    >
      {toks.map((t, i) => {
        if (t.punct) {
          const p = prevEnglish ? (EN_PUNCT[t.h] ?? t.h) : t.h
          return (
            <span
              key={i}
              className={`zh -ml-1 ${prevEnglish ? 'text-base' : font} text-[var(--ink-2)]`}
            >
              {p}
            </span>
          )
        }
        // Words just met show in Chinese even before the bank says so
        const lv =
          all ??
          (t.id && fresh?.has(t.id)
            ? (Math.max(1, tokenLevel(t, levelOf)) as Level)
            : tokenLevel(t, levelOf))
        prevEnglish = lv === 0
        const glow = t.id && fresh?.has(t.id) ? 'zh-new' : ''
        const Tag = still ? 'span' : 'button'
        return (
          <Tag
            key={i}
            type={still ? undefined : 'button'}
            onClick={still ? undefined : () => peek(t)}
            className={`rounded-md px-0.5 transition ${still ? '' : 'hover:bg-[var(--paper-2)]'} ${glow}`}
          >
            {lv === 0 ? (
              <ruby className="zh-gloss text-base text-[var(--ink-2)]">
                <span className="italic underline decoration-[var(--gold)] decoration-dotted underline-offset-4">
                  {t.gloss}
                </span>
                <rt>{join(t.pinyin)}</rt>
              </ruby>
            ) : lv === 1 ? (
              <ruby className={`zh ${font}`}>
                {t.h}
                <rt>{join(t.pinyin)}</rt>
              </ruby>
            ) : (
              <span className={`zh ${font}`}>{t.h}</span>
            )}
          </Tag>
        )
      })}
    </span>
  )
}

// English with words of the bank in it, written {id}: each shown as the
// player knows it, as in mixed text. {id=gloss} gives one use a better gloss
export function Sprinkled({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  const { levelOf } = useStore()
  const peek = usePeek()
  const parts = text.split(/(\{[^}]+\})/)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const m = part.match(/^\{(.+)\}$/)
        if (!m) return <span key={i}>{part}</span>
        const [id, gloss] = m[1].split('=') as [string, string | undefined]
        const w = WORD[id]
        if (!w) return <span key={i}>{id}</span>
        const lv = levelOf(w.id)
        return (
          <button
            key={i}
            type="button"
            onClick={() => peek(w.id)}
            className="rounded px-0.5 hover:bg-[var(--paper-2)]"
          >
            {lv === 0 ? (
              <ruby className="zh-gloss">
                <span className="italic underline decoration-[var(--gold)] decoration-dotted underline-offset-4">
                  {gloss ?? w.g}
                </span>
                <rt>{join(syllables(w.p))}</rt>
              </ruby>
            ) : lv === 1 ? (
              <ruby className="zh text-[1.3em]">
                {w.h}
                <rt>{join(syllables(w.p))}</rt>
              </ruby>
            ) : (
              <span className="zh text-[1.3em]">{w.h}</span>
            )}
          </button>
        )
      })}
    </span>
  )
}

// A word in hanzi with its pinyin above, as said (不客气 búkèqi)
export function Ruby({
  h,
  p,
  className = '',
}: {
  h: string
  p: string
  className?: string
}) {
  return (
    <ruby className={`zh ${className}`}>
      {h}
      <rt>{join(inContext([{ h, s: syllables(p) }])[0])}</rt>
    </ruby>
  )
}

// --- The word sheet ---

const PeekCtx = createContext<(t: Token | string) => void>(() => {})
export const usePeek = () => useContext(PeekCtx)

export function PeekProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Token | null>(null)
  const show = (t: Token | string) => {
    if (typeof t === 'string') {
      const w = WORD[t]
      if (!w) return
      setOpen({ h: w.h, id: w.id, gloss: w.g, pinyin: syllables(w.p) })
    } else setOpen(t)
    const h = typeof t === 'string' ? t : t.h
    void say(h, WORD_VOICE)
  }
  return (
    <PeekCtx.Provider value={show}>
      {children}
      {open && <Sheet token={open} onClose={() => setOpen(null)} />}
    </PeekCtx.Provider>
  )
}

function Sheet({ token, onClose }: { token: Token; onClose: () => void }) {
  const { bank, levelOf, meet, know, record } = useStore()
  const w = token.id ? WORD[token.id] : undefined
  const lv = tokenLevel(token, levelOf)
  const card = w ? bank.cards[w.id] : undefined
  // Looking up a known word is a hint that its character did not bring
  // back its sound or its meaning
  useEffect(() => {
    if (w && lv === 2) record(w.id, false, 0.3, ['hs', 'hm'])
    // once, when opened
  }, [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  const chars = [...token.h]
  // Each character in a writing square (田字格), as in a copybook
  const box = chars.length > 3 ? 56 : 76
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(24,18,14,0.32)] p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={token.h}
        className="zh-card zh-rise relative w-full max-w-sm overflow-hidden text-[var(--ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Fret className="h-[6px] text-[var(--red)] opacity-50" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {chars.map((c, i) => (
                <span
                  key={i}
                  className="zh relative flex items-center justify-center leading-none"
                  style={{
                    width: box,
                    height: box,
                    fontSize: box * 0.78,
                  }}
                >
                  <svg
                    viewBox="0 0 10 10"
                    aria-hidden
                    className="absolute inset-0 h-full w-full"
                    fill="none"
                    stroke="var(--red)"
                    strokeOpacity="0.45"
                  >
                    <rect
                      x="0.15"
                      y="0.15"
                      width="9.7"
                      height="9.7"
                      strokeWidth="0.3"
                    />
                    <path
                      d="M5 0.3V9.7M0.3 5H9.7"
                      strokeWidth="0.12"
                      strokeDasharray="0.5 0.4"
                    />
                  </svg>
                  <span className="relative">{c}</span>
                </span>
              ))}
            </div>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="rounded-full p-1 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-3 text-xl text-[var(--jade)]">
            {join(token.pinyin)}
          </div>
          <p className="mt-1 text-lg leading-snug">{w?.e ?? token.gloss}</p>
          {token.note && (
            <p className="mt-2 rounded-lg bg-[var(--paper-2)] px-3 py-2 text-sm leading-snug text-[var(--ink-2)]">
              {token.note}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs font-bold">
            <span
              className="rounded-full px-2 py-0.5 tracking-wide text-white uppercase"
              style={{ background: LEVEL_COLOR[lv] }}
            >
              {LEVEL_NAME[lv]}
            </span>
            {w && (
              <span className="text-[var(--ink-2)]">lesson {w.lesson}</span>
            )}
          </div>
          {card && (
            <div className="mt-3">
              <LinkBars card={card} now={Date.now()} wide />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn kind="ghost" onClick={() => void say(token.h, WORD_VOICE)}>
              <Volume2 size={16} /> Hear it
            </Btn>
            {w && lv === 0 && (
              <Btn
                onClick={() => {
                  meet([w.id])
                  onClose()
                }}
              >
                Learn it
              </Btn>
            )}
            {w && lv < 2 && (
              <Btn
                kind="ghost"
                onClick={() => {
                  know([w.id])
                  onClose()
                }}
              >
                I know this
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Buttons and frame ---

// A button that presses down: red for the way on, jade, dark, or ghost
// for the quieter choices
export function Btn({
  children,
  onClick,
  kind = 'red',
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'red' | 'ghost' | 'jade' | 'dark'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  const look = {
    red: 'bg-[var(--red)] text-[#fff6ea] [--edge:#8e2219]',
    jade: 'bg-[var(--jade)] text-white [--edge:#1d5247]',
    dark: 'bg-[var(--ink)] text-[var(--paper)] [--edge:#000]',
    ghost: 'bg-[var(--paper-2)] text-[var(--ink)] [--edge:#d4c19c]',
  }[kind]
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`zh-btn inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 font-bold select-none disabled:opacity-40 ${look} ${className}`}
    >
      {children}
    </button>
  )
}

// The music on or off (lib/music.ts); `glass` is for over the scene
export function MusicToggle({
  glass = false,
  className = '',
}: {
  glass?: boolean
  className?: string
}) {
  const { music } = useSound()
  const look = glass
    ? `zh-glass ${music ? 'text-[#ffd98a]' : ''}`
    : `bg-[var(--card)] shadow-sm hover:bg-white ${music ? 'text-[var(--red)]' : 'text-[var(--ink-2)]'}`
  return (
    <button
      type="button"
      aria-label="Music"
      aria-pressed={music}
      title={music ? 'Music on' : 'Music off'}
      onClick={toggleMusic}
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${look} ${className}`}
    >
      <Music size={18} />
      {!music && (
        <span
          aria-hidden
          className="absolute h-[2px] w-6 rotate-45 rounded-full bg-current"
        />
      )}
    </button>
  )
}

export function SpeakButton({
  text,
  voice = WORD_VOICE,
  className = '',
  size = 18,
}: {
  text: string
  voice?: string
  className?: string
  size?: number
}) {
  return (
    <button
      type="button"
      aria-label="Play"
      onClick={(e) => {
        e.stopPropagation()
        void say(text, voice)
      }}
      className={`inline-flex items-center justify-center rounded-full p-2 text-[var(--jade)] transition hover:bg-[var(--paper-2)] ${className}`}
    >
      <Volume2 size={size} />
    </button>
  )
}

// Every game's page: a way home, the game's name in Chinese and English
// over a band of fretwork, room on the right for a score, and the music
export function Frame({
  title,
  zh,
  children,
  right,
  wide,
}: {
  title: string
  zh?: string
  children: ReactNode
  right?: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={`mx-auto px-4 pt-4 pb-16 ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}
    >
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <a
            href="#"
            aria-label="Home"
            title="Home"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--card)] text-[var(--ink-2)] shadow-sm transition hover:-translate-x-0.5 hover:text-[var(--red)]"
          >
            <ArrowLeft size={20} />
          </a>
          <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            {zh && (
              <span
                className="zh-display text-[1.55rem] leading-none whitespace-nowrap text-[var(--red)] sm:text-[1.85rem]"
                style={{ viewTransitionName: 'zh-title' }}
              >
                {zh}
              </span>
            )}
            <span className="zh-head text-[1.3rem] leading-tight sm:text-[1.65rem]">
              {title}
            </span>
          </h1>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {right}
            <MusicToggle />
          </div>
        </div>
        <Fret className="mt-3 h-[7px] text-[var(--red)] opacity-25" />
      </header>
      {children}
    </div>
  )
}

export function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="tracking-tight" aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i}>
          <Pix
            name="star"
            size={18}
            className={i < n ? '' : 'opacity-25 grayscale'}
          />
        </span>
      ))}
    </span>
  )
}

export function shuffle<T>(xs: Array<T>, random = Math.random): Array<T> {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const sample = <T,>(xs: Array<T>) =>
  xs[Math.floor(Math.random() * xs.length)]

// --- Installing the page as an app ---

// Browsers that can install the page offer it once, early; the offer is
// kept here until the player asks for it (in Settings)
interface InstallOffer extends Event {
  prompt: () => Promise<void>
}
let offer: InstallOffer | null = null
const offerSubs = new Set<() => void>()
const tellOffer = () => offerSubs.forEach((f) => f())
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    offer = e as InstallOffer
    tellOffer()
  })
  window.addEventListener('appinstalled', () => {
    offer = null
    tellOffer()
  })
}

// How this page can be installed here: by the browser's own offer, by
// hand from Safari's share menu, or not at all (or already is)
export function useInstall(): (() => void) | 'ios' | null {
  const o = useSyncExternalStore(
    (f) => {
      offerSubs.add(f)
      return () => {
        offerSubs.delete(f)
      }
    },
    () => offer,
    () => null,
  )
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return null
  if (o)
    return () => {
      void o.prompt()
      offer = null
      tellOffer()
    }
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  return ios ? 'ios' : null
}
