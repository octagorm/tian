import { Suspense, lazy } from 'react'
import { useStore } from '../lib/store'
import { gardenSize, grownCount } from '../lib/garden'
import { nextToGrow, sceneOf } from '../garden/scene'

// The garden, small, for the home screen and the end of the day: the
// courtyard as it stands, what has grown, and what grows next. Its
// drawing code loads when it is first shown.

const GardenCanvas = lazy(() =>
  import('../garden/Garden').then((m) => ({ default: m.GardenCanvas })),
)

export function GardenMini({
  className = '',
  caption = true,
}: {
  className?: string
  caption?: boolean
}) {
  const { bank } = useStore()
  const now = Date.now()
  const scene = sceneOf(bank, now)
  const grown = grownCount(bank)
  const next = nextToGrow(bank, now)
  return (
    <div className={className}>
      <div className="overflow-hidden bg-[#2a3866]">
        <Suspense
          fallback={
            <div
              className="w-full bg-[#9db8cf]"
              style={{ aspectRatio: '16 / 9' }}
            />
          }
        >
          <GardenCanvas scene={scene} fps={20} />
        </Suspense>
      </div>
      {caption && (
        <div className="px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="zh text-lg text-[var(--red)]">花园</span>
            <span className="font-black">The garden</span>
            <span className="ml-auto text-xs font-bold text-[var(--ink-2)] tabular-nums">
              {grown} of {gardenSize()} grown
            </span>
          </div>
          {next && (
            <p className="mt-0.5 truncate text-sm text-[var(--ink-2)]">
              {next.stage ? 'Growing' : 'Next'}:{' '}
              <span className="font-bold text-[var(--ink)]">
                {next.item.name.toLowerCase()}
              </span>{' '}
              · lesson {next.lesson}
            </p>
          )}
          {next && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--paper-2)]">
              <div
                className="h-full rounded-full bg-[var(--jade)] transition-all"
                style={{ width: `${Math.round(next.toward * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// The garden as a band across the top of a card: the wall, its sky and
// what stands before it, cropped to `height`
export function GardenBand({
  height,
  className = '',
}: {
  height: number
  className?: string
}) {
  const { bank } = useStore()
  const scene = sceneOf(bank, Date.now())
  return (
    <div
      className={`relative overflow-hidden bg-[#9db8cf] ${className}`}
      style={{ height }}
    >
      <Suspense fallback={null}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-[46%]">
          <GardenCanvas scene={scene} fps={20} />
        </div>
      </Suspense>
    </div>
  )
}
