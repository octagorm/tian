// Journey to the West, as a game: chapters on the road west with the
// monk Tang Sanzang (your 师父) and Sun Wukong, each a demon to beat, in
// the order of the novel. The story is English with words of the bank in
// it, written {id}, shown as the player knows them, as in the trip.
//
// The pictures are in public/art/quest/: a battlefield per chapter
// (`field`, 320 × 160) and a cutout per fighter (`art`), drawn by
// quest/stage.ts.

export type Twist =
  | 'none'
  | 'disguise'
  | 'wind'
  | 'fire'
  | 'swarm'
  | 'fan'
  | 'poison'
  | 'mirror'
  | 'trap'
  | 'hungry'
  | 'numbers'
  | 'gourd'
  | 'roc'

export interface Demon {
  name: string
  zh: string
  // A 12 × 12 icon in pixel/sprites.ts, where there is one
  sprite?: string
  // The cutout in public/art/quest/
  art: string
  hp: number
  // Damage per hit
  power: number
  // What makes the fight different
  twist: Twist
  taunt: string
  // What the demon says as the fight begins: a line of Chinese written word
  // by word (as in the trip), its English, and the voice that says it
  line?: { zh: string; en: string; voice: string }
}

export interface Chapter {
  id: string
  title: string
  zh: string
  place: string
  intro: Array<string>
  demon: Demon
  win: string
  // Words the chapter teaches, if not met
  teach: Array<string>
  // What winning it brings, the first time (see REWARDS)
  reward?: Reward
}

// What each twist does, as told before and during the fight
export const TWISTS: Record<Twist, string> = {
  none: 'No tricks: a straight fight.',
  disguise: 'In disguise her words come only as sound: listen.',
  wind: 'The wind blows every hint away: no pinyin, only the characters.',
  fire: 'Fire burns down your time: answer fast.',
  swarm: 'Seven of them: each attack hits twice.',
  fan: 'The fan blows the answers about.',
  poison:
    'Every slip poisons you, and the poison hurts every turn, more for each.',
  mirror: 'The wrong answers look like the right one: they share characters.',
  trap: 'Shut in the cymbals there is room for one move: every blow is typed.',
  hungry: 'Every word is something to eat or drink. Miss, and he eats a peach.',
  numbers: 'He counts his skulls as he fights: every word is a number.',
  gourd:
    'He calls out the words. Answer wrong and you are drawn into the gourd: double damage.',
  roc: 'Each turn he fights with another demon’s power.',
}

export type Reward = 'hairs' | 'pig' | 'pill' | 'sand' | 'gourd' | 'peaches'

