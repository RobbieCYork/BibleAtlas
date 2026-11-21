# Stripe setup — Capstone Plus web payments

Branch `paid-payments` (on top of `paid-content`). Everything here was built and tested in **Stripe
test mode only**. Nothing is deployed, no migration is applied, and no Stripe object exists yet.

Pieces:

| Piece | Where |
|---|---|
| Database | `sql/045_stripe_billing.sql` (needs `sql/043` first). Proof: `sql/tests/045_stripe_billing_test.sql`, run locally with `node scripts/stripe/rls-test.mjs --local` |
| Checkout | `supabase/functions/create-checkout-session` |
| Webhook | `supabase/functions/stripe-webhook` (`verify_jwt = false`, see `config.toml`) |
| Portal | `supabase/functions/create-portal-session` |
| Shared logic + unit tests | `supabase/functions/_shared/` — `node --test supabase/functions/_shared/stripe.test.ts` |
| App UI | `src/lib/billing.ts`, `src/components/CapstonePlus.tsx`, Upgrade in `PaidTeaser.tsx`, "Capstone Plus" row in `AuthButton.tsx` |
| UI proof | `scripts/signed-in-harness/examples/billing.mjs` |

## Switches (all in `app_settings`, all ship OFF)

| Key | Default | Effect |
|---|---|---|
| `paid.billing_enabled` | `false` | Off: no Upgrade or Manage UI anywhere; `create-checkout-session` refuses everyone but the owner. |
| `paid.billing_owner_preview` | `false` | On: the owner, and only the owner, sees the billing UI. For rehearsing on production in test mode. |
| `paid.everyone_has_plus` (sql/043) | `true` | While on, every signed-in account has Plus whatever Stripe says. |

Flip with `select set_app_setting('<key>', 'true'::jsonb);` as the owner.

## 1. Stripe objects to create (test mode first, then again in live mode)

1. **Product**: "Capstone Plus".
2. **Two recurring prices** on it: monthly and yearly (amounts are Robbie's decision). Copy the two
   `price_…` ids.
3. **Customer portal** (Settings → Billing → Customer portal): allow cancel (at period end), update
   payment method, view invoices, and switching between the two prices. Optional: save it as a
   configuration and copy its `bpc_…` id; otherwise the default configuration is used.
4. **Webhook endpoint** (Developers → Webhooks → Add endpoint):
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events (exactly these five):
     `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy its signing secret (`whsec_…`).
5. Recommended: **Stripe Tax** (Washington taxes digital subscriptions; see paid-tier-plan.md
   section 4 — a CPA should confirm). Then set `STRIPE_AUTOMATIC_TAX=true`.
6. Recommended: Settings → Billing → Subscriptions and emails → after all retries fail, **cancel the
   subscription**. The app keeps access for 7 days past the period end while a payment is
   `past_due`, and removes it when Stripe cancels.

## 2. Supabase function secrets

Set with `supabase secrets set NAME=value` (or Dashboard → Edge Functions → Secrets). **Never** put
any of these in the repo, in `.env.local`, or in a report.

| Name | Required | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | `sk_test_…` (or a restricted `rk_test_…` key with write access to Customers, Checkout Sessions, Customer portal, and read access to Subscriptions) |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_…` from the endpoint above |
| `STRIPE_PRICE_MONTHLY` | yes | `price_…` |
| `STRIPE_PRICE_ANNUAL` | yes | `price_…` |
| `STRIPE_PORTAL_CONFIGURATION` | no | `bpc_…` |
| `APP_URL` | no | defaults to `https://capstonebible.com` (where Stripe sends people back) |
| `APP_RETURN_ORIGINS` | no | extra allowed return origins, comma-separated, e.g. `http://localhost:5173` for rehearsal |
| `STRIPE_AUTOMATIC_TAX` | no | `true` once Stripe Tax is set up |
| `STRIPE_TRIAL_DAYS` | no | whole number of free-trial days on new subscriptions |
| `STRIPE_ALLOW_LIVE` | no | must be `true` before a `sk_live_` / `rk_live_` key is accepted. A live key without it is refused. |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided by the platform.

The webhook ignores any event whose `livemode` does not match the key's mode, so a test-mode
endpoint can never grant real access and vice versa.

## 3. Order of operations (each step needs Robbie's word where marked)

1. Apply `sql/043` then `sql/045` to **staging**, run `sql/tests/045_stripe_billing_test.sql` there.
2. **(Robbie)** Apply both to production. Nothing changes for users: billing is off and everyone has Plus.
3. Set the test-mode secrets; deploy the three functions:
   `supabase functions deploy create-checkout-session create-portal-session stripe-webhook`
   (config.toml carries each one's `verify_jwt`).
4. Owner rehearsal on production in test mode: `paid.billing_owner_preview = true`, buy with card
   `4242 4242 4242 4242`, check `subscriptions` / `entitlements` rows appear, open Manage, cancel,
   check the stripe entitlement row is removed. Use `stripe trigger` / "Send test webhook" for the
   failure paths. Turn the preview back off.
5. **(Robbie)** Live keys + live webhook + `STRIPE_ALLOW_LIVE=true`; Terms/Privacy/Refund text
   updated (the privacy policy currently says no payment information is collected).
6. **(Robbie)** Launch: `paid.billing_enabled = true`, and — separately, on the chosen founding-member
   plan — `paid.everyone_has_plus = false`.

## Known gaps before launch (not built here)

- **Account deletion does not cancel a Stripe subscription.** `delete-account` removes the
  account (and, by cascade, its `stripe_customers` / `subscriptions` / `entitlements` rows), but
  Stripe would keep charging the card. Before `paid.billing_enabled` is turned on, `delete-account`
  must cancel the customer's live subscriptions (or delete the Stripe customer) first, and the
  deletion notice must mention it. The webhook already records later events for a deleted account
  as `user_missing` instead of retrying forever.
- Prices are not shown in the app; Stripe Checkout shows the amount, tax and renewal terms.
- No email receipts configuration (Stripe settings → Emails).

## Out of scope: the store apps

Apple 3.1.1 requires in-app purchase for digital content unlocked inside the iOS app, and 3.1.3(b)
lets web-bought Plus unlock the app only if Plus is also sold as IAP there. The store build therefore
needs its own purchase flow (StoreKit / Play Billing, e.g. via RevenueCat) writing `app_store` /
`play_store` rows into the same `entitlements` table. `src/lib/billing.ts` hides every Stripe control
inside a native (Capacitor) build so the store app never shows a link to web checkout. Revisit only
if the US link-out rules (3.1.1(a)) are deliberately adopted.
