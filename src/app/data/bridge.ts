import type { Foe } from './encounters.ts'

// Starship: the captain's orders, in Chinese, and what each asks of the
// helm; and the voyage, planet by planet, with what the captain says on the
// way. Written word by word like the trip (lib/text.ts). What happens on
// the way between the orders is in data/encounters.ts.

export type Action =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'fire'
  | 'fast'
  | 'slow'
  | 'stop'
  | 'shield'

export interface Order {
  zh: string
  en: string
  // What the helm must do, in this order
  do: Array<Action>
  // An order not to do something (别 开火): kept by waiting until the
  // danger has passed, broken by doing this
  not?: Action
  // Given on arrival at a planet only, never on the way
  arrival?: boolean
  // Given only in a fight against this foe (data/encounters.ts), whose
  // ships it brings
  foe?: Foe
}

export const CAPTAIN_VOICE = 'Captain'

// The helm's controls: a key each, drawn as pictures (games/bridge/hud.tsx)
export const ACTIONS: Array<{
  id: Action
  key: string
  label: string
}> = [
  { id: 'left', key: 'ArrowLeft', label: '←' },
  { id: 'up', key: 'ArrowUp', label: '↑' },
  { id: 'down', key: 'ArrowDown', label: '↓' },
  { id: 'right', key: 'ArrowRight', label: '→' },
  { id: 'fire', key: ' ', label: 'space' },
  { id: 'shield', key: 's', label: 'S' },
  { id: 'fast', key: 'f', label: 'F' },
  { id: 'slow', key: 'd', label: 'D' },
  { id: 'stop', key: 'x', label: 'X' },
]

export const STEER: Array<Action> = ['left', 'right', 'up', 'down']

// One order to each planet on arrival: stop there
const ARRIVE = {
  moon: {
    zh: '月亮 到 了 ！ 停 ！',
    en: "Here's the moon! Stop!",
    do: ['stop'],
    arrival: true,
  },
  mars: {
    zh: '火星 到 了 ！ 停 ！',
    en: "Here's Mars! Stop!",
    do: ['stop'],
    arrival: true,
  },
  jupiter: {
    zh: '木星 到 了 ！ 停 ！',
    en: "Here's Jupiter! Stop!",
    do: ['stop'],
    arrival: true,
  },
  saturn: {
    zh: '土星 到 了 ！ 停 ！',
    en: "Here's Saturn! Stop!",
    do: ['stop'],
    arrival: true,
  },
  earth: {
    zh: '到 家 了 ！ 停 ！',
    en: "We're home! Stop!",
    do: ['stop'],
    arrival: true,
  },
} satisfies Record<string, Order>

