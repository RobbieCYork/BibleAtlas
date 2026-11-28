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
  /** Set the body as a quotation (verse cards) — see quoteVerse(). */
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

/**
 * A verse as the share card prints it. The card's own “ ” are only for a passage that carries no such
 * marks itself; one that already quotes someone is printed as written, because a second pair around it
 * reads as a doubled or stray mark.
 *
 * A selection often cuts a quotation in half (speech that runs over several verses), so the missing
 * partner is added at the very start or end. Nothing inside the passage is ever changed.
 */
export function quoteVerse(text: string): string {
  if (!text) return "";
  const open: { mark: "“" | "‘"; at: number; maybeClosed?: boolean }[] = [];
  let before = "";
  const unopened = (mark: "“" | "‘") => {
    if (!(before + text).startsWith(mark)) before = mark + before;
  };
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const top = open[open.length - 1];
    if (c === "“" || c === "‘") {
      // The Bible reprints the openers at the start of each new paragraph of the same speech (“‘…).
      // Those repeat the levels already open; they do not start deeper ones.
      const run = /^[“‘]+/.exec(text.slice(i))![0];
      const newParagraph = /(^|[.!?”’]\s+)$/.test(text.slice(0, i));
      if (newParagraph && run.length <= open.length && [...run].every((mark, n) => open[n].mark === mark)) {
        open.length = run.length;
        i += run.length - 1;
        continue;
      }
      if (c === "‘" && top?.mark === "‘" && top.maybeClosed) open.pop();
      if (open[open.length - 1]?.mark !== c) open.push({ mark: c, at: i });
    } else if (c === "”") {
      const at = open.map((q) => q.mark).lastIndexOf("“");
      if (at < 0) unopened("“");
      else open.length = at;
    } else if (c === "’") {
      // The same character is the apostrophe. After a letter it may be either (“disciples’ feet”,
      // “‘Yes’”), so it can only ever stop a mark being added; after punctuation it closes a quote.
      const afterLetter = /\p{L}/u.test(text[i - 1] ?? "");
      if (afterLetter && /\p{L}/u.test(text[i + 1] ?? "")) continue;
      const at = open.map((q) => q.mark).lastIndexOf("‘");
      if (afterLetter) {
        // Only a short, unpunctuated span reads as a quoted word or title; further on it is a possessive.
        if (at >= 0 && /^[^.,;:!?“”]{0,40}$/.test(text.slice(open[at].at + 1, i))) open[at].maybeClosed = true;
      } else if (at < 0) unopened("‘");
      else open.length = at;
    }
  }
  const after = open
    .reverse()
    .map((q) => (q.maybeClosed ? "" : q.mark === "“" ? "”" : "’"))
    .join("");
  const balanced = before + text + after;
  const hasOwnMarks = /[“”"]|^‘|’$/.test(balanced);
  return hasOwnMarks ? balanced : `“${balanced}”`;
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
