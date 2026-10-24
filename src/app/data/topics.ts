import { LESSONS, WORD, WORDS } from './words.ts'
import type { Word } from './words.ts'

// Topics to choose (games/topics.tsx), as many as the player likes, each
// at a priority from 1 to 3: the words of the topics chosen are met
// first, in Today's new words and in Learn, taken in rounds of as many
// from each as its priority, and the rest after them in the usual order
// (toMeet in lib/bank.ts). A topic is one or more lessons of
// data/words.ts, with words from other lessons it needs (`also`, met
// before the lessons' own).

export interface Topic {
  id: string
  title: string
  zh: string
  py: string
  // What it is about, for its card: a line or two
  about: string
  // The lessons whose words it has, by title
  lessons: Array<string>
  // Words of other lessons it needs too, by id, space-separated
  also?: string
}

export interface TopicGroup {
  id: string
  title: string
  zh: string
  py: string
  topics: Array<Topic>
}

export const TOPIC_GROUPS: Array<TopicGroup> = [
  {
    id: 'travel',
    title: 'Travel in China',
    zh: '旅行',
    py: 'lǚxíng',
    topics: [
      {
        id: 'food',
        title: 'Food and drink',
        zh: '吃喝',
        py: 'chīhē',
        about:
          'Breakfast at a stall, ordering in a restaurant, the dishes worth knowing, how spicy, no coriander, and taking the rest away.',
        lessons: ['Breakfast', 'Eating out', 'Food'],
        also: '吃 喝 好吃 菜单 烤鸭 甜 牛奶',
      },
      {
        id: 'shopping',
        title: 'Shopping and paying',
        zh: '购物',
        py: 'gòuwù',
        about:
          'Prices and money, clothes and sizes, haggling at a market, paying by phone or card, souvenirs, and taking things back.',
        lessons: ['Money', 'Shopping', 'The market', 'Shops'],
        also: '现金 扫 微信 付 超市 价格',
      },
      {
        id: 'transport',
        title: 'Taxis, trains and the metro',
        zh: '交通',
        py: 'jiāotōng',
        about:
          'Asking the way, telling the driver where to stop, tickets for the high-speed train, the metro and the airport, and a delay.',
        lessons: [
          'Getting around',
          'Trains and planes',
          'Around town',
          'Transport',
        ],
      },
      {
        id: 'stay',
        title: 'Hotels and health',
        zh: '住宿',
        py: 'zhùsù',
        about:
          'Checking in and out, what the room is missing, charging a phone, and what to say at a pharmacy or when something goes wrong.',
        lessons: ['The hotel', 'Staying well'],
        also: '酒店 医院 医生 药 生病 救命',
      },
    ],
  },
  {
    id: 'work',
    title: 'Work',
    zh: '工作',
    py: 'gōngzuò',
    topics: [
      {
        id: 'office',
        title: 'The office',
        zh: '办公室',
        py: 'bàngōngshì',
        about:
          'Colleagues and titles, meetings, email, calls, time off and working late. The words of the office game.',
        lessons: ['The office'],
      },
      {
        id: 'software',
        title: 'Software',
        zh: '软件开发',
        py: 'ruǎnjiàn kāifā',
        about:
          'A developer’s day with Chinese colleagues: front end and back end, code, tests, servers and going live, and what the team chat says.',
        lessons: ['Software'],
        also: '工程师 修 马上 改 有空 文件 发 收到 电脑 邮件 密码 开会 加班 下班 辛苦 经理',
      },
    ],
  },
  {
    id: 'thought',
    title: 'Thought and the past',
    zh: '思想和历史',
    py: 'sīxiǎng hé lìshǐ',
    topics: [
      {
        id: 'philosophy',
        title: 'Philosophy',
        zh: '哲学',
        py: 'zhéxué',
        about:
          'The Hundred Schools: Confucius and his virtues, Laozi and Zhuangzi’s Way, the Legalists and Mozi, and the words for thinking about them.',
        lessons: ['Ideas', 'Philosophy'],
        also: '道德经 庄子',
      },
      {
        id: 'history',
        title: 'History',
        zh: '历史',
        py: 'lìshǐ',
        about:
          'The dynasties from the Shang to the Qing, the first emperor and his wall, the Silk Road and the great inventions, and the republic after.',
        lessons: ['History'],
        also: '历史 皇帝 秦始皇 长城 兵马俑 战争 打仗 孔子 发明 纸',
      },
      {
        id: 'myths',
        title: 'Mythology',
        zh: '神话',
        py: 'shénhuà',
        about:
          'Gods, dragons and immortals: Pangu and Nüwa, the moon goddess and the archer, the floods tamed by Yu, and the beasts of old books.',
        lessons: ['Myth and history', 'Legends', 'Myths'],
        also: '后羿',
      },
      {
        id: 'west',
        title: 'Journey to the West',
        zh: '西游记',
        py: 'Xīyóujì',
        about:
          'The monk, the monkey, the pig and the sand monk on the road to India, and the demons they meet. The words of the quest.',
        lessons: ['The road west'],
        also: '孙悟空 师父 西游记 妖怪 猴子 齐天大圣 金箍棒 和尚 佛',
      },
    ],
  },
  {
    id: 'sky',
    title: 'The sky',
    zh: '天空',
    py: 'tiānkōng',
    topics: [
      {
        id: 'astronomy',
        title: 'Astronomy',
        zh: '天文',
        py: 'tiānwén',
        about:
          'The night sky and the telescope: planets and stars, the Pole Star and the Big Dipper, eclipses, comets and black holes.',
        lessons: ['Astronomy'],
        also: '星星 月亮 太阳 地球 火星 木星 土星 小行星 宇宙 银河 天空',
      },
      {
        id: 'space',
        title: 'Space travel',
        zh: '太空',
        py: 'tàikōng',
        about:
          'Rockets, starships and aliens, the orders on the bridge and the dangers out there. The words of the starship.',
        lessons: ['Space', 'Starship'],
      },
    ],
  },
  {
    id: 'leisure',
    title: 'Free time',
    zh: '业余',
    py: 'yèyú',
    topics: [
      {
        id: 'play',
        title: 'Games, books and music',
        zh: '游戏和音乐',
        py: 'yóuxì hé yīnyuè',
        about:
          'Playing and winning, songs and films, books and science fiction.',
        lessons: ['Games and music'],
      },
      {
        id: 'garden',
        title: 'Gardens and seasons',
        zh: '花园',
        py: 'huāyuán',
        about:
          'A Chinese garden through the year: plum blossom and lotus, the pond and its koi, the pavilion, and the four seasons.',
        lessons: ['The garden'],
      },
    ],
  },
]

export const TOPICS: Array<Topic> = TOPIC_GROUPS.flatMap((g) => g.topics)

export const TOPIC: Record<string, Topic | undefined> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t]),
)

// A topic's words, in the order it meets them: those it needs from other
// lessons, then its lessons' own
export function topicWords(t: Topic): Array<Word> {
  const ns = new Set(
    t.lessons.map((title) => LESSONS.find((l) => l.title === title)?.n),
  )
  const also = (t.also ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => WORD[id])
    .filter((w): w is Word => !!w && !ns.has(w.lesson))
  return [...also, ...WORDS.filter((w) => ns.has(w.lesson))]
}
