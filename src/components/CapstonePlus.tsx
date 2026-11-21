import { useEffect, useState } from "react";
import "./PaidTeaser.css";
import "./CapstonePlus.css";
import {
  billingVisible,
  consumeCheckoutReturn,
  isLiveSubscription,
  openBillingPortal,
  startCheckout,
  useBilling,
  type CheckoutReturn,
} from "../lib/billing";

/**
 * Capstone Plus purchase and management UI (Stripe, web only). Every component here renders NOTHING
 * unless billing_status() says paid.billing_enabled is on (src/lib/billing.ts, sql/045). That switch
 * ships off, so merging this changes nothing anyone sees.
 *
 * Prices are not printed here on purpose: they live in Stripe, and Checkout shows the exact amount,
 * tax and renewal terms before anyone pays. Printing them here too would be a second copy to drift.
 */

/** Monthly / Annual buttons. Shown in the paid teaser and the account menu's Capstone Plus view. */
export function PlusPlanPicker({ compact = false }: { compact?: boolean }) {
  const billing = useBilling();
  const [busy, setBusy] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!billingVisible(billing)) return null;
  if (billing.isGuest) {
    return <p className="plus-note">Create a free account first, then you can subscribe to Capstone Plus.</p>;
  }

  const go = async (plan: "monthly" | "annual") => {
    setBusy(plan);
    setError(null);
    try {
      await startCheckout(plan);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <div className={compact ? "plus-plans plus-plans--compact" : "plus-plans"}>
      <div className="plus-plans-row">
        <button type="button" className="paid-teaser-button" disabled={busy !== null} onClick={() => void go("monthly")}>
          {busy === "monthly" ? "Opening…" : "Monthly"}
        </button>
        <button type="button" className="paid-teaser-button" disabled={busy !== null} onClick={() => void go("annual")}>
          {busy === "annual" ? "Opening…" : "Yearly"}
        </button>
      </div>
      <p className="plus-note">You'll see the price and confirm on Stripe's secure checkout page. Cancel any time.</p>
      {error && (
        <p className="plus-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** The account menu's "Capstone Plus" view body: status plus Upgrade or Manage. */
export function PlusAccountSection() {
  const billing = useBilling();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!billingVisible(billing)) return null;

  const sub = billing.subscription;
  const live = isLiveSubscription(sub);
  const end = formatDate(sub?.current_period_end ?? null);

  const manage = async () => {
    setBusy(true);
    setError(null);
    try {
      await openBillingPortal();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  let status: string;
  if (live && sub?.status === "past_due") status = "Your last payment didn't go through. Update your card to keep Capstone Plus.";
  else if (live && sub?.cancel_at_period_end) status = end ? `Capstone Plus ends on ${end}.` : "Capstone Plus is set to end.";
  else if (live) status = end ? `You have Capstone Plus. Renews on ${end}.` : "You have Capstone Plus.";
  else if (billing.hasPlus) status = "You have full access to Capstone Plus.";
  else status = "Unlock every article's full text, archaeology, sources and reflections.";

  return (
    <div className="plus-account">
      <h4 className="plus-account-title">Capstone Plus</h4>
      <p className="plus-account-status">{status}</p>
      {!live && <PlusPlanPicker compact />}
      {billing.hasCustomer && (
        <button type="button" className="paid-teaser-button paid-teaser-button--quiet" disabled={busy} onClick={() => void manage()}>
          {busy ? "Opening…" : "Manage subscription"}
        </button>
      )}
      {error && (
        <p className="plus-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

let returnConsumed = false;

/** One-time notice after Stripe sends the reader back (?plus=success|cancel|portal). */
export function PlusReturnNotice() {
  const [ret, setRet] = useState<CheckoutReturn>(null);
  const billing = useBilling();
  useEffect(() => {
    if (returnConsumed) return;
    returnConsumed = true;
    setRet(consumeCheckoutReturn());
  }, []);
  useEffect(() => {
    if (!ret) return;
    const t = setTimeout(() => setRet(null), 12000);
    return () => clearTimeout(t);
  }, [ret]);
  if (!ret || ret === "portal") return null;

  const unlocked = isLiveSubscription(billing.subscription);
  const text =
    ret === "cancel"
      ? "Checkout was cancelled. Nothing was charged."
      : unlocked
        ? "Thank you! Capstone Plus is unlocked."
        : "Thank you! Your payment was received. Unlocking Capstone Plus…";
  return (
    <div className="plus-return" role="status">
      <span>{text}</span>
      <button type="button" className="plus-return-close" aria-label="Dismiss" onClick={() => setRet(null)}>
        ×
      </button>
    </div>
  );
}
