/**
 * Self-test of the harness itself: the app (here, injected page code) tries to reach a real-looking
 * Supabase host and the open internet. Every attempt must fail and be recorded as BLOCKED, and the
 * summary must still say 0 requests reached the network.
 *   node scripts/signed-in-harness/run.mjs --persona member --script scripts/signed-in-harness/examples/network-closed.mjs
 */
export default async function (h) {
  h.section("Closed network");
  const before = h.ledger.blocked.length;
  const results = await h.evaluate(async () => {
    const tries = ["https://abcdefghijklmnop.supabase.co/rest/v1/profiles?select=*", "https://abcdefghijklmnop.supabase.co/auth/v1/user", "https://example.com/"];
    const out = [];
    for (const u of tries) {
      try { const r = await fetch(u, { headers: { apikey: "x" } }); out.push(`${u} -> HTTP ${r.status} (LEAK)`); }
      catch (e) { out.push(`${u} -> ${e.name}`); }
    }
    return out;
  });
  results.forEach((r) => console.log("   ", r));
  h.assert(results.every((r) => !/LEAK/.test(r)), "every outbound fetch from the page failed");
  h.assert(h.ledger.blocked.length - before >= 3, `all 3 attempts were recorded as blocked (${h.ledger.blocked.length - before} new)`);
  h.assert(h.ledger.continuedExternal === 0, "none was continued to the network");
}
