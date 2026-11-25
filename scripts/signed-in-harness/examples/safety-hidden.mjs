/** Safety & Contact hidden while SOCIAL_CONNECTIONS_ENABLED is off. */
export default async function (h) {
  for (const persona of [null]) {
    await h.goto("/"); await h.sleep(2000);
    const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
    if (phone) { await h.click('[aria-label^="Menu"]'); await h.sleep(300); await h.click({ css: ".mobile-nav-menu-item", text: "My Profile" }); await h.sleep(600); }
    await h.click('[aria-label="Settings and account"]'); await h.sleep(400);
    const acct = await h.evaluate(() => [...document.querySelectorAll(".auth-menu-item")].map((e) => e.innerText.replace(/\s+/g, " ").trim()));
    console.log("  account menu:", JSON.stringify(acct));
    h.assert(acct.length >= 3, "account menu rendered");
    h.assert(!acct.some((i) => /Safety/i.test(i)), "no Safety & Contact row");
    for (const want of ["Settings", "Report a Problem", "Log Out"]) h.assert(acct.some((i) => i.includes(want)), `still has ${want}`);
    h.assert(!(await h.evaluate(() => !!document.querySelector('[aria-label="Safety and contact"]'))), "no safety dialog");
  }
}
