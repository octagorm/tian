// The pictographs of data/parts.ts painted in ink, in the manner of a
// classical freehand brush painting (xieyi), for First steps: one image
// each from the image tool of the Codex CLI (scripts/image.mjs, on the
// ChatGPT plan), with scripts/pictures-style.webp as the reference for the
// style, and the character it stands for drawn as a second reference: each
// is laid out in the shape of its character, to help remember it. Then
// each is trimmed, set on a square and saved small for the page.
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

// What each shows, and how it is laid out so that its shape follows the
// strokes of its character, for a learner to see the character in it
const SUBJECTS = {
  person:
    'a person walking, seen from the side, leaning far forward in a long robe that hides the arms: the head, back and back leg form one long sweeping stroke from the top down to the lower left, and the front leg strides out from the middle of it down to the lower right, wide apart, so the figure is an upside-down V like the character 人; painted with very few strokes',
  mouth:
    'a mouth open in a shout, seen from the front, its lips a nearly square frame with square corners, suggested in a pale red wash and a few dry strokes of ink, no teeth and no tongue, in the shape of 口',
  sun: 'the sun as a glowing red disc drawn taller than it is wide, with one band of thin grey cloud straight across its middle, in the shape of 日',
  moon: 'a crescent moon standing tall and narrow: its curved back on the left sweeps down to a sharp point at the bottom left, its right side is nearly straight and ends in a small hook at the bottom, and two short level wisps of grey cloud lie across its middle, in the shape of 月',
  mountain:
    'three mountain peaks rising straight up from one long level base, the middle peak tallest and the two side peaks short, in the shape of 山',
  water:
    'a stream of water falling straight down the middle, with a splash flying out to the left above a spray to the lower left, and a long splash to the lower right, in the shape of 水',
  fire: 'a fire: one flame rising in the middle that parts into two legs at the bottom like a tent, with a small spark flying out on either side halfway up, in the shape of 火',
  tree: 'a tree with a straight upright trunk, one long level branch across near the top, and roots spreading down to the lower left and lower right from its base, in the shape of 木',
  woman:
    'a woman kneeling, seen from the side, her arms crossed in front of her so that arms and legs cross like the strokes of 女',
  child:
    'a baby in swaddling clothes seen from the front: a round head at the top, arms held straight out to either side in one level line, and the body one bundle tapering down to a small hook, in the shape of 子',
  horse:
    'a horse made of the strokes of 马, painted as a real horse in ink: its head and mane along the top stroke, bending down at the right; its neck and body the zigzag down the middle; its tail and hind leg reaching out level along the long bottom stroke, ending in a hook',
  fish: 'a carp swimming straight up the canvas, seen from above: its pointed head at the top, tilted to the left; its body a squarish block whose scales make a cross like 田; its tail fanned out flat as one wide level stroke at the bottom, in the shape of 鱼',
  bird: 'a small bird perched, seen from the side, its head and eye at the top, its body below, its long tail sweeping down to a level line at the bottom, in the shape of 鸟',
  ox: "an ox's head seen from the front: the long face one straight line down the middle, a horn curving up at the upper left, the ears one level line across, in the shape of 牛",
  sheep:
    "a sheep's head seen from the front: two horns curling up at the top, the long face straight down the middle, crossed by three level bands of woolly fleece, in the shape of 羊",
  rain: 'rain: a dark cloud as one level line along the top, below it a sky shaped like a roof, and four short drops falling inside in two pairs, in the shape of 雨',
  door: 'an old gateway seen from the front: a post on the left, a beam across the top meeting the post on the right, which ends in a small hook at its foot, and a small knocker at the top left, in the shape of 门',
  eye: 'a single eye standing up on its end, taller than it is wide, its lids a rounded frame and its iris and creases two level lines inside, in the shape of 目',
  hand: 'an open hand held up, palm forward: the fingers spread across as three level strokes, the wrist and forearm one straight line down through them to a small hook, in the shape of 手',
  heart:
    'a heart as a red curve opening upwards like a shallow bowl, with a hook at its right end and three small drops above it, in the shape of 心; not anatomical',
  field:
    'a field seen from above: a square of earth divided into four plots by two crossing paths, with green shoots, in the shape of 田',
  cart: 'an old two-wheeled wooden cart seen from above: its axle a long level line, the shaft straight down the middle through it, a wheel at each end, in the shape of 车',
  'rice-bowl':
    'a stalk of rice seen from the front: a straight upright stem crossed by one level leaf, with grains falling away in four directions, up left, up right, down left and down right, in the shape of 米',
  big: 'a person standing face on, arms stretched straight out level, legs spread wide apart, in the shape of 大',
  ear: 'a human ear seen from the side, suggested in pale washes and a few strokes of ink: its rim two tall upright strokes on left and right, its folds three level strokes across between them, in the shape of 耳',
  bamboo:
    'two stalks of bamboo side by side, each with a leaf at the top bending to the left and a straight stem ending in a small hook at its foot, in the shape of 竹',
  cloud:
    'a cloud: two short level lines of cloud at the top, and below them a wisp that curls down and rolls up on itself at the lower left, in the shape of 云',
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
  'In the style of a classical Chinese freehand brush painting (xieyi): a few bold, wet strokes of ink in many tones, from deep black to pale grey, with touches of colour, lively and economical, as a painter of old would sketch on rice paper. Match the painting style of the first reference image, but draw only the one subject described, alone and centred, filling most of the canvas. The second reference image is the Chinese character it stands for: lay the subject out so its shape follows the strokes of that character, so that someone who looks at the painting sees the character in it. Paint the real thing, in ink and colour; never write the character itself. Keep it loose and painterly, never glossy or photographic. No text, no letters, no calligraphy, no seals, no frames, no background.'

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
        '--ref',
        STYLE_REF,
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
