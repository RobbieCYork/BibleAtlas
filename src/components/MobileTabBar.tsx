import type { PanelKey } from "./PanelMenu";

type FriendsView = "friends" | "messages" | "groups";

interface MobileTabBarProps {
  active: PanelKey;
  /** `view` is only meaningful for the "friends" key — it tells the panel which of its three
   * top-level lists (friend requests/management, 1:1 conversations, or groups) to jump to. */
  onSelect: (key: PanelKey, view?: FriendsView) => void;
  /** Pending incoming friend requests — badges the "Social" tab, so a new request is noticeable
   * before ever opening My Profile (Friends/Messages/Groups are reachable from there). */
  friendsBadgeCount?: number;
  /** Unread 1:1 messages — badges the "Social" tab the same way. */
  messagesBadgeCount?: number;
  /** Unread group messages + pending join requests you can approve — badges the "Social" tab the
   * same way. */
  groupsBadgeCount?: number;
  /** Opens the full-screen My Profile view for a real account (guests, who have no profile page,
   * get the account menu's Settings view instead — see AuthButton's openProfileNonce effect). */
  onOpenProfile: () => void;
  /** The Timeline tab — opens full-screen Timeline mode rather than selecting a panel. Pinned as
   * its own tab (not tucked into "Social") because the timeline is a flagship destination: six
   * slots at 375px still gives each tab a comfortable touch target, above tap-size guidance. */
  onOpenTimeline: () => void;
  /** Whether Timeline mode is currently open, for the tab's active styling. */
  timelineActive: boolean;
  /** The Games tab — same full-screen-takeover pattern as Timeline (multiplayer trivia needs real
   * screen space for video tiles + the buzzer UI, not a squeezed side panel). */
  onOpenGame: () => void;
  gameActive: boolean;
  /** Whether My Profile's full-screen takeover is currently open, or the Friends panel (reachable
   * from inside it) is — either way "Social" reads as the active tab. */
  myProfileActive?: boolean;
  /** Fired whenever the "Social" tab itself is tapped — lets App.tsx leave Timeline/Games mode
   * first, since those sit at the same z-index as My Profile and would otherwise stay on screen
   * over it. */
  onOpenSocial?: () => void;
}

/** No dedicated "Details" tab — a location/person/topic/event's details panel is reached by tapping
 * a hyperlink in the Bible text, a map pin, or a search result, not by navigating to it directly, so
 * it doesn't need its own icon here. App.tsx's setMobileActivePanel("details") still switches to it
 * from any of those entry points; only its bottom-bar button is gone. */
const PINNED_TABS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "bible", label: "Bible", icon: "📖" },
  { key: "map", label: "Map", icon: "🗺️" },
  { key: "notes", label: "Notes", icon: "📝" },
];

/** Index within PINNED_TABS after which the Timeline tab is inserted — Bible, Map, [Timeline],
 * Notes, so Timeline sits right after Map rather than tacked onto the end of the row. */
const TIMELINE_SPLIT_INDEX = 2;

export default function MobileTabBar({
  active,
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
  const isSocialActive = active === "friends" || myProfileActive;
  const totalBadgeCount = friendsBadgeCount + messagesBadgeCount + groupsBadgeCount;

  const renderPinnedTab = (tab: (typeof PINNED_TABS)[number]) => {
    // While Timeline or Games mode is open it is the active destination — the underlying panel's
    // tab shouldn't also read as active.
    const isActive = active === tab.key && !timelineActive && !gameActive;
    return (
      <button
        key={tab.key}
        type="button"
        className={`mobile-tab ${isActive ? "active" : ""}`}
        onClick={() => onSelect(tab.key)}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="mobile-tab-icon" aria-hidden="true">
          {tab.icon}
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
        onClick={onOpenTimeline}
        aria-current={timelineActive ? "page" : undefined}
      >
        <span className="mobile-tab-icon" aria-hidden="true">
          ⏳
        </span>
        <span className="mobile-tab-label">Timeline</span>
      </button>

      {PINNED_TABS.slice(TIMELINE_SPLIT_INDEX).map(renderPinnedTab)}

      <button
        type="button"
        className={`mobile-tab ${isSocialActive ? "active" : ""}`}
        onClick={() => {
          onOpenSocial?.();
          onOpenProfile();
        }}
        aria-label="Social — My Profile, Friends, Groups, and Messages"
        aria-current={isSocialActive ? "page" : undefined}
      >
        <span className="mobile-tab-icon" aria-hidden="true">
          🧑‍🤝‍🧑
          {totalBadgeCount > 0 && <span className="mobile-tab-dot" />}
        </span>
        <span className="mobile-tab-label">Social</span>
      </button>

      <button
        type="button"
        className={`mobile-tab ${gameActive ? "active" : ""}`}
        onClick={onOpenGame}
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
