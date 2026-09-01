import { useEffect, useRef, useState } from "react";

/* ============================================================================
 * TimelineLaneMenu — small persistent header control for TimelineView that
 * lets the user check/uncheck which of the five stacked lanes render. Mirrors
 * PanelMenu's dropdown-checklist idiom (click button, toggle checkboxes,
 * click outside to close) so the interaction feels consistent with the rest
 * of the app, at zoom-control scale to fit TimelineView's header.
 * ========================================================================== */

export type TimelineLaneKey =
  | "books"
  | "lifespans"
  | "biblical"
  | "church"
  | "world"
  | "movement"
  | "religion";

/** The checklist, in the order the bands actually stack on screen.
 *
 * The first three are CATEGORIES sharing the single merged "Scripture & the Church" lane, so
 * unchecking one thins that lane rather than removing a band; the rest are whole bands. See
 * EVENT_LANES in TimelineView.tsx.
 *
 * "books" is deliberately absent: the Books-of-the-Bible band is switched off at the owner's
 * request behind SHOW_BOOKS_LANE in TimelineView.tsx. Its key, label, storage handling and
 * rendering all remain — re-add "books" to the front of this array and flip that constant to
 * `true` to bring the lane back exactly as it was. */
export const TIMELINE_LANE_ORDER: TimelineLaneKey[] = [
  "biblical",
  "church",
  "movement",
  "lifespans",
  "world",
  "religion",
];

export const TIMELINE_LANE_LABELS: Record<TimelineLaneKey, string> = {
  books: "Books of the Bible",
  lifespans: "Lifespans",
  biblical: "Biblical",
  church: "Church History",
  world: "World History",
  movement: "Movements & Revivals",
  religion: "Other Religions",
};

/** Where the "Scripture & the Church" group ends in TIMELINE_LANE_ORDER — the checklist draws a
 * subheading above these and a divider after them, so it's clear the first three share one lane. */
const MERGED_LANE_KEYS: TimelineLaneKey[] = ["biblical", "church", "movement"];

interface TimelineLaneMenuProps {
  visible: Record<TimelineLaneKey, boolean>;
  onToggle: (key: TimelineLaneKey) => void;
}

export default function TimelineLaneMenu({ visible, onToggle }: TimelineLaneMenuProps) {
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

  const visibleCount = TIMELINE_LANE_ORDER.filter((k) => visible[k]).length;

  return (
    <div className="tl-lane-menu" ref={containerRef}>
      <button
        type="button"
        className="tl-lane-menu-button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose visible timeline lanes"
        aria-expanded={open}
        title="Choose visible timeline lanes"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="2.4" width="13" height="2.3" rx="1.15" fill="currentColor" />
          <rect x="1.5" y="6.85" width="8.5" height="2.3" rx="1.15" fill="currentColor" />
          <rect x="1.5" y="11.3" width="11" height="2.3" rx="1.15" fill="currentColor" />
        </svg>
        <span className="tl-lane-menu-count">
          {visibleCount}/{TIMELINE_LANE_ORDER.length}
        </span>
      </button>
      {open && (
        <div className="tl-lane-menu-dropdown">
          <p className="tl-lane-menu-title">Scripture &amp; the Church</p>
          {MERGED_LANE_KEYS.map((key) => (
            <label key={key} className="tl-lane-menu-item">
              <input type="checkbox" checked={visible[key]} onChange={() => onToggle(key)} />
              <span className={`tl-lane-menu-swatch tl-cat-${key}`} aria-hidden="true" />
              {TIMELINE_LANE_LABELS[key]}
            </label>
          ))}
          <p className="tl-lane-menu-title tl-lane-menu-title-divided">Alongside</p>
          {TIMELINE_LANE_ORDER.filter((k) => !MERGED_LANE_KEYS.includes(k)).map((key) => (
            <label key={key} className="tl-lane-menu-item">
              <input type="checkbox" checked={visible[key]} onChange={() => onToggle(key)} />
              <span
                className={`tl-lane-menu-swatch${key === "lifespans" ? " tl-swatch-life" : ` tl-cat-${key}`}`}
                aria-hidden="true"
              />
              {TIMELINE_LANE_LABELS[key]}
            </label>
          ))}
          <p className="tl-lane-menu-caption">
            The first three share one continuous lane — biblical, church and movement events run
            together in date order, told apart by colour and shape.
          </p>
        </div>
      )}
    </div>
  );
}
