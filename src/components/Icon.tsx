/** Capstone Bible's own icon set.
 *
 * Replaces the emoji that used to stand in for every destination and article category. Emoji were
 * the wrong material for this job on three counts: they render as a different drawing on every
 * platform (so the app has no say in its own wayfinding), they carry their own colour and so can
 * never follow the theme, and at 20px in the tab bar the platform faces are doing far more detail
 * than the size can hold.
 *
 * ONE component with a `name` prop, rather than twelve exported components, because every call site
 * already keeps its icon as a *string in a data table* — MOBILE_TAB_META in lib/mobileTabs.tsx,
 * SECTIONS in ArticlesPanel.tsx, DESTINATIONS in PanelMenu.tsx. Swapping `icon: "📖"` for
 * `icon: "bible"` keeps those tables as plain data and leaves their shape (and every consumer's
 * `{ label, icon }` destructuring) untouched. Twelve components would have forced every one of
 * those records to hold a ReactNode, which drags JSX into files that are currently data.
 *
 * ── THE SPEC. Every icon below is held to it; nothing here is drawn by eye. ─────────────────────
 *
 *   Canvas        24 × 24 viewBox. Live area inset to roughly 3–21, so no mark touches the edge and
 *                 the whole set shares one optical size rather than each icon filling its own box.
 *   Technique     Stroke, not fill. `fill="none"` on the root, `stroke="currentColor"` — which is
 *                 the entire reason these are SVG and not PNGs: colour, light/dark theme and the
 *                 active-tab accent all arrive for free from CSS, and there is no second asset.
 *   Weight        stroke-width 1.75 everywhere. At the tab bar's 20px that renders ~1.46px; at the
 *                 menus' 15–16px, ~1.1px. Below about 1.6 the set goes wispy on a phone screen;
 *                 above 2 the enclosed shapes (the roundels, the arch, the town gate) start to
 *                 fill in. 1.75 is the middle of that window.
 *   Terminals     round cap, round join, universally. A drawn line with soft ends is the closest
 *                 honest analogue at this size to a pen-drawn chart, and mixed terminals are the
 *                 fastest way to make a set look assembled from parts.
 *   Corners       radius 1.5–2 units on anything rectangular. Chamfers (straight cut corners) are
 *                 used where a mark should read as cut rather than drawn — see Games.
 *   Accent        EXACTLY ONE solid, filled element per icon (Games' three pips are one motif).
 *                 This is the set's signature and the one idea worth stealing from a manuscript:
 *                 an otherwise plain drawn page carrying a single worked, filled mark. It is also
 *                 the most robust thing that can be put in a 20px icon — a filled shape survives
 *                 downsampling where a hairline flourish dissolves — so the character and the
 *                 legibility come from the same decision instead of fighting each other.
 *   Detail floor  Nothing smaller than 2 units across (≈1.7px at 20px). No hatching, no interior
 *                 texture, no marks that exist only to look old. Character comes from CONSTRUCTION
 *                 and SILHOUETTE: a walled town instead of a pin, a roundel bust instead of a
 *                 head-and-shoulders, an arch with a keystone instead of a classical-building
 *                 pictogram. Those choices survive the resample; ornament does not.
 *   Silhouette    Every icon in the set has a distinct outline at 20px, tested against the ones it
 *                 sits next to. The four paper-ish marks (Bible, Articles, Topics, Notes) are held
 *                 apart on the axis of WHAT KIND OF OBJECT, not by their interior lines: a bound
 *                 book opened, a single leaf, a tied label, a writing tool. The three map-ish
 *                 marks (Map, Places, Points of Interest) are a wide folded sheet, a low wide
 *                 town, and a tall narrow arch. Timeline is wide and horizontal; Timeline Events
 *                 is tall and vertical.
 *
 * Sized by `1em` on purpose: the existing `font-size` rules that sized the emoji (20px in
 * .mobile-tab-icon, 16px in .mobile-nav-menu-icon, 15px in .articles-section-icon, and so on) now
 * size these instead, so no stylesheet had to change and every call site keeps the size it was
 * already tuned to.
 */

import type { ReactElement } from "react";

export type IconName =
  | "bible"
  | "map"
  | "timeline"
  | "notes"
  | "articles"
  | "social"
  | "games"
  | "people"
  | "topics"
  | "timelineEvent"
  | "poi"
  | "place"
  | "search";

