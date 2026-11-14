import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api, internal } from '../convex/_generated/api'
import { localDay, nextAt, pushService } from '../convex/reminders'
import type { Id } from '../convex/_generated/dataModel'

// The daily reminder: due at the same time on the player's clock every
// day, summer time or not, and not sent on a day the session was done.

const modules = import.meta.glob('../convex/**/*.{ts,js}')

const at = (iso: string) => new Date(iso).getTime()
const iso = (t: number) => new Date(t).toISOString()

describe('the time of the next reminder', () => {
  test('later today, or tomorrow once past', () => {
    const oslo = 'Europe/Oslo'
    expect(iso(nextAt('18:00', oslo, at('2026-10-18T08:00:00Z')))).toBe(
      '2026-10-18T16:00:00.000Z',
    )
    expect(iso(nextAt('18:00', oslo, at('2026-10-18T16:00:00Z')))).toBe(
      '2026-10-19T16:00:00.000Z',
    )
    // Past midnight UTC, still the same evening in Oslo
    expect(iso(nextAt('00:30', oslo, at('2026-10-18T21:00:00Z')))).toBe(
      '2026-10-18T22:30:00.000Z',
    )
  })

  test('keeps to the clock when summer time ends and begins', () => {
    // Oslo goes from UTC+2 to UTC+1 on 25 October 2026, and back on 28
    // March 2027
    const oslo = 'Europe/Oslo'
    expect(iso(nextAt('18:00', oslo, at('2026-10-24T16:00:00Z')))).toBe(
      '2026-10-25T17:00:00.000Z',
    )
    expect(iso(nextAt('18:00', oslo, at('2027-03-27T17:00:00Z')))).toBe(
      '2027-03-28T16:00:00.000Z',
    )
    // New York, a week later in autumn: UTC−4 to UTC−5
    const ny = 'America/New_York'
    expect(iso(nextAt('07:15', ny, at('2026-10-31T12:00:00Z')))).toBe(
      '2026-11-01T12:15:00.000Z',
    )
    // Across the end of a month and a year
    expect(
      iso(nextAt('09:00', 'Asia/Shanghai', at('2026-12-31T02:00:00Z'))),
    ).toBe('2027-01-01T01:00:00.000Z')
  })

  test('a time the clock skips comes an hour later', () => {
    // 02:30 does not happen in Oslo on 28 March 2027
    expect(
      iso(nextAt('02:30', 'Europe/Oslo', at('2027-03-27T12:00:00Z'))),
    ).toBe('2027-03-28T01:30:00.000Z')
  })

  test('the day on the player’s clock', () => {
    expect(localDay(at('2026-10-18T22:30:00Z'), 'Europe/Oslo')).toBe(
      '2026-10-19',
    )
    expect(localDay(at('2026-10-18T22:30:00Z'), 'America/New_York')).toBe(
      '2026-10-18',
    )
  })

  test('only browsers’ push services', () => {
    expect(pushService('https://fcm.googleapis.com/fcm/send/abc')).toBe(true)
    expect(pushService('https://web.push.apple.com/QK1')).toBe(true)
    expect(
      pushService('https://updates.push.services.mozilla.com/wpush/v2/x'),
    ).toBe(true)
    expect(pushService('http://fcm.googleapis.com/x')).toBe(false)
    expect(pushService('https://example.com/push')).toBe(false)
    expect(pushService('https://evilgoogleapis.com/x')).toBe(false)
  })
})

const phone = {
  endpoint: 'https://web.push.apple.com/QK1-phone',
  p256dh: 'BPhone',
  auth: 'aPhone',
}
const laptop = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/laptop',
  p256dh: 'BLaptop',
  auth: 'aLaptop',
}

