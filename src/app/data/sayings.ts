// Sayings: lines from the classics and after, each character with its
// pinyin and a word-for-word gloss, then a translation and where it is
// from. Pinyin is one syllable per character (punctuation aside), glosses
// one per character, split by |.

export interface Saying {
  id: string
  zh: string
  py: string
  gloss: string
  en: string
  source: string
  note: string
  theme: 'Confucius' | 'Dao' | 'Poetry' | 'Myth' | 'Revolution' | 'Yijing'
}

export const SAYINGS: Array<Saying> = [
  {
    id: 'xue-er',
    zh: '学而时习之，不亦说乎？',
    py: 'xué ér shí xí zhī bú yì yuè hū',
    gloss: 'learn|and|in time|practise|it|not|also|pleasing|[?]',
    en: 'To learn, and to practise it when the time comes – is that not a pleasure?',
    source: 'Analects 1.1 · Confucius (551–479 BC)',
    note: 'The first line of the Analects. 说 is read yuè here, an old way of writing 悦, "pleased".',
    theme: 'Confucius',
  },
  {
    id: 'wen-gu',
    zh: '温故而知新',
    py: 'wēn gù ér zhī xīn',
    gloss: 'warm up|the old|and|know|the new',
    en: 'Go over the old, and come to know the new.',
    source: 'Analects 2.11 · Confucius',
    note: 'He adds: whoever can do this may be a teacher. A fair motto for spaced repetition.',
    theme: 'Confucius',
  },
  {
    id: 'san-ren',
    zh: '三人行，必有我师焉。',
    py: 'sān rén xíng bì yǒu wǒ shī yān',
    gloss: 'three|people|walk|surely|have|my|teacher|among them',
    en: 'When three walk together, one of them is surely my teacher.',
    source: 'Analects 7.22 · Confucius',
    note: 'He goes on: pick out their good points and follow them, and their bad points, and change them in yourself.',
    theme: 'Confucius',
  },
  {
    id: 'zhi-zhi',
    zh: '知之为知之，不知为不知，是知也。',
    py: 'zhī zhī wéi zhī zhī bù zhī wéi bù zhī shì zhī yě',
    gloss:
      'know|it|count as|know|it|not|know|count as|not|know|this|knowing|[!]',
    en: 'To count what you know as known, and what you do not know as not known – that is knowing.',
    source: 'Analects 2.17 · Confucius',
    note: 'Said to his disciple Zilu. The last 知 is often read zhì, "wisdom".',
    theme: 'Confucius',
  },
  {
    id: 'ji-suo',
    zh: '己所不欲，勿施于人。',
    py: 'jǐ suǒ bú yù wù shī yú rén',
    gloss: 'self|what|not|want|do not|impose|on|others',
    en: 'What you do not want for yourself, do not do to others.',
    source: 'Analects 15.24 · Confucius',
    note: 'Asked for one word to live by, Confucius answers 恕 shù, reciprocity – and explains it with this line.',
    theme: 'Confucius',
  },
  {
    id: 'dao-ke-dao',
    zh: '道可道，非常道。',
    py: 'dào kě dào fēi cháng dào',
    gloss: 'the Way|can|be told|not|constant|Way',
    en: 'The Way that can be told is not the constant Way.',
    source: 'Daodejing 1 · Laozi (6th–4th century BC)',
    note: 'The opening of the Daodejing. Two words you know hide in it: 道 is also "to say" (知道), and 非常, "not constant", is today simply "very".',
    theme: 'Dao',
  },
  {
    id: 'shang-shan',
    zh: '上善若水',
    py: 'shàng shàn ruò shuǐ',
    gloss: 'highest|good|is like|water',
    en: 'The highest good is like water.',
    source: 'Daodejing 8 · Laozi',
    note: 'Water does good to all things and does not compete; it settles in the low places others scorn. So it is close to the Way.',
    theme: 'Dao',
  },
  {
    id: 'qian-li',
    zh: '千里之行，始于足下。',
    py: 'qiān lǐ zhī xíng shǐ yú zú xià',
    gloss: 'thousand|li|of|journey|begins|at|foot|under',
    en: 'A journey of a thousand li begins beneath your feet.',
    source: 'Daodejing 64 · Laozi',
    note: 'A li is about half a kilometre. Often quoted as "begins with a single step".',
    theme: 'Dao',
  },
  {
    id: 'zhi-ren',
    zh: '知人者智，自知者明。',
    py: 'zhī rén zhě zhì zì zhī zhě míng',
    gloss: 'know|others|one who|clever|self|know|one who|clear-sighted',
    en: 'Knowing others is cleverness; knowing yourself is insight.',
    source: 'Daodejing 33 · Laozi',
    note: 'It goes on: mastering others takes force; mastering yourself takes strength.',
    theme: 'Dao',
  },
  {
    id: 'zi-fei-yu',
    zh: '子非鱼，安知鱼之乐？',
    py: 'zǐ fēi yú ān zhī yú zhī lè',
    gloss: 'you|are not|fish|how|know|fish|of|joy',
    en: 'You are not a fish – how do you know what fish enjoy?',
    source: 'Zhuangzi 17, "Autumn Floods" (4th century BC)',
    note: 'On a bridge over the Hao, Zhuangzi says the fish are happy; his friend Huizi asks this. Zhuangzi: "You are not me – how do you know I do not know?"',
    theme: 'Dao',
  },
  {
    id: 'meng-die',
    zh: '庄周梦蝶',
    py: 'Zhuāng Zhōu mèng dié',
    gloss: 'Zhuang|Zhou|dreams|butterfly',
    en: 'Zhuang Zhou dreams he is a butterfly.',
    source: 'Zhuangzi 2, "On the equality of things"',
    note: 'He wakes, and does not know if he is Zhuang Zhou who dreamt he was a butterfly, or a butterfly dreaming it is Zhuang Zhou. The oldest simulation argument.',
    theme: 'Dao',
  },
  {
    id: 'jing-ye-si',
    zh: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
    py: 'chuáng qián míng yuè guāng yí shì dì shàng shuāng jǔ tóu wàng míng yuè dī tóu sī gù xiāng',
    gloss:
      'bed|before|bright|moon|light|suspect|is|ground|on|frost|raise|head|gaze at|bright|moon|lower|head|think of|old|home',
    en: 'Before my bed the moon is bright; I took it for frost on the ground. I raise my head to the bright moon, and lower it, thinking of home.',
    source: '"Quiet Night Thoughts" · Li Bai (701–762), Tang dynasty',
    note: 'Perhaps the best-known poem in Chinese: every child learns it by heart. Five characters a line, four lines.',
    theme: 'Poetry',
  },
  {
    id: 'chang-e',
    zh: '嫦娥奔月',
    py: 'Cháng é bēn yuè',
    gloss: 'Chang|e|flies to|moon',
    en: "Chang'e flies to the moon.",
    source: 'Myth, told in the Huainanzi (2nd century BC) and after',
    note: "She drank the elixir of immortality and floated up to the moon, where she lives with a jade rabbit. China's moon probes are called Chang'e, and its moon rovers Yutu, Jade Rabbit.",
    theme: 'Myth',
  },
  {
    id: 'sai-weng',
    zh: '塞翁失马，焉知非福？',
    py: 'sài wēng shī mǎ yān zhī fēi fú',
    gloss: 'frontier|old man|loses|horse|how|know|not|blessing',
    en: 'The old man at the frontier lost his horse – who knows it is not a blessing?',
    source: 'Huainanzi (2nd century BC)',
    note: 'The horse comes back with a fine wild one. His son rides it and breaks his leg. Then war comes, and the lame son is not taken. Luck turns, and turns again.',
    theme: 'Myth',
  },
  {
    id: 'tian-xing-jian',
    zh: '天行健，君子以自强不息。',
    py: 'tiān xíng jiàn jūn zǐ yǐ zì qiáng bù xī',
    gloss:
      'heaven|moves|vigorously|noble|person|thereby|self|strengthen|not|rest',
    en: 'Heaven moves with vigour: so the noble person grows strong without rest.',
    source: 'Yijing, the image of hexagram 1, 乾 Qián',
    note: 'The motto of Tsinghua University. 君子, "the noble person", is the ideal of Confucian learning.',
    theme: 'Yijing',
  },
  {
    id: 'tian-xia-wei-gong',
    zh: '天下为公',
    py: 'tiān xià wéi gōng',
    gloss: 'heaven|under|is|for all',
    en: 'All under heaven belongs to all.',
    source: 'Book of Rites, "The Great Unity" (2nd century BC)',
    note: 'A picture of the age of 大同, the Great Unity, when the world was shared. Sun Yat-sen took it as his motto; Kang Youwei and Mao both read it as a promise.',
    theme: 'Revolution',
  },
  {
    id: 'wei-renmin',
    zh: '为人民服务',
    py: 'wèi rén mín fú wù',
    gloss: 'for|people|people|serve|serve',
    en: 'Serve the people.',
    source: 'Mao Zedong, 1944',
    note: 'The title of his speech at the funeral of Zhang Side, a soldier of the Eighth Route Army. Since then the motto of the Communist Party, written over the gate of Zhongnanhai.',
    theme: 'Revolution',
  },
  {
    id: 'shi-shi',
    zh: '实事求是',
    py: 'shí shì qiú shì',
    gloss: 'real|things|seek|truth',
    en: 'Seek truth from facts.',
    source: 'Book of Han (1st century); Mao Zedong, 1941; Deng Xiaoping, 1978',
    note: 'An old phrase for careful scholarship. Mao made it a rule against dogma; Deng used it to open the reforms.',
    theme: 'Revolution',
  },
]

// Who says each, for the speech made ahead (data/voices.ts): every master
// in his own voice, the myths told by the storyteller, the oracle by a
// diviner, and the slogans on the radio
const SAYER: Record<Saying['theme'], string> = {
  Confucius: 'Confucius',
  Dao: 'Laozi',
  Poetry: 'Poet',
  Myth: 'Storyteller',
  Revolution: 'Announcer',
  Yijing: 'Diviner',
}

export const sayer = (s: Saying) =>
  s.source.startsWith('Zhuangzi') ? 'Zhuangzi' : SAYER[s.theme]
