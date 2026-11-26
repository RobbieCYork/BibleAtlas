#!/usr/bin/env node
/**
 * Two players, two real Chromes, one fake backend and fake Realtime: the multiplayer games' optional
 * camera and mic (Bible Trivia and Saving Peter), over a REAL WebRTC connection between the two
 * browsers using Chrome's fake camera/mic devices. Run directly (not through run.mjs):
 *
 *   node scripts/signed-in-harness/game-media.mjs --viewport 390x844
 *   node scripts/signed-in-harness/game-media.mjs --viewport 1280x800
 *
 * Real: the built app, getUserMedia against fake devices, Chrome's own permission "denied" setting,
 * ICE/DTLS/RTP between the two processes. Faked: the database, the room rpcs, Realtime, and (as
 * in-page stubs) a missing/busy device, an unanswered prompt and Safari's blocked autoplay.
 * Not covered: real devices, Safari/WebKit, two different networks, real Realtime.
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
const outDir = arg("--out") ?? mkdtempSync(join(tmpdir(), "game-media-out."));
mkdirSync(outDir, { recursive: true });
const phone = W <= 768;

/** Runs in each page before the app: records getUserMedia calls, tracks and peer connections, and
 * holds the switches for the failures Chrome's fake devices can't produce. */
const INSTRUMENT = `(() => {
  window.__gum = []; window.__tracks = []; window.__pcs = [];
  const md = navigator.mediaDevices, real = md.getUserMedia.bind(md);
  const grab = async (c) => { const s = await real(c); window.__tracks.push(...s.getTracks()); return s; };
  const fail = (name) => Promise.reject(new DOMException(name, name));
  md.getUserMedia = (c) => {
    window.__gum.push({ audio: !!c.audio, video: !!c.video });
    const mode = sessionStorage.getItem("__gumMode");
    if (mode === "no-camera" && c.video) return fail("NotFoundError");
    if (mode === "no-devices") return fail("NotFoundError");
    if (mode === "busy") return fail("NotReadableError");
    if (mode === "hang") return new Promise((res, rej) => { window.__answerPrompt = () => grab(c).then(res, rej); });
    return grab(c);
  };
  if (sessionStorage.getItem("__gumMode") === "unsupported") Object.defineProperty(Navigator.prototype, "mediaDevices", { get: () => undefined, configurable: true });
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends PC { constructor(c) { super(c); window.__pcs.push(this); } };
  // Safari-like: sound may only start inside a tap, until this element has once been started in one.
  const play = HTMLMediaElement.prototype.play;
  let inTap = false;
  for (const t of ["click", "touchend"]) window.addEventListener(t, () => { inTap = true; setTimeout(() => (inTap = false), 0); }, true);
  HTMLMediaElement.prototype.play = function () {
    if (sessionStorage.getItem("__blockAudio") && this.tagName === "AUDIO" && !this.__unlocked) {
      if (!inTap) { this.pause(); return Promise.reject(new DOMException("blocked", "NotAllowedError")); }
      this.__unlocked = true;
    }
    return play.call(this);
  };
  if (sessionStorage.getItem("__blockAudio")) new MutationObserver(() => document.querySelectorAll("audio[autoplay]").forEach((a) => (a.autoplay = false))).observe(document, { childList: true, subtree: true });
})()`;

const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const cleanups = [];
let exitCode = 0;

