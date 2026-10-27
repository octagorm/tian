import { afterEach, describe, expect, test, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'

// The feedback form: anyone may send a few words, with a name and a
// screenshot if they like, and they go on to the admin's inbox. Only when
// each was sent is kept, and a flood is held back.

const modules = import.meta.glob('../convex/**/*.{ts,js}')

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function inbox(ok = true) {
  const fetch = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response('{}', { status: ok ? 200 : 500 })),
    )
  vi.stubGlobal('fetch', fetch)
  vi.stubEnv('YMSELAND_NOTIFY_TOKEN', 'test-only-token')
  return fetch
}

const sent = (fetch: ReturnType<typeof inbox>, i = 0) =>
  JSON.parse(fetch.mock.calls[i][1].body)

describe('feedback', () => {
  test('goes to the inbox, with the name given, and only the time is kept', async () => {
    const fetch = inbox()
    const t = convexTest(schema, modules)
    await t.action(api.feedback.send, {
      text: '  The taxi\r\n\r\n\r\n\r\ngot lost.  ',
      from: ' Kari \n Nordmann ',
    })
    await t.action(api.feedback.send, { text: 'Anonymous', from: '  ' })
    expect(fetch).toHaveBeenCalledTimes(2)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://admin.ymse.land/api/notify')
    expect(init.headers.authorization).toBe('Bearer test-only-token')
    expect(sent(fetch)).toEqual({
      title: 'Tilbakemelding fra Kari Nordmann',
      body: 'The taxi\n\ngot lost.',
      url: 'https://tian.ymse.land',
    })
    expect(sent(fetch, 1).title).toBe('Tilbakemelding')
    const kept = await t.run((ctx) => ctx.db.query('feedback').collect())
    expect(kept.map((f) => Object.keys(f).sort())).toEqual([
      ['_creationTime', '_id', 'at'],
      ['_creationTime', '_id', 'at'],
    ])
  })

  test('a screenshot goes with it as a data URL', async () => {
    const fetch = inbox()
    const t = convexTest(schema, modules)
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]).buffer
    await t.action(api.feedback.send, {
      text: 'See here',
      image: { type: 'image/png', bytes },
    })
    expect(sent(fetch).image).toBe('data:image/png;base64,iVBORwECAw==')
    await expect(
      t.action(api.feedback.send, {
        text: 'Not a picture',
        image: { type: 'text/html', bytes },
      }),
    ).rejects.toThrow('Not a picture')
    await expect(
      t.action(api.feedback.send, {
        text: 'Too large',
        image: { type: 'image/png', bytes: new ArrayBuffer(3 * 1024 * 1024) },
      }),
    ).rejects.toThrow('Not a picture')
  })

  test('an empty message is refused, a long one cut, a failure told', async () => {
    const fetch = inbox()
    const t = convexTest(schema, modules)
    await expect(t.action(api.feedback.send, { text: ' \n ' })).rejects.toThrow(
      'Empty',
    )
    await t.action(api.feedback.send, { text: 'x'.repeat(5000) })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(sent(fetch).body).toHaveLength(1800)
    inbox(false)
    await expect(t.action(api.feedback.send, { text: 'Down' })).rejects.toThrow(
      'Not sent',
    )
  })

  test('at most ten an hour', async () => {
    vi.useFakeTimers()
    inbox()
    const t = convexTest(schema, modules)
    for (let i = 0; i < 10; i++)
      await t.action(api.feedback.send, { text: `Hello ${i}` })
    await expect(
      t.action(api.feedback.send, { text: 'One too many' }),
    ).rejects.toThrow('Too many')
    vi.setSystemTime(Date.now() + 3_600_001)
    await t.action(api.feedback.send, { text: 'An hour later' })
  })
})
