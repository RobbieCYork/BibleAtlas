// Unit tests for Groups phase 3 (invites): templates, providers, the mailer loop with a FAKE CLOCK,
// the unsubscribe and bounce/complaint handlers, and the webhook signature. No network: global fetch
// is replaced with one that fails the test if anything calls it, and every provider is a fake or the
// dry run.
//
//   node --test supabase/functions/_shared/invites.test.ts      (Node 24 strips the types)
//
// The schedule itself (which day each reminder goes out, quiet hours, caps, stop rules) is decided
// in SQL and proven with a fake clock by sql/tests/049_groups_invites_test.sql. The one fact both
// halves share — the reminder offsets — is checked here against the SQL source.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanLine,
  escapeHtml,
  INVITE_MAX_EMAILS,
  INVITE_REMINDER_DAYS,
  POSTAL_ADDRESS_PLACEHOLDER,
  renderFullNotice,
  renderInviteEmail,
  type InviteEmailInput,
} from "./inviteEmail.ts";
import { dryRunProvider, maskEmail, providerFromEnv, resendProvider, RESEND_ENDPOINT, type FetchLike, type MailProvider, type OutgoingEmail } from "./inviteMail.ts";
import { buildInviteEmail, runMailer, type InviteClaim, type MailerConfig, type MailerDb } from "./inviteMailer.ts";
import { eventKind, handleEmailEvent, handleUnsubscribe } from "./inviteHandlers.ts";
import { svixSignForTest, verifySvixSignature } from "./svix.ts";

// Nothing in this file may reach the network.
globalThis.fetch = (() => {
  throw new Error("NETWORK USED IN A TEST");
}) as typeof fetch;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const T1 = "a".repeat(64);
const U1 = "b".repeat(64);

const base: InviteEmailInput = {
  kind: "school",
  stage: "invite",
  seq: 1,
  className: "Bible 101",
  orgName: "Valley Christian School",
  teacherName: "Ms Ruth Baker",
  personalNote: "See you Tuesday!",
  joinUrl: `https://capstonebible.com/?joinClass=${T1}`,
  unsubscribeUrl: `https://capstonebible.com/email/unsubscribe.html#t=${U1}`,
  reportUrl: "mailto:admin@capstonebible.com?subject=Report",
  postalAddress: "Capstone Digital LLC, 1 Main St, Boise, ID 83702",
  expiresAt: "2027-01-05T00:00:00Z",
};

// ---------------------------------------------------------------- schedule parity with SQL

test("the reminder offsets match sql/049 invite_reminder_offsets()", () => {
  const sql = fs.readFileSync(path.join(HERE, "../../../sql/049_groups_invites.sql"), "utf8");
  const m = /select array\[([0-9,\s]+)\];\s+-- INVITE_REMINDER_DAYS/.exec(sql);
  assert.ok(m, "the INVITE_REMINDER_DAYS line is in sql/049");
  assert.deepEqual(m[1].split(",").map((s) => Number(s.trim())), [...INVITE_REMINDER_DAYS]);
  assert.deepEqual([...INVITE_REMINDER_DAYS], [1, 3, 5, 14, 30]);
  assert.equal(INVITE_MAX_EMAILS, 6);
});

// ---------------------------------------------------------------- templates

test("escapeHtml and cleanLine neutralise markup, control characters and header injection", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.equal(cleanLine("Hi\r\nBcc: evil@x.test\u0000", 100), "Hi Bcc: evil@x.test");
  assert.equal(cleanLine("x".repeat(300), 280).length, 280);
  assert.equal(cleanLine("‮evil‬", 20), "evil");
});

