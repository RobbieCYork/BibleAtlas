// Unit tests for the billing Edge Functions' shared logic. No network, no database.
//
//   node --test supabase/functions/_shared/stripe.test.ts      (Node 24 strips the types)
//
// Covers: webhook signature verification (valid, tampered body, wrong secret, replay window,
// secret roll with two v1 entries, malformed headers), Stripe form encoding, subscription
// normalisation across API versions, and the webhook's idempotency / user-resolution decisions
// with fake dependencies. The SQL half of idempotency (event id recorded in the same transaction
// as the write) is proven by sql/tests/045_stripe_billing_test.sql.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formEncode,
  keyIsLive,
  normaliseSubscription,
  signForTest,
  subscriptionIdOf,
  verifyStripeSignature,
  type StripeEvent,
  type StripeSubscription,
} from "./stripe.ts";
import { handleStripeEvent, type WebhookDeps } from "./stripeWebhook.ts";

const SECRET = "whsec_test_0123456789abcdef";
const BODY = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated" });
const NOW = 1_800_000_000;

// ---------------------------------------------------------------- signatures

test("accepts a correctly signed body", async () => {
  const header = await signForTest(BODY, SECRET, NOW);
  assert.deepEqual(await verifyStripeSignature(BODY, header, SECRET, NOW), { ok: true, timestamp: NOW });
});

test("matches Stripe's published HMAC construction (t.payload, hex SHA-256)", async () => {
  // Independent computation with node:crypto, so the test does not just agree with itself.
  const { createHmac } = await import("node:crypto");
  const expected = createHmac("sha256", SECRET).update(`${NOW}.${BODY}`).digest("hex");
  const r = await verifyStripeSignature(BODY, `t=${NOW},v1=${expected}`, SECRET, NOW);
  assert.equal(r.ok, true);
});

test("rejects a tampered body", async () => {
  const header = await signForTest(BODY, SECRET, NOW);
  const r = await verifyStripeSignature(BODY.replace("updated", "deleted"), header, SECRET, NOW);
  assert.deepEqual(r, { ok: false, reason: "signature mismatch" });
});

test("rejects the wrong secret", async () => {
  const header = await signForTest(BODY, "whsec_other", NOW);
  assert.equal((await verifyStripeSignature(BODY, header, SECRET, NOW)).ok, false);
});

test("rejects a replay outside the 5-minute tolerance, either direction", async () => {
  const header = await signForTest(BODY, SECRET, NOW);
  assert.equal((await verifyStripeSignature(BODY, header, SECRET, NOW + 301)).ok, false);
  assert.equal((await verifyStripeSignature(BODY, header, SECRET, NOW - 301)).ok, false);
  assert.equal((await verifyStripeSignature(BODY, header, SECRET, NOW + 299)).ok, true);
});

test("a re-signed old body with a fresh timestamp only passes with the real secret", async () => {
  // Changing t without re-signing must fail: the timestamp is inside the signed payload.
  const header = await signForTest(BODY, SECRET, NOW - 1000);
  const forged = header.replace(`t=${NOW - 1000}`, `t=${NOW}`);
  assert.equal((await verifyStripeSignature(BODY, forged, SECRET, NOW)).ok, false);
});

test("accepts any v1 during a secret roll", async () => {
  const good = (await signForTest(BODY, SECRET, NOW)).split("v1=")[1];
  const header = `t=${NOW},v1=${"0".repeat(64)},v1=${good},v0=ignored`;
  assert.equal((await verifyStripeSignature(BODY, header, SECRET, NOW)).ok, true);
});

test("rejects missing or malformed headers and a missing secret", async () => {
  for (const h of [null, "", "garbage", `t=${NOW}`, `v1=${"a".repeat(64)}`, `t=abc,v1=${"a".repeat(64)}`]) {
    assert.equal((await verifyStripeSignature(BODY, h, SECRET, NOW)).ok, false, String(h));
  }
  const header = await signForTest(BODY, SECRET, NOW);
  assert.equal((await verifyStripeSignature(BODY, header, "", NOW)).ok, false);
});

// ---------------------------------------------------------------- small helpers

