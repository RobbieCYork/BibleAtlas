/**
 * Verse-action sheet: one-line action row, yellow + rainbow, the Colors sheet, custom highlight colours
 * (stored "#rrggbb@NN" in highlights.color), legacy named highlights still rendering/removable, and the
 * inline "Add a note..." box. Run at 375x667 and 1280x800, light and dark:
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 375x667 --script scripts/signed-in-harness/examples/highlight-colors.mjs
 * Screenshots are hints; every assertion reads the DOM or the fake backend's write log.
 */
import { readFileSync } from "node:fs";
import { MENU_BUTTON } from "../lib/app.mjs";

const VERSES = JSON.parse(readFileSync(new URL("./mark8-web.json", import.meta.url), "utf8"));
const stub = (verses) => `(() => {
  const real = window.fetch.bind(window);
  const verses = ${JSON.stringify(verses)};
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.startsWith("https://bible-api.com/")) return real(input, init);
    const body = { reference: "Mark 8", translation_name: "World English Bible", verses };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
  };
})()`;

const isPhone = (h) => h.evaluate(() => window.innerWidth <= 768);

/** Selects [from,to) characters of verse `v`'s text and fires the mouseup the reader listens for. */
async function selectVerse(h, v, from = 0, to = 40) {
  await h.evaluate((v, from, to) => {
    const el = [...document.querySelectorAll(".bible-verses p")].find((p) => p.textContent.trim().startsWith(String(v)));
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n, seen = 0, startN, startO, endN, endO;
    while ((n = walker.nextNode())) {
      if (n.parentElement.closest("mark.verse-highlight")) { /* still plain text for offsets */ }
      const len = n.textContent.length;
      if (!startN && seen + len > from + 3) { startN = n; startO = Math.max(0, from + 3 - seen); }
      if (!endN && seen + len >= to + 3) { endN = n; endO = Math.min(len, to + 3 - seen); break; }
      seen += len;
    }
    const r = document.createRange();
    r.setStart(startN, startO);
    r.setEnd(endN ?? startN, endO ?? startO + 5);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    document.querySelector(".bible-verses").dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  }, v, from, to);
  await h.waitFor(".verse-sheet");
  await h.sleep(500);
}

