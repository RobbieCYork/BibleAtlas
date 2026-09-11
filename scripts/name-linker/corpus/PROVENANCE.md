# Where the three Bible corpora came from

The harness measures over **every translation `BiblePanel` offers a reader**: the World English
Bible (the default), the King James Version and the American Standard Version. Until 2026-09-10
only the first was here, and the note at the bottom of this file said so.

| file | verses | source |
|---|---:|---|
| `web-bible.json.gz` | 31,098 | `bolls.life/get-text/WEB/<book>/<chapter>/`, fetched 2026-09-04 in 1,189 requests, 0 failures |
| `kjv-bible.json.gz` | 31,207 | `bolls.life/static/translations/KJV.json`, fetched 2026-09-10 by `build.mjs` |
| `asv-bible.json.gz` | 31,085 | `bolls.life/static/translations/ASV.json`, same, with 23 verses repaired — see below |

`bolls.life` is the service `BiblePanel` already calls for Bible search. **Licence:** all three are
public domain — the WEB by its editor's release (Michael Paul Johnson / eBible.org), the KJV and
the ASV by age. That is the one class of text this commercial repo may host outright; see the
sourcing rules in `CLAUDE.md`.

**Shape:** `[{ book, chapter, verse, text }]`, book names spelled exactly as `src/data/bibleBooks.ts`
spells them, so `BOOK_NAME_OVERRIDES` / `BOOK_NAME_ALLOWLIST` keys match. **Not shipped to users:**
these live under `scripts/`, are never imported from `src/`, and do not enter the Vite bundle.

    node scripts/name-linker/corpus/build.mjs            rebuild KJV and ASV
    node scripts/name-linker/corpus/build.mjs --verify   check WEB only, write nothing

## The WEB file is the control, and it holds

`build.mjs` refuses to write anything until it has re-fetched the WEB from the **bulk** endpoint and
diffed it against the committed `web-bible.json.gz`, which came from a **different** endpoint two
weeks ago. Measured 2026-09-10: **31,098 of 31,098 verses identical**, 0 missing, 0 differing. The
only extras are Psalm 151's seven verses, deuterocanonical and outside this app's 150-chapter
Psalms.

That is the whole warrant for trusting the other two files, and it is a check rather than a claim
because "it is the same service" is an assumption until somebody runs the diff. If it ever stops
holding, the build stops.

## What bolls does to the text, and what this strips

**Strong's numbers.** `<S>1234</S>`, interleaved with the words. The whole element goes, whatever is
inside it — and matching `<S>\d+</S>` is not enough. bolls' ASV, alone of the three (the KJV's
351,812 tags are all well formed), carries **834 tags holding two numbers** (`<S>2316, 2532</S>`)
and **279 holding outright garbage** (`<S>3739, Leviticus2</S>`). Under the narrow pattern those
survived as words, and **1,008 ASV verses** reached the linker reading "to God 2316, 2532 the
Father" and "the other disciple outran 4390, Deuteronomy32 Peter".

