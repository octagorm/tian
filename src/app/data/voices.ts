// Who speaks in Tian, and how. Every voice the data names is here: the
// trip's people by the Gemini voice they were given, everyone else by
// name. Each has the Gemini voice that reads it (a prebuilt one, or one
// designed below) and a few words on how to say it. The page uses only
// the names, as keys to the sound files; scripts/audio.py reads
// the rest through scripts/speech.ts.

export interface Voice {
  // A Gemini prebuilt voice, or one of DESIGNED
  base: string
  // How to say it, in a few words. Google's advice is to keep this to the
  // delivery: age, sex and accent belong to the voice.
  style: string
}

// Voices designed from a description, each made once (their ids are kept
// in scripts/voices.json)
export const DESIGNED: Record<string, string> = {
  Laozi:
    'A very old Chinese sage speaking Mandarin Chinese: a deep, soft, slightly hoarse voice, slow and serene, with a hint of a smile, as if sharing a secret about the universe.',
  Confucius:
    'An elderly Chinese master speaking Mandarin Chinese: a warm, resonant, dignified male voice, measured and patient, every word weighed, like a respected teacher before his students.',
  Zhuangzi:
    'A playful Chinese philosopher in his fifties speaking Mandarin Chinese: a light, amused, slightly dreamy male voice, always about to laugh at the joke of the universe.',
  Poet: 'A Tang dynasty poet speaking Mandarin Chinese: a mellow, wistful male baritone, a little warmed by wine, reciting slowly and tenderly under the moon.',
  Storyteller:
    'A Chinese storyteller in his sixties speaking Mandarin Chinese: a lively, expressive, slightly raspy male voice that relishes suspense, surprise and drama, a master of the old storytelling halls.',
  Announcer:
    'A woman in her thirties reading the news on Chinese radio in the 1960s, speaking Mandarin Chinese: a strong, clear, resonant voice, proud and full of revolutionary fervour.',
  'Demon king':
    'A deep, booming male voice of a massive ogre king from Chinese legend, speaking Mandarin Chinese, theatrical and larger than life.',
  Monkey:
    'A cheeky monkey king from Chinese legend speaking Mandarin Chinese: a quick, bright, cocky male voice, full of mischief and swagger.',
}

export const VOICES: Record<string, Voice> = {
  // Words, numbers and the garden, in the teacher's voice (the words
  // themselves are read as a teacher reads a word list)
  Kore: { base: 'Kore', style: 'clear and natural, at a calm pace' },
  // The player's lines on the trip: a model to copy, so clear above all
  Puck: { base: 'Puck', style: 'a friendly traveller, clear and careful' },

  // The trip's people (data/trip.ts), some also customers at the stall
  Leda: {
    base: 'Leda',
    style: 'cheerful and warm, a friend showing you around',
  },
  Charon: { base: 'Charon', style: 'polite and official, a little brisk' },
  Orus: {
    base: 'Orus',
    style: 'a relaxed taxi driver, a bit gruff',
  },
  Aoede: { base: 'Aoede', style: 'warm and smiling' },
  Sulafat: { base: 'Sulafat', style: 'warm and cheerful' },
  Algenib: {
    base: 'Algenib',
    style: 'a kind old man, slow and a little gravelly, enjoying his tea',
  },
  Schedar: { base: 'Schedar', style: 'an enthusiastic guide, clear and proud' },
  Autonoe: { base: 'Autonoe', style: 'a bright, curious student' },
  Iapetus: { base: 'Iapetus', style: 'brisk and matter-of-fact' },
  Fenrir: { base: 'Fenrir', style: 'a loud, happy street vendor calling out' },
  Rasalgethi: {
    base: 'Rasalgethi',
    style: 'a knowledgeable guide, a little dramatic',
  },
  Laomedeia: { base: 'Laomedeia', style: 'upbeat and chatty' },
  Gacrux: { base: 'Gacrux', style: 'a warm, doting grandmother' },
  Achird: { base: 'Achird', style: 'friendly and quick' },
  Umbriel: { base: 'Umbriel', style: 'easy-going and good-humoured' },
  Alnilam: { base: 'Alnilam', style: 'a relaxed boatman, proud of his river' },
  Despina: { base: 'Despina', style: 'calm, smooth and helpful' },
  Sadaltager: {
    base: 'Sadaltager',
    style: 'a bookish seller with a gentle sense of humour',
  },
  Zephyr: { base: 'Zephyr', style: 'bright and lively' },
  Sadachbia: { base: 'Sadachbia', style: 'lively and excited' },

  // The starship's captain (data/bridge.ts)
  Captain: {
    base: 'Alnilam',
    style: 'a starship captain giving crisp, urgent orders',
  },

  // The stories (data/stories.ts), and the myths among the sayings
  Storyteller: {
    base: 'Storyteller',
    style: 'a dramatic storyteller, lively, with suspense',
  },

  // The sayings (data/sayings.ts), each in its master's voice
  Confucius: { base: 'Confucius', style: 'measured and dignified' },
  Laozi: { base: 'Laozi', style: 'slow and serene, with a quiet smile' },
  Zhuangzi: { base: 'Zhuangzi', style: 'playful and amused' },
  Poet: {
    base: 'Poet',
    style: 'slow and tender, reciting a poem under the moon',
  },
  Diviner: {
    base: 'Charon',
    style: 'solemn and ceremonial, reading an oracle',
  },
  Announcer: {
    base: 'Announcer',
    style: 'proud and ringing, a slogan on the radio',
  },

  // The demons on the road west (data/quest.ts)
  'Mountain spirit': {
    base: 'Enceladus',
    style: 'eerie and slow, echoing from inside the rock',
  },
  'Zhu Ganglie': {
    base: 'Zubenelgenubi',
    style: 'greedy and whiny, comically hungry',
  },
  'Yellow Wind Demon': {
    base: 'Algenib',
    style: 'wild and howling, like a storm',
  },
  'River ogre': { base: 'Demon king', style: 'gruff and suspicious' },
  'White Bone Demon': {
    base: 'Vindemiatrix',
    style: 'sweet and innocent, with something sinister underneath',
  },
  'Silver Horn King': {
    base: 'Algieba',
    style: 'sly and sing-song, a trickster',
  },
  'Red Boy': { base: 'Sadachbia', style: 'a bratty, impatient child' },
  'Scorpion Demon': {
    base: 'Callirrhoe',
    style: 'sweet, jealous and dangerous',
  },
  'Six-eared macaque': { base: 'Monkey', style: 'cocky and boastful' },
  'Bull Demon King': { base: 'Demon king', style: 'booming and furious' },
  'Yellow Brows': {
    base: 'Demon king',
    style: 'pompous and solemn, falsely holy',
  },
  'Spider spirits': {
    base: 'Achernar',
    style: 'silky and menacing, a little teasing',
  },
  'Golden-winged Roc': { base: 'Fenrir', style: 'fierce, fast and boastful' },
}
