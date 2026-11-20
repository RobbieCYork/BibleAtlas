// Unit tests for the admin-add-user authorization and validation path, with every Supabase call
// stubbed. Runs under Node 24's built-in type stripping, no dependencies:
//
//     node --test supabase/functions/admin-add-user/handler.test.ts
//
// (npm run test:admin-add-user does exactly that.) The stubs record every call, so the tests can
// assert not only the status code but that NOTHING was looked up or sent when a request is refused.

import { test } from "node:test";
import assert from "node:assert/strict";
import { handle, INVITE_REDIRECT_TO, RATE_LIMIT_PER_HOUR, type Deps } from "./handler.ts";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const GUEST_ID = "33333333-3333-4333-8333-333333333333";
const NEW_ID = "44444444-4444-4444-8444-444444444444";

interface World {
  tokens: Record<string, { id: string; isAnonymous: boolean }>;
  admins: Set<string>;
  isAdminThrows?: boolean;
  recent: number | null;
  auditWritable: boolean;
  existingEmails: Set<string>;
  takenNames: Set<string>;
  inviteResult?: Awaited<ReturnType<Deps["invite"]>>;
}

function makeDeps(world: Partial<World> = {}) {
  const w: World = {
    tokens: {
      "Bearer admin-token": { id: ADMIN_ID, isAnonymous: false },
      "Bearer member-token": { id: MEMBER_ID, isAnonymous: false },
      "Bearer guest-token": { id: GUEST_ID, isAnonymous: true },
    },
    admins: new Set([ADMIN_ID]),
    recent: 0,
    auditWritable: true,
    existingEmails: new Set(),
    takenNames: new Set(),
    ...world,
  };
  const calls: string[] = [];
  const invites: Array<{ email: string; displayName: string; redirectTo: string }> = [];
  const audits: Array<{ id: number; outcome: string; target: string | null }> = [];
  const started: Array<{ actorId: string; email: string }> = [];
  const deps: Deps = {
    async getCaller(h) {
      calls.push("getCaller");
      return w.tokens[h] ?? null;
    },
    async isAdmin(uid) {
      calls.push("isAdmin");
      if (w.isAdminThrows) throw new Error("db down");
      return w.admins.has(uid);
    },
    async countRecentAttempts() {
      calls.push("count");
      return w.recent;
    },
    async startAudit(row) {
      calls.push("startAudit");
      if (!w.auditWritable) return null;
      started.push({ actorId: row.actorId, email: row.email });
      return 7;
    },
    async finishAudit(id, outcome, target) {
      calls.push("finishAudit");
      audits.push({ id, outcome, target });
    },
    async emailExists(email) {
      calls.push("emailExists");
      return w.existingEmails.has(email);
    },
    async displayNameTaken(name) {
      calls.push("displayNameTaken");
      return w.takenNames.has(name.toLowerCase());
    },
    async invite(email, displayName, redirectTo) {
      calls.push("invite");
      invites.push({ email, displayName, redirectTo });
      return w.inviteResult ?? { ok: true, userId: NEW_ID };
    },
    now: () => new Date("2026-11-20T12:00:00Z"),
    log: () => {},
  };
  return { deps, calls, invites, audits, started };
}

function req(body: unknown, auth?: string, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };
  if (auth) headers.Authorization = auth;
  return new Request("https://fn.example/admin-add-user", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const GOOD = { email: "  New.Person@Example.com ", displayName: "  New   Person ", note: "met at church" };

// ── Authentication / authorization ──────────────────────────────────────────────────────────────

test("no Authorization header → 401, nothing else consulted", async () => {
  const { deps, calls } = makeDeps();
  const res = await handle(req(GOOD), deps);
  assert.equal(res.status, 401);
  assert.deepEqual(calls, []);
});

test("invalid token → 401, no admin lookup, no invite", async () => {
  const { deps, calls } = makeDeps();
  const res = await handle(req(GOOD, "Bearer forged"), deps);
  assert.equal(res.status, 401);
  assert.deepEqual(calls, ["getCaller"]);
});

test("guest (anonymous) token → 401", async () => {
  const { deps, calls } = makeDeps();
  const res = await handle(req(GOOD, "Bearer guest-token"), deps);
  assert.equal(res.status, 401);
  assert.ok(!calls.includes("isAdmin"));
});

test("member (non-admin) → 403 before the body or the address is ever looked at", async () => {
  const { deps, calls, invites } = makeDeps({ existingEmails: new Set(["new.person@example.com"]) });
  const res = await handle(req(GOOD, "Bearer member-token"), deps);
  assert.equal(res.status, 403);
  assert.deepEqual(calls, ["getCaller", "isAdmin"]);
  assert.equal(invites.length, 0);
  // Same response whether or not the address exists — a member learns nothing.
  const body = await res.json();
  assert.equal(body.error, "Only administrators can add users.");
});

test("member cannot become admin by claiming an id in the body", async () => {
  const { deps, calls } = makeDeps();
  const res = await handle(req({ ...GOOD, user_id: ADMIN_ID, actorId: ADMIN_ID, role: "owner" }, "Bearer member-token"), deps);
  assert.equal(res.status, 403);
  assert.ok(!calls.includes("invite"));
});

test("admin lookup that errors is treated as not-admin (fail closed)", async () => {
  const { deps, calls } = makeDeps({ isAdminThrows: true });
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 403);
  assert.ok(!calls.includes("invite"));
});

test("GET is refused", async () => {
  const { deps } = makeDeps();
  const res = await handle(new Request("https://fn.example/x", { method: "GET", headers: { Authorization: "Bearer admin-token" } }), deps);
  assert.equal(res.status, 405);
});

