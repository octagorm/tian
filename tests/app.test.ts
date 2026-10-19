import { describe, expect, test } from 'vitest'
import { COUNTRIES, WORDS } from '../src/app/data/words'
import { CITIES, SCENES } from '../src/app/data/trip'
import {
  join,
  matches,
  numbered,
  syllables,
  toneOf,
} from '../src/app/lib/pinyin'
import {
  numberGloss,
  numberPinyin,
  toHanzi,
  value,
} from '../src/app/lib/numbers'
import { tokens } from '../src/app/lib/text'
import {
  answer,
  emptyBank,
  level,
  merge,
  newCard,
  pick,
} from '../src/app/lib/bank'

// Tian: the words, the trip's scripts and the helpers they rely on

const PINYIN = /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/

describe('words', () => {
  test('ids are unique', () => {
    const seen = new Set<string>()
    for (const w of WORDS) {
      expect(seen.has(w.id), w.id).toBe(false)
      seen.add(w.id)
    }
  })

  test('one syllable per character (erhua joins 儿)', () => {
    for (const w of WORDS) {
      const s = syllables(w.p)
      const chars = [...w.h].filter(
        (c) => c !== '儿' || !s.at(-1)?.endsWith('r'),
      )
      expect(s.length, `${w.h} ${w.p}`).toBe(chars.length)
      for (const syl of s) expect(syl, `${w.h} ${w.p}`).toMatch(PINYIN)
    }
  })

  test('at most one tone mark per syllable', () => {
    for (const w of WORDS)
      for (const syl of syllables(w.p)) {
        const marks = [...syl].filter((c) =>
          /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(c),
        )
        expect(marks.length, `${w.h} ${syl}`).toBeLessThanOrEqual(1)
      }
  })

  test('every word has a gloss', () => {
    for (const w of WORDS) expect(w.g, w.h).not.toBe('')
  })
})

describe('trip', () => {
  test('every line is made of known words, for every home country', () => {
    for (const home of COUNTRIES)
      for (const s of SCENES)
        for (const step of s.steps) {
          const lines =
            step.kind === 'line' ? [step.zh] : step.options.map((o) => o.zh)
          for (const l of lines)
            expect(() => tokens(l, { home: home.id }), l).not.toThrow()
        }
  })

  test('each choice has one right answer first, and a reason for each wrong one', () => {
    for (const s of SCENES)
      for (const step of s.steps) {
        if (step.kind !== 'choice') continue
        expect(step.options[0].right, `${s.id}: ${step.options[0].zh}`).toBe(
          true,
        )
        for (const o of step.options)
          if (!o.right) expect(o.note, `${s.id}: ${o.zh}`).toBeTruthy()
        expect(step.options.length, `${s.id}`).toBeGreaterThanOrEqual(1)
      }
  })

  test('lines are spoken by the cast', () => {
    for (const s of SCENES)
      for (const step of s.steps)
        if (step.kind === 'line')
          expect(s.cast[step.by], `${s.id}: ${step.by}`).toBeTruthy()
  })

  test('grammar notes belong to scenes', async () => {
    const { GRAMMAR } = await import('../src/app/data/grammar')
    const ids = new Set(SCENES.map((s) => s.id))
    for (const id of Object.keys(GRAMMAR)) expect(ids.has(id), id).toBe(true)
  })

  test('scene ids are unique', () => {
    const ids = SCENES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(CITIES.length).toBeGreaterThan(3)
  })
})

describe('pinyin', () => {
  test('tones and numbers', () => {
    expect(toneOf('mā')).toBe(1)
    expect(toneOf('ma')).toBe(5)
    expect(numbered('nǚ')).toBe('nv3')
    expect(join(['Xī', 'ān'])).toBe("Xī'ān")
  })

  test('typed answers', () => {
    expect(matches('ni3hao3', 'nǐ hǎo')).toBe(true)
    expect(matches('nǐ hǎo', 'nǐ hǎo')).toBe(true)
    expect(matches('nihao', 'nǐ hǎo')).toBe(false)
    expect(matches('nihao', 'nǐ hǎo', false)).toBe(true)
    expect(matches('xie4xie', 'xiè xie')).toBe(true)
    expect(matches('xie4xie5', 'xiè xie')).toBe(true)
    expect(matches('lv4se4', 'lǜ sè')).toBe(true)
    expect(matches('ni2hao3', 'nǐ hǎo')).toBe(false)
  })

  test('不 and 一 change tone in context', () => {
    const p = (l: string) =>
      tokens(l, { home: '挪威' })
        .filter((t) => !t.punct)
        .map((t) => t.pinyin.join(' '))
    expect(p('不客气 。')).toEqual(['bú kè qi'])
    expect(p('不 好')).toEqual(['bù', 'hǎo'])
    expect(p('不 是')).toEqual(['bú', 'shì'])
    expect(p('一 个')).toEqual(['yí', 'gè'])
    expect(p('一 杯')).toEqual(['yì', 'bēi'])
    expect(p('一点')).toEqual(['yì diǎn'])
    expect(p('第一')).toEqual(['dì yī'])
    expect(p('一路平安')).toEqual(['yí lù píng ān'])
  })
})

describe('numbers', () => {
  test('to and from hanzi', () => {
    for (const n of [
      0, 5, 10, 15, 20, 45, 100, 105, 110, 515, 1005, 2000, 2300, 23000, 99999,
    ])
      expect(value(toHanzi(n)), `${n} ${toHanzi(n)}`).toBe(n)
    expect(toHanzi(15)).toBe('十五')
    expect(toHanzi(105)).toBe('一百零五')
    expect(toHanzi(2000)).toBe('两千')
    expect(toHanzi(222)).toBe('两百二十二')
  })

  test('digits and their sound', () => {
    expect(numberGloss('八零六')).toBe('806')
    expect(numberGloss('五百一十五')).toBe('515')
    expect(numberPinyin('一一零')).toEqual(['yāo', 'yāo', 'líng'])
    expect(numberPinyin('一百一十五')).toEqual(['yì', 'bǎi', 'yī', 'shí', 'wǔ'])
    expect(numberPinyin('一万')).toEqual(['yí', 'wàn'])
    expect(numberPinyin('一千')).toEqual(['yì', 'qiān'])
  })
})

describe('bank', () => {
  const H = 3_600_000
  const D = 24 * H

  test('cramming builds memory slowly, spacing builds it fast', () => {
    let crammed = newCard(0)
    for (let i = 1; i <= 10; i++) crammed = answer(crammed, true, i * 60_000)
    let spaced = newCard(0)
    for (let i = 1; i <= 4; i++) spaced = answer(spaced, true, i * D)
    expect(crammed.s).toBeLessThan(0.5)
    expect(spaced.s).toBeGreaterThan(3)
    expect(level(spaced, 4 * D)).toBe(2)
    expect(level(crammed, H)).toBe(1)
  })

  test('a wrong answer brings a known word back to pinyin', () => {
    let c = newCard(0, 5)
    expect(level(c, H)).toBe(2)
    c = answer(c, false, H)
    expect(level(c, H)).toBe(1)
  })

  test('picking prefers faded words and adds new ones when short', () => {
    const bank = emptyBank()
    bank.cards['你好'] = newCard(0)
    bank.cards['谢谢'] = { ...newCard(0), s: 10 }
    const { words, fresh } = pick(
      bank,
      4,
      D,
      () => true,
      () => 0,
    )
    expect(words[0].id).toBe('你好')
    expect(fresh.length).toBe(2)
    expect(words.length).toBe(4)
  })

  test('merging keeps the card seen last and the best scores', () => {
    const a = emptyBank()
    const b = emptyBank()
    a.cards['你好'] = { ...newCard(0), s: 1 }
    b.cards['你好'] = { ...newCard(5), s: 2 }
    a.best.rain = 10
    b.best.rain = 4
    const m = merge(a, b)
    expect(m.cards['你好']?.s).toBe(2)
    expect(m.best.rain).toBe(10)
  })
})

describe('the other games', () => {
  test("the captain's orders and the stall's orders are known words", async () => {
    const { ORDERS, MISSIONS } = await import('../src/app/data/bridge')
    const { SHOP_ORDERS, MENU } = await import('../src/app/data/shop')
    for (const o of [...ORDERS, ...MISSIONS, ...SHOP_ORDERS])
      expect(() => tokens(o.zh, { home: '挪威' }), o.zh).not.toThrow()
    for (const m of MENU) {
      expect(
        WORDS.some((w) => w.id === m.id),
        m.id,
      ).toBe(true)
      expect(
        WORDS.some((w) => w.id === m.mw),
        m.mw,
      ).toBe(true)
    }
    expect(SHOP_ORDERS.length).toBe(48)
  })

  test('stories are made of known words, and questions have answers', async () => {
    const { STORIES } = await import('../src/app/data/stories')
    for (const st of STORIES) {
      for (const [zh] of st.lines)
        expect(() => tokens(zh, { home: '挪威' }), zh).not.toThrow()
      for (const q of st.questions) expect(q.options.length, q.q).toBe(4)
    }
  })

  test('the quest only names words in the bank', async () => {
    const { QUEST } = await import('../src/app/data/quest')
    const ids = new Set(WORDS.map((w) => w.id))
    for (const c of QUEST) {
      const text = [...c.intro, c.win].join(' ')
      for (const m of text.matchAll(/\{([^}=]+)(=[^}]*)?\}/g))
        expect(ids.has(m[1]), `${c.id}: ${m[1]}`).toBe(true)
      for (const id of c.teach) expect(ids.has(id), `${c.id}: ${id}`).toBe(true)
    }
  })

  test('sayings have a syllable and a gloss for every character', async () => {
    const { SAYINGS } = await import('../src/app/data/sayings')
    for (const s of SAYINGS) {
      const chars = [...s.zh].filter((c) => !/[，。？！、]/.test(c))
      expect(s.py.split(' ').length, s.id).toBe(chars.length)
      expect(s.gloss.split('|').length, s.id).toBe(chars.length)
      for (const p of s.py.split(' ')) expect(p, s.id).toMatch(PINYIN)
    }
  })

  test('character parts use known radicals or named parts', async () => {
    const { BUILT, RADICALS, PART_MEANING } =
      await import('../src/app/data/parts')
    for (const b of BUILT) {
      for (const p of b.parts)
        expect(
          !!RADICALS.find((r) => r.part === p) || !!PART_MEANING[p],
          `${b.c}: ${p}`,
        ).toBe(true)
      expect(b.p, b.c).toMatch(PINYIN)
    }
  })

  test('numbers by ear have answers that match their hanzi', async () => {
    const { NUMBER_ITEMS } = await import('../src/app/data/numbers')
    for (const n of NUMBER_ITEMS.filter((x) => x.kind === 'big'))
      expect(String(value(n.zh)), n.zh).toBe(n.answer)
    expect(NUMBER_ITEMS.find((x) => x.kind === 'phone')?.say).toMatch(
      /幺|[^一]/,
    )
  })
})

