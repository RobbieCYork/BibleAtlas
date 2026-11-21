// Receives Stripe webhook events and turns them into Capstone Plus entitlements.
//
// This is the ONLY code that grants Plus from a payment. Nothing a browser sends can reach it with
// effect: every request must carry a valid Stripe-Signature over its exact bytes, made with the
// endpoint's secret (STRIPE_WEBHOOK_SECRET), within 5 minutes. The platform JWT check is OFF for this
// function (config.toml: verify_jwt = false) because Stripe sends no Supabase token; the signature is
// the authentication.
//
// FLOW: verify signature -> parse -> livemode must match the key's mode -> handleStripeEvent
//   (../_shared/stripeWebhook.ts): re-fetch the subscription from Stripe, resolve the account, and
//   call sql/045 stripe_apply_subscription_event(), which records the event id and writes the
//   subscription + entitlement in ONE transaction. A Capstone Plus for Groups subscription
//   (metadata capstone_kind = group) goes to sql/047 group_apply_subscription_event() instead, which
//   writes class_billing and every member's 'group' entitlement the same way; if the class has an
//   end date the subscription is then set to cancel_at the end of that day.
// RESPONSES: 400 bad signature/body (Stripe will not fix it by retrying, but shows it in the
//   dashboard); 200 for everything handled, ignored or duplicate; 500 on any failure, so Stripe
//   retries (for up to 3 days) and nothing half-written is left behind.
//
// ENV: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, optional STRIPE_ALLOW_LIVE.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { stripeKeyOrError } from "../_shared/billingHttp.ts";
import { UUID_RE, keyIsLive, stripeClient, verifyStripeSignature, type StripeEvent, type StripeSubscription } from "../_shared/stripe.ts";
import { handleStripeEvent } from "../_shared/stripeWebhook.ts";

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const env = (k: string) => Deno.env.get(k);
  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = env("STRIPE_WEBHOOK_SECRET") ?? "";
  const stripeKey = stripeKeyOrError(env);
  if (!supabaseUrl || !serviceKey || !webhookSecret || "error" in stripeKey) {
    console.error("stripe-webhook: not configured");
    return reply({ error: "not configured" }, 500);
  }

  // Raw bytes first. Parsing before verifying would let a re-serialised body fail (or pass) wrongly.
  const raw = await req.text();
  if (raw.length > 512 * 1024) return reply({ error: "payload too large" }, 413);
  const sig = await verifyStripeSignature(raw, req.headers.get("Stripe-Signature"), webhookSecret);
  if (!sig.ok) {
    console.warn("stripe-webhook: rejected", { reason: sig.reason });
    return reply({ error: "invalid signature" }, 400);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return reply({ error: "invalid json" }, 400);
  }
  if (typeof event?.id !== "string" || !/^evt_/.test(event.id) || typeof event.type !== "string" || typeof event.created !== "number") {
    return reply({ error: "not an event" }, 400);
  }

  // A test-mode event must never touch a live database's entitlements, and vice versa.
  if (event.livemode !== keyIsLive(stripeKey.key)) {
    console.warn("stripe-webhook: livemode mismatch, ignored", { event: event.id, livemode: event.livemode });
    return reply({ received: true, outcome: "ignored_mode" });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const stripe = stripeClient(stripeKey.key);

  try {
    const outcome = await handleStripeEvent(event, {
      retrieveSubscription: (id) =>
        stripe.get<StripeSubscription>(`/subscriptions/${encodeURIComponent(id)}`),
      retrieveCustomerUserId: async (customerId) => {
        const c = await stripe.get<{ deleted?: boolean; metadata?: Record<string, string> }>(
          `/customers/${encodeURIComponent(customerId)}`
        );
        const v = c.deleted ? null : c.metadata?.supabase_user_id ?? null;
        return v && UUID_RE.test(v) ? v : null;
      },
      findUserByCustomer: async (customerId) => {
        const { data, error } = await admin.from("stripe_customers").select("user_id").eq("customer_id", customerId).maybeSingle();
        if (error) throw error;
        return (data?.user_id as string | undefined) ?? null;
      },
      isProcessed: async (eventId) => {
        const { data, error } = await admin.from("stripe_events").select("id").eq("id", eventId).maybeSingle();
        if (error) throw error;
        return !!data;
      },
      apply: async (a) => {
        const { data, error } = await admin.rpc("stripe_apply_subscription_event", {
          p_event_id: a.eventId,
          p_type: a.type,
          p_created: a.createdIso,
          p_livemode: a.livemode,
          p_user_id: a.userId,
          p_customer_id: a.customerId,
          p_sub: a.sub,
        });
        if (error) throw error;
        return String(data);
      },
      record: async (a) => {
        const { data, error } = await admin.rpc("stripe_record_event", {
          p_event_id: a.eventId,
          p_type: a.type,
          p_created: a.createdIso,
          p_livemode: a.livemode,
          p_outcome: a.outcome,
        });
        if (error) throw error;
        return data === true;
      },
      // Capstone Plus for Groups (sql/047). Routed here only when the subscription's metadata says
      // capstone_kind = group (written by group-billing, never by a browser).
      applyGroup: async (a) => {
        const { data, error } = await admin.rpc("group_apply_subscription_event", {
          p_event_id: a.eventId,
          p_type: a.type,
          p_created: a.createdIso,
          p_livemode: a.livemode,
          p_class_id: a.classId,
          p_payer_user_id: a.payerUserId,
          p_customer_id: a.customerId,
          p_sub: a.sub,
        });
        if (error) throw error;
        const r = (data ?? {}) as { outcome?: unknown; cancel_at_wanted?: unknown };
        return {
          outcome: String(r.outcome),
          cancel_at_wanted: typeof r.cancel_at_wanted === "number" ? r.cancel_at_wanted : null,
        };
      },
      setCancelAt: async (subscriptionId, cancelAt) => {
        await stripe.post(
          `/subscriptions/${encodeURIComponent(subscriptionId)}`,
          { cancel_at: cancelAt, proration_behavior: "none" },
          `group-cancel-at-${subscriptionId}-${cancelAt}`
        );
      },
      log: (message, detail) => console.warn(message, detail ?? {}),
    });
    console.log("stripe-webhook: handled", { event: event.id, type: event.type, outcome });
    return reply({ received: true, outcome });
  } catch (err) {
    const e = err as { message?: string; code?: string };
    console.error("stripe-webhook: failed, Stripe will retry", { event: event.id, type: event.type, code: e?.code, message: e?.message });
    return reply({ error: "processing failed" }, 500);
  }
});
