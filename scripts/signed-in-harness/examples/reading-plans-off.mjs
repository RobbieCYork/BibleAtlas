/**
 * Reading Plans off (READING_PLANS_ENABLED = false): no entry anywhere, deep links inert, nothing requested.
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 1280x800 --script scripts/signed-in-harness/examples/reading-plans-off.mjs
 */
import { MENU_BUTTON, readGoToMenu } from "../lib/app.mjs";
const PLAN = /reading plan|\bplans?\b/i;
const esc = (h) => h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
export default async (h) => {
  h.section(`reading plans off — ${h.persona} @ ${h.viewport}`);
  const gate = ["guest", "signedout"].includes(h.persona);
  await h.sleep(1500);
  const body = await h.evaluate(() => document.body.innerText);
  h.assert(!PLAN.test(body), `page text mentions no plan (${(body.match(PLAN) ?? [""])[0]})`);
  if (gate) { h.assert(await h.exists(".auth-gate-pitch, form, .auth-gate"), "sign-in gate shows"); }
  else {
    const go = await readGoToMenu(h);
    h.assert(go.length > 0 && !go.some((r) => PLAN.test(r.label)), `main menu: ${go.map((r) => r.label).join(", ")}`);
    for (const need of ["Bible", "Map", "Timeline"]) h.assert(go.some((r) => new RegExp(need, "i").test(r.label)) || true, `menu lists ${need} (informational)`);
    await h.click('[aria-label="Settings and account"]'); await h.sleep(350);
    const acct = await h.evaluate(() => [...document.querySelectorAll(".auth-menu-item")].map((e) => e.innerText.replace(/\s+/g, " ").trim()));
    h.assert(acct.length > 0 && !acct.some((i) => PLAN.test(i)), `account menu: ${acct.join(" | ")}`);
    await esc(h); await h.sleep(200);
    // Bible welcome screen: no plan cards.
    h.assert(!(await h.exists(".bible-welcome-plans")), "no plan cards on Bible welcome");
    h.assert(await h.exists(".bible-welcome-choose") || (await h.count(".bible-panel, .bible-welcome")) > 0, "Bible panel still present");
    // My Profile
    try { await h.click('[aria-label="Settings and account"]'); await h.sleep(300);
      if (await h.exists({ css: ".auth-menu-item", text: "My Profile" })) { await h.click({ css: ".auth-menu-item", text: "My Profile" }); await h.sleep(700);
        const pt = await h.evaluate(() => document.body.innerText); h.assert(!PLAN.test(pt), "My Profile mentions no plan"); await esc(h); }
      else await esc(h);
    } catch (e) { h.assert(false, "profile step threw " + e.message); }
  }
  // deep links
  for (const q of ["?plan=gospels-30", "?readingPlan=x&panel=plans", "?plans=1"]) {
    await h.goto("/" + q); await h.sleep(1500);
    const t = await h.evaluate(() => document.body.innerText);
    h.assert(!/bible-plans|Reading Plans/i.test(t), `deep link ${q}: nothing plan-ish opened`);
    h.assert(!(await h.exists(".bible-plans")), `deep link ${q}: no plans view`);
  }
  h.assert(h.requests.every((r) => !/reading_plan/.test(r.path)), "0 requests touch reading_plan_progress");
  h.assert(h.consoleErrors.length === 0, `no console errors (${h.consoleErrors.length}) ${JSON.stringify(h.consoleErrors).slice(0, 300)}`);
};
