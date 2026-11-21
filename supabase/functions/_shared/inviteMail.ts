// Mail provider abstraction for Capstone Plus for Groups invites (phase 3).
//
// Two providers:
//   resendProvider  — the Resend HTTP API (plan §4). Needs RESEND_API_KEY (a secret Robbie sets; the
//                     crew never handles its value). Every send carries an Idempotency-Key so a retry
//                     of the same send id cannot become a second email.
//   dryRunProvider  — logs a masked recipient and the subject; touches no network. This is what runs
//                     whenever RESEND_API_KEY is not set, and in every test.
//
// The sending address is on a SEPARATE subdomain (default invites@invite.capstonebible.com) so a bad
// invite list cannot hurt the reputation of the password-reset mail that goes out from
// noreply@capstonebible.com through Supabase Auth's SMTP. That subdomain must be verified in Resend
// (SPF, DKIM, DMARC records) before INVITE_FROM can use it — see INVITES-SETUP.md. [M] Resend's
// domain and plan limits are from memory and must be checked before launch.

export interface OutgoingEmail {
  from: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
  /** Provider-side de-duplication key: one per send slot (invite-send-<send_id>). */
  idempotencyKey: string;
}

/**
 * ok: the provider accepted it (id = its message id, what bounce/complaint webhooks quote back).
 * definite: the provider ANSWERED with a refusal, so it certainly did not send — the slot may be
 * released and retried. A timeout or network error is NOT definite: it may have been sent.
 */
export type SendResult = { ok: true; id: string } | { ok: false; definite: boolean; status?: number; error: string };

export interface MailProvider {
  readonly name: "resend" | "dry_run";
  readonly live: boolean;
  send(m: OutgoingEmail): Promise<SendResult>;
}

export type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  status: number;
  ok: boolean;
  text(): Promise<string>;
}>;

export const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** a***@example.com — what goes in a log. Never log a full address. */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf("@");
  if (at <= 0) return "***";
  return `${address[0]}***${address.slice(at)}`;
}

export function resendProvider(apiKey: string, fetchImpl: FetchLike, timeoutMs = 10_000): MailProvider {
  return {
    name: "resend",
    live: true,
    async send(m) {
      const body: Record<string, unknown> = {
        from: m.from,
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        headers: m.headers,
      };
      if (m.replyTo) body.reply_to = m.replyTo;
      const ctrl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
      try {
        const res = await fetchImpl(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": m.idempotencyKey,
          },
          body: JSON.stringify(body),
          signal: ctrl?.signal,
        });
        const raw = await res.text().catch(() => "");
        if (res.ok) {
          let id = "";
          try {
            id = String((JSON.parse(raw) as { id?: unknown }).id ?? "");
          } catch {
            id = "";
          }
          if (!id) return { ok: false, definite: false, status: res.status, error: "accepted without a message id" };
          return { ok: true, id };
        }
        // An HTTP answer is a definite "not sent" (with the idempotency key, even a 5xx cannot have
        // produced a second copy of an earlier success).
        return { ok: false, definite: true, status: res.status, error: `resend ${res.status}` };
      } catch (e) {
        return { ok: false, definite: false, error: `network: ${(e as Error)?.name ?? "error"}` };
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

export function dryRunProvider(log: (line: string) => void): MailProvider {
  let n = 0;
  return {
    name: "dry_run",
    live: false,
    async send(m) {
      n += 1;
      log(`dry-run: would send "${m.subject}" to ${maskEmail(m.to)} (${m.idempotencyKey})`);
      return { ok: true, id: `dry_run_${n}` };
    },
  };
}

export interface ProviderChoice {
  provider: MailProvider;
  mode: "live" | "dry_run";
  reason: string;
}

/** No key, or INVITE_DRY_RUN=true: dry run. Never sends without a key, whatever else is set. */
export function providerFromEnv(env: (k: string) => string | undefined, fetchImpl: FetchLike, log: (line: string) => void): ProviderChoice {
  const key = (env("RESEND_API_KEY") ?? "").trim();
  if (!key) return { provider: dryRunProvider(log), mode: "dry_run", reason: "RESEND_API_KEY is not set" };
  if (env("INVITE_DRY_RUN") === "true") return { provider: dryRunProvider(log), mode: "dry_run", reason: "INVITE_DRY_RUN=true" };
  if (!/^re_[A-Za-z0-9_]{8,}$/.test(key)) return { provider: dryRunProvider(log), mode: "dry_run", reason: "RESEND_API_KEY does not look like a Resend key" };
  return { provider: resendProvider(key, fetchImpl), mode: "live", reason: "RESEND_API_KEY is set" };
}
