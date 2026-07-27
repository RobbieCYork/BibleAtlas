/**
 * iOS Safari (and standalone home-screen PWAs especially) can leave `100vh`/`100svh` stuck at the
 * on-screen-keyboard-open height after the keyboard is dismissed — the layout viewport doesn't
 * shrink back until something else triggers a reflow. That left a dead gap between the message
 * input and the bottom tab bar after typing in a chat. `visualViewport` reports the true visible
 * height in real time, so we mirror it into a CSS var and size `.app-shell` off that instead.
 */
function setAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

setAppHeight();
window.visualViewport?.addEventListener("resize", setAppHeight);
window.addEventListener("resize", setAppHeight);
