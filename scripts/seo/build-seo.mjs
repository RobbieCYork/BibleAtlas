#!/usr/bin/env node
// Pre-renders the public article site and the sitemap from the real data files.
//
//   node scripts/seo/build-seo.mjs [outDir]     default outDir: dist
//
// It runs automatically at the end of every `vite build` (see vite-plugin-seo.ts), which is the
// point: the sitemap and the pages are derived from `src/data/*.ts` on every build, so they cannot
// drift from the data the way a hand-maintained sitemap does. Adding a record to a data file
// publishes its page; deleting one unpublishes it. There is no second list to remember.
//
// WHY PRE-RENDER RATHER THAN SSR THIS APP
// The five data sets are static TypeScript compiled into the client bundle — there is no database
// read and no per-request state behind an article, so nothing about these pages needs a server.
// Standing up vike/vite-plugin-ssr instead would mean giving `App.tsx` — 1,800 lines built around
// MapLibre, a Supabase session, localStorage read at module scope and a full-screen auth gate — a
// server-rendered entry point, which is a rewrite of the app, not an SEO change. Emitting plain
// documents from the same arrays gets a crawler the same words at a fraction of the risk.
//
// WHY THESE PAGES ARE NOT THE APP
// The output carries no script tag, no Supabase client and no session, and `App.tsx` is untouched:
// there is no pathname check placed ahead of `if (showAuthGate) return <AuthGate />`. The public
// surface is a set of build artefacts sitting beside the app, not a branch inside it, so it cannot
// be widened by accident — widening it would mean adding a data set to KINDS in site.mjs on
// purpose. Personal data (notes, highlights, posts, groups, messages, profiles, admin) lives behind
// Supabase RLS and is never read here; this generator only ever touches `src/data/*.ts`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadData, REPO_ROOT } from "./loadData.mjs";
import { KINDS, ORIGIN, absolute, fileForPath, indexPath, itemPath } from "./site.mjs";
import {
  eventPage,
  hubPage,
  indexPage,
  locationPage,
  makeLinkifier,
  personPage,
  poiPage,
  topicPage,
} from "./render.mjs";

const RENDERERS = {
  locations: locationPage,
  pois: poiPage,
  people: personPage,
  topics: topicPage,
  timelineEvents: eventPage,
};

/** The one-line blurb under each entry on an index page — the record's own words, never invented. */
const DESCRIBERS = {
  locations: (r) => r.history?.notableFacts?.[0] ?? `${r.category}${r.modernName ? `, today ${r.modernName}` : ""}`,
  pois: (r) => r.description,
  people: (r) => r.role,
  topics: (r) => r.summary,
  timelineEvents: (r) => `${r.dateLabel} — ${r.summary}`,
};

const write = (outDir, relPath, contents) => {
  const full = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
};

/** A window of neighbours around a record, wrapping at the ends, so every article links onward to
 * others of its kind. A crawler that reaches any one page can walk the whole set from there even if
 * it never loads an index page. */
function siblingsFor(records, i, item, span = 8) {
  const out = [];
  for (let k = 1; out.length < Math.min(span, records.length - 1); k++) {
    const r = records[(i + k) % records.length];
    if (r.id === records[i].id) break;
    out.push({ name: r.name ?? r.title, href: itemPath(item, r.id) });
  }
  return out;
}

export async function generateSeo(outDir) {
  const data = await loadData();
  const sets = Object.fromEntries(KINDS.map((k) => [k.key, data[k.key]]));

  // Only ever link at a page this same run emits — a dangling internal link is worse than plain text.
  const idsByLinkKind = new Map(KINDS.map((k) => [k.linkKind, new Set(sets[k.key].map((r) => r.id))]));
  const itemByLinkKind = new Map(KINDS.map((k) => [k.linkKind, k.item]));
  const urlFor = (linkKind, id) =>
    idsByLinkKind.get(linkKind)?.has(id) ? itemPath(itemByLinkKind.get(linkKind), id) : null;
  const linkify = makeLinkifier(data.computeLinkAnnotations, urlFor);

  const urls = ["/", "/library"];
  let pages = 0;

  for (const kind of KINDS) {
    const records = sets[kind.key];
    const render = RENDERERS[kind.key];
    records.forEach((record, i) => {
      const p = itemPath(kind.item, record.id);
      write(outDir, fileForPath(p), render(record, { linkify, siblings: siblingsFor(records, i, kind.item) }));
      urls.push(p);
      pages++;
    });
    const ip = indexPath(kind.index);
    write(outDir, fileForPath(ip), indexPage(kind, records, DESCRIBERS[kind.key]));
    urls.push(ip);
    pages++;
  }

  const counts = Object.fromEntries(KINDS.map((k) => [k.key, sets[k.key].length]));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  write(outDir, fileForPath("/library"), hubPage(counts, total));
  pages++;

  // One sitemap file: 880-odd URLs is far inside the 50,000-URL / 50 MB limit, so an index would be
  // a second thing to keep in step for no benefit. No <lastmod>, <priority> or <changefreq> — we
  // have no per-record modification date, and inventing one is exactly the sort of padding that
  // teaches a crawler to ignore the file.
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${absolute(u === "/" ? "/" : u)}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  write(outDir, "sitemap.xml", sitemap);

  return { pages, urls: urls.length, counts, total };
}

// Run directly: `node scripts/seo/build-seo.mjs [outDir]`
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const outDir = path.resolve(process.argv[2] ?? path.join(REPO_ROOT, "dist"));
  const started = Date.now();
  const result = await generateSeo(outDir);
  console.log(
    `seo: ${result.pages} pages + sitemap.xml (${result.urls} urls) → ${outDir} in ${Date.now() - started}ms`
  );
  console.log(`     ${Object.entries(result.counts).map(([k, v]) => `${k} ${v}`).join(", ")} · ${ORIGIN}`);
}
