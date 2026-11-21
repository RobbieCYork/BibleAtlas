// Cancelling a person's Stripe subscriptions as part of deleting their account.
//
// Used by supabase/functions/delete-account. Dependency-free like stripe.ts, so it runs in Deno and
// under `node --test` (stripeCancel.test.ts). Nothing here reads an environment variable or the
// database directly: the caller passes the account's billing rows and the Stripe key in.
//
// ── THE ONE RULE ────────────────────────────────────────────────────────────────────────────────
// Nobody may be deleted while a card is still being charged for them. Deleting the account removes
// stripe_customers / subscriptions by cascade, after which nothing in this app knows which Stripe
// customer was theirs — Stripe would keep billing a person who no longer has an account to cancel
// from. So:
//
//   * nothing to cancel        → ok, deletion proceeds (no tables, no customer, no live subscription)
//   * something to cancel      → it is cancelled IMMEDIATELY (DELETE /v1/subscriptions/:id, Stripe's
//                                defaults: no proration refund, no final invoice), then ok
//   * cannot be sure it stopped → NOT ok, and the caller must refuse to delete anything
//
// ── WHAT IS DELIBERATELY NOT CONSULTED ──────────────────────────────────────────────────────────
// paid.billing_enabled. The switch says whether the app SELLS Plus, not whether anyone is paying:
// it can be turned back off after launch with subscribers still on it (the same reason the customer
// portal is not gated on it). While billing has never been on there are no rows, so this is a no-op
// anyway — without the switch being the reason.
//
// ── WHY STRIPE, NOT OUR TABLE, DECIDES WHAT IS LIVE ─────────────────────────────────────────────
// `subscriptions` is only as fresh as the last webhook that arrived. A missed or failed webhook
// would leave a paying subscription absent from it. create-checkout-session writes the
// stripe_customers row itself the moment it creates a customer, so the customer id is reliable;
// the customer's subscriptions are then listed from Stripe (status=all), which is authoritative.
//
// ── TEST MODE VS LIVE MODE ──────────────────────────────────────────────────────────────────────
// A customer is test-mode or live-mode, and only a key of the same mode can see it.
//   * live customer, no live key       → NOT ok. A real card may be charged and we cannot stop it.
//   * test customer, no test key       → skipped. Test mode charges no real card; refusing to delete
//                                        an account over a sandbox object would block for nothing.
// "No key configured" is therefore a no-op for everyone who never bought anything in live mode,
// which before launch is everyone.

import { StripeApiError, keyIsLive, type StripeClient } from "./stripe.ts";

/** Statuses after which Stripe will never charge again. Everything else gets cancelled. */
export const TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);

export interface BillingRecords {
  /** stripe_customers rows for the account (normally 0 or 1). */
  customers: Array<{ customer_id: string; livemode: boolean }>;
  /** subscriptions rows for the account — used only for the customer ids they carry. */
  subscriptions: Array<{ id: string; customer_id: string; status: string; livemode: boolean }>;
}

export interface CancelDeps {
  /** The account's billing rows. "not_applicable" when sql/045 is not applied (no billing tables).
   *  Must THROW on any other database error: not knowing is not the same as "nothing to cancel". */
  loadRecords(): Promise<BillingRecords | "not_applicable">;
  /** STRIPE_SECRET_KEY as configured, or undefined. Format is checked here. */
  secretKey: string | undefined;
  /** Builds the Stripe client for a key (real: stripeClient; tests: a fake fetch behind it). */
  stripe(key: string): StripeClient;
  log?(message: string, detail?: Record<string, unknown>): void;
}

export type CancelResult =
  | {
      ok: true;
      outcome: "no_billing_tables" | "no_customer" | "nothing_to_cancel" | "canceled";
      /** Subscription ids this call cancelled. */
      canceled: string[];
      /** Test-mode customers left alone because no test key was configured. */
      skippedTestCustomers: string[];
    }
  | {
      ok: false;
      /** Safe to show the person. */
      reason: string;
      /** For the server log only. */
      detail: string;
    };

interface ListedSubscription {
  id: string;
  status: string;
}

const CUSTOMER_ID = /^cus_[A-Za-z0-9]{1,250}$/;
const SUBSCRIPTION_ID = /^sub_[A-Za-z0-9]{1,250}$/;
const VALID_KEY = /^(sk|rk)_(test|live)_/;
const MAX_PAGES = 10; // 1,000 subscriptions on one customer would be a bug elsewhere; stop and fail.

const isMissing = (err: unknown) =>
  err instanceof StripeApiError && (err.status === 404 || err.code === "resource_missing");

const describe = (err: unknown) =>
  err instanceof StripeApiError ? `Stripe ${err.status}${err.code ? ` ${err.code}` : ""}: ${err.message}` : String((err as Error)?.message ?? err);

