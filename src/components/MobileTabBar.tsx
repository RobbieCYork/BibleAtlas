import type { PanelKey } from "./PanelMenu";
import Icon from "./Icon";
import { MOBILE_TAB_META, useMobileTabs, type MobileTabKey } from "../lib/mobileTabs";

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
  /** The Timeline tab — opens full-screen Timeline mode rather than selecting a panel. */
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

/** Tab bar keys that simply select one of the single-panel destinations, mapped to the PanelKey the
 * panel itself is registered under. The other three keys are special: "timeline" and "games" open
 * full-screen takeovers, and "social" opens My Profile. */
const PANEL_TAB_KEYS: Partial<Record<MobileTabKey, PanelKey>> = {
  bible: "bible",
  map: "map",
  notes: "notes",
  articles: "articles",
};

/** No dedicated "Article" tab — a location/person/topic/event's write-up isn't a destination of its
 * own, it's what the Articles tab shows once something is selected (App.tsx's enterMobileArticle
 * switches here from a Bible-text hyperlink, a map pin, or a search result; Back returns to whichever
 * tab the reader came from). The Articles tab with nothing selected is the browse/search list.
 *
 * Which of the seven tabs actually render is the reader's choice (Settings → Tab Bar, see
 * lib/mobileTabs.tsx). Order is fixed: hidden tabs are omitted in place, never rearranged, and the
 * remaining tabs re-share the row automatically via `.mobile-tab { flex: 1 }`. */
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
  const { visibleTabs } = useMobileTabs();
  const isSocialActive = active === "friends" || myProfileActive;
  const totalBadgeCount = friendsBadgeCount + messagesBadgeCount + groupsBadgeCount;

  const renderTab = (key: MobileTabKey) => {
    const { label, icon } = MOBILE_TAB_META[key];
    const panelKey = PANEL_TAB_KEYS[key];

    // While Timeline or Games mode is open it is the active destination — the underlying panel's
    // tab shouldn't also read as active.
    const isActive =
      key === "timeline"
        ? timelineActive
        : key === "games"
          ? gameActive
          : key === "social"
            ? isSocialActive
            : panelKey !== undefined && active === panelKey && !timelineActive && !gameActive;

    const handleClick =
      key === "timeline"
        ? onOpenTimeline
        : key === "games"
          ? onOpenGame
          : key === "social"
            ? () => {
                onOpenSocial?.();
                onOpenProfile();
              }
            : () => panelKey && onSelect(panelKey);

    return (
      <button
        key={key}
        type="button"
        className={`mobile-tab ${isActive ? "active" : ""}`}
        onClick={handleClick}
        aria-label={key === "social" ? "Social — My Profile, Friends, Groups, and Messages" : undefined}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="mobile-tab-icon" aria-hidden="true">
          <Icon name={icon} />
          {key === "social" && totalBadgeCount > 0 && <span className="mobile-tab-dot" />}
        </span>
        <span className="mobile-tab-label">{label}</span>
      </button>
    );
  };

  return <nav className="mobile-tab-bar">{visibleTabs.map(renderTab)}</nav>;
}
