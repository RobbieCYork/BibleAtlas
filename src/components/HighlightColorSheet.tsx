import { useEffect, useId, useRef, useState } from "react";
import {
  COLOR_GRID,
  GRID_COLS,
  MIN_OPACITY,
  encodeCustomColor,
  highlightPresentation,
} from "../lib/highlightColor";

interface Props {
  /** Colour already on the selected range (hex) and its opacity, to preselect. */
  initialHex: string | null;
  initialOpacity: number;
  /** True when the selected range already wears a highlight, so a Remove action is offered. */
  hasHighlight: boolean;
  onApply: (color: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

/** The "Colors" sheet behind the rainbow button: a 12 x 9 swatch grid, an opacity slider and a live
 * preview. Nothing is written until "Highlight" is pressed. */
export default function HighlightColorSheet({ initialHex, initialOpacity, hasHighlight, onApply, onRemove, onClose }: Props) {
  const titleId = useId();
  const [hex, setHex] = useState<string | null>(initialHex ? initialHex.toLowerCase() : null);
  const [opacity, setOpacity] = useState(Math.max(MIN_OPACITY, initialOpacity));
  const dialogRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const encoded = hex ? encodeCustomColor(hex, opacity) : null;
  const preview = encoded ? highlightPresentation(encoded) : null;

  // Move focus into the dialog on open (the selected swatch, else the first) and hand it back to
  // whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const target = gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]');
    target?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []);

  const selectedIndex = hex ? COLOR_GRID.findIndex((s) => s.hex === hex) : -1;
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const moveFocus = (to: number) => {
    const buttons = gridRef.current?.querySelectorAll<HTMLElement>('[role="radio"]');
    buttons?.[Math.max(0, Math.min(COLOR_GRID.length - 1, to))]?.focus();
  };

  const onGridKey = (e: React.KeyboardEvent, index: number) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: GRID_COLS, ArrowUp: -GRID_COLS };
    if (e.key in step) {
      e.preventDefault();
      moveFocus(index + step[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(COLOR_GRID.length - 1);
    }
  };

  // Escape closes only this sheet (stopPropagation keeps the verse sheet's own Escape handler from
  // also dismissing the selection); Tab is trapped inside the dialog.
  const onDialogKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, [tabindex="0"]') ?? []
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="hl-colors-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="hl-colors-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onDialogKey}
      >
        <div className="hl-colors-head">
          <h2 id={titleId}>Colors</h2>
          <button type="button" className="hl-colors-close" onClick={onClose} aria-label="Close colors">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div ref={gridRef} className="hl-colors-grid" role="radiogroup" aria-label="Highlight color">
          {COLOR_GRID.map((s, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={s.hex === hex}
              aria-label={s.label}
              title={s.label}
              tabIndex={i === tabbableIndex ? 0 : -1}
              className={`hl-colors-swatch${s.hex === hex ? " is-selected" : ""}`}
              style={{ background: s.hex }}
              onClick={() => setHex(s.hex)}
              onKeyDown={(e) => onGridKey(e, i)}
            />
          ))}
        </div>

        <div className="hl-colors-opacity">
          <label htmlFor={`${titleId}-opacity`}>Opacity</label>
          <input
            id={`${titleId}-opacity`}
            type="range"
            min={MIN_OPACITY}
            max={100}
            step={1}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            aria-valuetext={`${opacity} percent`}
          />
          <output htmlFor={`${titleId}-opacity`} className="hl-colors-opacity-value">
            {opacity}%
          </output>
        </div>

        <div className="hl-colors-preview" aria-live="polite">
          <span className="hl-colors-preview-chip" style={{ background: hex ?? "transparent" }} aria-hidden="true" />
          <p>
            {preview ? (
              <mark className={`verse-highlight ${preview.className}`} style={preview.style}>
                In the beginning God created the heavens and the earth.
              </mark>
            ) : (
              <span className="hl-colors-preview-empty">Pick a color to preview it.</span>
            )}
          </p>
          <span className="hl-colors-preview-hex">{hex ? `${hex.toUpperCase()} · ${opacity}%` : ""}</span>
        </div>

        <div className="hl-colors-actions">
          {hasHighlight && (
            <button type="button" className="hl-colors-remove" onClick={onRemove}>
              Remove highlight
            </button>
          )}
          <button type="button" className="hl-colors-confirm" disabled={!encoded} onClick={() => encoded && onApply(encoded)}>
            Highlight
          </button>
        </div>
      </div>
    </div>
  );
}
