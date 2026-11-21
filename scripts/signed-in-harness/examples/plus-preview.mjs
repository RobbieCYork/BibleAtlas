/**
 * Plus preview (lib/plusPreview.ts, plusPreview.css, components/PlusBadge.tsx, PlusPreviewLegend.tsx).
 * Shows what is Free vs Capstone Plus on the main screens, with a fake "Demo Member" and 0 requests to a
 * real Supabase.
 *
 *   # screenshots, both widths, into a folder:
 *   for v in 390x844 1280x800; do
 *     node scripts/signed-in-harness/run.mjs --persona demo --viewport $v \
 *       --script scripts/signed-in-harness/examples/plus-preview.mjs --out /tmp/plus-preview-shots
 *   done
 *   # look around yourself in a real Chrome window (fake backend, closed network); Ctrl-C to stop:
 *   HEADED=1 HOLD=1 node scripts/signed-in-harness/run.mjs --persona demo --viewport 1280x800 \
 *     --script scripts/signed-in-harness/examples/plus-preview.mjs
 *
 * The harness builds with the demo persona's user id allow-listed (VITE_PLUS_PREVIEW_USER_IDS), the same path a
 * real demo account would use. Asserts: the legend is there and the overlay is ON for the demo; the paid article body,
 * Bible-in-a-Year plan cards, skins and the notes export carry PLUS; core screens carry FREE; the legend toggles the
 * overlay off and back; a plain member in the SAME build sees no legend and no overlay; with nothing on, the PLUS
 * wrapper around an article body draws no box (display: contents), so ordinary layout is untouched.
 */
import { MENU_BUTTON, openArticle } from "../lib/app.mjs";

const isPhone = (h) => h.evaluate(() => window.innerWidth <= 768);
const closeMenus = (h) => h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
const tiers = (h) => h.evaluate(() => [...document.querySelectorAll("[data-tier]")].map((e) => e.getAttribute("data-tier")));
const overlayOn = (h) => h.evaluate(() => document.documentElement.getAttribute("data-plus-preview") === "on");
const legend = (h) => h.evaluate(() => document.querySelector("[data-plus-preview-legend] .plus-preview-toggle")?.textContent?.trim() ?? null);

async function goTo(h, label) {
  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: label });
  else {
    await h.click(MENU_BUTTON); await h.sleep(250);
    const link = await h.exists({ css: ".panel-menu-link", text: label });
    await h.click(link ? { css: ".panel-menu-link", text: label } : { css: ".panel-menu-item", text: label });
    await closeMenus(h);
  }
  await h.sleep(1200);
}
async function openProfile(h) {
  if (await isPhone(h)) { await h.click(MENU_BUTTON); await h.sleep(350); await h.click({ css: ".mobile-nav-menu-item", text: "My Profile" }); }
  else {
    if (!(await h.exists({ css: ".auth-menu-item", text: "My Profile" }))) { await h.click('[aria-label="Settings and account"]'); await h.sleep(300); }
    await h.click({ css: ".auth-menu-item", text: "My Profile" });
  }
  await h.waitFor(".myprofile-root"); await h.sleep(600);
}

