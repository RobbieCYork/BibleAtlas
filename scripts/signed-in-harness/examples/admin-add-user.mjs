/**
 * Admin Console -> Users -> "Add user" (src/components/AdminAddUser.tsx), driven against the REAL
 * Edge Function handler (supabase/functions/admin-add-user/handler.ts) with fake dependencies.
 *
 *   node scripts/signed-in-harness/run.mjs --persona administrator --viewport 390x844 \
 *     --script scripts/signed-in-harness/examples/admin-add-user.mjs
 *
 * The function's own logic decides every answer here: the token check, is_admin(), validation, the
 * rate limit, the audit-before-send rule, the duplicate check. Only Supabase underneath it is faked:
 * the bearer token is "validated" by re-signing it with the harness's throwaway key, is_admin() reads
 * the persona table, and the audit table / profiles / invitations live in this script's memory.
 * Switches persona itself (administrator -> member -> owner) against one shared fake database.
 */
import { openAdminConsole } from "../lib/app.mjs";
import { FAKE_URL, PERSONAS, STORAGE_KEY, fakeJwt } from "../lib/personas.mjs";
import { handle, INVITE_REDIRECT_TO, RATE_LIMIT_PER_HOUR } from "../../../supabase/functions/admin-add-user/handler.ts";

const SKINS = (process.env.SKINS ?? "default,sticker,clarity,midnight,sage,skyreader,trailhead,highlighter").split(",");

