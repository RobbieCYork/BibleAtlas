// HTML for the public, pre-rendered article pages.
//
// These pages are NOT the React app. They are standalone documents built from the same data arrays
// the app renders, and they carry no script, no Supabase client and no session. That is the whole
// safety argument for them: the app stays entirely behind `AuthGate` — App.tsx is not touched and
// there is no pathname check anywhere ahead of the gate — while the article prose, which already
// ships inside the client bundle to anyone who opens the site, gets a URL a crawler can read.
//
// Everything here is escaped on the way out. The data is ours, but a stray `<` in a quotation
// should render as a `<`, not open a tag.

import { ORIGIN, SITE_NAME, absolute, indexPath, itemPath } from "./site.mjs";

// ---------------------------------------------------------------- text helpers
export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const collapse = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Meta descriptions are cut by search engines around 155-160 characters; cut on a word boundary so
 * the visible half is a sentence rather than a fragment ending mid-word. */
export function clip(s, max = 158) {
  const t = collapse(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

/** JSON-LD has to survive being inside a <script> element: the only sequence that can end it early
 * is `</`, and `<` is the same character to a JSON parser. */
const ldJson = (obj) => JSON.stringify(obj, null, 0).replace(/</g, "\\u003c");

// ---------------------------------------------------------------- fragments
const p = (html) => `<p>${html}</p>`;
const section = (heading, inner) => (inner ? `<section><h2>${esc(heading)}</h2>${inner}</section>` : "");
const ul = (items) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "");

const extLink = (url, label) =>
  `<a href="${esc(url)}" rel="noopener" target="_blank">${esc(label)}</a>`;

/** A definition row, skipped entirely when the value is absent — an empty "Population: " line is
 * worse than no line. */
const dl = (rows) => {
  const live = rows.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");
  return live.length
    ? `<dl class="facts">${live.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`
    : "";
};

// ---------------------------------------------------------------- page shell
const CSS = `
:root{color-scheme:light dark;--bg:#fbfaf7;--ink:#1b1a20;--muted:#5b5866;--rule:#e3dfd6;--accent:#6d28d9;--card:#ffffff;--shadow:0 1px 2px rgba(27,26,32,.06)}
@media (prefers-color-scheme:dark){:root{--bg:#141317;--ink:#eceaf2;--muted:#a39fb0;--rule:#2c2a33;--accent:#c4b5fd;--card:#1c1b21;--shadow:none}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Archivo,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:17px;line-height:1.65;-webkit-text-size-adjust:100%}
a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:2px}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:var(--card);padding:8px 12px;border-radius:8px;z-index:9}
header.bar{border-bottom:1px solid var(--rule);background:var(--card)}
.bar .in{max-width:1080px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;gap:10px 20px;align-items:baseline}
.brand{font-family:"Cormorant Garamond",Georgia,serif;font-size:24px;font-weight:600;color:var(--ink);text-decoration:none;letter-spacing:.01em}
.bar nav{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:14px}
.bar nav a{color:var(--muted);text-decoration:none}
.bar nav a:hover,.bar nav a[aria-current]{color:var(--accent);text-decoration:underline}
main{max-width:760px;margin:0 auto;padding:28px 20px 72px}
main.wide{max-width:1080px}
.crumbs{font-size:13.5px;color:var(--muted);margin:0 0 18px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.crumbs li:not(:last-child)::after{content:"›";margin-left:6px;opacity:.6}
.crumbs a{color:var(--muted)}
h1{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;font-size:clamp(34px,6vw,48px);line-height:1.12;margin:0 0 6px;letter-spacing:.005em}
.kicker{margin:0 0 4px;font-size:13px;letter-spacing:.09em;text-transform:uppercase;color:var(--accent);font-weight:600}
.sub{margin:0 0 22px;color:var(--muted);font-size:15.5px}
.lead{font-family:"EB Garamond",Georgia,serif;font-size:21px;line-height:1.55;margin:0 0 8px}
h2{font-family:"Cormorant Garamond",Georgia,serif;font-size:27px;font-weight:600;margin:38px 0 10px;padding-top:16px;border-top:1px solid var(--rule)}
h3{font-size:16px;margin:22px 0 4px;font-weight:600}
section p,li{font-family:"EB Garamond",Georgia,serif;font-size:18.5px;line-height:1.68}
.bar nav,.crumbs,.kicker,.sub,.facts,.tag,.cta,footer{font-family:Archivo,-apple-system,sans-serif}
ul{padding-left:1.15em}
dl.facts{display:grid;grid-template-columns:minmax(9rem,auto) 1fr;gap:6px 18px;margin:14px 0;font-size:15px}
dl.facts dt{color:var(--muted)}
dl.facts dd{margin:0}
blockquote{margin:12px 0;padding:2px 0 2px 16px;border-left:3px solid var(--rule);color:var(--ink)}
blockquote cite{display:block;margin-top:4px;font-size:14px;font-style:normal;color:var(--muted);font-family:Archivo,sans-serif}
.ref{font-variant-numeric:tabular-nums}
.note{color:var(--muted)}
.evidence{border:1px solid var(--rule);background:var(--card);border-radius:12px;padding:14px 16px;margin:12px 0;box-shadow:var(--shadow)}
.evidence h3{margin-top:0}
.tag{display:inline-block;font-size:12px;letter-spacing:.04em;padding:2px 8px;border:1px solid var(--rule);border-radius:999px;color:var(--muted);margin-left:6px;vertical-align:2px}
.tag.warn{color:var(--accent);border-color:var(--accent)}
.cite-tier{display:inline-block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;padding:1px 6px;border:1px solid var(--rule);border-radius:4px;color:var(--muted);margin-right:6px;font-family:Archivo,sans-serif}
.cite-supports{display:block;font-size:13.5px;font-style:italic;color:var(--muted)}
figure{margin:16px 0}
figure img{width:100%;height:auto;border-radius:10px;display:block;background:var(--rule)}
figcaption{font-size:13.5px;color:var(--muted);margin-top:6px;font-family:Archivo,sans-serif}
.cta{margin:44px 0 0;padding:18px 20px;border:1px solid var(--rule);background:var(--card);border-radius:14px;box-shadow:var(--shadow)}
.cta p{margin:0 0 10px;font-family:Archivo,sans-serif;font-size:15.5px;color:var(--muted)}
.cta a.btn{display:inline-block;background:var(--accent);color:#fff;padding:9px 18px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px}
@media (prefers-color-scheme:dark){.cta a.btn{color:#1b1a20}}
.more{margin-top:34px;font-size:15px}
.more h2{font-size:19px;border-top:1px solid var(--rule)}
.more ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px 14px}
.more li{font-family:Archivo,sans-serif;font-size:14.5px}
.index-list{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.index-list li{font-family:Archivo,sans-serif;font-size:15px;border:1px solid var(--rule);border-radius:12px;background:var(--card);box-shadow:var(--shadow)}
.index-list a{display:block;padding:11px 14px;text-decoration:none;color:var(--ink);height:100%}
.index-list a:hover{border-color:var(--accent)}
.index-list b{display:block;font-weight:600;font-size:16px}
.index-list span{display:block;color:var(--muted);font-size:13.5px;margin-top:2px}
footer{border-top:1px solid var(--rule);margin-top:56px;padding-top:18px;font-size:13.5px;color:var(--muted)}
footer a{color:var(--muted)}
`.trim();

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&amp;family=Cormorant+Garamond:wght@500;600&amp;family=EB+Garamond:ital,wght@0,400;0,600;1,400&amp;display=swap">`;

const NAV = [
  ["/library", "Library"],
  ["/places", "Places"],
  ["/sites", "Sites"],
  ["/people", "People"],
  ["/topics", "Topics"],
  ["/events", "Timeline"],
];

const navHtml = (current) =>
  `<nav aria-label="Sections">${NAV.map(
    ([href, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ""}>${label}</a>`
  ).join("")}</nav>`;

const crumbsHtml = (trail) =>
  `<ol class="crumbs">${trail
    .map((c, i) =>
      i === trail.length - 1
        ? `<li aria-current="page">${esc(c.name)}</li>`
        : `<li><a href="${c.path}">${esc(c.name)}</a></li>`
    )
    .join("")}</ol>`;

const breadcrumbLd = (trail) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: absolute(c.path),
  })),
});

export const PUBLISHER = {
  "@type": "Organization",
  name: SITE_NAME,
  url: ORIGIN,
  logo: { "@type": "ImageObject", url: `${ORIGIN}/icon-512.png`, width: 512, height: 512 },
};

/**
 * The document every public page is poured into.
 * `canonical` is always the absolute, no-trailing-slash form, so the one URL a search engine keeps
 * is settled here rather than by whatever the edge happens to serve.
 */
export function page({ title, description, canonical, trail, jsonLd = [], body, wide = false, current, ogType = "article" }) {
  const ogImage = `${ORIGIN}/og-default.png`;
  const graph = [breadcrumbLd(trail), ...jsonLd];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(absolute(canonical))}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(absolute(canonical))}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Capstone Bible">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#7c3aed">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${FONTS}
<style>${CSS}</style>
<script type="application/ld+json">${ldJson(graph.length === 1 ? graph[0] : { "@context": "https://schema.org", "@graph": graph.map(({ "@context": _c, ...rest }) => rest) })}</script>
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<header class="bar"><div class="in"><a class="brand" href="/library">Capstone Bible</a>${navHtml(current)}</div></header>
<main${wide ? ' class="wide"' : ""} id="content">
${crumbsHtml(trail)}
${body}
<div class="cta"><p>Capstone Bible is a free interactive study app — a map of every place in this library, a zoomable timeline of biblical and church history, the Bible text with every name in it linked to its article, reading plans and personal notes.</p><a class="btn" href="/">Open Capstone Bible</a></div>
<footer><p>Part of the <a href="/library">Capstone Bible library</a> — <a href="/places">places</a>, <a href="/sites">sites</a>, <a href="/people">people</a>, <a href="/topics">topics</a> and the <a href="/events">timeline</a>. Articles are written from a Protestant evangelical position and name other traditions' views where they differ.</p></footer>
</main>
</body>
</html>`;
}

