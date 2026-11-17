import { load, check, done } from "./bundle.mjs";
const notesMod = await load("src/lib/offlineNotes.ts");
globalThis.__native = false;

// ---- engine with a fake server -------------------------------------------------------------
function world() {
  const server = new Map(); // id -> note
  const calls = [];
  let down = false;
  const netErr = { message: "TypeError: Failed to fetch" };
  const db = {
    async insertNote(row) {
      calls.push("insert:" + row.note_text);
      if (down) return { error: netErr };
      if (server.has(row.id)) return { error: { code: "23505", message: "duplicate key" } };
      server.set(row.id, { ...row, created_at: "t", updated_at: "2026-01-01T00:00:00Z", is_public: false });
      return { error: null };
    },
    async updateIfUnchanged(id, userId, base, f) {
      calls.push("update:" + id);
      if (down) return { rows: [], error: netErr };
      const n = server.get(id);
      if (n && n.updated_at === base) { Object.assign(n, f); return { rows: [n], error: null }; }
      return { rows: [], error: null };
    },
    async fetchNote(id) { return down ? { note: null, error: netErr } : { note: server.get(id) ?? null, error: null }; },
  };
  let saved = [];
  const store = { load: async () => JSON.parse(JSON.stringify(saved)), save: async (o) => void (saved = JSON.parse(JSON.stringify(o))) };
  let n = 0;
  const eng = notesMod.createOfflineNotes({ db, store, now: () => "2026-02-01T00:00:0" + (n++ % 10) + "Z", uuid: () => "id-" + ++n });
  return { server, calls, eng, store, setDown: (v) => (down = v), queue: () => saved };
}
const anchor = { book: "John", chapter: 3, start_verse: 16, end_verse: 16, translation: "web", quoted_text: null, quoted_start_offset: null, quoted_end_offset: null };

{ // create offline, then sync
  const w = world();
  const note = await w.eng.enqueueCreate("u1", anchor, "hello");
  check("create: shown immediately, queued", note.note_text === "hello" && w.queue().length === 1);
  const overlay = await w.eng.overlayPending("u1", [], (a) => a.chapter === 3);
  check("create: overlay includes it on its chapter only", overlay.length === 1 && (await w.eng.overlayPending("u1", [], (a) => a.chapter === 4)).length === 0);
  w.setDown(true);
  let r = await w.eng.sync("u1");
  check("offline sync: nothing lost, stays queued", w.queue().length === 1 && r.synced === 0);
  w.setDown(false);
  r = await w.eng.sync("u1");
  check("online sync: inserted with the client id, queue empty", r.synced === 1 && w.server.has(note.id) && w.queue().length === 0);
  await w.eng.enqueueCreate("u1", anchor, "again"); // replay safety
  const q = w.queue()[0]; w.server.set(q.noteId, { id: q.noteId, note_text: "again" });
  r = await w.eng.sync("u1");
  check("replay after lost reply (23505) counts as synced", r.synced === 1 && w.queue().length === 0);
}
{ // clean edit
  const w = world();
  const base = { id: "n1", ...anchor, note_text: "old", created_at: "t", updated_at: "2026-01-01T00:00:00Z", is_public: false };
  w.server.set("n1", { ...base });
  await w.eng.enqueueEdit("u1", base, "new");
  await w.eng.enqueueEdit("u1", { ...base, updated_at: "LOCAL-FAKE" }, "newer");
  check("two offline edits collapse to one op and keep the ORIGINAL base", w.queue().length === 1 && w.queue()[0].baseUpdatedAt === "2026-01-01T00:00:00Z" && w.queue()[0].text === "newer");
  const r = await w.eng.sync("u1");
  check("clean edit applies, no conflict", r.synced === 1 && r.conflicts === 0 && w.server.get("n1").note_text === "newer");
}
{ // conflict: someone changed it on the server
  const w = world();
  const base = { id: "n1", ...anchor, note_text: "old", created_at: "t", updated_at: "2026-01-01T00:00:00Z", is_public: false };
  w.server.set("n1", { ...base, note_text: "edited on the web", updated_at: "2026-01-05T00:00:00Z" });
  await w.eng.enqueueEdit("u1", base, "edited on phone");
  const r = await w.eng.sync("u1");
  const texts = [...w.server.values()].map((x) => x.note_text).sort();
  check("conflict: server version NOT overwritten", w.server.get("n1").note_text === "edited on the web");
  check("conflict: offline text kept as a separate note", r.conflicts === 1 && texts.some((t) => t === "[Edited offline] edited on phone") && w.queue().length === 0);
}
{ // note deleted on the server
  const w = world();
  const base = { id: "gone", ...anchor, note_text: "old", created_at: "t", updated_at: "2026-01-01T00:00:00Z", is_public: false };
  await w.eng.enqueueEdit("u1", base, "my words");
  const r = await w.eng.sync("u1");
  check("deleted elsewhere: offline text is recreated, not discarded", r.conflicts === 1 && [...w.server.values()].some((x) => x.note_text.endsWith("my words")));
}
{ // same words already there
  const w = world();
  const base = { id: "n1", ...anchor, note_text: "old", created_at: "t", updated_at: "2026-01-01T00:00:00Z", is_public: false };
  w.server.set("n1", { ...base, note_text: "same", updated_at: "2026-01-09T00:00:00Z" });
  await w.eng.enqueueEdit("u1", base, "same");
  const r = await w.eng.sync("u1");
  check("identical text already on server: no duplicate note", r.conflicts === 0 && w.server.size === 1);
}
{ // edit of a note that was itself created offline
  const w = world();
  const n = await w.eng.enqueueCreate("u1", anchor, "v1");
  await w.eng.enqueueEdit("u1", n, "v2");
  check("edit of a pending create just changes the pending text", w.queue().length === 1 && w.queue()[0].text === "v2");
}
{ // other users' ops are untouched
  const w = world();
  await w.eng.enqueueCreate("other", anchor, "theirs");
  const r = await w.eng.sync("u1");
  check("sync only sends the signed-in user's ops", r.synced === 0 && w.queue().length === 1);
}

