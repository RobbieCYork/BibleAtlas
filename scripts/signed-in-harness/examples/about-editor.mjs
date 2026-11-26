/**
 * Admin Console -> About page (AboutPageEditor.tsx, lib/aboutContent.ts, sql/051).
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 390x844 --script scripts/signed-in-harness/examples/about-editor.mjs
 *   (also at 1280x800, and --persona administrator / member / signedout at both)
 *
 * owner:          the tab; built-in text loaded; edit, preview, markup stays literal text; the unsaved
 *                 guard (tab switch, Back, beforeunload) and the draft kept on this device; Save reaches
 *                 save_about_page once and readers see it in the app AND at /about; a save made
 *                 elsewhere is caught (40001) and can be overwritten; undo by loading the original text
 *                 and an earlier version; section add/move/remove and validation; sql/051 NOT applied:
 *                 the editor says saving is off, readers get the built-in text with no errors.
 * administrator:  no About page tab; reads the saved text like anyone.
 * member:         no Admin Console; reads the saved text.
 * signedout:      /about shows the saved text through its loader, and the built-in text when the
 *                 table is missing; the loader is the page's only script.
 *
 * The fake backend does NOT enforce RLS — who can write is proven by the PGlite rehearsal of
 * sql/051, not here. This proves the UI gates and the wiring.
 */
import { MENU_BUTTON, openAdminConsole, adminTabs } from "../lib/app.mjs";

const about = await import("../../../src/data/aboutPage.ts");
const BUILT_IN = [about.ABOUT_PULL_QUOTE, ...about.ABOUT_SECTIONS.flatMap((s) => [...(s.heading ? [s.heading] : []), ...s.paragraphs])];
const SAVED = {
  quote: "A saved pull quote.",
  sections: [
    { heading: null, paragraphs: ["Saved opening paragraph."] },
    { heading: "Saved heading <b>not bold</b>", paragraphs: ["<img src=x onerror=window.__pwned=1> stays text.", "Second saved paragraph."] },
  ],
};
const SAVED_WORDS = [SAVED.quote, ...SAVED.sections.flatMap((s) => [...(s.heading ? [s.heading] : []), ...s.paragraphs])];
const SAVED_ROW = { id: 1, content: SAVED, updated_at: "2026-11-26T20:00:00.123456+00:00" };

const CONFIRM_STUB = `window.__confirms = []; window.confirm = (m) => { window.__confirms.push(String(m)); return window.__confirmAnswer !== false; };`;
const wording = (h, root) => h.evaluate((r) => [...document.querySelectorAll(`${r} blockquote, ${r} section h2, ${r} section h3, ${r} section p`)].map((e) => e.textContent), root);
const overflowX = (h) => h.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1 || [...document.querySelectorAll(".admin-about *")].some((e) => e.getBoundingClientRect().right > window.innerWidth + 1));
const beforeUnloadBlocks = (h) => h.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
const aboutTab = { css: '[aria-label="Admin sections"] [role=tab]', text: "About page" };
const sectionSel = (n, what) => `fieldset.admin-about-section:nth-of-type(${n}) ${what}`;
const QUOTE = ".admin-about-form > label.admin-about-field textarea";

