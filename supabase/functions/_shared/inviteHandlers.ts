// Request handling for the two public (no-login) invite endpoints, separated from Deno.serve so the
// unit tests can drive them with fake dependencies:
//
//   group-invite-unsubscribe   — the unsubscribe page's POST {token, scope} and the RFC 8058
//                                one-click POST (List-Unsubscribe-Post) from mail clients.
//   group-invite-email-events  — the provider's bounce / complaint webhook (signature verified).
//
// Neither takes a Supabase token: the 64-hex unsubscribe token, and the webhook signature, are the
// authentication. Neither ever says whether a token or an address exists.

import { verifySvixSignature } from "./svix.ts";

const TOKEN_RE = /^[0-9a-f]{64}$/;

export interface UnsubscribeDeps {
  unsubscribe(token: string, scope: "all" | "class"): Promise<{ ok: boolean }>;
  appUrl: string;
}

export interface SimpleResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export function unsubscribeCors(appUrl: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": new URL(appUrl).origin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export async function handleUnsubscribe(
  req: { method: string; url: string; contentType: string; body: string },
  deps: UnsubscribeDeps,
): Promise<SimpleResponse> {
  const cors = unsubscribeCors(deps.appUrl);
  const json = (status: number, b: unknown) => ({ status, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(b) });
  if (req.method === "OPTIONS") return { status: 204, headers: cors, body: "" };
  const url = new URL(req.url);
  const qToken = url.searchParams.get("t") ?? "";

  // A mail client or a person opening the List-Unsubscribe URL with GET: never act on a GET (link
  // scanners prefetch links); send them to the page, token in the fragment.
  if (req.method === "GET") {
    const dest = `${new URL(deps.appUrl).origin}/email/unsubscribe.html${TOKEN_RE.test(qToken) ? `#t=${qToken}` : ""}`;
    return { status: 303, headers: { Location: dest, "Cache-Control": "no-store" }, body: "" };
  }
  if (req.method !== "POST") return json(405, { ok: false });

  // RFC 8058: POST to the List-Unsubscribe URL with body "List-Unsubscribe=One-Click".
  if (/application\/x-www-form-urlencoded/i.test(req.contentType) && /(^|&)List-Unsubscribe=One-Click(&|$)/.test(req.body)) {
    if (!TOKEN_RE.test(qToken)) return json(400, { ok: false });
    await deps.unsubscribe(qToken, "all");
    return json(200, { ok: true });
  }

  let parsed: { token?: unknown; scope?: unknown } = {};
  try {
    parsed = JSON.parse(req.body || "{}");
  } catch {
    return json(400, { ok: false });
  }
  const token = typeof parsed.token === "string" ? parsed.token.toLowerCase() : "";
  const scope = parsed.scope === "class" ? "class" : "all";
  if (!TOKEN_RE.test(token)) return json(400, { ok: false });
  const r = await deps.unsubscribe(token, scope);
  return json(200, { ok: r.ok, scope });
}

export interface EmailEventDeps {
  secret: string | undefined;
  nowSeconds: number;
  record(eventId: string, kind: "bounce" | "complaint", providerId: string): Promise<{ outcome: string }>;
}

/** Resend event types [M]: email.bounced, email.complained. Everything else is acknowledged and ignored. */
export function eventKind(type: unknown): "bounce" | "complaint" | null {
  if (type === "email.bounced") return "bounce";
  if (type === "email.complained") return "complaint";
  return null;
}

export async function handleEmailEvent(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  deps: EmailEventDeps,
): Promise<SimpleResponse> {
  const json = (status: number, b: unknown) => ({ status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  if (!deps.secret) return json(500, { error: "webhook secret not configured" });
  const v = await verifySvixSignature(rawBody, headers, deps.secret, deps.nowSeconds);
  if (!v.ok) return json(401, { error: "bad signature" });
  let evt: { type?: unknown; data?: { email_id?: unknown } } = {};
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "bad json" });
  }
  const kind = eventKind(evt.type);
  const providerId = typeof evt.data?.email_id === "string" ? evt.data.email_id : "";
  if (!kind || !providerId || !headers.id) return json(200, { outcome: "ignored" });
  const r = await deps.record(headers.id, kind, providerId);
  return json(200, r);
}
