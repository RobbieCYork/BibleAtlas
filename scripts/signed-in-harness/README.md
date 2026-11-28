# Signed-in harness

Drives the **real, built app** in a **signed-in state** against a **fake Supabase**, so a crew agent
can verify signed-in UI itself instead of reporting "signed-in app not driven" to Rev. The whole app
sits behind `AuthGate` and the only real backend is production, so before this existed there was no
way to look at anything past the sign-in card without a real account. There is now.

```bash
node scripts/signed-in-harness/run.mjs --persona owner --viewport 375x667 --script my-checks.mjs
# or: npm run verify:signed-in -- --persona owner --script my-checks.mjs
```

Requires Node 24+ and Google Chrome at `/Applications/Google Chrome.app`. **No npm dependencies.**
Needs `node_modules` installed (it runs `vite build` and `vite preview` from there).

## What one run does

1. `vite build` into a temp dir with `VITE_SUPABASE_URL=https://harness-fake.supabase.invalid`. This is
   a production bundle of **your working tree**, not the dev server, and the production Supabase URL is
   not in it. (About 2s.) `--dist <dir>` reuses a build you made the same way.
2. `vite preview` of that build on its own ephemeral port. Killed by PID at the end. Never `pkill`.
3. Real Chrome, headless, fresh `mktemp` profile, killed by PID. Viewport via
   `Emulation.setDeviceMetricsOverride` (not `--window-size`, which floors at 500px). Software WebGL is
   on so MapLibre does not crash the page.
4. A fake session is seeded into the Supabase client's own auth storage
   (`sb-harness-fake-auth-token`): a syntactically valid session whose JWT is HS256-signed with a
   throwaway key. supabase-js only decodes it, so nothing contacts a server to accept it. It expires in
   ten years, so it never refreshes.
5. Your script runs. Then the summary prints.

## The network is closed. Three independent layers.

- Chrome's `--host-resolver-rules` fails DNS for **every** host except `127.0.0.1`.
- CDP `Fetch.enable` pauses **every** request: loopback continues, the fake host is answered from
  memory, everything else is failed and listed as BLOCKED (map tiles, Google Fonts, bible-api.com).
- The bundle's Supabase host is `harness-fake.supabase.invalid`, a name that cannot resolve (RFC 6761).
  If a production Supabase URL is configured on this machine (env or `.env.local`), its host is read
  only to be watched for, never printed.

Every run ends with `requests that reached the REAL Supabase host: 0` and a ledger. If any request is
ever let through to the network the run prints `LEAK` and exits 1. `examples/network-closed.mjs` proves
the closure by trying to reach a real-looking Supabase host from inside the page.

## Personas (`--persona`)

| persona | `current_user_role()` | `admin_users` row | `current_user_is_owner()` |
|---|---|---|---|
| `member` | null | no | false |
| `advisor` | advisor | no | false |
| `administrator` | administrator | yes | false |
| `owner` | owner | yes | true |
| `guest` | null, anonymous session | no | false |
| `signedout` | no session | n/a | n/a |

`guest` and `signedout` both land on the sign-in gate **on purpose**: the app requires a real account
(`showAuthGate` in `App.tsx`), and an anonymous session does not pass it. Test that, do not work around it.

Switch mid-run against the *same* fake database with `await h.asPersona("member")`. A stage the owner
flipped is still flipped for the member. It swaps the stored session and reloads, which is what a
different account signing in looks like.

**Accounts.** Every persona is an account from before the welcome tour, so the tour never opens over a
check. `h.backend.setAccount({ createdAt, metadata, failUpdates })` then `await h.asPersona(h.persona)`
makes a new one; `h.backend.log.authUpdates` records the app's writes to auth user metadata.

## The fake backend

`lib/backend.mjs` answers `/auth/v1/*`, a small PostgREST at `/rest/v1/<table>`, and `/rest/v1/rpc/<fn>`.

- Tables live in memory (`lib/fixtures.mjs`). `select` filters on `eq neq in is gt gte lt lte like ilike
  not.*`, plus `order limit offset` and `Prefer: count` / `HEAD`. `insert upsert patch delete` change the
  in-memory rows and are recorded in `h.writes`. `or=`, `cs=`, `ov=` and joins/embedded selects are **not**
  modelled; they do not filter.
