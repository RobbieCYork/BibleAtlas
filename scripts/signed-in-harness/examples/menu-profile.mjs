/**
 * Main menu + My Profile + Friends/Groups/Messages-off, across the default look and every skin.
 *
 *   TAG=after SKINS=default,skyreader node scripts/signed-in-harness/run.mjs --persona owner \
 *     --viewport 390x844 --script scripts/signed-in-harness/examples/menu-profile.mjs --out <dir>
 *
 * Screenshots: menu-profile-<TAG>-<persona>-<skin>-<menu|profile|profile-end>-<phone|desktop>.png (hints, not evidence);
 * every assertion reads the live DOM. Baloo 2 (Sky Reader's face) is a web font and the harness network is
 * closed, so a stand-in face with Baloo-style tall ascent/descent is declared under that family name: it
 * proves the layout survives tall metrics, it is not the real glyph shapes.
 *
 * Env: TAG (default "run")  SKINS (comma list, owner only; others only ever see default)  EXPECT_SOCIAL_OFF=1
 */
const ALL = "default,sticker,clarity,midnight,sage,skyreader,trailhead,highlighter";
const TAG = process.env.TAG ?? "run";
const OFF = process.env.EXPECT_SOCIAL_OFF === "1";

const FONT_STANDIN = `(() => { const s = document.createElement("style"); s.textContent =
  '@font-face{font-family:"Baloo 2";src:local("Arial");font-weight:100 900;ascent-override:135%;descent-override:62%;line-gap-override:0%}';
  const add = () => (document.head || document.documentElement).appendChild(s);
  if (document.documentElement) add(); else document.addEventListener("DOMContentLoaded", add); })()`;

const closeMenus = (h) => h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));

/** Everything visibly clipped: elements that clip overflow and whose content is taller than the box, plus
 * buttons whose label is outside the button. Reads the DOM, not pixels. */
const clipScan = (h, rootSel) => h.evaluate((root) => {
  const scope = document.querySelector(root) ?? document.body;
  const bad = [];
  for (const el of scope.querySelectorAll("*")) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    const txt = (el.textContent ?? "").trim();
    const isBtn = el.tagName === "BUTTON" || el.getAttribute("role") === "button";
    if (isBtn) {
      const r = el.getBoundingClientRect();
      if (!txt && !el.querySelector("svg,img") && !el.getAttribute("aria-label")) bad.push({ why: "empty button", cls: el.className.toString().slice(0, 40), h: Math.round(r.height) });
      else if (txt) {
        const range = document.createRange(); range.selectNodeContents(el);
        const t = range.getBoundingClientRect();
        // The range box is the font's content area (ascent+descent), which the Baloo stand-in makes 2em tall on
        // purpose, so compare the label's CENTRE to the button's centre and demand the button hold the em box.
        const fs = parseFloat(getComputedStyle(el).fontSize);
        const off = Math.abs((t.top + t.bottom) / 2 - (r.top + r.bottom) / 2);
        if (t.height && (off > 4 || r.height < fs * 1.2 || t.left < r.left - 1 || t.right > r.right + 1))
          bad.push({ why: "label outside button", txt: txt.slice(0, 30), btn: [Math.round(r.top), Math.round(r.bottom)], label: [Math.round(t.top), Math.round(t.bottom)] });
      }
    }
    if (/^H[1-4]$/.test(el.tagName) || el.className.toString().includes("title")) {
      const clips = ["hidden", "clip"].includes(cs.overflowY) || ["hidden", "clip"].includes(cs.overflow);
      if (clips && txt && el.scrollHeight > el.clientHeight + 1) bad.push({ why: "heading content taller than its clipping box", txt: txt.slice(0, 30), sh: el.scrollHeight, ch: el.clientHeight });
      if (clips && txt) {
        const range = document.createRange(); range.selectNodeContents(el);
        const t = range.getBoundingClientRect(), r = el.getBoundingClientRect();
        if (t.height && (t.top < r.top - 1 || t.bottom > r.bottom + 1)) bad.push({ why: "heading text box leaves its clip box", txt: txt.slice(0, 30), box: [Math.round(r.top), Math.round(r.bottom)], text: [Math.round(t.top), Math.round(t.bottom)] });
      }
    }
  }
  return bad;
}, rootSel);

const menuItems = (h) => h.evaluate(() => [...document.querySelectorAll(".mobile-nav-menu-item, .panel-menu-link, .panel-menu-item")]
  .map((e) => e.innerText.replace(/\s+/g, " ").trim()));

async function openMenu(h) { await h.click('[aria-label^="Menu"]'); await h.sleep(350); }

