# The name linker's regression net

`src/lib/verseAnnotations.ts` decides which words in the Bible text — and in every article the app
has ever written — become links to a person, place or topic. It renders **9,725 person-links across
Scripture and 5,699 across the app's own prose**. Until this directory existed it had no tests at
all, and a one-line data edit could move hundreds of them with nobody noticing.

    npm run test:linker

About a second. Run it before and after any change to `verseAnnotations.ts`, `people.ts`,
`locations.ts`, `pois.ts`, `topics.ts` or `timelineEvents.ts` — **all of those feed the linker**, so
"I only added a person" is exactly the kind of change that moves links somewhere else.

> **`npm run test:linker` is not a build check.** It bundles the data files with rolldown, which
> strips TypeScript types without checking them, so this suite goes green on a tree that does not
> compile. It is the same trap `AGENTS.md` documents for `tsc --noEmit`, from the other direction:
> that one type-checks without building, this one builds without type-checking. Neither one tells
> you whether the app builds. Only `npm run build` does, and it must exit 0.

## What it checks

**1. Named cases** (`cases.mjs`). Each one names a single occurrence of a single name in a single
verse, says what it should resolve to, and says why in a sentence. Each carries a `status`:

| status | meaning |
|---|---|
| `guard` | This is CORRECT. If it changes, you broke something. |
| `known-wrong` | This is a fault we have measured and not yet fixed. `expect` holds the *right* answer, and the case passes while the app still gives the wrong one. **When it starts passing, the case deliberately FAILS** and tells you to flip it to `guard` — so a fix cannot land unrecorded. |
| `flagged` | A live confessional or scholarly question that is **Robbie's to settle**, recorded so an unrelated change cannot take a position on his behalf. Do not "fix" one of these. If your change moves one, back the change out and escalate. |

A case normally names a Bible verse (`ref: "Acts 1:13"`). Give it `text:` instead and it becomes a
**prose case**: a literal sentence, run the way `LinkedVerseText` runs one — no book, no chapter, no
verse, only `owner`. Quote the sentence verbatim from the data file so the case asserts something
about real copy and not about a hypothetical.

    { text: "By this point the Gospel of John records that the chief priests…",
      surface: "John", owner: "jesus-of-nazareth", expect: null, status: "guard", why: "…" }

Prose cases exist because until they did, **the article surface could not be pinned by a named case
at all** — every case had to be a verse, so the only cover the 5,699 prose links had was the
snapshot. That is not the same thing: `prose-links.tsv` keys each row by a hash of its block's text,
so editing a paragraph re-keys every link in it and any assertion about them vanishes with the old
hash rather than failing (see the `tally.mjs` note below). A prose case survives a rewrite of the
article it was drawn from. Use one for any rule whose whole purpose is the article surface — the
book-reference suppressions in `NAME_CONTEXT_RULES` ("the Gospel of John", "1 John") fire *only*
there, because Scripture never names its own books, and are invisible to every reader-path case.
Not every rule in that table is article-only: the `"Peter and John"` rule in the same list resolves
7 verses on both Scripture paths, so it is pinned by ordinary verse cases as well.

**2. A whole-corpus snapshot** (`snapshot/*.tsv`), in three files:

| file | rows | what it holds |
|---|---:|---|
| `bible-links.tsv` | 9,725 | every person-link in all 31,098 WEB verses, with the id each rendering path gives it |
| `prose-links.tsv` | 5,699 | every person-link in every authored prose block the app puts through `LinkedVerseText` |
| `key-totals.tsv` | 3,628 | a tally covering **every** kind — location, POI, topic, timeline, verse reference — one row per (kind, matched text, id, path) |

The first two are row-level, so a diff names the verse or the block. `key-totals.tsv` exists because
the other two only record **people**: a change to `people.ts` can steal a key from a location, and
adding one POI alternate name can start firing hundreds of links that no person snapshot would ever
show. Its 3,628 rows currently break down as 2,028 verse references, 726 person, 377 location, 288
topic, 130 POI and 79 timeline.

This is the half that catches what you did not think to assert. The named cases cover a few dozen
verses; the snapshot covers all of them.

    node scripts/name-linker/run.mjs --update    # accept the current output as the new baseline

Only run `--update` once you have read the diff and can account for **every** moved row, including
the improvements you did not intend. Commit the snapshot change together with the change that caused
it: a reviewer should be able to read the two diffs side by side.

### Re-count the figures on this page when you update the snapshot

