import { useEffect, useRef, useState } from "react";

/* ============================================================================
 * TimelineEraMenu — "Jump to" era presets for TimelineView.
 *
 * Why this exists: the timeline's axis is genuinely linear in years (worldX =
 * (year - MIN_YEAR) * pxPerYear), and merging biblical history with church history
 * and world history means one continuous span of roughly 4004 BC to the 2020s —
 * about six thousand years. Fitting all of that to a 1200px viewport puts the
 * entire New Testament period inside ~20px. Zoom and pan can reach it, but only if
 * you already know where to aim.
 *
 * The alternative — a non-linear/compressed axis — was rejected deliberately: the
 * whole point of a timeline is that distance means elapsed time, and a warped axis
 * would quietly lie about how far the Exile really is from the Reformation. So the
 * axis stays honest and NAVIGATION gets the help instead: these presets fly the
 * view to a named span using the same animated zoomToYearRange a cluster badge uses.
 *
 * Same dropdown idiom and sizing as TimelineLaneMenu next to it.
 *
 * CURRENTLY NOT RENDERED. The owner asked for the "Jump to" button to be removed from the
 * timeline, so TimelineView.tsx gates it behind `SHOW_ERA_MENU = false` (search for that constant
 * there). Nothing here has been deleted or stubbed: this component, the TIMELINE_ERAS table below
 * and the `showYearRange` callback that drives it are all intact and type-checked, and flipping
 * that one flag back to `true` restores the control exactly as it was. Note the tradeoff the flag
 * turns off — see "Why this exists" above: with this gone, panning and zooming are the only way to
 * traverse six thousand linear years.
 * ========================================================================== */

/** Signed years, same convention as everywhere else in the timeline: negative = BC.
 * Ranges are deliberately a little generous at both ends so the named era doesn't
 * land flush against the viewport edge. */
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

interface TimelineEraMenuProps {
  onJump: (from: number, to: number) => void;
  /** Zooms all the way back out to the full span — the same action as the Fit button. */
  onFit: () => void;
}

export default function TimelineEraMenu({ onJump, onFit }: TimelineEraMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="tl-lane-menu" ref={containerRef}>
      <button
        type="button"
        className="tl-lane-menu-button tl-era-menu-button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Jump to an era"
        aria-expanded={open}
        title="Jump to an era"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2.2 8h11.6M9.6 4.2 13.4 8l-3.8 3.8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="tl-lane-menu-count">Eras</span>
      </button>
      {open && (
        <div className="tl-lane-menu-dropdown tl-era-menu-dropdown">
          <p className="tl-lane-menu-title">Jump to</p>
          {TIMELINE_ERAS.map((era) => (
            <button
              key={era.label}
              type="button"
              className="tl-lane-menu-item tl-era-menu-item"
              onClick={() => {
                onJump(era.from, era.to);
                setOpen(false);
              }}
            >
              {era.label}
            </button>
          ))}
          <button
            type="button"
            className="tl-lane-menu-item tl-era-menu-item tl-era-menu-all"
            onClick={() => {
              onFit();
              setOpen(false);
            }}
          >
            The whole span
          </button>
          <p className="tl-lane-menu-caption">
            The axis is truly linear, so six thousand years is a long way to drag. These fly the
            view straight to a span; zoom and pan still work exactly as before.
          </p>
        </div>
      )}
    </div>
  );
}
