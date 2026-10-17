import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import type { ReactNode } from 'react'

// One Convex client for every island on a page. Islands are separate React
// roots, so each one that talks to Convex wraps itself in a provider below.
// Created on first use, so a module imported during the build opens no socket.
let client: ConvexReactClient | undefined

export function getConvex() {
  if (!client) {
    const url = import.meta.env.PUBLIC_CONVEX_URL
    if (!url) console.error('missing env var PUBLIC_CONVEX_URL')
    client = new ConvexReactClient(url)
  }
  return client
}

export function WithConvex({ children }: { children: ReactNode }) {
  return <ConvexProvider client={getConvex()}>{children}</ConvexProvider>
}

// With sign-in. Also finishes an OAuth sign-in when the page loads with
// `?code=` (Google returns to the page given as `redirectTo`).
export function WithConvexAuth({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={getConvex()}>{children}</ConvexAuthProvider>
  )
}
