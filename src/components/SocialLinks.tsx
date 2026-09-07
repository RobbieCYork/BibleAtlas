import "./SocialLinks.css";

/* ── THE BRAND MARKS ───────────────────────────────────────────────────────────────────────────
 *
 * Inline path data, not files, not a CDN, and not a dependency. Three reasons, in order of how
 * much they cost to get wrong:
 *
 *  1. A brand mark fetched from a CDN is a third party who can see every signed-out visitor to
 *     the front door, and a request that can fail. These marks are ~1KB of path data; they belong
 *     in the bundle.
 *  2. `lucide-react`, which supplies the rest of the app's library marks (see the LIBRARY block in
 *     Icon.tsx), REMOVED its brand icons — Instagram, Facebook and LinkedIn are all gone from 1.39.
 *     There is nothing to import even if we wanted to.
 *  3. These are the two companies' own published glyphs, reproduced as drawn. They are deliberately
 *     NOT held to Icon.tsx's house spec (24px stroke, weight 1.75, exactly one filled accent) —
 *     that spec exists so the app's own wayfinding reads as one hand, and a brand mark is the one
 *     kind of icon nobody gets to redraw. So they live here rather than in Icon.tsx, which is what
 *     that file's own comment already says happens to brand marks: "handled at their call sites".
 *
 * What we DO control is colour and size: `fill="currentColor"` on a 24x24 viewBox sized in `em`,
 * exactly like Icon.tsx, so these inherit the muted treatment of whatever surface they sit on
 * instead of dropping two saturated logos into a vellum-and-gold design. Monochrome use is what
 * both companies' own brand guidelines ask for on a coloured background.
 */

/** Facebook's "f" in a circle, as published. */
const FACEBOOK_MARK =
  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z";

/** Instagram's camera glyph, as published. */
const INSTAGRAM_MARK =
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z";

interface SocialLink {
  /** Names the destination in the accessible name and the tooltip. */
  label: string;
  href: string;
  /** `d` for a single path on a 0 0 24 24 viewBox, filled with currentColor. */
  mark: string;
}

/* ── ADDING A PLATFORM ─────────────────────────────────────────────────────────────────────────
 *
 * Append one record. Nothing else — no JSX, no CSS, no aria-label written by hand: the row below
 * maps over this array, and the accessible name is built from `label`. Capstone Bible also holds
 * @capstonebible on X, TikTok and YouTube; those are deliberately NOT here yet, and this is the
 * whole of what it takes to add them when they go live.
 */
const SOCIAL_LINKS: SocialLink[] = [
  { label: "Facebook", href: "https://facebook.com/capstonebible", mark: FACEBOOK_MARK },
  { label: "Instagram", href: "https://instagram.com/capstonebible", mark: INSTAGRAM_MARK },
];

interface SocialLinksProps {
  /** Extra class for the surface hosting the row — lets a caller set its own colour and spacing
   * without this component knowing anything about where it has been placed. */
  className?: string;
}

/** Capstone Bible's own social accounts, as a row of brand marks.
 *
 * Every link opens in a new tab with `rel="noopener noreferrer"`: these leave the app, and a
 * signed-in reader part-way through a reading plan or a game should come back to it rather than
 * find Facebook where the app was. `noopener` also denies the opened page a handle on this one.
 */
export default function SocialLinks({ className }: SocialLinksProps) {
  return (
    <nav className={className ? `social-links ${className}` : "social-links"} aria-label="Capstone Bible on social media">
      {SOCIAL_LINKS.map(({ label, href, mark }) => (
        <a
          key={label}
          className="social-links-item"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          // Names the destination, not the picture: a screen reader announces "Capstone Bible on
          // Facebook, link", which is the thing being chosen. `title` gives the same answer to a
          // sighted reader hovering an unlabelled glyph.
          aria-label={`Capstone Bible on ${label}`}
          title={label}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            <path d={mark} />
          </svg>
        </a>
      ))}
    </nav>
  );
}
