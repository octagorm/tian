import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,

  // Who may keep a word bank on their account (besides the admin, who
  // always may): let in by an invitation, by the admin's answer to a
  // request, or by the admin directly
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
})
