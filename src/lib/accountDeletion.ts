/**
 * Calling the account-deletion Edge Function.
 *
 * The client's whole job here is to send the confirmation word and its own access token. It does not
 * — and structurally cannot — say WHICH account to delete: the function reads the caller's id out of
 * the token it validates with Supabase Auth and ignores the request body apart from `confirm`. So
 * there is no id to tamper with in the request this file builds, which is the point.
 *
 * See supabase/functions/delete-account/index.ts for the server half, and
 * src/data/accountDeletionNotice.ts for the promise both halves are keeping.
 */

import { supabase } from "./supabase";
import { ACCOUNT_DELETION_CONFIRM_WORD } from "../data/accountDeletionNotice";

/** Carries the server's own sentence where there is one — "this is the only owner account", say —
 * rather than flattening every failure into one generic apology. */
export class AccountDeletionError extends Error {}

const GENERIC = "Your account could not be deleted. Nothing was removed — please try again.";

/** Pulls the `error` string out of a non-2xx Edge Function response. supabase-js hands the raw
 * Response back on `error.context`, and the body is where our message actually is. */
async function messageFromError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === "string" && body.error.trim()) return body.error;
    } catch {
      /* Not JSON — fall through to the generic message. */
    }
  }
  // supabase-js names this one FunctionsFetchError when the request never arrived at all — offline,
  // DNS, the function not deployed. Matched by NAME rather than by its message text, because the
  // sibling FunctionsHttpError's message also contains "Edge Function" and means the opposite: the
  // server did answer, and telling somebody to check their connection would send them the wrong way.
  if ((error as { name?: string })?.name === "FunctionsFetchError") {
    return "Couldn't reach the server, so nothing was deleted. Check your connection and try again.";
  }
  return GENERIC;
}

/**
 * Deletes the signed-in account. Resolves only when the account is actually gone; throws otherwise,
 * and a throw always means the account is still there — the function removes `auth.users` last,
 * after everything else has succeeded.
 */
export async function deleteMyAccount(typedConfirmation: string): Promise<void> {
  if (typedConfirmation.trim().toUpperCase() !== ACCOUNT_DELETION_CONFIRM_WORD) {
    throw new AccountDeletionError(`Type ${ACCOUNT_DELETION_CONFIRM_WORD} to confirm.`);
  }
  const { data, error } = await supabase.functions.invoke<{ deleted?: boolean; error?: string }>("delete-account", {
    body: { confirm: ACCOUNT_DELETION_CONFIRM_WORD },
  });
  if (error) throw new AccountDeletionError(await messageFromError(error));
  if (!data?.deleted) throw new AccountDeletionError(data?.error ?? GENERIC);
}

/**
 * The signed-out end state. `scope: "local"` on purpose: the account no longer exists, so a
 * server-side sign-out would be a call on behalf of a user Auth has never heard of. What matters is
 * that this device stops holding a session, and the reload throws away every piece of in-memory
 * state the deleted account left behind — the app comes back at the sign-in gate with nothing.
 */
export async function endSessionAfterDeletion(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* Already gone. The reload below is what actually guarantees the signed-out state. */
  }
  window.location.replace(`${window.location.origin}/`);
}
