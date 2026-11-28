/**
 * Report a Problem screenshots (lib/screenCapture.ts, lib/reportScreenshots.ts, sql/055).
 *
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 \
 *        --script scripts/signed-in-harness/examples/report-screenshots.mjs
 *   (and --viewport 1280x800)
 *
 * Proves, against the fake backend with an in-memory Storage bucket (backend.setStorage):
 *   BEFORE sql/055 (report_screenshots_enabled() missing): the form shows no screenshot, sends the
 *     same insert as before (no screenshot_path key), and makes no Storage request at all.
 *   AFTER: tapping the header flag opens the form within a frame or two and the capture then appears
 *     as a thumbnail; "Include this screenshot" starts UNticked; the privacy line is there; the
 *     thumbnail opens a full-size viewer and Escape closes it; sending unticked uploads nothing;
 *     ticked uploads ONE jpeg to `<own uid>/<uuid>.jpg` and the report carries that path; a
 *     suggestion shows no screenshot and uploads nothing; an upload refusal is explained and files no
 *     report; a report that fails after the upload removes the uploaded file; deleting your own report
 *     removes its file; the account-menu row captures with the menu still open.
 *   Admin Console (administrator): a report with a screenshot shows the image from a signed link;
 *     an advisor is told one exists and gets no link.
 * Cannot prove: real Storage policies (sql/055 — RLS is not modelled by this fake), real iOS
 * rendering (see scripts/capture-fidelity/).
 */
import { readFileSync } from "node:fs";
import { PERSONAS } from "../lib/personas.mjs";

const IMG = readFileSync(new URL("../../../public/share-backgrounds/columbia-river-gorge-tiny.webp", import.meta.url));
const CATS = [
  ["bug", "Something is broken", 70],
  ["games", "Games", 50],
  ["idea", "Suggestion", 80],
  ["other", "Other", 90],
].map(([key, label, sort_order]) => ({ key, label, sort_order, is_active: true, description: null }));
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const selectValue = (h, sel, value) => h.evaluate((s, v) => {
  const el = document.querySelector(s);
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, v);
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, sel, value);