// ---------------------------------------------------------------- the shared fake room database
const rt = createFakeRealtime();
const players = [];
const db = {};
const push = (table) => { for (const p of players) p.backend.setTable(table, db[table] ?? []); rt.tableChanged(table); };
const GAMES = [
  { title: "Bible Trivia", rooms: "game_rooms", players: "game_players", answers: "game_buzzes", create: "create_game_room", join: "join_game_room", start: "start_game_room", leave: "leave_game_room", advance: "check_and_advance", ids: "question_ids", index: "current_question_index", startedAt: "current_question_started_at", playing: ".game-choice-button" },
  { title: "Saving Peter", rooms: "saving_peter_rooms", players: "saving_peter_players", answers: "saving_peter_guesses", create: "create_saving_peter_room", join: "join_saving_peter_room", start: "start_saving_peter_room", leave: "leave_saving_peter_room", advance: "check_and_advance_saving_peter", ids: "round_ids", index: "current_round_index", startedAt: "current_round_started_at", playing: ".saving-peter-guess-input" },
];
let roomSeq = 0;
const rpcLog = [];
function fakeRooms(backend) {
  for (const g of GAMES) {
    const seat = (room) => {
      const me = backend.persona;
      if (!db[g.players].some((p) => p.room_id === room.id && p.user_id === me.id))
        db[g.players].push({ id: `p${db[g.players].length}`, room_id: room.id, user_id: me.id, display_name: me.name, score: 0, joined_at: new Date().toISOString() });
      push(g.players);
      return room;
    };
    backend.setRpc(g.create, (a) => {
      const me = backend.persona;
      const room = { id: `room-${++roomSeq}-${Date.now()}`, code: "ABC123", host_id: me.id, status: "lobby", [g.ids]: a[`p_${g.ids}`] ?? [], [g.index]: 0, [g.startedAt]: null, target_score: 50, winner_id: null, created_at: new Date().toISOString() };
      db[g.rooms] = [room]; db[g.players] = []; db[g.answers] = [];
      push(g.rooms); push(g.answers);
      return seat(room);
    });
    backend.setRpc(g.join, () => seat(db[g.rooms][0]));
    backend.setRpc(g.start, () => {
      const room = db[g.rooms][0];
      Object.assign(room, { status: "active", [g.startedAt]: new Date().toISOString() });
      if (g.title === "Saving Peter" && !room[g.ids].length) room[g.ids] = ["easy:NOAH", "easy:MOSES"];
      push(g.rooms);
      return room;
    });
    backend.setRpc(g.leave, () => {
      rpcLog.push(`${g.leave}:${backend.persona.name}`);
      db[g.players] = (db[g.players] ?? []).filter((p) => p.user_id !== backend.persona.id);
      push(g.players);
      return null;
    });
    backend.setRpc(g.advance, () => db[g.rooms][0]);
  }
}

