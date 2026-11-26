/**
 * Bible Trivia's topic and difficulty choices, from the real built app: every combination the screen
 * offers creates a room whose question ids all match it (read from the create_game_room request, not
 * from the page), thin and empty combinations are withheld or shortened, and short rounds finish.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/trivia-topic-difficulty.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/trivia-topic-difficulty.mjs
 *
 * The room RPCs are small fakes and there is no Realtime, so this proves the screens and what the
 * client sends, not the server's own round or scoring rules.
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
  const dev = phone ? "phone" : "desktop";
  const shot = (name) => h.screenshot(`${name}-${dev}.png`);
  const q = await loadData("gameQuestions");
  const topics = q.TOPIC_PRESETS.map((p) => p.key);
  const difficulties = q.DIFFICULTY_CHOICES.map((d) => d.key);

  const created = [];
  const room = () => h.backend.tables.game_rooms?.[0];
  h.backend.setRpc("create_game_room", (a) => {
    const me = h.backend.persona;
    created.push(a.p_question_ids);
    const r = { id: `room-${created.length}`, code: "ABC123", host_id: me.id, status: "lobby", question_ids: a.p_question_ids, current_question_index: -1, current_question_started_at: null, target_score: a.p_target_score, winner_id: null, created_at: new Date().toISOString() };
    h.backend.setTable("game_rooms", [r]);
    h.backend.setTable("game_players", [{ room_id: r.id, user_id: me.id, display_name: me.name, score: 0, joined_at: r.created_at }]);
    h.backend.setTable("game_buzzes", []);
    return r;
  });
  h.backend.setRpc("start_game_room", () => Object.assign(room(), { status: "active", current_question_index: 0, current_question_started_at: new Date().toISOString() }));
  h.backend.setRpc("leave_game_room", () => { h.backend.setTable("game_rooms", []); return null; });

  const openTrivia = async () => {
    await h.reload(); await h.sleep(900);
    await h.evaluate(() => sessionStorage.removeItem("bible-atlas-active-game-room"));
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else {
      await h.click(MENU_BUTTON);
      await h.click({ css: ".panel-menu-link", text: "Games" });
    }
    await h.waitFor(".game-center-card");
    await h.click({ css: ".game-center-card", text: "Bible Trivia" });
    await h.waitFor(".games-difficulty");
  };
  const pickTopic = async (value) => {
    await h.evaluate((v) => {
      const s = document.querySelector(".games-topic-select");
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, v);
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
    await h.sleep(80);
  };
  const pickDifficulty = async (value) => {
    await h.click(`.games-difficulty-option input[value="${value}"]`);
    await h.sleep(60);
  };
  const ui = () =>
    h.evaluate(() => ({
      checked: document.querySelector(".games-difficulty input:checked")?.value,
      disabled: [...document.querySelectorAll(".games-difficulty input:disabled")].map((i) => i.value),
      summary: document.querySelector(".games-topic-count").textContent.trim(),
      solo: !document.querySelector(".games-panel-actions .games-primary-button").disabled,
      multi: !document.querySelector(".games-panel-actions .games-secondary-button").disabled,
    }));
  /** Nothing sticks out sideways, tiles do not clip their text, and each tile can really be clicked. */
  const sound = async (name) => {
    const r = await h.evaluate(() => {
      const root = document.querySelector(".game-mode");
      const body = root.querySelector(".game-body");
      const wide = [...root.querySelectorAll("button, input, select, p, label, legend, h2, h3")].filter((el) => {
        const b = el.getBoundingClientRect();
        return b.width && (b.left < -0.5 || b.right > innerWidth + 0.5);
      }).map((el) => `${el.tagName}.${el.className}`);
      const clipped = [...root.querySelectorAll(".games-difficulty-option")].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent);
      const covered = [];
      const top = body.scrollTop;
      for (const el of root.querySelectorAll(".games-difficulty input:not(:disabled), button:not(:disabled), select")) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        const b = el.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!hit || !(el === hit || el.contains(hit))) covered.push(`${el.tagName}.${el.className}`);
      }
      body.scrollTop = top;
      return { sideways: Math.max(body.scrollWidth - body.clientWidth, document.documentElement.scrollWidth - innerWidth), wide, clipped, covered };
    });
    const ok = r.sideways <= 0 && !r.wide.length && !r.clipped.length && !r.covered.length;
    h.assert(ok, `${name}: layout sound ${ok ? "" : JSON.stringify(r)}`);
    await shot(name);
  };
  const matches = (id, topic, difficulty) => {
    const x = q.getQuestionById(id);
    if (!x || (difficulty !== "mixed" && x.difficulty !== difficulty)) return false;
    if (topic === "all") return true;
    if (topic === "old-testament") return x.testament === "old";
    if (topic === "new-testament") return x.testament === "new";
    return x.category === topic && !(topic === "people" && x.extraBiblical);
  };

  h.section(`Entry screen (${dev})`);
  await openTrivia();
  const options = await h.evaluate(() => [...document.querySelectorAll(".games-topic-select option")].map((o) => o.textContent));
  h.assert(options[0] === "All topics" && options.at(-1) === "Custom…" && options.length === topics.length + 1, `topics: ${options.join(" / ")}`);
  let s = await ui();
  h.assert(s.checked === "mixed" && !s.disabled.length && s.solo && s.multi, `defaults to All topics, Mixed, both start buttons on — "${s.summary}"`);
  await sound("trivia-entry-default");

  h.section("Every preset × difficulty the screen offers");
  for (const topic of topics) {
    for (const difficulty of difficulties) {
      await openTrivia();
      await pickTopic(topic);
      const available = q.countAvailableQuestions({ preset: topic, difficulty });
      s = await ui();
      if (available < q.MIN_ROUND_QUESTIONS) {
        h.assert(s.disabled.includes(difficulty), `${topic} / ${difficulty}: ${available} questions, so the choice is disabled`);
        continue;
      }
      await pickDifficulty(difficulty);
      const before = created.length;
      const solo = difficulties.indexOf(difficulty) % 2 === 0;
      await h.click({ css: solo ? ".games-primary-button" : ".games-secondary-button", text: solo ? "Play Solo" : "Create Multiplayer Game" });
      await h.waitFor(solo ? ".game-choice-button" : ".game-lobby-code");
      const ids = created[before] ?? [];
      const want = Math.min(q.ROUND_QUESTION_COUNT, available);
      const ok = ids.length === want && new Set(ids).size === ids.length && ids.every((id) => matches(id, topic, difficulty));
      if (!solo) {
        await h.click({ css: ".games-primary-button", text: "Start Solo Game" });
        // No Realtime in the harness: a reload is how the started room is picked up.
        await h.reload(); await h.sleep(900);
        if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
        else { await h.click(MENU_BUTTON); await h.click({ css: ".panel-menu-link", text: "Games" }); }
        await h.click({ css: ".game-center-card", text: "Bible Trivia" });
        await h.waitFor(".game-choice-button");
      }
      const index = await h.text(".game-question-index");
      const badge = await h.evaluate(() => document.querySelector(".game-difficulty-badge").className);
      const badgeOk = difficulty === "mixed" || badge.includes(`game-difficulty-${difficulty}`);
      h.assert(ok && badgeOk && index === `Question 1 of ${want}`, `${topic} / ${difficulty} (${solo ? "solo" : "host"}): ${ids.length}/${want} ids all match, "${index}"`);
    }
  }

  h.section("Switching topic never leaves an empty difficulty selected");
  await openTrivia();
  await pickDifficulty("impossible");
  await pickTopic("places");
  s = await ui();
  h.assert(s.checked === "mixed" && s.disabled.join() === "impossible" && s.solo, `back to Mixed, Nearly Impossible disabled`);
  const note = await h.evaluate(() => [...document.querySelectorAll(".games-topic-card [role=status]")].map((e) => e.textContent).join(" | "));
  h.assert(/difficulty is back to Mixed/.test(note), `says so: ${note}`);
  await sound("trivia-places-note");
  await pickTopic("theology");
  await pickDifficulty("impossible");
  s = await ui();
  h.assert(/Short game: only 8 questions/.test(s.summary), `short round is announced: "${s.summary}"`);
  await sound("trivia-short");
  await pickTopic("history");
  await pickDifficulty("easy");
  s = await ui();
  h.assert(/highest score after the last question wins/.test(s.summary), `easy explains how it ends: "${s.summary}"`);
  await sound("trivia-easy");

  h.section("Custom topic");
  await pickDifficulty("mixed");
  await pickTopic("custom");
  s = await ui();
  h.assert(!s.solo && !s.multi && /Type a topic/.test(s.summary), `empty: cannot start — "${s.summary}"`);
  await h.type(".games-topic-custom-input", "zzzz");
  s = await ui();
  h.assert(!s.solo && !s.multi && s.disabled.length === 5 && /No .*questions match/.test(s.summary), `no match: cannot start — "${s.summary}"`);
  await sound("trivia-custom-none");
  await h.type(".games-topic-custom-input", "Melchizedek");
  s = await ui();
  h.assert(!s.solo && !s.multi && /Only 4/.test(s.summary), `too few: cannot start — "${s.summary}"`);
  await h.type(".games-topic-custom-input", "Paul");
  await pickDifficulty("difficult");
  s = await ui();
  h.assert(s.solo && s.checked === "difficult", `Paul / difficult can start — "${s.summary}"`);
  await sound("trivia-custom-match");
  await h.type(".games-topic-custom-input", "baptism");
  s = await ui();
  h.assert(!s.solo && !s.multi && s.checked === "difficult" && /Only 1 Difficult question matches/.test(s.summary), `choice kept, start withheld — "${s.summary}"`);
  await h.type(".games-topic-custom-input", "Paul");
  let before = created.length;
  await h.click({ css: ".games-primary-button", text: "Play Solo" });
  await h.waitFor(".game-choice-button");
  const paul = created[before].map(q.getQuestionById);
  h.assert(paul.every((x) => x.difficulty === "difficult" && /(?<![a-z0-9])paul/.test(`${x.keywords} ${x.prompt.toLowerCase()}`)), `${paul.length} ids: all difficult, all mention Paul`);

  h.section("A short round plays to the end");
  h.backend.setRpc("submit_answer", (a) => {
    const p = h.backend.tables.game_players[0];
    p.score += a.p_correct ? a.p_points : -a.p_points;
    h.backend.tables.game_buzzes.push({ id: `b${a.p_question_index}`, room_id: room().id, question_index: a.p_question_index, user_id: p.user_id, answer_index: a.p_answer_index, correct: a.p_correct });
    return p;
  });
  await openTrivia();
  await pickTopic("theology");
  await pickDifficulty("impossible");
  await h.click({ css: ".games-primary-button", text: "Play Solo" });
  await h.waitFor(".game-choice-button");
  await sound("trivia-question");
  await h.click(".game-choice-button");
  h.assert(await h.exists(".game-question-reveal"), "answering locks the answer in");
  Object.assign(room(), { status: "finished", current_question_index: 8, winner_id: h.backend.persona.id });
  await openTriviaResume();
  h.assert(/wins!/.test(await h.text(".game-results-banner h2")), "solo result names the player");
  await sound("trivia-results");
  await h.click({ css: ".games-primary-button", text: "Play Again" });
  await h.waitFor(".games-difficulty");
  h.assert(true, "Play Again returns to the topic and difficulty screen");

  h.section("A tied finish is not given to either player");
  const me = h.backend.persona;
  h.backend.setTable("game_rooms", [{ id: "room-tie", code: "TIE123", host_id: me.id, status: "finished", question_ids: created.at(-1), current_question_index: 8, current_question_started_at: null, target_score: 50, winner_id: null, created_at: new Date().toISOString() }]);
  h.backend.setTable("game_players", [
    { room_id: "room-tie", user_id: me.id, display_name: me.name, score: 7, joined_at: "2026-10-01T00:00:00Z" },
    { room_id: "room-tie", user_id: "other", display_name: "Second Player", score: 7, joined_at: "2026-10-01T00:00:01Z" },
  ]);
  await h.evaluate(() => sessionStorage.setItem("bible-atlas-active-game-room", "room-tie"));
  await openTriviaResume();
  h.assert((await h.text(".game-results-banner h2")) === "It's a tie!", "tie banner");
  await shot("trivia-tie");

  h.section("Dark theme and large text");
  await h.evaluate(() => localStorage.setItem("app-theme", "dark"));
  await openTrivia();
  await pickTopic("places");
  await pickDifficulty("moderate");
  await sound("trivia-entry-dark");
  await h.evaluate(() => document.querySelector(".game-root").style.setProperty("zoom", "1.8"));
  await sound("trivia-entry-zoom");

  const real = h.consoleErrors.filter((e) => !/openfreemap|bible-api|Failed to fetch|WebSocket/i.test(e));
  h.assert(real.length === 0, `no page errors ${real.slice(0, 3).join(" | ")}`);

  async function openTriviaResume() {
    await h.reload(); await h.sleep(900);
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else { await h.click(MENU_BUTTON); await h.click({ css: ".panel-menu-link", text: "Games" }); }
    await h.click({ css: ".game-center-card", text: "Bible Trivia" });
    await h.waitFor(".game-results-banner");
  }
}
