/**
 * Capstone Plus for Groups phase 3: invites (sql/049, src/lib/groupInvites.ts, components/GroupInvites.tsx,
 * src/lib/groupsJoinParam.ts, email/unsubscribe.html).
 *
 *   node scripts/signed-in-harness/run.mjs --persona teacher --viewport 390x844 \
 *     --script scripts/signed-in-harness/examples/groups-invites.mjs
 *   node scripts/signed-in-harness/run.mjs --persona teacher --viewport 1280x800 \
 *     --script scripts/signed-in-harness/examples/groups-invites.mjs
 *
 * Proves, against the real production build, with the network closed:
 *   1. switch OFF: ?joinClass=CODE is stripped from the address bar and kept for later; NO groups call.
 *      Signed out: the same (it survives sign-up).
 *   2. teacher: "Invite students" shows the share link + code, a "Text it from your phone" sms: link
 *      that opens THEIR messages app (no app-sent SMS), email parsing (lower-case, de-dupe, invalid
 *      listed), the note's link refusal, a preview with the DRAFT FOR COUNSEL banner in which the note
 *      is shown as text, never markup; create_class_invites gets ONLY {class id, addresses, note};
 *      "sending isn't switched on" is said; the status list's Send again / Cancel call the right RPC.
 *   3. invitee by emailed link: the join panel opens by itself with the class preview; the neutral age
 *      question; under 13 is refused ON THE DEVICE (no redeem call); 13+ redeems with the bracket only.
 *   4. the unsubscribe page: reads the token from the fragment, strips it, sends {token, scope} only on
 *      a button press.
 * Cannot prove: the SQL (sql/tests/049), the Edge Functions (node --test _shared/invites.test.ts), real email.
 */

const TEACHER = "00000000-0000-4000-8000-000000000007";
const CLASS_ACTIVE = "0c0c0c0c-0000-4000-8000-000000000001";
const TOKEN = "9".repeat(64);
const UNSUB = "e".repeat(64);

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

const GROUP_RPCS = ["my_classes", "class_roster", "join_class", "create_class_invites", "class_invite_list", "class_invite_preview",
  "redeem_class_invite", "revoke_class_invite", "resend_class_invite"];
const groupCalls = (h, from) => h.requests.slice(from).filter((r) => GROUP_RPCS.some((n) => r.path.startsWith(`/rest/v1/rpc/${n}`)));

function install(h, rec) {
  const who = () => h.backend.persona?.id ?? null;
  h.backend.setRpc("groups_status", () => ({ groups_enabled: true }));
  h.backend.setRpc("my_classes", () =>
    who() === TEACHER
      ? [{ class_id: CLASS_ACTIVE, kind: "school", name: "Bible 101", description: null, starts_on: "2026-09-01", ends_on: "2027-05-30",
           status: "active", role: "owner", org_id: "0d0d0d0d-0000-4000-8000-000000000001", org_name: "Valley Christian School",
           seats_requested: 10, seats_purchased: 10, seat_cap: 50, seats_used: 3, join_code: "K7M2QX", billing_interval: "month", billing_status: "active" }]
      : []
  );
  h.backend.setRpc("class_invite_list", ({ p_class_id }) => {
    if (who() !== TEACHER || p_class_id !== CLASS_ACTIVE) throw { status: 403, code: "42501", message: "not_class_staff" };
    return [
      { invite_id: "11111111-0000-4000-8000-000000000001", address: "ruth@example.com", status: "pending", sends: 2, can_resend: true, created_at: "2026-11-20T00:00:00Z" },
      { invite_id: "11111111-0000-4000-8000-000000000002", address: null, status: "joined", sends: 1, can_resend: false, created_at: "2026-11-19T00:00:00Z" },
    ];
  });
  h.backend.setRpc("create_class_invites", (args) => {
    rec.created.push(args);
    return { invited: 2, sending_enabled: false, results: args.p_emails.map((e) => ({ email: e, result: "invited" })) };
  });
  h.backend.setRpc("revoke_class_invite", (args) => (rec.revoked.push(args), null));
  h.backend.setRpc("resend_class_invite", (args) => (rec.resent.push(args), null));
  h.backend.setRpc("class_invite_preview", ({ p_token }) =>
    p_token === TOKEN ? { ok: true, kind: "school", name: "Bible 101", org_name: "Valley Christian School", leader_name: "Harness Teacher" } : { ok: false, error: "not_found" }
  );
  h.backend.setRpc("redeem_class_invite", (args) => (rec.redeemed.push(args), { ok: true, class_id: CLASS_ACTIVE, name: "Bible 101" }));
}

