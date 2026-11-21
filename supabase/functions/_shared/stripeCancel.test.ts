// Unit tests for cancelling Stripe subscriptions during account deletion. No network, no database:
// the REAL stripeClient runs against a fake fetch, so the HTTP method, path and query sent to
// Stripe are checked too, not just the decision logic.
//
//   node --test supabase/functions/_shared/stripeCancel.test.ts      (Node 24 strips the types)

import { test } from "node:test";
import assert from "node:assert/strict";
import { stripeClient } from "./stripe.ts";
import { cancelSubscriptionsForDeletion, type BillingRecords, type CancelDeps } from "./stripeCancel.ts";

const TEST_KEY = "sk_test_fake_for_unit_tests_only";
const LIVE_KEY = "sk_live_fake_for_unit_tests_only";

interface Call {
  method: string;
  url: string;
}

type Route = (method: string, url: URL) => { status: number; body: unknown } | undefined;

/** A fake Stripe. `route` answers each request; anything it does not answer is a test failure. */
function fakeStripe(route: Route) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string, init?: { method?: string }) => {
    const method = init?.method ?? "GET";
    calls.push({ method, url: input });
    const r = route(method, new URL(input));
    if (!r) throw new Error(`unexpected Stripe call ${method} ${input}`);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
  return { calls, make: (key: string) => stripeClient(key, fetchImpl) };
}

function deps(records: BillingRecords | "not_applicable" | Error, secretKey: string | undefined, route: Route = () => undefined) {
  const s = fakeStripe(route);
  const d: CancelDeps = {
    loadRecords: async () => {
      if (records instanceof Error) throw records;
      return records;
    },
    secretKey,
    stripe: s.make,
  };
  return { d, calls: s.calls };
}

const testCustomer = (id = "cus_T1"): BillingRecords => ({ customers: [{ customer_id: id, livemode: false }], subscriptions: [] });
const liveCustomer = (id = "cus_L1"): BillingRecords => ({ customers: [{ customer_id: id, livemode: true }], subscriptions: [] });

const listOf = (subs: Array<{ id: string; status: string }>, has_more = false) => ({
  status: 200,
  body: { object: "list", data: subs, has_more },
});

// ---------------------------------------------------------------- nothing to cancel: never blocks

test("billing tables not applied (sql/045 absent): ok, no Stripe call", async () => {
  const { d, calls } = deps("not_applicable", undefined);
  const r = await cancelSubscriptionsForDeletion(d);
  assert.deepEqual(r, { ok: true, outcome: "no_billing_tables", canceled: [], skippedTestCustomers: [] });
  assert.equal(calls.length, 0);
});

test("no Stripe customer: ok with no key configured, and no Stripe call even with one", async () => {
  for (const key of [undefined, "", TEST_KEY, LIVE_KEY]) {
    const { d, calls } = deps({ customers: [], subscriptions: [] }, key);
    const r = await cancelSubscriptionsForDeletion(d);
    assert.equal(r.ok, true, String(key));
    assert.equal(r.ok && r.outcome, "no_customer");
    assert.equal(calls.length, 0);
  }
});

test("test-mode customer with no Stripe key configured: skipped, ok (test mode charges no card)", async () => {
  const { d, calls } = deps(testCustomer(), undefined);
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(r.ok, true);
  assert.deepEqual(r.ok && r.skippedTestCustomers, ["cus_T1"]);
  assert.equal(calls.length, 0);
});

test("customer whose subscriptions are all already over: ok, nothing cancelled", async () => {
  const { d, calls } = deps(testCustomer(), TEST_KEY, (m, u) =>
    m === "GET" && u.pathname === "/v1/subscriptions"
      ? listOf([
          { id: "sub_old1", status: "canceled" },
          { id: "sub_old2", status: "incomplete_expired" },
        ])
      : undefined
  );
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(r.ok && r.outcome, "nothing_to_cancel");
  assert.deepEqual(calls.map((c) => c.method), ["GET"]);
});

test("customer already deleted in Stripe (404): ok, nothing to cancel", async () => {
  const { d } = deps(testCustomer(), TEST_KEY, (m, u) =>
    m === "GET" && u.pathname === "/v1/subscriptions"
      ? { status: 404, body: { error: { code: "resource_missing", message: "No such customer: 'cus_T1'" } } }
      : undefined
  );
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(r.ok && r.outcome, "nothing_to_cancel");
});

// ---------------------------------------------------------------- an active subscription is cancelled at once