Every number above and below is counted from the snapshot files, and this page has been the last
thing to hear about a change more than once. It had drifted for four commits before 2026-09-07:
`ff14871` (-6 prose), `4a32dcc` (-13 prose), `2a3ea93` (-13 Bible, -41 prose, +2 divergent) and
`d3fc1e4` (-20 prose) each reported their own move accurately in their commit messages, and none of
them came back here — so the headline totals sat 13 Bible rows and 80 prose rows behind the files
they describe. Nothing catches that but doing it:

    wc -l scripts/name-linker/snapshot/*.tsv                                 # the three totals
    cut -f1 scripts/name-linker/snapshot/key-totals.tsv | sort | uniq -c     # the kind breakdown
    awk -F'\t' '$4!=$5 {n++; v[$1]=1} END {print n, length(v)}' \
      scripts/name-linker/snapshot/bible-links.tsv                           # reader/panel divergence

The block table further down is the one figure not in a snapshot file; `loadProseBlocks().length`
is where it comes from.

### What "every authored prose block" means, and how it has been wrong before

`prose-links.tsv` covers the blocks `loadProseBlocks()` in `corpus.mjs` enumerates, and **that list
is hand-maintained**. It is not derived from the components, and nothing checks it against them.

Until 2026-09-04 it omitted `timelineEvents` entirely — so `TimelineEventPanel`'s rendering of
`event.article` and `event.datingNotes` through `LinkedVerseText`, **2,151 person-links across all
358 events**, was outside the net. That is more than the entire rest of the prose corpus. A batch
moved 30 links inside that blind spot and reported none of them, and a deliberately absurd edit
(three unrelated names added to one person's `matchNames`, firing 50 wrong reader-facing links)
passed both `test:linker` and `npm run build`. Both are caught now.

The lesson generalises: **if you add a component that puts authored text through `LinkedVerseText`,
add its source fields to `loadProseBlocks()` in the same commit.** The blocks currently enumerated:

| source | blocks |
|---|---:|
| `people.ts` — lifeStory, controversies, placesLived, dating notes, extra-biblical source/summary | 1,497 |
| `timelineEvents.ts` — article paragraphs, datingNotes | 1,338 |
| `bookIntros.ts` — whyWritten, summary, manuscripts | 607 |
| `locations.ts` — history fields, archaeology note | 338 |
| `topics.ts` — section paragraphs | 333 |
| `pois.ts` — description, archaeology note | 202 |
| **total** | **4,315** |

`MyProfileView` also renders through `LinkedVerseText`, and is deliberately **not** here: what it
passes is the user's own typed favourite-verse text, not authored content, so there is nothing to
snapshot.

## The two rendering paths, and why every row has both

    reader   VerseText.tsx        passes book, chapter and verse.  All corrections fire.
    panel    LinkedVerseText.tsx  passes only excludeId.           Only OWNER_NAME_OVERRIDES fires.

`LinkedVerseText` is what PersonPanel, LocationPanel, PoiPanel, TopicPanel, BookIntroView,
TimelineEventPanel and MyProfileView render with. Every book override, verse override and
suppression in `verseAnnotations.ts` is invisible there. **836 links across 746 verses resolve
differently between the two paths**, and all but a handful of the 5,699 prose links run with no
disambiguation at all — `OWNER_NAME_OVERRIDES` (below) is the only correction that reaches them. A
fix that only moves the `reader` column has fixed half the app.

**Say which surface a number is measured on, every time.** They differ by an order of magnitude, and
describing a panel-path figure as if it were the article surface is the mistake this work has made
most often — "92 wrong `ram` links" is a panel-over-Scripture number; the reader path never had them
(a book allowlist already handled it) and the article surface had 9, of which 7 went.

### The one correction the panel path does have

`LinkedVerseText` passes no book, but it does pass `excludeId` — the id of the record whose page the
text is on. `PersonPanel` passes `person.id`, `TimelineEventPanel` passes `event.id`, and so on.
`BookIntroView` has no record to name, so it passes a synthesised id from `bookIntroOwnerId(book)`
in `verseAnnotations.ts` — `"book-intro:Zechariah"`, `"book-intro:1 Samuel"`. The `book-intro:`
prefix cannot collide with a real record id (none contains a colon), so introducing it moved no
link: `key-totals` was unchanged and all 681 prose rows came back identical but for the owner
field. It exists so a book intro has a key to be corrected against at all. `corpus.mjs` imports
that same function, so the harness's `owner` for a book-intro block is exactly what the component
passes.

That id is context, and `OWNER_NAME_OVERRIDES` in `verseAnnotations.ts` reads it: lowercase bare
name -> owning record id -> target person id, or `null` for no link.

It is the only lever the app's own articles have. It is also coarse — one answer per record, so an
article that legitimately names both bearers of a name needs the longer-wording trick instead (Acts
1:13, Acts 10:32). A named case can pin it with `path: "panel"` plus `owner: "<record id>"`.

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
link lost and another gained. It reads `prose-links.tsv` too, and reports a `prose:` line for it
rather than inventing reader/panel columns the file does not have. Note that prose rows are keyed by
a hash of the block's own text, so **editing a paragraph re-keys every link in it** and `tally.mjs`
will show them as removed-and-added; read the `run.mjs` diff across a prose edit, not this.

`census.mjs` exists because the alternative — reasoning about how a name "probably" appears in
Scripture — is how wrong counts get into reports. It has already corrected this project's own
scoping document twice. **Run it before claiming a change fixes N links.**

## What this does NOT cover

- **KJV and ASV.** The app offers both and neither is measured here. `VERSE_NAME_OVERRIDES` is keyed
  by book/chapter/verse and is translation-blind, so it fires identically whatever the reader has
  selected — including where the wording differs enough to make the override meaningless. See
  `corpus/PROVENANCE.md`.
- **Whether the tree compiles.** See the warning at the top. Run `npm run build`.
- **The running app.** These scripts call the real module with the real arguments the real components
  pass, which is strong evidence but is not the same as looking at the screen. The app is behind a
  Supabase auth gate. Anyone with a login should still eyeball Revelation 13:17, 2 Kings 17:1,
  Acts 1:13 and John the Apostle's biography page after a change lands.
- **Any prose surface not listed in `loadProseBlocks()`.** That list is hand-maintained; see above.
- **Text the panels render WITHOUT `LinkedVerseText`** — a timeline event's `summary`, for instance,
  is plain text, so a name in it is reader-facing but never a link and never appears here.
- **Non-person links at row level.** Location, POI, topic, timeline and verse-reference annotations
  are counted in `key-totals.tsv` but are not snapshotted row by row; the ambiguity lives in the
  person names.
