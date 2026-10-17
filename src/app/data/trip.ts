import type { CastLook } from '../pixel/figure'

// The trip: Beijing to Shanghai, a city at a time, each a few scenes of
// talk. A scene is a script, one line per row:
//
//   > who: 你好 ！ | Hello!            someone in the cast says this
//   ? Order two buns.                  your task for the next choice
//   + 你好 ！ | Hello!                 the right reply
//   ~ 你好 ！ | Hello! | Note          also right, with a note
//   - 再见 ！ | Goodbye! | Why not     wrong, and why
//
// Chinese is written word by word with spaces, so each word can be shown
// in English, in hanzi with pinyin or in hanzi alone, by how well it is
// known. Every word is in data/words.ts (tests/app.test.ts checks);
// numbers are one word (五百一十五). `word=gloss` gives a word a better
// gloss in this one place (我=me). {home} is the player's country.

export interface CastMember {
  name: string
  // Drawn as a portrait (pixel/Pix.tsx) and in full in the scene
  // (pixel/figure.ts), which reads the extra traits of a CastLook
  look: CastLook
  voice: string
}

export interface Line {
  kind: 'line'
  by: string
  zh: string
  en: string
}

export interface Option {
  zh: string
  en: string
  right: boolean
  note?: string
}

export interface Choice {
  kind: 'choice'
  task?: string
  options: Array<Option>
}

export type Step = Line | Choice

export interface Scene {
  id: string
  title: string
  intro: string
  cast: Record<string, CastMember>
  steps: Array<Step>
}

export interface City {
  id: string
  h: string
  name: string
  blurb: string
  scenes: Array<Scene>
}

// The player, as drawn beside their own lines and in the scenes
export const PLAYER_LOOK: CastLook = {
  style: 'short',
  hair: '#6b4a2e',
  coat: '#2f7d6d',
  pack: '#c8372d',
}

// The player's own lines are spoken in this voice
export const PLAYER_VOICE = 'Puck'

function parse(script: string): Array<Step> {
  const steps: Array<Step> = []
  let task: string | undefined
  for (const raw of script.trim().split('\n')) {
    const row = raw.trim()
    if (!row) continue
    const sign = row[0]
    const body = row.slice(1).trim()
    if (sign === '?') {
      task = body
      continue
    }
    if (sign === '>') {
      const colon = body.indexOf(':')
      const [zh, en] = body
        .slice(colon + 1)
        .split('|')
        .map((s) => s.trim())
      steps.push({ kind: 'line', by: body.slice(0, colon).trim(), zh, en })
      continue
    }
    const [zh, en, note] = body.split('|').map((s) => s.trim())
    const option: Option = { zh, en, right: sign !== '-', note }
    const last = steps.at(-1)
    if (last?.kind === 'choice' && !task) last.options.push(option)
    else {
      steps.push({ kind: 'choice', task, options: [option] })
      task = undefined
    }
  }
  return steps
}

const scene = (
  id: string,
  title: string,
  intro: string,
  cast: Record<string, CastMember>,
  script: string,
): Scene => ({ id, title, intro, cast, steps: parse(script) })

const XIAO_LI: CastMember = {
  name: 'Xiao Li',
  look: { style: 'long', coat: '#c8372d', hold: 'phone' },
  voice: 'Leda',
}

