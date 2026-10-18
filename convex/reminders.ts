import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import type { MutationCtx, QueryCtx } from './_generated/server'

// The daily reminder: a notification at a time of day the player chooses,
// unless Today's session is done already. A web page cannot ask for a
// notification later by itself, so the browser subscribes to Web Push
// (src/app/lib/reminder.ts) and the subscription is kept here, keyed by its
// endpoint, with the time and the time zone. Each minute a cron (crons.ts)
// takes the reminders due, skips those whose day is done, and has
// convex/push.ts send the rest; the service worker (public/sw.js) shows
// them. Nobody needs an account; the endpoint is the key.

// The public half of the keys pushes are signed with (VAPID), for the page
// to subscribe with; null when they are not set (`npx convex env set`)
export const key = query({
  args: {},
  handler: () => process.env.VAPID_PUBLIC_KEY ?? null,
})

const subscription = {
  endpoint: v.string(),
  p256dh: v.string(),
  auth: v.string(),
}

// Turns the reminder on for a browser, or changes its time or zone. `done`
// is today, if the session is done already.
export const set = mutation({
  args: {
    ...subscription,
    time: v.string(),
    zone: v.string(),
    done: v.optional(v.string()),
  },
  handler: async (ctx, { endpoint, p256dh, auth, time, zone, done }) => {
    if (!pushService(endpoint)) throw new ConvexError('Not a push service')
    if (p256dh.length > 200 || auth.length > 100)
      throw new ConvexError('Not a push subscription')
    if (!TIME.test(time)) throw new ConvexError('Not a time of day')
    if (!validZone(zone)) throw new ConvexError('Not a time zone')
    if (done !== undefined && !DAY.test(done))
      throw new ConvexError('Not a day')
    const userId = (await getAuthUserId(ctx)) ?? undefined
    const next = nextAt(time, zone, Date.now())
    const row = await byEndpoint(ctx, endpoint)
    if (!row) {
      await ctx.db.insert('reminders', {
        endpoint,
        p256dh,
        auth,
        time,
        zone,
        next,
        done,
        userId,
      })
      return
    }
    await ctx.db.patch('reminders', row._id, {
      p256dh,
      auth,
      time,
      zone,
      next,
      done: done !== undefined && fresh(done, row.done) ? done : row.done,
      userId,
    })
  },
})

// Turns it off: the browser unsubscribes too
export const remove = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const row = await byEndpoint(ctx, endpoint)
    if (row) await ctx.db.delete('reminders', row._id)
  },
})

// Today's session done on `day` (in the player's zone): no reminder that
// day, in this browser, or for whoever is signed in, in all of theirs
export const done = mutation({
  args: { day: v.string(), endpoint: v.optional(v.string()) },
  handler: async (ctx, { day, endpoint }) => {
    if (!DAY.test(day)) throw new ConvexError('Not a day')
    const rows = []
    const mine = endpoint ? await byEndpoint(ctx, endpoint) : null
    if (mine) rows.push(mine)
    const userId = await getAuthUserId(ctx)
    if (userId)
      for (const row of await ctx.db
        .query('reminders')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect())
        if (row._id !== mine?._id) rows.push(row)
    for (const row of rows)
      if (fresh(day, row.done))
        await ctx.db.patch('reminders', row._id, { done: day })
  },
})

// A reminder more late than this (the cron did not run) is not sent
const LATE = 60 * 60_000

// The reminders due: each is sent unless its day is done, and set for the
// same time the next day
export const due = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const rows = await ctx.db
      .query('reminders')
      .withIndex('by_next', (q) => q.lte('next', now))
      .take(500)
    const to = []
    for (const r of rows) {
      const day = localDay(r.next, r.zone)
      if (fresh(day, r.done) && now - r.next < LATE)
        to.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth })
      await ctx.db.patch('reminders', r._id, {
        next: nextAt(r.time, r.zone, now),
      })
    }
    if (to.length) await ctx.scheduler.runAfter(0, internal.push.send, { to })
  },
})

// Subscriptions the push service says are gone (the browser unsubscribed,
// or notifications were turned off)
export const gone = internalMutation({
  args: { endpoints: v.array(v.string()) },
  handler: async (ctx, { endpoints }) => {
    for (const endpoint of endpoints) {
      const row = await byEndpoint(ctx, endpoint)
      if (row) await ctx.db.delete('reminders', row._id)
    }
  },
})

async function byEndpoint(ctx: QueryCtx | MutationCtx, endpoint: string) {
  return await ctx.db
    .query('reminders')
    .withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
    .first()
}

// --- Time of day in a time zone ---

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

// Whether a day ('YYYY-MM-DD') comes after the last one done, if any
const fresh = (day: string, last: string | undefined) =>
  last === undefined || day > last

// Only the push services of browsers, so that nobody can have this send
// requests anywhere else
export function pushService(endpoint: string): boolean {
  if (endpoint.length > 1000) return false
  try {
    const url = new URL(endpoint)
    return (
      url.protocol === 'https:' &&
      /(^|\.)(googleapis\.com|mozilla\.com|push\.apple\.com|notify\.windows\.com)$/.test(
        url.hostname,
      )
    )
  } catch {
    return false
  }
}

export function validZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return zone.length < 100
  } catch {
    return false
  }
}

const formats = new Map<string, Intl.DateTimeFormat>()

// The date and time on the clock of a zone at an instant
function wall(t: number, zone: string) {
  let f = formats.get(zone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formats.set(zone, f)
  }
  const parts = f.formatToParts(new Date(t))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  return {
    y: get('year'),
    m: get('month'),
    d: get('day'),
    h: get('hour'),
    min: get('minute'),
    s: get('second'),
  }
}

// How far a zone's clock is ahead of UTC at an instant, in ms
function offset(t: number, zone: string): number {
  const w = wall(t, zone)
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s) - (t - (t % 1000))
}

// The day on the clock of a zone at an instant, as 'YYYY-MM-DD' (the page's
// dayKey, lib/bank.ts, in the player's own zone)
export function localDay(t: number, zone: string): string {
  const w = wall(t, zone)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${w.y}-${pad(w.m)}-${pad(w.d)}`
}

// The first instant after `after` when the clock of `zone` shows `time`
// ('HH:MM'). Across a change of summer time it keeps to the clock; a time
// the clock skips that night comes an hour later.
export function nextAt(time: string, zone: string, after: number): number {
  const [h, min] = time.split(':').map(Number)
  const w = wall(after, zone)
  for (let i = 0; ; i++) {
    // Date.UTC carries a day past the month's end into the next
    const guess = Date.UTC(w.y, w.m - 1, w.d + i, h, min)
    let t = guess - offset(guess, zone)
    t = guess - offset(t, zone)
    if (t > after) return t
  }
}
