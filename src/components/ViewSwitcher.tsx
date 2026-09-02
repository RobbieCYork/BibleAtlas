import Icon, { type IconName } from "./Icon";
export type FriendsView = "friends" | "messages" | "groups";

/** Rendered at the top of every top-level list (Friends/Messages/Groups) so all three are reachable
 * from within the panel itself, not just the mobile "More" sheet (which is the only way to reach
 * Messages/Groups on desktop otherwise, since desktop has no such sheet). Same button format, size,
 * and layout as the Friends/Groups/Messages quick links on My Profile (.myprofile-social-links) —
 * one shared visual language for "go to Friends/Groups/Messages" wherever it appears. */
export default function ViewSwitcher({
  active,
  onSelectView,
  friendsBadge,
  messagesBadge,
  groupsBadge,
}: {
  active: FriendsView;
  onSelectView?: (view: FriendsView) => void;
  friendsBadge?: number;
  messagesBadge?: number;
  groupsBadge?: number;
}) {
  if (!onSelectView) return null;
  const tabs: { key: FriendsView; icon: IconName; label: string; badge?: number }[] = [
    { key: "friends", icon: "players", label: "Friends", badge: friendsBadge },
    { key: "groups", icon: "groups", label: "Groups", badge: groupsBadge },
    { key: "messages", icon: "messages", label: "Messages", badge: messagesBadge },
  ];
  return (
    <div className="myprofile-social-links">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={active === tab.key ? "myprofile-social-links-active" : ""}
          onClick={() => onSelectView(tab.key)}
        >
          <Icon name={tab.icon} inline /> {tab.label}
          {!!tab.badge && <span className="friends-view-switcher-dot" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