describe('reminders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  type T = ReturnType<typeof convexTest>
  const jobs = (t: T) =>
    t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect())
  const rows = (t: T) => t.run((ctx) => ctx.db.query('reminders').collect())

  // What was handed to convex/push.ts to send, all told
  async function sent(t: T) {
    return (await jobs(t))
      .filter((j) => j.name.includes('push'))
      .flatMap((j) =>
        (j.args[0] as { to: Array<{ endpoint: string }> }).to.map(
          (s) => s.endpoint,
        ),
      )
  }

  // The turns on the schedule: when each is due
  async function turns(t: T) {
    return (await jobs(t))
      .filter((j) => j.name.includes('ring') && j.state.kind === 'pending')
      .map((j) => iso(j.scheduledTime))
  }

  // Convex's scheduler, by hand: runs the turns whose time has come (one
  // run before is on the schedule still, and finds its reminder moved on)
  async function tick(t: T) {
    for (const j of await jobs(t))
      if (
        j.name.includes('ring') &&
        j.state.kind === 'pending' &&
        j.scheduledTime <= Date.now()
      )
        await t.mutation(
          internal.reminders.ring,
          j.args[0] as { id: Id<'reminders'>; at: number },
        )
  }

  test('sent at the time, and not on a day done', async () => {
    const t = convexTest(schema, modules)
    vi.setSystemTime(at('2026-10-24T08:00:00Z'))
    await t.mutation(api.reminders.set, {
      ...phone,
      time: '18:00',
      zone: 'Europe/Oslo',
    })
    // Its turn is at 18:00 in Oslo, and nothing is done before
    expect(await turns(t)).toEqual(['2026-10-24T16:00:00.000Z'])
    vi.setSystemTime(at('2026-10-24T15:59:00Z'))
    await tick(t)
    expect(await sent(t)).toEqual([])

    vi.setSystemTime(at('2026-10-24T16:00:01Z'))
    await tick(t)
    expect(await sent(t)).toEqual([phone.endpoint])
    // Once, and the next turn is tomorrow at 18:00, after summer time
    await tick(t)
    expect(await sent(t)).toEqual([phone.endpoint])
    expect((await rows(t)).map((r) => iso(r.next))).toEqual([
      '2026-10-25T17:00:00.000Z',
    ])

    // The next day the session is done before 18:00
    vi.setSystemTime(at('2026-10-25T10:00:00Z'))
    await t.mutation(api.reminders.done, {
      day: '2026-10-25',
      endpoint: phone.endpoint,
    })
    vi.setSystemTime(at('2026-10-25T17:00:01Z'))
    await tick(t)
    expect(await sent(t)).toEqual([phone.endpoint])

    // And the day after, it comes again
    vi.setSystemTime(at('2026-10-26T17:00:01Z'))
    await tick(t)
    expect(await sent(t)).toEqual([phone.endpoint, phone.endpoint])
  })

  test('turned on after the session, not that day', async () => {
    const t = convexTest(schema, modules)
    vi.setSystemTime(at('2026-10-24T12:00:00Z'))
    await t.mutation(api.reminders.set, {
      ...phone,
      time: '18:00',
      zone: 'Europe/Oslo',
      done: '2026-10-24',
    })
    vi.setSystemTime(at('2026-10-24T16:00:01Z'))
    await tick(t)
    expect(await sent(t)).toEqual([])
  })

  test('a reminder after midnight belongs to the day before', async () => {
    const t = convexTest(schema, modules)
    vi.setSystemTime(at('2026-11-11T12:00:00Z'))
    await t.mutation(api.reminders.set, {
      ...phone,
      time: '01:00',
      zone: 'Europe/Oslo',
      done: '2026-11-11',
    })
    // 01:00 on the 12th in Oslo: the 11th's session is done
    vi.setSystemTime(at('2026-11-12T00:00:01Z'))
    await tick(t)
    expect(await sent(t)).toEqual([])
    // The next night, the 12th's is not
    vi.setSystemTime(at('2026-11-13T00:00:01Z'))
    await tick(t)
    expect(await sent(t)).toEqual([phone.endpoint])
  })

  test('a reminder long overdue is not sent', async () => {
    const t = convexTest(schema, modules)
    vi.setSystemTime(at('2026-10-24T12:00:00Z'))
    await t.mutation(api.reminders.set, {
      ...phone,
      time: '18:00',
      zone: 'Europe/Oslo',
    })
    vi.setSystemTime(at('2026-10-24T19:00:00Z'))
    await tick(t)
    expect(await sent(t)).toEqual([])
    const [row] = await rows(t)
    expect(iso(row.next)).toBe('2026-10-25T17:00:00.000Z')
  })

  test('done on another device of the same account', async () => {
    const t = convexTest(schema, modules)
    const userId = await t.run((ctx) =>
      ctx.db.insert('users', { email: 'ola@example.com' }),
    )
    const ola = t.withIdentity({ subject: `${userId}|s` })
    vi.setSystemTime(at('2026-10-24T08:00:00Z'))
    await ola.mutation(api.reminders.set, {
      ...phone,
      time: '18:00',
      zone: 'Europe/Oslo',
    })
    // Someone else's reminder is left alone
    await t.mutation(api.reminders.set, {
      ...laptop,
      time: '18:00',
      zone: 'Europe/Oslo',
    })
    // The session done on a laptop with no reminder of its own
    await ola.mutation(api.reminders.done, { day: '2026-10-24' })
    vi.setSystemTime(at('2026-10-24T16:00:01Z'))
    await tick(t)
    expect(await sent(t)).toEqual([laptop.endpoint])
  })

  test('changed, turned off, and gone', async () => {
    const t = convexTest(schema, modules)
    vi.setSystemTime(at('2026-10-24T08:00:00Z'))
    const oslo = { time: '18:00', zone: 'Europe/Oslo' }
    await t.mutation(api.reminders.set, { ...phone, ...oslo })
    await t.mutation(api.reminders.set, { ...laptop, ...oslo })
    // Moved to 07:30 tomorrow: one row, the new time, and its old turn is
    // off the schedule
    await t.mutation(api.reminders.set, { ...phone, ...oslo, time: '07:30' })
    const two = await rows(t)
    expect(two).toHaveLength(2)
    expect(iso(two[0].next)).toBe('2026-10-25T06:30:00.000Z')
    expect((await turns(t)).sort()).toEqual([
      '2026-10-24T16:00:00.000Z',
      '2026-10-25T06:30:00.000Z',
    ])
    // (and had the old turn run all the same, it would have done nothing)
    vi.setSystemTime(at('2026-10-24T16:00:01Z'))
    await t.mutation(internal.reminders.ring, {
      id: two[0]._id,
      at: at('2026-10-24T16:00:00Z'),
    })
    expect(await sent(t)).toEqual([])

    await t.mutation(api.reminders.remove, { endpoint: phone.endpoint })
    await t.mutation(internal.reminders.gone, { endpoints: [laptop.endpoint] })
    expect(await rows(t)).toEqual([])
    expect(await turns(t)).toEqual([])
  })

  // The net under the turns, once an hour (crons.ts)
  test('a reminder with no turn waiting gets one, and a turn lost is had', async () => {
    const t = convexTest(schema, modules)
    vi.setSystemTime(at('2026-10-24T08:00:00Z'))
    // Kept from when a cron sent them all: no turn of their own
    const old = (from: typeof phone, time: string, next: string) =>
      t.run((ctx) =>
        ctx.db.insert('reminders', {
          ...from,
          time,
          zone: 'Europe/Oslo',
          next: at(next),
        }),
      )
    await old(phone, '10:30', '2026-10-24T08:30:00Z')
    await old(laptop, '18:00', '2026-10-24T16:00:00Z')
    // Due within the hour: scheduled for its minute. Later ones wait for a
    // later sweep.
    await t.mutation(internal.reminders.sweep, {})
    expect(await turns(t)).toEqual(['2026-10-24T08:30:00.000Z'])
    // Swept again, nothing more
    await t.mutation(internal.reminders.sweep, {})
    expect(await turns(t)).toEqual(['2026-10-24T08:30:00.000Z'])
    expect(await sent(t)).toEqual([])

    // The laptop's hour comes, but its turn is lost: sent by the sweep
    // twenty minutes late, and set for tomorrow
    vi.setSystemTime(at('2026-10-24T16:20:00Z'))
    await t.run(async (ctx) => {
      const r = await ctx.db
        .query('reminders')
        .withIndex('by_endpoint', (q) => q.eq('endpoint', laptop.endpoint))
        .first()
      if (r) await ctx.db.patch('reminders', r._id, { job: undefined })
    })
    await t.mutation(internal.reminders.sweep, {})
    expect(await sent(t)).toContain(laptop.endpoint)
    const after = await rows(t)
    expect(
      iso(after.find((r) => r.endpoint === laptop.endpoint)?.next ?? 0),
    ).toBe('2026-10-25T17:00:00.000Z')
  })

  test('only good subscriptions, times and zones', async () => {
    const t = convexTest(schema, modules)
    const good = { ...phone, time: '18:00', zone: 'Europe/Oslo' }
    await expect(
      t.mutation(api.reminders.set, {
        ...good,
        endpoint: 'https://example.com/x',
      }),
    ).rejects.toThrow('push service')
    await expect(
      t.mutation(api.reminders.set, { ...good, time: '24:00' }),
    ).rejects.toThrow('time of day')
    await expect(
      t.mutation(api.reminders.set, { ...good, zone: 'Mars/Olympus' }),
    ).rejects.toThrow('time zone')
  })
})
