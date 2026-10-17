import { NX, NY } from '../data/taxi'
import { disc, rect, rng } from '../pixel/draw'
import {
  LOT,
  PITCH,
  STREET,
  WALK,
  WORLD_H,
  WORLD_W,
  crossingXY,
  placeOn,
} from '../lib/taxi'
import type { G } from '../pixel/draw'
import type { Kind, Lot } from '../data/taxi'
import type { Pose } from '../lib/taxi'

// The taxi's town seen from above, as a pixel map turning round the taxi
// so that it always drives up the screen and left is left: the town is
// drawn once (streets, pavements and trees, courtyard houses, flats and
// the named places, each with something on its roof to know it by), then
// each frame it is turned and moved under the taxi, people walk round the
// blocks, and the taxi blinks before it turns and lights its brakes.

// Light from the top left, as in the sprites
const C = {
  asphalt: '#47424d',
  asphaltD: '#3e3944',
  asphaltL: '#514b57',
  centre: '#e3c35a',
  zebra: '#dcd8cc',
  walk: '#cfc5b3',
  walkD: '#beb39f',
  kerb: '#8c8374',
  alley: '#b5aa95',
  grass: '#6aa84f',
  grassD: '#558f3e',
  grassL: '#86c063',
  leafD: '#2b653d',
  leaf: '#3f8a3c',
  leafL: '#62a845',
  leafH: '#9bd35a',
  shadow: '#2a2530',
  roof: '#6c6872',
  roofD: '#57535e',
  roofL: '#868290',
  court: '#c8b796',
  flat: '#a9a39a',
  flatD: '#8f8980',
  flatL: '#c2bdb4',
  red: '#c8372d',
  redD: '#931f30',
  redL: '#e0604a',
  gold: '#f2c14e',
  goldD: '#b9852b',
  white: '#f3eee4',
  whiteD: '#d6d0c4',
  water: '#4f9fd6',
  waterL: '#8fd0f0',
  ink: '#1c1424',
  rail: '#7a7480',
  sleeper: '#6b4a32',
  ballast: '#9a9088',
}

const R = (g: G, x: number, y: number, w: number, h: number, c: string) =>
  rect(g, x, y, w, h, c)

// --- Trees, roofs and buildings, each in a lot of 24 × 24 ---

function tree(g: G, x: number, y: number, r: number) {
  disc(g, x + 1, y + 1, r, r, C.shadow)
  disc(g, x, y, r, r, C.leafD)
  disc(g, x - 0.5, y - 0.5, r - 1, r - 1, C.leaf)
  disc(g, x - 1, y - 1, Math.max(1, r - 2), Math.max(1, r - 2), C.leafL)
  R(g, x - Math.ceil(r / 2), y - Math.ceil(r / 2), 1, 1, C.leafH)
}

// A building's shadow, down and right, as tall as it is
function standing(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  tall: number,
) {
  g.globalAlpha = 0.45
  R(g, x + tall, y + h, w, tall, C.shadow)
  R(g, x + w, y + tall, tall, h, C.shadow)
  g.globalAlpha = 1
}

// A courtyard house of the hutongs: four grey-tiled wings round a yard
// with a tree, and a red gate
function hutong(g: G, x: number, y: number, r: () => number) {
  const x0 = x + 1
  const y0 = y + 1
  const s = 22
  standing(g, x0, y0, s, s, 1)
  R(g, x0, y0, s, s, C.roofD)
  // tiles in rows across each wing, the ridge lighter
  for (let k = 0; k < s; k++) {
    const c = k % 2 ? C.roof : C.roofD
    R(g, x0 + k, y0, 1, 6, c)
    R(g, x0 + k, y0 + s - 6, 1, 6, c)
    R(g, x0, y0 + k, 6, 1, c)
    R(g, x0 + s - 6, y0 + k, 6, 1, c)
  }
  R(g, x0 + 1, y0 + 2, s - 2, 1, C.roofL)
  R(g, x0 + 1, y0 + s - 3, s - 2, 1, C.roofL)
  R(g, x0 + 2, y0 + 1, 1, s - 2, C.roofL)
  R(g, x0 + s - 3, y0 + 1, 1, s - 2, C.roofL)
  R(g, x0 + 6, y0 + 6, s - 12, s - 12, C.court)
  if (r() < 0.7) tree(g, x0 + 9 + Math.round(r() * 3), y0 + 9, 3)
  // the gate, on a side chosen at random
  const side = Math.floor(r() * 4)
  const gx = [x0 + 15, x0 + s - 1, x0 + 15, x0][side]
  const gy = [y0, y0 + 15, y0 + s - 1, y0 + 15][side]
  R(g, gx, gy, side % 2 ? 1 : 3, side % 2 ? 3 : 1, C.red)
}

