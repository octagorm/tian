// Character parts: how hanzi are built. Most characters join a part that
// hints at the meaning (the radical) to one that hints at the sound (妈 =
// 女 woman + 马 mǎ); some join two meanings (休 = 亻 person + 木 tree:
// rest); the oldest are pictures (山, a mountain).

export interface Radical {
  part: string
  meaning: string
  // The full character it comes from, if it is a squeezed form
  from?: string
}

export const RADICALS: Array<Radical> = [
  { part: '亻', meaning: 'person', from: '人' },
  { part: '女', meaning: 'woman' },
  { part: '口', meaning: 'mouth' },
  { part: '氵', meaning: 'water', from: '水' },
  { part: '艹', meaning: 'grass, plant', from: '草' },
  { part: '饣', meaning: 'food', from: '食' },
  { part: '钅', meaning: 'metal', from: '金' },
  { part: '讠', meaning: 'speech', from: '言' },
  { part: '忄', meaning: 'heart, feeling', from: '心' },
  { part: '扌', meaning: 'hand', from: '手' },
  { part: '木', meaning: 'tree, wood' },
  { part: '日', meaning: 'sun, day' },
  { part: '宀', meaning: 'roof' },
  { part: '𧾷', meaning: 'foot', from: '足' },
  { part: '犭', meaning: 'animal', from: '犬' },
  { part: '冫', meaning: 'ice' },
  { part: '辶', meaning: 'walking' },
  { part: '立', meaning: 'standing' },
  { part: '石', meaning: 'stone' },
  { part: '目', meaning: 'eye' },
  { part: '雨', meaning: 'rain, weather' },
  { part: '父', meaning: 'father' },
  { part: '耳', meaning: 'ear' },
]

export interface Built {
  c: string
  p: string
  m: string
  // [meaning part, sound part] or, for two meanings, both
  parts: [string, string]
  // The sound part's own reading, when it gives the sound
  sound?: string
  // Two meanings joined, with how they make the whole
  idea?: string
}

