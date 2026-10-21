import type { Look } from '../pixel/portraits'

// The office: a working day at a desk, ten tasks long. Colleagues send
// messages, voice messages and calls; the player replies, or does what was
// asked (hands a document to the right person, puts a meeting in the
// calendar, notes a number). A good day gets the player promoted, and each
// rank has tasks of its own, harder and more by ear. games/office.tsx
// plays it; lib/office.ts keeps the rules.
//
// Each task is a small script, one row a line:
//
//   = coffee chat                  a task and how it comes: chat (a
//                                  message to read), voice (a voice
//                                  message), call (the phone), meet (a
//                                  meeting, several speaking), pass (the
//                                  boss's order, to pass on to the team)
//   liu: 你好 ！ | Hi!             someone says this; before the answers,
//                                  the task, after them, what is said to
//                                  the right answer
//   @ Who gets it?                 what to do, in English, for a pick
//   + 好的 。 | OK.               the right reply
//   - 不 好 。 | No.               a wrong one
//   ? 咖啡 | 牛奶 | 可乐 | 豆浆    something to pick, the right one first:
//                                  people, things, times, numbers
//
// Wrong answers are as long as the right one, so the length heard gives
// nothing away: a pick's choices have as many syllables each, and a wrong
// reply is within two of the right one (tests/app.test.ts checks).
// Lines are written word by word, as the trip's are (lib/text.ts).

export type Kind = 'chat' | 'voice' | 'call' | 'meet' | 'pass'

export interface Said {
  by: string
  zh: string
  en: string
}

export interface Reply {
  zh: string
  en: string
  right: boolean
}

export interface Task {
  id: string
  rank: number
  kind: Kind
  // What is said before the answers
  lines: Array<Said>
  prompt?: string
  // Replies to choose from, or things to pick (the right one first)
  replies: Array<Reply>
  pick: Array<string>
  // What is said to the right answer
  after: Array<Said>
}

// Who works here, and the client: how each is named in Chinese, the voice
// they speak in (data/voices.ts) and how they look
export interface Person {
  name: string
  zh: string
  voice: string
  look: Look
  // She or he, for the lines that say which
  she?: true
}

export const CAST: Record<string, Person> = {
  wang: {
    name: 'Director Wang',
    zh: '王 总',
    voice: 'Director Wang',
    look: {
      style: 'parted',
      old: true,
      glasses: true,
      coat: '#2b3140',
      clothes: 'suit',
      accent: '#c8372d',
      expression: 'smile',
    },
  },
  liu: {
    name: 'Manager Liu',
    zh: '刘 经理',
    voice: 'Manager Liu',
    she: true,
    look: {
      style: 'bob',
      coat: '#7a3b52',
      clothes: 'suit',
      earrings: '#e8b84a',
    },
  },
  zhao: {
    name: 'Manager Zhao',
    zh: '赵 经理',
    voice: 'Manager Zhao',
    look: {
      style: 'short',
      glasses: true,
      coat: '#3b4a5e',
      clothes: 'suit',
      accent: '#2f6f9f',
      expression: 'stern',
    },
  },
  zhou: {
    name: 'Manager Zhou',
    zh: '周 经理',
    voice: 'Manager Zhou',
    she: true,
    look: { style: 'pony', coat: '#2f7d6d', clothes: 'jacket' },
  },
  chen: {
    name: 'Xiao Chen',
    zh: '小 陈',
    voice: 'Xiao Chen',
    look: {
      style: 'spiky',
      coat: '#e07a2a',
      clothes: 'hoodie',
      expression: 'grin',
    },
  },
  lin: {
    name: 'Xiao Lin',
    zh: '小 林',
    voice: 'Xiao Lin',
    she: true,
    look: { style: 'long', glasses: true, coat: '#c86a8a', clothes: 'jacket' },
  },
  sun: {
    name: 'Mr Sun',
    zh: '孙 先生',
    voice: 'Mr Sun',
    look: {
      style: 'buzz',
      coat: '#4a3a2a',
      clothes: 'suit',
      accent: '#d9a531',
      moustache: true,
    },
  },
}

// The player's replies are spoken in the trip's voice for them
export const REPLY_VOICE = 'Puck'

// What the one who asked says to a wrong reply, and to a wrong pick
export const HUH = { zh: '啊 ？ 你 说 什么 ？', en: 'Huh? What did you say?' }
export const NOT_THAT = { zh: '不 对 吧 ？', en: "That's not right, is it?" }

// The ranks, from the first day on: each pays more for a task done right
// the first time, and has tasks of its own
export interface Rank {
  zh: string
  title: string
  // The character on its seal
  seal: string
  pay: number
  // What Director Wang says on promoting the player to it
  promoted?: Said
}

