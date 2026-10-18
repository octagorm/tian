import { CAPTAIN_VOICE } from './bridge.ts'
import type { Look } from '../pixel/portraits'

// Starship's encounters: on each leg of the voyage, between the orders,
// something happens. An alien hails the ship, or the crew bring the captain
// a choice, and the player answers in Chinese. Each is a small script with
// branches, one row a line:
//
//   = start                          a part, gone to by its label; the
//                                    script starts with the first
//   who: 你好 ！ | Hello!            someone says this (the crew, or one of
//                                    the encounter's cast)
//   + 我们 是 朋友 。 | … > label    the right reply to what was asked
//   - 我们 是 饺子 。 | … > label    a wrong one; with no label, the one who
//                                    asked is puzzled and asks again
//   * 快 跑 ！ | Run! > label        a choice, neither right nor wrong
//   ! fight 3                        what happens (below)
//   ? ally > label                   on to label if a friend was made
//                                    earlier in the voyage
//   ? met pirates > label            on to label if that encounter came
//                                    earlier in the voyage
//   > label                          on to label
//   @ Fought off a pirate ship.      the captain's log, for this ending
//
// A part ends with its replies, or goes on to its label; a part with
// neither ends the encounter. What can happen:
//
//   fly n, fight n, run n, rocks n   orders, as on the way: any, the foe's,
//                                    a chase, an asteroid field
//   hull n, score n                  more or less of either (score n is
//                                    doubled for an officer when it is a gain)
//   shield                           a gift: the next order missed costs
//                                    nothing
//   ally                             a friend made, who may come back
//   music                            the crystal beings' song
//   ship cue                         what the ship on screen does (Cue)
//
// Lines are written word by word, as the trip's are (lib/text.ts).

export type Effect =
  | { kind: 'fly' | 'fight' | 'run' | 'rocks'; n: number }
  | { kind: 'hull' | 'score'; n: number }
  | { kind: 'shield' | 'ally' | 'music' }
  | { kind: 'ship'; cue: Cue }

// The ship on screen during an encounter (games/bridge/visitors.ts)
export type Visitor =
  | 'pod'
  | 'crystal'
  | 'pirate'
  | 'cube'
  | 'junk'
  | 'dragon'
  | 'wreck'
  | 'box'
  | 'jelly'
  | 'swarm'
  | 'brain'
  | 'stone'
  | 'none'

// What it does: a second ship comes (the young alien's mother, the
// friends made on the way), a present flies from it to the ship, it flies
// off, flees in pieces, opens (the robots' gate), goes out of sight, or
// stays where it is as the ship flies past it (as it does at the end
// unless told otherwise)
export const CUES = [
  'mum',
  'friends',
  'gift',
  'leave',
  'flee',
  'open',
  'gone',
  'stay',
] as const
export type Cue = (typeof CUES)[number]

export interface Said {
  kind: 'line'
  by: string
  zh: string
  en: string
}

export interface Reply {
  zh: string
  en: string
  // Right or wrong as an answer; a choice is neither
  right?: boolean
  next?: string
}

export type Step =
  | Said
  | { kind: 'do'; effect: Effect }
  | { kind: 'if'; ally?: true; met?: string; next: string }

export interface Part {
  id: string
  steps: Array<Step>
  replies: Array<Reply>
  next?: string
  log?: string
}

export interface Encounter {
  id: string
  // In English, for the log
  title: string
  visitor: Visitor
  // Who speaks besides the crew: ids of SPEAKERS
  cast: Array<string>
  // Whose ships the fights are against
  foe?: Foe
  // Where on the voyage it can happen: not before this leg (0 is the
  // moon), only on the last, only when the hull is damaged
  from?: number
  last?: boolean
  damaged?: boolean
  // Words met as it starts, so its lines show them in Chinese
  words: Array<string>
  start: string
  parts: Record<string, Part>
}

export type Foe = 'pirate' | 'robot' | 'dragon' | 'swarm'

