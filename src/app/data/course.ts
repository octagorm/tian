import { numberPinyin, value } from '../lib/numbers.ts'
import { WORD } from './words.ts'
import { PICTURES, pictureArt } from './parts.ts'

// First steps (入门, rùmén, "in at the gate"): a course for someone new to
// Chinese, seven days of three short parts, to take a day at a time. It
// says how the language works (characters, tones, pinyin, word order,
// numbers) and how Tian shows it, and meets the first words on the way.
//
// A part is a few screens: something to read, with things to hear (`show`),
// words to meet and a quiz on them, a question, a round by ear, or a line
// to build. The parts can be taken in any order (lib/course.ts goes on
// from the one done last). Lines are the trip's, in its speakers' voices, or the
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
  // A pictograph's painting (data/parts.ts)
  art?: string
  // What is played, in the word voice
  say: string
}

export type Show =
  | { k: 'glyphs'; items: Array<Glyph>; small?: boolean }
  // A word taken apart: each character with its meaning, joined by +,
  // and the word (a word of the bank) with its meaning left to guess
  | { k: 'sum'; parts: Array<Glyph>; whole: string }
  // Words of the bank in simplified and traditional characters, with the
  // strokes of each
  | {
      k: 'forms'
      pairs: Array<{ s: string; t: string; strokes: [number, number] }>
    }
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
  return { h: c, p: p.p, m: m ?? p.m, art: pictureArt(p), say: c }
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
  '我 是=am 老师 。': 'I am a teacher.',
  '他 是 老师 。': 'He is a teacher.',
  '他们 是 老师 。': 'They are teachers.',
  '他 是 中国 人 吗 ？': 'Is he Chinese?',
  '是 ， 他 是 中国 人 。': 'Yes, he is Chinese.',
  '不 是 ， 他 是 美国 人 。': 'No, he is American.',
  '我 不 是 中国 人 。': 'I am not Chinese.',
  '你 叫 什么 名字 ？': 'What is your name?',
  '我 叫 小李 。': 'My name is Xiao Li.',
  '一 个 人 ， 两 个 人 ， 三 个 人 。':
    'One person, two people, three people.',
  '我 喝 茶 。': 'I drink tea.',
  '你 吃 什么 ？': 'What will you eat?',
}

