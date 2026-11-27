#!/usr/bin/env node
/**
 * The multiplayer results screens' winner pictures, seen by TWO players: two real Chromes, one fake
 * database and fake Realtime, the built app. Run directly (not through run.mjs):
 *
 *   node scripts/signed-in-harness/winner-avatar.mjs --viewport 390x844 --out /tmp/shots
 *   node scripts/signed-in-harness/winner-avatar.mjs --viewport 1280x800 --out /tmp/shots
 *
 * Rooms are made and joined through the app; the finished result (scores, winner_id) is written into
 * the fake database, not played. get_profile_cards re-implements sql/042's rule (self, friend and
 * pending get a card; stranger and blocked get none). The real function and RLS are not exercised.
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
const outDir = arg("--out") ?? mkdtempSync(join(tmpdir(), "winner-avatar-out."));
mkdirSync(outDir, { recursive: true });
const phone = W <= 768;

const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const cleanups = [];
let exitCode = 0;

// ---------------------------------------------------------------- the shared fake database
const rt = createFakeRealtime();
const players = [];
const db = {};
const push = (table) => { for (const p of players) p.backend.setTable(table, db[table] ?? []); rt.tableChanged(table); };
const GAMES = [
  { title: "Bible Trivia", slug: "trivia", won: "wins!", rooms: "game_rooms", players: "game_players", answers: "game_buzzes", create: "create_game_room", join: "join_game_room", start: "start_game_room", leave: "leave_game_room", advance: "check_and_advance", ids: "question_ids", index: "current_question_index", startedAt: "current_question_started_at", playing: ".game-choice-button" },
  { title: "Saving Peter", slug: "peter", won: "saved Peter!", rooms: "saving_peter_rooms", players: "saving_peter_players", answers: "saving_peter_guesses", create: "create_saving_peter_room", join: "join_saving_peter_room", start: "start_saving_peter_room", leave: "leave_saving_peter_room", advance: "check_and_advance_saving_peter", ids: "round_ids", index: "current_round_index", startedAt: "current_round_started_at", playing: ".saving-peter-guess-input" },
];
const NAMES = { member: "Alice Rivers", advisor: "Ben Carter" };
const picture = (letter, color) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${color}"/><circle cx="100" cy="78" r="38" fill="#f3d9c0"/><ellipse cx="100" cy="180" rx="70" ry="56" fill="#fff"/><text x="100" y="188" font-size="44" font-family="sans-serif" text-anchor="middle" fill="${color}">${letter}</text></svg>`)}`;
const PIC_A = picture("PIC A", "#1c7c54");
const PIC_B = picture("PIC B", "#8a2d6b");
const BROKEN = `${FAKE_URL}/storage/v1/object/public/avatars/gone/avatar.jpg`;
/** What each scenario says about the profiles table: pictures by user id, and how the two are related. */
const world = { pictures: {}, relation: "friend" };
const cardCalls = [];
let roomSeq = 0;
function fakeRooms(backend) {
  backend.setRpc("get_profile_cards", ({ p_ids }) => {
    cardCalls.push({ viewer: backend.persona.id, ids: p_ids });
    return p_ids
      .filter((id) => id === backend.persona.id || world.relation === "friend" || world.relation === "pending")
      .map((id) => ({ id, display_name: "card", avatar_url: world.pictures[id] ?? null, email: null, created_at: null, profile_visibility: {} }));
  });
  for (const g of GAMES) {
    const seat = (room) => {
      const me = backend.persona;
      if (!db[g.players].some((p) => p.room_id === room.id && p.user_id === me.id))
        db[g.players].push({ room_id: room.id, user_id: me.id, display_name: NAMES[me.key] ?? me.name, score: 0, joined_at: new Date().toISOString() });
      push(g.players);
      return room;
    };
    backend.setRpc(g.create, (a) => {
      const room = { id: `room-${++roomSeq}-${Date.now()}`, code: "ABC123", host_id: backend.persona.id, status: "lobby", [g.ids]: a[`p_${g.ids}`] ?? [], [g.index]: 0, [g.startedAt]: null, target_score: 50, winner_id: null, created_at: new Date().toISOString() };
      db[g.rooms] = [room]; db[g.players] = []; db[g.answers] = [];
      push(g.rooms); push(g.answers);
      return seat(room);
    });
    backend.setRpc(g.join, () => seat(db[g.rooms][0]));
    backend.setRpc(g.start, () => {
      const room = db[g.rooms][0];
      Object.assign(room, { status: "active", [g.startedAt]: new Date().toISOString() });
      if (g.slug === "peter" && !room[g.ids].length) room[g.ids] = ["easy:NOAH", "easy:MOSES"];
      push(g.rooms);
      return room;
    });
    backend.setRpc(g.leave, () => {
      db[g.players] = (db[g.players] ?? []).filter((p) => p.user_id !== backend.persona.id);
      push(g.players);
      return null;
    });
    backend.setRpc(g.advance, () => db[g.rooms][0]);
  }
}

