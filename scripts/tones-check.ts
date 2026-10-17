// Checks Tian's word sounds against their tones: each file's pitch
// contour (lib/pitch.ts, as Say it draws it) beside the textbook shape of
// the word's tones. A low match may be a misread character (还 as huán),
// a neutral tone said in full, or just a hard case – listen to those.
//
//   node scripts/tones-check.ts [--all]
//
// Needs ffmpeg. Prints the worst matches first; --all prints every word.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { WORDS } from '../src/app/data/words.ts'
import { TONE_SETS, TONE_SET_PINYIN } from '../src/app/data/tones.ts'
import { ideal, likeness, shape, track } from '../src/app/lib/pitch.ts'
import { syllables, toneOf } from '../src/app/lib/pinyin.ts'

const MANIFEST = JSON.parse(
  readFileSync('src/app/data/audio.json', 'utf8'),
) as Record<string, string | undefined>
const RATE = 24000

function samples(file: string): Float32Array {
  const raw = execFileSync(
    'ffmpeg',
    [
      '-loglevel',
      'error',
      '-i',
      file,
      '-f',
      'f32le',
      '-ac',
      '1',
      '-ar',
      String(RATE),
      '-',
    ],
    {
      maxBuffer: 64 * 1024 * 1024,
    },
  )
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4)
}

const items: Array<{ h: string; p: string }> = [
  ...WORDS.filter((w) => !w.tags.includes('part')).map((w) => ({
    h: w.h,
    p: w.p,
  })),
  ...TONE_SETS.flatMap((s) =>
    s.chars.map((h, i) => ({ h, p: TONE_SET_PINYIN[s.base][i] })),
  ),
]

const rows: Array<{ h: string; p: string; score: number }> = []
for (const it of items) {
  const id = MANIFEST[`Kore|${it.h}`]
  const file = `public/audio/${id}.mp3`
  if (!id || !existsSync(file)) continue
  const tones = syllables(it.p).map(toneOf)
  const got = shape(track(samples(file), RATE))
  rows.push({ ...it, score: got ? likeness(got, ideal(tones)) : 0 })
}

rows.sort((a, b) => a.score - b.score)
const all = process.argv.includes('--all')
const shown = all ? rows : rows.filter((r) => r.score < 60)
for (const r of shown)
  console.log(`${String(r.score).padStart(3)}  ${r.h}  ${r.p}`)
const mean = rows.reduce((s, r) => s + r.score, 0) / (rows.length || 1)
console.log(
  `\n${rows.length} words with sound, mean match ${mean.toFixed(0)}; ${rows.filter((r) => r.score < 60).length} below 60`,
)
