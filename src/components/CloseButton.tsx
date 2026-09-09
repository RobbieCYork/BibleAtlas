interface CloseButtonProps {
  onClick: () => void;
  /** Defaults to "Close" — override if a panel ever needs a more specific word on the pill. */
  label?: string;
  /** Required, and deliberately not defaulted to the visible label: "Close" alone is what a screen
   * reader gets from four other one-off close buttons in this app, and it is not enough here — an
   * article column sits alongside two other panels that also look closable. Whatever is passed must
   * still START with the visible label ("Close article", not "Dismiss article"): an accessible name
   * that doesn't contain the visible text breaks voice control, which matches on what it can see. */
  ariaLabel: string;
  className?: string;
}

/** The counterpart to BackButton (see BackButton.tsx) for "dismiss this panel", and the first
 * *shared* close control in the app.
 *
 * It exists because there wasn't one to reuse. Eight close/dismiss buttons were already scattered
 * around — `.share-modal-close`, `.bible-plans-close`, `.walk-panel-close`, `.walk-banner-dismiss`,
 * `.notification-toast-close`, `.verse-popup-close`, `.ref-picker-close`, `.verse-popup-close-full`
 * — every one of them a bespoke CSS rule. The older eight are deliberately left alone; restyling
 * live controls is not this change's job.
 *
 * IT IS A LABELLED PILL, NOT A GLYPH. It shipped first as a bare 34x34 `×` circle borrowed from
 * `.ref-picker-close`, and against the real thing that was wrong: this button's entire job is to
 * pair with a Back button at the other end of the same row, and a naked glyph opposite a labelled
 * pill reads as two unrelated controls rather than as the two ends of one row. So it takes its box
 * from `.back-btn` instead — same border, radius, background, font size, padding and height, down
 * to the asymmetric padding that gives the leading mark slightly less room than the trailing text
 * (see `.panel-close-btn` in App.css, which is a deliberate copy of `.back-btn`). Back leads with a
 * chevron; this leads with the same `×` (U+00D7) six of the older eight use, sized to occupy
 * exactly the 14px box that chevron does, so the two labels sit on one optical line.
 *
 * The `×` is `aria-hidden`, so the button announces its `ariaLabel` once and not "close close".
 *
 * Pairs with BackButton in a `.panel-back-row`: Back top-left, Close top-right. */
export default function CloseButton({
  onClick,
  label = "Close",
  ariaLabel,
  className,
}: CloseButtonProps) {
  return (
    <button
      type="button"
      className={className ? `panel-close-btn ${className}` : "panel-close-btn"}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="panel-close-btn-glyph" aria-hidden="true">
        ×
      </span>
      <span>{label}</span>
    </button>
  );
}