export default async function (h) {
  // ---- the fake world under the real handler ---------------------------------------------------
  const users = [
    {
      user_id: "00000000-0000-4000-8000-0000000000aa", email: "existing@example.com", display_name: "Existing Person",
      is_anonymous: false, created_at: "2026-10-01T00:00:00Z", last_sign_in_at: null, last_seen_at: null,
      session_count: 0, total_seconds: 0, is_admin: false,
    },
  ];
  const audit = [];
  const invites = [];
  const fnCalls = [];
  const byId = Object.fromEntries(Object.values(PERSONAS).filter(Boolean).map((p) => [p.id, p]));

  const deps = {
    async getCaller(authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      let claims;
      try { claims = JSON.parse(Buffer.from(parts[1], "base64url").toString()); } catch { return null; }
      if (fakeJwt(claims) !== token) return null; // signature check against the harness key
      const p = byId[claims.sub];
      return p ? { id: p.id, isAnonymous: !!p.anonymous } : null;
    },
    async isAdmin(uid) { return byId[uid]?.admin === true; },
    async countRecentAttempts(actorId, since) { return audit.filter((a) => a.actor_id === actorId && a.created_at >= since).length; },
    async startAudit({ actorId, email, displayName, note }) {
      const row = { id: audit.length + 1, actor_id: actorId, email, display_name: displayName, note, outcome: "pending", created_at: new Date().toISOString() };
      audit.push(row);
      return row.id;
    },
    async finishAudit(id, outcome, target) { const r = audit.find((a) => a.id === id); r.outcome = outcome; r.target_user_id = target; },
    async emailExists(email) { return users.some((u) => u.email === email); },
    async displayNameTaken(name) { return users.some((u) => (u.display_name ?? "").toLowerCase() === name.toLowerCase()); },
    async invite(email, displayName, redirectTo) {
      const id = `00000000-0000-4000-8000-${String(900 + invites.length).padStart(12, "0")}`;
      invites.push({ email, displayName, redirectTo });
      users.unshift({ user_id: id, email, display_name: displayName, is_anonymous: false, created_at: new Date().toISOString(),
        last_sign_in_at: null, last_seen_at: null, session_count: 0, total_seconds: 0, is_admin: false });
      return { ok: true, userId: id };
    },
    now: () => new Date(),
    log: () => {},
  };

  h.backend.setFunction("admin-add-user", async (req) => {
    const r = new Request(req.url, { method: req.method, headers: req.headers, body: req.method === "POST" ? (req.body ?? "") : undefined });
    const res = await handle(r, deps);
    fnCalls.push({ status: res.status, auth: (req.headers.authorization ?? "").slice(0, 12) });
    return { status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() };
  });
  h.backend.setRpc("admin_list_users", ({ p_search }) => {
    const q = (p_search ?? "").toLowerCase();
    const rows = users.filter((u) => !q || u.email.includes(q) || (u.display_name ?? "").toLowerCase().includes(q));
    return rows.map((u) => ({ ...u, total_count: rows.length }));
  });

  const W = await h.evaluate(() => window.innerWidth);
  const openUsers = async () => {
    await openAdminConsole(h);
    await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Users" });
    await h.waitFor(".admin-add-user-open");
  };
  const noHScroll = () => h.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const errorText = () => h.evaluate(() => document.querySelector(".admin-add-user [role=alert]")?.innerText.trim() ?? null);
  const fill = async (email, name, note = "") => {
    await h.evaluate(() => {
      for (const el of document.querySelectorAll(".admin-add-user-form input, .admin-add-user-form textarea")) {
        const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set;
        set.call(el, "");
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    if (email) await h.type('.admin-add-user-form input[type="email"]', email);
    if (name) await h.type('.admin-add-user-form input[type="text"]', name);
    if (note) await h.type(".admin-add-user-form textarea", note);
  };
  const submit = async () => { await h.click('.admin-add-user-form button[type="submit"]'); await h.sleep(500); };

  // ---- 1. administrator: the button and the form ---------------------------------------------
  h.section(`1. administrator at ${W}px: button above the search box`);
  await openUsers();
  const btn = await h.rect(".admin-add-user-open");
  const search = await h.rect(".admin-search-row");
  h.assert(btn && btn.width > 0 && btn.right <= W && btn.x >= 0, `Add user button visible inside the viewport (${JSON.stringify(btn && { l: btn.x, r: btn.right, w: btn.width })})`);
  h.assert(btn && search && btn.bottom <= search.y, `button sits above the search box (btn.bottom ${btn?.bottom} <= search.y ${search?.y})`);
  await h.click(".admin-add-user-open");
  await h.waitFor(".admin-add-user-form");
  h.assert(await h.exists('.admin-add-user-form input[type="email"]'), "form has an email field");
  h.assert(await h.exists('.admin-add-user-form input[type="text"]'), "form has a display-name field");
  h.assert(!(await h.exists('.admin-console input[type="password"]')), "no password field anywhere in the console");
  const form = await h.rect(".admin-add-user");
  h.assert(form && form.x >= 0 && form.right <= W, `form fits the width (${form?.x}..${form?.right} of ${W})`);
  h.assert(await noHScroll(), "no horizontal page scroll with the form open");
  await h.screenshot(`admin-add-user-form-${W}.png`);

  // ---- 2. validation never reaches the server ------------------------------------------------
  h.section("2. client validation");
  const before = fnCalls.length;
  await fill("", "");
  await submit();
  h.assert((await errorText()) === "Enter an email address.", `empty -> "${await errorText()}"`);
  await fill("not-an-email", "Somebody");
  await submit();
  h.assert(/doesn't look like an email/.test((await errorText()) ?? ""), `bad email -> "${await errorText()}"`);
  await fill("someone@example.com", "");
  await submit();
  h.assert((await errorText()) === "Enter a display name.", `missing name -> "${await errorText()}"`);
  h.assert(fnCalls.length === before, `no request reached the function for invalid input (${fnCalls.length - before})`);

  // ---- 3. duplicate --------------------------------------------------------------------------
  h.section("3. an existing address is refused, no duplicate");
  await fill("Existing@Example.com", "Another Name");
  await submit();
  const dupErr = (await errorText()) ?? "";
  h.assert(/already exists/.test(dupErr) && /Search for it/.test(dupErr), `duplicate -> "${dupErr}"`);
  h.assert(fnCalls.at(-1)?.status === 409, `function answered 409 (${fnCalls.at(-1)?.status})`);
  h.assert(invites.length === 0, "no invitation was sent");
  h.assert(users.filter((u) => u.email === "existing@example.com").length === 1, "no duplicate account");
  h.assert(audit.at(-1)?.outcome === "already_exists", `audited as already_exists (${audit.at(-1)?.outcome})`);

  // ---- 4. success ----------------------------------------------------------------------------
  h.section("4. success: invitation sent, row appears, audit written");
  await fill("New.Person@Example.com", "New Person", "met at church");
  await submit();
  await h.waitFor(".admin-add-user-success");
  const ok = await h.text(".admin-add-user-success");
  h.assert(/^Invitation sent to new\.person@example\.com/.test(ok), `success text: "${ok}"`);
  h.assert(invites.length === 1 && invites[0].redirectTo === INVITE_REDIRECT_TO && INVITE_REDIRECT_TO === "https://capstonebible.com",
    `one invite, redirect ${invites[0]?.redirectTo}`);
  h.assert(audit.at(-1)?.outcome === "invited" && audit.at(-1)?.actor_id === PERSONAS.administrator.id && audit.at(-1)?.note === "met at church",
    `audit row: ${JSON.stringify(audit.at(-1))}`);
  await h.sleep(500);
  const listed = await h.evaluate(() => [...document.querySelectorAll(".admin-user-email")].map((e) => e.innerText.trim()));
  h.assert(listed.includes("new.person@example.com"), `new user listed after refresh (${listed.join(", ")})`);
  const searchVal = await h.evaluate(() => document.querySelector('.admin-search-row input')?.value);
  h.assert(searchVal === "new.person@example.com", `search box shows the new address (${searchVal})`);
  h.assert(await noHScroll(), "no horizontal scroll in the success state");
  await h.screenshot(`admin-add-user-success-${W}.png`);

  // ---- 5. rate limit via the UI --------------------------------------------------------------
  h.section("5. rate limit");
  await h.click({ css: ".admin-add-user button", text: "Add another" });
  await h.waitFor(".admin-add-user-form");
  const now = new Date().toISOString();
  for (let i = audit.filter((a) => a.actor_id === PERSONAS.administrator.id).length; i < RATE_LIMIT_PER_HOUR; i++) {
    audit.push({ id: audit.length + 1, actor_id: PERSONAS.administrator.id, email: `x${i}@e.com`, display_name: `x${i}`, note: null, outcome: "invited", created_at: now });
  }
  await fill("twentyfirst@example.com", "Twenty First");
  await submit();
  h.assert(/limit/.test((await errorText()) ?? "") && fnCalls.at(-1)?.status === 429, `21st in an hour -> 429 "${await errorText()}"`);
  h.assert(invites.length === 1, "still only one invitation sent");

  // ---- 6. member: no UI, and the function refuses a direct call ------------------------------
  h.section("6. member: no button, direct calls refused by the function");
  await h.asPersona("member");
  h.assert(!(await openAdminConsole(h)), "member: no Admin Console entry");
  h.assert(!(await h.exists(".admin-add-user-open")), "member: no Add user button anywhere");
  const direct = await h.evaluate(async (url, key) => {
    const token = JSON.parse(localStorage.getItem(key) ?? "{}").access_token;
    const call = async (auth) => {
      const r = await fetch(`${url}/functions/v1/admin-add-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: "harness-fake-anon-key", ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ email: "victim@example.com", displayName: "Victim", user_id: "00000000-0000-4000-8000-000000000004" }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    };
    return {
      member: await call(`Bearer ${token}`),
      none: await call(null),
      forged: await call(`Bearer ${token.split(".").slice(0, 2).join(".")}.forgedsignature`),
    };
  }, FAKE_URL, STORAGE_KEY);
  h.assert(direct.member.status === 403 && direct.member.body?.error === "Only administrators can add users.", `member token -> ${direct.member.status} ${JSON.stringify(direct.member.body)}`);
  h.assert(direct.none.status === 401, `no token -> ${direct.none.status}`);
  h.assert(direct.forged.status === 401, `forged signature -> ${direct.forged.status}`);
  h.assert(invites.length === 1 && !users.some((u) => u.email === "victim@example.com"), "nothing sent, no account created by any refused call");

  // ---- 7. owner: Live view works, Test view simulates ----------------------------------------
  h.section("7. owner: Test view simulates, sends nothing");
  await h.asPersona("owner");
  await openUsers();
  h.assert(await h.exists(".admin-add-user-open"), "owner sees Add user");
  await h.click({ css: ".release-view-option", text: "Test view" });
  await h.sleep(300);
  await h.click(".admin-add-user-open");
  await h.waitFor(".admin-add-user-form");
  h.assert((await h.text('.admin-add-user-form button[type="submit"]')).includes("simulated"), "submit button says simulated in Test view");
  const callsBefore = fnCalls.length;
  const reqsBefore = h.requests.filter((r) => r.path.startsWith("/functions/")).length;
  await fill("testview@example.com", "Test View Person");
  await submit();
  await h.waitFor(".admin-add-user-success");
  const sim = await h.text(".admin-add-user-success");
  h.assert(/^Simulated/.test(sim) && /nothing was\s+sent/.test(sim), `simulated success text: "${sim}"`);
  h.assert(fnCalls.length === callsBefore && h.requests.filter((r) => r.path.startsWith("/functions/")).length === reqsBefore,
    "Test view made NO request to the function");
  h.assert(!users.some((u) => u.email === "testview@example.com"), "no account created in Test view");
  await h.screenshot(`admin-add-user-testview-${W}.png`);
  await h.click({ css: ".release-view-option", text: "Live view" });

  // ---- 8. every skin at this width -----------------------------------------------------------
  h.section(`8. form at ${W}px in every skin (owner)`);
  for (const skin of SKINS) {
    await h.evaluate((s) => { try { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); } catch {} }, skin);
    await h.reload();
    await h.sleep(400);
    await openUsers();
    await h.click(".admin-add-user-open");
    await h.waitFor(".admin-add-user-form");
    const m = await h.evaluate(() => {
      const card = document.querySelector(".admin-add-user").getBoundingClientRect();
      const fields = [...document.querySelectorAll(".admin-add-user-form input, .admin-add-user-form textarea, .admin-add-user-form button")]
        .map((e) => e.getBoundingClientRect()).map((r) => ({ l: r.left, r: r.right, w: r.width, h: r.height }));
      return {
        skin: document.documentElement.getAttribute("data-skin"),
        card: { l: card.left, r: card.right },
        fieldsInside: fields.every((f) => f.l >= card.left - 1 && f.r <= card.right + 1 && f.w > 0 && f.h > 0),
        scroll: document.documentElement.scrollWidth <= window.innerWidth + 1,
        w: window.innerWidth,
      };
    });
    h.assert((skin === "default" ? m.skin === null : m.skin === skin) && m.card.l >= 0 && m.card.r <= m.w && m.fieldsInside && m.scroll,
      `skin ${skin}: card ${Math.round(m.card.l)}..${Math.round(m.card.r)} of ${m.w}, fields inside ${m.fieldsInside}, no h-scroll ${m.scroll}`);
    if (skin === "sticker" || skin === "midnight") await h.screenshot(`admin-add-user-${skin}-${W}.png`);
  }
  await h.evaluate(() => { try { localStorage.removeItem("app-skin"); } catch {} });
}
