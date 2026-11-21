/**
 * billing.ts — Capstone Plus web payments (Stripe), the client half.
 *
 * WHAT DECIDES WHETHER ANY BILLING UI IS DRAWN
 * ----------------------------------------------------------------------------
 * `billing_status()` (sql/045) answers, for the signed-in account only:
 *     billing_enabled   app_settings 'paid.billing_enabled' (ships FALSE)
 *     has_plus          has_entitlement('plus') — true for everyone while
 *                       'paid.everyone_has_plus' is on (sql/043)
 *     has_customer      a Stripe customer exists for this account
 *     subscription      latest subscription state, or null
 *
 * The UI shows Upgrade / Manage only when billing_enabled is true. FAIL CLOSED: if the call errors —
 * including today, when sql/045 is not applied and the function does not exist — the answer is
 * "billing off" and nothing is drawn. So merging this changes nothing anyone can see.
 *
 * Guests (anonymous accounts) are told to create an account instead of being offered a purchase.
 * Never drawn inside a native store build (Capacitor).
 * Apple 3.1.1 requires in-app purchase for digital content in the iOS app; the store build gets its
 * own purchase flow, not a link to Stripe (paid-tier-plan.md section 4).
 *
 * Nothing here grants access. Paying only changes `has_entitlement` once the stripe-webhook Edge
 * Function has recorded Stripe's event; after a successful checkout the app re-asks for a short while.
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { refreshEntitlement } from "./paidContent";

export interface BillingSubscription {
  status: string;
  interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface BillingStatus {
  /** Loaded at least once (successfully or not). */
  loaded: boolean;
  billingEnabled: boolean;
  hasPlus: boolean;
  hasCustomer: boolean;
  subscription: BillingSubscription | null;
  /** Anonymous "Continue as Guest" account: may see that Plus exists, may not buy it. */
  isGuest: boolean;
}

const OFF: BillingStatus = { loaded: true, billingEnabled: false, hasPlus: false, hasCustomer: false, subscription: null, isGuest: false };
const INITIAL: BillingStatus = { ...OFF, loaded: false };

/** A subscription that is still paying (or being retried). Drives Upgrade vs Manage. */
export const isLiveSubscription = (s: BillingSubscription | null) =>
  !!s && (s.status === "active" || s.status === "trialing" || s.status === "past_due");

export function isNativeApp(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------------- store
let state: BillingStatus = INITIAL;
let inflight: Promise<void> | null = null;
let forUser: string | null | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function parse(data: unknown, isGuest: boolean): BillingStatus {
  if (!data || typeof data !== "object") return OFF;
  const d = data as Record<string, unknown>;
  const sub = d.subscription && typeof d.subscription === "object" ? (d.subscription as Record<string, unknown>) : null;
  return {
    loaded: true,
    billingEnabled: d.billing_enabled === true,
    hasPlus: d.has_plus === true,
    hasCustomer: d.has_customer === true,
    isGuest,
    subscription: sub
      ? {
          status: String(sub.status ?? ""),
          interval: typeof sub.interval === "string" ? sub.interval : null,
          current_period_end: typeof sub.current_period_end === "string" ? sub.current_period_end : null,
          cancel_at_period_end: sub.cancel_at_period_end === true,
        }
      : null,
  };
}

/** Re-ask the server. Safe to call often; concurrent calls share one request. */
export function refreshBilling(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user ?? null;
      forUser = user?.id ?? null;
      if (!user || isNativeApp()) {
        state = OFF;
        return;
      }
      const { data, error } = await supabase.rpc("billing_status");
      state = error ? OFF : parse(data, user.is_anonymous === true);
    } catch {
      state = OFF;
    } finally {
      inflight = null;
      notify();
    }
  })();
  return inflight;
}

supabase.auth.onAuthStateChange((_event, session) => {
  const uid = session?.user.id ?? null;
  if (forUser !== undefined && uid !== forUser) {
    state = INITIAL;
    notify();
    void refreshBilling();
  }
});

export function useBilling(): BillingStatus {
  const snap = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (!state.loaded && !inflight) void refreshBilling();
  }, []);
  return snap;
}

/** True when any billing UI may be drawn at all. */
export const billingVisible = (b: BillingStatus) => b.loaded && b.billingEnabled && !isNativeApp();
/** True when this account may start a purchase. */
export const canPurchase = (b: BillingStatus) => billingVisible(b) && !b.isGuest;

// ------------------------------------------------------------------------------- actions
async function invokeForUrl(fn: string, body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(fn, { body });
  if (error) {
    // supabase-js puts the function's JSON error body on error.context (a Response).
    let message = "Something went wrong. Please try again.";
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j && typeof j.error === "string") message = j.error;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  if (!data?.url) throw new Error(data?.error ?? "Something went wrong. Please try again.");
  return data.url;
}

/** Goes to Stripe Checkout for the chosen plan. Resolves only on failure (the page navigates away). */
export async function startCheckout(plan: "monthly" | "annual"): Promise<void> {
  const url = await invokeForUrl("create-checkout-session", { plan, return_to: window.location.origin });
  window.location.assign(url);
}

/** Goes to the Stripe customer portal (cancel, change plan, card, invoices). */
export async function openBillingPortal(): Promise<void> {
  const url = await invokeForUrl("create-portal-session", { return_to: window.location.origin });
  window.location.assign(url);
}

// ------------------------------------------------------------------------------- return from Stripe
export type CheckoutReturn = "success" | "cancel" | "portal" | null;

/**
 * Reads and strips `?plus=success|cancel|portal` (set by the Edge Functions' return URLs). After a
 * success, re-asks billing_status and the entitlement every 2s for up to ~20s, because the webhook
 * usually lands a moment after the browser does.
 */
export function consumeCheckoutReturn(): CheckoutReturn {
  let value: CheckoutReturn = null;
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("plus");
    if (v === "success" || v === "cancel" || v === "portal") value = v;
    if (v !== null) {
      url.searchParams.delete("plus");
      window.history.replaceState(window.history.state, "", url.pathname + (url.search ? url.search : "") + url.hash);
    }
  } catch {
    return null;
  }
  if (value === "success" || value === "portal") {
    let tries = 0;
    const tick = async () => {
      tries++;
      refreshEntitlement();
      await refreshBilling();
      const done = value === "portal" || isLiveSubscription(state.subscription);
      if (!done && tries < 10) setTimeout(() => void tick(), 2000);
    };
    void tick();
  }
  return value;
}
