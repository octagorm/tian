import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  Eye,
  EyeOff,
  Headphones,
  Lightbulb,
  Map as MapIcon,
  RotateCcw,
  ScrollText,
  Target,
  Volume2,
} from 'lucide-react'
import { CITIES, PLAYER_LOOK, PLAYER_VOICE, SCENES } from '../data/trip'
import { GRAMMAR } from '../data/grammar'
import { Backdrop } from '../pixel/Backdrop'
import { StageView } from '../pixel/StageView'
import { MapView } from '../pixel/MapView'
import { TRIP_ART } from '../pixel/art'
import { Face } from '../pixel/Pix'
import { WORD, WORDS } from '../data/words'
import { english, plain, tokens, wordIds } from '../lib/text'
import { blip, say, stop } from '../lib/audio'
import { useStore } from '../lib/store'
import { todays } from '../lib/today'
import {
  Btn,
  Frame,
  Mixed,
  Ruby,
  Sprinkled,
  Stars,
  shuffle,
  tokenLevel,
} from '../ui'
import type { Actor, Stage } from '../pixel/stage'
import type { View } from '../pixel/StageView'
import type { CastMember, Choice, City, Option, Scene } from '../data/trip'
import './trip.css'

// The trip: scenes of talk across China, played as a point-and-click
// adventure. The cast stand in a painted scene and say their lines over
// their heads in mixed text; the player's replies are listed below, to
// pick with a tap or the keys 1 to 4. Before a scene a few of its words
// are met (they turn to hanzi with pinyin); in the scene every reply that
// is right on the first try counts for the words of it shown in Chinese,
// and a wrong one against them.

const cityOf = (sceneId: string) =>
  CITIES.find((c) => c.scenes.some((s) => s.id === sceneId))

export default function Trip() {
  const [sceneId, setSceneId] = useState<string | null>(() => {
    const s = new URLSearchParams(window.location.search).get('scene')
    return s && SCENES.some((x) => x.id === s) ? s : null
  })
  const [run, setRun] = useState(0)
  // Between cities: the map, with the traveller on the way
  const [travel, setTravel] = useState<{
    from: City
    to: City
    next: string
  } | null>(null)
  const scene = SCENES.find((s) => s.id === sceneId)

  const go = (id: string) => {
    setSceneId(id)
    setRun((r) => r + 1)
    window.scrollTo(0, 0)
  }

  if (travel)
    return (
      <Frame title="On the way" zh="路上">
        <MapView
          travel={{ from: travel.from.id, to: travel.to.id }}
          onArrive={() => {
            setTravel(null)
            go(travel.next)
          }}
        />
        <p className="mt-4 text-center text-[var(--ink-2)]">
          {travel.from.name} to{' '}
          <span className="font-bold text-[var(--ink)]">{travel.to.name}</span>
          <span className="zh ml-2 text-[var(--red)]">{travel.to.h}</span>
        </p>
        <div className="mt-3 flex justify-center">
          <Btn
            kind="ghost"
            onClick={() => {
              setTravel(null)
              go(travel.next)
            }}
          >
            Skip <ChevronRight size={16} />
          </Btn>
        </div>
      </Frame>
    )
  if (scene)
    return (
      <Play
        key={`${scene.id}-${run}`}
        scene={scene}
        onExit={() => setSceneId(null)}
        onNext={(id) => {
          const from = cityOf(scene.id)
          const to = cityOf(id)
          if (from && to && from.id !== to.id) {
            setTravel({ from, to, next: id })
            window.scrollTo(0, 0)
          } else go(id)
        }}
      />
    )
  return <TripMap onPick={go} />
}

// --- The map and the list of scenes ---

// The cast of a scene standing in their places, for its picture in the
// list (the same array each time, so the picture is not redrawn for it)
const castCache = new Map<string, Array<Actor>>()
function castOf(scene: Scene): Array<Actor> {
  let list = castCache.get(scene.id)
  if (!list) {
    const art = TRIP_ART[scene.id]
    list = Object.entries(scene.cast).flatMap(([key, member]) => {
      const spot = art?.spots[key]
      return spot ? [{ key, look: member.look, ...spot }] : []
    })
    castCache.set(scene.id, list)
  }
  return list
}

