/**
 * Capstone Plus for Groups (sql/047, src/lib/groups.ts, components/GroupsSheet.tsx), phases 1-2 UI.
 *
 *   node scripts/signed-in-harness/run.mjs --persona teacher --viewport 390x844 \
 *     --script scripts/signed-in-harness/examples/groups.mjs
 *   node scripts/signed-in-harness/run.mjs --persona teacher --viewport 1280x800 \
 *     --script scripts/signed-in-harness/examples/groups.mjs
 *
 * One run drives all three personas (teacher, student, outsider) against the same fake database.
 * Proves, against the real production build:
 *   1. groups_status MISSING (sql/047 not applied — production today) and groups_enabled = false:
 *      no "Classes & Groups" row, and the app makes NO other groups call (no my_classes, no roster,
 *      no group-billing). Nothing changed for anyone.
 *   2. teacher: the row appears; "You lead" shows seats taken / purchased and the join code; the
 *      roster opens; a draft class offers "Continue to payment".
 *   3. Start form: school vs church wording comes from groupWording (School/Class/Teacher/student vs
 *      Church/Group/Leader/member); the DRAFT FOR COUNSEL banner and the agreement show; "Each
 *      member pays" is shown as Coming soon and cannot be picked; under 5 seats is refused; an SVG
 *      logo is refused and a PNG is accepted; submit sends create_group_class with the agreement's
 *      version + SHA-256 (computed in the browser, equal to the one sql/047 seeds), admin_pays, the
 *      seat count and NO price; then group-billing gets ONLY {action, class_id, return_to}.
 *   4. student: "You're in" with the teacher's name, no seat counts, no code, no roster, and the
 *      roster rpc is never called.
 *   5. outsider: nothing listed; a wrong code shows a readable error.
 *   6. ?groups=cancel is stripped and noticed.
 *
 * Cannot prove: real RLS (sql/tests/047_groups_classes_test.sql), Stripe, the Edge Functions, storage.
 * The groups RPCs below are a stand-in that answers what each persona's client expects.
 */

const EXPECTED_SHA = "0b2ad26fd1888583899cd38664e9f5bc3b154be7067ceaaf7d0aab5b591a7fdc";
const TEACHER = "00000000-0000-4000-8000-000000000007";
const STUDENT = "00000000-0000-4000-8000-000000000008";
const CLASS_ACTIVE = "0c0c0c0c-0000-4000-8000-000000000001";
const CLASS_DRAFT = "0c0c0c0c-0000-4000-8000-000000000002";

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

const GROUP_RPCS = ["my_classes", "class_roster", "join_class", "create_group_class", "leave_class", "remove_class_member"];

function installFakeGroups(h, created) {
  const who = () => h.backend.persona?.id ?? null;
  h.backend.setRpc("groups_status", () => ({ groups_enabled: true }));
  h.backend.setRpc("my_classes", () => {
    if (who() === TEACHER)
      return [
        {
          class_id: CLASS_ACTIVE, kind: "school", name: "Bible 101", description: null, starts_on: "2026-09-01", ends_on: "2027-05-30",
          status: "active", role: "owner", org_id: "0d0d0d0d-0000-4000-8000-000000000001", org_name: "Valley Christian School",
          seats_requested: 10, seats_purchased: 10, seat_cap: 50, seats_used: 3, join_code: "K7M2QX", billing_interval: "month",
          billing_status: "active",
        },
        {
          class_id: CLASS_DRAFT, kind: "church", name: "Tuesday Study", description: null, starts_on: "2026-11-21", ends_on: null,
          status: "draft", role: "owner", org_id: "0d0d0d0d-0000-4000-8000-000000000002", org_name: "Grace Church",
          seats_requested: 8, seats_purchased: 0, seat_cap: 50, seats_used: 0, join_code: "P3RZ9A", billing_interval: "year",
          billing_status: null,
        },
      ];
    if (who() === STUDENT)
      return [
        {
          class_id: CLASS_ACTIVE, kind: "school", name: "Bible 101", description: null, starts_on: "2026-09-01", ends_on: "2027-05-30",
          status: "active", role: "member", org_id: "0d0d0d0d-0000-4000-8000-000000000001", org_name: "Valley Christian School",
          leader_name: "Harness Teacher",
        },
      ];
    return [];
  });
  h.backend.setRpc("class_roster", ({ p_class_id }) => {
    if (who() !== TEACHER || p_class_id !== CLASS_ACTIVE) throw { status: 403, code: "42501", message: "not_class_staff" };
    return [
      { user_id: STUDENT, display_name: "Harness Student", joined_at: "2026-09-02T00:00:00Z", seat_state: "active", left_at: null },
      { user_id: "00000000-0000-4000-8000-0000000000a2", display_name: "Ruth B.", joined_at: "2026-09-03T00:00:00Z", seat_state: "active", left_at: null },
      { user_id: "00000000-0000-4000-8000-0000000000a3", display_name: null, joined_at: "2026-09-04T00:00:00Z", seat_state: "active", left_at: null },
    ];
  });
  h.backend.setRpc("join_class", ({ p_code }) => (p_code === "K7M2QX" ? { ok: false, error: "full" } : { ok: false, error: "not_found" }));
  h.backend.setRpc("create_group_class", ({ p }) => {
    created.push(p);
    return { class_id: "0c0c0c0c-0000-4000-8000-000000000099", org_id: "0d0d0d0d-0000-4000-8000-000000000099", join_code: "N4W8TB" };
  });
}

