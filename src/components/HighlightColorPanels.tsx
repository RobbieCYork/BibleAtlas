/** The Spectrum and Sliders tabs of the Colors sheet (the Grid lives in HighlightColorSheet). */
import { useId, useRef, useState, type CSSProperties } from "react";
import {
  NAMED_HEX,
  hexToRgb,
  parseHexInput,
  rgbToHex,
  spectrumColor,
  spectrumPosition,
} from "../lib/highlightColor";

interface PanelProps {
  /** The colour picked so far ("#rrggbb"), or null before the first pick. */
  hex: string | null;
  onPick: (hex: string) => void;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Hue across, white -> pure colour -> black down. Tap or drag; arrow keys nudge. */
export function SpectrumPanel({ hex, onPick }: PanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  // The exact spot last touched: several spots give the same hex (the whole top edge is white), so
  // deriving the marker from the colour alone would make it jump away from the finger.
  const [touched, setTouched] = useState<{ x: number; y: number; hex: string } | null>(null);
  const pos = hex ? (touched?.hex === hex ? touched : spectrumPosition(hex)) : null;

  const pickAt = (x: number, y: number) => {
    const next = { x: clamp01(x), y: clamp01(y) };
    const picked = spectrumColor(next.x, next.y);
    setTouched({ ...next, hex: picked });
    onPick(picked);
  };

  const pickFromPointer = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (r && r.width && r.height) pickAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const from = pos ?? { x: 0, y: 0.5 };
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1 / 72, 0],
      ArrowRight: [1 / 72, 0],
      ArrowUp: [0, -0.025],
      ArrowDown: [0, 0.025],
    };
    if (!(e.key in step)) return;
    e.preventDefault();
    pickAt(from.x + step[e.key][0], from.y + step[e.key][1]);
  };

  return (
    <div
      ref={ref}
      className="hl-colors-spectrum"
      role="slider"
      tabIndex={0}
      aria-label="Color spectrum. Left and right change the hue, up and down the lightness."
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round((pos?.x ?? 0) * 360)}
      aria-valuetext={hex ? `${hex.toUpperCase()}` : "No color picked"}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        ref.current?.focus({ preventScroll: true });
        e.currentTarget.setPointerCapture(e.pointerId);
        pickFromPointer(e);
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && pickFromPointer(e)}
      onKeyDown={onKeyDown}
    >
      {pos && hex && (
        <span
          className="hl-colors-spectrum-marker"
          style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, background: hex }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

const CHANNELS = ["Red", "Green", "Blue"] as const;

/** Red / green / blue sliders and a hex field. Before the first pick the sliders rest on the app's
 * yellow, but nothing counts as picked until one is moved or a code is typed. */
export function SlidersPanel({ hex, onPick }: PanelProps) {
  const id = useId();
  const channels = hexToRgb(hex ?? NAMED_HEX.yellow);
  // What is in the hex field while it is being edited, tied to the colour it was typed against: if the
  // colour changes some other way (a slider, a saved swatch — neither of which takes focus from the
  // field on iOS) the stale text is ignored and the field shows the real value again.
  const [edit, setEdit] = useState<{ text: string; hex: string | null } | null>(null);
  const draft = edit && edit.hex === hex ? edit.text : null;
  const invalid = draft !== null && !/^\s*#?[0-9a-fA-F]{0,6}\s*$/.test(draft);

  const setChannel = (i: number, value: number) => {
    const next: [number, number, number] = [...channels];
    next[i] = value;
    onPick(rgbToHex(...next));
  };

  const finishHex = () => {
    const full = draft === null ? null : parseHexInput(draft, true);
    if (full) onPick(full);
    setEdit(null);
  };

  return (
    <div className="hl-colors-sliders">
      {CHANNELS.map((name, i) => {
        const end = (v: number) => rgbToHex(...(channels.map((c, j) => (j === i ? v : c)) as [number, number, number]));
        return (
          <div key={name} className="hl-colors-channel">
            <label htmlFor={`${id}-${name}`}>{name}</label>
            <input
              id={`${id}-${name}`}
              type="range"
              min={0}
              max={255}
              step={1}
              value={channels[i]}
              onChange={(e) => setChannel(i, Number(e.target.value))}
              style={{ "--hl-track": `linear-gradient(to right, ${end(0)}, ${end(255)})` } as CSSProperties}
            />
            <output htmlFor={`${id}-${name}`}>{channels[i]}</output>
          </div>
        );
      })}
      <div className="hl-colors-hex">
        <label htmlFor={`${id}-hex`}>Hex color #</label>
        <input
          id={`${id}-hex`}
          type="text"
          value={draft ?? (hex ? hex.slice(1).toUpperCase() : "")}
          placeholder={NAMED_HEX.yellow.slice(1).toUpperCase()}
          maxLength={9}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={invalid}
          onChange={(e) => {
            const text = e.target.value;
            const full = parseHexInput(text);
            setEdit({ text, hex: full ?? hex });
            if (full) onPick(full);
          }}
          onBlur={finishHex}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            finishHex();
          }}
        />
        {invalid && <p className="hl-colors-hex-error">Use 0-9 and A-F, six characters.</p>}
      </div>
    </div>
  );
}