function TripMap({ onPick }: { onPick: (id: string) => void }) {
  const { bank } = useStore()
  const next = SCENES.find((s) => !bank.scenes[s.id])
  const played = SCENES.filter((s) => bank.scenes[s.id]).length
  const starCount = SCENES.reduce((n, s) => n + (bank.scenes[s.id] ?? 0), 0)
  return (
    <Frame title="The trip" zh="旅行">
      <p className="mb-5 text-[var(--ink-2)]">
        From Beijing to Shanghai, a city at a time. Words you have not met are
        in English but in Chinese order; each scene brings a few into Chinese.
        Tap any word to see it.
      </p>
      <MapView
        onCity={(id) =>
          document
            .getElementById(`city-${id}`)
            ?.scrollIntoView({ behavior: 'smooth' })
        }
      />
      {played > 0 && (
        <p className="mt-3 text-center text-sm text-[var(--ink-2)]">
          {played} of {SCENES.length} scenes ·{' '}
          <span className="font-bold text-[var(--gold)]">{starCount}</span> of{' '}
          {SCENES.length * 3} stars
        </p>
      )}
      {next && (
        <button
          type="button"
          onClick={() => onPick(next.id)}
          className="zh-card mt-4 flex w-full items-center gap-3 overflow-hidden p-0 text-left transition hover:-translate-y-0.5"
        >
          <Backdrop
            id={next.id}
            className="w-32 shrink-0 sm:w-44"
            actors={castOf(next)}
            animate
          />
          <span className="min-w-0 flex-1 py-3">
            <span className="block text-xs font-bold tracking-wide text-[var(--gold)] uppercase">
              Next stop · {cityOf(next.id)?.name}
            </span>
            <span className="block text-lg font-black">{next.title}</span>
          </span>
          <ChevronRight className="mr-3 shrink-0 text-[var(--red)]" />
        </button>
      )}
      <ol className="relative mt-8 flex flex-col gap-6 border-l-4 border-dotted border-[var(--red)]/40 pl-6">
        {CITIES.map((city) => (
          <li
            key={city.id}
            id={`city-${city.id}`}
            className="relative scroll-mt-4"
          >
            <span className="absolute top-2 -left-[2.1rem] h-5 w-5 rounded-full border-4 border-[var(--red)] bg-[var(--paper)]" />
            <div className="flex items-baseline gap-2">
              <Ruby
                h={city.h}
                p={WORD[city.h]?.p ?? ''}
                className="text-3xl text-[var(--red)]"
              />
              <h2 className="text-xl font-black">{city.name}</h2>
            </div>
            <p className="mb-3 text-sm text-[var(--ink-2)]">{city.blurb}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {city.scenes.map((s) => {
                const stars = bank.scenes[s.id] ?? 0
                const isNext = next?.id === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPick(s.id)}
                    className={`zh-card flex items-center gap-3 p-2 text-left transition hover:-translate-y-0.5 ${isNext ? 'ring-2 ring-[var(--gold)]' : ''}`}
                  >
                    <Backdrop
                      id={s.id}
                      actors={castOf(s)}
                      className="w-28 shrink-0 rounded-md border-2 border-[var(--ink)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{s.title}</span>
                      {stars ? (
                        <Stars n={stars} />
                      ) : (
                        <span className="text-xs font-bold text-[var(--gold)] uppercase">
                          {isNext ? 'Next stop' : 'Not yet'}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ol>
    </Frame>
  )
}

// --- A scene ---

interface Said {
  n: number
  // a key of the cast, or 'you'
  who: string
  zh: string
  en: string
  voice: string
}

// How long someone talks with the sound off, and how long a line stays
// before the next one replaces it
const talkMs = (zh: string, home: string) =>
  700 + [...plain(zh, { home })].length * 170
const readMs = (zh: string, home: string) => 1400 + talkMs(zh, home)

// A colour of speech for each of the cast, from their coat: bright enough
// to read over a scene. The player speaks in white.
function voiceColour(c: CastMember | undefined): string {
  if (!c) return '#fff8e8'
  const n = parseInt(c.look.coat.slice(1), 16)
  const r = (n >> 16) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  if (max !== min) {
    const d = max - min
    h =
      max === r
        ? ((g - b) / d + 6) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4
    h *= 60
  }
  // grey, black and white coats get a colour from the name
  if (max - min < 0.12)
    h = ([...c.name].reduce((a, ch) => a + ch.charCodeAt(0), 0) * 47) % 360
  return `hsl(${Math.round(h)} 85% 74%)`
}

function Play({
  scene,
  onExit,
  onNext,
}: {
  scene: Scene
  onExit: () => void
  onNext: (id: string) => void
}) {
  const store = useStore()
  const { settings, bank, meet, record, levelOf, setScene, points } = store
  const vars = { home: settings.home }
  const homeName = WORD[settings.home]?.g ?? settings.home
  const art = TRIP_ART[scene.id]
  const city = cityOf(scene.id)
  // A step of today's session, opened from there
  const inToday = !!todays(bank, Date.now())?.steps.some(
    (s) => s.k === 'trip' && s.arg === scene.id && s.pts !== undefined,
  )

  // The scene's words, and the ones to meet now: unmet, in lesson order
  const fresh = useMemo(() => {
    const ids = new Set<string>()
    for (const step of scene.steps) {
      const lines =
        step.kind === 'line'
          ? [step.zh]
          : step.options.filter((o) => o.right).map((o) => o.zh)
      for (const l of lines) wordIds(l, vars).forEach((id) => ids.add(id))
    }
    const order = new Map(WORDS.map((w, i) => [w.id, i]))
    return [...ids]
      .filter((id) => !bank.cards[id])
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
      .slice(0, settings.perScene)
    // Only when the scene opens
  }, [scene.id])
  const freshSet = useMemo(() => new Set(fresh), [fresh])

  const [started, setStarted] = useState(false)
  const [at, setAt] = useState(0)
  const [log, setLog] = useState<Array<Said>>([])
  const [talking, setTalking] = useState<string | null>(null)
  // A right reply chosen, being said
  const [answered, setAnswered] = useState<number | null>(null)
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const [shake, setShake] = useState<number | null>(null)
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [listen, setListen] = useState(false)
  const [showEn, setShowEn] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const stage = useRef<Stage | null>(null)
  const skip = useRef<(() => void) | null>(null)

  const step = scene.steps[at] as Scene['steps'][number] | undefined
  const done = started && at >= scene.steps.length
  const castKeys = Object.keys(scene.cast)
  // who to look at when the player answers
  const lastNpc =
    [...log].reverse().find((s) => s.who !== 'you')?.who ?? castKeys[0]

  // The people in the scene: the cast at once, the player once started
  const actors = useMemo(() => {
    const list: Array<Actor> = []
    for (const [key, member] of Object.entries(scene.cast)) {
      const spot = art?.spots[key]
      if (spot) list.push({ key, look: member.look, ...spot })
    }
    const you = art?.spots.you
    if (started && you) list.push({ key: 'you', look: PLAYER_LOOK, ...you })
    return list
  }, [scene.id, started])

  useEffect(() => () => stop(), [])

  // The player walks in when the scene starts
  useEffect(() => {
    if (!started) return
    const you = art?.spots.you
    if (you && !you.window && you.clip === undefined)
      stage.current?.walkIn('you', you.x + ((you.face ?? -1) < 0 ? 130 : -130))
  }, [started])

  // Lines are said, then the scene goes on
  useEffect(() => {
    if (!started || !step || step.kind !== 'line') return
    const cast = scene.cast[step.by]
    setLog((l) => [
      ...l,
      {
        n: l.length,
        who: step.by,
        zh: step.zh,
        en: step.en,
        voice: cast.voice,
      },
    ])
    setNote(null)
    let gone = false
    let finished = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const begun = Date.now()
    // a line followed by another stays long enough to read
    const followed = scene.steps[at + 1]?.kind === 'line'
    const finish = (now = false) => {
      if (gone || finished) return
      finished = true
      setTalking(null)
      const wait = now
        ? 150
        : Math.max(
            350,
            followed
              ? readMs(step.zh, settings.home) - (Date.now() - begun)
              : 0,
          )
      timer = setTimeout(() => !gone && setAt((a) => a + 1), wait)
    }
    skip.current = () => {
      stop()
      finish(true)
    }
    // the first line waits for the player to walk in
    const delay = at === 0 && log.length === 0 ? 900 : 120
    const lead = setTimeout(() => {
      if (gone) return
      setTalking(step.by)
      if (settings.autoplay)
        void say(plain(step.zh, vars), cast.voice).then(() => finish())
      else timer = setTimeout(() => finish(), talkMs(step.zh, settings.home))
    }, delay)
    return () => {
      gone = true
      clearTimeout(lead)
      clearTimeout(timer)
      skip.current = null
    }
  }, [started, at])

  // Options in a fixed shuffle per step
  const options = useMemo(() => {
    if (!step || step.kind !== 'choice') return []
    return shuffle(step.options.map((o, i) => ({ o, i })))
  }, [at, scene.id])

  const shownIds = (zh: string) =>
    tokens(zh, vars)
      .filter((t) => !t.punct && tokenLevel(t, levelOf) > 0)
      .flatMap((t) => (t.id ? [t.id] : (t.parts ?? [])))

  const choose = (choice: Choice, o: Option, i: number) => {
    if (wrong.has(i) || answered !== null) return
    if (o.right) {
      const first = wrong.size === 0
      if (first) {
        for (const id of shownIds(o.zh)) record(id, true, 0.5, 'read')
        points(2)
        stage.current?.mark(lastNpc, 'good', 1.4)
      }
      blip('right')
      setNote(o.note ? { text: o.note, good: true } : null)
      setLog((l) => [
        ...l,
        { n: l.length, who: 'you', zh: o.zh, en: o.en, voice: PLAYER_VOICE },
      ])
      setAnswered(i)
      setTalking('you')
      const after = () => {
        setTalking(null)
        setTimeout(() => {
          setAnswered(null)
          setWrong(new Set())
          setAt((a) => a + 1)
        }, 300)
      }
      if (settings.autoplay)
        void say(plain(o.zh, vars), PLAYER_VOICE).then(after)
      else setTimeout(after, talkMs(o.zh, settings.home))
    } else {
      blip('wrong')
      setMistakes((m) => m + 1)
      setWrong((w) => new Set(w).add(i))
      setShake(i)
      setTimeout(() => setShake(null), 400)
      setNote({ text: o.note ?? 'Not quite.', good: false })
      stage.current?.mark(lastNpc, 'what', 1.8)
      const right = new Set(
        choice.options.filter((x) => x.right).flatMap((x) => shownIds(x.zh)),
      )
      for (const id of shownIds(o.zh))
        if (!right.has(id)) record(id, false, 0.4, 'read')
    }
  }

  // Keys: 1 to 4 pick a reply, Enter skips a line
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && /input|textarea|select/i.test(target.tagName)) return
      if (step?.kind === 'choice') {
        const k = Number(e.key)
        if (k >= 1 && k <= options.length) {
          e.preventDefault()
          const { o, i } = options[k - 1]
          choose(step, o, i)
        }
      } else if (e.key === 'Enter' && skip.current) {
        e.preventDefault()
        skip.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
  useEffect(() => {
    if (done) {
      setScene(scene.id, stars)
      blip('win')
    }
  }, [done])

  const nextScene = SCENES[SCENES.findIndex((s) => s.id === scene.id) + 1] as
    Scene | undefined
  const current = done ? undefined : log.at(-1)

  const toggles = (
    <div className="flex gap-1">
      <button
        type="button"
        title="Listening mode: hide what they say until you tap it"
        aria-pressed={listen}
        onClick={() => setListen((l) => !l)}
        className={`rounded-full p-2 ${listen ? 'bg-[var(--jade)] text-white' : 'text-[var(--ink-2)] hover:bg-[var(--paper-2)]'}`}
      >
        <Headphones size={20} />
      </button>
      <button
        type="button"
        title="Show the English"
        aria-pressed={showEn}
        onClick={() => setShowEn((s) => !s)}
        className={`rounded-full p-2 ${showEn ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-2)] hover:bg-[var(--paper-2)]'}`}
      >
        {showEn ? <Eye size={20} /> : <EyeOff size={20} />}
      </button>
      <button
        type="button"
        title="Back to the map"
        onClick={onExit}
        className="rounded-full p-2 text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
      >
        <MapIcon size={20} />
      </button>
    </div>
  )

  return (
    <Frame title={scene.title} right={toggles}>
      <div className="trip-screen overflow-visible rounded-xl">
        <StageView
          id={scene.id}
          actors={actors}
          talking={talking}
          ended={done}
          stageRef={stage}
          label={scene.intro}
          className="rounded-t-xl"
          onClick={() => {
            if (talking && talking !== 'you') skip.current?.()
          }}
        >
          {(view) => (
            <>
              {!started && (
                <TitleCard
                  city={city}
                  title={scene.title}
                  narrow={view.narrow}
                />
              )}
              {current && (
                <SpeechOver
                  key={current.n}
                  said={current}
                  view={view}
                  actors={actors}
                  cast={scene.cast}
                  fresh={freshSet}
                  listen={listen}
                  showEn={showEn}
                  homeName={homeName}
                  home={settings.home}
                />
              )}
            </>
          )}
        </StageView>
        <div className="trip-panel rounded-b-xl px-3 py-3 sm:px-4">
          {!started ? (
            <Intro
              scene={scene}
              fresh={fresh}
              onStart={() => {
                meet(fresh)
                setStarted(true)
              }}
            />
          ) : done ? (
            <Result
              stars={stars}
              mistakes={mistakes}
              words={fresh}
              next={nextScene}
              inToday={inToday}
              onExit={onExit}
              onAgain={() => onNext(scene.id)}
              onNext={onNext}
            />
          ) : step?.kind === 'choice' ? (
            <Choices
              step={step}
              options={options}
              wrong={wrong}
              shake={shake}
              answered={answered}
              fresh={freshSet}
              homeName={homeName}
              onChoose={(o, i) => choose(step, o, i)}
            />
          ) : (
            <Waiting
              who={talking ? scene.cast[talking] : undefined}
              onSkip={() => skip.current?.()}
            />
          )}
          {note && started && !done && (
            <p
              className={`zh-rise mt-2 rounded-lg px-3 py-2 text-sm ${note.good ? 'bg-[#2f7d6d]/25 text-[#a8f0d8]' : 'bg-[#c8372d]/25 text-[#ffc0b0]'}`}
            >
              {english(note.text, homeName)}
            </p>
          )}
        </div>
      </div>

      {started && log.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowLog((s) => !s)}
            className="flex items-center gap-1.5 text-sm font-bold text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            <ScrollText size={16} />
            {showLog ? 'Hide what was said' : `What was said (${log.length})`}
          </button>
          {showLog && (
            <div className="mt-2 flex flex-col gap-2">
              {log.map((s) => (
                <LogLine
                  key={s.n}
                  said={s}
                  cast={scene.cast}
                  fresh={freshSet}
                  listen={listen}
                  showEn={showEn}
                  homeName={homeName}
                  home={settings.home}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!started && GRAMMAR[scene.id] && (
        <div className="mt-5 rounded-2xl border-l-4 border-[var(--jade)] bg-[var(--jade)]/5 p-4">
          <p className="text-xs font-bold tracking-wide text-[var(--jade)] uppercase">
            <Lightbulb size={14} className="mb-0.5 inline" /> Pattern:{' '}
            {GRAMMAR[scene.id]!.title}
          </p>
          <p className="mt-1">{GRAMMAR[scene.id]!.text}</p>
          <p className="zh-sans mt-1 text-sm text-[var(--ink-2)]">
            {GRAMMAR[scene.id]!.example}
          </p>
        </div>
      )}
    </Frame>
  )
}

// The place and the scene's name, over the picture before it starts
function TitleCard({
  city,
  title,
  narrow,
}: {
  city: City | undefined
  title: string
  narrow: boolean
}) {
  return (
    <div className="trip-card pointer-events-none absolute top-3 left-3 rounded-lg bg-[#17121f]/80 px-3 py-2 text-[#f4ead8] shadow-lg">
      {city && (
        <div className="flex items-baseline gap-2">
          <span
            className={`zh text-[#ff8a6a] ${narrow ? 'text-xl' : 'text-2xl'}`}
          >
            {city.h}
          </span>
          <span className="text-xs font-bold tracking-widest uppercase opacity-80">
            {city.name}
          </span>
        </div>
      )}
      <div className={`font-black ${narrow ? 'text-sm' : ''}`}>{title}</div>
    </div>
  )
}

// What someone is saying, over their head
function SpeechOver({
  said,
  view,
  actors,
  cast,
  fresh,
  listen,
  showEn,
  homeName,
  home,
}: {
  said: Said
  view: View
  actors: Array<Actor>
  cast: Scene['cast']
  fresh: Set<string>
  listen: boolean
  showEn: boolean
  homeName: string
  home: string
}) {
  const [revealed, setRevealed] = useState(false)
  const [en, setEn] = useState(false)
  // Speech too tall for the room above a head hangs from the top instead
  const box = useRef<HTMLDivElement>(null)
  const [pin, setPin] = useState(false)
  useLayoutEffect(() => {
    const el = box.current
    if (el && !pin && el.offsetTop < 2) setPin(true)
  }, [said.n, view.narrow, showEn, en, revealed])
  const actor = actors.find((a) => a.key === said.who)
  if (!actor) return null
  const who = said.who === 'you' ? undefined : cast[said.who]
  const colour = voiceColour(who)
  const [hx, hy] = actor.talkAt ?? [
    actor.x,
    actor.window ? actor.window[1] : actor.y - 54,
  ]
  const head = view.at(hx, hy)
  // speech set beside something (a phone) keeps clear of it
  const width = actor.talkAt ? (view.narrow ? 62 : 50) : view.narrow ? 94 : 60
  const left = Math.max(width / 2 + 1, Math.min(100 - width / 2 - 1, head.left))
  const hidden = !!who && listen && !revealed
  return (
    <div
      ref={box}
      className="pointer-events-none absolute flex justify-center"
      style={{
        left: `${left}%`,
        ...(pin ? { top: '2%' } : { bottom: `${100 - head.top + 2}%` }),
        width: `${width}%`,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        className="trip-say trip-say-plate trip-say-in pointer-events-auto rounded-2xl px-3 pt-1.5 pb-1 text-center"
        style={{ color: colour }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-[11px] font-black tracking-widest uppercase opacity-90">
          {who ? who.name : 'You'}
        </div>
        {hidden ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="text-sm font-bold"
          >
            <Headphones size={14} className="mb-0.5 inline" /> Listen… tap to
            read
          </button>
        ) : (
          <Mixed
            line={said.zh}
            fresh={fresh}
            size={view.narrow ? 'sm' : 'md'}
            className="justify-center"
          />
        )}
        <div className="mt-1 flex items-center justify-center gap-1 text-[#f4ead8]">
          <button
            type="button"
            onClick={() => void say(plain(said.zh, { home }), said.voice)}
            className="rounded-full p-1 hover:bg-white/15"
            aria-label="Play again"
          >
            <Volume2 size={15} />
          </button>
          {!hidden &&
            (showEn || en ? (
              <span className="text-sm text-[#efe6d8]">
                {english(said.en, homeName)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setEn(true)}
                className="text-xs underline decoration-dotted opacity-80 hover:opacity-100"
              >
                English
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}

// Before a scene: what it is, its new words, and the way in
function Intro({
  scene,
  fresh,
  onStart,
}: {
  scene: Scene
  fresh: Array<string>
  onStart: () => void
}) {
  return (
    <div className="zh-rise">
      <p className="text-[#f4ead8] sm:text-lg">{scene.intro}</p>
      {fresh.length > 0 ? (
        <div className="mt-3">
          <h2 className="mb-2 text-xs font-bold tracking-wide text-[#c3b6e8] uppercase">
            New in Chinese in this scene – tap to hear
          </h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {fresh.map((id) => {
              const w = WORD[id]!
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => void say(w.h)}
                  className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5 text-left transition hover:bg-white/10"
                >
                  <Ruby h={w.h} p={w.p} className="text-3xl text-[#fff6e8]" />
                  <span className="text-sm text-[#c3b6e8]">{w.e}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#a99cc8]">
          No new words here – all of them are in your bank already.
        </p>
      )}
      <div className="mt-4 flex justify-center">
        <Btn onClick={onStart} className="px-8 py-3 text-lg">
          Start
        </Btn>
      </div>
    </div>
  )
}

// Whether the page is wider than a phone
function useWide() {
  const query = '(min-width: 640px)'
  const [wide, setWide] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const m = matchMedia(query)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

function Waiting({
  who,
  onSkip,
}: {
  who: CastMember | undefined
  onSkip: () => void
}) {
  return (
    <div className="flex min-h-12 items-center gap-3">
      {who && (
        <Face
          look={who.look}
          size={36}
          className="rounded-md border-2 border-[#3a2f4a] bg-[#2c2340]"
        />
      )}
      {who && (
        <span className="text-sm font-bold text-[#c3b6e8]">{who.name}</span>
      )}
      <span className="trip-dots text-2xl leading-none text-[#c3b6e8]">
        <span>·</span>
        <span>·</span>
        <span>·</span>
      </span>
      {who && (
        <button
          type="button"
          onClick={onSkip}
          className="ml-auto rounded-lg px-2 py-1 text-xs font-bold text-[#a99cc8] hover:bg-white/10 hover:text-[#ffe680]"
        >
          Skip <ChevronRight size={14} className="mb-0.5 inline" />
        </button>
      )}
    </div>
  )
}

function Choices({
  step,
  options,
  wrong,
  shake,
  answered,
  fresh,
  homeName,
  onChoose,
}: {
  step: Choice
  options: Array<{ o: Option; i: number }>
  wrong: Set<number>
  shake: number | null
  answered: number | null
  fresh: Set<string>
  homeName: string
  onChoose: (o: Option, i: number) => void
}) {
  const size = useWide() ? 'md' : 'sm'
  return (
    <div>
      {step.task && (
        <div className="mb-2 flex items-start gap-2 px-1 text-sm font-bold text-[#f2c14e]">
          <Target size={16} className="mt-0.5 shrink-0" />
          {english(step.task, homeName)}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {options.map(({ o, i }, k) => (
          <button
            key={i}
            type="button"
            disabled={wrong.has(i) || (answered !== null && answered !== i)}
            onClick={() => onChoose(o, i)}
            className={`trip-opt flex items-center gap-3 rounded-lg px-2 py-2 text-left transition disabled:opacity-35 ${shake === i ? 'zh-shake' : ''} ${answered === i ? 'text-[#ffe680]' : ''}`}
          >
            <span className="trip-num flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold">
              {k + 1}
            </span>
            <span className="pointer-events-none min-w-0">
              <Mixed line={o.zh} fresh={fresh} still size={size} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Result({
  stars,
  mistakes,
  words,
  next,
  inToday,
  onExit,
  onAgain,
  onNext,
}: {
  stars: number
  mistakes: number
  // the words this scene brought into Chinese
  words: Array<string>
  next: Scene | undefined
  // Opened from today's session: back to it, to go on from there
  inToday: boolean
  onExit: () => void
  onAgain: () => void
  onNext: (id: string) => void
}) {
  return (
    <div className="zh-pop py-2 text-center">
      <div className="text-4xl">
        <Stars n={stars} />
      </div>
      <p className="mt-2 font-bold text-[#f4ead8]">
        {stars === 3 ? 'Perfect!' : stars === 2 ? 'Well done!' : 'Made it!'}{' '}
        <span className="font-normal text-[#a99cc8]">
          {mistakes === 0
            ? 'No mistakes.'
            : `${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'}.`}
        </span>
      </p>
      {words.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end justify-center gap-2">
          <span className="w-full text-xs font-bold tracking-wide text-[#a99cc8] uppercase">
            Now in Chinese
          </span>
          {words.map((id) => {
            const w = WORD[id]
            if (!w) return null
            return (
              <button
                key={id}
                type="button"
                onClick={() => void say(w.h)}
                className="rounded-lg bg-white/5 px-2.5 py-1.5 transition hover:bg-white/10"
                title={w.e}
              >
                <Ruby h={w.h} p={w.p} className="text-2xl text-[#fff6e8]" />
                <span className="block text-[11px] text-[#c3b6e8]">{w.g}</span>
              </button>
            )
          })}
        </div>
      )}
      {!next && (
        <p className="mx-auto mt-3 max-w-sm text-sm text-[#c3b6e8]">
          <Sprinkled text="The end of the trip – {一路平安}! Every scene can be played again, and the words you met keep coming back in the other games." />
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Btn kind="ghost" onClick={onExit}>
          <MapIcon size={16} /> Map
        </Btn>
        <Btn kind="ghost" onClick={onAgain}>
          <RotateCcw size={16} /> Again
        </Btn>
        {next && (
          <Btn
            kind={inToday ? 'ghost' : undefined}
            onClick={() => onNext(next.id)}
          >
            Next: {next.title} {!inToday && <ChevronRight size={16} />}
          </Btn>
        )}
        {inToday && (
          <a href="#today">
            <Btn>
              Back to Today <ChevronRight size={16} />
            </Btn>
          </a>
        )}
      </div>
    </div>
  )
}

// A line in the record of what was said
function LogLine({
  said,
  cast,
  fresh,
  listen,
  showEn,
  homeName,
  home,
}: {
  said: Said
  cast: Scene['cast']
  fresh: Set<string>
  listen: boolean
  showEn: boolean
  homeName: string
  home: string
}) {
  const [revealed, setRevealed] = useState(false)
  const [en, setEn] = useState(false)
  const who = said.who === 'you' ? undefined : cast[said.who]
  const hidden = !!who && listen && !revealed
  return (
    <div className={`flex items-start gap-2 ${who ? '' : 'flex-row-reverse'}`}>
      <Face
        look={who ? who.look : PLAYER_LOOK}
        size={32}
        className="mt-1 rounded-md border-2 border-[var(--ink)] bg-[#cfe3e6]"
      />
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${who ? 'zh-card rounded-tl-sm' : 'rounded-tr-sm bg-[var(--red)]/10'}`}
      >
        {who && (
          <div className="mb-1 text-xs font-bold text-[var(--ink-2)]">
            {who.name}
          </div>
        )}
        {hidden ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="text-sm font-bold text-[var(--jade)]"
          >
            <Headphones size={14} className="mb-0.5 inline" /> Listen… tap to
            read
          </button>
        ) : (
          <Mixed line={said.zh} fresh={fresh} size="sm" />
        )}
        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => void say(plain(said.zh, { home }), said.voice)}
            className="rounded-full p-1 text-[var(--jade)] hover:bg-[var(--paper-2)]"
            aria-label="Play again"
          >
            <Volume2 size={15} />
          </button>
          {(showEn || en) && !hidden ? (
            <span className="text-sm text-[var(--ink-2)]">
              {english(said.en, homeName)}
            </span>
          ) : (
            !hidden && (
              <button
                type="button"
                onClick={() => setEn(true)}
                className="text-xs text-[var(--ink-2)] underline decoration-dotted"
              >
                English
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
