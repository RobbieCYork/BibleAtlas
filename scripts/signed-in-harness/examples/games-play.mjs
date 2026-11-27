/**
 * Every game in Game Center is opened and played, from the real built app: the bottom bar on a phone,
 * the Menu on desktop. Answers come from the same data files the games read (bundled with rolldown).
 * Run at both widths:
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 375x667 --script scripts/signed-in-harness/examples/games-play.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/games-play.mjs
 *
 * The multiplayer room RPCs are re-implemented here as small fakes and there is no Realtime, so this
 * proves the screens, not the server: room rules, live updates, video chat and high scores are not tested.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { MENU_BUTTON } from "../lib/app.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "../../../src/data");
const TITLES = ["Bible Trivia", "Saving Peter", "Fill in the Blank", "Scripture Memorization Challenge", "Chronology", "Daily Name", "20 Questions"];

async function loadData(name) {
  const dir = mkdtempSync(join(tmpdir(), "games-data."));
  const bundle = await rolldown({ input: join(DATA, `${name}.ts`) });
  await bundle.write({ file: join(dir, "m.mjs"), format: "esm" });
  const mod = await import(pathToFileURL(join(dir, "m.mjs")).href);
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

/** A fake room backend for one game family, over the harness's in-memory tables. */
function fakeRooms(h, { rooms, players, answers, create, start, submit, advance, leave, ids, index, startedAt, roundKey }) {
  const room = () => h.backend.tables[rooms]?.[0];
  h.backend.setRpc(create, (a) => {
    const me = h.backend.persona;
    const r = { id: `${rooms}-1`, code: "ABC123", host_id: me.id, status: "lobby", [ids]: a[`p_${ids}`], [index]: 0, [startedAt]: null, target_score: a.p_target_score, winner_id: null, created_at: new Date().toISOString() };
    h.backend.setTable(rooms, [r]);
    h.backend.setTable(players, [{ id: "p1", room_id: r.id, user_id: me.id, display_name: me.name, score: 0, joined_at: r.created_at }]);
    h.backend.setTable(answers, []);
    return r;
  });
  h.backend.setRpc(start, () => Object.assign(room(), { status: "active", [startedAt]: new Date().toISOString() }));
  h.backend.setRpc(submit, (a) => {
    const p = h.backend.tables[players][0];
    p.score += a.p_correct ? a.p_points * 2 : -a.p_points;
    h.backend.tables[answers].push({ id: `a${a.p_question_index ?? a.p_round_index}`, room_id: room().id, [roundKey]: a.p_question_index ?? a.p_round_index, user_id: p.user_id, answer_index: a.p_answer_index, guess: a.p_guess, correct: a.p_correct });
    return p;
  });
  h.backend.setRpc(advance, () => room());
  h.backend.setRpc(leave, () => { h.backend.setTable(rooms, []); return null; });
  return room;
}

