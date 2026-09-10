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
// ── The discriminator ─────────────────────────────────────────────────────────────────────────
// The naive test — "is the adjacent word capitalised?" — flags 831 links, most of them "Roman
// Senate" and "Corinth's Jewish community". Useless. What actually separates a surname from a
// biblical continuation is VOCABULARY: "Garstang", "Naveh", "Neusner", "Lemche", "Montefiore" and
// "Kenyon" appear nowhere in the 31,098 verses of the WEB and are no part of any registered entity
// name, while "Christ", "Antipas", "Iscariot", "Alphaeus" and "Magdalene" all do. That one test
// takes the candidate set from 831 to a couple of dozen and keeps every known fault. Its cost is
// stated under LIMITS below; it is a filter for review, not a verdict.
//
// ── Which corpus ──────────────────────────────────────────────────────────────────────────────
// Both linked surfaces, because they are not the same surface. `corpus.mjs` enumerates what the
// app's panels render through LinkedVerseText. `scripts/seo/render.mjs` linkifies FIVE fields the
// app renders as plain text — person.summary, person.occupation, topic.summary, event.summary and
// location.rulers[].name — so those are links on ~890 public pages and links nowhere in the app,
// and until this file they were measured by nothing at all. `seoOnlyBlocks()` below adds them.
// If a field moves in or out of `render.mjs`'s linkify calls, change that function to match.
//
// ── What it was measured against ──────────────────────────────────────────────────────────────
// Fed the six faults found by eye in production plus six controls, with the link live:
//
//   John George Taylor  → John the Baptist    CAUGHT (surname-after:George)
//   Joseph Naveh        → Joseph son of Jacob CAUGHT (surname-after:Naveh)
//   Jacob Neusner       → the patriarch Jacob CAUGHT (surname-after:Neusner)
//   Niels Peter Lemche  → Simon Peter         CAUGHT (surname-after:Lemche, forename-before:Niels)
//   John Garstang       → John the Baptist    CAUGHT (surname-after:Garstang)
//   Bethel, Connecticut → Bethel the POI      CAUGHT (modern-place-after)
//   Simon Sebag Montefiore                    CAUGHT (surname-after:Sebag)
//   Kathleen Kenyon / W. F. Albright / Zion Baptist Church / Israel Finkelstein
//                                             no link fires at all — nothing to catch
//
// ── LIMITS — what this will not catch ─────────────────────────────────────────────────────────
// * A modern surname that IS biblical vocabulary. "Kenneth Kitchen", "David Rohl", "Nelson Glueck"
//   — those surnames appear capitalised in the WEB, so the discriminator clears them and no signal
//   fires. ("John Bright's" happens to be caught, but only because the possessive makes the token
//   "Bright's", which is not WEB vocabulary; drop the apostrophe and it is missed. Do not read that
//   as coverage.) This is the deliberate cost of a filter with usable precision, and it is why
//   `reviewed.tsv` records human verdicts rather than the script issuing them.
// * A modern figure named by a bare biblical name with no adjacent surname at all — a second
//   mention, "as Kenyon and Garstang both argued, Garstang had…" is fine, but "Wesley wrote" on a
//   page that never gives a surname is invisible here.
// * Anything outside the two linked surfaces above.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLinker, stripMarkup } from "./loadLinker.mjs";
import { loadBible, loadProseBlocks } from "./corpus.mjs";

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
  (l.rulers ?? []).forEach((r) => addName(r.name));
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

// ── Corpus ────────────────────────────────────────────────────────────────────────────────────
/** The five fields `scripts/seo/render.mjs` puts through `linkify` that the app renders as plain
 * text, and which `corpus.mjs` therefore does not enumerate. These are live links on the public
 * pages. Keep in step with the `ctx.linkify(...)` call sites in render.mjs. */
function seoOnlyBlocks() {
  const blocks = [];
  const add = (src, owner, text) => {
    if (typeof text === "string" && text.trim()) blocks.push({ src, owner, text });
  };
  people.forEach((p) => {
    add("seo:person.summary", p.id, p.summary);
    add("seo:person.occupation", p.id, p.occupation);
  });
  topics.forEach((t) => add("seo:topic.summary", t.id, t.summary));
  timelineEvents.forEach((e) => add("seo:timelineEvent.summary", e.id, e.summary));
  locations.forEach((l) => (l.rulers ?? []).forEach((r) => add("seo:location.ruler.name", l.id, r.name)));
  return blocks;
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

  if (sigs.length && MODERN_YEAR.test(text)) sigs.push("modern-year-in-block");
  return { sigs, before, after };
}

// ── Sweep ─────────────────────────────────────────────────────────────────────────────────────
const blocks = [...(await loadProseBlocks()), ...seoOnlyBlocks()];
const hits = [];
for (const b of blocks) {
  for (const a of computeLinkAnnotations(b.text, b.owner)) {
    // Person-links only. The ethnonym topic-links that dominate an unfiltered run — "Roman Senate",
    // "Corinth's Jewish community", "Samaritan Pentateuch" — are correct links to a topic article,
    // not a misread name, and including them costs 122 false positives for no fault found.
    if (!a.id || a.kind !== "person") continue;
    const { sigs, before, after } = signalsFor(b.text, a);
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
