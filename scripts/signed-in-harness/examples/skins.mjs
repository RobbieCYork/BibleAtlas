/**
 * Visual skins (lib/skin.tsx, skins.css) — a feature for every SIGNED-IN reader. Drives each skin across the main screens.
 *
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 390x844 \
 *        --script scripts/signed-in-harness/examples/skins.mjs --out <dir>
 *
 * persona member / owner / ... (signed in): My Profile -> Theme holds the picker; each skin applies
 *                      (data-skin, self-hosted fonts actually loaded, tokens), persists across a reload; screenshots
 *                      named <skin>-<screen>-<phone|desktop>.png in --out.
 * persona signedout   : always Default, even with a skin value planted in localStorage. With nothing chosen,
 *                      DUMP=path.json writes computed styles so a run against origin/main and a run against this
 *                      tree can be diffed: the default look must not move.
 *
 * Env: SKINS=default,sticker,clarity,midnight,sage,skyreader,trailhead,highlighter  SCREENS=reader,map,plans,library,dialog,...  DUMP=/path/out.json
 */
import { writeFileSync, readFileSync } from "node:fs";
import { openAdminConsole, openArticle, MENU_BUTTON } from "../lib/app.mjs";

const SKINS = (process.env.SKINS ?? "default,sticker,clarity,midnight,sage,skyreader,trailhead,highlighter").split(",");
const SCREENS = (process.env.SCREENS ?? "reader,map,timeline,notes,article,profile,games,admin,plans,library,dialog").split(",");
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

/** Open My Profile on either layout (phone: header menu row; desktop: the account menu's identity header). */
async function openProfile(h) {
  if (await isPhone(h)) { await h.click(MENU_BUTTON); await h.sleep(350); await h.click({ css: ".mobile-nav-menu-item", text: "My Profile" }); }
  else { await h.click('[aria-label="Settings and account"]'); await h.sleep(300); await h.click(".auth-identity-link"); }
  await h.waitFor(".myprofile-root"); await h.sleep(600);
}

/** Pick a theme in the My Profile select, firing the change event React listens for. */
const chooseTheme = (h, value) => h.evaluate((v) => {
  const s = document.querySelector("#myprofile-theme");
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, v);
  s.dispatchEvent(new Event("change", { bubbles: true }));
}, value);

