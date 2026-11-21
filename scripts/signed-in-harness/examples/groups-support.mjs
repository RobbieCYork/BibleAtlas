/**
 * sql/050: audited owner support access. Owner "Class support" tab (reason required, one class at a time),
 * administrators do not get the tab, and the class owner's Support access log + grant button.
 *
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 390x844 --script scripts/signed-in-harness/examples/groups-support.mjs
 * Cannot prove: the SQL (sql/tests/050_groups_support_access_test.sql).
 */
import { openAdminConsole, adminTabs } from "../lib/app.mjs";

const CLASS = "0c0c0c0c-0000-4000-8000-000000000001";
const TEACHER = "00000000-0000-4000-8000-000000000007";

const setField = (h, sel, value) =>
  h.evaluate(
    (sel, value) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(value));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    },
    sel,
    value
  );

export default async function (h) {
  const calls = [];
  const fake = () => {
    h.backend.setRpc("groups_status", () => ({ groups_enabled: true }));
    h.backend.setRpc("owner_support_find_classes", (a) => (calls.push(["find", a]), [
      { class_id: CLASS, name: "Bible 101", kind: "school", status: "active", org_name: "Valley Christian School", seats_purchased: 10, seats_used: 3 },
    ]));
    h.backend.setRpc("owner_support_roster", (a) => (calls.push(["roster", a]), {
      class: { class_id: CLASS, name: "Bible 101", kind: "school", status: "active", org_name: "Valley Christian School", seats_purchased: 10, seats_used: 3, seat_cap: 50 },
      staff: [{ display_name: "Harness Teacher", role: "owner", added_at: "2026-09-01T00:00:00Z" }],
      members: [{ display_name: "Ruth B.", seat_state: "active", joined_at: "2026-09-02T00:00:00Z", left_at: null }],
      invites: [{ address: "s***@example.com", status: "pending", sends: 2, created_at: "2026-11-20T00:00:00Z" }],
    }));
    h.backend.setRpc("my_classes", () =>
      h.backend.persona?.id === TEACHER
        ? [{ class_id: CLASS, kind: "school", name: "Bible 101", description: null, starts_on: "2026-09-01", ends_on: null, status: "active", role: "owner",
             org_id: "0d0d0d0d-0000-4000-8000-000000000001", org_name: "Valley Christian School", seats_requested: 10, seats_purchased: 10, seat_cap: 50,
             seats_used: 3, join_code: "K7M2QX", billing_interval: "month", billing_status: "active" }]
        : []
    );
    h.backend.setRpc("class_invite_list", () => []);
    h.backend.setRpc("class_support_log", () => ({ grant: null, entries: [{ at: "2026-11-21T10:00:00Z", kind: "roster", reason: "Teacher emailed about a missing student", by: "capstone" }] }));
    h.backend.setRpc("grant_support_access", (a) => (calls.push(["grant", a]), { expires_at: "2026-11-22T10:00:00Z" }));
  };

  h.section("1. owner: Class support tab, reason first, one class at a time");
  await h.asPersona("owner");
  fake();
  await h.reload();
  await h.sleep(800);
  await openAdminConsole(h);
  const tabs = await adminTabs(h);
  h.assert(tabs.includes("Class support"), `owner has a Class support tab (${tabs.join(", ")})`);
  await h.click({ css: ".admin-tab", text: "Class support" });
  await h.waitFor(".groups-support");
  h.assert(/DRAFT FOR COUNSEL/.test(await h.text(".groups-support")), "the Privacy/Terms line is marked DRAFT FOR COUNSEL");
  await setField(h, '.groups-support input[type="search"]', "Valley");
  await h.sleep(150);
  h.assert(await h.evaluate(() => document.querySelector(".groups-support .groups-join-row button")?.disabled === true), "search disabled without a reason");
  await setField(h, '.groups-support input[type="text"]', "Teacher emailed about a missing student");
  await h.sleep(150);
  await h.click({ css: ".groups-support .groups-join-row button", text: "Search" });
  await h.sleep(500);
  await h.click({ css: `[data-support-class="${CLASS}"] button`, text: "Roster" });
  await h.sleep(500);
  const t = await h.text(".groups-support-roster");
  h.assert(/Ruth B\./.test(t) && /Harness Teacher/.test(t) && /s\*\*\*@example\.com/.test(t), "roster: names and a masked invite address");
  h.assert(calls.find((c) => c[0] === "roster")?.[1]?.p_reason === "Teacher emailed about a missing student", "the reason is sent with the lookup");
  const fit = await h.evaluate(() => ({ vw: innerWidth, sw: document.documentElement.scrollWidth }));
  h.assert(fit.sw <= fit.vw, `fits ${fit.vw}px`);
  await h.screenshot(`groups-support-owner-${fit.vw}.png`);

  h.section("2. administrator: no Class support tab");
  await h.asPersona("administrator");
  fake();
  await h.reload();
  await h.sleep(800);
  await openAdminConsole(h);
  h.assert(!(await adminTabs(h)).includes("Class support"), "administrator has no Class support tab");

  h.section("3. teacher: Support access log and the grant button");
  await h.asPersona("teacher");
  fake();
  await h.reload();
  await h.sleep(800);
  await h.click('[aria-label="Settings and account"]');
  await h.sleep(300);
  await h.click({ css: ".auth-menu-item", text: "Classes & Groups" });
  await h.waitFor(".groups-sheet");
  await h.sleep(400);
  await h.click({ css: `[data-class-id="${CLASS}"] button`, text: "Invite students and settings" });
  await h.waitFor(".groups-support-log");
  await h.sleep(300);
  const log = await h.text(".groups-support-log");
  h.assert(/Capstone support: roster/.test(log) && /Teacher emailed about a missing student/.test(log), "the teacher sees the access and its reason");
  await h.click({ css: ".groups-support-log button", text: "Grant support access for 24 hours" });
  await h.sleep(400);
  h.assert(calls.some((c) => c[0] === "grant" && c[1].p_hours === 24 && c[1].p_class_id === CLASS), "grant_support_access(class, 24)");
  await h.screenshot(`groups-support-teacher-${fit.vw}.png`);
}
