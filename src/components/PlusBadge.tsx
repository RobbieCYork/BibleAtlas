/**
 * PlusBadge — an explicit "PLUS" chip for places a CSS outline cannot reach (inline in a menu row,
 * next to a heading). Hidden unless Plus preview is on (src/plusPreview.css), so it is invisible to
 * everyone else. For a whole element, prefer the attribute convention instead: data-tier="plus" or
 * data-tier="free".
 */
export default function PlusBadge({ tier = "plus" }: { tier?: "plus" | "free" }) {
  return (
    <span className={`plus-badge plus-badge--${tier}`} aria-hidden="true">
      {tier === "plus" ? "PLUS" : "FREE"}
    </span>
  );
}
