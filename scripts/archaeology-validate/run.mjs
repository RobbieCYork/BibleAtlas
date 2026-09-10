#!/usr/bin/env node
// §7.5's validator. Checks every `category: "discovery"` and `category: "manuscript"` Topic against
// the mandatory-field rules of §3.2 and §4.1 of `automation/manager/archaeology-scope.md`.
//
//   npm run validate:archaeology                      everything. Exit 0 only if clean.
//   node scripts/archaeology-validate/run.mjs --id tel-dan-stele      one record
//   node scripts/archaeology-validate/run.mjs --signals               just the flag signals
//   node scripts/archaeology-validate/run.mjs --update-reviewed       bless the current signals
//
// It runs inside `vite build` (see `vite-plugin-archaeology-validate.ts`), so a batch cannot reach
// production without passing it. That is deliberate: batch 3 shipped five articles missing the
// mandatory institutional citation, and the count that found them was taken after the deploy.
//
// 🚨 IT IS NOT A BUILD CHECK. It bundles the data with rolldown, which strips TypeScript types
// without checking them — exactly the trap AGENTS.md documents for `test:linker`. It goes green on
// a tree that does not compile. Run `npm run build` as well, every time.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadData } from "./loadData.mjs";
import {
  MIN_CITATIONS, MIN_VERSES, REQUIRED_SECTIONS, NON_COUNTING_TIERS, VALID_TIERS, VALID_CERTAINTY,
  DISCOVERY_REQUIRED, MANUSCRIPT_REQUIRED, MANUSCRIPT_EXPECTED, PLACEHOLDER, FORBIDDEN_PHRASES,
  UNPROVENANCED_SIGNALS, AUTHENTICITY_SIGNALS, tierCounts, articleText, disputeText,
} from "./rules.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REVIEWED = path.join(HERE, "reviewed.tsv");

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const arg = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
const onlyId = arg("--id");
const signalsOnly = has("--signals");
const quiet = has("--quiet");
// Same refusal as `modern-names.mjs`: blessing a signal is its own command, typed on purpose, so
// that a future `npm run validate:archaeology -- --update-reviewed` cannot be smuggled in beside a
// check and silently bless everything it was supposed to catch.
const updateReviewed = has("--update-reviewed");

const RED = "\x1b[31m", GREEN = "\x1b[32m", YELLOW = "\x1b[33m", CYAN = "\x1b[36m", DIM = "\x1b[2m", OFF = "\x1b[0m";

