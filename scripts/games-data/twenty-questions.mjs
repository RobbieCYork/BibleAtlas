// Checks the 20 Questions data and writes the reveal verses.
//
//     node scripts/games-data/twenty-questions.mjs           check, then write src/data/twentyQuestionsVerses.ts
//     node scripts/games-data/twenty-questions.mjs --check   check, and fail if that file is out of date
//
// What it proves, for each of People, Places and Things:
//   - every entry id is unique, and every People / Places id is a real record in people.ts /
//     locations.ts (so the reveal opens the right article); every article link points at a real record;
//   - every question lists only real entries, and no entry is both Yes and Not stated;
//   - every reveal verse exists and contains the entry's keyword in the WEB, the KJV AND the ASV;
//   - Places: the generated "kind" answers agree with each record's category in locations.ts, and
//     "mentioned in the Old / New Testament" agrees with the text of all three translations;
//   - People: "lived in Old / New Testament times" puts every person in exactly one of the two;
//   - REACHABILITY, two ways: (1) for every entry there is a set of at most 20 questions whose
//     answers rule out every other entry in its category (a Not stated answer rules nobody out),
//     found greedily, so the true minimum is no larger; (2) "blind play" — a player who does not
//     know the answer and always asks the most even split reaches exactly that entry, and guesses
//     it, within 20 turns. Worst and average are printed.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { loadLinker } from "../name-linker/loadLinker.mjs";
import { REPO_ROOT, TRANSLATIONS, loadCorpora, wordCounts } from "./lib.mjs";

const OUT = path.join(REPO_ROOT, "src/data/twentyQuestionsVerses.ts");
const LIMIT = 20;
const check = process.argv.includes("--check");

async function bundle(entry) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tq-"));
  const b = await rolldown({ input: entry, logLevel: "silent" });
  await b.write({ file: path.join(dir, "m.mjs"), format: "esm" });
  await b.close();
  const mod = await import(pathToFileURL(path.join(dir, "m.mjs")).href);
  fs.rmSync(dir, { recursive: true, force: true });
  return mod;
}

const tq = await bundle(path.join(REPO_ROOT, "src/data/twentyQuestions/index.ts"));
const places = await bundle(path.join(REPO_ROOT, "src/data/twentyQuestions/places.ts"));
const data = await loadLinker();
const corpora = loadCorpora();

const problems = [];
const fail = (msg) => problems.push(msg);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const containsWord = (text, word) => new RegExp(`(^|[^A-Za-z])${esc(word)}([^A-Za-z]|$)`, "i").test(text);

const records = {
  person: new Map(data.people.map((r) => [r.id, r])),
  place: new Map(data.locations.map((r) => [r.id, r])),
  site: new Map(data.pois.map((r) => [r.id, r])),
  topic: new Map(data.topics.map((r) => [r.id, r])),
};

const verses = {};
const report = [];

