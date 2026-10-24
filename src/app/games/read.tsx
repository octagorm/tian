import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ArrowLeft, BookOpen, Check, ScrollText } from 'lucide-react'
import { TEXT, TEXTS, sentencesOf } from '../data/reader'
import { holds } from '../lib/bank'
import { join } from '../lib/pinyin'
import { tokens, wordIds } from '../lib/text'
import { blip } from '../lib/audio'
import { hushMusic } from '../lib/music'
import { READ_SIZES, READ_WIDTHS, useStore } from '../lib/store'
import { Frame, usePeek } from '../ui'
import { CloudDivider } from '../ornament/Borders'
import type { CSSProperties, ReactNode } from 'react'
import type { Text } from '../data/reader'
import type { Bank } from '../lib/bank'
import type { Help, Settings } from '../lib/store'
import type { Token } from '../lib/text'
import './read.css'

// The reader (data/reader.ts): /#read lists the texts, and /#read/beijing
// reads one, the whole text in hanzi, each word with its pinyin over it
// until its character brings back its sound (the link hs) and its English
// under it until the character brings back its meaning (hm), as Hola's
// Biblioteca does with Norwegian. A tapped word opens its sheet, which
// says it, and can meet it (it comes up in Review from then on) or mark
// it known; a note on the word there, if the text has one, is on the sheet
// too. The place read to is kept in the bank, and the text opens there
// again. «Aa» has the text's size, its width, scrolling or pages turned
// sideways (by a swipe, the arrow keys or a tap in the margin), how much
// pinyin and English to show, and light or dark. The title and «Aa» step
// aside once reading goes on, and a tap on the page brings them back.
// Read to the end, the words met and read without being looked up count
// as read.

// The text's id, from /#read/<id>
const fromHash = () => window.location.hash.split('/')[1] ?? ''

export default function ReadPage() {
  const [id, setId] = useState(fromHash)
  useEffect(() => {
    const change = () => setId(fromHash())
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  const dark = useDark()
  // No music while reading
  useEffect(() => {
    hushMusic(true)
    return () => hushMusic(false)
  }, [])
  const text = TEXT[id]
  return (
    <div className={`rd${dark ? ' rd-dark' : ''}`}>
      {text ? <Reader key={text.id} text={text} /> : <Shelf />}
    </div>
  )
}

// Dark as chosen, or as the system has it; the whole page's colours while
// the reader is open (read.css), the word's sheet over it included
function useDark() {
  const { settings } = useStore()
  const query = '(prefers-color-scheme: dark)'
  const [system, setSystem] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const m = matchMedia(query)
    const change = () => setSystem(m.matches)
    m.addEventListener('change', change)
    return () => m.removeEventListener('change', change)
  }, [])
  const dark =
    settings.readTheme === 'dark' || (settings.readTheme === 'auto' && system)
  useLayoutEffect(() => {
    document.body.classList.toggle('zh-dark', dark)
    return () => document.body.classList.remove('zh-dark')
  }, [dark])
  return dark
}

// How far a text is read, in a few words
function progress(text: Text, p: number | undefined, done?: number) {
  if (done) return 'Read'
  if (!p) return 'Not started'
  return `${Math.round((100 * (p + 1)) / text.text.length)} % read`
}

const charCount = (t: Text) =>
  sentencesOf(t).reduce(
    (n, s) =>
      n +
      tokens(s, { home: '挪威' })
        .filter((k) => !k.punct)
        .reduce((m, k) => m + k.h.length, 0),
    0,
  )

const idsOf = (t: Text, home: string) =>
  new Set(sentencesOf(t).flatMap((s) => wordIds(s, { home })))

