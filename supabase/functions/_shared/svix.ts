// Webhook signature verification for the email provider's bounce / complaint events.
//
// Resend delivers webhooks through Svix [M: Resend docs, not re-read today]: three headers,
//   svix-id         the message id (we use it as the idempotency key)
//   svix-timestamp  unix seconds
//   svix-signature  space-separated "v1,<base64 HMAC-SHA256>" entries (more than one during a
//                   secret roll)
// signed content is `${id}.${timestamp}.${rawBody}`, keyed with the base64 part of the endpoint's
// "whsec_..." secret. Timestamps more than 5 minutes off are refused (replay window).
// Dependency-free (WebCrypto), like stripe.ts.

export type SvixResult = { ok: true } | { ok: false; reason: string };

function b64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function bytesToB64(bytes: ArrayBuffer): string {
  let s = "";
  const u = new Uint8Array(bytes);
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function sign(secretBytes: Uint8Array, content: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", secretBytes as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToB64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(content)));
}

export async function verifySvixSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  nowSeconds: number,
  toleranceSeconds = 300,
): Promise<SvixResult> {
  if (!secret.startsWith("whsec_")) return { ok: false, reason: "secret is not a whsec_ secret" };
  const key = b64ToBytes(secret.slice("whsec_".length));
  if (!key || key.length < 16) return { ok: false, reason: "secret is not valid base64" };
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing signature headers" };
  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: "bad timestamp" };
  if (Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) return { ok: false, reason: "timestamp outside tolerance" };
  const expected = await sign(key, `${id}.${timestamp}.${rawBody}`);
  const candidates = signature
    .split(" ")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("v1,"))
    .map((p) => p.slice(3));
  if (candidates.length === 0) return { ok: false, reason: "no v1 signature" };
  return candidates.some((c) => safeEqual(c, expected)) ? { ok: true } : { ok: false, reason: "signature mismatch" };
}

/** Builds the headers Svix would send — tests and local rehearsal only. */
export async function svixSignForTest(rawBody: string, secret: string, id: string, timestamp: number) {
  const key = b64ToBytes(secret.slice("whsec_".length));
  if (!key) throw new Error("bad secret");
  return { id, timestamp: String(timestamp), signature: `v1,${await sign(key, `${id}.${timestamp}.${rawBody}`)}` };
}
