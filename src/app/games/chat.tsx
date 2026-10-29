import { useEffect, useMemo, useRef, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import {
  Check,
  Headphones,
  Hourglass,
  KeyRound,
  Languages,
  Mic,
  MicOff,
  PhoneOff,
  Plus,
  RotateCcw,
  Send,
  Volume2,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { WORD } from '../data/words'
import { SCENES, fromItems, idsIn, instructions, segment } from '../lib/chat'
import {
  begin,
  heard,
  interrupted,
  said,
  show,
  turnEnd,
  typed,
} from '../lib/chatLines'
import { Live, Loudness, getKey, setKey, voiceOut } from '../lib/live'
import { MUTED, audioContext } from '../lib/audio'
import { hushMusic } from '../lib/music'
import { useStore } from '../lib/store'
import { Btn, Frame, Words } from '../ui'
import { Face } from '../pixel/Pix'
import { useKeys } from './fx'
import type { ReactNode } from 'react'
import type { Item, Pace } from '../lib/chat'
import type { Line } from '../lib/chatLines'
import type { Look } from '../pixel/Pix'

// Chat: a conversation out loud with 林老师, played by Gemini Live on the
// player's own API key (lib/live.ts), about a scene of their choice. The
// key is kept on the account, encrypted, when signed in (convex/chat.ts),
// and else in this browser. What
// both say is shown word by word as the rest of the page shows Chinese,
// from what the partner gives show_line (lib/chat.ts), and until it does,
// from the transcript split into the bank's words. Words outside the bank
// are blue. Nothing is recorded in the bank: a word looked up is counted
// by its sheet, as anywhere.
//
// ?chat=demo#chat shows a conversation made up, for looking at the page.

const PARTNER = { name: '林老师', py: 'Lín lǎoshī', voice: 'Kore' }
const LOOK: Look = {
  style: 'bun',
  hair: '#2c1c1a',
  coat: '#2f7d6d',
  glasses: true,
  clothes: 'mandarin',
}

type State = 'setup' | 'calling' | 'live' | 'over'

const PREFS = 'tian:chat:v1'
interface Prefs {
  scene: string
  pace: Pace
  open: boolean
  // The player says when they have finished, instead of a pause
  manual: boolean
}

function loadPrefs(): Prefs {
  const base: Prefs = {
    scene: 'free',
    pace: 'slow',
    open: false,
    manual: false,
  }
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(PREFS) ?? '{}') }
  } catch {
    return base
  }
}

const DEMO: Array<Line> = [
  {
    who: 'partner',
    text: '你好！今天你想吃什么？',
    toks: fromItems(
      '你好|！|今天|你|想|吃|什么|？'.split('|').map((w) => ({ w })),
    ),
    en: 'Hello! What would you like to eat today?',
    done: true,
  },
  {
    who: 'learner',
    text: '我想吃饺子。',
    toks: fromItems('我|想|吃|饺子|。'.split('|').map((w) => ({ w }))),
    en: 'I would like dumplings.',
    done: true,
  },
  {
    who: 'partner',
    text: '好的。你要猪肉白菜的，还是韭菜的？',
    toks: fromItems([
      { w: '好的' },
      { w: '。' },
      { w: '你' },
      { w: '要' },
      { w: '猪肉' },
      { w: '白菜', p: 'bái cài', e: 'cabbage' },
      { w: '的' },
      { w: '，' },
      { w: '还是' },
      { w: '韭菜', p: 'jiǔ cài', e: 'chives' },
      { w: '的' },
      { w: '？' },
    ] satisfies Array<Item>),
    en: 'Sure. Pork and cabbage, or chives?',
    done: true,
  },
  {
    who: 'learner',
    text: '我要两个猪肉的',
    toks: fromItems('我|要|两|个|猪肉|的'.split('|').map((w) => ({ w }))),
    en: 'I want two pork ones.',
    better: fromItems('我|要|两|盘|猪肉|的|。'.split('|').map((w) => ({ w }))),
    done: true,
  },
  {
    who: 'partner',
    text: '两盘猪肉白菜的，好',
    done: false,
  },
]

