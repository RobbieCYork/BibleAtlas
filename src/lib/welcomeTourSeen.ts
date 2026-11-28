import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/* ============================================================================
 * Who is shown the welcome tour on their own, and how that is remembered. No database table, no
 * migration.
 *
 *   Shown automatically when ALL of:
 *     - the account was created on or after TOUR_SINCE (accounts that existed before the tour are
 *       never interrupted), and less than AUTO_WINDOW_DAYS ago;
 *     - the account has no `welcome_tour_seen_at` in its Supabase Auth user metadata;
 *     - this browser holds no local mark for that account.
 *
 *   It is marked seen the moment it opens, in both places, so closing the tab halfway does not bring
 *   it back. The menu and Settings reopen it at any time.
 *
 *   The account write can fail (offline, server error). The local mark then stops a repeat on this
 *   device, and the write is tried once more on each later load until it lands. If local storage is
 *   unavailable as well, AUTO_WINDOW_DAYS is the backstop: it cannot repeat forever.
 *
 * user_metadata is writable by its owner. That is fine here: it only decides whether a help screen
 * opens by itself. Never use it to decide access to anything.
 * ========================================================================== */

/** The tour's launch. Accounts created before this never see it unless they open it. */
export const TOUR_SINCE = "2026-11-27T00:00:00Z";
export const AUTO_WINDOW_DAYS = 30;
export const SEEN_METADATA_KEY = "welcome_tour_seen_at";

export const seenStorageKey = (userId: string) => `welcome-tour-seen:${userId}`;

/** How long to wait for the server's copy of the account before going by the one in hand. */
const FRESH_USER_TIMEOUT_MS = 4000;

function readLocal(userId: string): string | null {
  try {
    return localStorage.getItem(seenStorageKey(userId));
  } catch {
    return null;
  }
}

function writeLocal(userId: string, at: string) {
  try {
    localStorage.setItem(seenStorageKey(userId), at);
  } catch {
    /* Blocked or full: the account mark and the age window still apply. */
  }
}

async function writeAccount(at: string) {
  try {
    await supabase.auth.updateUser({ data: { [SEEN_METADATA_KEY]: at } });
  } catch {
    /* Tried again on the next load, from the local mark. */
  }
}

function isNewAccount(user: User, now = Date.now()): boolean {
  const created = Date.parse(user.created_at);
  return (
    Number.isFinite(created) && created >= Date.parse(TOUR_SINCE) && now - created < AUTO_WINDOW_DAYS * 86_400_000
  );
}

/** The server's copy: another device may have shown the tour since this session's token was issued.
 * Null when it cannot be had in time. */
async function fetchFreshUser(): Promise<User | null> {
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), FRESH_USER_TIMEOUT_MS));
    const result = await Promise.race([supabase.auth.getUser(), timeout]);
    return result?.data.user ?? null;
  } catch {
    return null;
  }
}

/** Calls `open` once, for a new account that has not seen the tour. Pass null until the app is ready
 * to be covered: signed in with a real account, no password or display-name prompt waiting, and
 * feature stages loaded. */
export function useWelcomeTourFirstRun(user: User | null, open: () => void) {
  const latest = useRef({ user, open });
  latest.current = { user, open };
  /** The account already decided for during this page load. */
  const decided = useRef<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    const current = latest.current.user;
    if (!current || decided.current === current.id) return;
    const local = readLocal(current.id);
    const onAccount = current.user_metadata?.[SEEN_METADATA_KEY] as string | undefined;
    if (local || onAccount || !isNewAccount(current)) {
      decided.current = current.id;
      if (local && !onAccount) void writeAccount(local);
      if (onAccount && !local) writeLocal(current.id, onAccount);
      return;
    }
    let cancelled = false;
    void fetchFreshUser().then((fresh) => {
      if (cancelled) return;
      decided.current = current.id;
      const elsewhere = fresh?.user_metadata?.[SEEN_METADATA_KEY] as string | undefined;
      if (elsewhere) {
        writeLocal(current.id, elsewhere);
        return;
      }
      const at = new Date().toISOString();
      latest.current.open();
      writeLocal(current.id, at);
      void writeAccount(at);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
}
