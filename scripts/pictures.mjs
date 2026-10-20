// The pictographs of data/parts.ts painted in ink and colour, naturalistic,
// for First steps: one image each from the image tool of the Codex CLI
// (scripts/image.mjs, on the ChatGPT plan), with three of the chosen
// paintings as references for the style and the character drawn as a last
// reference, so each is laid out in the shape of its character where that
// keeps it natural, to help remember it. Then each is trimmed, set on a
// square and saved small for the page. The twelve the course shows were
// chosen in rounds of trials; the others are older and unused.
//
//   node scripts/pictures.mjs [names…]   paint those missing (without names,
//                                        those First steps shows)
//   node scripts/pictures.mjs --web      make public/art/pictures/<name>.webp
//
// The full-size paintings are kept in .cache/pictures/ (megabytes each);
// delete one there to paint it again. A name is the picture's sprite in
// data/parts.ts. Each painting takes a minute or two; four are made at once.
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'

// --into <dir> paints a draft there instead, to compare
const into = process.argv.indexOf('--into')
const FULL = into > 0 ? process.argv[into + 1] : '.cache/pictures'
const WEB = 'public/art/pictures'
// Three of the chosen paintings, for the style
const STYLE_REFS = ['moon', 'tree', 'door'].map(
  (n) => `public/art/pictures/${n}.webp`,
)
// Shown at up to 96 CSS pixels, so twice that and a little for a margin
const SIZE = 256

// What each shows, and how it is laid out so that its shape follows the
// strokes of its character, for a learner to see the character in it
const SUBJECTS = {
  person:
    'a traveller walking, seen from the side, leaning forward in a long robe that hides the arms: head, back and back leg one long line from the top down to the lower left, the front leg striding out from its middle down to the lower right, forming 人',
  mouth:
    'the lower half of a face calling out, hands not shown, the mouth wide open and square with natural lips and teeth just visible, forming 口',
  sun: 'the red morning sun shining through a tall old wooden window with one bar across its middle, seen from inside, the frame and its bar forming 日 and the sun filling both panes',
  moon: 'the moon, seen through a tall, narrow window from inside at night: the curtains and frame form the character 月, the left curtain sweeping down in a long curve to the lower left, the right side of the frame straight with a small hook at its foot, two level bars across the middle; outside, a bright crescent moon in a dark blue sky',
  mountain:
    'a mountain range seen across a valley: three steep peaks rising from one level ridge, the middle peak tallest, with rock, pines and mist, so their outline is the character 山',
  water:
    'a spring in a forest: one stream of water pouring straight down from a bamboo spout into a stone pool, splashing out to the left and right',
  fire: 'a campfire: one flame rising tall in the middle and parting into two legs over the logs at the bottom, with a spark flying out on either side halfway up, in the shape of 火',
  tree: 'a real tree with a straight upright trunk, one long level branch across near the top, and roots spreading down to the lower left and lower right, forming 木',
  woman:
    'a woman kneeling, seen from the side, in a long robe, her hands folded at her chest so her sleeves cross in front of her, her knees forward, calm and natural, as in the old pictograph of 女',
  child:
    'a baby in swaddling clothes seen from the front: a round head at the top, arms held straight out to either side, the body one bundle tapering down to a small curl at the bottom, in the shape of 子',
  horse:
    'a horse galloping across a plain, seen from the side, its head forward at the upper right, its mane streaming back along the top, its legs stretched out naturally, running along one long level line of ground',
  fish: 'a real carp swimming straight up, seen from above in clear water: its head at the top tilted to the left, the scales of its body in a squarish block, its tail fanned out flat and wide at the bottom, in the shape of 鱼',
  bird: 'a real small bird perched on a level branch that ends in a small hook, seen from the side: its head and eye at the top, its body below, its tail sweeping down to the branch, in the shape of 鸟',
  ox: "a real ox's head seen from the front: the long face straight down the middle, one horn curving up at the upper left, the ears straight out to the sides, in the shape of 牛",
  sheep:
    "a real sheep's head seen from the front: two horns curling up at the top, the long face down the middle, crossed by three level bands of thick fleece, in the shape of 羊",
  rain: 'a dark rain cloud along the top above an open wooden porch seen from the front, its posts and beam forming a frame, rain falling inside it in four lines of drops, two on each side of a middle post, forming 雨',
  door: 'an open wooden doorway in a white wall, seen from the front: the left post, the lintel across the top running into the right post, which ends at its foot in a stone step turned up like a hook, and a small red lantern hanging at the upper left as the dot, forming 门',
  eye: 'a single human eye, painted naturally, looking out through a tall, narrow upright window with two level bars across it, so the window frame makes the character 目 and the eye fills its middle',
  hand: 'a real open hand held up, palm forward: the fingers spread out across as three level strokes, the wrist and forearm one straight line down through them ending in a slight curl, in the shape of 手',
  heart:
    'a heart as a red curve opening upwards like a shallow bowl, with a hook at its right end and three small red drops above it, in the shape of 心; not anatomical',
  field:
    'real rice paddies seen from above: a square of green fields with water shining between the shoots, divided into four plots by two crossing earth paths, forming 田',
  cart: 'an old two-wheeled wooden cart seen from above: its axle a long level line, the shaft straight down the middle through it, a wheel at each end, in the shape of 车',
  'rice-bowl':
    'a real stalk of rice seen from the front: a straight upright stem crossed by one level leaf, with grains falling away in four directions, up left, up right, down left and down right, in the shape of 米',
  big: 'a person standing face on, arms stretched straight out level, legs spread wide apart, in the shape of 大',
  ear: 'a real human ear, seen from the side, painted naturally in skin tones, tall and narrow, its outer rim and its folds clearly drawn so that they suggest the strokes of 耳',
  bamboo:
    'two real stalks of bamboo side by side, each with leaves at the top bending to the left and a straight jointed stem ending in a small curl at its foot, in the shape of 竹',
  cloud:
    'clouds in a real sky: two thin level streaks of cloud high up, and below them one soft billowing cloud that curls down and rolls up on itself at the lower left, so together they make the shape of 云',
  knife:
    'an old Chinese knife standing upright: its edge a long curve down to the lower left, its back a straight line ending in a hook at the bottom right, in the shape of 刀',
}

