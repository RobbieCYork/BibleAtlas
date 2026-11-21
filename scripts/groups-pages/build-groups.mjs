#!/usr/bin/env node
// Emits the Capstone Plus for Groups public pages into the build output.
//
//   node scripts/groups-pages/build-groups.mjs [outDir]     default outDir: dist
//
// Called by scripts/seo/build-seo.mjs at the end of every `vite build` (so there is no step to
// forget), and runnable alone while iterating. Pure static HTML: no script, no app code, so the
// pages cannot enter the main app bundle. Images are the pre-optimised AVIF/WebP in
// public/groups/img/ (see optimize-images.py), which Vite copies to dist as-is.
//
// Visibility rules (config.mjs): every page is `noindex` and absent from sitemap.xml until
// GROUPS_LIVE or PUBLISH is true (or CAPSTONE_GROUPS_PUBLISH=1 for a one-off preview build). The
// pages are never linked from the app or from any other public page.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fileForPath } from "../seo/site.mjs";
import { audiencePage, frontPage } from "./render.mjs";
import { AUDIENCES } from "./copy.mjs";
import { isPublished } from "./config.mjs";

export const GROUP_PATHS = ["/groups", ...Object.values(AUDIENCES).map((a) => `/groups/${a.slug}`)];

export function generateGroupsPages(outDir) {
  const write = (rel, html) => {
    const full = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, html);
  };
  write(fileForPath("/groups"), frontPage());
  for (const a of Object.values(AUDIENCES)) write(fileForPath(`/groups/${a.slug}`), audiencePage(a));
  return { pages: GROUP_PATHS.length, published: isPublished(), paths: GROUP_PATHS };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const outDir = path.resolve(process.argv[2] ?? "dist");
  const r = generateGroupsPages(outDir);
  console.log(`groups: ${r.pages} pages → ${outDir} (${r.published ? "PUBLISHED: indexable" : "noindex, not in sitemap"})`);
}