async function openMenu(h) {
  await h.click('[aria-label="Settings and account"]');
  await h.sleep(300);
}
const menuText = (h) => h.evaluate(() => document.querySelector(".auth-dropdown")?.innerText ?? "");
const groupRpcCalls = (h, from) => h.requests.slice(from).filter((r) => GROUP_RPCS.some((n) => r.path.startsWith(`/rest/v1/rpc/${n}`)));
const fnCalls = (h) => h.evaluate(() => window.__fnCalls ?? []);

async function openGroups(h) {
  await openMenu(h);
  await h.click({ css: ".auth-menu-item", text: "Classes & Groups" });
  await h.waitFor(".groups-sheet");
  await h.sleep(400);
}

/** Sets a React-controlled input found by its label text (native setter + input event). */
const fill = (h, label, value) =>
  h.evaluate(
    (label, value) => {
      const lab = [...document.querySelectorAll(".groups-form label.report-field")].find((l) =>
        l.querySelector(".report-field-label")?.textContent?.trim().startsWith(label)
      );
      const el = lab?.querySelector("input, textarea");
      if (!el) return false;
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, String(value));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    },
    label,
    value
  );

const fitsViewport = (h) =>
  h.evaluate(() => {
    const vw = window.innerWidth;
    const wide = [...document.querySelectorAll(".groups-sheet *")].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > vw + 1 || r.left < -1);
    });
    return { vw, overflow: wide.length, first: wide[0]?.className ?? null, scrollW: document.documentElement.scrollWidth };
  });

