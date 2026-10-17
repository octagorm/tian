// The garden (games/garden.tsx): a courtyard that fills as lessons are
// learnt. Each lesson grows one thing, in lesson order; lessons after the
// twentieth grow the extras, in turn. A thing appears as a start (a
// sapling, a pile of stones) when a lesson's words are under way, and
// grown when they are known (lib/garden.ts). Tapping it shows its word.
//
// Plain data, so that scripts/speech.ts can read the lines.

export interface GardenItem {
  // What garden/draw.ts draws
  id: string
  name: string
  zh: string
  py: string
  // The word in the bank it shows when tapped, if there is one
  word?: string
}

export const GARDEN_ITEMS: Array<GardenItem> = [
  { id: 'plum', name: 'Plum tree', zh: '梅花', py: 'méihuā', word: '梅花' },
  { id: 'pond', name: 'Koi pond', zh: '池塘', py: 'chítáng', word: '池塘' },
  {
    id: 'rock',
    name: 'Scholar’s rock',
    zh: '石头',
    py: 'shítou',
    word: '石头',
  },
  { id: 'bamboo', name: 'Bamboo', zh: '竹子', py: 'zhúzi', word: '竹子' },
  { id: 'bridge', name: 'Zigzag bridge', zh: '桥', py: 'qiáo', word: '桥' },
  { id: 'lantern', name: 'Stone lantern', zh: '石灯', py: 'shídēng' },
  {
    id: 'gate',
    name: 'Moon gate',
    zh: '月亮门',
    py: 'yuèliangmén',
    word: '门',
  },
  { id: 'pavilion', name: 'Pavilion', zh: '亭子', py: 'tíngzi', word: '亭子' },
  { id: 'lotus', name: 'Lotus', zh: '荷花', py: 'héhuā', word: '荷花' },
  {
    id: 'windows',
    name: 'Lattice windows',
    zh: '窗户',
    py: 'chuānghu',
    word: '窗户',
  },
  { id: 'crane', name: 'Crane', zh: '鹤', py: 'hè', word: '鹤' },
  { id: 'willow', name: 'Willow', zh: '柳树', py: 'liǔshù', word: '柳树' },
  {
    id: 'lanterns',
    name: 'Red lanterns',
    zh: '灯笼',
    py: 'dēnglong',
    word: '灯笼',
  },
  { id: 'mums', name: 'Chrysanthemums', zh: '菊花', py: 'júhuā', word: '菊花' },
  { id: 'sphere', name: 'Armillary sphere', zh: '浑仪', py: 'húnyí' },
  { id: 'dragon', name: 'Dragon wall', zh: '龙', py: 'lóng', word: '龙' },
  { id: 'taiji', name: 'Taiji paving', zh: '太极', py: 'tàijí' },
  { id: 'go', name: 'Go table', zh: '围棋', py: 'wéiqí', word: '围棋' },
  { id: 'cat', name: 'Cat', zh: '猫', py: 'māo', word: '猫' },
  { id: 'kite', name: 'Kite', zh: '风筝', py: 'fēngzheng', word: '风筝' },
  // Extras, for lessons after the twentieth
  {
    id: 'butterflies',
    name: 'Butterflies',
    zh: '蝴蝶',
    py: 'húdié',
    word: '蝴蝶',
  },
  { id: 'magpies', name: 'Magpies', zh: '喜鹊', py: 'xǐquè' },
  { id: 'chimes', name: 'Wind chimes', zh: '风铃', py: 'fēnglíng' },
]

// The thing a lesson grows (lessons count from 1)
export const itemOf = (lesson: number): GardenItem | undefined =>
  GARDEN_ITEMS[lesson - 1]

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Daytime = 'dawn' | 'day' | 'dusk' | 'night'

export const SEASONS: Array<{ id: Season; name: string; zh: string }> = [
  { id: 'spring', name: 'Spring', zh: '春天' },
  { id: 'summer', name: 'Summer', zh: '夏天' },
  { id: 'autumn', name: 'Autumn', zh: '秋天' },
  { id: 'winter', name: 'Winter', zh: '冬天' },
]

export const DAYTIMES: Array<{ id: Daytime; name: string; zh: string }> = [
  { id: 'dawn', name: 'Morning', zh: '早上' },
  { id: 'day', name: 'Day', zh: '白天' },
  { id: 'dusk', name: 'Evening', zh: '傍晚' },
  { id: 'night', name: 'Night', zh: '晚上' },
]

// A line for each season, word by word as in the trip, said in the word
// voice (data/extra.ts)
export const SEASON_LINES: Record<Season, { zh: string; en: string }> = {
  spring: {
    zh: '春天 来 了 ， 花 开=open 了 。',
    en: 'Spring is here, and the flowers are out.',
  },
  summer: {
    zh: '夏天 很 热 。 荷花 很 漂亮 。',
    en: 'Summer is hot. The lotus is beautiful.',
  },
  autumn: {
    zh: '秋天 的 月亮 很 漂亮 。',
    en: 'The autumn moon is beautiful.',
  },
  winter: {
    zh: '冬天 下雪 了 。 梅花 开=open 了 。',
    en: 'It is snowing. The plum is in flower.',
  },
}

export const NIGHT_LINE = {
  zh: '月亮 出来 了 。',
  en: 'The moon has come out.',
}

// The season and the time of day at a moment, on the player's own clock
// (seasons as in the northern hemisphere, where China is)
export function seasonOf(d: Date): Season {
  const m = d.getMonth()
  return m < 2 || m === 11
    ? 'winter'
    : m < 5
      ? 'spring'
      : m < 8
        ? 'summer'
        : 'autumn'
}

export function daytimeOf(d: Date): Daytime {
  const h = d.getHours() + d.getMinutes() / 60
  return h < 5 || h >= 21 ? 'night' : h < 8 ? 'dawn' : h < 17.5 ? 'day' : 'dusk'
}
