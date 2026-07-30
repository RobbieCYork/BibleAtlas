import { useEffect, useRef, useState } from "react";
import type { PanelKey } from "./PanelMenu";

type FriendsView = "friends" | "messages" | "groups";

interface MobileTabBarProps {
  active: PanelKey;
  hasSelection: boolean;
  /** `view` is only meaningful for the "friends" key — it tells the panel which of its three
   * top-level lists (friend requests/management, 1:1 conversations, or groups) to jump to. */
  onSelect: (key: PanelKey, view?: FriendsView) => void;
  /** Pending incoming friend requests — badges the "Social" tab and the Friends row inside it, so a
   * new request is noticeable without opening the sheet (and then the Friends panel) first. */
  friendsBadgeCount?: number;
  /** Unread 1:1 messages — badges the "Social" tab and the Messages row the same way. */
  messagesBadgeCount?: number;
  /** Unread group messages + pending join requests you can approve — badges the "Social" tab and
   * the Groups row. */
  groupsBadgeCount?: number;
  /** "My Profile" in the sheet doesn't select a panel like the others — it pops open the account
   * menu (top-right avatar) straight to Settings instead. */
  onOpenProfile: () => void;
  /** The Timeline tab — opens full-screen Timeline mode rather than selecting a panel. Pinned as
   * its own tab (not tucked into "Social") because the timeline is a flagship destination: seven
   * slots at 375px still gives each tab a comfortable touch target, above tap-size guidance. */
  onOpenTimeline: () => void;
  /** Whether Timeline mode is currently open, for the tab's active styling. */
  timelineActive: boolean;
  /** The Games tab — same full-screen-takeover pattern as Timeline (multiplayer trivia needs real
   * screen space for video tiles + the buzzer UI, not a squeezed side panel). */
  onOpenGame: () => void;
  gameActive: boolean;
  /** Whether My Profile's full-screen takeover is currently open — combined with isOverflowActive
   * below so the Social tab reads as "active" while any of its four destinations (Friends, Messages,
   * Groups, My Profile) is on screen, not just the panel-based three. */
  myProfileActive?: boolean;
  /** Fired whenever the "Social" tab itself is tapped (open or close) — lets App.tsx leave any
   * full-screen takeover (Timeline, My Profile) first, since those sit at a higher z-index than
   * this bar and would otherwise silently swallow the sheet underneath them, making "Social" look
   * completely unresponsive while one of those modes is active. */
  onOpenSocial?: () => void;
}

const PINNED_TABS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "bible", label: "Bible", icon: "📖" },
  { key: "map", label: "Map", icon: "🗺️" },
  { key: "details", label: "Details", icon: "📍" },
  { key: "notes", label: "Notes", icon: "📝" },
];

/** Index within PINNED_TABS after which the Timeline tab is inserted — Bible, Map, [Timeline],
 * Details, Notes, so Timeline sits right after Map rather than tacked onto the end of the row. */
const TIMELINE_SPLIT_INDEX = 2;

/** Panels that don't get their own pinned bottom-bar slot — reachable through the "Social" tab
 * instead, so the bar doesn't have to grow every time a new destination is added. Friends,
 * Messages, and Groups all open the same underlying "friends" panel, just defaulted to a different
 * internal view; "My Profile" (added to the sheet separately below) opens the full-screen profile
 * takeover instead of a panel. */
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
  onOpenTimeline,
  timelineActive,
  onOpenGame,
  gameActive,
  myProfileActive = false,
  onOpenSocial,
}: MobileTabBarProps) {
  const [socialOpen, setSocialOpen] = useState(false);
  const socialRef = useRef<HTMLDivElement | null>(null);
  const isOverflowActive = OVERFLOW_TABS.some((t) => t.key === active) || myProfileActive;
  const totalBadgeCount = friendsBadgeCount + messagesBadgeCount + groupsBadgeCount;

  useEffect(() => {
    if (!socialOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (socialRef.current && !socialRef.current.contains(e.target as Node)) setSocialOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [socialOpen]);

  const badgeFor = (view?: FriendsView) => {
    if (view === "messages") return messagesBadgeCount;
    if (view === "groups") return groupsBadgeCount;
    return friendsBadgeCount;
  };

  const renderPinnedTab = (tab: (typeof PINNED_TABS)[number]) => {
    const showDot = tab.key === "details" && hasSelection && active !== "details";
    // While Timeline or Games mode is open it is the active destination — the underlying panel's
    // tab shouldn't also read as active.
    const isActive = active === tab.key && !timelineActive && !gameActive;
    return (
      <button
        key={tab.key}
        type="button"
        className={`mobile-tab ${isActive ? "active" : ""}`}
        onClick={() => {
          setSocialOpen(false);
          onSelect(tab.key);
        }}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="mobile-tab-icon" aria-hidden="true">
          {tab.icon}
          {showDot && <span className="mobile-tab-dot" />}
        </span>
        <span className="mobile-tab-label">{tab.label}</span>
      </button>
    );
  };

  return (
    <nav className="mobile-tab-bar">
      {PINNED_TABS.slice(0, TIMELINE_SPLIT_INDEX).map(renderPinnedTab)}

      <button
        type="button"
        className={`mobile-tab ${timelineActive ? "active" : ""}`}
        onClick={() => {
          setSocialOpen(false);
          onOpenTimeline();
        }}
        aria-current={timelineActive ? "page" : undefined}
      >
        <span className="mobile-tab-icon" aria-hidden="true">
          ⏳
        </span>
        <span className="mobile-tab-label">Timeline</span>
      </button>

      {PINNED_TABS.slice(TIMELINE_SPLIT_INDEX).map(renderPinnedTab)}


      <div className="mobile-tab-social" ref={socialRef}>
        {socialOpen && (
          <div className="mobile-social-sheet">
            <div className="mobile-social-heading">Social</div>
            {OVERFLOW_TABS.map((tab) => {
              const badgeCount = badgeFor(tab.view);
              return (
                <button
                  key={tab.label}
                  type="button"
                  className={`mobile-social-item ${active === tab.key ? "active" : ""}`}
                  onClick={() => {
                    setSocialOpen(false);
                    onSelect(tab.key, tab.view);
                  }}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                  {badgeCount > 0 && <span className="mobile-social-item-badge">{badgeCount}</span>}
                </button>
              );
            })}
            <button
              type="button"
              className={`mobile-social-item ${myProfileActive ? "active" : ""}`}
              onClick={() => {
                setSocialOpen(false);
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
          onClick={() => {
            onOpenSocial?.();
            setSocialOpen((o) => !o);
          }}
          aria-label="Social — Friends, Messages, Groups, and My Profile"
          aria-expanded={socialOpen}
        >
          <span className="mobile-tab-icon" aria-hidden="true">
            🧑‍🤝‍🧑
            {totalBadgeCount > 0 && <span className="mobile-tab-dot" />}
          </span>
          <span className="mobile-tab-label">Social</span>
        </button>
      </div>

      <button
        type="button"
        className={`mobile-tab ${gameActive ? "active" : ""}`}
        onClick={() => {
          setSocialOpen(false);
          onOpenGame();
        }}
        aria-current={gameActive ? "page" : undefined}
      >
        <span className="mobile-tab-icon" aria-hidden="true">
          🎮
        </span>
        <span className="mobile-tab-label">Games</span>
      </button>
    </nav>
  );
}
