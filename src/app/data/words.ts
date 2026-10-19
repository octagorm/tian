// The word bank's words, in the order they are taught: lessons that follow
// the trip (data/trip.ts), from greetings in Beijing to goodbyes in
// Shanghai. A row is "hanzi | pinyin | gloss | meaning | tags":
//
// - pinyin has one syllable per character, with tone marks and no mark
//   for the neutral tone. 不 and 一 are written in their dictionary tone;
//   lib/pinyin.ts applies the tone changes in context. Erhua (哪儿) is one
//   syllable ending in r.
// - the gloss is the English that stands in for the word in mixed text
//   ("I want two (item) steamed bun"), so it is short and fits Chinese
//   word order. A sentence can give a better one for a single use.
// - the meaning is what the word card says; empty, it is the gloss.
// - tags: mw (measure word), part (particle), q (question word), num,
//   country, place, name, food, drink.

export interface Word {
  id: string
  h: string
  p: string
  g: string
  e: string
  lesson: number
  tags: Array<string>
}

export interface Lesson {
  n: number
  title: string
  zh: string
}

const RAW: Array<[string, string, string]> = [
  [
    'Hello',
    '你好',
    `
你好|nǐ hǎo|hello
谢谢|xiè xie|thanks|thank you
不客气|bù kè qi|you're welcome
再见|zài jiàn|goodbye
对不起|duì bu qǐ|sorry
没关系|méi guān xi|it's OK|never mind, it doesn't matter
请|qǐng|please|please; to invite, to treat
好|hǎo|good|good, well; OK
是|shì|is|to be (am, is, are); yes
不|bù|not|not, no
`,
  ],
  [
    'Me and you',
    '我和你',
    `
我|wǒ|I|I, me
你|nǐ|you
他|tā|he|he, him
她|tā|she|she, her
我们|wǒ men|we|we, us
你们|nǐ men|you all|you (plural)
他们|tā men|they|they, them
人|rén|person|person, people
叫|jiào|am called|to be called; to call
名字|míng zi|name
什么|shén me|what|what?|q
吗|ma|[?]|turns a statement into a yes-or-no question|part
呢|ne|[and…?]|"and what about…?"; softens a question|part
啊|a|ah|ah, oh; softens or livens what is said|part
也|yě|also|also, too
很|hěn|very|very (often just links a subject to an adjective)
`,
  ],
  [
    'Where from',
    '哪国人',
    `
中国|Zhōng guó|China||country
挪威|Nuó wēi|Norway||country
美国|Měi guó|America|the United States||country
英国|Yīng guó|Britain|the United Kingdom||country
德国|Dé guó|Germany||country
法国|Fǎ guó|France||country
瑞典|Ruì diǎn|Sweden||country
日本|Rì běn|Japan||country
哪|nǎ|which|which?|q
国|guó|country
外国人|wài guó rén|foreigner
中文|Zhōng wén|Chinese|the Chinese language
英文|Yīng wén|English|the English language
说|shuō|speak|to speak, to say
会|huì|can|can (a learned skill); will
一点|yī diǎn|a little|a little, a bit
懂|dǒng|understand
`,
  ],
  [
    'Numbers',
    '数字',
    `
一|yī|one||num
二|èr|two||num
三|sān|three||num
四|sì|four||num
五|wǔ|five||num
六|liù|six||num
七|qī|seven||num
八|bā|eight||num
九|jiǔ|nine||num
十|shí|ten||num
零|líng|zero||num
两|liǎng|two|two (of something), before a measure word|num
百|bǎi|hundred||num
千|qiān|thousand||num
几|jǐ|how many|how many? (of a few); a few|q
个|gè|(item)|the everyday measure word, for people and most things|mw
`,
  ],
  [
    'Money',
    '钱',
    `
钱|qián|money
多少|duō shao|how much|how much? how many?|q
块|kuài|kuai|kuai: the yuan, as it is said; also a piece|mw
毛|máo|mao|mao: a tenth of a kuai, as it is said|mw
一共|yī gòng|altogether|in total
买|mǎi|buy
卖|mài|sell
贵|guì|expensive
便宜|pián yi|cheap
太|tài|too|too, excessively
多|duō|many|many, much; more
少|shǎo|few|few, little
了|le|[done]|marks something done or a change: 太贵了 "too expensive!"|part
要|yào|want|to want; will; to need
想|xiǎng|would like|would like to; to think; to miss
有|yǒu|have|to have; there is
没有|méi yǒu|don't have|not have; there isn't; didn't
这|zhè|this
那|nà|that
这个|zhè ge|this one|this, this one
那个|nà ge|that one|that, that one
给|gěi|give|to give; for
可以|kě yǐ|can|may, can (allowed); OK
能|néng|can|can, be able to
`,
  ],
  [
    'Breakfast',
    '早饭',
    `
吃|chī|eat
喝|hē|drink
水|shuǐ|water||drink
茶|chá|tea||drink
咖啡|kā fēi|coffee||drink
豆浆|dòu jiāng|soy milk||drink
包子|bāo zi|steamed bun|steamed bun with a filling||food
油条|yóu tiáo|fried dough stick|youtiao, a long fried dough stick||food
鸡蛋|jī dàn|egg||food
杯|bēi|cup|cup, glass; measure word for drinks|mw
根|gēn|(stick)|measure word for long, thin things|mw
和|hé|and|and, with
还|hái|also|also, in addition; still
别的|bié de|anything else|other, something else
就|jiù|just|just, only; then, right away
吧|ba|[OK?]|suggests, or asks for agreement: 好吧 "all right then"|part
的|de|'s|of, 's; joins a description to what it describes|part
好的|hǎo de|OK|OK, all right
`,
  ],
  [
    'Getting around',
    '问路',
    `
去|qù|go|to go (to)
师傅|shī fu|driver|master; polite way to address a driver or craftsman
酒店|jiǔ diàn|hotel
在|zài|at|to be at; at, in; (before a verb) -ing
哪儿|nǎr|where|where?|q
这儿|zhèr|here
那儿|nàr|there
请问|qǐng wèn|excuse me|excuse me, may I ask…
往|wǎng|toward|toward, to
前|qián|front|front, forward
走|zǒu|walk|to walk, to go; to leave
左|zuǒ|left
右|yòu|right
拐|guǎi|turn
一直|yī zhí|straight on|straight ahead; all along
远|yuǎn|far
近|jìn|near|near, close
到|dào|arrive|to arrive; to, until
路口|lù kǒu|crossing|crossing, junction
天安门|Tiān ān mén|Tiananmen|Tiananmen, the Gate of Heavenly Peace||place
厕所|cè suǒ|toilet
扫|sǎo|scan|to scan; to sweep
微信|Wēi xìn|WeChat|WeChat, the app for chat and paying
付|fù|pay
现金|xiàn jīn|cash
`,
  ],
  [
    'The hotel',
    '酒店',
    `
欢迎|huān yíng|welcome
房间|fáng jiān|room
晚上|wǎn shang|evening|evening, night
天|tiān|day|day; sky
住|zhù|stay|to stay, to live
护照|hù zhào|passport
号|hào|number|number; day of the month
楼|lóu|floor|floor, storey; building
钥匙|yào shi|key
早饭|zǎo fàn|breakfast
点|diǎn|o'clock|o'clock; dot; to order (food)
早上|zǎo shang|morning|early morning
网|wǎng|Wi-Fi|net; the internet, Wi-Fi
密码|mì mǎ|password|password, PIN
先生|xiān sheng|Mr|Mr, sir; husband
王|Wáng|Wang|Wang, a surname||name
`,
  ],
  [
    'Eating out',
    '饭店',
    `
饭店|fàn diàn|restaurant
服务员|fú wù yuán|waiter|waiter, waitress
菜单|cài dān|menu
菜|cài|dish|dish; vegetable
米饭|mǐ fàn|rice|cooked rice||food
面条|miàn tiáo|noodles||food
饺子|jiǎo zi|dumplings||food
牛肉面|niú ròu miàn|beef noodles|beef noodle soup||food
汤|tāng|soup||food
牛肉|niú ròu|beef||food
鸡肉|jī ròu|chicken|chicken (meat)||food
羊肉串|yáng ròu chuàn|lamb skewer|lamb kebab on a skewer||food
火锅|huǒ guō|hotpot|hotpot, cooked at the table||food
啤酒|pí jiǔ|beer||drink
可乐|kě lè|cola||drink
碗|wǎn|bowl|bowl; measure word for food in bowls|mw
盘|pán|plate|plate; measure word for dishes|mw
瓶|píng|bottle|bottle; measure word for bottles|mw
份|fèn|portion|portion, serving|mw
位|wèi|(person)|polite measure word for people|mw
辣|là|spicy|spicy, hot
好吃|hǎo chī|tasty|delicious
饿|è|hungry
渴|kě|thirsty
筷子|kuài zi|chopsticks
干杯|gān bēi|cheers|cheers! (empty the glass)
买单|mǎi dān|the bill|the bill, please; to pay the bill
`,
  ],
  [
    'Time',
    '时间',
    `
今天|jīn tiān|today
明天|míng tiān|tomorrow
昨天|zuó tiān|yesterday
现在|xiàn zài|now
分|fēn|minute|minute (on the clock); a hundredth of a kuai
分钟|fēn zhōng|minutes|minute(s), as a length of time
半|bàn|half
小时|xiǎo shí|hour
上午|shàng wǔ|morning|morning (before noon)
下午|xià wǔ|afternoon
时候|shí hou|time|time, moment: 什么时候 "when?"
早|zǎo|early|early; good morning!
晚|wǎn|late
等|děng|wait
快|kuài|quick|fast, quick; soon
慢|màn|slow
星期|xīng qī|week
月|yuè|month|month; moon
年|nián|year
`,
  ],
  [
    'Trains and planes',
    '坐火车',
    `
火车|huǒ chē|train
火车站|huǒ chē zhàn|station|railway station
票|piào|ticket
张|zhāng|(sheet)|measure word for flat things: tickets, tables, photos|mw
坐|zuò|take|to sit; to take (a train, bus, taxi)
飞机|fēi jī|plane|aeroplane
机场|jī chǎng|airport
出租车|chū zū chē|taxi
地铁|dì tiě|metro|metro, underground
站|zhàn|stop|station, stop; to stand|mw
车|chē|car|car, vehicle
开|kāi|leave|to depart; to drive; to open
北京|Běi jīng|Beijing||place
西安|Xī ān|Xi'an||place
成都|Chéng dū|Chengdu||place
桂林|Guì lín|Guilin||place
上海|Shàng hǎi|Shanghai||place
外滩|Wài tān|the Bund|the Bund, Shanghai's riverfront||place
长城|Cháng chéng|Great Wall|the Great Wall||place
曲阜|Qū fù|Qufu|Qufu, Confucius' home town||place
兵马俑|bīng mǎ yǒng|Terracotta Army|the Terracotta Army, at Xi'an||place
旅游|lǚ yóu|travel|to travel (for fun); tourism
一路平安|yī lù píng ān|safe journey|have a safe trip!
`,
  ],
  [
    'Friends',
    '朋友',
    `
朋友|péng you|friend
认识|rèn shi|know|to know (a person), to meet
高兴|gāo xìng|glad|happy, glad
喜欢|xǐ huan|like
爱|ài|love
觉得|jué de|think|to feel, to think
知道|zhī dào|know|to know (a fact)
工作|gōng zuò|work|work, job; to work
做|zuò|do|to do, to make
学|xué|learn|to learn, to study
学生|xué sheng|student
老师|lǎo shī|teacher
岁|suì|years old|years (of age)
多大|duō dà|how old|how old? how big?|q
家|jiā|home|home; family
真|zhēn|really|really, truly
有意思|yǒu yì si|interesting|interesting, fun
可爱|kě ài|cute
漂亮|piào liang|pretty|pretty, beautiful
累|lèi|tired
一起|yī qǐ|together
哈哈|hā ha|haha
有名|yǒu míng|famous
考试|kǎo shì|exam|exam, test
问|wèn|ask
见|jiàn|see|to see, to meet
小李|Xiǎo Lǐ|Xiao Li|Xiao Li, a friend in Chengdu (小 before a surname is friendly)|name
看|kàn|look|to look, to watch; to read
熊猫|xióng māo|panda
竹子|zhú zi|bamboo
大|dà|big|big; old (of age)
小|xiǎo|small|small, little
非常|fēi cháng|extremely|very, extremely
都|dōu|all|all, both
怎么样|zěn me yàng|how about it|how is it? how about…?|q
为什么|wèi shén me|why|why?|q
还是|hái shi|or|or (in a question); still
但是|dàn shì|but
对|duì|right|right, correct
来|lái|come|to come
`,
  ],
  [
    'Weather and views',
    '天气',
    `
天气|tiān qì|weather
下雨|xià yǔ|rain|to rain
雨|yǔ|rain
伞|sǎn|umbrella
热|rè|hot
冷|lěng|cold
山|shān|mountain|mountain, hill
河|hé|river
美|měi|beautiful|beautiful (of a view)
长|cháng|long
拍照|pāi zhào|take photos|to take a photo
照片|zhào piàn|photo
自行车|zì xíng chē|bike|bicycle
骑|qí|ride|to ride (a bike, a horse)
租|zū|rent|to rent, to hire
老板|lǎo bǎn|boss|boss; shopkeeper
可能|kě néng|maybe|possibly, maybe
帮|bāng|help
手机|shǒu jī|phone|mobile phone
`,
  ],
  [
    'Shopping',
    '买东西',
    `
衣服|yī fu|clothes
件|jiàn|(piece)|measure word for clothes|mw
双|shuāng|pair|pair; measure word for shoes|mw
鞋|xié|shoes|shoe, shoes
帽子|mào zi|hat
颜色|yán sè|colour
红色|hóng sè|red
白色|bái sè|white
黑色|hēi sè|black
蓝色|lán sè|blue
试|shì|try|to try (on)
一下|yī xià|a bit|(after a verb) briefly, a little
怎么|zěn me|how|how?|q
行|xíng|OK|OK, all right: 不行 "no way"
送|sòng|give free|to give as a present; to deliver
找|zhǎo|look for|to look for; to give change
别|bié|don't
最|zuì|most|most, -est
只|zhǐ|only|only, just
`,
  ],
  [
    'Going home',
    '回家',
    `
回|huí|go back|to go back, to return
再|zài|again
下次|xià cì|next time
次|cì|time|time, occurrence: 一次 once|mw
越来越|yuè lái yuè|more and more
一定|yī dìng|definitely|definitely, surely
保重|bǎo zhòng|take care
加油|jiā yóu|keep going|come on! keep it up!
已经|yǐ jīng|already
时间|shí jiān|time|time (as a length)
没|méi|didn't|not (have); didn't
第一|dì yī|first|the first
`,
  ],
  [
    'Space',
    '太空',
    `
太空|tài kōng|space|outer space
星星|xīng xing|star|star (in the sky)
月亮|yuè liang|moon|the moon
太阳|tài yáng|sun|the sun
地球|dì qiú|Earth|the Earth
火星|Huǒ xīng|Mars||place
宇宙|yǔ zhòu|universe
飞船|fēi chuán|spaceship
火箭|huǒ jiàn|rocket
外星人|wài xīng rén|alien
船长|chuán zhǎng|captain|captain (of a ship)
开火|kāi huǒ|fire|to open fire
小心|xiǎo xīn|careful|careful! look out!
危险|wēi xiǎn|danger|dangerous; danger
上|shàng|up|up, above; on; to go up
下|xià|down|down, below; to go down
加速|jiā sù|speed up|to accelerate
停|tíng|stop|to stop
`,
  ],
  [
    'Myth and history',
    '神话和历史',
    `
龙|lóng|dragon
神|shén|god|god, spirit
妖怪|yāo guài|demon|demon, monster
猴子|hóu zi|monkey
孙悟空|Sūn Wù kōng|Sun Wukong|Sun Wukong, the Monkey King||name
师父|shī fu|master|master, teacher (of a disciple)
西游记|Xī yóu jì|Journey to the West|Journey to the West, the 16th-century novel
嫦娥|Cháng é|Chang'e|Chang'e, the goddess who flew to the moon||name
皇帝|huáng dì|emperor
秦始皇|Qín Shǐ huáng|the First Emperor|Qin Shi Huang, who united China in 221 BC||name
历史|lì shǐ|history
故事|gù shi|story
打|dǎ|hit|to hit, to fight; to play (a game)
西|xī|west
东|dōng|east
力量|lì liang|strength|strength, power
好汉|hǎo hàn|hero|a true man, a hero
`,
  ],
  [
    'Ideas',
    '思想',
    `
道|dào|the Way|road; the Way (Dao); to say
孔子|Kǒng zǐ|Confucius||name
老子|Lǎo zǐ|Laozi|Laozi, the sage of the Daodejing||name
哲学|zhé xué|philosophy
思想|sī xiǎng|thought|thought, ideas
人民|rén mín|the people
同志|tóng zhì|comrade
世界|shì jiè|world
自然|zì rán|nature|nature; natural
心|xīn|heart|heart, mind
字|zì|character|a written character; a word
问题|wèn tí|question|question, problem
没问题|méi wèn tí|no problem
哲学家|zhé xué jiā|philosopher
非|fēi|not|not, is not (written)
可|kě|can|can, may (written)
常|cháng|constant|often; constant
`,
  ],
  [
    'Games and music',
    '游戏和音乐',
    `
游戏|yóu xì|game
玩|wán|play|to play, to have fun
音乐|yīn yuè|music
唱歌|chàng gē|sing|to sing (a song)
听|tīng|listen|to listen, to hear
电影|diàn yǐng|film|film, movie
书|shū|book
本|běn|(volume)|measure word for books|mw
科幻|kē huàn|sci-fi|science fiction
三体|Sān tǐ|Three-Body|The Three-Body Problem, Liu Cixin's science-fiction novel|name
赢|yíng|win
输|shū|lose
厉害|lì hai|awesome|formidable, awesome
过|guo|(ever)|after a verb: have ever done it|part
戴|dài|wear|to wear (glasses, a hat)
眼镜|yǎn jìng|glasses|glasses; a headset
虚拟现实|xū nǐ xiàn shí|VR|virtual reality
`,
  ],
  [
    'Stories',
    '故事',
    `
以前|yǐ qián|ago|before; ago
久|jiǔ|long|long (of time)
以后|yǐ hòu|after|after, later
然后|rán hòu|then|then, after that
最后|zuì hòu|in the end|finally, in the end
老人|lǎo rén|old man|old person
儿子|ér zi|son
妻子|qī zi|wife
谁|shéi|who|who?|q
门|mén|gate|gate, door
写|xiě|write
飞|fēi|fly
跑|pǎo|run|to run; to run away
带|dài|bring|to bring, to take along
回来|huí lai|come back
出来|chū lai|come out
变|biàn|change|to change, to turn into
死|sǐ|die
生气|shēng qì|angry
事|shì|thing|matter, thing, event
药|yào|medicine
腿|tuǐ|leg
断|duàn|break|to break (off)
战争|zhàn zhēng|war
打仗|dǎ zhàng|fight a war|to go to war
年轻|nián qīng|young
石头|shí tou|stone
马|mǎ|horse
牛|niú|ox|ox, cow
兔子|tù zi|rabbit
匹|pǐ|(horse)|measure word for horses|mw
里|lǐ|li|li, a Chinese half-kilometre
跟头|gēn tou|somersault
金箍棒|jīn gū bàng|golden cudgel|the Monkey King's golden-banded staff
佛|Fó|Buddha|the Buddha||name
和尚|hé shang|monk|Buddhist monk
后羿|Hòu Yì|Hou Yi|Hou Yi, the archer who shot down the suns||name
齐天大圣|Qí tiān dà shèng|Great Sage|the Great Sage Equal to Heaven: Wukong's own title for himself||name
道德经|Dào dé jīng|Daodejing|the Daodejing, the book of the Way, said to be Laozi's
`,
  ],
  [
    'Starship',
    '飞船',
    `
星球|xīng qiú|planet|a planet, a heavenly body
木星|Mù xīng|Jupiter|Jupiter, the wood star (the planets are named for the five elements)||place
土星|Tǔ xīng|Saturn|Saturn, the earth star||place
小行星|xiǎo xíng xīng|asteroid
飞碟|fēi dié|flying saucer|flying saucer, UFO
激光|jī guāng|laser
护盾|hù dùn|shield|a shield of energy (in games and science fiction)
打开|dǎ kāi|switch on|to open; to switch on
全速|quán sù|full speed
前进|qián jìn|go forward|to go forward, to advance
出发|chū fā|set off|to set off, to start out
引擎|yǐn qíng|engine
坏|huài|broken|bad; broken
`,
  ],
  [
    'The garden',
    '花园',
    `
花园|huā yuán|garden
花|huā|flower
树|shù|tree
梅花|méi huā|plum blossom|plum blossom, the flower of late winter
池塘|chí táng|pond
锦鲤|jǐn lǐ|koi|koi, the coloured carp of garden ponds
桥|qiáo|bridge
灯笼|dēng long|lantern
亭子|tíng zi|pavilion
窗户|chuāng hu|window
鹤|hè|crane|crane (the bird)
柳树|liǔ shù|willow
荷花|hé huā|lotus
菊花|jú huā|chrysanthemum
猫|māo|cat
风筝|fēng zheng|kite
蝴蝶|hú dié|butterfly
围棋|wéi qí|Go|Go, the board game of surrounding stones
春天|chūn tiān|spring
夏天|xià tiān|summer
秋天|qiū tiān|autumn
冬天|dōng tiān|winter
雪|xuě|snow
下雪|xià xuě|snow|to snow
每天|měi tiān|every day
印章|yìn zhāng|seal|a seal, a name stamp
麻将|má jiàng|mahjong
`,
  ],
  [
    'Legends',
    '传说',
    `
地|dì|earth|the earth, the ground: 地上 on the ground
像|xiàng|like|to be like, to look like
里面|lǐ miàn|inside
睡|shuì|sleep|to sleep
醒|xǐng|wake|to wake up
高|gāo|tall|tall, high
眼|yǎn|eye
变成|biàn chéng|become|to turn into, to become
洞|dòng|hole|hole, cave
怕|pà|afraid|to be afraid (of)
黄色|huáng sè|yellow
用|yòng|use|to use; with
补|bǔ|mend|to mend, to patch
每|měi|every
梦|mèng|dream|a dream; to dream
座|zuò|(mass)|measure word for mountains, bridges and buildings|mw
搬|bān|move|to move (something heavy); to move house
结婚|jié hūn|marry|to marry, to get married
孩子|hái zi|child|child, children
画|huà|draw|to draw, to paint; a painting
条|tiáo|(strip)|measure word for long, narrow things: rivers, roads, fish|mw
银河|yín hé|Milky Way|the Milky Way, the "silver river"
鸟|niǎo|bird
见面|jiàn miàn|meet|to meet (each other)
盘古|Pán gǔ|Pangu|Pangu, the giant who parted the sky from the earth|name
女娲|Nǚ wā|Nüwa|Nüwa, the goddess who made people and mended the sky|name
庄子|Zhuāng zǐ|Zhuangzi|Zhuangzi, the Daoist who dreamt he was a butterfly|name
愚公|Yú gōng|Yugong|Yugong, "the foolish old man" who moved mountains|name
牛郎|Niú láng|Niulang|Niulang, the cowherd|name
织女|Zhī nǚ|Zhinü|Zhinü, the weaver girl of heaven|name
王母|Wáng mǔ|Queen Mother|the Queen Mother of the West, who rules in heaven|name
叶公|Yè gōng|Lord Ye|Lord Ye (the Duke of She), who loved dragons|name
`,
  ],
  [
    'The road west',
    '取经路',
    `
唐僧|Táng Sēng|Tang Sanzang|Tang Sanzang, "the Tang monk", who goes west for the scriptures||name
猪八戒|Zhū Bā jiè|Zhu Bajie|Zhu Bajie, "Pigsy", Tang Sanzang's second disciple||name
沙僧|Shā Sēng|Sha Wujing|Sha Wujing, "Sandy", Tang Sanzang's third disciple||name
观音|Guān yīn|Guanyin|Guanyin, the bodhisattva of mercy||name
经|jīng|scriptures|scripture, sutra; a classic
猪|zhū|pig
桃子|táo zi|peach
火|huǒ|fire
风|fēng|wind
云|yún|cloud
金|jīn|gold|gold; golden
眼睛|yǎn jing|eyes|eye, eyes
骨头|gǔ tou|bone|bone, bones
蜘蛛|zhī zhū|spider
葫芦|hú lu|gourd|gourd, calabash
肉|ròu|meat|meat, flesh
救|jiù|save|to save, to rescue
抓|zhuā|catch|to catch, to grab
答应|dā ying|answer|to answer (when called); to agree
宝贝|bǎo bèi|treasure|treasure; darling
菩萨|pú sà|bodhisattva|bodhisattva, one who has reached enlightenment and stays to help others
长生不老|cháng shēng bù lǎo|live forever|to live forever and never grow old
`,
  ],
  [
    'The market',
    '讨价还价',
    `
讨价还价|tǎo jià huán jià|haggle|to haggle, to bargain
把|bǎ|(handle)|measure word for things held by a handle: fans, umbrellas, knives|mw
扇子|shàn zi|fan|fan (folding or round)
茶壶|chá hú|teapot
丝巾|sī jīn|silk scarf
中国结|Zhōng guó jié|Chinese knot|Chinese knot, tied in red cord for luck
成交|chéng jiāo|deal|it's a deal; to strike a bargain
算了|suàn le|forget it|forget it, never mind
`,
  ],
  [
    'Around town',
    '城里',
    `
银行|yín háng|bank
公园|gōng yuán|park
医院|yī yuàn|hospital
学校|xué xiào|school
超市|chāo shì|supermarket
书店|shū diàn|bookshop
电影院|diàn yǐng yuàn|cinema
前面|qián miàn|in front|in front (of); ahead
第二|dì èr|second|the second
第三|dì sān|third|the third
`,
  ],
  [
    'First contact',
    '你们是谁',
    `
从|cóng|from
工程师|gōng chéng shī|engineer
忙|máng|busy
让|ràng|let|to let, to allow; to make (someone do something)
怎么办|zěn me bàn|what to do|what shall we do? what now?
信号|xìn hào|signal
救命|jiù mìng|help!|help! (literally "save a life")
妈妈|mā ma|mum|mum, mother
礼物|lǐ wù|present|a present, a gift
新|xīn|new
艘|sōu|(ship)|measure word for ships and boats|mw
海盗|hǎi dào|pirate
老大|lǎo dà|boss|the boss, the big chief (of a gang)
机器人|jī qì rén|robot
这里|zhè lǐ|here
进|jìn|come in|to enter, to come in
商人|shāng rén|trader|trader, merchant
修|xiū|repair|to repair, to mend
不用|bù yòng|no need|there's no need; no, thanks
一路顺风|yī lù shùn fēng|bon voyage|have a good journey! (literally "a following wind all the way")
聪明|cōng ming|clever
珍珠|zhēn zhū|pearl
飞行员|fēi xíng yuán|pilot
近路|jìn lù|short cut
绕路|rào lù|go round|to go the long way round
安全|ān quán|safe|safe; safety
吃饭|chī fàn|eat|to eat, to have a meal
它|tā|it
东西|dōng xi|thing|thing, stuff
盒子|hé zi|box
能量|néng liàng|energy
脸|liǎn|face
睡觉|shuì jiào|sleep|to sleep, to go to bed
吵|chǎo|noisy|noisy, loud
马上|mǎ shàng|at once|at once, right away
晚安|wǎn ān|good night
`,
  ],
  [
    'The quiz',
    '问答',
    `
动物|dòng wù|animal
鱼|yú|fish
大象|dà xiàng|elephant
长颈鹿|cháng jǐng lù|giraffe|giraffe (literally "long-neck deer")
企鹅|qǐ é|penguin
鲸鱼|jīng yú|whale
海|hǎi|sea
海马|hǎi mǎ|seahorse
变色龙|biàn sè lóng|chameleon|chameleon (literally "change-colour dragon")
蜜蜂|mì fēng|bee
蜂蜜|fēng mì|honey
牛奶|niú nǎi|milk|milk|drink
草|cǎo|grass
狮子|shī zi|lion
小熊猫|xiǎo xióng māo|red panda|red panda (literally "little panda")
老鼠|lǎo shǔ|rat|rat, mouse
生肖|shēng xiào|zodiac animal|animal of the Chinese zodiac
鼻子|bí zi|nose
耳朵|ěr duo|ear
嘴|zuǐ|mouth
手|shǒu|hand
脚|jiǎo|foot
手指|shǒu zhǐ|finger
左边|zuǒ biān|left|the left, on the left
右边|yòu biān|right|the right, on the right
大人|dà rén|adult|adult, grown-up
医生|yī shēng|doctor
生病|shēng bìng|be ill|to fall ill, to be ill
寿司|shòu sī|sushi||food
披萨|pī sà|pizza||food
烤鸭|kǎo yā|roast duck||food
月饼|yuè bǐng|mooncake||food
西瓜|xī guā|watermelon||food
黄豆|huáng dòu|soybean|soybean (literally "yellow bean")
甜|tián|sweet
过年|guò nián|celebrate New Year|to celebrate the (Chinese) New Year
中秋节|zhōng qiū jié|Mid-Autumn Festival|the Mid-Autumn Festival, at the full moon of the eighth lunar month
天空|tiān kōng|sky
绿色|lǜ sè|green
国旗|guó qí|flag|national flag
国家|guó jiā|country|country, state
首都|shǒu dū|capital|capital city
北方|běi fāng|the north|the north (of a country)
东京|Dōng jīng|Tokyo|Tokyo (literally "eastern capital")|place
巴黎|Bā lí|Paris||place
伦敦|Lún dūn|London||place
华盛顿|Huá shèng dùn|Washington||place
纽约|Niǔ yuē|New York||place
奥斯陆|ào sī lù|Oslo||place
意大利|Yì dà lì|Italy||place
俄罗斯|é luó sī|Russia||place
加拿大|Jiā ná dà|Canada||place
澳大利亚|ào dà lì yà|Australia||place
埃及|āi jí|Egypt||place
印度|Yìn dù|India||place
非洲|Fēi zhōu|Africa||place
南极|Nán jí|Antarctica|the South Pole, Antarctica|place
北极|Běi jí|the Arctic|the North Pole, the Arctic|place
珠峰|Zhū fēng|Everest|Mount Everest (short for 珠穆朗玛峰)|place
泰山|Tài shān|Mount Tai|Mount Tai, a sacred mountain in Shandong|place
长江|Cháng jiāng|Yangtze|the Yangtze (literally "long river")|place
黄河|Huáng hé|Yellow River|the Yellow River|place
金字塔|jīn zì tǎ|pyramid|pyramid (literally "a tower shaped like 金")
环|huán|ring
纸|zhǐ|paper
发明|fā míng|invent|to invent; an invention
民族|mín zú|ethnic group|ethnic group, nationality
声调|shēng diào|tone|tone (of a syllable)
数字|shù zì|number|number, digit
加|jiā|plus|to add; plus
`,
  ],
]

export const LESSONS: Array<Lesson> = RAW.map(([title, zh], i) => ({
  n: i + 1,
  title,
  zh,
}))

export const WORDS: Array<Word> = RAW.flatMap(([, , rows], i) =>
  rows
    .trim()
    .split('\n')
    .map((row) => {
      const [h, p, g, e = '', tags = ''] = row.split('|').map((s) => s.trim())
      return {
        id: h,
        h,
        p,
        g,
        e: e || g,
        lesson: i + 1,
        tags: tags ? tags.split(',') : [],
      }
    }),
)

export const WORD: Record<string, Word | undefined> = Object.fromEntries(
  WORDS.map((w) => [w.id, w]),
)

export const COUNTRIES = WORDS.filter(
  (w) => w.tags.includes('country') && w.id !== '中国',
)
