// Heuristic checker for the Guess the Punchline bank (src/data/bibleJokes.ts).
//
// Robbie's complaint: wrong answers whose grammar does not fit the setup can be eliminated without
// knowing the joke. This script builds every round (every joke x every level, exactly as the game
// does) and flags rounds where a choice differs from the correct answer in SHAPE: quote vs not,
// "When..." clause, prepositional phrase, "Name - clause", leading "Because", past vs present
// clause, a number mismatch with the setup ("Which animals" vs "The elephant"), a big length gap, or
// the correct answer being the only one with some pattern.
//
// IT IS A HEURISTIC AID, NOT A SUBSTITUTE FOR READING THE JOKES. It will miss subtle mismatches and
// it can raise false positives. Run it whenever a joke is added; then read the new rounds yourself.
//
//   node scripts/joke-validate.mjs            # summary + flagged rounds
//   node scripts/joke-validate.mjs --list     # also list every joke with its choices (beginner)
//   node scripts/joke-validate.mjs --check    # exit 1 if anything is flagged (for CI)
//
// Like the other validators here it bundles the data with rolldown, which strips types without
// checking them. It is a DATA check. `npm run build` is the build check.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "joke-validate-"));
const entry = path.join(dir, "entry.ts");
const out = path.join(dir, "bundle.mjs");
fs.writeFileSync(entry, `export * from ${JSON.stringify(path.join(ROOT, "src/data/bibleJokes"))};`);
const b = await rolldown({ input: entry, logLevel: "silent" });
await b.write({ file: out, format: "esm" });
await b.close();
const data = await import(pathToFileURL(out).href);
fs.rmSync(dir, { recursive: true, force: true });
const { BIBLE_JOKES, JOKE_LEVELS, buildRound } = data;

const PAST = /^(was|were|had|did|didn't|couldn't|wouldn't|would|could|kept|hadn't|ate|got|heard|drove|left|took|knew|sat|went|never|already)\b/i;
const PRESENT = /^(is|are|has|have|can|find|sing|it's|it is|you|nobody|all|we)\b/i;

const PAST_ANY = /\b(was|were|had|hadn't|would|could|couldn't|kept|ate|heard|led|built|sang|took|got|never spoke|\w+ed)\b/i;
function words(s) { return s.trim().split(/\s+/).length; }

function shape(text) {
  const t = text.trim();
  const tags = [];
  if (/^["“]/.test(t)) tags.push("quote");
  else if (/^Because\b/.test(t)) tags.push("because");
  else if (/^When\b/.test(t)) tags.push("when");
  else if (/^(In|At|On|With|As|Rather)\b/.test(t)) tags.push("prep");
  else if (/^[A-Z][\w'.]*( [A-Z][\w'.]*)? [—-]/.test(t) || /^[A-Z][a-z]+\. /.test(t)) tags.push("name-dash");
  else if (/^Nothing\b/.test(t)) tags.push("nothing");
  else if (/^The\b/.test(t)) tags.push("the-np");
  else if (/^[A-Z][a-z]+ing\b/.test(t) && words(t) <= 6) tags.push("gerund");
  else if (words(t) <= 2) tags.push("short");
  else {
    // a clause: read tense off the first few tokens
    const head = t.replace(/[.,"\u201d]/g, "").split(/\s+/).slice(0, 7).join(" ");
    tags.push(PAST_ANY.test(head) ? "clause-past" : "clause-present");
  }
  return tags[0];
}

const rows = [];
let flaggedRounds = 0;
let totalRounds = 0;
const flagsByJoke = new Map();
for (const joke of BIBLE_JOKES) {
  for (const level of JOKE_LEVELS) {
    totalRounds++;
    const r = buildRound(joke, level);
    const correct = r.choices[r.correctIndex];
    const cs = shape(correct);
    const flags = [];
    r.choices.forEach((c, i) => {
      if (i === r.correctIndex) return;
      const s = shape(c);
      if (s !== cs) flags.push(`shape ${cs} vs ${s}: ${c.slice(0, 40)}`);
      const wr = Math.max(words(c), words(correct)) / Math.min(words(c), words(correct));
      if (wr > 2.6 && Math.abs(words(c) - words(correct)) > 4) flags.push(`length ${words(correct)}w vs ${words(c)}w`);
    });
    // number agreement with the setup
    const pluralSetup = /^Which animals\b/.test(joke.setup);
    const singularSetup = /^Which (animal|part|prophet)\b/.test(joke.setup);
    for (const c of r.choices) {
      if (pluralSetup && /^The [A-Za-z]+[^s]\b/.test(c) && !/s[.,]/.test(c.slice(0, 20))) flags.push(`number: plural setup, singular choice ${c.slice(0, 30)}`);
      if (singularSetup && /^The [A-Za-z]+s[.,]/.test(c)) flags.push(`number: singular setup, plural choice ${c.slice(0, 30)}`);
    }
    // correct answer unique pattern
    const others = r.choices.filter((_, i) => i !== r.correctIndex).map(shape);
    if (others.every((s) => s !== cs)) flags.push(`correct is the only ${cs}`);
    if (flags.length) {
      flaggedRounds++;
      flagsByJoke.set(joke.id, [...(flagsByJoke.get(joke.id) || []), `[${level.key}] ` + [...new Set(flags)].join("; ")]);
    }
    if (process.argv.includes("--list") && level.key === "beginner")
      rows.push(`${joke.id}\n  Q: ${joke.setup}\n${r.choices.map((c, i) => `  ${i === r.correctIndex ? "*" : " "} ${c}`).join("\n")}`);
  }
}
if (rows.length) console.log(rows.join("\n"));
for (const [id, fl] of flagsByJoke) console.log(`FLAG ${id}\n  ${fl.join("\n  ")}`);
console.log(`\njokes: ${BIBLE_JOKES.length}  rounds: ${totalRounds}  flagged rounds: ${flaggedRounds}  flagged jokes: ${flagsByJoke.size}`);
console.log("(heuristic aid only - read the rounds yourself)");
if (process.argv.includes("--check") && flaggedRounds) process.exit(1);