export default function Chat() {
  const { bank, settings, account } = useStore()
  const demo = useMemo(
    () => new URLSearchParams(location.search).get('chat') === 'demo',
    [],
  )
  // The key: on the account, or in this browser
  const kept = useQuery(api.chat.saved, account.me ? {} : 'skip')
  // The account may not answer (Convex down): then, after a while, the key
  // is kept in this browser as when signed out
  const [waited, setWaited] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 4000)
    return () => clearTimeout(t)
  }, [])
  const signedIn = !!account.me && kept !== undefined
  const saveKey = useAction(api.chat.save)
  const mintToken = useAction(api.chat.token)
  const forgetKey = useMutation(api.chat.forget)
  const [local, setLocal] = useState(getKey)
  const keepLocal = (k: string) => {
    setKey(k)
    setLocal(k)
  }
  const where = kept ? 'account' : local ? 'browser' : null
  const loading =
    !waited && (account.loading || (!!account.me && kept === undefined))
  // Kept on the account when signed in, else here
  const keep = async (k: string) => {
    if (!signedIn) return keepLocal(k)
    await saveKey({ key: k }).catch((e: unknown) => {
      throw new Error(reason(e))
    })
    keepLocal('')
  }
  const [prefs, setPrefsHere] = useState(loadPrefs)
  const setPrefs = (p: Partial<Prefs>) =>
    setPrefsHere((old) => {
      const n = { ...old, ...p }
      try {
        localStorage.setItem(PREFS, JSON.stringify(n))
      } catch {
        // private mode
      }
      return n
    })
  const [state, setState] = useState<State>(demo ? 'live' : 'setup')
  const [lines, setLines] = useState<Array<Line>>(demo ? DEMO : [])
  const [why, setWhy] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [level, setLevel] = useState(0)
  const [muted, setMuted] = useState(false)
  // The player's turn, begun and ended by hand
  const [turn, setTurn] = useState(false)
  const live = useRef<Live | null>(null)
  const scene = SCENES.find((s) => s.id === prefs.scene) ?? SCENES[0]

  // The zither would be heard by the microphone
  useEffect(() => {
    hushMusic(true)
    return () => {
      hushMusic(false)
      live.current?.stop()
    }
  }, [])

  const call = (again: boolean) => {
    const history = again
      ? lines.slice(-16).map((l) => ({
          who: l.who,
          text: l.toks ? l.toks.map((t) => t.h).join('') : l.text,
        }))
      : undefined
    if (!again) setLines([])
    setWhy(null)
    setEnding(false)
    setMuted(false)
    setTurn(false)
    setState('calling')
    const text = instructions(bank, Date.now(), {
      scene,
      pace: prefs.pace,
      home: WORD[settings.home]?.g ?? 'abroad',
      history,
    })
    const l = new Live(
      where === 'account'
        ? () =>
            mintToken({}).then(
              (token) => ({ token }),
              (e: unknown) => {
                throw new Error(reason(e))
              },
            )
        : { key: local },
      {
        instructions: text,
        voice: PARTNER.voice,
        pause: prefs.manual ? 'manual' : prefs.pace === 'slow' ? 1800 : 1100,
      },
      {
        ready: () => setState('live'),
        heard: (t) => setLines((ls) => heard(ls, t, prefs.manual)),
        said: (t) => setLines((ls) => said(ls, t)),
        shown: (s) => setLines((ls) => show(ls, s)),
        turnEnd: (sound) => setLines((ls) => turnEnd(ls, sound)),
        interrupted: () => setLines(interrupted),
        speaking: setSpeaking,
        level: setLevel,
        ending: () => setEnding(true),
        closed: (w) => {
          setWhy(w)
          setSpeaking(false)
          setState('over')
          live.current = null
        },
      },
    )
    live.current = l
    l.open = prefs.open
    void l.start().catch((e: unknown) => {
      setWhy(String(e))
      setState('over')
    })
  }

  const type = (text: string) => {
    if (!live.current || !text.trim()) return
    setLines((ls) => typed(ls, text.trim()))
    live.current.say(text.trim())
  }

  const hearAgain = (sound: Float32Array<ArrayBuffer>) => {
    const c = audioContext()
    if (!c) return
    const buf = c.createBuffer(1, sound.length, 24000)
    buf.copyToChannel(sound, 0)
    const src = c.createBufferSource()
    src.buffer = buf
    const out = voiceOut(c)
    const loud = new Loudness()
    loud.add(sound)
    if (!MUTED) out.gain.value = loud.gain()
    src.connect(out)
    src.start()
    live.current?.hold(buf.duration)
  }

  if (loading && !demo)
    return (
      <Frame title="Chat" zh="聊天">
        <p className="text-center text-[var(--ink-2)]">…</p>
      </Frame>
    )

  if (!where && !demo)
    return (
      <Frame title="Chat" zh="聊天">
        <KeyForm signedIn={signedIn} onKey={keep} />
      </Frame>
    )

  if (state === 'setup')
    return (
      <Frame title="Chat" zh="聊天">
        <Setup prefs={prefs} setPrefs={setPrefs} onStart={() => call(false)} />
        {where === 'account' && kept ? (
          <KeyLine
            last4={kept.last4}
            where="on your account, encrypted"
            onForget={() => void forgetKey({})}
          />
        ) : (
          <KeyLine
            last4={local.slice(-4)}
            where="in this browser"
            onForget={() => keepLocal('')}
            onMove={signedIn ? () => keep(local) : undefined}
          />
        )}
      </Frame>
    )

  return (
    <Frame title="Chat" zh="聊天">
      <Partner
        status={
          state === 'calling'
            ? 'Calling…'
            : state === 'over'
              ? 'Call ended'
              : speaking
                ? 'Speaking'
                : prefs.manual
                  ? turn
                    ? 'Listening, until you let go or tap Done'
                    : 'Hold or tap Talk when you are ready'
                  : muted
                    ? 'Microphone off'
                    : 'Listening'
        }
        talking={speaking}
        scene={
          <>
            <span className="zh">{scene.zh}</span> {scene.title}
          </>
        }
      />
      <Transcript lines={lines} onHear={hearAgain} room={state !== 'over'} />
      {state === 'over' ? (
        <div className="zh-card mt-4 flex flex-col items-center gap-3 p-5 text-center">
          {why && <p className="text-sm text-[var(--red)]">{why}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {lines.length > 0 && (
              <Btn onClick={() => call(true)}>
                <RotateCcw size={16} /> Call again
              </Btn>
            )}
            <Btn kind="ghost" onClick={() => setState('setup')}>
              New chat
            </Btn>
          </div>
        </div>
      ) : (
        <Bar
          live={state === 'live' && !demo}
          level={level}
          muted={muted}
          manual={prefs.manual}
          turn={turn}
          onTurn={(on) => {
            if (on) setLines(begin)
            live.current?.talk(on)
            setTurn(on)
          }}
          ending={ending}
          onMute={() => {
            live.current?.mute(!muted)
            setMuted(!muted)
          }}
          onType={type}
          onEnd={() => {
            setTurn(false)
            if (demo) setState('over')
            else live.current?.stop()
          }}
        />
      )}
    </Frame>
  )
}

