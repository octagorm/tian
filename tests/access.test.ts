import { afterEach, describe, expect, test, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api, internal } from '../convex/_generated/api'
import { welcome } from '../convex/access'
import { ADMIN_EMAIL } from '../convex/auth'

// Who gets in: anyone who signs in with Google keeps a word bank on their
// account. Each new account is sent to the admin's inbox on ymse.land, and
// only the admin sees the list of them.

const modules = import.meta.glob('../convex/**/*.{ts,js}')

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function setup() {
  const t = convexTest(schema, modules)
  const [admin, ola] = await t.run(async (ctx) => [
    await ctx.db.insert('users', { email: ADMIN_EMAIL, name: 'Gorm' }),
    await ctx.db.insert('users', { email: 'ola@example.com', name: 'Ola' }),
  ])
  return {
    t,
    ids: { admin, ola },
    admin: t.withIdentity({ subject: `${admin}|s` }),
    ola: t.withIdentity({ subject: `${ola}|s` }),
  }
}

const progress = { data: JSON.stringify({ cards: { 你好: { s: 2 } } }) }

describe('access', () => {
  test('signed in is enough, and only the admin sees who has come', async () => {
    const { t, admin, ola } = await setup()
    expect(await t.query(api.access.me, {})).toBeNull()
    expect(await ola.query(api.access.me, {})).toEqual({
      name: 'Ola',
      email: 'ola@example.com',
      admin: false,
    })
    await expect(t.query(api.bank.bank, {})).rejects.toThrow('Sign in first')
    await ola.mutation(api.bank.save, progress)
    expect(await ola.query(api.bank.bank, {})).toEqual(progress.data)
    await expect(ola.query(api.access.users, {})).rejects.toThrow(
      'For the admin only',
    )
    const users = await admin.query(api.access.users, {})
    expect(users.map((u) => u.email)).toEqual(['ola@example.com', ADMIN_EMAIL])
  })

  test('a new account goes to the inbox on ymse.land, the admin does not', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetch)
    vi.stubEnv('YMSELAND_NOTIFY_TOKEN', 'test-only-token')
    const { t, ids } = await setup()
    await t.run((ctx) => welcome(ctx, ids.admin))
    await t.run((ctx) => welcome(ctx, ids.ola))
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://admin.ymse.land/api/notify')
    expect(init.headers.authorization).toBe('Bearer test-only-token')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ title: 'Ny bruker: Ola', tag: 'ny-bruker' })
    expect(body.body).toContain('2 nye det siste døgnet')
  })

  test('without a token, nothing is sent', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { t } = await setup()
    await t.action(internal.access.announce, { title: 'Hei', body: '' })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('a word bank is checked and kept per user', async () => {
    const { admin } = await setup()
    await expect(
      admin.mutation(api.bank.save, { data: '{"no":"cards"}' }),
    ).rejects.toThrow('Not a word bank')
    await expect(
      admin.mutation(api.bank.save, { data: 'not json' }),
    ).rejects.toThrow('Not a word bank')
    expect(await admin.query(api.bank.bank, {})).toBeNull()
    await admin.mutation(api.bank.save, progress)
    expect(await admin.query(api.bank.bank, {})).toEqual(progress.data)
  })
})