**`<sup>` is not the same thing in the two translations**, and this is the one judgement call in
`build.mjs`. In the ASV it holds the **Psalm superscriptions** ("A Psalm of David, when he fled from
Absalom his son") — printed text, 116 of them, which bible-api.com serves; its words are kept. In
the KJV it holds the **1611 translators' marginal notes** ("firmament: Heb. expansion") — 7,716 of
them, which bible-api.com does not serve and no reader of this app will ever see; they are dropped
with their contents. Keeping them would have invented thousands of links in text nobody renders.

**Spacing.** A removed tag leaves its space behind, and bolls puts the tag after the word and before
the punctuation, so a plain strip yields "flesh :" in 500-odd KJV verses. Repaired in the KJV and
ASV. **Deliberately NOT repaired in the WEB file**, which carries the same artefact: fixing it would
move the offset in all 9,724 rows of `bible-links.tsv` for a cosmetic reason, and that is its own
change with its own diff to read.

## 23 ASV verses had a name replaced by a number, and are repaired from bible-api.com

Not markup — the word is gone from bolls' source. Deuteronomy 1:38 reads "60 the son of Nun",
Joshua 4:17 "60 therefore commanded the priests", 1 Chronicles 5:12 "360 the chief", James 1:1
"660, a servant of God". Twenty-three verses, and every one destroys exactly the thing this harness
measures — a name. The names lost were Joshua (×4), Daniel (×3), Mark (×3), Joel (×2), Esther (×2),
Micah (×2), Judges, Zechariah, Jeremiah, Job, Luke and James.

`build.mjs` **detects** them by pattern rather than holding a list (so the count cannot go stale),
refetches each from bible-api.com, prints every substitution, and fails the build if one cannot be
fetched. Nothing is hand-patched.

## The harness corpus against what the reader actually renders

This file used to say, correctly, that the app fetches from **bible-api.com** while this corpus
comes from bolls, and that **the two had never been diffed**. They have now.

Method: fetch whole chapters from `bible-api.com/<book> <chapter>?translation=<id>` — the exact call
`src/lib/biblePassage.ts` makes — and compare verse by verse after normalising whitespace, quote
glyphs, bible-api's backtick-for-apostrophe and its `[square brackets]` around supplied words.
(None of those reach the linker as a name.) Serial at about three a second; the service rate-limits
hard on concurrency — four parallel workers got a 429 on nearly every request.

Measured 2026-09-10, over the chapters fetched by that point:

| | chapters of 1,189 | verses compared | identical | differing |
|---|---:|---:|---:|---:|
| WEB | 191 (16%) | 5,698 | 5,588 (98.1%) | 110 |
| KJV | 371 (31%) | 11,150 | 10,707 (96.0%) | 443 |
| ASV | 326 (27%) | 10,209 | 9,897 (96.9%) | 312 |

**This is a partial diff, not a complete one** — 16%, 31% and 27% of each translation's chapters,
weighted deliberately towards the chapters that carry a divergence row, which are the ones the new
snapshot makes claims about. The full sweep is 3,567 chapter requests and the rate limit makes it a multi-hour job; it
was started and did not finish inside that pass. **Do not quote these as whole-Bible figures.**

Two kinds of difference in the residue, and the second one is load-bearing:

1. **Different editions.** bolls' WEB is not byte-identical to bible-api.com's WEB: Genesis 3:4
   reads "You won't surely die" here and "You won't really die" there; Genesis 12:3 "curses you"
   against "treates you with contempt". Both are the World English Bible; they are different
   revisions of it. Nothing here depended on them being the same, and now nobody has to assume it.

2. **bolls' KJV hyphenates compound proper nouns differently.** bolls writes `Obededom`,
   `Kadeshbarnea`, `Bethshean`, `Gathrimmon`, `Tubalcain`, `Cherubims`; bible-api.com's KJV writes
   `Obed-edom`, `Kadesh-barnea`, `Beth-shean`, `Gath-rimmon`, `Tubal-cain`, `Cherubim`. **29 of the
   divergence rows this corpus produces are therefore artefacts of the corpus rather than anything
   a reader sees.** The ASV's hyphenation, by contrast, was checked against bible-api.com and
   **agrees**: `Beth-el`, `Beer-sheba` and `Beth-lehem` are what an ASV reader really gets.

   Until the full diff is done, **any KJV finding that turns on a hyphen must be checked against
   bible-api.com before it is acted on** — `translations.mjs --ref` prints all three side by side.
   Re-sourcing the KJV and ASV from bible-api.com outright would settle it and is the obvious
   follow-up; it was not done here because bolls is what this harness was told to use, and because
   a source swap deserves its own diff.

## What is still not covered

- **The full bible-api.com diff**, as above.
- **The panel path for KJV and ASV.** `LinkedVerseText` never renders a Bible verse; the panel
  column over Scripture exists to measure the gap between the two code paths, and that measurement
  is already made in full on the WEB. `key-totals.tsv` carries `reader:kjv` and `reader:asv` and no
  panel equivalents.
- **`VERSE_NAME_OVERRIDES` is still translation-blind** — keyed by book/chapter/verse, it fires
  identically whatever the reader has selected, including where the wording differs enough to make
  the override meaningless. That is now *visible* (a verse whose override misses in one translation
  shows up in `translation-divergence.tsv`) rather than merely true.
