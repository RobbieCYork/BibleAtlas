/**
 * Worked example: other people's profiles come from get_profile_cards (sql/042), not the profiles table.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/profile-cards.mjs
 *
 * The member has one accepted friend (Fay) and two incoming pending requests (Pat, and one account
 * with no display name). The fake get_profile_cards masks the way sql/042 does: Fay's card carries
 * her public fields and nothing her visibility hides (phone, birthday); a pending requester's card
 * carries id, display_name and avatar_url only.
 *   1. Social -> Friends lists Fay under Friends and Pat under Requests; a nameless pending
 *      requester reads "A Capstone member" (no email to fall back on) and nothing crashes.
 *   2. Every other-person profile read went to rpc/get_profile_cards; none to GET /profiles?id=in.
 *   3. Fay's profile page shows her name and church, and no phone or birthday.
 *   4. Before sql/042 is applied (rpc answers 404 PGRST202) the app falls back to the old
 *      profiles select and still draws the same names.
 *
 * What this cannot prove: the real masking and RLS in sql/042 (the fake does not enforce them). That
 * is proven by the PGlite rehearsal of the migration itself.
 */
import { MENU_BUTTON } from "../lib/app.mjs";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const FAY = id(41), PAT = id(42), NONAME = id(43);
const at = "2026-10-01T00:00:00Z";

const FULL = {
  [FAY]: { id: FAY, email: "fay@harness.invalid", display_name: "Fay Friend", avatar_url: null, church: "Grace Chapel", church_website: null,
    favorite_verse: null, bio: "Hi from Fay", created_at: at, phone: "5550009999", birthday: "1990-02-03", profile_visibility: { phone: false, birthday: false } },
  [PAT]: { id: PAT, email: "pat@harness.invalid", display_name: "Pat Pending", avatar_url: null, church: "Secret Church", bio: "private bio",
    created_at: at, phone: "5550008888", birthday: "1991-04-05", profile_visibility: { phone: true } },
  [NONAME]: { id: NONAME, email: "noname@harness.invalid", display_name: null, avatar_url: null, created_at: at, profile_visibility: {} },
};
/** sql/042's masking, re-implemented for the fake: friend = public + visible; pending = name/avatar. */
function cards({ p_ids }) {
  return p_ids.filter((x) => FULL[x]).map((x) => {
    const p = FULL[x];
    if (x === FAY) {
      const v = p.profile_visibility;
      return { ...p, phone: v.phone ? p.phone : null, birthday: v.birthday ? p.birthday : null };
    }
    return { id: p.id, email: null, display_name: p.display_name, avatar_url: p.avatar_url, created_at: null, church: null, bio: null,
      phone: null, birthday: null, profile_visibility: null };
  });
}

async function openFriends(h) {
  await h.click(MENU_BUTTON);
  await h.sleep(200);
  const social = await h.evaluate(() => {
    const row = [...document.querySelectorAll(".panel-menu-item")].find((el) => /Social/.test(el.textContent));
    const box = row?.querySelector("input[type=checkbox]");
    return { found: !!row, checked: box ? box.checked : null };
  });
  if (social.found && social.checked === false) await h.click({ css: ".panel-menu-item", text: "Social" });
  await h.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await h.waitFor(".friends-panel");
  await h.sleep(800);
}

const sectionNames = (h) =>
  h.evaluate(() => {
    const out = {};
    for (const sec of document.querySelectorAll(".friends-panel .friends-section")) {
      const title = sec.querySelector("h4")?.textContent.trim() ?? "?";
      out[title] = [...sec.querySelectorAll(".friends-list-item")].map((li) => li.innerText.replace(/\s+/g, " ").trim());
    }
    return out;
  });

export default async (h) => {
  const me = h.backend.persona.id;
  h.backend.setTable("friend_requests", [
    { id: id(901), sender_id: me, receiver_id: FAY, status: "accepted", created_at: at, responded_at: at },
    { id: id(902), sender_id: PAT, receiver_id: me, status: "pending", created_at: at, responded_at: null },
    { id: id(903), sender_id: NONAME, receiver_id: me, status: "pending", created_at: at, responded_at: null },
  ]);
  h.backend.setRpc("get_profile_cards", cards);

  h.section("1. Friends and Requests draw names from cards");
  await h.reload();
  await openFriends(h);
  const s1 = await sectionNames(h);
  h.assert(JSON.stringify(s1.Friends ?? []).includes("Fay Friend"), `Friends lists Fay: ${JSON.stringify(s1.Friends)}`);
  h.assert((s1.Requests ?? []).some((t) => t.includes("Pat Pending")), `Requests lists Pat: ${JSON.stringify(s1.Requests)}`);
  h.assert((s1.Requests ?? []).some((t) => t.includes("A Capstone member")), `nameless requester reads "A Capstone member": ${JSON.stringify(s1.Requests)}`);
  h.assert(h.consoleErrors.length === 0, `no page errors (${h.consoleErrors.length})`);

  h.section("2. Other people's profiles came from rpc/get_profile_cards only");
  const rpcCalls = h.requests.filter((r) => r.method === "POST" && r.path.startsWith("/rest/v1/rpc/get_profile_cards"));
  const tableReadsOfOthers = h.requests.filter((r) => r.method === "GET" && r.path.startsWith("/rest/v1/profiles") && /id=in\./.test(decodeURIComponent(r.path)));
  h.assert(rpcCalls.length > 0, `get_profile_cards called ${rpcCalls.length}x`);
  h.assert(tableReadsOfOthers.length === 0, `no GET profiles?id=in.(...) (${tableReadsOfOthers.length})`);

  h.section("3. Fay's profile page honours her visibility");
  const idx = await h.evaluate(() => [...document.querySelectorAll(".friends-list-item-clickable")].findIndex((el) => el.textContent.includes("Fay Friend")));
  await h.click(".friends-list-item-clickable", { index: idx });
  await h.waitFor(".friend-profile-name");
  const page = await h.evaluate(() => document.querySelector(".friend-profile-body")?.innerText ?? "");
  h.assert(/Fay Friend/.test(page) && /Grace Chapel/.test(page), "name and church shown");
  h.assert(!/5550009999/.test(page) && !/1990/.test(page), "no phone, no birthday");
  await h.screenshot("profile-cards-fay.png");

  h.section("4. Before sql/042: rpc missing -> falls back to the old table read");
  h.backend.setRpc("get_profile_cards", () => { throw { status: 404, code: "PGRST202", message: "Could not find the function public.get_profile_cards(p_ids) in the schema cache" }; });
  h.backend.setTable("profiles", [
    { id: me, display_name: h.backend.persona.name, created_at: at, avatar_url: null },
    ...Object.values(FULL),
  ]);
  const before = h.requests.length;
  await h.reload();
  await openFriends(h);
  const s4 = await sectionNames(h);
  h.assert(JSON.stringify(s4.Friends ?? []).includes("Fay Friend") && (s4.Requests ?? []).some((t) => t.includes("Pat Pending")),
    `names still drawn via fallback: ${JSON.stringify(s4)}`);
  const fallbackReads = h.requests.slice(before).filter((r) => r.method === "GET" && r.path.startsWith("/rest/v1/profiles") && /id=in\./.test(decodeURIComponent(r.path)));
  h.assert(fallbackReads.length > 0, `fallback GET profiles?id=in. used (${fallbackReads.length})`);
};
