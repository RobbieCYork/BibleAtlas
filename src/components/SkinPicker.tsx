import { useId, useState } from "react";
import Chevron from "./Chevron";
import { SKINS, setSkin, useStoredSkin, type SkinChoice } from "../lib/skin";

/** My Profile → Appearance. Pick a look for the app; it applies at once and is remembered on this
 * device only (lib/skin.tsx). Built from native radio inputs so arrow keys, Tab and screen readers
 * behave exactly as for any radio group; the card around each one is just its <label>. */
const OPTIONS: ReadonlyArray<{ id: SkinChoice; label: string; blurb: string; swatch: readonly [string, string, string] }> = [
  { id: "default", label: "Default", blurb: "The standard Capstone Bible look.", swatch: ["#f4f2ee", "#8a5e12", "#2e3a8c"] },
  ...SKINS.map((s) => ({ id: s.id as SkinChoice, label: s.label, blurb: s.blurb, swatch: s.swatch })),
];

export default function SkinPicker() {
  const choice = useStoredSkin();
  // Collapsed on every load; deliberately not persisted.
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const current = OPTIONS.find((o) => o.id === choice)?.label ?? "Default";
  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <button
        type="button"
        className="skin-toggle"
        id="skin-picker-heading"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="skin-toggle-title">Appearance</span>
        {!open && <span className="skin-toggle-hint">{current}</span>}
        <Chevron open={open} kind="menu" />
      </button>
      <div id={panelId} hidden={!open} className="skin-collapse">
      <div className="skin-picker" role="radiogroup" aria-labelledby="skin-picker-heading">
        {OPTIONS.map((o) => (
          <label key={o.id} className={`skin-card${choice === o.id ? " skin-card-selected" : ""}`}>
            <input
              type="radio"
              name="app-skin"
              className="skin-card-input"
              checked={choice === o.id}
              onChange={() => setSkin(o.id)}
              aria-label={`${o.label}. ${o.blurb}`}
            />
            <span className="skin-card-swatch" aria-hidden="true">
              {o.swatch.map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </span>
            <span className="skin-card-text" aria-hidden="true">
              <span className="skin-card-name">{o.label}</span>
              <span className="skin-card-blurb">{o.blurb}</span>
            </span>
            <span className="skin-card-check" aria-hidden="true">
              {choice === o.id ? "✓" : ""}
            </span>
          </label>
        ))}
      </div>
      <span className="skin-picker-note">Saved on this device only. Each skin sets its own light or dark look.</span>
      </div>
    </div>
  );
}
