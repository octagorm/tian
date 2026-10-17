import { useEffect } from 'react'
import { Lock } from 'lucide-react'
import { PEACH_HEAL, QUEST, SKILLS } from '../data/quest'
import { WORDS } from '../data/words'
import { useStore } from '../lib/store'
import { Btn, Frame } from '../ui'
import { heroOf, powerAt } from './hero'
import { Art, Icon } from './Icon'
import './quest.css'

// Wukong's page, as in the status screen of an old role-playing game: his
// level and strength, which grow with the word bank; his arts, which come
// back to him as words become known; the party; and what he carries.
export function HeroScreen({ onBack }: { onBack: () => void }) {
  const { bank } = useStore()
  const h = heroOf(bank)
  const chapter = (id: string) => QUEST.find((c) => c.id === id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'w' || e.key === 'W') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const items = [
    {
      icon: 'peach',
      name: 'Peaches of immortality',
      zh: '蟠桃',
      have: true,
      count: h.peaches,
      text: `Each heals ${PEACH_HEAL}. One to start with, one more from Sha Wujing, and two more from Flower-Fruit Mountain.`,
    },
    {
      icon: 'hairs',
      name: 'Life-saving hairs',
      zh: '救命毫毛',
      have: h.hairs,
      count: 1,
      text: 'From Guanyin: if Wukong falls, he rises again with half his health. Once a fight.',
      from: 'q1',
    },
    {
      icon: 'pill',
      name: 'Wind-fixing pill',
      zh: '定风丹',
      have: h.pill,
      count: 1,
      text: 'From Lingji Bodhisattva: stills a demon’s twist for three turns. Once a fight.',
      from: 'q3',
    },
    {
      icon: 'gourd',
      name: 'Gourd of elixir',
      zh: '葫芦',
      have: h.gourd,
      count: 1,
      text: 'Laozi’s golden elixir: heals fully. Once a fight.',
      from: 'q12',
    },
  ]

  const party = [
    {
      id: 'monk',
      art: 'monk-back',
      name: 'Tang Sanzang',
      zh: '唐僧',
      text: 'Your master. He goes west for the scriptures, and is captured often.',
      have: true,
    },
    {
      id: 'pig',
      art: 'pig-back',
      name: 'Zhu Bajie',
      zh: '猪八戒',
      text: 'Lazy, greedy and brave enough. He takes some blows for you: +20 health.',
      have: h.party.includes('pig'),
      from: 'q10',
    },
    {
      id: 'sand',
      art: 'sand-back',
      name: 'Sha Wujing',
      zh: '沙僧',
      text: 'Quiet and loyal. He carries the luggage: one more peach.',
      have: h.party.includes('sand'),
      from: 'q11',
    },
  ]

  return (
    <Frame
      title="Sun Wukong"
      zh="孙悟空"
      right={
        <Btn kind="ghost" onClick={onBack}>
          Map
          <span className="quest-key ml-1 rounded border border-[var(--ink)]/25 px-1 text-[10px]">
            Esc
          </span>
        </Btn>
      }
    >
      <div className="quest-dark overflow-hidden rounded-2xl ring-4 ring-[var(--ink)]">
        <div className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-start">
          <div className="quest-glint shrink-0 rounded-2xl border-4 border-[var(--gold)] bg-[radial-gradient(circle_at_50%_40%,#4a3424,#1b1418)] p-2">
            <Art name="portrait" height={144} />
          </div>
          <div className="w-full min-w-0 flex-1">
            <p className="text-xs font-bold tracking-widest text-[var(--gold)] uppercase">
              <span className="zh normal-case">齐天大圣</span> · Great Sage
              Equal to Heaven
            </p>
            <p className="mt-1 text-3xl font-black">Level {h.level}</p>
            <div className="quest-bar mt-2">
              <div style={{ width: `${h.xp * 10}%`, background: '#e8b64e' }} />
            </div>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              {10 - h.xp} more {10 - h.xp === 1 ? 'word' : 'words'} to meet for
              level {h.level + 1}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="Health"
                value={h.hp}
                note="two for each word known"
              />
              <Stat
                label="Blows"
                value={`×${h.power.toFixed(2)}`}
                note={`×${powerAt(h.level + 1).toFixed(2)} at the next level`}
              />
              <Stat
                label="Words met"
                value={h.met}
                note={`of ${WORDS.length}`}
              />
              <Stat label="Known" value={h.known} note="in hanzi alone" />
            </div>
          </div>
        </div>

        <Section title="Arts" zh="七十二变">
          <p className="mb-3 text-sm text-[var(--ink-2)]">
            Each comes back to Wukong when enough words are known – shown in
            hanzi alone, remembered for a day and a half or more. Each is a
            question of its own, once a fight.
          </p>
          <div className="grid gap-2">
            {SKILLS.map((k) => {
              const have = h.known >= k.known
              return (
                <div
                  key={k.id}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 ${have ? 'border-[var(--gold)]/50 bg-[var(--gold)]/5' : 'border-white/10 opacity-70'}`}
                >
                  <Icon
                    name={k.id}
                    size={44}
                    className={have ? '' : 'opacity-40 grayscale'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-black">
                      <span className="zh mr-1.5 font-normal text-[#ff8a7a]">
                        {k.zh}
                      </span>
                      {k.name}
                    </p>
                    <p className="text-sm text-[var(--ink-2)]">{k.text}</p>
                    {!have && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="quest-bar w-32">
                          <div
                            style={{
                              width: `${Math.min(100, (h.known / k.known) * 100)}%`,
                              background: '#62c4ab',
                            }}
                          />
                        </div>
                        <span className="text-xs text-[var(--ink-2)] tabular-nums">
                          {h.known} of {k.known} words known
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="The party" zh="师徒">
          <div className="grid grid-cols-3 gap-2">
            {party.map((p) => (
              <div
                key={p.id}
                className={`flex flex-col items-center rounded-xl border-2 p-2 text-center sm:p-3 ${p.have ? 'border-white/10 bg-white/5' : 'border-white/5'}`}
              >
                <div className="flex h-20 items-end">
                  <Art
                    name={p.art}
                    height={72}
                    flip={p.id !== 'monk'}
                    className={p.have ? '' : 'opacity-25 brightness-0'}
                  />
                </div>
                <p className="mt-2 text-sm leading-tight font-black sm:text-base">
                  <span className="zh block font-normal text-[#ff8a7a] sm:mr-1 sm:inline">
                    {p.zh}
                  </span>
                  {p.name}
                </p>
                <p className="text-xs text-[var(--ink-2)]">
                  {p.have
                    ? p.text
                    : `Joins after ${chapter(p.from ?? '')?.place ?? 'a chapter'}.`}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Carried" zh="宝贝">
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((it) => (
              <div
                key={it.icon}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 ${it.have ? 'border-white/10 bg-white/5' : 'border-white/5'}`}
              >
                <span className="relative">
                  <Icon
                    name={it.icon}
                    size={40}
                    className={it.have ? '' : 'opacity-30 grayscale'}
                  />
                  {it.have && it.count > 1 && (
                    <span className="absolute -right-1 -bottom-1 rounded-md bg-[var(--gold)] px-1 text-xs font-black text-[#1b1418]">
                      {it.count}
                    </span>
                  )}
                  {!it.have && (
                    <Lock
                      size={14}
                      className="absolute -right-1 -bottom-1 text-[var(--ink-2)]"
                    />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-black">
                    <span className="zh mr-1 font-normal text-[#ff8a7a]">
                      {it.zh}
                    </span>
                    {it.name}
                  </p>
                  <p className="text-xs text-[var(--ink-2)]">
                    {it.have
                      ? it.text
                      : `Won at ${chapter(it.from ?? '')?.place ?? 'a later chapter'}.`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="The road" zh="取经路">
          <p className="text-sm text-[var(--ink-2)]">
            {QUEST.filter((c) => h.won(c.id)).length} of {QUEST.length} chapters
            won, with {h.stars} of {QUEST.length * 3} stars.
          </p>
        </Section>
      </div>
    </Frame>
  )
}

function Stat({
  label,
  value,
  note,
}: {
  label: string
  value: string | number
  note: string
}) {
  return (
    <div className="rounded-xl border-2 border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] font-bold tracking-widest text-[var(--gold)] uppercase">
        {label}
      </p>
      <p className="text-xl font-black tabular-nums">{value}</p>
      <p className="text-[11px] leading-tight text-[var(--ink-2)]">{note}</p>
    </div>
  )
}

function Section({
  title,
  zh,
  children,
}: {
  title: string
  zh: string
  children: React.ReactNode
}) {
  return (
    <section className="px-5 pb-5">
      <div className="quest-rule mb-4" />
      <h2 className="mb-3 flex items-baseline gap-2 text-lg font-black">
        <span className="zh font-normal text-[#ff8a7a]">{zh}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}
