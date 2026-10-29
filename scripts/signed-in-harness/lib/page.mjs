/** The object a check script receives. Thin, explicit, and honest about being the DOM, not a picture. */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { STORAGE_KEY } from "./personas.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Selector helpers injected into the page. `text=Foo` matches the smallest element whose text is exactly Foo. */
const PAGE_HELPERS = `(function(){
  if (window.__h) return;
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  window.__h = {
    find(sel, opts) {
      opts = opts || {};
      let list;
      if (typeof sel === 'string' && sel.startsWith('text=')) {
        const want = sel.slice(5).trim();
        list = [...document.querySelectorAll('button,a,[role=tab],[role=button],[role=menuitem],li,label,span,div,h1,h2,h3,h4,p,summary')]
          .filter((e) => (e.innerText || e.textContent || '').trim().replace(/\\s+/g,' ') === want)
          .filter((e) => ![...e.children].some((c) => (c.innerText || c.textContent || '').trim().replace(/\\s+/g,' ') === want));
      } else {
        list = [...document.querySelectorAll(sel)];
        if (opts.text) list = list.filter((e) => (e.innerText || e.textContent || '').includes(opts.text));
      }
      if (opts.visible !== false) list = list.filter(vis);
      return list;
    },
    vis,
  };
})()`;

