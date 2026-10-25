import { lazy } from 'react'

// Every game, in the order the home screen shows them (the trip has its own
// card at the top; settings are reached by the cog). The game is kept in the
// URL's hash: /#tones. To add a game, add a file to games/ and a line
// here.

const page = (load: () => Promise<{ default: React.ComponentType }>) =>
  lazy(load)

export const GAMES = [
  {
    id: 'trip',
    title: 'The trip',
    zh: '旅行',
    sprite: 'map',
    blurb:
      'Talk your way from Beijing to Shanghai. Words turn Chinese as you learn them.',
    Page: page(() => import('./games/trip')),
  },
  {
    id: 'learn',
    title: 'Learn',
    zh: '学',
    sprite: 'sprout',
    blurb: 'Meet new words, five at a time.',
    Page: page(() => import('./games/learn')),
  },
  {
    id: 'topics',
    title: 'Topics',
    zh: '话题',
    sprite: 'cards',
    blurb:
      'Choose what to learn about, from 1 to 3: food, taxis, work, software, philosophy, history, myths, the sky. Their words come first.',
    Page: page(() => import('./games/topics')),
  },
  {
    id: 'review',
    title: 'Review',
    zh: '复习',
    sprite: 'review',
    blurb: 'The words that are fading, before they go.',
    Page: page(() => import('./games/review')),
  },
  {
    id: 'start',
    title: 'First steps',
    zh: '入门',
    sprite: 'door',
    blurb:
      'New to Chinese? Seven short days on characters, tones, pinyin and first sentences.',
    Page: page(() => import('./games/course')),
  },
  {
    id: 'pinyin',
    title: 'Pinyin',
    zh: '拼音',
    sprite: 'bell',
    blurb:
      'Every sound of Mandarin laid out: initials, finals and tones, to hear and train your ear on.',
    Page: page(() => import('./games/pinyin')),
  },
  {
    id: 'tones',
    title: 'Tones',
    zh: '声调',
    sprite: 'note',
    blurb: 'Hear the four tones, then say them into the mic.',
    Page: page(() => import('./games/tones')),
  },
  {
    id: 'quest',
    title: 'Journey to the West',
    zh: '西游',
    sprite: 'monkey',
    blurb: 'Fight demons beside the Monkey King, with words for weapons.',
    Page: page(() => import('./games/quest')),
  },
  {
    id: 'read',
    title: 'Reader',
    zh: '阅读',
    sprite: 'book',
    blurb:
      'Short texts in characters, with pinyin and English that fade as you learn each word.',
    Page: page(() => import('./games/read')),
  },
  {
    id: 'stories',
    title: 'Stories',
    zh: '故事',
    sprite: 'lantern',
    blurb:
      'Old tales played with shadow puppets: Pangu, Nüwa, the Monkey King and more.',
    Page: page(() => import('./games/stories')),
  },
  {
    id: 'bridge',
    title: 'Starship',
    zh: '飞船',
    sprite: 'rocket',
    blurb: 'The captain gives orders in Chinese. Steer, fire, survive.',
    Page: page(() => import('./games/bridge')),
  },
  {
    id: 'listen',
    title: 'Listening',
    zh: '听',
    sprite: 'ear',
    blurb: 'Hear what people say on the trip, and pick what it means.',
    Page: page(() => import('./games/listen')),
  },
  {
    id: 'chat',
    title: 'Chat',
    zh: '聊天',
    sprite: 'talk',
    blurb:
      'Talk out loud with a teacher who keeps to the words you know, every word written out as you go. On your own Gemini key.',
    Page: page(() => import('./games/chat')),
  },
  {
    id: 'podcast',
    title: 'Podcast',
    zh: '播客',
    sprite: 'mic',
    blurb:
      'Ten minutes of talk in English and simple Chinese, made from the words you meet here.',
    Page: page(() => import('./games/podcast')),
  },
  {
    id: 'rain',
    title: 'Pinyin rain',
    zh: '下雨',
    sprite: 'rain',
    blurb: 'Type the pinyin of falling words before they land.',
    // typed against the clock: left out on a phone (lib/device.ts)
    keyboard: true,
    Page: page(() => import('./games/rain')),
  },
  {
    id: 'shop',
    title: 'Dumpling stall',
    zh: '饺子馆',
    sprite: 'dumplings',
    blurb: 'Customers order out loud. Serve them right, and fast.',
    Page: page(() => import('./games/shop')),
  },
  {
    id: 'market',
    title: 'The market',
    zh: '讨价还价',
    sprite: 'fan',
    blurb: 'Stall-keepers name their prices out loud. Haggle them down.',
    Page: page(() => import('./games/market')),
  },
  {
    id: 'taxi',
    title: 'Taxi',
    zh: '出租车',
    sprite: 'taxi',
    blurb:
      'Passengers tell you the way in Chinese. Listen, and drive them there.',
    Page: page(() => import('./games/taxi')),
  },
  {
    id: 'office',
    title: 'The office',
    zh: '办公室',
    sprite: 'briefcase',
    blurb:
      'Messages, calls and meetings in Chinese. Do well, and you are promoted.',
    Page: page(() => import('./games/office')),
  },
  {
    id: 'parts',
    title: 'Character parts',
    zh: '部首',
    sprite: 'parts',
    blurb: 'Hanzi are built from parts that hint at meaning and sound.',
    Page: page(() => import('./games/parts')),
  },
  {
    id: 'write',
    title: 'Brush',
    zh: '写字',
    sprite: 'brush',
    blurb: 'Write the characters you know, stroke by stroke.',
    Page: page(() => import('./games/write')),
  },
  {
    id: 'numbers',
    title: 'Numbers',
    zh: '数字',
    sprite: 'abacus',
    blurb: 'Prices, times and phone numbers, by ear.',
    Page: page(() => import('./games/numbers')),
  },
  {
    id: 'quiz',
    title: 'Quiz',
    zh: '问答',
    sprite: 'paper-lantern',
    blurb:
      'General questions in simple Chinese. Read what you can, guess the rest.',
    Page: page(() => import('./games/quiz')),
  },
  {
    id: 'order',
    title: 'Word order',
    zh: '语序',
    sprite: 'bricks',
    blurb: 'Build sentences in Chinese order.',
    Page: page(() => import('./games/order')),
  },
  {
    id: 'sayings',
    title: 'Sayings',
    zh: '名言',
    sprite: 'scroll',
    blurb: 'Confucius, Laozi and the classics, line by line.',
    Page: page(() => import('./games/sayings')),
  },
  {
    id: 'words',
    title: 'Word bank',
    zh: '词库',
    sprite: 'book',
    blurb: 'Every word, and how well you know it. Mark the ones you know.',
    Page: page(() => import('./games/words')),
  },
  // Hidden: reached by URL only, not shown on the home screen
  {
    id: 'gallery',
    title: 'Gallery',
    zh: '画廊',
    sprite: 'star',
    blurb: 'Every sprite and portrait, for checking the art.',
    hidden: true,
    Page: page(() => import('./games/gallery')),
  },
  {
    id: 'settings',
    title: 'Settings',
    zh: '设置',
    sprite: 'book',
    blurb: '',
    Page: page(() => import('./games/settings')),
  },
  // The daily habit: a session for each day, seals for what is done, a
  // garden that grows with the lessons (daily/ has their home-screen
  // pieces), and mahjong with words
  {
    id: 'today',
    title: 'Today',
    zh: '今天',
    sprite: 'sun',
    blurb:
      'Ten minutes a day: the words that are fading, a few new ones, a scene or a game, and some listening.',
    Page: page(() => import('./games/today')),
  },
  {
    id: 'mahjong',
    title: 'Mahjong',
    zh: '麻将',
    sprite: 'bricks',
    blurb: 'Clear stacked tiles in pairs: each word and its meaning.',
    Page: page(() => import('./games/mahjong')),
  },
  {
    id: 'garden',
    title: 'The garden',
    zh: '花园',
    sprite: 'tree',
    blurb: 'A courtyard that grows a little with every lesson you learn.',
    Page: page(() => import('./games/garden')),
  },
  {
    id: 'seals',
    title: 'Seals',
    zh: '印章',
    sprite: 'trophy',
    blurb: 'Red seals for what you have done, each with a character to learn.',
    Page: page(() => import('./games/seals')),
  },
] as const

export type GameId = (typeof GAMES)[number]['id']
