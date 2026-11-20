// Lets an administrator add a person by hand: Supabase sends them an invitation email and they choose
// their own password from it. Every decision lives in handler.ts (unit-tested in handler.test.ts);
// this file only connects that logic to Supabase.
//
// ── WHY AN EDGE FUNCTION ────────────────────────────────────────────────────────────────────────
// auth.admin.inviteUserByEmail needs the service_role key, which bypasses every RLS policy and so can
// never be in the client bundle (see src/lib/adminApi.ts). Here it is read from the function's own
// environment on Supabase's servers. The same reasoning, and the same shape, as delete-account.
//
// ── SECRETS ─────────────────────────────────────────────────────────────────────────────────────
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by the platform into
// every deployed function. Nothing needs to be set by hand.
//
// ── NEEDS sql/044 ───────────────────────────────────────────────────────────────────────────────
// The rate limit and the audit trail live in `admin_user_invites`. Until sql/044 is applied every
// call is refused with 503 — on purpose; see handler.ts step 4.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, handle, type Deps } from "./handler.ts";

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "Adding users is not configured on the server." }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const deps: Deps = {
    async getCaller(authHeader) {
      // Validated by GoTrue's /auth/v1/user — signature, expiry and revocation are Auth's job. A
      // service_role key presented as the bearer has no `sub` and fails here.
      const caller = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await caller.auth.getUser();
      if (error || !data?.user) return null;
      return { id: data.user.id, isAnonymous: data.user.is_anonymous === true };
    },

    async isAdmin(uid) {
      // The same predicate every admin_* RPC checks (sql/019, redefined over user_roles by sql/025):
      // administrator or owner. Called with the id from the validated token, never from the body.
      const { data, error } = await admin.rpc("is_admin", { uid });
      return !error && data === true;
    },

    async countRecentAttempts(actorId, sinceIso) {
      const { count, error } = await admin
        .from("admin_user_invites")
        .select("id", { count: "exact", head: true })
        .eq("actor_id", actorId)
        .gte("created_at", sinceIso);
      if (error) return null;
      return count ?? 0;
    },

    async startAudit({ actorId, email, displayName, note }) {
      const { data, error } = await admin
        .from("admin_user_invites")
        .insert({ actor_id: actorId, email, display_name: displayName, note, outcome: "pending" })
        .select("id")
        .single();
      if (error || !data) return null;
      return data.id as number;
    },

    async finishAudit(id, outcome, targetUserId) {
      const { error } = await admin
        .from("admin_user_invites")
        .update({ outcome, target_user_id: targetUserId })
        .eq("id", id);
      if (error) console.error("admin-add-user: could not record outcome", { id, outcome, message: error.message });
    },

    async emailExists(email) {
      // profiles.email is written lower-cased by handle_new_user() for every account. The invite call
      // below is the backstop for anything this misses (an address changed after signup): Auth itself
      // refuses an address it already has, and that refusal is mapped to the same 409.
      const { data, error } = await admin.from("profiles").select("id").eq("email", email).limit(1);
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    },

    async displayNameTaken(name) {
      // Exact case-insensitive match, mirroring the unique index on lower(display_name). ilike with
      // the wildcards escaped, so "a_b" cannot match "axb".
      const escaped = name.replace(/[\\%_]/g, (c) => `\\${c}`);
      const { data, error } = await admin.from("profiles").select("id").ilike("display_name", escaped).limit(1);
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    },

    async invite(email, displayName, redirectTo) {
      // user_metadata carries the display name only — handle_new_user() reads it to create the
      // profile. Nothing goes into app_metadata, and no role is granted: an invited person is a plain
      // member like anyone who signed up themselves.
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { display_name: displayName },
        redirectTo,
      });
      if (error) {
        const code = (error as { code?: string }).code ?? "";
        const exists =
          code === "email_exists" ||
          code === "user_already_exists" ||
          /already (been )?registered|already exists/i.test(error.message);
        return { ok: false, exists, message: error.message };
      }
      return { ok: true, userId: data?.user?.id ?? null };
    },

    now: () => new Date(),
    log: (message, detail) => console.log(message, detail ?? {}),
  };

  try {
    return await handle(req, deps);
  } catch (err) {
    console.error("admin-add-user: unexpected failure", { message: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: "Something went wrong. Nothing was sent." }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
