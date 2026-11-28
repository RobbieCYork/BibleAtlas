/**
 * Chronology's categories and levels, from the real built app (run at 390px and desktop):
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/chronology-categories.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/chronology-categories.mjs
 *
 * For every category the options step offers, at every level: the round has the level's card count;
 * every card belongs to the category and the level's fame grades; the round obeys the same fairness
 * rules the build-time validator checks; sorting it with the real ▲ buttons and checking scores it
 * Correct; a second round checked unsorted costs a life and shows the right order. Answers come from
 * src/data/chronologyRounds.ts, bundled with rolldown. Also the category text, a layout check and
 * screenshots of the setup screen and a checked Easy round.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { MENU_BUTTON } from "../lib/app.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "../../../src/data");
async function loadData(name) {
  const dir = mkdtempSync(join(tmpdir(), "games-data."));
  const bundle = await rolldown({ input: join(DATA, `${name}.ts`) });
  await bundle.write({ file: join(dir, "m.mjs"), format: "esm" });
  const mod = await import(pathToFileURL(join(dir, "m.mjs")).href);
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

export default async function (h) {
  const m = await loadData("chronologyRounds");
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = phone ? "phone" : "desktop";
  const byTitle = new Map(m.CHRONOLOGY_DECK.map((c) => [c.title, c]));
  h.assert(byTitle.size === m.CHRONOLOGY_DECK.length, `every card title is unique (${byTitle.size} of ${m.CHRONOLOGY_DECK.length})`);

  const openCenter = async () => {
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else {
      await h.click(MENU_BUTTON);
      await h.click({ css: ".panel-menu-link", text: "Games" });
    }
    await h.waitFor(".game-center-card");
  };
  const openSetup = async () => {
    await h.reload(); await h.sleep(900);
    await openCenter();
    await h.click({ css: ".game-center-card", text: "Chronology" });
    await h.click({ css: ".game-entry-card", text: "Play solo" });
    await h.waitFor(".chronology-category select");
  };
  const setCategory = (key) => h.evaluate((k) => {
    const s = document.querySelector(".chronology-category select");
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, k);
    s.dispatchEvent(new Event("change", { bubbles: true }));
  }, key);
  const titles = () => h.evaluate(() => [...document.querySelectorAll(".chronology-card-title")].map((e) => e.textContent));
  const layout = (name) => h.evaluate(() => {
    const body = document.querySelector(".game-body");
    return Math.max(body.scrollWidth - body.clientWidth, document.documentElement.scrollWidth - innerWidth);
  }).then((sideways) => h.assert(sideways <= 0, `${name}: nothing sideways (${sideways})`));

  h.section(`setup screen (${dev})`);
  await openSetup();
  const options = await h.evaluate(() => [...document.querySelectorAll(".chronology-category option")].map((o) => [o.value, o.textContent]));
  h.assert(JSON.stringify(options) === JSON.stringify(m.CHRONOLOGY_CATEGORIES.map((c) => [c.key, c.label])), `categories offered: ${options.map((o) => o[1]).join(", ")}`);
  for (const c of m.CHRONOLOGY_CATEGORIES) {
    await setCategory(c.key);
    const d = await h.text(".chronology-category .games-topic-description");
    h.assert(d === c.description, `${c.label}: description "${d}"`);
  }
  const levelLabels = await h.evaluate(() => [...document.querySelectorAll(".game-level-option .game-center-card-title")].map((e) => e.textContent));
  h.assert(JSON.stringify(levelLabels) === JSON.stringify(m.CHRONOLOGY_LEVELS.map((l) => l.label)), `levels: ${levelLabels.join(", ")}`);
  await setCategory("ot");
  await layout("setup");
  await h.screenshot(`chrono-setup-${dev}.png`);

  for (const cat of m.CHRONOLOGY_CATEGORIES) {
    h.section(`${cat.label} (${dev})`);
    for (const level of m.CHRONOLOGY_LEVELS) {
      await openSetup();
      await setCategory(cat.key);
      await h.click(`.game-level-option input[value="${level.key}"]`);
      await h.click(".game-start-button");
      await h.waitFor(".chronology-card");
      const name = `${cat.label} / ${level.label}`;

      let t = await titles();
      const cards = t.map((x) => byTitle.get(x));
      const known = cards.every(Boolean);
      h.assert(known && t.length === level.cardCount, `${name}: ${t.length} cards, all from the deck`);
      if (!known) continue;
      h.assert(cards.every((c) => cat.key === "all" || c.cats.includes(cat.key)), `${name}: every card in the category`);
      h.assert(cards.every((c) => c.fame <= level.maxFame), `${name}: fame ${cards.map((c) => c.fame).join("")} within ${level.maxFame}`);
      h.assert(m.isFairRound(cards, level) && m.meetsLevel(cards, level), `${name}: fair round: ${[...cards].sort((a, b) => a.order - b.order).map((c) => c.title).join(" > ")}`);

      // Sort it with the real ▲ buttons (a card's ▲ is button 2i), then check.
      for (let guard = 0; guard < 40; guard++) {
        const now = (await titles()).map((x) => byTitle.get(x).order);
        const i = now.findIndex((o, k) => k > 0 && now[k - 1] > o);
        if (i < 0) break;
        await h.click(".chronology-move", { index: 2 * i });
      }
      await h.click({ css: ".chronology-btn-primary", text: "Check Order" });
      const right = await h.count(".chronology-card-correct");
      h.assert(right === level.cardCount && (await h.text(".chronology-instruction")).includes("Correct"), `${name}: sorted round scores Correct (${right}/${level.cardCount})`);
      if (level.key === "easy") await h.screenshot(`chrono-${cat.key}-easy-${dev}.png`);
      await layout(`${name} checked`);

      // Next round, checked as dealt: it is never dealt already solved, so it costs a life.
      await h.click({ css: ".chronology-btn-primary", text: "Next Round" });
      await h.waitFor({ css: ".chronology-btn-primary", text: "Check Order" });
      t = await titles();
      const second = t.map((x) => byTitle.get(x));
      h.assert(second.every(Boolean) && m.isFairRound(second, level), `${name}: second round fair too`);
      const solved = second.every((c, k) => k === 0 || second[k - 1].order < c.order);
      h.assert(!solved, `${name}: second round not dealt already solved`);
      await h.click({ css: ".chronology-btn-primary", text: "Check Order" });
      const lost = await h.count(".chronology-heart-lost");
      const shown = await h.evaluate(() => [...document.querySelectorAll(".chronology-solution-title")].map((e) => e.textContent));
      const expect = [...second].sort((a, b) => a.order - b.order).map((c) => c.title);
      h.assert(lost === 1 && JSON.stringify(shown) === JSON.stringify(expect), `${name}: unsorted check costs a life and shows the right order`);
    }
  }
}
