import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { WithConvexAuth } from '~/lib/convex'

// /admin: who may use what needs an account (see convex/access.ts). The
// requests waiting for an answer, the invitation links (made with a
// lifetime, revoked at will) and the members, whose access can be taken
// away. Only for the admin.

export default function Admin() {
  return (
    <WithConvexAuth>
      <AdminPage />
    </WithConvexAuth>
  )
}

const DURATIONS: Array<{ label: string; days?: number }> = [
  { label: '1 day', days: 1 },
  { label: '1 week', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'No end' },
]

const date = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const inviteLink = (token: string) => `${location.origin}/invite?code=${token}`

const button =
  'rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50'

function AdminPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const me = useQuery(api.access.me, isAuthenticated ? {} : 'skip')

  if (isLoading || (isAuthenticated && me === undefined))
    return <Shell>Loading…</Shell>
  if (!isAuthenticated || !me)
    return (
      <Shell>
        <p className="mb-4 text-slate-600">Sign in as the admin.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void signIn('google', { redirectTo: '/admin' })}
            className={`${button} bg-slate-800 text-white hover:bg-slate-700`}
          >
            Sign in with Google
          </button>
        </div>
      </Shell>
    )
  if (!me.admin)
    return (
      <Shell>
        <p className="mb-4 text-slate-600">This page is for the admin only.</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className={`${button} bg-slate-200 hover:bg-slate-300`}
        >
          Sign out
        </button>
      </Shell>
    )
  return (
    <Shell>
      <Requests />
      <Invites />
      <Members />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-slate-800">
      <h1 className="mb-6 text-3xl font-black">Access</h1>
      {children}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Requests() {
  const list = useQuery(api.access.requests, {})
  const decide = useMutation(api.access.decide)
  return (
    <Section title="Requests">
      {list === undefined ? (
        <p className="text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-slate-500">No one is waiting for an answer.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => (
            <li
              key={r._id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <div className="font-semibold">{r.name ?? r.email}</div>
                <div className="text-sm text-slate-500">
                  {r.email} · {date(r.createdAt)}
                </div>
                {r.message && (
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {r.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void decide({ id: r._id, approve: true })}
                  className={`${button} bg-emerald-600 text-white hover:bg-emerald-500`}
                >
                  Let in
                </button>
                <button
                  type="button"
                  onClick={() => void decide({ id: r._id, approve: false })}
                  className={`${button} bg-slate-200 hover:bg-slate-300`}
                >
                  Turn down
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Copy({ token }: { token: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard.writeText(inviteLink(token)).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        })
      }
      className={`${button} bg-slate-200 hover:bg-slate-300`}
    >
      {done ? 'Copied' : 'Copy link'}
    </button>
  )
}

function Invites() {
  const list = useQuery(api.access.invites, {})
  const make = useMutation(api.access.invite)
  const revoke = useMutation(api.access.revokeInvite)
  const [label, setLabel] = useState('')
  const [duration, setDuration] = useState(1)
  const [made, setMade] = useState<string | null>(null)
  return (
    <Section title="Invitations">
      <form
        className="mb-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void make({
            label: label || 'Invitation',
            days: DURATIONS[duration].days,
          }).then((token) => {
            setMade(token)
            setLabel('')
          })
        }}
      >
        <label className="flex flex-col text-sm">
          Who or what for
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={100}
            placeholder="For example: the family"
            className="rounded-lg border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col text-sm">
          Valid for
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1.5"
          >
            {DURATIONS.map((d, i) => (
              <option key={d.label} value={i}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className={`${button} bg-amber-400 text-slate-900 hover:bg-amber-300`}
        >
          Make an invitation
        </button>
      </form>
      {made && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
          <code className="min-w-0 flex-1 truncate">{inviteLink(made)}</code>
          <Copy token={made} />
        </div>
      )}
      {list === undefined ? (
        <p className="text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-slate-500">No invitations yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((i) => (
            <li
              key={i._id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 ${
                i.valid ? 'bg-slate-50' : 'bg-slate-50 opacity-60'
              }`}
            >
              <div className="min-w-0">
                <div className="font-semibold">{i.label}</div>
                <div className="text-sm text-slate-500">
                  Made {date(i.createdAt)} ·{' '}
                  {i.revokedAt !== undefined
                    ? `revoked ${date(i.revokedAt)}`
                    : i.expiresAt === undefined
                      ? 'no end'
                      : i.valid
                        ? `valid until ${date(i.expiresAt)}`
                        : `expired ${date(i.expiresAt)}`}{' '}
                  · used {i.uses} {i.uses === 1 ? 'time' : 'times'}
                </div>
              </div>
              {i.valid && (
                <div className="flex gap-2">
                  <Copy token={i.token} />
                  <button
                    type="button"
                    onClick={() => void revoke({ id: i._id })}
                    className={`${button} bg-rose-100 text-rose-800 hover:bg-rose-200`}
                  >
                    Revoke
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Members() {
  const list = useQuery(api.access.members, {})
  const remove = useMutation(api.access.removeMember)
  const away = (id: Id<'members'>, who: string) => {
    if (window.confirm(`Take away ${who}'s access?`)) void remove({ id })
  }
  return (
    <Section title="Members">
      {list === undefined ? (
        <p className="text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-slate-500">No one but you has access.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((m) => (
            <li
              key={m._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <div className="font-semibold">{m.name ?? m.email}</div>
                <div className="text-sm text-slate-500">
                  {m.email} · since {date(m.grantedAt)} ·{' '}
                  {m.via === 'invite'
                    ? `invitation “${m.inviteLabel ?? '?'}”`
                    : m.via === 'request'
                      ? 'request'
                      : 'added'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => away(m._id, m.name ?? m.email)}
                className={`${button} bg-rose-100 text-rose-800 hover:bg-rose-200`}
              >
                Take away access
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
