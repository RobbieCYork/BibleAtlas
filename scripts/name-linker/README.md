# The name linker's regression net

`src/lib/verseAnnotations.ts` decides which words in the Bible text — and in every article the app
has ever written — become links to a person, place or topic. It renders **9,800 person-links across
Scripture and 3,673 across the app's own prose**. Until this directory existed it had no tests at
all, and a one-line data edit could move hundreds of links with nobody noticing.

    npm run test:linker

About a second. Run it before and after any change to `verseAnnotations.ts`, `people.ts`,
`locations.ts`, `pois.ts`, `topics.ts` or `timelineEvents.ts` — **all of those feed the linker**, so
"I only added a person" is exactly the kind of change that moves links somewhere else.

## What it checks

**1. Named cases** (`cases.mjs`). Each one names a single occurrence of a single name in a single
verse, says what it should resolve to, and says why in a sentence. Each carries a `status`:

| status | meaning |
|---|---|
| `guard` | This is CORRECT. If it changes, you broke something. |
| `known-wrong` | This is a fault we have measured and not yet fixed. `expect` holds the *right* answer, and the case passes while the app still gives the wrong one. **When it starts passing, the case deliberately FAILS** and tells you to flip it to `guard` — so a fix cannot land unrecorded. |
| `flagged` | A live confessional or scholarly question that is **Robbie's to settle**, recorded so an unrelated change cannot take a position on his behalf. Do not "fix" one of these. If your change moves one, back the change out and escalate. |

**2. A whole-corpus snapshot** (`snapshot/*.tsv`), in three files:

| file | rows | what it holds |
|---|---:|---|
| `bible-links.tsv` | 9,800 | every person-link in all 31,098 WEB verses, with the id each rendering path gives it |
| `prose-links.tsv` | 3,673 | every person-link in every authored prose block |
| `key-totals.tsv` | 3,021 | a tally covering **every** kind — location, POI, topic, timeline, verse reference — one row per (kind, matched text, id, path) |

The first two are row-level, so a diff names the verse. `key-totals.tsv` is there because the other
two only watch people: a change to `people.ts` can steal a key from a location, and adding one POI
alternate name can start firing hundreds of links that no person snapshot would ever show.

This is the half that catches what you did not think to assert. The named cases cover a few dozen
verses; the snapshot covers all of them.

    node scripts/name-linker/run.mjs --update    # accept the current output as the new baseline

Only run `--update` once you have read the diff and can account for **every** moved row, including
the improvements you did not intend. Commit the snapshot change together with the change that caused
it: a reviewer should be able to read the two diffs side by side.

## The two rendering paths, and why every row has both

    reader   VerseText.tsx        passes book, chapter and verse.  All corrections fire.
    panel    LinkedVerseText.tsx  passes NOTHING.                  No correction fires.

`LinkedVerseText` is what PersonPanel, LocationPanel, PoiPanel, TopicPanel, BookIntroView and
MyProfileView render with. Every book override, verse override and suppression in
`verseAnnotations.ts` is invisible there. **1,058 verses resolve differently between the two paths**,
and all 3,673 prose links run with zero disambiguation. A fix that only moves the `reader` column has
fixed half the app.

## Tools

    node scripts/name-linker/run.mjs --ref "Acts 1:13"        one verse, both paths
    node scripts/name-linker/run.mjs --ref "Acts 1:13;John 1:6"    several (";"-separated)
    node scripts/name-linker/run.mjs --grep "mark of the beast"    every verse matching a pattern
    node scripts/name-linker/census.mjs mark                  every occurrence of one key,
                                                              with capitalisation and resolution
    node scripts/name-linker/census.mjs "the adversary" --prose    …including the prose corpus
    node scripts/name-linker/inventory.mjs                    what the linker knows; what it
                                                              registers but can never reach
    node scripts/name-linker/tally.mjs <old.tsv> <new.tsv>    counts what moved between two
                                                              snapshots, per rendering path

`tally.mjs` is how you turn "this feels like a big change" into a number you can put in a commit
message. Get the old snapshot with `git show <sha>:scripts/name-linker/snapshot/bible-links.tsv >
/tmp/old.tsv`. It follows an occurrence by reference and offset, so a link that merely grew to cover
a longer phrase — "James" becoming "James the son of Alphaeus" — is counted as repointed, not as one
link lost and another gained.

`census.mjs` exists because the alternative — reasoning about how a name "probably" appears in
Scripture — is how wrong counts get into reports. It has already corrected this project's own
scoping document twice. **Run it before claiming a change fixes N links.**

## What this does NOT cover

- **KJV and ASV.** The app offers both and neither is measured here. `VERSE_NAME_OVERRIDES` is keyed
  by book/chapter/verse and is translation-blind, so it fires identically whatever the reader has
  selected — including where the wording differs enough to make the override meaningless. See
  `corpus/PROVENANCE.md`.
- **The running app.** These scripts call the real module with the real arguments the real components
  pass, which is strong evidence but is not the same as looking at the screen. The app is behind a
  Supabase auth gate. Anyone with a login should still eyeball Revelation 13:17, 2 Kings 17:1,
  Acts 1:13 and John the Apostle's biography page after a change lands.
- **Anything that is not a person-link.** Location, POI, topic, timeline and verse-reference
  annotations are computed but not snapshotted. Ambiguity lives in the person names.
