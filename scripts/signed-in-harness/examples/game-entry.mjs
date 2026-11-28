/**
 * A game with multiplayer opens on how to play and nothing else: Play solo, Create multiplayer game,
 * Join multiplayer game. Options come after a choice, behind one start button; Join is the code and
 * nothing else. A solo-only game has no such screen: it opens straight on its own options (or verse
 * list), and Back from there is Game Center. Back steps one level; a room this tab is seated in is
 * rejoined; a game switched to Testing stays shut.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844  --script scripts/signed-in-harness/examples/game-entry.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/game-entry.mjs
 *
 * The room RPCs are small fakes and there is no Realtime, so this proves the screens and what the
 * client sends, not the server.
 */
import { MENU_BUTTON } from "../lib/app.mjs";

const THREE = ["Play solo", "Create multiplayer game", "Join multiplayer game"];
const GAMES = [
  { title: "Bible Trivia", choices: THREE },
  { title: "Saving Peter", choices: THREE },
  { title: "Fill in the Blank", ready: ".fillblank-picker", levels: true, playing: ".fillblank-input", picture: true },
  { title: "Scripture Memorization Challenge", ready: ".memchallenge-picker", picture: false },
  { title: "Chronology", ready: ".chronology-picker", levels: true, playing: ".chronology-card", picture: true },
  { title: "Daily Name", ready: ".dn-setup", picture: true },
  { title: "20 Questions", ready: ".tq-setup", picture: true },
];
const OPTIONS = ".games-topic-select, .games-difficulty, .games-code-input, .game-start-button, .games-high-scores, .games-panel-intro, .memchallenge-picker";

