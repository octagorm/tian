// The time of day, the season and the moon, from the player's own clock,
// for the living scene on the home screen

export type Period = 'night' | 'dawn' | 'day' | 'dusk'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

// Degrees north. The player's place is not asked for; this is near enough
// in northern Europe, where the page is mostly used, and fair elsewhere.
const LATITUDE = 55

const DAY_MS = 86_400_000

// Sunrise and sunset, in minutes after local midnight
export function sunTimes(d: Date): { rise: number; set: number } {
  const start = new Date(d.getFullYear(), 0, 1)
  const day = Math.floor((d.getTime() - start.getTime()) / DAY_MS) + 1
  const decl =
    ((-23.44 * Math.PI) / 180) * Math.cos(((2 * Math.PI) / 365) * (day + 10))
  const phi = (LATITUDE * Math.PI) / 180
  // The sun's centre 0.83° below the horizon: its disc and refraction
  const cosH =
    (Math.sin((-0.83 * Math.PI) / 180) - Math.sin(phi) * Math.sin(decl)) /
    (Math.cos(phi) * Math.cos(decl))
  const half = (Math.acos(Math.max(-1, Math.min(1, cosH))) * 720) / Math.PI
  // Noon by the sun is about 12:20 on a standard-time clock, an hour
  // later in summer time
  const jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset()
  const summerTime = d.getTimezoneOffset() < Math.max(jan, jul)
  const noon = 12 * 60 + 20 + (summerTime ? 60 : 0)
  return { rise: noon - half, set: noon + half }
}

// Which of the four pictures to show, as weights adding up to one: one
// picture most of the time, two crossfading around sunrise and sunset
export function periods(d: Date): Array<[Period, number]> {
  const m = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
  const { rise, set } = sunTimes(d)
  const keys: Array<[number, Period]> = [
    [rise - 80, 'night'],
    [rise - 45, 'dawn'],
    [rise + 35, 'dawn'],
    [rise + 80, 'day'],
    [set - 85, 'day'],
    [set - 40, 'dusk'],
    [set + 30, 'dusk'],
    [set + 70, 'night'],
  ]
  if (m <= keys[0][0] || m >= keys[keys.length - 1][0]) return [['night', 1]]
  for (let i = 0; i < keys.length - 1; i++) {
    const [m0, a] = keys[i]
    const [m1, b] = keys[i + 1]
    if (m >= m0 && m < m1) {
      if (a === b) return [[a, 1]]
      const k = (m - m0) / (m1 - m0)
      // Eased, so neither picture lingers half-seen
      const e = k * k * (3 - 2 * k)
      return [
        [a, 1 - e],
        [b, e],
      ]
    }
  }
  return [['day', 1]]
}

export const weightOf = (ws: Array<[Period, number]>, p: Period) =>
  ws.find(([q]) => q === p)?.[1] ?? 0

// The moon's age as a share of its month (0 new, 0.5 full) and how much
// of its face is lit
export function moon(d: Date): { phase: number; lit: number } {
  const SYNODIC = 29.530588853
  // A new moon: 6 January 2000, 18:14 UTC
  const days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / DAY_MS
  const phase = (((days / SYNODIC) % 1) + 1) % 1
  return { phase, lit: (1 - Math.cos(phase * 2 * Math.PI)) / 2 }
}

// A greeting for the hour, as a line of mixed text (word by word, every
// word in the bank)
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 9) return '早上 好 ！'
  if (hour >= 9 && hour < 12) return '上午 好 ！'
  if (hour >= 12 && hour < 18) return '下午 好 ！'
  return '晚上 好 ！'
}

// Seasons in the northern hemisphere, by month
export function season(d: Date): Season {
  const m = d.getMonth()
  return m < 2 || m === 11
    ? 'winter'
    : m < 5
      ? 'spring'
      : m < 8
        ? 'summer'
        : 'autumn'
}

// The festivals that change the scene, by the Chinese calendar: the
// Spring Festival (春节) from New Year's Eve to the Lantern Festival
// (元宵节), and the Mid-Autumn Festival (中秋节). Dates of the first day
// of the year and of the fifteenth of the eighth month.
const NEW_YEAR: Record<number, string> = {
  2026: '02-17',
  2027: '02-06',
  2028: '01-26',
  2029: '02-13',
  2030: '02-03',
  2031: '01-23',
  2032: '02-11',
}
const MID_AUTUMN: Record<number, string> = {
  2026: '09-25',
  2027: '09-15',
  2028: '10-03',
  2029: '09-22',
  2030: '09-12',
  2031: '10-01',
  2032: '09-19',
}

export interface Festival {
  id: 'spring' | 'lantern' | 'mid-autumn'
  zh: string
  pinyin: string
  en: string
}

export const FESTIVALS: Record<Festival['id'], Festival> = {
  spring: {
    id: 'spring',
    zh: '春节',
    pinyin: 'Chūn Jié',
    en: 'the Spring Festival, the Chinese New Year',
  },
  lantern: {
    id: 'lantern',
    zh: '元宵节',
    pinyin: 'Yuánxiāo Jié',
    en: 'the Lantern Festival',
  },
  'mid-autumn': {
    id: 'mid-autumn',
    zh: '中秋节',
    pinyin: 'Zhōngqiū Jié',
    en: 'the Mid-Autumn Festival',
  },
}

const local = (y: number, md: string) => {
  const [m, d] = md.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

export function festival(d: Date): Festival | null {
  const y = d.getFullYear()
  const today = new Date(y, d.getMonth(), d.getDate()).getTime()
  const days = (t: number) => Math.round((today - t) / DAY_MS)
  const ny = y in NEW_YEAR ? days(local(y, NEW_YEAR[y])) : NaN
  // New Year's Eve to the fourteenth day; the fifteenth is the Lantern
  // Festival
  if (ny >= -1 && ny <= 13) return FESTIVALS.spring
  if (ny === 14) return FESTIVALS.lantern
  const ma = y in MID_AUTUMN ? days(local(y, MID_AUTUMN[y])) : NaN
  if (ma >= -1 && ma <= 1) return FESTIVALS['mid-autumn']
  return null
}