describe('pixel art', () => {
  test('sprites are rectangles of known colours', async () => {
    const { SPRITES, PALETTE } = await import('../src/app/pixel/sprites')
    for (const [name, sp] of Object.entries(SPRITES)) {
      if (!sp) continue
      const w = sp.rows[0].length
      sp.rows.forEach((row, i) => {
        expect(row.length, `${name} row ${i}`).toBe(w)
        for (const ch of row)
          if (ch !== '.')
            expect(!!(sp.pal?.[ch] ?? PALETTE[ch]), `${name}: ${ch}`).toBe(true)
      })
    }
  })

  test('every sprite named in the data exists, and every scene has a backdrop', async () => {
    const { SPRITES } = await import('../src/app/pixel/sprites')
    const { QUEST } = await import('../src/app/data/quest')
    const { MENU } = await import('../src/app/data/shop')
    const { PICTURES } = await import('../src/app/data/parts')
    const { MISSIONS } = await import('../src/app/data/bridge')
    const { hasScene } = await import('../src/app/pixel/scenes')
    const names = [
      ...QUEST.flatMap((c) => c.demon.sprite ?? []),
      ...MENU.map((m) => m.sprite),
      ...PICTURES.map((p) => p.sprite),
      ...MISSIONS.map((m) => m.sprite),
    ]
    for (const n of names) expect(SPRITES[n], n).toBeTruthy()
    for (const s of SCENES) expect(hasScene(s.id), s.id).toBe(true)
  })
})

describe('journey to the west', () => {
  test('every chapter has its battlefield, its demon and a stop on the map', async () => {
    const { existsSync } = await import('node:fs')
    const { QUEST } = await import('../src/app/data/quest')
    const { STOPS } = await import('../src/app/quest/map')
    const art = (name: string) => `public/art/quest/${name}.png`
    const ids = QUEST.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of QUEST) {
      expect(existsSync(art(c.id)), art(c.id)).toBe(true)
      expect(existsSync(art(c.demon.art)), art(c.demon.art)).toBe(true)
      expect(STOPS[c.id], c.id).toBeTruthy()
    }
    for (const name of [
      'wukong',
      'wukong-strike',
      'wukong-win',
      'monk-back',
      'pig-back',
      'sand-back',
      'spider-small',
      'bone-girl',
      'bone-granny',
      'bone-grandpa',
      'portrait',
      'map',
    ])
      expect(existsSync(art(name)), art(name)).toBe(true)
  })

  test('what the demons say is made of known words', async () => {
    const { QUEST, QUEST_SPEECH } = await import('../src/app/data/quest')
    for (const c of QUEST) {
      const line = c.demon.line
      expect(line, c.id).toBeTruthy()
      if (line)
        expect(() => tokens(line.zh, { home: '挪威' }), line.zh).not.toThrow()
    }
    expect(QUEST_SPEECH.length).toBe(QUEST.length)
  })

  test('twists, rewards and the words they keep to are known', async () => {
    const { FOOD, NUMBERS, QUEST, REWARDS, TWISTS } =
      await import('../src/app/data/quest')
    const ids = new Set(WORDS.map((w) => w.id))
    for (const c of QUEST) {
      expect(TWISTS[c.demon.twist], c.id).toBeTruthy()
      if (c.reward) expect(REWARDS[c.reward], c.id).toBeTruthy()
    }
    for (const id of [...FOOD, ...NUMBERS]) expect(ids.has(id), id).toBe(true)
  })

  test('icons and walkers are rectangles of known colours', async () => {
    const { ICONS, ICON_PAL } = await import('../src/app/quest/icons')
    const { WALKERS, WALK_PAL } = await import('../src/app/quest/walkers')
    const { SKILLS } = await import('../src/app/data/quest')
    const check = (
      name: string,
      rows: Array<string>,
      pal: Record<string, string>,
    ) =>
      rows.forEach((row, i) => {
        expect(row.length, `${name} row ${i}`).toBe(rows[0].length)
        for (const ch of row)
          if (ch !== '.') expect(!!pal[ch], `${name}: ${ch}`).toBe(true)
      })
    for (const [name, rows] of Object.entries(ICONS)) {
      expect(rows.length, name).toBe(16)
      expect(rows[0].length, name).toBe(16)
      check(name, rows, ICON_PAL)
    }
    for (const [name, frames] of Object.entries(WALKERS))
      frames.forEach((rows, i) => check(`${name} ${i}`, rows, WALK_PAL))
    for (const k of SKILLS) expect(ICONS[k.id], k.id).toBeTruthy()
    for (const m of ['cudgel', 'eyes', 'cloud', 'peach', 'gourd', 'pill'])
      expect(ICONS[m], m).toBeTruthy()
  })

  test('Wukong grows with the word bank, by less and less', async () => {
    const { heroOf, isOpen, powerAt, reached } =
      await import('../src/app/quest/hero')
    const { QUEST, SKILLS } = await import('../src/app/data/quest')
    const bank = emptyBank()
    expect(heroOf(bank).level).toBe(1)
    expect(heroOf(bank).power).toBe(1)
    for (const w of WORDS.slice(0, 25)) bank.cards[w.id] = newCard(0, 5)
    const h = heroOf(bank, 3_600_000)
    expect(h.level).toBe(3)
    expect(h.known).toBe(25)
    expect(h.hp).toBe(150)
    expect(h.skills.map((s) => s.id)).toEqual(
      SKILLS.filter((s) => s.known <= 25).map((s) => s.id),
    )
    expect(powerAt(100)).toBeLessThan(2.5)
    expect(powerAt(3) - powerAt(2)).toBeGreaterThan(powerAt(30) - powerAt(29))
    // the road opens a chapter at a time
    expect(isOpen(bank, 0)).toBe(true)
    expect(isOpen(bank, 1)).toBe(false)
    bank.scenes[QUEST[0].id] = 2
    expect(isOpen(bank, 1)).toBe(true)
    expect(reached(bank)).toBe(1)
    // a chapter added before ones already won stays open
    bank.scenes[QUEST[5].id] = 1
    expect(isOpen(bank, 3)).toBe(true)
    expect(heroOf(bank).hairs).toBe(QUEST[0].reward === 'hairs')
  })
})

describe('the shell', () => {
  test('the greetings are made of known words', async () => {
    const { greeting } = await import('../src/app/ornament/sky')
    for (let h = 0; h < 24; h++)
      expect(() => tokens(greeting(h), { home: '挪威' }), `${h}`).not.toThrow()
  })

  test('the scene shows one picture, or two crossfading, all day', async () => {
    const { periods, sunTimes } = await import('../src/app/ornament/sky')
    for (const day of [
      '2026-03-20',
      '2026-06-21',
      '2026-10-16',
      '2026-12-21',
    ]) {
      const { rise, set } = sunTimes(new Date(`${day}T12:00:00`))
      expect(rise, day).toBeGreaterThan(3 * 60)
      expect(set, day).toBeLessThan(23 * 60)
      expect(rise, day).toBeLessThan(set)
      for (let m = 0; m < 24 * 60; m += 10) {
        const d = new Date(`${day}T00:00:00`)
        d.setMinutes(m)
        const ws = periods(d)
        expect(ws.length, `${day} ${m}`).toBeLessThanOrEqual(2)
        const sum = ws.reduce((s, [, w]) => s + w, 0)
        expect(sum, `${day} ${m}`).toBeCloseTo(1, 6)
      }
      const noon = new Date(`${day}T13:30:00`)
      expect(periods(noon)[0][0], day).toBe('day')
      const midnight = new Date(`${day}T00:30:00`)
      expect(periods(midnight)[0][0], day).toBe('night')
    }
  })

  test('the moon is new at the eclipse of 8 April 2024 and full a fortnight on', async () => {
    const { moon } = await import('../src/app/ornament/sky')
    expect(moon(new Date('2024-04-08T18:21:00Z')).lit).toBeLessThan(0.02)
    expect(moon(new Date('2024-04-23T23:49:00Z')).lit).toBeGreaterThan(0.98)
  })

  test('the festivals fall on their days', async () => {
    const { festival } = await import('../src/app/ornament/sky')
    const on = (d: string) => festival(new Date(`${d}T12:00:00`))?.id ?? null
    expect(on('2027-02-05')).toBe('spring')
    expect(on('2027-02-06')).toBe('spring')
    expect(on('2027-02-20')).toBe('lantern')
    expect(on('2027-02-21')).toBe(null)
    expect(on('2026-09-25')).toBe('mid-autumn')
    expect(on('2026-10-16')).toBe(null)
  })

  test('the ornaments are well-formed paths', async () => {
    const shapes = await import('../src/app/ornament/shapes')
    for (const d of [
      shapes.ruyiCloud(),
      shapes.ruyiHead(),
      shapes.curlEnd(),
      shapes.paperCorner(),
      shapes.brushStroke(1),
      shapes.brushStroke(7),
    ]) {
      expect(d).toMatch(/^M/)
      expect(d).not.toMatch(/NaN|Infinity|undefined/)
    }
  })
})