const choose = (h, sel, value) =>
  h.evaluate(
    (sel, value) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, String(value));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    sel,
    value
  );
const setField = (h, sel, value) =>
  h.evaluate(
    (sel, value) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, String(value));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    },
    sel,
    value
  );
const fitsViewport = (h, root) =>
  h.evaluate((root) => {
    const vw = window.innerWidth;
    const wide = [...document.querySelectorAll(`${root} *`)].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > vw + 1 || r.left < -1);
    });
    return { vw, overflow: wide.length, first: wide[0]?.className ?? null, scrollW: document.documentElement.scrollWidth };
  }, root);
const fnCalls = (h) => h.evaluate(() => window.__fnCalls ?? []);

async function openGroups(h) {
  await h.click('[aria-label="Settings and account"]');
  await h.sleep(300);
  await h.click({ css: ".auth-menu-item", text: "Classes & Groups" });
  await h.waitFor(".groups-sheet");
  await h.sleep(400);
}

export default async function (h) {
  await h.addInitScript(FN_CAPTURE);
  const rec = { created: [], revoked: [], resent: [], redeemed: [] };
  const vw = () => h.evaluate(() => window.innerWidth);

  // ------------------------------------------------------------------------------------------ 1
  h.section("1. switch off / signed out: ?joinClass is kept, stripped, and nothing is called");
  await h.asPersona("outsider");
  h.backend.setRpc("groups_status", () => ({ groups_enabled: false }));
  let mark = h.requests.length;
  await h.goto("/?joinClass=k7m2qx");
  await h.sleep(1000);
  h.assert(!(await h.evaluate(() => location.search.includes("joinClass"))), "switch off: ?joinClass stripped from the address bar");
  const kept = await h.evaluate(() => localStorage.getItem("pending-join-class"));
  h.assert(/"kind":"code"/.test(kept ?? "") && /K7M2QX/.test(kept ?? ""), `switch off: the code is kept for later, normalised (${kept})`);
  h.assert(groupCalls(h, mark).length === 0, "switch off: no groups rpc called");
  h.assert(!(await h.exists(".groups-joinpanel")), "switch off: no join panel");

  await h.asPersona("signedout");
  await h.evaluate(() => localStorage.removeItem("pending-join-class"));
  await h.goto(`/?joinClass=${TOKEN}`);
  await h.sleep(1000);
  h.assert(!(await h.evaluate(() => location.search.includes("joinClass"))), "signed out: ?joinClass stripped");
  h.assert(/"kind":"token"/.test((await h.evaluate(() => localStorage.getItem("pending-join-class"))) ?? ""), "signed out: the emailed token survives for after sign-up");
  await h.goto("/?joinClass=not-a-code-at-all");
  await h.sleep(600);
  h.assert(!(await h.evaluate(() => location.search.includes("joinClass"))), "a malformed value is stripped too");
  await h.evaluate(() => localStorage.removeItem("pending-join-class"));

  // ------------------------------------------------------------------------------------------ 2
  h.section("2. teacher: share link, text it yourself, email invites");
  await h.asPersona("teacher");
  install(h, rec);
  await h.reload();
  await h.sleep(800);
  await openGroups(h);
  await h.click({ css: `[data-class-id="${CLASS_ACTIVE}"] button`, text: "Invite students" });
  await h.waitFor(".groups-invites");
  await h.sleep(400);
  const inv = await h.text(".groups-invites");
  h.assert(/\?joinClass=K7M2QX/.test(inv), "share link carries the class code");
  const sms = await h.evaluate(() => document.querySelector(".groups-sms")?.getAttribute("href") ?? "");
  h.assert(sms.startsWith("sms:?&body=") && decodeURIComponent(sms).includes("?joinClass=K7M2QX"), "Text it from your phone: an sms: link to the teacher's own app, with the link");
  h.assert(/doesn't send texts/.test(inv), "says Capstone Bible sends no texts");
  h.assert(/Ruth@example\.com|ruth@example\.com/.test(inv) && /Waiting/.test(inv) && /\(address removed\)/.test(inv) && /Joined/.test(inv), "status list: pending address, joined without address");

  await setField(h, ".groups-invites textarea", "Ruth@Example.com\nruth@example.com, not-an-email; sam@example.org");
  await h.sleep(200);
  h.assert(/2 to invite · 1 duplicate removed · not email addresses: not-an-email/.test(await h.text(".groups-invite-count")), "parsed: lower-cased, de-duplicated, invalid listed");
  await setField(h, '.groups-invites input[type="text"]', "Visit www.example.com");
  await h.sleep(200);
  h.assert(/can't contain a web or email address/.test(await h.text(".groups-invites")), "a link in the note is refused before sending");
  h.assert(await h.evaluate(() => document.querySelector(".groups-invite-send")?.disabled === true), "send disabled while the note has a link");
  await setField(h, '.groups-invites input[type="text"]', "See you <b>Tuesday</b> & bring a Bible");
  await h.sleep(200);
  await h.click({ css: ".groups-preview-toggle", text: "Preview the email" });
  await h.sleep(300);
  const pv = await h.evaluate(() => {
    const el = document.querySelector(".groups-email-preview");
    return { text: el?.innerText ?? "", bold: el?.querySelectorAll("pre b").length ?? -1 };
  });
  h.assert(/DRAFT FOR COUNSEL/.test(pv.text), "preview: DRAFT FOR COUNSEL banner");
  h.assert(/Subject: .*invited you to join Bible 101 on Capstone Bible/.test(pv.text), "preview: the real subject");
  h.assert(pv.text.includes("See you <b>Tuesday</b> & bring a Bible") && pv.bold === 0, "preview: the note is text, never markup");
  h.assert(/Unsubscribe:/.test(pv.text) && /Postal address: TODO for Robbie/.test(pv.text), "preview: unsubscribe and the postal-address TODO");
  let fit = await fitsViewport(h, ".groups-sheet");
  h.assert(fit.overflow === 0 && fit.scrollW <= fit.vw, `invite panel fits ${fit.vw}px (overflowing: ${fit.overflow} ${fit.first ?? ""})`);
  await h.screenshot(`groups-invites-teacher-${await vw()}.png`);

  await h.click(".groups-invite-send");
  await h.sleep(800);
  h.assert(rec.created.length === 1, "create_class_invites called once");
  const c = rec.created[0] ?? {};
  h.assert(Object.keys(c).sort().join(",") === "p_class_id,p_emails,p_note", `client sends only class, addresses, note (${Object.keys(c)})`);
  h.assert(JSON.stringify(c.p_emails) === JSON.stringify(["ruth@example.com", "sam@example.org"]), "addresses sent lower-cased and unique");
  h.assert(/isn't switched on yet, so nothing has been sent/.test(await h.text(".groups-invite-results")), "says nothing was sent while sending is off");
  await h.click({ css: '[data-invite-id="11111111-0000-4000-8000-000000000001"] button', text: "Send again" });
  await h.sleep(300);
  await h.click({ css: '[data-invite-id="11111111-0000-4000-8000-000000000001"] button', text: "Cancel invite" });
  await h.sleep(300);
  h.assert(rec.resent[0]?.p_invite_id === "11111111-0000-4000-8000-000000000001", "Send again -> resend_class_invite(id)");
  h.assert(rec.revoked[0]?.p_invite_id === "11111111-0000-4000-8000-000000000001", "Cancel invite -> revoke_class_invite(id)");
  h.assert((await fnCalls(h)).length === 0, "no Edge Function was called by the app (sending is server-side)");
  await h.screenshot(`groups-invites-sent-${await vw()}.png`);

  // ------------------------------------------------------------------------------------------ 3
  h.section("3. invitee by emailed link: age question, under 13 refused on the device, 13+ joins");
  await h.asPersona("outsider");
  install(h, rec);
  await h.evaluate(() => localStorage.removeItem("cb-class-join-age-block"));
  mark = h.requests.length;
  await h.goto(`/?joinClass=${TOKEN}`);
  await h.sleep(1200);
  await h.waitFor(".groups-joinpanel");
  h.assert(!(await h.evaluate(() => location.search.includes("joinClass"))), "token stripped from the address bar");
  const jp = await h.text(".groups-joinpanel");
  h.assert(/Join Bible 101/.test(jp) && /Valley Christian School/.test(jp) && /Teacher: Harness Teacher/.test(jp), "the panel opened by itself with the class preview");
  h.assert(/When were you born\?/i.test(jp) && !/13 or older|at least 13|over 12|under 13/i.test(jp), "neutral age question (no age number hinted)");
  h.assert(/won't see your notes, highlights, prayer list, messages/.test(jp), "says what the teacher can and can't see");
  const thisYear = await h.evaluate(() => new Date().getFullYear());
  await choose(h, 'select[aria-label="Birth month"]', "1");
  await choose(h, 'select[aria-label="Birth year"]', String(thisYear - 10));
  await h.sleep(150);
  await h.click(".groups-join-confirm");
  await h.sleep(400);
  h.assert(/can't join this class right now/.test(await h.text(".groups-joinpanel")), "under 13: refused without saying why");
  h.assert(rec.redeemed.length === 0 && !h.requests.slice(mark).some((r) => r.path.startsWith("/rest/v1/rpc/redeem_class_invite")), "under 13: nothing sent to the server");
  fit = await fitsViewport(h, ".groups-sheet");
  h.assert(fit.overflow === 0 && fit.scrollW <= fit.vw, `join panel fits ${fit.vw}px`);
  await h.screenshot(`groups-invites-join-blocked-${await vw()}.png`);

  await h.evaluate(() => localStorage.removeItem("cb-class-join-age-block"));
  await h.evaluate((t) => localStorage.setItem("pending-join-class", JSON.stringify({ kind: "token", value: t, at: Date.now() })), TOKEN);
  await h.reload();
  await h.sleep(1200);
  await h.waitFor(".groups-joinpanel");
  await choose(h, 'select[aria-label="Birth month"]', "6");
  await choose(h, 'select[aria-label="Birth year"]', String(thisYear - 15));
  await h.sleep(150);
  await h.screenshot(`groups-invites-join-${await vw()}.png`);
  await h.click(".groups-join-confirm");
  await h.sleep(600);
  h.assert(rec.redeemed.length === 1 && rec.redeemed[0].p_token === TOKEN && rec.redeemed[0].p_age_bracket === "13_17", `redeem gets the token and the bracket only (${JSON.stringify(rec.redeemed[0] ?? {})})`);
  h.assert(Object.keys(rec.redeemed[0] ?? {}).sort().join(",") === "p_age_bracket,p_token", "no birth date is sent");
  h.assert(/You joined Bible 101/.test((await h.text(".groups-notice")) ?? ""), "joined notice");
  h.assert((await h.evaluate(() => localStorage.getItem("pending-join-class"))) === null, "the pending link is cleared after joining");
  h.assert(!h.requests.slice(mark).some((r) => /rpc\/(class_roster|class_invite_list)/.test(r.path)), "the invitee never asks for the roster or the invite list");

  // ------------------------------------------------------------------------------------------ 4
  h.section("4. the unsubscribe page");
  // Not the app: no #root to wait for, so navigate directly.
  await h.evaluate((u) => location.assign(u), `/email/unsubscribe.html#t=${UNSUB}`);
  await h.sleep(1500);
  h.assert(await h.exists("#all"), "the unsubscribe page loaded");
  h.assert(!(await h.evaluate(() => location.hash)), "token stripped from the address bar");
  h.assert((await fnCalls(h)).length === 0, "opening the page unsubscribes no one");
  fit = await fitsViewport(h, "main");
  h.assert(fit.overflow === 0 && fit.scrollW <= fit.vw, `unsubscribe page fits ${fit.vw}px`);
  await h.screenshot(`groups-invites-unsubscribe-${await vw()}.png`);
  await h.click("#all");
  await h.sleep(600);
  const calls = await fnCalls(h);
  h.assert(calls.length === 1 && calls[0].url === "group-invite-unsubscribe", "one POST to group-invite-unsubscribe");
  h.assert(calls[0]?.body === JSON.stringify({ token: UNSUB, scope: "all" }), `body is {token, scope} only (${calls[0]?.body})`);
  h.assert(/won't send invitations to this address again/.test(await h.text("#status")), "confirmation shown");
}
