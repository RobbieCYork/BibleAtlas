// Capstone Plus for Groups, phase 3: sends due invite and reminder emails (sql/049).
//
// Called on a schedule (pg_cron + pg_net, every 10 minutes — see ../INVITES-SETUP.md), never by the
// app. verify_jwt = false (config.toml): the caller is the database's cron job, authenticated by the
// INVITE_CRON_SECRET shared secret in the x-cron-secret header, compared in constant time.
//
// Sends NOTHING unless every one of these holds:
//   * RESEND_API_KEY is set (otherwise: dry run — logs a sample, claims nothing, sends nothing);
//   * MAIL_POSTAL_ADDRESS is set (otherwise: refused — CAN-SPAM);
//   * app_settings invites.sending_enabled = true (otherwise invite_claim_due returns nothing);
//   * the invite's teacher has groups enabled (paid.groups_enabled, or the owner in preview).
// The database decides what is due; this file only wires the real clock, database and provider into
// _shared/inviteMailer.ts.
//
// ENV (names only; Robbie sets values): RESEND_API_KEY, MAIL_POSTAL_ADDRESS, INVITE_CRON_SECRET,
//   optional INVITE_FROM (default "Capstone Bible <invites@invite.capstonebible.com>"),
//   INVITE_REPLY_TO, INVITE_REPORT_URL, INVITE_BATCH (default 50), INVITE_DRY_RUN, APP_URL.
//   Platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { providerFromEnv, type FetchLike } from "../_shared/inviteMail.ts";
import { runMailer, type FullNoticeClaim, type InviteClaim } from "../_shared/inviteMailer.ts";

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const env = (k: string) => Deno.env.get(k);
  const cronSecret = env("INVITE_CRON_SECRET") ?? "";
  if (cronSecret.length < 32 || !safeEqual(req.headers.get("x-cron-secret") ?? "", cronSecret)) {
    return reply({ error: "forbidden" }, 403);
  }
  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return reply({ error: "not configured" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const log = (line: string) => console.log(`group-invite-mailer: ${line}`);
  const choice = providerFromEnv(env, fetch as unknown as FetchLike, log);
  const appUrl = env("APP_URL") || "https://capstonebible.com";

  const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await admin.rpc(fn, args);
    if (error) throw new Error(`${fn}: ${error.message}`);
    return data as T;
  };

  try {
    const result = await runMailer({
      db: {
        claimDue: (nowIso, limit) => rpc<InviteClaim[]>("invite_claim_due", { p_now: nowIso, p_limit: limit }).then((d) => d ?? []),
        markSent: (sendId, providerId) => rpc<void>("invite_mark_sent", { p_send_id: sendId, p_provider_id: providerId }),
        markFailed: (sendId, error) => rpc<void>("invite_mark_failed", { p_send_id: sendId, p_error: error }),
        claimFullNotices: (nowIso) => rpc<FullNoticeClaim[]>("invite_full_notices_claim", { p_now: nowIso }).then((d) => d ?? []),
      },
      provider: choice.provider,
      mode: choice.mode,
      modeReason: choice.reason,
      config: {
        appUrl,
        functionsUrl: `${supabaseUrl.replace(/\/+$/, "")}/functions/v1`,
        from: env("INVITE_FROM") || "Capstone Bible <invites@invite.capstonebible.com>",
        replyTo: env("INVITE_REPLY_TO") || null,
        postalAddress: env("MAIL_POSTAL_ADDRESS") || null,
        reportUrl: env("INVITE_REPORT_URL") || "mailto:admin@capstonebible.com?subject=Report%20an%20invite",
        batch: Number(env("INVITE_BATCH") || 50) || 50,
      },
      clock: () => new Date(),
      log,
    });
    return reply(result);
  } catch (e) {
    console.error("group-invite-mailer: failed", (e as Error).message);
    return reply({ error: "failed" }, 500);
  }
});
