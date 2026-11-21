// HTML for the public Capstone Plus for Groups pages: /groups, /groups/church, /groups/school,
// /groups/other.
//
// Same contract as scripts/seo/render.mjs: standalone static documents, NO script, no Supabase
// client, no session. They sit beside the app, never inside it, so nothing here can reach the main
// bundle and nothing in the app can reach these. Styling follows the app's "Sticker Pop" look (see
// src/skins.css): cream ground, yellow header, chunky ink outlines, hard offset shadows, rounded
// cards, Bricolage Grotesque from /fonts/skins.css. Light only, like the skin.
//
// Everything is escaped on the way out; copy lives in copy.mjs.

import { ORIGIN, SITE_NAME, absolute } from "../seo/site.mjs";
import { esc } from "../seo/render.mjs";
import {
  CONTACT_EMAIL,
  CTA_NOTIFY,
  CTA_START,
  GROUPS_LIVE,
  START_GROUP_HREF,
  isPublished,
} from "./config.mjs";
import { FRONT, HEADINGS, LAUNCH_PRICING } from "./copy.mjs";

// ---------------------------------------------------------------- images
// Renditions are produced by scripts/groups-pages/optimize-images.py into public/groups/img/.
const IMG = "/groups/img";
const HERO_W = [480, 800, 1600];
const FEAT_W = [480, 960];
/** Intrinsic ratio of the 960-wide feature rendition, so width/height attributes reserve the box. */
const FEAT_DIMS = { "school-feature-3-essay-feedback": [1254, 1229] };

function picture(name, { alt, hero = false, sizes, eager = false, cls = "" }) {
  const widths = hero ? HERO_W : FEAT_W;
  const [rw, rh] = hero ? [1600, 900] : (FEAT_DIMS[name] ?? [1, 1]);
  const fb = hero ? 800 : 960;
  const h = Math.round((fb * rh) / rw);
  const set = (ext) => widths.map((w) => `${IMG}/${name}-${w}.${ext} ${w}w`).join(", ");
  return `<picture><source type="image/avif" srcset="${set("avif")}" sizes="${sizes}"><source type="image/webp" srcset="${set("webp")}" sizes="${sizes}"><img${cls ? ` class="${cls}"` : ""} src="${IMG}/${name}-${fb}.webp" srcset="${set("webp")}" sizes="${sizes}" width="${fb}" height="${h}" alt="${esc(alt)}" ${
    eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'
  }></picture>`;
}

// ---------------------------------------------------------------- CTA
/** One component, one switch. GROUPS_LIVE false: a mailto link naming the audience (no database, no
 * form, no mailing list). GROUPS_LIVE true: "Start your group" into the app. */
