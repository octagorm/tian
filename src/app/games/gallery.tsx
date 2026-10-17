import { useState } from 'react'
import { SPRITES, SPRITE_GROUPS } from '../pixel/sprites'
import { FIGURES } from '../pixel/portraits'
import { Face, Pix } from '../pixel/Pix'
import { PLAYER_LOOK, SCENES } from '../data/trip'
import { CUSTOMERS } from '../data/shop'
import { Frame } from '../ui'
import type { ReactNode } from 'react'
import type { Look } from '../pixel/Pix'

// Every sprite and a wide range of portraits, for checking the art:
// /#gallery. Animations play; faces blink, and talk when tapped or
// when "Talk" is on.

type Backdrop = 'paper' | 'night' | 'sky'

const BACKDROPS: Record<Backdrop, string> = {
  paper: '#fffaf1',
  night: '#1c1830',
  sky: '#cfe3e6',
}

const COATS = [
  '#c8372d',
  '#2f7d6d',
  '#3d6fa8',
  '#6b4fa0',
  '#d9a441',
  '#8a5a3c',
  '#1f1a17',
  '#e07a9a',
]
const coat = (i: number) => COATS[i % COATS.length]

const HAIR: Array<NonNullable<Look['style']>> = [
  'short',
  'spiky',
  'parted',
  'buzz',
  'curly',
  'long',
  'bob',
  'bun',
  'buns',
  'pony',
  'braids',
  'topknot',
  'bald',
  'cap',
  'chef',
  'kufi',
  'shaved',
]
const HATS: Array<NonNullable<Look['headwear']>> = [
  'straw',
  'cap',
  'ballcap',
  'beret',
  'beanie',
  'scarf',
  'headband',
  'flower',
  'official',
  'crown',
  'helmet',
  'veil',
]
const CLOTHES: Array<NonNullable<Look['clothes']>> = [
  'jacket',
  'mandarin',
  'suit',
  'uniform',
  'tunic',
  'qipao',
  'robe',
  'apron',
  'chef',
  'hoodie',
  'tee',
  'armor',
  'kasaya',
]
const FACES: Array<NonNullable<Look['expression']>> = [
  'neutral',
  'smile',
  'grin',
  'surprised',
  'stern',
  'sad',
]
const SKINS = ['#f6d6bc', '#e8b98f', '#d9a074', '#b97a52', '#8d5a3b', '#5e3b2a']

// Everyone the trip casts, once each, and the player
function tripCast(): Array<{ name: string; look: Look }> {
  const seen = new Set<string>()
  const out = [{ name: 'You', look: PLAYER_LOOK }]
  for (const s of SCENES)
    for (const c of Object.values(s.cast)) {
      const key = JSON.stringify(c.look)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ name: c.name, look: c.look })
    }
  return out
}