export const QUEST: Array<Chapter> = [
  {
    id: 'q1',
    title: 'The monkey under the mountain',
    zh: '五行山',
    place: 'Five Elements Mountain',
    intro: [
      'Five hundred years ago a stone {猴子} made war on heaven and lost. The Buddha pinned him under a {山}.',
      'Now a monk, {唐僧}, rides by on his way west to fetch the {经}. You walk with him. He is your {师父}.',
      'From under the {山} a voice calls: "{师父}! Free me, and I will guard you all the way!" It is {孙悟空}, the Monkey King.',
      'Your {师父} peels the golden seal from the peak, and the {山} splits open. But the spirit who guarded the seal will not let its prisoner go without a fight.',
    ],
    demon: {
      name: 'Mountain spirit',
      zh: '山神',
      sprite: 'stone',
      art: 'spirit',
      hp: 40,
      power: 8,
      twist: 'none',
      taunt: 'None pass the seal!',
      line: {
        zh: '不 能 走=leave ！',
        en: 'You cannot leave!',
        voice: 'Mountain spirit',
      },
    },
    win: 'The spirit sinks back into the stone. {孙悟空} bows to your {师父}, shrinks his {金箍棒} to a needle and tucks it behind his ear. "{走}!" he says. "To the West!"',
    teach: ['猴子', '山', '师父'],
    reward: 'hairs',
  },
  {
    id: 'q10',
    title: 'The pig of Gao Village',
    zh: '高老庄',
    place: 'Gao Village',
    intro: [
      'In Gao Village an old squire is in despair. His daughter married a young man called Zhu Ganglie, who works like ten and eats like a hundred – and who turned out to be a {猪}.',
      'He keeps her shut up at the back of the house and eats the family out of {家} and home.',
      '{孙悟空} {变} into the daughter and waits in her room. When the {猪} comes home, the bride turns round – and is a {猴子}.',
      'He fights for his dinner: every word in this fight is something to eat or drink. Miss one, and he eats one of your peaches.',
    ],
    demon: {
      name: 'Zhu Ganglie',
      zh: '猪刚鬣',
      art: 'pig',
      hp: 50,
      power: 9,
      twist: 'hungry',
      taunt: 'Is it dinner time yet?',
      line: { zh: '我 饿 了 ！', en: 'I am hungry!', voice: 'Zhu Ganglie' },
    },
    win: 'The {猪} throws down his rake. Once he was a marshal of heaven, sent down for being drunk and rude to the moon goddess {嫦娥}, and {观音} told him to wait here for a monk going west. "{师父}!" he says, and bows. Your {师父} names him {猪八戒}.',
    teach: ['猪', '吃'],
    reward: 'pig',
  },
  {
    id: 'q3',
    title: 'The Yellow Wind Demon',
    zh: '黄风怪',
    place: 'Yellow Wind Ridge',
    intro: [
      'A sand-coloured {风} blows down the pass, so strong it blows the stars out of the sky.',
      'The Yellow Wind Demon blows away every hint: no pinyin, no meanings. Only the {字} themselves.',
      'Even {孙悟空} has to shut his {眼睛}. You will have to read.',
    ],
    demon: {
      name: 'Yellow Wind Demon',
      zh: '黄风怪',
      sprite: 'marten',
      art: 'marten',
      hp: 60,
      power: 10,
      twist: 'wind',
      taunt: 'Can you see anything at all?',
      line: {
        zh: '风 很 大 ！',
        en: 'The wind is strong!',
        voice: 'Yellow Wind Demon',
      },
    },
    win: "Lingji {菩萨}'s staff pins the demon, and he turns out to be a yellow marten that stole lamp oil from the Buddha. The {风} drops. The {天气} is fine again, and the bodhisattva gives you a pill that stills any wind.",
    teach: ['风', '天气', '看'],
    reward: 'pill',
  },
  {
    id: 'q11',
    title: 'The ogre of the Flowing Sands',
    zh: '流沙河',
    place: 'Flowing Sands River',
    intro: [
      'The Flowing Sands River is eight hundred {里} wide. A stone on its bank says that not even a goose feather floats on it.',
      'Out of the {河} rises an ogre with a red beard and a necklace of {九} skulls: the heads of nine monks who came this way before.',
      'He counts his skulls as he fights. Every word in this fight is a number.',
    ],
    demon: {
      name: 'River ogre',
      zh: '河妖',
      art: 'sand',
      hp: 70,
      power: 10,
      twist: 'numbers',
      taunt: 'Nine skulls. Room for a tenth.',
      line: { zh: '你们 是 谁 ？', en: 'Who are you?', voice: 'River ogre' },
    },
    win: 'A messenger of {观音} calls down from a {云}: the ogre, too, has waited for a monk going west. He ties his skulls round a gourd to make a raft and carries you all across the {河}. Your {师父} names him {沙僧}.',
    teach: ['河', '九'],
    reward: 'sand',
  },
  {
    id: 'q2',
    title: 'The White Bone Demon',
    zh: '白骨精',
    place: 'White Tiger Ridge',
    intro: [
      'On a bare ridge lives the White Bone Demon. She wants to eat your {师父}: one bite of a holy monk, they say, and you live forever.',
      'She comes as a girl with a basket of {包子}, then as an old woman, then as an old man. Only {孙悟空} sees through her.',
      'In disguise, her words come only as sound. Listen well.',
    ],
    demon: {
      name: 'White Bone Demon',
      zh: '白骨精',
      sprite: 'skull',
      art: 'bone',
      hp: 80,
      power: 11,
      twist: 'disguise',
      taunt: 'Such a kind monk… and so tasty.',
      line: {
        zh: '师父 ， 吃 包子 吧 。',
        en: 'Master, have a steamed bun.',
        voice: 'White Bone Demon',
      },
    },
    win: 'The third blow of the cudgel finds her true shape: a heap of white {骨头}. Your {师父} scolds {孙悟空} for killing "a poor old man" – but you know {孙悟空} was {对}.',
    teach: ['妖怪', '骨头', '吃'],
  },
  {
    id: 'q12',
    title: 'The gourd that calls your name',
    zh: '平顶山',
    place: 'Flat-Top Mountain',
    intro: [
      'On Flat-Top Mountain live two demon kings, Golden Horn and Silver Horn. They have heard that whoever eats your {师父} will {长生不老}.',
      'Silver Horn has a red-gold {葫芦}. He calls out a {名字}, and if you {答应}, you are drawn inside and melt away.',
      '{孙悟空} gives a false {名字} and answers anyway. In he goes!',
      'In this fight the demon calls out the words. Listen: answer wrong, and you go into the gourd.',
    ],
    demon: {
      name: 'Silver Horn King',
      zh: '银角大王',
      art: 'horn',
      hp: 90,
      power: 12,
      twist: 'gourd',
      taunt: 'Sun Wukong! Will you answer me?',
      line: {
        zh: '孙悟空 ！ 你 答应 吗 ？',
        en: 'Sun Wukong! Will you answer?',
        voice: 'Silver Horn King',
      },
    },
    win: '{孙悟空} wriggles out, steals the {葫芦} and calls, "Silver Horn!" The demon answers – and is drawn inside. Laozi comes down from heaven for his two runaway furnace boys and their {宝贝}, and leaves you a small {葫芦} of his golden elixir.',
    teach: ['葫芦', '名字'],
    reward: 'gourd',
  },
  {
    id: 'q4',
    title: 'Red Boy',
    zh: '红孩儿',
    place: 'Fire Cloud Cave',
    intro: [
      'A child cries by the road, tied to a tree. Your kind {师父} sets him free. It is Red Boy, son of the Bull Demon King.',
      'He breathes the Samadhi {火}, which water cannot put out. Even {孙悟空} is burnt.',
      'His fire burns down your time: answer fast.',
    ],
    demon: {
      name: 'Red Boy',
      zh: '红孩儿',
      sprite: 'red-boy',
      art: 'redboy',
      hp: 100,
      power: 13,
      twist: 'fire',
      taunt: 'Too slow! Too slow!',
      line: { zh: '太 慢 了 ！', en: 'Too slow!', voice: 'Red Boy' },
    },
    win: '{观音} catches Red Boy with five golden rings, and he becomes her disciple. Your {师父} is safe, {热} but unharmed.',
    teach: ['火', '热', '快'],
  },
  {
    id: 'q7',
    title: 'The Scorpion of Poison Mountain',
    zh: '蝎子精',
    place: 'The Kingdom of Women',
    intro: [
      'You come to a kingdom where only women live. Its queen falls in love with your {师父} and asks him to stay and be king.',
      'He is tempted, but the road is {西}. As you leave, a whirlwind snatches him away: the Scorpion Demon of Poison Mountain wants him for herself.',
      'Her sting burns long after it lands. Every wrong answer poisons you, and the poison hurts every turn.',
    ],
    demon: {
      name: 'Scorpion Demon',
      zh: '蝎子精',
      sprite: 'scorpion',
      art: 'scorpion',
      hp: 110,
      power: 12,
      twist: 'poison',
      taunt: 'One sting, and even the Buddha winced.',
      line: {
        zh: '他 是 我 的 ！',
        en: 'He is mine!',
        voice: 'Scorpion Demon',
      },
    },
    win: 'The Star Lord of the Rooster crows from heaven, and the scorpion shrinks back to her true shape and dies. Your {师父} walks on, {心} untroubled.',
    teach: ['心', '西'],
  },
  {
    id: 'q8',
    title: 'The False Monkey King',
    zh: '六耳猕猴',
    place: 'Flower-Fruit Mountain',
    intro: [
      'Your {师父} has sent {孙悟空} away in anger. While he is gone, another {猴子} comes – the same face, the same cudgel, the same voice – and strikes the monk down.',
      'Two Monkey Kings fight from earth to heaven and back. Not even the gods can tell them apart.',
      'In this fight the wrong answers look like the right one: they share its characters. Look closely.',
    ],
    demon: {
      name: 'Six-eared macaque',
      zh: '六耳猕猴',
      sprite: 'macaque',
      art: 'macaque',
      hp: 120,
      power: 14,
      twist: 'mirror',
      taunt: 'Which of us is real? Even you cannot say.',
      line: {
        zh: '我 是 孙悟空 ！',
        en: 'I am Sun Wukong!',
        voice: 'Six-eared macaque',
      },
    },
    win: 'Only the Buddha sees the truth: the false king is a six-eared macaque, who hears everything for a thousand {里}. {孙悟空} brings the cudgel down. There is one Monkey King again, and the monkeys of his old home fill your bag with {桃子}.',
    teach: ['猴子', '看', '桃子'],
    reward: 'peaches',
  },
  {
    id: 'q6',
    title: 'The Bull Demon King',
    zh: '牛魔王',
    place: 'The Flaming Mountains',
    intro: [
      'The road runs into the Flaming Mountains: eight hundred {里} of {火}. Only the palm-leaf fan of Princess Iron Fan can put it out.',
      "She is Red Boy's mother, and she has not forgiven you. Her husband, the Bull Demon King, is the strongest demon of them all – and once {孙悟空}'s sworn brother.",
      'Her fan blows the hints of your answers this way and that.',
    ],
    demon: {
      name: 'Bull Demon King',
      zh: '牛魔王',
      sprite: 'bull',
      art: 'bull',
      hp: 130,
      power: 15,
      twist: 'fan',
      taunt: 'Brother! Did you think I had forgotten?',
      line: {
        zh: '我 的 儿子 呢 ？',
        en: 'Where is my son?',
        voice: 'Bull Demon King',
      },
    },
    win: "Heaven's armies help {孙悟空} bring the Bull King down. Forty-nine waves of the fan put the {火} out for good, and rain falls on the Flaming Mountains. The road {西} is open.",
    teach: ['力量', '打', '火'],
  },
  {
    id: 'q9',
    title: 'The golden cymbals',
    zh: '小雷音寺',
    place: 'Lesser Thunderclap Monastery',
    intro: [
      'At last, a great monastery: Thunderclap, where the Buddha lives! Your {师父} kneels. But {孙悟空} frowns: something is wrong.',
      'It is a trap. Yellow Brows, a temple boy run away from heaven, sits on the throne dressed as the Buddha. He claps a pair of {金} cymbals over {孙悟空}.',
      'Trapped in the dark, there is room for only one move: the somersault cloud. Every blow is typed.',
    ],
    demon: {
      name: 'Yellow Brows',
      zh: '黄眉大王',
      sprite: 'cymbals',
      art: 'brows',
      hp: 140,
      power: 14,
      twist: 'trap',
      taunt: 'Bow to your Buddha, monkey!',
      line: {
        zh: '我 是 佛 ！',
        en: 'I am the Buddha!',
        voice: 'Yellow Brows',
      },
    },
    win: "A horn grows through the cymbals and {孙悟空} squeezes out through a hole drilled in its tip. Yellow Brows' master, the Buddha Maitreya, takes him home.",
    teach: ['故事', '打'],
  },
  {
    id: 'q5',
    title: 'The Spider Spirits',
    zh: '盘丝洞',
    place: 'Silk Cave',
    intro: [
      'Seven {蜘蛛} spirits bathe in a hot spring and spin silk over the mouth of their {洞=cave}. They have caught your {师父} in it.',
      'They come at you one after another, small and quick.',
    ],
    demon: {
      name: 'Spider spirits',
      zh: '蜘蛛精',
      sprite: 'spider',
      art: 'spider',
      hp: 140,
      power: 9,
      twist: 'swarm',
      taunt: 'Seven of us, one of you.',
      line: {
        zh: '我们 七 个 人 ， 你 一 个 。',
        en: 'Seven of us, one of you.',
        voice: 'Spider spirits',
      },
    },
    win: 'The webs fall away. The seven sisters flee to their sworn brother. Your {师父} is free again, and a little embarrassed.',
    teach: ['蜘蛛', '七', '小心'],
  },
  {
    id: 'q13',
    title: 'The Golden-winged Roc',
    zh: '狮驼岭',
    place: 'Lion-Camel Ridge',
    intro: [
      'An old man warns you: on Lion-Camel Ridge live three demon kings – a lion, an elephant and a roc – with forty-seven thousand little demons.',
      'The lion swallows {孙悟空} whole, and is sorry: from inside his belly the {猴子} kicks and punches until he begs for mercy.',
      'But the third king, the Golden-winged Roc, can {飞} ninety thousand {里} with one beat of his wings, faster than any somersault.',
      'He knows the tricks of every demon you have met. Each turn he fights with another.',
    ],
    demon: {
      name: 'Golden-winged Roc',
      zh: '大鹏',
      art: 'roc',
      hp: 160,
      power: 16,
      twist: 'roc',
      taunt: 'Nothing under heaven is faster than I am.',
      line: {
        zh: '我 最 快 ！',
        en: 'I am the fastest!',
        voice: 'Golden-winged Roc',
      },
    },
    win: 'The Buddha himself comes down. The lion and the elephant go home as the mounts of two bodhisattvas, and the Roc folds his golden wings. There are more ordeals ahead, eighty-one in all, but none so hard. At Vulture Peak at last your {师父} is given the {经}, and {孙悟空} is made a Buddha.',
    teach: ['飞', '厉害'],
  },
]

