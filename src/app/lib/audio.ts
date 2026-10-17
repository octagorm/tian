import MANIFEST from '../data/audio.json'
import { WORD_VOICE, speechKey } from './speech'

// Playing Chinese: the sound files made with Gemini TTS where there is
// one (data/audio.json), else the browser's own Chinese voice. One thing
// plays at a time; a new one stops the last.

const FILES = MANIFEST as Record<string, string | undefined>

let current: HTMLAudioElement | null = null
let rate = 1

export const setRate = (r: number) => {
  rate = r
}

export const hasSound = (voice: string, text: string) =>
  !!FILES[speechKey(voice, text)]

export const soundUrl = (voice: string, text: string) => {
  const id = FILES[speechKey(voice, text)]
  return id ? `/audio/${id}.mp3` : null
}

let zhVoice: SpeechSynthesisVoice | null | undefined
function browserVoice() {
  if (zhVoice !== undefined) return zhVoice
  if (typeof speechSynthesis === 'undefined') return (zhVoice = null)
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null
  zhVoice =
    voices.find((v) => v.lang === 'zh-CN' && /Tingting|婷婷/.test(v.name)) ??
    voices.find((v) => v.lang === 'zh-CN') ??
    voices.find((v) => v.lang.startsWith('zh')) ??
    null
  return zhVoice
}

