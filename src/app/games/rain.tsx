import { useEffect, useRef, useState } from 'react'
import { join, matches, syllables } from '../lib/pinyin'
import { pick } from '../lib/bank'
import { blip, say } from '../lib/audio'
import { useStore } from '../lib/store'
import { Btn, Frame, Ruby } from '../ui'
import { Pix } from '../pixel/Pix'
import {
  Combo,
  CountUp,
  Key,
  burst,
  floatText,
  reducedMotion,
  useKeys,
} from './fx'
import { rainScene } from './rainScene'
import type { Glow, RainScene } from './rainScene'
import type { Word } from '../data/words'
import './rain.css'

// Pinyin rain: words come down over a canal town at night, as paper
// lanterns; type the pinyin of one to send it back up before it lands.
// Known words fall as hanzi alone; words being learnt show their meaning
// as a hint; new words show their pinyin, for typing practice. It speeds
// up as you go. Three words on the ground and it is over.
//
// The town is a canvas (rainScene.ts); the lanterns are elements moved in
// the same animation frame, so React draws only when a word comes or goes.

type Hint = 'none' | 'meaning' | 'pinyin'

interface Drop {
  key: number
  w: Word
  // percent of the scene's width and height
  x: number
  y: number
  speed: number
  hint: Hint
  sway: number
  state: 'fall' | 'zap' | 'land' | 'fade'
  t0: number
}

const LIVES = 3
// where a lantern lands, in percent of the height
const GROUND = 86
const GONE_MS = 700

