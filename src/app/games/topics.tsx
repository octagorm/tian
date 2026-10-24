import { Check, Plus } from 'lucide-react'
import { TOPIC, TOPIC_GROUPS, topicWords } from '../data/topics'
import { level } from '../lib/bank'
import { useStore } from '../lib/store'
import { Btn, Frame } from '../ui'
import type { Topic } from '../data/topics'

// Topics: what the player wants to learn about, as many as they like.
// The words of those chosen are met first, in Today's new words and in
// Learn, one from each in turn (toMeet in lib/bank.ts); today's new words,
// if not begun on, are taken again at once.

export default function Topics() {
  const { bank, setTopics } = useStore()
  const chosen = bank.topics.ids.filter((id) => TOPIC[id])
  const toggle = (id: string) =>
    setTopics(
      chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id],
    )

  return (
    <Frame title="Topics" zh="话题" wide>
      <div className="zh-card mb-8 p-5 sm:p-6">
        <p className="text-lg font-black">
          {chosen.length
            ? `New words from ${chosen.length === 1 ? 'one topic' : `${chosen.length} topics`} first`
            : 'Choose what you want to learn about'}
        </p>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          As many as you like. Today’s new words and Learn take the words of the
          topics chosen first, one from each in turn; once they are met, the
          rest come in the order the trip uses them.
        </p>
        {chosen.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chosen.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--jade)] px-3 py-1 text-sm font-bold text-white"
              >
                <span className="zh font-normal">{TOPIC[id]!.zh}</span>
                {TOPIC[id]!.title}
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
                on={chosen.includes(t.id)}
                onToggle={() => toggle(t.id)}
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
  on,
  onToggle,
}: {
  topic: Topic
  on: boolean
  onToggle: () => void
}) {
  const { bank } = useStore()
  const now = Date.now()
  const ws = topicWords(topic)
  const met = ws.filter((w) => bank.cards[w.id]).length
  const known = ws.filter((w) => level(bank.cards[w.id], now) === 2).length
  const all = met === ws.length
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`zh-card zh-lift flex items-start gap-3.5 p-4 text-left transition ${on ? 'shadow-[inset_0_0_0_2px_var(--jade)]' : ''}`}
    >
      <span
        className={`zh flex h-12 min-w-14 shrink-0 items-center justify-center rounded-xl px-2 whitespace-nowrap ${[...topic.zh].length > 3 ? 'text-base' : [...topic.zh].length > 2 ? 'text-lg' : 'text-xl'} ${on ? 'bg-[var(--jade)] text-white' : 'bg-[var(--paper-2)] text-[var(--red)]'}`}
        title={topic.py}
      >
        {topic.zh}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-bold">{topic.title}</span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${on ? 'bg-[var(--jade)] text-white' : 'bg-[var(--paper-2)] text-[var(--ink-2)]'}`}
          >
            {on ? <Check size={14} /> : <Plus size={14} />}
            {on ? 'Chosen' : 'Choose'}
          </span>
        </span>
        <span className="mt-1 block text-sm leading-snug text-[var(--ink-2)]">
          {topic.about}
        </span>
        <span
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
        </span>
        <span className="mt-1 block text-xs text-[var(--ink-2)]">
          {ws.length} words · {met} met · {known} known
          {all && ' · every word met'}
        </span>
      </span>
    </button>
  )
}
