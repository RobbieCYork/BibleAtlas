// Deletes the CALLING account, and everything belonging to it, permanently.
//
// ── WHY THIS IS AN EDGE FUNCTION AND NOT CLIENT CODE ────────────────────────────────────────────
// Removing a row from `auth.users` needs the Supabase `service_role` key. That key is unrestricted:
// it bypasses every RLS policy in the database. `src/lib/adminApi.ts` says so, and used to list
// "deleting an account outright" among the things this app deliberately did not build, because a
// client bundle is a public file and a key inside one is a published key.
//
// An Edge Function is where that constraint stops applying. The key is read from the function's own
// environment on Supabase's servers, is never sent to a browser, and cannot be read out of the
// deployed bundle by a caller. So the capability exists exactly once, on the server, behind the
// check below — and nowhere else.
//
// ── THE ONLY SECURITY QUESTION THAT MATTERS ─────────────────────────────────────────────────────
// A function holding the service_role key that deletes "a user" is one missing check away from
// letting anyone delete anyone. This function therefore has exactly one source for the id it
// deletes: the caller's own access token, validated by Supabase's own Auth server.
//
//   * The id comes from `auth.getUser()` on the bearer token in the Authorization header. That call
//     goes to GoTrue's `/auth/v1/user`, so the signature, the expiry and any revocation are checked
//     by Auth itself rather than by anything written here.
//   * The request body is read for ONE thing: the literal confirmation string. There is no code
//     path — not one — that takes an id, an email or any other identifier from the body, the query
//     string or a header and uses it as the account to delete. Passing `{"user_id": "<someone
//     else>"}` changes nothing about what happens; the field is never looked at.
//   * A service_role key presented as the caller's bearer token is rejected, because it carries no
//     `sub` claim and `getUser()` fails on it. The uuid shape check below is a second, cheap net.
//
// ── ORDERING, AND WHAT HAPPENS IF SOMETHING FAILS ───────────────────────────────────────────────
// The account row in `auth.users` is deleted LAST, after every other row and file is gone. The two
// possible failure modes are not equally bad:
//
//   * data gone, account still present  → the person retries; every step here is idempotent, and
//                                          the second run finishes the job.
//   * account gone, data still present  → rows referencing an id that no longer exists, hidden by
//                                          RLS but still in the database. That is the outcome this
//                                          ordering exists to make impossible.
//
// So any unexpected failure aborts BEFORE the account row is touched and reports what failed.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Auth is a bearer token, never a cookie, so a wildcard origin grants nothing: a hostile page can
// already send this request, and without the victim's access token it gets a 401 like anyone else.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/** PostgREST codes meaning "that table/column isn't in this database" — this app's schema grew partly
 * through the dashboard, so a table listed below may legitimately not exist on some environment.
 * Anything else is a real failure and stops the run. */
const NOT_APPLICABLE = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

interface StepFailure {
  step: string;
  code: string;
  message: string;
}

/** Every table this account owns rows in, child before parent, with the column that names the owner.
 * `mode: "either"` covers the two-sided rows (a DM, a friend request) where the account can be on
 * either end. Keeping this as data rather than thirty hand-written calls is what makes the list
 * auditable against the deletion notice the person reads before confirming. */
const OWNED_ROWS: Array<{ table: string; column: string; mode?: "either"; second?: string }> = [
  { table: "report_votes", column: "voter_id" },
  { table: "reports", column: "reporter_id" },
  { table: "note_comments", column: "author_id" },
  { table: "post_comments", column: "author_id" },
  { table: "posts", column: "user_id" },
  { table: "notes", column: "user_id" },
  { table: "highlights", column: "user_id" },
  { table: "verse_tags", column: "user_id" },
  { table: "tags", column: "user_id" },
  { table: "chapter_reads", column: "user_id" },
  { table: "reading_progress", column: "user_id" },
  { table: "reading_plan_progress", column: "user_id" },
  { table: "sermon_notes", column: "user_id" },
  { table: "messages", column: "sender_id", mode: "either", second: "receiver_id" },
  { table: "friend_requests", column: "sender_id", mode: "either", second: "receiver_id" },
  { table: "group_message_reads", column: "user_id" },
  { table: "group_messages", column: "sender_id" },
  { table: "group_join_requests", column: "user_id" },
  { table: "group_members", column: "user_id" },
  { table: "profile_links", column: "user_id" },
  { table: "game_buzzes", column: "user_id" },
  { table: "game_players", column: "user_id" },
  { table: "game_high_scores", column: "user_id" },
  { table: "game_rooms", column: "host_id" },
  { table: "saving_peter_guesses", column: "user_id" },
  { table: "saving_peter_players", column: "user_id" },
  { table: "saving_peter_high_scores", column: "user_id" },
  { table: "saving_peter_rooms", column: "host_id" },
  { table: "user_roles", column: "user_id" },
  { table: "admin_users", column: "user_id" },
  { table: "profiles", column: "id" },
];

