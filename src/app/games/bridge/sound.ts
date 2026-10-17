// The starship's sounds, made on the spot with Web Audio: lasers, blasts,
// the shield, warp, thrusters, a hum from the engines and the chirp of the
// captain's channel. Quiet under the captain's voice; muted with M, and the
// choice is kept.

const KEY = 'tian:bridge:v1'

function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? !!(JSON.parse(raw) as { muted?: boolean }).muted : false
  } catch {
    return false
  }
}

export class Sfx {
  private ctx: AudioContext | null = null
  private out: GainNode | null = null
  private noise: AudioBuffer | null = null
  private hum: {
    osc: OscillatorNode
    osc2: OscillatorNode
    gain: GainNode
    filter: BiquadFilterNode
  } | null = null
  muted = loadMuted()

  // On a click or key: browsers let sound start only then
  start() {
    try {
      if (!this.ctx) {
        const ctx = new AudioContext()
        this.ctx = ctx
        this.out = ctx.createGain()
        this.out.gain.value = this.muted ? 0 : 0.5
        const comp = ctx.createDynamicsCompressor()
        this.out.connect(comp).connect(ctx.destination)
        const len = ctx.sampleRate
        this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
        const data = this.noise.getChannelData(0)
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      }
      void this.ctx.resume()
    } catch {
      this.ctx = null
    }
  }

  setMuted(m: boolean) {
    this.muted = m
    try {
      localStorage.setItem(KEY, JSON.stringify({ muted: m }))
    } catch {
      // private mode
    }
    if (this.out && this.ctx)
      this.out.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05)
  }

  private ready(): [AudioContext, GainNode] | null {
    if (!this.ctx || !this.out || this.muted) return null
    return [this.ctx, this.out]
  }

  private env(
    g: GainNode,
    t: number,
    peak: number,
    attack: number,
    decay: number,
  ) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    peak: number,
    delay = 0,
    pan = 0,
  ) {
    const r = this.ready()
    if (!r) return
    const [ctx, out] = r
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    this.env(g, t, peak, 0.008, dur)
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    o.connect(g).connect(p).connect(out)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private hiss(
    type: BiquadFilterType,
    f0: number,
    f1: number,
    dur: number,
    peak: number,
    delay = 0,
    q = 1,
    attack = 0.01,
  ) {
    const r = this.ready()
    if (!r || !this.noise) return
    const [ctx, out] = r
    const t = ctx.currentTime + delay
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = type
    f.Q.value = q
    f.frequency.setValueAtTime(f0, t)
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    const g = ctx.createGain()
    this.env(g, t, peak, attack, dur)
    src.connect(f).connect(g).connect(out)
    src.start(t, Math.random() * 0.5)
    src.stop(t + attack + dur + 0.05)
  }

  laser() {
    this.tone('square', 1500, 240, 0.16, 0.05, 0, -0.2)
    this.tone('sawtooth', 1180, 180, 0.18, 0.035, 0.05, 0.2)
  }

  boom(size = 1) {
    this.hiss('lowpass', 2200, 90, 0.7 * size, 0.55)
    this.tone('sine', 90, 32, 0.6 * size, 0.5)
  }

  hit() {
    this.boom(1.1)
    this.hiss('bandpass', 3000, 600, 0.25, 0.25, 0.02, 2)
    // A two-note alarm
    this.tone('square', 880, 870, 0.12, 0.05, 0.18)
    this.tone('square', 660, 650, 0.14, 0.05, 0.32)
  }

  zap() {
    for (let i = 0; i < 5; i++)
      this.tone('sawtooth', 200 + Math.random() * 900, 80, 0.07, 0.07, i * 0.04)
  }

  shield() {
    this.tone('sine', 260, 720, 0.35, 0.12)
    this.tone('triangle', 520, 1440, 0.3, 0.05, 0.03)
  }

  whoosh() {
    this.hiss('bandpass', 1600, 380, 0.3, 0.16, 0, 1.4)
  }

  dash() {
    this.hiss('highpass', 300, 3600, 0.5, 0.16, 0, 0.8, 0.05)
    this.tone('sawtooth', 70, 160, 0.5, 0.06)
  }

  brake() {
    this.hiss('lowpass', 3000, 200, 0.6, 0.18, 0, 0.9, 0.04)
  }

  warp() {
    this.tone('sine', 110, 880, 0.95, 0.12)
    this.hiss('bandpass', 200, 3000, 0.9, 0.12, 0, 2, 0.4)
    this.boom(1.4)
    this.tone('sine', 1200, 60, 0.9, 0.18, 0.9)
    this.hiss('lowpass', 4000, 300, 1.2, 0.3, 0.9)
  }

  // The captain's channel opening
  chirp() {
    this.tone('sine', 1180, 1190, 0.07, 0.05)
    this.tone('sine', 1580, 1600, 0.09, 0.05, 0.08)
  }

  win() {
    this.tone('sine', 660, 660, 0.15, 0.06)
    this.tone('sine', 880, 880, 0.15, 0.06, 0.12)
    this.tone('sine', 1320, 1320, 0.3, 0.06, 0.24)
  }

  // The engines' hum, following the speed (1 is cruising)
  engine(speed: number) {
    const r = this.ready()
    if (!r) {
      if (this.hum && this.ctx)
        this.hum.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1)
      return
    }
    const [ctx, out] = r
    if (!this.hum) {
      const osc = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.type = 'sawtooth'
      osc2.type = 'triangle'
      filter.type = 'lowpass'
      filter.frequency.value = 220
      gain.gain.value = 0
      osc.connect(filter)
      osc2.connect(filter)
      filter.connect(gain).connect(out)
      osc.start()
      osc2.start()
      this.hum = { osc, osc2, gain, filter }
    }
    const t = ctx.currentTime
    const s = Math.min(speed, 12)
    this.hum.osc.frequency.setTargetAtTime(38 + s * 9, t, 0.2)
    this.hum.osc2.frequency.setTargetAtTime(57 + s * 13, t, 0.2)
    this.hum.filter.frequency.setTargetAtTime(160 + s * 120, t, 0.2)
    this.hum.gain.gain.setTargetAtTime(0.045 + Math.min(s, 4) * 0.012, t, 0.3)
  }

  quiet() {
    if (this.hum && this.ctx)
      this.hum.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2)
  }

  dispose() {
    try {
      this.hum?.osc.stop()
      this.hum?.osc2.stop()
      void this.ctx?.close()
    } catch {
      // already closed
    }
    this.ctx = null
    this.hum = null
  }
}