// Flats: a flat roof with a parapet, water tanks, boxes and panels
function flats(g: G, x: number, y: number, r: () => number) {
  const x0 = x + 1
  const y0 = y + 1
  const s = 22
  standing(g, x0, y0, s, s, 3)
  R(g, x0, y0, s, s, C.flatD)
  R(g, x0 + 1, y0 + 1, s - 2, s - 2, C.flat)
  R(g, x0 + 1, y0 + 1, s - 2, 1, C.flatL)
  // a stair head, a tank or two, units and a panel
  const sx = x0 + 3 + Math.round(r() * 10)
  const sy = y0 + 3 + Math.round(r() * 10)
  R(g, sx + 1, sy + 1, 5, 5, C.shadow)
  R(g, sx, sy, 5, 5, C.flatD)
  R(g, sx, sy, 5, 1, C.flatL)
  for (let k = 0; k < 2; k++) {
    const tx = x0 + 4 + Math.round(r() * 13)
    const ty = y0 + 4 + Math.round(r() * 13)
    if (Math.abs(tx - sx - 2) < 5 && Math.abs(ty - sy - 2) < 5) continue
    disc(g, tx + 1, ty + 1, 2, 2, C.shadow)
    disc(g, tx, ty, 2, 2, '#7f8a96')
    R(g, tx - 1, ty - 1, 1, 1, '#c8d4dc')
  }
  if (r() < 0.6) {
    const px = x0 + 3 + Math.round(r() * 9)
    const py = y0 + 13 + Math.round(r() * 4)
    R(g, px, py, 8, 4, '#2f3c64')
    for (let k = 1; k < 8; k += 2) R(g, px + k, py, 1, 4, '#4a5c90')
  }
  for (let k = 0; k < 3; k++)
    R(
      g,
      x0 + 2 + Math.round(r() * 17),
      y0 + 2 + Math.round(r() * 17),
      2,
      2,
      C.whiteD,
    )
}

// A row of small shops under awnings
function shops(g: G, x: number, y: number, r: () => number) {
  const awnings = ['#c8372d', '#2c8576', '#e07a2a', '#3c70c4', '#d9a441']
  standing(g, x + 1, y + 1, 22, 22, 2)
  for (let k = 0; k < 3; k++) {
    const sx = x + 1 + k * 7 + (k === 2 ? 1 : 0)
    const w = 7
    R(g, sx, y + 1, w, 22, k % 2 ? C.flat : C.flatD)
    R(g, sx, y + 1, w, 1, C.flatL)
    const a = awnings[Math.floor(r() * awnings.length)]
    for (let j = 0; j < 4; j++) R(g, sx, y + 19 + j, w, 1, j % 2 ? a : C.white)
  }
  R(g, x + 3, y + 6, 3, 2, C.whiteD)
  R(g, x + 17, y + 9, 2, 2, C.whiteD)
}

// Grass and trees
function grove(g: G, x: number, y: number, r: () => number) {
  R(g, x, y, LOT, LOT, C.grass)
  for (let k = 0; k < 14; k++)
    R(g, x + Math.floor(r() * 24), y + Math.floor(r() * 24), 1, 1, C.grassD)
  const n = 2 + Math.floor(r() * 3)
  for (let k = 0; k < n; k++)
    tree(
      g,
      x + 5 + Math.round(r() * 14),
      y + 5 + Math.round(r() * 14),
      3 + Math.round(r() * 2),
    )
}