export const BUILT: Array<Built> = [
  { c: '妈', p: 'mā', m: 'mum', parts: ['女', '马'], sound: 'mǎ' },
  {
    c: '吗',
    p: 'ma',
    m: 'question particle',
    parts: ['口', '马'],
    sound: 'mǎ',
  },
  { c: '码', p: 'mǎ', m: 'code, number', parts: ['石', '马'], sound: 'mǎ' },
  { c: '们', p: 'men', m: 'plural (我们)', parts: ['亻', '门'], sound: 'mén' },
  { c: '问', p: 'wèn', m: 'to ask', parts: ['口', '门'], sound: 'mén' },
  {
    c: '闻',
    p: 'wén',
    m: 'to hear, to smell',
    parts: ['耳', '门'],
    sound: 'mén',
  },
  {
    c: '请',
    p: 'qǐng',
    m: 'please, to invite',
    parts: ['讠', '青'],
    sound: 'qīng',
  },
  { c: '情', p: 'qíng', m: 'feeling', parts: ['忄', '青'], sound: 'qīng' },
  { c: '晴', p: 'qíng', m: 'sunny', parts: ['日', '青'], sound: 'qīng' },
  { c: '清', p: 'qīng', m: 'clear', parts: ['氵', '青'], sound: 'qīng' },
  { c: '睛', p: 'jīng', m: 'eyeball', parts: ['目', '青'], sound: 'qīng' },
  {
    c: '饱',
    p: 'bǎo',
    m: 'full (after eating)',
    parts: ['饣', '包'],
    sound: 'bāo',
  },
  { c: '跑', p: 'pǎo', m: 'to run', parts: ['𧾷', '包'], sound: 'bāo' },
  { c: '抱', p: 'bào', m: 'to hug', parts: ['扌', '包'], sound: 'bāo' },
  {
    c: '泡',
    p: 'pào',
    m: 'bubble; to soak',
    parts: ['氵', '包'],
    sound: 'bāo',
  },
  { c: '吧', p: 'ba', m: "particle: let's…", parts: ['口', '巴'], sound: 'bā' },
  { c: '爸', p: 'bà', m: 'dad', parts: ['父', '巴'], sound: 'bā' },
  { c: '把', p: 'bǎ', m: 'to hold', parts: ['扌', '巴'], sound: 'bā' },
  {
    c: '饭',
    p: 'fàn',
    m: 'cooked rice, meal',
    parts: ['饣', '反'],
    sound: 'fǎn',
  },
  { c: '饺', p: 'jiǎo', m: 'dumpling', parts: ['饣', '交'], sound: 'jiāo' },
  { c: '校', p: 'xiào', m: 'school', parts: ['木', '交'], sound: 'jiāo' },
  {
    c: '钟',
    p: 'zhōng',
    m: 'clock, bell',
    parts: ['钅', '中'],
    sound: 'zhōng',
  },
  { c: '语', p: 'yǔ', m: 'language', parts: ['讠', '吾'], sound: 'wú' },
  { c: '认', p: 'rèn', m: 'to recognise', parts: ['讠', '人'], sound: 'rén' },
  { c: '河', p: 'hé', m: 'river', parts: ['氵', '可'], sound: 'kě' },
  { c: '湖', p: 'hú', m: 'lake', parts: ['氵', '胡'], sound: 'hú' },
  { c: '洗', p: 'xǐ', m: 'to wash', parts: ['氵', '先'], sound: 'xiān' },
  { c: '花', p: 'huā', m: 'flower', parts: ['艹', '化'], sound: 'huà' },
  {
    c: '菜',
    p: 'cài',
    m: 'vegetable, dish',
    parts: ['艹', '采'],
    sound: 'cǎi',
  },
  { c: '草', p: 'cǎo', m: 'grass', parts: ['艹', '早'], sound: 'zǎo' },
  {
    c: '站',
    p: 'zhàn',
    m: 'to stand; station',
    parts: ['立', '占'],
    sound: 'zhàn',
  },
  { c: '猫', p: 'māo', m: 'cat', parts: ['犭', '苗'], sound: 'miáo' },
  { c: '狗', p: 'gǒu', m: 'dog', parts: ['犭', '句'], sound: 'gōu' },
  { c: '冷', p: 'lěng', m: 'cold', parts: ['冫', '令'], sound: 'lìng' },
  { c: '零', p: 'líng', m: 'zero', parts: ['雨', '令'], sound: 'lìng' },
  { c: '远', p: 'yuǎn', m: 'far', parts: ['辶', '元'], sound: 'yuán' },
  { c: '近', p: 'jìn', m: 'near', parts: ['辶', '斤'], sound: 'jīn' },
  { c: '忙', p: 'máng', m: 'busy', parts: ['忄', '亡'], sound: 'wáng' },
  { c: '怕', p: 'pà', m: 'to fear', parts: ['忄', '白'], sound: 'bái' },
  { c: '慢', p: 'màn', m: 'slow', parts: ['忄', '曼'], sound: 'màn' },
  { c: '星', p: 'xīng', m: 'star', parts: ['日', '生'], sound: 'shēng' },
  {
    c: '住',
    p: 'zhù',
    m: 'to live, to stay',
    parts: ['亻', '主'],
    sound: 'zhǔ',
  },
  { c: '注', p: 'zhù', m: 'to pour; note', parts: ['氵', '主'], sound: 'zhǔ' },
  {
    c: '拍',
    p: 'pāi',
    m: 'to clap; to take (a photo)',
    parts: ['扌', '白'],
    sound: 'bái',
  },
  { c: '打', p: 'dǎ', m: 'to hit', parts: ['扌', '丁'], sound: 'dīng' },
  { c: '姐', p: 'jiě', m: 'older sister', parts: ['女', '且'], sound: 'qiě' },
  { c: '妹', p: 'mèi', m: 'younger sister', parts: ['女', '未'], sound: 'wèi' },
  { c: '机', p: 'jī', m: 'machine', parts: ['木', '几'], sound: 'jǐ' },
  {
    c: '好',
    p: 'hǎo',
    m: 'good',
    parts: ['女', '子'],
    idea: 'a woman with her child',
  },
  {
    c: '休',
    p: 'xiū',
    m: 'to rest',
    parts: ['亻', '木'],
    idea: 'a person leaning on a tree',
  },
  {
    c: '明',
    p: 'míng',
    m: 'bright',
    parts: ['日', '月'],
    idea: 'the sun and the moon',
  },
  {
    c: '林',
    p: 'lín',
    m: 'woods',
    parts: ['木', '木'],
    idea: 'tree beside tree',
  },
  {
    c: '看',
    p: 'kàn',
    m: 'to look',
    parts: ['手', '目'],
    idea: 'a hand above the eye, shading it',
  },
  {
    c: '男',
    p: 'nán',
    m: 'man',
    parts: ['田', '力'],
    idea: 'strength in the field',
  },
  {
    c: '安',
    p: 'ān',
    m: 'peace, safe',
    parts: ['宀', '女'],
    idea: 'a woman under the roof',
  },
  {
    c: '家',
    p: 'jiā',
    m: 'home, family',
    parts: ['宀', '豕'],
    idea: 'a pig under the roof: a household',
  },
  {
    c: '信',
    p: 'xìn',
    m: 'to trust; letter',
    parts: ['亻', '言'],
    idea: "a person's word",
  },
  {
    c: '从',
    p: 'cóng',
    m: 'to follow; from',
    parts: ['人', '人'],
    idea: 'one person behind another',
  },
  {
    c: '尖',
    p: 'jiān',
    m: 'sharp, pointed',
    parts: ['小', '大'],
    idea: 'small on top of big',
  },
  {
    c: '鸣',
    p: 'míng',
    m: 'bird call',
    parts: ['口', '鸟'],
    idea: 'the mouth of a bird',
  },
]

