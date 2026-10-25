import { afterEach, describe, expect, test, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'

// The chat's Gemini key on the account (convex/chat.ts): encrypted, never
// given back, turned into a token of Google's for each call.

const modules = import.meta.glob('../convex/**/*.{ts,js}')

const KEY = 'AIzaSyTestKey-0123456789abcdefWXYZ'
const SECRET = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

// Google's token endpoint: a token for a good key, an error for others
function google() {
  const calls: Array<{ url: string; key: string; body: unknown }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      const key = (init.headers as Record<string, string>)['x-goog-api-key']
      calls.push({ url, key, body: JSON.parse(init.body as string) })
      return Promise.resolve(
        key === KEY
          ? new Response(
              JSON.stringify({ name: `auth_tokens/t${calls.length}` }),
            )
          : new Response(
              JSON.stringify({ error: { message: 'API key not valid.' } }),
              { status: 400 },
            ),
      )
    }),
  )
  return calls
}

async function setup() {
  const t = convexTest(schema, modules)
  const [ola, kari] = await t.run(async (ctx) => [
    await ctx.db.insert('users', { email: 'ola@example.com' }),
    await ctx.db.insert('users', { email: 'kari@example.com' }),
  ])
  return {
    t,
    ola: t.withIdentity({ subject: `${ola}|s` }),
    kari: t.withIdentity({ subject: `${kari}|s` }),
  }
}

describe('the chat key on the account', () => {
  test('kept encrypted, known by its last four, made into tokens', async () => {
    vi.stubEnv('GEMINI_KEY_SECRET', SECRET)
    const calls = google()
    const { t, ola, kari } = await setup()
    expect(await ola.query(api.chat.saved, {})).toBeNull()
    await ola.action(api.chat.save, { key: ` ${KEY} ` })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toContain('/v1beta/auth_tokens')
    expect(await ola.query(api.chat.saved, {})).toMatchObject({ last4: 'WXYZ' })
    // nowhere in the database as it is
    const rows = await t.run((ctx) => ctx.db.query('geminiKeys').collect())
    expect(rows).toHaveLength(1)
    expect(JSON.stringify(rows)).not.toContain(KEY)
    expect(JSON.stringify(rows)).not.toContain(btoa(KEY))

    expect(await ola.action(api.chat.token, {})).toBe('auth_tokens/t2')
    expect(calls[1].key).toBe(KEY)
    expect(calls[1].body).toMatchObject({ uses: 1 })

    // someone else's account has none, and cannot use Ola's
    expect(await kari.query(api.chat.saved, {})).toBeNull()
    await expect(kari.action(api.chat.token, {})).rejects.toThrow(
      'No key on the account',
    )
    await ola.mutation(api.chat.forget, {})
    expect(await ola.query(api.chat.saved, {})).toBeNull()
  })

  test('a key Google refuses is not kept', async () => {
    vi.stubEnv('GEMINI_KEY_SECRET', SECRET)
    google()
    const { ola } = await setup()
    await expect(
      ola.action(api.chat.save, { key: 'AIzaSyWrongKey-0123456789abcdef' }),
    ).rejects.toThrow('API key not valid.')
    await expect(ola.action(api.chat.save, { key: 'short' })).rejects.toThrow(
      'does not look like',
    )
    expect(await ola.query(api.chat.saved, {})).toBeNull()
  })

  test('signed in only, and only with the secret set', async () => {
    google()
    const { t, ola } = await setup()
    await expect(t.action(api.chat.save, { key: KEY })).rejects.toThrow(
      'Sign in first',
    )
    expect(await t.query(api.chat.saved, {})).toBeNull()
    await expect(ola.action(api.chat.save, { key: KEY })).rejects.toThrow(
      'GEMINI_KEY_SECRET',
    )
  })

  test('a row moved to another account does not open', async () => {
    vi.stubEnv('GEMINI_KEY_SECRET', SECRET)
    google()
    const { t, ola, kari } = await setup()
    await ola.action(api.chat.save, { key: KEY })
    const kariId = await t.run(async (ctx) => {
      const users = await ctx.db.query('users').collect()
      const k = users.find((u) => u.email === 'kari@example.com')!._id
      const row = (await ctx.db.query('geminiKeys').first())!
      await ctx.db.patch('geminiKeys', row._id, { userId: k })
      return k
    })
    expect(kariId).toBeTruthy()
    await expect(kari.action(api.chat.token, {})).rejects.toThrow()
  })
})
