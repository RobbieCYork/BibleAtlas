// HTTP + config helpers shared by create-checkout-session and create-portal-session.
// Dependency-free like stripe.ts. Deno-only globals are touched only inside functions.

import { keyIsLive } from "./stripe.ts";

// Bearer-token auth, never cookies, so a wildcard origin grants nothing (same reasoning as
// delete-account): a hostile page without the reader's access token gets a 401 like anyone else.
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

export const DEFAULT_APP_URL = "https://capstonebible.com";

/**
 * Where Stripe sends the reader back to. NEVER taken from the request unless the requested origin is
 * on the configured allow-list: an open redirect from checkout.stripe.com to anywhere would make a
 * convincing phishing link. APP_URL is the default; APP_RETURN_ORIGINS (comma-separated) lets the
 * owner rehearse test mode from localhost or a preview deploy.
 */
export function returnOrigin(requested: unknown, appUrl: string | undefined, extraOrigins: string | undefined): string {
  const base = new URL(appUrl || DEFAULT_APP_URL).origin;
  if (typeof requested !== "string") return base;
  let origin: string;
  try {
    origin = new URL(requested).origin;
  } catch {
    return base;
  }
  const allowed = new Set([base, ...(extraOrigins ?? "").split(",").map((s) => s.trim()).filter(Boolean)]);
  return allowed.has(origin) ? origin : base;
}

/**
 * The Stripe key, refusing a LIVE key unless STRIPE_ALLOW_LIVE=true is set deliberately. This branch
 * was built and tested in test mode only; going live is a decision, not a key paste.
 */
export function stripeKeyOrError(env: (k: string) => string | undefined): { key: string } | { error: string } {
  const key = env("STRIPE_SECRET_KEY") ?? "";
  if (!/^(sk|rk)_(test|live)_/.test(key)) return { error: "Payments are not configured on the server." };
  if (keyIsLive(key) && env("STRIPE_ALLOW_LIVE") !== "true") return { error: "Live payments are not enabled on the server." };
  return { key };
}
