/**
 * groups.ts — Capstone Plus for Groups (sql/047), the client half.
 *
 * WHAT DECIDES WHETHER ANY GROUPS UI IS DRAWN
 * ----------------------------------------------------------------------------
 * `groups_status()` answers `groups_enabled` for the signed-in account: app_settings
 * 'paid.groups_enabled' (ships FALSE), or the owner while 'paid.groups_owner_preview' is on. FAIL
 * CLOSED: if the call errors — including today, when sql/047 is not applied and the function does not
 * exist — the answer is "off" and nothing is drawn, and no other groups call is ever made. Never drawn
 * in a native store build (plan §3: group purchasing is web only) or for a guest.
 *
 * Nothing here grants access or touches a price. The seat count is stored on the class at signup and
 * the group-billing Edge Function reads it server-side; the client sends only a class id.
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { isNativeApp } from "./billing";
import { GROUP_AGREEMENT_TEXT, GROUP_AGREEMENT_VERSION, groupAgreementSha256 } from "./groupAgreement";
import type { GroupInterval, GroupKind } from "./groupWording";

// ------------------------------------------------------------------------------- status store
interface GroupsStatus {
  loaded: boolean;
  enabled: boolean;
}
const OFF: GroupsStatus = { loaded: true, enabled: false };
let state: GroupsStatus = { loaded: false, enabled: false };
let inflight: Promise<void> | null = null;
let forUser: string | null | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function refreshGroupsStatus(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user ?? null;
      forUser = user?.id ?? null;
      if (!user || user.is_anonymous || isNativeApp()) {
        state = OFF;
        return;
      }
      const { data, error } = await supabase.rpc("groups_status");
      state = !error && data && typeof data === "object" && (data as { groups_enabled?: unknown }).groups_enabled === true
        ? { loaded: true, enabled: true }
        : OFF;
    } catch {
      state = OFF;
    } finally {
      inflight = null;
      notify();
    }
  })();
  return inflight;
}

supabase.auth.onAuthStateChange((_event, session) => {
  const uid = session?.user.id ?? null;
  if (forUser !== undefined && uid !== forUser) {
    state = { loaded: false, enabled: false };
    notify();
    void refreshGroupsStatus();
  }
});

export function useGroupsEnabled(): boolean {
  const snap = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (!state.loaded && !inflight) void refreshGroupsStatus();
  }, []);
  return snap.loaded && snap.enabled && !isNativeApp();
}

// ------------------------------------------------------------------------------- errors
/** sql/047 raises "code: human sentence"; show the sentence. */
export function groupErrorMessage(e: unknown): string {
  const raw = (e as { message?: string } | null)?.message ?? String(e ?? "");
  const m = /^[a-z_]+: (.+)$/.exec(raw);
  if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1) + (/[.?!]$/.test(m[1]) ? "" : ".");
  return raw || "Something went wrong. Please try again.";
}

// ------------------------------------------------------------------------------- create
export interface CreateGroupInput {
  kind: GroupKind;
  orgName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  className: string;
  description: string;
  startsOn: string;
  endsOn: string | null;
  seats: number;
  interval: GroupInterval;
  typedName: string;
  accepted: boolean;
}

export interface CreatedGroup {
  classId: string;
  orgId: string;
  joinCode: string;
}

export async function createGroupClass(input: CreateGroupInput): Promise<CreatedGroup> {
  const sha = await groupAgreementSha256(GROUP_AGREEMENT_TEXT);
  let timeZone = "America/Denver";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || timeZone;
  } catch {
    /* keep the default */
  }
  const p = {
    kind: input.kind,
    org_name: input.orgName,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2,
    city: input.city,
    region: input.region,
    postal_code: input.postalCode,
    country: input.country,
    phone: input.phone,
    class_name: input.className,
    description: input.description,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    time_zone: timeZone,
    seats: input.seats,
    interval: input.interval,
    billing_mode: "admin_pays",
    agreement_version: GROUP_AGREEMENT_VERSION,
    agreement_sha256: sha,
    typed_name: input.typedName,
    accepted: input.accepted,
  };
  const { data, error } = await supabase.rpc("create_group_class", { p });
  if (error) throw new Error(groupErrorMessage(error));
  const d = (data ?? {}) as { class_id?: string; org_id?: string; join_code?: string };
  if (!d.class_id || !d.org_id) throw new Error("Something went wrong. Please try again.");
  return { classId: d.class_id, orgId: d.org_id, joinCode: d.join_code ?? "" };
}

// ------------------------------------------------------------------------------- logo
export const ORG_LOGO_BUCKET = "org-logos";
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Checks and re-encodes a chosen logo: PNG / JPEG / WebP only (SVG refused: it can carry script), at
 * most 2 MB, drawn onto a canvas at no more than 512px and re-encoded as WebP, which also drops any
 * metadata. The bucket (sql/047) enforces type and size again on the server.
 */