// Who can speak: the crew on the bridge, drawn as people, and the aliens,
// drawn by kind (games/bridge/aliens.ts)
export interface Speaker {
  name: string
  // A word or two, from the word bank
  zh: string
  voice: string
  look?: Look
  alien?: string
}

export const SPEAKERS: Record<string, Speaker> = {
  Captain: {
    name: 'Captain',
    zh: '船长',
    voice: CAPTAIN_VOICE,
    look: { style: 'bun', coat: '#c8372d' },
  },
  Engineer: {
    name: 'Engineer',
    zh: '工程师',
    voice: 'Engineer',
    look: {
      style: 'curly',
      hair: '#3a2416',
      skin: '#b07a52',
      coat: '#d9a531',
      expression: 'smile',
    },
  },
  kid: {
    name: 'Young alien',
    zh: '小 外星人',
    voice: 'Alien child',
    alien: 'kid',
  },
  mum: { name: 'Its mother', zh: '妈妈', voice: 'Alien mother', alien: 'mum' },
  crystal: {
    name: 'Crystal being',
    zh: '外星人',
    voice: 'Crystal being',
    alien: 'crystal',
  },
  pirate: { name: 'Pirate', zh: '海盗', voice: 'Pirate', alien: 'pirate' },
  boss: {
    name: 'Pirate boss',
    zh: '老大',
    voice: 'Pirate boss',
    alien: 'boss',
  },
  robot: { name: 'Robot', zh: '机器人', voice: 'Robot', alien: 'robot' },
  trader: { name: 'Trader', zh: '商人', voice: 'Trader', alien: 'trader' },
  dragon: { name: 'Dragon', zh: '龙', voice: 'Dragon', alien: 'dragon' },
  pilot: {
    name: 'Pilot',
    zh: '飞行员',
    voice: 'Alien pilot',
    alien: 'pilot',
  },
  box: { name: 'The box', zh: '盒子', voice: 'Box', alien: 'box' },
  jelly: {
    name: 'Space creature',
    zh: '东西',
    voice: 'Space creature',
    alien: 'jelly',
  },
  swarm: { name: 'The swarm', zh: '我们', voice: 'Swarm', alien: 'swarm' },
  brain: { name: 'The mind', zh: '外星人', voice: 'Mind', alien: 'brain' },
  stone: { name: 'Stone face', zh: '脸', voice: 'Stone face', alien: 'stone' },
}

// Who that is, if anyone
export const speakerOf = (id: string): Speaker | undefined => SPEAKERS[id]

// The player's replies are spoken in the trip's voice for them
export const REPLY_VOICE = 'Puck'

// What someone says to a reply that makes no sense
export const PUZZLED = { zh: '啊 ？ 什么 ？', en: 'Huh? What?' }

function parse(script: string): { start: string; parts: Record<string, Part> } {
  const parts: Record<string, Part> = {}
  let part: Part | null = null
  let start = ''
  for (const raw of script.trim().split('\n')) {
    const row = raw.trim()
    if (!row) continue
    const sign = row[0]
    const body = row.slice(1).trim()
    if (sign === '=') {
      part = { id: body, steps: [], replies: [] }
      parts[body] = part
      start ||= body
      continue
    }
    if (!part) throw new Error(`A row before any part: ${row}`)
    if (sign === '@') part.log = body
    else if (sign === '>') part.next = body
    else if (sign === '?') {
      const [cond, next] = body.split('>').map((t) => t.trim())
      const [what, id] = cond.split(/\s+/)
      if (what === 'ally') part.steps.push({ kind: 'if', ally: true, next })
      else if (what === 'met' && id)
        part.steps.push({ kind: 'if', met: id, next })
      else throw new Error(`No such condition: ${cond}`)
    } else if (sign === '!') {
      const [kind, arg] = body.split(/\s+/)
      part.steps.push({ kind: 'do', effect: effect(kind, arg) })
    } else if (sign === '+' || sign === '-' || sign === '*') {
      const [said, next] = body.split('>').map((s) => s.trim())
      const [zh, en] = said.split('|').map((s) => s.trim())
      part.replies.push({
        zh,
        en,
        ...(sign === '*' ? {} : { right: sign === '+' }),
        ...(next ? { next } : {}),
      })
    } else {
      const colon = row.indexOf(':')
      const [zh, en] = row
        .slice(colon + 1)
        .split('|')
        .map((s) => s.trim())
      part.steps.push({ kind: 'line', by: row.slice(0, colon).trim(), zh, en })
    }
  }
  return { start, parts }
}

