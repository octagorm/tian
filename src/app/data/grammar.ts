// One pattern of Chinese per scene of the trip, shown before it starts:
// the grammar the scene leans on, in a few lines. Examples are hanzi with
// the mixed-text English in brackets.

export interface Pattern {
  title: string
  text: string
  example: string
}

export const GRAMMAR: Record<string, Pattern | undefined> = {
  'bj-arrival': {
    title: '是 and 吗',
    text: 'A country and 人 make a nationality. 吗 at the end turns a statement into a yes-or-no question, without moving any word.',
    example:
      '我是挪威人。(I am Norway person.) → 你是挪威人吗？(You are Norway person [?])',
  },
  'bj-taxi': {
    title: 'Go to: 去',
    text: '去 is "go to" in one word, so no "to" is needed. 在 is "be at": the hotel you are in, not the one you are going to.',
    example: '去北京酒店 (go Beijing hotel)',
  },
  'bj-hotel': {
    title: 'Questions keep their order',
    text: 'A question word sits where the answer will go. The rest of the sentence does not move.',
    example:
      '早饭几点？(breakfast what o’clock?) – 早饭七点。(breakfast seven o’clock.)',
  },
  'bj-breakfast': {
    title: 'Measure words',
    text: 'Between a number and a thing comes a measure word: 个 for most things, 杯 for cups, 根 for long thin things. Two is 两, not 二, before a measure word.',
    example: '两个包子，一杯豆浆 (two (item) bun, one cup soy milk)',
  },
  'bj-directions': {
    title: 'Where is…: 在哪儿',
    text: 'The thing comes first, then 在 (is at), then the place – or 哪儿, where?',
    example: '天安门在哪儿？(Tiananmen is-at where?)',
  },
  'bj-wall': {
    title: '太…了 and a change with 了',
    text: '太…了 is "so…!" or "too…". 了 at the end of a sentence says something has changed: now it is so.',
    example:
      '太长了！(too long!) · 我现在是好汉了。(I now am hero – I was not before.)',
  },
  'qf-temple': {
    title: 'When before, how long after',
    text: 'A time word goes before the verb. How long something lasts goes after it.',
    example: '明天有考试 (tomorrow have exam) · 学了一个月 (learnt one month)',
  },
  'xa-train': {
    title: 'Everything that describes comes first',
    text: 'What describes a noun, however long, comes before it, joined by 的.',
    example:
      '明天去西安的票 (tomorrow go Xi’an ’s ticket: a ticket to Xi’an for tomorrow)',
  },
  'xa-food': {
    title: '不要: don’t want, don’t',
    text: '不要 is "not want"; before an adjective with 太 it asks for less.',
    example: '不要太辣 (not want too spicy: not too spicy, please)',
  },
  'xa-warriors': {
    title: '在 + verb: -ing',
    text: '在 before a verb says it is going on now.',
    example: '我在学中文。(I am learning Chinese.)',
  },
  'cd-panda': {
    title: 'Saying yes',
    text: 'Chinese has no single word for yes. Answer with the verb of the question: 喜欢吗？– 喜欢！ (Like? – Like!)',
    example: '你喜欢熊猫吗？– 喜欢！',
  },
  'cd-teahouse': {
    title: '要 + verb: should, want to',
    text: '要 before a verb is "want to", or, as advice, "should".',
    example: '喝茶要慢。(drink tea should slow: tea should be drunk slowly.)',
  },
  'cd-hotpot': {
    title: 'Or: 还是',
    text: 'In a question, "or" is 还是. Offer the two choices, and the listener picks.',
    example: '辣的还是不辣的？(spicy one or not-spicy one?)',
  },
  'gl-bike': {
    title: '吧 softens',
    text: '吧 at the end makes a request or suggestion friendlier: "…, OK?", "let’s…".',
    example: '便宜一点吧！(cheaper a little, OK?)',
  },
  'gl-river': {
    title: '不…也不…',
    text: 'Neither… nor…: put 不 before each, joined by 也 (also).',
    example: '不冷也不热 (not cold also not hot)',
  },
  'sh-metro': {
    title: 'How do I get to…: 怎么走',
    text: '怎么 (how) before a verb asks how to do it.',
    example: '去外滩怎么走？(go Bund how walk?)',
  },
  'sh-books': {
    title: 'Can: 会, 能, 可以',
    text: '会 is a skill you have learnt, 能 is being able to, 可以 is being allowed to.',
    example: '我会说中文 · 我能看懂 · 可以吗？',
  },
  'sh-market': {
    title: 'Bargaining',
    text: 'Price first, then 可以吗? or 好不好? (good not good: all right?). Saying a thing and its opposite is a common way to ask.',
    example: '五十块，好不好？(fifty kuai, good not good?)',
  },
  'sh-vr': {
    title: '过: ever done',
    text: '过 after a verb says you have done it at some time. 没…过: never.',
    example: '你玩过吗？– 没玩过。(you play-ever [?] – not play-ever.)',
  },
  'sh-goodbye': {
    title: '会…的: surely will',
    text: '会 can mean "will"; with 的 at the end it is a promise.',
    example: '我会想你的。(I will miss you, surely.)',
  },
}
