import type { Text } from '../reader.ts'

// A day in Beijing, in the words of the trip's first scenes

export const BEIJING: Text = {
  id: 'beijing',
  zh: '我在北京',
  pinyin: 'Wǒ zài Běijīng',
  en: 'In Beijing',
  by: 'Written for Tian',
  about:
    'A Norwegian learning Chinese spends a day in Beijing: breakfast, a taxi to the Great Wall and dumplings in the evening. Nearly every word is from the trip.',
  text: [
    [
      '我 是 挪威 人 。',
      '我 在#zai 北京 学 中文 。',
      '我 会 说 一点 中文 ， 也 会 看=read 一点 中文 。',
    ],
    [
      '今天 早上 七 点 ， 我 去 吃 早饭 。',
      '我 要 了#le 两 个 包子 和 一 杯 豆浆 。',
      '一共 八 块 钱 。',
      '不 贵 ， 很 便宜 ！',
    ],
    [
      '吃 了 早饭 ， 我 坐 出租车 去 长城 。',
      '师傅 问 我 ： “ 你 是 哪 国 人 ？ ”',
      '我 说 ： “ 我 是 挪威 人 。 ”',
      '师傅 说 ： “ 挪威 ！ 你 的#de 中文 很 好 ！ ”',
      '我 很 高兴 。',
    ],
    [
      '长城 很 长 ， 也 很 美 。',
      '长城 上=on 人 很 多 。',
      '我 给#gei 妈妈 发 了 一 张 照片 。',
    ],
    [
      '晚上 ， 我 很 累 ， 也 很 饿 。',
      '我 去 饭店 吃 饺子 ， 喝 了 一 瓶 啤酒 。',
      '饺子 真 好吃 ！',
      '我 喜欢 北京 。',
      '明天 我 想 去 天安门 。',
    ],
  ],
  notes: {
    zai: '在 before a place says where something happens: 我在北京学中文, I study Chinese in Beijing.',
    le: '了 after a verb: it is done. 我要了两个包子, I ordered two steamed buns.',
    de: 'X 的 Y is X’s Y: 你的中文, your Chinese.',
    gei: '给 before a person: to, for. 我给妈妈发了一张照片, I sent Mum a photo.',
  },
}