// ---------------------------------------------------------------- prose linking
/**
 * Runs the app's own shipped auto-linker over a block of prose and turns every entity it finds into
 * a real internal link. Reusing `computeLinkAnnotations` rather than re-implementing name matching
 * means the public pages cross-link exactly where the app cross-links, and the linker's existing
 * snapshot suite already guards the result.
 */
export function makeLinkifier(computeLinkAnnotations, urlFor) {
  return function linkify(text, excludeId) {
    const src = String(text ?? "");
    if (!src) return "";
    let anns;
    try {
      anns = computeLinkAnnotations(src, excludeId);
    } catch {
      return esc(src);
    }
    const keep = [];
    let last = -1;
    for (const a of anns.sort((x, y) => x.start - y.start || y.end - x.end)) {
      if (a.kind === "verse" || !a.id) continue; // verse refs have no page of their own
      const href = urlFor(a.kind, a.id);
      if (!href) continue; // never link at a page this build did not emit
      if (a.start < last) continue; // overlapping match — first one wins
      keep.push({ ...a, href });
      last = a.end;
    }
    let out = "";
    let cursor = 0;
    for (const a of keep) {
      out += esc(src.slice(cursor, a.start));
      out += `<a href="${a.href}">${esc(src.slice(a.start, a.end))}</a>`;
      cursor = a.end;
    }
    return out + esc(src.slice(cursor));
  };
}

