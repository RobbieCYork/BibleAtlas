#!/usr/bin/env node
// ── Does a record's OWN NAME link to somebody else on its own page? ───────────────────────────
//
//   node scripts/name-linker/self-name.mjs            list every candidate, with an example
//   node scripts/name-linker/self-name.mjs --check    exit 1 if any candidate is unreviewed
//
// Built 2026-09-10, out of the second-bearer sweep, because that sweep kept finding the same
// shape and finding it by hand. `computeLinkAnnotations` excludes a record's page from linking to
// ITSELF — but the exclusion is `id !== excludeId`, so it only fires when the resolved id IS the
// owner. When a page's subject shares a bare name with a more famous bearer, the bare name
// resolves to the OTHER man, the exclusion never sees it, and the page links its own subject's
// name to somebody else. Every time. On every mention.
//
// It is the single commonest failure site in the whole second-bearer enumeration, and nothing
// here could see it:
//
//   the snapshot       — green. These links have been there since the records were written, so
//                        there is no diff; a fault that never moves is invisible to a diff.
//   modern-names.mjs   — silent. "Philip" and "Ananias" are not modern personal names.
//   links-for.mjs      — would show it, to a person who ran it on the right record and read the
//                        output. That is the tool this one automates.
//
// Measured the day it was written, after the Philip cluster had already been fixed: 14 shapes and
// 62 links, of which 60 were faults and 2 were correct and deliberate. Five of the fourteen —
// mary-magdalene, mary-of-bethany, james-son-of-alphaeus, thomas-aquinas and caesar-augustus —
// were NOT in the sweep that prompted this file, and the five Simons were not either. The sweep
// had checked those records and reported that they "resolve correctly wherever their longer
// wording appears", which was true and was not the same question.
//
// ── What counts as "its own name" ────────────────────────────────────────────────────────────
//
// The FIRST word of the person record's `name`, after any honorific — "Philip the Evangelist" ->
// Philip, "Ananias of Damascus" -> Ananias, "Joram, King of Judah" -> Joram, "Mark (John Mark)"
// -> Mark, "Pope John XXIII" -> John. Deliberately not every word of the name: "James, brother of
// Jesus" would otherwise flag its own "Jesus" links, which are correct, and the whole value of
// this check is that it has almost no false positives to wade through.
//
// It follows that the check cannot see a record whose subject is known by a name that is not the
// first word of its `name` field. That is a real gap and it is the price of the precision.
//
// ── The ledger ───────────────────────────────────────────────────────────────────────────────
//
// `self-name-reviewed.tsv`, hand-written, one row per accepted shape, and a row there is a claim
// that a person read the sentences and decided the link is RIGHT. There is deliberately no
// `--update`: unlike the modern-name sweep, where most candidates are correct links and blessing
// in bulk is the sane default, a candidate here is a fault until someone argues otherwise. Adding
// a row must cost a sentence of typing.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProseBlocks } from "./corpus.mjs";
import { loadLinker } from "./loadLinker.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEDGER = path.join(HERE, "self-name-reviewed.tsv");
const RED = "\x1b[31m", GREEN = "\x1b[32m", YELLOW = "\x1b[33m", DIM = "\x1b[2m", OFF = "\x1b[0m";

const argv = process.argv.slice(2);
const check = argv.includes("--check");

const { computeLinkAnnotations, people, topics, timelineEvents, locations } = await loadLinker();

/** Titles that precede the personal name in a record's `name`. Kept short and explicit: a general
 *  "skip any word that is not the name" test does not exist, and a long list would start eating
 *  real names ("Justus", "Magnus"). */
const HONORIFICS = new Set(["pope", "saint", "st.", "st", "king", "queen", "emperor", "rabbi", "sir", "the"]);

function ownName(name) {
  const tokens = name.replace(/[(),]/g, " ").split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length && HONORIFICS.has(tokens[i].toLowerCase())) i += 1;
  return tokens[i] ?? null;
}

