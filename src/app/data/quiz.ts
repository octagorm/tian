// The quiz (games/quiz.tsx): general questions in simple Chinese, in mixed
// text, so a learner reads what they can and guesses the rest. A question
// is written word by word like the trip's lines (lib/text.ts); its
// options are short lines too, the right one first, two to four of them.
// The fact after it is English with words of the bank in it ({id}, as in
// the quest). Each question is read by the host.

export const QUIZ_VOICE = 'Quiz host'

export interface Topic {
  id: string
  title: string
  zh: string
  sprite: string
}

export const TOPICS: Array<Topic> = [
  { id: 'animals', title: 'Animals', zh: '动物', sprite: 'panda' },
  { id: 'body', title: 'People', zh: '人', sprite: 'hand' },
  { id: 'food', title: 'Food', zh: '吃的', sprite: 'dumplings' },
  { id: 'world', title: 'The world', zh: '世界', sprite: 'planet-earth' },
  { id: 'space', title: 'Space', zh: '太空', sprite: 'rocket' },
  { id: 'china', title: 'China', zh: '中国', sprite: 'great-wall' },
  { id: 'legends', title: 'Legends', zh: '故事', sprite: 'monkey' },
  { id: 'numbers', title: 'Numbers and time', zh: '数字', sprite: 'clock' },
  { id: 'life', title: 'Every day', zh: '生活', sprite: 'person' },
]

export interface QuizQuestion {
  id: string
  topic: string
  zh: string
  en: string
  // The right one first
  options: Array<string>
  fact?: string
}

// question | English | options, by " / " | fact
type Row = [string, string, string, string?]

