import { describe, expect, test } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../convex/schema'
import { api } from '../convex/_generated/api'
import { ADMIN_EMAIL } from '../convex/auth'

// Who gets in: anyone can sign in, but only members (and the admin) keep a
// word bank on their account – let in by the admin's answer to a request, or
// by an invitation link that has not run out or been revoked.

const modules = import.meta.glob('../convex/**/*.{ts,js}')

async function setup() {
  const t = convexTest(schema, modules)
  const [admin, ola, kari] = await t.run(async (ctx) => [
    await ctx.db.insert('users', { email: ADMIN_EMAIL, name: 'Gorm' }),
    await ctx.db.insert('users', { email: 'ola@example.com', name: 'Ola' }),
    await ctx.db.insert('users', { email: 'kari@example.com', name: 'Kari' }),
  ])
  return {
    t,
    admin: t.withIdentity({ subject: `${admin}|s` }),
    ola: t.withIdentity({ subject: `${ola}|s` }),
    kari: t.withIdentity({ subject: `${kari}|s` }),
  }
}

const progress = { data: JSON.stringify({ cards: { 你好: { s: 2 } } }) }

describe('access', () => {
  test('signed in is not enough, and only the admin manages', async () => {
    const { t, ola } = await setup()
    expect(await t.query(api.access.me, {})).toBeNull()
    expect(await ola.query(api.access.me, {})).toMatchObject({
      member: false,
      admin: false,
      request: null,
    })
    await expect(ola.query(api.bank.bank, {})).rejects.toThrow('No access')
    await expect(ola.mutation(api.bank.save, progress)).rejects.toThrow(
      'No access',
    )
    await expect(ola.query(api.access.requests, {})).rejects.toThrow(
      'admin only',
    )
    await expect(
      ola.mutation(api.access.invite, { label: 'Myself' }),
    ).rejects.toThrow('admin only')
  })

  test('a request, answered', async () => {
    const { admin, ola, kari } = await setup()
    await ola.mutation(api.access.request, { message: 'Hi, it is Ola' })
    await kari.mutation(api.access.request, {})
    expect(await ola.query(api.access.me, {})).toMatchObject({
      request: 'pending',
    })
    const pending = await admin.query(api.access.requests, {})
    expect(pending.map((r) => r.email).sort()).toEqual([
      'kari@example.com',
      'ola@example.com',
    ])
    const ask = (email: string) => pending.find((r) => r.email === email)?._id
    await admin.mutation(api.access.decide, {
      id: ask('ola@example.com')!,
      approve: true,
    })
    await admin.mutation(api.access.decide, {
      id: ask('kari@example.com')!,
      approve: false,
    })
    expect(await ola.query(api.access.me, {})).toMatchObject({ member: true })
    expect(await kari.query(api.access.me, {})).toMatchObject({
      member: false,
      request: 'denied',
    })
    await ola.mutation(api.bank.save, progress)
    expect(await ola.query(api.bank.bank, {})).toEqual(progress.data)
    // Access taken away
    const [m] = await admin.query(api.access.members, {})
    await admin.mutation(api.access.removeMember, { id: m._id })
    await expect(ola.query(api.bank.bank, {})).rejects.toThrow('No access')
  })

  test('invitations: used, run out, revoked', async () => {
    const { t, admin, ola, kari } = await setup()
    const token = await admin.mutation(api.access.invite, {
      label: 'The family',
    })
    expect(await t.query(api.access.invitation, { token })).toEqual({
      label: 'The family',
    })
    expect(await t.query(api.access.invitation, { token: 'nope' })).toBeNull()
    await ola.mutation(api.access.redeem, { token })
    expect(await ola.query(api.access.me, {})).toMatchObject({ member: true })
    // Revoked: no one else gets in with it; those in stay in
    const [inv] = await admin.query(api.access.invites, {})
    expect(inv).toMatchObject({ uses: 1, valid: true })
    await admin.mutation(api.access.revokeInvite, { id: inv._id })
    await expect(kari.mutation(api.access.redeem, { token })).rejects.toThrow(
      'no longer valid',
    )
    expect(await ola.query(api.access.me, {})).toMatchObject({ member: true })
    // Run out
    const week = await admin.mutation(api.access.invite, {
      label: 'A week',
      days: 7,
    })
    await t.run(async (ctx) => {
      const i = await ctx.db
        .query('invites')
        .withIndex('by_token', (q) => q.eq('token', week))
        .first()
      await ctx.db.patch(i!._id, { expiresAt: Date.now() - 1 })
    })
    expect(await t.query(api.access.invitation, { token: week })).toBeNull()
    await expect(
      kari.mutation(api.access.redeem, { token: week }),
    ).rejects.toThrow('no longer valid')
  })

  test('a word bank is checked and kept per user', async () => {
    const { admin } = await setup()
    await expect(
      admin.mutation(api.bank.save, { data: '{"no":"cards"}' }),
    ).rejects.toThrow('Not a word bank')
    await expect(
      admin.mutation(api.bank.save, { data: 'not json' }),
    ).rejects.toThrow('Not a word bank')
    expect(await admin.query(api.bank.bank, {})).toBeNull()
    await admin.mutation(api.bank.save, progress)
    expect(await admin.query(api.bank.bank, {})).toEqual(progress.data)
  })
})