describe('the learning games: art and feedback', () => {
  // A PNG's width and height, from its header
  const pngSize = async (path: string) => {
    const { readFileSync } = await import('node:fs')
    const b = readFileSync(path)
    return [b.readUInt32BE(16), b.readUInt32BE(20)]
  }
  const art = (f: string) => `public/art/games/${f}`

  test('the pictures are the sizes their scenes draw them at', async () => {
    const { existsSync } = await import('node:fs')
    const { W, H } = await import('../src/app/games/shopScene')
    expect(await pngSize(art('rain-town.png'))).toEqual([256, 256])
    expect(await pngSize(art('stall.png'))).toEqual([W, H])
    // eight customers, in cells of 77 × 90: four men, then four women
    expect(await pngSize(art('customers.png'))).toEqual([8 * 77, 90])
    expect(existsSync(art('ink-landscape.webp'))).toBe(true)
  })

  test('every voice that speaks is cast, in a Gemini voice or a designed one', async () => {
    const { speechItems } = await import('../src/app/lib/speech')
    const { VOICES, DESIGNED } = await import('../src/app/data/voices')
    const PREBUILT = new Set(
      'Zephyr Puck Charon Kore Fenrir Leda Orus Aoede Callirrhoe Autonoe Enceladus Iapetus Umbriel Algieba Despina Erinome Algenib Rasalgethi Laomedeia Achernar Alnilam Schedar Gacrux Pulcherrima Achird Zubenelgenubi Vindemiatrix Sadachbia Sadaltager Sulafat'.split(
        ' ',
      ),
    )
    for (const it of speechItems())
      expect(VOICES[it.voice], `${it.voice}: ${it.text}`).toBeTruthy()
    for (const [name, v] of Object.entries(VOICES)) {
      expect(PREBUILT.has(v.base) || v.base in DESIGNED, name).toBe(true)
      expect(v.style.length, name).toBeLessThan(80)
    }
  })

  test('everything the games can say has a recording', async () => {
    const { speechItems, speechKey } = await import('../src/app/lib/speech')
    const { readFileSync } = await import('node:fs')
    const files = JSON.parse(
      readFileSync('src/app/data/audio.json', 'utf8'),
    ) as Record<string, string>
    const missing = speechItems()
      .map((it) => speechKey(it.voice, it.text))
      .filter((k) => !files[k])
    expect(missing).toEqual([])
  })

  test('every order at the stall is in a customer voice', async () => {
    const { SHOP_ORDERS, CUSTOMER_VOICES } =
      await import('../src/app/data/shop')
    for (const o of SHOP_ORDERS)
      expect(CUSTOMER_VOICES.includes(o.voice), o.zh).toBe(true)
  })

  test("the games' own words of praise and blame are in the bank", () => {
    // 对 right, 不对 not right, 好 and 很好 on the seals, 加油 for a streak,
    // 学 on a saying's seal, 下雨 for the rain
    for (const l of ['对', '不 对', '好', '很 好', '加油', '学', '下雨'])
      expect(() => tokens(l, { home: '挪威' }), l).not.toThrow()
  })
})

describe('the market', () => {
  test('every line, ware and measure word is in the bank', async () => {
    const { ASK, STALLS, marketLines } = await import('../src/app/data/market')
    const lines = [
      ...marketLines().map((l) => l.zh),
      ...STALLS.flatMap((s) => s.wrong.map((mw) => ASK(s, mw))),
    ]
    for (const zh of lines)
      expect(() => tokens(zh, { home: '挪威' }), zh).not.toThrow()
    const ids = new Set(WORDS.map((w) => w.id))
    for (const s of STALLS)
      for (const id of [s.ware, s.mw, ...s.wrong])
        expect(ids.has(id), `${s.id}: ${id}`).toBe(true)
  })

  test('each stall has its keeper’s voice, a sprite and a picture', async () => {
    const { STALLS } = await import('../src/app/data/market')
    const { VOICES } = await import('../src/app/data/voices')
    const { SPRITES } = await import('../src/app/pixel/sprites')
    const { MARKET_ART } = await import('../src/app/pixel/art')
    const { existsSync } = await import('node:fs')
    for (const s of STALLS) {
      expect(VOICES[s.voice], s.voice).toBeTruthy()
      expect(SPRITES[s.sprite], s.sprite).toBeTruthy()
      expect(MARKET_ART[`market-${s.id}`]?.spots.keeper, s.id).toBeTruthy()
      expect(existsSync(`public/art/market/${s.id}.png`), s.id).toBe(true)
    }
  })

  test('prices come down from over a fair one to under it', async () => {
    const { HAGGLES, STALL } = await import('../src/app/data/market')
    for (const h of HAGGLES) {
      const fair = STALL[h.stall]!.fair
      expect(h.ladder[0], h.stall).toBeGreaterThan(fair)
      expect(h.ladder.at(-1), h.stall).toBeLessThan(fair)
      for (let i = 1; i < h.ladder.length; i++)
        expect(h.ladder[i], h.stall).toBeLessThan(h.ladder[i - 1])
    }
  })

  test('keepers answer as they should', async () => {
    const { HAGGLES, REPLY, STALL } = await import('../src/app/data/market')
    const { respond, startState } = await import('../src/app/lib/market')
    const h = HAGGLES.find((x) => x.stall === 'fan' && x.mood === 1)!
    const s = STALL.fan!
    const [first, second] = h.ladder
    const low = h.ladder.at(-1)!
    const st = startState(s)
    expect(respond(s, h, st, { k: 'buy' }).paid).toBe(first)
    const down = respond(s, h, st, { k: 'cheaper' })
    expect(down.state.i).toBe(1)
    expect(down.state.left).toBe(s.patience - 1)
    expect(down.zh).toContain(toHanzi(second))
    // an offer over what is asked is taken; one far too low is an insult
    expect(respond(s, h, st, { k: 'offer', n: first + 10 }).paid).toBe(
      first + 10,
    )
    expect(respond(s, h, st, { k: 'offer', n: 10 }).zh).toBe(REPLY.insult)
    // at the lowest, it is not dear, and they will go no lower
    const atLow = { ...st, i: h.ladder.length - 1 }
    expect(respond(s, h, atLow, { k: 'dear' }).zh).toBe(REPLY.notDear)
    expect(respond(s, h, atLow, { k: 'cheaper' }).zh).toBe(REPLY.noLower)
    expect(respond(s, h, atLow, { k: 'offer', n: low }).paid).toBe(low)
    // with no patience left, a push ends it
    const spent = { ...st, left: 0 }
    expect(respond(s, h, spent, { k: 'cheaper' }).gone).toBe('enough')
    // walking away: called back at the lowest price, or let go
    expect(respond(s, h, down.state, { k: 'leave' }, () => 0).state.i).toBe(
      h.ladder.length - 1,
    )
    expect(respond(s, h, st, { k: 'leave' }, () => 0.99).gone).toBe('bye')
  })

  test('whatever is done, every answer has a recording to come', async () => {
    const { HAGGLES, STALL, marketLines, offers } =
      await import('../src/app/data/market')
    const { respond, startState } = await import('../src/app/lib/market')
    const said = new Set(marketLines().map((l) => `${l.voice}|${l.zh}`))
    for (const h of HAGGLES) {
      const s = STALL[h.stall]!
      const moves = [
        { k: 'dear' as const },
        { k: 'cheaper' as const },
        { k: 'buy' as const },
        { k: 'leave' as const },
        ...offers(s).map((n) => ({ k: 'offer' as const, n })),
      ]
      // every state the haggling can reach, and every answer from each
      const seen = new Set<string>()
      const todo = [startState(s)]
      while (todo.length) {
        const st = todo.pop()!
        const key = JSON.stringify(st)
        if (seen.has(key)) continue
        seen.add(key)
        for (const m of moves)
          for (const r of [0, 0.99]) {
            const reply = respond(s, h, st, m, () => r)
            expect(said.has(`${s.voice}|${reply.zh}`), reply.zh).toBe(true)
            if (reply.paid === undefined && !reply.gone) todo.push(reply.state)
          }
      }
    }
  })
})