// ---- passage cache -------------------------------------------------------------------------
const pm = await load("scripts/store-app-tests/entries/passage.ts");
pm.setCacheBackendForTest(pm.createMemoryBackend());
let offline = false;
Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
let hits = 0;
globalThis.fetch = async (url) => {
  hits++;
  if (offline) throw new TypeError("Failed to fetch");
  if (String(url).includes("Nowhere")) return { ok: false, json: async () => ({ error: "not found" }) };
  return { ok: true, json: async () => ({ reference: "John 3", translation_name: "WEB", verses: [{ book_name: "John", chapter: 3, verse: 16, text: "For God so loved" }] }) };
};
const first = await pm.fetchPassage("John 3", "web");
await new Promise((r) => setTimeout(r, 30));
check("online passage is not flagged offline", !first.offline && first.verses.length === 1);
offline = true;
const second = await pm.fetchPassage("John 3", "web");
check("offline: the chapter read earlier is served from the cache and flagged", second.offline === true && second.verses[0].verse === 16);
let threw = false;
try { await pm.fetchPassage("Exodus 1", "web"); } catch { threw = true; }
check("offline + never opened: still an error (no invented text)", threw);
check("offline: a different translation is not served the wrong text", await pm.fetchPassage("John 3", "kjv").then(() => false, () => true));
offline = false;
let notFound = false;
try { await pm.fetchPassage("Nowhere 9", "web"); } catch { notFound = true; }
check("server 'not found' is still an error online", notFound);
for (let i = 1; i <= 45; i++) await pm.rememberPassage("web", "Psalm " + i, { n: i });
check("cache is capped (oldest evicted)", (await pm.recallPassage("web", "Psalm 1")) === undefined && (await pm.recallPassage("web", "Psalm 45")) !== undefined && pm.PASSAGE_CACHE_LIMIT === 40);
done();
