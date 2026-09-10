# archaeology-validate

Checks every `category: "discovery"` and `category: "manuscript"` record in `src/data/topics.ts`
against the mandatory-field rules of **§3.2** (discoveries) and **§4.1** (manuscripts) of
`automation/manager/archaeology-scope.md`.

```
npm run validate:archaeology
```

It also runs inside `vite build` — see `vite-plugin-archaeology-validate.ts` — so it cannot be
forgotten and a batch cannot reach production without passing it.

## Why it exists

Archaeology batch 3 shipped **five of fourteen articles with no institutional citation**, which
§3.2 makes mandatory, and found out only by scripting a count *after* the deploy. §3.2's rules were
being remembered rather than checked. That is a failure mode this project has documented before in
other forms, and the answer is always the same one: make the check a script.

## What it checks

**Both categories**

- exactly **3** `sections`, each with a heading and at least one paragraph (§3.2, §3.3 — the third
  section is the dispute and is the point of the whole section)
- at least **2** `verses`, each with a reference (§3.2 — "this is a Bible study app")
- at least **3** citations, **not counting `encyclopedic`** (§5 — Wikipedia is its own tier
  precisely so it can be listed without being allowed to carry the article)
- at least **1 `institution`** citation (§3.2)
- at least **1 `scholarly` or `primary`** citation (§7.5)
- every citation has a label, a valid `CitationTier`, and an `http(s)` url if it has one at all
- `findSiteId` resolves to a real `Location` or `POI`, and `findSiteKind` names the right one
- neither of §3.4's two forbidden lines ("archaeology has proven the Bible true", "scholars now
  admit") appears in the article text
- the record does not carry the facts block of the other category

**`discovery`** — every field of §3.2's mandatory list is present and is not a placeholder:
`objectType`, `findSite`, `foundYear`, `foundBy`, `objectDate`, `objectDateCertainty`,
`currentLocation`. `"Unknown"` and `"credit is contested — see below"` are valid values for
`foundBy`; `"a stone"` is not a valid `objectType`.

**`manuscript`** — §4.1's mandatory list: `manuscriptType`, `language`, `contents`, `findSite`,
`foundYear`, `foundBy`, `dateAssigned`, `dateCertainty`, `currentLocation`. `origin`, `shelfmark`
and `facsimileUrl` are reported as notes when absent, never as errors — §4.1 calls them "optional
but expected wherever they exist".

## Flag signals and `reviewed.tsv`

§7.5 also asks that `unprovenanced` and `authenticityDisputed` be set wherever the third section is
of kind 3 or 4. That one **cannot** be made zero-false-positive, and the first record it was run
against proves it: the Bethlehem bulla's article contains the phrase *"it is not a piece of the
antiquities market"*, which is the phrase and the opposite of the claim.

So flag signals follow the pattern `scripts/name-linker/modern-names.mjs` already uses here:

- a signal **not** in `reviewed.tsv` fails the run
- a signal with a verdict of `ok` does not
- a signal with a verdict of `todo` still fails — it is a bug someone recorded rather than lost

Blessing a signal is a separate, deliberate command, and `--update-reviewed` writes every new row
as `REVIEW-ME`, which still fails, so nothing is blessed by running it:

```
node scripts/archaeology-validate/run.mjs --update-reviewed    # then edit the verdicts by hand
```

Every row in `reviewed.tsv` is a claim that a person opened that article's third section and
decided. Do not add one you have not read. The file carries the reasoning for the rows in it.

## Other invocations

```
node scripts/archaeology-validate/run.mjs --id tel-dan-stele   one record
node scripts/archaeology-validate/run.mjs --signals            just the flag signals
node scripts/archaeology-validate/run.mjs --quiet              errors only (what the build runs)
```

## 🚨 It is not a build check

It loads the data by bundling it with **rolldown**, which strips TypeScript types without checking
them. It goes green on a tree that does not compile — exactly the trap `AGENTS.md` documents for
`npm run test:linker`, from the same direction. Run all three:

```
npm run validate:archaeology   # is the data complete?
npm run test:linker            # did any links move?
npm run build                  # does it compile? exit 0, no exceptions
```
