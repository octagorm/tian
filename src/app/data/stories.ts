// Stories: old tales told in simple Chinese, a sentence at a time, in
// mixed text like the trip, and played as a shadow-puppet play. Each
// sentence is written word by word (lib/text.ts) with its English and a
// cue: what happens on the screen while it is heard. After the story,
// three questions, the right answer first.

export const STORY_VOICE = 'Storyteller'

// Where a puppet goes and what it does, from this line on. `x` is across
// the screen (0–100), `y` up from the ground (0–100 of the screen's
// height); `far` pulls it back from the screen into a larger, softer
// shadow (0–1). It comes on walking from the side it faces away from,
// unless `from` says otherwise.
export interface Place {
  x?: number
  y?: number
  face?: 'l' | 'r'
  // What it does (paper/acts.ts): stand, bow, point, ride, fly, sleep…
  act?: string
  // A puppet to sit on
  ride?: string
  // A thing in its hand (paper/puppets.ts PROPS), or '' for nothing
  hold?: string
  far?: number
  size?: number
  z?: number
  from?: 'l' | 'r' | 'fade' | 'up' | 'down'
}

export interface Cue {
  // The scenery from this line on (paper/scenery.tsx), with a state after
  // a colon ('suns:1')
  set?: Array<string>
  on?: Record<string, Place>
  // Puppets that go, and how: 'id' walks on, 'id:l', 'id:r', 'id:run-r',
  // 'id:fade', 'id:up', 'id:down'
  off?: Array<string>
  // Who says the line, if not the storyteller
  by?: string
  // A next beat in the same line, `wait` seconds later
  then?: Cue
  wait?: number
}

export type Line = [string, string, Cue?]

export interface Story {
  id: string
  title: string
  zh: string
  blurb: string
  group: 'myth' | 'sage' | 'fable' | 'journey'
  // The puppets, by id, and the kind of each (paper/puppets.ts)
  cast?: Record<string, string>
  // The line whose stage the cover shows
  cover?: number
  lines: Array<Line>
  questions: Array<{ q: string; options: Array<string> }>
}

export const GROUPS: Array<{ id: Story['group']; title: string; zh: string }> =
  [
    { id: 'myth', title: 'Myths', zh: '神话' },
    { id: 'sage', title: 'Sages', zh: '圣贤' },
    { id: 'fable', title: 'Fables', zh: '寓言' },
    { id: 'journey', title: 'Journey to the West', zh: '西游' },
  ]

