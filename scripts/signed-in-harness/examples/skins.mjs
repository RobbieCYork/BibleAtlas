/**
 * Visual skins (lib/skin.tsx, skins.css) — owner-only. Drives each skin across the main screens.
 *
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 390x844 \
 *        --script scripts/signed-in-harness/examples/skins.mjs --out <dir>
 *
 * persona owner      : picker present in Admin Console; each skin applies (data-skin, fonts, tokens);
 *                      screenshots named <skin>-<screen>-<phone|desktop>.png in --out.
 * persona member /
 * persona signedout  : no picker; a skin value planted in localStorage is IGNORED (no data-skin).
 *                      Also dumps computed styles (DUMP=path.json) so a run against origin/main and a
 *                      run against this tree can be diffed: the default look must not move.
 *
 * Env: SKINS=default,sticker,clarity,midnight  SCREENS=reader,map,...  DUMP=/path/out.json
 */
import { writeFileSync, readFileSync } from "node:fs";
import { openAdminConsole, openArticle, MENU_BUTTON } from "../lib/app.mjs";

const SKINS = (process.env.SKINS ?? "default,sticker,clarity,midnight").split(",");
const SCREENS = (process.env.SCREENS ?? "reader,map,timeline,notes,article,social,games,admin").split(",");
const VERSES = JSON.parse(readFileSync(process.env.MARK8 ?? new URL("./mark8-web.json", import.meta.url), "utf8"));

// bible-api.com is blocked in the harness; answer it in-page with Mark 8:1-12 (WEB, public domain).
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

async function closeMenus(h) {
  await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
}

/** Open a "Go to" destination (Timeline / Games) or a panel (Notes / Friends) on either layout. */
async function goTo(h, label, tabLabel = label) {
  if (await isPhone(h)) {
    await h.click({ css: ".mobile-tab", text: tabLabel });
  } else {
    await h.click(MENU_BUTTON);
    await h.sleep(250);
    const link = await h.exists({ css: ".panel-menu-link", text: label });
    await h.click(link ? { css: ".panel-menu-link", text: label } : { css: ".panel-menu-item", text: label });
    await closeMenus(h);
  }
  await h.sleep(1200);
}

const SCREEN_FNS = {
  reader: async (h) => { if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Bible" }); await h.sleep(900); },
  map: async (h) => { if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Map" }); await h.sleep(1500); },
  timeline: async (h) => { await goTo(h, "Timeline"); await h.sleep(1500); },
  notes: async (h) => { await goTo(h, "Notes"); },
  article: async (h) => { await openArticle(h, "Demons"); await h.sleep(500); },
  social: async (h) => { await goTo(h, "Social", "Social"); },
  games: async (h) => { await goTo(h, "Games"); },
  admin: async (h) => { const ok = await openAdminConsole(h); h.assert(ok, "owner can open the Admin Console"); await h.sleep(600); },
};

// Selectors whose computed style is compared between builds for the default look.
const DUMP_SELECTORS = [
  "html", "body", ".app-header", ".app-header h1", ".brand-tagline", ".search-bar", ".mobile-tab-bar", ".mobile-tab",
  ".mobile-tab.active", ".bible-panel", ".bible-passage-title-btn", ".verse-list", ".panel-menu-button", ".auth-button",
  ".map-area", ".map-container", ".mobile-tab-label",
];
const DUMP_PROPS = [
  "color", "backgroundColor", "fontFamily", "fontSize", "fontWeight", "borderTopColor", "borderTopWidth", "borderRadius",
  "boxShadow", "paddingTop", "paddingLeft", "height", "width", "filter", "letterSpacing", "lineHeight",
];

async function dumpComputed(h) {
  return h.evaluate((sels, props) => {
    const out = {};
    for (const s of sels) {
      const el = document.querySelector(s);
      if (!el) { out[s] = null; continue; }
      const cs = getComputedStyle(el);
      out[s] = Object.fromEntries(props.map((p) => [p, cs[p]]));
    }
    // every custom property the stylesheet defines on :root, as resolved
    const cs = getComputedStyle(document.documentElement);
    const vars = {};
    for (const n of ["--text", "--bg", "--panel-bg", "--accent", "--border", "--display", "--serif", "--sans", "--link", "--danger", "--reading-bg"]) vars[n] = cs.getPropertyValue(n).trim();
    out.__vars = vars;
    out.__attrs = { skin: document.documentElement.getAttribute("data-skin"), theme: document.documentElement.getAttribute("data-theme") };
    return out;
  }, DUMP_SELECTORS, DUMP_PROPS);
}

// WCAG contrast of the scripture text against what it sits on, measured in the live page.
async function scriptureContrast(h) {
  return h.evaluate(() => {
    const parse = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.5) return c; } return [255, 255, 255]; };
    const root = document.querySelector(".bible-verses");
    if (!root) return null;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let el = null;
    for (let n = w.nextNode(); n; n = w.nextNode()) { if ((n.textContent ?? "").trim().length > 40) { el = n.parentElement; break; } }
    if (!el) return null;
    const fg = parse(getComputedStyle(el).color), bg = bgOf(el);
    const a = L(fg), b = L(bg);
    return { ratio: +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2), fg: getComputedStyle(el).color, bg: `rgb(${bg.slice(0, 3)})`, font: getComputedStyle(el).fontFamily.split(",")[0] };
  });
}

