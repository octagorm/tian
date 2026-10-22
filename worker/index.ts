// The Worker in front of the built site. Google's sign-in goes through
// tian.ymse.land/api/auth/* on its way to Convex, so that Google's page names
// tian.ymse.land rather than the deployment's .convex.site address. Convex's
// CUSTOM_AUTH_SITE_URL sends it here. The podcast's files are served from
// the R2 bucket tian-podcast at /podcast/* (scripts/podcast-feed.py puts
// them there). Cloudflare serves everything else from dist/ without running
// this (run_worker_first in wrangler.jsonc).

// The little of R2's binding used here
interface R2Object {
  size: number
  httpEtag: string
  range?: { offset?: number; length?: number; suffix?: number }
  writeHttpMetadata: (headers: Headers) => void
  body?: ReadableStream
}

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  PODCAST: {
    get: (
      key: string,
      options: { range: Headers; onlyIf: Headers },
    ) => Promise<R2Object | null>
    head: (key: string) => Promise<R2Object | null>
  }
}

// Production's Convex deployment, which answers /api/auth/*
const CONVEX_SITE = 'https://valuable-akita-141.convex.site'

// A file of the podcast, with the byte ranges and conditional requests that
// podcast apps and the browser's audio player ask for
async function podcast(
  request: Request,
  bucket: Env['PODCAST'],
  key: string,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } })
  const object = !key
    ? null
    : request.method === 'HEAD'
      ? await bucket.head(key)
      : await bucket.get(key, {
          range: request.headers,
          onlyIf: request.headers,
        })
  if (!object) return new Response('Not found', { status: 404 })
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('accept-ranges', 'bytes')
  if (request.method === 'HEAD') {
    headers.set('content-length', String(object.size))
    return new Response(null, { headers })
  }
  // The precondition held back the body: unchanged, or not the one asked for
  if (!object.body) {
    const cached =
      request.headers.has('if-none-match') ||
      request.headers.has('if-modified-since')
    return new Response(null, { status: cached ? 304 : 412, headers })
  }
  const range = object.range
  if (request.headers.has('range') && range) {
    const start =
      range.suffix !== undefined
        ? Math.max(0, object.size - range.suffix)
        : (range.offset ?? 0)
    const length =
      range.suffix !== undefined
        ? object.size - start
        : (range.length ?? object.size - start)
    headers.set(
      'content-range',
      `bytes ${start}-${start + length - 1}/${object.size}`,
    )
    headers.set('content-length', String(length))
    return new Response(object.body, { status: 206, headers })
  }
  headers.set('content-length', String(object.size))
  return new Response(object.body, { headers })
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/podcast/'))
      return podcast(
        request,
        env.PODCAST,
        decodeURIComponent(url.pathname.slice('/podcast/'.length)),
      )
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
