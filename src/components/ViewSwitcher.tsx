export type FriendsView = "friends" | "messages" | "groups";

/** Rendered at the top of every top-level list (Friends/Messages/Groups) so all three are reachable
 * from within the panel itself, not just the mobile "More" sheet (which is the only way to reach
 * Messages/Groups on desktop otherwise, since desktop has no such sheet). */
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
  const tabs: { key: FriendsView; label: string; badge?: number }[] = [
    { key: "friends", label: "Friends", badge: friendsBadge },
    { key: "messages", label: "Messages", badge: messagesBadge },
    { key: "groups", label: "Groups", badge: groupsBadge },
  ];
  return (
    <div className="friends-view-switcher">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={active === tab.key ? "active" : ""}
          onClick={() => onSelectView(tab.key)}
        >
          {tab.label}
          {!!tab.badge && <span className="friends-view-switcher-badge">{tab.badge}</span>}
        </button>
      ))}
    </div>
  );
}
