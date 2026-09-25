#!/usr/bin/env node
// Hunts for links the rest of the net cannot see: a biblical name auto-linked inside what is
// plainly a MODERN name — "John Garstang" to John the Baptist, "Joseph Naveh" to Joseph son of
// Jacob, "Jacob Neusner" to the patriarch.
//
//   node scripts/name-linker/modern-names.mjs              list every candidate
//   node scripts/name-linker/modern-names.mjs --check      exit 1 on an unacknowledged candidate
//   node scripts/name-linker/modern-names.mjs --update     accept the current set as reviewed
//
// ── Why this file exists ──────────────────────────────────────────────────────────────────────
// A WRONG NEW LINK IS ADDITIVE. `run.mjs` diffs a snapshot, and a link that should never have
// existed arrives in that diff as a row that was not there before — indistinguishable from the
// dozens of genuinely good links a new article brings with it. Six of these shipped to production
// in two days and every one was caught by a human reading a rendered page, never by the suite.
// `cases.mjs` cannot help either: nobody writes a case for a sentence they have not yet written.
//
// So this check is shaped the other way round from the snapshot. It does not ask "did anything
// move?" — it asks "does any link in the corpus sit inside a modern personal name?", and it
// requires every YES to be listed in `reviewed.tsv` with a verdict. A new article that introduces
// "excavated by Kathleen Kenyon and John Garstang" fails the check on the commit that adds it,
// because the hit is new and unacknowledged, not because anything moved.
//
// ── The signals, and what they are worth ─────────────────────────────────────────
// Eleven signals, listed separately in the output so precision can be read per signal rather than
// as one blended figure that hides which half is doing the work. They fall into three groups.
//
// 1. VOCABULARY — the neighbouring capitalised word is a surname. The naive form of this ("is the
//    next word capitalised?") flags 831 links, most of them "Roman Senate" and "Corinth's Jewish
//    community", and is useless. What rescues it is that "Garstang", "Naveh", "Neusner", "Lemche"
//    and "Montefiore" appear nowhere in the 31,098 verses of the WEB and are no part of any ANCIENT
//    record's name, while "Christ", "Antipas", "Iscariot" and "Magdalene" all do. That single test
//    takes 831 to 22. `surname-after`, `forename-before`, `initial-*`.
// 2. SHAPE — the words around the link say it is not a bare ancient name at all: a regnal numeral
//    ("Elizabeth I"), a royal style ("Mary, Queen of Scots"), a saint attached to a building ("the
//    Convent of St. Joseph"), an institution, a US state, a modern honorific, or a link covering
//    only PART of a longer capitalised phrase ("High Priest Joshua", "Tiberius Claudius Caesar
//    Augustus Germanicus"). These reach what no vocabulary test can — "Protestant Elizabeth I" has
//    the neighbours "Protestant" and "I".
// 3. POSITION — a BIBLICAL person linked from an article whose subject is not ancient (a
//    `kind: "church"` person, or a timeline event dated 1400+), and a lowercase surface. Neither
//    reads the neighbouring words at all. `biblical-in-modern-article` is what catches "nineteen
//    children of Samuel and Susanna Wesley", whose neighbours are "of" and "and".
//
// ── Measured, not asserted ────────────────────────────────────────────────────────
// Run against 05269f8, the tree this was written on, BEFORE any of its fixes:
//
//   92 candidates. 14 of them were genuinely wrong links — a precision of about 15%.
//
// Say 15% out loud rather than hiding it: five sixths of what this prints is a correct link that
// happens to look like a modern name, and that is the price of catching the sixth. The 78 correct
// ones are read once and recorded in `reviewed.tsv`; the recurring cost is only what a new article
// adds. A check that flagged nothing would be worth nothing, and one that flagged everything would
// be worth less than nothing, because nobody would read it.
//
// Recall is the number that matters more, and it has two forms. Of the 21 wrong links this sweep
// removed, 14 were flagged directly. The other 7 were found by taking a flagged one and sweeping
// its whole CLASS — one "the job" led to five, one "High Priest Joshua" led to six. Every one of
// the 8 distinct fault classes had at least one representative flagged, which is the property that
// actually matters: a reviewer who reads a hit and then runs `census.mjs` on its key finds the rest.
//
// Fed the six faults found by eye in production, plus controls, with the link live: 6 of 6 flagged.
//
//   John George Taylor  → John the Baptist    surname-after:George
//   Joseph Naveh        → Joseph son of Jacob surname-after:Naveh
//   Jacob Neusner       → the patriarch Jacob surname-after:Neusner
//   Niels Peter Lemche  → Simon Peter         surname-after:Lemche, forename-before:Niels
//   John Garstang       → John the Baptist    surname-after:Garstang
//   Bethel, Connecticut → Bethel the POI      modern-place-after
//   Simon Sebag Montefiore                    surname-after:Sebag
//   Kathleen Kenyon / W. F. Albright / Zion Baptist Church / Israel Finkelstein
//                                             no link fires at all — nothing to catch
//
// ── LIMITS — what this will not catch ────────────────────────────────────────────────
// * A modern surname that IS biblical vocabulary, in an ancient-subject article. "Kenneth Kitchen",
//   "David Rohl", "Nelson Glueck" — those surnames appear capitalised in the WEB, so the
//   vocabulary group clears them, and if the article is not modern-era the position group does not
//   fire either. ("John Bright's" happens to be caught, but only because the possessive makes the
//   token "Bright's", which is not WEB vocabulary; drop the apostrophe and it is missed. Do not
//   read that as coverage.) This is why `reviewed.tsv` records human verdicts rather than the
//   script issuing them.
// * A modern figure named by a bare biblical name with no adjacent surname — "Wesley wrote", on a
//   page that never gives the surname.
// * Anything outside the two linked surfaces above. In particular this measures LINKS, so a name
//   the linker never matched is not its business.
// * A wrong link to another ANCIENT figure, which is a different and larger bug class. Two of the
//   fixes this file's first sweep produced were of that kind (Hoshea, and the high priest Joshua)
//   and both were incidental — they happened to trip a shape signal.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLinker, stripMarkup } from "./loadLinker.mjs";
import { loadBible, loadProseBlocks, loadSeoOnlyBlocks } from "./corpus.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REVIEWED = path.join(HERE, "reviewed.tsv");