export default async function (h) {
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = phone ? "phone" : "desktop";

  const rpcs = [];
  const fake = ({ rooms, players, create, join, start, leave, ids }) => {
    const room = () => h.backend.tables[rooms]?.[0];
    const make = (name) => (a) => {
      rpcs.push(name);
      const me = h.backend.persona;
      const r = { id: `${rooms}-1`, code: "ABC123", host_id: me.id, status: "lobby", [ids]: a[`p_${ids}`] ?? [], current_question_index: 0, current_round_index: 0, current_question_started_at: null, current_round_started_at: null, target_score: 50, winner_id: null, created_at: new Date().toISOString() };
      h.backend.setTable(rooms, [r]);
      h.backend.setTable(players, [{ id: "p1", room_id: r.id, user_id: me.id, display_name: me.name, score: 0, joined_at: r.created_at }]);
      return r;
    };
    h.backend.setRpc(create, make(create));
    h.backend.setRpc(join, make(join));
    h.backend.setRpc(start, () => { rpcs.push(start); return Object.assign(room(), { status: "active", current_question_started_at: new Date().toISOString(), current_round_started_at: new Date().toISOString() }); });
    h.backend.setRpc(leave, () => { rpcs.push(leave); h.backend.setTable(rooms, []); return null; });
  };
  fake({ rooms: "game_rooms", players: "game_players", create: "create_game_room", join: "join_game_room", start: "start_game_room", leave: "leave_game_room", ids: "question_ids" });
  fake({ rooms: "saving_peter_rooms", players: "saving_peter_players", create: "create_saving_peter_room", join: "join_saving_peter_room", start: "start_saving_peter_room", leave: "leave_saving_peter_room", ids: "round_ids" });

  const openCenter = async () => {
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else { await h.click(MENU_BUTTON); await h.click({ css: ".panel-menu-link", text: "Games" }); }
    await h.waitFor(".game-center-card, .game-root .back-btn");
  };
  const fresh = async () => {
    await h.evaluate(() => { for (const k of Object.keys(sessionStorage)) if (k.startsWith("bible-atlas-active-")) sessionStorage.removeItem(k); });
    await h.reload(); await h.sleep(900);
    await openCenter();
  };
  /** The screen a game opens on: the three choices, or a solo-only game's own options. */
  const arrival = (title) => GAMES.find((g) => g.title === title).ready ?? ".game-entry-card";
  const open = async (title) => { await fresh(); await h.click({ css: ".game-center-card", text: title }); await h.waitFor(arrival(title)); };
  const choose = async (text) => { await h.click({ css: ".game-entry-card", text }); await h.sleep(200); };
  const back = async () => { await h.click(".game-header button"); await h.sleep(250); };
  const header = () => h.text(".game-header h2");
  const choices = () => h.evaluate(() => [...document.querySelectorAll(".game-entry-card .game-center-card-title")].map((e) => e.textContent.trim()));
  const picture = () => h.evaluate(() => /judean-road/.test(getComputedStyle(document.querySelector(".game-root")).backgroundImage));
  const isFirst = async (g, how) => {
    const found = await choices();
    const extra = await h.count(OPTIONS);
    const text = await h.evaluate(() => document.querySelector(".game-body").innerText.replace(/[›\s]+/g, " ").trim());
    h.assert(JSON.stringify(found) === JSON.stringify(g.choices) && extra === 0 && text === g.choices.join(" "), `${g.title} ${how}: first screen is only "${text}"`);
  };
  /** Nothing sideways, and every enabled control is the thing under its own centre. */
  const sound = async (name) => {
    const r = await h.evaluate(() => {
      const root = document.querySelector(".game-mode"), body = root.querySelector(".game-body");
      const wide = [...root.querySelectorAll("button, input, select, p, label, legend, h2, h3, li")].filter((el) => { const b = el.getBoundingClientRect(); return b.width && (b.left < -0.5 || b.right > innerWidth + 0.5); }).map((el) => `${el.tagName}.${el.className}`);
      const covered = [], top = body.scrollTop;
      for (const el of root.querySelectorAll("button:not(:disabled), input:not(:disabled), select")) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        const b = el.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!hit || !(el === hit || el.contains(hit))) covered.push(`${el.tagName}.${el.className}`);
      }
      body.scrollTop = top;
      return { sideways: Math.max(body.scrollWidth - body.clientWidth, document.documentElement.scrollWidth - innerWidth), wide: wide.slice(0, 4), covered: covered.slice(0, 4) };
    });
    const ok = r.sideways <= 0 && !r.wide.length && !r.covered.length;
    h.assert(ok, `${name}: layout sound ${ok ? "" : JSON.stringify(r)}`);
    await h.screenshot(`${name}-${dev}.png`);
  };

  for (const g of GAMES.filter((x) => x.choices)) {
    h.section(`${g.title} (${dev})`);
    await open(g.title);
    await isFirst(g, "from Game Center");
    h.assert(await picture(), `${g.title}: photograph behind the first screen`);
    await sound(`first-${g.title.split(" ")[0].toLowerCase()}`);
    await back();
    h.assert((await header()) === "Game Center", `${g.title}: Back from the first screen is Game Center`);
    h.assert(rpcs.length === 0, `${g.title}: looking creates no room`);
  }

  const soloChoice = { css: ".game-entry-card, .game-center-card-title", text: "Play solo" };
  for (const g of GAMES.filter((x) => x.ready)) {
    h.section(`${g.title}: straight to its own screen (${dev})`);
    await open(g.title);
    h.assert(!(await h.exists(soloChoice)) && !/Play solo/.test(await h.text(".game-body")), `${g.title}: no Play solo screen, row or heading`);
    h.assert((await picture()) === g.picture, `${g.title}: ${g.picture ? "photograph behind it" : "plain, no photograph"}`);
    h.assert((await h.evaluate(() => document.querySelector(".game-header button").getAttribute("aria-label"))) === "Back to Game Center", "its Back says Back to Game Center");
    await sound(`solo-${g.title.split(" ")[0].toLowerCase()}`);
    await back();
    h.assert((await header()) === "Game Center", `${g.title}: one Back is Game Center`);
    // And again: nothing remembers a skipped screen.
    await h.click({ css: ".game-center-card", text: g.title });
    await h.waitFor(g.ready);
    h.assert(true, `${g.title}: reopened on the same screen`);
    h.assert(rpcs.length === 0, `${g.title}: looking creates no room`);
  }

  for (const g of GAMES.filter((x) => x.levels)) {
    h.section(`${g.title}: difficulty, then Start`);
    await open(g.title);
    const levels = await h.evaluate(() => [...document.querySelectorAll(".game-level-option input")].map((i) => i.value));
    h.assert(levels.length >= 3 && (await h.count(".game-start-button")) === 1 && !(await h.exists(g.playing)), `${levels.length} levels and one start button; nothing has started`);
    await h.click(`.game-level-option input[value="${levels[2]}"]`);
    h.assert(!(await h.exists(g.playing)) && (await h.evaluate(() => document.querySelector(".game-level-option input:checked").value)) === levels[2], `choosing ${levels[2]} only selects it`);
    await sound(`setup-${g.title.split(" ")[0].toLowerCase()}`);
    // Keyboard: the radios are real, so an arrow key moves the choice.
    await h.evaluate(() => document.querySelector(".game-level-option input:checked").focus());
    h.assert(await h.evaluate(() => getComputedStyle(document.activeElement.parentElement).outlineStyle !== "none" || !document.activeElement.matches(":focus-visible")), "a focused level shows its ring");
    const reach = await h.evaluate(() => {
      const body = document.querySelector(".game-body");
      body.scrollTop = 0;
      const b = document.querySelector(".game-start-button"), r = b.getBoundingClientRect(), v = body.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { onScreen: r.top >= v.top && r.bottom <= v.bottom + 0.5, clickable: !!hit && b.contains(hit) };
    });
    h.assert(reach.onScreen && reach.clickable, `Start is on screen without scrolling ${JSON.stringify(reach)}`);
    await h.screenshot(`setup-top-${g.title.split(" ")[0].toLowerCase()}-${dev}.png`);
    await h.click(".game-start-button");
    await h.waitFor(g.playing);
    await back();
    h.assert((await h.exists(g.ready)) && (await h.evaluate(() => document.querySelector(".game-level-option input:checked").value)) === levels[2], "Back from play is the difficulty screen, choice kept");
    await back();
    h.assert((await header()) === "Game Center", "then Game Center");
  }

  h.section("Scripture Memorization Challenge: verse, then Start");
  const memo = GAMES[3];
  await open(memo.title);
  h.assert((await h.count(".memchallenge-verse-row")) > 50 && /mastered/.test(await h.text(".memchallenge-picker .games-panel-intro")), "verse list and mastered count on opening");
  await sound("setup-memorization");
  await h.click(".memchallenge-verse-row");
  h.assert((await h.exists(".memchallenge-ready")) && (await h.count(".memchallenge-btn-primary")) === 1 && !(await h.exists(".memchallenge-input")), "a verse opens with one start button");
  await h.click(".memchallenge-btn-primary");
  await h.waitFor(".memchallenge-input");
  await back();
  h.assert(await h.exists(".memchallenge-picker"), "Back from play is the verse list");
  await h.click(".memchallenge-verse-row");
  await back();
  h.assert(await h.exists(".memchallenge-picker"), "Back from the verse is the verse list");
  await back();
  h.assert((await header()) === "Game Center", "then Game Center");

  h.section("Saving Peter solo");
  const peter = GAMES[1];
  await open(peter.title);
  await choose("Play solo");
  h.assert((await h.count(".game-level-option")) === 5 && !(await h.exists(".saving-peter-keyboard")) && !(await h.exists(".games-high-scores")), "five levels, not started");
  await sound("setup-peter-solo");
  await h.click('.game-level-option input[value="expert"]');
  await h.click(".game-start-button");
  await h.waitFor(".saving-peter-keyboard");
  h.assert(/\/ 3$/.test(await h.text(".saving-peter-status")), "Expert starts with 3 guesses");
  await back();
  h.assert(await h.exists(".level-picker"), "Back from play is the difficulty screen");
  await back();
  await isFirst(peter, "after Back");

  const rooms = [
    { g: GAMES[0], key: "bible-atlas-active-game-room", join: "join_game_room", create: "create_game_room", start: "start_game_room", leave: "leave_game_room", playing: ".game-choice-button" },
    { g: peter, key: "bible-atlas-active-saving-peter-room", join: "join_saving_peter_room", create: "create_saving_peter_room", start: "start_saving_peter_room", leave: "leave_saving_peter_room", playing: ".saving-peter-guess-input" },
  ];
  for (const r of rooms) {
    const { g } = r;
    const stored = () => h.evaluate((k) => sessionStorage.getItem(k), r.key);

    h.section(`${g.title}: Create multiplayer game`);
    await open(g.title);
    rpcs.length = 0;
    await choose("Create multiplayer game");
    await h.waitFor(".game-start-button");
    h.assert(rpcs.length === 0 && (await h.exists(".games-panel-intro")) && (await h.exists(".games-high-scores")) && !(await h.exists(".games-code-input")), "rules, high scores and no code box; no room yet");
    h.assert((await h.exists(".games-topic-select")) === (g.title === "Bible Trivia") && (await h.count(".game-start-button")) === 1, "options only where the game has them, one start button");
    await sound(`create-${g.title.split(" ")[0].toLowerCase()}`);
    await h.click({ css: ".game-start-button", text: "Create game" });
    await h.waitFor(".game-lobby-code");
    h.assert(rpcs.join() === r.create, `lobby, from ${rpcs.join()}`);
    await sound(`lobby-${g.title.split(" ")[0].toLowerCase()}`);
    await back();
    await h.waitFor(".game-start-button");
    h.assert(rpcs.includes(r.leave) && !(await stored()), "Back leaves the room, onto the create screen");
    await back();
    await isFirst(g, "after Back");

    h.section(`${g.title}: Join multiplayer game`);
    rpcs.length = 0;
    await choose("Join multiplayer game");
    await h.waitFor(".games-code-input");
    h.assert((await h.count(".games-code-input, .game-start-button")) === 2 && !(await h.exists(".games-topic-select, .games-difficulty, .games-high-scores, .games-panel-intro")), "the code and its button, no options");
    h.assert(await h.evaluate(() => document.querySelector(".game-start-button").disabled), "disabled until a code is typed");
    h.assert(await picture(), "photograph behind the code entry");
    await sound(`join-${g.title.split(" ")[0].toLowerCase()}`);
    await h.type(".games-code-input", "abc123");
    await h.click({ css: ".game-start-button", text: "Join game" });
    await h.waitFor(".game-lobby-code");
    h.assert(rpcs.join() === r.join, `lobby, from ${rpcs.join()}`);
    await h.click(".game-video-leave");
    await h.waitFor(".games-code-input");
    h.assert(!(await stored()), "Leave returns to the code entry");
    await back();
    await isFirst(g, "after Back");

    h.section(`${g.title}: rejoin after a reload`);
    await choose("Create multiplayer game");
    await h.click(".game-start-button");
    await h.waitFor(".game-lobby-code");
    await h.click({ css: ".games-primary-button", text: "Start Solo Game" });
    await h.sleep(200);
    await h.reload(); await h.sleep(900);
    await openCenter();
    await h.click({ css: ".game-center-card", text: g.title });
    await h.waitFor(r.playing);
    h.assert(!(await h.exists(".game-entry-card")), "straight back into the room");
    await back();
    await h.waitFor(".game-entry-card");
    await isFirst(g, "after leaving a rejoined room");

    h.section(`${g.title}: a stored room that is gone`);
    await h.evaluate((k) => sessionStorage.setItem(k, "gone"), r.key);
    await h.reload(); await h.sleep(900);
    await openCenter();
    await h.click({ css: ".game-center-card", text: g.title });
    await h.waitFor(".game-entry-card");
    h.assert(!(await stored()), "forgotten");
    await isFirst(g, "instead of a stale room");

    h.section(`${g.title}: a failed join`);
    h.backend.setRpc(r.join, () => { throw { status: 400, code: "P0001", message: "No game found with that code" }; });
    await choose("Join multiplayer game");
    await h.type(".games-code-input", "ZZZZZZ");
    await h.click(".game-start-button");
    await h.sleep(500);
    h.assert((await h.exists(".games-code-input")) && (await h.exists(".games-panel-card .games-error")), `error shown on the code entry: ${await h.text(".games-error").catch(() => "none")}`);
    await sound(`join-error-${g.title.split(" ")[0].toLowerCase()}`);
  }

  h.section("Release flags: hidden from a member, even with a room still stored");
  // Every game gets a row: one with none is treated as Live, and the fixtures do not carry the newest.
  const KEYS = ["bible_trivia", "saving_peter", "fill_blank", "memorization", "chronology", "daily_name", "twenty_questions"].map((k) => `game_${k}`);
  const stage = (live) => h.backend.setTable("feature_release", [
    ...h.backend.tables.feature_release.filter((x) => !KEYS.includes(x.feature)),
    ...KEYS.map((feature) => ({ feature, live, updated_at: null, updated_by: null })),
  ]);
  stage(false);
  await h.evaluate(() => sessionStorage.setItem("bible-atlas-active-saving-peter-room", "saving_peter_rooms-1"));
  await h.reload(); await h.sleep(1500);
  await openCenter();
  await h.sleep(500);
  h.assert((await h.count(".game-center-card")) === 0 && !(await h.exists(".game-entry-card")), "member: no game card and no way into a first screen");

  h.section("Release flags: the owner leaving Test view while on a game's screens is sent back");
  await h.asPersona("owner");
  const steps = [
    ...GAMES.map((g) => [g.title, null]),
    ["Bible Trivia", "Play solo"], ["Bible Trivia", "Join multiplayer game"],
    ["Saving Peter", "Play solo"], ["Saving Peter", "Create multiplayer game"], ["Saving Peter", "Join multiplayer game"],
  ];
  for (const [title, step] of steps) {
    await h.evaluate(() => localStorage.setItem("feature-test-view-v1", "1"));
    await open(title);
    if (step) await choose(step);
    await h.click(".release-test-strip-exit");
    await h.sleep(400);
    h.assert((await header()) === "Game Center" && (await h.count(".game-center-card")) === 0, `${title}${step ? ` / ${step}` : ""}: back to an empty Game Center`);
  }
  stage(true);

  const real = h.consoleErrors.filter((e) => !/openfreemap|bible-api|Failed to fetch|WebSocket|status of 400/i.test(e));
  h.assert(real.length === 0, `no page errors ${real.slice(0, 3).join(" | ")}`);
}