try {
  const tmp = mkdtempSync(join(tmpdir(), "winner-avatar-dist."));
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
    await h.goto("/");
    await h.sleep(1200);
    return p;
  }

  const A = await player("member");
  const B = await player("advisor");

  const assert = (cond, msg) => { checks.push(!!cond); console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); return !!cond; };
  const section = (s) => console.log(`\n${s}`);
  const until = async (fn, ms = 8000) => { const t = Date.now(); for (;;) { const v = await fn().catch(() => false); if (v) return v; if (Date.now() - t > ms) return false; await sleep(150); } };

  const openGame = async (p, g) => {
    if (phone) await p.h.click({ css: ".mobile-tab", text: "Games" });
    else { await p.h.click(MENU_BUTTON); await p.h.click({ css: ".panel-menu-link", text: "Games" }); }
    await p.h.waitFor(".game-center-card, .game-root .back-btn");
    await p.h.click({ css: ".game-center-card", text: g.title });
  };
  const fresh = async () => {
    for (const p of players) {
      p.realtime.disconnect();
      await p.h.evaluate(() => { for (const k of Object.keys(sessionStorage)) if (k !== "__seeded") sessionStorage.removeItem(k); });
      await p.h.reload();
      await p.h.sleep(800);
    }
    cardCalls.length = 0;
  };
  /** A hosts, B joins (unless solo), the host starts. */
  const startRoom = async (g, { solo = false } = {}) => {
    await fresh();
    await openGame(A, g);
    await A.h.click({ css: ".game-entry-card", text: "Create multiplayer game" });
    await A.h.click(".game-start-button");
    await A.h.waitFor(".game-lobby-code");
    if (!solo) {
      await openGame(B, g);
      await B.h.click({ css: ".game-entry-card", text: "Join multiplayer game" });
      await B.h.type(".games-code-input", "ABC123");
      await B.h.click({ css: ".game-start-button", text: "Join game" });
      await B.h.waitFor(".game-lobby-code");
    }
    await A.h.waitFor({ css: ".games-primary-button", text: solo ? "Start Solo Game" : "Start Game" });
    await A.h.click({ css: ".games-primary-button", text: solo ? "Start Solo Game" : "Start Game" });
    await A.h.waitFor(g.playing);
    if (!solo) await B.h.waitFor(g.playing);
  };
  /** The server ending the game: final scores and winner_id land, both clients hear about it. */
  const finish = async (g, scores, winnerId, extra = []) => {
    for (const row of db[g.players]) row.score = scores[row.user_id];
    for (const e of extra) db[g.players].push({ room_id: db[g.rooms][0].id, joined_at: new Date().toISOString(), ...e });
    push(g.players);
    await sleep(500);
    Object.assign(db[g.rooms][0], { status: "finished", winner_id: winnerId });
    push(g.rooms);
  };

  const read = (p) =>
    p.h.evaluate(() => {
      const root = document.querySelector(".game-results");
      if (!root) return null;
      const av = (el) => {
        const img = el.querySelector("img"), r = el.getBoundingClientRect();
        return { img: img ? img.getAttribute("src") : null, loaded: img ? img.complete && img.naturalWidth > 0 : false, initial: img ? "" : el.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) };
      };
      const body = document.querySelector(".game-body");
      const out = [...root.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -0.5 || r.right > innerWidth + 0.5); }).length;
      return {
        headline: root.querySelector(".game-results-banner h2").textContent.trim(),
        points: root.querySelector(".game-results-score")?.textContent.trim() ?? "",
        winners: [...root.querySelectorAll(".game-results-winner .auth-avatar")].map(av),
        captions: [...root.querySelectorAll(".game-results-winner-name")].map((e) => e.textContent),
        badge: !!root.querySelector(".game-results-badge svg"),
        trophy: !!root.querySelector(".game-results-banner .game-results-trophy"),
        rows: [...root.querySelectorAll(".game-results-scores li")].map((li) => {
          const a = li.querySelector(".auth-avatar");
          const name = a ? li.querySelector(".game-results-player > span:last-child") : li.firstElementChild;
          return { name: name.textContent, score: li.lastElementChild.textContent, hi: li.classList.contains("game-results-winner-row"), avatar: a ? av(a) : null };
        }),
        overflow: Math.max(document.documentElement.scrollWidth - innerWidth, body.scrollWidth - body.clientWidth),
        out,
      };
    });
  const isPic = (a, src) => !!a && a.img === src && a.loaded;
  const isInitial = (a, letter) => !!a && a.img === null && a.initial === letter;
  const settled = async (p, pred) => (await until(async () => { const r = await read(p); return r && pred(r) ? r : false; })) || (await read(p));
  const shot = async (p, name) => { await p.h.evaluate(() => (document.querySelector(".game-body").scrollTop = 0)); await sleep(250); await p.h.screenshot(`${name}-${W}.png`); };
  const fits = (r, who) => assert(r.overflow <= 0 && r.out === 0 && [...r.winners, ...r.rows.map((x) => x.avatar).filter(Boolean)].every((a) => a.w === a.h && a.w > 0), `${who}: fits ${W}px, every avatar square (overflow ${r.overflow}, outside ${r.out}, sizes ${r.winners.map((a) => a.w).join("/")} + ${r.rows.map((x) => x.avatar?.w ?? "-").join("/")})`);

  for (const g of GAMES) {
    section(`${g.title}: friends, host wins`);
    Object.assign(world, { relation: "friend", pictures: { [A.id]: PIC_A, [B.id]: PIC_B } });
    await startRoom(g);
    await finish(g, { [A.id]: 52, [B.id]: 16 }, A.id);
    for (const [p, view] of [[A, "win"], [B, "loss"]]) {
      const r = await settled(p, (r) => isPic(r.winners[0], PIC_A) && isPic(r.rows[1]?.avatar, PIC_B));
      assert(r.headline === `${A.name} ${g.won}` && r.points === "52 points", `${view} view: "${r.headline}", ${r.points}`);
      assert(r.winners.length === 1 && isPic(r.winners[0], PIC_A) && r.badge && !r.trophy, `${view} view: winner's picture, large, with the trophy badge`);
      assert(isPic(r.rows[0].avatar, PIC_A) && isPic(r.rows[1].avatar, PIC_B) && r.rows[0].hi && !r.rows[1].hi, `${view} view: both pictures in Final Scores, winner row marked`);
      fits(r, `${view} view`);
      await shot(p, `${g.slug}-${view}`);
    }

    section(`${g.title}: the winner leaves; the other player is still on the results`);
    await A.h.click({ css: ".games-primary-button", text: "Play Again" });
    assert(await until(async () => db[g.players].length === 1), "winner's player row is gone from the room");
    await sleep(900);
    let r = await read(B);
    assert(r.headline === `${A.name} ${g.won}` && isPic(r.winners[0], PIC_A) && r.rows.length === 2 && r.rows[0].name === A.name, `still "${r.headline}" with picture and both rows`);
    await shot(B, `${g.slug}-winner-left`);

    section(`${g.title}: friends, the other player wins and has no picture; loser's picture won't load`);
    Object.assign(world, { relation: "pending", pictures: { [A.id]: BROKEN } });
    await startRoom(g);
    await finish(g, { [A.id]: 4, [B.id]: 51 }, B.id);
    for (const [p, view] of [[A, "loss"], [B, "win"]]) {
      r = await settled(p, (r) => r.rows[1]?.avatar && isInitial(r.rows[1].avatar, "A"));
      assert(r.headline === `${B.name} ${g.won}` && isInitial(r.winners[0], "B"), `${view} view: no picture -> initial "B" for the winner`);
      assert(isInitial(r.rows[1].avatar, "A"), `${view} view: picture that fails to load -> initial "A"`);
      fits(r, `${view} view`);
      await shot(p, `${g.slug}-nopicture-${view}`);
    }
    assert(p404(), "the broken picture really was requested");

    for (const relation of ["stranger", "blocked"]) {
      section(`${g.title}: ${relation} (no profile card from the database)`);
      Object.assign(world, { relation, pictures: { [A.id]: PIC_A, [B.id]: PIC_B } });
      await startRoom(g);
      await finish(g, { [A.id]: 52, [B.id]: 16 }, A.id);
      r = await settled(A, (r) => isPic(r.winners[0], PIC_A));
      assert(isPic(r.winners[0], PIC_A) && isInitial(r.rows[1].avatar, "B"), "winner sees their own picture, initial for the other");
      await sleep(700);
      r = await read(B);
      assert(isInitial(r.winners[0], "A") && isInitial(r.rows[0].avatar, "A") && isPic(r.rows[1].avatar, PIC_B), "loser sees the winner's initial, never their picture");
      if (relation === "stranger") await shot(B, `${g.slug}-stranger-loss`);
    }

    section(`${g.title}: tie`);
    Object.assign(world, { relation: "friend", pictures: { [A.id]: PIC_A } });
    await startRoom(g);
    await finish(g, { [A.id]: 12, [B.id]: 12 }, null);
    for (const [p, view] of [[A, "host"], [B, "joiner"]]) {
      r = await settled(p, (r) => isPic(r.winners[0], PIC_A) || isPic(r.winners[1], PIC_A));
      assert(r.headline === "It's a tie!" && r.points === "12 points each", `${view}: "${r.headline}", ${r.points}`);
      assert(r.winners.length === 2 && r.winners.some((a) => isPic(a, PIC_A)) && r.winners.some((a) => isInitial(a, "B")) && r.captions.length === 2 && r.trophy && !r.badge, `${view}: both tied players shown (picture + initial), trophy above`);
      assert(r.rows.every((x) => x.hi && x.avatar), `${view}: both rows marked`);
      fits(r, `${view}`);
      await shot(p, `${g.slug}-tie-${view}`);
    }
    await B.h.click({ css: ".games-primary-button", text: "Play Again" });
    await sleep(900);
    r = await read(A);
    assert(r.headline === "It's a tie!" && r.winners.length === 2, "tie stays a tie after one of them leaves");

    section(`${g.title}: crowded tie, long name, dark`);
    await startRoom(g);
    const more = g.slug === "trivia" ? 6 : 2;
    await finish(g, { [A.id]: 9, [B.id]: 9 }, null, Array.from({ length: more }, (_, i) => ({ user_id: `00000000-0000-4000-8000-00000000ee0${i}`, display_name: i === 0 ? "Bartholomew-Maximilian Featherstonehaugh" : `${"CDEFGH"[i]}ara`, score: 9 })));
    r = await settled(A, (r) => r.winners.length === more + 2);
    assert(r.winners.length === more + 2, `${more + 2} tied pictures`);
    await A.h.setTheme("dark");
    r = await read(A);
    fits(r, "crowded tie");
    await shot(A, `${g.slug}-tie-crowded-dark`);
    await A.h.setTheme("light");

    section(`${g.title}: one player (unchanged)`);
    await startRoom(g, { solo: true });
    cardCalls.length = 0;
    await finish(g, { [A.id]: 30 }, A.id);
    r = await settled(A, (r) => r.rows.length === 1);
    await sleep(600);
    r = await read(A);
    assert(r.trophy && r.winners.length === 0 && r.rows[0].avatar === null && cardCalls.length === 0, "trophy only, no pictures, no profile request");
    await shot(A, `${g.slug}-solo`);
  }

  function p404() { return players.some((p) => p.backend.log.requests.some((q) => q.path.includes("/storage/v1/object/public/avatars/gone/"))); }
  section("page errors");
  for (const p of players) assert(p.errors.length === 0, `${p.name}: ${p.errors.slice(0, 2).join(" | ") || "none"}`);
  const leaks = players.reduce((n, p) => n + p.ledger.continuedExternal + p.ledger.forbiddenAttempts, 0);
  assert(leaks === 0, `network stayed closed (${leaks} external or real-Supabase requests)`);
  console.log(`${checks.filter(Boolean).length}/${checks.length} checks passed. screenshots: ${outDir}`);
  if (checks.some((c) => !c)) exitCode = 1;
} catch (e) {
  console.error(e);
  exitCode = 1;
} finally {
  for (const c of cleanups.reverse()) { try { await c(); } catch { /* best effort */ } }
}
process.exit(exitCode);