export const RANKS: Array<Rank> = [
  { zh: '实习生', title: 'Intern', seal: '实', pay: 50 },
  {
    zh: '职员',
    title: 'Clerk',
    seal: '职',
    pay: 100,
    promoted: {
      by: 'wang',
      zh: '恭喜 你 ！ 你 工作 很 好 ， 现在 你 是 我们 的 职员 了 。',
      en: "Congratulations! You've worked very well; now you're one of our staff.",
    },
  },
  {
    zh: '经理',
    title: 'Manager',
    seal: '经',
    pay: 300,
    promoted: {
      by: 'wang',
      zh: '恭喜 你 ！ 你 升职 了 ， 现在 你 是 经理 了 ！',
      en: "Congratulations! You've been promoted: now you're a manager!",
    },
  },
  {
    zh: '总经理',
    title: 'General manager',
    seal: '总',
    pay: 1000,
    promoted: {
      by: 'wang',
      zh: '恭喜 你 ！ 我 要 休息 了 ， 公司 交给 你 了 ！',
      en: "Congratulations! I'm going to rest now: the company is yours!",
    },
  },
]

// A day is this many tasks, from nine in the morning to six
export const DAY = 10
// Promoted after a day with no more misses than this, or this many right
// in a row at the rank (a miss: a wrong first answer, or the words shown)
export const MISSES_ALLOWED = 1
export const STREAK = 15

function parse(rank: number, script: string): Array<Task> {
  const tasks: Array<Task> = []
  let task: Task | null = null
  for (const raw of script.trim().split('\n')) {
    const row = raw.trim()
    if (!row) continue
    const sign = row[0]
    const body = row.slice(1).trim()
    if (sign === '=') {
      const [id, kind] = body.split(/\s+/)
      task = {
        id,
        rank,
        kind: kind as Kind,
        lines: [],
        replies: [],
        pick: [],
        after: [],
      }
      tasks.push(task)
      continue
    }
    if (!task) throw new Error(`A row before any task: ${row}`)
    const answered = task.replies.length > 0 || task.pick.length > 0
    if (sign === '@') task.prompt = body
    else if (sign === '+' || sign === '-') {
      const [zh, en] = body.split('|').map((s) => s.trim())
      task.replies.push({ zh, en, right: sign === '+' })
    } else if (sign === '?') task.pick = body.split('|').map((s) => s.trim())
    else {
      const colon = row.indexOf(':')
      const [zh, en] = row
        .slice(colon + 1)
        .split('|')
        .map((s) => s.trim())
      const said = { by: row.slice(0, colon).trim(), zh, en }
      if (answered) task.after.push(said)
      else task.lines.push(said)
    }
  }
  return tasks
}

// --- The intern: messages to read, and errands ---

