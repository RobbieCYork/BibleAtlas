// The stripe-webhook decision logic, separated from Deno.serve and from the Supabase / Stripe
// clients so it can be unit-tested with fakes (stripeWebhook.test.ts). index.ts wires real deps.
//
// TRUST: the event has already passed signature verification and the livemode check by the time
// it reaches handleStripeEvent. Even so, the subscription's STATE is never taken from the event
// body: it is re-fetched from Stripe, so a late or out-of-order delivery still writes the current
// truth, and sql/045 refuses to let an older event overwrite newer state.

import {
  HANDLED_EVENTS,
  UUID_RE,
  normaliseSubscription,
  subscriptionIdOf,
  type NormalisedSubscription,
  type StripeEvent,
  type StripeSubscription,
} from "./stripe.ts";
import {
  cancelAtUpdateNeeded,
  groupClassIdOf,
  normaliseGroupSubscription,
  type GroupStripeSubscription,
  type NormalisedGroupSubscription,
} from "./groupBilling.ts";

export interface WebhookDeps {
  retrieveSubscription(id: string): Promise<StripeSubscription>;
  /** metadata.supabase_user_id written by create-checkout-session when it made the customer. */
  retrieveCustomerUserId(customerId: string): Promise<string | null>;
  /** stripe_customers lookup (service role). */
  findUserByCustomer(customerId: string): Promise<string | null>;
  /** stripe_events lookup — a cheap early exit; the authoritative check is inside the SQL apply. */
  isProcessed(eventId: string): Promise<boolean>;
  apply(args: {
    eventId: string;
    type: string;
    createdIso: string;
    livemode: boolean;
    userId: string;
    customerId: string;
    sub: NormalisedSubscription;
  }): Promise<string>;
  record(args: { eventId: string; type: string; createdIso: string; livemode: boolean; outcome: string }): Promise<boolean>;
  /**
   * Capstone Plus for Groups (sql/047 group_apply_subscription_event). Optional so the individual
   * tests need not wire it; a GROUP subscription arriving without it throws (500, Stripe retries)
   * rather than being written into the individual `subscriptions` table.
   */
  applyGroup?(args: {
    eventId: string;
    type: string;
    createdIso: string;
    livemode: boolean;
    classId: string;
    payerUserId: string | null;
    customerId: string;
    sub: NormalisedGroupSubscription;
  }): Promise<{ outcome: string; cancel_at_wanted?: number | null }>;
  /** Sets the subscription to cancel at the class's end (Checkout cannot). */
  setCancelAt?(subscriptionId: string, cancelAt: number): Promise<void>;
  log?(message: string, detail?: Record<string, unknown>): void;
}

export type WebhookOutcome =
  | "ignored"
  | "duplicate"
  | "applied"
  | "stale"
  | "no_subscription"
  | "unmatched"
  | "user_missing"
  | "class_missing"
  | "second_subscription";

const HANDLED = new Set<string>(HANDLED_EVENTS);
const FK_VIOLATION = "23503";

const validUser = (v: unknown): string | null => (typeof v === "string" && UUID_RE.test(v) ? v : null);

