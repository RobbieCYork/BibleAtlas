# Capstone Plus, phase 1 — protecting the paid text

Plan: `automation/manager/paid-tier-plan.md` (Architecture B, approved by Robbie 2026-11-17, with his
change at its foot: **the Bible references list stays free; paid starts below it**).

Phase 1 moves the text below the cut out of everything a stranger can download, while **everyone
keeps full access** (no payment, no visible change). Billing is phase 2 and is not here.

## The pieces

| Piece | What it does |
|---|---|
| `src/lib/paidContentSpec.ts` | **The one list** of paid fields per article kind (`PAID_KEYS`), the split/merge, the teaser counts, and the free lead lines (`placeLead`, `siteLead`). App, Vite plugin, seed and SEO all use it. |
| `sql/043_paid_content.sql` | `content_paid`, `entitlements`, `entitlement_events`, `has_entitlement(text)`, owner-only `grant_comp` / `revoke_comp`, and the switch `app_settings 'paid.everyone_has_plus'` (ships **true**). |
| `sql/tests/043_paid_content_test.sql` | Proves the access rules (anon, free member with the switch on and off, plus, expired, grace, lifetime comp, owner, no client write path, function hygiene). Ends in ROLLBACK. |
| `scripts/paid-content/split.mjs` | Writes `out/content_paid.{json,sql}` + `manifest.json` from `src/data/*.ts`, and proves free + paid reassemble every record byte-identical (canonical JSON), the halves are disjoint, and no paid text is in the server-mode bundle emission. `--check` writes nothing. |
| `scripts/paid-content/check-bundle.mjs <dist>` | Scans a **built** app's JS for paid text from outside. `0 found` on a server build is the leak test. `--expect-present` on a bundle build proves the scan works. |
| `scripts/paid-content/rls-test.mjs` | Runs 025 + 043 (twice) + the seed (twice) + the test file on a throwaway in-process Postgres (`--local`, needs `npm i --no-save @electric-sql/pglite`) or on staging (`--staging`, needs `npm i --no-save pg` and `.env.staging.local`). Refuses the production host. |
| `vite-plugin-paid-content.ts` | Defines `__PAID_CONTENT_SOURCE__`; in `server` mode replaces the five data modules with their free emission. |
| `src/lib/paidContent.ts` | `usePaidContent(kind, record)`: local cut in `bundle` mode; in `server` mode one `has_entitlement` rpc per session, batched `content_paid` reads by primary key, memory cache, IndexedDB copy for entitled users only. |
| `src/components/PaidTeaser.tsx` | The cut: upgrade teaser (gated), skeleton (loading), message + Try again (offline / unavailable). |
| `scripts/signed-in-harness/examples/paid-content.mjs` | Harness checks for every persona, every skin, light and dark. |

## The two switches — `paid-content.config.json`

| Switch | `bundle` / `full` (today, the default) | `server` / `teaser` |
|---|---|---|
| `appSource` | Full records ship in the JS bundle; panels cut the paid part out locally. **No database needed.** Identical to before. | Bundle has free fields only (~3.65 MB JS instead of ~6.74 MB). Panels fetch the paid part from `content_paid`. **Requires 043 applied AND seeded first**, or every panel shows "couldn't be loaded". |
| `seoRender` | Public pages carry the whole article, as today (byte-identical to origin/main). | Public pages carry only free fields + Bible references + a "part of Capstone Plus" line. Same URLs, same sitemap. Article JSON-LD says `isAccessibleForFree: false`. |

Env `PAID_CONTENT_SOURCE` / `SEO_RENDER` override them for one build. **The leak is only closed when
both are flipped** — a teaser SEO page does nothing while the full text is still in the JS bundle,
and vice versa.

`content_paid` is only useful if it matches the repo: every content edit to a paid field needs the
seed re-run against production after deploy (step 4 below). `paid.content_version` in app_settings
records which seed is live; compare it with `out/manifest.json` `version`.

## Applying sql/043 — the safe order (production needs Robbie's explicit word)

1. **Staging rehearsal.** `node scripts/paid-content/split.mjs`, then
   `node scripts/paid-content/rls-test.mjs --staging` (or `--local` if there is no staging project).
   It must end `ALL 043 CHECKS PASSED`.
2. **Apply 043 to production** — SQL editor or `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f sql/043_paid_content.sql`.
   Nothing changes for users: the app is still a `bundle` build and never asks for `content_paid`.
3. **Check it, read-only:** `select key, value from app_settings where key like 'paid.%';` shows
   `everyone_has_plus = true`; `select has_table_privilege('anon','public.content_paid','select');` is false.
4. **Seed it:** `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/paid-content/out/content_paid.sql`
   (3.5 MB — too large for the SQL editor; use psql). Re-runnable: only changed rows are rewritten,
   rows for deleted records are removed. Then `select count(*) from content_paid;` = 1005 today.
5. **Flip the app:** set `appSource` to `server` in `paid-content.config.json`, build, run
   `node scripts/paid-content/check-bundle.mjs dist` (must say `found … 0`), deploy. Users still see
   everything (the switch is on), now loaded from the table.
6. **Flip SEO** (`seoRender: teaser`) — a public-facing change with an SEO cost (plan §2); Robbie's call.
7. **Paywall on** (phase 2, after billing exists): as an owner,
   `select set_app_setting('paid.everyone_has_plus', 'false'::jsonb);` — reversible with `'true'`.

Rollback at any step before 7: set `appSource` back to `bundle` and redeploy; the table can stay.

## Offline cache and the `store-app` branch

`store-app` (`src/lib/offlineCache.ts`, IndexedDB `capstone-offline`) caches Bible chapters and notes.
This branch keeps its own IndexedDB database, `capstone-paid-content`, so the two cannot collide when
merged. Rules it follows, which the merged version must keep:
- store paid bodies **only for a user whose last `has_entitlement` said yes**, keyed by user id;
- serve them only when the network is unreachable (never when the server answered "no"), and only
  while that yes is under 14 days old;
- delete them on "not entitled", on sign-out, and when a different user signs in.
When merging, fold it into `offlineCache.ts` under a `paid:<uid>|` prefix and add
`clearPaidContentCache()` (exported here) to the account-deletion / sign-out cleanup from `db3bf7b`.

## For capstone-content: teasers

`Location.teaser` and `PointOfInterest.teaser` (optional, 1-2 sentences, plain prose) are the free
lead line above the cut for readers without Plus, on the public teaser page and on the share card.
Until written, places fall back to the first notable fact and sites to the first ~140 characters of
the description. Wanted: **117 place teasers and 101 site teasers**. Writing one changes what an
entitled reader sees too (it shows above the references), so add them as a batch.