const INTERN = `
= coffee chat
liu: 你好 ！ 请 给 我 一 杯 咖啡 。 | Hi! A coffee for me, please.
@ What does she want?
? 咖啡 | 牛奶 | 可乐 | 豆浆
liu: 谢谢 ！ | Thanks!

= tea chat
wang: 我 想 喝 茶 。 | I'd like some tea.
+ 好的 ， 我 马上 去 。 | Of course, I'll go right away.
- 好的 ， 我 不 喝 茶 。 | OK, I don't drink tea.
- 我 也 很 喜欢 咖啡 。 | I like coffee a lot too.
wang: 谢谢 你 。 | Thank you.

= document chat
liu: 这 份=(copy) 文件 交给 赵 经理 。 | Give this document to Manager Zhao.
@ Who gets the document?
? 赵 经理 | 周 经理 | 刘 经理 | 孙 先生
zhao: 好 ， 谢谢 ！ | Good, thanks!

= book chat
zhou: 这 本 书 是 小 陈 的 ， 请 给 他 。 | This book is Xiao Chen's; please give it to him.
@ Whose book is it?
? 小 陈 | 小 林 | 王 总
chen: 啊 ， 我 的 书 ！ 谢谢 ！ | Ah, my book! Thanks!

= new chat
chen: 你好 ！ 你 是 新 来 的 吗 ？ | Hi! Are you new here?
+ 是 ， 我 是 实习生 。 | Yes, I'm the intern.
- 不 ， 我 是 新 来 的 。 | No, I'm new here.
- 我 很 好 ， 谢谢 你 。 | I'm fine, thank you.
chen: 欢迎 ！ 我 叫 小 陈 。 | Welcome! I'm Xiao Chen.

= lunch chat
chen: 我们 一起 去 吃饭 吧 ？ | Shall we go and eat together?
+ 好 啊 ， 几 点 去 ？ | Sure, what time?
- 好 啊 ， 我 不 饿 。 | Sure, I'm not hungry.
- 不客气 ， 再见 ！ | You're welcome, goodbye!
chen: 十二 点 ， 我 来 找 你 ！ | At twelve; I'll come and find you!

= floor chat
zhao: 请问 ， 会议室 在 几 楼 ？ | Excuse me, which floor is the meeting room on?
+ 在 三 楼 。 | On the third floor.
- 在 三 点 。 | At three o'clock.
- 三 个 人 。 | Three people.
zhao: 好 ， 谢谢 ！ | Good, thanks!

= print chat
liu: 请 打印 这 份=(copy) 文件 ， 打印 三 份=(copies) 。 | Please print this document: three copies.
@ How many copies?
? 三 份 | 四 份 | 两 份 | 十 份
liu: 谢谢 ， 辛苦 了 ！ | Thanks, good work!

= called chat
chen: 王 总 找 你 ！ 他 在 办公室 。 | Director Wang is looking for you! He's in his office.
+ 好 ， 我 马上 去 。 | OK, I'll go straight away.
- 好 ， 我 马上 吃 。 | OK, I'll eat straight away.
- 好 ， 他 很 有名 。 | OK, he's very famous.
wang: 你 来 了 ！ 请 坐 。 | There you are! Have a seat.

= three chat
liu: 下午 三 点 开会 ， 别 迟到 ！ | Meeting at three this afternoon. Don't be late!
@ When is the meeting?
? 下午 三 点 | 下午 四 点 | 下午 两 点 | 上午 十 点
liu: 好 ， 下午 见 。 | Good, see you this afternoon.

= busy chat
zhou: 你 现在 忙 吗 ？ 可以 帮 我 一下 吗 ？ | Are you busy now? Could you help me for a moment?
+ 不 忙 ， 我 来 帮 你 。 | Not busy; I'll help you.
- 不 忙 ， 我 来 吃饭 。 | Not busy; I've come to eat.
- 不客气 ， 没关系 。 | You're welcome; never mind.
zhou: 太 好 了 ， 谢谢 你 ！ | Great, thank you!

= parcel chat
chen: 前台 有 你 的 快递 。 | There's a parcel for you at the front desk.
+ 好 ， 我 现在 去 。 | OK, I'll go now.
- 好 ， 我 现在 睡 。 | OK, I'll sleep now.
- 好 ， 我 是 前台 。 | OK, I'm the front desk.

= cake chat
chen: 今天 是 刘 经理 的 生日 ！ 请 你 去 买 一 个 蛋糕 。 | It's Manager Liu's birthday today! Please go and buy a cake.
@ What do you buy?
? 蛋糕 | 电脑 | 快递 | 手机
liu: 蛋糕 ！ 谢谢 你们 ！ | A cake! Thank you all!

= computer chat
zhou: 我 的 电脑 坏 了 ！ 怎么办 ？ | My computer's broken! What shall I do?
+ 放心 ， 我 来 看 一下 。 | Don't worry, let me take a look.
- 放心 ， 我 也 没有 电脑 。 | Don't worry, I haven't got a computer either.
- 放心 ， 现在 三 点 。 | Don't worry, it's three o'clock.
zhou: 谢谢 ！ 你 真 好 。 | Thanks! That's kind of you.

= password chat
chen: 你 知道 网 的 密码 吗 ？ | Do you know the wifi password?
+ 知道 ， 我 写 给 你 。 | Yes, I'll write it down for you.
- 知道 ， 他 叫 小 陈 。 | Yes, he's called Xiao Chen.
- 知道 ， 现在 三 点 。 | Yes, it's three o'clock.
chen: 谢谢 ！ | Thanks!

= home chat
liu: 六 点 了 ， 下班 吧 ！ | It's six. Time to go home!
+ 好的 ， 明天 见 ！ | OK, see you tomorrow!
- 好的 ， 早上 好 ！ | OK, good morning!
- 好的 ， 欢迎 你 ！ | OK, welcome!
liu: 明天 见 ！ | See you tomorrow!

= umbrella chat
chen: 下雨 了 ！ 你 有 伞 吗 ？ | It's raining! Have you got an umbrella?
+ 有 ， 我 有 两 把 。 | Yes, I've got two.
- 有 ， 我 有 两 张 。 | Yes, I've got two (sheets).
- 有 ， 我 有 两 杯 。 | Yes, I've got two (cups).
chen: 太 好 了 ！ 谢谢 ！ | Great! Thanks!

= leave chat
zhao: 小 林 为什么 还 没 来 ？ | Why hasn't Xiao Lin come yet?
+ 她 今天 请假 了 。 | She's taken the day off.
- 她 今天 加班 了 。 | She's working late today.
- 她 今天 是 老师 。 | She's a teacher today.
zhao: 好 ， 知道 了 。 | All right, I see.

= visitor chat
sun: 你好 ， 我 找 刘 经理 。 | Hello, I'm looking for Manager Liu.
+ 请 进 ， 她 在 会议室 。 | Come in, she's in the meeting room.
- 请 进 ， 她 在 火车站 。 | Come in, she's at the station.
- 请 坐 ， 我 是 刘 经理 。 | Have a seat, I'm Manager Liu.
sun: 好 ， 谢谢 。 | Good, thanks.

= coffees chat
zhou: 我们 在 开会 ， 请 给 我们 四 杯 咖啡 。 | We're in a meeting; please bring us four coffees.
@ How many coffees?
? 四 杯 | 十 杯 | 两 杯 | 三 杯
zhou: 谢谢 ！ | Thanks!

= report chat
wang: 这 份=(copy) 报告 很 好 ！ 是 谁 写 的 ？ | This report is very good! Who wrote it?
+ 是 我 写 的 。 | I wrote it.
- 是 我 买 的 。 | I bought it.
- 是 我 吃 的 。 | I ate it.
wang: 很 好 ！ 你 很 聪明 。 | Very good! You're clever.
`

// --- The clerk: voice messages and calls, the calendar, numbers ---

