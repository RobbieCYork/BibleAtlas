/**
 * Worked example (a): the owner's Features tab and what a Testing flag does to who sees what.
 *   node scripts/signed-in-harness/run.mjs --persona owner --script scripts/signed-in-harness/examples/features-testing-live.mjs
 * The script switches persona itself with h.asPersona(), against one shared fake database.
 */
import { openAdminConsole, adminTabs, readGoToMenu, testStripText } from "../lib/app.mjs";

export default async function (h) {
  h.section("1. Who gets a Features tab");
  await openAdminConsole(h);
  let tabs = await adminTabs(h);
  h.assert(tabs.includes("Features"), `owner: Admin Console has a Features tab (${tabs.join(", ")})`);
  h.assert(await h.exists('[role=group][aria-label="View the app as"]'), "owner: Live/Test switch is drawn");

  await h.asPersona("administrator");
  const adminHasConsole = await openAdminConsole(h);
  tabs = adminHasConsole ? await adminTabs(h) : [];
  h.assert(adminHasConsole && tabs.length > 0, `administrator: Admin Console opens (${tabs.join(", ")})`);
  h.assert(!tabs.includes("Features"), "administrator: NO Features tab");
  h.assert(!(await h.exists('[role=group][aria-label="View the app as"]')), "administrator: no Live/Test switch");

  await h.asPersona("member");
  h.assert(!(await openAdminConsole(h)), "member: no Admin Console entry at all");

  h.section("2. Owner flips Games & Trivia to Testing");
  await h.asPersona("owner");
  let menu = await readGoToMenu(h);
  h.assert(menu.some((r) => r.label === "Games" && !r.marker), `owner, Live view, before: Games is in the menu, unmarked (${menu.map((r) => r.label).join(", ")})`);
  await openAdminConsole(h);
  await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Features" });
  await h.waitFor(".release-list");
  await h.click('button[aria-label^="Games & Trivia: Live"]');
  await h.waitFor('button[aria-label^="Games & Trivia: Testing"]');
  h.assert(h.audit.length === 1 && h.audit[0].feature === "games_trivia" && h.audit[0].to_live === false,
    `fake audit log recorded the flip: ${JSON.stringify(h.audit[0])}`);

  h.section("3. Live view: the owner sees what a member sees");
  await h.reload();
  menu = await readGoToMenu(h);
  h.assert(!menu.some((r) => r.label === "Games"), `owner, Live view: Games entry hidden (${menu.map((r) => r.label).join(", ")})`);
  h.assert((await testStripText(h)) === null, "owner, Live view: no Test-view strip");

  h.section("4. Test view: the owner sees it, marked orange");
  await openAdminConsole(h);
  await h.click({ css: ".release-view-option", text: "Test view" });
  await h.sleep(300);
  h.assert(/Test view/.test((await testStripText(h)) ?? ""), `owner, Test view: strip says "${await testStripText(h)}"`);
  await h.reload();
  menu = await readGoToMenu(h);
  const games = menu.find((r) => r.label === "Games");
  h.assert(games && games.marker, "owner, Test view: Games entry is back, with the orange Testing marker");

  h.section("5. A member never sees it, even though the Test-view preference is still in this browser");
  await h.asPersona("member");
  h.assert((await h.evaluate(() => localStorage.getItem("feature-test-view-v1"))) === "1", "precondition: test-view preference is stored in the browser");
  menu = await readGoToMenu(h);
  h.assert(!menu.some((r) => r.label === "Games"), `member: Games entry hidden (${menu.map((r) => r.label).join(", ")})`);
  h.assert(!(await h.exists(".release-testing-marker")) && (await testStripText(h)) === null, "member: no orange marker, no strip");

  const wide = await h.screenshot("features-member.png");
  console.log("  screenshot (a hint, not evidence):", wide);
}
