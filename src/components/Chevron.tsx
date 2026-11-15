import { ChevronDown } from "lucide-react";

/** The one disclosure arrow. Replaces the ▸ / ▾ text glyphs, which rendered at 8–12px in a muted
 * grey and read as decoration rather than as a control on a phone. A real stroked SVG (Lucide, like
 * the rest of the icon set), 22px, stroke 2.5, `currentColor` so every skin — dark ones included —
 * colours it for free. Styling and motion live in `.chev` in App.css.
 *
 * `kind="row"` (default): points right when closed, down when open — an expandable row.
 * `kind="menu"`: points down when closed, up when open — a dropdown that opens beneath its button.
 * Decorative: the button carries `aria-expanded`, so this is `aria-hidden`. */
export default function Chevron({
  open,
  kind = "row",
  size = 22,
  className = "",
}: {
  open: boolean;
  kind?: "row" | "menu";
  size?: number;
  className?: string;
}) {
  return (
    <ChevronDown
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      strokeWidth={2.5}
      className={`chev chev-${kind}${open ? " chev-open" : ""}${className ? ` ${className}` : ""}`}
    />
  );
}
