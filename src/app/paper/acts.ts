import type { Rig } from './puppets'

// What a puppet does: its joints' angles (degrees, clockwise; for a puppet
// facing right, -90 brings an arm forward and -170 raises it), each with a
// sway as a puppeteer's hand gives it: [angle, amplitude, hertz, phase].
// `lift` raises the whole puppet (units) and `lean` tilts it (degrees). An
// act with keys plays them in turn ([seconds, angles]) and holds the last,
// or repeats them every `loop` seconds.

export type Sway = number | readonly [number, number, number, number?]

export interface Act {
  pose?: Readonly<Record<string, Sway>>
  keys?: ReadonlyArray<readonly [number, Readonly<Record<string, number>>]>
  loop?: number
  // Legs that do not walk (riding, sitting)
  still?: boolean
}

// Sways every puppet has unless its act says otherwise: sleeves, plumes and
// tails that hang loose
export const IDLE: Readonly<Record<string, Sway>> = {
  cuffN: [8, 6, 0.45],
  cuffF: [8, 6, 0.4, 1],
  plume: [0, 4, 0.35],
  tail: [6, 8, 0.45],
  tail1: [40, 4, 0.35],
  tail2: [28, 6, 0.35, 1],
  tail3: [64, 10, 0.35, 2],
  ears: [0, 5, 0.5],
  sash: [4, 5, 0.55],
}

