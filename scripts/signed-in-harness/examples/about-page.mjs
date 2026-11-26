/**
 * About Capstone Bible: the in-app page (signed in) and the static /about page (signed out).
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/about-page.mjs
 *   (also at 1280x800, and --persona signedout at both)
 *
 * Signed in: main menu row, wording equal to src/data/aboutPage.ts, gutters, scrolling, Back over a panel and
 * over Timeline, leaving by navigating elsewhere, Settings/About exclusivity, the Report a Problem button, and
 * contrast in light, dark and every skin. Signed out: the sign-in card's link, the static page, its Back link.
 * `vite preview` serves the static page at /about/ (Vercel serves it at /about too, as for /terms).
 *
 * Env: DUMP=<file> writes the rendered wording as JSON, for comparing with a source text.
 */
import { writeFileSync } from "node:fs";
import { MENU_BUTTON } from "../lib/app.mjs";

const about = await import("../../../src/data/aboutPage.ts");
const EXPECTED = [
  about.ABOUT_PULL_QUOTE,
  ...about.ABOUT_SECTIONS.flatMap((s) => [...(s.heading ? [s.heading] : []), ...s.paragraphs]),
];
const SKINS = ["default", "sticker", "clarity", "midnight", "sage", "skyreader", "trailhead", "highlighter"];

const esc = (h) => h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
const wording = (h, root) => h.evaluate((r) => [...document.querySelectorAll(`${r} blockquote, ${r} section h2, ${r} section h3, ${r} section p`)].map((e) => e.textContent), root);
const overflow = (h) => h.evaluate(() => {
  const body = document.querySelector(".about-root .myprofile-body");
  return document.documentElement.scrollWidth > window.innerWidth + 1 || (!!body && body.scrollWidth > body.clientWidth + 1);
});
/** Smallest left/right gap between the text blocks and the screen edge. */
const gutter = (h, sel) => h.evaluate((s) => Math.floor(Math.min(...[...document.querySelectorAll(s)].map((e) => {
  const r = e.getBoundingClientRect();
  return Math.min(r.left, window.innerWidth - r.right);
}))), sel);
/** WCAG contrast of each selector's text against the first opaque background behind it. */
const contrast = (h, sels) => h.evaluate((list) => list.map((sel) => {
  const el = document.querySelector(sel);
  const rgb = (c) => c.match(/[\d.]+/g).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  let bg = null;
  for (let n = el; n && !bg; n = n.parentElement) {
    const c = rgb(getComputedStyle(n).backgroundColor);
    if (c.length === 3 || c[3] > 0.9) bg = c;
  }
  const [a, b] = [lum(rgb(getComputedStyle(el).color)), lum(bg ?? [255, 255, 255])];
  return { sel, ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100 };
}), sels);

