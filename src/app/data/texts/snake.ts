import type { Text } from '../reader.ts'

// 画蛇添足, from the Zhanguo ce (齐策二), told simply

export const SNAKE: Text = {
  id: 'snake',
  zh: '画蛇添足',
  pinyin: 'Huà shé tiān zú',
  en: 'Legs on the snake',
  by: 'A fable from the Zhanguo ce, the Strategies of the Warring States',
  about:
    'A few men have one bottle of wine between them, so they hold a race to draw a snake. In the book a strategist tells it to a general who has already won, to make him stop. Its four characters became a saying.',
  text: [
    [
      '很 久 以前 ， 一 个 老人 给 了 几 个 人 一 瓶 酒 。',
      '酒 不 多 ， 只 够 一 个 人 喝 。',
    ],
    [
      '一 个 人 说 ： “ 我们 都 在 地 上=on 画 一 条 蛇 。',
      '谁#shui 先 画 完 ， 谁 就 喝 这 瓶 酒 。 ”',
      '他们 都 说 ： “ 好 ！ ”',
    ],
    [
      '他们 开始 画 。',
      '一 个 人 很 快 就 画 完 了 。',
      '他 看 别的 人 ， 他们 还=still 没 画 完 。',
      '他 想 ： “ 他们 太 慢 了 ！ 我 还=still 有 时间 。',
      '我 给 蛇 画 几 条 腿 吧 。 ”',
    ],
    [
      '他 还=still 没 画 完 腿 ， 第二 个 人 画 完 了 蛇 。',
      '第二 个 人 说 ： “ 蛇 没有 腿 ！ 你 画 的#de 不 是 蛇 。',
      '这 瓶 酒 是 我 的 ！ ”',
      '然后 他 就 喝 了 那 瓶 酒 。',
    ],
    [
      '这 就 是 “ 画蛇添足 ” ：',
      '做 了 不 需要 做 的 事 ， 好 事 也 会 变成 坏=bad 事 。',
    ],
  ],
  notes: {
    shui: '谁…谁就…: whoever …, he …. 谁先画完，谁就喝, whoever finishes first drinks it.',
    de: 'A verb with 的 after it stands for the thing done: 你画的, what you drew.',
  },
}