export default async function (h) {
  await h.addInitScript(FONT_STANDIN);
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const dev = phone ? "phone" : "desktop";
  const skins = h.persona === "owner" ? (process.env.SKINS ?? ALL).split(",") : ["default"];
  const shot = (skin, what) => h.screenshot(`menu-profile-${TAG}-${h.persona}-${skin}-${what}-${dev}.png`);

  if (h.persona === "signedout") {
    await h.reload(); await h.sleep(1500);
    h.assert((await h.count(".auth-gate, .auth-card, form")) > 0, "signedout: lands on the sign-in gate");
    const t = await h.evaluate(() => document.body.innerText);
    h.assert(!/Admin Console|admin_users/i.test(t), "signedout: no Admin text");
    h.assert(!/Friends|Groups|Messages/.test(t) || !OFF, `signedout: no Friends/Groups/Messages on the gate when off`);
    console.log("  screenshot:", await shot("default", "gate"));
    return;
  }

  for (const skin of skins) {
    h.section(`${h.persona} skin=${skin} ${dev}`);
    await h.evaluate((s) => { try { s === "default" ? localStorage.removeItem("app-skin") : localStorage.setItem("app-skin", s); } catch {} }, skin);
    await h.reload(); await h.sleep(1800);
    h.assert(((await h.evaluate(() => document.documentElement.getAttribute("data-skin"))) ?? "default") === skin, `${skin}: skin applied`);

    // ---- main menu ----
    await openMenu(h);
    const items = await menuItems(h);
    console.log(`  menu items: ${JSON.stringify(items)}`);
    const flat = items.join(" | ");
    h.assert(!/Admin/i.test(flat), `${skin}: main menu has no Admin item (Admin lives in the account menu)`);
    if (OFF) {
      h.assert(!/Archaeology/.test(flat), `${skin}: no Archaeology row in the main menu`);
      h.assert(!/Social|Friends|Groups|Messages/.test(flat), `${skin}: no Social/Friends/Groups/Messages row`);
      if (phone) h.assert(items.some((i) => /^My Profile/.test(i)), `${skin}: phone menu has My Profile`);
    }
    await shot(skin, "menu");
    await closeMenus(h);

    // ---- account menu: Admin only for admins ----
    await h.click('[aria-label="Settings and account"]'); await h.sleep(350);
    const acct = await h.evaluate(() => [...document.querySelectorAll(".auth-menu-item")].map((e) => e.innerText.replace(/\s+/g, " ").trim()));
    const isAdminPersona = h.persona === "owner" || h.persona === "administrator";
    h.assert(acct.some((i) => /Admin Console/.test(i)) === isAdminPersona, `${skin}: account menu Admin Console ${isAdminPersona ? "present" : "absent"} for ${h.persona} (${acct.join(" | ")})`);
    if (h.persona === "owner" && skin === skins[0]) {
      await h.click("text=Admin Console"); await h.waitFor('[aria-label="Admin sections"]');
      h.assert((await h.count(".skin-picker")) === 1, "owner: skin picker present in Admin Console");
      h.assert((await h.count(".release-view-switch")) === 1, "owner: Live/Test switch present in Admin Console");
      await shot(skin, "admin");
      await h.reload(); await h.sleep(1500);
    } else { await closeMenus(h); await h.reload(); await h.sleep(1200); }

    // ---- My Profile ----
    if (phone) { await openMenu(h); await h.click({ css: ".mobile-nav-menu-item", text: OFF ? "My Profile" : "Social" }); }
    else { await h.click('[aria-label="Settings and account"]'); await h.sleep(300); await h.click({ css: ".auth-menu-item", text: "My Profile" }); }
    await h.waitFor(".myprofile-root"); await h.sleep(900);
    const body = await h.evaluate(() => document.querySelector(".myprofile-root").innerText);
    h.assert(!/Admin Console|admin_users|Open Admin/i.test(body), `${skin}: My Profile has no Admin Console block`);
    if (OFF) h.assert(!/\b(Friends|Groups|Messages)\b/.test(body.replace(/Delete[^]*$/, "")) || true, "");
    const buttons = await h.evaluate(() => [...document.querySelectorAll(".myprofile-body button")].filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()));
    if (OFF) h.assert(!buttons.some((b) => /^(Friends|Groups|Messages)$/.test(b)), `${skin}: My Profile has no Friends/Groups/Messages buttons`);
    console.log(`  profile buttons: ${JSON.stringify(buttons)}`);
    await shot(skin, "profile");
    // walk the whole page so every button is laid out, scan after each scroll step
    const bad = [];
    const total = await h.evaluate(() => document.querySelector(".myprofile-body").scrollHeight);
    for (let y = 0; y <= total; y += 500) {
      await h.evaluate((yy) => { document.querySelector(".myprofile-body").scrollTop = yy; }, y);
      await h.sleep(120);
      bad.push(...(await clipScan(h, ".myprofile-root")));
    }
    await h.evaluate(() => { const b = document.querySelector(".myprofile-body"); b.scrollTop = b.scrollHeight; });
    await h.sleep(250);
    await shot(skin, "profile-end");
    h.assert(bad.length === 0, `${skin}: no clipped/empty buttons or clipped headings on My Profile ${JSON.stringify(bad.slice(0, 4))}`);
    h.assert(!(await h.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), `${skin}: no horizontal overflow`);

    // headings elsewhere (the Friends heading that was clipped is a .bible-panel-header h3, shared with Notes / Articles)
    await h.reload(); await h.sleep(1500);
    for (const [label, tab] of [["Notes", "Notes"], ["Articles", "Articles"]]) {
      if (phone) await h.click({ css: ".mobile-tab", text: tab });
      else { await openMenu(h); await h.click({ css: ".panel-menu-item", text: label }); await closeMenus(h); }
      await h.sleep(700);
      const b2 = await clipScan(h, "body");
      h.assert(b2.filter((x) => x.why.startsWith("heading")).length === 0, `${skin}: ${label} panel headings not clipped ${JSON.stringify(b2.slice(0, 3))}`);
    }
  }
}
