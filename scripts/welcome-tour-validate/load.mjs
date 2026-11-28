/** Loads src/data/welcomeTour.ts without a bundler: its types are stripped and what is left is
 * imported. That only works while the file has no runtime imports, which is checked here. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

export async function loadTour(root) {
  const source = readFileSync(join(root, "src/data/welcomeTour.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: true },
  });
  if (/^\s*import[\s{*"']/m.test(outputText))
    throw new Error("src/data/welcomeTour.ts has a runtime import. It may only use `import type`.");
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
