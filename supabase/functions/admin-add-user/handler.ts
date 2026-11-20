// The admin-add-user request handler, with every outside effect injected.
//
// index.ts wires this to Supabase; handler.test.ts wires it to stubs. Keeping the decision logic in a
// file that imports nothing is what lets the authorization path be unit-tested without a database,
// a network or Deno — `node --test` runs it directly (Node 24 strips the types).
//
// ── WHAT THIS DOES ──────────────────────────────────────────────────────────────────────────────
// An administrator types an email address and a display name in the Admin Console. This sends that
// person Supabase's own invitation email. The account is created by Auth in an "invited" state with
// NO password; the person follows the link and chooses their own. Nothing here sets, generates,
// receives or returns a password — there is no field for one in the request or in any call below.
//
// ── THE ORDER OF THE CHECKS IS THE SECURITY MODEL ───────────────────────────────────────────────
//   1. The caller's bearer token is validated by Supabase Auth (getCaller). No token, a bad token,
//      an expired token, a guest (anonymous) token → 401. Nothing else runs.
//   2. The caller's id — from the validated token, never from the body — must pass is_admin(), the
//      same SECURITY DEFINER predicate every admin_* RPC in sql/019 and sql/025 checks
//      (administrator or owner; advisors and members are refused). Not an admin → 403, and NOTHING
//      about the requested address has been looked at yet, so a non-admin learns nothing from the
//      response. Any error answering the question is treated as "no".
//   3. Only then is the body read: capped in bytes, then each field validated and length-capped.
//   4. Rate limit: at most RATE_LIMIT_PER_HOUR attempts per administrator per rolling hour, counted
//      from the audit table. If the audit table cannot be read (sql/044 not applied) the request is
//      refused — no audit trail means no invitations, fail closed.
//   5. The audit row is written BEFORE the invitation is sent. If it cannot be written, nothing is
//      sent. Its outcome column is filled in afterwards.
//   6. An existing account with that address → 409, no invitation, no duplicate. An administrator
//      can already search every account's email in the Users tab (admin_list_users), so saying
//      "that address already has an account" tells them nothing they could not already read — and
//      nothing beyond that (no id, no name, no confirmation state) is returned.
//   7. The invitation's redirect is the fixed production origin below. Nothing the caller sends —
//      body, query string, Origin or Referer header — can change where the email's link points.

export const RATE_LIMIT_PER_HOUR = 20;
export const MAX_BODY_BYTES = 4096;
export const MAX_EMAIL = 254;
export const MAX_DISPLAY_NAME = 50;
export const MAX_NOTE = 500;

/** Where the invitation link lands. Fixed on purpose: never the request's Origin, never a body field.
 * Must be listed in Supabase → Authentication → URL Configuration → Redirect URLs, or Auth silently
 * falls back to the project's Site URL. */
export const INVITE_REDIRECT_TO = "https://capstonebible.com";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Deliberately plain: one @, something on each side, a dot in the domain, no whitespace. Auth does its
// own validation too; this is here so a typo gets a sentence back instead of an Auth error code.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Control and format characters (zero-width joiners, bidi overrides, NULs) have no place in a name
// shown to other people, and are the usual way to make two names look identical.
const CONTROL = /[\p{Cc}\p{Cf}]/u;

export interface Caller {
  id: string;
  isAnonymous: boolean;
}

export type InviteResult =
  | { ok: true; userId: string | null }
  | { ok: false; exists: boolean; message: string };

export type AuditOutcome = "invited" | "already_exists" | "name_taken" | "failed";

