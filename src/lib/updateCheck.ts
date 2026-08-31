/**
 * There's no service worker in this app, but it's installed as a standalone PWA on
 * phone home screens. iOS and Android keep that standalone web view's process alive
 * across app switches rather than doing a fresh page load each time it's foregrounded,
 * so a new deployment can otherwise go unnoticed until the OS decides to relaunch the
 * process (sometimes not until a second relaunch).
 *
 * This checks a small, always-uncached version.json whenever the app comes back into
 * the foreground (or once shortly after startup) and force-reloads if a newer build is
 * live, so an update shows up the next time someone opens the app instead of a launch
 * or two later.
 */

let checking = false;

async function checkForUpdate(): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { buildId } = (await res.json()) as { buildId?: string };
    if (buildId && buildId !== __BUILD_ID__) {
      window.location.reload();
    }
  } catch {
    // Offline or request failed — nothing to do, try again next time we're foregrounded.
  } finally {
    checking = false;
  }
}

export function startUpdateChecks(): void {
  // Shortly after startup (covers the case where the tab/app was left open across a
  // deploy without ever being backgrounded).
  window.setTimeout(checkForUpdate, 5000);

  // Whenever the app is brought back to the foreground — this is the case that matters
  // most for the installed home-screen app.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  window.addEventListener('pageshow', checkForUpdate);
  window.addEventListener('focus', checkForUpdate);
}