// The character each picture is for, drawn as a second reference
const CHAR = {
  person: '人',
  mouth: '口',
  sun: '日',
  moon: '月',
  mountain: '山',
  water: '水',
  fire: '火',
  tree: '木',
  woman: '女',
  child: '子',
  horse: '马',
  fish: '鱼',
  bird: '鸟',
  ox: '牛',
  sheep: '羊',
  rain: '雨',
  door: '门',
  eye: '目',
  hand: '手',
  heart: '心',
  field: '田',
  cart: '车',
  'rice-bowl': '米',
  big: '大',
  ear: '耳',
  bamboo: '竹',
  cloud: '云',
  knife: '刀',
}
const FONT = '/System/Library/Fonts/Supplemental/Songti.ttc'

const STYLE =
  'A Chinese ink-and-colour painting on rice paper, naturalistic: true proportions and textures, fine ink lines and soft washes of colour, painterly, never glossy or photographic, in the same style as the first reference images (for the style only, not the subject). The last reference image is the Chinese character the picture stands for: lay the picture out so its shape follows the strokes of that character, so that a learner recognises both the thing and the character. Above all the subject must look natural and right: true anatomy, nothing bent or stretched to fit; where the shape of the character would distort it, let only the overall outline hint at the character. Never write the character itself. No text, no seals, no frame around the picture, no background beyond what is described.'

// The character in black on white, for the painter to follow
function glyph(name) {
  const file = `${FULL}/${name}-char.png`
  if (!existsSync(file))
    execFileSync('magick', [
      '-size',
      '1024x1024',
      'xc:white',
      '-font',
      FONT,
      '-pointsize',
      '820',
      '-gravity',
      'center',
      '-fill',
      'black',
      '-annotate',
      '+0+0',
      CHAR[name],
      file,
    ])
  return file
}

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
        ...STYLE_REFS.flatMap((r) => ['--ref', r]),
        '--ref',
        glyph(name),
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

// The pictures First steps shows (pic('人') in data/course.ts): the others
// are painted only when named
function shown() {
  const course = readFileSync('src/app/data/course.ts', 'utf8')
  const chars = new Set([...course.matchAll(/pic\('(.)'/g)].map((m) => m[1]))
  return Object.keys(CHAR).filter((n) => chars.has(CHAR[n]))
}

mkdirSync(FULL, { recursive: true })
if (process.argv.includes('--web')) {
  mkdirSync(WEB, { recursive: true })
  for (const f of readdirSync(FULL))
    if (f.endsWith('.png') && f.slice(0, -4) in SUBJECTS) forWeb(f.slice(0, -4))
} else {
  const asked = process.argv
    .slice(2)
    .filter((a, i, all) => a !== '--into' && all[i - 1] !== '--into')
  for (const n of asked)
    if (!(n in SUBJECTS)) throw new Error(`No such picture: ${n}`)
  const queue = (asked.length ? asked : shown()).filter(
    (n) => !existsSync(`${FULL}/${n}.png`),
  )
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length) await paint(queue.shift())
    }),
  )
}
