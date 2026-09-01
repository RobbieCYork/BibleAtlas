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

/**
 * Whether a text field currently holds focus — i.e. whether the on-screen keyboard is (about to be)
 * up. Read live off `document.activeElement` rather than tracked with a focusin/focusout boolean:
 * iOS can take focus away without a `focusout` ever firing (the field's popup gets unmounted, the
 * app is backgrounded), and a boolean stuck at `true` would pin the height forever.
 */
function isTextInput(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}
function keyboardMayBeUp(): boolean {
  return isTextInput(document.activeElement);
}

/**
 * The last height measured with no text field focused — the true "keyboard closed" height of the
 * layout viewport, and the value `--app-height` is pinned to while the keyboard is open.
 */
let keyboardClosedHeight: number | null = null;

/**
 * The height the shell should be when nothing is covering the viewport.
 *
 * A BROWSER TAB is the simple case: `visualViewport.height` is the truth, live, including every
 * change as Safari's collapsible URL bar hides and shows. Nothing else here touches that path.
 *
 * STANDALONE is where the phantom chrome lives. An installed home-screen app has no browser toolbar
 * at all, so the WebView is the whole screen — yet WebKit has a long-standing family of bugs where
 * one measurement or another still comes back sized as though a Safari toolbar were eating into the
 * viewport: `visualViewport.height` can report (or get stuck at) the reduced, chrome-visible height,
 * and `window.innerHeight` can hand back a pre-layout or chrome-inclusive value early in startup
 * before it settles. Whichever one is wrong, the symptom is identical — the shell comes up shorter
 * than the screen and leaves a dead band of page background below the bottom tab bar.
 *
 * Rather than bet on a single reading, standalone takes the LARGEST of the three independent
 * measurements. That is sound because in standalone there is nothing to subtract: no chrome, so the
 * true height IS the full window, so any reading smaller than another is the artifact and the
 * largest is the least-wrong. `documentElement.clientHeight` is the third opinion and a genuinely
 * different quantity — the initial containing block, i.e. the layout viewport — so it doesn't share
 * the visual-viewport bug's failure mode. None of the three can exceed the window except while the
 * keyboard is up, which never reaches here: that case is frozen in `setAppHeight` below.
 */
function measureOpenHeight(): number {
  const visual = window.visualViewport?.height ?? 0;
  if (!isStandalone()) return visual || window.innerHeight;
  return Math.max(window.innerHeight, document.documentElement.clientHeight, visual);
}

document.addEventListener("focusin", (e) => {
  if (!isTextInput(e.target)) return;
  // `focusin` fires ahead of the keyboard's viewport resize, so this reading is still the
  // keyboard-closed height — the value the shell is held at for the rest of the keyboard session.
  keyboardClosedHeight = measureOpenHeight();
  setAppHeight();
});

function setAppHeight() {
  // Detection is re-read every time rather than cached: if the display-mode media query hadn't
  // resolved yet at module-evaluation time, this heals on the next measurement instead of leaving
  // the app permanently on the wrong branch (the CSS floor in App.css keys off this class).
  document.documentElement.classList.toggle("standalone-mode", isStandalone());

  const measured = measureOpenHeight();
  // Keyboard up: hold the shell at its keyboard-closed height (see the file header) so the layout
  // doesn't move and the tab bar sits behind the keyboard rather than on top of it.
  //
  // The frozen value is a FLOOR, not an absolute, so it can only ever hold the shell taller than the
  // live measurement — never shorter. That is what releases the freeze when the keyboard closes
  // without the field being blurred (iOS's "Done"/swipe-down dismissal fires no `focusout` at all,
  // and the field keeps focus): the measurement grows back to full, exceeds the frozen value, and
  // wins. It also self-corrects a frozen value that was captured too small — e.g. tapping straight
  // from one field to another, where the second `focusin` measures with the first field's keyboard
  // still on screen. Without the floor either of those would strand the shell short and leave dead
  // space at the bottom. `window.innerHeight` is the fallback when no closed height was ever
  // captured (a rotation cleared it mid-keyboard); the keyboard doesn't shrink the layout viewport
  // under `interactive-widget=resizes-visual`, which makes it the right approximation.
  const height = keyboardMayBeUp()
    ? Math.max(keyboardClosedHeight ?? window.innerHeight, measured)
    : measured;
  keyboardClosedHeight = height;
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
// Coming back from the app switcher / a lock screen is another moment iOS is known to hand back a
// stale height on the first read.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) setAppHeight();
});

/**
 * Startup settle. The very first measurement in a standalone WebView can be taken before iOS has
 * finished laying the window out, and every listener above only fires on a *change* — so a single
 * bad opening reading would otherwise persist untouched for the whole session, which is exactly the
 * dead-band-at-the-bottom symptom. These re-measures cost nothing and give the true height several
 * chances to land.
 */
window.addEventListener("load", setAppHeight);
requestAnimationFrame(setAppHeight);
for (const delay of [50, 250, 800]) setTimeout(setAppHeight, delay);

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
      // A second pass after the keyboard's dismissal animation has fully finished — the 100ms one
      // can still catch a mid-animation height on a slow device.
      setTimeout(setAppHeight, 500);
    }
  },
  true
);
