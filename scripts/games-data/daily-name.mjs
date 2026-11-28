// Builds src/data/dailyName.ts — the answer schedule and the guess list for the Daily Name game.
//
//     node scripts/games-data/daily-name.mjs           write the file
//     node scripts/games-data/daily-name.mjs --check   rebuild in memory, fail if the file differs
//                                                      or any rule below is broken
//
// Every answer is a single-word name that
//   1. belongs to exactly one biblical person or place record in src/data (so the reveal can name
//      who or what it was and open that article without guessing which "John" was meant);
//   2. is spelled the same way in all three translations the reader offers — it occurs, whole-word
//      and case-sensitive, in the WEB, the KJV and the ASV (so "Judea", which the KJV spells
//      "Judaea", is never an answer);
//   3. has a reveal verse taken from that record's OWN verse list in which the name occurs in all
//      three translations (or, where that list has none, the verse REF_OVERRIDES names for it,
//      checked the same way). The verse text shipped is the WEB's, verbatim from the corpus.
//   4. is on the recognition list in daily-name-curation.mjs (KEEP): a person or place an ordinary
//      Bible reader would know. Every eligible record must be decided there, kept or removed.
// Answers are ordered most-familiar first, measured as the number of WEB verses that use the name,
// except that the puzzles already issued (PINNED) lead in their issued order.

import { loadLinker } from "../name-linker/loadLinker.mjs";
import fs from "node:fs";
import path from "node:path";
import { KEEP, PINNED, REF_OVERRIDES, REMOVE, WORD_OVERRIDES } from "./daily-name-curation.mjs";
import { REPO_ROOT, expandReference, hasWord, loadCorpora, verseHasWordInAll, verseText, wordCounts } from "./lib.mjs";

const OUT = path.join(REPO_ROOT, "src/data/dailyName.ts");
const MIN_LEN = 4;
const MAX_LEN = 9;
const check = process.argv.includes("--check");

/** Words that turn up when names are split but are not names. */
const NOT_NAMES = new Set(
  "the of and son daughter wife husband mother father brother sister king queen prophet prophetess priest high river sea mount mountain lake valley garden church tomb house well pool street gate council site chapel basilica grotto cave theatre temple bay port tower arch inscription synagogue fortress palace prison field forum road way traditional ancient great little upper beyond old new east west north south city region province island apostle evangelist tetrarch caesar also called less evil creator sorcerer tempter devil savior saviour messiah adversary accuser lord christ spirit holy father".split(" ")
);

/** Records that are not one person: groups, the Godhead, angels and Satan are not offered as a
 * "who was it" answer here. */
const SKIP_PEOPLE = new Set(["satan", "god-the-father", "holy-spirit", "pharisees", "sadducees", "magi", "ananias-and-sapphira", "ethiopian-eunuch"]);

const lettersOnly = (w) => /^[A-Za-z]+$/.test(w);
const words = (s) => (s ?? "").split(/[^A-Za-z]+/).filter(Boolean);

const m = await loadLinker();
loadCorpora();

const biblicalPeople = m.people.filter((p) => (p.kind ?? "biblical") === "biblical" && !SKIP_PEOPLE.has(p.id));

/** The familiar one-word name a record is known by, or null. "Mount Sinai" -> Sinai, "Jordan
 * River" -> Jordan, "Saul (King of Israel)" -> Saul, "Hoshea, King of Israel" -> Hoshea,
 * "Caesar Augustus" -> Augustus, "Eden (Garden of Eden)" -> Eden. Anything that does not reduce to
 * one word ("Mary, mother of Jesus" does — to Mary — and is then caught as ambiguous below). */
function coreName(name) {
  let s = name.replace(/\(.*?\)/g, " ").split(",")[0];
  s = s.replace(/\s+(the|of)\s.*$/i, "");
  s = s.replace(/^(Mount|The)\s+/i, "").replace(/\s+(River|Caesar)$/i, "").replace(/^Caesar\s+/i, "");
  const w = words(s);
  return w.length === 1 && !NOT_NAMES.has(w[0].toLowerCase()) ? w[0] : null;
}

const people = biblicalPeople.map((p) => ({ kind: "person", id: p.id, name: p.name, verses: p.verses.map((v) => v.reference), raw: p }));
const places = m.locations.map((l) => ({ kind: "place", id: l.id, name: l.name, verses: l.verses.map((v) => v.reference), raw: l }));

// Which records a one-word name could mean: any record (of any kind, church and world figures
// included) whose core name, or one of whose alternate names, IS that word. "Galilee" is not
// claimed by "Sea of Galilee" (which reduces to no name at all), but "Saul" is claimed by both
// King Saul and Paul, so it is never an answer.
const owners = new Map();
const claim = (word, key) => {
  const k = word.toUpperCase();
  if (!owners.has(k)) owners.set(k, new Set());
  owners.get(k).add(key);
};
// Map sites (pois.ts) are left out: where one shares a name with a place record ("Jericho") it is
// the same place, drawn on the map a second time.
for (const [kind, list] of [["person", m.people], ["place", m.locations]]) {
  for (const r of list) {
    const core = WORD_OVERRIDES[r.id] ?? coreName(r.name);
    if (core) claim(core, `${kind}:${r.id}`);
    for (const alt of r.alternateNames ?? []) {
      const c = coreName(alt);
      if (c) claim(c, `${kind}:${r.id}`);
    }
  }
}

