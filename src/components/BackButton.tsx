interface BackButtonProps {
  onClick: () => void;
  /** Defaults to "Back" — override for a more specific label (e.g. "Back to Timeline"). */
  label?: string;
  /** Defaults to the label — override when the visible label alone wouldn't make sense to a screen
   * reader (e.g. a label that's already inside a heading context). */
  ariaLabel?: string;
  className?: string;
}

/** The one "Back" control used everywhere a view needs to say "leave this and return to what was
 * here before" — every details article, My Profile, Timeline, Friends/Groups sub-screens, Sermon
 * Notes, and every Games screen. Same chevron-pill look and the same top-left spot in whatever
 * header row it's placed in, so "Back" always means the same thing wherever it appears. */
export default function BackButton({ onClick, label = "Back", ariaLabel, className }: BackButtonProps) {
  return (
    <button
      type="button"
      className={className ? `back-btn ${className}` : "back-btn"}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10.5 3 5.5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
