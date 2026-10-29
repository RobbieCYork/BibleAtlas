/** Small, app-specific helpers shared by the worked examples. Selectors live here so one rename is one edit. */
export const MENU_BUTTON = '[aria-label^="Menu"]'; // desktop PanelMenu and mobile MobileNavMenu both start "Menu"

/** Open the account menu -> Admin Console. Returns false if the menu has no such entry (not an admin). */
export async function openAdminConsole(h) {
  await h.click('[aria-label="Settings and account"]');
  await h.sleep(300);
  if (!(await h.exists("text=Admin Console"))) return false;
  await h.click("text=Admin Console");
  await h.waitFor('[role=tablist][aria-label="Admin sections"]');
  return true;
}

export const adminTabs = (h) =>
  h.evaluate(() => [...document.querySelectorAll('[aria-label="Admin sections"] [role=tab]')].map((t) => t.innerText.trim()));

/** Open the main navigation menu and read its "Go to" destinations: [{label, marker}]. Works at both widths. */
export async function readGoToMenu(h) {
  await h.click(MENU_BUTTON);
  await h.sleep(300);
  const rows = await h.evaluate(() => {
    const desktop = [...document.querySelectorAll(".panel-menu-link")];
    const mobile = [...document.querySelectorAll(".mobile-nav-menu-item")];
    return [...desktop, ...mobile].map((el) => ({
      label: (el.querySelector(".panel-menu-link-label, .mobile-nav-menu-label") ?? el).childNodes[0]?.textContent?.trim() ?? "",
      marker: !!el.querySelector(".release-testing-marker"),
    }));
  });
  await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  return rows;
}

/** The Testing/Live owner strip at the top of the app, if it is drawn. */
export const testStripText = (h) => h.evaluate(() => document.querySelector(".release-test-strip")?.innerText.trim() ?? null);

/** Open the Articles panel (tab bar on a phone, Menu checkbox on desktop) and open one article by searching for it. */
export async function openArticle(h, name) {
  const isPhone = (await h.evaluate(() => window.innerWidth)) <= 768;
  if (isPhone) {
    await h.click({ css: ".mobile-tab", text: "Articles" });
  } else {
    await h.click(MENU_BUTTON);
    await h.click({ css: ".panel-menu-item", text: "Articles" });
    await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  }
  await h.type(".articles-search input", name);
  await h.click({ css: ".articles-result-row", text: name });
  await h.waitFor(".article-head");
}
