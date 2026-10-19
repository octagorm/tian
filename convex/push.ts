'use node'

import webpush from 'web-push'
import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'

// Sends the daily reminders that are due (convex/reminders.ts) by Web
// Push, signed with the VAPID keys in the deployment's environment. The
// service worker (public/sw.js) shows what is sent. A subscription the push
// service says is gone is deleted.

// Who the push services can write to about these pushes
const SUBJECT = 'mailto:gorm@ymse.land'

// Not delivered within this (the phone was off), a reminder is dropped
const TTL = 3 * 60 * 60

// One line a day, in turn
const LINES = [
  'Ten minutes of Chinese, whenever you are ready.',
  'Today’s session is ready: words to review, and a few new ones.',
  'A little further every day. Today’s ten minutes are waiting.',
]

export const send = internalAction({
  args: {
    to: v.array(
      v.object({ endpoint: v.string(), p256dh: v.string(), auth: v.string() }),
    ),
  },
  handler: async (ctx, { to }) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!publicKey || !privateKey) {
      console.error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are not set')
      return
    }
    const day = Math.floor(Date.now() / 86_400_000)
    const message = JSON.stringify({
      title: '今天 Today',
      body: LINES[day % LINES.length],
      url: '/#today',
    })
    const gone: Array<string> = []
    await Promise.all(
      to.map(async ({ endpoint, p256dh, auth }) => {
        try {
          await webpush.sendNotification(
            { endpoint, keys: { p256dh, auth } },
            message,
            {
              vapidDetails: { subject: SUBJECT, publicKey, privateKey },
              TTL,
              // At the time chosen, not when it suits the phone's battery
              urgency: 'high',
              // No Topic: Apple refuses even a valid one (BadWebPushTopic),
              // and with a TTL of hours no reminder waits for the next
            },
          )
        } catch (e) {
          const status = e instanceof webpush.WebPushError ? e.statusCode : 0
          if (status === 404 || status === 410) gone.push(endpoint)
          else console.error('Push failed', new URL(endpoint).host, status, e)
        }
      }),
    )
    if (gone.length)
      await ctx.runMutation(internal.reminders.gone, { endpoints: gone })
  },
})
