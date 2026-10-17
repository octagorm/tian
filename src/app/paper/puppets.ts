import type { Cut, Dye, Shape } from './leather'

// The puppets of the shadow theatre, as jointed pieces of cut leather in
// the manner of 皮影: profile faces cut open so the lamp shines through
// them, robes in red, green and yellow dye with patterns of holes, a rod
// at the neck and one at each hand. Every part is drawn in a frame of its
// own whose origin is the joint it turns on; a puppet stands on its anchor,
// the point on the ground under it. People are built from a few traits
// (face, hat, beard, coat, skirt, sleeves) like the trip's portraits.

export interface PartDef {
  id: string
  parent?: string
  // Where its joint is, in the parent's frame (the root's: from the anchor)
  at: readonly [number, number]
  // Stacking order inside the puppet
  z: number
  // The drawing's bounds in its own frame: x, y, width, height
  box: readonly [number, number, number, number]
  shapes: Array<Shape>
  // Its shapes when the hand holds something
  grip?: Array<Shape>
  // Its angle at rest, in degrees (clockwise)
  rest?: number
  // The drawing's size (not its children's), across and down
  scale?: readonly [number, number]
  // Held upright (or level) whatever the arm does: a staff, a flag
  upright?: boolean
}

export type Rig = 'human' | 'beast' | 'flyer' | 'hopper' | 'dragon'

export interface PuppetDef {
  rig: Rig
  parts: Array<PartDef>
  // Where the rods are fixed, on a part
  rods: Array<{ part: string; at: readonly [number, number] }>
  // Where a rider sits, on the root part
  saddle?: readonly [number, number]
  // What it holds in its near and far hands, unless a line says otherwise
  holds?: string
  holdsFar?: string
  // How tall it stands, and its size beside the others (a child is small)
  height: number
  size?: number
}

// --- People ---

export type FaceKind = 'young' | 'lady' | 'old' | 'child' | 'monkey' | 'giant'
export type HatKind =
  | 'none'
  | 'scholar'
  | 'daoist'
  | 'hood'
  | 'official'
  | 'helmet'
  | 'crown'
  | 'phoenix'
  | 'bun'
  | 'topknot'
  | 'wrap'
  | 'monk'
  | 'horns'
  | 'buns'
export type CoatKind = 'robe' | 'armor' | 'lady' | 'bare' | 'tunic' | 'kasaya'
export type SkirtKind =
  'robe' | 'skirt' | 'armor' | 'tunic' | 'leaves' | 'tiger' | 'tail'
export type SleeveKind = 'wide' | 'water' | 'armor' | 'bare' | 'tight'

export interface Look {
  face: FaceKind
  hat?: HatKind
  beard?: 'long' | 'curtain' | 'wild'
  // Dye of the beard and brows: black, or pale for the old
  hair?: Dye
  coat: CoatKind
  skirt: SkirtKind
  sleeves: SleeveKind
  // The main dye of the clothes, the trim, and the cut pattern of the cloth
  dye: Dye
  trim: Dye
  cut?: Cut
  // Shoes and trousers
  boots?: Dye
  legs?: Dye
  // A stoop, in degrees
  stoop?: number
  // Held in the near hand, or in the far one
  holds?: string
  holdsFar?: string
  // Its size beside a grown man
  size?: number
  // The plates of its armour, if any (gold unless said)
  armor?: Dye
  // A badge on the chest, a tail
  badge?: boolean
  tail?: boolean
}

const C = (d: string, dye?: Dye, cut?: Cut, cs?: number): Shape => ({
  d,
  dye,
  cut,
  cs,
})
const L = (d: string, line = 1.6): Shape => ({ d, line })
const O = (d: string): Shape => ({ d, open: true })
const dot = (x: number, y: number, r: number, dye: Dye = 'black'): Shape => ({
  d: `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`,
  dye,
  join: true,
})

// Faces in profile, looking right, from the neck joint: the face itself is
// cut open, with its eye, brow and ear left as lines
function faceShapes(kind: FaceKind, hair: Dye): Array<Shape> {
  switch (kind) {
    case 'lady':
      return [
        C(
          'M17 -71C12 -80 2 -84 -9 -82C-21 -79 -28 -67 -28 -53C-28 -40 -24 -30 -18 -24L-7 -22C-6 -36 -4 -50 0 -60C4 -66 10 -70 17 -71Z',
          'black',
          'stripes',
          0.45,
        ),
        O(
          'M4 -17C9 -19 14 -22 17 -26C19 -28 20 -30 20 -32L20.5 -34.5L18.6 -36.4L21 -38.5L21 -41.5L25 -45L20 -61C19 -65 18 -68 16 -71L4 -71C0 -66 -2 -62 -2 -56L-4 -44C-5 -38 -5 -33 -4 -29C-2 -23 0 -19 4 -17Z',
        ),
        L(
          'M8 -52C12 -55.4 17 -55.4 21 -52.6C17 -51 12 -50.4 8 -52ZM8 -52L2.5 -55.5',
          1.5,
        ),
        dot(15.6, -52.6, 1.7),
        L('M6 -58.5C11 -61.5 16 -61.5 21 -58.8', 1.5),
        L('M-1 -46C-6 -47 -7 -38 -2 -37', 1.4),
        L('M18.6 -36.4L15 -36', 1.1),
      ]
    case 'old':
      return [
        C(
          'M17 -71C12 -80 2 -84 -8 -82C-20 -78 -27 -66 -27 -50C-28 -36 -22 -22 -12 -14L-5 -20C-6 -34 -5 -48 -2 -58C-2 -64 0 -68 4 -72Z',
          hair,
          'stripes',
          0.6,
        ),
        O(
          'M4 -14C10 -16 15 -19 17 -23C19 -24 20.5 -25 20.5 -27L21 -31L18 -33L20 -36L22 -39L24.5 -41L28.5 -43L22 -60C21 -64 20 -68 17 -72L4 -73C0 -68 -2 -64 -2 -58L-4 -44C-5 -38 -5 -33 -4 -29C-2 -22 0 -17 4 -14Z',
        ),
        L('M7 -50C12 -53.6 18 -53.6 22 -50.8C18 -49 12 -48.4 7 -50Z', 1.5),
        dot(16, -51, 1.7),
        {
          d: 'M3 -57C9 -61 17 -61 23 -57.5C17 -58 10 -57 6 -54C4 -52 2 -50 0 -47C0 -51 1 -54 3 -57Z',
          dye: hair,
        },
        L('M5 -45C9 -44 12 -44 15 -45M2 -47L-1 -44', 1.2),
        L('M-1 -46C-6 -47 -7 -38 -2 -37', 1.4),
      ]
    case 'child':
      return [
        C(
          'M14 -64C10 -72 0 -76 -10 -74C-21 -70 -26 -60 -26 -48C-26 -36 -20 -26 -12 -20L-4 -22C-4 -34 -2 -46 2 -54C6 -60 10 -63 14 -64Z',
          'black',
        ),
        O(
          'M3 -18C9 -19 13 -22 15 -26C17 -28 17.5 -30 17.5 -31L18 -34L16.5 -35.5L18.5 -37L20 -41L19 -44L17 -56C16 -60 15 -62 14 -64L2 -64C-1 -58 -2 -54 -2 -50L-4 -42C-5 -36 -4 -30 -3 -27C-1 -22 0 -19 3 -18Z',
        ),
        L('M7 -46C10 -48.5 14 -48.5 17 -46.4C14 -45 10 -44.6 7 -46Z', 1.4),
        dot(13, -46.6, 1.6),
        L('M6 -52C10 -54.5 14 -54.5 18 -52', 1.4),
        L('M-1 -40C-5 -41 -6 -33 -2 -32', 1.3),
      ]
    case 'monkey':
      return [
        // fur over the skull and down the nape
        C(
          'M18 -66C14 -78 2 -84 -10 -82C-24 -78 -32 -64 -30 -48C-30 -34 -24 -20 -14 -12L-2 -18C-4 -32 -2 -46 4 -54C8 -60 12 -64 18 -66Z',
          'yellow',
          'stripes',
          0.55,
        ),
        // the red face round the eye, and the muzzle
        C(
          'M2 -16C-2 -26 -4 -40 0 -52C4 -62 12 -68 20 -66C26 -64 28 -58 26 -50C30 -44 32 -36 30 -30C34 -28 36 -24 34 -20C30 -14 22 -12 14 -12C10 -12 5 -13 2 -16Z',
          'red',
        ),
        C(
          'M16 -34C22 -36 30 -36 36 -32C40 -29 40 -24 36 -21C30 -17 22 -17 16 -20C14 -24 14 -30 16 -34Z',
          'pale',
        ),
        O(
          'M8 -48C10 -54 18 -56 22 -52C24 -48 20 -42 14 -42C10 -42 7 -45 8 -48Z',
        ),
        dot(16, -48.5, 2.4),
        L('M2 -58C8 -64 18 -66 26 -60', 2.4),
        L('M20 -25L33 -24M27 -31L30 -30', 1.3),
        // the ear
        C('M-6 -44C-14 -48 -20 -42 -18 -34C-16 -28 -8 -28 -4 -32Z', 'pale'),
        // the golden fillet
        C(
          'M-22 -66C-12 -74 6 -76 22 -70L23 -64C8 -69 -10 -68 -24 -58Z',
          'yellow',
          'coins',
          0.4,
        ),
        L('M23 -66C28 -70 32 -66 29 -62', 2),
      ]
    case 'giant':
      return [
        C(
          'M18 -68C14 -82 -2 -90 -16 -84C-30 -78 -36 -60 -34 -40C-36 -28 -30 -16 -20 -10L-8 -20C-8 -36 -6 -50 -2 -58C4 -64 10 -68 18 -68Z',
          'black',
          'curls',
          0.7,
        ),
        C(
          'M2 -12C-4 -24 -6 -40 -2 -54C2 -64 10 -70 20 -68C24 -64 26 -60 26 -56L33 -42L26 -38L28 -32L24 -28C24 -20 18 -14 10 -12C7 -11 4 -11 2 -12Z',
          'hide',
        ),
        O('M10 -52C14 -56 20 -56 23 -52C20 -49 14 -48 10 -52Z'),
        dot(18, -52, 1.8),
        {
          d: 'M4 -58C10 -66 20 -66 27 -60C20 -61 12 -60 6 -55Z',
          dye: 'black',
        },
        L('M-4 -46C-10 -47 -10 -37 -5 -36', 1.6),
        L('M20 -44C16 -40 16 -36 20 -35', 1.2),
      ]
    default:
      return [
        C(
          'M17 -72C12 -80 2 -84 -8 -82C-20 -78 -28 -66 -27 -50C-28 -36 -22 -22 -12 -14L-5 -20C-6 -34 -5 -48 -2 -58C-2 -64 0 -68 4 -73Z',
          'black',
          'stripes',
          0.45,
        ),
        O(
          'M4 -14C10 -16 15 -19 17 -23C19 -24 21 -25 21 -27L22 -31L19.5 -33.5L22 -36L23 -39L25 -41L29 -43L22 -60C21 -64 20 -68 17 -72L4 -73C0 -68 -2 -64 -2 -58L-4 -44C-5 -38 -5 -33 -4 -29C-2 -22 0 -17 4 -14Z',
        ),
        L('M7 -50C12 -54 18 -54 22 -51C18 -49 12 -48.4 7 -50Z', 1.5),
        dot(16, -51.2, 1.8),
        L('M4 -59C9 -62.5 16 -62 22.5 -57.5', 2.4),
        L('M-1 -46C-7 -47 -8 -37 -2 -36', 1.5),
        L('M19.5 -33.5L15 -33', 1.1),
      ]
  }
}

