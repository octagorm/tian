import { useState } from 'react'
import { QUEST } from '../data/quest'
import { useStore } from '../lib/store'
import { Battle } from '../quest/Battle'
import { HeroScreen } from '../quest/HeroScreen'
import { MapScreen } from '../quest/MapScreen'
import { reached } from '../quest/hero'

// Journey to the West, as a small role-playing game: the road west on a
// map, a turn-based fight in each chapter (quest/Battle.tsx, drawn on
// quest/stage.ts), and Wukong's own page, where his level and arts grow
// with the word bank. The chapters, demons and twists are in
// data/quest.ts.

type View =
  | { kind: 'map'; from: number | null }
  | { kind: 'hero' }
  | { kind: 'fight'; i: number; n: number }

export default function Quest() {
  const { bank } = useStore()
  const [view, setView] = useState<View>({ kind: 'map', from: null })
  const [selected, setSelected] = useState(() => reached(bank))
  const [tries, setTries] = useState(0)

  if (view.kind === 'fight') {
    const i = view.i
    // Back to the map: the party walks on from here to the next stop
    const back = () => {
      setSelected(reached(bank))
      setView({ kind: 'map', from: i })
    }
    return (
      <Battle
        key={`${QUEST[i].id}-${view.n}`}
        chapter={QUEST[i]}
        onExit={back}
        onAgain={() => setView({ kind: 'fight', i, n: view.n + 1 })}
        onNext={(c) => {
          setSelected(QUEST.indexOf(c))
          setView({ kind: 'map', from: i })
        }}
      />
    )
  }
  if (view.kind === 'hero')
    return <HeroScreen onBack={() => setView({ kind: 'map', from: null })} />
  return (
    <MapScreen
      key={`${view.from ?? 'map'}-${tries}`}
      selected={selected}
      from={view.from}
      onSelect={setSelected}
      onStart={(i) => {
        setTries((t) => t + 1)
        setView({ kind: 'fight', i, n: tries + 1 })
      }}
      onHero={() => setView({ kind: 'hero' })}
    />
  )
}
