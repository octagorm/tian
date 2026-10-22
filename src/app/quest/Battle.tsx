import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import {
  FOOD,
  NUMBERS,
  PEACH_HEAL,
  QUEST,
  REWARDS,
  SKILLS,
  TWISTS,
} from '../data/quest'
import { WORDS } from '../data/words'
import { join, syllables } from '../lib/pinyin'
import { pick } from '../lib/bank'
import { blip, say } from '../lib/audio'
import { plain } from '../lib/text'
import { useStore } from '../lib/store'
import {
  Btn,
  Frame,
  Mixed,
  Ruby,
  SpeakButton,
  Sprinkled,
  Stars,
  shuffle,
} from '../ui'
import { Ask } from './Ask'
import { heroOf } from './hero'
import { Art, Icon } from './Icon'
import { StageView } from './StageView'
import type { AskKind, Question } from './Ask'
import type { Stage, Strike } from './stage'
import type { Chapter, SkillId, Twist } from '../data/quest'
import type { Word } from '../data/words'
import './quest.css'

// One chapter: its story told on the stage, the words the master teaches,
// then the fight. Your moves are questions about words – the harder the
// question, the harder the blow – and the demon's blows are dodged by
// answering in time. Each demon has a twist (data/quest.ts). The fight
// waits on the stage's animation of each action before the next.

interface Move {
  id: Strike
  name: string
  zh: string
  kind: AskKind
  damage: number
  text: string
}

const MOVES: Array<Move> = [
  {
    id: 'cudgel',
    name: 'Golden cudgel',
    zh: '金箍棒',
    kind: 'meaning',
    damage: 12,
    text: 'Read a word: what does it mean?',
  },
  {
    id: 'eyes',
    name: 'Fiery golden eyes',
    zh: '火眼金睛',
    kind: 'listen',
    damage: 16,
    text: 'Hear a word: which is it?',
  },
  {
    id: 'cloud',
    name: 'Somersault cloud',
    zh: '筋斗云',
    kind: 'type',
    damage: 24,
    text: 'Type its pinyin.',
  },
]

type Item = 'peach' | 'gourd' | 'pill'

type Action =
  | { kind: 'move'; move: Move }
  | { kind: 'skill'; id: SkillId }
  | { kind: 'item'; id: Item }

interface Command {
  key: number
  action: Action
  ok: boolean
  // What it does, or why it cannot be used now
  note?: string
}

type Phase =
  | { kind: 'story'; page: number }
  | { kind: 'lesson' }
  | { kind: 'choose' }
  | { kind: 'ask'; q: Question; n: number }
  | { kind: 'busy' }
  | { kind: 'won'; stars: number; first: boolean }
  | { kind: 'lost' }

interface Fight {
  hp: number
  max: number
  foe: number
  poison: number
  peaches: number
  hairs: boolean
  gourd: boolean
  pill: boolean
  used: Set<SkillId>
  frozen: number
  giant: number
  calm: number
  roc: Twist
  log: Array<{ text: string; good: boolean }>
  seen: Array<{ w: Word; right: boolean }>
}

