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
| `billing.mjs` | Capstone Plus web payments (sql/045): with `billing_status` missing (migration unapplied) or `billing_enabled` false there is no Capstone Plus row, no Upgrade and no call to any billing Edge Function; with it on, the account menu offers Monthly / Yearly and the client sends only `{plan, return_to}` to `create-checkout-session`; a subscriber gets a status line and Manage (`create-portal-session`); `?plus=cancel` is stripped and noticed; in a server build a gated reader's teaser Upgrade opens the picker |
| `study-collections.mjs` | Study Collections (sql/046): table missing draws no button and no tab; entitled, "Add to collection" on an article creates a collection and adds it (client never sends `user_id`), more articles, a Bible chapter (verse ref) and a verse note (note ref) add from their own screens; the Collections tab lists, resolves names from the data, canonicalises a typed reference, reorders via `reorder_study_collection_items`, removes, renames and opens the article; not entitled shows the Plus prompt and the existing collection read-only; delete asks first. Run at 390x844 and 1280x800 |
| `article-read-checkbox.mjs` | "Mark this article as read" (sql/041) on a topic, person, place, site, event and book intro: last thing in the article, tick upserts `{kind, article_id}` and shows the title check, survives a reload, untick deletes that row; table missing (404/42P01) draws nothing; signed out never asks |
| `game-toggles-nesting.mjs` | the 7 per-game toggles nest under Games & Trivia in order, a Testing parent explains itself on Live children, one game in Testing reaches Game Center correctly for member and owner |
| `profile-cards.mjs` | other people's profiles (Friends, Requests, friend profile page) come from `get_profile_cards` (sql/042), never `GET profiles?id=in.`; a pending requester with no name reads "A Capstone member"; a friend's hidden phone/birthday never render; with the rpc missing (PGRST202, migration unapplied) the app falls back to the old table read |
| `skins.mjs` | owner-only visual skins (lib/skin.tsx, skins.css): picker beside the Live/Test switch for the owner only; each skin applied across reader, map, timeline, notes, article, social, games and admin with screenshots and a scripture-contrast check; member and signedout never get a skin even with one planted in localStorage, and their computed styles match a run against origin/main (`DUMP=`). Stubs bible-api.com with Mark 8:1-12 (WEB, public domain) from `examples/mark8-web.json` |
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
- **Realtime and multiplayer.** The websocket cannot connect (the host does not resolve). Chat,
  badges that arrive live, and every multiplayer game room are not testable. Solo UI is.
- **External content.** Bible text (bible-api.com), map tiles, web fonts and the OCR model are blocked,
  so the Bible panel shows "Couldn't load that passage" and the map has no tiles. Layout around them can
  be checked; their content cannot.
- **Anything about production data.** The rows are made up.
- **The Edge Functions** (delete-account, etc.): `/functions/v1/*` answers `{}`.

## Hygiene

- Never `pkill`. The runner kills the preview server and Chrome by PID.
- It never signs in, creates an account or writes a row against production, and never needs, asks for
  or prints any credential. The only "credential" in play is a JWT signed with a throwaway string in
  `lib/personas.mjs`.
- Do not use `--dist` with a build made against the real Supabase URL. The closed network would still
  hold, but the page would be pointed at a host the fake does not answer.

## Plus preview (what is Free, what is Plus)

A visual overlay so the owner can see the Free/Plus split in a demo account. It changes no entitlement,
billing or RLS behaviour. Code: `src/lib/plusPreview.ts`, `src/plusPreview.css`,
`src/components/PlusPreviewLegend.tsx`, `src/components/PlusBadge.tsx`.

**Convention.** Put `data-tier="plus"` or `data-tier="free"` on the element. With the preview ON (an attribute
`data-plus-preview="on"` on `<html>`) a plus element gets a gold outline and a gold "PLUS" pill, a free one a quiet
"FREE" tag. With it OFF nothing is drawn. `<PlusBadge />` is an inline chip for spots an outline cannot reach. The
paid article body is wrapped in `<div className="plus-body" data-tier="plus">`, which is `display: contents` (no box)
unless the preview is on.

**Who gets it** (never in a native build, never otherwise, no network request, nothing in the free bundle but a little
of CSS/JS): the owner (legend starts OFF, toggled and remembered in localStorage `plus-preview`); a demo account whose
user id is in the build-time `VITE_PLUS_PREVIEW_USER_IDS` (starts ON); any build made with `VITE_PLUS_PREVIEW=1`.

**View it locally** (fake "Demo Member", fake Supabase, 0 real requests):

    HEADED=1 HOLD=1 node scripts/signed-in-harness/run.mjs --persona demo --viewport 1280x800 \
      --script scripts/signed-in-harness/examples/plus-preview.mjs

`--persona demo` allow-lists the demo id in the build (`PLUS_PREVIEW=flag` uses the global flag, `PLUS_PREVIEW=off`
neither). Without `HEADED`/`HOLD` it runs the assertions and writes screenshots to `--out`.

**A real demo account on production (not done; documented only).** (1) Robbie creates the account himself in the
normal sign-up screen and types its own password. (2) Read its user id from the Admin Console or Supabase Auth. (3) Put
the id in `VITE_PLUS_PREVIEW_USER_IDS` in the deploy environment and redeploy (or add a server-side allow-list rpc
reading `app_settings` `paid.preview_enabled`, which needs a migration and Robbie's word). The owner account needs none
of this: the legend just appears.

### Tier hooks (from automation/manager/plus-split-proposal.md)

| Feature | Tier | Tagged? | Where |
|---|---|---|---|
| Article body below references (5 article kinds) | PLUS | yes | `.plus-body` in Person/Location/Topic/Poi/TimelineEvent panels |
| Bible references list | FREE | yes | `VerseList.tsx` |
| Skins / Appearance | PLUS | yes | `SkinPicker.tsx` |
| Bible in a Year (canonical, chronological) vs the other plans | PLUS / FREE | yes (plans are switched off by `READING_PLANS_ENABLED`) | `ReadingPlansView.tsx` card |
| Notes: print / Word export | PLUS | yes (whole panel FREE) | `MyNotesPanel.tsx` |
| Sermon-note photo + OCR | PLUS | yes (shows when a photo is chosen) | `NoteImageCapture.tsx` |
| Map, Bible reader, timeline, notes, games, prayer list, sermon notes list | FREE | yes | MapView, BiblePanel, TimelineView, MyNotesPanel, GameCenter, PrayerListView, SermonNotesView |
| Premium share-card backgrounds | PLUS | NOT yet: which backgrounds are premium is undecided | `ShareCardModal.tsx` / `data/shareBackgrounds.ts` |
| Timeline lanes (maybe PLUS later), social, safety, Bible text, backup | FREE | not tagged (no visible Plus boundary) | n/a |
| Study collections (Add to collection button, Collections tab and screens) | PLUS | yes | `AddToCollection.tsx`, `StudyCollectionsView.tsx`, `PlusBadge` on the My Notes "Collections" tab |
| Offline article packs, filters, memorization packs | PLUS | feature not built | n/a |
