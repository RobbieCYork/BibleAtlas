/**
 * How a reader reaches My Profile. Desktop: a labelled "My Profile" row first in the account menu and
 * in the main menu's "Go to" list (plus the account menu's name card), working from every screen. Phone:
 * the bottom-bar tab and the header menu row, with the account menu left as it was.
 *
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 1280x800 --script scripts/signed-in-harness/examples/profile-menu-entry.mjs
 *   ...also --persona member, and --viewport 769x700, 900x600, 390x844.
 *
 * The owner is checked in Test view and in Live view. Every check reads the live DOM.
 */
import { MENU_BUTTON } from "../lib/app.mjs";
import { FEATURE_KEYS } from "../lib/fixtures.mjs";

const AVATAR = '[aria-label="Settings and account"]';
const ROW = '.auth-menu-item[data-menu="profile"]';
const CARD = ".auth-identity-link";
const GO = '.panel-menu-link[data-menu="profile"]';
const SCREENS = ["panels", "Timeline", "Games", "Settings", "About"];

export default async function (h) {
  const w = await h.evaluate(() => window.innerWidth);
  const phone = w <= 768;
  const shot = (n) => h.screenshot(`profile-entry-${h.persona}-${h.viewport}-${n}.png`);

  /** What is painted in the middle of the work area. */
  const onTop = () => h.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight * 0.6);
    const page = el?.closest(".myprofile-root");
    if (page) return page.getAttribute("aria-label") ?? page.querySelector(".myprofile-title")?.textContent;
    if (el?.closest(".game-mode")) return "Games";
    if (el?.closest(".timeline-mode")) return "Timeline";
    return "panels";
  });
  const fresh = async (testView) => {
    await h.evaluate((v) => localStorage.setItem("feature-test-view-v1", v), testView);
    await h.reload(); await h.sleep(1600);
  };
  const goTo = async (screen) => {
    if (screen === "panels") return;
    if (screen === "Settings") { await h.click(AVATAR); await h.sleep(200); await h.click({ css: ".auth-menu-item", text: "Settings" }); }
    else {
      await h.click(MENU_BUTTON); await h.sleep(200);
      const text = screen === "About" ? "About Capstone" : screen;
      await h.click({ css: phone ? ".mobile-nav-menu-item" : ".panel-menu-link", text });
    }
    await h.sleep(600);
  };
  /** A dropdown's box, its rows, and which rows are not fully visible and clickable. */
  const menu = (sel) => h.evaluate((s) => {
    const d = document.querySelector(s);
    const box = d.getBoundingClientRect();
    const rows = [...d.querySelectorAll("button[data-menu], label[data-menu]")];
    return {
      inside: box.left >= 0 && box.right <= innerWidth + 0.5 && box.bottom <= innerHeight + 0.5,
      scrolls: d.scrollHeight > d.clientHeight + 1,
      sideways: document.documentElement.scrollWidth > innerWidth + 1 || d.scrollWidth > d.clientWidth + 1,
      keys: rows.map((e) => e.dataset.menu),
      hidden: rows.filter((e) => { const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(hit === e || e.contains(hit)); }).map((e) => e.dataset.menu),
    };
  }, sel);

  const views = h.persona === "owner" ? [["Test view", "1"], ["Live view", "0"]] : [["Live view", "0"]];
  for (const [view, flag] of views) {
    h.section(`${h.persona} ${view} ${h.viewport}`);
    await fresh(flag);

    await h.click(AVATAR); await h.sleep(300);
    const account = await menu(".auth-dropdown");
    h.assert(account.inside && !account.sideways && account.hidden.length === 0, `account menu fits, every row clickable ${JSON.stringify(account)}`);
    if (phone) {
      h.assert(!(await h.exists(ROW)) && !(await h.exists(CARD)), "phone account menu is unchanged: no My Profile row or header link");
      await shot(`${flag}-account-menu`);

      await fresh(flag);
      h.assert(await h.exists('.mobile-tab[data-menu="social"]'), "phone bottom bar has the My Profile tab");
      for (const screen of SCREENS) {
        await fresh(flag); await goTo(screen);
        await h.click('.mobile-tab[data-menu="social"]'); await h.sleep(700);
        h.assert((await onTop()) === "My Profile", `tab from ${screen} shows My Profile`);
        await fresh(flag); await goTo(screen);
        await h.click(MENU_BUTTON); await h.sleep(200); await h.click('.mobile-nav-menu-item[data-menu="social"]'); await h.sleep(700);
        h.assert((await onTop()) === "My Profile", `menu row from ${screen} shows My Profile`);
      }
      continue;
    }

    const first = await h.evaluate(() => {
      const row = document.querySelector(".auth-dropdown .auth-menu-item");
      return { key: row.dataset.menu, text: row.innerText.trim(), icon: !!row.querySelector("svg") };
    });
    h.assert(first.key === "profile" && first.text === "My Profile" && first.icon, `first account menu row is My Profile with an icon ${JSON.stringify(first)}`);
    h.assert(await h.exists(CARD), "the name card is still a link");
    await shot(`${flag}-account-menu`);

    await fresh(flag);
    await h.click(MENU_BUTTON); await h.sleep(300);
    const main = await menu(".panel-menu-dropdown");
    h.assert(main.inside && !main.sideways, `main menu stays on screen ${JSON.stringify(main)}`);
    // A short window scrolls the menu (existing behaviour); then rows below the fold are not a fault.
    h.assert(main.scrolls || main.hidden.length === 0, `main menu: every row clickable ${JSON.stringify(main.hidden)}`);
    const order = main.keys.filter((k) => ["timeline", "profile", "games"].includes(k));
    h.assert(order.join() === "timeline,games,profile", `Go to order matches the phone menu: ${order}`);
    h.assert(await h.evaluate((s) => !!document.querySelector(`${s} svg`) && document.querySelector(s).innerText.includes("My Profile"), GO), "Go to row is labelled and has an icon");
    console.log(`  main menu scrolls: ${main.scrolls}`);
    await shot(`${flag}-main-menu`);

    for (const [name, open] of [["account row", [AVATAR, ROW]], ["name card", [AVATAR, CARD]], ["Go to row", [MENU_BUTTON, GO]]]) {
      for (const screen of SCREENS) {
        await fresh(flag); await goTo(screen);
        await h.click(open[0]); await h.sleep(200); await h.click(open[1]); await h.sleep(700);
        const top = await onTop();
        h.assert(top === "My Profile", `${name} from ${screen} shows My Profile (got ${top})`);
        if (screen === "Games") await shot(`${flag}-${name.replace(/ /g, "-")}-from-games`);
      }
    }

    // On My Profile the Go to row is the current one, and picking it again goes back to the panels.
    await fresh(flag);
    await h.click(MENU_BUTTON); await h.click(GO); await h.sleep(700);
    await shot(`${flag}-profile`);
    await h.click(MENU_BUTTON); await h.sleep(250);
    h.assert((await h.evaluate((s) => document.querySelector(s).getAttribute("aria-current"), GO)) === "page", "Go to row is marked current");
    h.assert((await h.count('.panel-menu-link[aria-current="page"]')) === 1, "and it is the only current row");
    await shot(`${flag}-main-menu-current`);
    await h.click(GO); await h.sleep(500);
    h.assert((await onTop()) === "panels", "picking it again returns to the panels");
    // Back button, and leaving for another destination.
    await h.click(AVATAR); await h.click(ROW); await h.waitFor(".myprofile-root"); await h.sleep(400);
    await h.click('[aria-label="Close My Profile"]'); await h.sleep(400);
    h.assert((await onTop()) === "panels", "Back closes My Profile");
    for (const screen of ["Timeline", "Games"]) {
      await h.click(MENU_BUTTON); await h.click(GO); await h.sleep(500);
      await goTo(screen);
      h.assert((await onTop()) === screen && !(await h.exists(".myprofile-root")), `Go to ${screen} leaves My Profile`);
    }
  }

  // My Profile has no Testing/Live stage: with every flag in Testing it is still offered.
  h.section(`${h.persona} every feature in Testing, ${h.viewport}`);
  h.backend.setTable("feature_release", FEATURE_KEYS.map((feature) => ({ feature, live: false, updated_at: null, updated_by: null })));
  await fresh("0");
  if (phone) h.assert(await h.exists('.mobile-tab[data-menu="social"]'), "tab still there");
  else {
    await h.click(AVATAR); await h.sleep(200);
    h.assert(await h.exists(ROW), "account row still there");
    await fresh("0");
    await h.click(MENU_BUTTON); await h.sleep(200);
    h.assert(await h.exists(GO), "Go to row still there");
    await shot("all-testing-main-menu");
  }
}
