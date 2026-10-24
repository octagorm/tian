import { useSyncExternalStore } from 'react'
import { audioContext, onSpeech, setEffects, stringBuffer } from './audio'

// The sound settings, and music to learn by: a zither (古筝) played
// slowly and at random in the old five-note scale, with a long soft
// reverb. Nothing plays before the player turns the music on, and the
// browser only lets it start from a click or a key; once on, it is
// remembered and starts again at the first touch of the next visit. It
// steps back whenever a word is spoken.

interface Sound {
  music: boolean
  effects: boolean
  // 0–1, for music and effects alike
  volume: number
}

const KEY = 'tian:sound:v1'
const DEFAULTS: Sound = { music: false, effects: true, volume: 0.8 }

function load(): Sound {
  try {
    const raw = localStorage.getItem(KEY)
    return raw
      ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Sound>) }
      : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

let sound: Sound = typeof window === 'undefined' ? DEFAULTS : load()
const subscribers = new Set<() => void>()

function change(s: Partial<Sound>) {
  sound = { ...sound, ...s }
  try {
    localStorage.setItem(KEY, JSON.stringify(sound))
  } catch {
    // private mode, or full
  }
  setEffects(sound.effects, sound.volume)
  setLevel()
  subscribers.forEach((f) => f())
}

const subscribe = (f: () => void) => {
  subscribers.add(f)
  return () => {
    subscribers.delete(f)
  }
}
const snapshot = () => sound

export function useSound() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export const getSound = () => sound

// Call from a click or a key, so the browser lets it play
export function setMusic(on: boolean) {
  change({ music: on })
  if (on) start()
  else halt()
}
export const toggleMusic = () => setMusic(!sound.music)
export const setSoundEffects = (on: boolean) => change({ effects: on })
export const setVolume = (v: number) =>
  change({ volume: Math.max(0, Math.min(1, v)) })

// --- The player ---

// D major pentatonic over three octaves (D E F♯ A B), as MIDI notes:
// index 5 is D4
const SCALE = [50, 52, 54, 57, 59, 62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86]
const freq = (i: number) => 440 * 2 ** ((SCALE[i] - 69) / 12)
// Where phrases come to rest, in turn: the modes on D (宫), A (徵),
// B (羽) and E (商), each a scale degree in the melody's octave
const FINALS = [5, 8, 9, 6]

interface Player {
  c: AudioContext
  bus: GainNode
  voices: GainNode
  timer: ReturnType<typeof setInterval> | null
  next: number
  pos: number
  mode: number
  phrases: number
  playing: Array<AudioScheduledSourceNode>
}

let player: Player | null = null
let ducked = false
// Silent for a while, the setting kept: in the reader, which is for reading
let hushed = false

// The music silenced while a page that wants quiet is open, and back after
export function hushMusic(on: boolean) {
  hushed = on
  setLevel()
}

const BASE = 1.5

// The music's level: volume, ducked under speech, silent when off or hushed
function setLevel() {
  if (!player) return
  const { c, bus } = player
  const target =
    sound.music && !hushed ? BASE * sound.volume * (ducked ? 0.22 : 1) : 0
  bus.gain.cancelScheduledValues(c.currentTime)
  bus.gain.setTargetAtTime(target, c.currentTime, ducked ? 0.08 : 0.6)
}

function build(c: AudioContext): Player {
  const bus = c.createGain()
  bus.gain.value = 0
  bus.connect(c.destination)
  const voices = c.createGain()
  const soft = c.createBiquadFilter()
  soft.type = 'lowpass'
  soft.frequency.value = 3600
  soft.Q.value = 0.4
  voices.connect(soft)
  const dry = c.createGain()
  dry.gain.value = 0.75
  soft.connect(dry).connect(bus)
  const hall = c.createConvolver()
  hall.buffer = room(c, 3.4)
  const wet = c.createGain()
  wet.gain.value = 0.55
  soft.connect(hall).connect(wet).connect(bus)
  return {
    c,
    bus,
    voices,
    timer: null,
    next: 0,
    pos: 8,
    mode: 0,
    phrases: 0,
    playing: [],
  }
}