function hatShapes(kind: HatKind, look: Look): Array<Shape> {
  const { dye, trim } = look
  switch (kind) {
    case 'scholar':
      return [
        C(
          'M-27 -52C-29 -74 -16 -91 3 -93C15 -93 25 -85 24 -72L18 -71C10 -74 0 -74 -6 -71C-14 -66 -21 -60 -27 -52Z',
          'black',
          'lattice',
          0.6,
        ),
        C(
          'M-24 -62C-36 -50 -42 -30 -44 -6L-37 -6C-35 -28 -29 -46 -18 -58Z',
          'black',
          'stripes',
          0.5,
        ),
        C('M-26 -60C-12 -72 8 -76 24 -72L24 -67C8 -71 -10 -68 -25 -55Z', trim),
      ]
    case 'daoist':
      return [
        C(
          'M17 -72C12 -82 0 -86 -10 -83C-20 -80 -26 -72 -27 -62L-20 -64C-12 -72 4 -76 17 -72Z',
          'black',
        ),
        C('M-6 -82C-10 -94 2 -102 12 -96C16 -92 14 -84 8 -82Z', 'black'),
        C(
          'M-10 -88L-14 -102L-5 -96L0 -110L5 -96L14 -103L12 -88C4 -84 -4 -84 -10 -88Z',
          'yellow',
          'dots',
          0.45,
        ),
        L('M-22 -96L26 -90', 2.6),
        dot(-22, -96, 2.6, 'red'),
      ]
    case 'hood':
      return [
        C(
          'M-29 -44C-33 -70 -19 -89 2 -91C16 -91 25 -83 24 -71L18 -71C10 -73 2 -73 -4 -69C-10 -61 -12 -45 -12 -31C-18 -25 -26 -23 -31 -27C-29 -33 -29 -39 -29 -44Z',
          dye,
          'dots',
          0.6,
        ),
        C('M-27 -60C-14 -72 6 -76 24 -71L24 -66C6 -70 -12 -67 -26 -54Z', trim),
      ]
    case 'official':
      return [
        C(
          'M-25 -55C-27 -72 -16 -85 0 -87L14 -87C22 -85 25 -79 24 -70L18 -70C8 -73 -6 -70 -25 -55Z',
          'black',
          'dots',
          0.5,
        ),
        C('M-21 -76C-23 -93 -12 -101 -2 -99C5 -97 7 -91 5 -84Z', 'black'),
        L('M-12 -82L-46 -91M14 -84L44 -93', 2.6),
        C(
          'M-46 -91C-55 -100 -68 -98 -68 -89C-66 -81 -53 -81 -46 -91Z',
          'black',
          'dots',
          0.4,
        ),
        C(
          'M44 -93C53 -102 66 -100 66 -91C64 -83 51 -83 44 -93Z',
          'black',
          'dots',
          0.4,
        ),
        C(
          'M-24 -62C-10 -72 10 -75 24 -71L24 -66C10 -70 -10 -67 -23 -57Z',
          trim,
        ),
      ]
    case 'helmet':
      return [
        C(
          'M-29 -46C-31 -71 -18 -90 2 -92C18 -92 27 -82 26 -68L20 -68C15 -62 10 -60 4 -61L-2 -61C-8 -51 -10 -41 -10 -27C-18 -23 -26 -25 -31 -31Z',
          'yellow',
          'scales',
          0.5,
        ),
        C(
          'M-27 -63C-12 -75 12 -77 26 -71L26 -64C12 -70 -10 -68 -25 -56Z',
          'red',
          'dots',
          0.4,
        ),
        C('M-2 -91L2 -114L7 -91Z', 'yellow'),
        dot(2.5, -106, 4.5, 'red'),
      ]
    case 'crown':
      return [
        C(
          'M-23 -58C-25 -77 -13 -88 2 -88C16 -88 24 -80 24 -68L18 -70C8 -73 -6 -70 -23 -58Z',
          'black',
          'dots',
          0.5,
        ),
        C('M-4 -88L7 -88L7 -97L-4 -98Z', 'yellow'),
        C('M-36 -100L38 -93L38 -86L-36 -93Z', 'yellow', 'coins', 0.4),
        L('M30 -88V-64M35 -88V-62M-30 -94V-72M-25 -94V-71', 1.2),
        dot(30, -64, 1.8, 'red'),
        dot(35, -62, 1.8, 'red'),
        dot(30, -74, 1.6, 'green'),
        dot(35, -72, 1.6, 'green'),
        dot(-30, -72, 1.8, 'red'),
        dot(-25, -71, 1.8, 'red'),
        C(
          'M-22 -64C-10 -72 10 -74 24 -71L24 -66C10 -70 -8 -67 -21 -59Z',
          'red',
        ),
      ]
    case 'phoenix':
      return [
        C(
          'M-25 -58C-27 -82 -11 -95 4 -95C18 -95 27 -85 26 -70L19 -71C8 -74 -8 -70 -25 -58Z',
          'yellow',
          'flowers',
          0.5,
        ),
        C(
          'M4 -95C0 -106 7 -114 15 -111L22 -116L17 -107C13 -101 11 -97 9 -94Z',
          'red',
        ),
        C(
          'M6 -101C-10 -112 -32 -114 -48 -104C-32 -104 -16 -100 -3 -95Z',
          'red',
          'stripes',
          0.4,
        ),
        L('M-20 -64L-23 -38M-14 -67L-16 -44', 1.2),
        dot(-23, -38, 2, 'red'),
        dot(-16, -44, 2, 'green'),
        dot(18, -96, 2.6, 'green'),
      ]
    case 'bun':
      return [
        C(
          'M-14 -80C-25 -97 -8 -113 9 -107C19 -103 19 -91 11 -85C4 -81 -6 -79 -14 -80Z',
          'black',
          'curls',
          0.55,
        ),
        L('M-32 -97L16 -86', 2.6),
        L('M-29 -96L-31 -78M-24 -95L-25.5 -81', 1.1),
        dot(-31, -77, 2, 'red'),
        dot(-25.5, -80, 2, 'green'),
        C(
          'M-14 -95C-18 -99 -14 -104 -10 -101C-8 -106 -2 -104 -4 -99C1 -98 0 -92 -5 -93C-6 -88 -12 -89 -11 -94C-16 -92 -18 -96 -14 -95Z',
          'red',
        ),
        dot(-8.5, -97.5, 1.6, 'yellow'),
      ]
    case 'topknot':
      return [
        C(
          'M17 -72C12 -82 0 -86 -10 -83C-20 -80 -26 -72 -27 -62L-20 -64C-12 -72 4 -76 17 -72Z',
          'black',
        ),
        C('M-8 -81C-12 -94 2 -100 10 -92C13 -87 8 -82 -8 -81Z', 'black'),
        L('M-11 -86L13 -89', 3.2),
        C(
          'M-12 -86C-20 -84 -26 -76 -26 -68L-21 -70C-20 -76 -16 -82 -11 -84Z',
          trim,
        ),
      ]
    case 'buns':
      return [
        dot(-12, -70, 9, 'black'),
        dot(6, -74, 8, 'black'),
        L('M-20 -66L-4 -74M-1 -78L13 -70', 1.6),
      ]
    case 'wrap':
      return [
        C(
          'M-28 -46C-31 -69 -17 -86 2 -87C16 -87 24 -79 23 -68L17 -70C6 -72 -4 -70 -10 -64C-14 -58 -16 -50 -16 -42Z',
          dye,
          'dots',
          0.5,
        ),
        C(
          'M-24 -66C-38 -66 -47 -57 -45 -46L-39 -48C-39 -55 -33 -60 -24 -60Z',
          dye,
        ),
        C('M-25 -60C-12 -71 8 -74 23 -70L23 -65C8 -69 -10 -66 -24 -55Z', trim),
      ]
    case 'monk':
      return [
        C(
          'M-24 -60C-25 -75 -12 -84 2 -84C14 -84 23 -77 23 -68L18 -70C8 -72 -8 -70 -24 -60Z',
          'yellow',
          'dots',
          0.4,
        ),
        C(
          'M-23 -73L-20 -98L-11 -80ZM-11 -80L-3 -104L6 -82ZM6 -82L14 -102L21 -77Z',
          'red',
          'dots',
          0.35,
        ),
        C(
          'M-24 -64C-34 -54 -38 -38 -38 -20L-32 -20C-31 -36 -26 -50 -18 -60Z',
          'yellow',
          'stripes',
          0.4,
        ),
      ]
    case 'horns':
      return [
        C(
          'M-6 -84C-12 -101 -3 -114 11 -116C4 -107 2 -96 4 -84Z',
          'pale',
          'stripes',
          0.4,
        ),
        C(
          'M8 -80C10 -95 20 -104 31 -102C23 -95 19 -87 17 -78Z',
          'pale',
          'stripes',
          0.4,
        ),
        C('M-30 -70L-44 -76L-34 -60L-46 -54L-32 -48L-40 -36L-28 -38Z', 'black'),
      ]
    default:
      return []
  }
}

