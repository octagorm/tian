// The wooden clapper (梆子) that opens and closes a shadow play: a few dry
// knocks, made on the spot with Web Audio, quietly. A knock is a short
// falling tone with a burst of noise for the wood.

let ctx: AudioContext | null = null

function knock(at: number, pitch: number, loud: number) {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(pitch, at)
  o.frequency.exponentialRampToValueAtTime(pitch * 0.55, at + 0.07)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(loud, at + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.11)
  o.connect(g).connect(ctx.destination)
  o.start(at)
  o.stop(at + 0.12)
  // the click of wood on wood
  const len = Math.floor(ctx.sampleRate * 0.02)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const n = ctx.createBufferSource()
  const band = ctx.createBiquadFilter()
  const ng = ctx.createGain()
  n.buffer = buf
  band.type = 'bandpass'
  band.frequency.value = pitch * 2.2
  band.Q.value = 3
  ng.gain.value = loud * 0.8
  n.connect(band).connect(ng).connect(ctx.destination)
  n.start(at)
}

// Knocks that quicken, as the play begins; two slow ones as it ends
export function clap(kind: 'open' | 'close') {
  try {
    ctx ??= new AudioContext()
    const t = ctx.currentTime + 0.02
    const gaps = kind === 'open' ? [0, 0.34, 0.6, 0.78, 0.9, 0.99] : [0, 0.42]
    gaps.forEach((g, i) =>
      knock(t + g, kind === 'open' ? 1250 - i * 30 : 980, 0.09),
    )
  } catch {
    // no sound
  }
}
