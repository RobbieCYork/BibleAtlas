# Bible packs (offline reading)

The app's own copies of the Bible texts. A "pack" is one JSON file per book under
`bible-packs/<translation>/`, listed with size and SHA-256 in `bible-packs/catalog.json`. The build
ships them to `/bibles/` and **fails** if a file differs from the catalog. With an empty catalog the
app offers no downloads and no BSB, and reads from bible-api.com as before.

**Never edit a file in `bible-packs/`.** Rebuild it from the source.

## What ships

WEB, KJV and ASV. **The BSB is held:** the app has the wiring, but adding the translation has not been
approved, so it has no pack, the app does not list it and the legal pages do not name it. Adding it
means Robbie's yes, then step 2 with `--only bsb`, steps 4 and 5, and putting it back in section 8 of
the Terms. Licence statements for every source are recorded in `sources.json`.

The KJV source also carries the Apocrypha. Only the 66 books are packed; bible-api.com serves the
same 66.

## Adding or rebuilding the files

Each download needs Robbie's approval first. `sources.json` names the exact files. WEB, KJV and ASV
are outside the Wikisource-only rule by Robbie's approval of 2026-11-28.

1. Put the approved files, unrenamed, in one empty folder outside the repository.
2. `node scripts/bible-packs/build.mjs --from <that folder>`
   It refuses a WEB, KJV or ASV file whose checksum differs from the pinned one. Read its report:
   verse counts, blank verses, the BSB file's own notice lines, three sample verses per translation.
   Record the BSB source's SHA-256 from `catalog.json`.
3. `node scripts/bible-packs/verify-online.mjs --sample 60` (about 6 minutes; `--all` about 2 hours).
   It must report **0 differences**. Existing highlights are character positions in bible-api.com's
   text, so any difference moves them. Do not ship until it is clean.
4. Read the BSB beside the publisher's own site in a few places (a psalm with a heading, poetry, a
   verse the BSB omits).
5. Add the BSB to the name-linker measurements before calling its people and place links checked
   (`../name-linker/README.md`); they have only been measured on WEB, KJV and ASV.
6. Set the effective date in `src/data/legalDocuments.ts` (its Bible-text and storage wording already
   describes this feature and is accurate only once the packs are in).
7. `npm run test:bible-packs && npm run build && node scripts/offline-harness/run.mjs`, then commit
   `bible-packs/`.

## A later change to a text

Rebuild the pack. Its version changes; devices keep reading their downloaded copy and are offered an
update. Changing words can move highlights in the changed verses.

## Why these parsers

`parsers.mjs` ports the importer bible-api.com uses (`github.com/seven1m/bible_api`,
`bible_parser` 1.1.4), reading the same pinned `open-bibles` files, so that our text and the text
readers highlighted are the same string. The BSB is not read from there: it comes from its publisher.

## Test fixtures

`fixtures.mjs --out <scratch folder>` then `BIBLE_PACKS_DIR=<folder> npm run build`. Fixtures are
refused on Vercel.

## Switching the offline app copy off

Build with `DISABLE_OFFLINE_SHELL=1` and deploy: `/sw.js` removes itself and its caches on every
device. Downloaded texts are kept.
