import { setTestView } from "../lib/features";
import { MOBILE_TAB_META, type MobileTabKey } from "../lib/mobileTabs";

/** Owner only, under the Navigation Bar switches: says why a destination in Testing is missing from the
 * bar and the menu, and offers the way to see it. "Switch to Test view" is the same per-device
 * preference as the Admin Console's Live / Test switch; it changes nothing for anyone else. Making a
 * feature Live for everyone stays in the Admin Console. */
export default function NavBarTestingNotice({ tabs }: { tabs: MobileTabKey[] }) {
  if (tabs.length === 0) return null;
  const names = tabs.map((k) => MOBILE_TAB_META[k].label).join(" and ");
  const one = tabs.length === 1;
  return (
    <div className="auth-tabbar-testing" role="status">
      <p>
        <strong>
          {names} {one ? "is" : "are"} in Testing,
        </strong>{" "}
        so {one ? "it is" : "they are"} hidden from the bar and the menu in Live view, and from everyone else. To turn{" "}
        {one ? "it" : "them"} on for everyone, open Admin Console, then Features.
      </p>
      <button type="button" className="auth-tabbar-reset" onClick={() => setTestView(true)}>
        Switch to Test view
      </button>
    </div>
  );
}