const CLERK = `
= calendar voice
liu: 星期 三 下午 两 点 开会 。 | There's a meeting on Wednesday at two in the afternoon.
@ Put it in the calendar.
? 星期 三 下午 两 点 | 星期 四 下午 两 点 | 星期 三 下午 四 点 | 星期 二 下午 两 点

= number call
sun: 你好 ， 我 是 孙 先生 。 请 刘 经理 给=to 我 打电话 。 | Hello, this is Mr Sun. Please ask Manager Liu to call me.
sun: 我 的 号码 是 八三五六 。 | My number is 8356.
@ Note down his number.
? 八三五六 | 八五三六 | 三八五六 | 八三五八
sun: 谢谢 ， 再见 ！ | Thanks, goodbye!

= cancelled call
zhou: 我 是 周 经理 。 请 告诉 赵 经理 ， 明天 的 会议 取消 了 。 | This is Manager Zhou. Please tell Manager Zhao that tomorrow's meeting is cancelled.
@ Who needs to hear it?
? 赵 经理 | 刘 经理 | 孙 先生 | 周 经理
zhao: 取消 了 ？ 好 ， 谢谢 。 | Cancelled? All right, thanks.

= client voice
wang: 明天 上午 十 点 ， 我们 和 孙 先生 见面 。 | Tomorrow at ten in the morning we're meeting Mr Sun.
@ Put it in the calendar.
? 明天 上午 十 点 | 今天 上午 十 点 | 明天 上午 九 点 | 明天 下午 四 点

= moved voice
liu: 会议 改 到 下午 四 点 半 。 | The meeting has been moved to half past four.
@ When is the meeting now?
? 下午 四 点 半 | 下午 两 点 半 | 下午 三 点 半 | 上午 十 点 半

= hotel voice
wang: 我 星期 五 去 上海 出差 ， 请 帮 我 订 酒店 。 | I'm going to Shanghai on business on Friday; please book me a hotel.
@ Where is the hotel?
? 上海 | 北京 | 成都 | 西安
wang: 谢谢 ！ | Thanks!

= overtime voice
liu: 今天 晚上 要 加班 ， 你 可以 吗 ？ | We have to work late tonight. Can you?
+ 可以 ， 没问题 。 | Yes, no problem.
- 可以 ， 不客气 。 | Yes, you're welcome.
- 可以 ， 你 好 吗 ？ | Yes, how are you?
liu: 太 好 了 ， 辛苦 了 ！ | Great, thanks for your hard work!

= finished voice
zhao: 报告 什么 时候 能 写 完 ？ | When will the report be finished?
+ 明天 上午 。 | Tomorrow morning.
- 在 会议室 。 | In the meeting room.
- 两 个 人 写 。 | Two people are writing it.
zhao: 好 ， 我 等 你 。 | Good, I'll wait for it.

= callback voice
chen: 王 总 找 你 ， 他 让 你 给=to 他 打电话 。 | Director Wang was looking for you; he wants you to call him.
@ Who do you call?
? 王 总 | 小 陈 | 小 林
wang: 你好 ！ 你 来 一下 我 的 办公室 。 | Hello! Come to my office for a moment.

= room voice
zhou: 请 帮 我 订 会议室 ， 星期 四 上午 九 点 。 | Please book me the meeting room for Thursday at nine in the morning.
@ Put it in the calendar.
? 星期 四 上午 九 点 | 星期 四 上午 十 点 | 星期 一 上午 九 点 | 星期 四 下午 两 点
zhou: 谢谢 你 ！ | Thank you!

= ill voice
chen: 我 生病 了 ， 今天 不 来 上班 了 。 请 告诉 刘 经理 。 | I'm ill and won't come in today. Please tell Manager Liu.
@ Who needs to hear it?
? 刘 经理 | 赵 经理 | 周 经理 | 孙 先生
liu: 知道 了 ， 谢谢 。 | I see, thank you.

= copies voice
liu: 明天 的 会议 有 十二 个 人 ， 请 打印 十二 份=(copies) 。 | Twelve people are coming to tomorrow's meeting; please print twelve copies.
@ How many copies?
? 十二 份 | 二十 份 | 十一 份 | 十三 份
liu: 谢谢 ！ | Thanks!

= expensive call
sun: 你们 的 价格 太 贵 了 ！ | Your prices are too high!
+ 对不起 ， 我 去 告诉 经理 。 | I'm sorry; I'll tell the manager.
- 对不起 ， 我 也 喜欢 便宜 。 | I'm sorry; I like cheap things too.
- 谢谢 ， 我们 的 也 很 贵 。 | Thanks; ours are expensive too.
sun: 好 ， 我 等 你们 的 电话 。 | Good, I'll wait for your call.

= weekend voice
chen: 这 个 周末 你 有空 吗 ？ 我们 去 看 电影 吧 ！ | Are you free this weekend? Let's go and see a film!
+ 有空 ， 星期 六 去 吧 ！ | I'm free; let's go on Saturday!
- 有空 ， 星期 六 上班 。 | I'm free; I'm working on Saturday.
- 有空 ， 我 在 上海 出差 。 | I'm free; I'm in Shanghai on business.
chen: 好 ！ 星期 六 见 ！ | Great! See you on Saturday!

= food voice
zhou: 你 去 吃饭 吗 ？ 帮 我 买 一 份 饺子 ， 谢谢 ！ | Are you going to eat? Get me some dumplings, thanks!
@ What does she want?
? 饺子 | 包子 | 面条 | 米饭
zhou: 好吃 ！ 谢谢 ！ | Delicious! Thanks!

= later voice
wang: 后天 下午 三 点 ， 公司 开会 。 | The day after tomorrow at three, the whole company meets.
@ Put it in the calendar.
? 后天 下午 三 点 | 明天 下午 三 点 | 今天 下午 三 点 | 后天 上午 十 点

= airport call
zhao: 我 是 赵 经理 。 我 在 机场 ， 飞机 晚 了 。 | This is Manager Zhao. I'm at the airport; the plane is late.
zhao: 请 告诉 王 总 ， 我 晚上 七 点 到 。 | Please tell Director Wang I'll arrive at seven this evening.
@ When does he arrive?
? 晚上 七 点 | 晚上 九 点 | 晚上 十 点 | 下午 四 点
zhao: 谢谢 ， 再见 ！ | Thanks, goodbye!

= email voice
liu: 我 给 你 发 了 一 个 邮件 ， 你 看 了 吗 ？ | I've sent you an email; have you read it?
+ 看 了 ， 我 马上 回=(reply) 。 | Yes, I'll reply right away.
- 看 了 ， 我 马上 买 。 | Yes, I'll buy it right away.
- 看 了 ， 很 好吃 。 | Yes, it's delicious.
liu: 好 ， 谢谢 ！ | Good, thanks!

= pleased call
sun: 合同 我 看 了 ， 我们 很 满意 ！ | I've read the contract, and we're very pleased!
+ 太 好 了 ， 谢谢 你 ！ | Wonderful, thank you!
- 太 好 了 ， 对不起 ！ | Wonderful, sorry!
- 太 贵 了 ， 谢谢 你 ！ | Too expensive, thank you!
`

