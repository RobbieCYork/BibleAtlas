/**
 * Friends / Groups / Messages: the shared buttons and the "< Back" header (2026-11-28).
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 390x844 --script scripts/signed-in-harness/examples/social-nav.mjs
 *   node scripts/signed-in-harness/run.mjs --persona member --viewport 1280x800 --script scripts/signed-in-harness/examples/social-nav.mjs
 *
 * Phone and desktop run their own entry points. Both: the buttons compute to the same style on My Profile and on the
 * social lists, one is marked selected; Back goes up one level from a conversation, a profile, a group and New Group,
 * and from a top-level list to where the reader came from; the browser's Back (history.back) does the same without
 * changing the URL or leaving the app. A message notification is delivered by an in-page stand-in for Realtime; a
 * church invite link covers an entry with nowhere to return to. A phone run ends with every skin, light and dark, at
 * 320 / 375 / 402px and text sizes 1 and 1.8: nothing sideways, no label cut. SKIP_LOOKS=1 leaves that out;
 * LOOK_SKINS, LOOK_WIDTHS and LOOK_SCALES (comma lists) narrow it, and LOOK_SKINS also runs it on desktop.
 */
const MEMBER = "00000000-0000-4000-8000-000000000001";
const ADMIN = "00000000-0000-4000-8000-000000000003";
const GROUP = "00000000-0000-4000-8000-0000000000aa";
const T0 = "2026-11-20T10:00:00Z";
const SKINS = ["default", "sticker", "clarity", "midnight", "sage", "skyreader", "trailhead", "highlighter"];

/** Realtime, in the page: joins are accepted and window.__notify(table, record) pushes an INSERT. */
const REALTIME = `(() => {
  const Real = window.WebSocket, joined = []; let ref = 0;
  class Fake {
    constructor() { this.readyState = 0; this.bufferedAmount = 0; setTimeout(() => { this.readyState = 1; this.onopen && this.onopen({}); }, 20); }
    say(frame) { setTimeout(() => this.onmessage && this.onmessage({ data: JSON.stringify(frame) }), 0); }
    send(data) {
      if (typeof data !== "string") return;
      const [j, r, topic, event, payload] = JSON.parse(data);
      const bindings = event === "phx_join" ? (payload.config?.postgres_changes ?? []).map((b) => ({ ...b, id: ++ref })) : [];
      if (event === "phx_join") joined.push({ sock: this, topic, bindings });
      this.say([j, r, topic, "phx_reply", { status: "ok", response: { postgres_changes: bindings } }]);
    }
    close() { this.readyState = 3; }
    addEventListener() {} removeEventListener() {}
  }
  window.WebSocket = function (url, p) { return String(url).includes("/realtime/v1/") ? new Fake() : new Real(url, p); };
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  window.__notify = (topicPart, table, record) => {
    for (const c of joined) {
      if (!c.topic.includes(topicPart)) continue;
      const ids = c.bindings.filter((b) => b.table === table).map((b) => b.id);
      if (ids.length) c.sock.say([null, null, c.topic, "postgres_changes", { ids, data: { type: "INSERT", schema: "public", table, commit_timestamp: new Date().toISOString(), columns: [], record, old_record: {}, errors: null } }]);
    }
  };
})()`;

function seed(h) {
  h.backend.setTable("profiles", [
    { id: MEMBER, display_name: "Harness Member", avatar_url: null, created_at: T0, profile_visibility: {} },
    { id: ADMIN, display_name: "Bartholomew Longname-Harrington", avatar_url: null, created_at: T0, profile_visibility: {} },
  ]);
  h.backend.setTable("friend_requests", [
    { id: "00000000-0000-4000-8000-0000000000f1", sender_id: ADMIN, receiver_id: MEMBER, status: "accepted", created_at: T0, responded_at: T0 },
  ]);
  h.backend.setTable("messages", [
    { id: "00000000-0000-4000-8000-0000000000e1", sender_id: ADMIN, receiver_id: MEMBER, body: "Hello from the friend", created_at: T0, read_at: null, pinned: false },
  ]);
  h.backend.setRpc("list_my_groups", () => [
    { group_id: GROUP, name: "Harness Study Group", description: null, is_public: false, last_message: null, last_message_at: null, last_sender_id: null, unread_count: 0, my_role: "owner" },
  ]);
  // Churches as production has them today: sql/033 not applied.
  h.backend.setRpc("list_my_churches", () => { throw { status: 404, code: "PGRST202", message: "Could not find the function" }; });
}

