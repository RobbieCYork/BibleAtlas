import { useEffect, useRef, useState } from "react";

/* ============================================================================
 * TimelineLaneMenu — small persistent header control for TimelineView that
 * lets the user check/uncheck which of the four timelines render. Mirrors
 * PanelMenu's dropdown-checklist idiom (click button, toggle checkboxes,
 * click outside to close) so the interaction feels consistent with the rest
 * of the app, at zoom-control scale to fit TimelineView's header.
 *
 * One entry per LANE, and nothing below that level. There used to be separate
 * checkboxes for biblical / church history / movements, back when each was its
 * own band; they now share the single "Biblical and Church History" timeline
 * and are not distinguished from one another anywhere — not visually, not in
 * this menu. Four timelines, four switches.
 * ========================================================================== */

/** A lane key doubles as its visibility key — there is no longer any sub-lane state.
 * "books" is retained only for the disabled Books-of-the-Bible band (see SHOW_BOOKS_LANE
 * in TimelineView.tsx); it is absent from TIMELINE_LANE_ORDER below. */
export type TimelineLaneKey = "books" | "bible-church" | "lifespans" | "world" | "religion";

/** The checklist, in the order the bands actually stack on screen. Must stay in step with
 * EVENT_LANES in TimelineView.tsx, which places the Lifespans band between the first and
 * second event lanes.
 *
 * "books" is deliberately absent: the Books-of-the-Bible band is switched off at the owner's
 * request behind SHOW_BOOKS_LANE in TimelineView.tsx. Its key, label, storage handling and
 * rendering all remain — re-add "books" to the front of this array and flip that constant to
 * `true` to bring the lane back exactly as it was. */
export const TIMELINE_LANE_ORDER: TimelineLaneKey[] = [
  "bible-church",
  "lifespans",
  "world",
  "religion",
];

export const TIMELINE_LANE_LABELS: Record<TimelineLaneKey, string> = {
  books: "Books of the Bible",
  "bible-church": "Biblical and Church History",
  lifespans: "Lifespans",
  world: "World History",
  religion: "Other Religions",
};

/** Each lane's swatch colour, matching the marks that lane actually draws (see LANE_MARK_VAR
 * in TimelineView.tsx). One colour per lane, one lane per colour. */
const LANE_SWATCH_VAR: Record<TimelineLaneKey, string> = {
  books: "var(--tl-life)",
  "bible-church": "var(--tl-biblical)",
  lifespans: "var(--tl-life)",
  world: "var(--tl-world)",
  religion: "var(--tl-religion)",
};

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
        aria-label="Choose visible timelines"
        aria-expanded={open}
        title="Choose visible timelines"
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
          <p className="tl-lane-menu-title">Show timelines</p>
          {TIMELINE_LANE_ORDER.map((key) => (
            <label key={key} className="tl-lane-menu-item">
              <input type="checkbox" checked={visible[key]} onChange={() => onToggle(key)} />
              <span
                className="tl-lane-menu-swatch"
                style={{ background: LANE_SWATCH_VAR[key] }}
                aria-hidden="true"
              />
              {TIMELINE_LANE_LABELS[key]}
            </label>
          ))}
          <p className="tl-lane-menu-caption">
            Each checked timeline gets its own generous height — checking more means more
            scrolling to reach them all.
          </p>
        </div>
      )}
    </div>
  );
}