function beardShapes(kind: Look['beard'], hair: Dye): Array<Shape> {
  switch (kind) {
    case 'long':
      return [
        C(
          'M2 -30C8 -29 15 -27 21 -27C25 -14 23 10 15 40C11 53 5 61 0 64C-2 49 -4 31 -4 14C-4 -2 -2 -18 2 -30Z',
          hair,
          'stripes',
          0.55,
        ),
        C('M15 -39C20 -39 25 -37 25 -34C21 -33 16 -32 11 -30Z', hair),
      ]
    case 'curtain':
      return [C('M11 -37L27 -37L27 8C22 12 16 12 11 8Z', hair, 'stripes', 0.5)]
    case 'wild':
      return [
        C(
          'M0 -32C10 -26 20 -24 27 -28C29 -12 25 6 15 18C6 25 -4 23 -10 14C-8 0 -6 -16 0 -32Z',
          'black',
          'curls',
          0.6,
        ),
      ]
    default:
      return []
  }
}

// The upper body, from the waist
function coatShapes(look: Look): Array<Shape> {
  const { dye, trim, cut = 'dots' } = look
  switch (look.coat) {
    case 'armor':
      return [
        C(
          'M-22 2C-27 -36 -30 -84 -26 -116C-23 -136 -14 -148 -2 -152L14 -153C26 -147 35 -128 35 -100C35 -70 30 -36 25 2Z',
          look.armor ?? 'yellow',
          'scales',
          0.7,
        ),
        C(
          'M-26 -118C-14 -128 0 -132 14 -130L16 -112C2 -114 -12 -110 -26 -100Z',
          'red',
          'dots',
          0.4,
        ),
        dot(18, -88, 13, 'red'),
        dot(18, -88, 8, 'yellow'),
        C(
          'M-4 -153C0 -139 13 -137 18 -150L23 -146C17 -126 -5 -125 -12 -146Z',
          'red',
        ),
        C('M-26 -18L28 -21L29 -6L-25 -3Z', 'black', 'coins', 0.45),
      ]
    case 'lady':
      return [
        C(
          'M-19 2C-23 -36 -25 -84 -22 -114C-19 -134 -12 -146 -2 -150L12 -151C22 -145 29 -128 29 -102C29 -72 25 -38 21 2Z',
          dye,
          cut,
        ),
        // the cloud collar, four lobes over the shoulders
        C(
          'M-24 -128C-34 -122 -36 -108 -26 -102C-30 -92 -22 -82 -12 -88C-6 -78 8 -80 10 -92C20 -86 32 -94 28 -106C36 -112 32 -126 22 -126C20 -138 8 -144 -2 -140C-10 -146 -24 -140 -24 -128Z',
          trim,
          'curls',
          0.55,
        ),
        C('M-26 -16L24 -18L25 -6L-25 -4Z', trim, 'coins', 0.4),
      ]
    case 'bare':
      return [
        C(
          'M-24 2C-30 -36 -34 -84 -30 -116C-27 -138 -16 -150 -2 -154L16 -155C30 -149 40 -128 40 -98C40 -66 34 -34 28 2Z',
          'hide',
        ),
        L(
          'M14 -120C24 -112 30 -100 30 -88M6 -76C14 -70 22 -70 28 -74M4 -52C12 -48 20 -48 26 -52M-14 -110C-16 -90 -14 -70 -10 -50',
          1.6,
        ),
        // a cape of leaves over one shoulder
        C(
          'M-30 -120L-20 -140L-8 -124L2 -144L10 -126L22 -140L24 -118C10 -108 -10 -106 -30 -110Z',
          'green',
          'stripes',
          0.5,
        ),
        C('M-28 -16L30 -20L30 -6L-27 -2Z', 'hide', 'coins', 0.45),
      ]
    case 'tunic':
      return [
        C(
          'M-21 2C-25 -36 -28 -84 -24 -116C-21 -136 -13 -148 -2 -152L13 -153C24 -147 32 -128 32 -100C32 -70 28 -36 24 2Z',
          dye,
          cut,
          0.8,
        ),
        C(
          'M-4 -153C2 -138 12 -122 22 -104L28 -110C18 -126 10 -140 6 -152Z',
          trim,
        ),
        C('M-24 -14L27 -17L28 -6L-23 -3Z', 'black'),
      ]
    case 'kasaya':
      return [
        C(
          'M-22 2C-27 -36 -30 -84 -26 -116C-23 -136 -14 -148 -2 -152L14 -153C26 -147 35 -128 35 -100C35 -70 30 -36 25 2Z',
          'yellow',
          'dots',
          0.6,
        ),
        C(
          'M-24 -122L18 -153L34 -100L30 -40L-6 2L-22 2C-26 -40 -28 -90 -24 -122Z',
          'red',
          'lattice',
          0.9,
        ),
        dot(22, -104, 5, 'yellow'),
        C(
          'M-4 -153C0 -139 13 -137 18 -150L23 -146C17 -126 -5 -125 -12 -146Z',
          'yellow',
        ),
      ]
    default:
      return [
        C(
          'M-22 2C-27 -36 -30 -84 -26 -116C-23 -136 -14 -148 -2 -152L14 -153C26 -147 35 -128 35 -100C35 -70 30 -36 25 2Z',
          dye,
          cut,
        ),
        C(
          'M-4 -153C0 -139 13 -137 18 -150L23 -146C17 -126 -5 -125 -12 -146Z',
          trim,
        ),
        C('M-6 -148L6 -151L34 -97L24 -90Z', trim, 'teeth', 0.4),
        ...(look.badge
          ? [C('M7 -112L31 -113L32 -83L7 -81Z', trim, 'flowers', 0.6)]
          : []),
        C('M-26 -18L28 -21L29 -6L-25 -3Z', 'yellow', 'coins', 0.45),
      ]
  }
}

// The lower body, from the waist, and how far down the legs start
function skirtShapes(look: Look): Array<Shape> {
  const { dye, trim, cut = 'dots' } = look
  switch (look.skirt) {
    case 'skirt':
      return [
        C(
          'M-24 -4C-30 50 -40 120 -48 196C-30 204 16 206 40 198C34 120 30 50 26 -4Z',
          dye,
          'stripes',
          0.9,
        ),
        C(
          'M-46 182C-28 190 16 192 39 184L40 198C16 206 -30 204 -48 196Z',
          trim,
          'teeth',
          0.5,
        ),
        C(
          'M12 0C20 40 25 90 23 160L15 158C17 92 13 44 6 0Z',
          'red',
          'flowers',
          0.4,
        ),
      ]
    case 'armor':
      return [
        C(
          'M-24 -4C-30 30 -36 70 -40 110L-20 116L-12 100L0 116L14 100L26 116L36 108C32 70 28 30 25 -4Z',
          look.armor ?? 'yellow',
          'scales',
          0.7,
        ),
        C('M-4 0L18 0L20 50C14 58 2 58 -4 50Z', 'red', 'curls', 0.5),
      ]
    case 'tunic':
      return [
        C(
          'M-23 -4C-26 20 -30 40 -33 62L33 64C30 40 27 20 24 -4Z',
          dye,
          cut,
          0.8,
        ),
        C('M-31 52L32 54L33 64L-33 62Z', trim),
      ]
    case 'leaves':
      return [
        C(
          'M-26 -4L-38 90L-25 80L-17 102L-6 84L4 106L14 84L24 102L31 82L40 94L26 -4Z',
          'green',
          'stripes',
          0.55,
        ),
      ]
    case 'tiger':
      return [
        C(
          'M-24 -4C-28 20 -32 50 -35 74L-21 80L-10 70L2 82L14 70L26 80L35 72C32 46 28 20 25 -4Z',
          'yellow',
          'stripes',
          0.9,
        ),
        C('M-25 -6L26 -8L26 4L-25 6Z', 'red'),
      ]
    case 'tail':
      return [
        C(
          'M-24 -4C-28 30 -26 70 -12 100L22 96C26 60 28 30 26 -4Z',
          'green',
          'scales',
          0.6,
        ),
        C('M-25 -6L26 -8L26 6L-25 8Z', trim, 'coins', 0.4),
      ]
    default:
      return [
        C(
          'M-23 -4C-28 40 -36 96 -46 150C-30 158 14 160 38 152C33 96 29 40 25 -4Z',
          dye,
          cut,
        ),
        C(
          'M-44 138C-28 146 14 148 37 140L38 152C14 160 -30 158 -46 150Z',
          trim,
          'teeth',
          0.5,
        ),
        C(
          'M2 6L20 6C22 50 24 100 25 136C18 142 6 142 -1 136C0 100 1 50 2 6Z',
          trim,
          'flowers',
          0.5,
        ),
      ]
  }
}

