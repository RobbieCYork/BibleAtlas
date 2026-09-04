# Where `web-bible.json.gz` came from

- **Text:** the World English Bible (WEB), complete — 66 books, 1,189 chapters, **31,098 verses**.
- **Source:** `https://bolls.life/get-text/WEB/<book>/<chapter>/`, the same service
  `src/lib/bibleApi.ts` already uses for Bible search. Fetched 2026-09-04 in one pass, 1,189
  requests, **0 failures**.
- **Licence:** the World English Bible is **public domain** — released as such by its editor
  (Michael Paul Johnson / eBible.org). It carries no copyright restriction, which is why it is
  safe to commit here in a commercial repo. See the project's sourcing rules in `CLAUDE.md`:
  this is the one class of text that needs no permission at all.
- **Shape:** `[{ book, chapter, verse, text }]`, book names spelled exactly as `src/data/bibleBooks.ts`
  spells them, so `BOOK_NAME_OVERRIDES` / `BOOK_NAME_ALLOWLIST` keys match.
- **Not shipped to users.** It lives under `scripts/`, is never imported from `src/`, and does not
  enter the Vite bundle. It exists only so the regression harness runs offline and fast.

## Two things this corpus is not

1. **It is not what the reader renders.** The app fetches WEB from `bible-api.com`; this is
   `bolls.life`'s WEB. Both are the World English Bible. **The two have not been diffed.** Wording
   differences would show up as harness rows that do not correspond to anything a user sees.
2. **It is WEB only.** The app also offers **KJV and ASV, and neither is measured here.** Because
   `VERSE_NAME_OVERRIDES` is keyed by book/chapter/verse and is translation-blind, it fires
   identically whatever the reader has selected — even where the wording differs enough that the
   override is meaningless or wrong. Auditing those two translations is its own piece of work and
   has not been done.