// What the Roc borrows, a turn at a time
const ROC: Array<Twist> = [
  'wind',
  'fire',
  'fan',
  'mirror',
  'poison',
  'disguise',
  'swarm',
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function Battle({
  chapter,
  onExit,
  onAgain,
  onNext,
}: {
  chapter: Chapter
  onExit: () => void
  onAgain: () => void
  onNext: (c: Chapter) => void
}) {
  const { bank, meet, record, setScene, points, settings } = useStore()
  const demon = chapter.demon
  const [h0] = useState(() => heroOf(bank))
  const stage = useRef<Stage | null>(null)
  const live = useRef(true)
  const busy = useRef(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'story', page: 0 })
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const [, render] = useReducer((x: number) => x + 1, 0)
  const asked = useRef(0)
  const answer = useRef<((r: { right: boolean; ms: number }) => void) | null>(
    null,
  )
  const F = useRef<Fight>({
    hp: h0.hp,
    max: h0.hp,
    foe: demon.hp,
    poison: 0,
    peaches: h0.peaches,
    hairs: h0.hairs,
    gourd: h0.gourd,
    pill: h0.pill,
    used: new Set(),
    frozen: 0,
    giant: 0,
    calm: 0,
    roc: 'none',
    log: [],
    seen: [],
  })
  const f = F.current

  // The words of the fight: those that need practice, of the kind the
  // demon's twist asks for
  const chosen = useMemo(() => {
    const fit = (w: Word) =>
      !w.tags.includes('part') &&
      !w.tags.includes('name') &&
      (demon.twist === 'hungry'
        ? w.tags.includes('food') || w.tags.includes('drink') || FOOD.has(w.id)
        : demon.twist === 'numbers'
          ? w.tags.includes('num') || NUMBERS.has(w.id)
          : true)
    return pick(bank, 24, Date.now(), { fit })
    // once, for the fight
  }, [])
  useEffect(() => meet(chosen.fresh.map((w) => w.id)), [chosen, meet])
  const queue = useRef<Array<Word>>([])
  const nextWord = (): Word => {
    if (!queue.current.length)
      queue.current = shuffle(
        chosen.words.length ? chosen.words : WORDS.slice(0, 12),
      )
    return queue.current.pop() ?? WORDS[0]
  }

  useEffect(
    () => () => {
      live.current = false
    },
    [],
  )
  // (a call, so that the check after each await is not narrowed away)
  const alive = () => live.current

  const twistNow = (): Twist =>
    f.calm > 0 ? 'none' : demon.twist === 'roc' ? f.roc : demon.twist

  const log = (text: string, good: boolean) => {
    f.log = [{ text, good }, ...f.log].slice(0, 3)
    render()
  }

  // An answer: a meaning picked is about the character, or about the
  // pinyin over it while the word is learnt (but not in the wind, which
  // blows the pinyin away); anything heard or typed is about the sound
  const note = (q: Question, right: boolean, weight: number) => {
    const how = q.kind !== 'meaning' ? 'hs' : q.noHints ? 'hm' : 'read'
    record(q.w.id, right, weight, how)
    f.seen.push({ w: q.w, right })
    blip(right ? 'right' : 'wrong')
  }

  // A wrong answer stays up long enough to read the right one
  const hold = async (since: number, right: boolean) => {
    const spent = performance.now() - since
    const need = right ? 0 : 1400
    if (spent < need) await sleep(need - spent)
  }

  const ask = (q: Question) =>
    new Promise<{ right: boolean; ms: number }>((resolve) => {
      answer.current = resolve
      stage.current?.setTension(q.seconds !== null && !!q.danger)
      setPhase({ kind: 'ask', q, n: ++asked.current })
    })

  const onAnswer = (right: boolean, ms: number) => {
    stage.current?.setTension(false)
    const done = answer.current
    answer.current = null
    done?.({ right, ms })
  }

  const hitFoe = (dmg: number) => {
    f.foe = Math.max(0, f.foe - dmg)
    if (demon.twist === 'disguise' && f.foe > 0)
      void stage.current?.form(
        f.foe > (demon.hp * 2) / 3 ? 0 : f.foe > demon.hp / 3 ? 1 : 2,
      )
    render()
  }

  const addPoison = () => {
    f.poison++
    stage.current?.setPoison(f.poison)
  }

  const question = (
    title: string,
    kind: AskKind,
    seconds: number | null,
    danger = false,
  ): Question => {
    const tw = twistNow()
    return {
      title,
      w: nextWord(),
      kind,
      seconds,
      noHints: tw === 'wind',
      fan: tw === 'fan',
      mirror: tw === 'mirror',
      danger,
    }
  }

  const choose = () => {
    busy.current = false
    if (alive()) setPhase({ kind: 'choose' })
  }

  // --- The player's turn

  const act = async (a: Action) => {
    if (busy.current) return
    busy.current = true
    setPhase({ kind: 'busy' })
    const s = () => stage.current
    const power = h0.power
    const tw = twistNow()
    if (a.kind === 'move') {
      const m = a.move
      const kind = tw === 'disguise' ? 'listen' : m.kind
      const q = question(m.name, kind, tw === 'fire' ? 9 : null)
      const { right, ms } = await ask(q)
      if (!alive()) return
      const since = performance.now()
      note(q, right, kind === 'type' ? 0.9 : 0.6)
      if (right) {
        const crit = ms < 3500
        const dmg = Math.round(
          m.damage * power * (crit ? 1.5 : 1) * (f.giant > 0 ? 2 : 1),
        )
        await s()?.attack(m.id, dmg, crit)
        hitFoe(dmg)
        log(`${m.name}${crit ? ' – critical!' : ''} ${dmg} damage.`, true)
        if (f.giant > 0 && --f.giant === 0) await s()?.shrink()
      } else {
        await s()?.attack(m.id, 0, false, false)
        log(
          `Missed! It was ${q.w.h} ${join(syllables(q.w.p))}, “${q.w.g}”.`,
          false,
        )
        if (tw === 'poison') addPoison()
      }
      await hold(since, right)
    } else if (a.kind === 'skill') {
      f.used.add(a.id)
      await skill(a.id)
    } else {
      if (a.id === 'peach') {
        f.peaches--
        const n = Math.min(PEACH_HEAL, f.max - f.hp)
        f.hp += n
        render()
        await s()?.heal(n, 'peach')
        log(`A peach of immortality: +${n}.`, true)
      } else if (a.id === 'gourd') {
        f.gourd = false
        const n = f.max - f.hp
        f.hp = f.max
        render()
        await s()?.heal(n, 'gourd')
        log(`Laozi's golden elixir: +${n}, full health.`, true)
      } else {
        f.pill = false
        f.calm = 3
        s()?.calm(true)
        log('The wind-fixing pill: the demon’s tricks are still.', true)
        await sleep(700)
      }
    }
    if (!alive()) return
    if (f.foe <= 0) return win()
    await demonTurn()
  }

  const skill = async (id: SkillId) => {
    const s = () => stage.current
    const power = h0.power
    if (id === 'clones' || id === 'sage') {
      const clones = id === 'clones'
      let hits = 0
      for (let i = 0; i < 3 && f.foe > 0; i++) {
        const q = question(
          `${clones ? 'Hair clones' : 'Great Sage'} · ${i + 1} of 3`,
          clones ? (twistNow() === 'disguise' ? 'listen' : 'meaning') : 'type',
          clones ? 5 : null,
        )
        const { right } = await ask(q)
        if (!alive()) return
        const since = performance.now()
        note(q, right, clones ? 0.6 : 0.9)
        const dmg = Math.round((clones ? 8 : 24) * power)
        if (clones) await s()?.clones([right ? dmg : null])
        else await s()?.attack('cloud', right ? dmg : 0, false, right)
        if (right) {
          hits++
          hitFoe(dmg)
        }
        await hold(since, right)
      }
      log(
        clones
          ? `The hair clones land ${hits} of 3 blows.`
          : `The Great Sage lands ${hits} of 3 blows.`,
        hits > 0,
      )
      return
    }
    const kind: AskKind = id === 'insect' ? 'dictation' : 'type'
    const name = SKILLS.find((k) => k.id === id)?.name ?? ''
    const q = question(name, kind, null)
    const { right } = await ask(q)
    if (!alive()) return
    const since = performance.now()
    note(q, right, 0.9)
    if (id === 'freeze') {
      if (right) {
        f.frozen = 1
        await s()?.freeze()
        log(`The freezing spell holds: ${demon.name} cannot move.`, true)
      } else log('The spell fails.', false)
    } else if (id === 'insect') {
      const dmg = Math.round(30 * power)
      await s()?.insect(dmg, right)
      if (right) {
        hitFoe(dmg)
        log(`From inside the demon: ${dmg} damage.`, true)
      } else log('Wukong buzzes about and finds no way in.', false)
    } else if (right) {
      f.giant = 3
      await s()?.grow()
      log(
        'Wukong grows as tall as heaven: three blows at double strength.',
        true,
      )
    } else log('Wukong stays his own size.', false)
    await hold(since, right)
  }

  // --- The demon's turn

  const demonTurn = async () => {
    const s = () => stage.current
    if (f.frozen > 0) {
      f.frozen--
      log(`${demon.name} stands frozen, and you strike again.`, true)
      await sleep(600)
      if (f.frozen === 0) await s()?.thaw()
      return choose()
    }
    if (demon.twist === 'roc') {
      f.roc = ROC[Math.floor(Math.random() * ROC.length)]
      s()?.setRoc(f.roc)
    }
    if (f.calm > 0 && --f.calm === 0) s()?.calm(false)
    const tw = twistNow()
    s()?.menace(true)
    const listen = tw === 'disguise' || tw === 'gourd'
    const q = question(
      `${demon.name} attacks${tw === 'swarm' ? ' twice' : ''}! Answer to dodge`,
      listen ? 'listen' : 'meaning',
      tw === 'fire' ? 4 : 6,
      true,
    )
    const { right } = await ask(q)
    if (!alive()) return
    const since = performance.now()
    note(q, right, 0.5)
    const hits = tw === 'swarm' ? 2 : 1
    const per = tw === 'gourd' ? demon.power * 2 : demon.power
    if (!right && tw === 'poison') addPoison()
    await s()?.foeTurn(
      !right,
      Array.from({ length: hits }, () => per),
    )
    if (right) log(`Dodged! ${demon.name} strikes empty air.`, true)
    else {
      f.hp = Math.max(0, f.hp - per * hits)
      log(
        `${demon.name} hits you for ${per * hits}${tw === 'gourd' ? ', from inside the gourd' : ''}. (${q.w.h} is “${q.w.g}”.)`,
        false,
      )
      if (tw === 'hungry' && f.peaches > 0 && f.hp > 0) {
        f.peaches--
        await s()?.eatPeach()
        log('He eats one of your peaches.', false)
      }
    }
    if (f.poison > 0 && f.hp > 0) {
      const venom = f.poison * 3
      f.hp = Math.max(0, f.hp - venom)
      render()
      await s()?.poisonTick(venom)
      log(`The poison burns: ${venom}.`, false)
    }
    await hold(since, right)
    if (!alive()) return
    if (f.hp <= 0) {
      if (!f.hairs) return lose()
      f.hairs = false
      f.hp = Math.round(f.max / 2)
      render()
      await s()?.revive(f.hp)
      log('One of Guanyin’s hairs: Wukong rises again.', true)
    }
    choose()
  }

  // --- Endings

  const win = async () => {
    setPhase({ kind: 'busy' })
    await stage.current?.victory()
    if (!alive()) return
    const stars = f.hp > f.max * 0.66 ? 3 : f.hp > f.max * 0.33 ? 2 : 1
    const first = !h0.won(chapter.id)
    const reward = first ? chapter.reward : undefined
    if (reward) void stage.current?.treasure(REWARD_ICON[reward] ?? 'star')
    setScene(chapter.id, stars)
    points(10)
    blip('win')
    setPhase({ kind: 'won', stars, first })
  }

  const lose = async () => {
    setPhase({ kind: 'busy' })
    await stage.current?.defeat()
    if (alive()) setPhase({ kind: 'lost' })
  }

  // --- The story

  const lastPage = chapter.intro.length - 1
  const unmet = chapter.teach.filter((id) => !bank.cards[id])

  // The demon speaks, as the fight begins
  const taunt = () => {
    if (demon.line && settings.autoplay)
      void say(plain(demon.line.zh, { home: settings.home }), demon.line.voice)
  }

  const startFight = async () => {
    meet(chapter.teach)
    setPhase({ kind: 'busy' })
    await stage.current?.reveal()
    taunt()
    await stage.current?.fight()
    choose()
  }

  const turnPage = () => {
    const p = phaseRef.current
    if (p.kind !== 'story') return
    if (p.page < lastPage) {
      setPhase({ kind: 'story', page: p.page + 1 })
      if (p.page + 1 === lastPage) void stage.current?.reveal()
    } else if (unmet.length) setPhase({ kind: 'lesson' })
    else void startFight()
  }

  const onStage = (s: Stage | null) => {
    stage.current = s
    if (!s) return
    const p = phaseRef.current
    if (p.kind === 'story')
      void s.enter().then(() => {
        const now = phaseRef.current
        if (now.kind !== 'story' || now.page === lastPage) void s.reveal()
      })
    else {
      void s.reveal()
      void s.fight()
    }
  }

  // --- What can be done now: every command keeps its number for the
  // whole fight, so a key always means the same thing

  const tw = twistNow()
  const trapped = tw === 'trap'
  const commands: Array<Command> = []
  const add = (action: Action, ok: boolean, why?: string) =>
    commands.push({ key: commands.length + 1, action, ok, note: why })
  for (const m of MOVES)
    add(
      { kind: 'move', move: m },
      !trapped || m.kind === 'type',
      trapped && m.kind !== 'type' ? 'No room inside the cymbals' : undefined,
    )
  for (const k of h0.skills)
    add(
      { kind: 'skill', id: k.id },
      !f.used.has(k.id) && !(trapped && k.id === 'clones'),
      f.used.has(k.id) ? 'Used in this fight' : undefined,
    )
  add(
    { kind: 'item', id: 'peach' },
    f.peaches > 0 && f.hp < f.max,
    f.peaches > 0 ? `Heal ${PEACH_HEAL}` : 'All eaten',
  )
  if (h0.gourd)
    add(
      { kind: 'item', id: 'gourd' },
      f.gourd && f.hp < f.max,
      f.gourd ? 'Heal fully' : 'Drunk',
    )
  if (h0.pill) {
    const still = !['none', 'trap', 'hungry', 'numbers'].includes(demon.twist)
    add(
      { kind: 'item', id: 'pill' },
      f.pill && still && f.calm === 0,
      !f.pill ? 'Taken' : still ? 'Still the twist' : 'No wind to still here',
    )
  }
  const moveCommands = commands.filter((c) => c.action.kind === 'move')
  const otherCommands = commands.filter((c) => c.action.kind !== 'move')

  // Keys for the story, the commands and the endings (the questions have
  // their own)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLInputElement) return
      const p = phaseRef.current
      if (p.kind === 'story' && ['Enter', ' ', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        turnPage()
      } else if (p.kind === 'lesson' && e.key === 'Enter') {
        e.preventDefault()
        void startFight()
      } else if (p.kind === 'choose') {
        const c = commands.find((x) => String(x.key) === e.key)
        if (c) {
          e.preventDefault()
          if (c.ok) void act(c.action)
        }
      } else if (p.kind === 'won' && e.key === 'Enter') {
        e.preventDefault()
        const next = QUEST[QUEST.indexOf(chapter) + 1] as Chapter | undefined
        if (next) onNext(next)
        else onExit()
      } else if (p.kind === 'lost' && e.key === 'Enter') {
        e.preventDefault()
        onAgain()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const cast = useMemo(
    () => ({
      field: chapter.id,
      demon: demon.art,
      twist: demon.twist,
      // (not the pig in his own chapter, nor Sha Wujing in his)
      party: h0.party.filter(
        (p): p is 'pig' | 'sand' => p !== 'monk' && p !== OWN[chapter.id],
      ),
      late: chapter.id === 'q1' || chapter.id === 'q8',
    }),
    [],
  )

  const next = QUEST[QUEST.indexOf(chapter) + 1] as Chapter | undefined
  const fighting =
    phase.kind === 'choose' || phase.kind === 'ask' || phase.kind === 'busy'

  return (
    <Frame
      title={chapter.title}
      zh={chapter.zh}
      right={
        phase.kind === 'won' ? null : (
          <Btn kind="ghost" onClick={onExit}>
            {fighting ? 'Flee' : 'Map'}
          </Btn>
        )
      }
    >
      <div className="overflow-hidden rounded-2xl ring-4 ring-[var(--ink)]">
        <StageView
          cast={cast}
          onReady={onStage}
          label={`Wukong and his master against ${demon.name}, at ${chapter.place}`}
        />
        <div className="quest-dark px-4 pt-3 pb-4 sm:px-5">
          {phase.kind !== 'story' && phase.kind !== 'lesson' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Meter
                  zh="孙悟空"
                  name={`Wukong · Lv ${h0.level}`}
                  value={f.hp}
                  max={f.max}
                  color="#4fb07a"
                />
                <Meter
                  zh={demon.zh}
                  name={demon.name}
                  value={f.foe}
                  max={demon.hp}
                  color="#d8463a"
                  right
                />
              </div>
              <Status f={f} twist={tw} base={demon.twist} />
              <div className="quest-rule my-3" />
            </>
          )}

          {phase.kind === 'story' && (
            <div className="zh-rise" key={phase.page}>
              <p className="text-xs font-bold tracking-widest text-[var(--gold)] uppercase">
                {chapter.place}
              </p>
              <p className="mt-2 min-h-24 text-lg leading-relaxed">
                <Sprinkled text={chapter.intro[phase.page]} />
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="flex gap-1.5">
                  {chapter.intro.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-4 rounded-full ${i <= phase.page ? 'bg-[var(--gold)]' : 'bg-white/15'}`}
                    />
                  ))}
                </span>
                <Btn onClick={turnPage}>
                  {phase.page < lastPage
                    ? 'Go on'
                    : unmet.length
                      ? 'Prepare'
                      : 'Fight!'}
                  <span className="quest-key ml-1 rounded border border-white/30 px-1 text-[10px]">
                    Enter
                  </span>
                </Btn>
              </div>
            </div>
          )}

          {phase.kind === 'lesson' && (
            <div className="zh-rise">
              <p className="text-xs font-bold tracking-widest text-[var(--gold)] uppercase">
                Your master teaches you new words for this fight
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {unmet.map((id) => {
                  const w = WORDS.find((x) => x.id === id)
                  if (!w) return null
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-3 rounded-xl border-2 border-[#3d3044] bg-[#211925] px-3 py-2"
                    >
                      <Ruby h={w.h} p={w.p} className="text-4xl" />
                      <span className="min-w-0 flex-1 text-sm leading-snug">
                        {w.e}
                      </span>
                      <SpeakButton text={w.h} />
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-sm text-[var(--ink-2)]">
                {TWISTS[demon.twist]}
              </p>
              <div className="mt-4 flex justify-end">
                <Btn onClick={() => void startFight()}>
                  Fight!
                  <span className="quest-key ml-1 rounded border border-white/30 px-1 text-[10px]">
                    Enter
                  </span>
                </Btn>
              </div>
            </div>
          )}

          {phase.kind === 'choose' && (
            <div className="zh-rise">
              {f.log.length === 0 && (
                <div className="mb-3">
                  {demon.line ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Mixed line={demon.line.zh} size="sm" />
                      <SpeakButton
                        text={plain(demon.line.zh, { home: settings.home })}
                        voice={demon.line.voice}
                        size={16}
                        className="!p-1"
                      />
                      <span className="text-sm text-[var(--ink-2)] italic">
                        “{demon.line.en}”
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--ink-2)] italic">
                      “{demon.taunt}”
                    </p>
                  )}
                  <p className="mt-1 text-sm text-[var(--ink-2)]">
                    {TWISTS[demon.twist]}
                  </p>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-3">
                {moveCommands.map((c) => {
                  if (c.action.kind !== 'move') return null
                  const m = c.action.move
                  const kind = tw === 'disguise' ? 'listen' : m.kind
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!c.ok}
                      onClick={() => void act(c.action)}
                      className="quest-slot relative flex items-center gap-3 rounded-xl p-3 text-left disabled:opacity-35 sm:flex-col sm:items-start sm:gap-1.5"
                    >
                      <span className="quest-key absolute top-1.5 right-2 text-[10px] font-black text-[var(--gold)] opacity-70">
                        {c.key}
                      </span>
                      <Icon name={m.id} size={36} />
                      <span className="min-w-0">
                        <span className="block leading-tight font-black">
                          <span className="zh mr-1 font-normal text-[#ff8a7a]">
                            {m.zh}
                          </span>
                          {m.name}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-[var(--ink-2)]">
                          {c.note ??
                            (kind === 'listen' && m.kind !== 'listen'
                              ? 'In disguise she is only a voice: hear the word.'
                              : m.text)}{' '}
                          {c.ok && (
                            <>
                              <b className="text-[var(--ink)]">
                                {Math.round(
                                  m.damage * h0.power * (f.giant > 0 ? 2 : 1),
                                )}
                              </b>{' '}
                              damage
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {otherCommands.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {otherCommands.map((c) => {
                    const a = c.action
                    const art =
                      a.kind === 'skill'
                        ? SKILLS.find((k) => k.id === a.id)
                        : undefined
                    const icon = a.kind === 'move' ? a.move.id : a.id
                    return (
                      <button
                        key={icon}
                        type="button"
                        title={art?.text}
                        disabled={!c.ok}
                        onClick={() => void act(a)}
                        className="quest-slot relative flex items-center gap-2 rounded-xl py-1.5 pr-3 pl-2 text-left text-sm disabled:opacity-35"
                      >
                        <Icon name={icon} size={28} />
                        <span>
                          {art ? (
                            <>
                              <span className="zh mr-1 text-[#ff8a7a]">
                                {art.zh}
                              </span>
                              <b>{art.name}</b>
                            </>
                          ) : (
                            a.kind === 'item' && (
                              <>
                                <b>{ITEM_NAME[a.id]}</b>
                                {a.id === 'peach' && f.peaches > 1 && (
                                  <span className="text-[var(--ink-2)]">
                                    {' '}
                                    ×{f.peaches}
                                  </span>
                                )}
                              </>
                            )
                          )}
                          {c.note && (
                            <span className="block text-xs text-[var(--ink-2)]">
                              {c.note}
                            </span>
                          )}
                        </span>
                        <span className="quest-key ml-1 text-[10px] font-black text-[var(--gold)] opacity-70">
                          {c.key}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {phase.kind === 'ask' && (
            <Ask
              key={phase.n}
              q={phase.q}
              onAnswer={onAnswer}
              onGust={() => stage.current?.gust()}
            />
          )}

          {phase.kind === 'busy' && f.log.length > 0 && (
            <p
              className={`min-h-10 text-center font-bold ${f.log[0].good ? 'text-[#8fe0a0]' : 'text-[#ff8a7a]'}`}
            >
              {f.log[0].text}
            </p>
          )}

          {phase.kind === 'won' && (
            <Won
              chapter={chapter}
              stars={phase.stars}
              first={phase.first}
              level={h0.level}
              skills={h0.skills.length}
              seen={f.seen}
              next={next}
              onExit={onExit}
              onNext={onNext}
            />
          )}

          {phase.kind === 'lost' && (
            <div className="zh-rise text-center">
              <Seal char="败" color="#3a3040" />
              <p className="mt-3 text-lg">
                {demon.name} carries your master off to the cave. Wukong will
                not give up!
              </p>
              <Practised seen={f.seen} />
              <div className="mt-4 flex justify-center gap-2">
                <Btn kind="ghost" onClick={onExit}>
                  Map
                </Btn>
                <Btn onClick={onAgain}>
                  Try again
                  <span className="quest-key ml-1 rounded border border-white/30 px-1 text-[10px]">
                    Enter
                  </span>
                </Btn>
              </div>
            </div>
          )}

          {(phase.kind === 'choose' || phase.kind === 'ask') &&
            f.log.length > 0 && (
              <div className="mt-3 space-y-0.5 text-sm" aria-live="polite">
                {f.log.slice(0, 2).map((l, i) => (
                  <p
                    key={i}
                    className={`${i === 0 ? 'font-bold' : 'opacity-50'} ${l.good ? 'text-[#8fe0a0]' : 'text-[#ff8a7a]'}`}
                  >
                    {l.text}
                  </p>
                ))}
              </div>
            )}
        </div>
      </div>
    </Frame>
  )
}

// The chapters where a disciple is still the demon
const OWN: Record<string, string | undefined> = { q10: 'pig', q11: 'sand' }

const ITEM_NAME: Record<Item, string> = {
  peach: 'Peach',
  gourd: 'Elixir',
  pill: 'Wind pill',
}

function Meter({
  zh,
  name,
  value,
  max,
  color,
  right,
}: {
  zh: string
  name: string
  value: number
  max: number
  color: string
  right?: boolean
}) {
  const k = Math.max(0, value / max)
  return (
    <div className={right ? 'text-right' : ''}>
      <div className="truncate text-sm leading-tight">
        <span className="zh mr-1 text-[#ff8a7a]">{zh}</span>
        <b>{name}</b>
      </div>
      <div className={`quest-bar mt-1 ${right ? 'ml-auto' : ''}`}>
        <div
          style={{
            width: `${k * 100}%`,
            marginLeft: right ? 'auto' : undefined,
            background: k > 0.5 ? color : k > 0.25 ? '#e8b64e' : '#e0503a',
          }}
        />
      </div>
      <div className="mt-0.5 text-xs text-[var(--ink-2)] tabular-nums">
        {value} / {max}
      </div>
    </div>
  )
}

function Status({ f, twist, base }: { f: Fight; twist: Twist; base: Twist }) {
  const chips: Array<{ icon: string; text: string; tone: string }> = []
  if (base === 'roc' && twist !== 'none')
    chips.push({
      icon: 'star',
      text: `Roc: ${ROC_NAME[twist] ?? twist}`,
      tone: '#e8b64e',
    })
  if (f.poison > 0)
    chips.push({
      icon: 'skull',
      text: `Poison ×${f.poison}: ${f.poison * 3} a turn`,
      tone: '#7cff6a',
    })
  if (f.frozen > 0)
    chips.push({ icon: 'freeze', text: 'Demon frozen', tone: '#8fd0f0' })
  if (f.giant > 0)
    chips.push({ icon: 'giant', text: `Giant ×${f.giant}`, tone: '#e8b64e' })
  if (f.calm > 0)
    chips.push({ icon: 'pill', text: `Still for ${f.calm}`, tone: '#8fd0f0' })
  if (f.hairs)
    chips.push({ icon: 'hairs', text: 'Life-saving hairs', tone: '#e8b64e' })
  if (!chips.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.text}
          className="inline-flex items-center gap-1 rounded-full bg-white/5 py-0.5 pr-2.5 pl-1 text-xs font-bold"
          style={{ color: c.tone }}
        >
          <Icon name={c.icon} size={18} />
          {c.text}
        </span>
      ))}
    </div>
  )
}

const ROC_NAME: Partial<Record<Twist, string>> = {
  wind: 'the Yellow Wind',
  fire: 'Red Boy’s fire',
  fan: 'the palm-leaf fan',
  mirror: 'the false king’s mirror',
  poison: 'the scorpion’s sting',
  disguise: 'the White Bone disguise',
  swarm: 'the spider swarm',
}

export function Seal({
  char,
  color = '#c8372d',
}: {
  char: string
  color?: string
}) {
  return (
    <span
      className="quest-stamp zh inline-flex h-20 w-20 items-center justify-center rounded-lg text-5xl text-[#fff6ea] shadow-[0_0_0_3px_rgba(255,246,234,0.25)_inset]"
      style={{ background: color }}
    >
      {char}
    </span>
  )
}

// The words of the fight, the missed ones first
function Practised({ seen }: { seen: Array<{ w: Word; right: boolean }> }) {
  const words = new Map<string, { w: Word; right: number; wrong: number }>()
  for (const { w, right } of seen) {
    const e = words.get(w.id) ?? { w, right: 0, wrong: 0 }
    if (right) e.right++
    else e.wrong++
    words.set(w.id, e)
  }
  const list = [...words.values()].sort((a, b) => b.wrong - a.wrong)
  if (!list.length) return null
  return (
    <div className="mt-4 text-left">
      <p className="text-xs font-bold tracking-widest text-[var(--gold)] uppercase">
        Words in this fight{' '}
        <span className="font-normal tracking-normal text-[var(--ink-2)] normal-case">
          · tap one to hear it
        </span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {list.map(({ w, right, wrong }) => (
          <button
            key={w.id}
            type="button"
            onClick={() => void say(w.h)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm transition hover:brightness-125 ${wrong ? 'border-[#e0503a]/60 bg-[#e0503a]/10' : 'border-white/10 bg-white/5'}`}
            title={`${join(syllables(w.p))} – ${w.e}`}
          >
            {wrong ? (
              <X size={14} className="text-[#ff8a7a]" />
            ) : (
              <Check size={14} className="text-[#8fe0a0]" />
            )}
            <span className="zh text-lg leading-none">{w.h}</span>
            <span className="text-xs text-[var(--jade)]">
              {join(syllables(w.p))}
            </span>
            <span className="text-xs text-[var(--ink-2)]">{w.g}</span>
            {right + wrong > 1 && (
              <span className="text-[10px] text-[var(--ink-2)]">
                ×{right + wrong}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function Won({
  chapter,
  stars,
  first,
  level,
  skills,
  seen,
  next,
  onExit,
  onNext,
}: {
  chapter: Chapter
  stars: number
  first: boolean
  level: number
  skills: number
  seen: Array<{ w: Word; right: boolean }>
  next: Chapter | undefined
  onExit: () => void
  onNext: (c: Chapter) => void
}) {
  const { bank } = useStore()
  const now = heroOf(bank)
  const learnt = now.skills.slice(skills)
  return (
    <div className="zh-rise">
      <div className="flex items-center gap-4">
        <Seal char="胜" />
        <div>
          <p className="text-xs font-bold tracking-widest text-[var(--gold)] uppercase">
            Victory
          </p>
          <Stars n={stars} />
          {now.level > level && (
            <p className="mt-1 text-sm font-bold text-[#8fe0a0]">
              Level up! Wukong is now level {now.level}.
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-lg leading-relaxed">
        <Sprinkled text={chapter.win} />
      </p>
      {first && chapter.reward && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-[var(--gold)]/50 bg-[var(--gold)]/10 p-3">
          {chapter.reward === 'pig' || chapter.reward === 'sand' ? (
            <Art name={`${chapter.reward}-back`} height={56} flip />
          ) : (
            <Icon name={REWARD_ICON[chapter.reward] ?? 'star'} size={40} />
          )}
          <p className="text-sm">{REWARDS[chapter.reward]}</p>
        </div>
      )}
      {learnt.map((k) => (
        <div
          key={k.id}
          className="mt-3 flex items-center gap-3 rounded-xl border-2 border-[var(--jade)]/50 bg-[var(--jade)]/10 p-3"
        >
          <Icon name={k.id} size={40} />
          <p className="text-sm">
            Wukong remembers an old art: <b>{k.name}</b>{' '}
            <span className="zh">{k.zh}</span>. {k.text}
          </p>
        </div>
      ))}
      <Practised seen={seen} />
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <Btn kind="ghost" onClick={onExit}>
          Map
        </Btn>
        {next ? (
          <Btn onClick={() => onNext(next)}>
            Onward west
            <span className="quest-key ml-1 rounded border border-white/30 px-1 text-[10px]">
              Enter
            </span>
          </Btn>
        ) : (
          <p className="font-bold text-[var(--gold)]">The road west is done.</p>
        )}
      </div>
    </div>
  )
}

const REWARD_ICON: Record<string, string | undefined> = {
  hairs: 'hairs',
  pill: 'pill',
  gourd: 'gourd',
  peaches: 'peach',
}
