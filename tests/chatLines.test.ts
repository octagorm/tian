import { describe, expect, test } from 'vitest'
import {
  begin,
  heard,
  interrupted,
  said,
  show,
  turnEnd,
  typed,
} from '../src/app/lib/chatLines'
import type { Line } from '../src/app/lib/chatLines'

const sound = () => new Float32Array(10)
const items = (s: string) => s.split('|').map((w) => ({ w }))
// Each line as who: what it shows
const view = (ls: Array<Line>) =>
  ls
    .map(
      (l) =>
        `${l.who === 'learner' ? 'L' : 'P'}: ${l.toks ? l.toks.map((t) => t.h).join('') : l.text}`,
    )
    .filter((v) => !v.endsWith(': '))

describe('chat lines', () => {
  test('show_line in a turn of its own, then the voice: one line', () => {
    let ls: Array<Line> = []
    ls = show(ls, { said: items('你好|！|你好|吗|？'), said_en: 'Hi' })
    ls = turnEnd(ls, null)
    ls = said(ls, '你好！你好吗？')
    ls = turnEnd(ls, sound())
    expect(view(ls)).toEqual(['P: 你好！你好吗？'])
    expect(ls[0].sound).toBeTruthy()
  })

  test('Talk held: the learner heard late, and by show_line, is one line before the answer', () => {
    let ls: Array<Line> = [
      { who: 'partner', text: '你好吗？', done: true, over: true },
    ]
    ls = begin(ls)
    ls = said(ls, '今天')
    ls = show(ls, {
      heard: items('你好|。'),
      said: items('今天|你|好|吗|？'),
      said_en: 'How are you today?',
    })
    ls = heard(ls, '你好', true)
    ls = turnEnd(ls, sound())
    ls = said(ls, '你好吗？')
    ls = turnEnd(ls, sound())
    expect(view(ls)).toEqual(['P: 你好吗？', 'L: 你好。', 'P: 今天你好吗？'])
    expect(ls[2].sound?.length).toBe(20)
  })

  test('a pause ends the turn: the transcript goes before the answer it began', () => {
    let ls: Array<Line> = [
      { who: 'partner', text: '你好吗？', done: true, over: true },
    ]
    ls = heard(ls, '我', false)
    ls = said(ls, '太好了')
    ls = heard(ls, '很好', false)
    ls = turnEnd(ls, sound())
    ls = heard(ls, '你呢？', false)
    ls = said(ls, '我也很好')
    ls = turnEnd(ls, null)
    ls = said(ls, '。')
    ls = turnEnd(ls, sound())
    expect(view(ls)).toEqual([
      'P: 你好吗？',
      'L: 我很好',
      'P: 太好了',
      'L: 你呢？',
      'P: 我也很好。',
    ])
  })

  test('a call after the voice goes on the line spoken', () => {
    let ls: Array<Line> = [{ who: 'learner', text: '你好', done: true }]
    ls = said(ls, '你好')
    ls = turnEnd(ls, sound())
    ls = show(ls, { said: items('你好|！'), heard: items('你好') })
    expect(view(ls)).toEqual(['L: 你好', 'P: 你好！'])
  })

  test('spoken over, or typed: the next is a line of its own', () => {
    let ls: Array<Line> = []
    ls = said(ls, '你好')
    ls = interrupted(ls)
    ls = heard(ls, '等一下', false)
    ls = said(ls, '好')
    ls = typed(ls, '谢谢')
    ls = said(ls, '不客气')
    expect(view(ls)).toEqual([
      'P: 你好',
      'L: 等一下',
      'P: 好',
      'L: 谢谢',
      'P: 不客气',
    ])
  })
})