- RPCs: `current_user_is_owner`, `current_user_role`, `has_role_at_least`, `is_admin`, the `admin_*`
  overview functions (plausible numbers), the badge counters, and a stateful `set_feature_stage` that
  enforces owner-only like the real one (42501 otherwise), updates `feature_release`, and appends to
  `h.audit` and the `feature_release_log` table.
- **Gaps.** Anything unknown (a table nobody seeded, an rpc nobody wrote) answers a clean empty
  response and is listed in the summary under `fixture gaps`. Read that list: a check that depends on a
  gap is not yet meaningful. Add a fixture rather than trusting an empty answer.
- **Overrides per run:** `--fixtures file.json` with `{ "tables": { name: [rows] }, "rpc": { name: value } }`.
  A table in the file **replaces** that table. See `examples/fixtures-override.json`. From a script:
  `h.backend.setTable(name, rows)`, `h.backend.setRpc(name, fnOrValue)`.
- **A table that fails:** `h.backend.setTableError("article_reads", { status: 404, code: "42P01" })` makes
  every request to it answer that PostgREST error (a migration written but not applied); `null` clears it.
- **Upserts** resolve on `on_conflict` when the client sends it, else on the table's entry in
  `PRIMARY_KEYS` (backend.mjs), else on `id`. Add a table there when a check upserts into one keyed otherwise.

## The script API

A script is a module whose default export is `async (h) => {...}`.

```
h.persona h.viewport h.theme                 what this run is
h.evaluate(fn | "expr", ...args)             run in the page, resolves a JSON value (fn is serialised; no closures)
h.click(sel, {index})                        REAL mouse click at the element's centre (CDP Input events)
h.type(sel, text)                            focus, select, insert text
h.touch([{x,y}, ...])                        REAL one-finger touch: tap (one point) or drag, viewport coords
h.waitFor(sel, {timeout, visible})           throws on timeout          h.exists(sel)  h.count(sel)
h.text(sel)  h.rect(sel)                     visible text / getBoundingClientRect of the first match
h.goto(path) h.reload() h.sleep(ms)
h.addInitScript(source)                      run before the app on every later load: in-page stubs (e.g. bible-api.com)
h.setViewport(w, hgt)  h.setTheme("dark")    both reload; theme is the app's own `app-theme` key
h.asPersona(name)                            become someone else, same fake database
h.screenshot("name.png")                     returns the path. A hint, not evidence (see below)
h.assert(cond, message)                      records PASS/FAIL, never throws; the run fails at the end
h.section(title)
h.requests  h.writes  h.audit                the fake backend's logs: [{method, path, how}], app writes, stage flips
h.ledger  h.consoleErrors  h.backend         network ledger, page errors, the backend object itself
```

`sel` is CSS, `"text=Exact text"` (smallest visible element whose text is exactly that), or
`{ css, text }` (CSS matches whose text contains `text`). `lib/app.mjs` holds the app-specific helpers
the examples share: `openAdminConsole`, `adminTabs`, `readGoToMenu`, `openArticle`, `testStripText`.
Selectors live there so a rename is one edit.

## Worked examples (all passing, see `examples/`)