export default async (h) => {
  const me = PERSONAS[h.persona];
  const [W] = h.viewport.split("x").map(Number);
  const phone = W < 768;
  const json = (status, body) => ({ status, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  // ---- in-memory bucket -------------------------------------------------------------------------
  const objects = new Map();
  const slog = [];
  let failUpload = false;
  h.backend.setStorage((req) => {
    const u = new URL(req.url);
    const p = u.pathname.replace(/^\/storage\/v1/, "");
    // supabase-js sends a Blob as multipart; the part's own Content-Type is what Storage checks.
    const partType = /Content-Type:\s*([\w/+.-]+)/i.exec(req.body ?? "")?.[1] ?? null;
    slog.push({ method: req.method, path: p, type: partType ?? req.headers["content-type"] ?? null });
    if (req.method === "POST" && p.startsWith("/object/sign/")) {
      const key = p.slice("/object/sign/".length);
      return objects.has(key.replace(/^report-screenshots\//, "")) ? json(200, { signedURL: `/object/sign/${key}?token=fake` }) : json(400, { statusCode: "404", error: "not_found", message: "Object not found" });
    }
    if (req.method === "GET" && p.startsWith("/object/sign/")) return { status: 200, headers: { "content-type": "image/webp" }, body: IMG };
    if (req.method === "POST" && p.startsWith("/object/report-screenshots/")) {
      if (failUpload) return json(400, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
      const key = p.slice("/object/report-screenshots/".length);
      objects.set(key, req.headers["content-type"]);
      return json(200, { Key: `report-screenshots/${key}`, Id: "fake" });
    }
    if (req.method === "DELETE" && p === "/object/report-screenshots") {
      const prefixes = JSON.parse(req.body ?? "{}").prefixes ?? [];
      for (const k of prefixes) objects.delete(k);
      return json(200, prefixes.map((name) => ({ name })));
    }
    return json(404, { error: "not_found" });
  });
  const uploads = () => slog.filter((r) => r.method === "POST" && r.path.startsWith("/object/report-screenshots/"));
  const reportInserts = () => h.writes.filter((w) => w.table === "reports" && w.op === "insert").map((w) => ({ body: w.rows[0] }));

  h.backend.setTable("report_categories", CATS);
  h.backend.setTable("reports", []);

  const openFromFlag = async () => {
    const t = await h.evaluate(() => {
      window.__openT = performance.now();
      window.__sheetT = null;
      new MutationObserver((_m, o) => {
        if (document.querySelector(".report-sheet")) { window.__sheetT = performance.now(); o.disconnect(); }
      }).observe(document.body, { childList: true, subtree: true });
      return true;
    });
    await h.click(".header-report");
    await h.waitFor(".report-sheet select");
    return t;
  };
  const fill = async (title) => {
    await h.sleep(300);
    await selectValue(h, ".report-sheet select", "games");
    await h.type(".report-sheet input[type=text]", title);
    await h.type(".report-sheet textarea", "Filed by report-screenshots.");
  };
  const send = async (label = "Send report") => { await h.click({ css: ".report-sheet button", text: label }); await h.sleep(900); };
  const close = async () => {
    if (await h.exists({ css: ".report-sheet button", text: "Done" })) await h.click({ css: ".report-sheet button", text: "Done" });
    else if (await h.exists({ css: ".report-sheet button", text: "Cancel" })) await h.click({ css: ".report-sheet button", text: "Cancel" });
    await h.sleep(300);
  };
  const goGames = async () => {
    if (phone) await h.click({ css: ".mobile-tab", text: "Games" });
    else { await h.click('[aria-label^="Menu"]'); await h.click({ css: ".panel-menu-link", text: "Games" }); }
    await h.waitFor(".game-center-card");
    await h.sleep(500);
  };

  // =============================================================================== before sql/055
  h.section(`before sql/055 (${h.viewport})`);
  await goGames();
  await openFromFlag();
  await h.sleep(2500); // long enough for the capture to have finished, were it going to be shown
  h.assert(!(await h.exists(".report-shot")), "no screenshot section");
  h.assert(!/screenshot/i.test(await h.text(".report-sheet")), "no screenshot wording anywhere on the form");
  await h.click(".report-captured-toggle"); await h.sleep(200);
  h.assert(!/Screenshot/.test(await h.text(".report-captured-list")), "'What gets sent' has no Screenshot row");
  await fill("Before 055 report");
  await send();
  const ins0 = reportInserts().at(-1);
  h.assert(ins0 && !("screenshot_path" in (ins0.body ?? {})), `insert has no screenshot_path key (${ins0 ? Object.keys(ins0.body).length : "?"} keys)`);
  h.assert(slog.length === 0, `no Storage request at all (${slog.length})`);
  h.assert(h.requests.some((r) => r.path.includes("/rpc/report_screenshots_enabled")), "asked whether screenshots are on");
  await close();

  // ================================================================================ after sql/055
  h.section("after sql/055");
  h.backend.setRpc("report_screenshots_enabled", true);
  await h.reload(); await h.sleep(1500);
  await goGames();
  await openFromFlag();
  const delay = await h.evaluate(() => Math.round((window.__sheetT ?? NaN) - window.__openT));
  h.assert(Number.isFinite(delay) && delay < 120, `sheet in the page ${delay} ms after the tap started`);
  await h.waitFor(".report-shot-thumb img", { timeout: 8000 });
  const shot = await h.evaluate(() => {
    const img = document.querySelector(".report-shot-thumb img");
    const cb = document.querySelector(".report-shot-include input");
    return { w: img.naturalWidth, h: img.naturalHeight, checked: cb.checked, text: document.querySelector(".report-shot").innerText };
  });
  h.assert(shot.w > 0 && shot.h > 0, `thumbnail decoded (${shot.w}x${shot.h})`);
  h.assert(shot.checked === false, "Include this screenshot starts unticked");
  h.assert(/may show your notes, messages/.test(shot.text) && /only you and the site's administrators/.test(shot.text), "privacy line shown");
  const tone = await h.evaluate(async () => {
    // The capture is of Game Center, not of the report sheet: sample the thumbnail's top band.
    const img = document.querySelector(".report-shot-thumb img");
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const y = Math.round(img.naturalHeight * 0.13);
    const d = x.getImageData(0, y, img.naturalWidth, 4).data;
    let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4; return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
  h.assert(tone[0] > tone[2] + 25, `thumbnail shows Game Center's brown header band, not the form (rgb ${tone})`);
  await h.screenshot(`form-${h.viewport}.png`);
  await h.click(".report-shot-thumb"); await h.sleep(300);
  h.assert(await h.exists(".report-shot-viewer img"), "thumbnail opens the full-size viewer");
  await h.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); await h.sleep(200);
  h.assert(!(await h.exists(".report-shot-viewer")), "Escape closes the viewer");
  h.assert(await h.exists(".report-sheet"), "...and leaves the form open");
  if (!(await h.exists(".report-captured-list"))) { await h.click(".report-captured-toggle"); await h.sleep(200); }
  const sentList = await h.text(".report-captured-list").catch(() => "(list not open)");
  h.assert(/Screenshot\s*Not included/i.test(sentList), `'What gets sent' says Not included while unticked (${sentList.replace(/\s+/g, " ").slice(0, 400)})`);

  // unticked -> nothing uploaded
  await fill("Unticked report");
  await send();
  h.assert(uploads().length === 0, "unticked: nothing uploaded");
  h.assert(!("screenshot_path" in (reportInserts().at(-1)?.body ?? {})), "unticked: no screenshot_path");
  await close();

  // ticked -> one upload to own folder, path on the report
  await openFromFlag();
  await h.waitFor(".report-shot-include input", { timeout: 8000 });
  await h.click(".report-shot-include input");
  await fill("Ticked report");
  await send();
  const up = uploads();
  h.assert(up.length === 1, `ticked: exactly one upload (${up.length})`);
  const key = up[0]?.path.slice("/object/report-screenshots/".length) ?? "";
  h.assert(new RegExp(`^${me.id}/${UUID}\\.jpg$`).test(key), `uploaded to own folder as <uuid>.jpg (${key})`);
  h.assert(/image\/jpeg/.test(up[0]?.type ?? ""), `uploaded as image/jpeg (${up[0]?.type})`);
  const ins = reportInserts().at(-1);
  h.assert(ins?.body?.screenshot_path === key, "the report carries that path");
  h.assert(objects.has(key), "the file is in the bucket");

  // withdrawing your own report removes its file (My Reports -> Withdraw)
  // The fake has no column defaults or before-insert trigger: give the new rows what 025's trigger would.
  for (const r of h.backend.tables.reports) { r.status ??= "new"; r.created_at ??= new Date().toISOString(); r.updated_at ??= r.created_at; r.id ??= `00000000-0000-4000-8000-${String(Math.random()).slice(2, 14).padEnd(12, "0")}`; }
  await h.click({ css: ".report-sheet button", text: "See my reports" }); await h.sleep(900);
  await h.evaluate(() => { window.confirm = () => true; });
  const clicked = await h.evaluate(() => {
    const title = [...document.querySelectorAll(".report-sheet *")].find((e) => e.children.length === 0 && e.textContent.trim() === "Ticked report");
    let card = title; while (card && !card.querySelector?.(".report-btn-danger")) card = card.parentElement;
    const b = card?.querySelector(".report-btn-danger"); if (b) b.click(); return !!b;
  });
  await h.sleep(1000);
  h.assert(clicked && !objects.has(key), `withdrawing the report removed its screenshot (button ${clicked}, still stored ${objects.has(key)})`);
  await h.click({ css: ".report-sheet button", text: "← Back" }).catch(() => {});
  await h.sleep(300);

  // suggestion -> no screenshot, no upload
  await openFromFlag();
  await h.waitFor(".report-shot", { timeout: 8000 });
  await h.click('input[name="report-kind"][value="suggestion"]'); await h.sleep(300);
  h.assert(!(await h.exists(".report-shot")), "suggestion: no screenshot shown");
  await h.type(".report-sheet input[type=text]", "A suggestion");
  await h.type(".report-sheet textarea", "Idea text.");
  await send("Send suggestion");
  h.assert(uploads().length === 1, "suggestion: nothing uploaded");
  h.assert(!("screenshot_path" in (reportInserts().at(-1)?.body ?? {})), "suggestion: no screenshot_path");
  await close();

  // upload refused -> explained, no report filed
  failUpload = true;
  const before = reportInserts().length;
  await openFromFlag();
  await h.waitFor(".report-shot-include input", { timeout: 8000 });
  await h.click(".report-shot-include input");
  await fill("Refused upload");
  await send();
  const err = await h.text(".report-sheet [role=alert]").catch(() => "");
  h.assert(/couldn't be uploaded/.test(err) && /untick/.test(err), `upload refusal explained: "${err}"`);
  h.assert(reportInserts().length === before, "no report filed when the upload failed");
  failUpload = false;
  await close();

  // insert fails after upload -> the uploaded file is removed
  h.backend.setTableError("reports", { status: 400, code: "23514", message: "check constraint" });
  await openFromFlag();
  await h.waitFor(".report-shot-include input", { timeout: 8000 });
  await h.click(".report-shot-include input");
  await fill("Insert fails");
  const n0 = objects.size, d0 = slog.filter((r) => r.method === "DELETE").length, u0 = uploads().length;
  await send();
  await h.sleep(500);
  const d1 = slog.filter((r) => r.method === "DELETE").length - d0;
  h.assert(uploads().length === u0 + 1 && d1 === 1 && objects.size === n0, `orphan removed after a failed insert (uploads +${uploads().length - u0}, deletes +${d1}, objects ${n0} -> ${objects.size})`);
  h.backend.setTableError("reports", null);
  await close();

  // the account-menu row captures with the menu open
  await h.click('[aria-label="Settings and account"]'); await h.sleep(400);
  await h.click({ css: ".auth-menu-item", text: "Report a Problem" });
  await h.waitFor(".report-shot-thumb img", { timeout: 8000 });
  const menuTone = await h.evaluate(() => {
    const img = document.querySelector(".report-shot-thumb img");
    return { w: img.naturalWidth, h: img.naturalHeight };
  });
  h.assert(menuTone.w > 0, "account-menu row: screenshot offered");
  await h.screenshot(`menu-capture-${h.viewport}.png`);
  await close();

  // ===================================================================== Admin Console, two roles
  for (const persona of ["administrator", "advisor"]) {
    h.section(`Admin Console as ${persona}`);
    const rows = h.backend.tables.reports;
    const withShot = rows.find((r) => r.screenshot_path) ?? (() => {
      const k = `${me.id}/00000000-0000-4000-8000-0000000000aa.jpg`;
      objects.set(k, "image/jpeg");
      const r = { id: "00000000-0000-4000-8000-0000000000ab", reporter_id: me.id, category: "games", status: "new", title: "Seeded shot", body: "b", screenshot_path: k, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), app_context: {} };
      rows.push(r);
      return r;
    })();
    h.backend.setRpc("report_list", () => rows.map((r) => ({ ...r, category_label: "Games", reporter_name: "Someone", total_count: String(rows.length) })));
    h.backend.setRpc("report_detail", (a) => ({ report: rows.find((x) => x.id === a.p_report_id), reporter_name: "Someone", category_label: "Games", history: [] }));
    await h.asPersona(persona); await h.sleep(1500);
    await h.click('[aria-label="Settings and account"]'); await h.sleep(400);
    const hasConsole = await h.exists({ css: ".auth-menu-item", text: "Admin Console" });
    const hasReports = await h.exists({ css: ".auth-menu-item", text: "Reports" });
    if (hasConsole) {
      await h.click({ css: ".auth-menu-item", text: "Admin Console" });
      await h.waitFor('[role=tablist][aria-label="Admin sections"]');
      await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Problem reports" });
    } else if (hasReports) {
      await h.click({ css: ".auth-menu-item", text: "Reports" });
    }
    await h.sleep(1200);
    await h.click({ css: ".report-queue-title", text: withShot.title }).catch(() => h.click({ text: withShot.title }));
    await h.sleep(1200);
    const signs = () => slog.filter((r) => r.method === "POST" && r.path.startsWith("/object/sign/")).length;
    if (persona === "administrator") {
      await h.waitFor(".report-shot-admin img", { timeout: 6000 });
      const ok = await h.evaluate(() => { const i = document.querySelector(".report-shot-admin img"); return i.complete && i.naturalWidth > 0; });
      h.assert(ok, "administrator sees the screenshot (signed link, image decoded)");
      await h.screenshot(`admin-${h.viewport}.png`);
    } else {
      const before = signs();
      const t = await h.text(".report-detail").catch(() => "");
      h.assert(/Only administrators can open it/.test(t), "advisor is told a screenshot exists");
      h.assert(!(await h.exists(".report-shot-admin img")) && signs() === before, "advisor gets no image and no signed link");
    }
  }
};