// --- The named places ---

const PLACE_ART: Record<Kind, (g: G, x: number, y: number) => void> = {
  // Stone, with steps and columns at the front, and a coin on the roof
  bank: (g, x, y) => {
    standing(g, x + 1, y + 1, 22, 22, 3)
    R(g, x + 1, y + 1, 22, 22, '#b9ae9a')
    R(g, x + 2, y + 2, 20, 17, '#ddd5c4')
    R(g, x + 2, y + 2, 20, 1, '#efe9dc')
    for (let k = 0; k < 6; k++) R(g, x + 3 + k * 3.4, y + 19, 2, 3, C.white)
    R(g, x + 1, y + 22, 22, 1, '#a0947e')
    disc(g, x + 12, y + 10, 5, 5, C.goldD)
    disc(g, x + 11.5, y + 9.5, 4, 4, C.gold)
    R(g, x + 10, y + 8, 3, 3, '#ddd5c4')
    R(g, x + 9, y + 6, 1, 1, '#fff2a6')
  },
  // A tower with a pool on its roof
  hotel: (g, x, y) => {
    standing(g, x + 2, y + 1, 20, 22, 5)
    R(g, x + 2, y + 1, 20, 22, '#6f7590')
    R(g, x + 3, y + 2, 18, 20, '#8b90a8')
    R(g, x + 3, y + 2, 18, 1, '#a9aec4')
    R(g, x + 5, y + 5, 14, 9, C.white)
    R(g, x + 6, y + 6, 12, 7, C.water)
    R(g, x + 7, y + 7, 4, 1, C.waterL)
    R(g, x + 12, y + 10, 4, 1, C.waterL)
    R(g, x + 6, y + 16, 2, 4, C.white)
    R(g, x + 10, y + 16, 2, 4, C.white)
    R(g, x + 15, y + 16, 3, 3, C.red)
    R(g, x + 16, y + 17, 1, 1, C.redL)
  },
  // A long hall with a tower at each end and a clock between
  station: (g, x, y) => {
    standing(g, x + 1, y + 2, 22, 14, 3)
    R(g, x + 1, y + 2, 22, 14, '#d8cfbe')
    R(g, x + 1, y + 2, 22, 1, '#ece4d4')
    R(g, x + 1, y + 15, 22, 1, C.red)
    for (const tx of [x + 1, x + 18]) {
      R(g, tx, y + 1, 5, 6, '#2c8576')
      R(g, tx, y + 1, 5, 1, '#5fc7a6')
      R(g, tx + 2, y, 1, 1, C.gold)
    }
    disc(g, x + 12, y + 9, 3, 3, C.ink)
    disc(g, x + 12, y + 9, 2, 2, C.white)
    R(g, x + 12, y + 7, 1, 2, C.ink)
    R(g, x + 12, y + 9, 2, 1, C.ink)
    // the square in front, and a flag
    R(g, x + 1, y + 17, 22, 6, '#c9bfae')
    for (let k = 0; k < 22; k += 3) R(g, x + 1 + k, y + 17, 1, 6, '#bab09e')
    R(g, x + 12, y + 18, 1, 4, C.ink)
    R(g, x + 13, y + 18, 3, 2, C.red)
  },
  // Grass, a pond, a path and a little red pavilion
  park: (g, x, y) => {
    R(g, x, y, LOT, LOT, C.grass)
    R(g, x, y + 11, LOT, 3, '#d9c9a3')
    R(g, x + 11, y, 3, LOT, '#d9c9a3')
    disc(g, x + 6, y + 18, 5, 3, '#3f86bc')
    disc(g, x + 6, y + 18, 4, 2, C.water)
    R(g, x + 4, y + 17, 2, 1, C.waterL)
    tree(g, x + 5, y + 5, 4)
    tree(g, x + 19, y + 19, 4)
    R(g, x + 16, y + 3, 6, 6, C.redD)
    R(g, x + 17, y + 4, 4, 4, C.red)
    R(g, x + 18, y + 5, 2, 2, C.gold)
  },
  // White, with a red cross on the roof
  hospital: (g, x, y) => {
    standing(g, x + 1, y + 1, 22, 22, 4)
    R(g, x + 1, y + 1, 22, 22, C.whiteD)
    R(g, x + 2, y + 2, 20, 20, C.white)
    R(g, x + 2, y + 2, 20, 1, '#ffffff')
    R(g, x + 10, y + 5, 4, 14, C.red)
    R(g, x + 5, y + 10, 14, 4, C.red)
    R(g, x + 10, y + 5, 4, 1, C.redL)
    R(g, x + 5, y + 10, 4, 1, C.redL)
  },
  // A running track round a field, the school along one side, a flag
  school: (g, x, y) => {
    R(g, x, y, LOT, LOT, '#c9bfae')
    disc(g, x + 12, y + 9, 10, 7, '#c8503a')
    disc(g, x + 12, y + 9, 7, 4, C.grass)
    R(g, x + 6, y + 9, 12, 1, C.white)
    standing(g, x + 2, y + 18, 20, 5, 2)
    R(g, x + 2, y + 18, 20, 5, '#e6c88e')
    R(g, x + 2, y + 18, 20, 1, '#f6e6c4')
    R(g, x + 21, y + 1, 1, 6, C.ink)
    R(g, x + 18, y + 1, 3, 2, C.red)
  },
  // A tiled roof in red, a gold ridge, lanterns along the front
  restaurant: (g, x, y) => {
    standing(g, x + 1, y + 2, 22, 18, 2)
    R(g, x + 1, y + 2, 22, 18, C.redD)
    for (let k = 0; k < 22; k += 2) R(g, x + 1 + k, y + 2, 1, 18, '#a8302c')
    R(g, x + 1, y + 10, 22, 2, C.gold)
    R(g, x + 1, y + 10, 22, 1, '#fff2a6')
    for (let k = 0; k < 4; k++) {
      R(g, x + 3 + k * 6, y + 21, 2, 2, C.red)
      R(g, x + 3 + k * 6, y + 21, 2, 1, C.gold)
    }
  },
  // A wide flat roof full of units, and car parks with lines
  supermarket: (g, x, y) => {
    R(g, x, y, LOT, LOT, '#56525c')
    for (let k = 0; k < 5; k++) R(g, x + 2 + k * 5, y + 16, 1, 7, C.white)
    R(g, x + 3, y + 18, 3, 4, '#3c70c4')
    R(g, x + 13, y + 17, 3, 4, C.red)
    standing(g, x + 1, y + 1, 22, 13, 3)
    R(g, x + 1, y + 1, 22, 13, '#b8b0a0')
    R(g, x + 1, y + 1, 22, 1, '#d0c8b8')
    for (let k = 0; k < 4; k++) {
      R(g, x + 3 + k * 5, y + 4, 3, 3, C.whiteD)
      R(g, x + 3 + k * 5, y + 9, 3, 3, C.whiteD)
    }
    R(g, x + 1, y + 13, 22, 1, '#e07a2a')
  },
  // A green roof with a skylight, and an open book on it
  bookshop: (g, x, y) => {
    standing(g, x + 2, y + 2, 20, 20, 2)
    R(g, x + 2, y + 2, 20, 20, '#1f6a5e')
    R(g, x + 3, y + 3, 18, 18, '#2c8576')
    R(g, x + 3, y + 3, 18, 1, '#5fc7a6')
    R(g, x + 6, y + 8, 12, 8, C.white)
    R(g, x + 11, y + 8, 2, 8, C.whiteD)
    for (let k = 0; k < 3; k++) {
      R(g, x + 7, y + 10 + k * 2, 3, 1, '#7a7480')
      R(g, x + 14, y + 10 + k * 2, 3, 1, '#7a7480')
    }
  },
  // A dark roof with a gold star, and lights along the front
  cinema: (g, x, y) => {
    standing(g, x + 1, y + 1, 22, 20, 3)
    R(g, x + 1, y + 1, 22, 20, '#36204f')
    R(g, x + 2, y + 2, 20, 18, '#47296a')
    R(g, x + 2, y + 2, 20, 1, '#7a50ae')
    const sx = x + 12
    const sy = y + 11
    R(g, sx - 1, sy - 5, 2, 3, C.gold)
    R(g, sx - 5, sy - 2, 10, 2, C.gold)
    R(g, sx - 3, sy, 6, 2, C.gold)
    R(g, sx - 4, sy + 2, 3, 2, C.gold)
    R(g, sx + 1, sy + 2, 3, 2, C.gold)
    for (let k = 0; k < 11; k++)
      R(g, x + 2 + k * 2, y + 22, 1, 1, k % 2 ? C.gold : '#fff2a6')
  },
}

