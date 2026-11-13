import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Trail from '../src/app/lib/trail'

// A browser's history of hashes, enough for lib/trail.ts: following a link
// pushes an entry with no state, going back restores one with its own,
// and both fire hashchange
function fakeBrowser() {
  const entries: Array<{ hash: string; state: unknown }> = [
    { hash: '', state: null },
  ]
  let at = 0
  const listeners: Array<() => void> = []
  const fire = () => listeners.forEach((f) => f())
  const window = {
    location: {
      get hash() {
        return entries[at].hash
      },
    },
    history: {
      get state() {
        return entries[at].state
      },
      replaceState(state: unknown) {
        entries[at].state = state
      },
      go(n: number) {
        at = Math.max(0, Math.min(entries.length - 1, at + n))
        fire()
      },
      back() {
        this.go(-1)
      },
    },
    addEventListener(_: string, f: () => void) {
      listeners.push(f)
    },
  }
  const follow = (hash: string) => {
    const h = hash.replace(/^#/, '') ? hash : ''
    if (h === entries[at].hash) return
    entries.splice(at + 1, entries.length, { hash: h, state: null })
    at++
    fire()
  }
  return {
    window,
    follow,
    here: () => entries[at].hash,
    length: () => entries.length,
  }
}

describe('the way back', () => {
  let browser: ReturnType<typeof fakeBrowser>
  let trail: typeof Trail
  beforeEach(async () => {
    browser = fakeBrowser()
    vi.stubGlobal('window', browser.window)
    vi.resetModules()
    trail = await import('../src/app/lib/trail')
    trail.startTrail()
  })
  afterEach(() => vi.unstubAllGlobals())

  // An arrow back: back to the entry if there is one, else its link
  const arrow = (hash: string) => {
    if (!trail.backTo(hash)) browser.follow(hash)
  }

  it('leaves the reader after texts read in a row, without a loop', () => {
    browser.follow('#read')
    browser.follow('#read/beijing')
    browser.follow('#read/xian')
    browser.follow('#read/stump')
    arrow('#read')
    expect(browser.here()).toBe('#read')
    arrow('')
    expect(browser.here()).toBe('')
    // nothing pushed on the way, so the browser's Back leaves the page
    expect(browser.length()).toBe(5)
  })

  it('steps back through the texts with the browser, then home', () => {
    browser.follow('#read')
    browser.follow('#read/beijing')
    browser.follow('#read/xian')
    arrow('#read')
    browser.window.history.back()
    expect(browser.here()).toBe('')
  })

  it('follows the link when the page was opened in a game', () => {
    browser = fakeBrowser()
    browser.follow('#read/xian')
    vi.stubGlobal('window', browser.window)
    vi.resetModules()
    return import('../src/app/lib/trail').then((t) => {
      t.startTrail()
      expect(t.backTo('read')).toBe(false)
      browser.follow('#read')
      expect(t.backTo('')).toBe(false)
    })
  })

  it('does not reach back past the home screen for a game', () => {
    browser.follow('#read')
    browser.window.history.back()
    browser.follow('#tones')
    expect(trail.backTo('read')).toBe(false)
    expect(trail.backTo('')).toBe(true)
    expect(browser.here()).toBe('')
  })
})