// ---------------------------------------------------------------- shared article parts
const versesSection = (verses, heading = "Scripture references") =>
  section(
    heading,
    ul(
      (verses ?? []).map(
        (v) =>
          `<span class="ref"><strong>${esc(v.reference)}</strong></span>${v.note ? ` — ${esc(v.note)}` : ""}`
      )
    )
  );

const sourcesSection = (sources) =>
  section(
    "Further reading",
    ul(
      (sources ?? []).map(
        (s) => `${extLink(s.url, s.label)}${s.note ? ` <span class="note">— ${esc(s.note)}</span>` : ""}`
      )
    )
  );

const archaeologySection = (arch, name) => {
  if (!arch) return "";
  const photos = (arch.photos ?? [])
    .map(
      (ph) =>
        `<figure><img src="${esc(ph.url)}" alt="${esc(ph.caption || name)}" loading="lazy" decoding="async"><figcaption>${esc(
          ph.caption
        )} — ${extLink(ph.sourceUrl, "source & licence")}</figcaption></figure>`
    )
    .join("");
  return section("Archaeology", (arch.note ? p(esc(arch.note)) : "") + photos);
};

const reflectSection = (prompt) => (prompt ? section("Reflect", p(`<em>${esc(prompt)}</em>`)) : "");

const moreSection = (label, siblings) =>
  siblings.length
    ? `<div class="more"><h2>More ${esc(label)}</h2><ul>${siblings
        .map((s) => `<li><a href="${s.href}">${esc(s.name)}</a></li>`)
        .join("")}</ul></div>`
    : "";

/** The tier a source belongs to, spelled out for a reader. The tiers exist so a museum's own object
 * page and a Wikipedia article do not arrive looking like the same kind of evidence; printing the
 * tier is how that distinction reaches the person deciding which link to follow. */
const CITATION_TIER_LABEL = {
  institution: "Holding institution",
  scholarly: "Scholarship",
  primary: "Primary text",
  reference: "Reference",
  encyclopedic: "Encyclopedia",
};

/** `citations` is the tiered, creditable list carried by discovery and manuscript records;
 * `sources` remains the plain further-reading list every other record type uses. Both can appear on
 * one page, and they are two different sections on purpose — one is what the article is built on,
 * the other is where to go next. */
