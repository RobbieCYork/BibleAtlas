/**
 * Every game's main controls on a phone: on screen without scrolling, above the bottom tab bar, and
 * the element actually under the finger. Each screen is opened in the real built app at several phone
 * sizes, with and without safe-area insets and the seasonal-walk banner, every control is measured,
 * and every other button on the screen is checked to be reachable by scrolling.
 *
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/games-fit.mjs
 *
 * FIT_ONLY=peter,trivia,chrono,blank,memo,twenty   FIT_SIZES=375x667,...   FIT_BANNER=off|on
 * FIT_EXTRAS=0 skips the large-text, other-skin and desktop runs. FIT_SHOTS=0 skips screenshots.
 *
 * Multiplayer rooms are rows put straight into the fake backend, with no Realtime, so this proves
 * the screens, not the server. The iOS on-screen keyboard and Safari's own toolbars are not drawn.
 * Daily Name has its own fit checks in daily-name.mjs.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";

import { MENU_BUTTON } from "../lib/app.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "../../../src/data");

async function loadData(name) {
  const dir = mkdtempSync(join(tmpdir(), "games-fit-data."));
  const bundle = await rolldown({ input: join(DATA, `${name}.ts`), logLevel: "silent" });
  await bundle.write({ file: join(dir, "m.mjs"), format: "esm" });
  const mod = await import(pathToFileURL(join(dir, "m.mjs")).href);
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

// [name, width, height, safe-area top, safe-area bottom]
const ALL_SIZES = [
  ["375x667", 375, 667, 0, 0],
  ["375x667-top20", 375, 667, 20, 0],
  ["390x844-insets", 390, 844, 47, 34],
  ["390x700-insets", 390, 700, 47, 34],
];

export default async function (h) {
  const peter = await loadData("savingPeterWords");
  const quiz = await loadData("gameQuestions");
  const chrono = await loadData("chronologyRounds");
  const blank = await loadData("fillBlankVerses");
  const memo = await loadData("memorizationVerses");

  const env = process.env;
  const only = env.FIT_ONLY ? env.FIT_ONLY.split(",") : null;
  const sizes = ALL_SIZES.filter((s) => !env.FIT_SIZES || env.FIT_SIZES.split(",").includes(s[0]));
  const banners = env.FIT_BANNER === "off" ? [false] : env.FIT_BANNER === "on" ? [true] : [false, true];
  const shots = env.FIT_SHOTS !== "0";

  // The seasonal-walk banner only draws inside its season; a switchable fake date brings it up.
  await h.addInitScript(`(()=>{ if (!sessionStorage.getItem('__dec')) return; const Real = Date; const shift = new Real(2026, 11, 5, 12).getTime() - Real.now();
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [Real.now() + shift])); } static now() { return Real.now() + shift; } }; })()`);

  let variant = null; // { size, banner, scale, skin }
  const now = () => Date.now() + (variant.banner ? new Date(2026, 11, 5, 12).getTime() - Date.now() : 0);

  /** A fresh app with no game state, at the current variant, on Game Center. */
  const fresh = async ({ session = {}, local = {} } = {}) => {
    await h.evaluate(
      (b, scale, skin, session, local) => {
        sessionStorage.removeItem("bible-atlas-active-game-room");
        sessionStorage.removeItem("bible-atlas-active-saving-peter-room");
        if (b) sessionStorage.setItem("__dec", "1");
        else sessionStorage.removeItem("__dec");
        localStorage.setItem("app-text-scale", String(scale));
        if (skin) localStorage.setItem("app-skin", skin);
        else localStorage.removeItem("app-skin");
        localStorage.removeItem("daily-name-v1");
        localStorage.removeItem("bibleAtlas.memorizationChallenge.masteredRefs.v1");
        localStorage.setItem("twenty-questions-howto-v1", "1");
        for (const [k, v] of Object.entries(session)) sessionStorage.setItem(k, v);
        for (const [k, v] of Object.entries(local)) localStorage.setItem(k, v);
      },
      variant.banner,
      variant.scale ?? 1,
      variant.skin ?? null,
      session,
      local
    );
    await h.reload();
    await h.sleep(500);
    if (await h.exists(".mobile-tab-bar")) await h.click({ css: ".mobile-tab", text: "Games" });
    else {
      await h.click(MENU_BUTTON);
      await h.click({ css: ".panel-menu-link", text: "Games" });
    }
    await h.waitFor(".game-center-card");
  };
  const openGame = async (title, opts) => {
    await fresh(opts);
    await h.click({ css: ".game-center-card", text: title });
    await h.waitFor({ css: ".game-header h2", text: title });
  };
  const choose = (title) => h.click({ css: ".game-entry-card", text: title });

  /**
   * must: selectors whose every match has to be fully on screen, inside the game's scrolling area and
   * above the tab bar, and be what a finger lands on — measured without scrolling anything.
   * Everything else tappable must be reachable by scrolling and not covered.
   */
  const check = async (name, must, { shot = name, minH = 0 } = {}) => {
    await h.sleep(250);
    const r = await h.evaluate(async (must) => {
      const root = document.querySelector(".game-mode");
      const body = root.querySelector(".game-body");
      await Promise.all([...root.querySelectorAll("img")].map((i) => i.decode().catch(() => {})));
      const b = body.getBoundingClientRect();
      const tab = document.querySelector(".mobile-tab-bar")?.getBoundingClientRect();
      const floor = Math.min(b.bottom, tab ? tab.top : innerHeight);
      const label = (el) => (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.className).trim().replace(/\s+/g, " ").slice(0, 28);
      const hits = (el, x, y) => { const at = document.elementFromPoint(x, y); return !!at && (el === at || el.contains(at)); };
      const missing = [], hidden = [], heights = {};
      let measured = 0;
      for (const sel of must) {
        const els = [...root.querySelectorAll(sel)];
        if (!els.length) missing.push(sel);
        for (const el of els) {
          measured++;
          const q = el.getBoundingClientRect();
          heights[sel] = Math.min(heights[sel] ?? Infinity, Math.floor(q.height));
          const cx = q.left + q.width / 2;
          const inside = q.height > 0 && q.top >= b.top - 0.5 && q.bottom <= floor + 0.5 && q.left >= -0.5 && q.right <= innerWidth + 0.5;
          if (!inside || !hits(el, cx, q.top + q.height / 2) || !hits(el, cx, q.bottom - 3) || !hits(el, cx, q.top + 3))
            hidden.push(`${label(el)} [${Math.round(q.top)}-${Math.round(q.bottom)} in ${Math.round(b.top)}-${Math.round(floor)}]`);
        }
      }
      const scroll = body.scrollHeight - body.clientHeight;
      const was = body.scrollTop;
      const covered = [], wide = [];
      for (const el of root.querySelectorAll("button, input, select, p, h2, h3, li, .saving-peter-scene")) {
        const q = el.getBoundingClientRect();
        if (q.width > 1 && !el.closest(".game-video-tiles") && (q.left < -0.5 || q.right > innerWidth + 0.5)) wide.push(label(el));
      }
      for (const el of root.querySelectorAll("button:not(:disabled), input:not(:disabled), select")) {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
        const q = el.getBoundingClientRect();
        if (q.width > 1 && !hits(el, q.left + q.width / 2, q.top + q.height / 2)) covered.push(label(el));
      }
      body.scrollTop = was;
      return {
        missing, hidden, heights, measured, scroll,
        covered: covered.slice(0, 5), wide: wide.slice(0, 5),
        sideways: Math.max(body.scrollWidth - body.clientWidth, document.documentElement.scrollWidth - innerWidth),
        banner: !!document.querySelector(".walk-banner"),
      };
    }, must);
    const short = minH ? Object.entries(r.heights).filter(([sel, v]) => /button|key|input|toggle|choice|move/.test(sel) && v < minH) : [];
    const ok = !r.missing.length && !r.hidden.length && !r.covered.length && !r.wide.length && r.sideways <= 0 && !short.length && r.banner === variant.banner;
    const why = ok ? "" : " " + JSON.stringify({ missing: r.missing, hidden: r.hidden.slice(0, 6), hiddenCount: r.hidden.length, covered: r.covered, wide: r.wide, sideways: r.sideways, short, banner: r.banner });
    h.assert(ok, `${name}: ${r.measured - r.hidden.length}/${r.measured} on screen, ${r.scroll > 0 ? `${r.scroll}px scrolls` : "no scroll"}${why}`);
    if (shots && shot) await h.screenshot(`${variant.id}--${shot}.png`);
    return r;
  };

  /* ------------------------------------------------------------ rooms */
  const me = () => h.backend.persona;
  const roster = (roomId, n, key) =>
    Array.from({ length: n }, (_, i) => ({
      id: `p${i}`, room_id: roomId, user_id: i === 0 ? me().id : `feedface-0000-4000-8000-00000000000${i}`,
      display_name: i === 0 ? me().name : ["Priscilla", "Bartholomew", "Maximilian Longname", "Eve", "Joanna", "Silas", "Lydia"][i - 1],
      score: i === 0 ? 6 : 3 - i, joined_at: new Date(Date.now() - 60000 + i).toISOString(),
    }));
  const setRoom = (family, { n = 1, status = "lobby", ids, startedAt = null, answers = [] }) => {
    const sp = family === "peter";
    const t = sp ? ["saving_peter_rooms", "saving_peter_players", "saving_peter_guesses"] : ["game_rooms", "game_players", "game_buzzes"];
    const id = `${family}-room`;
    const room = { id, code: "ABC123", host_id: me().id, status, target_score: 50, winner_id: status === "finished" ? me().id : null, created_at: new Date().toISOString() };
    room[sp ? "round_ids" : "question_ids"] = ids;
    room[sp ? "current_round_index" : "current_question_index"] = 0;
    room[sp ? "current_round_started_at" : "current_question_started_at"] = startedAt;
    h.backend.setTable(t[0], [room]);
    h.backend.setTable(t[1], roster(id, n));
    h.backend.setTable(t[2], answers.map((a, i) => ({ id: `a${i}`, room_id: id, [sp ? "round_index" : "question_index"]: 0, ...a })));
    h.backend.setRpc(sp ? "check_and_advance_saving_peter" : "check_and_advance", () => h.backend.tables[t[0]][0]);
    h.backend.setRpc(sp ? "submit_saving_peter_guess" : "submit_answer", (a) => {
      const p = h.backend.tables[t[1]][0];
      p.score += a.p_correct ? a.p_points : -a.p_points;
      h.backend.tables[t[2]].push({ id: "mine", room_id: id, [sp ? "round_index" : "question_index"]: 0, user_id: p.user_id, answer_index: a.p_answer_index, guess: a.p_guess, correct: a.p_correct });
      return p;
    });
    return { [sp ? "bible-atlas-active-saving-peter-room" : "bible-atlas-active-game-room"]: id };
  };
  const highScores = (table) => h.backend.setTable(table, Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, display_name: `Player ${i + 1}`, score: 50 - i })));

  const TOGGLES = ['.game-video-toggle[aria-label*="microphone"]', '.game-video-toggle[aria-label*="camera"]'];
  const LEAVE = ".game-video-leave";

  /* ------------------------------------------------------------ Saving Peter */
  /** Starts a solo round on a chosen word: pins the shuffle so words[k] is drawn first. */
  const peterSolo = async (level, pick) => {
    await openGame("Saving Peter");
    await choose("Play solo");
    await h.click(`.game-level-option input[value="${level}"]`);
    const words = peter.SAVING_PETER_WORDS[level];
    const k = words.indexOf(pick(words));
    await h.evaluate((n, k) => { let c = 0; Math.random = () => (c++ === n - 1 - k ? 0 : 0.999999); }, words.length, k);
    await h.click(".game-start-button");
    await h.waitFor(".saving-peter-keyboard");
    return words[k];
  };
  const longestBy = (f) => (list) => [...list].sort((a, b) => f(b) - f(a))[0];
  const PLAY = [".saving-peter-scene", ".saving-peter-status", ".saving-peter-clue", ".saving-peter-word", ".saving-peter-key"];
  const sceneHeight = () => h.evaluate(() => Math.round(document.querySelector(".saving-peter-scene").getBoundingClientRect().height));
  const keySize = () => h.evaluate(() => { const k = [...document.querySelectorAll(".saving-peter-key")].map((e) => e.getBoundingClientRect()); return `${Math.floor(Math.min(...k.map((r) => r.width)))}x${Math.floor(Math.min(...k.map((r) => r.height)))}`; });

  const peterScreens = async (quick) => {
    await openGame("Saving Peter");
    await check("peter first screen", [".game-entry-card"], { shot: null });
    await choose("Play solo");
    await check("peter solo setup", [".game-start-button"], { shot: null });

    for (const level of quick ? ["expert"] : peter.SAVING_PETER_LEVELS.map((l) => l.key)) {
      for (const [kind, pick] of [["longest clue", longestBy((w) => w.clue.length)], ["longest word", longestBy((w) => w.word.length * 100 + w.clue.length)]]) {
        const entry = await peterSolo(level, pick);
        const drawn = await h.text(".saving-peter-clue");
        h.assert(drawn === entry.clue.trim(), `pinned the ${kind} word (${entry.word})`);
        await check(`peter solo ${level}, ${kind}`, PLAY, { shot: kind === "longest clue" ? `peter-solo-${level}` : null, minH: 36 });
        console.log(`        scene ${await sceneHeight()}px, smallest key ${await keySize()}`);
      }
    }
    // Won and lost, on the longest word.
    const w = await peterSolo("expert", longestBy((x) => x.word.length * 100 + x.clue.length));
    for (const letter of "QZXJKVWFBGYPMUCDHLRSNIOTAE") if (!w.word.includes(letter) && (await h.exists(".saving-peter-keyboard"))) await h.click({ css: ".saving-peter-key", text: letter });
    await check("peter solo lost", [".saving-peter-scene", ".saving-peter-status", ".saving-peter-word", ".saving-peter-reveal", ".saving-peter-post-game button"]);
    const w2 = await peterSolo("beginner", longestBy((x) => x.clue.length));
    for (const letter of new Set(w2.word)) await h.click({ css: ".saving-peter-key", text: letter });
    await check("peter solo won", [".saving-peter-scene", ".saving-peter-status", ".saving-peter-word", ".saving-peter-post-game button"]);

    highScores("saving_peter_high_scores");
    await openGame("Saving Peter");
    await choose("Create multiplayer game");
    await check("peter multi create", [".game-start-button"], { shot: "peter-multi-create" });
    await openGame("Saving Peter");
    await choose("Join multiplayer game");
    await check("peter multi join", [".games-code-input", ".game-start-button"], { shot: null });

    const longRound = longestBy((id) => peter.resolveSavingPeterRound(id).clue.length)(
      Object.entries(peter.SAVING_PETER_WORDS).flatMap(([level, list]) => list.map((x) => `${level}:${x.word}`))
    );
    const ids = [longRound, longRound];
    for (const n of quick ? [4] : [1, 4]) {
      let session = setRoom("peter", { n, ids });
      await openGame("Saving Peter", { session });
      await h.waitFor(".game-lobby-code");
      await h.sleep(300);
      await check(`peter lobby ${n}p, before choosing camera/mic`, [".game-lobby-code", ".game-media-choice button", ".game-lobby-actions button"], { shot: `peter-lobby-${n}p` });
      await h.click({ css: ".game-media-choice button", text: "Play without camera or mic" });
      await check(`peter lobby ${n}p, chosen`, [".game-lobby-code", ...TOGGLES, LEAVE, ".game-lobby-actions button"], { shot: `peter-lobby-${n}p-chosen` });
    }
    for (const n of quick ? [4] : [1, 2, 4]) {
      const session = setRoom("peter", { n, ids, status: "active", startedAt: new Date(now() + 600000).toISOString() });
      await openGame("Saving Peter", { session });
      await h.waitFor(".saving-peter-guess-input");
      const controls = n > 1 ? [...TOGGLES, LEAVE] : [LEAVE];
      // Every player in a Saving Peter round fits across the screen.
      await check(`peter round ${n}p`, [".game-video-tile", ".saving-peter-scene", ".game-question-prompt", ".saving-peter-guess-input", ".saving-peter-guess-form button", ...controls], { minH: 36 });
      console.log(`        scene ${await sceneHeight()}px`);
      if (n === 4) {
        await h.type(".saving-peter-guess-input", "ZZZZ");
        await h.click(".saving-peter-guess-form button");
        await h.waitFor(".game-question-reveal");
        await check(`peter round ${n}p, guess locked in`, [".game-question-reveal", ".game-question-prompt", ...controls], { shot: "peter-round-locked" });
      }
    }
    let session = setRoom("peter", { n: 4, ids, status: "active", startedAt: new Date(now() - 60000).toISOString() });
    await openGame("Saving Peter", { session });
    await h.waitFor(".game-question-reveal");
    await check("peter round over", [".game-question-reveal", ...TOGGLES, LEAVE], { shot: null });
    await h.waitFor({ css: ".games-secondary-button", text: "Continue" }, { timeout: 15000 });
    await h.sleep(300);
    await check("peter round over, Continue offered", [".game-question-reveal", ".game-question-card > .games-secondary-button", ...TOGGLES, LEAVE], { shot: "peter-round-continue" });
    session = setRoom("peter", { n: 4, ids, status: "finished" });
    await openGame("Saving Peter", { session });
    await h.waitFor(".game-results");
    await check("peter results", [...TOGGLES, ".game-results > .games-primary-button"], { shot: "peter-results" });
  };

  /* ------------------------------------------------------------ Bible Trivia */
  const size = (q) => q.prompt.length + q.choices.reduce((a, c) => a + Math.max(36, c.length), 0);
  const bySize = quiz.ALL_QUESTIONS.filter((q) => q.choices.length === 4).sort((a, b) => size(a) - size(b));
  const QUESTIONS = {
    typical: bySize[Math.floor(bySize.length * 0.5)],
    long: bySize[Math.floor(bySize.length * 0.9)],
    longest: bySize[bySize.length - 1],
  };

  const triviaScreens = async (quick) => {
    highScores("game_high_scores");
    await openGame("Bible Trivia");
    await check("trivia first screen", [".game-entry-card"], { shot: null });
    for (const [title, shot] of [["Play solo", "trivia-setup-solo"], ["Create multiplayer game", "trivia-setup-create"]]) {
      await openGame("Bible Trivia");
      await choose(title);
      await h.waitFor(".games-topic-select");
      await check(`trivia setup (${title})`, [".game-start-button"], { shot });
    }
    await openGame("Bible Trivia");
    await choose("Join multiplayer game");
    await check("trivia join", [".games-code-input", ".game-start-button"], { shot: null });

    const ids = [QUESTIONS.typical.id, QUESTIONS.typical.id];
    for (const n of quick ? [8] : [1, 4, 8]) {
      const session = setRoom("trivia", { n, ids });
      await openGame("Bible Trivia", { session });
      await h.waitFor(".game-lobby-code");
      await h.sleep(300);
      await check(`trivia lobby ${n}p, before choosing camera/mic`, [".game-lobby-code", ".game-media-choice button", ".game-lobby-actions button"], { shot: `trivia-lobby-${n}p` });
      await h.click({ css: ".game-media-choice button", text: "Play without camera or mic" });
      await check(`trivia lobby ${n}p, chosen`, [".game-lobby-code", ...TOGGLES, LEAVE, ".game-lobby-actions button"], { shot: `trivia-lobby-${n}p-chosen` });
    }

    for (const [kind, q] of Object.entries(QUESTIONS)) {
      if (quick && kind !== "longest") continue;
      // The longest questions cannot all be on one phone screen: the buttons stay put, the rest scrolls.
      const body = kind === "longest" ? [] : [".game-question-prompt", ".game-choice-button"];
      for (const n of [1, 4]) {
        const who = n === 1 ? "solo" : "4p";
        let session = setRoom("trivia", { n, ids: [q.id, q.id], status: "active", startedAt: new Date(now() + 600000).toISOString() });
        await openGame("Bible Trivia", { session });
        await h.waitFor(".game-choice-button");
        const controls = n > 1 ? [...TOGGLES, LEAVE] : [LEAVE];
        const action = n === 1 ? [".game-action-button"] : [];
        await check(`trivia ${who} question (${kind})`, [...body, ...controls, ...action], { shot: `trivia-${who}-${kind}`, minH: 28 });
        await h.click(".game-choice-button", { index: 1 });
        await h.waitFor(".game-question-reveal");
        // The reveal: a solo answer ends the round at once; with others it waits.
        const after = kind === "longest" ? [] : n === 1 ? [".game-question-reveal", ".game-choice-button"] : [".game-question-reveal", ".game-choice-button"];
        await check(`trivia ${who} answered (${kind})`, [...after, ...controls, ...action], { shot: `trivia-${who}-${kind}-answered` });
      }
      const session = setRoom("trivia", { n: 4, ids: [q.id, q.id], status: "active", startedAt: new Date(now() - 60000).toISOString() });
      await openGame("Bible Trivia", { session });
      await h.waitFor(".game-question-reveal");
      await check(`trivia 4p time up (${kind})`, [...(kind === "longest" ? [] : [".game-question-reveal", ".game-choice-button"]), ...TOGGLES, LEAVE, ".game-action-button"], { shot: `trivia-4p-${kind}-timeup` });
    }

    await triviaCreate();

    for (const n of quick ? [4] : [1, 4]) {
      const session = setRoom("trivia", { n, ids, status: "finished" });
      await openGame("Bible Trivia", { session });
      await h.waitFor(".game-results");
      await check(`trivia results ${n}p`, [...(n > 1 ? TOGGLES : []), ".game-results > .games-primary-button"], { shot: `trivia-results-${n}p` });
    }
  };

  /** Through the real screens: setup scrolled to its foot, then Create, must open the lobby at its top. */
  const triviaCreate = async () => {
    h.backend.setRpc("create_game_room", () => {
      setRoom("trivia", { n: 1, ids: [QUESTIONS.typical.id, QUESTIONS.typical.id] });
      return h.backend.tables.game_rooms[0];
    });
    await openGame("Bible Trivia");
    await choose("Create multiplayer game");
    await h.waitFor(".games-topic-select");
    await h.evaluate(() => (document.querySelector(".game-mode .game-body").scrollTop = 9999));
    await h.click(".game-start-button");
    await h.waitFor(".game-lobby-code");
    await check("trivia lobby opened from a scrolled setup", [".game-lobby-code", ".game-lobby-actions button"], { shot: null });
  };

  /* ------------------------------------------------------------ Chronology */
  const chronoStart = async (level) => {
    await openGame("Chronology");
    await h.click(`.game-level-option input[value="${level}"]`);
    await h.click(".game-start-button");
    await h.waitFor(".chronology-card");
  };
  const chronoScreens = async (quick) => {
    await openGame("Chronology");
    await check("chronology setup", [".game-start-button"], { shot: null });
    for (const level of quick ? ["expert"] : chrono.CHRONOLOGY_LEVELS.map((l) => l.key)) {
      await chronoStart(level);
      const cards = await h.count(".chronology-card");
      // Cards are dealt at random. Short titles stand for an easy deal; the list may scroll for a long one.
      const sample = ["Fall of Jerusalem", "The Exodus from Egypt", "Council of Nicaea", "Birth of Jesus", "Luther posts the 95 Theses", "King David reigns", "Pentecost"];
      await h.evaluate((t) => document.querySelectorAll(".chronology-card-title").forEach((el, i) => (el.textContent = t[i % t.length])), sample);
      // Seven cards with 40px arrows need about 450px of play area. Where there is less, the list scrolls.
      const room = await h.evaluate(() => document.querySelector(".game-mode .game-body").clientHeight);
      const tight = cards >= 7 && room < 450;
      await check(`chronology ${level}, short titles (${cards} cards, ${tight ? "the list scrolls" : "all on screen"})`, [".chronology-hud", ...(tight ? [] : [".chronology-card", ".chronology-move"]), ".chronology-btn-primary"], { shot: `chrono-${level}-short`, minH: 22 });
      await chronoStart(level);
      await check(`chronology ${level}, a real deal`, [".chronology-btn-primary"], { shot: `chrono-${level}` });
      const move = await h.evaluate(() => { const r = [...document.querySelectorAll(".chronology-move")].map((e) => e.getBoundingClientRect()); return `${Math.round(Math.min(...r.map((x) => x.width)))}x${Math.round(Math.min(...r.map((x) => x.height)))}`; });
      console.log(`        arrow buttons ${move}`);
      await h.click({ css: ".chronology-btn-primary", text: "Check Order" });
      await h.waitFor({ css: ".chronology-btn-primary", text: "→" });
      await check(`chronology ${level}, checked`, [".chronology-btn-primary"], { shot: level === "expert" ? "chrono-expert-checked" : null });
    }
    for (let guard = 0; guard < 40 && !(await h.exists(".chronology-gameover")); guard++) {
      if (await h.exists({ css: ".chronology-btn-primary", text: "Check Order" })) await h.click({ css: ".chronology-btn-primary", text: "Check Order" });
      await h.click(".chronology-btn-primary");
    }
    await check("chronology game over", [".chronology-gameover-actions button"], { shot: null });
  };

  /* ------------------------------------------------------------ Fill in the Blank */
  const blankScreens = async (quick) => {
    await openGame("Fill in the Blank");
    await check("fill-in-blank setup", [".game-start-button"], { shot: null });
    for (const level of quick ? ["expert"] : blank.DIFFICULTY_LEVELS.map((l) => l.key)) {
      const list = blank.FILL_BLANK_VERSES.filter((v) => v.difficulty === level);
      if (!list.length) continue;
      const verse = longestBy((v) => v.words.join(" ").length)(list);
      await openGame("Fill in the Blank");
      await h.click(`.game-level-option input[value="${level}"]`);
      await h.evaluate((n, k) => { let c = 0; Math.random = () => (c++ === n - 1 - k ? 0 : 0.999999); }, list.length, list.indexOf(verse));
      await h.click(".game-start-button");
      await h.waitFor(".fillblank-input");
      await check(`fill-in-blank ${level}, longest verse (${verse.reference})`, [".fillblank-input", ".fillblank-btn-primary"], { shot: `blank-${level}` });
      await h.click({ css: ".fillblank-btn-primary", text: "Check Answer" });
      await check(`fill-in-blank ${level}, answer shown`, [".fillblank-btn-primary"], { shot: null });
    }
    await openGame("Fill in the Blank");
    await h.click(".game-start-button");
    for (let life = 0; life < 3; life++) {
      await h.click({ css: ".fillblank-btn-primary", text: "Check Answer" });
      if (life < 2) await h.click({ css: ".fillblank-btn-primary", text: "Next Verse" });
    }
    await h.waitFor(".fillblank-gameover");
    await check("fill-in-blank game over", [".fillblank-gameover-actions button"], { shot: null });
  };

  /* ------------------------------------------------------------ memorization */
  const memoScreens = async () => {
    const sorted = [...memo.MEMORIZATION_VERSES].sort((a, b) => a.text.length - b.text.length);
    const samples = { shortest: sorted[0], typical: sorted[Math.floor(sorted.length / 2)], longest: sorted.at(-1) };
    for (const [kind, verse] of Object.entries(samples)) {
      await openGame("Scripture Memorization Challenge", { local: {} });
      await h.type(".memchallenge-search", verse.reference);
      await h.click({ css: ".memchallenge-verse-row", text: verse.reference });
      await check(`memorization ready (${kind}, ${verse.reference})`, [".memchallenge-btn-primary"], { shot: kind === "longest" ? "memo-ready-longest" : null });
      await h.click({ css: ".memchallenge-btn-primary", text: "Ready" });
      await h.waitFor(".memchallenge-input");
      await check(`memorization round (${kind})`, [".memchallenge-input", ".memchallenge-btn-primary"], { shot: `memo-round-${kind}` });
    }
    // The review after mastering a new verse blanks every word of the old ones: a long one scrolls
    // above the pinned Check. Reached by mastering the second-shortest verse, typing its blanks.
    for (const [kind, old] of [["shortest", sorted[0]], ["longest", sorted.at(-1)]]) {
      const next = sorted[1];
      const words = next.text.split(/\s+/);
      await openGame("Scripture Memorization Challenge", { local: { "bibleAtlas.memorizationChallenge.masteredRefs.v1": JSON.stringify([old.reference]) } });
      await h.type(".memchallenge-search", next.reference);
      await h.click({ css: ".memchallenge-verse-row", text: next.reference });
      await h.click(".memchallenge-btn-primary");
      for (let round = 0; round < 8 && !(await h.exists(".memchallenge-review-banner")); round++) {
        await h.waitFor(".memchallenge-input:not(:disabled)");
        const hidden = await h.evaluate((all) => [...document.querySelector(".memchallenge-verse-text").children].map((k, i) => (k.querySelector("input") ? all[i] : null)).filter(Boolean), words);
        for (let i = 0; i < hidden.length; i++) await h.evaluate((i) => document.querySelectorAll(".memchallenge-input")[i].setAttribute("data-n", i), i);
        for (let i = 0; i < hidden.length; i++) await h.type(`.memchallenge-input[data-n="${i}"]`, hidden[i]);
        await h.click(".memchallenge-btn-primary");
        await h.sleep(1700);
      }
      await h.waitFor(".memchallenge-review-banner");
      await check(`memorization review (${kind}, ${old.reference})`, [...(kind === "shortest" ? [".memchallenge-input"] : []), ".memchallenge-btn-primary"], { shot: `memo-review-${kind}` });
    }
    await h.evaluate(() => localStorage.removeItem("bibleAtlas.memorizationChallenge.masteredRefs.v1"));
  };

  /* ------------------------------------------------------------ 20 Questions */
  const twentyScreens = async () => {
    await openGame("20 Questions");
    await check("20 questions setup", [".game-start-button"], { shot: null });
    await h.click(".game-start-button");
    await h.waitFor(".tq-question");
    await check("20 questions board", [".tq-guess-open", ".tq-ask .tq-search", ".tq-chip"], { shot: "twenty-board" });
    await h.click(".tq-guess-open");
    await h.waitFor(".tq-guess-card");
    await h.sleep(500);
    await check("20 questions guess card", [".tq-guess-actions button"], { shot: "twenty-guess" });
  };

  const GROUPS = { peter: peterScreens, trivia: triviaScreens, chrono: chronoScreens, blank: blankScreens, memo: memoScreens, twenty: twentyScreens };
  const run = async (v, names, quick) => {
    variant = v;
    await h.cdp("Emulation.setSafeAreaInsetsOverride", { insets: { top: v.size[3], bottom: v.size[4] } });
    await h.setViewport(v.size[1], v.size[2]);
    for (const name of names) {
      h.section(`${name} — ${v.id}`);
      await GROUPS[name](quick);
    }
  };

  const names = Object.keys(GROUPS).filter((n) => !only || only.includes(n));
  for (const banner of banners) {
    for (const size of sizes) await run({ size, banner, id: `${size[0]}${banner ? "-banner" : ""}` }, names, false);
  }

  /** With too much to fit: the control that matters stays on screen while the rest scrolls. */
  const PINNED = {
    peter: async () => {
      await peterSolo("expert", longestBy((w) => w.word.length * 100 + w.clue.length));
      await check("peter solo expert: keyboard", [".saving-peter-key"]);
      const ids = ["expert:PROPITIATION", "expert:PROPITIATION"].map((id) => (peter.resolveSavingPeterRound(id) ? id : `expert:${peter.SAVING_PETER_WORDS.expert[0].word}`));
      let session = setRoom("peter", { n: 4, ids, status: "active", startedAt: new Date(now() + 600000).toISOString() });
      await openGame("Saving Peter", { session });
      await h.waitFor(".saving-peter-guess-input");
      await check("peter round: guess box and button", [".saving-peter-guess-input", ".saving-peter-guess-form button"]);
      session = setRoom("peter", { n: 4, ids });
      await openGame("Saving Peter", { session });
      await h.waitFor(".game-lobby-code");
      await check("peter lobby: Start and Leave", [".game-lobby-actions button"]);
    },
    trivia: async () => {
      const q = QUESTIONS.longest;
      let session = setRoom("trivia", { n: 1, ids: [q.id, q.id], status: "active", startedAt: new Date(now() + 600000).toISOString() });
      await openGame("Bible Trivia", { session });
      await h.waitFor(".game-choice-button");
      await check("trivia solo: Skip", [".game-action-button"]);
      session = setRoom("trivia", { n: 4, ids: [q.id, q.id], status: "active", startedAt: new Date(now() - 60000).toISOString() });
      await openGame("Bible Trivia", { session });
      await h.waitFor(".game-question-reveal");
      await check("trivia 4p: Continue, camera, mic, Leave", [".game-action-button", ...TOGGLES, LEAVE]);
      session = setRoom("trivia", { n: 4, ids: [q.id, q.id] });
      await openGame("Bible Trivia", { session });
      await h.waitFor(".game-lobby-code");
      await check("trivia lobby: Start and Leave", [".game-lobby-actions button"]);
      await openGame("Bible Trivia");
      await choose("Play solo");
      await h.waitFor(".games-topic-select");
      await check("trivia setup: Start", [".game-start-button"]);
    },
    chrono: async () => {
      await chronoStart("expert");
      await check("chronology expert: Check Order", [".chronology-btn-primary"]);
      await h.click(".chronology-btn-primary");
      await check("chronology expert: Next Round", [".chronology-btn-primary"]);
    },
    blank: async () => {
      await openGame("Fill in the Blank");
      await h.click('.game-level-option input[value="hard"]');
      await h.click(".game-start-button");
      await h.waitFor(".fillblank-input");
      await check("fill-in-blank: Check Answer", [".fillblank-btn-primary"]);
      await h.click(".fillblank-btn-primary");
      await check("fill-in-blank: Next Verse", [".fillblank-btn-primary"]);
    },
    memo: async () => {
      const verse = [...memo.MEMORIZATION_VERSES].sort((a, b) => b.text.length - a.text.length)[0];
      await openGame("Scripture Memorization Challenge");
      await h.type(".memchallenge-search", verse.reference);
      await h.click({ css: ".memchallenge-verse-row", text: verse.reference });
      await check("memorization: Ready", [".memchallenge-btn-primary"]);
      await h.click(".memchallenge-btn-primary");
      await h.waitFor(".memchallenge-input");
      await check("memorization: Check", [".memchallenge-btn-primary"]);
    },
  };

  if (env.FIT_EXTRAS !== "0") {
    // Largest text and a skin with a floating tab bar: nothing needs to fit, but nothing may be stuck
    // behind a bar, and the action button stays on screen.
    for (const [id, extra] of [["large-text", { scale: 1.8 }], ["skin-midnight", { skin: "midnight" }]]) {
      variant = { size: ALL_SIZES[0], banner: false, id, ...extra };
      await h.cdp("Emulation.setSafeAreaInsetsOverride", { insets: { top: 0, bottom: 0 } });
      await h.setViewport(375, 667);
      h.section(`${id} — 375x667`);
      for (const [name, f] of Object.entries(PINNED)) if (!only || only.includes(name)) await f();
    }
  }

  const real = h.consoleErrors.filter((e) => !/openfreemap|bible-api|Failed to fetch|WebSocket/i.test(e));
  h.assert(real.length === 0, `no page errors ${real.slice(0, 3).join(" | ")}`);
}