export default async function (h) {
  await h.addInitScript(FN_CAPTURE);
  const created = [];
  const vwTag = () => h.evaluate(() => window.innerWidth);

  // ------------------------------------------------------------------------------------------ 1
  h.section("1. sql/047 not applied, then switch off: nothing anywhere");
  await h.asPersona("outsider");
  h.backend.setRpc("groups_status", () => {
    throw { status: 404, code: "PGRST202", message: "Could not find the function public.groups_status" };
  });
  let mark = h.requests.length;
  await h.reload();
  await h.sleep(800);
  await openMenu(h);
  h.assert(!/Classes & Groups/.test(await menuText(h)), "rpc missing: no Classes & Groups row");
  h.assert(h.requests.slice(mark).some((r) => r.path.startsWith("/rest/v1/rpc/groups_status")), "the app asked groups_status (and failed closed)");
  h.assert(groupRpcCalls(h, mark).length === 0, "rpc missing: no other groups rpc was called");

  h.backend.setRpc("groups_status", () => ({ groups_enabled: false }));
  mark = h.requests.length;
  await h.reload();
  await h.sleep(800);
  await openMenu(h);
  h.assert(!/Classes & Groups/.test(await menuText(h)), "switch off: no Classes & Groups row");
  h.assert(groupRpcCalls(h, mark).length === 0, "switch off: no other groups rpc was called");
  h.assert((await fnCalls(h)).length === 0, "switch off: no Edge Function called");

  // ------------------------------------------------------------------------------------------ 2
  h.section("2. teacher: what they lead");
  await h.asPersona("teacher");
  installFakeGroups(h, created);
  await h.reload();
  await h.sleep(800);
  await openGroups(h);
  const teacherText = await h.text(".groups-sheet");
  h.assert(/You lead/.test(teacherText), "teacher sees 'You lead'");
  h.assert(/3 of 10 seats taken/.test(teacherText), "seats taken / purchased shown");
  h.assert(/K7M2QX/.test(teacherText), "join code shown to the teacher");
  h.assert(/Valley Christian School · Class · Teacher/.test(teacherText), "school wording on the school class card");
  h.assert(/Grace Church · Group · Leader/.test(teacherText), "church wording on the church group card");
  h.assert(await h.exists({ css: `[data-class-id="${CLASS_DRAFT}"] button`, text: "Continue to payment" }), "draft class offers Continue to payment");
  h.assert(/8 seats × \$32\.50 = \$260\.00 per year/.test(teacherText), "draft class shows its estimate (8 seats yearly)");
  await h.click({ css: `[data-class-id="${CLASS_ACTIVE}"] button`, text: "Show students" });
  await h.sleep(400);
  const roster = await h.text(`[data-class-id="${CLASS_ACTIVE}"] .groups-roster`);
  h.assert(/Harness Student/.test(roster) && /Ruth B\./.test(roster) && /A Capstone student/.test(roster), `roster lists names, nameless as "A Capstone student"`);
  let fit = await fitsViewport(h);
  h.assert(fit.overflow === 0 && fit.scrollW <= fit.vw, `teacher list fits ${fit.vw}px (overflowing: ${fit.overflow} ${fit.first ?? ""})`);
  await h.screenshot(`groups-teacher-${await vwTag()}.png`);

  // ------------------------------------------------------------------------------------------ 3
  h.section("3. Start a class or group");
  await h.click({ css: "button", text: "Start a class or group" });
  await h.waitFor(".groups-form");
  h.assert(!(await h.exists(".groups-agreement")), "nothing but the kind choice until a kind is picked");
  await h.click({ css: ".groups-choice-card", text: "School class" });
  await h.sleep(200);
  let formText = await h.text(".groups-form");
  // field labels are text-transform: uppercase, and innerText reports what is drawn
  h.assert(/School name/i.test(formText) && /Class name/i.test(formText) && /Class ends/i.test(formText), "school wording: School name / Class name / Class ends");
  h.assert(/Each student pays/.test(formText) && /Coming soon/.test(formText), "school: 'Each student pays — Coming soon'");
  h.assert(await h.evaluate(() => document.querySelector('.groups-choice-card.is-disabled input')?.disabled === true), "member-pays cannot be selected");
  await h.click({ css: ".groups-choice-card", text: "Church group" });
  await h.sleep(200);
  formText = await h.text(".groups-form");
  h.assert(/Church name/i.test(formText) && /Group name/i.test(formText) && /Group ends/i.test(formText) && /Each member pays/.test(formText) && !/School name|Class name/i.test(formText), "church wording: Church name / Group name / Group ends / Each member pays");
  h.assert(/DRAFT FOR COUNSEL/.test(formText), "DRAFT FOR COUNSEL banner shows");
  h.assert(/Everyone I invite is genuinely a student in my class or a member of my group/.test(formText), "agreement text shows");
  h.assert(await h.evaluate(() => document.querySelector(".groups-submit")?.disabled === true), "submit disabled while incomplete");

  // logo: SVG refused, PNG accepted (DataTransfer into the file input; storage itself is not modelled)
  const logoResult = await h.evaluate(async () => {
    const input = document.querySelector('input[type="file"][aria-label="Logo"]');
    const put = async (file) => {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 500));
    };
    await put(new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], "logo.svg", { type: "image/svg+xml" }));
    const svgError = document.querySelector(".groups-form .plus-error")?.textContent ?? "";
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 40;
    c.getContext("2d").fillRect(0, 0, 40, 40);
    const png = await new Promise((r) => c.toBlob(r, "image/png"));
    await put(new File([png], "logo.png", { type: "image/png" }));
    return { svgError, preview: !!document.querySelector(".groups-logo-preview") };
  });
  h.assert(/PNG, JPEG or WebP/.test(logoResult.svgError), `SVG logo refused ("${logoResult.svgError}")`);
  h.assert(logoResult.preview, "PNG logo accepted and previewed (re-encoded in the browser)");

  await fill(h, "Church name", "Grace Church");
  await fill(h, "Street address", "100 Main St");
  await fill(h, "City", "Boise");
  await fill(h, "State / region", "ID");
  await fill(h, "Postal code", "83702");
  await fill(h, "Phone", "+1 208 555 0100");
  await fill(h, "Group name", "Romans Study");
  await fill(h, "Group ends", "2027-06-01");
  await fill(h, "Seats", "4");
  await h.click({ css: ".groups-check", text: "I have read and agree" });
  await fill(h, "Type your full name to sign", "Harness Teacher");
  await h.sleep(200);
  h.assert(/Seats must be 5 to 200/.test((await h.text(".groups-problems")) ?? ""), "4 seats: refused before anything is sent");
  h.assert(await h.evaluate(() => document.querySelector(".groups-submit")?.disabled === true), "submit disabled at 4 seats");
  await fill(h, "Seats", "12");
  await h.sleep(200);
  h.assert(/12 seats × \$3\.25 = \$39\.00 per month/.test(await h.text(".groups-form")), "monthly estimate for 12 seats");
  h.assert(!(await h.exists(".groups-problems")), "complete form has no problems listed");
  fit = await fitsViewport(h);
  h.assert(fit.overflow === 0 && fit.scrollW <= fit.vw, `start form fits ${fit.vw}px (overflowing: ${fit.overflow} ${fit.first ?? ""})`);
  await h.screenshot(`groups-start-${await vwTag()}.png`);

  await h.click(".groups-submit");
  await h.sleep(1200);
  h.assert(created.length === 1, "create_group_class was called once");
  const p = created[0] ?? {};
  h.assert(p.agreement_sha256 === EXPECTED_SHA, `browser SHA-256 of the agreement equals the hash sql/047 seeds (${p.agreement_sha256?.slice(0, 12)}…)`);
  h.assert(p.agreement_version === "2026-11-21-draft-1", "agreement version sent");
  h.assert(p.kind === "church" && p.billing_mode === "admin_pays" && p.seats === 12 && p.interval === "month", "kind, admin_pays, 12 seats, monthly");
  h.assert(p.accepted === true && p.typed_name === "Harness Teacher", "acceptance and typed name sent");
  h.assert(!("price" in p) && !("price_id" in p) && !JSON.stringify(p).includes("price_"), "no price in the request");
  const fc = (await fnCalls(h)).filter((c) => c.url.startsWith("group-billing"));
  h.assert(fc.length === 1, "group-billing invoked once after create");
  const fb = fc[0]?.body ? JSON.parse(fc[0].body) : {};
  h.assert(Object.keys(fb).sort().join(",") === "action,class_id,return_to" && fb.action === "checkout", `client sends only {action, class_id, return_to} (${fc[0]?.body})`);
  h.assert(await h.exists(".groups-form .plus-error"), "harness has no Edge Functions: a readable error shows, the class is kept");
  h.assert(/could not be uploaded/.test(await h.text(".groups-form")), "storage unavailable: logo failure is a warning, not a dead end");
  await h.screenshot(`groups-start-submitted-${await vwTag()}.png`);

  // ------------------------------------------------------------------------------------------ 4
  h.section("4. student: what they are in, and nothing more");
  await h.asPersona("student");
  installFakeGroups(h, created);
  mark = h.requests.length;
  await h.reload();
  await h.sleep(800);
  await openGroups(h);
  const st = await h.text(".groups-sheet");
  h.assert(/You're in/.test(st) && /Bible 101/.test(st), "student sees the class they are in");
  h.assert(/Teacher: Harness Teacher/.test(st), "student sees the teacher's name (school wording)");
  h.assert(/Capstone Plus is included while you're in this class/.test(st), "Plus included line");
  h.assert(!/seats taken/.test(st) && !/K7M2QX/.test(st), "no seat counts, no join code");
  h.assert(!(await h.exists({ css: "button", text: "Show students" })), "no roster button");
  h.assert(!h.requests.slice(mark).some((r) => r.path.startsWith("/rest/v1/rpc/class_roster")), "class_roster never called for a student");
  h.assert(/can't see your notes, highlights, prayer\s+list/.test(st), "join box says what a teacher can and cannot see");
  fit = await fitsViewport(h);
  h.assert(fit.overflow === 0 && fit.scrollW <= fit.vw, `student view fits ${fit.vw}px`);
  await h.screenshot(`groups-student-${await vwTag()}.png`);

  // ------------------------------------------------------------------------------------------ 5
  h.section("5. outsider: nothing listed, wrong code refused");
  await h.asPersona("outsider");
  installFakeGroups(h, created);
  mark = h.requests.length;
  await h.reload();
  await h.sleep(800);
  await openGroups(h);
  const ot = await h.text(".groups-sheet");
  h.assert(!/You lead/.test(ot) && !/You're in/.test(ot), "outsider: no classes listed");
  await h.type('.groups-join-row input', "zzzzzz");
  await h.click({ css: ".groups-join-row button", text: "Join" });
  await h.sleep(500);
  h.assert(/didn't match an open class or group/.test((await h.text(".groups-join .plus-error")) ?? ""), "wrong code: readable error");
  await h.evaluate(() => {
    const el = document.querySelector(".groups-join-row input");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await h.type('.groups-join-row input', "K7M2QX");
  await h.click({ css: ".groups-join-row button", text: "Join" });
  await h.sleep(500);
  h.assert(/is full/.test((await h.text(".groups-join .plus-error")) ?? ""), "full class: readable error");
  h.assert(!h.requests.slice(mark).some((r) => r.path.startsWith("/rest/v1/rpc/class_roster")), "class_roster never called for an outsider");
  await h.screenshot(`groups-outsider-${await vwTag()}.png`);

  // ------------------------------------------------------------------------------------------ 6
  h.section("6. back from Stripe: ?groups=cancel");
  await h.goto("/?groups=cancel");
  await h.sleep(1200);
  h.assert(/Nothing was charged/.test((await h.text(".groups-notice")) ?? ""), "cancel notice shows in Classes & Groups");
  h.assert(!(await h.evaluate(() => location.search.includes("groups="))), "?groups= stripped from the address bar");
}
