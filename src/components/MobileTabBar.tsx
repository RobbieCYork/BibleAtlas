import { useEffect, useRef, useState } from "react";
import type { PanelKey } from "./PanelMenu";

type FriendsView = "friends" | "messages" | "groups";

interface MobileTabBarProps {
  active: PanelKey;
  hasSelection: boolean;
  /** `view` is only meaningful for the "friends" key — it tells the panel which of its three
   * top-level lists (friend requests/management, 1:1 conversations, or groups) to jump to. */
  onSelect: (key: PanelKey, view?: FriendsView) => void;
  /** Pending incoming friend requests — badges the "More" tab and the Friends row inside it, so a
   * new request is noticeable without opening the sheet (and then the Friends panel) first. */
  friendsBadgeCount?: number;
  /** Unread 1:1 messages — badges the "More" tab and the Messages row the same way. */
  messagesBadgeCount?: number;
  /** Unread group messages + pending join requests you can approve — badges the "More" tab and the
   * Groups row. */
  groupsBadgeCount?: number;
  /** "My Profile" in the sheet doesn't select a panel like the others — it pops open the account
   * menu (top-right avatar) straight to Settings instead. */
  onOpenProfile: () => void;
  /** "Reading Plans" in the sheet, same shape as onOpenProfile above — switches to the Bible tab
   * and pops it straight to the Reading Plans view (see BiblePanel's openReadingPlansRequest). */
  onOpenReadingPlans: () => void;
}

const PINNED_TABS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "bible", label: "Bible", icon: "📖" },
  { key: "map", label: "Map", icon: "🗺️" },
  { key: "details", label: "Details", icon: "📍" },
  { key: "notes", label: "Notes", icon: "📝" },
];

/** Panels that don't get their own pinned bottom-bar slot — reachable through the "More" tab
 * instead, so the bar doesn't have to grow every time a new panel is added. Friends, Messages, and
 * Groups all open the same underlying "friends" panel, just defaulted to a different internal view. */
const OVERFLOW_TABS: { key: PanelKey; view?: FriendsView; label: string; icon: string }[] = [
  { key: "friends", view: "friends", label: "Friends", icon: "👥" },
  { key: "friends", view: "messages", label: "Messages", icon: "💬" },
  { key: "friends", view: "groups", label: "Groups", icon: "👪" },
];

export default function MobileTabBar({
  active,
  hasSelection,
  onSelect,
  friendsBadgeCount = 0,
  messagesBadgeCount = 0,
  groupsBadgeCount = 0,
  onOpenProfile,
  onOpenReadingPlans,
}: MobileTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const isOverflowActive = OVERFLOW_TABS.some((t) => t.key === active);
  const totalBadgeCount = friendsBadgeCount + messagesBadgeCount + groupsBadgeCount;

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  const badgeFor = (view?: FriendsView) => {
    if (view === "messages") return messagesBadgeCount;
    if (view === "groups") return groupsBadgeCount;
    return friendsBadgeCount;
  };

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
            {OVERFLOW_TABS.map((tab) => {
              const badgeCount = badgeFor(tab.view);
              return (
                <button
                  key={tab.label}
                  type="button"
                  className={`mobile-more-item ${active === tab.key ? "active" : ""}`}
                  onClick={() => {
                    setMoreOpen(false);
                    onSelect(tab.key, tab.view);
                  }}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                  {badgeCount > 0 && <span className="mobile-more-item-badge">{badgeCount}</span>}
                </button>
              );
            })}
            <button
              type="button"
              className="mobile-more-item"
              onClick={() => {
                setMoreOpen(false);
                onOpenReadingPlans();
              }}
            >
              <span aria-hidden="true">🗓️</span>
              Reading Plans
            </button>
            <button
              type="button"
              className="mobile-more-item"
              onClick={() => {
                setMoreOpen(false);
                onOpenProfile();
              }}
            >
              <span aria-hidden="true">👤</span>
              My Profile
            </button>
          </div>
        )}
        <button
          type="button"
          className={`mobile-tab ${isOverflowActive ? "active" : ""}`}
          onClick={() => setMoreOpen((o) => !o)}
          aria-label="More panels"
          aria-expanded={moreOpen}
        >
          <span className="mobile-tab-icon mobile-tab-icon-more" aria-hidden="true">
            ☰
            {totalBadgeCount > 0 && <span className="mobile-tab-dot" />}
          </span>
          <span className="mobile-tab-label">More</span>
        </button>
      </div>
    </nav>
  );
}