function ctaHref(audienceSlug, audienceLabel) {
  if (GROUPS_LIVE) return START_GROUP_HREF;
  const subject = `Groups waitlist: ${audienceSlug}`;
  const body = `Hello,\r\n\r\nPlease let me know when Capstone Plus for Groups opens.\r\n\r\nGroup type: ${audienceLabel}\r\n\r\nThank you.`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
const ctaLabel = () => (GROUPS_LIVE ? CTA_START : CTA_NOTIFY);
const cta = (aud, cls = "btn btn-primary") =>
  `<a class="${cls}" href="${esc(ctaHref(aud.slug, aud.label))}">${esc(ctaLabel())}</a>`;

// ---------------------------------------------------------------- CSS
const CSS = `
:root{color-scheme:light;--ink:#15110e;--muted:#4d4038;--cream:#fff1cc;--sun:#ffd43b;--sunken:#ffe6a0;--white:#fff;--tomato:#ff6b3d;--mint:#19c39a;--link:#2438e0;--bw:2.5px;--r:14px;--rl:22px;--sh:3px 3px 0 var(--ink);--shl:5px 5px 0 var(--ink);--font:"Bricolage Grotesque","Avenir Next",system-ui,-apple-system,"Segoe UI",sans-serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
body{margin:0;background:var(--cream);color:var(--ink);font:500 17px/1.55 var(--font);-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%;height:auto}
a{color:var(--link)}
:focus-visible{outline:3px solid var(--link);outline-offset:3px;border-radius:6px}
.skip{position:absolute;left:12px;top:-60px;background:var(--white);color:var(--ink);border:var(--bw) solid var(--ink);border-radius:var(--r);padding:10px 14px;font-weight:700;z-index:10}
.skip:focus{top:12px}
.wrap{max-width:1120px;margin:0 auto;padding:0 16px}
@media (min-width:700px){.wrap{padding:0 24px}}
/* header: the app's yellow bar */
.bar{background:var(--sun);border-bottom:3px solid var(--ink)}
.bar .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px}
.brand{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;font-weight:800;font-size:19px;letter-spacing:-.01em}
.brand img{width:38px;height:38px;border:var(--bw) solid var(--ink);border-radius:12px;box-shadow:2px 2px 0 var(--ink);background:var(--tomato);transform:rotate(-6deg)}
.bar nav a{color:var(--ink);font-weight:700;font-size:15px;text-decoration:none;border:var(--bw) solid var(--ink);background:var(--white);border-radius:999px;padding:7px 14px;box-shadow:2px 2px 0 var(--ink);display:inline-block}
.bar nav a:hover{background:var(--cream)}
h1,h2,h3{font-weight:800;line-height:1.08;letter-spacing:-.02em;margin:0}
h1{font-size:clamp(34px,7.4vw,60px)}
h2{font-size:clamp(26px,4.6vw,38px)}
h3{font-size:22px}
p{margin:0}
.lede{font-size:clamp(18px,2.4vw,21px);line-height:1.5;max-width:34em}
.small{font-size:15px;color:var(--muted);font-weight:600}
section{padding:36px 0}
@media (min-width:900px){section{padding:56px 0}}
/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;text-align:center;min-height:52px;padding:12px 24px;border:var(--bw) solid var(--ink);border-radius:999px;font:800 17px/1.2 var(--font);color:var(--ink);text-decoration:none;box-shadow:var(--sh);cursor:pointer}
.btn-primary{background:var(--tomato)}
.btn-secondary{background:var(--white)}
@media (prefers-reduced-motion:no-preference){.btn{transition:transform .12s,box-shadow .12s}.btn:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--ink)}.btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}}
.btns{display:flex;flex-wrap:wrap;gap:14px;margin:26px 0 14px}
@media (max-width:520px){.btns .btn{width:100%}}
/* frames */
.frame{border:var(--bw) solid var(--ink);border-radius:var(--rl);box-shadow:var(--shl);overflow:hidden;background:var(--cream)}
.frame img{width:100%}
/* hero */
.hero{padding:28px 0 36px}
.hero .wrap{display:grid;gap:28px;align-items:center}
@media (min-width:900px){.hero{padding:56px 0 64px}.hero .wrap{grid-template-columns:1fr 1.05fr;gap:48px}}
.hero h1{margin-bottom:18px}
.crumb{font-size:15px;font-weight:700;margin-bottom:14px}
.crumb a{color:var(--ink)}
/* benefits */
.benefit{display:grid;gap:22px;align-items:center;padding:28px 0}
@media (min-width:800px){.benefit{grid-template-columns:1fr 1fr;gap:56px;padding:40px 0}.benefit.flip .b-img{order:-1}}
.benefit h2{margin-bottom:12px}
.benefit p{font-size:18px;max-width:30em}
.b-img{max-width:480px;width:100%;justify-self:center}
.benefit.textonly{display:block}
.benefit.textonly .card-text{background:var(--sun);border:var(--bw) solid var(--ink);border-radius:var(--rl);box-shadow:var(--shl);padding:24px 22px;max-width:760px}
@media (min-width:800px){.benefit.textonly .card-text{padding:30px 34px}}
.band{background:var(--sunken);border-top:3px solid var(--ink);border-bottom:3px solid var(--ink)}
/* steps */
.steps{list-style:none;counter-reset:s;margin:28px 0 0;padding:0;display:grid;gap:16px}
@media (min-width:800px){.steps{grid-template-columns:repeat(4,1fr);gap:20px}}
.steps li{counter-increment:s;background:var(--white);border:var(--bw) solid var(--ink);border-radius:var(--r);box-shadow:var(--sh);padding:18px;font-weight:600;font-size:17px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start}
@media (min-width:800px){.steps li{display:block}}
.steps li::before{content:counter(s);display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--sun);border:var(--bw) solid var(--ink);font-weight:800;font-size:20px;margin-bottom:0}
@media (min-width:800px){.steps li::before{margin-bottom:12px}}
/* text cards */
.card{background:var(--white);border:var(--bw) solid var(--ink);border-radius:var(--rl);box-shadow:var(--shl);padding:24px 22px}
@media (min-width:800px){.card{padding:32px 36px}}
.card h2{margin-bottom:12px}
.card p+p{margin-top:12px}
/* pricing */
.price-lead{font-size:clamp(24px,4.4vw,34px);font-weight:800;line-height:1.15;letter-spacing:-.02em;margin-bottom:10px}
.tbl{width:100%;max-width:520px;border-collapse:separate;border-spacing:0;margin:20px 0 6px;border:var(--bw) solid var(--ink);border-radius:var(--r);overflow:hidden;font-size:16px}
.tbl caption{caption-side:top;text-align:left;font-weight:700;color:var(--muted);font-size:15px;padding-bottom:8px}
.tbl th,.tbl td{padding:10px 14px;text-align:left;border-bottom:2px solid var(--ink)}
.tbl tr:last-child td{border-bottom:0}
.tbl thead th{background:var(--sun);font-weight:800}
.tbl tbody th{font-weight:700}
.launch{display:inline-block;background:var(--sun);border:var(--bw) solid var(--ink);border-radius:999px;padding:6px 14px;font-weight:800;font-size:15px;margin:16px 0 4px}
.notes{margin:12px 0 0}
.notes p{font-size:16px;color:var(--muted);font-weight:600}
.card .btns{margin-bottom:0}
/* faq */
.faq{display:grid;gap:12px;margin-top:24px;max-width:820px}
.faq details{background:var(--white);border:var(--bw) solid var(--ink);border-radius:var(--r);box-shadow:var(--sh)}
.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:56px;padding:14px 18px;font-weight:800;font-size:18px;line-height:1.3}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--sun);border:2px solid var(--ink);font-size:20px;line-height:1}
.faq details[open] summary::after{content:"\\2212"}
.faq .ans{padding:0 18px 18px;font-size:17px}
/* trust */
.trust{background:var(--white);border:var(--bw) solid var(--ink);border-radius:var(--rl);box-shadow:var(--shl);padding:26px 22px}
@media (min-width:800px){.trust{padding:34px 38px}}
.trust ul{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:12px}
@media (min-width:800px){.trust ul{grid-template-columns:1fr 1fr;gap:14px 32px}}
.trust li{position:relative;padding-left:40px;font-weight:600}
.trust li::before{content:"\\2713";position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:var(--mint);border:2px solid var(--ink);display:grid;place-items:center;font-weight:800;font-size:16px;line-height:1}
/* final */
.final{background:var(--sun);border:3px solid var(--ink);border-radius:var(--rl);box-shadow:var(--shl);padding:32px 22px;text-align:center;display:grid;gap:14px;justify-items:center}
.final h2{max-width:20em}
.final .btn{margin-top:6px}
@media (max-width:520px){.final .btn{width:100%}}
/* front door */
.front-hero{padding:34px 0 8px;text-align:center}
.front-hero .lede{margin:16px auto 0}
.ask{text-align:center;margin:36px 0 24px}
.cards{display:grid;gap:22px;list-style:none;margin:0;padding:0}
@media (min-width:800px){.cards{grid-template-columns:repeat(3,1fr);gap:28px}}
.pick{display:flex;flex-direction:column;height:100%;background:var(--white);border:var(--bw) solid var(--ink);border-radius:var(--rl);box-shadow:var(--shl);color:var(--ink);text-decoration:none;overflow:hidden}
.pick .ph{border-bottom:var(--bw) solid var(--ink);aspect-ratio:4/3;overflow:hidden;background:var(--cream)}
.pick .ph img{width:100%;height:100%;object-fit:cover}
.pick .tx{padding:18px 20px 22px;display:flex;flex-direction:column;gap:8px;flex:1}
.pick p{color:var(--muted);font-weight:600}
.pick .btn{margin-top:auto;pointer-events:none;align-self:flex-start;background:var(--sun)}
@media (prefers-reduced-motion:no-preference){.pick{transition:transform .12s,box-shadow .12s}.pick:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--ink)}}
.pick:focus-visible{outline-offset:5px}
.pick .tx .btn{margin-top:14px}
.fine{text-align:center;display:grid;gap:6px;margin:30px 0 8px}
/* footer */
footer{margin-top:44px;border-top:3px solid var(--ink);background:var(--white);padding:26px 0 40px;font-size:15px;color:var(--muted);font-weight:600}
footer .wrap{display:grid;gap:8px}
footer a{color:var(--ink)}
`.trim();

// ---------------------------------------------------------------- shell
function shell({ seo: rawSeo, path, current, bodyHtml, headerLink, preloadHero }) {
  const published = isPublished();
  // Post-launch the "Coming soon" / "Get notified" wording leaves the meta text too.
  const live = (t) => (GROUPS_LIVE ? t.replace(/ Coming soon\.$/, "").replace(/ Get notified when Groups opens\.$/, "") : t);
  const seo = { ...rawSeo, description: live(rawSeo.description), ogDescription: live(rawSeo.ogDescription) };
  const url = absolute(path);
  const ogImage = `${ORIGIN}/groups/og-groups.jpg`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: seo.ogTitle,
        description: seo.description,
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: ORIGIN },
        // Deliberately no Offer, AggregateRating, Review, FAQPage or Product: Groups is not live,
        // the price is unapproved, and no rating or review exists.
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: (path === "/groups"
          ? [["Capstone Plus for Groups", "/groups"]]
          : [["Capstone Plus for Groups", "/groups"], [seo.ogTitle.replace("Capstone Plus for Groups: ", ""), path]]
        ).map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: absolute(p) })),
      },
    ],
  };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(seo.title)}</title>
