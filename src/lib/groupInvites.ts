/**
 * groupInvites.ts — Capstone Plus for Groups phase 3 (sql/049), the client half. Lazy Groups chunk
 * only (imported by components/GroupInvites.tsx).
 *
 * The app NEVER sends email or SMS. create_class_invites() only queues invites; the database's
 * schedule and the group-invite-mailer Edge Function do the sending, behind two switches that both
 * ship off. "Text it from your phone" opens the teacher's OWN messages app with the class link: the
 * message, the recipients and the send button are theirs (plan §4: no app-sent SMS).
 *
 * Every check here is a convenience for the teacher (instant feedback). The database repeats each one
 * and is the only enforcement.
 */
import { supabase } from "./supabase";
import { JOIN_ERRORS, groupErrorMessage, type AgeBracket } from "./groups";

export const INVITE_MAX_PER_CALL = 50;
export const INVITE_NOTE_MAX = 280;
// Same pattern as sql/049 create_class_invites (lower-cased first).
const EMAIL_RE = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
// Same idea as sql/049 invite_text_has_link(): a scheme, www., an @, or a dotted domain-like word.
const LINK_RE = /([a-z][a-z0-9+.-]*:\/|www\.|@|[\p{L}\p{N}-]+\.\p{L}{2,}([/:?#\s]|$))/iu;

export function textHasLink(s: string): boolean {
  return LINK_RE.test(s);
}

export interface ParsedEmails {
  valid: string[];
  invalid: string[];
  duplicates: number;
  tooMany: boolean;
}

/** One per line, or separated by commas, semicolons or spaces. Lower-cased and de-duplicated. */
export function parseEmailList(text: string): ParsedEmails {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  for (const raw of text.split(/[\s,;]+/)) {
    const a = raw.trim().replace(/^<|>$/g, "").toLowerCase();
    if (!a) continue;
    if (seen.has(a)) {
      duplicates++;
      continue;
    }
    seen.add(a);
    if (a.length <= 254 && EMAIL_RE.test(a)) valid.push(a);
    else invalid.push(a);
  }
  return { valid, invalid, duplicates, tooMany: valid.length > INVITE_MAX_PER_CALL };
}

/**
 * Neutral age screen (plan §5, DRAFT FOR COUNSEL): birth month and year, no hint of what number
 * matters. Returns the bracket to send, or "under13" (never sent: the app refuses on the device).
 * A person born this month counts as having had their birthday (benefit of the doubt is the wrong
 * direction here, so: they are treated as the YOUNGER age until the month after).
 */
export function ageBracketFrom(month: number, year: number, today = new Date()): AgeBracket | "under13" | null {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1900) return null;
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  if (year > y || (year === y && month > m)) return null;
  let age = y - year;
  if (m <= month) age -= 1; // birthday month not yet passed (or this month: assume not yet)
  if (age < 13) return "under13";
  return age < 18 ? "13_17" : "18_plus";
}

const AGE_BLOCK_KEY = "cb-class-join-age-block";
/** After an under-13 answer this browser is not asked again for a day (FTC: no back-buttoning). */
export function ageBlocked(): boolean {
  try {
    const t = Number(localStorage.getItem(AGE_BLOCK_KEY) ?? 0);
    return t > 0 && Date.now() - t < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}
export function setAgeBlocked(): void {
  try {
    localStorage.setItem(AGE_BLOCK_KEY, String(Date.now()));
  } catch {
    /* nothing to remember */
  }
}

export function classShareLink(code: string, origin = window.location.origin): string {
  return `${origin}/?joinClass=${encodeURIComponent(code)}`;
}

/** The teacher's OWN messages app, pre-filled. `sms:?&body=` works on iOS and Android. */
export function smsHref(body: string): string {
  return `sms:?&body=${encodeURIComponent(body)}`;
}

// ------------------------------------------------------------------------------- RPCs
export type InviteResult = "invited" | "already_invited" | "already_member" | "self" | "invalid" | "cannot_invite" | "limit";
export interface InviteOutcome {
  email: string;
  result: InviteResult;
  limit?: string;
}

export async function createInvites(classId: string, emails: string[], note: string): Promise<{ invited: number; results: InviteOutcome[]; sendingEnabled: boolean }> {
  const { data, error } = await supabase.rpc("create_class_invites", { p_class_id: classId, p_emails: emails, p_note: note.trim() || null });
  if (error) throw new Error(groupErrorMessage(error));
  const d = (data ?? {}) as { invited?: number; results?: InviteOutcome[]; sending_enabled?: boolean };
  return { invited: d.invited ?? 0, results: Array.isArray(d.results) ? d.results : [], sendingEnabled: d.sending_enabled === true };
}

export interface InviteRow {
  inviteId: string;
  address: string | null;
  status: string;
  sends: number;
  lastSentAt: string | null;
  nextSendAt: string | null;
  createdAt: string;
  canResend: boolean;
}

export async function listInvites(classId: string): Promise<InviteRow[]> {
  const { data, error } = await supabase.rpc("class_invite_list", { p_class_id: classId });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    inviteId: String(r.invite_id ?? ""),
    address: typeof r.address === "string" ? r.address : null,
    status: String(r.status ?? ""),
    sends: typeof r.sends === "number" ? r.sends : 0,
    lastSentAt: typeof r.last_sent_at === "string" ? r.last_sent_at : null,
    nextSendAt: typeof r.next_send_at === "string" ? r.next_send_at : null,
    createdAt: String(r.created_at ?? ""),
    canResend: r.can_resend === true,
  }));
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_class_invite", { p_invite_id: inviteId });
  if (error) throw new Error(groupErrorMessage(error));
}

export async function resendInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc("resend_class_invite", { p_invite_id: inviteId });
  if (error) throw new Error(groupErrorMessage(error));
}

export interface InvitePreview {
  kind: "school" | "church";
  name: string;
  orgName: string | null;
  leaderName: string | null;
}

export async function previewInvite(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc("class_invite_preview", { p_token: token });
  if (error) throw new Error("Could not open that invite. Please try again.");
  const d = (data ?? {}) as { ok?: boolean; error?: string; kind?: string; name?: string; org_name?: string; leader_name?: string };
  if (!d.ok) throw new Error(JOIN_ERRORS[d.error ?? ""] ?? "That invite link didn't work. Ask your teacher or leader for the class code.");
  return { kind: d.kind === "school" ? "school" : "church", name: d.name ?? "", orgName: d.org_name ?? null, leaderName: d.leader_name ?? null };
}

export async function redeemInvite(token: string, ageBracket: AgeBracket): Promise<{ classId: string; name: string }> {
  const { data, error } = await supabase.rpc("redeem_class_invite", { p_token: token, p_age_bracket: ageBracket });
  if (error) throw new Error("Could not join. Please try again.");
  const d = (data ?? {}) as { ok?: boolean; error?: string; class_id?: string; name?: string };
  if (!d.ok) throw new Error(JOIN_ERRORS[d.error ?? ""] ?? "Could not join. Please try again.");
  return { classId: d.class_id ?? "", name: d.name ?? "" };
}

export const INVITE_RESULT_LABEL: Record<InviteResult, string> = {
  invited: "Invited",
  already_invited: "Already invited",
  already_member: "Already in",
  self: "That's you",
  invalid: "Not an email address",
  cannot_invite: "Can't be invited",
  limit: "Over the invite limit",
};

export const INVITE_STATUS_LABEL: Record<string, string> = {
  pending: "Waiting",
  joined: "Joined",
  expired: "Expired",
  revoked: "Cancelled",
  bounced: "Couldn't be delivered",
  opted_out: "Unsubscribed",
};
