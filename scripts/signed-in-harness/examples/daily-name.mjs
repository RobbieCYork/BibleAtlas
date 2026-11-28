/**
 * Daily Name, played from the real built app: a daily WIN and a daily LOSS (storage cleared in
 * between), a practice win and a practice loss, the physical keyboard, guess rejection, letter
 * marks against the real rules, device stats, the spoiler-free share text, and the reveal's
 * article link. Also How to play (shown once before the first board, reopened by its button), the
 * first-guess hint and the Enter messages, the always-visible key to the three marks (the board's
 * own tile styles; the note when a repeated letter leaves a pale tile), every skin light and dark,
 * and — on a phone run — that the board, the key and the whole
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
  await h.waitFor({ css: ".game-entry-card", text: "Practice" });
  const entry = await h.evaluate(() => [...document.querySelectorAll(".game-entry-card .game-center-card-title")].map((e) => e.textContent.trim().split(" ·")[0]));
  h.assert(JSON.stringify(entry) === JSON.stringify(["Today's name", "Practice"]), `opens straight on today's name and Practice, no Play solo screen (${entry.join(", ")})`);
  h.assert(await h.exists('.game-root[data-page-bg="game-setup"]'), "the menu carries the game-setup background");
  h.assert((await h.text({ css: ".game-entry-card", text: "Today's name" })).includes(`#${number}`), `menu offers today's name #${number}`);
  await sound("menu");
  await h.click(".game-header button");
  await h.waitFor({ css: ".game-header h2", text: "Game Center" });
  h.assert(!(await h.exists(".game-entry-card")), "Back from the menu is Game Center");
  await h.click({ css: ".game-center-card", text: "Daily Name" });
  await h.waitFor({ css: ".game-entry-card", text: "Practice" });

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
  /** The key: drawn, in view, between the board and the message slot, clear of the keyboard, and
   * each sample styled exactly as the board tile and keyboard key of that mark. */
  const keyShown = () =>
    h.evaluate(() => {
      const el = document.querySelector(".dn-legend");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const board = document.querySelector(".dn-board").getBoundingClientRect();
      const body = document.querySelector(".game-mode .game-body").getBoundingClientRect();
      const kb = document.querySelector(".dn-keyboard")?.getBoundingClientRect();
      const seen = [...el.querySelectorAll("li")].every((li) => { const b = li.getBoundingClientRect(); const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!at && li.contains(at); });
      return {
        words: [...el.querySelectorAll("li > span:last-child")].map((s) => s.textContent),
        ok: r.height > 0 && seen && r.top >= board.bottom - 0.5 && r.bottom <= body.bottom + 0.5 && (!kb || r.bottom <= kb.top + 0.5) && r.left >= 0 && r.right <= innerWidth,
        height: Math.round(r.height),
      };
    });
  const empty = await keyShown();
  h.assert(empty?.ok && JSON.stringify(empty.words) === JSON.stringify(["Right spot", "In name, wrong spot", "Not in name"]), `key on screen before the first guess (${JSON.stringify(empty)})`);
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
  const sameLook = await h.evaluate(() => {
    const look = (el, mark) => { const s = getComputedStyle(el); const d = getComputedStyle(el.querySelector(".dn-mark")); return [s.backgroundColor, s.borderTopStyle, s.borderTopColor, s.color, d.backgroundColor, d.backgroundImage, d.borderTopStyle].join("|") + mark; };
    return ["right", "elsewhere", "absent"].flatMap((m) => {
      const sample = look(document.querySelector(`.dn-legend .dn-${m}`), m);
      return [...document.querySelectorAll(`.dn-board .dn-${m}, .dn-key.dn-${m}`)].filter((el) => look(el, m) !== sample).map((el) => `${m}: ${el.className}`);
    });
  });
  h.assert(sameLook.length === 0, `board tiles and keys look exactly like their key sample ${sameLook.slice(0, 3).join("; ")}`);
  h.assert((await keyShown())?.ok, "key still on screen with two guesses made");
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

  h.section("Key — a repeated letter");
  // A practice name and a guess that uses one of its letters more often than the name does.
  {
    const all = data.DAILY_NAME_GUESSES.split(" ");
    const practice = data.DAILY_NAME_ANSWERS.filter((a) => a.word !== answer.word);
    let found = null;
    for (let i = 0; i < practice.length && !found; i++) {
      const word = practice[i].word;
      for (const g of all) {
        if (g.length !== word.length || g === word) continue;
        const m = dn.markGuess(g, word);
        const at = [...g].findIndex((l, k) => m[k] === "absent" && m.some((x, j) => g[j] === l && x !== "absent"));
        const plain = all.find((p) => p.length === word.length && p !== word && !dn.markGuess(p, word).some((x, k) => x === "absent" && dn.markGuess(p, word).some((y, j) => p[j] === p[k] && y !== "absent")));
        if (at >= 0 && plain) { found = { i, word, guess: g, letter: g[at], plain }; break; }
      }
    }
    h.assert(!!found, `found a case: ${found?.guess} against ${found?.word}`);
    await h.reload();
    await h.sleep(800);
    await h.evaluate((x) => { Math.random = () => x; }, (found.i + 0.5) / practice.length);
    await openDaily();
    await h.click({ css: ".game-entry-card", text: "Practice" });
    await h.waitFor(".dn-board");
    await keyWord(found.guess);
    const noteText = await h.evaluate(() => document.querySelector(".dn-extra")?.textContent ?? null);
    h.assert(noteText === `Pale ${found.letter}: the name has no more ${found.letter}’s.`, `note under the board: "${noteText}"`);
    h.assert((await h.evaluate(() => { const n = document.querySelector(".dn-extra").getBoundingClientRect(); const k = document.querySelector(".dn-keyboard").getBoundingClientRect(); return n.bottom <= k.top + 0.5; })) && (await keyShown())?.ok, "note and key both clear of the keyboard");
    await sound("repeated-letter");
    await keyWord(found.plain);
    h.assert(!(await h.exists(".dn-extra")), `gone after a guess without one (${found.plain})`);
    await h.click(".how-open");
    await h.waitFor(".how-panel");
    h.assert(/more times than the name has it/.test(await h.text(".how-panel")), "How to play says it too");
    await h.click(".how-close");
    await h.waitFor(".dn-board");
  }

  h.section("Key — every theme");
  {
    // The app's own two settings, loaded for real: light, dark, and each skin (a skin fixes its mode).
    const skins = ["sticker", "clarity", "midnight", "sage", "skyreader", "trailhead", "highlighter"];
    const looks = [["light", null], ["dark", null], ...skins.map((k) => [k === "midnight" ? "dark" : "light", k])];
    {
      for (const [theme, skin] of looks) {
        await h.evaluate((t, k, key, word, guesses) => {
          localStorage.setItem("app-theme", t);
          if (k) localStorage.setItem("app-skin", k); else localStorage.removeItem("app-skin");
          localStorage.setItem("daily-name-v1", JSON.stringify({ v: 1, days: { [key]: { word, guesses } } }));
        }, theme, skin, todayKey, answer.word, wrong.slice(0, 2));
        await h.reload();
        await h.sleep(800);
        await openDaily();
        await h.click({ css: ".game-entry-card", text: "Today's name" });
        await h.waitFor(".dn-board");
        await h.sleep(150);
        h.assert((await h.evaluate(() => `${document.documentElement.dataset.theme} ${document.documentElement.dataset.skin ?? ""}`)) === `${theme} ${skin ?? ""}`, `${theme} ${skin ?? "default"} applied by the app`);
        const r = await h.evaluate(() => {
          // Any colour the browser reports, as sRGB, through a canvas.
          const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d", { willReadFrequently: true });
          const rgb = (under, col) => { x.fillStyle = `rgb(${under.join(",")})`; x.fillRect(0, 0, 1, 1); x.fillStyle = col; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); };
          const lum = (c3) => { const [r2, g, b] = c3.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r2 + 0.7152 * g + 0.0722 * b; };
          const ratio = (a, b) => { const [p, q] = [lum(a), lum(b)].sort((m, n) => n - m); return (p + 0.05) / (q + 0.05); };
          const ground = (el) => { const chain = []; for (let e = el; e; e = e.parentElement) chain.unshift(getComputedStyle(e).backgroundColor); return chain.reduce((u, col) => rgb(u, col), [255, 255, 255]); };
          const li = [...document.querySelectorAll(".dn-legend li")];
          return {
            words: Math.min(...li.map((l) => { const s = l.lastElementChild; const g = ground(s); return ratio(rgb(g, getComputedStyle(s).color), g); })),
            marks: Math.min(...li.map((l) => { const t = l.firstElementChild; const g = ground(t); return ratio(rgb(g, getComputedStyle(t.querySelector(".dn-mark")).color), g); })),
          };
        });
        h.assert(r.words >= 4.5 && r.marks >= 3 && (await keyShown())?.ok, `${theme} ${skin ?? "default"}: key words ${r.words.toFixed(1)}:1, marks on their tiles ${r.marks.toFixed(1)}:1`);
        await shot(`key-${theme}-${skin ?? "default"}`);
      }
    }
    await h.evaluate(() => { localStorage.setItem("app-theme", "light"); localStorage.removeItem("app-skin"); });
  }

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
        key: (() => { const el = document.querySelector(".dn-legend"); const r = box(el); const lis = [...el.querySelectorAll("li")]; return r.height > 0 && r.top >= board.bottom - 0.5 && r.bottom <= under.top + 0.5 && r.bottom <= kb.top + 0.5 && r.top >= b.top - 0.5 && lis.every((li) => { const q = box(li); const at = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return q.left >= 0 && q.right <= innerWidth && !!at && li.contains(at); }); })(),
        keyHeight: Math.round(box(document.querySelector(".dn-legend")).height),
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
    await h.click({ css: ".game-entry-card", text: "Practice" });
    await h.waitFor(".dn-board");
    await h.sleep(150);
    return pool[i].word;
  };

  const fits = (m) => m.key && m.keys === 28 && m.enterAndDelete && !m.hidden && !m.cut && m.tiles > 0 && m.scroll <= 0 && !m.overlap && m.keyH >= 40 && m.keyW >= 28 && m.tile >= 20;
  const line = (m) => `key ${m.keyHeight}px, tile ${m.tile}px, keys ${m.keyW}x${m.keyH}, ${m.spare}px under the keyboard${fits(m) ? "" : " " + JSON.stringify(m)}`;

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
        h.assert(m.keys === 28 && !m.hidden && m.keyH >= 40 && m.key, `${length} letters: whole keyboard and the key in view; key ${m.keyHeight}px, tile ${m.tile}px, page scrolls ${m.scroll}px`);
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
