import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  COLOR_GRID,
  GRID_COLS,
  MIN_OPACITY,
  encodeCustomColor,
  hexToRgb,
  highlightPresentation,
  parseHexInput,
  parseHighlightColor,
} from "../lib/highlightColor";
import { MAX_SAVED_COLORS, loadSavedColors, storeSavedColors } from "../lib/savedHighlightColors";
import type { CustomHighlightColor } from "../lib/supabase";
import { SlidersPanel, SpectrumPanel } from "./HighlightColorPanels";

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

const TABS = [
  { id: "grid", label: "Grid" },
  { id: "spectrum", label: "Spectrum" },
  { id: "sliders", label: "Sliders" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** The screen eyedropper (Chromium desktop only; not in Safari or Firefox, so the button is not drawn
 * there). Not in TypeScript's DOM types. */
type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
const getEyeDropper = () => (window as Window & { EyeDropper?: EyeDropperCtor }).EyeDropper;

/** The "Colors" sheet behind the rainbow button: Grid / Spectrum / Sliders tabs, an opacity slider, a
 * live preview, saved swatches and (where the browser has one) an eyedropper. Nothing is written to a
 * highlight until "Highlight" is pressed. */
export default function HighlightColorSheet({ initialHex, initialOpacity, hasHighlight, onApply, onRemove, onClose }: Props) {
  const titleId = useId();
  const [hex, setHex] = useState<string | null>(initialHex ? initialHex.toLowerCase() : null);
  const [opacity, setOpacity] = useState(Math.max(MIN_OPACITY, initialOpacity));
  const [tab, setTab] = useState<TabId>("grid");
  const [saved, setSaved] = useState<CustomHighlightColor[]>(loadSavedColors);
  const [picking, setPicking] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const encoded = hex ? encodeCustomColor(hex, opacity) : null;
  const preview = encoded ? highlightPresentation(encoded) : null;
  const isSaved = !!encoded && saved.includes(encoded);
  const EyeDropper = getEyeDropper();

  const toggleSaved = () => {
    if (!encoded) return;
    const next = isSaved ? saved.filter((c) => c !== encoded) : [...saved, encoded].slice(-MAX_SAVED_COLORS);
    setSaved(next);
    storeSavedColors(next);
  };

  const pickFromScreen = async () => {
    if (!EyeDropper) return;
    // The backdrop's dimming is lifted while picking, or every colour behind it would sample darker.
    setPicking(true);
    try {
      const picked = parseHexInput((await new EyeDropper().open()).sRGBHex);
      if (picked) setHex(picked);
    } catch {
      /* cancelled */
    } finally {
      setPicking(false);
    }
  };

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const to = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = TABS[(to + TABS.length) % TABS.length].id;
    setTab(next);
    dialogRef.current?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
  };

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
    ).filter((el) => el.tabIndex >= 0);
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
    <div className={`hl-colors-backdrop${picking ? " is-picking" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="hl-colors-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onDialogKey}
      >
        <div className="hl-colors-head">
          <button type="button" className="hl-colors-iconbtn hl-colors-close" onClick={onClose} aria-label="Close colors">
            <span aria-hidden="true">×</span>
          </button>
          <h2 id={titleId}>Colors</h2>
          {EyeDropper && (
            <button
              type="button"
              className="hl-colors-iconbtn hl-colors-eyedropper"
              onClick={pickFromScreen}
              aria-label="Pick a color from the screen"
              title="Pick a color from the screen"
            >
              <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m14 7 3 3M12.5 8.5 4 17v3h3l8.5-8.5" />
                <path d="m13 6 1.5-1.5a2.8 2.8 0 0 1 4 0l1 1a2.8 2.8 0 0 1 0 4L18 11Z" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>

        <div className="hl-colors-tabs" role="tablist" aria-label="Color picker type">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${titleId}-tab-${t.id}`}
              data-tab={t.id}
              aria-selected={tab === t.id}
              aria-controls={tab === t.id ? `${titleId}-panel` : undefined}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="hl-colors-panel" id={`${titleId}-panel`} role="tabpanel" aria-labelledby={`${titleId}-tab-${tab}`}>
          {tab === "grid" && (
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
          )}
          {tab === "spectrum" && <SpectrumPanel hex={hex} onPick={setHex} />}
          {tab === "sliders" && <SlidersPanel hex={hex} onPick={setHex} />}
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
          {/* The sample is always laid out (hidden until a pick) so the sheet keeps its height: it is
              anchored to the bottom, and any growth would slide the picker out from under a finger. */}
          <p>
            <mark
              className={preview ? `verse-highlight ${preview.className}` : "hl-colors-preview-hidden"}
              style={preview?.style}
              aria-hidden={preview ? undefined : true}
            >
              In the beginning God created the heavens and the earth.
            </mark>
            {!preview && <span className="hl-colors-preview-empty">Pick a color to preview it.</span>}
          </p>
          <span className="hl-colors-preview-hex">{hex ? `${hex.toUpperCase()} · ${opacity}%` : ""}</span>
        </div>

        <div className="hl-colors-saved" role="group" aria-label="Saved colors">
          {saved.map((c) => {
            const p = parseHighlightColor(c);
            if (p.kind !== "custom") return null;
            return (
              <button
                key={c}
                type="button"
                className="hl-colors-saved-swatch"
                aria-pressed={c === encoded}
                aria-label={`Saved color ${p.hex.toUpperCase()}, ${p.opacity}% opacity`}
                title={`${p.hex.toUpperCase()} · ${p.opacity}%`}
                style={{ "--hl-saved": `rgba(${hexToRgb(p.hex).join(", ")}, ${p.opacity / 100})` } as CSSProperties}
                onClick={() => {
                  setHex(p.hex);
                  setOpacity(Math.max(MIN_OPACITY, p.opacity));
                }}
              />
            );
          })}
          <button
            type="button"
            className="hl-colors-save"
            disabled={!encoded}
            onClick={toggleSaved}
            aria-label={isSaved ? "Remove this saved color" : "Save this color"}
            title={isSaved ? "Remove this saved color" : "Save this color"}
          >
            <span aria-hidden="true">{isSaved ? "−" : "+"}</span>
          </button>
          {saved.length === 0 && <span className="hl-colors-saved-hint">Save colors you use often.</span>}
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
