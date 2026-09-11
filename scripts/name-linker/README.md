# The name linker's regression net

`src/lib/verseAnnotations.ts` decides which words in the Bible text — and in every article the app
has ever written — become links to a person, place or topic. It renders **9,697 person-links across
Scripture, 6,210 across the app's own prose, and 814 more on the pre-rendered public pages alone**.
Until this directory existed it had no tests at
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

Give it **both** `text:` and `ref:` and it is a third thing, added 2026-09-10: the **reader path run
against a literal you supply** instead of against the WEB corpus. That is the only way to assert
anything about the KJV or the ASV, which a reader can select and which nothing here otherwise
measures (see the bottom of this page). `VERSE_NAME_OVERRIDES` is translation-blind, so the entries
with the least cover are exactly the verses whose three renderings differ — and a green Bible
snapshot says nothing at all about them, because the corpus is WEB only.

    { ref: "Acts 4:36", translation: "ASV",
      text: "And Joseph, who by the apostles was surnamed Barnabas…",
      surface: "Joseph", expect: "barnabas", status: "guard", why: "…" }

Acts 4:36 is the verse that forced it. WEB and KJV read "Joses" and the ASV reads "Joseph" — a
manuscript variant (Ἰωσῆς in the Textus Receptus, Ἰωσήφ in NA28 and SBLGNT) of one man's name, not
two men — so the override sending that "Joseph" to Barnabas fires for one translation of the three
and matches nothing in the corpus. Quote the verse verbatim from the translation `translation:`
names, from `bible-api.com`, which is the service `src/lib/biblePassage.ts` asks for the text.

Prose cases exist because until they did, **the article surface could not be pinned by a named case
at all** — every case had to be a verse, so the only cover the 6,210 prose links had was the
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

**2. A whole-corpus snapshot** (`snapshot/*.tsv`), in five files:

| file | rows | what it holds |
|---|---:|---|
| `bible-links.tsv` | 9,697 | every person-link in all 31,098 WEB verses, with the id each rendering path gives it |
| `prose-links.tsv` | 6,210 | every person-link in every authored prose block the app puts through `LinkedVerseText` |
| `key-totals.tsv` | 5,066 | a tally covering **every** kind and **all three translations** — one row per (kind, matched text, id, path) |
| `translation-divergence.tsv` | 1,776 | every verse where the WEB, the KJV and the ASV do not produce the same links |
| `seo-only-links.tsv` | 1,748 | every link, of **every** kind, that only the pre-rendered public pages print — see **The public pages** below |

The first two are row-level, so a diff names the verse or the block. `key-totals.tsv` exists because
the other two only record **people**: a change to `people.ts` can steal a key from a location, and
adding one POI alternate name can start firing hundreds of links that no person snapshot would ever
show. Its 5,066 rows break down by kind as 2,349 verse references, 1,234 person, 645 location, 546
topic, 204 POI and 88 timeline; and by path as 3,098 prose, 503 `reader`, 494 `reader:asv`, 488
`reader:kjv` and 483 `panel`.

The fourth file, and those two extra `key-totals` paths, are what cover the KJV and the ASV — see
**All three translations** below.

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

**4. A self-name sweep** (`self-name.mjs`, ledger in `self-name-reviewed.tsv`). Added 2026-09-10
by the second-bearer batch, and it asks a fourth question none of the three above can:

> Does a record's OWN name link to somebody else, on its own page?

`computeLinkAnnotations` excludes a record's page from linking to itself, but the exclusion is
`id !== excludeId` — it only fires when the resolved id **is** the owner. Where a page's subject
shares a bare name with a more famous bearer, the name resolves to the other man, the exclusion
never sees it, and the page hands its own subject's name to somebody else on every mention.

It is the single commonest failure site in the second-bearer enumeration, and nothing else here
could see it. The **snapshot is green**, because these links have sat there since the records were
written and a fault that never moves produces no diff. `modern-names.mjs` is silent, because
"Philip" and "Ananias" are not modern names. `links-for.mjs` would show it to somebody who ran it
on the right record and read the output — this is that, swept.

    node scripts/name-linker/self-name.mjs            list every candidate, with an example
    node scripts/name-linker/self-name.mjs --check    exit 1 if any candidate is unreviewed

