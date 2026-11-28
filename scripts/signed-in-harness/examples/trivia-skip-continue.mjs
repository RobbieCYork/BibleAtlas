/**
 * Bible Trivia's Skip and Continue buttons, from the real built app.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/trivia-skip-continue.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 375x667 --script scripts/signed-in-harness/examples/trivia-skip-continue.mjs
 *
 * One player: Skip before answering (scored as a wrong answer), Continue after, and running out of
 * time takes the same points as a wrong answer, once, before the game moves on. Two players: no Skip,
 * Continue only once the round is over, and running out of time scores nothing. Either way the revealed answer holds four seconds, counted
 * down on the button, then the game moves on by itself; Continue moves sooner. The countdown stops
 * while the page is hidden, and a wrong device clock doesn't shorten a question that arrives live.
 * (trivia-hold.mjs checks the hold with two real browsers.) The room RPCs are fakes that
 * copy the rules of submit_answer() and check_and_advance() (sql/000_baseline.sql) and there is no
 * Realtime, so another player's answer is only seen when this client refetches. The real SQL is not
 * exercised here.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { MENU_BUTTON } from "../lib/app.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "../../../src/data");

async function loadData(name) {
  const dir = mkdtempSync(join(tmpdir(), "trivia-data."));
  const bundle = await rolldown({ input: join(DATA, `${name}.ts`) });
  await bundle.write({ file: join(dir, "m.mjs"), format: "esm" });
  const mod = await import(pathToFileURL(join(dir, "m.mjs")).href);
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

export default async function (h) {
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = await h.evaluate(() => `${innerWidth}x${innerHeight}`);
  const shot = (name) => h.screenshot(`${name}-${dev}.png`);
  const q = await loadData("gameQuestions");
  const me = h.backend.persona;
  const OTHER = "00000000-0000-4000-8000-0000000000ff";

  const room = () => h.backend.tables.game_rooms?.[0];
  const player = (id = me.id) => h.backend.tables.game_players.find((p) => p.user_id === id);
  const buzzes = () => h.backend.tables.game_buzzes;
  const question = () => q.getQuestionById(room().question_ids[room().current_question_index]);
  const calls = { submit: [], advance: [] };
  let refuseAdvance = 0; // refuse this many check_and_advance calls, as a server whose clock is behind would
  let stampSkew = 0; // added to the next question's stamp: what a device whose clock is off by that much sees

  function submit(userId, a) {
    const r = room();
    if (r.status !== "active" || r.current_question_index !== a.p_question_index) throw { code: "P0001", message: "This question is no longer active" };
    if (buzzes().some((b) => b.question_index === a.p_question_index && b.user_id === userId)) throw { status: 409, code: "23505", message: "duplicate answer" };
    const seated = h.backend.tables.game_players.length;
    const first = seated > 1 && !buzzes().some((b) => b.question_index === a.p_question_index && b.correct);
    buzzes().push({ id: `b${buzzes().length}`, room_id: r.id, question_index: a.p_question_index, user_id: userId, answer_index: a.p_answer_index, correct: a.p_correct, buzzed_at: new Date().toISOString() });
    const p = player(userId);
    p.score += a.p_correct ? a.p_points * (first ? 2 : 1) : -a.p_points;
    return { ...p };
  }
  function advance(a) {
    const r = room();
    if (r.status !== "active" || r.current_question_index !== a.p_question_index) return { ...r };
    const answered = buzzes().filter((b) => b.question_index === a.p_question_index).length;
    if (answered < h.backend.tables.game_players.length && Date.now() - new Date(r.current_question_started_at) < 15000) throw { code: "P0001", message: "Question still in progress" };
    const next = a.p_question_index + 1;
    if (next >= r.question_ids.length) r.status = "finished";
    r.current_question_index = next;
    r.current_question_started_at = new Date(Date.now() + stampSkew).toISOString();
    return { ...r };
  }

  h.backend.setRpc("create_game_room", (a) => {
    const r = { id: `room-${Math.random().toString(36).slice(2)}`, code: "ABC123", host_id: me.id, status: "lobby", question_ids: a.p_question_ids, current_question_index: -1, current_question_started_at: null, target_score: 10000, winner_id: null, created_at: new Date().toISOString() };
    h.backend.setTable("game_rooms", [r]);
    h.backend.setTable("game_players", [{ room_id: r.id, user_id: me.id, display_name: me.name, score: 0, joined_at: r.created_at }]);
    h.backend.setTable("game_buzzes", []);
    return r;
  });
  h.backend.setRpc("start_game_room", () => Object.assign(room(), { status: "active", current_question_index: 0, current_question_started_at: new Date().toISOString() }));
  h.backend.setRpc("leave_game_room", () => { h.backend.setTable("game_rooms", []); return null; });
  h.backend.setRpc("submit_answer", (a) => { calls.submit.push(a); return submit(me.id, a); });
  h.backend.setRpc("check_and_advance", (a) => {
    calls.advance.push({ ...a, at: Date.now() });
    if (refuseAdvance > 0) { refuseAdvance--; throw { code: "P0001", message: "Question still in progress" }; }
    return advance(a);
  });

  const openGames = async () => {
    await h.reload(); await h.sleep(900);
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else { await h.click(MENU_BUTTON); await h.click({ css: ".panel-menu-link", text: "Games" }); }
    await h.click({ css: ".game-center-card", text: "Bible Trivia" });
  };
  const startSolo = async () => {
    await h.evaluate(() => sessionStorage.removeItem("bible-atlas-active-game-room"));
    await openGames();
    await h.click({ css: ".game-entry-card", text: "Play solo" });
    await h.waitFor(".games-difficulty");
    await h.click(".game-start-button");
    await h.waitFor(".game-choice-button");
    await h.waitFor(".game-action-button");
  };
  const resume = async () => { await openGames(); await h.waitFor(".game-choice-button"); await h.sleep(400); };

  const screen = () =>
    h.evaluate(() => {
      // The button's words; the countdown beside them is read on its own.
      const buttons = [...document.querySelectorAll(".game-action-button")].map((b) => `${b.firstChild.textContent.trim()}${b.disabled ? " (disabled)" : ""}`);
      return {
        buttons: buttons.join(", "),
        countdown: document.querySelector(".game-action-countdown")?.textContent ?? "",
        timer: document.querySelector(".game-question-timer")?.textContent.trim() ?? "",
        index: document.querySelector(".game-question-index")?.textContent.trim(),
        reveal: document.querySelector(".game-question-reveal")?.textContent.trim() ?? "",
        right: [...document.querySelectorAll(".game-choice-correct")].map((e) => e.textContent.trim()),
        wrong: document.querySelectorAll(".game-choice-wrong").length,
      };
    });
  /** The button is fully on screen, above the tab bar, and a tap at its centre would hit it — with the
   * page wherever it happens to be scrolled, here both ends. */
  const reachable = async (name) => {
    const r = await h.evaluate(() => {
      const body = document.querySelector(".game-body");
      const was = body.scrollTop;
      const results = [0, body.scrollHeight].map((top) => {
        body.scrollTop = top;
        const el = document.querySelector(".game-action-button");
        const b = el.getBoundingClientRect();
        const bar = document.querySelector(".mobile-tab-bar")?.getBoundingClientRect();
        const floor = bar && bar.height ? bar.top : innerHeight;
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return { ok: b.height >= 44 && b.top >= 0 && b.bottom <= floor + 0.5 && b.left >= 0 && b.right <= innerWidth + 0.5 && (hit === el || el.contains(hit)), bottom: Math.round(b.bottom), floor: Math.round(floor) };
      });
      body.scrollTop = was;
      return results;
    });
    h.assert(r.every((x) => x.ok), `${name}: button on screen and above the tab bar at both scroll ends (${r.map((x) => `${x.bottom}<=${x.floor}`).join(", ")})`);
  };
  /** The element is showing in full without any scrolling by this script: under the header and above
   * the button. */
  const showing = async (selector, label) => {
    const r = await h.evaluate((sel) => {
      const el = document.querySelector(sel).getBoundingClientRect();
      const top = document.querySelector(".game-body").getBoundingClientRect().top;
      const floor = document.querySelector(".game-action-bar").getBoundingClientRect().top;
      return { top: Math.round(el.top), bottom: Math.round(el.bottom), from: Math.round(top), to: Math.round(floor) };
    }, selector);
    h.assert(r.top >= r.from - 1 && r.bottom <= r.to + 1, `${label} is showing between the header and the button (${r.top}-${r.bottom} in ${r.from}-${r.to})`);
  };
  /** Two real clicks at one spot, 80ms apart — the second lands on whatever has taken the button's place. */
  const doubleTap = async () => {
    const at = await h.evaluate(() => { const b = document.querySelector(".game-action-button").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    const tap = async () => { for (const type of ["mousePressed", "mouseReleased"]) await h.cdp("Input.dispatchMouseEvent", { type, x: at.x, y: at.y, button: "left", clickCount: 1 }); };
    await tap(); await h.sleep(80); await tap();
  };
  const press = (text) => h.click({ css: ".game-action-button", text });
  const settle = () => h.sleep(700); // past the double-tap window
  /** Start noting, inside the page, when the answer appears, each countdown value, and when the next
   * question (or the results) replaces it. */
  const watch = () =>
    h.evaluate(() => {
      window.__w?.observer.disconnect();
      const index = () => document.querySelector(".game-question-index")?.textContent.trim() ?? "";
      const w = (window.__w = { from: index(), reveal: null, gone: null, counts: [] });
      const look = () => {
        const over = document.querySelector(".game-action-countdown");
        if (w.reveal === null && over) w.reveal = performance.now();
        if (over && w.counts.at(-1) !== over.textContent) w.counts.push(over.textContent);
        if (w.gone === null && w.reveal !== null && (index() !== w.from || document.querySelector(".game-results"))) w.gone = performance.now();
      };
      w.observer = new MutationObserver(look);
      w.observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
      look();
    });
  /** Waits for the game to move on by itself and checks it held about four seconds. */
  const heldFour = async (label) => {
    await h.evaluate(async () => { for (let i = 0; i < 300 && window.__w.gone === null; i++) await new Promise((r) => setTimeout(r, 100)); });
    const w = await h.evaluate(() => ({ held: window.__w.gone === null ? null : window.__w.gone - window.__w.reveal, counts: window.__w.counts.join(" ") }));
    h.assert(w.held !== null && w.held >= 3950 && w.held < 5000, `${label}: moved on by itself after ${Math.round(w.held)}ms`);
    h.assert(w.counts === "4 3 2 1", `${label}: the button counted ${w.counts}`);
  };
  const setHidden = (hidden) =>
    h.evaluate((hidden) => { Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden }); document.dispatchEvent(new Event("visibilitychange")); }, hidden);

  h.section(`One player (${dev})`);
  await startSolo();
  let s = await screen();
  h.assert(s.buttons === "Skip", `before answering: ${s.buttons}`);
  await reachable("question, Skip");
  await shot("solo-skip");
  let first = question();
  await press("Skip");
  await h.waitFor(".game-question-reveal");
  await h.sleep(300);
  s = await screen();
  const sent = calls.submit.at(-1);
  h.assert(calls.submit.length === 1 && sent.p_answer_index === -1 && sent.p_correct === false && sent.p_points === first.points, `skip is sent as a wrong answer worth ${first.points}`);
  h.assert(player().score === -first.points && buzzes().length === 1, `score is ${player().score}, one answer recorded`);
  h.assert(s.reveal.includes(`Not quite — that's -${first.points}`) && s.reveal.includes(first.choices[first.correctIndex]), `feedback: ${s.reveal}`);
  h.assert(s.right.length === 1 && s.right[0] === first.choices[first.correctIndex] && s.wrong === 0, "correct choice highlighted, nothing marked as chosen");
  h.assert(s.buttons === "Continue", `after skipping: ${s.buttons}`);
  await showing(".game-question-reveal", "the answer");
  await shot("solo-skipped");
  await reachable("skipped, Continue");
  s = await screen();
  h.assert(calls.advance.length === 0 && s.index.startsWith("Question 1 ") && /^[1-4]$/.test(s.countdown), `the answer is still up, counting down (${s.countdown})`);
  await shot("solo-countdown");
  await settle();

  let t0 = Date.now();
  await press("Continue");
  await h.waitFor({ css: ".game-question-index", text: "Question 2 " });
  const took = Date.now() - t0;
  await h.sleep(200);
  s = await screen();
  h.assert(calls.advance.length === 1 && s.buttons === "Skip" && s.reveal === "" && took < 1500, `Continue moves on in ${took}ms to a fresh question: ${s.buttons}`);
  await showing(".game-question-prompt", "the new question");

  let before = player().score;
  let now = question();
  await h.click({ css: ".game-choice-button", text: now.choices[now.correctIndex] });
  await h.waitFor({ css: ".game-action-button", text: "Continue" });
  await h.sleep(1400);
  s = await screen();
  h.assert(player().score === before + now.points && s.reveal.includes(`Correct! +${now.points}`) && s.buttons === "Continue" && s.index.startsWith("Question 2 "), `right answer: no double bonus alone, "${s.reveal}", still on question 2`);
  await shot("solo-correct");
  await press("Continue");
  await h.waitFor({ css: ".game-question-index", text: "Question 3 " });
  await settle();

  h.section("Double taps");
  let submits = calls.submit.length;
  let advances = calls.advance.length;
  await doubleTap(); // on Skip
  await h.sleep(1200);
  s = await screen();
  h.assert(calls.submit.length === submits + 1 && calls.advance.length === advances && s.index.startsWith("Question 3 ") && s.buttons === "Continue", `double tap on Skip: one answer, no advance, "${s.buttons}"`);
  await doubleTap(); // on Continue
  await h.sleep(1200);
  s = await screen();
  h.assert(calls.advance.length === advances + 1 && calls.submit.length === submits + 1 && s.index.startsWith("Question 4 ") && s.buttons === "Skip", `double tap on Continue: one advance, the next question not skipped (${s.index})`);

  h.section("The answer holds four seconds, then the game moves on");
  await watch();
  advances = calls.advance.length;
  await h.click(".game-choice-button");
  await heldFour("after answering");
  h.assert(calls.advance.length === advances + 1 && room().current_question_index === 4, `one call, one question forward (index ${room().current_question_index})`);
  await settle();
  await watch();
  await press("Skip");
  await heldFour("after Skip");
  h.assert(room().current_question_index === 5, "one question forward");
  s = await screen();
  h.assert(s.buttons === "Skip" && s.countdown === "", "the new question has no countdown");
  await settle();
  await watch();
  advances = calls.advance.length;
  now = question();
  before = player().score;
  submits = calls.submit.length;
  await h.sleep(13000); // (running the full 15 seconds out)
  await h.waitFor({ css: ".game-question-reveal", text: "that's" });
  s = await screen();
  const late = calls.submit.at(-1);
  h.assert(calls.submit.length === submits + 1 && late.p_answer_index === -2 && late.p_correct === false && late.p_points === now.points, `time-up is sent once, as a wrong answer worth ${now.points}`);
  h.assert(player().score === before - now.points, `score ${before} -> ${player().score}`);
  h.assert(s.reveal.includes(`Time's up — that's -${now.points}`) && s.reveal.includes(now.choices[now.correctIndex]) && s.right.length === 1 && s.wrong === 0, `feedback: ${s.reveal}`);
  h.assert((await h.text(".game-question-answered-count")).trim().startsWith("0/1"), "a timed-out question doesn't read as answered");
  await shot("solo-timeup");
  await heldFour("after time runs out");
  h.assert(player().score === before - now.points && calls.submit.length === submits + 1, "charged once");
  h.assert(calls.advance.length === advances + 1 && room().current_question_index === 6, "one call, one question forward");

  h.section("A tap meant for Continue as the game moves on doesn't skip the next question");
  await settle();
  await press("Skip");
  submits = calls.submit.length;
  await h.waitFor({ css: ".game-question-index", text: "Question 8 " }, { timeout: 8000 });
  await press("Skip");
  await h.sleep(300);
  h.assert(calls.submit.length === submits && (await screen()).buttons === "Skip", "ignored within 600ms of the new question");
  await settle();
  await press("Skip");
  await h.waitFor(".game-question-reveal");
  h.assert(calls.submit.length === submits + 1, "and works after that");

  h.section("The countdown stops while the page is hidden");
  advances = calls.advance.length;
  await setHidden(true);
  await h.sleep(5500);
  s = await screen();
  h.assert(calls.advance.length === advances && s.countdown === "" && s.index.startsWith("Question 8 "), "hidden for 5.5s: no advance");
  await watch();
  await setHidden(false);
  await heldFour("once visible again");

  h.section("A device clock that disagrees with the server");
  for (const [skew, label] of [[-9000, "9s fast"], [9000, "9s slow"]]) {
    await settle();
    stampSkew = skew;
    await press("Skip");
    await h.waitFor({ css: ".game-action-button", text: "Continue" });
    await settle();
    const was = room().current_question_index;
    await press("Continue");
    await h.waitFor({ css: ".game-question-index", text: `Question ${was + 2} ` });
    await h.sleep(300);
    s = await screen();
    h.assert(/1[45]s/.test(s.timer) && s.reveal === "", `clock ${label}: a question arriving live still gets its 15 seconds (${s.timer})`);
  }
  stampSkew = 0;

  h.section("Time runs out while away");
  await settle();
  before = player().score;
  now = question();
  submits = calls.submit.length;
  advances = calls.advance.length;
  room().current_question_started_at = new Date(Date.now() - 20000).toISOString();
  await resume();
  await h.waitFor({ css: ".game-question-reveal", text: "that's" });
  s = await screen();
  const timedOut = room().current_question_index;
  h.assert(s.reveal.includes(`Time's up — that's -${now.points}`) && s.buttons === "Continue" && player().score === before - now.points && calls.submit.length === submits + 1 && calls.advance.length === advances, `rejoined after time ran out: "${s.reveal}" — score ${before} -> ${player().score}, counting ${s.countdown}`);
  await reachable("time up");
  await resume();
  await h.sleep(300);
  s = await screen();
  h.assert(player().score === before - now.points && buzzes().filter((b) => b.question_index === timedOut).length === 1 && s.reveal.includes(`Time's up — that's -${now.points}`), `reloaded again: not charged twice, "${s.reveal}"`);
  submits = calls.submit.length;
  await press("Continue");
  await h.waitFor({ css: ".game-question-index", text: `Question ${timedOut + 2} ` });
  h.assert(calls.submit.length === submits, "Continue moves on sooner");

  // What happens to the points when the request goes wrong. Each starts on a question with a few
  // seconds left.
  const nearlyExpired = async () => {
    buzzes().length = 0;
    room().current_question_started_at = new Date(Date.now() - 8000).toISOString();
    await resume();
    h.assert((await screen()).buttons === "Skip", `(time still left: ${(await screen()).timer})`);
  };
  /** Makes the next `n` submit_answer requests fail inside the page, as a dropped connection would. */
  const dropSubmits = (n) =>
    h.evaluate((n) => {
      window.__drop = n;
      window.__dropped = 0;
      if (window.__realFetch) return;
      window.__realFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        if (String(input?.url ?? input).includes("rpc/submit_answer") && window.__drop > 0) { window.__drop--; window.__dropped++; return Promise.reject(new TypeError("Failed to fetch")); }
        return window.__realFetch(input, init);
      };
    }, n);

  h.section("Time runs out with the connection down");
  await settle();
  await nearlyExpired();
  before = player().score;
  now = question();
  let was = room().current_question_index;
  await dropSubmits(4);
  advances = calls.advance.length;
  await h.waitFor({ css: ".game-action-button", text: "Continue" }, { timeout: 10000 });
  await h.sleep(600);
  await press("Continue");
  await h.sleep(3500);
  s = await screen();
  h.assert(calls.advance.length === advances && player().score === before && room().current_question_index === was && s.buttons === "Continue (disabled)", `while it can't be sent the game waits, even after Continue (${s.buttons})`);
  await h.waitFor({ css: ".game-question-index", text: `Question ${was + 2} ` }, { timeout: 12000 });
  h.assert(player().score === before - now.points && (await h.evaluate(() => window.__dropped)) === 4, `sent on the fifth try, charged once (${before} -> ${player().score}), then moved on`);

  h.section("An answer that fails to send as the time runs out");
  await settle();
  await nearlyExpired();
  before = player().score;
  now = question();
  submits = calls.submit.length;
  await dropSubmits(1);
  await h.click({ css: ".game-choice-button", text: now.choices[now.correctIndex] });
  await h.waitFor({ css: ".game-question-reveal", text: "Correct" }, { timeout: 8000 });
  h.assert(player().score === before + now.points && calls.submit.length === submits + 1 && calls.submit.at(-1).p_answer_index === now.correctIndex, `the chosen answer is sent again, not a time-out (${before} -> ${player().score})`);

  h.section("The server won't take the time-out");
  for (const [code, tries, label] of [["P0001", 1, "refusal"], ["XX000", 3, "server error"]]) {
    await settle();
    let refused = 0;
    h.backend.setRpc("submit_answer", () => { refused++; throw { status: code === "P0001" ? 400 : 500, code, message: "no" }; });
    buzzes().length = 0;
    room().current_question_started_at = new Date(Date.now() - 20000).toISOString();
    was = room().current_question_index;
    before = player().score;
    await resume();
    await h.waitFor({ css: ".game-question-index", text: `Question ${was + 2} ` }, { timeout: 14000 });
    h.assert(refused === tries && player().score === before, `${label}: asked ${refused} time(s), then the game still moved on`);
  }
  h.backend.setRpc("submit_answer", (a) => { calls.submit.push(a); return submit(me.id, a); });
  const resumed = room().current_question_index;

  h.section("The server refuses the first advance");
  await settle();
  await press("Skip");
  await h.waitFor({ css: ".game-action-button", text: "Continue" });
  await settle();
  refuseAdvance = 2;
  advances = calls.advance.length;
  await press("Continue");
  await h.sleep(300);
  h.assert((await screen()).buttons === "Continue (disabled)", "Continue shows it is working");
  await h.waitFor({ css: ".game-question-index", text: `Question ${resumed + 2} ` }, { timeout: 8000 });
  h.assert(calls.advance.length === advances + 3, "retried until accepted, one question forward");

  h.section("Resuming a skipped question, and the last question");
  await settle();
  await press("Skip");
  await h.waitFor({ css: ".game-action-button", text: "Continue" });
  await resume();
  s = await screen();
  h.assert(s.buttons === "Continue" && /Not quite/.test(s.reveal) && s.wrong === 0, `after a reload: "${s.reveal}"`);
  buzzes().length = 0;
  room().current_question_index = room().question_ids.length - 1;
  room().current_question_started_at = new Date().toISOString();
  await resume();
  await press("Skip");
  await h.waitFor({ css: ".game-action-button", text: "Continue" });
  await settle();
  await press("Continue");
  await h.waitFor(".game-results-banner");
  h.assert(room().status === "finished", "Continue on the last question shows the results");
  await startSolo();
  room().current_question_index = room().question_ids.length - 1;
  room().current_question_started_at = new Date().toISOString();
  await resume();
  await watch();
  await press("Skip");
  await heldFour("last question, before the results");
  h.assert(room().status === "finished", "then the results");
  await startSolo();
  room().current_question_index = room().question_ids.length - 1;
  now = question();
  room().current_question_started_at = new Date(Date.now() - 20000).toISOString();
  let finalScore = null;
  h.backend.setRpc("check_and_advance", (a) => { calls.advance.push({ ...a, at: Date.now() }); finalScore ??= player().score; return advance(a); });
  await resume();
  await h.waitFor(".game-results-banner", { timeout: 12000 });
  h.assert(finalScore === -now.points, `time runs out on the last question: ${finalScore} is on the board before the game finishes`);
  h.backend.setRpc("check_and_advance", (a) => {
    calls.advance.push({ ...a, at: Date.now() });
    if (refuseAdvance > 0) { refuseAdvance--; throw { code: "P0001", message: "Question still in progress" }; }
    return advance(a);
  });

  h.section("A question this build no longer has");
  await startSolo();
  room().question_ids[0] = "location-category-jordan-river"; // retired
  room().current_question_started_at = new Date(Date.now() - 20000).toISOString();
  await openGames();
  await h.waitFor(".game-action-button");
  await h.sleep(300);
  const gone = await h.text(".game-room-play");
  h.assert(/no longer available/.test(gone) && /Continue/.test(gone), `says so and offers Continue: ${gone.replace(/\s+/g, " ")}`);
  await press("Continue");
  await h.waitFor(".game-choice-button");
  h.assert(room().current_question_index === 1 && player().score === 0 && buzzes().length === 0, "Continue passes over it, and nothing is charged");

  h.section("Large text and dark theme");
  await h.evaluate(() => localStorage.setItem("app-theme", "dark"));
  await startSolo();
  await h.evaluate(() => document.querySelector(".game-root").style.setProperty("zoom", "1.8"));
  await h.sleep(200);
  await reachable("zoom 1.8, Skip");
  await shot("solo-zoom");
  await press("Skip");
  await h.waitFor({ css: ".game-action-button", text: "Continue" });
  await reachable("zoom 1.8, Continue");
  await h.evaluate(() => localStorage.setItem("app-theme", "light"));

  h.section("Two players");
  await h.evaluate(() => sessionStorage.removeItem("bible-atlas-active-game-room"));
  await openGames();
  await h.click({ css: ".game-entry-card", text: "Create multiplayer game" });
  await h.click(".game-start-button");
  await h.waitFor(".game-lobby-code");
  h.backend.tables.game_players.push({ room_id: room().id, user_id: OTHER, display_name: "Second Player", score: 0, joined_at: new Date().toISOString() });
  await h.click({ css: ".games-primary-button", text: "Start" });
  calls.submit.length = 0;
  calls.advance.length = 0;
  await resume();
  const none = async (label) => {
    const n = await h.evaluate(() => ({ action: document.querySelectorAll(".game-action-button").length, named: [...document.querySelectorAll(".game-room-play button")].filter((b) => /^(Skip|Continue)/.test(b.textContent.trim())).length, count: document.querySelector(".game-question-answered-count").textContent.trim() }));
    h.assert(n.action === 0 && n.named === 0, `${label}: no Skip and no Continue (${n.count})`);
  };
  await none("two players, nobody has answered");
  await shot("multi-open");
  now = question();
  await h.click({ css: ".game-choice-button", text: now.choices[now.correctIndex] });
  await h.sleep(1500);
  await none("only I have answered");
  h.assert(/waiting on the rest/.test((await screen()).reveal) && calls.advance.length === 0, "it says it is waiting, and nothing tries to advance");

  // The other player answers. Hold the server's answer so the round-over screen can be looked at.
  refuseAdvance = 1000;
  submit(OTHER, { p_question_index: 0, p_answer_index: (now.correctIndex + 1) % 4, p_correct: false, p_points: now.points });
  await resume();
  s = await screen();
  h.assert(s.buttons === "Continue", `everyone has answered: ${s.buttons}`);
  await reachable("two players, Continue");
  await shot("multi-continue");
  await h.sleep(4500);
  h.assert(calls.advance.length >= 1, "the automatic advance is still trying on its own");
  refuseAdvance = 0;
  await h.waitFor({ css: ".game-question-index", text: "Question 2 " }, { timeout: 12000 });
  await h.sleep(300);
  await none("next question");

  // The other player answers first: Continue must be there as soon as my answer lands.
  now = question();
  submit(OTHER, { p_question_index: 1, p_answer_index: now.correctIndex, p_correct: true, p_points: now.points });
  await h.evaluate(() => {
    window.__seen = null;
    window.__t0 = null;
    document.addEventListener("click", (e) => { if (e.target.closest(".game-choice-button")) window.__t0 ??= performance.now(); }, true);
    new MutationObserver((_, o) => {
      const b = [...document.querySelectorAll(".game-action-button")].find((x) => x.textContent.trim() === "Continue" && !x.disabled);
      if (b && window.__t0 !== null) { window.__seen = performance.now() - window.__t0; o.disconnect(); b.click(); }
    }).observe(document.body, { subtree: true, childList: true, attributes: true });
  });
  advances = calls.advance.length;
  await h.click(".game-choice-button");
  await h.waitFor({ css: ".game-question-index", text: "Question 3 " });
  const seen = await h.evaluate(() => window.__seen);
  h.assert(seen !== null && seen < 800, `Continue appeared ${Math.round(seen)}ms after the last answer, and pressing it skips the four-second hold`);
  await h.sleep(2500);
  h.assert(room().current_question_index === 2 && calls.advance.length === advances + 1, `pressing it moved the room once (question index ${room().current_question_index}, ${calls.advance.length - advances} call)`);

  // Another player's Continue arrives first: my late call must not move the room again.
  refuseAdvance = 1000;
  now = question();
  submit(OTHER, { p_question_index: 2, p_answer_index: now.correctIndex, p_correct: true, p_points: now.points });
  await h.click(".game-choice-button");
  await h.waitFor({ css: ".game-action-button", text: "Continue" });
  advance({ p_room_id: room().id, p_question_index: 2 }); // the other player
  refuseAdvance = 0;
  await settle();
  await h.evaluate(() => document.querySelector(".game-action-button")?.click());
  await h.waitFor({ css: ".game-question-index", text: "Question 4 " }, { timeout: 8000 });
  await h.sleep(2500);
  h.assert(room().current_question_index === 3, "two players pressing together move the room one question");

  // Nobody presses anything: the room advances itself after the hold.
  now = question();
  submit(OTHER, { p_question_index: 3, p_answer_index: now.correctIndex, p_correct: true, p_points: now.points });
  await watch();
  await h.click(".game-choice-button");
  await heldFour("two players, no press");
  h.assert(room().current_question_index === 4, "the room moved one question");

  // Time runs out with one player silent.
  refuseAdvance = 1000;
  room().current_question_started_at = new Date(Date.now() - 20000).toISOString();
  submits = calls.submit.length;
  before = player().score;
  await resume();
  await h.sleep(1200);
  s = await screen();
  h.assert(s.buttons === "Continue" && /Time's up\. The answer/.test(s.reveal) && calls.submit.length === submits && player().score === before, `time up with two players: ${s.buttons}, no Skip, nothing scored ("${s.reveal}")`);
  refuseAdvance = 0;
  await h.waitFor({ css: ".game-question-index", text: "Question 6 " }, { timeout: 8000 });

  const real = h.consoleErrors.filter((e) => !/openfreemap|bible-api|Failed to fetch|WebSocket|getUserMedia|NotFoundError|NotAllowedError/i.test(e));
  h.assert(real.length === 0, `no page errors ${real.slice(0, 3).join(" | ")}`);
}
