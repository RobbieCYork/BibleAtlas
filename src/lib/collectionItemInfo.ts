import { locations } from "../data/locations";
import { pois } from "../data/pois";
import { people } from "../data/people";
import { topics } from "../data/topics";
import { timelineEvents } from "../data/timelineEvents";
import type { CollectionItemKind } from "./studyCollections";

/** How a collection item is shown: its kind label and its name, read from the same data the app
 * renders (never stored with the item, so a corrected spelling shows up everywhere at once). A record
 * that has since been removed from the data returns `missing`, so the row can say so and offer Remove
 * rather than vanish silently. Notes are resolved separately (they live in the database). */
export const KIND_LABEL: Record<CollectionItemKind, string> = {
  place: "Place",
  site: "Site",
  person: "Person",
  topic: "Topic",
  event: "Event",
  verse: "Scripture",
  note: "My note",
};

let byKind: Record<"place" | "site" | "person" | "topic" | "event", Map<string, string>> | null = null;

function index() {
  if (!byKind) {
    byKind = {
      place: new Map(locations.map((r) => [r.id, r.name])),
      site: new Map(pois.map((r) => [r.id, r.name])),
      person: new Map(people.map((r) => [r.id, r.name])),
      topic: new Map(topics.map((r) => [r.id, r.name])),
      event: new Map(timelineEvents.map((r) => [r.id, r.title])),
    };
  }
  return byKind;
}

export function recordName(kind: CollectionItemKind, refId: string): { name: string; missing: boolean } {
  if (kind === "verse") return { name: refId, missing: false };
  if (kind === "note") return { name: "", missing: false };
  const name = index()[kind].get(refId);
  return name ? { name, missing: false } : { name: refId, missing: true };
}
