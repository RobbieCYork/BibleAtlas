#!/usr/bin/env node
/**
 * Bible Trivia's four-second hold on the revealed answer, seen by TWO players: two real Chromes, one
 * fake database and fake Realtime, the built app. Run directly (not through run.mjs):
 *
 *   node scripts/signed-in-harness/trivia-hold.mjs --viewport 390x844
 *
 * Each page times, on its own clock, how long the answer was on its screen before the next question or
 * the results replaced it. The second player's device clock can be set wrong. submit_answer() and
 * check_and_advance() are fakes copying the rules in sql/000_baseline.sql (refused before 15 seconds
 * unless everyone answered; a call naming a question already left does nothing). The real SQL, real
 * Realtime and real networks are not exercised.
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

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const [W, H] = arg("--viewport", "390x844").split("x").map(Number);
const outDir = arg("--out") ?? mkdtempSync(join(tmpdir(), "trivia-hold-out."));
mkdirSync(outDir, { recursive: true });
const phone = W <= 768;

const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const cleanups = [];
let exitCode = 0;

// ---------------------------------------------------------------- the shared fake database
const rt = createFakeRealtime();
const players = [];
const db = { game_rooms: [], game_players: [], game_buzzes: [] };
const push = (table) => { for (const p of players) p.backend.setTable(table, db[table]); rt.tableChanged(table); };
const room = () => db.game_rooms[0];
const advances = []; // every check_and_advance call: {who, index, moved}
function fakeRooms(backend) {
  const seat = () => {
    const me = backend.persona;
    if (!db.game_players.some((p) => p.user_id === me.id))
      db.game_players.push({ room_id: room().id, user_id: me.id, display_name: me.name, score: 0, joined_at: new Date().toISOString() });
    push("game_players");
    return room();
  };
  backend.setRpc("create_game_room", (a) => {
    db.game_rooms = [{ id: `room-${Date.now()}`, code: "ABC123", host_id: backend.persona.id, status: "lobby", question_ids: a.p_question_ids, current_question_index: 0, current_question_started_at: null, target_score: 10000, winner_id: null, created_at: new Date().toISOString() }];
    db.game_players = []; db.game_buzzes = [];
    push("game_rooms"); push("game_buzzes");
    return seat();
  });
  backend.setRpc("join_game_room", seat);
  backend.setRpc("start_game_room", () => { Object.assign(room(), { status: "active", current_question_started_at: new Date().toISOString() }); push("game_rooms"); return room(); });
  backend.setRpc("leave_game_room", () => null);
  backend.setRpc("submit_answer", (a) => {
    const me = backend.persona.id;
    const first = !db.game_buzzes.some((b) => b.question_index === a.p_question_index && b.correct);
    db.game_buzzes.push({ id: `b${db.game_buzzes.length}`, room_id: room().id, question_index: a.p_question_index, user_id: me, answer_index: a.p_answer_index, correct: a.p_correct, buzzed_at: new Date().toISOString() });
    const p = db.game_players.find((x) => x.user_id === me);
    p.score += a.p_correct ? a.p_points * (first ? 2 : 1) : -a.p_points;
    push("game_players"); push("game_buzzes");
    return { ...p };
  });
  backend.setRpc("check_and_advance", (a) => {
    const r = room();
    const call = { who: backend.persona.id, index: a.p_question_index, moved: false };
    advances.push(call);
    if (r.status !== "active" || r.current_question_index !== a.p_question_index) return { ...r };
    const answered = db.game_buzzes.filter((b) => b.question_index === a.p_question_index).length;
    if (answered < db.game_players.length && Date.now() - new Date(r.current_question_started_at) < 15000) throw { code: "P0001", message: "Question still in progress" };
    const next = a.p_question_index + 1;
    if (next >= r.question_ids.length) r.status = "finished";
    r.current_question_index = next;
    r.current_question_started_at = new Date().toISOString();
    call.moved = true;
    push("game_rooms");
    return { ...r };
  });
}

/** Runs in each page before the app: a device clock that is wrong by __skew ms, and a log of when each
 * answer appeared and when it was replaced, on the monotonic clock. */
const INSTRUMENT = `(() => {
  const skew = Number(sessionStorage.getItem("__skew") || 0);
  if (skew) { const real = Date.now.bind(Date); Date.now = () => real() + skew; }
  const log = (window.__holds = []);
  let open = null;
  new MutationObserver(() => {
    const index = document.querySelector(".game-question-index")?.textContent.trim().split(" ")[1] ?? null;
    const done = !!document.querySelector(".game-results");
    const t = performance.timeOrigin + performance.now();
    if (open && (done || index !== open.index)) { log.push({ question: Number(open.index), held: t - open.at, results: done }); open = null; }
    if (!open && index && document.querySelector(".game-question-reveal") && document.querySelector(".game-action-button:not(.games-secondary-button)")) open = { index, at: t };
  }).observe(document, { subtree: true, childList: true, characterData: true });
})()`;

