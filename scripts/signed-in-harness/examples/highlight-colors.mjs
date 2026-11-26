/**
 * Verse-action sheet: one-line action row, yellow + rainbow, the Colors sheet, custom highlight colours
 * (stored "#rrggbb@NN" in highlights.color), legacy named highlights still rendering/removable, and the
 * inline "Add a note..." box; the Grid/Spectrum/Sliders tabs (real CDP touch), saved swatches, hostile
 * storage, a stubbed EyeDropper, and fit + contrast in every skin and at large/small text. Run at 375x667 and 1280x800, light and dark:
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 375x667 --script scripts/signed-in-harness/examples/highlight-colors.mjs
 * Screenshots are hints; every assertion reads the DOM or the fake backend's write log.
 */
import { readFileSync } from "node:fs";
import { MENU_BUTTON, openArticle } from "../lib/app.mjs";

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

/* --- Spectrum / Sliders / saved swatches / eyedropper ------------------------------------------ */

const rectOf = (h, sel) => h.evaluate((sel) => { const el = document.querySelector(sel); el.scrollIntoView({ block: "nearest", behavior: "instant" }); const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
const tapEl = async (h, sel) => { const r = await rectOf(h, sel); await h.touch([{ x: r.x + r.w / 2, y: r.y + r.h / 2 }]); };
const pickedText = (h) => h.evaluate(() => document.querySelector(".hl-colors-preview-hex").textContent);
const channels = (h) => h.evaluate(() => [...document.querySelectorAll(".hl-colors-channel input")].map((i) => Number(i.value)));
const hexField = (h) => h.evaluate(() => document.querySelector(".hl-colors-hex input").value);

async function openColors(h, verse = 9) {
  if (await h.exists(".hl-colors-dialog")) return;
  if (!(await h.exists(".verse-sheet"))) await selectVerse(h, verse, 0, 30);
  await h.click(".verse-popup-color-wheel");
  await h.waitFor(".hl-colors-dialog");
  await h.sleep(300);
}
const closeColors = async (h) => { await h.click(".hl-colors-close"); await h.sleep(250); };

async function toReader(h) {
  await h.reload(); await h.sleep(1500);
  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Bible" });
  await h.waitFor(".bible-verses p"); await h.sleep(800);
}

/** Layout facts for the open sheet: nothing sideways, Highlight inside the visible sheet, tabs uncut. */
const sheetLayout = (h) => h.evaluate(() => {
  const d = document.querySelector(".hl-colors-dialog");
  d.scrollTop = 0;
  const box = d.getBoundingClientRect();
  const wide = [...d.querySelectorAll("*")].filter((e) => { if (e.matches(".hl-colors-spectrum-marker")) return false; const r = e.getBoundingClientRect(); return r.width && (r.left < box.left - 0.5 || r.right > box.right + 0.5); }).map((e) => e.className || e.tagName);
  const cut = [...d.querySelectorAll('[role="tab"]')].filter((t) => t.scrollWidth > t.clientWidth).map((t) => t.textContent);
  const go = d.querySelector(".hl-colors-confirm").getBoundingClientRect();
  return { vw: innerWidth, sideways: d.scrollWidth - d.clientWidth, wide: wide.slice(0, 4), cut, goVisible: go.top >= box.top && go.bottom <= Math.min(box.bottom, innerHeight) + 0.5, boxTop: Math.round(box.top), boxH: Math.round(box.height), scrollH: d.scrollHeight };
});

/** Text contrast inside the sheet, computed from the live styles. */
const sheetContrast = (h) => h.evaluate(() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (a, b) => [0, 1, 2].map((i) => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) stack.push(c); if (c[3] >= 1) break; } return stack.reverse().reduce((acc, c) => over(c, acc), [255, 255, 255, 1]); };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const out = {};
  for (const sel of [".hl-colors-head h2", ".hl-colors-close", '.hl-colors-tabs [aria-selected="true"]', '.hl-colors-tabs [aria-selected="false"]', ".hl-colors-channel label", ".hl-colors-channel output", ".hl-colors-hex label", ".hl-colors-hex input", ".hl-colors-saved-hint", ".hl-colors-opacity-value"]) {
    const el = document.querySelector(sel); if (!el) continue;
    const bg = bgOf(el), fg = over(rgba(getComputedStyle(el).color), bg);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    out[sel] = Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
  }
  return out;
});

