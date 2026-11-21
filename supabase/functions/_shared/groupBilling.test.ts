// Unit tests for Capstone Plus for Groups billing logic and the webhook's group branch.
// No network, no database.
//
//   node --test supabase/functions/_shared/groupBilling.test.ts
//
// The SQL half (class_billing, seats, entitlements, idempotency) is proven by
// sql/tests/047_groups_classes_test.sql (node scripts/groups/rls-test.mjs --local).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cancelAtUpdateNeeded,
  checkoutSeats,
  groupCheckoutParams,
  groupClassIdOf,
  groupPriceFor,
  normaliseGroupSubscription,
  planSeatIncrease,
} from "./groupBilling.ts";
import { formEncode, type StripeEvent } from "./stripe.ts";
import { handleStripeEvent, type WebhookDeps } from "./stripeWebhook.ts";

const CLASS = "0a0a0a0a-0000-4000-8000-0000000000c1";
const USER = "0a0a0a0a-0000-4000-8000-0000000000a1";

test("groupClassIdOf: only our own group metadata routes a subscription to the class path", () => {
  assert.equal(groupClassIdOf({ metadata: { capstone_kind: "group", class_id: CLASS } }), CLASS);
  assert.equal(groupClassIdOf({ metadata: { capstone_kind: "group", class_id: CLASS.toUpperCase() } }), CLASS);
  assert.equal(groupClassIdOf({ metadata: { class_id: CLASS } }), null, "no kind -> individual Plus");
  assert.equal(groupClassIdOf({ metadata: { capstone_kind: "group", class_id: "not-a-uuid" } }), null);
  assert.equal(groupClassIdOf({ metadata: { capstone_kind: "individual", class_id: CLASS } }), null);
  assert.equal(groupClassIdOf({}), null);
});

test("normaliseGroupSubscription carries quantity and cancel_at", () => {
  const n = normaliseGroupSubscription({
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at: 1900000000,
    items: { data: [{ id: "si_1", quantity: 12, current_period_end: 1800000000, price: { id: "price_g", recurring: { interval: "month" } } }] },
  });
  assert.equal(n.quantity, 12);
  assert.equal(n.cancel_at, 1900000000);
  assert.equal(n.price_id, "price_g");
  assert.equal(n.current_period_end, 1800000000);
});

test("prices come from the server env only, by interval", () => {
  const env = (k: string) => ({ STRIPE_PRICE_GROUP_MONTHLY: "price_m", STRIPE_PRICE_GROUP_ANNUAL: "price_y" })[k];
  assert.deepEqual(groupPriceFor("month", env), { price: "price_m" });
  assert.deepEqual(groupPriceFor("year", env), { price: "price_y" });
  assert.ok("error" in groupPriceFor("price_m", env), "a price id as the interval is refused");
  assert.ok("error" in groupPriceFor("month", () => undefined), "unconfigured is an error, not a fallback");
  assert.ok("error" in groupPriceFor("month", () => "sk_test_oops"), "only price_ ids");
});

test("checkout seats: 5 to 200 whole seats", () => {
  assert.deepEqual(checkoutSeats(5), { seats: 5 });
  assert.deepEqual(checkoutSeats(200), { seats: 200 });
  assert.ok("error" in checkoutSeats(4));
  assert.ok("error" in checkoutSeats(201));
  assert.ok("error" in checkoutSeats(5.5));
  assert.ok("error" in checkoutSeats("5"));
});

test("adding seats: at least one, total capped at 200", () => {
  assert.deepEqual(planSeatIncrease(10, 5), { quantity: 15 });
  assert.ok("error" in planSeatIncrease(10, 0));
  assert.ok("error" in planSeatIncrease(10, -3), "no decreases through add_seats");
  assert.ok("error" in planSeatIncrease(195, 6));
  assert.deepEqual(planSeatIncrease(195, 5), { quantity: 200 });
  assert.ok("error" in planSeatIncrease(10, "5"));
});

test("cancel_at is set only for a live subscription, a future end, and only when it differs", () => {
  const now = 1_800_000_000;
  assert.equal(cancelAtUpdateNeeded({ status: "active", cancel_at: null }, now + 86400, now), true);
  assert.equal(cancelAtUpdateNeeded({ status: "active", cancel_at: now + 86400 }, now + 86400, now), false, "already set");
  assert.equal(cancelAtUpdateNeeded({ status: "active", cancel_at: null }, null, now), false, "ongoing class");
  assert.equal(cancelAtUpdateNeeded({ status: "active", cancel_at: null }, now - 10, now), false, "end already passed");
  assert.equal(cancelAtUpdateNeeded({ status: "canceled", cancel_at: null }, now + 86400, now), false);
});

