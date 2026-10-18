// The daily reminder (convex/reminders.ts), on the page's side: this
// browser's push subscription, made with the server's public key, which
// the server keeps with the time of day and the time zone. The service
// worker (public/sw.js) shows the reminder; daily/Reminders.tsx keeps the
// server up to date, and Settings turns it on and off.

// Whether this browser can get the reminder: yes; on an iPhone or iPad,
// only once added to the home screen, or only on a newer iOS (16.4); or not
// at all
export type Support = 'yes' | 'home-screen' | 'old-ios' | 'no'

export function support(): Support {
  if (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
    return 'yes'
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  if (!ios) return 'no'
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return standalone ? 'old-ios' : 'home-screen'
}

export const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

let registered: Promise<ServiceWorkerRegistration> | null = null

// The service worker, registered once, when it is running
export function worker(): Promise<ServiceWorkerRegistration> {
  registered ??= navigator.serviceWorker
    .register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    .catch((e: unknown) => {
      registered = null
      throw e
    })
  return registered
}

const bytes = (base64url: string) =>
  Uint8Array.from(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
    c.charCodeAt(0),
  )

// This browser's subscription with the public key `key`: the one it has,
// unless made with another key, else a new one
export async function subscribe(key: string): Promise<PushSubscription> {
  const { pushManager } = await worker()
  const want = bytes(key)
  const had = await pushManager.getSubscription()
  if (had) {
    const old = had.options.applicationServerKey
    const same =
      !old ||
      (old.byteLength === want.length &&
        new Uint8Array(old).every((b, i) => b === want[i]))
    if (same) return had
    await had.unsubscribe()
  }
  return await pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: want,
  })
}

// The endpoint of this browser's subscription, if it has one
export async function endpoint(): Promise<string | null> {
  const { pushManager } = await worker()
  return (await pushManager.getSubscription())?.endpoint ?? null
}

// Ends this browser's subscription; its endpoint, if it had one
export async function unsubscribe(): Promise<string | null> {
  const { pushManager } = await worker()
  const sub = await pushManager.getSubscription()
  if (!sub) return null
  await sub.unsubscribe()
  return sub.endpoint
}

// A subscription as the server keeps it
export function parts(sub: PushSubscription) {
  const { keys } = sub.toJSON()
  return {
    endpoint: sub.endpoint,
    p256dh: keys?.p256dh ?? '',
    auth: keys?.auth ?? '',
  }
}
