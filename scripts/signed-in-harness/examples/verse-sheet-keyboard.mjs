/**
 * The verse sheet and the on-screen keyboard (lib/onScreenKeyboard.ts): on a touch screen selecting
 * text raises no keyboard; tapping a field does, and the sheet, that field, its Save and the selected
 * text all sit above it; with a mouse the note box is still focused on open. Run at 402x874 and
 * 1280x800:
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 402x874 --script scripts/signed-in-harness/examples/verse-sheet-keyboard.mjs
 * The keyboard is SIMULATED (visualViewport.height is overridden) and the touch pointer is a
 * matchMedia stub. What iOS itself does on focus is only provable in the iOS Simulator or on a phone.
 */
import { readFileSync } from "node:fs";

const VERSES = JSON.parse(readFileSync(new URL("./mark8-web.json", import.meta.url), "utf8"));
const KEYBOARD = 396;
const stub = (touch) => `(() => {
  const real = window.fetch.bind(window);
  const verses = ${JSON.stringify(VERSES)};
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.startsWith("https://bible-api.com/")) return real(input, init);
    const body = { reference: "Mark 8", translation_name: "World English Bible", verses };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
  };
  if (!${touch}) return;
  const mm = window.matchMedia.bind(window);
  window.matchMedia = (q) => q === "(hover: hover) and (pointer: fine)"
    ? { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
    : mm(q);
  window.__keyboard = 0;
  Object.defineProperty(window.visualViewport, "height", { configurable: true, get: () => window.innerHeight - window.__keyboard });
})()`;

/** Selects the first `length` characters of verse `v` and ends the gesture the way `how` says. */
async function select(h, v, how, length = 30) {
  await h.evaluate((v, how, length) => {
    const text = [...document.querySelectorAll(".bible-verses p")].find((p) => p.querySelector(".bible-verse-num")?.textContent === String(v)).querySelector(".bible-verse-num").nextElementSibling;
    const node = document.createTreeWalker(text, NodeFilter.SHOW_TEXT).nextNode();
    const r = document.createRange();
    r.setStart(node, 0);
    r.setEnd(node, Math.min(length, node.length));
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    document.querySelector(".bible-verses").dispatchEvent(new Event(how, { bubbles: true }));
  }, v, how, length);
  await h.waitFor(".verse-sheet");
  await h.sleep(700);
}

const keyboard = async (h, px) => {
  await h.evaluate((px) => { window.__keyboard = px; window.visualViewport.dispatchEvent(new Event("resize")); }, px);
  await h.sleep(500);
};

const state = (h, verse) => h.evaluate((verse) => {
  const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const p = [...document.querySelectorAll(".bible-verses p")].find((p) => p.querySelector(".bible-verse-num")?.textContent === String(verse));
  const a = document.activeElement;
  return {
    field: a?.tagName === "TEXTAREA" || a?.tagName === "INPUT",
    selection: String(getSelection()),
    visibleBottom: window.visualViewport.height,
    panel: box(".bible-panel-scroll"),
    sheet: box(".verse-sheet"),
    sheetBottom: document.querySelector(".verse-sheet")?.style.bottom ?? null,
    note: box(".verse-popup-inline-note textarea"),
    save: box(".verse-popup-inline-save"),
    editor: box(".verse-popup-note-editor textarea"),
    editorSave: box(".verse-popup-note-editor .verse-popup-save"),
    first: p ? { top: p.getClientRects()[0].top } : null,
    preview: box("mark.verse-selection-preview"),
  };
}, verse);

const inside = (r, s) => r && r.top >= s.sheet.top - 0.5 && r.bottom <= s.visibleBottom + 0.5;