// --- The town, drawn once ---

type Generic = 'hutong' | 'flats' | 'shops' | 'grove'

// Lots kept green beside the park, so it reads as one
const GREEN = new Set(['0,1,0', '0,1,2', '0,0,2'])

function lotXYTopLeft(bx: number, by: number, q: number) {
  const c = crossingXY(bx, by)
  return {
    x: c.x + STREET / 2 + WALK + (q & 1 ? LOT : 0),
    y: c.y + STREET / 2 + WALK + (q & 2 ? LOT : 0),
  }
}

function drawTown(): HTMLCanvasElement {
  const town = document.createElement('canvas')
  town.width = WORLD_W
  town.height = WORLD_H
  const g = town.getContext('2d')!
  const r = rng(20261017)

  // The town beyond the ring road, close-packed houses and trees with
  // alleys between, and the railway south of the station; the town
  // inside is drawn over it
  R(g, 0, 0, WORLD_W, WORLD_H, C.alley)
  const rail = crossingXY(0, NY - 1).y + PITCH * 0.75
  for (let y = 1; y < WORLD_H; y += LOT + 3)
    for (let x = 1; x < WORLD_W; x += LOT + 3) {
      if (y + LOT > rail - 9 && y < rail + 9) continue
      const k = r()
      if (k < 0.6) hutong(g, x, y, r)
      else if (k < 0.82) grove(g, x, y, r)
      else flats(g, x, y, r)
    }
  R(g, 0, rail - 7, WORLD_W, 14, C.ballast)
  for (let x = 0; x < WORLD_W; x += 3) {
    R(g, x, rail - 5, 2, 4, C.sleeper)
    R(g, x, rail + 2, 2, 4, C.sleeper)
  }
  for (const dy of [-5, -2, 2, 5]) R(g, 0, rail + dy, WORLD_W, 1, C.rail)

  // Pavements round every block inside, then the streets
  const first = crossingXY(0, 0)
  const lastC = crossingXY(NX - 1, NY - 1)
  R(
    g,
    first.x - STREET / 2 - WALK,
    first.y - STREET / 2 - WALK,
    lastC.x - first.x + STREET + 2 * WALK,
    lastC.y - first.y + STREET + 2 * WALK,
    C.walk,
  )
  // joints in the paving
  for (let y = first.y - 12; y < lastC.y + 12; y += 4)
    for (let x = first.x - 12; x < lastC.x + 12; x += 4)
      R(g, x + ((y / 4) % 2) * 2, y, 1, 1, C.walkD)
  for (let i = 0; i < NX; i++) {
    const c = crossingXY(i, 0)
    R(
      g,
      c.x - STREET / 2 - 1,
      first.y - STREET / 2,
      STREET + 2,
      lastC.y - first.y + STREET,
      C.kerb,
    )
  }
  for (let j = 0; j < NY; j++) {
    const c = crossingXY(0, j)
    R(
      g,
      first.x - STREET / 2,
      c.y - STREET / 2 - 1,
      lastC.x - first.x + STREET,
      STREET + 2,
      C.kerb,
    )
  }
  for (let i = 0; i < NX; i++) {
    const c = crossingXY(i, 0)
    R(
      g,
      c.x - STREET / 2,
      first.y - STREET / 2,
      STREET,
      lastC.y - first.y + STREET,
      C.asphalt,
    )
  }
  for (let j = 0; j < NY; j++) {
    const c = crossingXY(0, j)
    R(
      g,
      first.x - STREET / 2,
      c.y - STREET / 2,
      lastC.x - first.x + STREET,
      STREET,
      C.asphalt,
    )
  }
  // a little grain in the tarmac, before the markings go on
  const rg = rng(7)
  const spanX = lastC.x - first.x + STREET
  const spanY = lastC.y - first.y + STREET
  for (let n = 0; n < 1400; n++) {
    const along = rg() < 0.5
    const k = Math.floor(rg() * (along ? NY : NX))
    const c = crossingXY(k, k)
    const off = Math.floor(rg() * STREET) - STREET / 2
    const x = along ? first.x - STREET / 2 + rg() * spanX : c.x + off
    const y = along ? c.y + off : first.y - STREET / 2 + rg() * spanY
    R(
      g,
      Math.floor(x),
      Math.floor(y),
      1,
      1,
      rg() < 0.5 ? C.asphaltD : C.asphaltL,
    )
  }

  // Markings: a centre line between crossings, zebras and stop lines
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < NY; j++) {
      const c = crossingXY(i, j)
      const box = STREET / 2
      if (i < NX - 1) {
        for (let x = c.x + box + 6; x < c.x + PITCH - box - 6; x += 6)
          R(g, x, c.y - 1, 3, 2, C.centre)
      }
      if (j < NY - 1) {
        for (let y = c.y + box + 6; y < c.y + PITCH - box - 6; y += 6)
          R(g, c.x - 1, y, 2, 3, C.centre)
      }
      // a zebra on each side that has a street
      const sides: Array<[number, number]> = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ]
      for (const [dx, dy] of sides) {
        const ni = i + dx
        const nj = j + dy
        if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) continue
        for (let k = -box + 1; k < box; k += 3) {
          if (dx === 0)
            R(
              g,
              c.x + k,
              c.y + dy * (box + 1) + (dy > 0 ? 0 : -4),
              2,
              4,
              C.zebra,
            )
          else
            R(
              g,
              c.x + dx * (box + 1) + (dx > 0 ? 0 : -4),
              c.y + k,
              4,
              2,
              C.zebra,
            )
        }
      }
    }

  // The lots inside: the named places, and houses, flats, shops and
  // trees between them
  for (let bx = 0; bx < NX - 1; bx++)
    for (let by = 0; by < NY - 1; by++)
      for (let q = 0; q < 4; q++) {
        const lot: Lot = { bx, by, q: q as Lot['q'] }
        const { x, y } = lotXYTopLeft(bx, by, q)
        const place = placeOn(lot)
        if (place) {
          PLACE_ART[place.kind](g, x, y)
          continue
        }
        const kinds: Array<Generic> = [
          'hutong',
          'hutong',
          'flats',
          'shops',
          'grove',
        ]
        const kind = GREEN.has(`${bx},${by},${q}`)
          ? 'grove'
          : kinds[Math.floor(r() * kinds.length)]
        ;(({ hutong, flats, shops, grove }) as const)[kind](g, x, y, r)
      }

  // Trees along the pavements in front of the houses, not the places
  for (let bx = 0; bx < NX - 1; bx++)
    for (let by = 0; by < NY - 1; by++)
      for (let q = 0; q < 4; q++) {
        if (placeOn({ bx, by, q: q as Lot['q'] })) continue
        const { x, y } = lotXYTopLeft(bx, by, q)
        if (r() < 0.5) {
          const top = !(q & 2)
          tree(g, x + 12, top ? y - 2 : y + LOT + 1, 2)
        }
        if (r() < 0.5) {
          const left = !(q & 1)
          tree(g, left ? x - 2 : x + LOT + 1, y + 12, 2)
        }
      }
  return town
}