test("checkout params: fixed quantity, our metadata on session and subscription, no promotion codes", () => {
  const p = groupCheckoutParams({
    customerId: "cus_1",
    userId: USER,
    classId: CLASS,
    className: "Bible 101",
    price: "price_m",
    seats: 12,
    origin: "https://capstonebible.com",
    automaticTax: false,
  });
  assert.deepEqual(p.line_items, [{ price: "price_m", quantity: 12 }]);
  assert.deepEqual((p.subscription_data as { metadata: unknown }).metadata, { supabase_user_id: USER, capstone_kind: "group", class_id: CLASS });
  assert.equal("allow_promotion_codes" in p, false);
  const form = formEncode(p);
  assert.ok(!/adjustable_quantity/.test(form), "the buyer cannot change the seat count on Stripe's page");
  assert.ok(form.includes("subscription_data%5Bmetadata%5D%5Bcapstone_kind%5D=group"));
});

// ---------------------------------------------------------------- the webhook's group branch

function groupDeps(over: Partial<WebhookDeps> = {}): WebhookDeps & { calls: Record<string, unknown[]> } {
  const calls: Record<string, unknown[]> = { apply: [], applyGroup: [], setCancelAt: [], record: [] };
  return {
    calls,
    retrieveSubscription: async (id) => ({
      id,
      customer: "cus_1",
      status: "active",
      metadata: { capstone_kind: "group", class_id: CLASS, supabase_user_id: USER },
      items: { data: [{ id: "si_1", quantity: 7, current_period_end: 4_000_000_000, price: { id: "price_g", recurring: { interval: "month" } } }] },
    }) as never,
    retrieveCustomerUserId: async () => USER,
    findUserByCustomer: async () => USER,
    isProcessed: async () => false,
    apply: async (a) => {
      calls.apply.push(a);
      return "applied";
    },
    record: async (a) => {
      calls.record.push(a);
      return true;
    },
    applyGroup: async (a) => {
      calls.applyGroup.push(a);
      return { outcome: "applied", cancel_at_wanted: 4_100_000_000 };
    },
    setCancelAt: async (id, at) => {
      calls.setCancelAt.push([id, at]);
    },
    ...over,
  };
}

const ev = (type: string, object: Record<string, unknown>): StripeEvent => ({ id: "evt_g", type, created: 1_800_000_000, livemode: false, data: { object } });

test("a group subscription goes to applyGroup, never to the individual apply", async () => {
  const d = groupDeps();
  const out = await handleStripeEvent(ev("customer.subscription.created", { id: "sub_g" }), d);
  assert.equal(out, "applied");
  assert.equal(d.calls.apply.length, 0, "individual subscriptions table untouched");
  assert.equal(d.calls.applyGroup.length, 1);
  const a = d.calls.applyGroup[0] as { classId: string; payerUserId: string; sub: { quantity: number } };
  assert.equal(a.classId, CLASS);
  assert.equal(a.payerUserId, USER);
  assert.equal(a.sub.quantity, 7);
  assert.deepEqual(d.calls.setCancelAt, [["sub_g", 4_100_000_000]], "class end date becomes cancel_at");
});

test("an individual subscription still goes to the individual apply", async () => {
  const d = groupDeps({
    retrieveSubscription: async (id) => ({ id, customer: "cus_1", status: "active", items: { data: [{ current_period_end: 4_000_000_000 }] } }),
  });
  await handleStripeEvent(ev("customer.subscription.updated", { id: "sub_i" }), d);
  assert.equal(d.calls.apply.length, 1);
  assert.equal(d.calls.applyGroup.length, 0);
});

test("a group subscription with no group handler wired fails loudly (Stripe retries)", async () => {
  const d = groupDeps({ applyGroup: undefined });
  await assert.rejects(handleStripeEvent(ev("customer.subscription.created", { id: "sub_g" }), d));
  assert.equal(d.calls.apply.length, 0);
});

test("cancel_at failure does not fail the (already committed) event", async () => {
  const d = groupDeps({
    setCancelAt: async () => {
      throw new Error("stripe down");
    },
  });
  assert.equal(await handleStripeEvent(ev("customer.subscription.created", { id: "sub_g" }), d), "applied");
});

test("no cancel_at call for duplicate / second_subscription outcomes", async () => {
  for (const outcome of ["duplicate", "second_subscription", "stale", "class_missing"]) {
    const d = groupDeps({ applyGroup: async () => ({ outcome, cancel_at_wanted: 4_100_000_000 }) });
    assert.equal(await handleStripeEvent(ev("customer.subscription.updated", { id: "sub_g" }), d), outcome);
    assert.equal(d.calls.setCancelAt.length, 0, outcome);
  }
});

test("a payer whose account was deleted is applied as null instead of failing forever", async () => {
  const seen: Array<string | null> = [];
  const d = groupDeps({
    applyGroup: async (a) => {
      seen.push(a.payerUserId);
      if (a.payerUserId) throw Object.assign(new Error("fk"), { code: "23503" });
      return { outcome: "applied", cancel_at_wanted: null };
    },
  });
  assert.equal(await handleStripeEvent(ev("customer.subscription.deleted", { id: "sub_g" }), d), "applied");
  assert.deepEqual(seen, [USER, null]);
});

test("an unexpected group outcome is an error", async () => {
  const d = groupDeps({ applyGroup: async () => ({ outcome: "weird" }) });
  await assert.rejects(handleStripeEvent(ev("customer.subscription.updated", { id: "sub_g" }), d));
});