// --- The manager: orders to pass on, the team, the client ---

const MANAGER = `
= call pass
wang: 让 小 林 今天 下午 给=to 孙 先生 打电话 。 | Have Xiao Lin call Mr Sun this afternoon.
+ 小 林 ， 今天 下午 给=to 孙 先生 打电话 。 | Xiao Lin, call Mr Sun this afternoon.
- 小 林 ， 明天 下午 给=to 孙 先生 打电话 。 | Xiao Lin, call Mr Sun tomorrow afternoon.
- 小 林 ， 今天 上午 给=to 孙 先生 打电话 。 | Xiao Lin, call Mr Sun this morning.
- 小 林 ， 今天 下午 给=to 赵 经理 打电话 。 | Xiao Lin, call Manager Zhao this afternoon.
lin: 好的 ， 没问题 ！ | Of course, no problem!

= send pass
wang: 这 个 报告 很 重要 ， 让 小 陈 明天 上午 发 给 我 。 | This report is important; have Xiao Chen send it to me tomorrow morning.
+ 小 陈 ， 报告 明天 上午 发 给 王 总 。 | Xiao Chen, send the report to Director Wang tomorrow morning.
- 小 陈 ， 报告 明天 下午 发 给 王 总 。 | Xiao Chen, send the report to Director Wang tomorrow afternoon.
- 小 陈 ， 报告 今天 上午 发 给 王 总 。 | Xiao Chen, send the report to Director Wang this morning.
- 小 陈 ， 合同 明天 上午 发 给 王 总 。 | Xiao Chen, send the contract to Director Wang tomorrow morning.
chen: 好 ， 明天 上午 发 。 | Right, tomorrow morning.

= booking pass
wang: 孙 先生 星期 五 来 ， 请 小 林 订 会议室 。 | Mr Sun is coming on Friday; ask Xiao Lin to book the meeting room.
+ 小 林 ， 请 订 星期 五 的 会议室 。 | Xiao Lin, please book the meeting room for Friday.
- 小 林 ， 请 订 星期 四 的 会议室 。 | Xiao Lin, please book the meeting room for Thursday.
- 小 林 ， 请 订 星期 五 的 飞机 票 。 | Xiao Lin, please book a plane ticket for Friday.
- 小 林 ， 请 订 星期 五 的 酒店 。 | Xiao Lin, please book a hotel for Friday.
lin: 好的 ！ | Of course!

= late voice
chen: 经理 ， 对不起 ， 我 今天 会 迟到 半 个 小时 。 | Sorry, I'll be half an hour late today.
+ 没关系 ， 小心 一点 。 | Never mind; take care.
- 没关系 ， 我 不 认识 你 。 | Never mind; I don't know you.
- 不客气 ， 小心 一点 。 | You're welcome; take care.
chen: 谢谢 经理 ！ | Thank you!

= delivery call
sun: 你们 的 快递 还 没有 到 ！ | Your delivery still hasn't arrived!
+ 对不起 ， 我 马上 问 一下 。 | I'm sorry; I'll find out right away.
- 对不起 ， 我 马上 吃 一下 。 | I'm sorry; I'll eat it right away.
- 谢谢 ， 我们 的 快递 很 快 。 | Thanks; our deliveries are quick.
sun: 好 ， 我 等 你 的 电话 。 | Good, I'll wait for your call.

= cheaper call
sun: 这 个 价格 我们 觉得 太 贵 了 。 便宜 一点 ， 可以 吗 ？ | We think the price is too high. Could it be a little cheaper?
+ 我们 可以 便宜 一点 。 | We can make it a little cheaper.
- 我们 可以 贵 一点 。 | We can make it a little dearer.
- 我们 可以 慢 一点 。 | We can make it a little slower.
sun: 太 好 了 ！ | Excellent!

= contract voice
wang: 合同 你 看 了 吗 ？ 有 问题 吗 ？ | Have you read the contract? Any problems?
+ 看 了 ， 没有 问题 。 | Yes, there are no problems.
- 看 了 ， 没有 合同 。 | Yes, there's no contract.
- 看 了 ， 没有 时间 。 | Yes, there's no time.
wang: 好 ， 那=then 我们 今天 签 。 | Good, then we'll sign today.

= howmany voice
lin: 经理 ， 这 份=(copy) 报告 要 打印 几 份=(copies) ？ | How many copies of this report should I print?
+ 打印 十 份=(copies) 吧 。 | Print ten.
- 打印 十 点 吧 。 | Print at ten o'clock.
- 打印 十 楼 吧 。 | Print the tenth floor.
lin: 好的 。 | All right.

= done voice
chen: 经理 ， 报告 我 写 完 了 ！ | I've finished the report!
+ 太 好 了 ， 辛苦 了 ！ | Great, good work!
- 太 好 了 ， 对不起 ！ | Great, sorry!
- 太 贵 了 ， 辛苦 了 ！ | Too expensive, good work!

= trip voice
wang: 下 个=next 星期 你 去 北京 出差 ， 星期 三 去 ， 星期 五 回来 。 | Next week you're going to Beijing on business: there on Wednesday, back on Friday.
@ When do you come back?
? 星期 五 | 星期 三 | 星期 四 | 星期 六
wang: 一路平安 ！ | Have a good trip!

= early voice
lin: 经理 ， 今天 我们 要 加班 吗 ？ | Do we have to work late today?
+ 不用 ， 今天 早 一点 下班 。 | No need; finish a little early today.
- 不用 ， 今天 早 一点 上班 。 | No need; come to work a little early today.
- 不用 ， 今天 早 一点 吃 早饭 。 | No need; have breakfast a little early today.
lin: 太 好 了 ！ 谢谢 经理 ！ | Great! Thank you!

= welcome meet
sun: 你好 ！ 我 是 孙 先生 ， 第一 次 来 你们 公司 。 | Hello! I'm Mr Sun, here at your company for the first time.
+ 欢迎 欢迎 ！ 请 进 ， 请 坐 。 | Welcome! Come in, have a seat.
- 欢迎 欢迎 ！ 请 走 ， 请 坐 。 | Welcome! Please go, have a seat.
- 再见 再见 ！ 请 进 ， 请 坐 。 | Goodbye! Come in, have a seat.
sun: 谢谢 ！ | Thank you!

= movedon pass
wang: 告诉 小 陈 ， 会议 改 到 星期 四 下午 。 | Tell Xiao Chen the meeting has moved to Thursday afternoon.
+ 小 陈 ， 会议 改 到 星期 四 下午 。 | Xiao Chen, the meeting has moved to Thursday afternoon.
- 小 陈 ， 会议 改 到 星期 四 上午 。 | Xiao Chen, the meeting has moved to Thursday morning.
- 小 陈 ， 会议 改 到 星期 一 下午 。 | Xiao Chen, the meeting has moved to Monday afternoon.
- 小 陈 ， 生日 改 到 星期 四 下午 。 | Xiao Chen, the birthday has moved to Thursday afternoon.
chen: 好的 ， 知道 了 ！ | Right, got it!

= mother voice
lin: 经理 ， 我 可以 请假 吗 ？ 我 妈妈 生病 了 。 | May I take some time off? My mother is ill.
+ 可以 ， 你 去 吧 。 | Of course; go.
- 可以 ， 你 来 吧 。 | Of course; come here.
- 可以 ， 恭喜 你 。 | Of course; congratulations.
lin: 谢谢 经理 ！ | Thank you!

= price call
sun: 我们 想 买 五百 个 ， 一 个 多少 钱 ？ | We'd like to buy five hundred; how much each?
+ 一 个 二十 块 。 | Twenty kuai each.
- 一共 二十 个 。 | Twenty altogether.
- 一 个 二十 岁 。 | Twenty years old each.
sun: 好 ， 我们 想 一下 。 | Good, we'll think about it.

= sales voice
zhao: 上 个=last 月 我们 卖 了 八百 个 ， 这 个 月 卖 了 九百 个 。 | Last month we sold eight hundred; this month we sold nine hundred.
@ How many this month?
? 九百 | 八百 | 九十 | 七百
zhao: 越来越 好 ！ | Better and better!

= wait pass
wang: 请 小 林 去 前台 等 孙 先生 。 | Ask Xiao Lin to wait for Mr Sun at the front desk.
+ 小 林 ， 请 去 前台 等 孙 先生 。 | Xiao Lin, please go and wait for Mr Sun at the front desk.
- 小 林 ， 请 去 机场 等 孙 先生 。 | Xiao Lin, please go and wait for Mr Sun at the airport.
- 小 林 ， 请 去 前台 等 赵 经理 。 | Xiao Lin, please go and wait for Manager Zhao at the front desk.
- 小 林 ， 请 去 前台 找 你 的 快递 。 | Xiao Lin, please go and fetch your parcel at the front desk.
lin: 好的 ， 我 马上 去 。 | Of course, I'll go now.

= idea voice
chen: 经理 ， 我 有 一 个 新 的 计划 ！ | I've got a new plan!
+ 好 啊 ， 说 说 看 ！ | Great, let's hear it!
- 好 啊 ， 吃 吃 看 ！ | Great, let's taste it!
- 好 啊 ， 再见 ！ | Great, goodbye!
chen: 我们 可以 在 网 上=on 卖 ！ | We could sell online!

= again call
sun: 你们 的 东西 很 好 ， 我们 下 个=next 月 还 要 买 。 | Your goods are very good; we'll buy more next month.
+ 谢谢 ， 我们 等 你 的 电话 。 | Thank you; we'll wait for your call.
- 谢谢 ， 我们 没有 东西 。 | Thank you; we haven't got any goods.
- 对不起 ， 我们 不 卖 了 。 | Sorry, we've stopped selling.

= prices voice
wang: 孙 先生 要 我们 的 价格 ， 请 你 发 邮件 给 他 。 | Mr Sun wants our prices; please send him an email.
@ Who gets the email?
? 孙 先生 | 赵 经理 | 刘 经理 | 周 经理
sun: 收到 了 ， 谢谢 ！ | Got it, thanks!
`

