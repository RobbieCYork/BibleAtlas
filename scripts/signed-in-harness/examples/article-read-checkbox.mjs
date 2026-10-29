/**
 * Worked example: the "Mark this article as read" checkbox (sql/041_article_reads.sql) on all six
 * article kinds - topic, person, place, site, timeline event and book introduction.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/article-read-checkbox.mjs
 *
 * For each article: the checkbox is the LAST thing in the article; ticking it upserts
 * {user_id, kind, article_id} to article_reads and puts a check beside the title; the mark survives a
 * reload (it is loaded back from the table); unticking deletes that one row and removes the check.
 * Then: the table missing (migration unapplied: 404 / 42P01) draws no checkbox and no check, and a
 * signed-out visitor never reaches an article and never asks for article_reads.
 *
 * What this cannot prove: the real RLS policies in sql/041 (the fake does not enforce them).
 */
import { MENU_BUTTON } from "../lib/app.mjs";

const ARTICLES = [
  { kind: "topic", id: "demons", name: "Demons" },
  { kind: "person", id: "abraham", name: "Abraham" },
  { kind: "place", id: "jerusalem", name: "Jerusalem" },
  { kind: "site", id: "caesarea-maritima", name: "Caesarea Maritima" },
  { kind: "event", id: "bib-prim-creation", name: "Creation of the Heavens and Earth" },
];
const BOOK = "Genesis";

