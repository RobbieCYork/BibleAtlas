#!/usr/bin/env node
// check-bundle.mjs — prove, from OUTSIDE a built app, that Capstone Plus for Groups stays out of the
// main bundle: none of its words, RPC names or the DRAFT agreement text are in the chunks index.html
// loads up front. They must still be in SOME chunk (the lazy Groups one) — otherwise the scan is not
// looking at the right thing and a pass would mean nothing.
//
//   npm run build && node scripts/groups/check-bundle.mjs dist
//
// Companion to scripts/paid-content/check-bundle.mjs (paid article text). Exit 1 on any hit.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = process.argv[2];
if (!dist) {
  console.error("usage: check-bundle.mjs <distDir>");
  process.exit(2);
}
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Group-only text. The RPC names are what a reader of the main bundle could use to map the feature;
// the phrases are UI copy. groups_status / capstone:open are deliberately NOT here: the main bundle
// needs the first to decide whether to draw the menu row, and the second is the generic deep link.
const NEEDLES = [
  "create_group_class",
  "my_classes",
  "class_roster",
  "join_class",
  "save_assignment",
  "save_assignment_draft",
  "submit_assignment",
  "staff_assignment",
  "staff_submission",
  "class_gradebook",
  "grade_submission",
  "return_submissions",
  "log_gradebook_export",
  "Start a class or group",
  "Hand it in",
  "Export CSV",
  // phase 3: invites (sql/049). "joinClass" and "pending-join-class" are deliberately NOT here: the
  // main bundle must catch ?joinClass= before sign-up (src/lib/groupsJoinParam.ts).
  "create_class_invites",
  "class_invite_list",
  "class_invite_preview",
  "redeem_class_invite",
  "revoke_class_invite",
  "resend_class_invite",
  "Invite by email",
  "Text it from your phone",
  "a Bible study app with maps, a timeline and reading plans",
  "When were you born?",
];
// Every sentence of 40+ characters of the DRAFT agreement.
const agreementSrc = fs.readFileSync(path.join(REPO_ROOT, "src/lib/groupAgreement.ts"), "utf8");
const block = agreementSrc.slice(agreementSrc.indexOf("export const GROUP_AGREEMENT_TEXT"));
const body = block.slice(0, block.indexOf("].join("));
const agreement = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
if (agreement.length < 3) {
  console.error("FAIL: could not read GROUP_AGREEMENT_TEXT from src/lib/groupAgreement.ts");
  process.exit(1);
}
for (const s of agreement) if (s.length >= 40 && !s.includes("\\")) NEEDLES.push(s.slice(0, 80));

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const upfront = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
if (upfront.length === 0) {
  console.error("FAIL: no script found in index.html");
  process.exit(1);
}
const read = (rel) => fs.readFileSync(path.join(dist, rel), "utf8");
const upfrontJs = upfront.map(read).join("\n");
const allJs = fs
  .readdirSync(path.join(dist, "assets"))
  .filter((f) => f.endsWith(".js"))
  .map((f) => read(`assets/${f}`))
  .join("\n");

let leaked = 0;
let missing = 0;
for (const n of NEEDLES) {
  const inUpfront = upfrontJs.includes(n);
  const anywhere = allJs.includes(n);
  if (inUpfront) {
    leaked++;
    console.error(`LEAK  in the main bundle: ${JSON.stringify(n.slice(0, 60))}`);
  } else if (!anywhere) {
    missing++;
    console.error(`MISSING from every chunk (scan not trustworthy?): ${JSON.stringify(n.slice(0, 60))}`);
  }
}
console.log(`groups strings checked: ${NEEDLES.length}; up-front chunks: ${upfront.join(", ")}`);
if (leaked || missing) {
  console.error(`FAIL: ${leaked} in the main bundle, ${missing} not found anywhere`);
  process.exit(1);
}
console.log("ok: no Groups text in the main bundle; all of it is in the lazy chunk");
