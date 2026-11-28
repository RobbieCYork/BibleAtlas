// Tests the Daily Name rules in src/lib/dailyName.ts — the real module, bundled with rolldown.
//     node scripts/games-data/daily-name-rules.mjs
// Letter marks (including repeated letters), the date -> puzzle -> answer schedule, guess
// acceptance, stats and streaks, and that a shared result never contains a letter of the answer.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { REPO_ROOT } from "./lib.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dn-rules-"));
const b = await rolldown({ input: path.join(REPO_ROOT, "src/lib/dailyName.ts"), logLevel: "silent" });
await b.write({ file: path.join(dir, "m.mjs"), format: "esm" });
await b.close();
const dn = await import(pathToFileURL(path.join(dir, "m.mjs")).href);
const data = await (async () => {
  const b2 = await rolldown({ input: path.join(REPO_ROOT, "src/data/dailyName.ts"), logLevel: "silent" });
  await b2.write({ file: path.join(dir, "d.mjs"), format: "esm" });
  await b2.close();
  return import(pathToFileURL(path.join(dir, "d.mjs")).href);
})();
fs.rmSync(dir, { recursive: true, force: true });

let failed = 0;
let passed = 0;
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else {
    failed++;
    console.error(`FAIL ${what}\n  expected ${e}\n  actual   ${a}`);
  }
};
const R = "right", E = "elsewhere", A = "absent";

// ---------------------------------------------------------------- marks
eq(dn.markGuess("MOSES", "MOSES"), [R, R, R, R, R], "exact match");
// Repeated letters: only as many marks as the answer has copies.
eq(dn.markGuess("ANNA", "NOAH"), [E, E, A, A], "ANNA vs NOAH — one A, one N");
eq(dn.markGuess("AARON", "SARAH"), [E, R, R, A, A], "AARON vs SARAH — right-spot A claimed first, second A elsewhere");
eq(dn.markGuess("ESTHER", "HEBREW"), [E, A, A, E, R, E], "ESTHER vs HEBREW — HEBREW's second E is the right-spot one, its first is still spare");
eq(dn.markGuess("EEEEE", "EGYPT"), [R, A, A, A, A], "five E against one E in the right spot: only that one marks");
eq(dn.markGuess("LLLLL", "ABELS").filter((m) => m !== A).length, 1, "five L against one L: one mark only");
eq(dn.markGuess("ELLEN", "LEVEL"), [E, E, E, R, A], "ELLEN vs LEVEL");
eq(dn.markGuess("SALES", "SEALS"), [R, E, E, E, R], "SALES vs SEALS");

// ---------------------------------------------------------------- schedule
eq(dn.puzzleNumber("2026-11-26"), 1, "launch day is #1");
eq(dn.puzzleNumber("2026-11-27"), 2, "next day is #2");
eq(dn.puzzleNumber("2025-01-01"), 1, "a clock set before launch still gets #1");
eq(dn.puzzleNumber("2027-03-15") - dn.puzzleNumber("2027-03-13"), 2, "US spring-forward weekend: still one number per day");
eq(dn.puzzleNumber("2027-11-08") - dn.puzzleNumber("2027-11-06"), 2, "US fall-back weekend: still one number per day");
const N = data.DAILY_NAME_ANSWERS.length;
const first = Array.from({ length: N }, (_, i) => dn.answerForPuzzle(i + 1).word);
eq(new Set(first).size, N, `the first ${N} days never repeat a name`);
eq(first, data.DAILY_NAME_ANSWERS.map((a) => a.word), "the first cycle runs in the generated (most familiar first) order");
const second = Array.from({ length: N }, (_, i) => dn.answerForPuzzle(N + i + 1).word);
eq(new Set(second).size, N, "the second cycle also uses every name exactly once");
eq(second.join() !== first.join(), true, "the second cycle is in a different order");
// Issued puzzles never change (PINNED in daily-name-curation.mjs). #1-#3 were played 2026-11-26..28.
eq([1, 2, 3, 4].map((n) => dn.answerForPuzzle(n).word), ["DAVID", "JESUS", "MOSES", "JERUSALEM"], "issued puzzles #1-#4 keep their answers");
eq(dn.answerForPuzzle(N + 7).word, dn.answerForPuzzle(N + 7).word, "the schedule is deterministic");
eq(data.DAILY_NAME_ANSWERS.every((a) => /^[A-Z]{4,9}$/.test(a.word)), true, "every answer is 4-9 capital letters");
eq(data.DAILY_NAME_ANSWERS.every((a) => dn.isAcceptedGuess(a.word)), true, "every answer is an accepted guess");
eq([dn.isAcceptedGuess("moses"), dn.isAcceptedGuess("GOLIATH"), dn.isAcceptedGuess("HOUSE"), dn.isAcceptedGuess("QQQQ")], [true, true, false, false], "guess list: names in, ordinary words and nonsense out");

// ---------------------------------------------------------------- stats
const day = (w, ...g) => ({ word: w, guesses: g });
const days = {
  "2026-11-26": day("DAVID", "MOSES", "DAVID"),
  "2026-11-27": day("JESUS", "JESUS"),
  "2026-11-28": day("MOSES", "AARON", "ISAAC", "JACOB", "SARAH", "NAOMI", "DINAH"),
  "2026-11-29": day("EGYPT", "EGYPT"),
  "2026-11-30": day("JACOB", "ISAAC", "JACOB"),
};
let s = dn.computeStats(days, "2026-11-30");
eq([s.played, s.won, s.currentStreak, s.maxStreak, s.distribution], [5, 4, 2, 2, [2, 2, 0, 0, 0, 0]], "played/won/streaks/distribution");
s = dn.computeStats(days, "2026-12-01");
eq(s.currentStreak, 2, "today not played yet: yesterday's streak still stands");
s = dn.computeStats(days, "2026-12-02");
eq(s.currentStreak, 0, "a whole day missed: streak gone");
s = dn.computeStats({ ...days, "2026-12-01": day("RUTH", "ADAM") }, "2026-12-01");
eq([s.currentStreak, s.played], [2, 5], "a game in progress today neither counts nor breaks the streak");

// ---------------------------------------------------------------- share
const text = dn.shareText(3, day("MOSES", "AARON", "ISAAC", "MOSES"));
eq(/[A-Z]{2,}/.test(text.replace(/Capstone Bible|Daily Name|capstonebible\.com|X\/6/g, "")), false, "shared result carries no letters of any guess");
eq(text.split("\n")[0], "Capstone Bible · Daily Name #3 · 3/6", "share header");

console.log(`daily-name rules: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