export default async function (h) {
  const device = (await isPhone(h)) ? "phone-390" : "desktop-1280";
  const shot = async (name) => console.log("  screenshot:", await h.screenshot(`plus-preview-${name}-${device}.png`));

  h.section(`demo: overlay and legend, ${device}`);
  h.assert(await overlayOn(h), "demo account: Plus preview is ON by default");
  h.assert((await legend(h)) === "Plus preview: ON", "legend reads 'Plus preview: ON'");
  if (await isPhone(h)) await h.click({ css: ".mobile-tab", text: "Map" });
  await h.sleep(1500);
  h.assert((await tiers(h)).includes("free"), "map screen carries a FREE tag");
  await shot("map");

  await goTo(h, "Bible").catch(() => {});
  await h.sleep(800);
  h.assert((await tiers(h)).includes("free"), "Bible reader carries a FREE tag");
  await shot("bible");

  h.section("an article: references FREE, body PLUS");
  await openArticle(h, "Demons"); await h.sleep(600);
  const art = await h.evaluate(() => ({
    free: !!document.querySelector(".verse-list[data-tier=free]"),
    plus: !!document.querySelector(".plus-body[data-tier=plus]"),
    badge: getComputedStyle(document.querySelector(".plus-body") ?? document.body, "::after").content,
    outline: getComputedStyle(document.querySelector(".plus-body") ?? document.body).outlineStyle,
  }));
  h.assert(art.free, "Bible references list is tagged FREE");
  h.assert(art.plus, "paid article body is tagged PLUS");
  h.assert(art.badge === '"PLUS"' && art.outline === "solid", `PLUS badge and gold outline are drawn on the body (${art.badge}, outline ${art.outline})`);
  await h.evaluate(() => document.querySelector(".plus-body")?.scrollIntoView({ block: "start", behavior: "instant" }));
  await h.sleep(300);
  await shot("article");
  await h.click(".plus-preview-toggle"); await h.sleep(250);
  const wrapOff = await h.evaluate(() => { const e = document.querySelector(".plus-body"); return e ? getComputedStyle(e).display : "missing"; });
  h.assert(wrapOff === "contents", `overlay OFF: the .plus-body wrapper is display: contents, no box (got ${wrapOff})`);
  await h.click(".plus-preview-toggle"); await h.sleep(250);

  h.section("timeline, notes, games, plans, profile");
  await goTo(h, "Timeline"); await h.sleep(1500);
  h.assert((await h.evaluate(() => !!document.querySelector(".tl-root[data-tier=free]"))), "timeline is tagged FREE");
  await shot("timeline");

  await goTo(h, "Notes");
  h.assert((await h.evaluate(() => !!document.querySelector(".my-notes-panel[data-tier=free]"))), "My Notes is tagged FREE");
  await shot("notes");

  await goTo(h, "Games");
  h.assert((await h.evaluate(() => !!document.querySelector(".game-center[data-tier=free]"))), "Game Center is tagged FREE");
  await shot("games");

  await h.click('[aria-label="Settings and account"]').catch(() => {});
  await h.sleep(300);
  if (await h.exists("text=Reading Plans")) {
    await h.click("text=Reading Plans"); await h.sleep(900);
    const plans = await h.evaluate(() => [...document.querySelectorAll(".bible-plan-card")].map((c) => [c.querySelector(".bible-plan-card-title")?.textContent, c.getAttribute("data-tier")]));
    const biy = plans.filter(([t]) => /year/i.test(t ?? ""));
    h.assert(plans.length === 0 || (biy.every(([, t]) => t === "plus") && plans.filter(([t]) => !/year/i.test(t ?? "")).every(([, t]) => t === "free")),
      `reading plans: Bible-in-a-Year are PLUS, the rest FREE (${JSON.stringify(plans)})`);
    await shot("plans");
  } else { console.log("  (Reading Plans entry not present: switched off in this build; skipped)"); await closeMenus(h); }

  await openProfile(h);
  await h.evaluate(() => document.querySelector(".skin-picker, [data-tier=plus]")?.scrollIntoView({ block: "center", behavior: "instant" }));
  await h.sleep(400);
  h.assert((await h.evaluate(() => !!document.querySelector(".auth-settings-section[data-tier=plus] .skin-toggle"))), "skins (Appearance) are tagged PLUS");
  await shot("profile-skins");

  h.section("legend toggles the overlay");
  await h.click(".plus-preview-toggle"); await h.sleep(300);
  h.assert(!(await overlayOn(h)) && (await legend(h)) === "Plus preview: OFF", "toggle OFF: overlay gone, legend reads OFF");
  await shot("profile-off");
  await h.click(".plus-preview-toggle"); await h.sleep(300);
  h.assert(await overlayOn(h), "toggle ON again");

  h.section("a plain member in the same build sees nothing");
  await h.asPersona("member");
  h.assert((await legend(h)) === null, "member: no legend");
  h.assert(!(await overlayOn(h)), "member: no overlay attribute");
  h.assert(!(await h.evaluate(() => !!document.querySelector("[data-plus-preview-legend]"))), "member: no legend element in the DOM");

  h.section("the owner can use it, but it starts OFF");
  await h.evaluate(() => { try { localStorage.removeItem("plus-preview"); } catch {} });
  await h.asPersona("owner"); await h.sleep(800);
  h.assert((await legend(h)) === "Plus preview: OFF", `owner: legend present, default OFF (got ${await legend(h)})`);
  h.assert(!(await overlayOn(h)), "owner: overlay off until switched on");

  if (process.env.HOLD) {
    await h.asPersona("demo");
    console.log("\nHOLD=1: window stays open as Demo Member. Ctrl-C to stop.");
    await new Promise(() => {});
  }
}
