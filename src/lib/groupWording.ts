/**
 * groupWording.ts — every word the Groups feature shows that differs between a school class and a
 * church group. Chosen once at signup (`kind`, stored on the class and on its organisation, sql/047)
 * and never hard-coded in a screen: a component asks `groupWording(kind)` and prints what it gets.
 * Table from automation/manager/groups-feature-plan.md section 1.
 *
 * Pricing constants live here too so the signup screen's estimate and the seat limits have ONE home.
 * The amounts are Robbie's decision (plan: $3.25/seat/month, $32.50/seat/year, about 34% off Plus);
 * Stripe holds the real prices (STRIPE_PRICE_GROUP_MONTHLY / _ANNUAL) and Checkout shows the final
 * amount with tax before anyone pays, so what is printed here is labelled an estimate.
 */

export type GroupKind = "school" | "church";

export interface GroupWording {
  kind: GroupKind;
  /** "School" / "Church" */
  organisation: string;
  /** "class" / "group" (lower case; use cap() for a heading) */
  unit: string;
  units: string;
  /** "Teacher" / "Leader" */
  admin: string;
  coAdmin: string;
  /** "student" / "member" */
  participant: string;
  participants: string;
  workItem: string;
  /** "Assignments" (both kinds today; one home if a church group ever calls them "Studies"). */
  workItems: string;
  score: string;
  /** Status once work is returned: "Graded" / "Reviewed" (church groups hide numbers by default). */
  gradedLabel: string;
  gradebook: string;
  /** "Class ends" / "Group ends" */
  end: string;
  /** Signup choice card. */
  choiceTitle: string;
  choiceBlurb: string;
  /** "Your teacher invited you to join [Class] on Capstone Bible" */
  inviteLine: (unitName: string, adminName: string | null) => string;
  /** What a joining participant is told the admin will see (plan §1 flow C.3). */
  privacyNote: string;
}

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const SCHOOL: GroupWording = {
  kind: "school",
  organisation: "School",
  unit: "class",
  units: "classes",
  admin: "Teacher",
  coAdmin: "Co-teacher",
  participant: "student",
  participants: "students",
  workItem: "Assignment",
  workItems: "Assignments",
  score: "Grade",
  gradedLabel: "Graded",
  gradebook: "Gradebook",
  end: "Class ends",
  choiceTitle: "School class",
  choiceBlurb: "For a teacher and students aged 13 and over.",
  inviteLine: (name) => `Your teacher invited you to join ${name} on Capstone Bible`,
  privacyNote:
    "Your teacher will see your answers and grades on this class's assignments. They will not see your notes, highlights, prayer list, messages or anything else you do in Capstone Bible.",
};

const CHURCH: GroupWording = {
  kind: "church",
  organisation: "Church",
  unit: "group",
  units: "groups",
  admin: "Leader",
  coAdmin: "Co-leader",
  participant: "member",
  participants: "members",
  workItem: "Assignment",
  workItems: "Assignments",
  score: "Score",
  gradedLabel: "Reviewed",
  gradebook: "Progress",
  end: "Group ends",
  choiceTitle: "Church group",
  choiceBlurb: "For a small group, Bible study or Sunday-school class (ages 13 and over).",
  inviteLine: (name, admin) => `${admin ?? "Your leader"} invited you to join ${name} on Capstone Bible`,
  privacyNote:
    "Your leader will see your answers on this group's assignments. They will not see your notes, highlights, prayer list, messages or anything else you do in Capstone Bible.",
};

export function groupWording(kind: GroupKind): GroupWording {
  return kind === "school" ? SCHOOL : CHURCH;
}

export const isGroupKind = (v: unknown): v is GroupKind => v === "school" || v === "church";

// ------------------------------------------------------------------------------- pricing + limits
/** Per seat, in cents. Mirror of the Stripe prices; see the header. */
export const GROUP_SEAT_PRICE_CENTS = { month: 325, year: 3250 } as const;
export const GROUP_MIN_SEATS = 5;
export const GROUP_DEFAULT_CAP = 50;
export const GROUP_MAX_SEATS = 200;

export type GroupInterval = "month" | "year";

export function groupEstimate(seats: number, interval: GroupInterval): string {
  const cents = Math.max(0, Math.floor(seats)) * GROUP_SEAT_PRICE_CENTS[interval];
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;
  return `${seats} seats × ${money(GROUP_SEAT_PRICE_CENTS[interval])} = ${money(cents)} per ${interval}`;
}
