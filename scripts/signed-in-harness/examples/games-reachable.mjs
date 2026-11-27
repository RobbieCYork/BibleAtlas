/**
 * Games & Trivia in Testing (the state production was in from 2026-10-25) as the owner, a member, and
 * the owner after Test view / Live: the hamburger row, the bottom-bar button and the Settings switch
 * must always agree.
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 375x667 --script scripts/signed-in-harness/examples/games-reachable.mjs
 */
import { openAdminConsole, MENU_BUTTON } from "../lib/app.mjs";

const ALL = ["Bible", "Map", "Timeline", "Notes", "Articles", "My Profile", "Games"];
const NO_GAMES = ALL.filter((l) => l !== "Games");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const bar = (h) => h.evaluate(() => [...document.querySelectorAll(".mobile-tab .mobile-tab-label")].map((e) => e.childNodes[0].textContent.trim()));

async function menu(h) {
  await h.click(MENU_BUTTON);
  await h.sleep(300);
  const rows = await h.evaluate(() => [...document.querySelectorAll(".mobile-nav-menu-item:not(.mobile-nav-menu-about):not(.mobile-nav-menu-tour) .mobile-nav-menu-label")].map((e) => e.childNodes[0].textContent.trim()));
  await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await h.sleep(150);
  return rows;
}

/** Settings, from the account menu's own row where there is one, otherwise hamburger -> My Profile ->
 * Settings. Neither needs the My Profile button to be in the bar. */
async function openSettings(h) {
  if (!(await h.exists(".auth-tabbar-list"))) {
    await h.click('[aria-label="Settings and account"]');
    await h.sleep(300);
    if (await h.exists({ css: ".auth-menu-item", text: "Settings" })) {
      await h.click({ css: ".auth-menu-item", text: "Settings" });
    } else {
      await h.click(MENU_BUTTON);
      await h.click({ css: ".mobile-nav-menu-item", text: "My Profile" });
      if (!(await h.exists(".auth-tabbar-list"))) await h.click({ css: "button", text: "Settings" });
    }
  }
  await h.waitFor(".auth-tabbar-list");
}

const settingsRows = (h) => h.evaluate(() => [...document.querySelectorAll(".auth-tabbar-row")].map((li) => {
  const input = li.querySelector("input");
  return {
    label: li.querySelector(".auth-tabbar-name").textContent.replace(/\(Testing.*\)/, "").trim(),
    state: input ? (input.checked ? "on" : "off") : li.querySelector(".auth-tabbar-always")?.textContent.trim(),
    disabled: input?.disabled ?? null,
    marker: !!li.querySelector(".release-testing-marker"),
  };
}));
const notice = (h) => h.evaluate(() => document.querySelector(".auth-tabbar-testing p")?.innerText.trim() ?? null);
const toggle = async (h, label) => {
  await h.click(`.auth-tabbar-switch:has(input[aria-label="Show ${label} in the navigation bar"])`);
  await h.sleep(250);
};
const setLive = (h, feature, live) => { h.backend.tables.feature_release.find((r) => r.feature === feature).live = live; };

/** Every tab inside the screen, none overlapping, every label inside its tab. */
const barGeometry = (h) => h.evaluate(() => {
  const tabs = [...document.querySelectorAll(".mobile-tab")].map((t) => {
    const r = t.getBoundingClientRect();
    const l = t.querySelector(".mobile-tab-label");
    return { left: r.left, right: r.right, h: r.height, truncated: l.scrollWidth > l.clientWidth };
  });
  return {
    n: tabs.length,
    inside: tabs.every((t) => t.left >= -0.5 && t.right <= innerWidth + 0.5),
    overlap: tabs.some((t, i) => i && t.left < tabs[i - 1].right - 0.5),
    minWidth: Math.round(Math.min(...tabs.map((t) => t.right - t.left))),
    truncated: tabs.filter((t) => t.truncated).length,
  };
});

