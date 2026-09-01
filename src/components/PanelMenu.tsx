import { Fragment, useEffect, useRef, useState } from "react";

export type PanelKey = "map" | "details" | "bible" | "notes" | "friends" | "articles";

interface PanelMenuProps {
  panels: Record<PanelKey, boolean>;
  onToggle: (key: PanelKey) => void;
  /** Pending incoming friend requests — shown as a badge on the Friends row (and the menu button
   * itself) so a new request is noticeable without opening the Friends panel first. */
  friendsBadgeCount?: number;
  /** The panel most recently auto-closed by App's 3-panel LRU cap — named briefly in the caption so
   * a checkbox flipping off on its own reads as "made room," not a misclick or a broken toggle. */
  lastAutoClosed?: { key: PanelKey; nonce: number } | null;
  /** Panels that can't render right now, mapped to the reason (shown as a tooltip). Their rows are
   * dimmed and their checkboxes disabled — opening a panel that would show nothing would only evict
   * a visible one to no effect. */
  disabled?: Partial<Record<PanelKey, string>>;
}

const PANEL_LABELS: Record<PanelKey, string> = {
  bible: "Bible",
  map: "Map",
  // "details" and "articles" are two different doors into the same idea (a place/person/topic
  // write-up): "details" opens with a specific entry already picked (a pin tap, a text link) — so
  // it reads as "Article" (singular, one open entry) — while "articles" is the standalone
  // browse/search destination for everything, hence the plural. Distinct labels keep the two rows
  // from reading as duplicates in this same menu.
  details: "Article",
  notes: "My Notes",
  friends: "Friends",
  articles: "Articles",
};

/** Bible/Map above the rule, the content panels below — the visual split (plus the caption
 * under the list) hints that these aren't free-for-all checkboxes: only 3 panels fit at once,
 * so in practice the lower group trades places while Bible and Map usually stay put. */
const PANEL_GROUPS: PanelKey[][] = [
  ["bible", "map"],
  ["details", "articles", "notes", "friends"],
];

export default function PanelMenu({ panels, onToggle, friendsBadgeCount = 0, lastAutoClosed = null, disabled }: PanelMenuProps) {
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
              {group.map((key) => {
                const disabledReason = disabled?.[key];
                return (
                  <label
                    key={key}
                    className={`panel-menu-item${disabledReason ? " panel-menu-item-disabled" : ""}`}
                    title={disabledReason}
                  >
                    <input
                      type="checkbox"
                      checked={panels[key]}
                      disabled={!!disabledReason}
                      onChange={() => onToggle(key)}
                    />
                    {PANEL_LABELS[key]}
                    {key === "friends" && friendsBadgeCount > 0 && (
                      <span className="panel-menu-item-badge">{friendsBadgeCount}</span>
                    )}
                  </label>
                );
              })}
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
