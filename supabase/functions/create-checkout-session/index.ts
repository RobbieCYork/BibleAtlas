// Starts a Capstone Plus subscription: returns the URL of a Stripe Checkout page for the CALLING
// account. The browser then goes there; Stripe takes the card; the stripe-webhook function writes the
// entitlement when Stripe says it is paid. Nothing here grants access — only the webhook does.
//
// SECURITY
//   * The account comes from the caller's access token, validated by Supabase Auth (getUser), and
//     from nowhere else — same rule as delete-account. The body is read for `plan` and `return_to`.
//   * The PRICE is never taken from the request: `plan` picks one of two server-side price ids
//     (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL). A client cannot buy Plus for a price we did not set.
//   * Guests (anonymous accounts) are refused: a guest account is thrown away on sign-out, and so
//     would be what they paid for.
//   * While app_settings 'paid.billing_enabled' is false (sql/045 ships it false) only the owner may
//     start a checkout, so the owner can rehearse in test mode before anyone sees a button.
//   * An account that already has a live subscription is sent to the portal instead (409), so a
//     double click cannot create two subscriptions.
//
// ENV (Supabase function secrets): STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL,
//   optional APP_URL, APP_RETURN_ORIGINS, STRIPE_AUTOMATIC_TAX, STRIPE_ALLOW_LIVE, STRIPE_TRIAL_DAYS.
//   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
//   See ../STRIPE-SETUP.md.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, json, returnOrigin, stripeKeyOrError } from "../_shared/billingHttp.ts";
import { StripeApiError, UUID_RE, keyIsLive, stripeClient } from "../_shared/stripe.ts";

const LIVE_STATUSES = ["active", "trialing", "past_due"];

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

  // ── 1. Who is calling? ──────────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(authHeader)) return json({ error: "Not signed in." }, 401);
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  const user = userData?.user;
  if (userError || !user || !UUID_RE.test(user.id)) return json({ error: "Not signed in." }, 401);
  if (user.is_anonymous) return json({ error: "Create a free account first, then you can subscribe." }, 403);
  const uid = user.id;

  // ── 2. What are they asking for? ────────────────────────────────────────────────────────────────
  let body: { plan?: unknown; return_to?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const priceId = body.plan === "monthly" ? env("STRIPE_PRICE_MONTHLY") : body.plan === "annual" ? env("STRIPE_PRICE_ANNUAL") : undefined;
  if (body.plan !== "monthly" && body.plan !== "annual") return json({ error: "Choose monthly or annual." }, 400);
  if (!priceId || !/^price_/.test(priceId)) return json({ error: "That plan is not configured on the server." }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // ── 3. Is billing open? (owner may rehearse while it is not) ────────────────────────────────────
  const [setting, role] = await Promise.all([
    admin.from("app_settings").select("value").eq("key", "paid.billing_enabled").maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
  ]);
  const billingOn = !setting.error && setting.data?.value === true;
  const isOwner = !role.error && role.data?.role === "owner";
  if (!billingOn && !isOwner) return json({ error: "Capstone Plus isn't available to buy yet." }, 403);

  // ── 4. Already subscribed? ──────────────────────────────────────────────────────────────────────
  const existing = await admin.from("subscriptions").select("id").eq("user_id", uid).in("status", LIVE_STATUSES).limit(1);
  if (existing.error) return json({ error: "Could not check your subscription. Please try again." }, 500);
  if ((existing.data ?? []).length > 0) {
    return json({ error: "You already have Capstone Plus. Use Manage subscription to change it.", manage: true }, 409);
  }

  const stripe = stripeClient(stripeKey.key);
  const livemode = keyIsLive(stripeKey.key);

  try {
    // ── 5. One Stripe customer per account ────────────────────────────────────────────────────────
    let customerId: string | null = null;
    const mapped = await admin.from("stripe_customers").select("customer_id").eq("user_id", uid).maybeSingle();
    if (mapped.error) return json({ error: "Could not check your billing record. Please try again." }, 500);
    customerId = mapped.data?.customer_id ?? null;
    if (!customerId) {
      // The idempotency key makes two racing requests for the same account get the SAME customer
      // from Stripe (for 24 hours), and the insert below lets the first writer win.
      const customer = await stripe.post<{ id: string }>(
        "/customers",
        { email: user.email ?? undefined, metadata: { supabase_user_id: uid } },
        `capstone-customer-${uid}`
      );
      const ins = await admin
        .from("stripe_customers")
        .upsert({ user_id: uid, customer_id: customer.id, livemode }, { onConflict: "user_id", ignoreDuplicates: true });
      if (ins.error) return json({ error: "Could not save your billing record. Please try again." }, 500);
      const reread = await admin.from("stripe_customers").select("customer_id").eq("user_id", uid).single();
      if (reread.error) return json({ error: "Could not save your billing record. Please try again." }, 500);
      customerId = reread.data.customer_id as string;
    }

    // ── 6. The Checkout Session ───────────────────────────────────────────────────────────────────
    const origin = returnOrigin(body.return_to, env("APP_URL"), env("APP_RETURN_ORIGINS"));
    const trialDays = Number(env("STRIPE_TRIAL_DAYS") ?? "0");
    const session = await stripe.post<{ url: string }>("/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      client_reference_id: uid,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { supabase_user_id: uid },
      subscription_data: {
        metadata: { supabase_user_id: uid },
        ...(Number.isInteger(trialDays) && trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
      ...(env("STRIPE_AUTOMATIC_TAX") === "true"
        ? { automatic_tax: { enabled: true }, customer_update: { address: "auto" } }
        : {}),
      allow_promotion_codes: true,
      success_url: `${origin}/?plus=success`,
      cancel_url: `${origin}/?plus=cancel`,
    });
    if (!session.url || !session.url.startsWith("https://checkout.stripe.com/")) {
      return json({ error: "Stripe did not return a checkout page." }, 502);
    }
    return json({ url: session.url });
  } catch (err) {
    const status = err instanceof StripeApiError ? err.status : 0;
    console.error("create-checkout-session: Stripe call failed", { uid, status, message: (err as Error).message });
    return json({ error: "Could not start checkout. Please try again." }, 502);
  }
});