async function openEditor(h) {
  await openAdminConsole(h);
  await h.click(aboutTab);
  await h.waitFor(".admin-about-bar, .admin-about .auth-error");
  await h.sleep(300);
}
async function closeMenus(h) {
  await h.evaluate(() => document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
  await h.sleep(200);
}
async function inAppWords(h) {
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  await h.click(MENU_BUTTON);
  await h.sleep(300);
  await h.click(phone ? ".mobile-nav-menu-about" : ".panel-menu-about");
  await h.waitFor(".about-root");
  await h.sleep(600);
  return wording(h, ".about-root");
}
async function staticWords(h) {
  await h.evaluate(() => { location.assign("/about/"); });
  await h.sleep(1500);
  return {
    words: await wording(h, "#about-words"),
    source: await h.evaluate(() => document.getElementById("about-words")?.getAttribute("data-source") ?? null),
    scripts: await h.evaluate(() => [...document.scripts].filter((s) => s.type !== "application/ld+json").length),
    pwned: await h.evaluate(() => !!window.__pwned || !!document.querySelector("#about-words img, #about-words b")),
  };
}

export default async (h) => {
  const dev = (await h.evaluate(() => window.innerWidth)) <= 768 ? "phone" : "desktop";
  const shot = (name) => h.screenshot(`about-editor-${h.persona}-${name}-${dev}.png`);
  h.section(`about editor — ${h.persona} @ ${h.viewport}`);

  // ------------------------------------------------------------------ signed out
  if (h.persona === "signedout") {
    h.backend.setTable("about_page", [SAVED_ROW]);
    let s = await staticWords(h);
    h.assert(s.scripts === 1, `static /about: exactly one script, the loader (${s.scripts})`);
    h.assert(JSON.stringify(s.words) === JSON.stringify(SAVED_WORDS) && s.source === "saved", `static /about: shows the saved text (${JSON.stringify(s.words).slice(0, 120)})`);
    h.assert(!s.pwned, "static /about: markup in saved text stays literal text (no <img>/<b>, nothing ran)");
    h.assert(h.requests.some((r) => r.path.startsWith("/rest/v1/about_page?")), "static /about: read about_page from the (fake) Supabase");
    await shot("static-saved");
    h.backend.setTableError("about_page", { status: 404, code: "PGRST205", message: "Could not find the table 'public.about_page' in the schema cache" });
    s = await staticWords(h);
    h.assert(JSON.stringify(s.words) === JSON.stringify(BUILT_IN) && s.source === null, "static /about, sql/051 not applied: built-in text");
    h.backend.setTableError("about_page", null);
    h.backend.setTable("about_page", [{ id: 1, content: { quote: "x", sections: [] }, updated_at: SAVED_ROW.updated_at }]);
    s = await staticWords(h);
    h.assert(JSON.stringify(s.words) === JSON.stringify(BUILT_IN), "static /about, a row in a bad shape: built-in text");
    h.assert(h.consoleErrors.length === 0, `no page errors ${JSON.stringify(h.consoleErrors).slice(0, 300)}`);
    return;
  }

  // ------------------------------------------------------------------ not the owner
  if (h.persona !== "owner") {
    const hasConsole = await openAdminConsole(h);
    const tabs = hasConsole ? await adminTabs(h) : [];
    if (h.persona === "administrator") h.assert(hasConsole && tabs.length > 0, `administrator: Admin Console opens (${tabs.join(", ")})`);
    if (h.persona === "member") h.assert(!hasConsole, "member: no Admin Console at all");
    h.assert(!tabs.includes("About page"), `${h.persona}: no About page tab`);
    h.assert(!(await h.exists(".admin-about")), `${h.persona}: no editor anywhere on screen`);
    await closeMenus(h);
    h.backend.setTable("about_page", [SAVED_ROW]);
    const words = await inAppWords(h);
    h.assert(JSON.stringify(words) === JSON.stringify(SAVED_WORDS), `${h.persona}: in-app About shows the saved text`);
    h.assert(!(await h.evaluate(() => !!window.__pwned || !!document.querySelector(".about-root .about-text img, .about-root .about-text b"))), `${h.persona}: markup stays literal text`);
    await shot("about-saved");
    h.assert(!h.requests.some((r) => r.path.startsWith("/rest/v1/about_page_versions")), `${h.persona}: never asks for the version history`);
    h.assert(h.consoleErrors.length === 0, `no page errors ${JSON.stringify(h.consoleErrors).slice(0, 300)}`);
    return;
  }

  // ------------------------------------------------------------------ owner
  await h.addInitScript(CONFIRM_STUB);
  await h.reload();
  await h.sleep(1200);

  h.section("1. The tab and the built-in text");
  await openAdminConsole(h);
  const tabs = await adminTabs(h);
  h.assert(tabs.includes("About page") && tabs.includes("Features"), `owner: About page tab beside Features (${tabs.join(", ")})`);
  await h.click(aboutTab);
  await h.waitFor(".admin-about-bar");
  h.assert(!(await h.exists(".admin-note-warn")), "applied: no 'saving isn't switched on' warning");
  h.assert(/built-in text/.test(await h.text(".admin-about > .admin-note")), "says readers see the built-in text");
  const fields = await h.evaluate(() => ({
    quote: document.querySelector(".admin-about-form > label.admin-about-field textarea").value,
    sections: [...document.querySelectorAll("fieldset.admin-about-section")].map((f) => ({ heading: f.querySelector("input").value, body: f.querySelector("textarea").value })),
  }));
  h.assert(fields.quote === about.ABOUT_PULL_QUOTE, "quote field holds the built-in pull quote");
  h.assert(JSON.stringify(fields.sections) === JSON.stringify(about.ABOUT_SECTIONS.map((s) => ({ heading: s.heading ?? "", body: s.paragraphs.join("\n\n") }))), "section fields hold the built-in headings and paragraphs");
  h.assert(await h.evaluate(() => document.querySelector(".admin-about-save").disabled), "Save is off with no changes");
  h.assert(!(await overflowX(h)), "no sideways overflow");
  const fontPx = await h.evaluate(() => Math.min(...[...document.querySelectorAll(".admin-about-field textarea, .admin-about-field input")].map((e) => parseFloat(getComputedStyle(e).fontSize))));
  h.assert(fontPx >= 16, `fields are >= 16px so iOS does not zoom (${fontPx})`);
  await shot("edit-top");

  h.section("2. Edit and preview; markup stays text");
  await h.type(QUOTE, "My hope, edited.");
  await h.type(sectionSel(2, "input"), "On AI <script>window.__pwned=1</script>");
  h.assert((await h.text(".admin-about-state")) === "Unsaved changes", "shows Unsaved changes");
  h.assert(!(await h.evaluate(() => document.querySelector(".admin-about-save").disabled)), "Save is on");
  h.assert(await beforeUnloadBlocks(h), "leaving the page now asks first (beforeunload)");
  h.assert(await h.evaluate(() => !!localStorage.getItem("about-editor-draft-v1")), "draft kept on this device");
  await h.click({ css: ".admin-about-mode button", text: "Preview" });
  await h.waitFor(".admin-about-preview");
  const prev = await wording(h, ".admin-about-preview");
  h.assert(prev[0] === "My hope, edited." && prev.includes("On AI <script>window.__pwned=1</script>"), "preview shows the edits, heading as literal text");
  h.assert(!(await h.evaluate(() => !!window.__pwned || !!document.querySelector(".admin-about-preview script"))), "no script element, nothing ran");
  await shot("preview");

  h.section("3. The unsaved guard and the kept draft");
  await h.evaluate(() => { window.__confirmAnswer = false; window.__confirms = []; });
  await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Overview" });
  h.assert(await h.exists(".admin-about"), "tab switch refused when the owner says stay");
  h.assert((await h.evaluate(() => window.__confirms.length)) === 1 && /unsaved changes to the About page/.test(await h.evaluate(() => window.__confirms[0])), "asked: unsaved changes to the About page");
  await h.click({ css: ".auth-back-link", text: "Back" });
  h.assert(await h.exists(".admin-about"), "Back refused when the owner says stay");
  await h.evaluate(() => { window.__confirmAnswer = true; });
  await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Overview" });
  h.assert(!(await h.exists(".admin-about")), "tab switch goes ahead when the owner agrees");
  await h.click(aboutTab);
  await h.waitFor(".admin-about-restored");
  h.assert(/Brought back your unsaved changes/.test(await h.text(".admin-about-restored")), "reopening brings the draft back");
  h.assert((await h.evaluate((q) => document.querySelector(q).value, QUOTE)) === "My hope, edited.", "draft quote restored");

  h.section("4. Save");
  const rpcBefore = h.requests.filter((r) => r.path === "/rest/v1/rpc/save_about_page").length;
  await h.click(".admin-about-save");
  await h.waitFor({ css: ".admin-action-status", text: "Saved" });
  h.assert(h.requests.filter((r) => r.path === "/rest/v1/rpc/save_about_page").length === rpcBefore + 1, "one save_about_page call");
  h.assert((await h.text(".admin-about-state")) === "No unsaved changes", "clean after saving");
  h.assert(!(await beforeUnloadBlocks(h)), "leaving no longer asks");
  h.assert(!(await h.evaluate(() => localStorage.getItem("about-editor-draft-v1"))), "draft cleared");
  h.assert(/Readers see the text saved/.test(await h.text(".admin-about > .admin-note")), "says readers see the saved text");
  await closeMenus(h);
  let words = await inAppWords(h);
  h.assert(words[0] === "My hope, edited." && words.includes("On AI <script>window.__pwned=1</script>"), "in-app About shows the saved text");
  let st = await staticWords(h);
  h.assert(st.words[0] === "My hope, edited." && st.source === "saved" && !st.pwned, "/about (signed in) shows the saved text, literal");
  await h.evaluate(() => { location.assign("/"); });
  await h.sleep(2000);

  h.section("5. A save made elsewhere is caught");
  await openEditor(h);
  // Another tab saves: the row's timestamp moves on under this editor.
  const elsewhere = { id: 1, content: { quote: "Saved in another tab.", sections: [{ heading: null, paragraphs: ["Other."] }] }, updated_at: "2026-11-26T23:59:59.999999+00:00" };
  h.backend.setTable("about_page", [elsewhere]);
  await h.type(QUOTE, "Mine, typed here.");
  await h.click(".admin-about-save");
  await h.waitFor({ css: ".admin-confirm p", text: "Someone saved the About page" });
  h.assert((await h.text('[role="alert"]')).includes("saved somewhere else"), "conflict message");
  await shot("conflict");
  await h.click({ css: ".admin-confirm button", text: "Save mine over it" });
  await h.waitFor({ css: ".admin-action-status", text: "Saved" });
  h.assert(h.audit.some((a) => a.about_page === "save" && a.overwrite), "overwrite save went through with p_overwrite");

  h.section("6. Undo: the original text and an earlier version");
  await h.click(".admin-about-history summary");
  await h.waitFor(".admin-about-version:nth-child(2)");
  const versions = await h.evaluate(() => [...document.querySelectorAll(".admin-about-version-when")].map((e) => e.textContent));
  h.assert(versions[0] === "The original text" && versions.length === 3 && /live now/.test(versions[1]), `history lists the original + 2 saves, newest live (${versions.join(" | ")})`);
  await shot("history");
  await h.click({ css: ".admin-about-version button", text: "Load into editor" }, { index: 0 });
  await h.waitFor(".admin-about-preview");
  h.assert(JSON.stringify(await wording(h, ".admin-about-preview")) === JSON.stringify(BUILT_IN), "original text loaded as a preview");
  h.assert((await h.text(".admin-about-state")) === "Unsaved changes" && /Nothing changes for readers until you press Save/.test(await h.text(".admin-action-status")), "nothing live until Save");
  await h.click(".admin-about-save");
  await h.waitFor({ css: ".admin-action-status", text: "Saved" });
  await h.click({ css: ".admin-about-version button", text: "Load into editor" }, { index: 2 });
  await h.waitFor(".admin-about-preview");
  h.assert((await wording(h, ".admin-about-preview"))[0] === "Mine, typed here.", "an earlier version loads back too");
  await h.click({ css: ".admin-about-actions button", text: "Discard changes" });
  h.assert((await h.text(".admin-about-state")) === "No unsaved changes", "Discard returns to what readers see");

  h.section("7. Sections: add, move, remove, validation");
  await h.click({ css: ".admin-about-mode button", text: "Edit" });
  const n0 = await h.count("fieldset.admin-about-section");
  await h.click(".admin-about-add");
  h.assert((await h.count("fieldset.admin-about-section")) === n0 + 1, "added a section");
  const saves0 = h.requests.filter((r) => r.path === "/rest/v1/rpc/save_about_page").length;
  await h.click(".admin-about-save");
  h.assert(/Section 3 has no text/.test(await h.text('[role="alert"]')), "an empty section is explained, not sent");
  h.assert(h.requests.filter((r) => r.path === "/rest/v1/rpc/save_about_page").length === saves0, "no save call for invalid text");
  await h.type(sectionSel(3, "input"), "New last section");
  await h.type(sectionSel(3, "textarea"), "Line one.\nLine two.\n\n\nLine three.");
  await h.click(sectionSel(3, 'button[aria-label="Move section 3 up"]'));
  h.assert((await h.evaluate((s) => document.querySelector(s).value, sectionSel(2, "input"))) === "New last section", "moved up");
  await h.click({ css: ".admin-about-mode button", text: "Preview" });
  const pv = await wording(h, ".admin-about-preview");
  const at = pv.indexOf("New last section");
  h.assert(at > 0 && pv[at + 1] === "Line one." && pv[at + 2] === "Line two." && pv[at + 3] === "Line three.", "every line is a paragraph, blank lines dropped");
  await h.click({ css: ".admin-about-mode button", text: "Edit" });
  await h.click({ css: sectionSel(2, "button"), text: "Remove section" });
  h.assert((await h.count("fieldset.admin-about-section")) === n0, "removed it (after confirming)");
  h.assert((await h.text(".admin-about-state")) === "No unsaved changes", "back to clean");
  h.assert(!(await overflowX(h)), "no sideways overflow after all that");

  h.section("8. sql/051 not applied");
  await closeMenus(h);
  h.backend.setTableError("about_page", { status: 404, code: "PGRST205", message: "Could not find the table 'public.about_page' in the schema cache" });
  h.backend.setTableError("about_page_versions", { status: 404, code: "PGRST205", message: "Could not find the table" });
  h.backend.setRpc("save_about_page", () => { throw { status: 404, code: "PGRST202", message: "Could not find the function" }; });
  await h.evaluate(() => localStorage.removeItem("about-page-cache-v1"));
  await h.reload();
  await h.sleep(1500);
  words = await inAppWords(h);
  h.assert(JSON.stringify(words) === JSON.stringify(BUILT_IN), "reader: built-in text");
  await closeMenus(h);
  await h.evaluate(() => document.querySelector(".about-root .back-btn")?.click());
  await h.sleep(300);
  await openEditor(h);
  h.assert(/Saving isn't switched on yet/.test(await h.text(".admin-note-warn")), "editor says plainly that saving is not switched on yet");
  await h.type(QUOTE, "Edited while off.");
  h.assert(await h.evaluate(() => document.querySelector(".admin-about-save").disabled), "Save stays off");
  await h.click({ css: ".admin-about-mode button", text: "Preview" });
  h.assert((await wording(h, ".admin-about-preview"))[0] === "Edited while off.", "preview still works");
  await shot("not-applied");
  await h.click({ css: ".admin-about-actions button", text: "Discard changes" });
  h.assert(!(await beforeUnloadBlocks(h)), "clean again");
  h.assert(h.consoleErrors.filter((e) => !/Failed to load resource/.test(e)).length === 0, `no page errors ${JSON.stringify(h.consoleErrors).slice(0, 300)}`);
};