/** Columns elsewhere that merely POINT at this account and are nullable — analytics rows, the "who
 * resolved this report" stamp. These are nulled rather than deleted: the row is somebody else's or
 * nobody's, and nulling it keeps the aggregate honest while leaving nothing that identifies a
 * person. sql/019 already documents this intent for analytics ("leaves the aggregate intact but
 * unattributed, rather than cascading a hole in the history"); doing it explicitly here means the
 * outcome does not depend on a foreign key's ON DELETE clause being what we think it is. */
const ANONYMISE: Array<{ table: string; column: string }> = [
  { table: "analytics_events", column: "user_id" },
  { table: "analytics_sessions", column: "user_id" },
  { table: "reports", column: "resolved_by" },
  { table: "reports", column: "assigned_to" },
  { table: "user_roles", column: "granted_by" },
  { table: "app_settings", column: "updated_by" },
  { table: "game_rooms", column: "winner_id" },
  { table: "saving_peter_rooms", column: "winner_id" },
];

/** Buckets whose objects are stored under a `<account id>/` first folder — the same first-folder
 * convention every storage policy in sql/027 matches on. Deleting the folder deletes the files;
 * nothing here removes them on its own, because `storage.objects.owner` is ON DELETE SET NULL and
 * an ownerless avatar is still a photograph of somebody. */
const BUCKETS = ["avatars", "post-media", "sermon-note-images"];

async function purgeBucket(admin: SupabaseClient, bucket: string, uid: string, failures: StepFailure[]) {
  for (let page = 0; page < 50; page++) {
    const { data, error } = await admin.storage.from(bucket).list(uid, { limit: 100, offset: 0 });
    if (error) {
      // A bucket that does not exist on this project is not a failure of the deletion.
      if (/not found|does not exist/i.test(error.message)) return;
      failures.push({ step: `storage:${bucket}`, code: "storage", message: error.message });
      return;
    }
    if (!data || data.length === 0) return;
    const paths = data.map((f) => `${uid}/${f.name}`);
    const { error: rmError } = await admin.storage.from(bucket).remove(paths);
    if (rmError) {
      failures.push({ step: `storage:${bucket}`, code: "storage", message: rmError.message });
      return;
    }
    if (data.length < 100) return;
  }
}

/** A group is a shared room, not this person's property. Leaving one must not delete other people's
 * history — so before the account's membership row goes, anything it was the last owner/admin of is
 * handed to the longest-standing remaining member. A group whose only member was this account is
 * deleted outright: an empty room nobody can ever enter is exactly the orphan we are avoiding.
 *
 * The promoted member is given the SAME role string the leaving account held, never an invented one,
 * so this cannot violate whatever CHECK constraint the `role` column carries. */
async function handOverGroups(admin: SupabaseClient, uid: string, failures: StepFailure[]) {
  const mine = await admin.from("group_members").select("group_id, role").eq("user_id", uid);
  if (mine.error) {
    if (!NOT_APPLICABLE.has(mine.error.code ?? "")) {
      failures.push({ step: "groups:read", code: mine.error.code ?? "?", message: mine.error.message });
    }
    return;
  }
  for (const row of mine.data ?? []) {
    const others = await admin
      .from("group_members")
      .select("user_id, role, joined_at")
      .eq("group_id", row.group_id)
      .neq("user_id", uid)
      .order("joined_at", { ascending: true });
    if (others.error) {
      failures.push({ step: "groups:members", code: others.error.code ?? "?", message: others.error.message });
      return;
    }
    const remaining = others.data ?? [];
    if (remaining.length === 0) {
      const del = await admin.from("groups").delete().eq("id", row.group_id);
      if (del.error && !NOT_APPLICABLE.has(del.error.code ?? "")) {
        failures.push({ step: "groups:delete-empty", code: del.error.code ?? "?", message: del.error.message });
        return;
      }
      continue;
    }
    const stillLed = remaining.some((m) => m.role === "owner" || m.role === "admin");
    if (stillLed) continue;
    const heir = remaining[0];
    const promote = await admin
      .from("group_members")
      .update({ role: row.role })
      .eq("group_id", row.group_id)
      .eq("user_id", heir.user_id);
    if (promote.error) {
      failures.push({ step: "groups:promote", code: promote.error.code ?? "?", message: promote.error.message });
      return;
    }
  }
}

/** This account's id can sit inside OTHER people's posts, in `tagged_user_ids`. Those rows are not
 * ours to delete, but the identifier is — so it is lifted out of the array and the post is left
 * otherwise untouched. Missing this is how a deleted person keeps showing up as a tag that resolves
 * to nothing. */
