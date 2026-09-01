import { Fragment, useEffect, useRef, useState } from "react";

/** The panel slots the layout can show. There is deliberately no separate "details" slot: a single
 * article (a place/person/topic/POI/timeline event) is a *state* of the Articles panel, not a panel
 * of its own — see App.tsx's `showArticle`. */
export type PanelKey = "map" | "bible" | "notes" | "friends" | "articles";

interface PanelMenuProps {
  panels: Record<PanelKey, boolean>;
  onToggle: (key: PanelKey) => void;
  /** Pending incoming friend requests — shown as a badge on the Social row (and the menu button
   * itself) so a new request is noticeable without opening the Social panel first. */
  friendsBadgeCount?: number;
  /** The panel most recently auto-closed by App's 3-panel LRU cap — named briefly in the caption so
   * a checkbox flipping off on its own reads as "made room," not a misclick or a broken toggle. */
  lastAutoClosed?: { key: PanelKey; nonce: number } | null;
}

const PANEL_LABELS: Record<PanelKey, string> = {
  bible: "Bible",
  map: "Map",
  notes: "My Notes",
  // Labelled "Social" (not "Friends") to match the mobile tab bar's name for this same destination —
  // one name for one place on both platforms. The `friends` key itself stays as-is: it's the
  // PanelKey/localStorage identity, not copy. Friends/Groups/Messages remain the names of the three
  // lists *inside* the destination.
  friends: "Social",
  // One row for the whole article destination — it opens the browse/search list, and shows a single
  // article in that same slot once one is picked (map pin, in-text link, or a row in the list). It
  // used to be two rows ("Article", greyed out until something was selected, plus "Articles"), which
  // read as a duplicate with one half permanently unavailable.
  articles: "Articles",
};

/** Bible/Map above the rule, the content panels below — the visual split (plus the caption
 * under the list) hints that these aren't free-for-all checkboxes: only 3 panels fit at once,
 * so in practice the lower group trades places while Bible and Map usually stay put. */
const PANEL_GROUPS: PanelKey[][] = [
  ["bible", "map"],
  ["articles", "notes", "friends"],
];

export default function PanelMenu({ panels, onToggle, friendsBadgeCount = 0, lastAutoClosed = null }: PanelMenuProps) {
  const [open, setOpen] = useState(false);
  // Swaps the caption to name the auto-closed panel for a few seconds, then falls back to the
  // standing "up to 3 panels" hint. Re-runs per nonce so back-to-back evictions restart the timer.
  const [showAutoClosed, setShowAutoClosed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lastAutoClosed) return;
    setShowAutoClosed(true);
    const timer = setTimeout(() => setShowAutoClosed(false), 4000);
    return () => clearTimeout(timer);
  }, [lastAutoClosed]);

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
          {PANEL_GROUPS.map((group, groupIndex) => (
            <Fragment key={groupIndex}>
              {groupIndex > 0 && <div className="panel-menu-separator" role="separator" />}
              {group.map((key) => (
                <label key={key} className="panel-menu-item">
                  <input type="checkbox" checked={panels[key]} onChange={() => onToggle(key)} />
                  {PANEL_LABELS[key]}
                  {key === "friends" && friendsBadgeCount > 0 && (
                    <span className="panel-menu-item-badge">{friendsBadgeCount}</span>
                  )}
                </label>
              ))}
            </Fragment>
          ))}
          <p className="panel-menu-caption" aria-live="polite">
            {showAutoClosed && lastAutoClosed
              ? `${PANEL_LABELS[lastAutoClosed.key]} closed to make room`
              : "Up to 3 panels can be open at once"}
          </p>
        </div>
      )}
    </div>
  );
}