const HUMAN: Record<string, Act> = {
  stand: {
    pose: {
      armN: [-8, 3, 0.32],
      foreN: [-22, 4, 0.32, 1],
      armF: [-4, 3, 0.28, 2],
      foreF: [-18, 4, 0.28, 3],
      head: [0, 1.6, 0.22],
    },
  },
  bow: {
    pose: {
      torso: 24,
      head: 12,
      armN: -48,
      foreN: -96,
      armF: -42,
      foreF: -98,
    },
  },
  point: { pose: { armN: [-96, 3, 0.5], foreN: -8, head: -4 } },
  pointUp: { pose: { armN: [-158, 3, 0.5], foreN: -10, head: -14 } },
  raise: {
    pose: {
      armN: [-155, 6, 0.8],
      foreN: -16,
      armF: [-148, 6, 0.8, 1.5],
      foreF: -16,
      head: -10,
    },
  },
  cheer: {
    pose: {
      lift: [8, 8, 1.6],
      armN: [-150, 14, 1.6],
      foreN: -20,
      armF: [-144, 14, 1.6, 0.5],
      foreF: -20,
      head: -8,
    },
  },
  push: {
    pose: {
      armN: -172,
      foreN: -6,
      armF: -166,
      foreF: -8,
      legN: -14,
      legF: 14,
      torso: -3,
      head: -16,
      lift: [0, 3, 0.3],
    },
  },
  swing: {
    keys: [
      [0, { armN: -40, foreN: -20, torso: 0 }],
      [0.45, { armN: -178, foreN: -40, torso: -10 }],
      [0.62, { armN: -8, foreN: -4, torso: 20 }],
      [1.4, { armN: -30, foreN: -20, torso: 6 }],
    ],
  },
  shoot: {
    pose: { head: -4, armF: -88, foreF: -4, propF: 92 },
    loop: 1.7,
    keys: [
      [0, { armN: -92, foreN: -30 }],
      [0.6, { armN: -94, foreN: -168 }],
      [1.05, { armN: -94, foreN: -168 }],
      [1.12, { armN: -78, foreN: -8 }],
      [1.7, { armN: -92, foreN: -30 }],
    ],
  },
  aim: {
    pose: {
      armF: -88,
      foreF: -4,
      propF: 92,
      armN: -94,
      foreN: -168,
      head: -6,
    },
  },
  angry: {
    pose: {
      armN: [-125, 12, 2.6],
      foreN: -50,
      head: [-4, 3, 2.6],
      torso: -5,
      armF: 14,
      foreF: -110,
    },
  },
  fear: {
    pose: {
      torso: 18,
      head: 16,
      armN: -140,
      foreN: -125,
      armF: -130,
      foreF: -120,
      lean: [0, 1.6, 5],
    },
  },
  tired: {
    pose: {
      torso: 16,
      head: 18,
      armN: -128,
      foreN: -115,
      armF: 6,
      foreF: -10,
      lean: [0, 1.2, 0.4],
    },
  },
  write: {
    pose: {
      torso: 10,
      head: 14,
      armN: -62,
      foreN: [-72, 8, 1.8],
      armF: -40,
      foreF: -80,
    },
  },
  present: {
    pose: { armN: -122, foreN: -40, armF: -112, foreF: -48, head: -10 },
  },
  offer: { pose: { armN: -72, foreN: -30, torso: 8, head: 4 } },
  ride: {
    still: true,
    pose: {
      legN: -22,
      legF: -22,
      armN: -36,
      foreN: -62,
      armF: -30,
      foreF: -70,
      head: [0, 1.5, 0.25],
    },
  },
  sit: {
    still: true,
    pose: {
      lift: -176,
      legN: -82,
      legF: -86,
      torso: -6,
      armN: -20,
      foreN: -60,
      armF: -14,
      foreF: -66,
    },
  },
  sleep: {
    still: true,
    pose: {
      lift: -176,
      legN: -82,
      legF: -86,
      torso: [-8, 1.5, 0.22],
      head: 26,
      armN: -6,
      foreN: -40,
      armF: -4,
      foreF: -44,
    },
  },
  lie: {
    still: true,
    pose: {
      lean: -90,
      lift: -172,
      armN: -8,
      foreN: -8,
      armF: -4,
      foreF: -6,
      head: 2,
      torso: [0, 1, 0.2],
    },
  },
  fall: {
    still: true,
    keys: [
      [0, { lean: 0, lift: 0, armN: -150, armF: -140 }],
      [0.5, { lean: -96, lift: -150, armN: -60, armF: -40 }],
      [0.8, { lean: -90, lift: -172, armN: -20, armF: -10 }],
    ],
  },
  fly: {
    still: true,
    pose: {
      lean: -16,
      armN: [-112, 10, 0.6],
      foreN: -24,
      armF: [-86, 10, 0.6, 1],
      foreF: -20,
      legN: 30,
      legF: 42,
      cuffN: [44, 14, 0.9],
      cuffF: [40, 14, 0.9, 1],
      head: -6,
      lift: [0, 12, 0.5],
    },
  },
  float: {
    still: true,
    pose: {
      armN: [-120, 26, 0.45],
      foreN: -30,
      armF: [-64, 26, 0.45, 2],
      foreF: -30,
      cuffN: [50, 18, 0.45],
      cuffF: [40, 18, 0.45, 2],
      lean: [0, 3, 0.45],
      lift: [0, 10, 0.4],
      legN: 8,
      legF: 14,
    },
  },
  mend: {
    pose: {
      armN: [-152, 8, 0.8],
      foreN: -24,
      armF: -40,
      foreF: -60,
      head: -22,
    },
  },
  weep: {
    pose: {
      armN: -132,
      foreN: -128,
      head: [16, 2, 1.4],
      torso: 12,
      armF: -20,
      foreF: -40,
    },
  },
  dig: {
    loop: 1.7,
    keys: [
      [0, { armN: -165, foreN: -40, armF: -140, foreF: -40, torso: -6 }],
      [0.7, { armN: -165, foreN: -40, armF: -140, foreF: -40, torso: -6 }],
      [0.95, { armN: -25, foreN: -10, armF: -30, foreF: -10, torso: 26 }],
      [1.7, { armN: -165, foreN: -40, armF: -140, foreF: -40, torso: -6 }],
    ],
  },
  carry: {
    pose: {
      armN: -165,
      foreN: -150,
      armF: -60,
      foreF: -80,
      torso: 6,
      head: [-2, 1.5, 0.3],
    },
  },
  twirl: {
    pose: { armN: -96, foreN: -40, legN: -10, legF: 12, head: -6 },
    loop: 0.7,
    keys: [
      [0, { propN: 0 }],
      [0.7, { propN: 360 }],
    ],
  },
  boast: {
    pose: {
      torso: -8,
      head: -10,
      armN: -158,
      foreN: -20,
      armF: 18,
      foreF: -125,
      legN: -16,
      legF: 12,
    },
  },
  somersault: {
    still: true,
    keys: [
      [0, { lean: 0, lift: 0 }],
      [0.3, { lean: -120, lift: 170 }],
      [0.6, { lean: -250, lift: 230 }],
      [0.9, { lean: -360, lift: 90 }],
      [1.15, { lean: -360, lift: 0 }],
    ],
  },
  trapped: {
    still: true,
    pose: {
      lift: -160,
      torso: 10,
      head: [-14, 2, 0.3],
      armN: -100,
      foreN: -30,
      armF: -80,
      foreF: -30,
    },
  },
  look: { pose: { head: -18, armN: -8, foreN: -22, armF: -4, foreF: -18 } },
  wave: { pose: { armN: [-150, 16, 1.4], foreN: [-30, 14, 1.4, 1] } },
  eat: { pose: { armN: -128, foreN: -126, head: -4 } },
  weave: {
    pose: {
      armN: [-74, 14, 0.9],
      foreN: [-56, 10, 0.9, 1],
      armF: [-64, 14, 0.9, 3],
      foreF: -60,
      head: 8,
    },
  },
  shrug: {
    pose: {
      armN: -36,
      foreN: [-96, 6, 0.6],
      armF: -26,
      foreF: -88,
      head: [0, 4, 0.5],
    },
  },
  think: {
    pose: {
      armN: -100,
      foreN: -150,
      head: [8, 2, 0.4],
      armF: -20,
      foreF: -70,
    },
  },
  sweep: {
    keys: [
      [0, { armN: -160, foreN: -20 }],
      [1.6, { armN: -50, foreN: -10 }],
    ],
  },
  hold: { pose: { armN: -70, foreN: -40, head: 4 } },
  laugh: {
    pose: {
      torso: [-8, 4, 2.8],
      head: [-14, 4, 2.8, 0.4],
      armN: -40,
      foreN: -110,
      armF: -92,
      foreF: -10,
    },
  },
}