test("the invite says who, what, how to leave, and where we are", () => {
  const r = renderInviteEmail(base);
  assert.equal(r.subject, "Ms Ruth Baker invited you to join Bible 101 on Capstone Bible");
  for (const part of [r.html, r.text]) {
    assert.match(part, /Ms Ruth Baker/);
    assert.match(part, /Valley Christian School/);
    assert.match(part, /teacher at Valley Christian School/);
    assert.match(part, /class (&quot;|")Bible 101(&quot;|")/);
    assert.match(part, /See you Tuesday!/);
    assert.match(part, /13 or older/);
    assert.match(part, /invitation to Capstone Bible, a paid service/);
    assert.match(part, /Capstone Bible, Capstone Digital LLC, 1 Main St, Boise, ID 83702/);
    assert.ok(part.includes(`#t=${U1}`), "unsubscribe link");
    assert.ok(part.includes(`joinClass=${T1}`), "join link");
    assert.match(part, /Unsubscribe/);
    assert.match(part, /Report abuse/);
    assert.ok(part.includes("mailto:admin@capstonebible.com"), "report link");
    assert.match(part, /won(&#39;|')t see your notes, highlights, prayer list or messages/);
  }
  assert.match(r.html, /<html lang="en">/);
  assert.match(r.text, /up to 5 reminders/);
});

test("church wording, and no teacher name falls back to 'Your leader'", () => {
  const r = renderInviteEmail({ ...base, kind: "church", teacherName: null, className: "Romans Study", orgName: "Grace Church" });
  assert.equal(r.subject, "Your leader invited you to join Romans Study on Capstone Bible");
  assert.match(r.text, /leader at Grace Church/);
  assert.match(r.text, /group "Romans Study"/);
  assert.doesNotMatch(r.text, /teacher|class "/);
});

test("reminders say which reminder they are", () => {
  const r = renderInviteEmail({ ...base, stage: "reminder", seq: 3 });
  assert.match(r.subject, /^Reminder: /);
  assert.match(r.text, /This is reminder 2 of 5/);
});

test("every piece of teacher text is escaped in the HTML", () => {
  const evil = `<script>alert(1)</script><img src=x onerror=alert(2)>`;
  const r = renderInviteEmail({ ...base, personalNote: evil, className: `"><b>x`, teacherName: `<i>T</i>`, orgName: `O&<s>` });
  assert.doesNotMatch(r.html, /<script|<img|<b>|<i>|<s>|onerror=alert\(2\)>/);
  assert.match(r.html, /&lt;script&gt;/);
  assert.doesNotMatch(r.subject, /[\r\n]/);
});

test("the note is capped at 280 characters and omitted when empty", () => {
  const r = renderInviteEmail({ ...base, personalNote: "n".repeat(1000) });
  assert.ok(!r.text.includes("n".repeat(281)));
  const none = renderInviteEmail({ ...base, personalNote: null });
  assert.doesNotMatch(none.text, /A note from/);
});

test("only https (or local http) links are made clickable", () => {
  const r = renderInviteEmail({ ...base, joinUrl: "javascript:alert(1)", unsubscribeUrl: "http://evil.test/x" });
  assert.doesNotMatch(r.html, /javascript:/);
  assert.doesNotMatch(r.html, /evil\.test/);
});

test("without a postal address the placeholder shows (previews only; live mail refuses)", () => {
  const r = renderInviteEmail({ ...base, postalAddress: null });
  assert.ok(r.text.includes(POSTAL_ADDRESS_PLACEHOLDER));
});

test("the class-full notice", () => {
  const r = renderFullNotice({ kind: "school", className: "Bible 101", seats: 20, appUrl: "https://capstonebible.com", postalAddress: null });
  assert.equal(r.subject, "Your class Bible 101 is full");
  assert.match(r.text, /all 20 seats are taken/);
});

// ---------------------------------------------------------------- providers

test("no RESEND_API_KEY means dry run, and the dry run never fetches", async () => {
  const lines: string[] = [];
  const failFetch: FetchLike = async () => {
    throw new Error("network");
  };
  const c = providerFromEnv(() => undefined, failFetch, (l) => lines.push(l));
  assert.equal(c.mode, "dry_run");
  assert.equal(c.provider.live, false);
  const r = await c.provider.send({ from: "a", to: "someone@example.com", subject: "S", html: "", text: "", headers: {}, idempotencyKey: "k" });
  assert.equal(r.ok, true);
  assert.ok(lines[0].includes("s***@example.com"), "masked");
  assert.ok(!lines.join("").includes("someone@"), "the full address is never logged");
  assert.equal(providerFromEnv((k) => (k === "RESEND_API_KEY" ? "re_abcdefgh123" : k === "INVITE_DRY_RUN" ? "true" : undefined), failFetch, () => {}).mode, "dry_run");
  assert.equal(providerFromEnv((k) => (k === "RESEND_API_KEY" ? "sk_live_wrong" : undefined), failFetch, () => {}).mode, "dry_run");
  assert.equal(providerFromEnv((k) => (k === "RESEND_API_KEY" ? "re_abcdefgh123" : undefined), failFetch, () => {}).mode, "live");
});

test("maskEmail", () => {
  assert.equal(maskEmail("ruth@example.com"), "r***@example.com");
  assert.equal(maskEmail("nope"), "***");
});

test("Resend request shape: endpoint, bearer key, idempotency key, one recipient", async () => {
  const calls: { url: string; init: { headers: Record<string, string>; body: string } }[] = [];
  const f: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return { status: 200, ok: true, text: async () => JSON.stringify({ id: "msg_123" }) };
  };
  const p = resendProvider("re_testkey_123", f);
  const r = await p.send({ from: "Capstone Bible <i@invite.capstonebible.com>", to: "x@y.test", replyTo: "r@y.test", subject: "S", html: "<p>h</p>", text: "t", headers: { "List-Unsubscribe": "<u>" }, idempotencyKey: "invite-send-7" });
  assert.deepEqual(r, { ok: true, id: "msg_123" });
  assert.equal(calls[0].url, RESEND_ENDPOINT);
  assert.equal(calls[0].init.headers.Authorization, "Bearer re_testkey_123");
  assert.equal(calls[0].init.headers["Idempotency-Key"], "invite-send-7");
  const b = JSON.parse(calls[0].init.body);
  assert.deepEqual(b.to, ["x@y.test"]);
  assert.equal(b.reply_to, "r@y.test");
  assert.equal(b.headers["List-Unsubscribe"], "<u>");
});

test("an HTTP refusal is definite; a network error is not", async () => {
  const refused = resendProvider("re_k_12345678", async () => ({ status: 422, ok: false, text: async () => "{}" }));
  assert.deepEqual(await refused.send(mail()), { ok: false, definite: true, status: 422, error: "resend 422" });
  const down = resendProvider("re_k_12345678", async () => {
    throw new TypeError("fetch failed");
  });
  const r = await down.send(mail());
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.definite, false);
});

function mail(): OutgoingEmail {
  return { from: "f", to: "t@x.test", subject: "s", html: "h", text: "t", headers: {}, idempotencyKey: "k" };
}

// ---------------------------------------------------------------- the mailer loop (fake clock)

const CFG: MailerConfig = {
  appUrl: "https://capstonebible.com",
  functionsUrl: "https://ref.supabase.co/functions/v1",
  from: "Capstone Bible <invites@invite.capstonebible.com>",
  replyTo: null,
  postalAddress: "Capstone Digital LLC, 1 Main St, Boise, ID 83702",
  reportUrl: "mailto:admin@capstonebible.com",
  batch: 50,
};

function claim(n: number, over: Partial<InviteClaim> = {}): InviteClaim {
  return {
    send_id: n, invite_id: `inv-${n}`, seq: 1, stage: "invite", to: `p${n}@x.test`, kind: "school", class_name: "Bible 101",
    org_name: "Valley", teacher_name: "T", personal_note: null, expires_at: null, join_token: T1, unsub_token: U1, ...over,
  };
}

function fakeDb(claims: InviteClaim[]) {
  const calls = { claimDue: [] as string[], sent: [] as [number, string][], failed: [] as [number, string][], notices: 0 };
  const db: MailerDb = {
    async claimDue(nowIso, limit) {
      calls.claimDue.push(`${nowIso}|${limit}`);
      return claims;
    },
    async markSent(id, pid) {
      calls.sent.push([id, pid]);
    },
    async markFailed(id, e) {
      calls.failed.push([id, e]);
    },
    async claimFullNotices() {
      calls.notices++;
      return [];
    },
  };
  return { db, calls };
}

const fakeProvider = (decide: (m: OutgoingEmail) => Awaited<ReturnType<MailProvider["send"]>>) => {
  const sent: OutgoingEmail[] = [];
  const p: MailProvider = {
    name: "resend",
    live: true,
    async send(m) {
      sent.push(m);
      return decide(m);
    },
  };
  return { p, sent };
};

const FAKE_NOW = new Date("2027-01-04T17:00:00.000Z");

test("dry run claims nothing and sends nothing", async () => {
  const { db, calls } = fakeDb([claim(1)]);
  const lines: string[] = [];
  const r = await runMailer({ db, provider: dryRunProvider(() => {}), mode: "dry_run", modeReason: "RESEND_API_KEY is not set", config: CFG, clock: () => FAKE_NOW, log: (l) => lines.push(l) });
  assert.equal(r.mode, "dry_run");
  assert.equal(calls.claimDue.length, 0);
  assert.equal(calls.notices, 0);
  assert.match(lines[0], /nothing claimed, nothing sent/);
});

test("live without a postal address refuses before claiming", async () => {
  const { db, calls } = fakeDb([claim(1)]);
  const { p, sent } = fakeProvider(() => ({ ok: true, id: "m" }));
  const r = await runMailer({ db, provider: p, mode: "live", modeReason: "", config: { ...CFG, postalAddress: null }, clock: () => FAKE_NOW, log: () => {} });
  assert.equal(r.mode, "refused");
  assert.equal(calls.claimDue.length, 0);
  assert.equal(sent.length, 0);
});

test("live: the fake clock is what the database is asked about; sent / refused / unknown handled", async () => {
  const { db, calls } = fakeDb([claim(1), claim(2), claim(3), claim(4, { seq: 2, stage: "reminder" })]);
  const { p, sent } = fakeProvider((m) =>
    m.to === "p2@x.test" ? { ok: false, definite: true, status: 422, error: "resend 422" }
    : m.to === "p3@x.test" ? { ok: false, definite: false, error: "network: TypeError" }
    : { ok: true, id: `msg_${m.to}` },
  );
  const r = await runMailer({ db, provider: p, mode: "live", modeReason: "", config: { ...CFG, batch: 500 }, clock: () => FAKE_NOW, log: () => {} });
  assert.deepEqual(calls.claimDue, ["2027-01-04T17:00:00.000Z|100"], "fake clock passed through; batch capped at 100");
  assert.deepEqual(calls.sent, [[1, "msg_p1@x.test"], [4, "msg_p4@x.test"]]);
  assert.deepEqual(calls.failed, [[2, "resend 422"]], "a definite refusal releases the slot");
  assert.equal(r.unknown, 1, "a network error is left claimed (at most once)");
  assert.deepEqual([r.claimed, r.sent, r.failed], [4, 2, 1]);
  assert.equal(sent[0].idempotencyKey, "invite-send-1");
  assert.equal(sent[3].subject.startsWith("Reminder: "), true);
  assert.equal(sent[0].headers["List-Unsubscribe"], `<https://ref.supabase.co/functions/v1/group-invite-unsubscribe?t=${U1}>`);
  assert.equal(sent[0].headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.equal(calls.notices, 1);
});

test("a claim with a malformed token is never sent", async () => {
  const { db, calls } = fakeDb([claim(9, { join_token: "short" })]);
  const { p, sent } = fakeProvider(() => ({ ok: true, id: "m" }));
  await runMailer({ db, provider: p, mode: "live", modeReason: "", config: CFG, clock: () => FAKE_NOW, log: () => {} });
  assert.equal(sent.length, 0);
  assert.equal(calls.failed.length, 1);
});

test("buildInviteEmail puts the unsubscribe token in the fragment, not the query", () => {
  const e = buildInviteEmail(claim(1), CFG);
  assert.ok(e.text.includes(`/email/unsubscribe.html#t=${U1}`));
  assert.ok(!e.text.includes(`unsubscribe.html?t=`));
});

// ---------------------------------------------------------------- unsubscribe handler

const UNSUB_DEPS = () => {
  const calls: [string, string][] = [];
  return { calls, deps: { appUrl: "https://capstonebible.com", unsubscribe: async (t: string, s: "all" | "class") => (calls.push([t, s]), { ok: true }) } };
};

test("unsubscribe: page POST with scope, bad token refused, GET never acts", async () => {
  const { calls, deps } = UNSUB_DEPS();
  let r = await handleUnsubscribe({ method: "POST", url: "https://f/u", contentType: "application/json", body: JSON.stringify({ token: U1, scope: "class" }) }, deps);
  assert.equal(r.status, 200);
  assert.deepEqual(calls, [[U1, "class"]]);
  r = await handleUnsubscribe({ method: "POST", url: "https://f/u", contentType: "application/json", body: JSON.stringify({ token: "nope" }) }, deps);
  assert.equal(r.status, 400);
  r = await handleUnsubscribe({ method: "GET", url: `https://f/u?t=${U1}`, contentType: "", body: "" }, deps);
  assert.equal(r.status, 303);
  assert.equal(r.headers.Location, `https://capstonebible.com/email/unsubscribe.html#t=${U1}`);
  assert.equal(calls.length, 1, "GET did not unsubscribe");
  assert.equal(r.headers["Access-Control-Allow-Origin"], undefined);
  r = await handleUnsubscribe({ method: "OPTIONS", url: "https://f/u", contentType: "", body: "" }, deps);
  assert.equal(r.headers["Access-Control-Allow-Origin"], "https://capstonebible.com");
});

test("unsubscribe: RFC 8058 one-click POST unsubscribes from everything", async () => {
  const { calls, deps } = UNSUB_DEPS();
  const r = await handleUnsubscribe({ method: "POST", url: `https://f/u?t=${U1}`, contentType: "application/x-www-form-urlencoded", body: "List-Unsubscribe=One-Click" }, deps);
  assert.equal(r.status, 200);
  assert.deepEqual(calls, [[U1, "all"]]);
});

// ---------------------------------------------------------------- webhook signature + events

const WH = "whsec_" + Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
const NOW = 1_800_000_000;

test("Svix signature: valid, tampered, wrong secret, stale, rolled secrets", async () => {
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "msg_1" } });
  const h = await svixSignForTest(body, WH, "msg_evt_1", NOW);
  assert.deepEqual(await verifySvixSignature(body, h, WH, NOW), { ok: true });
  assert.equal((await verifySvixSignature(body + " ", h, WH, NOW)).ok, false);
  const other = "whsec_" + Buffer.from("ffffffffffffffffffffffffffffffff").toString("base64");
  assert.equal((await verifySvixSignature(body, h, other, NOW)).ok, false);
  assert.equal((await verifySvixSignature(body, h, WH, NOW + 301)).ok, false);
  assert.equal((await verifySvixSignature(body, { ...h, signature: `v1,AAAA ${h.signature}` }, WH, NOW)).ok, true);
  assert.equal((await verifySvixSignature(body, { ...h, id: null }, WH, NOW)).ok, false);
  // independent computation with node:crypto
  const { createHmac } = await import("node:crypto");
  const expect = createHmac("sha256", Buffer.from("0123456789abcdef0123456789abcdef")).update(`msg_evt_1.${NOW}.${body}`).digest("base64");
  assert.equal(h.signature, `v1,${expect}`);
});

