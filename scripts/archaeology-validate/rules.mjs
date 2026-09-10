// The rules of §3.2 (discoveries) and §4.1 (manuscripts) of
// `automation/manager/archaeology-scope.md`, expressed as code instead of as something a reviewer
// is expected to remember.
//
// This file exists because batch 3 shipped five of fourteen articles without the institutional
// citation §3.2 makes mandatory, and caught it only by scripting a count AFTER the deploy. A rule
// that lives in a document and is checked by eye is not a rule.
//
// Two severities, and the distinction is load-bearing:
//
//   ERROR   Mechanical and unambiguous — a field is absent, a count is short, a tier is missing.
//           Zero false positives by construction. Fails the run, and fails `vite build`.
//
//   SIGNAL  Heuristic — the article's own prose says the object came off the antiquities market
//           but `unprovenanced` is not set. These CANNOT be zero-false-positive: the Bethlehem
//           bulla's article says "it is not a piece of the antiquities market", which is the
//           phrase and the opposite of the claim. So signals follow the `modern-names.mjs`
//           pattern already used in this repo: a signal absent from `reviewed.tsv` fails
//           `--check`; a signal someone has read and ruled on does not. Blessing one is a
//           separate, deliberate command.

/** §5 / §3.2 — Wikipedia is its own tier precisely so it can be listed without being allowed to
 * carry an article. It does not count toward the minimum of three. */
export const MIN_CITATIONS = 3;
export const MIN_VERSES = 2;
export const REQUIRED_SECTIONS = 3;
export const NON_COUNTING_TIERS = new Set(["encyclopedic"]);
export const SCHOLARLY_OR_PRIMARY = new Set(["scholarly", "primary"]);
export const VALID_TIERS = new Set(["institution", "scholarly", "primary", "reference", "encyclopedic"]);
export const VALID_CERTAINTY = new Set(["firm", "traditional", "disputed", "legendary"]);

/** §3.2 mandatory `discovery` fields. `foundBy` accepts "Unknown" and "credit is contested" as
 * values — what it does not accept is absence. */
export const DISCOVERY_REQUIRED = [
  "objectType",
  "findSite",
  "foundYear",
  "foundBy",
  "objectDate",
  "objectDateCertainty",
  "currentLocation",
];

/** §4.1 mandatory `manuscript` fields. `origin`, `siglum`, `shelfmark` and `facsimileUrl` are
 * "optional but expected wherever they exist" — reported as a note, never as an error. */
export const MANUSCRIPT_REQUIRED = [
  "manuscriptType",
  "language",
  "contents",
  "findSite",
  "foundYear",
  "foundBy",
  "dateAssigned",
  "dateCertainty",
  "currentLocation",
];

export const MANUSCRIPT_EXPECTED = ["origin", "shelfmark", "facsimileUrl"];

/** §3.2 forbids "a stone" as an `objectType`. Placeholder text of any kind in a mandatory field is
 * an absence wearing a value. */
export const PLACEHOLDER = /^(tbd|todo|n\/?a|unknown object|a stone|\?+|-+|xxx)$/i;

/** §3.4 — three sentences that must never appear, because each is the maximalist failure mode in
 * miniature. Matched loosely enough to catch the phrasings, tightly enough not to fire on an
 * article that is quoting the claim in order to refuse it (those are almost always inside quotes,
 * which is why the quote-adjacent form is excluded). */
export const FORBIDDEN_PHRASES = [
  { re: /archaeolog\w*\s+has\s+proven\s+the\s+bible/i, why: '§3.4: "archaeology has proven the Bible true"' },
  { re: /\bscholars\s+now\s+admit\b/i, why: '§3.4: "scholars now admit" is a rhetorical move, not a report' },
];

/** Kind-4 signal: the article says the object has no excavation context. High-recall on purpose;
 * `reviewed.tsv` carries the ones a reader has ruled on. */
export const UNPROVENANCED_SIGNALS = [
  /\bunprovenanced\b/i,
  /\bantiquities market\b/i,
  /\bno (?:known )?(?:excavation|archaeological) context\b/i,
  /\bsurfaced on the (?:antiquities )?market\b/i,
  /\bno findspot\b/i,
  /\bbought from a dealer\b/i,
];

/** Kind-3 signal: the article says the object may not be genuine. */
export const AUTHENTICITY_SIGNALS = [
  /\bforger(?:y|ies)\b/i,
  /\bforged\b/i,
  /\bauthenticity (?:is |was |remains )?(?:seriously )?(?:disputed|questioned|contested|in doubt)\b/i,
  /\bmodern fake\b/i,
  /\bnot genuine\b/i,
];

export function tierCounts(citations) {
  const counting = citations.filter((c) => !NON_COUNTING_TIERS.has(c.tier));
  return {
    total: citations.length,
    counting: counting.length,
    institution: citations.filter((c) => c.tier === "institution").length,
    scholarlyOrPrimary: citations.filter((c) => SCHOLARLY_OR_PRIMARY.has(c.tier)).length,
    encyclopedic: citations.filter((c) => c.tier === "encyclopedic").length,
  };
}

export const articleText = (t) =>
  [t.summary ?? "", ...(t.sections ?? []).flatMap((s) => [s.heading ?? "", ...(s.paragraphs ?? [])])].join("\n");

/** The third section is where §3.3 puts the dispute, so that is where a provenance or authenticity
 * signal carries weight. Falls back to the whole article when there is no third section, because a
 * record that has already failed the section-count check should still be scanned. */
export const disputeText = (t) => {
  const third = (t.sections ?? [])[2];
  if (!third) return articleText(t);
  return [t.summary ?? "", third.heading ?? "", ...(third.paragraphs ?? [])].join("\n");
};
