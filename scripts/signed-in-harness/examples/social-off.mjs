/**
 * Friends / Groups / Messages are OFF (SOCIAL_CONNECTIONS_ENABLED=false in lib/features.ts): no side effects, and old
 * links land somewhere sane.
 *   node scripts/signed-in-harness/run.mjs --persona owner --viewport 390x844 --script scripts/signed-in-harness/examples/social-off.mjs
 */
const SOCIAL_PATH = /(friend|message|group|church|conversation|notification)/i;
export default async function (h) {
  // Only the signed-in app talks to these. Newsfeed's own read of friend_requests (Posts, not Friends) is allowed
  // and is listed rather than failed.
  h.section("deep links: ?invite / ?joinGroup / ?joinChurch");
  await h.goto("/?invite=00000000-0000-0000-0000-000000000001&joinGroup=00000000-0000-0000-0000-000000000002&joinChurch=00000000-0000-0000-0000-000000000003");
  await h.sleep(2500);
  const st = await h.evaluate(() => ({
    url: location.pathname + location.search,
    pending: ["pending-invite-from", "pending-join-group", "pending-join-church"].map((k) => localStorage.getItem(k)),
    body: document.body.innerText.slice(0, 200),
    errors: !!document.querySelector(".error-boundary"),
  }));
  h.assert(st.url === "/", `query strings stripped, URL is ${st.url}`);
  h.assert(st.pending.every((v) => v === null), `nothing remembered for later: ${JSON.stringify(st.pending)}`);
  h.assert(st.body.trim().length > 20 && !st.errors, "app rendered (not blank, no error boundary)");

  h.section("old paths land on the app");
  for (const p of ["/friends", "/messages", "/groups", "/social", "/?panel=friends", "/#friends"]) {
    await h.goto(p); await h.sleep(1200);
    const ok = await h.evaluate(() => document.body.innerText.trim().length > 20 && !document.querySelector(".error-boundary") && !!document.querySelector(".app-shell"));
    h.assert(ok, `${p} renders the app`);
  }

  h.section("no Friends/Groups/Messages UI anywhere I can open");
  await h.goto("/"); await h.sleep(1500);
  const phone = (await h.evaluate(() => window.innerWidth)) <= 768;
  const text = async () => h.evaluate(() => document.body.innerText);
  const bad = /\b(Friends|Groups|Messages|Add friend|Copy invite link|\+ Group)\b/;
  const screens = phone ? ["Bible", "Map", "Timeline", "Notes", "Articles", "My Profile", "Games"] : [];
  for (const s of screens) {
    await h.click('[aria-label^="Menu"]'); await h.sleep(250);
    await h.click({ css: ".mobile-nav-menu-item", text: s }); await h.sleep(900);
    const t = await text();
    const hits = [...new Set(t.match(new RegExp(bad, "g")) ?? [])];
    // Games copy ("Live trivia with friends") and Terms/Privacy are out of scope; flag only UI tokens
    h.assert(hits.length === 0, `${s}: no ${bad} text on screen (found ${JSON.stringify(hits)})`);
  }

  h.section("no social requests, no realtime");
  const hits = h.requests.filter((r) => SOCIAL_PATH.test(r.path));
  const summary = {};
  for (const r of hits) summary[`${r.method} ${r.path.split("?")[0]}`] = (summary[`${r.method} ${r.path.split("?")[0]}`] ?? 0) + 1;
  console.log("  requests touching friend/message/group/church paths:", JSON.stringify(summary));
  const allowed = (k) => /friend_requests$/.test(k);   // Newsfeed's read (Posts), see features.ts
  h.assert(Object.keys(summary).every(allowed), `only Newsfeed's friend_requests read remains: ${JSON.stringify(summary)}`);
  h.assert(h.writes.filter((w) => SOCIAL_PATH.test(JSON.stringify(w))).length === 0, "no social writes");
}
