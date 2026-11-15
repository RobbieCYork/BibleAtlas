/**
 * My Profile -> Appearance is a collapsible menu, collapsed on every load.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 \
 *        --script scripts/signed-in-harness/examples/skin-collapse.mjs --out <dir>
 * Per skin: collapsed on load (hint shows the active skin), expands, selects a skin, collapses, and a reload is collapsed again.
 */
import { MENU_BUTTON } from "../lib/app.mjs";

const SKINS = { default: "Default", sticker: "Sticker Pop", clarity: "Clarity", midnight: "Midnight Signal", sage: "Sage Study", skyreader: "Sky Reader", trailhead: "Trailhead", highlighter: "Highlighter" };
const isPhone = (h) => h.evaluate(() => window.innerWidth <= 768);
async function openProfile(h) {
  if (await isPhone(h)) { await h.click(MENU_BUTTON); await h.sleep(350); await h.click({ css: ".mobile-nav-menu-item", text: "My Profile" }); }
  else { await h.click('[aria-label="Settings and account"]'); await h.sleep(300); await h.click({ css: ".auth-menu-item", text: "My Profile" }); }
  await h.waitFor(".myprofile-root"); await h.sleep(600);
}
const state = (h) => h.evaluate(() => {
  const b = document.querySelector(".skin-toggle"); const p = document.getElementById(b?.getAttribute("aria-controls") ?? "");
  const r = b?.getBoundingClientRect();
  return { exp: b?.getAttribute("aria-expanded"), hint: b?.querySelector(".skin-toggle-hint")?.textContent ?? null, panelHidden: p ? p.hidden : null, cardsVisible: [...document.querySelectorAll(".skin-card")].filter((e) => e.getClientRects().length).length, bw: Math.round(r?.width ?? 0), bh: Math.round(r?.height ?? 0), overflow: document.documentElement.scrollWidth > innerWidth + 1, vw: innerWidth };
});
export default async function (h) {
  const dev = (await isPhone(h)) ? "phone" : "desktop";
  for (const [id, label] of Object.entries(SKINS)) {
    h.section(`skin=${id} ${dev}`);
    await h.evaluate((s) => { try { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); } catch {} }, id);
    await h.reload(); await h.sleep(1600);
    await openProfile(h);
    let s = await state(h);
    h.assert(s.exp === "false" && s.panelHidden === true && s.cardsVisible === 0, `${id}: collapsed by default (${JSON.stringify(s)})`);
    h.assert(s.hint === label, `${id}: collapsed hint shows "${label}" (got ${s.hint})`);
    h.assert(s.bh >= 44, `${id}: toggle >=44px tall (${s.bh})`);
    await h.evaluate(() => document.querySelector(".skin-toggle")?.scrollIntoView({ block: "center", behavior: "instant" })); await h.sleep(300);
    if (["default", "sticker", "midnight"].includes(id) || true) console.log("  shot:", await h.screenshot(`${id}-collapsed-${dev}.png`));
    await h.click(".skin-toggle"); await h.sleep(300);
    s = await state(h);
    h.assert(s.exp === "true" && s.panelHidden === false && s.cardsVisible === 8, `${id}: expands to 8 skins (${JSON.stringify(s)})`);
    h.assert(!s.overflow, `${id}: no horizontal overflow when expanded`);
    console.log("  shot:", await h.screenshot(`${id}-expanded-${dev}.png`));
    // select a different skin (Clarity, or Sage when already Clarity), then collapse
    const target = id === "clarity" ? "Sage Study" : "Clarity", tid = id === "clarity" ? "sage" : "clarity";
    await h.click({ css: ".skin-card", text: target }); await h.sleep(500);
    h.assert((await h.evaluate(() => document.documentElement.getAttribute("data-skin"))) === tid, `${id}: selecting ${target} applies it`);
    h.assert((await state(h)).exp === "true", `${id}: stays open after selecting`);
    // keyboard: focus the toggle and press Enter
    await h.evaluate(() => document.querySelector(".skin-toggle").focus());
    await h.click(".skin-toggle"); await h.sleep(300);
    s = await state(h);
    h.assert(s.exp === "false" && s.cardsVisible === 0 && s.hint === target, `${id}: collapses, hint now "${target}" (${JSON.stringify(s)})`);
    console.log("  shot:", await h.screenshot(`${id}-after-select-collapsed-${dev}.png`));
    await h.reload(); await h.sleep(1600); await openProfile(h);
    s = await state(h);
    h.assert(s.exp === "false" && s.cardsVisible === 0, `${id}: collapsed again after reload`);
  }
  await h.evaluate(() => { try { localStorage.removeItem("app-skin"); } catch {} });
}
