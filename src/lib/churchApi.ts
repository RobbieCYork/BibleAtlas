import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/* ============================================================================
 * The client half of sql/033_churches.sql — Capstone for Churches, Stage 1.
 *
 * ── WHERE THE BOUNDARY IS. NOT HERE. ────────────────────────────────────────
 * Which church you can see, whose roster you can read, which outlines are
 * visible to you and who may publish one are all decided by row-level security
 * and by column-level GRANTs in sql/033. Nothing in this file filters anything
 * for safety, and nothing in it could be edited to widen what a session can
 * reach. What is here is the UI's half: the calls, the shapes, and the
 * availability probe.
 *
 * ── THE ONE THING THIS MODULE MUST NEVER GROW ───────────────────────────────
 * A church can never delete or alter a member's sermon notes. sql/033 makes
 * that structural — zero new policies and zero new grants on `sermon_notes` —
 * and the only new write path to that table is fork_church_sermon(), which
 * inserts one row with user_id = auth.uid(). If you are about to add a call
 * here that writes to `sermon_notes` on a church's behalf, the answer is no.
 *
 * ── THE MIGRATION IS NOT APPLIED YET, AND THIS BUILD SHIPS ANYWAY ───────────
 * sql/033 needs a human to run it (there is no migrations tooling in this repo)
 * and applying it to production is not a decision a deploy gets to make. So
 * every church entry point in the app asks useChurchesAvailable() first, and
 * until the migration lands the answer is false and no church UI is drawn at
 * all — no tab, no button, no empty screen. Nothing throws, and no member of a
 * real congregation meets a "Register your church" button that cannot register
 * one. This is sql/028's pattern, copied deliberately, because it worked.
 *
 * The probe is ONE call — list_my_churches() — whose result is also the data
 * the panel's list screen needs, cached module-wide for the page's lifetime.
 * PostgREST answers a missing function with PGRST202 (and a missing table with
 * PGRST205); isMissingSchema() recognises both, and treats every other failure
 * as "installed, but something went wrong", because a network blip must not
 * silently remove a church's whole surface for the rest of the session.
 *
 * When the migration is applied there is nothing to deploy: the next page load
 * finds the function and the Church tab appears.
 * ========================================================================== */

/** Per-organisation role. Completely separate from sql/025's app-wide
 * user_roles tiers (user < advisor < administrator < owner), which govern the
 * whole product and which a church admin neither holds nor acquires. */
export type ChurchRole = "admin" | "staff" | "member";

export const CHURCH_ROLE_LABELS: Record<ChurchRole, string> = {
  admin: "Admin",
  staff: "Staff",
  member: "Member",
};

/** What each tier may actually do, in the words the panel shows beside a role
 * picker. Kept here rather than inline so the promise made in the UI and the
 * policy set in sql/033 can be diffed against each other by a reader. */
export const CHURCH_ROLE_BLURBS: Record<ChurchRole, string> = {
  admin: "Edits the church profile, approves people, sets roles, publishes outlines.",
  staff: "Writes and publishes sermon outlines. Cannot change the profile or the roster.",
  member: "Reads published outlines and takes their own notes on them.",
};

export type ChurchVerificationState = "unverified" | "pending" | "verified" | "rejected";

/** A row of `churches`, as a member sees it. Stage 1 has no public view of this
 * table at all, so every field here is members-only. */
export interface Church {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  website: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  denomination: string | null;
  about: string | null;
  service_times: string | null;
  logo_url: string | null;
  /** Stage 3's trust model. Not writable from the app at any tier — the column
   * is absent from the UPDATE grant in sql/033, which is what actually holds
   * it, RLS being row-level and unable to. */
  verification_state: ChurchVerificationState;
  is_listed: boolean;
  /** TRUE by default, flipped relative to groups on purpose. When it is on, the
   * invite link IS the credential: anyone who opens it is in. */
  open_join: boolean;
  sermon_titles_public: boolean;
  suspended_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** The columns a church admin may actually write. Mirrors the column-level
 * GRANT in sql/033 exactly; anything outside this list is refused by the
 * database, not by this file. */
export interface ChurchProfilePatch {
  name?: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  website?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  denomination?: string | null;
  about?: string | null;
  service_times?: string | null;
  open_join?: boolean;
  sermon_titles_public?: boolean;
}

/** One row of list_my_churches(). Column names and order are fixed by that
 * function's RETURNS TABLE. */
export interface ChurchSummary {
  church_id: string;
  name: string;
  city: string | null;
  region: string | null;
  denomination: string | null;
  my_role: ChurchRole;
  member_count: number;
  sermon_count: number;
  /** Always 0 unless my_role is admin — the function does not compute it for
   * anyone else rather than computing it and trusting the client to hide it. */
  pending_requests: number;
  latest_sermon_title: string | null;
  latest_sermon_date: string | null;
}

/** One row of list_church_members(). Names come from a SECURITY DEFINER
 * function because `profiles` is readable only for yourself and your friends —
 * a roster read straight from the client would be a list of uuids. */
export interface ChurchMemberRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: ChurchRole;
  joined_at: string;
}

