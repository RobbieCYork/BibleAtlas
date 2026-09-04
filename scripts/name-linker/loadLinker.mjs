// Loads the REAL shipped `computeLinkAnnotations`, together with the REAL data files, by bundling
// them with the repo's own rolldown (the bundler Vite 8 already ships). Nothing is stubbed, nothing
// is re-implemented: the harness measures the same function `VerseText.tsx` and `LinkedVerseText.tsx`
// call, with the same arguments.
//
// Why bundle rather than import the .ts directly: `src/data/*.ts` import each other without file
// extensions, which Node's own type-stripping will not resolve. rolldown resolves them the way Vite
// does at build time, so what the harness runs is what the app runs.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";

export const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const ENTRY = `
export { computeLinkAnnotations } from ${JSON.stringify(path.join(REPO_ROOT, "src/lib/verseAnnotations"))};
export { locations } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/locations"))};
export { pois } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/pois"))};
export { people } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/people"))};
export { topics } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/topics"))};
export { timelineEvents } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/timelineEvents"))};
export { bookIntros } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/bookIntros"))};
`;

/** Bundle + import the live module. Cached per process. */
let cached = null;
export async function loadLinker() {
  if (cached) return cached;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "name-linker-"));
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

/** The Bible reader hands the linker HTML-free text; `bolls.life` embeds markup in 211 Psalm
 * superscriptions, so strip tags the same way before annotating. */
export const stripMarkup = (s) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
