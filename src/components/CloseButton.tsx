interface CloseButtonProps {
  onClick: () => void;
  /** Required, and deliberately not defaulted to a bare "Close": this button is a glyph, so the
   * label is the only thing that says *what* is being closed. "Close" alone is what a screen
   * reader gets from four other one-off close buttons in this app, and it is not enough here —
   * an article column sits alongside two other panels that also look closable. */
  ariaLabel: string;
  className?: string;
}

/** The counterpart to BackButton (see BackButton.tsx) for "dismiss this panel", and the first
 * *shared* close control in the app.
 *
 * It exists because there wasn't one to reuse. Eight close/dismiss buttons were already scattered
 * around — `.share-modal-close`, `.bible-plans-close`, `.walk-panel-close`, `.walk-banner-dismiss`,
 * `.notification-toast-close`, `.verse-popup-close`, `.ref-picker-close`, `.verse-popup-close-full`
 * — every one of them a bespoke CSS rule. So rather than invent a ninth look, this borrows from
 * what is already there and nothing else:
 *
 *   - the glyph is `×` (U+00D7), which six of the eight use. Not an SVG, and not `<Icon
 *     name="close" />`, which no close button in this app uses.
 *   - the box is the reference picker's: a 34x34 ghost circle, muted until hover, then accent —
 *     the one existing close button that already sits in a panel header beside a Back control,
 *     which is exactly this button's situation.
 *
 * The older eight are deliberately left alone; restyling live controls is not this change's job.
 *
 * Pairs with BackButton in a `.panel-back-row`: Back top-left, Close top-right. */
export default function CloseButton({ onClick, ariaLabel, className }: CloseButtonProps) {
  return (
    <button
      type="button"
      className={className ? `panel-close-btn ${className}` : "panel-close-btn"}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}
