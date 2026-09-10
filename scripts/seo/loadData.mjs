// Loads the REAL shipped data files and the REAL name-linker into Node, by bundling them with the
// repo's own rolldown (the bundler Vite 8 already ships). Nothing is stubbed and nothing is
// re-typed: the pages this generator emits are built from exactly the arrays the app renders, so a
// public article page cannot say something the app does not.
//
// This is the same trick `scripts/name-linker/loadLinker.mjs` uses, for the same reason: the
// `src/data/*.ts` files import each other without file extensions, which Node's own type-stripping
// will not resolve. rolldown resolves them the way Vite does at build time.
//
// It is a deliberate copy rather than an import of that module: the linker harness's entry point is
// its own contract (it exports `bookIntros` and `stripMarkup` for corpus work), and a generator that
// runs inside `vite build` should not be able to break by someone editing a test helper.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";

export const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const ENTRY = `
export { locations } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/locations"))};
export { pois } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/pois"))};
export { people } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/people"))};
export { topics } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/topics"))};
export { timelineEvents } from ${JSON.stringify(path.join(REPO_ROOT, "src/data/timelineEvents"))};
export { computeLinkAnnotations } from ${JSON.stringify(path.join(REPO_ROOT, "src/lib/verseAnnotations"))};
`;

let cached = null;

/** Bundle + import the live data modules. Cached per process. */
export async function loadData() {
  if (cached) return cached;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "capstone-seo-"));
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