| script | what it proves |
|---|---|
| `features-testing-live.mjs` | Features tab exists for owner, not for administrator, and member has no Admin Console; flipping Games to Testing hides it for the owner in Live view and for a member, shows it with the orange marker in Test view, and writes an audit entry |
| `article-header-compact.mjs` | Demons article header from commit 6b1290d: icon-only Back, centred title, no Concept pill, one row, in light and dark at 375px and 1280px |
| `article-read-checkbox.mjs` | "Mark this article as read" (sql/041) on a topic, person, place, site, event and book intro: last thing in the article, tick upserts `{kind, article_id}` and shows the title check, survives a reload, untick deletes that row; table missing (404/42P01) draws nothing; signed out never asks |
| `game-toggles-nesting.mjs` | the 5 per-game toggles nest under Games & Trivia in order, a Testing parent explains itself on Live children, one game in Testing reaches Game Center correctly for member and owner |
| `page-backgrounds.mjs` | the photographs behind Game Center, each game's first screen, the difficulty, create and join screens, About and the Articles home at 390px and desktop: right picture per screen, fetched only when opened, every text on an opaque panel at 4.5:1 or better in light, dark, every skin and largest text, nothing sideways, a failed load moves nothing, category pages, Trivia's topic screen, the verse list and play screens stay plain (`SHOTS_ONLY=1` for before pictures) |
| `game-entry.mjs` | each game's first screen at 390px and desktop: Play solo / Create multiplayer game / Join multiplayer game for the two games with multiplayer; the five solo-only games open straight on their own options or verse list, with no Play solo screen, and one Back is Game Center; difficulty or verse behind one start button; Join is the code only; Back steps one level; a seated room is rejoined, a vanished one forgotten, a failed join says so; a game in Testing stays shut |
| `profile-menu-entry.mjs` | reaching My Profile at 390px and desktop, owner (Test and Live view) and member: desktop has a labelled "My Profile" row first in the account menu and in the main menu's "Go to" list, and both plus the name card show the profile from the panels, Timeline, Games, Settings and About; the "Go to" row is marked current and toggles back; offered with every feature in Testing; a phone keeps its tab and menu row and an unchanged account menu |
| `profile-cards.mjs` | other people's profiles (Friends, Requests, friend profile page) come from `get_profile_cards` (sql/042), never `GET profiles?id=in.`; a pending requester with no name reads "A Capstone member"; a friend's hidden phone/birthday never render; with the rpc missing (PGRST202, migration unapplied) the app falls back to the old table read |
| `games-play.mjs` | every game in Game Center opened and played at the viewport given (run at 375px and desktop): all difficulty levels of Fill in the Blank, Chronology and solo Saving Peter, one memorization verse to mastery, Bible Trivia solo and lobby, Saving Peter multiplayer lobby and one round against fake room rpcs; checks sideways overflow, broken images and that every control can be clicked |
| `games-reachable.mjs` | owner at 375px: Games & Trivia in Testing removes Games from the bar and hamburger and Settings says so instead of showing a dead switch; "Switch to Test view" brings it back; every bar switch works with all seven fitting; making it Live in the Admin Console restores it; a member gets no row, and the 3-button minimum counts only drawable buttons |
| `skins.mjs` | owner-only visual skins (lib/skin.tsx, skins.css): picker beside the Live/Test switch for the owner only; each skin applied across reader, map, timeline, notes, article, social, games and admin with screenshots and a scripture-contrast check; member and signedout never get a skin even with one planted in localStorage, and their computed styles match a run against origin/main (`DUMP=`). Stubs bible-api.com with Mark 8:1-12 (WEB, public domain) from `examples/mark8-web.json` |
| `admin-add-user.mjs` | Admin Console → Users → Add user at 390px: button above the search box for administrator and owner; client validation sends nothing; the REAL `supabase/functions/admin-add-user/handler.ts` (stubbed deps, via `setFunction`) refuses a duplicate (409), sends one invite with the fixed `https://capstonebible.com` redirect, audits it, the row appears; 21st in an hour → 429; member has no button and a direct call with a member / no / forged token is 403 / 401 / 401; owner in Test view gets a simulated success with zero function requests; form fits in all 8 skins |
| `chronology-categories.mjs` | Chronology at 390px and desktop: the category picker on the screen Chronology opens on (every category, its description, the five levels); for every category at every level a dealt round has the level's card count, only cards from that category and fame grades, and passes the same fairness rules as `scripts/chronology-validate`; sorted with the real ▲ buttons it scores Correct; the next round is never dealt solved, and checked as dealt it costs a life and shows the right order |
| `trivia-topic-difficulty.mjs` | Bible Trivia at 390px and desktop: every topic and difficulty the screen offers creates a room (solo or host) whose question ids all match; empty and thin combinations are disabled or announced as short games; custom topic; a short round to results; a tied finish |
| `about-page.mjs` | About Capstone Bible at 390px and desktop: main-menu row, wording equal to `src/data/aboutPage.ts`, scrolling, Back over a panel and over Timeline, Report a Problem from the foot of the page, light, dark and every skin; signed out: the sign-in card link and the static `/about/` page |
| `about-editor.mjs` | Admin Console → About page (sql/051) at 390px and desktop: owner-only tab (not administrator, member has no console); built-in text loaded; edit, preview, markup stays literal; unsaved guard on tab switch, Back and beforeunload, draft kept and restored; one `save_about_page` call and the saved text reaches the in-app About and `/about`; a save made elsewhere is caught (40001) and can be overwritten; undo via the original text and an earlier version; sections add/move/remove and validation; table missing (PGRST205) → editor says saving is off and readers get the built-in text; signed out: `/about`'s loader shows saved text, built-in when missing or malformed. The fake's `save_about_page` re-implements the rules; RLS is proven by `scripts/sql-rehearsal/051_about_page.mjs`, not here |
| `usage-reports.mjs` | Admin Console → Usage reports and Users → Registered accounts (sql/054) at 390px and desktop, owner and administrator, light and dark: before 054 (PGRST202) the graphs the live functions can answer are drawn and every other card says it needs the database step; after 054 every card draws, the team toggle re-asks the function, periods before history read "not recorded"; tooltip and table give exact values; no guest card, row, badge or figure anywhere (Overview is registered-only); member has no console and never requests a usage function. What the SQL counts is proven by `scripts/sql-rehearsal/054_admin_usage_report.mjs` |
| `report-categories.mjs` | Report a Problem with categories and no voting (sql/052) at 390px and desktop: required category, ten area categories, preselected from the screen; before sql/052 nothing is preselected and reports still submit; My Reports labels a retired category; Admin Console → Reports category tabs with counts that follow the status chips, a retired tab, re-file sends one PATCH; no vote or priority wording and no `report_vote` call for any persona. RLS proven by `scripts/sql-rehearsal/052_report_categories_no_voting.mjs` |
| `report-suggest.mjs` | the report flag's two uses at 390px, 375px and desktop: labels on the flag, menu, About and My Profile; problem form unchanged except `idea` leaves its picker; "Suggest a feature" hides category and severity, files `idea` with null severity, keeps typed text, and words confirmation, My Reports & Suggestions, editor and errors for a suggestion; sends when the category list fails; Admin Console shows it under Suggestion |
| `../game-media.mjs` | run directly, not through `run.mjs`: TWO real Chromes with fake camera/mic devices over a real WebRTC connection, a shared fake database and `lib/fake-realtime.mjs`. Optional camera/mic in Bible Trivia and Saving Peter at `--viewport 390x844` and `1280x800`: choosing neither never calls getUserMedia, a player with no media sees and hears, off ends the track, real "permission denied", missing/busy device, unanswered prompt, blocked autoplay, reload and rejoin, solo play |
| `../winner-avatar.mjs` | run directly: TWO real Chromes, shared fake database and Realtime, at `--viewport 390x844` and `1280x800`: both multiplayer results screens with winner pictures seen by winner and loser, friends / pending / stranger / blocked, no picture and a picture that fails to load, ties (up to 8), the winner leaving, one player unchanged. `get_profile_cards` is a re-implementation of sql/042, not the real function |
| `trivia-skip-continue.mjs` | Bible Trivia Skip and Continue at 390px, 375px and desktop: the revealed answer holds four seconds with a countdown on Continue and then moves on (after answering, Skip, time-up, the last question), Continue moves sooner, no double advance, countdown stops while hidden, wrong device clock, two players |
| `../trivia-hold.mjs` | run directly: TWO real Chromes and fake Realtime: each player has the answer on screen a full four seconds (everyone answered, time-up, clocks 7s apart, final question), the room moves one question, Continue moves it at once. Real networks and the real SQL are not exercised |
| `games-fit.mjs` | every game's main controls on screen above the tab bar at 375x667 (with and without a 20px top inset), 390x844 and 390x700 with 47/34 insets, with and without the seasonal banner, plus largest text, a floating-tab-bar skin and (via `FIT_SIZES`) one size at a time; rooms are rows in the fake backend, no Realtime; `FIT_ONLY`, `FIT_BANNER`, `FIT_EXTRAS`, `FIT_SHOTS`. Daily Name's own fit checks are in `daily-name.mjs` |
| `welcome-tour.mjs` | the welcome tour at 390px and desktop: a new account sees it once (account metadata and local mark), Skip, Escape, existing accounts untouched, failed write retried without repeating, display-name prompt and sign-in gate never covered, every step's layout, highlight and contrast, reopen from menu and Settings, stages off hide steps, every menu row / tab / section covered; `LOOKS=1` adds dark, all skins, text sizes and short screens |
| `timeline-fixed.mjs` | the one-scale timeline at 402px and desktop: five-year marks 195px apart; Ctrl/⌘ wheel, pinch, gesture events, double-click/tap and +, −, 0 change nothing and pinches do not zoom the page; one set of band heights across a stop-by-stop pan of the whole span with no overlapping marks, no bar without its title and every event reachable; long bars panned a few px at a time (title always visible, never jumps, rests past the end) and tapped; the five `hiddenOnTimeline` events neither drawn nor searchable; the tallest stretches; "Go to" a year (BC/AD, no year 0, both ends) and the eras; search jumps; wheel, swipe and drag; no caption in the lanes menu; large text |
| `verse-sheet-keyboard.mjs` | the reader's verse sheet at 402px and desktop, with a SIMULATED keyboard and touch pointer: selecting by touch focuses nothing; a tapped note box lifts the sheet so box, Save and the selected text are above the keyboard; dismissal restores it; Note editor and Cancel; low text scrolled above the sheet; mouse still focuses the box on open. Real iOS focus behaviour needs the Simulator |
| `young-earth-notes.mjs` | the young-earth date note (src/data/datingDebate.ts) at 390px and desktop: under the date of Creation, the Flood and Babel and the lifespans of Adam, Noah and Enoch, absent for Abraham and the Call of Abram; its link opens Young Earth and Old Earth Creationism with its five sections; Chronology rounds that deal a young-earth card show the marker and footnote only once checked, one per such card, and a round without one shows neither |
| `network-closed.mjs` | self-test of the closed network |
| `fixtures-override.mjs` | `--fixtures` |