test("active subscription: listed from Stripe (status=all) and cancelled immediately with DELETE", async () => {
  const { d, calls } = deps(testCustomer(), TEST_KEY, (m, u) => {
    if (m === "GET" && u.pathname === "/v1/subscriptions") return listOf([{ id: "sub_A1", status: "active" }]);
    if (m === "DELETE" && u.pathname === "/v1/subscriptions/sub_A1") return { status: 200, body: { id: "sub_A1", status: "canceled" } };
  });
  const r = await cancelSubscriptionsForDeletion(d);
  assert.deepEqual(r, { ok: true, outcome: "canceled", canceled: ["sub_A1"], skippedTestCustomers: [] });

  const list = new URL(calls[0].url);
  assert.equal(list.searchParams.get("customer"), "cus_T1");
  assert.equal(list.searchParams.get("status"), "all");
  // Cancel NOW: a DELETE with no body (Stripe defaults — no proration refund, no final invoice),
  // never a POST setting cancel_at_period_end, which would keep billing until the period ends.
  assert.deepEqual(calls[1], { method: "DELETE", url: "https://api.stripe.com/v1/subscriptions/sub_A1" });
});

test("every non-terminal status is cancelled; Stripe, not our table, decides what exists", async () => {
  // Our table knows nothing about sub_missed (a webhook never arrived); Stripe does, so it is cancelled.
  const records: BillingRecords = {
    customers: [{ customer_id: "cus_T1", livemode: false }],
    subscriptions: [{ id: "sub_known", customer_id: "cus_T1", status: "canceled", livemode: false }],
  };
  const deleted: string[] = [];
  const { d } = deps(records, TEST_KEY, (m, u) => {
    if (m === "GET" && u.pathname === "/v1/subscriptions")
      return listOf([
        { id: "sub_trial", status: "trialing" },
        { id: "sub_due", status: "past_due" },
        { id: "sub_unpaid", status: "unpaid" },
        { id: "sub_paused", status: "paused" },
        { id: "sub_missed", status: "active" },
        { id: "sub_known", status: "canceled" },
      ]);
    if (m === "DELETE") {
      const id = u.pathname.split("/").pop()!;
      deleted.push(id);
      return { status: 200, body: { id, status: "canceled" } };
    }
  });
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(r.ok, true);
  assert.deepEqual(deleted, ["sub_trial", "sub_due", "sub_unpaid", "sub_paused", "sub_missed"]);
});

test("follows Stripe pagination", async () => {
  const deleted: string[] = [];
  const { d } = deps(testCustomer(), TEST_KEY, (m, u) => {
    if (m === "GET" && u.pathname === "/v1/subscriptions") {
      return u.searchParams.get("starting_after") === "sub_p1"
        ? listOf([{ id: "sub_p2", status: "active" }])
        : listOf([{ id: "sub_p1", status: "active" }], true);
    }
    if (m === "DELETE") {
      deleted.push(u.pathname.split("/").pop()!);
      return { status: 200, body: { status: "canceled" } };
    }
  });
  assert.equal((await cancelSubscriptionsForDeletion(d)).ok, true);
  assert.deepEqual(deleted, ["sub_p1", "sub_p2"]);
});

test("a customer known only from the subscriptions table is still checked", async () => {
  const records: BillingRecords = {
    customers: [],
    subscriptions: [{ id: "sub_X", customer_id: "cus_T9", status: "active", livemode: false }],
  };
  const { d, calls } = deps(records, TEST_KEY, (m, u) => {
    if (m === "GET") return listOf([{ id: "sub_X", status: "active" }]);
    if (m === "DELETE" && u.pathname === "/v1/subscriptions/sub_X") return { status: 200, body: { status: "canceled" } };
  });
  const r = await cancelSubscriptionsForDeletion(d);
  assert.deepEqual(r.ok && r.canceled, ["sub_X"]);
  assert.equal(new URL(calls[0].url).searchParams.get("customer"), "cus_T9");
});

test("a cancel that errors because the subscription was already cancelled elsewhere is a success", async () => {
  const { d } = deps(testCustomer(), TEST_KEY, (m, u) => {
    if (m === "GET" && u.pathname === "/v1/subscriptions") return listOf([{ id: "sub_R", status: "active" }]);
    if (m === "DELETE") return { status: 400, body: { error: { message: "already canceled" } } };
    if (m === "GET" && u.pathname === "/v1/subscriptions/sub_R") return { status: 200, body: { id: "sub_R", status: "canceled" } };
  });
  const r = await cancelSubscriptionsForDeletion(d);
  assert.deepEqual(r.ok && r.canceled, ["sub_R"]);
});

