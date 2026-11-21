// Capstone Plus for Groups, phase 3: the invite / reminder / "class is full" emails.
//
// ONE module, used twice: by the group-invite-mailer Edge Function (Deno) to render what is sent,
// and by the app (src/components/GroupInvites.tsx, lazy Groups chunk only) to show the teacher a
// preview of exactly that. Pure TypeScript, no imports, no Deno or DOM globals, so it type-checks in
// both and runs under `node --test`.
//
// RULES THIS FILE KEEPS (plan §4, CAN-SPAM [V: FTC compliance guide], all DRAFT FOR COUNSEL):
//   * Accurate From ("Capstone Bible") and a subject that says what the email is.
//   * Says who asked us to send it (the teacher's name and the organisation).
//   * Identifies itself as an invitation to a commercial service (CAN-SPAM's "advertisement"
//     identification — the plan treats every invite and reminder as commercial).
//   * A working unsubscribe link in every email (one click from the mail client via the
//     List-Unsubscribe header the mailer adds; a page with "everything" vs "only this class").
//   * Our physical postal address. Until the LLC exists there is none: the mailer REFUSES to send
//     live mail without MAIL_POSTAL_ADDRESS, and previews show POSTAL_ADDRESS_PLACEHOLDER.
//   * The ONLY teacher-written text is a personal note of at most 280 characters (the database
//     refuses links in it) and the class / organisation / teacher names (also link-free). Every
//     piece of it is HTML-escaped and stripped of control characters here, whatever the database
//     already checked.
//   * Plain, accessible HTML: lang, one column, real text (no images), 16px, high contrast,
//     underlined links with descriptive text, and a complete plain-text part.

export type InviteKind = "school" | "church";
export type InviteStage = "invite" | "reminder";

/** DRAFT FOR COUNSEL. Replaced by the LLC's real address via the MAIL_POSTAL_ADDRESS secret. */
export const POSTAL_ADDRESS_PLACEHOLDER = "[Postal address: TODO for Robbie, the LLC's mailing address goes here]";
export const INVITE_SENDER_NAME = "Capstone Bible";
export const NOTE_MAX = 280;
/** Sends 2..6 go out this many days after send 1. sql/049 invite_reminder_offsets() must agree (tested). */
export const INVITE_REMINDER_DAYS = [1, 3, 5, 14, 30] as const;
export const INVITE_MAX_EMAILS = 1 + INVITE_REMINDER_DAYS.length;

const WORDS: Record<InviteKind, { unit: string; admin: string; org: string }> = {
  school: { unit: "class", admin: "teacher", org: "school" },
  church: { unit: "group", admin: "leader", org: "church" },
};

