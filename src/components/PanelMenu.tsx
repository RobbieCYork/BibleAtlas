import { Fragment, useEffect, useId, useRef, useState } from "react";

/** The panel slots the layout can show. There is deliberately no separate "details" slot: a single
 * article (a place/person/topic/POI/timeline event) is a *state* of the Articles panel, not a panel
 * of its own — see App.tsx's `showArticle`. */
export type PanelKey = "map" | "bible" | "notes" | "friends" | "articles";

/** The full-area takeovers this menu can navigate to. Not PanelKeys, and deliberately not modelled
 * as such: `showTimeline`/`showGame` in App.tsx render outside the panel system, cover the whole
 * work area, and are mutually exclusive with each other (and with My Profile). */
export type DestinationKey = "timeline" | "games";

interface PanelMenuProps {
  panels: Record<PanelKey, boolean>;
  onToggle: (key: PanelKey) => void;
  /** Pending incoming friend requests — shown as a badge on the Social row (and the menu button
   * itself) so a new request is noticeable without opening the Social panel first. */
  friendsBadgeCount?: number;
  /** The panel most recently auto-closed by App's 3-panel LRU cap — named briefly in the caption so
   * a checkbox flipping off on its own reads as "made room," not a misclick or a broken toggle. */
  lastAutoClosed?: { key: PanelKey; nonce: number } | null;
  /** Which takeover is on screen right now, or null when the panels are. */
  activeDestination?: DestinationKey | null;
  /** Go to a takeover. App owns the routing (it has to leave whichever other takeover is up first). */
  onNavigate?: (key: DestinationKey) => void;
  /** Leave the current takeover and return to the panels — what picking the already-open
   * destination does, mirroring the old footer strip's "click the active one again to close". */
  onLeaveDestination?: () => void;
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

/** Icons match the mobile tab bar / MobileNavMenu for these same two destinations
 * (lib/mobileTabs.tsx) so one place keeps one face on both platforms. */
const DESTINATIONS: { key: DestinationKey; label: string; icon: string; blurb: string }[] = [
  { key: "timeline", label: "Timeline", icon: "⌛", blurb: "Biblical & world history" },
  { key: "games", label: "Games", icon: "🎮", blurb: "Live trivia with friends" },
];

/** The desktop header's hamburger.
 *
 * It carries two genuinely different kinds of entry, and says so rather than flattening them:
 *
 *  - **Panels** are checkboxes. Multi-select, capped at three, order-independent — "show me Bible
 *    and Map at once". They keep their existing behaviour and their cap caption verbatim.
 *  - **Go to** rows are buttons, not checkboxes. Timeline and Games are full-area takeovers
 *    (App.tsx's `showTimeline`/`showGame`), single-select, mutually exclusive, and they cover the
 *    panels rather than joining them. You don't have Timeline open *alongside* Bible — you go to
 *    it. A checkbox would promise a fourth simultaneous panel that cannot exist.
 *
 * So they sit in a separate labelled group below a rule, with a leading icon, a one-line blurb
 * carried over from the footer strip these rows replace, and a trailing "→" that reads as travel.
 * The one on screen is marked `aria-current="page"` and picking it again returns to the panels.
 */
export default function PanelMenu({
  panels,
  onToggle,
  friendsBadgeCount = 0,
  lastAutoClosed = null,
  activeDestination = null,
  onNavigate,
  onLeaveDestination,
}: PanelMenuProps) {
  const [open, setOpen] = useState(false);
  // Swaps the caption to name the auto-closed panel for a few seconds, then falls back to the
  // standing "up to 3 panels" hint. Re-runs per nonce so back-to-back evictions restart the timer.
  const [showAutoClosed, setShowAutoClosed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

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
    // Escape closes and hands focus back to the trigger, so keyboard users aren't left with the
    // cursor parked inside a dropdown that has just unmounted.
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selectDestination = (key: DestinationKey) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (key === activeDestination) onLeaveDestination?.();
    else onNavigate?.(key);
  };

  return (
    <div className="panel-menu" ref={containerRef}>
      <button
        type="button"
        ref={buttonRef}
        className="panel-menu-button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu — show or hide panels, or go to Timeline or Games"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
      >
        ☰
        {friendsBadgeCount > 0 && <span className="panel-menu-badge" aria-hidden="true" />}
      </button>
      {open && (
        <div className="panel-menu-dropdown" id={menuId}>
          <div className="panel-menu-group" role="group" aria-label="Panels">
            <p className="panel-menu-heading">Panels</p>
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
          <div className="panel-menu-separator panel-menu-separator-strong" role="separator" />
          <div className="panel-menu-group" role="group" aria-label="Go to">
            <p className="panel-menu-heading">Go to</p>
            {DESTINATIONS.map(({ key, label, icon, blurb }) => {
              const isCurrent = key === activeDestination;
              return (
                <button
                  key={key}
                  type="button"
                  className={`panel-menu-link${isCurrent ? " active" : ""}`}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={isCurrent ? `${label} — on screen now; return to panels` : undefined}
                  onClick={() => selectDestination(key)}
                >
                  <span className="panel-menu-link-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="panel-menu-link-text">
                    <span className="panel-menu-link-label">{label}</span>
                    <span className="panel-menu-link-blurb">{isCurrent ? "On screen — return to panels" : blurb}</span>
                  </span>
                  <span className="panel-menu-link-go" aria-hidden="true">
                    {isCurrent ? "✓" : "→"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