test("keyIsLive", () => {
  assert.equal(keyIsLive("sk_test_abc"), false);
  assert.equal(keyIsLive("rk_test_abc"), false);
  assert.equal(keyIsLive("sk_live_abc"), true);
  assert.equal(keyIsLive("rk_live_abc"), true);
});

test("formEncode nests objects and arrays the way Stripe expects", () => {
  const s = formEncode({
    mode: "subscription",
    line_items: [{ price: "price_1", quantity: 1 }],
    subscription_data: { metadata: { supabase_user_id: "u&1" } },
    skip: undefined,
  });
  assert.equal(
    decodeURIComponent(s),
    "mode=subscription&line_items[0][price]=price_1&line_items[0][quantity]=1&subscription_data[metadata][supabase_user_id]=u&1"
  );
  assert.ok(s.includes("u%261"), "values are percent-encoded");
});

test("normaliseSubscription reads the period from items (basil) or the subscription (older)", () => {
  const basil: StripeSubscription = {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    items: { data: [{ current_period_end: 2000, price: { id: "price_m", recurring: { interval: "month" } } }] },
  };
  assert.deepEqual(normaliseSubscription(basil), {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    price_id: "price_m",
    interval: "month",
    current_period_end: 2000,
    cancel_at_period_end: false,
    canceled_at: null,
  });
  const legacy: StripeSubscription = { id: "sub_2", customer: { id: "cus_2" }, status: "past_due", current_period_end: 3000 };
  assert.equal(normaliseSubscription(legacy).current_period_end, 3000);
  assert.equal(normaliseSubscription(legacy).customer, "cus_2");
  assert.throws(() => normaliseSubscription({ ...legacy, status: "bogus" }));
});

test("subscriptionIdOf handles every handled event, including basil invoices", () => {
  const ev = (type: string, object: Record<string, unknown>): StripeEvent => ({ id: "evt", type, created: NOW, livemode: false, data: { object } });
  assert.equal(subscriptionIdOf(ev("checkout.session.completed", { mode: "subscription", subscription: "sub_a" })), "sub_a");
  assert.equal(subscriptionIdOf(ev("checkout.session.completed", { mode: "payment" })), null);
  assert.equal(subscriptionIdOf(ev("customer.subscription.deleted", { id: "sub_b" })), "sub_b");
  assert.equal(subscriptionIdOf(ev("invoice.payment_failed", { subscription: "sub_c" })), "sub_c");
  assert.equal(
    subscriptionIdOf(ev("invoice.payment_failed", { parent: { subscription_details: { subscription: "sub_d" } } })),
    "sub_d"
  );
});

// ---------------------------------------------------------------- webhook decisions

const USER = "11111111-2222-4333-8444-555555555555";
const SUB: StripeSubscription = {
  id: "sub_1",
  customer: "cus_1",
  status: "active",
  metadata: { supabase_user_id: USER },
  items: { data: [{ current_period_end: NOW + 86400 * 30, price: { id: "price_m", recurring: { interval: "month" } } }] },
};

/** A fake that models sql/045's ledger: an event id is recorded once, atomically with its write. */
function fakeDeps(opts: { mapping?: string | null; customerMeta?: string | null; applyError?: { code: string } } = {}) {
  const ledger = new Set<string>();
  const applied: Array<{ eventId: string; userId: string; status: string }> = [];
  const recorded: Array<{ eventId: string; outcome: string }> = [];
  let stripeCalls = 0;
  const deps: WebhookDeps = {
    retrieveSubscription: async () => {
      stripeCalls++;
      return SUB;
    },
    retrieveCustomerUserId: async () => opts.customerMeta ?? null,
    findUserByCustomer: async () => (opts.mapping === undefined ? USER : opts.mapping),
    isProcessed: async (id) => ledger.has(id),
    apply: async (a) => {
      if (opts.applyError) throw opts.applyError;
      if (ledger.has(a.eventId)) return "duplicate";
      ledger.add(a.eventId);
      applied.push({ eventId: a.eventId, userId: a.userId, status: a.sub.status });
      return "applied";
    },
    record: async (a) => {
      if (ledger.has(a.eventId)) return false;
      ledger.add(a.eventId);
      recorded.push({ eventId: a.eventId, outcome: a.outcome });
      return true;
    },
  };
  return { deps, ledger, applied, recorded, stripeCalls: () => stripeCalls };
}

