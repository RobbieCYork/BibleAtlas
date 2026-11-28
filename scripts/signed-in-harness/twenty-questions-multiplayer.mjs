#!/usr/bin/env node
/**
 * 20 Questions multiplayer (sql/057) played by THREE people: three real Chromes, one fake database and
 * fake Realtime, the built app. Run directly (not through run.mjs):
 *
 *   node scripts/signed-in-harness/twenty-questions-multiplayer.mjs --viewport 390x844
 *   node scripts/signed-in-harness/twenty-questions-multiplayer.mjs --viewport 1280x800
 *
 * Checks: before 057 (probe rpc missing) 20 Questions opens on its solo screen with no multiplayer;
 * after, Play solo / Create / Join; create sends the category's whole answer table and nothing about a
 * secret; join by code; lobby with category and seats; how to play; turns in join order seen alike on
 * all three screens; only the player whose turn it is can ask, guess or pass; every question, answer
 * and asker reaches everyone; pass; a wrong guess uses a question; an idle player's turn is passed by
 * someone else's device when its minute is up; reload rejoins the seat; leaving on your turn passes it;
 * the twentieth question opens one final guess each and then the reveal; a right guess wins and every
 * screen shows the winner's picture and the answer; no sideways overflow; no page errors; network closed.
 *
 * The room rpcs are FAKES that copy sql/057's rules in JavaScript, and the fake keeps the secret in this
 * process, never in a table the pages read. That proves the CLIENT never needs or receives the secret
 * before the reveal; it does not prove the SQL keeps it — scripts/sql-rehearsal/057_*.mjs does that.
 * Real Supabase Realtime, real RLS and real networks are not exercised.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FAKE_URL, FAKE_ANON_KEY, STORAGE_KEY } from "./lib/personas.mjs";
import { createBackend } from "./lib/backend.mjs";
import { launchChrome, openTab, closeNetwork, sleep } from "./lib/browser.mjs";
import { createPage } from "./lib/page.mjs";
import { createFakeRealtime } from "./lib/fake-realtime.mjs";
import { MENU_BUTTON } from "./lib/app.mjs";
import { readFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const [W, H] = arg("--viewport", "390x844").split("x").map(Number);
const outDir = arg("--out") ?? mkdtempSync(join(tmpdir(), "tq-mp-out."));
mkdirSync(outDir, { recursive: true });
const phone = W <= 768;
/** Entry id -> on-screen name, read from the data files, so the harness can choose a right or a wrong
 * name by id. The page itself is never told which id is the secret. */
const ENTRY_NAME = Object.fromEntries(
  ["people", "places", "things"].flatMap((f) =>
    [...readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), `../../src/data/twentyQuestions/${f}.ts`), "utf8").matchAll(/\{ id: "([^"]+)", name: "([^"]+)"/g)].map((m) => [m[1], m[2]])
  )
);
const NAMES = { member: "Ann", advisor: "Ben", administrator: "Cal" };
const PICTURE = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#3a7"/></svg>');

const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const cleanups = [];
let exitCode = 0;

// ---------------------------------------------------------------- the shared fake database (sql/057 in JS)
const rt = createFakeRealtime();
const players = [];
const db = { twenty_q_rooms: [], twenty_q_players: [], twenty_q_moves: [] };
/** Held HERE, like twenty_q_secrets: never in a table any page can read. */
let secret = null;
let multiplayerOn = false;
const createCalls = [];
const rpcLog = [];
const push = (table) => { for (const p of players) p.backend.setTable(table, db[table]); rt.tableChanged(table); };
const pushAll = () => Object.keys(db).forEach(push);
const room = () => db.twenty_q_rooms[0];
const fail = (message) => { throw { status: 400, code: "P0001", message }; };
const seatedOrder = () => [...db.twenty_q_players].sort((a, b) => a.joined_at.localeCompare(b.joined_at) || a.user_id.localeCompare(b.user_id));
const nextSeq = () => db.twenty_q_moves.length + 1;

