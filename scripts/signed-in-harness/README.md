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
| `game-toggles-nesting.mjs` | the 7 per-game toggles nest under Games & Trivia in order, a Testing parent explains itself on Live children, one game in Testing reaches Game Center correctly for member and owner |
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