export const CITIES: Array<City> = [
  {
    id: 'beijing',
    h: '北京',
    name: 'Beijing',
    blurb:
      'The capital: the Forbidden City, hutongs and breakfast on the street.',
    scenes: [
      scene(
        'bj-arrival',
        'Passport control',
        'You have just landed at Beijing Capital Airport. An officer waves you over.',
        {
          officer: {
            name: 'Officer',
            look: {
              style: 'cap',
              hat: '#1f2a44',
              coat: '#2b3a55',
              top: 'uniform',
            },
            voice: 'Charon',
          },
        },
        `
> officer: 你好 ！ | Hello!
+ 你好 ！ | Hello!
- 再见 ！ | Goodbye! | That is goodbye – you have only just arrived.
- 谢谢 ！ | Thanks! | Nothing to thank for yet. Greet back.
> officer: 请 给 我=me 你 的 护照 。 | Your passport, please.
+ 好的 ， 给 你 。 | OK, here you are.
- 不客气 。 | You're welcome. | 不客气 answers a thank-you.
- 我 没有 。 | I don't have one. | You do – and you need it to get in!
> officer: 你 是 哪 国 人 ？ | Which country are you from?
+ 我 是=am {home} 人 。 | I'm from {home}.
- 我 是=am 中国 人 。 | I'm Chinese. | Not quite yet!
- 我 叫 {home} 。 | My name is {home}. | 叫 is for names: "I am called…". Use 是…人.
> officer: 你 来 中国 做 什么 ？ | What are you in China to do?
? You are here on holiday.
+ 我 来 旅游 。 | I'm here to travel.
- 我 来 工作 。 | I'm here to work. | You are on holiday: 旅游.
- 我 不 懂 。 | I don't understand. | 来 is come, 做什么 is to do what. Try 我来旅游.
> officer: 你 会 说 中文 吗 ？ | Can you speak Chinese?
+ 我 会 说 一点 中文 。 | I can speak a little Chinese.
~ 会 ， 一点 。 | Yes, a little. | Chinese answers yes-or-no questions with the verb: 会 – "can".
- 我 是=am 中文 。 | I am Chinese (the language). | 中文 is the language. Use 会说 – can speak.
> officer: 很 好 ！ 欢迎 你 来 中国 ！ | Very good! Welcome to China!
+ 谢谢 ！ | Thank you!
- 对不起 。 | Sorry. | Nothing to apologise for!
- 没关系 。 | Never mind. | 没关系 answers an apology.
`,
      ),
      scene(
        'bj-taxi',
        'The taxi',
        'Outside the airport you get in a taxi. Your hotel is the Beijing Hotel.',
        {
          driver: {
            name: 'Driver',
            look: { style: 'short', coat: '#3d6fa8' },
            voice: 'Orus',
          },
        },
        `
> driver: 你好 ！ 去 哪儿 ？ | Hello! Where to?
? Go to the Beijing Hotel.
+ 师傅 ， 去 北京 酒店 。 | To the Beijing Hotel, please.
- 我 在 北京 酒店 。 | I am at the Beijing Hotel. | 在 is "to be at". Use 去 – go to.
- 北京 酒店 是 什么 ？ | What is the Beijing Hotel? | You know – it's where you are staying!
> driver: 好的 。 你 是 外国人 吧 ？ | OK. You're a foreigner, right?
+ 对 ， 我 是=am {home} 人 。 | Yes, I'm from {home}.
- 不 ， 我 是=am 外国人 。 | No, I'm a foreigner. | 不 means no – and then you said yes.
- 我 喜欢 外国人 。 | I like foreigners. | Nice, but he asked if you are one.
> driver: 你 的 中文 很 好 ！ | Your Chinese is very good!
+ 谢谢 ！ 我 的 中文 不 好 。 | Thanks! My Chinese isn't good. | A modest answer is the usual reply to praise.
~ 谢谢 ！ | Thank you! | Fine. A modest 我的中文不好 is also very usual.
- 不客气 。 | You're welcome. | 不客气 answers thanks, not praise.
> driver: 到 了 ！ 四十五 块 。 | Here we are! 45 kuai.
? Pay with WeChat.
+ 我 扫 微信 ， 可以 吗 ？ | Can I scan to pay with WeChat?
- 四 块 ？ | Four kuai? | He said 四十五 – forty-five.
- 太 贵 了 ！ | Too expensive! | A metered taxi is not for haggling.
> driver: 可以 。 谢谢 ！ 再见 ！ | Sure. Thanks! Bye!
+ 谢谢 师傅 ， 再见 ！ | Thank you, bye!
- 你好 ！ | Hello! | That is hello. Say goodbye.
`,
      ),
      scene(
        'bj-hotel',
        'Checking in',
        'The Beijing Hotel. The receptionist smiles as you come in.',
        {
          desk: {
            name: 'Receptionist',
            look: { style: 'bun', coat: '#1f1a17', top: 'qipao', hold: 'key' },
            voice: 'Aoede',
          },
        },
        `
> desk: 你好 ， 欢迎 ！ | Hello, welcome!
+ 你好 ！ 我 要 一 个 房间 。 | Hello! I'd like a room.
- 你好 ！ 我 要 一 个 酒店 。 | Hello! I'd like a hotel. | A whole hotel? 房间 is a room.
- 你好 ！ 我 是=am 房间 。 | Hello! I am a room. | 是 is "to be". Use 要 – want.
> desk: 好的 。 住 几 天 ？ | OK. How many days?
? Stay three nights.
+ 住 三 天 。 | Three days.
- 住 三 个 人 。 | Three people. | 人 is people; 天 is days.
- 住 四 天 。 | Four days. | 四 is four. Three is 三.
> desk: 请 给 我=me 你 的 护照 。 | Your passport, please.
+ 好的 ， 给 你 。 | OK, here you are.
- 我 没有 护照 。 | I don't have a passport. | You do!
> desk: 你 的 房间 在 八 楼 ， 八零六 号 。 | Your room is on the eighth floor, number 806.
? Ask what time breakfast is.
+ 早饭 几 点 ？ | What time is breakfast?
- 早饭 多少 钱 ？ | How much is breakfast? | That asks the price. 几点 asks what time.
- 早饭 在 哪儿 ？ | Where is breakfast? | That asks where. 几点 asks what time.
> desk: 早上 七 点 到 十 点 。 | Seven to ten in the morning.
? Ask for the Wi-Fi password.
+ 网 的 密码 是 多少 ？ | What's the Wi-Fi password?
~ 网 的 密码 是 什么 ？ | What's the Wi-Fi password? | Fine. For numbers 多少 is more usual.
- 你 叫 什么 名字 ？ | What's your name? | That asks her name!
> desk: 密码 是 八八八八八八 。 这 是 你 的 钥匙 。 | The password is 888888. Here is your key.
+ 谢谢 ！ | Thank you!
- 对不起 ！ | Sorry! | Nothing to apologise for.
`,
      ),
      scene(
        'bj-breakfast',
        'Breakfast on the street',
        'Morning in a hutong. A stall sells steamed buns, youtiao and hot soy milk.',
        {
          cook: {
            name: 'Cook',
            look: { style: 'chef', coat: '#d8d2c6', top: 'apron' },
            voice: 'Sulafat',
          },
        },
        `
> cook: 早 ！ 吃 什么 ？ | Morning! What will you have?
? Two steamed buns and a soy milk.
+ 我 要 两 个 包子 ， 一 杯 豆浆 。 | Two buns and a soy milk, please.
- 我 要 二 个 包子 ， 一 杯 豆浆 。 | Two buns and a soy milk. | Before a measure word, two is 两, not 二.
- 我 要 两 杯 包子 ， 一 个 豆浆 。 | Two cups of buns and one soy milk. | Buns take 个; drinks take 杯 – cup.
> cook: 还 要 别的 吗 ？ | Anything else?
? Add a youtiao.
+ 还 要 一 根 油条 。 | A youtiao too.
~ 还 要 一 个 油条 。 | A youtiao too. | Understood – but youtiao, long and thin, take 根.
- 不 要 了 。 | Nothing more. | You wanted a youtiao!
> cook: 好 ！ 一共 九 块 。 | Here you go! Nine kuai altogether.
? Pay with a ten kuai note.
+ 给 你 十 块 。 | Here's ten.
- 给 你 九十 块 。 | Here's ninety. | 九十 is ninety!
- 给 你 一 块 。 | Here's one. | That is one kuai.
> cook: 找=change 你 一 块 。 谢谢 ！ | One kuai change. Thanks!
+ 谢谢 ！ 再见 ！ | Thanks! Bye!
- 没关系 ！ | Never mind! | 没关系 answers an apology.
`,
      ),
      scene(
        'bj-directions',
        'The way to Tiananmen',
        'You want to see Tiananmen. An old man is doing tai chi by the road.',
        {
          man: {
            name: 'Old man',
            look: {
              style: 'bald',
              old: true,
              beard: true,
              coat: '#e8e2d0',
              top: 'silk',
            },
            voice: 'Algenib',
          },
        },
        `
? Ask where Tiananmen is.
+ 请问 ， 天安门 在 哪儿 ？ | Excuse me, where is Tiananmen?
- 请问 ， 天安门 是 什么 ？ | Excuse me, what is Tiananmen? | That asks what it is.
- 天安门 ， 再见 ！ | Tiananmen, goodbye! | Ask where: 在哪儿.
> man: 天安门 ？ 不 远 。 往 前 走 ， 到 路口 往 左 拐 。 | Tiananmen? Not far. Go straight on, and turn left at the crossing.
? Check that you have it right.
+ 往 前 走 ， 到 路口 往 左 拐 ？ | Straight on, then left at the crossing?
- 往 前 走 ， 到 路口 往 右 拐 ？ | Straight on, then right at the crossing? | 左 is left, 右 is right.
- 往 左 走 ， 到 路口 往 前 走 ？ | Go left, then straight on at the crossing? | The other way round.
> man: 对 ！ 走 十 分钟 就 到 了 。 | Right! Ten minutes' walk and you're there.
+ 谢谢 ！ | Thank you!
- 多少 钱 ？ | How much? | Directions are free!
> man: 不客气 ！ | You're welcome!
`,
      ),
      scene(
        'bj-wall',
        'The Great Wall',
        'Mutianyu, an hour north of Beijing. The Wall climbs the ridges as far as you can see.',
        {
          guide: {
            name: 'Guide',
            look: { style: 'short', coat: '#e07a2a', hold: 'flag' },
            voice: 'Schedar',
          },
        },
        `
> guide: 这 是 长城 ！ 很 长 吧 ？ | This is the Great Wall! Long, isn't it?
+ 太 长 了 ！ 也 很 美 。 | So long! And beautiful.
- 太 小 了 ！ | Too small! | Small? It runs for thousands of kilometres.
- 很 好吃 ！ | Delicious! | 好吃 is for food.
> guide: 我们 往 上 走 吧 ！ | Let's go up!
+ 好 ！ 走 吧 ！ | OK, let's go!
- 我 不 走 。 | I'm not going. | You came all this way!
> guide: 你 累 吗 ？ | Are you tired?
+ 有 一点 累 ， 但是 很 高兴 ！ | A bit tired, but happy!
~ 不 累 ！ | Not tired! | Strong legs.
- 我 很 饿 。 | I'm very hungry. | 饿 is hungry; tired is 累.
> guide: 你 知道 吗 ？ 不 到 长城 非 好汉 ！ | You know what they say? You're no hero till you've been to the Great Wall!
+ 那 我 现在 是 好汉 了 ！ | Then I'm a hero now!
- 我 不 是 长城 。 | I'm not the Great Wall. | True – but he means you're a hero now. The line is Mao's, from a poem of 1935.
> guide: 哈哈 ， 对 ！ 来 ， 我 帮 你 拍照 。 | Haha, right! Come, I'll take your picture.
+ 谢谢 ！ | Thanks!
`,
      ),
    ],
  },
  {
    id: 'qufu',
    h: '曲阜',
    name: 'Qufu',
    blurb:
      "Confucius' home town in Shandong: his temple, his family's mansion and the forest where he lies.",
    scenes: [
      scene(
        'qf-temple',
        'The temple of Confucius',
        'The Temple of Confucius in Qufu. Students burn incense here before their exams. One of them smiles at you.',
        {
          student: {
            name: 'Student',
            look: {
              style: 'pony',
              glasses: true,
              coat: '#3d6fa8',
              top: 'hoodie',
            },
            voice: 'Autonoe',
          },
        },
        `
> student: 你好 ！ 你 也 来 看 孔子 吗 ？ | Hello! Have you come to see Confucius too?
+ 对 ！ 孔子 是 中国 最 有名 的 老师 。 | Yes! Confucius is China's most famous teacher.
- 对 ！ 孔子 是 中国 的 皇帝 。 | Yes! Confucius is China's emperor. | He never ruled – he taught. 老师, not 皇帝.
> student: 我 是 学生 ， 明天 有 考试 。 | I'm a student. I have an exam tomorrow.
+ 加油 ！ 孔子 会=will 帮 你 ！ | Good luck! Confucius will help you!
- 我 也 是 考试 。 | I'm an exam too. | 考试 is the exam itself.
> student: 你 学 中文 多 长 时间 了 ？ | How long have you been learning Chinese?
+ 我 学 了 一 个 月 。 | For a month.
~ 我 学 了 一 年 。 | For a year. | Any answer will do!
- 我 学 了 一 岁 。 | For one year of age. | 岁 is for age. A year of time is 年.
> student: 孔子 是 你 的 老师 ， 也 是 我 的 老师 ！ | Confucius is your teacher, and mine too!
+ 对 ！ 我们 都 是 孔子 的 学生 。 | Yes! We're all his students.
- 不 对 ， 孔子 是 我 的 朋友 。 | No, Confucius is my friend. | Bold: he lived 2,500 years ago.
`,
      ),
    ],
  },
  {
    id: 'xian',
    h: '西安',
    name: "Xi'an",
    blurb:
      'The old capital of the Qin and Tang: city walls, lamb skewers and the Terracotta Army.',
    scenes: [
      scene(
        'xa-train',
        'A ticket to Xi’an',
        'At Beijing West station you buy a ticket for the high-speed train.',
        {
          clerk: {
            name: 'Ticket seller',
            look: {
              style: 'short',
              glasses: true,
              coat: '#2f7d6d',
              top: 'uniform',
            },
            voice: 'Iapetus',
          },
        },
        `
> clerk: 你好 ， 去 哪儿 ？ | Hello, where to?
? One ticket to Xi'an, for tomorrow.
+ 我 要 一 张 明天 去 西安 的 票 。 | One ticket to Xi'an for tomorrow, please.
- 我 要 一 个 明天 去 西安 的 票 。 | One ticket to Xi'an for tomorrow. | Tickets are flat: they take 张.
- 我 要 一 张 今天 去 西安 的 票 。 | One ticket to Xi'an for today. | 今天 is today. Tomorrow is 明天.
> clerk: 明天 上午 七 点 ， 可以 吗 ？ | Tomorrow at seven in the morning, OK?
? That is too early. Ask for the afternoon.
+ 太 早 了 ！ 下午 有 吗 ？ | Too early! Is there one in the afternoon?
- 太 晚 了 ！ 下午 有 吗 ？ | Too late! Is there one in the afternoon? | 晚 is late; 早 is early.
- 我 七 岁 。 | I'm seven years old. | 岁 is years of age!
> clerk: 下午 两 点 半 有 。 | There's one at half past two in the afternoon.
? Ask how much it is.
+ 好 ， 多少 钱 ？ | Good, how much?
- 好 ， 几 点 ？ | Good, what time? | He just told you. Ask the price: 多少钱.
> clerk: 五百一十五 块 。 请 给 我=me 你 的 护照 。 | 515 kuai. Your passport, please.
+ 好的 ， 给 你 。 | OK, here you are.
- 我 的 护照 在 酒店 。 | My passport is at the hotel. | Then no ticket: in China a train ticket needs your passport.
> clerk: 好 了 。 这 是 你 的 票 。 一路平安 ！ | Done. Here is your ticket. Have a good trip!
+ 谢谢 ！ | Thank you!
`,
      ),
      scene(
        'xa-food',
        'The Muslim Quarter',
        "Evening in Xi'an's Muslim Quarter. Smoke and cumin rise from the grills.",
        {
          grill: {
            name: 'Grill man',
            look: {
              style: 'kufi',
              beard: true,
              coat: '#8a5a3c',
              top: 'apron',
              hold: 'skewers',
            },
            voice: 'Fenrir',
          },
        },
        `
> grill: 羊肉串 ！ 好吃 的 羊肉串 ！ | Lamb skewers! Tasty lamb skewers!
? Ask how much they are.
+ 羊肉串 多少 钱 ？ | How much are the lamb skewers?
- 羊肉串 在 哪儿 ？ | Where are the lamb skewers? | They are right in front of you.
- 羊肉串 好吃 吗 ？ | Are the lamb skewers good? | He has just told you they are. Ask the price.
> grill: 五 块 一 个 。 | Five kuai each.
? Ten, not too spicy.
+ 我 要 十 个 ， 不 要 太 辣 。 | Ten, please, not too spicy.
- 我 要 四 个 ， 不 要 太 辣 。 | Four, please, not too spicy. | 四 sì is four; 十 shí is ten. Listen for the tone!
- 我 要 十 个 ， 要 很 辣 。 | Ten, please, very spicy. | 很辣 is very spicy. Use 不要太辣.
> grill: 好 ！ 你 是 哪 国 人 ？ | Coming up! Where are you from?
+ 我 是=am {home} 人 。 | I'm from {home}.
- 我 是=am {home} 。 | I am {home}. | Add 人: {home}人, a person from {home}.
> grill: {home} ？ 很 远 啊 ！ 来 ， 你 的 羊肉串 。 五十 块 。 | {home}? That's far! Here, your skewers. 50 kuai.
+ 我 扫 微信 。 | I'll scan with WeChat.
- 五 块 ？ | Five kuai? | Ten at five each: 五十, fifty.
> grill: 好 ！ 欢迎 再 来 ！ | Great! Come again!
+ 谢谢 ， 再见 ！ | Thanks, bye!
`,
      ),
      scene(
        'xa-warriors',
        'The Terracotta Army',
        'Pit One: thousands of clay soldiers, made for the tomb of Qin Shi Huang, the First Emperor. A guide is talking, and a tourist turns to you.',
        {
          guide: {
            name: 'Guide',
            look: {
              style: 'short',
              glasses: true,
              coat: '#8a5a3c',
              hold: 'flag',
            },
            voice: 'Rasalgethi',
          },
          fan: {
            name: 'Tourist',
            look: { style: 'pony', coat: '#e07a9a', hold: 'camera' },
            voice: 'Laomedeia',
          },
        },
        `
> guide: 这 是 秦始皇 的 兵马俑 。 | This is the Terracotta Army of Qin Shi Huang.
> fan: 你好 ！ 我 可以 和 你 拍照 吗 ？ | Hi! Can I take a photo with you?
+ 可以 ！ | Sure!
~ 不 可以 。 | No. | You may say no – but foreigners are often asked, and a yes makes a friend.
- 我 不 吃 。 | I don't eat. | 吃 is eat. Say 可以 – you may.
> fan: 谢谢 ！ 你 是 学生 吗 ？ | Thanks! Are you a student?
+ 不 是 ， 我 工作 了 。 | No, I'm working.
~ 是 ， 我 是=am 学生 。 | Yes, I'm a student. | Fine, if you are!
- 我 是=am 兵马俑 。 | I am a terracotta warrior. | Not even close.
> fan: 你 觉得 兵马俑 怎么样 ？ | What do you think of the Terracotta Army?
+ 非常 有意思 ！ | Fascinating!
~ 太 贵 了 ！ | Too expensive! | Honest – the tickets are not cheap.
- 很 好吃 ！ | Delicious! | 好吃 is for food.
> fan: 我 也 觉得 ！ 你 的 中文 真 好 ！ | So do I! Your Chinese is really good!
+ 谢谢 ！ 我 在=am 学 中文 。 | Thanks! I'm learning Chinese.
- 我 是=am 中文 。 | I am Chinese (the language). | Use 学 – learn: 我在学中文.
> fan: 加油 ！ | Keep it up!
`,
      ),
    ],
  },
  {
    id: 'chengdu',
    h: '成都',
    name: 'Chengdu',
    blurb:
      'Sichuan’s easy-going capital: pandas, teahouses and the spiciest hotpot in China.',
    scenes: [
      scene(
        'cd-panda',
        'The panda base',
        'At the panda base you meet Xiao Li, a friend of a friend who lives in Chengdu.',
        { li: XIAO_LI },
        `
> li: 你好 ！ 我 是=am 小李 。 认识 你 很 高兴 ！ | Hi! I'm Xiao Li. Nice to meet you!
+ 认识 你 ， 我 也 很 高兴 ！ | Nice to meet you too!
- 我 也 很 累 。 | I'm very tired too. | 累 is tired; 高兴 is glad.
- 我 叫 小李 。 | I'm called Xiao Li. | That is her name, not yours.
> li: 你 看 ， 熊猫 ！ 熊猫 在=is 吃 什么 ？ | Look, a panda! What's it eating?
+ 熊猫 在=is 吃 竹子 。 | It's eating bamboo.
- 熊猫 在=is 喝 竹子 。 | It's drinking bamboo. | 喝 is drink.
- 熊猫 在=is 吃 饺子 。 | It's eating dumplings. | If only. Pandas eat bamboo: 竹子.
> li: 熊猫 真 可爱 ！ 你 喜欢 熊猫 吗 ？ | Pandas are so cute! Do you like pandas?
+ 喜欢 ！ 我 非常 喜欢 熊猫 。 | Yes! I love pandas.
- 喜欢 ！ 熊猫 很 好吃 。 | Yes! Pandas are delicious. | Oh no.
- 我 是=am 熊猫 。 | I am a panda. | You are not.
> li: 你 多大 ？ | How old are you?
+ 我 三十 岁 。 | I'm thirty.
~ 我 四十 岁 。 | I'm forty. | Any age will do!
- 我 三十 个 。 | I'm thirty items. | Age takes 岁.
> li: 晚上 我们 一起 吃 火锅 ， 怎么样 ？ | How about hotpot together tonight?
+ 好 啊 ！ 几 点 ？ | Great! What time?
~ 好 啊 ！ 在 哪儿 ？ | Great! Where? | Good question too.
- 我 不 吃 晚上 。 | I don't eat evenings. | Say yes – it's hotpot!
> li: 晚上 七 点 ， 我 来 酒店 找=fetch 你 。 | Seven tonight. I'll come and get you at the hotel.
+ 好的 ， 晚上 见 ！ | OK, see you tonight!
~ 好的 ， 再见 ！ | OK, bye! | Fine. 晚上见 – see you tonight – is even better.
`,
      ),
      scene(
        'cd-teahouse',
        'The teahouse',
        "A teahouse in People's Park. Old people play mahjong, an ear-cleaner wanders between the tables. A grandmother waves you to a seat.",
        {
          granny: {
            name: 'Grandmother',
            look: {
              style: 'bun',
              old: true,
              coat: '#6b4fa0',
              top: 'cardigan',
              hold: 'fan',
            },
            voice: 'Gacrux',
          },
        },
        `
> granny: 坐=sit 吧 ！ 喝 茶 吗 ？ | Sit down! Some tea?
+ 好 ， 谢谢 ！ 我 很 喜欢 喝 茶 。 | Yes, thanks! I love tea.
- 不 ， 我 要 啤酒 。 | No, I want beer. | In a teahouse? Try the tea.
> granny: 你 看 ， 喝 茶 要 慢 ， 不 要 快 。 | You see, tea is drunk slowly, not fast.
+ 对 ， 慢 一点 好 。 | Yes, slower is better.
- 我 喜欢 快 ！ | I like fast! | She is teaching you something. Agree: 慢一点好.
> granny: 老子 说 ， 人 要 自然 。 | Laozi said: be natural, like nature.
+ 我 知道 老子 ！ 道 可 道 ， 非 常 道 。 | I know Laozi! "The Way that can be told is not the constant Way."
- 老子 是 我 的 朋友 。 | Laozi is my friend. | He lived some 2,500 years ago!
- 老子 是 熊猫 吗 ？ | Is Laozi a panda? | Laozi is the sage of the Daodejing.
> granny: 哈哈 ， 你 是 哲学家 ！ | Haha, you're a philosopher!
+ 不 是 ， 我 只 是 一 个 学生 。 | No, I'm just a student.
~ 对 ， 我 是=am 哲学家 ！ | Yes, I'm a philosopher! | Modesty would be more Chinese – but why not.
> granny: 你 的 中文 很 好 。 再 喝 一 杯 吧 ！ | Your Chinese is good. Have another cup!
+ 好 ， 谢谢 ！ | Yes, thank you!
`,
      ),
      scene(
        'cd-hotpot',
        'Hotpot',
        'A noisy hotpot restaurant. The broth bubbles red with chillies and Sichuan pepper.',
        {
          waiter: {
            name: 'Waiter',
            look: {
              style: 'short',
              coat: '#1f1a17',
              top: 'vest',
              hold: 'notepad',
            },
            voice: 'Achird',
          },
          li: XIAO_LI,
        },
        `
> waiter: 两 位 吗 ？ 请 坐=sit 。 | Two of you? Please sit down.
+ 对 ， 两 个 人 。 | Yes, two people.
- 对 ， 二 个 人 。 | Yes, two people. | Before a measure word, two is 两.
> waiter: 这 是 菜单 。 你们 要 辣 的 还是 不 辣 的 ？ | Here's the menu. Spicy, or not spicy?
? Not too spicy for you, please.
+ 不 要 太 辣 的 。 | Not too spicy, please.
~ 要 很 辣 的 ！ | Very spicy! | Brave. Sichuan spicy is serious.
- 要 辣 的 还是 不 辣 的 。 | Spicy or not spicy. | You repeated the question.
> li: 你 能 吃 辣 吗 ？ | Can you eat spicy food?
+ 能 ， 一点 。 | Yes, a little.
~ 不 能 。 | No. | Honest! You'll have the mild side.
- 我 不 辣 。 | I'm not spicy. | 吃辣 – eat spicy. Answer with 能: can.
> waiter: 喝 什么 ？ | Something to drink?
? Two bottles of beer.
+ 两 瓶 啤酒 。 | Two bottles of beer.
~ 两 杯 啤酒 。 | Two glasses of beer. | Fine – glasses, not bottles.
- 两 碗 啤酒 。 | Two bowls of beer. | Beer in a bowl? 瓶 is bottle.
> li: 干杯 ！ | Cheers!
+ 干杯 ！ | Cheers!
- 对不起 ！ | Sorry! | Raise your glass: 干杯!
> li: 好吃 吗 ？ | Is it good?
+ 太 好吃 了 ！ | So good!
~ 太 辣 了 ！ 但是 好吃 。 | So spicy! But good. | Very true.
- 我 不 饿 。 | I'm not hungry. | Not the time to say so!
? Ask the waiter for the bill.
+ 服务员 ， 买单 ！ | Waiter, the bill please!
- 服务员 ， 干杯 ！ | Waiter, cheers! | 买单 is the bill.
- 服务员 ， 再见 ！ | Waiter, goodbye! | You have not paid yet.
> li: 我 来=will 吧 ！ 我 请=treat 你 。 | I'll get it! My treat.
+ 谢谢 ！ 下次 我 请=treat 你 。 | Thanks! Next time it's on me.
~ 好的 ， 谢谢 。 | OK, thanks. | Better to offer back: 下次我请你.
`,
      ),
    ],
  },
  {
    id: 'guilin',
    h: '桂林',
    name: 'Guilin',
    blurb:
      'Karst peaks along the Li River, the landscape of a thousand paintings.',
    scenes: [
      scene(
        'gl-bike',
        'A bike in Yangshuo',
        'In Yangshuo, near Guilin, you want to cycle out among the peaks.',
        {
          boss: {
            name: 'Shop owner',
            look: { style: 'short', beard: true, coat: '#6b4a2e', top: 'tee' },
            voice: 'Umbriel',
          },
        },
        `
? Ask if they have bikes.
+ 老板 ， 有 自行车 吗 ？ | Do you have bikes?
- 老板 ， 有 飞机 吗 ？ | Do you have planes? | 飞机 is a plane. A bike is 自行车.
- 老板 ， 你 是 自行车 吗 ？ | Are you a bike? | 有 – have – not 是.
> boss: 有 ！ 你 要 租 几 天 ？ | Yes! For how many days?
? Just today.
+ 就 今天 。 | Just today.
- 就 明天 。 | Just tomorrow. | 明天 is tomorrow.
> boss: 一 天 三十 块 。 | Thirty kuai a day.
? Bargain.
+ 太 贵 了 ， 便宜 一点 吧 ！ | Too expensive – a bit cheaper?
- 太 便宜 了 ！ | Too cheap! | Then he'll put the price up.
- 好 ， 给 你 三百 块 。 | OK, here's 300. | 三百 is three hundred!
> boss: 好 吧 ， 二十五 块 。 | Fine, 25.
+ 好 ！ 给 你 。 | Good! Here.
> boss: 下午 可能 会=will 下雨 。 你 有 伞 吗 ？ | It may rain this afternoon. Do you have an umbrella?
+ 没有 。 你 有 伞 吗 ？ | No. Do you have one?
- 有 ， 我 有 雨 。 | Yes, I have rain. | 雨 is rain; 伞 is an umbrella.
> boss: 有 ， 送 你 ！ | I do – it's yours!
+ 谢谢 老板 ！ | Thank you!
`,
      ),
      scene(
        'gl-river',
        'On the Li River',
        'A bamboo raft drifts down the Li River between the peaks.',
        {
          raft: {
            name: 'Raftsman',
            look: {
              style: 'cap',
              cone: true,
              hat: '#c9a46a',
              coat: '#2b3a55',
              top: 'tee',
            },
            voice: 'Alnilam',
          },
        },
        `
> raft: 你 看 ， 山 很 美 吧 ？ | Look – beautiful mountains, aren't they?
+ 太 美 了 ！ | So beautiful!
- 太 贵 了 ！ | Too expensive! | 美 is beautiful; 贵 is expensive.
- 山 很 好吃 。 | The mountains are tasty. | 好吃 is for food.
> raft: 你 想 拍照 吗 ？ 我 帮 你 拍照 。 | Want a photo? I'll take one for you.
+ 好 ， 谢谢 ！ 这 是 我 的 手机 。 | Yes, thanks! Here's my phone.
- 不 ， 我 不 喜欢 山 。 | No, I don't like mountains. | Really?
> raft: 一 ， 二 ， 三 ！ 好 了 ！ | One, two, three! There!
+ 谢谢 ！ 照片 很 漂亮 ！ | Thanks! The photo is lovely!
> raft: 今天 天气 很 好 ， 不 冷 也 不 热 。 | Lovely weather today, not cold and not hot.
+ 对 ， 天气 非常 好 ！ | Yes, the weather is perfect!
- 对 ， 今天 下雨 。 | Yes, it's raining today. | It isn't – he said the weather is good.
`,
      ),
    ],
  },
  {
    id: 'shanghai',
    h: '上海',
    name: 'Shanghai',
    blurb:
      'The future, already: the Bund, the metro, markets and towers of light.',
    scenes: [
      scene(
        'sh-metro',
        'The metro',
        'Shanghai’s metro is huge. You want to see the Bund by night.',
        {
          staff: {
            name: 'Station staff',
            look: {
              style: 'cap',
              hat: '#c8372d',
              coat: '#3d6fa8',
              top: 'uniform',
            },
            voice: 'Despina',
          },
        },
        `
? Ask how to get to the Bund.
+ 请问 ， 去 外滩 怎么 走 ？ | Excuse me, how do I get to the Bund?
- 请问 ， 外滩 多少 钱 ？ | Excuse me, how much is the Bund? | It is not for sale.
- 请问 ， 你 去 外滩 吗 ？ | Excuse me, are you going to the Bund? | That asks if she is going.
> staff: 坐 地铁 ， 两 站 就 到 了 。 | Take the metro – two stops and you're there.
+ 两 站 ？ 很 近 ！ | Two stops? Close!
- 两 个 小时 ？ | Two hours? | 两站 – two stops.
> staff: 对 。 外滩 晚上 很 漂亮 。 | Yes. The Bund is lovely at night.
? Ask where the toilet is.
+ 请问 ， 厕所 在 哪儿 ？ | Excuse me, where is the toilet?
- 请问 ， 厕所 几 点 ？ | Excuse me, what time is the toilet? | 在哪儿 asks where.
> staff: 在 那儿 ， 往 右 走 。 | Over there, to the right.
+ 谢谢 ！ | Thanks!
`,
      ),
      scene(
        'sh-books',
        'The bookshop',
        'A big bookshop on Fuzhou Road. You are looking for a famous science-fiction novel.',
        {
          clerk: {
            name: 'Bookseller',
            look: {
              style: 'spiky',
              glasses: true,
              coat: '#2f7d6d',
              hold: 'book',
            },
            voice: 'Sadaltager',
          },
        },
        `
> clerk: 你好 ！ 你 找 什么 书 ？ | Hello! What book are you looking for?
? Ask for The Three-Body Problem.
+ 你们 有 三体 吗 ？ | Do you have The Three-Body Problem?
- 你们 有 西游记 吗 ？ | Do you have Journey to the West? | A great book, but not the one you want.
- 我 是=am 三体 。 | I am Three-Body. | You are looking for it: 有三体吗?
> clerk: 有 ！ 你 喜欢 看 科幻 吗 ？ | Yes! Do you like science fiction?
+ 喜欢 ！ 我 非常 喜欢 科幻 。 | Yes! I love science fiction.
- 不 喜欢 ， 我 喜欢 科幻 。 | No, I like science fiction. | First no, then yes!
> clerk: 这 本 书 是 中文 的 ， 你 能 看 懂 吗 ？ | This copy is in Chinese. Can you read it?
+ 我 能 看 懂 一点 。 | I can read a little.
~ 我 要 英文 的 。 | I'd like the English one. | Fair. Ken Liu's translation is excellent.
- 我 不 是 书 。 | I am not a book. | True, but…
> clerk: 太 厉害 了 ！ 一共 五十八 块 。 | Impressive! 58 kuai altogether.
+ 我 扫 微信 。 | I'll scan with WeChat.
- 五 块 八 ？ | Five kuai eighty? | 五十八 is fifty-eight.
> clerk: 好的 。 欢迎 再 来 ！ | OK. Come again!
+ 谢谢 ！ 再见 ！ | Thanks! Bye!
`,
      ),
      scene(
        'sh-market',
        'The market',
        'A clothes market. Every price is the start of a conversation.',
        {
          boss: {
            name: 'Stall owner',
            look: {
              style: 'bun',
              coat: '#6b4fa0',
              top: 'apron',
              accent: '#d9a441',
            },
            voice: 'Zephyr',
          },
        },
        `
> boss: 你好 ！ 看 一下 吧 ！ | Hello! Have a look!
? Ask how much the red hat is.
+ 这 个 红色 的 帽子 多少 钱 ？ | How much is this red hat?
- 这 个 白色 的 帽子 多少 钱 ？ | How much is this white hat? | 白色 is white; red is 红色.
- 这 个 红色 的 鞋 多少 钱 ？ | How much are these red shoes? | 鞋 are shoes. A hat is 帽子.
> boss: 一百五十 块 。 | 150 kuai.
? Offer fifty.
+ 太 贵 了 ！ 五十 块 ， 可以 吗 ？ | Too much! Fifty, OK?
- 太 便宜 了 ！ | Too cheap! | Never say that at a market.
- 好 ， 给 你 一千 块 。 | OK, here's a thousand. | 一千 is a thousand!
> boss: 五十 ？ 不 行 ！ 一百 。 | Fifty? No way! A hundred.
+ 六十 ， 好 不 好 ？ | Sixty – all right?
~ 好 ， 一百 。 | OK, a hundred. | You could have gone lower!
- 一百二十 ！ | 120! | You are bidding against yourself.
> boss: 好 吧 ， 八十 ！ 不 能 再 便宜 了 。 | All right, eighty! Can't go lower.
+ 好 ， 我 要 了 ！ | OK, I'll take it!
~ 我 不 要 了 。 | I don't want it after all. | Walking away often brings the price down…
> boss: 还 要 别的 吗 ？ 鞋 ？ 衣服 ？ | Anything else? Shoes? Clothes?
+ 不 要 了 ， 谢谢 ！ | That's all, thanks!
`,
      ),
      scene(
        'sh-vr',
        'The VR arcade',
        'A virtual reality arcade near People’s Square. A teenager is waiting for a partner for a space game.',
        {
          kid: {
            name: 'Teenager',
            look: {
              style: 'spiky',
              hair: '#3a3a8a',
              coat: '#d0308a',
              top: 'hoodie',
              goggles: true,
            },
            voice: 'Sadachbia',
          },
        },
        `
> kid: 你 玩 过 虚拟现实 游戏 吗 ？ | Have you ever played a VR game?
+ 玩 过 ！ 我 非常 喜欢 。 | Yes! I love them.
~ 没 玩 过 。 | Never. | Then today is the day.
- 我 是=am 游戏 。 | I am a game. | You play games; you are not one.
> kid: 我们 一起 玩 吧 ！ 这 是 太空 游戏 。 | Let's play together! It's a space game.
+ 太 好 了 ！ 我 喜欢 太空 。 | Great! I love space.
- 我 不 喜欢 玩 。 | I don't like playing. | Come on!
> kid: 你 戴 眼镜 ， 我 开 飞船 。 | You put on the headset, I'll fly the ship.
+ 好 ！ 外星人 来 了 ！ 开火 ！ | OK! Aliens incoming! Fire!
- 好 ！ 我 吃 眼镜 。 | OK! I'll eat the headset. | 戴 is to wear.
> kid: 我们 赢 了 ！ 你 太 厉害 了 ！ | We won! You're amazing!
+ 你 也 很 厉害 ！ 再 玩 一 次 ？ | You too! Another round?
- 我们 输 了 。 | We lost. | You won! 赢 is win; 输 is lose.
`,
      ),
      scene(
        'sh-goodbye',
        'Goodbye',
        'Your last night. Xiao Li calls you on WeChat from Chengdu.',
        { li: XIAO_LI },
        `
> li: 你 明天 回 {home} 吗 ？ | Are you going back to {home} tomorrow?
+ 对 ， 明天 上午 的 飞机 。 | Yes, a morning flight.
- 对 ， 明天 上午 的 火车 。 | Yes, a morning train. | You fly: 飞机.
> li: 你 的 中文 越来越 好 了 ！ | Your Chinese is getting better and better!
+ 谢谢 ！ 我 会=will 一直 学 中文 。 | Thanks! I'll keep learning Chinese.
- 对 ， 我 是=am 中国 人 。 | Yes, I'm Chinese. | Not quite yet!
> li: 下次 来 中国 ， 一定 要 来 找=see 我 ！ | Next time you're in China, you must come and see me!
+ 一定 ！ 我 会=will 想=miss 你 的=(!) 。 | Definitely! I'll miss you.
- 一定 ！ 我 想 吃 你 。 | Definitely! I want to eat you. | 想 is also miss: 我会想你的.
> li: 一路平安 ！ 保重 ！ | Safe journey! Take care!
+ 谢谢 ， 你 也 保重 ！ 再见 ！ | Thanks, you take care too! Bye!
`,
      ),
    ],
  },
]

export const SCENES = CITIES.flatMap((c) => c.scenes)
