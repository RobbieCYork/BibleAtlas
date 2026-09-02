import { supabase } from "./supabase";

/** Where a profile link is allowed to be seen. Mirrors the CHECK constraint and the RLS policy in
 * sql/017_profile_links.sql — the database is what actually enforces this; these strings only decide
 * what the editor offers and how the badge reads.
 *
 * `private` is the default for every newly added link, deliberately: someone typing an Instagram
 * handle into their profile should have to opt that link *into* being seen, never discover after the
 * fact that adding it published it. */
import type { IconName } from "../components/Icon";

export type LinkVisibility = "private" | "friends" | "public";

/** `icon` is for the BADGE on a link row. It is deliberately not rendered in the editor's
 * `<select>`, because an `<option>` can hold text and nothing else — no element may go inside one,
 * so a drawn mark cannot follow the label in there. The three labels carry themselves. */
export const LINK_VISIBILITY_OPTIONS: { value: LinkVisibility; label: string; icon: IconName }[] = [
  { value: "private", label: "Only me", icon: "lock" },
  { value: "friends", label: "My friends", icon: "players" },
  { value: "public", label: "Everyone", icon: "globe" },
];

export const DEFAULT_LINK_VISIBILITY: LinkVisibility = "private";

export function visibilityIcon(v: LinkVisibility): IconName {
  // Falls back to the most private mark, matching DEFAULT_LINK_VISIBILITY: if the value is ever
  // unrecognised, the badge should under-promise reach rather than over-promise it.
  return LINK_VISIBILITY_OPTIONS.find((o) => o.value === v)?.icon ?? "lock";
}

export function visibilityLabel(v: LinkVisibility): string {
  return LINK_VISIBILITY_OPTIONS.find((o) => o.value === v)?.label ?? "Only me";
}

/** The networks the profile editor offers. Deliberately a closed set rather than "add any link you
 * like": it keeps the editor a short fixed list, it lets each row carry a recognizable icon and a
 * hint about what to paste, and it matches the CHECK constraint on profile_links.platform. Adding a
 * network later is one entry here plus one value in that CHECK — nothing else. */
export type LinkPlatform = "website" | "instagram" | "facebook" | "x" | "youtube" | "tiktok" | "linkedin";

export interface SocialLinkConfig {
  platform: LinkPlatform;
  label: string;
  /** Neutral marks, not brand logos — which is what the emoji here already were. Lucide removed its
   * brand icons in 1.x for trademark reasons, so there is no logo to reach for even if we wanted
   * one, and each row's visible label already names the network. */
  icon: IconName;
  placeholder: string;
}

export const SOCIAL_LINK_CONFIGS: SocialLinkConfig[] = [
  { platform: "website", label: "Website", icon: "link", placeholder: "yoursite.com" },
  { platform: "instagram", label: "Instagram", icon: "camera", placeholder: "instagram.com/yourname" },
  { platform: "facebook", label: "Facebook", icon: "thumbsUp", placeholder: "facebook.com/yourname" },
  { platform: "x", label: "X", icon: "close", placeholder: "x.com/yourname" },
  { platform: "youtube", label: "YouTube", icon: "play", placeholder: "youtube.com/@yourname" },
  { platform: "tiktok", label: "TikTok", icon: "music", placeholder: "tiktok.com/@yourname" },
  { platform: "linkedin", label: "LinkedIn", icon: "briefcase", placeholder: "linkedin.com/in/yourname" },
];

export interface ProfileLink {
  id: string;
  user_id: string;
  platform: LinkPlatform;
  url: string;
  visibility: LinkVisibility;
}

/** Turns what someone actually types ("instagram.com/me", " https://x.com/me ") into a URL that is
 * safe to hand to an `href` — or null if it can't be made into one.
 *
 * The rejection that matters is the scheme. A profile link is rendered as a clickable anchor on
 * *other people's* screens, so `javascript:alert(1)` typed here is stored XSS against everyone who
 * views the profile. Anything carrying a scheme that isn't http/https is refused outright rather than
 * coerced — note that the older ensureUrlProtocol() would happily turn `javascript:x` into
 * `https://javascript:x`, which is inert but nonsense; here it's a validation error the person sees.
 * A bare "instagram.com/me" (no scheme at all) is still treated as https shorthand, since that's how
 * most people type a URL. */
export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Control characters (including the \n and \t browsers strip out of URLs before parsing them, which
  // is how "java\nscript:" sneaks past naive checks) never belong in a link someone typed.
  if (/\s/.test(trimmed) || [...trimmed].some((ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f)) return null;

  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (schemeMatch && !/^https?$/i.test(schemeMatch[1])) return null;

  const candidate = schemeMatch ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  // Re-check after parsing: `new URL` resolves things the regex above can't see coming.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  // A hostname with no dot is either a typo or an intranet name — neither is a social profile.
  if (!parsed.hostname.includes(".")) return null;
  if (parsed.href.length > 500) return null;
  return parsed.href;
}

/** The render-side half of the same defence. Even a row that somehow reached the table without going
 * through normalizeExternalUrl (a hand-rolled request, an older row, a future migration) cannot
 * produce a dangerous href: anything that isn't plain http(s) comes back undefined and the caller
 * draws the link as inert text instead of an anchor. */
export function safeHref(url: string): string | undefined {
  const normalized = normalizeExternalUrl(url);
  return normalized ?? undefined;
}

/** Strips the scheme and any trailing slash for display — "https://instagram.com/me/" reads better in
 * a profile row as "instagram.com/me". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/** Every link on a profile that the *signed-in reader* is allowed to see. There is no visibility
 * filter in this query on purpose: the RLS policy on profile_links does the filtering server-side, so
 * a link the reader may not see never reaches the browser at all — it isn't fetched and hidden. */
export async function fetchProfileLinks(userId: string): Promise<ProfileLink[]> {
  const { data } = await supabase
    .from("profile_links")
    .select("id, user_id, platform, url, visibility")
    .eq("user_id", userId);
  const rows = (data ?? []) as ProfileLink[];
  const order = SOCIAL_LINK_CONFIGS.map((c) => c.platform);
  return rows.sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
}