describe('starship', () => {
  test('everything said on the bridge is made of known words', async () => {
    const { CAPTAIN_LINES, ORDERS, VOYAGE } =
      await import('../src/app/data/bridge')
    const { encounterSpeech } = await import('../src/app/data/encounters')
    for (const l of [...ORDERS, ...VOYAGE, ...CAPTAIN_LINES])
      expect(() => tokens(l.zh, { home: '挪威' }), l.zh).not.toThrow()
    for (const l of encounterSpeech())
      expect(() => tokens(l.zh, { home: '挪威' }), l.zh).not.toThrow()
  })

  test('orders are well formed, and every planet ends with a stop', async () => {
    const { ACTIONS, ORDERS, POOLS, STEER, VOYAGE } =
      await import('../src/app/data/bridge')
    const ids = new Set(ACTIONS.map((a) => a.id))
    for (const o of ORDERS) {
      for (const a of o.do) expect(ids.has(a), o.zh).toBe(true)
      // Two steps steer first, then meet something where they steered to
      if (o.do.length > 1) {
        expect(o.do.length, o.zh).toBe(2)
        expect(STEER.includes(o.do[0]), o.zh).toBe(true)
        expect(STEER.includes(o.do[1]), o.zh).toBe(false)
      }
      // A "don't" order asks for nothing but waiting
      if (o.not) expect(o.do, o.zh).toEqual([])
      else expect(o.do.length, o.zh).toBeGreaterThan(0)
    }
    for (const [name, pool] of Object.entries(POOLS)) {
      expect(pool.length, name).toBeGreaterThan(2)
      for (const o of pool) {
        expect(ORDERS.includes(o), o.zh).toBe(true)
        expect(o.arrival, o.zh).toBeFalsy()
        // A fight's orders are the foe's, or anyone's
        if (o.foe) expect(o.foe, o.zh).toBe(name)
      }
    }
    for (const leg of VOYAGE) {
      expect(leg.arrive.arrival, leg.id).toBe(true)
      expect(leg.arrive.do, leg.id).toEqual(['stop'])
      expect(ORDERS.includes(leg.arrive), leg.id).toBe(true)
      expect(
        WORDS.some((w) => w.id === leg.name),
        leg.id,
      ).toBe(true)
    }
  })

  test('encounters: every branch is reached, ends, and leaves a log', async () => {
    const { ENCOUNTERS, SPEAKERS } = await import('../src/app/data/encounters')
    const ids = new Set<string>()
    for (const e of ENCOUNTERS) {
      expect(ids.has(e.id), e.id).toBe(false)
      ids.add(e.id)
      for (const w of e.words)
        expect(
          WORDS.some((x) => x.id === w),
          `${e.id}: ${w}`,
        ).toBe(true)
      for (const c of e.cast) {
        expect(SPEAKERS[c], `${e.id}: ${c}`).toBeTruthy()
        expect(SPEAKERS[c].alien, c).toBeTruthy()
      }
      const parts = e.parts
      expect(parts[e.start], e.id).toBeTruthy()
      // Where each part can go
      const next = (id: string) => {
        const p = parts[id]
        return [
          ...(p.next ? [p.next] : []),
          ...p.replies.flatMap((r) => (r.next ? [r.next] : [])),
          ...p.steps.flatMap((s) => (s.kind === 'if' ? [s.next] : [])),
        ]
      }
      const seen = new Set<string>()
      const walk = (id: string, path: Array<string>, logged: boolean) => {
        const p = parts[id]
        expect(p, `${e.id}: no part ${id}`).toBeTruthy()
        // No going round in circles
        expect(path.includes(id), `${e.id}: ${[...path, id].join(' > ')}`).toBe(
          false,
        )
        seen.add(id)
        const log = logged || !!p.log
        for (const s of p.steps) {
          if (s.kind === 'line')
            expect(
              s.by === 'Captain' ||
                s.by === 'Engineer' ||
                e.cast.includes(s.by),
              `${e.id}: ${s.by}`,
            ).toBe(true)
          if (s.kind === 'do' && s.effect.kind === 'fight')
            expect(e.foe, `${e.id} fights no foe`).toBeTruthy()
        }
        const to = next(id)
        // A part that ends the encounter has said what happened
        if (
          !to.length ||
          (p.replies.length > 0 &&
            p.replies.every((r) => !r.next && r.right === false))
        )
          expect(log, `${e.id}: ${[...path, id].join(' > ')} has no log`).toBe(
            true,
          )
        for (const n of to) walk(n, [...path, id], log)
      }
      walk(e.start, [], false)
      expect([...seen].sort(), e.id).toEqual(Object.keys(parts).sort())
      for (const p of Object.values(parts)) {
        // Something to choose, and one right answer where there is any
        if (p.replies.length) {
          expect(p.replies.length, `${e.id}/${p.id}`).toBeGreaterThan(1)
          const right = p.replies.filter((r) => r.right === true)
          const wrong = p.replies.filter((r) => r.right === false)
          if (wrong.length) expect(right.length, `${e.id}/${p.id}`).toBe(1)
          // A wrong reply that is asked again has someone to be puzzled
          if (wrong.some((r) => !r.next))
            expect(
              p.steps.some((s) => s.kind === 'line'),
              `${e.id}/${p.id}`,
            ).toBe(true)
        }
        expect(p.replies.length && p.next, `${e.id}/${p.id}`).toBeFalsy()
      }
    }
    // Something for the last leg, and enough for the others
    expect(ENCOUNTERS.filter((e) => e.last).length).toBeGreaterThan(0)
    expect(ENCOUNTERS.filter((e) => !e.last && !e.from).length).toBeGreaterThan(
      1,
    )
  })

  test('an encounter for each leg, never twice in a voyage', async () => {
    const { pickEncounter, HULL } =
      await import('../src/app/games/bridge/flight')
    const { VOYAGE } = await import('../src/app/data/bridge')
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let round = 0; round < 50; round++) {
      const met = new Set<string>()
      for (let i = 0; i < VOYAGE.length; i++) {
        const last = i === VOYAGE.length - 1
        const hull = round % 2 ? HULL : 60
        const e = pickEncounter(i, last, hull, met, random)
        expect(e, `leg ${i}`).toBeTruthy()
        if (!e) continue
        expect(met.has(e.id)).toBe(false)
        met.add(e.id)
        expect(!!e.last).toBe(last)
        expect(e.from ?? 0).toBeLessThanOrEqual(i)
        if (e.damaged) expect(hull).toBeLessThan(HULL)
      }
    }
  })

  test('every alien has its picture for the viewscreen', async () => {
    const { SPEAKERS } = await import('../src/app/data/encounters')
    const { existsSync } = await import('node:fs')
    for (const s of Object.values(SPEAKERS)) {
      // People are drawn from a look, aliens from a picture
      expect(!!s.look !== !!s.alien, s.name).toBe(true)
      if (s.alien)
        expect(existsSync(`public/art/aliens/${s.alien}.webp`), s.alien).toBe(
          true,
        )
    }
  })

  test('points for quick answers, and less time as orders go on', async () => {
    const { gain, span } = await import('../src/app/games/bridge/flight')
    const { ORDERS } = await import('../src/app/data/bridge')
    const one = ORDERS.find((o) => o.do.length === 1 && !o.not)
    const two = ORDERS.find((o) => o.do.length === 2)
    const not = ORDERS.find((o) => o.not)
    if (!one || !two || !not) throw new Error('missing kinds of order')
    expect(gain(one, true, 1, false)).toBe(20)
    expect(gain(one, true, 0, true)).toBe(20)
    expect(gain(one, false, 1, true)).toBe(0)
    expect(gain(not, true, 0, false)).toBe(15)
    expect(span(one, 0)).toBe(6)
    expect(span(one, 100)).toBe(2.6)
    expect(span(two, 0)).toBeCloseTo(8.4)
  })

  // A scene that draws nothing
  const stage = {
    setOff: () => {},
    warp: () => 1,
    course: () => {},
    order: () => {},
    progress: () => {},
    act: () => {},
    resolve: () => 1,
    arrive: () => {},
    setHull: () => {},
    wreck: () => {},
    meet: () => 1,
    cue: () => 0.5,
    part: () => {},
    save: () => {},
    music: () => 1,
  }

  test('a flight: right orders score, wrong ones cost the hull and end it', async () => {
    const { Flight } = await import('../src/app/games/bridge/flight')
    type Hud = InstanceType<typeof Flight>['hud']
    const seen: { hud: Hud | null; over: Hud | null } = {
      hud: null,
      over: null,
    }
    const settled: Array<{ ok: boolean; gain: number }> = []
    const flight = new Flight(stage, {
      officer: false,
      speak: () => Promise.resolve(),
      onHud: (h) => (seen.hud = h),
      onSettled: (s) => settled.push(s),
      onOver: (h) => (seen.over = h),
      random: () => 0,
    })
    void flight.run()
    const flush = () => new Promise((r) => setTimeout(r, 0))
    // Runs the clock until an order or a choice is waiting, or the game is
    // over
    const next = async (): Promise<Hud | null> => {
      for (let i = 0; i < 600; i++) {
        flight.update(0.05)
        await flush()
        if (seen.over) return null
        const h = seen.hud
        if (h?.phase === 'order' && !h.done.length) return h
        if (h?.phase === 'choose' && h.picked === null) return h
      }
      throw new Error('stuck')
    }

    const first = await next()
    for (const a of first?.order?.do ?? []) flight.act(a)
    await flush()
    expect(settled[0].ok).toBe(true)
    expect(settled[0].gain).toBeGreaterThan(10)

    let choices = 0
    for (let h = await next(); h; h = await next()) {
      if (h.phase === 'choose') {
        choices++
        flight.choose(0)
        continue
      }
      // The first leg gives single orders only, outside an encounter
      if (h.leg.id === 'moon' && !h.encounter)
        expect(h.order?.do.length).toBe(1)
      flight.act(h.order?.do[0] === 'left' ? 'right' : 'left')
      await flush()
    }
    expect(choices).toBeGreaterThan(0)
    expect(settled.filter((s) => !s.ok).length).toBeGreaterThanOrEqual(5)
    expect(seen.over?.hull).toBeLessThanOrEqual(0)
    expect(seen.over?.home).toBe(false)
    expect(seen.over?.score).toBeGreaterThanOrEqual(settled[0].gain)
    flight.stop()
  })

  test('a voyage flown well comes home, with a log of what happened', async () => {
    const { Flight } = await import('../src/app/games/bridge/flight')
    const { VOYAGE } = await import('../src/app/data/bridge')
    type Hud = InstanceType<typeof Flight>['hud']
    const seen: { hud: Hud | null; over: Hud | null } = {
      hud: null,
      over: null,
    }
    let seed = 3
    const flight = new Flight(stage, {
      officer: false,
      speak: () => Promise.resolve(),
      onHud: (h) => (seen.hud = h),
      onSettled: () => {},
      onOver: (h) => (seen.over = h),
      random: () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      },
    })
    void flight.run()
    const flush = () => new Promise((r) => setTimeout(r, 0))
    for (let i = 0; i < 20000 && !seen.over; i++) {
      flight.update(0.05)
      await flush()
      const h = seen.hud
      if (!h) continue
      if (h.phase === 'order' && h.order && h.done.length === 0)
        for (const a of h.order.do) flight.act(a)
      if (h.phase === 'choose' && h.picked === null) {
        // The right reply where there is one, else the first
        const k = h.replies.findIndex((r) => r.right === true)
        flight.choose(Math.max(0, k))
      }
    }
    const end = seen.over
    expect(end?.home).toBe(true)
    expect(end?.reached).toBe(VOYAGE.length)
    expect(end?.log.length).toBe(VOYAGE.length)
    for (const l of end?.log ?? []) expect(l.text, l.title).not.toBe('')
    flight.stop()
  })
})

describe('the trip as scenes', () => {
  test('every scene has its picture, and a place for each of the cast and the player', async () => {
    const { existsSync } = await import('node:fs')
    const { TRIP_ART } = await import('../src/app/pixel/art')
    for (const s of SCENES) {
      const art = TRIP_ART[s.id]
      expect(art, s.id).toBeTruthy()
      expect(existsSync(`public${art?.src}`), `${s.id}: ${art?.src}`).toBe(true)
      for (const key of [...Object.keys(s.cast), 'you']) {
        const spot = art?.spots[key]
        expect(spot, `${s.id}: ${key}`).toBeTruthy()
        expect(spot!.x, `${s.id}: ${key}`).toBeGreaterThanOrEqual(0)
        expect(spot!.x, `${s.id}: ${key}`).toBeLessThanOrEqual(art!.w)
      }
    }
  })

  test('every look of the cast can be drawn head to toe, in every pose', async () => {
    const { drawFigure } = await import('../src/app/pixel/figure')
    const { PLAYER_LOOK } = await import('../src/app/data/trip')
    const looks = [
      PLAYER_LOOK,
      ...SCENES.flatMap((s) => Object.values(s.cast).map((c) => c.look)),
    ]
    const poses = [
      {},
      { breath: 1, blink: true },
      { mouth: 1, arm: 'chest' as const },
      { mouth: 2, arm: 'out' as const },
      { arm: 'up' as const, flutter: 1 },
      { walk: 1 },
    ]
    const light = { tint: '#ffd0a0', tintAmount: 0.2, rim: '#ffffff' }
    for (const look of looks)
      for (const pose of poses) {
        const f = drawFigure(look, pose, { ...light, rimAmount: 0.5 })
        expect(f.data.length).toBe(f.w * f.h * 4)
        let seen = 0
        for (let i = 3; i < f.data.length; i += 4) if (f.data[i]) seen++
        expect(seen, JSON.stringify(look)).toBeGreaterThan(300)
      }
  })

  test('every city is on the map', async () => {
    const { CITY_AT, MAP_H, MAP_W } = await import('../src/app/data/map')
    for (const c of CITIES) {
      const at = CITY_AT[c.id]
      expect(at, c.id).toBeTruthy()
      expect(at![0]).toBeGreaterThan(0)
      expect(at![0]).toBeLessThan(MAP_W)
      expect(at![1]).toBeGreaterThan(0)
      expect(at![1]).toBeLessThan(MAP_H)
    }
  })
})