const citationsSection = (citations) =>
  section(
    "Sources",
    ul(
      (citations ?? []).map((c) => {
        const tier = `<span class="cite-tier">${esc(CITATION_TIER_LABEL[c.tier] ?? c.tier)}</span>`;
        // A citation with no URL is still a citation — print-only scholarship is checkable, and
        // dropping it would quietly bias the section towards whatever happens to be online.
        const label = c.url ? extLink(c.url, c.label) : `<strong>${esc(c.label)}</strong>`;
        const bits = [c.credit, c.detail, c.paywalled ? "paywalled" : ""].filter(Boolean).map(esc).join(" · ");
        return `${tier}${label}${bits ? ` <span class="note">— ${bits}</span>` : ""}${
          c.supports ? `<span class="cite-supports">Supports: ${esc(c.supports)}</span>` : ""
        }`;
      })
    )
  );

/** The facts block for a discovery, plus the two warnings that change how everything under them
 * should be weighed. Rendered from an ordered list rather than the object's keys so the same fact
 * sits in the same row on every article in the section. */
const discoveryFacts = (d, ctx) => {
  const site = d.findSiteId && d.findSiteKind ? ctx.urlFor(d.findSiteKind, d.findSiteId) : null;
  return dl([
    ["Object", esc(d.objectType)],
    ["Found at", site ? `<a href="${site}">${esc(d.findSite)}</a>` : esc(d.findSite)],
    ["Found in", esc(d.foundYear)],
    ["Found by", esc(d.foundBy)],
    [
      "Dates from",
      `${esc(d.objectDate)}${
        d.objectDateCertainty && d.objectDateCertainty !== "firm"
          ? ` <span class="tag">${esc(CERTAINTY_NOTE[d.objectDateCertainty] ?? d.objectDateCertainty)}</span>`
          : ""
      }`,
    ],
    ["Now held at", esc(d.currentLocation)],
  ]);
};

const manuscriptFacts = (m) =>
  dl([
    ["Siglum", esc(m.siglum ?? "")],
    ["Type", esc(m.manuscriptType)],
    ["Language", esc(m.language)],
    ["Contents", esc(m.contents)],
    [
      "Written",
      `${esc(m.dateAssigned)}${
        m.dateCertainty && m.dateCertainty !== "firm"
          ? ` <span class="tag">${esc(CERTAINTY_NOTE[m.dateCertainty] ?? m.dateCertainty)}</span>`
          : ""
      }`,
    ],
    ["Origin", esc(m.origin ?? "")],
    ["Found at", esc(m.findSite)],
    ["Found in", esc(m.foundYear)],
    ["Found by", esc(m.foundBy)],
    ["Now held at", esc(m.currentLocation)],
    ["Shelfmark", esc(m.shelfmark ?? "")],
    // The single most valuable link a manuscript article can carry: the reader can look at the
    // thing itself, free and legally, at full resolution.
    ["Facsimile", m.facsimileUrl ? extLink(m.facsimileUrl, "View the manuscript") : ""],
  ]);

const heading = (title, kicker, sub) =>
  `${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ""}<h1>${esc(title)}</h1>${
    sub ? `<p class="sub">${sub}</p>` : ""
  }`;

const paras = (arr, id, ctx) => (arr ?? []).map((t) => p(ctx.linkify(t, id))).join("");