try {
  const tmp = mkdtempSync(join(tmpdir(), "game-media-dist."));
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
  async function player(label, persona) {
    const backend = createBackend({ persona });
    fakeRooms(backend);
    const chrome = await launchChrome({ extraArgs: ["--use-fake-device-for-media-stream", "--disable-features=WebRtcHideLocalIpsWithMdns"] });
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
    const p = { label, h, tab, backend, errors, ledger, realtime, id: backend.persona.id, name: backend.persona.name };
    p.permission = async (setting) => { for (const name of ["camera", "microphone"]) await tab.send("Browser.setPermission", { origin, permission: { name }, setting }); };
    players.push(p);
    await p.permission("granted");
    await h.goto("/");
    await h.sleep(1200);
    return p;
  }

  const A = await player("A (host)", "member");
  const B = await player("B (joiner)", "advisor");

  const assert = (cond, msg) => { checks.push(!!cond); console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); return !!cond; };
  const section = (s) => console.log(`\n${s}`);
  const until = async (fn, ms = 12000) => { const t = Date.now(); for (;;) { const v = await fn().catch(() => false); if (v) return v; if (Date.now() - t > ms) return false; await sleep(200); } };

  const gum = (p) => p.h.evaluate(() => window.__gum);
  const liveTracks = (p) => p.h.evaluate(() => window.__tracks.filter((t) => t.readyState === "live").map((t) => t.kind).sort());
  const inbound = (p) => p.h.evaluate(async () => {
    const out = { audio: 0, video: 0, frames: 0, connected: 0 };
    for (const pc of window.__pcs) {
      if (pc.connectionState !== "connected") continue;
      out.connected++;
      for (const s of (await pc.getStats()).values()) if (s.type === "inbound-rtp") { out[s.kind] += s.bytesReceived; if (s.kind === "video") out.frames += s.framesDecoded ?? 0; }
    }
    return out;
  });
  const grows = async (p, key) => { const a = (await inbound(p))[key]; return until(async () => (await inbound(p))[key] > a, 8000); };
  const connected = (p) => until(async () => (await inbound(p)).connected === 1);
  /** The tile for `label` ("You" or a name): does it show moving video, or the initial avatar? */
  const tile = (p, label) => p.h.evaluate((label) => {
    const t = [...document.querySelectorAll(".game-video-tile")].find((t) => t.querySelector(".game-video-label")?.innerText.trim() === label);
    if (!t) return null;
    const v = t.querySelector("video");
    return v ? { video: true, w: v.videoWidth, playing: !v.paused, muted: v.muted } : { video: false, avatar: t.querySelector(".game-video-fallback")?.innerText.trim() };
  }, label);
  const showsVideo = (p, label) => until(async () => { const t = await tile(p, label); return t?.video && t.w > 0 && t.playing; });
  const showsAvatar = (p, label) => until(async () => { const t = await tile(p, label); return t && !t.video && t.avatar; });
  const audios = (p) => p.h.evaluate(() => [...document.querySelectorAll("audio")].map((a) => ({ tracks: a.srcObject?.getAudioTracks().length ?? 0, paused: a.paused, muted: a.muted })));
  const status = (p) => p.h.evaluate(() => [...document.querySelectorAll(".game-media-status")].map((e) => e.innerText.trim()).join(" "));
  const hears = (p) => until(async () => { const a = await audios(p); return a.length === 1 && a[0].tracks === 1 && !a[0].paused && !a[0].muted; });
  const toggle = (p, name) => p.h.click(`.game-video-toggle[aria-label$="${name} on"], .game-video-toggle[aria-label$="${name} off"], .game-video-toggle[aria-label="Cancel turning on ${name}"]`);
  const choose = (p, text) => p.h.click({ css: ".game-media-choice button", text });
  const inLobby = (p) => p.h.exists(".game-lobby-code");
  const layout = async (p, what) => {
    const r = await p.h.evaluate(() => ({
      over: document.documentElement.scrollWidth - window.innerWidth,
      bad: [...document.querySelectorAll(".game-media-choice button, .game-video-toggle, .game-media-status:not(:empty), .game-audio-unlock")]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width <= 0 || r.left < -0.5 || r.right > window.innerWidth + 0.5; }).length,
    }));
    assert(r.over <= 0 && r.bad === 0, `${what}: fits ${W}px (sideways overflow ${r.over}, clipped controls ${r.bad})`);
    await p.h.screenshot(`${what.replace(/[^a-z0-9]+/gi, "-")}-${W}.png`);
  };

  /** The round has run out, so Continue is stuck to the bottom: at the top and the bottom of the
   * scroll, on a short phone too, it must not sit over a camera/mic switch or the unlock button, and
   * each of those must still be the thing under its own centre. Nobody taps first: any tap would
   * start the blocked sound and take the unlock button away. */
  const barClear = async (p, what, sizes = [[W, H], ...(phone ? [[375, 667], [320, 568]] : [])]) => {
    Object.assign(db.game_rooms[0], { current_question_started_at: new Date(Date.now() - 60000).toISOString() });
    push("game_rooms");
    await p.h.waitFor({ css: ".game-action-button", text: "Continue" });
    assert(await p.h.exists(".game-audio-unlock"), `${what}: the sound button and Continue are on screen together`);
    for (const [w, ht] of sizes) {
      await p.tab.send("Emulation.setDeviceMetricsOverride", { width: w, height: ht, deviceScaleFactor: 1, mobile: phone });
      await sleep(300);
      const r = await p.h.evaluate(() => {
        const body = document.querySelector(".game-body"), bar = () => document.querySelector(".game-action-bar").getBoundingClientRect();
        const bad = [];
        for (const el of body.querySelectorAll(".game-video-toggle, .game-audio-unlock, .game-action-button")) {
          el.scrollIntoView({ block: "nearest", behavior: "instant" });
          const b = el.getBoundingClientRect();
          const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          if (!hit || !(el === hit || el.contains(hit))) bad.push(`covered ${el.className}`);
        }
        for (const top of [0, body.scrollHeight]) {
          body.scrollTop = top;
          const a = bar(), view = body.getBoundingClientRect();
          if (a.bottom > view.bottom + 1 || a.top < view.top) bad.push(`bar off screen at ${top}`);
          if (top === 0) for (const el of body.querySelectorAll(".game-video-controls, .game-media-status:not(:empty), .game-audio-unlock")) {
            const b = el.getBoundingClientRect();
            if (b.bottom > a.top + 1 && b.top < a.bottom - 1) bad.push(`overlap ${el.className}`);
          }
        }
        return bad;
      });
      assert(r.length === 0, `${what} ${w}x${ht}: Continue bar clear of the camera/mic controls ${r.join(", ")}`);
      await p.h.evaluate(() => (document.querySelector(".game-body").scrollTop = 0));
      await p.h.screenshot(`continue-bar-${what}-${w}x${ht}.png`);
    }
    await p.tab.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: phone });
  };

  const openGame = async (p, g) => {
    if (phone) await p.h.click({ css: ".mobile-tab", text: "Games" });
    else { await p.h.click(MENU_BUTTON); await p.h.click({ css: ".panel-menu-link", text: "Games" }); }
    await p.h.waitFor(".game-center-card, .game-root .back-btn");
    await p.h.click({ css: ".game-center-card", text: g.title });
  };
  const create = async (p) => { await p.h.click({ css: ".game-entry-card", text: "Create multiplayer game" }); await p.h.click(".game-start-button"); };
  /** Both pages reloaded with the given in-page switches, rooms cleared. */
  const fresh = async (switches = {}) => {
    for (const p of players) {
      await p.permission("granted");
      p.realtime.disconnect();
      await p.h.evaluate((s) => { for (const k of Object.keys(sessionStorage)) if (k !== "__seeded") sessionStorage.removeItem(k); for (const [k, v] of Object.entries(s)) sessionStorage.setItem(k, v); }, switches[p.label[0]] ?? {});
      await p.h.reload();
      await p.h.sleep(900);
    }
    rpcLog.length = 0;
  };
  const host = async (g) => { await openGame(A, g); await create(A); await A.h.waitFor(".game-lobby-code"); };
  const enterCode = async (p) => { await p.h.type(".games-code-input", "ABC123"); await p.h.click({ css: ".game-start-button", text: "Join game" }); await p.h.waitFor(".game-lobby-code"); };
  const joinRoom = async (g) => { await openGame(B, g); await B.h.click({ css: ".game-entry-card", text: "Join multiplayer game" }); await enterCode(B); };
  const leave = (p) => p.h.click(".game-video-leave");

  for (const g of GAMES) {
    section(`${g.title}: both join without camera or mic`);
    await fresh();
    await host(g);
    await sleep(800);
    assert(await A.h.exists(".game-media-choice"), "host sees the choice card in the lobby");
    assert((await gum(A)).length === 0, "nothing was asked of the browser yet");
    await layout(A, `${g.title} choice card`);
    await choose(A, "Play without camera or mic");
    await joinRoom(g);
    assert(await B.h.exists(".game-media-choice"), "joiner sees the choice card");
    await choose(B, "Play without camera or mic");
    assert((await connected(A)) && (await connected(B)), "the two browsers connect with no media on either side");
    await sleep(600);
    assert((await gum(A)).length === 0 && (await gum(B)).length === 0, "no getUserMedia call (so no browser prompt) for either player");
    assert((await showsAvatar(A, B.name)) === "H" && (await showsAvatar(B, A.name)) === "H", "each sees an initial + name tile for the other");
    assert((await showsAvatar(B, "You")) === "Y", "own tile is an avatar too");
    assert((await status(B)) === "", "no message for someone who chose to play without");
    assert(!(await B.h.exists(".game-media-choice")), "choice card is gone after choosing");

    section(`${g.title}: host turns camera and mic on later; the player with none sees and hears`);
    await toggle(A, "camera");
    await toggle(A, "microphone");
    assert(await showsVideo(B, A.name), "B (no media) sees A's video");
    assert((await grows(B, "audio")) && (await grows(B, "frames")), "B is receiving A's audio bytes and decoding video frames");
    assert(await hears(B), "B's audio element for A is playing, unmuted, with an audio track");
    assert(await showsAvatar(A, B.name), "A still sees B as an avatar");
    assert((await showsVideo(A, "You")) && (await tile(A, "You")).muted, "A's own preview is up and muted");
    assert((await gum(B)).length === 0, "B was still never asked");

    section(`${g.title}: off stops the track, on brings it back`);
    await toggle(A, "camera");
    assert(await until(async () => (await liveTracks(A)).join() === "audio"), "camera off: A's video track is ended (camera light out), mic still live");
    assert(await showsAvatar(B, A.name), "B's tile for A turns back into the avatar");
    assert(await grows(B, "audio"), "B still hears A");
    await toggle(A, "camera");
    assert((await showsVideo(B, A.name)) && (await grows(B, "frames")), "camera on again: B sees moving video again");
    await toggle(A, "microphone");
    assert(await until(async () => (await liveTracks(A)).join() === "video"), "mic off: A's audio track is ended");
    await toggle(A, "microphone");
    await toggle(B, "microphone");
    assert(await until(async () => (await liveTracks(B)).join() === "audio"), "B turns only the mic on, later");
    assert((await grows(A, "audio")) && (await hears(A)), "A now hears B");
    assert(await showsAvatar(A, B.name), "B (mic only) stays an avatar tile");

    section(`${g.title}: browser permission denied from the toggle`);
    await B.permission("denied");
    await toggle(B, "camera");
    assert(await until(async () => /permission wasn't given/.test(await status(B))), `B is told: "${await status(B)}"`);
    assert((await inLobby(B)) && rpcLog.length === 0, "B is still in the room; no leave call");
    assert(await showsVideo(B, A.name), "B still sees A");
    await layout(B, `${g.title} denied message`);
    await B.permission("granted");
    await toggle(B, "camera");
    assert((await showsVideo(A, B.name)) && (await status(B)) === "", "after allowing it, one tap turns B's camera on and clears the message");

    section(`${g.title}: lobby -> playing -> results -> leave`);
    await B.h.evaluate(() => (document.querySelector("audio").__same = 1));
    const asked = [(await gum(A)).length, (await gum(B)).length];
    await A.h.click({ css: ".games-primary-button", text: "Start Game" });
    await A.h.waitFor(g.playing); await B.h.waitFor(g.playing);
    assert((await showsVideo(A, B.name)) && (await showsVideo(B, A.name)), "video carries into the game");
    assert(await B.h.evaluate(() => document.querySelector("audio").__same === 1), "same audio element as in the lobby (sound isn't restarted)");
    assert((await grows(B, "audio")) && (await gum(A)).length === asked[0] && (await gum(B)).length === asked[1], "sound continues, nobody is asked again");
    await layout(B, `${g.title} playing`);

    await B.h.reload(); await B.h.sleep(900);
    await openGame(B, g);
    await B.h.waitFor(g.playing);
    assert((await connected(B)) && (await showsVideo(B, A.name)) && (await grows(B, "audio")), "B reloads mid-game, reconnects, sees and hears A");
    assert((await gum(B)).length === 0 && (await liveTracks(B)).length === 0, "after the reload B's devices stay off until tapped");
    assert(await showsAvatar(A, B.name), "A sees B as an avatar after the reload");
    await toggle(B, "camera");
    assert(await showsVideo(A, B.name), "and one tap turns B's camera back on");

    Object.assign(db[g.rooms][0], { status: "finished", winner_id: A.id });
    push(g.rooms);
    await A.h.waitFor(".game-results");
    assert((await A.h.count(".game-video-toggle")) === 2 && (await hears(A)), "results screen keeps the mic and camera switches, and the sound");
    await layout(A, `${g.title} results`);
    await toggle(A, "microphone");
    assert(await until(async () => (await liveTracks(A)).join() === "video"), "mic can be switched off on the results screen");
    await A.h.click({ css: ".games-primary-button", text: "Play Again" });
    assert(await until(async () => (await liveTracks(A)).length === 0), "leaving the room stops every track");
    assert((await audios(A)).length === 0, "and removes the other players' sound");
    assert(await until(async () => (await audios(B)).length === 0), "B (alone now, finished game) has no leftover audio element");

    section(`${g.title}: "Camera and mic" refused at the prompt`);
    await fresh();
    await host(g);
    await choose(A, "Camera and mic");
    assert(await until(async () => (await liveTracks(A)).join() === "audio,video"), "host alone in the lobby: camera and mic on after choosing");
    await B.permission("denied");
    await joinRoom(g);
    await choose(B, "Camera and mic");
    assert(await until(async () => /Your camera and mic are off: permission wasn't given/.test(await status(B))), "B gets the plain message");
    assert((await gum(B)).length === 1, "one request only: no second prompt after a refusal");
    assert((await inLobby(B)) && rpcLog.length === 0 && db[g.players].length === 2, "B is still in the room, still on the roster");
    assert((await showsVideo(B, A.name)) && (await grows(B, "audio")) && (await hears(B)), "B sees and hears A");
    assert(await showsAvatar(A, B.name), "A sees B's avatar tile");
    await A.h.click({ css: ".games-primary-button", text: "Start Game" });
    await B.h.waitFor(g.playing);
    assert((await showsVideo(B, A.name)) && (await hears(B)), "B plays the game, still seeing and hearing A");
    if (g.title === "Bible Trivia") {
      // Round over: the sticky Continue bar (GameRoomPlay) is up together with the switches and the message.
      db[g.rooms][0][g.startedAt] = new Date(Date.now() - 20000).toISOString();
      push(g.rooms);
      await B.h.waitFor(".game-action-bar button:not(:disabled)");
      for (const [w, h] of phone ? [[W, H], [375, 667]] : [[W, H]]) {
        await B.h.cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: phone });
        await sleep(400);
        const r = await B.h.evaluate(async () => {
          const body = document.querySelector(".game-body");
          const cont = () => document.querySelector(".game-action-bar button");
          const buttons = () => [...document.querySelectorAll(".game-video-controls button")];
          const onTop = (el) => { const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && el.contains(t); };
          const frame = () => new Promise((res) => setTimeout(res, 150));
          body.scrollTop = 0; await frame();
          const gap = Math.round(document.querySelector(".game-action-bar").getBoundingClientRect().top - Math.max(...buttons().map((t) => t.getBoundingClientRect().bottom)));
          const atTop = buttons().length === 3 && buttons().every(onTop) && onTop(cont());
          body.scrollTop = body.scrollHeight; await frame();
          const atBottom = onTop(cont());
          return { atTop, gap, atBottom, message: !!document.querySelector(".game-media-status").innerText.trim() };
        });
        assert(r.atTop && r.gap >= 0 && r.atBottom && r.message, `${w}x${h}: with the message showing, mic, camera, Leave and the sticky Continue are clickable and do not overlap ${JSON.stringify(r)}`);
        await B.h.screenshot(`continue-bar-${w}x${h}.png`);
      }
      await B.h.cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: phone });
    }
    assert(await until(async () => (await status(B)) === "", 17000), "the message clears itself after a while");
  }

  const g = GAMES[0];
  section("Mic only");
  await fresh();
  await host(g); await choose(A, "Mic only");
  await joinRoom(g); await choose(B, "Mic only");
  assert(await until(async () => (await liveTracks(A)).join() === "audio" && (await liveTracks(B)).join() === "audio"), "only microphones are live");
  assert((await gum(A)).every((c) => c.audio && !c.video), "the camera was never requested");
  assert((await grows(A, "audio")) && (await grows(B, "audio")) && (await showsAvatar(A, B.name)), "both hear each other, avatar tiles");

  section("The player who starts the connection is the one with no media");
  await fresh();
  await host(g); await choose(A, "Play without camera or mic");
  await joinRoom(g); await choose(B, "Camera and mic");
  assert((await showsVideo(A, B.name)) && (await grows(A, "audio")) && (await grows(A, "frames")) && (await hears(A)), "host (no media, makes the offer) sees and hears the joiner");
  assert((await showsAvatar(B, A.name)) && (await gum(A)).length === 0, "joiner sees the host's avatar; host never asked");
  await leave(B);
  assert(await until(async () => (await liveTracks(B)).length === 0 && (await audios(A)).length === 0), "joiner leaves: devices stop, host drops the connection");
  await enterCode(B);
  await choose(B, "Camera and mic");
  assert((await showsVideo(A, B.name)) && (await grows(A, "audio")) && (await connected(B)), "same player rejoins straight away and reconnects");
  await toggle(B, "camera");
  assert(await showsAvatar(A, B.name), "their camera switched off shows at once");
  // A reload leaves the old presence entry behind in the fake, like a phone that drops without saying goodbye.
  await B.h.reload(); await B.h.sleep(900); await openGame(B, g); await B.h.waitFor(".game-lobby-code");
  await choose(B, "Camera and mic");
  assert((await showsVideo(A, B.name)) && (await grows(A, "audio")), "after a reload (old entry still there) they reconnect");
  await toggle(B, "microphone"); await toggle(B, "microphone");
  await leave(B);
  assert(await until(async () => (await audios(A)).length === 0), "and when they then leave, the host still drops the connection");

  section("No camera on the device / camera busy");
  await fresh({ A: { __gumMode: "no-camera" }, B: { __gumMode: "busy" } });
  await host(g); await choose(A, "Camera and mic");
  assert(await until(async () => (await liveTracks(A)).join() === "audio"), "no camera: the mic still comes on");
  assert(/No camera was found/.test(await status(A)), `message: "${await status(A)}"`);
  await joinRoom(g); await choose(B, "Camera and mic");
  assert(await until(async () => /busy/.test(await status(B))), `busy message: "${await status(B)}"`);
  assert((await inLobby(B)) && (await grows(B, "audio")) && rpcLog.length === 0, "busy player stays and hears");
  await layout(B, "busy message");

  section("Prompt left unanswered / dismissed without an answer");
  await fresh({ B: { __gumMode: "hang" } });
  await host(g); await choose(A, "Camera and mic");
  await joinRoom(g); await choose(B, "Camera and mic");
  assert(await until(async () => /Waiting for permission/.test(await status(B))), "shows it is waiting");
  assert((await inLobby(B)) && (await showsVideo(B, A.name)), "the room carries on behind the prompt");
  await toggle(B, "camera"); await toggle(B, "microphone");
  assert((await status(B)) === "", "tapping the buttons cancels the wait");
  await B.h.evaluate(() => window.__answerPrompt());
  await sleep(700);
  assert((await B.h.evaluate(() => window.__tracks.length)) === 2 && (await liveTracks(B)).length === 0, "a late Allow after cancelling is thrown away: tracks stopped");
  await A.h.click({ css: ".games-primary-button", text: "Start Game" });
  await B.h.waitFor(g.playing);
  assert(true, "host can start while someone never answered");

  section("Browser with no camera API at all (blank screen on the old build)");
  await fresh({ B: { __gumMode: "unsupported" } });
  await host(g); await choose(A, "Camera and mic");
  await joinRoom(g); await choose(B, "Camera and mic");
  assert(await until(async () => /can't use a camera or mic/.test(await status(B))), "plain message");
  assert((await inLobby(B)) && (await showsVideo(B, A.name)), "still in the room and receiving");

  section("Safari-style blocked sound for someone with no media");
  await fresh({ B: { __blockAudio: "1" } });
  await host(g); await choose(A, "Camera and mic");
  await joinRoom(g);
  await B.h.waitFor(".game-audio-unlock");
  assert((await audios(B))[0].paused, "sound is blocked, so a button appears");
  assert(await showsVideo(B, A.name), "picture still plays (video is muted)");
  await B.h.evaluate(() => { const b = document.querySelector(".game-body"); b.scrollTop = b.scrollHeight; });
  await sleep(300);
  assert(await B.h.evaluate(() => { const b = document.querySelector(".game-body").getBoundingClientRect(), r = document.querySelector(".game-audio-unlock").getBoundingClientRect(); return r.top >= b.top - 1 && r.bottom <= b.bottom + 1; }), "the button stays on screen when scrolled to the bottom");
  await layout(B, "tap to hear");
  await B.h.click(".game-audio-unlock");
  assert((await hears(B)) && (await until(async () => !(await B.h.exists(".game-audio-unlock")))), "one tap starts the sound and removes the button");
  await A.h.click({ css: ".games-primary-button", text: "Start Game" });
  await B.h.waitFor(g.playing);
  assert((await hears(B)) && !(await B.h.exists(".game-audio-unlock")), "not asked again when the game starts");

  section("Blocked sound button and the Continue bar during play");
  await fresh({ B: { __blockAudio: "1" } });
  await host(g); await choose(A, "Camera and mic");
  await joinRoom(g);
  await B.h.waitFor(".game-audio-unlock");
  await A.h.click({ css: ".games-primary-button", text: "Start Game" });
  await B.h.waitFor(g.playing);
  await B.h.waitFor(".game-audio-unlock");
  await barClear(B, "unlock");

  section("A newer build deployed while in the lobby");
  await fresh();
  await host(g);
  await A.h.evaluate(() => { window.__marker = 1; const f = window.fetch.bind(window); window.fetch = (u, o) => String(u).includes("/version.json") ? Promise.resolve(new Response('{"buildId":"newer"}', { status: 200 })) : f(u, o); window.dispatchEvent(new Event("focus")); });
  await sleep(2500);
  assert((await A.h.evaluate(() => window.__marker === 1)) && (await inLobby(A)) && (await A.h.exists(".update-pill")), "no reload out of the room; the Refresh pill is offered instead");

  section("Solo play never involves camera or mic");
  await fresh();
  await openGame(A, g);
  await A.h.click({ css: ".game-entry-card", text: "Play solo" });
  await A.h.click(".game-start-button");
  await A.h.waitFor(g.playing);
  assert(!(await A.h.exists(".game-media-choice")) && (await A.h.count(".game-video-toggle:not(.game-video-leave)")) === 0 && (await gum(A)).length === 0, "no card, no switches, no request");
  await leave(A);
  await A.h.click(".game-header .back-btn");
  await create(A);
  await choose(A, "Camera and mic");
  assert(await until(async () => (await liveTracks(A)).length === 2), "alone in a lobby, media on");
  await A.h.click({ css: ".games-primary-button", text: "Start Solo Game" });
  await A.h.waitFor(g.playing);
  assert(await until(async () => (await liveTracks(A)).length === 0), "starting solo from the lobby stops the devices");

  section("Page errors and network");
  for (const p of players) {
    const real = p.errors.filter((e) => !/openfreemap|bible-api|Failed to fetch/i.test(e));
    assert(real.length === 0, `${p.label}: no page errors ${real.slice(0, 2).join(" | ")}`);
    assert(p.ledger.continuedExternal === 0, `${p.label}: 0 requests let through to the network`);
  }
  const failed = checks.filter((c) => !c).length;
  console.log(`\n${W}x${H}: ${checks.length - failed} passed, ${failed} failed. screenshots: ${outDir}`);
  exitCode = failed ? 1 : 0;
} catch (e) {
  console.error("harness error:", e?.stack ?? e);
  for (const p of players) console.error(p.label, (await p.h.evaluate(() => document.querySelector(".game-root")?.innerText ?? document.body.innerText.slice(0, 300)).catch(() => "")), p.errors.slice(0, 3));
  exitCode = 1;
} finally {
  for (const c of cleanups.reverse()) c();
}
process.exit(exitCode);