describe('the pinyin chart', () => {
  test('every syllable of the words is in the table, as an initial and a final', async () => {
    const { SYLLABLES } = await import('../src/app/data/syllables')
    const { parts, TABLE_INITIALS, TABLE_FINALS } =
      await import('../src/app/data/pinyin')
    const { bare } = await import('../src/app/lib/pinyin')
    for (const w of WORDS)
      for (const s of syllables(w.p)) {
        let b = bare(s.toLowerCase())
        // erhua: 哪儿 nǎr is na with an r
        if (b.endsWith('r') && b !== 'er' && !SYLLABLES[b]) b = b.slice(0, -1)
        // me (么) is only ever said in the neutral tone, so has no place
        // among the four
        if (b === 'me' && toneOf(s) === 5) continue
        expect(SYLLABLES[b], `${w.h} ${s}`).toBeTruthy()
      }
    for (const s of Object.keys(SYLLABLES)) {
      if (s === 'yo') continue
      const p = parts(s)
      expect(TABLE_INITIALS.includes(p.initial), s).toBe(true)
      expect(TABLE_FINALS.includes(p.final), s).toBe(true)
    }
    expect(parts('ju')).toEqual({ initial: 'j', final: 'ü' })
    expect(parts('zhi')).toEqual({ initial: 'zh', final: '-i' })
    expect(parts('wei')).toEqual({ initial: '', final: 'ui' })
  })

  test('every sound can be heard, and every contrast trained', async () => {
    const { INITIALS, FINALS, WHOLE, CONTRASTS, frames, nameOf, pinyinSpeech } =
      await import('../src/app/data/pinyin')
    const { mark } = await import('../src/app/lib/pinyin')
    const said = new Set(pinyinSpeech().map((s) => s.text))
    for (const g of INITIALS)
      for (const s of g.sounds) {
        expect(s.tip.length, s.id).toBeGreaterThan(5)
        expect(said.has(nameOf(s)), s.id).toBe(true)
      }
    for (const g of [...FINALS, WHOLE])
      for (const s of g.sounds)
        for (const t of [1, 2, 3, 4])
          expect(said.has(mark(s.say, t)), `${s.id} ${t}`).toBe(true)
    expect(nameOf(INITIALS[4].sounds[3])).toBe('rì')
    for (const c of CONTRASTS) {
      const f = frames(c)
      expect(f.length, c.id).toBeGreaterThanOrEqual(8)
      for (const q of f) {
        expect(q.length, c.id).toBeGreaterThanOrEqual(2)
        for (const s of q) expect(said.has(s), `${c.id} ${s}`).toBe(true)
      }
    }
  })

  test('sounds told apart merge as tones do, the count with more tries', () => {
    const a = emptyBank()
    const b = emptyBank()
    a.sounds['zh-z-j'] = [3, 5]
    b.sounds['zh-z-j'] = [6, 9]
    b.sounds['an-ang'] = [1, 1]
    const m = merge(a, b)
    expect(m.sounds).toEqual({ 'zh-z-j': [6, 9], 'an-ang': [1, 1] })
    expect(merge({ cards: {} }, emptyBank()).sounds).toEqual({})
  })
})

