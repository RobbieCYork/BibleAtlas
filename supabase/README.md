# Supabase Edge Functions

One function lives here: `delete-account`, which permanently deletes the calling account. It exists
because deleting a row from `auth.users` needs the `service_role` key, and that key cannot be in a
client bundle — see the long comment at the top of `functions/delete-account/index.ts`.

## Deploying

Needs the Supabase CLI and an access token for the project. Neither is checked in.

```bash
npx supabase functions deploy delete-account --project-ref dtjwkrcrcpdulzyyacrz
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected into every Edge
Function by the platform. **Do not set them as secrets**, and do not put them in this repo.

## Checking it deployed

There is no safe smoke test that ends in a deleted account, so test the refusals instead — each one
proves a different half of the authorisation, and none of them destroys anything:

```bash
# No token at all -> 401. (Gateway; verify_jwt.)
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  https://dtjwkrcrcpdulzyyacrz.supabase.co/functions/v1/delete-account

# The anon key as the bearer token -> 401. Proves the gateway is not the check that matters:
# the key that gets past the door is not a user, so getUser() refuses it.
curl -s -X POST https://dtjwkrcrcpdulzyyacrz.supabase.co/functions/v1/delete-account \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" -H 'Content-Type: application/json' -d '{}'

# A real user token, but no confirmation string -> 400, and nothing is deleted.
# (Only run this with an account you are willing to lose if you then send the confirmation.)
```

The one thing worth stating plainly: passing somebody else's id in the body does nothing. The
function never reads an id from the request. The account it deletes comes from the token Supabase
Auth just validated, and there is no code path that overrides it.
