import { computeLinkAnnotations } from "../lib/verseAnnotations";

interface LinkedVerseTextProps {
  text: string;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  /** Called when a mapped person is clicked. If omitted, person mentions render as plain text. */
  onSelectPerson?: (id: string) => void;
  /** Called when a Bible verse reference (e.g. "Acts 16:12") is clicked. If omitted, verse references render as plain text. */
  onSelectVerse?: (reference: string) => void;
  /** Skip linking mentions of this id — used so a location/POI/person's own page doesn't link to itself. */
  excludeId?: string;
}

/** Renders text with any mention of a mapped location, point of interest, person, or Bible verse reference turned into a clickable link. */
export default function LinkedVerseText({
  text,
  onSelectLocation,
  onSelectPoi,
  onSelectPerson,
  onSelectVerse,
  excludeId,
}: LinkedVerseTextProps) {
  const annotations = computeLinkAnnotations(text, excludeId);
  if (annotations.length === 0) return <>{text}</>;

  const parts: Array<{ text: string; annotation?: (typeof annotations)[number] }> = [];
  let lastIndex = 0;
  annotations.forEach((ann) => {
    if (ann.start > lastIndex) parts.push({ text: text.slice(lastIndex, ann.start) });
    parts.push({ text: ann.text, annotation: ann });
    lastIndex = ann.end;
  });
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex) });

  return (
    <>
      {parts.map((part, i) => {
        if (!part.annotation) return <span key={i}>{part.text}</span>;
        const ann = part.annotation;
        if (ann.kind === "verse") {
          if (!onSelectVerse) return <span key={i}>{part.text}</span>;
          return (
            <button key={i} type="button" className="verse-location-link" onClick={() => onSelectVerse(ann.text)}>
              {part.text}
            </button>
          );
        }
        if (ann.kind === "person") {
          if (!onSelectPerson) return <span key={i}>{part.text}</span>;
          return (
            <button key={i} type="button" className="verse-location-link" onClick={() => onSelectPerson(ann.id!)}>
              {part.text}
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
            {part.text}
          </button>
        );
      })}
    </>
  );
}
