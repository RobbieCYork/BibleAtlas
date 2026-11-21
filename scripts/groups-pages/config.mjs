// Capstone Plus for Groups — public marketing pages: the ONLY switches and numbers.
//
// Everything a launch decision touches lives in this file, so flipping it is one edit and one
// review. Nothing here is read by the app bundle: these pages are static documents generated at the
// end of `vite build` (scripts/groups-pages/build-groups.mjs) and carry no script.

/** Groups is NOT live. While false, every CTA is "Get notified when Groups opens" (a mailto link,
 * no mailing list, no database) and every page is `noindex`. Flip to true at launch: the CTAs
 * become "Start your group", the "Coming soon" lines disappear, and the pages become indexable and
 * join the sitemap. */
export const GROUPS_LIVE = false;

/** Robbie's explicit go-ahead to make the pages public (indexable + in the sitemap) BEFORE Groups
 * itself is live, e.g. a pre-launch page. Off by default. Also settable per build with the
 * environment variable CAPSTONE_GROUPS_PUBLISH=1, which is how a preview can be checked without a
 * code change. Nothing is indexed unless one of these is on. */
export const PUBLISH = false;

export const isPublished = () => GROUPS_LIVE || PUBLISH || process.env.CAPSTONE_GROUPS_PUBLISH === "1";

/** Launch pricing — SUBJECT TO CHANGE and NOT yet approved by Robbie (plan decisions #1 and #2).
 * One source for all three pages; the page text never hard-codes a number. */
export const PRICING = {
  perSeatMonth: 3.25,
  perSeatYear: 32.5,
  minSeats: 5,
  /** Individual Plus price, quoted only when INDIVIDUAL_PLUS_LIVE is true. */
  plusMonth: 4.95,
  plusYear: 49.5,
};

/** Show "Plus on its own is $4.95 a month or $49.50 a year." Keep false until the individual Plus
 * price is confirmed live (landing-pages.md, open question 4). */
export const INDIVIDUAL_PLUS_LIVE = false;

export const CONTACT_EMAIL = "admin@capstonebible.com";

/** Where "Start your group" goes once GROUPS_LIVE. ASSUMPTION: origin/groups-classes has no
 * `?startGroup=1` deep link yet (its "Start a class or group" is a sheet opened from the account
 * menu, drawn only when groups_status() is on). Either the app grows this parameter before launch
 * or this value changes to whatever it does grow. */
export const START_GROUP_HREF = "/?startGroup=1";

export const CTA_NOTIFY = "Get notified when Groups opens";
export const CTA_START = "Start your group";

// ---- derived, never typed by hand ----
export const fmt = (n) => (Number.isInteger(n) ? "$" + n.toLocaleString("en-US") : "$" + n.toFixed(2));
/** "about 17% less than paying monthly", computed from the two prices above. */
export const annualSavingPct = () =>
  Math.round((1 - PRICING.perSeatYear / (PRICING.perSeatMonth * 12)) * 100);
export const seatsCost = (seats) => ({
  seats,
  month: fmt(PRICING.perSeatMonth * seats),
  year: fmt(PRICING.perSeatYear * seats),
});
