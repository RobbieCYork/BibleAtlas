import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";

/* ============================================================================
 * TimelineGoToMenu — the header's "Go to" control for TimelineView.
 *
 * The timeline has one fixed scale and no zoom, across about six thousand years,
 * so getting somewhere far away cannot depend on dragging. This menu takes any
 * year (BC or AD), or one of the named eras, and TimelineView pans there.
 *
 * Same dropdown idiom and sizing as TimelineLaneMenu next to it.
 * ========================================================================== */

/** Signed years, same convention as everywhere else in the timeline: negative = BC. */
export const TIMELINE_ERAS: { label: string; from: number; to: number }[] = [
  { label: "Primeval History", from: -4100, to: -2000 },
  { label: "The Patriarchs", from: -2100, to: -1500 },
  { label: "Exodus & Conquest", from: -1500, to: -1050 },
  { label: "Kings & Prophets", from: -1050, to: -586 },
  { label: "Exile & Return", from: -620, to: -400 },
  { label: "Between the Testaments", from: -400, to: -5 },
  { label: "Life of Christ", from: -8, to: 40 },
  { label: "The Apostolic Church", from: 28, to: 110 },
  { label: "Patristic & Nicene", from: 100, to: 500 },
  { label: "The Medieval Church", from: 500, to: 1400 },
  { label: "Reformation", from: 1450, to: 1650 },
  { label: "Missions & Revival", from: 1650, to: 1900 },
  { label: "The Modern Era", from: 1900, to: 2030 },
];

type Era = "BC" | "AD";

interface TimelineGoToMenuProps {
  /** Signed year in the middle of the screen — decides whether BC or AD starts selected. */
  currentYear: () => number;
  /** Signed year, never 0. */
  onGoToYear: (year: number) => void;
  onGoToEra: (from: number, to: number) => void;
}

export default function TimelineGoToMenu({ currentYear, onGoToYear, onGoToEra }: TimelineGoToMenuProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [era, setEra] = useState<Era>("AD");
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const errorId = useId();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    // With a mouse and keyboard, start in the year box. On a touch screen that would throw the
    // keyboard up over the era list before the reader has chosen between the two.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) inputRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setText("");
      setError("");
      setEra(currentYear() < 0 ? "BC" : "AD");
    }
    setOpen(!open);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const year = Number(text);
    if (!text) {
      setError("Enter a year.");
    } else if (year === 0) {
      setError("There is no year 0: 1 BC is followed by AD 1.");
    } else {
      setOpen(false);
      // Closes the phone keyboard along with the menu.
      inputRef.current?.blur();
      onGoToYear(era === "BC" ? -year : year);
      return;
    }
    inputRef.current?.focus();
  };

  return (
    <div className="tl-lane-menu tl-goto-menu" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="tl-lane-menu-button tl-goto-button"
        onClick={toggle}
        aria-label="Go to a year or era"
        aria-expanded={open}
        title="Go to a year or era"
      >
        <span className="tl-goto-button-text">Go to</span>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2.2 8h11.6M9.6 4.2 13.4 8l-3.8 3.8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="tl-lane-menu-dropdown tl-goto-dropdown">
          <form className="tl-goto-form" onSubmit={submit} noValidate>
            <p className="tl-lane-menu-title">Go to a year</p>
            <div className="tl-goto-row">
              <input
                ref={inputRef}
                className="tl-goto-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="go"
                autoComplete="off"
                maxLength={4}
                placeholder="Year"
                aria-label="Year"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                value={text}
                onChange={(e) => {
                  setText(e.target.value.replace(/\D/g, ""));
                  setError("");
                }}
              />
              <div className="tl-goto-era" role="group" aria-label="BC or AD">
                {(["BC", "AD"] as const).map((value) => (
                  <button key={value} type="button" aria-pressed={era === value} onClick={() => setEra(value)}>
                    {value}
                  </button>
                ))}
              </div>
              <button type="submit" className="tl-goto-submit">
                Go
              </button>
            </div>
            {error && (
              <p id={errorId} className="tl-goto-error" role="alert">
                {error}
              </p>
            )}
          </form>
          <p className="tl-lane-menu-title tl-goto-eras-title">Or jump to an era</p>
          {TIMELINE_ERAS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="tl-lane-menu-item tl-era-menu-item"
              onClick={() => {
                onGoToEra(item.from, item.to);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
