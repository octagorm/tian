// Makes one image with the image tool of the Codex CLI, on the user's own
// ChatGPT plan (signed in with `codex login`), the way Puppet Theater's bridge
// does: Codex is asked to call its image tool once, and the picture is read
// from where Codex saves it. Optionally turns it into real pixel art: scaled
// down and reduced to a small palette, so it can be shown crisp and scaled up.
//
//   node scripts/image.mjs --out art/bund.png "A pixel-art night view of …"
//   node scripts/image.mjs --out art/bund.png --shape landscape \
//     --pixel 320x160 --colors 48 "…"
//   node scripts/image.mjs --out art/monk.png --transparent \
//     --ref art/style.png "…"
//
// Options:
//   --out <file>        where to write the PNG (required)
//   --shape <s>         landscape (default), portrait or square
//   --transparent       ask for a transparent background (for cutouts)
//   --ref <file>        a reference image (repeatable), e.g. for a shared style
//   --pixel <WxH>       make pixel art at this size: <out> is the pixel art.
//                       Match the canvas: landscape comes back about 16:9
//                       (e.g. 320x180), portrait 9:16, square 1:1
//   --full <file>       also keep the full-size original there (keep it out
//                       of public/: it is megabytes)
//   --colors <n>        palette size for --pixel (default 48)
//   --dither            ordered dither when reducing colours (default none)
//
// Each image takes a minute or two and counts against the ChatGPT plan's
// limits. Prompts work best as plain, concrete descriptions of the picture.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const all = (name) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []))
const FLAGS = new Set(['--transparent', '--dither'])
const prompt = args
  .filter(
    (a, i) =>
      !a.startsWith('--') &&
      !(i > 0 && args[i - 1].startsWith('--') && !FLAGS.has(args[i - 1])),
  )
  .join(' ')
const out = opt('--out')
if (!out || !prompt) {
  console.error(
    'usage: node scripts/image.mjs --out <file> [options] "<prompt>"',
  )
  process.exit(1)
}
const shape = opt('--shape') ?? 'landscape'
const transparent = args.includes('--transparent')
const refs = all('--ref')
const pixel = opt('--pixel')
const colors = opt('--colors') ?? '48'
const dither = args.includes('--dither')
const keepFull = opt('--full')

const CODEX_HOME = process.env.CODEX_HOME ?? join(homedir(), '.codex')
const TIMEOUT_MS = 6 * 60 * 1000

function instruction() {
  const bg = transparent ? ', with a transparent background' : ''
  const lines = [
    `Use your image generation tool to generate exactly one image, on a ${shape} canvas${bg}.`,
    'Pass the description below to the tool as faithfully as you can.',
    ...(refs.length
      ? ['Give the attached images to the tool as reference images.']
      : []),
    'Do not run shell commands or write files. When the image is made, reply with only the word done.',
  ]
  return `${lines.join(' ')}\n\nDESCRIPTION\n\n${prompt}`
}

function run(codexArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn('codex', codexArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let threadId = ''
    let last = ''
    let buffered = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS)
    child.stdout.on('data', (chunk) => {
      buffered += chunk.toString()
      const lines = buffered.split('\n')
      buffered = lines.pop() ?? ''
      for (const line of lines) {
        let event
        try {
          event = JSON.parse(line)
        } catch {
          continue
        }
        if (event.type === 'thread.started' && event.thread_id)
          threadId = event.thread_id
        if (event.item?.type === 'agent_message' && event.item.text)
          last = event.item.text
      }
    })
    child.stderr.on(
      'data',
      (c) => (stderr = (stderr + c.toString()).slice(-2000)),
    )
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0)
        reject(
          new Error(
            `codex exited with ${code}: ${stderr.trim().split('\n').pop() ?? ''}`,
          ),
        )
      else if (!threadId) reject(new Error('codex did not report a thread id'))
      else resolve({ threadId, last })
    })
  })
}

function magick(...a) {
  return new Promise((resolve, reject) => {
    const child = spawn('magick', a, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    child.stderr.on('data', (c) => (err += c.toString()))
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(err)),
    )
  })
}

const work = mkdtempSync(join(tmpdir(), 'tian-image-'))
try {
  const { threadId, last } = await run([
    'exec',
    '--json',
    '--ephemeral',
    '--skip-git-repo-check',
    '--ignore-user-config',
    '--sandbox',
    'read-only',
    '--cd',
    work,
    instruction(),
    ...refs.flatMap((r) => ['--image', r]),
  ])
  const dir = join(CODEX_HOME, 'generated_images', threadId)
  let files = []
  try {
    files = readdirSync(dir)
      .filter((f) => /\.(png|webp|jpe?g)$/i.test(f))
      .map((f) => join(dir, f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  } catch {
    // no folder: no image
  }
  if (!files.length)
    throw new Error(`no image made; codex said: ${last || '(nothing)'}`)
  mkdirSync(dirname(out), { recursive: true })
  if (!pixel) {
    await magick(files[0], out)
  } else {
    // Scale down by area averaging and reduce the palette, so the result is
    // true pixel art at its own small size
    if (keepFull) {
      mkdirSync(dirname(keepFull), { recursive: true })
      await magick(files[0], keepFull)
    }
    await magick(
      files[0],
      '-filter',
      'Box',
      '-resize',
      `${pixel}!`,
      ...(dither ? ['-ordered-dither', 'o4x4,32'] : ['+dither']),
      '-colors',
      colors,
      '-strip',
      out,
    )
  }
  console.log(out)
} finally {
  rmSync(work, { recursive: true, force: true })
}