<meta name="description" content="${esc(seo.description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="${published ? "index,follow,max-image-preview:large" : "noindex"}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(seo.ogTitle)}">
<meta property="og:description" content="${esc(seo.ogDescription)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(FRONT.ogAlt)}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(seo.ogTitle)}">
<meta name="twitter:description" content="${esc(seo.ogDescription)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:image:alt" content="${esc(FRONT.ogAlt)}">
<meta name="theme-color" content="#ffd43b">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/bricolage-grotesque-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/skins.css">
${preloadHero ?? ""}<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<header class="bar"><div class="wrap"><a class="brand" href="/"><img src="/favicon.svg" width="38" height="38" alt="">Capstone Bible</a>${headerLink}</div></header>
<main id="content">
${bodyHtml}
</main>
<footer><div class="wrap">
<p>Capstone Bible's articles are written from a Protestant evangelical position and name other traditions' views where they differ.</p>
<p>Contact: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
<p><a href="/terms">Terms of Service</a> · <a href="/privacy">Privacy Policy</a> · <a href="/delete-account">Delete your account</a></p>
</div></footer>
</body>
</html>`;
}

// ---------------------------------------------------------------- pages
export function frontPage() {
  const cards = FRONT.cards
    .map(
      (c) => `<li><a class="pick" href="/groups/${c.slug}"><div class="ph">${picture(c.img, {
        alt: c.alt,
        hero: true,
        sizes: "(min-width:800px) 340px, calc(100vw - 32px)",
        eager: c.slug === "church",
      })}</div><div class="tx"><h3>${esc(c.h)}</h3><p>${esc(c.p)}</p><span class="btn">${esc(c.button)}</span></div></a></li>`
    )
    .join("");
  const body = `<div class="wrap">