export default async function (h) {
  const phone = Number(h.viewport.split("x")[0]) <= 768;
  await h.addInitScript(stub(phone));
  await h.reload();
  await h.sleep(1500);
  if (phone) await h.click({ css: ".mobile-tab", text: "Bible" });
  await h.waitFor(".bible-verses p");
  await h.sleep(800);

  if (!phone) {
    h.section("mouse and keyboard: unchanged");
    await select(h, 2, "mouseup");
    const s = await state(h, 2);
    h.assert(s.field, "the inline note box is focused on open");
    h.assert(s.sheetBottom === "", "the sheet is not lifted");
    await h.click(".verse-popup-note-btn");
    await h.sleep(400);
    h.assert((await state(h, 2)).field, "the note editor focuses its box");
    return;
  }

  h.section("touch: selecting raises no keyboard");
  await select(h, 2, "touchend");
  let s = await state(h, 2);
  h.assert(!s.field, "no text field takes focus");
  h.assert(s.selection === "", "the native selection is cleared");
  h.assert(!!s.preview, "the selected text keeps its preview mark");
  h.assert(s.preview.bottom <= s.sheet.top && s.preview.top >= s.panel.top, "the selected text is above the sheet: " + JSON.stringify([s.preview, s.sheet]));

  h.section("touch: tapping the note box lifts the sheet above the keyboard");
  await h.touch([{ x: s.note.x, y: s.note.y }]);
  await h.sleep(300);
  h.assert((await state(h, 2)).field, "the tapped box has focus");
  await keyboard(h, KEYBOARD);
  s = await state(h, 2);
  h.assert(s.sheet.bottom <= s.visibleBottom + 0.5, `sheet ends above the keyboard (${s.sheet.bottom} <= ${s.visibleBottom})`);
  h.assert(inside(s.note, s) && inside(s.save, s), "note box and Save are both on screen");
  h.assert(s.preview.bottom <= s.sheet.top && s.preview.top >= s.panel.top, "the selected text is still above the sheet: " + JSON.stringify([s.preview, s.sheet]));
  await h.screenshot("keyboard-inline.png");

  h.section("touch: dismissing the keyboard restores the layout");
  await h.evaluate(() => document.activeElement.blur());
  await keyboard(h, 0);
  s = await state(h, 2);
  h.assert(s.sheetBottom === "" && !!s.sheet, "the sheet is back at the bottom of the reader and still open");

  h.section("touch: Note editor waits for a tap, then shows box and Save");
  await h.touch([await h.evaluate(() => { const r = document.querySelector(".verse-popup-note-btn").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })]);
  await h.waitFor(".verse-popup-note-editor textarea");
  await h.sleep(500);
  s = await state(h, 2);
  h.assert(!s.field, "opening the editor raises no keyboard");
  await h.touch([{ x: s.editor.x, y: s.editor.y }]);
  await h.sleep(300);
  await keyboard(h, KEYBOARD);
  s = await state(h, 2);
  h.assert(s.field && inside(s.editor, s) && inside(s.editorSave, s), "editor box and Save are above the keyboard: " + JSON.stringify([s.editor, s.editorSave, s.visibleBottom]));
  await h.screenshot("keyboard-editor.png");

  h.section("touch: a button tapped with the keyboard up still works");
  const cancel = await h.evaluate(() => { const r = [...document.querySelectorAll(".verse-popup-note-actions button")][0].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await h.touch([cancel]);
  await h.sleep(400);
  await keyboard(h, 0);
  s = await state(h, 2);
  h.assert(!!s.note && !s.editor && s.sheetBottom === "", "Cancel returns to the verse sheet at rest");

  h.section("touch: text low on the screen is brought above the sheet");
  await h.touch([await h.evaluate(() => { const r = document.querySelector(".verse-popup-close").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })]);
  await h.sleep(400);
  const low = await h.evaluate(() => {
    const scroller = document.querySelector(".bible-panel-scroll");
    scroller.scrollTop = 0;
    const bottom = scroller.getBoundingClientRect().bottom;
    const p = [...document.querySelectorAll(".bible-verses p")].filter((p) => p.getBoundingClientRect().top < bottom - 60).pop();
    return Number(p.querySelector(".bible-verse-num").textContent);
  });
  await select(h, low, "touchend", 12);
  s = await state(h, low);
  h.assert(s.preview.bottom <= s.sheet.top && s.preview.top >= s.panel.top, `verse ${low} is above the sheet: ` + JSON.stringify([s.preview, s.sheet]));
}
