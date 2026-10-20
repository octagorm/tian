import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,

  // No longer used: from before signing in was enough (access.ts). Kept so
  // that a deploy does not meet documents its schema lacks; empty them in
  // the dashboard, then remove them here.
  //
  // Who could keep a word bank on their account: let in by an invitation,
  // by the admin's answer to a request, or by the admin
  members: defineTable({
    userId: v.id('users'),
    email: v.string(),
    via: v.union(v.literal('invite'), v.literal('request'), v.literal('admin')),
    invite: v.optional(v.id('invites')),
    grantedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_email', ['email']),

  // Invitation links the admin makes: valid until `expiresAt` (none: no
  // end) unless revoked
  invites: defineTable({
    token: v.string(),
    label: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    uses: v.number(),
  }).index('by_token', ['token']),

  // Someone signed in who asks to be let in
  accessRequests: defineTable({
    userId: v.id('users'),
    email: v.string(),
    name: v.optional(v.string()),
    message: v.optional(v.string()),
    createdAt: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('denied'),
    ),
    decidedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status']),

  // The word bank, as the page's own JSON, so it follows the account from
  // device to device
  banks: defineTable({
    userId: v.id('users'),
    data: v.string(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // A daily reminder to do Today's session, pushed to one browser
  // (convex/reminders.ts), with or without an account: its push
  // subscription, the time of day and time zone it is for, and the last day
  // the session was done there. Linked to the account of whoever was signed
  // in, so that a session done on another device counts too.
  reminders: defineTable({
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    // 'HH:MM', on the clock of `zone` (IANA)
    time: v.string(),
    zone: v.string(),
    // When the next one is due
    next: v.number(),
    // The last day the session was done, 'YYYY-MM-DD' in `zone`
    done: v.optional(v.string()),
    userId: v.optional(v.id('users')),
  })
    .index('by_endpoint', ['endpoint'])
    .index('by_next', ['next'])
    .index('by_user', ['userId']),
})
