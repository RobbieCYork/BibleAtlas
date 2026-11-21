/**
 * groupSupport.ts — audited owner support access to classes (sql/050). Lazy chunk only.
 *
 * Robbie, 2026-11-21 (via Rev): the app owner may see a class's roster to support its admin. Every
 * lookup needs a reason, is rate limited, and is logged where the class's staff can read it. Grades
 * (never answers or essays) need a time-limited grant from the class owner.
 */
import { supabase } from "./supabase";
import { groupErrorMessage } from "./groups";

/** DRAFT FOR COUNSEL: the line proposed for the Privacy Policy and the Terms. Not published anywhere. */
export const SUPPORT_ACCESS_POLICY_DRAFT =
  "Capstone staff may view class rosters to provide support; access is logged and visible to the class admin.";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(groupErrorMessage(error));
  return data as T;
}

export interface SupportClass {
  class_id: string;
  name: string;
  kind: "school" | "church";
  status: string;
  org_name: string;
  seats_purchased: number;
  seats_used: number;
}
export interface SupportRoster {
  class: SupportClass & { seat_cap: number };
  staff: { display_name: string | null; role: string; added_at: string }[];
  members: { display_name: string | null; seat_state: string; joined_at: string; left_at: string | null }[];
  invites: { address: string | null; status: string; sends: number; created_at: string }[];
}
export interface SupportGradebook {
  students: { user_id: string; display_name: string | null; active: boolean }[];
  assignments: { id: string; title: string; due_at: string | null }[];
  cells: { assignment_id: string; user_id: string; status: string; is_late: boolean; final_score: number | null; max_points: number | null }[];
}
export interface SupportLog {
  grant: { expires_at: string; granted_at: string } | null;
  entries: { at: string; kind: string; reason: string | null; by: "capstone" | "class" }[];
}

export const supportFindClasses = (query: string, reason: string) =>
  rpc<SupportClass[]>("owner_support_find_classes", { p_query: query, p_reason: reason }).then((d) => d ?? []);
export const supportRoster = (classId: string, reason: string) => rpc<SupportRoster>("owner_support_roster", { p_class_id: classId, p_reason: reason });
export const supportGradebook = (classId: string, reason: string) =>
  rpc<SupportGradebook>("owner_support_gradebook", { p_class_id: classId, p_reason: reason });
export const classSupportLog = (classId: string) => rpc<SupportLog>("class_support_log", { p_class_id: classId });
export const grantSupportAccess = (classId: string, hours = 24) => rpc<{ expires_at: string }>("grant_support_access", { p_class_id: classId, p_hours: hours });
export const revokeSupportAccess = (classId: string) => rpc<void>("revoke_support_access", { p_class_id: classId });