try {
  const tmp = mkdtempSync(join(tmpdir(), "trivia-hold-dist."));
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
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENT });
    const h = createPage({ tab, backend, ledger, consoleErrors: errors, outDir, meta: { persona, viewport: `${W}x${H}`, theme: "light", previewOrigin: origin } });
    const p = { h, tab, backend, errors, ledger, realtime, id: backend.persona.id };
    players.push(p);
    await h.goto("/");
    await h.sleep(1200);
    return p;
  }
  const A = await player("member");
  const B = await player("advisor");

  const assert = (cond, msg) => { checks.push(!!cond); console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); return !!cond; };
  const section = (s) => console.log(`\n${s}`);
  const openGame = async (p) => {
    if (phone) await p.h.click({ css: ".mobile-tab", text: "Games" });
    else { await p.h.click(MENU_BUTTON); await p.h.click({ css: ".panel-menu-link", text: "Games" }); }
    await p.h.waitFor(".game-center-card, .game-root .back-btn");
    await p.h.click({ css: ".game-center-card", text: "Bible Trivia" });
  };
  const startRoom = async (skew) => {
    for (const p of players) {
      p.realtime.disconnect();
      await p.h.evaluate((s) => { for (const k of Object.keys(sessionStorage)) if (k !== "__seeded") sessionStorage.removeItem(k); if (s) sessionStorage.setItem("__skew", s); }, p === B ? skew : 0);
      await p.h.reload();
      await p.h.sleep(800);
    }
    advances.length = 0;
    await openGame(A);
    await A.h.click({ css: ".game-entry-card", text: "Create multiplayer game" });
    await A.h.click(".game-start-button");
    await A.h.waitFor(".game-lobby-code");
    await openGame(B);
    await B.h.click({ css: ".game-entry-card", text: "Join multiplayer game" });
    await B.h.type(".games-code-input", "ABC123");
    await B.h.click({ css: ".game-start-button", text: "Join game" });
    await B.h.waitFor(".game-lobby-code");
    await A.h.waitFor({ css: ".games-primary-button", text: "Start Game" });
    await A.h.click({ css: ".games-primary-button", text: "Start Game" });
    await A.h.waitFor(".game-choice-button");
    await B.h.waitFor(".game-choice-button");
  };
  const onQuestion = (n) => Promise.all(players.map((p) => p.h.waitFor({ css: ".game-question-index", text: `Question ${n} ` }, { timeout: 30000 })));
  /** How long each player had question n's answer on screen; checked to be a full four seconds. */
  const holds = async (n, label) => {
    const got = [];
    for (const p of players) got.push((await p.h.evaluate((n) => window.__holds.find((x) => x.question === n) ?? null, n))?.held ?? null);
    // 50ms of slack: the two ends are observed a frame apart.
    assert(got.every((x) => x !== null && x >= 3950 && x < 5200), `${label}: host saw the answer ${Math.round(got[0])}ms, joiner ${Math.round(got[1])}ms`);
    const moved = advances.filter((a) => a.index === n - 1 && a.moved).length;
    assert(moved === 1, `${label}: the room moved once (${advances.filter((a) => a.index === n - 1).length} calls, ${moved} moved it)`);
  };

  for (const [skew, clock] of [[0, "clocks agree"], [7000, "joiner's clock 7s fast"], [-7000, "joiner's clock 7s slow"]]) {
    section(`Everyone answers (${clock})`);
    await startRoom(skew);
    await sleep(700);
    await A.h.click(".game-choice-button");
    await sleep(1200);
    await B.h.click(".game-choice-button");
    await B.h.waitFor(".game-action-countdown");
    await sleep(900);
    if (!skew) for (const [p, who] of [[A, "host"], [B, "joiner"]]) await p.h.screenshot(`countdown-${who}-${W}.png`);
    await onQuestion(2);
    await sleep(300);
    await holds(1, "last answer in");
    assert(room().current_question_index === 1, "one question forward");

    section(`Time runs out, nobody presses (${clock})`);
    const t = Date.now();
    await onQuestion(3);
    await sleep(300);
    await holds(2, "time up");
    assert(Date.now() - t >= 18000, `after the full 15 seconds and the hold (${Date.now() - t}ms)`);
  }

  section("The first question timing out, joiner's clock 7s fast");
  await startRoom(7000);
  await onQuestion(2);
  await sleep(300);
  await holds(1, "opening question");

  section("A player presses Continue");
  await sleep(700);
  await A.h.click(".game-choice-button");
  await B.h.click(".game-choice-button");
  await B.h.waitFor(".game-action-button:not(:disabled)");
  await sleep(500);
  await B.h.click(".game-action-button");
  await onQuestion(3);
  await sleep(5000);
  const held = await A.h.evaluate(() => window.__holds.find((x) => x.question === 2)?.held);
  assert(held < 2500 && room().current_question_index === 2, `the room moves at once for everyone (host had ${Math.round(held)}ms) and only one question (index ${room().current_question_index})`);

  section("The final question holds before the results");
  room().current_question_index = room().question_ids.length - 1;
  room().current_question_started_at = new Date().toISOString();
  push("game_rooms");
  const last = room().question_ids.length;
  await onQuestion(last);
  await sleep(700);
  await A.h.click(".game-choice-button");
  await sleep(600);
  await B.h.click(".game-choice-button");
  await Promise.all(players.map((p) => p.h.waitFor(".game-results", { timeout: 15000 })));
  await sleep(300);
  await holds(last, "final question");
  assert(room().status === "finished", "game finished");

  section("Page errors and network");
  for (const p of players) assert(p.errors.length === 0 && p.ledger.continuedExternal + p.ledger.forbiddenAttempts === 0, `no page errors, network closed ${p.errors.slice(0, 2).join(" | ")}`);
  console.log(`\n${checks.filter(Boolean).length}/${checks.length} checks passed. screenshots: ${outDir}`);
  if (checks.some((c) => !c)) exitCode = 1;
} catch (e) {
  console.error(e);
  for (const p of players) console.error((await p.h.evaluate(() => document.querySelector(".game-root")?.innerText).catch(() => "")), p.errors.slice(0, 3));
  exitCode = 1;
} finally {
  for (const c of cleanups.reverse()) { try { await c(); } catch { /* best effort */ } }
}
process.exit(exitCode);
