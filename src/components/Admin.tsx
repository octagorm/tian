import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { WithConvexAuth } from '~/lib/convex'

// /admin: everyone who has signed in (anyone may; see convex/access.ts),
// newest first. Only for the admin.

export default function Admin() {
  return (
    <WithConvexAuth>
      <AdminPage />
    </WithConvexAuth>
  )
}

const date = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

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
      <Users />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-slate-800">
      <h1 className="mb-6 text-3xl font-black">Users</h1>
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

function Users() {
  const list = useQuery(api.access.users, {})
  return (
    <Section title="Signed in">
      {list === undefined ? (
        <p className="text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-slate-500">Nobody has signed in yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((u) => (
            <li key={u._id} className="rounded-xl bg-slate-50 p-3">
              <div className="font-semibold">{u.name ?? u.email}</div>
              <div className="text-sm text-slate-500">
                {u.email} · since {date(u.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
