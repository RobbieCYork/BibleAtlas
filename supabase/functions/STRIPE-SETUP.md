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
| Shared logic + unit tests | `supabase/functions/_shared/` — `node --test supabase/functions/_shared/stripe.test.ts supabase/functions/_shared/stripeCancel.test.ts` |
| Cancel on account deletion | `delete-account` step 3c → `_shared/stripeCancel.ts` |
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
| `STRIPE_SECRET_KEY` | yes | `sk_test_…` (or a restricted `rk_test_…` key with write access to Customers, Checkout Sessions, Customer portal **and Subscriptions** — `delete-account` cancels subscriptions with it, and a key that cannot will make every paying subscriber's account deletion fail closed). Set it on `delete-account` too: Supabase function secrets are project-wide, so one `supabase secrets set` covers all four functions |
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
3. Set the test-mode secrets; deploy the three functions **and the updated `delete-account`**:
   `supabase functions deploy create-checkout-session create-portal-session stripe-webhook delete-account`
   (config.toml carries each one's `verify_jwt`). Deploying `delete-account` from this branch is
   safe before 045 is applied: with no billing tables the cancel step is a no-op.
4. Owner rehearsal on production in test mode: `paid.billing_owner_preview = true`, buy with card
   `4242 4242 4242 4242`, check `subscriptions` / `entitlements` rows appear, open Manage, cancel,
   check the stripe entitlement row is removed. Use `stripe trigger` / "Send test webhook" for the
   failure paths. Then, with a **separate throwaway test account** that has an active test
   subscription, delete the account in the app and check in the Stripe dashboard that the
   subscription is cancelled (not "cancels at period end") and the account is gone. Turn the preview
   back off.
5. **(Robbie)** Live keys + live webhook + `STRIPE_ALLOW_LIVE=true`; Terms/Privacy/Refund text
   updated (the privacy policy currently says no payment information is collected).
6. **(Robbie)** Launch: `paid.billing_enabled = true`, and — separately, on the chosen founding-member
   plan — `paid.everyone_has_plus = false`.

## Known gaps before launch (not built here)

- **Account deletion and Stripe — built; the notice text is still open.** `delete-account` now
  cancels every non-terminal subscription of the account's Stripe customer(s) IMMEDIATELY (Stripe
  defaults: no proration refund) before it deletes anything, listing them from Stripe rather than
  trusting the `subscriptions` table. If a cancel cannot be confirmed, nothing is deleted and the
  person is told why. It is a no-op when 045 is not applied, when there is no Stripe customer, and
  for test-mode customers when no test key is set; a **live-mode** customer with no live key fails
  closed. It deliberately ignores `paid.billing_enabled` (billing can be switched off with
  subscribers still on it). Rules and reasons: `_shared/stripeCancel.ts`. The webhook records the
  resulting `customer.subscription.deleted` for a deleted account as `user_missing`.
  **Still open:** the deletion notice (`src/data/accountDeletionNotice.ts`, which also generates
  the public /delete-account page) does not yet say that a Capstone Plus subscription is cancelled
  immediately with no refund of the unused period. Copy change; content lane, before launch.
- Prices are not shown in the app; Stripe Checkout shows the amount, tax and renewal terms.
- No email receipts configuration (Stripe settings → Emails).

## Groups: Capstone Plus for Groups, admin pays (branch `groups-classes`, sql/047)

Built and unit-tested only. **Nothing deployed, no migration applied, no Stripe object exists.**
Plan: `automation/manager/groups-feature-plan.md` sections 3 and 10 (phases 1-2).

| Piece | Where |
|---|---|
| Database | `sql/047_groups_classes.sql` (needs 033, 043, 045 first). Proof: `node scripts/groups/rls-test.mjs --local` (and `--mutations`) |
| Checkout + add seats | `supabase/functions/group-billing` (`verify_jwt = true`) |
| Webhook | the existing `stripe-webhook`: a subscription whose metadata says `capstone_kind = group` goes to `group_apply_subscription_event()` instead of the individual path |
| Shared logic + tests | `_shared/groupBilling.ts`, `node --test supabase/functions/_shared/groupBilling.test.ts` |
| App | `src/lib/groups.ts`, `src/lib/groupWording.ts`, `src/lib/groupAgreement.ts` (DRAFT FOR COUNSEL), `src/components/GroupsSheet.tsx`; "Classes & Groups" row in the account menu |
| UI proof | `scripts/signed-in-harness/examples/groups.mjs` (personas teacher / student / outsider) |

**Stripe objects (test mode first):** product "Capstone Plus for Groups"; two **licensed per-seat** recurring
prices, $3.25/month and $32.50/year (Robbie's decision; the app prints these as an estimate from
`src/lib/groupWording.ts`, so change both together). No new webhook events: the five above cover it.

**Secrets (names only; Robbie sets the values):**

| Name | Value |
|---|---|
| `STRIPE_PRICE_GROUP_MONTHLY` | `price_…` of the $3.25/seat/month price |
| `STRIPE_PRICE_GROUP_ANNUAL` | `price_…` of the $32.50/seat/year price |

Everything else (`STRIPE_SECRET_KEY`, `APP_URL`, `APP_RETURN_ORIGINS`, `STRIPE_AUTOMATIC_TAX`,
`STRIPE_ALLOW_LIVE`) is shared with individual Plus.

**Switches:** `paid.groups_enabled` (false: no Classes & Groups UI for anyone and `group-billing` refuses
everyone but the app owner) and `paid.groups_owner_preview` (true: the owner alone sees the UI, to rehearse
in test mode).

**How it works:** signup calls `create_group_class()` (class `draft`, agreement recorded) then
`group-billing {action: "checkout", class_id}`; the function reads the seat count and interval from the class,
not the request, and opens Checkout with a fixed quantity and no promotion codes. The webhook writes
`class_billing`, activates the class, and derives a `group` entitlement for the owner (5+ seats) and every
active member. A class with an end date gets `cancel_at` = end of that day (set by the webhook; Checkout
cannot). `add_seats` raises the quantity with `create_prorations`. Deleting the owner's account cancels the
subscription through the existing `delete-account` step (it lives on the owner's customer).

**Rehearsal (needs Robbie's word for each migration):** apply 033, 043, 045, 047 to staging; set the two
price secrets; deploy `group-billing` and the updated `stripe-webhook`; `paid.groups_owner_preview = true`;
start a group as the owner, pay with `4242 4242 4242 4242`, check `class_billing`, the class is `active`, and
`entitlements` has a `group` row; join from a second test account with the code; add seats; check the
subscription's `cancel_at` in the Stripe dashboard equals the class end. **[UNVERIFIED]** `cancel_at` via
`POST /v1/subscriptions/:id` and per-seat quantity proration are from Stripe's docs/memory, not yet exercised.

**Not built (later phases):** invites and reminders (3), assignments (4), verification and badge (5),
reviews (6), member-pays (7), SMS (8), lowering seats, changing the end date after checkout (Stripe
`cancel_at` would need moving), invoicing/PO.

## Out of scope: the store apps

Apple 3.1.1 requires in-app purchase for digital content unlocked inside the iOS app, and 3.1.3(b)
lets web-bought Plus unlock the app only if Plus is also sold as IAP there. The store build therefore
needs its own purchase flow (StoreKit / Play Billing, e.g. via RevenueCat) writing `app_store` /
`play_store` rows into the same `entitlements` table. `src/lib/billing.ts` hides every Stripe control
inside a native (Capacitor) build so the store app never shows a link to web checkout. Revisit only
if the US link-out rules (3.1.1(a)) are deliberately adopted.
