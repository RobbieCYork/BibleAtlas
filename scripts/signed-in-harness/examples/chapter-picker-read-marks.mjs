/**
 * Chapter picker read marks (ReferencePicker): each chapter the account has read wears a check badge,
 * with "N of M chapters read" above the grid.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 \
 *        --script scripts/signed-in-harness/examples/chapter-picker-read-marks.mjs --out <dir>
 * Env: SKINS=default,sticker,midnight,skyreader
 * Asserts: marks on exactly the seeded chapters, aria-labels, current stays distinct, 44px targets,
 * no horizontal overflow, no layout shift of the grid when the count arrives, an unread-only book shows none.
 */
const SKINS = (process.env.SKINS ?? "default,sticker,midnight,skyreader").split(",");
const STUB = `(() => {
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

const ME = "00000000-0000-4000-8000-000000000001";
const row = (book, chapter) => ({ user_id: ME, book, chapter, read_at: new Date().toISOString() });

async function openPicker(h, book) {
  await h.waitFor(".bible-passage-title-btn");
  await h.click(".bible-passage-title-btn");
  await h.waitFor(".ref-picker-book");
  await h.click({ css: ".ref-picker-book", text: book });
  await h.waitFor(".ref-picker-cell");
  await h.sleep(400);
}
const closePicker = (h) => h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));

const snap = (h) => h.evaluate(() => {
  const cells = [...document.querySelectorAll(".ref-picker-cell")];
  const grid = document.querySelector(".ref-picker-grid").getBoundingClientRect();
  return {
    read: cells.filter((c) => c.getAttribute("data-read") === "true").map((c) => Number(c.textContent)),
    withSvg: cells.filter((c) => c.querySelector("svg.ref-picker-check")).map((c) => Number(c.textContent)),
    current: cells.filter((c) => c.getAttribute("data-current") === "true").map((c) => Number(c.textContent)),
    labels: cells.map((c) => c.getAttribute("aria-label")),
    minH: Math.min(...cells.map((c) => c.getBoundingClientRect().height)),
    minW: Math.min(...cells.map((c) => c.getBoundingClientRect().width)),
    gridTop: grid.top,
    summary: document.querySelector(".ref-picker-progress")?.textContent.replace(/ /g, " ").trim() ?? null,
    overflow: document.documentElement.scrollWidth > window.innerWidth || document.querySelector(".ref-picker-body").scrollWidth > document.querySelector(".ref-picker-body").clientWidth,
    bg: cells.map((c) => getComputedStyle(c).backgroundColor),
    chapters: cells.length,
  };
});

export default async (h) => {
  await h.addInitScript(STUB);
  h.backend.setTable("chapter_reads", [row("Mark", 3), row("Mark", 5), row("Matthew", 1)]);
  const bgs = {};

  for (const skin of SKINS) {
    h.section(`skin ${skin}`);
    await h.evaluate((s) => { try { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); } catch {} }, skin);
    await h.reload();
    await h.sleep(800);
    await openPicker(h, "Mark");
    // Pick Mark 6 so it is the current chapter (unread).
    await h.click({ css: ".ref-picker-cell", text: "6" });
    await h.sleep(800);
    await openPicker(h, "Mark");
    const s = await snap(h);
    h.assert(JSON.stringify(s.read) === "[3,5]", `${skin}: read marks on exactly 3,5 (got ${JSON.stringify(s.read)})`);
    h.assert(JSON.stringify(s.withSvg) === "[3,5]", `${skin}: check glyph (svg) on exactly 3,5 (got ${JSON.stringify(s.withSvg)})`);
    h.assert(s.labels[2] === "Chapter 3, read" && s.labels[4] === "Chapter 5, read", `${skin}: aria "Chapter 3, read"/"Chapter 5, read" (${s.labels[2]} | ${s.labels[4]})`);
    h.assert(s.labels[0] === "Chapter 1", `${skin}: unread label plain (${s.labels[0]})`);
    h.assert(s.labels[5] === "Chapter 6, current chapter", `${skin}: current label (${s.labels[5]})`);
    h.assert(JSON.stringify(s.current) === "[6]", `${skin}: current is 6 only`);
    h.assert(s.bg[5] !== s.bg[2] && s.bg[5] !== s.bg[0], `${skin}: current bg differs from read and unread (${s.bg[5]} / ${s.bg[2]} / ${s.bg[0]})`);
    h.assert(s.bg[2] !== s.bg[0], `${skin}: read bg tinted vs unread (${s.bg[2]} vs ${s.bg[0]})`);
    h.assert(s.summary === "2 of 16 chapters read", `${skin}: summary line (got ${s.summary})`);
    h.assert(s.chapters === 16 && s.minH >= 44 && s.minW >= 44, `${skin}: 16 cells, targets >=44px (h ${s.minH}, w ${s.minW})`);
    h.assert(!s.overflow, `${skin}: no horizontal overflow`);
    await h.screenshot(`${skin}-picker-mark.png`);
    bgs[skin] = s.bg;

    // Mark current chapter 6 read via the reader's checkbox -> appears (current + read) on reopen.
    await closePicker(h);
    await h.sleep(300);
    await h.click(".bible-mark-read input");
    await h.sleep(500);
    await openPicker(h, "Mark");
    const s2 = await snap(h);
    h.assert(JSON.stringify(s2.read) === "[3,5,6]" && s2.summary === "3 of 16 chapters read", `${skin}: after ticking 6: read ${JSON.stringify(s2.read)}, "${s2.summary}"`);
    h.assert(s2.labels[5] === "Chapter 6, current chapter, read", `${skin}: current+read label (${s2.labels[5]})`);
    h.assert(s2.bg[5] === s.bg[5], `${skin}: current still the same distinct fill when read`);
    await h.screenshot(`${skin}-picker-mark-current-read.png`);
    // untick so the next skin starts clean
    await closePicker(h);
    await h.sleep(300);
    await h.click(".bible-mark-read input");
    await h.sleep(500);

    // Unread-only book.
    await openPicker(h, "Luke");
    const s3 = await snap(h);
    h.assert(s3.read.length === 0 && s3.withSvg.length === 0, `${skin}: Luke (unread) shows no marks`);
    h.assert(s3.summary === "0 of 24 chapters read", `${skin}: Luke summary (got ${s3.summary})`);
    h.assert(!s3.overflow, `${skin}: Luke no overflow`);
    await closePicker(h);
  }
  const real = h.requests.filter((r) => /chapter_reads/.test(r.path));
  h.assert(real.length > 0, `chapter_reads requests came from the fake backend (${real.length})`);
};
