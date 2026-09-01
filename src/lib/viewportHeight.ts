/**
 * iOS Safari (and standalone home-screen PWAs especially) can leave `100vh`/`100svh` stuck at the
 * on-screen-keyboard-open height after the keyboard is dismissed — the layout viewport doesn't
 * shrink back until something else triggers a reflow. That left a dead gap between the message
 * input and the bottom tab bar after typing in a chat. `visualViewport` reports the true visible
 * height in real time, so we mirror it into a CSS var and size `.app-shell` off that instead.
 *
 * The same stale-height gap shows up the other direction too: Safari's collapsible URL bar/toolbar
 * grows the visible area when it auto-hides (e.g. after a touch-scroll gesture on an inner
 * scrollable panel), and on some iOS versions that transition fires `visualViewport`'s "scroll"
 * event instead of (or before) "resize" — or the event lands a frame late. Left unhandled, `.app-
 * shell` stays sized to the smaller, chrome-visible height, leaving empty space between the real
 * content and the screen's bottom edge (the bottom tab bar included) until something else happens to
 * trigger a re-measure. Listening on "scroll" too, plus orientation changes and bfcache restores
 * (`pageshow`), covers the transitions "resize" alone can miss.
 */
/**
 * Standalone (installed, home-screen-launched) vs. an ordinary browser tab. `display-mode:
 * standalone` is the cross-platform media query; iOS Safari also has an older, iOS-only
 * `navigator.standalone` boolean that predates the media query and is still the more reliable
 * signal on some iOS versions, so both are checked. Neither ever changes for the lifetime of a
 * page (installing/uninstalling reloads the app), so this only needs to be read once.
 */
function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

document.documentElement.classList.toggle("standalone-mode", isStandalone());

/**
 * Tracks whether a text input is currently focused, so `setAppHeight` below can tell a genuine
 * on-screen-keyboard resize apart from the standalone stale-height quirk described there.
 */
let textInputFocused = false;
function isTextInput(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}
document.addEventListener("focusin", (e) => {
  if (isTextInput(e.target)) textInputFocused = true;
});
document.addEventListener("focusout", (e) => {
  if (isTextInput(e.target)) textInputFocused = false;
});

function setAppHeight() {
  // `visualViewport.height` is what lets `.app-shell` shrink to clear an open on-screen keyboard
  // (see the file header), so it stays the source of truth whenever a text field is focused, in
  // both display modes. But standalone home-screen launches have their own well-documented WebKit
  // quirk: `visualViewport.height` can come back (or get stuck, e.g. after returning from an
  // external flow like OAuth) reporting the *reduced*, chrome-visible height as if a Safari
  // toolbar were still eating into the viewport — even though standalone mode has no toolbar at
  // all. In a real browser tab that reduced height is correct and wanted (Safari's own chrome
  // genuinely occupies the rest). In standalone there's nothing there to fill it, so the same
  // number just leaves a dead gap at the bottom of the screen. `window.innerHeight` doesn't carry
  // that toolbar concept and reflects the true full-screen standalone height, so it's used instead
  // whenever no keyboard is in play.
  const height =
    isStandalone() && !textInputFocused
      ? window.innerHeight
      : window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

setAppHeight();
window.visualViewport?.addEventListener("resize", setAppHeight);
window.visualViewport?.addEventListener("scroll", setAppHeight);
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", setAppHeight);
window.addEventListener("pageshow", setAppHeight);

/**
 * Belt-and-suspenders for the keyboard-dismiss case specifically: tapping away from a text input
 * should already trigger one of the viewport events above, but iOS Safari has shipped versions where
 * that event lands late (or not at all) right after the keyboard closes. Re-measuring a beat after
 * every blur of a text field closes that gap without waiting on the viewport events to catch up.
 */
document.addEventListener(
  "focusout",
  (e) => {
    if (isTextInput(e.target)) {
      setTimeout(setAppHeight, 100);
    }
  },
  true
);
