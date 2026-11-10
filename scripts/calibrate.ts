// Checks the memory model's numbers against a real bank: each card logs
// its last answers with the stability and the chance of remembering the
// model gave just before (lib/bank.ts, `log`). Here the chance given is
// set beside what happened, so it can be seen whether words are taken as
// forgotten too soon or too late.
//
//   npx convex run --prod bank:forEmail '{"email": "…"}' > .cache/bank.json
//   node scripts/calibrate.ts .cache/bank.json [--all]
//
// The file may be the bank itself or the JSON string of it (as Convex
// prints it). Answers of little weight (a pick among few, a hint taken)
// say less and are left out unless --all is given.
import { readFileSync } from 'node:fs'
import { LINK_OF_DIR } from '../src/app/lib/bank.ts'
import type { Bank, Dir, Link } from '../src/app/lib/bank.ts'

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/calibrate.ts <bank.json> [--all]')
  process.exit(1)
}
const all = process.argv.includes('--all')

let raw: unknown = JSON.parse(readFileSync(file, 'utf8'))
if (typeof raw === 'string') raw = JSON.parse(raw)
const bank = raw as Partial<Bank>

interface Answer {
  link: Link
  right: boolean
  s: number
  r: number
}

const linkOf = (how: Dir | Link): Link =>
  how in LINK_OF_DIR ? LINK_OF_DIR[how as Dir] : (how as Link)

const answers: Array<Answer> = []
let light = 0
for (const card of Object.values(bank.cards ?? {})) {
  for (const [, how, w, s, r] of card?.log ?? []) {
    if (!all && Math.abs(w) < 5) {
      light++
      continue
    }
    answers.push({ link: linkOf(how), right: w > 0, s, r: r / 100 })
  }
}

if (!answers.length) {
  console.log('No answers logged in this bank.')
  process.exit(0)
}

const pct = (x: number) => `${Math.round(x * 100)}`.padStart(3) + ' %'

function table(title: string, groups: Array<[string, Array<Answer>]>) {
  console.log(`\n${title}`)
  console.log('  '.padEnd(18) + 'answers   given  right   off')
  for (const [name, list] of groups) {
    if (!list.length) continue
    const given = list.reduce((n, a) => n + a.r, 0) / list.length
    const got = list.filter((a) => a.right).length / list.length
    // Too few to tell: the spread of a share of n answers
    const spread = Math.sqrt((given * (1 - given)) / list.length)
    const off = got - given
    const mark =
      list.length < 20 ? '  (few)' : Math.abs(off) > 2 * spread ? '  *' : ''
    console.log(
      `  ${name.padEnd(16)}${String(list.length).padStart(7)}   ${pct(given)}  ${pct(got)}  ${off >= 0 ? '+' : '−'}${pct(Math.abs(off)).trim()}${mark}`,
    )
  }
}

const band = (lo: number, hi: number) => (a: Answer) => a.r >= lo && a.r < hi
const BANDS: Array<[string, number, number]> = [
  ['under 30 %', 0, 0.3],
  ['30–50 %', 0.3, 0.5],
  ['50–70 %', 0.5, 0.7],
  ['70–85 %', 0.7, 0.85],
  ['85–95 %', 0.85, 0.95],
  ['95 % and over', 0.95, 1.01],
]
const AGES: Array<[string, number, number]> = [
  ['under 2 hours', 0, 0.08],
  ['up to 1 day', 0.08, 1],
  ['1–1.5 days', 1, 1.5],
  ['1.5–5 days', 1.5, 5],
  ['5–20 days', 5, 20],
  ['20 days and more', 20, Infinity],
]

console.log(
  `${answers.length} answers from ${Object.keys(bank.cards ?? {}).length} cards` +
    (all ? '' : ` (${light} of little weight left out; --all takes them in)`),
)
table('All', [['all', answers]])
table(
  'By the chance the model gave',
  BANDS.map(([n, lo, hi]) => [n, answers.filter(band(lo, hi))]),
)
table(
  'By the link’s stability before the answer',
  AGES.map(([n, lo, hi]) => [n, answers.filter((a) => a.s >= lo && a.s < hi)]),
)
table(
  'By link',
  (['hs', 'hm', 'sm'] as const).map((l) => [
    { hs: 'hanzi–sound', hm: 'hanzi–meaning', sm: 'sound–meaning' }[l],
    answers.filter((a) => a.link === l),
  ]),
)

const brier =
  answers.reduce((n, a) => n + (a.r - (a.right ? 1 : 0)) ** 2, 0) /
  answers.length
const base = answers.filter((a) => a.right).length / answers.length
console.log(
  `\nBrier score ${brier.toFixed(3)} (always guessing ${pct(base).trim()} would give ${(base * (1 - base)).toFixed(3)}; lower is better).`,
)
console.log(
  '“right” above “given” (+) means words are remembered better than the model\n' +
    'thinks: links could last longer (a larger gain, or RIGHT). Below (−) means\n' +
    'they are forgotten sooner. * marks a gap larger than chance would explain.',
)
