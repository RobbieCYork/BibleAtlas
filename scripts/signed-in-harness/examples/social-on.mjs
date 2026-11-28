/**
 * Friends / Groups / Messages are ON (SOCIAL_CONNECTIONS_ENABLED=true in lib/features.ts), checked as TWO people
 * against one fake database: Harness Member and Harness Admin (persona `administrator`) are accepted friends.
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/social-on.mjs
 *
 * Member: My Profile carries Friends / Groups / Messages; the friend is listed; the friend's message arrives; a reply is
 * written as the member; Safety & Contact is back in the account menu; "Add member" on a group explains, in words,
 * that only friends can be added when the server answers not_friend (sql/056). Admin: sees the member as a friend and
 * the member's reply; the desktop menu offers Social. The fake backend does not model RLS or sql/056 itself — the
 * rules are rehearsed in PGlite (scripts/sql-rehearsal/056_groups_add_member_consent.mjs); here add_group_member is
 * made to answer exactly what the real function raises.
 */
const MEMBER = "00000000-0000-4000-8000-000000000001";
const ADMIN = "00000000-0000-4000-8000-000000000003";
const STRANGER = "00000000-0000-4000-8000-000000000099";
const GROUP = "00000000-0000-4000-8000-0000000000aa";
const T0 = "2026-11-20T10:00:00Z";

function seed(h) {
  h.backend.setTable("profiles", [
    { id: MEMBER, display_name: "Harness Member", avatar_url: null, created_at: T0 },
    { id: ADMIN, display_name: "Harness Admin", avatar_url: null, created_at: T0 },
    { id: STRANGER, display_name: "Harness Stranger", avatar_url: null, created_at: T0 },
  ]);
}

export default async function (h) {
  seed(h);
  h.backend.setTable("friend_requests", [
    { id: "00000000-0000-4000-8000-0000000000f1", sender_id: ADMIN, receiver_id: MEMBER, status: "accepted", created_at: T0, responded_at: T0 },
  ]);
  h.backend.setTable("messages", [
    { id: "00000000-0000-4000-8000-0000000000e1", sender_id: ADMIN, receiver_id: MEMBER, body: "Hello from the admin", created_at: T0, read_at: null, pinned: false },
  ]);
  h.backend.setTable("groups", [{ id: GROUP, name: "Harness Study Group", description: null, created_by: MEMBER, created_at: T0, is_public: false }]);
  h.backend.setTable("group_members", [{ group_id: GROUP, user_id: MEMBER, role: "owner", joined_at: T0 }]);
  h.backend.setRpc("list_my_groups", () => [
    { group_id: GROUP, name: "Harness Study Group", description: null, is_public: false, last_message: null, last_message_at: null, last_sender_id: null, unread_count: 0, my_role: "owner" },
  ]);
  h.backend.setRpc("find_user_id_by_email", () => STRANGER);
  h.backend.setRpc("add_group_member", ({ p_member_id }) => {
    if (p_member_id !== ADMIN)
      throw { status: 403, code: "42501", message: "not_friend: you can only add your friends to a group; others can join with an invite link" };
    return null;
  });
  await h.goto("/"); await h.sleep(1500);
  const body = () => h.evaluate(() => document.body.innerText);

  h.section("member: My Profile carries Friends / Groups / Messages");
  await h.click('[data-tour="tab-social"]'); await h.sleep(900);
  for (const label of ["Friends", "Groups", "Messages"]) {
    h.assert(await h.exists({ css: ".myprofile-mode .myprofile-social-links button", text: label }), `My Profile has a ${label} button`);
  }

  h.section("member: the friend is listed");
  await h.click({ css: ".myprofile-mode .myprofile-social-links button", text: "Friends" }); await h.sleep(1200);
  h.assert(/Harness Admin/.test(await body()), "Friends lists Harness Admin");

  h.section("member: the friend's message arrives and a reply goes out");
  await h.click({ css: ".friends-message-button" }); await h.sleep(1200);
  h.assert(/Hello from the admin/.test(await body()), "conversation shows the admin's message");
  await h.type('textarea[placeholder="Type a message…"], input[placeholder="Type a message…"]', "Reply from the member");
  await h.evaluate(() => {
    const f = document.querySelector('[placeholder="Type a message…"]')?.closest("form");
    f?.requestSubmit();
  });
  await h.sleep(1200);
  const sent = h.writes.find((w) => w.table === "messages" && w.op === "insert");
  const row = sent?.rows?.[0];
  h.assert(!!row && row.sender_id === MEMBER && row.receiver_id === ADMIN && row.body === "Reply from the member",
    `reply written as member -> admin: ${JSON.stringify(row ?? null)}`);

  h.section("member: Safety & Contact is back in the account menu");
  await h.goto("/"); await h.sleep(1200);
  await h.click('[aria-label="Settings and account"]'); await h.sleep(400);
  h.assert(await h.exists('[data-menu="safety"]'), "account menu has Safety & Contact");
  await h.click('[data-menu="safety"]'); await h.sleep(800);
  h.assert(/Blocking someone/.test(await body()), "Safety & Contact sheet opens");

  h.section("member: Add member refuses a non-friend in plain words (sql/056)");
  await h.goto("/"); await h.sleep(1200);
  await h.click('[data-tour="tab-social"]'); await h.sleep(900);
  await h.click({ css: ".myprofile-mode .myprofile-social-links button", text: "Groups" }); await h.sleep(1200);
  await h.click({ css: "li.friends-list-item-clickable", text: "Harness Study Group" }); await h.sleep(1200);
  // Members live on their own tab in the group detail.
  if (!(await h.exists('input[placeholder="Add a friend by email or phone"]'))) {
    await h.click({ css: "button", text: "Members" }); await h.sleep(900);
  }
  h.assert(await h.exists('input[placeholder="Add a friend by email or phone"]'), "add box says it is for friends");
  await h.type('input[placeholder="Add a friend by email or phone"]', "stranger@harness.invalid");
  await h.click({ css: ".friends-add-form button[type=submit]" }); await h.sleep(1200);
  const t = await body();
  h.assert(/You can only add your friends to a group/.test(t) && /invite link/.test(t), "non-friend message shown, pointing at the invite link");
  h.assert(!/they may already be a member/.test(t), "not the old 'already a member' guess");

  h.section("admin (second person): sees the member as a friend and the member's reply");
  await h.asPersona("administrator");
  seed(h);
  await h.reload(); await h.sleep(1500);
  await h.click('[data-tour="tab-social"]'); await h.sleep(900);
  await h.click({ css: ".myprofile-mode .myprofile-social-links button", text: "Friends" }); await h.sleep(1200);
  h.assert(/Harness Member/.test(await body()), "admin's Friends lists Harness Member");
  await h.click({ css: ".friends-message-button" }); await h.sleep(1200);
  const tb = await body();
  h.assert(/Hello from the admin/.test(tb) && /Reply from the member/.test(tb), "admin sees both sides of the conversation");

  h.section("admin, desktop: the menu offers Social");
  await h.setViewport(1280, 800); await h.goto("/"); await h.sleep(1500);
  await h.click('[aria-label^="Menu"]'); await h.sleep(400);
  h.assert(await h.exists('[data-menu="friends"]'), "desktop menu has the Social row");

  h.section("no error boundary anywhere");
  h.assert(!(await h.exists(".error-boundary")), "no error boundary");
}
