import { useEffect, useRef, useState } from "react";
import type { PanelKey } from "./PanelMenu";

interface MobileTabBarProps {
  active: PanelKey;
  hasSelection: boolean;
  onSelect: (key: PanelKey) => void;
  /** Pending incoming friend requests — badges the "More" tab and the Friends row inside it, so a
   * new request is noticeable without opening the sheet (and then the Friends panel) first. */
  friendsBadgeCount?: number;
}

const PINNED_TABS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "bible", label: "Bible", icon: "📖" },
  { key: "map", label: "Map", icon: "🗺️" },
  { key: "details", label: "Details", icon: "📍" },
  { key: "notes", label: "Notes", icon: "📝" },
];

/** Panels that don't get their own pinned bottom-bar slot — reachable through the "More" tab
 * instead, so the bar doesn't have to grow every time a new panel is added. */
const OVERFLOW_TABS: { key: PanelKey; label: string; icon: string }[] = [{ key: "friends", label: "Friends", icon: "👥" }];

export default function MobileTabBar({ active, hasSelection, onSelect, friendsBadgeCount = 0 }: MobileTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const isOverflowActive = OVERFLOW_TABS.some((t) => t.key === active);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  return (
    <nav className="mobile-tab-bar">
      {PINNED_TABS.map((tab) => {
        const showDot = tab.key === "details" && hasSelection && active !== "details";
        return (
          <button
            key={tab.key}
            type="button"
            className={`mobile-tab ${active === tab.key ? "active" : ""}`}
            onClick={() => {
              setMoreOpen(false);
              onSelect(tab.key);
            }}
            aria-current={active === tab.key ? "page" : undefined}
          >
            <span className="mobile-tab-icon" aria-hidden="true">
              {tab.icon}
              {showDot && <span className="mobile-tab-dot" />}
            </span>
            <span className="mobile-tab-label">{tab.label}</span>
          </button>
        );
      })}

      <div className="mobile-tab-more" ref={moreRef}>
        {moreOpen && (
          <div className="mobile-more-sheet">
            {OVERFLOW_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`mobile-more-item ${active === tab.key ? "active" : ""}`}
                onClick={() => {
                  setMoreOpen(false);
                  onSelect(tab.key);
                }}
              >
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
                {tab.key === "friends" && friendsBadgeCount > 0 && (
                  <span className="mobile-more-item-badge">{friendsBadgeCount}</span>
                )}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={`mobile-tab ${isOverflowActive ? "active" : ""}`}
          onClick={() => setMoreOpen((o) => !o)}
          aria-label="More panels"
          aria-expanded={moreOpen}
        >
          <span className="mobile-tab-icon" aria-hidden="true">
            ☰
            {friendsBadgeCount > 0 && <span className="mobile-tab-dot" />}
          </span>
          <span className="mobile-tab-label">More</span>
        </button>
      </div>
    </nav>
  );
}
