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
function setAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
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
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      setTimeout(setAppHeight, 100);
    }
  },
  true
);