export interface ChurchJoinRequestRow {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export type ChurchSermonStatus = "draft" | "published";

/** A church's outline. `body` is the IDENTICAL format as `sermon_notes.body` —
 * legacy plain text, or sanitised HTML behind lib/richText.ts's sentinel — which
 * is what lets <SermonNoteEditor> be mounted by both surfaces and what makes a
 * fork a straight copy rather than a conversion. */
export interface ChurchSermon {
  id: string;
  church_id: string;
  title: string;
  speaker_name: string | null;
  speaker_user_id: string | null;
  service_date: string | null;
  series: string | null;
  scripture_ref: string | null;
  body: string;
  /** Bumped by a trigger on every substantive edit. Stage 1 records it and does
   * nothing with it; Stage 2's "the church updated this outline" banner compares
   * it against sermon_notes.source_version, which is why it has to be right from
   * the first outline rather than added later. */
  version: number;
  status: ChurchSermonStatus;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** What someone arriving on an invite link is told before they commit. The one
 * thing in Stage 1 readable by a signed-in person who is not a member — and
 * only by exact uuid, which they can only have because someone gave it to them. */
export interface ChurchJoinPreview {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  denomination: string | null;
  open_join: boolean;
  suspended: boolean;
  member_count: number;
  is_member: boolean;
}

/* --------------------------------------------------------------------------
 * Availability
 * ------------------------------------------------------------------------ */

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

/** True when the failure means "sql/033 has not been run", and false for every
 * other failure.
 *
 * The asymmetry points one way on purpose, exactly as moderationApi.ts's twin
 * does: a timeout, a dropped connection or a 500 must NOT be read as "churches
 * aren't installed", because that would quietly remove a church's entire
 * surface — its roster, its outlines, the thing the congregation is looking at
 * — for the rest of the session. Only the errors that specifically mean "no
 * such relation / no such function" count. */
function isMissingSchema(error: PostgrestLikeError | null | undefined): boolean {
  if (!error) return false;
  // PGRST205: table not found in the schema cache. PGRST202: function not found.
  // 42P01 / 42883: Postgres' own undefined_table / undefined_function, which is
  // what comes back when PostgREST passes the database's error through rather
  // than answering from its cache.
  if (error.code && ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code)) return true;
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    msg.includes("could not find the function") ||
    (msg.includes("does not exist") && (msg.includes("relation") || msg.includes("function")))
  );
}

/** null = not asked yet. Cached for the life of the page: the answer only
 * changes when a human runs a migration, which is not something a React render
 * should re-check. */
let availability: boolean | null = null;
let cachedChurches: ChurchSummary[] | null = null;
let probe: Promise<boolean> | null = null;

async function runProbe(): Promise<boolean> {
  const { data, error } = await supabase.rpc("list_my_churches");
  if (error) {
    if (isMissingSchema(error)) {
      availability = false;
      return false;
    }
    // Something else went wrong. Assume the feature IS there — see
    // isMissingSchema's note — but do NOT cache that as a settled answer, so the
    // next caller retries and can populate the list.
    console.error("[churches] list_my_churches failed, assuming the feature is installed:", error.message);
    return true;
  }
  cachedChurches = (data as ChurchSummary[] | null) ?? [];
  availability = true;
  return true;
}

export function isChurchesAvailable(): Promise<boolean> {
  if (availability !== null) return Promise.resolve(availability);
  if (!probe) {
    probe = runProbe().finally(() => {
      // Cleared only when the answer was inconclusive, so a transient failure
      // retries rather than pinning the session to a guess.
      if (availability === null) probe = null;
    });
  }
  return probe;
}

