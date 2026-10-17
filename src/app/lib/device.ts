// A phone or a tablet without a mouse or keyboard: the home screen and
// Today leave out the games that need a keyboard there (Pinyin rain, typed
// against the clock), and boards start small.
export const touchOnly = () =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(pointer: coarse)').matches &&
  !matchMedia('(any-pointer: fine)').matches

// A screen as narrow as a phone's
export const narrow = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(max-width: 639px)').matches