// ── Happy path ──────────────────────────────────────────────────────────────────────────────────

test("admin with valid input → invitation sent to the cleaned address, fixed redirect, audited", async () => {
  const { deps, invites, audits, started } = makeDeps();
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { invited: true, email: "new.person@example.com" });
  assert.deepEqual(invites, [{ email: "new.person@example.com", displayName: "New Person", redirectTo: INVITE_REDIRECT_TO }]);
  assert.deepEqual(started, [{ actorId: ADMIN_ID, email: "new.person@example.com" }]);
  assert.deepEqual(audits, [{ id: 7, outcome: "invited", target: NEW_ID }]);
  // No password anywhere in what goes out or comes back.
  assert.ok(!JSON.stringify(body).toLowerCase().includes("password"));
});

test("redirect cannot be steered by body, Origin or Referer", async () => {
  const { deps, invites } = makeDeps();
  await handle(
    req({ ...GOOD, redirectTo: "https://evil.example" }, "Bearer admin-token", {
      Origin: "https://evil.example",
      Referer: "https://evil.example/x",
    }),
    deps
  );
  assert.equal(invites[0].redirectTo, "https://capstonebible.com");
});

// ── Validation ──────────────────────────────────────────────────────────────────────────────────

for (const [name, body] of [
  ["missing email", { displayName: "A" }],
  ["bad email", { email: "not-an-email", displayName: "A" }],
  ["email with space", { email: "a b@c.com", displayName: "A" }],
  ["over-long email", { email: `${"a".repeat(250)}@x.com`, displayName: "A" }],
  ["missing display name", { email: "a@b.co" }],
  ["blank display name", { email: "a@b.co", displayName: "   " }],
  ["over-long display name", { email: "a@b.co", displayName: "x".repeat(51) }],
  ["zero-width char in name", { email: "a@b.co", displayName: "Ro​bie" }],
  ["over-long note", { email: "a@b.co", displayName: "A", note: "n".repeat(501) }],
  ["non-object body", "[1,2,3]"],
  ["not JSON", "{oops"],
] as const) {
  test(`validation: ${name} → 400 and nothing sent`, async () => {
    const { deps, calls } = makeDeps();
    const res = await handle(req(body, "Bearer admin-token"), deps);
    assert.equal(res.status, 400);
    assert.ok(!calls.includes("invite"));
    assert.ok(!calls.includes("startAudit"));
  });
}

test("oversized body → 413", async () => {
  const { deps, calls } = makeDeps();
  const res = await handle(req({ ...GOOD, pad: "x".repeat(5000) }, "Bearer admin-token"), deps);
  assert.equal(res.status, 413);
  assert.ok(!calls.includes("invite"));
});

// ── Rate limit and audit ────────────────────────────────────────────────────────────────────────

test(`rate limit: ${RATE_LIMIT_PER_HOUR} attempts in the last hour → 429`, async () => {
  const { deps, calls } = makeDeps({ recent: RATE_LIMIT_PER_HOUR });
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 429);
  assert.ok(!calls.includes("startAudit"));
  assert.ok(!calls.includes("invite"));
});

test("one under the limit is allowed", async () => {
  const { deps } = makeDeps({ recent: RATE_LIMIT_PER_HOUR - 1 });
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 200);
});

test("audit table missing (sql/044 not applied) → 503, nothing sent", async () => {
  const { deps, calls } = makeDeps({ recent: null });
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 503);
  assert.ok(!calls.includes("invite"));
});

test("audit row cannot be written → 503, nothing sent", async () => {
  const { deps, calls } = makeDeps({ auditWritable: false });
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 503);
  assert.ok(!calls.includes("invite"));
});

test("audit is written before the invitation", async () => {
  const { deps, calls } = makeDeps();
  await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.ok(calls.indexOf("startAudit") < calls.indexOf("invite"));
});

// ── Duplicates ──────────────────────────────────────────────────────────────────────────────────

test("existing account → 409 'exists', no invite, audited as already_exists, no extra info", async () => {
  const { deps, calls, audits } = makeDeps({ existingEmails: new Set(["new.person@example.com"]) });
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.code, "exists");
  assert.deepEqual(Object.keys(body).sort(), ["code", "error"]);
  assert.ok(!calls.includes("invite"));
  assert.deepEqual(audits, [{ id: 7, outcome: "already_exists", target: null }]);
});

test("Auth itself reports the address exists (backstop) → same 409", async () => {
  const { deps, audits } = makeDeps({ inviteResult: { ok: false, exists: true, message: "A user with this email address has already been registered" } });
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "exists");
  assert.equal(audits[0].outcome, "already_exists");
});

test("display name taken → 409 'name_taken', no invite", async () => {
  const { deps, calls } = makeDeps({ takenNames: new Set(["new person"]) });
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "name_taken");
  assert.ok(!calls.includes("invite"));
});

test("invite failure → 502 with a generic message (Auth's text not echoed), audited as failed", async () => {
  const { deps, audits } = makeDeps({ inviteResult: { ok: false, exists: false, message: "smtp: internal detail" } });
  const res = await handle(req(GOOD, "Bearer admin-token"), deps);
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.ok(!String(body.error).includes("smtp"));
  assert.equal(audits[0].outcome, "failed");
});

test("OPTIONS preflight answers without touching anything", async () => {
  const { deps, calls } = makeDeps();
  const res = await handle(new Request("https://fn.example/x", { method: "OPTIONS" }), deps);
  assert.equal(res.status, 200);
  assert.deepEqual(calls, []);
});