const ROWS: Record<string, Array<Row>> = {
  animals: [
    [
      '熊猫 喜欢 吃 什么 ？',
      'What do pandas like to eat?',
      '竹子 / 米饭 / 鱼 / 包子',
      'Bamboo is almost all a giant {熊猫} eats: many kilos of it every day.',
    ],
    [
      '熊猫 是 什么 颜色 的 ？',
      'What colour is a panda?',
      '黑色 和 白色 / 红色 和 黄色 / 蓝色 和 白色 / 黄色',
    ],
    [
      '蜘蛛 有 几 条 腿 ？',
      'How many legs does a spider have?',
      '八 / 六 / 四 / 十',
      'Eight. Insects have six, so a {蜘蛛} is not an insect.',
    ],
    [
      '鸟 有 几 条 腿 ？',
      'How many legs does a bird have?',
      '两 / 四 / 六 / 八',
      'Before a measure word such as {条}, two is {两} liǎng, not {二} èr.',
    ],
    [
      '什么 动物 的 鼻子 很 长 ？',
      'Which animal has a very long nose?',
      '大象 / 熊猫 / 猫 / 马',
      "An elephant's trunk is its nose and upper lip in one.",
    ],
    [
      '什么 动物 最 高 ？',
      'Which animal is the tallest?',
      '长颈鹿 / 大象 / 马 / 熊猫',
      'A giraffe can be more than five metres tall. {长颈鹿} is "long-neck deer".',
    ],
    [
      '企鹅 会 飞 吗 ？',
      'Can penguins fly?',
      '不 会 / 会 / 只 在 晚上 / 只 在 冬天',
      "No: a penguin's wings are flippers, for swimming.",
    ],
    [
      '哪儿 没有 企鹅 ？',
      'Where are there no penguins?',
      '北极 / 南极 / 非洲 / 澳大利亚',
      'Wild penguins live almost only south of the equator: in Antarctica, but also in South Africa, Australia, New Zealand and South America.',
    ],
    [
      '鲸鱼 是 鱼 吗 ？',
      'Is a whale a fish?',
      '不 是 / 是',
      'No, though {鲸鱼} has {鱼} in its name: whales breathe air and feed their young on milk.',
    ],
    [
      '海马 是 鱼 吗 ？',
      'Is a seahorse a fish?',
      '是 / 不 是',
      'Yes. {海马} is "sea horse", as in English, and it is the father who carries the eggs.',
    ],
    [
      '什么 动物 会 变 颜色 ？',
      'Which animal can change colour?',
      '变色龙 / 熊猫 / 牛 / 兔子',
      'The chameleon: {变色龙} is "change-colour dragon".',
    ],
    [
      '蜜蜂 做 什么 ？',
      'What do bees make?',
      '蜂蜜 / 牛奶 / 茶 / 咖啡',
      'Honey. The two words are the same characters the other way round: {蜜蜂} is a bee, {蜂蜜} is honey.',
    ],
    ['牛 吃 什么 ？', 'What do cattle eat?', '草 / 肉 / 鱼 / 米饭'],
    [
      '狮子 住=live 在 哪儿 ？',
      'Where do lions live?',
      '非洲 / 南极 / 北极 / 月亮',
      'In Africa, and a few hundred in India, in the Gir forest.',
    ],
    [
      '小熊猫 是 熊猫 吗 ？',
      'Is a red panda a panda?',
      '不 是 / 是',
      'Not really. The red panda, {小熊猫} or "little panda", is a family of its own, nearer to raccoons. It was called a panda first.',
    ],
  ],
  body: [
    ['我们 用 什么 听 ？', 'What do we hear with?', '耳朵 / 眼睛 / 鼻子 / 手'],
    ['我们 用 什么 看 ？', 'What do we see with?', '眼睛 / 耳朵 / 嘴 / 脚'],
    [
      '一 个 人 有 几 个 手指 ？',
      'How many fingers does a person have?',
      '十 / 八 / 五 / 二十',
      'Ten, counting the thumbs.',
    ],
    [
      '心 在 左边 还是 右边 ？',
      'Is the heart on the left or on the right?',
      '左边 / 右边',
      'A little to the left: it sits near the middle of the chest, leaning left.',
    ],
    [
      '大人 每天 要=need 睡 几 个 小时 ？',
      'How many hours a day does an adult need to sleep?',
      '七 到=to 九 / 两 到=to 三 / 十五 到=to 十六 / 二十',
      'Seven to nine. Children need more.',
    ],
    [
      '中国 人 用 什么 吃饭 ？',
      'What do Chinese people eat with?',
      '筷子 / 手 / 脚 / 书',
      'Chopsticks ({筷子}), and a spoon for soup.',
    ],
  ],
  food: [
    [
      '饺子 是 哪 国 的 菜 ？',
      'Which country are jiaozi dumplings from?',
      '中国 / 法国 / 美国 / 挪威',
    ],
    [
      '寿司 是 哪 国 的 菜 ？',
      'Which country is sushi from?',
      '日本 / 中国 / 英国 / 德国',
    ],
    [
      '披萨 是 哪 国 的 菜 ？',
      'Which country is pizza from?',
      '意大利 / 法国 / 美国 / 日本',
      'Italy: pizza as we know it comes from Naples.',
    ],
    [
      '豆浆 是 用 什么 做 的 ？',
      'What is soy milk made from?',
      '黄豆 / 米饭 / 牛奶 / 鸡蛋',
      'Soybeans, soaked, ground with water and boiled. {黄豆} is "yellow bean".',
    ],
    [
      '北京 什么 菜 最 有名 ？',
      'What is the most famous dish of Beijing?',
      '北京 烤鸭 / 寿司 / 披萨 / 西瓜',
      'Peking duck: roasted, sliced, and eaten in thin pancakes with spring onion and a sweet sauce.',
    ],
    [
      '成都 的 菜 怎么样 ？',
      'What is the food like in Chengdu?',
      '很 辣 / 很 甜 / 很 冷 / 很 贵',
      'Spicy: the food of Sichuan has chilli, and Sichuan pepper, which makes the tongue tingle.',
    ],
    [
      '中国 北方 人 过年 吃 什么 ？',
      'What do people in the north of China eat at New Year?',
      '饺子 / 披萨 / 寿司 / 西瓜',
      'Dumplings, shaped like the silver ingots of old, for money in the year to come.',
    ],
    [
      '中秋节 吃 什么 ？',
      'What do people eat at the Mid-Autumn Festival?',
      '月饼 / 饺子 / 油条 / 披萨',
      'Mooncakes, round like the full moon. The festival is on the fifteenth day of the eighth month of the lunar calendar, when the moon is full and {嫦娥} looks down from it.',
    ],
    [
      '茶 是 从 哪 国 来 的 ？',
      'Where does tea come from?',
      '中国 / 英国 / 日本 / 美国',
      'China, where people drank it for well over two thousand years before it reached Europe, in the 1600s.',
    ],
    [
      '牛奶 是 什么 颜色 的 ？',
      'What colour is milk?',
      '白色 / 黑色 / 红色 / 蓝色',
    ],
    [
      '西瓜 里面 是 什么 颜色 的 ？',
      'What colour is a watermelon inside?',
      '红色 / 蓝色 / 黑色 / 白色',
      'Usually red; some kinds are yellow.',
    ],
  ],
  world: [
    [
      '天空 是 什么 颜色 的 ？',
      'What colour is the sky?',
      '蓝色 / 红色 / 绿色 / 黄色',
      'Blue by day: the air scatters the blue in sunlight more than the red.',
    ],
    [
      '草 是 什么 颜色 的 ？',
      'What colour is grass?',
      '绿色 / 红色 / 蓝色 / 白色',
    ],
    [
      '中国 的 首都 是 哪儿 ？',
      'What is the capital of China?',
      '北京 / 上海 / 西安 / 成都',
      "{北京}. {西安} was the capital for centuries, under the Western Han and the Tang, when it was called Chang'an.",
    ],
    [
      '日本 的 首都 是 哪儿 ？',
      'What is the capital of Japan?',
      '东京 / 北京 / 上海 / 西安',
      'Tokyo: {东京} means "eastern capital", as {北京} means "northern capital".',
    ],
    [
      '法国 的 首都 是 哪儿 ？',
      'What is the capital of France?',
      '巴黎 / 伦敦 / 东京 / 北京',
    ],
    [
      '英国 的 首都 是 哪儿 ？',
      'What is the capital of Britain?',
      '伦敦 / 巴黎 / 东京 / 上海',
    ],
    [
      '美国 的 首都 是 哪儿 ？',
      'What is the capital of America?',
      '华盛顿 / 纽约 / 伦敦 / 巴黎',
      'Washington, not New York, its biggest city.',
    ],
    [
      '挪威 的 首都 是 哪儿 ？',
      'What is the capital of Norway?',
      '奥斯陆 / 伦敦 / 巴黎 / 东京',
    ],
    [
      '世界 上=on 哪 个 国家 最 大 ？',
      'Which is the biggest country in the world?',
      '俄罗斯 / 中国 / 美国 / 加拿大',
      'Russia. Canada comes second, and China and the United States, almost the same size, after it.',
    ],
    [
      '世界 上=on 哪 座 山 最 高 ？',
      'Which is the highest mountain in the world?',
      '珠峰 / 泰山 / 长城',
      'Everest, 8,849 metres, on the border of China and Nepal. {珠峰} is short for 珠穆朗玛峰 Zhūmùlǎngmǎ Fēng, from its Tibetan name, Qomolangma.',
    ],
    [
      '中国 最 长 的 河 是 什么 ？',
      'What is the longest river in China?',
      '长江 / 黄河 / 银河',
      'The Yangtze, about 6,300 kilometres; {长江} means "long river". The {银河}, "silver river", is the Milky Way.',
    ],
    [
      '黄河 是 什么 颜色 的 ？',
      'What colour is the Yellow River?',
      '黄色 / 蓝色 / 绿色 / 红色',
      'Yellow-brown, from the fine yellow earth it carries.',
    ],
    [
      '世界 上=on 哪儿 最 冷 ？',
      'Where is the coldest place in the world?',
      '南极 / 北极 / 北京 / 非洲',
      'Antarctica: −89.2 °C was measured there, at Vostok station, in 1983.',
    ],
    [
      '地球 上=on 水 多 还是 地=land 多 ？',
      'Is there more water or more land on Earth?',
      '水 / 地=land',
      'Water: it covers about 71 per cent of the surface.',
    ],
    [
      '金字塔 在 哪 个 国家 ？',
      'In which country are the pyramids?',
      '埃及 / 中国 / 意大利 / 印度',
      'Egypt. {金字塔} is "a tower shaped like the character {金}".',
    ],
    [
      '熊猫 住=live 在 哪 个 国家 ？',
      'In which country do pandas live?',
      '中国 / 日本 / 美国 / 挪威',
      'Wild pandas live only in China, in the mountains of Sichuan, Shaanxi and Gansu.',
    ],
    [
      '在 北京 ， 冬天 冷 还是 热 ？',
      'In Beijing, is winter cold or hot?',
      '冷 / 热',
      'Cold and dry. South of the equator it is the other way round: in Australia, winter is from June to August.',
    ],
  ],
  space: [
    [
      '地球 有 几 个 月亮 ？',
      'How many moons does the Earth have?',
      '一 个 / 两 个 / 三 个 / 没有',
      'One. Mars has two small ones, and Saturn hundreds.',
    ],
    [
      '哪 个 星球 最 大 ？',
      'Which planet is the biggest?',
      '木星 / 地球 / 火星 / 土星',
      'Jupiter: well over a thousand Earths would fit inside it.',
    ],
    [
      '火星 是 什么 颜色 的 ？',
      'What colour is Mars?',
      '红色 / 蓝色 / 绿色 / 白色',
      'Red, from rust in its dust. {火星} is "fire star".',
    ],
    [
      '太阳 是 星星 吗 ？',
      'Is the Sun a star?',
      '是 / 不 是',
      'Yes, and quite an ordinary one: it looks so big only because it is close.',
    ],
    [
      '哪 个 星球 有 很 大 的 环 ？',
      'Which planet has big rings?',
      '土星 / 地球 / 火星 / 木星',
      'Saturn. Its rings are ice and rock; Jupiter, Uranus and Neptune have thin, faint ones.',
    ],
    [
      '太阳 从 哪儿 出来 ？',
      'Where does the Sun come up?',
      '东 / 西',
      'In the east, as the Earth turns towards it.',
    ],
    [
      '中国 去 月亮 的 飞船 叫=called 什么 名字 ？',
      "What are China's spacecraft to the Moon called?",
      '嫦娥 / 孙悟空 / 熊猫 / 后羿',
      "Chang'e, after the goddess who flew to the Moon. Chang'e 4 was the first ever to land on the Moon's far side, in 2019, with a rover called Yutu, the Jade Rabbit.",
    ],
    [
      '中国 人 说=say 月亮 上=on 有 什么 动物 ？',
      'Which animal do Chinese people say lives on the Moon?',
      '兔子 / 熊猫 / 猫 / 龙',
      'A rabbit, the Jade Rabbit, who keeps {嫦娥} company and pounds the elixir of life.',
    ],
  ],
  china: [
    [
      '谁 写 了 《 道德经 》 ？',
      'Who wrote the Daodejing?',
      '老子 / 孔子 / 孙悟空 / 秦始皇',
      '{老子}, as tradition has it, some 2,500 years ago.',
    ],
    [
      '孔子 是 哪 国 人 ？',
      'Which country was Confucius from?',
      '中国 / 日本 / 英国 / 美国',
      'China: he was born in {曲阜}, in 551 BC as tradition has it.',
    ],
    [
      '兵马俑 是 谁 的 ？',
      'Whose is the Terracotta Army?',
      '秦始皇 / 孔子 / 老子 / 孙悟空',
      "The First Emperor's: some 8,000 clay soldiers guard his tomb. Farmers digging a well found them in 1974.",
    ],
    [
      '兵马俑 在 哪儿 ？',
      'Where is the Terracotta Army?',
      '西安 / 上海 / 北京 / 桂林',
    ],
    ['天安门 在 哪儿 ？', 'Where is Tiananmen?', '北京 / 上海 / 西安 / 桂林'],
    ['外滩 在 哪儿 ？', 'Where is the Bund?', '上海 / 北京 / 西安 / 成都'],
    [
      '纸 是 哪 国 人 发明 的 ？',
      'Which country invented paper?',
      '中国 / 美国 / 英国 / 法国',
      'China. Cai Lun improved papermaking around AD 105. Paper, printing, the compass and gunpowder are China\'s "four great inventions".',
    ],
    [
      '中国 人 说=say 长城 有 多少 里 ？',
      'How many li long do Chinese people say the Great Wall is?',
      '一万 / 十 / 一百 / 一千',
      'Ten thousand: its old name is 万里长城 wànlǐ chángchéng. A {里} is half a kilometre, and with all its branches the wall is over 21,000 kilometres long.',
    ],
    [
      '中国 有 多少 个 民族 ？',
      'How many ethnic groups does China have?',
      '五十六 / 十二 / 一百 / 两',
      'Fifty-six are recognised. More than nine in ten people are Han.',
    ],
    [
      '中文 有 几 个 声调 ？',
      'How many tones does Mandarin have?',
      '四 / 两 / 八 / 十',
      'Four, and a light, neutral tone. Cantonese has six.',
    ],
    [
      '中国 人 觉得 哪 个 数字 好 ？',
      'Which number do Chinese people think is lucky?',
      '八 / 四 / 十三 / 零',
      '{八} bā sounds a little like 发 fā, to grow rich. {四} sì sounds like {死} sǐ, to die, so it is avoided.',
    ],
    [
      '过年 的 时候 ， 中国 人 喜欢 什么 颜色 ？',
      'At New Year, which colour do Chinese people like?',
      '红色 / 白色 / 黑色 / 蓝色',
      'Red, for luck and joy: red lanterns, red envelopes, red verses by the door. White is the colour of mourning.',
    ],
    [
      '中国 的 国旗 是 什么 颜色 的 ？',
      'What colours is the flag of China?',
      '红色 和 黄色 / 红色 和 白色 / 蓝色 和 白色 / 黑色 和 黄色',
      'Red, with five yellow stars.',
    ],
    [
      '围棋 有 哪 两 个 颜色 ？',
      'What are the two colours in Go?',
      '黑色 和 白色 / 红色 和 黄色 / 蓝色 和 绿色',
      'Black and white. {围棋} is more than 2,500 years old; in 2016 a program, AlphaGo, beat one of the best players, Lee Sedol.',
    ],
  ],
  legends: [
    [
      '孙悟空 是 什么 动物 ？',
      'What animal is Sun Wukong?',
      '猴子 / 猪 / 马 / 龙',
    ],
    [
      '猪八戒 是 什么 动物 ？',
      'What animal is Zhu Bajie?',
      '猪 / 猴子 / 马 / 龙',
      'A pig: once a marshal of heaven, he was sent down to Earth for flirting with {嫦娥}, and was born a pig.',
    ],
    [
      '孙悟空 用 什么 打 妖怪 ？',
      'What does Sun Wukong fight demons with?',
      '金箍棒 / 筷子 / 扇子 / 伞',
    ],
    [
      '孙悟空 喜欢 吃 什么 ？',
      'What does Sun Wukong like to eat?',
      '桃子 / 饺子 / 披萨 / 寿司',
      'Peaches, above all the peaches of immortality in the gardens of heaven, which he ate when he was set to guard them.',
    ],
    [
      '孙悟空 一 个 跟头 能 飞 多=how 远 ？',
      'How far can Sun Wukong fly in one somersault?',
      '十万八千 里 / 一 里 / 一百 里 / 一千 里',
      '108,000 {里}: about 54,000 kilometres, more than once round the Earth.',
    ],
    [
      '唐僧 去 哪儿 ？',
      'Where does Tang Sanzang go?',
      '印度 / 日本 / 美国 / 月亮',
      'To India, for Buddhist scriptures ({经}). The real monk, Xuanzang, set off in 629 and came back sixteen years later.',
    ],
    [
      '十二 生肖 里=in ， 第一 个 是 什么 ？',
      'Which is the first of the twelve zodiac animals?',
      '老鼠 / 牛 / 龙 / 猪',
      "The rat: in the race that set their order, it rode on the ox's back and jumped ahead at the finish.",
    ],
    [
      '龙 在 中国 是 好 的 还是 坏=bad 的 ？',
      'In China, is the dragon good or bad?',
      '好 的 / 坏=bad 的',
      "Good: a Chinese {龙} brings rain and luck, and was the emperor's sign.",
    ],
    [
      '牛郎 和 织女 一 年 见面 几 次 ？',
      'How many times a year do the Cowherd and the Weaver Girl meet?',
      '一 / 两 / 十二 / 三百六十五',
      "Once, on the seventh day of the seventh month, when magpies make a bridge across the {银河}. That day, 七夕 Qīxī, is the Chinese Valentine's Day.",
    ],
  ],
  numbers: [
    [
      '一 年 有 几 个 月 ？',
      'How many months are there in a year?',
      '十二 / 十 / 七 / 二十四',
    ],
    [
      '一 个 星期 有 几 天 ？',
      'How many days are there in a week?',
      '七 / 五 / 十 / 六',
    ],
    [
      '一 年 有 多少 天 ？',
      'How many days are there in a year?',
      '三百六十五 / 一百 / 三百 / 一千',
      '365, and 366 in a leap year.',
    ],
    [
      '一 天 有 多少 个 小时 ？',
      'How many hours are there in a day?',
      '二十四 / 十二 / 十 / 六十',
    ],
    [
      '一 个 小时 有 多少 分钟 ？',
      'How many minutes are there in an hour?',
      '六十 / 一百 / 三十 / 十二',
    ],
    ['春天 以后 是 什么 ？', 'What comes after spring?', '夏天 / 秋天 / 冬天'],
    [
      '二十 加 二十 是 多少 ？',
      'What is twenty plus twenty?',
      '四十 / 二十 / 一百 / 四百',
    ],
    [
      '一 个 包子 两 块 钱 ， 三 个 包子 多少 钱 ？',
      'One steamed bun is two kuai. How much are three?',
      '六 块 / 五 块 / 三 块 / 八 块',
    ],
    [
      '现在 八 点 ， 一 个 小时 以后 是 几 点 ？',
      "It's eight o'clock now. What time is it an hour later?",
      '九 点 / 七 点 / 十 点 / 八 点 半',
    ],
    [
      '今天 是 星期 二 ， 明天 是 星期 几 ？',
      'Today is Tuesday. What day is tomorrow?',
      '星期 三 / 星期 四 / 星期 天 / 星期 六',
      'The days are numbered from Monday, {星期} {一}, to Saturday; Sunday is {星期} {天}.',
    ],
    [
      '昨天 是 星期 五 ， 今天 是 星期 几 ？',
      'Yesterday was Friday. What day is it today?',
      '星期 六 / 星期 四 / 星期 天 / 星期 三',
    ],
  ],
  life: [
    [
      '我们 在 哪儿 买 书 ？',
      'Where do we buy books?',
      '书店 / 银行 / 医院 / 学校',
    ],
    [
      '生病 了 去 哪儿 ？',
      'Where do you go when you are ill?',
      '医院 / 银行 / 电影院 / 书店',
    ],
    [
      '我们 在 哪儿 看 电影 ？',
      'Where do we watch films?',
      '电影院 / 医院 / 银行 / 学校',
    ],
    [
      '下雨 的 时候 要=need 带 什么 ？',
      'What do you need to take when it rains?',
      '伞 / 筷子 / 护照 / 钥匙',
    ],
    [
      '老师 在 哪儿 工作 ？',
      'Where do teachers work?',
      '学校 / 医院 / 银行 / 机场',
    ],
    [
      '医生 在 哪儿 工作 ？',
      'Where do doctors work?',
      '医院 / 学校 / 书店 / 超市',
    ],
    [
      '我们 在 哪儿 坐 飞机 ？',
      'Where do we take a plane?',
      '机场 / 火车站 / 公园 / 超市',
    ],
    [
      '睡觉 以前=before 说=say 什么 ？',
      'What do you say before going to sleep?',
      '晚安 / 你好 / 干杯 / 谢谢',
    ],
    [
      '喝 啤酒 的 时候 说=say 什么 ？',
      'What do you say when you drink beer together?',
      '干杯 / 晚安 / 对不起 / 再见',
      '{干杯} is "dry the cup": bottoms up.',
    ],
    [
      '朋友 说=say “ 谢谢 ” ， 你 说=say 什么 ？',
      'A friend says "thank you". What do you say?',
      '不客气 / 对不起 / 再见 / 干杯',
    ],
  ],
}

export const QUIZ: Array<QuizQuestion> = Object.entries(ROWS).flatMap(
  ([topic, rows]) =>
    rows.map(([zh, en, options, fact], i) => ({
      id: `${topic}-${i + 1}`,
      topic,
      zh,
      en,
      options: options.split(' / '),
      ...(fact ? { fact } : {}),
    })),
)