export default async function (h) {
  seed(h);
  await h.addInitScript(REALTIME);
  const width = Number(h.viewport.split("x")[0]);
  const phone = width < 768;
  await h.goto("/"); await h.sleep(1500);

  /** Everything about where the reader is standing, read off visible elements only. */
  const where = () => h.evaluate(() => {
    const seen = (el) => !!el && el.getClientRects().length > 0;
    const first = (s) => [...document.querySelectorAll(s)].find(seen);
    const takeover = first(".game-mode") ? "game" : first(".timeline-mode") ? "timeline" : first(".myprofile-mode") ? "profile-mode" : null;
    return {
      takeover,
      social: seen(first(".social-title")) && !takeover ? first(".social-title").innerText.trim() : null,
      profileTitle: first(".myprofile-title")?.innerText.trim() ?? null,
      bible: !takeover && seen(first(".bible-panel")),
      friends: !!first(".friends-panel"),
    };
  });
  const url = () => h.evaluate(() => location.href);
  const sentinel = () => h.evaluate(() => !!history.state?.capstoneSocialBack);
  const social = async (title, msg) => { const w = await where(); h.assert(w.social === title, `${msg}: social screen "${title}" (${JSON.stringify(w)})`); };
  const onProfile = async (msg) => { const w = await where(); h.assert(w.takeover === "profile-mode" && w.profileTitle === "My Profile", `${msg}: My Profile (${JSON.stringify(w)})`); };
  const onBible = async (msg) => { const w = await where(); h.assert(w.bible && !w.takeover && !w.social, `${msg}: the Bible, no social screen (${JSON.stringify(w)})`); };
  const back = async () => { await h.click(".social-header .back-btn"); await h.sleep(600); };
  const browserBack = async () => { await h.evaluate(() => history.back()); await h.sleep(700); };
  // My Profile is drawn over the social lists, which stay mounted under it with the same buttons: take the ones on top.
  const switcher = async (label) => { const over = (await h.exists(".myprofile-mode")) ? ".myprofile-mode " : ""; await h.click({ css: `${over}.myprofile-social-links button`, text: label }); await h.sleep(800); };
  const openProfile = async () => {
    if (phone) await h.click('[data-tour="tab-social"]');
    else { await h.click('[aria-label="Settings and account"]'); await h.sleep(300); await h.click({ css: "button", text: "My Profile" }); }
    await h.sleep(900);
  };
  const styleOf = () => h.evaluate(() => {
    const b = [...document.querySelectorAll(".myprofile-social-links button:not(.myprofile-social-links-active)")].find((e) => e.getClientRects().length);
    const c = getComputedStyle(b);
    return ["backgroundColor", "color", "borderTopColor", "borderTopWidth", "borderTopLeftRadius", "fontSize", "fontWeight", "fontFamily", "paddingTop", "minHeight"].map((k) => `${k}=${c[k]}`).join("; ");
  });
  const selected = () => h.evaluate(() => [...document.querySelectorAll('.myprofile-social-links button[aria-current="page"]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()));
  const device = phone ? "phone" : "desktop";

  h.section(`${device}: My Profile buttons and the switcher are the same buttons`);
  await openProfile();
  const profileStyle = await styleOf();
  h.assert((await selected()).length === 0, "nothing is selected on My Profile");
  await h.screenshot(`${device}-profile.png`);
  await switcher("Friends");
  await social("Friends", "My Profile -> Friends");
  const friendsStyle = await styleOf();
  h.assert(profileStyle === friendsStyle, `same computed style on both\n      profile: ${profileStyle}\n      friends: ${friendsStyle}`);
  h.assert(JSON.stringify(await selected()) === '["Friends"]', "Friends is marked selected");
  await h.screenshot(`${device}-friends.png`);

  h.section(`${device}: the header and its Back`);
  const head = await h.evaluate(() => {
    const hd = [...document.querySelectorAll(".social-header")].find((e) => e.getClientRects().length);
    const p = hd.closest(".friends-panel"), a = hd.getBoundingClientRect(), b = p.getBoundingClientRect();
    return { text: hd.innerText.replace(/\s+/g, " "), top: a.top - b.top, left: a.left - b.left, right: b.right - a.right, sideways: p.scrollWidth - p.clientWidth };
  });
  h.assert(/^Back Friends$/.test(head.text) && Math.abs(head.top) <= 1 && Math.abs(head.left) <= 1.5 && Math.abs(head.right) <= 1 && head.sideways <= 0,
    `header "< Back  Friends" spans the top of the panel ${JSON.stringify(head)}`);
  await back();
  await onProfile("Back from Friends");
  await h.click(".myprofile-header .back-btn"); await h.sleep(600);
  await onBible("Back from My Profile (no loop back into Friends)");

  h.section(`${device}: Groups and Messages, and switching between lists keeps the way back`);
  for (const label of ["Groups", "Messages"]) {
    await openProfile(); await switcher(label);
    await social(label, `My Profile -> ${label}`);
    h.assert(JSON.stringify(await selected()) === JSON.stringify([label]), `${label} is marked selected`);
    await h.screenshot(`${device}-${label.toLowerCase()}.png`);
    await switcher("Friends"); await switcher(label);
    await back();
    await onProfile(`Back from ${label} after switching`);
    await h.click(".myprofile-header .back-btn"); await h.sleep(500);
  }

  h.section(`${device}: nested screens go up one level`);
  await openProfile(); await switcher("Messages");
  await h.click({ css: "li.friends-list-item-clickable", text: "Bartholomew" }); await h.sleep(900);
  await social("Bartholomew Longname-Harrington", "conversation");
  await h.screenshot(`${device}-thread.png`);
  h.assert(await h.exists(".social-header .mod-menu-header"), "report/block menu is still in the conversation header");
  await back(); await social("Messages", "Back from the conversation");
  await switcher("Friends");
  await h.click(".friends-list-item-row"); await h.sleep(900);
  await social("Bartholomew Longname-Harrington", "friend profile");
  await h.screenshot(`${device}-friend-profile.png`);
  await h.click(".friend-profile-message-button"); await h.sleep(900);
  h.assert(await h.exists('textarea[placeholder="Type a message…"]'), "Message opens the conversation");
  await back();
  h.assert(await h.exists(".friend-profile-body"), "Back from that conversation returns to the profile");
  await back(); await social("Friends", "Back from the profile");
  await h.click(".friends-message-button"); await h.sleep(900);
  await back(); await social("Friends", "Back from a conversation opened off the Friends list");
  await switcher("Groups");
  await h.click({ css: "li.friends-list-item-clickable", text: "Harness Study Group" }); await h.sleep(900);
  await social("Harness Study Group", "group detail");
  await h.screenshot(`${device}-group.png`);
  await h.click({ css: ".group-detail-tabs button", text: "Members" }); await h.sleep(500);
  await back(); await social("Groups", "Back from the group (Members tab)");
  await h.click({ css: "button", text: "New Group" }); await h.sleep(600);
  await social("New Group", "new group");
  await back(); await social("Groups", "Back from New Group");
  await back(); await onProfile("Back from Groups");
  await h.click(".myprofile-header .back-btn"); await h.sleep(500);

  h.section(`${device}: the browser's Back, one level at a time`);
  const start = await url();
  await openProfile(); await switcher("Messages");
  h.assert(await sentinel(), "a history entry is held while a social list shows");
  await h.click({ css: "li.friends-list-item-clickable", text: "Bartholomew" }); await h.sleep(900);
  await browserBack(); await social("Messages", "browser Back from the conversation");
  await browserBack(); await onProfile("browser Back from Messages");
  h.assert((await url()) === start && !(await sentinel()), "same URL, and the held entry is gone");
  await h.click(".myprofile-header .back-btn"); await h.sleep(500);
  await openProfile(); await switcher("Groups");
  await h.click({ css: "li.friends-list-item-clickable", text: "Harness Study Group" }); await h.sleep(900);
  await browserBack(); await social("Groups", "browser Back from the group");
  await browserBack(); await onProfile("browser Back from Groups");
  await h.click(".myprofile-header .back-btn"); await h.sleep(500);

  h.section(`${device}: leaving another way drops the held entry; in-app and browser Back mix`);
  await openProfile(); await switcher("Friends");
  if (phone) await h.click({ css: ".mobile-tab", text: "Bible" });
  else { await h.click('[aria-label^="Menu"]'); await h.sleep(300); await h.click('[data-menu="friends"] input'); await h.click('[aria-label^="Menu"]'); }
  await h.sleep(700);
  await onBible("left by the tab bar / menu");
  h.assert(!(await sentinel()) && (await url()) === start, "no held entry left behind");
  for (let i = 0; i < 3; i++) {
    await openProfile(); await switcher("Messages");
    await h.click({ css: "li.friends-list-item-clickable", text: "Bartholomew" }); await h.sleep(600);
    await back(); await browserBack(); await onProfile(`round ${i + 1}: Back button then browser Back`);
    await h.click(".myprofile-header .back-btn"); await h.sleep(500);
  }
  h.assert((await url()) === start && (await h.exists("#root > *")), "still in the app");

  h.section(`${device}: opened from a notification, Back returns to what was on screen`);
  await h.evaluate((a, m) => window.__notify("notify-messages", "messages", { id: "00000000-0000-4000-8000-0000000000e9", sender_id: a, receiver_id: m, body: "Ping" }), ADMIN, MEMBER);
  await h.waitFor(".notification-toast");
  await h.click(".notification-toast-text"); await h.sleep(900);
  await social("Messages", "notification -> Messages");
  await back(); await onBible("Back after the notification");

  if (phone) {
    h.section("phone: notification over Games");
    await h.click({ css: ".mobile-tab", text: "Games" }); await h.sleep(900);
    await h.evaluate((a, m) => window.__notify("notify-friend-requests", "friend_requests", { id: "x", sender_id: a, receiver_id: m, status: "pending" }), ADMIN, MEMBER);
    await h.waitFor(".notification-toast");
    await h.click(".notification-toast-text"); await h.sleep(900);
    await social("Friends", "notification -> Friends");
    await back();
    h.assert((await where()).takeover === "game", "Back returns to Games");
    await h.click({ css: ".mobile-tab", text: "Bible" }); await h.sleep(500);

    h.section("phone: My Profile tab over a social screen does not loop");
    await openProfile(); await switcher("Friends");
    await openProfile(); await switcher("Groups");
    await back(); await onProfile("Back from Groups");
    await h.click(".myprofile-header .back-btn"); await h.sleep(500);
    await onBible("then Back from My Profile reaches the Bible");
  } else {
    h.section("desktop: opened from the menu, Back closes it again");
    await h.click('[aria-label^="Menu"]'); await h.sleep(300); await h.click('[data-menu="friends"] input'); await h.click('[aria-label^="Menu"]'); await h.sleep(700);
    // The panel reopens on whichever list was last asked for.
    h.assert(["Friends", "Groups", "Messages"].includes((await where()).social), "menu -> Social shows a social list");
    await h.screenshot("desktop-social-from-menu.png");
    await back(); await onBible("Back after the menu");
    h.assert(await h.exists(".map-area"), "map still open");

    h.section("desktop: a full set of panels gets the one that made room back");
    await h.click('[aria-label^="Menu"]'); await h.sleep(300);
    await h.click('[data-menu="notes"] input'); await h.sleep(200); await h.click('[data-menu="friends"] input'); await h.sleep(200);
    const open = () => h.evaluate(() => [...document.querySelectorAll(".panel-menu-item")].filter((l) => l.querySelector("input").checked).map((l) => l.dataset.menu).sort().join());
    const full = await open();
    await h.click('[aria-label^="Menu"]'); await h.sleep(500);
    await back();
    await h.click('[aria-label^="Menu"]'); await h.sleep(300);
    const after = await open();
    await h.click('[aria-label^="Menu"]');
    h.assert(full.split(",").length === 3 && full.includes("friends") && after.split(",").length === 3 && !after.includes("friends"), `panels ${full} -> ${after}`);
  }

  h.section(`${device}: an invite link (nowhere to return to) goes back to My Profile`);
  h.backend.setRpc("list_my_churches", () => []);
  h.backend.setRpc("request_to_join_church", () => null);
  await h.goto(`/?joinChurch=${GROUP}`); await h.sleep(2500);
  await social("Church", "invite link");
  h.assert((await h.count(".myprofile-social-links button")) === 4, "four buttons once churches exist");
  await h.screenshot(`${device}-church.png`);
  await back(); await onProfile("Back from an invite link");
  await h.click(".myprofile-header .back-btn"); await h.sleep(500);
  await onBible("and on to the Bible");

  const list = (name, fallback) => process.env[name]?.split(",") ?? fallback;
  if (process.env.SKIP_LOOKS || (!phone && !process.env.LOOK_SKINS)) return;
  h.section("every look: nothing sideways, no label cut, selected distinct");
  const bad = [];
  for (const churches of [false, true]) {
    h.backend.setRpc("list_my_churches", churches ? () => [] : () => { throw { status: 404, code: "PGRST202", message: "Could not find the function" }; });
    if (churches && process.env.LOOK_SKINS) continue;
    for (const skin of list("LOOK_SKINS", churches ? ["default", "trailhead", "skyreader"] : [...SKINS, "default-dark"])) {
      for (const scale of list("LOOK_SCALES", [1, 1.8]).map(Number)) {
        for (const w of list("LOOK_WIDTHS", [320, 375, 402]).map(Number)) {
          await h.evaluate((s, z) => {
            if (s.startsWith("default")) localStorage.removeItem("app-skin"); else localStorage.setItem("app-skin", s);
            localStorage.setItem("app-theme", s === "default-dark" ? "dark" : "light");
            localStorage.setItem("app-text-scale", String(z));
          }, skin, scale);
          await h.setViewport(w, 800); await h.sleep(500);
          const tag = `${skin}${churches ? "+church" : ""}-${w}-x${scale}`;
          const scan = () => h.evaluate(() => {
            const row = [...document.querySelectorAll(".myprofile-social-links")].find((e) => e.getClientRects().length);
            const panel = row.closest(".friends-panel, .myprofile-body");
            const out = [];
            const buttons = [...row.querySelectorAll("button")];
            for (const b of buttons) {
              const r = b.getBoundingClientRect(), label = b.querySelector("span"), l = label.getBoundingClientRect();
              if (b.scrollWidth > b.clientWidth + 1 || l.left < r.left - 0.5 || l.right > r.right + 0.5 || l.bottom > r.bottom + 0.5) out.push(`cut ${label.innerText} ${Math.round(l.width)}/${Math.round(r.width)}`);
              if (label.getClientRects().length !== 1 || r.height < 44) out.push(`wrapped or short ${label.innerText}`);
            }
            // A social panel must not scroll sideways at all. My Profile is checked for these buttons only: other rows
            // there are not this check's business.
            const rr = row.getBoundingClientRect(), pr = panel.getBoundingClientRect();
            if (row.scrollWidth > row.clientWidth + 1 || rr.right > pr.right + 0.5 || (panel.matches(".friends-panel") && panel.scrollWidth > panel.clientWidth + 1)) out.push("sideways");
            const hd = [...document.querySelectorAll(".social-header")].find((e) => e.getClientRects().length);
            if (hd) { const t = hd.querySelector("h2").getBoundingClientRect(), k = hd.querySelector(".back-btn").getBoundingClientRect(); if (t.left < k.right || t.width < 40 || hd.scrollWidth > hd.clientWidth + 1) out.push(`header ${Math.round(t.width)}`); }
            const on = buttons.find((b) => b.getAttribute("aria-current"));
            const off = buttons.find((b) => !b.getAttribute("aria-current"));
            if (on && getComputedStyle(on).backgroundColor === getComputedStyle(off).backgroundColor) out.push("selected looks like the rest");
            const rows = new Set(buttons.map((b) => Math.round(b.getBoundingClientRect().top))).size;
            return { out, rows, style: getComputedStyle(off).backgroundColor };
          });
          await openProfile();
          const a = await scan();
          if (w !== 320 || scale === 1) await h.screenshot(`looks/${tag}-profile.png`);
          await switcher("Messages");
          const b = await scan();
          await h.screenshot(`looks/${tag}-messages.png`);
          const problems = [...a.out.map((x) => `profile: ${x}`), ...b.out.map((x) => `messages: ${x}`)];
          if (a.style !== b.style) problems.push("profile and messages differ");
          if (problems.length) bad.push(`${tag}: ${problems.join(", ")}`);
          console.log(`  ${tag}: rows profile=${a.rows} messages=${b.rows}${problems.length ? "  PROBLEMS " + problems.join(", ") : ""}`);
        }
      }
    }
  }
  h.assert(bad.length === 0, `no layout problems in any look ${JSON.stringify(bad)}`);
}
