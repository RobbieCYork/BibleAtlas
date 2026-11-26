import { removeStoredSession, storedSession, supabase } from "../supabase";
import { clearSavedAnnotations } from "./annotations";
import { clearLastPosition } from "./lastPosition";

/** Erases what offline reading keeps about this reader. Downloaded Bibles stay: they are public
 * domain text, not personal information. */
export async function clearReaderData(): Promise<void> {
  clearLastPosition();
  await clearSavedAnnotations();
}

/** Sign out, even with no connection. supabase-js gives up without removing anything when it cannot
 * renew an expired token first, so the saved session is removed here and the page reloaded. */
export async function signOutOnThisDevice(): Promise<void> {
  if (navigator.onLine) {
    const { error } = await supabase.auth.signOut();
    if (!error || !storedSession()) return;
  }
  try {
    await clearReaderData();
    removeStoredSession();
  } finally {
    window.location.reload();
  }
}