/** `null` while the answer is still in flight. Every caller renders NOTHING
 * church-shaped for null — a Church tab that flashes in and then disappears is
 * worse than one that arrives a beat late, and a "Register your church" button
 * that appears when the migration is missing is worse than both. */
export function useChurchesAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(availability);
  useEffect(() => {
    if (availability !== null) {
      setAvailable(availability);
      return;
    }
    let cancelled = false;
    void isChurchesAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}

/* --------------------------------------------------------------------------
 * Errors
 * ------------------------------------------------------------------------ */

/** Turns what sql/033 raises into a sentence a reader can act on.
 *
 * Matched on the message PREFIX and not the sqlstate, for the reason
 * moderationApi.ts and reportsApi.ts both give: 22023 and 42501 are each shared
 * by several unrelated refusals in that file, and the prefixes are the
 * discriminator the migration deliberately provides. */
export function humanizeChurchError(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (raw.startsWith("church_rate_limited:")) {
    return "You can register one church per day. If you meant to add a second one, try again tomorrow — or ask an admin of the existing church to add you.";
  }
  if (raw.startsWith("church_name_required:")) return "A church needs a name.";
  if (raw.startsWith("guest_account:")) {
    return "You're signed in as a guest. Churches need a real account — sign up and you can register or join one.";
  }
  if (raw.startsWith("not_signed_in:")) return "Sign in first.";
  if (raw.startsWith("not_church_admin:")) {
    return "Only a church admin can do that. If that's a surprise, your role may have changed since this screen loaded — reload and try again.";
  }
  if (raw.startsWith("not_church_staff:")) {
    return "Only the person who wrote that outline, or a church admin, can remove it.";
  }
  if (raw.startsWith("not_a_member:")) {
    return "You're not in this church any more. Your own notes are untouched — they're in My Notes → Sermon Notes, and they always will be.";
  }
  if (raw.startsWith("last_church_admin:")) {
    return "A church has to keep at least one admin. Make someone else an admin first, then you can step down or leave.";
  }
  if (raw.startsWith("self_role_change:")) {
    return "You can't change your own role. Another admin has to do it.";
  }
  if (raw.startsWith("invalid_church_role:")) return "That isn't a role. Reload the page and try again.";
  if (raw.startsWith("church_missing:")) return "That church isn't there any more.";
  if (raw.startsWith("church_suspended:")) {
    return "That church isn't accepting members right now.";
  }
  if (raw.startsWith("sermon_missing:")) return "That outline isn't there any more.";
  if (raw.startsWith("sermon_not_published:")) {
    return "That outline is still a draft. You'll be able to take notes on it once the church publishes it.";
  }
  if (raw.startsWith("request_missing:")) {
    return "That request is gone — someone may have answered it first.";
  }
  if (isMissingSchema({ message: raw })) {
    return "Churches aren't switched on in this database yet (sql/033 hasn't been run). Nothing was saved.";
  }
  if (raw.includes("row-level security policy")) {
    return "The database refused that. Your role at this church may have changed since this screen loaded — reload and try again.";
  }
  if (raw.includes("permission denied")) {
    return "Your account doesn't have access to that.";
  }
  if (!raw) return "Something went wrong. Try again.";
  // Same last resort, and the same reasoning, as humanizeModerationError():
  // anything reaching here is a string nobody wrote for a reader.
  console.error("[churches] unhandled error, showing the generic message instead:", raw, err);
  return "Something went wrong. Try again.";
}

function fail(error: PostgrestLikeError | null): never | void {
  if (error) throw new Error(error.message);
}

/* --------------------------------------------------------------------------
 * Churches
 * ------------------------------------------------------------------------ */

/** The caller's churches. Returns the probe's cached answer on the first call
 * so opening the panel costs one round trip, not two. */
export async function fetchMyChurches(force = false): Promise<ChurchSummary[]> {
  if (!force && cachedChurches) return cachedChurches;
  const ok = await isChurchesAvailable();
  if (!ok) return [];
  if (!force && cachedChurches) return cachedChurches;
  const { data, error } = await supabase.rpc("list_my_churches");
  if (error) throw new Error(error.message);
  cachedChurches = (data as ChurchSummary[] | null) ?? [];
  return cachedChurches;
}

/** Drops the cached list so the next fetch goes to the database. Called after
 * anything that changes which churches the caller is in, or their shape. */
export function invalidateMyChurches() {
  cachedChurches = null;
}

export interface NewChurch {
  name: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  denomination?: string | null;
  website?: string | null;
  phone?: string | null;
  about?: string | null;
  serviceTimes?: string | null;
}

/** Registers a church and makes the caller its first admin, in one transaction.
 * Rate-limited to one per account per 24h by the database, not by this file. */
export async function createChurch(input: NewChurch): Promise<string> {
  const { data, error } = await supabase.rpc("create_church", {
    p_name: input.name.trim(),
    p_city: input.city?.trim() || null,
    p_region: input.region?.trim() || null,
    p_country: input.country?.trim() || null,
    p_denomination: input.denomination?.trim() || null,
    p_website: input.website?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_about: input.about?.trim() || null,
    p_service_times: input.serviceTimes?.trim() || null,
  });
  if (error) throw new Error(error.message);
  invalidateMyChurches();
  return data as string;
}

export async function fetchChurch(churchId: string): Promise<Church | null> {
  const { data, error } = await supabase.from("churches").select("*").eq("id", churchId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Church | null) ?? null;
}

/** A plain UPDATE, on purpose rather than through an RPC. Which columns may
 * move is decided by the column-level GRANT in sql/033 — send anything outside
 * it and the database refuses the statement. An RPC here would move that list
 * into a function body where a later edit could widen it without anyone
 * noticing. */
export async function updateChurchProfile(churchId: string, patch: ChurchProfilePatch): Promise<void> {
  const { error } = await supabase.from("churches").update(patch).eq("id", churchId);
  fail(error);
  invalidateMyChurches();
}

export async function softDeleteChurch(churchId: string): Promise<void> {
  const { error } = await supabase.rpc("soft_delete_church", { p_church_id: churchId });
  fail(error);
  invalidateMyChurches();
}

/* --------------------------------------------------------------------------
 * Membership
 * ------------------------------------------------------------------------ */

export async function fetchChurchMembers(churchId: string): Promise<ChurchMemberRow[]> {
  const { data, error } = await supabase.rpc("list_church_members", { p_church_id: churchId });
  if (error) throw new Error(error.message);
  return (data as ChurchMemberRow[] | null) ?? [];
}

export async function fetchChurchJoinRequests(churchId: string): Promise<ChurchJoinRequestRow[]> {
  const { data, error } = await supabase.rpc("list_church_join_requests", { p_church_id: churchId });
  if (error) throw new Error(error.message);
  return (data as ChurchJoinRequestRow[] | null) ?? [];
}

export async function addChurchMember(churchId: string, memberId: string): Promise<void> {
  const { error } = await supabase.rpc("add_church_member", { p_church_id: churchId, p_member_id: memberId });
  fail(error);
}

export async function setChurchRole(churchId: string, memberId: string, role: ChurchRole): Promise<void> {
  const { error } = await supabase.rpc("set_church_role", {
    p_church_id: churchId,
    p_member_id: memberId,
    p_role: role,
  });
  fail(error);
}

/** Removing someone, and leaving yourself, are the same DELETE — the policy in
 * sql/033 decides which of the two you are entitled to, and a trigger underneath
 * both refuses to let the last admin go. */
export async function removeChurchMember(churchId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("church_members").delete().eq("church_id", churchId).eq("user_id", userId);
  fail(error);
  invalidateMyChurches();
}

export interface JoinChurchResult {
  churchName: string;
  /** True when the church is open-join and the caller is now in it. False means
   * a request was filed and an admin has to approve it. */
  joined: boolean;
  /** True when they were already a member — an invite link opened twice. */
  already: boolean;
}

export async function requestToJoinChurch(churchId: string): Promise<JoinChurchResult> {
  const { data, error } = await supabase.rpc("request_to_join_church", { p_church_id: churchId });
  if (error) throw new Error(error.message);
  const raw = (data ?? {}) as Record<string, unknown>;
  invalidateMyChurches();
  return {
    churchName: String(raw.church_name ?? "that church"),
    joined: raw.joined === true,
    already: raw.already === true,
  };
}

export async function respondToChurchJoinRequest(requestId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc("respond_to_church_join_request", {
    p_request_id: requestId,
    p_approve: approve,
  });
  fail(error);
  invalidateMyChurches();
}

export async function fetchChurchJoinPreview(churchId: string): Promise<ChurchJoinPreview | null> {
  const { data, error } = await supabase.rpc("church_join_preview", { p_church_id: churchId });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const raw = data as Record<string, unknown>;
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    city: (raw.city as string | null) ?? null,
    region: (raw.region as string | null) ?? null,
    denomination: (raw.denomination as string | null) ?? null,
    open_join: raw.open_join === true,
    suspended: raw.suspended === true,
    member_count: Number(raw.member_count ?? 0),
    is_member: raw.is_member === true,
  };
}

