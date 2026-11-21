/**
 * Capstone Plus web payments (sql/045, src/lib/billing.ts, components/CapstonePlus.tsx).
 *
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 \
 *     --script scripts/signed-in-harness/examples/billing.mjs
 *   # the teaser section needs a server build and the seed:
 *   node scripts/paid-content/split.mjs
 *   PAID_CONTENT_SOURCE=server node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 \
 *     --script scripts/signed-in-harness/examples/billing.mjs
 *
 * Proves, against the real production build:
 *   1. billing_status MISSING (sql/045 not applied — production today): no Capstone Plus row, no
 *      Upgrade anywhere, no request to any billing Edge Function. Nothing changed for anyone.
 *   2. billing_status says billing_enabled = false: the same.
 *   3. billing on, no subscription: the account menu has "Capstone Plus" with Monthly / Yearly; a click
 *      calls create-checkout-session with ONLY {plan, return_to} (no price id from the client); the
 *      harness has no Edge Functions, so the readable error shows instead of a dead button.
 *   4. billing on, live subscription: status line + "Manage subscription" (create-portal-session), no
 *      plan picker.
 *   5. ?plus=cancel is stripped from the address bar and shows the "nothing was charged" notice.
 *   6. (server build) gated reader with billing on: the article teaser's Upgrade opens the picker.
 *
 * Cannot prove: Stripe itself, the Edge Functions, real RLS (sql/tests/045_stripe_billing_test.sql).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const MODE = process.env.PAID_CONTENT_SOURCE || JSON.parse(fs.readFileSync(path.join(REPO, "paid-content.config.json"), "utf8")).appSource;

const FN_CAPTURE = `
  (() => {
    const orig = window.fetch;
    window.__fnCalls = [];
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/functions/v1/")) {
        window.__fnCalls.push({ url: url.replace(/^.*\\/functions\\/v1\\//, ""), body: init && init.body ? String(init.body) : null });
      }
      return orig.apply(this, arguments);
    };
  })();
`;

const status = (over = {}) => ({ billing_enabled: true, has_plus: false, has_customer: false, subscription: null, ...over });

async function openMenu(h) {
  await h.click('[aria-label="Settings and account"]');
  await h.sleep(300);
}
const menuText = (h) => h.evaluate(() => document.querySelector(".auth-dropdown")?.innerText ?? "");
const fnCalls = (h) => h.evaluate(() => window.__fnCalls ?? []);
const billingFnRequests = (h, from) => h.requests.slice(from).filter((r) => /functions\/v1\/create-(checkout|portal)-session/.test(r.path));

export default async function (h) {
  await h.addInitScript(FN_CAPTURE);

  h.section("1. sql/045 not applied: billing_status does not exist");
  h.backend.setRpc("billing_status", () => {
    throw { status: 404, code: "PGRST202", message: "Could not find the function public.billing_status" };
  });
  let mark = h.requests.length;
  await h.reload();
  await h.sleep(800);
  await openMenu(h);
  h.assert(!/Capstone Plus/.test(await menuText(h)), "no Capstone Plus row when the rpc is missing");
  h.assert(!(await h.exists(".plus-plans")), "no plan picker anywhere");
  h.assert(h.requests.slice(mark).some((r) => r.path.startsWith("/rest/v1/rpc/billing_status")), "the app asked billing_status (and failed closed)");
  h.assert(billingFnRequests(h, mark).length === 0, "no billing Edge Function was called");

  h.section("2. billing_enabled = false");
  h.backend.setRpc("billing_status", () => status({ billing_enabled: false, has_plus: true }));
  mark = h.requests.length;
  await h.reload();
  await h.sleep(800);
  await openMenu(h);
  h.assert(!/Capstone Plus/.test(await menuText(h)), "no Capstone Plus row while the switch is off");
  h.assert(billingFnRequests(h, mark).length === 0, "no billing Edge Function was called");

  h.section("3. billing on, no subscription: Upgrade");
  h.backend.setRpc("billing_status", () => status());
  await h.reload();
  await h.sleep(800);
  await openMenu(h);
  h.assert(/Capstone Plus/.test(await menuText(h)), "Capstone Plus row appears");
  await h.click({ css: ".auth-menu-item", text: "Capstone Plus" });
  await h.sleep(300);
  h.assert(await h.exists({ css: ".plus-plans button", text: "Monthly" }), "Monthly button");
  h.assert(await h.exists({ css: ".plus-plans button", text: "Yearly" }), "Yearly button");
  h.assert(!(await h.exists({ css: "button", text: "Manage subscription" })), "no Manage button without a customer");
  const vw = await h.evaluate(() => window.innerWidth);
  const r = await h.evaluate(() => {
    const b = document.querySelector(".plus-account")?.closest(".auth-dropdown")?.getBoundingClientRect();
    return b ? { left: b.left, right: b.right } : null;
  });
  h.assert(r && r.left >= 0 && r.right <= vw + 0.5, `Capstone Plus view fits the ${vw}px viewport (${r && Math.round(r.left)}..${r && Math.round(r.right)})`);
  await h.screenshot(`billing-upgrade-${vw}.png`);
  await h.click({ css: ".plus-plans button", text: "Monthly" });
  await h.sleep(800);
  const calls = await fnCalls(h);
  const co = calls.find((c) => c.url.startsWith("create-checkout-session"));
  h.assert(!!co, "create-checkout-session was invoked");
  const body = co?.body ? JSON.parse(co.body) : {};
  h.assert(body.plan === "monthly", `plan sent as monthly (${co?.body})`);
  h.assert(Object.keys(body).sort().join(",") === "plan,return_to", "the client sends only plan + return_to, never a price id");
  h.assert(await h.exists(".plus-error"), "harness has no Edge Functions: a readable error shows, the buttons re-enable");
  h.assert(!(await h.evaluate(() => document.querySelector(".plus-plans button")?.disabled)), "buttons are usable again after the failure");

  h.section("4. billing on, active subscription: Manage");
  h.backend.setRpc("billing_status", () =>
    status({
      has_plus: true,
      has_customer: true,
      subscription: { status: "active", interval: "year", current_period_end: "2027-11-21T00:00:00Z", cancel_at_period_end: false },
    })
  );
  await h.reload();
  await h.sleep(800);
  await openMenu(h);
  await h.click({ css: ".auth-menu-item", text: "Capstone Plus" });
  await h.sleep(300);
  const t = await h.text(".plus-account");
  h.assert(/You have Capstone Plus\. Renews on/.test(t), `status line: ${t.replace(/\s+/g, " ").slice(0, 90)}`);
  h.assert(!(await h.exists(".plus-plans")), "no plan picker for a subscriber");
  await h.click({ css: "button", text: "Manage subscription" });
  await h.sleep(800);
  h.assert((await fnCalls(h)).some((c) => c.url.startsWith("create-portal-session")), "Manage calls create-portal-session");

  h.section("5. return from Stripe: ?plus=cancel");
  await h.goto("/?plus=cancel");
  await h.sleep(1000);
  h.assert(/Nothing was charged/.test((await h.text(".plus-return")) ?? ""), "cancel notice shows");
  h.assert(!(await h.evaluate(() => location.search.includes("plus="))), "?plus= is stripped from the address bar");

  if (MODE === "server") {
    h.section("6. server build, gated reader, billing on: teaser Upgrade");
    const SEED = JSON.parse(fs.readFileSync(path.join(REPO, "scripts/paid-content/out/content_paid.json"), "utf8"));
    h.backend.setTable("content_paid", SEED);
    h.backend.setRpc("has_entitlement", () => false);
    h.backend.setRpc("billing_status", () => status());
    await h.reload();
    await h.sleep(800);
    const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
    if (phone) await h.click({ css: ".mobile-tab", text: "Articles" });
    await h.type(".articles-search input", "Demons");
    await h.sleep(300);
    await h.click(".articles-result-row");
    await h.waitFor(".paid-teaser h4");
    h.assert(await h.exists({ css: ".paid-teaser button", text: "Upgrade to Plus" }), "teaser has Upgrade when billing is on");
    await h.click({ css: ".paid-teaser button", text: "Upgrade to Plus" });
    await h.sleep(300);
    h.assert(await h.exists(".paid-teaser .plus-plans"), "Upgrade opens the Monthly / Yearly picker in place");
    await h.screenshot(`billing-teaser-${await h.evaluate(() => window.innerWidth)}.png`);

    h.backend.setRpc("billing_status", () => status({ billing_enabled: false }));
    await h.reload();
    await h.sleep(800);
    if (phone) await h.click({ css: ".mobile-tab", text: "Articles" });
    await h.type(".articles-search input", "Demons");
    await h.sleep(300);
    await h.click(".articles-result-row");
    await h.waitFor(".paid-teaser h4");
    h.assert(!(await h.exists({ css: ".paid-teaser button", text: "Upgrade to Plus" })), "billing off: teaser has no Upgrade");
    h.assert(await h.exists(".paid-teaser-soon"), "billing off: teaser still says Plus is coming");
  }
}
