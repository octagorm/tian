import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'
import { internalAction, query } from './_generated/server'
import { internal } from './_generated/api'
import { ADMIN_EMAIL } from './auth'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// Who may keep their word bank on their account: anyone who signs in with
// Google. Each new account is sent to the admin's inbox at
// ymse.land/admin/innboks, which pushes it to the admin's phone, and the
// admin page lists them all.

type Ctx = QueryCtx | MutationCtx

async function currentUser(ctx: Ctx): Promise<Doc<'users'> | null> {
  const userId = await getAuthUserId(ctx)
  return userId ? await ctx.db.get('users', userId) : null
}

const emailOf = (user: Doc<'users'>) => user.email?.toLowerCase() ?? ''
const isAdminUser = (user: Doc<'users'>) => emailOf(user) === ADMIN_EMAIL

// The signed-in user; else an error
export async function requireUser(ctx: Ctx): Promise<Doc<'users'>> {
  const user = await currentUser(ctx)
  if (!user) throw new ConvexError('Sign in first')
  return user
}

async function requireAdmin(ctx: Ctx): Promise<Doc<'users'>> {
  const user = await currentUser(ctx)
  if (!user || !isAdminUser(user)) throw new ConvexError('For the admin only')
  return user
}

// A new account, from auth.ts: a message for the admin's inbox, with how
// many have come in the last day
export async function welcome(ctx: MutationCtx, userId: Id<'users'>) {
  const user = await ctx.db.get('users', userId)
  if (!user || isAdminUser(user)) return
  const today = await ctx.db
    .query('users')
    .withIndex('by_creation_time', (q) =>
      q.gt('_creationTime', Date.now() - 86_400_000),
    )
    .take(1000)
  await ctx.scheduler.runAfter(0, internal.access.announce, {
    title: `Ny bruker: ${user.name ?? emailOf(user)}`,
    body: `${emailOf(user)}\n${today.length === 1 ? 'Den eneste nye' : `${today.length} nye`} det siste døgnet.`,
    url: 'https://tian.ymse.land/admin',
    tag: 'ny-bruker',
  })
}

// To the admin's inbox, with the sender's token in YMSELAND_NOTIFY_TOKEN
// (made under Avsendere at admin.ymse.land/oppsett); without it, nothing
// is sent. Unread, the next one with the same tag replaces it. `image` is
// a picture as a data URL. Whether it arrived.
export async function toInbox(m: {
  title: string
  body: string
  url?: string
  tag?: string
  image?: string
}): Promise<boolean> {
  const token = process.env.YMSELAND_NOTIFY_TOKEN
  if (!token) return false
  try {
    const res = await fetch('https://admin.ymse.land/api/notify', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(m),
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) console.error('The inbox answered', res.status)
    return res.ok
  } catch (e) {
    console.error('The inbox could not be reached', e)
    return false
  }
}

export const announce = internalAction({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (_ctx, m) => {
    await toInbox(m)
  },
})

// --- For everyone ---

// The signed-in user, or null
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    if (!user) return null
    return {
      name: user.name ?? null,
      email: emailOf(user),
      admin: isAdminUser(user),
    }
  },
})

// --- For the admin ---

// Everyone who has signed in, newest first
export const users = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const list = await ctx.db.query('users').order('desc').take(500)
    return list.map((u) => ({
      _id: u._id,
      name: u.name ?? null,
      email: emailOf(u),
      createdAt: u._creationTime,
    }))
  },
})
