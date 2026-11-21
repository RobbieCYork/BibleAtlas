/**
 * deepLink.ts — "open the app at this spot": `?open=<kind>:<ref>`.
 *
 *   ?open=bible:John 3:16-21     a passage (canonical "Book C[:V[-V]]", the same shape as sql/046's verse refs)
 *   ?open=place:jerusalem        a map place      (src/data/locations.ts id)
 *   ?open=site:<id>              an archaeological / POI site (pois.ts)
 *   ?open=person:<id>            a person         (people.ts)
 *   ?open=topic:<id>             an article/topic (topics.ts)
 *   ?open=event:<id>             a timeline event (timelineEvents.ts)
 *
 * Minimal on purpose (the P1 "URL routing" item is the long-term home): App.tsx reads the parameter
 * once a real session exists, strips it from the address bar, and routes it through the same
 * handlers a Study Collection row uses. Inside the app, a link calls `openInApp()` instead of
 * reloading, which raises the same request as a window event App listens for.
 *
 * Nothing here is trusted: the kind is checked against a closed list and the ref against the same
 * shapes the database enforces, and App only acts on an id that exists in the data.
 */

export type DeepLinkKind = "bible" | "place" | "site" | "person" | "topic" | "event";

export interface DeepLink {
  kind: DeepLinkKind;
  ref: string;
}

const KINDS: readonly DeepLinkKind[] = ["bible", "place", "site", "person", "topic", "event"];
const BIBLE_SHAPE = /^[1-3]? ?[A-Za-z][A-Za-z ]{0,40} [0-9]{1,3}(:[0-9]{1,3}(-[0-9]{1,3})?)?$/;
const ID_SHAPE = /^[a-z0-9][a-z0-9_-]{0,199}$/;

export const DEEP_LINK_EVENT = "capstone:open";

export function parseDeepLink(raw: string | null | undefined): DeepLink | null {
  if (!raw) return null;
  const i = raw.indexOf(":");
  if (i <= 0) return null;
  const kind = raw.slice(0, i) as DeepLinkKind;
  const ref = raw.slice(i + 1).trim();
  if (!KINDS.includes(kind)) return null;
  if (kind === "bible" ? !BIBLE_SHAPE.test(ref) : !ID_SHAPE.test(ref)) return null;
  return { kind, ref };
}

export function deepLinkHref(link: DeepLink): string {
  return `?open=${encodeURIComponent(`${link.kind}:${link.ref}`)}`;
}

/** Asks the running app to go there (App.tsx listens). */
export function openInApp(link: DeepLink): void {
  window.dispatchEvent(new CustomEvent<DeepLink>(DEEP_LINK_EVENT, { detail: link }));
}

/** Reads `?open=` and removes it from the address bar. Null when absent or malformed. */
export function consumeDeepLinkParam(): DeepLink | null {
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("open");
    if (raw === null) return null;
    url.searchParams.delete("open");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    return parseDeepLink(raw);
  } catch {
    return null;
  }
}
