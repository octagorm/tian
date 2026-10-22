import { afterEach, describe, expect, test, vi } from 'vitest'
import worker from '../worker'
import type { Env } from '../worker'

// The Worker passes Google's sign-in on tian.ymse.land to Convex as it came,
// serves the podcast from R2, and everything else, previews' sign-ins
// included, from the built files

const assets = { fetch: vi.fn(() => Promise.resolve(new Response('asset'))) }

// A bucket holding one file of ten bytes, answering ranges and preconditions
// as R2 does
const FILE = '0123456789'
const object = (
  range?: { offset?: number; length?: number; suffix?: number },
  body = true,
) => ({
  size: FILE.length,
  httpEtag: '"e1"',
  range,
  writeHttpMetadata: (headers: Headers) =>
    headers.set('content-type', 'audio/mpeg'),
  body: body ? new Response(slice(range)).body! : undefined,
})
function slice(range?: { offset?: number; length?: number; suffix?: number }) {
  if (!range) return FILE
  if (range.suffix !== undefined) return FILE.slice(-range.suffix)
  const start = range.offset ?? 0
  return FILE.slice(
    start,
    range.length === undefined ? undefined : start + range.length,
  )
}
const bucket: Env['PODCAST'] = {
  head: vi.fn((key: string) =>
    Promise.resolve(key === 'ep.mp3' ? object(undefined, false) : null),
  ),
  get: vi.fn(
    (key: string, { range, onlyIf }: { range: Headers; onlyIf: Headers }) => {
      if (key !== 'ep.mp3') return Promise.resolve(null)
      if (onlyIf.get('if-none-match') === '"e1"')
        return Promise.resolve(object(undefined, false))
      const m = /bytes=(\d*)-(\d*)/.exec(range.get('range') ?? '')
      if (!m) return Promise.resolve(object())
      if (!m[1]) return Promise.resolve(object({ suffix: Number(m[2]) }))
      const offset = Number(m[1])
      return Promise.resolve(
        object({
          offset,
          length: m[2] ? Number(m[2]) - offset + 1 : undefined,
        }),
      )
    },
  ),
}
const env = { ASSETS: assets, PODCAST: bucket }

afterEach(() => {
  vi.unstubAllGlobals()
  assets.fetch.mockClear()
})

describe('worker', () => {
  test('passes a sign-in on to Convex as it came', async () => {
    const convex = vi.fn((_request: Request, _init?: RequestInit) =>
      Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: 'https://tian.ymse.land/?code=c' },
        }),
      ),
    )
    vi.stubGlobal('fetch', convex)

    const response = await worker.fetch(
      new Request(
        'https://tian.ymse.land/api/auth/callback/google?code=c&state=s',
        {
          method: 'POST',
          headers: { cookie: '__Host-googleOAuthpkce=v' },
          body: 'code=c',
        },
      ),
      env,
    )

    const [sent, init] = convex.mock.calls[0]
    expect(sent.url).toBe(
      'https://valuable-akita-141.convex.site/api/auth/callback/google?code=c&state=s',
    )
    expect(sent.method).toBe('POST')
    expect(sent.headers.get('cookie')).toBe('__Host-googleOAuthpkce=v')
    expect(await sent.text()).toBe('code=c')
    expect(init).toMatchObject({ redirect: 'manual', cache: 'no-store' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://tian.ymse.land/?code=c',
    )
    expect(assets.fetch).not.toHaveBeenCalled()
  })

  test('serves pages, and sign-ins on other addresses, from the built files', async () => {
    const convex = vi.fn()
    vi.stubGlobal('fetch', convex)

    for (const url of [
      'https://tian.ymse.land/admin',
      'https://tian.ymse.land/api/authx',
      'https://main-tian.gorm.workers.dev/api/auth/signin/google',
    ]) {
      expect(await (await worker.fetch(new Request(url), env)).text()).toBe(
        'asset',
      )
    }
    expect(assets.fetch).toHaveBeenCalledTimes(3)
    expect(convex).not.toHaveBeenCalled()
  })

  test('serves the podcast from R2, in byte ranges', async () => {
    const get = (
      path: string,
      headers: Record<string, string> = {},
      method = 'GET',
    ) =>
      worker.fetch(
        new Request(`https://tian.ymse.land/podcast/${path}`, {
          method,
          headers,
        }),
        env,
      )

    const whole = await get('ep.mp3')
    expect(whole.status).toBe(200)
    expect(await whole.text()).toBe(FILE)
    expect(whole.headers.get('content-type')).toBe('audio/mpeg')
    expect(whole.headers.get('accept-ranges')).toBe('bytes')
    expect(whole.headers.get('etag')).toBe('"e1"')

    const part = await get('ep.mp3', { range: 'bytes=2-5' })
    expect(part.status).toBe(206)
    expect(part.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(await part.text()).toBe('2345')

    const open = await get('ep.mp3', { range: 'bytes=7-' })
    expect(open.headers.get('content-range')).toBe('bytes 7-9/10')
    expect(await open.text()).toBe('789')

    const tail = await get('ep.mp3', { range: 'bytes=-3' })
    expect(tail.headers.get('content-range')).toBe('bytes 7-9/10')
    expect(await tail.text()).toBe('789')

    expect((await get('ep.mp3', { 'if-none-match': '"e1"' })).status).toBe(304)

    const head = await get('ep.mp3', {}, 'HEAD')
    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe('10')

    expect((await get('missing.mp3')).status).toBe(404)
    expect((await get('')).status).toBe(404)
    expect((await get('ep.mp3', {}, 'POST')).status).toBe(405)
    expect(assets.fetch).not.toHaveBeenCalled()
  })
})
