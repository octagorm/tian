import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  answerCard,
  dayKey,
  emptyBank,
  known,
  level,
  merge,
  newCard,
} from './bank'
import { setRate } from './audio'
import type { ReactNode } from 'react'
import type { Bank, Level, Link, Path } from './bank'

// The word bank and the settings as React state, for every game at once.
// Both are kept in localStorage; signed in, the bank is also kept on
// the account (convex/bank.ts): the two are merged whenever the
// account's copy comes in, and each change is saved a moment later.
//
// After every change the store looks for seals earned and things grown in
// the garden (lib/achievements.ts, loaded apart from the rest), adds
// them to the bank, and tells whoever listens with `onSeals` (the
// toaster, daily/SealToaster.tsx).

export interface Settings {
  // The player's country, a word id
  home: string
  // Whether typed pinyin must have its tones
  tones: boolean
  autoplay: boolean
  rate: number
  // New words brought into Chinese in each scene of the trip
  perScene: number
  // A daily reminder to do Today's session (lib/reminder.ts), at 'HH:MM'
  remind: boolean
  remindAt: string
}

const DEFAULTS: Settings = {
  home: '挪威',
  tones: false,
  autoplay: true,
  rate: 1,
  perScene: 3,
  remind: false,
  remindAt: '18:00',
}

const BANK_KEY = 'tian:bank:v1'
const SETTINGS_KEY = 'tian:settings:v1'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // private mode, or full
  }
}

interface Store {
  bank: Bank
  settings: Settings
  setSettings: (s: Partial<Settings>) => void
  levelOf: (id: string) => Level
  // An answer about a word: how much it says (see lib/bank.ts), and which
  // of the word's links it tested
  record: (id: string, right: boolean, weight: number, how: How) => void
  // Words met for the first time
  meet: (ids: Array<string>) => void
  // Words the player already knows
  know: (ids: Array<string>) => void
  forget: (ids: Array<string>) => void
  points: (n: number) => void
  setScene: (id: string, stars: number) => void
  setBest: (game: string, score: number) => void
  tone: (pair: string, right: boolean) => void
  // A sound told apart, or not, in the pinyin chart's ear training
  sound: (contrast: string, right: boolean) => void
  reset: () => void
  account: Account
  // Today's session (lib/today.ts): set or change the day's plan
  setPath: (f: (p: Path | null) => Path | null) => void
  // A day's session finished, with points for it; only once a day
  finishDay: (day: string, bonus?: number) => void
}

// What an answer tested: a link of the word, or some, or the word read
// as the page shows it, its meaning taken from the character when it
// stands alone and from the pinyin over it while it is being learnt
export type How = Link | Array<Link> | 'read'

// Seals just earned on this device, for the toaster
type SealListener = (ids: Array<string>) => void
const sealListeners = new Set<SealListener>()

export function onSeals(f: SealListener): () => void {
  sealListeners.add(f)
  return () => {
    sealListeners.delete(f)
  }
}

export interface Account {
  loading: boolean
  me: {
    name: string | null
    email: string
    admin: boolean
  } | null
  synced: boolean
}

const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside BankProvider')
  return s
}