for (const set of Object.values(tq.TQ_SETS)) {
  const ids = set.entries.map((e) => e.id);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) fail(`${set.category}: duplicate entry id`);

  for (const e of set.entries) {
    // Article
    const own = set.category === "people" ? "person" : set.category === "places" ? "place" : null;
    const art = e.article === undefined ? (own ? { kind: own, id: e.id } : null) : e.article;
    if (own && !records[own].has(e.id)) fail(`${set.category}/${e.id}: no such record in ${own === "person" ? "people.ts" : "locations.ts"}`);
    if (art && !records[art.kind].has(art.id)) fail(`${set.category}/${e.id}: article ${art.kind}:${art.id} does not exist`);
    // Verse
    const keywords = e.keywords ?? [e.name.split(/[ ,(]/)[0]];
    for (const t of TRANSLATIONS) {
      const text = corpora[t].get(e.ref);
      if (text === undefined) {
        fail(`${set.category}/${e.id}: ${e.ref} is not a single verse in the ${t.toUpperCase()}`);
        continue;
      }
      if (!keywords.some((k) => containsWord(text, k))) fail(`${set.category}/${e.id}: ${e.ref} (${t.toUpperCase()}) contains none of ${keywords.join(", ")}: "${text}"`);
    }
    if (corpora.web.get(e.ref)) verses[e.ref] = corpora.web.get(e.ref);
  }

  for (const q of set.questions) {
    for (const id of [...q.yes, ...(q.unknown ?? [])]) if (!idSet.has(id)) fail(`${set.category}/${q.id}: unknown entry "${id}"`);
    for (const id of q.yes) if (q.unknown?.includes(id)) fail(`${set.category}/${q.id}: "${id}" is both Yes and Not stated`);
    if (!set.groups.includes(q.group)) fail(`${set.category}/${q.id}: group "${q.group}" not in groups`);
  }
  if (new Set(set.questions.map((q) => q.id)).size !== set.questions.length) fail(`${set.category}: duplicate question id`);

  // ---------------------------------------------------------------- category-specific facts
  const Q = Object.fromEntries(set.questions.map((q) => [q.id, q]));
  if (set.category === "people") {
    for (const id of ids) {
      const inOt = Q.ot.yes.includes(id);
      const inNt = Q.nt.yes.includes(id);
      if (inOt === inNt) fail(`people/${id}: must be in exactly one of "ot" / "nt"`);
    }
  }
  if (set.category === "places") {
    const FOLD = { city: "city", region: "region", province: "region", nation: "region", sea: "sea", river: "river", mountain: "mountain", island: "island" };
    for (const id of ids) {
      const rec = records.place.get(id);
      if (rec && FOLD[rec.category] !== places.KIND[id]) fail(`places/${id}: KIND ${places.KIND[id]} but locations.ts says ${rec.category}`);
    }
    if (Object.keys(places.KIND).length !== ids.length) fail(`places: KIND has ${Object.keys(places.KIND).length} ids, entries ${ids.length}`);
    // Names each place goes by in the three translations (beyond its own name).
    const ALSO = {
      "sea-of-galilee": ["sea of Galilee", "sea of Tiberias", "lake of Gennesaret", "Chinnereth", "Chinneroth", "Kinnereth"],
      judea: ["Judea", "Judaea", "Judah"],
      "dead-sea": ["Salt Sea", "sea of the Arabah", "sea of the plain", "east sea"],
      "red-sea": ["Red Sea"],
      "mount-of-olives": ["Mount of Olives", "Olivet"],
      "mount-sinai": ["Sinai"],
      "mount-nebo": ["Nebo"],
      "mount-carmel": ["Carmel"],
      "mount-gilboa": ["Gilboa"],
      "jordan-river": ["Jordan"],
      "antioch-syria": ["Antioch"],
      susa: ["Susa", "Shushan"],
      malta: ["Malta", "Melita"],
      sidon: ["Sidon", "Zidon"],
      shechem: ["Shechem", "Sichem", "Sychem"],
      haran: ["Haran", "Charran"],
      bethel: ["Bethel", "Beth-el"],
      beersheba: ["Beersheba", "Beer-sheba"],
      laodicea: ["Laodicea", "Laodiceans"],
    };
    const otEnd = corpora.books.indexOf("Matthew");
    const present = (names, testament) => {
      for (const t of TRANSLATIONS) {
        for (const r of corpora.order) {
          const nt = corpora.books.indexOf(r.book) >= otEnd;
          if (nt !== (testament === "nt")) continue;
          const text = corpora[t].get(r.key);
          if (!text) continue;
          for (const n of names) {
            const re = n.includes(" ") ? new RegExp(`(^|[^A-Za-z])${esc(n)}([^A-Za-z]|$)`, "i") : new RegExp(`(^|[^A-Za-z])${esc(n)}([^A-Za-z]|$)`);
            if (re.test(text)) return `${t.toUpperCase()} ${r.key}`;
          }
        }
      }
      return null;
    };
    for (const e of set.entries) {
      const names = ALSO[e.id] ?? [e.name.split(/[ (]/)[0]];
      for (const [qid, testament] of [["in-ot", "ot"], ["in-nt", "nt"]]) {
        const ans = tq.answerFor(Q[qid], e.id);
        if (ans === "unknown") continue;
        const hit = present(names, testament);
        if (ans === "yes" && !hit) fail(`places/${e.id}: "${qid}" is Yes but no ${testament.toUpperCase()} verse in any translation names ${names.join("/")}`);
        if (ans === "no" && hit) fail(`places/${e.id}: "${qid}" is No but ${hit} names it`);
      }
    }
  }

  // ---------------------------------------------------------------- reachability
  const sizes = [];
  for (const target of ids) {
    let rest = ids.filter((x) => x !== target);
    const used = [];
    while (rest.length) {
      let best = null;
      let bestRuled = [];
      for (const q of set.questions) {
        if (used.includes(q.id)) continue;
        const mine = tq.answerFor(q, target);
        if (mine === "unknown") continue;
        const ruled = rest.filter((o) => {
          const theirs = tq.answerFor(q, o);
          return theirs !== "unknown" && theirs !== mine;
        });
        if (ruled.length > bestRuled.length) {
          best = q;
          bestRuled = ruled;
        }
      }
      if (!best) {
        fail(`${set.category}/${target}: cannot be told apart from ${rest.join(", ")} by any question`);
        break;
      }
      used.push(best.id);
      rest = rest.filter((o) => !bestRuled.includes(o));
    }
    sizes.push([target, used.length]);
  }
  // Blind play: a player who does not know the answer asks, each turn, the unasked question that
  // splits the people still possible most evenly, is answered truthfully for the target, and keeps
  // everyone the answer does not rule out (a Not stated answer, on either side, rules no one out).
  // When one candidate is left they guess it. Asking plus that one guess must fit in 20.
  const blind = [];
  for (const target of ids) {
    let cands = [...ids];
    const asked = new Set();
    while (cands.length > 1) {
      let best = null;
      let bestScore = 0;
      for (const q of set.questions) {
        if (asked.has(q.id)) continue;
        const yes = cands.filter((c) => tq.answerFor(q, c) === "yes").length;
        const no = cands.filter((c) => tq.answerFor(q, c) === "no").length;
        const score = Math.min(yes, no);
        if (score > bestScore) {
          best = q;
          bestScore = score;
        }
      }
      if (!best) break;
      asked.add(best.id);
      const ans = tq.answerFor(best, target);
      if (ans !== "unknown") cands = cands.filter((c) => {
        const theirs = tq.answerFor(best, c);
        return theirs === "unknown" || theirs === ans;
      });
    }
    const cost = asked.size + 1;
    if (cands.length !== 1 || cands[0] !== target) fail(`${set.category}/${target}: blind play ends with ${cands.length} candidates (${cands.slice(0, 5).join(", ")})`);
    else if (cost > LIMIT) fail(`${set.category}/${target}: blind play needs ${asked.size} questions and a guess (> ${LIMIT})`);
    blind.push([target, cost]);
  }
  const blindWorst = blind.reduce((a, b) => (b[1] > a[1] ? b : a));
  const worst = sizes.reduce((a, b) => (b[1] > a[1] ? b : a));
  for (const [id, n] of sizes) if (n > LIMIT) fail(`${set.category}/${id}: needs ${n} questions (> ${LIMIT})`);
  report.push(
    `${set.label}: ${ids.length} entries, ${set.questions.length} questions. Shortest distinguishing set: ${worst[1]} at worst (${worst[0]}). ` +
      `Blind play (best even split each turn, then one guess): ${blindWorst[1]} turns at worst (${blindWorst[0]}), ${(blind.reduce((a, b) => a + b[1], 0) / blind.length).toFixed(1)} on average`
  );
}

const body = `/* GENERATED by scripts/games-data/twenty-questions.mjs — do not edit by hand; rerun the script.
 * World English Bible text (public domain) of every 20 Questions reveal verse. */

export const TQ_VERSES: Record<string, string> = ${JSON.stringify(Object.fromEntries(Object.entries(verses).sort()), null, 1)};
`;

console.log(report.join("\n"));
if (check) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== body) fail(`${path.relative(REPO_ROOT, OUT)} is out of date — rerun without --check`);
} else if (!problems.length) {
  fs.writeFileSync(OUT, body);
}
if (problems.length) {
  console.error(`FAIL (${problems.length})\n` + problems.join("\n"));
  process.exit(1);
}
console.log("twenty-questions: OK");