const splitParas = (text) =>
  String(text ?? "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

const coordLabel = ([lon, lat]) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;

const CATEGORY_LABEL = {
  city: "City",
  region: "Region",
  province: "Province",
  nation: "Nation",
  sea: "Sea",
  river: "River",
  mountain: "Mountain",
  island: "Island",
};

const EVENT_CATEGORY_LABEL = {
  biblical: "Biblical history",
  church: "Church history",
  world: "World history",
  movement: "Movement",
  religion: "World religions",
};

const CERTAINTY_NOTE = {
  firm: "Anchored by contemporary records",
  traditional: "Traditional dating",
  disputed: "Disputed dating",
  legendary: "Legendary — a later convention, not an anchored date",
};

// ---------------------------------------------------------------- the five article types
export function locationPage(loc, ctx) {
  const cat = CATEGORY_LABEL[loc.category] ?? loc.category;
  const facts = loc.history?.notableFacts ?? [];
  // A Location has no `summary` field of its own, so the lead is composed from what the record does
  // state — its category and its modern name — and the notable facts follow underneath. Nothing is
  // asserted here that is not already in the data; "today X" is dropped when the modern name merely
  // restates the ancient one ("Jerusalem, today Jerusalem, Israel").
  const modernDiffers =
    loc.modernName && !loc.modernName.toLowerCase().startsWith(loc.name.toLowerCase());
  const lead = `${loc.name} is a ${cat.toLowerCase()} of the biblical world${
    modernDiffers ? `, known today as ${loc.modernName}` : ""
  }.`;
  const description = clip(`${lead} ${facts[0] ?? ""}`);
  const trail = [
    { name: "Library", path: "/library" },
    { name: "Places", path: indexPath("places") },
    { name: loc.name, path: itemPath("place", loc.id) },
  ];
  const rulers = loc.history?.rulers ?? [];
  const body = [
    heading(
      loc.name,
      cat,
      [
        loc.pronunciation ? `<span class="note">${esc(loc.pronunciation)}</span>` : "",
        loc.modernName ? `Modern ${esc(loc.modernName)}` : "",
        loc.alternateNames?.length ? `Also called ${esc(loc.alternateNames.join(", "))}` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    ),
    `<p class="lead">${esc(lead)}</p>`,
    facts.length ? section("What is known", ul(facts.map((f) => ctx.linkify(f, loc.id)))) : "",
    section(
      "History",
      dl([
        ["Founded", loc.history?.founded ? esc(loc.history.founded) : ""],
        ["Population", loc.history?.population ? esc(loc.history.population) : ""],
        ["Industry", loc.history?.industry ? esc(loc.history.industry) : ""],
        ["Coordinates", esc(coordLabel(loc.coordinates))],
      ]) +
        (rulers.length
          ? `<h3>Rulers and powers</h3>${ul(
              rulers.map((r) => `${ctx.linkify(r.name, loc.id)} <span class="note">— ${esc(r.period)}</span>`)
            )}`
          : "")
    ),
    archaeologySection(loc.archaeology, loc.name),
    versesSection(loc.verses),
    loc.modernMapUrl ? section("On a modern map", p(extLink(loc.modernMapUrl, `${loc.name} today`))) : "",
    sourcesSection(loc.sources),
    reflectSection(loc.reflectionPrompt),
    moreSection("places", ctx.siblings),
  ].join("");

  const ld = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: loc.name,
    ...(loc.alternateNames?.length ? { alternateName: loc.alternateNames } : {}),
    description: clip(`${lead} ${facts[0] ?? ""}`, 300),
    url: absolute(itemPath("place", loc.id)),
    geo: { "@type": "GeoCoordinates", latitude: loc.coordinates[1], longitude: loc.coordinates[0] },
  };
  return page({
    title: `${loc.name} — ${cat} in the Bible | ${SITE_NAME}`,
    description,
    canonical: itemPath("place", loc.id),
    trail,
    jsonLd: [ld],
    body,
    current: "/places",
  });
}

export function poiPage(poi, ctx) {
  const description = clip(`${poi.name}${poi.modernName ? ` (${poi.modernName})` : ""} — ${poi.description}`);
  const trail = [
    { name: "Library", path: "/library" },
    { name: "Sites", path: indexPath("sites") },
    { name: poi.name, path: itemPath("site", poi.id) },
  ];
  const body = [
    heading(
      poi.name,
      poi.tag,
      [
        poi.pronunciation ? `<span class="note">${esc(poi.pronunciation)}</span>` : "",
        poi.modernName ? `Modern ${esc(poi.modernName)}` : "",
        poi.alternateNames?.length ? `Also called ${esc(poi.alternateNames.join(", "))}` : "",
        esc(coordLabel(poi.coordinates)),
      ]
        .filter(Boolean)
        .join(" · ")
    ),
    `<p class="lead">${ctx.linkify(poi.description, poi.id)}</p>`,
    archaeologySection(poi.archaeology, poi.name),
    poi.modernMapUrl ? section("On a modern map", p(extLink(poi.modernMapUrl, `${poi.name} today`))) : "",
    sourcesSection(poi.sources),
    reflectSection(poi.reflectionPrompt),
    moreSection("sites", ctx.siblings),
  ].join("");

  const ld = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: poi.name,
    ...(poi.alternateNames?.length ? { alternateName: poi.alternateNames } : {}),
    description: clip(poi.description, 300),
    url: absolute(itemPath("site", poi.id)),
    geo: { "@type": "GeoCoordinates", latitude: poi.coordinates[1], longitude: poi.coordinates[0] },
  };
  return page({
    title: `${poi.name} — ${poi.tag} | ${SITE_NAME}`,
    description,
    canonical: itemPath("site", poi.id),
    trail,
    jsonLd: [ld],
    body,
    current: "/sites",
  });
}