// A reverb's impulse: two channels of noise dying away, darkened a little
function room(c: AudioContext, seconds: number): AudioBuffer {
  const sr = c.sampleRate
  const b = c.createBuffer(2, Math.ceil(sr * seconds), sr)
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch)
    let low = 0
    for (let i = 0; i < d.length; i++) {
      const t = i / sr
      low = low * 0.6 + (Math.random() * 2 - 1) * 0.4
      d[i] = low * Math.exp(-t * 2.4) * Math.min(1, t / 0.012)
    }
  }
  return b
}

function start() {
  const c = audioContext()
  if (!c) return
  player ??= build(c)
  const p = player
  if (!p.timer) {
    p.next = Math.max(p.next, c.currentTime + 0.4)
    p.timer = setInterval(() => schedule(p), 300)
    schedule(p)
  }
  setLevel()
}

function halt() {
  const p = player
  if (!p) return
  setLevel()
  if (p.timer) clearInterval(p.timer)
  p.timer = null
  // Notes already set to play later are dropped once the fade is done
  const fading = p.playing
  p.playing = []
  setTimeout(() => {
    if (sound.music) return
    for (const s of fading)
      try {
        s.stop()
      } catch {
        // already stopped
      }
  }, 1600)
}

function schedule(p: Player) {
  const ahead = p.c.currentTime + 2.5
  while (p.next < ahead) p.next = phrase(p, p.next)
  p.playing = p.playing.slice(-64)
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const chance = (x: number) => Math.random() < x
const pickOne = <T>(xs: Array<T>) => xs[Math.floor(Math.random() * xs.length)]

// One phrase from `t`: a few notes moving mostly by step, rising then
// falling to the mode's final, sometimes with a run up the strings
// before it, a low note under it, a bent or trembling note in it.
// Returns when the next phrase may start, after a rest.
function phrase(p: Player, t: number): number {
  if (p.phrases % 5 === 4)
    p.mode = (p.mode + 1 + Math.floor(Math.random() * 3)) % 4
  p.phrases++
  const final = FINALS[p.mode]
  const beat = rnd(0.38, 0.5)
  const length = 3 + Math.floor(Math.random() * 5)
  let at = t
  if (chance(0.14)) at = glissando(p, at, p.pos)
  if (chance(0.35)) bass(p, at, final)
  for (let k = 0; k < length; k++) {
    const last = k === length - 1
    // The final in whichever octave is nearer
    if (last) p.pos = p.pos > final + 3 && final + 5 <= 14 ? final + 5 : final
    else {
      const rising = k < length / 2
      const step = pickOne(rising ? [1, 1, 2, -1, 0] : [-1, -1, -2, 1, 0])
      p.pos = Math.max(5, Math.min(14, p.pos + step))
    }
    const beats = last ? pickOne([3, 4, 4]) : pickOne([1, 1, 1, 2, 0.5])
    const dur = beats * beat
    const level = (last ? 0.38 : 0.3) * rnd(0.8, 1.1)
    if (k === 0 && chance(0.25)) note(p, at - 0.07, p.pos + 1, 0.12, 0.6)
    if (!last && chance(0.12) && p.pos > 5) bent(p, at, p.pos, level, dur)
    else
      note(p, at, p.pos, level, Math.max(2.4, dur + 1.5), last && chance(0.5))
    if (last && chance(0.2)) note(p, at + 0.02, p.pos - 5, level * 0.6, 3.5)
    if (last && chance(0.1)) harmonic(p, at + dur * 0.6, p.pos + 5)
    at += dur
  }
  return at + (chance(0.15) ? rnd(7, 11) : rnd(2, 5.5))
}

function pan(p: Player, i: number): AudioNode {
  const s = p.c.createStereoPanner()
  s.pan.value = Math.max(-0.6, Math.min(0.6, (i - 9) / 12))
  s.connect(p.voices)
  return s
}

// A plucked note; with `tremble`, the left hand rocks the string (揉弦)
function note(
  p: Player,
  t: number,
  i: number,
  level: number,
  seconds: number,
  tremble = false,
) {
  if (i < 0 || i >= SCALE.length) return
  const { c } = p
  const s = stringBuffer(c, freq(i), i < 5 ? 4 : 2.8)
  const src = c.createBufferSource()
  src.buffer = s.buffer
  src.playbackRate.value = s.rate
  const g = c.createGain()
  g.gain.setValueAtTime(level, t)
  g.gain.setTargetAtTime(0, t + seconds, 0.3)
  src.connect(g).connect(pan(p, i))
  if (tremble) {
    const lfo = c.createOscillator()
    lfo.frequency.value = rnd(4.5, 6)
    const depth = c.createGain()
    depth.gain.setValueAtTime(0, t)
    depth.gain.linearRampToValueAtTime(14, t + 0.6)
    lfo.connect(depth).connect(src.detune)
    lfo.start(t + 0.2)
    lfo.stop(t + seconds + 1)
    p.playing.push(lfo)
  }
  src.start(Math.max(t, c.currentTime))
  src.stop(t + seconds + 1.2)
  p.playing.push(src)
}

// A note pressed up from the string below (按音): plucked a step low,
// then bent up to pitch
function bent(p: Player, t: number, i: number, level: number, dur: number) {
  const { c } = p
  const from = i - 1
  const cents = (SCALE[i] - SCALE[from]) * 100
  const s = stringBuffer(c, freq(from), 2.8)
  const src = c.createBufferSource()
  src.buffer = s.buffer
  src.playbackRate.value = s.rate
  src.detune.setValueAtTime(0, t)
  src.detune.setValueAtTime(0, t + 0.1)
  src.detune.linearRampToValueAtTime(cents, t + 0.28)
  const g = c.createGain()
  g.gain.setValueAtTime(level, t)
  g.gain.setTargetAtTime(0, t + dur + 1.2, 0.3)
  src.connect(g).connect(pan(p, i))
  src.start(t)
  src.stop(t + dur + 2.6)
  p.playing.push(src)
}

// A run across the strings (刮奏), ending near where the melody begins
function glissando(p: Player, t: number, to: number): number {
  const up = chance(0.7)
  const n = Math.min(
    up ? to : SCALE.length - 1 - to,
    6 + Math.floor(Math.random() * 6),
  )
  for (let k = 0; k < n; k++) {
    const i = up ? to - n + k : to + n - k
    note(p, t + k * 0.05, i, 0.08 + 0.1 * (k / n), 2)
  }
  return t + n * 0.05 + 0.15
}

function bass(p: Player, t: number, final: number) {
  note(p, t, final - 5, 0.26, 4)
}

// A harmonic (泛音), as on the guqin: a pure, high, glassy tone
function harmonic(p: Player, t: number, i: number) {
  if (i >= SCALE.length) return
  const { c } = p
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.value = freq(i) * 2
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4)
  o.connect(g).connect(pan(p, i))
  o.start(t)
  o.stop(t + 2.5)
  p.playing.push(o)
}

// --- Wiring ---

if (typeof window !== 'undefined') {
  setEffects(sound.effects, sound.volume)
  onSpeech((on) => {
    ducked = on
    setLevel()
  })
  // Music left on last time starts at the first touch of this visit
  const wake = () => {
    window.removeEventListener('pointerdown', wake, true)
    window.removeEventListener('keydown', wake, true)
    if (sound.music) start()
  }
  if (sound.music) {
    window.addEventListener('pointerdown', wake, true)
    window.addEventListener('keydown', wake, true)
  }
  // Quiet while the page is hidden
  document.addEventListener('visibilitychange', () => {
    if (!player) return
    if (document.hidden) void player.c.suspend().catch(() => {})
    else if (sound.music) void player.c.resume().catch(() => {})
  })
}
