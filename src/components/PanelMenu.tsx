import { useEffect, useRef, useState } from "react";

export type PanelKey = "map" | "details" | "bible" | "notes" | "friends";

interface PanelMenuProps {
  panels: Record<PanelKey, boolean>;
  onToggle: (key: PanelKey) => void;
  /** Pending incoming friend requests — shown as a badge on the Friends row (and the menu button
   * itself) so a new request is noticeable without opening the Friends panel first. */
  friendsBadgeCount?: number;
}

const PANEL_LABELS: Record<PanelKey, string> = {
  bible: "Bible",
  map: "Map",
  details: "Location Details",
  notes: "My Notes",
  friends: "Friends",
};

const PANEL_ORDER: PanelKey[] = ["bible", "map", "details", "notes", "friends"];

export default function PanelMenu({ panels, onToggle, friendsBadgeCount = 0 }: PanelMenuProps) {
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
    <div className="panel-menu" ref={containerRef}>
      <button
        type="button"
        className="panel-menu-button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Show or hide panels"
      >
        ☰
        {friendsBadgeCount > 0 && <span className="panel-menu-badge" aria-hidden="true" />}
      </button>
      {open && (
        <div className="panel-menu-dropdown">
          {PANEL_ORDER.map((key) => (
            <label key={key} className="panel-menu-item">
              <input type="checkbox" checked={panels[key]} onChange={() => onToggle(key)} />
              {PANEL_LABELS[key]}
              {key === "friends" && friendsBadgeCount > 0 && (
                <span className="panel-menu-item-badge">{friendsBadgeCount}</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
