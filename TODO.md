# Tian – open questions and next steps

## Sound

- [ ] Listen to the cast (`data/voices.ts`). Everything was made on 16.10.2026 and checked by transcription, line against text: in character, a voice sometimes added a word (哎, 诶, 啊), made 你 polite (您) or once spoke English, and those lines were made again with "every word as written". To change a voice, edit its style, or its description in `DESIGNED` (and delete its id in `scripts/voices.json`), then run `uv run scripts/audio.py .cache/speech.json --job --remake <name>`.
- [ ] The pinyin chart's syllables (16.10.2026) were checked three ways: the pitch track against the tone, the breath of p, t and k against b, d and g, and Gemini Pro naming each tone. About 2 % were judged off and made again. All were made again once more after piē (from 撇) was heard as piě: now read only from characters with no other reading, the pinyin and tone spelt out; Gemini Pro (250 requests a day) has not heard this last round. Listen to any that sound wrong, and say which.
- [ ] Listen to a sample of the generated words for wrong readings of characters with two readings, said alone: 了 (le/liǎo), 还 (hái/huán), 行 (xíng/háng), 得, 都 (dōu/dū).
- [ ] `node scripts/tones-check.ts` lists words whose pitch matches their tones worst – the ones to listen to first. It is rough: the ends of falling tones are quiet and creaky, so fourth tones score low even when right. Of the first 45 files, 骂 mà tracks as rising: listen to it.
- [ ] Particles said alone (吗, 呢, 吧, 的, 了, 啊) have no real tone; the word voice may say them oddly.

## Unsure

- The memory model's numbers are our own: first stability one hour, gain `1.1 + 15 × (1 − recall)` up to 8, a slip cuts to 30 % and below the known line. "Known" is 1.5 days of stability. Words may turn hanzi-only too slowly or too fast.
- Say it compares contours after centring each on its own mean, with a small time shift allowed. 70 counts as right. Not tested with many voices; a whispered or noisy take can score oddly.
- Word order accepts only the trip's own order, though some lines allow another (time words before or after the subject).
- Taxi praise: a modest answer is marked best, a plain thanks is accepted with a note.
- 知之为知之 … 是知也: the last 知 is read zhī here; many read zhì.

## Next

Planned on 16.10.2026, not started. Each was to be one agent in a worktree of its own (cut from `origin/main`), writing new files and only appending to the shared ones – `registry.tsx` (an entry), `home.tsx` (an id in `GROUPS`), `data/words.ts` (one new lesson at the end; reuse words already in the bank), `data/extra.ts` (speech lines), `pixel/sprites.ts`, `tests/app.test.ts` (one new `describe` block) – then merged one at a time. When two lessons add the same word, keep one copy.

### For learning

- Reader (`#reader`, 阅读, Practice): short non-fiction in mixed text, graded from very simple to harder – 10 to 12 readings of 8 to 14 lines: Confucius and the Analects, Laozi and the Dao, the First Emperor and the Great Wall, the Silk Road, the four great inventions, Zhang Heng's seismograph, Zheng He's fleets, the Chang'e lunar programme and Tiangong, Liu Cixin and Chinese science fiction, Go, the guqin and the erhu, 1949 (factual, neutral). Each with a generated pixel-art picture (320 × 180), a narrator's voice, translation on tap, a few new words and three questions; progress as `setBest('reader:<id>', n)`.
- Speaking (`#speak`, 说话, Practice): short conversations answered aloud. The Web Speech API (`zh-CN`, several alternatives) where the browser has it; compare with the expected answers by characters and by toneless pinyin, and show what was heard with the words that matched. Without recognition or a microphone: choose from three, then shadow the line. Scenes: introducing yourself, a teahouse, asking the way, a train ticket, the pharmacy, hobbies with a new friend, a phone call. A hint costs weight. A level meter and a pulsing ring on the microphone button, and one quiet line saying that Chrome sends the audio to Google.
- A richer word card: the popup every game opens for a tapped word, with large hanzi, stroke order (Hanzi Writer, loaded lazily), pinyin coloured by tone, the sound, meaning and measure word, its parts (`data/parts.ts`), up to three lines from the games where it appears, its memory (stability, when it is due) and "I know it" / "Not yet". A setting that colours tones wherever `Ruby`, `Mixed` and `Sprinkled` show pinyin, readable on paper and on the quest's dark panels. A progress page (`#progress`, 进步): a calendar of days studied, words met, learning and known, reviews due over the next week, the hardest words and streaks, linked from the counts on the home screen. Only this piece should touch the word components in `ui.tsx`.
- More trip: Wudang (tai chi at dawn with a Daoist teacher; the temple), a night train from Guilin (a sleeper compartment, family and work, noodles and hot water), Hangzhou (Longjing tea on a farm, a boat on West Lake, Leifeng Pagoda and one line of the White Snake), perhaps a museum of the revolution. Five to seven scenes, painted like the others with their moving layers (`pixel/art.ts`), the new cities on the map; keep the existing scene ids, which saved progress uses.

