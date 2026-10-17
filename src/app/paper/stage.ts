import type { Cue, Story } from '../data/stories'

// The stage at a line of a story: the scenery and where each puppet is,
// from the cues of every line up to it, as a play's script works. A cue can
// have a second beat (`then`), played a moment into its line: `beat` 0 is
// the stage before it, 1 after.

export interface Placing {
  // Across the screen and up from the ground, in stage units (1600 × 900)
  x: number
  y: number
  face: 1 | -1
  act: string
  ride?: string
  hold?: string
  far: number
  size: number
  z: number
  // How it came on, if it came on just now
  from?: string
}

export interface Staged {
  set: Array<string>
  cast: Record<string, Placing | undefined>
  // How each puppet that left just now goes
  exits: Record<string, string>
  by?: string
}

export const STAGE_W = 1600
export const STAGE_H = 900

export function stageAt(story: Story, at: number, beat = 1): Staged {
  let set: Array<string> = []
  let cast: Record<string, Placing | undefined> = {}
  let exits: Record<string, string> = {}
  const apply = (cue: Cue, now: boolean) => {
    exits = {}
    if (cue.set) set = cue.set
    if (cue.on) {
      cast = { ...cast }
      for (const [id, p] of Object.entries(cue.on)) {
        const was = cast[id]
        cast[id] = {
          x: p.x !== undefined ? p.x * 16 : (was?.x ?? 800),
          y: p.y !== undefined ? p.y * 9 : (was?.y ?? 0),
          face: p.face ? (p.face === 'l' ? -1 : 1) : (was?.face ?? 1),
          act: p.act ?? was?.act ?? (p.ride ? 'ride' : 'stand'),
          ride: 'ride' in p ? p.ride : was?.ride,
          hold: 'hold' in p ? p.hold : was?.hold,
          far: p.far ?? was?.far ?? 0,
          size: p.size ?? was?.size ?? 1,
          z: p.z ?? was?.z ?? 0,
          from: now && !was ? p.from : undefined,
        }
      }
    }
    for (const off of cue.off ?? []) {
      const [id, how = ''] = off.split(':')
      cast = { ...cast }
      delete cast[id]
      if (now) exits[id] = how
    }
  }
  let by: string | undefined
  story.lines.slice(0, at + 1).forEach(([, , cue], i) => {
    const now = i === at
    exits = {}
    by = undefined
    let c = cue
    for (let k = 0; c && (!now || k <= beat); k++) {
      apply(c, now)
      by = c.by ?? by
      c = c.then
    }
  })
  return { set, cast, exits, by }
}

// The waits before each next beat of a line, in seconds
export function beatsOf(cue: Cue | undefined): Array<number> {
  const waits: Array<number> = []
  for (let c = cue?.then; c; c = c.then) waits.push(c.wait ?? 2)
  return waits
}