function effect(kind: string, arg: string | undefined): Effect {
  switch (kind) {
    case 'fly':
    case 'fight':
    case 'run':
    case 'rocks':
    case 'hull':
    case 'score':
      return { kind, n: Number(arg) }
    case 'shield':
    case 'ally':
    case 'music':
      return { kind }
    case 'ship':
      if (!CUES.includes(arg as Cue)) throw new Error(`No such cue: ${arg}`)
      return { kind, cue: arg as Cue }
    default:
      throw new Error(`No such effect: ${kind}`)
  }
}

const encounter = (
  e: Omit<Encounter, 'start' | 'parts'> & { script: string },
): Encounter => {
  const { script, ...rest } = e
  return { ...rest, ...parse(script) }
}

export const ENCOUNTERS: Array<Encounter> = [
  encounter({
    id: 'lost',
    title: 'The lost young alien',
    visitor: 'pod',
    cast: ['kid', 'mum'],
    words: ['妈妈', '怎么办'],
    script: `
      = start
      Engineer: 船长 ， 前面 有 一 艘 小 飞船 ！ | Captain, there's a little ship ahead!
      kid: 你好 ！ 我 妈妈 在 哪儿 ？ | Hello! Where's my mum?
      Captain: 怎么办 ？ | What shall we do?
      * 别 怕 ， 我们 帮 你 找 ！ | Don't be afraid, we'll help you look! > help
      * 对不起 ， 我们 很 忙 。 | Sorry, we're busy. > busy

      = help
      kid: 谢谢 ！ 我 家 在 前面 。 | Thank you! My home is up ahead.
      Captain: 好 ， 我们 一起 走 ！ | Right, let's go together!
      ! fly 2
      ! ship mum
      mum: 孩子 ！ 我 的 孩子 ！ | My child! My child!
      kid: 妈妈 ！ | Mum!
      mum: 我 知道 你们 会=would 来 。 | I knew you would come.
      mum: 谢谢 你们 ！ 这 是 礼物 ： 一 个 新 护盾 。 | Thank you! Here is a present: a new shield.
      ! ship gift
      ! shield
      ! ally
      ! score 50
      ! ship leave
      @ Took a lost young alien home to its mother, who gave us a new shield.

      = busy
      kid: 好 吧 … 再见 。 | Oh… all right. Goodbye.
      ! ship stay
      @ Left a lost young alien to find its own way home.
    `,
  }),

  encounter({
    id: 'crystal',
    title: 'The crystal beings',
    visitor: 'crystal',
    cast: ['crystal'],
    words: ['信号'],
    script: `
      = start
      Engineer: 船长 ， 有 信号 ！ | Captain, there's a signal!
      crystal: 你好 。 你们 是 谁 ？ | Hello. Who are you?
      + 我们 是 地球 人 。 | We're people from Earth. > music
      - 我们 去 吃饭 。 | We're going to eat.
      - 我 很 好 ， 谢谢 。 | I'm fine, thanks.

      = music
      crystal: 地球 人 ？ 欢迎 ！ 你们 喜欢 音乐 吗 ？ | People from Earth? Welcome! Do you like music?
      * 喜欢 ！ | We do! > song
      * 不 喜欢 。 | Not really. > nosong

      = song
      crystal: 太 好 了 ！ 请 听 ！ | Wonderful! Listen!
      ! music
      crystal: 谢谢 ， 朋友 ！ 一路顺风 ！ | Thank you, friends! Bon voyage!
      ! ally
      ! score 40
      ! ship leave
      @ Met beings of living crystal, and listened to their music.

      = nosong
      crystal: 好 吧 … 再见 。 | Oh… all right. Goodbye.
      ! ship leave
      @ Met beings of living crystal, but did not stay to hear their music.
    `,
  }),

  encounter({
    id: 'shortcut',
    title: 'The asteroid field',
    visitor: 'none',
    cast: [],
    words: ['近路', '绕路'],
    script: `
      = start
      Engineer: 船长 ， 前面 有 很 多 小行星 。 | Captain, there are lots of asteroids ahead.
      Captain: 我们 走 近路 还是 绕路 ？ | Do we take the short cut, or go round?
      * 走 近路 ！ | The short cut! > short
      * 绕路 吧 。 | Let's go round. > long

      = short
      Captain: 好 ！ 小心 ！ | Right! Careful now!
      ! rocks 3
      Captain: 太 好 了 ！ | Excellent!
      ! score 30
      @ Took the short cut through an asteroid field.

      = long
      Engineer: 好 。 慢 一点 ， 安全 一点 。 | Fine. A little slower, a little safer.
      @ Went the long way round an asteroid field.
    `,
  }),

  encounter({
    id: 'pirates',
    title: 'Pirates',
    visitor: 'pirate',
    cast: ['pirate'],
    foe: 'pirate',
    from: 1,
    words: ['海盗'],
    script: `
      = start
      Engineer: 船长 ！ 海盗 ！ | Captain! Pirates!
      pirate: 停 ！ 我们 是 海盗 ！ 我们 要 你们 的 钱 ！ | Stop! We're pirates! We want your money!
      Captain: 怎么办 ？ | What shall we do?
      * 我们 没有 钱 。 | We haven't got any money. > poor
      * 不 给 ！ 开火 ！ | We won't give you any! Fire! > fight
      * 快 跑 ！ | Run for it! > run

      = poor
      pirate: 没有 钱 ？ 那=then ， 你们 有 饺子 吗 ？ | No money? Then have you got any dumplings?
      * 有 ！ 请 吃 ！ | We have! Help yourselves! > dumplings
      * 没有 ！ | No! > fight

      = dumplings
      pirate: 好吃 ！ 谢谢 ！ 再见 ！ | Delicious! Thanks! Bye!
      ! score 30
      ! ship leave
      @ Gave the pirates dumplings instead of money, and they went away happy.

      = fight
      pirate: 开火 ！ | Fire!
      ! fight 3
      pirate: 对不起 ！ 对不起 ！ | Sorry! Sorry!
      ! score 40
      ! ship flee
      @ Fought off a pirate ship.

      = run
      Captain: 全速 前进=ahead ！ | Full speed ahead!
      ! run 3
      Captain: 好 ， 没有 海盗 了 ！ | Good – no more pirates!
      ! ship gone
      @ Outran a pirate ship.
    `,
  }),

  encounter({
    id: 'robot',
    title: 'The robots’ gate',
    visitor: 'cube',
    cast: ['robot'],
    foe: 'robot',
    from: 1,
    words: ['机器人', '密码'],
    script: `
      = start
      Engineer: 船长 ， 前面 有 一 个 很 大 的 机器人 ！ | Captain, there's a huge robot ahead!
      robot: 你好 ， 地球 人 。 这里 是 机器人 的 门 。 | Hello, people of Earth. This is the robots' gate.
      robot: 请 说 密码 。 | Say the password.
      Engineer: 密码 ？ 我 知道 ！ 是 三八二 。 | The password? I know it! It's three-eight-two.
      + 三八二 。 | Three-eight-two. > open
      - 三八七 。 | Three-eight-seven. > shut
      - 八三二 。 | Eight-three-two. > shut

      = open
      robot: 对 。 欢迎 ， 朋友 。 请 进 。 | Correct. Welcome, friends. Come in.
      ! score 40
      ! ship open
      @ Gave the robots' gate the right password.

      = shut
      robot: 不 对 ！ 不 对 ！ 危险 ！ | Wrong! Wrong! Danger!
      Captain: 小心 ！ | Look out!
      ! fight 2
      robot: 你们 很 厉害 。 请 进 。 | You are formidable. Come in.
      ! ship open
      @ Gave the robots' gate the wrong password, and had to get past its lasers.
    `,
  }),

  encounter({
    id: 'trader',
    title: 'The trader',
    visitor: 'junk',
    cast: ['trader'],
    from: 1,
    damaged: true,
    words: ['商人', '修'],
    script: `
      = start
      trader: 你好 ， 朋友 ！ 我 是 商人 。 | Hello, friends! I'm a trader.
      trader: 你们 的 飞船 坏 了 。 我 可以 修 ， 五十 块 。 | Your ship is damaged. I can repair it: fifty kuai.
      * 好 ， 成交 ！ | All right, it's a deal! > fifty
      * 太 贵 了 ！ | That's too expensive! > haggle
      * 不用 ， 谢谢 。 | No, thanks. > no

      = haggle
      trader: 太 贵 了 ？ 好 吧 ， 三十 块 ！ | Too expensive? All right, thirty!
      * 成交 ！ | Deal! > thirty
      * 不用 ， 谢谢 。 | No, thanks. > no

      = fifty
      ! score -50
      ! hull 40
      trader: 修 好 了 ！ 一路顺风 ！ | All fixed! Bon voyage!
      ! ship leave
      @ Paid a trader fifty to repair the hull.

      = thirty
      ! score -30
      ! hull 40
      trader: 修 好 了 ！ 一路顺风 ！ | All fixed! Bon voyage!
      ! ship leave
      @ Haggled a trader down to thirty for a repair.

      = no
      trader: 好 吧 。 再见 ， 朋友 ！ | All right. Goodbye, friends!
      ! ship leave
      @ Turned down a trader's offer of a repair.
    `,
  }),

  encounter({
    id: 'dragon',
    title: 'The dragon',
    visitor: 'dragon',
    cast: ['dragon'],
    foe: 'dragon',
    // After the moon, where the captain says who lives there
    from: 1,
    words: ['聪明', '珍珠'],
    script: `
      = start
      Engineer: 船长 … 那 是 什么 ？ | Captain… what is that?
      Captain: 是 龙 ！ | It's a dragon!
      dragon: 小 飞船 ， 你们 是 谁 ？ | Little ship, who are you?
      + 我们 是 地球 人 。 | We're people from Earth. > ask
      - 我们 是 饺子 。 | We're dumplings.
      - 我们 去 吃饭 。 | We're going to eat.

      = ask
      dragon: 好 。 我 问 你们 ： 月亮 上=on 有 谁 ？ | Good. Answer me this: who lives on the moon?
      + 嫦娥 和 兔子 。 | Chang'e and a rabbit. > pearl
      - 海盗 。 | Pirates. > fire
      - 机器人 。 | Robots. > fire

      = pearl
      dragon: 对 ！ 你们 很 聪明 。 这 是 我 的 珍珠 ， 送 你们 ！ | Right! You are clever. Here is my pearl: it's yours!
      ! ship gift
      ! hull 30
      ! score 60
      ! ship leave
      @ Answered a dragon's question, and was given its pearl.

      = fire
      dragon: 不 对 ！ | Wrong!
      Captain: 小心 ！ 火 ！ | Look out! Fire!
      ! fight 2
      dragon: 哈哈 ！ 再见 ， 小 飞船 ！ | Ha ha! Goodbye, little ship!
      ! ship leave
      @ Gave a dragon the wrong answer, and was breathed on.
    `,
  }),

  encounter({
    id: 'distress',
    title: 'The distress call',
    visitor: 'wreck',
    cast: ['pilot'],
    words: ['救命'],
    script: `
      = start
      Engineer: 船长 ， 有 信号 ！ 有 人 叫 救命 ！ | Captain, a signal! Someone's calling for help!
      pilot: 救命 ！ 我们 的 引擎 坏 了 ！ | Help! Our engine's broken!
      Captain: 去 不 去 ？ | Shall we go?
      * 去 ！ 我们 帮 他们 。 | Yes! Let's help them. > help
      * 不 去 ， 太 危险 了 。 | No, it's too dangerous. > leave

      = help
      Engineer: 我 来 修 ！ | I'll fix it!
      Engineer: 好 了 ！ 修 好 了 ！ | There! It's fixed!
      pilot: 谢谢 你们 ！ 你们 是 我们 的 朋友 ！ | Thank you! You're our friends!
      ! ally
      ! score 40
      ! ship leave
      @ Answered a distress call, and repaired an alien pilot's engine.

      = leave
      pilot: 救命 … | Help…
      ! ship stay
      @ Flew past a distress call.
    `,
  }),

  encounter({
    id: 'engine',
    title: 'The hot engine',
    visitor: 'none',
    cast: [],
    from: 1,
    words: ['工程师'],
    script: `
      = start
      Engineer: 船长 ！ 引擎 太 热 了 ！ | Captain! The engine's too hot!
      Captain: 怎么办 ？ | What shall we do?
      * 停 一下 吧 。 | Let's stop for a moment. > rest
      * 没关系 ， 全速 前进=ahead ！ | Never mind – full speed ahead! > push

      = rest
      Engineer: 好 。 我 修 一下 。 | Right. I'll fix it up a bit.
      Engineer: 好 了 ！ 引擎 不 热 了 。 | There! The engine has cooled down.
      ! hull 20
      @ Stopped to let the engine cool, and patched up the hull.

      = push
      ! run 2
      Engineer: 啊 ！ 引擎 坏 了 ！ | Oh no! The engine's broken!
      ! hull -20
      ! score 40
      @ Pushed on with an overheating engine: quicker, but it broke.
    `,
  }),

  encounter({
    id: 'box',
    title: 'The box',
    visitor: 'box',
    cast: ['box'],
    words: ['盒子'],
    script: `
      = start
      Engineer: 船长 ， 前面 有 一 个 很 大 的 盒子 ！ | Captain, there's a huge box ahead!
      box: 你好 。 你们 可以 问 我 一 个 问题 。 | Greetings. You may ask me one question.
      Captain: 问 什么 ？ | What do we ask?
      * 你 是 谁 ？ | Who are you? > who
      * 你 多大 了 ？ | How old are you? > age
      * 你 里面 有 什么 ？ | What's inside you? > inside

      = who
      box: 我 是 一 个 盒子 。 一 个 很 大 的 盒子 。 | I am a box. A very big box.
      Captain: 好 … 谢谢 。 | Right... thank you.
      ! score 20
      @ Asked a vast box floating in space who it was. It was a box.

      = age
      box: 我 一万 岁 了 。 你们 很 小 。 | I am ten thousand years old. You are very small.
      ! score 20
      @ Asked a vast box floating in space how old it was: ten thousand years.

      = inside
      box: 你们 想 看 吗 ？ | Would you like to see?
      * 想 ！ | We would! > look
      * 不 想 ， 谢谢 。 | No, thank you. > nolook

      = look
      box: 好 。 请 看 。 | Very well. Look.
      ! ship gift
      ! hull 30
      Engineer: 船长 ！ 飞船 修 好 了 ！ | Captain! The ship is repaired!
      ! score 30
      @ Looked inside a vast box floating in space. Light poured out of it, and the ship was repaired.

      = nolook
      box: 好 。 再见 ， 小 飞船 。 | Very well. Goodbye, little ship.
      @ Asked what was inside a vast box floating in space, but did not dare to look.
    `,
  }),

  encounter({
    id: 'jelly',
    title: 'The hungry creature',
    visitor: 'jelly',
    cast: ['jelly'],
    from: 1,
    words: ['东西', '能量'],
    script: `
      = start
      Engineer: 船长 ！ 前面 有 一 个 很 大 的 东西 ！ | Captain! There's something huge ahead!
      Captain: 那 是 什么 ？ | What is that?
      jelly: 我 饿 … 我 很 饿 … | Hungry... I am so hungry...
      Captain: 它 饿 了 。 怎么办 ？ | It's hungry. What shall we do?
      * 给 它 一点 能量 。 | Give it a little energy. > feed
      * 我们 快 走 吧 ！ | Let's get away, quick! > flee

      = feed
      ! hull -10
      jelly: 谢谢 … 好吃 … 你们 是 我 的 朋友 。 | Thank you... delicious... you are my friends.
      ! ally
      ! score 40
      ! ship leave
      @ Fed a hungry space creature as big as the ship some of our energy, and made a friend.

      = flee
      Captain: 全速 前进=ahead ！ | Full speed ahead!
      ! run 2
      jelly: 别 走 … | Don't go...
      ! ship stay
      @ Fled from a hungry space creature as big as the ship.
    `,
  }),

  encounter({
    id: 'swarm',
    title: 'The swarm',
    visitor: 'swarm',
    cast: ['swarm'],
    foe: 'swarm',
    from: 1,
    words: ['一起'],
    script: `
      = start
      Engineer: 船长 ， 前面 有 很 多 很 多 小 东西 ！ | Captain, there are lots and lots of little things ahead!
      swarm: 我们 很 多 。 我们 一起 想 ， 一起 说 。 | We are many. We think together, we speak together.
      swarm: 你们 也 来 。 和 我们 一起 。 | You will come too. Join us.
      Captain: 怎么办 ？ | What shall we do?
      * 不 ， 谢谢 。 | No, thank you. > no
      * 我们 可以 做 朋友 吗 ？ | Could we be friends instead? > friends
      * 好 ， 我们 来 。 | All right, we'll come. > yes

      = no
      swarm: 不 行 。 你们 来 ！ | That is not allowed. You will come!
      ! fight 2
      swarm: 好 吧 。 你们 走 。 | Very well. Go.
      ! score 40
      ! ship gone
      @ Refused to join a hive of floating shapes, and fought free of it.

      = friends
      swarm: 朋友 ？ … 好 。 我们 是 朋友 。 | Friends? ... Very well. We are friends.
      ! ally
      ! score 40
      ! ship leave
      @ Asked a hive of floating shapes to be friends instead of joining it, and it agreed.

      = yes
      swarm: 很 好 。 现在 你们 是 我们 。 | Good. Now you are us.
      Captain: 不 ！ 快 跑 ！ | No! Run for it!
      ! hull -20
      ! run 2
      @ Nearly became part of a hive of floating shapes, and ran for it.
    `,
  }),

  encounter({
    id: 'brain',
    title: 'The mind',
    visitor: 'brain',
    cast: ['brain'],
    words: ['第二'],
    script: `
      = start
      Engineer: 船长 ， 有 信号 ！ | Captain, there's a signal!
      brain: 你好 ， 地球 人 。 我 想 知道 你们 聪明 不 聪明 。 | Greetings, Earthlings. I wish to know whether you are clever.
      brain: 请 听 ： 月亮 ， 火星 ， 太阳 。 | Listen: the moon, Mars, the sun.
      brain: 第二 个 是 什么 ？ | What was the second?
      + 火星 。 | Mars. > right
      - 月亮 。 | The moon. > wrong
      - 太阳 。 | The sun. > wrong

      = right
      brain: 对 ！ 你们 很 聪明 。 这 是 礼物 。 | Correct! You are clever. Here is a present.
      ! ship gift
      ! hull 30
      ! score 50
      @ Remembered the second of three words for a being with an enormous brain, and was given a present.

      = wrong
      brain: 不 对 。 是 火星 。 地球 人 … 还 可以 。 | Wrong. It was Mars. Earthlings... not bad, I suppose.
      @ Forgot the second of three words for a being with an enormous brain.
    `,
  }),

  encounter({
    id: 'stone',
    title: 'The stone face',
    visitor: 'stone',
    cast: ['stone'],
    from: 1,
    words: ['脸', '睡觉'],
    script: `
      = start
      Engineer: 船长 ， 那个 小行星 … 有 脸 ！ | Captain, that asteroid... it has a face!
      stone: 谁 ？ 谁 在 这里 ？ 我 在 睡觉 ！ | Who? Who is there? I am asleep!
      Captain: 怎么办 ？ | What shall we do?
      * 对不起 ， 我们 马上 走 。 | Sorry, we'll leave at once. > sorry
      * 你 睡 了 多少 年 ？ | How many years have you been asleep? > years
      * 你好 ！ 我们 想 和 你 说 一下 ！ | Hello! We'd like a word with you! > loud

      = sorry
      stone: 好 。 晚安 。 | Good. Good night.
      ! score 20
      ! ship stay
      @ Apologised for waking an asteroid with a face, and let it sleep.

      = years
      stone: 一万 年 。 我 还 想 睡 。 晚安 。 | Ten thousand years. And I still want to sleep. Good night.
      ! score 30
      ! ship stay
      @ Learned that an asteroid with a face had slept for ten thousand years.

      = loud
      stone: 你们 太 吵 了 ！ | You are too noisy!
      Captain: 小心 ！ 小行星 ！ | Look out! Asteroids!
      ! rocks 3
      stone: 晚安 ！ | Good night!
      ! ship stay
      @ Woke an asteroid with a face, and it threw rocks at us.
    `,
  }),

  encounter({
    id: 'boss',
    title: 'The pirates’ boss',
    visitor: 'pirate',
    cast: ['boss'],
    foe: 'pirate',
    last: true,
    words: ['老大', '让'],
    script: `
      = start
      ? met pirates > again
      Engineer: 船长 ！ 有 很 多 海盗 ！ | Captain! There are lots of pirates!
      boss: 哈哈 ！ 我 是 海盗 的 老大 ！ 你们 别 想 回 家 ！ | Ha ha! I'm the pirates' boss! Don't even think of going home!
      > choose

      = again
      Engineer: 船长 ！ 海盗 ！ 很 多 海盗 ！ | Captain! Pirates! Lots of pirates!
      boss: 我 的 海盗 认识 你们 ！ 我 是 他们 的 老大 ！ | My pirates know you! I am their boss!
      boss: 你们 别 想 回 家 ！ | Don't even think of going home!
      > choose

      = choose
      Captain: 怎么办 ？ | What shall we do?
      * 我们 不 怕 ！ 开火 ！ | We're not afraid! Fire! > fight
      * 请 让 我们 回 家 。 | Please let us go home. > ask

      = ask
      boss: 回 家 ？ 哈哈 ！ 不 行 ！ | Go home? Ha ha! No way!
      > fight

      = fight
      ? ally > friends
      boss: 开火 ！ | Fire!
      ! fight 4
      boss: 好 ， 好 ！ 你们 走 吧 ！ | All right, all right! Off you go!
      ! score 60
      ! ship flee
      @ Fought past the pirates' boss on the way home.

      = friends
      boss: 开火 ！ | Fire!
      ! fight 2
      Engineer: 船长 ！ 我们 的 朋友 来 了 ！ | Captain! Our friends are here!
      ! ship friends
      boss: 啊 ！ 快 跑 ！ | Argh! Run for it!
      ! score 100
      ! ship flee
      @ Friends made on the way came to help against the pirates' boss.
    `,
  }),
]

// Who says what in an encounter, for the speech list (data/extra.ts): each
// line in its speaker's voice, the replies in the player's, and the puzzled
// line in the voice of everyone who can be puzzled
export function encounterSpeech(): Array<{ voice: string; zh: string }> {
  const out: Array<{ voice: string; zh: string }> = []
  for (const e of ENCOUNTERS)
    for (const part of Object.values(e.parts)) {
      for (const s of part.steps)
        if (s.kind === 'line')
          out.push({ voice: SPEAKERS[s.by].voice, zh: s.zh })
      for (const r of part.replies) out.push({ voice: REPLY_VOICE, zh: r.zh })
      if (part.replies.some((r) => r.right === false && !r.next)) {
        const asker = [...part.steps].reverse().find((s) => s.kind === 'line')
        if (asker?.kind === 'line')
          out.push({ voice: SPEAKERS[asker.by].voice, zh: PUZZLED.zh })
      }
    }
  return out
}
