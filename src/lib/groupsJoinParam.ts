/**
 * groupsJoinParam.ts — the one piece of Capstone Plus for Groups phase 3 (invites, sql/049) that
 * ships in the MAIN bundle: catching `?joinClass=<code or token>` before anything else can drop it.
 *
 * A teacher's shared link carries the class's 6-character join code; an emailed invite carries a
 * single-use 64-hex token. Either is moved out of the address bar at once (so it is not left in
 * history, a screenshot or a Referer) into localStorage, where it survives sign-up, email
 * confirmation and sign-in — the same reason the `?joinGroup` / `?joinChurch` links do this. It is
 * acted on only once the Groups UI is on for a signed-in account (AuthButton opens Classes & Groups,
 * whose lazy chunk does the join). With the switch off it just waits, and expires after 14 days.
 *
 * No RPC name and no groups copy lives here (scripts/groups/check-bundle.mjs).
 */

const PARAM = "joinClass";
const KEY = "pending-join-class";
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type PendingJoin = { kind: "code" | "token"; value: string };

function classify(raw: string): PendingJoin | null {
  const v = raw.trim();
  if (/^[0-9a-f]{64}$/i.test(v)) return { kind: "token", value: v.toLowerCase() };
  const code = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(code)) return { kind: "code", value: code };
  return null;
}

/** Call once at startup. Strips the parameter whether or not it is valid. */
export function stashJoinClassParam(): void {
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(PARAM);
    if (raw === null) return;
    url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    const p = classify(raw);
    if (p) localStorage.setItem(KEY, JSON.stringify({ ...p, at: Date.now() }));
  } catch {
    /* storage blocked: the link simply does nothing */
  }
}

export function pendingJoinClass(): PendingJoin | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as { kind?: string; value?: string; at?: number };
    if (typeof j.at !== "number" || Date.now() - j.at > TTL_MS || typeof j.value !== "string") {
      localStorage.removeItem(KEY);
      return null;
    }
    return classify(j.value);
  } catch {
    return null;
  }
}

export function clearPendingJoinClass(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