// One leg from the hip: trousers and a thick-soled boot, 181 long
function legShapes(look: Look): Array<Shape> {
  const boots = look.boots ?? 'black'
  const legs = look.legs ?? 'pale'
  switch (look.skirt) {
    case 'skirt':
      return [C('M-6 0L14 0C21 0 25 4 23 8L-6 10Z', look.trim)]
    case 'leaves':
      return [
        C(
          'M-15 -6C-17 40 -14 100 -11 160L-13 172C-13 178 -6 181 2 181L36 181C40 177 36 172 28 170L12 166C12 120 13 60 13 -6Z',
          'hide',
        ),
        L('M-6 60C-4 80 -4 100 -6 120', 1.4),
      ]
    case 'tiger':
    case 'tunic':
      return [
        C(
          'M-14 -6C-16 40 -14 90 -11 140L12 140C13 90 14 40 12 -6Z',
          legs,
          'dots',
          0.5,
        ),
        C(
          'M-12 136L13 136C14 150 18 160 30 165C38 167 42 171 40 176L40 181L-13 181L-13 172C-13 160 -12 148 -12 136Z',
          boots,
        ),
        C('M-13 174L40 174L40 181L-13 181Z', 'pale'),
      ]
    default:
      return [
        C('M-14 -6C-16 40 -14 90 -11 132L12 132C13 90 14 40 12 -6Z', legs),
        C(
          'M-12 116L13 116C14 140 16 156 30 164C38 166 42 170 40 176L40 181L-14 181L-14 172C-13 160 -12 140 -12 116Z',
          boots,
          'curls',
          0.45,
        ),
        C('M-14 172L40 172L40 181L-14 181Z', 'pale'),
      ]
  }
}

// The rivet an arm turns on, at its joint
const RIVET: Array<Shape> = [dot(0, 0, 3.6, 'pale'), dot(0, 0, 1.4, 'black')]

function upperArmShapes(look: Look): Array<Shape> {
  return [...sleeveShapes(look), ...RIVET]
}

function sleeveShapes(look: Look): Array<Shape> {
  const { dye, trim, cut = 'dots' } = look
  switch (look.sleeves) {
    case 'armor':
      return [
        C(
          'M-10 8C-11 40 -12 60 -11 80L12 82C12 60 12 40 11 8Z',
          'red',
          'dots',
          0.5,
        ),
        C(
          'M-15 -10C-21 -2 -23 10 -19 18C-11 27 10 27 16 18C20 10 18 -2 12 -10C4 -16 -8 -16 -15 -10Z',
          'yellow',
          'scales',
          0.5,
        ),
      ]
    case 'bare':
      return [
        C(
          'M-14 -8C-20 20 -18 50 -14 80L14 82C18 52 18 20 13 -8C6 -14 -8 -14 -14 -8Z',
          'hide',
        ),
        L('M6 4C10 20 10 36 6 50', 1.4),
      ]
    case 'tight':
      return [
        C(
          'M-11 -8C-13 20 -13 50 -11 80L12 82C13 52 13 20 11 -8C5 -13 -6 -13 -11 -8Z',
          dye,
          cut,
          0.7,
        ),
      ]
    default:
      return [
        C(
          'M-11 -8C-16 20 -18 50 -16 80L16 84C16 52 15 22 12 -8C6 -14 -6 -14 -11 -8Z',
          dye,
          cut,
        ),
        C('M-11 -8C-6 -14 6 -14 12 -8L12 4C4 0 -4 0 -12 4Z', trim),
      ]
  }
}

const HAND_OPEN =
  'M-6 62C-8 72 -8 82 -4 92C-2 96 4 96 6 92L8 84C12 84 14 80 12 76L8 74C8 70 7 66 6 62Z'
const FIST = 'M-8 61C-10 69 -9 79 -3 84C3 87 10 83 11 77C11 71 9 66 7 61Z'

function foreArmShapes(look: Look, holding: boolean): Array<Shape> {
  const { dye, trim, cut = 'dots' } = look
  const hand = holding
    ? [C(FIST, 'hide'), L('M-6 72C-1 70 4 70 9 72M-5 78C0 76 5 76 9 78', 1)]
    : [C(HAND_OPEN, 'hide'), L('M-2 80L3 91M1 77L6 87', 1)]
  switch (look.sleeves) {
    case 'armor':
      return [
        ...hand,
        C('M-12 -4L-10 58L12 60L13 -4Z', 'yellow', 'scales', 0.45),
        C('M-11 50L12 52L12 62L-11 60Z', 'red'),
      ]
    case 'bare':
      return [
        ...hand,
        C('M-12 -4C-14 20 -12 44 -9 62L10 62C13 44 14 20 12 -4Z', 'hide'),
        C('M-10 50L11 50L11 62L-10 62Z', 'black', 'coins', 0.4),
      ]
    case 'tight':
      return [
        ...hand,
        C(
          'M-11 -4C-12 18 -11 40 -10 60L11 62C12 42 12 18 11 -4Z',
          dye,
          cut,
          0.7,
        ),
        C('M-10 52L11 54L11 63L-10 61Z', trim),
      ]
    case 'water':
      return [
        C('M-14 -6C-15 18 -13 40 -12 60L13 62C14 42 15 18 15 -6Z', dye, cut),
        C('M-13 50L14 52L13 64L-12 62Z', trim, 'dots', 0.4),
      ]
    default:
      return [
        ...hand,
        C('M-15 -6C-15 18 -13 40 -12 60L13 62C14 42 15 18 15 -6Z', dye, cut),
        C('M-13 50L14 52L13 64L-12 62Z', trim),
      ]
  }
}

// The long white sleeve of an actress, hanging from the cuff
const WATER_SLEEVE: Array<Shape> = [
  C(
    'M-12 -2C-15 24 -11 56 -3 86C1 96 13 97 17 86C15 60 14 30 13 0Z',
    'pale',
    'waves',
    0.6,
  ),
]

// Ribbons hanging from the belt, a pair tied in a bow (飘带); a lady's
// reach the ground
function sashShapes(look: Look, long: boolean): Array<Shape> {
  const end = long ? 186 : 128
  return [
    C(
      `M-2 2C-6 ${end * 0.3} 4 ${end * 0.6} -2 ${end - 16}C-4 ${end - 4} 2 ${end + 4} 8 ${end + 6}L13 ${end}C7 ${end - 10} 5 ${end - 24} 7 ${end * 0.66}C11 ${end * 0.4} 3 ${end * 0.22} 6 2Z`,
      look.trim,
      'stripes',
      0.4,
    ),
    C(
      `M6 4C14 ${end * 0.28} 6 ${end * 0.55} 14 ${end - 30}C16 ${end - 18} 22 ${end - 14} 26 ${end - 12}L28 ${end - 20}C22 ${end - 24} 20 ${end - 36} 20 ${end * 0.6}C20 ${end * 0.35} 14 ${end * 0.2} 12 2Z`,
      look.dye === look.trim ? 'yellow' : look.dye,
      'stripes',
      0.4,
    ),
    C(
      'M-8 -4C-14 -12 -6 -18 2 -8C10 -18 18 -12 12 -4C8 2 -4 2 -8 -4Z',
      'yellow',
    ),
  ]
}

// --- Things held, drawn from the grip ---

export const PROPS: Record<
  string,
  {
    box: readonly [number, number, number, number]
    shapes: Array<Shape>
    rest?: number
    upright?: boolean
  }