// The order is the point: sounds before the words that need them, and few
// new words at a time, short ones first. Day 1 meets three greetings and
// day 2 single syllables (我, 你, 他); set phrases with a tone change and
// a light syllable in them (不客气, 对不起) wait for day 7, when the tones
// and the change of 不 are known. Each sentence pattern is met with the
// words it needs, and used in a line to build, and the week ends ready for
// the trip's first scene, passport control.
export const COURSE: Array<Day> = [
  {
    n: 1,
    title: 'Hello',
    zh: '你好',
    py: 'nǐ hǎo, hello',
    blurb: 'How characters work, and your first three words.',
    parts: [
      {
        id: '1a',
        title: 'Characters',
        minutes: 3,
        screens: [
          {
            k: 'read',
            title: 'One character, one syllable',
            text: 'Chinese is written in characters, 汉字 _hànzì_. Each is said as one syllable, and most carry a meaning of their own. Some began as pictures, like these.\n\nThere is no alphabet to spell words with, so characters are learnt one at a time. The commonest few hundred make up most of any page. Tap one to hear it.',
            show: { k: 'glyphs', items: [pic('人'), pic('山'), pic('口')] },
          },
          {
            k: 'read',
            title: 'Words of two or three',
            text: 'Most words are one or two characters, and the parts often explain the whole. 中 _zhōng_ is middle and 国 _guó_ is country, so 中国 is China, the Middle Kingdom. Add 人, person, and 中国人 is a Chinese person.',
            show: {
              k: 'glyphs',
              items: [
                w('中国', 'China', 'middle + country'),
                w('中文', 'Chinese', 'middle + writing'),
                {
                  h: '中国人',
                  p: 'Zhōng guó rén',
                  m: 'Chinese person',
                  note: 'middle + country + person',
                  say: '中国人',
                },
              ],
            },
          },
          {
            k: 'ask',
            q: 'A word taken apart, character by character. Put the meanings together: what is a 外国人?',
            show: {
              k: 'sum',
              whole: '外国人',
              parts: [
                { h: '外', p: 'wài', m: 'outside', say: '外' },
                w('国', 'country'),
                w('人', 'person'),
              ],
            },
            options: [
              'A foreigner',
              'A country house',
              'The countryside',
              'A passport',
            ],
            note: 'Someone from outside the country. The taxi driver in Beijing will ask if you are one.',
          },
        ],
      },
      {
        id: '1b',
        title: 'Hello, thank you, goodbye',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Pinyin',
            text: 'Above each character is its pinyin, 拼音 _pīnyīn_: the sound in Latin letters, with a mark for the tone. Day 2 is about the tones.\n\n你好 _nǐ hǎo_ is 你, you, and 好, good: hello. It suits anyone, at any time of day.',
            show: {
              k: 'glyphs',
              items: [
                w('你', 'you'),
                w('好', 'good'),
                w('你好', 'hello', 'you + good'),
              ],
            },
          },
          {
            k: 'read',
            title: 'Thank you and goodbye',
            text: '谢谢 _xièxie_ is thank you. The voice falls on the first 谢, and the second is short and light.\n\n再见 _zàijiàn_ is goodbye: 再 again and 见 see, as in "see you again". The voice falls on both.',
            show: {
              k: 'glyphs',
              items: [
                w('谢谢', 'thank you'),
                w('再见', 'goodbye', 'again + see'),
              ],
            },
          },
          { k: 'meet', ids: ['你好', '谢谢', '再见'] },
          { k: 'quiz', ids: ['你好', '谢谢', '再见'] },
          {
            k: 'ask',
            q: 'Someone holds a door open for you. What do you say?',
            zh: true,
            options: ['谢谢 ！', '你好 ！', '再见 ！'],
            note: '谢谢, thank you. 你好 is hello, and 再见 goodbye.',
          },
        ],
      },
      {
        id: '1c',
        title: 'How Tian shows words',
        minutes: 3,
        screens: [
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
          {
            k: 'read',
            title: 'In your word bank',
            text: 'Your three words are in your word bank now. Every game shares it, so a word learnt in one is known in all, and each game asks it again as it begins to fade.\n\nNext, the tones.',
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
    blurb: 'Four shapes of the voice, and the words for I, you, he and she.',
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
            text: 'Pinyin draws the tone over the vowel, in the shape the voice makes: ā á ǎ à. No mark means the neutral tone, short and light, like the second 谢 of 谢谢 _xièxie_.',
            show: {
              k: 'glyphs',
              items: [
                w('谢谢', 'thank you', '4th + neutral'),
                w('再见', 'goodbye', '4th + 4th'),
              ],
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
        title: 'I, you, he and she',
        minutes: 5,
        screens: [
          {
            k: 'read',
            title: 'Two third tones',
            text: 'You know 你好. Its halves are words too: 你 _nǐ_, you, and 好 _hǎo_, good, both third tones. When two third tones meet, the first is said as a second, so 你好 is said _ní hǎo_. Pinyin keeps the written marks.',
            show: {
              k: 'glyphs',
              items: [
                w('你', 'you'),
                w('好', 'good'),
                w('你好', 'hello', 'said ní hǎo'),
              ],
            },
          },
          {
            k: 'read',
            title: 'I, he and she',
            text: '我 _wǒ_, I or me, is a third tone as well. 他, he, and 她, she, are both _tā_, high and level, so you cannot hear which is meant. In writing, 她 has 女, woman, on its left.',
            show: {
              k: 'glyphs',
              small: true,
              items: [
                w('我', 'I, me'),
                w('你', 'you'),
                w('他', 'he'),
                w('她', 'she'),
              ],
            },
          },
          { k: 'meet', ids: ['我', '你', '好', '他', '她'] },
          { k: 'quiz', ids: ['我', '你', '好', '他', '她'] },
          {
            k: 'read',
            title: 'Words fade, then stay',
            text: 'Each word you meet has a memory in your word bank. Just after you meet it, it fades within hours. Each time you get it right as it begins to fade, it lasts longer, from hours to days and then to weeks.\n\nSo ten minutes every day does more than an hour once a week, and Today begins with the words that are fading.',
            show: { k: 'memory' },
          },
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
            title: 'We, you all, they',
            text: '他 and 她 start with that puff of air: _tā_. Put 们 _men_ after 我, 你 or 他, and it means more than one: 我们 we, 你们 you all, 他们 they. 们 is light, in the neutral tone.',
            show: {
              k: 'glyphs',
              items: [
                w('我们', 'we, us'),
                w('你们', 'you all'),
                w('他们', 'they'),
              ],
            },
          },
          { k: 'meet', ids: ['我们', '你们', '他们'] },
          { k: 'quiz', ids: ['我们', '你们', '他们'] },
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
            text: 'Those are the sounds English does not have. The pinyin chart has all of them, each with how to say it, and lets you record yourself beside the voice.\n\nNext, your first sentences.',
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
    blurb: 'Saying who you are, saying no, and asking.',
    parts: [
      {
        id: '4a',
        title: 'I am, you are',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Who, then what',
            text: 'A plain sentence goes as in English: who, then the verb, then the rest. 是 _shì_ joins two things, as am, is and are do.',
            show: { k: 'lines', zh: ['我 是=am 老师 。'] },
          },
          {
            k: 'read',
            title: 'Nothing changes',
            text: '是 is am, is and are alike: 我是, 他是, 他们是. A verb never changes for who does it, or for when. Nor does a noun change for how many: 老师 is a teacher, or teachers.',
            show: { k: 'lines', zh: ['他 是 老师 。', '他们 是 老师 。'] },
          },
          {
            k: 'read',
            title: 'Where you are from',
            text: 'A country and 人, person, make a nationality, as 中国人 did on day 1. Say yours with 是.',
            show: { k: 'lines', zh: ['我 是=am {home} 人 。'] },
          },
          { k: 'meet', ids: ['是', '人', '中国'] },
          { k: 'quiz', ids: ['是', '人', '中国'] },
          {
            k: 'build',
            lines: ['我 是=am {home} 人 。', '他们 是 老师 。'],
          },
        ],
      },
      {
        id: '4b',
        title: 'No, and questions',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: '不, not',
            text: '不 _bù_, not, goes before the verb. Before a fourth tone it is said _bú_, so 不是 is _búshì_. Tian writes it as it is said.',
            show: { k: 'lines', zh: ['我 不 是 中国 人 。'] },
          },
          {
            k: 'read',
            title: 'Add 吗',
            text: 'To ask a yes-or-no question, put 吗 _ma_ at the end of a statement. Nothing else moves.',
            show: { k: 'lines', zh: ['他 是 中国 人 吗 ？'] },
          },
          {
            k: 'read',
            title: 'No word for yes',
            text: 'Chinese has no one word for yes or no. Answer with the verb of the question: 是, or 不是.',
            show: {
              k: 'lines',
              zh: ['是 ， 他 是 中国 人 。', '不 是 ， 他 是 美国 人 。'],
            },
          },
          { k: 'meet', ids: ['不', '吗'] },
          { k: 'quiz', ids: ['不', '吗'] },
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
        title: 'Names and countries',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Question words stay put',
            text: 'A question word sits where the answer will go, and the rest keeps its order. 你是哪国人 is "you are which country person?" The answer puts your country in the same place.',
            show: {
              k: 'lines',
              zh: ['你 是 哪 国 人 ？', '我 是=am {home} 人 。'],
            },
          },
          {
            k: 'read',
            title: 'Your name',
            text: '叫 _jiào_ is to be called. 你叫什么名字 is "you are called what name?", and the answer is 我叫 and your name.',
            show: { k: 'lines', zh: ['你 叫 什么 名字 ？', '我 叫 小李 。'] },
          },
          { k: 'meet', ids: ['哪', '国', '叫', '什么'] },
          { k: 'quiz', ids: ['哪', '国', '叫', '什么'] },
          {
            k: 'build',
            lines: ['你 是 哪 国 人 ？', '你 叫 什么 名字 ？'],
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
          { k: 'meet', ids: ['个', '两', '几'] },
          { k: 'quiz', ids: ['个', '两', '几'] },
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
            text: 'A mouth, a doorway, a woman kneeling, a horse with its mane and legs, rain falling from the sky, a field cut into plots.',
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
        title: 'Writing',
        minutes: 5,
        screens: [
          {
            k: 'read',
            title: 'Stroke by stroke',
            text: 'Characters are written in strokes, in a set order. Top before bottom, left before right, across before down. 十 is across, then down. 人 is the stroke to the left, then the one to the right. A box such as 口 is closed last, with the stroke along its bottom.\n\nMany learners read and type long before they write by hand. To type, you write the pinyin and pick the character.',
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
            title: 'Simplified characters',
            text: 'Tian teaches simplified characters (简体字), the ones used in mainland China and Singapore. Taiwan, Hong Kong and Macau write the traditional forms (繁体字), often with many more strokes. The sound and the meaning are the same.\n\nMany characters, such as 人, 中 and 山, are written the same in both.',
            show: {
              k: 'forms',
              pairs: [
                { s: '国', t: '國', strokes: [8, 11] },
                { s: '学', t: '學', strokes: [8, 16] },
                { s: '说', t: '說', strokes: [9, 14] },
                { s: '马', t: '馬', strokes: [3, 10] },
                { s: '门', t: '門', strokes: [3, 8] },
                { s: '车', t: '車', strokes: [4, 7] },
                { s: '书', t: '書', strokes: [4, 10] },
                { s: '龙', t: '龍', strokes: [5, 16] },
              ],
            },
          },
          { k: 'meet', ids: ['吃', '喝', '水', '茶'] },
          { k: 'quiz', ids: ['吃', '喝', '水', '茶'] },
          { k: 'build', lines: ['我 喝 茶 。', '你 吃 什么 ？'] },
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
    blurb: 'Polite replies, a little Chinese, and into the trip.',
    parts: [
      {
        id: '7a',
        title: 'Thanks and sorry',
        minutes: 4,
        screens: [
          {
            k: 'read',
            title: 'Two pairs',
            text: '谢谢 is answered with 不客气 _búkèqi_, "no need to be polite": you are welcome. 对不起 _duìbuqǐ_ is sorry, and the answer to it is 没关系 _méiguānxi_, it does not matter.\n\nIn 不客气, 不 is _bú_ before the fourth tone of 客, as in 不是. Learn each of these whole, as one word.',
            show: {
              k: 'glyphs',
              items: [
                w('谢谢', 'thank you'),
                w('不客气', "you're welcome"),
                w('对不起', 'sorry'),
                w('没关系', "it's OK"),
              ],
            },
          },
          { k: 'meet', ids: ['不客气', '对不起', '没关系'] },
          { k: 'quiz', ids: ['不客气', '对不起', '没关系'] },
          {
            k: 'ask',
            q: 'Someone says 谢谢 to you. What do you say?',
            zh: true,
            options: ['不客气 。', '没关系 。', '对不起 。', '再见 ！'],
            note: '不客气, you are welcome. 没关系 is the answer to 对不起.',
          },
          {
            k: 'ask',
            q: "You step on someone's foot. What do you say?",
            zh: true,
            options: ['对不起 。', '没关系 。', '不客气 。', '你好 ！'],
            note: '对不起, sorry. They may well answer 没关系.',
          },
        ],
      },
      {
        id: '7b',
        title: 'A little Chinese',
        minutes: 5,
        screens: [
          {
            k: 'read',
            title: 'Can you speak Chinese?',
            text: '会 _huì_ is can, for something learnt, such as a language. 说 _shuō_ is to speak, and 中文, which you saw on day 1, is Chinese. With 吗 at the end it is a question.',
            show: { k: 'lines', zh: ['你 会 说 中文 吗 ？'] },
          },
          {
            k: 'read',
            title: 'A little',
            text: '一点 _yìdiǎn_ is a little. 一 _yī_, one, changes like 不: it is _yì_ before the first three tones, and _yí_ before a fourth.',
            show: { k: 'lines', zh: ['我 会 说 一点 中文 。'] },
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
          { k: 'meet', ids: ['会', '说', '中文', '一点'] },
          { k: 'quiz', ids: ['会', '说', '中文', '一点'] },
          {
            k: 'build',
            lines: ['我 会 说 一点 中文 。', '你 会 说 中文 吗 ？'],
          },
        ],
      },
      {
        id: '7c',
        title: 'Into the trip',
        minutes: 3,
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
            q: 'The officer asks where you are from. What do you say?',
            zh: true,
            show: { k: 'lines', zh: ['你 是 哪 国 人 ？'] },
            options: [
              '我 是=am {home} 人 。',
              '我 叫 {home} 。',
              '我 是=am 中国 人 。',
            ],
            note: 'Your country, then 人. 叫 is for names.',
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
            k: 'read',
            title: 'Ten minutes a day',
            text: 'From here on, Today at the top of the home screen makes your ten minutes: the words that are fading, a few new ones, a scene of the trip or a game, and a little listening.\n\nPinyin and Tones train your ear, Character parts and Brush your eye and hand. Any word you forget is a tap away, in every game.',
          },
        ],
      },
    ],
  },
]

export const PARTS: Array<Part> = COURSE.flatMap((d) => d.parts)