export async function prepareLogo(file: File): Promise<Blob> {
  if (!LOGO_TYPES.includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > LOGO_MAX_BYTES) throw new Error("The logo must be 2 MB or smaller.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser could not read that image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
  if (!blob) throw new Error("This browser could not read that image.");
  return blob;
}

/** Uploads to org-logos/<orgId>/logo.webp and records the path on the organisation. */
export async function uploadOrgLogo(orgId: string, blob: Blob): Promise<string> {
  const path = `${orgId}/logo.webp`;
  const { error } = await supabase.storage.from(ORG_LOGO_BUCKET).upload(path, blob, { contentType: "image/webp", upsert: true });
  if (error) throw new Error("The logo could not be uploaded. You can add it later.");
  const { error: upd } = await supabase.from("churches").update({ logo_url: path }).eq("id", orgId);
  if (upd) throw new Error("The logo was uploaded but could not be saved. You can add it later.");
  return path;
}

// ------------------------------------------------------------------------------- billing
async function invokeGroupBilling<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>("group-billing", { body });
  if (error) {
    let message = "Could not reach the payment service. Please try again.";
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j && typeof j.error === "string") message = j.error;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  if (!data || (data as { error?: string }).error) throw new Error((data as { error?: string } | null)?.error ?? "Something went wrong. Please try again.");
  return data;
}

/** Goes to Stripe Checkout for the class's seats. Resolves only on failure (the page navigates). */
export async function startGroupCheckout(classId: string): Promise<void> {
  const r = await invokeGroupBilling<{ url?: string }>({ action: "checkout", class_id: classId, return_to: window.location.origin });
  if (!r.url) throw new Error("Stripe did not return a checkout page.");
  window.location.assign(r.url);
}

export async function addGroupSeats(classId: string, add: number): Promise<number> {
  const r = await invokeGroupBilling<{ quantity?: number }>({ action: "add_seats", class_id: classId, add });
  return r.quantity ?? 0;
}

// ------------------------------------------------------------------------------- my classes, join
export interface MyClass {
  classId: string;
  kind: GroupKind;
  name: string;
  description: string | null;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
  role: "owner" | "co_teacher" | "member";
  orgName: string;
  leaderName: string | null;
  /** Staff only. */
  seatsRequested?: number;
  seatsPurchased?: number;
  seatsUsed?: number;
  seatCap?: number;
  joinCode?: string;
  billingStatus?: string | null;
  billingInterval?: GroupInterval;
}

export async function fetchMyClasses(): Promise<MyClass[]> {
  const { data, error } = await supabase.rpc("my_classes");
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    classId: String(r.class_id ?? ""),
    kind: r.kind === "school" ? "school" : "church",
    name: String(r.name ?? ""),
    description: typeof r.description === "string" ? r.description : null,
    startsOn: typeof r.starts_on === "string" ? r.starts_on : null,
    endsOn: typeof r.ends_on === "string" ? r.ends_on : null,
    status: String(r.status ?? ""),
    role: r.role === "owner" || r.role === "co_teacher" ? r.role : "member",
    orgName: String(r.org_name ?? ""),
    leaderName: typeof r.leader_name === "string" ? r.leader_name : null,
    seatsRequested: typeof r.seats_requested === "number" ? r.seats_requested : undefined,
    seatsPurchased: typeof r.seats_purchased === "number" ? r.seats_purchased : undefined,
    seatsUsed: typeof r.seats_used === "number" ? r.seats_used : undefined,
    seatCap: typeof r.seat_cap === "number" ? r.seat_cap : undefined,
    joinCode: typeof r.join_code === "string" ? r.join_code : undefined,
    billingStatus: typeof r.billing_status === "string" ? r.billing_status : null,
    billingInterval: r.billing_interval === "year" ? "year" : r.billing_interval === "month" ? "month" : undefined,
  }));
}

const JOIN_ERRORS: Record<string, string> = {
  not_found: "That code didn't match an open class or group. Check it with your teacher or leader.",
  full: "This class or group is full. Your teacher or leader needs to add seats.",
  ended: "That class or group has ended.",
  rate_limited: "Too many tries. Please wait an hour and try again.",
  too_many_classes: "You're already in 10 classes or groups.",
  already_staff: "You already lead this class or group.",
  guest_account: "Create a free account first.",
};

export async function joinClassByCode(code: string): Promise<{ classId: string; name: string }> {
  const { data, error } = await supabase.rpc("join_class", { p_code: code });
  if (error) throw new Error("Could not join. Please try again.");
  const d = (data ?? {}) as { ok?: boolean; error?: string; class_id?: string; name?: string };
  if (!d.ok) throw new Error(JOIN_ERRORS[d.error ?? ""] ?? "Could not join. Please try again.");
  return { classId: d.class_id ?? "", name: d.name ?? "" };
}

export async function leaveClass(classId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_class", { p_class_id: classId });
  if (error) throw new Error("Could not leave. Please try again.");
}

export interface RosterRow {
  userId: string;
  displayName: string | null;
  joinedAt: string;
  seatState: string;
}

export async function fetchRoster(classId: string): Promise<RosterRow[]> {
  const { data, error } = await supabase.rpc("class_roster", { p_class_id: classId });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    userId: String(r.user_id ?? ""),
    displayName: typeof r.display_name === "string" ? r.display_name : null,
    joinedAt: String(r.joined_at ?? ""),
    seatState: String(r.seat_state ?? ""),
  }));
}

// ------------------------------------------------------------------------------- return from Stripe
/** Reads and strips `?groups=success|cancel` set by group-billing's return URLs. */
export function consumeGroupsReturn(): "success" | "cancel" | null {
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("groups");
    if (v === null) return null;
    url.searchParams.delete("groups");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    return v === "success" || v === "cancel" ? v : null;
  } catch {
    return null;
  }
}