export default function Gallery() {
  const [scale, setScale] = useState(3)
  const [bg, setBg] = useState<Backdrop>('paper')
  const [animate, setAnimate] = useState(true)
  const [talk, setTalk] = useState(false)

  const total = Object.keys(SPRITES).length
  const moving = Object.values(SPRITES).filter((s) => s?.frames?.length).length

  const faceSets: Array<{
    title: string
    looks: Array<{ name: string; look: Look }>
  }> = [
    { title: 'The trip’s cast', looks: tripCast() },
    {
      title: 'The stall’s customers',
      looks: CUSTOMERS.map((look, i) => ({ name: `Customer ${i + 1}`, look })),
    },
    {
      title: 'Figures from the classics (FIGURES in portraits.ts)',
      looks: Object.values(FIGURES).map(({ name, zh, ...look }) => ({
        name: `${zh} ${name}`,
        look,
      })),
    },
    {
      title: 'Hair (style)',
      looks: HAIR.map((style, i) => ({
        name: style,
        look: {
          style,
          coat: coat(i),
          hair: i % 5 === 3 ? '#6b4a2e' : undefined,
        },
      })),
    },
    {
      title: 'Hats (headwear)',
      looks: HATS.map((headwear, i) => ({
        name: headwear,
        look: {
          style: (['short', 'bun', 'long', 'pony'] as const)[i % 4],
          headwear,
          coat: coat(i + 2),
        },
      })),
    },
    {
      title: 'Clothes (clothes, accent)',
      looks: CLOTHES.map((clothes, i) => ({
        name: clothes,
        look: {
          style: (['short', 'bob', 'parted', 'bun'] as const)[i % 4],
          clothes,
          coat: coat(i + 1),
          accent: i % 2 ? '#2f7d6d' : undefined,
        },
      })),
    },
    {
      title: 'Faces (expression, age, beard, glasses…)',
      looks: [
        ...FACES.map((expression, i) => ({
          name: expression,
          look: { style: 'bob' as const, expression, coat: coat(i + 3) },
        })),
        {
          name: 'child',
          look: {
            style: 'buns',
            age: 'child',
            coat: '#e07a9a',
            clothes: 'tee',
          },
        },
        {
          name: 'child, braids',
          look: {
            style: 'braids',
            age: 'child',
            coat: '#3d6fa8',
            expression: 'grin',
          },
        },
        {
          name: 'old',
          look: { style: 'bun', old: true, coat: '#6b4fa0' },
        },
        {
          name: 'old, scarf',
          look: {
            style: 'bun',
            old: true,
            headwear: 'scarf',
            hat: '#3d6fa8',
            coat: '#8a5a3c',
          },
        },
        {
          name: 'beard',
          look: { style: 'short', beard: true, coat: '#8a5a3c' },
        },
        {
          name: 'old, beard',
          look: {
            style: 'bald',
            old: true,
            beard: true,
            coat: '#e8e2d0',
          },
        },
        {
          name: 'moustache',
          look: {
            style: 'parted',
            moustache: true,
            clothes: 'suit',
            coat: '#3a3346',
          },
        },
        {
          name: 'glasses',
          look: { style: 'pony', glasses: true, coat: '#3d6fa8' },
        },
        {
          name: 'earrings, blush',
          look: {
            style: 'long',
            earrings: '#e8b84a',
            blush: true,
            coat: '#2f7d6d',
          },
        },
      ],
    },
    {
      title: 'Skin',
      looks: SKINS.map((skin, i) => ({
        name: skin,
        look: {
          style: (['curly', 'short', 'long', 'buzz', 'bun', 'bob'] as const)[i],
          skin,
          coat: coat(i + 4),
        },
      })),
    },
    {
      title: 'The starship’s captain, in her tunic',
      looks: [
        { name: 'Captain', look: { style: 'bun', coat: '#c8372d' } },
        {
          name: 'clothes: tunic',
          look: { style: 'bun', coat: '#c8372d', clothes: 'tunic' },
        },
        {
          name: 'science',
          look: {
            style: 'short',
            coat: '#3d6fa8',
            clothes: 'tunic',
            glasses: true,
          },
        },
        {
          name: 'engineering',
          look: {
            style: 'buzz',
            coat: '#d9a441',
            clothes: 'tunic',
            beard: true,
          },
        },
      ],
    },
  ]

  return (
    <Frame title="Gallery" zh="画廊" wide>
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 bg-[var(--paper)]/95 px-4 py-2 text-sm backdrop-blur">
        <span className="text-[var(--ink-2)]">
          {total} sprites, {moving} moving
        </span>
        <Choice
          label="Scale"
          value={scale}
          options={[2, 3, 4]}
          show={(n) => `${n}×`}
          set={setScale}
        />
        <Choice
          label="Backdrop"
          value={bg}
          options={['paper', 'night', 'sky'] as Array<Backdrop>}
          show={(b) => b}
          set={setBg}
        />
        <Toggle on={animate} set={setAnimate}>
          Animate
        </Toggle>
        <Toggle on={talk} set={setTalk}>
          Talk
        </Toggle>
      </div>

      {SPRITE_GROUPS.map((g) => (
        <Section key={g.title} title={g.title} count={g.names.length}>
          <div className="flex flex-wrap gap-2">
            {g.names.map((name) => {
              const sp = SPRITES[name]
              if (!sp) return null
              const w = sp.rows[0].length
              const n = 1 + (sp.frames?.length ?? 0)
              return (
                <figure
                  key={name}
                  className="flex flex-col items-center justify-end rounded-xl p-2 shadow-sm"
                  style={{
                    background: BACKDROPS[bg],
                    width: Math.max(88, w * scale + 16),
                  }}
                >
                  <Pix name={name} size={w * scale} animate={animate} />
                  <figcaption
                    className={`mt-1 max-w-24 truncate text-center text-[11px] ${bg === 'night' ? 'text-white/80' : 'text-[var(--ink-2)]'}`}
                  >
                    {name}
                    {(n > 1 || w !== 16) && (
                      <span className="opacity-60">
                        {' '}
                        {w !== 16 ? `${w}px` : ''}
                        {n > 1 ? ` ${n}f` : ''}
                      </span>
                    )}
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </Section>
      ))}

      <h2 className="mt-10 text-xl font-black">Portraits</h2>
      <p className="mb-2 text-sm text-[var(--ink-2)]">
        24 × 28, drawn from a Look (pixel/portraits.ts). They blink now and
        then; tap one to make it talk.
      </p>
      {faceSets.map((set) => (
        <Section key={set.title} title={set.title} count={set.looks.length}>
          <div className="flex flex-wrap gap-2">
            {set.looks.map((f, i) => (
              <Portrait
                key={i}
                name={f.name}
                look={f.look}
                size={24 * scale}
                talking={talk}
                bg={bg}
              />
            ))}
          </div>
        </Section>
      ))}
    </Frame>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-sm font-bold tracking-wide text-[var(--ink-2)] uppercase">
        {title} <span className="font-normal opacity-60">{count}</span>
      </h3>
      {children}
    </section>
  )
}

function Portrait({
  name,
  look,
  size,
  talking,
  bg,
}: {
  name: string
  look: Look
  size: number
  talking: boolean
  bg: Backdrop
}) {
  const [own, setOwn] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOwn(!own)}
      className="flex flex-col items-center rounded-xl p-2 shadow-sm"
      style={{ background: BACKDROPS[bg] }}
      title={JSON.stringify(look)}
    >
      <Face
        look={look}
        size={size}
        talking={talking !== own}
        className="rounded-lg border-2 border-[var(--ink)] bg-[#cfe3e6]"
      />
      <span
        className={`mt-1 max-w-24 truncate text-[11px] ${bg === 'night' ? 'text-white/80' : 'text-[var(--ink-2)]'}`}
      >
        {name}
      </span>
    </button>
  )
}

function Choice<T extends string | number>({
  label,
  value,
  options,
  show,
  set,
}: {
  label: string
  value: T
  options: Array<T>
  show: (v: T) => string
  set: (v: T) => void
}) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-[var(--ink-2)]">{label}</span>
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          onClick={() => set(o)}
          className={`rounded-lg px-2 py-0.5 font-bold ${o === value ? 'bg-[var(--ink)] text-[var(--paper)]' : 'bg-[var(--paper-2)]'}`}
        >
          {show(o)}
        </button>
      ))}
    </span>
  )
}

function Toggle({
  on,
  set,
  children,
}: {
  on: boolean
  set: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      aria-pressed={on}
      className={`rounded-lg px-2 py-0.5 font-bold ${on ? 'bg-[var(--jade)] text-white' : 'bg-[var(--paper-2)]'}`}
    >
      {children}
    </button>
  )
}