export default async function (h) {
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = phone ? "phone" : "desktop";
  const shot = (name) => h.screenshot(`${name}-${dev}.png`);
  const blank = await loadData("fillBlankVerses");
  const memo = await loadData("memorizationVerses");
  const peter = await loadData("savingPeterWords");
  const chrono = await loadData("chronologyRounds");

  const openCenter = async () => {
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else {
      await h.click(MENU_BUTTON);
      await h.click({ css: ".panel-menu-link", text: "Games" });
    }
    await h.waitFor(".game-center-card");
  };
  const openGame = async (title) => {
    await h.reload(); await h.sleep(900);
    await openCenter();
    await h.click({ css: ".game-center-card", text: title });
    await h.waitFor({ css: ".game-header h2", text: title });
  };
  const back = () => h.click(".game-header button");
  const header = () => h.text(".game-header h2");
  const choose = (title) => h.click({ css: ".game-entry-card", text: title });
  const start = () => h.click(".game-start-button");
  /** Play solo, pick a difficulty, press the start button. */
  const startLevel = async (title, key) => {
    await openGame(title);
    await choose("Play solo");
    await h.click(`.game-level-option input[value="${key}"]`);
    await start();
  };

  /** Nothing sticks out sideways, every image loaded, and every enabled control can really be clicked
   * (scrolled into view, it is the element under its own centre: not under the tab bar or an overlay). */
  const sound = async (name) => {
    const r = await h.evaluate(async () => {
      const root = document.querySelector(".game-mode");
      const body = root.querySelector(".game-body");
      await Promise.all([...root.querySelectorAll("img")].map((i) => i.decode().catch(() => {})));
      const wide = [], covered = [];
      for (const el of root.querySelectorAll("button, input, select, p, h2, h3, li, img.saving-peter-figure")) {
        const b = el.getBoundingClientRect();
        if (b.width && (b.left < -0.5 || b.right > innerWidth + 0.5)) wide.push(`${el.tagName}.${el.className}`.slice(0, 60));
      }
      const top = body.scrollTop;
      for (const el of root.querySelectorAll("button:not(:disabled), input:not(:disabled), select")) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        const b = el.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!hit || !(el === hit || el.contains(hit))) covered.push(`${el.tagName}.${el.className} "${el.textContent.trim().slice(0, 20)}"`);
      }
      body.scrollTop = top;
      return {
        sideways: Math.max(body.scrollWidth - body.clientWidth, document.documentElement.scrollWidth - innerWidth),
        wide: wide.slice(0, 4), covered: covered.slice(0, 4),
        broken: [...root.querySelectorAll("img")].filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")),
      };
    });
    h.assert(r.sideways <= 0 && !r.wide.length && !r.covered.length && !r.broken.length, `${name}: layout sound ${r.sideways <= 0 && !r.wide.length && !r.covered.length && !r.broken.length ? "" : JSON.stringify(r)}`);
    await shot(name);
  };

  h.section(`Game Center (${dev})`);
  await openCenter();
  const cards = await h.evaluate(() => [...document.querySelectorAll(".game-center-card-title")].map((e) => e.childNodes[0].textContent.trim()));
  h.assert(JSON.stringify(cards) === JSON.stringify(TITLES), `cards: ${cards.join(", ")}`);
  await sound("center");

  h.section("Fill in the Blank");
  for (const level of blank.DIFFICULTY_LEVELS) {
    await startLevel("Fill in the Blank", level.key);
    await h.waitFor(".fillblank-input");
    await sound(`fillblank-${level.key}`);
    const ref = await h.evaluate(() => document.querySelector(".fillblank-reference").childNodes[0].textContent.trim());
    const verse = blank.FILL_BLANK_VERSES.find((v) => v.reference === ref && v.difficulty === level.key);
    for (let i = 0; i < verse.blanks.length; i++) await h.type(`.fillblank-blank-wrap input[aria-label$=" ${i + 1}"]`, verse.blanks[i].answerWords.join(" "));
    await h.click({ css: ".fillblank-btn-primary", text: "Check Answer" });
    h.assert(await h.exists(".fillblank-result-correct"), `${level.label}: a right answer scores (${ref}, ${await h.text(".fillblank-score")})`);
    await h.click({ css: ".fillblank-btn-primary", text: "Next Verse" });
    for (let life = 0; life < 3; life++) {
      await h.click({ css: ".fillblank-btn-primary", text: "Check Answer" });
      if (life < 2) await h.click({ css: ".fillblank-btn-primary", text: "Next Verse" });
    }
    await h.waitFor(".fillblank-gameover");
    h.assert(true, `${level.label}: three misses reach Game Over`);
  }
  await sound("fillblank-gameover");

  h.section("Scripture Memorization Challenge");
  await openGame("Scripture Memorization Challenge");
  await choose("Play solo");
  await sound("memorization-picker");
  const first = [...memo.MEMORIZATION_VERSES].sort((a, b) => a.text.length - b.text.length)[0];
  await h.type(".memchallenge-search", first.reference);
  await h.click({ css: ".memchallenge-verse-row", text: first.reference });
  await h.click({ css: ".memchallenge-btn-primary", text: "Ready" });
  const words = first.text.split(/\s+/);
  let rounds = 0;
  while (rounds < 8 && (await h.exists(".memchallenge-input"))) {
    const label = await h.text(".memchallenge-stage-label");
    const hidden = await h.evaluate((all) => {
      // Which word each blank stands for: walk the verse's children in order.
      const kids = [...document.querySelector(".memchallenge-verse-text").children];
      return kids.map((k, i) => (k.querySelector("input") ? all[i] : null)).filter(Boolean);
    }, words);
    for (let i = 0; i < hidden.length; i++) await h.evaluate((i) => document.querySelectorAll(".memchallenge-input")[i].setAttribute("data-n", i), i);
    for (let i = 0; i < hidden.length; i++) await h.type(`.memchallenge-input[data-n="${i}"]`, hidden[i]);
    if (rounds === 0) await sound("memorization-round");
    await h.click({ css: ".memchallenge-btn-primary", text: "Check" });
    const ok = await h.exists(".memchallenge-result-correct");
    h.assert(ok, `${first.reference} ${label}: ${hidden.length} blanks accepted`);
    if (!ok) break;
    rounds++;
    await h.sleep(1600);
  }
  h.assert(await h.exists({ css: ".memchallenge-picker p", text: "1 of" }), `verse mastered after ${rounds} rounds`);

  h.section("Chronology");
  for (const level of chrono.CHRONOLOGY_LEVELS) {
    await startLevel("Chronology", level.key);
    await h.waitFor(".chronology-card");
    await sound(`chronology-${level.key}`);
    const titles = () => h.evaluate(() => [...document.querySelectorAll(".chronology-card-title")].map((e) => e.textContent));
    const before = await titles();
    await h.click('.chronology-card-controls button[aria-label$="later"]:not(:disabled)');
    const after = await titles();
    h.assert(after[0] === before[1] && after[1] === before[0], `${level.label}: ${before.length} cards, the arrows reorder them`);
    for (let guard = 0; guard < 40 && !(await h.exists(".chronology-gameover")); guard++) {
      await h.click({ css: ".chronology-btn-primary", text: "Check Order" });
      await h.click(".chronology-btn-primary");
    }
    h.assert(await h.exists(".chronology-gameover"), `${level.label}: reaches results`);
  }

  h.section("Saving Peter — solo");
  for (const level of peter.SAVING_PETER_LEVELS) {
    await startLevel("Saving Peter", level.key);
    await h.waitFor(".saving-peter-keyboard");
    await sound(`savingpeter-${level.key}`);
    const clue = await h.text(".saving-peter-clue");
    const entry = peter.SAVING_PETER_WORDS[level.key].find((w) => w.clue.trim() === clue);
    for (const letter of new Set(entry.word.replace(/[^A-Z]/g, ""))) await h.click({ css: ".saving-peter-key", text: letter });
    const status = await h.text(".saving-peter-status");
    h.assert(/got it/.test(status), `${level.label}: spelling ${entry.word} wins`);
    await h.click({ css: ".games-primary-button", text: "Play Again" });
    const clue2 = await h.text(".saving-peter-clue");
    const entry2 = peter.SAVING_PETER_WORDS[level.key].find((w) => w.clue.trim() === clue2);
    for (const letter of "ZQXJKVWFBGYPMUCDHLRSNIOTAE") {
      if (entry2.word.includes(letter) || !(await h.exists(".saving-peter-keyboard"))) continue;
      await h.click({ css: ".saving-peter-key", text: letter });
    }
    h.assert(/Bye bye, Peter/.test(await h.text(".saving-peter-status")), `${level.label}: wrong letters sink him`);
  }
  await sound("savingpeter-lost");

  h.section("Bible Trivia — solo");
  const trivia = fakeRooms(h, { rooms: "game_rooms", players: "game_players", answers: "game_buzzes", create: "create_game_room", start: "start_game_room", submit: "submit_answer", advance: "check_and_advance", leave: "leave_game_room", ids: "question_ids", index: "current_question_index", startedAt: "current_question_started_at", roundKey: "question_index" });
  await openGame("Bible Trivia");
  await sound("trivia-first");
  await choose("Play solo");
  await h.waitFor(".games-topic-select");
  await sound("trivia-setup");
  await start();
  await h.waitFor(".game-choice-button");
  await sound("trivia-question");
  h.assert((await h.count(".game-choice-button")) >= 2, `a question with ${await h.count(".game-choice-button")} choices: ${(await h.text(".game-question-prompt")).slice(0, 70)}`);
  await h.click(".game-choice-button");
  h.assert(await h.exists(".game-question-reveal"), "answering locks the answer in");
  trivia().current_question_index = 1;
  trivia().current_question_started_at = new Date().toISOString();
  await h.reload(); await h.sleep(900);
  await openCenter();
  await h.click({ css: ".game-center-card", text: "Bible Trivia" });
  await h.waitFor({ css: ".game-question-index", text: "Question 2" });
  h.assert(true, "the room resumes on question 2 after a reload");
  await back();
  await h.waitFor(".game-entry-card");
  h.assert(true, "Back leaves a rejoined room for the first screen");
  await back();
  h.assert((await header()) === "Game Center", "and Back again returns to Game Center");
  await h.click({ css: ".game-center-card", text: "Bible Trivia" });
  await choose("Create multiplayer game");
  await start();
  await h.waitFor(".game-lobby-code");
  await sound("trivia-lobby");
  await h.click({ css: ".games-primary-button", text: "Start Solo Game" });
  h.assert(trivia().status === "active", "lobby Start calls start_game_room");
  await back();

  h.section("Saving Peter — multiplayer");
  const spm = fakeRooms(h, { rooms: "saving_peter_rooms", players: "saving_peter_players", answers: "saving_peter_guesses", create: "create_saving_peter_room", start: "start_saving_peter_room", submit: "submit_saving_peter_guess", advance: "check_and_advance_saving_peter", leave: "leave_saving_peter_room", ids: "round_ids", index: "current_round_index", startedAt: "current_round_started_at", roundKey: "round_index" });
  await openGame("Saving Peter");
  await sound("peter-first");
  await choose("Create multiplayer game");
  await sound("peter-multi-create");
  await start();
  await h.waitFor(".game-lobby-code");
  await sound("peter-multi-lobby");
  await h.click({ css: ".games-primary-button", text: "Start Solo Game" });
  await h.sleep(300);
  await h.reload(); await h.sleep(900);
  await openCenter();
  await h.click({ css: ".game-center-card", text: "Saving Peter" });
  await h.waitFor(".saving-peter-guess-input");
  await sound("peter-multi-round");
  const round = peter.resolveSavingPeterRound(spm().round_ids[0]);
  await h.type(".saving-peter-guess-input", round.word);
  await h.click({ css: ".games-primary-button", text: "Guess" });
  await h.sleep(300);
  h.assert(h.backend.tables.saving_peter_guesses[0]?.correct === true, `the right guess (${round.word}) is sent as correct`);
  await back();

  const real = h.consoleErrors.filter((e) => !/openfreemap|bible-api|Failed to fetch|WebSocket/i.test(e));
  h.assert(real.length === 0, `no page errors ${real.slice(0, 3).join(" | ")}`);
}