> = {
  bow: {
    box: [-20, -110, 60, 220],
    shapes: [
      C(
        'M-4 -100C30 -70 34 70 -4 100L2 96C24 60 24 -60 2 -96Z',
        'red',
        'dots',
        0.35,
      ),
      L('M-2 -98L-2 98', 1),
      C('M-6 -8L6 -8L6 8L-6 8Z', 'yellow'),
    ],
  },
  cudgel: {
    box: [-12, -160, 24, 320],
    shapes: [
      C('M-4 -150L4 -150L4 150L-4 150Z', 'yellow', 'dots', 0.3),
      C('M-6 -156L6 -156L6 -128L-6 -128Z', 'red'),
      C('M-6 128L6 128L6 156L-6 156Z', 'red'),
    ],
  },
  axe: {
    box: [-30, -150, 90, 220],
    shapes: [
      C('M-4 -130L4 -130L5 60L-5 60Z', 'hide', 'stripes', 0.3),
      C(
        'M2 -140C26 -150 50 -140 56 -112C50 -90 30 -80 4 -84Z',
        'pale',
        'curls',
        0.5,
      ),
      C('M-4 -138L8 -138L8 -84L-4 -84Z', 'black'),
    ],
  },
  hoe: {
    box: [-20, -170, 80, 250],
    shapes: [
      C('M-3 -150L3 -150L4 60L-4 60Z', 'hide', 'stripes', 0.3),
      C('M-6 -160L50 -150L50 -136L-4 -142Z', 'black', 'dots', 0.4),
    ],
  },
  staff: {
    upright: true,
    box: [-30, -260, 60, 330],
    shapes: [
      C('M-3 -220L3 -220L4 60L-4 60Z', 'hide', 'stripes', 0.3),
      C(
        'M0 -250C-18 -250 -22 -226 -10 -216L10 -216C22 -226 18 -250 0 -250Z',
        'yellow',
        'curls',
        0.45,
      ),
      L(
        'M-14 -238C-24 -232 -24 -220 -16 -214M14 -238C24 -232 24 -220 16 -214',
        1.6,
      ),
    ],
  },
  brush: {
    box: [-10, -60, 30, 90],
    shapes: [
      C('M-2 -50L2 -50L3 14L-3 14Z', 'hide'),
      C('M-3 14L3 14C5 22 2 30 0 34C-2 30 -5 22 -3 14Z', 'black'),
    ],
  },
  book: {
    box: [-30, -40, 70, 70],
    shapes: [
      C('M-20 -30L30 -26L28 20L-22 16Z', 'yellow', 'stripes', 0.35),
      L('M-12 -20L-14 10M-2 -19L-4 11M8 -18L6 12M18 -17L16 13', 1.4),
    ],
  },
  pill: {
    box: [-14, -14, 28, 28],
    shapes: [dot(0, 0, 7, 'pale'), dot(0, 0, 3.5, 'yellow')],
  },
  hairpin: {
    box: [-10, -70, 30, 90],
    shapes: [
      L('M0 10L6 -60', 2.6),
      dot(6, -62, 5, 'yellow'),
      L('M8 -58L14 -40M4 -58L2 -42', 1),
    ],
  },
  stone: {
    box: [-16, -16, 32, 32],
    shapes: [C('M-12 -2L-6 -12L8 -11L13 0L7 11L-8 10Z', 'blue', 'dots', 0.35)],
  },
  spear: {
    upright: true,
    box: [-20, -260, 40, 330],
    shapes: [
      C('M-3 -220L3 -220L4 60L-4 60Z', 'hide'),
      C('M0 -262L8 -232L0 -218L-8 -232Z', 'pale'),
      C('M-8 -218L8 -218L0 -200Z', 'red'),
    ],
  },
  flag: {
    upright: true,
    box: [-10, -280, 120, 340],
    shapes: [
      C('M-3 -260L3 -260L4 60L-4 60Z', 'hide'),
      C('M3 -256L96 -244L84 -224L98 -204L84 -186L4 -180Z', 'red', 'curls', 0.6),
    ],
  },
  crutch: {
    upright: true,
    box: [-30, -30, 50, 250],
    shapes: [
      C('M-20 -14L16 -14L16 -6L4 -6L4 186L-4 186L-4 -6L-20 -6Z', 'hide'),
    ],
  },
  pole: {
    box: [-150, -60, 300, 140],
    shapes: [
      L('M-130 -6L130 -14', 4),
      L('M-120 -6L-140 50M-120 -6L-100 50M120 -14L100 44M120 -14L140 44', 1.2),
      C('M-146 46L-94 46L-100 76L-140 76Z', 'hide', 'lattice', 0.5),
      C('M94 40L146 40L140 70L100 70Z', 'hide', 'lattice', 0.5),
    ],
    upright: true,
  },
  fan: {
    box: [-40, -70, 80, 80],
    shapes: [
      C('M0 0L-34 -50C-14 -64 14 -64 34 -50Z', 'pale', 'stripes', 0.4),
      L('M0 0L-34 -50M0 0L-17 -60M0 0L0 -63M0 0L17 -60M0 0L34 -50', 1),
    ],
  },
}

// A person, from a look: the parts, their joints and where the rods go
export function person(look: Look): PuppetDef {
  const hair = look.hair ?? 'black'
  const lady = look.skirt === 'skirt'
  const nagaTail = look.skirt === 'tail'
  // the hips stand higher for a long skirt, which reaches the ground
  const hipY = lady ? -206 : nagaTail ? -150 : -215
  const parts: Array<PartDef> = [
    {
      id: 'hips',
      at: [0, hipY],
      z: 5,
      box: lady ? [-52, -10, 96, 220] : [-56, -10, 100, 175],
      shapes: skirtShapes(look),
      scale: [1.12, 1],
    },
    {
      id: 'torso',
      parent: 'hips',
      at: [0, 0],
      z: 7,
      box: [-42, -160, 86, 166],
      shapes: coatShapes(look),
      rest: look.stoop ?? 0,
      scale: [1.14, 1],
    },
    {
      id: 'head',
      parent: 'torso',
      at: [8, -149],
      z: 6,
      box: [-72, -120, 144, 190],
      shapes: [
        C('M-8 14L10 14L10 -14L-6 -16Z', 'hide'),
        ...faceShapes(look.face, hair),
        ...beardShapes(look.beard, hair),
        ...hatShapes(look.hat ?? 'none', look),
      ],
      rest: -(look.stoop ?? 0) * 0.6,
      scale: look.face === 'child' ? [1.45, 1.45] : [1.3, 1.3],
    },
    {
      id: 'armF',
      parent: 'torso',
      at: [-3, -128],
      z: 1,
      box: [-24, -18, 46, 106],
      shapes: upperArmShapes(look),
      rest: -4,
    },
    {
      id: 'foreF',
      parent: 'armF',
      at: [0, 78],
      z: 2,
      box: [-20, -10, 40, 110],
      shapes: foreArmShapes(look, false),
      grip: foreArmShapes(look, true),
      rest: -18,
    },
    {
      id: 'armN',
      parent: 'torso',
      at: [5, -126],
      z: 8,
      box: [-24, -18, 46, 106],
      shapes: upperArmShapes(look),
      rest: -8,
    },
    {
      id: 'foreN',
      parent: 'armN',
      at: [0, 78],
      z: 9,
      box: [-20, -10, 40, 110],
      shapes: foreArmShapes(look, false),
      grip: foreArmShapes(look, true),
      rest: -22,
    },
  ]
  if (look.skirt === 'robe' || look.skirt === 'skirt' || look.skirt === 'tail')
    parts.push({
      id: 'sash',
      parent: 'hips',
      at: [lady || nagaTail ? 12 : 16, 4],
      z: 6,
      box: [-20, -24, 54, lady ? 230 : 170],
      shapes: sashShapes(look, lady),
      rest: 4,
    })
  if (look.sleeves === 'water') {
    parts.push(
      {
        id: 'cuffF',
        parent: 'foreF',
        at: [0, 58],
        z: 2,
        box: [-20, -8, 42, 110],
        shapes: WATER_SLEEVE,
        rest: 6,
      },
      {
        id: 'cuffN',
        parent: 'foreN',
        at: [0, 58],
        z: 10,
        box: [-20, -8, 42, 110],
        shapes: WATER_SLEEVE,
        rest: 6,
      },
    )
  }
  if (nagaTail) {
    const seg = (n: number, w0: number, w1: number, len: number): Shape =>
      C(
        `M${-w0} 0C${-w0} ${len * 0.4} ${-w1 - 10} ${len * 0.8} ${-w1} ${len}L${w1} ${len}C${w1 + 6} ${len * 0.7} ${w0} ${len * 0.4} ${w0} 0Z`,
        n % 2 ? 'green' : 'green',
        'scales',
        0.5,
      )
    parts.push(
      {
        id: 'tail1',
        parent: 'hips',
        at: [4, 96],
        z: 4,
        box: [-34, -10, 68, 110],
        shapes: [seg(1, 17, 14, 92)],
        rest: 40,
      },
      {
        id: 'tail2',
        parent: 'tail1',
        at: [0, 88],
        z: 3,
        box: [-30, -10, 60, 100],
        shapes: [seg(2, 14, 10, 84)],
        rest: 30,
      },
      {
        id: 'tail3',
        parent: 'tail2',
        at: [0, 80],
        z: 2,
        box: [-26, -10, 52, 92],
        shapes: [seg(3, 10, 2, 76), L('M-2 76C-12 90 -2 102 10 96', 2.4)],
        rest: 70,
      },
    )
  } else {
    const legAt = lady ? 192 : 34
    parts.push(
      {
        id: 'legF',
        parent: 'hips',
        at: [-6, legAt],
        z: 3,
        box: [-20, -10, 66, 196],
        shapes: legShapes(look),
        rest: 3,
      },
      {
        id: 'legN',
        parent: 'hips',
        at: [4, legAt],
        z: 4,
        box: [-20, -10, 66, 196],
        shapes: legShapes(look),
        rest: -3,
      },
    )
  }
  if (look.tail)
    parts.push({
      id: 'tail',
      parent: 'hips',
      at: [-22, 50],
      z: 2,
      box: [-90, -20, 100, 110],
      shapes: [
        C(
          'M0 0C-20 10 -40 30 -50 60C-56 76 -70 86 -84 80C-70 76 -62 64 -58 50C-50 26 -30 6 -4 -8Z',
          'yellow',
          'stripes',
          0.5,
        ),
      ],
      rest: 0,
    })
  if (look.hat === 'helmet')
    parts.push({
      id: 'plume',
      parent: 'head',
      at: [3, -100],
      z: 6,
      box: [-170, -130, 190, 150],
      shapes: [
        C(
          'M0 0C-30 -40 -90 -70 -150 -60C-160 -58 -164 -54 -160 -50C-100 -60 -40 -36 5 5Z',
          'pale',
          'stripes',
          0.45,
        ),
        C(
          'M4 -2C-20 -50 -70 -100 -130 -110C-140 -110 -142 -104 -138 -100C-80 -92 -26 -52 9 2Z',
          'pale',
          'stripes',
          0.45,
        ),
      ],
      rest: 0,
    })
  return {
    rig: 'human',
    parts,
    rods: [
      { part: 'torso', at: [4, -136] },
      { part: 'foreF', at: [1, 80] },
      { part: 'foreN', at: [1, 80] },
    ],
    holds: look.holds,
    holdsFar: look.holdsFar,
    height: -hipY + 245,
    size: look.size,
  }
}

