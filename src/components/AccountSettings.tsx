import { useEffect, useState } from "react";
import { supabase, CHAPTER_READ_RESET_EVENT, type Profile } from "../lib/supabase";
import { useTextSize } from "../lib/textSize";
import { useTheme } from "../lib/theme";
import { MIN_VISIBLE_TABS, MOBILE_TAB_META, MOBILE_TAB_ORDER, useMobileTabs, LOCKED_TAB } from "../lib/mobileTabs";
import { useTabStages } from "../lib/tabFeatures";
import Icon from "./Icon";
import { TestingMarker } from "./FeatureRelease";
import NavBarTestingNotice from "./NavBarTestingNotice";

/** Shared with both the logged-in and logged-out dropdown states — text size is a setting, not an
 * account action, so it lives in this menu but isn't gated on being signed in. */
export function TextSizeControl() {
  const { scale, increase, decrease, canIncrease, canDecrease } = useTextSize();
  return (
    <div className="auth-settings-section">
      <span className="auth-settings-label">Text Size</span>
      <div className="auth-text-size">
        <button type="button" onClick={decrease} disabled={!canDecrease} aria-label="Decrease text size">
          A⁻
        </button>
        <span className="auth-text-size-value">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={increase} disabled={!canIncrease} aria-label="Increase text size">
          A⁺
        </button>
      </div>
    </div>
  );
}

/** Shared with both the logged-in and logged-out dropdown states, same as TextSizeControl — the
 * app's appearance defaults to dark (see lib/theme.tsx) and is a plain local preference, not tied to
 * an account. */
export function AppearanceControl() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="auth-settings-section">
      <span className="auth-settings-label">Theme</span>
      <div className="auth-appearance-toggle">
        <button type="button" className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
          <Icon name="sun" inline /> Light
        </button>
        <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
          <Icon name="moon" inline /> Dark
        </button>
      </div>
    </div>
  );
}

/** Lets a reader choose which of the seven destinations the mobile bottom bar shows. Seven buttons
 * on a 375px phone is a crowded row, and not everyone uses all seven — so each can be switched off
 * and back on here, in the same account-menu Settings view as text size and theme.
 *
 * CALLED "NAVIGATION BAR" TO THE READER, not "tab bar". The owner's word for it, and the accurate
 * one: it is how you get from one part of the app to another. "Tab bar" is a platform term for a
 * control most people have never had to name. The `mobileTabs`/`auth-tabbar-*` identifiers behind
 * it still say "tab" — they are load-bearing across App.tsx, MobileTabBar, MobileNavMenu and ~30
 * CSS rules, and renaming them buys nothing a reader can see.
 *
 * Mobile-only, matching the same 768px breakpoint App uses: desktop navigates via the hamburger
 * PanelMenu and the footer, neither of which this touches. Rendered only when the viewport is
 * actually narrow, so the control never appears as a dead setting on a desktop screen.
 *
 * Two guards, both surfaced rather than silent: Bible has no switch at all (it's the cold-start
 * landing tab and the fallback every other safety path points at), and once the bar is down to
 * MIN_VISIBLE_TABS the remaining switches are disabled with a line of copy saying why. There is no
 * maximum: all seven fit.
 *
 * A destination whose feature stage hides it from this viewer (lib/tabFeatures.ts) never gets a live
 * switch, because it would change nothing on screen. Readers get no row at all; the owner gets the row
 * marked "In Testing" and NavBarTestingNotice below the list. The minimum counts only the buttons that
 * can actually be drawn. */
