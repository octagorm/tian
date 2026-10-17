import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { useStore } from '../lib/store'
import {
  dayDone,
  dayOf,
  doneToday,
  hideKey,
  nextPart,
  offered,
  restToday,
  want,
} from '../lib/course'
import { COURSE } from '../data/course'
import { Seal } from '../ornament'

// First steps (games/course.tsx) on the home screen, at the foot of
// Today's card. While the course is offered (lib/course.ts), Today's
// session carries the parts of its day (lib/today.ts), so the card leads
// with them, and this strip shows the seven days as seals, with a cross
// for someone who knows the basics (the course stays under Skills). On a
// day the course rests, it says when the next day comes.

const DAY_ZH = ['一', '二', '三', '四', '五', '六', '七']

export function CourseStrip({
  leading,
  className = '',
}: {
  // Today's card leads with the course's day
  leading: boolean
  className?: string
}) {
  const { bank, setScene } = useStore()
  // Just hidden here, with a way to undo it
  const [hid, setHid] = useState(false)
  if (hid)
    return (
      <p
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink-2)] ${className}`}
      >
        First steps is off the home screen. It is still under Skills.
        <button
          type="button"
          onClick={() => {
            setScene(hideKey(false), Date.now())
            setHid(false)
          }}
          className="font-bold text-[var(--ink)] underline underline-offset-4 hover:text-[var(--red)]"
        >
          Undo
        </button>
      </p>
    )
  const next = nextPart(bank)
  if (!offered(bank) || !next) return null
  const day = dayOf(next)
  const now = Date.now()
  const rest = restToday(bank, now)
  const doneDay = rest && doneToday(bank, now)
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--ink-2)] ${className}`}
    >
      <ol className="flex gap-1" aria-label="The seven days of First steps">
        {COURSE.map((d) => {
          const done = dayDone(bank, d)
          return (
            <li key={d.n}>
              <Seal
                text={DAY_ZH[d.n - 1]}
                size={24}
                faded={!done}
                tilt={(d.n % 3) - 1}
                title={`Day ${d.n}, ${d.title}${done ? ': done' : ''}`}
                className={done || (d === day && !rest) ? '' : 'opacity-60'}
              />
            </li>
          )
        })}
      </ol>
      <span>
        {rest && doneDay
          ? `Day ${doneDay.n} of First steps done. Day ${rest.n} is for tomorrow.`
          : `First steps, day ${day.n} of 7`}
      </span>
      {leading ? (
        <button
          type="button"
          onClick={() => {
            setScene(hideKey(true), Date.now())
            setHid(true)
          }}
          title="Hide First steps from the home screen. It stays under Skills."
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
        >
          <X size={15} /> I know the basics
        </button>
      ) : (
        <a
          href="#start"
          onClick={() => want(next.id)}
          className="ml-auto inline-flex items-center gap-1 font-bold text-[var(--ink)] hover:text-[var(--red)]"
        >
          {rest ? `Day ${rest.n} now` : 'Go on with it'}
          <ArrowRight size={15} />
        </a>
      )}
    </div>
  )
}
