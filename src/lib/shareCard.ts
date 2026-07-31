import type { Location, Person, PointOfInterest } from "../data/types";

/**
 * Share-card content: what to render, not how — ShareCardModal takes one of these and lets the
 * reader pick a background and format the text (bold/italic/underline/highlight/size) before
 * exporting. See src/data/shareBackgrounds.ts for the background themes and ShareCardModal.tsx for
 * the editor/export itself (html2canvas rasterizes the live-styled DOM into a PNG).
 */
export interface ShareCardSpec {
  /** Small uppercase label above the title, e.g. "City", "Apostle", "Scripture". */
  badge: string;
  /** The big headline — place/person name or verse reference. */
  title: string;
  /** The excerpt/verse body, already trimmed. */
  body: string;
  /** A single emoji shown next to the badge — no icon library here, just a character. */
  glyph: string;
  /** Wrap the body in curly quotes (verse cards). */
  bodyQuoted?: boolean;
}

/** Collapses whitespace and ellipsizes at a word boundary (~`max` chars). */
export function excerpt(text: string, max = 140): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.]*$/, "") + "…";
}

const CATEGORY_LABELS: Record<Location["category"], string> = {
  city: "City",
  region: "Region",
  province: "Roman Province",
  nation: "Nation",
  sea: "Sea / Lake",
  river: "River",
  mountain: "Mountain",
  island: "Island",
};

/** Card content for a map place — full Location or lighter-weight PointOfInterest. */
export function placeCardSpec(entry: Location | PointOfInterest): ShareCardSpec {
  if ("category" in entry) {
    const hook =
      entry.history.notableFacts[0] ?? entry.history.founded ?? entry.history.industry ?? entry.modernName ?? "";
    return { badge: CATEGORY_LABELS[entry.category], title: entry.name, body: excerpt(hook), glyph: "📍" };
  }
  return { badge: entry.tag, title: entry.name, body: excerpt(entry.description), glyph: "📌" };
}

/** Card content for a biblical person — role badge + the summary hook. */
export function personCardSpec(person: Person): ShareCardSpec {
  return { badge: person.role, title: person.name, body: excerpt(person.summary, 180), glyph: "🧑" };
}

/** Card content for a selected verse (or verse range) — reference as title, quoted text as body. */
export function verseCardSpec(reference: string, text: string): ShareCardSpec {
  return { badge: "Scripture", title: reference, body: text.trim().replace(/\s+/g, " "), glyph: "📖", bodyQuoted: true };
}

/** Download filename for a card, e.g. "biblical-atlas-john-3-16.png". */
export function shareFilename(title: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "card";
  return `biblical-atlas-${slug}.png`;
}

/**
 * Hands a finished card to the user: Web Share sheet where file-sharing is supported (mobile),
 * otherwise a plain PNG download. "cancelled" = the user dismissed the native share sheet — not an
 * error, and no feedback needed. "NotAllowedError" happens when the async canvas render eats up the
 * user-activation window before share() fires (slow devices, mostly iOS Safari) — that's not a real
 * failure either, since the image generated fine, so fall through to the anchor-download path instead
 * of surfacing an error.
 */
export async function deliverCard(blob: Blob, filename: string): Promise<"shared" | "saved" | "cancelled"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      if (!(err instanceof DOMException && err.name === "NotAllowedError")) throw err;
      // NotAllowedError: user-activation expired before share() resolved — fall through to download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "saved";
}
