// Bundle a src/ entry with the real code and stubbed Capacitor plugins, then import it. Same approach
// as scripts/name-linker/loadLinker.mjs. NOTE: rolldown strips types without checking them, so a
// passing test says nothing about whether the app compiles. Run `npm run build` too.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../..");

export async function load(entryRel, extraAlias = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "store-app-test-"));
  const out = path.join(dir, "bundle.mjs");
  const stub = (n) => path.join(HERE, "stubs", n);
  const build = await rolldown({
    input: path.join(ROOT, entryRel),
    logLevel: "silent",
    resolve: {
      alias: {
        "@capacitor/core": stub("core.mjs"),
        "@capacitor/preferences": stub("preferences.mjs"),
        "@capacitor/share": stub("share.mjs"),
        "@capacitor/filesystem": stub("filesystem.mjs"),
        "@capacitor/browser": stub("browser.mjs"),
        "@capacitor/app": stub("browser.mjs"),
        "@capacitor/status-bar": stub("browser.mjs"),
        "@capacitor/haptics": stub("haptics.mjs"),
        "@capacitor/network": stub("network.mjs"),
        ...extraAlias,
      },
    },
  });
  await build.write({ file: out, format: "esm", codeSplitting: false });
  await build.close();
  const mod = await import(pathToFileURL(out).href + "?" + Date.now());
  fs.rmSync(dir, { recursive: true, force: true });
  return mod;
}

export function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), _m: m };
}

let failed = 0;
export function check(name, cond) {
  console.log((cond ? "ok   " : "FAIL ") + name);
  if (!cond) failed++;
}
export function done() { if (failed) { console.log(failed + " failed"); process.exit(1); } console.log("all passed"); }
