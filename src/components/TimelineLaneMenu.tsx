import { useEffect, useRef, useState } from "react";

/* ============================================================================
 * TimelineLaneMenu — small persistent header control for TimelineView that
 * lets the user check/uncheck which of the five stacked lanes render. Mirrors
 * PanelMenu's dropdown-checklist idiom (click button, toggle checkboxes,
 * click outside to close) so the interaction feels consistent with the rest
 * of the app, at zoom-control scale to fit TimelineView's header.
 * ========================================================================== */

export type TimelineLaneKey = "books" | "lifespans" | "biblical" | "world" | "religion";

export const TIMELINE_LANE_ORDER: TimelineLaneKey[] = [
  "books",
  "lifespans",
  "biblical",
  "world",
  "religion",
];

export const TIMELINE_LANE_LABELS: Record<TimelineLaneKey, string> = {
  books: "Books of the Bible",
  lifespans: "Lifespans",
  biblical: "Biblical",
  world: "World History",
  religion: "Other Religions",
};

/** Rough rule of thumb for the caption hint below: at typical viewport heights, this is about how
 * many lanes fill the view with generous room before TimelineView's actual (size-based, not
 * count-based) feasibility check falls back to fixed minimum heights inside a scrollable stack. */
export const TIMELINE_COMFORTABLE_LANE_COUNT = 3;

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
        <span className="tl-lane-menu-count">{visibleCount}/5</span>
      </button>
      {open && (
        <div className="tl-lane-menu-dropdown">
          <p className="tl-lane-menu-title">Show lanes</p>
          {TIMELINE_LANE_ORDER.map((key) => (
            <label key={key} className="tl-lane-menu-item">
              <input type="checkbox" checked={visible[key]} onChange={() => onToggle(key)} />
              {TIMELINE_LANE_LABELS[key]}
            </label>
          ))}
          <p className="tl-lane-menu-caption">
            {visibleCount > TIMELINE_COMFORTABLE_LANE_COUNT
              ? "Checking more lanes may make the stack scroll to fit them all."
              : "Fewer lanes checked means more room for each."}
          </p>
        </div>
      )}
    </div>
  );
}
