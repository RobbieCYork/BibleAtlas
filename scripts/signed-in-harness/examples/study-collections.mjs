/**
 * Study Collections (Capstone Plus, sql/046, src/lib/studyCollections.ts) — signed in, fake backend.
 *
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844  --script scripts/signed-in-harness/examples/study-collections.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/study-collections.mjs
 *
 * 1. Table missing (sql/046 unapplied, 404/42P01): no "Add to collection" on any article and no
 *    Collections tab in My Notes. Merging before the migration changes nothing anyone sees.
 * 2. Entitled (has_entitlement('plus') true, as while paid.everyone_has_plus is on): from an article's
 *    own screen, create a collection and add the article; add two more articles; the client never sends
 *    user_id (the column default and RLS own it); Collections tab lists it; the detail resolves names
 *    from the app's data; a typed reference is canonicalised ("john 3:16" -> "John 3:16"); reorder goes
 *    through reorder_study_collection_items with the full order; remove, rename; tapping a row opens the
 *    article; "Add to collection" still sits ABOVE "Mark this article as read" (which stays last).
 * 3. Not entitled: the sheet shows the Plus prompt, never a checkbox; the Collections tab shows the
 *    prompt and the existing collection read-only (no New, no reorder) but still lets you open it.
 * 4. Delete with confirmation removes the collection.
 * 5. From the Bible panel (stubbed bible-api.com, placeholder text) "Add to collection" adds the chapter
 *    as a verse ref; from My Notes a verse note adds {kind: note, ref_id: its id}, and the collection
 *    shows the note's reference and text (read from `notes` by id).
 * Screenshots at whatever --viewport the run uses. Nothing wider than the viewport.
 *
 * What this cannot prove: the real RLS, caps, cascade (sql/tests/046_study_collections_test.sql does).
 */
import { MENU_BUTTON } from "../lib/app.mjs";

const isPhone = (h) => h.evaluate(() => window.innerWidth <= 768);

async function openArticleByName(h, name) {
  // An open article covers the Articles list: back out of it first.
  for (let i = 0; i < 4 && (await h.exists(".article-head .back-btn")) && !(await h.exists(".articles-search input")); i++) {
    await h.click(".article-head .back-btn");
    await h.sleep(300);
  }
  if (!(await h.exists(".articles-search input"))) {
    if (await isPhone(h)) {
      await h.click({ css: ".mobile-tab", text: "Articles" });
    } else {
      await h.click(MENU_BUTTON);
      await h.click({ css: ".panel-menu-item", text: "Articles" });
      await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    }
  }
  await h.type(".articles-search input", name);
  await h.sleep(200);
  const index = await h.evaluate(
    (n) => [...document.querySelectorAll(".articles-result-row")].findIndex((r) => r.querySelector(".articles-result-name")?.textContent.trim() === n),
    name,
  );
  if (index < 0) throw new Error(`no Articles search row named exactly "${name}"`);
  await h.click(".articles-result-row", { index });
  await h.waitFor(".article-head");
  await h.sleep(300);
}

async function openNotesTab(h, tab) {
  const visible = await h.evaluate(() => {
    const p = document.querySelector(".my-notes-panel");
    return !!p && p.getClientRects().length > 0 && !p.classList.contains("bible-panel-hidden");
  });
  if (!visible) {
    if (await isPhone(h)) {
      await h.click({ css: ".mobile-tab", text: "Notes" });
    } else {
      await h.click(MENU_BUTTON);
      await h.click({ css: ".panel-menu-item", text: "My Notes" });
      await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    }
    await h.waitFor(".notes-tab-switcher");
  }
  if (tab) {
    await h.click({ css: ".notes-tab-switcher button", text: tab });
    await h.sleep(300);
  }
}

const notesTabs = (h) =>
  h.evaluate(() => [...document.querySelectorAll(".notes-tab-switcher button")].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()));

const overflow = (h) =>
  h.evaluate(() => {
    const w = window.innerWidth;
    return [...document.querySelectorAll(".study-add, .study-add-sheet, .study-screen, .study-screen *")]
      .filter((el) => el.getClientRects().length)
      .map((el) => ({ c: el.className, r: el.getBoundingClientRect().right }))
      .filter((x) => x.r > w + 1)
      .slice(0, 3);
  });

/** Stateful stand-in for sql/046's reorder rpc: renumbers the given ids 0..n-1 within the collection. */
function installReorder(h) {
  h.backend.setRpc("reorder_study_collection_items", ({ p_collection_id, p_item_ids }) => {
    const rows = h.backend.tables.study_collection_items ?? [];
    let n = 0;
    p_item_ids.forEach((id, i) => {
      const r = rows.find((x) => x.id === id && x.collection_id === p_collection_id);
      if (r) {
        r.position = i;
        n++;
      }
    });
    h.reorders = (h.reorders ?? []).concat([{ p_collection_id, p_item_ids }]);
    return n;
  });
}

