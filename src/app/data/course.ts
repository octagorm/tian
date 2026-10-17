import { numberPinyin, value } from '../lib/numbers.ts'
import { WORD } from './words.ts'
import { PICTURES } from './parts.ts'

// First steps (入门, rùmén, "in at the gate"): a course for someone new to
// Chinese, seven days of three short parts, to take a day at a time. It
// says how the language works (characters, tones, pinyin, word order,
// numbers) and how Tian shows it, and meets the first words on the way.
//
// A part is a few screens: something to read, with things to hear (`show`),
// words to meet and a quiz on them, a question, a round by ear, or a line
// to build. Lines are the trip's, in its speakers' voices, or the
// course's own examples (OWN_LINES), read by the teacher. Everything it
// plays is listed for lib/speech.ts by courseSpeech (lib/course.ts).
//
// Text is plain English. Hanzi in it are shown in the Chinese font, and a
// run of them that is a word of the bank can be tapped; _x_ is pinyin and
// **x** bold. A blank line starts a paragraph, "- " a list.

// Something to look at and hear: a word, a character or a syllable
export interface Glyph {
  h: string
  // Pinyin as stored, one syllable per character; none for a syllable
  p?: string
  m: string
  // How it is made ("middle + country")
  note?: string
  // A pictograph's picture
  sprite?: string
  // What is played, in the word voice
  say: string
}

export type Show =
  | { k: 'glyphs'; items: Array<Glyph>; small?: boolean }
  // The four tones of a tone drill (data/tones.ts), by its base
  | { k: 'tones'; base: string }
  // Syllables in pinyin, each to hear: a row for each set to compare
  | { k: 'sounds'; rows: Array<Array<string>> }
  // Lines of the trip, in mixed text, heard in their speakers' voices
  | { k: 'lines'; zh: Array<string> }
  // One line of the trip as a new word, a word learning and a word known
  | { k: 'levels'; zh: string }
  // Characters of data/parts.ts, with their parts
  | { k: 'built'; c: Array<string> }
  // How a word's memory lasts longer with each review (lib/bank.ts)
  | { k: 'memory' }

export type Screen =
  | { k: 'read'; title: string; text: string; show?: Show }
  // Words of the bank to meet, one card each; those already met are passed
  | { k: 'meet'; ids: Array<string> }
  // A question on each word, by meaning and by ear
  | { k: 'quiz'; ids: Array<string> }
  // A question of four; the first option is the right one. `zh` options
  // are lines written word by word, shown in mixed text.
  | {
      k: 'ask'
      q: string
      show?: Show
      options: Array<string>
      zh?: boolean
      note: string
    }
  // A round by ear: a syllable's tone (from the tone drills), a sound told
  // from its neighbours (contrasts of data/pinyin.ts), or a number
  | {
      k: 'ear'
      title: string
      n: number
      tones?: { sets: Array<string>; only?: Array<number> }
      contrasts?: Array<string>
      numbers?: Array<string>
    }
  // Lines of the trip to put in Chinese order, each with its punctuation
  // at the end only
  | { k: 'build'; lines: Array<string> }
  // On to a game, which ends the part
  | { k: 'go'; title: string; text: string; href: string; label: string }

export interface Part {
  id: string
  title: string
  minutes: number
  screens: Array<Screen>
  // A game to practise more in, offered at the end
  more?: { href: string; label: string }
}

export interface Day {
  n: number
  title: string
  zh: string
  py: string
  blurb: string
  parts: Array<Part>
}

const w = (id: string, m?: string, note?: string): Glyph => {
  const word = WORD[id]
  if (!word) throw new Error(`Not in the word bank: ${id}`)
  return {
    h: word.h,
    p: word.p,
    m: m ?? word.g,
    ...(note ? { note } : {}),
    say: word.h,
  }
}

const pic = (c: string, m?: string): Glyph => {
  const p = PICTURES.find((x) => x.c === c)
  if (!p) throw new Error(`Not a picture: ${c}`)
  return { h: c, p: p.p, m: m ?? p.m, sprite: p.sprite, say: c }
}

const num = (h: string, note?: string): Glyph => ({
  h,
  p: numberPinyin(h).join(' '),
  m: String(value(h)),
  ...(note ? { note } : {}),
  say: h,
})

const ONE_TO_TEN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

