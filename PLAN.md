# Plan: /chinese becomes Tian, at tian.ymse.land

Tian (天, «day», «sky»; 天天向上, «a little more Chinese every day») is the
Mandarin games now at `ymse.land/chinese`, in the homepage repo. It moves to a
repo, a Convex deployment and a Worker of its own. Delete this file when the
move is done.

Decided 2026-10-17: sign-in for invited people only (as today), the parchment
keeps the label 学中文 but links to tian.ymse.land, and the GitHub repo is
created with `gh` as `octagorm/tian` (private).

## Where it starts

- Code: `src/components/pages/chinese/` (150 files), `src/pages/chinese.astro`,
  `public/chinese/` (2,459 files, 23 MB: art, audio, app icons, manifest).
- From outside its folder it imports only `~/lib/convex`. In Convex it uses
  `convex/chinese.ts` (the word bank, table `chineseBank`) and `requireMember`
  from `convex/access.ts`.
- The homepage's `src/pages/index.astro` has a piece for the installed app's
  sign-in landing (see `account.tsx`, `PENDING`).
- Scripts `scripts/chinese-*` and `scripts/chinese-voices.json`, the test
  `tests/chinese.test.ts`, and the speech cache `.cache/chinese-*`
  (1.4 GB, not in git; expensive to make again).
- Packages used only by it: `hanzi-writer`, `topojson-client` (and its
  types), `puppeteer`.
- Data: one user (Gorm, the admin), no other members, one word bank.
- Browser storage on ymse.land: `chinese:bank:v1`, `settings`, `sound`,
  `goal`, `stamped`, `bridge`, `signin`. Only the bank matters, and it is on
  the account.

## 1. The repo, locally

1. `~/dev/tian`: Astro + React + Tailwind like `~/dev/gorm`, a Worker `tian`
   with static assets and a small Worker for `/api/auth/*` (as the
   homepage's `worker/index.ts`), Vitest.
2. Copy the game: components to `src/components/tian/` (or keep the folder
   name), the page as `src/pages/index.astro`, `public/chinese/*` to
   `public/*`. Change the 17 `/chinese/` path prefixes in code and scripts to
   `/`. Hash routes (`#tones`) stay.
3. Copy `~/lib/convex`, the layout pieces the page uses, the scripts, the
   test and the vitest config. Move (not copy) `.cache/chinese-*` across.
4. Name and look: title Tian with 天, subtitle «天天向上 – a little more
   Chinese every day», manifest `id`/`start_url`/`scope` `/`, name «Tian»,
   short name «天». Redraw the seal and app icons with 天
   (`scripts/chinese-icons.mjs`). The installed-app sign-in landing moves
   into Tian's own page.
5. `AGENTS.md` from the chinese folder's notes, plus the repo's commands.
6. Build, test, and look at it in a preview, without sign-in.

## 2. Convex and sign-in

1. A new Convex project «tian»: Convex Auth with Google, `access.ts` and its
   tables (members, requests, invitations; `ADMIN_EMAIL` is Gorm), the word
   bank as `bank`, and the admin page and `/invitasjon` from the homepage.
2. Sign-in through tian.ymse.land: `CUSTOM_AUTH_SITE_URL`, the Worker passing
   `/api/auth/*` on, a Google OAuth client with redirect URI
   `https://tian.ymse.land/api/auth/callback/google` and origin
   tian.ymse.land, and a brand «Tian» (ymse.land is verified in Search
   Console, which covers the subdomain). See the convex-auth skill.
3. Env on the deployment: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
   `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `CUSTOM_AUTH_SITE_URL`.

## 3. Online

1. `gh repo create octagorm/tian --private`, push.
2. Cloudflare: Worker `tian` from the repo with Workers Builds
   (`npm run build`, `npx wrangler deploy`), custom domain tian.ymse.land.
3. Sign in on tian.ymse.land (phone and PC), check the admin page.
4. Move the word bank: export Gorm's `chineseBank` row from the homepage's
   Convex, and after the first sign-in on Tian, write it to his new user with
   a one-off internal mutation (`npx convex run`). Check that it shows on
   both devices.

## 4. Switch over and clean up the homepage

1. Parchment (`places.ts`): 学中文 links to `https://tian.ymse.land`.
   `/oversikt`: the entry moves to Tian's own address.
2. Redirect `ymse.land/chinese` and `/chinese/*` to tian.ymse.land with a
   Cloudflare rule (the hash comes along in the browser).
3. Remove from the homepage: the page, its components, `public/chinese`, the
   scripts and test, the three packages, the chinese part of `index.astro`.
   Push, wait for the deploy, then remove `convex/chinese.ts` and the
   `chineseBank` table and run `npx convex deploy` (frontend first, then
   Convex).
4. Update the ymseland skill (a row for Tian), the homepage's `AGENTS.md`,
   and `/oversikt`.
5. On the phone: remove the installed 学中文 app, install Tian from
   tian.ymse.land.

Nothing in the homepage changes before Tian works with sign-in and the word
bank. Until step 4 both run side by side.
