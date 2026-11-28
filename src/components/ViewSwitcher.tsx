import Icon, { type IconName } from "./Icon";

/** The lists reachable from the Social panel.
 *
 * "church" joined this union with Capstone for Churches and is the one entry that is NOT always
 * offered: sql/033 is not applied to production yet, and until it is, `useChurchesAvailable()` is
 * false and `showChurch` stays off, so the tab is simply absent rather than present-and-broken.
 * See src/lib/churchApi.ts. */
export type FriendsView = "friends" | "messages" | "groups" | "church";

/** The Friends / Groups / Messages buttons: My Profile's quick links and the switcher at the top of
 * every top-level social list are this one component, so they always look the same. My Profile
 * passes no `active`, because nothing is selected there. */
export default function ViewSwitcher({
  active,
  onSelectView,
  friendsBadge,
  messagesBadge,
  groupsBadge,
  showChurch = false,
}: {
  active?: FriendsView;
  onSelectView?: (view: FriendsView) => void;
  friendsBadge?: number;
  messagesBadge?: number;
  groupsBadge?: number;
  /** Adds the Church tab. False (the default) while sql/033 is unapplied — see the FriendsView
   * note above. Every caller passes the same answer, from one cached probe. */
  showChurch?: boolean;
}) {
  if (!onSelectView) return null;
  const tabs: { key: FriendsView; icon: IconName; label: string; badge?: number }[] = [
    { key: "friends", icon: "players", label: "Friends", badge: friendsBadge },
    { key: "groups", icon: "groups", label: "Groups", badge: groupsBadge },
    { key: "messages", icon: "messages", label: "Messages", badge: messagesBadge },
    ...(showChurch ? [{ key: "church" as const, icon: "church" as IconName, label: "Church" }] : []),
  ];
  return (
    <div className="social-switcher">
      <div className="myprofile-social-links" data-count={tabs.length}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={active === tab.key ? "myprofile-social-links-active" : undefined}
            aria-current={active === tab.key ? "page" : undefined}
            onClick={() => onSelectView(tab.key)}
          >
            <Icon name={tab.icon} inline />
            <span>{tab.label}</span>
            {!!tab.badge && <span className="friends-view-switcher-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
