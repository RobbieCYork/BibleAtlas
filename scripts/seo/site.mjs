// Shared vocabulary for the public, pre-rendered article site.
//
// THE URL SCHEME IS PERMANENT. Changing a path throws away every ranking and every inbound link
// that path has earned, so it is defined once, here, and nowhere else. The rule it follows, which
// any new record type must follow too:
//
//     plural noun  = the index of a kind      /people
//     singular noun + record id = one article /person/paul-of-tarsus
//
// The id is the record's own `id` from `src/data/*.ts` — the key the app, the auto-linker and
// `primaryEntityIds` already use. Deriving a slug from the display name instead would create a
// second identity to keep in step, and a renamed article would silently move its own URL.

// The canonical host is www, not the apex. Measured against the live edge on 2026-09-09:
// `https://capstonebible.com/` answers 308 -> `https://www.capstonebible.com/`, which answers 200.
// Every canonical, every og:url and every <loc> in the sitemap must name the host that actually
// serves a 200 — a canonical pointing at a redirect wastes crawl budget, and a sitemap whose URLs
// sit on a different host from the sitemap file itself is a cross-submission a crawler may ignore
// outright. If the domain is ever flipped to the apex, this one constant is the only thing that
// moves here; `public/robots.txt` and the hand-written tags in `index.html` carry the same host and
// must move with it.
export const ORIGIN = "https://www.capstonebible.com";
export const SITE_NAME = "Capstone Bible";

/** The five public record kinds. `key` is the array exported from src/data, `linkKind` is what the
 * shipped auto-linker (`computeLinkAnnotations`) calls this kind in its annotations. */
export const KINDS = [
  {
    key: "locations",
    linkKind: "location",
    item: "place",
    index: "places",
    indexTitle: "Places of the Bible",
    indexBlurb:
      "Every city, region, river, sea and mountain mapped in Capstone Bible, with its history, archaeology and the passages that name it.",
  },
  {
    key: "pois",
    linkKind: "poi",
    item: "site",
    index: "sites",
    indexTitle: "Biblical Sites & Archaeology",
    indexBlurb:
      "Excavated sites, fortresses, pools, tombs and monuments tied to the biblical narrative, with what archaeology has actually recovered at each.",
  },
  {
    key: "people",
    linkKind: "person",
    item: "person",
    index: "people",
    indexTitle: "People of the Bible & Church History",
    indexBlurb:
      "Biblical figures, church fathers, reformers and the surrounding world's rulers — who they were, what they did, and what the record outside Scripture says about them.",
  },
  {
    key: "topics",
    linkKind: "topic",
    item: "topic",
    index: "topics",
    indexTitle: "Biblical Topics & Doctrines",
    indexBlurb:
      "Practices, doctrines, people groups and concepts the biblical text assumes its reader already understands, explained in full.",
  },
  {
    key: "timelineEvents",
    linkKind: "timeline",
    item: "event",
    index: "events",
    indexTitle: "Bible & Church History Timeline",
    indexBlurb:
      "Biblical history, church history and the surrounding world side by side — from creation through the modern missions movement, with how firmly each date is established.",
  },
];

export const KIND_BY_LINKKIND = new Map(KINDS.map((k) => [k.linkKind, k]));

export const HUB = { path: "/library", title: "The Capstone Bible Library" };

export const itemPath = (item, id) => `/${item}/${id}`;
export const indexPath = (index) => `/${index}`;
export const absolute = (p) => `${ORIGIN}${p}`;

/** Where the generated file for a path goes inside the build output. Directory + index.html, not
 * `<path>.html`: Vercel serves a directory's index.html at the bare path with no configuration at
 * all, so this needs no rewrite rule and cannot become a catch-all. */
export const fileForPath = (p) => `${p.replace(/^\//, "")}/index.html`;