/* --------------------------------------------------------------------------
 * Outlines
 * ------------------------------------------------------------------------ */

/** Every outline this caller may see at this church. Which ones those are is
 * the SELECT policy's business: a member gets published-and-undeleted, staff
 * also get drafts. This file does not filter by status and must not start to —
 * doing so would put a second, weaker copy of the rule in the browser. */
export async function fetchChurchSermons(churchId: string): Promise<ChurchSermon[]> {
  const { data, error } = await supabase
    .from("church_sermons")
    .select("*")
    .eq("church_id", churchId)
    .order("service_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ChurchSermon[] | null) ?? [];
}

export interface ChurchSermonDraft {
  title: string;
  speaker_name: string | null;
  service_date: string | null;
  series: string | null;
  scripture_ref: string | null;
  body: string;
  status?: ChurchSermonStatus;
}

export async function createChurchSermon(
  churchId: string,
  userId: string,
  draft: ChurchSermonDraft
): Promise<ChurchSermon> {
  const { data, error } = await supabase
    .from("church_sermons")
    .insert({ church_id: churchId, created_by: userId, ...draft })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ChurchSermon;
}

/** Note what is NOT sent: version, published_at, updated_at, updated_by,
 * church_id. All of those are the trigger's, and none of them is in the column
 * grant, so sending one would be refused rather than quietly applied. */
export async function updateChurchSermon(
  sermonId: string,
  patch: Partial<ChurchSermonDraft>
): Promise<ChurchSermon> {
  const { data, error } = await supabase.from("church_sermons").update(patch).eq("id", sermonId).select().single();
  if (error) throw new Error(error.message);
  return data as ChurchSermon;
}

export async function softDeleteChurchSermon(sermonId: string): Promise<void> {
  const { error } = await supabase.rpc("soft_delete_church_sermon", { p_sermon_id: sermonId });
  fail(error);
}

/** "Take notes on this" — the whole feature, in one call.
 *
 * SNAPSHOT AT FORK TIME. What comes back is an ordinary row of `sermon_notes`,
 * owned by the caller, storage-indistinguishable from a note they typed
 * themselves apart from five provenance columns. It is never live-linked to the
 * church's copy, and the church can never reach it again. Returns the new note's
 * id. */
export async function forkChurchSermon(sermonId: string): Promise<string> {
  const { data, error } = await supabase.rpc("fork_church_sermon", { p_church_sermon_id: sermonId });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Which of this church's outlines the caller has already taken notes on.
 *
 * Read from their OWN sermon_notes rows under the existing owner-only policy —
 * there is no church-side record of who forked what, deliberately: a church
 * knowing which of its members took notes, and which did not, is surveillance
 * nobody asked for. */
export async function fetchForkedSermonIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("sermon_notes")
    .select("source_church_sermon_id")
    .eq("user_id", userId)
    .not("source_church_sermon_id", "is", null);
  if (error) throw new Error(error.message);
  const rows = (data as { source_church_sermon_id: string | null }[] | null) ?? [];
  return new Set(rows.map((r) => r.source_church_sermon_id).filter((id): id is string => !!id));
}

/* --------------------------------------------------------------------------
 * Invite links
 * ------------------------------------------------------------------------ */

/** `?joinChurch=<id>`, the same convention as the existing `?invite=` and
 * `?joinGroup=` links App.tsx already handles. There is no router in this
 * project; a query parameter is the whole of the deep-linking story and this
 * needed no routing work. */
export function churchInviteUrl(churchId: string): string {
  return `${window.location.origin}${window.location.pathname}?joinChurch=${churchId}`;
}
