/**
 * Disclosure chevrons on My Profile (Appearance, About Me, book-by-book progress) are real, visible SVGs.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/chevrons.mjs --out <dir>
 * Per skin: chevron >=20px, contrast vs the row's background >=3:1, row tap target >=44px, rotates on open, no horizontal overflow.
 */
import { MENU_BUTTON } from "../lib/app.mjs";
const SKINS = { default: "Default", sticker: "Sticker Pop", midnight: "Midnight Signal", skyreader: "Sky Reader" };
const isPhone = (h) => h.evaluate(() => window.innerWidth <= 768);
async function openProfile(h) {
  if (await isPhone(h)) { await h.click(MENU_BUTTON); await h.sleep(350); await h.click({ css: ".mobile-nav-menu-item", text: "My Profile" }); }
  else { await h.click('[aria-label="Settings and account"]'); await h.sleep(300); await h.click(".auth-identity-link"); }
  await h.waitFor(".myprofile-root"); await h.sleep(800);
}
const measure = (h, rowSel) => h.evaluate((sel) => {
  const row = document.querySelector(sel); if (!row) return null;
  const svg = row.querySelector("svg.chev"); if (!svg) return { noSvg: true, text: row.textContent };
  const r = svg.getBoundingClientRect(), rr = row.getBoundingClientRect();
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let el = row, bg = [255, 255, 255];
  for (; el; el = el.parentElement) { const p = parse(getComputedStyle(el).backgroundColor); if (p.length >= 3 && (p.length === 3 || p[3] > 0.9)) { bg = p; break; } }
  const fg = parse(getComputedStyle(svg).color); const L1 = lum(fg), L2 = lum(bg);
  const m = new DOMMatrix(getComputedStyle(svg).transform);
  return { w: Math.round(r.width), h: Math.round(r.height), rowH: Math.round(rr.height), rowW: Math.round(rr.width), right: Math.round(rr.right - r.right), midOffset: Math.round((r.top + r.height / 2) - (rr.top + rr.height / 2)),
    contrast: +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2), angle: Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI), sw: svg.querySelector("path")?.closest("svg")?.getAttribute("stroke-width"),
    exp: row.getAttribute("aria-expanded"), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
}, rowSel);
const ROWS = [[".skin-toggle", "menu", "Appearance"], [".profile-view-toggle", "row", "About Me"], [".reading-progress-toggle", "row", "book-by-book"]];
export default async function (h) {
  const dev = (await isPhone(h)) ? "phone" : "desktop";
  for (const [id, label] of Object.entries(SKINS)) {
    h.section(`skin=${id} ${dev}`);
    await h.evaluate((s) => { try { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); } catch {} }, id);
    await h.reload(); await h.sleep(1600); await openProfile(h);
    for (const [sel, kind, name] of ROWS) {
      const exists = await h.evaluate((s) => !!document.querySelector(s), sel);
      if (!exists) { console.log(`  (skip: ${name} row not present for this persona)`); continue; }
      await h.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "center", behavior: "instant" }), sel); await h.sleep(300);
      const a = await measure(h, sel);
      h.assert(a && !a.noSvg, `${id}/${name}: renders an SVG chevron`);
      if (!a || a.noSvg) continue;
      h.assert(a.w >= 20 && a.h >= 20, `${id}/${name}: chevron >=20px (${a.w}x${a.h})`);
      h.assert(a.contrast >= 3, `${id}/${name}: contrast >=3:1 (${a.contrast})`);
      h.assert(a.rowH >= 44, `${id}/${name}: row tap target >=44px (${a.rowH})`);
      h.assert(a.right <= 16 && Math.abs(a.midOffset) <= 3, `${id}/${name}: chevron at right edge (gap ${a.right}) and centred (off ${a.midOffset})`);
      h.assert(a.angle === (kind === "row" ? -90 : 0), `${id}/${name}: closed rotation ${kind === "row" ? -90 : 0} (got ${a.angle})`);
      console.log("  shot:", await h.screenshot(`${id}-${name.replace(/\W/g, "")}-closed-${dev}.png`));
      await h.click(sel); await h.sleep(500);
      const b = await measure(h, sel);
      h.assert(b.exp === "true", `${id}/${name}: expands`);
      h.assert(b.angle === (kind === "row" ? 0 : 180), `${id}/${name}: open rotation ${kind === "row" ? 0 : 180} (got ${b.angle})`);
      h.assert(!b.overflow, `${id}/${name}: no horizontal overflow when open`);
      await h.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "start", behavior: "instant" }), sel); await h.sleep(300);
      console.log("  shot:", await h.screenshot(`${id}-${name.replace(/\W/g, "")}-open-${dev}.png`));
      await h.click(sel); await h.sleep(400);
      h.assert((await measure(h, sel)).exp === "false", `${id}/${name}: collapses`);
    }
  }
  await h.evaluate(() => { try { localStorage.removeItem("app-skin"); } catch {} });
}
