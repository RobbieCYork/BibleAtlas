import { useState } from "react";
import "./PaidTeaser.css";
import type { PaidCounts, PaidKind } from "../lib/paidContentSpec";
import type { PaidState } from "../lib/paidContent";
import { billingVisible, useBilling } from "../lib/billing";
import { PlusPlanPicker } from "./CapstonePlus";

/**
 * What an article panel shows at the cut (just below its Bible references list) whenever the paid
 * part is not on screen: the upgrade teaser for a reader without Capstone Plus, skeleton lines while
 * an entitled reader's text loads, and a plain message with Retry when it cannot load.
 *
 * Rules from the plan (paid-tier-plan.md section 1): never an empty panel, never a spinner that does
 * not resolve, never a broken section header — and never a dead button. Without an `onUpgrade`
 * handler, the Upgrade button appears only when web billing is switched on (paid.billing_enabled,
 * sql/045 — src/lib/billing.ts) and opens the Monthly / Yearly picker in place; otherwise the teaser
 * says Plus is coming instead of drawing a button that does nothing. The placeholder lines are drawn
 * shapes with no text behind them.
 */

const WHAT_IS_BEHIND: Record<PaidKind, string> = {
  place: "This place's history, archaeology, sources and a question to reflect on",
  site: "The full description of this site, its archaeology and sources",
  person: "Their life and accomplishments, the historical evidence, the debates and further reading",
  topic: "The full article, its sources and further reading",
  event: "The full account of this event, how it is dated, and its sources",
};

function countChips(kind: PaidKind, c: PaidCounts): string[] {
  const out: string[] = [];
  const n = (k: number, one: string, many: string) => (k > 0 ? `${k} ${k === 1 ? one : many}` : null);
  const push = (s: string | null) => s && out.push(s);
  if (kind === "topic" || kind === "person" || kind === "place") push(n(c.sections, "section", "sections"));
  if (kind === "event" || kind === "person") push(n(c.paragraphs, "paragraph", "paragraphs"));
  if (c.archaeology) out.push("Archaeology");
  push(n(c.sources, "source", "sources"));
  if (c.reflect) out.push("Reflect");
  return out;
}

interface PaidTeaserProps {
  kind: PaidKind;
  state: Exclude<PaidState<PaidKind>["status"], "ready">;
  counts: PaidCounts;
  onRetry?: () => void;
  /** Overrides the built-in purchase flow (e.g. a native store sheet). Usually absent. */
  onUpgrade?: () => void;
}

export default function PaidTeaser({ kind, state, counts, onRetry, onUpgrade }: PaidTeaserProps) {
  const billing = useBilling();
  const [choosing, setChoosing] = useState(false);
  const webBilling = !onUpgrade && billingVisible(billing);
  if (state === "loading") {
    return (
      <div className="paid-teaser paid-teaser--loading" aria-busy="true" aria-label="Loading the full article">
        <span className="paid-teaser-line" />
        <span className="paid-teaser-line" />
        <span className="paid-teaser-line paid-teaser-line--short" />
      </div>
    );
  }

  if (state === "offline" || state === "unavailable") {
    return (
      <div className="paid-teaser paid-teaser--message" role="status">
        <p>
          {state === "offline"
            ? "The full article needs a connection. It will be here once you're back online."
            : "The full article couldn't be loaded just now."}
        </p>
        {onRetry && (
          <button type="button" className="paid-teaser-button paid-teaser-button--quiet" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  const chips = countChips(kind, counts);
  return (
    <section className="paid-teaser" aria-labelledby={`paid-teaser-h-${kind}`}>
      <div className="paid-teaser-ghost" aria-hidden="true">
        <span className="paid-teaser-line" />
        <span className="paid-teaser-line" />
        <span className="paid-teaser-line paid-teaser-line--short" />
      </div>
      <h4 id={`paid-teaser-h-${kind}`}>Continue with Capstone Plus</h4>
      <p className="paid-teaser-text">{WHAT_IS_BEHIND[kind]} are part of Capstone Plus.</p>
      {chips.length > 0 && (
        <ul className="paid-teaser-counts" aria-label="Included in this article">
          {chips.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      {onUpgrade ? (
        <button type="button" className="paid-teaser-button" onClick={onUpgrade}>
          Upgrade to Plus
        </button>
      ) : webBilling ? (
        choosing ? (
          <PlusPlanPicker />
        ) : (
          <button type="button" className="paid-teaser-button" onClick={() => setChoosing(true)}>
            Upgrade to Plus
          </button>
        )
      ) : (
        <p className="paid-teaser-soon">Capstone Plus is coming soon.</p>
      )}
    </section>
  );
}