// What went wrong, as the server put it
const reason = (e: unknown) =>
  e instanceof ConvexError
    ? String(e.data)
    : 'Could not reach the account. Try again.'

function Partner({
  status,
  talking,
  scene,
}: {
  status: string
  talking: boolean
  scene: ReactNode
}) {
  return (
    <div className="zh-card mb-4 flex items-center gap-4 p-4">
      <Face
        look={LOOK}
        size={64}
        talking={talking}
        className="shrink-0 rounded-2xl border-2 border-[var(--ink)] bg-[#f3d9a4]"
      />
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="zh text-xl">{PARTNER.name}</span>
          <span className="text-sm text-[var(--ink-2)]">{PARTNER.py}</span>
        </p>
        <p className="text-sm text-[var(--ink-2)]">{scene}</p>
        <p
          className={`mt-1 text-xs font-bold tracking-wide uppercase ${talking ? 'text-[var(--jade)]' : 'text-[var(--ink-2)]'}`}
        >
          {status}
        </p>
      </div>
    </div>
  )
}

function Transcript({
  lines,
  onHear,
  room,
}: {
  lines: Array<Line>
  onHear: (s: Float32Array<ArrayBuffer>) => void
  // room at the foot for the bar
  room: boolean
}) {
  const end = useRef<HTMLDivElement>(null)
  const last = lines.at(-1)
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lines.length, last?.text, last?.toks])
  return (
    <div className="flex flex-col gap-3">
      {lines.map((l, i) => (
        <Said key={i} line={l} onHear={onHear} />
      ))}
      <div ref={end} className={room ? 'h-28' : 'h-0'} />
    </div>
  )
}

