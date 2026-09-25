import Icon, { type IconName } from "./Icon";

/** The lists reachable from the Social panel.
 *
 * "church" joined this union with Capstone for Churches and is the one entry that is NOT always
 * offered: sql/033 is not applied to production yet, and until it is, `useChurchesAvailable()` is
 * false and `showChurch` stays off, so the tab is simply absent rather than present-and-broken.
 * See src/lib/churchApi.ts. */
export type FriendsView = "friends" | "messages" | "groups" | "church";

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
  showChurch = false,
}: {
  active: FriendsView;
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