// A two-step order always steers first, then does one other thing where
// it has steered to (games/bridge/threats.ts builds its danger that way)
export const ORDERS: Array<Order> = [
  { zh: '往 左 ！', en: 'Left!', do: ['left'] },
  { zh: '往 右 ！', en: 'Right!', do: ['right'] },
  { zh: '往 上 ！', en: 'Up!', do: ['up'] },
  { zh: '往 下 ！', en: 'Down!', do: ['down'] },
  { zh: '开火 ！', en: 'Fire!', do: ['fire'] },
  { zh: '加速 ！', en: 'Speed up!', do: ['fast'] },
  { zh: '慢 一点 ！', en: 'Slow down!', do: ['slow'] },
  { zh: '停 ！', en: 'Stop!', do: ['stop'] },
  { zh: '小心 ！', en: 'Look out! (Shields!)', do: ['shield'] },
  { zh: '危险 ！ 往 左 ！', en: 'Danger! Left!', do: ['left'] },
  { zh: '危险 ！ 往 上 ！', en: 'Danger! Up!', do: ['up'] },
  { zh: '外星人 ！ 开火 ！', en: 'Aliens! Fire!', do: ['fire'] },
  { zh: '快 ， 往 下 ！', en: 'Quick, down!', do: ['down'] },
  { zh: '快 ， 往 右 ！', en: 'Quick, right!', do: ['right'] },
  { zh: '往 左 ， 开火 ！', en: 'Left, and fire!', do: ['left', 'fire'] },
  { zh: '往 右 ， 加速 ！', en: 'Right, full speed!', do: ['right', 'fast'] },
  { zh: '往 上 ， 开火 ！', en: 'Up, and fire!', do: ['up', 'fire'] },
  { zh: '往 下 ， 小心 ！', en: 'Down – shields!', do: ['down', 'shield'] },
  { zh: '火箭 ！ 往 右 ！', en: 'Rockets! Right!', do: ['right'] },
  { zh: '太 快 了 ！ 慢 一点 ！', en: 'Too fast! Slow down!', do: ['slow'] },
  // At a space station on the way
  { zh: '到 了 ！ 停 ！', en: "We're there! Stop!", do: ['stop'] },
  {
    zh: '外星人 很 多 ！ 加速 ！',
    en: 'So many aliens! Full speed!',
    do: ['fast'],
  },
  { zh: '往 左 拐 ！', en: 'Turn left!', do: ['left'] },
  { zh: '往 右 拐 ！', en: 'Turn right!', do: ['right'] },
  { zh: '小行星 ！ 往 上 ！', en: 'Asteroids! Up!', do: ['up'] },
  { zh: '小行星 ！ 往 下 ！', en: 'Asteroids! Down!', do: ['down'] },
  { zh: '飞碟 ！ 开火 ！', en: 'A flying saucer! Fire!', do: ['fire'] },
  { zh: '激光 ， 开火 ！', en: 'Lasers – fire!', do: ['fire'] },
  { zh: '护盾 ！', en: 'Shields!', do: ['shield'] },
  { zh: '打开 护盾 ！', en: 'Shields up!', do: ['shield'] },
  { zh: '全速 前进=ahead ！', en: 'Full speed ahead!', do: ['fast'] },
  {
    zh: '飞碟 很 多 ！ 加速 ！',
    en: 'So many saucers! Speed up!',
    do: ['fast'],
  },
  {
    zh: '引擎 太 热 了 ！ 慢 一点 ！',
    en: 'The engine is too hot! Slow down!',
    do: ['slow'],
  },
  { zh: '危险 ！ 停 ！', en: 'Danger! Stop!', do: ['stop'] },
  { zh: '往 左 ， 小心 ！', en: 'Left – shields!', do: ['left', 'shield'] },
  { zh: '往 右 ， 开火 ！', en: 'Right, and fire!', do: ['right', 'fire'] },
  { zh: '往 下 ， 开火 ！', en: 'Down, and fire!', do: ['down', 'fire'] },
  { zh: '往 上 ， 加速 ！', en: 'Up, full speed!', do: ['up', 'fast'] },
  {
    zh: '朋友 ！ 别 开火 ！',
    en: "Friends! Don't fire!",
    do: [],
    not: 'fire',
  },
  {
    zh: '别 开火 ！ 是 朋友 ！',
    en: "Don't fire! They're friends!",
    do: [],
    not: 'fire',
  },
  // In fights (data/encounters.ts)
  { zh: '海盗 ！ 开火 ！', en: 'Pirates! Fire!', do: ['fire'], foe: 'pirate' },
  {
    zh: '他们 开火 了 ！ 护盾 ！',
    en: "They're firing! Shields!",
    do: ['shield'],
    foe: 'pirate',
  },
  { zh: '火箭 ！ 往 左 ！', en: 'Rockets! Left!', do: ['left'], foe: 'pirate' },
  {
    zh: '海盗 ！ 往 上 ， 开火 ！',
    en: 'Pirates! Up, and fire!',
    do: ['up', 'fire'],
    foe: 'pirate',
  },
  {
    zh: '龙 ！ 护盾 ！',
    en: 'The dragon! Shields!',
    do: ['shield'],
    foe: 'dragon',
  },
  {
    zh: '龙 ！ 往 下 ！',
    en: 'The dragon! Down!',
    do: ['down'],
    foe: 'dragon',
  },
  {
    zh: '龙 ！ 往 右 ！',
    en: 'The dragon! Right!',
    do: ['right'],
    foe: 'dragon',
  },
  ...Object.values(ARRIVE),
]

const byZh = (zh: string) => {
  const o = ORDERS.find((x) => x.zh === zh)
  if (!o) throw new Error(`No such order: ${zh}`)
  return o
}

