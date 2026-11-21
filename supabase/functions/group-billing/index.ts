// Capstone Plus for Groups, admin pays (sql/047). Two actions for the CALLING account, which must be
// the class's owner:
//
//   { action: "checkout",  class_id, return_to }  -> { url }  Stripe Checkout for the class's seats
//   { action: "add_seats", class_id, add }         -> { ok, quantity }  quantity up, prorated
//
// Nothing here grants access. stripe-webhook records what Stripe says (sql/047
// group_apply_subscription_event), and that is what activates the class and writes every member's
// 'group' entitlement.
//
// SECURITY (same two doors as create-checkout-session)
//   * The account comes from the caller's access token (Auth getUser) and nowhere else. Guests are
//     refused.
//   * The class owner is checked here with the service role, against class_staff.
//   * The PRICE and the SEAT COUNT are never taken from the request: the price is one of two
//     server-side ids (STRIPE_PRICE_GROUP_MONTHLY / _ANNUAL) chosen by the class's billing_interval,
//     and the first checkout's quantity is the class's seats_requested (5 to 200), which the owner
//     agreed to when the class was created. add_seats takes only how many to ADD, capped at 200 total.
//   * While app_settings 'paid.groups_enabled' is false (sql/047 ships it false) only the app owner
//     may start a group checkout, so the owner can rehearse in Stripe test mode first.
//   * A class that already has a live subscription is refused (409), so a double click or a second
//     tab cannot create two. (If one slips through a race, the webhook refuses to apply the second
//     and logs it: see stripeWebhook.ts.)
//   * No promotion codes on group checkouts (plan section 3).
//
// ENV: STRIPE_SECRET_KEY, STRIPE_PRICE_GROUP_MONTHLY, STRIPE_PRICE_GROUP_ANNUAL, optional APP_URL,
//   APP_RETURN_ORIGINS, STRIPE_AUTOMATIC_TAX, STRIPE_ALLOW_LIVE. Platform: SUPABASE_URL,
//   SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. See ../STRIPE-SETUP.md ("Groups").

import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, json, returnOrigin, stripeKeyOrError } from "../_shared/billingHttp.ts";
import { StripeApiError, UUID_RE, keyIsLive, stripeClient } from "../_shared/stripe.ts";
import {
  checkoutSeats,
  groupCheckoutParams,
  groupClassIdOf,
  groupPriceFor,
  planSeatIncrease,
  type GroupStripeSubscription,
} from "../_shared/groupBilling.ts";

const LIVE_STATUSES = ["active", "trialing", "past_due", "incomplete"];

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
  if (user.is_anonymous) return json({ error: "Create a free account first." }, 403);
  const uid = user.id;

  let body: { action?: unknown; class_id?: unknown; return_to?: unknown; add?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const classId = typeof body.class_id === "string" && UUID_RE.test(body.class_id) ? body.class_id.toLowerCase() : null;
  if (!classId) return json({ error: "Which class?" }, 400);
  if (body.action !== "checkout" && body.action !== "add_seats") return json({ error: "Unknown action." }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // ── 2. Is it open? Is this the class's owner? ───────────────────────────────────────────────────
  const [setting, role, staff, cls, billing] = await Promise.all([
    admin.from("app_settings").select("value").eq("key", "paid.groups_enabled").maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    admin.from("class_staff").select("role").eq("class_id", classId).eq("user_id", uid).maybeSingle(),
    admin
      .from("classes")
      .select("id, name, status, billing_mode, billing_interval, seats_requested, seats_purchased")
      .eq("id", classId)
      .maybeSingle(),
    admin.from("class_billing").select("subscription_id, status, quantity").eq("class_id", classId).maybeSingle(),
  ]);
  if (setting.error || role.error || staff.error || cls.error || billing.error) {
    return json({ error: "Could not check this class. Please try again." }, 500);
  }
  const groupsOn = setting.data?.value === true;
  const isAppOwner = role.data?.role === "owner";
  if (!groupsOn && !isAppOwner) return json({ error: "Capstone Plus for Groups isn't available yet." }, 403);
  if (!cls.data || staff.data?.role !== "owner") return json({ error: "Only the class's owner can manage its billing." }, 403);
  if (cls.data.billing_mode !== "admin_pays") return json({ error: "Each-member-pays is coming soon." }, 400);

  const stripe = stripeClient(stripeKey.key);
  const livemode = keyIsLive(stripeKey.key);
  const live = !!billing.data && LIVE_STATUSES.includes(billing.data.status as string);

  try {
    // ── 3a. add seats ─────────────────────────────────────────────────────────────────────────────
    if (body.action === "add_seats") {
      if (!live || !billing.data || cls.data.status !== "active") {
        return json({ error: "This class has no active subscription to add seats to." }, 409);
      }
      const sub = await stripe.get<GroupStripeSubscription>(`/subscriptions/${encodeURIComponent(billing.data.subscription_id)}`);
      if (groupClassIdOf(sub) !== classId) return json({ error: "That subscription is not this class's." }, 409);
      const item = sub.items?.data?.[0];
      if (!item?.id || (sub.items?.data?.length ?? 0) !== 1) return json({ error: "This subscription needs support to change." }, 409);
      const current = typeof item.quantity === "number" ? item.quantity : 0;
      const plan = planSeatIncrease(current, body.add);
      if ("error" in plan) return json({ error: plan.error }, 400);
      await stripe.post(
        `/subscriptions/${encodeURIComponent(sub.id)}`,
        { items: [{ id: item.id, quantity: plan.quantity }], proration_behavior: "create_prorations" },
        `group-seats-${sub.id}-${current}-${plan.quantity}`
      );
      return json({ ok: true, quantity: plan.quantity });
    }

    // ── 3b. first checkout ────────────────────────────────────────────────────────────────────────
    if (cls.data.status !== "draft") return json({ error: "This class has already been set up." }, 409);
    if (live) return json({ error: "This class already has a subscription.", manage: true }, 409);
    const seats = checkoutSeats(cls.data.seats_requested);
    if ("error" in seats) return json({ error: seats.error }, 400);
    const price = groupPriceFor(cls.data.billing_interval, env);
    if ("error" in price) return json({ error: price.error }, 500);

    // One Stripe customer per account (the same stripe_customers row individual Plus uses).
    const mapped = await admin.from("stripe_customers").select("customer_id").eq("user_id", uid).maybeSingle();
    if (mapped.error) return json({ error: "Could not check your billing record. Please try again." }, 500);
    let customerId = (mapped.data?.customer_id as string | undefined) ?? null;
    if (!customerId) {
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

    const origin = returnOrigin(body.return_to, env("APP_URL"), env("APP_RETURN_ORIGINS"));
    const session = await stripe.post<{ url: string }>(
      "/checkout/sessions",
      groupCheckoutParams({
        customerId,
        userId: uid,
        classId,
        className: String(cls.data.name ?? ""),
        price: price.price,
        seats: seats.seats,
        origin,
        automaticTax: env("STRIPE_AUTOMATIC_TAX") === "true",
      })
    );
    if (!session.url || !session.url.startsWith("https://checkout.stripe.com/")) {
      return json({ error: "Stripe did not return a checkout page." }, 502);
    }
    return json({ url: session.url });
  } catch (err) {
    const status = err instanceof StripeApiError ? err.status : 0;
    console.error("group-billing: Stripe call failed", { uid, classId, action: body.action, status, message: (err as Error).message });
    return json({ error: "Could not reach the payment service. Please try again." }, 502);
  }
});
