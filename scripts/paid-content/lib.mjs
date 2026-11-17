// Shared Node-side helpers for Capstone Plus phase 1: the config switches, and the real data files +
// the real split spec (src/lib/paidContentSpec.ts) loaded into Node by bundling them with rolldown —
// the same technique as scripts/seo/loadData.mjs and scripts/name-linker/loadLinker.mjs, kept as its
// own copy for the reason loadData.mjs gives (a build step must not break because a test helper moved).
//
// Used by vite-plugin-paid-content.ts (server-mode bundle), scripts/paid-content/split.mjs (seed +
// round-trip proof) and scripts/seo (teaser render).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";

export const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

/** Data-set export name -> the PaidKind it stores. Same five sets as scripts/seo/site.mjs KINDS. */
export const DATASETS = [
  { kind: "place", exportName: "locations", file: "src/data/locations.ts" },
  { kind: "site", exportName: "pois", file: "src/data/pois.ts" },
  { kind: "person", exportName: "people", file: "src/data/people.ts" },
  { kind: "topic", exportName: "topics", file: "src/data/topics.ts" },
  { kind: "event", exportName: "timelineEvents", file: "src/data/timelineEvents.ts" },
];

const APP_SOURCES = new Set(["bundle", "server"]);
const SEO_RENDERS = new Set(["full", "teaser"]);

/** The two switches, from paid-content.config.json, overridable per build by env. Throws on a typo
 * rather than silently picking a default: a mistyped switch must not decide what is public. */
export function readPaidConfig(root = REPO_ROOT, env = process.env) {
  const file = JSON.parse(fs.readFileSync(path.join(root, "paid-content.config.json"), "utf8"));
  const appSource = env.PAID_CONTENT_SOURCE || file.appSource;
  const seoRender = env.SEO_RENDER || file.seoRender;
  if (!APP_SOURCES.has(appSource)) throw new Error(`paid-content: appSource must be bundle|server, got ${JSON.stringify(appSource)}`);
  if (!SEO_RENDERS.has(seoRender)) throw new Error(`paid-content: seoRender must be full|teaser, got ${JSON.stringify(seoRender)}`);
  return { appSource, seoRender };
}

const cache = new Map();

/** Bundles + imports the five data modules and the spec. Cached per process and root. */
export async function loadDataAndSpec(root = REPO_ROOT) {
  if (cache.has(root)) return cache.get(root);
  const p = (async () => {
    const entry = [
      ...DATASETS.map((d) => `export { ${d.exportName} } from ${JSON.stringify(path.join(root, d.file.replace(/\.ts$/, "")))};`),
      `export * as spec from ${JSON.stringify(path.join(root, "src/lib/paidContentSpec"))};`,
    ].join("\n");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "capstone-paid-"));
    const entryFile = path.join(dir, "entry.ts");
    const outFile = path.join(dir, "bundle.mjs");
    fs.writeFileSync(entryFile, entry);
    const build = await rolldown({ input: entryFile, logLevel: "silent" });
    await build.write({ file: outFile, format: "esm" });
    await build.close();
    const mod = await import(pathToFileURL(outFile).href);
    fs.rmSync(dir, { recursive: true, force: true });
    return mod;
  })();
  cache.set(root, p);
  return p;
}

/** Canonical JSON: keys sorted at every level. Used for the round-trip proof and the content hash,
 * so neither depends on object key order. */
export function canonicalJson(value) {
  const norm = (v) => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") {
      const out = {};
      for (const k of Object.keys(v).sort()) if (v[k] !== undefined) out[k] = norm(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(norm(value));
}

/** scripts/seo KINDS key -> PaidKind. */
export const SEO_KEY_TO_KIND = { locations: "place", pois: "site", people: "person", topics: "topic", timelineEvents: "event" };

/** What the public page says sits behind the cut — the same words as the app's PaidTeaser. */
export const WHAT_IS_BEHIND = {
  place: "This place's history, archaeology, sources and a question to reflect on",
  site: "The full description of this site, its archaeology and sources",
  person: "Their life and accomplishments, the historical evidence, the debates and further reading",
  topic: "The full article, its sources and further reading",
  event: "The full account of this event, how it is dated, and its sources",
};

/** The record as a TEASER public page may show it: its free half (which includes the Bible references
 * list), plus the single free lead line — a place's first notable fact, a site's first ~140
 * characters. The SEO renderers already treat every paid field as optional, so they simply render
 * less. */
export function teaserView(spec, kind, record) {
  const { free } = spec.splitRecord(kind, record);
  if (kind === "place") {
    const first = record.history?.notableFacts?.[0];
    if (first !== undefined) free.history = { notableFacts: [first] };
  }
  if (kind === "site") free.description = spec.siteLead(record);
  return free;
}