// The course's own examples, where no line of the trip says it as
// plainly: written word by word as in the trip, read by the teacher (the
// word voice), with what they mean
export const COURSE_VOICE = 'Kore'
export const OWN_LINES: Record<string, string> = {
  '我 是 老师 。': 'I am a teacher.',
  '他 是 老师 。': 'He is a teacher.',
  '他们 是 老师 。': 'They are teachers.',
  '他 是 中国 人 吗 ？': 'Is he Chinese?',
  '是 ， 他 是 中国 人 。': 'Yes, he is Chinese.',
  '不 是 ， 他 是 美国 人 。': 'No, he is American.',
  '你 叫 什么 名字 ？': 'What is your name?',
  '我 叫 小李 。': 'My name is Xiao Li.',
  '一 个 人 ， 两 个 人 ， 三 个 人 。':
    'One person, two people, three people.',
  '我 不 是 中国 人 。': 'I am not Chinese.',
  '我 没有 护照 。': 'I do not have a passport.',
}

export const COURSE: Array<Day> = [
  {
    n: 1,
    title: 'How it works',
    zh: '开始',
    py: 'kāishǐ, to begin',
    blurb: 'Characters, pinyin, and your first four words.',
    parts: [
      {
        id: '1a',
        title: 'Characters',
        minutes: 3,
        screens: [
          {
            k: 'read',
            title: 'One character, one syllable',
            text: 'Chinese is written in characters, 汉字 _hànzì_. Each is said as one syllable, and most carry a meaning of their own.\n\nThere is no alphabet to spell words with. Characters are learnt one at a time, and the same few hundred turn up everywhere. Tap one to hear it.',
            show: { k: 'glyphs', items: [pic('人'), pic('山'), pic('口')] },
          },
          {
            k: 'read',
            title: 'Words of two or three',
            text: 'Most words are one or two characters, and the parts often explain the whole. 中 _zhōng_ is middle and 国 _guó_ is country, so 中国 is China, the Middle Kingdom.',
            show: {
              k: 'glyphs',
              items: [
                w('中国', 'China', 'middle + country'),
                w('中文', 'Chinese', 'middle + writing'),
                w('外国人', 'foreigner', 'outside + country + person'),
              ],
            },
          },
          {
            k: 'ask',
            q: '外国人 is 外 outside, 国 country and 人 person. What is a 外国人?',
            options: [
              'A foreigner',
              'A country house',
              'The countryside',
              'A passport',
            ],
            note: 'Someone from outside the country. The taxi driver in Beijing will ask if you are one.',
          },
          {
            k: 'read',
            title: 'Simplified characters',
            text: 'Tian teaches simplified characters (简体字), the ones used in mainland China and Singapore. Taiwan, Hong Kong and Macau write the traditional forms, many of them with more strokes. 国 is 國 there.',
            show: {
              k: 'glyphs',
              items: [
                { ...w('国', 'simplified'), note: '8 strokes' },
                { ...w('国', 'traditional'), h: '國', note: '11 strokes' },
              ],
            },
          },
        ],
      },
      {
        id: '1b',
        title: 'Pinyin, and how Tian shows words',
        minutes: 3,
        screens: [
          {
            k: 'read',
            title: 'Pinyin',
            text: 'Pinyin (拼音 _pīnyīn_) writes how a character is said, in Latin letters, with a mark for the tone. 你好 is _nǐ hǎo_. You will use it to read new words, to type Chinese and to look words up.\n\nIt is not English spelling. q, x and zh say something else, as day 3 shows.',
            show: { k: 'glyphs', items: [w('你好'), w('谢谢', 'thank you')] },
          },
          {
            k: 'read',
            title: 'Words as you know them',
            text: 'Every game here writes a word by how well you know it. A word you have not met is in English, with its pinyin above. A word you are learning is in characters with pinyin. A word you know is in characters alone.',
            show: { k: 'levels', zh: '请 给 我=me 你 的 护照 。' },
          },
          {
            k: 'read',
            title: 'In Chinese order',
            text: "The English keeps the Chinese word order, so you read a sentence the way it is built. 请 please, 给 give, 我 me, 你的 your, 护照 passport. 的 works like the English 's, so 你的 is your.\n\nAs each word becomes yours, it turns Chinese wherever it is written. Tap any word to hear it and see what it means.",
            show: { k: 'lines', zh: ['请 给 我=me 你 的 护照 。'] },
          },
          {
            k: 'ask',
            q: 'A word shown in characters, with no pinyin above, is one you',
            options: [
              'know well',
              'have not met yet',
              'are meeting for the first time',
              'got wrong last time',
            ],
            note: 'Known words lose their pinyin. If one fades, or you get it wrong, the pinyin comes back until you get it right again.',
          },
        ],
      },
      {
        id: '1c',
        title: 'Your first words',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Hello and goodbye',
            text: '你好 is 你 you and 好 good: hello. 谢谢 is thank you, and the answer to it is 不客气, you are welcome. 再见 is goodbye, literally "again see".',
            show: {
              k: 'glyphs',
              items: [
                w('你好', 'hello', 'you + good'),
                w('谢谢', 'thank you'),
                w('不客气', "you're welcome"),
                w('再见', 'goodbye', 'again + see'),
              ],
            },
          },
          { k: 'meet', ids: ['你好', '谢谢', '不客气', '再见'] },
          { k: 'quiz', ids: ['你好', '谢谢', '不客气', '再见'] },
          {
            k: 'read',
            title: 'In your word bank',
            text: 'These four are in your word bank now. Every game shares it, so a word learnt in one is known in all, and each game asks it again as it begins to fade. Tomorrow, the tones.',
          },
        ],
      },
    ],
  },
  {
    n: 2,
    title: 'Tones',
    zh: '声调',
    py: 'shēngdiào, tones',
    blurb: 'Four shapes of the voice, and how they change in words.',
    parts: [
      {
        id: '2a',
        title: 'Four tones',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Pitch makes the word',
            text: 'Every syllable has a tone, a shape the pitch of the voice makes. Say _ma_ with another tone and it is another word. Mandarin has four, and a light neutral tone. Play each.',
            show: { k: 'tones', base: 'ma' },
          },
          {
            k: 'read',
            title: 'The four shapes',
            text: '- 1 _ā_ is high and level, held on one note as if sung.\n- 2 _á_ rises from the middle, as in a surprised "what?"\n- 3 _ǎ_ is low and dips. Said alone it rises again at the end; inside a sentence it mostly stays low.\n- 4 _à_ falls fast from high to low, as in a firm "no!"',
            show: { k: 'tones', base: 'ba' },
          },
          {
            k: 'read',
            title: 'The marks',
            text: 'Pinyin draws the tone over the vowel, in the shape the voice makes: ā á ǎ à. No mark means the neutral tone, short and light. The second 谢 of 谢谢 _xièxie_ is neutral, and so is 吗 _ma_, which turns a sentence into a question.',
            show: {
              k: 'glyphs',
              items: [w('谢谢', 'thank you'), w('吗', 'question word')],
            },
          },
          {
            k: 'ear',
            title: 'Which tone?',
            n: 8,
            tones: { sets: ['ma', 'ba'] },
          },
        ],
        more: { href: '#tones', label: 'More in Tones' },
      },
      {
        id: '2b',
        title: 'Hearing tones',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Listen for the movement',
            text: 'Voices differ, so do not listen for a high note or a low one. Listen for what the pitch does. Is it flat, does it climb, does it sink, or does it drop?',
            show: { k: 'tones', base: 'wu' },
          },
          {
            k: 'ear',
            title: 'Which tone?',
            n: 8,
            tones: { sets: ['yi', 'wu', 'shi', 'qi', 'hu'] },
          },
          {
            k: 'read',
            title: 'Second or third?',
            text: 'Learners mix up these two most. The second tone climbs steadily from the middle. The third starts low and sinks lower first. Compare 十 _shí_, ten, with 使 _shǐ_, and 国 _guó_, country, with 果 _guǒ_, fruit.',
            show: {
              k: 'glyphs',
              items: [
                { h: '十', p: 'shí', m: 'ten', say: '十' },
                { h: '使', p: 'shǐ', m: 'make (do)', say: '使' },
                { h: '国', p: 'guó', m: 'country', say: '国' },
                { h: '果', p: 'guǒ', m: 'fruit', say: '果' },
              ],
            },
          },
          {
            k: 'ear',
            title: 'Rising or dipping?',
            n: 6,
            tones: {
              sets: ['shi', 'guo', 'ma', 'tang', 'tong'],
              only: [2, 3],
            },
          },
        ],
        more: { href: '#tones', label: 'More in Tones' },
      },
      {
        id: '2c',
        title: 'Tones in words',
        minutes: 5,
        screens: [
          {
            k: 'read',
            title: 'Two third tones',
            text: "When two third tones meet, the first is said as a second. 你好 is written _nǐ hǎo_ and said _ní hǎo_. 可以, may, is written _kěyǐ_ and said _kéyǐ_. Pinyin keeps each syllable's own mark, and the change is only in the saying.",
            show: { k: 'glyphs', items: [w('你好'), w('可以', 'may, can')] },
          },
          {
            k: 'read',
            title: '不 and 一 change too',
            text: '不 _bù_, not, is said _bú_ before a fourth tone, as in 不是 _búshì_, is not, and 不客气 _búkèqi_. 一 _yī_, one, is said _yí_ before a fourth tone and _yì_ before the others, as in 一点 _yìdiǎn_, a little. Tian writes both as they are said.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                w('不', 'not'),
                { h: '不是', p: 'bù shì', m: 'is not', say: '不是' },
                w('不客气', "you're welcome"),
                w('一', 'one'),
                w('一点', 'a little'),
              ],
            },
          },
          {
            k: 'read',
            title: 'Five words for every day',
            text: 'You will use these in nearly every sentence. 我 I and 你 you are both third tones. 好 is good, 是 is "to be", and 不 is not.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                w('我', 'I, me'),
                w('你', 'you'),
                w('好', 'good'),
                w('是', 'to be'),
                w('不', 'not'),
              ],
            },
          },
          { k: 'meet', ids: ['我', '你', '好', '是', '不'] },
          { k: 'quiz', ids: ['我', '你', '好', '是', '不'] },
        ],
      },
    ],
  },
  {
    n: 3,
    title: 'The sounds of pinyin',
    zh: '拼音',
    py: 'pīnyīn, spelt sounds',
    blurb: 'The letters that do not sound like English.',
    parts: [
      {
        id: '3a',
        title: 'A puff of air',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'b or p?',
            text: 'In English, b and p differ in the voice. In Mandarin they differ in a puff of air. b, d and g have none, and to English ears sound halfway between b and p, d and t, g and k. p, t and k have a strong puff.\n\nHold a hand before your mouth. _pā_ should blow on it, and _bā_ hardly at all.',
            show: {
              k: 'sounds',
              rows: [
                ['bā', 'pā'],
                ['dā', 'tā'],
                ['gē', 'kē'],
              ],
            },
          },
          {
            k: 'ear',
            title: 'Which do you hear?',
            n: 8,
            contrasts: ['b-p', 'd-t', 'g-k'],
          },
          {
            k: 'read',
            title: 'He, she and they',
            text: '他 he and 她 she are both _tā_, with that puff of air. Spoken Chinese does not tell them apart. 们 after a person makes a group: 我们 we, 你们 you all, 他们 they.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                w('他', 'he'),
                w('她', 'she'),
                w('我们', 'we'),
                w('你们', 'you all'),
                w('他们', 'they'),
              ],
            },
          },
          { k: 'meet', ids: ['他', '她', '我们', '你们', '他们'] },
          { k: 'quiz', ids: ['他', '她', '我们', '你们', '他们'] },
        ],
      },
      {
        id: '3b',
        title: 'j, q, x and their neighbours',
        minutes: 5,
        screens: [
          {
            k: 'read',
            title: 'j, q and x',
            text: 'The tip of the tongue stays down behind the lower teeth, and the lips spread as in a smile. j is close to the j of "jeep", q to the ch of "cheese", and x lies between s and sh.',
            show: { k: 'sounds', rows: [['jī', 'qī', 'xī']] },
          },
          {
            k: 'read',
            title: 'zh, ch, sh and r',
            text: 'The tip of the tongue curls up and back. zh is close to the j of "jerk", ch to the ch of "church" and sh to the sh of "shirt". r lies between the s of "pleasure" and an English r.',
            show: { k: 'sounds', rows: [['zhī', 'chī', 'shī', 'rì']] },
          },
          {
            k: 'read',
            title: 'z, c and s',
            text: 'The tip of the tongue sits behind the upper front teeth. z is like the ds of "beds", c like the ts of "cats", and s as in "see".\n\nAfter all seven, zh ch sh r z c s, the i is not "ee". The consonant is held on and buzzes. 是 _shì_ is not "she", and 四 _sì_, four, is not "see".',
            show: {
              k: 'sounds',
              rows: [
                ['zī', 'cī', 'sī'],
                ['shì', 'sì', 'xī'],
              ],
            },
          },
          {
            k: 'ear',
            title: 'Which do you hear?',
            n: 8,
            contrasts: ['zh-z-j', 'ch-c-q', 'sh-s-x'],
          },
        ],
        more: { href: '#pinyin', label: 'The pinyin chart' },
      },
      {
        id: '3c',
        title: 'Vowels',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'ü',
            text: 'Say "ee", then round your lips as for "oo" without moving your tongue. That is ü, as in German. After j, q, x and y the dots are left off, but the sound is still ü: 去 _qù_, to go.',
            show: {
              k: 'sounds',
              rows: [
                ['nǔ', 'nǚ'],
                ['lù', 'lǜ'],
                ['wú', 'yú'],
              ],
            },
          },
          {
            k: 'read',
            title: 'e, and a few short spellings',
            text: 'e is not the e of "bed". It is closer to "uh", said far back in the mouth, as in 喝 _hē_, to drink.\n\nSome spellings are short for more. ui is said close to "way", as in 对 _duì_, right. iu is close to "yo", as in 六 _liù_, six. ian is close to "yen", as in 天 _tiān_, day.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                w('喝', 'to drink'),
                w('对', 'right'),
                w('六', 'six'),
                w('天', 'day'),
              ],
            },
          },
          {
            k: 'ear',
            title: 'Which do you hear?',
            n: 6,
            contrasts: ['u-ü', 'ie-üe', 'an-ang'],
          },
          {
            k: 'read',
            title: 'The hard part is done',
            text: 'Those are the sounds English does not have. The pinyin chart has all of them, each with how to say it, and lets you record yourself beside the voice.',
          },
        ],
        more: { href: '#pinyin', label: 'The pinyin chart' },
      },
    ],
  },
  {
    n: 4,
    title: 'First sentences',
    zh: '句子',
    py: 'jùzi, sentences',
    blurb: 'Word order, questions, and verbs that never change.',
    parts: [
      {
        id: '4a',
        title: 'Who does what',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'The order of English',
            text: 'A plain sentence goes as in English: who, does, what. A country and 人, person, make a nationality, so 中国人 is a Chinese person.',
            show: { k: 'lines', zh: ['我 是=am {home} 人 。'] },
          },
          {
            k: 'read',
            title: 'Verbs never change',
            text: '是 is am, is and are: 我是, 你是, 他是. No verb changes for who does it, or for when. Time is told by words such as 明天, tomorrow.',
            show: { k: 'lines', zh: ['我 是 老师 。', '他 是 老师 。'] },
          },
          {
            k: 'read',
            title: 'No plurals',
            text: 'A noun stays as it is, one or many. 老师 is a teacher, or teachers, and a number or the sense says how many. Only for people can 们 make a group, as in 我们, we, and 他们, they.',
            show: { k: 'lines', zh: ['他们 是 老师 。'] },
          },
          { k: 'meet', ids: ['人', '中国', '中文', '说'] },
          { k: 'quiz', ids: ['人', '中国', '中文', '说'] },
          {
            k: 'build',
            lines: ['我 是=am {home} 人 。', '我 会 说 一点 中文 。'],
          },
        ],
      },
      {
        id: '4b',
        title: 'Questions',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Add 吗',
            text: 'To ask a yes-or-no question, put 吗 at the end of a statement. Nothing else moves.',
            show: { k: 'lines', zh: ['你 会 说 中文 吗 ？'] },
          },
          {
            k: 'read',
            title: 'No word for yes',
            text: 'Chinese has no one word for yes or no. Answer with the verb of the question. Asked with 是, say 是 or 不是. Asked with 会, can, say 会 or 不会. 对, right, is a common yes too.',
            show: {
              k: 'lines',
              zh: [
                '他 是 中国 人 吗 ？',
                '是 ， 他 是 中国 人 。',
                '不 是 ， 他 是 美国 人 。',
              ],
            },
          },
          {
            k: 'read',
            title: 'Question words stay put',
            text: 'A question word sits where the answer will go, and the rest keeps its order. 你是哪国人 is "you are which country person?", and the answer puts your country in the same place. 你叫什么名字 is "you are called what name?"',
            show: {
              k: 'lines',
              zh: [
                '你 是 哪 国 人 ？',
                '我 是=am {home} 人 。',
                '你 叫 什么 名字 ？',
                '我 叫 小李 。',
              ],
            },
          },
          { k: 'meet', ids: ['吗', '哪', '什么', '叫', '会'] },
          { k: 'quiz', ids: ['吗', '哪', '什么', '叫', '会'] },
          {
            k: 'ask',
            q: 'Which one asks "Are you Chinese?"',
            zh: true,
            options: [
              '你 是 中国 人 吗 ？',
              '吗 你 是 中国 人 ？',
              '你 吗 是 中国 人 ？',
              '你 是 吗 中国 人 ？',
            ],
            note: '吗 goes at the very end, and the statement before it stays as it was.',
          },
        ],
      },
      {
        id: '4c',
        title: 'Describing',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'The description comes first',
            text: 'Whatever describes a thing comes before it, joined by 的: 我的护照, my passport, 你的中文, your Chinese.\n\nAn adjective needs no 是. "Your Chinese very good" is a whole sentence, with 很, very, linking the two. Often 很 says little more than "is".',
            show: { k: 'lines', zh: ['你 的 中文 很 好 ！'] },
          },
          { k: 'meet', ids: ['的', '很', '一点'] },
          { k: 'quiz', ids: ['的', '很', '一点'] },
          {
            k: 'build',
            lines: [
              '你 的 中文 很 好 ！',
              '请 给 我=me 你 的 护照 。',
              '你 会 说 中文 吗 ？',
            ],
          },
          {
            k: 'ask',
            q: 'How do you say "my passport"?',
            zh: true,
            options: ['我 的 护照', '护照 的 我', '我 护照 的', '的 我 护照'],
            note: 'Me first, then 的, then the passport, as an English "my passport".',
          },
        ],
        more: { href: '#order', label: 'More in Word order' },
      },
    ],
  },
  {
    n: 5,
    title: 'Numbers',
    zh: '数字',
    py: 'shùzì, numbers',
    blurb: 'One to ten, everything built from them, and measure words.',
    parts: [
      {
        id: '5a',
        title: 'One to ten',
        minutes: 5,
        screens: [
          {
            k: 'read',
            title: '一 to 十',
            text: 'Learn these ten by heart. Every bigger number is built from them.',
            show: {
              k: 'glyphs',
              small: true,
              items: ONE_TO_TEN.map((h) => w(h)),
            },
          },
          { k: 'meet', ids: ONE_TO_TEN.slice(0, 5) },
          { k: 'quiz', ids: ONE_TO_TEN.slice(0, 5) },
          { k: 'meet', ids: ONE_TO_TEN.slice(5) },
          { k: 'quiz', ids: ONE_TO_TEN.slice(5) },
        ],
      },
      {
        id: '5b',
        title: 'Up to a hundred',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Built as they are said',
            text: 'Eleven is ten-one, 十一. Twenty is two-ten, 二十, and twenty-five is two-ten-five, 二十五. Ninety-nine is 九十九, and a hundred is 一百.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                num('十一', 'ten + one'),
                num('二十', 'two × ten'),
                num('二十五', 'two × ten + five'),
                num('九十九', 'nine × ten + nine'),
                num('一百', 'one hundred'),
              ],
            },
          },
          {
            k: 'ask',
            q: 'What is 三十八?',
            options: ['38', '83', '308', '11'],
            note: '三 three, 十 ten, 八 eight: three tens and eight.',
          },
          {
            k: 'ask',
            q: 'Which is 64?',
            options: ['六十四', '四十六', '十六四', '六四十'],
            note: 'Six tens, then four: 六十四.',
          },
          {
            k: 'ear',
            title: 'Which number?',
            n: 6,
            numbers: [
              '十一',
              '十八',
              '二十',
              '二十五',
              '二十八',
              '三十',
              '四十五',
              '五十四',
              '五十八',
              '七十二',
              '八十九',
              '九十九',
            ],
          },
          {
            k: 'read',
            title: 'Room numbers',
            text: 'Room and phone numbers are read digit by digit, so room 806 is 八零六, _bā líng liù_. In phone numbers one is said _yāo_, so it is not heard as 七 _qī_.',
            show: { k: 'lines', zh: ['你 的 房间 在 八 楼 ， 八零六 号 。'] },
          },
        ],
        more: { href: '#numbers', label: 'More in Numbers' },
      },
      {
        id: '5c',
        title: 'Measure words',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'A word in between',
            text: 'Between a number and a thing goes a measure word. 个 _gè_ is the everyday one, for people and most things, so one person is 一个人. Others go with kinds of thing. 杯 is for cups and glasses, 张 for flat things such as tickets.',
            show: {
              k: 'glyphs',
              items: [
                w('个', 'the everyday one'),
                w('杯', 'for drinks'),
                w('张', 'for flat things'),
              ],
            },
          },
          {
            k: 'read',
            title: '两, not 二',
            text: 'Before a measure word, two is 两 _liǎng_: 两个人, two people, and 两个包子, two steamed buns. 二 is for counting, and inside bigger numbers such as 二十.',
            show: {
              k: 'lines',
              zh: [
                '一 个 人 ， 两 个 人 ， 三 个 人 。',
                '我 要 两 个 包子 ， 一 杯 豆浆 。',
              ],
            },
          },
          {
            k: 'read',
            title: 'How many?',
            text: '几 asks how many, when the answer is small, and it sits where the number would. 天, day, is counted without a measure word.',
            show: { k: 'lines', zh: ['好的 。 住 几 天 ？', '住 三 天 。'] },
          },
          { k: 'meet', ids: ['个', '两', '几', '包子'] },
          { k: 'quiz', ids: ['个', '两', '几', '包子'] },
          {
            k: 'ask',
            q: '我要＿个包子, I would like two buns. Which word fills the gap?',
            options: ['两', '二', '几', '个'],
            note: 'Two before a measure word is 两. 个 is already there, after it.',
          },
        ],
        more: { href: '#shop', label: 'Count at the dumpling stall' },
      },
    ],
  },
  {
    n: 6,
    title: 'Characters',
    zh: '汉字',
    py: 'hànzì, characters',
    blurb: 'Pictures, parts that give the meaning and the sound, and strokes.',
    parts: [
      {
        id: '6a',
        title: 'Pictures',
        minutes: 3,
        screens: [
          {
            k: 'read',
            title: 'Drawn from life',
            text: 'Some characters began as pictures, cut on bones and bronze over three thousand years ago. Brushes and print have squared them off since, but many still show what they were.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                pic('人'),
                pic('山'),
                pic('日'),
                pic('月'),
                pic('木'),
                pic('水'),
              ],
            },
          },
          {
            k: 'read',
            title: 'A few more',
            text: 'A mouth, a gate with two doors, a woman kneeling, a horse with its mane and legs, rain falling from the sky, a field cut into plots.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                pic('口'),
                pic('门'),
                pic('女'),
                pic('马'),
                pic('雨'),
                pic('田'),
              ],
            },
          },
          {
            k: 'ask',
            q: 'Which one is the mountain?',
            options: ['山', '水', '木', '月'],
            note: '山 _shān_, three peaks. 水 is water, 木 a tree and 月 the moon.',
          },
          {
            k: 'ask',
            q: '木 is a tree. What is 林, two trees?',
            options: ['A wood', 'A fire', 'A house', 'A fence'],
            note: 'Two trees make a wood, 林 _lín_.',
          },
          {
            k: 'read',
            title: 'Pictures put together',
            text: 'Pictures can be joined into an idea. Two trees are a wood, 林 _lín_, and three are a forest, 森 _sēn_. A person 亻 by a tree is 休 _xiū_, to rest.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                pic('木'),
                { h: '林', p: 'lín', m: 'wood', note: 'two trees', say: '林' },
                {
                  h: '森',
                  p: 'sēn',
                  m: 'forest',
                  note: 'three trees',
                  say: '森',
                },
                {
                  h: '休',
                  p: 'xiū',
                  m: 'to rest',
                  note: 'person + tree',
                  say: '休',
                },
              ],
            },
          },
        ],
        more: { href: '#parts', label: 'More in Character parts' },
      },
      {
        id: '6b',
        title: 'Meaning and sound',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Two halves',
            text: 'Most characters join two parts, one for the meaning and one for the sound. 妈 _mā_, mum, is 女 woman, with 马 _mǎ_, horse, for its sound.',
            show: { k: 'built', c: ['妈'] },
          },
          {
            k: 'read',
            title: 'The same sound part',
            text: '吗, the question word, is 口 mouth with 马: a sound you make. 码 _mǎ_, a code or a number, is 石 stone with 马. The tone may differ, but the sound part brings the syllable close.',
            show: { k: 'built', c: ['吗', '码'] },
          },
          {
            k: 'read',
            title: 'Parts you will see everywhere',
            text: '亻, a squeezed 人, is in 你 you, 他 he, and 们. 口 mouth is in 吃 to eat, 喝 to drink and 叫 to call. 氵, three drops of water, is in 河 river.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                w('你', 'you', '亻 person'),
                w('他', 'he', '亻 person'),
                w('吃', 'to eat', '口 mouth'),
                w('喝', 'to drink', '口 mouth'),
                w('河', 'river', '氵 water'),
              ],
            },
          },
          {
            k: 'ask',
            q: '妈 mā, 吗 ma and 码 mǎ. Which part gives them their sound?',
            options: ['马', '女', '口', '石'],
            note: '马 _mǎ_ gives each its sound. 女, 口 and 石 give the meaning.',
          },
          {
            k: 'ask',
            q: '她, she, is 他, he, with 女 in place of 亻. What does 女 tell you?',
            options: [
              'That it is about a woman',
              'How it is said',
              'Its tone',
              'That it is a question',
            ],
            note: '女 is woman. 她 was made about a century ago, when written Chinese wanted a word for she. Both are said _tā_.',
          },
        ],
        more: { href: '#parts', label: 'More in Character parts' },
      },
      {
        id: '6c',
        title: 'Strokes',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Stroke by stroke',
            text: 'Characters are written in strokes, in a set order. Top before bottom, left before right, across before down. 十 is across, then down. 人 is the stroke to the left, then the one to the right. A box such as 口 is closed last, with the stroke along its bottom.',
            show: {
              k: 'glyphs',
              items: [
                { ...w('十', 'ten'), note: '2 strokes' },
                { ...w('人', 'person'), note: '2 strokes' },
                { ...pic('口'), note: '3 strokes' },
              ],
            },
          },
          {
            k: 'read',
            title: 'Reading before writing',
            text: 'Many learners read and type long before they write by hand. To type, you write the pinyin and pick the character. Writing a few by hand still helps to tell them apart, and Brush shows the strokes of every word you meet.',
          },
          { k: 'meet', ids: ['吃', '喝', '水', '茶'] },
          { k: 'quiz', ids: ['吃', '喝', '水', '茶'] },
        ],
        more: { href: '#write', label: 'Write them in Brush' },
      },
    ],
  },
  {
    n: 7,
    title: 'A first conversation',
    zh: '对话',
    py: 'duìhuà, conversation',
    blurb: 'Saying no, being modest, and into the trip.',
    parts: [
      {
        id: '7a',
        title: 'Saying no',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: '不 and 没',
            text: '不 _bù_ puts not before a verb or an adjective: 不好, not good, 不是, is not. 有, to have, is the one verb it never goes with. "Not have" is 没有 _méiyǒu_.',
            show: {
              k: 'lines',
              zh: ['我 不 是 中国 人 。', '我 没有 护照 。'],
            },
          },
          {
            k: 'read',
            title: 'Modest answers',
            text: 'Praise is usually turned aside. Told that your Chinese is very good, a usual answer is that it is not. A plain 谢谢 is fine too.',
            show: {
              k: 'lines',
              zh: ['你 的 中文 很 好 ！', '谢谢 ！ 我 的 中文 不 好 。'],
            },
          },
          {
            k: 'read',
            title: 'Sorry, and never mind',
            text: "对不起 is sorry, and the answer to it is 没关系, it doesn't matter. 对 alone is right, correct, and a common way to say yes.",
            show: {
              k: 'glyphs',
              items: [
                w('对不起', 'sorry'),
                w('没关系', "it's OK"),
                w('对', 'right'),
              ],
            },
          },
          { k: 'meet', ids: ['没有', '对', '对不起', '没关系'] },
          { k: 'quiz', ids: ['没有', '对', '对不起', '没关系'] },
        ],
      },
      {
        id: '7b',
        title: 'Into the trip',
        minutes: 5,
        screens: [
          {
            k: 'read',
            title: 'A scene',
            text: 'The trip goes from Beijing to Shanghai in scenes of talk. In each, someone speaks to you, and you pick what to say back from three replies. A wrong one tells you why. Before a scene starts you meet a few of its words.',
            show: {
              k: 'lines',
              zh: ['你好 ！', '请 给 我=me 你 的 护照 。', '好的 ， 给 你 。'],
            },
          },
          {
            k: 'ask',
            q: 'The officer says hello. What do you say?',
            zh: true,
            show: { k: 'lines', zh: ['你好 ！'] },
            options: ['你好 ！', '再见 ！', '谢谢 ！', '不客气 。'],
            note: 'Hello back. 再见 is goodbye, and there is nothing to thank for yet.',
          },
          {
            k: 'ask',
            q: 'He welcomes you to China. What do you say?',
            zh: true,
            show: { k: 'lines', zh: ['很 好 ！ 欢迎 你 来 中国 ！'] },
            options: ['谢谢 ！', '对不起 。', '没关系 。', '不客气 。'],
            note: 'Thank you. 对不起 is sorry and 没关系 answers one, while 不客气 answers a thank-you.',
          },
          {
            k: 'go',
            title: 'Passport control',
            text: 'Your first scene: Beijing Capital Airport, and an officer who waves you over. Come back here when you are through.',
            href: '#trip',
            label: 'Start the trip',
          },
        ],
      },
      {
        id: '7c',
        title: 'Keep going',
        minutes: 3,
        screens: [
          {
            k: 'read',
            title: 'Words fade, then stay',
            text: 'Each word you meet has a memory in your word bank. Just after you meet it, it fades within hours. Each time you get it right as it begins to fade, it lasts longer, from hours to days and then to weeks.\n\nSo ten minutes every day does more than an hour once a week.',
            show: { k: 'memory' },
          },
          {
            k: 'read',
            title: 'Ten minutes a day',
            text: 'Today, at the top of the home screen, makes your ten minutes for you. It has the words that are fading, a few new ones, a scene of the trip or a game, and a little listening. It is the one thing to do each day.',
          },
          {
            k: 'read',
            title: 'Where to go next',
            text: 'The trip goes on to Shanghai, with new words in every scene. Pinyin and Tones train your ear, Character parts and Brush your eye and hand. And any word you forget is a tap away, in every game.',
          },
        ],
      },
    ],
  },
]

export const PARTS: Array<Part> = COURSE.flatMap((d) => d.parts)