const SCREEN_FNS = {
  reader: async (h) => { if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Bible" }); await h.sleep(900); },
  map: async (h) => { if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Map" }); await h.sleep(1500); },
  timeline: async (h) => { await goTo(h, "Timeline"); await h.sleep(1500); },
  notes: async (h) => { await goTo(h, "Notes"); },
  article: async (h) => { await openArticle(h, "Demons"); await h.sleep(500); },
  profile: async (h) => { await openProfile(h); await h.evaluate(() => document.querySelector("#myprofile-theme")?.scrollIntoView({ block: "center", behavior: "instant" })); await h.sleep(500); },
  games: async (h) => { await goTo(h, "Games"); },
  // Reading Plans: phone = More sheet is not a tab, so use the account menu entry the desktop uses (both layouts have it).
  plans: async (h) => {
    await h.click('[aria-label="Settings and account"]'); await h.sleep(300);
    await h.click("text=Reading Plans"); await h.sleep(900);
  },
  // "Library" = the Articles panel (searchable list of articles).
  library: async (h) => {
    if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Articles" });
    else { await h.click(MENU_BUTTON); await h.click({ css: ".panel-menu-item", text: "Articles" }); await closeMenus(h); }
    await h.sleep(900);
  },
  // A dialog: the passage picker opened from the chapter title.
  dialog: async (h) => {
    if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Bible" });
    await h.sleep(600);
    await h.click(".bible-passage-title-btn"); await h.waitFor(".ref-picker"); await h.sleep(500);
  },
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


// Every visible text element's colour against its nearest opaque background (gradients/images skipped).
// Returns the worst offenders (< 3:1), which is the "dark text on dark" class of bug.
async function lowContrast(h) {
  return h.evaluate(() => {
    const parse = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const bgOf = (el) => { let acc = null; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none") return null; const c = parse(cs.backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.9) return c; } return [255, 255, 255]; };
    const out = [];
    const seen = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = (n.textContent ?? "").trim(); if (t.length < 2) continue;
      const el = n.parentElement; if (!el || seen.has(el) || !el.getClientRects().length) continue; seen.add(el);
      const cs = getComputedStyle(el); if (cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.bottom < 0 || r.top > innerHeight) continue;
      const bg = bgOf(el); if (!bg) continue;
      const fg = parse(cs.color); if (fg.length < 3 || (fg[3] ?? 1) < 0.5) continue;
      const a = L(fg), b = L(bg); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (ratio < 3) out.push({ t: t.slice(0, 28), cls: el.className.toString().slice(0, 36), fg: cs.color, bg: `rgb(${bg.slice(0, 3)})`, r: +ratio.toFixed(2) });
    }
    return out.slice(0, 8);
  });
}

export default async function (h) {
  const w = await h.evaluate(() => window.innerWidth);
  const device = w <= 768 ? "phone" : "desktop";
  await h.addInitScript(stub(VERSES));

  // ---- signed out: Default always, whatever is planted in localStorage ---------------------------
  if (h.persona === "signedout") {
    h.section(`signedout: planted skin ignored, ${device}`);
    for (const planted of ["none", "sticker", "midnight", "clarity", "sage", "skyreader", "trailhead", "highlighter"]) {
      await h.evaluate((p) => { try { p === "none" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", p); } catch {} }, planted);
      await h.reload();
      await h.sleep(1800);
      const attr = await h.evaluate(() => document.documentElement.getAttribute("data-skin"));
      const link = await h.evaluate(() => !!document.getElementById("skin-fonts"));
      h.assert(attr === null, `signedout with localStorage app-skin=${planted}: no data-skin attribute (got ${attr})`);
      h.assert(!link, `signedout with app-skin=${planted}: no skin font <link> injected`);
    }
    await h.evaluate(() => { try { localStorage.removeItem("app-skin"); } catch {} });
    await h.reload(); await h.sleep(1500);
    if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify({ signedOutAttr: await h.evaluate(() => [document.documentElement.getAttribute("data-skin"), document.documentElement.getAttribute("data-theme"), getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).fontFamily]) }, null, 1));
    console.log("  screenshot:", await h.screenshot(`default-signedout-${device}.png`));
    return;
  }

  // ---- signed in, nothing chosen: Default, byte-compared with origin/main --------------------------
  h.section(`${h.persona}: nothing chosen = Default, ${device}`);
  await h.evaluate(() => { try { localStorage.removeItem("app-skin"); } catch {} });
  await h.reload(); await h.sleep(1800);
  h.assert((await h.evaluate(() => document.documentElement.getAttribute("data-skin"))) === null, `${h.persona} with nothing chosen: no data-skin`);
  h.assert(!(await h.evaluate(() => !!document.getElementById("skin-fonts"))), `${h.persona} with nothing chosen: no skin stylesheet`);
  if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify(await dumpComputed(h), null, 1));
  // an unknown stored value fails safe to Default
  await h.evaluate(() => { try { localStorage.setItem("app-skin", "not-a-skin"); } catch {} });
  await h.reload(); await h.sleep(1500);
  h.assert((await h.evaluate(() => document.documentElement.getAttribute("data-skin"))) === null, "unknown stored skin value fails safe to Default");
  await h.evaluate(() => { try { localStorage.removeItem("app-skin"); } catch {} });

  // ---- the picker, in My Profile ---------------------------------------------------------------
  h.section(`${h.persona}: My Profile picker, ${device}`);
  await h.reload(); await h.sleep(1500);
  await openProfile(h);
  h.assert((await h.count("#myprofile-theme")) === 1, "theme select is on My Profile");
  const opts = await h.evaluate(() => [...document.querySelectorAll("#myprofile-theme option")].map((o) => o.textContent.trim()));
  h.assert(JSON.stringify(opts) === JSON.stringify(["Default", "Sticker Pop", "Clarity", "Midnight Signal", "Sage Study", "Sky Reader", "Trailhead", "Highlighter"]), `options: ${opts}`);
  // through the UI's own change event: pick Clarity, check it applies, then back to Default
  await chooseTheme(h, "clarity");
  await h.sleep(500);
  h.assert((await h.evaluate(() => document.documentElement.getAttribute("data-skin"))) === "clarity", "choosing Clarity applies data-skin=clarity");
  h.assert((await h.evaluate(() => localStorage.getItem("app-skin"))) === "clarity", "choice persisted in localStorage");
  await chooseTheme(h, "default");
  await h.sleep(400);
  h.assert((await h.evaluate(() => document.documentElement.getAttribute("data-skin"))) === null, "Default removes data-skin");
  h.assert((await h.evaluate(() => localStorage.getItem("app-skin"))) === null, "Default clears the stored choice");
  h.assert(!(await h.evaluate(() => !!document.getElementById("skin-fonts"))), "Default removes the skin stylesheet");

  const report = [];
  for (const skin of SKINS) {
    h.section(`${h.persona}: skin=${skin}, ${device}`);
    await h.evaluate((s) => { try { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); } catch {} }, skin);
    for (const screen of SCREENS) {
      if (screen === "admin" && h.persona !== "owner") continue;
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
        if (screen === "reader") {
          const want = { default: "Archivo", sticker: "Bricolage Grotesque", clarity: "Inter", midnight: "Inter", highlighter: "Inter", sage: "DM Sans", skyreader: "Baloo 2", trailhead: "Lexend" }[skin];
          const fonts = await h.evaluate(() => ({ loaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")), urls: performance.getEntriesByType("resource").map((r) => r.name).filter((n) => /\/fonts\//.test(n)).map((n) => n.split("/fonts/")[1]) }));
          h.assert(fonts.loaded.includes(want), `${skin}: real self-hosted ${want} is loaded (loaded: ${[...new Set(fonts.loaded)].join(", ")})`);
          console.log(`  [${skin}] font files fetched: ${fonts.urls.join(", ")}`);
        }
        const sc = screen === "reader" ? await scriptureContrast(h) : null;
        // touch targets: smallest visible button/tab dimension on phone
        const small = device === "phone"
          ? await h.evaluate(() => [...document.querySelectorAll(".mobile-tab, .app-header button, .bible-panel button, .admin-tab, #myprofile-theme")]
              .filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { c: e.className.toString().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; })
              .filter((r) => r.h < 44 || r.w < 44).slice(0, 6))
          : [];
        if (sc) h.assert(sc.ratio >= 4.5, `${skin}/reader scripture contrast ${sc.ratio}:1 (${sc.fg} on ${sc.bg}, ${sc.font})`);
        if (device === "phone" && (skin === "skyreader" || skin === "trailhead")) {
          const names = await h.evaluate(() => [...document.querySelectorAll(".mobile-tab, .app-header button, .bible-panel button, .bible-panel [role=button]")]
            .filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return { c: e.className.toString().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; })
            .filter((r) => (r.h < 44 || r.w < 44) && r.w > 0));
          console.log(`  [${skin}/${screen}] controls under 44px:`, JSON.stringify(names.slice(0, 8)));
        }
        h.assert(!m.horizontalScroll, `${skin}/${screen}: no horizontal page overflow`);
        const low = await lowContrast(h);
        if (low.length) console.log(`  [${skin}/${screen}] text under 3:1 -> ${JSON.stringify(low)}`);
        const file = await h.screenshot(`${skin}-${screen}-${device}.png`);
        report.push({ skin, screen, device, theme: m.theme, bodyFont: m.bodyFont, scripture: sc, smallTargets: small.length, file });
      } catch (e) {
        h.assert(false, `${skin}/${screen}/${device}: ${String(e.message).slice(0, 160)}`);
      }
    }
  }
  if (process.env.REPORT) writeFileSync(process.env.REPORT, JSON.stringify(report, null, 1));
}