export function NavBarControl() {
  const { visible, canHide, setTabVisible, resetTabs, isDefault } = useMobileTabs();
  const { isOwner, stageOf, isAvailable, unavailable } = useTabStages();
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia("(max-width: 768px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handleChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  if (!isNarrow) return null;

  const atMinimum = MOBILE_TAB_ORDER.filter((k) => visible[k] && isAvailable(k)).length <= MIN_VISIBLE_TABS;
  const rows = MOBILE_TAB_ORDER.filter((k) => isOwner || isAvailable(k));

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <span className="auth-settings-label">Navigation Bar</span>
      <p className="auth-benefits auth-tabbar-note">
        Choose which buttons appear in the bar at the bottom of the screen. Bible always stays, and at least{" "}
        {MIN_VISIBLE_TABS} buttons are always shown.
      </p>
      <ul className="auth-tabbar-list">
        {rows.map((key) => {
          const on = visible[key];
          const available = isAvailable(key);
          const locked = key === LOCKED_TAB;
          // A visible tab can only be switched off while above the minimum; a hidden one can always
          // be switched back on.
          const disabled = !available || locked || (on && (atMinimum || !canHide(key)));
          return (
            <li key={key} className={`auth-tabbar-row${disabled ? " disabled" : ""}`}>
              {/* `MOBILE_TAB_META[key].icon` is a NAME in the app's icon set ("bible", "map"), not
                  a glyph — it stopped being an emoji when the bar moved to drawn icons. This row
                  was the one consumer left rendering it as text, so every name showed up twice:
                  "bible Bible", "map Map". It draws the icon now, like the bar and the hamburger
                  menu already did. */}
              <span className="auth-tabbar-name">
                <span className="auth-tabbar-icon" aria-hidden="true">
                  <Icon name={MOBILE_TAB_META[key].icon} />
                </span>
                {MOBILE_TAB_META[key].label}
                <TestingMarker show={!!stageOf(key)?.inTesting} />
              </span>
              {!available ? (
                <span className="auth-tabbar-always">In Testing</span>
              ) : locked ? (
                <span className="auth-tabbar-always">Always on</span>
              ) : (
                <label className="auth-tabbar-switch">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={disabled}
                    onChange={(e) => setTabVisible(key, e.target.checked)}
                    aria-label={`Show ${MOBILE_TAB_META[key].label} in the navigation bar`}
                  />
                  <span className="auth-tabbar-track" aria-hidden="true" />
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {isOwner && <NavBarTestingNotice tabs={unavailable} />}
      {atMinimum && (
        <p className="auth-tabbar-limit" role="status">
          That's the minimum of {MIN_VISIBLE_TABS} buttons — turn another one on before hiding any more.
        </p>
      )}
      <button type="button" className="auth-tabbar-reset" onClick={resetTabs} disabled={isDefault}>
        Reset to default
      </button>
    </div>
  );
}

/** Lets an account choose how long a "mark chapter as read" checkmark sticks before it silently stops
 * counting — e.g. reset every year to re-read the Bible on an annual cycle without clearing old marks
 * by hand. Purely a query-time filter (see chapterReadCutoff) — switching back to Never instantly
 * un-hides everything, nothing was ever deleted. */
export function ReadingResetControl({ userId }: { userId: string }) {
  const [reset, setReset] = useState<Profile["chapter_read_reset"]>("never");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("chapter_read_reset")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setReset((data as { chapter_read_reset: Profile["chapter_read_reset"] } | null)?.chapter_read_reset ?? "never");
        setLoaded(true);
      });
  }, [userId]);

  const handleChange = async (value: Profile["chapter_read_reset"]) => {
    setReset(value);
    setSaving(true);
    setSaved(null);
    const { error } = await supabase.from("profiles").update({ chapter_read_reset: value }).eq("id", userId);
    setSaving(false);
    setSaved(error ? "Couldn't save — try again." : "Saved!");
    if (!error) window.dispatchEvent(new Event(CHAPTER_READ_RESET_EVENT));
  };

  if (!loaded) return null;

  return (
    <div className="auth-settings-section auth-settings-section-stacked">
      <span className="auth-settings-label">Reset "Read" Marks</span>
      <p className="auth-benefits">
        Automatically stop counting a chapter as read after this long — handy for reading through the Bible on a
        yearly cycle.
      </p>
      <select value={reset} onChange={(e) => handleChange(e.target.value as Profile["chapter_read_reset"])} disabled={saving}>
        <option value="never">Never</option>
        <option value="monthly">1 month after reading</option>
        <option value="yearly">1 year after reading</option>
      </select>
      {saved && <p className="auth-status">{saved}</p>}
    </div>
  );
}

/** The account Settings content — text size, light/dark theme, navigation bar, read-mark reset, legal links.
 * One copy, rendered in two homes: the full-screen SettingsView (every real account) and the account
 * menu's own Settings view (guests). Both open from the account menu's Settings row. `userId` is null
 * for a guest, who has no reading marks to reset. */
export default function AccountSettingsBody({ userId }: { userId: string | null }) {
  return (
    <>
      <TextSizeControl />
      <AppearanceControl />
      <NavBarControl />
      {userId && (
        <>
          <div className="auth-settings-divider" />
          <ReadingResetControl userId={userId} />
        </>
      )}
      <div className="auth-settings-divider" />
      {/* Static public pages, not app routes — a new tab keeps the reader's place in the app. */}
      <p className="auth-legal-links">
        <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
        <span aria-hidden="true"> · </span>
        <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
      </p>
    </>
  );
}