// A puppet's parts with what it holds: `hold` is the thing in its near
// hand ('' for nothing), or what it holds by default
export function partsOf(def: PuppetDef, hold?: string): Array<PartDef> {
  const near = hold ?? def.holds
  const far = def.holdsFar
  const parts = def.parts.map((p) =>
    (p.id === 'foreN' && near) || (p.id === 'foreF' && far)
      ? { ...p, shapes: p.grip ?? p.shapes }
      : p,
  )
  for (const [name, arm] of [
    [near, 'foreN'],
    [far, 'foreF'],
  ] as const) {
    const prop = name
      ? (PROPS[name] as (typeof PROPS)[string] | undefined)
      : undefined
    // only a puppet with hands holds anything
    if (!prop || !parts.some((p) => p.id === arm)) continue
    parts.push({
      id: arm === 'foreN' ? 'propN' : 'propF',
      parent: arm,
      at: [1, 74],
      z: arm === 'foreN' ? 11 : 0,
      box: prop.box,
      shapes: prop.shapes,
      rest: prop.rest ?? 0,
      upright: prop.upright,
    })
  }
  return parts
}

// --- Beasts ---

// An ox or a horse: a body on four legs, a head on the neck, a tail
function beast(kind: 'ox' | 'horse', dye: Dye, cloth: Dye): PuppetDef {
  if (kind === 'ox')
    return {
      rig: 'beast',
      height: 300,
      saddle: [4, -98],
      rods: [
        { part: 'body', at: [0, -50] },
        { part: 'head', at: [40, 0] },
      ],
      parts: [
        {
          id: 'body',
          at: [0, -150],
          z: 5,
          box: [-160, -110, 310, 170],
          shapes: [
            C(
              'M-150 -34C-154 -66 -120 -82 -74 -82C-50 -98 -12 -102 22 -96C56 -98 92 -92 112 -78C134 -64 142 -44 140 -20C138 8 124 30 98 40C70 50 30 52 -10 52C-60 52 -110 50 -132 36C-150 22 -152 -8 -150 -34Z',
              dye,
              'curls',
              1.1,
            ),
            C(
              'M-46 -90C-14 -102 36 -102 64 -94L68 -38C36 -32 -14 -32 -48 -38Z',
              cloth,
              'coins',
              0.7,
            ),
            C(
              'M-48 -40C-14 -34 36 -34 68 -40L68 -30C36 -24 -14 -24 -48 -30Z',
              'yellow',
              'teeth',
              0.4,
            ),
            L('M-110 20C-80 34 -40 38 0 38M60 -60C70 -40 70 -20 64 0', 1.6),
          ],
        },
        {
          id: 'head',
          parent: 'body',
          at: [126, -54],
          z: 6,
          box: [-36, -80, 120, 120],
          shapes: [
            C(
              'M-10 -20C6 -34 30 -36 46 -28C60 -22 70 -6 74 12C76 24 70 32 60 32C50 32 44 26 38 20C24 22 6 18 -6 10C-14 4 -16 -10 -10 -20Z',
              dye,
              'curls',
              0.7,
            ),
            C(
              'M54 4C64 4 72 10 74 16C74 26 68 32 60 32C52 32 46 26 46 18C46 10 48 6 54 4Z',
              'pale',
            ),
            C(
              'M18 -30C10 -52 -6 -64 -24 -66C-14 -58 -6 -48 -2 -30Z',
              'pale',
              'stripes',
              0.4,
            ),
            C(
              'M30 -32C30 -54 40 -68 56 -72C48 -62 42 -48 40 -30Z',
              'pale',
              'stripes',
              0.4,
            ),
            C('M6 -24C-6 -30 -18 -26 -22 -18C-12 -14 0 -14 6 -18Z', dye),
            L('M28 -12C33 -15 39 -15 43 -12C39 -10 33 -10 28 -12Z', 1.5),
            dot(37, -12.5, 1.8),
            L('M62 16C66 14 70 16 70 20', 1.3),
          ],
          rest: 4,
        },
        ...(
          [
            ['legBF', -96, 30, 1, true],
            ['legFF', 80, 32, 2, false],
            ['legBN', -112, 32, 7, true],
            ['legFN', 96, 34, 8, false],
          ] as const
        ).map(([id, x, y, z, back]) => ({
          id,
          parent: 'body',
          at: [x, y] as const,
          z,
          box: [-28, -20, 56, 144] as const,
          shapes: back
            ? [
                C(
                  'M-22 -14C-26 20 -14 50 -6 70L-10 108L-14 120L12 120L8 108L10 70C16 46 20 14 18 -14Z',
                  dye,
                  'curls',
                  0.6,
                ),
                L('M-1 110L-1 120', 1.4),
              ]
            : [
                C(
                  'M-16 -10C-18 20 -12 50 -10 80L-11 108L-14 120L12 120L8 108L8 80C12 50 16 20 14 -10Z',
                  dye,
                  'curls',
                  0.6,
                ),
                L('M-1 110L-1 120', 1.4),
              ],
        })),
        {
          id: 'tail',
          parent: 'body',
          at: [-148, -44],
          z: 4,
          box: [-24, -10, 34, 132],
          shapes: [
            C('M0 0C-6 30 -10 60 -8 90L-3 90C-3 60 1 30 5 0Z', dye),
            C(
              'M-12 88C-14 100 -10 112 -4 116C2 110 4 100 0 88Z',
              'black',
              'stripes',
              0.4,
            ),
          ],
          rest: 10,
        },
      ],
    }
  return {
    rig: 'beast',
    height: 330,
    saddle: [-8, -80],
    rods: [
      { part: 'body', at: [0, -40] },
      { part: 'head', at: [60, -60] },
    ],
    parts: [
      {
        id: 'body',
        at: [0, -172],
        z: 5,
        box: [-140, -100, 270, 150],
        shapes: [
          C(
            'M-130 -20C-132 -48 -104 -64 -66 -64L40 -66C74 -68 100 -60 114 -44C124 -32 126 -12 120 6C112 26 92 36 64 38L-60 40C-96 40 -124 26 -130 6Z',
            dye,
            'curls',
            0.9,
          ),
          C('M-52 -62L26 -64L30 8C2 16 -28 16 -56 8Z', cloth, 'lattice', 0.8),
          C(
            'M-56 0C-28 8 2 8 30 0L30 12C2 20 -28 20 -56 12Z',
            'yellow',
            'teeth',
            0.4,
          ),
          C(
            'M-42 -70C-32 -84 -12 -84 2 -76L14 -86L18 -66L-46 -62Z',
            'black',
            'dots',
            0.4,
          ),
        ],
      },
      {
        id: 'head',
        parent: 'body',
        at: [96, -46],
        z: 6,
        box: [-30, -110, 130, 140],
        shapes: [
          C(
            'M-20 10C-14 -20 -4 -50 14 -76C22 -86 34 -90 44 -86C58 -84 70 -76 84 -60C90 -54 92 -46 86 -42C80 -38 72 -40 66 -44L52 -50C44 -40 36 -24 32 -6C26 10 10 18 -4 18Z',
            dye,
            'curls',
            0.6,
          ),
          C(
            'M-14 -6C-6 -36 6 -62 20 -82L10 -86C-4 -66 -18 -36 -26 -8Z',
            'black',
            'stripes',
            0.45,
          ),
          C('M30 -86L33 -104L41 -88Z', dye),
          L('M44 -72C48 -75 53 -75 56 -72C53 -70 48 -70 44 -72Z', 1.4),
          dot(51, -72.5, 1.7),
          L('M40 -62L70 -48M46 -80L52 -58', 1.2),
        ],
        rest: 0,
      },
      ...(
        [
          ['legBF', -86, 24, 1, true],
          ['legFF', 66, 28, 2, false],
          ['legBN', -100, 26, 7, true],
          ['legFN', 80, 30, 8, false],
        ] as const
      ).map(([id, x, y, z, back]) => ({
        id,
        parent: 'body',
        at: [x, y] as const,
        z,
        box: [-26, -16, 50, 162] as const,
        shapes: back
          ? [
              C(
                'M-20 -12C-24 20 -14 50 -4 74L-8 128L-12 142L10 142L8 128L10 74C18 50 20 20 16 -12Z',
                dye,
                'curls',
                0.5,
              ),
              C('M-12 134L10 134L10 142L-12 142Z', 'black'),
            ]
          : [
              C(
                'M-12 -8C-14 30 -10 60 -8 100L-8 128L-12 142L10 142L8 128L8 100C12 60 14 30 12 -8Z',
                dye,
                'curls',
                0.5,
              ),
              C('M-12 134L10 134L10 142L-12 142Z', 'black'),
            ],
      })),
      {
        id: 'tail',
        parent: 'body',
        at: [-128, -30],
        z: 4,
        box: [-46, -10, 64, 140],
        shapes: [
          C(
            'M0 0C-20 10 -34 40 -36 80C-36 100 -30 116 -20 124C-24 100 -20 70 -10 40C-4 24 4 12 10 4Z',
            'black',
            'stripes',
            0.45,
          ),
        ],
        rest: 0,
      },
    ],
  }
}

