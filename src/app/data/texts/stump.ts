import type { Text } from '../reader.ts'

// 守株待兔, from the Han Feizi (49, 五蠹), told simply

export const STUMP: Text = {
  id: 'stump',
  zh: '守株待兔',
  pinyin: 'Shǒu zhū dài tù',
  en: 'Waiting by the tree',
  by: 'A fable from the Han Feizi, 3rd century BC',
  about:
    'A farmer has a stroke of luck one day and decides to wait for it to come again. Han Fei told it against rulers who govern by the ways of the past. Its four characters became a saying.',
  text: [
    [
      '很 久 以前 ， 有 一 个 农民 。',
      '他 每天 都 在 田 里=in 工作 ， 非常 累 。',
      '他 的 田 里=in 有 一 棵 树 。',
    ],
    [
      '有 一 天 ， 有 兔子 跑 来 ， 撞 在 树 上=on ， 死 了 。',
      '农民 很 高兴 。',
      '他 带 兔子 回 家 ， 晚上 吃 了 兔子 肉 。',
    ],
    [
      '他 想 ： “ 这 太 好 了 ！ 我 不用 工作 了#le 。',
      '我 每天 在 树 下=under 等 兔子 ， 就 可以 了 。 ”',
    ],
    [
      '从#cong 那 天 以后 ， 他 不 在 田 里=in 工作 了 。',
      '他 每天 坐 在 树 下=under ， 等 兔子 来 。',
      '一 天 ， 两 天 ， 一 个 星期 …',
      '但是 ， 兔子 没有 再 来 。',
    ],
    [
      '他 的 田 里=in 都 是 草 。',
      '别的 人 都 笑 他 。',
      '这 就 是 “ 守株待兔 ” 。',
      '别 只 等 好 事 来 找=find 你 ！',
    ],
  ],
  notes: {
    le: '了 at the end of a sentence: something has changed. 我不用工作了, now I don’t have to work any more.',
    cong: '从…以后: from … on. 从那天以后, from that day on.',
  },
}
