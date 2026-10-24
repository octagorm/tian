// Words never taught, only offered as wrong answers by ear (lib/choices.ts),
// beside a word with a character the vocabulary has too few other words
// for in the same place and length: without 不舒服 and 不一定, 不客气 is the
// only choice of three syllables that begins with 不. They are real words,
// so a wrong guess shows their pinyin and meaning. A row is
// "hanzi | pinyin | meaning", the pinyin written as in data/words.ts.

import type { Word } from './words'

const RAW = `
你的|nǐ de|your, yours
最好|zuì hǎo|best
友好|yǒu hǎo|friendly
再说|zài shuō|besides; let's see later
再次|zài cì|once more
看见|kàn jiàn|to see
意见|yì jiàn|opinion
我的|wǒ de|my, mine
我国|wǒ guó|our country
他的|tā de|his
他人|tā rén|other people
汉字|hàn zì|Chinese character
美丽|měi lì|beautiful
美食|měi shí|good food
根本|gēn běn|at all; root
课本|kè běn|textbook
书本|shū běn|book
几点|jǐ diǎn|what time
地点|dì diǎn|place, location
多么|duō me|how (very)
至少|zhì shǎo|at least
减少|jiǎn shǎo|to reduce
没用|méi yòng|useless
没事|méi shì|it's nothing
只有|zhǐ yǒu|only
所有|suǒ yǒu|all
还有|hái yǒu|and also
这些|zhè xiē|these
每个|měi ge|every, each
那些|nà xiē|those
那么|nà me|so, then
那里|nà lǐ|there
薯条|shǔ tiáo|French fries
别人|bié rén|other people
别墅|bié shù|villa
请客|qǐng kè|to treat (pay)
学问|xué wen|learning, knowledge
访问|fǎng wèn|to visit
黄金|huáng jīn|gold
奖金|jiǎng jīn|bonus
晚饭|wǎn fàn|dinner
早安|zǎo ān|good morning
菜刀|cài dāo|kitchen knife
菜园|cài yuán|vegetable garden
猪肉|zhū ròu|pork
小吃|xiǎo chī|snack
难吃|nán chī|tastes bad
茶杯|chá bēi|teacup
酒杯|jiǔ bēi|wine glass
买卖|mǎi mai|business, trade
买菜|mǎi cài|to buy groceries
正在|zhèng zài|in the middle of
分开|fēn kāi|to separate
分数|fēn shù|score, mark
汽车|qì chē|car
开车|kāi chē|to drive
地图|dì tú|map
西方|xī fāng|the West
京都|jīng dū|Kyoto
树林|shù lín|woods
森林|sēn lín|forest
大海|dà hǎi|the sea
东海|dōng hǎi|the East China Sea
长度|cháng dù|length
高中|gāo zhōng|high school
高山|gāo shān|high mountain
味道|wèi dao|taste
街道|jiē dào|street
长大|zhǎng dà|to grow up
恋爱|liàn ài|to be in love
热爱|rè ài|to love deeply
有用|yǒu yòng|useful
尝试|cháng shì|to try
面试|miàn shì|job interview
小猫|xiǎo māo|kitten
花猫|huā māo|tabby cat
非法|fēi fǎ|illegal
经常|jīng cháng|often
平常|píng cháng|ordinary; usually
还要|hái yào|still want; also
就是|jiù shì|exactly; that is
天上|tiān shàng|in the sky
大雨|dà yǔ|heavy rain
小雨|xiǎo yǔ|light rain
不能|bù néng|cannot
只能|zhǐ néng|can only
手表|shǒu biǎo|wristwatch
地下|dì xià|underground
楼下|lóu xià|downstairs
上次|shàng cì|last time
这次|zhè cì|this time
曾经|céng jīng|once, formerly
神经|shén jīng|nerve
唯一|wéi yī|only, sole
太太|tài tai|wife; Mrs
月份|yuè fèn|month
校长|xiào zhǎng|headmaster
队长|duì zhǎng|team captain
大火|dà huǒ|big fire
生火|shēng huǒ|to light a fire
开心|kāi xīn|happy
大学|dà xué|university
数学|shù xué|mathematics
理想|lǐ xiǎng|ideal
梦想|mèng xiǎng|dream
人口|rén kǒu|population
人们|rén men|people
问好|wèn hǎo|to say hello to
问路|wèn lù|to ask the way
三月|sān yuè|March
三角|sān jiǎo|triangle
眼泪|yǎn lèi|tears
之前|zhī qián|before
目前|mù qián|at present
最近|zuì jìn|recently
回家|huí jiā|to go home
回答|huí dá|to answer
起来|qǐ lai|to get up
年纪|nián jì|age
年级|nián jí|school year, grade
和平|hé píng|peace
和好|hé hǎo|to make up
离开|lí kāi|to leave
走进|zǒu jìn|to walk in
先进|xiān jìn|advanced
头发|tóu fa|hair
沙发|shā fā|sofa
花瓶|huā píng|vase
花生|huā shēng|peanut
大树|dà shù|big tree
松树|sōng shù|pine tree
风景|fēng jǐng|scenery
风车|fēng chē|windmill
大雪|dà xuě|heavy snow
滑雪|huá xuě|to ski
每年|měi nián|every year
里程|lǐ chéng|mileage
里屋|lǐ wū|inner room
变化|biàn huà|change
变脸|biàn liǎn|face-changing (opera)
小河|xiǎo hé|stream
见到|jiàn dào|to see, meet
见过|jiàn guo|have seen
盘子|pán zi|plate
盘腿|pán tuǐ|to sit cross-legged
王子|wáng zǐ|prince
王国|wáng guó|kingdom
茶叶|chá yè|tea leaves
好了|hǎo le|done, all right
对了|duì le|right, by the way
旅行|lǚ xíng|to travel
步行|bù xíng|to walk, on foot
书包|shū bāo|school bag
十二|shí èr|twelve
初二|chū èr|second day of the month
十三|shí sān|thirteen
初三|chū sān|third day of the month
几号|jǐ hào|what date
口号|kǒu hào|slogan
救人|jiù rén|to save a life
救火|jiù huǒ|to fight a fire
海边|hǎi biān|seaside
哪里|nǎ lǐ|where
不对|bù duì|wrong
不要|bù yào|don't
近来|jìn lái|lately
近视|jìn shì|short-sighted
吃惊|chī jīng|surprised
吃药|chī yào|to take medicine
山西|shān xī|Shanxi
江西|jiāng xī|Jiangxi
能力|néng lì|ability
能干|néng gàn|capable
睡着|shuì zháo|to fall asleep
睡衣|shuì yī|pyjamas
马车|mǎ chē|carriage
马路|mǎ lù|road
金鱼|jīn yú|goldfish
小鱼|xiǎo yú|little fish
骑马|qí mǎ|to ride a horse
木马|mù mǎ|rocking horse
左手|zuǒ shǒu|left hand
左右|zuǒ yòu|left and right; about
右手|yòu shǒu|right hand
右面|yòu miàn|right side
过去|guò qù|the past; to go over
过来|guò lai|to come over
今年|jīn nián|this year
明年|míng nián|next year
国王|guó wáng|king
爬山|pá shān|to climb a mountain
发现|fā xiàn|to discover
发烧|fā shāo|to have a fever
经过|jīng guò|to pass by
不会|bù huì|cannot; will not
机会|jī huì|chance
会话|huì huà|conversation
会员|huì yuán|member
号召|hào zhào|to call on
号角|hào jiǎo|bugle
送给|sòng gěi|to give as a gift
还给|huán gěi|to give back
快乐|kuài lè|happy
快餐|kuài cān|fast food
周年|zhōu nián|anniversary
周围|zhōu wéi|around
不舒服|bù shū fu|unwell
不一定|bù yī dìng|not necessarily
不要紧|bù yào jǐn|it doesn't matter
对得起|duì de qǐ|to do right by
对不住|duì bu zhù|sorry (to let down)
差不多|chà bu duō|about the same
来不及|lái bu jí|too late
了不起|liǎo bu qǐ|amazing
没意思|méi yì si|boring
美国人|měi guó rén|American
天花板|tiān huā bǎn|ceiling
天文台|tiān wén tái|observatory
旋转门|xuán zhuǎn mén|revolving door
防盗门|fáng dào mén|security door
牛仔裤|niú zǎi kù|jeans
牛角包|niú jiǎo bāo|croissant
牛肉干|niú ròu gān|beef jerky
火山口|huǒ shān kǒu|crater
火柴盒|huǒ chái hé|matchbox
汽车站|qì chē zhàn|bus station
停车场|tíng chē chǎng|car park
地铁站|dì tiě zhàn|metro station
出租房|chū zū fáng|rented flat
房租费|fáng zū fèi|rent
斑马线|bān mǎ xiàn|zebra crossing
跑马场|pǎo mǎ chǎng|racecourse
有时候|yǒu shí hou|sometimes
有道理|yǒu dào lǐ|makes sense
外来语|wài lái yǔ|loanword
后来者|hòu lái zhě|latecomer
孙中山|sūn zhōng shān|Sun Yat-sen
孙媳妇|sūn xí fu|grandson's wife
西红柿|xī hóng shì|tomato
西班牙|xī bān yá|Spain
疑问句|yí wèn jù|question (sentence)
访问者|fǎng wèn zhě|visitor
大学生|dà xué shēng|university student
小学生|xiǎo xué shēng|pupil
科学家|kē xué jiā|scientist
艺术家|yì shù jiā|artist
道教徒|dào jiào tú|Taoist
道歉信|dào qiàn xìn|letter of apology
金刚经|jīn gāng jīng|the Diamond Sutra
猪排饭|zhū pái fàn|pork cutlet rice
猪肉包|zhū ròu bāo|pork bun
十八岁|shí bā suì|eighteen years old
七八个|qī bā gè|seven or eight
飞机场|fēi jī chǎng|airfield
飞机票|fēi jī piào|plane ticket
长头发|cháng tóu fa|long hair
长时间|cháng shí jiān|a long time
变魔术|biàn mó shù|to do magic tricks
变压器|biàn yā qì|transformer
霸王龙|bà wáng lóng|T. rex
喷火龙|pēn huǒ lóng|fire-breathing dragon
大熊猫|dà xióng māo|giant panda
小花猫|xiǎo huā māo|little tabby
老大爷|lǎo dà ye|grandpa (polite)
老大哥|lǎo dà gē|big brother
加油站|jiā yóu zhàn|petrol station
加班费|jiā bān fèi|overtime pay
无限大|wú xiàn dà|infinitely large
一样大|yī yàng dà|just as big
写字楼|xiě zì lóu|office building
打字机|dǎ zì jī|typewriter
总司令|zǒng sī lìng|commander-in-chief
总统府|zǒng tǒng fǔ|presidential palace
神经病|shén jīng bìng|nutcase
正经事|zhèng jīng shì|serious business
会客室|huì kè shì|reception room
会员卡|huì yuán kǎ|membership card
打篮球|dǎ lán qiú|to play basketball
打招呼|dǎ zhāo hu|to say hello
金项链|jīn xiàng liàn|gold necklace
一模一样|yī mú yī yàng|exactly alike
一天到晚|yī tiān dào wǎn|all day long
开天辟地|kāi tiān pì dì|creation of the world
宽宏大量|kuān hóng dà liàng|magnanimous
落落大方|luò luò dà fāng|natural and poised
长命百岁|cháng mìng bǎi suì|long life
长话短说|cháng huà duǎn shuō|to make a long story short
一成不变|yī chéng bù biàn|unchanging
一动不动|yī dòng bù dòng|motionless
以眼还眼|yǐ yǎn huán yǎn|an eye for an eye
衣锦还乡|yì jǐn huán xiāng|to come home in glory
弱不禁风|ruò bù jīn fēng|frail
两袖清风|liǎng xiù qīng fēng|incorruptible
博大精深|bó dà jīng shēn|broad and profound
胆大包天|dǎn dà bāo tiān|outrageously bold
`

export const DECOYS: Array<Word> = RAW.trim()
  .split('\n')
  .map((row) => {
    const [h, p, e] = row.split('|')
    return { id: `decoy:${h}`, h, p, g: e, e, lesson: 0, tags: ['decoy'] }
  })