export interface Deps {
  /** Validates the bearer token with Supabase Auth. null on any failure. */
  getCaller(authHeader: string): Promise<Caller | null>;
  /** is_admin(uid). Must resolve false — never throw-to-allow — on any error. */
  isAdmin(uid: string): Promise<boolean>;
  /** Attempts by this actor since `sinceIso`. null when the audit table is unreadable. */
  countRecentAttempts(actorId: string, sinceIso: string): Promise<number | null>;
  /** Inserts the audit row (outcome 'pending'); returns its id, or null if it could not be written. */
  startAudit(row: { actorId: string; email: string; displayName: string; note: string | null }): Promise<number | null>;
  finishAudit(id: number, outcome: AuditOutcome, targetUserId: string | null): Promise<void>;
  emailExists(email: string): Promise<boolean>;
  displayNameTaken(name: string): Promise<boolean>;
  invite(email: string, displayName: string, redirectTo: string): Promise<InviteResult>;
  now(): Date;
  log(message: string, detail?: Record<string, unknown>): void;
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

export interface ValidInput {
  email: string;
  displayName: string;
  note: string | null;
}

/** Pure validation of the three fields. Returns the cleaned values or a sentence for the admin. */
export function validateInput(body: unknown): ValidInput | { error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const rawEmail = typeof b.email === "string" ? b.email : "";
  const rawName = typeof b.displayName === "string" ? b.displayName : "";
  const rawNote = typeof b.note === "string" ? b.note : "";

  const email = rawEmail.trim().toLowerCase();
  if (!email) return { error: "Enter an email address." };
  if (email.length > MAX_EMAIL) return { error: `That email address is longer than ${MAX_EMAIL} characters.` };
  if (CONTROL.test(email) || !EMAIL.test(email)) return { error: "That doesn't look like an email address." };

  const displayName = rawName.trim().replace(/\s+/g, " ");
  if (!displayName) return { error: "Enter a display name." };
  if ([...displayName].length > MAX_DISPLAY_NAME)
    return { error: `Display names can be at most ${MAX_DISPLAY_NAME} characters.` };
  if (CONTROL.test(displayName)) return { error: "That display name contains characters that aren't allowed." };

  const note = rawNote.trim();
  if ([...note].length > MAX_NOTE) return { error: `The note can be at most ${MAX_NOTE} characters.` };
  if (/\p{Cc}/u.test(note.replace(/[\n\r\t]/g, ""))) return { error: "The note contains characters that aren't allowed." };

  return { email, displayName, note: note || null };
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  // ── 1. Who is calling? ──────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(authHeader)) return json({ error: "Not signed in." }, 401);

  let caller: Caller | null = null;
  try {
    caller = await deps.getCaller(authHeader);
  } catch {
    caller = null;
  }
  if (!caller || !UUID.test(caller.id) || caller.isAnonymous) return json({ error: "Not signed in." }, 401);
  // From here on `actorId` is the only identity used for authorization and attribution. It came
  // from the token Auth just validated; nothing in the body can change it.
  const actorId = caller.id;

  // ── 2. Is the caller an administrator? ──────────────────────────────────────────────────────
  let admin = false;
  try {
    admin = (await deps.isAdmin(actorId)) === true;
  } catch {
    admin = false;
  }
  if (!admin) return json({ error: "Only administrators can add users." }, 403);

  // ── 3. The request body ─────────────────────────────────────────────────────────────────────
  let raw = "";
  try {
    raw = await req.text();
  } catch {
    return json({ error: "Couldn't read that request." }, 400);
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: "That request is too large." }, 413);
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Couldn't read that request." }, 400);
  }
  const input = validateInput(body);
  if ("error" in input) return json({ error: input.error }, 400);

  // ── 4. Rate limit, counted from the audit trail ─────────────────────────────────────────────
  const since = new Date(deps.now().getTime() - 60 * 60 * 1000).toISOString();
  const recent = await deps.countRecentAttempts(actorId, since);
  if (recent === null) {
    return json({ error: "Adding users isn't set up on the server yet (the audit table is missing). Nothing was sent." }, 503);
  }
  if (recent >= RATE_LIMIT_PER_HOUR) {
    return json(
      { error: `You've added ${RATE_LIMIT_PER_HOUR} people in the last hour, which is the limit. Try again later. Nothing was sent.` },
      429
    );
  }

  // ── 5. Audit first ──────────────────────────────────────────────────────────────────────────
  const auditId = await deps.startAudit({ actorId, email: input.email, displayName: input.displayName, note: input.note });
  if (auditId === null) {
    return json({ error: "Couldn't record this in the audit log, so nothing was sent. Try again." }, 503);
  }

  // ── 6. No duplicates ────────────────────────────────────────────────────────────────────────
  if (await deps.emailExists(input.email)) {
    await deps.finishAudit(auditId, "already_exists", null);
    return json({ error: "An account with that email address already exists. Nothing was sent.", code: "exists" }, 409);
  }
  // Display names are unique (profiles_display_name_unique). handle_new_user() would silently drop a
  // taken one and the person would be asked to pick another on first sign-in; better to say so now.
  if (await deps.displayNameTaken(input.displayName)) {
    await deps.finishAudit(auditId, "name_taken", null);
    return json({ error: "That display name is already taken. Choose another. Nothing was sent.", code: "name_taken" }, 409);
  }

  // ── 7. The invitation ───────────────────────────────────────────────────────────────────────
  let result: InviteResult;
  try {
    result = await deps.invite(input.email, input.displayName, INVITE_REDIRECT_TO);
  } catch (err) {
    result = { ok: false, exists: false, message: err instanceof Error ? err.message : String(err) };
  }
  if (!result.ok) {
    await deps.finishAudit(auditId, result.exists ? "already_exists" : "failed", null);
    if (result.exists) {
      return json({ error: "An account with that email address already exists. Nothing was sent.", code: "exists" }, 409);
    }
    deps.log("admin-add-user: invite failed", { actorId, auditId, message: result.message });
    return json({ error: "The invitation couldn't be sent. Try again in a few minutes." }, 502);
  }

  await deps.finishAudit(auditId, "invited", result.userId);
  deps.log("admin-add-user: invited", { actorId, auditId });
  return json({ invited: true, email: input.email });
}