// --- The general manager: meetings, big numbers, decisions ---

const DIRECTOR = `
= target meet
liu: 这 个 月 我们 卖 了 两万 个 。 | This month we sold twenty thousand.
zhao: 下 个=next 月 我们 想 卖 三万 个 。 | Next month we want to sell thirty thousand.
@ How many next month?
? 三万 | 两万 | 三千 | 四万

= computers meet
zhou: 我们 需要 十 个 新 电脑 。 | We need ten new computers.
chen: 一 个 电脑 五千 块 。 | A computer is five thousand kuai.
@ How much altogether?
? 五万 | 五千 | 十万 | 五百

= deal meet
sun: 一 个 三十 块 太 贵 了 。 二十 块 ， 可以 吗 ？ | Thirty each is too much. How about twenty?
+ 二十五 块 ， 怎么样 ？ | How about twenty-five?
- 三十五 块 ， 怎么样 ？ | How about thirty-five?
- 十五 块 ， 怎么样 ？ | How about fifteen?
sun: 好 ， 成交 ！ | All right, it's a deal!

= trips meet
zhao: 星期 一 我 去 上海 出差 。 | On Monday I'm going to Shanghai on business.
liu: 我 星期 二 去 北京 。 | I'm going to Beijing on Tuesday.
@ Who is going to Shanghai?
? 赵 经理 | 刘 经理 | 周 经理 | 孙 先生

= rest voice
zhou: 我们 都 很 累 ， 这 个 周末 还 要 加班 吗 ？ | We're all very tired. Do we still have to work this weekend?
+ 不用 了 ， 周末 休息 吧 。 | No need; rest at the weekend.
- 不用 了 ， 周末 加班 吧 。 | No need; work at the weekend.
- 不用 了 ， 周末 开会 吧 。 | No need; meet at the weekend.
zhou: 太 好 了 ！ 谢谢 ！ | Wonderful! Thank you!

= orders meet
zhao: 北京 的 客户 要 买 六千 个 。 | The client in Beijing wants to buy six thousand.
chen: 上海 的 客户 要 买 四千 个 。 | The client in Shanghai wants to buy four thousand.
@ How many altogether?
? 一万 | 六千 | 四千 | 两万

= signed call
sun: 合同 我们 签 了 ， 明天 发 给 你们 。 | We've signed the contract; we'll send it to you tomorrow.
+ 太 好 了 ， 谢谢 孙 先生 ！ | Excellent, thank you, Mr Sun!
- 太 贵 了 ， 谢谢 孙 先生 ！ | Too expensive, thank you, Mr Sun!
- 太 好 了 ， 对不起 孙 先生 ！ | Excellent, sorry, Mr Sun!

= promote voice
liu: 小 林 工作 非常 好 ， 我们 让 她 升职 吗 ？ | Xiao Lin works extremely well; shall we promote her?
+ 好 ， 让 她 升职 吧 ！ | Yes, let's promote her!
- 好 ， 让 她 请假 吧 ！ | Yes, let's give her time off!
- 好 ， 让 她 迟到 吧 ！ | Yes, let her be late!
lin: 谢谢 ！ 我 会 加油 的 ！ | Thank you! I'll do my best!

= hundred meet
liu: 上 个=last 月 我们 卖 了 八万 个 。 | Last month we sold eighty thousand.
zhou: 这 个 月 我们 卖 了 十万 个 ！ | This month we sold a hundred thousand!
@ How many this month?
? 十万 | 八万 | 一万 | 六万

= norway call
sun: 我 下 个=next 星期 去 挪威 ， 我们 星期 四 见面 ， 好 吗 ？ | I'm going to Norway next week; shall we meet on Thursday?
+ 好的 ， 星期 四 见 ！ | Good, see you on Thursday!
- 好的 ， 星期 四 不 行 ！ | Good, Thursday's no good!
- 好的 ， 星期 四 走 吧 ！ | Good, let's leave on Thursday!
sun: 星期 四 见 ！ | See you on Thursday!

= budget meet
zhao: 这 个 计划 需要 两万 块 。 | This plan needs twenty thousand kuai.
zhou: 我们 只 有 一万五千 块 。 | We've only got fifteen thousand.
@ How much is missing?
? 五千 | 五万 | 三千 | 五百

= dinner voice
lin: 王 总 想 和 你 吃饭 ， 星期 五 晚上 七 点 。 | Director Wang would like to have dinner with you, on Friday at seven in the evening.
@ Put it in the calendar.
? 星期 五 晚上 七 点 | 星期 五 晚上 十 点 | 星期 四 晚上 七 点 | 星期 五 早上 七 点

= broken call
sun: 你们 的 东西 坏 了 三百 个 ！ | Three hundred of your goods arrived broken!
+ 对不起 ， 我们 马上 送 新 的 。 | I'm sorry; we'll send new ones right away.
- 对不起 ， 我们 马上 送 坏 的 。 | I'm sorry; we'll send broken ones right away.
- 没关系 ， 我们 马上 送 新 的 。 | Never mind; we'll send new ones right away.
sun: 好 ， 谢谢 。 | Good, thank you.

= party voice
chen: 下 个=next 月 是 公司 的 生日 ！ 我们 做 什么 ？ | Next month is the company's birthday! What shall we do?
+ 我们 一起 吃饭 吧 ！ | Let's all have a meal together!
- 我们 一起 加班 吧 ！ | Let's all work late together!
- 我们 一起 迟到 吧 ！ | Let's all be late together!
chen: 好 ！ 我 去 订 饭店 ！ | Great! I'll book a restaurant!

= staff meet
liu: 公司 现在 有 八十 个 人 。 | The company has eighty people now.
zhao: 下 个=next 月 我们 想 再 找 二十 个 人 。 | Next month we want to find twenty more.
@ How many will there be?
? 一百 | 八十 | 六十 | 二十

= offer meet
sun: 我们 想 买 一万 个 ， 一 个 十五 块 ， 可以 吗 ？ | We'd like to buy ten thousand, at fifteen each. All right?
zhao: 十五 块 太 便宜 了 。 | Fifteen is too cheap.
+ 十八 块 ， 怎么样 ？ | How about eighteen?
- 十二 块 ， 怎么样 ？ | How about twelve?
- 五十 块 ， 怎么样 ？ | How about fifty?
sun: 十八 块 … 好 ， 成交 ！ | Eighteen… all right, it's a deal!

= thanks voice
zhou: 这 个 月 我们 卖 了 很 多 ！ 我们 都 很 辛苦 。 | We sold a lot this month! We've all worked very hard.
+ 谢谢 你们 ， 今天 早 一点 下班 ！ | Thank you all; finish a little early today!
- 谢谢 你们 ， 今天 晚 一点 下班 ！ | Thank you all; finish a little late today!
- 谢谢 你们 ， 明天 早 一点 上班 ！ | Thank you all; come in a little early tomorrow!
zhou: 谢谢 ！ | Thank you!

= visit voice
wang: 我 来 看 看 你 ！ 公司 怎么样 ？ | I've come to see you! How's the company?
+ 很 好 ， 我们 越来越 大 了 ！ | Very well; we're getting bigger and bigger!
- 很 好 ， 我们 越来越 小 了 ！ | Very well; we're getting smaller and smaller!
- 很 好 ， 我们 越来越 饿 了 ！ | Very well; we're getting hungrier and hungrier!
wang: 太 好 了 ！ 加油 ！ | Wonderful! Keep it up!
`

export const TASKS: Array<Task> = [INTERN, CLERK, MANAGER, DIRECTOR].flatMap(
  (script, rank) => parse(rank, script),
)

// Who says the lines of a task to the player: the last to speak before
// the answers
export const askerOf = (t: Task) => t.lines[t.lines.length - 1].by

// Everything said in the office, for the speech list (data/extra.ts): each
// line in its speaker's voice, the replies in the player's, what anyone
// who asks says to a wrong answer, and the promotions
export function officeSpeech(): Array<{ voice: string; zh: string }> {
  const out: Array<{ voice: string; zh: string }> = []
  for (const t of TASKS) {
    for (const s of [...t.lines, ...t.after])
      out.push({ voice: CAST[s.by].voice, zh: s.zh })
    for (const r of t.replies) out.push({ voice: REPLY_VOICE, zh: r.zh })
  }
  for (const p of Object.values(CAST))
    out.push(
      { voice: p.voice, zh: HUH.zh },
      { voice: p.voice, zh: NOT_THAT.zh },
    )
  for (const r of RANKS)
    if (r.promoted)
      out.push({ voice: CAST[r.promoted.by].voice, zh: r.promoted.zh })
  return out
}