// --- Small things that fly or hop ---

function butterfly(): PuppetDef {
  const wing = (dye: Dye): Array<Shape> => [
    C(
      'M0 0C-10 -30 -6 -60 16 -66C34 -70 44 -54 38 -36C34 -24 20 -10 0 0Z',
      dye,
      'curls',
      0.75,
    ),
    C(
      'M0 0C-14 -4 -30 -2 -36 10C-40 22 -30 32 -18 28C-8 24 -2 12 0 0Z',
      dye,
      'dots',
      0.6,
    ),
  ]
  return {
    rig: 'flyer',
    height: 90,
    rods: [{ part: 'body', at: [0, 2] }],
    parts: [
      {
        id: 'body',
        at: [0, -60],
        z: 5,
        box: [-30, -36, 72, 50],
        shapes: [
          C(
            'M-20 4C-20 0 -10 -2 18 -2C24 -2 26 2 22 4C10 8 -10 8 -20 4Z',
            'black',
          ),
          L('M20 -2C26 -12 30 -20 36 -22M18 -2C22 -14 24 -22 28 -26', 1.2),
        ],
      },
      {
        id: 'wingF',
        parent: 'body',
        at: [2, -2],
        z: 3,
        box: [-44, -76, 92, 116],
        shapes: wing('orange'),
        rest: 6,
      },
      {
        id: 'wingN',
        parent: 'body',
        at: [-2, -1],
        z: 6,
        box: [-44, -76, 92, 116],
        shapes: wing('yellow'),
        rest: -4,
      },
    ],
  }
}

function bird(): PuppetDef {
  return {
    rig: 'flyer',
    height: 70,
    rods: [{ part: 'body', at: [0, 4] }],
    parts: [
      {
        id: 'body',
        at: [0, -40],
        z: 5,
        box: [-84, -30, 136, 50],
        shapes: [
          C(
            'M-30 0C-26 -12 -10 -18 6 -16C16 -22 28 -22 34 -14L44 -12L34 -8C30 4 18 12 0 12C-14 12 -24 8 -30 0Z',
            'black',
            'dots',
            0.4,
          ),
          C('M-10 4C0 10 14 8 22 0L18 -6C6 0 -4 2 -10 4Z', 'pale'),
          C('M-28 -2L-78 -18L-80 -8L-30 6Z', 'blue', 'stripes', 0.4),
          dot(28, -15, 1.6, 'pale'),
        ],
      },
      {
        id: 'wingN',
        parent: 'body',
        at: [-2, -10],
        z: 6,
        box: [-70, -52, 76, 60],
        shapes: [
          C(
            'M0 0C-16 -20 -36 -40 -62 -44C-50 -30 -40 -20 -20 -4Z',
            'blue',
            'stripes',
            0.4,
          ),
        ],
        rest: -10,
      },
      {
        id: 'wingF',
        parent: 'body',
        at: [2, -12],
        z: 3,
        box: [-70, -52, 76, 60],
        shapes: [
          C('M0 0C-16 -20 -36 -40 -62 -44C-50 -30 -40 -20 -20 -4Z', 'black'),
        ],
        rest: -30,
      },
    ],
  }
}

// A dragon (龙): a head with a jaw that opens as it speaks, six scaled
// segments that ripple one after another, clawed legs, and a tail with a
// tuft of flame. It flies head first, its body trailing behind.
function dragon(): PuppetDef {
  const LEN = 76
  const seg = (k: number): Array<Shape> => {
    const t0 = 40 - 3.4 * (k - 1)
    const t1 = 40 - 3.4 * k
    // fins along its back, leaning back
    let fins = `M2 ${-t0 + 2}`
    for (let i = 0; i < 4; i++) {
      const x0 = -i * 19
      const tt = t0 + ((t1 - t0) * i) / 4
      fins += `L${x0 - 6} ${-tt - 15}L${x0 - 18} ${-tt + 1}`
    }
    fins += `L${-LEN} ${-t1 + 3}Z`
    return [
      C(fins, 'red', 'stripes', 0.4),
      C(
        `M3 ${-t0}C-20 ${-t0 - 3} -54 ${-t1 - 3} ${-LEN - 3} ${-t1}L${-LEN - 3} ${t1}C-54 ${t1 + 3} -20 ${t0 + 3} 3 ${t0}Z`,
        'green',
        'scales',
        0.75,
      ),
      C(
        `M3 ${t0 - 9}C-20 ${t0 - 7} -54 ${t1 - 7} ${-LEN - 3} ${t1 - 9}L${-LEN - 3} ${t1}C-54 ${t1 + 3} -20 ${t0 + 3} 3 ${t0}Z`,
        'yellow',
        'stripes',
        0.45,
      ),
    ]
  }
  const leg = (dye: Dye): Array<Shape> => [
    C(
      'M-9 -4C-15 14 -9 30 3 40L10 44C-4 34 -10 18 -8 2Z M-9 -4L10 -4C14 14 12 30 10 44L3 40Z',
      dye,
      'dots',
      0.4,
    ),
    C('M2 38L30 40L22 46L34 52L20 52L24 62L6 52Z', 'pale'),
  ]
  const body: Array<PartDef> = Array.from({ length: 6 }, (_, i) => ({
    id: `seg${i + 1}`,
    parent: i ? `seg${i}` : 'head',
    at: [i ? -LEN : 4, 0] as const,
    z: 19 - i,
    box: [-LEN - 6, -62, LEN + 12, 112] as const,
    shapes: seg(i + 1),
  }))
  return {
    rig: 'dragon',
    height: 170,
    rods: [
      { part: 'head', at: [62, -6] },
      { part: 'seg3', at: [-38, 0] },
    ],
    parts: [
      {
        id: 'head',
        at: [0, -70],
        z: 20,
        scale: [1.4, 1.4],
        box: [-30, -104, 224, 196],
        shapes: [
          C(
            'M2 -16L-22 -40L-6 -34L-20 -64L4 -46L2 -76L18 -50L24 -38Z M2 12L-20 34L-4 30L-12 52L8 34Z',
            'red',
            'stripes',
            0.5,
          ),
          C(
            'M28 -40C22 -62 26 -84 40 -98L46 -92C36 -80 34 -64 38 -50L50 -70L56 -64L44 -44Z',
            'pale',
            'stripes',
            0.4,
          ),
          C(
            'M0 -20C14 -36 44 -46 74 -40C92 -36 104 -28 116 -26C126 -24 136 -20 138 -12C139 -6 134 -2 126 -2L96 0C88 0 80 -2 72 2C60 6 40 10 22 8L0 12Z',
            'green',
            'scales',
            0.5,
          ),
          C('M48 -34C56 -48 72 -50 84 -42C74 -42 64 -38 58 -30Z', 'red'),
          dot(64, -24, 8, 'pale'),
          dot(66, -24, 3.6),
          dot(124, -15, 2.6),
          L('M118 -24C124 -30 132 -28 132 -22', 1.6),
          L('M76 1L80 7L84 1L88 7L92 1L96 7L100 1', 1.4),
          L('M112 -12C140 -24 170 -14 186 10C192 20 186 28 178 24', 2.6),
        ],
      },
      {
        id: 'jaw',
        parent: 'head',
        at: [14, 14],
        z: 21,
        scale: [1.4, 1.4],
        box: [-10, -8, 160, 100],
        shapes: [
          C(
            'M-4 2C20 2 46 0 64 -4C80 -6 94 -4 102 2C100 10 88 14 76 12C56 12 30 16 10 16L-4 12Z',
            'green',
            'scales',
            0.45,
          ),
          L('M66 -3L70 -9L74 -3L78 -9L82 -3', 1.4),
          C(
            'M30 14C34 32 26 48 16 56C30 50 46 34 48 14Z',
            'pale',
            'stripes',
            0.4,
          ),
          L('M94 4C116 20 132 44 126 66C124 74 116 76 112 70', 2.6),
        ],
        rest: 4,
      },
      ...body,
      {
        id: 'tail',
        parent: 'seg6',
        at: [-LEN, 0],
        z: 12,
        box: [-136, -40, 144, 80],
        shapes: [
          C(
            'M-80 0L-118 -34L-102 -8L-130 -16L-104 6L-124 22L-86 6Z',
            'red',
            'stripes',
            0.5,
          ),
          C(
            'M3 -15C-30 -14 -64 -8 -92 0C-64 8 -30 14 3 15Z',
            'green',
            'scales',
            0.6,
          ),
        ],
      },
      ...(
        [
          ['legFF', 'seg1', -34, 26, 4],
          ['legFN', 'seg1', -42, 28, 24],
          ['legBF', 'seg4', -30, 18, 4],
          ['legBN', 'seg4', -38, 20, 24],
        ] as const
      ).map(([id, parent, x, y, z]) => ({
        id,
        parent,
        at: [x, y] as const,
        z,
        scale: [1.35, 1.35] as const,
        box: [-22, -8, 60, 74] as const,
        shapes: leg('green'),
      })),
    ],
  }
}

