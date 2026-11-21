// Opens the Stripe customer portal (cancel, change plan, update card, invoices) for the CALLING
// account's own Stripe customer.
//
// SECURITY: the account comes from the caller's validated access token only; the customer id comes
// from stripe_customers for that account only (service role read). Nothing in the body can name a
// customer. NOT gated on paid.billing_enabled on purpose: anyone who is paying must always be able to
// cancel, even if the switch is turned back off.
//
// ENV: STRIPE_SECRET_KEY, optional STRIPE_PORTAL_CONFIGURATION (bpc_…), APP_URL, APP_RETURN_ORIGINS,
//   STRIPE_ALLOW_LIVE. See ../STRIPE-SETUP.md.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, json, returnOrigin, stripeKeyOrError } from "../_shared/billingHttp.ts";
import { StripeApiError, UUID_RE, stripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const env = (k: string) => Deno.env.get(k);
  const supabaseUrl = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = stripeKeyOrError(env);
  if (!supabaseUrl || !anonKey || !serviceKey || "error" in stripeKey) {
    return json({ error: "error" in stripeKey ? stripeKey.error : "Payments are not configured on the server." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(authHeader)) return json({ error: "Not signed in." }, 401);
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  const user = userData?.user;
  if (userError || !user || !UUID_RE.test(user.id)) return json({ error: "Not signed in." }, 401);

  let body: { return_to?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const mapped = await admin.from("stripe_customers").select("customer_id").eq("user_id", user.id).maybeSingle();
  if (mapped.error) return json({ error: "Could not find your billing record. Please try again." }, 500);
  if (!mapped.data?.customer_id) return json({ error: "There is no subscription on this account." }, 404);

  const origin = returnOrigin(body.return_to, env("APP_URL"), env("APP_RETURN_ORIGINS"));
  const configuration = env("STRIPE_PORTAL_CONFIGURATION");
  try {
    const session = await stripeClient(stripeKey.key).post<{ url: string }>("/billing_portal/sessions", {
      customer: mapped.data.customer_id,
      return_url: `${origin}/?plus=portal`,
      ...(configuration && /^bpc_/.test(configuration) ? { configuration } : {}),
    });
    if (!session.url || !session.url.startsWith("https://billing.stripe.com/")) {
      return json({ error: "Stripe did not return a portal page." }, 502);
    }
    return json({ url: session.url });
  } catch (err) {
    const status = err instanceof StripeApiError ? err.status : 0;
    console.error("create-portal-session: Stripe call failed", { uid: user.id, status, message: (err as Error).message });
    return json({ error: "Could not open subscription management. Please try again." }, 502);
  }
});
