/**
 * Daily Name, played from the real built app: a daily WIN and a daily LOSS (storage cleared in
 * between), a practice win and a practice loss, the physical keyboard, guess rejection, letter
 * marks against the real rules, device stats, the spoiler-free share text, and the reveal's
 * article link. Run at both widths:
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/daily-name.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/daily-name.mjs
 * Answers come from the same modules the game reads (bundled with rolldown).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { MENU_BUTTON } from "../lib/app.mjs";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../../../src");

async function load(rel) {
  const dir = mkdtempSync(join(tmpdir(), "dn-harness."));
  const bundle = await rolldown({ input: join(SRC, rel), logLevel: "silent" });
  await bundle.write({ file: join(dir, "m.mjs"), format: "esm" });
  const mod = await import(pathToFileURL(join(dir, "m.mjs")).href);
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

export default async function (h) {
  const dn = await load("lib/dailyName.ts");
  const data = await load("data/dailyName.ts");
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = phone ? "phone" : "desktop";
  const shot = (name) => h.screenshot(`daily-name-${name}-${dev}.png`);

  // Same machine, same timezone as the browser.
  const todayKey = dn.localDateKey();
  const number = dn.puzzleNumber(todayKey);
  const answer = dn.answerForPuzzle(number);
  // Wrong guesses of the right length, all accepted names.
  const wrong = data.DAILY_NAME_GUESSES.split(" ").filter((w) => w.length === answer.word.length && w !== answer.word).slice(0, 6);

  const openCenter = async () => {
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else {
      await h.click(MENU_BUTTON);
      await h.click({ css: ".panel-menu-link", text: "Games" });
    }
    await h.waitFor(".game-center-card");
  };
  const openDaily = async () => {
    await openCenter();
    await h.click({ css: ".game-center-card", text: "Daily Name" });
    await h.waitFor({ css: ".game-header h2", text: "Daily Name" });
    await h.click({ css: ".game-entry-card", text: "Play solo" });
    await h.waitFor({ css: ".game-entry-card", text: "Today's name" });
  };
  /** Type with the on-screen keys. */
  const tapWord = async (w) => {
    for (const ch of w) await h.click(`.dn-key[aria-label^="${ch}"]`);
    await h.click({ css: ".dn-key", text: "Enter" });
  };
  /** Type with the physical keyboard: one keydown on the window per key, each its own task, as a
   * real keyboard delivers them (the game listens on the window). */
  const key = (k) => h.evaluate((x) => window.dispatchEvent(new KeyboardEvent("keydown", { key: x, bubbles: true })), k);
  const keyWord = async (w) => {
    for (const k of [...w.toLowerCase(), "Enter"]) await key(k);
    await h.sleep(60);
  };
  const rowMarks = (r) =>
    h.evaluate((i) => [...document.querySelectorAll(".dn-row")[i].querySelectorAll(".dn-tile")].map((t) => (t.className.match(/dn-(right|elsewhere|absent)/) ?? [])[1] ?? null), r);
  const sound = async (name) => {
    const r = await h.evaluate(() => {
      const body = document.querySelector(".game-mode .game-body");
      const wide = [];
      for (const el of document.querySelectorAll(".game-mode button, .game-mode .dn-tile, .game-mode p, .game-mode h2, .game-mode h3")) {
        const b = el.getBoundingClientRect();
        if (b.width && (b.left < -0.5 || b.right > innerWidth + 0.5)) wide.push(`${el.tagName}.${el.className}`.slice(0, 50));
      }
      return { sideways: Math.max(body.scrollWidth - body.clientWidth, document.documentElement.scrollWidth - innerWidth), wide: wide.slice(0, 4) };
    });
    h.assert(r.sideways <= 0 && !r.wide.length, `${name}: nothing off-screen ${r.sideways <= 0 && !r.wide.length ? "" : JSON.stringify(r)}`);
    await shot(name);
  };

  h.section(`Entry (${dev}) — puzzle #${number}, ${answer.word.length} letters`);
  await h.evaluate(() => localStorage.removeItem("daily-name-v1"));
  await openCenter();
  const cards = await h.evaluate(() => [...document.querySelectorAll(".game-center-card-title")].map((e) => e.childNodes[0].textContent.trim()));
  h.assert(cards.includes("Daily Name"), `Game Center lists Daily Name (${cards.join(", ")})`);
  await h.click({ css: ".game-center-card", text: "Daily Name" });
  await h.waitFor(".game-entry-card");
  const entry = await h.evaluate(() => [...document.querySelectorAll(".game-entry-card .game-center-card-title")].map((e) => e.textContent.trim()));
  h.assert(JSON.stringify(entry) === JSON.stringify(["Play solo"]), `first screen is Play solo only (${entry.join(", ")})`);
  h.assert(await h.exists('.game-root[data-page-bg="game-setup"]'), "entry screen carries the game-setup background");
  await sound("entry");
  await h.click({ css: ".game-entry-card", text: "Play solo" });
  await h.waitFor({ css: ".game-entry-card", text: "Practice" });
  h.assert((await h.text({ css: ".game-entry-card", text: "Today's name" })).includes(`#${number}`), `menu offers today's name #${number}`);
  await sound("menu");

  h.section("Daily — WIN");
  await h.click({ css: ".game-entry-card", text: "Today's name" });
  await h.waitFor(".dn-board");
  h.assert((await h.count(".dn-row")) === 6 && (await h.count(".dn-row:first-child .dn-tile")) === answer.word.length, `6 rows of ${answer.word.length} tiles`);
  await sound("board-empty");
  // A word that is not a name is refused and costs nothing.
  await keyWord("Q".repeat(answer.word.length));
  h.assert(/isn't in the list of Bible names/.test(await h.text(".dn-message")), `non-name refused: "${await h.text(".dn-message")}"`);
  for (let i = 0; i < answer.word.length; i++) await key("Backspace");
  h.assert(!(await h.evaluate(() => document.querySelector(".dn-row").textContent.trim())), "Backspace clears the row");
  // Guess 1 on the on-screen keyboard, guess 2 on the physical one.
  await tapWord(wrong[0]);
  h.assert(JSON.stringify(await rowMarks(0)) === JSON.stringify(dn.markGuess(wrong[0], answer.word)), `on-screen keys: ${wrong[0]} marked as the rules say (${(await rowMarks(0)).join(",")})`);
  await keyWord(wrong[1]);
  h.assert(JSON.stringify(await rowMarks(1)) === JSON.stringify(dn.markGuess(wrong[1], answer.word)), `physical keyboard: ${wrong[1]} marked as the rules say`);
  const labels = await h.evaluate(() => [...document.querySelectorAll(".dn-row")[0].querySelectorAll(".dn-tile")].map((t) => t.getAttribute("aria-label")));
  h.assert(labels.every((l) => /, (right spot|in the name, wrong spot|not in the name)$/.test(l)), `every marked tile names its mark for screen readers (${labels[0]})`);
  const shapes = await h.evaluate(() => {
    const s = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).borderStyle : null; };
    return { right: s(".dn-legend .dn-right"), elsewhere: s(".dn-legend .dn-elsewhere"), absent: s(".dn-legend .dn-absent") };
  });
  h.assert(shapes.elsewhere === "dashed" && shapes.right === "solid", `marks differ in shape, not just colour (frames: ${JSON.stringify(shapes)})`);
  await sound("board-two-guesses");
  await keyWord(answer.word);
  await h.waitFor(".dn-result");
  h.assert((await h.text(".dn-result h3")).startsWith("Solved in 3"), `solved in 3: "${await h.text(".dn-result h3")}"`);
  h.assert((await h.text(".dn-answer")).includes(answer.label), `reveal names ${answer.label}`);
  h.assert((await h.text(".dn-verse figcaption")).startsWith(answer.ref) && (await h.text(".dn-verse blockquote")) === answer.text, `reveal shows ${answer.ref} with its WEB text`);
  const stats = await h.evaluate(() => [...document.querySelectorAll(".dn-stats-row dd")].map((d) => d.textContent));
  h.assert(JSON.stringify(stats) === JSON.stringify(["1", "100%", "1", "1"]), `stats played 1, won 100%, streak 1, best 1 (${stats.join(", ")})`);
  await h.evaluate(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
  await h.click({ css: ".dn-actions button", text: "Share result" });
  await h.sleep(200);
  const shared = await h.evaluate(() => document.querySelector(".dn-share-fallback")?.textContent ?? null);
  const note = await h.text(".dn-share-note");
  h.assert(!!note, `share gives feedback: "${note}"`);
  if (shared) h.assert(shared.includes(`#${number}`) && !shared.includes(answer.word) && !/[A-Z]{3,}/.test(shared.replace(/Capstone Bible|Daily Name/g, "")), "share text: puzzle number, no letters");
  await sound("won");
  await h.reload();
  await h.sleep(800);
  await openDaily();
  h.assert(/Solved/.test(await h.text({ css: ".game-entry-card", text: "Today's name" })), "after a reload the menu remembers today is solved");
  await h.click({ css: ".game-entry-card", text: "Today's name" });
  await h.waitFor(".dn-result");
  h.assert(true, "re-opening today's game goes straight to the result");
  await h.click({ css: ".dn-actions button", text: "Read about" });
  await h.sleep(500);
  h.assert(!(await h.exists(".game-mode")), "Read about … leaves Games mode");
  const heading = await h.evaluate((name) => [...document.querySelectorAll("h1, h2")].some((e) => e.textContent.includes(name)), answer.label.split(",")[0]);
  h.assert(heading, `and opens the ${answer.label} article`);
  await h.screenshot(`daily-name-article-${dev}.png`);

  h.section("Daily — LOSS (fresh device storage)");
  await h.evaluate(() => localStorage.removeItem("daily-name-v1"));
  await h.reload();
  await h.sleep(800);
  await openDaily();
  await h.click({ css: ".game-entry-card", text: "Today's name" });
  await h.waitFor(".dn-board");
  for (const w of wrong) await keyWord(w);
  await h.waitFor(".dn-result");
  h.assert((await h.text(".dn-result h3")) === "Not this time.", "six misses end the game");
  h.assert((await h.text(".dn-answer")).includes(answer.label), `the answer is still revealed (${answer.label})`);
  const lost = await h.evaluate(() => [...document.querySelectorAll(".dn-stats-row dd")].map((d) => d.textContent));
  h.assert(JSON.stringify(lost) === JSON.stringify(["1", "0%", "0", "0"]), `stats played 1, won 0%, streak 0 (${lost.join(", ")})`);
  await sound("lost");

  h.section("Practice — win and loss, stats untouched");
  // Practice picks pool[floor(random * n)]; pin Math.random so the word is known.
  const pool = data.DAILY_NAME_ANSWERS.filter((a) => a.word !== answer.word);
  await h.evaluate(() => { Math.random = () => 0; });
  await h.click({ css: ".dn-actions button", text: "Practice" });
  await h.waitFor(".dn-board");
  h.assert((await h.text(".dn-status")).startsWith("Practice"), "practice board");
  await keyWord(pool[0].word);
  await h.waitFor(".dn-result");
  h.assert((await h.text(".dn-result h3")).startsWith("Solved in 1") && (await h.text(".dn-answer")).includes(pool[0].label), `practice win: ${pool[0].word}`);
  h.assert(!(await h.exists(".dn-stats")), "practice result shows no daily stats");
  await h.click({ css: ".dn-actions button", text: "Another practice name" });
  await h.waitFor(".dn-board");
  const pw = data.DAILY_NAME_GUESSES.split(" ").filter((w) => w.length === pool[0].word.length && w !== pool[0].word).slice(0, 6);
  for (const w of pw) await keyWord(w);
  await h.waitFor(".dn-result");
  h.assert((await h.text(".dn-result h3")) === "Not this time.", "practice loss after six misses");
  await sound("practice-lost");
  await h.click(".game-header button");
  await h.waitFor(".dn-stats");
  const after = await h.evaluate(() => [...document.querySelectorAll(".dn-stats-row dd")].map((d) => d.textContent));
  h.assert(JSON.stringify(after) === JSON.stringify(lost), `practice never touched the stats (${after.join(", ")})`);
}
