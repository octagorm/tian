import { afterEach, describe, expect, it, vi } from 'vitest'
import { isStale, reloadOnce } from '../src/app/mend'

// A game's code that is gone after a deploy reloads the page, once
describe('mend', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('knows a failed import in each browser', () => {
    for (const message of [
      'Failed to fetch dynamically imported module: https://tian.ymse.land/_astro/tones.abc123.js',
      'Importing a module script failed.',
      'error loading dynamically imported module: https://tian.ymse.land/_astro/x.js',
      "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of 'text/html'.",
    ])
      expect(isStale(new TypeError(message))).toBe(true)
    expect(
      isStale(
        new TypeError("Cannot read properties of undefined (reading 'id')"),
      ),
    ).toBe(false)
    expect(isStale('not an error')).toBe(false)
  })

  it('reloads once, not again straight after', () => {
    const store = new Map<string, string>()
    const reload = vi.fn()
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    })
    vi.stubGlobal('window', { location: { reload } })
    expect(reloadOnce()).toBe(true)
    expect(reloadOnce()).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload without storage, so it cannot loop', () => {
    const reload = vi.fn()
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('denied')
      },
    })
    vi.stubGlobal('window', { location: { reload } })
    expect(reloadOnce()).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