export async function handleStripeEvent(event: StripeEvent, deps: WebhookDeps): Promise<WebhookOutcome> {
  const log = deps.log ?? (() => {});
  if (!HANDLED.has(event.type)) return "ignored";

  const base = {
    eventId: event.id,
    type: event.type,
    createdIso: new Date(event.created * 1000).toISOString(),
    livemode: event.livemode,
  };

  if (await deps.isProcessed(event.id)) return "duplicate";

  const subId = subscriptionIdOf(event);
  if (!subId) {
    const fresh = await deps.record({ ...base, outcome: "no_subscription" });
    return fresh ? "no_subscription" : "duplicate";
  }

  const raw = await deps.retrieveSubscription(subId);

  // A group (class) subscription goes to sql/047, never into the individual `subscriptions` table —
  // otherwise the teacher would show as a personal subscriber and be refused an individual checkout.
  const classId = groupClassIdOf(raw);
  if (classId) return handleGroupEvent(event, base, classId, raw as GroupStripeSubscription, deps);

  const sub = normaliseSubscription(raw);

  // Who is this? The stripe_customers mapping is authoritative: this server created the customer
  // for a user it had just authenticated. The fallbacks are ids this server also wrote (checkout's
  // client_reference_id, the subscription's and customer's metadata), used only before the
  // mapping row exists — e.g. the very first event, if the mapping insert itself failed.
  let userId = await deps.findUserByCustomer(sub.customer);
  if (!userId) {
    const o = event.data.object;
    userId =
      (event.type === "checkout.session.completed" ? validUser(o.client_reference_id) : null) ??
      validUser(raw.metadata?.supabase_user_id) ??
      validUser(await deps.retrieveCustomerUserId(sub.customer));
  }
  if (!userId) {
    log("stripe-webhook: no Capstone account for customer", { customer: sub.customer, event: event.id });
    const fresh = await deps.record({ ...base, outcome: "unmatched" });
    return fresh ? "unmatched" : "duplicate";
  }

  try {
    const result = await deps.apply({ ...base, userId, customerId: sub.customer, sub });
    if (result === "duplicate" || result === "applied" || result === "stale") return result;
    throw new Error(`unexpected apply result ${result}`);
  } catch (err) {
    // The account was deleted while a subscription still pointed at it. Retrying cannot succeed,
    // so record it (and log loudly: someone may still be being charged — see STRIPE-SETUP.md).
    if ((err as { code?: string } | null)?.code === FK_VIOLATION) {
      log("stripe-webhook: subscription for a deleted account", { subscription: sub.id, customer: sub.customer });
      const fresh = await deps.record({ ...base, outcome: "user_missing" });
      return fresh ? "user_missing" : "duplicate";
    }
    throw err;
  }
}

const GROUP_OUTCOMES = new Set(["duplicate", "applied", "stale", "class_missing", "second_subscription"]);

async function handleGroupEvent(
  event: StripeEvent,
  base: { eventId: string; type: string; createdIso: string; livemode: boolean },
  classId: string,
  raw: GroupStripeSubscription,
  deps: WebhookDeps
): Promise<WebhookOutcome> {
  const log = deps.log ?? (() => {});
  if (!deps.applyGroup) throw new Error("group subscription received but no group handler is wired");
  const sub = normaliseGroupSubscription(raw);

  // The payer is the owner who checked out. Informational in sql/047 (who pays is the customer); a
  // payer whose account is gone is stored as null rather than failing the event.
  const payer =
    (await deps.findUserByCustomer(sub.customer)) ??
    (event.type === "checkout.session.completed" ? validUser(event.data.object.client_reference_id) : null) ??
    validUser(raw.metadata?.supabase_user_id);

  let result: { outcome: string; cancel_at_wanted?: number | null };
  try {
    result = await deps.applyGroup({ ...base, classId, payerUserId: payer, customerId: sub.customer, sub });
  } catch (err) {
    if ((err as { code?: string } | null)?.code !== FK_VIOLATION || payer === null) throw err;
    log("stripe-webhook: group payer account no longer exists; applying without it", { subscription: sub.id });
    result = await deps.applyGroup({ ...base, classId, payerUserId: null, customerId: sub.customer, sub });
  }
  if (!GROUP_OUTCOMES.has(result.outcome)) throw new Error(`unexpected group apply result ${result.outcome}`);

  if (result.outcome === "second_subscription") {
    // Someone is paying twice for one class. Never silently: the owner must cancel one.
    log("stripe-webhook: SECOND live subscription for a class, not applied — cancel one", { classId, subscription: sub.id });
  }
  if (result.outcome === "class_missing") {
    log("stripe-webhook: group subscription for a class that does not exist", { classId, subscription: sub.id });
  }

  if (result.outcome === "applied" && deps.setCancelAt && cancelAtUpdateNeeded(sub, result.cancel_at_wanted)) {
    try {
      await deps.setCancelAt(sub.id, result.cancel_at_wanted as number);
    } catch (err) {
      // Not fatal to the event (already committed). The next subscription.updated retries it.
      log("stripe-webhook: could not set cancel_at for a class end date", {
        subscription: sub.id,
        message: (err as Error)?.message,
      });
    }
  }
  return result.outcome as WebhookOutcome;
}
