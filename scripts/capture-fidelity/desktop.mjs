/**
 * Report-a-Problem screenshot fidelity, desktop Chrome. A signed-in-harness script:
 *
 *   VITE_CAPTURE_PROBE=1 node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 \
 *     --script scripts/capture-fidelity/desktop.mjs --out <dir>
 *
 * For each case: put the app in that state, take the TRUE screenshot (CDP Page.captureScreenshot),
 * then trigger the capture the way a reader would (a real click on the flag or the menu row, caught
 * by lib/screenCaptureProbe.ts before React sees it) and save what lib/screenCapture.ts produced.
 * Writes <case>-true.png, <case>-capture.jpg and <case>-side.png (true | capture | difference) plus
 * results.json with timings and a mean per-pixel difference.
 *
 * The harness network is closed, so map TILES are blocked here: the map case shows MapLibre's
 * background and markers only. The iOS Simulator run (serve.mjs) has real tiles.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

const VERSES = JSON.parse(readFileSync(new URL("../signed-in-harness/examples/mark8-web.json", import.meta.url), "utf8"));
const stub = (verses) => `(() => {
  const real = window.fetch.bind(window);
  const verses = ${JSON.stringify(verses)};
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.startsWith("https://bible-api.com/")) return real(input, init);
    return Promise.resolve(new Response(JSON.stringify({ reference: "Mark 8", translation_name: "World English Bible", verses }), { status: 200, headers: { "content-type": "application/json" } }));
  };
})()`;

const MENU_BUTTON = '[aria-label^="Menu"]';
const ONLY = process.env.CASES?.split(",");

export default async function (h) {
  const [W, H] = h.viewport.split("x").map(Number);
  const phone = W < 768;
  const results = [];
  let outDir = null;
  await h.addInitScript(stub(VERSES));
  await h.reload();
  await h.sleep(2000);

  const nav = async (name) => {
    if (phone && (await h.exists({ css: ".mobile-tab", text: name }))) return h.click({ css: ".mobile-tab", text: name });
    await h.click(phone ? ".mobile-nav-menu-button, .hamburger-button, " + MENU_BUTTON : MENU_BUTTON);
    await h.sleep(300);
    await h.click({ css: ".panel-menu-link, .mobile-nav-menu-item", text: name });
  };
  const home = async () => {
    await h.evaluate(() => { localStorage.removeItem("daily-name-v1"); });
    await h.goto("/");
    await h.sleep(2500);
  };

  /** True screenshot, then the capture by a real click on `trigger` (or the manual hook). */
  async function shoot(name, trigger) {
    if (ONLY && !ONLY.includes(name)) return;
    h.section(`case: ${name}`);
    await h.sleep(600);
    const truePath = await h.screenshot(`${name}-true.png`);
    outDir = dirname(truePath);
    await h.evaluate(() => { window.__cbLast = undefined; });
    if (trigger) await h.click(trigger);
    else await h.evaluate(() => { window.__cbLast = window.__cbCapture("manual"); });
    const r = await h.evaluate(async () => {
      for (let i = 0; i < 100 && !window.__cbLast; i++) await new Promise((r) => setTimeout(r, 50));
      return window.__cbLast ? await window.__cbLast : { ok: false, error: "the tap did not start a capture" };
    });
    const rec = { name, trigger: trigger ? "tap" : "manual", ok: r.ok, error: r.error ?? null, syncMs: r.syncMs, totalMs: r.totalMs, phases: r.phases, notes: r.notes, bytes: r.size };
    if (r.ok) {
      writeFileSync(join(outDir, `${name}-capture.jpg`), Buffer.from(r.dataUrl.split(",")[1], "base64"));
      const trueUrl = "data:image/png;base64," + readFileSync(truePath).toString("base64");
      const cmp = await h.evaluate(async (a, b, label) => {
        const load = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
        const [A, B] = await Promise.all([load(a), load(b)]);
        const w = A.width, hh = A.height;
        const ca = new OffscreenCanvas(w, hh), cb = new OffscreenCanvas(w, hh);
        ca.getContext("2d").drawImage(A, 0, 0, w, hh); cb.getContext("2d").drawImage(B, 0, 0, w, hh);
        const da = ca.getContext("2d").getImageData(0, 0, w, hh).data, db = cb.getContext("2d").getImageData(0, 0, w, hh).data;
        const diff = new OffscreenCanvas(w, hh); const dc = diff.getContext("2d"); const dd = dc.createImageData(w, hh);
        let sum = 0, big = 0;
        for (let i = 0; i < da.length; i += 4) {
          const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
          sum += d; if (d > 40) big++;
          dd.data[i] = 255; dd.data[i + 1] = d > 40 ? 0 : 255 - d * 3; dd.data[i + 2] = d > 40 ? 0 : 255 - d * 3; dd.data[i + 3] = 255;
        }
        dc.putImageData(dd, 0, 0);
        const pad = 16, top = 28;
        const side = new OffscreenCanvas(w * 3 + pad * 4, hh + top + pad);
        const s = side.getContext("2d");
        s.fillStyle = "#222"; s.fillRect(0, 0, side.width, side.height);
        s.fillStyle = "#fff"; s.font = "16px sans-serif";
        [["TRUE screenshot", A], ["CAPTURE (in-page render)", B], ["DIFFERENCE (red = >40/255)", diff]].forEach(([t, img], k) => {
          s.fillText(`${label} — ${t}`, pad + k * (w + pad), 20);
          s.drawImage(img, pad + k * (w + pad), top, w, hh);
        });
        const blob = await side.convertToBlob({ type: "image/png" });
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return { meanDiff: +(sum / (w * hh)).toFixed(2), pctBig: +((100 * big) / (w * hh)).toFixed(2), size: [A.width, A.height, B.width, B.height], side: btoa(bin) };
      }, trueUrl, r.dataUrl, `${name} ${W}x${H}`);
      writeFileSync(join(outDir, `${name}-side.png`), Buffer.from(cmp.side, "base64"));
      Object.assign(rec, { meanDiff: cmp.meanDiff, pctPixelsOff: cmp.pctBig, sizes: cmp.size });
    }
    console.log("   ", JSON.stringify({ ...rec, phases: undefined }));
    h.assert(r.ok, `${name}: capture produced an image (${r.error ?? `${r.syncMs}ms sync, ${r.totalMs}ms total`})`);
    results.push(rec);
    // Close the report sheet if the tap opened it.
    if (await h.exists(".report-portal")) { await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); await h.sleep(200); }
  }

  const FLAG = ".header-report";

  // 1. Map (the default screen).
  await home();
  if (phone) await nav("Map").catch(() => {});
  await h.sleep(1500);
  await shoot("map", (await h.exists(FLAG)) ? FLAG : null);

  // 2. An open menu: the account menu, then its own "Report a Problem" row.
  await home();
  await h.click('[aria-label="Settings and account"]');
  await h.waitFor({ css: "button", text: "Report a Problem" });
  await shoot("open-menu", { css: "button", text: "Report a Problem" });

  // 3. Game Center.
  await home();
  await nav("Games");
  await h.waitFor(".game-center-card");
  await shoot("game-center", FLAG);

  // 4. Daily Name board with a partly typed guess.
  await home();
  await nav("Games");
  await h.waitFor(".game-center-card");
  await h.click({ css: ".game-center-card", text: "Daily Name" });
  await h.click({ css: ".game-entry-card", text: "Play solo" });
  await h.click({ css: ".game-entry-card", text: "Today's name" });
  await h.sleep(500);
  if (await h.exists(".how-close")) await h.click(".how-close");
  await h.waitFor(".dn-board");
  for (const k of "ada") await h.evaluate((x) => window.dispatchEvent(new KeyboardEvent("keydown", { key: x, bubbles: true })), k);
  await shoot("daily-name", FLAG);

  // 5. Timeline.
  await home();
  if (!(await h.exists(".timeline-mode"))) {
    const direct = { css: ".mobile-tab-bar button, .desktop-footer button, footer button", text: "Timeline" };
    if (await h.exists(direct)) await h.click(direct); else await nav("Timeline");
  }
  await h.waitFor(".tl-life-bar", { timeout: 10000 });
  await h.sleep(1200);
  await shoot("timeline", (await h.exists(FLAG)) ? FLAG : null);

  // 6. Share-image background picker (select verses, Share).
  await home();
  if (phone) await h.click({ css: ".mobile-tab", text: "Bible" });
  await h.waitFor(".bible-verses p", { timeout: 10000 });
  await h.sleep(600);
  await h.evaluate(() => {
    const ps = document.querySelectorAll(".bible-verses p");
    const first = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, last = null; while ((n = w.nextNode())) { if (n.textContent.trim().length > 3) return n; last = n; } return last; };
    const lastT = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, l = null; while ((n = w.nextNode())) l = n; return l; };
    const a = first(ps[0].lastElementChild ?? ps[0]), b = lastT(ps[2]);
    const r = document.createRange(); r.setStart(a, 0); r.setEnd(b, b.textContent.length);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    ps[2].dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await h.sleep(500);
  await h.click(".verse-popup-share-btn");
  await h.waitFor(".share-bg-grid", { timeout: 6000 });
  await h.sleep(2000);
  await shoot("share-picker", null);

  // 7. A text field focused with text in it (desktop has no on-screen keyboard; this checks the
  //    typed value and the scrolled state survive).
  await home();
  const search = (await h.exists(".header-search-group input")) ? ".header-search-group input" : "input[type=search], input[type=text]";
  await h.type(search, "Jerusalem");
  await h.sleep(800);
  await shoot("text-field", (await h.exists(FLAG)) ? FLAG : null);

  if (outDir) writeFileSync(join(outDir, "results.json"), JSON.stringify(results, null, 1));
  console.log("\nresults:", outDir && join(outDir, "results.json"));
}