// The parts' own meanings, for the sound parts and the idea parts
export const PART_MEANING: Record<string, string | undefined> = {
  马: 'horse',
  门: 'gate',
  青: 'green-blue',
  包: 'wrap, bag',
  巴: 'hope; (a sound)',
  反: 'turn over',
  交: 'cross',
  中: 'middle',
  吾: 'I (old)',
  人: 'person',
  可: 'can',
  胡: 'beard; foreign',
  先: 'first',
  化: 'change',
  采: 'pick',
  早: 'early',
  占: 'occupy',
  苗: 'sprout',
  句: 'sentence',
  令: 'order',
  元: 'first; yuan',
  斤: 'axe; half a kilo',
  亡: 'perish',
  白: 'white',
  曼: 'graceful',
  生: 'be born',
  主: 'master',
  丁: 'nail',
  且: 'moreover',
  未: 'not yet',
  几: 'how many',
  子: 'child',
  月: 'moon',
  手: 'hand',
  田: 'field',
  力: 'strength',
  豕: 'pig',
  言: 'word, speech',
  小: 'small',
  大: 'big',
  鸟: 'bird',
}

export interface Picture {
  c: string
  p: string
  m: string
  sprite: string
}

export const PICTURES: Array<Picture> = [
  { c: '人', p: 'rén', m: 'person', sprite: 'person' },
  { c: '口', p: 'kǒu', m: 'mouth', sprite: 'mouth' },
  { c: '日', p: 'rì', m: 'sun', sprite: 'sun' },
  { c: '月', p: 'yuè', m: 'moon', sprite: 'moon' },
  { c: '山', p: 'shān', m: 'mountain', sprite: 'mountain' },
  { c: '水', p: 'shuǐ', m: 'water', sprite: 'water' },
  { c: '火', p: 'huǒ', m: 'fire', sprite: 'fire' },
  { c: '木', p: 'mù', m: 'tree', sprite: 'tree' },
  { c: '女', p: 'nǚ', m: 'woman', sprite: 'woman' },
  { c: '子', p: 'zǐ', m: 'child', sprite: 'child' },
  { c: '马', p: 'mǎ', m: 'horse', sprite: 'horse' },
  { c: '鱼', p: 'yú', m: 'fish', sprite: 'fish' },
  { c: '鸟', p: 'niǎo', m: 'bird', sprite: 'bird' },
  { c: '牛', p: 'niú', m: 'ox', sprite: 'ox' },
  { c: '羊', p: 'yáng', m: 'sheep', sprite: 'sheep' },
  { c: '雨', p: 'yǔ', m: 'rain', sprite: 'rain' },
  { c: '门', p: 'mén', m: 'gate, door', sprite: 'door' },
  { c: '目', p: 'mù', m: 'eye', sprite: 'eye' },
  { c: '手', p: 'shǒu', m: 'hand', sprite: 'hand' },
  { c: '心', p: 'xīn', m: 'heart', sprite: 'heart' },
  { c: '田', p: 'tián', m: 'field', sprite: 'field' },
  { c: '车', p: 'chē', m: 'cart, car', sprite: 'cart' },
  { c: '米', p: 'mǐ', m: 'rice', sprite: 'rice-bowl' },
  { c: '大', p: 'dà', m: 'big (a person, arms out)', sprite: 'big' },
  { c: '耳', p: 'ěr', m: 'ear', sprite: 'ear' },
  { c: '竹', p: 'zhú', m: 'bamboo', sprite: 'bamboo' },
  { c: '云', p: 'yún', m: 'cloud', sprite: 'cloud' },
  { c: '刀', p: 'dāo', m: 'knife', sprite: 'knife' },
]

// Families: characters that share a sound part
export function family(sound: string): Array<Built> {
  return BUILT.filter((b) => b.sound && b.parts[1] === sound)
}
