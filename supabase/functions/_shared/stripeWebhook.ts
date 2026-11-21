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
  log?(message: string, detail?: Record<string, unknown>): void;
}

export type WebhookOutcome =
  | "ignored"
  | "duplicate"
  | "applied"
  | "stale"
  | "no_subscription"
  | "unmatched"
  | "user_missing";

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
