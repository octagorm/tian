import { MUTED } from './audio'
import { SHOW_LINE, fromBase64, toBase64 } from './chat'
import type { Shown } from './chat'

// A conversation with Gemini Live, from the browser, on the player's own
// API key: kept in this browser (`getKey`), or on the account, from which
// each call is given a token (convex/chat.ts). The microphone goes up
// as 16 kHz PCM, the partner's voice comes back as 24 kHz PCM and is
// played as it comes, with a transcript of both sides and the partner's
// calls of show_line (lib/chat.ts). Without headphones the partner would
// hear itself, so unless `open` is set the microphone sends silence while
// the partner speaks, and a little after.

export const LIVE_MODEL = 'gemini-3.8-live'

const ENDPOINT =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService'

// The key itself, kept in this browser, or a token for one session made
// from the key kept on the account (convex/chat.ts)
export type LiveAuth = { key: string } | { token: string }

const address = (auth: LiveAuth) =>
  'key' in auth
    ? `${ENDPOINT}.BidiGenerateContent?key=${encodeURIComponent(auth.key)}`
    : `${ENDPOINT}.BidiGenerateContentConstrained?access_token=${encodeURIComponent(auth.token)}`

const KEY = 'tian:gemini:v1'

export function getKey(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function setKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY, key)
    else localStorage.removeItem(KEY)
  } catch {
    // private mode
  }
}

export interface LiveSetup {
  instructions: string
  voice: string
  // How long a pause ends the player's turn, ms
  pause: number
}

export interface LiveEvents {
  // Connected, and listening
  ready: () => void
  // Some more of what the player said, as heard
  heard: (text: string) => void
  // Some more of what the partner says
  said: (text: string) => void
  shown: (s: Shown) => void
  // The partner's turn is over, with its sound, to hear again
  turnEnd: (sound: Float32Array<ArrayBuffer> | null) => void
  // The player spoke over the partner, who stopped
  interrupted: () => void
  speaking: (on: boolean) => void
  // How loud the microphone is, 0 to 1
  level: (v: number) => void
  // The call is over: why, if not because it was ended here
  closed: (why: string | null) => void
  // The call will be cut soon (a session lasts about 15 minutes)
  ending: () => void
}

// Runs in the audio thread: the microphone, averaged down to 16 kHz, in
// pieces of a tenth of a second
const MIC = `
class Mic extends AudioWorkletProcessor {
  constructor() {
    super()
    this.step = sampleRate / 16000
    this.at = 0
    this.sum = 0
    this.n = 0
    this.out = new Int16Array(1600)
    this.k = 0
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (!ch) return true
    for (let i = 0; i < ch.length; i++) {
      this.sum += ch[i]
      this.n++
      if (++this.at >= this.step) {
        this.at -= this.step
        const v = Math.max(-1, Math.min(1, this.sum / this.n))
        this.sum = 0
        this.n = 0
        this.out[this.k++] = v * 0x7fff
        if (this.k === this.out.length) {
          this.port.postMessage(this.out.slice(0))
          this.k = 0
        }
      }
    }
    return true
  }
}
registerProcessor('tian-mic', Mic)
`

export class Live {
  private ws: WebSocket | null = null
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private out: GainNode | null = null
  private playing = new Set<AudioBufferSourceNode>()
  // When what is queued to play ends, in the audio context's time
  private until = 0
  // The sound of the partner's turn so far
  private turn: Array<Float32Array> = []
  // Something else playing that the microphone should not pick up, until
  // this time (performance.now)
  private held = 0
  private live = false
  private over = false
  // The microphone off by the player's choice
  muted = false
  // Heard while the partner speaks (with headphones)
  open = false

  constructor(
    // or a way to get one, asked for once the microphone is on
    private auth: LiveAuth | (() => Promise<LiveAuth>),
    private setup: LiveSetup,
    private on: LiveEvents,
  ) {}

  // Called from a tap, so that the page may use the microphone and play
  async start() {
    const ctx = new AudioContext()
    this.ctx = ctx
    this.out = ctx.createGain()
    this.out.gain.value = MUTED ? 0 : 1
    this.out.connect(ctx.destination)
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch {
      this.end(
        'The microphone was not allowed. Allow it for this page, and try again.',
      )
      return
    }
    // ended while the browser asked
    if (this.ended()) {
      this.stream.getTracks().forEach((t) => t.stop())
      return
    }
    const url = URL.createObjectURL(
      new Blob([MIC], { type: 'application/javascript' }),
    )
    await ctx.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)
    if (this.ended()) return
    const mic = new AudioWorkletNode(ctx, 'tian-mic')
    ctx.createMediaStreamSource(this.stream).connect(mic)
    // (some browsers run a node only on the way to the speakers)
    const sink = ctx.createGain()
    sink.gain.value = 0
    mic.connect(sink).connect(ctx.destination)
    mic.port.onmessage = (e: MessageEvent<Int16Array>) => this.hear(e.data)