<div class="front-hero"><h1>${esc(FRONT.h1)}</h1><p class="lede">${esc(FRONT.sub)}</p></div>
<section aria-labelledby="ask" style="padding-top:8px">
<h2 class="ask" id="ask">${esc(FRONT.question)}</h2>
<ul class="cards">${cards}</ul>
<div class="fine"><p>${esc(FRONT.notSure)}</p>${GROUPS_LIVE ? "" : `<p class="small">${esc(FRONT.comingSoon)}</p>`}<p class="small">${esc(FRONT.footNote)}</p></div>
</section>
</div>`;
  return shell({
    seo: FRONT.seo,
    path: "/groups",
    bodyHtml: body,
    headerLink: "",
  });
}

const withEmail = (text) =>
  esc(text).replace(/\{\{email\}\}/g, `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`);

export function audiencePage(a) {
  const soon = GROUPS_LIVE ? "" : " Coming soon.";
  const heroImg = picture(a.hero.img, {
    alt: a.hero.alt,
    hero: true,
    sizes: "(min-width:900px) 560px, calc(100vw - 32px)",
    eager: true,
  });

  const benefits = a.benefits
    .map((b, i) => {
      const flip = i % 2 === 1 ? " flip" : "";
      if (!b.img)
        return `<section class="benefit textonly"><div class="card-text"><h2>${esc(b.h)}</h2><p>${esc(b.p)}</p></div></section>`;
      return `<section class="benefit${flip}"><div><h2>${esc(b.h)}</h2><p>${esc(b.p)}</p></div><div class="b-img frame">${picture(b.img, {
        alt: b.alt,
        sizes: "(min-width:800px) 480px, calc(100vw - 32px)",
      })}</div></section>`;
    })
    .join("\n");

  const steps = a.steps.map((s) => `<li><span>${esc(s)}</span></li>`).join("");
  const rows = a.pricing.examples
    .map((e) => `<tr><th scope="row">${e.seats} seats</th><td>${e.month}</td><td>${e.year}</td></tr>`)
    .join("");
  const faqItems = a.faq
    .filter((f) => !(GROUPS_LIVE && f.q === "When does Groups open?"))
    .map(
      (f) => `<details><summary>${esc(f.q)}</summary><div class="ans"><p>${withEmail(f.a)}</p></div></details>`
    )
    .join("");
  const trust = a.trust.bullets.map((b) => `<li>${esc(b.t)}</li>`).join("");

  const body = `<div class="hero"><div class="wrap">
