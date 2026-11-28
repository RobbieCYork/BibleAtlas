/**
 * "Welcome to Capstone Bible" (src/data/welcomeTour.ts): who sees it, how that is remembered, every
 * step's layout and highlight, reopening it, stages switched off, and that the running app's menus,
 * tabs and sections are all covered by a step or an explicit exclusion.
 *
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/welcome-tour.mjs
 *   ...and --viewport 1280x800.  LOOKS=1 adds every skin, dark and largest text.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTour } from "../../welcome-tour-validate/load.mjs";
import { MENU_BUTTON } from "../lib/app.mjs";
import { STORAGE_KEY } from "../lib/personas.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const VERSES = JSON.parse(readFileSync(new URL("./mark8-web.json", import.meta.url), "utf8"));
const SEEN = "welcome_tour_seen_at";

// Bible text is blocked in the harness: answer it in the page, so the reader's controls are on screen.
const BIBLE_STUB = `(() => {
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.startsWith("https://bible-api.com/")) return real(input, init);
    const body = { reference: "Matthew 1", translation_name: "World English Bible", verses: ${JSON.stringify(VERSES)} };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
  };
  const shift = Number(localStorage.getItem("harness-days-later") || 0) * 86400000;
  if (shift) {
    const Real = Date;
    window.Date = class extends Real {
      constructor(...a) { if (a.length) super(...a); else super(Real.now() + shift); }
      static now() { return Real.now() + shift; }
    };
  }
})()`;

export default async function (h) {
  const tour = await loadTour(ROOT);
  const steps = tour.TOUR_STEPS;
  const phone = Number(h.viewport.split("x")[0]) <= 768;
  const dev = phone ? "phone" : "desktop";
  const everyStep = steps.filter((s) => !s.seasonal).map((s) => s.id);
  await h.addInitScript(BIBLE_STUB);

  const key = (name, code, vk) => async () => {
    for (const type of ["rawKeyDown", "keyUp"]) await h.cdp("Input.dispatchKeyEvent", { type, key: name, code, windowsVirtualKeyCode: vk });
    await h.sleep(200);
  };
  const escape = key("Escape", "Escape", 27);
  const tab = key("Tab", "Tab", 9);
  const open = () => h.exists(".welcome-tour[open]");
  const userId = () => h.backend.persona.id;
  const localMark = () => h.evaluate((k) => localStorage.getItem(k), `welcome-tour-seen:${userId()}`);
  const clearMark = () => h.evaluate((k) => localStorage.removeItem(k), `welcome-tour-seen:${userId()}`);
  const updates = () => h.backend.log.authUpdates;
  const settle = async () => { await h.reload(); await h.sleep(2600); };
  /** A brand new account that has seen nothing. */
  const newAccount = async (extra = {}) => {
    h.backend.setAccount({ createdAt: new Date().toISOString(), metadata: {}, failUpdates: false, ...extra });
    await clearMark();
    await h.asPersona(h.persona);
    await h.sleep(1200);
  };
  const openFromMenu = async () => {
    await h.click(MENU_BUTTON);
    await h.sleep(250);
    await h.click(phone ? ".mobile-nav-menu-tour" : ".panel-menu-tour");
    await h.sleep(500);
  };

  /** Everything worth knowing about the step on screen, read from the DOM. */
  const look = () =>
    h.evaluate(() => {
      const d = document.querySelector(".welcome-tour");
      const card = d.querySelector(".welcome-tour-card");
      const c = card.getBoundingClientRect();
      const ringEl = d.querySelector(".welcome-tour-ring");
      const r = ringEl?.getBoundingClientRect();
      const scroller = d.querySelector(".welcome-tour-scroll");
      const rgb = (s) => (s.match(/[\d.]+/g) ?? []).map(Number);
      const over = (top, under) => { const a = top[3] ?? 1; return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)); };
      const ground = (el) => {
        const chain = [];
        for (let n = el; n && n !== d; n = n.parentElement) chain.push(rgb(getComputedStyle(n).backgroundColor));
        return chain.reverse().reduce((under, top) => ((top[3] ?? 1) === 0 ? under : over(top, under)), [255, 255, 255]);
      };
      const lum = (v) => { const [x, y, z] = v.slice(0, 3).map((n) => { n /= 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return 0.2126 * x + 0.7152 * y + 0.0722 * z; };
      const contrast = (el) => { const bg = ground(el); const fg = over(rgb(getComputedStyle(el).color), bg); const [a, b] = [lum(fg), lum(bg)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
      const faint = [...d.querySelectorAll(".welcome-tour-count, .welcome-tour-skip, h2, .welcome-tour-body, .welcome-tour-where dt, .welcome-tour-chip span:last-child, .welcome-tour-hint, .welcome-tour-next, .welcome-tour-back:not([aria-disabled=true])")]
        .map((el) => ({ el: el.className || el.tagName, ratio: Math.round(contrast(el) * 100) / 100 }))
        .filter((x) => x.ratio < 4.5);
      const buttons = [...d.querySelectorAll("button")].map((b) => {
        const q = b.getBoundingClientRect();
        const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return { text: b.textContent.trim(), ok: q.top >= c.top - 1 && q.bottom <= c.bottom + 1 && q.left >= c.left - 1 && q.right <= c.right + 1 && (hit === b || b.contains(hit)), h: Math.round(q.height) };
      });
      const ringed = r ? [...document.querySelectorAll("[data-tour]")].filter((e) => { const q = e.getBoundingClientRect(); return q.width && q.left >= r.left - 6 && q.right <= r.right + 6 && q.top >= r.top - 6 && q.bottom <= r.bottom + 6; }).map((e) => e.dataset.tour) : [];
      return {
        id: card.dataset.step,
        count: d.querySelector(".welcome-tour-count").textContent,
        title: d.querySelector("h2").textContent,
        body: d.querySelector(".welcome-tour-body").textContent,
        text: scroller.innerText.replace(/\s+/g, " "),
        inside: c.left >= -0.5 && c.top >= -0.5 && c.right <= innerWidth + 0.5 && c.bottom <= innerHeight + 0.5,
        sideways: [scroller, card, d, document.documentElement].some((e) => e.scrollWidth > e.clientWidth + 1),
        scrolls: scroller.scrollHeight > scroller.clientHeight + 1,
        readable: scroller.clientHeight,
        buttons,
        ring: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
        ringed,
        covers: !!r && c.left < r.right && c.right > r.left && c.top < r.bottom && c.bottom > r.top,
        card: { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) },
        faint,
        focusInside: d.contains(document.activeElement),
      };
    });

  /** Click through from step 1 to the end, calling `each` on every step. */
  const walk = async (each) => {
    const seen = [];
    for (let i = 0; i < 40; i++) {
      await h.sleep(380);
      const s = await look();
      seen.push(s);
      await each?.(s, i);
      if (!(await h.exists(".welcome-tour-skip"))) break;
      await h.click(".welcome-tour-next");
    }
    return seen;
  };
  const sound = (s) => s.inside && !s.sideways && s.buttons.every((b) => b.ok && b.h >= 44) && s.readable >= 80;

  // -------------------------------------------------------------------------------------------
  h.section(`1. an account from before the tour is not interrupted (${dev})`);
  await settle();
  h.assert(await h.exists('[aria-label="Settings and account"]'), "signed in");
  h.assert(!(await open()) && updates().length === 0, "no tour, and nothing written to the account");
  h.backend.setAccount({ createdAt: "2026-11-26T23:59:00Z" });
  await h.asPersona(h.persona);
  await h.sleep(1500);
  h.assert(!(await open()), "created one minute before the launch time: no tour");

  // -------------------------------------------------------------------------------------------
  h.section("2. a new account sees it once");
  await newAccount();
  await h.waitFor(".welcome-tour[open]");
  let s = await look();
  h.assert(await h.evaluate(() => document.querySelector(".welcome-tour").matches(":modal")), "it is a modal dialog");
  h.assert(await h.evaluate(() => document.activeElement?.className === "welcome-tour-next"), "focus starts on Next");
  h.assert(s.id === "welcome" && s.count === `Step 1 of ${s.count.split(" ").pop()}`, `opens on the first step: ${s.count}`);
  h.assert(updates().length === 1 && updates()[0].ok && !!updates()[0].data[SEEN] && Object.keys(updates()[0].data).length === 1, `marked on the account: ${JSON.stringify(updates())}`);
  h.assert(h.backend.accountMetadata[SEEN] && (await localMark()), "marked on the account and in this browser");
  await escape();
  h.assert(!(await open()) && !(await h.exists(".welcome-tour")), "Escape closes it");
  await h.click(MENU_BUTTON);
  await h.sleep(250);
  h.assert(await h.exists(phone ? ".mobile-nav-menu-dropdown" : ".panel-menu-dropdown"), "the app is usable straight after");
  await settle();
  h.assert(!(await open()) && updates().length === 1, "reload: not shown again, nothing rewritten");

  h.section("2b. Skip");
  await newAccount();
  await h.waitFor(".welcome-tour[open]");
  await h.click(".welcome-tour-next");
  await h.click(".welcome-tour-skip");
  await h.sleep(300);
  h.assert(!(await h.exists(".welcome-tour")), "Skip tour closes it part way");
  await settle();
  h.assert(!(await open()), "and it does not come back");

  h.section("2c. seen on another device");
  await clearMark();
  await h.asPersona(h.persona);
  await h.sleep(1500);
  h.assert(!(await open()) && (await localMark()), "account mark alone: not shown, and this browser notes it");
  h.backend.setAccount({ metadata: {} });
  await clearMark();
  await h.asPersona(h.persona); // the stored session has no mark...
  await h.evaluate((k) => localStorage.removeItem(k), `welcome-tour-seen:${userId()}`);
  h.backend.setAccount({ metadata: { [SEEN]: "2026-11-27T02:00:00Z" } }); // ...but the server now does
  await settle();
  h.assert(!(await open()), "session older than the mark: the server's copy wins, not shown");

  h.section("2d. the account write fails");
  const before = updates().length;
  await newAccount({ failUpdates: true });
  await h.waitFor(".welcome-tour[open]");
  await h.click(".welcome-tour-skip");
  await h.sleep(600);
  h.assert(updates().length === before + 1 && !updates().at(-1).ok && !h.backend.accountMetadata[SEEN], "shown once; the write was refused");
  await settle();
  h.assert(!(await open()), "reload: not shown again (this browser's mark)");
  h.assert(updates().length === before + 2 && !updates().at(-1).ok, `one retry per load (${updates().length - before - 1})`);
  h.backend.setAccount({ failUpdates: false });
  await settle();
  h.assert(!(await open()) && !!h.backend.accountMetadata[SEEN], "next load: the retry lands on the account");
  const settled = updates().length;
  await settle();
  h.assert(updates().length <= settled + 1, `no write loop afterwards (${updates().length - settled} more)`);

  h.section("2e. backstop: an account older than 30 days is left alone even with no mark anywhere");
  await h.evaluate(() => localStorage.setItem("harness-days-later", "31"));
  await newAccount();
  await settle();
  h.assert(!(await open()), "31 days after creation: no tour");
  await h.evaluate(() => localStorage.removeItem("harness-days-later"));

  h.section("2f. never over the display-name prompt or the sign-in gate");
  h.backend.setAccount({ createdAt: new Date().toISOString(), metadata: {} });
  await clearMark();
  const session = h.backend.setPersona(h.persona); // a fresh session, not yet loaded...
  h.backend.setTable("profiles", [{ id: userId(), display_name: null }]); // ...for an account with no name
  await h.evaluate((k, v) => localStorage.setItem(k, v), STORAGE_KEY, JSON.stringify(session));
  await settle();
  h.assert(await h.exists(".display-name-gate-overlay"), "an account with no name gets the name prompt");
  h.assert(!(await open()), "no tour over it");
  await h.type(".display-name-gate-card input", "New Reader");
  await h.click(".display-name-gate-card button[type=submit]");
  await h.sleep(1500);
  h.assert(!(await h.exists(".display-name-gate-overlay")) && (await open()), "the tour follows once the name is saved");
  await escape();
  const me = h.persona;
  await h.asPersona("signedout");
  h.assert((await h.count(".auth-gate")) > 0 && !(await h.exists(".welcome-tour")), "signed out: the sign-in gate, no tour");
  await h.asPersona(me);

  // -------------------------------------------------------------------------------------------
  h.section("3. every step: layout, highlight, keyboard");
  await newAccount();
  await h.waitFor(".welcome-tour[open]");
  await h.sleep(600);
  const all = await walk(async (s, i) => {
    await h.screenshot(`tour-${dev}-${String(i + 1).padStart(2, "0")}-${s.id}.png`);
    h.assert(sound(s), `${s.id}: card on screen, no sideways scroll, buttons reachable ${JSON.stringify({ card: s.card, readable: s.readable, bad: s.buttons.filter((b) => !b.ok || b.h < 44), sideways: s.sideways })}`);
    h.assert(s.focusInside, `${s.id}: focus stays in the dialog`);
    h.assert(s.faint.length === 0, `${s.id}: text contrast 4.5:1 or better ${JSON.stringify(s.faint)}`);
    const want = steps.find((x) => x.id === s.id).anchors?.[dev];
    if (want) {
      h.assert(!!s.ring && s.ringed.some((a) => want.includes(a)), `${s.id}: rings ${want.join(" or ")} (ringed ${s.ringed.join(",") || "nothing"})`);
      h.assert(!s.covers, `${s.id}: the card leaves the ringed control clear ${JSON.stringify({ ring: s.ring, card: s.card })}`);
    } else h.assert(!s.ring, `${s.id}: no ring`);
    h.assert(!/\{\w+\}/.test(s.text), `${s.id}: no unfilled placeholder`);
    if (i === 2) {
      await h.click(".welcome-tour-back");
      await h.sleep(200);
      h.assert((await look()).id === everyStep[1], "Back goes back one step");
      await h.click(".welcome-tour-next");
      await h.sleep(200);
    }
  });
  const ids = all.map((s) => s.id);
  h.assert(JSON.stringify(ids.filter((i) => i !== "walk")) === JSON.stringify(everyStep), `all steps in order (${ids.length}): ${ids.join(", ")}`);
  h.assert(all.every((s, i) => s.count === `Step ${i + 1} of ${all.length}`), "progress counts up");
  const text = all.map((s) => s.text).join(" ");
  h.assert(!/friend|\bgroups?\b|\bmessages?\b|offline|reading plan/i.test(text), `nothing switched off or unbuilt is mentioned ${text.match(/friend|\bgroups?\b|\bmessages?\b|offline|reading plan/i)?.[0] ?? ""}`);
  console.log("  COPY:\n" + all.map((s) => `    [${s.id}] ${s.title}: ${s.body}`).join("\n"));
  h.assert((await h.text(".welcome-tour-next")) === "Done", "last step says Done");
  await h.click(".welcome-tour-next");
  await h.sleep(300);
  h.assert(!(await h.exists(".welcome-tour")), "Done closes it");

  // -------------------------------------------------------------------------------------------
  h.section("3b. a seasonal walk's banner gets its own step while it is up");
  // The next 10 December, as the page will see it: inside The Road to Bethlehem's season.
  const today = new Date();
  let december = new Date(today.getFullYear(), 11, 10, 12);
  if (december < today) december = new Date(today.getFullYear() + 1, 11, 10, 12);
  const ahead = Math.round((december - today) / 86400000);
  await h.evaluate((d) => localStorage.setItem("harness-days-later", String(d)), ahead);
  await newAccount({ createdAt: new Date(Date.now() + ahead * 86400000).toISOString() });
  await h.waitFor(".welcome-tour[open]");
  const season = await walk(async (s) => { if (s.id === "walk") await h.screenshot(`tour-${dev}-walk.png`); });
  const w = season.find((s) => s.id === "walk");
  h.assert(w && w.title === "The Road to Bethlehem" && w.ringed.includes("walk-banner") && sound(w) && !w.covers, `walk step: ${w?.title}, ringed ${w?.ringed}`);
  h.assert(season.length === everyStep.length + 1, `${season.length} steps with it`);
  await escape();
  await h.evaluate(() => localStorage.removeItem("harness-days-later"));
  await settle();

  // -------------------------------------------------------------------------------------------
  h.section("4. reopen from the main menu and from Settings");
  const written = updates().length;
  await openFromMenu();
  h.assert((await open()) && (await look()).id === "welcome", "main menu → Welcome tour opens it from the start");
  for (let i = 0; i < 8; i++) await tab();
  h.assert(await h.evaluate(() => { const a = document.activeElement; return !a || a === document.body || !!a.closest(".welcome-tour"); }), "Tab never reaches the page behind");
  h.assert((await look()).buttons.find((b) => b.text === "Back") && (await h.evaluate(() => document.querySelector(".welcome-tour-back").getAttribute("aria-disabled") === "true")), "Back is off on the first step");
  await h.click(".welcome-tour-back");
  h.assert((await look()).id === "welcome", "and does nothing");
  await h.click(".welcome-tour-skip");
  await h.sleep(300);
  h.assert(await h.evaluate((sel) => !!document.activeElement?.matches(sel), MENU_BUTTON), "focus returns to the menu button");

  await h.click('[aria-label="Settings and account"]');
  await h.sleep(300);
  await h.click({ css: ".auth-menu-item", text: "Settings" });
  await h.sleep(400);
  await h.screenshot(`tour-${dev}-settings-row.png`);
  await h.click(".settings-tour-row");
  await h.sleep(600);
  h.assert(await open(), "Settings → Welcome tour opens it");
  await h.click(".welcome-tour-next");
  await h.sleep(400);
  s = await look();
  h.assert(!s.ringed.includes("bible-controls") && sound(s), "over Settings, nothing hidden underneath is ringed");
  await h.screenshot(`tour-${dev}-over-settings.png`);
  await escape();
  h.assert((await h.exists(".settings-root")) && (await h.evaluate(() => document.activeElement?.classList.contains("settings-tour-row"))), "closing it leaves the reader on Settings");
  h.assert(updates().length === written, "reopening writes nothing");

  // An existing account can open it too.
  h.backend.setAccount({ createdAt: "2026-10-01T00:00:00Z", metadata: {} });
  await clearMark();
  await h.asPersona(h.persona);
  await h.sleep(1500);
  h.assert(!(await open()), "existing account: nothing on its own");
  await openFromMenu();
  h.assert(await open(), "existing account: opens it from the menu");
  await escape();

  // -------------------------------------------------------------------------------------------
  h.section("5. everything in the running app is covered by a step or an exclusion");
  const covered = (table, k) => k in table && (typeof table[k] === "string" ? everyStep.includes(table[k]) || table[k] === "walk" : !!table[k].skip);
  for (const key of h.backend.featureKeys.filter((k) => k !== "game_punchline")) // retired; its row is still in the database
    h.assert(covered(tour.FEATURE_COVERAGE, key), `feature flag ${key} is covered`);
  const rows = (sel) => h.evaluate((q) => [...document.querySelectorAll(q)].map((e) => ({ key: e.getAttribute("data-menu"), text: e.textContent.trim() })), sel);
  const check = (where, list) => {
    h.assert(list.length > 0, `${where}: rows found`);
    for (const r of list) h.assert(!!r.key && covered(tour.MENU_COVERAGE, r.key), `${where}: "${r.text}" (${r.key}) is covered`);
  };
  for (const persona of ["member", "owner"]) {
    await h.asPersona(persona);
    await h.sleep(800);
    await h.click(MENU_BUTTON);
    await h.sleep(250);
    check(`${persona} main menu`, await rows(phone ? ".mobile-nav-menu-dropdown button" : ".panel-menu-dropdown button, .panel-menu-dropdown label"));
    await h.click(MENU_BUTTON);
    await h.click('[aria-label="Settings and account"]');
    await h.sleep(500);
    check(`${persona} account menu`, await rows(".auth-dropdown button"));
    await h.click('[aria-label="Settings and account"]');
    if (phone) check(`${persona} bottom bar`, await rows(".mobile-tab-bar button"));
  }
  await h.asPersona(me);
  await h.sleep(800);
  const goPanel = async (tabName, menuName) => {
    if (phone) await h.click({ css: ".mobile-tab", text: tabName });
    else { await h.click(MENU_BUTTON); await h.sleep(200); await h.click({ css: ".panel-menu-item", text: menuName }); await h.click(MENU_BUTTON); }
    await h.sleep(900);
  };
  await goPanel("Notes", "My Notes");
  const noteTabs = await h.count(".notes-tab-switcher button");
  h.assert(noteTabs === Object.keys(tour.NOTES_TAB_COVERAGE).length, `My Notes has the ${noteTabs} tabs the tour covers`);
  await goPanel("Articles", "Articles");
  const sections = await h.count(".articles-section-header");
  h.assert(sections === Object.keys(tour.ARTICLE_SECTION_COVERAGE).length, `Articles shows the ${sections} sections the tour covers`);

  // -------------------------------------------------------------------------------------------
  h.section("6. stages switched off hide their steps and their words");
  const rowsNow = () => h.backend.tables.feature_release;
  /** Sets stages, adding the row for a key the fake has none for (sql/053's games). */
  const stage = (keys, live) =>
    h.backend.setTable("feature_release", [
      ...rowsNow().filter((r) => !keys.includes(r.feature)),
      ...keys.map((feature) => ({ feature, live, updated_at: null, updated_by: null })),
    ]);
  const off = ["timeline", "library_articles", "games_trivia", "prayer_list", "sermon_notes", "posts_newsfeed", "avatars"];
  stage(off, false);
  await newAccount();
  await h.waitFor(".welcome-tour[open]");
  const few = await walk();
  const gone = ["timeline", "articles", "religions", "games", "daily-name", "twenty-questions", "prayer", "sermon", "posts"];
  h.assert(JSON.stringify(few.map((s) => s.id).filter((i) => i !== "walk")) === JSON.stringify(everyStep.filter((i) => !gone.includes(i))), `member: ${few.length} steps, without ${gone.join(", ")}`);
  const fewText = few.map((s) => s.text).join(" ");
  const named = fewText.match(/timeline|article|religion|\bgames?\b|daily name|20 questions|prayer|sermon|newsfeed|photo/i)?.[0];
  h.assert(!named, `and no mention of them (${named ?? "none"})`);
  await escape();
  stage(off, true);

  const dropped = ["game_bible_trivia", "game_saving_peter", "game_chronology", "game_daily_name", "game_twenty_questions"];
  stage(dropped, false);
  await settle();
  await openFromMenu();
  const some = await walk();
  const games = some.find((s) => s.id === "games");
  h.assert(games && /Fill in the Blank and Scripture Memorization Challenge\./.test(games.body) && !/Trivia|Saving Peter|Chronology|Daily Name|20 Questions|join code/.test(games.body), `games step lists only the live games: ${games?.body}`);
  h.assert(!some.some((s) => s.id === "daily-name" || s.id === "twenty-questions"), "the two newer games' own steps go with their stage");
  await escape();
  stage(["game_daily_name"], true);
  await settle();
  await openFromMenu();
  const daily = (await walk()).map((s) => s.id);
  h.assert(daily.includes("daily-name") && !daily.includes("twenty-questions"), "one back on: only its step returns");
  await escape();
  stage(["game_daily_name", "game_fill_blank", "game_memorization"], false);
  await settle();
  await openFromMenu();
  h.assert(!(await walk()).some((s) => s.id === "games"), "no live game: no games step");
  await escape();
  stage([...dropped, "game_fill_blank", "game_memorization"], true);

  if (phone) {
    h.section("6b. a button the reader took off the bottom bar");
    await h.evaluate(() => localStorage.setItem("mobile-tab-bar-visible-v1", JSON.stringify({ timeline: false })));
    await settle();
    await openFromMenu();
    const t = (await walk()).find((x) => x.id === "timeline");
    h.assert(/On a phone\s*Menu\s*→\s*Timeline/i.test(t.text) && t.ringed.includes("menu"), `points at the menu instead: ${t.text.slice(-110)} (ringed ${t.ringed})`);
    await escape();
    await h.evaluate(() => localStorage.removeItem("mobile-tab-bar-visible-v1"));
  }

  // -------------------------------------------------------------------------------------------
  if (process.env.LOOKS) {
    h.section("7. light, dark, every skin, largest and smallest text, short screens");
    const looks = ["light", "dark", "sticker", "clarity", "midnight", "sage", "skyreader", "trailhead", "highlighter"];
    const [w, hgt] = h.viewport.split("x").map(Number);
    const sizes = phone ? [[w, hgt], [375, 667], [320, 568]] : [[w, hgt], [1024, 600]];
    for (const [vw, vh] of sizes) {
      for (const name of vw === w ? looks : ["light"]) {
        for (const scale of name === "light" || name === "dark" || name === "skyreader" || name === "trailhead" ? ["0.8", "1", "1.8"] : ["1.8"]) {
          await h.evaluate((n, sc) => {
            localStorage.removeItem("app-skin");
            localStorage.setItem("app-theme", n === "dark" ? "dark" : "light");
            if (n !== "light" && n !== "dark") localStorage.setItem("app-skin", n);
            localStorage.setItem("app-text-scale", sc);
          }, name, scale);
          await h.setViewport(vw, vh);
          await h.sleep(1200);
          await openFromMenu();
          const bad = [];
          const run = await walk(async (s) => {
            if (!sound(s) || s.faint.length) bad.push({ id: s.id, card: s.card, readable: s.readable, sideways: s.sideways, buttons: s.buttons.filter((b) => !b.ok || b.h < 44), faint: s.faint });
            if (["bible", "search", "map", "profile"].includes(s.id)) await h.screenshot(`looks-${vw}x${vh}-${name}-${scale}-${s.id}.png`);
          });
          const covering = run.filter((s) => s.covers).map((s) => s.id);
          h.assert(bad.length === 0, `${vw}x${vh} ${name} text ${scale}: ${run.length} steps fit, readable, buttons reachable ${JSON.stringify(bad.slice(0, 3))}`);
          if (covering.length) console.log(`    note: card overlaps the ringed control on: ${covering.join(", ")}`);
          await escape();
        }
      }
    }
    await h.evaluate(() => { localStorage.removeItem("app-skin"); localStorage.setItem("app-theme", "light"); localStorage.removeItem("app-text-scale"); });
    await h.setViewport(w, hgt);
  }

  h.assert(h.consoleErrors.length === 0, `no page errors ${JSON.stringify(h.consoleErrors).slice(0, 400)}`);
}
