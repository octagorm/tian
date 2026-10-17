import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { ADMIN_EMAIL } from './auth'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

// Who may keep their word bank on their account. Anyone with a
// Google account can sign in, but only members get in: the admin lets
// people in by answering their requests, or by invitation links that last
// for a while (or until revoked). The admin is always a member.

type Ctx = QueryCtx | MutationCtx

async function currentUser(ctx: Ctx): Promise<Doc<'users'> | null> {
  const userId = await getAuthUserId(ctx)
  return userId ? await ctx.db.get('users', userId) : null
}

const emailOf = (user: Doc<'users'>) => user.email?.toLowerCase() ?? ''
const isAdminUser = (user: Doc<'users'>) => emailOf(user) === ADMIN_EMAIL

async function memberOf(ctx: Ctx, userId: Id<'users'>) {
  return await ctx.db
    .query('members')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

// The signed-in user, if a member (or the admin); else an error
export async function requireMember(ctx: Ctx): Promise<Doc<'users'>> {
  const user = await currentUser(ctx)
  if (!user) throw new ConvexError('Sign in first')
  if (!isAdminUser(user) && !(await memberOf(ctx, user._id)))
    throw new ConvexError('No access yet')
  return user
}

async function requireAdmin(ctx: Ctx): Promise<Doc<'users'>> {
  const user = await currentUser(ctx)
  if (!user || !isAdminUser(user)) throw new ConvexError('For the admin only')
  return user
}

async function signedIn(ctx: Ctx): Promise<Doc<'users'>> {
  const user = await currentUser(ctx)
  if (!user) throw new ConvexError('Sign in first')
  return user
}

// An invitation that can be used now, or null
async function validInvite(ctx: Ctx, token: string) {
  const invite = await ctx.db
    .query('invites')
    .withIndex('by_token', (q) => q.eq('token', token))
    .first()
  if (!invite || invite.revokedAt !== undefined) return null
  if (invite.expiresAt !== undefined && invite.expiresAt < Date.now())
    return null
  return invite
}

// --- For everyone ---

// Where the signed-in user stands: not signed in (null), a member, waiting
// for an answer, or neither
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx)
    if (!user) return null
    const admin = isAdminUser(user)
    const member = admin || !!(await memberOf(ctx, user._id))
    const request = await ctx.db
      .query('accessRequests')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .first()
    return {
      name: user.name ?? null,
      email: emailOf(user),
      admin,
      member,
      request: member ? null : (request?.status ?? null),
    }
  },
})

// Whether an invitation link is good, before signing in with it
export const invitation = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await validInvite(ctx, token)
    return invite ? { label: invite.label } : null
  },
})

// Uses an invitation: the signed-in user becomes a member
export const redeem = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await signedIn(ctx)
    if (isAdminUser(user) || (await memberOf(ctx, user._id))) return true
    const invite = await validInvite(ctx, token)
    if (!invite) throw new ConvexError('The invitation is no longer valid')
    await ctx.db.insert('members', {
      userId: user._id,
      email: emailOf(user),
      via: 'invite',
      invite: invite._id,
      grantedAt: Date.now(),
    })
    await ctx.db.patch('invites', invite._id, { uses: invite.uses + 1 })
    return true
  },
})

// Asks the admin to be let in (again, if asked before)
export const request = mutation({
  args: { message: v.optional(v.string()) },
  handler: async (ctx, { message }) => {
    const user = await signedIn(ctx)
    if (isAdminUser(user) || (await memberOf(ctx, user._id))) return
    const text = message?.trim().slice(0, 500) || undefined
    const prev = await ctx.db
      .query('accessRequests')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .first()
    if (prev) {
      await ctx.db.patch('accessRequests', prev._id, {
        message: text,
        createdAt: Date.now(),
      })
      return
    }
    await ctx.db.insert('accessRequests', {
      userId: user._id,
      email: emailOf(user),
      name: user.name,
      message: text,
      createdAt: Date.now(),
      status: 'pending',
    })
  },
})

// --- For the admin ---

export const requests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.db
      .query('accessRequests')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('desc')
      .collect()
  },
})

export const decide = mutation({
  args: { id: v.id('accessRequests'), approve: v.boolean() },
  handler: async (ctx, { id, approve }) => {
    await requireAdmin(ctx)
    const req = await ctx.db.get('accessRequests', id)
    if (!req || req.status !== 'pending') return
    await ctx.db.patch('accessRequests', id, {
      status: approve ? 'approved' : 'denied',
      decidedAt: Date.now(),
    })
    if (approve && !(await memberOf(ctx, req.userId)))
      await ctx.db.insert('members', {
        userId: req.userId,
        email: req.email,
        via: 'request',
        grantedAt: Date.now(),
      })
  },
})

export const invites = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const all = await ctx.db.query('invites').order('desc').collect()
    const now = Date.now()
    return all.map((i) => ({
      ...i,
      valid:
        i.revokedAt === undefined &&
        (i.expiresAt === undefined || i.expiresAt >= now),
    }))
  },
})

// A new invitation link's token, valid for `days` (none: no end)
export const invite = mutation({
  args: { label: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, { label, days }) => {
    await requireAdmin(ctx)
    const now = Date.now()
    const token = crypto.randomUUID().replaceAll('-', '')
    await ctx.db.insert('invites', {
      token,
      label: label.trim().slice(0, 100) || 'Invitation',
      createdAt: now,
      expiresAt: days === undefined ? undefined : now + days * 86_400_000,
      uses: 0,
    })
    return token
  },
})

export const revokeInvite = mutation({
  args: { id: v.id('invites') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx)
    const i = await ctx.db.get('invites', id)
    if (i && i.revokedAt === undefined)
      await ctx.db.patch('invites', id, { revokedAt: Date.now() })
  },
})

export const members = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const list = await ctx.db.query('members').order('desc').collect()
    return await Promise.all(
      list.map(async (m) => {
        const user = await ctx.db.get('users', m.userId)
        const from = m.invite ? await ctx.db.get('invites', m.invite) : null
        return {
          ...m,
          name: user?.name ?? null,
          inviteLabel: from?.label ?? null,
        }
      }),
    )
  },
})

// Takes away someone's access (they can ask again)
export const removeMember = mutation({
  args: { id: v.id('members') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx)
    await ctx.db.delete('members', id)
  },
})
