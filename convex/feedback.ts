import { ConvexError, v } from 'convex/values'
import { action, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { toInbox } from './access'

// Feedback from the form at the foot of the home page, sent on to the
// admin's inbox, with a screenshot if one is pasted or chosen (made smaller
// in the browser first). Anyone may send it, signed in or not; the sender's
// name is optional and as given. Nothing is kept here but when each was
// sent, so that at most PER_HOUR an hour go on and a flood cannot crowd out
// the notices of new accounts.

export const MAX_TEXT = 1800
export const MAX_FROM = 100
export const MAX_IMAGE = 2 * 1024 * 1024
const TYPES = ['image/png', 'image/jpeg', 'image/webp']
const PER_HOUR = 10

const clean = (s: string, max: number) =>
  s
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)

const base64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export const send = action({
  args: {
    text: v.string(),
    from: v.optional(v.string()),
    image: v.optional(v.object({ type: v.string(), bytes: v.bytes() })),
  },
  handler: async (ctx, args) => {
    const text = clean(args.text, MAX_TEXT)
    const from = clean(args.from ?? '', MAX_FROM).replace(/\s+/g, ' ')
    if (!text) throw new ConvexError('Empty')
    const { image } = args
    if (
      image &&
      (!TYPES.includes(image.type) ||
        image.bytes.byteLength === 0 ||
        image.bytes.byteLength > MAX_IMAGE)
    )
      throw new ConvexError('Not a picture')
    await ctx.runMutation(internal.feedback.count, {})
    const sent = await toInbox({
      title: from ? `Tilbakemelding fra ${from}` : 'Tilbakemelding',
      body: text,
      url: 'https://tian.ymse.land',
      image: image
        ? `data:${image.type};base64,${base64(new Uint8Array(image.bytes))}`
        : undefined,
    })
    if (!sent) throw new ConvexError('Not sent')
  },
})

// One more sent, unless PER_HOUR have been this last hour
export const count = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const recent = await ctx.db
      .query('feedback')
      .withIndex('by_at', (q) => q.gt('at', now - 3_600_000))
      .take(PER_HOUR)
    if (recent.length >= PER_HOUR) throw new ConvexError('Too many')
    // The day before's are no longer needed
    const old = await ctx.db
      .query('feedback')
      .withIndex('by_at', (q) => q.lt('at', now - 86_400_000))
      .take(50)
    for (const f of old) await ctx.db.delete('feedback', f._id)
    await ctx.db.insert('feedback', { at: now })
  },
})
