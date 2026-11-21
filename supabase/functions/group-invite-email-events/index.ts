// Capstone Plus for Groups, phase 3: the email provider's bounce / complaint webhook.
//
// verify_jwt = false (config.toml): the provider sends no Supabase token. The Svix signature
// (RESEND_WEBHOOK_SECRET, "whsec_...") is the authentication, checked over the RAW body before
// anything is parsed. email.bounced -> the address is suppressed (reason bounce), email.complained
// -> suppressed (reason complaint) and the inviting teacher's invites pause (sql/049
// invite_sender_paused). Idempotent on svix-id. A stub until the provider account exists: the event
// names and payload shape are [M] (Resend docs from memory) and must be checked with a test event.
// ENV: RESEND_WEBHOOK_SECRET. Platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleEmailEvent } from "../_shared/inviteHandlers.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  const env = (k: string) => Deno.env.get(k);
  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ error: "not configured" }), { status: 500 });
  const raw = await req.text();
  if (raw.length > 256 * 1024) return new Response(JSON.stringify({ error: "payload too large" }), { status: 413 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const r = await handleEmailEvent(
      raw,
      { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") },
      {
        secret: env("RESEND_WEBHOOK_SECRET"),
        nowSeconds: Math.floor(Date.now() / 1000),
        record: async (eventId, kind, providerId) => {
          const { data, error } = await admin.rpc("invite_provider_event", { p_event_id: eventId, p_kind: kind, p_provider_id: providerId });
          if (error) throw new Error(error.message);
          return { outcome: String((data as { outcome?: string } | null)?.outcome ?? "unknown") };
        },
      },
    );
    return new Response(r.body, { status: r.status, headers: r.headers });
  } catch (e) {
    // 500 makes the provider retry; the event id keeps a retry from applying twice.
    console.error("group-invite-email-events: failed", (e as Error).message);
    return new Response(JSON.stringify({ error: "failed" }), { status: 500 });
  }
});