async function untagFromPosts(admin: SupabaseClient, uid: string, failures: StepFailure[]) {
  const found = await admin.from("posts").select("id, tagged_user_ids").contains("tagged_user_ids", [uid]);
  if (found.error) {
    if (!NOT_APPLICABLE.has(found.error.code ?? "")) {
      failures.push({ step: "posts:untag-read", code: found.error.code ?? "?", message: found.error.message });
    }
    return;
  }
  for (const post of found.data ?? []) {
    const next = ((post.tagged_user_ids as string[] | null) ?? []).filter((id) => id !== uid);
    const upd = await admin.from("posts").update({ tagged_user_ids: next }).eq("id", post.id);
    if (upd.error) {
      failures.push({ step: "posts:untag", code: upd.error.code ?? "?", message: upd.error.message });
      return;
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Account deletion is not configured on the server." }, 500);
  }

  // ── 1. Who is calling? ────────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(authHeader)) return json({ error: "Not signed in." }, 401);

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  const user = userData?.user;
  if (userError || !user || !UUID.test(user.id)) {
    return json({ error: "Not signed in." }, 401);
  }
  // From here to the end of the function, `uid` is the ONLY identifier used. It came from the token
  // Auth just validated. Nothing the caller sent can change it.
  const uid = user.id;

  // ── 2. Deliberate confirmation ────────────────────────────────────────────────────────────────
  // The UI already makes the person type this; checking it again server-side means a stray fetch,
  // a replayed request or a mis-wired client cannot delete an account by accident. The body is read
  // for this string and nothing else.
  let confirm = "";
  try {
    const body = await req.json();
    confirm = typeof body?.confirm === "string" ? body.confirm : "";
  } catch {
    confirm = "";
  }
  if (confirm.trim().toUpperCase() !== "DELETE") {
    return json({ error: "Deletion was not confirmed." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const failures: StepFailure[] = [];

  // ── 3. Refuse to lock the app out of its own administration ───────────────────────────────────
  // sql/025 will not let the last owner demote themselves through the app. Deleting the account is
  // the same act by another route, and the service_role key would happily do it. Checked first, so
  // nothing has been destroyed when it refuses.
  const roleRow = await admin.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
  if (!roleRow.error && roleRow.data?.role === "owner") {
    const owners = await admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "owner");
    if (!owners.error && (owners.count ?? 0) <= 1) {
      return json(
        {
          error:
            "This is the only owner account for Capstone Bible. Make someone else an owner first, then delete this account.",
        },
        409
      );
    }
  }

  // ── 4. Everything except the account row itself ───────────────────────────────────────────────
  await handOverGroups(admin, uid, failures);
  if (failures.length === 0) await untagFromPosts(admin, uid, failures);

  if (failures.length === 0) {
    for (const { table, column } of ANONYMISE) {
      const { error } = await admin.from(table).update({ [column]: null }).eq(column, uid);
      if (error && !NOT_APPLICABLE.has(error.code ?? "")) {
        failures.push({ step: `anonymise:${table}.${column}`, code: error.code ?? "?", message: error.message });
        break;
      }
    }
  }

  if (failures.length === 0) {
    for (const spec of OWNED_ROWS) {
      const q = admin.from(spec.table).delete();
      const { error } =
        spec.mode === "either"
          ? await q.or(`${spec.column}.eq.${uid},${spec.second}.eq.${uid}`)
          : await q.eq(spec.column, uid);
      if (error && !NOT_APPLICABLE.has(error.code ?? "")) {
        failures.push({ step: `delete:${spec.table}`, code: error.code ?? "?", message: error.message });
        break;
      }
    }
  }

  if (failures.length === 0) {
    for (const bucket of BUCKETS) await purgeBucket(admin, bucket, uid, failures);
  }

  if (failures.length > 0) {
    // Nothing has touched auth.users. The account still exists, still signs in, and a retry will
    // pick up where this left off — every step above is a delete-by-owner, so re-running is safe.
    console.error("delete-account: aborted before removing the account", { uid, failures });
    return json(
      {
        error: "Some of your data could not be removed, so your account has not been deleted. Please try again.",
        failures,
      },
      500
    );
  }

  // ── 5. The account row, last ──────────────────────────────────────────────────────────────────
  // Hard delete, not Supabase's soft delete: a soft-deleted row keeps the email address, which is
  // the one field the person most obviously asked us to forget.
  const { error: deleteError } = await admin.auth.admin.deleteUser(uid, false);
  if (deleteError) {
    console.error("delete-account: data purged but auth.users delete failed", { uid, message: deleteError.message });
    return json(
      { error: "Your data was removed but the account itself could not be deleted. Please try again." },
      500
    );
  }

  console.log("delete-account: account deleted", { uid });
  return json({ deleted: true });
});