export default async (h) => {
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = phone ? "phone" : "desktop";
  const shot = (name) => h.screenshot(`about-${h.persona}-${name}-${dev}.png`);
  h.section(`about page — ${h.persona} @ ${h.viewport}`);

  if (h.persona === "signedout") {
    await h.waitFor(".auth-gate-contact");
    const link = await h.evaluate(() => {
      const a = [...document.querySelectorAll(".auth-gate-contact a")].find((x) => x.textContent === "About Capstone Bible");
      if (!a) return null;
      a.scrollIntoView({ block: "center", behavior: "instant" });
      const r = a.getBoundingClientRect();
      return { href: a.getAttribute("href"), left: r.left, right: r.right, w: window.innerWidth, lines: a.getClientRects().length };
    });
    h.assert(link?.href === "/about" && link.left >= 0 && link.right <= link.w && link.lines === 1, `sign-in card links About: ${JSON.stringify(link)}`);
    await shot("gate");
    await h.evaluate(() => { location.assign("/about/"); });
    await h.sleep(1500);
    h.assert((await h.evaluate(() => document.title)) === "About Capstone Bible", "static page: title");
    h.assert((await h.evaluate(() => document.querySelector("main h1")?.textContent)) === "About Capstone Bible", "static page: h1");
    h.assert((await h.evaluate(() => document.scripts.length - document.querySelectorAll('script[type="application/ld+json"]').length)) === 0, "static page: carries no script");
    const got = await wording(h, "main");
    h.assert(JSON.stringify(got) === JSON.stringify(EXPECTED), `static page: wording matches the data module (${got.length}/${EXPECTED.length} blocks)`);
    if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify(got, null, 1));
    h.assert((await h.evaluate(() => document.querySelector("main blockquote.pull") === document.querySelector("main h1").nextElementSibling)), "static page: pull quote directly under the title");
    h.assert((await h.evaluate(() => [...document.querySelectorAll("main section h2")].map((e) => e.textContent).join("|"))) === "On the use of AI", "static page: one section heading");
    const g = await gutter(h, "main blockquote, main section p, main h1, .back a");
    h.assert(g >= 16 && !(await overflow(h)), `static page: no sideways overflow, gutter ${g}px`);
    h.assert(await h.exists('footer a[href="/about"]'), "static page: footer links About");
    await shot("static-top");
    await h.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await h.sleep(300);
    h.assert((await h.evaluate(() => window.scrollY)) > 0, "static page: scrolls");
    await shot("static-end");
    await h.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await h.click(".back a");
    await h.waitFor(".auth-gate-card");
    h.assert((await h.evaluate(() => location.pathname)) === "/", "static page: Back returns to the sign-in card");
    h.assert(h.consoleErrors.length === 0, `no page errors ${JSON.stringify(h.consoleErrors).slice(0, 300)}`);
    return;
  }

  h.backend.setTable("report_categories", [{ key: "incorrect_info", label: "Incorrect information", description: null, sort_order: 1, is_active: true }]);
  const row = phone ? ".mobile-nav-menu-about" : ".panel-menu-about";
  const openMenu = async () => { await h.click(MENU_BUTTON); await h.sleep(300); };
  const openAbout = async () => { await openMenu(); await h.click(row); await h.waitFor(".about-root"); await h.sleep(300); };
  const goTimeline = async () => { await openMenu(); await h.click({ css: ".mobile-nav-menu-item, .panel-menu-link", text: "Timeline" }); await h.waitFor(".timeline-mode"); await h.sleep(500); };

  // ---- the menu row ----
  await openMenu();
  const menu = await h.evaluate((sel) => {
    const el = document.querySelector(sel);
    const box = el.closest(".mobile-nav-menu-dropdown, .panel-menu-dropdown");
    const r = box.getBoundingClientRect();
    return { text: el.querySelector("[class$=label]").textContent, last: [...box.querySelectorAll("button")].at(-1) === el, top: r.top, bottom: r.bottom, right: r.right, w: innerWidth, h: innerHeight, rowH: el.getBoundingClientRect().height };
  }, row);
  h.assert(menu.text === "About Capstone Bible" && menu.last, `main menu: last row is About Capstone Bible`);
  h.assert(menu.top >= 0 && menu.bottom <= menu.h && menu.right <= menu.w && menu.rowH < 50, `main menu fits on screen, row on one line ${JSON.stringify(menu)}`);
  await shot("menu");
  await esc(h);

  // ---- the page ----
  await openAbout();
  h.assert((await h.text(".about-root .myprofile-title")) === "About Capstone Bible", "title");
  h.assert(await h.exists('.about-root .back-btn[aria-label="Close About Capstone Bible"]'), "Back button");
  const got = await wording(h, ".about-root");
  h.assert(JSON.stringify(got) === JSON.stringify(EXPECTED), `wording matches the data module (${got.length}/${EXPECTED.length} blocks)`);
  if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify(got, null, 1));
  h.assert(await h.evaluate(() => document.querySelector(".about-text").firstElementChild.matches("blockquote.about-quote")), "pull quote is first");
  h.assert((await h.evaluate(() => [...document.querySelectorAll(".about-text h3")].map((e) => e.textContent).join("|"))) === "On the use of AI", "one section heading");
  h.assert(!(await h.exists(".app-header .search-bar")), "no header search over the page");
  const g = await gutter(h, ".about-text blockquote, .about-text p, .about-text h3, .about-report");
  h.assert(g >= 16 && !(await overflow(h)), `no sideways overflow, gutter ${g}px`);
  await shot("top");
  const scrolled = await h.evaluate(() => {
    const b = document.querySelector(".about-root .myprofile-body");
    b.scrollTo({ top: b.scrollHeight, behavior: "instant" });
    const r = document.querySelector(".about-report").getBoundingClientRect();
    return { more: b.scrollHeight > b.clientHeight, top: b.scrollTop, reportBottom: r.bottom, bodyBottom: b.getBoundingClientRect().bottom };
  });
  h.assert(scrolled.more && scrolled.top > 0 && scrolled.reportBottom <= scrolled.bodyBottom + 1, `scrolls to the end ${JSON.stringify(scrolled)}`);
  await h.sleep(200);
  await shot("end");

  // ---- menu while open, then Back ----
  await openMenu();
  const current = await h.evaluate(() => [...document.querySelectorAll('.mobile-nav-menu-dropdown [aria-current="page"], .panel-menu-dropdown [aria-current="page"]')].map((e) => e.querySelector("[class$=label]").textContent));
  h.assert(JSON.stringify(current) === '["About Capstone Bible"]', `menu marks only About as current ${JSON.stringify(current)}`);
  if (phone) await esc(h);
  else { await h.click(row); await h.sleep(300); h.assert(!(await h.exists(".about-root")), "desktop: picking it again closes it"); await openAbout(); }
  await h.click(".about-root .back-btn");
  await h.sleep(300);
  h.assert(!(await h.exists(".about-root")) && (await h.exists(".bible-panel")), "Back returns to the Bible panel");

  // ---- over Timeline: Back lands on Timeline ----
  await goTimeline();
  await openAbout();
  await h.click(".about-root .back-btn"); await h.sleep(300);
  h.assert(!(await h.exists(".about-root")) && (await h.exists(".timeline-mode")), "Back from over Timeline lands on Timeline");

  // ---- navigating elsewhere closes it ----
  await openAbout();
  if (phone) await h.click({ css: ".mobile-tab", text: "Map" });
  else { await openMenu(); await h.click({ css: ".panel-menu-link", text: "Games" }); }
  await h.sleep(500);
  h.assert(!(await h.exists(".about-root")), phone ? "bottom bar tap closes it" : "Go to Games closes it");
  await openAbout();
  if (phone) { await openMenu(); await h.click({ css: ".mobile-nav-menu-item", text: "Bible" }); }
  else await goTimeline();
  await h.sleep(500);
  h.assert(!(await h.exists(".about-root")), "main menu destination closes it");

  // ---- Settings and About never stack ----
  await openAbout();
  await h.click('[aria-label="Settings and account"]'); await h.sleep(300);
  await h.click({ css: ".auth-menu-item", text: "Settings" }); await h.sleep(300);
  h.assert((await h.exists(".settings-root")) && !(await h.exists(".about-root")), "Settings replaces About");
  await openAbout();
  h.assert(!(await h.exists(".settings-root")), "About replaces Settings");

  // ---- report from the foot of the page ----
  await h.click(".about-report");
  await h.waitFor(".report-sheet"); await h.sleep(500);
  h.assert(/Reporting from:\s*About Capstone Bible/.test(await h.text(".report-sheet")), "report form says it is from About");
  await shot("report");
  await h.evaluate(() => {
    const s = document.querySelector(".report-sheet select");
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, "incorrect_info");
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await h.type(".report-sheet input[type=text]", "Harness report");
  await h.type(".report-sheet textarea", "Filed by the about-page check.");
  await h.click({ css: ".report-sheet button", text: "Send report" }); await h.sleep(700);
  const write = h.writes.find((w) => JSON.stringify(w).includes("Harness report"));
  h.assert(!!write && JSON.stringify(write).includes('"about"'), `report written with route about`);
  await h.click({ css: ".report-sheet button", text: "Done" }); await h.sleep(300);
  h.assert(!(await h.exists(".report-sheet")) && (await h.exists(".about-root")), "closing the form leaves About open");

  // ---- light, dark and every skin ----
  for (const [skin, theme] of [["default", "light"], ["default", "dark"], ...SKINS.slice(1).map((s) => [s, "light"])]) {
    await h.evaluate((s) => { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); }, skin);
    await h.setTheme(theme);
    await h.reload(); await h.sleep(1500);
    await openAbout();
    const applied = await h.evaluate(() => [document.documentElement.getAttribute("data-skin") ?? "default", document.documentElement.getAttribute("data-theme")]);
    const c = await contrast(h, [".about-quote", ".about-text p", ".about-text h3", ".about-report"]);
    const gg = await gutter(h, ".about-text blockquote, .about-text p, .about-text h3");
    h.assert(applied[0] === skin && c.every((x) => x.ratio >= 4.5) && gg >= 16 && !(await overflow(h)),
      `${skin}/${theme} (${applied.join(",")}): contrast ${c.map((x) => x.ratio).join("/")}, gutter ${gg}px`);
    await shot(`${skin}-${theme}`);
  }
  h.assert(h.consoleErrors.length === 0, `no page errors ${JSON.stringify(h.consoleErrors).slice(0, 300)}`);
};