const argv = process.argv.slice(2);
const check = argv.includes("--check");
// `--update` is refused alongside `--check`, and that refusal is the whole safety of wiring this
// into `test:linker`. The npm script is `run.mjs … && modern-names.mjs --check`, so
// `npm run test:linker -- --update` — the normal way to accept a deliberate snapshot move — would
// otherwise append `--update` here too and bless every unreviewed candidate as `ok` in the same
// breath. Blessing a link has to be its own command, typed on purpose.
const update = argv.includes("--update") && !check;
if (argv.includes("--update") && check) {
  console.error("modern-names: --update and --check together is refused. Accepting a candidate is a");
  console.error("separate, deliberate act: run `node scripts/name-linker/modern-names.mjs --update`.");
  process.exit(2);
}
const RED = "\x1b[31m", GREEN = "\x1b[32m", YELLOW = "\x1b[33m", DIM = "\x1b[2m", OFF = "\x1b[0m";

const { computeLinkAnnotations, people, locations, pois, topics, timelineEvents } = await loadLinker();

// ── Vocabulary ────────────────────────────────────────────────────────────────────────────────
/** Every word that appears capitalised anywhere in the WEB: every biblical name, patronymic,
 * gentilic and place, plus every word that has ever opened a verse. */
const bibleCaps = new Set();
for (const v of loadBible()) {
  for (const m of stripMarkup(v.text).matchAll(/\b[A-Z][\p{L}’'-]*/gu)) bibleCaps.add(m[0].toLowerCase());
}

/** Every token of every registered ANCIENT entity name, so a name the app knows but the WEB spells
 * differently ("Nebuchadnezzar II", "Sennacherib") is not read as a surname.
 *
 * `kind: "church"` people are deliberately EXCLUDED, and the exclusion is load-bearing. Those are
 * the post-apostolic figures — Whitefield, Wesley, Spurgeon, Graham, Knox — and their records
 * contribute exactly the modern forenames and surnames that mark a modern name. Leaving them in
 * masked a confirmed live fault: "John George Taylor" did not flag, because George Whitefield put
 * "george" in this set, so the surname test looked at "George" and saw a name the app knows.
 * Dropping the 40-odd church records restores it at a cost of 22 further candidates to read. */
const registered = new Set();
const addName = (n) => {
  for (const t of String(n ?? "").split(/[^\p{L}’'-]+/u)) if (t) registered.add(t.toLowerCase());
};
for (const p of people) {
  if (p.kind === "church") continue;
  addName(p.name);
  (p.matchNames ?? []).forEach(addName);
}
for (const l of locations) {
  addName(l.name);
  (l.alternateNames ?? []).forEach(addName);
  // `l.history.rulers`, not `l.rulers`. This line read the latter — a field no location record
  // has ever carried — so no ruler's name was ever registered here, and every ruler surname the
  // dataset knows looked "foreign" to `isForeignToken` below. Same bug as the `h.facts` one in
  // corpus.mjs, and the same fix.
  (l.history?.rulers ?? []).forEach((r) => addName(r.name));
}
for (const p of pois) { addName(p.name); (p.alternateNames ?? []).forEach(addName); }
for (const t of topics) { addName(t.name); addName(t.title); }
for (const e of timelineEvents) addName(e.title);

/** Capitalised words that are editorial or ordinary English rather than any kind of name. Most are
 * already in `bibleCaps` — every sentence-opening word in the Bible is — so this list only has to
 * cover the modern vocabulary the WEB has no occasion to use. */
const EDITORIAL = new Set(`archaeologically archaeologists archaeology catholic christian christians classical
commentators comparing conservative contemporary conversely critical crusader crusaders currently despite
elsewhere english evidence excavation excavations further generally hebrew historians historically however
instead jewish latin likewise medieval modern moreover muslim nonetheless notably orthodox otherwise papal
possibly presumably probably protestant published recent recently reformed regardless relatively roughly
scholars scholarship significantly similarly subsequently supposedly surviving traditional traditionally
unlike unusually western
january february march april may june july august september october november december
monday tuesday wednesday thursday friday saturday sunday`.split(/\s+/));

/** Is this capitalised token unknown to Scripture and to the dataset — i.e. surname-shaped? */
function isForeignToken(w) {
  if (!w) return false;
  const lw = w.toLowerCase();
  return !bibleCaps.has(lw) && !registered.has(lw) && !EDITORIAL.has(lw);
}

// ── Signals ───────────────────────────────────────────────────────────────────────────────────
// Each is reported separately so precision can be stated per signal rather than as one blended
// figure that hides which half is doing the work.

const INSTITUTION =
  /^\s+(?:(?:Baptist|Methodist|Presbyterian|Lutheran|Evangelical|Episcopal|Anglican|Pentecostal|Reformed|Community|Memorial|Theological|Bible|Christian)\s+)?(?:Church|Chapel|Cathedral|College|University|Seminary|Institute|Society|Association|Foundation|Academy|School|Museum|Press|Trust|Hospital|Fund|Mission|Ministries|Crusade|Center|Centre|Library|Prize|Award|Fellowship|Evangelistic)\b/;

/** US states and Canadian provinces: after a comma, they mark a modern settlement rather than the
 * biblical place of the same name ("Bethel, Connecticut"). */
const MODERN_PLACE =
  /^,\s+(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|Ontario|Quebec|Alberta|Manitoba|Nova Scotia)\b/;

const MODERN_TITLE =
  /\b(?:Professor|Prof\.|Dr\.|Sir|Dame|Rev\.|Reverend|Archbishop|Cardinal|Pope|Fr\.|Mr\.|Mrs\.|Ms\.)\s+$/;

/** A regnal numeral. "Protestant Elizabeth I came to the English throne" pointed at Elizabeth the
 * mother of John the Baptist, and no vocabulary test could have seen it: the neighbours are
 * "Protestant" and "I". Scripture numbers no one this way, so this is close to free. */
const REGNAL_NUMERAL = /^\s+(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI)(?![\p{L}\d])/u;

/** A royal style following the name: "the Catholic Mary, Queen of Scots" — Mary the mother of
 * Jesus, before this. No biblical figure is styled this way in our prose. */
const ROYAL_STYLE = /^,?\s+(?:Queen|King|Duke|Duchess|Earl|Prince|Princess|Emperor|Empress|Tsar)\s+of\b/;

/** "St."/"Saint" before, a building or institution after: "the Convent of St. Joseph in Ávila",
 * which pointed at Joseph son of Jacob rather than Joseph of Nazareth. Most hits are correct — the
 * eight "St. Peter's Basilica"/"Square" mentions are all the right Peter — so this signal earns its
 * place through the ledger, not through precision. */
const SAINT_BEFORE = /\b(?:St\.|Saint|San|Santa|São)\s+$/;
const BUILDING_AFTER =
  /^(?:['’]s)?\s+(?:Basilica|Cathedral|Church|Chapel|Convent|Monastery|Abbey|College|Hospital|Square|Gate|Bay|Island|Seminary|School|University|Priory|Shrine)\b/;

/** A year 1500 or later anywhere in the block. Never fires alone — plenty of our articles discuss a
 * biblical figure alongside a modern excavation — but it is corroboration a reviewer wants, so it
 * rides along on a hit another signal already made. Excluded from the ledger key for that reason:
 * editing a date elsewhere in a paragraph must not re-key a reviewed hit. */
const MODERN_YEAR = /\b(?:1[5-9]\d\d|20\d\d)\b/;

function signalsFor(text, a) {
  const before = text.slice(Math.max(0, a.start - 80), a.start);
  const after = text.slice(a.end, a.end + 80);
  const sigs = [];

  const mAfter = /^[  ]([A-Z][\p{Ll}’'\-]+)/u.exec(after);
  if (mAfter && isForeignToken(mAfter[1])) sigs.push(`surname-after:${mAfter[1]}`);

  const mBefore = /([A-Z][\p{Ll}’'\-]+)[  ]$/u.exec(before);
  if (mBefore && isForeignToken(mBefore[1])) sigs.push(`forename-before:${mBefore[1]}`);

  if (/^\s+[A-Z]\.(?:\s|$)/.test(after)) sigs.push("initial-after");
  if (/(?:^|[^\p{L}])[A-Z]\.\s+$/u.test(before)) sigs.push("initial-before");
  if (INSTITUTION.test(after)) sigs.push("institution-after");
  if (MODERN_PLACE.test(after)) sigs.push("modern-place-after");
  if (MODERN_TITLE.test(before)) sigs.push("modern-title-before");
  if (REGNAL_NUMERAL.test(after)) sigs.push("regnal-numeral");
  if (ROYAL_STYLE.test(after)) sigs.push("royal-style-after");
  if (SAINT_BEFORE.test(before) && BUILDING_AFTER.test(after)) sigs.push("saint-of-a-building");

  if (sigs.length && MODERN_YEAR.test(text)) sigs.push("modern-year-in-block");
  return { sigs, before, after };
}

/** Records whose subject is not ancient: a `kind: "church"` person, or a timeline event dated 1400
 * or later. A link to a BIBLICAL person inside one of those articles is not automatically wrong —
 * Luther really did study Paul's letters — but it is the population every confirmed fault came
 * from, and it is small enough to read in full. This is the signal that catches what no vocabulary
 * test can: "nineteen children of Samuel and Susanna Wesley", whose neighbours are "of" and "and".
 *
 * It fires ONLY when the link's target is biblical, so Luther linking to Wycliffe is not a hit. */
const modernEraOwners = new Map();
for (const p of people) {
  if (p.kind === "church" && (p.bornYear ?? 0) >= 1400) modernEraOwners.set(p.id, `b.${p.bornYear}`);
}
for (const e of timelineEvents) {
  const y = e.year ?? e.startYear;
  if (typeof y === "number" && y >= 1400) modernEraOwners.set(e.id, String(y));
}
const personKind = new Map(people.map((p) => [p.id, p.kind ?? "biblical"]));

/** Does this link cover only PART of a run of three or more capitalised words? A link that covers
 * the whole run is fine ("Martin Luther King"); one that covers a slice of it means the phrase
 * names something the link does not. */
const CAP_RUN = /\b(?:[A-Z][\p{Ll}’'\-]+[  ]){2,}[A-Z][\p{Ll}’'\-]+\b/gu;
function insideLongerNameRun(text, a) {
  CAP_RUN.lastIndex = 0;
  for (let m; (m = CAP_RUN.exec(text)) !== null; ) {
    const s = m.index, e = s + m[0].length;
    if (a.start >= s && a.end <= e && !(a.start === s && a.end === e)) return true;
  }
  return false;
}

// ── Sweep ─────────────────────────────────────────────────────────────────────────────────────
// The public-page-only surface is enumerated ONCE, in corpus.mjs, and imported here. It used to be
// a second copy of that list living in this file, and the copy had drifted: it read `l.rulers`
// where render.mjs reads `loc.history.rulers`, so the ruler branch enumerated NOTHING at all and
// this sweep ran over 985 blocks believing it covered the whole surface. It is 1,071.
// `snapshot/seo-only-links.tsv` is built from the same function, so the sweep and the snapshot
// cannot disagree about what the surface is.
const blocks = [...(await loadProseBlocks()), ...(await loadSeoOnlyBlocks())];
const hits = [];
for (const b of blocks) {
  for (const a of computeLinkAnnotations(b.text, b.owner)) {
    // Person-links only. The ethnonym topic-links that dominate an unfiltered run — "Roman Senate",
    // "Corinth's Jewish community", "Samaritan Pentateuch" — are correct links to a topic article,
    // not a misread name, and including them costs 122 false positives for no fault found.
    if (!a.id || a.kind !== "person") continue;
    const { sigs, before, after } = signalsFor(b.text, a);

    // A biblical person linked from a post-1400 article. Independent of every text signal above.
    if (modernEraOwners.has(b.owner) && personKind.get(a.id) === "biblical") {
      sigs.push("biblical-in-modern-article");
    }
    // A lowercase surface is the common word, not the name — "returned to finish the job", "on the
    // eve of his final battle". Some are genuine (the app registers "magi" and "satan" lowercase),
    // so this is reviewed, not assumed. CAPITALISED_ONLY in verseAnnotations.ts is the fix when one
    // of these turns out to be the common word.
    if (/^[\p{Ll}]/u.test(a.text) && !/^(?:the|a|an)\s/i.test(a.text)) sigs.push("lowercase-surface");
    // The link covers PART of a longer run of capitalised words, so the phrase names something the
    // link does not: "Tiberius Claudius Caesar Augustus Germanicus" (Claudius's regnal name, with
    // the link on "Augustus" pointing at Octavian) and "After King Hoshea's" (the king of Israel,
    // with the link on "Hoshea" pointing at Joshua son of Nun). Neither has a modern neighbour or a
    // modern date, so nothing else here reaches them.
    if (insideLongerNameRun(b.text, a)) sigs.push("inside-capitalised-run");

    if (!sigs.length) continue;
    hits.push({
      key: [b.src, b.owner, a.id, a.text, sigs.filter((s) => !s.startsWith("modern-year")).join(",")].join("\t"),
      src: b.src, owner: b.owner, id: a.id, surface: a.text, sigs,
      quote: `…${before.slice(-46)}«${a.text}»${after.slice(0, 46)}…`.replace(/\s+/g, " "),
    });
  }
}
hits.sort((x, y) => x.key.localeCompare(y.key));

// ── Ledger ────────────────────────────────────────────────────────────────────────────────────
// reviewed.tsv is the acknowledgement: verdict <TAB> key. A hit not in it is unreviewed and fails
// --check. `ok` means a human read it and the link is right. Rows are keyed by (field, owning
// record, linked id, surface, signals) and NOT by the surrounding sentence, so rewriting the
// paragraph around a reviewed link does not silently drop its acknowledgement the way a
// text-hashed snapshot row does.
const reviewed = new Map();
if (fs.existsSync(REVIEWED)) {
  for (const line of fs.readFileSync(REVIEWED, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const i = line.indexOf("\t");
    reviewed.set(line.slice(i + 1), line.slice(0, i));
  }
}

const unreviewed = hits.filter((h) => !reviewed.has(h.key));

if (update) {
  const header =
    "# Modern-name candidates that have been READ and found correct.\n" +
    "# verdict<TAB>src<TAB>owner<TAB>linked-id<TAB>surface<TAB>signals\n" +
    "# Regenerate with: node scripts/name-linker/modern-names.mjs --update\n" +
    "# A candidate absent from this file fails `--check`. Do not add a row you have not read:\n" +
    "# every row here is a claim that a human looked at that sentence and the link is right.\n";
  const body = hits.map((h) => `${reviewed.get(h.key) ?? "ok"}\t${h.key}`).join("\n");
  fs.writeFileSync(REVIEWED, header + body + "\n");
  console.log(`${GREEN}wrote${OFF} scripts/name-linker/reviewed.tsv — ${hits.length} candidates`);
  process.exit(0);
}

const bySignal = new Map();
for (const h of hits) for (const s of h.sigs) {
  const k = s.split(":")[0];
  bySignal.set(k, (bySignal.get(k) ?? 0) + 1);
}

const seoBlocks = blocks.filter((b) => b.src.startsWith("seo:")).length;
console.log(`${DIM}corpus: ${blocks.length} blocks (${seoBlocks} public-page-only)${OFF}`);
console.log(
  `modern-name candidates: ${hits.length}   unreviewed: ${unreviewed.length ? RED + unreviewed.length + OFF : GREEN + "0" + OFF}`
);
console.log(`${DIM}by signal: ${[...bySignal].map(([k, n]) => `${k}=${n}`).join("  ")}${OFF}`);

for (const h of unreviewed) {
  console.log(`\n${YELLOW}UNREVIEWED${OFF} [${h.id}] "${h.surface}"  ${DIM}${h.sigs.join(" ")}${OFF}`);
  console.log(`  ${h.quote}`);
  console.log(`  ${DIM}${h.src}  owner=${h.owner}${OFF}`);
}

if (check && unreviewed.length) {
  console.log(
    `\n${RED}FAIL${OFF} — ${unreviewed.length} link(s) sit inside what looks like a modern name and nobody has said so.`
  );
  console.log("Read each one in its data file. If the link is wrong, suppress it — OWNER_NAME_OVERRIDES");
  console.log("for a whole record, a NAME_CONTEXT_RULES phrase pin for one wording — and add a guard case");
  console.log("to cases.mjs so a later rewrite cannot undo it. If the link is right, run --update.");
  process.exit(1);
}
if (check) console.log(`${GREEN}ok${OFF} — every modern-name candidate is accounted for.`);