function rabbit(): PuppetDef {
  return {
    rig: 'hopper',
    height: 90,
    rods: [{ part: 'body', at: [0, 0] }],
    parts: [
      {
        id: 'body',
        at: [0, -30],
        z: 5,
        box: [-48, -30, 96, 62],
        shapes: [
          C(
            'M-34 10C-36 -10 -24 -24 -6 -24C6 -24 14 -18 18 -10C26 -16 38 -14 42 -4C46 6 40 14 30 16L22 18C24 24 20 28 14 28L-24 28C-34 28 -36 20 -34 10Z',
            'pale',
            'dots',
            0.5,
          ),
          dot(-38, 0, 6, 'pale'),
          dot(34, -4, 1.6),
          L('M-4 0C2 8 4 16 2 26', 1.2),
        ],
      },
      {
        id: 'ears',
        parent: 'body',
        at: [28, -14],
        z: 4,
        box: [-10, -56, 40, 60],
        shapes: [
          C('M0 0C-4 -20 -2 -40 4 -50C10 -40 10 -20 6 0Z', 'pale'),
          C('M6 0C8 -20 16 -36 24 -42C24 -30 18 -14 12 2Z', 'pale'),
        ],
        rest: 0,
      },
    ],
  }
}

// --- The cast: every kind of puppet the stories name ---

const LOOKS: Record<string, Look> = {
  // Laozi: an old sage with a long white beard and a Daoist crown
  sage: {
    face: 'old',
    hat: 'daoist',
    beard: 'long',
    hair: 'pale',
    coat: 'robe',
    skirt: 'robe',
    sleeves: 'wide',
    dye: 'blue',
    trim: 'yellow',
    cut: 'curls',
    stoop: 10,
  },
  // the keeper of the pass, an official in a winged hat
  official: {
    face: 'young',
    hat: 'official',
    beard: 'curtain',
    coat: 'robe',
    skirt: 'robe',
    sleeves: 'wide',
    dye: 'red',
    trim: 'green',
    cut: 'flowers',
    badge: true,
  },
  // Zhuangzi: a scholar
  scholar: {
    face: 'young',
    hat: 'scholar',
    coat: 'robe',
    skirt: 'robe',
    sleeves: 'wide',
    dye: 'green',
    trim: 'yellow',
    cut: 'lattice',
    holds: 'fan',
  },
  // Hou Yi, the archer
  archer: {
    face: 'young',
    hat: 'helmet',
    coat: 'armor',
    skirt: 'armor',
    sleeves: 'armor',
    dye: 'red',
    trim: 'yellow',
    holdsFar: 'bow',
  },
  // Chang'e
  lady: {
    face: 'lady',
    size: 0.95,
    hat: 'bun',
    coat: 'lady',
    skirt: 'skirt',
    sleeves: 'water',
    dye: 'pale',
    trim: 'red',
    cut: 'flowers',
  },
  // the weaver girl
  weaver: {
    face: 'lady',
    size: 0.95,
    hat: 'bun',
    coat: 'lady',
    skirt: 'skirt',
    sleeves: 'water',
    dye: 'purple',
    trim: 'yellow',
    cut: 'flowers',
  },
  // the Queen Mother of heaven
  queen: {
    face: 'lady',
    hat: 'phoenix',
    coat: 'lady',
    skirt: 'skirt',
    sleeves: 'water',
    dye: 'yellow',
    trim: 'red',
    cut: 'coins',
    holds: 'hairpin',
  },
  // Nüwa, a goddess with a snake's tail
  nuwa: {
    face: 'lady',
    hat: 'bun',
    coat: 'lady',
    skirt: 'tail',
    sleeves: 'water',
    dye: 'green',
    trim: 'red',
    cut: 'scales',
  },
  // an old man of the frontier, with a staff
  elder: {
    face: 'old',
    hat: 'hood',
    beard: 'long',
    hair: 'pale',
    coat: 'robe',
    skirt: 'robe',
    sleeves: 'wide',
    dye: 'hide',
    trim: 'blue',
    cut: 'dots',
    stoop: 14,
    holds: 'staff',
  },
  // Yugong, ninety, with his hoe
  yugong: {
    face: 'old',
    hat: 'wrap',
    beard: 'long',
    hair: 'pale',
    coat: 'tunic',
    skirt: 'tunic',
    sleeves: 'tight',
    dye: 'blue',
    trim: 'hide',
    legs: 'pale',
    stoop: 16,
    holds: 'hoe',
  },
  // a young man of the village
  youth: {
    face: 'young',
    hat: 'topknot',
    coat: 'tunic',
    skirt: 'tunic',
    sleeves: 'tight',
    dye: 'green',
    trim: 'red',
    legs: 'hide',
  },
  // the cowherd
  cowherd: {
    face: 'young',
    hat: 'topknot',
    coat: 'tunic',
    skirt: 'tunic',
    sleeves: 'tight',
    dye: 'blue',
    trim: 'red',
    legs: 'pale',
  },
  // villagers, men and women
  villager: {
    face: 'young',
    hat: 'wrap',
    coat: 'tunic',
    skirt: 'tunic',
    sleeves: 'tight',
    dye: 'hide',
    trim: 'blue',
    legs: 'blue',
  },
  villager2: {
    face: 'lady',
    size: 0.93,
    hat: 'bun',
    coat: 'tunic',
    skirt: 'tunic',
    sleeves: 'tight',
    dye: 'red',
    trim: 'green',
    legs: 'green',
    boots: 'red',
  },
  // a soldier with a flag
  soldier: {
    face: 'young',
    hat: 'helmet',
    coat: 'armor',
    skirt: 'armor',
    sleeves: 'armor',
    dye: 'red',
    trim: 'red',
    holds: 'flag',
  },
  soldier2: {
    face: 'young',
    hat: 'wrap',
    coat: 'armor',
    skirt: 'armor',
    sleeves: 'armor',
    dye: 'green',
    trim: 'green',
    armor: 'green',
    holds: 'spear',
  },
  // the Jade Emperor
  emperor: {
    face: 'old',
    hat: 'crown',
    beard: 'curtain',
    coat: 'robe',
    skirt: 'robe',
    sleeves: 'wide',
    dye: 'yellow',
    trim: 'red',
    cut: 'scales',
    badge: true,
  },
  // Tang Sanzang
  monk: {
    face: 'young',
    hat: 'monk',
    coat: 'kasaya',
    skirt: 'robe',
    sleeves: 'wide',
    dye: 'yellow',
    trim: 'red',
    cut: 'lattice',
    holds: 'staff',
  },
  // Sun Wukong
  monkey: {
    face: 'monkey',
    coat: 'tunic',
    skirt: 'tiger',
    sleeves: 'tight',
    dye: 'red',
    trim: 'yellow',
    legs: 'yellow',
    holds: 'cudgel',
    tail: true,
  },
  // Pangu
  giant: {
    face: 'giant',
    hat: 'horns',
    beard: 'wild',
    coat: 'bare',
    skirt: 'leaves',
    sleeves: 'bare',
    dye: 'hide',
    trim: 'green',
    holds: 'axe',
  },
  // a god of heaven, in armour
  god: {
    face: 'young',
    hat: 'helmet',
    beard: 'curtain',
    coat: 'armor',
    skirt: 'armor',
    sleeves: 'armor',
    dye: 'yellow',
    trim: 'blue',
  },
  // the children of the cowherd
  child: {
    face: 'child',
    size: 0.58,
    hat: 'topknot',
    coat: 'tunic',
    skirt: 'tunic',
    sleeves: 'tight',
    dye: 'red',
    trim: 'yellow',
    legs: 'green',
  },
  girl: {
    face: 'child',
    size: 0.55,
    hat: 'buns',
    coat: 'tunic',
    skirt: 'tunic',
    sleeves: 'tight',
    dye: 'green',
    trim: 'red',
    legs: 'red',
    boots: 'red',
  },
  // another god, in blue
  god2: {
    face: 'young',
    hat: 'helmet',
    beard: 'curtain',
    coat: 'armor',
    skirt: 'armor',
    sleeves: 'armor',
    dye: 'blue',
    trim: 'green',
    armor: 'blue',
  },
  // Lord Ye, who loves dragons: scales on his robe, a dragon on his badge
  lord: {
    face: 'young',
    hat: 'official',
    beard: 'curtain',
    coat: 'robe',
    skirt: 'robe',
    sleeves: 'wide',
    dye: 'green',
    trim: 'yellow',
    cut: 'scales',
    badge: true,
  },
  // the wise old man who laughs at Yugong
  elder2: {
    face: 'old',
    hat: 'scholar',
    beard: 'curtain',
    hair: 'pale',
    coat: 'robe',
    skirt: 'robe',
    sleeves: 'wide',
    dye: 'purple',
    trim: 'yellow',
    cut: 'flowers',
    stoop: 8,
    holds: 'fan',
  },
}

const BUILT = new Map<string, PuppetDef>()

// The puppet of a kind, as the stories name it ('sage', 'ox', 'butterfly')
export function puppetOf(kind: string): PuppetDef | undefined {
  const made = BUILT.get(kind)
  if (made) return made
  const look = LOOKS[kind] as Look | undefined
  const def = look
    ? person(look)
    : kind === 'ox'
      ? beast('ox', 'hide', 'red')
      : kind === 'horse'
        ? beast('horse', 'red', 'green')
        : kind === 'horse2'
          ? beast('horse', 'pale', 'blue')
          : kind === 'butterfly'
            ? butterfly()
            : kind === 'bird'
              ? bird()
              : kind === 'rabbit'
                ? rabbit()
                : kind === 'dragon'
                  ? dragon()
                  : undefined
  if (def) BUILT.set(kind, def)
  return def
}

export const PUPPET_KINDS = [
  ...Object.keys(LOOKS),
  'ox',
  'horse',
  'horse2',
  'butterfly',
  'bird',
  'rabbit',
  'dragon',
]