/** The five fields that are links on the pre-rendered public pages and plain text in the app.
 *  `loadProseBlocks()` correctly leaves them out — the app really does render them as text — but
 *  they ARE links to a stranger reading capstonebible.com, so this check has to see them. Kept in
 *  step with `seoOnlyBlocks()` in modern-names.mjs and with the linkify call sites in
 *  scripts/seo/render.mjs; if a sixth field is ever linkified there, add it in both places. */
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

const firstNameOf = new Map();
for (const p of people) {
  const first = ownName(p.name);
  if (first) firstNameOf.set(p.id, first.toLowerCase());
}

const blocks = [...(await loadProseBlocks()), ...seoOnlyBlocks()];
const hits = new Map();
for (const b of blocks) {
  const first = firstNameOf.get(b.owner);
  if (!first) continue; // not a person record, so it has no "own name" in this sense
  for (const a of computeLinkAnnotations(b.text, b.owner)) {
    if (a.kind !== "person" || !a.id || a.id === b.owner) continue;
    if (a.text.toLowerCase() !== first) continue;
    const key = `${b.owner}\t${a.text}\t${a.id}`;
    if (!hits.has(key)) hits.set(key, { n: 0, srcs: new Set(), example: "" });
    const hit = hits.get(key);
    hit.n += 1;
    hit.srcs.add(b.src);
    if (!hit.example) {
      hit.example = b.text.slice(Math.max(0, a.start - 50), a.end + 50).replace(/\s+/g, " ");
    }
  }
}

/** owner \t surface \t target \t verdict \t note — blank lines and `#` comments ignored. A row
 *  with no note is refused: the note is the whole point of the row. */
const reviewed = new Map();
if (fs.existsSync(LEDGER)) {
  for (const line of fs.readFileSync(LEDGER, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [owner, surface, target, verdict, ...rest] = line.split("\t");
    const note = rest.join("\t").trim();
    if (!note) {
      console.error(`${RED}self-name-reviewed.tsv: row for ${owner}/${surface} has no note.${OFF}`);
      process.exit(2);
    }
    reviewed.set(`${owner}\t${surface}\t${target}`, { verdict, note });
  }
}

const unreviewed = [];
let links = 0;
for (const [key, hit] of [...hits.entries()].sort()) {
  links += hit.n;
  const [owner, surface, target] = key.split("\t");
  const seen = reviewed.get(key);
  if (!seen) unreviewed.push({ key, hit });
  if (check && seen) continue;
  const mark = seen ? `${GREEN}reviewed${OFF} ${DIM}${seen.verdict}${OFF}` : `${YELLOW}UNREVIEWED${OFF}`;
  console.log(`${owner}  «${surface}» -> ${target}  ${hit.n} link(s)  ${mark}`);
  console.log(`  ${DIM}${[...hit.srcs].join(", ")}${OFF}`);
  console.log(`  …${hit.example}…`);
  if (seen) console.log(`  ${DIM}${seen.note}${OFF}`);
}

const stale = [...reviewed.keys()].filter((k) => !hits.has(k));

console.log(
  `\nself-name: ${hits.size} shape(s), ${links} link(s); ` +
    `unreviewed: ${unreviewed.length ? RED + unreviewed.length + OFF : GREEN + "0" + OFF}` +
    (stale.length ? `  ${DIM}(${stale.length} ledger row(s) no longer fire — delete them)${OFF}` : "")
);

if (check) {
  if (unreviewed.length) {
    console.error(
      `\n${RED}A record's own name links to a different person, and nobody has said that is right.${OFF}\n` +
        `Fix it in src/lib/verseAnnotations.ts — OWNER_NAME_OVERRIDES keyed on the record's own id,\n` +
        `mapped to the record itself where the page's subject is meant (the self-link exclusion then\n` +
        `suppresses it), to the other man's record where the app has him, or to null where it does not.\n` +
        `If the link is genuinely correct, add a row to scripts/name-linker/self-name-reviewed.tsv\n` +
        `with a sentence saying why.`
    );
    process.exit(1);
  }
  console.log(`${GREEN}ok${OFF} — no record's own name resolves to a different record unreviewed.`);
}