/** HTML-escapes the five characters that matter in text and attribute context. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** One line of untrusted text: control characters out (CR/LF included), whitespace collapsed, capped. */
export function cleanLine(s: string | null | undefined, max: number): string {
  const t = String(s ?? "")
    .replace(new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]", "g"), " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

export interface InviteEmailInput {
  kind: InviteKind;
  stage: InviteStage;
  /** 1 = the invite, 2..6 = reminders. */
  seq: number;
  className: string;
  orgName: string;
  teacherName: string | null;
  personalNote: string | null;
  joinUrl: string;
  unsubscribeUrl: string;
  reportUrl: string;
  /** null = not configured: the placeholder is shown (previews / dry run only). */
  postalAddress: string | null;
  /** ISO date the link stops working. */
  expiresAt?: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function longDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function safeUrl(u: string): string {
  // Only our own https links are ever put in an email. Anything else renders as nothing clickable.
  return /^https:\/\/[^\s"'<>]+$/.test(u) || /^mailto:[^\s"'<>]+$/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/[^\s"'<>]*$/.test(u) ? u : "";
}

export function renderInviteEmail(input: InviteEmailInput): RenderedEmail {
  const w = WORDS[input.kind] ?? WORDS.church;
  const cls = cleanLine(input.className, 80) || `a ${w.unit}`;
  const org = cleanLine(input.orgName, 80);
  const teacher = cleanLine(input.teacherName, 60);
  const who = teacher || `Your ${w.admin}`;
  const note = cleanLine(input.personalNote, NOTE_MAX);
  const postal = cleanLine(input.postalAddress, 200) || POSTAL_ADDRESS_PLACEHOLDER;
  const join = safeUrl(input.joinUrl);
  const unsub = safeUrl(input.unsubscribeUrl);
  const report = safeUrl(input.reportUrl);
  const expires = longDate(input.expiresAt);
  const reminderNo = Math.max(0, Math.min(INVITE_REMINDER_DAYS.length, input.seq - 1));
  const isReminder = input.stage === "reminder" && reminderNo > 0;

  const subject = cleanLine(
    `${isReminder ? "Reminder: " : ""}${who} invited you to join ${cls} on Capstone Bible`,
    150,
  );

  const lead = `${who}${org ? ` (${w.admin} at ${org})` : ""} invited you to join the ${w.unit} "${cls}" on Capstone Bible, a Bible study app with maps, a timeline and reading plans.`;
  const plus = `Capstone Plus is included while you're in the ${w.unit}. You don't pay anything.`;
  const sees = `Your ${w.admin} will see your answers and scores on this ${w.unit}'s assignments. They won't see your notes, highlights, prayer list or messages.`;
  const age = `You must be 13 or older to join.`;
  const linkLine = `This link is for you and works once.${expires ? ` It stops working on ${expires}.` : ""}`;
  const remindLine = isReminder
    ? `This is reminder ${reminderNo} of ${INVITE_REMINDER_DAYS.length}. We stop as soon as you join or unsubscribe.`
    : `If you don't join, we'll send up to ${INVITE_REMINDER_DAYS.length} reminders over the next month, then stop.`;
  const ignore = `Not expecting this? You can ignore it, or unsubscribe below and no one can invite this address again.`;
  // DRAFT FOR COUNSEL: CAN-SPAM identification + sender identity + why they got it.
  const why = `This is an invitation to Capstone Bible, a paid service, sent by Capstone Bible at the request of ${teacher || `a ${w.admin}`}${org ? ` at ${org}` : ""}.`;

  const text = [
    `${lead}`,
    "",
    ...(note ? [`A note from ${who}: "${note}"`, ""] : []),
    `Join ${cls}: ${join}`,
    linkLine,
    "",
    plus,
    sees,
    age,
    "",
    remindLine,
    ignore,
    "",
    "--",
    why,
    `Unsubscribe: ${unsub}`,
    `Report abuse: ${report}`,
    `${INVITE_SENDER_NAME}, ${postal}`,
  ].join("\n");

  const p = (s: string, style = "") => `<p style="margin:0 0 16px;${style}">${s}</p>`;
  const a = (href: string, label: string) =>
    href ? `<a href="${escapeHtml(href)}" style="color:#1d4ed8;text-decoration:underline">${escapeHtml(label)}</a>` : escapeHtml(label);
  const html = [
    `<!doctype html>`,
    `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<title>${escapeHtml(subject)}</title></head>`,
    `<body style="margin:0;padding:0;background:#ffffff;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5">`,
    `<div style="max-width:560px;margin:0 auto;padding:24px 16px">`,
    p(escapeHtml(lead)),
    note
      ? `<blockquote style="margin:0 0 16px;padding:8px 12px;border-left:4px solid #6b7280;color:#1a1a1a">${escapeHtml(`A note from ${who}:`)}<br>${escapeHtml(note)}</blockquote>`
      : "",
    p(
      join
        ? `<a href="${escapeHtml(join)}" style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-weight:bold">${escapeHtml(`Join ${cls}`)}</a>`
        : escapeHtml(`Join ${cls}`),
    ),
    p(`${escapeHtml(linkLine)} ${join ? `If the button doesn't work, copy this address into your browser:<br><span style="word-break:break-all">${escapeHtml(join)}</span>` : ""}`, "font-size:14px"),
    p(escapeHtml(plus)),
    p(escapeHtml(sees)),
    p(escapeHtml(age)),
    p(escapeHtml(remindLine), "font-size:14px"),
    p(escapeHtml(ignore), "font-size:14px"),
    `<hr style="border:0;border-top:1px solid #d1d5db;margin:24px 0 16px">`,
    p(escapeHtml(why), "font-size:13px;color:#374151"),
    p(`${a(unsub, "Unsubscribe")} &middot; ${a(report, "Report abuse")}`, "font-size:13px;color:#374151"),
    p(escapeHtml(`${INVITE_SENDER_NAME}, ${postal}`), "font-size:13px;color:#374151"),
    `</div></body></html>`,
  ].join("\n");

  return { subject, html, text };
}

export interface FullNoticeInput {
  kind: InviteKind;
  className: string;
  seats: number;
  appUrl: string;
  postalAddress: string | null;
}

/** To the class OWNER (a service message about their own purchase): someone was turned away. */
export function renderFullNotice(input: FullNoticeInput): RenderedEmail {
  const w = WORDS[input.kind] ?? WORDS.church;
  const cls = cleanLine(input.className, 80);
  const postal = cleanLine(input.postalAddress, 200) || POSTAL_ADDRESS_PLACEHOLDER;
  const app = safeUrl(input.appUrl);
  const subject = cleanLine(`Your ${w.unit} ${cls} is full`, 150);
  const body = `Someone tried to join "${cls}" but all ${input.seats} seats are taken. To let more people in, open Capstone Bible, go to Classes & Groups and add seats. We only send this once each time the ${w.unit} fills up.`;
  const text = [body, "", app, "", "--", `${INVITE_SENDER_NAME}, ${postal}`].join("\n");
  const html = [
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>`,
    `<body style="margin:0;background:#ffffff;color:#1a1a1a;font-family:Georgia,serif;font-size:16px;line-height:1.5">`,
    `<div style="max-width:560px;margin:0 auto;padding:24px 16px">`,
    `<p style="margin:0 0 16px">${escapeHtml(body)}</p>`,
    app ? `<p style="margin:0 0 16px"><a href="${escapeHtml(app)}" style="color:#1d4ed8">Open Capstone Bible</a></p>` : "",
    `<p style="margin:24px 0 0;font-size:13px;color:#374151">${escapeHtml(`${INVITE_SENDER_NAME}, ${postal}`)}</p>`,
    `</div></body></html>`,
  ].join("\n");
  return { subject, html, text };
}
