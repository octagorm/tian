import { afterEach, describe, expect, test, vi } from 'vitest'
import worker from '../worker'

// The Worker passes Google's sign-in on tian.ymse.land to Convex as it came, and
// serves everything else, previews' sign-ins included, from the built files

const assets = { fetch: vi.fn(() => Promise.resolve(new Response('asset'))) }

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
      { ASSETS: assets },
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
      expect(
        await (await worker.fetch(new Request(url), { ASSETS: assets })).text(),
      ).toBe('asset')
    }
    expect(assets.fetch).toHaveBeenCalledTimes(3)
    expect(convex).not.toHaveBeenCalled()
  })
})
