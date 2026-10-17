// The fight's sounds, made on the spot with Web Audio: a thump for a blow,
// a whoosh for a swing, a gong for a victory. Kept quiet, under the
// words, which matter more.

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function noiseBuffer(a: AudioContext) {
  if (noise) return noise
  noise = a.createBuffer(1, a.sampleRate, a.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noise
}

function envelope(a: AudioContext, t: number, peak: number, len: number) {
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + len)
  g.connect(a.destination)
  return g
}

function tone(
  type: OscillatorType,
  from: number,
  to: number,
  len: number,
  peak: number,
  delay = 0,
) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const o = a.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(from, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + len)
  o.connect(envelope(a, t, peak, len))
  o.start(t)
  o.stop(t + len + 0.05)
}

function hiss(
  len: number,
  peak: number,
  filter: BiquadFilterType,
  from: number,
  to: number,
  delay = 0,
) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const src = a.createBufferSource()
  src.buffer = noiseBuffer(a)
  const f = a.createBiquadFilter()
  f.type = filter
  f.Q.value = 1.2
  f.frequency.setValueAtTime(from, t)
  f.frequency.exponentialRampToValueAtTime(to, t + len)
  src.connect(f).connect(envelope(a, t, peak, len))
  src.start(t)
  src.stop(t + len + 0.05)
}

export const sfx = {
  swing: () => hiss(0.16, 0.05, 'bandpass', 500, 2600),
  hit: (big = false) => {
    tone('sine', big ? 140 : 110, 40, 0.18, big ? 0.22 : 0.16)
    hiss(0.08, big ? 0.12 : 0.08, 'lowpass', 3000, 400)
  },
  miss: () => hiss(0.22, 0.04, 'bandpass', 2400, 400),
  zap: () => {
    tone('square', 300, 1400, 0.22, 0.025)
    tone('sine', 900, 1800, 0.25, 0.04)
  },
  jump: () => tone('triangle', 260, 720, 0.16, 0.06),
  hurt: () => {
    tone('sawtooth', 220, 70, 0.22, 0.05)
    hiss(0.1, 0.06, 'lowpass', 1800, 300)
  },
  dodge: () => hiss(0.14, 0.035, 'highpass', 1200, 4000),
  heal: () =>
    [523, 659, 784, 1047].forEach((f, i) =>
      tone('sine', f, f, 0.22, 0.05, i * 0.07),
    ),
  clang: () =>
    [427, 619, 1033, 1540, 2210].forEach((f) =>
      tone('sine', f, f * 0.98, 1.1, 0.025),
    ),
  gong: () => {
    ;[98, 147, 196, 294, 415].forEach((f, i) =>
      tone('sine', f, f * 0.99, 2.2 - i * 0.25, 0.07 / (i + 1)),
    )
    hiss(0.3, 0.03, 'lowpass', 800, 200)
  },
  fall: () => tone('triangle', 400, 60, 0.7, 0.07),
  gust: () => hiss(0.6, 0.05, 'bandpass', 300, 1500),
  fire: () => hiss(0.5, 0.05, 'lowpass', 1200, 300),
  step: () => hiss(0.04, 0.02, 'lowpass', 900, 300),
  magic: () =>
    [880, 1175, 1568, 1760, 2349].forEach((f, i) =>
      tone('sine', f, f, 0.18, 0.025, i * 0.05),
    ),
}