export const STORIES: Array<Story> = [
  {
    id: 'pangu',
    title: 'Pangu parts the sky from the earth',
    zh: '盘古开天',
    blurb: 'Before the world there was an egg, with a giant asleep inside it.',
    group: 'myth',
    cast: { pangu: 'giant' },
    cover: 2,
    lines: [
      [
        '很 久 以前 ， 没有=no 天=sky ， 也 没有=no 地 。',
        'Long ago there was no sky, and no earth.',
        { set: ['chaos'] },
      ],
      [
        '宇宙 像 一 个 大 鸡蛋 。',
        'The universe was like a big egg.',
        { set: ['chaos', 'egg'] },
      ],
      [
        '鸡蛋 里面 有 一 个 人 ， 他 叫 盘古 。',
        'Inside the egg was a man called Pangu.',
        {
          on: {
            pangu: {
              x: 50,
              y: 30,
              act: 'sleep',
              far: 0.25,
              size: 0.62,
              from: 'fade',
            },
          },
        },
      ],
      [
        '盘古 睡 了 一万八千 年 。',
        'Pangu slept for eighteen thousand years.',
        { set: ['chaos', 'egg', 'stars'] },
      ],
      [
        '有 一 天 ， 盘古 醒 了 。 他 打 了 一下=once ， 鸡蛋 开=open 了 ！',
        'One day Pangu woke up. He struck once, and the egg broke open!',
        {
          on: { pangu: { act: 'stand', far: 0, size: 0.9, y: 0 } },
          then: {
            wait: 1.8,
            set: ['chaos', 'egg:open'],
            on: { pangu: { act: 'swing' } },
          },
        },
      ],
      [
        '天=sky 在 上=above ， 地 在 下=below 。',
        'The sky was above, and the earth below.',
        {
          set: ['sky', 'earth'],
          on: { pangu: { act: 'raise', hold: '', size: 1.3 } },
        },
      ],
      [
        '天=sky 越来越 高 ， 盘古 也 越来越 高 。',
        'The sky rose higher and higher, and Pangu grew taller and taller.',
        {
          set: ['sky:high', 'earth'],
          on: { pangu: { act: 'push', size: 1.55 } },
        },
      ],
      [
        '一万八千 年 以后 ， 盘古 太 累 了 。',
        'Eighteen thousand years later, Pangu was worn out.',
        { on: { pangu: { act: 'tired', size: 1.5 } } },
      ],
      [
        '他 睡 了 ， 再 也 没有=not 醒 。',
        'He lay down to sleep, and never woke again.',
        { on: { pangu: { act: 'lie', x: 60, size: 1.1 } } },
      ],
      [
        '他 的 左 眼 变成 了 太阳 ， 右 眼 变成 了 月亮 。',
        'His left eye became the sun, and his right eye the moon.',
        { set: ['sky:high', 'earth', 'sun', 'moon'] },
      ],
      [
        '他 变成 了 山 和 河 。',
        'He became the mountains and the rivers.',
        {
          set: ['sun', 'moon', 'mountains', 'river'],
          off: ['pangu:fade'],
        },
      ],
      [
        '我们 的 世界 ， 就 是 盘古 。',
        'Our world is Pangu.',
        { set: ['sun', 'moon', 'mountains', 'river', 'clouds'] },
      ],
    ],
    questions: [
      {
        q: 'What was the universe like at first?',
        options: ['A big egg', 'A big river', 'A dark cave', 'A mountain'],
      },
      {
        q: 'How long did Pangu sleep?',
        options: [
          'Eighteen thousand years',
          'Eighteen years',
          'Eight hundred years',
          'A thousand years',
        ],
      },
      {
        q: 'What did his left eye become?',
        options: ['The sun', 'The moon', 'A star', 'A river'],
      },
    ],
  },
  {
    id: 'nuwa',
    title: 'Nüwa mends the sky',
    zh: '女娲补天',
    blurb: 'A hole in the heavens, and stones of five colours to fill it.',
    group: 'myth',
    cast: { man: 'villager', woman: 'villager2', nuwa: 'nuwa' },
    cover: 6,
    lines: [
      [
        '很 久 以前 ， 有 一 个 神 ， 她 叫 女娲 。',
        'Long ago there was a goddess called Nüwa.',
        {
          set: ['hills', 'clouds'],
          on: { nuwa: { x: 46, act: 'float', from: 'fade' } },
        },
      ],
      [
        '女娲 做=made 了 很 多 人 ， 她 很 爱 他们 。',
        'Nüwa made many people, and she loved them.',
        {
          on: {
            nuwa: { x: 34, act: 'offer' },
            man: { x: 60, face: 'l', size: 0.8, from: 'fade' },
            woman: { x: 72, face: 'l', size: 0.76, from: 'fade' },
          },
        },
      ],
      [
        '有 一 天 ， 天=sky 上=above 有 了 一 个 大 洞 ！',
        'One day a great hole opened in the sky!',
        {
          set: ['hills', 'hole'],
          on: {
            nuwa: { act: 'look' },
            man: { act: 'fear' },
            woman: { act: 'fear' },
          },
        },
      ],
      [
        '雨 很 大 ， 地 上=on 都 是 水 。',
        'The rain poured down, and water covered the earth.',
        { set: ['hole', 'rain', 'flood'] },
      ],
      [
        '人 都 很 怕 。 他们 说 ： “ 女娲 ， 帮 我们 ！ ”',
        'The people were terrified. They cried: "Nüwa, help us!"',
        {
          by: 'man',
          on: { man: { act: 'raise' }, woman: { act: 'weep' } },
        },
      ],
      [
        '女娲 找=found 了 红色 、 黄色 、 蓝色 、 白色 和 黑色 的 石头 。',
        'Nüwa found stones: red, yellow, blue, white and black.',
        {
          set: ['hole', 'rain', 'flood', 'stones'],
          on: { nuwa: { act: 'present' } },
        },
      ],
      [
        '她 用 石头 补 了 天=sky 上=above 的 洞 。',
        'With the stones she mended the hole in the sky.',
        {
          on: { nuwa: { act: 'mend', x: 42, y: 24 } },
          then: {
            wait: 1.6,
            set: ['hole:mended', 'rain', 'flood', 'stones:used'],
          },
        },
      ],
      [
        '天=sky 好 了 ， 雨 也 停 了 。',
        'The sky was whole again, and the rain stopped.',
        {
          set: ['hills', 'sun', 'clouds'],
          on: {
            nuwa: { act: 'float', y: 0, x: 34 },
            man: { act: 'look' },
            woman: { act: 'look' },
          },
        },
      ],
      [
        '人 都 很 高兴 。',
        'The people were all very happy.',
        { on: { man: { act: 'cheer' }, woman: { act: 'cheer' } } },
      ],
      [
        '下雨 以后 ， 你 看 天=sky 上=above ： 那 是 女娲 的 石头 ！',
        "After the rain, look at the sky: those are Nüwa's stones!",
        {
          set: ['hills', 'rainbow', 'clouds'],
          on: {
            nuwa: { act: 'pointUp' },
            man: { act: 'look' },
            woman: { act: 'wave' },
          },
        },
      ],
    ],
    questions: [
      {
        q: 'What opened in the sky?',
        options: ['A great hole', 'A door', 'A dragon’s mouth', 'A river'],
      },
      {
        q: 'What did Nüwa mend the sky with?',
        options: [
          'Stones of five colours',
          'Clouds',
          'Her own robe',
          'Water from the river',
        ],
      },
      {
        q: 'What does the story say a rainbow is?',
        options: [
          "Nüwa's stones",
          "Nüwa's hair",
          'A dragon',
          'A bridge to heaven',
        ],
      },
    ],
  },
  {
    id: 'houyi',
    title: 'Hou Yi shoots down the suns',
    zh: '后羿射日',
    blurb: 'Ten suns burn the earth at once, and an archer takes aim.',
    group: 'myth',
    cast: { man: 'villager', woman: 'villager2', houyi: 'archer' },
    cover: 7,
    lines: [
      [
        '很 久 以前 ， 天=sky 上=above 有 十 个 太阳 。',
        'Long ago there were ten suns in the sky.',
        { set: ['suns', 'hills', 'river'] },
      ],
      [
        '十 个 太阳 每 天 只 出来 一 个 。',
        'Each day, only one of the ten suns came out.',
        {
          set: ['suns:home', 'hills', 'river'],
          on: {
            man: { x: 64, face: 'l' },
            woman: { x: 77, face: 'l' },
          },
        },
      ],
      [
        '有 一 天 ， 十 个 太阳 一起 出来 了 ！',
        'One day, all ten suns came out together!',
        {
          set: ['suns', 'hills', 'river'],
          on: { man: { act: 'look' }, woman: { act: 'fear' } },
        },
      ],
      [
        '天气 太 热 了 ， 河 都 没有=lacked 水 了 。',
        'It was far too hot, and the rivers ran dry.',
        {
          set: ['suns', 'hills', 'river:dry'],
          on: { man: { act: 'tired' }, woman: { act: 'tired' } },
        },
      ],
      [
        '有 一 个 好汉 ， 叫 后羿 。 他 很 厉害 。',
        'There was a hero called Hou Yi, and he was formidable.',
        { on: { houyi: { x: 30, act: 'boast' } } },
      ],
      [
        '后羿 说 ： “ 太阳 ， 请 你们 回 家 吧 ！ ”',
        'Hou Yi said: "Suns, please go home!"',
        { by: 'houyi', on: { houyi: { act: 'pointUp' } } },
      ],
      [
        '太阳 都 不 听 。 后羿 很 生气 。',
        'The suns would not listen. Hou Yi grew angry.',
        { on: { houyi: { act: 'angry' } } },
      ],
      [
        '他 打 下 了 一 个 太阳 ， 两 个 太阳 ， 三 个 太阳 … …',
        'He shot down one sun, two suns, three suns…',
        {
          set: ['suns:7', 'hills', 'river:dry'],
          on: { houyi: { act: 'shoot' } },
        },
      ],
      [
        '最后 ， 天=sky 上=above 只 有 一 个 太阳 了 。',
        'In the end, only one sun was left in the sky.',
        { set: ['suns:1', 'hills', 'river:dry'] },
      ],
      [
        '这个=this 太阳 很 怕 ， 每 天 早上 出来 ， 晚上 回 家 。',
        'That sun was frightened: every day it comes out in the morning, and goes home at night.',
        {
          set: ['suns:1', 'hills', 'river'],
          on: {
            houyi: { act: 'stand' },
            man: { act: 'stand' },
            woman: { act: 'look' },
          },
        },
      ],
      [
        '人 都 说 ： “ 后羿 ， 你 真 是 好汉 ！ ”',
        'Everyone said: "Hou Yi, you are a true hero!"',
        {
          by: 'man',
          on: {
            man: { act: 'bow' },
            woman: { act: 'bow' },
            houyi: { act: 'bow' },
          },
        },
      ],
    ],
    questions: [
      {
        q: 'At first, how many suns came out each day?',
        options: ['One', 'Ten', 'Two', 'None'],
      },
      {
        q: 'What did Hou Yi ask the suns?',
        options: [
          'To go home',
          'To shine brighter',
          'To come down and fight',
          'To fill the rivers',
        ],
      },
      {
        q: 'How many suns did he leave in the sky?',
        options: ['One', 'None', 'Two', 'Nine'],
      },
    ],
  },
  {
    id: 'change',
    title: "Chang'e flies to the moon",
    zh: '嫦娥奔月',
    blurb: 'Ten suns, an archer, and the medicine that does not let you die.',
    group: 'myth',
    cast: {
      man: 'villager',
      change: 'lady',
      houyi: 'archer',
      queen: 'queen',
      rabbit: 'rabbit',
    },
    cover: 7,
    lines: [
      [
        '很 久 以前 ， 天=sky 上=above 有 十 个 太阳 。',
        'Long ago there were ten suns in the sky.',
        { set: ['suns', 'hills'] },
      ],
      [
        '天气 太 热 了 ， 人 都 很 累 。',
        'It was far too hot, and everyone was worn out.',
        { on: { man: { x: 68, face: 'l', act: 'tired' } } },
      ],
      [
        '有 一 个 好汉 ， 叫 后羿 。 他 打 下 了 九 个 太阳 。',
        'There was a hero called Hou Yi. He shot down nine of the suns.',
        {
          set: ['suns:1', 'hills'],
          on: { houyi: { x: 34, act: 'shoot' } },
        },
      ],
      [
        '后羿 的 妻子 叫 嫦娥 。',
        "Hou Yi's wife was called Chang'e.",
        {
          off: ['man'],
          on: {
            houyi: { act: 'stand', x: 40, face: 'l' },
            change: { x: 20, from: 'l' },
          },
        },
      ],
      [
        '神 给 了 后羿 一点 药 。 吃 了 这个=this 药 ， 人 可以 不 死 。',
        'A god gave Hou Yi some medicine. Whoever takes it does not die.',
        {
          set: ['hills', 'clouds'],
          on: {
            queen: {
              x: 70,
              y: 14,
              face: 'l',
              from: 'fade',
              far: 0.25,
              act: 'offer',
              hold: 'pill',
            },
            houyi: { act: 'bow', face: 'r' },
          },
          then: {
            wait: 2.4,
            on: {
              queen: { act: 'stand', hold: '' },
              houyi: { act: 'hold', hold: 'pill' },
            },
          },
        },
      ],
      [
        '有 一 天 ， 嫦娥 吃 了 药 。',
        "One day, Chang'e took the medicine.",
        {
          off: ['queen:fade', 'houyi:l'],
          on: { change: { x: 46, act: 'eat', hold: 'pill' } },
        },
      ],
      [
        '她 飞 啊 飞 ， 飞 到 了 月亮 上=on 。',
        'She flew and flew, all the way up to the moon.',
        {
          set: ['moon', 'clouds'],
          on: { change: { act: 'fly', x: 64, y: 36, hold: '' } },
        },
      ],
      [
        '现在 ， 嫦娥 住 在 月亮 上=on ， 和 她 的 兔子 一起 。',
        "Now Chang'e lives on the moon, together with her rabbit.",
        {
          on: {
            change: { act: 'float', x: 66, y: 30, size: 0.85 },
            rabbit: { x: 85, y: 50, from: 'fade', act: 'hop', face: 'l' },
          },
        },
      ],
      [
        '中国 去 月亮 的 飞船 ， 也 叫 嫦娥 ！',
        "China's spacecraft to the moon are called Chang'e too!",
        { set: ['moon', 'clouds', 'probe'] },
      ],
    ],
    questions: [
      {
        q: 'How many suns were there at first?',
        options: ['Ten', 'Nine', 'Two', 'One'],
      },
      {
        q: 'Who shot the suns down?',
        options: ['Hou Yi', "Chang'e", 'Sun Wukong', 'Laozi'],
      },
      {
        q: "Who lives with Chang'e on the moon?",
        options: ['A rabbit', 'A panda', 'A dragon', 'Hou Yi'],
      },
    ],
  },
  {
    id: 'niulang',
    title: 'The cowherd and the weaver girl',
    zh: '牛郎织女',
    blurb:
      'Two lovers on either side of the Milky Way, and the birds that bring them together.',
    group: 'myth',
    cast: {
      ox: 'ox',
      niulang: 'cowherd',
      boy: 'child',
      girl: 'girl',
      zhinu: 'weaver',
      queen: 'queen',
    },
    cover: 12,
    lines: [
      [
        '很 久 以前 ， 有 一 个 年轻 人 ， 他 叫 牛郎 。',
        'Long ago there was a young man called Niulang, the cowherd.',
        { set: ['hills', 'willow', 'house'], on: { niulang: { x: 40 } } },
      ],
      [
        '牛郎 的 好 朋友 ， 是 他 的 牛 。',
        "Niulang's good friend was his ox.",
        {
          on: {
            ox: { x: 66, face: 'l', from: 'r', act: 'graze' },
            niulang: { act: 'offer' },
          },
        },
      ],
      [
        '天=heaven 上=above 有 一 个 神 ， 她 叫 织女 。',
        'In heaven lived a goddess called Zhinü, the weaver girl.',
        {
          set: ['hills', 'willow', 'house', 'clouds'],
          on: {
            zhinu: { x: 80, y: 44, from: 'up', act: 'float', face: 'l' },
          },
        },
      ],
      [
        '织女 来 到 地 上=on ， 认识=met 了 牛郎 。',
        'Zhinü came down to earth and met Niulang.',
        {
          on: {
            zhinu: { x: 60, y: 0, act: 'stand' },
            niulang: { act: 'bow' },
            ox: { x: 80, act: 'graze' },
          },
        },
      ],
      [
        '他们 结婚 了 ， 有 了 两 个 孩子 。',
        'They married, and had two children.',
        {
          on: {
            niulang: { x: 34, act: 'stand' },
            zhinu: { x: 64, act: 'stand' },
            boy: { x: 45, from: 'fade' },
            girl: { x: 53, from: 'fade', face: 'l' },
          },
        },
      ],
      [
        '天=heaven 上=above 的 王母 知道 了 ， 非常 生气 。',
        'The Queen Mother of heaven found out, and was furious.',
        {
          on: {
            queen: { x: 80, y: 40, from: 'up', act: 'angry', face: 'l' },
            zhinu: { act: 'fear' },
            boy: { act: 'fear' },
            girl: { act: 'fear' },
          },
        },
      ],
      [
        '她 带 织女 回 了 天=heaven 上=above 。',
        'She took Zhinü back up to heaven.',
        {
          off: ['zhinu:up', 'queen:up'],
          on: {
            niulang: { act: 'weep' },
            boy: { act: 'weep' },
            girl: { act: 'weep' },
          },
        },
      ],
      [
        '牛 帮 牛郎 和 孩子 ， 飞 到 了 天=heaven 上=above 。',
        'The ox helped Niulang and the children fly up to heaven.',
        {
          set: ['clouds', 'stars'],
          on: {
            ox: { far: 0.6 },
            niulang: { act: 'fly', x: 56, y: 22, size: 0.85 },
            boy: { act: 'fly', x: 42, y: 34 },
            girl: { act: 'fly', x: 34, y: 20, face: 'r' },
          },
          then: { wait: 1.8, off: ['ox:fade'] },
        },
      ],
      [
        '王母 在 天=sky 上=above 画 了 一 条 大 河 。',
        'The Queen Mother drew a great river across the sky.',
        {
          set: ['stars', 'milky'],
          on: {
            queen: { x: 60, y: 34, from: 'fade', act: 'sweep', face: 'l' },
            niulang: { act: 'float', x: 78, y: 16, face: 'l' },
            boy: { act: 'float', x: 89, y: 26 },
            girl: { act: 'float', x: 93, y: 12, face: 'l' },
          },
        },
      ],
      [
        '这 条 河 ， 就 是 银河 。',
        'That river is the Milky Way.',
        {
          off: ['queen:fade'],
          on: {
            zhinu: { x: 22, y: 16, size: 0.85, from: 'fade', act: 'float' },
          },
        },
      ],
      [
        '牛郎 在 河 东 ， 织女 在 河 西 。',
        'Niulang was east of the river, and Zhinü west of it.',
        {
          on: {
            niulang: { act: 'weep' },
            zhinu: { act: 'weep', face: 'r' },
          },
        },
      ],
      [
        '每 年 七 月 七 ， 很 多 鸟 飞 来 ， 变成 一 座 桥 。',
        'Every year, on the seventh day of the seventh month, many birds fly up and become a bridge.',
        {
          set: ['stars', 'milky', 'bridge'],
          on: { niulang: { act: 'look' }, zhinu: { act: 'look' } },
        },
      ],
      [
        '牛郎 和 织女 在 桥 上=on 见面 。',
        'Niulang and Zhinü meet on the bridge.',
        {
          on: {
            niulang: { x: 55, y: 44, act: 'stand', face: 'l', size: 0.8 },
            zhinu: { x: 45, y: 44, act: 'stand', face: 'r', size: 0.8 },
            boy: { x: 72, y: 30 },
            girl: { x: 79, y: 22 },
          },
        },
      ],
      [
        '晚上 看 天=sky 上=above ， 你 也 能 看 见=(see) 他们 ！',
        'Look up at the night sky, and you can see them too!',
        {
          set: ['stars', 'milky', 'lovers'],
          off: ['niulang:fade', 'zhinu:fade', 'boy:fade', 'girl:fade'],
        },
      ],
    ],
    questions: [
      {
        q: "Who was Niulang's good friend?",
        options: ['His ox', 'A bird', 'The Queen Mother', 'A horse'],
      },
      {
        q: 'What did the Queen Mother draw across the sky?',
        options: ['A river', 'A wall', 'A road', 'A mountain'],
      },
      {
        q: 'What do the birds become, once a year?',
        options: ['A bridge', 'A boat', 'A cloud', 'A ladder'],
      },
    ],
  },
  {
    id: 'laozi',
    title: 'Laozi goes west',
    zh: '老子西行',
    blurb: 'How the Daodejing came to be written, as the story goes.',
    group: 'sage',
    cast: { ox: 'ox', laozi: 'sage', keeper: 'official' },
    cover: 2,
    lines: [
      [
        '很 久 以前 ， 有 一 个 老人 ， 他 叫 老子 。',
        'Long ago there was an old man called Laozi.',
        {
          set: ['hills', 'clouds'],
          on: { laozi: { x: 58, face: 'l', from: 'r' } },
        },
      ],
      [
        '老子 很 有名 ， 他 知道 道 。',
        'Laozi was famous: he knew the Way.',
        {
          set: ['hills', 'clouds', 'taiji'],
          on: { laozi: { act: 'pointUp' } },
        },
      ],
      [
        '有 一 天 ， 老子 骑 牛 往 西 走 。',
        'One day Laozi rode west on an ox.',
        {
          set: ['hills', 'clouds'],
          on: {
            ox: { x: 70, face: 'l', from: 'r' },
            laozi: { act: 'stand' },
          },
          then: {
            wait: 2.2,
            on: { laozi: { ride: 'ox', act: 'ride' }, ox: { x: 56 } },
          },
        },
      ],
      [
        '他 到 了 一 个 大 门 。',
        'He came to a great gate.',
        { set: ['hills', 'clouds', 'gate'], on: { ox: { x: 52 } } },
      ],
      [
        '看=watch 门 的 人 说 ： “ 老师 ， 你 要 去 哪儿 ？ ”',
        'The gatekeeper said: "Master, where are you going?"',
        {
          by: 'keeper',
          on: { keeper: { x: 27, face: 'r', from: 'l', act: 'bow' } },
        },
      ],
      [
        '老子 说 ： “ 我 往 西 走 。 ”',
        'Laozi said: "I am going west."',
        { by: 'laozi', on: { laozi: { act: 'point' } } },
      ],
      [
        '看=watch 门 的 人 说 ： “ 请 你 写 一 本 书 ， 再 走 吧 ！ ”',
        'The gatekeeper said: "Please write a book before you go!"',
        {
          by: 'keeper',
          on: { keeper: { act: 'bow' }, laozi: { act: 'ride' } },
        },
      ],
      [
        '老子 写 了 一 本 书 ， 五千 个 字 。',
        'Laozi wrote a book of five thousand characters.',
        {
          on: {
            laozi: { ride: undefined, x: 50, act: 'stand', face: 'l' },
            ox: { x: 68, act: 'graze' },
          },
          then: {
            wait: 1.4,
            set: ['hills', 'clouds', 'gate', 'slips'],
            on: { laozi: { act: 'write', hold: 'brush' } },
          },
        },
      ],
      [
        '这 本 书 是 《 道德经 》 。',
        'That book is the Daodejing.',
        {
          on: {
            laozi: { act: 'present', hold: '' },
            keeper: { act: 'bow' },
          },
        },
      ],
      [
        '然后 ， 老子 骑 牛 走 了 。 没有=no 人 知道 他 去 了 哪儿 。',
        'Then Laozi rode off on his ox. No one knows where he went.',
        {
          set: ['hills', 'clouds', 'gate'],
          on: {
            laozi: { ride: 'ox', act: 'ride', hold: '' },
            ox: { x: 4, face: 'l', far: 0.85, act: 'stand' },
            keeper: { act: 'bow', x: 40, face: 'l' },
          },
        },
      ],
    ],
    questions: [
      {
        q: 'What did Laozi ride?',
        options: ['An ox', 'A horse', 'A dragon', 'A bicycle'],
      },
      {
        q: 'Why did he write the book?',
        options: [
          'The gatekeeper asked him to',
          'The emperor ordered it',
          'To sell it',
          'For his son',
        ],
      },
      {
        q: 'How long was the book?',
        options: [
          'Five thousand characters',
          'Five hundred characters',
          'Fifty thousand characters',
          'Five pages',
        ],
      },
    ],
  },
  {
    id: 'zhuangzi',
    title: 'The butterfly dream',
    zh: '庄周梦蝶',
    blurb:
      'Zhuangzi dreams he is a butterfly – or is a butterfly dreaming him?',
    group: 'sage',
    cast: { zhuang: 'scholar', fly: 'butterfly' },
    cover: 2,
    lines: [
      [
        '很 久 以前 ， 有 一 个 哲学家 ， 他 叫 庄子 。',
        'Long ago there was a philosopher called Zhuangzi.',
        {
          set: ['hills', 'tree', 'flowers'],
          on: { zhuang: { x: 46 } },
        },
      ],
      [
        '有 一 天 ， 庄子 睡 了 ， 做=had 了 一 个 梦 。',
        'One day Zhuangzi fell asleep, and had a dream.',
        {
          on: { zhuang: { x: 28, act: 'sleep', hold: '' } },
          then: {
            wait: 1.8,
            set: ['hills', 'tree', 'flowers', 'dream'],
          },
        },
      ],
      [
        '在 梦 里面 ， 他 变成 了 蝴蝶 。',
        'In the dream, he turned into a butterfly.',
        {
          on: {
            zhuang: { far: 0.55 },
            fly: { x: 48, y: 44, act: 'flutter', from: 'fade', size: 1.6 },
          },
        },
      ],
      [
        '他 飞 啊 飞 ， 非常 高兴 。',
        'He flew and flew, and was very happy.',
        { on: { fly: { x: 74, y: 56 } } },
      ],
      [
        '他 不 知道 ， 他 是 庄子 。',
        'He did not know that he was Zhuangzi.',
        { on: { fly: { x: 58, y: 34, face: 'l' } } },
      ],
      [
        '然后 ， 庄子 醒 了 。 他 还是=still 庄子 。',
        'Then Zhuangzi woke up. He was still Zhuangzi.',
        {
          set: ['hills', 'tree', 'flowers'],
          off: ['fly:fade'],
          on: { zhuang: { far: 0, act: 'stand', x: 36 } },
        },
      ],
      [
        '庄子 想=thought ： “ 是 我 梦 见 了 蝴蝶 ？ ”',
        'Zhuangzi wondered: "Did I dream of a butterfly?"',
        {
          by: 'zhuang',
          on: {
            zhuang: { act: 'think' },
            fly: {
              x: 64,
              y: 40,
              far: 0.7,
              from: 'fade',
              act: 'flutter',
              face: 'l',
              size: 1.6,
            },
          },
        },
      ],
      [
        '“ 还是 蝴蝶 梦 见 了 我 ？ ”',
        '"Or did a butterfly dream of me?"',
        { by: 'zhuang', on: { fly: { far: 0 }, zhuang: { far: 0.6 } } },
      ],
      [
        '庄子 不 知道 。 你 知道 吗 ？',
        'Zhuangzi did not know. Do you?',
        {
          on: {
            fly: { far: 0.3, x: 56, y: 46 },
            zhuang: { far: 0.3, act: 'shrug' },
          },
        },
      ],
    ],
    questions: [
      {
        q: 'What did Zhuangzi turn into in his dream?',
        options: ['A butterfly', 'A bird', 'A fish', 'A cloud'],
      },
      {
        q: 'When he woke up, who was he?',
        options: [
          'Still Zhuangzi',
          'A butterfly',
          'Laozi',
          'He did not know his name',
        ],
      },
      {
        q: 'What could he not tell?',
        options: [
          'Who had dreamt of whom',
          'Where the butterfly went',
          'How long he had slept',
          'How to fly',
        ],
      },
    ],
  },
  {
    id: 'saiweng',
    title: 'The old man who lost his horse',
    zh: '塞翁失马',
    blurb: 'Good luck, bad luck – who knows?',
    group: 'fable',
    cast: {
      horse: 'horse',
      horse2: 'horse2',
      man: 'villager',
      woman: 'villager2',
      elder: 'elder',
      son: 'youth',
      soldier: 'soldier',
      soldier2: 'soldier2',
    },
    cover: 3,
    lines: [
      [
        '很 久 以前 ， 有 一 个 老人 ， 他 有 一 匹 马 。',
        'Long ago there was an old man who had a horse.',
        {
          set: ['wall', 'hills'],
          on: { elder: { x: 32 }, horse: { x: 62, face: 'l', from: 'r' } },
        },
      ],
      [
        '有 一 天 ， 马 跑 了 。 人 说 ： “ 太 不 好 了 ！ ”',
        'One day the horse ran away. People said: "How awful!"',
        {
          off: ['horse:run-r'],
          then: {
            wait: 1.6,
            by: 'man',
            on: { man: { x: 13, from: 'l', act: 'weep' } },
          },
        },
      ],
      [
        '老人 说 ： “ 可能 是 好 事 。 ”',
        'The old man said: "Maybe it is a good thing."',
        { by: 'elder', on: { elder: { act: 'shrug' } } },
      ],
      [
        '几 天 以后 ， 马 回来 了 ， 还 带 来 了 一 匹 好 马 ！',
        'A few days later the horse came back – and brought a fine horse with it!',
        {
          on: {
            horse: { x: 54, face: 'l', from: 'r' },
            horse2: { x: 80, face: 'l', from: 'r' },
            man: { act: 'look' },
            elder: { act: 'stand' },
          },
        },
      ],
      [
        '人 说 ： “ 太 好 了 ！ ” 老人 说 ： “ 可能 是 不 好 的 事 。 ”',
        'People said: "Wonderful!" The old man said: "Maybe it is a bad thing."',
        {
          by: 'man',
          on: {
            man: { act: 'cheer' },
            woman: { x: 21, from: 'l', act: 'cheer' },
          },
          then: { wait: 1.8, by: 'elder', on: { elder: { act: 'shrug' } } },
        },
      ],
      [
        '老人 的 儿子 骑 马 ， 腿 断 了 。',
        "The old man's son rode the horse, and broke his leg.",
        {
          on: { son: { x: 70, face: 'l', from: 'r' }, elder: { act: 'stand' } },
          then: {
            wait: 1.6,
            on: {
              son: { ride: 'horse2', act: 'ride' },
              horse2: { act: 'buck' },
            },
            then: {
              wait: 1.8,
              on: {
                son: { ride: undefined, act: 'fall', x: 68 },
                horse2: { act: 'stand', x: 86 },
              },
            },
          },
        },
      ],
      [
        '人 说 ： “ 太 不 好 了 ！ ” 老人 说 ： “ 可能 是 好 事 。 ”',
        'People said: "How awful!" The old man said: "Maybe it is a good thing."',
        {
          by: 'man',
          on: {
            man: { act: 'weep' },
            woman: { act: 'weep' },
            son: { act: 'lie' },
          },
          then: { wait: 1.8, by: 'elder', on: { elder: { act: 'shrug' } } },
        },
      ],
      [
        '一 年 以后 ， 有 战争 。 很 多 年轻 人 去 打仗 ， 都 死 了 。',
        'A year later war came. Many young men went to fight, and all of them died.',
        {
          set: ['wall', 'hills', 'flags'],
          off: ['man:l', 'woman:l', 'horse:r', 'horse2:r'],
          on: {
            soldier: { x: 76, from: 'r', face: 'l' },
            soldier2: { x: 88, from: 'r', face: 'l' },
            elder: { act: 'stand' },
          },
          then: { wait: 3.4, off: ['soldier:fade', 'soldier2:fade'] },
        },
      ],
      [
        '老人 的 儿子 腿 断 了 ， 不 能 去 。 他 没 死 。',
        "The old man's son had a broken leg and could not go. He did not die.",
        {
          set: ['wall', 'hills'],
          on: { son: { act: 'sit', x: 58 }, elder: { x: 40, face: 'r' } },
        },
      ],
      [
        '好 事 ？ 不 好 的 事 ？ 谁 知道 呢 ！',
        'A good thing? A bad thing? Who knows!',
        {
          set: ['wall', 'hills', 'clouds'],
          on: { elder: { act: 'shrug' } },
        },
      ],
    ],
    questions: [
      {
        q: 'What happened when the horse came back?',
        options: [
          'It brought another horse',
          'It was hurt',
          'It ran away again',
          'The old man sold it',
        ],
      },
      {
        q: 'Why did the son not go to war?',
        options: [
          'He had a broken leg',
          'He was too young',
          'He ran away',
          'His father hid him',
        ],
      },
      {
        q: 'What does the story say?',
        options: [
          'Luck can turn either way',
          'Always ride carefully',
          'Horses bring bad luck',
          'Old people are always right',
        ],
      },
    ],
  },
  {
    id: 'yugong',
    title: 'The foolish old man moves the mountains',
    zh: '愚公移山',
    blurb:
      'Two mountains in the way, an old man with a hoe, and all the time in the world.',
    group: 'fable',
    cast: {
      god1: 'god',
      god2: 'god2',
      mocker: 'elder2',
      son: 'youth',
      yugong: 'yugong',
    },
    cover: 5,
    lines: [
      [
        '很 久 以前 ， 有 一 个 老人 ， 他 九十 岁 了 。',
        'Long ago there was an old man. He was ninety years old.',
        { set: ['house', 'hills'], on: { yugong: { x: 34 } } },
      ],
      [
        '人 都 叫=call 他 愚公 。',
        'Everyone called him Yugong, the foolish old man.',
        { on: { yugong: { act: 'bow' } } },
      ],
      [
        '他 家 门 前 ， 有 两 座 大 山 。',
        'In front of his gate stood two great mountains.',
        { set: ['house', 'peaks'], on: { yugong: { act: 'stand' } } },
      ],
      [
        '山 很 高 ， 去 哪儿 都 很 远 。',
        'The mountains were high: wherever he went, it was a long way round.',
        { on: { yugong: { act: 'look' } } },
      ],
      [
        '愚公 说 ： “ 我们 一起 搬 山 吧 ！ ”',
        'Yugong said: "Let us move the mountains together!"',
        {
          by: 'yugong',
          on: { yugong: { act: 'raise' }, son: { x: 18, from: 'l' } },
        },
      ],
      [
        '愚公 和 儿子 每 天 搬 石头 。',
        'Every day Yugong and his sons carried stones away.',
        {
          set: ['house', 'peaks', 'rubble'],
          on: {
            yugong: { act: 'dig', x: 44 },
            son: { act: 'carry', hold: 'pole', x: 26 },
          },
        },
      ],
      [
        '有 人 说 ： “ 你 九十 岁 了 ， 山 太 大 了 ！ ”',
        'Someone said: "You are ninety, and the mountains are too big!"',
        {
          by: 'mocker',
          on: { mocker: { x: 12, from: 'l', act: 'laugh' }, son: { x: 30 } },
        },
      ],
      [
        '愚公 说 ： “ 我 死 了 ， 还 有 儿子 。 儿子 死 了 ， 还 有 儿子 的 儿子 。 ”',
        'Yugong said: "When I die, there are my sons. When they die, there are their sons."',
        {
          by: 'yugong',
          on: { yugong: { act: 'stand', face: 'l', hold: '' } },
        },
      ],
      [
        '“ 山 不 会=will 变=grow 高 。 每 天 搬 一点 ， 一定 能 搬 走=away ！ ”',
        '"The mountains will not grow. Move a little every day, and we will surely move them away!"',
        { by: 'yugong', on: { yugong: { act: 'point', face: 'r' } } },
      ],
      [
        '天=heaven 上=above 的 皇帝 知道 了 ， 叫=told 两 个 神 搬 走=away 了 两 座 山 。',
        'The emperor of heaven heard of it, and sent two gods to carry the two mountains away.',
        {
          off: ['mocker:l'],
          on: {
            god1: { x: 58, from: 'up', far: 0.35, size: 1.25, act: 'raise' },
            god2: {
              x: 84,
              from: 'up',
              far: 0.35,
              size: 1.25,
              act: 'raise',
              face: 'l',
            },
          },
          then: {
            wait: 2.6,
            set: ['house', 'peaks:gone', 'rubble'],
            off: ['god1:up', 'god2:up'],
          },
        },
      ],
      [
        '每 天 做 一点 ， 山 也 能 搬 走=away ！',
        'Do a little every day, and even mountains can be moved!',
        {
          set: ['house', 'hills', 'sun', 'clouds'],
          on: {
            yugong: { act: 'cheer' },
            son: { act: 'cheer', hold: '' },
          },
        },
      ],
    ],
    questions: [
      {
        q: 'How old was Yugong?',
        options: ['Ninety', 'Nineteen', 'Sixty', 'A hundred'],
      },
      {
        q: 'Why did he want to move the mountains?',
        options: [
          'They made every trip a long way round',
          'He wanted the stones',
          'They hid the sun',
          'The emperor told him to',
        ],
      },
      {
        q: 'Who moved the mountains in the end?',
        options: ['Two gods', 'Yugong alone', 'His grandsons', 'A dragon'],
      },
    ],
  },
  {
    id: 'yegong',
    title: 'Lord Ye loves dragons',
    zh: '叶公好龙',
    blurb:
      'Dragons on his robes, his doors and his walls – until a real one comes to call.',
    group: 'fable',
    cast: { ye: 'lord', dragon: 'dragon' },
    cover: 7,
    lines: [
      [
        '很 久 以前 ， 有 一 个 人 ， 叫 叶公 。',
        'Long ago there was a man called Lord Ye.',
        { set: ['hall'], on: { ye: { x: 30 } } },
      ],
      [
        '叶公 非常 喜欢 龙 。',
        'Lord Ye loved dragons dearly.',
        { on: { ye: { act: 'raise' } } },
      ],
      [
        '他 的 衣服 上=on 有 龙 ， 他 的 门 上=on 也 有 龙 。',
        'There were dragons on his clothes, and dragons on his door too.',
        { on: { ye: { act: 'point', x: 52 } } },
      ],
      [
        '他 家 里面 ， 都 是 龙 的 画=painting 。',
        'Inside his house, there were paintings of dragons everywhere.',
        {
          set: ['hall', 'scrolls'],
          on: { ye: { act: 'present', x: 40 } },
        },
      ],
      [
        '天=heaven 上=above 的 龙 知道 了 ， 很 高兴 。',
        'The dragon in heaven heard of it, and was very glad.',
        {
          set: ['sky', 'clouds'],
          off: ['ye:l'],
          on: {
            dragon: {
              x: 70,
              y: 46,
              from: 'fade',
              far: 0.4,
              act: 'fly',
              size: 1,
            },
          },
        },
      ],
      [
        '龙 说 ： “ 我 去 看 他 吧 ！ ”',
        'The dragon said: "I will go and see him!"',
        {
          by: 'dragon',
          on: { dragon: { far: 0, act: 'stand', x: 60, y: 40 } },
        },
      ],
      [
        '有 一 天 ， 真=real 龙 来 了 ！',
        'One day, a real dragon came!',
        {
          set: ['hall', 'scrolls'],
          on: {
            ye: { x: 26, from: 'l', act: 'stand' },
            dragon: { x: 80, y: 30, from: 'r', act: 'fly', size: 1.05 },
          },
        },
      ],
      [
        '龙 来 到 叶公 的 家 ， 看 他 。',
        "The dragon came to Lord Ye's house to look at him.",
        {
          on: {
            dragon: { x: 60, y: 28, act: 'look', face: 'l' },
            ye: { act: 'look' },
          },
        },
      ],
      [
        '叶公 看 见 了 龙 ， 非常 怕 ， 跑 了 ！',
        'Lord Ye saw the dragon, was terrified, and ran away!',
        {
          on: { ye: { act: 'fear' } },
          then: { wait: 1.6, off: ['ye:run-l'] },
        },
      ],
      [
        '龙 很 不 高兴 ： “ 他 不 是 真 喜欢 龙 ！ ”',
        'The dragon was not pleased: "He does not really like dragons!"',
        { by: 'dragon', on: { dragon: { act: 'stand', x: 54, y: 30 } } },
      ],
      [
        '叶公 喜欢 的 ， 不 是 真=real 龙 。',
        'What Lord Ye liked was not real dragons.',
        { off: ['dragon:up'] },
      ],
    ],
    questions: [
      {
        q: 'What did Lord Ye love?',
        options: ['Dragons', 'Horses', 'Tigers', 'Birds'],
      },
      {
        q: 'What did he do when the real dragon came?',
        options: [
          'He ran away',
          'He bowed to it',
          'He painted it',
          'He rode on it',
        ],
      },
      {
        q: 'What does the story say?',
        options: [
          'He did not really love dragons',
          'Dragons are dangerous',
          'Paintings are better than dragons',
          'Dragons love people',
        ],
      },
    ],
  },
  {
    id: 'wukong',
    title: 'The monkey born from a stone',
    zh: '石猴出世',
    blurb:
      'Before the journey west: how Sun Wukong came to be under the mountain.',
    group: 'journey',
    cast: { emperor: 'emperor', monk: 'monk', monkey: 'monkey' },
    cover: 3,
    lines: [
      [
        '很 久 以前 ， 在 一 座 山 上=on ， 有 一 块=(piece) 石头 。',
        'Long ago, on a mountain, there was a stone.',
        { set: ['mountain', 'stone', 'clouds'] },
      ],
      [
        '有 一 天 ， 石头 开=open 了 ， 出来 一 个 猴子 ！',
        'One day the stone broke open, and out came a monkey!',
        {
          set: ['mountain', 'stone:open', 'clouds'],
          on: { monkey: { x: 56, from: 'down', act: 'raise' } },
        },
      ],
      [
        '这个 猴子 叫 孙悟空 。 他 很 厉害 ， 会 七十二 变 。',
        'The monkey was called Sun Wukong. He was formidable: he knew seventy-two transformations.',
        {
          set: ['mountain', 'clouds', 'puff'],
          on: { monkey: { act: 'somersault' } },
        },
      ],
      [
        '他 有 一 根 金箍棒 。',
        'He had a golden cudgel.',
        { set: ['mountain', 'clouds'], on: { monkey: { act: 'twirl' } } },
      ],
      [
        '他 一 个 跟头 ， 可以 飞 十万八千 里 。',
        'With one somersault he could fly a hundred and eight thousand li.',
        {
          set: ['clouds', 'cloudway'],
          on: { monkey: { act: 'somersault' } },
          then: { wait: 1.2, on: { monkey: { act: 'fly', x: 74, y: 40 } } },
        },
      ],
      [
        '他 去 天=heaven 上=above ， 说 ： “ 我 是 齐天大圣 ！ ”',
        'He went up to heaven and said: "I am the Great Sage Equal to Heaven!"',
        {
          by: 'monkey',
          set: ['palace', 'clouds'],
          on: { monkey: { act: 'boast', x: 34, y: 0, face: 'r' } },
        },
      ],
      [
        '天=heaven 上=above 的 皇帝 很 生气 。',
        'The emperor of heaven was very angry.',
        { on: { emperor: { x: 74, face: 'l', from: 'r', act: 'angry' } } },
      ],
      [
        '最后 ， 佛 来 了 。 孙悟空 在 山 下=under ， 等 了 五百 年 。',
        'In the end the Buddha came. Sun Wukong lay under a mountain and waited five hundred years.',
        {
          set: ['buddha', 'clouds'],
          off: ['emperor:fade'],
          on: { monkey: { act: 'fear' } },
          then: {
            wait: 2.4,
            set: ['fivepeaks', 'clouds'],
            on: { monkey: { act: 'trapped', x: 46 } },
          },
        },
      ],
      [
        '然后 ， 一 个 和尚 来 了 … …',
        'Then a monk came by…',
        { on: { monk: { x: 85, face: 'l', from: 'r' } } },
      ],
    ],
    questions: [
      {
        q: 'Where was Wukong born?',
        options: ['From a stone', 'In a cave', 'On the moon', 'In heaven'],
      },
      {
        q: 'How far does one somersault take him?',
        options: ['108,000 li', '72 li', '500 li', '1,000 li'],
      },
      {
        q: 'How long did he wait under the mountain?',
        options: [
          'Five hundred years',
          'Seventy-two years',
          'Five years',
          'A thousand years',
        ],
      },
    ],
  },
]