/** Articles panel -> search -> click the row whose name is EXACTLY `name` (search also returns partial matches). */
async function openByExactName(h, name) {
  if (!(await h.exists(".articles-search input"))) {
    await h.click(MENU_BUTTON);
    await h.click({ css: ".panel-menu-item", text: "Articles" });
    await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
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

/** Book introductions open only from the chapter picker, and the picker opens from the chapter
 * heading, which is drawn only once a chapter's text has loaded. bible-api.com is blocked, so an
 * in-page stub (BIBLE_STUB, installed in the default export) answers it with one placeholder verse;
 * nothing leaves the page. Then: chapter heading -> book -> "Introduction to <book>". */
async function openBookIntro(h, book) {
  await h.waitFor(".bible-passage-title-btn");
  await h.click(".bible-passage-title-btn");
  await h.waitFor(".ref-picker-book");
  await h.click({ css: ".ref-picker-book", text: book });
  await h.waitFor(".ref-picker-intro");
  await h.click(".ref-picker-intro");
  await h.waitFor(".bible-panel h4");
  await h.sleep(300);
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

/** State of the visible article: its checkbox, where it sits, and the title check. */
const readArticle = (h, intro = false) =>
  h.evaluate((intro) => {
    const scope = intro ? document.querySelector(".bible-panel") : document;
    const boxes = [...(scope?.querySelectorAll(".article-mark-read") ?? [])].filter((el) => el.getClientRects().length);
    const label = boxes[0] ?? null;
    let last = null;
    if (label) {
      // "At the bottom": nothing after it in its container, and it starts below everything before it.
      const prev = [...label.parentElement.children].filter((e) => e !== label && e.getClientRects().length);
      const lowestPrevBottom = Math.max(...prev.map((e) => e.getBoundingClientRect().bottom));
      last = { isLastChild: label.parentElement.lastElementChild === label, top: label.getBoundingClientRect().top, lowestPrevBottom };
    }
    const heading = intro ? scope?.querySelector("h4") : document.querySelector(".article-head h2");
    return {
      count: boxes.length,
      text: label?.innerText.trim() ?? null,
      checked: label?.querySelector("input")?.checked ?? null,
      last,
      // Articles: a check inside the <h2>. Book intro: its heading is the chapter-picker chip, which
      // wears the same check the chapter heading does (.bible-passage-title-check) and says "read".
      titleCheck: intro
        ? !!heading?.querySelector(".bible-passage-title-check") && /— read —/.test(heading?.querySelector("button")?.getAttribute("aria-label") ?? "")
        : !!heading?.querySelector(".article-title-check"),
      heading: heading?.innerText.trim() ?? null,
    };
  }, intro);

async function exercise(h, art, open) {
  h.section(`${art.kind}: ${art.name}`);
  await h.reload();
  await h.sleep(800);
  await open();
  let s = await readArticle(h, art.kind === "book-intro");
  h.assert(s.count === 1 && s.text === "Mark this article as read", `one checkbox, labelled "${s.text}" (count ${s.count})`);
  h.assert(s.last?.isLastChild && s.last.top >= s.last.lowestPrevBottom - 1,
    `checkbox is the last thing in the article (last child: ${s.last?.isLastChild}; top ${s.last?.top.toFixed(0)} >= ${s.last?.lowestPrevBottom.toFixed(0)})`);
  h.assert(s.checked === false && !s.titleCheck, `starts unticked, no check by the title "${s.heading}"`);

  const before = h.writes.length;
  await h.click(".article-mark-read input");
  await h.sleep(400);
  const w = h.writes.slice(before);
  const row = w[0]?.rows?.[0] ?? {};
  h.assert(w.length === 1 && w[0].table === "article_reads" && w[0].op === "upsert" && row.kind === art.kind && row.article_id === art.id && row.user_id === h.backend.persona.id,
    `tick -> one upsert to article_reads {kind: ${row.kind}, article_id: ${row.article_id}, own user_id: ${row.user_id === h.backend.persona.id}}`);
  s = await readArticle(h, art.kind === "book-intro");
  h.assert(s.checked === true && s.titleCheck, `ticked, and the title shows the check ("${s.heading}")`);

  // Persisted: a reload loads the mark back from the table.
  await h.reload();
  await h.sleep(800);
  await open();
  s = await readArticle(h, art.kind === "book-intro");
  h.assert(s.checked === true && s.titleCheck, "after a reload the mark is loaded back: ticked, title check present");

  const before2 = h.writes.length;
  await h.click(".article-mark-read input");
  await h.sleep(400);
  const d = h.writes.slice(before2);
  h.assert(d.length === 1 && d[0].table === "article_reads" && d[0].op === "delete" && d[0].rows.length === 1 && d[0].rows[0].article_id === art.id,
    `untick -> one delete of exactly that row (${d.map((x) => `${x.op} ${x.rows.length}`).join(", ")})`);
  s = await readArticle(h, art.kind === "book-intro");
  h.assert(s.checked === false && !s.titleCheck, "unticked, title check gone");
  const left = h.backend.tables.article_reads.filter((r) => r.kind === art.kind && r.article_id === art.id).length;
  h.assert(left === 0, `no row left for ${art.kind}/${art.id} (${left})`);
}

export default async function (h) {
  await h.addInitScript(BIBLE_STUB);
  for (const art of ARTICLES) await exercise(h, art, () => openByExactName(h, art.name));
  await exercise(h, { kind: "book-intro", id: BOOK, name: `Introduction to ${BOOK}` }, () => openBookIntro(h, BOOK));

  h.section("re-ticking the same article is one row, not two");
  await h.reload(); await h.sleep(800);
  await openByExactName(h, "Demons");
  await h.click(".article-mark-read input"); await h.sleep(300);
  await h.click(".article-mark-read input"); await h.sleep(300);
  await h.click(".article-mark-read input"); await h.sleep(300);
  const demons = h.backend.tables.article_reads.filter((r) => r.article_id === "demons");
  h.assert(demons.length === 1, `tick, untick, tick -> exactly one row (${demons.length})`);

  h.section("table missing (sql/041 unapplied): 404 / 42P01 -> no checkbox, no check");
  h.backend.setTableError("article_reads", { status: 404, code: "42P01", message: 'relation "public.article_reads" does not exist' });
  await h.reload(); await h.sleep(1000);
  await openByExactName(h, "Demons");
  let s = await readArticle(h);
  h.assert(s.count === 0 && !s.titleCheck, `topic: no checkbox (${s.count}) and no title check even though a row exists`);
  await h.reload(); await h.sleep(800);
  await openBookIntro(h, BOOK);
  s = await readArticle(h, true);
  h.assert(s.count === 0 && !s.titleCheck, `book intro: no checkbox (${s.count}), no check`);
  h.assert(h.requests.some((r) => r.how === "forced-error" && r.path.startsWith("/rest/v1/article_reads")), "the app did ask for article_reads and got the error");
  h.backend.setTableError("article_reads", null);

  h.section("signed out: no article, no checkbox, no article_reads request");
  await h.asPersona("signedout");
  await h.sleep(1000);
  const reqsBefore = h.requests.length;
  await h.reload(); await h.sleep(1200);
  const asked = h.requests.slice(reqsBefore).filter((r) => r.path.startsWith("/rest/v1/article_reads")).length;
  h.assert((await h.count(".article-mark-read")) === 0 && (await h.count(".article-title-check")) === 0, "signed out: no checkbox, no title check");
  h.assert(asked === 0, `signed out: 0 requests to article_reads (${asked})`);
  console.log("  screenshot (a hint, not evidence):", await h.screenshot("signed-out.png"));
}