export function BankProvider({ children }: { children: ReactNode }) {
  // (merged with nothing, so a bank kept by an older page is read as now)
  const [bank, setBank] = useState<Bank>(() =>
    merge(load(BANK_KEY, emptyBank()), emptyBank()),
  )
  const [settings, setAll] = useState<Settings>(() =>
    load(SETTINGS_KEY, DEFAULTS),
  )

  useEffect(() => store(BANK_KEY, bank), [bank])
  useEffect(() => {
    store(SETTINGS_KEY, settings)
    setRate(settings.rate)
  }, [settings])

  const update = useCallback((f: (b: Bank) => Bank) => setBank(f), [])
  const today = () => dayKey(Date.now())

  const record = useCallback(
    (id: string, right: boolean, weight: number, how: How) =>
      update((b) => {
        const now = Date.now()
        const card = b.cards[id]
        const links =
          how === 'read'
            ? [level(card, now) === 2 ? ('hm' as const) : ('sm' as const)]
            : typeof how === 'string'
              ? [how]
              : how
        const cards = {
          ...b.cards,
          [id]: answerCard(card, links, right, now, weight),
        }
        const days = right
          ? { ...b.days, [today()]: (b.days[today()] ?? 0) + 1 }
          : b.days
        return { ...b, cards, days }
      }),
    [update],
  )

  const meet = useCallback(
    (ids: Array<string>) =>
      update((b) => {
        const fresh = ids.filter((id) => !b.cards[id])
        if (!fresh.length) return b
        const now = Date.now()
        const cards = { ...b.cards }
        for (const id of fresh) cards[id] = newCard(now)
        return { ...b, cards }
      }),
    [update],
  )

  const know = useCallback(
    (ids: Array<string>) =>
      update((b) => {
        const now = Date.now()
        const cards = { ...b.cards }
        for (const id of ids)
          if (level(cards[id], now) < 2) cards[id] = known(now)
        return { ...b, cards }
      }),
    [update],
  )

  const forget = useCallback(
    (ids: Array<string>) =>
      update((b) => {
        const cards = { ...b.cards }
        for (const id of ids) delete cards[id]
        return { ...b, cards }
      }),
    [update],
  )

  const points = useCallback(
    (n: number) =>
      update((b) => ({
        ...b,
        days: { ...b.days, [today()]: (b.days[today()] ?? 0) + n },
      })),
    [update],
  )

  const setScene = useCallback(
    (id: string, stars: number) =>
      update((b) => ({
        ...b,
        scenes: { ...b.scenes, [id]: Math.max(b.scenes[id] ?? 0, stars) },
      })),
    [update],
  )

  const setBest = useCallback(
    (game: string, score: number) =>
      update((b) =>
        score > (b.best[game] ?? 0)
          ? { ...b, best: { ...b.best, [game]: score } }
          : b,
      ),
    [update],
  )

  const tone = useCallback(
    (pair: string, right: boolean) =>
      update((b) => {
        const [r, n] = b.tones[pair] ?? [0, 0]
        return {
          ...b,
          tones: { ...b.tones, [pair]: [r + (right ? 1 : 0), n + 1] },
        }
      }),
    [update],
  )

  const sound = useCallback(
    (contrast: string, right: boolean) =>
      update((b) => {
        const [r, n] = b.sounds[contrast] ?? [0, 0]
        return {
          ...b,
          sounds: { ...b.sounds, [contrast]: [r + (right ? 1 : 0), n + 1] },
        }
      }),
    [update],
  )

  const reset = useCallback(() => setBank(emptyBank()), [])

  const setPath = useCallback(
    (f: (p: Path | null) => Path | null) =>
      update((b) => {
        const path = f(b.path)
        return path === b.path ? b : { ...b, path }
      }),
    [update],
  )

  const finishDay = useCallback(
    (day: string, bonus = 0) =>
      update((b) =>
        b.daily[day]
          ? b
          : {
              ...b,
              daily: { ...b.daily, [day]: 1 },
              days: { ...b.days, [day]: (b.days[day] ?? 0) + bonus },
            },
      ),
    [update],
  )

  const setSettings = useCallback(
    (s: Partial<Settings>) => setAll((old) => ({ ...old, ...s })),
    [],
  )

  useAwards(bank, setBank)

  const account = useAccount(bank, setBank)

  const value = useMemo<Store>(
    () => ({
      bank,
      settings,
      setSettings,
      levelOf: (id) => level(bank.cards[id], Date.now()),
      record,
      meet,
      know,
      forget,
      points,
      setScene,
      setBest,
      tone,
      sound,
      reset,
      account,
      setPath,
      finishDay,
    }),
    [
      bank,
      settings,
      setSettings,
      record,
      meet,
      know,
      forget,
      points,
      setScene,
      setBest,
      tone,
      sound,
      reset,
      account,
      setPath,
      finishDay,
    ],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Seals and the garden, brought up to date after each change. The checks
// load apart from the page's first code; a change that comes while they
// run is checked in turn.
function useAwards(bank: Bank, setBank: (f: (b: Bank) => Bank) => void) {
  useEffect(() => {
    let live = true
    void import('./achievements').then(({ award }) => {
      if (!live) return
      const now = Date.now()
      const got = award(bank, now)
      if (!got.seals.length && !Object.keys(got.garden).length) return
      setBank((b) => {
        const seals = { ...b.seals }
        for (const id of got.seals) seals[id] ??= now
        const garden = { ...b.garden }
        for (const [n, s] of Object.entries(got.garden))
          garden[n] = Math.max(garden[n] ?? 0, s)
        return { ...b, seals, garden }
      })
      if (got.seals.length) for (const f of sealListeners) f(got.seals)
    })
    return () => {
      live = false
    }
  }, [bank, setBank])
}

const same = (a: Bank, b: Bank) =>
  JSON.stringify(merge(a, emptyBank())) ===
  JSON.stringify(merge(b, emptyBank()))

function useAccount(local: Bank, setLocal: (b: Bank) => void): Account {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.access.me, isAuthenticated ? {} : 'skip')
  const member = isAuthenticated && !!me
  const remoteRaw = useQuery(api.bank.bank, member ? {} : 'skip')
  const save = useMutation(api.bank.save)
  const merged = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const remote = useMemo(() => {
    if (remoteRaw === undefined) return undefined
    if (remoteRaw === null) return null
    try {
      return merge(JSON.parse(remoteRaw) as Bank, emptyBank())
    } catch {
      return null
    }
  }, [remoteRaw])

  // The bank as it is now, for merging in the account's copy without
  // merging again on every change here
  const latest = useRef(local)
  useEffect(() => {
    latest.current = local
  }, [local])

  // Each copy that comes from the account, on sign-in and whenever another
  // device saves, is merged in, never overwritten: saving this device's
  // bank over it would lose what the other one learnt
  useEffect(() => {
    if (!member) {
      merged.current = false
      return
    }
    if (remote === undefined) return
    merged.current = true
    const mine = latest.current
    const both = merge(mine, remote ?? emptyBank())
    if (!same(both, mine)) setLocal(both)
    if (!remote || !same(both, remote))
      void save({ data: JSON.stringify(both) }).catch(() => {})
  }, [member, remote, setLocal, save])

  useEffect(() => {
    if (!member || !merged.current || !remote || same(local, remote)) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void save({ data: JSON.stringify(local) }).catch(() => {})
    }, 2000)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [member, local, remote, save])

  return useMemo(
    () => ({
      loading: isLoading || (isAuthenticated && me === undefined),
      me: me ?? null,
      synced: member && remote !== undefined,
    }),
    [isLoading, isAuthenticated, me, member, remote],
  )
}
