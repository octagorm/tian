// Tones drills: four characters that differ only in tone, the classic
// way into the tones. The word voice says each on its own.

export interface ToneSet {
  base: string
  chars: [string, string, string, string]
  means: [string, string, string, string]
}

export const TONE_SETS: Array<ToneSet> = [
  {
    base: 'ma',
    chars: ['妈', '麻', '马', '骂'],
    means: ['mum', 'hemp', 'horse', 'scold'],
  },
  {
    base: 'ba',
    chars: ['八', '拔', '把', '爸'],
    means: ['eight', 'pull out', 'hold', 'dad'],
  },
  {
    base: 'yi',
    chars: ['衣', '姨', '椅', '意'],
    means: ['clothing', 'aunt', 'chair', 'meaning'],
  },
  {
    base: 'wu',
    chars: ['屋', '无', '五', '雾'],
    means: ['house', 'without', 'five', 'fog'],
  },
  {
    base: 'shi',
    chars: ['诗', '十', '使', '是'],
    means: ['poem', 'ten', 'make (do)', 'to be'],
  },
  {
    base: 'tang',
    chars: ['汤', '糖', '躺', '烫'],
    means: ['soup', 'sugar', 'lie down', 'scalding'],
  },
  {
    base: 'guo',
    chars: ['锅', '国', '果', '过'],
    means: ['pot', 'country', 'fruit', 'pass'],
  },
  {
    base: 'qi',
    chars: ['七', '骑', '起', '气'],
    means: ['seven', 'ride', 'rise', 'air, qi'],
  },
  {
    base: 'hu',
    chars: ['呼', '湖', '虎', '户'],
    means: ['breathe out', 'lake', 'tiger', 'household'],
  },
  {
    base: 'tong',
    chars: ['通', '同', '桶', '痛'],
    means: ['through', 'same', 'bucket', 'pain'],
  },
]

export const TONE_SET_PINYIN: Record<string, [string, string, string, string]> =
  {
    ma: ['mā', 'má', 'mǎ', 'mà'],
    ba: ['bā', 'bá', 'bǎ', 'bà'],
    yi: ['yī', 'yí', 'yǐ', 'yì'],
    wu: ['wū', 'wú', 'wǔ', 'wù'],
    shi: ['shī', 'shí', 'shǐ', 'shì'],
    tang: ['tāng', 'táng', 'tǎng', 'tàng'],
    guo: ['guō', 'guó', 'guǒ', 'guò'],
    qi: ['qī', 'qí', 'qǐ', 'qì'],
    hu: ['hū', 'hú', 'hǔ', 'hù'],
    tong: ['tōng', 'tóng', 'tǒng', 'tòng'],
  }
