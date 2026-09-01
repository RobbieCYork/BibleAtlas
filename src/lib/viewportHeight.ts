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
 *
 * One case is deliberately excluded from all of the above: while the on-screen keyboard is open.
 * The shell must NOT shrink to the keyboard-reduced `visualViewport.height`, because iOS applies its
 * own correction at the same moment — it shifts the visual viewport up (`visualViewport.offsetTop`
 * grows) to bring the focused field into view. Shrinking the layout on top of that native shift is a
 * double correction: the field is already clear of the keyboard because the shell shrank, so the
 * extra shift drags the top of the app (header, and whatever field sits near it) off the top of the
 * screen, and the bottom tab bar — the last flex child of the shrunken shell — comes to rest sitting
 * directly on top of the keyboard instead of behind it. So `--app-height` is frozen at its last
 * keyboard-closed value for as long as a text field is focused: the layout doesn't move, the tab bar
 * stays anchored to the bottom of the (unchanged) layout viewport behind the keyboard, and the only
 * thing that moves is the browser's own scroll-into-view. `interactive-widget=resizes-visual` in
 * index.html's viewport meta is the standardized declaration of the same intent, so engines that
 * would otherwise shrink the *layout* viewport for the keyboard (Chrome/Android) behave the same way.
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
 * Tracks whether a text input is currently focused — i.e. whether the on-screen keyboard is (about
 * to be) up. `setAppHeight` freezes the height for exactly that window.
 */
let textInputFocused = false;
function isTextInput(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

/**
 * The last height measured with no text field focused — the true "keyboard closed" height of the
 * layout viewport, and the value `--app-height` is pinned to while the keyboard is open.
 */
let keyboardClosedHeight: number | null = null;

/**
 * The height the shell should be when nothing is covering the viewport.
 *
 * Standalone home-screen launches have a well-documented WebKit quirk: `visualViewport.height` can
 * come back (or get stuck, e.g. after returning from an external flow like OAuth) reporting the
 * *reduced*, chrome-visible height as if a Safari toolbar were still eating into the viewport — even
 * though standalone mode has no toolbar at all. In a real browser tab that reduced height is correct
 * and wanted (Safari's own chrome genuinely occupies the rest, and it changes live as the collapsible
 * URL bar hides/shows). In standalone there's nothing there to fill it, so the same number just leaves
 * a dead gap at the bottom of the screen. `window.innerHeight` doesn't carry that toolbar concept and
 * reflects the true full-screen standalone height, so it's used there instead.
 */
function measureOpenHeight(): number {
  return isStandalone()
    ? window.innerHeight
    : window.visualViewport?.height ?? window.innerHeight;
}

document.addEventListener("focusin", (e) => {
  if (!isTextInput(e.target)) return;
  // Capture *before* flipping the flag: focusin fires ahead of the keyboard's viewport resize, so
  // right now the viewport is still at its keyboard-closed size. This also self-heals if the last
  // stored value went stale (rotation, tab restore) between keyboard sessions.
  keyboardClosedHeight = measureOpenHeight();
  textInputFocused = true;
  setAppHeight();
});
document.addEventListener("focusout", (e) => {
  if (isTextInput(e.target)) textInputFocused = false;
});

function setAppHeight() {
  // Keyboard up: hold the shell at its keyboard-closed height (see the file header) so the layout
  // doesn't move and the tab bar sits behind the keyboard rather than on top of it. The
  // `window.innerHeight` fallback only applies if we somehow never captured a closed height (e.g. a
  // rotation cleared it mid-keyboard); on iOS the layout viewport — and so `innerHeight` — is not
  // shrunk by the keyboard, which makes it the right approximation there.
  const height =
    textInputFocused
      ? keyboardClosedHeight ?? window.innerHeight
      : (keyboardClosedHeight = measureOpenHeight());
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

setAppHeight();
window.visualViewport?.addEventListener("resize", setAppHeight);
window.visualViewport?.addEventListener("scroll", setAppHeight);
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", () => {
  // A portrait height is meaningless in landscape, so a frozen value must not survive a rotation.
  keyboardClosedHeight = null;
  setAppHeight();
  // iOS reports the new dimensions a beat after the event fires.
  setTimeout(setAppHeight, 300);
});
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