// --- The taxi, from above, nose up: yellow on top, green below, as
// Beijing's are, with the lamp on its roof ---

const TAXI = [
  '.KKKKK.',
  'KUGGGUK',
  'KGGGGGK',
  'KGGgGGK',
  'KKCCCKK',
  'KCCcCCK',
  'KYYYYYK',
  'KYWWWYK',
  'KYYYYYK',
  'KCcccCK',
  'KGGGGGK',
  'KRGGGRK',
  '.KKKKK.',
]
const TAXI_PAL: Record<string, string> = {
  K: '#141018',
  U: '#fff6c8',
  G: '#1f6a52',
  g: '#3a8a6a',
  C: '#3a4a64',
  c: '#6a86a8',
  Y: '#f2b632',
  W: '#f4efe0',
  R: '#9a2a24',
}
export const TAXI_W = TAXI[0].length
export const TAXI_H = TAXI.length

// --- People on the pavements ---

interface Walker {
  bx: number
  by: number
  u: number
  speed: number
  coat: string
}

const COATS = [
  '#3d6fa8',
  '#c8372d',
  '#2f7d6d',
  '#e07a2a',
  '#6b4fa0',
  '#d8d2c6',
  '#1f1a17',
]

// A point on the loop round a block's pavement, a metre from the kerb
function round(bx: number, by: number, u: number) {
  const c = crossingXY(bx, by)
  const x0 = c.x + STREET / 2 + 1.5
  const y0 = c.y + STREET / 2 + 1.5
  const side = PITCH - STREET - 3
  const t = ((u % (4 * side)) + 4 * side) % (4 * side)
  if (t < side) return { x: x0 + t, y: y0 }
  if (t < 2 * side) return { x: x0 + side, y: y0 + t - side }
  if (t < 3 * side) return { x: x0 + side - (t - 2 * side), y: y0 + side }
  return { x: x0, y: y0 + side - (t - 3 * side) }
}