export default function Rain() {
  const store = useStore()
  const { bank, settings, meet } = store
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [lanterns, setLanterns] = useState<
    Array<{ key: number; w: Word; hint: Hint }>
  >([])
  const [hud, setHud] = useState({ score: 0, lives: LIVES, streak: 0 })
  const [over, setOver] = useState({
    score: 0,
    zapped: 0,
    missed: [] as Array<Word>,
  })
  const [input, setInput] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const els = useRef(new Map<number, HTMLDivElement | null>())
  const scene = useRef<RainScene | null>(null)
  const size = useRef({ w: 1, h: 1 })
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const api = useRef(store)
  api.current = store
  const state = useRef({
    drops: [] as Array<Drop>,
    score: 0,
    lives: LIVES,
    zapped: 0,
    streak: 0,
    missed: [] as Array<Word>,
    nextSpawn: 0,
    t: 0,
    key: 0,
    pool: [] as Array<Word>,
    poolAt: 0,
  })

  const start = () => {
    const s = state.current
    const chosen = pick(bank, 40, Date.now(), (w) => !w.tags.includes('part'))
    s.pool = chosen.words
    meet(chosen.fresh.map((w) => w.id))
    s.drops = []
    s.score = 0
    s.lives = LIVES
    s.zapped = 0
    s.streak = 0
    s.missed = []
    s.t = 0
    s.nextSpawn = 0.3
    s.poolAt = 0
    setLanterns([])
    setHud({ score: 0, lives: LIVES, streak: 0 })
    setInput('')
    setPhase('play')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // One loop for the scene and the game: the town always moves; words fall
  // only while playing. It rests while the scene is off screen or the tab
  // is hidden.
  useEffect(() => {
    const c = canvas.current
    const b = box.current
    if (!c || !b) return
    const still = reducedMotion()
    const measure = () => {
      size.current = { w: b.clientWidth, h: b.clientHeight }
      scene.current?.resize(size.current.w, size.current.h)
    }
    const img = new Image()
    img.onload = () => {
      scene.current = rainScene(c, img, still)
      measure()
    }
    img.src = '/art/games/rain-town.png'
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(b)
    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(b)
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // at most about sixty frames a second, on fast screens too
      if (now - last < 15) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible || document.hidden) return
      if (phaseRef.current === 'play') step(dt, now)
      scene.current?.draw(now, place(now, still))
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      scene.current = null
    }
  }, [])

  // The game, a frame at a time: words come, fall faster as you go, land
  const step = (dt: number, now: number) => {
    const s = state.current
    const { levelOf, record, setBest, points } = api.current
    s.t += dt
    const pace = 1 + s.zapped / 12
    const falling = s.drops.filter((d) => d.state === 'fall')
    if (s.t >= s.nextSpawn && falling.length < 3 + Math.floor(pace)) {
      const w = s.pool[s.poolAt++ % s.pool.length]
      const lv = levelOf(w.id)
      const d: Drop = {
        key: s.key++,
        w,
        x: 12 + Math.random() * 70,
        y: -10,
        speed: (7 + Math.random() * 2) * Math.min(2.6, pace) * 0.9,
        hint:
          lv === 2
            ? 'none'
            : lv === 1 && (api.current.bank.cards[w.id]?.n ?? 0) > 0
              ? 'meaning'
              : 'pinyin',
        sway: Math.random() * 6,
        state: 'fall',
        t0: 0,
      }
      s.drops.push(d)
      setLanterns((xs) => [...xs, { key: d.key, w, hint: d.hint }])
      s.nextSpawn = s.t + Math.max(1.1, 3.4 / pace)
    }
    for (const d of falling) d.y += d.speed * dt
    const landed = falling.filter((d) => d.y >= GROUND)
    if (!landed.length) return
    for (const d of landed) {
      d.state = 'land'
      d.t0 = now
      d.y = GROUND
      s.lives--
      s.streak = 0
      s.missed.push(d.w)
      record(d.w.id, false, d.hint === 'pinyin' ? 0.2 : 0.6)
      scene.current?.splash(d.x / 100, (GROUND + 4) / 100)
      floatText(els.current.get(d.key), join(syllables(d.w.p)), {
        color: '#ff8a70',
        size: 22,
        outline: '#1a1030',
      })
      blip('wrong')
    }
    setHud({ score: s.score, lives: s.lives, streak: 0 })
    if (s.lives <= 0) {
      for (const d of s.drops)
        if (d.state === 'fall') {
          d.state = 'fade'
          d.t0 = now
        }
      setBest('rain', s.score)
      points(Math.floor(s.score / 10))
      setOver({ score: s.score, zapped: s.zapped, missed: [...s.missed] })
      setPhase('over')
    }
  }

  // Each lantern where it is: swaying as it falls, rising and flaring when
  // zapped, going dark where it lands. Returns their glows, for the scene.
  const place = (now: number, still: boolean): Array<Glow> => {
    const s = state.current
    const { w: W, h: H } = size.current
    const glows: Array<Glow> = []
    const gone: Array<number> = []
    for (const d of s.drops) {
      const el = els.current.get(d.key)
      const k = d.state === 'fall' ? 0 : Math.min(1, (now - d.t0) / GONE_MS)
      if (d.state !== 'fall' && k >= 1) gone.push(d.key)
      if (!el) continue
      const sway =
        still || d.state !== 'fall' ? 0 : Math.sin(now / 850 + d.sway)
      let y = d.y
      let scale = 1
      let opacity = 1
      let filter = ''
      if (d.state === 'zap') {
        y -= k * 22
        scale = 1 + k * 0.35
        opacity = 1 - k * k
        filter = `brightness(${1.3 + k * 0.8})`
      } else if (d.state === 'land') {
        scale = 1 - k * 0.15
        opacity = 1 - k
        filter = `grayscale(${k}) brightness(${1 - k * 0.6})`
      } else if (d.state === 'fade') opacity = 1 - k
      el.style.transform = `translate(${((d.x + sway * 1.2) / 100) * W}px, ${(y / 100) * H}px) translate(-50%, -50%) rotate(${sway * 5}deg) scale(${scale})`
      el.style.opacity = String(Math.max(0, opacity))
      el.style.filter = filter
      if (d.state !== 'land')
        glows.push({
          x: (d.x + sway * 1.2) / 100,
          y: y / 100,
          strength: (d.state === 'zap' ? 1.8 : 1) * opacity,
        })
    }
    if (gone.length) {
      s.drops = s.drops.filter((d) => !gone.includes(d.key))
      setLanterns((xs) => xs.filter((x) => !gone.includes(x.key)))
    }
    return glows
  }

  const type = (text: string) => {
    setInput(text)
    const s = state.current
    const { record } = api.current
    // lowest first, the one most in danger
    const hit = s.drops
      .filter((d) => d.state === 'fall')
      .sort((a, b) => b.y - a.y)
      .find((d) => matches(text, d.w.p, settings.tones))
    if (!hit) return
    hit.state = 'zap'
    hit.t0 = performance.now()
    const quick = Math.max(0, 10 - Math.floor(hit.y / 10))
    const gained =
      10 + quick + (hit.hint === 'none' ? 10 : hit.hint === 'meaning' ? 5 : 0)
    s.score += gained
    s.zapped++
    s.streak++
    setHud({ score: s.score, lives: s.lives, streak: s.streak })
    const el = els.current.get(hit.key)
    burst(el, {
      colors: ['#f2c14e', '#ffb36b', '#fff4d8', '#e2552e'],
      n: 18,
      spread: 85,
    })
    floatText(el, `+${gained}`, {
      color: '#f2c14e',
      size: 28,
      outline: '#1a1030',
    })
    record(
      hit.w.id,
      true,
      hit.hint === 'pinyin' ? 0.2 : hit.hint === 'meaning' ? 0.6 : 0.9,
    )
    blip('right')
    void say(hit.w.h)
    setInput('')
  }

  useKeys((key) => {
    if (phase === 'play' || key !== 'Enter') return
    start()
    return true
  }, phase !== 'play')

  return (
    <Frame
      title="Pinyin rain"
      zh="下雨"
      right={
        phase === 'play' ? (
          <span className="flex items-center gap-2">
            <Combo n={hud.streak} />
            <span className="font-black tabular-nums">{hud.score}</span>
          </span>
        ) : null
      }
    >
      <div
        ref={box}
        onPointerDown={() => {
          if (phase === 'play') setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="relative h-[70dvh] min-h-[440px] overflow-hidden rounded-3xl bg-[#0b0e26] shadow-[0_20px_50px_-20px_rgba(11,14,38,0.8)]"
      >
        <canvas
          ref={canvas}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: 'pixelated' }}
          aria-hidden="true"
        />
        {lanterns.map((l) => (
          <div
            key={l.key}
            ref={(el) => {
              els.current.set(l.key, el)
            }}
            className="rain-lantern"
            style={{ transformOrigin: '50% 0', opacity: 0 }}
          >
            <div className="flex flex-col items-center">
              {l.hint === 'pinyin' && (
                <span className="rain-pinyin">{join(syllables(l.w.p))}</span>
              )}
              <span className="rain-string" />
              <div className="rain-body">
                <span className="rain-cap rain-cap-top" />
                <span className="rain-word zh text-3xl leading-none whitespace-nowrap sm:text-4xl">
                  {l.w.h}
                </span>
                <span className="rain-cap rain-cap-bottom" />
              </div>
              <span className="rain-tassel" />
              {l.hint === 'meaning' && (
                <span className="rain-tag">{l.w.g}</span>
              )}
            </div>
          </div>
        ))}

        {phase === 'play' && (
          <>
            <div className="absolute top-3 left-4 flex gap-0.5">
              {Array.from({ length: LIVES }, (_, i) => (
                <Pix
                  key={i}
                  name="heart"
                  size={26}
                  className={`transition duration-500 ${i < hud.lives ? '' : 'scale-75 opacity-25 grayscale'}`}
                />
              ))}
            </div>
            <form
              className="absolute inset-x-4 bottom-3"
              onSubmit={(e) => {
                e.preventDefault()
                setInput('')
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => type(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-label="Pinyin"
                placeholder={
                  settings.tones
                    ? 'type pinyin with tone numbers: ni3hao3'
                    : 'type pinyin: nihao'
                }
                className="rain-input w-full rounded-xl px-4 py-3 text-center text-xl outline-none"
              />
            </form>
          </>
        )}

        {phase === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center p-5">
            <div className="rain-panel fx-pop max-w-md rounded-3xl p-6 text-center">
              <div className="zh text-5xl text-[#f2c14e]">下雨</div>
              <p className="mt-1 text-xs font-black tracking-[0.25em] text-[#f2c14e]/80 uppercase">
                xià yǔ · it is raining
              </p>
              <p className="mt-4 text-lg leading-snug">
                Words come down as lanterns. Type the pinyin of one to send it
                back up. No need for spaces or tones
                {settings.tones
                  ? ' – but tones are on in settings: type numbers, like ni3hao3.'
                  : '.'}
              </p>
              <Btn onClick={start} className="mt-5 px-8 py-3 text-lg">
                Start{' '}
                <Key
                  k="Enter"
                  className="ml-1 border-white/30 bg-white/15 text-white"
                />
              </Btn>
              {bank.best.rain ? (
                <p className="mt-3 text-sm opacity-75">
                  Best: {bank.best.rain}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-5">
            <div className="rain-panel fx-pop w-full max-w-md rounded-3xl p-6 text-center">
              <p className="text-xs font-black tracking-[0.25em] text-[#f2c14e]/80 uppercase">
                The rain stops
              </p>
              <CountUp
                to={over.score}
                className="mt-1 block text-6xl font-black text-[#f2c14e]"
              />
              <p className="opacity-80">
                {over.zapped} sent back up · best{' '}
                {Math.max(bank.best.rain ?? 0, over.score)}
              </p>
              {over.missed.length > 0 && (
                <div className="mt-4 rounded-2xl bg-[#fff6e0] p-3 text-[var(--ink)]">
                  <p className="mb-1 text-xs font-black tracking-wide uppercase">
                    Landed
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {over.missed.map((w, i) => (
                      <span
                        key={i}
                        className="fx-pop flex flex-col items-center"
                        style={{ animationDelay: `${300 + i * 120}ms` }}
                      >
                        <Ruby h={w.h} p={w.p} className="text-2xl" />
                        <span className="text-xs">{w.g}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <Btn onClick={start} className="mt-5 px-8 py-3 text-lg">
                Again{' '}
                <Key
                  k="Enter"
                  className="ml-1 border-white/30 bg-white/15 text-white"
                />
              </Btn>
            </div>
          </div>
        )}
      </div>
    </Frame>
  )
}
