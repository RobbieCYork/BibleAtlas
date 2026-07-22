import { computeLinkAnnotations, type LinkAnnotation } from "../lib/verseAnnotations";
import type { Highlight } from "../lib/supabase";

interface VerseTextProps {
  text: string;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  onSelectVerse?: (reference: string) => void;
  /** This verse's highlights only (caller filters by verse). */
  highlights: Highlight[];
  onHighlightClick: (highlight: Highlight, rect: DOMRect) => void;
  /** Registers the element that wraps just the verse text (no verse number) — selection offsets are
   * computed relative to this element's flattened text content. */
  textRef: (el: HTMLSpanElement | null) => void;
}

interface Segment {
  text: string;
  link?: LinkAnnotation;
  highlight?: Highlight;
}

/** Splits `text` into non-overlapping segments at every link/highlight boundary, so each segment has
 * a single, unambiguous style. A segment covered by both a highlight and a link renders as highlighted
 * plain text (the highlight visually wins) — keeps click handling unambiguous for the rare overlap case. */
function buildSegments(text: string, links: LinkAnnotation[], highlights: Highlight[]): Segment[] {
  const points = new Set<number>([0, text.length]);
  links.forEach((a) => {
    points.add(a.start);
    points.add(a.end);
  });
  highlights.forEach((h) => {
    points.add(Math.max(0, h.start_offset));
    points.add(Math.min(text.length, h.end_offset));
  });
  const sorted = [...points].sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start >= end) continue;
    const link = links.find((a) => a.start <= start && a.end >= end);
    const highlight = highlights.find((h) => h.start_offset <= start && h.end_offset >= end);
    segments.push({ text: text.slice(start, end), link, highlight });
  }
  return segments;
}

export default function VerseText({
  text,
  onSelectLocation,
  onSelectPoi,
  onSelectVerse,
  highlights,
  onHighlightClick,
  textRef,
}: VerseTextProps) {
  const links = computeLinkAnnotations(text);
  const segments = buildSegments(text, links, highlights);

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
                onHighlightClick(h, (e.currentTarget as HTMLElement).getBoundingClientRect());
              }}
            >
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
              onClick={() => (ann.kind === "location" ? onSelectLocation(ann.id!) : onSelectPoi(ann.id!))}
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
