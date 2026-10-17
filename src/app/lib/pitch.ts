// Pitch tracking for Tones' "say it": the YIN method on short frames of
// sound, from the mic as it comes or from a recording all at once. A
// contour is compared to another in semitones about its own mean, so a
// deep voice and a high one can say the same tone.

export interface Frame {
  // Seconds from the start
  t: number
  // Hz, or null where the sound is not voiced
  f0: number | null
  rms: number
}

const MIN_HZ = 70
const MAX_HZ = 450

// YIN (de Cheveigné & Kawahara, 2002): the lag where the signal best
// matches itself, by the cumulative mean normalized difference
export function yin(
  buf: Float32Array,
  rate: number,
  threshold = 0.15,
): number | null {
  const maxLag = Math.min(Math.floor(rate / MIN_HZ), Math.floor(buf.length / 2))
  const minLag = Math.floor(rate / MAX_HZ)
  const d = new Float32Array(maxLag + 1)
  const n = buf.length - maxLag
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0
    for (let i = 0; i < n; i++) {
      const diff = buf[i] - buf[i + lag]
      sum += diff * diff
    }
    d[lag] = sum
  }
  let running = 0
  const cmnd = new Float32Array(maxLag + 1)
  cmnd[0] = 1
  for (let lag = 1; lag <= maxLag; lag++) {
    running += d[lag]
    cmnd[lag] = running ? (d[lag] * lag) / running : 1
  }
  let lag = -1
  for (let l = minLag; l <= maxLag; l++) {
    if (cmnd[l] < threshold) {
      while (l + 1 <= maxLag && cmnd[l + 1] < cmnd[l]) l++
      lag = l
      break
    }
  }
  if (lag < 0) return null
  // parabolic interpolation around the dip
  const a = cmnd[lag - 1] ?? cmnd[lag]
  const b = cmnd[lag]
  const c = cmnd[lag + 1] ?? cmnd[lag]
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1)
  return rate / (lag + (Number.isFinite(shift) ? shift : 0))
}

export const rmsOf = (buf: Float32Array) => {
  let s = 0
  for (const x of buf) s += x * x
  return Math.sqrt(s / buf.length)
}

// The contour of a whole recording, a frame every 10 ms
export function track(
  samples: Float32Array,
  rate: number,
  // How loud a frame must be, against the loudest, and how clear its
  // period (YIN's threshold), to count as voiced. The end of a falling
  // tone is quiet and creaky, so both are lenient.
  gate = 0.05,
  clarity = 0.25,
): Array<Frame> {
  const size = 2048 * (rate / 48000) > 1024 ? 2048 : 1024
  const hop = Math.round(rate * 0.01)
  const frames: Array<Frame> = []
  let peak = 0
  for (let i = 0; i + size <= samples.length; i += hop) {
    const buf = samples.subarray(i, i + size)
    const rms = rmsOf(buf)
    peak = Math.max(peak, rms)
    frames.push({ t: i / rate, f0: null, rms })
  }
  frames.forEach((f, k) => {
    if (f.rms > peak * gate)
      f.f0 = yin(samples.subarray(k * hop, k * hop + size), rate, clarity)
  })
  return clean(frames)
}

// Octave jumps and lone points out; a short median smooth
export function clean(frames: Array<Frame>): Array<Frame> {
  const out = frames.map((f) => ({ ...f }))
  for (let i = 0; i < out.length; i++) {
    const f = out[i].f0
    if (!f) continue
    const near = out
      .slice(Math.max(0, i - 5), i + 6)
      .map((x) => x.f0)
      .filter((x): x is number => !!x)
    near.sort((a, b) => a - b)
    const med = near[Math.floor(near.length / 2)]
    if (near.length < 3) out[i].f0 = null
    else if (f > med * 1.6) out[i].f0 = f / 2
    else if (f < med / 1.6) out[i].f0 = f * 2
  }
  return out.map((f, i) => {
    if (!f.f0) return f
    const w = out
      .slice(Math.max(0, i - 2), i + 3)
      .map((x) => x.f0)
      .filter((x): x is number => !!x)
      .sort((a, b) => a - b)
    return { ...f, f0: w[Math.floor(w.length / 2)] }
  })
}

// The voiced stretch of a contour, as semitones about its mean, resampled
// to `n` points over its length; gaps (between syllables) are bridged
export function shape(frames: Array<Frame>, n = 48): Array<number> | null {
  const voiced = frames.filter((f) => f.f0)
  if (voiced.length < 6) return null
  const t0 = voiced[0].t
  const t1 = voiced.at(-1)!.t
  const st = voiced.map((f) => ({
    t: (f.t - t0) / (t1 - t0 || 1),
    v: 12 * Math.log2(f.f0! / 100),
  }))
  const mean = st.reduce((s, p) => s + p.v, 0) / st.length
  const out: Array<number> = []
  let j = 0
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1)
    while (j < st.length - 2 && st[j + 1].t < t) j++
    const a = st[j]
    const b = st[Math.min(j + 1, st.length - 1)]
    const u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0
    out.push(a.v + (b.v - a.v) * u - mean)
  }
  return out
}

// How alike two shapes are, 0–100: from the root mean square of their
// difference in semitones, after the best small shift in time
export function likeness(a: Array<number>, b: Array<number>): number {
  let best = Infinity
  for (let shift = -4; shift <= 4; shift++) {
    let s = 0
    let n = 0
    for (let i = 0; i < a.length; i++) {
      const j = i + shift
      if (j < 0 || j >= b.length) continue
      s += (a[i] - b[j]) ** 2
      n++
    }
    best = Math.min(best, Math.sqrt(s / n))
  }
  return Math.round(Math.max(0, Math.min(100, 100 - (best - 1) * 22)))
}

// The textbook shape of a run of tones, for words without a recording:
// on Chao's five-level scale (55, 35, 214, 51; neutral short and mid)
const CHAO: Record<number, Array<number>> = {
  1: [5, 5],
  2: [3, 5],
  3: [2, 1, 4],
  4: [5, 1],
  5: [3, 3],
}

export function ideal(tones: Array<number>, n = 48): Array<number> {
  const points: Array<number> = []
  tones.forEach((t, i) => {
    // 3 before 3 is said as 2; 3 before others only dips (21)
    let c = CHAO[t]
    if (t === 3 && tones[i + 1] === 3) c = CHAO[2]
    else if (t === 3 && i < tones.length - 1) c = [2, 1]
    points.push(...c)
  })
  const st = points.map((p) => p * 2.4)
  const mean = st.reduce((a, b) => a + b, 0) / st.length
  return Array.from({ length: n }, (_, k) => {
    const x = (k / (n - 1)) * (st.length - 1)
    const i = Math.min(st.length - 2, Math.floor(x))
    const u = x - i
    return st[i] + (st[i + 1] - st[i]) * u - mean
  })
}

// Sound file → samples, for the reference contour
export async function decode(
  url: string,
): Promise<{ samples: Float32Array; rate: number } | null> {
  try {
    const res = await fetch(url)
    const data = await res.arrayBuffer()
    const ctx = new OfflineAudioContext(1, 1, 24000)
    const buf = await ctx.decodeAudioData(data)
    return { samples: buf.getChannelData(0), rate: buf.sampleRate }
  } catch {
    return null
  }
}