export default async function (h) {
  const w = await h.evaluate(() => window.innerWidth);
  const device = w <= 768 ? "phone" : "desktop";
  await h.addInitScript(stub(VERSES));

  // ---- non-owner personas: nothing to see, nothing applied -------------------------------------
  if (h.persona !== "owner") {
    h.section(`${h.persona}: no picker, planted skin ignored, ${device}`);
    const dumps = {};
    for (const planted of ["none", "sticker", "midnight", "clarity"]) {
      await h.evaluate((p) => { try { p === "none" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", p); } catch {} }, planted);
      await h.reload();
      await h.sleep(1800);
      const attr = await h.evaluate(() => document.documentElement.getAttribute("data-skin"));
      const link = await h.evaluate(() => !!document.getElementById("skin-fonts"));
      h.assert(attr === null, `${h.persona} with localStorage app-skin=${planted}: no data-skin attribute (got ${attr})`);
      h.assert(!link, `${h.persona} with app-skin=${planted}: no skin font <link> injected`);
      if (h.persona !== "signedout") {
        h.assert((await h.count(".skin-picker")) === 0, `${h.persona}: no skin picker in the DOM`);
        dumps[planted] = await dumpComputed(h);
      }
    }
    if (h.persona !== "signedout") {
      const same = JSON.stringify(dumps.none) === JSON.stringify(dumps.sticker) && JSON.stringify(dumps.none) === JSON.stringify(dumps.midnight);
      h.assert(same, "computed styles identical with and without a planted skin value");
      if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify(dumps.none, null, 1));
      console.log("  screenshot:", await h.screenshot(`default-${h.persona}-${device}.png`));
    } else {
      if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify({ signedOutAttr: await h.evaluate(() => [document.documentElement.getAttribute("data-skin"), document.documentElement.getAttribute("data-theme"), getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).fontFamily]) }, null, 1));
      console.log("  screenshot:", await h.screenshot(`default-signedout-${device}.png`));
    }
    return;
  }

  // ---- owner ------------------------------------------------------------------------------------
  h.section(`owner: picker, ${device}`);
  await h.reload(); await h.sleep(1500);
  h.assert(await openAdminConsole(h), "owner opens Admin Console");
  h.assert((await h.count(".skin-picker")) === 1, "owner sees the skin picker");
  h.assert((await h.count(".release-view-switch")) === 1, "picker sits beside the Live/Test switch");
  const names = await h.evaluate(() => [...document.querySelectorAll(".skin-picker-option")].map((b) => b.innerText.trim()));
  h.assert(JSON.stringify(names) === JSON.stringify(["Default", "Sticker Pop", "Clarity", "Midnight Signal"]), `options: ${names}`);
  // real click path: pick Clarity in the UI, check it applies, then back to Default
  await h.click({ css: ".skin-picker-option", text: "Clarity" });
  await h.sleep(400);
  h.assert((await h.evaluate(() => document.documentElement.getAttribute("data-skin"))) === "clarity", "clicking Clarity applies data-skin=clarity");
  h.assert((await h.evaluate(() => localStorage.getItem("app-skin"))) === "clarity", "choice persisted in localStorage");
  await h.click({ css: ".skin-picker-option", text: "Default" });
  await h.sleep(400);
  h.assert((await h.evaluate(() => document.documentElement.getAttribute("data-skin"))) === null, "Default removes data-skin");
  h.assert((await h.evaluate(() => localStorage.getItem("app-skin"))) === null, "Default clears the stored choice");

  const report = [];
  for (const skin of SKINS) {
    h.section(`owner: skin=${skin}, ${device}`);
    await h.evaluate((s) => { try { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); } catch {} }, skin);
    for (const screen of SCREENS) {
      try {
        await h.reload();
        await h.sleep(1800);
        const attr = await h.evaluate(() => document.documentElement.getAttribute("data-skin"));
        h.assert((attr ?? "default") === skin, `${skin}/${screen}: data-skin=${attr}`);
        await SCREEN_FNS[screen](h);
        await h.sleep(500);
        const m = await h.evaluate(() => ({
          theme: document.documentElement.dataset.theme,
          bodyFont: getComputedStyle(document.body).fontFamily.split(",")[0],
          horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
        }));
        const sc = screen === "reader" ? await scriptureContrast(h) : null;
        // touch targets: smallest visible button/tab dimension on phone
        const small = device === "phone"
          ? await h.evaluate(() => [...document.querySelectorAll(".mobile-tab, .app-header button, .bible-panel button, .admin-tab, .skin-picker-option")]
              .filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { c: e.className.toString().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; })
              .filter((r) => r.h < 44 || r.w < 44).slice(0, 6))
          : [];
        if (sc) h.assert(sc.ratio >= 4.5, `${skin}/reader scripture contrast ${sc.ratio}:1 (${sc.fg} on ${sc.bg}, ${sc.font})`);
        h.assert(!m.horizontalScroll, `${skin}/${screen}: no horizontal page overflow`);
        const file = await h.screenshot(`${skin}-${screen}-${device}.png`);
        report.push({ skin, screen, device, theme: m.theme, bodyFont: m.bodyFont, scripture: sc, smallTargets: small.length, file });
      } catch (e) {
        h.assert(false, `${skin}/${screen}/${device}: ${String(e.message).slice(0, 160)}`);
      }
    }
  }
  if (process.env.REPORT) writeFileSync(process.env.REPORT, JSON.stringify(report, null, 1));
}
