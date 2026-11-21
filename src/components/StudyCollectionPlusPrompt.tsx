import { useId, useState } from "react";
import "./PaidTeaser.css";
import { billingVisible, useBilling } from "../lib/billing";
import { PlusPlanPicker } from "./CapstonePlus";

/** The Capstone Plus prompt for Study Collections, in PaidTeaser's look (same classes) and with its
 * rule: never a dead button. Upgrade appears only when web billing is on (paid.billing_enabled,
 * sql/045); otherwise it says Plus is coming. */
export default function StudyCollectionPlusPrompt({ compact = false }: { compact?: boolean }) {
  const billing = useBilling();
  const [choosing, setChoosing] = useState(false);
  const headingId = useId();
  const webBilling = billingVisible(billing);
  return (
    <section className="paid-teaser study-plus-prompt" aria-labelledby={headingId}>
      <h4 id={headingId}>Study collections are part of Capstone Plus</h4>
      <p className="paid-teaser-text">
        {compact
          ? "Gather places, people, events, verses and your notes into named collections."
          : "Gather places, people, topics, timeline events, Bible verses and your own notes into named, ordered collections for a study, a sermon or a class."}
      </p>
      {webBilling ? (
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