const BEAST: Record<string, Act> = {
  stand: { pose: { head: [4, 2, 0.3] } },
  graze: { pose: { head: [34, 3, 0.4] } },
  rear: {
    still: true,
    pose: {
      lean: -26,
      lift: 24,
      legFN: -70,
      legFF: -55,
      legBN: 10,
      legBF: 14,
      head: -20,
    },
  },
  buck: {
    still: true,
    loop: 1,
    keys: [
      [0, { lean: 0, legFN: 0, legFF: 0 }],
      [0.3, { lean: -22, legFN: -60, legFF: -50 }],
      [0.6, { lean: 8, legBN: 40, legBF: 34 }],
      [1, { lean: 0, legFN: 0, legFF: 0, legBN: 0, legBF: 0 }],
    ],
  },
  lie: {
    still: true,
    pose: { lift: -96, legFN: -84, legFF: -80, legBN: 84, legBF: 80, head: 14 },
  },
}

const FLYER: Record<string, Act> = {
  stand: { pose: { wingN: [-70, 6, 0.6], wingF: [-80, 6, 0.6, 1] } },
  fly: {
    pose: {
      wingN: [-30, 42, 3.2],
      wingF: [-40, 42, 3.2, 0.5],
      lift: [0, 10, 0.8],
    },
  },
  flutter: {
    pose: {
      wingN: [-40, 46, 2.6],
      wingF: [-50, 46, 2.6, 0.35],
      lift: [0, 16, 0.6],
      lean: [0, 8, 0.6, 1],
    },
  },
  glide: { pose: { wingN: [-20, 8, 1.2], wingF: [-30, 8, 1.2, 1] } },
}

// The body ripples from the head back, a wave along the segments
const ripple = (amp: number, hz: number, lift = 0): Act => ({
  pose: {
    head: [-4, amp * 0.3, hz],
    seg1: [-16, amp, hz, 0.8],
    seg2: [22, amp, hz, 1.6],
    seg3: [18, amp, hz, 2.4],
    seg4: [-22, amp, hz, 3.2],
    seg5: [-18, amp, hz, 4],
    seg6: [16, amp, hz, 4.8],
    tail: [20, amp * 1.2, hz, 5.6],
    legFN: [-20, 10, hz, 1],
    legFF: [10, 10, hz, 2],
    legBN: [-20, 10, hz, 3],
    legBF: [10, 10, hz, 4],
    lift: [0, lift, hz * 0.7],
  },
})

const DRAGON: Record<string, Act> = {
  stand: ripple(7, 0.35, 6),
  fly: ripple(13, 0.6, 14),
  look: {
    ...ripple(6, 0.35, 4),
    pose: { ...ripple(6, 0.35, 4).pose, head: [18, 3, 0.4], jaw: 14 },
  },
}

const HOPPER: Record<string, Act> = {
  stand: { pose: {} },
  hop: {
    loop: 0.7,
    keys: [
      [0, { lift: 0, lean: 0 }],
      [0.25, { lift: 34, lean: -10 }],
      [0.5, { lift: 0, lean: 4 }],
      [0.7, { lift: 0, lean: 0 }],
    ],
  },
}

export const ACTS: Record<Rig, Record<string, Act>> = {
  human: HUMAN,
  beast: BEAST,
  flyer: FLYER,
  hopper: HOPPER,
  dragon: DRAGON,
}

// Added while a puppet speaks: a nodding head, and a hand that talks if
// it is not busy
export const TALK: Readonly<Record<string, Sway>> = {
  head: [0, 3.5, 2.2],
  torso: [0, 1.2, 1.1],
  // a jaw, if it has one, opens and shuts
  jaw: [6, 7, 3.4],
}
export const TALK_HAND: Readonly<Record<string, Sway>> = {
  armN: [-38, 10, 0.9],
  foreN: [-52, 12, 0.9, 1],
}

// The act a puppet of a rig does, by name, or its standing act
export const actOf = (rig: Rig, name: string): Act =>
  ACTS[rig][name] ?? ACTS[rig].stand

// Every act's name, for checking the stories
export const ACT_NAMES = new Set(
  Object.values(ACTS).flatMap((acts) => Object.keys(acts)),
)