async function pickerTabs(h) {
  const tag = `${h.viewport}-${h.theme}`;
  h.section("Colors sheet tabs; eyedropper hidden when the browser has none");
  await h.evaluate(() => { localStorage.removeItem("highlight-saved-colors"); delete window.EyeDropper; });
  await openColors(h);
  const tabs = await h.evaluate(() => [...document.querySelectorAll('.hl-colors-tabs [role="tab"]')].map((t) => [t.textContent, t.getAttribute("aria-selected")]));
  h.assert(JSON.stringify(tabs) === JSON.stringify([["Grid", "true"], ["Spectrum", "false"], ["Sliders", "false"]]), "tabs Grid / Spectrum / Sliders, Grid selected: " + JSON.stringify(tabs));
  h.assert((await h.count(".hl-colors-eyedropper")) === 0, "no window.EyeDropper (iPhone Safari): no eyedropper button");
  const gridH = (await rectOf(h, ".hl-colors-panel")).h;

  h.section("Spectrum by touch");
  await tapEl(h, '[data-tab="spectrum"]');
  h.assert((await h.count(".hl-colors-spectrum")) === 1 && (await h.count(".hl-colors-grid")) === 0, "Spectrum tab opens by tap");
  const sp = await rectOf(h, ".hl-colors-spectrum");
  h.assert(Math.abs((await rectOf(h, ".hl-colors-panel")).h - gridH) <= 3, `panel keeps the Grid's height (${gridH} vs ${sp.h})`);
  h.assert((await h.count(".hl-colors-spectrum-marker")) === 0 && (await h.evaluate(() => document.querySelector(".hl-colors-confirm").disabled)), "nothing picked yet: no marker, Highlight disabled");
  await h.touch([{ x: sp.x + sp.w * 0.5, y: sp.y + sp.h * 0.5 }]);
  const mid = await pickedText(h);
  h.assert(/^#0[0-9A-F]F[0-9A-F]F[0-9A-F]/.test(mid), "tap in the middle picks the pure hue at 180 degrees (cyan): " + mid);
  const scrollBefore = await h.evaluate(() => document.querySelector(".hl-colors-dialog").scrollTop);
  const sp1 = await rectOf(h, ".hl-colors-spectrum");
  h.assert(Math.abs(sp1.y - sp.y) < 0.5 && Math.abs(sp1.h - sp.h) < 0.5, `the first pick does not move the Spectrum (${sp.y} -> ${sp1.y})`);
  const path = Array.from({ length: 9 }, (_, i) => ({ x: sp.x + sp.w * (0.5 + i * 0.02), y: sp.y + sp.h * (0.5 - i * 0.03) }));
  await h.touch(path);
  const dragged = await pickedText(h);
  const marker = await rectOf(h, ".hl-colors-spectrum-marker");
  const end = path[path.length - 1];
  h.assert(dragged !== mid && Math.hypot(marker.x + marker.w / 2 - end.x, marker.y + marker.h / 2 - end.y) < 3, `drag follows the finger: ${mid} -> ${dragged}, marker within 3px of it`);
  h.assert((await h.evaluate(() => document.querySelector(".hl-colors-dialog").scrollTop)) === scrollBefore, "dragging on the Spectrum does not scroll the sheet");
  await h.touch([{ x: sp.x + sp.w * 0.5, y: sp.y + sp.h * 0.5 }, { x: sp.x + sp.w + 60, y: sp.y - 60 }]);
  h.assert(/^#FFFFFF/.test(await pickedText(h)), "a drag off the corner clamps (top edge = white): " + (await pickedText(h)));
  await h.touch([{ x: sp.x + 0.2, y: sp.y + sp.h * 0.5 }]);
  const red = await pickedText(h);
  h.assert(/^#F[A-F]0[0-9A-F]0[0-9A-F]/.test(red), "left edge middle is red: " + red);
  await h.evaluate(() => document.querySelector(".hl-colors-spectrum").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
  await h.sleep(150);
  h.assert((await pickedText(h)) !== red, "arrow keys move it too: " + (await pickedText(h)));
  const sp2 = await rectOf(h, ".hl-colors-spectrum");
  h.assert(Math.abs(sp2.y - sp.y) < 0.5, `the Spectrum never moved across picks (${sp.y} -> ${sp2.y})`);
  h.assert((await h.count(".verse-sheet")) === 1 && (await h.count(".hl-colors-dialog")) === 1, "both sheets still open after the drags");
  await h.screenshot(`spectrum-${tag}.png`);
  const l2 = await sheetLayout(h);
  h.assert(l2.sideways <= 0 && !l2.wide.length && !l2.cut.length && l2.goVisible, "Spectrum layout fits: " + JSON.stringify(l2));

  h.section("Sliders: RGB by touch, hex field");
  await tapEl(h, '[data-tab="sliders"]');
  h.assert((await h.count(".hl-colors-channel")) === 3 && (await h.count(".hl-colors-hex input")) === 1, "three channel sliders and a hex field");
  await h.type(".hl-colors-hex input", "#ff8800");
  await h.sleep(150);
  h.assert(JSON.stringify(await channels(h)) === "[255,136,0]" && /^#FF8800/.test(await pickedText(h)), "typing #ff8800 moves the sliders to 255/136/0: " + JSON.stringify(await channels(h)));
  const blue = await rectOf(h, '.hl-colors-channel:nth-child(3) input');
  await h.touch([{ x: blue.x + 15, y: blue.y + blue.h / 2 }, { x: blue.x + blue.w * 0.4, y: blue.y + blue.h / 2 }, { x: blue.x + blue.w * 0.8, y: blue.y + blue.h / 2 }]);
  const c = await channels(h);
  h.assert(c[0] === 255 && c[1] === 136 && c[2] > 150 && c[2] < 240, "touch drag on Blue changes only blue: " + JSON.stringify(c));
  const asHex = c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  h.assert((await hexField(h)) === asHex && (await pickedText(h)).startsWith("#" + asHex), `hex field and preview follow the slider (${asHex})`);
  await h.type(".hl-colors-hex input", "zz12");
  await h.sleep(150);
  h.assert((await h.count(".hl-colors-hex-error")) === 1 && (await pickedText(h)).startsWith("#" + asHex), "invalid hex says so and changes nothing");
  await h.evaluate(() => document.querySelector(".hl-colors-hex input").blur()); await h.sleep(150);
  h.assert((await hexField(h)) === asHex && (await h.count(".hl-colors-hex-error")) === 0, "leaving the field restores the real value");
  await h.type(".hl-colors-hex input", "0f0");
  await h.evaluate(() => document.querySelector(".hl-colors-hex input").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
  await h.sleep(150);
  h.assert((await hexField(h)) === "00FF00", "3-digit shorthand + Enter expands: " + (await hexField(h)));
  h.assert((await h.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".hl-colors-hex input")).fontSize))) >= 16, "hex field is >= 16px (no iOS focus zoom)");
  await h.evaluate(() => document.querySelector(".hl-colors-hex input").blur());
  await h.screenshot(`sliders-${tag}.png`);
  const l3 = await sheetLayout(h);
  h.assert(l3.sideways <= 0 && !l3.wide.length && !l3.cut.length && l3.goVisible, "Sliders layout fits: " + JSON.stringify(l3));

  h.section("saved swatches (localStorage, per device)");
  await tapEl(h, ".hl-colors-save");
  await h.type(".hl-colors-hex input", "8844cc");
  await h.evaluate(() => { document.querySelector(".hl-colors-hex input").blur(); const i = document.querySelector(".hl-colors-opacity input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "35"); i.dispatchEvent(new Event("input", { bubbles: true })); });
  await h.sleep(150);
  await tapEl(h, ".hl-colors-save");
  const stored = await h.evaluate(() => localStorage.getItem("highlight-saved-colors"));
  h.assert(stored === '["#00ff00@100","#8844cc@35"]', "two swatches stored with their opacity: " + stored);
  h.assert((await h.count(".hl-colors-saved-swatch")) === 2, "both swatches drawn");
  await tapEl(h, ".hl-colors-saved-swatch:nth-of-type(1)");
  h.assert((await pickedText(h)) === "#00FF00 · 100%", "tapping a swatch restores colour and opacity: " + (await pickedText(h)));
  h.assert((await h.evaluate(() => document.querySelector(".hl-colors-save").getAttribute("aria-label"))) === "Remove this saved color", "on a saved colour the + becomes remove");
  await h.screenshot(`saved-${tag}.png`);
  await toReader(h);
  await openColors(h);
  h.assert((await h.count(".hl-colors-saved-swatch")) === 2, "swatches survive a reload");
  await tapEl(h, ".hl-colors-saved-swatch:nth-of-type(1)");
  await tapEl(h, ".hl-colors-save");
  h.assert((await h.evaluate(() => localStorage.getItem("highlight-saved-colors"))) === '["#8844cc@35"]', "remove takes just that one out");
  await tapEl(h, ".hl-colors-saved-swatch");
  const nBefore = h.backend.tables.highlights.length;
  await tapEl(h, ".hl-colors-confirm"); await h.sleep(600);
  const row = h.backend.tables.highlights.find((r) => r.start_verse === 9);
  h.assert(h.backend.tables.highlights.length === nBefore + 1 && row?.color === "#8844cc@35", "saved swatch -> Highlight writes #8844cc@35: " + row?.color);

  h.section("hostile / broken storage");
  await h.evaluate(() => localStorage.setItem("highlight-saved-colors", JSON.stringify(["red;background:url(//evil)", "#123456@60", 5, { a: 1 }, "#123456@60", "#ABCDEF@50", "#abcdef@0"])));
  await openColors(h, 10);
  h.assert((await h.count(".hl-colors-saved-swatch")) === 1, "only the one strictly valid, de-duplicated entry is drawn");
  await closeColors(h);
  await h.evaluate(() => localStorage.setItem("highlight-saved-colors", "{not json"));
  await openColors(h, 10);
  h.assert((await h.count(".hl-colors-saved-swatch")) === 0 && (await h.count(".hl-colors-saved-hint")) === 1, "unparseable storage reads as empty");
  await closeColors(h);
  await h.evaluate(() => { for (const m of ["getItem", "setItem"]) { const real = Storage.prototype[m]; window["__real_" + m] = real; Storage.prototype[m] = function (k, ...a) { if (k === "highlight-saved-colors") throw new DOMException("blocked", "SecurityError"); return real.call(this, k, ...a); }; } });
  await openColors(h, 10);
  await tapEl(h, ".hl-colors-swatch:nth-child(30)");
  await tapEl(h, ".hl-colors-save");
  h.assert((await h.count(".hl-colors-saved-swatch")) === 1 && (await h.count(".hl-colors-dialog")) === 1, "storage that throws: sheet works, swatch kept in memory");
  await closeColors(h);
  await h.evaluate(() => { for (const m of ["getItem", "setItem"]) Storage.prototype[m] = window["__real_" + m]; localStorage.removeItem("highlight-saved-colors"); });

  h.section("eyedropper where window.EyeDropper exists (stubbed)");
  await h.evaluate(() => { window.__dim = null; window.EyeDropper = class { open() { return new Promise((res) => setTimeout(() => { window.__dim = getComputedStyle(document.querySelector(".hl-colors-backdrop")).backgroundColor; res({ sRGBHex: "#12AB34" }); }, 80)); } }; });
  await openColors(h, 10);
  h.assert((await h.count(".hl-colors-eyedropper")) === 1, "eyedropper button shown");
  await h.click(".hl-colors-eyedropper"); await h.sleep(300);
  h.assert((await pickedText(h)).startsWith("#12AB34"), "picked colour applied: " + (await pickedText(h)));
  h.assert((await h.evaluate(() => window.__dim)) === "rgba(0, 0, 0, 0)", "backdrop not dimmed while picking");
  h.assert((await h.evaluate(() => getComputedStyle(document.querySelector(".hl-colors-backdrop")).backgroundColor)) !== "rgba(0, 0, 0, 0)", "dimming back afterwards");
  await h.evaluate(() => { window.EyeDropper = class { open() { return Promise.reject(new DOMException("cancel", "AbortError")); } }; });
  await h.click(".hl-colors-eyedropper"); await h.sleep(250);
  h.assert((await pickedText(h)).startsWith("#12AB34") && (await h.count(".hl-colors-dialog")) === 1, "cancelled pick changes nothing");
  await h.screenshot(`eyedropper-${tag}.png`);

  h.section("tab keyboard and focus trap");
  await h.evaluate(() => document.querySelector('[data-tab="grid"]').focus());
  await h.evaluate(() => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })));
  await h.sleep(150);
  h.assert((await h.evaluate(() => document.activeElement?.dataset?.tab)) === "spectrum" && (await h.count(".hl-colors-spectrum")) === 1, "ArrowRight moves to Spectrum");
  await closeColors(h);
}

/** Every skin plus default light/dark, every tab: fit and contrast. SKINS=a,b to narrow. */
async function pickerSkins(h) {
  const all = ["default", "default-dark", "sticker", "clarity", "midnight", "sage", "skyreader", "trailhead", "highlighter"];
  const skins = process.env.SKINS ? process.env.SKINS.split(",") : all;
  for (const [skin, scale] of [...skins.map((s) => [s, 1]), ["skyreader", 1.8], ["trailhead", 0.8], ["default", 1.8]]) {
    h.section(`Colors sheet: ${skin} at text ${scale}`);
    await h.evaluate((skin, scale) => {
      const id = skin.startsWith("default") ? null : skin;
      if (id) localStorage.setItem("app-skin", id); else localStorage.removeItem("app-skin");
      localStorage.setItem("app-theme", skin === "default-dark" ? "dark" : "light");
      localStorage.setItem("app-text-scale", String(scale));
      localStorage.setItem("highlight-saved-colors", '["#ff8800@60"]');
    }, skin, scale);
    await toReader(h);
    const on = await h.evaluate(() => [document.documentElement.dataset.skin ?? "default", document.documentElement.dataset.theme]);
    await openColors(h, 11);
    for (const t of ["grid", "spectrum", "sliders"]) {
      await h.evaluate((t) => document.querySelector(`[data-tab="${t}"]`).click(), t);
      await h.sleep(200);
      if (t === "grid") await h.evaluate(() => document.querySelectorAll(".hl-colors-swatch")[60].click());
      await h.sleep(100);
      const l = await sheetLayout(h);
      h.assert(l.sideways <= 0 && !l.wide.length && !l.cut.length && l.goVisible, `${on} ${t}: fits, tabs uncut, Highlight visible ${JSON.stringify(l)}`);
      const cr = await sheetContrast(h);
      const low = Object.entries(cr).filter(([, v]) => v < 4.5);
      h.assert(!low.length, `${on} ${t}: text contrast >= 4.5 (lowest ${Math.min(...Object.values(cr))})${low.length ? " " + JSON.stringify(low) : ""}`);
      await h.screenshot(`skin-${skin}-${scale}-${t}-${h.viewport}.png`);
    }
    await closeColors(h);
  }
  await h.evaluate(() => { for (const k of ["app-skin", "app-text-scale", "highlight-saved-colors"]) localStorage.removeItem(k); });
}

/* --- Linked-word highlights in a real article (Sky Reader / Trailhead chips) ------------------- */

const ARTICLE = "Pharisees and Sadducees Compared";

/** Geometry of every linked word against the INK of the other lines in its paragraph: a chip that
 * paints into the glyphs, descenders or underline of the line above or below is a collision. */
const measureChips = (h) => h.evaluate(() => {
  const cx = document.createElement("canvas").getContext("2d");
  const metrics = (el) => {
    const s = getComputedStyle(el);
    cx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const m = cx.measureText("bdfhklÉ(gjpqy)");
    return { fontAsc: m.fontBoundingBoxAscent, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, size: parseFloat(s.fontSize) };
  };
  const paras = new Set([...document.querySelectorAll(".verse-location-link")].map((l) => l.closest("p")).filter((p) => p && p.getBoundingClientRect().width));
  let links = 0, tightest = Infinity, tightestWhere = "", chipChip = 0;
  const hits = [];
  let sample = null;
  for (const p of paras) {
    const ink = [];
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const el = n.parentElement, m = metrics(el), link = el.closest(".verse-location-link");
      const r = document.createRange(); r.selectNodeContents(n);
      for (const rc of r.getClientRects()) {
        if (!rc.width) continue;
        const base = rc.top + m.fontAsc;
        let bottom = base + m.desc;
        if (link) { const s = getComputedStyle(link); if (s.textDecorationLine.includes("underline")) bottom = Math.max(bottom, base + (parseFloat(s.textUnderlineOffset) || 0) + (parseFloat(s.textDecorationThickness) || m.size / 14)); }
        ink.push({ left: rc.left, right: rc.right, top: base - m.asc, bottom, base, link, text: n.textContent.trim().slice(0, 20) });
      }
    }
    const chips = [...p.querySelectorAll(".verse-location-link")].flatMap((l) => [...l.getClientRects()].map((r) => ({ l, r })));
    for (const { l, r } of chips) {
      links++;
      const own = ink.find((i) => i.link === l);
      const painted = getComputedStyle(l).backgroundColor !== "rgba(0, 0, 0, 0)";
      if (!sample) { const s = getComputedStyle(l), ps = getComputedStyle(p); sample = { fontSize: ps.fontSize, linePitch: ps.lineHeight, chipH: Math.round(r.height * 100) / 100, display: s.display, padding: s.padding, margin: s.margin, painted }; }
      for (const i of ink) {
        if (i.link === l || !own || Math.abs(i.base - own.base) < 4) continue;
        if (Math.min(r.right, i.right) - Math.max(r.left, i.left) <= 0.5) continue;
        const above = i.base < own.base;
        const clear = above ? r.top - i.bottom : i.top - r.bottom;
        if (clear < tightest) { tightest = clear; tightestWhere = `${l.textContent} vs "${i.text}" ${above ? "above" : "below"}`; }
        if (painted && clear < -0.25) hits.push(`${l.textContent} over "${i.text}" ${above ? "above" : "below"} by ${(-clear).toFixed(1)}px`);
      }
      for (const o of chips) if (o.l !== l && o.r.top > r.top + 4 && Math.min(r.right, o.r.right) - Math.max(r.left, o.r.left) > 0.5 && r.bottom - o.r.top > 0.25) chipChip++;
    }
  }
  return { paras: paras.size, links, tightestPx: Math.round(tightest * 100) / 100, tightestWhere, collisions: hits.length, first: hits.slice(0, 4), chipChip, sample };
});

async function linkHighlights(h) {
  const width = Number(String(h.viewport).split("x")[0]);
  for (const skin of ["skyreader", "trailhead"]) {
    for (const scale of [0.8, 1, 1.8]) {
      h.section(`linked words in "${ARTICLE}": ${skin}, text ${scale}, ${width}px`);
      await h.evaluate((skin, scale) => { localStorage.setItem("app-skin", skin); localStorage.setItem("app-text-scale", String(scale)); localStorage.setItem("app-theme", "light"); }, skin, scale);
      await h.reload(); await h.sleep(1500);
      await openArticle(h, ARTICLE);
      await h.evaluate(() => document.fonts.ready.then(() => true)); await h.sleep(700);
      const fonts = await h.evaluate(() => {
        const loaded = new Set([...document.fonts].filter((x) => x.status === "loaded").map((x) => x.family.replace(/"/g, "")));
        const used = new Set([...document.querySelectorAll(".verse-location-link")].flatMap((l) => [l, l.closest("p")]).filter(Boolean).map((e) => getComputedStyle(e).fontFamily.split(",")[0].replace(/"/g, "")));
        return { skin: document.documentElement.dataset.skin, used: [...used], missing: [...used].filter((f) => !loaded.has(f)) };
      });
      h.assert(fonts.skin === skin && fonts.used.length && !fonts.missing.length, `skin applied, real fonts loaded (${fonts.used.join(", ")})`);
      const m = await measureChips(h);
      console.log("  measured:", JSON.stringify(m));
      h.assert(m.links > 20, `real article with ${m.links} linked words`);
      h.assert(m.collisions === 0 && m.chipChip === 0, `no highlight paints into another line (${m.collisions} on text, ${m.chipChip} chip on chip; tightest ${m.tightestPx}px: ${m.tightestWhere})`);
      await h.evaluate(() => { const p = [...document.querySelectorAll("p")].find((p) => p.textContent.includes("Gamaliel, a Pharisee") || p.textContent.includes("resurrection, angels and spirits")); p?.scrollIntoView({ block: "start", behavior: "instant" }); });
      await h.sleep(300);
      await h.screenshot(`links-${skin}-${scale}-${width}.png`);
    }
  }
  await h.evaluate(() => { localStorage.removeItem("app-skin"); localStorage.removeItem("app-text-scale"); });
}

export default async function (h) {
  await h.addInitScript(stub(VERSES));
  await h.goto("/");
  // ONLY=links or ONLY=picker runs one half.
  if (process.env.ONLY === "links") return linkHighlights(h);
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
  await h.screenshot(`sheet-${h.viewport}-${h.theme}.png`);

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
  await h.screenshot(`colors-${h.theme}-${h.viewport}.png`);
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
  await h.screenshot(`note-saved-${h.theme}-${h.viewport}.png`);

  h.section("the note shows up in Notes");
  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Notes" });
  else {
    await h.click(MENU_BUTTON); await h.sleep(250);
    const link = await h.exists({ css: ".panel-menu-link", text: "Notes" });
    await h.click(link ? { css: ".panel-menu-link", text: "Notes" } : { css: ".panel-menu-item", text: "Notes" });
  }
  await h.sleep(1500);
  h.assert((await h.evaluate(() => document.body.innerText)).includes("My inline note"), "inline note appears in the Notes panel");
  await h.screenshot(`notes-${h.theme}-${h.viewport}.png`);

  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Bible" });
  await toReader(h);
  await pickerTabs(h);
  await pickerSkins(h);
  if (await isPhone(h)) await linkHighlights(h);
}
