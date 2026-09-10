# The name linker's regression net

`src/lib/verseAnnotations.ts` decides which words in the Bible text — and in every article the app
has ever written — become links to a person, place or topic. It renders **9,724 person-links across
Scripture and 6,371 across the app's own prose**. Until this directory existed it had no tests at
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
at all** — every case had to be a verse, so the only cover the 6,176 prose links had was the
snapshot. That is not the same thing: `prose-links.tsv` keys each row by a hash of its block's text,
so editing a paragraph re-keys every link in it and any assertion about them vanishes with the old
hash rather than failing (see the `tally.mjs` note below). A prose case survives a rewrite of the
article it was drawn from. Use one for any rule whose whole purpose is the article surface — the
book-reference suppressions in `NAME_CONTEXT_RULES` ("the Gospel of John", "1 John") fire *only*
there, because Scripture never names its own books, and are invisible to every reader-path case.
Not every rule in that table is article-only: the `"Peter and John"` rule in the same list resolves
7 verses on both Scripture paths, so it is pinned by ordinary verse cases as well.

Since 2026-09-09 that book-title rule is general rather than John's alone — a book title links to no
person, for every book — and the BOOK TITLES section of `cases.mjs` is now the largest single group
of prose cases here, for exactly the reason above. **117 links came out and every shape has a case**,
because the batch before this one fixed its findings by rewording the offending sentences, and a
later edit would have undone that silently. The twenty links deliberately KEPT — "Peter's vision",
"Isaiah's prophecy", "the Law of Moses", "Luke's account" — have cases too, and they are the half a
careless widening of these rules breaks first. Nothing in it moved a Bible row: the shapes were
chosen so that Scripture's own "the book of Moses", "First Moses says" and "the wisdom of Solomon"
keep their links, and those three near-misses are pinned as verse guards.

#### A modern book or journal title is a no-link too — read this before you write a citation

Ruled 2026-09-10, extending the same principle from the canon to a bibliography: **a person's name
inside the title of a modern book, article or journal links to no person.** «Abraham in History and
Tradition» (Van Seters, 1975) names a monograph, and it is a stronger case than any biblical book —
there is no reading on which the word is the man, so pointing a reader at the patriarch from a
bibliographic reference is wrong rather than merely opinionated.

Archaeology prose produces these constantly, so the mechanics matter. The suppression is **a phrase
pin on the title string** in the MODERN WORK TITLES block of `NAME_CONTEXT_RULES`, plus a prose case
in `cases.mjs`. It is deliberately *not* a pattern: nothing in the words around a title says
"title" — the neighbours are an author's surname and a year, and a rule keyed on either would reach
far past titles. `modern-names.mjs` is allowed to key on "Van Seters" only because it may be wrong
five times out of six; a suppression rule may not. So it is one pin per title, written by whoever
adds the citation, in the commit that adds it.

The same mechanism now carries four pins that are not titles, added with the forgeries batch: the
two quoted ossuary readings in the `talpiot-tomb` article — whose whole argument is that a cluster
of very common names identifies nobody, so the inscriptions link to nobody — and two modern
surnames that are also places, `Y. Gath` who excavated that tomb, and `Damascus Gate`, which had
been sending readers of the Garden Tomb POI to Syria. Every one has a prose case. `probe.mjs`
below will tell you what a sentence links before you commit it, which is cheaper than reading it
out of a snapshot diff afterwards.

A candidate of this shape is a **fault to fix, not a row for `reviewed.tsv`** — do not clear one
with `--update`. Measured the day the ruling was made: 12 modern titles and journal names sit in
linked prose and 2 carried a live link. One was the Van Seters title. The other is left standing on
purpose and is written up in `reviewed.tsv`'s header.

**2. A whole-corpus snapshot** (`snapshot/*.tsv`), in three files:

| file | rows | what it holds |
|---|---:|---|
| `bible-links.tsv` | 9,724 | every person-link in all 31,098 WEB verses, with the id each rendering path gives it |
| `prose-links.tsv` | 6,371 | every person-link in every authored prose block the app puts through `LinkedVerseText` |
| `key-totals.tsv` | 4,074 | a tally covering **every** kind — location, POI, topic, timeline, verse reference — one row per (kind, matched text, id, path) |

The first two are row-level, so a diff names the verse or the block. `key-totals.tsv` exists because
the other two only record **people**: a change to `people.ts` can steal a key from a location, and
adding one POI alternate name can start firing hundreds of links that no person snapshot would ever
show. Its 4,074 rows currently break down as 2,348 verse references, 738 person, 391 topic, 387
location, 131 POI and 79 timeline.

This is the half that catches what you did not think to assert. The named cases cover a few dozen
verses; the snapshot covers all of them.

    node scripts/name-linker/run.mjs --update    # accept the current output as the new baseline

Only run `--update` once you have read the diff and can account for **every** moved row, including
the improvements you did not intend. Commit the snapshot change together with the change that caused
it: a reviewer should be able to read the two diffs side by side.

**3. A modern-name sweep** (`modern-names.mjs`, ledger in `reviewed.tsv`). Runs as part of
`npm run test:linker`. This one exists because **a wrong NEW link is additive**: it arrives in the
snapshot diff as a row that was not there before, indistinguishable from the good links a new
article brings with it. Six shipped to production in two days and every one was caught by a human
reading a rendered page, never by this suite. So it asks a different question — not "did anything
move?" but "does any link sit inside a modern personal name?" — and requires every YES to carry a
verdict in `reviewed.tsv`. A new article that writes "excavated by John Garstang" fails on the
commit that adds it. Read the header of that file for the discriminator, its measured hit rate
against the known faults, and what it deliberately cannot see.

    node scripts/name-linker/modern-names.mjs            list every candidate
    node scripts/name-linker/modern-names.mjs --update   accept the current set as reviewed