// ── reviewed.tsv ──────────────────────────────────────────────────────────────────────────────
// One row per flag signal a human has read and ruled on. A signal NOT in this file fails the run.
// verdict<TAB>id<TAB>flag<TAB>phrase
function readReviewed() {
  if (!fs.existsSync(REVIEWED)) return new Map();
  const out = new Map();
  for (const line of fs.readFileSync(REVIEWED, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [verdict, id, flag, phrase] = line.split("\t");
    out.set(`${id}\t${flag}`, { verdict, phrase: phrase ?? "" });
  }
  return out;
}

// ── the checks ────────────────────────────────────────────────────────────────────────────────
const { topics, locations, pois } = await loadData();
const locationIds = new Set(locations.map((l) => l.id));
const poiIds = new Set(pois.map((p) => p.id));

const archaeology = topics.filter((t) => t.category === "discovery" || t.category === "manuscript");
const scope = onlyId ? archaeology.filter((t) => t.id === onlyId) : archaeology;
if (onlyId && !scope.length) {
  console.error(`${RED}No discovery/manuscript topic with id "${onlyId}".${OFF}`);
  process.exit(2);
}

const errors = [];   // { id, name, msg }
const notes = [];    // { id, name, msg }  — reported, never fatal
const signals = [];  // { id, name, flag, phrase }

const push = (list, t, msg) => list.push({ id: t.id, name: t.name, msg });

for (const t of scope) {
  const facts = t.category === "discovery" ? t.discovery : t.manuscript;
  const factsKey = t.category === "discovery" ? "discovery" : "manuscript";
  const required = t.category === "discovery" ? DISCOVERY_REQUIRED : MANUSCRIPT_REQUIRED;

  // -- the facts block itself -----------------------------------------------------------------
  if (!facts) {
    push(errors, t, `category "${t.category}" but no \`${factsKey}\` facts block at all`);
  } else {
    for (const field of required) {
      const v = facts[field];
      if (v === undefined || v === null || String(v).trim() === "") {
        push(errors, t, `${factsKey}.${field} is missing — §${t.category === "discovery" ? "3.2" : "4.1"} makes it mandatory`);
      } else if (PLACEHOLDER.test(String(v).trim())) {
        push(errors, t, `${factsKey}.${field} is a placeholder (${JSON.stringify(String(v))}) — §3.2: "a stone" is not an answer`);
      }
    }
    const certField = t.category === "discovery" ? "objectDateCertainty" : "dateCertainty";
    if (facts[certField] && !VALID_CERTAINTY.has(facts[certField])) {
      push(errors, t, `${factsKey}.${certField} is "${facts[certField]}" — not a TimelineDateCertainty`);
    }
    // findSiteId must resolve, and findSiteKind must agree with where it resolves.
    if (facts.findSiteId) {
      const kind = facts.findSiteKind;
      if (!kind) {
        push(errors, t, `${factsKey}.findSiteId is set but findSiteKind is not — the panel cannot resolve it`);
      } else if (kind === "location" && !locationIds.has(facts.findSiteId)) {
        push(errors, t, `${factsKey}.findSiteId "${facts.findSiteId}" is not a Location id`);
      } else if (kind === "poi" && !poiIds.has(facts.findSiteId)) {
        push(errors, t, `${factsKey}.findSiteId "${facts.findSiteId}" is not a POI id`);
      } else if (kind !== "location" && kind !== "poi") {
        push(errors, t, `${factsKey}.findSiteKind "${kind}" is neither "location" nor "poi"`);
      }
    } else if (facts.findSiteKind) {
      push(errors, t, `${factsKey}.findSiteKind is set but findSiteId is not`);
    }
    if (t.category === "manuscript") {
      const absent = MANUSCRIPT_EXPECTED.filter((f) => !facts[f]);
      if (absent.length) push(notes, t, `manuscript.${absent.join(", ")} absent — §4.1 "optional but expected wherever they exist"`);
    }
  }

  // -- the wrong facts block ------------------------------------------------------------------
  if (t.category === "discovery" && t.manuscript) push(errors, t, `category "discovery" but carries a \`manuscript\` block`);
  if (t.category === "manuscript" && t.discovery) push(errors, t, `category "manuscript" but carries a \`discovery\` block`);

  // -- sections: exactly three, §3.3 --------------------------------------------------------
  const sections = t.sections ?? [];
  if (sections.length !== REQUIRED_SECTIONS) {
    push(errors, t, `${sections.length} sections — §3.2 requires exactly ${REQUIRED_SECTIONS}, the third being the dispute`);
  }
  sections.forEach((s, i) => {
    if (!s.heading || !String(s.heading).trim()) push(errors, t, `section ${i + 1} has no heading`);
    if (!Array.isArray(s.paragraphs) || !s.paragraphs.length) push(errors, t, `section ${i + 1} ("${s.heading}") has no paragraphs`);
  });

  // -- verses ---------------------------------------------------------------------------------
  const verses = t.verses ?? [];
  if (verses.length < MIN_VERSES) {
    push(errors, t, `${verses.length} verse${verses.length === 1 ? "" : "s"} — §3.2 requires at least ${MIN_VERSES}. This is a Bible study app`);
  }
  for (const v of verses) {
    if (!v?.reference || !String(v.reference).trim()) push(errors, t, `a verses[] entry has no reference`);
  }

  // -- citations, §5 --------------------------------------------------------------------------
  const citations = t.citations ?? [];
  const bad = citations.filter((c) => !VALID_TIERS.has(c.tier));
  for (const c of bad) push(errors, t, `citation "${c.label ?? "(no label)"}" has tier "${c.tier}", which is not a CitationTier`);
  const counts = tierCounts(citations);
  if (counts.counting < MIN_CITATIONS) {
    push(errors, t, `${counts.counting} counting citation${counts.counting === 1 ? "" : "s"} (${counts.total} total, ${counts.encyclopedic} encyclopedic) — §3.2 requires at least ${MIN_CITATIONS}; Wikipedia does not count`);
  }
  if (counts.institution < 1) {
    push(errors, t, `NO institutional citation — §3.2 requires at least one (holding institution, excavating body, IAA release). This is the check batch 3 shipped five articles without`);
  }
  if (counts.scholarlyOrPrimary < 1) {
    push(errors, t, `no scholarly or primary citation — §7.5 requires at least one alongside the institutional one`);
  }
  for (const c of citations) {
    if (!c.label || !String(c.label).trim()) push(errors, t, `a citation has no label`);
    if (c.url && !/^https?:\/\//i.test(c.url)) push(errors, t, `citation "${c.label}" has a url that is not http(s): ${c.url}`);
    if (!c.url && c.tier !== "scholarly") push(notes, t, `citation "${c.label}" (${c.tier}) has no url — legitimate for print scholarship, unusual otherwise`);
  }

  // -- §3.4's three forbidden lines -----------------------------------------------------------
  const body = articleText(t);
  for (const f of FORBIDDEN_PHRASES) {
    if (f.re.test(body)) push(errors, t, `article text contains ${f.why}`);
  }

  // -- flag signals, §7.5 ---------------------------------------------------------------------
  const dispute = disputeText(t);
  const scan = (patterns, flag) => {
    if (facts?.[flag]) return;                       // already set — nothing to report
    for (const re of patterns) {
      const m = re.exec(dispute);
      if (m) { signals.push({ id: t.id, name: t.name, flag, phrase: m[0] }); return; }
    }
  };
  // Both flags live on `DiscoveryFacts`; `ManuscriptFacts` has neither field, so scanning a
  // manuscript for them would report a fault the schema gives nowhere to fix.
  if (t.category === "discovery") {
    scan(UNPROVENANCED_SIGNALS, "unprovenanced");
    scan(AUTHENTICITY_SIGNALS, "authenticityDisputed");
  }
}

// ── --update-reviewed ─────────────────────────────────────────────────────────────────────────
if (updateReviewed) {
  const prior = readReviewed();
  const lines = [
    "# Flag signals that have been READ, and what the reader concluded.",
    "# verdict<TAB>id<TAB>flag<TAB>the phrase that tripped it",
    "# Regenerate with: node scripts/archaeology-validate/run.mjs --update-reviewed",
    "#",
    "# A signal absent from this file fails the run. Do not add a row you have not read: every row",
    "# here is a claim that a person opened that article's third section and decided the flag is",
    "# right as it stands. Verdicts in use:",
    "#   ok       the prose trips the pattern but the object genuinely is not unprovenanced /",
    "#            authenticity is genuinely not in question (e.g. \"it is NOT a piece of the",
    "#            antiquities market\", or the article discusses someone else's forgery).",
    "#   todo     the flag really should be set — left here so it is not lost, and it is a bug.",
    "#",
  ];
  for (const s of signals.sort((a, b) => (a.id + a.flag).localeCompare(b.id + b.flag))) {
    const kept = prior.get(`${s.id}\t${s.flag}`);
    lines.push([kept?.verdict ?? "REVIEW-ME", s.id, s.flag, s.phrase].join("\t"));
  }
  fs.writeFileSync(REVIEWED, lines.join("\n") + "\n");
  console.log(`${YELLOW}reviewed.tsv rewritten with ${signals.length} signal rows. Every row marked REVIEW-ME still has to be read.${OFF}`);
  process.exit(0);
}

// ── report ────────────────────────────────────────────────────────────────────────────────────
const reviewed = readReviewed();
const unreviewedSignals = signals.filter((s) => {
  const row = reviewed.get(`${s.id}\t${s.flag}`);
  return !row || row.verdict === "REVIEW-ME" || row.verdict === "todo";
});

const byId = new Map();
for (const e of errors) {
  if (!byId.has(e.id)) byId.set(e.id, { name: e.name, msgs: [] });
  byId.get(e.id).msgs.push(e.msg);
}

if (!quiet && !signalsOnly) {
  const d = scope.filter((t) => t.category === "discovery").length;
  const m = scope.filter((t) => t.category === "manuscript").length;
  console.log(`${CYAN}archaeology-validate${OFF}  ${scope.length} records (${d} discovery, ${m} manuscript) of ${topics.length} topics`);
}

if (!signalsOnly) {
  for (const [id, { name, msgs }] of byId) {
    console.log(`${RED}✗ ${id}${OFF} ${DIM}${name}${OFF}`);
    for (const m of msgs) console.log(`    ${m}`);
  }
  if (notes.length && !quiet) {
    console.log(`${DIM}${notes.length} note${notes.length === 1 ? "" : "s"} (not fatal):${OFF}`);
    for (const n of notes) console.log(`  ${DIM}· ${n.id}: ${n.msg}${OFF}`);
  }
}

for (const s of unreviewedSignals) {
  console.log(`${YELLOW}⚑ ${s.id}${OFF} ${DIM}${s.name}${OFF}`);
  console.log(`    prose trips ${s.flag} — matched ${JSON.stringify(s.phrase)} — but ${s.flag} is not set.`);
  console.log(`    ${DIM}Read the third section, then record the verdict in scripts/archaeology-validate/reviewed.tsv${OFF}`);
}

const failed = byId.size > 0 || unreviewedSignals.length > 0;
if (failed) {
  console.log(
    `${RED}archaeology-validate FAILED${OFF} — ${byId.size} record${byId.size === 1 ? "" : "s"} with errors, ` +
      `${unreviewedSignals.length} unreviewed flag signal${unreviewedSignals.length === 1 ? "" : "s"}.`,
  );
  process.exit(1);
}
if (!quiet) {
  console.log(
    `${GREEN}archaeology-validate ok${OFF} — ${scope.length} records, 0 errors, ` +
      `${signals.length} flag signal${signals.length === 1 ? "" : "s"} all reviewed, ${notes.length} notes.`,
  );
  console.log(`${DIM}This is a DATA check. It does not compile anything — run \`npm run build\` too.${OFF}`);
}
