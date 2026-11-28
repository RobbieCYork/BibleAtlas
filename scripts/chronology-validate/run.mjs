#!/usr/bin/env node
/**
 * Is every Chronology round fair? Runs inside `vite build` and by hand:
 *
 *   npm run validate:chronology            check; exit 0 only if clean
 *   node scripts/chronology-validate/run.mjs --report     also print pool sizes and sample rounds
 *
 * The rules (src/data/chronologyPool.ts explains why each exists):
 *   1. every card names a real timeline event, once;
 *   2. inside the Bible's story, any two cards that may share a round are listed in an order that
 *      agrees with their years, so the answer key is never wrong;
 *   3. no card title gives its date away;
 *   4. Beginner and Easy deal only fame-1 cards, every neighbour at least two chapters (or 250
 *      years) apart, and every fame-1 card has a plain short title;
 *   5. no round, at any level, holds two cards that are tied (same year outside one story, a shared
 *      tie group) or two approximate dates outside the story less than 25 years apart; checked
 *      here independently of `canPair`, not by calling it;
 *   6. every category deals every level, thousands of times, without a miss.
 *
 * It bundles the data with rolldown, which strips types without checking them: it is NOT a build
 * check. `npm run build` is.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "rolldown";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const report = process.argv.includes("--report");
const faults = [];
const fault = (m) => faults.push(m);

const out = await build({ input: path.join(ROOT, "src/data/chronologyRounds.ts"), write: false, platform: "node", output: { format: "esm" }, logLevel: "silent" });
let m;
try {
  m = await import(`data:text/javascript;base64,${Buffer.from(out.output[0].code).toString("base64")}`);
} catch (e) {
  console.error(`chronology-validate: the deck would not load: ${e.message}`);
  process.exit(1);
}
const { CHRONOLOGY_DECK: deck, CHRONOLOGY_LEVELS: levels, CHRONOLOGY_CATEGORIES: categories, APPROX_MARGIN_YEARS: margin } = m;

// 1. Ids.
const seen = new Set();
for (const c of deck) {
  if (seen.has(c.id)) fault(`"${c.id}" is in the deck twice`);
  seen.add(c.id);
}

// 2. Story order agrees with years for every pair that may be dealt together.
const story = deck.filter((c) => c.seq !== null);
for (const a of story)
  for (const b of story)
    if (a.seq < b.seq && a.year > b.year && m.canPair(a, b))
      fault(`story order: "${a.title}" (${a.year}) is listed before "${b.title}" (${b.year}) and they can be dealt together; tie them or move one`);
// The answer key (`order`) must agree with the story sequence and with years wherever they decide.
for (const a of deck)
  for (const b of deck) {
    if (a.order >= b.order || !m.canPair(a, b)) continue;
    if (a.year > b.year) fault(`answer key: "${a.title}" sorts before "${b.title}" but is later`);
    if (a.seq !== null && b.seq !== null && a.seq > b.seq) fault(`answer key: "${a.title}" sorts before "${b.title}" against the story order`);
  }

// 3. and 4. Titles.
const YEARLIKE = /\b\d{3,4}\b|\b(BC|AD|BCE|CE)\b|\bc\.\s/;
for (const c of deck) {
  if (YEARLIKE.test(c.title)) fault(`title gives the date away: "${c.title}" (${c.id})`);
  if (c.fame === 1 && c.title.length > 42) fault(`fame-1 title is not short: "${c.title}" (${c.title.length} characters)`);
  if (!c.title.trim()) fault(`empty title: ${c.id}`);
}

// 5. Independent tie rules.
function independentFault(cards) {
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i], b = cards[j];
      if (a.ties.some((t) => b.ties.includes(t))) return `"${a.title}" and "${b.title}" share a tie group`;
      const inStory = a.seq !== null && b.seq !== null;
      if (!inStory && a.year === b.year) return `"${a.title}" and "${b.title}" share the year ${a.year}`;
      if (!inStory && !(a.firm && b.firm) && Math.abs(a.year - b.year) < margin) return `"${a.title}" and "${b.title}" are approximate and ${Math.abs(a.year - b.year)} years apart`;
      const early = (x, y) => x.debatedDating && y.seq === null && y.year < -1000;
      if (early(a, b) || early(b, a)) return `"${a.title}" and "${b.title}" hinge on early biblical chronology`;
    }
  return null;
}

// 6. Deal every category at every level.
let seed = 20261127;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const DEALS = report ? 3000 : 1500;
const rows = [];
const samples = {};
for (const cat of categories) {
  for (const level of levels) {
    const pool = m.deckFor(cat.key, level);
    const used = new Set();
    let misses = 0;
    for (let i = 0; i < DEALS; i++) {
      const r = m.dealDeckCards(cat.key, level, rand);
      if (!r) { misses++; continue; }
      r.forEach((c) => used.add(c.id));
      if (!m.isFairRound(r, level) || !m.meetsLevel(r, level)) fault(`${cat.label} / ${level.label}: dealt an unfair round`);
      const why = independentFault(r);
      if (why) fault(`${cat.label} / ${level.label}: ${why}`);
      if (level.maxFame === 1) {
        if (r.some((c) => c.fame !== 1)) fault(`${cat.label} / ${level.label}: dealt a card that is not fame 1`);
        const s = [...r].sort((a, b) => a.order - b.order);
        for (let k = 1; k < s.length; k++) if (m.distance(s[k - 1], s[k]) < 2) fault(`${cat.label} / ${level.label}: "${s[k - 1].title}" and "${s[k].title}" are too close for ${level.label}`);
      }
      if (cat.key !== "all" && r.some((c) => !c.cats.includes(cat.key))) fault(`${cat.label} / ${level.label}: dealt a card from outside the category`);
      if (i < 4) (samples[`${cat.key}/${level.key}`] ??= []).push([...r].sort((a, b) => a.order - b.order));
    }
    if (misses) fault(`${cat.label} / ${level.label}: ${misses} of ${DEALS} deals found no fair round`);
    if (used.size < level.cardCount * 2) fault(`${cat.label} / ${level.label}: only ${used.size} different cards ever dealt; too little variety`);
    rows.push({ cat: cat.label, level: level.label, pool: pool.length, used: used.size });
  }
}

if (report) {
  console.log("category\tlevel\tpool\tcards seen in deals");
  for (const r of rows) console.log(`${r.cat}\t${r.level}\t${r.pool}\t${r.used}`);
  for (const [k, list] of Object.entries(samples)) {
    console.log(`\n${k}`);
    for (const r of list) console.log("  " + r.map((c) => `${c.title} [${c.event.dateLabel}]`).join("  >  "));
  }
}

if (faults.length) {
  const unique = [...new Set(faults)];
  console.error(`chronology-validate: ${unique.length} problem${unique.length === 1 ? "" : "s"}`);
  for (const f of unique.slice(0, 60)) console.error(`  - ${f}`);
  process.exit(1);
}
if (!quiet) console.log(`chronology-validate: ok (${deck.length} cards, ${categories.length} categories x ${levels.length} levels, ${DEALS} deals each)`);