function Shelf() {
  const { bank, settings, levelOf } = useStore()
  return (
    <Frame title="Reader" zh="阅读">
      <p className="mb-5 leading-relaxed text-[var(--ink-2)]">
        Short texts to read in characters. Each word has its pinyin over it
        until you can say it from the character, and its English under it until
        you can read it. Tap a word to hear it and see what it is, then learn it
        or mark it known. Your place is kept.
      </p>
      <ol className="flex flex-col gap-3">
        {TEXTS.map((t) => {
          const place = bank.place[t.id]
          const ids = idsOf(t, settings.home)
          const unknown = [...ids].filter((id) => levelOf(id) < 2).length
          return (
            <li key={t.id}>
              <a href={`#read/${t.id}`} className="zh-card zh-lift block p-4">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="zh text-[1.9rem] leading-none whitespace-nowrap text-[var(--red)]">
                    {t.zh}
                  </span>
                  <span className="zh-head text-[1.3rem]">{t.en}</span>
                  <span className="ml-auto flex items-center gap-1 text-sm text-[var(--ink-2)]">
                    {place?.done && (
                      <Check size={16} className="text-[var(--jade)]" />
                    )}
                    {progress(t, place?.p, place?.done)}
                  </span>
                </span>
                <span className="mt-1.5 block text-sm text-[var(--ink-2)]">
                  <span className="text-[var(--jade)]">{t.pinyin}</span> ·{' '}
                  {charCount(t)} characters, {unknown} words not known yet
                </span>
              </a>
            </li>
          )
        })}
      </ol>
    </Frame>
  )
}

// --- A word as shown ---

// The marks that open what follows them; the rest close what is before
const OPENING = new Set(['“', '《'])

// Tokens in groups that a line may not break inside: a word with the
// punctuation that closes it after it and any that opens it before
function groups(toks: Array<Token>): Array<Array<Token>> {
  const out: Array<Array<Token>> = []
  let open: Array<Token> = []
  for (const t of toks) {
    if (t.punct && OPENING.has(t.h)) open.push(t)
    else if (t.punct && !open.length && out.length) out[out.length - 1].push(t)
    else {
      out.push([...open, t])
      open = []
    }
  }
  if (open.length) out.push(open)
  return out
}

// Whether a word needs help with a link: not met, or that link not known
function needs(t: Token, bank: Bank, link: 'hs' | 'hm', now: number) {
  const ids = t.id ? [t.id] : (t.parts ?? [])
  return ids.some((id) => {
    const c = bank.cards[id]
    return !c || !holds(c[link], now)
  })
}

const shows = (help: Help, need: boolean) =>
  help === 'all' || (help === 'new' && need)

function Line({
  line,
  text,
  onPeek,
}: {
  line: string
  text: Text
  onPeek: (id: string) => void
}) {
  const { bank, settings } = useStore()
  const peek = usePeek()
  const toks = useMemo(
    () => tokens(line, { home: settings.home }),
    [line, settings.home],
  )
  const now = Date.now()
  const open = (t: Token) => {
    for (const id of t.id ? [t.id] : (t.parts ?? [])) onPeek(id)
    // (a number has no word of its own: its sheet shows it as written)
    peek({ ...t, note: t.note ? text.notes[t.note] : undefined })
  }
  return (
    <>
      {groups(toks).map((g, i) => (
        <span key={i} className="rd-g">
          {g.map((t, j) => {
            if (t.punct)
              return (
                <span key={j} className="rd-p" aria-hidden={false}>
                  <span className="rd-py" />
                  <span className="rd-h zh">{t.h}</span>
                  <span className="rd-en" />
                </span>
              )
            const met = (t.id ? [t.id] : (t.parts ?? [])).every(
              (id) => bank.cards[id],
            )
            const py = shows(settings.readPinyin, needs(t, bank, 'hs', now))
            const en = shows(settings.readEnglish, needs(t, bank, 'hm', now))
            const faint =
              !needs(t, bank, 'hs', now) && !needs(t, bank, 'hm', now)
            return (
              <span
                key={j}
                role="button"
                tabIndex={0}
                data-peek=""
                className={`rd-w ${met ? (faint ? 'kw' : 'lw') : 'nw'}`}
                onClick={() => open(t)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  open(t)
                }}
              >
                <span className="rd-py">{py && join(t.pinyin)}</span>
                <span className="rd-h zh">{t.h}</span>
                <span className="rd-en">{en && t.gloss}</span>
              </span>
            )
          })}
        </span>
      ))}
    </>
  )
}

// --- The reader ---

// The space kept under a page for its number, and between pages
const NAV = 36
const GAP = 48