export function personPage(person, ctx) {
  const isBiblical = (person.kind ?? "biblical") === "biblical";
  const evidenceHeading = isBiblical ? "Extra-biblical evidence" : "Historical evidence";
  const description = clip(`${person.name} — ${person.role}. ${person.summary}`);
  const trail = [
    { name: "Library", path: "/library" },
    { name: "People", path: indexPath("people") },
    { name: person.name, path: itemPath("person", person.id) },
  ];
  const evidence = (person.extraBiblicalReferences ?? [])
    .map(
      (r) =>
        `<div class="evidence"><h3>${esc(r.source)}${r.citation ? ` <span class="note">${esc(r.citation)}</span>` : ""}</h3>${p(
          ctx.linkify(r.summary, person.id)
        )}${p(`<span class="note">Weight: ${esc(r.reliability)}</span>`)}${
          r.url ? p(extLink(r.url, "Read the passage")) : ""
        }</div>`
    )
    .join("");

  const body = [
    heading(
      person.name,
      person.role,
      [
        person.pronunciation ? `<span class="note">${esc(person.pronunciation)}</span>` : "",
        person.lifespanLabel ? esc(person.lifespanLabel) : "",
        person.alternateNames?.length ? `Also called ${esc(person.alternateNames.join(", "))}` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    ),
    `<p class="lead">${ctx.linkify(person.summary, person.id)}</p>`,
    section("Life and work", paras(person.lifeStory, person.id, ctx)),
    dl([
      ["Occupation", person.occupation ? ctx.linkify(person.occupation, person.id) : ""],
      ["Places", person.placesLived ? ctx.linkify(person.placesLived, person.id) : ""],
      [
        "Dates",
        person.lifespanLabel
          ? `${esc(person.lifespanLabel)}${
              person.lifespanCertainty && person.lifespanCertainty !== "firm"
                ? ` <span class="tag">${esc(CERTAINTY_NOTE[person.lifespanCertainty] ?? person.lifespanCertainty)}</span>`
                : ""
            }`
          : "",
      ],
    ]),
    person.lifespanDatingNotes ? section("Dating", p(ctx.linkify(person.lifespanDatingNotes, person.id))) : "",
    person.controversies?.length
      ? section("Questions and debates", paras(person.controversies, person.id, ctx))
      : "",
    evidence
      ? section(evidenceHeading, evidence)
      : person.noExtraBiblicalRecordNote
        ? section(evidenceHeading, p(`<span class="note">${esc(person.noExtraBiblicalRecordNote)}</span>`))
        : "",
    person.quotes?.length
      ? section(
          "In their own words",
          person.quotes
            .map(
              (q) =>
                `<blockquote>${q.note ? esc(q.note) : ""}<cite>${esc(q.reference)}</cite></blockquote>`
            )
            .join("")
        )
      : "",
    versesSection(person.verses),
    sourcesSection(person.sources),
    reflectSection(person.reflectionPrompt),
    moreSection("people", ctx.siblings),
  ].join("");

  // No birthDate/deathDate: the dataset stores signed years whose certainty ranges from "firm" to
  // "legendary", and schema.org's date fields have no way to carry "c." or "or". Emitting
  // "-0004-01-01" for a traditional date would be asserting a precision the record does not claim.
  const ld = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    ...(person.alternateNames?.length ? { alternateName: person.alternateNames } : {}),
    jobTitle: person.role,
    description: clip(person.summary, 300),
    ...(person.lifespanLabel ? { disambiguatingDescription: person.lifespanLabel } : {}),
    url: absolute(itemPath("person", person.id)),
  };
  return page({
    title: `${person.name} — ${person.role} | ${SITE_NAME}`,
    description,
    canonical: itemPath("person", person.id),
    trail,
    jsonLd: [ld, articleLd(`${person.name}: ${person.role}`, person.summary, itemPath("person", person.id))],
    body,
    current: "/people",
  });
}