function advance() {
  const r = room();
  if (r.status !== "active") return;
  const eligible = seatedOrder().filter((p) => r.final_from_seq === null || !db.twenty_q_moves.some((m) => m.seq > r.final_from_seq && m.user_id === p.user_id));
  const after = (p) => r.turn_joined_at === null || p.joined_at > r.turn_joined_at || (p.joined_at === r.turn_joined_at && p.user_id > r.turn_user_id);
  const next = eligible.find(after) ?? eligible[0];
  r.turn_no++;
  if (!next) Object.assign(r, { status: "finished", turn_user_id: null, turn_started_at: null, revealed_entry_id: secret.id });
  else Object.assign(r, { turn_user_id: next.user_id, turn_joined_at: next.joined_at, turn_started_at: new Date().toISOString() });
}

function fakeRooms(backend) {
  const me = () => backend.persona;
  const myName = () => NAMES[me().key];
  const log = (name, a) => rpcLog.push({ who: myName(), name, args: a });
  backend.setRpc("twenty_q_multiplayer_enabled", () => {
    if (!multiplayerOn) throw { status: 404, code: "PGRST202", message: "Could not find the function public.twenty_q_multiplayer_enabled" };
    return true;
  });
  backend.setRpc("get_profile_cards", ({ p_ids }) => p_ids.map((id) => ({ id, display_name: "card", avatar_url: PICTURE, email: null, created_at: null, profile_visibility: {} })));
  const seat = () => {
    if (!db.twenty_q_players.some((p) => p.user_id === me().id)) {
      if (db.twenty_q_players.length >= 6) fail("This game room is full");
      db.twenty_q_players.push({ room_id: room().id, user_id: me().id, display_name: myName(), asked: 0, joined_at: new Date(Date.now() + db.twenty_q_players.length).toISOString() });
    }
    push("twenty_q_players");
    return { ...room() };
  };
  backend.setRpc("create_twenty_q_room", (a) => {
    log("create", a);
    createCalls.push(a);
    const pick = a.p_entries[Math.floor(Math.random() * a.p_entries.length)];
    secret = { id: pick.id, yes: new Set(pick.yes), unknown: new Set(pick.unknown), entries: new Set(a.p_entries.map((e) => e.id)), questions: new Set(a.p_question_ids) };
    db.twenty_q_rooms = [{ id: `room-${Date.now()}`, code: "TQ1234", host_id: me().id, status: "lobby", category: a.p_category, question_limit: 20, questions_used: 0, turn_user_id: null, turn_joined_at: null, turn_no: 0, turn_started_at: null, turn_seconds: 60, final_from_seq: null, winner_id: null, revealed_entry_id: null, created_at: new Date().toISOString() }];
    db.twenty_q_players = []; db.twenty_q_moves = [];
    push("twenty_q_rooms"); push("twenty_q_moves");
    return seat();
  });
  backend.setRpc("join_twenty_q_room", (a) => {
    log("join", a);
    if (!room() || a.p_code.toUpperCase() !== room().code) fail("No game found with that code");
    return seat();
  });
  backend.setRpc("start_twenty_q_room", () => {
    if (room().host_id !== me().id) fail("Only the host can start the game");
    Object.assign(room(), { status: "active", turn_user_id: null, turn_joined_at: null });
    advance();
    push("twenty_q_rooms");
    return { ...room() };
  });
  const myTurn = () => {
    const r = room();
    if (r.status !== "active") fail("This game is not in progress");
    if (r.turn_user_id !== me().id) fail("It is not your turn");
  };
  const record = (m) => db.twenty_q_moves.push({ room_id: room().id, seq: nextSeq(), user_id: me().id, display_name: myName(), item_id: null, answer: null, created_at: new Date().toISOString(), ...m });
  const useQuestion = () => {
    const r = room();
    r.questions_used++;
    if (r.questions_used >= r.question_limit) r.final_from_seq = db.twenty_q_moves.length;
  };
  backend.setRpc("ask_twenty_q", (a) => {
    log("ask", a);
    myTurn();
    if (room().final_from_seq !== null) fail("No questions left — make your final guess");
    if (!secret.questions.has(a.p_question_id)) throw { status: 400, code: "22023", message: "Unknown question" };
    if (db.twenty_q_moves.some((m) => m.kind === "question" && m.item_id === a.p_question_id)) fail("That question has already been asked");
    record({ kind: "question", item_id: a.p_question_id, answer: secret.yes.has(a.p_question_id) ? "yes" : secret.unknown.has(a.p_question_id) ? "unknown" : "no" });
    db.twenty_q_players.find((p) => p.user_id === me().id).asked++;
    useQuestion();
    advance();
    pushAll();
    return { ...room() };
  });
  backend.setRpc("guess_twenty_q", (a) => {
    log("guess", a);
    myTurn();
    if (!secret.entries.has(a.p_entry_id)) throw { status: 400, code: "22023", message: "Unknown answer" };
    const right = a.p_entry_id === secret.id;
    record({ kind: "guess", item_id: a.p_entry_id, answer: right ? "yes" : "no" });
    if (right) Object.assign(room(), { status: "finished", winner_id: me().id, revealed_entry_id: secret.id, turn_user_id: null, turn_started_at: null, turn_no: room().turn_no + 1 });
    else {
      if (room().final_from_seq === null) useQuestion();
      advance();
    }
    pushAll();
    return { ...room() };
  });
  backend.setRpc("pass_twenty_q_turn", (a) => {
    log("pass", a);
    const r = room();
    if (r.status !== "active" || r.turn_no !== a.p_turn_no) return { ...r };
    const own = r.turn_user_id === me().id;
    if (!own && Date.now() - new Date(r.turn_started_at).getTime() < r.turn_seconds * 1000) fail("Turn still in progress");
    const holder = db.twenty_q_players.find((p) => p.user_id === r.turn_user_id);
    db.twenty_q_moves.push({ room_id: r.id, seq: nextSeq(), user_id: r.turn_user_id, display_name: holder?.display_name ?? "Player", kind: own ? "pass" : "timeout", item_id: null, answer: null, created_at: new Date().toISOString() });
    advance();
    pushAll();
    return { ...room() };
  });
  backend.setRpc("leave_twenty_q_room", () => {
    log("leave", {});
    const r = room();
    if (!r) return null;
    db.twenty_q_players = db.twenty_q_players.filter((p) => p.user_id !== me().id);
    if (r.host_id === me().id && db.twenty_q_players.length) r.host_id = seatedOrder()[0].user_id;
    if (r.status === "active" && r.turn_user_id === me().id) advance();
    pushAll();
    return null;
  });
  backend.setRpc("kick_twenty_q_player", () => null);
}

