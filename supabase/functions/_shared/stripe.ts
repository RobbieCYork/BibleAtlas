// Shared Stripe helpers for the three billing Edge Functions.
//
// Deliberately dependency-free (Web Crypto + fetch only), so the SAME file runs in Supabase's Deno
// runtime and under `node --test` (Node 24 strips the types) for the unit tests next to it. No
// `jsr:` / `npm:` import may be added here; put those in the functions' own index.ts.
//
// Nothing in this file reads an environment variable. Secrets are passed in by the caller.

/** The Stripe API version every request pins, so a dashboard upgrade cannot silently change the
 * shapes we read. 2025-03-31.basil moved `current_period_end` from the subscription onto its items
 * and `invoice.subscription` under `invoice.parent`; the readers below accept both shapes. */
export const STRIPE_API_VERSION = "2025-03-31.basil";

/** Stripe's default and recommended replay window for webhook signatures. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ------------------------------------------------------------------------------ signatures

export type SignatureResult = { ok: true; timestamp: number } | { ok: false; reason: string };

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of two equal-length hex strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/**
 * Verifies a `Stripe-Signature` header against the RAW request body, the way Stripe documents it:
 * signed payload = `${t}.${body}`, HMAC-SHA256 keyed with the endpoint's whole `whsec_…` secret,
 * compared with every `v1=` entry (there are two during a secret roll). `t` must be within
 * `toleranceSeconds` of `nowSeconds` in either direction, which is what stops a captured request
 * being replayed later. The body must be the exact bytes received: parse JSON only AFTER this.
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = SIGNATURE_TOLERANCE_SECONDS
): Promise<SignatureResult> {
  if (!secret) return { ok: false, reason: "no webhook secret configured" };
  if (!header) return { ok: false, reason: "missing Stripe-Signature header" };

  let timestamp = NaN;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") timestamp = /^\d{1,12}$/.test(v) ? Number(v) : NaN;
    else if (k === "v1" && /^[0-9a-f]{64}$/i.test(v)) signatures.push(v.toLowerCase());
  }
  if (!Number.isFinite(timestamp)) return { ok: false, reason: "no timestamp in signature header" };
  if (signatures.length === 0) return { ok: false, reason: "no v1 signature in header" };
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return { ok: false, reason: "timestamp outside tolerance" };

  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  if (!signatures.some((s) => safeEqual(s, expected))) return { ok: false, reason: "signature mismatch" };
  return { ok: true, timestamp };
}

/** Builds a header the way Stripe would — for tests and for local `stripe trigger`-less rehearsal. */
export async function signForTest(rawBody: string, secret: string, timestamp: number): Promise<string> {
  return `t=${timestamp},v1=${await hmacSha256Hex(secret, `${timestamp}.${rawBody}`)}`;
}

// ------------------------------------------------------------------------------ keys and modes

/** sk_live_ / rk_live_ keys are live mode; everything else (sk_test_, rk_test_) is test mode. */
export function keyIsLive(secretKey: string): boolean {
  return /^(sk|rk)_live_/.test(secretKey);
}

// ------------------------------------------------------------------------------ REST client

/** Stripe's form encoding: nested objects as a[b][c]=v, arrays as a[0][b]=v. */
export function formEncode(params: Record<string, unknown>): string {
  const out: string[] = [];
  const walk = (prefix: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((v, i) => walk(`${prefix}[${i}]`, v));
    else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) walk(prefix ? `${prefix}[${k}]` : k, v);
    } else out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  };
  walk("", params);
  return out.join("&");
}

export class StripeApiError extends Error {
  status: number;
  code: string | undefined;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface StripeClient {
  get<T>(path: string, query?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, params: Record<string, unknown>, idempotencyKey?: string): Promise<T>;
  /** HTTP DELETE — Stripe uses it for "cancel a subscription now" (DELETE /v1/subscriptions/:id). */
  del<T>(path: string): Promise<T>;
}

export function stripeClient(secretKey: string, fetchImpl: typeof fetch = fetch): StripeClient {
  const call = async <T>(method: "GET" | "POST" | "DELETE", path: string, body?: string, idem?: string): Promise<T> => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
    };
    if (body !== undefined) headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (idem) headers["Idempotency-Key"] = idem;
    const res = await fetchImpl(`https://api.stripe.com/v1${path}`, { method, headers, body });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
    if (!res.ok) throw new StripeApiError(res.status, json.error?.message ?? `Stripe ${res.status}`, json.error?.code);
    return json as T;
  };
  return {
    get: (path, query) => call("GET", query ? `${path}?${formEncode(query)}` : path),
    post: (path, params, idem) => call("POST", path, formEncode(params), idem),
    del: (path) => call("DELETE", path),
  };
}

// ------------------------------------------------------------------------------ shapes we read

export interface StripeEvent {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
  data: { object: Record<string, unknown> };
}

export interface StripeSubscription {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  current_period_end?: number | null;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      current_period_end?: number | null;
      price?: { id?: string; recurring?: { interval?: string } | null } | null;
    }>;
  };
}

/** What sql/045 stripe_apply_subscription_event() takes as p_sub. */
export interface NormalisedSubscription {
  id: string;
  customer: string;
  status: string;
  price_id: string | null;
  interval: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
}

const idOf = (v: unknown): string | null =>
  typeof v === "string" ? v : v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string" ? (v as { id: string }).id : null;

export const SUB_STATUSES = new Set([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

export function normaliseSubscription(sub: StripeSubscription): NormalisedSubscription {
  const item = sub.items?.data?.[0];
  const customer = idOf(sub.customer);
  if (!customer) throw new Error(`subscription ${sub.id} has no customer`);
  if (!SUB_STATUSES.has(sub.status)) throw new Error(`subscription ${sub.id} has unknown status ${sub.status}`);
  // Basil puts the period on each item; older versions on the subscription. With one item they agree.
  const periodEnds = (sub.items?.data ?? []).map((i) => i.current_period_end).filter((n): n is number => typeof n === "number");
  const periodEnd = periodEnds.length ? Math.max(...periodEnds) : typeof sub.current_period_end === "number" ? sub.current_period_end : null;
  const interval = item?.price?.recurring?.interval ?? null;
  return {
    id: sub.id,
    customer,
    status: sub.status,
    price_id: item?.price?.id ?? null,
    interval: interval && ["day", "week", "month", "year"].includes(interval) ? interval : null,
    current_period_end: periodEnd,
    cancel_at_period_end: sub.cancel_at_period_end === true,
    canceled_at: typeof sub.canceled_at === "number" ? sub.canceled_at : null,
  };
}

/** The events the webhook acts on. Subscribe the Stripe endpoint to exactly these. */
export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
] as const;

/** The subscription an event is about, or null (e.g. a one-off payment checkout). */
export function subscriptionIdOf(event: StripeEvent): string | null {
  const o = event.data?.object ?? {};
  switch (event.type) {
    case "checkout.session.completed":
      return o.mode === "subscription" ? idOf(o.subscription) : null;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return idOf(o.id);
    case "invoice.payment_failed": {
      const legacy = idOf(o.subscription);
      if (legacy) return legacy;
      const parent = o.parent as { subscription_details?: { subscription?: unknown } } | undefined;
      return idOf(parent?.subscription_details?.subscription);
    }
    default:
      return null;
  }
}