export function topicPage(topic, ctx) {
  const description = clip(`${topic.name} — ${topic.summary}`);
  const trail = [
    { name: "Library", path: "/library" },
    { name: "Topics", path: indexPath("topics") },
    { name: topic.name, path: itemPath("topic", topic.id) },
  ];
  const d = topic.discovery;
  const m = topic.manuscript;
  const warnings = [
    d?.authenticityDisputed ? "Authenticity disputed" : "",
    d?.unprovenanced ? "No excavation context" : "",
  ]
    .filter(Boolean)
    .map((w) => `<span class="tag warn">${esc(w)}</span>`)
    .join("");
  const body = [
    heading(
      topic.name,
      topic.role,
      [
        topic.alternateNames?.length ? `Also called ${esc(topic.alternateNames.join(", "))}` : "",
        warnings,
      ]
        .filter(Boolean)
        .join(" ")
    ),
    `<p class="lead">${ctx.linkify(topic.summary, topic.id)}</p>`,
    d ? discoveryFacts(d, ctx) : "",
    m ? manuscriptFacts(m) : "",
    (topic.sections ?? []).map((s) => section(s.heading, paras(s.paragraphs, topic.id, ctx))).join(""),
    versesSection(topic.verses),
    citationsSection(topic.citations),
    sourcesSection(topic.sources),
    reflectSection(topic.reflectionPrompt),
    moreSection("topics", ctx.siblings),
  ].join("");
  return page({
    // The headline names what the record IS. "The Tel Dan Stele in the Bible" would be wrong about
    // an object; "in the Bible" is right for a doctrine or a practice, which is what it was written
    // for. Same reason the `about` node below is not an Article: a page about a stone is a page
    // about a stone.
    title:
      d || m
        ? `${topic.name} — ${topic.role} | ${SITE_NAME}`
        : `${topic.name} in the Bible — ${topic.role} | ${SITE_NAME}`,
    description,
    canonical: itemPath("topic", topic.id),
    trail,
    jsonLd: topicJsonLd(topic),
    body,
    current: "/topics",
  });
}

/** What the page is, in structured data.
 *
 * Every topic page is an Article — that much has always been true and does not change. What changes
 * for archaeology is that the article is ABOUT a specific object, and schema.org can say so:
 * a manuscript gets schema.org/Manuscript, an excavated object gets CreativeWork, and both are
 * attached to the Article by `about` rather than replacing it.
 *
 * What is deliberately NOT emitted: `dateCreated`. These records carry human dates — "c. 840-835
 * BC", "1993 and 1994" — with a certainty field beside them that ranges from firm to legendary, and
 * schema.org's date fields have no way to carry "c." or a range. Emitting "-0840" would assert a
 * precision the record does not claim, which is the same reason personPage emits no birthDate. */
function topicJsonLd(topic) {
  const path = itemPath("topic", topic.id);
  const d = topic.discovery;
  const m = topic.manuscript;
  const headline = d || m ? `${topic.name}: ${topic.role}` : `${topic.name} in the Bible`;
  const article = articleLd(headline, topic.summary, path);
  if (!d && !m) return [article];
  // Only properties whose schema.org meaning is exactly the field's meaning. A find site is NOT
  // `locationCreated` — the Tel Dan Stele was cut in Damascus and dug up at Dan, and saying
  // "created at Tel Dan" to a crawler would be a false statement made for the sake of a richer
  // node. `holdingArchive` belongs to ArchiveComponent, not CreativeWork, so it is not used here
  // either. Both facts are on the page, in the facts block, where they are true and readable.
  const about = d
    ? {
        "@type": "CreativeWork",
        name: topic.name,
        ...(topic.alternateNames?.length ? { alternateName: topic.alternateNames } : {}),
        description: clip(`${d.objectType}. ${topic.summary}`, 300),
        url: absolute(path),
      }
    : {
        // schema.org/Manuscript — a written witness is one of the few things in this app that has an
        // exactly right type.
        "@type": "Manuscript",
        name: topic.name,
        ...(m.siglum ? { alternateName: m.siglum } : {}),
        description: clip(m.contents, 300),
        inLanguage: m.language,
        // Where it was copied, which is what `locationCreated` means and what `origin` records.
        ...(m.origin ? { locationCreated: m.origin } : {}),
        ...(m.shelfmark ? { identifier: m.shelfmark } : {}),
        // A digital facsimile is another page about this same manuscript, which is what `sameAs` is.
        ...(m.facsimileUrl ? { sameAs: m.facsimileUrl } : {}),
        url: absolute(path),
      };
  return [{ ...article, about: { "@id": `${absolute(path)}#subject` } }, { "@id": `${absolute(path)}#subject`, ...about }];
}

export function eventPage(ev, ctx) {
  const cat = EVENT_CATEGORY_LABEL[ev.category] ?? ev.category;
  const description = clip(`${ev.title} (${ev.dateLabel}) — ${ev.summary}`);
  const trail = [
    { name: "Library", path: "/library" },
    { name: "Timeline", path: indexPath("events") },
    { name: ev.title, path: itemPath("event", ev.id) },
  ];
  const body = [
    heading(
      ev.title,
      `${cat} · ${ev.era}`,
      `${esc(ev.dateLabel)}${
        ev.dateCertainty && ev.dateCertainty !== "firm"
          ? ` <span class="tag">${esc(CERTAINTY_NOTE[ev.dateCertainty] ?? ev.dateCertainty)}</span>`
          : ""
      }`
    ),
    `<p class="lead">${ctx.linkify(ev.summary, ev.id)}</p>`,
    section("The event", paras(splitParas(ev.article), ev.id, ctx)),
    ev.datingNotes ? section("Dating", p(ctx.linkify(ev.datingNotes, ev.id))) : "",
    ev.scriptureRefs?.length
      ? section("Scripture references", ul(ev.scriptureRefs.map((r) => `<span class="ref">${esc(r)}</span>`)))
      : "",
    ev.externalRefs?.length
      ? section("Other witnesses", ul(ev.externalRefs.map((r) => esc(r))))
      : "",
    sourcesSection(ev.sources),
    moreSection("timeline entries", ctx.siblings),
  ].join("");
  return page({
    title: `${ev.title} — ${ev.dateLabel} | ${SITE_NAME}`,
    description,
    canonical: itemPath("event", ev.id),
    trail,
    jsonLd: [articleLd(`${ev.title} (${ev.dateLabel})`, ev.summary, itemPath("event", ev.id))],
    body,
    current: "/events",
  });
}