const RANK = { major: 0, significant: 1, notable: 2 };
const eligible = [];
const rejected = [];
for (const r of [...people, ...places]) {
  // The answer word is the record's own display name when it is one word, else its first word when
  // that word is itself the familiar name (e.g. "Moses"); compound names are left out.
  const w = WORD_OVERRIDES[r.id] ?? coreName(r.name);
  if (!w) {
    rejected.push(`${r.id}: no one-word name in "${r.name}"`);
    continue;
  }
  const W = w.toUpperCase();
  if (!lettersOnly(w) || w.length < MIN_LEN || w.length > MAX_LEN) {
    rejected.push(`${r.id}: length ${w.length}`);
    continue;
  }
  const claimed = owners.get(W);
  // A name several records answer to is allowed only when this record is the clearly more
  // prominent bearer: a person whose tier outranks every other claimant, all of whom are people
  // ("Jacob" is the patriarch, not Jacob the father of Joseph in Matthew 1). Two equally prominent
  // bearers ("John"), a place against anything, or a person only claimed by an alternate name of
  // someone more prominent ("Saul") never qualify.
  const othersOutranked =
    r.kind === "person" &&
    [...(claimed ?? [])]
      .filter((k) => k !== `person:${r.id}`)
      .every((k) => {
        if (!k.startsWith("person:")) return false;
        const other = m.people.find((p) => `person:${p.id}` === k);
        return other && RANK[other.tier] > RANK[r.raw.tier];
      });
  if (claimed && claimed.size > 1 && !othersOutranked) {
    rejected.push(`${r.id}: "${w}" also names ${[...claimed].filter((k) => k !== r.kind + ":" + r.id).join(", ")}`);
    continue;
  }
  const kjv = wordCounts(w, "kjv").total;
  const asv = wordCounts(w, "asv").total;
  const web = wordCounts(w, "web");
  if (!web.total || !kjv || !asv) {
    rejected.push(`${r.id}: "${w}" not in every translation (WEB ${web.total}, KJV ${kjv}, ASV ${asv})`);
    continue;
  }
  let key = null;
  const ownRefs = REF_OVERRIDES[r.id] ? [REF_OVERRIDES[r.id]] : r.verses;
  for (const ref of ownRefs) {
    const keys = expandReference(ref);
    key = keys.find((k) => verseHasWordInAll(k, w)) ?? null;
    if (key) break;
  }
  if (!key) {
    rejected.push(`${r.id}: no verse in its own list names "${w}" in all three translations`);
    continue;
  }
  // Familiarity band: a person's own tier; a place by how often Scripture names it.
  const band = r.kind === "person" ? RANK[r.raw.tier] : web.total >= 40 ? 0 : web.total >= 10 ? 1 : 2;
  eligible.push({ word: W, kind: r.kind, id: r.id, label: r.name, ref: key, text: verseText(key, "web"), freq: web.total, band });
}

// ---------------------------------------------------------------- recognition list
const problems = [];
for (const id of Object.keys(KEEP)) if (id in REMOVE) problems.push(`${id} is in both KEEP and REMOVE`);
const eligibleIds = new Set(eligible.map((a) => a.id));
for (const id of Object.keys(KEEP)) if (!eligibleIds.has(id)) problems.push(`KEEP ${id} is no longer eligible — fix the record or move it to REMOVE with a reason`);
for (const id of [...Object.keys(WORD_OVERRIDES), ...Object.keys(REF_OVERRIDES)]) if (!(id in KEEP)) problems.push(`override for ${id}, which is not in KEEP`);
const answers = [];
for (const a of eligible) {
  if (a.id in KEEP) answers.push(a);
  else if (a.id in REMOVE) rejected.push(`${a.id}: not recognised enough — ${REMOVE[a.id]}`);
  else problems.push(`${a.id} ("${a.word}") is eligible but undecided — add it to KEEP or REMOVE in daily-name-curation.mjs`);
}

// Most familiar first: by band (a person's tier; a place by how often it is named), then by how
// many verses use the name, then alphabetically, so the order never depends on data-file order.
answers.sort((a, b) => a.band - b.band || b.freq - a.freq || a.word.localeCompare(b.word));
// Puzzles already issued keep their numbers: PINNED leads, in order.
{
  const pinned = PINNED.map((w) => answers.find((a) => a.word === w));
  PINNED.forEach((w, i) => {
    if (!pinned[i]) problems.push(`PINNED ${w} (puzzle #${i + 1}) is not an answer — an issued day would change`);
  });
  const rest = answers.filter((a) => !PINNED.includes(a.word));
  answers.splice(0, answers.length, ...pinned.filter(Boolean), ...rest);
}

