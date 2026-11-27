/**
 * 20 Questions, played from the real built app: a WIN in People, a LOSS in Places (all twenty
 * questions, then a wrong last guess), a win in Things after a wrong guess (which must cost one
 * question), Surprise me, the search and the category chips, answers checked against the data
 * module, the reveal's verse and article link, and the device record. Run at both widths:
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/twenty-questions.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/twenty-questions.mjs
 * The secret is chosen with Math.random, which is pinned here so the answer is known.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { MENU_BUTTON } from "../lib/app.mjs";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../../../src");

async function load(rel) {
  const dir = mkdtempSync(join(tmpdir(), "tq-harness."));
  const bundle = await rolldown({ input: join(SRC, rel), logLevel: "silent" });
  await bundle.write({ file: join(dir, "m.mjs"), format: "esm" });
  const mod = await import(pathToFileURL(join(dir, "m.mjs")).href);
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

const LABEL = { yes: "Yes", no: "No", unknown: "Not stated" };

export default async function (h) {
  const tq = await load("data/twentyQuestions/index.ts");
  const verses = (await load("data/twentyQuestionsVerses.ts")).TQ_VERSES;
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = phone ? "phone" : "desktop";
  const shot = (name) => h.screenshot(`twenty-questions-${name}-${dev}.png`);

  const openCenter = async () => {
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else {
      await h.click(MENU_BUTTON);
      await h.click({ css: ".panel-menu-link", text: "Games" });
    }
    await h.waitFor(".game-center-card");
  };
  /** Fresh page, Math.random pinned to `r`, through Play solo to the category screen. */
  const toMenu = async (r) => {
    await h.reload();
    await h.sleep(800);
    await h.evaluate((x) => { Math.random = () => x; }, r);
    await openCenter();
    await h.click({ css: ".game-center-card", text: "20 Questions" });
    await h.waitFor({ css: ".game-header h2", text: "20 Questions" });
    await h.click({ css: ".game-entry-card", text: "Play solo" });
    await h.waitFor('input[name="tq-category"]');
  };
  const startCat = async (cat) => {
    await h.click(`input[name="tq-category"][value="${cat}"]`);
    await h.click(".game-start-button");
    await h.waitFor(".tq-hud");
  };
  const left = () => h.text(".tq-hud-left");
  const lastTurn = () => h.evaluate(() => {
    const li = [...document.querySelectorAll(".tq-turn")].pop();
    return li ? { text: li.querySelector(".tq-turn-text").textContent, answer: li.querySelector(".tq-answer").textContent.replace(/[✓✕–]/g, "").trim() } : null;
  });
  const askText = async (text) => {
    await h.click({ css: ".tq-question", text });
  };
  const guess = async (name) => {
    if (await h.exists(".tq-guess-open")) await h.click(".tq-guess-open");
    await h.type(".tq-guess .tq-search", name);
    await h.click({ css: ".tq-guess-option", text: name });
    await h.click({ css: ".tq-guess-actions .games-primary-button", text: "Guess:" });
  };
  const sound = async (name) => {
    const r = await h.evaluate(() => {
      const body = document.querySelector(".game-mode .game-body");
      const wide = [];
      for (const el of document.querySelectorAll(".game-mode button, .game-mode input, .game-mode li, .game-mode p, .game-mode h3")) {
        const b = el.getBoundingClientRect();
        if (b.width && (b.left < -0.5 || b.right > innerWidth + 0.5)) wide.push(`${el.tagName}.${el.className}`.slice(0, 50));
      }
      return { sideways: Math.max(body.scrollWidth - body.clientWidth, document.documentElement.scrollWidth - innerWidth), wide: wide.slice(0, 4) };
    });
    h.assert(r.sideways <= 0 && !r.wide.length, `${name}: nothing off-screen ${r.sideways <= 0 && !r.wide.length ? "" : JSON.stringify(r)}`);
    await shot(name);
  };

  // ---------------------------------------------------------------- People: WIN
  h.section(`People — win (${dev})`);
  await h.evaluate(() => localStorage.removeItem("twenty-questions-v1"));
  await toMenu(0);
  const entry = await h.evaluate(() => [...document.querySelectorAll(".game-entry-card .game-center-card-title")].map((e) => e.textContent.trim()));
  h.assert(entry.length === 0, "category screen (Play solo already chosen)");
  h.assert(await h.exists('.game-root[data-page-bg="game-setup"]'), "setup screen carries the game-setup background");
  const cats = await h.evaluate(() => [...document.querySelectorAll(".game-level-option .game-center-card-title")].map((e) => e.textContent));
  h.assert(JSON.stringify(cats) === JSON.stringify(["People", "Places", "Things", "Surprise me"]), `categories: ${cats.join(", ")}`);
  await sound("menu");
  await startCat("people");
  const people = tq.TQ_SETS.people;
  const secret = people.entries[0]; // Math.random() = 0
  h.assert((await left()) === "20 of 20 questions left", `starts with 20 (${await left()})`);
  await sound("people-start");
  // Ask five questions from different groups; each answer must match the data module.
  for (const qid of ["woman", "ot", "king", "spouse", "nine-hundred"]) {
    const q = people.questions.find((x) => x.id === qid);
    await askText(q.text);
    const t = await lastTurn();
    h.assert(t.text === q.text && t.answer === LABEL[tq.answerFor(q, secret.id)], `"${q.text}" → ${t.answer} (data says ${LABEL[tq.answerFor(q, secret.id)]})`);
    h.assert((await h.text(".tq-last")) === `${q.text} ${LABEL[tq.answerFor(q, secret.id)]}.`, "the answer is repeated beside the question list");
  }
  h.assert((await left()) === "15 of 20 questions left", `five asked, 15 left (${await left()})`);
  h.assert(!(await h.exists({ css: ".tq-question", text: "Is this person a woman?" })), "an asked question leaves the list");
  // Search and chips filter the list.
  await h.type(".tq-ask .tq-search", "egypt");
  const found = await h.evaluate(() => [...document.querySelectorAll(".tq-question-text")].map((e) => e.textContent));
  h.assert(found.length >= 1 && found.every((t) => /egypt/i.test(t)), `search "egypt": ${found.join(" | ")}`);
  // Clear the field the way React sees a user do it (native setter + input event).
  await h.evaluate(() => {
    const el = document.querySelector(".tq-ask .tq-search");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await h.click({ css: ".tq-chip", text: "Family" });
  const fam = await h.evaluate(() => [...document.querySelectorAll(".tq-question-group")].map((e) => e.textContent));
  h.assert(fam.length > 0 && fam.every((g) => g === "Family"), `Family chip shows only Family questions (${fam.length})`);
  await sound("people-asked");
  await guess(secret.name);
  await h.waitFor(".tq-reveal");
  h.assert((await h.text(".tq-reveal h3")) === "Got it, with 5 of 20 questions used!", `win: "${await h.text(".tq-reveal h3")}"`);
  h.assert((await h.text(".tq-reveal-name")).includes(secret.name), `reveal names ${secret.name}`);
  h.assert((await h.text(".tq-verse blockquote")) === verses[secret.ref] && (await h.text(".tq-verse figcaption")).startsWith(secret.ref), `reveal verse ${secret.ref}, WEB text`);
  await sound("people-won");
  await h.click({ css: ".tq-actions button", text: "Read about" });
  await h.sleep(500);
  h.assert(!(await h.exists(".game-mode")), "Read about … leaves Games mode");
  h.assert(await h.evaluate((n) => [...document.querySelectorAll("h1, h2")].some((e) => e.textContent.includes(n)), secret.name), `and opens the ${secret.name} article`);

  // ---------------------------------------------------------------- Places: LOSS
  h.section("Places — loss (twenty questions, then a wrong last guess)");
  const places = tq.TQ_SETS.places;
  const pSecret = places.entries[0];
  await toMenu(0);
  await startCat("places");
  const twenty = places.questions.slice(0, 20);
  for (const q of twenty) await askText(q.text);
  const answers = await h.evaluate(() => [...document.querySelectorAll(".tq-turn .tq-answer")].map((e) => e.textContent.replace(/[✓✕–]/g, "").trim()));
  h.assert(JSON.stringify(answers) === JSON.stringify(twenty.map((q) => LABEL[tq.answerFor(q, pSecret.id)])), `all 20 answers match the data for ${pSecret.name}`);
  h.assert((await left()) === "No questions left — one last guess", `after 20: "${await left()}"`);
  h.assert(!(await h.exists(".tq-ask")), "the question list is gone");
  h.assert(await h.exists({ css: ".tq-guess-card h3", text: "Your last guess" }), "the last guess is offered");
  await sound("places-last-guess");
  const wrongPlace = places.entries.find((e) => e.id !== pSecret.id);
  await guess(wrongPlace.name);
  await h.waitFor(".tq-reveal");
  h.assert((await h.text(".tq-reveal h3")) === "Out of questions.", "a wrong last guess loses");
  h.assert((await h.text(".tq-reveal-name")).includes(pSecret.name), `the answer is revealed (${pSecret.name})`);
  await sound("places-lost");

  // ---------------------------------------------------------------- Things: wrong guess costs one, then win
  h.section("Things — a wrong guess costs a question, then a win");
  const things = tq.TQ_SETS.things;
  const tSecret = things.entries[0];
  await toMenu(0);
  await startCat("things");
  const tq1 = things.questions.find((q) => q.id === "alive");
  await askText(tq1.text);
  h.assert((await lastTurn()).answer === LABEL[tq.answerFor(tq1, tSecret.id)], `"${tq1.text}" → ${(await lastTurn()).answer}`);
  const wrongThing = things.entries.find((e) => e.id !== tSecret.id);
  await guess(wrongThing.name);
  const wt = await lastTurn();
  h.assert(wt.text === `Is it ${wrongThing.name.replace(/^The /, "the ")}?` && wt.answer === "No", `wrong guess recorded: ${wt.text} ${wt.answer}`);
  h.assert((await left()) === "18 of 20 questions left", `one question + one wrong guess = 18 left (${await left()})`);
  await sound("things-wrong-guess");
  await guess(tSecret.name);
  await h.waitFor(".tq-reveal");
  h.assert((await h.text(".tq-reveal h3")) === "Got it, with 2 of 20 questions used!", `win: "${await h.text(".tq-reveal h3")}"`);
  const art = tSecret.article;
  if (art) h.assert(await h.exists({ css: ".tq-actions button", text: `Read about ${art.label}` }), `links ${art.kind}:${art.id}`);

  // ---------------------------------------------------------------- Surprise me + record
  h.section("Surprise me, and the device record");
  await toMenu(0.5);
  await startCat("any");
  const hud = await h.text(".tq-hud-cat");
  h.assert(/People|Places|Things/.test(hud), `Surprise me names its category: "${hud}"`);
  await h.click(".game-header button");
  await h.waitFor(".tq-stats-table");
  const rows = await h.evaluate(() => [...document.querySelectorAll(".tq-stats-table tbody tr")].map((r) => [...r.children].map((c) => c.textContent)));
  h.assert(JSON.stringify(rows) === JSON.stringify([["People", "1", "1", "5"], ["Places", "0", "1", "—"], ["Things", "1", "1", "2"]]), `record: ${JSON.stringify(rows)}`);
  await sound("record");
}
