/**
 * Share sheet vs. the iOS safe area (--safe-top / --safe-bottom tokens in index.css).
 *
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 \
 *        --script scripts/signed-in-harness/examples/share-safe-area.mjs
 *
 * Headless Chrome reports env(safe-area-inset-*) as 0, so the insets are SIMULATED by overriding the
 * --safe-* tokens with !important (47px notch / 34px home indicator). This proves the layout consumes
 * the tokens; it does not prove real iOS Safari reports the same numbers. Needs a real device for that.
 * Env: SKINS=default,sticker,midnight
 */
import { readFileSync } from "node:fs";

const SKINS = (process.env.SKINS ?? "default,sticker,midnight").split(",");
const VERSES = JSON.parse(readFileSync(new URL("./mark8-web.json", import.meta.url), "utf8"));
const TOP = 47, BOTTOM = 34;
const stub = (verses) => `(() => {
  const real = window.fetch.bind(window);
  const verses = ${JSON.stringify(verses)};
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.startsWith("https://bible-api.com/")) return real(input, init);
    return Promise.resolve(new Response(JSON.stringify({ reference: "Mark 8", translation_name: "World English Bible", verses }), { status: 200, headers: { "content-type": "application/json" } }));
  };
})()`;
const inset = (on) => `(() => { const add = () => { if (!${on}) return; const s = document.createElement("style"); s.id = "sim-inset"; s.textContent = ":root{--safe-top:${TOP}px !important;--safe-bottom:${BOTTOM}px !important}"; document.head.appendChild(s); }; if (document.head) add(); else document.addEventListener("DOMContentLoaded", add); })()`;

export default async (h) => {
  await h.addInitScript(stub(VERSES));
  await h.addInitScript(inset(true));
  for (const skin of SKINS) {
    h.section(`skin ${skin}`);
    await h.evaluate((s) => { try { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); } catch {} }, skin);
    await h.reload(); await h.sleep(1500);
    if (await h.evaluate(() => window.innerWidth <= 768)) await h.click({ css: ".mobile-tab", text: "Bible" });
    await h.waitFor(".bible-verses p", { timeout: 8000 });
    await h.sleep(500);
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
    await h.waitFor(".verse-popup-share-btn", { timeout: 5000 });
    await h.click(".verse-popup-share-btn");
    await h.waitFor(".share-modal", { timeout: 5000 });
    await h.sleep(900);
    const m = await h.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, h: b.height }; };
      return {
        vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth,
        modal: r(".share-modal"), head: r(".share-modal-header h3"), close: r(".share-modal-close"), actions: r(".share-modal-actions"),
        submit: r(".share-modal-submit"), top: getComputedStyle(document.documentElement).getPropertyValue("--safe-top").trim(),
      };
    });
    h.assert(m.top === `${TOP}px`, `${skin}: simulated --safe-top applied (${m.top})`);
    h.assert(m.head.top >= TOP, `${skin}: "Share" title top ${m.head.top.toFixed(1)} >= ${TOP}`);
    h.assert(m.close.top >= TOP, `${skin}: close button top ${m.close.top.toFixed(1)} >= ${TOP}`);
    h.assert(m.close.w >= 44 && m.close.h >= 44, `${skin}: close target ${m.close.w}x${m.close.h} >= 44`);
    h.assert(m.actions.bottom <= m.vh - BOTTOM + 0.5, `${skin}: footer bottom ${m.actions.bottom.toFixed(1)} <= ${m.vh - BOTTOM}`);
    h.assert(m.submit.bottom <= m.vh - BOTTOM, `${skin}: Share button above home indicator`);
    h.assert(m.sw <= m.vw, `${skin}: no horizontal overflow (${m.sw} <= ${m.vw})`);
    await h.screenshot(`share-${skin}.png`);
    // closing works
    await h.click(".share-modal-close");
    await h.sleep(300);
    h.assert(!(await h.exists(".share-modal")), `${skin}: close button closes the sheet`);
  }
};
