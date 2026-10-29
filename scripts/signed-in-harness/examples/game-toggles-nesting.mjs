/**
 * Worked example (c): the per-game toggles under Games & Trivia nest correctly, and a child's stage
 * reaches Game Center the way lib/features.ts's decide() says it should.
 *   node scripts/signed-in-harness/run.mjs --persona owner --script scripts/signed-in-harness/examples/game-toggles-nesting.mjs
 */
import { openAdminConsole, MENU_BUTTON } from "../lib/app.mjs";

const GAMES = ["Bible Trivia", "Bible Crossword", "Saving Peter", "Fill in the Blank", "Scripture Memorization Challenge", "Guess the Punchline", "Chronology"];

const featuresTab = async (h) => {
  await openAdminConsole(h);
  await h.click({ css: '[aria-label="Admin sections"] [role=tab]', text: "Features" });
  await h.waitFor(".release-list");
};

/** Game Center card titles, as the current persona sees them, and which carry the orange marker. */
async function gameCenter(h) {
  await h.click(MENU_BUTTON);
  await h.click({ css: ".panel-menu-link, .mobile-nav-menu-item", text: "Games" });
  await h.waitFor(".game-center-card");
  return h.evaluate(() => [...document.querySelectorAll(".game-center-card")].map((c) => ({
    title: c.querySelector(".game-center-card-title").childNodes[0].textContent.trim(),
    marker: !!c.querySelector(".release-testing-marker"),
  })));
}

export default async function (h) {
  h.section("1. Structure of the Features tab");
  await featuresTab(h);
  const tree = await h.evaluate(() => {
    const label = (li) => li.querySelector(":scope > .release-row-text .release-row-label").innerText.trim();
    const top = [...document.querySelectorAll("ul.release-list:not(.release-sublist) > li")];
    const parentLi = top.find((li) => label(li) === "Games & Trivia");
    const sub = parentLi.querySelector(":scope > ul.release-sublist");
    const px = parentLi.querySelector(":scope > .release-row-text").getBoundingClientRect().x;
    return {
      top: top.map(label),
      subAria: sub?.getAttribute("aria-label"),
      kids: [...(sub?.children ?? [])].map((li) => ({ label: label(li), child: li.classList.contains("release-row-child"), x: li.querySelector(".release-row-text").getBoundingClientRect().x, kidsOfKids: li.querySelectorAll("ul").length })),
      parentX: px,
      totalRows: document.querySelectorAll(".release-row").length,
    };
  });
  h.assert(tree.top.length === 8 && !GAMES.some((g) => tree.top.includes(g)), `8 top-level features, no game among them (${tree.top.join(", ")})`);
  h.assert(JSON.stringify(tree.kids.map((k) => k.label)) === JSON.stringify(GAMES), `Games & Trivia nests exactly the 7 games, in Game Center's order`);
  h.assert(tree.subAria === "Games & Trivia — individual stages", `sub-list is labelled "${tree.subAria}"`);
  h.assert(tree.kids.every((k) => k.child && k.x > tree.parentX && k.kidsOfKids === 0), "every game row is a .release-row-child, indented past its parent, with nothing nested below it");
  h.assert(tree.totalRows === 15, `15 rows in all (8 + 7), none duplicated: ${tree.totalRows}`);

  h.section("2. Parent Testing explains itself on Live children");
  await h.click('button[aria-label^="Games & Trivia: Live"]');
  await h.waitFor('button[aria-label^="Games & Trivia: Testing"]');
  const note = await h.text({ css: ".release-row-child .release-row-where", text: "Hidden from everyone but you anyway" });
  h.assert(/because Games & Trivia is in Testing/.test(note ?? ""), `children say: "${note}"`);
  h.assert((await h.count({ css: ".release-row-child .release-stage-live" })) === 7, "all 7 games still read Live on their own");

  h.section("3. A single game in Testing, parent Live: member vs owner");
  await h.click('button[aria-label^="Games & Trivia: Testing"]'); // back to Live
  await h.waitFor('button[aria-label^="Games & Trivia: Live"]');
  await h.click('button[aria-label^="Chronology: Live"]');
  await h.waitFor('button[aria-label^="Chronology: Testing"]');
  h.assert(h.audit.map((a) => `${a.feature}:${a.to_live}`).join(",") === "games_trivia:false,games_trivia:true,game_chronology:false", `audit trail: ${h.audit.map((a) => a.feature + "->" + (a.to_live ? "live" : "testing")).join(", ")}`);

  await h.asPersona("member");
  let cards = await gameCenter(h);
  h.assert(cards.length === 6 && !cards.some((c) => c.title === "Chronology") && cards.every((c) => !c.marker), `member: Game Center shows 6 games, no Chronology, no markers (${cards.map((c) => c.title).join(", ")})`);

  await h.asPersona("owner");
  await h.evaluate(() => localStorage.setItem("feature-test-view-v1", "1"));
  await h.reload();
  cards = await gameCenter(h);
  const marked = cards.filter((c) => c.marker).map((c) => c.title);
  h.assert(cards.length === 7 && marked.join() === "Chronology", `owner, Test view: all 7 shown, only Chronology marked (marked: ${marked.join() || "none"})`);
  console.log("  screenshot (a hint, not evidence):", await h.screenshot("game-center-owner-test-view.png"));
}
