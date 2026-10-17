// The pictographs of data/parts.ts painted in ink, in the manner of a
// classical freehand brush painting (xieyi), for First steps: one image
// each from the image tool of the Codex CLI (scripts/image.mjs, on the
// ChatGPT plan), with scripts/pictures-style.webp as the reference for the
// style. Then each is trimmed, set on a square and saved small for the page.
//
//   node scripts/pictures.mjs [names…]   paint those missing (all, without names)
//   node scripts/pictures.mjs --web      make public/art/pictures/<name>.webp
//
// The full-size paintings are kept in .cache/pictures/ (megabytes each);
// delete one there to paint it again. A name is the picture's sprite in
// data/parts.ts. Each painting takes a minute or two; four are made at once.
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'

const FULL = '.cache/pictures'
const WEB = 'public/art/pictures'
const STYLE_REF = 'scripts/pictures-style.webp'
// Shown at up to 96 CSS pixels, so twice that and a little for a margin
const SIZE = 256

// What each shows, drawn so its outline recalls the old pictograph
const SUBJECTS = {
  person:
    'a person walking, seen from the side, legs apart in a long stride, in a plain robe',
  mouth:
    'an open mouth, small and simple, drawn in a few strokes: a rounded square opening outlined in ink, with a light wash of red for the lips, as an old painter would suggest it rather than draw it in detail',
  sun: 'the sun, a round red disc with a soft wash of ink around it',
  moon: 'a crescent moon, pale with a soft grey wash',
  mountain: 'a mountain with three peaks, the middle peak tallest',
  water:
    'a stream of water flowing downwards, its current drawn as one long curving line with ripples splashing to either side',
  fire: 'a small fire, flames rising in three tongues from a few sticks',
  tree: 'a single tree with branches spreading up and roots spreading down into the ground',
  woman:
    'a woman kneeling, seen from the side, hands folded across her chest, in a long robe',
  child: 'a small child in swaddling clothes, arms held out wide, a round head',
  horse: 'a horse galloping, seen from the side, its mane and tail flying',
  fish: 'a carp, seen from the side, its tail curved',
  bird: 'a small bird perched, seen from the side, its tail feathers long',
  ox: 'an ox seen from the front, its big curved horns spreading wide',
  sheep:
    'a sheep seen from the front, its horns curling down on either side of its head',
  rain: 'rain falling in drops from a dark cloud',
  door: 'an old wooden gate of two doors, side by side, closed',
  eye: 'a single human eye, seen from the front, lying sideways, with its brow',
  hand: 'an open hand, palm forward, fingers spread',
  heart:
    'a heart drawn simply in a few strokes, a rounded red shape like a ripe peach with a point at the bottom and two short stems at the top, as an old painter would suggest it; not anatomical, no veins',
  field:
    'a field seen from above, a square of earth divided into four plots by two crossing paths, with green shoots',
  cart: 'an old two-wheeled wooden cart, seen from the side',
  'rice-bowl':
    'a stalk of ripe rice bending under its grains, and a few loose grains',
  big: 'a person standing face on, arms and legs spread wide, as big as they can be',
  ear: 'a human ear, seen from the side',
  bamboo: 'two stalks of bamboo with a few leaves hanging from the top',
  cloud: 'a curling cloud, its ends rolled up in spirals, as in old paintings',
  knife:
    'an old single-edged Chinese knife with a curved blade and a wooden handle',
}

const STYLE =
  'In the style of a classical Chinese freehand brush painting (xieyi): a few bold, wet strokes of ink in many tones, from deep black to pale grey, with touches of colour, lively and economical, as a painter of old would sketch on rice paper. Match the painting style of the reference image, but draw only the one subject described, alone and centred, filling most of the canvas. Its outline is simple and bold, echoing the ancient pictograph for it. No text, no letters, no calligraphy, no seals, no frames, no background.'

function paint(name) {
  return new Promise((resolve) => {
    const child = spawn(
      'node',
      [
        'scripts/image.mjs',
        '--out',
        `${FULL}/${name}.png`,
        '--shape',
        'square',
        '--transparent',
        '--ref',
        STYLE_REF,
        `A single illustration of ${SUBJECTS[name]}. ${STYLE}`,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    let err = ''
    child.stderr.on('data', (d) => (err += d))
    child.on('close', (code) => {
      console.log(
        code === 0 ? `painted ${name}` : `failed ${name}: ${err.trim()}`,
      )
      resolve()
    })
  })
}

// Trimmed to the painting, set in the middle of a transparent square
function forWeb(name) {
  execFileSync('magick', [
    `${FULL}/${name}.png`,
    '-trim',
    '+repage',
    '-resize',
    `${SIZE - 16}x${SIZE - 16}`,
    '-background',
    'none',
    '-gravity',
    'center',
    '-extent',
    `${SIZE}x${SIZE}`,
    '-quality',
    '82',
    '-define',
    'webp:alpha-quality=90',
    `${WEB}/${name}.webp`,
  ])
  console.log(`${WEB}/${name}.webp`)
}

mkdirSync(FULL, { recursive: true })
if (process.argv.includes('--web')) {
  mkdirSync(WEB, { recursive: true })
  for (const f of readdirSync(FULL))
    if (f.endsWith('.png') && f.slice(0, -4) in SUBJECTS) forWeb(f.slice(0, -4))
} else {
  const asked = process.argv.slice(2)
  for (const n of asked)
    if (!(n in SUBJECTS)) throw new Error(`No such picture: ${n}`)
  const queue = (asked.length ? asked : Object.keys(SUBJECTS)).filter(
    (n) => !existsSync(`${FULL}/${n}.png`),
  )
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length) await paint(queue.shift())
    }),
  )
}