describe('the daily habit: Today, seals, the garden, mahjong', () => {
  const H = 3_600_000
  const D = 24 * H
  // Noon on a day, on the local clock, so day keys are as expected
  const NOON = new Date(2026, 9, 16, 12).getTime()

  // Words known for a while, and words met an hour ago
  const bankWith = (known: Array<string>, met: Array<string> = []) => {
    const b = emptyBank()
    for (const id of known) b.cards[id] = { ...newCard(NOON - 2 * D, 5), n: 3 }
    for (const id of met) b.cards[id] = newCard(NOON - H)
    return b
  }

  test('banks saved before seals, sessions and the garden still merge', () => {
    const old = { cards: { 你好: newCard(0) }, days: { '2026-10-15': 3 } }
    const m = merge(old, emptyBank())
    expect(m.seals).toEqual({})
    expect(m.path).toBeNull()
    expect(m.daily).toEqual({})
    expect(m.garden).toEqual({})
    expect(m.days['2026-10-15']).toBe(3)
    expect(m.cards['你好']).toBeTruthy()
    expect(() => merge({}, {})).not.toThrow()
  })

  test('merging keeps each seal at its earlier date, the most grown garden and the session further on', async () => {
    const { plan, markDone } = await import('../src/app/lib/today')
    const a = emptyBank()
    const b = emptyBank()
    a.seals.first = 100
    b.seals.first = 50
    b.seals.known10 = 70
    a.garden['1'] = 2
    b.garden['1'] = 1
    b.garden['2'] = 1
    a.daily['2026-10-15'] = 1
    const p = plan(bankWith(['你好', '谢谢']), NOON)
    a.path = p
    b.path = markDone(p, 0, NOON + H)
    const m = merge(a, b)
    expect(m.seals).toEqual({ first: 50, known10: 70 })
    expect(m.garden).toEqual({ '1': 2, '2': 1 })
    expect(m.daily['2026-10-15']).toBe(1)
    expect(m.path?.steps[0].done).toBe(NOON + H)
    // a later day's session wins over one further on
    expect(merge(b, { ...a, path: { ...p, d: '2026-10-17' } }).path?.d).toBe(
      '2026-10-17',
    )
  })

  test('every seal has a check, a character and its pinyin', async () => {
    const { SEALS } = await import('../src/app/data/seals')
    const { checked } = await import('../src/app/lib/achievements')
    expect(checked()).toBe(true)
    expect(new Set(SEALS.map((s) => s.id)).size).toBe(SEALS.length)
    for (const s of SEALS) {
      expect([...s.zh].length, s.id).toBeLessThanOrEqual(2)
      expect(s.py, s.id).toMatch(PINYIN)
    }
  })

  test('seals are awarded from the bank, once', async () => {
    const { award } = await import('../src/app/lib/achievements')
    expect(award(emptyBank(), NOON).seals).toEqual([])
    const b = bankWith(WORDS.slice(0, 12).map((w) => w.id))
    const got = award(b, NOON).seals
    expect(got).toContain('first')
    expect(got).toContain('known10')
    expect(got).not.toContain('known100')
    for (const id of got) b.seals[id] = NOON
    expect(award(b, NOON).seals).toEqual([])
  })

  test('streak seals follow the days with points', async () => {
    const { award } = await import('../src/app/lib/achievements')
    const { dayKey } = await import('../src/app/lib/bank')
    const b = emptyBank()
    for (let i = 0; i < 7; i++) b.days[dayKey(NOON - i * D)] = 10
    const got = award(b, NOON).seals
    expect(got).toContain('streak3')
    expect(got).toContain('streak7')
    expect(got).not.toContain('streak10')
  })

  test('the garden grows with the lessons, and never shrinks', async () => {
    const { growth, newGrowth } = await import('../src/app/lib/garden')
    const { award } = await import('../src/app/lib/achievements')
    const lesson1 = WORDS.filter((w) => w.lesson === 1).map((w) => w.id)
    const b = bankWith(lesson1)
    expect(newGrowth(b, NOON)['1']).toBe(2)
    const got = award(b, NOON)
    expect(got.garden['1']).toBe(2)
    expect(got.seals).toContain('plum')
    // kept in the bank, it stays when the words fade
    b.garden['1'] = 2
    const later = NOON + 400 * D
    expect(growth(b, later)[0].now).toBeLessThan(2)
    expect(growth(b, later)[0].stage).toBe(2)
    // words only just met start a thing growing
    const lesson2 = WORDS.filter((w) => w.lesson === 2).map((w) => w.id)
    expect(newGrowth(bankWith([], lesson2), NOON)['2']).toBe(1)
  })

  test('every lesson grows something, and the garden’s words are in the bank', async () => {
    const { GARDEN_ITEMS, itemOf, SEASON_LINES, NIGHT_LINE } =
      await import('../src/app/data/garden')
    const { LESSONS } = await import('../src/app/data/words')
    for (const l of LESSONS.slice(0, GARDEN_ITEMS.length))
      expect(itemOf(l.n), `lesson ${l.n}`).toBeTruthy()
    for (const g of GARDEN_ITEMS) {
      if (g.word)
        expect(
          WORDS.some((w) => w.id === g.word),
          g.word,
        ).toBe(true)
      expect(g.py, g.id).toMatch(PINYIN)
    }
    for (const line of [
      ...Object.values(SEASON_LINES),
      NIGHT_LINE,
      { zh: '明天 见 ！' },
    ])
      expect(() => tokens(line.zh, { home: '挪威' }), line.zh).not.toThrow()
  })

  // Someone who knows the basics, with First steps hidden
  const noCourse = () => {
    const b = emptyBank()
    b.scenes['start-hidden'] = NOON - D
    return b
  }

  test('Today plans the fading words, new ones, the trip or a game, and listening', async () => {
    const { plan, settle, summary, current, finished, markDone } =
      await import('../src/app/lib/today')
    // a first visit: no words yet, so nothing to review
    const first = plan(noCourse(), NOON)
    expect(first.steps.map((s) => s.k)).toEqual(['new', 'trip', 'listen'])
    expect(first.steps[0].ids?.length).toBe(5)
    // words left to fade for weeks are reviewed first
    const b = noCourse()
    for (const w of WORDS.slice(0, 30))
      b.cards[w.id] = newCard(NOON - 20 * D, 0.5)
    const p = plan(b, NOON)
    expect(p.steps[0].k).toBe('review')
    expect(p.steps[0].ids?.length).toBe(8)
    expect(p.steps[0].arg).toBeUndefined()
    expect(p.s0[p.steps[0].ids?.[0] ?? '']).toBe(0.5)
    expect(current(p)).toBe(0)
    // the trip, played on its own page, is found done there
    const i = p.steps.findIndex((s) => s.k === 'trip')
    expect(i).toBeGreaterThan(0)
    const opened = {
      ...p,
      steps: p.steps.map((s, j) => (j === i ? { ...s, pts: 0 } : s)),
    }
    expect(settle(opened, b, NOON)).toBe(opened)
    b.scenes[p.steps[i].arg ?? ''] = 2
    expect(settle(opened, b, NOON).steps[i].done).toBe(NOON)
    let done = opened
    for (let j = 0; j < done.steps.length; j++) done = markDone(done, j, NOON)
    expect(finished(done)).toBe(true)
    expect(current(done)).toBe(-1)
    const s = summary(done, b, NOON)
    expect(s.words.length).toBeGreaterThan(0)
    expect(s.tomorrow).toBeGreaterThan(0)
  })

  test('Today keeps each answer, so a step can be left and taken up again', async () => {
    const { plan, gain, progressOf, share, allAnswered, partKey, markDone } =
      await import('../src/app/lib/today')
    const b = noCourse()
    for (const w of WORDS.slice(0, 30))
      b.cards[w.id] = newCard(NOON - 20 * D, 0.5)
    const p = plan(b, NOON)
    const ids = p.steps[0].ids ?? []
    expect(p.steps[0].k).toBe('review')
    // three words answered, then left
    let q = p
    for (const id of ids.slice(0, 3)) q = gain(q, 0, id)
    expect(gain(q, 0, ids[0])).toBe(q)
    expect(p.steps[0].got).toBeUndefined()
    expect(progressOf(q.steps[0])).toEqual({ done: 3, of: ids.length })
    expect(share(q.steps[0])).toBeCloseTo(3 / ids.length)
    expect(allAnswered(q.steps[0])).toBe(false)
    // a session further on wins a merge, even partway through a step
    expect(merge({ path: p }, { path: q }).path).toBe(q)
    expect(merge({ path: q }, { path: p }).path).toBe(q)
    for (const id of ids.slice(3)) q = gain(q, 0, id)
    expect(allAnswered(q.steps[0])).toBe(true)
    // new words: each met, then asked its meaning and by ear
    const i = q.steps.findIndex((s) => s.k === 'new')
    const fresh = q.steps[i].ids ?? []
    expect(fresh.length).toBeGreaterThan(0)
    q = gain(q, i, partKey(fresh[0], 'met'))
    q = gain(q, i, partKey(fresh[0], 'meaning'))
    expect(progressOf(q.steps[i])).toEqual({ done: 2, of: fresh.length * 3 })
    // listening: lines or words heard, four in all
    const last = q.steps.length - 1
    q = gain(q, last, '你好')
    expect(progressOf(q.steps[last])).toEqual({ done: 1, of: 4 })
    expect(share(markDone(q, last, NOON).steps[last])).toBe(1)
  })

  test('for a beginner, Today is the day of First steps', async () => {
    const { STEP, plan, settle, summary, finished, markDone } =
      await import('../src/app/lib/today')
    const { PARTS } = await import('../src/app/data/course')
    const { hideKey, partKey, wordsOf } = await import('../src/app/lib/course')
    const ks = (p: { steps: Array<{ k: string; arg?: string }> }) =>
      p.steps.map((s) => (s.k === 'course' ? `course ${s.arg}` : s.k))
    expect(STEP.course.glyph).toBe('入')
    // new: the parts of day 1 stand in for new words, the trip and
    // listening
    const b = emptyBank()
    const p = plan(b, NOON)
    expect(ks(p)).toEqual(['course 1a', 'course 1b', 'course 1c'])
    // a part done on the course's page counts, wherever it was opened from
    expect(settle(p, b, NOON)).toBe(p)
    b.scenes[partKey('1a')] = NOON + H
    expect(settle(p, b, NOON + H).steps[0].done).toBe(NOON + H)
    // the words it met are in the summary, as new
    const met = PARTS.filter((x) => x.id.startsWith('1')).flatMap(wordsOf)
    expect(met.length).toBeGreaterThan(0)
    for (const id of met) b.cards[id] = newCard(NOON + H)
    const words = summary(p, b, NOON + H).words
    expect(words.map((w) => w.id).sort()).toEqual([...met].sort())
    expect(words.every((w) => w.before === null)).toBe(true)
    // day 1 done: a session made later that day is the usual one
    b.scenes[partKey('1b')] = NOON + H
    b.scenes[partKey('1c')] = NOON + H
    expect(ks(plan(b, NOON + 2 * H))).not.toContain('course 2a')
    // the next day: the words met reviewed, then day 2
    const next = plan(b, NOON + D)
    expect(ks(next)).toEqual(['review', 'course 2a', 'course 2b', 'course 2c'])
    // a day left halfway goes on where it was
    b.scenes[partKey('2a')] = NOON + D
    expect(ks(plan(b, NOON + 2 * D)).slice(1)).toEqual([
      'course 2b',
      'course 2c',
    ])
    // hidden partway through a session: its parts left are skipped
    let q = markDone(next, 0, NOON + D)
    b.scenes[hideKey(true)] = NOON + D + H
    q = settle(q, b, NOON + D + H)
    expect(q.steps[1].skip).toBeUndefined()
    expect(q.steps[2].skip).toBe(true)
    expect(finished(q)).toBe(true)
  })

  test('the way back to Today is for the part open, not one done before', async () => {
    const { dockStep, markDone, plan } = await import('../src/app/lib/today')
    const b = emptyBank()
    for (const id of ['1a', '1b', '1c', '2a', '2b', '2c', '3a', '3b', '3c'])
      b.scenes[`start:${id}`] = NOON - D
    let p = plan(b, NOON)
    const at = (id: string) =>
      p.steps.findIndex((s) => s.k === 'course' && s.arg === id)
    expect([at('4a'), at('4b'), at('4c')].every((i) => i >= 0)).toBe(true)
    // 4a and 4b opened from Today and done; 4c opened from 4b's end
    for (const id of ['4a', '4b']) {
      p = {
        ...p,
        steps: p.steps.map((s, i) => (i === at(id) ? { ...s, pts: 0 } : s)),
      }
      p = markDone(p, at(id), NOON + H)
    }
    expect(dockStep(p, 'start', '4c', NOON + H)).toBe(at('4c'))
    // the course's overview, and the end of 4b, are still 4b's
    expect(dockStep(p, 'start', null, NOON + H)).toBe(at('4b'))
    expect(dockStep(p, 'start', '4b', NOON + H)).toBe(at('4b'))
    // a part that is not today's has no way back
    expect(dockStep(p, 'start', '5a', NOON + H)).toBe(-1)
    expect(dockStep(p, 'trip', null, NOON + H)).toBe(-1)
  })

  test('Today takes turns between the trip and the games', async () => {
    const { plan } = await import('../src/app/lib/today')
    const b = emptyBank()
    for (const w of WORDS.slice(0, 60)) b.cards[w.id] = newCard(NOON - D, 3)
    const played = Array.from({ length: 6 }, (_, k) =>
      plan(b, NOON + k * D, ['mahjong', 'rain']).steps.find(
        (s) => s.k === 'trip' || s.k === 'game',
      ),
    )
    expect(played.filter((s) => s?.k === 'game').length).toBe(2)
    expect(played.filter((s) => s?.k === 'trip').length).toBe(4)
  })

  test('mahjong deals can always be cleared', async () => {
    const { LAYOUTS, deal, solvable, isFree } =
      await import('../src/app/lib/mahjong')
    let seed = 7
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    for (const [id, l] of Object.entries(LAYOUTS)) {
      expect(l.slots.length, id).toBe(l.pairs * 2)
      const at = new Set(l.slots.map((s) => `${s.x},${s.y},${s.z}`))
      expect(at.size, id).toBe(l.slots.length)
      for (let k = 0; k < 6; k++) {
        const pairs = Array.from({ length: l.pairs }, (_, i) => i)
        const dealt = deal(l.slots, pairs, random)
        expect(dealt, id).not.toBeNull()
        if (!dealt) continue
        for (const p of pairs)
          expect(dealt.filter((x) => x === p).length, id).toBe(2)
        expect(
          solvable(
            l.slots,
            l.slots.map(() => true),
            dealt,
          ),
          id,
        ).toBe(true)
      }
    }
    // the top of a pile is free; a tile with both sides closed is not
    const small = LAYOUTS.small.slots
    const all = small.map(() => true)
    expect(
      isFree(
        small.findIndex((s) => s.z === 1),
        small,
        all,
      ),
    ).toBe(true)
    const middle = small.findIndex((s) => s.z === 0 && s.x === 4 && s.y === 0)
    expect(isFree(middle, small, all)).toBe(false)
  })
})

