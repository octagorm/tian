// Made by scripts/map.ts; do not edit. The trip's map is
// public/art/trip/map.png, 240 × 240; cities are in its pixels.
export const MAP_W = 240
export const MAP_H = 240
export const MAP_SRC = '/art/trip/map.png'
export const CITY_AT: Record<string, [number, number] | undefined> = {
  beijing: [156, 24],
  qufu: [161, 66],
  xian: [95, 79],
  chengdu: [54, 114],
  guilin: [106, 167],
  shanghai: [198, 109],
}
