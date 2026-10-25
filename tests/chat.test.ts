import { describe, expect, test } from 'vitest'
import { join } from '../src/app/lib/pinyin'
import { emptyBank, known, newCard } from '../src/app/lib/bank'
import {
  SCENES,
  SHOW_LINE,
  fromBase64,
  fromItems,
  idsIn,
  instructions,
  segment,
  toBase64,
  wordsKnown,
} from '../src/app/lib/chat'
import type { Token } from '../src/app/lib/text'

const shown = (toks: Array<Token>) =>
  toks.map((t) => (t.outside ? `[${t.h}]` : t.h)).join(' ')

describe('chat: lines as tokens', () => {
  test('a transcript is split into the longest words of the bank', () => {
    const toks = segment('你好！今天你想吃什么？')
    expect(shown(toks)).toBe('你好 ！ 今天 你 想 吃 什么 ？')
    expect(toks.filter((t) => !t.punct).every((t) => t.id)).toBe(true)
  })

  test('what is not in the bank is outside it, in runs', () => {
    const toks = segment('我要榴莲')
    expect(shown(toks)).toBe('我 要 [榴莲]')
    expect(toks[2]).toMatchObject({ outside: true, pinyin: [], gloss: '' })
  })

  test('numbers are one word, English is kept as it is', () => {
    expect(shown(segment('三百五十块'))).toBe('三百五十 块')
    expect(shown(segment('OK，我们走吧'))).toBe('OK ， 我们 走 吧')
    expect(segment('OK')[0]).toMatchObject({ h: 'OK', punct: true })
    expect(shown(segment('Thank you! 谢谢'))).toBe('Thank you ! 谢谢')
  })

  test("the partner's words: the bank's pinyin and gloss, in context", () => {
    const toks = fromItems([
      { w: '不客气', p: 'bú kè qi', e: "you're welcome" },
      { w: '！' },
    ])
    expect(toks[0].id).toBe('不客气')
    expect(join(toks[0].pinyin)).toBe('búkèqi')
    expect(toks[1].punct).toBe(true)
  })

  test('a phrase of bank words is shown as those words', () => {
    const toks = fromItems([{ w: '猪肉饺子', p: 'zhū ròu jiǎo zi' }])
    expect(shown(toks)).toBe('猪肉 饺子')
  })

  test("a word outside the bank keeps the partner's pinyin and English", () => {
    const [t] = fromItems([{ w: '韭菜', p: 'jiǔ cài', e: 'chives' }])
    expect(t).toMatchObject({
      h: '韭菜',
      outside: true,
      gloss: 'chives',
      pinyin: ['jiǔ', 'cài'],
    })
    expect(t.id).toBeUndefined()
  })

  test('punctuation stuck to a word is split from it', () => {
    expect(
      shown(fromItems([{ w: '你好！' }, { w: '韭菜。', e: 'chives' }])),
    ).toBe('你好 ！ [韭菜] 。')
    expect(fromItems([{ w: '韭菜。', e: 'chives' }])[0].gloss).toBe('chives')
  })

  test('empty and odd items are dropped', () => {
    expect(fromItems([{ w: '' }, { w: '  ' }])).toEqual([])
  })

  test('the ids of a line, numbers by their parts', () => {
    expect(idsIn(segment('我要三百五十'))).toEqual(
      expect.arrayContaining(['我', '要', '三', '百', '五', '十']),
    )
  })
})

describe('chat: the instructions', () => {
  const now = 1_800_000_000_000
  test('the words are listed by how far on they are', () => {
    const bank = emptyBank()
    bank.cards['你好'] = known(now)
    bank.cards['谢谢'] = newCard(now)
    const k = wordsKnown(bank, now)
    expect(k.known).toContain('你好')
    expect(k.learning).toContain('谢谢')
    expect(k.next).not.toContain('你好')
    expect(k.next.length).toBe(20)
  })

  test('the scene, the pace, the learner, the tool', () => {
    const text = instructions(emptyBank(), now, {
      scene: SCENES[2],
      pace: 'slow',
      home: 'Norway',
    })
    expect(text).toContain(SCENES[2].brief)
    expect(text).toContain('from Norway')
    expect(text).toContain('slowly')
    expect(text).toContain('beginner')
    expect(text).toContain(SHOW_LINE.name)
    expect(text).not.toContain('taking it up again')
  })

  test('a call taken up again has the conversation so far', () => {
    const text = instructions(emptyBank(), now, {
      scene: SCENES[0],
      pace: 'natural',
      home: 'Norway',
      history: [
        { who: 'partner', text: '你好！' },
        { who: 'learner', text: '你好' },
      ],
    })
    expect(text).toContain('You: 你好！\nLearner: 你好')
  })
})

describe('chat: sound', () => {
  test('PCM goes to base64 and back', () => {
    const pcm = new Int16Array([0, 1, -1, 16384, -16384, 32767, -32768])
    const back = fromBase64(toBase64(pcm))
    expect([...back].map((v) => Math.round(v * 0x8000))).toEqual([...pcm])
  })

  test('a long piece of sound is encoded whole', () => {
    const pcm = new Int16Array(40_000).map((_, i) => (i * 7) % 3000)
    expect(fromBase64(toBase64(pcm)).length).toBe(40_000)
  })
})