// --- The scene ---

export interface TaxiView {
  pose: Pose
  // Indicators before a turn, brake lights, all four at the kerb
  blink: 'left' | 'right' | null
  brake: boolean
  hazard: boolean
  // Where the next move is asked for, in the town
  mark: { x: number; y: number } | null
  // The passenger walking from the pavement to the taxi, or out of it
  rider: {
    from: { x: number; y: number }
    to: { x: number; y: number }
    t0: number
    ms: number
    coat: string
  } | null
}

export interface TaxiScene {
  resize: (w: number, h: number) => void
  draw: (now: number, view: TaxiView) => void
  // A point in the town on the canvas, as fractions of its size
  project: (x: number, y: number) => { x: number; y: number }
}

// Where the taxi sits on screen, as fractions: in the middle, low down,
// to see what is coming
export const ANCHOR = { x: 0.5, y: 0.76 }

export function taxiScene(
  canvas: HTMLCanvasElement,
  still: boolean,
): TaxiScene {
  const g = canvas.getContext('2d')!
  const town = drawTown()
  let w = 16
  let h = 16
  let cam = { a: 0, tx: 0, ty: 0, cos: 1, sin: 0 }
  const r = rng(99)
  const walkers: Array<Walker> = Array.from({ length: 22 }, () => ({
    bx: Math.floor(r() * (NX - 1)),
    by: Math.floor(r() * (NY - 1)),
    u: r() * 400,
    speed: (r() < 0.5 ? -1 : 1) * (3 + r() * 4),
    coat: COATS[Math.floor(r() * COATS.length)],
  }))
  let lastNow = 0

  const resize = (cw: number, ch: number) => {
    const ps = Math.max(2, cw / 224)
    w = Math.max(16, Math.round(cw / ps))
    h = Math.max(16, Math.round(ch / ps))
    canvas.width = w
    canvas.height = h
  }

  const draw = (now: number, view: TaxiView) => {
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0
    lastNow = now
    const { pose } = view
    const ax = w * ANCHOR.x
    const ay = h * ANCHOR.y
    // A right angle turns the pixels exactly, and the town is moved by
    // whole pixels; between, the turn is drawn as it falls
    const quarter = Math.round(pose.a / (Math.PI / 2))
    const square = Math.abs(pose.a - quarter * (Math.PI / 2)) < 1e-4
    const a = square ? quarter * (Math.PI / 2) : pose.a
    const cos = Math.round(Math.cos(-a) * 1e6) / 1e6
    const sin = Math.round(Math.sin(-a) * 1e6) / 1e6
    let tx = ax - (cos * pose.x - sin * pose.y)
    let ty = ay - (sin * pose.x + cos * pose.y)
    if (square) {
      tx = Math.round(tx)
      ty = Math.round(ty)
    }
    cam = { a, tx, ty, cos, sin }
    g.imageSmoothingEnabled = false
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.fillStyle = C.alley
    g.fillRect(0, 0, w, h)
    g.setTransform(cos, sin, -sin, cos, tx, ty)
    g.drawImage(town, 0, 0)

    // people walking round the blocks
    for (const p of walkers) {
      if (!still) p.u += p.speed * dt
      const at = round(p.bx, p.by, p.u)
      const step = Math.floor(p.u / 2) % 2
      R(g, at.x, at.y, 2, 2, p.coat)
      R(g, at.x, at.y - (step ? 1 : 0), 1, 1, '#2a1d14')
    }

    // the passenger getting in or out
    const rd = view.rider
    if (rd) {
      const k = (now - rd.t0) / rd.ms
      if (k >= 0 && k < 1) {
        const x = rd.from.x + (rd.to.x - rd.from.x) * k
        const y = rd.from.y + (rd.to.y - rd.from.y) * k
        R(g, x - 1, y - 1, 3, 3, rd.coat)
        R(g, x, y - 1, 1, 1, '#e8b98f')
      }
    }

    // the next move's place: a ring that breathes
    if (view.mark) {
      const k = still ? 0.5 : (Math.sin(now / 260) + 1) / 2
      g.globalAlpha = 0.35 + 0.35 * k
      const rr = 3 + k * 2
      g.strokeStyle = '#fff6c8'
      g.lineWidth = 1
      g.beginPath()
      g.arc(view.mark.x, view.mark.y, rr, 0, Math.PI * 2)
      g.stroke()
      g.globalAlpha = 1
    }

    // the taxi, upright on screen whichever way the town has turned
    g.setTransform(1, 0, 0, 1, 0, 0)
    const x0 = Math.round(ax - TAXI_W / 2)
    const y0 = Math.round(ay - TAXI_H / 2)
    g.globalAlpha = 0.4
    R(g, x0 + 1, y0 + 1, TAXI_W, TAXI_H, C.shadow)
    g.globalAlpha = 1
    const on = still || Math.floor(now / 330) % 2 === 0
    TAXI.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]
        if (ch === '.') continue
        let col = TAXI_PAL[ch]
        const left = x < TAXI_W / 2
        const corner = (y === 1 || y === 11) && (x === 1 || x === TAXI_W - 2)
        if (corner && on) {
          const blinking =
            view.hazard ||
            (view.blink === 'left' && left) ||
            (view.blink === 'right' && !left)
          if (blinking) col = '#ffb020'
        }
        if (ch === 'R' && view.brake) col = '#ff4a3a'
        R(g, x0 + x, y0 + y, 1, 1, col)
      }
    })
    if (view.brake) {
      g.globalAlpha = 0.35
      R(g, x0, y0 + TAXI_H, TAXI_W, 2, '#ff4a3a')
      g.globalAlpha = 1
    }
  }

  const project = (x: number, y: number) => ({
    x: (cam.cos * x - cam.sin * y + cam.tx) / w,
    y: (cam.sin * x + cam.cos * y + cam.ty) / h,
  })

  return { resize, draw, project }
}