`--update` is refused when `--check` is also present, so `npm run test:linker -- --update` cannot
bless a new candidate while accepting a snapshot move. Blessing one is its own command.

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

It happened a second time, and the second one is worse because nobody added anything. Until
2026-09-10 the locations branch read `h.facts` — **a field no record has ever had.** The type
declares `notableFacts` and `LocationPanel` maps over `notableFacts`, one `LinkedVerseText` per
entry. So the line ran, found `undefined`, enumerated nothing, and did it silently from the day it
was written: **385 blocks across all 117 location records, 852 links of which 321 are person
links.** Three of those links were wrong and had been live on capstonebible.com the whole time —
"Nahal David" pointing at the king, and "David Ussishkin" and "James Pritchard" pointing at the king
and at the son of Zebedee. The modern-name sweep found all three within a minute of the field name
being corrected, which is the argument for that sweep in one line.

Note what did *not* catch it. The snapshot was green throughout, because a surface that is never
enumerated can never show a diff — this failure mode is invisible **by construction**, and it is the
one thing here that no amount of running the suite will surface. It was found by a batch editing
four location records and noticing that its own cross-links never reached `key-totals.tsv`. **If you
touch a record and its links do not appear in the snapshot diff, that is not luck — check that the
field is enumerated at all.**

The lesson generalises, and now in both directions: **if you add a component that puts authored text
through `LinkedVerseText`, add its source fields to `loadProseBlocks()` in the same commit — and if
you rename a data field, grep `corpus.mjs` for the old name.** The blocks currently enumerated:

| source | blocks |
|---|---:|
| `people.ts` — lifeStory, controversies, placesLived, dating notes, extra-biblical source/summary | 1,497 |
| `timelineEvents.ts` — article paragraphs, datingNotes | 1,338 |
| `bookIntros.ts` — whyWritten, summary, manuscripts | 607 |
| `locations.ts` — history fields, notable facts, archaeology note | 724 |
| `topics.ts` — section paragraphs | 1,324 |
| `pois.ts` — description, archaeology note | 202 |
| **total** | **5,692** |

`MyProfileView` also renders through `LinkedVerseText`, and is deliberately **not** here: what it
passes is the user's own typed favourite-verse text, not authored content, so there is nothing to
snapshot.

## The two rendering paths, and why every row has both

    reader   VerseText.tsx        passes book, chapter and verse.  All corrections fire.
    panel    LinkedVerseText.tsx  passes only excludeId.           Only OWNER_NAME_OVERRIDES fires.

`LinkedVerseText` is what PersonPanel, LocationPanel, PoiPanel, TopicPanel, BookIntroView,
TimelineEventPanel and MyProfileView render with. Every book override, verse override and
suppression in `verseAnnotations.ts` is invisible there. **834 links across 744 verses resolve
differently between the two paths**, and all but a handful of the 6,371 prose links run with no
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
    node scripts/name-linker/probe.mjs <owner> "<sentence>"   every link one candidate sentence
                                                              renders on the ARTICLE surface
    node scripts/name-linker/links-for.mjs <id> [<id>…]       every link a RECORD'S OWN prose
    node scripts/name-linker/links-for.mjs --book-intros       renders, in reading order, with
    node scripts/name-linker/links-for.mjs --grep "<pattern>"  the words either side of each
    node scripts/name-linker/tally.mjs <old.tsv> <new.tsv>    counts what moved between two
                                                              snapshots, per rendering path
    node scripts/name-linker/modern-names.mjs                 every link sitting inside what
                                                              looks like a modern personal name

`links-for.mjs` is `probe.mjs` for prose already written rather than for a sentence about to be
written, and it exists because **a wrong link in a NEW article is invisible to everything else
here.** The snapshot reports it as a row that was not there before, which is exactly what every
GOOD link in a new article also looks like; `modern-names.mjs` inspects only modern personal names,
and the commonest fault of this shape is not one — the papyri-and-uncials batch enumerated its own
twelve articles and found 21 wrong links, **fourteen of them a bare "John" resolving to the Baptist
from sentences about the Fourth Gospel.** Nothing else in this directory would have said so. The
tool only prints the links; reading them is the check.

It takes record ids (`aleppo-codex`), the synthesised book-intro owners (`"book-intro:Psalms"`),
`--book-intros` for all 66, and `--grep` for every block whose text matches a pattern — which is how
to answer "what will this name do to the corpus?" *before* registering it. `--kind person` narrows.
Run it over **every record a batch adds or edits, and every block the batch's new names will reach**,
before the commit rather than after it.

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
- **Five fields that are links on the PUBLIC pages and plain text in the app.** `scripts/seo/render.mjs`
  puts `person.summary`, `person.occupation`, `topic.summary`, `timelineEvent.summary` and
  `location.rulers[].name` through the same linker when it generates the ~985 pre-rendered pages.
  The app renders all five as plain text, so `loadProseBlocks()` correctly does not enumerate them
  and none of the three snapshots covers a single one — 961 blocks that a stranger can read on
  capstonebible.com and that nothing here measures. `modern-names.mjs` sweeps them (its
  `seoOnlyBlocks()`), which is how the wrong `Hoshea` on the fall-of-Samaria summary was found, but
  that is a sweep for one shape, not a snapshot. Snapshotting them properly is worth doing and is
  not done.
- **Text the panels render WITHOUT `LinkedVerseText`** — a timeline event's `summary`, for instance,
  is plain text, so a name in it is reader-facing but never a link and never appears here.
- **Non-person links at row level.** Location, POI, topic, timeline and verse-reference annotations
  are counted in `key-totals.tsv` but are not snapshotted row by row; the ambiguity lives in the
  person names.
