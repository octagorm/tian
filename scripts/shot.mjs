// Screenshots of Tian from a static build, to look at changes without a
// dev server:
//
//   npm run build
//   python3 -m http.server 4501 -d dist &
//   node scripts/shot.mjs --port 4501 --out /tmp/shots '#trip' '#quest'
//
// Options: --mobile (390 × 844), --wait <ms> after load (default 1500),
// --learner to seed a bank where the first lessons are met and some known
// (so mixed text shows all three forms), --click "<text>" to click the first
// button whose text contains it before the shot (repeatable, in order).
import { existsSync, mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const port = opt('--port', '4501')
const out = opt('--out', '/tmp/tian-shots')
const wait = Number(opt('--wait', '1500'))
const mobile = args.includes('--mobile')
const learner = args.includes('--learner')
const clicks = args.flatMap((a, i) => (a === '--click' ? [args[i + 1]] : []))
// The rest are hashes to shoot ('' is the home screen)
const FLAGS = new Set(['--mobile', '--learner'])
const targets = args.filter(
  (a, i) =>
    !a.startsWith('--') &&
    !(i > 0 && args[i - 1].startsWith('--') && !FLAGS.has(args[i - 1])),
)

mkdirSync(out, { recursive: true })
// Puppeteer's own Chrome if it was downloaded, else a Chromium-based browser
// that is installed (headless, with a fresh profile)
const executablePath = [
  puppeteer.executablePath(),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
].find((p) => existsSync(p))
const browser = await puppeteer.launch({
  executablePath,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage()
await page.setViewport(
  mobile
    ? { width: 390, height: 844, deviceScaleFactor: 2 }
    : { width: 1280, height: 900, deviceScaleFactor: 1 },
)
page.on('pageerror', (e) => console.log('page error:', e.message))
page.on(
  'console',
  (m) => m.type() === 'error' && console.log('console error:', m.text()),
)

if (learner) {
  // Words of the first lessons met an hour ago, every third one known, and
  // of the rest some with one link to the character well on the way
  await page.evaluateOnNewDocument(() => {
    if (localStorage.getItem('tian:bank:v1')) return
    const now = Date.now()
    const ids =
      '你好 谢谢 不客气 再见 对不起 没关系 请 好 是 不 我 你 他 她 我们 人 叫 名字 什么 吗 呢 也 很 中国 挪威 哪 国 中文 说 会 一点 一 二 三 四 五 六 七 八 九 十 两 个 钱 多少 块 买 贵 便宜 太 了 要 想 有 没有 这 那 给 可以 吃 喝 水 茶 包子 杯 和 的 好的 去 在 哪儿'.split(
        ' ',
      )
    const cards = {}
    ids.forEach((id, i) => {
      const t = now - 3600000
      const s = i % 3 === 0 ? 4 : 0.3
      cards[id] = {
        hs: { s: i % 3 === 1 ? 2 : s, t },
        hm: { s: i % 3 === 2 ? 2.5 : s, t },
        sm: { s: i % 3 === 0 ? 1.2 : s, t },
        t,
        n: 2,
        x: 0,
        i: now - 86400000,
      }
    })
    localStorage.setItem(
      'tian:bank:v1',
      JSON.stringify({
        cards,
        tones: {},
        days: {},
        scenes: { 'bj-arrival': 3, 'bj-taxi': 2 },
        best: {},
      }),
    )
  })
}

for (const t of targets.length ? targets : ['']) {
  const url = `http://localhost:${port}/${t}`
  await page.goto(url, { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, wait))
  for (const text of clicks) {
    await page.evaluate((text) => {
      const b = [...document.querySelectorAll('button, a')].find((x) =>
        x.textContent?.includes(text),
      )
      b?.click()
    }, text)
    await new Promise((r) => setTimeout(r, wait))
  }
  const name =
    (t.replace(/[^a-z0-9-]/gi, '') || 'home') + (mobile ? '-mobile' : '')
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
  console.log(`${out}/${name}.png`)
}
await browser.close()