describe('sprite frames and portraits', () => {
  test('sprites are square, 16 or 24, and every frame matches the first', async () => {
    const { SPRITES, PALETTE } = await import('../src/app/pixel/sprites')
    for (const [name, sp] of Object.entries(SPRITES)) {
      if (!sp) continue
      const w = sp.rows[0].length
      expect([16, 24], name).toContain(w)
      expect(sp.rows.length, name).toBe(w)
      const frames = sp.frames ?? []
      frames.forEach((rows, f) => {
        expect(rows.length, `${name} frame ${f + 1}`).toBe(w)
        rows.forEach((row, i) => {
          expect(row.length, `${name} frame ${f + 1} row ${i}`).toBe(w)
          for (const ch of row)
            if (ch !== '.')
              expect(!!(sp.pal?.[ch] ?? PALETTE[ch]), `${name}: ${ch}`).toBe(
                true,
              )
        })
      })
      if (frames.length) expect(sp.ms, name).toBeGreaterThan(0)
      for (const i of sp.seq ?? [])
        expect(i <= frames.length, `${name}: step ${i}`).toBe(true)
    }
  })

  test('the gallery lists every sprite once', async () => {
    const { SPRITES, SPRITE_GROUPS } = await import('../src/app/pixel/sprites')
    const listed = SPRITE_GROUPS.flatMap((g) => g.names)
    expect(new Set(listed).size).toBe(listed.length)
    expect([...listed].sort()).toEqual(Object.keys(SPRITES).sort())
  })

  test('portraits are drawn whole, in known colours, for every look', async () => {
    const { PARTS, FIGURES, portrait, PORTRAIT_W, PORTRAIT_H } =
      await import('../src/app/pixel/portraits')
    type Look = Parameters<typeof portrait>[0]
    const { PLAYER_LOOK } = await import('../src/app/data/trip')
    const { CUSTOMERS } = await import('../src/app/data/shop')
    const grids = [
      PARTS.HEAD,
      ...Object.values(PARTS.FACE),
      ...Object.values(PARTS.HAIR).flatMap((h) => [h.front, h.behind ?? []]),
      ...Object.values(PARTS.HATS),
      ...Object.values(PARTS.CLOTHES),
      ...PARTS.TALK,
      PARTS.CHILD,
      PARTS.AGED,
      PARTS.SHUT,
      PARTS.GLASSES,
      PARTS.BEARD,
      PARTS.LONG_BEARD,
    ]
    for (const g of grids)
      for (const row of g) expect(row.length, row).toBe(PORTRAIT_W)
    const looks: Array<Look> = [
      PLAYER_LOOK,
      ...CUSTOMERS,
      ...SCENES.flatMap((s) => Object.values(s.cast).map((c) => c.look)),
      ...Object.values(FIGURES),
    ]
    // every style, hat, garment and face at least once, in combinations
    const styles = Object.keys(PARTS.HAIR).concat(['cap', 'chef', 'kufi'])
    const hats = Object.keys(PARTS.HATS)
    const clothes = Object.keys(PARTS.CLOTHES)
    const faces = Object.keys(PARTS.FACE)
    const n = Math.max(styles.length, hats.length, clothes.length)
    for (let i = 0; i < n; i++)
      looks.push({
        style: styles[i % styles.length] as Look['style'],
        coat: '#3d6fa8',
        headwear: hats[i % hats.length] as Look['headwear'],
        clothes: clothes[i % clothes.length] as Look['clothes'],
        expression: faces[i % faces.length] as Look['expression'],
        age: (['adult', 'child', 'old'] as const)[i % 3],
        beard: i % 4 === 0 ? true : i % 7 === 0 ? 'long' : false,
        moustache: i % 4 === 1,
        glasses: i % 3 === 0,
        blush: i % 2 === 0,
        earrings: i % 5 === 0 ? '#e8b84a' : undefined,
      })
    for (const look of looks) {
      const p = portrait(look)
      for (const rows of [p.rows, p.blink, ...p.talk]) {
        expect(rows.length).toBe(PORTRAIT_H)
        for (const row of rows) {
          expect(row.length).toBe(PORTRAIT_W)
          for (const ch of row)
            if (ch !== '.')
              expect(p.pal[ch], `${JSON.stringify(look)}: ${ch}`).toMatch(
                /^#[0-9a-f]{6}$/,
              )
        }
      }
      expect(p.talk.length).toBeGreaterThan(1)
    }
  })
})

describe('the shadow theatre', () => {
  test('every story is cast, staged and asked about', async () => {
    const { GROUPS, STORIES } = await import('../src/app/data/stories')
    const { PROPS, puppetOf } = await import('../src/app/paper/puppets')
    const { ACTS } = await import('../src/app/paper/acts')
    const { PIECE_NAMES } = await import('../src/app/paper/scenery')
    const { beatsOf, stageAt } = await import('../src/app/paper/stage')
    const ids = new Set<string>()
    for (const st of STORIES) {
      expect(ids.has(st.id), st.id).toBe(false)
      ids.add(st.id)
      expect(
        GROUPS.some((g) => g.id === st.group),
        st.id,
      ).toBe(true)
      expect(st.questions.length, st.id).toBe(3)
      expect(st.cover ?? 0, st.id).toBeLessThan(st.lines.length)
      const cast = st.cast ?? {}
      for (const [id, kind] of Object.entries(cast))
        expect(puppetOf(kind), `${st.id}: ${id} is a ${kind}`).toBeTruthy()
      st.lines.forEach(([, , cue], i) => {
        const at = `${st.id} line ${i + 1}`
        for (let c = cue; c; c = c.then) {
          for (const spec of c.set ?? [])
            expect(PIECE_NAMES.has(spec.split(':')[0]), `${at}: ${spec}`).toBe(
              true,
            )
          for (const [id, p] of Object.entries(c.on ?? {})) {
            const def = puppetOf(cast[id] ?? '')
            expect(def, `${at}: ${id} is not cast`).toBeTruthy()
            if (!def) continue
            if (p.act)
              expect(
                p.act in ACTS[def.rig],
                `${at}: ${id} cannot ${p.act}`,
              ).toBe(true)
            if (p.hold) expect(PROPS[p.hold], `${at}: ${p.hold}`).toBeTruthy()
            if (p.ride)
              expect(
                puppetOf(cast[p.ride] ?? '')?.saddle,
                `${at}: ${id} rides ${p.ride}`,
              ).toBeTruthy()
          }
          for (const off of c.off ?? [])
            expect(cast[off.split(':')[0]], `${at}: ${off}`).toBeTruthy()
          if (c.by) expect(cast[c.by], `${at}: ${c.by} speaks`).toBeTruthy()
        }
        for (let b = 0; b <= beatsOf(cue).length; b++)
          expect(() => stageAt(st, i, b), at).not.toThrow()
      })
    }
  })

  test("a puppet's parts hang from parts before them", async () => {
    const { PUPPET_KINDS, partsOf, puppetOf } =
      await import('../src/app/paper/puppets')
    for (const kind of PUPPET_KINDS) {
      const def = puppetOf(kind)
      expect(def, kind).toBeTruthy()
      if (!def) continue
      const seen = new Set<string>()
      for (const p of partsOf(def, 'staff')) {
        if (p.parent) expect(seen.has(p.parent), `${kind}: ${p.id}`).toBe(true)
        else expect(seen.size, `${kind}: ${p.id} is a second root`).toBe(0)
        seen.add(p.id)
      }
      for (const rod of def.rods)
        expect(seen.has(rod.part), `${kind}: rod on ${rod.part}`).toBe(true)
    }
  })

  test('the stage follows the script, beat by beat', async () => {
    const { STORIES } = await import('../src/app/data/stories')
    const { stageAt } = await import('../src/app/paper/stage')
    const laozi = STORIES.find((s) => s.id === 'laozi')!
    // he walks on alone, and mounts the ox in the third line's second beat
    expect(stageAt(laozi, 0).cast.laozi?.ride).toBeUndefined()
    expect(stageAt(laozi, 2, 0).cast.laozi?.ride).toBeUndefined()
    expect(stageAt(laozi, 2, 1).cast.laozi?.ride).toBe('ox')
    // he gets down to write, and rides off at the end
    expect(stageAt(laozi, 7).cast.laozi?.ride).toBeUndefined()
    expect(stageAt(laozi, 7).cast.laozi?.hold).toBe('brush')
    expect(stageAt(laozi, 9).cast.laozi?.ride).toBe('ox')
    expect(stageAt(laozi, 4).by).toBe('keeper')
    const houyi = STORIES.find((s) => s.id === 'houyi')!
    expect(stageAt(houyi, 8).set).toContain('suns:1')
    // the horse runs off; who speaks changes with the beat
    const saiweng = STORIES.find((s) => s.id === 'saiweng')!
    expect(stageAt(saiweng, 1, 0).exits.horse).toBe('run-r')
    expect(stageAt(saiweng, 1).cast.horse).toBeUndefined()
    expect(stageAt(saiweng, 4, 0).by).toBe('man')
    expect(stageAt(saiweng, 4, 1).by).toBe('elder')
  })
})