### Culture

- Dynasties (`#dynasties`, 朝代, Skills): a scrolling pixel-art timeline from the Xia (traditional dates) to 1949, each era with its name, dates, capital, a thing or two it is known for and a small generated picture. Games: put the eras in order; which era (a person, an invention); the dynasty song 朝代歌 line by line, with gaps. There are versions of the song: check the text against a reliable source.
- Chinese chess (`#xiangqi`, 象棋, Arcade): a board with the river (楚河 汉界) and the palaces, pieces as characters (red 帅 仕 相 车 马 炮 兵, black 将 士 象 车 马 炮 卒), legal moves including the flying general, check, mate, and stalemate as a loss. An alpha-beta AI with piece-square tables in a Web Worker, three levels; a tutorial piece by piece with small puzzles; 将军 said on check; sounds of wood; a board that fits a 390-pixel screen.
- Night sky (`#sky`, 星空, Adventures): the real sky over Oslo now, or the browser's location on request. Bright stars from an accurate catalogue (the Yale Bright Star Catalogue or HYG, committed as compact JSON); the Northern Dipper and its seven stars' names, 牛郎星 Altair and 织女星 Vega across 银河 (the story of the cowherd and the weaver girl), 北极星, 天狼星, 参宿, 心宿二, the Four Symbols as regions, the planets with their five-element names (Kepler's laws, to a degree) and the Moon's phase. Explore by dragging, tapping a star and moving a time slider, or take a quiz ("Find 织女星"). A pagoda on the horizon.
- More plays for the theatre: Mulan, the White Snake, Jingwei fills the sea, Kuafu chases the sun, Yu tames the flood, the Butterfly Lovers, Sima Guang and the vat, the Red Cliffs. New puppets, acts and scenery (waves, a pagoda, a vat); 9 to 14 lines each, a cover and three questions.
- The end of the road west: the Kingdom of Women (the queen wants to marry the monk; a test of courtesy, not a fight) and Vulture Peak (the scriptures; the old turtle and the river as the eighty-first ordeal; a last fight drawn from every word met, the hardest first; credits in pixel art, and Wukong made 斗战胜佛). The same art sizes and palettes as `art/quest/`; keep the chapter ids. Some of Wukong's 72 transformations are themed loosely, and two items (the elixir gourd, the wind pill) are game licence, not the novel.

### Fun

- Tone rhythm (`#rhythm`, 节奏, Arcade): the syllables of known words scroll down a lane for each tone, to a zither and drum made in Web Audio; press 1–4 or tap as each crosses the line. Where no recording exists, a plucked string glides through the tone's contour (55, 35, 214, 51). Judgements, combos and speeds; a word whose syllables are all hit counts a little.
- The palace (`#palace`, 故宫, Adventures): a low-poly courtyard of the Forbidden City in three.js, built in code and flat-shaded like the starship (`games/bridge/kit.ts`), walked with keys and mouse, a touch stick, or WebXR in a headset. Things are labelled in Chinese as you come near (门, 狮子, 龙, 灯笼, 柱子, 鼎), and a hunt asks you to find one against the clock.

### After that

- A polish pass over every page on desktop and phone: headers, buttons and dark panels made consistent between the parts the agents built; the seal toaster covers the header on a phone; focus, keys and tap targets; page transitions; bundle size (`data/quest.ts` is in the main chunk). Perhaps a service worker, so the installed app works offline.
- The starship captain's look (`games/bridge.tsx`) could wear `clothes: 'tunic'`.

## Ideas

- Link it from the homepage's parchment once it is ready to show.
