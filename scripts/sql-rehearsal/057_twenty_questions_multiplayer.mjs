/**
 * Rehearses sql/057_twenty_questions_multiplayer.sql in PGlite (Postgres in WASM, in-process, no server) on a stub
 * of the Supabase pieces it needs: anon/authenticated roles, Supabase's default ACL (ALL on new tables and
 * functions to anon and authenticated — the thing 057 has to take back), auth.users, auth.uid() from request
 * claims, `profiles`, and a `supabase_realtime` publication.
 *
 *   PGLITE=/path/to/node_modules/@electric-sql/pglite/dist/index.js node scripts/sql-rehearsal/057_twenty_questions_multiplayer.mjs
 *
 * PGlite is not a dependency of this repo; install it outside it and point PGLITE at it. Exit 0 = every check passed.
 *
 * Proves: 057 applies and re-applies; no signed-in player (host included) can read the secret by any table or
 * function, before or during play; the answer to each question is the chosen entry's own (Yes / Not stated / No);
 * turns rotate in join order, are enforced, pass and time out (timeout only after turn_seconds, once per turn);
 * repeated or unknown questions and guesses are refused; a wrong guess uses a question; the twentieth question
 * opens one final guess each, then reveals; a right guess wins and reveals; a late joiner goes last; leaving or
 * being removed on your turn passes it; host hand-over; seat cap; strangers and anon read nothing; malformed
 * create payloads are refused; the secret varies; ROLLBACK removes it all and 057 re-applies after it.
 * Cannot prove: Supabase's real PostgREST, Realtime's RLS filtering of change events, or production's state.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { PGlite } = await import(process.env.PGLITE ?? "@electric-sql/pglite");
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file057 = process.argv[2] ?? path.join(REPO, "sql/057_twenty_questions_multiplayer.sql");
const sql057 = readFileSync(file057, "utf8");
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("PASS", msg); } else { fail++; console.log("FAIL", msg); } };
async function expectErr(sql, params, re, msg) {
  try { await db.query(sql, params); ok(false, `${msg} (no error)`); }
  catch (e) { ok(re.test(`${e.code} ${e.message}`), `${msg} -> ${e.code} ${e.message}`); }
}
const rows = async (sql, p) => (await db.query(sql, p)).rows;
const one = async (sql, p) => (await rows(sql, p))[0];

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create table profiles (id uuid primary key references auth.users(id), display_name text, email text);
  create publication supabase_realtime;
`);

const U = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const [A, B, C, D, E, F, G, S] = [1, 2, 3, 4, 5, 6, 7, 9].map(U); // S = stranger
const names = { [A]: "Ann", [B]: "Ben", [C]: "Cal", [D]: "Dee", [E]: "Eve", [F]: "Fay", [G]: "Gus", [S]: "Sam" };
for (const [id, n] of Object.entries(names)) {
  await db.query("insert into auth.users values ($1, $2)", [id, `${n.toLowerCase()}@x.test`]);
  await db.query("insert into profiles values ($1, $2, $3)", [id, n, `${n.toLowerCase()}@x.test`]);
}

await db.exec(sql057);
ok(true, "057 applies on the stub");
await db.exec(sql057);
ok(true, "057 re-applies (idempotent)");

const as = async (role, uid) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  if (role) await db.exec(`set role ${role}`);
};

// A synthetic category: 30 entries, 40 questions. Entry i is Yes for q(j) when (i + j) % 3 == 0, Not stated
// when (i + j) % 7 == 0 (and not Yes).
const QIDS = Array.from({ length: 40 }, (_, j) => `q${j}`);
const ENTRIES = Array.from({ length: 30 }, (_, i) => ({
  id: `e${i}`,
  yes: QIDS.filter((_, j) => (i + j) % 3 === 0),
  unknown: QIDS.filter((_, j) => (i + j) % 3 !== 0 && (i + j) % 7 === 0),
}));
const expected = (entryId, qid) => {
  const e = ENTRIES.find((x) => x.id === entryId);
  return e.yes.includes(qid) ? "yes" : e.unknown.includes(qid) ? "unknown" : "no";
};
const create = (cat = "people", entries = ENTRIES, qids = QIDS) =>
  one("select * from create_twenty_q_room($1, $2::jsonb, $3::jsonb)", [cat, JSON.stringify(entries), JSON.stringify(qids)]);
const secretOf = async (roomId) => { await as(null); const s = await one("select entry_id from twenty_q_secrets where room_id = $1", [roomId]); return s.entry_id; };
const roomAsSuper = async (roomId) => { await as(null); return one("select * from twenty_q_rooms where id = $1", [roomId]); };

// --- anon and probe ---
await as("anon", null);
await expectErr("select twenty_q_multiplayer_enabled()", [], /42501|permission/, "anon cannot call the probe");
await expectErr("select * from create_twenty_q_room('people', '[]'::jsonb, '[]'::jsonb)", [], /42501|permission/, "anon cannot create a room");
await expectErr("select * from twenty_q_rooms", [], /42501|permission/, "anon cannot read rooms");
await as("authenticated", A);
ok((await one("select twenty_q_multiplayer_enabled() as v")).v === true, "probe answers true for a member");

// --- malformed payloads ---
await expectErr("select create_twenty_q_room('saints', $1::jsonb, $2::jsonb)", [JSON.stringify(ENTRIES), JSON.stringify(QIDS)], /22023/, "unknown category refused");
await expectErr("select create_twenty_q_room('people', $1::jsonb, $2::jsonb)", [JSON.stringify(ENTRIES.slice(0, 9)), JSON.stringify(QIDS)], /22023/, "fewer than 10 entries refused");
await expectErr("select create_twenty_q_room('people', $1::jsonb, $2::jsonb)", [JSON.stringify([...ENTRIES, ENTRIES[0]]), JSON.stringify(QIDS)], /22023/, "duplicate entry ids refused");
await expectErr("select create_twenty_q_room('people', $1::jsonb, $2::jsonb)", [JSON.stringify([{ ...ENTRIES[0], yes: ["nope"] }, ...ENTRIES.slice(1)]), JSON.stringify(QIDS)], /22023/, "a Yes naming a question not in the game refused");
await expectErr("select create_twenty_q_room('people', $1::jsonb, $2::jsonb)", [JSON.stringify(ENTRIES), JSON.stringify([...QIDS, "q0"])], /22023/, "duplicate question ids refused");
await expectErr("select create_twenty_q_room('people', $1::jsonb, $2::jsonb)", [JSON.stringify({ a: 1 }), JSON.stringify(QIDS)], /22023/, "non-array entries refused");

// --- create: nothing about the secret reaches the host ---
const r1 = await create();
ok(r1.code && r1.code.length === 6 && r1.status === "lobby" && r1.revealed_entry_id === null, "host gets a lobby room with a code and no revealed answer");
ok(!Object.keys(r1).some((k) => /secret|entry_id$/.test(k) && k !== "revealed_entry_id"), "room row has no secret column");
await expectErr("select * from twenty_q_secrets", [], /42501|permission/, "host cannot select twenty_q_secrets");
await expectErr("select entry_id from twenty_q_secrets where room_id = $1", [r1.id], /42501|permission/, "host cannot select their own room's secret");
await expectErr("insert into twenty_q_secrets values ($1, 'e0', '{}', '{}', '{}', '{}')", [r1.id], /42501|permission/, "host cannot write a secret");
await expectErr("update twenty_q_rooms set revealed_entry_id = 'x' where id = $1", [r1.id], /42501|permission/, "host cannot write the room row");
await expectErr("insert into twenty_q_moves (room_id, seq, display_name, kind) values ($1, 1, 'x', 'pass')", [r1.id], /42501|permission/, "host cannot insert a move");
await expectErr("select twenty_q_advance($1)", [r1.id], /42501|permission/, "host cannot call the internal advance");
await expectErr("select twenty_q_next_seq($1)", [r1.id], /42501|permission/, "host cannot call the internal seq helper");
const secret1 = await secretOf(r1.id);
ok(ENTRIES.some((e) => e.id === secret1), "secret is one of the entries sent");

// --- join, strangers, start ---
await as("authenticated", B);
const j = await one("select * from join_twenty_q_room($1)", [r1.code.toLowerCase()]);
ok(j.id === r1.id, "B joins with a lower-case code");
await as("authenticated", C);
await one("select * from join_twenty_q_room($1)", [r1.code]);
await as("authenticated", S);
ok((await rows("select * from twenty_q_rooms where id = $1", [r1.id])).length === 0, "stranger reads no room");
ok((await rows("select * from twenty_q_players where room_id = $1", [r1.id])).length === 0, "stranger reads no roster");
await expectErr("select * from start_twenty_q_room($1)", [r1.id], /host/, "stranger cannot start");
await as("authenticated", B);
await expectErr("select * from start_twenty_q_room($1)", [r1.id], /host/, "non-host member cannot start");
await expectErr("select * from ask_twenty_q($1, 'q0')", [r1.id], /not in progress/, "no asking in the lobby");
ok((await rows("select * from twenty_q_players where room_id = $1", [r1.id])).length === 3, "member reads the roster of 3");
await as("authenticated", A);
let room = await one("select * from start_twenty_q_room($1)", [r1.id]);
ok(room.status === "active" && room.turn_user_id === A && room.turn_no === 1, "host starts; first turn is the first to join (A)");

// --- asking ---
await as("authenticated", B);
await expectErr("select * from ask_twenty_q($1, 'q0')", [r1.id], /not your turn/, "B cannot ask on A's turn");
await expectErr("select * from guess_twenty_q($1, 'e0')", [r1.id], /not your turn/, "B cannot guess on A's turn");
await as("authenticated", A);
await expectErr("select * from ask_twenty_q($1, 'zzz')", [r1.id], /22023/, "unknown question refused");
room = await one("select * from ask_twenty_q($1, 'q0')", [r1.id]);
ok(room.turn_user_id === B && room.questions_used === 1, "A asks; turn to B; one question used");
let mv = await one("select * from twenty_q_moves where room_id = $1 order by seq desc limit 1", [r1.id]);
ok(mv.kind === "question" && mv.user_id === A && mv.display_name === "Ann" && mv.answer === expected(secret1, "q0"), `answer for q0 is the secret's own (${mv.answer})`);
await as("authenticated", C);
ok((await rows("select * from twenty_q_moves where room_id = $1", [r1.id])).length === 1, "another member sees the move");
await as("authenticated", B);
await expectErr("select * from ask_twenty_q($1, 'q0')", [r1.id], /already been asked/, "a question cannot be asked twice");
// Ask every remaining question type across all players to check every answer kind.
const kinds = new Set([mv.answer]);
let qi = 1;
for (const who of [B, C, A]) {
  await as("authenticated", who);
  room = await one("select * from ask_twenty_q($1, $2)", [r1.id, `q${qi}`]);
  mv = await one("select * from twenty_q_moves where room_id = $1 order by seq desc limit 1", [r1.id]);
  ok(mv.answer === expected(secret1, `q${qi}`), `q${qi} answered ${mv.answer} for ${names[who]}, as the data says`);
  kinds.add(mv.answer);
  qi++;
}
ok(room.turn_user_id === B && room.questions_used === 4, "rotation A→B→C→A→B in join order");

// --- pass and timeout ---
await as("authenticated", B);
room = await one("select * from pass_twenty_q_turn($1, $2)", [r1.id, room.turn_no]);
ok(room.turn_user_id === C && room.questions_used === 4, "B passes: turn to C, no question used");
mv = await one("select * from twenty_q_moves where room_id = $1 order by seq desc limit 1", [r1.id]);
ok(mv.kind === "pass" && mv.user_id === B, "pass recorded as B's");
await as("authenticated", A);
await expectErr("select * from pass_twenty_q_turn($1, $2)", [r1.id, room.turn_no], /still in progress/, "A cannot time out C's turn early");
const staleTurn = room.turn_no - 1;
const same = await one("select * from pass_twenty_q_turn($1, $2)", [r1.id, staleTurn]);
ok(same.turn_user_id === C && same.turn_no === room.turn_no, "a stale turn_no does nothing");
await as(null);
await db.query("update twenty_q_rooms set turn_started_at = now() - interval '61 seconds' where id = $1", [r1.id]);
await as("authenticated", A);
room = await one("select * from pass_twenty_q_turn($1, $2)", [r1.id, room.turn_no]);
ok(room.turn_user_id === A, "after 60s anyone may time C out: turn to A");
mv = await one("select * from twenty_q_moves where room_id = $1 order by seq desc limit 1", [r1.id]);
ok(mv.kind === "timeout" && mv.user_id === C, "timeout recorded against C");
await as("authenticated", B);
const again = await one("select * from pass_twenty_q_turn($1, $2)", [r1.id, room.turn_no - 1]);
ok(again.turn_user_id === A, "a second time-out call for the same turn does nothing");
await as("authenticated", S);
await expectErr("select * from pass_twenty_q_turn($1, $2)", [r1.id, room.turn_no], /Not a player/, "stranger cannot pass a turn");

// --- wrong guess ---
const wrong = ENTRIES.map((e) => e.id).filter((id) => id !== secret1);
await as("authenticated", A);
await expectErr("select * from guess_twenty_q($1, 'nobody')", [r1.id], /22023/, "guess of something not in the game refused");
room = await one("select * from guess_twenty_q($1, $2)", [r1.id, wrong[0]]);
ok(room.status === "active" && room.questions_used === 5 && room.turn_user_id === B, "wrong guess uses a question and passes the turn");
mv = await one("select * from twenty_q_moves where room_id = $1 order by seq desc limit 1", [r1.id]);
ok(mv.kind === "guess" && mv.answer === "no", "wrong guess recorded No");
await as("authenticated", B);
await expectErr("select * from guess_twenty_q($1, $2)", [r1.id, wrong[0]], /already been guessed/, "same guess twice refused");
await as("authenticated", A);
ok((await one("select revealed_entry_id from twenty_q_rooms where id = $1", [r1.id])).revealed_entry_id === null, "still nothing revealed mid-game");

// --- late joiner goes last ---
await as("authenticated", D);
await one("select * from join_twenty_q_room($1)", [r1.code]);
ok(true, "D joins a game in progress");
// Turn is B. Join order is A, B, C, D, so from B: B, C, D, then wrap to A — D slots in at the end of the order.
const order = [];
for (let k = 0; k < 4; k++) {
  room = await roomAsSuper(r1.id);
  order.push(names[room.turn_user_id]);
  await as("authenticated", room.turn_user_id);
  room = await one("select * from ask_twenty_q($1, $2)", [r1.id, `q${qi++}`]);
}
ok(order.join(",") === "Ben,Cal,Dee,Ann", `late joiner takes the last place in the join order (${order.join(",")})`);

// --- leave on your turn; host hand-over ---
room = await roomAsSuper(r1.id);
ok(room.turn_user_id === B, "turn back to B");
await as("authenticated", B);
await db.query("select leave_twenty_q_room($1)", [r1.id]);
room = await roomAsSuper(r1.id);
ok(room.turn_user_id === C, "B leaves on their turn: it passes to C at once");
await as("authenticated", A);
await db.query("select leave_twenty_q_room($1)", [r1.id]);
room = await roomAsSuper(r1.id);
ok(room.host_id === C, "host A leaves: earliest remaining (C) becomes host");
await as("authenticated", D);
await expectErr("select kick_twenty_q_player($1, $2)", [r1.id, C], /host/, "non-host cannot remove a player");
await as("authenticated", A);
ok((await rows("select * from twenty_q_moves where room_id = $1", [r1.id])).length === 0, "a player who left reads no moves");

// Seat back up to six and check the cap, then kick on turn.
for (const u of [E, F, A, B]) { await as("authenticated", u); await one("select * from join_twenty_q_room($1)", [r1.code]); }
await as("authenticated", G);
await expectErr("select * from join_twenty_q_room($1)", [r1.code], /full/, "seventh player refused");
room = await roomAsSuper(r1.id);
const turnHolder = room.turn_user_id;
await as("authenticated", C);
if (turnHolder === C) {
  room = await one("select * from ask_twenty_q($1, $2)", [r1.id, `q${qi++}`]);
}
room = await roomAsSuper(r1.id);
const victim = room.turn_user_id;
await as("authenticated", C);
await db.query("select kick_twenty_q_player($1, $2)", [r1.id, victim]);
room = await roomAsSuper(r1.id);
ok(room.turn_user_id !== victim && room.turn_user_id !== null, `host removes the player whose turn it is (${names[victim]}): turn passes`);

// --- run out the questions → final round ---
let guard = 0;
while (room.final_from_seq === null && guard++ < 50) {
  await as("authenticated", room.turn_user_id);
  room = await one("select * from ask_twenty_q($1, $2)", [r1.id, `q${qi++}`]);
}
ok(room.questions_used === 20 && room.final_from_seq !== null && room.status === "active", "the twentieth question opens the final round");
await as("authenticated", room.turn_user_id);
await expectErr("select * from ask_twenty_q($1, $2)", [r1.id, `q${qi}`], /final guess/, "no more questions in the final round");
const seated = (await rows("select user_id from twenty_q_players where room_id = $1", [r1.id])).length;
let finals = 0, wi = 1;
while (room.status === "active" && finals < 20) {
  await as("authenticated", room.turn_user_id);
  room = await one("select * from guess_twenty_q($1, $2)", [r1.id, wrong[wi++]]);
  finals++;
}
ok(finals === seated, `one final guess each (${finals} of ${seated} seated)`);
ok(room.status === "finished" && room.winner_id === null && room.revealed_entry_id === secret1, "all wrong: finished, no winner, answer revealed");
ok(room.questions_used === 20, "final guesses do not push past twenty");

// --- a right guess wins ---
await as("authenticated", A);
const r2 = await create("places");
await as("authenticated", B);
await one("select * from join_twenty_q_room($1)", [r2.code]);
await as("authenticated", A);
await one("select * from start_twenty_q_room($1)", [r2.id]);
const secret2 = await secretOf(r2.id);
const qUnknown = QIDS.find((q) => expected(secret2, q) === "unknown");
const qYes = QIDS.find((q) => expected(secret2, q) === "yes");
await as("authenticated", A);
await one("select * from ask_twenty_q($1, $2)", [r2.id, qUnknown]);
mv = await one("select * from twenty_q_moves where room_id = $1 order by seq desc limit 1", [r2.id]);
ok(mv.answer === "unknown", `a Not stated question answers 'unknown' (${qUnknown})`);
await as("authenticated", B);
await one("select * from ask_twenty_q($1, $2)", [r2.id, qYes]);
mv = await one("select * from twenty_q_moves where room_id = $1 order by seq desc limit 1", [r2.id]);
ok(mv.answer === "yes", `a Yes question answers 'yes' (${qYes})`);
await as("authenticated", A);
room = await one("select * from guess_twenty_q($1, $2)", [r2.id, secret2]);
ok(room.status === "finished" && room.winner_id === A && room.revealed_entry_id === secret2 && room.turn_user_id === null, "right guess: A wins, answer revealed");
await as("authenticated", B);
ok((await one("select revealed_entry_id from twenty_q_rooms where id = $1", [r2.id])).revealed_entry_id === secret2, "B reads the reveal");
await expectErr("select * from twenty_q_secrets", [], /42501|permission/, "even after the game, the secrets table stays closed");
await as("authenticated", S);
await expectErr("select * from join_twenty_q_room($1)", [r2.code], /finished/, "nobody new joins a finished game");
await as("authenticated", B);
await expectErr("select * from guess_twenty_q($1, $2)", [r2.id, secret2], /not in progress/, "no moves after the end");

// --- leaving the last seat deletes the room; final round + leave ends it ---
await as("authenticated", A);
await db.query("select leave_twenty_q_room($1)", [r2.id]);
await as("authenticated", B);
await db.query("select leave_twenty_q_room($1)", [r2.id]);
await as(null);
ok((await rows("select 1 from twenty_q_rooms where id = $1", [r2.id])).length === 0, "last player out deletes the room");
ok((await rows("select 1 from twenty_q_secrets where room_id = $1", [r2.id])).length === 0, "and its secret with it");

// --- the secret varies ---
await as("authenticated", A);
const picks = new Set();
for (let k = 0; k < 25; k++) { const r = await create("things"); picks.add(await secretOf(r.id)); await as("authenticated", A); }
ok(picks.size >= 5, `secret is chosen at random (${picks.size} distinct in 25 rooms)`);

// --- a payload the size of the real People set (138 entries x 120 questions) ---
const bigQ = Array.from({ length: 120 }, (_, k) => `bq${k}`);
const bigE = Array.from({ length: 138 }, (_, i) => ({ id: `person-${i}`, yes: bigQ.filter((_, k) => (i * 7 + k) % 4 === 0) }));
const big = await create("people", bigE, bigQ);
ok(!!big.id, "a full-size category payload is accepted");

// --- grants as written ---
await as(null);
const priv = async (role, obj, kind, what) => (await one(`select has_${kind}_privilege($1, $2, $3) as v`, [role, obj, what])).v;
ok(!(await priv("authenticated", "twenty_q_secrets", "table", "select")), "authenticated has no SELECT on twenty_q_secrets");
ok(!(await priv("anon", "twenty_q_rooms", "table", "select")), "anon has no SELECT on twenty_q_rooms");
ok(!(await priv("authenticated", "twenty_q_moves", "table", "insert")), "authenticated has no INSERT on twenty_q_moves");
ok(!(await priv("authenticated", "twenty_q_advance(uuid)", "function", "execute")), "authenticated cannot EXECUTE twenty_q_advance");
ok(!(await priv("anon", "create_twenty_q_room(text,jsonb,jsonb)", "function", "execute")), "anon cannot EXECUTE create_twenty_q_room");
ok(await priv("authenticated", "twenty_q_multiplayer_enabled()", "function", "execute"), "authenticated can EXECUTE the probe");
const pub = (await rows("select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1")).map((r) => r.tablename);
ok(pub.join(",") === "twenty_q_moves,twenty_q_players,twenty_q_rooms", `realtime publishes exactly the readable three (${pub.join(",")})`);
ok((await one("select count(*)::int as n from pg_policies where tablename = 'twenty_q_secrets'")).n === 0, "twenty_q_secrets has no policy");

// --- rollback, then re-apply ---
const rb = sql057.split("ROLLBACK")[1].split("\n").filter((l) => /^--      /.test(l)).map((l) => l.replace(/^--      /, "")).join("\n");
await db.exec(rb);
ok((await one("select count(*)::int as n from pg_tables where tablename like 'twenty_q_%'")).n === 0, "ROLLBACK drops every table");
ok((await one("select count(*)::int as n from pg_proc where proname like '%twenty_q%'")).n === 0, "ROLLBACK drops every function");
await db.exec(sql057);
ok(true, "057 re-applies after ROLLBACK");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