/** The fake backend has no column defaults. sql/046 fills user_id from auth.uid(); do the same to the
 * rows the client inserted (it never sends user_id) before a reload reads them back by user_id. */
function applyColumnDefaults(h) {
  for (const t of ["study_collections", "study_collection_items"]) {
    for (const r of h.backend.tables[t] ?? []) if (r.user_id == null) r.user_id = h.backend.persona.id;
  }
}

const BIBLE_STUB = `(() => {
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.startsWith("https://bible-api.com/")) return real(input, init);
    const ref = decodeURIComponent(new URL(url).pathname.slice(1));
    const m = /^(.*?)\\s+(\\d+)/.exec(ref) || [ref, ref, "1"];
    const body = { reference: ref, translation_name: "World English Bible",
      verses: [{ book_name: m[1], chapter: Number(m[2]), verse: 1, text: "(harness placeholder verse)" }] };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
  };
})()`;

export default async function (h) {
  await h.addInitScript(BIBLE_STUB);
  const tag = String(h.viewport?.width ?? h.viewport).replace(/x.*/, "");
  installReorder(h);

  h.section("table missing (sql/046 unapplied): nothing drawn");
  h.backend.setTableError("study_collections", { status: 404, code: "42P01", message: 'relation "public.study_collections" does not exist' });
  h.backend.setRpc("has_entitlement", true);
  await h.reload();
  await h.sleep(1000);
  await openArticleByName(h, "Jerusalem");
  h.assert((await h.count(".study-add")) === 0, "no Add to collection on the article");
  await openNotesTab(h);
  h.assert(!(await notesTabs(h)).includes("Collections"), `no Collections tab (${(await notesTabs(h)).join(", ")})`);
  h.assert(h.requests.some((r) => r.how === "forced-error" && r.path.startsWith("/rest/v1/study_collections")), "the app asked and got the error");
  h.backend.setTableError("study_collections", null);
  h.backend.setTable("study_collections", []);
  h.backend.setTable("study_collection_items", []);

  h.section("entitled: create from an article and add three articles");
  await h.reload();
  await h.sleep(1000);
  await openArticleByName(h, "Jerusalem");
  h.assert((await h.text(".location-panel .study-add-button")).includes("Add to collection"), `button reads "${await h.text(".location-panel .study-add-button")}"`);
  const order = await h.evaluate(() => {
    const add = document.querySelector(".location-panel .study-add");
    const read = document.querySelector(".article-mark-read");
    if (!add || !read) return null;
    return { addBeforeRead: !!(add.compareDocumentPosition(read) & Node.DOCUMENT_POSITION_FOLLOWING), readIsLast: read.parentElement.lastElementChild === read };
  });
  h.assert(order?.addBeforeRead && order?.readIsLast, `Add to collection sits above "Mark this article as read", which stays last (${JSON.stringify(order)})`);
  await h.click(".location-panel .study-add-button");
  await h.waitFor(".location-panel .study-add-sheet");
  h.assert(await h.exists(".location-panel .study-add-sheet .study-empty"), "empty state in the sheet");
  let before = h.writes.length;
  await h.type(".location-panel .study-add-new input", "Paul's journeys");
  await h.click({ css: ".location-panel .study-add-new button", text: "Create" });
  await h.sleep(500);
  let w = h.writes.slice(before);
  h.assert(w.length === 2 && w[0].table === "study_collections" && w[0].op === "insert" && w[0].rows[0].title === "Paul's journeys",
    `create -> insert into study_collections (${w.map((x) => `${x.op} ${x.table}`).join(", ")})`);
  const item0 = w[1]?.rows?.[0] ?? {};
  h.assert(w[1]?.table === "study_collection_items" && item0.kind === "place" && item0.ref_id === "jerusalem" && item0.position === 0,
    `then insert item {kind: ${item0.kind}, ref_id: ${item0.ref_id}, position: ${item0.position}}`);
  h.assert(!("user_id" in (w[0]?.rows?.[0] ?? {})) && !("user_id" in item0), "the client never sends user_id");
  h.assert((await h.text(".location-panel .study-add-button")).includes("In 1 collection"), `button now "${await h.text(".location-panel .study-add-button")}"`);
  h.assert(await h.evaluate(() => document.querySelector(".location-panel .study-add-row input")?.checked === true), "its checkbox is ticked");
  h.assert((await overflow(h)).length === 0, `nothing wider than the viewport (${JSON.stringify(await overflow(h))})`);
  console.log("  screenshot:", await h.screenshot(`study-add-sheet-${tag}.png`));
  await h.click({ css: ".location-panel .study-add-done", text: "Done" });

  for (const name of ["Abraham", "Creation of the Heavens and Earth"]) {
    await openArticleByName(h, name);
    await h.click(".location-panel .study-add-button");
    await h.waitFor(".location-panel .study-add-row input");
    before = h.writes.length;
    await h.click(".location-panel .study-add-row input");
    await h.sleep(400);
    w = h.writes.slice(before);
    h.assert(w.length === 1 && w[0].table === "study_collection_items" && w[0].op === "insert", `${name}: ticking adds one item`);
    await h.click({ css: ".location-panel .study-add-done", text: "Done" });
  }

  h.section("Collections tab: list, detail, verse, reorder, remove, rename, open");
  await openNotesTab(h, "Collections");
  h.assert((await notesTabs(h)).includes("Collections"), "Collections tab present");
  h.assert((await h.text(".study-list-row")).includes("Paul's journeys") && (await h.text(".study-list-row")).includes("3 items"),
    `list row: "${(await h.text(".study-list-row")).replace(/\s+/g, " ")}"`);
  console.log("  screenshot:", await h.screenshot(`study-list-${tag}.png`));
  await h.click(".study-list-row");
  await h.waitFor(".study-items");
  const names = () => h.evaluate(() => [...document.querySelectorAll(".study-item .study-item-name")].map((e) => e.textContent.trim()));
  let n = await names();
  h.assert(JSON.stringify(n) === JSON.stringify(["Jerusalem", "Abraham", "Creation of the Heavens and Earth"]), `items in order, names from the data: ${JSON.stringify(n)}`);

  before = h.writes.length;
  await h.type(".study-add-verse input", "john 3:16");
  await h.click({ css: ".study-add-verse button", text: "Add" });
  await h.sleep(400);
  w = h.writes.slice(before);
  h.assert(w.length === 1 && w[0].rows[0].kind === "verse" && w[0].rows[0].ref_id === "John 3:16", `typed "john 3:16" -> verse "${w[0]?.rows?.[0]?.ref_id}"`);
  n = await names();
  h.assert(n.at(-1) === "John 3:16", `verse listed last (${n.at(-1)})`);

  await h.click('[aria-label="Move John 3:16 up"]');
  await h.sleep(400);
  const last = h.reorders?.at(-1);
  n = await names();
  h.assert(last && last.p_item_ids.length === 4 && n[2] === "John 3:16", `reorder rpc with all 4 ids; now ${JSON.stringify(n)}`);

  before = h.writes.length;
  await h.click('[aria-label="Remove Abraham"]');
  await h.sleep(400);
  w = h.writes.slice(before);
  h.assert(w.length === 1 && w[0].op === "delete" && w[0].table === "study_collection_items" && w[0].rows.length === 1, "remove -> one delete");
  h.assert(!(await names()).includes("Abraham"), "Abraham gone from the list");

  await h.click({ css: ".study-detail-actions button", text: "Rename" });
  await h.waitFor(".study-form input");
  before = h.writes.length;
  await h.type(".study-form input", "Paul and Jerusalem");
  await h.click({ css: ".study-form button", text: "Save" });
  await h.sleep(400);
  w = h.writes.slice(before);
  h.assert(w.length === 1 && w[0].op === "update" && w[0].table === "study_collections", "rename -> one update");
  h.assert((await h.text(".study-detail-title h3")) === "Paul and Jerusalem", `title now "${await h.text(".study-detail-title h3")}"`);
  h.assert((await overflow(h)).length === 0, `detail: nothing wider than the viewport (${JSON.stringify(await overflow(h))})`);
  console.log("  screenshot:", await h.screenshot(`study-detail-${tag}.png`));

  await h.click({ css: ".study-item-name", text: "Jerusalem" });
  await h.waitFor(".article-head");
  await h.sleep(300);
  h.assert((await h.text(".article-head h2")).startsWith("Jerusalem"), `tapping the row opens the article ("${await h.text(".article-head h2")}")`);

  h.section("not entitled: the Plus prompt, existing collection read-only");
  h.backend.setRpc("has_entitlement", false);
  applyColumnDefaults(h);
  await h.reload();
  await h.sleep(1000);
  await openArticleByName(h, "Abraham");
  await h.click(".location-panel .study-add-button");
  await h.waitFor(".location-panel .study-add-sheet");
  h.assert(await h.exists(".location-panel .study-add-sheet .study-plus-prompt"), "sheet shows the Capstone Plus prompt");
  h.assert((await h.count(".location-panel .study-add-row input")) === 0, "and no checkbox");
  h.assert(!(await h.exists("text=Upgrade to Plus")), "no Upgrade button while billing is off (never a dead button)");
  console.log("  screenshot:", await h.screenshot(`study-gated-sheet-${tag}.png`));
  await openNotesTab(h, "Collections");
  h.assert(await h.exists(".study-screen .study-plus-prompt"), "Collections tab shows the prompt");
  h.assert((await h.count(".study-new-button")) === 0, "no New Collection button");
  h.assert((await h.count(".study-list-row")) === 1, "existing collection still listed");
  await h.click(".study-list-row");
  await h.waitFor(".study-items");
  h.assert((await h.count(".prayer-list-reorder-btn")) === 0 && (await h.count(".study-add-verse")) === 0, "no reorder, no add-verse without Plus");
  h.assert((await h.count(".study-remove")) > 0, "remove still offered (your own data)");
  console.log("  screenshot:", await h.screenshot(`study-gated-detail-${tag}.png`));

  h.section("delete, with confirmation");
  before = h.writes.length;
  await h.click({ css: ".study-detail-actions button", text: "Delete collection" });
  h.assert(h.writes.length === before, "first tap only asks");
  await h.click({ css: ".study-confirm button", text: "Delete" });
  await h.sleep(500);
  w = h.writes.slice(before);
  h.assert(w.length === 1 && w[0].op === "delete" && w[0].table === "study_collections", "confirm -> one delete of the collection");
  h.assert((await h.count(".study-list-row")) === 0, "back on the list, which is empty");

  h.section("a Bible chapter and a verse note, from their own screens");
  h.backend.setRpc("has_entitlement", true);
  const NOTE_ID = "11111111-0000-4000-8000-000000000001";
  const now = new Date().toISOString();
  h.backend.setTable("notes", [{
    id: NOTE_ID, user_id: h.backend.persona.id, book: "John", chapter: 3, start_verse: 16, end_verse: 16, translation: "web",
    quoted_text: null, quoted_start_offset: null, quoted_end_offset: null, note_text: "(harness test note)",
    is_public: false, created_at: now, updated_at: now,
  }]);
  await h.reload();
  await h.sleep(1200);
  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Bible" });
  await h.waitFor(".bible-mark-read");
  await h.click(".bible-panel .study-add-button");
  await h.waitFor(".bible-panel .study-add-new input");
  before = h.writes.length;
  await h.type(".bible-panel .study-add-new input", "Chapter study");
  await h.click({ css: ".bible-panel .study-add-new button", text: "Create" });
  await h.sleep(500);
  w = h.writes.slice(before);
  const chapterRef = w[1]?.rows?.[0]?.ref_id ?? "";
  h.assert(w[1]?.rows?.[0]?.kind === "verse" && /^[1-3]? ?[A-Za-z][A-Za-z ]* \d+$/.test(chapterRef), `Bible panel adds the chapter as a verse ref ("${chapterRef}")`);
  console.log("  screenshot:", await h.screenshot(`study-bible-${tag}.png`));

  await openNotesTab(h, "My Notes");
  await h.waitFor(".my-notes-item .study-add-button");
  await h.click(".my-notes-item .study-add-button");
  await h.waitFor(".my-notes-item .study-add-row input");
  before = h.writes.length;
  await h.click(".my-notes-item .study-add-row input");
  await h.sleep(400);
  w = h.writes.slice(before);
  h.assert(w.length === 1 && w[0].rows[0].kind === "note" && w[0].rows[0].ref_id === NOTE_ID, `verse note adds {kind: note, ref_id: its id} (${w[0]?.rows?.[0]?.kind})`);
  await openNotesTab(h, "Collections");
  await h.click(".study-list-row");
  await h.waitFor(".study-items");
  await h.sleep(500);
  const rows = await h.evaluate(() => [...document.querySelectorAll(".study-item")].map((e) => e.innerText.replace(/\s+/g, " ").trim()));
  h.assert(rows.some((r) => r.includes("John 3:16") && r.includes("(harness test note)")), `the note resolves to its reference and text (${JSON.stringify(rows)})`);
  h.assert(h.requests.some((r) => r.path.startsWith("/rest/v1/notes") && r.path.includes("id=in.")), "notes read by id");

  h.assert(h.consoleErrors.length === 0, `no page errors (${h.consoleErrors.slice(0, 2).join(" | ")})`);
}