// The orders of a fight against each foe, of a chase and of an asteroid
// field (data/encounters.ts: fight, run, rocks)
export const POOLS: Record<Foe | 'run' | 'rocks', Array<Order>> = {
  pirate: [
    ...ORDERS.filter((o) => o.foe === 'pirate'),
    byZh('火箭 ！ 往 右 ！'),
    byZh('往 右 ， 开火 ！'),
  ],
  robot: [
    byZh('危险 ！ 往 左 ！'),
    byZh('危险 ！ 往 上 ！'),
    byZh('危险 ！ 停 ！'),
    byZh('护盾 ！'),
  ],
  dragon: [
    ...ORDERS.filter((o) => o.foe === 'dragon'),
    byZh('小心 ！'),
    byZh('快 ， 往 下 ！'),
  ],
  run: [
    byZh('加速 ！'),
    byZh('全速 前进=ahead ！'),
    byZh('往 左 拐 ！'),
    byZh('往 右 拐 ！'),
    byZh('快 ， 往 下 ！'),
    byZh('往 右 ， 加速 ！'),
  ],
  rocks: [
    byZh('小行星 ！ 往 上 ！'),
    byZh('小行星 ！ 往 下 ！'),
    byZh('往 左 ！'),
    byZh('往 右 ！'),
    byZh('快 ， 往 右 ！'),
  ],
}

export interface Line {
  zh: string
  en: string
}

export type PlanetId = 'moon' | 'mars' | 'jupiter' | 'saturn' | 'earth'

// The voyage: from Earth's orbit to the moon, Mars, Jupiter and Saturn, and
// home again. Each leg is a few orders long and ends with stopping at the
// planet, where the captain says something about it.
export interface Leg {
  id: PlanetId
  // The planet, a word id
  name: string
  // The captain's line as the ship sets off for it
  zh: string
  en: string
  arrive: Order
  about: Line
  // Its pixel sprite (pixel/sprites.ts), where there is one
  sprite?: string
}

export const VOYAGE: Array<Leg> = [
  {
    id: 'moon',
    name: '月亮',
    zh: '我们 去 月亮 。',
    en: "We're going to the moon.",
    arrive: ARRIVE.moon,
    about: {
      zh: '月亮 上=on 有 嫦娥 和 兔子 。',
      en: 'Chang’e and a rabbit live on the moon.',
    },
    sprite: 'planet-moon',
  },
  {
    id: 'mars',
    name: '火星',
    zh: '我们 去 火星 。',
    en: "We're going to Mars.",
    arrive: ARRIVE.mars,
    about: { zh: '火星 是 红色 的 星球 。', en: 'Mars is a red planet.' },
    sprite: 'planet-mars',
  },
  {
    id: 'jupiter',
    name: '木星',
    zh: '我们 去 木星 。',
    en: "We're going to Jupiter.",
    arrive: ARRIVE.jupiter,
    about: { zh: '木星 非常 大 。', en: 'Jupiter is enormous.' },
  },
  {
    id: 'saturn',
    name: '土星',
    zh: '我们 去 土星 。',
    en: "We're going to Saturn.",
    arrive: ARRIVE.saturn,
    about: {
      zh: '土星 是 很 漂亮 的 星球 。',
      en: 'Saturn is a beautiful planet.',
    },
  },
  {
    id: 'earth',
    name: '地球',
    zh: '我们 回 地球 。',
    en: "We're going back to Earth.",
    arrive: ARRIVE.earth,
    about: { zh: '地球 是 我们 的 家 。', en: 'Earth is our home.' },
    sprite: 'planet-earth',
  },
]

// The legs that have a pixel sprite, as the missions were before the
// voyage had more planets than sprites
export const MISSIONS = VOYAGE.filter(
  (l): l is Leg & { sprite: string } => !!l.sprite,
)

// Said as the ship goes to warp, when a planet is reached, and at the end
export const SET_OFF: Line = { zh: '出发 ！', en: 'Off we go!' }
export const WELL_DONE: Line = { zh: '太 好 了 ！', en: 'Great!' }
export const WRECKED: Line = { zh: '飞船 坏 了 ！', en: 'The ship is wrecked!' }
// Home again at the end of the voyage
export const HOME: Line = {
  zh: '我们 回来 了 ！ 谢谢 你 ， 朋友 ！',
  en: "We're back! Thank you, my friend!",
}

// Everything the captain says beyond the orders, for the speech list
// (data/extra.ts)
export const CAPTAIN_LINES: Array<Line> = [
  ...VOYAGE.flatMap((l) => [{ zh: l.zh, en: l.en }, l.about]),
  SET_OFF,
  WELL_DONE,
  WRECKED,
  HOME,
]
