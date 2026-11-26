/**
 * My Profile -> Theme is a heading, a helper line and a native select, built like "Bible version".
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 \
 *        --script scripts/signed-in-harness/examples/theme-dropdown.mjs --out <dir>
 * Run at 390x844 and 1280x800. Per theme: choosing it applies at once, is saved on this device and is
 * still selected after a reload. Also: Settings calls its light/dark control "Theme".
 * It also PRINTS (does not assert) two layout facts: the gap under the phone's bottom bar, and the rule
 * between the "Back Up My Data" text and its button.
 */
import { MENU_BUTTON } from "../lib/app.mjs";

const THEMES = { default: "Default", sticker: "Sticker Pop", clarity: "Clarity", midnight: "Midnight Signal", sage: "Sage Study", skyreader: "Sky Reader", trailhead: "Trailhead", highlighter: "Highlighter" };
const isPhone = (h) => h.evaluate(() => window.innerWidth <= 768);
async function openProfile(h) {
  if (await isPhone(h)) { await h.click(MENU_BUTTON); await h.sleep(350); await h.click({ css: ".mobile-nav-menu-item", text: "My Profile" }); }
  else { await h.click('[aria-label="Settings and account"]'); await h.sleep(300); await h.click(".auth-identity-link"); }
  await h.waitFor(".myprofile-root"); await h.sleep(800);
}
const choose = (h, value) => h.evaluate((v) => {
  const s = document.querySelector("#myprofile-theme");
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, v);
  s.dispatchEvent(new Event("change", { bubbles: true }));
}, value);
const applied = (h) => h.evaluate(() => ({ attr: document.documentElement.getAttribute("data-skin") ?? "default", saved: localStorage.getItem("app-skin") ?? "default", value: document.querySelector("#myprofile-theme")?.value ?? null }));
/** The two sections side by side: same structure, same computed look. */
const compare = (h) => h.evaluate(() => {
  const read = (id) => {
    const s = document.getElementById(id); const sec = s?.parentElement; if (!sec) return null;
    const label = sec.querySelector("label"), note = sec.querySelector("p");
    const look = (el, props) => props.map((p) => getComputedStyle(el).getPropertyValue(p)).join("|");
    const r = s.getBoundingClientRect();
    return {
      shape: [...sec.children].map((c) => `${c.tagName}.${c.className}`).join(" "),
      select: look(s, ["appearance", "font-family", "font-size", "font-weight", "color", "background-color", "border-top-width", "border-top-style", "border-top-color", "border-radius", "padding-top", "padding-left", "height"]),
      label: look(label, ["font-family", "font-size", "font-weight", "color"]),
      note: look(note, ["font-family", "font-size", "color", "border-bottom-width", "margin-bottom"]),
      x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height), heading: label.textContent, helper: note.textContent,
    };
  };
  return { bible: read("myprofile-bible-version"), theme: read("myprofile-theme"), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
});
const showSections = (h) => h.evaluate(() => document.querySelector("#myprofile-bible-version").parentElement.scrollIntoView({ block: "start", behavior: "instant" }));