describe('first steps, the beginner course', () => {
  const NOON = new Date(2026, 9, 16, 12).getTime()

  test('parts have unique ids, and what they name exists', async () => {
    const { COURSE, PARTS } = await import('../src/app/data/course')
    const { WORD } = await import('../src/app/data/words')
    const { TONE_SETS } = await import('../src/app/data/tones')
    const { CONTRASTS, frames } = await import('../src/app/data/pinyin')
    const { BUILT } = await import('../src/app/data/parts')
    const { lineOf } = await import('../src/app/lib/course')
    expect(COURSE.map((d) => d.n)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length)
    for (const p of PARTS)
      for (const s of p.screens) {
        const at = `${p.id} ${s.k}`
        if (s.k === 'meet' || s.k === 'quiz')
          for (const id of s.ids) expect(WORD[id], `${at}: ${id}`).toBeTruthy()
        if (s.k === 'build')
          for (const zh of s.lines) {
            expect(lineOf(zh), `${at}: ${zh}`).toBeTruthy()
            // only the end of a line to build is punctuated
            const marks = tokens(zh, { home: '挪威' }).map((t) => !!t.punct)
            expect(marks.slice(0, -1), `${at}: ${zh}`).not.toContain(true)
          }
        if (s.k === 'ask') {
          expect(s.options.length, at).toBeGreaterThanOrEqual(2)
          expect(new Set(s.options).size, at).toBe(s.options.length)
          if (s.zh)
            for (const o of s.options)
              expect(() => tokens(o, { home: '挪威' }), o).not.toThrow()
        }
        if (s.k === 'ear') {
          for (const b of s.tones?.sets ?? [])
            expect(
              TONE_SETS.some((t) => t.base === b),
              `${at}: ${b}`,
            ).toBe(true)
          for (const id of s.contrasts ?? []) {
            const c = CONTRASTS.find((x) => x.id === id)
            expect(c, `${at}: ${id}`).toBeTruthy()
            if (c) expect(frames(c).length, id).toBeGreaterThan(0)
          }
          for (const n of s.numbers ?? [])
            expect(n, at).toMatch(/^[一二三四五六七八九十百]+$/)
        }
        const show = s.k === 'read' || s.k === 'ask' ? s.show : undefined
        if (show?.k === 'tones')
          expect(
            TONE_SETS.some((t) => t.base === show.base),
            at,
          ).toBe(true)
        if (show?.k === 'built')
          for (const c of show.c)
            expect(
              BUILT.some((b) => b.c === c),
              `${at}: ${c}`,
            ).toBe(true)
        if (show?.k === 'sum') expect(WORD[show.whole], at).toBeTruthy()
        // a simplified form is a word of the bank, its traditional one
        // another character
        if (show?.k === 'forms')
          for (const pair of show.pairs) {
            expect(WORD[pair.s], `${at}: ${pair.s}`).toBeTruthy()
            expect(pair.t, at).not.toBe(pair.s)
            expect(pair.strokes[1], at).toBeGreaterThan(pair.strokes[0])
          }
      }
  })

  test('the course’s own lines are made of known words', async () => {
    const { OWN_LINES } = await import('../src/app/data/course')
    for (const [zh, en] of Object.entries(OWN_LINES)) {
      expect(() => tokens(zh, { home: '挪威' }), zh).not.toThrow()
      expect(en, zh).toMatch(/[.?!]$/)
    }
  })

  test('everything the course plays is listed to be recorded', async () => {
    const { courseSpeech } = await import('../src/app/lib/course')
    const { speechItems, speechKey } = await import('../src/app/lib/speech')
    const all = new Set(speechItems().map((it) => speechKey(it.voice, it.text)))
    const items = courseSpeech()
    expect(items.length).toBeGreaterThan(100)
    for (const it of items)
      expect(all.has(speechKey(it.voice, it.text)), it.text).toBe(true)
  })

  test('the course goes on in order, a day at a time, and earns its seal', async () => {
    const { PARTS } = await import('../src/app/data/course')
    const { nextPart, offered, partKey, restToday, hideKey } =
      await import('../src/app/lib/course')
    const { award } = await import('../src/app/lib/achievements')
    const b = emptyBank()
    expect(offered(b)).toBe(true)
    expect(nextPart(b)?.id).toBe('1a')
    for (const id of ['1a', '1b', '1c']) b.scenes[partKey(id)] = NOON
    expect(nextPart(b)?.id).toBe('2a')
    // day 1 done today: day 2 is for tomorrow, though it can be taken now
    expect(restToday(b, NOON + 3_600_000)?.n).toBe(2)
    expect(restToday(b, NOON + 86_400_000)).toBeNull()
    b.scenes[partKey('2a')] = NOON
    expect(restToday(b, NOON)).toBeNull()
    // hidden on one device and shown again on another: the later wins
    b.scenes[hideKey(true)] = NOON
    expect(offered(b)).toBe(false)
    expect(offered(merge(b, { scenes: { [hideKey(false)]: NOON + 1 } }))).toBe(
      true,
    )
    expect(award(b, NOON).seals).not.toContain('start')
    for (const p of PARTS) b.scenes[partKey(p.id)] = NOON
    expect(nextPart(b)).toBeNull()
    expect(offered(b)).toBe(false)
    expect(award(b, NOON).seals).toContain('start')
  })

  test('someone who skips ahead goes on from there', async () => {
    const { PARTS } = await import('../src/app/data/course')
    const { nextPart, partKey, partsToday, restToday, doneToday } =
      await import('../src/app/lib/course')
    const b = emptyBank()
    const done = (ids: Array<string>, t: number) => {
      for (const id of ids) b.scenes[partKey(id)] = t
    }
    done(['1a'], NOON)
    done(['4a'], NOON + 1)
    expect(nextPart(b)?.id).toBe('4b')
    // Today carries the rest of day 4, not the days skipped
    expect(partsToday(b, NOON + 2).map((p) => p.id)).toEqual(['4b', '4c'])
    // a part skipped within a day is left behind too
    done(['4c'], NOON + 2)
    expect(nextPart(b)?.id).toBe('5a')
    expect(restToday(b, NOON + 3)).toBeNull()
    // a whole day taken today: the next is for tomorrow
    done(['4b'], NOON + 3)
    expect(doneToday(b, NOON + 4)?.n).toBe(4)
    expect(restToday(b, NOON + 4)?.n).toBe(5)
    // a part taken again goes on after it, past those done
    done(['1a'], NOON + 5)
    expect(nextPart(b)?.id).toBe('1b')
    done(['1b', '1c'], NOON + 6)
    expect(nextPart(b)?.id).toBe('2a')
    // at the end, those left behind
    done(
      PARTS.slice(PARTS.findIndex((p) => p.id === '5a')).map((p) => p.id),
      NOON + 7,
    )
    expect(nextPart(b)?.id).toBe('2a')
  })

  test('someone who knows many words is not offered it unless they ask', async () => {
    const { offered, hideKey } = await import('../src/app/lib/course')
    const b = emptyBank()
    for (const w of WORDS.slice(0, 60)) b.cards[w.id] = newCard(NOON)
    expect(offered(b)).toBe(false)
    b.scenes[hideKey(false)] = NOON
    expect(offered(b)).toBe(true)
  })
})

describe('taxi', () => {
  // The same rides every run
  const seeded = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  test('passengers only say words in the bank', async () => {
    const { TAXI_LINES, PLACES } = await import('../src/app/data/taxi')
    for (const line of TAXI_LINES)
      expect(() => tokens(line, { home: '挪威' }), line).not.toThrow()
    for (const p of PLACES)
      expect(
        WORDS.some((w) => w.id === p.id),
        p.id,
      ).toBe(true)
  })

  test('each place is once in town, and can be stopped at from two streets', async () => {
    const { PLACES, NX, NY } = await import('../src/app/data/taxi')
    const { stopsFor } = await import('../src/app/lib/taxi')
    const lots = new Set(
      PLACES.map((p) => `${p.lot.bx},${p.lot.by},${p.lot.q}`),
    )
    expect(lots.size).toBe(PLACES.length)
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length)
    for (const p of PLACES) {
      expect(p.lot.bx < NX - 1 && p.lot.by < NY - 1, p.id).toBe(true)
      expect(stopsFor(p.lot).length, p.id).toBe(2)
    }
  })

  test('every ride asks for each move once, in order, and ends at its place', async () => {
    const { TAXI_LINES, FIRST_STOP } = await import('../src/app/data/taxi')
    const { endOf, judge, loops, pathOf, plan, spotAt } =
      await import('../src/app/lib/taxi')
    const rand = seeded(20261017)
    let spot = spotAt(FIRST_STOP)
    const seen = new Set<string>()
    for (let n = 0; n < 300; n++) {
      const ride = plan(spot, rand, [])
      const path = pathOf(ride.route)
      expect(TAXI_LINES).toContain(ride.opener)
      let s = -1
      const crossings: Array<{ expect: string }> = []
      for (const ins of ride.instructions) {
        expect(TAXI_LINES, ins.line).toContain(ins.line)
        seen.add(ins.kind)
        ins.points.forEach((p, i) => {
          expect(path.sOf(p), ins.line).toBeGreaterThan(s)
          s = path.sOf(p)
          // the move asked for is the one that is right
          expect(judge(ins, i, p.expect).ok).toBe(true)
          if (!p.lot) crossings.push(p)
        })
        for (const id of ins.words)
          expect(
            WORDS.some((w) => w.id === id),
            id,
          ).toBe(true)
      }
      expect(crossings.map((p) => p.expect)).toEqual(ride.route.moves)
      const last = ride.instructions.at(-1)!
      expect(last.kind).toBe('stop')
      expect(last.points.at(-1)!.expect).toBe('stop')
      expect(path.sOf(last.points.at(-1)!)).toBeCloseTo(path.len, 6)
      expect(ride.route.moves.length).toBeGreaterThan(0)
      // no round a block to get there
      expect(loops(ride.route), ride.route.moves.join(' ')).toBe(false)
      spot = endOf(ride)
    }
    // all kinds of instruction come up
    expect([...seen].sort()).toEqual(
      ['ahead', 'at', 'count', 'forward', 'stop', 'straight', 'turn'].sort(),
    )
  })

  test('a turn too early, or a stop at the wrong place, is said so', async () => {
    const { judge } = await import('../src/app/lib/taxi')
    const count = {
      kind: 'count' as const,
      line: '在 第二 个 路口 往 左 拐 。',
      words: ['第二', '左'],
      points: [
        { edge: 0, d: 64, expect: 'straight' as const },
        { edge: 1, d: 64, expect: 'left' as const },
      ],
    }
    expect(judge(count, 0, 'left')).toEqual({
      ok: false,
      missed: ['第二'],
      complaint: 'early',
    })
    expect(judge(count, 1, 'right').missed).toEqual(['左'])
    const lot = { bx: 1, by: 1, q: 0 as const }
    const stop = {
      kind: 'stop' as const,
      line: '在 书店 前面 停 。',
      words: ['书店', '停'],
      points: [
        { edge: 0, d: 24, expect: 'straight' as const, lot },
        { edge: 0, d: 48, expect: 'stop' as const, lot },
      ],
    }
    expect(judge(stop, 0, 'stop').complaint).toBe('notHere')
    expect(judge(stop, 1, 'straight').missed).toEqual(['书店'])
  })
})

describe('the quiz', () => {
  test('questions and options are words of the bank, the facts too', async () => {
    const { QUIZ } = await import('../src/app/data/quiz')
    const ids = new Set(WORDS.map((w) => w.id))
    for (const q of QUIZ) {
      for (const l of [q.zh, ...q.options])
        expect(() => tokens(l, { home: '挪威' }), l).not.toThrow()
      for (const m of (q.fact ?? '').matchAll(/\{([^}=]+)(=[^}]*)?\}/g))
        expect(ids.has(m[1]), `${q.id}: ${m[1]}`).toBe(true)
    }
  })

  test('each question has two to four different options, and a topic', async () => {
    const { QUIZ, TOPICS } = await import('../src/app/data/quiz')
    const { SPRITES } = await import('../src/app/pixel/sprites')
    const topics = new Set(TOPICS.map((t) => t.id))
    for (const t of TOPICS) expect(SPRITES[t.sprite], t.id).toBeTruthy()
    expect(new Set(QUIZ.map((q) => q.id)).size).toBe(QUIZ.length)
    for (const q of QUIZ) {
      expect(topics.has(q.topic), q.id).toBe(true)
      expect(q.options.length, q.zh).toBeGreaterThanOrEqual(2)
      expect(q.options.length, q.zh).toBeLessThanOrEqual(4)
      expect(new Set(q.options).size, q.zh).toBe(q.options.length)
      expect(q.en, q.zh).not.toBe('')
    }
    // enough for a round of ten, many times over
    expect(QUIZ.length).toBeGreaterThan(60)
  })
})
