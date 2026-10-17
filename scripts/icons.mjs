// The app icons of Tian (public/app/): the seal beside the home
// screen's title, 天 cut white into red in Ma Shan Zheng, worn as a real
// stamp is. Drawn as ornament/Seal.tsx draws it (keep the two alike), in a
// browser for the font and the filter, then scaled down. Where the game
// lets its sky show through the worn spots, the icon has a darker red: on
// the paper they would be a snow of white specks.
//
//   node scripts/icons.mjs
//
// Needs ImageMagick (brew install imagemagick) and the network, for the font.
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer'

const RED = '#c23a2c'
// Under the worn spots
const DEEP = '#8e2a21'
const PAPER = '#fbf3e4'
// The page's own background
const PAGE = '#f7f0e3'
const TEXT = '天'
// The seal's noise, seeded from its text as in the game
const seed =
  [...TEXT].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 9973, 7) % 97

const seal = `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <filter id="worn" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="2" seed="${seed}" result="slow" />
    <feDisplacementMap in="SourceGraphic" in2="slow" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="rough" />
    <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="3" seed="${seed + 11}" result="fine" />
    <feColorMatrix in="fine" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -10.5 0 0 0 7.9" result="worn" />
    <feComposite in="rough" in2="worn" operator="in" />
  </filter>
  <rect x="4.5" y="4.5" width="91" height="91" rx="6" fill="${DEEP}" />
  <g filter="url(#worn)">
    <rect x="2" y="2" width="96" height="96" rx="7" fill="${RED}" />
    <text x="50" y="51" font-size="70" font-family="'Ma Shan Zheng'" text-anchor="middle" dominant-baseline="central" fill="${PAPER}">${TEXT}</text>
  </g>
</svg>`

// `seal` is the seal's share of the icon's width. iOS rounds the corners
// itself and wants no transparency; a maskable icon may be cut to a circle
// 80% wide, which a square fits inside at 56%.
const ICONS = [
  { file: 'apple-touch-icon.png', size: 180, back: PAGE, seal: 0.8 },
  { file: 'icon-192.png', size: 192, back: null, seal: 0.94 },
  { file: 'icon-512.png', size: 512, back: null, seal: 0.94 },
  { file: 'maskable-512.png', size: 512, back: PAGE, seal: 0.56 },
]

const DRAW = 1024
const tmp = mkdtempSync(join(tmpdir(), 'tian-icons-'))
const browser = await puppeteer.launch()
const page = await browser.newPage()
await page.setViewport({ width: DRAW, height: DRAW })
await page.setContent(
  `<!doctype html><html><head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=block" />
    <style>
      html, body { margin: 0; width: ${DRAW}px; height: ${DRAW}px }
      body { display: grid; place-items: center }
    </style>
  </head><body><div>${seal}</div></body></html>`,
  { waitUntil: 'load' },
)
// Google serves the font in pieces by character; ask for the one in use
const ready = await page.evaluate(async (text) => {
  await document.fonts.load(`70px "Ma Shan Zheng"`, text)
  return document.fonts.check(`70px "Ma Shan Zheng"`, text)
}, TEXT)
if (!ready) throw new Error('Ma Shan Zheng did not load')
for (const icon of ICONS) {
  const side = `${Math.round(DRAW * icon.seal)}px`
  await page.evaluate(
    (back, side) => {
      document.body.style.background = back ?? 'transparent'
      Object.assign(document.querySelector('div').style, {
        width: side,
        height: side,
      })
    },
    icon.back,
    side,
  )
  const big = join(tmp, icon.file)
  await page.screenshot({ path: big, omitBackground: !icon.back })
  execFileSync('magick', [
    big,
    '-filter',
    'Lanczos',
    '-resize',
    `${icon.size}x${icon.size}`,
    `public/app/${icon.file}`,
  ])
  console.log(`public/app/${icon.file} (${icon.size} px)`)
}
await browser.close()