export default async function (h) {
  const dev = (await isPhone(h)) ? "phone" : "desktop";
  await h.evaluate(() => { try { localStorage.removeItem("app-skin"); } catch {} });
  await h.reload(); await h.sleep(1600); await openProfile(h);

  h.section(`Theme section, ${dev}`);
  const options = await h.evaluate(() => [...document.querySelectorAll("#myprofile-theme option")].map((o) => [o.value, o.textContent]));
  h.assert(JSON.stringify(options) === JSON.stringify(Object.entries(THEMES)), `options in order: ${options.map((o) => o[1]).join(", ")}`);
  const text = await h.evaluate(() => document.querySelector(".myprofile-root").innerText);
  h.assert(!/appearance/i.test(text), "My Profile no longer says Appearance");
  h.assert((await h.count(".skin-picker, .skin-toggle, .skin-card")) === 0, "old collapsible row and cards are gone");

  for (const [id, label] of Object.entries(THEMES)) {
    h.section(`theme=${id} ${dev}`);
    await choose(h, id); await h.sleep(700);
    let a = await applied(h);
    h.assert(a.attr === id && a.saved === id && a.value === id, `choosing ${label} applies and saves at once (${JSON.stringify(a)})`);
    await h.reload(); await h.sleep(1600); await openProfile(h);
    a = await applied(h);
    h.assert(a.attr === id && a.saved === id && a.value === id, `${label} still applied and selected after reload (${JSON.stringify(a)})`);
    await showSections(h); await h.sleep(500);
    const c = await compare(h);
    h.assert(c.theme.heading.trim() === "Theme" && c.theme.helper.length > 0, `heading "${c.theme.heading.trim()}" + helper "${c.theme.helper}"`);
    for (const k of ["shape", "select", "label", "note", "x"]) h.assert(c.theme[k] === c.bible[k], `${id}: Theme ${k} matches Bible version (${c.theme[k]}${c.theme[k] === c.bible[k] ? "" : ` vs ${c.bible[k]}`})`);
    console.log(`  select sizes: bible ${c.bible.w}x${c.bible.h}, theme ${c.theme.w}x${c.theme.h}`);
    h.assert(!c.overflow, `${id}: no horizontal overflow`);
    console.log("  shot:", await h.screenshot(`theme-${id}-${dev}.png`));
  }

  // Layout notes asked for alongside this change. Printed, not asserted.
  h.section(`layout notes, ${dev}`);
  await choose(h, "skyreader"); await h.sleep(700);
  console.log("  bottom bar:", JSON.stringify(await h.evaluate(() => {
    const bar = document.querySelector(".mobile-tab-bar"); if (!bar || !bar.getClientRects().length) return "not drawn";
    const r = bar.getBoundingClientRect(), root = document.getElementById("root").getBoundingClientRect();
    return { innerHeight, barTop: Math.round(r.top), barBottom: Math.round(r.bottom), gapBelow: Math.round(innerHeight - r.bottom), rootBottom: Math.round(root.bottom), scrollHeight: document.documentElement.scrollHeight };
  })));
  console.log("  backup section:", JSON.stringify(await h.evaluate(() => {
    const label = [...document.querySelectorAll(".myprofile-body .auth-settings-label")].find((e) => e.textContent.trim() === "Back Up My Data"); if (!label) return "not drawn";
    label.parentElement.scrollIntoView({ block: "center", behavior: "instant" });
    const p = label.parentElement.querySelector("p"), cs = getComputedStyle(p);
    return { paragraphClass: p.className, borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`, paddingBottom: cs.paddingBottom, marginBottom: cs.marginBottom };
  })));
  await h.sleep(500);
  console.log("  shot:", await h.screenshot(`backup-section-${dev}.png`));
  await choose(h, "default"); await h.sleep(500);
  h.assert((await h.evaluate(() => localStorage.getItem("app-skin") === null && !document.documentElement.hasAttribute("data-skin"))), "Default clears the saved choice and data-skin");

  h.section(`Settings label, ${dev}`);
  await h.click('[aria-label="Settings and account"]'); await h.sleep(350);
  await h.click({ css: ".auth-menu-item", text: "Settings" }); await h.waitFor(".settings-root"); await h.sleep(500);
  const s = await h.evaluate(() => ({ labels: [...document.querySelectorAll(".settings-root .auth-settings-label")].map((e) => e.textContent.trim()), toggle: [...document.querySelectorAll(".settings-root .auth-appearance-toggle button")].map((b) => b.innerText.trim()), text: document.querySelector(".settings-root").innerText }));
  h.assert(s.labels.includes("Theme") && !/appearance/i.test(s.text), `Settings says Theme, not Appearance (${s.labels.join(", ")})`);
  h.assert(JSON.stringify(s.toggle) === JSON.stringify(["Light", "Dark"]), `Light/Dark still there (${s.toggle})`);
  console.log("  shot:", await h.screenshot(`settings-${dev}.png`));
}
