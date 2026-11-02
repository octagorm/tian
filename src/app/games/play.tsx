import { Frame } from '../ui'
import { Pix } from '../pixel/Pix'
import { DEMOS } from './play/demos'

// The practice demos, reached by URL only (/#play): ways to practise the
// words of the bank that are games rather than cards, to try before any
// of them goes on the home screen
export default function Play() {
  return (
    <Frame title="Practice demos" zh="玩">
      <p className="mb-5 text-[var(--ink-2)]">
        Ways to practise your own words that are games rather than flashcards.
        Each plays with the words you have met, the most faded first, and counts
        in your word bank like Review.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {DEMOS.map((d) => (
          <a
            key={d.id}
            href={`#${d.id}`}
            className="zh-card zh-lift flex items-start gap-4 p-5"
          >
            <Pix name={d.sprite} size={52} />
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span className="zh-display text-2xl text-[var(--red)]">
                  {d.zh}
                </span>
                <span className="text-lg font-black">{d.title}</span>
              </span>
              <span className="mt-1 block text-sm text-[var(--ink-2)]">
                {d.blurb}
              </span>
              <span className="mt-2 block text-xs font-semibold tracking-wide text-[var(--jade)] uppercase">
                {d.trains}
              </span>
            </span>
          </a>
        ))}
      </div>
    </Frame>
  )
}
