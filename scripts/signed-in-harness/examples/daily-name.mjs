/**
 * Daily Name, played from the real built app: a daily WIN and a daily LOSS (storage cleared in
 * between), a practice win and a practice loss, the physical keyboard, guess rejection, letter
 * marks against the real rules, device stats, the spoiler-free share text, and the reveal's
 * article link. Also How to play (shown once before the first board, reopened by its button), the
 * first-guess hint and the Enter messages, and — on a phone run — that the board and the whole
 * keyboard fit above the tab bar for every name length at several phone sizes, with safe-area
 * insets, the seasonal-walk banner, the owner's Test view strip and large text. Run at both widths:
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
  await h.evaluate(() => { localStorage.removeItem("daily-name-v1"); localStorage.removeItem("daily-name-howto-v1"); });
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

  h.section("How to play — first time, before the board");
  await h.click({ css: ".game-entry-card", text: "Today's name" });
  await h.waitFor(".how-panel");
  h.assert(!(await h.exists(".dn-board")) && !(await h.exists(".dn-keyboard")), "the panel comes before the board");
  const helpText = await h.text(".how-panel");
  h.assert(helpText.includes(`${answer.word.length} letters`) && /real Bible name/.test(helpText) && /Enter/.test(helpText) && /6 tries/.test(helpText), "it says: a real Bible name of this length, tap Enter, six tries");
  const example = await h.evaluate(() => [...document.querySelectorAll(".dn-example .dn-tile")].map((t) => [t.textContent, (t.className.match(/dn-(right|elsewhere|absent)/) ?? [])[1]]));
  const guessWord = example.map((e) => e[0]).join("");
  const hidden = guessWord === "AMOS" ? "ADAM" : "SETH";
  h.assert(JSON.stringify(example.map((e) => e[1])) === JSON.stringify(dn.markGuess(guessWord, hidden)) && new Set(example.map((e) => e[1])).size === 3, `worked example ${guessWord} against ${hidden} shows all three marks as the rules say`);
  h.assert(dn.isAcceptedGuess(guessWord) && dn.isAcceptedGuess(hidden) && hidden !== answer.word, "both example names are accepted names and neither is today's answer");
  const explained = await h.evaluate(() => [...document.querySelectorAll(".how-marks li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  h.assert(explained.length === 3 && /right spot.*Solid tile/.test(explained[0]) && /different spot.*Dashed edge/.test(explained[1]) && /not in the name.*empty ring/.test(explained[2]), `each mark explained by meaning and shape: ${explained.join(" / ")}`);
  const frames = await h.evaluate(() => ["right", "elsewhere"].map((m) => getComputedStyle(document.querySelector(`.how-marks .dn-${m}`)).borderStyle));
  h.assert(JSON.stringify(frames) === JSON.stringify(["solid", "dashed"]), "the samples carry the board's real tile styling");
  const startShown = await h.evaluate(() => { const b = document.querySelector(".how-close").getBoundingClientRect(); const tab = document.querySelector(".mobile-tab-bar")?.getBoundingClientRect(); return b.bottom <= (tab ? tab.top : innerHeight) + 0.5 && b.top > 0; });
  h.assert(startShown && (await h.text(".how-close")) === "Start playing", "Start playing is on screen without scrolling");
  await key("a");
  await sound("how-to-play");
  await h.click(".how-close");
  await h.waitFor(".dn-board");
  h.assert(!(await h.evaluate(() => document.querySelector(".dn-board").textContent.trim())), "keys pressed over the panel type nothing");

  h.section("Hint and messages");
  const under = () => h.evaluate(() => ({ hint: document.querySelector(".dn-hint")?.textContent ?? null, message: document.querySelector(".dn-message").textContent }));
  const n = answer.word.length;
  h.assert((await under()).hint === `Type a ${n}-letter Bible name, then tap Enter.`, `empty board hint: "${(await under()).hint}"`);
  await key("Enter");
  await h.sleep(60);
  h.assert((await under()).message === `Not enough letters: this name has ${n}.` && (await under()).hint === null, `Enter on nothing: "${(await under()).message}"`);
  await key("q");
  await h.sleep(60);
  h.assert((await under()).hint === `${n - 1} more letters, then tap Enter.`, `after one letter: "${(await under()).hint}"`);
  await h.click({ css: ".dn-key", text: "Enter" });
  h.assert((await under()).message === `Not enough letters: this name has ${n}.`, "too few letters, on-screen Enter");
  for (let i = 1; i < n; i++) await key("q");
  await h.sleep(60);
  h.assert((await under()).hint === "Now tap Enter to check it.", `row full: "${(await under()).hint}"`);
  await sound("hint-full-row");
  await h.click(".how-open");
  await h.waitFor(".how-panel");
  h.assert((await h.text(".how-close")) === "Back to the game", "How to play reopens it; the button returns to the game");
  await key("Backspace");
  await h.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await h.waitFor(".dn-board");
  h.assert((await h.evaluate(() => document.querySelector(".dn-row").textContent.length)) === n, "Escape closes it and the typed letters are still there");
  for (let i = 0; i < n; i++) await key("Backspace");

  h.section("Daily — WIN");
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
  h.assert(!(await h.exists(".how-panel")), "re-opening today's game goes straight to the result, no How to play again");
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

  if (phone) await fit(h, dn, data, key, keyWord);
}

/** Board and keyboard inside the space between the game header and the tab bar, nothing to scroll. */
async function fit(h, dn, data, key, keyWord) {
  // [name, width, height, safe-area top, safe-area bottom]
  const SIZES = [
    ["se", 375, 667, 0, 0],
    ["se-standalone", 375, 667, 20, 0],
    ["iphone-standalone", 390, 844, 47, 34],
    ["iphone-safari", 390, 700, 0, 0],
    ["iphone-short-insets", 390, 700, 47, 34],
  ];
  // The seasonal-walk banner only draws inside its season; a switchable fake date brings it up.
  await h.addInitScript(`(()=>{ if (!sessionStorage.getItem('__dec')) return; const Real = Date; const shift = new Real(2026, 11, 5, 12).getTime() - Real.now();
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [Real.now() + shift])); } static now() { return Real.now() + shift; } }; })()`);

  const answers = data.DAILY_NAME_ANSWERS;
  const measure = () =>
    h.evaluate(() => {
      const box = (el) => el.getBoundingClientRect();
      const body = document.querySelector(".game-mode .game-body");
      const b = box(body);
      const tab = box(document.querySelector(".mobile-tab-bar"));
      const keys = [...document.querySelectorAll(".dn-key")];
      const kb = box(document.querySelector(".dn-keyboard"));
      const tiles = [...document.querySelectorAll(".dn-board .dn-tile")];
      const board = box(document.querySelector(".dn-board"));
      const under = box(document.querySelector(".dn-under"));
      const hidden = keys.filter((k) => { const r = box(k); const at = document.elementFromPoint(r.left + r.width / 2, r.bottom - 3); return r.top < b.top - 0.5 || r.bottom > Math.min(tab.top, b.bottom) + 0.5 || r.left < 0 || r.right > innerWidth || !k.contains(at); });
      const cut = tiles.filter((t) => { const r = box(t); return r.top < b.top - 0.5 || r.bottom > under.top + 0.5 || r.left < 0 || r.right > innerWidth; });
      return {
        keys: keys.length,
        enterAndDelete: keys.some((k) => k.textContent === "Enter") && keys.some((k) => k.getAttribute("aria-label") === "Delete letter"),
        hidden: hidden.map((k) => k.textContent).join(""),
        cut: cut.length,
        tiles: tiles.length,
        scroll: body.scrollHeight - body.clientHeight,
        tile: Math.round(box(tiles[0]).width),
        keyW: Math.floor(Math.min(...keys.map((k) => box(k).width))),
        keyH: Math.floor(Math.min(...keys.map((k) => box(k).height))),
        spare: Math.round(tab.top - kb.bottom),
        overlap: Math.max(0, Math.round(board.bottom - under.top)),
        banner: !!document.querySelector(".walk-banner"),
        strip: !!document.querySelector(".release-test-strip"),
      };
    });

  const open = async ([, w, hgt, top, bottom], { banner, scale, ownerTest }, length) => {
    await h.cdp("Emulation.setSafeAreaInsetsOverride", { insets: { top, bottom } });
    await h.evaluate((b, s, t) => {
      localStorage.removeItem("daily-name-v1");
      localStorage.setItem("daily-name-howto-v1", "1");
      localStorage.setItem("app-text-scale", String(s));
      if (b) sessionStorage.setItem("__dec", "1"); else sessionStorage.removeItem("__dec");
      if (t) localStorage.setItem("feature-test-view-v1", "1");
    }, !!banner, scale ?? 1, !!ownerTest);
    await h.setViewport(w, hgt);
    // Practice picks pool[floor(random * n)]: pin it to the first name of the wanted length.
    const today = await h.evaluate(() => { const d = new Date(); const p = (x) => String(x).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; });
    const pool = answers.filter((a) => a.word !== dn.answerForPuzzle(dn.puzzleNumber(today)).word);
    const i = pool.findIndex((a) => a.word.length === length);
    await h.evaluate((x) => { Math.random = () => x; }, (i + 0.5) / pool.length);
    await h.click({ css: ".mobile-tab", text: "Games" });
    await h.click({ css: ".game-center-card", text: "Daily Name" });
    await h.click({ css: ".game-entry-card", text: "Play solo" });
    await h.click({ css: ".game-entry-card", text: "Practice" });
    await h.waitFor(".dn-board");
    await h.sleep(150);
    return pool[i].word;
  };

  const fits = (m) => m.keys === 28 && m.enterAndDelete && !m.hidden && !m.cut && m.tiles > 0 && m.scroll <= 0 && !m.overlap && m.keyH >= 40 && m.keyW >= 28 && m.tile >= 20;
  const line = (m) => `tile ${m.tile}px, keys ${m.keyW}x${m.keyH}, ${m.spare}px under the keyboard${fits(m) ? "" : " " + JSON.stringify(m)}`;

  for (const banner of [false, true]) {
    for (const size of SIZES) {
      h.section(`Fit — ${size[0]} ${size[1]}x${size[2]} insets ${size[3]}/${size[4]}${banner ? " + seasonal walk banner" : ""}`);
      for (const length of [4, 5, 6, 7, 8, 9]) {
        const word = await open(size, { banner }, length);
        const m = await measure();
        h.assert(fits(m) && m.banner === banner && m.tiles === 6 * length, `${length} letters, empty: ${line(m)}`);
        if (length === 5 || length === 9) {
          // The worst case under the board: the longest refusal, then a board with guesses on it.
          await keyWord("Z".repeat(length));
          const refused = await measure();
          h.assert(fits(refused), `${length} letters, refusal message showing: ${line(refused)}`);
          await h.screenshot(`daily-name-fit-${size[0]}-${length}${banner ? "-banner" : ""}.png`);
          for (let i = 0; i < length; i++) await key("Backspace");
          const guesses = data.DAILY_NAME_GUESSES.split(" ").filter((w) => w.length === length && w !== word).slice(0, 5);
          for (const w of guesses) await keyWord(w);
          const full = await measure();
          h.assert(fits(full), `${length} letters, five guesses made: ${line(full)}`);
          await h.screenshot(`daily-name-fit-${size[0]}-${length}-played${banner ? "-banner" : ""}.png`);
        }
      }
      // How to play on the same screen: its button pinned in view.
      await h.click(".how-open");
      await h.waitFor(".how-close");
      const shown = await h.evaluate(() => { const b = document.querySelector(".how-close").getBoundingClientRect(); const body = document.querySelector(".how-body"); return { button: b.bottom <= document.querySelector(".mobile-tab-bar").getBoundingClientRect().top + 0.5, scroll: body.scrollHeight - body.clientHeight }; });
      h.assert(shown.button, `How to play button in view (panel scrolls ${shown.scroll}px)`);
      await h.screenshot(`daily-name-help-${size[0]}${banner ? "-banner" : ""}.png`);
    }
  }

  // Large text: whatever else gives way, every key stays on screen above the tab bar.
  for (const scale of [1.3, 1.45, 1.8]) {
    for (const size of [SIZES[0], SIZES[2], SIZES[4]]) {
      h.section(`Large text ${scale} — ${size[0]} + seasonal walk banner`);
      for (const length of [5, 9]) {
        await open(size, { scale, banner: true }, length);
        const m = await measure();
        h.assert(m.keys === 28 && !m.hidden && m.keyH >= 40, `${length} letters: whole keyboard in view; tile ${m.tile}px, page scrolls ${m.scroll}px`);
        await h.screenshot(`daily-name-large-${scale}-${size[0]}-${length}.png`);
        await keyWord("Z".repeat(length));
        const r = await measure();
        h.assert(!r.hidden, `${length} letters with a refusal showing: keyboard still in view (scrolls ${r.scroll}px)`);
      }
      const header = await h.evaluate(() => { const b = document.querySelector(".how-open").getBoundingClientRect(); return b.right <= innerWidth && b.width > 0; });
      h.assert(header, "How to play button on screen");
    }
  }

  // The owner in Test view also carries the orange strip under the header.
  await h.evaluate(() => { localStorage.setItem("app-text-scale", "1"); });
  await h.asPersona("owner");
  for (const size of [SIZES[0], SIZES[4]]) {
    h.section(`Owner in Test view — ${size[0]}`);
    await open(size, { ownerTest: true }, 9);
    const m = await measure();
    h.assert(m.strip && m.keys === 28 && !m.hidden, `strip showing (${m.strip}); whole keyboard in view; tile ${m.tile}px, scrolls ${m.scroll}px`);
    await h.screenshot(`daily-name-owner-${size[0]}.png`);
  }
  await h.cdp("Emulation.setSafeAreaInsetsOverride", { insets: {} });
}
