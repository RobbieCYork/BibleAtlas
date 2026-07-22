import { computeLinkAnnotations, type LinkAnnotation } from "../lib/verseAnnotations";
import type { Highlight } from "../lib/supabase";

/** One highlight's coverage within this specific verse — offsets are already clipped to this verse's
 * text (a highlight spanning multiple verses covers 0..length in every verse strictly between its
 * start and end verse). */
export interface ClippedHighlight {
  highlight: Highlight;
  startOffset: number;
  endOffset: number;
}

interface VerseTextProps {
  text: string;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onSelectVerse?: (reference: string) => void;
  /** This verse's highlight coverage only (caller clips by verse). */
  highlights: ClippedHighlight[];
  onHighlightClick: (highlight: Highlight) => void;
  /** This verse's slice of the in-progress selection, if any (caller clips by verse) — shown as a
   * lightweight preview while dragging, distinct from a saved highlight. */
  previewRange?: { start: number; end: number } | null;
  /** Registers the element that wraps just the verse text (no verse number) — selection offsets are
   * computed relative to this element's flattened text content. */
  textRef: (el: HTMLSpanElement | null) => void;
}

interface Segment {
  text: string;
  link?: LinkAnnotation;
  highlight?: Highlight;
  preview?: boolean;
}

/** Splits `text` into non-overlapping segments at every link/highlight/preview boundary, so each
 * segment has a single, unambiguous style. Precedence where things overlap: a saved highlight wins
 * over the in-progress preview, which wins over a link — keeps click handling unambiguous. */
function buildSegments(
  text: string,
  links: LinkAnnotation[],
  highlights: ClippedHighlight[],
  previewRange?: { start: number; end: number } | null
): Segment[] {
  const points = new Set<number>([0, text.length]);
  links.forEach((a) => {
    points.add(a.start);
    points.add(a.end);
  });
  highlights.forEach((h) => {
    points.add(Math.max(0, h.startOffset));
    points.add(Math.min(text.length, h.endOffset));
  });
  if (previewRange) {
    points.add(Math.max(0, previewRange.start));
    points.add(Math.min(text.length, previewRange.end));
  }
  const sorted = [...points].sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start >= end) continue;
    const link = links.find((a) => a.start <= start && a.end >= end);
    const clipped = highlights.find((h) => h.startOffset <= start && h.endOffset >= end);
    const preview = !clipped && !!previewRange && previewRange.start <= start && previewRange.end >= end;
    segments.push({ text: text.slice(start, end), link, highlight: clipped?.highlight, preview });
  }
  return segments;
}

export default function VerseText({
  text,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  onSelectVerse,
  highlights,
  onHighlightClick,
  previewRange,
  textRef,
}: VerseTextProps) {
  const links = computeLinkAnnotations(text);
  const segments = buildSegments(text, links, highlights, previewRange);

  return (
    <span ref={textRef}>
      {segments.map((seg, i) => {
        if (seg.highlight) {
          const h = seg.highlight;
          return (
            <mark
              key={i}
              className={`verse-highlight verse-highlight-${h.color}`}
              onClick={(e) => {
                e.stopPropagation();
                onHighlightClick(h);
              }}
            >
              {seg.text}
            </mark>
          );
        }
        if (seg.preview) {
          return (
            <mark key={i} className="verse-selection-preview">
              {seg.text}
            </mark>
          );
        }
        if (seg.link) {
          const ann = seg.link;
          if (ann.kind === "verse") {
            if (!onSelectVerse) return <span key={i}>{seg.text}</span>;
            return (
              <button key={i} type="button" className="verse-location-link" onClick={() => onSelectVerse(ann.text)}>
                {seg.text}
              </button>
            );
          }
          return (
            <button
              key={i}
              type="button"
              className="verse-location-link"
              onClick={() => {
                if (ann.kind === "location") onSelectLocation(ann.id!);
                else if (ann.kind === "poi") onSelectPoi(ann.id!);
                else onSelectPerson(ann.id!);
              }}
            >
              {seg.text}
            </button>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}