    let auth: LiveAuth
    try {
      auth = typeof this.auth === 'function' ? await this.auth() : this.auth
    } catch (e) {
      this.end(e instanceof Error ? e.message : String(e))
      return
    }
    if (this.ended()) return
    const ws = new WebSocket(address(auth))
    ws.binaryType = 'arraybuffer'
    this.ws = ws
    ws.onopen = () =>
      this.send({
        setup: {
          model: `models/${LIVE_MODEL}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: this.setup.voice },
              },
            },
          },
          systemInstruction: { parts: [{ text: this.setup.instructions }] },
          tools: [{ functionDeclarations: [SHOW_LINE] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          realtimeInputConfig: {
            automaticActivityDetection: {
              silenceDurationMs: this.setup.pause,
            },
          },
        },
      })
    const text = new TextDecoder()
    ws.onmessage = (e: MessageEvent<string | ArrayBuffer>) =>
      this.message(
        JSON.parse(typeof e.data === 'string' ? e.data : text.decode(e.data)),
      )
    ws.onclose = (e) =>
      this.end(
        this.over
          ? null
          : e.reason ||
              (this.live
                ? 'The call was cut off.'
                : 'Could not reach Gemini. Check the key and the connection.'),
      )
  }

  // Something typed instead of said
  say(text: string) {
    this.send({ realtimeInput: { text } })
  }

  stop() {
    this.end(null)
  }

  // (a method, as it changes while start() waits)
  ended() {
    return this.over
  }

  private send(m: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m))
  }

  private end(why: string | null) {
    if (this.over) return
    this.over = true
    this.flush()
    this.ws?.close()
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.ctx?.close().catch(() => {})
    this.on.closed(why)
  }

  private hear(pcm: Int16Array) {
    let sum = 0
    for (const v of pcm) sum += v * v
    this.on.level(Math.min(1, Math.sqrt(sum / pcm.length) / 6000))
    if (!this.live || this.muted) return
    const quiet =
      !this.open &&
      ((this.ctx && this.ctx.currentTime < this.until + 0.4) ||
        performance.now() < this.held)
    this.send({
      realtimeInput: {
        audio: {
          data: toBase64(quiet ? new Int16Array(pcm.length) : pcm),
          mimeType: 'audio/pcm;rate=16000',
        },
      },
    })
  }

  // Something played for `seconds` that the partner should not hear
  hold(seconds: number) {
    this.held = Math.max(this.held, performance.now() + seconds * 1000 + 400)
  }

  // The microphone off, or on again
  mute(on: boolean) {
    this.muted = on
    if (on) this.send({ realtimeInput: { audioStreamEnd: true } })
  }

  private message(m: ServerMessage) {
    if (m.setupComplete) {
      this.live = true
      this.on.ready()
      // the partner begins
      this.say('[The learner has opened the chat.]')
    }
    const sc = m.serverContent
    if (sc) {
      if (sc.inputTranscription?.text) this.on.heard(sc.inputTranscription.text)
      for (const part of sc.modelTurn?.parts ?? [])
        if (part.inlineData?.data) this.play(part.inlineData.data)
      if (sc.outputTranscription?.text)
        this.on.said(sc.outputTranscription.text)
      if (sc.interrupted) {
        this.flush()
        this.on.interrupted()
      }
      if (sc.turnComplete) {
        const n = this.turn.reduce((a, b) => a + b.length, 0)
        const sound = n ? new Float32Array(n) : null
        let at = 0
        for (const b of this.turn) {
          sound?.set(b, at)
          at += b.length
        }
        this.turn = []
        this.on.turnEnd(sound)
      }
    }
    const calls = m.toolCall?.functionCalls ?? []
    for (const c of calls) if (c.name === SHOW_LINE.name) this.on.shown(c.args)
    if (calls.length)
      this.send({
        toolResponse: {
          functionResponses: calls.map((c) => ({
            id: c.id,
            name: c.name,
            response: { result: 'shown', scheduling: 'SILENT' },
          })),
        },
      })
    if (m.goAway) this.on.ending()
  }

  private play(b64: string) {
    const ctx = this.ctx
    if (!ctx || !this.out) return
    const pcm = fromBase64(b64)
    if (!pcm.length) return
    this.turn.push(pcm)
    const buf = ctx.createBuffer(1, pcm.length, 24000)
    buf.copyToChannel(pcm, 0)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(this.out)
    const at = Math.max(ctx.currentTime + 0.04, this.until)
    src.start(at)
    this.until = at + buf.duration
    if (!this.playing.size) this.on.speaking(true)
    this.playing.add(src)
    src.onended = () => {
      this.playing.delete(src)
      if (!this.playing.size) this.on.speaking(false)
    }
  }

  // Stop what is playing, as when the player speaks over it
  private flush() {
    for (const s of this.playing) {
      s.onended = null
      try {
        s.stop()
      } catch {
        // not started
      }
    }
    if (this.playing.size) this.on.speaking(false)
    this.playing.clear()
    this.until = 0
  }
}

interface ServerMessage {
  setupComplete?: object
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string } }> }
    inputTranscription?: { text?: string }
    outputTranscription?: { text?: string }
    interrupted?: boolean
    turnComplete?: boolean
  }
  toolCall?: {
    functionCalls?: Array<{ id: string; name: string; args: Shown }>
  }
  goAway?: object
}
