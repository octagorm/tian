import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'

// The player's own Gemini API key for the chat (src/app/games/chat.tsx),
// kept on the account so that it follows them from device to device. It
// is encrypted (AES-GCM, bound to the account) with a secret that is not
// in the database: GEMINI_KEY_SECRET, 32 random bytes in base64, in
// Convex's environment. Once saved, the key never goes back to the
// browser: each call is given a token of Google's that starts one Live
// session within two minutes and ends within half an hour (Gemini's
// ephemeral tokens), made here from the key.

const TOKENS = 'https://generativelanguage.googleapis.com/v1beta/auth_tokens'

const bytes = (b64: string) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
const base64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))

async function secret(): Promise<CryptoKey> {
  const raw = process.env.GEMINI_KEY_SECRET
  if (!raw)
    throw new ConvexError(
      'Keys cannot be kept on accounts yet: GEMINI_KEY_SECRET is not set.',
    )
  return crypto.subtle.importKey('raw', bytes(raw), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

async function seal(key: string, userId: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const box = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) },
    await secret(),
    new TextEncoder().encode(key),
  )
  return { iv: base64(iv), box: base64(new Uint8Array(box)) }
}

async function open(row: { iv: string; box: string }, userId: string) {
  const key = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: bytes(row.iv),
      additionalData: new TextEncoder().encode(userId),
    },
    await secret(),
    bytes(row.box),
  )
  return new TextDecoder().decode(key)
}

// A token for one Live session, from Google; Google's own words if the
// key will not do
async function mint(key: string): Promise<string> {
  const now = Date.now()
  const res = await fetch(TOKENS, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(now + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
    }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    name?: string
    error?: { message?: string }
  }
  if (!res.ok || !body.name)
    throw new ConvexError(
      `Google did not accept the key: ${body.error?.message ?? res.statusText}`,
    )
  return body.name
}

async function signedIn(ctx: Parameters<typeof getAuthUserId>[0]) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new ConvexError('Sign in first')
  return userId
}

// Whether the account has a key, and its last four characters, to
// recognise it by
export const saved = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const row = await ctx.db
      .query('geminiKeys')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()
    return row ? { last4: row.last4, savedAt: row.savedAt } : null
  },
})

// A key kept on the account, once Google has taken it
export const save = action({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const userId = await signedIn(ctx)
    const key = args.key.trim()
    if (key.length < 20 || key.length > 200 || /\s/.test(key))
      throw new ConvexError('That does not look like a Gemini API key.')
    await mint(key)
    await ctx.runMutation(internal.chat.store, {
      userId,
      ...(await seal(key, userId)),
      last4: key.slice(-4),
    })
  },
})

export const forget = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await signedIn(ctx)
    const row = await ctx.db
      .query('geminiKeys')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()
    if (row) await ctx.db.delete('geminiKeys', row._id)
  },
})

// A token for a call, made with the account's key
export const token = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const userId = await signedIn(ctx)
    const row = await ctx.runQuery(internal.chat.sealed, { userId })
    if (!row) throw new ConvexError('No key on the account')
    return mint(await open(row, userId))
  },
})

export const sealed = internalQuery({
  args: { userId: v.id('users') },
  handler: (ctx, { userId }) =>
    ctx.db
      .query('geminiKeys')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first(),
})

export const store = internalMutation({
  args: {
    userId: v.id('users'),
    iv: v.string(),
    box: v.string(),
    last4: v.string(),
  },
  handler: async (ctx, { userId, ...rest }) => {
    const row = await ctx.db
      .query('geminiKeys')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()
    if (row)
      await ctx.db.patch('geminiKeys', row._id, {
        ...rest,
        savedAt: Date.now(),
      })
    else
      await ctx.db.insert('geminiKeys', {
        userId,
        ...rest,
        savedAt: Date.now(),
      })
  },
})