export default async function (h) {
  await h.addInitScript(stub(VERSES));
  await h.goto("/");
  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Bible" });
  await h.waitFor(".bible-verses p");
  await h.sleep(800);

  // Seed one legacy-named highlight and one custom one for whatever chapter is on screen.
  const ctx = await h.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.includes("auth-token"));
    const uid = JSON.parse(localStorage.getItem(key)).user?.id;
    return { uid, title: document.querySelector(".bible-passage-title-btn")?.textContent ?? "" };
  });
  h.section(`reader open on "${ctx.title.trim()}"`);
  // The title reads the stub ("Mark 8") but the app's own state is whatever chapter it opened on; the
  // highlights query says which, so seed for that.
  const q = h.requests.filter((r) => /highlights\?select=\*&user_id=eq\.[^&]+&book=/.test(r.path)).pop()?.path ?? "";
  const book = decodeURIComponent(/book=eq\.([^&]+)/.exec(q)?.[1] ?? "Matthew"), chapter = Number(/chapter=eq\.(\d+)/.exec(q)?.[1] ?? 1);
  const row = (id, sv, so, eo, color) => ({ id, user_id: ctx.uid, book, chapter, start_verse: sv, end_verse: sv, translation: "web", start_offset: so, end_offset: eo, color, created_at: new Date().toISOString() });
  h.backend.setTable("highlights", [
    row("hl-green", 2, 0, 30, "green"),
    row("hl-custom", 3, 0, 30, "#3a7bd5@60"),
    row("hl-evil", 4, 0, 30, "red;background:url(//evil)"),
  ]);
  await h.reload();
  await h.sleep(1500);
  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Bible" });
  await h.waitFor(".bible-verses p");
  await h.sleep(800);

  h.section("existing highlights render");
  const marks = await h.evaluate(() => [...document.querySelectorAll("mark.verse-highlight")].map((m) => ({
    cls: m.className, bg: getComputedStyle(m).backgroundColor, fg: getComputedStyle(m).color, inline: m.getAttribute("style") ?? "",
  })));
  h.assert(marks.some((x) => x.cls.includes("verse-highlight-green") && x.bg !== "rgba(0, 0, 0, 0)"), "legacy green highlight still renders with its fill: " + JSON.stringify(marks[0]));
  const custom = marks.find((x) => x.cls.includes("verse-highlight-custom") && x.inline.includes("#3a7bd5"));
  h.assert(!!custom && /rgba\(58, 123, 213, 0\.6/.test(custom.bg), "custom #3a7bd5@60 renders as rgba(58,123,213,.6): " + JSON.stringify(custom));
  const evil = marks.find((x) => x.inline === "" && x.cls.includes("verse-highlight-yellow"));
  h.assert(!!evil, "malformed colour string falls back to yellow, no inline style injected");
  h.assert(!marks.some((x) => /evil/.test(x.inline)), "nothing from the malformed value reached an inline style");

  h.section("sheet: one line, only yellow + rainbow");
  await selectVerse(h, 6, 0, 40);
  const layout = await h.evaluate(() => {
    const row = document.querySelector(".verse-sheet-actions");
    const kids = [...row.children].map((el) => { const r = el.getBoundingClientRect(); return { cls: el.className, top: Math.round(r.top), bottom: Math.round(r.bottom), right: Math.round(r.right), text: el.textContent.trim() }; });
    const close = document.querySelector(".verse-sheet .verse-popup-close").getBoundingClientRect();
    return { kids, closeTop: Math.round(close.top), closeBottom: Math.round(close.bottom), rowRight: Math.round(row.getBoundingClientRect().right), overflow: row.scrollWidth > row.clientWidth + 1, compact: row.classList.contains("is-compact"), vw: innerWidth };
  });
  console.log("  row layout:", JSON.stringify(layout));
  const mids = layout.kids.map((k) => (k.top + k.bottom) / 2);
  h.assert(Math.max(...mids) - Math.min(...mids) <= 2, `all action buttons share one line (centres: ${mids})`);
  h.assert(!layout.overflow, "action row does not overflow");
  h.assert(layout.kids.length === 5, `5 controls in the row: yellow, rainbow, Note, Tag, Share (got ${layout.kids.length})`);
  h.assert(layout.kids.every((k) => k.right <= layout.rowRight), "everything inside the row");
  h.assert(layout.closeTop <= layout.kids[0].bottom && layout.closeBottom >= layout.kids[0].top, "close X is on that same line (corner)");
  h.assert((await h.count(".verse-sheet-actions .verse-popup-color-green, .verse-sheet-actions .verse-popup-color-blue, .verse-sheet-actions .verse-popup-color-pink")) === 0, "no green/blue/pink swatches");
  h.assert((await h.count(".verse-sheet-actions .verse-popup-color-yellow")) === 1, "yellow swatch present");
  await h.screenshot(`sheet-${h.viewport?.width ?? "x"}-${h.theme}.png`);

  h.section("inline note box focused on open");
  const focused = await h.evaluate(() => document.activeElement?.className ?? "");
  h.assert(/\bverse-popup-inline-note\b/.test(await h.evaluate(() => document.activeElement?.closest("form")?.className ?? "")) , "inline note textarea has focus on open (" + focused + ")");
  h.assert((await h.count(".verse-sheet")) === 1, "sheet stayed open after focus moved into the textarea");
  h.assert((await h.count("mark.verse-selection-preview")) > 0, "selected verse still shown (preview mark) while the box has focus");

  h.section("Colors sheet");
  await h.click(".verse-popup-color-wheel");
  await h.waitFor(".hl-colors-dialog");
  await h.sleep(300);
  const grid = await h.evaluate(() => ({ n: document.querySelectorAll(".hl-colors-swatch").length, cols: getComputedStyle(document.querySelector(".hl-colors-grid")).gridTemplateColumns.split(" ").length, title: document.querySelector(".hl-colors-head h2").textContent, active: document.activeElement?.getAttribute("role") }));
  h.assert(grid.n === 108 && grid.cols === 12, `12 x 9 grid (${grid.n} swatches, ${grid.cols} columns)`);
  h.assert(grid.title === "Colors" && grid.active === "radio", "title Colors; focus moved into the grid");
  h.assert((await h.count(".verse-sheet")) === 1, "verse sheet still open behind the Colors sheet");
  h.assert(await h.evaluate(() => document.querySelector(".hl-colors-confirm").disabled), "Highlight disabled until a swatch is picked");
  // pick by keyboard: ArrowRight x2 then Space/Enter
  await h.click({ css: ".hl-colors-swatch", text: "" }, { index: 12 + 8 * 12 - 12 + 5 }).catch(() => {});
  await h.evaluate(() => { const s = document.querySelectorAll(".hl-colors-swatch")[12 + 12 * 3 + 8]; s.click(); });
  await h.evaluate(() => { const i = document.querySelector(".hl-colors-opacity input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "55"); i.dispatchEvent(new Event("input", { bubbles: true })); });
  await h.sleep(200);
  const pv = await h.evaluate(() => ({ readout: document.querySelector(".hl-colors-opacity-value").textContent, hex: document.querySelector(".hl-colors-preview-hex").textContent, sel: document.querySelector(".hl-colors-swatch.is-selected")?.getAttribute("aria-label"), markBg: getComputedStyle(document.querySelector(".hl-colors-preview mark")).backgroundColor }));
  console.log("  preview:", JSON.stringify(pv));
  h.assert(pv.readout === "55%" && /55%/.test(pv.hex) && !!pv.sel && /rgba/.test(pv.markBg), "opacity readout, selected swatch and live preview all update");
  await h.screenshot(`colors-${h.theme}-${h.viewport?.width ?? "x"}.png`);
  const wBefore = h.writes.length;
  await h.click(".hl-colors-confirm");
  await h.sleep(700);
  h.assert((await h.count(".hl-colors-dialog")) === 0, "Colors sheet closed after Highlight");
  const w = h.writes.slice(wBefore).find((x) => /highlights/.test(x.path));
  console.log("  write:", JSON.stringify(w));
  const stored = h.backend.tables.highlights.find((r) => r.start_verse === 6);
  h.assert(!!stored && /^#[0-9a-f]{6}@55$/.test(stored.color), "stored as #rrggbb@55: " + stored?.color);
  const m6 = await h.evaluate(() => { const mk = [...document.querySelectorAll("mark.verse-highlight-custom")].find((m) => m.closest("p")?.textContent.trim().startsWith("6")); return mk ? { bg: getComputedStyle(mk).backgroundColor, fg: getComputedStyle(mk).color } : null; });
  h.assert(!!m6 && /rgba/.test(m6.bg), "verse 6 now wears the custom colour: " + JSON.stringify(m6));

  h.section("reload keeps it");
  await h.reload(); await h.sleep(1500);
  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Bible" });
  await h.waitFor(".bible-verses p"); await h.sleep(800);
  h.assert((await h.count("mark.verse-highlight-custom")) >= 2, "custom highlights survive reload");

  h.section("legacy green is changeable and removable");
  await h.click("mark.verse-highlight-green"); await h.waitFor(".verse-sheet"); await h.sleep(400);
  const wheelActive = await h.evaluate(() => document.querySelector(".verse-popup-color-wheel").classList.contains("is-active-wheel"));
  h.assert(wheelActive, "rainbow shows the non-yellow highlight is active");
  await h.click(".verse-popup-color-yellow"); await h.sleep(500);
  h.assert(h.backend.tables.highlights.find((r) => r.id === "hl-green")?.color === "yellow", "green changed to yellow in place");
  await h.click(".verse-popup-color-yellow"); await h.sleep(500);
  h.assert(!h.backend.tables.highlights.some((r) => r.id === "hl-green"), "tapping the active yellow removes it");
  await h.click("mark.verse-highlight-custom"); await h.waitFor(".verse-sheet"); await h.sleep(400);
  await h.click(".verse-popup-color-wheel"); await h.waitFor(".hl-colors-dialog"); await h.sleep(300);
  h.assert((await h.count(".hl-colors-remove")) === 1 && (await h.count(".hl-colors-swatch.is-selected")) === 0, "custom highlight: Colors sheet offers Remove");
  await h.click(".hl-colors-remove"); await h.sleep(600);
  h.assert(!h.backend.tables.highlights.some((r) => r.id === "hl-custom"), "custom highlight removed");

  h.section("Escape closes only the Colors sheet");
  await selectVerse(h, 7, 0, 30);
  await h.click(".verse-popup-color-wheel"); await h.waitFor(".hl-colors-dialog"); await h.sleep(300);
  await h.evaluate(() => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await h.sleep(300);
  h.assert((await h.count(".hl-colors-dialog")) === 0 && (await h.count(".verse-sheet")) === 1, "Escape closes Colors, verse sheet stays");

  h.section("inline note: type, Enter saves, same notes row as the Note button");
  const nBefore = h.backend.tables.notes.length;
  await h.click(".verse-popup-inline-note textarea");
  await h.type(".verse-popup-inline-note textarea", "My inline note");
  await h.evaluate(() => document.querySelector(".verse-popup-inline-note textarea").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
  await h.sleep(900);
  const note = h.backend.tables.notes[h.backend.tables.notes.length - 1];
  h.assert(h.backend.tables.notes.length === nBefore + 1 && note.note_text === "My inline note" && note.start_verse === 7, "note row written for verse 7: " + JSON.stringify({ v: note?.start_verse, q: (note?.quoted_text ?? "").slice(0, 30) }));
  h.assert(!!note.quoted_text && note.quoted_start_offset != null, "same payload as the Note button (quoted text + offsets)");
  h.assert((await h.text(".verse-popup-notes-list")).includes("My inline note"), "note listed in the sheet");
  h.assert((await h.evaluate(() => document.querySelector(".verse-popup-inline-note textarea").value)) === "", "box cleared");
  h.assert(h.backend.tables.highlights.some((r) => r.start_verse === 7), "note auto-highlights like the Note button does");
  await h.screenshot(`note-saved-${h.theme}-${h.viewport?.width ?? "x"}.png`);

  h.section("the note shows up in Notes");
  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Notes" });
  else {
    await h.click(MENU_BUTTON); await h.sleep(250);
    const link = await h.exists({ css: ".panel-menu-link", text: "Notes" });
    await h.click(link ? { css: ".panel-menu-link", text: "Notes" } : { css: ".panel-menu-item", text: "Notes" });
  }
  await h.sleep(1500);
  h.assert((await h.evaluate(() => document.body.innerText)).includes("My inline note"), "inline note appears in the Notes panel");
  await h.screenshot(`notes-${h.theme}-${h.viewport?.width ?? "x"}.png`);
}