`--check` runs as the third command in `npm run test:linker`, from the commit that cleared the
last of the 60 faults. A new record whose subject shares a bare name with a more famous one now
fails on the commit that adds it, the way `modern-names.mjs` already fails on a new "excavated by
John Garstang".

"Its own name" is the **first word** of the person record's `name`, after an honorific: `Philip the
Evangelist` → Philip, `Joram, King of Judah` → Joram, `Mark (John Mark)` → Mark. Not every word of
the name — "James, brother of Jesus" would otherwise flag its own correct `Jesus` links, and the
value of this check is that it has almost nothing to wade through. The cost is real and worth
stating: it cannot see a record whose subject is known by a name that is not the first word of that
field.

**That cost has now been paid once, and it is worth knowing what it looked like.** The Caesar
cluster of 2026-09-10 found five links on `nero-caesar`'s own page — including the sentence that
says *"he is the unnamed 'Caesar' Paul repeatedly invokes"* — all pointing at **Tiberius**. The
record's `name` is "Nero Caesar", so this sweep checked "Nero", found nothing, and was correctly
silent; the fault was on the second word. The snapshot was green for the usual reason (a fault that
never moves produces no diff), `modern-names.mjs` saw nothing modern, and nothing else here could
have said so. It was found by enumerating one name across the whole corpus by hand. If a record's
subject is commonly called by a *later* word of its `name` — "Nero **Caesar**", "Tiberius
**Caesar**", "Claudius **Caesar**" — that word is outside this check, and the only way to see it is
`links-for.mjs` on the record or a census of the name.

The ledger is hand-written and there is deliberately **no `--update`**. A candidate here is a fault
until somebody argues otherwise, so a row costs a sentence of typing and a row with no note is
refused outright — the opposite default from `modern-names.mjs`, where most candidates are correct
links and blessing in bulk is sane.

What it found on the day it was written, with the Philip cluster already fixed: **14 shapes, 62
links, of which 60 were faults** — 2 shapes and 3 links once the last of the four batches landed,
both of them accepted in the ledger.
Six of the fourteen were not in the sweep that prompted the file
— `mary-magdalene`, `mary-of-bethany`, `james-son-of-alphaeus`, `thomas-aquinas`, `caesar-augustus`
and the five records called Simon. That sweep had checked those records and reported that they
"resolve correctly wherever their longer wording appears", which was true and was a different
question.

## All three translations

`BiblePanel` offers **WEB (the default), KJV and ASV**. Until 2026-09-10 the corpus was WEB only,
and the line `snapshot/bible: unchanged` was therefore **no evidence at all** about two of the three
translations a reader can select. What that blind spot cost was measured the day before it was
closed: "Judaea" was not a registered name, so **KJV and ASV readers silently lost every Judea link
in Scripture — 85 of them** — while WEB readers saw them all, and nothing here could say so.

`corpus/kjv-bible.json.gz` and `corpus/asv-bible.json.gz` now sit beside the WEB file; see
`corpus/PROVENANCE.md` for where they came from, what was stripped, and how they compare against
`bible-api.com`, which is what the reader's panel actually fetches.

**Two files carry the coverage, and neither is another copy of `bible-links.tsv`.**

`key-totals.tsv` gains two paths, `reader:kjv` and `reader:asv` — 488 and 494 rows. Its key is
(kind, matched surface, id, path), so any KJV or ASV link that vanishes, repoints, or merely grows
to cover a longer phrase moves a row. That is **the regression net**, and it covers every annotation
kind rather than people alone.

`translation-divergence.tsv` holds one row per (verse, kind, resolved id) whose link **count** is
not identical in all three, carrying the surface each translation matched:

    1 Chronicles 7:28  poi  bethel  WEB=1:Bethel  KJV=1:Bethel  ASV=0

`n/a` means the verse is not in that translation at all (the KJV carries 109 verses the WEB critical
text does not; the ASV is 13 short of it). It is keyed by **resolved id, not by surface**, so "the
angel" against "angel" — same record, both linked, one span a word longer — is not a divergence;
keying on the surface instead more than doubles the file with that noise.

Three reasons it is shaped that way rather than as two more row-level person snapshots:

1. **The fault that prompted it was a location.** `bible-links.tsv` records only person links. Two
   more files of that shape would not have shown one of the 85 Judaea links.
2. **The fault never moved.** It had been there since the records were written, so a
   per-translation snapshot would have baselined it as correct and stayed green forever. A file
   whose subject is *disagreement between translations* makes a standing fault visible the day it is
   first written — the same argument `self-name.mjs` is built on.
3. **Size.** 1,776 rows and 117KB, against roughly 19,000 rows and 840KB for two more
   `bible-links.tsv` files. A snapshot nobody can read in a diff is worse than none.

**The one thing this pair cannot see** is a link whose *span* changes in one translation only while
its kind, id and count all stay equal across the three — that produces no divergence row. It is
`key-totals.tsv`'s two new paths that cover it, which is why both files exist.

    node scripts/name-linker/translations.mjs --ref "Matthew 2:1"   all three, words and links
    node scripts/name-linker/translations.mjs --diverge --id bethel  one record's divergences
    node scripts/name-linker/translations.mjs --grep "Beth-el" --in ASV

**Read a divergence with `--ref` before calling it a bug.** Three things that are NOT bugs and look
like them:

- **A phrase pin absorbing a name.** The WEB's "David's city" gives three person links at
  1 Chronicles 11:5; the KJV's "the city of David" gives two, because the third is inside one
  `city-of-david` POI link. Both are right. Same shape as "Bethlehem of Judea", which the WEB pins
  as a single `bethlehem` link while the KJV's "Bethlehem of Judaea" links town and region
  separately. 134 rows are this.
- **Different words.** The KJV writes "devils" where the other two write "demons", "Holy Ghost" for
  "Holy Spirit", "tabernacle" where the ASV writes "tent". `Joses` against `Joseph` at Acts 4:36 is
  a manuscript variant of one man's name. None of these is a defect, and 902 rows are this.
- **A verse one translation does not have.** 39 rows.

What is left — **700 rows** — is a reader on one translation losing a correct link or getting a
wrong one, and it is a real population. The pass that built this file enumerated 766 of them and
deliberately fixed none: **265 were confirmed against bible-api.com** (that reader really is served
that word, unlinked), **29 were contradicted by it** and were corpus artefacts rather than app
faults, and 472 were in chapters the partial diff had not reached. Written up in the escalation of
2026-09-10. That three-way split is the pre-batch measurement and has not been re-derived since.

**66 of those 766 were the compound proper nouns** — "Obed-edom", "Bar-jesus", "Tubal-cain",
"Abel-mizraim" and fourteen more — and they left the file on 2026-09-10 when the COMPOUND PROPER
NOUNS block of `NAME_CONTEXT_RULES` was widened from `\s+` to `[\s-]`. **One row arrived**, and it
is worth reading, because it is a divergence the fix made visible rather than one it caused:

    Judges 13:25  location  dan  WEB=0  KJV=1:Dan  ASV=0

The WEB and the ASV read "Mahaneh-dan" and are now suppressed; bible-api.com's KJV reads "the camp
of Dan", a bare name this block cannot and should not reach. Whether that bare "Dan" ought to link
to the northern city is a separate question about bare names, not about compounds.

**The corpus artefacts run in BOTH directions, and that is the trap in this file.** `corpus/`'s KJV
comes from bolls, which closes these compounds up — "Obededom", "Barjesus", "Tubalcain",
"Pahathmoab" — so the harness reported the KJV clean while bible-api.com, which is what
`src/lib/biblePassage.ts` fetches, served "Obed-edom" and "Bar-jesus" and the reader had **69 wrong
links the snapshot could not see**. The ASV corpus does it once in reverse: it reads
"Abel-cheramim" at Judges 11:33 where bible-api.com reads "Abelcheramim", so that one row was a
fault in the corpus only. **A divergence row is a claim about our corpora, never about the reader —
confirm it against bible-api.com before acting on it, in either direction.**

## The public pages

The app is behind a Supabase auth gate. The ~1,000 pre-rendered article pages at
www.capstonebible.com are not: they carry no script and no session, and they are the **one surface
of this project a stranger or a crawler can read**. `scripts/seo/render.mjs` generates them from the
same `src/data/*.ts` arrays the app renders, and it puts five fields through the same
`computeLinkAnnotations` — fields the APP prints as plain text:

| field | blocks | links printed |
|---|---:|---:|
| `person.summary` | 242 | 568 |
| `person.occupation` | 200 | 86 |
| `topic.summary` | 185 | 267 |
| `timelineEvent.summary` | 358 | 744 |
| `location.history.rulers[].name` | 86 | 83 |
| **total** | **1,071** | **1,748** |

`loadProseBlocks()` correctly does not enumerate them — the app really does render them unlinked —
so until 2026-09-10 **not one of them was in any snapshot**. `loadSeoOnlyBlocks()` in `corpus.mjs`
enumerates them, `modern-names.mjs` sweeps them, and `snapshot/seo-only-links.tsv` now holds one row
per link.

**Why a snapshot and not a reviewed ledger.** `self-name.mjs` refuses `--update` because its
fourteen candidates were standing faults a baseline would have blessed forever. That argument does
not carry here: this is 1,748 links, most of them correct, and a hand-written verdict per row is not
a file anybody would maintain — the same reason `modern-names.mjs` has `--update` and
`self-name.mjs` does not. The standing-fault half of the job is `modern-names.mjs`, which reads
these blocks; this file is the "did anything move?" half, which nothing did at all. The honest
version of that trade is that **somebody has to read the baseline once before it is committed**, and
the commit that added this file is that reading: all 814 person links and every distinct
(surface → id) pair among the 934 others. It found four wrong links, and all four are fixed in that
same commit rather than baselined — see the block at the end of `cases.mjs`.

**Why all five kinds and not people only.** `prose-links.tsv` records person links alone because
`key-totals.tsv` carries the other kinds for that surface. Nothing carried any kind here, so a
person-only file plus a new `key-totals` path would be two files doing one file's work. The extra
934 rows buy the location, topic, POI and timeline links — and the ruler field is, by construction,
mostly locations. Two of the four faults found were on it.

**Why keyed by field + record + index rather than by a hash of the text.** `prose-links.tsv` hashes
each block, so editing a paragraph re-keys every row in it and any assertion about them vanishes with
the old hash instead of failing. That is the right trade for an article of many paragraphs. It is the
wrong one here: these blocks are one per record per field, or a short indexed list, so the position is
stable and a reworded summary shows up as a **changed link row** rather than as a silent re-key.

**Size.** 1,748 rows and 124KB — between `translation-divergence.tsv` (1,776 rows, 114KB) and nothing,
and a seventh of `prose-links.tsv`. A diff names the field and the record. That was the bar
`translation-divergence.tsv` set: a snapshot nobody can review in a diff is worse than none.

### What turning it on found

Four genuine wrong links, all live on capstonebible.com since their record was written, all fixed
with the commit that added the file:

| page | field | link | should be |
|---|---|---|---|
| `/place/rabbah` | ruler name | "Philadelphia" → `philadelphia-asia` | Rabbah's own Ptolemaic name, in the Transjordan — not the Lydian city of Revelation 3 |
| `/place/antioch-pisidia` | ruler name | "Caesarea" → `caesarea-maritima` | inside "Colonia Caesarea Antiochia", Pisidian Antioch's own Latin name |
| `/person/zechariah-father-of-john-baptist` | occupation | "Abijah" → `abijah-king-of-judah` | the priestly course of 1 Chronicles 24:10, not the king |
| `/person/gideon` | summary | "Manasseh" → `manasseh-king-of-judah` | the tribe, not the king five centuries later |

**Two of the four are on the ruler field, and that field had never been enumerated by anything.**
`modern-names.mjs` kept its own copy of the block list and read `l.rulers`, where the type is
`LocationHistory.rulers` and `render.mjs` reads `loc.history?.rulers` — so the ruler branch matched
nothing, silently, every time the sweep ran. Exactly the `h.facts` bug `loadProseBlocks()` describes,
in a second copy of the same list. That is why there is now one copy, in `corpus.mjs`, imported by
both. The sweep believed it covered 985 blocks; the surface is 1,071.

**The Abijah pin reached two further surfaces nobody had asked about.** "the division of Abijah" is
Luke 1:5's own wording, so the same phrase pin removed one Bible row (Luke 1:5, panel path — the
reader path already had a book override) and one prose row on that record's `lifeStory`. The fault
was live on three surfaces and only one of them was being measured.

Four more links are **correct but arguably unwanted**, and are deliberately left standing rather than
ruled on by an agent: "the Society of Jesus" links to Jesus of Nazareth on `/person/ignatius-of-loyola`
and `/event/society-of-jesus-founded-1540` (a name inside an institution's proper name — the same
shape the `trinity`/`Trinity College` pin suppresses), and "the resurrection" of the dead links to the
timeline event `bib-loc-resurrection` on `/person/pharisees` and `/person/sadducees`, where the words
name the doctrine rather than the event. Escalated, not fixed.

**The first thing this file caught was somebody else's fix.** The compound-proper-noun batch
landed while this one was in flight, and rebasing onto it moved exactly one row here: the "Ur"
inside "Ur-Nammu" on `/event/wld-ane-third-dynasty-ur` stopped linking to the city of Ur. That is
their fix reaching a surface their own run could not see, and it is the whole argument for this file
in one row.

Nothing that an earlier pass fixed on this surface had regressed: `Hoshea` on the fall-of-Samaria
summary, the Caesar cluster's emperor summaries, the nativity records and every second-bearer record
(three Ananiases, four Simons, two Philips, the Marys) all resolve correctly.

### Re-count the figures on this page when you update the snapshot

Every number above and below is counted from the snapshot files, and this page has been the last
thing to hear about a change more than once. It had drifted for four commits before 2026-09-07:
`ff14871` (-6 prose), `4a32dcc` (-13 prose), `2a3ea93` (-13 Bible, -41 prose, +2 divergent) and
`d3fc1e4` (-20 prose) each reported their own move accurately in their commit messages, and none of
them came back here — so the headline totals sat 13 Bible rows and 80 prose rows behind the files
they describe. Nothing catches that but doing it:

    wc -l scripts/name-linker/snapshot/*.tsv                                 # the four totals
    cut -f1 scripts/name-linker/snapshot/key-totals.tsv | sort | uniq -c     # the kind breakdown
    cut -f4 scripts/name-linker/snapshot/key-totals.tsv | sort | uniq -c     # the path breakdown
    awk -F'\t' '$4!=$5 {n++; v[$1]=1} END {print n, length(v)}' \
      scripts/name-linker/snapshot/bible-links.tsv                           # reader/panel divergence
    cut -f2 scripts/name-linker/snapshot/translation-divergence.tsv | sort | uniq -c
    cut -f1 scripts/name-linker/snapshot/translation-divergence.tsv | sort -u | wc -l

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
suppression in `verseAnnotations.ts` is invisible there. **858 links across 759 verses resolve
differently between the two paths**, and all but a handful of the 6,210 prose links run with no
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

    node scripts/name-linker/translations.mjs --ref "Acts 1:13"   one verse in all THREE
    node scripts/name-linker/translations.mjs --diverge           where they disagree, grouped
    node scripts/name-linker/corpus/build.mjs --verify        re-prove the WEB corpus
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
    node scripts/name-linker/self-name.mjs                   every record whose OWN name links
                                                              to a different record

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

- **The KJV and ASV corpora against what the reader is served.** They are snapshotted now (see
  **All three translations**), but the corpus is bolls' and the reader's panel fetches
  `bible-api.com`, and the diff between the two is **partial** — 31% of KJV chapters and 27% of ASV
  chapters as of 2026-09-10, agreeing on 96.0% and 96.9% of the verses it reached. It has already found that bolls' KJV hyphenates compound proper nouns
  differently from bible-api.com (`Obededom` against `Obed-edom`), which makes **29 divergence rows
  artefacts of the corpus rather than anything a reader sees**. `corpus/PROVENANCE.md` has the
  numbers and the list. Until the diff is complete, check any KJV finding that turns on a hyphen
  with `translations.mjs --ref` before acting on it.
- **`VERSE_NAME_OVERRIDES` is still translation-blind.** Keyed by book/chapter/verse, it fires
  identically whatever the reader has selected — including where the wording differs enough to make
  the override meaningless. A **named case can assert one verse in one translation**, by carrying `text` alongside `ref`
  (above). **Twenty-one** of them exist, recounted off the file on 2026-09-10 with
  `CASES.filter(c => c.text && c.ref).length`: two on Acts 4:36, where only the ASV prints
  "Joseph"; two on Acts 1:23, where all three translations do; six on Acts 15:22, 15:27 and
  15:32, Judas called Barsabbas, likewise unanimous; three added with the `Judaea` alternate
  (KJV and ASV Acts 1:8, KJV Matthew 2:1), which are the first of these to assert a LOCATION and
  the only cover the 85 KJV/ASV "Judaea" links have; and two added with the second-bearer batch on
  Matthew 10:4, the apostle list's second Simon, where WEB and KJV read "Simon the Canaanite" and
  the ASV reads "Simon the **Cananaean**". That verse is the argument for keying on the verse in
  one line: registering either wording would have fixed one or two translations of three and left
  the rest wrong, with nothing in this directory able to say so. The same batch added six more,
  and those six are a different thing again: **three faults that exist in only one translation.**
  The ASV's Luke 3:30 reads "the [son] of Judas" where the WEB reads "Judah" — a link to Iscariot
  from Jesus's genealogy, in one translation. The KJV's Acts 7:45 and Hebrews 4:8 read "Jesus"
  where the WEB and ASV read "Joshua", so a KJV reader was shown Jesus of Nazareth leading the
  conquest. When that batch wrote this, all three moved no snapshot row at all and a named case was
  the only thing that could hold them; `translation-divergence.tsv`, added hours later, now carries
  a row for each, which is the same argument arriving from the other end. Acts 4:36 from the other side: there an
  override fired for one translation and matched nothing in the corpus, here a FAULT lives in one
  translation and matches nothing in it. Reading a batch's verses in all three is the only way any
  of the three could have been found, and it is worth doing for every batch that touches
  `VERSE_NAME_OVERRIDES`. (This line read "six … three and three" until
  the recount. It was wrong: the third case in each of those groups is the WEB *corpus* case, which
  carries `ref` and no `text` and is therefore an ordinary verse case. Two per verse, one per
  non-WEB translation, is the shape.) These cases used to be the only cover the other two
  translations had anywhere; they are now a way to pin one verse precisely, not the whole net.
- **Whether the tree compiles.** See the warning at the top. Run `npm run build`.
- **The running app.** These scripts call the real module with the real arguments the real components
  pass, which is strong evidence but is not the same as looking at the screen. The app is behind a
  Supabase auth gate. Anyone with a login should still eyeball Revelation 13:17, 2 Kings 17:1,
  Acts 1:13 and John the Apostle's biography page after a change lands.
- **Any prose surface not listed in `loadProseBlocks()`.** That list is hand-maintained; see above.
- **The public-page-only surface is covered now** (`snapshot/seo-only-links.tsv`, 2026-09-10), so it
  is no longer on this list. See **The public pages** below for what it is and what turning it on
  found. What is still NOT covered there: `location.archaeology.note` and `poi.archaeology.note`
  run through `LinkedVerseText` in the app and are printed with `esc()` — deliberately unlinked — on
  the public pages, so the public rendering of those two fields is intentionally poorer than the
  app's and nothing asserts that it stays that way.
- **Text the panels render WITHOUT `LinkedVerseText`** — a timeline event's `summary`, for instance,
  is plain text, so a name in it is reader-facing but never a link and never appears here.
- **Non-person links at row level.** Location, POI, topic, timeline and verse-reference annotations
  are counted in `key-totals.tsv` but are not snapshotted row by row; the ambiguity lives in the
  person names.
