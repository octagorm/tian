import { TOPIC, TOPIC_GROUPS, topicWords } from '../data/topics'
import { level } from '../lib/bank'
import { useStore } from '../lib/store'
import { Btn, Frame } from '../ui'
import type { Topic } from '../data/topics'
import type { TopicChoice } from '../lib/bank'

// Topics: what the player wants to learn about, as many as they like, each
// at a priority from 1 to 3. The words of those chosen are met first, in
// Today's new words and in Learn, in rounds of as many from each as its
// priority (toMeet in lib/bank.ts); today's new words, if not begun on,
// are taken again at once.

const LEVELS = [
  { p: 0, label: 'Off', hint: 'Not chosen' },
  { p: 1, label: '1', hint: 'A little: one word a round' },
  { p: 2, label: '2', hint: 'More: two words a round' },
  { p: 3, label: '3', hint: 'Most: three words a round' },
] as const

export default function Topics() {
  const { bank, setTopics } = useStore()
  const chosen = bank.topics.on.filter((x) => TOPIC[x.id])
  const set = (id: string, p: 0 | TopicChoice['p']) =>
    setTopics(
      p === 0
        ? chosen.filter((x) => x.id !== id)
        : chosen.some((x) => x.id === id)
          ? chosen.map((x) => (x.id === id ? { id, p } : x))
          : [...chosen, { id, p }],
    )
  const shown = [...chosen].sort((a, b) => b.p - a.p)

  return (
    <Frame title="Topics" zh="话题" wide>
      <div className="zh-card mb-8 p-5 sm:p-6">
        <p className="text-lg font-black">
          {chosen.length
            ? `New words from ${chosen.length === 1 ? 'one topic' : `${chosen.length} topics`} first`
            : 'Choose what you want to learn about'}
        </p>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          As many as you like, each at a priority from 1 to 3. Today’s new words
          and Learn take the words of the topics chosen first, in rounds: three
          from a topic at 3 for each one from a topic at 1. Once they are met,
          the rest come in the order the trip uses them.
        </p>
        {chosen.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {shown.map((x) => (
              <span
                key={x.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--jade)] px-3 py-1 text-sm font-bold text-white"
              >
                <span className="zh font-normal">{TOPIC[x.id]!.zh}</span>
                {TOPIC[x.id]!.title}
                <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">
                  {x.p}
                </span>
              </span>
            ))}
            <Btn
              kind="ghost"
              onClick={() => setTopics([])}
              className="px-3 py-1 text-sm"
            >
              Clear
            </Btn>
          </div>
        )}
      </div>
      {TOPIC_GROUPS.map((g) => (
        <section
          key={g.id}
          className="mb-8"
          aria-labelledby={`zh-topics-${g.id}`}
        >
          <h2
            id={`zh-topics-${g.id}`}
            className="mb-3 flex items-baseline gap-2.5"
          >
            <span
              className="zh-display text-2xl text-[var(--red)]"
              title={g.py}
            >
              {g.zh}
            </span>
            <span className="zh-head text-xl">{g.title}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.topics.map((t) => (
              <TopicCard
                key={t.id}
                topic={t}
                p={chosen.find((x) => x.id === t.id)?.p ?? 0}
                onSet={(p) => set(t.id, p)}
              />
            ))}
          </div>
        </section>
      ))}
    </Frame>
  )
}

function TopicCard({
  topic,
  p,
  onSet,
}: {
  topic: Topic
  p: number
  onSet: (p: 0 | TopicChoice['p']) => void
}) {
  const { bank } = useStore()
  const now = Date.now()
  const ws = topicWords(topic)
  const met = ws.filter((w) => bank.cards[w.id]).length
  const known = ws.filter((w) => level(bank.cards[w.id], now) === 2).length
  const on = p > 0
  return (
    <div
      className={`zh-card flex items-start gap-3.5 p-4 ${on ? 'shadow-[inset_0_0_0_2px_var(--jade)]' : ''}`}
    >
      <span
        className={`zh flex h-12 min-w-14 shrink-0 items-center justify-center rounded-xl px-2 whitespace-nowrap ${[...topic.zh].length > 3 ? 'text-base' : [...topic.zh].length > 2 ? 'text-lg' : 'text-xl'} ${on ? 'bg-[var(--jade)] text-white' : 'bg-[var(--paper-2)] text-[var(--red)]'}`}
        title={topic.py}
      >
        {topic.zh}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{topic.title}</div>
        <p className="mt-1 text-sm leading-snug text-[var(--ink-2)]">
          {topic.about}
        </p>
        <div
          className="mt-2 flex h-2 overflow-hidden rounded-full bg-[var(--paper-2)]"
          aria-hidden
        >
          <span
            className="bg-[var(--red)]"
            style={{ width: `${(known / ws.length) * 100}%` }}
          />
          <span
            className="bg-[var(--jade)]"
            style={{ width: `${((met - known) / ws.length) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[var(--ink-2)]">
            {ws.length} words · {met} met · {known} known
          </span>
          <span
            role="radiogroup"
            aria-label={`Priority of ${topic.title}`}
            className="inline-flex rounded-full bg-[var(--paper-2)] p-0.5 text-xs font-bold"
          >
            {LEVELS.map((l) => (
              <button
                key={l.p}
                type="button"
                role="radio"
                aria-checked={p === l.p}
                title={l.hint}
                onClick={() => onSet(l.p)}
                className={`rounded-full px-2.5 py-1 transition ${p === l.p ? (l.p ? 'bg-[var(--jade)] text-white' : 'bg-[var(--card)] text-[var(--ink)] shadow-sm') : 'text-[var(--ink-2)] hover:text-[var(--ink)]'} ${l.p ? 'min-w-7' : ''}`}
              >
                {l.label}
              </button>
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