test("email events: bounces and complaints recorded by svix-id; others ignored; bad signature 401", async () => {
  const rec: [string, string, string][] = [];
  const deps = { secret: WH, nowSeconds: NOW, record: async (e: string, k: "bounce" | "complaint", p: string) => (rec.push([e, k, p]), { outcome: "applied" }) };
  const b1 = JSON.stringify({ type: "email.bounced", data: { email_id: "msg_1" } });
  let r = await handleEmailEvent(b1, await svixSignForTest(b1, WH, "evt_a", NOW), deps);
  assert.equal(r.status, 200);
  const b2 = JSON.stringify({ type: "email.delivered", data: { email_id: "msg_2" } });
  r = await handleEmailEvent(b2, await svixSignForTest(b2, WH, "evt_b", NOW), deps);
  assert.match(r.body, /ignored/);
  r = await handleEmailEvent(b1, { id: "evt_c", timestamp: String(NOW), signature: "v1,bad" }, deps);
  assert.equal(r.status, 401);
  r = await handleEmailEvent(b1, await svixSignForTest(b1, WH, "evt_d", NOW), { ...deps, secret: undefined });
  assert.equal(r.status, 500);
  assert.deepEqual(rec, [["evt_a", "bounce", "msg_1"]]);
  assert.equal(eventKind("email.complained"), "complaint");
});
