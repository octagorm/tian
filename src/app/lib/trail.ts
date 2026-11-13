// The page's way back. Each entry of the browser's history this page made
// is numbered in its state, and the hash each number had is kept, so that
// an arrow back can go back to the entry it leads to rather than push a new
// one after it. Pushing one sent the Reader round in a loop: the shelf's
// arrow went back a step, to the text read last, whose arrow pushed the
// shelf again, and so on, with the browser's Back walking the same ground.

const KEY = 'zhDepth'
// The hash of each entry by its number; those before a reload are unknown
const hashes: Array<string | undefined> = []
let depth = 0

const norm = (h: string) => (h.startsWith('#') ? h.slice(1) : h)

function stamp() {
  const state: unknown = window.history.state
  const kept =
    state && typeof state === 'object'
      ? (state as Record<string, unknown>)[KEY]
      : undefined
  if (typeof kept === 'number') depth = kept
  else {
    // A new entry (a link followed, a hash set): one after the last seen
    depth = hashes.length ? depth + 1 : 0
    window.history.replaceState(
      { ...(state && typeof state === 'object' ? state : {}), [KEY]: depth },
      '',
    )
  }
  hashes[depth] = norm(window.location.hash)
}

let started = false
// Called once, before anything else listens for the hash
export function startTrail() {
  if (started || typeof window === 'undefined') return
  started = true
  stamp()
  window.addEventListener('hashchange', stamp)
}

// Go back to the latest entry before this one with the hash given ('' for
// the home screen), if there is one since the home screen was last left,
// and say whether it did. A way back to the home screen looks back to it
// whatever came between.
export function backTo(hash: string): boolean {
  const want = norm(hash)
  for (let d = depth - 1; d >= 0; d--) {
    const h = hashes[d]
    if (h === undefined) return false
    if (h === want) {
      window.history.go(d - depth)
      return true
    }
    if (h === '') return false
  }
  return false
}
