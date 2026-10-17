// The Worker in front of the built site. Google's sign-in goes through
// tian.ymse.land/api/auth/* on its way to Convex, so that Google's page names
// tian.ymse.land rather than the deployment's .convex.site address. Convex's
// CUSTOM_AUTH_SITE_URL sends it here. Cloudflare serves everything else from
// dist/ without running this (run_worker_first in wrangler.jsonc).

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

// Production's Convex deployment, which answers /api/auth/*
const CONVEX_SITE = 'https://neat-dalmatian-797.convex.site'

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    // Previews and workers.dev send no sign-ins to production
    const signIn =
      url.hostname === 'tian.ymse.land' && url.pathname.startsWith('/api/auth/')
    if (!signIn) return env.ASSETS.fetch(request)
    // Method, headers with the cookies, body and query go on as they came,
    // and Convex's redirects and cookies come back to the browser unchanged
    const convex = new Request(CONVEX_SITE + url.pathname + url.search, request)
    return fetch(convex, { redirect: 'manual', cache: 'no-store' })
  },
}