function Said({
  line,
  onHear,
}: {
  line: Line
  onHear: (s: Float32Array<ArrayBuffer>) => void
}) {
  const [english, setEnglish] = useState(false)
  const toks = useMemo(
    () => line.toks ?? segment(line.text),
    [line.toks, line.text],
  )
  const mine = line.who === 'learner'
  // Words of the bank in what to say that have not been met, to learn
  const { levelOf, meet } = useStore()
  const fresh = line.better
    ? idsIn(line.better).filter((id) => levelOf(id) === 0)
    : []
  if (!toks.length) return null
  return (
    <div
      className={`flex max-w-[92%] flex-col gap-2 rounded-2xl px-4 py-3 ${
        mine
          ? 'self-end rounded-br-md bg-[var(--paper-2)]'
          : 'self-start rounded-bl-md bg-[var(--card)] shadow-sm'
      } ${line.done ? '' : 'opacity-80'}`}
    >
      <Words toks={toks} size="md" />
      {line.better && (
        <div className="rounded-xl bg-[#e3f0ea] px-3 py-2">
          <p className="mb-1 text-[11px] font-bold tracking-wide text-[var(--jade)] uppercase">
            Say it like this
          </p>
          <Words toks={line.better} size="sm" />
          {fresh.length > 0 && (
            <button
              type="button"
              onClick={() => meet(fresh)}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--jade)] px-3 py-1 text-xs font-bold text-white"
            >
              <Plus size={14} /> Learn{' '}
              {fresh.length === 1
                ? 'the new word'
                : `the ${fresh.length} new words`}
            </button>
          )}
        </div>
      )}
      {english && line.en && (
        <p className="text-sm leading-snug text-[var(--ink-2)]">{line.en}</p>
      )}
      {(line.en || line.sound) && (
        <div className="-mb-1 flex gap-1 self-end text-[var(--ink-2)]">
          {line.sound && (
            <button
              type="button"
              aria-label="Hear it again"
              title="Hear it again"
              onClick={() => onHear(line.sound!)}
              className="rounded-full p-1.5 hover:bg-[var(--paper-2)] hover:text-[var(--jade)]"
            >
              <Volume2 size={16} />
            </button>
          )}
          {line.en && (
            <button
              type="button"
              aria-label="In English"
              aria-pressed={english}
              title="In English"
              onClick={() => setEnglish(!english)}
              className={`rounded-full p-1.5 hover:bg-[var(--paper-2)] ${english ? 'text-[var(--jade)]' : ''}`}
            >
              <Languages size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// The microphone, a line to type in instead, and the way out, kept at
// the foot of the screen
function Bar({
  live,
  level,
  muted,
  manual,
  turn,
  onTurn,
  ending,
  onMute,
  onType,
  onEnd,
}: {
  live: boolean
  level: number
  muted: boolean
  // Turns begun and ended by hand: Talk, then Done (or Space)
  manual: boolean
  turn: boolean
  onTurn: (on: boolean) => void
  ending: boolean
  onMute: () => void
  onType: (text: string) => void
  onEnd: () => void
}) {
  const [text, setText] = useState('')
  // Talk held down is a turn while it is held, like a walkie-talkie;
  // tapped, the turn stays open, to think in, until Done
  const held = useRef<number | null>(null)
  const press = () => {
    if (turn) return onTurn(false)
    held.current = Date.now()
    onTurn(true)
  }
  const release = () => {
    const at = held.current
    held.current = null
    if (at !== null && Date.now() - at > 400) onTurn(false)
  }
  const releaseRef = useRef(release)
  releaseRef.current = release
  // Space does the same (a button with the focus takes Space itself)
  useKeys((key, e) => {
    if (key !== ' ' || !manual || !live) return
    if (e.target instanceof HTMLButtonElement) return
    press()
    return true
  })
  useEffect(() => {
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') releaseRef.current()
    }
    window.addEventListener('keyup', up)
    return () => window.removeEventListener('keyup', up)
  }, [])
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-[var(--paper-2)] bg-[var(--paper)]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      {ending && (
        <p className="mb-2 text-center text-xs text-[var(--ink-2)]">
          The call ends in a minute; you can call again after.
        </p>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onType(text)
          setText('')
        }}
      >
        {manual ? (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault()
              press()
            }}
            onPointerUp={release}
            onPointerCancel={release}
            // from the keyboard
            onClick={(e) => e.detail === 0 && onTurn(!turn)}
            disabled={!live}
            aria-pressed={turn}
            className={`inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 font-bold text-white transition disabled:opacity-40 ${turn ? 'bg-[var(--red)]' : 'bg-[var(--jade)]'}`}
            style={{
              boxShadow:
                live && turn
                  ? `0 0 0 ${2 + Math.round(level * 10)}px rgba(200,55,45,0.25)`
                  : undefined,
            }}
          >
            {turn ? <Check size={20} /> : <Mic size={20} />}
            {turn ? 'Done' : 'Talk'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onMute}
            disabled={!live}
            aria-label={
              muted ? 'Turn the microphone on' : 'Turn the microphone off'
            }
            aria-pressed={!muted}
            className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40 ${muted ? 'bg-[var(--ink-2)]' : 'bg-[var(--jade)]'}`}
            style={{
              boxShadow:
                live && !muted
                  ? `0 0 0 ${2 + Math.round(level * 10)}px rgba(47,125,109,0.25)`
                  : undefined,
            }}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!live}
          placeholder="Or type it"
          aria-label="Type instead"
          className="min-w-0 flex-1 rounded-xl border-2 border-[var(--paper-2)] bg-white px-3 py-2.5 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!live || !text.trim()}
          aria-label="Send"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--paper-2)] text-[var(--ink)] disabled:opacity-40"
        >
          <Send size={18} />
        </button>
        <button
          type="button"
          onClick={onEnd}
          aria-label="End the call"
          title="End the call"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--red)] text-white"
        >
          <PhoneOff size={18} />
        </button>
      </form>
    </div>
  )
}

function Setup({
  prefs,
  setPrefs,
  onStart,
}: {
  prefs: Prefs
  setPrefs: (p: Partial<Prefs>) => void
  onStart: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="zh-card flex items-center gap-4 p-5">
        <Face
          look={LOOK}
          size={72}
          className="shrink-0 rounded-2xl border-2 border-[var(--ink)] bg-[#f3d9a4]"
        />
        <p className="leading-snug">
          Talk out loud with <span className="zh text-lg">{PARTNER.name}</span>{' '}
          <span className="text-[var(--ink-2)]">({PARTNER.py})</span>, who knows
          the words you know and keeps to them. What you both say is written out
          as Tian shows words everywhere.
        </p>
      </div>

      <div className="zh-card p-5">
        <h2 className="zh-head mb-3 text-lg">What about?</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SCENES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={prefs.scene === s.id}
              onClick={() => setPrefs({ scene: s.id })}
              className={`flex flex-col items-start rounded-2xl border-2 px-3 py-2 text-left transition ${
                prefs.scene === s.id
                  ? 'border-[var(--jade)] bg-[#e3f0ea]'
                  : 'border-[var(--paper-2)] bg-[var(--paper)] hover:border-[var(--gold)]'
              }`}
            >
              <span className="zh text-lg leading-tight">{s.zh}</span>
              <span className="text-sm text-[var(--ink-2)]">{s.title}</span>
            </button>
          ))}
        </div>

        <h2 className="zh-head mt-5 mb-3 text-lg">How fast?</h2>
        <div className="flex gap-2">
          {(
            [
              ['slow', 'Slowly', 'every tone said fully'],
              ['natural', 'Naturally', 'at a calm pace'],
            ] as const
          ).map(([id, name, text]) => (
            <button
              key={id}
              type="button"
              aria-pressed={prefs.pace === id}
              onClick={() => setPrefs({ pace: id })}
              className={`flex flex-1 flex-col items-start rounded-2xl border-2 px-3 py-2 text-left transition ${
                prefs.pace === id
                  ? 'border-[var(--jade)] bg-[#e3f0ea]'
                  : 'border-[var(--paper-2)] bg-[var(--paper)] hover:border-[var(--gold)]'
              }`}
            >
              <span className="font-bold">{name}</span>
              <span className="text-sm text-[var(--ink-2)]">{text}</span>
            </button>
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={prefs.open}
            onChange={(e) => setPrefs({ open: e.target.checked })}
            className="mt-1 h-5 w-5 accent-[var(--jade)]"
          />
          <span className="leading-snug">
            <span className="flex items-center gap-1.5 font-bold">
              <Headphones size={16} /> I have headphones on
            </span>
            <span className="text-sm text-[var(--ink-2)]">
              Then you can speak over {PARTNER.name}. Without them, the
              microphone rests while {PARTNER.name} speaks, so that the voice
              from the speaker is not heard as yours.
            </span>
          </span>
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={prefs.manual}
            onChange={(e) => setPrefs({ manual: e.target.checked })}
            className="mt-1 h-5 w-5 accent-[var(--jade)]"
          />
          <span className="leading-snug">
            <span className="flex items-center gap-1.5 font-bold">
              <Hourglass size={16} /> Let me take my time
            </span>
            <span className="text-sm text-[var(--ink-2)]">
              Hold Talk (or Space) while you speak, or tap it, think as long as
              you like, and tap Done. Nothing is heard in between. Otherwise a
              long pause ends your turn.
            </span>
          </span>
        </label>

        <Btn onClick={onStart} className="mt-5 w-full py-3 text-lg">
          <Mic size={20} /> Start talking
        </Btn>
      </div>

      <div className="zh-card p-5 text-sm leading-relaxed text-[var(--ink-2)]">
        <p>
          A word you have not met has its pinyin and English in{' '}
          <span className="font-bold text-[var(--gold-2)]">brown</span>, one you
          are learning in{' '}
          <span className="font-bold text-[var(--jade)]">jade</span>, and a word
          you know stands alone. A word in{' '}
          <span className="font-bold text-[var(--sky)] underline decoration-dotted">
            blue
          </span>{' '}
          is not in Tian&rsquo;s word bank, so there is nothing here to practise
          it with yet. Tap any word to look at it.
        </p>
      </div>
    </div>
  )
}

function KeyForm({
  signedIn,
  onKey,
}: {
  signedIn: boolean
  onKey: (k: string) => Promise<void> | void
}) {
  const [k, setK] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="zh-card p-5 leading-relaxed">
      <h2 className="zh-head mb-2 flex items-center gap-2 text-lg">
        <KeyRound size={18} /> Your own Gemini key
      </h2>
      <p>
        The chat is spoken by Google&rsquo;s Gemini Live, on an API key of your
        own. Make one at{' '}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="font-bold text-[var(--jade)] underline"
        >
          Google AI Studio
        </a>{' '}
        (it is free to start, with a daily limit), and paste it here.
      </p>
      <p className="mt-2 text-sm text-[var(--ink-2)]">
        {signedIn
          ? 'It is kept on your account, encrypted, for every device you sign in on. Your browser never gets it back: each call is given a token for that call alone. '
          : 'It is kept in this browser only; sign in to keep it on your account, for every device. '}
        Google gets what you say and the words you know, and counts the minutes
        against the key: billed by the minute if the key&rsquo;s project pays.
      </p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!k.trim() || busy) return
          setBusy(true)
          setError(null)
          Promise.resolve(onKey(k.trim()))
            .catch((err: unknown) =>
              setError(err instanceof Error ? err.message : String(err)),
            )
            .finally(() => setBusy(false))
        }}
      >
        <input
          type="password"
          value={k}
          onChange={(e) => setK(e.target.value)}
          placeholder="API key"
          aria-label="Gemini API key"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border-2 border-[var(--paper-2)] bg-white px-3 py-2 font-mono"
        />
        <Btn type="submit" disabled={!k.trim() || busy}>
          {busy ? 'Checking…' : 'Save'}
        </Btn>
      </form>
      {error && <p className="mt-2 text-sm text-[var(--red)]">{error}</p>}
    </div>
  )
}

function KeyLine({
  last4,
  where,
  onForget,
  onMove,
}: {
  last4: string
  where: string
  onForget: () => void
  // To the account, from this browser
  onMove?: () => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="mt-4 text-center text-xs text-[var(--ink-2)]">
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <KeyRound size={14} />
        <span>
          Gemini key <span className="font-mono">…{last4}</span>, kept {where}
        </span>
        {onMove && (
          <button
            type="button"
            onClick={() =>
              void onMove().catch((e: unknown) =>
                setError(e instanceof Error ? e.message : String(e)),
              )
            }
            className="font-bold text-[var(--jade)] underline"
          >
            Keep it on your account
          </button>
        )}
        <button
          type="button"
          onClick={onForget}
          className="font-bold underline hover:text-[var(--red)]"
        >
          Remove it
        </button>
      </p>
      {error && <p className="mt-1 text-[var(--red)]">{error}</p>}
    </div>
  )
}
