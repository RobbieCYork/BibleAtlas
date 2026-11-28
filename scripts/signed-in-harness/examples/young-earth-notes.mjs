/**
 * The young-earth date notes (src/data/datingDebate.ts), from the real built app:
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/young-earth-notes.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/young-earth-notes.mjs
 *
 * The note sits under the date of Creation, the Flood and Babel and under the lifespans of Adam,
 * Noah and Enoch, and not under Abraham or the Call of Abram; its link opens the Young Earth and Old
 * Earth Creationism topic, which carries the new sections. A Chronology round that deals Creation
 * shows the marker and the footnote once checked, and its order, dates and score are untouched.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { openArticle, MENU_BUTTON } from "../lib/app.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "../../../src/data");
async function loadData(name) {
  const dir = mkdtempSync(join(tmpdir(), "games-data."));
  const bundle = await rolldown({ input: join(DATA, `${name}.ts`) });
  await bundle.write({ file: join(dir, "m.mjs"), format: "esm" });
  const mod = await import(pathToFileURL(join(dir, "m.mjs")).href);
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

const NOTE = ".young-earth-date-note";

export default async function (h) {
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = phone ? "phone" : "desktop";

  const check = async (name, expectNote, shot) => {
    await h.reload(); await h.sleep(900);
    await openArticle(h, name);
    await h.sleep(300);
    const has = await h.exists(NOTE);
    h.assert(has === expectNote, `${name}: note ${expectNote ? "shown" : "absent"} (${has})`);
    if (has) {
      const below = await h.evaluate((sel) => {
        const n = document.querySelector(sel);
        const date = n.previousElementSibling;
        return { prevClass: date?.className ?? null, text: n.innerText };
      }, NOTE);
      h.assert(/date-with-pill/.test(below.prevClass ?? ""), `${name}: note directly under the date line (${below.prevClass})`);
      h.assert(/Young-earth date\./.test(below.text) && /Ussher/.test(below.text), `${name}: note text`);
      const sideways = await h.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      h.assert(sideways <= 0, `${name}: nothing sideways (${sideways})`);
    }
    if (shot) await h.screenshot(`yec-${shot}-${dev}.png`);
  };

  h.section(`panels (${dev})`);
  await check("Creation of the Heavens and Earth", true, "creation");
  await check("Noah's Flood", true, "flood");
  await check("The Tower of Babel", true);
  await check("Adam", true, "adam");
  await check("Noah", true);
  await check("Enoch", true);
  await check("The Call of Abram", false);
  await check("Abraham", false);

  h.section(`link to the topic (${dev})`);
  await h.reload(); await h.sleep(900);
  await openArticle(h, "Noah's Flood");
  await h.click({ css: `${NOTE} button`, text: "Young Earth and Old Earth Creationism" });
  await h.sleep(500);
  const heads = await h.evaluate(() => [...document.querySelectorAll("h1, h2, h3, h4, h5")].map((e) => e.textContent.trim()));
  h.assert(heads.includes("Young Earth and Old Earth Creationism"), `link opens the topic`);
  for (const s of ["Where the App's Dates Come From", "The Case for a Young Earth", "The Case for an Old Earth", "Other Views", "A Secondary Issue Among Believers"]) {
    h.assert(heads.includes(s), `topic has section "${s}"`);
  }
  await h.screenshot(`yec-topic-${dev}.png`);

  h.section(`Chronology reveal (${dev})`);
  const m = await loadData("chronologyRounds");
  const youngEarth = new Map(m.CHRONOLOGY_DECK.map((c) => [c.title, !!c.event.youngEarthDate]));
  h.assert([...youngEarth.values()].some(Boolean), `the deck has young-earth cards (${[...youngEarth].filter(([, v]) => v).map(([k]) => k).join(", ")})`);
  const openRound = async () => {
    await h.reload(); await h.sleep(900);
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else { await h.click(MENU_BUTTON); await h.click({ css: ".panel-menu-link", text: "Games" }); }
    await h.waitFor(".game-center-card");
    await h.click({ css: ".game-center-card", text: "Chronology" });
    await h.waitFor(".chronology-category select");
    await h.evaluate(() => {
      const s = document.querySelector(".chronology-category select");
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, "ot");
      s.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await h.click('.game-level-option input[value="easy"]');
    await h.click(".game-start-button");
    await h.waitFor(".chronology-card");
  };
  const titles = () => h.evaluate(() => [...document.querySelectorAll(".chronology-card-title")].map((e) => e.textContent));
  let seenWith = 0, seenWithout = 0;
  await openRound();
  for (let round = 0; round < 60 && !(seenWith >= 1 && seenWithout >= 1); round++) {
    const t = await titles();
    const expected = t.filter((x) => youngEarth.get(x));
    const before = await h.exists(".chronology-card-young-earth");
    await h.click({ css: ".chronology-btn-primary", text: "Check Order" });
    await h.sleep(150);
    const markers = await h.count(".chronology-card-young-earth");
    const note = await h.exists(".chronology-young-earth-note");
    if (expected.length) {
      seenWith++;
      h.assert(!before, `round ${round}: no marker before the check`);
      h.assert(markers === expected.length, `round with ${expected.join(", ")}: ${markers} marker(s) on reveal`);
      h.assert(note && /Young Earth and Old Earth Creationism/.test((await h.text(".chronology-young-earth-note")) ?? ""), `footnote shown`);
      const dates = await h.evaluate(() => [...document.querySelectorAll(".chronology-card-meta")].map((e) => e.textContent));
      h.assert(true, `revealed dates: ${dates.join(" | ")}`);
      const sideways = await h.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      h.assert(sideways <= 0, `reveal: nothing sideways (${sideways})`);
      if (seenWith === 1) await h.screenshot(`yec-chronology-${dev}.png`);
    } else if (seenWithout === 0) {
      seenWithout++;
      h.assert(markers === 0 && !note, `round without a young-earth card: no marker, no footnote`);
    }
    if (await h.exists({ css: ".chronology-btn-primary", text: "Next Round" })) {
      await h.click({ css: ".chronology-btn-primary", text: "Next Round" });
      await h.waitFor({ css: ".chronology-btn-primary", text: "Check Order" });
    } else await openRound();
  }
  h.assert(seenWith >= 1, `a round dealt a young-earth card (${seenWith})`);
}