## Reading the evidence

The same rule as the rest of this repo: **the DOM and the request log are evidence, a screenshot is a
hint.** Assert on `getBoundingClientRect`, text and state; use `h.screenshot()` to look. Scroll
containers and the marker overlay have shown stale pixels while the DOM was right. The backend's
`h.requests`, `h.writes` and `h.audit` are observed outside the page.

## What this cannot prove

- **Real RLS or real database behaviour.** The fake answers what the *client* expects. It does not
  enforce row-level security, constraints, triggers, `SECURITY DEFINER` rules or the real RPCs'
  logic. `set_feature_stage`'s owner check here is a re-implementation, not the migration. A policy
  bug, a missing grant, or a migration that is written but not applied to production cannot be seen
  here. That needs a rehearsal on a staging Supabase project, which needs Robbie's account.
- **Real auth.** No password, email-confirmation, PKCE, magic-link, password-reset or token-refresh
  behaviour is exercised. The session is accepted because the fake says so. `signInWithPassword` against
  the fake returns the current persona (the member, from the signed-out screen) whatever you type, and
  `signInAnonymously` returns the guest.
- **Storage and uploads.** Avatars, post media, sermon-note images: `/storage/v1/*` answers 404/empty.
- **Realtime and multiplayer.** Under `run.mjs` the websocket cannot connect (the host does not
  resolve): chat, badges that arrive live and multiplayer rooms are not testable there. Solo UI is.
  `game-media.mjs` stands in a fake Realtime (`lib/fake-realtime.mjs`) for the game rooms only; it
  proves the client, not Supabase Realtime.
- **External content.** Bible text (bible-api.com), map tiles, web fonts and the OCR model are blocked,
  so the Bible panel shows "Couldn't load that passage" and the map has no tiles. Layout around them can
  be checked; their content cannot.
- **Anything about production data.** The rows are made up.
- **The Edge Functions** (delete-account, etc.): `/functions/v1/*` answers `{}` unless a script registers a
  handler with `h.backend.setFunction(name, async (req) => ({ status, headers, body }))`. That runs YOUR
  handler, not the deployed function and not real Auth: `examples/admin-add-user.mjs` runs the real
  `handler.ts` with stubbed dependencies, which proves the function's decision logic and the UI wiring,
  not that Supabase's `inviteUserByEmail` or the deployed secrets behave.

## Hygiene

- Never `pkill`. The runner kills the preview server and Chrome by PID.
- It never signs in, creates an account or writes a row against production, and never needs, asks for
  or prints any credential. The only "credential" in play is a JWT signed with a throwaway string in
  `lib/personas.mjs`.
- Do not use `--dist` with a build made against the real Supabase URL. The closed network would still
  hold, but the page would be pointed at a host the fake does not answer.
