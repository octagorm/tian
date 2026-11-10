// Tian's service worker. It shows the daily reminder pushed by Convex
// (convex/reminders.ts, convex/push.ts) and opens Today when it is tapped.
// It also keeps the page, its code and its pictures, so that the app added
// to a home screen starts without a network (on a plane, or where the
// network is poor), with every game in it:
//
// - the page itself comes from the network, and from what was kept only
//   when the network fails;
// - the code (/_astro/, named by its hash, so never changed under a name)
//   comes from what is kept, and all of it is fetched once the page is
//   open (/precache.json, written at build time by astro.config.mjs), so a
//   game never opened is there too. Code no longer listed is dropped;
// - pictures come from what is kept while a new copy is fetched for next
//   time.
//
// The recordings are left alone (they are 44 MB, and a browser asks for
// sound in ranges): without a network, words are said in the browser's own
// voice. Nothing under /api/ or /podcast/ is touched.

const CODE = 'tian-code-v1'
const PAGE = 'tian-page-v1'
const ART = 'tian-art-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// All the code, fetched in the background; what is no longer listed goes
async function precache() {
  const res = await fetch('/precache.json', { cache: 'no-store' })
  if (!res.ok) return
  const list = await res.json()
  if (!Array.isArray(list)) return
  // the page too: the visit that installed this was not fetched through it
  const home = await fetch('/', { cache: 'no-store' })
  if (home.ok) await (await caches.open(PAGE)).put('/', home)
  const cache = await caches.open(CODE)
  const kept = new Set((await cache.keys()).map((r) => new URL(r.url).pathname))
  for (const path of list) {
    if (kept.has(path)) continue
    try {
      const got = await fetch(path)
      if (got.ok) await cache.put(path, got)
    } catch {
      // the next visit tries again
      return
    }
  }
  const wanted = new Set(list)
  for (const path of kept) if (!wanted.has(path)) await cache.delete(path)
}

self.addEventListener('message', (e) => {
  if (e.data === 'precache') e.waitUntil(precache().catch(() => {}))
})

async function page(request) {
  const cache = await caches.open(PAGE)
  try {
    const res = await fetch(request)
    // the page itself, not a sign-in coming back with its code
    if (res.ok && !new URL(request.url).search) await cache.put('/', res.clone())
    return res
  } catch (err) {
    const kept = await cache.match('/')
    if (kept) return kept
    throw err
  }
}

async function code(request) {
  const cache = await caches.open(CODE)
  const kept = await cache.match(request)
  if (kept) return kept
  const res = await fetch(request)
  if (res.ok) await cache.put(request, res.clone())
  return res
}

async function art(request, e) {
  const cache = await caches.open(ART)
  const kept = await cache.match(request)
  const fresh = fetch(request).then(async (res) => {
    if (res.ok) await cache.put(request, res.clone())
    return res
  })
  if (!kept) return fresh
  e.waitUntil(fresh.catch(() => {}))
  return kept
}

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET' || request.headers.has('range')) return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    if (url.pathname === '/') e.respondWith(page(request))
    return
  }
  if (url.pathname.startsWith('/_astro/')) e.respondWith(code(request))
  else if (
    url.pathname.startsWith('/art/') ||
    url.pathname.startsWith('/app/') ||
    url.pathname === '/manifest.webmanifest'
  )
    e.respondWith(art(request, e))
})

self.addEventListener('push', (e) => {
  let m = {}
  try {
    m = e.data ? e.data.json() : {}
  } catch {
    // shown with the words below
  }
  // Every push must show a notification (Safari ends a subscription whose
  // pushes show none)
  e.waitUntil(
    self.registration.showNotification(m.title || '今天 Today', {
      body: m.body || 'Today’s ten minutes are waiting.',
      icon: '/app/icon-192.png',
      tag: 'today',
      data: { url: m.url || '/#today' },
    }),
  )
})

// To the game's page if it is open (daily/Reminders.tsx follows the
// message), else a new one
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || '/#today', self.location)
  e.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const page = open.find((c) => {
        const at = new URL(c.url)
        return at.origin === url.origin && at.pathname === '/'
      })
      if (page) {
        page.postMessage({ open: url.hash })
        await page.focus()
        return
      }
      await self.clients.openWindow(url.href)
    })(),
  )
})