export default async function (h) {
  h.section("1. Games & Trivia in Testing, owner in Live view (Robbie's phone)");
  setLive(h, "games_trivia", false);
  await h.reload(); await h.sleep(1500);
  h.assert(same(await bar(h), NO_GAMES), `bar has no Games: ${(await bar(h)).join(", ")}`);
  h.assert(same(await menu(h), NO_GAMES), "hamburger has no Games");
  await openSettings(h);
  let rows = await settingsRows(h);
  const games = () => rows.find((r) => r.label === "Games");
  h.assert(games()?.state === "In Testing" && games().disabled === null, `Settings: Games row says "In Testing" and has no switch (${JSON.stringify(games())})`);
  const text = await notice(h);
  h.assert(/Games is in Testing/.test(text ?? "") && /Admin Console, then Features/.test(text ?? ""), `notice: ${text}`);
  await h.evaluate(() => document.querySelector(".auth-tabbar-testing").scrollIntoView({ block: "center", behavior: "instant" }));
  console.log("  screenshot:", await h.screenshot("settings-live-view.png"));

  h.section("2. Switch to Test view from Settings");
  await h.click({ css: ".auth-tabbar-testing button", text: "Switch to Test view" });
  await h.sleep(400);
  h.assert(same(await bar(h), ALL), `bar now: ${(await bar(h)).join(", ")}`);
  rows = await settingsRows(h);
  h.assert(games().state === "on" && !games().disabled && games().marker, `Games row has a live switch and the Testing dot (${JSON.stringify(games())})`);
  h.assert((await notice(h)) === null, "notice gone");
  await h.evaluate(() => document.querySelector(".auth-tabbar-list").scrollIntoView({ block: "center", behavior: "instant" }));
  console.log("  screenshot:", await h.screenshot("settings-test-view.png"));
  h.assert(same(await menu(h), ALL), "hamburger lists all seven");
  let geo = await barGeometry(h);
  h.assert(geo.n === 7 && geo.inside && !geo.overlap, `seven buttons fit: ${JSON.stringify(geo)}`);

  h.section("3. Every switch moves the bar (no slot limit)");
  for (const label of ["Games", "Articles", "Map", "Timeline", "Notes"]) {
    await openSettings(h);
    await toggle(h, label);
    h.assert(!(await bar(h)).includes(label), `${label} off -> gone from the bar`);
    await openSettings(h);
    await toggle(h, label);
    h.assert(same(await bar(h), ALL), `${label} on -> back, all seven in order`);
  }
  // Wherever switching off My Profile leaves the reader, it has to be possible to switch it back on.
  await openSettings(h);
  await toggle(h, "My Profile");
  h.assert(!(await bar(h)).includes("My Profile"), "My Profile off -> gone from the bar");
  h.assert((await menu(h)).includes("My Profile"), "the hamburger still lists My Profile");
  await openSettings(h);
  await toggle(h, "My Profile");
  h.assert(same(await bar(h), ALL), "My Profile on -> back, all seven");

  h.section("4. Hamburger and bar both open Games");
  await h.click(MENU_BUTTON);
  await h.click({ css: ".mobile-nav-menu-item", text: "Games" });
  await h.waitFor(".game-center-card");
  h.assert((await h.count(".game-center-card")) === 5, "hamburger -> Game Center, 5 games");
  await h.click({ css: ".mobile-tab", text: "Bible" });
  await h.click({ css: ".mobile-tab", text: "Games" });
  await h.waitFor(".game-center-card");
  h.assert(await h.exists(".mobile-tab.active", {}), "bar -> Game Center");
  console.log("  screenshot:", await h.screenshot("game-center-test-view.png"));

  h.section("5. Owner makes Games Live in Admin Console, then returns to Live view");
  await openAdminConsole(h);
  await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Features" });
  await h.click('button[aria-label^="Games & Trivia: Testing"]');
  await h.waitFor('button[aria-label^="Games & Trivia: Live"]');
  console.log("  screenshot:", await h.screenshot("admin-features-games-live.png"));
  await h.click({ css: ".release-view-option", text: "Live view" });
  await h.reload(); await h.sleep(1500);
  h.assert(same(await bar(h), ALL), `Live view bar: ${(await bar(h)).join(", ")}`);
  h.assert(same(await menu(h), ALL), "Live view hamburger lists all seven");
  await openSettings(h);
  rows = await settingsRows(h);
  h.assert(games().state === "on" && !games().marker && (await notice(h)) === null, "plain Games switch, no marker, no notice");
  console.log("  screenshot:", await h.screenshot("settings-games-live.png"));

  h.section("6. A member while Games is in Testing: no row, no notice, minimum counts real buttons");
  setLive(h, "games_trivia", false);
  await h.asPersona("member");
  await openSettings(h);
  rows = await settingsRows(h);
  h.assert(!games() && rows.length === 6 && (await notice(h)) === null, `member rows: ${rows.map((r) => r.label).join(", ")}`);
  for (const label of ["Map", "Timeline", "Notes", "Articles"]) await toggle(h, label);
  rows = await settingsRows(h);
  h.assert(same(await bar(h), ["Bible", "Articles", "My Profile"]), `member cannot go below 3 real buttons: ${(await bar(h)).join(", ")}`);
  h.assert(await h.exists(".auth-tabbar-limit"), "and the minimum line says why");
  h.assert((await menu(h)).includes("Games") === false, "member hamburger has no Games");

  h.section("7. A member once Games is Live");
  setLive(h, "games_trivia", true);
  await h.evaluate(() => localStorage.removeItem("mobile-tab-bar-visible-v1"));
  await h.reload(); await h.sleep(1500);
  h.assert(same(await bar(h), ALL) && same(await menu(h), ALL), "member sees Games in the bar and the hamburger");
}
