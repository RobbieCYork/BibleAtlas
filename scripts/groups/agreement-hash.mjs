#!/usr/bin/env node
// agreement-hash.mjs — the agreement text the app shows and the hash sql/047 accepts must agree.
//
//   node scripts/groups/agreement-hash.mjs           print the version and SHA-256 of the text
//   node scripts/groups/agreement-hash.mjs --check   exit 1 unless that (version, hash) is seeded in
//                                                    a migration's class_agreement_versions insert
//
// create_group_class() refuses an acceptance whose (version, sha256) is not in
// class_agreement_versions, so editing src/lib/groupAgreement.ts without seeding the new hash in a
// NEW migration would make every signup fail with "the agreement text changed". This catches it
// before a build ships. Node 24 strips the types from the .ts file (it has no imports).

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mod = await import(pathToFileURL(path.join(REPO, "src/lib/groupAgreement.ts")).href);
const sha = createHash("sha256").update(mod.GROUP_AGREEMENT_TEXT, "utf8").digest("hex");
console.log(`version ${mod.GROUP_AGREEMENT_VERSION}\nsha256  ${sha}`);

if (process.argv.includes("--check")) {
  const sqlDir = path.join(REPO, "sql");
  const seeded = fs
    .readdirSync(sqlDir)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .some((f) => {
      const s = fs.readFileSync(path.join(sqlDir, f), "utf8");
      return s.includes("class_agreement_versions") && s.includes(`'${mod.GROUP_AGREEMENT_VERSION}', '${sha}'`);
    });
  if (!seeded) {
    console.error("FAIL: this (version, sha256) is not seeded in any sql/NNN migration's class_agreement_versions insert");
    process.exit(1);
  }
  if (!mod.GROUP_AGREEMENT_TEXT.startsWith("DRAFT FOR COUNSEL") && mod.GROUP_AGREEMENT_IS_DRAFT) {
    console.error("FAIL: GROUP_AGREEMENT_IS_DRAFT is true but the text does not open with DRAFT FOR COUNSEL");
    process.exit(1);
  }
  console.log("ok: the agreement shown is the agreement the database accepts");
}