// What a chapter's first win brings
export const REWARDS: Record<Reward, string> = {
  hairs:
    'Guanyin gives Wukong three life-saving hairs: if he falls, he rises again.',
  pig: 'Zhu Bajie joins you. He takes some blows for you: +20 health.',
  pill: 'A wind-fixing pill: it stills a demon’s twist for three turns.',
  sand: 'Sha Wujing joins you, and carries the luggage: one more peach.',
  gourd: 'A gourd of golden elixir: it heals you fully, once a fight.',
  peaches: 'Peaches from Flower-Fruit Mountain: two more for every fight.',
}

// Peaches of immortality heal
export const PEACH_HEAL = 30

// Words for the twists that keep to one kind of word
export const FOOD = new Set([
  '吃',
  '喝',
  '饿',
  '渴',
  '好吃',
  '辣',
  '菜',
  '早饭',
  '桃子',
  '肉',
])
export const NUMBERS = new Set(['几', '多少'])

// --- Skills: Wukong's arts, learnt as the word bank grows. Each is a
// question of its own, once a fight; `known` is how many words must be
// known (hanzi alone) before Wukong remembers it.

export type SkillId = 'clones' | 'freeze' | 'insect' | 'giant' | 'sage'

export interface Skill {
  id: SkillId
  name: string
  zh: string
  known: number
  text: string
}