export function stop() {
  current?.pause()
  current = null
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

// Whoever wants to know when speech starts and ends (the music, which
// steps back while a word is said)
const listeners = new Set<(speaking: boolean) => void>()
export function onSpeech(f: (speaking: boolean) => void) {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}
let saying = 0
const tell = (on: boolean) => listeners.forEach((f) => f(on))

// Plays and resolves when done (or stopped, or failed). A voice that
// never says it is done (some browsers' speech does not) is given up on
// after a while, so a game waiting for it goes on.
export function say(text: string, voice = WORD_VOICE): Promise<void> {
  stop()
  const limit = new Promise<void>((resolve) =>
    setTimeout(resolve, (1500 + [...text].length * 450) / rate),
  )
  const n = ++saying
  tell(true)
  const done = Promise.race([play(text, voice), limit])
  void done.then(() => {
    if (n === saying) tell(false)
  })
  return done
}

function play(text: string, voice: string): Promise<void> {
  const url = soundUrl(voice, text)
  if (url) {
    const a = new Audio(url)
    a.playbackRate = rate
    current = a
    return new Promise((resolve) => {
      a.onended = () => resolve()
      a.onerror = () => resolve(speakWithBrowser(text))
      a.onpause = () => resolve()
      a.play().catch(() => resolve())
    })
  }
  return speakWithBrowser(text)
}

function speakWithBrowser(text: string): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    const v = browserVoice()
    if (v) u.voice = v
    u.rate = 0.85 * rate
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

// --- Sound effects ---
//
// Made on the spot with Web Audio, in the pentatonic scale the music uses
// (D E F♯ A B): a wood block for right, a soft low pluck for wrong, a run
// of small bells for a win, a gong for a big one. lib/music.ts keeps the
// player's choice to have them or not and tells this module.

let ctx: AudioContext | null = null
let fx: GainNode | null = null
let effects = true
let effectsVolume = 1

// The page's one audio context, made (and woken) on first use. Browsers
// only let it play after the player has touched the page.
export function audioContext(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext as typeof AudioContext | undefined
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

export function setEffects(on: boolean, volume = effectsVolume) {
  effects = on
  effectsVolume = volume
  if (fx && ctx) fx.gain.setTargetAtTime(0.55 * volume, ctx.currentTime, 0.02)
}

function out(c: AudioContext): GainNode {
  if (!fx) {
    fx = c.createGain()
    fx.gain.value = 0.55 * effectsVolume
    fx.connect(c.destination)
  }
  return fx
}

// The notes of D major pentatonic, by name, as frequencies
const midi = (m: number) => 440 * 2 ** ((m - 69) / 12)
const NOTE = {
  D3: midi(50),
  A3: midi(57),
  D4: midi(62),
  E4: midi(64),
  'F#4': midi(66),
  A4: midi(69),
  B4: midi(71),
  D5: midi(74),
  E5: midi(76),
  'F#5': midi(78),
  A5: midi(81),
  B5: midi(83),
  D6: midi(86),
  E6: midi(88),
  A6: midi(93),
}

export type Blip =
  | 'right'
  | 'wrong'
  | 'win'
  | 'tick'
  // The sounds below are for the shell and any game that wants them
  | 'gong'
  | 'stamp'
  | 'tap'
  | 'pop'
  | 'chime'

export function blip(kind: Blip) {
  if (!effects) return
  const c = audioContext()
  if (!c) return
  try {
    const t = c.currentTime + 0.01
    const o = out(c)
    switch (kind) {
      case 'right':
        woodBlock(c, o, NOTE.A5, t, 0.5)
        woodBlock(c, o, NOTE.D6, t + 0.085, 0.55)
        break
      case 'tick':
        woodBlock(c, o, NOTE.E6, t, 0.22)
        break
      case 'tap':
        woodBlock(c, o, NOTE.B5, t, 0.16)
        break
      case 'wrong':
        pluck(c, o, NOTE.A3, t, 0.42, -60)
        pluck(c, o, NOTE.D3, t + 0.13, 0.36, -90)
        break
      case 'win':
        ;[NOTE.D5, NOTE['F#5'], NOTE.A5, NOTE.D6].forEach((f, i) =>
          bell(c, o, f, t + i * 0.09, 0.26, 1.6),
        )
        break
      case 'chime':
        bell(c, o, NOTE.A5, t, 0.22, 1.4)
        bell(c, o, NOTE.E6, t + 0.12, 0.16, 1.2)
        break
      case 'gong':
        gong(c, o, t)
        ;[NOTE.D5, NOTE.A5, NOTE.D6, NOTE.A6].forEach((f, i) =>
          bell(c, o, f, t + 0.25 + i * 0.11, 0.14, 1.8),
        )
        break
      case 'stamp':
        thud(c, o, t)
        break
      case 'pop':
        pop(c, o, t)
        break
    }
  } catch {
    // no sound
  }
}

// A wood block: a short knock of noise through a ringing filter, and a
// quickly fading tone at its pitch
function woodBlock(
  c: AudioContext,
  o: AudioNode,
  f: number,
  t: number,
  level: number,
) {
  const tone = c.createOscillator()
  tone.type = 'sine'
  tone.frequency.setValueAtTime(f * 1.04, t)
  tone.frequency.exponentialRampToValueAtTime(f, t + 0.02)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(level, t + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
  tone.connect(g).connect(o)
  tone.start(t)
  tone.stop(t + 0.13)
  // The hollow overtone of wood, a little above two and a half times
  const over = c.createOscillator()
  over.type = 'sine'
  over.frequency.value = f * 2.72
  const g2 = c.createGain()
  g2.gain.setValueAtTime(0.0001, t)
  g2.gain.exponentialRampToValueAtTime(level * 0.35, t + 0.002)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
  over.connect(g2).connect(o)
  over.start(t)
  over.stop(t + 0.06)
  const knock = c.createBufferSource()
  knock.buffer = noise(c, 0.03)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = f * 1.5
  bp.Q.value = 4
  const g3 = c.createGain()
  g3.gain.setValueAtTime(level * 0.6, t)
  g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.025)
  knock.connect(bp).connect(g3).connect(o)
  knock.start(t)
}

// A plucked string (Karplus–Strong), with an optional bend in cents at
// the start, as a zither player presses the string
export function pluck(
  c: AudioContext,
  o: AudioNode,
  f: number,
  t: number,
  level: number,
  bend = 0,
  seconds = 1.6,
) {
  const src = c.createBufferSource()
  const s = stringBuffer(c, f, seconds)
  src.buffer = s.buffer
  src.playbackRate.value = s.rate
  if (bend) {
    src.detune.setValueAtTime(bend, t)
    src.detune.linearRampToValueAtTime(0, t + 0.18)
  }
  const g = c.createGain()
  g.gain.value = level
  src.connect(g).connect(o)
  src.start(t)
  return src
}

// A small bell: a few inharmonic partials, the high ones dying first
function bell(
  c: AudioContext,
  o: AudioNode,
  f: number,
  t: number,
  level: number,
  seconds: number,
) {
  const partials: Array<[number, number, number]> = [
    // ratio, level, decay (share of seconds)
    [1, 1, 1],
    [2.01, 0.28, 0.55],
    [3.01, 0.12, 0.35],
    [4.17, 0.08, 0.22],
  ]
  for (const [ratio, l, d] of partials) {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f * ratio
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(level * l, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds * d)
    osc.connect(g).connect(o)
    osc.start(t)
    osc.stop(t + seconds * d + 0.05)
  }
}

// A gong, low and soft: a cluster of partials that swells a moment after
// the stroke, with a hiss of metal
function gong(c: AudioContext, o: AudioNode, t: number) {
  const base = 98
  const partials: Array<[number, number, number]> = [
    [1, 0.5, 3.2],
    [1.52, 0.32, 2.6],
    [2.14, 0.22, 2.2],
    [2.79, 0.16, 1.8],
    [3.43, 0.1, 1.4],
    [4.6, 0.06, 1],
  ]
  for (const [ratio, l, d] of partials) {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(base * ratio * 0.985, t)
    osc.frequency.linearRampToValueAtTime(base * ratio, t + 0.4)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(l * 0.6, t + 0.02)
    g.gain.exponentialRampToValueAtTime(l * 0.42, t + 0.25)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    osc.connect(g).connect(o)
    osc.start(t)
    osc.stop(t + d + 0.05)
  }
  const hiss = c.createBufferSource()
  hiss.buffer = noise(c, 0.6)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2400
  bp.Q.value = 0.8
  const g = c.createGain()
  g.gain.setValueAtTime(0.05, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
  hiss.connect(bp).connect(g).connect(o)
  hiss.start(t)
}

// A seal pressed on paper: a soft low knock
function thud(c: AudioContext, o: AudioNode, t: number) {
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.12)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
  osc.connect(g).connect(o)
  osc.start(t)
  osc.stop(t + 0.2)
  const pat = c.createBufferSource()
  pat.buffer = noise(c, 0.05)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 900
  const g2 = c.createGain()
  g2.gain.setValueAtTime(0.25, t)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  pat.connect(lp).connect(g2).connect(o)
  pat.start(t)
}

// A far-off firework
function pop(c: AudioContext, o: AudioNode, t: number) {
  const src = c.createBufferSource()
  src.buffer = noise(c, 0.4)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(1800, t)
  lp.frequency.exponentialRampToValueAtTime(200, t + 0.3)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
  src.connect(lp).connect(g).connect(o)
  src.start(t)
}

const noises = new Map<number, AudioBuffer>()
function noise(c: AudioContext, seconds: number): AudioBuffer {
  const hit = noises.get(seconds)
  if (hit) return hit
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  noises.set(seconds, b)
  return b
}

// A plucked string, worked out once per pitch: a burst of soft noise
// circling a delay line one period long, each pass averaged with its
// neighbour, so the high partials die first, as on a silk string. It is
// made at a low sample rate, to be quick; a line a whole number of
// samples long is a little off pitch, so `rate` is the playback rate that
// puts it right.
const strings = new Map<string, { buffer: AudioBuffer; rate: number }>()
export function stringBuffer(c: AudioContext, f: number, seconds: number) {
  const key = `${Math.round(f * 10)}:${seconds}`
  const hit = strings.get(key)
  if (hit) return hit
  const sr = 22050
  const b = c.createBuffer(1, Math.ceil(sr * seconds), sr)
  const d = b.getChannelData(0)
  // Averaging two neighbours delays by half a sample more
  const n = Math.max(2, Math.floor(sr / f - 0.5))
  const line = new Float32Array(n)
  // Softened noise: a plucked string, not a struck one
  let last = 0
  for (let i = 0; i < n; i++) {
    const x = Math.random() * 2 - 1
    last = last * 0.55 + x * 0.45
    line[i] = last
  }
  // Longer for low notes, as a real string
  const decay = 0.996 + Math.min(0.0035, 0.6 / f)
  let p = 0
  for (let i = 0; i < d.length; i++) {
    const next = (p + 1) % n
    const v = line[p]
    d[i] = v
    line[p] = decay * 0.5 * (v + line[next])
    p = next
  }
  // A gentle fade at the very end, so a cut never clicks
  const tail = Math.min(d.length, Math.round(sr * 0.05))
  for (let i = 0; i < tail; i++) d[d.length - 1 - i] *= i / tail
  const made = { buffer: b, rate: f / (sr / (n + 0.5)) }
  strings.set(key, made)
  return made
}
