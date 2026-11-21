/**
 * groupAgreement.ts — the teacher / leader agreement for Capstone Plus for Groups.
 *
 * *** DRAFT FOR COUNSEL. NOT FINAL. NOT LEGAL ADVICE. ***
 * Outline from automation/manager/groups-feature-plan.md section 6. Every clause here is for Robbie's
 * lawyer to rewrite; nothing in this file may be presented to anyone as final terms. The text says so
 * in its own first line, so a screen that shows it cannot drop the warning.
 *
 * HOW ACCEPTANCE IS RECORDED (sql/047 class_agreements)
 * ----------------------------------------------------------------------------
 * The client sends GROUP_AGREEMENT_VERSION and the SHA-256 (hex) of GROUP_AGREEMENT_TEXT exactly as
 * shown. create_group_class() refuses any (version, hash) pair that is not seeded in
 * class_agreement_versions, so a client cannot record acceptance of text we never published. If you
 * change ONE character below, bump the version and seed the new hash in a new migration;
 * `node scripts/groups/agreement-hash.mjs --check` fails the moment the two disagree.
 *
 * Kind-neutral on purpose ("class or group", "students or members"): one text, one hash, for both
 * school and church signups.
 *
 * Deliberately dependency-free (no imports) so node can load it directly for the hash check.
 */

export const GROUP_AGREEMENT_VERSION = "2026-11-21-draft-1";

/** True until counsel signs off. The signup screen shows a DRAFT banner while this is true. */
export const GROUP_AGREEMENT_IS_DRAFT = true;

export const GROUP_AGREEMENT_TEXT = [
  "DRAFT FOR COUNSEL - NOT FINAL. This agreement has not been reviewed by a lawyer and will change.",
  "",
  "Capstone Plus for Groups: leader agreement (version 2026-11-21-draft-1)",
  "",
  "By ticking the box and typing my name, I agree that:",
  "",
  "1. I am authorised by the school or church named above to set up this class or group, or I lead it with that organisation's knowledge.",
  "2. Everyone I invite is genuinely a student in my class or a member of my group. I will not invite anyone else, buy, rent or scrape addresses, or use invitations for marketing.",
  "3. No one I invite is under 13. For anyone I invite who is under 18, the permission of a parent or legal guardian that the Capstone Bible Terms require exists (for a school class, obtained by the school).",
  "4. I will use my students' or members' work only to teach or lead this class or group, keep it confidential, and handle any export securely.",
  "5. I will remove people who leave, and I will tell Capstone Bible about any account I believe belongs to a child under 13.",
  "6. Billing: I am paying for the number of seats I choose. The subscription renews automatically until it is cancelled or the class or group reaches its end date. Added seats are prorated. There are no refunds for part of a billing period.",
  "7. The organisation details and logo I provide are accurate, and I have the right to give Capstone Bible the logo to display.",
  "8. Capstone Bible may suspend invitations or the class or group for abuse, complaints, or a breach of this agreement.",
  "9. This agreement includes the Capstone Bible Terms of Service and Privacy Policy, and the governing law stated in the Terms.",
].join("\n");

/** SHA-256 of GROUP_AGREEMENT_TEXT as lowercase hex, computed in the browser (Web Crypto). */
export async function groupAgreementSha256(text: string = GROUP_AGREEMENT_TEXT): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