export const SKILLS: Array<Skill> = [
  {
    id: 'clones',
    name: 'Hair clones',
    zh: '身外身法',
    known: 5,
    text: 'He plucks a few hairs and blows on them, and each becomes a monkey. Three quick questions; each right one is a blow.',
  },
  {
    id: 'freeze',
    name: 'Freezing spell',
    zh: '定身法',
    known: 15,
    text: 'Type a word’s pinyin, and the demon stands frozen: it loses its next turn.',
  },
  {
    id: 'insect',
    name: 'Into an insect',
    zh: '变小虫',
    known: 30,
    text: 'He turns into a tiny insect and flies inside the demon, as he did with Princess Iron Fan. Hear a word and type it: a heavy blow from within.',
  },
  {
    id: 'giant',
    name: 'As tall as heaven',
    zh: '法天象地',
    known: 50,
    text: 'He grows as tall as the sky. Type a word’s pinyin, and your next three blows hit twice as hard.',
  },
  {
    id: 'sage',
    name: 'Great Sage Equal to Heaven',
    zh: '齐天大圣',
    known: 100,
    text: 'His old title, and all his old strength. Three typed words; each right one is a blow as hard as the somersault cloud.',
  },
]

// --- The party: who walks with you, from the chapters won

export const PARTY = [
  { id: 'monk', name: 'Tang Sanzang', zh: '唐僧', after: null },
  { id: 'pig', name: 'Zhu Bajie', zh: '猪八戒', after: 'q10' },
  { id: 'sand', name: 'Sha Wujing', zh: '沙僧', after: 'q11' },
] as const

// What the demons say, for the speech made ahead (data/extra.ts)
export const QUEST_SPEECH = QUEST.flatMap((c) =>
  c.demon.line
    ? [
        {
          voice: c.demon.line.voice,
          text: c.demon.line.zh
            .split(' ')
            .filter(Boolean)
            .map((t) => t.split('=')[0])
            .join(''),
          kind: 'line' as const,
        },
      ]
    : [],
)
