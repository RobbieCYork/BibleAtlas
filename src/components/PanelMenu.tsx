import { useEffect, useRef, useState } from "react";

export type PanelKey = "map" | "details" | "bible";

interface PanelMenuProps {
  panels: Record<PanelKey, boolean>;
  onToggle: (key: PanelKey) => void;
}

const PANEL_LABELS: Record<PanelKey, string> = {
  bible: "Bible",
  map: "Map",
  details: "Location Details",
};

const PANEL_ORDER: PanelKey[] = ["bible", "map", "details"];

export default function PanelMenu({ panels, onToggle }: PanelMenuProps) {
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
      </button>
      {open && (
        <div className="panel-menu-dropdown">
          {PANEL_ORDER.map((key) => (
            <label key={key} className="panel-menu-item">
              <input type="checkbox" checked={panels[key]} onChange={() => onToggle(key)} />
              {PANEL_LABELS[key]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
