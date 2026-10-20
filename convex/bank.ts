import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './access'

// The word bank on the account, so it follows the player from device to
// device. The browser keeps its own copy and merges the two
// (src/app/lib/store.tsx). The bank is stored as the JSON the page keeps;
// the page owns its shape.

// Some hundreds of words and scores; far under Convex's limit per document
const MAX = 400_000

export const bank = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const row = await ctx.db
      .query('banks')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    return row ? row.data : null
  },
})

export const save = mutation({
  args: { data: v.string() },
  handler: async (ctx, { data }) => {
    const user = await requireUser(ctx)
    if (data.length > MAX) throw new ConvexError('Word bank too large')
    try {
      const parsed: unknown = JSON.parse(data)
      if (typeof parsed !== 'object' || parsed === null || !('cards' in parsed))
        throw new Error()
    } catch {
      throw new ConvexError('Not a word bank')
    }
    const row = await ctx.db
      .query('banks')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    if (row)
      await ctx.db.patch('banks', row._id, {
        data,
        updatedAt: Date.now(),
      })
    else
      await ctx.db.insert('banks', {
        userId: user._id,
        data,
        updatedAt: Date.now(),
      })
  },
})
