// Capstone Plus for Groups (admin pays): the pure decisions behind the group-billing Edge Function
// and the group branch of stripe-webhook. Dependency-free like stripe.ts, so `node --test` runs the
// same file (groupBilling.test.ts). Nothing here reads an environment variable or calls a network.
//
// THE MODEL (automation/manager/groups-feature-plan.md section 3)
//   One Stripe subscription per class, on the class owner's Stripe customer (stripe_customers, the
//   same one-per-account record sql/045 keeps), quantity = seats, licensed per-seat price.
//   The subscription carries metadata { capstone_kind: "group", class_id, supabase_user_id } that
//   only this server writes; the webhook uses it to send the event to sql/047
//   group_apply_subscription_event() instead of sql/045's individual path.
//   Adding seats: quantity up, prorations on the next invoice (Stripe "create_prorations").
//   A class with an end date: the subscription is set to cancel_at the end of that day (Checkout
//   cannot set cancel_at, so the webhook does it after the first event).

import { normaliseSubscription, UUID_RE, type NormalisedSubscription, type StripeSubscription } from "./stripe.ts";

export const GROUP_MIN_SEATS = 5;
export const GROUP_MAX_SEATS = 200;
export const GROUP_KIND = "group";

/** Subscription fields the group path reads on top of StripeSubscription. */
export interface GroupStripeSubscription extends StripeSubscription {
  cancel_at?: number | null;
  quantity?: number | null;
  items?: {
    data?: Array<{
      id?: string;
      quantity?: number | null;
      current_period_end?: number | null;
      price?: { id?: string; recurring?: { interval?: string } | null } | null;
    }>;
  };
}

/** What sql/047 group_apply_subscription_event() takes as p_sub. */
export interface NormalisedGroupSubscription extends NormalisedSubscription {
  quantity: number;
  cancel_at: number | null;
}

/** The class a subscription pays for, or null when it is an individual Plus subscription. */
export function groupClassIdOf(sub: { metadata?: Record<string, string> | null }): string | null {
  const m = sub.metadata ?? {};
  if (m.capstone_kind !== GROUP_KIND) return null;
  return typeof m.class_id === "string" && UUID_RE.test(m.class_id) ? m.class_id.toLowerCase() : null;
}

export function normaliseGroupSubscription(sub: GroupStripeSubscription): NormalisedGroupSubscription {
  const base = normaliseSubscription(sub);
  const items = sub.items?.data ?? [];
  // One licensed item per group subscription. Sum defensively if someone added a second in the
  // dashboard; the DB caps seats at 200 either way.
  const fromItems = items.reduce((n, i) => n + (typeof i.quantity === "number" && i.quantity > 0 ? i.quantity : 0), 0);
  const quantity = fromItems || (typeof sub.quantity === "number" && sub.quantity > 0 ? sub.quantity : 0);
  return { ...base, quantity: Math.min(Math.floor(quantity), 10000), cancel_at: typeof sub.cancel_at === "number" ? sub.cancel_at : null };
}

/** The server-side price for an interval. The client never sends a price id. */
export function groupPriceFor(interval: unknown, env: (k: string) => string | undefined): { price: string } | { error: string } {
  const key = interval === "month" ? "STRIPE_PRICE_GROUP_MONTHLY" : interval === "year" ? "STRIPE_PRICE_GROUP_ANNUAL" : null;
  if (!key) return { error: "Choose monthly or yearly." };
  const price = env(key);
  if (!price || !/^price_/.test(price)) return { error: "Group pricing is not configured on the server." };
  return { price };
}

/** The seat count for a first checkout: what the class asked for at signup, 5 to 200. */
export function checkoutSeats(seatsRequested: unknown): { seats: number } | { error: string } {
  const n = typeof seatsRequested === "number" ? seatsRequested : NaN;
  if (!Number.isInteger(n)) return { error: "This class has no seat count." };
  if (n < GROUP_MIN_SEATS) return { error: `A group needs at least ${GROUP_MIN_SEATS} seats.` };
  if (n > GROUP_MAX_SEATS) return { error: `More than ${GROUP_MAX_SEATS} seats? Contact us.` };
  return { seats: n };
}

/** Adding seats: a whole number of at least one, total no more than 200. */
export function planSeatIncrease(current: number, add: unknown): { quantity: number } | { error: string } {
  const n = typeof add === "number" ? add : NaN;
  if (!Number.isInteger(n) || n < 1) return { error: "Add at least one seat." };
  const total = current + n;
  if (total > GROUP_MAX_SEATS) return { error: `A class can have up to ${GROUP_MAX_SEATS} seats. Contact us for more.` };
  return { quantity: total };
}

/** Should the webhook set (or move) the subscription's cancel_at to the class's end? */
export function cancelAtUpdateNeeded(
  sub: Pick<NormalisedGroupSubscription, "status" | "cancel_at">,
  wanted: number | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (typeof wanted !== "number" || !Number.isFinite(wanted)) return false;
  if (!["active", "trialing", "past_due"].includes(sub.status)) return false;
  if (wanted <= nowSeconds + 60) return false; // Stripe refuses a cancel_at in the past
  return sub.cancel_at !== wanted;
}

/** The Checkout Session parameters for a group's first purchase. */
export function groupCheckoutParams(a: {
  customerId: string;
  userId: string;
  classId: string;
  className: string;
  price: string;
  seats: number;
  origin: string;
  automaticTax: boolean;
}): Record<string, unknown> {
  const metadata = { supabase_user_id: a.userId, capstone_kind: GROUP_KIND, class_id: a.classId };
  return {
    mode: "subscription",
    customer: a.customerId,
    client_reference_id: a.userId,
    // Fixed quantity: the seat count was chosen (and agreed to) in the app; Checkout must not let
    // it drift. No promotion codes for groups (plan section 3: codes leak and outlive the class).
    line_items: [{ price: a.price, quantity: a.seats }],
    metadata,
    subscription_data: {
      metadata,
      description: `Capstone Plus for Groups: ${a.className}`.slice(0, 500),
    },
    ...(a.automaticTax ? { automatic_tax: { enabled: true }, customer_update: { address: "auto" } } : {}),
    success_url: `${a.origin}/?groups=success`,
    cancel_url: `${a.origin}/?groups=cancel`,
  };
}