const STILL_CHARGED =
  "Your Capstone Plus subscription could not be cancelled, so your account has not been deleted (you would have kept being charged). Nothing was deleted. Please try again, or cancel the subscription first from Manage subscription.";

/** Every subscription Stripe has for this customer, any status. null = the customer no longer exists. */
async function listSubscriptions(stripe: StripeClient, customer: string): Promise<ListedSubscription[] | null> {
  const out: ListedSubscription[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    let res: { data?: ListedSubscription[]; has_more?: boolean };
    try {
      res = await stripe.get("/subscriptions", {
        customer,
        status: "all",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
    } catch (err) {
      if (page === 0 && isMissing(err)) return null;
      throw err;
    }
    const data = Array.isArray(res.data) ? res.data : [];
    out.push(...data);
    if (!res.has_more || data.length === 0) return out;
    startingAfter = data[data.length - 1].id;
  }
  throw new Error(`customer ${customer} has more than ${MAX_PAGES * 100} subscriptions`);
}

/** Cancel one subscription now. If the cancel call errors, re-read it: a subscription that is
 * already over (a concurrent cancel, Stripe's own dunning) is the outcome we wanted, not a failure. */
async function cancelNow(stripe: StripeClient, id: string): Promise<void> {
  try {
    const res = await stripe.del<{ status?: string }>(`/subscriptions/${id}`);
    if (res?.status && !TERMINAL_STATUSES.has(res.status)) {
      throw new Error(`subscription ${id} is ${res.status} after cancel`);
    }
  } catch (err) {
    let after: { status?: string } | null = null;
    try {
      after = await stripe.get<{ status?: string }>(`/subscriptions/${id}`);
    } catch (readErr) {
      if (isMissing(readErr)) return; // gone entirely: nothing left to charge
    }
    if (after?.status && TERMINAL_STATUSES.has(after.status)) return;
    throw err;
  }
}

export async function cancelSubscriptionsForDeletion(deps: CancelDeps): Promise<CancelResult> {
  const log = deps.log ?? (() => {});

  let records: BillingRecords | "not_applicable";
  try {
    records = await deps.loadRecords();
  } catch (err) {
    return {
      ok: false,
      reason: "Your billing record could not be checked, so your account has not been deleted. Nothing was deleted. Please try again.",
      detail: `loadRecords: ${describe(err)}`,
    };
  }
  if (records === "not_applicable") {
    return { ok: true, outcome: "no_billing_tables", canceled: [], skippedTestCustomers: [] };
  }

  // Every customer id this account is known by, with its mode. Live wins if the two tables disagree
  // (they cannot, by sql/045's checks, but the safe reading of a contradiction is "real money").
  const customers = new Map<string, boolean>();
  for (const row of [...records.customers, ...records.subscriptions]) {
    if (!row?.customer_id) continue;
    if (!CUSTOMER_ID.test(row.customer_id)) {
      return { ok: false, reason: STILL_CHARGED, detail: `malformed customer id in billing rows` };
    }
    customers.set(row.customer_id, customers.get(row.customer_id) === true || row.livemode === true);
  }
  if (customers.size === 0) return { ok: true, outcome: "no_customer", canceled: [], skippedTestCustomers: [] };

  const key = deps.secretKey && VALID_KEY.test(deps.secretKey) ? deps.secretKey : null;
  const keyLive = key ? keyIsLive(key) : null;

  const canceled: string[] = [];
  const skippedTestCustomers: string[] = [];
  let stripe: StripeClient | null = null;

  for (const [customer, livemode] of customers) {
    if (key === null || keyLive !== livemode) {
      if (livemode) {
        return {
          ok: false,
          reason: STILL_CHARGED,
          detail: `live-mode customer ${customer} but ${key === null ? "no Stripe key is configured" : "the configured key is test-mode"}`,
        };
      }
      log("delete-account: test-mode Stripe customer left in place (no test key configured)", { customer });
      skippedTestCustomers.push(customer);
      continue;
    }

    stripe ??= deps.stripe(key);
    try {
      const subs = await listSubscriptions(stripe, customer);
      if (subs === null) {
        log("delete-account: Stripe customer no longer exists; nothing to cancel", { customer });
        continue;
      }
      for (const sub of subs) {
        if (!sub || TERMINAL_STATUSES.has(sub.status)) continue;
        if (!SUBSCRIPTION_ID.test(sub.id)) throw new Error(`Stripe returned a malformed subscription id`);
        await cancelNow(stripe, sub.id);
        canceled.push(sub.id);
      }
    } catch (err) {
      const already = canceled.length ? ` (already cancelled: ${canceled.join(", ")})` : "";
      return { ok: false, reason: STILL_CHARGED, detail: `customer ${customer}: ${describe(err)}${already}` };
    }
  }

  return {
    ok: true,
    outcome: canceled.length > 0 ? "canceled" : "nothing_to_cancel",
    canceled,
    skippedTestCustomers,
  };
}