<div>
<p class="crumb"><a href="/groups">Capstone Plus for Groups</a></p>
<h1>${esc(a.hero.h1)}</h1>
<p class="lede">${esc(a.hero.sub)}</p>
<div class="btns">${cta(a)}<a class="btn btn-secondary" href="#pricing">See pricing</a></div>
<p class="small">${esc(a.hero.small + soon)}</p>
</div>
<div class="frame">${heroImg}</div>
</div></div>

<div class="band"><div class="wrap">
${benefits}
</div></div>

<div class="wrap">
<section aria-labelledby="how"><h2 id="how">${esc(HEADINGS.how)}</h2><ol class="steps">${steps}</ol></section>

<section aria-labelledby="members"><div class="card"><h2 id="members">${esc(a.members.h)}</h2><p>${esc(a.members.p)}</p></div></section>

<section id="pricing" aria-labelledby="pricing-h" style="scroll-margin-top:16px"><div class="card">
<h2 id="pricing-h">${esc(HEADINGS.pricing)}</h2>
<p class="price-lead">${esc(a.pricing.lead)}</p>
<p>${esc(a.pricing.body)}</p>
<table class="tbl"><caption>Examples (calculated, not promises)</caption><thead><tr><th scope="col">Seats</th><th scope="col">Per month</th><th scope="col">Per year</th></tr></thead><tbody>${rows}</tbody></table>
<div class="notes">${a.pricing.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>
<p class="launch">${esc(LAUNCH_PRICING)}</p>
<div class="btns">${cta(a)}</div>
</div></section>

<section aria-labelledby="faq"><h2 id="faq">${esc(HEADINGS.faq)}</h2><div class="faq">${faqItems}</div></section>

<section aria-labelledby="trust"><div class="trust"><h2 id="trust">${esc(a.trust.h)}</h2><ul>${trust}</ul></div></section>

<section aria-labelledby="final"><div class="final"><h2 id="final">${esc(a.final.h)}</h2>${GROUPS_LIVE ? "" : `<p>${esc(a.final.body)}</p>`}${cta(a)}<p class="small" style="color:var(--ink)">${esc(a.final.small)}</p></div></section>
</div>`;

  const preload = `<link rel="preload" as="image" type="image/avif" imagesrcset="${HERO_W.map(
    (w) => `${IMG}/${a.hero.img}-${w}.avif ${w}w`
  ).join(", ")}" imagesizes="(min-width:900px) 560px, calc(100vw - 32px)" fetchpriority="high">\n`;

  return shell({
    seo: a.seo,
    path: `/groups/${a.slug}`,
    bodyHtml: body,
    headerLink: `<nav aria-label="Capstone Plus for Groups"><a href="/groups">All groups</a></nav>`,
    preloadHero: preload,
  });
}

