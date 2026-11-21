// Capstone Plus for Groups, phase 3: unsubscribe from invite emails (sql/049 invite_unsubscribe).
//
// Public, no login (CAN-SPAM: an opt-out must not need one). verify_jwt = false (config.toml). The
// 64-hex unsubscribe token from the email is the only credential, and the answer never says whether
// a token was known. Handles:
//   POST {token, scope: "all" | "class"}   from email/unsubscribe.html (a separate Vite page, not the app)
//   POST ?t=<token>  List-Unsubscribe=One-Click   RFC 8058, from Gmail / Yahoo / Apple Mail
//   GET  ?t=<token>  -> 303 to the page (a GET never unsubscribes: link scanners prefetch links)
// ENV: APP_URL (CORS origin and the page's address). Platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleUnsubscribe } from "../_shared/inviteHandlers.ts";

Deno.serve(async (req: Request) => {
  const env = (k: string) => Deno.env.get(k);
  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ ok: false }), { status: 500 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const body = req.method === "POST" ? (await req.text()).slice(0, 4096) : "";
  const r = await handleUnsubscribe(
    { method: req.method, url: req.url, contentType: req.headers.get("content-type") ?? "", body },
    {
      appUrl: env("APP_URL") || "https://capstonebible.com",
      unsubscribe: async (token, scope) => {
        const { data, error } = await admin.rpc("invite_unsubscribe", { p_token: token, p_scope: scope });
        if (error) throw new Error(error.message);
        return { ok: Boolean((data as { ok?: boolean } | null)?.ok) };
      },
    },
  ).catch((e) => {
    console.error("group-invite-unsubscribe: failed", (e as Error).message);
    return { status: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false }) };
  });
  return new Response(r.body || null, { status: r.status, headers: r.headers });
});