// ---------------------------------------------------------------- failures block the deletion

test("Stripe cancel fails: NOT ok — deletion must not proceed", async () => {
  const { d } = deps(testCustomer(), TEST_KEY, (m, u) => {
    if (m === "GET" && u.pathname === "/v1/subscriptions") return listOf([{ id: "sub_F", status: "active" }]);
    if (m === "DELETE") return { status: 500, body: { error: { message: "Stripe is having a bad day" } } };
    if (m === "GET" && u.pathname === "/v1/subscriptions/sub_F") return { status: 200, body: { id: "sub_F", status: "active" } };
  });
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.reason : "", /could not be cancelled.*not been deleted/);
  assert.match(!r.ok ? r.detail : "", /Stripe 500/);
});

test("Stripe cancel fails and the re-read fails too: NOT ok", async () => {
  const { d } = deps(testCustomer(), TEST_KEY, (m, u) => {
    if (m === "GET" && u.pathname === "/v1/subscriptions") return listOf([{ id: "sub_F", status: "active" }]);
    if (m === "DELETE") return { status: 502, body: {} };
    if (m === "GET") return { status: 503, body: {} };
  });
  assert.equal((await cancelSubscriptionsForDeletion(d)).ok, false);
});

test("Stripe list fails (not a 404): NOT ok", async () => {
  const { d } = deps(testCustomer(), TEST_KEY, () => ({ status: 401, body: { error: { message: "Invalid API Key" } } }));
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(r.ok, false);
});

test("a network failure talking to Stripe: NOT ok", async () => {
  const { d } = deps(testCustomer(), TEST_KEY, () => {
    throw new TypeError("fetch failed");
  });
  assert.equal((await cancelSubscriptionsForDeletion(d)).ok, false);
});

test("second subscription fails after the first was cancelled: NOT ok, and the log detail says what was cancelled", async () => {
  const { d } = deps(testCustomer(), TEST_KEY, (m, u) => {
    if (m === "GET" && u.pathname === "/v1/subscriptions")
      return listOf([
        { id: "sub_ok", status: "active" },
        { id: "sub_bad", status: "active" },
      ]);
    if (m === "DELETE" && u.pathname.endsWith("sub_ok")) return { status: 200, body: { status: "canceled" } };
    if (m === "DELETE") return { status: 500, body: {} };
    if (m === "GET") return { status: 200, body: { status: "active" } };
  });
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.detail : "", /already cancelled: sub_ok/);
});

test("live-mode customer with no key, or with only a test key: NOT ok (a real card may be charged)", async () => {
  for (const key of [undefined, "", "not-a-key", TEST_KEY]) {
    const { d, calls } = deps(liveCustomer(), key);
    const r = await cancelSubscriptionsForDeletion(d);
    assert.equal(r.ok, false, String(key));
    assert.equal(calls.length, 0);
  }
});

test("live-mode customer with a live key is cancelled (cancelling needs no STRIPE_ALLOW_LIVE)", async () => {
  const { d } = deps(liveCustomer(), LIVE_KEY, (m, u) => {
    if (m === "GET") return listOf([{ id: "sub_live", status: "active" }]);
    if (m === "DELETE" && u.pathname.endsWith("sub_live")) return { status: 200, body: { status: "canceled" } };
  });
  const r = await cancelSubscriptionsForDeletion(d);
  assert.deepEqual(r.ok && r.canceled, ["sub_live"]);
});

test("test-mode customer while a live key is configured: skipped, ok", async () => {
  const { d, calls } = deps(testCustomer(), LIVE_KEY);
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(r.ok, true);
  assert.equal(calls.length, 0);
});

test("the billing rows cannot be read: NOT ok (unknown is not 'nothing to cancel')", async () => {
  const { d } = deps(new Error("connection reset"), TEST_KEY);
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.reason : "", /could not be checked/);
});

test("a malformed customer id in the rows is never sent to Stripe", async () => {
  const { d, calls } = deps({ customers: [{ customer_id: "cus_x/../../v1/charges", livemode: false }], subscriptions: [] }, TEST_KEY);
  assert.equal((await cancelSubscriptionsForDeletion(d)).ok, false);
  assert.equal(calls.length, 0);
});

test("the secret key never appears in a result", async () => {
  const { d } = deps(testCustomer(), TEST_KEY, () => ({ status: 500, body: {} }));
  const r = await cancelSubscriptionsForDeletion(d);
  assert.equal(JSON.stringify(r).includes(TEST_KEY), false);
});
