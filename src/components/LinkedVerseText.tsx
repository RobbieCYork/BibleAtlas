import { locations } from "../data/locations";
import { pois } from "../data/pois";

interface NameEntry {
  name: string;
  id: string;
  kind: "location" | "poi";
}

/** Every location's (any category) primary + alternate name, plus every POI's name — longest first so multi-word names win over their substrings. */
const NAME_ENTRIES: NameEntry[] = (() => {
  const entries: NameEntry[] = [];
  locations.forEach((loc) => {
    entries.push({ name: loc.name, id: loc.id, kind: "location" });
    (loc.alternateNames ?? []).forEach((alt) => entries.push({ name: alt, id: loc.id, kind: "location" }));
  });
  pois.forEach((poi) => {
    entries.push({ name: poi.name, id: poi.id, kind: "poi" });
    (poi.alternateNames ?? []).forEach((alt) => entries.push({ name: alt, id: poi.id, kind: "poi" }));
  });
  return entries.sort((a, b) => b.name.length - a.name.length);
})();

const NAME_TO_ENTRY = new Map(NAME_ENTRIES.map((e) => [e.name.toLowerCase(), e]));

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive so lowercase-in-translation phrases like "city of David" and "upper room" still link. */
const NAME_PATTERN =
  NAME_ENTRIES.length > 0
    ? new RegExp(`\\b(${NAME_ENTRIES.map((e) => escapeRegExp(e.name)).join("|")})\\b`, "gi")
    : null;

interface LinkedVerseTextProps {
  text: string;
  onSelectLocation: (id: string) => void;
  onSelectPoi: (id: string) => void;
  /** Skip linking mentions of this id — used so a location/POI's own page doesn't link to itself. */
  excludeId?: string;
}

/** Renders text with any mention of a mapped location or point of interest turned into a clickable link. */
export default function LinkedVerseText({ text, onSelectLocation, onSelectPoi, excludeId }: LinkedVerseTextProps) {
  if (!NAME_PATTERN) return <>{text}</>;

  const parts: Array<string | NameEntry> = [];
  let lastIndex = 0;
  NAME_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAME_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const name = match[0];
    const entry = NAME_TO_ENTRY.get(name.toLowerCase());
    // Keep the verse's own casing/spelling for display, but the canonical id/kind for navigation.
    if (entry && entry.id !== excludeId) parts.push({ ...entry, name });
    else parts.push(name);
    lastIndex = match.index + name.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <button
            key={i}
            type="button"
            className="verse-location-link"
            onClick={() => (part.kind === "location" ? onSelectLocation(part.id) : onSelectPoi(part.id))}
          >
            {part.name}
          </button>
        )
      )}
    </>
  );
}
