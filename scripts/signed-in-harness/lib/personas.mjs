/**
 * Personas: who the fake session says you are, and what the fake backend then answers about you.
 * The ids are fixed, obviously-fake UUIDs so nothing here can ever collide with a real account.
 */
import { createHmac } from "node:crypto";

export const FAKE_HOST = "harness-fake.supabase.invalid"; // .invalid never resolves (RFC 6761)
export const FAKE_URL = `https://${FAKE_HOST}`;
export const FAKE_ANON_KEY = "harness-fake-anon-key";
/** supabase-js derives its storage key from the first label of the project host. */
export const STORAGE_KEY = `sb-${FAKE_HOST.split(".")[0]}-auth-token`;

const THROWAWAY_SECRET = "harness-throwaway-not-a-real-secret";
const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");

/** HS256 JWT signed with a throwaway key. The client only decodes it; nothing verifies it. */
export function fakeJwt(claims) {
  const head = b64u({ alg: "HS256", typ: "JWT" });
  const body = b64u(claims);
  const sig = createHmac("sha256", THROWAWAY_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/**
 * role: what current_user_role() answers (null for an ordinary member).
 * admin: has a row in admin_users (the older admin gate, see fetchIsAdmin).
 */
export const PERSONAS = {
  member: { id: id(1), email: "member@harness.invalid", name: "Harness Member", role: null, admin: false, anonymous: false },
  advisor: { id: id(2), email: "advisor@harness.invalid", name: "Harness Advisor", role: "advisor", admin: false, anonymous: false },
  administrator: { id: id(3), email: "administrator@harness.invalid", name: "Harness Admin", role: "administrator", admin: true, anonymous: false },
  owner: { id: id(4), email: "owner@harness.invalid", name: "Harness Owner", role: "owner", admin: true, anonymous: false },
  guest: { id: id(5), email: null, name: null, role: null, admin: false, anonymous: true },
  signedout: null,
};

export function personaUser(p) {
  const now = new Date().toISOString();
  return {
    id: p.id,
    aud: "authenticated",
    role: "authenticated",
    email: p.email ?? undefined,
    email_confirmed_at: p.anonymous ? undefined : now,
    phone: "",
    app_metadata: { provider: p.anonymous ? "anonymous" : "email", providers: [p.anonymous ? "anonymous" : "email"] },
    user_metadata: p.name ? { display_name: p.name } : {},
    identities: [],
    created_at: now,
    updated_at: now,
    is_anonymous: p.anonymous,
  };
}

/** A complete supabase-js session object for a persona; expires in ten years so it never refreshes. */
export function personaSession(p) {
  const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
  const access_token = fakeJwt({
    sub: p.id, aud: "authenticated", role: "authenticated", email: p.email ?? undefined,
    is_anonymous: p.anonymous, session_id: id(900), iat: Math.floor(Date.now() / 1000), exp,
  });
  return {
    access_token,
    refresh_token: "harness-fake-refresh-token",
    token_type: "bearer",
    expires_in: exp - Math.floor(Date.now() / 1000),
    expires_at: exp,
    user: personaUser(p),
  };
}