try {
  const tmp = mkdtempSync(join(tmpdir(), "tq-mp-dist."));
  cleanups.push(() => rmSync(tmp, { recursive: true, force: true }));
  const dist = join(tmp, "dist");
  process.stdout.write("building production bundle against the fake backend... ");
  const b = spawnSync(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "build", "--outDir", dist, "--emptyOutDir"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, VITE_SUPABASE_URL: FAKE_URL, VITE_SUPABASE_ANON_KEY: FAKE_ANON_KEY } });
  if (b.status !== 0) throw new Error("vite build failed:\n" + (b.stdout + b.stderr).slice(-2000));
  console.log("ok");
  const port = await freePort();
  const preview = spawn(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "preview", "--outDir", dist, "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  cleanups.push(() => preview.kill());
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(origin)).ok) break; } catch { /* not yet */ } await sleep(250); }

  const checks = [];
  async function player(persona) {
    const backend = createBackend({ persona });
    backend.persona.key = persona;
    fakeRooms(backend);
    const chrome = await launchChrome({});
    cleanups.push(() => chrome.close());
    const tab = await openTab(chrome.cdpPort);
    const ledger = await closeNetwork(tab, { previewOrigin: origin, serve: backend.handle });
    const errors = [];
    await tab.send("Runtime.enable");
    tab.on("Runtime.exceptionThrown", (p) => errors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text));
    const realtime = await rt.attach(tab);
    await tab.send("Page.enable");
    await tab.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: phone });
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `(()=>{ try { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded','1'); localStorage.setItem('bible-atlas-remember-me','true'); localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(backend.session))}); } catch (e) {} })()` });
    const h = createPage({ tab, backend, ledger, consoleErrors: errors, outDir, meta: { persona, viewport: `${W}x${H}`, theme: "light", previewOrigin: origin } });
    const p = { h, tab, backend, errors, ledger, realtime, id: backend.persona.id, name: NAMES[persona] };
    players.push(p);
    for (const t of Object.keys(db)) backend.setTable(t, db[t]);
    await h.goto("/");
    await h.sleep(1200);
    return p;
  }

  const assert = (cond, msg) => { checks.push(!!cond); console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); return !!cond; };
  const section = (s) => console.log(`\n${s}`);
  const until = async (fn, ms = 8000) => { const t = Date.now(); for (;;) { const v = await fn().catch(() => false); if (v) return v; if (Date.now() - t > ms) return false; await sleep(150); } };
  const banner = (p) => p.h.evaluate(() => document.querySelector(".tq-turn-banner-text")?.textContent ?? null);
  const historyLines = (p) => p.h.evaluate(() => [...document.querySelectorAll(".tq-history-list .tq-turn")].map((li) => li.innerText.replace(/\s+/g, " ").trim()));
  const noOverflow = (p) => p.h.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const openGames = async (p) => {
    if (phone) await p.h.click({ css: ".mobile-tab", text: "Games" });
    else { await p.h.click(MENU_BUTTON); await p.h.click({ css: ".panel-menu-link", text: "Games" }); }
    await p.h.waitFor(".game-center-card");
    await p.h.click({ css: ".game-center-card", text: "20 Questions" });
  };
  /** Selects the guess-list option whose name is exactly `name` (scrolled into view first). */
  const pickGuess = (p, name) =>
    p.h.evaluate((n) => {
      const b = [...document.querySelectorAll(".tq-guess-option")].find((o) => o.firstChild?.textContent.trim() === n);
      if (!b) return false;
      b.scrollIntoView({ block: "center", behavior: "instant" });
      b.click();
      return true;
    }, name);
  const turnHolder = () => players.find((p) => p.id === room().turn_user_id);
  const closeHelpIfOpen = async (p) => { if (await p.h.exists(".how-close")) await p.h.click(".how-close"); };
  /** Into the room: the first time on a device How to play opens by itself, in place of the lobby. */
  const enterRoom = async (p) => {
    await p.h.waitFor(".game-lobby-code, .how-panel");
    const sawHelp = await p.h.exists(".how-panel");
    if (sawHelp) p.helpText = await p.h.text(".how-panel");
    await closeHelpIfOpen(p);
    await p.h.waitFor(".game-lobby-code");
    return sawHelp;
  };

  const A = await player("member");

  section("Before sql/057: no multiplayer offered");
  await openGames(A);
  await A.h.waitFor('input[name="tq-category"]');
  assert(!(await A.h.exists(".game-entry-card")), "20 Questions opens on its solo category screen, no Play solo / Create / Join");
  assert(!rpcLog.length, "no room rpc was called");

  multiplayerOn = true;
  const B = await player("advisor");
  const C = await player("administrator");
  await A.h.reload();
  await A.h.sleep(1000);

  section("After sql/057: entry choices, create, join");
  await openGames(A);
  await A.h.waitFor(".game-entry-card");
  const choices = await A.h.evaluate(() => [...document.querySelectorAll(".game-entry-card .game-center-card-title")].map((e) => e.textContent.trim()));
  assert(choices.join("|") === "Play solo|Create multiplayer game|Join multiplayer game", `first screen: ${choices.join(" / ")}`);
  await A.h.click({ css: ".game-entry-card", text: "Play solo" });
  await A.h.waitFor('input[name="tq-category"]');
  assert(true, "Play solo opens the solo category screen");
  await A.h.click(".game-root .back-btn");
  await A.h.waitFor(".game-entry-card");
  assert(true, "Back from solo returns to the first screen");
  await A.h.click({ css: ".game-entry-card", text: "Create multiplayer game" });
  await A.h.waitFor('input[name="tq-mp-category"]');
  await A.h.click({ css: "label.game-level-option", text: "Places" });
  await A.h.screenshot(`create-${W}.png`);
  assert(await noOverflow(A), "create screen: no sideways overflow");
  await A.h.click(".game-start-button");
  const hostHelp = await enterRoom(A);
  assert(hostHelp && A.helpText.includes("take turns"), "how to play opens by itself the first time in a room, and explains turns");
  const call = createCalls[0];
  assert(call?.p_category === "places", "create sends the chosen category");
  assert(Array.isArray(call?.p_entries) && call.p_entries.length >= 10 && call.p_entries.every((e) => typeof e.id === "string" && Array.isArray(e.yes) && Array.isArray(e.unknown)), `create sends the whole answer table (${call?.p_entries?.length} entries, ${call?.p_question_ids?.length} questions)`);
  assert(!Object.keys(call).some((k) => /secret|answer_id|entry_id/.test(k)), "create sends no secret: the database picks it");
  assert(new Set(call.p_question_ids).size === call.p_question_ids.length && new Set(call.p_entries.map((e) => e.id)).size === call.p_entries.length, "question and entry ids are unique (057 refuses duplicates)");
  await closeHelpIfOpen(A);

  for (const p of [B, C]) {
    await openGames(p);
    await p.h.waitFor(".game-entry-card");
    await p.h.click({ css: ".game-entry-card", text: "Join multiplayer game" });
    await p.h.type(".games-code-input", "tq1234");
    await p.h.click({ css: ".game-start-button", text: "Join game" });
    await enterRoom(p);
  }
  const roster = await until(async () => (await A.h.text(".game-lobby-roster h3")).includes("3/6") && A.h.text(".game-lobby-roster h3"));
  assert(roster, `host's lobby shows ${roster}`);
  assert((await B.h.text(".tq-lobby-category")).includes("Places"), "joiners see the category in the lobby");
  assert(B.helpText && C.helpText, "joiners got how to play first too");
  await A.h.click({ css: ".games-primary-button", text: "Start Game" });

  section("Turns");
  for (const p of [A, B, C]) await p.h.waitFor(".tq-turn-banner", { timeout: 10000 });
  await sleep(500);
  const banners = await Promise.all([A, B, C].map(banner));
  assert(banners[0].startsWith("Your turn") && banners[1] === "Ann's turn." && banners[2] === "Ann's turn.", `first turn is the host's, seen alike: ${banners.join(" | ")}`);
  const order = await B.h.evaluate(() => [...document.querySelectorAll(".tq-order li")].map((l) => l.textContent));
  assert(order.join(",") === "Ann,You,Cal", `turn order in join order (${order.join(",")}) with the current one marked`);
  assert(await B.h.evaluate(() => [...document.querySelectorAll(".tq-question")].every((b) => b.disabled)), "not your turn: every question button is disabled");
  assert(!(await B.h.exists(".tq-guess-open")) && !(await B.h.exists(".tq-pass")), "not your turn: no Make a guess and no Pass");
  await A.h.screenshot(`turn-host-${W}.png`);
  await B.h.screenshot(`turn-waiting-${W}.png`);
  assert((await noOverflow(A)) && (await noOverflow(B)), "play screen: no sideways overflow");

  const qText = await A.h.evaluate(() => document.querySelector(".tq-question .tq-question-text").textContent);
  await A.h.click(".tq-question");
  await until(async () => (await banner(B)) === "Your turn — ask a question or make a guess.");
  const expectAnswer = db.twenty_q_moves[0].answer;
  const label = { yes: "Yes", no: "No", unknown: "Not stated" }[expectAnswer];
  for (const [p, who] of [[A, "You"], [B, "Ann"], [C, "Ann"]]) {
    const lines = await until(async () => { const l = await historyLines(p); return l.length === 1 && l; });
    assert(lines && lines[0].includes(who) && lines[0].includes(qText) && lines[0].endsWith(label), `${p.name} sees "${qText}" asked by ${who}, answered ${label}`);
  }
  assert(rpcLog.filter((r) => r.name === "ask").every((r) => Object.keys(r.args).join() === "p_room_id,p_question_id"), "an ask sends only the room and the question id");
  assert((await A.h.text(".tq-hud-left")).startsWith("19 of 20"), "19 of 20 questions left");

  section("Pass, a wrong guess, a time-out");
  await B.h.click(".tq-pass");
  await until(async () => (await banner(C)).startsWith("Your turn"));
  assert((await historyLines(A)).at(-1).includes("Passed."), "Ben passes: everyone sees it, Cal's turn");
  assert((await A.h.text(".tq-hud-left")).startsWith("19 of 20"), "a pass uses no question");
  await C.h.click(".tq-guess-open");
  const pickedName = ENTRY_NAME[call.p_entries.find((e) => e.id !== secret.id).id];
  assert(await pickGuess(C, pickedName), `Cal picks ${pickedName}`);
  await C.h.click(".tq-guess-actions .games-primary-button");
  await until(async () => (await historyLines(A)).length === 3);
  {
    assert((await historyLines(B)).at(-1).includes(`Is it`) && (await historyLines(B)).at(-1).endsWith("No"), `Cal's wrong guess (${pickedName}) reaches everyone as No`);
    assert((await A.h.text(".tq-hud-left")).startsWith("18 of 20"), "a wrong guess uses a question (18 left)");
    assert(rpcLog.filter((r) => r.name === "guess").every((r) => Object.keys(r.args).join() === "p_room_id,p_entry_id"), "a guess sends only the room and the entry id — never a claim of being right");

    // Ann's turn again; she is away. Wind her clock back a minute; Ben's or Cal's device passes it.
    await until(async () => (await banner(B)) === "Ann's turn.");
    room().turn_started_at = new Date(Date.now() - 62_000).toISOString();
    push("twenty_q_rooms");
    const timedOut = await until(async () => db.twenty_q_moves.at(-1).kind === "timeout", 12000);
    assert(timedOut, "an idle player's turn is passed by another device once its minute is up");
    const tos = rpcLog.filter((r) => r.name === "pass" && r.who !== "Ann");
    assert(tos.length >= 1 && db.twenty_q_moves.filter((m) => m.kind === "timeout").length === 1, `the room moved once (${tos.length} pass calls from the others, 1 time-out)`);
    await until(async () => (await historyLines(C)).at(-1)?.includes("Ran out of time."));
    assert((await historyLines(C)).at(-1).includes("Ann") && (await historyLines(C)).at(-1).includes("Ran out of time."), "everyone sees Ann ran out of time");
    assert((await banner(B)).startsWith("Your turn"), "and it is Ben's turn");

    section("Rejoin, leave on your turn");
    await B.h.reload();
    await B.h.sleep(1500);
    await openGames(B);
    await B.h.waitFor(".tq-turn-banner", { timeout: 10000 });
    assert((await banner(B)).startsWith("Your turn") && (await historyLines(B)).length === 4, "Ben reloads and opens 20 Questions: straight back into his seat, still his turn, history intact");
    await B.h.click(".game-video-leave");
    await until(async () => (await banner(C)).startsWith("Your turn"));
    assert(!db.twenty_q_players.some((p) => p.user_id === B.id), "Ben leaves on his turn: his seat is gone");
    assert((await banner(C)).startsWith("Your turn"), "and the turn passes to Cal at once");
    await B.h.waitFor(".game-entry-card, .tq-setup, .games-code-input", { timeout: 8000 });

    section("The twentieth question, final guesses, reveal with no winner");
    room().questions_used = 19;
    push("twenty_q_rooms");
    await sleep(600);
    await C.h.click(".tq-question");
    await until(async () => (await banner(A)) === "Your final guess.");
    assert((await A.h.text(".tq-hud-left")).includes("one final guess each"), "the twentieth question opens the final round");
    assert(!(await A.h.exists(".tq-question")), "no questions to ask in the final round");
    const usedGuesses = new Set(db.twenty_q_moves.filter((m) => m.kind === "guess").map((m) => m.item_id));
    const wrongFinal = async (p) => {
      const id = call.p_entries.map((e) => e.id).find((x) => x !== secret.id && !usedGuesses.has(x));
      usedGuesses.add(id);
      await p.h.waitFor(".tq-guess-option");
      await pickGuess(p, ENTRY_NAME[id]);
      await p.h.click(".tq-guess-actions .games-primary-button");
      return ENTRY_NAME[id];
    };
    const gA = await wrongFinal(A);
    await until(async () => (await banner(C)) === "Your final guess.");
    const gC = await wrongFinal(C);
    await Promise.all([A, C].map((p) => p.h.waitFor(".tq-reveal", { timeout: 10000 })));
    const reveal = await A.h.text(".tq-reveal");
    assert(room().status === "finished" && room().winner_id === null, `game over after one final guess each (${gA}, ${gC}), no winner`);
    assert(reveal.includes("Out of questions.") && reveal.includes(ENTRY_NAME[secret.id]), `every screen: "Out of questions", the answer was ${ENTRY_NAME[secret.id]}`);
    assert((await C.h.text(".tq-reveal")).includes(ENTRY_NAME[secret.id]), "Cal sees the same reveal");
    assert(room().revealed_entry_id === secret.id, "the answer reaches the pages only now, as revealed_entry_id");
    await A.h.screenshot(`reveal-nowinner-${W}.png`);
  }

  section("A right guess wins");
  for (const p of [A, B, C]) {
    p.realtime.disconnect();
    await p.h.evaluate(() => { for (const k of Object.keys(sessionStorage)) if (k !== "__seeded") sessionStorage.removeItem(k); });
    await p.h.reload();
    await p.h.sleep(900);
  }
  await openGames(A);
  await A.h.click({ css: ".game-entry-card", text: "Create multiplayer game" });
  await A.h.click({ css: "label.game-level-option", text: "People" });
  await A.h.click(".game-start-button");
  await enterRoom(A);
  await openGames(B);
  await B.h.click({ css: ".game-entry-card", text: "Join multiplayer game" });
  await B.h.type(".games-code-input", "TQ1234");
  await B.h.click({ css: ".game-start-button", text: "Join game" });
  await enterRoom(B);
  await until(async () => (await A.h.text(".game-lobby-roster h3")).includes("2/6"));
  await A.h.click({ css: ".games-primary-button", text: "Start Game" });
  await A.h.waitFor(".tq-guess-open");
  await A.h.click(".tq-pass");
  await B.h.waitFor(".tq-guess-open", { timeout: 10000 });
  await B.h.click(".tq-guess-open");
  const nameGuess = ENTRY_NAME[secret.id];
  assert(await pickGuess(B, nameGuess), `Ben picks ${nameGuess}`);
  await B.h.click(".tq-guess-actions .games-primary-button");
  await Promise.all([A, B].map((p) => p.h.waitFor(".tq-reveal", { timeout: 10000 })));
  assert(room().winner_id === B.id, "Ben's right guess wins");
  {
    for (const [p, head] of [[A, "Ben got it!"], [B, "You got it!"]]) {
      const t = await p.h.text(".tq-reveal h3");
      assert(t === head, `${p.name} sees "${t}"`);
      const pic = await until(() => p.h.evaluate(() => !!document.querySelector(".tq-reveal .game-results-avatar-winner img")));
      assert(pic, `${p.name} sees the winner's profile picture`);
      assert((await p.h.text(".tq-reveal-name")).includes(nameGuess), `${p.name} sees the answer: ${nameGuess}`);
    }
    assert(await A.h.exists({ css: ".tq-actions button", text: "Read about" }), "the reveal links to the person's article");
    await B.h.screenshot(`reveal-winner-${W}.png`);
    assert((await noOverflow(A)) && (await noOverflow(B)), "reveal: no sideways overflow");
  }
  await B.h.click({ css: ".tq-actions button", text: "Play again" });
  await B.h.waitFor(".games-code-input", { timeout: 8000 });
  assert(!db.twenty_q_players.some((p) => p.user_id === B.id), "Play again leaves the finished room, back to the step Ben came from (the code)");

  section("Page errors and network");
  for (const p of players) assert(p.errors.length === 0 && p.ledger.continuedExternal + p.ledger.forbiddenAttempts === 0, `${p.name}: no page errors, network closed ${p.errors.slice(0, 2).join(" | ")}`);
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed. screenshots: ${outDir}`);
  if (checks.some((c) => !c)) exitCode = 1;
} catch (e) {
  console.error(e);
  for (const p of players) console.error(p.name, (await p.h.evaluate(() => document.querySelector(".game-root")?.innerText?.slice(0, 600)).catch(() => "")), p.errors.slice(0, 3));
  exitCode = 1;
} finally {
  for (const c of cleanups.reverse()) { try { await c(); } catch { /* best effort */ } }
}
process.exit(exitCode);