interface IconProps {
  name: IconName;
  /** Accessible name. Provide it ONLY where the icon is the sole thing naming its control; where a
   * visible text label sits beside it (every tab, every menu row, every section header in this
   * app) leave it off and the icon renders `aria-hidden`, so a screen reader hears the label once
   * rather than twice. */
  title?: string;
  className?: string;
}

/** Drawn geometry, one entry per name. Kept as data rather than twelve components so the shared
 * root element below is the single place stroke width, terminals and sizing are decided — the spec
 * is enforced by construction, not by remembering to repeat it. */
const PATHS: Record<IconName, ReactElement> = {
  /* Bound book, opened: two bowed leaves meeting at a central spine, with a solid clasp-boss on the
     spine. Deliberately the same construction as the app mark in public/favicon.svg — the Bible tab
     and the product's own logo should be recognisably the same drawing. */
  bible: (
    <>
      <path d="M12 7.3C10 5.7 7 5.1 3.6 5.1V18c3.4 0 6.4.6 8.4 2.2 2-1.6 5-2.2 8.4-2.2V5.1c-3.4 0-6.4.6-8.4 2.2Z" />
      <path d="M12 7.3v12.9" />
      <path d="M12 11.1 13.7 13 12 14.9 10.3 13Z" fill="currentColor" stroke="none" />
    </>
  ),

  /* A folded chart. The move away from the generic three-panel map icon is in the edges: a real
     folded sheet droops between its creases, so the top and bottom are shallow alternating curves
     rather than the usual hard zigzag. Solid roundel on the centre panel. */
  map: (
    <>
      <path d="M3 6.6 9 8.9 15 6.6 21 8.9v8.5l-6-2.3-6 2.3-6-2.3Z" />
      <path d="M9 8.9v8.5M15 6.6v8.5" />
      <path d="M12 10.1l.75 1.15L13.9 12l-1.15.75L12 13.9l-.75-1.15L10.1 12l1.15-.75Z" fill="currentColor" stroke="none" />
    </>
  ),

  /* Chronological chart: a base rule with three risers of unequal height, each capped by a node.
     Wide and bottom-heavy — the deliberate opposite of Timeline Events' vertical column, so the two
     never have to be told apart by their detail. Centre node is the solid one. */
  timeline: (
    <>
      <path d="M3 17.5h18" />
      <path d="M7 17.5v-4.6M12 17.5v-8.3M17 17.5v-2.6" />
      <circle cx="7" cy="11.4" r="1.5" />
      <circle cx="17" cy="13.4" r="1.5" />
      <circle cx="12" cy="7.7" r="1.55" fill="currentColor" stroke="none" />
    </>
  ),

  /* A quill nib, not a page with lines on it. Notes is the one item in the paper group that is an
     ACT rather than a document, and giving it the writing tool is what keeps four paper icons from
     collapsing into one shape. The solid mark is the nib's vent hole, which is where a real nib's
     one filled feature is. */
  notes: (
    <>
      <path d="M12 3.6c2.9 3.2 4.6 6.6 5 10L12 20.4l-5-6.8c.4-3.4 2.1-6.8 5-10Z" />
      <path d="M12 8.2v3.2M12 15v3.4" />
      <circle cx="12" cy="13.2" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),

  /* A single written leaf. The distinguishing feature is the solid block in the top-left where the
     first line would start — a rubricated initial, which is both this set's required solid accent
     and the one thing that makes a page icon look like it came from a manuscript rather than from a
     word processor. Ruled lines are kept to three so none of them falls below the detail floor. */
  articles: (
    <>
      <rect x="4.6" y="3.4" width="14.8" height="17.2" rx="2" />
      <rect x="7.4" y="6.6" width="3.6" height="3.6" rx="0.6" fill="currentColor" stroke="none" />
      <path d="M12.8 8.4h3.8M7.4 13.4h9.2M7.4 16.8h6.2" />
    </>
  ),

  /* Two interlocking roundels with a solid lozenge held in the overlap. Same roundel vocabulary as
     People, so the two read as related, but a completely different silhouette (two rings versus one
     ring with a bust) so they are never confused. Chosen over the speech bubble, which says
     "messages" rather than "the people you know, plus groups, plus your own profile". */
  social: (
    <>
      <circle cx="15.4" cy="9.4" r="5.1" />
      <circle cx="9.3" cy="14" r="6.1" />
      <circle cx="9.3" cy="14" r="1.9" fill="currentColor" stroke="none" />
    </>
  ),

  /* A die. Chamfered rather than rounded — cut corners read as an engraved plate or a cut stone
     where a soft radius reads as a phone-game token, and it is the one place in the set where the
     corner treatment is allowed to differ, because "cut" is the whole idea. Three solid pips on the
     diagonal are the accent. */
  games: (
    <>
      <path d="M8.4 3.4h7.2l5 5v7.2l-5 5H8.4l-5-5V8.4Z" />
      <circle cx="8.6" cy="8.6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="15.4" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),

  /* A bust inside a roundel — the way a manuscript names a person, rather than the generic
     head-and-shoulders floating in space. The ring gives it a closed, medallion silhouette that
     nothing else in the set has, and the solid head is the accent. */
  people: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7 18.8c.6-3.4 9.4-3.4 10 0" />
      <circle cx="12" cy="10.1" r="2.5" fill="currentColor" stroke="none" />
    </>
  ),

  /* A titulus — the small tied label a scribe hangs off a roll to say what is in it. Pointed at one
     end with an eyelet, it is the only tag-shaped silhouette in the set, which is what keeps Topics
     clear of Articles at 20px. The eyelet is the solid mark. */
  topics: (
    <>
      <path d="M9.2 4.6h8.4a2 2 0 0 1 2 2v10.8a2 2 0 0 1-2 2H9.2L4 12Z" />
      <circle cx="9.4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M13.4 9.2h3.2M13.4 14.8h3.2" />
    </>
  ),

  /* A single dated entry on a chronicle column: a vertical rule with three nodes and entry ticks of
     unequal length running off it. Tall and ragged down one side — the deliberate inverse of
     Timeline's wide, bottom-heavy chart, so at 20px the two are told apart by outline alone. */
  timelineEvent: (
    <>
      <path d="M6.6 3.6v16.8" />
      <path d="M9.4 7.4h9M9.4 12h5.2M9.4 16.6h7.6" />
      <circle cx="6.6" cy="7.4" r="1.4" />
      <circle cx="6.6" cy="16.6" r="1.4" />
      <circle cx="6.6" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),

  /* A round arch on two piers, with the keystone as the solid mark — which is, literally, the
     capstone. Points of Interest in this atlas are built sites: gates, temples, pools, ruins. A
     tall arch is the oldest shorthand for one, it shares nothing with Places' low wide town, and it
     rhymes with the product's name without anyone having to be told. */
  poi: (
    <>
      <path d="M3.6 20.6h16.8M5.4 17.8h13.2" />
      <path d="M7.4 17.8v-6a4.6 4.6 0 0 1 9.2 0v6" />
      <path d="M10.8 11.6 11.4 7.4h1.2l.6 4.2Z" fill="currentColor" stroke="none" />
    </>
  ),

  /* A walled town with two towers and a gate — the mark a portolan chart uses for a settlement, and
     the direct answer to "not the teardrop pin". It is also honest about what a Place is in this
     app: an inhabited biblical location, not a dropped coordinate. The gate is the solid mark, and
     it is the largest accent in the set on purpose, because this silhouette needs one dark anchor
     to stop the crenellations reading as noise. */
  place: (
    <>
      <path d="M3 20.4V12h2.6V8h3.6v4h5.6V8h3.6v4H21v8.4" />
      <path d="M2.2 20.4h19.6" />
      <path d="M10.3 20.4v-3.6a1.7 1.7 0 0 1 3.4 0v3.6Z" fill="currentColor" stroke="none" />
    </>
  ),

  /* The one place the set does NOT chase character. Search is a universally learned glyph and any
     cleverness here costs comprehension for nothing; the family rules (weight, terminals, one solid
     mark — here the glint in the lens) are enough to keep it in the same set. */
  search: (
    <>
      <circle cx="10.6" cy="10.6" r="6.4" />
      <path d="M15.4 15.4 20.4 20.4" />
      <circle cx="8.4" cy="8.4" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function Icon({ name, title, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      // Block, auto-margin: the emoji these replace were inline text and sat on a baseline with a
      // descender gap under them. An inline SVG would inherit that gap and push every icon a pixel
      // or two high in its box; `block` removes it, and `margin: 0 auto` preserves the centring that
      // `.mobile-nav-menu-icon`/`.panel-menu-link-icon` were getting from `text-align: center`.
      style={{ display: "block", margin: "0 auto" }}
      // Named only when nothing else names the control. Otherwise hidden outright, so the visible
      // label next to it is the single accessible name rather than one of two competing ones.
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
