// The practice demos listed on /#play
export const DEMOS = [
  {
    id: 'lanterns',
    title: 'Lanterns',
    zh: '灯笼',
    sprite: 'lantern',
    blurb:
      'A word is said and lanterns rise into the night. Tap the right one before it floats away.',
    trains: 'By ear · sound to character',
  },
  {
    id: 'boat',
    title: 'Dragon boats',
    zh: '龙舟',
    sprite: 'map',
    blurb:
      'Review’s questions as a race: right answers row, wrong ones stall you while the rival pulls ahead.',
    trains: 'Speed · each word’s weakest link',
  },
  {
    id: 'grid',
    title: 'Character grid',
    zh: '字阵',
    sprite: 'parts',
    blurb:
      'Your words hidden in a grid of characters. Trace each one from its meaning.',
    trains: 'Reading · meaning to character',
  },
  {
    id: 'pairs',
    title: 'Sound pairs',
    zh: '听对',
    sprite: 'ear',
    blurb:
      'A memory game where half the cards only speak. Match each character to its sound.',
    trains: 'Memory · sound to character',
  },
] as const
