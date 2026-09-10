// Loads the REAL shipped data files by bundling them with the repo's own rolldown — the same
// technique `scripts/name-linker/loadLinker.mjs` uses, and for the same reason: `src/data/*.ts`
// import each other without file extensions, which Node's own type-stripping will not resolve.
//
// AGENTS.md's warning applies here in full and is repeated because it is the exact trap this
// script sits next to: rolldown STRIPS TypeScript types without checking them, so this validator
// goes green on a tree that does not compile. It is a DATA check. `npm run build` is the build
// check. Neither substitutes for the other.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";

export const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const ENTRY = `
export { topics } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/topics"))};
export { locations } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/locations"))};
export { pois } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/pois"))};
export { people } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/people"))};
`;

let cached = null;
export async function loadData() {
  if (cached) return cached;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archaeology-validate-"));
  const entryFile = path.join(dir, "entry.ts");
  const outFile = path.join(dir, "bundle.mjs");
  fs.writeFileSync(entryFile, ENTRY);
  const build = await rolldown({ input: entryFile, logLevel: "silent" });
  await build.write({ file: outFile, format: "esm" });
  await build.close();
  cached = await import(pathToFileURL(outFile).href);
  fs.rmSync(dir, { recursive: true, force: true });
  return cached;
}
