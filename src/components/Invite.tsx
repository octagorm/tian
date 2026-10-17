import { useEffect, useRef, useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { WithConvexAuth } from '~/lib/convex'

// /invite?code=…: an invitation link from the admin. Sign in with
// Google, and the account is let in (see convex/access.ts).

export default function Invite() {
  return (
    <WithConvexAuth>
      <InvitationPage />
    </WithConvexAuth>
  )
}

const code = () => new URLSearchParams(location.search).get('code') ?? ''

const button =
  'inline-block rounded-xl px-4 py-2.5 font-semibold transition disabled:opacity-50'

function InvitationPage() {
  const token = code()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()
  const invite = useQuery(api.access.invitation, token ? { token } : 'skip')
  const me = useQuery(api.access.me, isAuthenticated ? {} : 'skip')
  const redeem = useMutation(api.access.redeem)
  const [error, setError] = useState('')
  const tried = useRef(false)

  // Signed in with a good invitation: in
  useEffect(() => {
    if (!isAuthenticated || !invite || !me || me.member || tried.current) return
    tried.current = true
    redeem({ token }).catch(() =>
      setError('The invitation could not be used. Ask for a new one.'),
    )
  }, [isAuthenticated, invite, me, redeem, token])

  let body: React.ReactNode
  if (isLoading || (token && invite === undefined))
    body = <p className="text-slate-500">Loading…</p>
  else if (me?.member)
    body = (
      <>
        <p className="mb-6 text-slate-600">
          You have access as {me.email}. Your progress is now kept on your
          account.
        </p>
        <a
          href="/"
          className={`${button} bg-amber-400 text-slate-900 hover:bg-amber-300`}
        >
          To Tian
        </a>
      </>
    )
  else if (!invite)
    body = (
      <p className="text-slate-600">
        This invitation is no longer valid. Ask whoever sent it for a new one.
      </p>
    )
  else if (!isAuthenticated)
    body = (
      <>
        <p className="mb-6 text-slate-600">
          You are invited ({invite.label}). Sign in with your Google account to
          accept.
        </p>
        <button
          type="button"
          onClick={() =>
            void signIn('google', {
              redirectTo: `/invite?code=${encodeURIComponent(token)}`,
            })
          }
          className={`${button} bg-slate-800 text-white hover:bg-slate-700`}
        >
          Sign in with Google
        </button>
      </>
    )
  else body = <p className="text-slate-500">Accepting the invitation…</p>

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-slate-800">
      <h1 className="mb-4 text-3xl font-black">Invitation to Tian</h1>
      {body}
      {error && <p className="mt-4 text-rose-700">{error}</p>}
    </div>
  )
}