const HELPS: Array<[Help, string]> = [
  ['off', 'None'],
  ['new', 'Until known'],
  ['all', 'All'],
]

const THEMES: Array<[Settings['readTheme'], string]> = [
  ['auto', 'Auto'],
  ['light', 'Light'],
  ['dark', 'Dark'],
]

function Reader({ text }: { text: Text }) {
  const { bank, settings, setSettings, setPlace, record, levelOf } = useStore()
  const place = bank.place[text.id]
  const paras = useRef<Array<HTMLParagraphElement | null>>([])
  const view = useRef<HTMLDivElement>(null)
  const flow = useRef<HTMLDivElement>(null)
  const end = useRef<HTMLSpanElement>(null)
  const tapped = useRef(new Set<string>())
  // The paragraph at the top of the screen, as it is read, and the word
  const at = useRef(place?.p ?? 0)
  const atWord = useRef(place?.w ?? 0)
  // The first word in view, kept while the text reflows, so that a new size
  // or a word made known keeps the page where it is
  const anchor = useRef<Element | null>(null)
  // Turned a page at a time: which, of how many, and how far apart
  const pager = useRef({ index: 0, count: 1, stride: 0 })
  const [pages, setPages] = useState({ index: 0, count: 1 })
  const [panel, setPanel] = useState(false)
  // The title and «Aa» over the text, out of the way once reading goes on
  const [controls, setControls] = useState(true)
  // The mouse pointer hidden while reading: from a tap on the page or a
  // page turned or scrolled, until the mouse moves again
  const [pointer, setPointer] = useState(true)
  const hidAt = useRef(0)
  const hidePointer = useCallback(() => {
    hidAt.current = Date.now()
    setPointer(false)
  }, [])
  // Opened where it was left, if that was not the start
  const [resumed, setResumed] = useState(
    () => !!place && !place.done && (place.p > 0 || !!place.w),
  )
  // Read to the end, with the words counted as read
  const [credited, setCredited] = useState<number | null>(null)

  const paged = settings.readPaged
  const size = READ_SIZES[settings.readSize] ?? READ_SIZES[1]
  const width = READ_WIDTHS[settings.readWidth] ?? READ_WIDTHS[0]
  const help = `${settings.readPinyin}-${settings.readEnglish}`

  // The first word in a box: on the page shown, or under the top of the
  // screen
  const firstIn = useCallback(
    (box: DOMRect) => {
      for (const el of flow.current?.querySelectorAll('.rd-w') ?? []) {
        const r = el.getBoundingClientRect()
        if (r.width === 0) continue
        if (
          paged
            ? r.left >= box.left - 1 && r.left < box.right
            : r.top >= box.top
        )
          return el
      }
      return null
    },
    [paged],
  )

  // The word read to kept as the place in the text: its paragraph, and
  // where in it
  const keep = useCallback(
    (el: Element | null) => {
      if (!el) return
      anchor.current = el
      const p = paras.current.findIndex((x) => x?.contains(el))
      if (p < 0) return
      const w = Array.from(paras.current[p]!.querySelectorAll('.rd-w')).indexOf(
        el,
      )
      if (p !== at.current || w !== atWord.current) {
        at.current = p
        atWord.current = Math.max(0, w)
        setPlace(text.id, p, false, atWord.current)
      }
    },
    [text, setPlace],
  )

  // The word the text was left at, or its paragraph
  const leftAt = () =>
    paras.current[at.current]?.querySelectorAll('.rd-w')[atWord.current] ??
    paras.current[at.current]

  const turnTo = useCallback(
    (index: number, remember = true) => {
      const pg = pager.current
      pg.index = Math.max(0, Math.min(pg.count - 1, index))
      const shift = pg.index * pg.stride
      if (flow.current)
        flow.current.style.transform = shift ? `translateX(${-shift}px)` : ''
      setPages({ index: pg.index, count: pg.count })
      if (remember && view.current)
        keep(firstIn(view.current.getBoundingClientRect()))
    },
    [firstIn, keep],
  )

  // The page an element stands on
  const pageOf = (el: Element) => {
    const v = view.current!.getBoundingClientRect()
    const shift = pager.current.index * pager.current.stride
    const rects = el.getClientRects()
    const r = rects.length ? rects[0] : el.getBoundingClientRect()
    return Math.floor((r.left - v.left + shift + 1) / pager.current.stride)
  }

  // A page at a time: the text in columns as wide as the page and as tall as
  // the screen allows, moved sideways a page at a time
  const wasPaged = useRef(false)
  useLayoutEffect(() => {
    const v = view.current!
    const f = flow.current!
    if (!paged) {
      v.style.height = ''
      f.style.cssText = ''
      // From pages to the scroll: to the word that was read
      if (wasPaged.current && anchor.current?.isConnected)
        window.scrollTo(
          0,
          anchor.current.getBoundingClientRect().top + window.scrollY - 100,
        )
      else if (!wasPaged.current && resumed) {
        const el = leftAt()
        if (el)
          window.scrollTo(
            0,
            el.getBoundingClientRect().top + window.scrollY - 100,
          )
      }
      wasPaged.current = false
      return
    }
    wasPaged.current = true
    window.scrollTo(0, 0)
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = 'hidden'
    let frame = 0
    const layout = () => {
      const h = Math.max(
        220,
        window.innerHeight - v.getBoundingClientRect().top - NAV,
      )
      v.style.height = `${h}px`
      const w = v.clientWidth
      const stride = w + GAP
      f.style.height = `${h}px`
      f.style.columnWidth = `${w}px`
      f.style.columnGap = `${GAP}px`
      const shift = pager.current.index * pager.current.stride
      const last =
        end.current!.getBoundingClientRect().left -
        v.getBoundingClientRect().left +
        shift
      const count = Math.max(1, Math.floor((last + 1) / stride) + 1)
      // (as wide as every page, so that no column lies outside its box)
      f.style.width = `${count * stride - GAP}px`
      pager.current = { ...pager.current, count, stride }
      let index = 0
      if (anchor.current?.isConnected) index = pageOf(anchor.current)
      else if (resumed) {
        const el = leftAt()
        if (el) index = pageOf(el)
      }
      turnTo(index, false)
      if (!anchor.current?.isConnected)
        anchor.current = firstIn(v.getBoundingClientRect())
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(layout)
    }
    layout()
    window.addEventListener('resize', schedule)
    const changes = new MutationObserver(schedule)
    changes.observe(f, { childList: true, subtree: true, characterData: true })
    void document.fonts.ready.then(schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      changes.disconnect()
      root.style.overflow = overflow
    }
    // (the place to open at is read as it is laid out, not followed)
  }, [paged, size, width.px, help, turnTo, firstIn])

  // The word at the top, kept a moment after scrolling stops; the title
  // gone while scrolling on, and back on scrolling up
  useEffect(() => {
    if (paged) return
    let timer = 0
    let last = window.scrollY
    let way = 0
    const onScroll = () => {
      const d = window.scrollY - last
      last = window.scrollY
      way = Math.sign(d) === Math.sign(way) ? way + d : d
      if (d) hidePointer()
      if (window.scrollY < 8 || way < -12) setControls(true)
      else if (way > 12) setControls(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(
        () =>
          keep(
            firstIn(new DOMRect(0, 70, window.innerWidth, window.innerHeight)),
          ),
        600,
      )
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [paged, keep, firstIn, hidePointer])

  const turn = useCallback(
    (step: number) => {
      turnTo(pager.current.index + step)
      setControls(false)
      hidePointer()
    },
    [turnTo, hidePointer],
  )

  // The pointer back once the mouse really moves (not the move a browser
  // makes up after scrolling, nor a twitch just after the tap)
  useEffect(() => {
    if (pointer) return
    const onMove = (e: MouseEvent) => {
      if (!e.movementX && !e.movementY) return
      if (Date.now() - hidAt.current < 300) return
      setPointer(true)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [pointer])

  // The arrow keys turn the page
  useEffect(() => {
    if (!paged) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if ((e.target as Element | null)?.closest('input, select, textarea'))
        return
      // (not while a word's sheet is open over the page)
      if (document.querySelector('[role="dialog"]')) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') turn(1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') turn(-1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paged, turn])

  // A tap in the margin beside the page turns it, back on the left and on
  // on the right; a tap on the page, not on a word, shows the title and
  // «Aa» or hides them
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (
        target?.closest(
          'a, button, input, label, [data-peek], [role="dialog"], .rd-panel',
        )
      )
        return
      const v = view.current?.getBoundingClientRect()
      if (!v || e.clientY < v.top || e.clientY > v.bottom) return
      if (paged && e.clientX < v.left) turn(-1)
      else if (paged && e.clientX > v.right) turn(1)
      else if (e.clientX >= v.left && e.clientX <= v.right) {
        setControls((shown) => !shown)
        hidePointer()
      }
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [paged, turn, hidePointer])

  // A swipe turns the page
  const from = useRef<{ x: number; y: number } | null>(null)
  const swipe = (e: React.PointerEvent) => {
    const start = from.current
    from.current = null
    if (!paged || !start || e.pointerType === 'mouse') return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    turn(dx < 0 ? 1 : -1)
  }

  // The panel of choices closes on a tap outside it, or Escape
  useEffect(() => {
    if (!panel) return
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest('.rd-panel, .rd-panel-open'))
        setPanel(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(false)
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [panel])

  const finish = () => {
    setPlace(text.id, text.text.length - 1, true)
    // Words met and read without being looked up: read, a little
    let n = 0
    for (const id of idsOf(text, settings.home))
      if (levelOf(id) > 0 && !tapped.current.has(id)) {
        record(id, true, 0.3, 'read')
        n++
      }
    setCredited(n)
    blip('win')
  }

  const next = TEXTS.at(TEXTS.indexOf(text) + 1)
  const sizeBy = (d: number) =>
    setSettings({
      readSize: Math.max(
        0,
        Math.min(READ_SIZES.length - 1, settings.readSize + d),
      ),
    })
  const helped = settings.readPinyin !== 'off' || settings.readEnglish !== 'off'

  return (
    <div
      className={`rd-page${paged ? ' paged' : ''}${controls || panel ? '' : ' rd-hidden'}${pointer || panel ? '' : ' rd-nocursor'}`}
      style={
        {
          '--rd-size': `${size}px`,
          '--rd-width': `${width.px}px`,
        } as CSSProperties
      }
    >
      <header className="rd-top">
        <a
          href="#read"
          aria-label="All texts"
          title="All texts"
          className="rd-round"
        >
          <ArrowLeft size={20} />
        </a>
        <h1>
          <span className="zh">{text.zh}</span>
          <small>{text.en}</small>
        </h1>
        <button
          type="button"
          className="rd-round rd-panel-open"
          aria-label="Display"
          aria-expanded={panel}
          onClick={() => setPanel((o) => !o)}
        >
          <span aria-hidden="true">Aa</span>
        </button>
      </header>

      {panel && (
        <div className="zh-card rd-panel" role="group" aria-label="Display">
          <Row name="Text size">
            <div className="rd-seg">
              <button
                type="button"
                aria-label="Smaller text"
                disabled={settings.readSize <= 0}
                onClick={() => sizeBy(-1)}
              >
                <span className="zh text-[0.85em]">字</span> −
              </button>
              <button
                type="button"
                aria-label="Larger text"
                disabled={settings.readSize >= READ_SIZES.length - 1}
                onClick={() => sizeBy(1)}
              >
                <span className="zh text-[1.15em]">字</span> +
              </button>
            </div>
          </Row>
          <Row name="Pages">
            <div className="rd-seg">
              <button
                type="button"
                aria-pressed={!paged}
                onClick={() => setSettings({ readPaged: false })}
              >
                <ScrollText size={18} aria-hidden="true" /> Scroll
              </button>
              <button
                type="button"
                aria-pressed={paged}
                onClick={() => setSettings({ readPaged: true })}
              >
                <BookOpen size={18} aria-hidden="true" /> Pages
              </button>
            </div>
          </Row>
          <Row name="Width" className="rd-wide">
            <Seg
              options={READ_WIDTHS.map((w, i) => [i, w.name] as const)}
              value={settings.readWidth}
              set={(readWidth) => setSettings({ readWidth })}
            />
          </Row>
          <Row name="Pinyin over the words">
            <Seg
              options={HELPS}
              value={settings.readPinyin}
              set={(readPinyin) => setSettings({ readPinyin })}
            />
          </Row>
          <Row name="English under the words">
            <Seg
              options={HELPS}
              value={settings.readEnglish}
              set={(readEnglish) => setSettings({ readEnglish })}
            />
          </Row>
          <Row name="Colours">
            <Seg
              options={THEMES}
              value={settings.readTheme}
              set={(readTheme) => setSettings({ readTheme })}
            />
          </Row>
        </div>
      )}

      <div className="rd-read">
        <div
          ref={view}
          className="rd-view"
          onPointerDown={(e) => {
            from.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerUp={swipe}
        >
          <div ref={flow} className="rd-flow">
            <header className="rd-head">
              <p className="rd-pinyin">{text.pinyin}</p>
              <p className="rd-by">{text.by}</p>
              <p className="rd-about">{text.about}</p>
              {helped ? (
                <Key />
              ) : (
                <p className="rd-hint">Tap a word to see what it is.</p>
              )}
            </header>
            <CloudDivider className="rd-divider" />

            <div
              className={`rd-text${helped ? '' : ' plain'}${settings.readPinyin === 'off' ? ' no-py' : ''}${settings.readEnglish === 'off' ? ' no-en' : ''}`}
            >
              {text.text.map((para, i) => (
                <p
                  key={i}
                  ref={(el) => {
                    paras.current[i] = el
                  }}
                >
                  {resumed && i === place?.p && (
                    <span className="rd-resumed">
                      You stopped here last time.{' '}
                      <button
                        type="button"
                        className="rd-link"
                        onClick={() => {
                          setResumed(false)
                          if (paged) turn(-pager.current.index)
                          else window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        Back to the start
                      </button>
                    </span>
                  )}
                  {para.map((s, j) => (
                    <Line
                      key={j}
                      line={s}
                      text={text}
                      onPeek={(id) => tapped.current.add(id)}
                    />
                  ))}
                </p>
              ))}
            </div>

            <section className="zh-card rd-end">
              <div className="zh-head text-[1.2rem]">
                <span className="zh mr-2 text-[var(--red)]">完</span> The end
              </div>
              {credited === null ? (
                <>
                  <p className="mt-1 text-sm text-[var(--ink-2)]">
                    The words you have met and read without looking them up
                    count as read when you finish.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="button" className="rd-btn" onClick={finish}>
                      <Check size={18} aria-hidden="true" /> Finished
                    </button>
                    <a className="rd-link" href="#read">
                      All texts
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-[var(--ink-2)]">
                    {credited
                      ? `${credited} words counted as read.`
                      : 'The text is read.'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {next && (
                      <a className="rd-btn" href={`#read/${next.id}`}>
                        Next: <span className="zh">{next.zh}</span>
                      </a>
                    )}
                    <a className="rd-link" href="#read">
                      All texts
                    </a>
                  </div>
                </>
              )}
            </section>
            <span ref={end} className="rd-flow-end" aria-hidden="true" />
          </div>
        </div>

        {paged && (
          <div className="rd-pages" aria-live="polite">
            {pages.index + 1} of {pages.count}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  name,
  className = '',
  children,
}: {
  name: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`rd-row ${className}`}>
      <span>{name}</span>
      {children}
    </div>
  )
}

function Seg<T extends string | number>({
  options,
  value,
  set,
}: {
  options: ReadonlyArray<readonly [T, string]>
  value: T
  set: (v: T) => void
}) {
  return (
    <div className="rd-seg">
      {options.map(([v, name]) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          onClick={() => set(v)}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

// What the colours of the help mean
function Key() {
  return (
    <div className="rd-key">
      <span>
        <span className="rd-w nw">
          <span className="rd-py">xīn</span>
          <span className="rd-h zh">新</span>
          <span className="rd-en">new</span>
        </span>
        not met yet
      </span>
      <span>
        <span className="rd-w lw">
          <span className="rd-py">xué</span>
          <span className="rd-h zh">学</span>
          <span className="rd-en">learn</span>
        </span>
        being learnt: the help goes as you learn it
      </span>
    </div>
  )
}