const subEvent = (id: string, type = "customer.subscription.updated"): StripeEvent => ({
  id,
  type,
  created: NOW,
  livemode: false,
  data: { object: { id: "sub_1", customer: "cus_1" } },
});

test("the same event delivered twice is applied once", async () => {
  const f = fakeDeps();
  assert.equal(await handleStripeEvent(subEvent("evt_1"), f.deps), "applied");
  assert.equal(await handleStripeEvent(subEvent("evt_1"), f.deps), "duplicate");
  assert.equal(f.applied.length, 1);
  assert.equal(f.stripeCalls(), 1, "a known duplicate does not even call Stripe");
});

test("a concurrent duplicate that slips past the early check is still applied once (SQL ledger)", async () => {
  const f = fakeDeps();
  const racing = { ...f.deps, isProcessed: async () => false };
  const [a, b] = await Promise.all([handleStripeEvent(subEvent("evt_r"), racing), handleStripeEvent(subEvent("evt_r"), racing)]);
  assert.deepEqual([a, b].sort(), ["applied", "duplicate"]);
  assert.equal(f.applied.length, 1);
});

test("events we do not handle are ignored without a write", async () => {
  const f = fakeDeps();
  assert.equal(await handleStripeEvent({ ...subEvent("evt_i"), type: "invoice.paid" }, f.deps), "ignored");
  assert.equal(f.ledger.size, 0);
});

test("a one-off payment checkout is recorded, not applied", async () => {
  const f = fakeDeps();
  const ev: StripeEvent = { ...subEvent("evt_p", "checkout.session.completed"), data: { object: { mode: "payment" } } };
  assert.equal(await handleStripeEvent(ev, f.deps), "no_subscription");
  assert.deepEqual(f.recorded, [{ eventId: "evt_p", outcome: "no_subscription" }]);
});

test("the stripe_customers mapping wins over a client_reference_id", async () => {
  const f = fakeDeps({ mapping: USER });
  const ev: StripeEvent = {
    ...subEvent("evt_c", "checkout.session.completed"),
    data: { object: { mode: "subscription", subscription: "sub_1", client_reference_id: "99999999-2222-4333-8444-555555555555" } },
  };
  assert.equal(await handleStripeEvent(ev, f.deps), "applied");
  assert.equal(f.applied[0].userId, USER);
});

test("without a mapping, checkout's client_reference_id is used; garbage ids are not", async () => {
  const f = fakeDeps({ mapping: null });
  const other = "22222222-2222-4333-8444-555555555555";
  const ev: StripeEvent = {
    ...subEvent("evt_d", "checkout.session.completed"),
    data: { object: { mode: "subscription", subscription: "sub_1", client_reference_id: other } },
  };
  assert.equal(await handleStripeEvent(ev, f.deps), "applied");
  assert.equal(f.applied[0].userId, other);

  const g = fakeDeps({ mapping: null });
  const noMeta = { ...g.deps, retrieveSubscription: async () => ({ ...SUB, metadata: { supabase_user_id: "not-a-uuid" } }) };
  assert.equal(await handleStripeEvent(subEvent("evt_e"), noMeta), "unmatched");
});

test("a subscription for a deleted account is recorded, not retried forever", async () => {
  const f = fakeDeps({ applyError: { code: "23503" } });
  assert.equal(await handleStripeEvent(subEvent("evt_f"), f.deps), "user_missing");
  assert.deepEqual(f.recorded, [{ eventId: "evt_f", outcome: "user_missing" }]);
});

test("any other failure throws (so the function returns 500 and Stripe retries) and records nothing", async () => {
  const f = fakeDeps({ applyError: { code: "XX000" } });
  await assert.rejects(handleStripeEvent(subEvent("evt_g"), f.deps));
  assert.equal(f.ledger.size, 0);
});