// Guesses. Three sources, all names:
//   - every word of every person's and place's name and alternate names in the app's data (church
//     and world figures included, so "Luther" or "Wesley" is a valid guess);
//   - map-site names, but only the words that also occur as a proper name in Scripture (site names
//     carry words like "Grotto" and "Basilica" that are not names);
//   - proper names that occur capitalised and identically spelled in all three translations and
//     are never used lower-case in the WEB (which filters out ordinary words that merely open a
//     sentence), so a reader can guess "Goliath" or "Jonathan" though the app has no article yet.
// Topic titles are deliberately not a source: they carry words like "Crown" and "Shroud".
const guessSet = new Set(answers.map((a) => a.word));
const fits = (w) => lettersOnly(w) && w.length >= MIN_LEN && w.length <= MAX_LEN && !NOT_NAMES.has(w.toLowerCase());
const nameWords = (r) => [r.name, ...(r.alternateNames ?? []), ...(r.matchNames ?? [])].flatMap(words).filter((x) => /^[A-Z]/.test(x) && fits(x));
for (const r of [...m.people, ...m.locations]) for (const w of nameWords(r)) guessSet.add(w.toUpperCase());
{
  const c = loadCorpora();
  const capital = new Map();
  const lower = new Set();
  for (const r of c.order) {
    for (const w of words(c.web.get(r.key))) {
      if (/^[A-Z][a-z]+$/.test(w)) capital.set(w, (capital.get(w) ?? 0) + 1);
      else if (/^[a-z]+$/.test(w)) lower.add(w);
    }
  }
  const properInScripture = (w) => capital.has(w) && !lower.has(w.toLowerCase());
  for (const r of m.pois) for (const w of nameWords(r)) if (properInScripture(w)) guessSet.add(w.toUpperCase());
  const inAll = (w) => ["kjv", "asv"].every((t) => wordCounts(w, t).total > 0);
  for (const [w, n] of capital) {
    if (n < 2 || !properInScripture(w) || !fits(w)) continue;
    if (inAll(w)) guessSet.add(w.toUpperCase());
  }
}
const guesses = [...guessSet].sort();

// ---------------------------------------------------------------- checks
const seen = new Set();
for (const a of answers) {
  if (seen.has(a.word)) problems.push(`duplicate answer ${a.word}`);
  seen.add(a.word);
  if (!hasWord(a.text, a.word[0] + a.word.slice(1).toLowerCase())) problems.push(`${a.word}: verse ${a.ref} does not contain it`);
}
// A full year without a repeat needs 365. The app's records give fewer recognisable, one-word,
// identically spelled, unambiguous names than that, so the schedule cycles (in a fresh order each
// cycle — see answerForPuzzle() in lib/dailyName.ts). Fail only if the pool shrinks noticeably, or
// if either kind drops so low that the game stops feeling varied.
const nPeople = answers.filter((a) => a.kind === "person").length;
if (answers.length < 140) problems.push(`only ${answers.length} answers`);
if (nPeople < 80) problems.push(`only ${nPeople} people`);

const banner = `/* GENERATED by scripts/games-data/daily-name.mjs — do not edit by hand; rerun the script.
 *
 * ${answers.length} answers (${answers.filter((a) => a.kind === "person").length} people, ${answers.filter((a) => a.kind === "place").length} places), ${MIN_LEN}-${MAX_LEN} letters, most familiar first.
 * ${guesses.length} accepted guesses. Every answer is spelled identically in the WEB, KJV and ASV,
 * belongs to exactly one person or place record, is on the recognition list in
 * scripts/games-data/daily-name-curation.mjs, and its verse (WEB text, public domain) names it in
 * all three translations. */
`;
const body = `${banner}
export interface DailyNameAnswer {
  /** Upper-case letters only. */
  word: string;
  kind: "person" | "place";
  /** The record's id in people.ts / locations.ts — what the reveal opens. */
  id: string;
  /** The record's display name. */
  label: string;
  ref: string;
  /** World English Bible text of \`ref\`. */
  text: string;
}

export const DAILY_NAME_ANSWERS: DailyNameAnswer[] = ${JSON.stringify(answers.map(({ freq: _f, band: _b, ...a }) => a), null, 1)};

/** Space-separated, upper case. */
export const DAILY_NAME_GUESSES = ${JSON.stringify(guesses.join(" "))};
`;

if (process.argv.includes("--rejected")) console.log(rejected.join("\n"));
console.log(`answers ${answers.length} (by length: ${[4, 5, 6, 7, 8, 9].map((n) => `${n}:${answers.filter((a) => a.word.length === n).length}`).join(" ")}), guesses ${guesses.length}, rejected ${rejected.length}`);
if (check) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== body) problems.push(`${path.relative(REPO_ROOT, OUT)} is out of date — rerun without --check`);
} else {
  fs.writeFileSync(OUT, body);
}
if (problems.length) {
  console.error("FAIL\n" + problems.join("\n"));
  process.exit(1);
}
console.log("daily-name: OK");
