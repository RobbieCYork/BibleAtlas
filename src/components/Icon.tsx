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
  | "search"
  // The seven games, one mark each — see the block comment above PATHS.trivia.
  | "trivia"
  | "crossword"
  | "savingPeter"
  | "fillBlank"
  | "memorization"
  | "punchline"
  | "chronology"
  // The shared difficulty ladder. One construction in five steps, not five pictures.
  | "level1"
  | "level2"
  | "level3"
  | "level4"
  | "level5"
  // Marks the Games surface needs beyond the games themselves.
  | "trophy"
  | "players"
  | "target"
  | "pencil";

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

  /* An hourglass. This replaces the abstract riser chart that shipped in 3511973: nobody could tell
     what that drawing was, and ⌛ is the glyph this destination used before it, so the hourglass is
     what a reader already associates with it.
     An hourglass is a glass in a FRAME, and drawing the frame is what saves the mark at 20px —
     two hairline triangles dissolve, a closed frame does not. The posts sit right out at the edge
     and the glass is pinched well inside them, because a first pass with the posts hard against
     the bulbs filled in and read as a black blob at 15px. Round bulbs rather than cones, so it is
     not the default two-triangles-touching. Solid: the sand already fallen, which is both the
     required accent and the only part of an hourglass that carries the meaning.
     Against Timeline Events (still a tall mark) this is symmetrical and enclosed where that one is
     asymmetrical and open down one side — checked side by side at 15 and 20px. */
  timeline: (
    <>
      <path d="M4.6 3.4h14.8M4.6 20.6h14.8" />
      <path d="M6 3.4v17.2M18 3.4v17.2" />
      <path d="M9 3.4c0 4.2 3 6.2 3 8.6s-3 4.4-3 8.6" />
      <path d="M15 3.4c0 4.2-3 6.2-3 8.6s3 4.4 3 8.6" />
      <path d="M12 14.6c1.1 1.5 2.6 3 2.6 4.6H9.4c0-1.6 1.5-3.1 2.6-4.6Z" fill="currentColor" stroke="none" />
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

  /* ── THE SEVEN GAMES ───────────────────────────────────────────────────────────────────────────
     These sit in one vertical list at 28px, so the binding constraint is not "does each mark look
     good" but "can seven of them be told apart in one glance". Four of the seven are fundamentally
     'answer a question', which is exactly where a games set collapses into seven variations on a
     card, so each is held apart by CONSTRUCTION: a glyph, a cruciform, a figure on water, a broken
     rule, a strung cord, a weighted stack, an offset pair. Every one was checked at 15/16/20/24/48
     against the other six and against the thirteen already shipped. */

  /* Bible Trivia: the question mark itself, and its own dot is the family's solid element — the one
     case where the glyph's anatomy and the family signature are the same thing. Same reasoning the
     `search` mark above already carries: this is a universally learned form, and a cleverer object
     would cost comprehension for nothing. It also owns the only hook-and-dot silhouette in the set,
     which is what lets the flagship game win the most legible mark without crowding anyone. Two
     more invented objects were drawn and thrown away first — a dome buzzer, which read as a serving
     cloche, and a herald's trumpet, which read as a hand tool. */
  trivia: (
    <>
      <path d="M8.1 9.1a3.9 3.9 0 1 1 5.5 3.6c-1.1.6-1.6 1.5-1.6 2.6v.9" />
      <circle cx="12" cy="19.4" r="1.9" fill="currentColor" stroke="none" />
    </>
  ),

  /* Bible Crossword: two word-bars crossing and sharing a cell, which is literally what a crossword
     IS rather than a picture of one — and deliberately not the 3×3 grid of squares every product
     uses. The cruciform silhouette is owned by nothing else here. Divider lines are kept to the
     four either side of the centre; a first pass ruled every cell and went to mush at 15px.
     Solid: the shared crossing cell, the letter two answers have in common. */
  crossword: (
    <>
      <rect x="3.4" y="9.1" width="17.2" height="5.8" rx="1.4" />
      <rect x="9.1" y="3.4" width="5.8" height="17.2" rx="1.4" />
      <path d="M6.9 9.1v5.8M17.1 9.1v5.8M9.1 6.9h5.8M9.1 17.1h5.8" />
      <rect x="10.2" y="10.2" width="3.6" height="3.6" rx="0.9" fill="currentColor" stroke="none" />
    </>
  ),

  /* Saving Peter: a figure standing on open water — Matthew 14 stated as a construction rather than
     narrated. No drowning cartoon and no gallows, both of which the game's hangman mechanic invites
     and neither of which is what the game is about. The solid figure over two ruled swells is the
     only such silhouette in either set. Solid: the figure. */
  savingPeter: (
    <>
      <path d="M3.2 16.8c1.9-2.1 3.9-2.1 5.8 0s3.9 2.1 5.8 0 3.9-2.1 5.8 0" />
      <path d="M3.2 20.4c1.9-2.1 3.9-2.1 5.8 0s3.9 2.1 5.8 0 3.9-2.1 5.8 0" />
      <path
        d="M12 2.8c2.2 0 3.6 2 3.6 4.5 0 1.9-1 3-1 4.4 0 1.5-1.2 2.5-2.6 2.5s-2.6-1-2.6-2.5c0-1.4-1-2.5-1-4.4C8.4 4.8 9.8 2.8 12 2.8Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),

  /* Fill in the Blank: three ruled lines with the middle one broken open and the missing word
     dropping into the gap. There is deliberately no page around it — the sparse, broken, unframed
     construction is the whole thing that keeps it clear of the paper group (Articles, Topics), and
     the hole in the middle rule is what makes it read as a blank rather than as body text.
     Solid: the word going into the slot. */
  fillBlank: (
    <>
      <path d="M3.6 6.6h16.8" />
      <path d="M3.6 12h4.4M16 12h4.4" />
      <path d="M3.6 17.4h11.2" />
      <rect x="9.6" y="9.8" width="4.8" height="4.4" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),

  /* Scripture Memorization: a prayer cord hanging from its two anchor beads, with the bead just
     counted worked solid. Learning a verse a word at a time and then reciting the whole bank back
     is a counted, repeated act, and the cord is the object made for precisely that — the older,
     more specific answer rather than a brain or a lightbulb. Drawn as a hanging line rather than a
     closed loop because the loop read as a location pin, which is the exact form this family
     rejected for Places. Solid: the counted bead. */
  memorization: (
    <>
      <path d="M4 7.6c0 7.4 3.6 11.2 8 11.2s8-3.8 8-11.2" />
      <circle cx="4" cy="7.6" r="2" />
      <circle cx="20" cy="7.6" r="2" />
      <circle cx="12" cy="18.8" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),

  /* Guess the Punchline: the shape of a joke rather than a picture of laughter. Three setup rules
     shortening as they go, then the punchline landing as one solid heavy bar — lighter, lighter,
     lighter, BAM. A smiling face was the obvious mark and was rejected outright: this whole set
     exists to retire emoji, and a smiley icon would simply be an emoji redrawn.
     Solid: the punchline. */
  punchline: (
    <>
      <path d="M4.6 5.2h14.8M4.6 9.2h12.2M4.6 13.2h9.4" />
      <rect x="4.6" y="16.6" width="14.8" height="4.2" rx="2.1" fill="currentColor" stroke="none" />
    </>
  ),

  /* Chronology: two cards caught mid-sort, offset on the diagonal. The constraint here was purely
     one of silhouette — Timeline Events is tall and vertical and the hourglass is symmetrical, so
     chronology had to be a third thing, and a diagonal stagger is a shape neither of them can be
     confused with. It is also honest about the game, which is reordering, not reading.
     Solid: the order pip on the front card. */
  chronology: (
    <>
      <rect x="8.2" y="3.2" width="12.6" height="12.6" rx="2.2" />
      <rect x="3.2" y="8.2" width="12.6" height="12.6" rx="2.2" />
      <path d="M6.4 16.4h6.2" />
      <circle cx="7.6" cy="12.4" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),

  /* ── THE DIFFICULTY LADDER ─────────────────────────────────────────────────────────────────────
     Five tiers as ONE construction that grows, rather than five unrelated pictures. What shipped
     before was a seedling, a book, a church, a scroll and a mortarboard: five perfectly good marks
     that, stacked in a picker, read as a category list — you had to know the ordering to see it.
     Here the run of risers grows a step at a time and the tier you are on is the SOLID one,
     climbing as it goes, so the order is legible without being learned. The family's
     one-filled-element rule is what carries the ordering, which is the best possible outcome: the
     signature and the semantics are the same decision.
     Risers stand at x = 5.2 / 8.6 / 12 / 15.4 / 18.8 with tops stepping 13.6 → 4.8 on a shared
     baseline. A cairn of stacked stones (Joshua 4) was drawn as the alternative and lost on the
     proof sheet — below 48px the stones merged into one solid trapezoid and read as a traffic cone.
     Games with three tiers rather than five use 1 / 3 / 5, so the spread still reads as low to high.
     Shared by Crossword, Saving Peter, Chronology, Fill in the Blank and Guess the Punchline. */
  level1: (
    <>
      <path d="M3.2 20.6h17.6" />
      <rect x="3.9" y="13.6" width="2.6" height="5.5" rx="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  level2: (
    <>
      <path d="M3.2 20.6h17.6" />
      <path d="M5.2 19.1v-5.5" />
      <rect x="7.3" y="11.4" width="2.6" height="7.7" rx="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  level3: (
    <>
      <path d="M3.2 20.6h17.6" />
      <path d="M5.2 19.1v-5.5M8.6 19.1v-7.7" />
      <rect x="10.7" y="9.2" width="2.6" height="9.9" rx="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  level4: (
    <>
      <path d="M3.2 20.6h17.6" />
      <path d="M5.2 19.1v-5.5M8.6 19.1v-7.7M12 19.1v-9.9" />
      <rect x="14.1" y="7" width="2.6" height="12.1" rx="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  level5: (
    <>
      <path d="M3.2 20.6h17.6" />
      <path d="M5.2 19.1v-5.5M8.6 19.1v-7.7M12 19.1v-9.9M15.4 19.1v-12.1" />
      <rect x="17.5" y="4.8" width="2.6" height="14.3" rx="1.3" fill="currentColor" stroke="none" />
    </>
  ),

  /* ── GAMES-SURFACE UTILITY ─────────────────────────────────────────────────────────────────────
     These four are not identity marks and are not trying to be. They follow the `search` precedent:
     learned forms, drawn to the family's weight, terminals and one-solid-element rule so they sit
     in the same set, with no invention spent on them. */

  /* Trophy: a two-handled cup on a stepped foot. Solid: the boss on the bowl. */
  trophy: (
    <>
      <path d="M7.4 3.6h9.2v4.2a4.6 4.6 0 0 1-9.2 0Z" />
      <path d="M7.4 4.8H5.2a2.6 2.6 0 0 0 2.6 2.6M16.6 4.8h2.2a2.6 2.6 0 0 1-2.6 2.6" />
      <path d="M12 12.4v3.4M8.4 20.4h7.2M9.8 20.4v-2.2a2.2 2.2 0 0 1 4.4 0v2.2" />
      <circle cx="12" cy="6.6" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),

  /* Multiplayer: two busts, the near one solid. Solo play reuses `people` rather than adding a
     fourteenth near-identical roundel — the shipped People mark already IS one bust in a roundel,
     and the two never appear in the same list. Solid: the near head. */
  players: (
    <>
      <circle cx="9" cy="9.4" r="3" />
      <path d="M3.4 18.6c.5-3.6 10.7-3.6 11.2 0" />
      <path d="M16.4 7.4a3 3 0 0 1 0 5.4M17.4 15.2c2 .5 3.3 1.7 3.5 3.4" />
      <circle cx="9" cy="9.4" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),

  /* Target: how many questions a chosen topic can actually field. Solid: the bullseye. */
  target: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),

  /* Pencil: blunt and diagonal on purpose, so it never collides with Notes' upright quill nib —
     the two are the same act done with different tools and must not be the same drawing.
     Solid: the sharpened tip. */
  pencil: (
    <>
      <path d="M14.6 4.6 19.4 9.4" />
      <path d="M16.2 3 21 7.8 9.2 19.6l-6 1.2 1.2-6Z" />
      <path d="m4.4 14.8 4.8 4.8" />
      <path d="M3.2 20.8l1.2-6 2.4 2.4 2.4 2.4Z" fill="currentColor" stroke="none" />
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
