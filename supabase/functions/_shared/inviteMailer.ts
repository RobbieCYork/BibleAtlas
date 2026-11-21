// The invite mailer's logic, separated from Deno.serve so it runs under `node --test` with a fake
// clock, a fake database and a fake provider (invites.test.ts). The database decides WHAT is due
// (sql/049 invite_claim_due: schedule, quiet hours, caps, stop rules, idempotency); this only renders,
// sends and reports back.
//
// SAFETY ORDER, every run:
//   1. dry run (no RESEND_API_KEY)      -> claims NOTHING (a claim advances the schedule and makes
//                                          tokens; doing that without sending would silently skip
//                                          people's invites). Logs one rendered sample, returns.
//   2. live without MAIL_POSTAL_ADDRESS -> refuses before claiming (CAN-SPAM needs the address).
//   3. live                             -> claim, send each with Idempotency-Key, confirm or release.

import { renderFullNotice, renderInviteEmail, type InviteKind } from "./inviteEmail.ts";
import type { MailProvider, OutgoingEmail } from "./inviteMail.ts";
import { maskEmail } from "./inviteMail.ts";

export interface InviteClaim {
  send_id: number;
  invite_id: string;
  seq: number;
  stage: "invite" | "reminder";
  to: string;
  kind: InviteKind;
  class_name: string;
  org_name: string | null;
  teacher_name: string | null;
  personal_note: string | null;
  expires_at: string | null;
  join_token: string;
  unsub_token: string;
}

export interface FullNoticeClaim {
  class_id: string;
  kind: InviteKind;
  class_name: string;
  seats: number;
  to: string;
}

export interface MailerDb {
  claimDue(nowIso: string, limit: number): Promise<InviteClaim[]>;
  markSent(sendId: number, providerId: string): Promise<void>;
  markFailed(sendId: number, error: string): Promise<void>;
  claimFullNotices(nowIso: string): Promise<FullNoticeClaim[]>;
}

export interface MailerConfig {
  /** https://capstonebible.com — where join links and the unsubscribe page live. */
  appUrl: string;
  /** https://<ref>.supabase.co/functions/v1 — for the List-Unsubscribe one-click POST. */
  functionsUrl: string;
  from: string;
  replyTo: string | null;
  postalAddress: string | null;
  reportUrl: string;
  batch: number;
}

export interface MailerResult {
  mode: "live" | "dry_run" | "refused";
  reason?: string;
  claimed: number;
  sent: number;
  failed: number;
  unknown: number;
  notices: number;
}

const TOKEN_RE = /^[0-9a-f]{64}$/;

export function inviteUrls(cfg: Pick<MailerConfig, "appUrl" | "functionsUrl">, joinToken: string, unsubToken: string) {
  const app = cfg.appUrl.replace(/\/+$/, "");
  const fns = cfg.functionsUrl.replace(/\/+$/, "");
  return {
    joinUrl: `${app}/?joinClass=${joinToken}`,
    // Fragment, not query: the token never reaches a server log on the way to the page.
    unsubscribeUrl: `${app}/email/unsubscribe.html#t=${unsubToken}`,
    oneClickUrl: `${fns}/group-invite-unsubscribe?t=${unsubToken}`,
  };
}

export function buildInviteEmail(c: InviteClaim, cfg: MailerConfig): OutgoingEmail {
  if (!TOKEN_RE.test(c.join_token) || !TOKEN_RE.test(c.unsub_token)) throw new Error("bad token in claim");
  const u = inviteUrls(cfg, c.join_token, c.unsub_token);
  const r = renderInviteEmail({
    kind: c.kind,
    stage: c.stage,
    seq: c.seq,
    className: c.class_name,
    orgName: c.org_name ?? "",
    teacherName: c.teacher_name,
    personalNote: c.personal_note,
    joinUrl: u.joinUrl,
    unsubscribeUrl: u.unsubscribeUrl,
    reportUrl: cfg.reportUrl,
    postalAddress: cfg.postalAddress,
    expiresAt: c.expires_at,
  });
  return {
    from: cfg.from,
    to: c.to,
    replyTo: cfg.replyTo,
    subject: r.subject,
    html: r.html,
    text: r.text,
    // RFC 8058 one-click unsubscribe (what Gmail and Yahoo require of bulk senders [M]).
    headers: {
      "List-Unsubscribe": `<${u.oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    idempotencyKey: `invite-send-${c.send_id}`,
  };
}

export const SAMPLE_CLAIM: InviteClaim = {
  send_id: 0,
  invite_id: "00000000-0000-4000-8000-000000000000",
  seq: 1,
  stage: "invite",
  to: "someone@example.invalid",
  kind: "school",
  class_name: "Sample class",
  org_name: "Sample School",
  teacher_name: "Sample Teacher",
  personal_note: "See you on Tuesday.",
  expires_at: null,
  join_token: "0".repeat(64),
  unsub_token: "f".repeat(64),
};

export async function runMailer(deps: {
  db: MailerDb;
  provider: MailProvider;
  mode: "live" | "dry_run";
  modeReason: string;
  config: MailerConfig;
  clock: () => Date;
  log: (line: string) => void;
}): Promise<MailerResult> {
  const { db, provider, config, clock, log } = deps;
  const out: MailerResult = { mode: deps.mode, claimed: 0, sent: 0, failed: 0, unknown: 0, notices: 0 };

  if (deps.mode === "dry_run" || !provider.live) {
    const sample = buildInviteEmail(SAMPLE_CLAIM, config);
    log(`dry run (${deps.modeReason}): nothing claimed, nothing sent. Sample subject: "${sample.subject}"`);
    return { ...out, mode: "dry_run", reason: deps.modeReason };
  }
  if (!config.postalAddress || !config.postalAddress.trim()) {
    log("refused: MAIL_POSTAL_ADDRESS is not set (CAN-SPAM requires a postal address in every email)");
    return { ...out, mode: "refused", reason: "MAIL_POSTAL_ADDRESS is not set" };
  }

  const claims = await db.claimDue(clock().toISOString(), Math.max(1, Math.min(100, config.batch)));
  out.claimed = claims.length;
  for (const c of claims) {
    let email: OutgoingEmail;
    try {
      email = buildInviteEmail(c, config);
    } catch (e) {
      await db.markFailed(c.send_id, `render: ${(e as Error).message}`.slice(0, 200));
      out.failed++;
      continue;
    }
    const r = await provider.send(email);
    if (r.ok) {
      await db.markSent(c.send_id, r.id);
      out.sent++;
    } else if (r.definite) {
      await db.markFailed(c.send_id, r.error);
      out.failed++;
      log(`send ${c.send_id} to ${maskEmail(c.to)} refused: ${r.error}`);
    } else {
      // Unknown: leave it claimed. The database turns it into 'unknown' after 15 minutes and never
      // sends that slot again (at most once).
      out.unknown++;
      log(`send ${c.send_id} to ${maskEmail(c.to)} outcome unknown: ${r.error}`);
    }
  }

  for (const n of await db.claimFullNotices(clock().toISOString())) {
    const r = renderFullNotice({ kind: n.kind, className: n.class_name, seats: n.seats, appUrl: config.appUrl, postalAddress: config.postalAddress });
    const res = await provider.send({
      from: config.from,
      to: n.to,
      replyTo: config.replyTo,
      subject: r.subject,
      html: r.html,
      text: r.text,
      headers: {},
      idempotencyKey: `class-full-${n.class_id}-${clock().toISOString().slice(0, 10)}`,
    });
    if (res.ok) out.notices++;
    else log(`full notice for class ${n.class_id} not sent: ${res.error}`);
  }
  return out;
}
