# Invites setup: Capstone Plus for Groups phase 3 (branch `groups-invites`, sql/049)

Built and tested locally only. **Nothing deployed, no migration applied, no email sent, no provider
account, no DNS change.** Plan: `automation/manager/groups-feature-plan.md` §1 (flows B, C), §4, §5.

| Piece | Where |
|---|---|
| Database | `sql/049_groups_invites.sql` (after 033, 043, 045, 047, 048). Proof: `node scripts/groups/invites-rls-test.mjs --local` (fake clock) and `--mutations` |
| Mailer (scheduled) | `functions/group-invite-mailer` (`verify_jwt = false`, `x-cron-secret`) |
| Unsubscribe | `functions/group-invite-unsubscribe` (`verify_jwt = false`) + the page `email/unsubscribe.html` (a separate Vite page, not the app) |
| Bounce / complaint webhook (stub) | `functions/group-invite-email-events` (`verify_jwt = false`, Svix signature) |
| Shared logic + tests | `_shared/inviteEmail.ts` (templates, also used by the app's preview), `inviteMail.ts` (provider abstraction), `inviteMailer.ts`, `inviteHandlers.ts`, `svix.ts`; `node --test supabase/functions/_shared/invites.test.ts` |
| App | `src/lib/groupsJoinParam.ts` (main bundle: catches `?joinClass=`), `src/lib/groupInvites.ts`, `src/components/GroupInvites.tsx` (lazy) |
| UI proof | `scripts/signed-in-harness/examples/groups-invites.mjs` |

## Switches (all ship OFF)

| Key | Default | Effect |
|---|---|---|
| `paid.groups_enabled` (047) | `false` | No Groups UI; `create_class_invites` refuses everyone but the owner in preview |
| `invites.sending_enabled` (049) | `false` | `invite_claim_due` and `invite_full_notices_claim` return nothing: **no email can be sent** |
| `invites.daily_global_cap` (049) | `300` | Emails per rolling 24 hours, all classes together |

## Secrets (names only; Robbie sets values, the crew never handles them)

| Name | Required | Value |
|---|---|---|
| `RESEND_API_KEY` | for live mail | Resend API key. **Unset = dry run**: the mailer claims nothing and sends nothing |
| `MAIL_POSTAL_ADDRESS` | for live mail | **TODO Robbie: the LLC's physical postal address** (CAN-SPAM). Unset = the mailer refuses live mail |
| `INVITE_CRON_SECRET` | yes | 32+ random characters; the pg_cron job sends it as `x-cron-secret` |
| `RESEND_WEBHOOK_SECRET` | for bounces | `whsec_…` from the Resend webhook endpoint |
| `INVITE_FROM` | no | default `Capstone Bible <invites@invite.capstonebible.com>` |
| `INVITE_REPLY_TO`, `INVITE_REPORT_URL`, `INVITE_BATCH`, `INVITE_DRY_RUN` | no | reply-to; report-abuse link (default mailto admin@); per-run batch (50, max 100); `true` forces dry run |

## Sending domain (assumption, needs Robbie + DNS)

Invites go from a **separate subdomain**, `invite.capstonebible.com`, so a bad invite list cannot hurt
the reputation of the password-reset mail from `noreply@capstonebible.com` (Supabase Auth SMTP via
Resend). Needs: the subdomain added in Resend, its SPF / DKIM / DMARC records at GoDaddy, and a
Resend plan whose limits cover the cap above **[M: Resend plan limits not checked]**.

## Schedule (pg_cron + pg_net; the repo has no scheduler yet)

The plan calls for a scheduled job; Supabase's documented pattern is pg_cron calling the function with
pg_net **[M]**. Not in the migration on purpose (it needs the project URL and a secret from Vault).
On staging first, as the owner, after enabling `pg_cron` and `pg_net`:

```sql
select vault.create_secret('<INVITE_CRON_SECRET value>', 'invite_cron_secret');
select cron.schedule('group-invite-mailer', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/group-invite-mailer',
    headers := jsonb_build_object('content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'invite_cron_secret')),
    body := '{}'::jsonb);
$$);
```

## Order of operations (each marked step needs Robbie's word)

1. Apply 033, 043, 045, 047, 048, 049 to **staging**; run the three test files there.
2. Deploy the three functions to staging (config.toml carries `verify_jwt`). With no `RESEND_API_KEY`
   the mailer only logs a dry run.
3. **(Robbie)** Resend account, the `invite.` subdomain and DNS; `RESEND_API_KEY`, `MAIL_POSTAL_ADDRESS`
   (needs the LLC), `RESEND_WEBHOOK_SECRET`; webhook endpoint for `email.bounced` and
   `email.complained` **[M: event names]**.
4. **(Robbie)** Counsel review of the email text, the unsubscribe page, and the age question (all
   marked DRAFT FOR COUNSEL).
5. Owner rehearsal on staging: `paid.groups_owner_preview = true`, `invites.sending_enabled = true`,
   invite your own second address, check the email, the link, unsubscribe, and a test bounce.
6. **(Robbie)** Production: migrations, functions, cron, then the switches.

## Not built

App-sent SMS (phase 8, never reminders). Re-verification of the "class is full" email when seats drop
again (it re-arms only when seats are added). An admin view of suppressions. Organisation verification
(phase 5) — until then every org is "unverified" and capped at 30 invites in total.