export function createPage({ tab, backend, ledger, consoleErrors, outDir, meta }) {
  const checks = [];
  const evalRaw = async (expression) => {
    const r = await tab.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`page threw: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  const ensureHelpers = () => evalRaw(PAGE_HELPERS);
  const sel = (s) => (typeof s === "string" ? { sel: s } : { sel: s.css ?? `text=${s.text}`, text: s.css ? s.text : undefined });

  const page = {
    persona: meta.persona, viewport: meta.viewport, theme: meta.theme, previewOrigin: meta.previewOrigin,
    backend, ledger, consoleErrors,
    /** The fake backend's request log: [{method, path, how: fixture|stateful|gap|preflight}]. */
    get requests() { return backend.log.requests; },
    /** Writes the app made (insert/update/delete) and set_feature_stage audit entries. */
    get writes() { return backend.log.writes; },
    get audit() { return backend.log.audit; },

    /** evaluate(fn, ...args) or evaluate("expression"). Runs in the page; resolves to a JSON value. */
    async evaluate(fn, ...args) {
      const expr = typeof fn === "function" ? `(${fn.toString()})(...${JSON.stringify(args)})` : fn;
      return evalRaw(`(async()=>{ ${PAGE_HELPERS}; return (${expr.replace(/;\s*$/, "")}) })()`);
    },
    async goto(path = "/") {
      await tab.send("Page.navigate", { url: new URL(path, meta.previewOrigin).href });
      await sleep(300);
      try { await page.waitFor("#root > *", { timeout: 20000 }); }
      catch (e) {
        const d = await evalRaw("location.href + ' :: ' + document.documentElement.outerHTML.slice(0, 400)").catch((x) => String(x));
        throw new Error(`${e.message}\n  page: ${d}\n  blocked: ${ledger.blocked.slice(0, 5).join(" | ")}\n  errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
      }
    },
    async reload() { await tab.send("Page.reload"); await sleep(300); await page.waitFor("#root > *", { timeout: 20000 }); },
    sleep,
    /** Resolves when a matching, visible element exists. selector: CSS, "text=Exact text", or {css, text}. */
    async waitFor(selector, { timeout = 10000, visible = true } = {}) {
      const s = sel(selector);
      const t0 = Date.now();
      for (;;) {
        await ensureHelpers().catch(() => {});
        const n = await evalRaw(`window.__h ? window.__h.find(${JSON.stringify(s.sel)}, ${JSON.stringify({ text: s.text, visible })}).length : 0`).catch(() => 0);
        if (n > 0) return;
        if (Date.now() - t0 > timeout) throw new Error(`waitFor timed out after ${timeout}ms: ${JSON.stringify(selector)}`);
        await sleep(100);
      }
    },
    /** True if a visible match exists right now (no waiting). */
    async exists(selector, { visible = true } = {}) {
      const s = sel(selector);
      await ensureHelpers();
      return (await evalRaw(`window.__h.find(${JSON.stringify(s.sel)}, ${JSON.stringify({ text: s.text, visible })}).length`)) > 0;
    },
    async count(selector, { visible = true } = {}) {
      const s = sel(selector);
      await ensureHelpers();
      return evalRaw(`window.__h.find(${JSON.stringify(s.sel)}, ${JSON.stringify({ text: s.text, visible })}).length`);
    },
    /** A real mouse click (CDP Input events) at the centre of the first visible match. */
    async click(selector, { index = 0 } = {}) {
      const s = sel(selector);
      await page.waitFor(selector);
      const pt = await evalRaw(`(()=>{ const el = window.__h.find(${JSON.stringify(s.sel)}, ${JSON.stringify({ text: s.text })})[${index}]; if(!el) return null; el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}); const r = el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
      if (!pt) throw new Error(`click: nothing at ${JSON.stringify(selector)}`);
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
        await tab.send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
      await sleep(150);
    },
    /** Focus the first matching input and type into it (replaces existing text). */
    async type(selector, text) {
      const s = sel(selector);
      await page.waitFor(selector);
      await evalRaw(`(()=>{ const el = window.__h.find(${JSON.stringify(s.sel)}, ${JSON.stringify({ text: s.text })})[0]; el.focus(); if (el.select) el.select(); })()`);
      await tab.send("Input.insertText", { text });
      await sleep(100);
    },
    /** The visible text of the first match, trimmed. */
    async text(selector) {
      const s = sel(selector);
      await ensureHelpers();
      return evalRaw(`(()=>{ const el = window.__h.find(${JSON.stringify(s.sel)}, ${JSON.stringify({ text: s.text })})[0]; return el ? (el.innerText||'').trim() : null; })()`);
    },
    /** getBoundingClientRect of the first match, or null. Prefer this to a screenshot for layout facts. */
    async rect(selector) {
      const s = sel(selector);
      await ensureHelpers();
      return evalRaw(`(()=>{ const el = window.__h.find(${JSON.stringify(s.sel)}, ${JSON.stringify({ text: s.text })})[0]; if(!el) return null; const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; })()`);
    },
    /** Become another persona mid-run (same fake database, so a stage the owner flipped is still flipped),
     * by swapping the stored session and reloading - exactly what a different account signing in looks like. */
    async asPersona(name) {
      const session = backend.setPersona(name);
      await evalRaw(session
        ? `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(session))})`
        : `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
      page.persona = name;
      await page.reload();
      await sleep(1500);
    },
    /** Resize via CDP device-metrics emulation (never --window-size: headless Chrome floors that at 500px). Reloads. */
    async setViewport(width, height) {
      await tab.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
      page.viewport = `${width}x${height}`;
      await page.reload();
      await sleep(1000);
    },
    async setTheme(theme) {
      await evalRaw(`localStorage.setItem('app-theme', ${JSON.stringify(theme)}); document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
      page.theme = theme;
      await sleep(150);
    },
    /** PNG to a path. A hint, not evidence (AGENTS.md): assert on the DOM, then look at this. */
    async screenshot(path) {
      const out = resolve(outDir, path);
      mkdirSync(dirname(out), { recursive: true });
      const r = await tab.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(out, Buffer.from(r.data, "base64"));
      return out;
    },
    /** Record an assertion. Never throws; the run fails at the end if any failed. */
    assert(cond, message) {
      checks.push({ ok: !!cond, message });
      console.log(`  ${cond ? "PASS" : "FAIL"}  ${message}`);
      return !!cond;
    },
    section(name) { console.log(`\n${name}`); },
    checks,
  };
  return page;
}