/** No datePublished/dateModified: this is reference material with no publication event, and a
 * fabricated date is exactly the kind of padded structured data that gets a site penalised. */
const articleLd = (headline, summary, path) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: clip(headline, 110),
  description: clip(summary, 300),
  inLanguage: "en",
  isAccessibleForFree: true,
  author: PUBLISHER,
  publisher: PUBLISHER,
  mainEntityOfPage: { "@type": "WebPage", "@id": absolute(path) },
  url: absolute(path),
});

// ---------------------------------------------------------------- index + hub
export function indexPage(kind, records, describe) {
  const path = indexPath(kind.index);
  const trail = [
    { name: "Library", path: "/library" },
    { name: kind.indexTitle, path },
  ];
  const body = [
    heading(kind.indexTitle, `${records.length} articles`, ""),
    `<p class="lead">${esc(kind.indexBlurb)}</p>`,
    `<ul class="index-list">${records
      .map(
        (r) =>
          `<li><a href="${itemPath(kind.item, r.id)}"><b>${esc(r.name ?? r.title)}</b><span>${esc(
            clip(describe(r), 90)
          )}</span></a></li>`
      )
      .join("")}</ul>`,
  ].join("");
  return page({
    title: `${kind.indexTitle} — ${records.length} articles | ${SITE_NAME}`,
    description: clip(kind.indexBlurb),
    canonical: path,
    trail,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: kind.indexTitle,
        description: clip(kind.indexBlurb, 300),
        url: absolute(path),
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: ORIGIN },
      },
    ],
    body,
    wide: true,
    current: path,
    ogType: "website",
  });
}

export function hubPage(counts, total) {
  const trail = [{ name: "Library", path: "/library" }];
  const cards = [
    ["/places", "Places of the Bible", counts.locations, "Cities, regions, rivers, seas and mountains — history, archaeology and the passages that name each one."],
    ["/sites", "Biblical Sites & Archaeology", counts.pois, "Excavated sites, fortresses, pools and tombs, with what has actually been recovered at each."],
    ["/people", "People", counts.people, "Biblical figures, church fathers, reformers, and the rulers of the surrounding world."],
    ["/topics", "Topics & Doctrines", counts.topics, "Practices, doctrines, people groups and concepts the text assumes you already know."],
    ["/events", "Bible & Church History Timeline", counts.timelineEvents, "Creation to the modern missions movement, with how firmly each date is established."],
  ];
  const body = [
    heading("The Capstone Bible Library", `${total} articles`, ""),
    `<p class="lead">A free reference library of the biblical world: every place, site, person, topic and dated event behind the Capstone Bible study app, written from a Protestant evangelical position and naming other traditions' views where they differ.</p>`,
    `<ul class="index-list">${cards
      .map(
        ([href, name, count, blurb]) =>
          `<li><a href="${href}"><b>${esc(name)} (${count})</b><span>${esc(blurb)}</span></a></li>`
      )
      .join("")}</ul>`,
    section(
      "How the dates are handled",
      p(
        "Every dated entry says how firmly its date is established — anchored by contemporary record, the traditional dating, genuinely disputed, or a later legendary convention — rather than presenting all four with the same confidence."
      )
    ),
  ].join("");
  return page({
    title: `Capstone Bible Library — ${total} articles on the people, places and history of the Bible`,
    description: clip(
      `A free reference library of the biblical world: ${counts.locations} places, ${counts.pois} archaeological sites, ${counts.people} people, ${counts.topics} topics and ${counts.timelineEvents} dated events.`
    ),
    canonical: "/library",
    trail,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "The Capstone Bible Library",
        url: absolute("/library"),
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: ORIGIN },
      },
    ],
    body,
    wide: true,
    current: "/library",
    ogType: "website",
  });
}
